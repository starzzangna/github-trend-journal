const originalProfiles = [
  { pattern: /code review tool|automated code review|코드 리뷰/i, category: '코드 리뷰', purpose: '코드 변경에서 검토할 부분을 찾고 리뷰하는 작업을 돕는 도구 유형입니다.', audience: '변경 코드의 품질과 오류 가능성을 검토하는 개발자', scenario: '작은 변경분 하나를 대상으로 리뷰 결과를 받아 보고, 지적 위치와 수정 필요성을 직접 확인하는 흐름에 활용할 수 있습니다.' },
  { pattern: /agent memory|memory system.*agents?|에이전트 메모리/i, category: 'AI 에이전트 메모리', purpose: '에이전트가 작업 중 얻은 정보를 저장하고 이후 작업에서 다시 활용하도록 돕는 도구 유형입니다.', audience: '세션을 넘겨 정보를 재사용하는 AI 서비스를 만드는 개발자', scenario: '샘플 정보를 저장한 뒤 새 작업에서 관련 정보를 찾아오는 과정을 확인하고 기억 품질을 비교할 수 있습니다.' },
  { pattern: /sandboxing.*agents?|runtime for.*agents?|sandboxed agents|에이전트 샌드박스/i, category: 'AI 에이전트 실행 환경', purpose: '에이전트와 도구를 분리된 실행 환경에서 구동하는 데 사용하는 도구 유형입니다.', audience: 'AI 도구 실행 환경과 인프라를 관리하는 개발자', scenario: '간단한 도구 작업을 격리된 환경에서 실행하고 파일·네트워크 접근 설정과 작업 종료 흐름을 확인해 볼 수 있습니다.' },
  { pattern: /cuts? .*tokens|token.*(?:reduc|compress|sav)|토큰 절감/i, category: 'AI 토큰 사용 최적화', purpose: 'AI 작업에서 주고받는 표현이나 입력 방식을 바꿔 토큰 사용량을 줄이는 도구 유형입니다.', audience: 'AI 작업의 토큰 사용량과 응답 품질을 함께 관리하려는 사용자', scenario: '같은 작업에 적용 전후의 토큰 사용량과 결과 정확도를 기록해 절감 효과를 비교할 수 있습니다.' },
  { pattern: /voice clon(?:ing|e)|text.to.speech|speech synthesis|음성 복제/i, category: '음성 제작', purpose: '텍스트나 음성 자료를 음성 콘텐츠로 만드는 작업에 사용하는 도구 유형입니다.', audience: '음성 콘텐츠 제작자·오디오 기능 개발자', scenario: '짧은 샘플로 음성 생성 품질을 비교한 뒤 내레이션 제작 흐름에 적용해 볼 수 있습니다.' },
  { pattern: /reverse.engineer|decompil|역공학/i, category: '역공학·프로그램 분석', purpose: '프로그램의 내부 구조와 실행 동작을 조사하는 도구 유형입니다.', audience: '프로그램 동작을 분석하거나 기존 구현을 이해하려는 개발자', scenario: '분석할 프로그램과 궁금한 기능을 정하고, 관련 코드나 실행 동작을 추적하는 작업에 활용할 수 있습니다.' },
  { pattern: /text.to.cad|\bCAD\b|computer.aided design/i, category: 'CAD·설계', purpose: '설계 도면이나 CAD 모델을 만드는 작업을 돕는 도구 유형입니다.', audience: '설계 자동화와 모델 생성을 실험하는 개발자·설계자', scenario: '간단한 부품 요구사항을 입력으로 삼아 모델 생성 흐름을 확인하고, 결과의 치수와 형상을 검토해 볼 수 있습니다.' },
  { pattern: /render video|video generat|video edit|영상 생성/i, category: '영상 제작', purpose: '영상 콘텐츠를 구성하거나 렌더링하는 작업에 사용하는 도구 유형입니다.', audience: '영상 제작 자동화를 구현하려는 개발자·제작자', scenario: '짧은 영상 한 편을 샘플로 구성한 뒤 렌더링 결과와 반복 제작 과정을 확인해 볼 수 있습니다.' },
  { pattern: /diagram design|diagramming|다이어그램/i, category: '다이어그램 제작', purpose: '정보의 관계나 구조를 다이어그램으로 표현하는 도구 유형입니다.', audience: '구조 설명 자료를 만드는 개발자·기획자', scenario: '시스템 구성이나 작업 흐름 하나를 골라 그림으로 표현하고 문서에 활용해 볼 수 있습니다.' },
  { pattern: /context.compress|context window optimi|上下文压缩|컨텍스트 압축/i, category: 'AI 컨텍스트 관리', purpose: 'AI 작업 중 전달하는 문맥의 크기와 유지 방식을 관리하는 도구 유형입니다.', audience: '긴 AI 코딩 세션이나 많은 도구 출력을 다루는 개발자', scenario: '같은 작업을 적용 전후로 수행해 문맥 사용량과 이전 정보 유지 여부를 비교해 볼 수 있습니다.' },
  { pattern: /gym.*tracker|workout.*track|fitness.*track/i, category: '운동 기록', purpose: '운동 계획과 수행 기록을 관리하는 애플리케이션 유형입니다.', audience: '운동 기록을 직접 관리하려는 사용자', scenario: '운동 루틴 하나와 수행 기록을 입력하고 기록 조회 흐름을 확인해 볼 수 있습니다.' },
  { pattern: /executables porting|port.*(?:linux and windows|ps5)/i, category: '실행 파일 이식', purpose: '실행 파일을 다른 실행 환경으로 옮기는 작업을 다루는 도구 유형입니다.', audience: '플랫폼 호환성과 실행 환경을 연구하는 개발자', scenario: '지원하는 입력 형식과 대상 플랫폼을 먼저 확인한 뒤 작은 예제로 변환·실행 과정을 검토할 수 있습니다.' },
  { pattern: /plugins? (?:directory|for claude code)|directory of.*plugins|marketplace.*plugins|each plugin bundles|plugins that turn Claude|플러그인 모음/i, category: '플러그인 모음', purpose: '기존 도구에 추가할 플러그인을 찾아 설치하는 데 사용하는 프로젝트 유형입니다.', audience: '지원 도구의 기능을 확장하려는 사용자', scenario: '현재 사용하는 도구와 호환되는 플러그인 하나를 골라 설치하고 실제 작업에서 기능을 확인해 볼 수 있습니다.' },
  { pattern: /agentic skills|agent skill|skills.*(?:engineer|claude|codex)|skills library|스킬 모음/i, category: 'AI 에이전트 스킬', purpose: 'AI 에이전트가 특정 작업을 수행할 때 참고할 절차와 기능을 제공하는 프로젝트 유형입니다.', audience: 'AI 코딩·연구 에이전트를 사용하는 개발자·연구자', scenario: '필요한 작업에 맞는 스킬 하나를 선택하고, 지원 에이전트에 연결해 작은 작업으로 적용 여부를 확인할 수 있습니다.' },
  { pattern: /agent harness|agent.*orchestrat|coordinate.*(?:agent|workflow)|manage agents|team of AI bots|bots run on|multi.agent/i, category: 'AI 에이전트 운영', purpose: 'AI 에이전트의 실행과 작업 흐름을 관리하는 도구 유형입니다.', audience: '여러 AI 작업을 연결하거나 관리하는 개발자', scenario: '작업 하나의 입력·실행·결과 확인 흐름을 구성한 뒤 여러 작업으로 확장해 볼 수 있습니다.' }
];


