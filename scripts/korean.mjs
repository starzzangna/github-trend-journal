// 원문의 자유 번역 대신, 이미 확인한 동작 유형을 한정된 한국어 설명으로 옮깁니다.
// 새로운 기능·수치·필수 조건은 추가하지 않으며 원문은 evidence에 그대로 둡니다.
const operations = {
  '관심 종목의 보고서 생성': '관심 종목의 자료를 모아 분석 대시보드나 보고서를 생성합니다.',
  '웹 플랫폼 지침과 호환성': '코딩 에이전트에 최신 웹 플랫폼 지침과 브라우저 호환성 정보를 제공합니다.',
  '취약점 탐색·검토 보고서': '저장소의 취약점을 찾아 검토하고 발견 항목과 보고서를 남기는 작업을 지원합니다.',
  'Java 알고리즘 학습 구현': 'Java로 작성된 알고리즘 구현을 읽고 실행·수정하며 학습하는 자료 모음입니다.',
  '명반 계산과 지식 자료': '전통 자미두수 규칙으로 명반을 계산하고 관련 지식·해석 자료를 제공합니다.',
  '코드 감사에서 구현 계획으로': '코드베이스를 검토한 뒤 다른 에이전트가 실행할 구현 계획을 작성합니다.',
  '테마·스타일 변경 방식': '컴포넌트의 스타일과 테마를 기존 CSS 방식에 맞춰 바꾸는 경로를 제공합니다.',
  '컴포넌트 소스 소유 범위': '컴포넌트 내부 구성이나 소스를 가져와 프로젝트에서 직접 수정하는 방식을 다룹니다.',
  '스냅샷 참조의 유효 범위': '페이지를 스냅샷으로 읽고, 요소에 붙은 참조를 사용해 브라우저를 조작합니다.',
  '클릭 실패 조건': '대상이 가려져 있거나 비활성 상태인 경우 클릭을 실패로 처리합니다.',
  '페이지 변경 시 선택자 처리': '선택자와 요소 추적을 이용해 페이지 구조가 바뀌는 상황에서 데이터를 찾습니다.',
  '페이지의 Markdown 변환': '웹 페이지의 내용을 Markdown 문서로 바꾸어 후속 처리에 사용합니다.',
  '브랜치와 작업 경로의 연결': '브랜치 이름으로 워크트리를 지정하면 설정된 규칙에 따라 작업 경로를 찾습니다.',
  '작업 시작·병합 자동화': '작업 시작 명령이나 병합 절차를 워크트리 관리 흐름에 연결합니다.',
  '세션 기록의 저장·재사용 방식': '에이전트의 작업 기록을 수집하거나 다음 세션에 전달할 문맥을 선택해 재사용합니다.',
  '기억 조회의 단계': '저장된 기억을 단계적으로 조회해 필요한 작업 정보를 찾습니다.',
  '스킬의 구성과 로딩': '작업별 지침·스크립트·자료를 스킬로 묶고 에이전트가 필요할 때 읽도록 합니다.',
  '작업 절차와 검토 산출물': '작업 절차와 검토 기준을 지침으로 제공해 에이전트의 수행·검토 흐름을 정리합니다.',
  '테마 선택과 페이지 구성': '테마의 시각 요소를 바탕으로 페이지를 구성하는 방식을 제공합니다.',
  '검토 방식과 남기는 문서': 'UI를 검토하거나 프로젝트의 설계 기준을 문서로 남기는 절차를 제공합니다.',
  '모델 처리·시각화 방식': '물리 모델을 처리하고 시뮬레이션을 시각화하거나 관련 물리량을 계산하는 기능을 다룹니다.',
  '자체 호스팅과 접근 경로': '재무 관리 앱을 직접 호스팅하고 지원 클라이언트에서 접속하는 경로를 제공합니다.',
  '설치 경로별 인증 차이': 'Home Assistant와 AI 클라이언트를 연결하며 설치 경로에 따라 인증 구성이 달라집니다.',
  'Home Assistant 조작 범위': 'AI 클라이언트에서 Home Assistant의 기기·항목이나 자동화 설정을 관리하는 경로를 제공합니다.',
  '서버 렌더링과 브라우저 반응성': '화면을 서버에서 렌더링하고 일부 Rust 표현식을 JavaScript로 옮겨 브라우저에서도 갱신합니다.',
  '라우팅·컴포넌트 소유 방식': '모듈 구조에 따른 라우팅이나 프로젝트 안에서 직접 수정하는 UI 컴포넌트를 다룹니다.',
  '자연어 질의와 의미 계층': '데이터의 의미를 정리한 계층을 두고 자연어 질문을 SQL 질의로 연결합니다.',
  '시스템 간 정의 조정': '여러 시스템의 메타데이터와 용어 정의를 연결해 공통 문맥을 구성합니다.',
  '기존 로컬 에이전트 제어': '컴퓨터에 설치된 에이전트를 제어해 기존 실행 환경과 연결합니다.',
  '봇별 실행 환경': '봇마다 모델이나 실행 환경을 나누어 작업하는 구성을 다룹니다.',
  '예제별 작업 범위': '지원 상담이나 데이터 분석 등 작업별 AI 애플리케이션 예제를 제공합니다.',
  '음성 생성·더빙의 변환 경로': '참고 녹음이나 설명으로 음성을 만들거나 영상에 맞춰 음성을 더빙하는 경로를 제공합니다.',
  '로컬 모델과 선택 서비스': '로컬 음성 모델과 선택 가능한 서비스의 사용 경로를 구분해 제공합니다.',
  'HTML 구성에서 영상으로 변환': 'HTML로 구성한 화면을 영상으로 렌더링합니다.',
  '모델 작성 방식과 내보내기 형식': 'Python으로 CAD 모델을 작성하거나 생성한 모델을 CAD 파일로 내보내는 흐름입니다.',
  '제조·응력 검토 경로': '설계 모델의 제조 가능성이나 하중에 따른 응력을 검토하는 경로를 다룹니다.',
  '분석 대상과 지원 범위': '컴파일된 프로그램을 대상으로 파일 형식·프로세서에 맞는 분석 기능을 제공합니다.',
  '코드 분석과 확장 경로': '디스어셈블·디컴파일 등의 코드 분석과 스크립트 확장 기능을 다룹니다.',
  '계정 검색 결과의 저장 형식': '찾은 공개 계정 정보를 사용자 이름별 텍스트 파일에 저장합니다.',
  '게임 요구사항에서 초안까지': '게임 설명을 받아 요구사항을 정리하고 플레이 가능한 브라우저 게임 초안을 만듭니다.',
  '직무별 도구·지침 묶음': '직무에 필요한 지침·연결 도구·명령을 플러그인으로 묶어 제공합니다.',
  '샘플 음성을 활용하는 음성 복제': '참고 음성을 사용해 목소리를 복제하는 기능을 다룹니다.',
  '영상 더빙 작업': '영상에 맞는 음성을 제작하는 더빙 기능을 다룹니다.',
  '음성을 텍스트로 옮기는 작업': '녹음된 음성을 텍스트로 옮기는 전사 기능을 다룹니다.',
  '긴 음성 콘텐츠 제작': '오디오북처럼 긴 음성 콘텐츠를 제작하는 작업을 다룹니다.',
  '디컴파일을 통한 코드 구조 탐색': '디컴파일 결과를 통해 프로그램의 코드 구조를 살펴봅니다.',
  '어셈블리 수준의 분석': '프로그램을 기계 명령 수준으로 읽는 디스어셈블 기능을 다룹니다.',
  '실행 중인 동작 분석': '프로그램 실행 시점의 동작을 조사하는 분석 기능을 다룹니다.',
  '여러 에이전트의 작업 조정': '여러 에이전트의 역할과 작업 흐름을 조정합니다.',
  '작업 정보의 유지': '세션 사이에서 작업 정보를 유지하는 메모리 기능을 다룹니다.',
  '정보 저장과 검색을 잇는 메모리': '작업 정보를 저장하고 필요한 때 다시 검색하는 흐름을 제공합니다.',
  '설계 모델을 다루는 흐름': 'CAD 설계 모델을 다루는 작업을 제공합니다.',
  '화면 구성과 영상 렌더링의 연결': 'HTML 화면 구성을 영상 렌더링 작업에 연결합니다.'
};

