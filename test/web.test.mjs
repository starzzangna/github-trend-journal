import { assessQuality } from '../scripts/evidence.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { analyzeUsage } from '../scripts/usage.mjs';
import { createReport } from '../scripts/trends.mjs';
import { synthesizeReport } from '../scripts/report.mjs';

const script = await readFile(new URL('../web/app.js', import.meta.url), 'utf8');
const representativeDocs = JSON.parse(await readFile(new URL('./fixtures/representative-documents.json', import.meta.url)));
const collectionDocs = JSON.parse(await readFile(new URL('./fixtures/collection-documents.json', import.meta.url)));
const skillDocs = JSON.parse(await readFile(new URL('./fixtures/skill-representatives.json', import.meta.url)));
const setupFixture = JSON.parse(await readFile(new URL('./fixtures/skills-setup.json', import.meta.url)));
const javaSetupFixture = JSON.parse(await readFile(new URL('./fixtures/java-setup.json', import.meta.url)));
const improveSetupFixture = JSON.parse(await readFile(new URL('./fixtures/improve-setup.json', import.meta.url)));
import { skillExamples } from '../scripts/skill-examples.mjs';
const now = new Date('2026-11-11T00:23:00Z');
const row = { name: 'example/voice', description: 'voice cloning', language: 'Python', stars: 10, periodStars: 2 };
const usage = analyzeUsage(row, '# Voice\n## Features\nVoice cloning is supported.\n## Input\nText and a reference recording.\n## Output\nGenerated speech audio.\n## Quick start\nRequires Python 3.11.', now);
const dataFor = usage => ({ reports: { daily: createReport('daily', [{ ...row, usage }], now) } });

async function mount(fetcher, { at = now, hash = '' } = {}) {
  const attributes = {}, events = {}, globalEvents = {};
  const state = { focused: null };
  const location = { hash };
  const container = { innerHTML: '', setAttribute: (key, value) => { attributes[key] = value; }, contains: () => false };
  const status = { textContent: '' };
  const retry = { addEventListener: (name, handler) => { events[name] = handler; }, focus: () => { state.focused = 'retry'; } };
  const heading = { focus: () => { state.focused = 'report-title'; } };
  class Clock extends Date { static now() { return at.getTime(); } }
  const document = { querySelector: key => ({ '#report': container, '#report-status': status, '#retry': retry, '#report-title': heading })[key], querySelectorAll: () => [] };
  runInNewContext(script, { document, location, addEventListener: (name, handler) => { globalEvents[name] = handler; }, fetch: fetcher, Intl, AbortSignal, Date: Clock });
  await new Promise(resolve => setImmediate(resolve));
  return { container, attributes, events, globalEvents, state, status, location, document };
}

test('improve의 설치·호환과 계획·위임 조건을 단계별 한국어로 표시하고 종합에 반영한다', async () => {
  const doc = improveSetupFixture;
  const linked = doc.documents.map(item => ({ markdown: item.markdown, metadata: { path: item.path, sha: item.path, setupOnly: true, format: 'markdown' } }));
  const usage = analyzeUsage({ name: doc.repository }, doc.markdown, now, doc.metadata, linked);
  const report = createReport('daily', [{ ...row, name: doc.repository, usage }], now);
  Object.assign(report, synthesizeReport(report, 'daily', now));
  const page = await mount(async () => ({ ok: true, json: async () => ({ reports: { daily: report } }) }));
  const html = page.container.innerHTML;
  assert.match(html, /분석 품질 · 기본 항목 충족/);
  assert.match(html, /설치·호환 환경/);
  assert.match(html, /작업 조건: 2\/2개 단계 확인/);
  assert.match(html, /소스 읽기 전용과 계획 저장 범위/);
  assert.match(html, /수동 실행자에게 인계/);
  assert.match(html, /실행 결과 재검증과 사용자 병합 판단/);
  assert.match(html, /작업 조건 확인 2개 단계 · 근거 부족 0개 단계 · 개별 조건 5개/);
  assert.doesNotMatch(html, /<details[^>]* open/);
});

