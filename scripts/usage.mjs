import { explainSkillsSetup, installationStart, installationCondition } from './skills-setup.mjs';
// README는 분석용 입력으로만 취급합니다. 명령을 실행하거나 문서의 지시를 따르지 않습니다.
import { buildAnalysis } from './analysis.mjs';
import { createEvidenceBundle, assessQuality } from './evidence.mjs';
import { classifyProject } from './profiles.mjs';
import { explainProject, explainFindings, projectVerdict } from './project.mjs';
import { createHash } from 'node:crypto';
import { analysisInputFingerprint, documentFingerprint, normalizeUsage } from './freshness.mjs';
import { addKoreanPresentation } from './korean.mjs';
import { fetchLinkedDocuments } from './linked.mjs';
import { readJavaDocs, explainRepresentatives, collectionScope } from './representatives.mjs';
export const usageVersion = 13;

function clean(value) {
  return value.replace(/<!--[\s\S]*?-->/g, '').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' ').replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[*_`]/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

export function readSections(markdown) {
  const sections = [{ title: '', level: 0, body: '' }];
  let fence = null;
  for (const [offset, line] of markdown.replace(/\r/g, '').split('\n').entries()) {
    const mark = line.match(/^\s*(`{3,}|~{3,})/);
    if (mark) {
      if (!fence) fence = { char: mark[1][0], length: mark[1].length };
      else if (mark[1][0] === fence.char && mark[1].length >= fence.length) fence = null;
      sections.at(-1).body += `${line}\n`; continue;
    }
    const heading = !fence && line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) sections.push({ title: clean(heading[2]), level: heading[1].length, body: '', line: offset + 1 });
    else sections.at(-1).body += `${line}\n`;
  }
  return sections;
}

