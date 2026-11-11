import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { analyzeUsage } from '../scripts/usage.mjs';
import { validateUsage } from '../scripts/contracts.mjs';

const docs = JSON.parse(await readFile(new URL('./fixtures/report-review-documents.json', import.meta.url), 'utf8'));
const now = new Date('2026-11-12T00:00:00Z');
function analyze(name) {
  const doc = docs.find(doc => doc.row.name === name);
  return analyzeUsage(doc.row, doc.markdown, now, doc.metadata);
}

test('실제 프로젝트의 동작과 검토 질문을 한국어로 제공하고 원문 근거를 보존한다', () => {
  const browser = analyze('vercel-labs/agent-browser');
  const framework = analyze('tokio-rs/topcoat');
  const design = analyze('meta/astryx');
  assert.match(browser.article.core[0].body, /스냅샷/);
  assert.match(framework.article.core[0].body, /서버에서 렌더링/);
  assert.match(design.article.core[0].body, /기존 CSS/);
  assert.notEqual(browser.article.core[0].body, framework.article.core[0].body);
  for (const usage of [browser, framework, design]) {
    validateUsage(usage);
    assert.doesNotMatch(usage.article.verdict, /“|문서 확인|renders|snapshot returns/);
    for (const claim of usage.article.core) {
      assert.equal(claim.kind, 'interpretation');
      assert.ok(claim.evidenceIds.length);
      assert.ok(claim.evidenceIds.every(id => usage.evidence.some(item => item.id === id)));
    }
  }
  assert.match(JSON.stringify(framework.evidence), /renders all markup on the server/);
});

test('요구 버전·선택 조건·필수 아님을 한국어 주의점에서도 보존한다', () => {
  const usage = analyzeUsage({ name: 'example/model', description: 'LLM inference' }, '# Model\nA library for LLM inference and serving.\n## Requirements\nRequires Python 3.12 or later.\nNo GPU is required.\n### Optional service\nAn API key can also be used.', now);
  validateUsage(usage);
  const conditions = usage.article.project.conditions;
  assert.match(conditions.find(item => item.title === 'Python').summaryKo, /Python 3.12 이상.*요구/);
  assert.match(conditions.find(item => item.title === '연산 장치').summaryKo, /필수가 아니/);
  assert.match(conditions.find(item => item.title === '서비스 인증').summaryKo, /선택 사항/);
});

test('한국어 설명에 없는 기능이나 원문 문장을 덧붙이면 계약에서 거부한다', () => {
  const usage = analyze('vercel-labs/agent-browser');
  for (const change of [
    value => { value.article.core[0].body = '검증되지 않은 새 기능을 지원합니다.'; },
    value => { value.article.findings[0].summaryKo += ' Arbitrary English sentence.'; },
    value => { value.article.core[0].evidenceIds = ['missing']; }
  ]) {
    const changed = structuredClone(usage); change(changed);
    assert.throws(() => validateUsage(changed), /한국어 요약/);
  }
});

test('근거 없는 동작을 한국어로 채우거나 분류만으로 만들어내지 않는다', () => {
  const usage = analyzeUsage({ name: 'example/unknown', description: 'Something unusual' }, '# Unknown\nAn unusual tool with no further description.', now);
  assert.deepEqual(usage.article.core, []);
  assert.match(usage.article.verdict, /보류/);
  assert.deepEqual(usage.article.project.inputs, []);
  const unrelated = analyzeUsage({ name: 'example/guidance', description: '' }, '# Guidance\nGuidance for modern websites.\n## Examples\nThis guide mentions persistent memory and SVG assets as examples.', now);
  assert.equal(unrelated.category, '용도 분류 미확정');
  assert.deepEqual(unrelated.article.core, []);
});

test('직접 입력·출력 절은 알려진 자료 형태만 요약하고 모르는 세부 내용은 단정하지 않는다', () => {
  const usage = analyzeUsage({ name: 'example/browser', description: 'Browser automation' }, '# Tool\nA browser automation tool for screenshots.\n## Input\nA URL and viewport dimensions.\n## Output\nAn opaque proprietary result type.', now);
  assert.match(usage.article.project.inputs[0].summaryKo, /웹 페이지 주소·화면 크기/);
  assert.match(usage.article.project.outputs[0].summaryKo, /한국어로 정리하지 못했습니다/);
  assert.doesNotMatch(usage.article.project.outputs[0].summaryKo, /proprietary|이미지/);
});

test('서버 렌더링만 명시한 문서에 브라우저 변환이나 데이터베이스 기능을 추가하지 않는다', () => {
  const usage = analyzeUsage({ name: 'example/framework', description: 'A full-stack framework for Rust' }, '# Framework\nA full-stack framework for Rust.\n## Rendering\nThis framework renders all markup on the server for the initial page.', now);
  const body = usage.article.core.map(claim => claim.body).join(' ');
  assert.match(body, /서버에서 렌더링/);
  assert.doesNotMatch(body, /JavaScript|데이터베이스/);
});
