/* ============================================
   MinaTech Executive Dashboard - Application Logic
   ============================================ */

// Chart.js global defaults — match dashboard theme
Chart.defaults.color = '#a8b2c5';
Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
Chart.defaults.font.family = "'Inter', 'Noto Sans JP', sans-serif";
Chart.defaults.font.size = 11;

const PRIORITY_COLORS = {
  S: '#ef4444',
  A: '#f59e0b',
  B: '#3b82f6',
  C: '#6b7589',
};

// ========== DATA LOADING ==========

let DATA = null;

async function loadData() {
  try {
    const url = `data/dashboard.json?t=${Date.now()}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    DATA = await res.json();
    return DATA;
  } catch (e) {
    console.error('データ読み込み失敗:', e);
    document.getElementById('last-updated').textContent = 'データ取得失敗';
    return null;
  }
}

// ========== KPI ==========

function renderKPIs(d) {
  const re = d.realestate || { items: [], total_collected: 0 };
  const ses = d.ses || { items: [], total_collected: 0 };

  const sCount = re.items.filter(p => priorityKey(p.priority) === 'S').length;
  const aCount = re.items.filter(p => priorityKey(p.priority) === 'A').length;
  document.getElementById('kpi-realestate-priority').textContent = sCount + aCount;
  document.getElementById('kpi-realestate-s').textContent = sCount;
  document.getElementById('kpi-realestate-a').textContent = aCount;

  const sesA = ses.items.filter(p => priorityKey(p.priority) === 'A').length;
  document.getElementById('kpi-ses-priority').textContent = sesA;

  const totalMargin = ses.items
    .filter(p => priorityKey(p.priority) === 'A')
    .reduce((sum, p) => sum + (Number(p.margin_monthly) || 0), 0);
  document.getElementById('kpi-ses-margin').textContent = '¥' + (totalMargin * 10000).toLocaleString('ja-JP');

  document.getElementById('kpi-total-collected').textContent = (re.total_collected + ses.total_collected);
  document.getElementById('kpi-realestate-total').textContent = re.total_collected;
  document.getElementById('kpi-ses-total').textContent = ses.total_collected;

  document.getElementById('last-updated').textContent = formatDateTime(d.generated_at);
}

// ========== CHART: Real Estate Scatter ==========

function renderRealestateScatter(d) {
  const items = d.realestate?.items || [];
  const ctx = document.getElementById('chart-realestate-scatter');
  const datasets = ['S', 'A', 'B', 'C'].map(p => ({
    label: p,
    data: items
      .filter(it => priorityKey(it.priority) === p)
      .map(it => ({ x: it.price, y: it.yield_surface, r: 6, name: it.name })),
    backgroundColor: hexToRgba(PRIORITY_COLORS[p], 0.65),
    borderColor: PRIORITY_COLORS[p],
    borderWidth: 1.5,
  })).filter(ds => ds.data.length > 0);

  new Chart(ctx, {
    type: 'scatter',
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 8, boxHeight: 8, padding: 12 } },
        tooltip: {
          backgroundColor: 'rgba(10, 14, 26, 0.95)',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: ctx => {
              const it = ctx.raw;
              return `${it.name?.slice(0,30) || ''} | ${it.x}万円 | ${it.y}%`;
            }
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: '価格 (万円)', color: '#6b7589' },
          grid: { color: 'rgba(255,255,255,0.04)' },
        },
        y: {
          title: { display: true, text: '表面利回り (%)', color: '#6b7589' },
          grid: { color: 'rgba(255,255,255,0.04)' },
        }
      }
    }
  });
}

// ========== CHART: SES Bars ==========

function renderSesBars(d) {
  const items = d.ses?.items || [];
  const buckets = [
    { label: '〜60万', min: 0, max: 60, color: PRIORITY_COLORS.B },
    { label: '60-80万', min: 60, max: 80, color: PRIORITY_COLORS.B },
    { label: '80-100万', min: 80, max: 100, color: PRIORITY_COLORS.A },
    { label: '100-120万', min: 100, max: 120, color: PRIORITY_COLORS.A },
    { label: '120万〜', min: 120, max: Infinity, color: PRIORITY_COLORS.S },
  ];
  const counts = buckets.map(b =>
    items.filter(it => Number(it.unit_price) >= b.min && Number(it.unit_price) < b.max).length
  );
  const colors = buckets.map(b => hexToRgba(b.color, 0.65));
  const borderColors = buckets.map(b => b.color);

  new Chart(document.getElementById('chart-ses-bars'), {
    type: 'bar',
    data: {
      labels: buckets.map(b => b.label),
      datasets: [{ data: counts, backgroundColor: colors, borderColor: borderColors, borderWidth: 1.5, borderRadius: 4 }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(10, 14, 26, 0.95)',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          callbacks: { label: ctx => `${ctx.parsed.y} 件` }
        }
      },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 }, grid: { color: 'rgba(255,255,255,0.04)' } }
      }
    }
  });
}

// ========== CHART: Trend ==========

function renderTrend(d) {
  const trend = d.trend || [];
  if (!trend.length) return;

  new Chart(document.getElementById('chart-trend'), {
    type: 'line',
    data: {
      labels: trend.map(t => t.date.slice(5)),
      datasets: [
        {
          label: '不動産検出',
          data: trend.map(t => t.realestate_count),
          borderColor: PRIORITY_COLORS.A,
          backgroundColor: hexToRgba(PRIORITY_COLORS.A, 0.1),
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.3,
          fill: true,
        },
        {
          label: 'SES案件',
          data: trend.map(t => t.ses_count),
          borderColor: PRIORITY_COLORS.B,
          backgroundColor: hexToRgba(PRIORITY_COLORS.B, 0.1),
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.3,
          fill: true,
        },
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 8, boxHeight: 8, padding: 12 } },
        tooltip: {
          backgroundColor: 'rgba(10, 14, 26, 0.95)',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
        }
      },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.04)' } }
      }
    }
  });
}

// ========== TABLES ==========

function renderRealestateTable(d, filter = 'all') {
  const tbody = document.getElementById('realestate-tbody');
  let items = d.realestate?.items || [];
  items = items.filter(it => ['S', 'A'].includes(priorityKey(it.priority)));
  if (filter !== 'all') items = items.filter(it => priorityKey(it.priority) === filter);
  items.sort((a, b) => (b.score || 0) - (a.score || 0));

  if (!items.length) {
    tbody.innerHTML = '<tr><td colspan="9" class="empty">該当物件なし</td></tr>';
    return;
  }

  tbody.innerHTML = items.map(it => `
    <tr>
      <td><span class="priority-badge priority-${priorityKey(it.priority)}">${priorityKey(it.priority)}</span></td>
      <td><span class="cell-truncate" title="${escapeHtml(it.name)}">${escapeHtml(it.name)}</span></td>
      <td><span class="cell-truncate" title="${escapeHtml(it.location)}">${escapeHtml(it.location)}</span></td>
      <td class="num numeric-strong">${it.price}万</td>
      <td class="num numeric-strong">${it.yield_surface}%</td>
      <td class="num">${it.age || '-'}</td>
      <td class="num">${it.station_min ? it.station_min + '分' : '-'}</td>
      <td><span class="cell-truncate" title="${escapeHtml(it.reason)}">${escapeHtml(it.reason)}</span></td>
      <td>${it.url ? `<a href="${escapeHtml(it.url)}" target="_blank" rel="noopener">開く →</a>` : '-'}</td>
    </tr>
  `).join('');
}

function renderSesTable(d, filter = 'all') {
  const tbody = document.getElementById('ses-tbody');
  let items = d.ses?.items || [];
  items = items.filter(it => ['A', 'B'].includes(priorityKey(it.priority)));
  if (filter !== 'all') items = items.filter(it => priorityKey(it.priority) === filter);
  items.sort((a, b) => (b.margin_monthly || 0) - (a.margin_monthly || 0));

  if (!items.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty">該当案件なし</td></tr>';
    return;
  }

  tbody.innerHTML = items.map(it => `
    <tr>
      <td><span class="priority-badge priority-${priorityKey(it.priority)}">${priorityKey(it.priority)}</span></td>
      <td><span class="cell-truncate" title="${escapeHtml(it.name)}">${escapeHtml(it.name)}</span></td>
      <td class="num numeric-strong">${it.unit_price}万</td>
      <td class="num numeric-strong">${it.margin_monthly}万</td>
      <td>${escapeHtml(it.work_style || '-')}</td>
      <td>${escapeHtml(it.location || '-')}</td>
      <td>${renderSkillTags(it.skills)}</td>
      <td>${it.url ? `<a href="${escapeHtml(it.url)}" target="_blank" rel="noopener">開く →</a>` : '-'}</td>
    </tr>
  `).join('');
}

// ========== FILTER ==========

function bindFilters() {
  document.querySelectorAll('#realestate-filters .filter-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#realestate-filters .filter-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderRealestateTable(DATA, btn.dataset.filter);
    });
  });

  document.querySelectorAll('#ses-filters .filter-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#ses-filters .filter-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderSesTable(DATA, btn.dataset.filter);
    });
  });
}

// ========== HELPERS ==========

function priorityKey(label) {
  if (!label) return 'C';
  const m = label.match(/^([SABC])/i);
  return m ? m[1].toUpperCase() : 'C';
}

function renderSkillTags(skillsStr) {
  if (!skillsStr) return '-';
  const skills = skillsStr.split(/[,、]/).map(s => s.trim()).filter(Boolean).slice(0, 3);
  return `<div class="tag-list">${skills.map(s => `<span class="tag">${escapeHtml(s)}</span>`).join('')}</div>`;
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ========== INIT ==========

(async function init() {
  const d = await loadData();
  if (!d) return;

  renderKPIs(d);
  renderRealestateScatter(d);
  renderSesBars(d);
  renderTrend(d);
  renderRealestateTable(d, 'all');
  renderSesTable(d, 'all');
  bindFilters();
})();
