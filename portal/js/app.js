/* NexaFreight Control Tower — ops-dark console (vanilla JS SPA).
   All data from the FastAPI backend; every number carries provenance. */
'use strict';

const API = '';
const TOKEN_KEY = 'nx_token', USER_KEY = 'nx_user';
const $ = (sel, el = document) => el.querySelector(sel);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtUsd = n => n == null ? '—' : '$' + Number(n).toLocaleString('en-US', {maximumFractionDigits: 0});
const fmtDate = s => s ? new Date(s).toLocaleDateString('en-GB', {day: '2-digit', month: 'short'}) : '—';

let token = localStorage.getItem(TOKEN_KEY);
let user = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
let view = 'dashboard';
let map = null, laneLayer = null, vesselLayer = null;
let shipState = { page: 1, mode: '', late: '', search: '', data: [], total: 0 };

/* ---------- API ---------- */
async function api(path, opts = {}) {
  const res = await fetch(API + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(token ? {Authorization: 'Bearer ' + token} : {}), ...(opts.headers || {})},
  });
  if (res.status === 401) { logout(); throw new Error('session expired'); }
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || res.statusText);
  return res.json();
}
function toast(msg, err = false) {
  const t = $('#toast'); t.textContent = msg; t.className = 'toast show' + (err ? ' err' : '');
  setTimeout(() => t.className = 'toast', 3600);
}

/* ---------- LOGIN ---------- */
function renderLogin() {
  $('#root').innerHTML = `
  <div class="login-wrap"><div class="login-bg"></div>
    <form class="login-card" id="loginForm">
      <div class="login-logo"><div class="mark">N</div><span>NexaFreight</span></div>
      <h1>Control Tower</h1>
      <div class="sub">Multi-Modal Logistics Intelligence</div>
      <div class="login-error" id="loginError"></div>
      <div class="field"><label>Work Email</label><input id="email" type="email" required placeholder="manager@nexafreight.com"></div>
      <div class="field"><label>Password</label><input id="password" type="password" required></div>
      <button class="btn-primary" id="loginBtn" type="submit">Sign In</button>
      <div class="login-note">Role-based access · Human-approved decisions · Full audit trail</div>
    </form>
    <div class="login-foot">v3.0 · <span class="mono">/api/health</span>: checking…</div>
  </div>`;
  fetch(API + '/api/health').then(r => r.json()).then(h => {
    $('.login-foot').innerHTML = `v3.0 · <span class="mono">/api/health</span>: ${esc(h.status)} · FEED_MODE ${esc(h.feed_mode)}`;
  }).catch(() => {});
  $('#loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = $('#loginBtn'); btn.disabled = true; btn.textContent = 'Signing in…';
    try {
      const r = await fetch(API + '/api/auth/login', {method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email: $('#email').value, password: $('#password').value})});
      if (!r.ok) throw new Error((await r.json()).detail || 'login failed');
      const d = await r.json();
      token = d.access_token; user = {name: d.name, role: d.role};
      localStorage.setItem(TOKEN_KEY, token); localStorage.setItem(USER_KEY, JSON.stringify(user));
      renderApp();
    } catch (err) {
      const box = $('#loginError'); box.style.display = 'block'; box.textContent = err.message;
      btn.disabled = false; btn.textContent = 'Sign In';
    }
  });
}
function logout() {
  token = null; user = null; localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY);
  renderLogin();
}

