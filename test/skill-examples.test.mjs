import { addKoreanPresentation } from '../scripts/korean.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fetchLinkedDocuments } from '../scripts/linked.mjs';
import { skillExamples } from '../scripts/skill-examples.mjs';
import { analyzeUsage, fetchUsage } from '../scripts/usage.mjs';
import { assessQuality } from '../scripts/evidence.mjs';
import { validateUsage, validatePublication } from '../scripts/contracts.mjs';
import { createReport } from '../scripts/trends.mjs';
import { synthesizeReport } from '../scripts/report.mjs';

const roots = JSON.parse(await readFile(new URL('./fixtures/collection-documents.json', import.meta.url)));
const fixtures = JSON.parse(await readFile(new URL('./fixtures/skill-representatives.json', import.meta.url)));
const now = new Date('2026-11-12T00:00:00Z');
async function load(repository, { omit, mutate = text => text, markdown } = {}) {
  const root = roots.find(item => item.repository === repository);
  const calls = [];
  const fetcher = async (url, options) => {
    calls.push({ url, options });
    const doc = fixtures.find(item => item.repository === repository && url.endsWith('/' + item.path));
    const general = root.linkedDocuments.find(item => url.endsWith('/' + item.metadata.path));
    return doc && doc.path !== omit ? new Response(mutate(doc.markdown)) : general ? new Response(general.markdown) : new Response('', { status: 404 });
  };
  const linked = await fetchLinkedDocuments(markdown ?? root.markdown, repository, root.metadata, { now, fetcher });
  const usage = analyzeUsage({ name: repository }, markdown ?? root.markdown, now, root.metadata, linked.documents);
  usage.document.links = linked.states;
  validateUsage(usage);
  return { name: repository, usage, calls, root, fetcher };
}

test('새 모음의 공식 대표 6개를 한국어로 설명하고 항목별 근거·SHA를 연결한다', async () => {
  for (const name of new Set(skillExamples.map(item => item.repository))) {
    const { usage, calls } = await load(name);
    assert.equal(usage.article.project.examples.length, 2);
    assert.deepEqual(usage.quality.representatives, { expected: 2, available: 2, status: 'tracked' });
    assert.ok(!usage.quality.missing.some(item => item.startsWith('대표 항목')));
    assert.ok(calls.length <= 4);
    assert.ok(calls.every(item => !item.options.headers.Authorization && item.options.redirect === 'error'));
    for (const item of usage.article.project.examples) {
      const source = usage.sources.find(source => source.representativeId === item.id);
      assert.match(source.sha, /^[a-f0-9]{40}$/);
      for (const field of ['scenario', 'input', 'output', 'caution']) {
        assert.match(item[field].body, /[가-힣]/);
        assert.equal(item[field].exampleOnly, true);
        assert.ok(item[field].evidenceIds.every(id => usage.evidence.find(proof => proof.id === id)?.sourceId === source.id));
      }
    }
  }
});

test('대표 스킬을 읽어도 공통 계약 면제와 Impeccable의 공통 입력 평가를 바꾸지 않는다', async () => {
  const pdf = (await load('anthropics/skills')).usage;
  assert.deepEqual(pdf.quality.io, { input: 'not-applicable', output: 'not-applicable' });
  assert.match(pdf.article.project.examples[0].output.body, /문자열 변수 text/);
  assert.match(pdf.article.project.examples[1].caution.body, /LibreOffice/);
  const design = (await load('pbakaus/impeccable')).usage;
  assert.deepEqual(design.quality.io, { input: 'documented', output: 'not-applicable' });
  assert.equal(design.article.project.inputs[0].title, '공통 입력 계약');
  assert.ok(design.article.project.inputs[0].evidenceIds.every(id => !design.sources.find(source => source.id === design.evidence.find(item => item.id === id).sourceId)?.representativeId));
});

