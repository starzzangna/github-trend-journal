import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTrending, issueKey, fingerprint } from '../scripts/trends.mjs';
import { collectPublication as collect } from '../scripts/publication.mjs';
const collectPublication = (previous, options) => collect(previous, { analyzeProject: async () => ({ version: 2, status: 'ready' }), ...options });

const fixture = (count = '123', name = 'sample/project') => `<article class="Box-row"><h2><a href="/${name}"> sample / project </a></h2><p>Build &amp; share</p><span itemprop="programmingLanguage">TypeScript</span><a href="/${name}/stargazers"><svg></svg>1,234</a><span>${count} stars today</span></article>`;
const response = html => ({ ok: true, text: async () => html });
const empty = () => ({ version: 1, reports: {}, ledger: [] });
const first = new Date('2026-10-16T00:23:00Z');

test('실제 화면 형태에서 목록과 기간 스타를 읽고 중복 저장소를 제거한다', () => {
  const rows = parseTrending(fixture() + fixture());
  assert.equal(rows.length, 1);
  assert.equal(rows[0].stars, 1234);
  assert.equal(rows[0].periodStars, 123);
  assert.equal(rows[0].description, 'Build & share');
  assert.equal(rows[0].language, 'TypeScript');
});
test('차단 화면이나 구조 변경은 빈 보고서로 발행하지 않는다', () => {
  assert.throws(() => parseTrending('<html>rate limited</html>'), /목록/);
});
test('한국 날짜·월요일·월 경계를 기준으로 발행 키를 만든다', () => {
  const date = new Date('2026-11-01T15:01:00Z');
  assert.equal(issueKey('daily', date), 'daily:2026-11-02');
  assert.equal(issueKey('weekly', date), 'weekly:2026-11-02');
  assert.equal(issueKey('monthly', date), 'monthly:2026-11');
  assert.equal(issueKey('weekly', new Date('2026-01-01T00:00:00Z')), 'weekly:2025-12-29');
});
test('같은 기간 재실행은 네트워크 요청도 발행도 하지 않는다', async () => {
  const { state } = await collectPublication(empty(), { now: first, fetcher: async () => response(fixture()) });
  const again = await collectPublication(state, { now: first, fetcher: () => { throw new Error('호출되면 안 됩니다.'); } });
  assert.equal(again.changed, false);
  assert.deepEqual(again.state, state);
});
test('다음 날 수치만 바뀐 동일 내용은 생략하고 새 프로젝트는 발행한다', async () => {
  const { state } = await collectPublication(empty(), { now: first, fetcher: async () => response(fixture()) });
  const next = await collectPublication(state, { now: new Date('2026-10-17T00:23:00Z'), fetcher: async () => response(fixture('999')) });
  assert.equal(next.state.ledger.at(-1).status, 'skipped-identical');
  assert.equal(next.state.reports.daily.publishedAt, first.toISOString());
  const changed = await collectPublication(next.state, { now: new Date('2026-10-18T00:23:00Z'), fetcher: async () => response(fixture('456', 'other/new')) });
  assert.equal(changed.state.reports.daily.rows[0].name, 'other/new');
  assert.equal(Object.keys(changed.state.reports).length, 3);
});
test('일시 오류는 재시도하고 정상 응답 후에만 발행한다', async () => {
  let attempts = 0;
  const result = await collectPublication(empty(), { now: first, delay: async () => {}, fetcher: async () => ++attempts === 1 ? { ok: false, status: 429 } : response(fixture()) });
  assert.equal(attempts, 4);
  assert.equal(result.state.ledger.length, 3);
});
test('중간 기간 수집 실패 시 기존 게시물과 장부를 변경하지 않는다', async () => {
  const previous = empty();
  let attempts = 0;
  await assert.rejects(collectPublication(previous, { now: first, delay: async () => {}, fetcher: async () => ++attempts === 1 ? response(fixture()) : { ok: false, status: 503 } }), /503/);
  assert.deepEqual(previous, empty());
});
test('내용 해시는 스타 수 변동과 무관하고 순위 변화는 반영한다', () => {
  assert.equal(fingerprint(parseTrending(fixture('1'))), fingerprint(parseTrending(fixture('2'))));
  assert.notEqual(fingerprint(parseTrending(fixture('1', 'a/b'))), fingerprint(parseTrending(fixture('1', 'a/c'))));
});
