import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { analyzeUsage, fetchUsage } from '../scripts/usage.mjs';
import { fetchLinkedDocuments } from '../scripts/linked.mjs';
import { validateUsage, validatePublication } from '../scripts/contracts.mjs';
import { assessQuality } from '../scripts/evidence.mjs';
import { addKoreanPresentation } from '../scripts/korean.mjs';
import { createReport } from '../scripts/trends.mjs';
import { synthesizeReport } from '../scripts/report.mjs';

const fixture = JSON.parse(await readFile(new URL('./fixtures/improve-setup.json', import.meta.url)));
const now = new Date('2026-11-12T00:00:00Z');
async function load({ omit, markdown = fixture.markdown, mutate = text => text } = {}) {
  const calls = [];
  const fetcher = async (url, options) => {
    calls.push({ url, options });
    const document = fixture.documents.find(item => url.endsWith('/' + item.path));
    return document && document.path !== omit ? new Response(mutate(document.markdown, document.path)) : new Response('', { status: 404 });
  };
  const linked = await fetchLinkedDocuments(markdown, fixture.repository, fixture.metadata, { now, fetcher });
  const usage = analyzeUsage({ name: fixture.repository }, markdown, now, fixture.metadata, linked.documents);
  usage.document.links = linked.states;
  validateUsage(usage);
  return { usage, calls, fetcher };
}

test('공식 설치·호환 환경과 계획·위임 조건을 확보해 도입 조건 미확인을 보완한다', async () => {
  const { usage, calls } = await load();
  assert.equal(usage.quality.status, 'complete');
  assert.deepEqual(usage.quality.missing, []);
  assert.equal(usage.start.command, 'npx skills add shadcn/improve');
  assert.deepEqual(usage.quality.setup, { installation: 'documented', workflowExpected: 2, workflowAvailable: 2, missing: [] });
  assert.equal(usage.article.project.conditions.length, 1);
  assert.equal(usage.article.project.conditions[0].scope, 'mentioned');
  assert.deepEqual(usage.quality.io, { input: 'documented', output: 'documented' });
  assert.equal(calls.length, 2);
  assert.ok(calls.every(item => item.options.redirect === 'error' && !item.options.headers.Authorization));
});

test('Agent Skills 설치 호환성과 격리 실행자 호스트 조건·사용자 병합 판단을 구분한다', async () => {
  const setup = (await load()).usage.article.project.setup;
  assert.match(setup.installation.body, /모든 호스트의 자동 실행 위임 지원을 뜻하지/);
  assert.match(setup.workflows[0].conditions[0].body, /소스를 직접 수정하지/);
  assert.match(setup.workflows[0].conditions[1].body, /기준 Git 커밋/);
  assert.match(setup.workflows[1].conditions[0].body, /수동 실행자에게 인계/);
  assert.match(setup.workflows[1].conditions[1].body, /드리프트/);
  assert.match(setup.workflows[1].conditions[2].body, /사용자의 결정/);
  assert.equal(setup.workflows[0].expected, 2);
  assert.equal(setup.workflows[1].expected, 3);
  assert.deepEqual(setup.runtimes, []);
});

test('참조 문서 실패 시 위임 조건만 부족으로 남기고 재조회하면 복구한다', async () => {
  const missing = (await load({ omit: 'skills/improve/references/closing-the-loop.md' })).usage;
  assert.equal(missing.quality.setup.workflowAvailable, 1);
  assert.ok(missing.quality.missing.includes('작업 조건: execute · 실행 위임'));
  assert.equal(missing.article.project.setup.workflows[0].conditions.length, 2);
  assert.equal(missing.article.project.setup.workflows[1].conditions.length, 1);
  assert.ok(missing.document.links.some(item => item.httpStatus === 404));
  assert.equal((await load()).usage.quality.setup.workflowAvailable, 2);
});

