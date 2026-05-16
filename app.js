/* ============================================
   MinaTech Executive Dashboard - Application Logic
   ============================================ */

// Local Agent API endpoint
const AGENT_API = 'http://127.0.0.1:8765';

// Chart.js global defaults — match dashboard theme
Chart.defaults.color = '#a8b2c5';
Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
Chart.defaults.font.family = "'Inter', 'Noto Sans JP', sans-serif";
Chart.defaults.font.size = 11;

let AGENT_AVAILABLE = false;

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
      <td data-label="優先度"><span class="priority-badge priority-${priorityKey(it.priority)}">${priorityKey(it.priority)}</span></td>
      <td data-label="物件名"><span class="cell-truncate" title="${escapeHtml(it.name)}">${escapeHtml(it.name)}</span></td>
      <td data-label="所在地"><span class="cell-truncate" title="${escapeHtml(it.location)}">${escapeHtml(it.location)}</span></td>
      <td data-label="価格" class="num numeric-strong">${it.price}万</td>
      <td data-label="利回り" class="num numeric-strong">${it.yield_surface}%</td>
      <td data-label="築年" class="num">${it.age || '-'}</td>
      <td data-label="駅徒歩" class="num">${it.station_min ? it.station_min + '分' : '-'}</td>
      <td data-label="判断根拠"><span class="cell-truncate" title="${escapeHtml(it.reason)}">${escapeHtml(it.reason)}</span></td>
      <td data-label="リンク">${it.url ? `<a href="${escapeHtml(it.url)}" target="_blank" rel="noopener">開く →</a>` : '-'}</td>
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

  tbody.innerHTML = items.map(it => {
    const projKey = (it.name || '').slice(0, 20).split(/[【】\s]/).filter(Boolean)[0] || '案件';
    return `
    <tr>
      <td data-label="優先度"><span class="priority-badge priority-${priorityKey(it.priority)}">${priorityKey(it.priority)}</span></td>
      <td data-label="案件名"><span class="cell-truncate" title="${escapeHtml(it.name)}">${escapeHtml(it.name)}</span></td>
      <td data-label="月単価" class="num numeric-strong">${it.unit_price}万</td>
      <td data-label="月粗利" class="num numeric-strong">${it.margin_monthly}万</td>
      <td data-label="稼働形態">${escapeHtml(it.work_style || '-')}</td>
      <td data-label="勤務地">${escapeHtml(it.location || '-')}</td>
      <td data-label="必須スキル">${renderSkillTags(it.skills)}</td>
      <td data-label="アクション" class="action-cell">
        ${it.url ? `<a href="${escapeHtml(it.url)}" target="_blank" rel="noopener">案件 →</a>` : '-'}
        <button class="action-btn" data-project="${escapeHtml(projKey)}" data-name="${escapeHtml(it.name)}" title="提案書をAIエージェントが生成">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <span class="btn-label">提案書生成</span>
        </button>
      </td>
    </tr>`;
  }).join('');

  tbody.querySelectorAll('.action-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      generateProposal(btn);
    });
  });
}

// ========== AGENT API CALLS ==========

const LEAD_STATUS_LABELS = {
  candidate: { label: '候補', color: '#6b7589' },
  drafted: { label: '下書き済', color: '#06b6d4' },
  approached: { label: '送信済', color: '#3b82f6' },
  replied: { label: '返信あり', color: '#8b5cf6' },
  meeting: { label: '商談中', color: '#f59e0b' },
  won: { label: '成約', color: '#10b981' },
  lost: { label: '失注', color: '#6b7589' },
};

