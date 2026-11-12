import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { analyzeUsage } from '../scripts/usage.mjs';
import { validateUsage } from '../scripts/contracts.mjs';

const docs = JSON.parse(await readFile(new URL('./fixtures/caution-documents.json', import.meta.url)));
const now = new Date('2026-11-12T00:00:00Z');
function analyze(doc, change = value => value) {
  const documents = structuredClone(doc.documents).map(change);
  const [root, ...linked] = documents;
  return analyzeUsage({ name: doc.repository }, root.markdown, now, { path: root.path, sha: root.sha, html_url: root.url }, linked.map(item => ({ markdown: item.markdown, metadata: { path: item.path, sha: item.sha, html_url: item.url, ...(item.path.startsWith('skills/improve/') ? { setupOnly: true } : {}) } })));
}

test('전체 보고서의 고유 27개 프로젝트에 서로 다른 공식 근거와 한국어 주의점을 연결한다', () => {
  assert.equal(docs.length, 27);
  const bodies = new Set();
  for (const doc of docs) {
    const usage = analyze(doc);
    validateUsage(usage);
    assert.ok(doc.expected.length, doc.repository);
    assert.deepEqual(usage.article.cautions.map(c => c.id), doc.expected, doc.repository);
    for (const caution of usage.article.cautions) {
      assert.ok(!bodies.has(caution.body), doc.repository);
      bodies.add(caution.body);
      assert.doesNotMatch(caution.body, /항목을 다룹니다|필수 여부는 원문|관련 기능을 다룹니다/);
      assert.ok(caution.evidenceIds.every(id => usage.evidence.some(e => e.id === id)));
    }
  }
  assert.ok(bodies.size >= 40);
});

test('같은 분야여도 호스트·권한·데이터 적용 범위를 구체적으로 구분한다', () => {
  const body = name => analyze(docs.find(d => d.repository === name)).article.cautions.map(c => c.body).join(' ');
  assert.match(body('milind-soni/OpenMausBot'), /설치되고 로그인/);
  assert.match(body('pingdotgg/t3code'), /npx 실행용 Node.js/);
  assert.match(body('cloudflare/security-audit-skill'), /OS 샌드박스.*needs_validation/);
  assert.match(body('shadcn/improve'), /수동 실행자.*최종 병합은 사용자/);
  assert.match(body('we-promise/sure'), /모든 family/);
  assert.match(body('D4Vinci/Scrapling'), /ModuleNotFoundError.*HTTP 요청에는 브라우저 설치가 필요하지/);
  assert.match(body('debpalash/VoiceStudio'), /Intel Mac.*지원하지/);
});

test('원문 삭제·변경·코드블록·다른 프로젝트에는 알려진 주의점을 억지로 채우지 않는다', () => {
  const doc = docs.find(d => d.repository === 'openai/codex-security');
  for (const markdown of ['', 'Requires Node.js 30 and Python 3.10+.', '```text\nRequires Node.js 22.13.0+ within 22.x, or Node.js 24.x or 26.x, and Python 3.10+.\n```']) {
    assert.deepEqual(analyze(doc, d => ({ ...d, markdown })).article.cautions, []);
  }
  assert.deepEqual(analyze({ ...doc, repository: 'example/other' }).article.cautions, []);
  const sure = docs.find(d => d.repository === 'we-promise/sure');
  assert.deepEqual(analyze({ ...sure, documents: sure.documents.slice(0, 1) }).article.cautions, []);
  assert.ok(analyze(sure).article.cautions.length);
});

test('주의점의 한국어 설명·근거·문서 범위를 바꾸면 저장 경계에서 거부한다', () => {
  const usage = analyze(docs.find(d => d.repository === 'we-promise/sure'));
  for (const change of [
    u => { u.article.cautions[0].body += ' 모든 사용자가 관리자입니다.'; },
    u => { u.article.cautions[0].evidenceIds = ['missing']; },
    u => { u.sources.find(s => s.path === 'docs/hosting/docker.md').path = 'unrelated.md'; },
    u => { u.article.cautions.push(u.article.cautions[0]); },
    u => { delete u.article.cautions; }
  ]) {
    const changed = structuredClone(usage); change(changed);
    assert.throws(() => validateUsage(changed), /도입 주의점|문서 지문/);
  }
});

test('nodes라는 데이터 필드를 Node.js 설치 조건으로 오인하지 않는다', () => {
  const usage = analyzeUsage({ name: 'example/stock', description: 'stock analysis system' }, '# Stock\nA stock analysis system.\n## Configuration\nThe API returns lanes/nodes/edges/events/summary.\n', now);
  assert.ok(!usage.article.project.conditions.some(c => c.title === 'Node.js'));
});

test('이전 분석기 15는 새 주의점 근거를 만들지 않고 보존한다', () => {
  const usage = analyze(docs[0]);
  usage.version = usage.analyzerVersion = 15;
  delete usage.article.cautions;
  validateUsage(usage);
});