export function analyzeUsage(row, markdown, now = new Date(), metadata = {}, linkedDocuments = []) {
  const sections = readSections(markdown);
  const context = createEvidenceBundle(row, [{ sections, metadata }, ...linkedDocuments.map(document => ({ sections: document.metadata.format === 'javadoc' ? readJavaDocs(document.markdown) : readSections(document.markdown), metadata: document.metadata }))], now);
  const { profile, classification } = classifyProject(row, context);
  const selected = sections.findIndex(s => /quick\s*start|getting started|get started|빠른 시작|시작하기|사용법|安装|快速开始/i.test(s.title));
  const fallback = sections.findIndex(s => /(?:^|\s)(?:installation|install|setup|usage|how to use|설치|사용 방법)(?:\b|\s|$)/i.test(s.title));
  const index = selected >= 0 ? selected : fallback;
  let start = null;
  if (index >= 0) {
    const section = sections[index];
    const children = [];
    let bodies = section.body;
    for (const next of sections.slice(index + 1)) {
      if (next.level <= section.level) break;
      if (children.length < 3) children.push(next.title);
      bodies += `\n${next.body}`;
    }
    // 원문에서 확인된 짧은 명령 예시만 표시합니다. 자체적으로 설치 명령을 만들지 않습니다.
    const blocks = [...bodies.matchAll(/(`{3,}|~{3,})([^\n]*)\n([\s\S]*?)\1/g)];
    const commandBlock = blocks.find(([, , lang, body]) => /^(?:bash|sh|shell|console|zsh|powershell|ps1|cmd|text)?\s*$/i.test(lang.trim()) && body.trim());
    let command = commandBlock?.[3].trim() || '';
    // 긴 스크립트 일부만 잘라 실행 가능한 것처럼 보이지 않도록 전체 블록만 허용합니다.
    if (command.length > 220 || command.split('\n').length > 4 || command.split(/\s+/).length > 24) command = '';
    const prose = clean(bodies.replace(/(`{3,}|~{3,})[\s\S]*?\1/g, '').split('\n').find(line => line.trim() && !/^\s*(?:[!|<#]|\[|\*\*|---)/.test(line)) || '');
    const excerpt = prose.split(/\s+/).slice(0, command ? 0 : 20).join(' ').slice(0, 180);
    start = { heading: section.title, steps: children, command, excerpt };
  }
  const result = {
    schemaVersion: 2, analyzerVersion: usageVersion,
    version: usageVersion, status: 'ready', checkedAt: now.toISOString(),
    analyzedAt: now.toISOString(), sourceCheckedAt: now.toISOString(),
    analysisInputFingerprint: analysisInputFingerprint(row), sourceFingerprint: documentFingerprint(context.sources),
    document: { status: 'available', checkedAt: now.toISOString() },
    sources: context.sources, evidence: context.evidence,
    source: `https://github.com/${row.name}#readme`,
    classification,
    category: profile?.category || '용도 분류 미확정',
    purpose: profile?.purpose || '자동 분류로 용도를 확정하지 못했습니다. 저장소 설명과 README의 사용 예를 확인해 주세요.',
    audience: profile?.audience || null, scenario: profile?.scenario || null,
    basis: profile ? '저장소 설명·README의 키워드를 바탕으로 한 규칙 기반 해석입니다. 활용 예는 실제 사용 사례를 확인한 결과가 아닌 제안입니다.' : '자동으로 확인되지 않은 용도나 기능은 추가하지 않았습니다.',
    start, article: buildAnalysis(row, profile, start, context)
  };
  result.article.project = explainProject(row, context, profile);
  const project = result.article.project;
  project.examples = explainRepresentatives(row, context);
  project.ioScope = collectionScope(row, context, project);
  project.setup = explainSkillsSetup(row, context);
  if (project.setup?.installation) {
    result.start = installationStart(project.setup.installation);
    result.article = buildAnalysis(row, profile, result.start, context);
    result.article.project = project;
    project.conditions.push(installationCondition(project.setup.installation));
  }
  result.article.paragraphs = [project.problem?.body || '문서에서 해결하려는 문제를 충분히 확인하지 못했습니다.',
    `문서에서 확인한 입력: ${project.inputs.map(item => item.title).join(', ') || '미확인'}. 출력: ${project.outputs.map(item => item.title).join(', ') || '미확인'}. 아래 설명은 원문 근거와 사용 예를 바탕으로 합니다.`];
  result.article.conditions = project.conditions;
  result.article.findings = explainFindings(context, profile, result.article.findings);
  result.article.coverage.findings = result.article.findings.length;
  result.article.coverage.conditions = project.conditions.length;
  const verdict = projectVerdict(project, result.article.findings);
  result.article.verdict = verdict.text;
  result.article.verdictEvidenceIds = verdict.evidenceIds;
  result.quality = assessQuality(result);
  return addKoreanPresentation(result);
}

export async function fetchUsage(row, { now = new Date(), fetcher = fetch, token = process.env.GITHUB_TOKEN, delay = ms => new Promise(resolve => setTimeout(resolve, ms)), previousUsage = row.usage, forceAnalysis = false, analyze = analyzeUsage } = {}) {
  const source = `https://github.com/${row.name}#readme`;
  const previous = normalizeUsage(previousUsage, row);
  const finish = async (markdown, metadata) => {
    const linked = await fetchLinkedDocuments(markdown, row.name, metadata, { fetcher, now });
    const fingerprint = documentFingerprint([{ repository: row.name, path: metadata.path || 'README', sha: metadata.sha }, ...linked.documents.map(document => ({ repository: row.name, path: document.metadata.path, sha: document.metadata.sha }))]);
    const input = analysisInputFingerprint(row);
    if (!forceAnalysis && !linked.states.some(item => item.status === 'unavailable' && !['size-limit', 'project-size-limit'].includes(item.reason)) && previousUsage?.analysisInputFingerprint && previous?.status === 'ready' && previous.version === usageVersion && fingerprint && previous.sourceFingerprint === fingerprint && previous.analysisInputFingerprint === input && Date.parse(previous.analyzedAt) <= now.getTime()) {
      return { ...previous, checkedAt: now.toISOString(), sourceCheckedAt: now.toISOString(), document: { status: 'available', checkedAt: now.toISOString(), links: linked.states }, stale: false, analysisReused: true, readmeSha: metadata.sha };
    }
    const result = analyze(row, markdown, now, metadata, linked.documents);
    return { ...result, document: { ...result.document, links: linked.states }, readmeSha: metadata.sha || null, analysisReused: false };
  };
  const unavailable = reason => ({ schemaVersion: 2, analyzerVersion: usageVersion, version: usageVersion, status: 'unavailable', reason, source, checkedAt: now.toISOString(), document: { status: 'unavailable', reason, checkedAt: now.toISOString() }, quality: { status: 'unavailable', missing: ['문서 근거'] }, sources: [], evidence: [] });
  if (!/^[\w.-]+\/[\w.-]+$/.test(row.name)) return unavailable('저장소 경로를 확인하지 못했습니다.');
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'GitTrendJournal/1.0' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetcher(`https://api.github.com/repos/${row.name}/readme`, { headers, signal: AbortSignal.timeout(15000) });
      if (response.status === 404) return unavailable('공개 README를 찾지 못했습니다.');
      if (response.status === 403 || response.status === 429) {
        // 이미 확인한 공개 README 경로만 재사용합니다. 인증값은 원문 호스트에 전달하지 않습니다.
        const previousSource = previous?.sources?.find(item => item.repository === row.name && item.url?.startsWith(`https://github.com/${row.name}/blob/`));
        if (previousSource) {
          const path = previousSource.url.slice(`https://github.com/${row.name}/blob/`.length);
          const raw = await fetcher(`https://raw.githubusercontent.com/${row.name}/${path}`, { headers: { 'User-Agent': 'GitTrendJournal/1.0' }, signal: AbortSignal.timeout(15000) });
          if (raw.ok) {
            const bytes = Buffer.from(await raw.arrayBuffer());
            if (bytes.length > 250000) return unavailable('README 크기가 자동 분석 범위를 벗어났습니다.');
            const sha = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
            return finish(bytes.toString('utf8'), { path: previousSource.path, sha, html_url: previousSource.url });
          }
        }
        return unavailable('README API 접근 또는 호출 한도로 확인을 보류했습니다. 다음 실행에서 재시도합니다.');
      }
      if (!response.ok) throw new Error('README 응답 오류');
      const data = await response.json();
      if (data.encoding !== 'base64' || !data.content || data.size > 250000 || data.content.length > 350000) return unavailable('README 형식이나 크기가 자동 분석 범위를 벗어났습니다.');
      return finish(Buffer.from(data.content, 'base64').toString('utf8'), data);
    } catch {
      if (attempt < 2) { await delay(1000 * (attempt + 1)); continue; }
      return unavailable('README를 불러오지 못했습니다. 다음 실행에서 재시도합니다.');
    }
  }
}
