/* NexaFreight Control Tower — ops-dark console (vanilla JS SPA).
   All data from the FastAPI backend; every number carries provenance.
   Written in ES2017-safe syntax (no ?? / ?.) so CI validates it with esprima. */
'use strict';

var API = '';
var TOKEN_KEY = 'nx_token', USER_KEY = 'nx_user';
function $(sel, el) { return (el || document).querySelector(sel); }
function esc(s) { return String(s === null || s === undefined ? '' : s)
  .replace(/[&<>"']/g, function (c) {
    return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]; }); }
function fmtUsd(n) {
  if (n === null || n === undefined) { return '—'; }
  return '$' + Number(n).toLocaleString('en-US', {maximumFractionDigits: 0}); }
function fmtDate(s) {
  if (!s) { return '—'; }
  return new Date(s).toLocaleDateString('en-GB', {day: '2-digit', month: 'short'}); }

var token = localStorage.getItem(TOKEN_KEY);
var user = null;
try { user = JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch (e) { user = null; }
var view = 'dashboard';
var map = null, laneLayer = null, vesselLayer = null;
var shipState = { page: 1, mode: '', late: '', search: '', data: [], total: 0 };
var alertSel = null;

/* ---------- API ---------- */
function api(path, opts) {
  opts = opts || {};
  var headers = {'Content-Type': 'application/json'};
  if (token) { headers['Authorization'] = 'Bearer ' + token; }
  if (opts.headers) { for (var k in opts.headers) { headers[k] = opts.headers[k]; } }
  return fetch(API + path, {method: opts.method || 'GET', headers: headers, body: opts.body})
    .then(function (res) {
      if (res.status === 401) { logout(); throw new Error('session expired'); }
      if (!res.ok) {
        return res.json().catch(function () { return {}; }).then(function (d) {
          throw new Error(d.detail || res.statusText); });
      }
      return res.json();
    });
}
function toast(msg, err) {
  var t = $('#toast');
  t.textContent = msg;
  t.className = 'toast show' + (err ? ' err' : '');
  setTimeout(function () { t.className = 'toast'; }, 3600);
}

function chartDefaults() {
  if (window.Chart) {
    Chart.defaults.color = '#8B98AB';
    Chart.defaults.borderColor = '#1E2A3D';
    Chart.defaults.font.family = 'Inter, sans-serif';
  }
}
function lineChart(id, labels, datasets, opts) {
  var el = document.getElementById(id);
  if (!el || !window.Chart) { return; }
  return new Chart(el.getContext('2d'), Object.assign({
    type: 'line',
    data: {labels: labels, datasets: datasets},
    options: Object.assign({responsive: true, maintainAspectRatio: false,
      plugins: {legend: {labels: {boxWidth: 10}}}}, opts || {})}, {}));
}

/* ---------- LOGIN ---------- */
function renderLogin() {
  $('#root').innerHTML =
    '<div class="login-wrap"><div class="login-bg"></div>' +
    '<form class="login-card" id="loginForm">' +
    '<div class="login-logo"><div class="mark">N</div><span>NexaFreight</span></div>' +
    '<h1>Control Tower</h1>' +
    '<div class="sub">Multi-Modal Logistics Intelligence</div>' +
    '<div class="login-error" id="loginError"></div>' +
    '<div class="field"><label>Work Email</label><input id="email" type="email" required placeholder="manager@nexafreight.com"></div>' +
    '<div class="field"><label>Password</label><input id="password" type="password" required></div>' +
    '<button class="btn-primary" id="loginBtn" type="submit">Sign In</button>' +
    '<div class="login-note">Role-based access · Human-approved decisions · Full audit trail</div>' +
    '</form>' +
    '<div class="login-foot">v3.0 · <span class="mono">/api/health</span>: checking…</div></div>';
  fetch(API + '/api/health').then(function (r) { return r.json(); }).then(function (h) {
    $('.login-foot').innerHTML = 'v3.0 · <span class="mono">/api/health</span>: ' + esc(h.status) +
      ' · FEED_MODE ' + esc(h.feed_mode);
  }).catch(function () {});
  $('#loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = $('#loginBtn');
    btn.disabled = true; btn.textContent = 'Signing in…';
    fetch(API + '/api/auth/login', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({email: $('#email').value, password: $('#password').value})
    }).then(function (r) {
      if (!r.ok) {
        return r.json().then(function (d) { throw new Error(d.detail || 'login failed'); });
      }
      return r.json();
    }).then(function (d) {
      token = d.access_token;
      user = {name: d.name, role: d.role};
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      renderApp();
    }).catch(function (err) {
      var box = $('#loginError');
      box.style.display = 'block';
      box.textContent = err.message;
      btn.disabled = false; btn.textContent = 'Sign In';
    });
  });
}
function logout() {
  token = null; user = null;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  renderLogin();
}

