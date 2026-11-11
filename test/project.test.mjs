import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { analyzeUsage, fetchUsage } from '../scripts/usage.mjs';
import { validateUsage } from '../scripts/contracts.mjs';
import { collectPublication } from '../scripts/publication.mjs';

const now = new Date('2026-11-11T00:23:00Z');
const documents = JSON.parse(await readFile(new URL('./fixtures/project-documents.json', import.meta.url), 'utf8'));
const expected = ['디자인 시스템', '물리 시뮬레이션', '개인 재무 관리', '브라우저 자동화', '웹 데이터 수집', '데이터 의미·지식 그래프', 'Git 워크트리 관리'];

test('여러 분야의 실제 README 발췌를 분류하고 문서 근거를 보존한다', () => {
  for (const [index, document] of documents.entries()) {
    const usage = analyzeUsage(document.row, document.markdown, now, document.metadata);
    validateUsage(usage);
    assert.equal(usage.category, expected[index], document.row.name);
    assert.ok(usage.classification.evidenceIds.length, document.row.name);
    assert.ok(usage.article.project.problem, document.row.name);
    assert.equal(usage.sources[0].sha, document.metadata.sha);
  }
});

test('실제 디자인 시스템의 React 버전과 브라우저 도구의 출력 구조를 추출한다', () => {
  const design = documents.find(value => value.row.name === 'meta/astryx');
  const first = analyzeUsage(design.row, design.markdown, now, design.metadata);
  assert.ok(first.article.project.inputs.some(value => value.title === '컴포넌트·스타일'));
  const react = first.article.project.conditions.find(value => value.title === 'React');
  assert.equal(react.scope, 'required');
  assert.match(react.body, /React 19 or later/);
  const browser = documents.find(value => value.row.name === 'vercel-labs/agent-browser');
  const second = analyzeUsage(browser.row, browser.markdown, now, browser.metadata);
  assert.ok(second.article.project.outputs.some(value => value.title === '페이지 구조'));
});

test('다른 분야의 XML·CSV 언급을 물리 모델이나 재무 입력으로 오인하지 않는다', () => {
  const document = documents.find(value => value.row.name === 'D4Vinci/Scrapling');
  const usage = analyzeUsage(document.row, document.markdown, now, document.metadata);
  assert.ok(usage.article.project.inputs.some(value => value.title === '웹 페이지'));
  assert.ok(!usage.article.project.inputs.some(value => /시뮬레이션|기록/.test(value.title)));
  const finance = documents.find(value => value.row.name === 'we-promise/sure');
  const result = analyzeUsage(finance.row, finance.markdown, now, finance.metadata);
  assert.ok(!result.article.project.inputs.some(value => value.title === '웹 페이지'));
});

test('같은 용도의 프로젝트도 문제·입출력·버전 조건을 각 문서에서 다르게 설명한다', () => {
  const a = analyzeUsage({ name: 'sample/alpha', description: 'Browser automation' }, '# Alpha\nBrowser automation for screenshots.\n## Problem\nCapture visual regressions without manual browsing.\n## Input\nA URL and viewport dimensions.\n## Output\nA PNG screenshot and pixel diff.\n## Requirements\nRequires Node.js 22.', now);
  const b = analyzeUsage({ name: 'sample/beta', description: 'Browser automation' }, '# Beta\nBrowser automation for extraction.\n## Problem\nExtract product records from catalog pages.\n## Input\nA saved HTML document.\n## Output\nJSON records with names and prices.\n## Requirements\nRequires Python 3.12.', now);
  assert.equal(a.category, b.category);
  for (const result of [a, b]) validateUsage(result);
  assert.match(a.article.project.problem.body, /visual regressions/);
  assert.match(b.article.project.problem.body, /product records/);
  assert.match(a.article.project.inputs[0].body, /URL and viewport/);
  assert.match(b.article.project.inputs[0].body, /saved HTML/);
  assert.match(a.article.project.outputs[0].body, /PNG screenshot/);
  assert.match(b.article.project.outputs[0].body, /JSON records/);
  assert.match(a.article.project.conditions[0].body, /Node.js 22/);
  assert.match(b.article.project.conditions[0].body, /Python 3.12/);
});

test('분류만 확인한 프로젝트의 입출력을 일반 상식으로 생성하지 않는다', () => {
  const result = analyzeUsage({ name: 'sample/finance', description: 'Personal finance' }, '# Finance\nA personal finance app.\n## Roadmap\nImport CSV transactions and generate a cashflow report.', now);
  assert.equal(result.category, '개인 재무 관리');
  assert.deepEqual(result.article.project.inputs, []);
  assert.deepEqual(result.article.project.outputs, []);
  assert.ok(result.quality.missing.includes('입력'));
  assert.ok(result.quality.missing.includes('출력'));
  assert.equal(result.quality.status, 'partial');
});

test('저장소 설명·후원·코드에만 나온 용도로 분류하지 않는다', () => {
  const result = analyzeUsage({ name: 'sample/unknown', description: 'LLM inference and serving' }, '# Unknown\nAn unusual project.\n## Sponsors\nA browser automation platform.\n## Example\n```text\nLLM inference and serving\n```', now);
  assert.equal(result.category, '용도 분류 미확정');
  assert.equal(result.classification.evidenceIds.length, 0);
  const incomplete = analyzeUsage({ name: 'sample/unknown', description: 'Browser automation' }, '# Unknown\nUnusual tool.\n## Example\n```text\nBrowser automation', now);
  assert.equal(incomplete.category, '용도 분류 미확정');
});

