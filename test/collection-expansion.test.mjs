import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { analyzeUsage } from '../scripts/usage.mjs';
import { validateUsage, validatePublication } from '../scripts/contracts.mjs';
import { createReport } from '../scripts/trends.mjs';
import { synthesizeReport } from '../scripts/report.mjs';

const docs = JSON.parse(await readFile(new URL('./fixtures/collection-documents.json', import.meta.url)));
const now = new Date('2026-11-12T00:00:00Z');
const base = docs.find(item => item.repository === 'anthropics/skills');
const analyze = (doc, extra = '', name = doc.repository) => {
  const usage = analyzeUsage({ name }, doc.markdown + extra, now, doc.metadata, doc.linkedDocuments);
  validateUsage(usage);
  return { name, usage };
};

test('실제 스킬 모음의 독립된 작업 근거를 확인하고 이름 목록 없이 같은 근거에 같은 판정을 적용한다', () => {
  for (const name of ['anthropics/skills', 'addyosmani/agent-skills']) {
    const row = analyze(docs.find(item => item.repository === name));
    assert.deepEqual(row.usage.quality.io, { input: 'not-applicable', output: 'not-applicable' });
    assert.deepEqual(row.usage.quality.representatives, { expected: 2, available: 0, status: 'tracked' });
    assert.ok(row.usage.quality.missing.some(item => item.startsWith('대표 항목:')));
  }
  const renamed = analyze(base, '', 'example/independent-skills');
  assert.deepEqual(renamed.usage.quality.notApplicable, ['입력', '출력']);
});

test('공통 명령·대상 입력이 있는 실제 Impeccable은 입력 평가를 유지하고 출력만 제외한다', () => {
  const { usage } = analyze(docs.find(item => item.repository === 'pbakaus/impeccable'));
  assert.deepEqual(usage.quality.io, { input: 'documented', output: 'not-applicable' });
  assert.deepEqual(usage.quality.notApplicable, ['출력']);
  assert.equal(usage.article.project.inputs[0].title, '공통 입력 계약');
  assert.match(usage.evidence.find(item => item.id === usage.article.project.inputs[0].evidenceIds[0]).excerpt, /Then name a command and a target/);
});

test('같은 스킬 분류라도 작업 경로가 정해진 실제 도구는 입출력 평가를 유지한다', () => {
  for (const name of ['cloudflare/security-audit-skill', 'shadcn/improve', 'Nutlope/hallmark', 'GoogleChrome/modern-web-guidance-src']) {
    const { usage } = analyze(docs.find(item => item.repository === name));
    assert.equal(usage.article.project.ioScope, null);
    assert.deepEqual(usage.quality.io, { input: 'documented', output: 'documented' });
  }
});

test('공통 입력·출력 계약이 명시된 모음은 두 항목 모두 평가하며 한쪽만 있어도 각각 판단한다', () => {
  for (const [extra, expected] of [
    ['\n## Common input\nAll skills accept a JSON request.\n## Common output\nAll skills return a JSON response.', { input: 'documented', output: 'documented' }],
    ['\n## Common output\nAll skills return a JSON response.', { input: 'not-applicable', output: 'documented' }],
    ['\nAll skills accept a JSON request.', { input: 'documented', output: 'not-applicable' }]
  ]) {
    const { usage } = analyze(base, extra);
    assert.deepEqual(usage.quality.io, expected);
    if (!Object.values(expected).includes('not-applicable')) assert.ok(!usage.quality.missing.includes('대표 항목 근거'));
  }
});

test('모음이라는 소개·지원 포맷·설명 부족만으로 해당 없음으로 처리하지 않는다', () => {
  for (const markdown of ['# Skills\nA collection of skills.', '# Skills\nEach skill is self-contained in its own folder with a SKILL.md file.', '# Unknown']) {
    const { usage } = analyze({ ...base, markdown, linkedDocuments: [] });
    assert.equal(usage.article.project.ioScope, null);
    assert.deepEqual(usage.quality.notApplicable, []);
    assert.equal(usage.quality.io.output, 'insufficient-evidence');
  }
});

test('공통 계약 절이 비어 있거나 미지원·예정이면 부족으로 남기고 예시 코드는 공통 계약으로 쓰지 않는다', () => {
  for (const extra of ['\n## Common output\n', '\n## Common output\nNot yet supported.', '\nAll skills do not return a unified response.']) {
    const { usage } = analyze(base, extra);
    assert.equal(usage.quality.io.output, 'insufficient-evidence');
    assert.ok(usage.quality.missing.includes('출력'));
  }
  for (const extra of ['\n## Example\nAll skills return a JSON response.', '\n```text\nAll skills return a JSON response.\n```']) {
    const { usage } = analyze(base, extra);
    assert.equal(usage.quality.io.output, 'not-applicable');
    assert.deepEqual(usage.article.project.ioScope.contracts, {});
  }
});

test('공통 계약을 면제로 바꾸거나 엉뚱한 근거·허위 설명을 넣으면 저장 전에 거부한다', () => {
  for (const mutate of [
    value => { value.article.project.ioScope.hints = {}; value.article.project.ioScope.contracts = {}; value.article.project.ioScope.exempt = ['input', 'output']; },
    value => { value.article.project.ioScope.hints.output = value.article.project.ioScope.evidenceIds; value.article.project.ioScope.exempt = []; },
    value => { value.article.project.inputs[0].body = '모든 파일을 무조건 지원합니다.'; }
  ]) {
    const { usage } = analyze(base, '\nAll skills accept a JSON request.');
    mutate(usage);
    assert.throws(() => validateUsage(usage), /공통 계약|범위/);
  }
});

test('확장한 모음과 혼합 계약을 종합할 때 입력·출력 분모와 대표 항목 미지원 수를 보존한다', () => {
  const rows = [analyze(base), analyze(docs.find(item => item.repository === 'pbakaus/impeccable')), analyze(docs.find(item => item.repository === 'cloudflare/security-audit-skill'))];
  const report = createReport('daily', rows, now);
  Object.assign(report, synthesizeReport(report, 'daily', now));
  validatePublication({ reports: { daily: report } });
  const c = report.synthesis.coverage;
  assert.equal(c.inputs, 2);
  assert.equal(c.inputsNotApplicable, 1);
  assert.equal(c.outputs, 1);
  assert.equal(c.outputsNotApplicable, 2);
  assert.equal(c.exampleUnconfigured, 0);
  assert.equal(c.exampleMissing, 4);
});
