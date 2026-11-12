import { addKoreanPresentation } from '../scripts/korean.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { analyzeUsage, fetchUsage } from '../scripts/usage.mjs';
import { fetchLinkedDocuments } from '../scripts/linked.mjs';
import { validateUsage, validatePublication } from '../scripts/contracts.mjs';
import { createReport } from '../scripts/trends.mjs';
import { synthesizeReport } from '../scripts/report.mjs';
import { assessQuality } from '../scripts/evidence.mjs';

const fixture = JSON.parse(await readFile(new URL('./fixtures/java-setup.json', import.meta.url)));
const now = new Date('2026-11-12T00:00:00Z');
const metadata = { path: 'README.md', sha: 'readme-sha', html_url: 'https://github.com/TheAlgorithms/Java/blob/master/README.md' };
async function load({ omit, mutate = text => text } = {}) {
  const calls = [];
  const markdown = fixture.documents.find(item => item.path === 'README.md').markdown;
  const fetcher = async (url, options) => {
    calls.push({ url, options });
    const document = fixture.documents.find(item => url.endsWith('/' + item.path));
    return document && document.path !== omit ? new Response(mutate(document.markdown, document.path)) : new Response('', { status: 404 });
  };
  const linked = await fetchLinkedDocuments(markdown, fixture.repository, metadata, { now, fetcher });
  const usage = analyzeUsage({ name: fixture.repository }, markdown, now, metadata, linked.documents);
  usage.document.links = linked.states;
  validateUsage(usage);
  return { usage, calls, markdown, fetcher };
}

test('공식 POM·CI와 Javadoc으로 공통 빌드·테스트와 대표 알고리즘 조건을 보완한다', async () => {
  const { usage, calls } = await load();
  assert.equal(usage.quality.status, 'complete');
  assert.deepEqual(usage.quality.missing, []);
  assert.deepEqual(usage.quality.setup, { build: 'documented', runtimeExpected: 2, runtimeAvailable: 2, missing: [] });
  assert.equal(usage.start.command, 'mvn --batch-mode --update-snapshots verify');
  assert.equal(usage.article.coverage.hasStart, true);
  assert.equal(calls.length, 5);
  assert.ok(calls.every(item => !item.options.headers.Authorization && item.options.redirect === 'error'));
  assert.equal(usage.article.project.conditions.length, 1);
  assert.equal(usage.article.project.conditions[0].scope, 'mentioned');
  assert.ok(usage.article.project.setup.build.evidenceIds.every(id => ['pom.xml', '.github/workflows/build.yml'].includes(usage.sources.find(source => source.id === usage.evidence.find(item => item.id === id).sourceId).path)));
});

test('이진 탐색의 정렬·Comparable 전제와 버블 정렬의 배열·원본 변경 조건을 분리한다', async () => {
  const { usage } = await load();
  const [binary, bubble] = usage.article.project.setup.runtimes;
  assert.match(binary.conditions[0].body, /오름차순/);
  assert.match(binary.conditions[1].body, /Comparable/);
  assert.match(bubble.conditions[1].body, /원본 배열이 보존된다고 가정하지/);
  assert.equal(bubble.conditions[1].applicability, 'documented-behavior');
  assert.ok(bubble.conditions.every(item => item.id !== 'binary-sorted'));
  assert.deepEqual(usage.quality.io, { input: 'not-applicable', output: 'not-applicable' });
});

test('설정 조회 실패·JDK 설정 변경이면 공통 경로를 보류하고 개별 근거는 유지한다', async () => {
  for (const options of [{ omit: 'pom.xml' }, { mutate: (text, path) => path === '.github/workflows/build.yml' ? text.replace('java-version: 21', 'java-version: 22') : text }]) {
    const { usage } = await load(options);
    assert.equal(usage.article.project.setup.build, null);
    assert.equal(usage.start, null);
    assert.equal(usage.quality.status, 'partial');
    assert.ok(usage.quality.missing.includes('공통 빌드·테스트 경로'));
    assert.equal(usage.quality.setup.runtimeAvailable, 2);
  }
});

