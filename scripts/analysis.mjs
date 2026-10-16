// 문서에 등장한 기능만 해설합니다. 키워드 탐지는 지원 여부를 검증한 결과와 구분합니다.
const features = [
  { match: /voice clon(?:ing|e)/i, title: '샘플 음성을 활용하는 음성 복제', body: '음성 복제를 문서에서 다룹니다. 참고할 음성을 준비해 생성 결과를 비교하는 흐름으로 이해할 수 있습니다. 실제 활용에서는 발음과 말투가 입력 샘플의 특징을 얼마나 유지하는지가 중요한 확인 지점입니다.' },
  { match: /video dubbing|\bdubbing\b/i, title: '영상 더빙 작업', body: '더빙이 문서에 등장합니다. 음성 생성뿐 아니라 영상에 맞는 음성을 제작하려는 사용자가 살펴볼 항목입니다. 생성된 음성과 장면의 타이밍을 함께 확인하는 작업이 필요합니다.' },
  { match: /\btranscription\b|speech.to.text/i, title: '음성을 텍스트로 옮기는 작업', body: '음성 전사 기능을 문서에서 다룹니다. 녹음 자료의 내용을 텍스트로 다루는 흐름과 연결됩니다. 잡음이나 발화자 차이가 있는 짧은 자료로 결과를 확인하는 방식이 적합합니다.' },
  { match: /audiobook/i, title: '긴 음성 콘텐츠 제작', body: '오디오북 제작이 문서에 언급됩니다. 짧은 음성 샘플과 긴 콘텐츠 제작은 확인할 항목이 다릅니다. 여러 문단을 이어 생성할 때 말투와 음량의 일관성을 살펴볼 수 있습니다.' },
  { match: /decompil(?:ation|e|er|ing)/i, title: '디컴파일을 통한 코드 구조 탐색', body: '디컴파일을 문서에서 다룹니다. 실행 파일을 이해하기 쉬운 코드 표현으로 살펴보려는 분석 흐름과 연결됩니다. 복원된 표현과 실제 동작을 대조하는 것이 결과를 해석할 때의 핵심입니다.' },
  { match: /runtime behavior|runtime analysis|dynamic analysis/i, title: '실행 중인 동작 분석', body: '실행 시점의 동작을 분석하는 내용이 있습니다. 파일 구조를 읽는 것과 함께 특정 기능이 실제로 어떻게 수행되는지를 조사하는 관점입니다. 입력을 바꿨을 때 관측 결과가 어떻게 달라지는지 비교할 수 있습니다.' },
  { match: /disassembl(?:y|er)|disassembl(?:e|ing)/i, title: '어셈블리 수준의 분석', body: '디스어셈블리 관련 내용이 문서에 등장합니다. 높은 수준의 설명으로 파악하기 어려운 부분을 명령 단위로 살펴보는 데 관련된 항목입니다. 분석 대상의 아키텍처와 명령어 체계를 함께 확인해야 이해할 수 있습니다.' },
  { match: /context.compress|context window|上下文压缩/i, title: '컨텍스트 크기 관리', body: '문맥의 크기와 관리 방식을 문서에서 다룹니다. AI에 전달하는 자료를 관리해 긴 작업의 문맥 부담을 줄이려는 접근과 연결됩니다. 입력 크기가 줄더라도 중요한 세부 정보가 빠지지 않는지 함께 평가하는 것이 중요합니다.' },
  { match: /session memory|persistent memory|persists session/i, title: '작업 정보의 유지', body: '세션 정보나 지속 메모리에 대한 설명이 있습니다. 여러 단계로 진행되는 작업에서 이전 정보를 이어 쓰는 흐름과 관련됩니다. 세션을 바꾼 뒤에도 필요한 정보가 재사용되는지 확인해 볼 수 있습니다.' },
  { match: /agent memory|memory bank|retain.*recall/i, title: '정보 저장과 검색을 잇는 메모리', body: '에이전트 메모리를 문서에서 다룹니다. 정보를 저장하는 단계와 필요한 정보를 다시 찾는 단계를 함께 설계하는 유형입니다. 저장된 내용의 양보다 실제 질문에 관련된 정보가 검색되는지가 활용 판단에 중요합니다.' },
  { match: /plugin marketplace|plugins? (?:directory|marketplace)|marketplace.*plugins/i, title: '플러그인 탐색과 설치 경로', body: '플러그인 목록이나 마켓플레이스가 문서에 등장합니다. 필요한 기능을 개별 플러그인으로 선택하는 방식과 연결됩니다. 전체 목록보다 현재 작업에 맞는 항목을 골라 해당 플러그인의 문서까지 읽는 것이 사용 흐름의 출발점입니다.' },
  { match: /agentic skills|agent skill|skills librar/i, title: '작업별 절차를 제공하는 스킬', body: '에이전트용 스킬을 문서에서 다룹니다. 작업별 지침을 에이전트에 연결하는 유형으로 읽을 수 있습니다. 스킬 설치 여부뿐 아니라 실제 작업에서 해당 지침이 적용되는지를 결과물로 확인하는 것이 중요합니다.' },
  { match: /\bMCP\b|model context protocol/i, title: '에이전트와 도구를 연결하는 MCP', body: 'MCP가 문서에 언급됩니다. 에이전트가 외부 도구나 기능에 접근하는 연결 경로를 검토할 때 살펴볼 부분입니다. 사용 중인 클라이언트의 연결 방식과 저장소의 설정 절차가 맞는지 확인해야 합니다.' },
  { match: /multi.agent|agent.*orchestrat|coordinate autonomous workflows/i, title: '여러 에이전트의 작업 조정', body: '복수 에이전트나 작업 조정에 대한 설명이 있습니다. 역할을 나눠 작업을 진행하는 활용과 연결됩니다. 역할 간 입력·출력과 완료 기준을 명확히 정해야 실행 결과를 추적하기 쉽습니다.' },
  { match: /sandbox(?:ing|ed)?|isolated compute/i, title: '분리된 도구 실행 환경', body: '샌드박스나 격리 실행을 문서에서 다룹니다. 에이전트가 수행하는 도구 작업의 실행 범위를 관리하는 데 관련된 항목입니다. 격리된다는 설명만으로 범위를 단정하지 말고 파일·네트워크 설정을 문서와 함께 살펴봐야 합니다.' },
  { match: /SPIFFE|per.agent.*identity|cryptographic identity/i, title: '에이전트별 식별과 접근 관리', body: '에이전트별 신원 관리에 관한 내용이 있습니다. 여러 작업을 운영할 때 어떤 주체가 어떤 자원에 접근하는지를 구분하는 관점입니다. 실행 작업과 접근 기록을 연결해 확인할 수 있는지 검토할 수 있습니다.' },
  { match: /code review|line.level comments/i, title: '코드 변경에 대한 리뷰', body: '코드 리뷰를 문서에서 다룹니다. 변경된 코드에서 검토할 위치를 찾아 사람이 판단하는 흐름과 연결됩니다. 작은 수정에 대해 지적 위치가 정확한지, 실제로 고칠 가치가 있는지를 함께 확인하는 것이 좋습니다.' },
  { match: /deterministic pipelines|multi.language ruleset|static analysis/i, title: '규칙 기반 코드 점검', body: '규칙 또는 정적 분석 파이프라인에 관한 설명이 있습니다. 모델의 설명과 정해진 규칙의 검사를 함께 살펴볼 수 있는 항목입니다. 사용하는 언어와 실제 검사 규칙의 범위를 원문에서 확인하는 것이 필요합니다.' },
  { match: /HTML.*(?:render|video)|render.*video/i, title: '화면 구성과 영상 렌더링의 연결', body: 'HTML 구성이나 영상 렌더링을 문서에서 다룹니다. 웹 개발 방식으로 제작한 구성을 영상 결과물로 확인하려는 활용과 관련됩니다. 장면 길이와 출력 결과를 작은 예제로 비교하는 접근이 적합합니다.' },
  { match: /\bSVG\b|self.contained HTML/i, title: '문서에 넣을 시각 자료', body: 'SVG 또는 독립 HTML 결과물이 문서에 언급됩니다. 설명 자료에 그림을 포함하거나 결과물을 수정하려는 사용자가 확인할 항목입니다. 실제 출력 형식과 편집 가능 범위를 예제로 살펴볼 수 있습니다.' },
  { match: /text.to.cad|\bCAD\b/i, title: '설계 모델을 다루는 흐름', body: 'CAD 모델 관련 내용이 문서에 등장합니다. 설명이나 요구사항을 설계 작업으로 연결하려는 활용을 살펴볼 수 있습니다. 결과물의 형식과 치수·형상이 요구사항에 맞는지가 확인 기준입니다.' },
  { match: /workout|gym.*track|FitNotes/i, title: '운동 계획과 기록 관리', body: '운동 기록과 루틴 관련 내용이 문서에 있습니다. 일상적인 입력과 과거 기록 조회가 반복되는 활용에 해당합니다. 실제 루틴 하나를 등록하고 수행 기록을 다시 찾는 흐름을 확인할 수 있습니다.' },
  { match: /executables porting|port.*PS5|PS5.*(?:Linux|Windows)/i, title: '플랫폼 간 실행 파일 이식', body: '실행 파일의 플랫폼 이식에 관한 설명이 있습니다. 원래 환경과 대상 환경 사이의 차이를 다루는 프로젝트로 살펴볼 수 있습니다. 어떤 입력과 대상 환경까지 문서화돼 있는지 먼저 확인해야 적용 범위를 판단할 수 있습니다.' },
  { match: /cuts? .*tokens|token.*(?:savings|reduction)/i, title: '토큰 사용량을 줄이는 접근', body: '토큰 절감에 관한 설명이 있습니다. 사용량 감소와 결과의 정보량을 함께 비교해야 실제 활용 가치를 판단할 수 있습니다. 문서의 수치와 별개로 자신의 작업에서 입력량·출력량·정확도를 기록해 볼 수 있습니다.' }
];

