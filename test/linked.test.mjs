import test from 'node:test';
import assert from 'node:assert/strict';
import { linkedPaths, fetchLinkedDocuments } from '../scripts/linked.mjs';
import { analyzeUsage, fetchUsage, usageVersion } from '../scripts/usage.mjs';
import { validateUsage } from '../scripts/contracts.mjs';
import { isFreshUsage } from '../scripts/freshness.mjs';
import { readFile } from 'node:fs/promises';

const now = new Date('2026-11-12T00:00:00Z');
const row = { name: 'example/tool', description: 'Web scraping framework' };
const metadata = { path: 'README.md', sha: 'readme-sha', html_url: 'https://github.com/example/tool/blob/main/README.md' };
const markdown = '# Tool\nA web scraping framework.\n[English](docs/README_EN.md)\n[Guide](docs/guide.md)\n[Install](docs/install.md)';
const english = '# Tool\nA web scraping framework.\n## Input\nA URL.\n## Output\nJSON records.\n## Requirements\nRequires Python 3.12.';
const rootResponse = () => ({ ok: true, status: 200, json: async () => ({ ...metadata, encoding: 'base64', content: Buffer.from(markdown).toString('base64'), size: markdown.length }) });

test('직접 연결한 같은 저장소의 문서 두 개만 선택하고 영문판을 우선한다', () => {
  const paths = linkedPaths(markdown, row.name, metadata);
  assert.deepEqual(paths.map(item => item.path), ['docs/README_EN.md', 'docs/install.md']);
  const unsafe = '[Other](https://example.com/guide.md) [Repo](https://github.com/other/repo/blob/main/docs/guide.md) [Branch](https://github.com/example/tool/blob/other/docs/guide.md) [Up](../../../guide.md) [Encoded](docs/%2fguide.md) [Auth](https://a:b@github.com/example/tool/blob/main/docs/guide.md) [Image](docs/image.png) [Contrib](CONTRIBUTING.md)\n```md\n[Fake](docs/install.md)\n```';
  assert.deepEqual(linkedPaths(unsafe, row.name, metadata), []);
  assert.deepEqual(linkedPaths('[Guide][g]\n[g]: docs/guide.md', row.name, metadata).map(item => item.path), ['docs/guide.md']);
});

test('추가 문서의 경로·SHA·근거와 한국어 입출력을 연결하고 인증값을 전송하지 않는다', async () => {
  const calls = [];
  const linked = await fetchLinkedDocuments(markdown, row.name, metadata, { now, fetcher: async (url, options) => { calls.push([url, options]); return new Response(english); } });
  assert.equal(calls.length, 2);
  assert.ok(calls.every(([url, options]) => url.startsWith('https://raw.githubusercontent.com/example/tool/main/') && !options.headers.Authorization && options.redirect === 'error'));
  const usage = analyzeUsage(row, markdown, now, metadata, linked.documents);
  usage.document.links = linked.states;
  validateUsage(usage, row);
  assert.equal(usage.sources.length, 3);
  const input = usage.article.project.inputs[0];
  assert.match(input.summaryKo, /웹 페이지/);
  const evidence = usage.evidence.find(item => input.evidenceIds.includes(item.id));
  assert.notEqual(evidence.sourceId, 'readme');
  assert.equal(usage.sources.find(source => source.id === evidence.sourceId).path, 'docs/README_EN.md');
  assert.match(usage.sources[1].sha, /^[a-f0-9]{40}$/);
  const invalid = structuredClone(usage); invalid.document.links[0].path = 'docs/missing.md';
  assert.throws(() => validateUsage(invalid), /추가 문서 조회 상태/);
  const sample = await fetchLinkedDocuments('[Example](examples/usage-guide.md)', row.name, metadata, { now, fetcher: async () => new Response(english) });
  const exampleUsage = analyzeUsage(row, '# Tool\nA web scraping framework.', now, metadata, sample.documents);
  validateUsage(exampleUsage);
  assert.equal(exampleUsage.article.project.inputs[0].exampleOnly, true);
  assert.ok(exampleUsage.article.project.inputs[0].evidenceIds.every(id => exampleUsage.evidence.find(item => item.id === id).kind === 'example'));
});

test('같은 제목·행·발췌라도 문서가 다르면 근거 ID가 충돌하지 않는다', () => {
  const docs = ['docs/a.md', 'docs/b.md'].map(path => ({ markdown: english, metadata: { path, sha: 'same-sha', html_url: `https://github.com/example/tool/blob/main/${path}` } }));
  const usage = analyzeUsage(row, '# Tool\nA web scraping framework.', now, metadata, docs);
  validateUsage(usage);
  assert.equal(new Set(usage.sources.map(source => source.id)).size, 3);
  assert.ok(usage.evidence.every(item => usage.sources.some(source => source.id === item.sourceId)));
  const paths = [
    { markdown: '# Local path\n## Installation\nReact 19.', metadata: { path: 'docs/local.md', sha: 'a' } },
    { markdown: '# Optional service\n## Installation\nPython 3.12.', metadata: { path: 'docs/remote.md', sha: 'b' } }
  ];
  const scoped = analyzeUsage(row, '# Tool\nA web scraping framework.', now, metadata, paths);
  const python = scoped.article.project.conditions.find(item => item.title === 'Python');
  assert.equal(python.scope, 'optional');
  assert.match(python.path, /Optional service/);
});

