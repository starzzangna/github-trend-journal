// 사용자가 요청한 두 모음에서 고정된 대표 항목만 읽습니다. 항목의 문서 지시는 실행하지 않습니다.
export const representativeSpecs = [
  {
    repository: 'TheAlgorithms/Java', id: 'java-binary-search', title: 'BinarySearch · 이진 탐색',
    path: 'src/main/java/com/thealgorithms/searches/BinarySearch.java', parent: 'DIRECTORY.md', link: 'src/main/java/com/thealgorithms/searches/BinarySearch.java', format: 'javadoc',
    fields: {
      scenario: [[/numbers = \{1, 3, 5, 7, 9, 11\}.*result will be 3/i], '공식 문서의 예에서는 [1, 3, 5, 7, 9, 11]에서 7을 찾아 인덱스 3을 얻습니다.'],
      input: [[/@param array.*sorted.*ascending.*@param key/i], '오름차순으로 정렬된 배열과 찾을 값을 전달합니다.'],
      output: [[/@return The index of the key if found, -1 if not found or if array is null\/empty/i], '찾으면 해당 원소의 인덱스를 반환하고, 찾지 못하거나 배열이 비어 있으면 -1을 반환합니다.'],
      caution: [[/ONLY works correctly.*sorted in ascending order/i], '오름차순 정렬이 전제입니다. 이 조건을 다른 검색 알고리즘의 공통 조건으로 확대하지 마세요.']
    }
  },
  {
    repository: 'TheAlgorithms/Java', id: 'java-bubble-sort', title: 'BubbleSort · 버블 정렬',
    path: 'src/main/java/com/thealgorithms/sorts/BubbleSort.java', parent: 'DIRECTORY.md', link: 'src/main/java/com/thealgorithms/sorts/BubbleSort.java', format: 'javadoc',
    fields: {
      scenario: [[/Implements generic bubble sort algorithm/i], '배열을 정렬하는 항목입니다. 아래 입출력은 공식 Javadoc의 메서드 설명을 정리한 것입니다.'],
      input: [[/@param array the array to be sorted/i], '정렬할 배열을 전달합니다.'],
      output: [[/@return the sorted array/i], '정렬된 배열을 반환합니다.'],
      caution: [[/in-place sorting/i], '문서가 제자리 정렬로 설명하므로 원본 배열의 변경을 고려해야 합니다. 실제 동작을 실행 검증한 결과는 아닙니다.']
    }
  },
  {
    repository: 'anthropics/knowledge-work-plugins', id: 'plugin-product-spec', title: 'product-management · PRD 작성',
    path: 'product-management/README.md', parent: 'README.md', link: 'product-management', format: 'markdown',
    fields: {
      scenario: [[/We need to add SSO support for enterprise customers/i, /\/write-spec/], '공식 사용 예는 기업 고객용 SSO 기능 요구를 /write-spec에 전달해 PRD를 작성하는 흐름입니다.'],
      input: [[/from a problem statement or feature idea/i], '문제 정의나 기능 아이디어를 전달합니다.'],
      output: [[/Generate structured product requirements documents.*user stories.*success metrics/i], '사용자 스토리, 요구사항 우선순위, 성공 지표 등을 담은 구조화된 제품 요구사항 문서(PRD)를 만듭니다.'],
      caution: [[/Without them, provide context manually/i], '연결 도구가 없으면 필요한 맥락을 직접 제공해야 합니다. 이 산출물은 PRD 작성 예의 범위이며 전체 플러그인의 공통 출력이 아닙니다.']
    }
  },
  {
    repository: 'anthropics/knowledge-work-plugins', id: 'plugin-sales-call', title: 'sales · 통화 후 요약',
    path: 'sales/README.md', parent: 'README.md', link: 'sales', format: 'markdown',
    fields: {
      scenario: [[/\/sales:call-summary/], '통화가 끝난 뒤 call-summary를 이용해 후속 작업을 정리하는 공식 문서의 예입니다.'],
      input: [[/Paste your notes or transcript/i], '통화 메모·녹취록을 붙여 넣거나, 통화 기록 도구가 연결돼 있으면 해당 통화를 지정합니다.'],
      output: [[/You get a summary, a follow-up email draft, a team summary and proposed CRM updates/i], '통화 요약, 후속 이메일 초안, 팀 요약, CRM 변경 제안을 얻습니다.'],
      caution: [[/Nothing is written to the CRM or sent until you say so/i], '문서에서는 사용자 지시 전까지 CRM에 기록하거나 이메일을 보내지 않는다고 설명합니다. 연결 권한과 실제 반영 여부를 별도로 확인하세요.']
    }
  }
];