const roles = {
  '계획·구현 결과': '빌드 명령 경로에서 계획을 생성하고 작업을 구현합니다.',
  'CSV·은행 동기화 자료': 'CSV 가져오기나 은행 데이터 동기화 경로를 사용합니다. 형식·연동 조건은 원문에서 확인하세요.',
  'Home Assistant 작업 요청': '문서의 사용 예처럼 AI 클라이언트에서 Home Assistant 작업을 요청합니다.',
  '자동화 설정': '문서의 작업 예에서는 자동화 설정을 생성하거나 수정합니다.',
  '팀 구성 Markdown': '팀 가져오기 경로에서 Markdown 파일이나 공개 GitHub 파일 주소를 전달합니다.',
  '팀 공유 파일': '부서 공유 경로에서 봇과 지침 등의 팀 구성을 한 파일로 저장합니다.',
  '스레드 작업 요청': '외부 에이전트 연결 경로에서 스레드를 시작하거나 메시지를 보내는 요청을 전달합니다.',
  '프로젝트·스레드 조회': '외부 에이전트 연결 경로에서 프로젝트와 스레드 정보를 조회합니다.',
  '페이지·컴포넌트 대상': '페이지·개발 서버·앱 또는 컴포넌트를 대상으로 지정하는 경로입니다.',
  'HTML·CSS 페이지': '페이지 제작 경로에서 독립적인 HTML·CSS 결과물을 만듭니다.',
  '프로젝트 기준 문서': '프로젝트의 제품·디자인 기준을 문서로 기록하는 경로입니다.',
  '단일 저장소 감사 대상': '문서에서 설명한 단일 저장소 보안 감사 경로의 대상입니다.',
  '구조화된 감사 결과': '보안 감사 경로에서 구조화된 발견 항목이나 Markdown 보고서를 작성합니다.',
  '업무 목표·절차': '플러그인 설정·사용 경로에서 업무 목표와 작업 절차를 전달합니다.',
  '관심 종목': '분석할 관심 종목을 지정합니다.', '분석 대시보드': '분석 대시보드나 보고서를 생성·전달합니다.',
  '검토할 코드': '저장소나 선택한 코드 범위를 검토 대상으로 지정합니다.', '취약점 보고서': '점검 보고서와 발견 항목을 저장하거나 내보냅니다.',
  '구현 계획': '다른 에이전트가 검토·실행할 구현 계획을 문서로 작성합니다.', '코드·검색 요청': '검토할 코드나 웹 개발 지침의 검색어를 전달합니다.',
  '웹 개발 가이드': '웹 플랫폼 지침과 호환성 정보를 찾아 제공합니다.', '출생 정보': '전통 명반 계산에 사용할 출생 정보를 전달합니다.',
  '전통 명반': '전통 규칙에 따른 명반이나 관련 자료를 제공합니다.', '학습용 Java 구현': '학습용 Java 알고리즘 구현을 제공합니다.',
  '텍스트': '음성으로 변환할 텍스트를 입력합니다.', '참고 음성': '음성 생성에 참고할 녹음을 전달합니다.',
  '웹 페이지': '처리할 웹 페이지 주소를 전달합니다.', '사용자 이름': '검색할 사용자 이름을 지정합니다.',
  'HTML 소스': '화면을 구성할 HTML 소스를 작성하거나 읽습니다.', '컴포넌트·스타일': '애플리케이션에 컴포넌트와 스타일을 연결합니다.',
  '시뮬레이션 모델': '시뮬레이션할 모델 파일을 불러옵니다.', '데이터·질의': '메타데이터·스키마 또는 자연어 질문을 전달합니다.',
  '브랜치 지정': '선택할 브랜치 이름이나 워크트리 경로를 지정합니다.', '가져올 기록': '거래 기록이나 CSV 자료를 가져옵니다.',
  '모델·추론 요청': '사용할 모델이나 추론 요청을 지정합니다.', '분석 대상 파일': '분석할 실행 파일이나 컴파일된 코드를 읽습니다.',
  '스킬 지침': '작업별 지침과 관련 자료를 스킬로 읽습니다.', '작업·세션 기록': '에이전트의 작업·세션 기록을 수집합니다.',
  '게임 요구사항': '만들고 싶은 게임의 설명과 요구사항을 전달합니다.', '설계 요청': '텍스트로 설계 요구사항을 전달합니다.',
  '생성 음성': '음성을 생성합니다.', '영상 결과물': '렌더링한 영상 파일을 얻습니다.', '페이지 구조': '접근성 트리나 요소 참조가 있는 페이지 구조를 얻습니다.',
  '추출 데이터': '추출한 구조화 데이터나 텍스트를 얻습니다.', 'UI 구성 요소': '애플리케이션에 사용할 UI 컴포넌트나 템플릿을 제공합니다.',
  '그래프·질의': '지식 그래프를 구성하거나 자연어 질문을 SQL로 바꿉니다.', '작업 디렉터리·상태': '워크트리를 만들거나 작업 상태를 조회합니다.',
  '시뮬레이션 결과': '시뮬레이션으로 계산된 상태나 움직임을 얻습니다.', '재무 현황': '순자산·지출 등 재무 현황을 확인합니다.',
  '모델 응답': '추론으로 생성된 응답이나 텍스트를 반환합니다.', '복원된 코드 표현': '분석된 코드 표현이나 의사코드를 살펴봅니다.',
  '문서 작업 결과': '문서 생성·편집 결과물을 만드는 작업을 다룹니다.', '재사용할 문맥': '기록을 검색해 이후 세션의 문맥으로 재사용합니다.',
  '게임 초안': '플레이 가능한 브라우저 게임 초안을 만듭니다.', '공개 계정 정보': '사용자 이름에 대응하는 공개 계정·프로필을 찾습니다.',
  'CAD 모델': '생성하거나 내보낸 CAD 모델을 얻습니다.'
};

