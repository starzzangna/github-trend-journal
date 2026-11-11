import { explainJavaSetup, assessJavaSetup, validateJavaSetup } from './java-setup.mjs';
// 설치 안내와 실행 조건을 문서에서만 추출합니다. 문서의 명령·스킬은 실행하지 않습니다.
const repository = 'anthropics/skills';
const installation = {
  id: 'claude-code-marketplace', title: '모음 설치 · Claude Code', scope: 'collection-install',
  body: 'Claude Code에서 이 저장소를 플러그인 마켓플레이스로 등록하고, Browse and install plugins에서 anthropic-agent-skills의 document-skills 또는 example-skills를 선택해 설치하는 경로입니다. 설치 후 스킬 이름을 언급해 사용합니다. Claude.ai·API의 조건을 이 경로의 필수 조건으로 합치지 않습니다.',
  patterns: [/register this repository as a Claude Code Plugin marketplace/i, /\/plugin marketplace add anthropics\/skills/, /Select.*Browse and install plugins/i, /Select.*anthropic-agent-skills/i, /Select.*document-skills.*example-skills/i, /Select.*Install now/i, /After installing the plugin, you can use the skill by just mentioning it/i]
};
export const runtimeSpecs = [
  { representativeId: 'skill-pdf-text', title: 'pdf · PDF 텍스트 추출', conditions: [
    { id: 'pdf-python', title: 'Python·pypdf 추출 예', applicability: 'required', path: 'PDF · Python Quick Start', body: 'Python Quick Start는 pypdf의 PdfReader·PdfWriter를 가져오는 예입니다. 이 경로를 사용하려면 Python 실행 환경과 pypdf를 확인해야 합니다. 모음 전체의 필수 런타임이라는 뜻은 아닙니다.', patterns: [/from pypdf import PdfReader, PdfWriter/] },
    { id: 'pdf-ocr', title: '스캔 PDF용 OCR 경로', applicability: 'optional', path: 'PDF · 스캔 문서 OCR 선택 경로', body: '스캔 PDF의 OCR 예는 pytesseract와 pdf2image를 사용합니다. 스캔 문서를 처리할 때 이 경로의 추가 의존성을 확인하세요. 일반 PDF 텍스트 추출에 일괄 적용하는 조건은 아닙니다.', patterns: [/Extract Text from Scanned PDFs/i, /Requires: pip install pytesseract pdf2image/i] }
  ] },
  { representativeId: 'skill-xlsx-edit', title: 'xlsx · 스프레드시트 편집', conditions: [
    { id: 'xlsx-packages', title: '문서가 전제하는 패키지 환경', applicability: 'documented-environment', path: 'XLSX · 문서 전제 환경', body: '문서는 openpyxl·pandas·markitdown을 사전 설치된 도구로 설명합니다. 이는 문서가 전제한 환경의 설명이며 사용자의 로컬 설치를 확인한 결과가 아닙니다. 다른 실행 환경에서는 패키지·명령의 존재를 확인해야 합니다.', patterns: [/openpyxl, pandas, and markitdown are preinstalled/i] },
    { id: 'xlsx-recalculation', title: '수식 파일 재계산과 결과 확인', applicability: 'required', path: 'XLSX · 수식 포함 파일', body: '수식이 포함된 파일은 LibreOffice를 사용하는 재계산 경로를 확인해야 합니다. 문서는 오류가 있어도 종료 코드가 0일 수 있다고 설명하므로 종료 코드만 보지 말고 JSON 상태와 오류 내역을 확인하세요.', patterns: [/Recalculate \(mandatory whenever the file contains formulas\)/i, /LibreOffice computes every formula/i, /errors_?found exits 0, so never treat a clean exit as a clean workbook/i] }
  ] }
];

