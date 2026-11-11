import { createHash } from 'node:crypto';
import { representativeSpecs } from './representatives.mjs';

// 같은 저장소·참조의 링크만 허용합니다. 일반 문서 외에 고정된 대표 항목만 추가로 읽습니다.
export function repositoryLinks(markdown, repository, metadata = {}) {
  const prefix = `https://github.com/${repository}/blob/`;
  if (!metadata.html_url?.startsWith(prefix) || !metadata.path) return [];
  const relative = metadata.html_url.slice(prefix.length);
  const suffix = metadata.path.split('/').map(encodeURIComponent).join('/');
  if (!relative.endsWith(suffix)) return [];
  const ref = relative.slice(0, -suffix.length).replace(/\/$/, '');
  if (!ref) return [];
  const clean = markdown.replace(/<!--[\s\S]*?-->/g, '').replace(/(`{3,}|~{3,})[\s\S]*?\1/g, '');
  const refs = new Map([...clean.matchAll(/^\s*\[([^\]]+)\]:\s*(\S+)/gm)].map(match => [match[1].toLowerCase(), match[2]]));
  const links = [...clean.matchAll(/(?<!!)\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)|(?<!!)\[([^\]]+)\]\[([^\]]*)\]/g)].map(match => match[2] || refs.get((match[4] || match[3]).toLowerCase())).filter(Boolean);
  const found = new Map();
  for (const href of links) {
    try {
      if (/%(?:2f|5c|00)|\\/i.test(href)) continue;
      const url = new URL(href, metadata.html_url);
      if (url.origin !== 'https://github.com' || url.username || url.password || url.search) continue;
      const allowed = `/${repository}/blob/${ref}/`;
      if (!url.pathname.startsWith(allowed)) continue;
      const path = decodeURIComponent(url.pathname.slice(allowed.length));
      if (path === metadata.path || path.length > 220 || path.split('/').some(part => !part || part === '..' || part.startsWith('.'))) continue;
      if (/^(?:tests?|scripts?|assets?|images?)\//i.test(path)) continue;
      if (/\b(?:contributing|license|code.of.conduct|changelog|sponsor|governance)\b/i.test(path)) continue;
      const score = /readme[_.-]en\.md$/i.test(path) ? 30 : /(?:getting.started|quick.?start|full.guide|install|usage|setup|outside-agents)/i.test(path) ? 20 : /(?:guide|client|user|workflow|in-process|direction|hosting|docker)/i.test(path) ? 15 : /index|readme|directory|DOCS\.md/i.test(path) ? 10 : 0;
      if (!found.has(path)) found.set(path, { path, url: `https://github.com/${repository}/blob/${ref}/${path.split('/').map(encodeURIComponent).join('/')}`, raw: `https://raw.githubusercontent.com/${repository}/${ref}/${path.split('/').map(encodeURIComponent).join('/')}`, score });
    } catch { /* 잘못된 링크는 네트워크 요청 전에 제외합니다. */ }
  }
  return [...found.values()];
}

export function linkedPaths(markdown, repository, metadata = {}) {
  return repositoryLinks(markdown, repository, metadata).filter(item => /\.md$/i.test(item.path) && item.score).sort((a, b) => b.score - a.score).slice(0, 2);
}

export async function fetchLinkedDocuments(markdown, repository, metadata, { fetcher = fetch, now = new Date(), timeoutMs = 15000 } = {}) {
  const documents = [], states = [];
  let totalBytes = Buffer.byteLength(markdown);
  const collect = async target => {
    const controller = new AbortController();
    let timer;
    try {
      const operation = (async () => {
        const response = await fetcher(target.raw, { headers: { 'User-Agent': 'GitTrendJournal/1.0' }, redirect: 'error', signal: controller.signal });
        if (!response.ok) throw Object.assign(Error('문서 조회 실패'), { reason: 'http', httpStatus: response.status });
        if (!response.body?.getReader) throw Object.assign(Error('문서 형식 오류'), { reason: 'format' });
        const reader = response.body.getReader(), chunks = [];
        let size = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 250000) { await reader.cancel(); throw Object.assign(Error('문서 크기 초과'), { reason: 'size-limit' }); }
          if (totalBytes + size > 750000) { await reader.cancel(); throw Object.assign(Error('프로젝트 문서 크기 초과'), { reason: 'project-size-limit' }); }
          chunks.push(Buffer.from(value));
        }
        const bytes = Buffer.concat(chunks);
        if (!bytes.length) throw Object.assign(Error('빈 문서'), { reason: 'format' });
        return bytes;
      })();
      let timedOut = false;
      const bytes = await Promise.race([operation, new Promise((_, reject) => { timer = setTimeout(() => { timedOut = true; controller.abort(); reject(Object.assign(Error('문서 시간 초과'), { reason: 'timeout' })); }, timeoutMs); })]).catch(failure => { if (timedOut) throw Object.assign(Error('문서 시간 초과'), { reason: 'timeout' }); throw failure; });
      const sha = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
      totalBytes += bytes.length;
      documents.push({ markdown: bytes.toString('utf8'), metadata: { path: target.path, sha, html_url: target.url, ...(target.representativeId ? { representativeId: target.representativeId, format: target.format } : {}), exampleOnly: /(?:^|\/)examples?\//i.test(target.path), sourceId: `doc-${createHash('sha256').update(target.path).digest('hex').slice(0, 12)}` } });
      states.push({ path: target.path, status: 'available', checkedAt: now.toISOString() });
    } catch (failure) {
      const reason = ['http', 'format', 'size-limit', 'project-size-limit', 'timeout'].includes(failure.reason) ? failure.reason : 'network';
      states.push({ path: target.path, status: 'unavailable', reason, ...(reason === 'http' && Number.isInteger(failure.httpStatus) && failure.httpStatus >= 400 && failure.httpStatus <= 599 ? { httpStatus: failure.httpStatus } : {}), checkedAt: now.toISOString() });
    } finally { clearTimeout(timer); }
  };
  for (const target of linkedPaths(markdown, repository, metadata)) await collect(target);
  for (const spec of representativeSpecs.filter(item => item.repository === repository)) {
    const parent = spec.parent === metadata.path ? { markdown, metadata } : documents.find(item => item.metadata.path === spec.parent);
    if (!parent) continue;
    const link = repositoryLinks(parent.markdown, repository, parent.metadata).find(item => item.path === spec.link);
    if (!link || states.some(item => item.path === spec.path)) continue;
    const target = spec.format === 'javadoc' ? link : { ...link, path: spec.path, url: link.url + '/README.md', raw: link.raw + '/README.md' };
    await collect({ ...target, representativeId: spec.id, format: spec.format });
  }
  return { documents, states };
}