function summarizeFinding(claim, usage) {
  const text = claim.evidenceIds.map(id => usage.evidence.find(item => item.id === id)?.excerpt || '').join(' ');
  if (claim.title === '서버 렌더링과 브라우저 반응성') return [
    /renders all markup on the server/i.test(text) && '화면을 서버에서 렌더링합니다.',
    /query the database directly/i.test(text) && '컴포넌트에서 데이터베이스를 직접 조회할 수 있습니다.',
    /translates to JavaScript/i.test(text) && 'Rust 표현식을 JavaScript로 옮겨 브라우저에서도 화면을 갱신합니다.'
  ].filter(Boolean).join(' ') || '서버와 브라우저 사이의 화면 갱신 방식을 다룹니다.';
  if (claim.title === '자연어 질의와 의미 계층') return /questions are translated to SQL/i.test(text) ? '자연어 질문을 SQL로 바꾸어 연결된 데이터베이스에 질의합니다.' : '데이터의 의미를 정리하는 온톨로지·카탈로그 계층을 구성합니다.';
  if (claim.title === '기존 로컬 에이전트 제어') return /bots run on/i.test(text) ? '봇이 로컬 에이전트 명령을 실행하며 기존 로그인과 구독을 사용하는 구성을 제공합니다.' : '컴퓨터에 설치·설정된 에이전트를 앱에서 제어합니다.';
  if (claim.title === '스냅샷 참조의 유효 범위') return /DOM change|After navigation|Refs describe/i.test(text) ? '스냅샷의 요소 참조는 페이지 상태에 묶이므로 화면이 바뀌면 다시 읽어야 합니다.' : operations[claim.title];
  if (claim.title === '음성 생성·더빙의 변환 경로') return /reference recording into speech/i.test(text) ? '참고 녹음을 바탕으로 해당 목소리의 음성을 생성합니다.' : /translate and dub/i.test(text) ? '영상을 번역·더빙하며 원래 영상에 음성 타이밍을 맞춥니다.' : '말로 설명한 목소리를 생성하는 경로를 제공합니다.';
  if (claim.title === '검토 방식과 남기는 문서') return /sloplint/i.test(text) ? '실제 브라우저 화면을 검사해 페이지 구성과 시각적 문제를 점검합니다.' : /critique scores|audit checks/i.test(text) ? '디자인을 평가하고 접근성·성능·테마·반응형 문제의 수정 우선순위를 정리합니다.' : '프로젝트의 제품·디자인 기준을 문서로 남겨 후속 작업에서 참고합니다.';
  if (claim.title === '모델 작성 방식과 내보내기 형식') {
    const formats = [...new Set(text.match(/\b(?:STEP|GLB|STL|3MF|DXF)\b/g) || [])];
    return [/Python/i.test(text) && '모델을 Python 코드로 작성합니다.', formats.length && `${formats.join('·')} 형식으로 모델을 내보내는 경로를 제공합니다.`].filter(Boolean).join(' ');
  }
  return operations[claim.title] || `${claim.title} 관련 기능을 다룹니다. 세부 동작은 원문 근거를 확인하세요.`;
}