test('설치·호환 문구 누락과 위임 조건 변경을 근거 부족으로 남긴다', async () => {
  const noInstall = (await load({ markdown: fixture.markdown.replace('Works in any agent that supports', 'Changed host support') })).usage;
  assert.equal(noInstall.article.project.setup.installation, null);
  assert.ok(noInstall.quality.missing.includes('설치·호환 환경'));
  const changed = (await load({ mutate: text => text.replace('Requires a host agent that can spawn subagents in an isolated worktree', 'Changed host requirements') })).usage;
  assert.ok(changed.quality.missing.includes('작업 조건: execute · 실행 위임'));
  assert.equal(changed.quality.status, 'partial');
});

test('공식 스킬의 실제 참조 링크만 따라가고 문서에 없는 참조 경로를 추정하지 않는다', async () => {
  const changed = await load({ mutate: text => text.replaceAll('references/closing-the-loop.md', 'https://example.com/closing-the-loop.md') });
  assert.equal(changed.calls.length, 1);
  assert.ok(changed.usage.quality.missing.includes('작업 조건: execute · 실행 위임'));
  const empty = await load({ markdown: '# Unknown\n```text\nAn agent skill that audits any codebase and writes implementation plans for other agents to execute\n```' });
  assert.equal(empty.calls.length, 0);
});

test('작업 조건의 공통 환경 승격·출처 교체·허위 범용 위임 보증을 거부한다', async () => {
  for (const mutate of [
    value => { value.article.project.conditions.push({ ...value.article.project.setup.workflows[1].conditions[0], scope: 'required' }); },
    value => { value.article.project.setup.workflows[1].conditions[1].evidenceIds = value.article.project.setup.installation.evidenceIds; },
    value => { value.article.project.setup.workflows[1].conditions[0].body = '모든 에이전트에서 자동 위임할 수 있습니다.'; },
    value => { value.quality.setup.workflowAvailable = 99; },
    value => { value.start.command = 'unverified install'; }
  ]) {
    const { usage } = await load(); mutate(usage); addKoreanPresentation(usage);
    assert.throws(() => validateUsage(usage), /조건|경로|혼합/);
  }
});

test('참조 문서 SHA가 바뀌면 재분석하고 같으면 기존 분석을 재사용한다', async () => {
  const value = await load(); let changed = false;
  const fetcher = async (url, options) => url.includes('api.github.com') ? { ok: true, json: async () => ({ ...fixture.metadata, encoding: 'base64', content: Buffer.from(fixture.markdown).toString('base64') }) } : changed && url.endsWith('/closing-the-loop.md') ? new Response(fixture.documents[1].markdown + '\n') : value.fetcher(url, options);
  const first = await fetchUsage({ name: fixture.repository }, { now, fetcher });
  assert.equal((await fetchUsage({ name: fixture.repository }, { now, fetcher, previousUsage: first })).analysisReused, true);
  changed = true;
  const next = await fetchUsage({ name: fixture.repository }, { now, fetcher, previousUsage: first });
  assert.equal(next.analysisReused, false);
  assert.notEqual(next.sourceFingerprint, first.sourceFingerprint);
});

test('종합은 설치와 작업 단계만 집계하고 대표 런타임 수를 부풀리지 않는다', async () => {
  const { usage } = await load();
  const report = createReport('daily', [{ name: fixture.repository, usage }], now);
  Object.assign(report, synthesizeReport(report, 'daily', now));
  validatePublication({ reports: { daily: report } });
  const c = report.synthesis.coverage;
  assert.equal(c.collectionInstallations, 1);
  assert.equal(c.workflowGroups, 2);
  assert.equal(c.workflowMissing, 0);
  assert.equal(c.workflowConditions, 5);
  assert.equal(c.runtimeGroups, 0);
  assert.equal(c.runtimeConditions, 0);
  assert.ok(Object.values(c).every(Number.isFinite));
  const invalid = structuredClone(report);
  invalid.synthesis.setupReviews[0].workflows[0].conditions[0].body = '즉시 구현';
  assert.throws(() => validatePublication({ reports: { daily: invalid } }), /종합 보고서/);
  const old = structuredClone(usage);
  old.version = 14; old.analyzerVersion = 14; old.article.project.setup = null;
  old.article.project.conditions = []; old.article.conditions = [];
  old.quality = assessQuality(old);
  validateUsage(old);
  assert.ok(old.quality.missing.includes('도입 조건'));
});
