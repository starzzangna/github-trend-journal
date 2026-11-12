import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { analyzeUsage } from '../scripts/usage.mjs';
import { validateUsage } from '../scripts/contracts.mjs';
import { synthesizeReport } from '../scripts/report.mjs';
import { assessQuality } from '../scripts/evidence.mjs';

const docs = JSON.parse(await readFile(new URL('./fixtures/operation-documents.json', import.meta.url)));
const now = new Date('2026-11-12T00:00:00Z');
function analyze(doc, documents = doc.documents) {
  const [root, ...linked] = documents;
  return analyzeUsage(doc.row, root.markdown, now, root.metadata, linked.map(d => ({ markdown: d.markdown, metadata: d.metadata })));
}
const get = name => analyze(docs.find(d => d.repository === name));

test('고유 27개 프로젝트의 핵심 동작과 평가 대상 입출력을 공식 문서로 구체화한다', () => {
  assert.equal(docs.length, 27);
  const bodies = new Set();
  for (const doc of docs) {
    const usage = analyze(doc);
    validateUsage(usage);
    const claims = [...usage.article.findings, ...usage.article.project.inputs, ...usage.article.project.outputs].filter(c => c.id?.startsWith('detail:'));
    assert.deepEqual(claims.map(c => c.id), doc.expected, doc.repository);
    assert.ok(usage.article.core.length, doc.repository);
    for (const c of claims) {
      assert.doesNotMatch(c.body, /관련 기능을 다룹니다|세부 동작은 원문|자료를 전달합니다\.$/);
      assert.ok(!bodies.has(c.body), doc.repository);
      bodies.add(c.body);
      assert.ok(c.evidenceIds.every(id => usage.evidence.some(e => e.id === id)));
    }
  }
  assert.equal(bodies.size, 76);
});

test('영상 변환의 중복 동작을 하나로 정리하고 입력 구성과 MP4 출력을 설명한다', () => {
  const usage = get('heygen-com/hyperframes');
  assert.equal(usage.article.core.length, 1);
  assert.match(usage.article.core[0].body, /Chrome.*프레임.*FFmpeg/);
  assert.match(usage.article.project.inputs[0].summaryKo, /타이밍·트랙 data 속성.*frame adapter/);
  assert.match(usage.article.project.outputs[0].summaryKo, /MP4/);
});

test('CAD 설치 명령을 입력 근거로 사용하지 않고 설계 요청과 실제 파일 형식을 연결한다', () => {
  const usage = get('earthtojake/text-to-cad');
  assert.match(usage.article.project.inputs[0].summaryKo, /부품이나 조립체/);
  const input = usage.article.project.inputs[0];
  const evidence = input.evidenceIds.map(id => usage.evidence.find(e => e.id === id));
  assert.ok(evidence.every(e => e.kind === 'prose'));
  assert.doesNotMatch(JSON.stringify(evidence), /curl|install\.sh/);
  assert.match(usage.article.project.outputs[0].summaryKo, /STEP·GLB·STL·3MF/);
});

test('같은 보안·에이전트 분야라도 결과 형식과 연결 범위를 구분한다', () => {
  const security = get('openai/codex-security'), audit = get('cloudflare/security-audit-skill');
  assert.match(security.article.project.outputs[0].summaryKo, /SARIF·JSON·CSV/);
  assert.match(audit.article.project.outputs[0].summaryKo, /REPORT.md·FINDINGS-DETAIL.md·NEEDS-VALIDATION.md/);
  assert.match(get('milind-soni/OpenMausBot').article.project.outputs[0].summaryKo, /대화 이력·키·비밀번호는 포함하지/);
  assert.match(get('pingdotgg/t3code').article.project.outputs[0].summaryKo, /Read only.*변경은 할 수 없/);
  assert.match(get('homeassistant-ai/ha-mcp').article.project.inputs[0].summaryKo, /사용 예/);
  assert.equal(get('homeassistant-ai/ha-mcp').article.project.outputs[0].exampleOnly, true);
});

test('모음의 대표 예를 공통 입출력으로 승격하지 않고 실제 공통 계약은 계속 평가한다', () => {
  for (const name of ['TheAlgorithms/Java', 'anthropics/skills', 'addyosmani/agent-skills', 'anthropics/knowledge-work-plugins']) {
    const usage = get(name);
    assert.equal(usage.quality.io.input, 'not-applicable', name);
    assert.equal(usage.quality.io.output, 'not-applicable', name);
    assert.equal(usage.article.project.examples.length, 2, name);
    assert.ok(usage.article.project.examples.every(e => e.input.evidenceIds.length && e.output.evidenceIds.length));
  }
  const design = get('pbakaus/impeccable');
  assert.equal(design.quality.io.input, 'documented');
  assert.equal(design.article.project.inputs[0].title, '공통 입력 계약');
  assert.match(design.article.project.inputs[0].summaryKo, /명령 이름과.*대상/);
});

test('설명에 필요한 문구·연결 문서가 사라지면 미확인으로 남기고 다음 분석에서 복구한다', () => {
  const doc = docs.find(d => d.repository === 'pingdotgg/t3code');
  const missing = analyze(doc, doc.documents.filter(d => d.path !== 'docs/user/outside-agents.md'));
  assert.deepEqual(missing.article.core, []);
  assert.deepEqual(missing.article.project.inputs, []);
  assert.deepEqual(missing.article.project.outputs, []);
  assert.equal(missing.quality.status, 'partial');
  assert.ok(missing.quality.missing.includes('핵심 기능 근거'));
  assert.equal(get(doc.repository).quality.io.input, 'documented');
  const cad = docs.find(d => d.repository === 'earthtojake/text-to-cad');
  const onlyCode = analyze(cad, [{ ...cad.documents[0], markdown: '# CAD\n```text\nThen ask your agent for a part or an assembly: it writes the model as a Python script, runs it to build the model and shows it in the CAD viewer.\n```' }]);
  assert.deepEqual(onlyCode.article.project.inputs, []);
  const unsupported = analyze(cad, [{ ...cad.documents[0], markdown: '# CAD\nThis workflow does not support: ask your agent for a part or an assembly, which writes the model as a Python script.' }]);
  assert.deepEqual(unsupported.article.project.inputs, []);
});

test('한국어 설명·원문·출처 경로·예시 범위를 바꾸면 검증에서 거부한다', () => {
  const usage = get('pingdotgg/t3code');
  for (const change of [
    u => { u.article.project.outputs[0].body = '원본 코드 전체를 자동 수정합니다.'; },
    u => { u.article.project.inputs[0].evidenceIds = ['missing']; },
    u => { u.sources.find(s => s.path === 'docs/user/outside-agents.md').path = 'unrelated.md'; },
    u => { u.article.project.inputs[0].exampleOnly = true; }
  ]) {
    const invalid = structuredClone(usage); change(invalid);
    assert.throws(() => validateUsage(invalid), /핵심 동작·입출력|문서 지문/);
  }
  const report = synthesizeReport({ rows: [{ name: 'pingdotgg/t3code', usage }] }, 'daily', now);
  assert.equal(report.synthesis.coverage.inputs, 1);
  assert.equal(report.synthesis.coverage.outputs, 1);
  assert.deepEqual(usage.quality, assessQuality(usage));
});