function summarizeRole(claim, usage, role) {
  if (roles[claim.title]) return roles[claim.title];
  const text = claim.evidenceIds.map(id => usage.evidence.find(item => item.id === id)?.excerpt || '').join(' ');
  if (claim.title === '공통 입력 계약' && /Then name a command and a target/i.test(text)) return '명령 이름과 적용할 대상 영역을 지정합니다.';
  const items = [
    [/\bURL\b|web page|website/i, '웹 페이지 주소'], [/viewport/i, '화면 크기'], [/\bHTML\b/i, 'HTML 소스'],
    [/\bPNG\b|screenshot/i, '화면 이미지'], [/pixel diff/i, '픽셀 차이'], [/\bJSON\b/i, 'JSON 데이터'],
    [/\bCSV\b/i, 'CSV 자료'], [/text|speech audio/i, '텍스트·음성 자료'], [/reference recording/i, '참고 녹음']
  ].filter(([pattern]) => pattern.test(text)).map(([, label]) => label);
  return items.length ? `${items.join('·')}${role === '입력' ? '를 입력으로 다룹니다.' : '를 결과로 다룹니다.'}` : /^공통 (?:입력|출력) 계약$/.test(claim.title) ? '모음 전체에 적용되는 계약을 문서에서 확인했습니다. 자료 형식과 적용 범위는 원문 근거를 확인하세요.' : `${role} 절은 확인했지만 세부 내용을 한국어로 정리하지 못했습니다. 원문 근거를 확인하세요.`;
}

