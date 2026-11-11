import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeUsage, fetchUsage, usageVersion } from '../scripts/usage.mjs';
import { documentMaxAgeMs, isFreshUsage, normalizeUsage } from '../scripts/freshness.mjs';
import { collectPublication } from '../scripts/publication.mjs';
import { assessQuality } from '../scripts/evidence.mjs';

const first = new Date('2026-11-01T00:23:00Z');
const row = { name: 'sample/tool', description: 'Browser automation', language: 'Rust' };
const markdown = '# Tool\nBrowser automation.\n## Input\nA URL.\n## Output\nJSON records.\n## Requirements\nRequires Node.js 22.';
const metadata = { path: 'README.md', sha: 'document-sha', html_url: 'https://github.com/sample/tool/blob/main/README.md' };
const usage = () => analyzeUsage(row, markdown, first, metadata);
const response = (sha = metadata.sha, text = markdown, path = metadata.path) => ({ ok: true, json: async () => ({ ...metadata, path, sha, encoding: 'base64', content: Buffer.from(text).toString('base64'), size: Buffer.byteLength(text) }) });
const stateAt = (now, currentUsage) => ({ version: 1, ledger: ['daily:2026-11-11', 'weekly:2026-11-09', 'monthly:2026-11'].map(issue => ({ issue })), reports: { daily: { period: 'daily', publishedAt: first.toISOString(), rows: [{ ...row, usage: currentUsage }] } } });

test('7일 확인 주기의 경계·미래 시각·실패 상태를 구분한다', () => {
  const previous = usage();
  assert.equal(isFreshUsage(previous, row, new Date(first.getTime() + documentMaxAgeMs - 1), usageVersion), true);
  assert.equal(isFreshUsage(previous, row, new Date(first.getTime() + documentMaxAgeMs), usageVersion), false);
  assert.equal(isFreshUsage(previous, row, new Date(first.getTime() - 1), usageVersion), false);
  assert.equal(isFreshUsage({ ...previous, stale: true }, row, first, usageVersion), false);
  assert.equal(isFreshUsage(previous, { ...row, description: 'Changed purpose' }, first, usageVersion), false);
});

test('SHA가 같으면 본문을 다시 분석하지 않고 확인 시각만 갱신한다', async () => {
  const previous = usage();
  const now = new Date('2026-11-11T00:23:00Z');
  const result = await fetchUsage({ ...row, usage: previous }, { now, token: '', fetcher: async () => response(), analyze: () => { throw Error('재분석되면 안 됩니다.'); } });
  assert.equal(result.analysisReused, true);
  assert.deepEqual(result.article, previous.article);
  assert.deepEqual(result.evidence, previous.evidence);
  assert.equal(result.analyzedAt, first.toISOString());
  assert.equal(result.sourceCheckedAt, now.toISOString());
  assert.equal(result.sources[0].fetchedAt, first.toISOString());
  assert.equal(previous.sourceCheckedAt, first.toISOString());
});

test('SHA·문서 경로·입력 설명·분석기 버전 변경과 강제 분석은 본문을 갱신한다', async () => {
  const previous = usage();
  const oldVersion = { ...previous, version: 3, schemaVersion: 1, analyzerVersion: 3, quality: assessQuality({ ...previous, version: 3 }) };
  const now = new Date('2026-11-11T00:23:00Z');
  for (const scenario of [
    { previous, fetcher: async () => response('new-sha') },
    { previous, fetcher: async () => response(metadata.sha, markdown, 'docs/README.md') },
    { previous, description: 'Browser automation for extraction', fetcher: async () => response() },
    { previous: oldVersion, fetcher: async () => response() },
    { previous, forceAnalysis: true, fetcher: async () => response() }
  ]) {
    let calls = 0;
    const result = await fetchUsage({ ...row, description: scenario.description || row.description, usage: scenario.previous }, { now, token: '', ...scenario, analyze: (...args) => { calls++; return analyzeUsage(...args); } });
    assert.equal(calls, 1);
    assert.equal(result.analysisReused, false);
    assert.equal(result.analyzedAt, now.toISOString());
  }
});

