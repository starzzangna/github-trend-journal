import { assessSkillsSetup } from './skills-setup.mjs';
import { createHash } from 'node:crypto';
import { representativesForVersion, ioNotApplicable } from './representatives.mjs';

const negative = /\b(?:does not|doesn't|cannot|can't|not yet|not supported|unsupported|no support|without|not implemented|planned|coming soon)\b|지원하지|미지원|구현 예정/i;

// 원문은 실행하지 않고 문장·사용 예·문서 위치를 분리해 보관합니다.
export function createEvidence(row, sections, now, metadata = {}, evidence = []) {
  const source = { id: metadata.sourceId || 'readme', repository: row.name, path: metadata.path || 'README', sha: metadata.sha || null, fetchedAt: now.toISOString(), url: `https://github.com/${row.name}#readme` };
  if (metadata.representativeId) source.representativeId = metadata.representativeId;
  if (metadata.html_url?.startsWith(`https://github.com/${row.name}/blob/`)) source.url = metadata.html_url;
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
    documents.push({ representativeId: metadata.representativeId, sourceId: source.id, exampleOnly: Boolean(metadata.exampleOnly), title: section.title || 'README 도입부', line: section.line || 1, scope, text: plainText(section.body), heading: plainText(section.title), examples });
  }
  function register(document, excerpt, kind) {
    const id = `e-${createHash('sha256').update(JSON.stringify([source.id, source.sha, document.title, document.line, kind, excerpt])).digest('hex').slice(0, 16)}`;
    if (!evidence.some(item => item.id === id)) evidence.push({ id, sourceId: source.id, section: document.title, line: document.line, kind, excerpt });
    return id;
  }
  function select(pattern, { candidates = documents, allowNegative = false, includeExamples = false, headings = false, codeExamples = false, wholeParagraph = false, predicate = () => true } = {}) {
    for (const document of candidates) {
      const paragraphs = document.text.split(/\n\s*\n/).flatMap(text => text.split(/\n(?=\s*(?:[-*]\s|\d+\.\s))/)).map(text => text.replace(/\s+/g, ' ').trim());
      const units = paragraphs.flatMap(text => wholeParagraph ? [text] : text.split(/(?<=[.!?。])\s+/)).map(text => ({ text, kind: document.exampleOnly ? 'example' : 'prose' }));
      if (headings && (allowNegative || !negative.test(document.text))) units.push({ text: document.heading, kind: document.exampleOnly ? 'example' : 'heading' });
      if (includeExamples && (codeExamples || document.representativeId || /usage|example|quick.?start|getting started|使用|示例|사용|예시|시작/i.test(document.scope))) {
        for (const block of document.examples) for (const text of block.split('\n')) units.push({ text: text.trim(), kind: 'example' });
      }
      for (const unit of units) {
        const match = unit.text.match(pattern);
        if (!match || (document.exampleOnly && !includeExamples) || (!allowNegative && negative.test(unit.text)) || !predicate(unit.text, document, unit.kind)) continue;
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

export function createEvidenceBundle(row, inputs, now) {
  const evidence = [];
  const contexts = inputs.map((input, index) => createEvidence(row, input.sections, now, { ...input.metadata, sourceId: index ? `doc-${createHash('sha256').update(input.metadata.path).digest('hex').slice(0, 12)}` : 'readme' }, evidence));
  const allDocuments = contexts.flatMap(context => context.documents);
  const documents = allDocuments.filter(item => !item.representativeId);
  const representativeDocuments = allDocuments.filter(item => item.representativeId);
  const select = (pattern, options = {}) => {
    for (const context of contexts) {
      const candidates = options.candidates ? options.candidates.filter(item => context.documents.includes(item)) : context.documents.filter(item => !item.representativeId);
      const id = context.select(pattern, { ...options, candidates });
      if (id) return id;
    }
    return null;
  };
  return { evidence, sources: contexts.flatMap(context => context.sources), documents, representativeDocuments, introduction: contexts.flatMap(context => context.documents.filter(item => item.text.trim() && !item.exampleOnly && !item.representativeId).slice(0, 5)), select, find: (pattern, candidates = documents) => select(pattern, { candidates, headings: true }) };
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
  const project = usage.article?.project;
  const itemSpecific = usage.version >= 10 && project?.ioScope?.kind === 'item-specific';
  const io = Object.fromEntries(['input', 'output'].map((field, index) => [field, ioNotApplicable(project, field, usage.version) ? 'not-applicable' : project?.[index ? 'outputs' : 'inputs']?.length ? 'documented' : 'insufficient-evidence']));
  const expected = itemSpecific ? representativesForVersion(usage.version).filter(item => item.repository === usage.sources?.[0]?.repository) : [];
  const representatives = { expected: expected.length, available: expected.filter(spec => project.examples?.some(item => item.id === spec.id)).length };
  if (usage.category === '용도 분류 미확정') missing.push('용도 분류');
  if (!usage.article?.findings.length) missing.push('핵심 기능 근거');
  if (!usage.start) missing.push('시작 경로');
  if (usage.version >= 4) {
    if (!project?.problem) missing.push('해결 문제');
    if (!ioNotApplicable(project, 'input', usage.version) && !project?.inputs.length) missing.push('입력');
    if (!ioNotApplicable(project, 'output', usage.version) && !project?.outputs.length) missing.push('출력');
    if (!project?.conditions.length) missing.push('도입 조건');
  }
  if (usage.version >= 11 && itemSpecific && Object.values(io).includes('not-applicable') && !expected.length) missing.push('대표 항목 근거');
  for (const spec of expected) if (!project.examples?.some(item => item.id === spec.id)) missing.push(`대표 항목: ${spec.title}`);
  const setup = assessSkillsSetup(usage);
  if (setup) missing.push(...setup.missing);
  return { ...(usage.version >= 13 ? { setup } : {}), status: missing.length ? 'partial' : 'complete', missing, ...(usage.version >= 10 ? { io, notApplicable: ['input', 'output'].filter(field => ioNotApplicable(project, field, usage.version)).map(field => field === 'input' ? '입력' : '출력'), representatives: { ...representatives, ...(usage.version >= 11 ? { status: itemSpecific && Object.values(io).includes('not-applicable') && !expected.length ? 'not-configured' : 'tracked' } : {}) } } : {}), basis: '문서에서 설명 항목을 추출한 범위이며 성능이나 분석 깊이를 평가한 점수가 아닙니다.' };
}
