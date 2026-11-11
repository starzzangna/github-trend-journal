import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeUsage } from '../scripts/usage.mjs';
import { createAiAnalyzer, aiModel, buildAiPacket, validateAiInsights, validateAiNote } from '../scripts/ai.mjs';
import { collectPublication } from '../scripts/publication.mjs';
import { validatePublication } from '../scripts/contracts.mjs';

const now = new Date('2026-11-11T00:23:00Z');
const env = { AI_ANALYSIS_ENABLED: '1', AI_MAX_COST_USD: '0.05', OPENAI_API_KEY: 'test-only-not-a-real-key' };
const markdown = '# Browser\nBrowser automation for collecting records.\n## Input\nA URL.\n## Output\nJSON records.\n## Quick start\nRequires Node.js 22.';
function sample(name = 'sample/tool', date = now, sha = 'test-document-sha') {
  const row = { name, description: 'Browser automation', language: 'JavaScript' };
  return { row, usage: analyzeUsage(row, markdown, date, { path: 'README.md', sha, html_url: `https://github.com/${name}/blob/main/README.md` }) };
}
function candidate(packet) {
  const choose = section => { const item = packet.evidence.find(item => item.section === section); return [{ evidenceId: item.id, quote: item.excerpt }]; };
  return { insights: [
    { id: 'adoption', analysis: '문서에 제시된 웹 페이지 입력을 현재 작업에 대입해, 필요한 자료를 처리하는 흐름인지 작은 범위에서 검토할 수 있습니다.', citations: choose('Input') },
    { id: 'tradeoff', analysis: '문서의 설치 경로에 명시된 실행 환경을 먼저 확인하고, 해당 환경을 유지할 수 있는지 검토하는 것이 도입 판단에 도움이 됩니다.', citations: choose('Quick start') },
    { id: 'validation', analysis: '동일한 웹 페이지를 입력해 문서에 제시된 출력 형식과 실제 응답이 맞는지 확인하는 작은 실험을 제안합니다.', citations: choose('Output') }
  ] };
}
function apiResponse(value, overrides = {}) {
  return new Response(JSON.stringify({ model: aiModel, status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(value) }] }], usage: { input_tokens: 100, output_tokens: 100 }, ...overrides }), { status: 200 });
}
function provider({ generation = candidate, verification = input => ({ checks: input.candidate.insights.map(item => ({ id: item.id, supported: true })) }) } = {}) {
  const calls = [];
  const fetcher = async (url, options) => {
    const body = JSON.parse(options.body);
    calls.push({ url, options, body });
    const input = JSON.parse(body.input);
    return apiResponse(body.text.format.name === 'project_analysis' ? generation(input) : verification(input));
  };
  return { fetcher, calls };
}

test('AI가 기본 비활성화돼 있고 키가 있어도 명시적 활성화 없이는 호출하지 않는다', async () => {
  const { row, usage } = sample();
  for (const settings of [{}, { OPENAI_API_KEY: env.OPENAI_API_KEY }, { ...env, AI_ANALYSIS_ENABLED: 'yes' }]) {
    const ai = createAiAnalyzer({ env: settings, now, fetcher: () => { throw Error('호출 금지'); } });
    assert.deepEqual(await ai.enrich(row, usage), usage);
    assert.equal(ai.summary().reservedCostUsd, 0);
  }
});

test('생성과 별도 근거 검토를 통과한 추가 노트만 적용하며 기본 분석은 유지한다', async () => {
  const { row, usage } = sample();
  const mock = provider();
  const ai = createAiAnalyzer({ env, now, fetcher: mock.fetcher });
  const result = await ai.enrich(row, usage);
  assert.equal(result.ai.status, 'ready');
  assert.equal(mock.calls.length, 2);
  validateAiNote(row, result);
  assert.deepEqual(result.article, usage.article);
  assert.deepEqual(result.quality, usage.quality);
  assert.equal(usage.ai, undefined);
  for (const call of mock.calls) {
    assert.equal(call.url, 'https://api.openai.com/v1/responses');
    assert.equal(call.options.redirect, 'error');
    assert.equal(call.options.headers.Authorization, `Bearer ${env.OPENAI_API_KEY}`);
    assert.equal(call.body.store, false);
    assert.deepEqual(call.body.tools, []);
    assert.equal(call.body.text.format.strict, true);
    assert.ok(!call.options.body.includes(env.OPENAI_API_KEY));
  }
  assert.ok(ai.summary().reservedCostUsd <= Number(env.AI_MAX_COST_USD));
  assert.ok(ai.summary().reportedCostUsd < ai.summary().reservedCostUsd);
});

