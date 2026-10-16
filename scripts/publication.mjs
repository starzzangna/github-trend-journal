import { periods, issueKey, fingerprint, parseTrending, createReport } from './trends.mjs';
import { fetchUsage, usageVersion } from './usage.mjs';

export async function collectPublication(previous, { now = new Date(), fetcher = fetch, delay = ms => new Promise(resolve => setTimeout(resolve, ms)), analyzeProject = row => fetchUsage(row, { now }) } = {}) {
  const state = structuredClone(previous);
  let changed = false;
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
    const duplicate = state.ledger.some(entry => entry.period === period && entry.hash === hash && entry.status === 'published');
    if (!duplicate) state.reports[period] = createReport(period, rows, now);
    state.ledger.push({ issue, period, hash, status: duplicate ? 'skipped-identical' : 'published', processedAt: now.toISOString() });
    changed = true;
  }
  // 기존 글도 발행 키·시각을 유지한 채 사용법을 보완합니다. 원본 README는 저장하지 않습니다.
  const cache = new Map();
  for (const report of Object.values(state.reports)) {
    for (const row of report.rows) {
      if (row.usage?.version === usageVersion && row.usage.status === 'ready') continue;
      const key = row.name.toLowerCase();
      if (!cache.has(key)) cache.set(key, await analyzeProject(row));
      const usage = cache.get(key);
      if (!usage || (row.usage?.version === usageVersion && row.usage.status === 'unavailable' && usage.status === 'unavailable')) continue;
      row.usage = structuredClone(usage);
      changed = true;
    }
  }
  return { state, changed };
}