test('Java 공통 빌드·테스트와 대표 알고리즘별 조건을 구분하고 XML 근거를 안전하게 표시한다', async () => {
  const doc = javaSetupFixture;
  const root = doc.documents.find(item => item.path === 'README.md');
  const linked = doc.documents.filter(item => /\.java$|\.xml$|\.yml$/.test(item.path)).map(item => ({ markdown: item.markdown, metadata: { path: item.path, sha: item.path, ...(item.path.endsWith('.java') ? { representativeId: item.path.includes('BinarySearch') ? 'java-binary-search' : 'java-bubble-sort', format: 'javadoc' } : { setupOnly: true, format: 'build-config' }) } }));
  const usage = analyzeUsage({ name: doc.repository }, root.markdown, now, { path: 'README.md', sha: 'root' }, linked);
  const report = createReport('daily', [{ ...row, name: doc.repository, usage }], now);
  Object.assign(report, synthesizeReport(report, 'daily', now));
  const page = await mount(async () => ({ ok: true, json: async () => ({ reports: { daily: report } }) }));
  const html = page.container.innerHTML;
  assert.match(html, /분석 품질 · 기본 항목 충족/);
  assert.match(html, /저장소 공통 빌드·테스트 절차/);
  assert.match(html, /빌드·테스트 근거: 확인 · 대표 실행 조건: 2\/2개 알고리즘 확인/);
  assert.match(html, /공통 빌드·테스트 경로 확인 1개 프로젝트/);
  assert.match(html, /오름차순 정렬 전제/);
  assert.match(html, /제자리 정렬과 원본 변경/);
  assert.match(html, /&lt;maven.compiler.source&gt;21/);
  assert.doesNotMatch(html, /<maven.compiler.source>/);
  assert.doesNotMatch(html, /Claude Code 선택 경로/);
  assert.doesNotMatch(html, /<details[^>]* open/);
});

test('공통 설치 절차와 개별 런타임 조건을 구분하고 품질·종합에 반영한다', async () => {
  const doc = setupFixture;
  const linked = doc.documents.map(item => ({ markdown: item.markdown, metadata: { path: item.path, sha: item.path, representativeId: item.path.includes('/pdf/') ? 'skill-pdf-text' : 'skill-xlsx-edit' } }));
  const usage = analyzeUsage({ name: doc.repository }, doc.markdown, now, doc.metadata, linked);
  const report = createReport('weekly', [{ ...row, name: doc.repository, usage }], now);
  Object.assign(report, synthesizeReport(report, 'weekly', now));
  const page = await mount(async () => ({ ok: true, json: async () => ({ reports: { weekly: report } }) }), { hash: '#weekly' });
  const html = page.container.innerHTML;
  assert.match(html, /분석 품질 · 기본 항목 충족/);
  assert.match(html, /설치 경로 확인 1개 프로젝트 · 대표 실행 조건 확인 2개 항목/);
  assert.match(html, /설치 근거: 확인 · 대표 실행 조건: 2\/2개 스킬 확인/);
  assert.match(html, /모음 공통의 설치 경로/);
  assert.match(html, /문서가 전제한 환경/);
  assert.match(html, /선택 경로의 추가 조건/);
  assert.match(html, /로컬 설치를 확인한 결과가 아닙니다/);
  assert.match(html, /종료 코드만 보지 말고 JSON/);
  assert.doesNotMatch(html, /시작 절차를 자동으로 찾지 못했습니다/);
  assert.doesNotMatch(html, /<details[^>]* open/);
});

test('새 모음의 확인된 대표 항목과 2/2 품질·종합을 한국어로 제공하고 원문은 접어 둔다', async () => {
  const doc = collectionDocs.find(item => item.repository === 'anthropics/skills');
  const linked = skillDocs.filter(item => item.repository === doc.repository).map(item => ({ markdown: item.markdown, metadata: { path: item.path, sha: item.path, representativeId: skillExamples.find(spec => spec.path === item.path).id } }));
  const usage = analyzeUsage({ name: doc.repository }, doc.markdown, now, doc.metadata, [...doc.linkedDocuments, ...linked]);
  const report = createReport('daily', [{ ...row, name: doc.repository, usage }], now);
  Object.assign(report, synthesizeReport(report, 'daily', now));
  const page = await mount(async () => ({ ok: true, json: async () => ({ reports: { daily: report } }) }));
  const html = page.container.innerHTML;
  assert.match(html, /대표 항목 근거: 2\/2개 확인/);
  assert.match(html, /대표 항목 사용 예 · 2개/);
  assert.match(html, /페이지에서 추출한 텍스트를 문자열 변수 text에 누적/);
  assert.match(html, /LibreOffice 재계산/);
  assert.doesNotMatch(html, /개별 스킬 문서 확인이 필요합니다/);
  assert.doesNotMatch(html, /<details[^>]* open/);
});