test('유효하지 않은 근거 ID·원문에 없는 인용·근거 없는 수치를 거부한다', () => {
  const { row, usage } = sample();
  const packet = buildAiPacket(row, usage);
  for (const mutate of [
    value => { value.insights[0].citations[0].evidenceId = 'invented'; },
    value => { value.insights[0].citations[0].quote = 'This project is ten times faster.'; },
    value => { value.insights[0].analysis += ' 처리 속도가 500배 높습니다.'; },
    value => { value.insights[0].analysis += ' 실제로 검증했습니다.'; },
    value => { value.insights[0].extra = 'unknown'; }
  ]) {
    const invalid = candidate(packet); mutate(invalid);
    assert.throws(() => validateAiInsights(invalid, packet));
  }
});

test('ID와 인용이 맞아도 해석이 근거를 벗어나면 별도 검토에서 거부한다', async () => {
  const { row, usage } = sample();
  const mock = provider({ generation: packet => { const value = candidate(packet); value.insights[0].analysis = '이 도구는 문서에서 명시하지 않은 의료 진단 기능까지 지원하므로 진료 자동화에 바로 도입해도 적합한 제품이라고 판단합니다.'; return value; }, verification: input => ({ checks: input.candidate.insights.map(item => ({ id: item.id, supported: item.id !== 'adoption' })) }) });
  const ai = createAiAnalyzer({ env, now, fetcher: mock.fetcher });
  const result = await ai.enrich(row, usage);
  assert.equal(mock.calls.length, 2);
  assert.equal(result.ai.reason, 'verification-failed');
  assert.equal(result.ai.insights, undefined);
  assert.deepEqual(result.article, usage.article);
  assert.ok(!JSON.stringify(result).includes('의료 진단'));
});

test('일치하는 인용이 없으면 추가 검토 요청도 보내지 않고 규칙 분석으로 복구한다', async () => {
  const { row, usage } = sample();
  const mock = provider({ generation: packet => { const value = candidate(packet); value.insights[0].citations[0].quote = 'made up support'; return value; } });
  const ai = createAiAnalyzer({ env, now, fetcher: mock.fetcher });
  const result = await ai.enrich(row, usage);
  assert.equal(result.ai.reason, 'ungrounded');
  assert.equal(mock.calls.length, 1);
  assert.deepEqual(result.article, usage.article);
  assert.ok(ai.summary().reservedCostUsd > ai.summary().reportedCostUsd);
});

test('생성·검증 최대 비용을 함께 예약하고 예산 부족 시 외부 요청을 보내지 않는다', async () => {
  const { row, usage } = sample();
  const blocked = createAiAnalyzer({ env: { ...env, AI_MAX_COST_USD: '0.000001' }, now, fetcher: () => { throw Error('호출 금지'); } });
  assert.equal((await blocked.enrich(row, usage)).ai.reason, 'budget');
  assert.equal(blocked.summary().attemptedProjects, 0);
  const mock = provider();
  const ai = createAiAnalyzer({ env, now, fetcher: mock.fetcher });
  await ai.enrich(row, usage);
  const next = sample('sample/second');
  assert.equal((await ai.enrich(next.row, next.usage)).ai.reason, 'budget');
  assert.equal(mock.calls.length, 2);
  assert.ok(ai.summary().reservedCostUsd <= 0.05);
});

test('시간 초과 시 예약 비용을 되돌리지 않고 남은 AI 호출도 중단한다', async () => {
  const { row, usage } = sample();
  let calls = 0;
  const ai = createAiAnalyzer({ env: { ...env, AI_MAX_COST_USD: '1', AI_TIMEOUT_MS: '100', AI_TOTAL_TIMEOUT_MS: '1000' }, now, fetcher: () => { calls++; return new Promise(() => {}); } });
  const result = await ai.enrich(row, usage);
  assert.equal(result.ai.reason, 'timeout');
  assert.deepEqual(result.article, usage.article);
  const next = sample('sample/second');
  assert.equal((await ai.enrich(next.row, next.usage)).ai.reason, 'timeout');
  assert.equal(calls, 1);
  assert.ok(ai.summary().reservedCostUsd > 0);
});