/* ---------- SHELL ---------- */
const NAV = [
  ['dashboard', '◫', 'Dashboard'], ['shipments', '⚓', 'Shipments'], ['alerts', '⚠', 'Alerts'],
  ['analytics', '▤', 'Analytics'], ['finance', '$', 'Finance'], ['esg', '♻', 'ESG'],
];
function renderApp() {
  $('#root').innerHTML = `
  <div class="shell">
    <aside class="sidebar">
      <div class="brand"><div class="mark">N</div><span>NexaFreight</span></div>
      <div class="nav-sec">Control Tower</div>
      ${NAV.map(([id, ic, label]) => `
        <div class="nav-item" data-view="${id}"><span class="ic">${ic}</span>${label}</div>`).join('')}
      <div class="user"><div class="name">${esc(user.name)}</div><div class="role">${esc(user.role)}</div>
        <button id="logoutBtn">Sign out</button></div>
    </aside>
    <header class="topbar"><h2 id="pageTitle">Dashboard</h2><span class="spacer"></span>
      <span class="chip" id="feedChip"><span class="dot"></span><span id="feedText">FEED …</span></span>
      <span class="chip mono" id="modeChip">—</span>
    </header>
    <main class="main" id="main"></main>
  </div>`;
  document.querySelectorAll('.nav-item').forEach(el => el.addEventListener('click', () => setView(el.dataset.view)));
  $('#logoutBtn').addEventListener('click', logout);
  api('/api/telemetry/live').then(t => {
    const c = $('#feedChip');
    c.className = 'chip ' + (t.feed.connected ? 'live' : 'mock');
    $('#feedText').textContent = t.feed.connected ? 'AIS: LIVE' : 'FEED: ' + t.feed.mode.toUpperCase();
    $('#modeChip').textContent = 'FEED_MODE=' + t.feed.mode;
  }).catch(() => {});
  setView(view);
}
function setView(v) {
  view = v;
  document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.view === v));
  $('#pageTitle').textContent = ({dashboard: 'Executive Control Tower', shipments: 'Shipments',
    alerts: 'Alert Inbox', analytics: 'Analytics', finance: 'Financial Exposure', esg: 'ESG & Carbon'})[v];
  map = null;
  ({dashboard: viewDashboard, shipments: viewShipments}[v] || viewPlaceholder)(v);
}
function viewPlaceholder(v) {
  const plan = {alerts: 'Phase 3 — rule engine + approve/reject/modify flow (Split-Pane Triage layout)',
    analytics: 'Phase 5 — lane performance, carrier scorecards, SPC charts',
    finance: 'Phase 4 — demurrage clocks, penalty exposure, breakeven curves',
    esg: 'Phase 5 — GLEC CO₂e per shipment, IMO CII, carbon budgets'}[v];
  $('#main').innerHTML = `<div class="placeholder"><b>${esc($('#pageTitle').textContent)}</b><br><br>
    Scheduled: ${esc(plan)}<br><br><span class="tag">NO PLACEHOLDER DATA — REAL FEATURES ONLY</span></div>`;
}

