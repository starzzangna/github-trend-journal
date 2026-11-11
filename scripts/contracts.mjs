import { javaBuildPaths } from './java-setup.mjs';
import { validateSkillsSetup } from './skills-setup.mjs';
import { representativeSpecs, validateRepresentatives, validateCollectionScope } from './representatives.mjs';
import { assessQuality } from './evidence.mjs';
import { synthesizeReport, reportVersion } from './report.mjs';
import { documentFingerprint } from './freshness.mjs';
import { validateAiNote } from './ai.mjs';
import { addKoreanPresentation } from './korean.mjs';

// 구형 보고서는 재조회 전까지 보존하되 새 형식은 저장·빌드 경계에서 검사합니다.
export function validateUsage(usage, row = { name: usage?.sources?.[0]?.repository }) {
  validateAiNote(row, usage);
  if (!usage || [1, 2].includes(usage.version)) return;
  const fail = message => { throw new Error(`분석 데이터 오류: ${message}`); };
  if (![3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].includes(usage.version) || usage.schemaVersion !== (usage.version >= 4 ? 2 : 1) || usage.analyzerVersion !== usage.version) fail('지원하지 않는 버전');
  if (!['ready', 'unavailable'].includes(usage.status)) fail('처리 상태');
  if (!['available', 'unavailable'].includes(usage.document?.status)) fail('문서 조회 상태');
  if (!['complete', 'partial', 'unavailable'].includes(usage.quality?.status)) fail('분석 품질 상태');
  if (!Array.isArray(usage.quality.missing) || usage.quality.missing.some(item => typeof item !== 'string')) fail('미확인 항목');
  if (!Number.isFinite(Date.parse(usage.document.checkedAt))) fail('문서 확인 시각');
  if (!Array.isArray(usage.sources) || !Array.isArray(usage.evidence)) fail('출처·근거 목록');
  if (usage.document.links !== undefined && (!Array.isArray(usage.document.links) || usage.document.links.length > (usage.version >= 14 && row.name === 'TheAlgorithms/Java' ? 5 : usage.version >= 9 ? 4 : 2) || new Set(usage.document.links.map(item => item.path)).size !== usage.document.links.length || usage.document.links.some(item => typeof item.path !== 'string' || (!/\.md$/i.test(item.path) && !(usage.version >= 14 && row.name === 'TheAlgorithms/Java' && javaBuildPaths.includes(item.path)) && !(usage.version >= 9 && representativeSpecs.some(spec => spec.repository === row.name && spec.path === item.path))) || !['available', 'unavailable'].includes(item.status) || !Number.isFinite(Date.parse(item.checkedAt)) || (item.status === 'available' && !usage.sources.some(source => source.path === item.path))))) fail('추가 문서 조회 상태');
  const sources = new Map();
  for (const item of usage.document.links || []) {
    if (item.reason !== undefined && (item.status !== 'unavailable' || !['http', 'format', 'size-limit', 'project-size-limit', 'timeout', 'network'].includes(item.reason))) fail('추가 문서 제외·실패 사유');
    if (item.httpStatus !== undefined && (item.reason !== 'http' || !Number.isInteger(item.httpStatus) || item.httpStatus < 400 || item.httpStatus > 599)) fail('추가 문서 HTTP 상태');
  }
  for (const source of usage.sources) {
    if (!source.id || sources.has(source.id) || !/^[\w.-]+\/[\w.-]+$/.test(source.repository) || typeof source.path !== 'string' || !source.path || !Number.isFinite(Date.parse(source.fetchedAt)) || (source.sha !== null && typeof source.sha !== 'string')) fail('출처 식별 정보');
    const prefix = `https://github.com/${source.repository}`;
    if (source.url !== `${prefix}#readme` && !source.url?.startsWith(`${prefix}/blob/`)) fail('출처 URL');
    sources.set(source.id, source);
  }
  const evidence = new Set();
  for (const item of usage.evidence) {
    if (!item.id || evidence.has(item.id) || !sources.has(item.sourceId) || !item.excerpt?.trim() || item.excerpt.length > 600 || !item.section || !Number.isInteger(item.line) || item.line < 1) fail('근거 또는 출처 참조');
    evidence.add(item.id);
    if (usage.version >= 4 && !['prose', 'heading', 'example'].includes(item.kind)) fail('근거 유형');
  }
  if (usage.status === 'unavailable') {
    if (usage.document.status !== 'unavailable' || usage.quality.status !== 'unavailable') fail('조회 실패와 품질 상태 불일치');
    return;
  }
  if (!usage.article || !Array.isArray(usage.article.findings) || !Array.isArray(usage.article.conditions) || !sources.size) fail('분석 본문');
  for (const field of ['analyzedAt', 'sourceCheckedAt']) if (usage[field] !== undefined && !Number.isFinite(Date.parse(usage[field]))) fail('분석·문서 확인 시각');
  if (usage.sourceFingerprint !== undefined && usage.sourceFingerprint !== documentFingerprint(usage.sources)) fail('문서 지문');
  if (usage.analysisInputFingerprint !== undefined && !/^[a-f0-9]{64}$/.test(usage.analysisInputFingerprint)) fail('분석 입력 지문');
  const claims = [...usage.article.findings, ...usage.article.conditions];
  if (usage.version >= 4) {
    const classification = usage.classification;
    if (!Array.isArray(classification?.evidenceIds) || classification.evidenceIds.some(id => !evidence.has(id)) || (usage.category !== '용도 분류 미확정' && !classification.evidenceIds.length)) fail('분류 근거');
    if (classification.evidenceIds.some(id => usage.evidence.find(item => item.id === id).kind === 'example')) fail('사용 예만으로 용도 분류');
    const project = usage.article.project;
    if (!project || !Array.isArray(project.inputs) || !Array.isArray(project.outputs) || !Array.isArray(project.conditions)) fail('프로젝트 설명');
    claims.push(...(project.problem ? [project.problem] : []), ...project.inputs, ...project.outputs, ...project.conditions);
    for (const item of project.conditions) if (!['required', 'optional', 'not-required', 'mentioned'].includes(item.scope)) fail('도입 조건 범위');
  }
  for (const claim of claims) {
    if (typeof claim.title !== 'string' || typeof claim.body !== 'string' || !['interpretation', 'documented'].includes(claim.kind) || !Array.isArray(claim.evidenceIds) || !claim.evidenceIds.length || claim.evidenceIds.some(id => !evidence.has(id))) fail('출처 없는 주장');
    if (usage.version >= 4 && claim.evidenceIds.some(id => usage.evidence.find(item => item.id === id).kind === 'example') && claim.exampleOnly !== true) fail('사용 예 검증 범위 누락');
  }
  if (usage.version >= 5 && (!Array.isArray(usage.article.verdictEvidenceIds) || usage.article.verdictEvidenceIds.some(id => !evidence.has(id)) || (!usage.article.verdictEvidenceIds.length && !usage.article.verdict.includes('보류')))) fail('핵심 판단 근거');
  if (usage.version >= 6) {
    if (!Array.isArray(usage.article.core) || usage.article.core.some(claim => typeof claim.body !== 'string' || !Array.isArray(claim.evidenceIds) || !claim.evidenceIds.length || claim.evidenceIds.some(id => !evidence.has(id)))) fail('한국어 요약 근거');
  }
  if (usage.version >= 7) {
    const expectedKo = addKoreanPresentation(structuredClone(usage));
    const collect = value => [value.article.core, value.article.findings.map(item => item.summaryKo), value.article.project.inputs.map(item => item.summaryKo), value.article.project.outputs.map(item => item.summaryKo), value.article.project.conditions.map(item => item.summaryKo)];
    if (JSON.stringify(collect(usage)) !== JSON.stringify(collect(expectedKo))) fail('한국어 요약과 문서 근거 불일치');
  }
  if (usage.version >= 9) validateRepresentatives(usage);
  if (usage.version >= 10) validateCollectionScope(usage, row);
  validateSkillsSetup(usage, row);
  const expected = assessQuality(usage);
  if (usage.version >= 13 && JSON.stringify(usage.quality.setup) !== JSON.stringify(expected.setup)) fail('설치·실행 조건 품질 불일치');
  if (usage.version >= 10 && ['io', 'notApplicable', 'representatives'].some(key => JSON.stringify(usage.quality[key]) !== JSON.stringify(expected[key]))) fail('입출력 적용 범위·대표 항목 품질 불일치');
  if (usage.quality.status !== expected.status || JSON.stringify(usage.quality.missing) !== JSON.stringify(expected.missing)) fail('분석 품질 판정 불일치');
}

export function validatePublication(state) {
  for (const [period, report] of Object.entries(state.reports)) {
    for (const row of report.rows) validateUsage(row.usage, row);
    if (report.synthesis) {
      if (report.synthesis.version !== reportVersion || !Number.isFinite(Date.parse(report.synthesis.generatedAt))) throw new Error('종합 보고서 형식 오류');
      const expected = synthesizeReport(report, period, new Date(report.synthesis.generatedAt));
      if (JSON.stringify(report.synthesis) !== JSON.stringify(expected.synthesis) || report.summary !== expected.summary || JSON.stringify(report.analysis) !== JSON.stringify(expected.analysis) || report.title !== expected.title) throw new Error('프로젝트 분석과 종합 보고서가 일치하지 않습니다.');
    }
  }
}
