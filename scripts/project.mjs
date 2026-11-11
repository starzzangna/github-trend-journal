// 입력·출력의 역할이 드러난 문장과 사용 예만 해석합니다. 분야만 보고 빈칸을 채우지 않습니다.
// 배지·메뉴·홍보 공지와 짧은 표어를 해결 문제로 채택하지 않습니다.
function substantive(text, minLength = 25) {
  return text.length >= minLength && /[a-z가-힣\u4e00-\u9fff]/i.test(text)
    && !/https?:\/\/|\]\(|\[!|^\s*\||^\s*>?\s*(?:note:|\[!|November \d|\d{4}[:年])|most popular|star history|\b(?:Discord|Website)\s*[·|]/i.test(text);
}

const inputRules = [
  [/text.to.speech|텍스트를.*음성/i, '텍스트', '음성으로 변환할 텍스트를 입력으로 받는 흐름입니다.'],
  [/voice clon(?:ing|e).{0,90}(?:sample|recording|audio)|(?:sample|recording).{0,90}voice clon/i, '참고 음성', '음성 복제에 사용할 참고 녹음을 입력으로 다룹니다.'],
  [/(?:open|fetch|get|crawl|scrape|navigate|turn).{0,65}(?:https?:\/\/|pages?|websites?|urls?)|(?:Fetcher\.(?:get|fetch)|page\.goto)\(/i, '웹 페이지', '문서의 호출·탐색 예에서 웹 페이지 주소를 대상으로 작업을 시작합니다.'],
  [/accounts? by username|username.{0,70}(?:search|social)|(?:search|hunt).{0,70}username/i, '사용자 이름', '공개 계정을 찾기 위한 검색 기준으로 사용자 이름을 사용합니다.'],
  [/write HTML|(?:render|load|read).{0,50}HTML|HTML.{0,50}(?:input|source)/i, 'HTML 소스', 'HTML 소스를 작성하거나 읽어 처리하는 경로가 문서에 나옵니다.'],
  [/(?:import|use).{0,70}(?:typed React components|pre.built CSS)|(?:props|design tokens).{0,50}(?:input|accept|customiz)/i, '컴포넌트·스타일', 'React 컴포넌트나 CSS를 애플리케이션 코드에 연결하는 방식입니다.'],
  [/(?:load|import|drag and drop|read).{0,60}(?:your own models|model files|MJCF|URDF|XML)/i, '시뮬레이션 모델', '사용자가 준비한 모델 파일을 불러오는 경로가 있습니다.'],
  [/(?:from|ingest|read|extract|over).{0,60}(?:enterprise metadata|metadata|schemas|tabular data)|(?:natural.language|questions).{0,50}(?:query|SQL|structured data)/i, '데이터·질의', '메타데이터·스키마 또는 자연어 질문을 읽는 경로가 문서에 설명돼 있습니다.'],
  [/worktrees? (?:are )?addressed by branch name|(?:branch|worktree).{0,35}(?:name as input|as an argument)|wt switch .{0,50}(?:feat|branch)/i, '브랜치 지정', '브랜치 이름이나 작업 경로를 지정해 워크트리를 선택하는 흐름입니다.'],
  [/(?:import|read|load|accept).{0,55}(?:transactions|bank statements|CSV)/i, '가져올 기록', '거래 기록이나 CSV 자료를 가져오는 경로가 문서에 있습니다.'],
  [/(?:receive|accept|process).{0,45}(?:prompts|inference requests)|LLM\([^\n]*model|llm\.generate\(/i, '모델·추론 요청', '사용 예에서 모델을 지정하거나 추론 요청을 전달합니다.'],
  [/(?:load|read|decompile|analy[sz]e).{0,50}(?:binar|executab|program files|compiled code)/i, '분석 대상 파일', '실행 파일이나 바이너리를 분석 입력으로 다룹니다.'],
  [/folders of instructions.{0,100}(?:loads?|reads?)|(?:load|read|use).{0,45}(?:SKILL\.md|skill instructions)/i, '스킬 지침', '지침·스크립트·자료가 들어 있는 스킬을 읽어 작업에 적용합니다.'],
  [/(?:captures?|observations stream|records?).{0,70}(?:sessions?|prompt|agent)|(?:session|chat).{0,40}(?:logs?|observations)/i, '작업·세션 기록', '에이전트의 작업·세션 기록을 수집하는 흐름이 문서에 있습니다.'],
  [/describe a game|(?:game idea|one.page brief).{0,45}(?:input|from|describe)|say what you want/i, '게임 요구사항', '만들고 싶은 게임의 설명이나 요구사항을 전달합니다.'],
  [/text.to.cad|(?:text|prompt|describe).{0,45}(?:CAD|3D model|design)/i, '설계 요청', '텍스트나 설계 설명을 CAD 작업에 전달하는 흐름입니다.']
];

const outputRules = [
  [/text.to.speech|reference recording into speech|(?:generate|synthesi[sz]e|export).{0,55}(?:speech|audio)|텍스트를.*음성/i, '생성 음성', '텍스트나 음성 생성 작업의 결과로 음성을 다룹니다.'],
  [/(?:render|export|generat\w*).{0,50}(?:video|MP4)|영상.*(?:출력|렌더링)/i, '영상 결과물', '렌더링하거나 내보낸 영상이 문서에 설명된 결과물입니다.'],
  [/(?:read|return|snapshot|as).{0,50}(?:accessibility tree|interactive elements)|agent-browser snapshot/i, '페이지 구조', '페이지를 접근성 트리나 요소 참조를 가진 스냅샷으로 읽습니다.'],
  [/(?:export|extract|return|save|into).{0,70}(?:JSON|CSV|Markdown|structured data)|\.css\([^\n]+\.getall\(|page\.markdown\(/i, '추출 데이터', '문서의 추출·변환 경로에서 구조화된 데이터나 텍스트를 얻습니다.'],
  [/(?:ships|provides|includes).{0,50}(?:accessible components|UI components|templates)|(?:generate|scaffold).{0,45}(?:components|templates)/i, 'UI 구성 요소', '문서에서는 컴포넌트나 템플릿을 제공·생성하는 결과를 설명합니다.'],
  [/(?:generate|build|write|result is).{0,65}(?:ontolog|knowledge graphs?|semantic graph)|questions are translated to SQL/i, '그래프·질의', '온톨로지·지식 그래프를 구성하거나 질문을 SQL로 바꾸는 결과를 다룹니다.'],
  [/(?:creates?|created).{0,55}(?:branch|worktree)|(?:list|shows?).{0,35}worktrees/i, '작업 디렉터리·상태', '브랜치·워크트리를 만들거나 작업 상태 목록을 표시합니다.'],
  [/(?:simulation|simulate).{0,55}(?:trajector|motion|state)|(?:return|compute|produce).{0,40}(?:positions|velocities|trajector)/i, '시뮬레이션 결과', '시뮬레이션으로 계산된 상태·움직임을 결과로 다룹니다.'],
  [/(?:display|shows?|track|calculate).{0,55}(?:net worth|cashflow|cash flow|spending|budget)/i, '재무 현황', '순자산·현금 흐름·지출 등을 확인하는 결과가 문서에 나옵니다.'],
  [/(?:return|generat\w*|output).{0,50}(?:responses|completions|tokens)|output\.outputs\[|generated_text/i, '모델 응답', '추론 결과의 응답·생성 텍스트를 반환하는 흐름입니다.'],
  [/(?:decompil\w*).{0,50}(?:code|C-like|graphing|scripting)|(?:output|produce|recover).{0,50}(?:source code|pseudocode)/i, '복원된 코드 표현', '분석 결과로 코드 표현이나 의사코드를 살펴보는 흐름입니다.'],
  [/creating documents|document creation.*editing|(?:generate|create|produce).{0,50}(?:PDF|presentations|documents)/i, '문서 작업 결과', '문서에서 제시한 활용 예에는 문서 생성·편집 결과물이 포함됩니다.'],
  [/compact index of past observations|(?:inject|recall|retrieve).{0,65}(?:context|memories|observations)|context.{0,50}future sessions/i, '재사용할 문맥', '저장한 관측·기억을 검색하거나 다음 세션의 문맥으로 재사용합니다.'],
  [/builds? a playable browser game|(?:first build|generat\w*).{0,45}(?:browser game|game brief)/i, '게임 초안', '문서에서는 게임 설명을 바탕으로 플레이 가능한 브라우저 게임을 만드는 흐름을 설명합니다.'],
  [/hunt down social media accounts|(?:find|search for).{0,45}(?:social media accounts|profiles)/i, '공개 계정 정보', '검색 기준과 일치하는 공개 계정·프로필을 찾는 결과를 다룹니다.'],
  [/(?:generate|create|export).{0,45}(?:CAD|STEP|STL|3D models?)/i, 'CAD 모델', '생성하거나 내보낸 CAD 모델을 결과로 다룹니다.']
];

const conditionRules = [
  [/\bPython(?:\s*(?:>=|>|~|\^)?\s*\d+(?:\.\d+){0,2}\+?)?/i, 'Python'],
  [/\bReact\s*\d+(?:\.\d+){0,2}\+?/i, 'React'],
  [/\bNode(?:\.js)?(?:\s*(?:>=|>|~|\^)?\s*\d+(?:\.\d+){0,2}\+?)?/i, 'Node.js'],
  [/\bDocker(?:\s+(?:with\s+)?Compose(?:\s*v?\d+)?)?/i, '컨테이너 실행'],
  [/\bKubernetes\b|\bHelm\b/i, '클러스터 배포'],
  [/\b(?:GPU|CUDA|VRAM)\b/i, '연산 장치'],
  [/\bPostgreSQL\b|\bPostgres\b|\bRedis\b/i, '데이터 서비스'],
  [/API[ -]?(?:key|token)|access token|인증 키/i, '서비스 인증'],
  [/\b(?:Windows|macOS|Linux)\b/i, '운영체제별 실행 경로'],
  [/\b(?:Chrome for Testing|Chromium|browser binaries|system libraries)\b/i, '브라우저 실행 환경'],
  [/\bRuby\b|\bCargo\b|\bHomebrew\b|\bJDK\b|\bJava\s*\d+/i, '런타임·설치 도구'],
  [/\bClaude Code\b|\bCodex\b|\bCursor\b/i, '에이전트 클라이언트']
];

// 같은 단어라도 분야가 다르면 역할이 다릅니다. XML을 물리 모델로, CSV를 거래 내역으로 오인하지 않습니다.
const inputCategories = [
  ['음성 제작'], ['음성 제작'], ['웹 데이터 수집', '브라우저 자동화'], ['공개 계정 검색'],
  ['영상 제작'], ['디자인 시스템'], ['물리 시뮬레이션'], ['데이터 의미·지식 그래프'],
  ['Git 워크트리 관리'], ['개인 재무 관리'], ['언어 모델 추론·서빙'], ['역공학·프로그램 분석'],
  ['AI 에이전트 스킬', '디자인 에이전트 스킬'], ['AI 에이전트 메모리'], ['게임 개발 도구'], ['CAD·설계']
];
const outputCategories = [
  ['음성 제작'], ['영상 제작'], ['브라우저 자동화'], ['웹 데이터 수집'], ['디자인 시스템'],
  ['데이터 의미·지식 그래프'], ['Git 워크트리 관리'], ['물리 시뮬레이션'], ['개인 재무 관리'],
  ['언어 모델 추론·서빙'], ['역공학·프로그램 분석'],
  ['AI 에이전트 스킬', '디자인 에이전트 스킬'], ['AI 에이전트 메모리'], ['게임 개발 도구'], ['공개 계정 검색'], ['CAD·설계']
];

// 범용 키워드보다 실제 처리 방식·결과·제약을 우선합니다. 해설을 생성하지 않고 원문을 표시합니다.
const detailRules = [
  ['시장 데이터 분석', /analy[sz]e your watchlist daily|stock analysis system|自选股.*(?:分析|推送)/i, '관심 종목의 보고서 생성'],
  ['웹 개발 지침', /skills that embed web platform expertise|browser compatibility data/i, '웹 플랫폼 지침과 호환성'],
  ['코드 보안 점검', /scan repositories, selected paths|validate candidate findings|completed scan saves a report/i, '취약점 탐색·검토 보고서'],
  ['알고리즘 학습', /implementations are intended for learning purposes|less efficient than the Java standard library/i, 'Java 알고리즘 학습 구현'],
  ['전통 명반 계산', /charting engine|charting algorithm|knowledge base|紫微斗数.*排盘/i, '명반 계산과 지식 자료'],
  ['AI 에이전트 스킬', /audits any codebase and writes implementation plans|plan is the product/i, '코드 감사에서 구현 계획으로'],
  ['디자인 시스템', /(?:override|customiz).{0,100}(?:className|CSS|theme)|(?:theme|CSS).{0,100}overrides/i, '테마·스타일 변경 방식'],
  ['디자인 시스템', /swizzle.{0,100}(?:source|component)|(?:ejects|exported directly).{0,100}/i, '컴포넌트 소스 소유 범위'],
  ['브라우저 자동화', /(?:snapshot|Refs).{0,130}(?:ref|DOM|page)|(?:DOM change).{0,100}snapshot/i, '스냅샷 참조의 유효 범위'],
  ['브라우저 자동화', /click fails.{0,160}(?:hidden|disabled|covered)/i, '클릭 실패 조건'],
  ['웹 데이터 수집', /(?:CSS|XPath|selectors?).{0,100}(?:adapt|chang)|(?:adapt).{0,100}(?:elements|structure|website)/i, '페이지 변경 시 선택자 처리'],
  ['웹 데이터 수집', /(?:page|website).{0,130}(?:Markdown|corpus)|RAG.ready Markdown/i, '페이지의 Markdown 변환'],
  ['Git 워크트리 관리', /worktrees? are addressed by branch name/i, '브랜치와 작업 경로의 연결'],
  ['Git 워크트리 관리', /(?:hooks|post.start).{0,120}(?:setup|install|command)|(?:squash|rebase).{0,80}(?:merge|main)/i, '작업 시작·병합 자동화'],
  ['AI 에이전트 메모리', /(?:captures?|compress|inject|retriev).{0,140}(?:sessions?|observations|context)|(?:context|observations).{0,100}(?:inject|retriev)/i, '세션 기록의 저장·재사용 방식'],
  ['AI 에이전트 메모리', /(?:progressive disclosure|three.layer|3.layer|search.*timeline.*get)/i, '기억 조회의 단계'],
  ['AI 에이전트 스킬', /(?:SKILL\.md|self.contained).{0,130}(?:instructions|metadata|folder)|folders of instructions/i, '스킬의 구성과 로딩'],
  ['AI 에이전트 스킬', /(?:slash commands|quality gates|checklists|coverage.led|fresh verifier|findings\.json)/i, '작업 절차와 검토 산출물'],
  ['디자인 에이전트 스킬', /(?:theme|themes).{0,100}(?:deals|catalog|fifty|material)|(?:deals|offers).{0,80}themes/i, '테마 선택과 페이지 구성'],
  ['디자인 에이전트 스킬', /(?:sloplint|deterministic rules|audit checks|critique scores|PRODUCT\.md)/i, '검토 방식과 남기는 문서'],
  ['물리 시뮬레이션', /(?:runtime simulation|XML compiler|interactive visualization|physics.related quantities)/i, '모델 처리·시각화 방식'],
  ['개인 재무 관리', /(?:self.hosted|self hosted).{0,50}Docker|(?:accessed|access).{0,80}(?:browser|API)/i, '자체 호스팅과 접근 경로'],
  ['스마트홈 자동화', /(?:administrator access token|no access token to manage|no token or credential setup)/i, '설치 경로별 인증 차이'],
  ['스마트홈 자동화', /(?:automations?|entities|devices).{0,100}(?:create|control|manage|update)|(?:create|control|manage|update).{0,100}(?:automations?|entities|devices)/i, 'Home Assistant 조작 범위'],
  ['웹 애플리케이션 프레임워크', /renders all markup on the server|translates to JavaScript/i, '서버 렌더링과 브라우저 반응성'],
  ['웹 애플리케이션 프레임워크', /infer your route tree|components are copied into your project/i, '라우팅·컴포넌트 소유 방식'],
  ['데이터 의미·지식 그래프', /questions are translated to SQL|(?:ontology|semantic).{0,80}(?:Postgres|catalog)/i, '자연어 질의와 의미 계층'],
  ['데이터 의미·지식 그래프', /(?:metadata|definitions).{0,100}(?:reconcil|systems)|(?:reconcil).{0,80}definitions/i, '시스템 간 정의 조정'],
  ['AI 에이전트 운영', /(?:controls?|control).{0,100}agents on your machine|(?:installed|set up).{0,80}(?:computer|machine)/i, '기존 로컬 에이전트 제어'],
  ['컴퓨터 작업 자동화', /(?:bots run|each bot|every bot).{0,130}(?:CLI|local|computer|model)/i, '봇별 실행 환경'],
  ['AI 애플리케이션 예제', /(?:knowledge base|financial data|browser automation|computer use)/i, '예제별 작업 범위'],
  ['음성 제작', /(?:reference recording into speech|translate and dub|voice in words and generate)/i, '음성 생성·더빙의 변환 경로'],
  ['음성 제작', /(?:local models|download only the models|own hardware|Pro and Cloud are optional)/i, '로컬 모델과 선택 서비스'],
  ['영상 제작', /(?:HTML|CSS).{0,140}(?:MP4|video)|(?:compositions are HTML)/i, 'HTML 구성에서 영상으로 변환'],
  ['CAD·설계', /(?:models written as Python|model as a Python|STEP.{0,70}(?:STL|3MF|GLB))/i, '모델 작성 방식과 내보내기 형식'],
  ['CAD·설계', /(?:manufacturing checks|stress checks|CalculiX)/i, '제조·응력 검토 경로'],
  ['역공학·프로그램 분석', /(?:compiled code|processor instruction sets|executable formats)/i, '분석 대상과 지원 범위'],
  ['역공학·프로그램 분석', /(?:disassembly|decompilation).{0,80}(?:graphing|scripting)|(?:Java or Python)/i, '코드 분석과 확장 경로'],
  ['공개 계정 검색', /accounts found will be stored|individual text file/i, '계정 검색 결과의 저장 형식'],
  ['게임 개발 도구', /(?:one.page brief|playable browser game)/i, '게임 요구사항에서 초안까지'],
  ['플러그인 모음', /each plugin bundles|(?:plugins|plugin).{0,80}(?:connectors|slash commands)/i, '직무별 도구·지침 묶음']
];

export function explainFindings(context, profile, previous = []) {
  const result = [];
  const add = (title, id) => {
    const item = context.evidence.find(item => item.id === id);
    if (!item || result.some(claim => claim.evidenceIds.includes(id))) return;
    result.push({ title, body: `문서 설명: ${item.excerpt}`, kind: 'documented', evidenceIds: [id], ...(item.kind === 'example' ? { exampleOnly: true } : {}) });
  };
  for (const [category, pattern, title] of detailRules) {
    if (profile?.category !== category) continue;
    const id = context.select(pattern, { wholeParagraph: true, allowNegative: true, predicate: text => text.length >= 35 && !/\b(?:does not support|doesn't support|cannot generate|can't generate|not yet|not supported|unsupported|not implemented|planned|coming soon|not available yet)\b|미지원|구현 예정/i.test(text) });
    if (id) add(title, id);
    if (result.length === 3) break;
  }
  // 부수적인 MCP·플러그인 언급으로 본업의 설명을 채우지 않습니다.
  if (!profile) return result;
  for (const item of previous) {
    if (result.length >= 3) break;
    if (/MCP|플러그인|스킬|컨텍스트|토큰|시각 자료/.test(item.title)) continue;
    if (/여러 에이전트/.test(item.title) && !['AI 에이전트 운영', 'AI 에이전트 스킬', '컴퓨터 작업 자동화'].includes(profile.category)) continue;
    if (/영상 렌더링/.test(item.title) && profile.category !== '영상 제작') continue;
    add(item.title, item.evidenceIds[0]);
  }
  return result;
}

export function projectVerdict(project, findings) {
  const anchor = findings[0] || project.problem || project.inputs[0] || project.outputs[0];
  const missing = [!project.inputs.length && '입력', !project.outputs.length && '출력', !project.conditions.length && '도입 조건'].filter(Boolean);
  if (!anchor) return { text: '구체적인 동작을 뒷받침하는 문서 근거가 부족해 도입 판단을 보류했습니다.', evidenceIds: [] };
  const questions = {
    '관심 종목의 보고서 생성': '데이터 제공자·모델·알림 경로의 설정과 비용을 확인하세요. 이 보고서가 해당 도구의 투자 판단 정확성을 검증한 것은 아닙니다.',
    '웹 플랫폼 지침과 호환성': '대상 브라우저의 호환성과 현재 코드에 적용 가능한 지침인지 확인하세요.',
    '취약점 탐색·검토 보고서': '점검 대상 범위와 발견 항목의 근거를 확인하세요. 보고서만으로 모든 취약점이 제거됐다고 보장하지 않습니다.',
    'Java 알고리즘 학습 구현': '문서가 밝힌 학습용 범위를 확인하고 운영 코드에는 정확성·성능을 별도로 검증하세요.',
    '명반 계산과 지식 자료': '전통 규칙의 계산·자료 제공 범위입니다. 해석을 과학적으로 검증한 예측이나 중대한 의사결정의 근거로 취급하지 마세요.',
    '코드 감사에서 구현 계획으로': '계획 작성과 실행 위임을 구분하고 생성된 계획을 검토한 뒤 적용하세요.',
    '테마·스타일 변경 방식': '기존 CSS·테마를 유지하면서 필요한 부분만 바꿀 수 있는지 확인하세요.',
    '컴포넌트 소스 소유 범위': '컴포넌트 원본을 프로젝트 안에서 수정·유지할 필요가 있는지 검토하세요.',
    '스냅샷 참조의 유효 범위': '페이지가 바뀐 뒤 스냅샷을 다시 읽는 흐름을 자동화에 포함할 수 있는지 확인하세요.',
    '클릭 실패 조건': '가려짐·비활성 상태를 실패로 처리하고 화면을 다시 확인하는지 살펴보세요.',
    '페이지 변경 시 선택자 처리': '목표 사이트의 구조가 바뀌었을 때 선택자가 같은 데이터를 찾는지 비교하세요.',
    '페이지의 Markdown 변환': '추출한 Markdown에서 필요한 본문과 문서 구조가 유지되는지 확인하세요.',
    '브랜치와 작업 경로의 연결': '브랜치 이름으로 작업 디렉터리를 선택하는 방식이 현재 워크트리 운영에 맞는지 검토하세요.',
    '세션 기록의 저장·재사용 방식': '다음 세션에 전달할 기록과 제외할 정보를 구분할 수 있는지 확인하세요.',
    '스킬의 구성과 로딩': '필요한 작업의 SKILL.md와 부속 자료를 함께 가져와 적용할 수 있는지 확인하세요.',
    '작업 절차와 검토 산출물': '지침 설치 자체보다 단계별 검토 기록과 결과물이 남는지를 확인하세요.',
    '테마 선택과 페이지 구성': '테마 선택 외에 실제 방문자가 해야 할 행동을 페이지 구성에 반영하는지 검토하세요.',
    '검토 방식과 남기는 문서': '현재 UI의 한 영역을 대상으로 검토 결과와 수정 기준이 구체적으로 남는지 확인하세요.',
    '모델 처리·시각화 방식': '준비한 모델을 읽고 관찰할 수 있는지 확인한 뒤 필요한 물리량 계산 범위를 대조하세요.',
    '자체 호스팅과 접근 경로': '자체 호스팅을 운영할 환경과 접속 클라이언트를 먼저 정하세요. 재무 데이터의 입출력은 별도 확인이 필요합니다.',
    '설치 경로별 인증 차이': '선택한 설치 경로의 인증 요구를 확인하고 다른 경로의 토큰 조건과 섞지 마세요.',
    '서버 렌더링과 브라우저 반응성': '화면의 어떤 동작이 서버를 다시 호출하고 어떤 동작이 브라우저에서 갱신되는지 확인하세요.',
    '자연어 질의와 의미 계층': '같은 질문이 올바른 데이터 정의와 SQL에 연결되는지 검토하세요. 질의 생성이 수치 정확성 보증은 아닙니다.',
    '기존 로컬 에이전트 제어': '새 모델 서비스 도입보다 현재 설치·인증된 에이전트를 제어하는 경로가 필요한지 확인하세요.',
    '예제별 작업 범위': '지원 상담·데이터 분석 등 목적에 맞는 개별 예제를 선택하고 해당 예제의 추가 요구사항을 확인하세요.',
    '음성 생성·더빙의 변환 경로': '참고 녹음 기반 음성 생성과 영상 더빙 중 필요한 경로를 선택해 결과를 비교하세요.',
    'HTML 구성에서 영상으로 변환': '기존 HTML·미디어 구성을 영상 파일로 만드는 경로가 제작 방식에 맞는지 확인하세요.',
    '모델 작성 방식과 내보내기 형식': 'Python 모델을 수정하는 흐름과 필요한 CAD 파일 형식을 함께 확인하세요.',
    '분석 대상과 지원 범위': '분석할 실행 파일 형식·프로세서와 필요한 분석 기능이 문서 범위에 포함되는지 대조하세요.',
    '계정 검색 결과의 저장 형식': '사용자 이름별 텍스트 결과를 후속 작업에서 처리할 수 있는지 확인하세요.',
    '게임 요구사항에서 초안까지': '게임 설명이 브리프와 브라우저 초안에 어떻게 반영되는지 작은 범위로 확인하세요.',
    '직무별 도구·지침 묶음': '직무에 맞는 플러그인을 고르고 연결 도구·데이터와 사내 작업 절차를 함께 검토하세요.'
  };
  return {
    text: `${questions[anchor.title] || `${anchor.title}에 관한 원문 범위를 현재 작업과 대조하세요. 지원 기능이나 실행 결과를 추가로 단정하지 않았습니다.`}${missing.length ? ` 추가 확인: ${missing.join('·')}.` : ''}`,
    evidenceIds: anchor.evidenceIds
  };
}

export function explainProject(row, context, profile) {
  const lookup = id => context.evidence.find(item => item.id === id);
  const claim = (title, body, id, extra = {}) => ({ title, body, kind: 'interpretation', evidenceIds: [id], ...extra });
  const explicit = (role, pattern) => {
    const candidates = context.documents.filter(document => pattern.test(document.title) && (role !== '해결 문제' || !document.exampleOnly));
    const id = context.select(/\S+/, { candidates, includeExamples: true, wholeParagraph: true, allowNegative: role === '해결 문제', predicate: text => role !== '해결 문제' || substantive(text, 25) });
    return id ? claim(role, `문서가 명시한 ${role}: ${lookup(id).excerpt}`, id, { kind: 'documented', exampleOnly: lookup(id).kind === 'example' }) : null;
  };
  const introduction = context.introduction || context.documents.filter(document => document.text.trim()).slice(0, 5);
  const problemId = profile && context.select(profile.pattern, { candidates: introduction, wholeParagraph: true, predicate: text => substantive(text) });
  const problem = explicit('해결 문제', /^(?:why|problem|motivation|purpose|해결.*문제|목적)(?:\b|\s|$)/i)
    || (problemId ? claim('해결 문제', `문서에서 설명한 목적: ${lookup(problemId).excerpt}`, problemId, { kind: 'documented' }) : null);
  function roles(role, heading, rules, categories) {
    const direct = explicit(role, heading);
    if (direct) return [direct];
    const matched = rules.flatMap(([pattern, title, body], index) => {
      if (!categories[index].includes(profile?.category)) return [];
      const id = context.select(pattern, { includeExamples: true });
      return id ? [claim(title, `${body} 원문: “${lookup(id).excerpt}”`, id, { exampleOnly: lookup(id).kind === 'example' })] : [];
    });
    const extra = [
      ['입력', ['시장 데이터 분석'], /(?:analy[sz]e your watchlist|watchlist daily|stock codes|自选股|股票代码)/i, '관심 종목', '분석할 관심 종목을 지정합니다.'],
      ['출력', ['시장 데이터 분석'], /(?:generate a decision dashboard|push to Telegram|analysis report|决策仪表盘)/i, '분석 대시보드', '수집 자료로 분석 대시보드나 보고서를 생성·전달합니다.'],
      ['입력', ['코드 보안 점검', 'AI 에이전트 스킬'], /(?:scan repositories|audits any codebase|maps the repo|scan code)/i, '검토할 코드', '저장소나 선택한 코드 범위를 검토 대상으로 지정합니다.'],
      ['출력', ['코드 보안 점검'], /(?:saves a report and findings|export SARIF, JSON|return the saved report|structured output.*findings)/i, '취약점 보고서', '점검 보고서와 발견 항목을 저장하거나 내보냅니다.'],
      ['출력', ['AI 에이전트 스킬'], /(?:writes implementation plans|plans.*plain markdown|plans land in)/i, '구현 계획', '다른 에이전트가 검토·실행할 구현 계획을 문서로 작성합니다.'],
      ['입력', ['웹 개발 지침'], /(?:scan a codebase for legacy patterns|modern-web-guidance.*(?:search|scan|retrieve))/i, '코드·검색 요청', '검토할 코드나 필요한 웹 개발 지침의 검색어를 전달합니다.'],
      ['출력', ['웹 개발 지침'], /(?:search for relevant guides|retrieve a guide by ID|skills that embed web platform expertise)/i, '웹 개발 가이드', '웹 플랫폼 지침과 호환성 정보를 찾아 제공합니다.'],
      ['입력', ['전통 명반 계산'], /(?:birth.{0,45}(?:date|time)|出生.{0,30}(?:时间|日期))/i, '출생 정보', '전통 명반 계산에 사용할 출생 정보를 전달합니다.'],
      ['출력', ['전통 명반 계산'], /(?:charting engine|charting algorithm|chart.*JSON|命盘)/i, '전통 명반', '전통 규칙에 따른 명반이나 관련 해석 자료를 제공합니다.'],
      ['출력', ['알고리즘 학습'], /(?:algorithms.*implemented in Java|implementations.*learning purposes)/i, '학습용 Java 구현', '학습용 알고리즘 구현을 제공합니다.']
    ].flatMap(([kind, categories, pattern, title, body]) => {
      if (role !== kind || !categories.includes(profile?.category)) return [];
      const id = context.select(pattern, { includeExamples: true, headings: true });
      return id ? [claim(title, body, id, { exampleOnly: lookup(id).kind === 'example' })] : [];
    });
    return [...matched, ...extra].slice(0, 3);
  }
  // 설치 하위 절은 부모의 범위를 상속합니다. 지원 목록이나 성능 소개를 필수 조건으로 취급하지 않습니다.
  const conditionDocuments = context.documents.filter(document => !document.exampleOnly && /install|setup|quick.?start|getting started|requirement|prerequis|hosting|deploy|platform|environment|설치|환경|요구|배포|安装|配置|部署|运行|要求/i.test(document.scope));
  const conditions = conditionRules.flatMap(([pattern, title]) => {
    const id = context.select(pattern, { candidates: conditionDocuments, allowNegative: true });
    if (!id) return [];
    const item = lookup(id);
    const document = conditionDocuments.find(document => document.sourceId === item.sourceId && document.title === item.section && document.line === item.line);
    const text = item.excerpt;
    const term = text.match(pattern)?.[0] || '';
    const clause = text.split(/[,;]|\band\b/i).find(part => part.includes(term)) || text;
    const localScope = `${clause} ${document.scope}`;
    const scope = /(?:no|without).{0,35}(?:GPU|CUDA|API.key|Docker)|\bnot required\b|필수가 아/i.test(localScope) ? 'not-required'
      : /optional|optionally|alternatively|can also|if you|선택|대안/i.test(localScope) ? 'optional'
      : /\brequires?\b|\bmust\b|\byou need\b|필수|필요합니다/i.test(text) || /requirement|prerequis|요구사항|필수/i.test(document.scope) ? 'required' : 'mentioned';
    const label = { required: '이 문서 경로의 요구사항', optional: '선택 가능한 경로', 'not-required': '필수가 아닌 조건', mentioned: '이 문서 경로의 언급' }[scope];
    return [claim(title, `${label}: ${text}`, id, { kind: 'documented', scope, path: document.scope })];
  }).slice(0, 6);
  return {
    problem,
    inputs: roles('입력', /^(?:inputs?|입력)(?:\b|\s|$)/i, inputRules, inputCategories),
    outputs: roles('출력', /^(?:outputs?|출력|결과)(?:\b|\s|$)/i, outputRules, outputCategories),
    conditions,
    limitations: '문서 문장과 사용 예에서 확인한 범위입니다. 사용 예는 실행 검증이 아니며, 미확인 항목은 분류만으로 추정하지 않았습니다.'
  };
}