test('전송 계층이 AbortError로 종료해도 시간 초과로 분류한다', async () => {
  const { row, usage } = sample();
  const ai = createAiAnalyzer({ env: { ...env, AI_TIMEOUT_MS: '100' }, now, fetcher: (_url, options) => new Promise((_, reject) => options.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true })) });
  assert.equal((await ai.enrich(row, usage)).ai.reason, 'timeout');
});

test('프로젝트 수 제한과 근거 부족은 추가 비용 없이 기본 분석을 유지한다', async () => {
  const { row, usage } = sample();
  const mock = provider();
  const ai = createAiAnalyzer({ env: { ...env, AI_MAX_COST_USD: '1', AI_MAX_PROJECTS: '1' }, now, fetcher: mock.fetcher });
  await ai.enrich(row, usage);
  const next = sample('sample/second');
  assert.equal((await ai.enrich(next.row, next.usage)).ai.reason, 'project-limit');
  assert.equal(mock.calls.length, 2);
  const unknown = { ...usage, evidence: [], article: { ...usage.article, project: { problem: null, inputs: [], outputs: [], conditions: [] }, findings: [] }, classification: { evidenceIds: [] } };
  const noEvidence = createAiAnalyzer({ env, now, fetcher: () => { throw Error('호출 금지'); } });
  assert.equal((await noEvidence.enrich(row, unknown)).ai.reason, 'insufficient-evidence');
  assert.equal(noEvidence.summary().reservedCostUsd, 0);
});

test('전체 시간 제한이 끝나면 생성 성공 후에도 검증 요청 없이 복구한다', async () => {
  const { row, usage } = sample();
  let time = 0, calls = 0;
  const ai = createAiAnalyzer({ env: { ...env, AI_TIMEOUT_MS: '100', AI_TOTAL_TIMEOUT_MS: '100' }, now, clock: () => time, fetcher: async (_url, options) => { calls++; time = 101; return apiResponse(candidate(JSON.parse(JSON.parse(options.body).input))); } });
  assert.equal((await ai.enrich(row, usage)).ai.reason, 'timeout');
  assert.equal(calls, 1);
});

test('오류·거절·잘린 응답·잘못된 형식·사용량 이상은 자동 재시도 없이 복구한다', async () => {
  const { row, usage } = sample();
  for (const fetcher of [
    async () => { throw Error(`${env.OPENAI_API_KEY} 원본 제공자 오류`); },
    async () => new Response('provider body', { status: 503 }),
    async () => new Response('{invalid json'),
    async () => new Response('x'.repeat(40000)),
    async () => apiResponse({}, { status: 'incomplete' }),
    async () => apiResponse({}, { output: [{ content: [{ type: 'refusal', refusal: 'no' }] }] }),
    async () => apiResponse({}, { usage: { input_tokens: 1000000000, output_tokens: 0 } })
  ]) {
    let calls = 0;
    const ai = createAiAnalyzer({ env, now, fetcher: (...args) => { calls++; return fetcher(...args); } });
    const result = await ai.enrich(row, usage);
    assert.equal(calls, 1);
    assert.equal(result.ai.status, 'fallback');
    assert.deepEqual(result.article, usage.article);
    assert.ok(!JSON.stringify({ result, summary: ai.summary() }).includes(env.OPENAI_API_KEY));
    assert.ok(!JSON.stringify(result).includes('원본 제공자 오류'));
  }
});

