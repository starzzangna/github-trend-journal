const container = document.querySelector('#report');
const status = document.querySelector('#report-status');
const periodLabels = { daily: '오늘의 발견', weekly: '한 주의 발견', monthly: '한 달의 발견' };
const metricLabels = { daily: '일간 스타', weekly: '주간 스타', monthly: '월간 스타' };
let maxDocumentAge = 7 * 24 * 60 * 60 * 1000;
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const numeric = value => Number.isFinite(value) ? value.toLocaleString('ko-KR') : '미제공';
const dateText = value => Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '미확인';
let reports;
let loading = false;
let renderedPeriod;
let selectedPeriod = 'daily';
function currentPeriod() { const key = location.hash.slice(1); if (Object.hasOwn(periodLabels, key)) selectedPeriod = key; return selectedPeriod; }
function updateNavigation() {
  const period = currentPeriod();
  for (const tab of document.querySelectorAll('[data-period]')) {
    if (tab.dataset.period === period) tab.setAttribute('aria-current', 'page'); else tab.removeAttribute('aria-current');
  }
  return period;
}
function announce(text) { if (status) status.textContent = text; }
function sourceUrl(name, source) {
  const href = `https://github.com/${name}`;
  return source?.url === `${href}#readme` || source?.url?.startsWith(`${href}/blob/`) ? source.url : `${href}#readme`;
}
function freshness(usage) {
  if (usage?.status !== 'ready') return { key: 'unknown', label: '문서 미확인', note: '문서를 확인해야 분석을 제공할 수 있습니다.' };
  if (usage.stale || usage.document?.status === 'unavailable') return { key: 'old', label: '오래된 분석', note: '최신 문서 조회에 실패해 이전 분석을 표시합니다. 다음 수집에서 다시 확인합니다.' };
  const checked = usage.sourceCheckedAt || usage.checkedAt;
  const age = Date.now() - Date.parse(checked);
  if (!Number.isFinite(age) || age < 0) return { key: 'unknown', label: '확인 시각 미확인', note: '문서 확인 시각을 확인할 수 없어 최신 여부를 판단하지 않았습니다.' };
  if (age >= maxDocumentAge) return { key: 'old', label: '오래된 분석', note: '마지막 정상 문서 확인 후 확인 주기를 넘겼습니다. 문서 재확인 전까지 이전 내용을 참고하세요.' };
  return { key: 'fresh', label: '확인 주기 이내', note: '' };
}
function evidenceMarkup(usage, name, claim) {
  const items = (claim?.evidenceIds || []).map(id => usage.evidence?.find(item => item.id === id)).filter(Boolean);
  if (!items.length) return '<p class="usage-note">연결된 원문 근거가 없습니다. 공식 문서 확인이 필요합니다.</p>';
  return `<details class="evidence-note"><summary aria-label="${escape(name)} · ${escape(claim.title || '용도 분류')}의 원문 근거 ${items.length}개 보기">원문 근거 ${items.length}개 보기${claim.exampleOnly || items.some(item => item.kind === 'example') ? ' · 사용 예, 실행 미검증' : ''}</summary><div class="evidence-content">${items.map(item => {
    const source = usage.sources?.find(value => value.id === item.sourceId);
    return `<blockquote>${escape(item.excerpt)}</blockquote><a class="finding-source" href="${escape(sourceUrl(name, source))}" target="_blank" rel="noopener noreferrer" aria-label="${escape(name)} · ${escape(item.section)} 원문, 새 탭">원문 근거 · ${escape(source?.path || 'README')} / ${escape(item.section)} ↗</a><p class="usage-note">절 시작 ${numeric(item.line)}행${claim.exampleOnly || item.kind === 'example' ? ' · 문서의 사용 예이며 실행 검증은 포함하지 않습니다.' : ''}</p>`;
  }).join('')}</div></details>`;
}
function representativeMarkup(project, usage, name, prefix = '') {
  if (!project?.examples?.length) return '';
  return `<section class="representative-examples" aria-label="대표 항목 사용 예"><h5>대표 항목 사용 예</h5><p class="usage-note">각 항목의 공식 문서에 따른 설명입니다. 모음 전체의 공통 입출력이 아니며 실행은 검증하지 않았습니다.</p>${project.examples.map(item => `<section class="note-section"><h5>${escape(item.title)}</h5>${['scenario', 'input', 'output', 'caution'].map(field => `<div class="project-claim"><strong>${escape(item[field].title)}</strong><p>${escape(item[field].body)}</p>${evidenceMarkup(usage, name, { ...item[field], title: prefix + item.title + ' · ' + item[field].title })}</div>`).join('')}</section>`).join('')}</section>`;
}
function setupMarkup(setup, usage, name, prefix = '설치·실행 · ') {
  if (!setup) return '';
  const render = claim => `<div class="project-claim"><strong>${escape(claim.title)}</strong><p>${escape(claim.body)}</p>${evidenceMarkup(usage, name, { ...claim, title: prefix + claim.title })}</div>`;
  const labels = { required: '해당 작업 경로의 요구사항', optional: '선택 경로의 추가 조건', 'documented-environment': '문서가 전제한 환경' };
  return `<section class="representative-examples" aria-label="모음 설치와 대표 실행 조건"><h5>모음 공통의 설치 경로</h5><p class="usage-note">Claude Code 선택 경로와 대표 스킬의 개별 실행 조건을 구분합니다. 설치·실행을 검증한 결과는 아닙니다.</p>${setup.installation ? render(setup.installation) : '<p class="unconfirmed">공통 설치 경로를 확인할 문서 근거가 부족합니다.</p>'}<p class="usage-note">설치 근거: ${setup.installation ? '확인' : '부족'} · 대표 실행 조건: ${numeric(usage.quality?.setup?.runtimeAvailable)}/${numeric(usage.quality?.setup?.runtimeExpected)}개 스킬 확인</p><h5>대표 스킬별 실행 조건</h5>${setup.runtimes.map(item => `<section class="note-section"><h5>${escape(item.title)}</h5><p class="usage-note">실행 조건 근거 ${item.conditions.length}/${numeric(item.expected)}개 확인</p>${item.conditions.length ? item.conditions.map(claim => `<p class="usage-note">${escape(labels[claim.applicability] || '')} · ${escape(claim.path)}</p>${render(claim)}`).join('') : '<p class="unconfirmed">실행 조건을 확인할 근거가 부족합니다.</p>'}</section>`).join('')}<p class="usage-note">한 스킬의 Python·OCR·재계산 조건을 모든 스킬의 필수 조건으로 확대하지 않습니다.</p></section>`;
}
function collectionScopeMarkup(project, usage, name) {
  if (project?.ioScope?.kind !== 'item-specific') return '';
  const quality = usage.quality;
  const excluded = quality.notApplicable || [];
  const representatives = quality.representatives;
  const note = representatives?.status === 'not-configured' ? '대표 항목 자동 분석 미지원 · 개별 스킬 문서 확인이 필요합니다.' : representatives?.expected ? `대표 항목 근거: ${numeric(representatives.available)}/${numeric(representatives.expected)}개 확인.` : '공통 계약을 계속 평가합니다.';
  return `<aside class="missing-note" aria-label="입출력 평가 범위"><strong>공통 ${excluded.length ? excluded.join('·') + ' · 해당 없음' : '입출력 · 평가 유지'}</strong><p>${escape(project.ioScope.body)}</p>${evidenceMarkup(usage, name, { title: '모음형 입출력 평가 범위', evidenceIds: project.ioScope.evidenceIds })}<p>${escape(note)} 해당 없음은 근거 부족으로 집계하지 않습니다.</p></aside>`;
}
function projectIoMarkup(project, usage, name) {
  if (!project) return '<p class="usage-note">이전 형식의 분석입니다. 문서 재확인 후 한국어 설명과 근거를 보완합니다.</p>';
  const fields = [['input', 'inputs', '입력'], ['output', 'outputs', '출력']].filter(([field]) => usage.quality?.io?.[field] !== 'not-applicable');
  return fields.length ? `<div class="project-io">${fields.map(([field, key, label]) => `<section><h5>${project.ioScope ? '공통 ' : project.examples?.length ? '모음 전체의 ' : ''}${label}</h5>${usage.version >= 10 ? `<p class="usage-note">${label} · ${usage.quality?.io?.[field] === 'documented' ? '문서 확인' : '근거 부족'}</p>` : ''}${claimList(project[key], usage, name, `${label}을 확인할 문장·사용 예가 부족합니다.`)}</section>`).join('')}</div>` : '';
}
function claimList(items, usage, name, missing, prefix = '') {
  return items?.length ? items.map(item => `<div class="project-claim"><strong>${escape(item.title)}</strong><p>${escape(item.summaryKo || (usage.version >= 6 ? item.body : '한국어 요약을 갱신해야 합니다. 원문 근거를 확인하세요.'))}</p>${evidenceMarkup(usage, name, { ...item, title: prefix + item.title })}</div>`).join('') : `<p class="unconfirmed">${missing}</p>`;
}
function aiMarkup(row, usage) {
  const note = usage.ai;
  if (!note) return '';
  const fallback = text => `<aside class="ai-fallback"><strong>규칙 기반 분석으로 제공</strong><p>${text}</p></aside>`;
  if (freshness(usage).key !== 'fresh') return fallback('문서의 최신성을 확인하지 못해 AI 해석을 표시하지 않습니다.');
  if (note.status !== 'ready') {
    const reasons = {
      timeout: 'AI 응답 시간이 초과되어 기본 분석을 표시합니다.',
      budget: '이번 실행의 AI 처리 한도에 도달해 기본 분석을 표시합니다.',
      'project-limit': '이번 실행의 AI 처리 개수에 도달해 기본 분석을 표시합니다.',
      'insufficient-evidence': 'AI 해석에 사용할 문서 근거가 부족해 기본 분석을 표시합니다.',
      ungrounded: 'AI 응답의 원문 근거를 확인하지 못해 기본 분석을 표시합니다.',
      'verification-failed': 'AI 응답이 근거 검토를 통과하지 못해 기본 분석을 표시합니다.',
      'invalid-output': 'AI 응답 형식을 확인하지 못해 기본 분석을 표시합니다.'
    };
    return fallback(reasons[note.reason] || '선택적 AI 분석을 사용할 수 없어 기본 분석을 표시합니다.');
  }
  try {
    if (!Array.isArray(note.insights) || note.insights.length !== 3) throw Error('AI 노트 형식 오류');
    const labels = { adoption: '도입 관점', tradeoff: '제약과 절충', validation: '작은 검증 제안' };
    return `<details class="ai-note"><summary>${escape(row.name)} · 선택적 AI 심층 분석</summary><p class="usage-note">원문 인용 확인과 추가 AI 근거 검토를 거친 해석입니다. 실행·성능 검증이나 사실 보증은 아닙니다.</p>${note.insights.map(insight => `<section class="ai-insight"><h5>${labels[insight.id] || '추가 해석'}</h5><p>${escape(insight.analysis)}</p>${evidenceMarkup(usage, row.name, { title: `AI ${labels[insight.id] || '해석'}`, evidenceIds: insight.citations.map(citation => citation.evidenceId) })}</section>`).join('')}<p class="usage-note">AI 해석 생성 · ${escape(dateText(note.analyzedAt))} KST</p></details>`;
  } catch { return fallback('AI 해석을 표시하지 못해 기본 분석을 제공합니다.'); }
}
function usageMarkup(row) {
  const usage = row.usage;
  const age = freshness(usage);
  const quality = usage?.quality;
  const qualityText = { complete: '기본 항목 충족', partial: '부분 분석', unavailable: '분석 불가' }[quality?.status] || '분석 확인 대기';
  const qualityKey = ['complete', 'partial', 'unavailable'].includes(quality?.status) ? quality.status : 'unknown';
  const badges = `<div class="analysis-status" aria-label="분석 품질과 문서 최신성"><span class="badge badge--${qualityKey}">분석 품질 · ${qualityText}</span><span class="badge badge--${age.key}">문서 최신성 · ${age.label}</span></div>`;
  const documentText = usage?.document?.status === 'available' ? '성공' : usage?.document?.status === 'unavailable' ? '실패' : '미확인';
  const missing = quality?.missing?.length ? `<aside class="missing-note" aria-label="미확인 항목"><strong>판단 전에 더 확인할 내용</strong><p>미확인 항목: ${quality.missing.map(escape).join(', ')}</p></aside>` : '';
  const dates = `<div class="analysis-dates"><span>문서 조회 · ${documentText}</span><span>문서 확인 · ${escape(dateText(usage?.sourceCheckedAt || usage?.checkedAt))} KST</span><span>본문 분석 · ${escape(dateText(usage?.analyzedAt || usage?.checkedAt))} KST</span></div>`;
  if (!usage || usage.status !== 'ready') return `<section class="usage usage--pending" aria-label="${escape(row.name)} 활용 분석">${badges}<h5>분석을 기다리고 있습니다.</h5><p>${escape(usage?.reason || 'README 분석이 아직 준비되지 않았습니다.')}</p><a href="https://github.com/${escape(row.name)}#readme" target="_blank" rel="noopener noreferrer">공식 README에서 직접 확인 ↗</a></section>`;
  const article = usage.article;
  const project = article?.project;
  const start = usage.start;
  return `<section class="usage" aria-label="${escape(row.name)} 활용 분석"><div class="usage-title"><span>검토 노트</span><span>${escape(usage.category)}</span></div>${badges}
    ${age.note ? `<p class="freshness-note freshness-note--${age.key}"><strong>${age.label}</strong> · ${escape(age.note)}</p>` : ''}
    ${usage.document?.links?.some(item => item.status === 'unavailable' && !['size-limit', 'project-size-limit'].includes(item.reason)) ? `<p class="usage-note">추가 문서 ${usage.document.links.filter(item => item.status === 'unavailable' && !['size-limit', 'project-size-limit'].includes(item.reason)).length}개를 확인하지 못했습니다. 읽은 문서의 근거만 표시하며 다음 수집에서 다시 시도합니다.</p>` : ''}
    ${usage.document?.links?.some(item => ['size-limit', 'project-size-limit'].includes(item.reason)) ? '<p class="usage-note">추가 문서가 파일당 250,000바이트 또는 프로젝트당 750,000바이트 상한을 넘어 분석에서 제외됐습니다. 읽은 문서의 근거만 표시하며 문서 확인 주기에 다시 확인합니다.</p>' : ''}
    <section class="core-summary" aria-label="핵심 동작"><h5>핵심 동작</h5>${claimList(article?.core, usage, row.name, '구체적인 핵심 동작을 한국어로 설명할 문서 근거가 부족합니다.', '핵심 동작 · ')}</section>
    <div class="decision"><h5>도입 시 주의점</h5>${project?.conditions?.length ? claimList(project.conditions.slice(0, 2), usage, row.name, '', '주의점 · ') : ''}<p>${escape(usage.version >= 6 ? article.verdict : '한국어 검토 내용을 갱신해야 합니다. 원문 근거를 확인하세요.')}</p>${article?.verdictEvidenceIds?.length ? evidenceMarkup(usage, row.name, { title: '도입 시 주의점', evidenceIds: article.verdictEvidenceIds }) : ''}<span class="usage-note">문서에 따른 규칙 요약과 검토 제안이며 실제 실행을 검증한 추천은 아닙니다.</span></div>
    ${aiMarkup(row, usage)}
    ${missing}
    ${collectionScopeMarkup(project, usage, row.name)}
    ${representativeMarkup(project, usage, row.name)}
    ${setupMarkup(project?.setup, usage, row.name)}
    ${projectIoMarkup(project, usage, row.name)}
    <details class="analysis-details"><summary>${escape(row.name)} · 도입 조건과 추가 분석</summary><div class="usage-content">
      ${usage.document?.links?.length ? `<details class="evidence-note"><summary>추가 문서 조회 상태 보기</summary><ul>${usage.document.links.map(item => `<li>${escape(item.path)} · ${item.status === 'available' ? '확인 완료' : item.reason === 'size-limit' ? '분석 제외: 250,000바이트 상한 초과' : item.reason === 'project-size-limit' ? '분석 제외: 프로젝트 문서 크기 상한 초과' : item.reason === 'http' ? `HTTP ${numeric(item.httpStatus)} 응답, 다음 수집에서 재시도` : item.reason === 'timeout' ? '시간 초과, 다음 수집에서 재시도' : '확인 실패, 다음 수집에서 재시도'}</li>`).join('')}</ul></details>` : ''}
      <section class="note-section"><h5>도입 조건</h5>${claimList(project?.conditions || article?.conditions, usage, row.name, '도입 조건을 확인하지 못했습니다. 별도 조건이 없다는 뜻은 아닙니다.')}</section>
      ${project?.problem ? `<section class="note-section"><h5>해결 문제의 원문 근거</h5>${evidenceMarkup(usage, row.name, project.problem)}</section>` : ''}
      ${article?.findings?.length ? `<section class="note-section"><h5>핵심 기능과 활용 의미</h5>${claimList(article.findings, usage, row.name, '')}</section>` : ''}
      ${article?.workflow?.length ? `<section class="note-section"><h5>작게 확인하는 순서</h5><ol>${article.workflow.map(step => `<li><strong>${escape(step.title)}</strong><p>${escape(step.body)}</p></li>`).join('')}</ol></section>` : ''}
      <section class="note-section official"><h5>공식 문서의 시작 경로</h5>${start ? `<details class="evidence-note"><summary>공식 시작 절의 원문·명령 보기</summary><p><strong>${escape(start.heading)}</strong> 절에서 환경에 맞는 경로를 선택하세요.</p>${start.steps?.length ? `<ul>${start.steps.map(step => `<li>${escape(step)}</li>`).join('')}</ul>` : ''}${start.command ? `<p class="usage-note">원문 명령 예시 · 실행하지 않았습니다.</p><pre><code>${escape(start.command)}</code></pre>` : ''}${start.excerpt ? `<blockquote>${escape(start.excerpt)}</blockquote>` : ''}</details>` : '<p>시작 절차를 자동으로 찾지 못했습니다.</p>'}<a href="https://github.com/${escape(row.name)}#readme" target="_blank" rel="noopener noreferrer">공식 사용 문서 읽기 ↗</a></section>
      ${usage.classification?.evidenceIds?.length ? `<section class="note-section"><h5>용도 분류 근거</h5>${evidenceMarkup(usage, row.name, { ...usage.classification, title: '용도 분류' })}</section>` : ''}
      <p class="usage-note">${escape(project?.limitations || article?.limitations || usage.basis)}</p>
    </div></details>${dates}</section>`;
}
function synthesisMarkup(report) {
  const synthesis = report.synthesis;
  if (!synthesis) return '';
  const old = report.rows.filter(row => freshness(row?.usage).key === 'old').length;
  const exampleGroups = new Map();
  for (const item of synthesis.representativeExamples || []) {
    if (!exampleGroups.has(item.name)) exampleGroups.set(item.name, []);
    exampleGroups.get(item.name).push(item);
  }
  const scopeSummary = synthesis.version >= 2 ? `<section aria-label="입출력 근거와 대표 항목 집계"><h4>입출력 평가 범위</h4><p>공통 입력: 확인 ${synthesis.coverage.inputs}개 · 해당 없음 ${synthesis.coverage.inputsNotApplicable}개 · 근거 부족 ${synthesis.coverage.inputEvidenceMissing}개</p><p>공통 출력: 확인 ${synthesis.coverage.outputs}개 · 해당 없음 ${synthesis.coverage.outputsNotApplicable}개 · 근거 부족 ${synthesis.coverage.outputEvidenceMissing}개</p><p class="usage-note">전체 ${synthesis.coverage.total}개 중 분석 자료 없음 ${synthesis.coverage.unavailable}개는 별도입니다. 해당 없음은 모음형의 공통 계약 평가에서 제외한 수이며 근거 부족이 아닙니다.</p><h4>대표 항목 사용 예 · ${synthesis.coverage.examples}개</h4><p class="usage-note">${synthesis.coverage.exampleProjects}개 프로젝트의 예를 확인했습니다. 대표 항목 근거 부족 ${synthesis.coverage.exampleMissing}개.${synthesis.version >= 3 ? ` 대표 항목 자동 분석 미지원 모음 ${synthesis.coverage.exampleUnconfigured}개.` : ''} 공통 입출력 확인 수에는 합산하지 않습니다.</p>${[...exampleGroups].map(([name, examples]) => {
    const row = report.rows.find(row => row.name === name);
    return `<details class="shared-pattern"><summary>${escape(name)} · 대표 항목 ${examples.length}개${freshness(row?.usage).key === 'old' ? ' · 오래된 분석' : ''}</summary>${representativeMarkup({ examples }, row?.usage || {}, name, '종합 · ')}</details>`;
  }).join('')}</section>` : '';
  const setupSummary = synthesis.version >= 4 && synthesis.setupReviews?.length ? `<section aria-label="설치 경로와 실행 조건 종합"><h4>설치 경로와 실행 조건</h4><p class="usage-note">설치·실행 조건을 별도 분석한 모음 ${synthesis.setupReviews.length}개 기준입니다.</p><p>모음 설치 경로 확인 ${synthesis.coverage.collectionInstallations}개 프로젝트 · 대표 실행 조건 확인 ${synthesis.coverage.runtimeGroups}개 스킬 · 근거 부족 ${synthesis.coverage.runtimeMissing}개 스킬</p><p class="usage-note">개별 실행 조건 ${synthesis.coverage.runtimeConditions}개는 모음 전체의 필수 조건 수에 합산하지 않습니다.</p>${(synthesis.setupReviews || []).map(item => {
    const row = report.rows.find(row => row.name === item.name);
    return `<details class="shared-pattern"><summary>${escape(item.name)} · 모음 설치와 대표 실행 조건${freshness(row?.usage).key === 'old' ? ' · 오래된 분석' : ''}</summary>${setupMarkup(item, row?.usage || {}, item.name, '종합 · ')}</details>`;
  }).join('')}</section>` : '';
  const scopes = { required: '해당 경로 요구사항', optional: '선택 경로', 'not-required': '필수 아님', mentioned: '문서상 언급' };
  const proof = project => {
    const row = report.rows.find(row => row.name === project.name);
    return `<li><strong>${escape(project.name)}</strong>${project.scope ? ` · ${escape(scopes[project.scope])}` : ''}${project.exampleOnly ? ' · 사용 예, 실행 미검증' : ''}${freshness(row?.usage).key === 'old' ? ' · 오래된 분석' : ''}${evidenceMarkup(row?.usage || {}, project.name, { title: project.name, evidenceIds: project.evidenceIds })}</li>`;
  };
  return `<section class="synthesis" aria-label="프로젝트 분석 종합"><div class="synthesis-heading"><h3>이번 목록의 검토 현황</h3><span>분석 갱신 · ${escape(dateText(synthesis.generatedAt))} KST</span></div><div class="review-metrics"><div><strong>${synthesis.coverage.complete}</strong><span>기본 항목 충족</span></div><div><strong>${synthesis.coverage.partial}</strong><span>부분 분석</span></div><div><strong>${old}</strong><span>오래된 분석</span></div></div><p class="usage-note">이 발행호의 ${synthesis.coverage.total}개 기준 · 미분류 ${synthesis.coverage.unknown}개 포함. 오래됨은 현재 시각 기준이며 부분 분석과 동시에 해당할 수 있습니다.</p>${scopeSummary}${setupSummary}<details class="distribution"><summary>용도 분포와 전체 분석 범위 보기</summary><ul class="category-groups">${synthesis.categoryGroups.map(group => `<li><strong>${escape(group.category)}</strong> ${group.count}/${synthesis.coverage.total}<span>${group.projects.map(escape).join(', ')}</span></li>`).join('')}</ul><ul>${report.analysis.map(text => `<li>${escape(text)}</li>`).join('')}</ul></details><h4>함께 살펴볼 문서 근거</h4><p class="usage-note">공통 항목이며 같은 성능이나 동일한 필수 조건이라는 뜻은 아닙니다.</p>${synthesis.sharedPatterns.length ? synthesis.sharedPatterns.map(pattern => `<details class="shared-pattern"><summary>${({input:'입력',output:'출력',condition:'도입 조건'})[pattern.kind]} · ${escape(pattern.title)} (${pattern.projects.length}개)</summary><ul>${pattern.projects.map(proof).join('')}</ul></details>`).join('') : '<p>공통 항목을 확인할 근거가 부족합니다.</p>'}</section>`;
}
function projectMarkup(row, index) {
  try {
    const href = `https://github.com/${row.name}`;
    if (!/^[\w.-]+\/[\w.-]+$/.test(row.name)) throw Error('저장소 경로 오류');
    return `<article class="project"><div class="project-header"><span class="rank">${String(index + 1).padStart(2, '0')}</span><div class="project-heading"><h4><a href="${escape(href)}" target="_blank" rel="noopener noreferrer">${escape(row.name)} ↗</a></h4><span class="language">${escape(row.language || '미분류')}</span></div><span class="growth"><strong>${numeric(row.periodStars)}</strong> ${metricLabels[currentPeriod()]}</span></div><div class="project-body">${usageMarkup(row)}<details class="repository-original"><summary>${escape(row.name)} · 저장소 원문 소개</summary><p class="repository-description">${escape(row.description || '저장소 설명이 없습니다.')}</p></details><div class="project-meta"><span>총 스타 ${numeric(row.stars)}</span><a href="${escape(href)}#readme" target="_blank" rel="noopener noreferrer">README 읽기 ↗</a></div></div></article>`;
  } catch {
    const link = /^[\w.-]+\/[\w.-]+$/.test(row?.name || '') ? `<a href="https://github.com/${escape(row.name)}#readme" target="_blank" rel="noopener noreferrer">공식 README에서 직접 확인 ↗</a>` : '';
    return `<article class="project project--error"><h4>${escape(row?.name || `프로젝트 ${index + 1}`)}</h4><p>이 프로젝트의 분석을 표시하지 못했습니다. 다른 프로젝트는 계속 읽을 수 있습니다.</p>${link}</article>`;
  }
}
function validateReports(data) {
  if (!data?.reports || typeof data.reports !== 'object' || Array.isArray(data.reports)) throw Error('보고서 형식 오류');
  for (const period of Object.keys(periodLabels)) {
    const report = data.reports[period];
    if (!report) continue;
    if (!Array.isArray(report.rows) || typeof report.title !== 'string' || typeof report.summary !== 'string' || !Array.isArray(report.analysis) || report.analysis.some(text => typeof text !== 'string') || !Number.isFinite(Date.parse(report.publishedAt))) throw Error('보고서 필드 오류');
  }
  return data.reports;
}
function render({ focusResult = false } = {}) {
  const period = updateNavigation();
  const report = reports[period];
  container.setAttribute('aria-busy', 'false');
  renderedPeriod = period;
  if (!report || !report.rows.length) {
    container.innerHTML = '<div class="state"><h2 id="report-title" tabindex="-1">첫 번째 발견을 기다립니다.</h2><p>아직 발행된 프로젝트가 없습니다.</p><a href="https://github.com/trending" target="_blank" rel="noopener noreferrer">GitHub Trending 살펴보기 ↗</a></div>';
    announce(`${periodLabels[period]}에 발행된 프로젝트가 없습니다.`);
  } else {
    container.innerHTML = `<div class="section-heading"><h2 id="report-title" tabindex="-1">${periodLabels[period]} <span>${report.rows.length} PROJECTS</span></h2><span>최초 발행 · ${escape(dateText(report.publishedAt))} KST</span></div><section class="report-intro"><span class="eyebrow">TREND BRIEF</span><h3>${escape(report.title)}</h3><p>${escape(report.summary)}</p><a href="https://github.com/trending?since=${period}" target="_blank" rel="noopener noreferrer">원본 목록 보기 ↗</a></section>${synthesisMarkup(report)}<div class="list-heading"><h3>프로젝트별 도입 검토</h3><span>GitHub 표시 순위 기준</span></div><div class="projects">${report.rows.map(projectMarkup).join('')}</div><p class="source-note">발행 시점의 목록입니다. 스타 수는 GitHub의 기간 표시값이며 도입 추천 점수가 아닙니다.</p>`;
    announce(`${periodLabels[period]} ${report.rows.length}개 프로젝트를 불러왔습니다.`);
  }
  if (focusResult) document.querySelector('#report-title')?.focus();
}
async function load({ focusResult = false } = {}) {
  if (loading) return;
  loading = true;
  const canRestoreFocus = () => focusResult && (!document.activeElement || document.activeElement === document.body || container.contains(document.activeElement));
  container.setAttribute('aria-busy', 'true');
  container.innerHTML = `<div class="state state--loading"><h2>보고서를 불러오고 있습니다.</h2><p>잠시만 기다려 주세요.</p>${focusResult ? '<button type="button" disabled>불러오는 중…</button>' : ''}</div>`;
  announce('보고서를 불러오고 있습니다.');
  try {
    const response = await fetch('./reports.json', { cache: 'no-cache', signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw Error('보고서 응답 오류');
    const data = await response.json();
    const next = validateReports(data);
    const previousAge = maxDocumentAge;
    if (data.documentMaxAgeMs !== undefined) {
      if (!Number.isFinite(data.documentMaxAgeMs) || data.documentMaxAgeMs < 0) throw Error('확인 주기 오류');
      maxDocumentAge = data.documentMaxAgeMs;
    }
    const previous = reports;
    reports = next;
    try { render({ focusResult: canRestoreFocus() }); } catch (error) { reports = previous; maxDocumentAge = previousAge; throw error; }
  } catch {
    container.setAttribute('aria-busy', 'false');
    container.innerHTML = '<div class="state state--error"><h2>보고서를 불러오지 못했습니다.</h2><p>보고서 응답을 정상적으로 읽지 못했습니다. 다시 불러오면 같은 기간의 보고서를 확인합니다.</p><button type="button" id="retry">다시 불러오기</button></div>';
    announce('보고서를 불러오지 못했습니다. 다시 불러오기 버튼을 선택해 주세요.');
    const retry = document.querySelector('#retry');
    retry.addEventListener('click', () => load({ focusResult: true }));
    if (canRestoreFocus()) retry.focus();
  } finally { loading = false; }
}
addEventListener('hashchange', () => { const period = updateNavigation(); if (reports && !loading && period !== renderedPeriod) render(); });
updateNavigation();
load();