// 세부 용도를 먼저 판별해 에이전트·MCP의 부수적 언급으로 주제가 바뀌지 않게 합니다.
const expandedProfiles = [
  [/design system|디자인 시스템/i, '디자인 시스템', '재사용 가능한 UI 컴포넌트와 테마를 애플리케이션에 적용하는 프로젝트입니다.', 'UI를 구현하는 개발자·디자이너'],
  [/physics (?:engine|simulator|simulation)|물리 (?:엔진|시뮬)/i, '물리 시뮬레이션', '물체·관절·접촉 등의 물리 동작을 시뮬레이션하는 프로젝트입니다.', '로봇·시뮬레이션 개발자·연구자'],
  [/personal finance|wealth management|가계부|개인 재무/i, '개인 재무 관리', '개인 재무 정보를 관리하는 애플리케이션입니다.', '재무 관리 도구를 검토하는 사용자'],
  [/browser automation|브라우저 자동화/i, '브라우저 자동화', '브라우저에서 페이지를 읽고 조작하는 작업을 자동화합니다.', '웹 작업을 자동화하는 개발자'],
  [/web scrap(?:ing|er)|web crawl(?:ing|er)|scraping framework|웹 (?:스크래핑|크롤링)/i, '웹 데이터 수집', '웹 페이지에서 필요한 데이터를 읽고 추출하는 프로젝트입니다.', '웹 데이터 수집을 구현하는 개발자'],
  [/semantic (?:catalog|graph|layer)|enterprise ontolog|knowledge graph|지식 그래프/i, '데이터 의미·지식 그래프', '데이터의 의미와 관계를 정리해 검색·질의에 연결하는 프로젝트입니다.', '데이터·검색 시스템 개발자'],
  [/git worktree|worktree management|워크트리/i, 'Git 워크트리 관리', 'Git 작업 디렉터리와 브랜치를 관리하는 도구입니다.', '여러 코드 작업을 병행하는 개발자'],
  [/home assistant|home automation|스마트홈/i, '스마트홈 자동화', '스마트홈의 장치 설정과 자동화를 연결하는 프로젝트입니다.', '홈 자동화 사용자·개발자'],
  [/accounts? by username|social media accounts|username.*social networks/i, '공개 계정 검색', '사용자 이름을 기준으로 공개 소셜 계정을 탐색하는 도구입니다.', '공개 계정 정보를 조사하는 사용자'],
  [/framework for building web apps|web application framework|full.stack.*framework|웹 프레임워크/i, '웹 애플리케이션 프레임워크', '웹 애플리케이션을 구성하는 개발 기반을 제공합니다.', '웹 애플리케이션 개발자'],
  [/LLM inference|inference and serving|LLM serving|대규모 언어 모델.*서빙/i, '언어 모델 추론·서빙', '언어 모델을 실행하고 추론 요청을 처리하는 프로젝트입니다.', '모델 서비스·인프라 개발자'],
  [/backend.as.a.service|firebase alternative|Postgres.*(?:authentication|storage)|백엔드 플랫폼/i, '백엔드 플랫폼', '데이터베이스·인증 등 애플리케이션의 백엔드 기능을 구성합니다.', '백엔드 기능을 구축하는 개발자'],
  [/node.based.*(?:generative|diffusion)|diffusion.*(?:GUI|workflow)|visual.*(?:diffusion|generative AI)/i, '생성형 AI 워크플로', '생성형 모델 작업을 시각적인 흐름으로 구성하는 프로젝트입니다.', '생성형 콘텐츠 도구 개발자·사용자'],
  [/customer relationship management|open.source CRM|客户关系|고객 관계 관리/i, '고객 관계 관리', '고객·영업 관련 정보를 관리하는 애플리케이션입니다.', '고객 관리 도구를 검토하는 사용자'],
  [/time.series (?:forecast|prediction)|시계열 예측/i, '시계열 예측', '시간 순서가 있는 데이터를 이용해 예측 작업을 수행합니다.', '시계열 모델 개발자·분석가'],
  [/game dev(?:elopment)? studio|game development.*agents|builds? a playable browser game|describe a game|게임 개발/i, '게임 개발 도구', '게임 제작 작업과 개발 절차를 지원하는 프로젝트입니다.', '게임 개발자'],
  [/computer.use|desktop automation|virtual machine.*bots|bots.*virtual machine/i, '컴퓨터 작업 자동화', '컴퓨터 환경에서 작업을 수행하는 자동화 도구입니다.', '컴퓨터 작업 자동화 개발자'],
  [/design skill|design vocabulary|design language|design.*skills? for|디자인 스킬/i, '디자인 에이전트 스킬', '에이전트의 UI 설계·검토 작업을 돕는 지침을 제공합니다.', 'AI로 UI를 제작·검토하는 사용자'],
  [/persistent context across sessions|captures.*sessions.*compress|coding agent forgets.*sessions|persistent memory plugin|에이전트.*지속 메모리/i, 'AI 에이전트 메모리', '에이전트 작업 정보를 저장해 다음 세션에서 다시 활용합니다.', '세션 간 문맥을 관리하는 개발자'],
  [/deployable applications using.*Claude API|quickstarts.*Claude|Claude.*quickstarts/i, 'AI 애플리케이션 예제', 'AI API를 사용하는 애플리케이션의 시작 예제를 제공합니다.', 'AI 애플리케이션 개발자']
].map(([pattern, category, purpose, audience]) => ({ pattern, category, purpose, audience, scenario: '문서에 설명된 입력과 출력이 자신의 작업에 맞는지 작은 예제로 확인하세요.' }));

export function classifyProject(row, context) {
  const introduction = context.documents.filter(d => d.text.trim()).slice(0, 5);
  const candidates = [...expandedProfiles, ...originalProfiles].map((profile, index) => {
    const id = context.find(profile.pattern, introduction);
    return { profile, id, score: (profile.pattern.test(row.description || '') ? 10 : 0) - index / 100 };
  }).filter(item => item.id).sort((a, b) => b.score - a.score);
  const selected = candidates[0];
  return selected ? {
    profile: selected.profile,
    classification: { kind: 'interpretation', evidenceIds: [selected.id], basis: 'README 도입부의 용도 표현을 확인하고 저장소 설명은 후보 우선순위에만 사용했습니다.' }
  } : { profile: null, classification: { kind: 'interpretation', evidenceIds: [], basis: 'README에서 용도를 뒷받침할 표현을 찾지 못했습니다.' } };
}