test('문서 404 또는 필수 근거 변경은 해당 대표만 보류하고 품질 부족을 남긴다', async () => {
  const failed = (await load('anthropics/skills', { omit: 'skills/pdf/SKILL.md' })).usage;
  assert.deepEqual(failed.article.project.examples.map(item => item.id), ['skill-xlsx-edit']);
  assert.equal(failed.quality.representatives.available, 1);
  assert.ok(failed.quality.missing.includes('대표 항목: pdf · PDF 텍스트 추출'));
  assert.ok(failed.document.links.some(item => item.httpStatus === 404));
  const changed = (await load('pbakaus/impeccable', { mutate: text => text.replace('The chat response is the primary deliverable', 'Changed delivery') })).usage;
  assert.deepEqual(changed.article.project.examples.map(item => item.id), ['skill-ui-audit']);
});

test('직접 문서 링크·디렉터리 링크와 README 근거로 제한한 고정 경로만 요청한다', async () => {
  const anthropic = await load('anthropics/skills');
  assert.ok(anthropic.calls.some(item => item.url.endsWith('/skills/pdf/SKILL.md')));
  assert.ok(!anthropic.calls.some(item => item.url.includes('SKILL.md/README.md')));
  const absent = await load('pbakaus/impeccable', { markdown: '# Unknown\n```md\nA reviewer critique scores the design audit checks accessibility\n```' });
  assert.equal(absent.calls.length, 0);
  const root = anthropic.root;
  const linked = await fetchLinkedDocuments('[PDF](https://github.com/other/repo/blob/main/skills/pdf)', 'anthropics/skills', root.metadata, { fetcher: async () => { throw Error('요청하면 안 됨'); } });
  assert.equal(linked.states.length, 0);
});

test('대표 파일 SHA 변경 시 재분석하고 같으면 재사용한다', async () => {
  const value = await load('pbakaus/impeccable');
  let changed = false;
  const fetcher = async (url, options) => url.includes('api.github.com') ? { ok: true, json: async () => ({ ...value.root.metadata, encoding: 'base64', content: Buffer.from(value.root.markdown).toString('base64') }) } : changed && url.endsWith('/skill/reference/audit.md') ? new Response(fixtures.find(item => item.path === 'skill/reference/audit.md').markdown + '\n') : value.fetcher(url, options);
  const first = await fetchUsage({ name: value.name }, { now, fetcher });
  const reused = await fetchUsage({ name: value.name }, { now, fetcher, previousUsage: first });
  assert.equal(reused.analysisReused, true);
  changed = true;
  const next = await fetchUsage({ name: value.name }, { now, fetcher, previousUsage: first });
  assert.equal(next.analysisReused, false);
  assert.notEqual(next.sourceFingerprint, first.sourceFingerprint);
});

test('6개 대표 예를 종합에 반영하고 일반 입출력 집계에 합산하지 않는다', async () => {
  const rows = await Promise.all([...new Set(skillExamples.map(item => item.repository))].map(name => load(name)));
  const report = createReport('daily', rows.map(({ name, usage }) => ({ name, usage })), now);
  Object.assign(report, synthesizeReport(report, 'daily', now));
  validatePublication({ reports: { daily: report } });
  assert.equal(report.synthesis.coverage.examples, 6);
  assert.equal(report.synthesis.coverage.exampleMissing, 0);
  assert.equal(report.synthesis.coverage.exampleUnconfigured, 0);
  assert.equal(report.synthesis.coverage.inputs, 1);
  assert.equal(report.synthesis.coverage.outputs, 0);
  const invalid = structuredClone(report);
  invalid.rows[0].usage.article.project.examples[0].output.body = '실행 검증 완료';
  assert.throws(() => validatePublication({ reports: { daily: invalid } }), /설명·근거/);
});

test('이전 분석기 11의 미지원 판정은 문서 재조회 전까지 보존한다', () => {
  const root = roots.find(item => item.repository === 'anthropics/skills');
  const usage = analyzeUsage({ name: root.repository }, root.markdown, now, root.metadata, root.linkedDocuments);
  usage.version = 11; usage.analyzerVersion = 11; addKoreanPresentation(usage); usage.quality = assessQuality(usage);
  assert.equal(usage.quality.representatives.status, 'not-configured');
  assert.equal(usage.quality.representatives.expected, 0);
  validateUsage(usage);
});
