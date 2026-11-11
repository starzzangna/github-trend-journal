import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { analyzeUsage } from '../scripts/usage.mjs';
import { validateUsage } from '../scripts/contracts.mjs';

const documents = JSON.parse(await readFile(new URL('./fixtures/report-review-documents.json', import.meta.url), 'utf8'));
const now = new Date('2026-11-11T14:40:00Z');
const analyze = name => {
  const doc = documents.find(doc => doc.row.name === name);
  const result = analyzeUsage(doc.row, doc.markdown, now, doc.metadata);
  validateUsage(result, doc.row);
  return result;
};

test('실제 배지·홍보 공지·안내문을 프로젝트 목적에서 제외한다', () => {
  const cad = analyze('earthtojake/text-to-cad');
  assert.doesNotMatch(cad.article.project.problem.body, /https:|\]\(/);
  assert.match(cad.article.project.problem.body, /Python|3D models/);
  const worktrunk = analyze('max-sixty/worktrunk');
  assert.doesNotMatch(worktrunk.article.project.problem.body, /most popular|November/);
  assert.match(worktrunk.article.project.problem.body, /worktree management|worktree UX/);
  const skills = analyze('anthropics/skills');
  assert.doesNotMatch(skills.article.project.problem.body, /Note:|implementation of/);
  assert.match(skills.article.project.problem.body, /folders of instructions/);
});

test('같은 디자인 스킬도 테마 구성과 검토 방식을 각 문서로 설명한다', () => {
  const hallmark = analyze('Nutlope/hallmark');
  const impeccable = analyze('pbakaus/impeccable');
  assert.equal(hallmark.category, impeccable.category);
  assert.match(JSON.stringify(hallmark.article.findings), /Fifty themes|fifty materials/);
  assert.match(JSON.stringify(impeccable.article.findings), /critique|audit/);
  assert.notEqual(hallmark.article.verdict, impeccable.article.verdict);
  for (const usage of [hallmark, impeccable]) {
    assert.ok(usage.article.verdictEvidenceIds.length);
    assert.ok(usage.article.findings.every(claim => claim.kind === 'documented'));
  }
});

test('실제 프레임워크의 SVG 배지를 기능으로 오인하지 않고 서버 동작을 설명한다', () => {
  const usage = analyze('tokio-rs/topcoat');
  assert.ok(!usage.article.findings.some(claim => /시각 자료/.test(claim.title)));
  assert.match(JSON.stringify(usage.article.findings), /renders all markup on the server/);
  assert.doesNotMatch(JSON.stringify(usage.evidence), /img.shields.io|crates-badge/);
});

test('실제 브라우저·디자인 시스템의 고유 제약을 핵심 판단 근거로 연결한다', () => {
  const browser = analyze('vercel-labs/agent-browser');
  const design = analyze('meta/astryx');
  assert.match(browser.article.verdict, /스냅샷/);
  assert.match(JSON.stringify(browser.article.findings), /snapshot|DOM/);
  assert.match(JSON.stringify(design.article.findings), /className|swizzle/);
  for (const usage of [browser, design]) {
    const invalid = structuredClone(usage);
    invalid.article.verdictEvidenceIds = ['missing'];
    assert.throws(() => validateUsage(invalid), /핵심 판단 근거/);
  }
});

test('사용 예의 실제 입력·출력과 알려지지 않은 역할을 구분한다', () => {
  const input = '# Scraper\nA web scraping framework.\n## Usage\n```python\npage = Fetcher.get("https://example.com/catalog")\nrecords = page.css(".price").getall()\n```';
  const usage = analyzeUsage({ name: 'example/scraper', description: 'Web scraping framework' }, input, now);
  assert.match(usage.article.project.inputs[0].body, /example.com\/catalog/);
  assert.match(usage.article.project.outputs[0].body, /\.price/);
  assert.equal(usage.article.project.outputs[0].exampleOnly, true);
  const unknown = analyzeUsage({ name: 'example/finance', description: 'Personal finance' }, '# Finance\nA personal finance app that can be self hosted with Docker.', now);
  assert.deepEqual(unknown.article.project.inputs, []);
  assert.deepEqual(unknown.article.project.outputs, []);
  assert.match(unknown.article.verdict, /추가 확인/);
});

test('범용 해설을 늘리지 않고 같은 원문 근거의 기능을 합친다', () => {
  const usage = analyzeUsage({ name: 'example/voice', description: 'Voice cloning' }, '# Voice\nVoice cloning and video dubbing.\n## Roadmap\nLocal models will download only the models you need. Coming soon.', now);
  assert.equal(usage.article.findings.length, 1);
  assert.match(usage.article.findings[0].body, /Voice cloning and video dubbing/);
  assert.ok(!usage.article.findings.some(claim => /로컬 모델/.test(claim.title)));
});
