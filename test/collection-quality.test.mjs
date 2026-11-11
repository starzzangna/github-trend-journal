import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { analyzeUsage } from '../scripts/usage.mjs';
import { validateUsage, validatePublication } from '../scripts/contracts.mjs';
import { synthesizeReport } from '../scripts/report.mjs';
import { createReport } from '../scripts/trends.mjs';

const fixtures = JSON.parse(await readFile(new URL('./fixtures/representative-documents.json', import.meta.url)));
const now = new Date('2026-11-12T00:00:00Z');
export function collectionRow({ missing = false, noBasis = false } = {}) {
  const name = 'anthropics/knowledge-work-plugins';
  const markdown = noBasis ? '# Unknown' : '# Plugins\nPlugins that turn Claude into a specialist for your role, team, and company.\n\nEach plugin bundles the skills, connectors, slash commands, and sub-agents for a specific job function.';
  const docs = fixtures.filter(item => item.repository === name && (!missing || item.id !== 'plugin-sales-call')).map(item => ({ markdown: item.markdown, metadata: { path: item.path, sha: item.id, representativeId: item.id, html_url: `https://github.com/${name}/blob/main/${item.path}` } }));
  const usage = analyzeUsage({ name }, markdown, now, { path: 'README.md', sha: 'root' }, docs);
  validateUsage(usage);
  return { name, usage };
}

test('모음형 근거가 있을 때만 공통 입출력을 해당 없음으로 분리한다', () => {
  const { usage } = collectionRow();
  assert.deepEqual(usage.quality.io, { input: 'not-applicable', output: 'not-applicable' });
  assert.deepEqual(usage.quality.notApplicable, ['입력', '출력']);
  assert.ok(!usage.quality.missing.includes('출력'));
  assert.deepEqual(usage.quality.representatives, { expected: 2, available: 2, status: 'tracked' });
  assert.ok(usage.quality.missing.includes('도입 조건'));
  assert.equal(usage.quality.status, 'partial');
  const unknown = collectionRow({ noBasis: true }).usage;
  assert.equal(unknown.article.project.ioScope, null);
  assert.equal(unknown.quality.io.output, 'insufficient-evidence');
  assert.ok(unknown.quality.missing.includes('출력'));
});

test('대표 항목 누락은 별도 부족으로 남고 해당 없음으로 품질을 부풀리지 않는다', () => {
  const { usage } = collectionRow({ missing: true });
  assert.equal(usage.quality.io.output, 'not-applicable');
  assert.deepEqual(usage.quality.representatives, { expected: 2, available: 1, status: 'tracked' });
  assert.ok(usage.quality.missing.includes('대표 항목: sales · 통화 후 요약'));
  assert.equal(usage.quality.status, 'partial');
});

test('해당 없음의 출처 조작·근거 없는 면제·거짓 대표 충족 수를 거부한다', () => {
  for (const mutate of [
    value => { value.article.project.ioScope.evidenceIds = ['missing']; },
    value => { value.quality.io.output = 'documented'; },
    value => { value.quality.notApplicable = []; },
    value => { value.quality.representatives.available = 99; }
  ]) {
    const usage = collectionRow().usage; mutate(usage);
    assert.throws(() => validateUsage(usage), /범위|품질/);
  }
  const unknown = collectionRow({ noBasis: true }).usage;
  unknown.article.project.ioScope = collectionRow().usage.article.project.ioScope;
  assert.throws(() => validateUsage(unknown), /범위/);
});

test('종합은 해당 없음·근거 부족·문서 미확인과 대표 예를 중복 없이 집계한다', () => {
  const collection = collectionRow({ missing: true });
  collection.usage.stale = true;
  collection.usage.document.status = 'unavailable';
  const unknown = { name: 'example/unknown', usage: analyzeUsage({ name: 'example/unknown' }, '# Unknown', now) };
  const unavailable = { name: 'example/offline', usage: { status: 'unavailable' } };
  const report = createReport('daily', [collection, unknown, unavailable], now);
  Object.assign(report, synthesizeReport(report, 'daily', now));
  const coverage = report.synthesis.coverage;
  assert.equal(coverage.outputs, 0);
  assert.equal(coverage.outputsNotApplicable, 1);
  assert.equal(coverage.outputEvidenceMissing, 1);
  assert.equal(coverage.unavailable, 1);
  assert.equal(coverage.total, coverage.outputs + coverage.outputsNotApplicable + coverage.outputEvidenceMissing + coverage.unavailable);
  assert.equal(coverage.examples, 1);
  assert.equal(coverage.exampleMissing, 1);
  assert.equal(coverage.stale, 1);
  assert.match(report.synthesis.representativeExamples[0].output.body, /PRD/);
  assert.equal(report.synthesis.representativeExamples[0].name, collection.name);
  assert.ok(!report.synthesis.sharedPatterns.some(item => item.projects.some(value => value.name === collection.name) && item.kind !== 'condition'));
});

test('대표 항목 종합의 문장·근거·숫자 조작을 저장 경계에서 거부한다', () => {
  const report = createReport('daily', [collectionRow()], now);
  Object.assign(report, synthesizeReport(report, 'daily', now));
  validatePublication({ reports: { daily: report } });
  for (const mutate of [
    value => { value.synthesis.representativeExamples[0].output.body = '모든 작업을 자동 완료'; },
    value => { value.synthesis.representativeExamples[0].input.evidenceIds = ['fake']; },
    value => { value.synthesis.coverage.outputsNotApplicable = 99; }
  ]) {
    const invalid = structuredClone(report); mutate(invalid);
    assert.throws(() => validatePublication({ reports: { daily: invalid } }), /종합 보고서/);
  }
});