/* ---------- SHELL ---------- */
var NAV = [
  ['dashboard', '◫', 'Dashboard'], ['shipments', '⚓', 'Shipments'], ['alerts', '⚠', 'Alerts'],
  ['analytics', '▤', 'Analytics'], ['finance', '$', 'Finance'], ['esg', '♻', 'ESG']
];
function renderApp() {
  var navHtml = '';
  NAV.forEach(function (item) {
    navHtml += '<div class="nav-item" data-view="' + item[0] + '"><span class="ic">' + item[1] +
      '</span>' + item[2] + '</div>';
  });
  $('#root').innerHTML =
    '<div class="shell"><aside class="sidebar">' +
    '<div class="brand"><div class="mark">N</div><span>NexaFreight</span></div>' +
    '<div class="nav-sec">Control Tower</div>' + navHtml +
    '<div class="user"><div class="name">' + esc(user && user.name) + '</div>' +
    '<div class="role">' + esc(user && user.role) + '</div>' +
    '<button id="logoutBtn">Sign out</button></div></aside>' +
    '<header class="topbar"><h2 id="pageTitle">Dashboard</h2><span class="spacer"></span>' +
    '<span class="chip" id="feedChip"><span class="dot"></span><span id="feedText">FEED …</span></span>' +
    '<span class="chip mono" id="modeChip">—</span></header>' +
    '<main class="main" id="main"></main></div>';
  document.querySelectorAll('.nav-item').forEach(function (el) {
    el.addEventListener('click', function () { setView(el.dataset.view); });
  });
  $('#logoutBtn').addEventListener('click', logout);
  api('/api/alerts?status=PENDING_APPROVAL').then(function (a) {
    var b = document.querySelector('[data-view="alerts"]');
    if (b && a.total) {
      b.insertAdjacentHTML('beforeend', '<span class="nav-badge">' + a.total + '</span>');
    }
  }).catch(function () {});
  api('/api/telemetry/live').then(function (t) {
    var c = $('#feedChip');
    c.className = 'chip ' + (t.feed.connected ? 'live' : 'mock');
    $('#feedText').textContent = t.feed.connected ? 'AIS: LIVE' : 'FEED: ' + t.feed.mode.toUpperCase();
    $('#modeChip').textContent = 'FEED_MODE=' + t.feed.mode;
  }).catch(function () {});
  setView(view);
}
function setView(v) {
  view = v;
  document.querySelectorAll('.nav-item').forEach(function (el) {
    el.classList.toggle('active', el.dataset.view === v);
  });
  var titles = {dashboard: 'Executive Control Tower', shipments: 'Shipments', alerts: 'Alert Inbox',
    analytics: 'Analytics', finance: 'Financial Exposure', esg: 'ESG & Carbon'};
  $('#pageTitle').textContent = titles[v];
  map = null;
  var fn = {dashboard: viewDashboard, shipments: viewShipments, alerts: viewAlerts,
             finance: viewFinance, analytics: viewAnalytics, esg: viewESG}[v];
  if (fn) { fn(v); } else { viewPlaceholder(v); }
}
function viewPlaceholder(v) {
  var plan = {
    alerts: 'Phase 3 — rule engine + approve/reject/modify flow (Split-Pane Triage layout)',
    analytics: 'Phase 5 — lane performance, carrier scorecards, SPC charts',
    finance: 'Phase 4 — demurrage clocks, penalty exposure, breakeven curves',
    esg: 'Phase 5 — GLEC CO₂e per shipment, IMO CII, carbon budgets'}[v];
  $('#main').innerHTML = '<div class="placeholder"><b>' + esc($('#pageTitle').textContent) +
    '</b><br><br>Scheduled: ' + esc(plan) +
    '<br><br><span class="tag">NO PLACEHOLDER DATA — REAL FEATURES ONLY</span></div>';
}

/* ---------- DASHBOARD ---------- */
function viewDashboard() {
  $('#main').innerHTML =
    '<div class="kpis" id="kpis"></div>' +
    '<div class="grid-2">' +
    '<div class="map-card card"><div class="head"><h3>Live Corridor Map — India Lanes</h3>' +
    '<span class="tag" id="mapTag">…</span></div>' +
    '<div style="position:relative"><div id="map"></div>' +
    '<div class="legend"><i style="background:#3B82F6"></i>ocean lane&nbsp;&nbsp;' +
    '<i style="border-top:2px dashed #8B5CF6;background:none"></i>air (great-circle)&nbsp;&nbsp;' +
    '<i style="background:#60a5fa;border-radius:50%;height:6px;width:6px"></i>vessel (REAL:AIS)</div></div></div>' +
    '<div><div class="card panel"><div class="head"><h3>Port Congestion</h3>' +
    '<span class="tag">DERIVED:AIS</span></div><div id="congestion">' +
    '<div class="list-row">Live AIS anchorage analytics arrive with FEED_MODE=live.</div></div></div>' +
    '<div class="card panel" style="margin-top:12px"><div class="head"><h3>Disruption Library</h3>' +
    '<span class="tag">REAL records</span></div><div class="feed" id="disruptions">loading…</div></div></div></div>';
  api('/api/alerts/dashboard').then(function (D) {
    var k = D.kpis;
    renderDisruptions(D.disruptions);
    renderCongestion(D.congestion);
    var rows = [
      ['Active Shipments', k.shipments.count.toLocaleString(),
        'mode mix: ' + Object.entries(k.shipments.mode_mix).map(function (e) {
          return e[0] + ' ' + e[1].toLocaleString(); }).join(' · '), 'REAL:DataCo'],
      ['On-Time', k.shipments.on_time_pct === null ? '—' : k.shipments.on_time_pct + '%',
        'historical (2015–17)', 'REAL:DataCo'],
      ['Late', k.shipments.late_pct === null ? '—' : k.shipments.late_pct + '%',
        k.orders.loss_making_lines.toLocaleString() + ' loss-making lines (' + k.orders.loss_making_pct + '%)',
        'REAL:DataCo'],
      ['Shipment Value', fmtUsd(k.shipments.total_value_usd),
        k.master_data.customers.toLocaleString() + ' customers · ' + k.master_data.skus + ' SKUs',
        'REAL:DataCo'],
      ['Calibration', k.calibration.calibrated_params + ' params',
        k.calibration.dwell_priors + ' UNCTAD priors · ' + k.calibration.disruption_records +
        ' disruption records', 'REAL sources']
    ];
    $('#kpis').innerHTML = rows.map(function (r) {
      return '<div class="card kpi"><div class="label">' + r[0] + '</div><div class="value">' + r[1] +
        '</div><div class="sub">' + r[2] + '</div><div style="margin-top:6px"><span class="tag">' +
        r[3] + '</span></div></div>';
    }).join('');
  }).catch(function (e) { toast('KPIs failed: ' + e.message, true); });
  renderMap();
  renderDisruptions(null);
  renderCongestion(null);
}

