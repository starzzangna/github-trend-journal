const container = document.querySelector('#report');
const periodLabels = { daily: '오늘의 발견', weekly: '한 주의 발견', monthly: '한 달의 발견' };
const metricLabels = { daily: '해당 일간', weekly: '해당 주간', monthly: '해당 월간' };
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
let reports;
const numeric = value => Number.isFinite(value) ? value.toLocaleString('ko-KR') : '미제공';
function currentPeriod() { const key = location.hash.slice(1); return key in periodLabels ? key : 'daily'; }
function usageMarkup(row, href) {
  const usage = row.usage;
  if (!usage || usage.status !== 'ready') return `<div class="usage-pending"><strong>사용법 확인 대기</strong><p>${escape(usage?.reason || '아직 README 분석이 완료되지 않았습니다.')}</p><a href="${escape(href)}#readme" target="_blank" rel="noopener noreferrer">공식 README에서 사용법 확인 ↗</a></div>`;
  const start = usage.start;
  return `<section class="usage" aria-label="${escape(row.name)} 활용 분석"><div class="usage-title"><span>어디에 쓰나요?</span><span class="usage-category">${escape(usage.category)}</span></div><p class="usage-purpose">${escape(usage.purpose)}</p>
    <details><summary>활용 방법과 시작 절차 보기 <span aria-hidden="true">＋</span></summary><div class="usage-content">
      ${usage.audience ? `<div class="usage-item"><h4>이런 분이 살펴보세요</h4><p>${escape(usage.audience)}</p></div>` : ''}
      ${usage.scenario ? `<div class="usage-item"><h4>활용 예 <span>분류 기반 제안</span></h4><p>${escape(usage.scenario)}</p></div>` : ''}
      <div class="usage-item official"><h4>README에서 확인한 시작 방법</h4>${start ? `<p>공식 README의 <strong>${escape(start.heading)}</strong> 절을 확인하세요.</p>${start.steps.length ? `<ul>${start.steps.map(step => `<li>${escape(step)}</li>`).join('')}</ul>` : ''}${start.excerpt ? `<blockquote lang="en">${escape(start.excerpt)}</blockquote>` : ''}${start.command ? `<span class="command-label">원문 명령 예시 · 실행 전 전체 절차를 확인하세요</span><pre><code>${escape(start.command)}</code></pre>` : '<p class="usage-note">짧은 실행 예시를 확인하지 못했습니다. 명령을 임의로 생성하지 않았습니다.</p>'}` : '<p>README에서 시작 절차를 자동으로 찾지 못했습니다. 원문에서 설치·사용 방법을 확인해 주세요.</p>'}<a href="${escape(href)}#readme" target="_blank" rel="noopener noreferrer">공식 사용 문서 읽기 ↗</a></div>
      <p class="usage-note">${escape(usage.basis)} 프로젝트 실행 검증은 포함하지 않습니다.</p>
    </div></details></section>`;
}
function render() {
  const period = currentPeriod();
  for (const tab of document.querySelectorAll('[data-period]')) {
    if (tab.dataset.period === period) tab.setAttribute('aria-current', 'page');
    else tab.removeAttribute('aria-current');
  }
  const report = reports[period];
  container.setAttribute('aria-busy', 'false');
  if (!report) {
    container.innerHTML = '<div class="state"><span class="empty-mark">↗</span><h2>첫 번째 발견을 기다립니다.</h2><p>아직 발행된 보고서가 없습니다. 첫 수집이 완료되면 이곳에 자동으로 게시됩니다.</p><a href="https://github.com/trending" target="_blank" rel="noopener noreferrer">GitHub Trending에서 먼저 살펴보기 ↗</a></div>'; return;
  }
  const date = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(report.publishedAt));
  const source = `https://github.com/trending?since=${period}`;
  container.innerHTML = `
    <div class="section-heading"><h2>${periodLabels[period]} <span>/ ${String(report.rows.length).padStart(2, '0')} PROJECTS</span></h2><time datetime="${escape(report.publishedAt)}">${escape(date)} KST 발행</time></div>
    <article class="feature"><div class="feature-copy"><div class="eyebrow">TREND BRIEF <span>01 — ${period.toUpperCase()}</span></div><h3>${escape(report.title)}</h3><p>${escape(report.summary)}</p><a href="${source}" target="_blank" rel="noopener noreferrer">원본 트렌드 살펴보기 <span>↗</span></a></div><div class="feature-art" aria-hidden="true"><div class="art-grid"></div><span class="art-label">OPEN SOURCE<br>IN MOTION</span><span class="big-arrow">↗</span><span class="art-bottom">DISCOVER. BUILD. REPEAT.</span></div></article>
    <div class="analysis"><span class="analysis-label">읽어볼 포인트</span><ul>${report.analysis.map(line => `<li>${escape(line)}</li>`).join('')}</ul></div>
    <div class="list-heading"><h3>주목할 프로젝트</h3><span>GitHub 표시 순위 기준</span></div>
    <div class="projects">${report.rows.map((row, index) => {
      const href = `https://github.com/${row.name.split('/').map(encodeURIComponent).join('/')}`;
      return `<article class="project"><span class="rank">${String(index + 1).padStart(2, '0')}</span><div class="project-body"><div class="project-heading"><a href="${escape(href)}" target="_blank" rel="noopener noreferrer">${escape(row.name)} <span>↗</span></a><span class="language">${escape(row.language)}</span></div><p>${escape(row.description || '프로젝트 설명이 제공되지 않았습니다.')}</p><div class="project-meta"><span>☆ 총 스타 ${numeric(row.stars)}</span><a href="${escape(href)}#readme" target="_blank" rel="noopener noreferrer">README 읽기 ↗</a></div>${usageMarkup(row, href)}</div><div class="growth"><strong>${row.periodStars === null ? '—' : numeric(row.periodStars)}</strong><span>${metricLabels[period]} 스타</span></div></article>`;
    }).join('')}</div><p class="source-note">출처: <a href="${source}" target="_blank" rel="noopener noreferrer">GitHub Trending ↗</a> · 발행 시점의 목록이며 현재 순위와 다를 수 있습니다. 스타 수는 GitHub의 기간 표시값입니다.</p>`;
}
async function load() {
  container.setAttribute('aria-busy', 'true');
  try {
    const response = await fetch('./reports.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error('보고서 응답 오류');
    const data = await response.json();
    if (!data.reports || typeof data.reports !== 'object') throw new Error('보고서 형식 오류');
    reports = data.reports; render();
  } catch {
    container.setAttribute('aria-busy', 'false');
    container.innerHTML = '<div class="state"><h2>보고서를 불러오지 못했습니다.</h2><p>네트워크 연결을 확인한 뒤 다시 시도해 주세요.</p><button type="button" id="retry">다시 불러오기 ↻</button></div>';
    document.querySelector('#retry').addEventListener('click', load);
  }
}
addEventListener('hashchange', () => { if (reports) render(); });
load();
