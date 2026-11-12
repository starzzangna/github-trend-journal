import { validateDocumentedOperations } from './operations.mjs';
import { validateCautions } from './cautions.mjs';
import { validateSkillsSetup } from './skills-setup.mjs';
import { validateRepresentatives, validateCollectionScope, ioNotApplicable } from './representatives.mjs';
import { addKoreanPresentation } from './korean.mjs';

// 비교 문장을 새로 추정하지 않고 검증된 프로젝트 설명을 같은 항목으로 나란히 제공합니다.
function review(row) {
  const usage = row.usage;
  const empty = state => ({ name: row.name, state, processing: [], inputs: { status: 'insufficient-evidence', claims: [], examples: [] }, outputs: { status: 'insufficient-evidence', claims: [], examples: [] }, conditions: [] });
  if (usage?.status !== 'ready' || usage.version < 17) return empty('legacy');
  try {
    validateDocumentedOperations(usage);
    validateCautions(usage);
    validateSkillsSetup(usage, row);
    validateRepresentatives(usage);
    validateCollectionScope(usage, row);
    const expected = addKoreanPresentation(structuredClone(usage));
    const presentation = value => [value.article.core, ...['inputs', 'outputs', 'conditions'].map(field => value.article.project[field].map(item => item.summaryKo))];
    if (JSON.stringify(presentation(usage)) !== JSON.stringify(presentation(expected))) throw Error('한국어 비교 설명 불일치');
    const project = usage.article.project;
    const normalize = (item, context) => {
      if (!item.evidenceIds?.length || item.evidenceIds.some(id => !usage.evidence.some(e => e.id === id && usage.sources.some(source => source.id === e.sourceId && source.repository === row.name)))) throw Error('비교 근거 오류');
      return { title: item.title, body: item.summaryKo || item.body, kind: item.kind, evidenceIds: [...item.evidenceIds], ...(item.exampleOnly ? { exampleOnly: true } : {}), ...(item.scope ? { scope: item.scope } : {}), ...(context ? { context } : {}) };
    };
    const io = (field, key) => {
      const exempt = ioNotApplicable(project, field, usage.version);
      return { status: exempt ? 'not-applicable' : project[key].length ? 'documented' : 'insufficient-evidence', claims: exempt ? [] : project[key].map(item => normalize(item)), examples: exempt ? project.examples.map(example => normalize(example[field], `${example.title} · 대표 항목`)) : [] };
    };
    const setup = project.setup;
    const common = setup?.installation || setup?.build;
    const conditions = [
      ...(common ? [normalize(common, setup.build ? '저장소 공통 빌드·테스트' : '공통 설치·호환 경로')] : []),
      ...usage.article.cautions.map(item => normalize(item, '도입 시 주의점'))
    ];
    // 구체적 주의점이나 공통 설치 분석이 없는 프로젝트에만 기존 경로별 조건을 사용합니다.
    if (!conditions.length) conditions.push(...project.conditions.slice(0, 2).map(item => normalize(item, item.path || '문서의 설치 경로')));
    return { name: row.name, state: 'ready', processing: usage.article.core.map(item => normalize(item)), inputs: io('input', 'inputs'), outputs: io('output', 'outputs'), conditions };
  } catch {
    return empty('insufficient-evidence');
  }
}

export function compareProjects(report, categoryGroups) {
  return categoryGroups.map(group => ({ category: group.category, mode: group.projects.length > 1 ? 'comparison' : 'single', projects: group.projects.map(name => review(report.rows.find(row => row.name === name))) }));
}