test('설정 누락·부적절한 모델·만료된 단가에서는 비용을 쓰지 않는다', async () => {
  for (const [settings, at, reason] of [
    [{ ...env, OPENAI_API_KEY: '' }, now, 'configuration'],
    [{ ...env, AI_MAX_COST_USD: '' }, now, 'configuration'],
    [{ ...env, AI_MODEL: 'unpriced-model' }, now, 'configuration'],
    [env, new Date('2026-12-12T00:00:00Z'), 'pricing-expired']
  ]) {
    const { row, usage } = sample('sample/tool', at);
    const ai = createAiAnalyzer({ env: settings, now: at, fetcher: () => { throw Error('호출 금지'); } });
    assert.equal((await ai.enrich(row, usage)).ai.reason, reason);
    assert.equal(ai.summary().reservedCostUsd, 0);
  }
});

test('같은 근거의 검증된 노트를 재사용하고 기간 간 중복 호출을 막는다', async () => {
  const { row, usage } = sample();
  const mock = provider();
  const ai = createAiAnalyzer({ env, now, fetcher: mock.fetcher });
  const result = await ai.enrich(row, usage);
  assert.equal((await ai.enrich(row, usage)).ai.resultDigest, result.ai.resultDigest);
  assert.equal(mock.calls.length, 2);
  const later = new Date(now.getTime() + 3600000);
  const reused = createAiAnalyzer({ env, now: later, fetcher: () => { throw Error('호출 금지'); } });
  const updated = await reused.enrich(row, { ...result, sourceCheckedAt: later.toISOString() });
  assert.deepEqual(updated.ai, result.ai);
  assert.equal(reused.summary().reservedCostUsd, 0);
});

test('SHA가 바뀌거나 문서가 오래됐으면 이전 AI 해석을 적용하지 않는다', async () => {
  const { row, usage } = sample();
  const mock = provider();
  const ai = createAiAnalyzer({ env, now, fetcher: mock.fetcher });
  const ready = await ai.enrich(row, usage);
  const changed = sample(row.name, now, 'new-document-sha');
  const disabled = createAiAnalyzer({ now });
  const result = await disabled.enrich(row, { ...changed.usage, ai: ready.ai });
  assert.equal(result.ai, undefined);
  const stale = await ai.enrich(row, { ...ready, stale: true });
  assert.equal(stale.ai.reason, 'document-unavailable');
  assert.equal(stale.ai.insights, undefined);
  const old = await ai.enrich(row, { ...ready, sourceCheckedAt: '2026-10-01T00:00:00Z' });
  assert.equal(old.ai.reason, 'document-unavailable');
});

test('근거 패킷은 제한된 발췌만 담고 성공 후 노트가 변경되면 저장 전에 거부한다', async () => {
  const { row, usage } = sample();
  const packet = buildAiPacket(row, usage);
  assert.ok(Buffer.byteLength(JSON.stringify(packet)) <= 8000);
  assert.ok(!Object.hasOwn(packet, 'markdown'));
  const mock = provider();
  const ai = createAiAnalyzer({ env, now, fetcher: mock.fetcher });
  const result = await ai.enrich(row, usage);
  result.ai.insights[0].analysis += ' 임의로 고친 해석입니다.';
  assert.throws(() => validateAiNote(row, result));
});

test('AI 실패가 발행을 막거나 기본 분석·발행 시각·장부를 바꾸지 않는다', async () => {
  const { row, usage } = sample();
  const ledger = ['daily:2026-11-11', 'weekly:2026-11-09', 'monthly:2026-11'].map(issue => ({ issue }));
  const previous = { version: 1, ledger, reports: Object.fromEntries(['daily', 'weekly', 'monthly'].map(period => [period, { period, publishedAt: now.toISOString(), rows: [{ ...row, usage }] }])) };
  const ai = createAiAnalyzer({ env, now, fetcher: async () => new Response('failure', { status: 500 }) });
  const result = await collectPublication(previous, { now, aiAnalyzer: ai, fetcher: () => { throw Error('문서 재조회 금지'); } });
  validatePublication(result.state);
  assert.deepEqual(result.state.ledger, ledger);
  assert.equal(ai.summary().attemptedProjects, 1);
  for (const report of Object.values(result.state.reports)) {
    assert.deepEqual(report.rows[0].usage.article, usage.article);
    assert.equal(report.rows[0].usage.ai.status, 'fallback');
    assert.equal(report.publishedAt, now.toISOString());
  }
  assert.equal(previous.reports.daily.rows[0].usage.ai, undefined);
});