test('입력만 공통 계약인 모음은 입력을 유지하고 대표 분석 미지원을 0/0 성공으로 표시하지 않는다', async () => {
  const doc = collectionDocs.find(item => item.repository === 'pbakaus/impeccable');
  const value = analyzeUsage({ name: doc.repository }, doc.markdown, now, doc.metadata, doc.linkedDocuments);
  value.version = 11; value.analyzerVersion = 11; value.quality = assessQuality(value);
  const report = createReport('daily', [{ ...row, name: doc.repository, usage: value }], now);
  Object.assign(report, synthesizeReport(report, 'daily', now));
  const page = await mount(async () => ({ ok: true, json: async () => ({ reports: { daily: report } }) }));
  const html = page.container.innerHTML;
  assert.match(html, /공통 출력 · 해당 없음/);
  assert.match(html, /공통 입력<\/h5>/);
  assert.match(html, /명령 이름과 적용할 대상 영역을 지정합니다/);
  assert.match(html, /대표 항목 자동 분석 미지원 모음 1개/);
  assert.match(html, /개별 스킬 문서 확인이 필요합니다/);
  assert.doesNotMatch(html, /대표 항목 근거: 0\/0/);
});

test('대표 항목은 한국어 사용 예와 별도 입출력을 표시하고 원문은 접힌 근거로 제공한다', async () => {
  const name = 'anthropics/knowledge-work-plugins';
  const docs = representativeDocs.filter(item => item.repository === name).map(item => ({ markdown: item.markdown, metadata: { path: item.path, sha: item.id, representativeId: item.id, html_url: `https://github.com/${name}/blob/main/${item.path}` } }));
  const value = analyzeUsage({ name }, '# Knowledge work plugins', now, {}, docs);
  const page = await mount(async () => ({ ok: true, json: async () => ({ reports: { daily: createReport('daily', [{ ...row, name, usage: value }], now) } }) }));
  const html = page.container.innerHTML;
  assert.match(html, /모음 전체의 공통 입출력이 아니며 실행은 검증하지 않았습니다/);
  assert.match(html, /기업 고객용 SSO/);
  assert.match(html, /후속 이메일 초안/);
  assert.match(html, /모음 전체의 출력/);
  assert.match(html, /PRD 작성 · 입력의 원문 근거/);
  assert.doesNotMatch(html, /<details[^>]* open/);
});

test('품질 표시와 종합에서 해당 없음·근거 부족·대표 항목을 구분하고 근거를 접어 제공한다', async () => {
  const name = 'anthropics/knowledge-work-plugins';
  const docs = representativeDocs.filter(item => item.repository === name).map(item => ({ markdown: item.markdown, metadata: { path: item.path, sha: item.id, representativeId: item.id } }));
  const value = analyzeUsage({ name }, '# Plugins\nPlugins that turn Claude into a specialist for your role, team, and company.\n\nEach plugin bundles the skills, connectors, slash commands, and sub-agents for a specific job function.', now, {}, docs);
  const unknown = { ...row, usage: analyzeUsage(row, '# Unknown', now) };
  const report = createReport('daily', [{ ...row, name, usage: value }, unknown], now);
  Object.assign(report, synthesizeReport(report, 'daily', now));
  const page = await mount(async () => ({ ok: true, json: async () => ({ reports: { daily: report } }) }));
  const html = page.container.innerHTML;
  assert.match(html, /공통 입력·출력 · 해당 없음/);
  assert.match(html, /공통 출력: 확인 0개 · 해당 없음 1개 · 근거 부족 1개/);
  assert.match(html, /대표 항목 사용 예 · 2개/);
  assert.match(html, /대표 항목 근거: 2\/2개 확인/);
  assert.match(html, /모음형 입출력 평가 범위의 원문 근거/);
  assert.match(html, /출력 · 근거 부족/);
  assert.doesNotMatch(html, /<details[^>]* open/);
});

