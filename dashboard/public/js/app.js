// dashboard/public/js/app.js
// =============================================
//   PLAYWRIGHT DASHBOARD — APP LOGIC
// =============================================

let allTests = [];
let activeFilter = 'all';
let searchQuery = '';

// ── Theme ──────────────────────────────────
function toggleTheme() {
  const html = document.documentElement;
  const current = html.dataset.theme;
  if (current === 'auto') {
    html.dataset.theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'light' : 'dark';
  } else {
    html.dataset.theme = current === 'dark' ? 'light' : 'dark';
  }
  localStorage.setItem('pw-theme', html.dataset.theme);
}

(function initTheme() {
  const saved = localStorage.getItem('pw-theme');
  if (saved) document.documentElement.dataset.theme = saved;
})();

// ── Utilities ──────────────────────────────
function fmtDuration(ms) {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60000);
  const s = Math.round((ms % 60000) / 1000);
  return `${m}m ${s}s`;
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

function statusPill(status) {
  return `<span class="status-pill ${status}">${status}</span>`;
}

// ── Donut Chart ────────────────────────────
function drawDonut(ctx, data, colors) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  const cx = W / 2, cy = H / 2, r = Math.min(W, H) / 2 - 20, inner = r * 0.6;
  ctx.clearRect(0, 0, W, H);
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) {
    ctx.fillStyle = 'rgba(128,128,128,0.2)';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, inner, 0, Math.PI * 2);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--card-bg').trim() || '#13161b';
    ctx.fill();
    return;
  }
  let start = -Math.PI / 2;
  data.forEach(({ value }, i) => {
    const slice = (value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, start + slice);
    ctx.closePath();
    ctx.fillStyle = colors[i];
    ctx.fill();
    start += slice;
  });
  // Inner cutout
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--card-bg').trim() || '#13161b';
  ctx.beginPath(); ctx.arc(cx, cy, inner, 0, Math.PI * 2);
  ctx.fillStyle = bg; ctx.fill();
  // Center text
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text').trim();
  ctx.font = `bold 24px "Space Mono", monospace`;
  ctx.fillText(total, cx, cy - 8);
  ctx.font = `10px "DM Sans", sans-serif`;
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text2').trim();
  ctx.fillText('tests', cx, cy + 14);
}

// ── History Bar Chart ──────────────────────
function drawHistory(ctx, history) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  ctx.clearRect(0, 0, W, H);
  if (!history || !history.length) {
    ctx.fillStyle = 'rgba(128,128,128,0.15)';
    ctx.fillRect(20, 20, W - 40, H - 40);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text3').trim();
    ctx.font = '12px DM Sans'; ctx.textAlign = 'center';
    ctx.fillText('No run history yet', W / 2, H / 2);
    return;
  }
  const runs = [...history].reverse().slice(-20);
  const barW = (W - 60) / runs.length - 4;
  const maxTotal = Math.max(...runs.map(r => r.total), 1);
  const passColor = getComputedStyle(document.documentElement).getPropertyValue('--pass').trim();
  const failColor = getComputedStyle(document.documentElement).getPropertyValue('--fail').trim();
  const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text3').trim();

  runs.forEach((run, i) => {
    const x = 40 + i * (barW + 4);
    const totalH = ((run.total / maxTotal) * (H - 60));
    const passH = ((run.passed / maxTotal) * (H - 60));
    const failH = ((run.failed / maxTotal) * (H - 60));
    const yBase = H - 30;

    // Pass bar
    ctx.fillStyle = passColor + '99';
    ctx.fillRect(x, yBase - passH, barW, passH);

    // Fail bar
    ctx.fillStyle = failColor + '99';
    ctx.fillRect(x, yBase - passH - failH, barW, failH);

    // Label
    ctx.fillStyle = textColor;
    ctx.font = '9px Space Mono'; ctx.textAlign = 'center';
    ctx.fillText(new Date(run.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }), x + barW / 2, H - 12);
  });

  // Y-axis label
  ctx.fillStyle = textColor; ctx.font = '9px Space Mono'; ctx.textAlign = 'right';
  ctx.fillText(maxTotal, 36, 20);
  ctx.fillText('0', 36, H - 30);
}