test('README가 같아도 연결 문서 SHA가 바뀌면 재분석하고 모두 같으면 재사용한다', async () => {
  let body = english;
  const fetcher = async url => url.startsWith('https://api.github.com') ? rootResponse() : new Response(body);
  const first = await fetchUsage(row, { now, fetcher, token: '' });
  validateUsage(first);
  const second = await fetchUsage({ ...row, usage: first }, { now: new Date(now.getTime() + 1000), fetcher, token: '' });
  assert.equal(second.analysisReused, true);
  assert.equal(second.analyzedAt, first.analyzedAt);
  body = english.replace('JSON records', 'CSV records');
  const third = await fetchUsage({ ...row, usage: second }, { now: new Date(now.getTime() + 2000), fetcher, token: '' });
  assert.equal(third.analysisReused, false);
  assert.notEqual(third.sourceFingerprint, first.sourceFingerprint);
  assert.match(third.article.project.outputs[0].body, /CSV/);
});

test('연결 문서 실패는 README 분석을 유지하며 다음 조회에서 복구한다', async () => {
  let fail = true;
  const fetcher = async url => url.startsWith('https://api.github.com') ? rootResponse() : new Response(fail ? 'failed' : english, { status: fail ? 503 : 200 });
  const first = await fetchUsage(row, { now, fetcher, token: '' });
  validateUsage(first);
  assert.equal(first.document.status, 'available');
  assert.equal(first.sources.length, 1);
  assert.ok(first.document.links.every(item => item.status === 'unavailable'));
  assert.equal(isFreshUsage(first, row, now, usageVersion), false);
  fail = false;
  const next = await fetchUsage({ ...row, usage: first }, { now: new Date(now.getTime() + 1000), fetcher, token: '' });
  validateUsage(next);
  assert.ok(next.document.links.every(item => item.status === 'available'));
  assert.equal(next.sources.length, 3);
  assert.ok(next.article.project.outputs.length);
  fail = true;
  const failedAgain = await fetchUsage({ ...row, usage: next }, { now: new Date(now.getTime() + 2000), fetcher, token: '' });
  validateUsage(failedAgain);
  assert.equal(failedAgain.document.status, 'available');
  assert.equal(failedAgain.sources.length, 1);
  assert.ok(failedAgain.evidence.every(item => item.sourceId === 'readme'));
  assert.equal(failedAgain.article.project.outputs.length, 0);
});

test('추가 문서의 크기·시간 제한과 외부 링크를 따라가지 않는 경계를 지킨다', async () => {
  const oversized = await fetchLinkedDocuments(markdown, row.name, metadata, { now, fetcher: async () => new Response('a'.repeat(250001)) });
  assert.equal(oversized.documents.length, 0);
  assert.ok(oversized.states.every(item => item.status === 'unavailable'));
  const timed = await fetchLinkedDocuments('[Guide](docs/guide.md)', row.name, metadata, { now, timeoutMs: 10, fetcher: () => new Promise(() => {}) });
  assert.equal(timed.states[0].status, 'unavailable');
  let calls = 0;
  await fetchLinkedDocuments('[Guide](docs/guide.md)', row.name, metadata, { now, fetcher: async () => { calls++; return new Response('[Another](next-guide.md)'); } });
  assert.equal(calls, 1);
});

test('README 갱신 실패로 이전 분석기 6을 유지해도 한국어 문구를 새 규칙으로 강제하지 않는다', () => {
  const usage = analyzeUsage(row, '# Tool\nA web scraping framework.\n## Input\nA URL.\n## Output\nJSON records.', now, metadata);
  usage.version = 6; usage.analyzerVersion = 6;
  usage.article.project.inputs[0].summaryKo = '이전 분석기에서 만든 한국어 입력 설명입니다.';
  usage.document = { status: 'unavailable', checkedAt: now.toISOString() };
  usage.stale = true;
  assert.doesNotThrow(() => validateUsage(usage));
});

test('배포 보고서에서 미확인이던 여섯 프로젝트를 실제 README·영문판·공식 문서로 설명한다', async () => {
  const docs = JSON.parse(await readFile(new URL('./fixtures/linked-documents.json', import.meta.url), 'utf8'));
  const categories = ['시장 데이터 분석', '웹 개발 지침', 'AI 에이전트 스킬', '코드 보안 점검', '알고리즘 학습', '전통 명반 계산'];
  for (const [index, doc] of docs.entries()) {
    const usage = analyzeUsage(doc.row, doc.markdown, now, doc.metadata, doc.linkedDocuments);
    validateUsage(usage, doc.row);
    assert.equal(usage.category, categories[index], doc.row.name);
    assert.ok(usage.article.core.length, doc.row.name);
    assert.ok(usage.article.core.every(claim => /[가-힣]/.test(claim.body) && claim.evidenceIds.length));
    assert.equal(usage.ai, undefined);
    if (/daily_stock|ziwei/.test(doc.row.name)) assert.ok(usage.evidence.some(item => item.sourceId !== 'readme'), doc.row.name);
  }
});