test('문서를 읽었지만 부분 분석인 상태와 미확인 항목을 독립적으로 표시한다', async () => {
  const partial = analyzeUsage({ ...row, description: 'Unknown' }, '# Unknown', now);
  const { container, attributes } = await mount(async () => ({ ok: true, json: async () => dataFor(partial) }));
  assert.match(container.innerHTML, /문서 조회 · 성공/);
  assert.match(container.innerHTML, /분석 품질 · 부분 분석/);
  assert.match(container.innerHTML, /미확인 항목: 용도 분류, 핵심 기능 근거, 시작 경로/);
  assert.equal(attributes['aria-busy'], 'false');
});

test('원문 근거를 표시하고 원문 문자열을 HTML로 실행하지 않는다', async () => {
  const value = structuredClone(usage);
  value.evidence[0].excerpt = '<img src=x onerror=alert(1)> Voice cloning';
  const { container } = await mount(async () => ({ ok: true, json: async () => dataFor(value) }));
  assert.match(container.innerHTML, /원문 근거 · README/);
  assert.match(container.innerHTML, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(container.innerHTML, /<img src=x/);
});

test('문서 재조회 실패와 이전 분석의 품질을 동시에 표시한다', async () => {
  const value = { ...usage, stale: true, document: { status: 'unavailable' } };
  const { container } = await mount(async () => ({ ok: true, json: async () => dataFor(value) }));
  assert.match(container.innerHTML, /문서 조회 · 실패/);
  assert.match(container.innerHTML, /분석 품질 · 기본 항목 충족/);
  assert.match(container.innerHTML, /이전 분석을 표시합니다/);
});

test('보고서 로딩 실패 후 재시도하면 분석을 다시 표시한다', async () => {
  let calls = 0;
  const page = await mount(async () => { if (++calls === 1) throw new Error('network'); return { ok: true, json: async () => dataFor(usage) }; });
  assert.match(page.container.innerHTML, /보고서를 불러오지 못했습니다/);
  await page.events.click();
  assert.match(page.container.innerHTML, /문서 조회 · 성공/);
  assert.match(page.container.innerHTML, /원문 근거/);
});

test('종합 분포·공통 조건의 근거와 문서 확인·본문 분석 시각을 표시한다', async () => {
  const first = { ...row, usage };
  const secondRow = { ...row, name: 'example/second' };
  const second = { ...secondRow, usage: analyzeUsage(secondRow, '# Voice\nVoice cloning.\n## Input\nText.\n## Output\nAudio.\n## Install\nRequires Python 3.11.', now) };
  const report = createReport('daily', [first, second], now);
  Object.assign(report, synthesizeReport(report, 'daily', now));
  const { container } = await mount(async () => ({ ok: true, json: async () => ({ reports: { daily: report } }) }));
  assert.match(container.innerHTML, /프로젝트 분석 종합/);
  assert.match(container.innerHTML, /음성 제작<\/strong> 2\/2/);
  assert.match(container.innerHTML, /도입 조건 · Python \(2개\)/);
  assert.match(container.innerHTML, /해당 경로 요구사항/);
  assert.match(container.innerHTML, /문서 확인 ·/);
  assert.match(container.innerHTML, /본문 분석 ·/);
  assert.match(container.innerHTML, /분석 갱신 ·/);
});

test('부분 분석과 오래된 분석을 동시에 표시하고 확인 실패와 주기 초과를 구분한다', async () => {
  const partial = analyzeUsage({ ...row, description: 'Unknown' }, '# Unknown', new Date('2026-11-01T00:23:00Z'));
  const { container } = await mount(async () => ({ ok: true, json: async () => dataFor(partial) }));
  assert.match(container.innerHTML, /badge--partial/);
  assert.match(container.innerHTML, /분석 품질 · 부분 분석/);
  assert.match(container.innerHTML, /badge--old/);
  assert.match(container.innerHTML, /문서 최신성 · 오래된 분석/);
  assert.match(container.innerHTML, /확인 주기를 넘겼습니다/);
  assert.doesNotMatch(container.innerHTML, /최신 문서 조회에 실패해/);
});

test('기본 항목이 충족돼도 문서가 오래됐으면 최신으로 표시하지 않는다', async () => {
  const old = { ...usage, sourceCheckedAt: '2026-11-01T00:23:00Z' };
  const page = await mount(async () => ({ ok: true, json: async () => dataFor(old) }));
  assert.match(page.container.innerHTML, /분석 품질 · 기본 항목 충족/);
  assert.match(page.container.innerHTML, /문서 최신성 · 오래된 분석/);
  assert.doesNotMatch(page.container.innerHTML, /문서 최신성 · 확인 주기 이내/);
});

test('빌드가 제공한 문서 확인 주기를 사용하고 미래 시각을 최신으로 단정하지 않는다', async () => {
  const page = await mount(async () => ({ ok: true, json: async () => ({ ...dataFor(usage), documentMaxAgeMs: 3600000 }) }), { at: new Date(now.getTime() + 2 * 3600000) });
  assert.match(page.container.innerHTML, /오래된 분석/);
  const future = { ...usage, sourceCheckedAt: '2027-01-01T00:00:00Z' };
  const unknown = await mount(async () => ({ ok: true, json: async () => dataFor(future) }));
  assert.match(unknown.container.innerHTML, /확인 시각 미확인/);
  assert.doesNotMatch(unknown.container.innerHTML, /문서 최신성 · 확인 주기 이내/);
});

test('재시도 중에는 중복 요청을 막고 성공하면 같은 기간의 결과 제목에 초점을 둔다', async () => {
  let calls = 0, resolve;
  const weekly = createReport('weekly', [{ ...row, usage }], now);
  const page = await mount(async (_url, options) => {
    assert.ok(options.signal instanceof AbortSignal);
    if (++calls === 1) throw Error('network');
    return new Promise(done => { resolve = done; });
  }, { hash: '#weekly' });
  assert.equal(page.state.focused, null);
  const pending = page.events.click();
  await page.events.click();
  assert.equal(calls, 2);
  assert.equal(page.attributes['aria-busy'], 'true');
  assert.match(page.container.innerHTML, /button type="button" disabled/);
  assert.match(page.status.textContent, /불러오고 있습니다/);
  resolve({ ok: true, json: async () => ({ reports: { weekly } }) });
  await pending;
  assert.match(page.container.innerHTML, /한 주의 발견/);
  assert.equal(page.state.focused, 'report-title');
  assert.equal(page.attributes['aria-busy'], 'false');
  assert.match(page.status.textContent, /한 주의 발견 1개/);
});

test('재시도가 다시 실패하면 버튼에 초점을 되돌리고 다시 시도할 수 있다', async () => {
  let calls = 0;
  const page = await mount(async () => { if (++calls < 3) return { ok: false }; return { ok: true, json: async () => dataFor(usage) }; });
  await page.events.click();
  assert.equal(page.state.focused, 'retry');
  assert.equal(page.attributes['aria-busy'], 'false');
  await page.events.click();
  assert.equal(page.state.focused, 'report-title');
  assert.match(page.container.innerHTML, /도입 시 주의점/);
});

test('잘못된 보고서 파일도 오류로 처리하고 재시도 후 복구한다', async () => {
  let calls = 0;
  const page = await mount(async () => ({ ok: true, json: async () => ++calls === 1 ? { reports: { daily: { rows: 'invalid' } } } : dataFor(usage) }));
  assert.match(page.container.innerHTML, /보고서를 불러오지 못했습니다/);
  page.location.hash = '#weekly';
  page.globalEvents.hashchange();
  assert.match(page.container.innerHTML, /보고서를 불러오지 못했습니다/);
  page.location.hash = '#daily';
  await page.events.click();
  assert.match(page.container.innerHTML, /도입 시 주의점/);
});

test('프로젝트 한 건이 손상돼도 다른 프로젝트와 근거를 읽을 수 있다', async () => {
  const data = dataFor(usage);
  data.reports.daily.rows.unshift(null);
  const page = await mount(async () => ({ ok: true, json: async () => data }));
  assert.match(page.container.innerHTML, /이 프로젝트의 분석을 표시하지 못했습니다/);
  assert.match(page.container.innerHTML, /example\/voice/);
  assert.match(page.container.innerHTML, /원문 근거 1개 보기/);
  assert.doesNotMatch(page.container.innerHTML, /보고서를 불러오지 못했습니다/);
});

test('핵심 판단을 상세 접기 영역보다 먼저 제공하고 빈 결과를 알린다', async () => {
  const page = await mount(async () => ({ ok: true, json: async () => dataFor(usage) }));
  assert.ok(page.container.innerHTML.indexOf('도입 시 주의점') < page.container.innerHTML.indexOf('class="analysis-details"'));
  assert.ok(page.container.innerHTML.indexOf('입력</h5>') < page.container.innerHTML.indexOf('class="analysis-details"'));
  const empty = await mount(async () => ({ ok: true, json: async () => ({ reports: {} }) }));
  assert.match(empty.container.innerHTML, /첫 번째 발견을 기다립니다/);
  assert.match(empty.status.textContent, /발행된 프로젝트가 없습니다/);
});

test('주간에서 본문 건너뛰기 링크로 이동해도 일간으로 바뀌지 않는다', async () => {
  const weekly = createReport('weekly', [{ ...row, usage }], now);
  const page = await mount(async () => ({ ok: true, json: async () => ({ reports: { weekly } }) }), { hash: '#weekly' });
  const before = page.container.innerHTML;
  page.location.hash = '#main';
  page.globalEvents.hashchange();
  assert.equal(page.container.innerHTML, before);
  assert.match(page.status.textContent, /한 주의 발견/);
});

test('재시도 중 사용자가 기간 링크로 이동했다면 완료 후 초점을 빼앗지 않는다', async () => {
  let calls = 0, resolve;
  const weekly = createReport('weekly', [{ ...row, usage }], now);
  const page = await mount(async () => {
    if (++calls === 1) throw Error('network');
    return new Promise(done => { resolve = done; });
  });
  const pending = page.events.click();
  page.document.activeElement = { id: 'weekly-link' };
  page.location.hash = '#weekly';
  page.globalEvents.hashchange();
  resolve({ ok: true, json: async () => ({ reports: { weekly } }) });
  await pending;
  assert.equal(page.state.focused, null);
  assert.match(page.container.innerHTML, /한 주의 발견/);
  assert.match(page.status.textContent, /한 주의 발견 1개/);
});

test('첫 로딩 실패 중 본문 건너뛰기를 사용해도 재시도할 기간을 유지한다', async () => {
  let calls = 0;
  const weekly = createReport('weekly', [{ ...row, usage }], now);
  const page = await mount(async () => { if (++calls === 1) throw Error('network'); return { ok: true, json: async () => ({ reports: { weekly } }) }; }, { hash: '#weekly' });
  page.location.hash = '#main';
  page.globalEvents.hashchange();
  await page.events.click();
  assert.match(page.container.innerHTML, /한 주의 발견/);
  assert.match(page.status.textContent, /한 주의 발견 1개/);
});

test('AI 추가 해석은 기본 판단과 품질을 유지하며 근거와 함께 구분해 표시한다', async () => {
  const value = structuredClone(usage);
  value.ai = { status: 'ready', analyzedAt: now.toISOString(), insights: ['adoption', 'tradeoff', 'validation'].map(id => ({ id, analysis: '문서에 따라 판단할 추가 해석이며 실제 실행을 검증한 내용은 아닙니다.', citations: [{ evidenceId: value.evidence[0].id, quote: value.evidence[0].excerpt }] })) };
  const page = await mount(async () => ({ ok: true, json: async () => dataFor(value) }));
  assert.match(page.container.innerHTML, /선택적 AI 심층 분석/);
  assert.match(page.container.innerHTML, /도입 관점/);
  assert.match(page.container.innerHTML, /제약과 절충/);
  assert.match(page.container.innerHTML, /작은 검증 제안/);
  assert.match(page.container.innerHTML, /사실 보증은 아닙니다/);
  assert.match(page.container.innerHTML, /분석 품질 · 기본 항목 충족/);
  assert.match(page.container.innerHTML, /도입 시 주의점/);
});

test('AI 검토 실패는 원인 안내와 기본 분석으로 표시하고 오래된 AI 해석은 숨긴다', async () => {
  const failed = { ...usage, ai: { status: 'fallback', reason: 'verification-failed' } };
  const fallback = await mount(async () => ({ ok: true, json: async () => dataFor(failed) }));
  assert.match(fallback.container.innerHTML, /근거 검토를 통과하지 못해/);
  assert.match(fallback.container.innerHTML, /규칙 기반 분석으로 제공/);
  assert.match(fallback.container.innerHTML, /도입 시 주의점/);
  const old = { ...usage, sourceCheckedAt: '2026-11-01T00:23:00Z', ai: { status: 'ready', insights: [{ analysis: '노출되면 안 되는 이전 AI 내용' }] } };
  const hidden = await mount(async () => ({ ok: true, json: async () => dataFor(old) }));
  assert.match(hidden.container.innerHTML, /문서의 최신성을 확인하지 못해 AI 해석을 표시하지 않습니다/);
  assert.doesNotMatch(hidden.container.innerHTML, /노출되면 안 되는 이전 AI 내용/);
});

test('손상된 AI 노트만 실패 처리하고 규칙 기반 판단은 계속 표시한다', async () => {
  const malformed = { ...usage, ai: { status: 'ready', insights: [{}, {}, {}] } };
  const page = await mount(async () => ({ ok: true, json: async () => dataFor(malformed) }));
  assert.match(page.container.innerHTML, /AI 해석을 표시하지 못해 기본 분석을 제공합니다/);
  assert.match(page.container.innerHTML, /도입 시 주의점/);
  assert.doesNotMatch(page.container.innerHTML, /이 프로젝트의 분석을 표시하지 못했습니다/);
});

test('첫 화면은 한국어 동작·주의점을 표시하고 원문은 접힌 근거 안에 둔다', async () => {
  const page = await mount(async () => ({ ok: true, json: async () => dataFor(usage) }));
  const html = page.container.innerHTML;
  let depth = 0, visible = '';
  for (const match of html.matchAll(/<\/?details\b[^>]*>|<[^>]*>|[^<]+/g)) {
    if (/^<details\b/.test(match[0])) depth++;
    else if (/^<\/details/.test(match[0])) depth--;
    else if (!depth && !match[0].startsWith('<')) visible += match[0];
  }
  assert.match(visible, /핵심 동작/);
  assert.match(visible, /도입 시 주의점/);
  assert.match(visible, /음성 복제/);
  assert.doesNotMatch(visible, /Voice cloning is supported|Generated speech audio|Requires Python|Text and a reference/);
  assert.match(html, /<blockquote>Voice cloning is supported/);
  assert.doesNotMatch(html, /<details[^>]*\bopen\b/);
  assert.ok(html.indexOf('핵심 동작') < html.indexOf('도입 시 주의점'));
});

test('연결 문서 조회 실패는 README 분석과 구분해 표시하고 실제 문서 경로로 근거를 연결한다', async () => {
  const value = structuredClone(usage);
  value.document.links = [{ path: 'docs/install.md', status: 'unavailable', checkedAt: now.toISOString() }];
  value.sources[0].path = 'docs/README_EN.md';
  value.sources[0].url = 'https://github.com/example/voice/blob/main/docs/README_EN.md';
  const page = await mount(async () => ({ ok: true, json: async () => dataFor(value) }));
  assert.match(page.container.innerHTML, /추가 문서 1개를 확인하지 못했습니다/);
  assert.match(page.container.innerHTML, /읽은 문서의 근거만 표시/);
  assert.match(page.container.innerHTML, /문서 조회 · 성공/);
  assert.match(page.container.innerHTML, /href="https:\/\/github.com\/example\/voice\/blob\/main\/docs\/README_EN.md"/);
});

test('크기 상한으로 제외한 문서를 네트워크 실패나 매번 재시도 대상으로 표시하지 않는다', async () => {
  const value = structuredClone(usage);
  value.document.links = [{ path: 'packages/cli/README.md', status: 'unavailable', reason: 'size-limit', checkedAt: now.toISOString() }];
  const page = await mount(async () => ({ ok: true, json: async () => dataFor(value) }));
  assert.match(page.container.innerHTML, /250,000바이트 또는 프로젝트당 750,000바이트 상한을 넘어 분석에서 제외/);
  assert.match(page.container.innerHTML, /packages\/cli\/README.md · 분석 제외/);
  assert.doesNotMatch(page.container.innerHTML, /추가 문서 1개를 확인하지 못했습니다|다음 수집에서 재시도/);
  assert.match(page.container.innerHTML, /문서 조회 · 성공/);
});