function extract(rule, context, candidates) {
  const ids = rule.patterns.map(pattern => context.select(pattern, { candidates, wholeParagraph: true, includeExamples: true, codeExamples: true, headings: true, allowNegative: true }));
  if (ids.some(id => !id)) return null;
  const { patterns, ...claim } = rule;
  return { ...claim, scope: claim.scope || 'representative-runtime', kind: 'documented', exampleOnly: true, evidenceIds: [...new Set(ids)] };
}
export function explainSkillsSetup(row, context) {
  if (row.name === 'TheAlgorithms/Java') return explainJavaSetup(context);
  if (row.name !== repository) return null;
  return {
    installation: extract(installation, context, context.documents.filter(item => item.sourceId === 'readme' && /Claude Code/i.test(item.scope))),
    runtimes: runtimeSpecs.map(spec => ({ representativeId: spec.representativeId, title: spec.title, expected: spec.conditions.length, conditions: spec.conditions.flatMap(rule => {
      const claim = extract(rule, context, context.representativeDocuments.filter(item => item.representativeId === spec.representativeId));
      return claim ? [claim] : [];
    }) }))
  };
}
export function installationStart(route) {
  return { heading: 'Claude Code', steps: ['마켓플레이스 등록', '스킬 묶음 선택·설치', '설치한 스킬 이름으로 요청'], command: '/plugin marketplace add anthropics/skills', excerpt: '', summaryKo: route.body, scope: 'collection-install', evidenceIds: route.evidenceIds };
}
export function installationCondition(route) {
  return { ...route, scope: 'optional', path: '모음 공통 · Claude Code 설치 경로' };
}
export function assessSkillsSetup(usage) {
  if (usage.version >= 14 && usage.sources?.[0]?.repository === 'TheAlgorithms/Java') return assessJavaSetup(usage);
  if (usage.version < 13 || usage.sources?.[0]?.repository !== repository) return null;
  const setup = usage.article?.project?.setup;
  const missing = runtimeSpecs.filter(spec => !spec.conditions.every(rule => setup?.runtimes?.find(item => item.representativeId === spec.representativeId)?.conditions.some(item => item.id === rule.id)));
  return { installation: setup?.installation ? 'documented' : 'insufficient-evidence', runtimeExpected: runtimeSpecs.length, runtimeAvailable: runtimeSpecs.length - missing.length, missing: [...(setup?.installation ? [] : ['모음 설치 경로']), ...missing.map(spec => `대표 실행 조건: ${spec.title}`)] };
}
export function validateSkillsSetup(usage, row) {
  if (usage.version < 13) return;
  if (usage.version >= 14 && row.name === 'TheAlgorithms/Java') return validateJavaSetup(usage);
  const setup = usage.article?.project?.setup;
  if (row.name !== repository) { if (setup !== null) throw Error('스킬 설치 범위 오류'); return; }
  if (!setup || !Array.isArray(setup.runtimes) || setup.runtimes.length !== runtimeSpecs.length) throw Error('스킬 실행 조건 목록 오류');
  const validate = (claim, rule, sourcePredicate) => {
    const { patterns, ...expected } = rule;
    const actual = { ...claim }; delete actual.evidenceIds;
    if (JSON.stringify(actual) !== JSON.stringify({ ...expected, scope: expected.scope || 'representative-runtime', kind: 'documented', exampleOnly: true })) throw Error('스킬 설치·실행 조건 설명 오류');
    if (!Array.isArray(claim.evidenceIds) || !claim.evidenceIds.length) throw Error('스킬 설치·실행 조건 근거 없음');
    const evidence = claim.evidenceIds.map(id => usage.evidence.find(item => item.id === id));
    if (evidence.some(item => !item || !usage.sources.some(source => source.id === item.sourceId && source.repository === repository && sourcePredicate(source))) || patterns.some(pattern => !evidence.some(item => pattern.test(item.excerpt)))) throw Error('스킬 설치·실행 조건 근거 불일치');
  };
  if (setup.installation) {
    validate(setup.installation, installation, source => source.id === 'readme');
    if (JSON.stringify(usage.start) !== JSON.stringify(installationStart(setup.installation))) throw Error('스킬 시작 경로 불일치');
    const condition = usage.article.project.conditions.find(item => item.id === installation.id);
    const { summaryKo, ...actual } = condition || {};
    if (JSON.stringify(actual) !== JSON.stringify(installationCondition(setup.installation))) throw Error('모음 설치 조건 불일치');
  } else if (usage.start?.scope === 'collection-install' || usage.article.project.conditions.some(item => item.id === installation.id)) {
    throw Error('근거 없는 모음 설치 경로');
  }
  for (const [index, spec] of runtimeSpecs.entries()) {
    const actual = setup.runtimes[index];
    if (actual.representativeId !== spec.representativeId || actual.title !== spec.title || actual.expected !== spec.conditions.length || !Array.isArray(actual.conditions) || new Set(actual.conditions.map(item => item.id)).size !== actual.conditions.length) throw Error('대표 실행 조건 범위 오류');
    for (const claim of actual.conditions) {
      const rule = spec.conditions.find(item => item.id === claim.id);
      if (!rule) throw Error('지원하지 않는 실행 조건');
      validate(claim, rule, source => source.representativeId === spec.representativeId && source.path === (spec.representativeId === 'skill-pdf-text' ? 'skills/pdf/SKILL.md' : 'skills/xlsx/SKILL.md'));
    }
  }
  if (usage.article.project.conditions.some(item => item.scope === 'representative-runtime' || runtimeSpecs.some(spec => spec.conditions.some(rule => rule.id === item.id)) || item.evidenceIds.some(id => usage.sources.some(source => source.id === usage.evidence.find(proof => proof.id === id)?.sourceId && source.representativeId)))) throw Error('대표 실행 조건을 모음 공통 조건에 혼합');
}
