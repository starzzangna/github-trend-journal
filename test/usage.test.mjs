import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeUsage, fetchUsage, readSections, usageVersion } from '../scripts/usage.mjs';
import { collectPublication } from '../scripts/publication.mjs';

const now = new Date('2026-10-16T07:00:00Z');
const row = { name: 'sample/voice', description: 'Open-source voice cloning', language: 'Python' };
const readme = '# Voice\n\nVoice tool.\n\n## Quick start\n\nStart with a short recording.\n\n### Install the tool\n\n```bash\npip install example-voice\n```\n\n### Run a sample\n\n```bash\nexample-voice sample.wav\n```\n\n## Development\n\nInternal details.';

test('용도 해석과 문서에서 확인한 시작 절차를 구분한다', () => {
  const result = analyzeUsage(row, readme, now);
  assert.equal(result.category, '음성 제작');
  assert.match(result.scenario, /샘플/);
  assert.match(result.basis, /제안/);
  assert.equal(result.start.heading, 'Quick start');
  assert.deepEqual(result.start.steps, ['Install the tool', 'Run a sample']);
  assert.equal(result.start.command, 'pip install example-voice');
  assert.equal(result.source, 'https://github.com/sample/voice#readme');
});
test('코드 안의 주석을 문서 제목으로 잘못 해석하지 않는다', () => {
  const sections = readSections('# App\n## Installation\n```sh\n# fake title\necho hi\n```\n## License\nMIT');
  assert.deepEqual(sections.map(s => s.title), ['', 'App', 'Installation', 'License']);
});
test('알 수 없는 프로젝트 용도나 시작 명령을 지어내지 않는다', () => {
  const result = analyzeUsage({ ...row, description: 'An unusual project' }, '# Something\nAn unusual project.', now);
  assert.equal(result.category, '용도 분류 미확정');
  assert.equal(result.scenario, null);
  assert.equal(result.start, null);
});
test('긴 설치 스크립트는 중간을 잘라 실행 예시로 내보내지 않는다', () => {
  const result = analyzeUsage(row, '## Install\n```bash\n' + 'echo something\n'.repeat(8) + '```', now);
  assert.equal(result.start.command, '');
});
test('README가 없어도 전체 보고서 발행을 막지 않고 미확인으로 표시한다', async () => {
  const result = await fetchUsage(row, { token: '', now, fetcher: async () => ({ status: 404 }) });
  assert.equal(result.status, 'unavailable');
  assert.match(result.reason, /찾지/);
});
test('일시 오류를 재시도하고 원문·인증값은 결과에 저장하지 않는다', async () => {
  let calls = 0;
  const result = await fetchUsage(row, { token: 'test-secret', now, delay: async () => {}, fetcher: async (url, options) => {
    assert.equal(url, 'https://api.github.com/repos/sample/voice/readme');
    assert.equal(options.headers.Authorization, 'Bearer test-secret');
    if (++calls === 1) throw new Error('network');
    return { ok: true, status: 200, json: async () => ({ size: readme.length, encoding: 'base64', content: Buffer.from(readme).toString('base64'), sha: 'test-readme-sha' }) };
  } });
  assert.equal(calls, 2);
  assert.equal(result.status, 'ready');
  assert.equal(result.readmeSha, 'test-readme-sha');
  assert.ok(!JSON.stringify(result).includes('test-secret'));
  assert.ok(!JSON.stringify(result).includes('Internal details.'));
});
test('기존 글을 중복 발행하지 않고 사용법만 보완하며 기간 간 요청을 재사용한다', async () => {
  const state = { version: 1, ledger: [{ issue: 'daily:2026-10-16' }, { issue: 'weekly:2026-10-12' }, { issue: 'monthly:2026-10' }], reports: Object.fromEntries(['daily', 'weekly', 'monthly'].map(period => [period, { period, publishedAt: '2026-10-16T00:00:00Z', rows: [structuredClone(row)] }])) };
  let calls = 0;
  const enriched = await collectPublication(state, { now, fetcher: () => { throw new Error('기간 재수집 금지'); }, analyzeProject: async r => { calls++; return analyzeUsage(r, readme, now); } });
  assert.equal(calls, 1);
  assert.equal(enriched.state.ledger.length, 3);
  assert.equal(enriched.state.reports.daily.publishedAt, state.reports.daily.publishedAt);
  assert.equal(enriched.state.reports.weekly.rows[0].usage.category, '음성 제작');
  assert.equal(state.reports.daily.rows[0].usage, undefined);
  const again = await collectPublication(enriched.state, { now, analyzeProject: () => { throw new Error('확인된 사용법 재수집 금지'); } });
  assert.equal(again.changed, false);
});
test('README 실패 후 다음 실행에서 복구하고 발행 장부는 유지한다', async () => {
  const state = { version: 1, ledger: [{ issue: 'daily:2026-10-16' }, { issue: 'weekly:2026-10-12' }, { issue: 'monthly:2026-10' }], reports: { daily: { rows: [row] } } };
  const failed = await collectPublication(state, { now, analyzeProject: async () => ({ version: usageVersion, status: 'unavailable' }) });
  const failedAgain = await collectPublication(failed.state, { now, analyzeProject: async () => ({ version: usageVersion, status: 'unavailable' }) });
  assert.equal(failedAgain.changed, false);
  const recovered = await collectPublication(failed.state, { now, analyzeProject: async r => analyzeUsage(r, readme, now) });
  assert.equal(recovered.state.reports.daily.rows[0].usage.status, 'ready');
  assert.equal(recovered.state.ledger.length, 3);
});