function summarizeCondition(claim, usage) {
  const text = claim.evidenceIds.map(id => usage.evidence.find(item => item.id === id)?.excerpt || '').join(' ');
  const runtime = ['React', 'Python', 'Node.js'].includes(claim.title);
  const focus = runtime ? text.slice(Math.max(0, text.toLowerCase().indexOf(claim.title === 'Node.js' ? 'node' : claim.title.toLowerCase()))).split(/[,;]/)[0] : '';
  if (runtime && /\bwithin\b|\d\.x\b|\bor\s+\d/i.test(focus)) return `${claim.title}의 허용 버전대가 따로 명시돼 있습니다. 버전 조합과 추가 요구사항은 원문 근거에서 확인하세요.`;
  let terms = [...new Set([...text.matchAll(/\b(?:Python|React|Node(?:\.js)?|Docker|JDK|Java|Home Assistant|PostgreSQL|Postgres|Redis|Linux|Windows|macOS|Chromium|Chrome for Testing|GPU|CUDA)(?:\s*(?:>=|>|~|\^)?\s*\d+(?:\.\d+){0,2}\+?)?/gi)].filter(match => !['React', 'Python', 'Node.js'].includes(claim.title) || match[0].toLowerCase().startsWith(claim.title === 'Node.js' ? 'node' : claim.title.toLowerCase())).map(match => {
    const following = text.slice(match.index + match[0].length, match.index + match[0].length + 24);
    return `${match[0].trim()}${/^\s*(?:or later|or newer|or higher|and above|or above)\b/i.test(following) ? ' 이상' : ''}`;
  }))];
  terms = terms.filter(term => /\d/.test(term) || !terms.some(other => /\d/.test(other) && other.toLowerCase().startsWith(term.toLowerCase())));
  const subject = terms.length && runtime ? terms.join(/\bor\b/i.test(focus) && !/or later|or newer|or higher|or above/i.test(focus) ? ' 또는 ' : ', ') : `${claim.title}${terms.length ? ` (${terms.join(', ')})` : ''}`;
  return { required: `이 설치 경로에서는 ${subject} 조건을 요구합니다.`, optional: `${subject} 관련 경로는 선택 사항입니다.`, 'not-required': `이 문서 경로에서 ${subject} 조건은 필수가 아니라고 설명합니다.`, mentioned: `설치·시작 경로에서 ${subject} 항목을 다룹니다. 필수 여부는 원문에서 확인하세요.` }[claim.scope];
}

export function addKoreanPresentation(usage) {
  if (usage?.status !== 'ready' || !usage.article?.project) return usage;
  const project = usage.article.project;
  for (const finding of usage.article.findings) finding.summaryKo = summarizeFinding(finding, usage);
  for (const [role, claims] of [['입력', project.inputs], ['출력', project.outputs]]) for (const claim of claims) claim.summaryKo = summarizeRole(claim, usage, role);
  for (const claim of project.conditions) claim.summaryKo = summarizeCondition(claim, usage);
  // 목적을 자유 번역하거나 용도 분류만으로 구체적인 동작을 채우지 않습니다.
  const core = usage.article.findings.slice(0, 2).map(claim => ({ title: claim.title, body: claim.summaryKo, kind: 'interpretation', evidenceIds: claim.evidenceIds, ...(claim.exampleOnly ? { exampleOnly: true } : {}) }));
  usage.article.core = core;
  return usage;
}