const evaluation = {
  '음성 제작': '같은 문장과 음성 샘플로 발음·말투·긴 문장의 연결 상태를 비교하세요. 짧은 샘플이 만족스럽더라도 실제 길이의 자료에서 결과가 유지되는지 확인해야 제작 흐름에 맞는지 판단할 수 있습니다.',
  '역공학·프로그램 분석': '알려진 기능을 가진 작은 프로그램으로 분석 결과와 실제 동작을 대조하세요. 저장소가 다루는 파일 형식·아키텍처와 현재 분석하려는 대상이 맞는지 확인하는 것이 도입 판단의 출발점입니다.',
  'AI 컨텍스트 관리': '동일한 작업을 적용 전후로 수행해 문맥 사용량과 이전 요구사항 유지 여부를 비교하세요. 절감량과 함께 누락된 정보나 재질문 횟수도 기록해야 작업 효율을 판단할 수 있습니다.',
  'AI 토큰 사용 최적화': '같은 요청으로 토큰 사용량과 결과의 정확도·가독성을 함께 기록하세요. 표현이 짧아진 결과가 후속 작업에서도 필요한 의미를 전달하는지 살펴볼 수 있습니다.',
  'AI 에이전트 메모리': '정보를 저장한 직후와 새 세션에서 같은 질문을 해 보세요. 관련 정보가 검색되는지, 오래된 내용이나 다른 작업의 정보와 섞이지 않는지를 확인하는 것이 중요합니다.',
  'AI 에이전트 스킬': '스킬이 없는 경우와 연결한 경우에 같은 작업을 시켜 결과물의 절차와 품질을 비교하세요. 설치 성공과 실제 적용 여부를 나눠 확인하면 필요한 스킬만 선택하는 데 도움이 됩니다.',
  '플러그인 모음': '목록에 있다는 사실과 각 플러그인의 동작 범위는 다릅니다. 선택한 플러그인 하나의 사용 문서를 읽고 현재 도구에서 설치·호출·결과 확인까지 이어지는지 검토하세요.',
  'AI 에이전트 운영': '역할이 하나인 작은 작업부터 시작해 입력·실행·종료 결과를 추적하세요. 역할을 늘릴 때 작업 누락이나 중복 수행을 구분할 수 있는지가 운영 관점의 확인 지점입니다.',
  'AI 에이전트 실행 환경': '간단한 작업으로 파일·네트워크 접근 설정과 종료 후 자원 정리를 확인하세요. README가 설명하는 격리 범위를 현재 운영 환경의 설정과 대조하는 과정이 필요합니다.',
  '코드 리뷰': '이미 정답을 아는 작은 변경분을 대상으로 지적 위치와 수정 제안이 타당한지 확인하세요. 실제 결함을 찾는 정도와 불필요한 지적의 비율을 함께 기록해야 팀에 맞는지 판단할 수 있습니다.',
  '영상 제작': '짧은 장면으로 렌더링 시간, 출력 형식, 화면과 소리의 타이밍을 확인하세요. 반복 제작에서 수정한 내용이 결과물에 재현되는지도 검토할 수 있습니다.',
  '다이어그램 제작': '설명할 구조 하나를 골라 결과물을 만든 뒤 라벨·연결 관계·수정 가능성을 살펴보세요. 문서에 넣을 형식으로 내보내고 다시 편집하는 흐름까지 확인하면 활용 범위를 판단하기 쉽습니다.',
  'CAD·설계': '치수가 명확한 간단한 형상을 기준으로 모델 생성·수정·내보내기를 검토하세요. 보기 좋은 결과와 요구 치수를 만족한 결과를 구분해 확인할 필요가 있습니다.',
  '운동 기록': '루틴 등록, 수행 기록 입력, 지난 기록 조회를 한 번씩 수행해 보세요. 기존 기록을 옮겨야 한다면 문서의 가져오기·내보내기 범위를 추가로 확인하세요.',
  '실행 파일 이식': '문서에서 다루는 입력 형식과 대상 플랫폼을 먼저 확인하세요. 알려진 작은 예제로 변환 결과와 원래 실행 동작을 대조하면 적용 가능 범위를 판단하는 데 도움이 됩니다.'
};