async function loadLeads() {
  try {
    const res = await fetch(`${AGENT_API}/api/leads`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error('not ok');
    const data = await res.json();
    renderLeads(data.leads || []);
  } catch (e) {
    document.getElementById('leads-tbody').innerHTML =
      '<tr><td colspan="8" class="empty">APIサーバーが起動していません。start_server.bat を実行してください</td></tr>';
  }
}

function renderLeads(leads) {
  // KPI集計
  const counts = { candidate: 0, drafted: 0, approached: 0, replied: 0, meeting: 0, won: 0 };
  leads.forEach(l => { if (counts[l.status] !== undefined) counts[l.status]++; });
  Object.entries(counts).forEach(([k, v]) => {
    const el = document.getElementById(`lead-kpi-${k}`);
    if (el) el.textContent = v;
  });

  const tbody = document.getElementById('leads-tbody');
  if (!leads.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty">リードなし。「新規リード獲得」ボタンから開始してください</td></tr>';
    return;
  }

  // 状態優先順位でソート（候補が先、成約・失注は後ろ）
  const order = ['candidate', 'drafted', 'approached', 'replied', 'meeting', 'won', 'lost'];
  leads.sort((a, b) => {
    const oa = order.indexOf(a.status), ob = order.indexOf(b.status);
    if (oa !== ob) return oa - ob;
    return (a.hp_score || 0) - (b.hp_score || 0);  // HPスコア低い順=改善余地大
  });

  tbody.innerHTML = leads.map(l => {
    const sInfo = LEAD_STATUS_LABELS[l.status] || LEAD_STATUS_LABELS.candidate;
    const statusOptions = order.map(s =>
      `<option value="${s}" ${s === l.status ? 'selected' : ''}>${LEAD_STATUS_LABELS[s]?.label || s}</option>`
    ).join('');
    return `
      <tr>
        <td data-label="状態">
          <select class="lead-status-select" data-company="${escapeHtml(l.company_name)}" style="color:${sInfo.color}; font-weight:600; background:transparent; border:1px solid ${sInfo.color}33; border-radius:6px; padding:4px 8px; font-size:12px;">
            ${statusOptions}
          </select>
        </td>
        <td data-label="企業名"><span class="cell-truncate" title="${escapeHtml(l.company_name)}">${escapeHtml(l.company_name)}</span></td>
        <td data-label="業種">${escapeHtml(l.industry || '-')}</td>
        <td data-label="所在地">${escapeHtml(l.location || '-')}</td>
        <td data-label="HPスコア" class="num numeric-strong" style="color:${l.hp_score < 50 ? '#ef4444' : l.hp_score < 65 ? '#f59e0b' : '#10b981'}">${l.hp_score ?? '-'}</td>
        <td data-label="メール"><span class="cell-truncate" title="${escapeHtml(l.email || '')}">${l.email ? `<a href="mailto:${escapeHtml(l.email)}">${escapeHtml(l.email)}</a>` : '-'}</span></td>
        <td data-label="HP">${l.homepage_url ? `<a href="${escapeHtml(l.homepage_url)}" target="_blank" rel="noopener">開く →</a>` : '-'}</td>
        <td data-label="アクション">${l.status === 'drafted' || l.status === 'candidate' ? '下書き確認' : '-'}</td>
      </tr>`;
  }).join('');

  // ステータス変更ハンドラ
  tbody.querySelectorAll('.lead-status-select').forEach(sel => {
    sel.addEventListener('change', async (e) => {
      const company = sel.dataset.company;
      const newStatus = sel.value;
      try {
        const res = await fetch(`${AGENT_API}/api/update-lead-status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ company_name: company, new_status: newStatus }),
        });
        const data = await res.json();
        showToast(data.ok ? `${company} を ${LEAD_STATUS_LABELS[newStatus]?.label}に変更` : `失敗: ${data.message}`, data.ok ? 'ok' : 'err');
        if (data.ok) loadLeads();
      } catch (err) {
        showToast(`エラー: ${err.message}`, 'err');
      }
    });
  });
}

async function runLeadAcquisition() {
  if (!AGENT_AVAILABLE) {
    showToast('APIサーバーが起動していません', 'warn');
    return;
  }
  const industry = document.getElementById('lead-industry').value;
  const location = document.getElementById('lead-location').value;
  if (!location.trim()) { showToast('地域を入力してください', 'warn'); return; }

  const btn = document.getElementById('run-lead-acquisition');
  btn.disabled = true;
  btn.classList.add('action-btn-loading');
  const label = btn.querySelector('.btn-label');
  const original = label.textContent;
  label.textContent = '実行中…';

  try {
    const res = await fetch(`${AGENT_API}/api/acquire-leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ industry, location, count: 5 }),
      signal: AbortSignal.timeout(300_000),
    });
    const data = await res.json();
    if (data.ok) {
      showToast(`${industry}×${location} のリード獲得完了`, 'ok');
      loadLeads();
    } else {
      showToast(`失敗: ${data.error || '不明'}`, 'err');
    }
  } catch (e) {
    showToast(`エラー: ${e.message}`, 'err');
  } finally {
    btn.disabled = false;
    btn.classList.remove('action-btn-loading');
    label.textContent = original;
  }
}

async function checkAgentHealth() {
  const dot = document.getElementById('agent-status-dot');
  const label = document.getElementById('agent-status-label');
  try {
    const res = await fetch(`${AGENT_API}/api/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) throw new Error('not ok');
    const data = await res.json();
    AGENT_AVAILABLE = true;
    if (data.has_api_key) {
      dot.className = 'status-dot status-ok';
      label.textContent = 'オンライン';
    } else {
      dot.className = 'status-dot status-warn';
      label.textContent = 'API key未設定';
      AGENT_AVAILABLE = false;
    }
  } catch (e) {
    AGENT_AVAILABLE = false;
    dot.className = 'status-dot status-err';
    label.textContent = 'オフライン';
  }
}

async function generateProposal(btn) {
  const project = btn.dataset.project;
  const projectName = btn.dataset.name;

  if (!AGENT_AVAILABLE) {
    showToast('エージェントサーバーが起動していません。start_server.bat を実行してください', 'warn');
    return;
  }

  btn.disabled = true;
  const labelEl = btn.querySelector('.btn-label');
  const originalLabel = labelEl.textContent;
  labelEl.textContent = '生成中…';
  btn.classList.add('action-btn-loading');

  try {
    const res = await fetch(`${AGENT_API}/api/generate-proposal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project, open_file: true }),
      signal: AbortSignal.timeout(180_000),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text}`);
    }

    const data = await res.json();
    if (data.ok) {
      const fileCount = data.files?.length || 0;
      showToast(`「${projectName.slice(0, 30)}」の提案書を生成完了（${fileCount}ファイル、Wordを自動オープン）`, 'ok');
    } else {
      showToast(`生成失敗: ${data.error || '不明なエラー'}`, 'err');
    }
  } catch (e) {
    if (e.name === 'AbortError' || e.name === 'TimeoutError') {
      showToast('タイムアウト（3分超過）。サーバーログを確認してください', 'err');
    } else {
      showToast(`エラー: ${e.message}`, 'err');
    }
  } finally {
    btn.disabled = false;
    btn.classList.remove('action-btn-loading');
    labelEl.textContent = originalLabel;
  }
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

function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); } catch (e) { console.error(e); }
  document.body.removeChild(ta);
}

let toastTimer = null;
function showToast(msg, kind = 'info') {
  let toast = document.getElementById('mt-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'mt-toast';
    document.body.appendChild(toast);
  }
  toast.className = `toast toast-${kind} toast-visible`;
  toast.textContent = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('toast-visible'), 4500);
}

// ========== INIT ==========

(async function init() {
  // Agent health check (fire-and-forget so dashboard renders even if API is down)
  checkAgentHealth();
  setInterval(checkAgentHealth, 30_000);

  // Lead acquisition trigger button
  const runBtn = document.getElementById('run-lead-acquisition');
  if (runBtn) runBtn.addEventListener('click', runLeadAcquisition);

  // Load CRM data
  loadLeads();
  setInterval(loadLeads, 60_000);

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