// ── Table Rendering ─────────────────────────
function renderTable() {
  const tbody = document.getElementById('testTableBody');
  let filtered = allTests;

  if (activeFilter !== 'all') {
    filtered = filtered.filter(t => t.status === activeFilter);
  }
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(t =>
      t.title.toLowerCase().includes(q) ||
      t.fullTitle.toLowerCase().includes(q) ||
      (t.file || '').toLowerCase().includes(q)
    );
  }

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-row">No tests match this filter.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(t => {
    const artifacts = [
      ...(t.screenshots || []).map(s => `<a class="artifact-link" href="${s}" target="_blank">📸 Screenshot</a>`),
      ...(t.videos || []).map(v => `<a class="artifact-link" href="${v}" target="_blank">🎬 Video</a>`),
      ...(t.traces || []).map(tr => `<a class="artifact-link" href="${tr}" target="_blank">🔍 Trace</a>`)
    ].join('') || '<span style="color:var(--text3);font-size:11px">—</span>';

    const hasLogs = (t.logs && t.logs.length) || (t.errors && t.errors.length);
    const logBtn = hasLogs
      ? `<button class="log-btn" onclick='openModal(${JSON.stringify(t.title)}, ${JSON.stringify(t.logs || [])}, ${JSON.stringify(t.errors || [])})'>View Logs</button>`
      : '<span style="color:var(--text3);font-size:11px">—</span>';

    return `<tr>
      <td>${statusPill(t.status)}</td>
      <td>
        <div class="test-name">${escHtml(t.title)}</div>
        <div class="test-file">${escHtml(t.file || '')}</div>
      </td>
      <td><span style="font-family:'Space Mono',monospace;font-size:11px;color:var(--text2)">${escHtml(t.browser || '—')}</span></td>
      <td><span class="duration-val">${fmtDuration(t.duration)}</span></td>
      <td>${t.retries > 0 ? `<span class="retry-badge">×${t.retries}</span>` : '<span style="color:var(--text3)">—</span>'}</td>
      <td><div class="artifact-links">${artifacts}</div></td>
      <td>${logBtn}</td>
    </tr>`;
  }).join('');
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Filters ─────────────────────────────────
function filterTests(filter, btn) {
  activeFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderTable();
}

function searchTests(q) {
  searchQuery = q;
  renderTable();
}

// ── Modal ────────────────────────────────────
function openModal(title, logs, errors) {
  document.getElementById('modalTitle').textContent = `Logs — ${title}`;
  const content = [
    errors.length ? '── ERRORS ──\n' + errors.join('\n\n') : '',
    logs.length ? '── LOGS ──\n' + logs.join('\n') : ''
  ].filter(Boolean).join('\n\n') || 'No logs available.';
  document.getElementById('modalBody').textContent = content;
  document.getElementById('logModal').classList.add('open');
}

function closeModal() {
  document.getElementById('logModal').classList.remove('open');
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ── Main Load ────────────────────────────────
async function loadData() {
  let data;
  try {
    const res = await fetch('dashboard-data.json?t=' + Date.now());
    data = await res.json();
  } catch {
    // Use demo data if no real data exists yet
    data = {
      runId: 'demo-run',
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      duration: 0,
      status: 'passed',
      summary: { total: 0, passed: 0, failed: 0, skipped: 0, timedOut: 0, passRate: 0 },
      tests: [],
      history: []
    };
  }

  // Header
  const statusEl = document.getElementById('runStatus');
  statusEl.textContent = data.status;
  statusEl.className = `run-badge ${data.status}`;
  document.getElementById('runId').textContent = data.runId;

  // Cards
  const s = data.summary;
  document.getElementById('totalTests').textContent = s.total;
  document.getElementById('passedTests').textContent = s.passed;
  document.getElementById('failedTests').textContent = s.failed;
  document.getElementById('skippedTests').textContent = s.skipped;
  document.getElementById('passRate').textContent = `${s.passRate}%`;
  document.getElementById('duration').textContent = fmtDuration(data.duration);

  // Rate bar animation
  setTimeout(() => {
    document.getElementById('rateBar').style.width = s.passRate + '%';
  }, 300);

  // Footer
  document.getElementById('footerTime').textContent = fmtDate(data.startTime);

  // Charts
  const colors = [
    getComputedStyle(document.documentElement).getPropertyValue('--pass').trim(),
    getComputedStyle(document.documentElement).getPropertyValue('--fail').trim(),
    getComputedStyle(document.documentElement).getPropertyValue('--skip').trim(),
    getComputedStyle(document.documentElement).getPropertyValue('--timeout').trim(),
  ];

  const donutData = [
    { label: 'Passed', value: s.passed },
    { label: 'Failed', value: s.failed },
    { label: 'Skipped', value: s.skipped },
    { label: 'Timed Out', value: s.timedOut || 0 },
  ];

  const donutCtx = document.getElementById('donutChart').getContext('2d');
  drawDonut(donutCtx, donutData, colors);

  const legend = document.getElementById('donutLegend');
  legend.innerHTML = donutData.map((d, i) =>
    `<div class="legend-item"><div class="legend-dot" style="background:${colors[i]}"></div>${d.label}: <b>${d.value}</b></div>`
  ).join('');

  const histCtx = document.getElementById('historyChart').getContext('2d');
  drawHistory(histCtx, data.history || []);

  // Table
  allTests = data.tests || [];
  renderTable();
}

// Redraw charts on theme change
const observer = new MutationObserver(() => loadData());
observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

loadData();
