import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { analyzeUsage } from '../scripts/usage.mjs';
import { createReport } from '../scripts/trends.mjs';
import { synthesizeReport } from '../scripts/report.mjs';
import { validatePublication } from '../scripts/contracts.mjs';
import { assessQuality } from '../scripts/evidence.mjs';

const docs = JSON.parse(await readFile(new URL('./fixtures/operation-documents.json', import.meta.url)));
const now = new Date('2026-11-12T00:00:00Z');
function row(name) {
  const doc = docs.find(d => d.repository === name);
  const [root, ...linked] = doc.documents;
  return { ...doc.row, usage: analyzeUsage(doc.row, root.markdown, now, root.metadata, linked.map(d => ({ markdown: d.markdown, metadata: d.metadata }))) };
}
function compose(rows) {
  const report = createReport('daily', rows, now);
  Object.assign(report, synthesizeReport(report, 'daily', now));
  return report;
}

test('같은 스킬 분야라도 계획 파일과 대표 스킬의 결과물을 구분한다', () => {
  const report = compose(['shadcn/improve', 'addyosmani/agent-skills'].map(row));
  const group = report.synthesis.comparisons[0];
  assert.equal(group.category, 'AI 에이전트 스킬');
  assert.equal(group.mode, 'comparison');
  const [improve, skills] = group.projects;
  assert.match(improve.processing[0].body, /plans\/.*의존 관계/);
  assert.match(improve.outputs.claims[0].body, /plans\/.*색인/);
  assert.match(improve.conditions.map(c => c.body).join(' '), /Agent Skills.*격리.*worktree.*수동 실행자/);
  assert.equal(skills.outputs.status, 'not-applicable');
  assert.deepEqual(skills.outputs.claims, []);
  assert.equal(skills.outputs.examples.length, 2);
  assert.ok(skills.outputs.examples.every(e => /대표 항목/.test(e.context) && e.exampleOnly));
  assert.match(skills.conditions[0].body, /계획을 한 번 승인.*개별 커밋.*멈추/);
  validatePublication({ reports: { daily: report } });
});

test('에이전트 운영의 팀 공유 파일과 권한별 MCP 작업을 각 문서로 비교한다', () => {
  const report = compose(['milind-soni/OpenMausBot', 'pingdotgg/t3code'].map(row));
  const [bots, t3] = report.synthesis.comparisons[0].projects;
  assert.match(bots.processing[0].body, /로컬 claude·codex·grok CLI.*기존 로그인/);
  assert.match(bots.outputs.claims[0].body, /하나의 파일.*키·비밀번호는 포함하지/);
  assert.match(bots.conditions[0].body, /Node 24.*설치되고 로그인/);
  assert.match(t3.outputs.claims[0].body, /Read only.*변경은 할 수 없/);
  const evidence = report.rows[1].usage.evidence.find(e => e.id === t3.outputs.claims[0].evidenceIds[0]);
  assert.equal(report.rows[1].usage.sources.find(s => s.id === evidence.sourceId).path, 'docs/user/outside-agents.md');
  assert.match(t3.conditions[0].body, /npx 실행용 Node.js/);
});

test('디자인 분야의 HTML·CSS 결과와 대표 평가 결과를 공통 출력으로 합치지 않는다', () => {
  const report = compose(['Nutlope/hallmark', 'pbakaus/impeccable'].map(row));
  const [page, design] = report.synthesis.comparisons[0].projects;
  assert.match(page.outputs.claims[0].body, /독립적인 HTML·CSS.*CSS 주석/);
  assert.equal(design.inputs.status, 'documented');
  assert.match(design.inputs.claims[0].body, /명령 이름과.*대상/);
  assert.equal(design.outputs.status, 'not-applicable');
  assert.equal(design.outputs.examples.length, 2);
  assert.match(design.conditions.map(c => c.body).join(' '), /로컬 checkout.*CLI.*샌드박스/);
  assert.equal(report.synthesis.coverage.outputsNotApplicable, 1);
});

test('모든 분류된 프로젝트를 요약하되 단독 분야는 비교 대상을 만들어내지 않는다', () => {
  const report = compose(docs.map(d => row(d.repository)));
  assert.equal(report.synthesis.comparisons.flatMap(g => g.projects).length, 27);
  for (const group of report.synthesis.comparisons) {
    assert.equal(group.mode, group.projects.length > 1 ? 'comparison' : 'single');
    for (const item of group.projects) {
      assert.equal(item.state, 'ready', item.name);
      const source = report.rows.find(r => r.name === item.name).usage;
      for (const claim of [...item.processing, ...item.inputs.claims, ...item.outputs.claims, ...item.inputs.examples, ...item.outputs.examples, ...item.conditions]) {
        assert.ok(claim.evidenceIds.every(id => source.evidence.some(e => e.id === id)), item.name);
      }
    }
  }
  validatePublication({ reports: { daily: report } });
});

test('문서 실패로 보존한 분석과 근거 부족을 비교에서 숨기지 않는다', () => {
  const old = row('pingdotgg/t3code');
  old.usage.stale = true; old.usage.document.status = 'unavailable';
  const partial = row('milind-soni/OpenMausBot');
  partial.usage.article.project.outputs = [];
  partial.usage.quality = assessQuality(partial.usage);
  const report = compose([old, partial]);
  const [saved, missing] = report.synthesis.comparisons[0].projects;
  assert.equal(saved.state, 'ready');
  assert.ok(saved.outputs.claims.length);
  assert.equal(missing.outputs.status, 'insufficient-evidence');
  assert.deepEqual(missing.outputs.claims, []);
  assert.deepEqual(missing.outputs.examples, []);
  assert.equal(report.synthesis.coverage.stale, 1);
});

test('이전 분석이나 잘못된 근거를 새 비교 설명으로 승격하지 않는다', () => {
  const old = row('pingdotgg/t3code'); old.usage.version = old.usage.analyzerVersion = 16;
  const invalid = row('milind-soni/OpenMausBot'); invalid.usage.article.core[0].body = '모든 에이전트보다 빠릅니다.';
  const [legacy, rejected] = compose([old, invalid]).synthesis.comparisons[0].projects;
  assert.equal(legacy.state, 'legacy');
  assert.equal(rejected.state, 'insufficient-evidence');
  assert.deepEqual(rejected.processing, []);
  assert.deepEqual(rejected.conditions, []);
});

test('비교의 본문·근거·모음 범위나 집계를 바꾸면 저장 경계에서 거부한다', () => {
  const report = compose(['shadcn/improve', 'addyosmani/agent-skills'].map(row));
  for (const change of [
    r => { r.synthesis.comparisons[0].projects[0].processing[0].body = '더 뛰어난 도구입니다.'; },
    r => { r.synthesis.comparisons[0].projects[0].outputs.claims[0].evidenceIds = ['missing']; },
    r => { r.synthesis.comparisons[0].projects[1].outputs.status = 'documented'; },
    r => { r.synthesis.comparisons[0].projects.pop(); }
  ]) {
    const invalid = structuredClone(report); change(invalid);
    assert.throws(() => validatePublication({ reports: { daily: invalid } }), /종합 보고서/);
  }
  const later = synthesizeReport(report, 'daily', new Date(now.getTime() + 3600000));
  assert.equal(later.synthesis.generatedAt, report.synthesis.generatedAt);
});
