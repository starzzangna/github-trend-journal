import { labels } from './trends.mjs';

export const reportVersion = 1;

// 같은 발행호의 프로젝트 분석에서 확인한 분포와 공통 항목만 종합합니다.
export function synthesizeReport(report, period, now) {
  const rows = report.rows;
  const groups = new Map();
  const patterns = new Map();
  const references = [];
  const coverage = { total: rows.length, classified: 0, unknown: 0, complete: 0, partial: 0, unavailable: 0, stale: 0, inputs: 0, outputs: 0, conditions: 0 };
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
    for (const [kind, items] of [['input', project?.inputs], ['output', project?.outputs], ['condition', project?.conditions]]) {
      const grounded = (items || []).filter(item => item.evidenceIds?.length && item.evidenceIds.every(id => ids.has(id)));
      if (grounded.length) coverage[{ input: 'inputs', output: 'outputs', condition: 'conditions' }[kind]]++;
      for (const item of grounded) {
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
    `입력을 설명할 근거가 있는 프로젝트는 ${coverage.inputs}개, 출력은 ${coverage.outputs}개, 도입 조건은 ${coverage.conditions}개입니다. 각각 전체 ${coverage.total}개를 기준으로 셉니다.`,
    sharedPatterns.length ? `공통으로 확인한 항목은 ${sharedPatterns.map(item => `${item.title}(${item.projects.length}개)`).join(', ')}입니다. 아래에서 프로젝트별 근거와 적용 범위를 확인하세요.` : '둘 이상의 프로젝트에서 함께 확인한 입출력·도입 조건이 충분하지 않습니다.',
    `기본 항목 충족 ${coverage.complete}개 · 부분 분석 ${coverage.partial}개 · 분석 불가 ${coverage.unavailable}개. 이 중 최신 문서 확인 실패로 이전 분석을 표시하는 항목은 ${coverage.stale}개입니다.`,
    '발행호에 포함된 목록과 문서 분석의 종합입니다. 스타 수를 성능이나 도입 추천으로 해석하지 않으며 성장 원인·과거 대비 변화는 추정하지 않습니다.'
  ];
  const body = { version: reportVersion, coverage, categoryGroups, sharedPatterns, references };
  const old = report.synthesis;
  const unchanged = old && JSON.stringify({ ...old, generatedAt: undefined }) === JSON.stringify(body);
  return { title, summary, analysis, synthesis: { ...body, generatedAt: unchanged ? old.generatedAt : now.toISOString() } };
}
