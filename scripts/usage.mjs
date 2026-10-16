// README는 분석용 입력으로만 취급합니다. 명령을 실행하거나 문서의 지시를 따르지 않습니다.
import { buildAnalysis } from './analysis.mjs';
export const usageVersion = 2;
const profiles = [
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
  { pattern: /plugins? (?:directory|for claude code)|directory of.*plugins|marketplace.*plugins|플러그인 모음/i, category: '플러그인 모음', purpose: '기존 도구에 추가할 플러그인을 찾아 설치하는 데 사용하는 프로젝트 유형입니다.', audience: '지원 도구의 기능을 확장하려는 사용자', scenario: '현재 사용하는 도구와 호환되는 플러그인 하나를 골라 설치하고 실제 작업에서 기능을 확인해 볼 수 있습니다.' },
  { pattern: /agentic skills|agent skill|skills.*(?:engineer|claude|codex)|skills library|스킬 모음/i, category: 'AI 에이전트 스킬', purpose: 'AI 에이전트가 특정 작업을 수행할 때 참고할 절차와 기능을 제공하는 프로젝트 유형입니다.', audience: 'AI 코딩·연구 에이전트를 사용하는 개발자·연구자', scenario: '필요한 작업에 맞는 스킬 하나를 선택하고, 지원 에이전트에 연결해 작은 작업으로 적용 여부를 확인할 수 있습니다.' },
  { pattern: /agent harness|agent.*orchestrat|coordinate.*(?:agent|workflow)|manage agents|multi.agent/i, category: 'AI 에이전트 운영', purpose: 'AI 에이전트의 실행과 작업 흐름을 관리하는 도구 유형입니다.', audience: '여러 AI 작업을 연결하거나 관리하는 개발자', scenario: '작업 하나의 입력·실행·결과 확인 흐름을 구성한 뒤 여러 작업으로 확장해 볼 수 있습니다.' }
];

function clean(value) {
  return value.replace(/<!--[\s\S]*?-->/g, '').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' ').replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[*_`]/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

export function readSections(markdown) {
  const sections = [{ title: '', level: 0, body: '' }];
  let fence = null;
  for (const line of markdown.replace(/\r/g, '').split('\n')) {
    const mark = line.match(/^\s*(`{3,}|~{3,})/);
    if (mark) {
      if (!fence) fence = { char: mark[1][0], length: mark[1].length };
      else if (mark[1][0] === fence.char && mark[1].length >= fence.length) fence = null;
      sections.at(-1).body += `${line}\n`; continue;
    }
    const heading = !fence && line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) sections.push({ title: clean(heading[2]), level: heading[1].length, body: '' });
    else sections.at(-1).body += `${line}\n`;
  }
  return sections;
}

export function analyzeUsage(row, markdown, now = new Date()) {
  const sections = readSections(markdown);
  const overview = sections.slice(0, 4).map(s => `${s.title} ${s.body.replace(/(`{3,}|~{3,})[\s\S]*?\1/g, '')}`).join(' ').slice(0, 5000);
  // 짧은 저장소 설명을 우선 사용해 README의 부수적 언급으로 오분류되는 일을 줄입니다.
  const profile = profiles.find(p => p.pattern.test(row.description)) || profiles.find(p => p.pattern.test(clean(overview)));
  const selected = sections.findIndex(s => /quick\s*start|getting started|get started|빠른 시작|시작하기|사용법|安装|快速开始/i.test(s.title));
  const fallback = sections.findIndex(s => /(?:^|\s)(?:installation|install|setup|usage|how to use|설치|사용 방법)(?:\b|\s|$)/i.test(s.title));
  const index = selected >= 0 ? selected : fallback;
  let start = null;
  if (index >= 0) {
    const section = sections[index];
    const children = [];
    let bodies = section.body;
    for (const next of sections.slice(index + 1)) {
      if (next.level <= section.level) break;
      if (children.length < 3) children.push(next.title);
      bodies += `\n${next.body}`;
    }
    // 원문에서 확인된 짧은 명령 예시만 표시합니다. 자체적으로 설치 명령을 만들지 않습니다.
    const blocks = [...bodies.matchAll(/(`{3,}|~{3,})([^\n]*)\n([\s\S]*?)\1/g)];
    const commandBlock = blocks.find(([, , lang, body]) => /^(?:bash|sh|shell|console|zsh|powershell|ps1|cmd|text)?\s*$/i.test(lang.trim()) && body.trim());
    let command = commandBlock?.[3].trim() || '';
    // 긴 스크립트 일부만 잘라 실행 가능한 것처럼 보이지 않도록 전체 블록만 허용합니다.
    if (command.length > 220 || command.split('\n').length > 4 || command.split(/\s+/).length > 24) command = '';
    const prose = clean(bodies.replace(/(`{3,}|~{3,})[\s\S]*?\1/g, '').split('\n').find(line => line.trim() && !/^\s*(?:[!|<#]|\[|\*\*|---)/.test(line)) || '');
    const excerpt = prose.split(/\s+/).slice(0, command ? 0 : 20).join(' ').slice(0, 180);
    start = { heading: section.title, steps: children, command, excerpt };
  }
  return {
    version: usageVersion, status: 'ready', checkedAt: now.toISOString(),
    source: `https://github.com/${row.name}#readme`,
    category: profile?.category || '용도 분류 미확정',
    purpose: profile?.purpose || '자동 분류로 용도를 확정하지 못했습니다. 저장소 설명과 README의 사용 예를 확인해 주세요.',
    audience: profile?.audience || null, scenario: profile?.scenario || null,
    basis: profile ? '저장소 설명·README의 키워드를 바탕으로 한 규칙 기반 해석입니다. 활용 예는 실제 사용 사례를 확인한 결과가 아닌 제안입니다.' : '자동으로 확인되지 않은 용도나 기능은 추가하지 않았습니다.',
    start, article: buildAnalysis(row, sections, profile, start)
  };
}

export async function fetchUsage(row, { now = new Date(), fetcher = fetch, token = process.env.GITHUB_TOKEN, delay = ms => new Promise(resolve => setTimeout(resolve, ms)) } = {}) {
  const source = `https://github.com/${row.name}#readme`;
  const unavailable = reason => ({ version: usageVersion, status: 'unavailable', reason, source, checkedAt: now.toISOString() });
  if (!/^[\w.-]+\/[\w.-]+$/.test(row.name)) return unavailable('저장소 경로를 확인하지 못했습니다.');
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'GitTrendJournal/1.0' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetcher(`https://api.github.com/repos/${row.name}/readme`, { headers, signal: AbortSignal.timeout(15000) });
      if (response.status === 404) return unavailable('공개 README를 찾지 못했습니다.');
      if (response.status === 403 || response.status === 429) return unavailable('README API 접근 또는 호출 한도로 확인을 보류했습니다. 다음 실행에서 재시도합니다.');
      if (!response.ok) throw new Error('README 응답 오류');
      const data = await response.json();
      if (data.encoding !== 'base64' || !data.content || data.size > 250000 || data.content.length > 350000) return unavailable('README 형식이나 크기가 자동 분석 범위를 벗어났습니다.');
      return { ...analyzeUsage(row, Buffer.from(data.content, 'base64').toString('utf8'), now), readmeSha: data.sha || null };
    } catch {
      if (attempt < 2) { await delay(1000 * (attempt + 1)); continue; }
      return unavailable('README를 불러오지 못했습니다. 다음 실행에서 재시도합니다.');
    }
  }
}
