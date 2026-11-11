import { createHash } from 'node:crypto';

const negative = /\b(?:does not|doesn't|cannot|can't|not yet|not supported|unsupported|no support|without|not implemented|planned|coming soon)\b|지원하지|미지원|구현 예정/i;

// 원문은 실행하지 않고 문장·사용 예·문서 위치를 분리해 보관합니다.
export function createEvidence(row, sections, now, metadata = {}) {
  const source = { id: 'readme', repository: row.name, path: metadata.path || 'README', sha: metadata.sha || null, fetchedAt: now.toISOString(), url: `https://github.com/${row.name}#readme` };
  if (metadata.html_url?.startsWith(`https://github.com/${row.name}/blob/`)) source.url = metadata.html_url;
  const evidence = [];
  let excludedLevel = null;
  let excludedTitle = '';
  const ancestors = [];
  const documents = [];
  for (const section of sections) {
    if (excludedLevel !== null && section.level > excludedLevel) {
      // 일부 README는 Sponsors를 H1로 쓰고 본문을 H2로 재개합니다.
      if (!/sponsor/i.test(excludedTitle) || !/^(?:key features|features|getting started|installation|quick.?start|usage|overview)$/i.test(section.title)) continue;
    }
    excludedLevel = null;
    if (/contribut|sponsor|star history|license|acknowledg|backstory|forking|roadmap|future plans/i.test(section.title)) { excludedLevel = section.level; excludedTitle = section.title; continue; }
    while (ancestors.length && ancestors.at(-1).level >= section.level) ancestors.pop();
    const scope = [...ancestors.map(item => item.title), section.title].join(' / ');
    ancestors.push(section);
    const examples = [...section.body.matchAll(/(^|\n)\s*(`{3,}|~{3,})[^\n]*\n([\s\S]*?)\n\s*\2(?=\s|$)/g)].map(match => match[3].trim());
    documents.push({ title: section.title || 'README 도입부', line: section.line || 1, scope, text: plainText(section.body), heading: plainText(section.title), examples });
  }
  function register(document, excerpt, kind) {
    const id = `e-${createHash('sha256').update(JSON.stringify([source.sha, document.title, document.line, kind, excerpt])).digest('hex').slice(0, 16)}`;
    if (!evidence.some(item => item.id === id)) evidence.push({ id, sourceId: source.id, section: document.title, line: document.line, kind, excerpt });
    return id;
  }
  function select(pattern, { candidates = documents, allowNegative = false, includeExamples = false, headings = false, wholeParagraph = false, predicate = () => true } = {}) {
    for (const document of candidates) {
      const paragraphs = document.text.split(/\n\s*\n/).flatMap(text => text.split(/\n(?=\s*(?:[-*]\s|\d+\.\s))/)).map(text => text.replace(/\s+/g, ' ').trim());
      const units = paragraphs.flatMap(text => wholeParagraph ? [text] : text.split(/(?<=[.!?。])\s+/)).map(text => ({ text, kind: 'prose' }));
      if (headings && !negative.test(document.text)) units.push({ text: document.heading, kind: 'heading' });
      if (includeExamples && /usage|example|quick.?start|getting started|使用|示例|사용|예시|시작/i.test(document.scope)) {
        for (const block of document.examples) for (const text of block.split('\n')) units.push({ text: text.trim(), kind: 'example' });
      }
      for (const unit of units) {
        const match = unit.text.match(pattern);
        if (!match || (!allowNegative && negative.test(unit.text)) || !predicate(unit.text, document, unit.kind)) continue;
        const offset = match.index < 420 ? 0 : Math.max(0, match.index - 140);
        const begin = offset ? unit.text.indexOf(' ', offset) + 1 || offset : 0;
        const excerpt = unit.text.length <= 560 ? unit.text : unit.text.slice(begin, begin + 560).replace(/\s+\S*$/, '');
        return register(document, excerpt, unit.kind);
      }
    }
    return null;
  }
  return { sources: [source], evidence, documents, select, find: (pattern, candidates = documents) => select(pattern, { candidates, headings: true }) };
}

function plainText(text) {
  return text.replace(/<!--[\s\S]*?-->/g, '').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/\[!\[[^\]]*\](?:\([^)]*\)|\[[^\]]*\])\](?:\([^)]*\)|\[[^\]]*\])/g, '')
    .replace(/^\s*\[[^\]]+\]:\s*\S+.*$/gm, '').replace(/!\[[^\]]*\]\[[^\]]*\]/g, '')
    .replace(/(`{3,}|~{3,})[\s\S]*?\1/g, '').replace(/^\s*(?:`{3,}|~{3,})[\s\S]*$/m, '').replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1').replace(/<[^>]*>/g, ' ').replace(/[`*_]/g, '')
    .replace(/[^\S\n]+/g, ' ').trim();
}

export function assessQuality(usage) {
  const missing = [];
  if (usage.category === '용도 분류 미확정') missing.push('용도 분류');
  if (!usage.article?.findings.length) missing.push('핵심 기능 근거');
  if (!usage.start) missing.push('시작 경로');
  if (usage.version >= 4) {
    const project = usage.article?.project;
    if (!project?.problem) missing.push('해결 문제');
    if (!project?.inputs.length) missing.push('입력');
    if (!project?.outputs.length) missing.push('출력');
    if (!project?.conditions.length) missing.push('도입 조건');
  }
  return { status: missing.length ? 'partial' : 'complete', missing, basis: '문서에서 설명 항목을 추출한 범위이며 성능이나 분석 깊이를 평가한 점수가 아닙니다.' };
}
