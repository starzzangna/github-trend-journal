// 분석 대상 스킬의 지시는 실행하지 않습니다. 설치·계획·위임 조건의 문서 근거만 읽습니다.
export const improveSetupPaths = ['skills/improve/SKILL.md', 'skills/improve/references/closing-the-loop.md'];
const repository = 'shadcn/improve';
const skill = improveSetupPaths[0], closing = improveSetupPaths[1];
const installRule = {
  id: 'improve-install', title: '설치·호환 · Agent Skills', scope: 'project-install',
  body: '공식 README는 npx skills add shadcn/improve로 설치하고 Agent Skills 형식을 지원하는 에이전트에서 사용하는 경로를 안내합니다. 계획은 Markdown이라 다른 에이전트나 사람에게 인계할 수 있습니다. 이 호환 설명이 모든 호스트의 자동 실행 위임 지원을 뜻하지는 않습니다.',
  proofs: [{ path: 'README.md', patterns: [/npx skills add shadcn\/improve/, /Works in any agent that supports Agent Skills format/i, /plans it writes are plain markdown, so any agent \(or human\) can pick them up/i] }]
};
const workflows = [
  { id: 'improve-planning', title: '계획 작성', conditions: [
    { id: 'improve-readonly', title: '소스 읽기 전용과 계획 저장 범위', applicability: 'required', path: '감사·계획 작성자 역할', body: '계획 작성자는 소스를 직접 수정하지 않습니다. 계획은 저장소의 plans/ 아래에 두며 그 이름이 다른 용도로 쓰이면 advisor-plans/를 사용하도록 설명합니다. 계획 작성과 구현 실행을 같은 작업으로 취급하지 마세요.', proofs: [{ path: skill, patterns: [/Never modify source code yourself/i, /The ONLY files you may create or modify live under plans\/.*advisor-plans\//i] }] },
    { id: 'improve-self-contained', title: '자체 완결 계획·검증 기준·기준 커밋', applicability: 'required', path: '다른 실행자에게 전달할 계획', body: '다른 실행자가 현재 대화 없이 읽을 수 있는 자체 완결 계획을 작성하고 기준 Git 커밋을 기록합니다. 문서는 단계마다 검증 명령과 예상 결과를 두도록 설명하므로 대화 맥락이나 실행자의 추측에 의존하지 않아야 합니다.', proofs: [{ path: skill, patterns: [/Every plan must be fully self-contained/i, /Before writing anything: record git rev-parse --short HEAD/i] }, { path: 'README.md', patterns: [/Verification gates.*Every step ends with a command and its expected output/i] }] }
  ] },
  { id: 'improve-execution', title: 'execute · 실행 위임', conditions: [
    { id: 'improve-host', title: '격리 실행자를 만들 수 있는 호스트', applicability: 'required', path: 'execute를 선택한 경우', body: '자동 execute는 격리된 git worktree에 별도 실행자를 만들 수 있는 호스트가 필요합니다. Agent Skills 형식만 지원한다고 이 기능까지 있다고 가정하면 안 됩니다. 지원하지 않는 호스트에서는 계획을 수동 실행자에게 인계하도록 안내합니다.', proofs: [{ path: skill, patterns: [/Requires a host agent that can spawn subagents in an isolated worktree/i, /if yours can't, say so and hand the plan over for manual execution instead/i] }] },
    { id: 'improve-preflight', title: 'Git 저장소·선행 계획·변경 확인', applicability: 'required', path: '실행자를 보내기 전', body: 'Git 저장소인지, 계획 파일이 존재하고 선행 작업이 DONE인지 확인해야 합니다. 계획의 기준 커밋 이후 대상 파일이 달라졌다면 드리프트를 확인하고 계획을 먼저 조정하는 조건입니다.', proofs: [{ path: closing, patterns: [/repo is a git repository/i, /plan file exists and its dependencies show DONE/i, /If in-scope files changed since Planned at, reconcile the plan first/i] }] },
    { id: 'improve-review', title: '실행 결과 재검증과 사용자 병합 판단', applicability: 'required', path: '실행자 결과 검토', body: '실행자의 완료 보고만 믿지 않고 격리 worktree에서 완료 기준을 다시 검증하고 변경 범위를 검토합니다. 문서는 최종 병합을 사용자의 결정으로 남깁니다. 계획 작성이나 실행 위임이 자동 병합 승인을 의미하지 않습니다.', proofs: [{ path: closing, patterns: [/Re-run every done criterion/i, /Scope compliance/i, /Merging is the user's decision.*never merge, push, or commit to their branch/i] }] }
  ] }
];
function extract(rule, context) {
  const ids = rule.proofs.flatMap(proof => proof.patterns.map(pattern => context.select(pattern, { candidates: [...context.documents, ...context.setupDocuments].filter(item => context.sources.some(source => source.id === item.sourceId && source.path === proof.path)), wholeParagraph: true, includeExamples: true, codeExamples: true, allowNegative: true })));
  if (ids.some(id => !id)) return null;
  const { proofs, ...claim } = rule;
  return { ...claim, scope: claim.scope || 'workflow-condition', kind: 'documented', exampleOnly: true, evidenceIds: [...new Set(ids)] };
}
export function explainImproveSetup(context) {
  return { installation: extract(installRule, context), runtimes: [], workflows: workflows.map(spec => ({ id: spec.id, title: spec.title, expected: spec.conditions.length, conditions: spec.conditions.flatMap(rule => { const claim = extract(rule, context); return claim ? [claim] : []; }) })) };
}
export const improveStart = route => ({ heading: 'Install', steps: ['Agent Skills 호환 호스트 확인', '공식 설치 명령 확인', '계획 작성과 실행 위임의 지원 범위 구분'], command: 'npx skills add shadcn/improve', excerpt: '', summaryKo: route.body, scope: 'project-install', evidenceIds: route.evidenceIds });
export const improveCondition = route => ({ ...route, scope: 'mentioned', path: '프로젝트 설치 · Agent Skills 호환 환경' });
export function assessImproveSetup(usage) {
  const setup = usage.article?.project?.setup;
  const missing = workflows.filter(spec => !spec.conditions.every(rule => setup?.workflows?.find(item => item.id === spec.id)?.conditions.some(item => item.id === rule.id)));
  return { installation: setup?.installation ? 'documented' : 'insufficient-evidence', workflowExpected: workflows.length, workflowAvailable: workflows.length - missing.length, missing: [...(setup?.installation ? [] : ['설치·호환 환경']), ...missing.map(spec => `작업 조건: ${spec.title}`)] };
}
export function validateImproveSetup(usage) {
  const setup = usage.article.project.setup;
  if (!setup || !Array.isArray(setup.runtimes) || setup.runtimes.length || !Array.isArray(setup.workflows) || setup.workflows.length !== workflows.length) throw Error('improve 작업 조건 목록 오류');
  const validate = (claim, rule) => {
    const { proofs, ...expected } = rule;
    const actual = { ...claim }; delete actual.evidenceIds;
    if (JSON.stringify(actual) !== JSON.stringify({ ...expected, scope: expected.scope || 'workflow-condition', kind: 'documented', exampleOnly: true }) || !Array.isArray(claim.evidenceIds) || !claim.evidenceIds.length) throw Error('improve 설치·작업 조건 설명 오류');
    const evidence = claim.evidenceIds.map(id => usage.evidence.find(item => item.id === id));
    if (evidence.some(item => !item || !usage.sources.some(source => source.id === item.sourceId && source.repository === repository && proofs.some(proof => proof.path === source.path)))) throw Error('improve 조건 출처 오류');
    for (const proof of proofs) if (proof.patterns.some(pattern => !evidence.some(item => pattern.test(item.excerpt) && usage.sources.some(source => source.id === item.sourceId && source.path === proof.path)))) throw Error('improve 조건 근거 불일치');
  };
  if (setup.installation) {
    validate(setup.installation, installRule);
    const condition = usage.article.project.conditions.find(item => item.id === installRule.id);
    const { summaryKo, ...actual } = condition || {};
    if (JSON.stringify(usage.start) !== JSON.stringify(improveStart(setup.installation)) || JSON.stringify(actual) !== JSON.stringify(improveCondition(setup.installation))) throw Error('improve 설치 경로 불일치');
  } else if (usage.start?.scope === 'project-install' || usage.article.project.conditions.some(item => item.id === installRule.id)) throw Error('근거 없는 improve 설치 경로');
  for (const [index, spec] of workflows.entries()) {
    const actual = setup.workflows[index];
    if (actual.id !== spec.id || actual.title !== spec.title || actual.expected !== spec.conditions.length || !Array.isArray(actual.conditions) || new Set(actual.conditions.map(item => item.id)).size !== actual.conditions.length) throw Error('improve 작업 조건 범위 오류');
    for (const claim of actual.conditions) {
      const rule = spec.conditions.find(item => item.id === claim.id);
      if (!rule) throw Error('지원하지 않는 improve 조건');
      validate(claim, rule);
    }
  }
  if (usage.article.project.conditions.some(item => workflows.some(spec => spec.conditions.some(rule => rule.id === item.id)) || item.evidenceIds.some(id => usage.sources.some(source => source.id === usage.evidence.find(proof => proof.id === id)?.sourceId && improveSetupPaths.includes(source.path))))) throw Error('작업별 조건을 공통 호환 조건에 혼합');
}
