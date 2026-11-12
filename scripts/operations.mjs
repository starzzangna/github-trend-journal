// 공식 문서의 명령과 스킬 지시는 실행하지 않습니다. 처리 흐름·자료 형태의 근거만 읽습니다.
const claim = (title, body, pattern, path, exampleOnly = false) => ({ title, body, pattern, path, exampleOnly });
const unsupported = /\b(?:not supported|does not support|unsupported|planned|coming soon|not yet implemented)\b/i;
const definitions = {
  'meta/astryx': {
    core: [claim('기존 CSS로 컴포넌트 스타일 변경', 'StyleX로 작성된 내부 스타일을 소비자가 채택할 필요 없이 className으로 Tailwind·CSS modules·일반 CSS를 덮어씁니다.', /No styling lock-in.*StyleX.*className.*Tailwind.*CSS modules.*plain CSS/i)],
    inputs: [claim('미리 빌드된 CSS와 타입이 있는 React 컴포넌트', '애플리케이션에서 미리 빌드된 CSS를 가져오고 타입이 있는 React 컴포넌트를 사용합니다. 이 사용 경로에는 별도 빌드 플러그인이나 스타일 라이브러리 도입이 필요 없다고 설명합니다.', /import pre-built CSS and use typed React components.*no build plugin.*no styling library/i)],
    outputs: [claim('테마·다크 모드·템플릿을 포함한 UI 구성', '접근성 컴포넌트, 브랜드 수준 테마, 다크 모드와 바로 사용할 템플릿을 CLI와 함께 제공하는 구성입니다.', /ships.*accessible components.*brand-level theming.*dark mode.*templates.*CLI/i)]
  },
  'ZhuLinsen/daily_stock_analysis': {
    core: [claim('여러 시장의 관심 종목을 분석해 알림으로 전달', 'A주·홍콩·미국·일본·한국·대만 관심 종목을 매일 분석하고 결정 대시보드를 기업용 메신저·Telegram·Discord·Slack·이메일로 전달하는 흐름입니다.', /A股\/港股\/美股\/日股\/韩股\/台股.*每日自动分析.*决策仪表盘.*Telegram\/Discord\/Slack\/邮箱/)],
    inputs: [claim('시장별 관심 종목 목록', '분석 대상으로 A주·홍콩·미국·일본·한국·대만의 관심 종목을 지정하는 경로입니다. 모든 시장 자료를 동시에 입력해야 한다는 뜻은 아닙니다.', /A股\/港股\/美股\/日股\/韩股\/台股自选股/)],
    outputs: [claim('메신저·이메일로 전달되는 결정 대시보드', '매일 생성한 결정 대시보드를 기업위챗·Feishu·Telegram·Discord·Slack·이메일로 전달합니다. 이는 문서의 전달 경로이며 투자 수익을 검증한 결과가 아닙니다.', /每日自动分析并推送.*决策仪表盘.*Telegram\/Discord\/Slack\/邮箱/)]
  },
  'GoogleChrome/modern-web-guidance-src': {
    core: [claim('로컬 검색 뒤 가이드 본문을 에이전트에 제공', 'search는 오프라인 임베딩과 BM25로 질의에 맞는 가이드를 찾습니다. 검색 단계에는 네트워크 호출이나 API 키가 필요 없다고 설명합니다.', /Local Semantic Search.*offline.*embedding model and BM25.*no network calls, no API keys/i)],
    inputs: [claim('웹 플랫폼 질문을 담은 검색 질의', 'modern-web-guidance search에 질의를 전달하면 해당 질문과 맞는 가이드를 찾는 경로입니다.', /Local Semantic Search: The agent runs modern-web-guidance search.*matches the query to the best guide/i)],
    outputs: [claim('retrieve로 가져오는 코드 패턴·주의점·대체 구현', 'retrieve로 가이드를 가져와 해당 API의 코드 패턴·주의점·대체 구현을 에이전트의 문맥에 넣습니다. 검색 결과 목록과 가이드 본문 조회를 구분합니다.', /Guide Fetch.*retrieves the guide via modern-web-guidance retrieve.*code patterns, gotchas, and fallbacks/i)]
  },
  'shadcn/improve': {
    core: [claim('선택한 발견 사항을 의존 관계가 있는 계획 파일로 변환', '선택한 발견 사항마다 plans/에 파일을 쓰고 색인·우선순위·의존 관계를 함께 정리합니다. 감사 결과를 곧바로 소스 수정으로 처리하는 흐름과 구분됩니다.', /Plan\. One file per selected finding.*plans\/.*index, priority order, and dependency graph/i)],
    inputs: [claim('감사할 코드베이스', '감사 대상은 코드베이스입니다. 코드 검토 결과를 다른 에이전트가 실행할 계획으로 만드는 흐름이며, 계획 단계에서 선택하는 발견 사항과 구분됩니다.', /An agent skill that audits any codebase and writes implementation plans for other agents to execute/i), claim('계획으로 만들 발견 사항', '계획 단계에서는 감사 결과 중 선택한 발견 사항을 대상으로 파일을 작성합니다. 감사할 저장소를 고르는 단계와 발견 사항을 실행 계획으로 만드는 단계를 구분합니다.', /Plan\. One file per selected finding.*plans\//i)],
    outputs: [claim('plans/의 개별 계획 파일과 권장 순서 색인', 'plans/ 아래에 계획을 하나씩 저장하고 권장 실행 순서를 담은 색인을 만듭니다. 파일을 읽고 검토한 뒤 실행자에게 인계하는 산출물입니다.', /Plans land in plans\/.*one file each, plus an index with the recommended order/i)]
  },
  'addyosmani/agent-skills': {
    core: [claim('build auto의 작업별 테스트와 커밋', '대표 /build auto 경로는 승인한 계획의 각 작업을 테스트하며 개별 커밋하고, 실패나 위험 단계에서 멈춥니다. 이 구현 흐름을 모든 스킬의 공통 출력으로 합치지 않습니다.', /build auto.*approve the plan once.*test-driven and committed individually.*pauses on failures or risky steps/i)]
  },
  'vercel-labs/agent-browser': {
    core: [claim('스냅샷 참조로 조작하고 페이지를 다시 확인', '스냅샷(snapshot)으로 페이지를 짧은 텍스트와 @e1 같은 요소 참조로 읽습니다. 참조로 동작을 실행한 뒤 페이지를 다시 읽어 결과를 확인하며 브라우저는 명령 사이에도 열려 있습니다.', /snapshot returns.*compact text.*@e1.*reads the page again.*browser stays open between commands/i)],
    inputs: [claim('현재 스냅샷의 요소 참조', '동작 명령에는 snapshot이 부여한 @e1 같은 요소 참조를 사용합니다. URL로 페이지를 여는 단계 이후에 페이지 내부 요소를 대상으로 조작하는 입력입니다.', /snapshot returns.*ref such as @e1.*acts on a ref/i)],
    outputs: [claim('짧은 페이지 텍스트와 요소별 참조', 'snapshot 결과는 각 요소에 참조를 붙인 짧은 페이지 텍스트입니다. 조작 후에는 다시 읽어 변경 결과를 확인합니다.', /snapshot returns the page as compact text with a ref such as @e1 for each element/i)]
  },
  'we-promise/sure': {
    core: [claim('은행 동기화·CSV 자료를 다루는 재무 앱', 'Docker 가이드의 일상 사용 범위는 소규모 은행 동기화·CSV 가져오기와 대시보드·거래·예산·보고서입니다. 외부 AI 비서 연결은 이 일반 사용 범위와 별도로 안내하는 경로입니다.', [/Small bank syncs and CSV imports/i, /everyday use \(dashboard, transactions, budgets, reports\)/i], 'docs/hosting/docker.md'), claim('재무 데이터에 접근하는 외부 비서 연결', '외부 비서 경로는 원격 AI 에이전트에 대화를 위임하고, 에이전트가 Sure의 /mcp로 계좌·거래·대차대조표를 조회하는 방식입니다. Sure 자체의 일반 사용 흐름과 별도의 선택 경로입니다.', /external assistant delegates chat to a remote AI agent.*\/mcp.*accounts, transactions, balance sheet/i, 'docs/hosting/docker.md')],
    inputs: [claim('소규모 은행 동기화·CSV 가져오기', 'Docker 호스팅 가이드가 설명하는 사용 범위에는 소규모 은행 동기화와 CSV 가져오기가 포함됩니다. 이 근거만으로 CSV 열 구성이나 모든 은행의 호환성을 단정하지 않습니다.', /Small bank syncs and CSV imports/i, 'docs/hosting/docker.md')],
    outputs: [claim('일상 사용의 대시보드·거래·예산·보고서', 'Docker 가이드는 초기 설정 뒤 일상 사용으로 대시보드·거래·예산·보고서를 안내합니다. 보고서의 파일 내보내기 형식까지 확인한 설명은 아닙니다.', /everyday use \(dashboard, transactions, budgets, reports\)/i, 'docs/hosting/docker.md')]
  },
  'homeassistant-ai/ha-mcp': {
    core: [claim('자연어 요청에 따라 자동화·대시보드 수정', '공식 사용 예는 현관등의 일몰 자동화 생성, Lovelace 날씨 카드 추가, 실행 추적을 통한 자동화 오류 진단을 구분해 보여 줍니다.', /porch light at sunset.*Lovelace dashboard.*execution traces/i)],
    inputs: [claim('현관등을 일몰에 켜 달라는 요청 예', '클라이언트에서 “일몰에 현관등을 켜는 자동화를 만들어 달라”고 요청하는 사용 예입니다. 모든 자연어 요청을 임의로 처리한다는 보장은 아닙니다.', /Create an automation that turns on the porch light at sunset/i, undefined, true)],
    outputs: [claim('트리거·동작이 포함된 자동화 예', '해당 사용 예의 결과는 적절한 트리거와 동작을 가진 자동화 생성입니다. 날씨 카드 요청은 Lovelace 대시보드 변경으로 이어지는 별도 예입니다.', /Creates the automation with proper triggers and actions.*Updates your Lovelace dashboard/i, undefined, true)]
  },
  'openai/codex-security': {
    core: [claim('전체 저장소·선택 경로·Git 변경의 보안 스캔', '전체 저장소, 선택한 경로 또는 Git 변경을 스캔합니다. Deep 스캔은 Standard 스캔을 반복하고 중복을 제거한 발견 사항을 반환합니다.', /Scan repositories, selected paths, or Git changes.*Deep scans repeat Standard scans.*deduplicated findings/i)],
    inputs: [claim('저장소·선택 경로·Git 변경', '스캔 대상을 저장소 전체, 지정 경로 또는 Git 변경으로 선택합니다. 단일 파일 형식만을 입력으로 받는 분석기와 구분됩니다.', /Scan repositories, selected paths, or Git changes/i)],
    outputs: [claim('발견 사항의 추적과 SARIF·JSON·CSV 내보내기', '완료 스캔의 발견 사항을 SARIF·JSON·CSV로 내보내거나 Linear·Jira·GitHub에서 추적하는 경로를 제공합니다.', /Track findings in Linear, Jira, or GitHub.*export SARIF, JSON, and CSV/i)]
  },
  'TheAlgorithms/Java': {
    core: [claim('학습용 알고리즘 구현과 표준 라이브러리의 구분', 'Java 알고리즘 구현을 학습 목적으로 제공하며 표준 라이브러리보다 비효율적일 수 있다고 설명합니다. 항목별 호출과 결과는 공통 계약으로 합치지 않고 대표 사용 예에서 따로 설명합니다.', /implementations are intended for learning purposes.*less efficient than the Java standard library/i)]
  },
  'NVIDIA/auto-ontology': {
    core: [claim('생성한 SQL을 데이터베이스에 검사해 보정', '질의 과정에서 필터 값과 SQL을 실제 데이터베이스에 대조하고 검사 실패 시 SQL을 고칩니다. SQL 문자열 생성만으로 끝나는 흐름과 구분됩니다.', /Checks the filter values and the query against the database, repairing the SQL when a check fails/i)],
    inputs: [claim('의도와 대상 항목을 추출할 자연어 질문', '질문의 의도를 분류하고 질문에 등장한 항목을 추출하는 질의 단계의 입력입니다. 뒤의 SQL 생성·데이터베이스 검사와 구분됩니다.', /Classifies the intent and extracts the entities the question names/i)],
    outputs: [claim('답변과 실행 SQL·처리 단계', '질의를 실행한 뒤 답변과 함께 사용한 SQL 및 처리 단계를 반환합니다. 답변 텍스트만 제공하는 결과와 구분됩니다.', /Runs the query and returns the answer with its SQL and the steps it took/i)]
  },
  'thedotmack/claude-mem': {
    core: [claim('도구 호출을 로컬 worker로 전달해 관측 기록 작성', '호스트 hook이 읽기·편집·실행 등의 도구 호출을 작은 로컬 worker로 전달합니다. 이 수집 단계와 별도 observer가 관측 기록을 작성하는 단계는 구분됩니다.', [/Hooks in your agent hand each tool call.*local worker/i, /second agent turns that activity into short observations/i])],
    inputs: [claim('hook으로 수집하는 읽기·편집·실행 기록', '에이전트 hook이 도구 호출의 읽기·편집·실행 활동을 worker로 넘기는 경로입니다. 호스트에 hook이 없는 경우까지 같은 수집을 보장하지 않습니다.', /Hooks in your agent hand each tool call \(what it reads, edits and runs\).*local worker/i)],
    outputs: [claim('짧은 관측 기록과 세션 종료 요약', '별도 observer가 수집 활동을 짧은 관측 기록으로 만들고 세션이 끝날 때 요약을 씁니다. 전체 대화를 그대로 출력하는 설명과 구분됩니다.', /second agent turns that activity into short observations, and writes a summary when the session ends/i)]
  },
  'max-sixty/worktrunk': {
    core: [claim('브랜치 이름으로 worktree 경로 계산', 'worktree를 브랜치 이름으로 지정하면 설정 가능한 템플릿으로 경로를 계산합니다. 브랜치를 받는 명령에는 이미 checkout된 worktree 경로도 전달할 수 있습니다.', /Worktrees are addressed by branch name.*paths are computed from a configurable template.*also accept the path/i)],
    inputs: [claim('브랜치 이름 또는 checkout된 worktree 경로', '브랜치를 인수로 받는 명령은 브랜치 이름 대신 해당 브랜치가 checkout된 worktree 경로도 받습니다.', /Commands that take a branch also accept the path of the worktree it is checked out in/i)],
    outputs: [claim('템플릿으로 계산한 작업 경로', '지정한 브랜치의 작업 디렉터리 경로를 설정 템플릿으로 계산합니다. 이 근거가 모든 명령의 출력 형식을 JSON 등으로 정한다는 뜻은 아닙니다.', /Worktrees are addressed by branch name; paths are computed from a configurable template/i)]
  },
  'anthropics/skills': {
    core: [claim('작업에 맞춰 지침·스크립트·자원을 동적으로 로드', 'Claude가 특정 작업을 수행할 때 지침·스크립트·자원 폴더를 동적으로 읽는 구성입니다. 문서 작업과 데이터 분석 등의 작업 조건은 개별 스킬에 속합니다.', /Skills are folders of instructions, scripts, and resources that Claude loads dynamically.*creating documents.*analyzing data/i)]
  },
  'Donchitos/Claude-Code-Game-Studios': {
    core: [claim('질문과 한 페이지 brief에서 플레이 가능한 게임으로', '게임 설명을 받은 Claude Code가 몇 가지 질문을 하고 한 페이지 brief를 작성한 뒤, 이를 바탕으로 브라우저에서 플레이 가능한 첫 게임을 만듭니다.', /Describe a game\. Claude Code asks a few questions, writes a one-page brief, and builds a playable browser game/i)],
    inputs: [claim('질문으로 구체화하는 게임 설명', '만들 게임을 설명하면 Claude Code가 추가 질문으로 요구사항을 구체화하는 입력 경로입니다. 완성된 게임 설계 문서를 반드시 먼저 전달하는 계약은 아닙니다.', /Describe a game\. Claude Code asks a few questions, writes a one-page brief/i)],
    outputs: [claim('한 페이지 brief와 첫 브라우저 게임', '한 페이지 brief를 작성하고 그 brief로 플레이 가능한 브라우저 게임을 만듭니다. 완성 제품이나 스토어 배포까지를 보장하는 결과는 아닙니다.', /writes a one-page brief, and builds a playable browser game from it/i)]
  },
  'milind-soni/OpenMausBot': {
    core: [claim('기존 로그인으로 로컬 에이전트 CLI 실행', '봇이 로컬 claude·codex·grok CLI를 기존 로그인·구독으로 실행합니다. 설정의 Engines에서는 별도 CLI 바이너리나 wrapper를 지정하는 경로도 안내합니다.', /Bots run on the claude, codex, and grok CLIs.*existing logins and subscriptions.*custom CLI binary/i)],
    inputs: [claim('검토 후 가져오는 팀 구성 Markdown', 'Teams → Import에서 로컬 .md 파일이나 공개 GitHub URL을 가져올 수 있습니다. 앱은 봇·채널 등을 생성하기 전에 검토 화면을 표시합니다.', /app opens a review screen before creating the bots.*import the same \.md file from disk or paste its public GitHub URL/i)],
    outputs: [claim('department 구성의 공유 파일', 'Share department는 봇의 지침·이미지·스킬, 그룹 채팅·루틴·공유 지침 등을 하나의 파일로 저장합니다. 대화 이력·키·비밀번호는 포함하지 않는다고 설명합니다.', /save the whole department as one file.*Chat history, keys and passwords.*never go in/i)]
  },
  'pingdotgg/t3code': {
    core: [claim('외부 에이전트가 MCP로 프로젝트·스레드 작업', 'T3가 직접 시작하지 않은 에이전트도 MCP 서버로 프로젝트·스레드를 읽고 스레드를 시작하거나 메시지를 보낼 수 있습니다. 로그인한 에이전트마다 사용자가 허용 범위를 고릅니다.', /Agents that T3 Code did not start.*MCP server.*read projects and threads, start and message threads.*choose what it may do/i, 'docs/user/outside-agents.md')],
    inputs: [claim('허용 권한 안에서 스레드 시작·메시지 요청', '외부 에이전트가 한 번 로그인한 뒤, 사용자가 허용한 범위에서 MCP로 스레드 시작·메시지 전송을 요청하는 경로입니다.', /Agents that T3 Code did not start.*start and message threads.*Each agent signs in once.*choose what it may do/i, 'docs/user/outside-agents.md')],
    outputs: [claim('읽기 전용 연결의 프로젝트·스레드·모델 목록', 'Read only 권한에서는 프로젝트·스레드와 사용 가능한 provider·model을 읽으며 변경은 할 수 없습니다. 쓰기 작업이 가능한 연결과 결과 범위를 구분합니다.', /Read only lets the agent read projects and threads.*available providers and models.*cannot change anything/i, 'docs/user/outside-agents.md')]
  },
  'Nutlope/hallmark': {
    core: [claim('세 가지 테마 제안 뒤 브라우저에서 결과 검사', '카탈로그에서 세 가지 테마를 제시하고 방문자가 하려는 일에 맞춰 페이지를 구성한 뒤 실제 브라우저에서 검사합니다. 마지막에는 새 문맥의 검토자가 판단합니다.', /deals three themes.*visitor came to do.*real browser.*fresh-context reviewer gets the last word/i)],
    inputs: [claim('참조할 실제 제품 URL·개발 서버·앱', '실제 제품의 URL, 개발 서버 또는 앱을 지정하면 스크린샷을 직접 수집하는 경로입니다. 페이지 생성 요구사항과 시각적 참조를 구분해 전달할 수 있습니다.', /Your real product\. Point it at a URL, a dev server or an app and it captures the screenshots itself/i)],
    outputs: [claim('선택 근거를 CSS 주석에 남긴 독립 HTML·CSS', '페이지마다 독립적인 HTML·CSS를 만들고 첫 CSS 주석에 설계 결정을 기록합니다. 이미지 목업만 반환하는 결과가 아닙니다.', /Each page is self-contained HTML and CSS, stamped in its first CSS comment with the decisions it took/i)]
  },
  'Renhuai123/ziwei-doushu': {
    core: [claim('출생지·진태양시 기준으로 날짜 경계 보정', '공식 영문 문서는 출생지를 지정하면 진태양시를 사용해 늦은 자시의 날짜 경계를 판단하고, 출생지가 없으면 해당 보정을 하지 않는다고 설명합니다.', /late Zi hour day change now uses true solar time.*without a birthplace there is no correction/i)],
    inputs: [claim('v3 샘플 데이터의 출생 필드', 'v3 샘플 데이터의 birthInfo에는 연·월·일, 성별, 경도가 있고 hour는 0~23시가 아닌 시진 순서 0~11입니다. 이 필드 설명을 현재 엔진의 모든 호출 형식과 동일시하지 않습니다.', /birthInfo\.year.*birthInfo\.hour.*0–11.*0–23.*birthInfo\.gender.*birthInfo\.longitude/)],
    outputs: [claim('v3 데이터셋의 명반 JSON과 주제별 해석', 'v3 데이터셋은 명반 JSON과 13개 주제의 해석 텍스트를 담습니다. 문서는 이후 온라인 엔진의 출력과 이 데이터셋이 달라질 수 있다고 명시합니다.', /命盘 JSON \+ 13 主题解读文本.*v3.*线上引擎.*可能有差异/)]
  },
  'D4Vinci/Scrapling': {
    core: [claim('CSS·XPath 추출과 적응형 요소 추적', 'CSS·XPath·텍스트·정규식으로 대상을 찾고 적응형 요소 추적·유사 요소 매칭과 Markdown 출력을 제공합니다. 단순 URL 다운로드와 구분되는 파싱 흐름입니다.', /Parse & extract: CSS, XPath, text and regex search, adaptive element tracking, similar-element matching, and clean Markdown output/i)],
    inputs: [claim('정적·JavaScript 페이지와 페이지 뒤의 API', '정적 페이지를 수집하거나 JavaScript를 렌더링하고 웹사이트와 상호작용한 뒤 뒤쪽 API 호출에서 데이터를 추출하는 경로를 제공합니다.', /Scrape static pages, render JavaScript, interact with websites, and extract data from the API calls behind them/i)],
    outputs: [claim('spider의 JSON·JSONL·CSV·XML 내보내기', 'spider 수집 결과를 JSON·JSONL·CSV·XML로 내보내는 경로입니다. 페이지 본문을 Markdown으로 만드는 파싱 경로와 구분됩니다.', /Crawl & export:.*JSON\/JSONL\/CSV\/XML exports/i)]
  },
  'cloudflare/security-audit-skill': {
    core: [claim('확정·추가 검증·기각 기록을 구조화한 보안 감사', '발견 사항을 confirmed·needs_validation·rejected로 나눠 findings.json에 기록하고 report-schema.json으로 검사합니다. 의심되는 사항을 모두 확정 취약점으로 취급하지 않습니다.', /write confirmed, needsvalidation, and rejected records to findings\.json.*report-schema\.json/i)],
    inputs: [claim('지정한 코드베이스의 보안 감사 요청', '에이전트를 감사할 코드베이스에서 시작하거나 해당 코드베이스를 가리킨 뒤 보안 감사를 요청하는 사용 경로입니다.', /Start your coding agent in \(or pointed at\) the codebase you want to audit/i)],
    outputs: [claim('검증 기록에서 생성하는 세 가지 보고서', '검증된 기록과 coverage ledger를 바탕으로 REPORT.md·FINDINGS-DETAIL.md·NEEDS-VALIDATION.md를 만듭니다. 확정 사항과 추가 검증 대상을 별도 산출물로 유지합니다.', /derive REPORT\.md, FINDINGS-DETAIL\.md, and NEEDS-VALIDATION\.md from the verified records and coverage ledger/i)]
  },
  'heygen-com/hyperframes': {
    core: [claim('Chrome에서 프레임을 탐색하고 FFmpeg로 인코딩', '브라우저에서 미리 본 HTML 구성을 headless Chrome이 프레임별로 탐색하고 FFmpeg가 영상으로 인코딩합니다. 같은 입력으로 같은 영상을 만드는 렌더링 경로라고 설명합니다.', /renderer seeks each frame in headless Chrome and encodes the result with FFmpeg.*same input produces the same video/i)],
    inputs: [claim('타이밍·트랙을 붙인 HTML과 탐색 가능한 애니메이션', 'HTML에 타이밍·트랙 data 속성을 붙입니다. GSAP·CSS·Lottie·Three.js·Anime.js·WAAPI 또는 별도 frame adapter로 탐색 가능한 애니메이션을 구성합니다.', /Define a video as HTML.*data attributes for timing and tracks.*GSAP, CSS, Lottie, Three\.js, Anime\.js, WAAPI.*seekable animation/i)],
    outputs: [claim('HTML·CSS·미디어 구성으로 만든 MP4', 'HTML·CSS·미디어와 탐색 가능한 애니메이션을 MP4 영상으로 변환합니다. 인터랙티브 슬라이드 같은 다른 스킬의 결과와 구분되는 영상 렌더링 경로입니다.', /turning HTML, CSS, media, and seekable animations into deterministic MP4 videos/i)]
  },
  'anthropics/knowledge-work-plugins': {
    core: [claim('직무별 스킬·MCP 연결·명령을 회사 흐름에 맞게 구성', '직무별 플러그인이 스킬·connector·slash command·sub-agent를 묶습니다. 회사 도구·용어·절차에 맞게 수정하는 구성이고, PRD 작성과 영업 상담 정리는 아래 대표 예에서 따로 설명합니다.', /Each plugin bundles the skills, connectors, slash commands, and sub-agents.*your tools, your terminology, your processes/i)]
  },
  'debpalash/VoiceStudio': {
    core: [claim('참고 녹음의 목소리로 음성 생성', '깨끗한 참고 녹음을 익숙한 목소리의 음성으로 바꾸는 voice cloning 경로입니다. 영상 번역·더빙과 구분해 제공하는 기능입니다.', /Voice cloning Turn a clean reference recording into speech in a familiar voice/i), claim('원본 타이밍을 유지하는 영상 더빙', '영상 더빙은 번역한 음성을 원본 영상의 타이밍에 맞추는 별도의 작업 경로입니다.', /Video dubbing Translate and dub videos with speech timed to the original/i)],
    inputs: [claim('voice cloning용 깨끗한 참고 녹음', '목소리 복제 경로에는 깨끗한 참고 녹음을 사용합니다. 이 근거만으로 허용 파일 형식이나 최소 길이를 정하지 않습니다.', /Voice cloning Turn a clean reference recording into speech in a familiar voice/i), claim('번역·더빙할 원본 영상', '영상 더빙 경로의 대상은 번역·더빙할 영상입니다. 참고 녹음 하나로 영상 더빙까지 수행한다는 설명이 아닙니다.', /Video dubbing Translate and dub videos with speech timed to the original/i)],
    outputs: [claim('참고 녹음의 목소리를 반영한 음성', 'voice cloning 경로는 깨끗한 참고 녹음에서 해당 목소리의 음성을 만듭니다. 문서의 이 설명만으로 결과 파일 확장자를 정하지 않습니다.', /Voice cloning Turn a clean reference recording into speech in a familiar voice/i), claim('원본 영상 타이밍에 맞춘 번역·더빙 음성', '영상 더빙 경로는 영상을 번역하고 원본 영상의 타이밍에 맞는 음성을 만듭니다. 참고 녹음으로 만드는 voice cloning과 다른 사용 경로입니다.', /Video dubbing Translate and dub videos with speech timed to the original/i)]
  },
  'pbakaus/impeccable': {
    core: [claim('critique 점수와 audit 수정 우선순위', 'critique는 사용성 기준으로 디자인을 평가하고 수정 순위를 매깁니다. audit는 접근성·성능·테마·반응형 문제를 P0부터 P3까지 나누는 별도 검사입니다.', /critique scores the design against usability heuristics.*audit checks accessibility, performance, theming, and responsive behavior.*P0.*P3/i)]
  },
  'earthtojake/text-to-cad': {
    core: [claim('부품·조립체 요청을 Python 모델과 CAD 뷰어로 연결', '에이전트에 부품이나 조립체를 요청하면 Python 스크립트로 모델을 작성하고 실행해 CAD 뷰어에 표시합니다.', /ask your agent for a part or an assembly.*writes the model as a Python script, runs it to build the model and shows it in the CAD viewer/i)],
    inputs: [claim('에이전트에 전달할 부품·조립체 요청', '만들 부품이나 조립체를 에이전트에 설명하는 모델 작성 요청입니다.', /ask your agent for a part or an assembly.*writes the model as a Python script/i)],
    outputs: [claim('STEP·GLB·STL·3MF 형식의 3D 모델', '로컬 워크플로에서 3D 모델을 STEP·GLB·STL·3MF 파일로 생성합니다. 형상 생성과 제조 가능성 검사·외부 제조 서비스 연결은 각각 구분되는 작업입니다.', /generate 3D models as STEP, GLB, STL or 3MF files, check them for manufacturing/i)]
  },
  'NationalSecurityAgency/ghidra': {
    core: [claim('컴파일된 프로그램의 디스어셈블·디컴파일 분석', '컴파일된 프로그램을 분석하는 프레임워크로 디스어셈블·어셈블·디컴파일·그래프·스크립팅 기능을 제공합니다. 특정 프로세서나 실행 형식의 지원 여부는 별도로 대조해야 합니다.', /Capabilities include disassembly, assembly, decompilation, graphing, and scripting/i)],
    inputs: [claim('플랫폼별 컴파일된 프로그램', 'Windows·macOS·Linux 등에서 컴파일된 프로그램을 분석 대상으로 삼습니다. 원본 소스가 필수 입력이라는 설명은 아닙니다.', /analyze compiled code on a variety of platforms including Windows, macOS, and Linux/i)],
    outputs: [claim('기계 명령·디컴파일·그래프 분석 표현', '디스어셈블·디컴파일·그래프 기능으로 프로그램을 살펴보는 결과를 제공합니다. 완전한 원본 소스 복원이나 특정 파일 내보내기 형식을 보장하는 설명은 아닙니다.', /Capabilities include disassembly, assembly, decompilation, graphing, and scripting/i)]
  }
};

export function applyDocumentedOperations(row, context, usage) {
  const definition = definitions[row.name];
  if (!definition) return;
  for (const [field, rules] of Object.entries(definition)) {
    const claims = rules.flatMap((rule, index) => {
      const candidates = context.documents.filter(doc => !doc.exampleOnly && context.sources.some(source => source.id === doc.sourceId && (rule.path ? source.path === rule.path : /^README(?:\.[\w-]+)?\.md$/i.test(source.path))));
      const patterns = Array.isArray(rule.pattern) ? rule.pattern : [rule.pattern];
      const ids = patterns.map(pattern => context.select(pattern, { candidates, allowNegative: true, wholeParagraph: true, predicate: text => !unsupported.test(text) }));
      if (ids.some((id, index) => !id || !patterns[index].test(context.evidence.find(e => e.id === id).excerpt))) return [];
      return [{ id: `detail:${field}:${index}`, title: rule.title, body: rule.body, kind: 'interpretation', ...(rule.exampleOnly ? { exampleOnly: true } : {}), evidenceIds: [...new Set(ids)] }];
    });
    if (field === 'core') usage.article.findings = claims;
    else usage.article.project[field] = claims;
  }
}

export function validateDocumentedOperations(usage) {
  if (usage.version < 17 || usage.status !== 'ready') return;
  const definition = definitions[usage.sources[0]?.repository];
  if (!definition) return;
  for (const [field, rules] of Object.entries(definition)) {
    const claims = field === 'core' ? usage.article.findings : usage.article.project[field];
    if (!Array.isArray(claims) || new Set(claims.map(c => c.id)).size !== claims.length) throw Error('핵심 동작·입출력 목록 오류');
    for (const item of claims) {
      const index = rules.findIndex((_, index) => item.id === `detail:${field}:${index}`);
      const rule = rules[index];
      const evidence = (item.evidenceIds || []).map(id => usage.evidence.find(e => e.id === id));
      const patterns = rule && (Array.isArray(rule.pattern) ? rule.pattern : [rule.pattern]);
      if (!rule || item.title !== rule.title || item.body !== rule.body || item.kind !== 'interpretation' || Boolean(item.exampleOnly) !== rule.exampleOnly || !evidence.length || evidence.some(e => !e || e.kind !== 'prose' || unsupported.test(e.excerpt) || !usage.sources.some(source => source.id === e.sourceId && source.repository === usage.sources[0].repository && (rule.path ? source.path === rule.path : /^README(?:\.[\w-]+)?\.md$/i.test(source.path)))) || patterns.some(pattern => !evidence.some(e => pattern.test(e.excerpt)))) throw Error('핵심 동작·입출력 설명과 근거 불일치');
    }
  }
}
