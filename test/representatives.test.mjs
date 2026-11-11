import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { analyzeUsage, fetchUsage } from '../scripts/usage.mjs';
import { fetchLinkedDocuments } from '../scripts/linked.mjs';
import { validateUsage } from '../scripts/contracts.mjs';
import { readJavaDocs } from '../scripts/representatives.mjs';

const fixtures = JSON.parse(await readFile(new URL('./fixtures/representative-documents.json', import.meta.url)));
const now = new Date('2026-11-12T00:00:00Z');
const root = repository => ({ path: 'README.md', sha: 'root-sha', html_url: `https://github.com/${repository}/blob/${repository === 'TheAlgorithms/Java' ? 'master' : 'main'}/README.md` });
async function analyze(repository, { omit = '', mutate = text => text } = {}) {
  const selected = fixtures.filter(item => item.repository === repository);
  const directory = selected.map(item => `[항목](${item.path})`).join('\n');
  const markdown = repository === 'TheAlgorithms/Java' ? '# Java algorithms\n[Directory](DIRECTORY.md)' : '# Knowledge work plugins\n[Product](./product-management) [Sales](./sales)';
  const calls = [];
  const linked = await fetchLinkedDocuments(markdown, repository, root(repository), { now, fetcher: async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith('/DIRECTORY.md')) return new Response(directory);
    const fixture = selected.find(item => url.endsWith('/' + item.path));
    return fixture && fixture.id !== omit ? new Response(mutate(fixture.markdown)) : new Response('', { status: 404 });
  } });
  const usage = analyzeUsage({ name: repository }, markdown, now, root(repository), linked.documents);
  usage.document.links = linked.states;
  validateUsage(usage);
  return { usage, linked, calls };
}

test('Java 공식 Javadoc의 서로 다른 사용 예를 분리하고 공통 입력으로 승격하지 않는다', async () => {
  const { usage, calls } = await analyze('TheAlgorithms/Java');
  assert.deepEqual(usage.article.project.examples.map(item => item.id), ['java-binary-search', 'java-bubble-sort']);
  assert.match(usage.article.project.examples[0].scenario.body, /인덱스 3/);
  assert.match(usage.article.project.examples[1].caution.body, /원본 배열/);
  assert.equal(usage.article.project.inputs.length, 0);
  assert.ok(usage.quality.missing.includes('입력'));
  assert.equal(calls.length, 3);
  assert.ok(calls.every(item => !item.options.headers.Authorization));
  const invalid = structuredClone(usage);
  invalid.article.project.examples[0].output.body = '정렬된 배열을 반환합니다.';
  assert.throws(() => validateUsage(invalid), /설명·근거 불일치/);
});

test('플러그인의 PRD와 통화 후 요약 산출물을 각각 설명하고 공통 출력은 추정하지 않는다', async () => {
  const { usage } = await analyze('anthropics/knowledge-work-plugins');
  assert.deepEqual(usage.article.project.examples.map(item => item.id), ['plugin-product-spec', 'plugin-sales-call']);
  assert.match(usage.article.project.examples[0].output.body, /PRD/);
  assert.match(usage.article.project.examples[1].output.body, /이메일 초안/);
  assert.equal(usage.article.project.outputs.length, 0);
  assert.ok(usage.quality.missing.includes('출력'));
  for (const example of usage.article.project.examples) for (const key of ['scenario', 'input', 'output', 'caution']) {
    assert.equal(example[key].exampleOnly, true);
    assert.ok(example[key].evidenceIds.every(id => usage.sources.some(source => source.id === usage.evidence.find(item => item.id === id).sourceId && source.representativeId === example.id)));
  }
});

test('대표 문서 조회 실패 또는 근거 문구 변경 시 해당 항목을 억지로 채우지 않는다', async () => {
  const failed = await analyze('TheAlgorithms/Java', { omit: 'java-binary-search' });
  assert.deepEqual(failed.usage.article.project.examples.map(item => item.id), ['java-bubble-sort']);
  assert.ok(failed.linked.states.some(item => item.reason === 'http' && item.httpStatus === 404));
  const changed = await analyze('TheAlgorithms/Java', { mutate: text => text.replace('in-place sorting', 'changed sorting') });
  assert.deepEqual(changed.usage.article.project.examples.map(item => item.id), ['java-binary-search']);
});

test('부모 문서의 링크가 없거나 다른 저장소·브랜치이면 대표 문서를 요청하지 않는다', async () => {
  let calls = 0;
  for (const markdown of ['# Java', '[Other](https://github.com/other/repo/blob/master/DIRECTORY.md)', '[Branch](https://github.com/TheAlgorithms/Java/blob/other/DIRECTORY.md)']) {
    const linked = await fetchLinkedDocuments(markdown, 'TheAlgorithms/Java', root('TheAlgorithms/Java'), { fetcher: async () => { calls++; return new Response(''); } });
    assert.equal(linked.documents.length, 0);
  }
  assert.equal(calls, 0);
});

test('Java 소스는 Javadoc만 읽고 원본 행 번호를 유지한다', () => {
  const sections = readJavaDocs('class X {\nString fake = "@return fake";\n/**\n * @return the sorted array.\n */\n}');
  assert.equal(sections.length, 1);
  assert.equal(sections[0].line, 3);
  assert.doesNotMatch(sections[0].body, /fake/);
});

test('대표 문서 SHA가 같으면 재사용하고 변경되면 분석을 갱신한다', async () => {
  const row = { name: 'anthropics/knowledge-work-plugins' };
  const markdown = '[Product](./product-management) [Sales](./sales)';
  let changed = false;
  const fetcher = async url => url.includes('api.github.com') ? { ok: true, json: async () => ({ ...root(row.name), encoding: 'base64', content: Buffer.from(markdown).toString('base64') }) } : new Response(fixtures.find(item => url.endsWith(item.path)).markdown + (changed ? '\n' : ''));
  const first = await fetchUsage(row, { now, fetcher });
  const same = await fetchUsage(row, { now, fetcher, previousUsage: first });
  assert.equal(same.analysisReused, true);
  changed = true;
  const next = await fetchUsage(row, { now, fetcher, previousUsage: first });
  assert.equal(next.analysisReused, false);
  assert.notEqual(next.sourceFingerprint, first.sourceFingerprint);
});

test('대표 문서에도 프로젝트 총량 상한을 적용하고 잘린 근거는 저장하지 않는다', async () => {
  const repository = 'anthropics/knowledge-work-plugins';
  const markdown = '[Product](./product-management) [Sales](./sales)' + ' '.repeat(500000);
  const linked = await fetchLinkedDocuments(markdown, repository, root(repository), { now, fetcher: async () => new Response('a'.repeat(150000)) });
  assert.equal(linked.documents.length, 1);
  assert.equal(linked.states[1].reason, 'project-size-limit');
});