/* ---------- DASHBOARD ---------- */
async function viewDashboard() {
  $('#main').innerHTML = `
    <div class="kpis" id="kpis"></div>
    <div class="grid-2">
      <div class="map-card card"><div class="head"><h3>Live Corridor Map — India Lanes</h3><span class="tag" id="mapTag">…</span></div>
        <div style="position:relative"><div id="map"></div>
        <div class="legend"><i style="background:#3B82F6"></i>ocean lane&nbsp;&nbsp;<i style="border-top:2px dashed #8B5CF6;background:none"></i>air (great-circle)&nbsp;&nbsp;<i style="background:#60a5fa;border-radius:50%;height:6px;width:6px"></i>vessel (REAL:AIS)</div></div>
      </div>
      <div>
        <div class="card panel"><div class="head"><h3>Port Congestion</h3><span class="tag">PHASE 2 · DERIVED</span></div>
          <div id="congestion"><div class="list-row">Live AIS anchorage analytics arrive with FEED_MODE=live.</div></div></div>
        <div class="card panel" style="margin-top:12px"><div class="head"><h3>Disruption Library</h3><span class="tag">217 REAL records</span></div>
          <div class="feed" id="disruptions">loading…</div></div>
      </div>
    </div>`;
  api('/api/kpis').then(k => {
    $('#kpis').innerHTML = [
      ['Active Shipments', k.shipments.count.toLocaleString(), 'mode mix: ' + Object.entries(k.shipments.mode_mix).map(([m, n]) => `${m} ${n.toLocaleString()}`).join(' · '), 'REAL:DataCo'],
      ['On-Time', k.shipments.on_time_pct == null ? '—' : k.shipments.on_time_pct + '%', 'historical (2015–17)', 'REAL:DataCo'],
      ['Late', k.shipments.late_pct == null ? '—' : k.shipments.late_pct + '%', k.orders.loss_making_lines.toLocaleString() + ' loss-making lines (' + k.orders.loss_making_pct + '%)', 'REAL:DataCo'],
      ['Shipment Value', fmtUsd(k.shipments.total_value_usd), k.master_data.customers.toLocaleString() + ' customers · ' + k.master_data.skus + ' SKUs', 'REAL:DataCo'],
      ['Calibration', k.calibration.calibrated_params + ' params', k.calibration.dwell_priors + ' UNCTAD priors · ' + k.calibration.disruption_records + ' disruption records', 'REAL sources'],
    ].map(([l, v, s, tag]) => `<div class="card kpi"><div class="label">${l}</div><div class="value">${v}</div>
      <div class="sub">${s}</div><div style="margin-top:6px"><span class="tag">${tag}</span></div></div>`).join('');
  }).catch(e => toast('KPIs failed: ' + e.message, true));
  renderMap();
}
function renderMap() {
  map = L.map('map', {zoomControl: true, attributionControl: false}).setView([15, 62], 3);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {maxZoom: 10}).addTo(map);
  laneLayer = L.layerGroup().addTo(map); vesselLayer = L.layerGroup().addTo(map);
  api('/api/lanes').then(d => {
    $('#mapTag').textContent = d.total + ' lanes · DERIVED geometry';
    d.data.forEach(l => {
      const coords = (l.geojson.geometry ? l.geojson.geometry.coordinates : []).map(c => [c[1], c[0]]);
      if (!coords.length) return;
      const color = l.mode === 'OCEAN' ? '#3B82F6' : '#8B5CF6';
      L.polyline(coords, {color, weight: l.mode === 'OCEAN' ? 2 : 1.5, opacity: .75,
        dashArray: l.mode === 'AIR' ? '5 6' : null})
        .bindPopup(`<b>${esc(l.origin)} → ${esc(l.destination)}</b><br>${esc(l.mode)} · ${l.distance_km.toLocaleString()} km<br>
          <span style="opacity:.7">${esc(l.source)}</span>`).addTo(laneLayer);
    });
  }).catch(e => toast('Lanes failed: ' + e.message, true));
  api('/api/telemetry/live').then(t => {
    t.vessels.slice(0, 300).forEach(v => {
      L.circleMarker([v.lat, v.lon], {radius: 4, color: '#60a5fa', fillOpacity: .9})
        .bindPopup(`<b>${esc(v.name || 'MMSI ' + v.mmsi)}</b> · <span class="mono">REAL:AIS</span><br>
          ${v.speed_kn != null ? v.speed_kn.toFixed(1) + ' kn' : ''} ${v.destination ? '→ ' + esc(v.destination) : ''}`)
        .addTo(vesselLayer);
    });
  }).catch(() => {});
}

