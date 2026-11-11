import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeUsage, fetchUsage } from '../scripts/usage.mjs';
import { createReport } from '../scripts/trends.mjs';
import { synthesizeReport } from '../scripts/report.mjs';
import { collectPublication } from '../scripts/publication.mjs';
import { validatePublication } from '../scripts/contracts.mjs';

const now = new Date('2026-11-11T00:23:00Z');
const row = name => ({ name, description: 'Browser automation', language: 'Rust' });
const markdown = '# Browser\nBrowser automation.\n## Input\nA URL.\n## Output\nA screenshot.\n## Requirements\nRequires Python 3.12.';
const buildRow = name => { const value = row(name); return { ...value, usage: analyzeUsage(value, markdown, now) }; };
const compose = rows => { const report = createReport('daily', rows, now); return { ...report, ...synthesizeReport(report, 'daily', now) }; };

test('프로젝트별 분석 결과로 분야 분포·입출력·공통 조건을 종합하고 미분류를 포함한다', () => {
  const unknown = { name: 'sample/unknown', description: '', usage: analyzeUsage({ name: 'sample/unknown', description: '' }, '# Unknown', now) };
  const report = compose([buildRow('sample/a'), buildRow('sample/b'), unknown]);
  assert.equal(report.synthesis.coverage.total, 3);
  assert.equal(report.synthesis.coverage.classified, 2);
  assert.equal(report.synthesis.coverage.unknown, 1);
  assert.equal(report.synthesis.coverage.inputs, 2);
  assert.equal(report.synthesis.categoryGroups[0].category, '브라우저 자동화');
  assert.equal(report.synthesis.categoryGroups[0].count, 2);
  const condition = report.synthesis.sharedPatterns.find(pattern => pattern.kind === 'condition' && pattern.title === 'Python');
  assert.equal(condition.projects.length, 2);
  assert.equal(condition.projects[0].scope, 'required');
  assert.ok(condition.projects[0].evidenceIds.length);
  assert.match(report.summary, /3개 중.*2개/);
  validatePublication({ reports: { daily: report } });
});

test('문서 조회 실패·부분 분석·오래된 분석을 숨기지 않는다', async () => {
  const stale = buildRow('sample/stale'); stale.usage.stale = true; stale.usage.document.status = 'unavailable';
  const unavailable = await fetchUsage(row('sample/missing'), { now, token: '', fetcher: async () => ({ status: 404 }) });
  const report = compose([stale, { ...row('sample/missing'), usage: unavailable }]);
  assert.equal(report.synthesis.coverage.stale, 1);
  assert.equal(report.synthesis.coverage.unavailable, 1);
  assert.equal(report.synthesis.coverage.unknown, 1);
  assert.match(report.analysis.join(' '), /이전 분석.*1개/);
});

test('종합은 분석 처리가 끝난 뒤 수행하며 동일 내용이면 갱신 시각을 유지한다', async () => {
  const ledger = ['daily:2026-11-11', 'weekly:2026-11-09', 'monthly:2026-11'].map(issue => ({ issue }));
  const previous = { version: 1, ledger, reports: { daily: createReport('daily', [row('sample/a'), row('sample/b')], now) } };
  const result = await collectPublication(previous, { now, analyzeProject: async value => analyzeUsage(value, markdown, now) });
  assert.equal(result.state.reports.daily.synthesis.coverage.classified, 2);
  assert.deepEqual(result.state.ledger, ledger);
  const later = synthesizeReport(result.state.reports.daily, 'daily', new Date(now.getTime() + 3600000));
  assert.equal(later.synthesis.generatedAt, result.state.reports.daily.synthesis.generatedAt);
  assert.equal(result.state.reports.daily.publishedAt, previous.reports.daily.publishedAt);
});

test('미확인 분류와 존재하지 않는 근거를 집계하지 않는다', () => {
  const value = buildRow('sample/a');
  value.usage.classification.evidenceIds = ['missing'];
  value.usage.article.project.inputs[0].evidenceIds = ['missing'];
  const report = compose([value]);
  assert.equal(report.synthesis.coverage.classified, 0);
  assert.equal(report.synthesis.coverage.inputs, 0);
  assert.equal(report.synthesis.coverage.unknown, 1);
});

test('근거 없는 종합 문장과 부풀린 집계를 빌드 전에 거부한다', () => {
  const report = compose([buildRow('sample/a'), buildRow('sample/b')]);
  for (const mutate of [
    value => { value.synthesis.coverage.classified = 99; },
    value => { value.synthesis.sharedPatterns[0].projects[0].evidenceIds = ['missing']; },
    value => { value.summary = '모든 프로젝트는 반드시 빠릅니다.'; }
  ]) {
    const invalid = structuredClone(report); mutate(invalid);
    assert.throws(() => validatePublication({ reports: { daily: invalid } }), /종합 보고서/);
  }
});
