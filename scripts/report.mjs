import { assessSkillsSetup, validateSkillsSetup } from './skills-setup.mjs';
import { validateRepresentatives, validateCollectionScope, representativesForVersion, ioNotApplicable } from './representatives.mjs';
import { labels } from './trends.mjs';

export const reportVersion = 6;

// 같은 발행호의 프로젝트 분석에서 확인한 분포와 공통 항목만 종합합니다.
export function synthesizeReport(report, period, now) {
  const rows = report.rows;
  const groups = new Map();
  const patterns = new Map();
  const references = [];
  const representativeExamples = [];
  const setupReviews = [];
  const coverage = { total: rows.length, classified: 0, unknown: 0, complete: 0, partial: 0, unavailable: 0, stale: 0, inputs: 0, outputs: 0, conditions: 0, inputsNotApplicable: 0, outputsNotApplicable: 0, inputEvidenceMissing: 0, outputEvidenceMissing: 0, exampleProjects: 0, examples: 0, exampleMissing: 0, exampleUnconfigured: 0, collectionInstallations: 0, collectionBuilds: 0, runtimeGroups: 0, runtimeMissing: 0, runtimeConditions: 0, workflowGroups: 0, workflowMissing: 0, workflowConditions: 0 };
  for (const row of rows) {
    const usage = row.usage;
    if (usage?.status !== 'ready') { coverage.unknown++; coverage.unavailable++; continue; }
    if (usage.stale || usage.document?.status === 'unavailable') coverage.stale++;
    if (usage.quality?.status === 'complete') coverage.complete++; else coverage.partial++;
    const ids = new Set(usage.evidence?.map(item => item.id) || []);
    const categoryKnown = usage.category !== '용도 분류 미확정' && usage.classification?.evidenceIds?.length && usage.classification.evidenceIds.every(id => ids.has(id));
    if (categoryKnown) {
      coverage.classified++;
      if (!groups.has(usage.category)) groups.set(usage.category, []);
      groups.get(usage.category).push(row.name);
    } else coverage.unknown++;
    const project = usage.article?.project;
    if (usage.version >= 13 && project?.setup) {
      try {
        validateSkillsSetup(usage, row);
        const assessment = assessSkillsSetup(usage);
        if (assessment) {
          coverage.collectionInstallations += project.setup.installation ? 1 : 0;
          coverage.collectionBuilds += project.setup.build ? 1 : 0;
          coverage.runtimeGroups += assessment.runtimeAvailable || 0;
          coverage.runtimeMissing += assessment.runtimeExpected ? assessment.runtimeExpected - assessment.runtimeAvailable : 0;
          coverage.workflowGroups += assessment.workflowAvailable || 0;
          coverage.workflowMissing += assessment.workflowExpected ? assessment.workflowExpected - assessment.workflowAvailable : 0;
          coverage.workflowConditions += (project.setup.workflows || []).reduce((sum, item) => sum + item.conditions.length, 0);
          coverage.runtimeConditions += project.setup.runtimes.reduce((sum, item) => sum + item.conditions.length, 0);
          setupReviews.push({ ...structuredClone(project.setup), name: row.name, assessment });
        }
      } catch { /* 검증되지 않은 설치·실행 조건은 종합에 사용하지 않습니다. */ }
    }
    let itemSpecific = false;
    try { validateCollectionScope(usage, row); itemSpecific = usage.version >= 10 && project?.ioScope?.kind === 'item-specific'; } catch { /* 범위 근거가 잘못되면 해당 없음으로 집계하지 않습니다. */ }
    if (itemSpecific) { if (ioNotApplicable(project, 'input', usage.version)) coverage.inputsNotApplicable++; if (ioNotApplicable(project, 'output', usage.version)) coverage.outputsNotApplicable++; }
    if (usage.quality?.representatives?.status === 'not-configured') coverage.exampleUnconfigured++;
    let examples = [];
    try { validateRepresentatives(usage); examples = project.examples; } catch { /* 검증되지 않은 대표 설명은 종합하지 않습니다. */ }
    if (examples.length) coverage.exampleProjects++;
    coverage.examples += examples.length;
    coverage.exampleMissing += itemSpecific ? representativesForVersion(usage.version).filter(spec => spec.repository === row.name && !examples.some(item => item.id === spec.id)).length : 0;
    for (const example of examples) representativeExamples.push({ ...structuredClone(example), name: row.name });
    for (const [kind, items] of [['input', project?.inputs], ['output', project?.outputs], ['condition', project?.conditions]]) {
      if (itemSpecific && kind !== 'condition' && ioNotApplicable(project, kind, usage.version)) continue;
      const grounded = (items || []).filter(item => item.evidenceIds?.length && item.evidenceIds.every(id => ids.has(id)));
      if (!grounded.length && kind !== 'condition') coverage[kind === 'input' ? 'inputEvidenceMissing' : 'outputEvidenceMissing']++;
      if (grounded.length) coverage[{ input: 'inputs', output: 'outputs', condition: 'conditions' }[kind]]++;
      for (const item of grounded) {
        // 공통 계약이 있다는 사실만으로 서로 다른 모음의 계약 내용을 같다고 묶지 않습니다.
        if (/^공통 (?:입력|출력) 계약$/.test(item.title)) continue;
        const key = `${kind}:${item.title}`;
        if (!patterns.has(key)) patterns.set(key, { kind, title: item.title, projects: [] });
        const pattern = patterns.get(key);
        if (!pattern.projects.some(project => project.name === row.name)) pattern.projects.push({ name: row.name, evidenceIds: item.evidenceIds, ...(item.scope ? { scope: item.scope } : {}), exampleOnly: Boolean(item.exampleOnly) });
      }
    }
    references.push({ name: row.name, sourceCheckedAt: usage.sourceCheckedAt || usage.checkedAt || null, analyzedAt: usage.analyzedAt || usage.checkedAt || null, stale: Boolean(usage.stale), classificationEvidenceIds: categoryKnown ? usage.classification.evidenceIds : [] });
  }
  const categoryGroups = [...groups].map(([category, projects]) => ({ category, count: projects.length, projects })).sort((a, b) => b.count - a.count || a.category.localeCompare(b.category, 'ko'));
  const sharedPatterns = [...patterns.values()].filter(item => item.projects.length >= 2).sort((a, b) => b.projects.length - a.projects.length || `${a.kind}:${a.title}`.localeCompare(`${b.kind}:${b.title}`, 'ko')).slice(0, 4);
  const topics = categoryGroups.slice(0, 2).map(item => `${item.category} ${item.count}개`).join(', ');
  const title = `${labels[period]} · ${categoryGroups.slice(0, 2).map(item => item.category).join('·') || '문서 확인을 기다리는'} 프로젝트 분석`;
  const summary = `상위 ${coverage.total}개 중 공식 문서 근거로 ${coverage.classified}개의 용도를 분류했습니다.${topics ? ` ${topics}가 포함됩니다.` : ''} 분류 미확정은 ${coverage.unknown}개입니다.`;
  const analysis = [
    `입력을 설명할 근거가 있는 프로젝트는 ${coverage.inputs}개, 출력은 ${coverage.outputs}개, 도입 조건은 ${coverage.conditions}개입니다. 공통 입력 해당 없음 ${coverage.inputsNotApplicable}개, 출력 해당 없음 ${coverage.outputsNotApplicable}개는 각각 평가 대상에서 제외합니다. 문서를 읽고 입출력을 평가할 대상은 입력 ${coverage.total - coverage.unavailable - coverage.inputsNotApplicable}개·출력 ${coverage.total - coverage.unavailable - coverage.outputsNotApplicable}개입니다. 근거 부족은 입력 ${coverage.inputEvidenceMissing}개·출력 ${coverage.outputEvidenceMissing}개이며 분석 자료 없음 ${coverage.unavailable}개는 별도입니다.`,
    `대표 항목 사용 예는 ${coverage.exampleProjects}개 프로젝트에서 ${coverage.examples}개를 확인했습니다. 대표 항목 근거 부족은 ${coverage.exampleMissing}개이며 대표 항목 자동 분석 미지원 모음은 ${coverage.exampleUnconfigured}개입니다. 공통 입출력 확인 수에 합산하지 않으며 실행 검증은 포함하지 않습니다.`,
    `설치·실행 조건을 별도 분석한 프로젝트 ${setupReviews.length}개 중 공통 설치 경로는 ${coverage.collectionInstallations}개 프로젝트에서, 공통 빌드·테스트 경로는 ${coverage.collectionBuilds}개 프로젝트에서 확인했습니다. 대표 항목 실행 조건은 ${coverage.runtimeGroups}개 항목에서 확인했고 ${coverage.runtimeMissing}개 항목은 근거가 부족합니다. 확인한 실행 조건 ${coverage.runtimeConditions}개를 모음 전체의 필수 조건으로 합산하지 않습니다.`,
    `계획 작성·실행 위임 등 작업 단계의 조건은 ${coverage.workflowGroups}개 단계에서 확인했고 ${coverage.workflowMissing}개 단계는 근거가 부족합니다. 확인한 작업 조건 ${coverage.workflowConditions}개를 설치 호환성이나 대표 항목 실행 조건과 합산하지 않습니다.`,
    sharedPatterns.length ? `공통으로 확인한 항목은 ${sharedPatterns.map(item => `${item.title}(${item.projects.length}개)`).join(', ')}입니다. 아래에서 프로젝트별 근거와 적용 범위를 확인하세요.` : '둘 이상의 프로젝트에서 함께 확인한 입출력·도입 조건이 충분하지 않습니다.',
    `기본 항목 충족 ${coverage.complete}개 · 부분 분석 ${coverage.partial}개 · 분석 불가 ${coverage.unavailable}개. 이 중 최신 문서 확인 실패로 이전 분석을 표시하는 항목은 ${coverage.stale}개입니다.`,
    '발행호에 포함된 목록과 문서 분석의 종합입니다. 스타 수를 성능이나 도입 추천으로 해석하지 않으며 성장 원인·과거 대비 변화는 추정하지 않습니다.'
  ];
  const body = { version: reportVersion, coverage, categoryGroups, sharedPatterns, representativeExamples, setupReviews, references };
  const old = report.synthesis;
  const unchanged = old && JSON.stringify({ ...old, generatedAt: undefined }) === JSON.stringify(body);
  return { title, summary, analysis, synthesis: { ...body, generatedAt: unchanged ? old.generatedAt : now.toISOString() } };
}