test('상세 노트는 문서 근거의 기능·환경과 활용 제안을 구분해 작성한다', () => {
  const document = '# Voice\n## Features\nVoice cloning and video dubbing.\n## Quick start\nRequires Python 3.11 and CUDA GPU.\n### Install\nUse the installer.\n### Run\nChoose a sample.';
  const result = analyzeUsage(row, document, now);
  assert.equal(result.article.paragraphs.length, 2);
  assert.equal(result.article.findings.length, 2);
  assert.match(result.article.findings[0].title, /음성/);
  assert.equal(result.article.findings[0].section, 'Features');
  assert.equal(result.article.findings[0].source, result.source);
  assert.equal(result.article.conditions.length, 2);
  assert.equal(result.article.workflow.length, 3);
  assert.match(result.article.workflow[1].body, /필수 실행 순서로 가정하지/);
  assert.match(result.article.verdict, /유형/);
});

test('코드 예시·기여 안내·다른 분야의 용어를 프로젝트 핵심 기능으로 오인하지 않는다', () => {
  const document = '# Science\nGenetic transcription.\n## Example\n```text\nvoice cloning\n```\n## Contributing\nvideo dubbing';
  const result = analyzeUsage({ ...row, description: 'Agent skills for research' }, document, now);
  assert.ok(!result.article.findings.some(f => /음성|더빙/.test(f.title)));
});

test('미지원이라고 적힌 내용은 핵심 기능으로 소개하지 않는다', () => {
  const result = analyzeUsage(row, '# Voice\n## Features\nVoice cloning is not supported yet.', now);
  assert.equal(result.article.findings.length, 0);
});

test('분석 형식 갱신에 실패하면 이전 정상 분석을 유지하고 다음 실행에 다시 시도한다', async () => {
  const previousUsage = { version: 1, status: 'ready', purpose: '기존 분석' };
  const state = { version: 1, ledger: [{ issue: 'daily:2026-10-16' }, { issue: 'weekly:2026-10-12' }, { issue: 'monthly:2026-10' }], reports: { daily: { rows: [{ ...row, usage: previousUsage }] } } };
  const failed = await collectPublication(state, { now, analyzeProject: async () => ({ version: usageVersion, status: 'unavailable' }) });
  assert.equal(failed.changed, false);
  assert.deepEqual(failed.state.reports.daily.rows[0].usage, previousUsage);
  const recovered = await collectPublication(failed.state, { now, analyzeProject: async r => analyzeUsage(r, readme, now) });
  assert.equal(recovered.state.reports.daily.rows[0].usage.version, usageVersion);
  assert.ok(recovered.state.reports.daily.rows[0].usage.article);
  assert.equal(recovered.state.ledger.length, 3);
});
