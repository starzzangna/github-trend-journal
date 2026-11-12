import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { analyzeUsage } from '../scripts/usage.mjs';
import { validateUsage } from '../scripts/contracts.mjs';
import { linkedPaths } from '../scripts/linked.mjs';

const now = new Date('2026-11-12T00:00:00Z');
const docs = JSON.parse(await readFile(new URL('./fixtures/io-documents.json', import.meta.url), 'utf8'));

test('실제 문서가 명시한 입출력을 작업 경로와 함께 설명한다', () => {
  const expected = {
    'addyosmani/agent-skills': ['스킬 지침', '계획·구현 결과'],
    'we-promise/sure': ['소규모 은행 동기화·CSV 가져오기', '일상 사용의 대시보드·거래·예산·보고서'],
    'homeassistant-ai/ha-mcp': ['현관등을 일몰에 켜 달라는 요청 예', '트리거·동작이 포함된 자동화 예'],
    'milind-soni/OpenMausBot': ['검토 후 가져오는 팀 구성 Markdown', 'department 구성의 공유 파일'],
    'pingdotgg/t3code': ['허용 권한 안에서 스레드 시작·메시지 요청', '읽기 전용 연결의 프로젝트·스레드·모델 목록'],
    'Nutlope/hallmark': ['참조할 실제 제품 URL·개발 서버·앱', '선택 근거를 CSS 주석에 남긴 독립 HTML·CSS'],
    'cloudflare/security-audit-skill': ['지정한 코드베이스의 보안 감사 요청', '검증 기록에서 생성하는 세 가지 보고서'],
    'pbakaus/impeccable': ['공통 입력 계약', '프로젝트 기준 문서']
  };
  for (const doc of docs) {
    const usage = analyzeUsage(doc.row, doc.root.markdown, now, doc.root.metadata, doc.linkedDocuments);
    validateUsage(usage, doc.row);
    const project = usage.article.project;
    const wanted = expected[doc.row.name];
    if (wanted) {
      assert.ok(project.inputs.some(item => item.title === wanted[0]), doc.row.name);
      assert.ok(project.outputs.some(item => item.title === wanted[1]), doc.row.name);
    }
    if (doc.row.name === 'TheAlgorithms/Java') assert.deepEqual(project.inputs, []);
    if (doc.row.name === 'anthropics/knowledge-work-plugins') assert.deepEqual(project.outputs, []);
    if (doc.row.name === 'homeassistant-ai/ha-mcp') {
      assert.equal(project.inputs[0].exampleOnly, true);
      assert.equal(project.outputs[0].exampleOnly, true);
    }
    if (doc.row.name === 'pingdotgg/t3code') {
      const evidence = usage.evidence.find(item => project.inputs[0].evidenceIds.includes(item.id));
      assert.equal(usage.sources.find(source => source.id === evidence.sourceId).path, 'docs/user/outside-agents.md');
      assert.match(project.inputs[0].summaryKo, /외부 에이전트.*MCP/);
    }
  }
});

test('미지원·예정 기능이나 출력 예를 입력 지원으로 잘못 채우지 않는다', () => {
  const finance = analyzeUsage({ name: 'example/finance', description: 'Personal finance' }, '# Finance\nA personal finance app.\n## Limits\nCSV imports are not supported.\n## Roadmap\nSmall bank syncs and CSV imports are planned.', now);
  assert.deepEqual(finance.article.project.inputs, []);
  const skill = analyzeUsage({ name: 'example/skill', description: 'A design skill for agents' }, '# Skill\nA design skill for agents.\n## Limitations\nPoint it at a URL, a dev server or an app is not supported yet.', now);
  assert.deepEqual(skill.article.project.inputs, []);
  const root = { path: 'README.md', html_url: 'https://github.com/example/control/blob/main/README.md' };
  assert.deepEqual(linkedPaths('[Install](docs/user/install.md) [Provider](docs/user/providers-fx.md) [Outside](docs/user/outside-agents.md)', 'example/control', root).map(item => item.path), ['docs/user/install.md', 'docs/user/outside-agents.md']);
});