export function readJavaDocs(java) {
  return [...java.matchAll(/\/\*\*([\s\S]*?)\*\//g)].map((match, index) => ({
    title: `공식 Javadoc ${index + 1}`, level: 2,
    line: java.slice(0, match.index).split('\n').length,
    body: match[1].split('\n').map(line => line.replace(/^\s*\* ?/, '')).join('\n')
  }));
}

const labels = { scenario: '사용 예', input: '입력', output: '출력', caution: '주의점' };

// 이름이나 빈 배열만으로 해당 없음을 추정하지 않습니다. 확인한 두 모음의 본문 근거만 허용합니다.
const collectionRules = [
  ['TheAlgorithms/Java', /implementations are intended for learning purposes/i],
  ['anthropics/knowledge-work-plugins', /Each plugin bundles.*specific job function/i]
];
export function collectionScope(row, context) {
  const rule = collectionRules.find(([name]) => name === row.name);
  const id = rule && context.select(rule[1], { candidates: context.documents.filter(item => item.sourceId === 'readme'), wholeParagraph: true });
  return id ? { kind: 'item-specific', body: '항목마다 입출력 계약이 다른 모음입니다. 모음 전체의 공통 입출력은 평가 대상에서 제외하고 대표 항목을 따로 확인합니다.', evidenceIds: [id] } : null;
}
export function validateCollectionScope(usage, row) {
  const scope = usage.article.project.ioScope;
  if (scope === null) return;
  const rule = collectionRules.find(([name]) => name === row.name);
  if (!rule || scope?.kind !== 'item-specific' || scope.body !== '항목마다 입출력 계약이 다른 모음입니다. 모음 전체의 공통 입출력은 평가 대상에서 제외하고 대표 항목을 따로 확인합니다.' || !Array.isArray(scope.evidenceIds) || !scope.evidenceIds.length || scope.evidenceIds.some(id => !usage.evidence.some(item => item.id === id && item.sourceId === 'readme' && rule[1].test(item.excerpt)))) throw Error('모음형 입출력 범위 근거 오류');
}
export function explainRepresentatives(row, context) {
  return representativeSpecs.filter(spec => spec.repository === row.name).flatMap(spec => {
    const candidates = context.representativeDocuments.filter(document => document.representativeId === spec.id);
    if (!candidates.length) return [];
    const result = { id: spec.id, title: spec.title, scope: 'representative' };
    for (const [field, [patterns, body]] of Object.entries(spec.fields)) {
      const ids = patterns.map(pattern => context.select(pattern, { candidates, includeExamples: true, wholeParagraph: true, allowNegative: true }));
      if (ids.some(id => !id)) return [];
      result[field] = { title: labels[field], body, kind: 'interpretation', exampleOnly: true, evidenceIds: [...new Set(ids)] };
    }
    return [result];
  });
}

export function validateRepresentatives(usage) {
  const examples = usage.article?.project?.examples;
  if (!Array.isArray(examples) || examples.length > 2 || new Set(examples.map(item => item.id)).size !== examples.length) throw Error('대표 항목 목록 오류');
  for (const item of examples) {
    const spec = representativeSpecs.find(spec => spec.id === item.id && usage.sources.some(source => source.repository === spec.repository && source.representativeId === spec.id && source.path === spec.path));
    if (!spec || item.title !== spec.title || item.scope !== 'representative') throw Error('대표 항목 범위 오류');
    for (const [field, [patterns, body]] of Object.entries(spec.fields)) {
      const claim = item[field];
      const evidence = (claim?.evidenceIds || []).map(id => usage.evidence.find(item => item.id === id));
      if (claim?.title !== labels[field] || claim.body !== body || claim.kind !== 'interpretation' || claim.exampleOnly !== true || !evidence.length || evidence.some(item => !item || !usage.sources.some(source => source.id === item.sourceId && source.representativeId === spec.id)) || patterns.some(pattern => !evidence.some(item => pattern.test(item.excerpt)))) throw Error('대표 항목 설명·근거 불일치');
    }
  }
}
