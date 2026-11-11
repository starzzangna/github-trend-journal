// 공식 설정과 Javadoc은 읽기 전용 근거입니다. Maven·Java·CI 작업을 실행하지 않습니다.
export const javaBuildPaths = ['pom.xml', '.github/workflows/build.yml'];
const repository = 'TheAlgorithms/Java';
const buildRule = {
  id: 'java-repository-build', title: '저장소 공통 빌드·테스트 · JDK 21·Maven', scope: 'collection-build',
  body: 'pom.xml의 컴파일 기준은 Java 21이며 JUnit·Surefire 테스트 설정이 있습니다. 공식 CI는 Ubuntu에서 Temurin JDK 21로 Maven verify를 실행하고, Checkstyle·SpotBugs·PMD를 별도로 검사합니다. 이는 저장소 공통 검증 경로이며 개별 알고리즘의 직접 실행 명령이나 다른 JDK·운영체제의 호환성 보증은 아닙니다.',
  proofs: [
    { path: 'pom.xml', patterns: [/<maven.compiler.source>21<\/maven.compiler.source>/, /<maven.compiler.target>21<\/maven.compiler.target>/, /<release>21<\/release>/, /<artifactId>maven-surefire-plugin<\/artifactId>/, /<artifactId>junit-jupiter<\/artifactId>/] },
    { path: '.github/workflows/build.yml', patterns: [/runs-on: ubuntu-latest/, /java-version: 21\b/, /distribution: 'temurin'/, /run: mvn --batch-mode --update-snapshots verify\b/, /run: mvn checkstyle:check/, /run: mvn spotbugs:check/, /run: mvn pmd:check/] }
  ]
};
const runtimeRules = [
  { representativeId: 'java-binary-search', title: 'BinarySearch · 이진 탐색', path: 'src/main/java/com/thealgorithms/searches/BinarySearch.java', conditions: [
    { id: 'binary-sorted', title: '오름차순 정렬 전제', applicability: 'required', path: '이진 탐색 · 검색 입력', body: '검색할 배열이 오름차순으로 정렬돼 있어야 한다고 Javadoc이 명시합니다. 이 조건은 이진 탐색의 입력 전제이며 다른 알고리즘 전체의 요구사항이 아닙니다.', patterns: [/ONLY works correctly.*sorted in ascending order/i] },
    { id: 'binary-comparable', title: '비교 가능한 원소 타입', applicability: 'required', path: '이진 탐색 · 원소 타입', body: 'Javadoc은 배열 원소 타입이 Comparable이어야 한다고 설명합니다. 배열과 검색값의 타입·비교 기준을 확인해야 하며 문서에 없는 null 원소 처리까지 보장하지 않습니다.', patterns: [/type of elements in the array \(must be Comparable\)/i] }
  ] },
  { representativeId: 'java-bubble-sort', title: 'BubbleSort · 버블 정렬', path: 'src/main/java/com/thealgorithms/sorts/BubbleSort.java', conditions: [
    { id: 'bubble-array', title: '정렬할 배열 전달', applicability: 'required', path: '버블 정렬 · 정렬 입력', body: 'Javadoc은 정렬할 배열을 인수로 전달하고 정렬된 배열을 반환하는 경로를 설명합니다. 이진 탐색의 사전 오름차순 정렬 조건을 이 항목에 옮겨 적용하지 않습니다.', patterns: [/@param array the array to be sorted/i, /@return the sorted array/i] },
    { id: 'bubble-in-place', title: '제자리 정렬과 원본 변경', applicability: 'documented-behavior', path: '버블 정렬 · 원본 배열 취급', body: '문서는 제자리 정렬이라고 설명합니다. 원본 배열이 보존된다고 가정하지 말고 배열 변경이 허용되는 작업인지 확인해야 합니다. 실제 실행으로 검증한 결과는 아닙니다.', patterns: [/in-place sorting/i] }
  ] }
];
export function readBuildConfiguration(text, path) {
  // 주석을 설정 근거로 채택하지 않습니다. XML/YAML은 실행하거나 외부 참조를 해석하지 않습니다.
  const body = path.endsWith('.xml') ? text.replace(/<!--[\s\S]*?-->/g, match => match.replace(/[^\n]/g, ' ')) : text.split('\n').filter(line => !/^\s*#/.test(line)).join('\n');
  return [{ title: path, line: 1, level: 1, body }];
}
function extract(rule, context, candidates) {
  const ids = rule.patterns.map(pattern => context.select(pattern, { candidates, wholeParagraph: true, headings: true, allowNegative: true }));
  if (ids.some(id => !id)) return null;
  const { patterns, ...claim } = rule;
  return { ...claim, scope: 'representative-runtime', kind: 'documented', exampleOnly: true, evidenceIds: [...new Set(ids)] };
}
export function explainJavaSetup(context) {
  const ids = buildRule.proofs.flatMap(proof => proof.patterns.map(pattern => context.select(pattern, { candidates: context.setupDocuments.filter(item => context.sources.some(source => source.id === item.sourceId && source.path === proof.path)), wholeParagraph: true })));
  const { proofs, ...claim } = buildRule;
  return {
    build: ids.every(Boolean) ? { ...claim, kind: 'documented', exampleOnly: false, evidenceIds: [...new Set(ids)] } : null,
    runtimes: runtimeRules.map(spec => ({ representativeId: spec.representativeId, title: spec.title, expected: spec.conditions.length, conditions: spec.conditions.flatMap(rule => {
      const value = extract(rule, context, context.representativeDocuments.filter(item => item.representativeId === spec.representativeId));
      return value ? [value] : [];
    }) }))
  };
}
export const javaBuildStart = route => ({ heading: '공식 CI와 Maven 설정', steps: ['JDK 21·Maven 환경 확인', '공식 Maven verify 경로로 빌드·테스트 확인', '별도 정적 검사 명령 확인'], command: 'mvn --batch-mode --update-snapshots verify', excerpt: '', summaryKo: route.body, scope: 'collection-build', evidenceIds: route.evidenceIds });
export const javaBuildCondition = route => ({ ...route, scope: 'mentioned', path: '저장소 공통 · 공식 CI 빌드·테스트 경로' });
export function assessJavaSetup(usage) {
  const setup = usage.article?.project?.setup;
  const missing = runtimeRules.filter(spec => !spec.conditions.every(rule => setup?.runtimes?.find(item => item.representativeId === spec.representativeId)?.conditions.some(item => item.id === rule.id)));
  return { build: setup?.build ? 'documented' : 'insufficient-evidence', runtimeExpected: 2, runtimeAvailable: 2 - missing.length, missing: [...(setup?.build ? [] : ['공통 빌드·테스트 경로']), ...missing.map(spec => `대표 실행 조건: ${spec.title}`)] };
}
export function validateJavaSetup(usage) {
  const setup = usage.article.project.setup;
  if (!setup || !Array.isArray(setup.runtimes) || setup.runtimes.length !== runtimeRules.length) throw Error('Java 실행 조건 목록 오류');
  const validate = (claim, expected, proofs) => {
    const actual = { ...claim }; delete actual.evidenceIds;
    if (JSON.stringify(actual) !== JSON.stringify(expected) || !Array.isArray(claim.evidenceIds) || !claim.evidenceIds.length) throw Error('Java 빌드·실행 조건 설명 오류');
    const evidence = claim.evidenceIds.map(id => usage.evidence.find(item => item.id === id));
    if (evidence.some(item => !item || !usage.sources.some(source => source.id === item.sourceId && source.repository === repository && proofs.some(proof => proof.path === source.path && (!proof.representativeId || source.representativeId === proof.representativeId))))) throw Error('Java 빌드·실행 조건 출처 오류');
    for (const proof of proofs) if (proof.patterns.some(pattern => !evidence.some(item => pattern.test(item.excerpt) && usage.sources.some(source => source.id === item.sourceId && source.path === proof.path)))) throw Error('Java 빌드·실행 조건 근거 불일치');
  };
  if (setup.build) {
    const { proofs, ...claim } = buildRule;
    validate(setup.build, { ...claim, kind: 'documented', exampleOnly: false }, proofs);
    const condition = usage.article.project.conditions.find(item => item.id === buildRule.id);
    const { summaryKo, ...actual } = condition || {};
    if (JSON.stringify(usage.start) !== JSON.stringify(javaBuildStart(setup.build)) || JSON.stringify(actual) !== JSON.stringify(javaBuildCondition(setup.build))) throw Error('Java 공통 빌드 경로 불일치');
  } else if (usage.start?.scope === 'collection-build' || usage.article.project.conditions.some(item => item.id === buildRule.id)) throw Error('근거 없는 Java 빌드 경로');
  for (const [index, spec] of runtimeRules.entries()) {
    const actual = setup.runtimes[index];
    if (actual.representativeId !== spec.representativeId || actual.title !== spec.title || actual.expected !== spec.conditions.length || !Array.isArray(actual.conditions) || new Set(actual.conditions.map(item => item.id)).size !== actual.conditions.length) throw Error('Java 대표 실행 조건 범위 오류');
    for (const claim of actual.conditions) {
      const rule = spec.conditions.find(item => item.id === claim.id);
      if (!rule) throw Error('지원하지 않는 Java 조건');
      const { patterns, ...expected } = rule;
      validate(claim, { ...expected, scope: 'representative-runtime', kind: 'documented', exampleOnly: true }, [{ path: spec.path, representativeId: spec.representativeId, patterns }]);
    }
  }
  if (usage.article.project.conditions.some(item => item.evidenceIds.some(id => usage.sources.some(source => source.id === usage.evidence.find(proof => proof.id === id)?.sourceId && source.representativeId)))) throw Error('알고리즘 개별 조건을 저장소 공통 조건에 혼합');
}
