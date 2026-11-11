import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { analyzeUsage } from '../scripts/usage.mjs';
import { assessQuality } from '../scripts/evidence.mjs';
import { validateUsage, validatePublication } from '../scripts/contracts.mjs';
import { synthesizeReport } from '../scripts/report.mjs';
import { createReport } from '../scripts/trends.mjs';
import { addKoreanPresentation } from '../scripts/korean.mjs';

const fixture = JSON.parse(await readFile(new URL('./fixtures/skills-setup.json', import.meta.url)));
const now = new Date('2026-11-12T00:00:00Z');
const analyze = ({ markdown = fixture.markdown, omit, mutate = text => text } = {}) => {
  const documents = fixture.documents.filter(item => item.path !== omit).map(item => ({ markdown: mutate(item.markdown), metadata: { path: item.path, sha: item.path, representativeId: item.path.includes('/pdf/') ? 'skill-pdf-text' : 'skill-xlsx-edit' } }));
  const usage = analyzeUsage({ name: fixture.repository }, markdown, now, fixture.metadata, documents);
  validateUsage(usage);
  return usage;
};

test('공식 Claude Code 설치 경로와 대표 실행 조건을 확인해 남은 품질 미확인을 해소한다', () => {
  const usage = analyze();
  assert.equal(usage.start.heading, 'Claude Code');
  assert.match(usage.start.command, /marketplace add anthropics\/skills/);
  assert.equal(usage.article.coverage.hasStart, true);
  assert.equal(usage.quality.status, 'complete');
  assert.deepEqual(usage.quality.missing, []);
  assert.deepEqual(usage.quality.setup, { installation: 'documented', runtimeExpected: 2, runtimeAvailable: 2, missing: [] });
  assert.equal(usage.article.project.conditions.length, 1);
  assert.equal(usage.article.project.conditions[0].scope, 'optional');
  assert.ok(usage.start.evidenceIds.every(id => usage.evidence.find(item => item.id === id).sourceId === 'readme'));
});

test('PDF 선택 OCR·문서 전제 패키지·수식 파일 요구사항의 범위와 근거를 구분한다', () => {
  const setup = analyze().article.project.setup;
  const [pdf, xlsx] = setup.runtimes;
  assert.equal(pdf.conditions.find(item => item.id === 'pdf-ocr').applicability, 'optional');
  assert.equal(xlsx.conditions.find(item => item.id === 'xlsx-packages').applicability, 'documented-environment');
  assert.match(xlsx.conditions[0].body, /로컬 설치를 확인한 결과가 아닙니다/);
  assert.match(xlsx.conditions[1].body, /종료 코드만 보지 말고 JSON/);
  assert.ok(setup.runtimes.every(item => item.expected === 2 && item.conditions.length === 2));
});

test('설치 명령이 없으면 시작 경로와 공통 설치 조건을 억지로 채우지 않는다', () => {
  const usage = analyze({ markdown: fixture.markdown.replace('/plugin marketplace add anthropics/skills', 'removed') });
  assert.equal(usage.article.project.setup.installation, null);
  assert.equal(usage.start, null);
  assert.ok(usage.quality.missing.includes('시작 경로'));
  assert.ok(usage.quality.missing.includes('도입 조건'));
  assert.equal(usage.quality.setup.runtimeAvailable, 2);
});

test('대표 파일 누락 또는 실행 조건 문구 변경은 조건 부족으로 남기고 정상 근거를 보존한다', () => {
  const missing = analyze({ omit: 'skills/pdf/SKILL.md' });
  assert.equal(missing.quality.setup.runtimeAvailable, 1);
  assert.ok(missing.quality.missing.includes('대표 실행 조건: pdf · PDF 텍스트 추출'));
  assert.equal(missing.article.project.setup.installation.scope, 'collection-install');
  const changed = analyze({ mutate: text => text.replace('are preinstalled', 'environment changed') });
  assert.equal(changed.quality.setup.runtimeAvailable, 1);
  assert.equal(changed.article.project.setup.runtimes[1].conditions.length, 1);
  assert.ok(changed.quality.missing.includes('대표 실행 조건: xlsx · 스프레드시트 편집'));
});

test('대표 런타임을 공통 필수 조건으로 승격하거나 다른 스킬 근거로 바꾸면 거부한다', () => {
  for (const mutate of [
    value => { value.article.project.conditions.push({ ...value.article.project.setup.runtimes[0].conditions[0], scope: 'required' }); },
    value => { value.article.project.setup.runtimes[0].conditions[0].evidenceIds = value.article.project.setup.runtimes[1].conditions[0].evidenceIds; },
    value => { value.quality.setup.runtimeAvailable = 99; },
    value => { value.start.command = 'unverified command'; },
    value => { value.article.project.setup.installation = null; },
    value => { value.article.project.setup.runtimes[1].conditions[0].body = '로컬에 모든 도구가 설치돼 있습니다.'; }
  ]) {
    const usage = analyze(); mutate(usage); addKoreanPresentation(usage);
    assert.throws(() => validateUsage(usage), /조건|경로/);
  }
});

test('종합에서 공통 설치 1개와 대표 실행 조건 4개를 별도 집계하고 변조를 거부한다', () => {
  const usage = analyze();
  const report = createReport('weekly', [{ name: fixture.repository, usage }], now);
  Object.assign(report, synthesizeReport(report, 'weekly', now));
  validatePublication({ reports: { weekly: report } });
  const c = report.synthesis.coverage;
  assert.equal(c.complete, 1);
  assert.equal(c.conditions, 1);
  assert.equal(c.collectionInstallations, 1);
  assert.equal(c.runtimeGroups, 2);
  assert.equal(c.runtimeMissing, 0);
  assert.equal(c.runtimeConditions, 4);
  assert.equal(report.synthesis.setupReviews.length, 1);
  const invalid = structuredClone(report);
  invalid.synthesis.setupReviews[0].runtimes[0].conditions[0].body = '모든 스킬은 Python 필수';
  assert.throws(() => validatePublication({ reports: { weekly: invalid } }), /종합 보고서/);
});

test('이전 분석기 12는 설치 판정을 새 규칙으로 강제하지 않고 미확인을 보존한다', () => {
  const usage = analyze();
  usage.version = 12; usage.analyzerVersion = 12;
  usage.start = null;
  delete usage.article.project.setup;
  usage.article.project.conditions = [];
  usage.article.conditions = [];
  usage.quality = assessQuality(usage);
  validateUsage(usage);
  assert.ok(usage.quality.missing.includes('시작 경로'));
  assert.ok(usage.quality.missing.includes('도입 조건'));
  assert.equal(usage.quality.setup, undefined);
});