/* ---------- SHIPMENTS ---------- */
async function viewShipments() {
  $('#main').innerHTML = `
    <div class="toolbar">
      <select id="fMode"><option value="">All Modes</option><option>Ocean</option><option>Air</option><option>Road</option></select>
      <select id="fLate"><option value="">All Status</option><option value="true">Late only</option><option value="false">On-time only</option></select>
      <input id="fSearch" placeholder="Ref, city, country…">
      <span class="count" id="count"></span>
    </div>
    <div class="card" style="padding:0; overflow:auto">
      <table class="data"><thead><tr>
        <th>Ref</th><th>Mode</th><th>Destination</th><th>Value USD</th><th>SLA Due</th><th>Delivered</th><th>Status</th><th></th>
      </tr></thead><tbody id="tbody"></tbody></table>
    </div>
    <div class="pager"><button id="prev">‹ Prev</button><span id="pageInfo"></span><button id="next">Next ›</button></div>
    <div id="drawerMount"></div>`;
  $('#fMode').addEventListener('change', e => { shipState.mode = e.target.value; shipState.page = 1; loadShipments(); });
  $('#fLate').addEventListener('change', e => { shipState.late = e.target.value; shipState.page = 1; loadShipments(); });
  let deb; $('#fSearch').addEventListener('input', e => { clearTimeout(deb); deb = setTimeout(() => {
    shipState.search = e.target.value; shipState.page = 1; loadShipments(); }, 350); });
  $('#prev').addEventListener('click', () => { if (shipState.page > 1) { shipState.page--; loadShipments(); } });
  $('#next').addEventListener('click', () => {
    if (shipState.page * 25 < shipState.total) { shipState.page++; loadShipments(); } });
  loadShipments();
}
async function loadShipments() {
  const q = new URLSearchParams({page: shipState.page, limit: 25});
  if (shipState.mode) q.set('mode', shipState.mode);
  if (shipState.late) q.set('late', shipState.late);
  if (shipState.search) q.set('search', shipState.search);
  try {
    const d = await api('/api/shipments?' + q);
    shipState.total = d.total; shipState.data = d.data;
    $('#count').textContent = d.total.toLocaleString() + ' shipments · ' + d.provenance;
    $('#tbody').innerHTML = d.data.map(s => `
      <tr data-ref="${esc(s.ref)}"><td class="mono">${esc(s.ref)}</td>
        <td><span class="mchip ${s.freight_mode}">${s.freight_mode}</span></td>
        <td>${esc(s.dest_city || '')}${s.dest_country ? ', ' + esc(s.dest_country) : ''}</td>
        <td>${fmtUsd(s.value_usd)}</td><td>${fmtDate(s.sla_due_at)}</td><td>${fmtDate(s.actual_delivery)}</td>
        <td><span class="schip ${s.was_late ? 'late' : 'ontime'}">${s.was_late ? 'LATE' : 'ON TIME'}</span></td>
        <td><span class="tag">REAL</span></td></tr>`).join('');
    document.querySelectorAll('#tbody tr').forEach(tr => tr.addEventListener('click', () => openDrawer(tr.dataset.ref)));
    $('#pageInfo').textContent = 'Page ' + shipState.page + ' · showing ' + d.data.length + ' of ' + d.total.toLocaleString();
    $('#prev').disabled = shipState.page <= 1;
    $('#next').disabled = shipState.page * 25 >= d.total;
  } catch (e) { toast('Shipments failed: ' + e.message, true); }
}
async function openDrawer(ref) {
  document.querySelectorAll('#tbody tr').forEach(tr => tr.classList.toggle('sel', tr.dataset.ref === ref));
  try {
    const s = await api('/api/shipments/' + encodeURIComponent(ref));
    $('#drawerMount').innerHTML = `
      <div class="drawer-veil" id="veil"></div>
      <div class="drawer"><button class="close" id="drawerClose">✕</button>
        <h3 class="mono">${esc(s.ref)}</h3>
        <div class="sub2"><span class="mchip ${s.freight_mode}">${s.freight_mode}</span> ·
          provenance <span class="tag">${esc(s.provenance)}</span></div>
        <div class="facts">
          <div class="f"><div class="k">Value</div><div class="v">${fmtUsd(s.value_usd)}</div></div>
          <div class="f"><div class="k">Status</div><div class="v"><span class="schip ${s.was_late ? 'late' : 'ontime'}">${s.was_late ? 'LATE' : 'ON TIME'}</span></div></div>
          <div class="f"><div class="k">SLA Due</div><div class="v">${fmtDate(s.sla_due_at)}</div></div>
          <div class="f"><div class="k">Delivered</div><div class="v">${fmtDate(s.actual_delivery)}</div></div>
        </div>
        <h4>Milestones</h4>
        <div class="tl">${s.timeline.map(e => `
          <div class="ev ${e.event === 'DELIVERED' ? (s.was_late ? 'bad' : 'done') : 'done'}">
            <div class="t">${esc(e.event)}</div><div class="d">${esc((e.ts || '').replace('T', ' ').slice(0, 16))} · ${esc(e.provenance)}</div>
          </div>`).join('')}</div>
        <h4>Cargo Lines (${s.lines.length})</h4>
        ${s.lines.map(l => `<div class="line-item"><span class="sku">${esc(l.sku)}</span>
          <span>${l.qty} × ${fmtUsd(l.unit_price)} = <b>${fmtUsd(l.line_value)}</b></span></div>`).join('')}
        <h4>Legs</h4>
        ${s.legs.map(l => `<div class="line-item"><span class="sku">LEG ${l.seq} · ${esc(l.mode)}</span>
          <span>${esc(l.origin)} → ${esc(l.destination || '—')}</span></div>`).join('')}
      </div>`;
    const close = () => { $('#drawerMount').innerHTML = ''; document.querySelectorAll('#tbody tr').forEach(tr => tr.classList.remove('sel')); };
    $('#veil').addEventListener('click', close);
    $('#drawerClose').addEventListener('click', close);
  } catch (e) { toast('Detail failed: ' + e.message, true); }
}

/* ---------- BOOT ---------- */
token ? renderApp() : renderLogin();