function prose(body) {
  return body.replace(/<!--[\s\S]*?-->/g, '').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/(`{3,}|~{3,})[\s\S]*?\1/g, '').replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/<[^>]*>/g, ' ').replace(/[`*_]/g, '').replace(/\s+/g, ' ').trim();
}

function mentions(text, pattern) {
  const match = text.match(pattern);
  if (!match) return false;
  const nearby = text.slice(Math.max(0, match.index - 55), match.index + match[0].length + 40);
  // 미지원이라고 적힌 예를 기능으로 소개하지 않습니다.
  return !/(?:does not|doesn't|not yet|not supported|unsupported|no support|without)\b|지원하지|미지원/i.test(nearby);
}

export function buildAnalysis(row, sections, profile, start) {
  const source = `https://github.com/${row.name}#readme`;
  const documents = sections.filter(s => !/contribut|sponsor|star history|license|acknowledg/i.test(s.title)).map(s => ({ title: s.title || 'README 도입부', text: prose(s.body) }));
  const findings = [];
  const priority = {
    '역공학·프로그램 분석': /디컴파일|실행 중인|어셈블리/,
    '코드 리뷰': /코드 변경|규칙 기반 코드/,
    'AI 컨텍스트 관리': /컨텍스트|작업 정보/,
    'AI 에이전트 메모리': /정보 저장|작업 정보/,
    'AI 에이전트 실행 환경': /분리된|에이전트별/,
    'AI 에이전트 운영': /여러 에이전트|정보 저장/,
    'AI 에이전트 스킬': /작업별 절차/,
    '플러그인 모음': /플러그인 탐색/,
    'AI 토큰 사용 최적화': /토큰 사용량/,
    'CAD·설계': /설계 모델/,
    '영상 제작': /영상 렌더링/,
    '다이어그램 제작': /시각 자료/,
    '운동 기록': /운동 계획/,
    '실행 파일 이식': /플랫폼 간/
  }[profile?.category];
  const orderedFeatures = [...features].sort((a, b) => Number(Boolean(priority?.test(b.title))) - Number(Boolean(priority?.test(a.title))));
  for (const feature of orderedFeatures) {
    if (/샘플 음성|영상 더빙|음성을 텍스트|긴 음성/.test(feature.title) && profile?.category !== '음성 제작') continue;
    if (/디컴파일|실행 중인 동작|어셈블리/.test(feature.title) && profile?.category !== '역공학·프로그램 분석') continue;
    if (/코드 변경|규칙 기반 코드/.test(feature.title) && profile?.category !== '코드 리뷰') continue;
    if (/설계 모델/.test(feature.title) && profile?.category !== 'CAD·설계') continue;
    if (/운동 계획/.test(feature.title) && profile?.category !== '운동 기록') continue;
    if (/분리된 도구/.test(feature.title) && !['AI 에이전트 실행 환경', 'AI 에이전트 운영', 'AI 컨텍스트 관리'].includes(profile?.category)) continue;
    const document = documents.find(d => mentions(d.text, feature.match) || mentions(d.title, feature.match));
    if (!document) continue;
    findings.push({ title: feature.title, body: feature.body, section: document.title, source });
    if (findings.length === 4) break;
  }
  const environmentSections = documents.filter(d => /install|setup|set up|quick.?start|getting started|get started|requirement|prerequisite|platform|environment|설치|시작|환경/i.test(d.title));
  const conditions = [];
  for (const [match, title, body] of [
    [/\bDocker\b/i, '컨테이너 실행 환경', '시작·설치 관련 절에 Docker가 등장합니다. 컨테이너 실행 경로를 사용할 때 필요한 설정과 실행 방식을 해당 절에서 확인할 수 있습니다.'],
    [/\bKubernetes\b|\bkubectl\b/i, '클러스터 운영 환경', '설치 관련 절에 Kubernetes가 등장합니다. 로컬 애플리케이션 설치와 클러스터 배포 중 어떤 경로가 문서화돼 있는지 확인해야 합니다.'],
    [/\bPython\s*(?:3\.\d+)?\b/i, 'Python 실행 경로', '설치·시작 절에서 Python을 다룹니다. 요구 버전과 패키지 설치 범위는 원문의 해당 경로를 확인하세요.'],
    [/\bNode(?:\.js)?\b|\bnpm\b|\bnpx\b/i, 'Node.js 실행 경로', '설치·시작 절에서 Node.js 생태계의 실행 방법을 다룹니다. 사용하는 경로에 맞는 런타임과 패키지 실행 조건을 확인할 수 있습니다.'],
    [/\bGPU\b|\bCUDA\b/i, '연산 장치 관련 조건', '설치·시작 절에 GPU 또는 CUDA가 등장합니다. 필수 조건인지 선택 가능한 가속 경로인지 원문에서 구분해 확인해야 합니다.'],
    [/API[ -]?key|API[ -]?token|access token/i, '외부 서비스 인증', '설치·시작 절에서 API 인증값을 언급합니다. 어떤 서비스와 연결되는 경로인지 확인한 뒤 해당 서비스의 이용 조건을 검토할 수 있습니다.'],
    [/\bPostgreSQL\b|\bRedis\b/i, '별도 데이터 서비스', '설치·시작 절에 데이터 서비스가 등장합니다. 내장 실행과 외부 서비스 연결 중 어떤 구성을 사용하는지 확인할 항목입니다.']
  ]) {
    const document = environmentSections.find(d => match.test(d.text));
    if (document) conditions.push({ title, body, section: document.title, source });
    if (conditions.length === 3) break;
  }
  const category = profile?.category || '용도 분류 미확정';
  const paragraphs = [
    profile ? `${row.name}는 ${category} 분야의 프로젝트로 분류했습니다. ${profile.purpose} 관심을 둘 대상은 ${profile.audience}입니다.` : `${row.name}의 용도는 현재 규칙으로 확정하지 못했습니다. 아래에서는 README에서 탐지한 내용과 시작 경로를 정리하며, 확인되지 않은 기능은 설명에 추가하지 않습니다.`,
    findings.length ? `README에서 살펴볼 핵심 항목은 ${findings.map(f => f.title).join(', ')}입니다. 아래 해설은 이 항목들이 어떤 작업과 연결되는지를 정리한 것입니다. 문서에 용어가 등장한다는 사실을 출발점으로 삼으며, 개별 기능의 동작 여부와 품질은 직접 검증한 결과가 아닙니다.` : '문서에서 구체적인 기능을 자동으로 충분히 찾아내지 못했습니다. 지원 기능을 단정하는 설명을 늘리지 않고, 확인 가능한 시작 경로와 검토 기준을 제공합니다.'
  ];
  return {
    title: `${row.name} · 프로젝트 분석 노트`, paragraphs, findings, conditions,
    workflow: [
      { title: '적용할 작업 정하기', body: profile?.scenario || '공식 문서의 사용 예 중 현재 해결하려는 작업에 가까운 예를 먼저 선택하세요.' },
      { title: '문서의 시작 경로 선택하기', body: start ? `README의 “${start.heading}” 절이 시작 지점입니다.${start.steps.length ? ` 하위 항목으로 ${start.steps.join(', ')} 등이 있습니다.` : ''} 이 목록을 필수 실행 순서로 가정하지 말고, 자신의 도구와 환경에 맞는 경로를 선택해 전체 절차를 확인하세요.` : '시작 절을 자동으로 찾지 못했습니다. 저장소의 공식 README에서 설치 문서나 사용 예 링크를 찾아 실행 경로를 확인해야 합니다.' },
      { title: '작은 결과물로 적합성 판단하기', body: evaluation[category] || '입력과 기대 결과를 명확하게 정한 작은 예제로 확인하세요. 문서에 나오는 실행 경로가 현재 환경에서도 재현되는지를 기준으로 도입 범위를 판단할 수 있습니다.' }
    ],
    verdict: profile ? `${profile.audience}에게 검토할 만한 유형입니다. 다만 이 판단은 프로젝트의 인기도나 실제 성능을 보증하는 추천이 아니라 작업 유형에 따른 해석입니다. 위의 시작 경로와 결과 확인 기준을 자신의 작업에 대입해 적용 범위를 정하는 것이 좋습니다.` : '자동 분류 근거가 충분하지 않아 대상 사용자에 대한 추천은 보류했습니다. 원문에서 구체적인 입력·출력 예를 확인한 뒤 판단해 주세요.',
    coverage: { findings: findings.length, conditions: conditions.length, hasStart: Boolean(start) },
    limitations: 'README의 표현과 절 구조를 이용한 자동 정리입니다. 외부 연결 문서 전체를 읽거나 프로젝트를 실행한 검증은 포함하지 않습니다. 기능·조건의 언급이 현재 버전의 지원 또는 필수 요구사항이라는 뜻은 아닙니다.'
  };
}