function renderDisruptions(d) {
  if (!d) { return; }
  $('#disruptions').innerHTML = d.data.slice(0, 8).map(function (r) {
    return '<div class="list-row"><span class="sev ' + (r.severity >= 3 ? 'crit' : 'warn') + '">' +
      r.total_affected_days + 'd</span><div><div>' + esc(r.event) + ' — ' + esc(r.port) +
      '</div><div style="color:var(--text-micro);font-size:11px">' + esc(r.country || '') + ' ' +
      (r.year || '') + ' · severity class ' + r.severity + '</div></div></div>';
  }).join('') + '<div style="font-size:10px;color:var(--text-micro);margin-top:8px">' +
    d.total_records + ' REAL records · Verschuur et al. (TR-D)</div>';
}
function renderCongestion(d) {
  if (!d || !d.data.length) { return; }
  var max = Math.max.apply(null, d.data.map(function (p) { return p.index; }).concat([1]));
  $('#congestion').innerHTML = d.data.map(function (p) {
    return '<div class="bar-row"><span>' + esc(p.port) + '</span><div class="bar"><i style="width:' +
      Math.round(100 * p.index / max) + '%"></i></div><span>' + p.vessels_anchored + '</span></div>';
  }).join('') + '<div style="font-size:10px;color:var(--text-micro)">' +
    (d.note || 'vessels at anchor (DERIVED:AIS)') + ' · live when FEED_MODE=live</div>';
}
function renderMap() {
  map = L.map('map', {zoomControl: true, attributionControl: false}).setView([15, 62], 3);
  L.tileLayer('https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {maxZoom: 10}).addTo(map);
  L.tileLayer('https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {maxZoom: 10}).addTo(map);
  laneLayer = L.layerGroup().addTo(map);
  vesselLayer = L.layerGroup().addTo(map);
  api('/api/lanes').then(function (d) {
    $('#mapTag').textContent = d.total + ' lanes · DERIVED geometry';
    d.data.forEach(function (l) {
      var gj = l.geojson || {};
      var raw = gj.geometry ? gj.geometry.coordinates : (gj.coordinates || []);
      var coords = raw.map(function (c) { return [c[1], c[0]]; });
      if (!coords.length) { return; }
      var color = l.mode === 'OCEAN' ? '#3B82F6' : '#8B5CF6';
      L.polyline(coords, {color: color, weight: l.mode === 'OCEAN' ? 2 : 1.5, opacity: 0.75,
        dashArray: l.mode === 'AIR' ? '5 6' : null})
        .bindPopup('<b>' + esc(l.origin) + ' → ' + esc(l.destination) + '</b><br>' + esc(l.mode) +
          ' · ' + l.distance_km.toLocaleString() + ' km<br><span style="opacity:.7">' +
          esc(l.source) + '</span>').addTo(laneLayer);
    });
  }).catch(function (e) { toast('Lanes failed: ' + e.message, true); });
  api('/api/telemetry/live').then(function (t) {
    t.vessels.slice(0, 300).forEach(function (v) {
      L.circleMarker([v.lat, v.lon], {radius: 4, color: '#60a5fa', fillOpacity: 0.9})
        .bindPopup('<b>' + esc(v.name || 'MMSI ' + v.mmsi) + '</b> · <span class="mono">REAL:AIS</span><br>' +
          (v.speed_kn !== null && v.speed_kn !== undefined ? v.speed_kn.toFixed(1) + ' kn' : '') + ' ' +
          (v.destination ? '→ ' + esc(v.destination) : '')).addTo(vesselLayer);
    });
  }).catch(function () {});
}

/* ---------- SHIPMENTS ---------- */
function viewShipments() {
  $('#main').innerHTML =
    '<div class="toolbar">' +
    '<select id="fMode"><option value="">All Modes</option><option>Ocean</option><option>Air</option><option>Road</option></select>' +
    '<select id="fLate"><option value="">All Status</option><option value="true">Late only</option><option value="false">On-time only</option></select>' +
    '<input id="fSearch" placeholder="Ref, city, country…">' +
    '<span class="count" id="count"></span></div>' +
    '<div class="card" style="padding:0; overflow:auto"><table class="data"><thead><tr>' +
    '<th>Ref</th><th>Mode</th><th>Destination</th><th>Value USD</th><th>SLA Due</th><th>Delivered</th>' +
    '<th>Status</th><th></th></tr></thead><tbody id="tbody"></tbody></table></div>' +
    '<div class="pager"><button id="prev">‹ Prev</button><span id="pageInfo"></span>' +
    '<button id="next">Next ›</button></div><div id="drawerMount"></div>';
  $('#fMode').addEventListener('change', function (e) {
    shipState.mode = e.target.value; shipState.page = 1; loadShipments(); });
  $('#fLate').addEventListener('change', function (e) {
    shipState.late = e.target.value; shipState.page = 1; loadShipments(); });
  var deb;
  $('#fSearch').addEventListener('input', function (e) {
    clearTimeout(deb);
    var val = e.target.value;
    deb = setTimeout(function () { shipState.search = val; shipState.page = 1; loadShipments(); }, 350);
  });
  $('#prev').addEventListener('click', function () {
    if (shipState.page > 1) { shipState.page--; loadShipments(); } });
  $('#next').addEventListener('click', function () {
    if (shipState.page * 25 < shipState.total) { shipState.page++; loadShipments(); } });
  loadShipments();
}
function loadShipments() {
  var q = new URLSearchParams({page: shipState.page, limit: 25});
  if (shipState.mode) { q.set('mode', shipState.mode); }
  if (shipState.late) { q.set('late', shipState.late); }
  if (shipState.search) { q.set('search', shipState.search); }
  api('/api/shipments?' + q).then(function (d) {
    shipState.total = d.total;
    shipState.data = d.data;
    $('#count').textContent = d.total.toLocaleString() + ' shipments · ' + d.provenance;
    $('#tbody').innerHTML = d.data.map(function (s) {
      return '<tr data-ref="' + esc(s.ref) + '"><td class="mono">' + esc(s.ref) + '</td>' +
        '<td><span class="mchip ' + s.freight_mode + '">' + s.freight_mode + '</span></td>' +
        '<td>' + esc(s.dest_city || '') + (s.dest_country ? ', ' + esc(s.dest_country) : '') + '</td>' +
        '<td>' + fmtUsd(s.value_usd) + '</td><td>' + fmtDate(s.sla_due_at) + '</td>' +
        '<td>' + fmtDate(s.actual_delivery) + '</td>' +
        '<td><span class="schip ' + (s.was_late ? 'late' : 'ontime') + '">' +
        (s.was_late ? 'LATE' : 'ON TIME') + '</span></td><td><span class="tag">REAL</span></td></tr>';
    }).join('');
    document.querySelectorAll('#tbody tr').forEach(function (tr) {
      tr.addEventListener('click', function () { openDrawer(tr.dataset.ref); });
    });
    $('#pageInfo').textContent = 'Page ' + shipState.page + ' · showing ' + d.data.length + ' of ' +
      d.total.toLocaleString();
    $('#prev').disabled = shipState.page <= 1;
    $('#next').disabled = shipState.page * 25 >= d.total;
  }).catch(function (e) { toast('Shipments failed: ' + e.message, true); });
}
function openDrawer(ref) {
  document.querySelectorAll('#tbody tr').forEach(function (tr) {
    tr.classList.toggle('sel', tr.dataset.ref === ref);
  });
  api('/api/shipments/' + encodeURIComponent(ref)).then(function (s) {
    $('#drawerMount').innerHTML =
      '<div class="drawer-veil" id="veil"></div>' +
      '<div class="drawer"><button class="close" id="drawerClose">✕</button>' +
      '<h3 class="mono">' + esc(s.ref) + '</h3>' +
      '<div class="sub2"><span class="mchip ' + s.freight_mode + '">' + s.freight_mode +
      '</span> · provenance <span class="tag">' + esc(s.provenance) + '</span></div>' +
      '<div class="facts">' +
      '<div class="f"><div class="k">Value</div><div class="v">' + fmtUsd(s.value_usd) + '</div></div>' +
      '<div class="f"><div class="k">Status</div><div class="v"><span class="schip ' +
      (s.was_late ? 'late' : 'ontime') + '">' + (s.was_late ? 'LATE' : 'ON TIME') + '</span></div></div>' +
      '<div class="f"><div class="k">SLA Due</div><div class="v">' + fmtDate(s.sla_due_at) + '</div></div>' +
      '<div class="f"><div class="k">Delivered</div><div class="v">' + fmtDate(s.actual_delivery) + '</div></div></div>' +
      '<h4>Milestones</h4><div class="tl">' + s.timeline.map(function (e) {
        var cls = e.event === 'DELIVERED' ? (s.was_late ? 'bad' : 'done') : 'done';
        return '<div class="ev ' + cls + '"><div class="t">' + esc(e.event) + '</div><div class="d">' +
          esc((e.ts || '').replace('T', ' ').slice(0, 16)) + ' · ' + esc(e.provenance) + '</div></div>';
      }).join('') + '</div>' +
      '<h4>Cargo Lines (' + s.lines.length + ')</h4>' + s.lines.map(function (l) {
        return '<div class="line-item"><span class="sku">' + esc(l.sku) + '</span><span>' + l.qty +
          ' × ' + fmtUsd(l.unit_price) + ' = <b>' + fmtUsd(l.line_value) + '</b></span></div>';
      }).join('') +
      '<h4>Legs</h4>' + s.legs.map(function (l) {
        return '<div class="line-item"><span class="sku">LEG ' + l.seq + ' · ' + esc(l.mode) +
          '</span><span>' + esc(l.origin) + ' → ' + esc(l.destination || '—') + '</span></div>';
      }).join('') + '</div>';
    var close = function () {
      $('#drawerMount').innerHTML = '';
      document.querySelectorAll('#tbody tr').forEach(function (tr) { tr.classList.remove('sel'); });
    };
    $('#veil').addEventListener('click', close);
    $('#drawerClose').addEventListener('click', close);
  }).catch(function (e) { toast('Detail failed: ' + e.message, true); });
}

/* ---------- ALERT INBOX (Split-Pane Triage) ---------- */
function viewAlerts() {
  $('#main').innerHTML =
    '<div class="replay-banner">Operational replay window: last 45 days of REAL order history (2015–17) — ' +
    'alerts are DERIVED, every option priced from SOP-guide tariffs (v0.1-draft). ' +
    '<span class="tag">DERIVED:replay-window</span></div>' +
    '<div class="split"><div class="split-list card" id="alertList" style="padding:0">loading…</div>' +
    '<div class="split-detail card" id="alertDetail"><div class="placeholder">Select an alert</div></div></div>';
  loadAlerts();
}
function genAlerts() {
  api('/api/alerts/generate', {method: 'POST'}).then(function (r) {
    toast('Generated ' + r.created + ' alerts (' + r.skipped + ' already existed)');
    loadAlerts();
  }).catch(function (e) { toast(e.message, true); });
}
function loadAlerts() {
  api('/api/alerts').then(function (d) {
    var el = $('#alertList');
    if (!d.total) {
      el.innerHTML = '<div style="padding:20px" class="list-row">No alerts yet — ' +
        '<button class="btn-mini" id="genBtn">generate from replay window</button></div>';
      $('#genBtn').addEventListener('click', genAlerts);
      return;
    }
    var html = '<div style="padding:10px 14px;display:flex;gap:8px;align-items:center">' +
      '<b style="font-size:12px">' + d.total + ' alerts</b><span class="tag">' + d.provenance +
      '</span><button class="btn-mini" id="genBtn" style="margin-left:auto">↻ re-evaluate</button></div>';
    html += d.data.map(function (a) {
      return '<div class="alert-row' + (alertSel === a.id ? ' sel' : '') + '" data-id="' + a.id + '">' +
        '<span class="sev ' + (a.severity === 'CRITICAL' ? 'crit' : a.severity === 'WARN' ? 'warn' : 'info') +
        '">' + a.severity + '</span><div style="flex:1"><div><span class="mono">' + esc(a.shipment_ref) +
        '</span> · <span class="mchip ' + a.mode + '">' + (a.mode || '') + '</span>' +
        (a.status === 'DECIDED' ? ' <span class="tag" style="color:#86efac">DECIDED</span>' : '') + '</div>' +
        '<div style="color:var(--text-micro);font-size:11px">' + esc(a.rule_code) + ' v' +
        esc(a.rule_version) + ' · ' + fmtUsd(a.value_usd) + ' · ' + esc(a.dest_country || '') + '</div></div>' +
        '<div style="color:var(--text-micro);font-size:10px">' + a.options + ' options</div></div>';
    }).join('');
    el.innerHTML = html;
    document.querySelectorAll('.alert-row').forEach(function (r) {
      r.addEventListener('click', function () {
        alertSel = +r.dataset.id;
        loadAlerts();
        renderAlertDetail(alertSel);
      });
    });
    $('#genBtn').addEventListener('click', genAlerts);
    if (alertSel) { renderAlertDetail(alertSel); }
  }).catch(function (e) { toast('Alerts failed: ' + e.message, true); });
}
function renderAlertDetail(id) {
  api('/api/alerts/' + id).then(function (a) {
    var s = a.shipment || {};
    var html = '<div class="head"><h3>' + esc(a.rule_code) + ' <span style="opacity:.5">v' +
      esc(a.rule_version) + '</span></h3><span class="sev ' +
      (a.severity === 'CRITICAL' ? 'crit' : 'warn') + '">' + a.severity + '</span></div>' +
      '<div class="facts" style="grid-template-columns:repeat(4,1fr)">' +
      '<div class="f"><div class="k">Shipment</div><div class="v mono" style="font-size:12px">' +
      esc(s.ref) + '</div></div>' +
      '<div class="f"><div class="k">Mode</div><div class="v"><span class="mchip ' + s.mode + '">' +
      s.mode + '</span></div></div>' +
      '<div class="f"><div class="k">Value</div><div class="v">' + fmtUsd(s.value_usd) + '</div></div>' +
      '<div class="f"><div class="k">SLA Due</div><div class="v">' + fmtDate(s.sla_due_at) + '</div></div></div>' +
      '<div class="list-row" style="border:0;padding:4px 0;color:var(--text-dim)">Trigger: ' +
      esc(a.context && a.context.trigger ? a.context.trigger : '') + '</div>' +
      '<h4>AI-Recommended Options (cheapest expected cost first)</h4>' +
      '<table class="data"><thead><tr><th>Option</th><th>Cost</th><th>Days saved</th><th>P(on-time)</th>' +
      '<th>Expected total</th></tr></thead><tbody>' + a.options.map(function (o, i) {
        return '<tr class="opt-row' + (i === 0 ? ' sel' : '') + '" data-oid="' + o.id + '"><td>' +
          esc(o.label) + '</td><td>' + fmtUsd(o.cost_usd) + '</td><td>' +
          (o.days_saved === null || o.days_saved === undefined ? '—' : o.days_saved) + '</td><td>' +
          (o.p_on_time === null || o.p_on_time === undefined ? '—' : (o.p_on_time * 100).toFixed(0) + '%') +
          '</td><td><b>' + fmtUsd(o.expected_total_cost_usd) + '</b></td></tr>';
      }).join('') + '</tbody></table>' +
      '<div style="font-size:10px;color:var(--text-micro);margin:6px 0 14px">Costs: SOP-guide tariffs ' +
      '(REAL source) · probabilities: DERIVED:heuristic-v1 (Phase 4 replaces with ETA-model)</div>';
    if (a.status === 'DECIDED') {
      html += '<div class="card" style="border-color:var(--ok)"><b style="color:#86efac">DECIDED</b> — ' +
        a.decisions.map(function (d) {
          return d.action + ' by ' + esc(d.by) + ' — “' + esc(d.reason) + '”';
        }).join('; ') + '</div>';
    } else {
      html += '<h4>Ask the copilot (explains, never decides)</h4>' +
        '<div style="display:flex;gap:8px;margin-bottom:10px">' +
        '<input id="copQ" placeholder="e.g. why reroute over air here?" style="flex:1;background:var(--input);border:1px solid var(--border);color:var(--text);border-radius:4px;padding:7px 10px">' +
        '<button class="btn-mini" id="copAsk">Ask</button></div>' +
        '<div id="copOut" class="list-row" style="display:none"></div>' +
        '<h4>Your decision (mandatory reason — audit trail)</h4>' +
        '<textarea id="decReason" rows="2" style="width:100%;background:var(--input);' +
        'border:1px solid var(--border);color:var(--text);border-radius:4px;padding:8px" ' +
        'placeholder="Why this decision? (logged permanently)"></textarea>' +
        '<div class="btn-row"><button class="btn-ok" id="btnApprove">✓ Approve selected</button>' +
        '<button class="btn-mod" id="btnModify">✎ Modify</button>' +
        '<button class="btn-no" id="btnReject">✕ Reject all</button></div>' +
        '<div style="font-size:10px;color:var(--text-micro);margin-top:8px">Authority check: your role ' +
        'limit is applied server-side (403 on exceed → escalate).</div>';
    }
    $('#alertDetail').innerHTML = html;
    var selectedOid = a.options.length ? a.options[0].id : null;
    document.querySelectorAll('.opt-row').forEach(function (r) {
      r.addEventListener('click', function () {
        document.querySelectorAll('.opt-row').forEach(function (x) { x.classList.remove('sel'); });
        r.classList.add('sel');
        selectedOid = +r.dataset.oid;
      });
    });
    if (a.status !== 'DECIDED') {
      var decide = function (action, oid) {
        var reason = $('#decReason').value.trim();
        if (reason.length < 3) { toast('A reason is mandatory (audit rule)', true); return; }
        api('/api/alerts/' + id + '/decide', {method: 'POST',
          body: JSON.stringify({action: action, option_id: oid !== undefined ? oid : selectedOid,
            reason: reason})})
          .then(function (r) {
            toast(action + ' logged — ' + r.decided_by + (r.option ? ' · ' + r.option : ''));
            renderAlertDetail(id);
            loadAlerts();
          }).catch(function (e) { toast(e.message, true); });
      };
      var askCopilot = function () {
        var q = $('#copQ').value.trim();
        if (!q) { return; }
        $('#copOut').style.display = 'block';
        $('#copOut').innerHTML = '<i>thinking…</i>';
        api('/api/copilot', {method: 'POST', body: JSON.stringify({question: q, alert_id: id})})
          .then(function (r) {
            $('#copOut').innerHTML = '<span class="sev info">COPILOT</span><div style="white-space:pre-wrap">' +
              esc(r.answer) + '</div><div style="font-size:10px;color:var(--text-micro)">' + esc(r.provenance) + '</div>';
          }).catch(function (e) { $('#copOut').innerHTML = esc(e.message); });
      };
      $('#copAsk').addEventListener('click', askCopilot);
      $('#copQ').addEventListener('keydown', function (e) { if (e.key === 'Enter') { askCopilot(); } });
      $('#btnApprove').addEventListener('click', function () { decide('APPROVED'); });
      $('#btnModify').addEventListener('click', function () { decide('MODIFIED'); });
      $('#btnReject').addEventListener('click', function () { decide('REJECTED', null); });
    }
  }).catch(function (e) { toast('Detail failed: ' + e.message, true); });
}

function viewFinance() {
  $('#main').innerHTML = '<div id="finBody" class="placeholder">loading…</div>';
  api('/api/finance').then(function (d) {
    var cards = [
      ['SLA Penalty Exposure', '$' + d.sla_penalty_exposure_usd.toLocaleString(), d.window.at_risk_shipments + ' at-risk shipments (replay window)', 'REAL:DataCo+OTIF'],
      ['Demurrage Potential', '$' + d.demurrage_potential_usd.toLocaleString(), 'UNCTAD dwell prior x SOP tariff', 'CALIBRATED'],
      ['Expedite Spend', '$' + d.expedite.approved_spend_usd.toLocaleString() + ' / $' + d.expedite.budget_usd.toLocaleString(), d.expedite.utilization_pct + '% of budget', 'REAL:audit'],
      ['Air/Ocean Breakeven', '$' + d.breakeven.threshold_usd.toLocaleString(), 'air ≈ ' + d.breakeven.air_multiple + 'x ocean — air optimal above this penalty', 'DERIVED']
    ];
    var html = '<div class="kpis">' + cards.map(function (c) {
      return '<div class="card kpi"><div class="label">' + c[0] + '</div><div class="value">' + c[1] +
        '</div><div class="sub">' + c[2] + '</div><div style="margin-top:6px"><span class="tag">' + c[3] + '</span></div></div>';
    }).join('') + '</div>';
    html += '<div class="grid-2"><div class="card"><div class="head"><h3>Breakeven: ocean(+penalty) vs air total cost</h3>' +
      '<span class="tag">DERIVED:optimizer</span></div>' +
      '<div style="height:240px"><canvas id="breakevenChart"></canvas></div>' +
      '<table class="data" style="margin-top:12px"><thead><tr><th>Penalty exposure</th>' +
      '<th>Ocean total</th><th>Air total</th><th>Optimal</th></tr></thead><tbody>' +
      d.breakeven.curve.map(function (r) {
        return '<tr><td>$' + r.penalty_exposure_usd.toLocaleString() + '</td><td>$' + r.ocean_total.toLocaleString() +
          '</td><td>$' + r.air_total.toLocaleString() + '</td><td><span class="mchip ' +
          (r.choice === 'AIR' ? 'AIR' : 'OCEAN') + '">' + r.choice + '</span></td></tr>';
      }).join('') + '</tbody></table></div>';
    html += '<div class="card"><div class="head"><h3>Expedite ROI Log (real decisions)</h3>' +
      '<span class="tag">REAL:decision-audit</span></div>' +
      (d.roi_log.length ? d.roi_log.map(function (r) {
        return '<div class="list-row"><span class="sev ' + (r.net_usd >= 0 ? 'info' : 'crit') + '">' +
          r.action + '</span><div><div><span class="mono">' + esc(r.shipment) + '</span> · ' + esc(r.option || '—') +
          ' by ' + esc(r.by) + '</div><div style="color:var(--text-micro);font-size:11px">cost $' +
          r.cost_usd.toLocaleString() + ' · penalty avoided $' + r.penalty_avoided_usd.toLocaleString() +
          ' · <b style="color:' + (r.net_usd >= 0 ? '#86efac' : '#fda4af') + '">net $' + r.net_usd.toLocaleString() +
          '</b> — “' + esc(r.reason) + '”</div></div></div>';
      }).join('') : '<div class="list-row">No decisions yet — approve alerts and they appear here with realized net.</div>') +
      '</div></div>';
    $('#finBody').className = '';
    $('#finBody').innerHTML = html;
    var curve = d.breakeven.curve;
    lineChart('breakevenChart',
      curve.map(function (r) { return '$' + r.penalty_exposure_usd.toLocaleString(); }),
      [{label: 'Ocean (+penalty)', data: curve.map(function (r) { return r.ocean_total; }),
        borderColor: '#3B82F6', backgroundColor: 'rgba(59,130,246,.15)', fill: true, tension: .2},
       {label: 'Air expedite', data: curve.map(function (r) { return r.air_total; }),
        borderColor: '#8B5CF6', borderDash: [5, 5], tension: .2}],
      {scales: {y: {title: {display: true, text: 'Total cost (USD)'}}}});
  }).catch(function (e) { var b = $('#finBody'); b.className = 'placeholder'; b.innerHTML = '<b>Could not load</b><br>' + esc(e.message); });
}

function viewAnalytics() {
  $('#main').innerHTML = '<div id="anBody" class="placeholder">loading…</div>';
  api('/api/analytics').then(function (d) {
    var html = '<div class="kpis">' + d.lead_time_spc.map(function (r) {
      return '<div class="card kpi"><div class="label">MEAN LEAD TIME — ' + r.mode + '</div>' +
        '<div class="value">' + r.mean_days + 'd</div><div class="sub">' + r.n.toLocaleString() +
        ' shipments</div><div style="margin-top:6px"><span class="tag">REAL:DataCo</span></div></div>';
    }).join('') + '</div><div class="card"><div class="head"><h3>Late rate by destination (top 10)</h3>' +
      '<span class="tag">REAL:DataCo</span></div><table class="data"><thead><tr><th>Country</th>' +
      '<th>Shipments</th><th>Late %</th></tr></thead><tbody>' + d.late_by_country.map(function (r) {
        return '<tr><td>' + esc(r.country) + '</td><td>' + r.shipments.toLocaleString() + '</td>' +
          '<td><span class="schip ' + (r.late_pct > 50 ? 'late' : 'ontime') + '">' + r.late_pct + '%</span></td></tr>';
      }).join('') + '</tbody></table></div>';
    $('#anBody').className = ''; $('#anBody').innerHTML = html +
      '<div class="grid-2" style="margin-top:12px">' +
      '<div class="card"><div class="head"><h3>Lead-time control chart (weekly, 3-sigma)</h3><span class="tag">REAL:DataCo</span></div>' +
      '<div style="height:220px"><canvas id="spcChart"></canvas></div></div>' +
      '<div class="card"><div class="head"><h3>Demand: 26wk history + 12wk forecast</h3><span class="tag" id="fcTag">PROJECTED:seasonal-v1</span></div>' +
      '<div style="height:220px"><canvas id="fcChart"></canvas></div></div></div>';
    api('/api/analytics/spc').then(function (s) {
      lineChart('spcChart', s.labels,
        [{label: 'Weekly mean transit (d)', data: s.values, borderColor: '#2DD4BF',
          backgroundColor: 'rgba(45,212,191,.12)', fill: true, pointRadius: 2},
         {label: 'CL ' + s.cl, data: s.values.map(function () { return s.cl; }),
          borderColor: '#64748B', borderDash: [4, 4], pointRadius: 0},
         {label: 'UCL ' + s.ucl, data: s.values.map(function () { return s.ucl; }),
          borderColor: '#EF4444', borderDash: [4, 4], pointRadius: 0},
         {label: 'LCL ' + s.lcl, data: s.values.map(function () { return s.lcl; }),
          borderColor: '#EF4444', borderDash: [4, 4], pointRadius: 0}]);
    }).catch(function () {});
    api('/api/analytics/forecast').then(function (f) {
      if (!f.available) { return; }
      var labels = f.history_labels.concat(f.forecast_labels);
      var hist = f.history_values.concat(f.forecast_values.map(function () { return null; }));
      var proj = f.history_values.map(function () { return null; }).concat(f.forecast_values);
      lineChart('fcChart', labels,
        [{label: 'Orders/wk (REAL)', data: hist, borderColor: '#3B82F6',
          backgroundColor: 'rgba(59,130,246,.12)', fill: true, pointRadius: 2},
         {label: 'Forecast (PROJECTED)', data: proj, borderColor: '#2DD4BF',
          borderDash: [5, 5], pointRadius: 2}]);
      var t = document.getElementById('fcTag');
      if (t && f.scores) { t.textContent = 'PROJECTED:seasonal-v1 · MASE ' + f.scores.mase; }
    }).catch(function () {});
  }).catch(function (e) { var b = $('#anBody'); b.className = 'placeholder'; b.innerHTML = '<b>Could not load</b><br>' + esc(e.message); });
}
function viewESG() {
  $('#main').innerHTML = '<div id="esgBody" class="placeholder">loading…</div>';
  api('/api/esg').then(function (d) {
    var html = '<div class="kpis">' +
      '<div class="card kpi"><div class="label">TOTAL CO2e</div><div class="value">' + d.total_co2e_tonnes.toLocaleString() + ' t</div><div class="sub">GLEC factors x REAL mode mix</div><div style="margin-top:6px"><span class="tag">CALIBRATED:GLEC</span></div></div>' +
      '<div class="card kpi"><div class="label">CARBON COST @ $' + d.internal_price_usd_per_t + '/t</div><div class="value">$' + d.carbon_cost_usd.toLocaleString() + '</div><div class="sub">internal price in every decision</div><div style="margin-top:6px"><span class="tag">CALIBRATED</span></div></div></div>' +
      '<div class="card"><div class="head"><h3>Emissions by mode</h3><span class="tag">kg CO2e/t-km factors</span></div>' +
      '<table class="data"><thead><tr><th>Mode</th><th>Shipments</th><th>Share</th><th>Factor</th><th>CO2e t</th></tr></thead><tbody>' +
      d.by_mode.map(function (r) {
        return '<tr><td><span class="mchip ' + r.mode + '">' + r.mode + '</span></td><td>' + r.shipments.toLocaleString() +
          '</td><td>' + r.share_pct + '%</td><td>' + r.factor_kg_per_tkm + '</td><td><b>' + r.co2e_tonnes.toLocaleString() + '</b></td></tr>';
      }).join('') + '</tbody></table>' +
      '<div style="font-size:11px;color:var(--text-dim);margin-top:10px">' + esc(d.green_shift.note) +
      '</div><div style="height:200px;margin-top:12px"><canvas id="esgChart"></canvas></div>' +
      '<div style="font-size:10px;color:var(--text-micro);margin-top:6px">Method: ' + esc(d.method.mass) + '</div></div>';
    $('#esgBody').className = ''; $('#esgBody').innerHTML = html;
    var elc = document.getElementById('esgChart');
    if (elc && window.Chart) {
      new Chart(elc.getContext('2d'), {type: 'bar',
        data: {labels: d.by_mode.map(function (r) { return r.mode; }),
          datasets: [{label: 'CO2e tonnes', data: d.by_mode.map(function (r) { return r.co2e_tonnes; }),
            backgroundColor: ['#3B82F6', '#8B5CF6', '#F59E0B']}]},
        options: {responsive: true, maintainAspectRatio: false,
          plugins: {legend: {display: false}}}});
    }
  }).catch(function (e) { var b = $('#esgBody'); b.className = 'placeholder'; b.innerHTML = '<b>Could not load</b><br>' + esc(e.message); });
}

/* ---------- BOOT ---------- */
chartDefaults();
if (token) { renderApp(); } else { renderLogin(); }
