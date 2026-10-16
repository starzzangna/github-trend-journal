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
  const langs = {};
  for (const row of rows) langs[row.language] = (langs[row.language] || 0) + 1;
  const topLanguage = Object.entries(langs).sort((a, b) => b[1] - a[1])[0];
  const measured = rows.filter(r => r.periodStars !== null);
  const leader = [...measured].sort((a, b) => b.periodStars - a.periodStars)[0];
  return {
    period, issue: issueKey(period, now), publishedAt: now.toISOString(),
    title: `${labels[period]} · ${rows[0].name}부터 살펴보는 오픈소스 트렌드`,
    summary: `GitHub Trending 상위 ${rows.length}개 프로젝트를 살펴봤습니다. ${topLanguage[0]} 프로젝트가 ${topLanguage[1]}개 포함되어 있습니다.`,
    analysis: [
      `GitHub 표시 순위의 첫 번째 프로젝트는 ${rows[0].name}입니다.`,
      leader ? `수집 목록에서 표시된 기간 스타 수가 가장 큰 프로젝트는 ${leader.name}으로, ${leader.periodStars.toLocaleString('en-US')}개입니다.` : '기간 스타 수가 제공되지 않아 해당 수치 비교는 생략했습니다.',
      '이 글은 수집 시점의 목록을 요약한 자동 보고서입니다. 성장 원인이나 과거 대비 변화는 추정하지 않습니다.'
    ],
    source: `https://github.com/trending?since=${period}`, rows
  };
}