test('대표 Javadoc의 전제가 바뀌면 해당 알고리즘 실행 조건을 부족으로 남긴다', async () => {
  const { usage } = await load({ mutate: (text, path) => path.endsWith('BinarySearch.java') ? text.replace('must be Comparable', 'changed type contract') : text });
  assert.equal(usage.quality.setup.runtimeAvailable, 1);
  assert.ok(usage.quality.missing.includes('대표 실행 조건: BinarySearch · 이진 탐색'));
  assert.equal(usage.article.project.setup.build.scope, 'collection-build');
});

test('설정 주석을 활성 설정으로 해석하거나 임의의 숨김 설정 파일을 조회하지 않는다', async () => {
  const { usage, calls } = await load({ mutate: (text, path) => path === 'pom.xml' ? text.replace('<release>21</release>', '<!-- <release>21</release> -->') : text });
  assert.equal(usage.article.project.setup.build, null);
  assert.ok(!calls.some(item => /CONTRIBUTING|stale.yml/.test(item.url)));
  const invalid = structuredClone(usage);
  invalid.document.links[invalid.document.links.findIndex(item => item.path === '.github/workflows/build.yml')] = { path: '.github/workflows/other.yml', status: 'unavailable', reason: 'http', httpStatus: 404, checkedAt: now.toISOString() };
  assert.throws(() => validateUsage(invalid), /추가 문서/);
});

test('설정 SHA 변경을 재분석하고 같은 설정·Javadoc이면 재사용한다', async () => {
  const base = await load(); let changed = false;
  const fetcher = async (url, options) => url.includes('api.github.com') ? { ok: true, json: async () => ({ ...metadata, encoding: 'base64', content: Buffer.from(base.markdown).toString('base64') }) } : changed && url.endsWith('/pom.xml') ? new Response(fixture.documents.find(item => item.path === 'pom.xml').markdown + '\n') : base.fetcher(url, options);
  const first = await fetchUsage({ name: fixture.repository }, { now, fetcher });
  assert.equal((await fetchUsage({ name: fixture.repository }, { now, fetcher, previousUsage: first })).analysisReused, true);
  changed = true;
  const next = await fetchUsage({ name: fixture.repository }, { now, fetcher, previousUsage: first });
  assert.equal(next.analysisReused, false);
  assert.notEqual(next.sourceFingerprint, first.sourceFingerprint);
});

test('개별 전제의 공통 조건 승격·타 알고리즘 근거 연결·거짓 실행 보증을 거부한다', async () => {
  for (const mutate of [
    value => { value.article.project.conditions.push({ ...value.article.project.setup.runtimes[0].conditions[0], scope: 'required' }); },
    value => { value.article.project.setup.runtimes[1].conditions[0].evidenceIds = value.article.project.setup.runtimes[0].conditions[0].evidenceIds; },
    value => { value.article.project.setup.build.body = '모든 JDK에서 빌드·테스트 성공'; }
  ]) {
    const { usage } = await load(); mutate(usage); addKoreanPresentation(usage);
    assert.throws(() => validateUsage(usage), /조건|근거|혼합/);
  }
});

test('종합은 공통 빌드 1개와 대표 실행 조건 4개를 분리하고 이전 분석기 13은 보존한다', async () => {
  const { usage } = await load();
  const report = createReport('daily', [{ name: fixture.repository, usage }], now);
  Object.assign(report, synthesizeReport(report, 'daily', now));
  validatePublication({ reports: { daily: report } });
  assert.equal(report.synthesis.coverage.collectionBuilds, 1);
  assert.equal(report.synthesis.coverage.collectionInstallations, 0);
  assert.equal(report.synthesis.coverage.conditions, 1);
  assert.equal(report.synthesis.coverage.runtimeGroups, 2);
  assert.equal(report.synthesis.coverage.runtimeConditions, 4);
  assert.equal(report.synthesis.coverage.runtimeMissing, 0);
  const old = structuredClone(usage);
  old.version = 13; old.analyzerVersion = 13; old.article.project.setup = null; old.start = null;
  old.article.project.conditions = []; old.article.conditions = [];
  old.document.links = old.document.links.filter(item => /\.md$|\.java$/.test(item.path));
  addKoreanPresentation(old);
  old.quality = assessQuality(old);
  validateUsage(old);
  assert.ok(old.quality.missing.includes('시작 경로'));
  assert.ok(old.quality.missing.includes('도입 조건'));
});