test('사용 예에서 확인한 입출력에는 예시임을 기록하고 실행하지 않는다', () => {
  const result = analyzeUsage({ name: 'sample/scraper', description: 'Web scraping framework' }, '# Scraper\nA web scraping framework.\n## Usage\n```python\npage = Fetcher.get("https://example.com")\nrecords = page.css(".item").getall()\n```', now);
  assert.equal(result.article.project.inputs[0].exampleOnly, true);
  assert.equal(result.article.project.outputs[0].exampleOnly, true);
  const ids = result.article.project.outputs[0].evidenceIds;
  assert.equal(result.evidence.find(value => ids.includes(value.id)).kind, 'example');
});

test('설치 하위 절의 필수·선택·불필요 조건을 구분한다', () => {
  const result = analyzeUsage({ name: 'sample/model', description: 'LLM inference' }, '# Model\nA library for LLM inference.\n## Installation\n### Local\nRequires Python 3.12, and optionally Docker.\nNo GPU is required.\n### Optional remote service\nAn API key can also be used.', now);
  const items = result.article.project.conditions;
  assert.equal(items.find(value => value.title === 'Python').scope, 'required');
  assert.equal(items.find(value => value.title === '컨테이너 실행').scope, 'optional');
  assert.equal(items.find(value => value.title === '연산 장치').scope, 'not-required');
  assert.equal(items.find(value => value.title === '서비스 인증').scope, 'optional');
  assert.match(items.find(value => value.title === 'Python').path, /Installation \/ Local/);
});

test('잘못된 문제·입출력·분류 근거는 저장 전에 거부한다', () => {
  const source = analyzeUsage({ name: 'sample/tool', description: 'Browser automation' }, '# Tool\nBrowser automation.\n## Problem\nExtract product records from catalog pages.\n## Input\nA URL.\n## Output\nA screenshot.', now);
  for (const mutate of [
    value => { value.classification.evidenceIds = []; },
    value => { value.article.project.inputs[0].evidenceIds = ['missing']; },
    value => { value.article.project.problem.evidenceIds = ['missing']; }
  ]) {
    const invalid = structuredClone(source); mutate(invalid);
    assert.throws(() => validateUsage(invalid), /분석 데이터 오류/);
  }
});

test('API 제한 시 기존에 확인한 README 원문 경로만 재사용하고 토큰을 전달하지 않는다', async () => {
  const row = { name: 'sample/tool', description: 'Browser automation', usage: { sources: [{ repository: 'sample/tool', path: 'README.md', url: 'https://github.com/sample/tool/blob/main/README.md' }] } };
  let calls = 0;
  const result = await fetchUsage(row, { now, token: 'private-test-token', fetcher: async (url, options) => {
    if (++calls === 1) return { status: 403 };
    assert.equal(url, 'https://raw.githubusercontent.com/sample/tool/main/README.md');
    assert.equal(options.headers.Authorization, undefined);
    return { ok: true, arrayBuffer: async () => Buffer.from('# Tool\nBrowser automation.\n## Input\nA URL.\n## Output\nA screenshot.') };
  } });
  validateUsage(result);
  assert.equal(result.version, 12);
  assert.equal(result.document.status, 'available');
  assert.match(result.sources[0].sha, /^[a-f0-9]{40}$/);
  assert.ok(!JSON.stringify(result).includes('private-test-token'));
});

test('모델 서빙·백엔드·시각 워크플로·고객 관리도 문서 표현으로 분류한다', () => {
  const cases = [
    ['LLM inference and serving', '언어 모델 추론·서빙'],
    ['An open-source Firebase alternative.', '백엔드 플랫폼'],
    ['A node-based interface for diffusion models.', '생성형 AI 워크플로'],
    ['An open-source CRM for customer relationship management.', '고객 관계 관리']
  ];
  for (const [description, category] of cases) {
    const result = analyzeUsage({ name: 'sample/tool', description }, `# Tool\n${description}`, now);
    assert.equal(result.category, category);
    validateUsage(result);
  }
});

test('명시적 분석 재조회는 발행 시각과 장부를 바꾸지 않고 기간 간 문서를 재사용한다', async () => {
  const row = { name: 'sample/tool', description: 'Browser automation' };
  const usage = analyzeUsage(row, '# Tool\nBrowser automation.', now);
  const ledger = ['daily:2026-11-11', 'weekly:2026-11-09', 'monthly:2026-11'].map(issue => ({ issue }));
  const previous = { version: 1, ledger, reports: Object.fromEntries(['daily', 'weekly', 'monthly'].map(period => [period, { publishedAt: now.toISOString(), rows: [{ ...row, usage }] }])) };
  let calls = 0;
  const result = await collectPublication(previous, { now, refreshAnalysis: true, fetcher: () => { throw Error('목록 수집 금지'); }, analyzeProject: async () => { calls++; return analyzeUsage(row, '# Tool\nBrowser automation.\n## Input\nA URL.\n## Output\nJSON records.', now); } });
  assert.equal(calls, 1);
  assert.deepEqual(result.state.ledger, ledger);
  for (const report of Object.values(result.state.reports)) {
    assert.equal(report.publishedAt, now.toISOString());
    assert.match(report.rows[0].usage.article.project.outputs[0].body, /JSON records/);
  }
  assert.equal(previous.reports.daily.rows[0].usage.article.project.outputs.length, 0);
});
