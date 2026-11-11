import { createHash } from 'node:crypto';

export const periods = ['daily', 'weekly', 'monthly'];
export const labels = { daily: 'Today', weekly: 'Week', monthly: 'Month' };
export function plain(value) {
  return value.replace(/<[^>]*>/g, ' ').replace(/&(?:#(\d+)|#x([\da-f]+)|([a-z]+));/gi, (all, dec, hex, named) => {
    if (dec || hex) { const code = Number.parseInt(dec || hex, hex ? 16 : 10); return code <= 0x10ffff ? String.fromCodePoint(code) : all; }
    return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }[named] ?? all;
  }).replace(/\s+/g, ' ').trim();
}
export function parseTrending(html) {
  const rows = [...html.matchAll(/<article\b[^>]*class="[^"]*\bBox-row\b[^"]*"[^>]*>([\s\S]*?)<\/article>/g)];
  const seen = new Set();
  const result = [];
  for (const [, row] of rows) {
    const heading = row.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/)?.[1];
    const path = heading?.match(/href="\/([\w.-]+\/[\w.-]+)"/)?.[1];
    if (!path || seen.has(path.toLowerCase())) continue;
    seen.add(path.toLowerCase());
    const periodStars = plain(row).match(/([\d,]+) stars? (?:today|this week|this month)/i);
    const total = row.match(/href="\/[^" ]+\/stargazers"[^>]*>([\s\S]*?)<\/a>/)?.[1];
    result.push({
      name: path, url: `https://github.com/${path}`,
      description: plain(row.match(/<p\b[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? ''),
      language: plain(row.match(/itemprop="programmingLanguage"[^>]*>([\s\S]*?)<\/span>/)?.[1] ?? '') || '미분류',
      stars: total ? Number(plain(total).replace(/,/g, '')) : null,
      periodStars: periodStars ? Number(periodStars[1].replace(/,/g, '')) : null
    });
  }
  if (!result.length) throw new Error('트렌드 목록을 읽지 못했습니다. 응답 또는 GitHub 화면 구조를 확인하세요.');
  return result.slice(0, 10);
}
export function issueKey(period, now) {
  const date = new Date(now.getTime() + 9 * 3600000);
  const day = date.toISOString().slice(0, 10);
  if (period === 'daily') return `${period}:${day}`;
  if (period === 'monthly') return `${period}:${day.slice(0, 7)}`;
  date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
  return `${period}:${date.toISOString().slice(0, 10)}`;
}
export function fingerprint(rows) {
  // 숫자의 미세한 변화만으로 동일한 프로젝트 소개가 재발행되지 않도록 합니다.
  return createHash('sha256').update(JSON.stringify(rows.map(r => [r.name.toLowerCase(), r.description, r.language]))).digest('hex');
}
export function createReport(period, rows, now) {
  return {
    period, issue: issueKey(period, now), collectedAt: now.toISOString(), publishedAt: now.toISOString(),
    title: `${labels[period]} · 오픈소스 프로젝트 분석`, summary: '', analysis: [],
    source: `https://github.com/trending?since=${period}`, rows
  };
}
