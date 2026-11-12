// 공식 문서는 분석 자료입니다. 스킬의 지시나 설치·검증 명령을 실행하지 않습니다.
// 저장소와 원문 표현이 함께 일치한 경우에만 고정된 한국어 설명을 제공합니다.
const rules = {
  'meta/astryx': [
    ['react', 'React 버전과 구성 요소 범위', 'core의 peer dependency는 react·react-dom이며 React 19 이상이 필요합니다. 기존 React 버전과 맞는지 먼저 확인해야 합니다.', /Astryx requires React 19 or later/],
    ['canary', '실험 패키지와 안정 릴리스 구분', 'lab은 npm에 배포되지 않습니다. vega·charts는 @canary로만 배포되고 안정 릴리스가 없으므로 core와 같은 안정성을 전제하지 마세요.', /lab.*not published to npm.*vega.*charts.*canary.*no stable release/i]
  ],
  'ZhuLinsen/daily_stock_analysis': [
    ['feeds', '무료 시세원의 실패와 대체 경로', '기본 무료 시세원은 별도 설정 없이 쓸 수 있지만 상위 서비스의 제한·인터페이스 변경·네트워크에 따라 불안정할 수 있습니다. 장기 예약·일괄 분석은 Tushare·Longbridge 같은 토큰 기반 경로를 별도로 설정하도록 안내합니다.', /免费源受上游限流.*稳定性不保证.*Tushare.*Longbridge/],
    ['research', '분석 결과의 사용 범위', '문서는 학습·연구용이며 투자 조언이 아니라고 명시합니다. 자동으로 전달된 보고서를 투자 판단의 검증 결과로 취급하지 마세요.', /仅供学习和研究使用.*不构成任何投资建议/]
  ],
  'GoogleChrome/modern-web-guidance-src': [
    ['fallback', '신기능의 대체 동작을 구분', '추측 미리 읽기 같은 부가 기능은 구형 브라우저가 무시해도 되지만 대화상자 제어·네트워크 비콘 같은 핵심 동작은 별도 대체 경로가 필요하다고 설명합니다. 같은 호환성 전략을 모든 API에 적용하지 마세요.', /additive enhancements.*older browsers.*critical behaviors.*dialog controls.*network beacons/i]
  ],
  'shadcn/improve': [
    ['host', '설치 호환성과 자동 실행 위임은 별개', 'Agent Skills 호환 호스트라도 자동 execute에는 격리 worktree의 별도 실행자를 만들 수 있는 기능이 필요합니다. 지원하지 않는 호스트는 작성한 계획을 수동 실행자에게 인계하는 경로입니다.', /Requires a host agent that can spawn subagents in an isolated worktree.*manual execution/i, 'skills/improve/SKILL.md'],
    ['merge', '계획 작성자가 소스를 고치거나 병합하지 않음', '스킬은 소스를 직접 수정하지 않고 plans/에 계획을 씁니다. 구현은 일회용 worktree에서 진행하며 최종 병합은 사용자가 판단하는 흐름입니다.', /Never modifies source code itself.*plans\/.*disposable worktrees.*merging is always yours/i]
  ],
  'addyosmani/agent-skills': [
    ['auto', 'build auto의 승인 범위와 중단 조건', '/build auto는 계획을 한 번 승인한 뒤 작업 사이의 수동 승인을 줄이는 경로입니다. 각 작업의 테스트·개별 커밋은 유지하며 실패나 위험 단계에서는 멈추므로 무조건 끝까지 진행하는 모드로 이해하지 마세요.', /build auto.*approve the plan once.*test-driven.*committed individually.*pauses on failures or risky steps/i]
  ],
  'vercel-labs/agent-browser': [
    ['deps', 'Linux 브라우저 실행 의존성', 'Linux에서는 agent-browser install --with-deps가 브라우저 시스템 라이브러리도 설치하는 경로입니다. CLI 설치와 브라우저 실행 환경 준비를 구분해야 합니다.', /Linux: agent-browser install --with-deps also installs the browser's system libraries/i],
    ['refs', '스냅샷 참조로 조작한 뒤 다시 읽기', 'snapshot이 부여한 @e1 같은 참조로 동작한 뒤 페이지를 다시 읽어 결과를 확인하는 흐름입니다. 한 번 얻은 참조만으로 후속 상태를 추정하지 마세요.', /snapshot returns.*@e1.*reads the page again to check the result/i]
  ],
  'we-promise/sure': [
    ['shared', '인증 정보는 가족별로 격리되지 않음', 'Plaid 같은 제공자 인증, AI 연결 설정, 동기화 설정과 외부 비서 연결은 인스턴스 전체에 한 번 저장되어 모든 family에 적용됩니다. 가족별로 서로 다른 연결을 전제하기 전에 이 공유 범위를 확인해야 합니다.', /Provider credentials.*stored once for the whole instance and apply to every family/i, 'docs/hosting/docker.md']
  ],
  'homeassistant-ai/ha-mcp': [
    ['docker', 'Docker HTTP 연결의 토큰과 비밀 URL', 'Docker HTTP 서버는 Home Assistant URL과 장기 토큰을 설정하고 클라이언트가 서버의 비밀 URL로 연결하는 경로입니다. 관리자 토큰이 권장되며 일반 토큰은 기능 제한이 있으므로 다른 설치 경로의 권한과 동일하게 취급하지 마세요.', /Docker \(HTTP server\).*long-lived token.*non-admin tokens work with limitations.*secret URL/i],
    ['beta', 'YAML 수정 도구의 beta 이동', 'v7.3.0에서 ha_config_set_yaml이 beta로 이동했다는 호환성 변경이 공지돼 있습니다. 기존 YAML 수정 흐름을 유지할 때 현재 제공 범위를 확인해야 합니다.', /Breaking change \(v7\.3\.0\).*haconfigsetyaml.*beta/i]
  ],
  'openai/codex-security': [
    ['versions', '허용 Node 버전대를 구분', '요구 환경은 Node.js 22.x 중 22.13.0 이상, 또는 24.x·26.x와 Python 3.10 이상입니다. Node.js의 모든 상위 버전을 허용하는 조건으로 확대하지 마세요.', /Requires Node\.js 22\.13\.0\+ within 22\.x, or Node\.js 24\.x or 26\.x, and Python 3\.10\+/]
  ],
  'TheAlgorithms/Java': [
    ['learning', '학습 구현을 표준 라이브러리 대체 성능으로 해석하지 않기', '문서는 학습 목적의 구현이며 Java 표준 라이브러리보다 비효율적일 수 있다고 명시합니다. 공통 빌드 통과와 운영 환경의 성능 적합성은 별도로 판단해야 합니다.', /implementations are intended for learning purposes.*less efficient than the Java standard library/i]
  ],
  'NVIDIA/auto-ontology': [
    ['passwords', 'Compose 시작 전 기본 비밀번호 교체', 'Compose는 Postgres·pgAdmin·웹 앱을 호스트에 공개합니다. 실행 전에 각 기본 비밀번호를 바꾸도록 안내하므로 샘플 설정을 그대로 공개 환경에 사용하지 마세요.', /Compose publishes Postgres, pgAdmin, and the web app on the host.*replace each default password before you start it/i],
    ['embedding', '수집과 질의의 임베딩 모델 일치', '구조화 출력을 지원하는 모델을 사용하고 수집과 질의에 같은 임베딩 모델을 유지해야 합니다. 모델 역할별 설정을 바꿀 때 이 일치 조건을 함께 확인하세요.', /Use models that support structured output, and keep the embedding model the same for ingestion and queries/i]
  ],
  'thedotmack/claude-mem': [
    ['search-only', '검색 지원과 세션 기록 지원 구분', 'Copilot CLI·Goose·Roo Code·Warp는 기존 기억을 검색할 수 있지만 해당 세션은 기록되지 않습니다. 지원 에이전트 목록만 보고 모든 호스트에서 자동 수집된다고 가정하지 마세요.', /Copilot CLI, Goose, Roo Code and Warp can search your memory, but their sessions aren't recorded/i]
  ],
  'max-sixty/worktrunk': [
    ['hooks', '생성·병합 시 hook의 실행 시점', 'hook은 worktree 생성, 병합 전·후 등에 명령을 실행하는 기능입니다. 단순 경로 전환과 자동 명령 실행의 범위를 구분해 프로젝트의 hook 설정을 검토하세요.', /Hooks.*run commands on create, pre-merge, post-merge/i]
  ],
  'anthropics/skills': [
    ['xlsx-errors', '대표 XLSX 스킬: 종료 코드 0만으로 성공 판단 금지', 'XLSX 재계산은 LibreOffice가 파일을 다시 쓰고 JSON 상태와 오류 수를 반환하는 경로입니다. errors_found도 종료 코드 0일 수 있으므로 JSON 상태·total_errors를 확인해야 합니다. 이는 XLSX 작업 조건이며 모음 전체의 공통 요구사항은 아닙니다.', /LibreOffice computes every formula.*trust totalerrors.*errorsfound exits 0/i, 'skills/xlsx/SKILL.md']
  ],
  'Donchitos/Claude-Code-Game-Studios': [
    ['python', 'Python 부재 시 설정이 조용히 기본값으로 바뀜', 'Python 3가 project.yaml을 읽습니다. 없으면 모든 설정이 조용히 기본값으로 돌아간다고 명시하므로 게임이 생성됐다는 사실만으로 설정 적용을 판단하지 마세요.', /Python 3.*reads project\.yaml.*without it every setting silently falls back to its default/i],
    ['browser', '브라우저가 없으면 플레이·스크린샷 검증 미평가', '/prototype의 플레이·스크린샷 검사에는 Chrome·Edge·Chromium 중 하나가 필요합니다. 없을 때의 not assessed 표시는 테스트 성공을 뜻하지 않습니다.', /Chrome, Edge or Chromium.*without one, those checks say they were not assessed/i]
  ],
  'milind-soni/OpenMausBot': [
    ['agents', '로컬 에이전트 설치와 로그인 선행', '요구 환경은 macOS·Windows 또는 Ubuntu 24.04 x64, Node 24 이상과 pnpm입니다. claude·codex·grok CLI 중 적어도 하나가 설치되고 로그인돼 있어야 하므로 관리 화면 설치만으로 실행 준비가 끝나지 않습니다.', /Requirements: macOS, Windows, or Ubuntu 24\.04 x64, Node 24\+, pnpm, and at least one agent CLI.*installed and logged in/i]
  ],
  'pingdotgg/t3code': [
    ['npx', '일회 실행 경로에도 Node.js가 필요', '설치 없이 시험하는 npx t3@latest 경로도 npx 실행용 Node.js는 필요합니다. 데스크톱 앱 설치와 이 CLI 시험 경로의 환경을 구분하세요.', /without installing it.*npx t3@latest.*needs Node\.js for npx/i, 'docs/user/install.md'],
    ['providers', '지원 에이전트별 연결 환경 확인', '문서가 안내하는 지원 대상은 Codex·Claude·Cursor·Grok Build·OpenCode·Antigravity·fx입니다. 이름이 비슷한 다른 에이전트도 연결된다고 확대하지 마세요.', /currently supports Codex, Claude, Cursor, Grok Build, OpenCode, Antigravity, and fx/i]
  ],
  'Nutlope/hallmark': [
    ['node', '설치에 필요한 Node 환경', '문서는 Node 18 이상이 필요하다고 명시합니다. 스킬 설치를 시작하기 전에 해당 환경을 준비해야 합니다.', /Needs Node 18 or later/i],
    ['review', '생성 뒤 실제 브라우저와 별도 문맥 검토', '테마를 고른 뒤 끝내지 않고 실제 브라우저에서 결과를 검사하고 새 문맥의 검토자가 마지막으로 판단하는 흐름입니다. 테마 선택만으로 UI 검증이 끝났다고 보지 마세요.', /lints the result in a real browser.*fresh-context reviewer gets the last word/i]
  ],
  'Renhuai123/ziwei-doushu': [
    ['key', '명반 계산과 API 키 경로 구분', '명반 계산에는 API 키가 필요 없다고 설명합니다. 이 면제 조건을 별도의 AI 해석이나 다른 서비스 경로까지 확대하지 마세요.', /No API key is needed for charting/i]
  ],
  'D4Vinci/Scrapling': [
    ['extras', '기본 설치는 parser만 포함', '기본 설치는 parser와 그 의존성만 포함합니다. fetchers·spiders를 그대로 import하면 ModuleNotFoundError가 나므로 수집 기능을 쓸 때는 별도 의존성을 설치해야 합니다.', /installation only includes the parser engine.*ModuleNotFoundError.*fetchers.*dependencies/i],
    ['browser', 'HTTP 요청과 브라우저 설치 구분', 'scrapling install은 브라우저 fetcher가 필요할 때 실행하는 절차입니다. 일반 HTTP 요청에는 브라우저 설치가 필요하지 않습니다.', /Run scrapling install when you need browser fetchers\. HTTP requests do not need a browser installation/i]
  ],
  'cloudflare/security-audit-skill': [
    ['sandbox', '대상 코드 실행 전에 OS 샌드박스 필요', '대상 빌드·테스트 등을 실행하려면 외부 네트워크 차단, 허용 환경 변수, 자원 상한과 지정 임시 경로 쓰기를 강제하는 OS 샌드박스가 필요합니다. 이 통제가 없으면 실행하지 않고 needs_validation으로 남기는 절차입니다.', /OS-enforced sandbox.*disable external networking.*resource limits.*needsvalidation/i]
  ],
  'heygen-com/hyperframes': [
    ['cli', '수동 CLI 렌더링 환경', '수동 CLI 경로는 Node.js 22 이상과 FFmpeg를 요구합니다. HTML을 브라우저에서 미리 보는 것과 영상으로 인코딩할 실행 환경을 구분하세요.', /Requirements: Node\.js 22\+, FFmpeg/i],
    ['skills', '비대화형 설치의 범위', '스킬 선택기는 대화형 전용입니다. 비대화형 실행에서 --skill을 생략하면 9개 전체가 설치되므로 일부만 필요할 때는 설치 범위를 명시해야 합니다.', /picker is interactive-only.*without --skill installs all 9/i]
  ],
  'anthropics/knowledge-work-plugins': [
    ['sales-actions', '대표 sales 플러그인: 조회와 실제 업무 반영 구분', 'sales 문서는 요청에 따라 connector 권한 안에서 CRM 갱신, 메일 발송, 채팅 게시와 일정 예약까지 가능하다고 설명합니다. 스킬이 먼저 제안한 변경은 근거와 함께 보여주는 경로이므로 초안 작성과 실제 외부 반영을 구분해야 합니다. 다른 직무 플러그인 전체의 공통 동작은 아닙니다.', /Acts when you ask.*update CRM records.*send email.*within each connector's permissions.*shown to you first/i, 'sales/README.md']
  ],
  'debpalash/VoiceStudio': [
    ['intel', 'Intel Mac은 UI 전용', 'macOS 설치 문서는 Intel Mac에서 로컬 backend를 지원하지 않는다고 명시합니다. x64 앱 UI가 실행된다는 사실과 로컬 음성 모델 실행 지원을 구분해야 합니다.', /Intel Macs are not supported.*local backend/i, 'docs/install/macos.md']
  ],
  'pbakaus/impeccable': [
    ['live', 'live mode는 로컬 checkout에서만 사용', 'live mode는 로컬 checkout 수정용이며 배포 사이트에 주입하거나 동작을 위해 운영 CSP를 약화하지 않도록 안내합니다. 낯선 저장소에서는 복사 편집 시 실행되는 선택적 검증 스크립트도 먼저 검토해야 합니다.', /Live mode edits a local checkout only.*production CSP.*review it before using live mode/i],
    ['apply', 'Apply의 CLI 대체 실행과 권한 범위', '최근 1분 동안 chat agent가 응답하지 않으면 Apply가 PATH의 codex 또는 claude CLI를 승인·샌드박스 제한 없이 실행하고 환경을 상속한다고 설명합니다. 편집 요청을 적용하기 전에 실제 실행 주체와 권한 범위를 확인해야 합니다.', /Apply sends staged copy edits.*approvals, permission checks, and sandboxing off.*environment inherited/i]
  ],
  'earthtojake/text-to-cad': [
    ['python', '모델 생성에는 Python 코드 실행이 포함', '설계 요청은 Python 스크립트로 작성되고 그 스크립트를 실행해 모델을 만듭니다. 뷰어에 표시된 형상만 확인하지 말고 생성된 모델 코드도 검토하는 흐름으로 사용하세요.', /writes the model as a Python script, runs it to build the model/i]
  ],
  'NationalSecurityAgency/ghidra': [
    ['install', '기존 설치 폴더 위에 압축을 풀지 않기', '공식 사전 빌드 설치 절차는 기존 설치 위에 압축을 풀지 말라고 명시합니다. 새 릴리스를 기존 폴더에 덮어쓰는 방식으로 갱신하지 마세요.', /Do not extract on top of an existing installation/i],
    ['jdk', '사전 빌드 실행과 소스 빌드 환경 구분', '사전 빌드 릴리스 설치 절차에는 64비트 JDK 25가 명시돼 있습니다. 소스 빌드용 Gradle·컴파일러 요구사항을 일반 실행의 필수 조건으로 모두 합치지 마세요.', /Install JDK 25 64-bit/i]
  ]
};

export function explainCautions(row, context) {
  return (rules[row.name] || []).flatMap(([id, title, body, pattern, path]) => {
    const candidates = [...context.documents, ...context.setupDocuments, ...(path ? context.representativeDocuments : [])].filter(doc => !doc.exampleOnly && context.sources.some(source => source.id === doc.sourceId && (path ? source.path === path : /^README(?:\.[\w-]+)?\.md$/i.test(source.path))));
    const evidenceId = context.select(pattern, { candidates, allowNegative: true, wholeParagraph: true });
    return evidenceId && pattern.test(context.evidence.find(item => item.id === evidenceId).excerpt) ? [{ id, title, body, kind: 'interpretation', evidenceIds: [evidenceId] }] : [];
  });
}

export function validateCautions(usage) {
  if (usage.version < 16 || usage.status !== 'ready') return;
  const cautions = usage.article.cautions;
  const repository = usage.sources[0]?.repository;
  if (!Array.isArray(cautions) || new Set(cautions.map(c => c.id)).size !== cautions.length) throw Error('도입 주의점 목록 오류');
  for (const claim of cautions) {
    const rule = (rules[repository] || []).find(rule => rule[0] === claim.id);
    if (!rule || claim.title !== rule[1] || claim.body !== rule[2] || claim.kind !== 'interpretation' || !Array.isArray(claim.evidenceIds) || claim.evidenceIds.length !== 1) throw Error('도입 주의점 설명 오류');
    const evidence = usage.evidence.find(item => item.id === claim.evidenceIds[0]);
    const source = usage.sources.find(item => item.id === evidence?.sourceId);
    if (!evidence || evidence.kind === 'example' || !rule[3].test(evidence.excerpt) || source?.repository !== repository || (rule[4] ? source.path !== rule[4] : !/^README(?:\.[\w-]+)?\.md$/i.test(source.path))) throw Error('도입 주의점 근거 오류');
  }
}
