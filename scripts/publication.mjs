import { periods, issueKey, fingerprint, parseTrending, createReport } from './trends.mjs';
import { fetchUsage, usageVersion } from './usage.mjs';
import { validateUsage } from './contracts.mjs';
import { analysisInputFingerprint, documentMaxAgeMs, isFreshUsage, normalizeUsage } from './freshness.mjs';
import { synthesizeReport } from './report.mjs';

export async function collectPublication(previous, { now = new Date(), fetcher = fetch, delay = ms => new Promise(resolve => setTimeout(resolve, ms)), refreshAnalysis = false, maxDocumentAgeMs = documentMaxAgeMs, analyzeProject, aiAnalyzer } = {}) {
  const state = structuredClone(previous);
  let changed = false;
  // 최신 보고서에 등장하는 프로젝트만 캐시로 사용합니다. 별도 장기 이력은 만들지 않습니다.
  const prior = new Map();
  const choose = (a, b) => {
    if (!a) return b;
    if (!b) return a;
    if ((a.status === 'ready') !== (b.status === 'ready')) return a.status === 'ready' ? a : b;
    if ((a.version === usageVersion) !== (b.version === usageVersion)) return a.version === usageVersion ? a : b;
    return (Date.parse(a.document?.checkedAt || a.checkedAt) || 0) >= (Date.parse(b.document?.checkedAt || b.checkedAt) || 0) ? a : b;
  };
  for (const report of Object.values(previous.reports)) for (const row of report.rows) {
    const key = row.name.toLowerCase();
    if (!prior.has(key)) prior.set(key, new Map());
    const input = analysisInputFingerprint(row);
    const candidates = prior.get(key);
    candidates.set(input, choose(candidates.get(input), normalizeUsage(row.usage, row)));
  }
  for (const period of periods) {
    const issue = issueKey(period, now);
    if (state.ledger.some(entry => entry.issue === issue)) continue;
    let html;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetcher(`https://github.com/trending?since=${period}`, {
          headers: { 'User-Agent': 'GitTrendJournal/1.0', Accept: 'text/html' }, signal: AbortSignal.timeout(30000)
        });
        if (!response.ok) {
          if (response.status === 429 || response.status >= 500) throw new Error(`재시도 가능한 HTTP ${response.status}`);
          throw Object.assign(new Error(`HTTP ${response.status}`), { noRetry: true });
        }
        html = await response.text(); break;
      } catch (error) {
        if (attempt === 2 || error.noRetry) throw error;
        await delay(2000 * (attempt + 1));
      }
    }
    const rows = parseTrending(html);
    const hash = fingerprint(rows);
    const current = state.reports[period];
    const duplicate = Boolean(current && fingerprint(current.rows) === hash);
    if (!duplicate) state.reports[period] = createReport(period, rows, now);
    state.ledger.push({ issue, period, hash, status: duplicate ? 'skipped-identical' : 'published', processedAt: now.toISOString() });
    changed = true;
  }
  // 같은 문서를 서로 다른 설명으로 분석해도 실제 문서 요청은 실행 중 재사용합니다.
  const responses = new Map();
  const fetchDocument = async (url, options) => {
    if (responses.has(url)) { const response = responses.get(url); return response.clone ? response.clone() : response; }
    const response = await fetcher(url, options);
    if (response.ok) responses.set(url, response.clone ? response.clone() : response);
    return response;
  };
  const analyze = analyzeProject || (row => fetchUsage(row, { now, fetcher: fetchDocument, delay, forceAnalysis: refreshAnalysis }));
  const cache = new Map();
  for (const [period, report] of Object.entries(state.reports)) {
    for (const row of report.rows) {
      const input = analysisInputFingerprint(row);
      const candidates = [normalizeUsage(row.usage, row), ...(prior.get(row.name.toLowerCase())?.values() || [])].filter(Boolean);
      const matching = candidates.filter(candidate => candidate.analysisInputFingerprint === input);
      const base = (matching.length ? matching : candidates).reduce(choose, undefined);
      const key = `${row.name.toLowerCase()}:${analysisInputFingerprint(row)}`;
      if (!cache.has(key)) {
        const result = !refreshAnalysis && isFreshUsage(base, row, now, usageVersion, maxDocumentAgeMs) ? base : await analyze({ ...row, usage: base });
        cache.set(key, normalizeUsage(result, row));
      }
      let usage = cache.get(key);
      validateUsage(usage, row);
      // 분석 형식 갱신 중 README 조회에 실패하면 기존의 정상 분석을 유지합니다.
      if (usage?.status === 'unavailable' && base?.status === 'ready') {
        const document = usage.document || { status: 'unavailable', checkedAt: now.toISOString() };
        usage = { ...base, document, stale: true };
      }
      if (aiAnalyzer) usage = await aiAnalyzer.enrich(row, usage);
      validateUsage(usage, row);
      if (!usage || JSON.stringify(row.usage) === JSON.stringify(usage)) continue;
      row.usage = structuredClone(usage);
      changed = true;
    }
    const synthesis = synthesizeReport(report, period, now);
    if (JSON.stringify({ title: report.title, summary: report.summary, analysis: report.analysis, synthesis: report.synthesis }) !== JSON.stringify(synthesis)) {
      Object.assign(report, synthesis);
      changed = true;
    }
  }
  return { state, changed };
}