test('문서 확인 실패는 마지막 정상 분석·확인 시각을 보존하고 다음 실행에서 복구한다', async () => {
  const now = new Date('2026-11-11T00:23:00Z');
  const original = usage();
  const previous = stateAt(now, original);
  const failed = await collectPublication(previous, { now, fetcher: async () => ({ status: 404 }) });
  const retained = failed.state.reports.daily.rows[0].usage;
  assert.equal(retained.stale, true);
  assert.equal(retained.document.status, 'unavailable');
  assert.equal(retained.sourceCheckedAt, first.toISOString());
  assert.equal(retained.analyzedAt, first.toISOString());
  assert.equal(retained.document.checkedAt, now.toISOString());
  assert.deepEqual(retained.article, original.article);
  const recovered = await collectPublication(failed.state, { now, fetcher: async () => response() });
  const updated = recovered.state.reports.daily.rows[0].usage;
  assert.equal(updated.stale, false);
  assert.equal(updated.document.status, 'available');
  assert.equal(updated.analysisReused, true);
  assert.equal(updated.analyzedAt, first.toISOString());
  assert.deepEqual(recovered.state.ledger, previous.ledger);
  assert.equal(recovered.state.reports.daily.publishedAt, previous.reports.daily.publishedAt);
  assert.equal(recovered.state.reports.daily.synthesis.coverage.stale, 0);
});

test('새 발행호에서도 유효한 분석은 재사용하고 새 프로젝트만 조회한다', async () => {
  const html = name => `<article class="Box-row"><h2><a href="/${name}">${name}</a></h2><p>Browser automation</p><span itemprop="programmingLanguage">Rust</span></article>`;
  const initial = await collectPublication({ version: 1, reports: {}, ledger: [] }, { now: first, fetcher: async url => url.includes('/trending') ? { ok: true, text: async () => html(row.name) } : response() });
  const requested = [];
  const next = await collectPublication(initial.state, { now: new Date(first.getTime() + 24 * 3600000), fetcher: async url => {
    requested.push(url);
    return url.includes('/trending') ? { ok: true, text: async () => html(row.name) + html('sample/new') } : response();
  } });
  assert.equal(requested.filter(url => url.includes('/repos/sample/tool/')).length, 0);
  assert.equal(requested.filter(url => url.includes('/repos/sample/new/')).length, 1);
  assert.equal(next.state.reports.daily.rows[0].usage.analyzedAt, first.toISOString());
  assert.equal(next.state.reports.daily.synthesis.coverage.classified, 2);
});

test('같은 저장소의 설명이 바뀌면 SHA가 같아도 이전 분류를 그대로 쓰지 않는다', async () => {
  const now = new Date('2026-11-11T00:23:00Z');
  const previous = stateAt(now, usage());
  previous.reports.weekly = { period: 'weekly', publishedAt: first.toISOString(), rows: [{ ...row, description: 'Browser automation for screenshots' }] };
  let requests = 0;
  const result = await collectPublication(previous, { now, fetcher: async () => { requests++; return response(); } });
  assert.equal(requests, 1);
  assert.equal(result.state.reports.daily.rows[0].usage.analysisReused, true);
  assert.equal(result.state.reports.weekly.rows[0].usage.analysisReused, false);
  assert.equal(result.state.reports.weekly.rows[0].usage.analyzedAt, now.toISOString());
});

test('이전 시각 필드를 마이그레이션하고 반복 실행에서 불필요한 변경을 만들지 않는다', async () => {
  const previous = usage();
  delete previous.sourceCheckedAt; delete previous.analyzedAt; delete previous.analysisInputFingerprint; delete previous.sourceFingerprint;
  const normalized = normalizeUsage(previous, row);
  assert.equal(normalized.analyzedAt, first.toISOString());
  const now = new Date('2026-11-11T00:23:00Z');
  const migrated = await collectPublication(stateAt(now, previous), { now, fetcher: async () => response() });
  const again = await collectPublication(migrated.state, { now: new Date(now.getTime() + 60000), fetcher: () => { throw Error('재조회 금지'); } });
  assert.equal(again.changed, false);
  assert.deepEqual(again.state, migrated.state);
});

test('같은 저장소의 다른 설명이 더 최신이어도 현재 입력과 일치하는 유효 분석을 재사용한다', async () => {
  const now = new Date('2026-11-02T00:23:00Z');
  const original = usage();
  const second = { ...row, description: 'Browser automation for extraction' };
  const other = analyzeUsage(second, markdown, now, metadata);
  const previous = { version: 1, ledger: ['daily:2026-11-02', 'weekly:2026-11-02', 'monthly:2026-11'].map(issue => ({ issue })), reports: {
    daily: { rows: [{ ...row, usage: original }] }, weekly: { rows: [{ ...second, usage: other }] }
  } };
  const result = await collectPublication(previous, { now, fetcher: () => { throw Error('유효한 두 분석은 재조회하지 않습니다.'); } });
  assert.equal(result.state.reports.daily.rows[0].usage.analyzedAt, first.toISOString());
  assert.equal(result.state.reports.weekly.rows[0].usage.analyzedAt, now.toISOString());
});
