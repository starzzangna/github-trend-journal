import { createHash } from 'node:crypto';

export const documentMaxAgeMs = 7 * 24 * 60 * 60 * 1000;
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

export function analysisInputFingerprint(row) {
  return hash([row.name, row.description || '']);
}

export function documentFingerprint(sources) {
  if (!sources?.length || sources.some(source => !source.sha)) return null;
  return hash(sources.map(source => [source.repository, source.path, source.sha]));
}

// 이전 형식의 checkedAt은 정상 분석을 생성한 시각이므로 새 시각 필드의 초기값으로 사용합니다.
export function normalizeUsage(usage, row) {
  if (!usage || usage.status !== 'ready') return usage;
  return {
    ...structuredClone(usage),
    analyzedAt: usage.analyzedAt || usage.checkedAt,
    sourceCheckedAt: usage.sourceCheckedAt || usage.checkedAt,
    sourceFingerprint: usage.sourceFingerprint || documentFingerprint(usage.sources),
    analysisInputFingerprint: usage.analysisInputFingerprint || analysisInputFingerprint(row)
  };
}

export function isFreshUsage(usage, row, now, version, maxAgeMs = documentMaxAgeMs) {
  if (usage?.status !== 'ready' || usage.version !== version || usage.document?.status !== 'available' || usage.stale) return false;
  if (usage.document.links?.some(item => item.status === 'unavailable' && item.reason !== 'size-limit')) return false;
  if (usage.analysisInputFingerprint !== analysisInputFingerprint(row)) return false;
  const age = now.getTime() - Date.parse(usage.sourceCheckedAt);
  const analyzed = Date.parse(usage.analyzedAt);
  return Number.isFinite(age) && age >= 0 && age < maxAgeMs && Number.isFinite(analyzed) && analyzed <= now.getTime();
}
