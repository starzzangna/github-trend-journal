import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { analyzeUsage } from '../scripts/usage.mjs';
import { createReport } from '../scripts/trends.mjs';
import { synthesizeReport } from '../scripts/report.mjs';

const script = await readFile(new URL('../web/app.js', import.meta.url), 'utf8');
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
