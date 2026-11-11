import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeUsage, fetchUsage, usageVersion } from '../scripts/usage.mjs';
import { validateUsage } from '../scripts/contracts.mjs';
import { collectPublication } from '../scripts/publication.mjs';

const now = new Date('2026-11-11T00:23:00Z');
const row = { name: 'example/voice', description: 'voice cloning' };
const markdown = '# Voice\n## Features\nVoice cloning from a short recording.\n## Input\nText and a reference recording.\n## Output\nGenerated speech audio.\n## Quick start\nInstall Python 3.11.\n```sh\nvoice sample.wav\n```';
const metadata = { sha: 'file-content-sha', path: 'docs/README.md', html_url: 'https://github.com/example/voice/blob/main/docs/README.md' };
const stateWith = usage => ({ version: 1, ledger: ['daily:2026-11-11', 'weekly:2026-11-09', 'monthly:2026-11'].map(issue => ({ issue })), reports: { daily: { publishedAt: '2026-11-11T00:00:00Z', rows: [{ ...row, usage }] } } });

test('출처·근거·해석을 분리하고 파일 SHA와 절 위치로 원문을 추적한다', () => {
  const usage = analyzeUsage(row, markdown, now, metadata);
  validateUsage(usage);
  assert.equal(usage.document.status, 'available');
  assert.equal(usage.quality.status, 'complete');
  assert.equal(usage.sources[0].sha, metadata.sha);
  assert.equal(usage.sources[0].url, metadata.html_url);
  const claim = usage.article.findings[0];
  const evidence = usage.evidence.find(item => claim.evidenceIds.includes(item.id));
  assert.equal(claim.kind, 'interpretation');
  assert.equal(claim.source, undefined);
  assert.equal(evidence.section, 'Features');
  assert.equal(evidence.line, 2);
  assert.equal(evidence.excerpt, 'Voice cloning from a short recording.');
  assert.equal(evidence.sourceId, usage.sources[0].id);
});

test('문서 조회 성공과 근거 부족에 따른 부분 분석을 구분한다', () => {
  const usage = analyzeUsage({ ...row, description: 'Something unusual' }, '# Unusual\nNo details.', now);
  validateUsage(usage);
  assert.equal(usage.document.status, 'available');
  assert.equal(usage.quality.status, 'partial');
  assert.deepEqual(usage.quality.missing, ['용도 분류', '핵심 기능 근거', '시작 경로', '해결 문제', '입력', '출력', '도입 조건']);
});

test('미지원 문장·기여 안내 하위 절·코드 예시를 기능 근거로 쓰지 않는다', () => {
  const usage = analyzeUsage(row, '# Voice\n## Voice cloning\nVoice cloning is not supported yet.\n## Contributing\n### Examples\nVoice cloning and video dubbing.\n## Samples\n```text\nvoice cloning\n```', now);
  assert.equal(usage.article.findings.length, 0);
  assert.equal(usage.evidence.length, 0);
});

test('미지원 문장 이후 다른 절의 유효한 기능 근거를 계속 탐색한다', () => {
  const usage = analyzeUsage(row, '# Voice\n## Limitations\nVideo dubbing is not supported.\n## Features\nVoice cloning is supported.', now);
  assert.equal(usage.article.findings.length, 1);
  assert.match(usage.evidence[0].excerpt, /Voice cloning is supported/);
});

test('존재하지 않는 근거·출처·외부 링크·허위 품질 상태를 거부한다', () => {
  const usage = analyzeUsage(row, markdown, now, metadata);
  for (const mutate of [
    value => { value.article.findings[0].evidenceIds = ['missing']; },
    value => { value.evidence[0].sourceId = 'missing'; },
    value => { value.sources[0].url = 'javascript:alert(1)'; },
    value => { value.quality.status = 'partial'; }
  ]) {
    const invalid = structuredClone(usage); mutate(invalid);
    assert.throws(() => validateUsage(invalid), /분석 데이터 오류/);
  }
});

test('최신 문서 조회 실패 시 정상 분석과 품질을 보존하고 다음 실행에서 복구한다', async () => {
  const original = analyzeUsage(row, markdown, now, metadata);
  const previous = stateWith({ ...original, version: 2 });
  const unavailable = await fetchUsage(row, { now, token: '', fetcher: async () => ({ status: 404 }) });
  validateUsage(unavailable);
  assert.equal(unavailable.document.status, 'unavailable');
  assert.equal(unavailable.quality.status, 'unavailable');
  const failed = await collectPublication(previous, { now, analyzeProject: async () => unavailable });
  const retained = failed.state.reports.daily.rows[0].usage;
  assert.deepEqual(retained.article, original.article);
  assert.deepEqual(retained.quality, original.quality);
  assert.equal(retained.document.status, 'unavailable');
  assert.equal(retained.stale, true);
  const recovered = await collectPublication(failed.state, { now, analyzeProject: async () => original });
  assert.equal(recovered.state.reports.daily.rows[0].usage.version, usageVersion);
  assert.equal(recovered.state.reports.daily.rows[0].usage.document.status, 'available');
  assert.equal(recovered.state.reports.daily.rows[0].usage.stale, undefined);
  assert.deepEqual(recovered.state.ledger, previous.ledger);
  assert.equal(recovered.state.reports.daily.publishedAt, previous.reports.daily.publishedAt);
  assert.equal(previous.reports.daily.rows[0].usage.document.status, 'available');
});

test('새 형식의 분석도 재조회 실패 상태라면 다음 실행에 재시도한다', async () => {
  const usage = analyzeUsage(row, markdown, now, metadata);
  const previous = stateWith({ ...usage, stale: true, document: { status: 'unavailable', checkedAt: now.toISOString() } });
  let calls = 0;
  await collectPublication(previous, { now, analyzeProject: async () => { calls++; return usage; } });
  assert.equal(calls, 1);
});

test('외부 문서 URL을 출처로 채택하지 않는다', () => {
  const usage = analyzeUsage(row, markdown, now, { ...metadata, html_url: 'https://other.example/readme' });
  assert.equal(usage.sources[0].url, 'https://github.com/example/voice#readme');
});
