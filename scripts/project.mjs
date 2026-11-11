// 입력·출력의 역할이 드러난 문장과 사용 예만 해석합니다. 분야만 보고 빈칸을 채우지 않습니다.
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
  [/(?:load|read|decompile|analy[sz]e).{0,50}(?:binar|executab|program files)/i, '분석 대상 파일', '실행 파일이나 바이너리를 분석 입력으로 다룹니다.'],
  [/folders of instructions.{0,100}(?:loads?|reads?)|(?:load|read|use).{0,45}(?:SKILL\.md|skill instructions)/i, '스킬 지침', '지침·스크립트·자료가 들어 있는 스킬을 읽어 작업에 적용합니다.'],
  [/(?:captures?|observations stream|records?).{0,70}(?:sessions?|prompt|agent)|(?:session|chat).{0,40}(?:logs?|observations)/i, '작업·세션 기록', '에이전트의 작업·세션 기록을 수집하는 흐름이 문서에 있습니다.'],
  [/describe a game|(?:game idea|one.page brief).{0,45}(?:input|from|describe)|say what you want/i, '게임 요구사항', '만들고 싶은 게임의 설명이나 요구사항을 전달합니다.'],
  [/text.to.cad|(?:text|prompt|describe).{0,45}(?:CAD|3D model|design)/i, '설계 요청', '텍스트나 설계 설명을 CAD 작업에 전달하는 흐름입니다.']
];

const outputRules = [
  [/text.to.speech|(?:generate|synthesi[sz]e|export).{0,55}(?:speech|audio)|텍스트를.*음성/i, '생성 음성', '텍스트나 음성 생성 작업의 결과로 음성을 다룹니다.'],
  [/(?:render|export|generat\w*).{0,50}(?:video|MP4)|영상.*(?:출력|렌더링)/i, '영상 결과물', '렌더링하거나 내보낸 영상이 문서에 설명된 결과물입니다.'],
  [/(?:read|return|snapshot|as).{0,50}(?:accessibility tree|interactive elements)|agent-browser snapshot/i, '페이지 구조', '페이지를 접근성 트리나 요소 참조를 가진 스냅샷으로 읽습니다.'],
  [/(?:export|extract|return|save|into).{0,70}(?:JSON|CSV|Markdown|structured data)|\.css\([^\n]+\.getall\(|page\.markdown\(/i, '추출 데이터', '문서의 추출·변환 경로에서 구조화된 데이터나 텍스트를 얻습니다.'],
  [/(?:ships|provides|includes).{0,50}(?:accessible components|UI components|templates)|(?:generate|scaffold).{0,45}(?:components|templates)/i, 'UI 구성 요소', '문서에서는 컴포넌트나 템플릿을 제공·생성하는 결과를 설명합니다.'],
  [/(?:generate|build|write|result is).{0,65}(?:ontolog|knowledge graphs?|semantic graph)|questions are translated to SQL/i, '그래프·질의', '온톨로지·지식 그래프를 구성하거나 질문을 SQL로 바꾸는 결과를 다룹니다.'],
  [/(?:creates?|created).{0,55}(?:branch|worktree)|(?:list|shows?).{0,35}worktrees/i, '작업 디렉터리·상태', '브랜치·워크트리를 만들거나 작업 상태 목록을 표시합니다.'],
  [/(?:simulation|simulate).{0,55}(?:trajector|motion|state)|(?:return|compute|produce).{0,40}(?:positions|velocities|trajector)/i, '시뮬레이션 결과', '시뮬레이션으로 계산된 상태·움직임을 결과로 다룹니다.'],
  [/(?:display|shows?|track|calculate).{0,55}(?:net worth|cashflow|cash flow|spending|budget)/i, '재무 현황', '순자산·현금 흐름·지출 등을 확인하는 결과가 문서에 나옵니다.'],
  [/(?:return|generat\w*|output).{0,50}(?:responses|completions|tokens)|output\.outputs\[|generated_text/i, '모델 응답', '추론 결과의 응답·생성 텍스트를 반환하는 흐름입니다.'],
  [/(?:decompil\w*).{0,50}(?:code|C-like)|(?:output|produce|recover).{0,50}(?:source code|pseudocode)/i, '복원된 코드 표현', '분석 결과로 코드 표현이나 의사코드를 살펴보는 흐름입니다.'],
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

export function explainProject(row, context, profile) {
  const lookup = id => context.evidence.find(item => item.id === id);
  const claim = (title, body, id, extra = {}) => ({ title, body, kind: 'interpretation', evidenceIds: [id], ...extra });
  const explicit = (role, pattern) => {
    const candidates = context.documents.filter(document => pattern.test(document.title));
    const id = context.select(/\S+/, { candidates, includeExamples: true, allowNegative: role === '해결 문제' });
    return id ? claim(role, `문서가 명시한 ${role}: ${lookup(id).excerpt}`, id, { kind: 'documented', exampleOnly: lookup(id).kind === 'example' }) : null;
  };
  const introduction = context.documents.filter(document => document.text.trim()).slice(0, 5);
  const problemId = profile && context.select(profile.pattern, { candidates: introduction });
  const problem = explicit('해결 문제', /^(?:why|problem|motivation|purpose|해결.*문제|목적)(?:\b|\s|$)/i)
    || (problemId ? claim('해결 문제', `문서에서 설명한 목적: ${lookup(problemId).excerpt}`, problemId, { kind: 'documented' }) : null);
  function roles(role, heading, rules, categories) {
    const direct = explicit(role, heading);
    if (direct) return [direct];
    return rules.flatMap(([pattern, title, body], index) => {
      if (!categories[index].includes(profile?.category)) return [];
      const id = context.select(pattern, { includeExamples: true });
      return id ? [claim(title, body, id, { exampleOnly: lookup(id).kind === 'example' })] : [];
    }).slice(0, 3);
  }
  // 설치 하위 절은 부모의 범위를 상속합니다. 지원 목록이나 성능 소개를 필수 조건으로 취급하지 않습니다.
  const conditionDocuments = context.documents.filter(document => /install|setup|quick.?start|getting started|requirement|prerequis|hosting|deploy|platform|environment|설치|환경|요구|배포/i.test(document.scope));
  const conditions = conditionRules.flatMap(([pattern, title]) => {
    const id = context.select(pattern, { candidates: conditionDocuments, allowNegative: true });
    if (!id) return [];
    const item = lookup(id);
    const document = conditionDocuments.find(document => document.title === item.section && document.line === item.line);
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
