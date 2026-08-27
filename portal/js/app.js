/**
 * SmartTrack™ Multi-Modal Logistics Intelligence & Predictive AI
 * Core Application Engine & Data Controller
 */

// API Base URL - Dynamically resolves relative paths in cloud production with local dev fallback
const API_BASE = window.SMARTTRACK_API_URL || 
    ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? (window.location.origin.includes('8000') ? '' : 'http://localhost:8000')
        : '');

let authToken = localStorage.getItem('smarttrack_token') || null;
let currentShipmentsPage = 1;
let leafletMap = null;
let mapMarkers = [];

// Unified Authenticated Fetch Helper
async function authFetch(url, options = {}) {
    if (!authToken) {
        showLogin();
        throw new Error('Unauthorized: Authentication required');
    }
    options.headers = options.headers || {};
    if (!(options.headers instanceof Headers)) {
        options.headers['Authorization'] = `Bearer ${authToken}`;
    } else {
        options.headers.set('Authorization', `Bearer ${authToken}`);
    }

    try {
        const res = await fetch(url, options);
        if (res.status === 401) {
            authToken = null;
            localStorage.removeItem('smarttrack_token');
            localStorage.removeItem('smarttrack_user');
            showLogin();
            throw new Error('Session expired: Please log in again');
        }
        return res;
    } catch (err) {
        if (err.message.includes('Session expired') || err.message.includes('Unauthorized')) {
            showLogin();
        }
        throw err;
    }
}

// Chart Instances
let shapChartInstance = null;
let demurrageChartInstance = null;
let spcChartInstance = null;
let segmentChartInstance = null;
let marketChartInstance = null;
let emissionsChartInstance = null;
let delayByModeChartInstance = null;
let revenueTrendChartInstance = null;
let riskHistogramChartInstance = null;
let modalityMixChartInstance = null;
let categoryBreachChartInstance = null;
let tcoChartInstance = null;
let slaModeChartInstance = null;
let marketTrendChartInstance = null;
let emissionsTrendChartInstance = null;

// Live telemetry polling
let telemetryPoller = null;
const TELEMETRY_POLL_MS = 20000;
let aisSnapshotShown = false;

const CHART_TICK = '#94a3b8';
const CHART_GRID = 'rgba(255,255,255,0.06)';
const CHART_LABEL = '#f8fafc';

// ========================================================
// 1. INITIALIZATION & AUTH LIFECYCLE
// ========================================================
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initAuth();
    initAiCopilot();
    
    if (authToken) {
        showApp();
    } else {
        showLogin();
    }
});

function initAuth() {
    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');
    const loginError = document.getElementById('loginError');
    const logoutBtn = document.getElementById('logoutBtn');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...';
        loginError.style.display = 'none';

        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const res = await fetch(`${API_BASE}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();
            if (res.ok && data.access_token) {
                authToken = data.access_token;
                localStorage.setItem('smarttrack_token', authToken);
                localStorage.setItem('smarttrack_user', JSON.stringify(data));
                showApp();
            } else {
                throw new Error(data.detail || 'Authentication failed');
            }
        } catch (err) {
            loginError.textContent = err.message;
            loginError.style.display = 'block';
        } finally {
            loginBtn.disabled = false;
            loginBtn.innerHTML = '<span>Authenticate & Access Control Tower</span> <i class="fa-solid fa-arrow-right"></i>';
        }
    });

    logoutBtn.addEventListener('click', () => {
        authToken = null;
        localStorage.removeItem('smarttrack_token');
        localStorage.removeItem('smarttrack_user');
        showLogin();
    });
}

function showLogin() {
    document.getElementById('loginOverlay').style.display = 'flex';
    document.getElementById('appContainer').style.display = 'none';
}

function showApp() {
    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('appContainer').style.display = 'flex';

    // Load User info
    const user = JSON.parse(localStorage.getItem('smarttrack_user') || '{}');
    if (user.name) document.getElementById('sessionUserName').textContent = user.name;
    if (user.role) document.getElementById('sessionUserRole').textContent = user.role;

    // Load initial control tower data
    loadDashboardData();
    initSimulator();
    initShipmentsLedger();
    refreshHealthBadge();
    startTelemetryLoop();
}

async function refreshHealthBadge() {
    try {
        const res = await fetch(`${API_BASE}/api/health`);
        if (res.ok) {
            const h = await res.json();
            const badge = document.getElementById('dataSyncBadge');
            const aisMode = (h.ais_mode || 'simulated').toUpperCase();
            if (badge) {
                if (h.database_live) {
                    badge.innerHTML = `<i class="fa-solid fa-database"></i> PostgreSQL (${Number(h.records).toLocaleString()} Rows) Synced • AIS ${aisMode}`;
                } else {
                    badge.innerHTML = `<i class="fa-solid fa-flask-vial"></i> Synthetic Sandbox (${Number(h.records).toLocaleString()}-Row Replica) • AIS ${aisMode}`;
                }
            }
        }
    } catch (e) { /* badge stays as-is */ }
}

// ========================================================
// 2. NAVIGATION ROUTING
// ========================================================
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        const viewTarget = item.getAttribute('data-view');
        if (!viewTarget) return; // external links (e.g. pitch deck) navigate normally
        item.addEventListener('click', (e) => {
            e.preventDefault();
            switchView(viewTarget);
        });
    });

    document.getElementById('refreshDataBtn').addEventListener('click', () => {
        loadDashboardData();
    });
}

function switchView(viewName) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.view-panel').forEach(el => el.classList.remove('active'));

    const activeNav = document.querySelector(`.nav-item[data-view="${viewName}"]`);
    if (activeNav) activeNav.classList.add('active');

    const viewIdMap = {
        'dashboard': 'viewDashboard',
        'shipments': 'viewShipments',
        'predictions': 'viewPredictions',
        'demurrage': 'viewDemurrage',
        'compliance': 'viewCompliance',
        'market': 'viewMarket',
        'emissions': 'viewEmissions'
    };

    const titleMap = {
        'dashboard': 'Executive Control Tower & Global Radar',
        'shipments': 'Global Shipments Ledger (172,765 Records)',
        'predictions': 'XGBoost Delay Risk Regressor & Prescriptive Actions',
        'demurrage': 'Demurrage Center & Port Free-Time Clocks',
        'compliance': 'Six Sigma Statistical Process Control (SPC)',
        'market': 'Customer Segments & Regional Intelligence',
        'emissions': 'Scope 3 ESG Carbon Accounting'
    };

    const targetPanel = document.getElementById(viewIdMap[viewName]);
    if (targetPanel) {
        targetPanel.classList.add('active');
        document.getElementById('pageTitle').textContent = titleMap[viewName] || 'SmartTrack™';
    }

    // Lazy load specific view charts
    if (viewName === 'dashboard') {
        setTimeout(() => { if (leafletMap) leafletMap.invalidateSize(); }, 200);
        renderDashboardCharts();
    } else if (viewName === 'demurrage') {
        renderDemurrageView();
    } else if (viewName === 'compliance') {
        renderComplianceView();
    } else if (viewName === 'market') {
        renderMarketCharts();
    } else if (viewName === 'emissions') {
        renderEmissionsView();
    } else if (viewName === 'predictions') {
        renderShapChart();
        renderTcoChart();
    } else if (viewName === 'shipments') {
        renderShipmentsAnalytics();
    }
}

// ========================================================
// 3. DASHBOARD OVERVIEW & LEAFLET MAP
// ========================================================
async function loadDashboardData() {
    try {
        // 1. Fetch KPIs
        const kpiRes = await authFetch(`${API_BASE}/api/kpis`);
        if (kpiRes.ok) {
            const kpis = await kpiRes.json();
            document.getElementById('kpiActiveShipments').textContent = Number(kpis.active_shipments).toLocaleString();
            document.getElementById('kpiOnTimeRate').textContent = `${kpis.on_time_percentage}%`;
            document.getElementById('kpiGrossRevenue').textContent = `$${(kpis.total_revenue / 1000000).toFixed(2)}M`;
            document.getElementById('kpiDemurrageRisk').textContent = `$${Number(kpis.total_demurrage_risk).toLocaleString()}`;
        }

        // 2. Fetch Port Weather
        const weatherRes = await authFetch(`${API_BASE}/api/weather`);
        if (weatherRes.ok) {
            const weatherData = await weatherRes.json();
            renderWeatherList(weatherData.ports || []);
        }

        // 3. Fetch Disruption Exceptions
        const excRes = await authFetch(`${API_BASE}/api/exceptions`);
        if (excRes.ok) {
            const excData = await excRes.json();
            renderDisruptionList(excData.items || []);
        }

        // 4. Fetch Multi-modal Telemetry & Init Map
        const telRes = await authFetch(`${API_BASE}/api/telemetry/live`);
        if (telRes.ok) {
            const telData = await telRes.json();
            initGlobalMap(telData);
            updateFleetMarkers(telData);
            updateTelemetryChips(telData.summary || {});
        }

        // 5. Executive analytics strip (charts) + live modality cards
        renderDashboardCharts();
    } catch (err) {
        console.error('Error loading dashboard data:', err);
    }
}

function renderWeatherList(ports) {
    const container = document.getElementById('portWeatherList');
    container.innerHTML = ports.map(p => `
        <div class="weather-item">
            <div class="port-name-box">
                <strong>${p.name}</strong>
                <span>${p.dwell_info} • [${p.coordinates[0].toFixed(2)}, ${p.coordinates[1].toFixed(2)}]</span>
            </div>
            <div class="port-weather-stats">
                <div class="port-temp">${p.temperature_c}°C</div>
                <div class="port-wind">${p.weather_desc} • ${p.windspeed_kmh} km/h wind</div>
            </div>
        </div>
    `).join('');
}

function renderDisruptionList(exceptions) {
    const container = document.getElementById('disruptionFeedList');
    container.innerHTML = exceptions.map(ex => `
        <div class="feed-item">
            <strong>${ex.title} (${ex.tag})</strong>
            <p>${ex.impact} • Severity: <span class="text-rose font-bold">${ex.severity}</span></p>
        </div>
    `).join('');
}

function createCurvedFlightPath(latlng1, latlng2, curvature = 0.22) {
    const lat1 = latlng1[0], lon1 = latlng1[1];
    const lat2 = latlng2[0], lon2 = latlng2[1];
    const midLat = (lat1 + lat2) / 2;
    const midLon = (lon1 + lon2) / 2;
    
    // Perpendicular offset for great-circle projectile curve
    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;
    const dist = Math.sqrt(dLat * dLat + dLon * dLon);
    
    // Curve northward / upward
    const controlLat = midLat + (dist * curvature);
    const controlLon = midLon - (dLat * 0.1);

    const points = [];
    for (let t = 0; t <= 1; t += 0.02) {
        const lat = (1 - t) * (1 - t) * lat1 + 2 * (1 - t) * t * controlLat + t * t * lat2;
        const lon = (1 - t) * (1 - t) * lon1 + 2 * (1 - t) * t * controlLon + t * t * lon2;
        points.push([lat, lon]);
    }
    return points;
}

function initGlobalMap(telemetry) {
    if (!leafletMap) {
        leafletMap = L.map('freightMap', {
            center: [26.0, 48.0],
            zoom: 3,
            minZoom: 2,
            maxZoom: 12
        });

        // Dark-mode CartoDB tile layer
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(leafletMap);

        // -------------------------------------------------------------
        // A. 🚢 REAL-LIFE OCEAN MARITIME CORRIDORS (Waypoint Navigated)
        // -------------------------------------------------------------
        
        // 1. JNPT Mumbai -> Suez -> Rotterdam (10,242 km)
        const seaLaneEurope = [
            [18.954, 72.954],  // JNPT Navi Mumbai
            [14.800, 60.000],  // Arabian Sea
            [12.500, 45.000],  // Gulf of Aden
            [12.600, 43.300],  // Bab-el-Mandeb Strait
            [20.000, 38.500],  // Central Red Sea
            [27.800, 34.300],  // Gulf of Suez Entrance
            [29.970, 32.550],  // Suez Canal Transit Point
            [31.300, 32.300],  // Port Said (Mediterranean exit)
            [34.500, 24.000],  // South of Crete
            [36.500, 15.000],  // Strait of Sicily
            [37.200, 5.000],   // Western Mediterranean
            [35.950, -5.600],  // Strait of Gibraltar
            [43.500, -9.500],  // Cape Finisterre (Atlantic)
            [48.500, -5.500],  // Bay of Biscay / Ushant
            [50.200, -0.500],  // English Channel
            [51.400, 2.000],   // Dover Strait
            [51.924, 4.477]    // Port of Rotterdam
        ];
        L.polyline(seaLaneEurope, {
            color: '#3b82f6',
            weight: 3.5,
            opacity: 0.85
        }).addTo(leafletMap).bindPopup('<b>🚢 Primary Maritime Corridor (IMO Verified)</b><br>JNPT Mumbai → Suez Canal → Rotterdam (10,242 km)');

        // 2. JNPT Mumbai -> Malacca Strait -> Singapore PSA (2,678 km)
        const seaLaneSingapore = [
            [18.954, 72.954],  // JNPT Mumbai
            [10.000, 75.500],  // Laccadive Sea
            [5.500, 80.200],   // South of Sri Lanka (Dondra Head)
            [5.800, 95.000],   // Andaman Sea Entrance
            [4.500, 98.500],   // Malacca Strait Northwest
            [2.200, 102.100],  // Malacca Strait Southeast
            [1.290, 103.850]   // Port of Singapore PSA
        ];
        L.polyline(seaLaneSingapore, {
            color: '#06b6d4',
            weight: 3,
            opacity: 0.8
        }).addTo(leafletMap).bindPopup('<b>🚢 Asia-Pacific Feeder Corridor</b><br>JNPT Mumbai → Singapore PSA (2,678 km)');

        // 3. Singapore -> Pacific -> Los Angeles (14,832 km)
        const seaLaneTranspacific = [
            [1.290, 103.850],   // Singapore
            [10.500, 114.000],  // South China Sea
            [21.000, 121.500],  // Luzon Strait
            [28.000, 140.000],  // Western Pacific
            [35.000, 170.000],  // Mid Pacific Ocean
            [34.000, -140.000], // Eastern Pacific
            [33.740, -118.260]  // Port of Los Angeles
        ];
        L.polyline(seaLaneTranspacific, {
            color: '#3b82f6',
            weight: 2.5,
            dashArray: '5, 8',
            opacity: 0.65
        }).addTo(leafletMap).bindPopup('<b>🚢 Trans-Pacific Trade Corridor</b><br>Singapore → Port of Los Angeles (14,832 km)');

        // -------------------------------------------------------------
        // B. ✈️ PROJECTILE CURVED FLIGHT PATHS (Great Circle Arcs)
        // -------------------------------------------------------------
        
        // 1. Mumbai BOM -> Amsterdam AMS Air Corridor
        const flightArc1 = createCurvedFlightPath([19.09, 72.87], [52.31, 4.76], 0.28);
        L.polyline(flightArc1, {
            color: '#c084fc',
            weight: 3,
            dashArray: '8, 8',
            className: 'flight-path-arc',
            opacity: 0.9
        }).addTo(leafletMap).bindPopup('<b>✈️ Express Air Cargo Priority Corridor</b><br>Mumbai BOM ⇄ Amsterdam AMS (6,850 km • 8.5h Flight Time)');

        // 2. Delhi DEL -> London LHR Air Corridor
        const flightArc2 = createCurvedFlightPath([28.55, 77.10], [51.47, -0.45], 0.26);
        L.polyline(flightArc2, {
            color: '#a855f7',
            weight: 2.5,
            dashArray: '6, 6',
            className: 'flight-path-arc',
            opacity: 0.8
        }).addTo(leafletMap).bindPopup('<b>✈️ Trans-Continental Air Freight</b><br>Delhi DEL ⇄ London Heathrow LHR (6,710 km)');

        // 3. Singapore SIN -> Tokyo HND Air Corridor
        const flightArc3 = createCurvedFlightPath([1.36, 103.99], [35.54, 139.78], 0.20);
        L.polyline(flightArc3, {
            color: '#c084fc',
            weight: 2.5,
            dashArray: '6, 6',
            className: 'flight-path-arc',
            opacity: 0.8
        }).addTo(leafletMap).bindPopup('<b>✈️ Asia-Pacific Air Express</b><br>Singapore SIN ⇄ Tokyo Haneda HND (5,320 km)');

        // -------------------------------------------------------------
        // C. 🚛 REAL-LIFE HIGHWAY TRUCK FREIGHT CORRIDORS (OSRM Verified)
        // -------------------------------------------------------------
        
        // Delhi Freight Hub -> Mumbai Gateway Port (Highway 48 Industrial Corridor)
        const roadDelhiMumbai = [
            [28.6139, 77.2090],  // New Delhi Freight Hub (Kartavya Path)
            [27.8900, 76.2800],  // Neemrana Industrial Zone
            [26.9124, 75.7873],  // Jaipur Logistics Park
            [25.3500, 74.6300],  // Bhilwara Textile Hub
            [24.5854, 73.6844],  // Udaipur Checkpoint
            [23.8300, 72.9800],  // Himatnagar
            [23.0225, 72.5714],  // Ahmedabad Multi-Modal Logistics Park
            [22.3072, 73.1812],  // Vadodara Corridor
            [21.1702, 72.8311],  // Surat Diamond & Freight Hub
            [20.3800, 72.9000],  // Vapi Industrial Estate
            [19.2100, 72.9700],  // Thane / Navi Mumbai Toll
            [19.0760, 72.8777]   // Mumbai Gateway Port Gateway
        ];
        L.polyline(roadDelhiMumbai, {
            color: '#10b981',
            weight: 4,
            opacity: 0.9
        }).addTo(leafletMap).bindPopup('<b>🚛 National Highway 48 Industrial Freight Corridor</b><br>Delhi Logistics Hub ⇄ Mumbai Gateway Port (1,350.7 km • 15.3h Transit)');

        // Mumbai -> Pune -> Bangalore South Corridor
        const roadMumbaiBangalore = [
            [19.0760, 72.8777],  // Mumbai
            [18.5204, 73.8567],  // Pune Expressway
            [16.7050, 74.2433],  // Kolhapur Hub
            [15.8497, 74.4977],  // Belgaum
            [15.3647, 75.1240],  // Hubli
            [14.4644, 75.9218],  // Davanagere
            [12.9716, 77.5946]   // Bangalore Tech Logistics Hub
        ];
        L.polyline(roadMumbaiBangalore, {
            color: '#34d399',
            weight: 3.5,
            dashArray: '6, 6',
            opacity: 0.8
        }).addTo(leafletMap).bindPopup('<b>🚛 South Industrial Highway Corridor</b><br>Mumbai Gateway ⇄ Bangalore Logistics Hub (980 km)');

        // -------------------------------------------------------------
        // D. ⚓ STRATEGIC GLOBAL PORTS (Custom Anchor Badges)
        // -------------------------------------------------------------
        const ports = [
            {
                name: "Port of Rotterdam",
                country: "Netherlands",
                coords: [51.924, 4.477],
                berths: "38 Container Berths",
                dwell: "5.8 Days Avg Dwell",
                demurrage: "$1,600 / Day Exposure",
                weather: "17.3°C • Overcast (Open-Meteo)"
            },
            {
                name: "JNPT Navi Mumbai",
                country: "India",
                coords: [18.954, 72.954],
                berths: "5 Container Terminals (GTI/NSFT)",
                dwell: "5.2 Days Avg Dwell",
                demurrage: "$1,050 / Day Exposure",
                weather: "28.5°C • Fair (Open-Meteo)"
            },
            {
                name: "Port of Singapore PSA",
                country: "Singapore",
                coords: [1.290, 103.850],
                berths: "67 Deepwater Berths",
                dwell: "4.1 Days Avg Dwell",
                demurrage: "$300 / Day Exposure",
                weather: "30.0°C • Humid (Open-Meteo)"
            },
            {
                name: "Port of Los Angeles",
                country: "United States",
                coords: [33.740, -118.260],
                berths: "San Pedro Bay Terminal",
                dwell: "6.2 Days Avg Dwell",
                demurrage: "$2,100 / Day Exposure",
                weather: "21.0°C • Clear (Open-Meteo)"
            },
            {
                name: "Port of Genoa",
                country: "Italy",
                coords: [44.405, 8.946],
                berths: "Mediterranean Hub",
                dwell: "7.4 Days (STRIKE DELAY)",
                demurrage: "$1,850 / Day Exposure",
                weather: "24.2°C • Union Strike Alert"
            }
        ];

        ports.forEach(p => {
            const portHtml = `<div class="map-marker-port" title="${p.name}"><i class="fa-solid fa-anchor"></i></div>`;
            const portIcon = L.divIcon({ html: portHtml, className: 'custom-map-icon', iconSize: [34, 34], iconAnchor: [17, 17] });
            
            L.marker(p.coords, { icon: portIcon }).addTo(leafletMap).bindPopup(`
                <div style="font-family:var(--font-main); min-width:210px; color:#0f172a;">
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                        <span style="font-size:18px; color:#0284c7;"><i class="fa-solid fa-anchor"></i></span>
                        <strong style="font-size:14px; color:#0369a1;">${p.name}</strong>
                    </div>
                    <div style="font-size:11.5px; color:#475569; margin-bottom:4px;"><b>Country:</b> ${p.country} • ${p.berths}</div>
                    <div style="font-size:11.5px; color:#b91c1c; margin-bottom:4px;"><b>Dwell:</b> ${p.dwell} (${p.demurrage})</div>
                    <div style="font-size:11px; background:#e0f2fe; padding:4px 8px; border-radius:4px; color:#0369a1;"><b>🌤️ Weather:</b> ${p.weather}</div>
                </div>
            `);
        });
    }

    // Moving fleet is handled by updateFleetMarkers() below; ensure a first plot
    updateFleetMarkers(telemetry);
}

// ------------------------------------------------------------
// LIVE FLEET MARKER MANAGER (keyed markers => smooth motion)
// ------------------------------------------------------------
const fleetMarkers = new Map();

function updateFleetMarkers(telemetry) {
    if (!leafletMap) return;

    const vesselSeen = new Set();
    const flightSeen = new Set();
    const truckSeen = new Set();

    // 1. Plot / move AIS Ocean Ships
    (telemetry.vessels || []).forEach(v => {
        const key = `v_${v.mmsi}`;
        vesselSeen.add(key);
        const iconHtml = `<div class="map-marker-ship" title="${v.name}"><i class="fa-solid fa-ship"></i></div>`;
        const popup = `
            <div style="font-family:var(--font-main); color:#0f172a; min-width:200px;">
                <h4 style="margin:0 0 4px; color:#1d4ed8;">🚢 ${v.name}</h4>
                <p style="margin:0 0 4px; font-size:12px;"><b>MMSI:</b> ${v.mmsi} | <b>Type:</b> ${v.vessel_type}</p>
                <p style="margin:0 0 4px; font-size:12px;"><b>Speed:</b> ${v.speed_knots} kts • <b>Course:</b> ${v.heading_deg}°</p>
                <p style="margin:0 0 4px; font-size:11px; color:#475569;"><b>Dest:</b> ${v.destination} (ETA: ${v.eta || 'On Schedule'})</p>
                <span style="display:inline-block; padding:2px 8px; border-radius:4px; font-size:10.5px; font-weight:700; ${v.simulated ? 'background:#fef3c7; color:#92400e;' : 'background:#d1fae5; color:#065f46;'}">${v.simulated ? '⚙️ DEAD-RECKONING SIM' : '🛰️ SATELLITE LIVE'}</span>
            </div>`;

        const prev = fleetMarkers.get(key);
        if (prev) {
            prev.setLatLng([v.latitude, v.longitude]);
            prev.setPopupContent(popup);
            prev._icon.title = v.name;
        } else {
            const customIcon = L.divIcon({ html: iconHtml, className: 'custom-map-icon', iconSize: [32, 32], iconAnchor: [16, 16] });
            const m = L.marker([v.latitude, v.longitude], { icon: customIcon }).addTo(leafletMap).bindPopup(popup);
            fleetMarkers.set(key, m);
        }
    });

    // 2. Plot / move OpenSky Air Cargo Flights
    (telemetry.flights || []).forEach(f => {
        const key = `f_${f.icao24}`;
        flightSeen.add(key);
        const popup = `
            <div style="font-family:var(--font-main); color:#0f172a; min-width:200px;">
                <h4 style="margin:0 0 4px; color:#7e22ce;">✈️ Flight ${f.callsign}</h4>
                <p style="margin:0 0 4px; font-size:12px;"><b>ICAO:</b> ${f.icao24} | <b>Country:</b> ${f.country}</p>
                <p style="margin:0 0 4px; font-size:12px;"><b>Altitude:</b> ${(f.altitude_feet || 0).toLocaleString()} ft • <b>Speed:</b> ${f.speed_kmh} km/h</p>
                <span style="display:inline-block; padding:2px 8px; background:#d8b4fe; border-radius:4px; font-size:11px; font-weight:700; color:#581c87;">Express Air Cargo</span>
            </div>`;

        const iconHtml = `<div class="map-marker-plane" title="Flight ${f.callsign}"><i class="fa-solid fa-plane"></i></div>`;
        const prev = fleetMarkers.get(key);
        if (prev) {
            prev.setLatLng([f.latitude, f.longitude]);
            prev.setPopupContent(popup);
        } else {
            const customIcon = L.divIcon({ html: iconHtml, className: 'custom-map-icon', iconSize: [32, 32], iconAnchor: [16, 16] });
            const m = L.marker([f.latitude, f.longitude], { icon: customIcon }).addTo(leafletMap).bindPopup(popup);
            fleetMarkers.set(key, m);
        }
    });

    // 3. Plot / move Highway Fleet Trucks
    (telemetry.trucks || []).forEach(t => {
        const key = `t_${t.truck_id}`;
        truckSeen.add(key);
        const popup = `
            <div style="font-family:var(--font-main); color:#0f172a; min-width:200px;">
                <h4 style="margin:0 0 4px; color:#047857;">🚛 Fleet Truck #${t.truck_id}</h4>
                <p style="margin:0 0 4px; font-size:12px;"><b>Corridor:</b> ${t.corridor}</p>
                <p style="margin:0 0 4px; font-size:12px;"><b>Speed:</b> ${t.speed_kmh} km/h • <b>Status:</b> ${t.status}</p>
                <span style="display:inline-block; padding:2px 8px; background:#a7f3d0; border-radius:4px; font-size:11px; font-weight:700; color:#065f46;">Highway FTL Van</span>
            </div>`;

        const iconHtml = `<div class="map-marker-truck" title="Truck #${t.truck_id}"><i class="fa-solid fa-truck"></i></div>`;
        const prev = fleetMarkers.get(key);
        if (prev) {
            prev.setLatLng([t.latitude, t.longitude]);
            prev.setPopupContent(popup);
        } else {
            const customIcon = L.divIcon({ html: iconHtml, className: 'custom-map-icon', iconSize: [30, 30], iconAnchor: [15, 15] });
            const m = L.marker([t.latitude, t.longitude], { icon: customIcon }).addTo(leafletMap).bindPopup(popup);
            fleetMarkers.set(key, m);
        }
    });

    // 4. Evict markers whose aircraft left coverage (ships/trucks persist)
    fleetMarkers.forEach((m, key) => {
        if (key.startsWith('f_') && !flightSeen.has(key)) {
            leafletMap.removeLayer(m);
            fleetMarkers.delete(key);
        }
    });
}

function updateTelemetryChips(summary) {
    const shipChip = document.getElementById('chipAisVessels');
    const airChip = document.getElementById('chipOpenSkyFlights');
    const roadChip = document.getElementById('chipRoadTrucks');
    const badge = document.getElementById('aisModeBadge');
    if (shipChip && summary.active_vessels != null) shipChip.textContent = `${summary.active_vessels} Vessels`;
    if (airChip && summary.active_flights != null) airChip.textContent = `${summary.active_flights} Flights`;
    if (roadChip && summary.active_trucks != null) roadChip.textContent = `${summary.active_trucks} Trucks`;
    if (badge) {
        const live = summary.ais_simulated === false;
        badge.textContent = live ? 'LIVE' : 'SIM';
        badge.className = `ais-mode-badge ${live ? 'badge-live' : 'badge-sim'}`;
        badge.title = live
            ? 'AISstream.io satellite feed connected'
            : 'Dead-reckoning simulator active — set AISSTREAM_API_KEY for the live satellite feed';
    }
}

function startTelemetryLoop() {
    if (telemetryPoller) clearInterval(telemetryPoller);
    telemetryPoller = setInterval(async () => {
        if (!authToken || document.getElementById('appContainer').style.display === 'none') return;
        try {
            const res = await authFetch(`${API_BASE}/api/telemetry/live`);
            if (res.ok) {
                const data = await res.json();
                updateFleetMarkers(data);
                updateTelemetryChips(data.summary || {});
            }
        } catch (e) {
            console.warn('Telemetry poll failed:', e.message);
        }
    }, TELEMETRY_POLL_MS);
}

// ------------------------------------------------------------
// EXECUTIVE DASHBOARD CHARTS + MODALITY CARDS
// ------------------------------------------------------------
async function renderDashboardCharts() {
    try {
        const [kpiRes, mktRes, anaRes] = await Promise.all([
            authFetch(`${API_BASE}/api/kpis`),
            authFetch(`${API_BASE}/api/market-stats`),
            authFetch(`${API_BASE}/api/shipments-analytics`)
        ]);
        const kpis = kpiRes.ok ? await kpiRes.json() : null;
        const mkt = mktRes.ok ? await mktRes.json() : null;
        const analytics = anaRes.ok ? await anaRes.json() : null;

        renderDelayByModeChart(kpis ? kpis.late_rate_by_mode : null);
        renderRevenueTrendChart(mkt ? mkt.monthly_revenue : null);
        renderModalityCards(analytics ? analytics.modality_mix : null, kpis ? kpis.late_rate_by_mode : null);
    } catch (e) {
        console.error('Dashboard charts error:', e);
        renderDelayByModeChart(null);
        renderRevenueTrendChart(null);
        renderModalityCards(null, null);
    }
}

function renderDelayByModeChart(lateRateByMode) {
    const el = document.getElementById('delayByModeChart');
    if (!el) return;
    const ctx = el.getContext('2d');
    if (delayByModeChartInstance) delayByModeChartInstance.destroy();

    const order = ['Standard Class', 'Second Class', 'First Class', 'Same Day'];
    const fallback = { 'Standard Class': 39.77, 'Second Class': 79.83, 'First Class': 100.0, 'Same Day': 47.97 };
    const src = lateRateByMode || fallback;
    const labels = order.filter(m => src[m] !== undefined);
    const values = labels.map(m => src[m]);
    const display = labels.map(m => ({ 'Standard Class': '🚢 Ocean', 'Second Class': '🚛 Road FTL', 'First Class': '✈️ Air', 'Same Day': '⚡ Same Day' }[m] || m));
    const colors = values.map(v => v >= 80 ? '#ef4444' : v >= 60 ? '#f59e0b' : '#10b981');

    delayByModeChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: display,
            datasets: [{
                label: 'Late-Delivery Breach Rate (%)',
                data: values,
                backgroundColor: colors,
                borderRadius: 8,
                maxBarThickness: 46
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: c => ` ${c.parsed.y}% of cohort breaches SLA` } }
            },
            scales: {
                y: { min: 0, max: 100, grid: { color: CHART_GRID }, ticks: { color: CHART_TICK, callback: v => `${v}%` } },
                x: { grid: { display: false }, ticks: { color: CHART_LABEL } }
            }
        }
    });
}

function renderRevenueTrendChart(monthlyRevenue) {
    const el = document.getElementById('revenueTrendChart');
    if (!el) return;
    const ctx = el.getContext('2d');
    if (revenueTrendChartInstance) revenueTrendChartInstance.destroy();

    const fallbackMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const months = monthlyRevenue && monthlyRevenue.length ? monthlyRevenue.map(m => m.month) : fallbackMonths;
    const revenue = monthlyRevenue && monthlyRevenue.length ? monthlyRevenue.map(m => m.revenue) : [2920000, 2880000, 3010000, 2650000, 3240000, 2890000];
    const otif = monthlyRevenue && monthlyRevenue.length ? monthlyRevenue.map(m => m.otif_penalties) : [82000, 79000, 83000, 74000, 91000, 81000];

    revenueTrendChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [
                {
                    label: 'Gross Revenue',
                    data: revenue,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.16)',
                    fill: true,
                    tension: 0.35,
                    pointRadius: 3,
                    borderWidth: 2.5,
                    yAxisID: 'y'
                },
                {
                    label: 'OTIF Penalty Leakage',
                    data: otif,
                    borderColor: '#f43f5e',
                    backgroundColor: 'rgba(244, 63, 94, 0.14)',
                    fill: true,
                    tension: 0.35,
                    pointRadius: 3,
                    borderWidth: 2,
                    borderDash: [5, 4],
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: CHART_LABEL, font: { size: 11 } } },
                tooltip: { callbacks: { label: c => ` ${c.dataset.label}: $${(c.parsed.y / 1000000).toFixed(2)}M` } }
            },
            scales: {
                y: { grid: { color: CHART_GRID }, ticks: { color: CHART_TICK, callback: v => `$${(v / 1000000).toFixed(1)}M` } },
                y1: { position: 'right', grid: { display: false }, ticks: { color: '#fb7185', callback: v => `$${(v / 1000).toFixed(0)}k` } },
                x: { grid: { display: false }, ticks: { color: CHART_LABEL } }
            }
        }
    });
}

function renderModalityCards(modalityMix, lateRateByMode) {
    const grid = document.getElementById('modalitySummaryGrid');
    if (!grid) return;

    const meta = {
        'Standard Class': { pill: 'pill-ocean', icon: '🚢', name: 'Ocean TEU Freight (Standard Class)', sla: '4.0 Days' },
        'Second Class': { pill: 'pill-road', icon: '🚛', name: 'Highway FTL Van (Second Class)', sla: '2.0 Days' },
        'First Class': { pill: 'pill-air', icon: '✈️', name: 'Express Air Cargo (First Class)', sla: '1.0 Day' },
        'Same Day': { pill: 'pill-road', icon: '⚡', name: 'Priority Courier (Same Day)', sla: 'Same Day' }
    };
    const order = ['Standard Class', 'Second Class', 'First Class', 'Same Day'];

    const mixByMode = {};
    (modalityMix || []).forEach(m => { mixByMode[m.mode] = m; });
    const rates = lateRateByMode || { 'Standard Class': 39.77, 'Second Class': 79.83, 'First Class': 100.0, 'Same Day': 47.97 };
    const fallbackCounts = { 'Standard Class': [103153, 59.7], 'Second Class': [33806, 19.6], 'First Class': [26513, 15.4], 'Same Day': [9093, 5.3] };

    grid.innerHTML = order.filter(m => rates[m] !== undefined || mixByMode[m]).map(mode => {
        const info = meta[mode];
        const mix = mixByMode[mode];
        const count = mix ? mix.count : fallbackCounts[mode][0];
        const share = mix ? mix.share_pct : fallbackCounts[mode][1];
        const revenue = mix ? mix.revenue_usd : 0;
        const late = rates[mode] !== undefined ? rates[mode] : (mix ? mix.late_rate_pct : 40);
        const tone = late >= 80 ? 'text-danger' : late >= 60 ? 'text-amber' : 'text-emerald';
        const tag = late >= 80 ? '(Critical)' : late >= 60 ? '' : '(Best)';
        return `
            <div class="modality-card glass-panel">
                <div class="modality-header">
                    <span class="modality-pill ${info.pill}">${info.icon} ${info.name}</span>
                    <span class="modality-count">${Number(count).toLocaleString()} Shipments (${share}%)</span>
                </div>
                <div class="modality-stats">
                    <div class="stat-col"><span>Promised SLA:</span> <strong>${info.sla}</strong></div>
                    <div class="stat-col"><span>Late Rate:</span> <strong class="${tone}">${late}% ${tag}</strong></div>
                    <div class="stat-col"><span>Revenue:</span> <strong>$${(revenue / 1000000).toFixed(2)}M</strong></div>
                </div>
            </div>`;
    }).join('');
}

// ========================================================
// 4. SHIPMENTS LEDGER (POSTGRESQL 172K RECORDS)
// ========================================================
let currentCohortStatus = 'all';

function initShipmentsLedger() {
    const searchInput = document.getElementById('shipmentSearchInput');
    const marketSelect = document.getElementById('marketFilterSelect');
    const modeSelect = document.getElementById('modeFilterSelect');
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    const cohortTabs = document.querySelectorAll('.cohort-tab');

    cohortTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            cohortTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentCohortStatus = tab.getAttribute('data-status');
            currentShipmentsPage = 1;
            fetchShipmentsData();
        });
    });

    let debounceTimer = null;
    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            currentShipmentsPage = 1;
            fetchShipmentsData();
        }, 300);
    });

    marketSelect.addEventListener('change', () => {
        currentShipmentsPage = 1;
        fetchShipmentsData();
    });

    modeSelect.addEventListener('change', () => {
        currentShipmentsPage = 1;
        fetchShipmentsData();
    });

    prevBtn.addEventListener('click', () => {
        if (currentShipmentsPage > 1) {
            currentShipmentsPage--;
            fetchShipmentsData();
        }
    });

    nextBtn.addEventListener('click', () => {
        currentShipmentsPage++;
        fetchShipmentsData();
    });

    fetchShipmentsData();
    renderShipmentsAnalytics();
}

// ------------------------------------------------------------
// SHIPMENTS LEDGER ANALYTICS STRIP (CHARTS + COHORT COUNTS)
// ------------------------------------------------------------
async function renderShipmentsAnalytics() {
    try {
        const res = await authFetch(`${API_BASE}/api/shipments-analytics`);
        const d = res.ok ? await res.json() : null;
        if (!d) return;

        // Cohort tab counts
        const ccAll = document.getElementById('cohortCountAll');
        const ccT = document.getElementById('cohortCountTransit');
        const ccE = document.getElementById('cohortCountExceptions');
        if (ccAll) ccAll.textContent = Number(d.total).toLocaleString();
        if (ccT) ccT.textContent = Number(d.active_in_transit).toLocaleString();
        if (ccE) ccE.textContent = Number(d.critical_exceptions).toLocaleString();

        // 1. Risk histogram
        const rhEl = document.getElementById('riskHistogramChart');
        if (rhEl) {
            const ctx = rhEl.getContext('2d');
            if (riskHistogramChartInstance) riskHistogramChartInstance.destroy();
            riskHistogramChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: d.risk_histogram.map(b => b.bucket),
                    datasets: [{
                        data: d.risk_histogram.map(b => b.count),
                        backgroundColor: ['#10b981', '#f59e0b', '#f97316', '#ef4444'],
                        borderRadius: 8,
                        maxBarThickness: 42
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: { callbacks: { label: c => ` ${Number(c.parsed.y).toLocaleString()} shipments` } }
                    },
                    scales: {
                        y: { grid: { color: CHART_GRID }, ticks: { color: CHART_TICK, callback: v => `${(v / 1000).toFixed(0)}k` } },
                        x: { grid: { display: false }, ticks: { color: CHART_LABEL, font: { size: 10 } } }
                    }
                }
            });
        }

        // 2. Fleet modality mix doughnut
        const mmEl = document.getElementById('modalityMixChart');
        if (mmEl) {
            const ctx = mmEl.getContext('2d');
            if (modalityMixChartInstance) modalityMixChartInstance.destroy();
            modalityMixChartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: d.modality_mix.map(m => `${m.mode} (${m.share_pct}%)`),
                    datasets: [{
                        data: d.modality_mix.map(m => m.count),
                        backgroundColor: ['#2563eb', '#9333ea', '#ea580c', '#db2777'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '62%',
                    plugins: {
                        legend: { position: 'bottom', labels: { color: CHART_LABEL, font: { size: 10.5 }, boxWidth: 12 } },
                        tooltip: { callbacks: { label: c => ` ${Number(c.parsed).toLocaleString()} shipments` } }
                    }
                }
            });
        }

        // 3. Top cargo categories by breach rate (dual axis)
        const cbEl = document.getElementById('categoryBreachChart');
        if (cbEl) {
            const ctx = cbEl.getContext('2d');
            if (categoryBreachChartInstance) categoryBreachChartInstance.destroy();
            categoryBreachChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: d.top_categories.map(c => c.category),
                    datasets: [
                        { label: 'Order Lines', data: d.top_categories.map(c => c.count), backgroundColor: 'rgba(59, 130, 246, 0.75)', borderRadius: 6, yAxisID: 'y', maxBarThickness: 26 },
                        { label: 'Late Breach %', type: 'line', data: d.top_categories.map(c => c.late_rate_pct), borderColor: '#f43f5e', backgroundColor: '#f43f5e', yAxisID: 'y1', pointRadius: 4, borderWidth: 2.5, tension: 0.3 }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { color: CHART_LABEL, font: { size: 10.5 } } }
                    },
                    scales: {
                        y: { grid: { color: CHART_GRID }, ticks: { color: CHART_TICK, callback: v => `${(v / 1000).toFixed(0)}k` } },
                        y1: { position: 'right', min: 0, max: 100, grid: { display: false }, ticks: { color: '#fb7185', callback: v => `${v}%` } },
                        x: { grid: { display: false }, ticks: { color: CHART_LABEL, font: { size: 9.5 }, maxRotation: 42, minRotation: 30 } }
                    }
                }
            });
        }
    } catch (e) {
        console.error('Shipments analytics fetch error:', e);
    }
}

async function fetchShipmentsData() {
    const search = document.getElementById('shipmentSearchInput').value;
    const market = document.getElementById('marketFilterSelect').value;
    const mode = document.getElementById('modeFilterSelect').value;

    let url = `${API_BASE}/api/shipments?page=${currentShipmentsPage}&limit=25`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (market && market !== 'all') url += `&market=${encodeURIComponent(market)}`;
    if (mode && mode !== 'all') url += `&shipping_mode=${encodeURIComponent(mode)}`;
    if (currentCohortStatus === 'in_transit') url += `&risk_level=active`;
    if (currentCohortStatus === 'exceptions') url += `&risk_level=critical`;

    try {
        const res = await authFetch(url);
        if (res.ok) {
            const result = await res.json();
            renderShipmentsTable(result);
        }
    } catch (err) {
        console.error('Error fetching shipments:', err);
    }
}

function renderShipmentsTable(result) {
    const tbody = document.getElementById('shipmentsTableBody');
    const records = result.data || [];
    
    if (records.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:30px; color:var(--text-dim);">No shipment records found matching criteria.</td></tr>`;
        return;
    }

    tbody.innerHTML = records.map(r => {
        let modBadge = '<span class="modality-pill pill-ocean">🚢 Ocean TEU</span>';
        if (r.shipping_mode === 'First Class') modBadge = '<span class="modality-pill pill-air">✈️ Air Cargo ULD</span>';
        else if (r.shipping_mode === 'Second Class') modBadge = '<span class="modality-pill pill-road">🚛 Highway FTL</span>';
        else if (r.shipping_mode === 'Same Day') modBadge = '<span class="modality-pill pill-road">⚡ Express Courier</span>';

        const isRisk = r.delay_risk_pct >= 50;
        const statusBadge = isRisk 
            ? `<span class="badge-status status-risk">${r.delay_risk_pct}% Risk</span>` 
            : `<span class="badge-status status-ok">${r.delay_risk_pct}% Safe</span>`;

        return `
            <tr>
                <td><strong>${r.order_id}</strong></td>
                <td>
                    <div style="font-weight:600;">${r.product_name}</div>
                    <div style="font-size:11px; color:var(--text-dim);">${r.category_name} • ${r.department_name}</div>
                </td>
                <td>
                    <div><strong>${r.market}</strong></div>
                    <div style="font-size:11.5px; color:var(--text-muted);">${r.order_city || r.order_region}, ${r.order_country || ''}</div>
                </td>
                <td>${modBadge}</td>
                <td><strong>${r.days_for_shipment_scheduled}d Target</strong></td>
                <td><strong>$${Number(r.sales).toFixed(2)}</strong></td>
                <td>${statusBadge}</td>
                <td><span style="font-size:12px; font-weight:600; color:${isRisk ? 'var(--rose)' : 'var(--emerald)'};">${r.status_label}</span></td>
                <td>
                    <button class="btn-glass" style="padding:4px 10px; font-size:12px;" onclick="loadOrderToPredictor('${r.order_id}', '${r.shipping_mode}', ${r.days_for_shipment_scheduled}, ${r.sales})">
                        <i class="fa-solid fa-bolt"></i> Predict
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    // Pagination info
    const startIdx = (result.page - 1) * result.limit + 1;
    const endIdx = Math.min(result.page * result.limit, result.total);
    document.getElementById('paginationInfo').textContent = `Showing ${startIdx.toLocaleString()} to ${endIdx.toLocaleString()} of ${result.total.toLocaleString()} records`;
    document.getElementById('currentPageBadge').textContent = `Page ${result.page} of ${result.total_pages.toLocaleString()}`;
    
    document.getElementById('prevPageBtn').disabled = (result.page <= 1);
    document.getElementById('nextPageBtn').disabled = (result.page >= result.total_pages);
}

window.loadOrderToPredictor = function(orderId, mode, scheduled, sales) {
    document.getElementById('simOrderId').value = orderId;
    document.getElementById('simShippingMode').value = mode;
    document.getElementById('simScheduledDays').value = scheduled;
    document.getElementById('simSales').value = sales;
    
    switchView('predictions');
    document.getElementById('predictionSimulatorForm').dispatchEvent(new Event('submit'));
};

// ========================================================
// 5. XGBOOST PREDICTION SIMULATOR & SHAP
// ========================================================
function initSimulator() {
    const form = document.getElementById('predictionSimulatorForm');
    const approveBtn = document.getElementById('approveRerouteBtn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            order_id: document.getElementById('simOrderId').value,
            shipping_mode: document.getElementById('simShippingMode').value,
            days_for_shipment_scheduled: parseInt(document.getElementById('simScheduledDays').value),
            sales: parseFloat(document.getElementById('simSales').value),
            distance_km: parseFloat(document.getElementById('simDistance').value),
            simulated_delay_hrs: parseFloat(document.getElementById('simDelayHrs').value)
        };

        try {
            const res = await authFetch(`${API_BASE}/api/predict`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const data = await res.json();
                updatePredictionUI(data);
            }
        } catch (err) {
            console.error('Prediction inference error:', err);
        }
    });

    approveBtn.addEventListener('click', async () => {
        const orderId = document.getElementById('simOrderId').value;
        const prob = parseFloat(document.getElementById('aiRiskPct').textContent) / 100.0;

        try {
            const res = await authFetch(`${API_BASE}/api/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    order_id: orderId,
                    action: 'APPROVE_AIR_REROUTE',
                    predicted_prob: prob
                })
            });

            if (res.ok) {
                alert(`✅ Decision Logged! Order ${orderId} rerouted to Priority Air Cargo. Contractual OTIF fine of $1,200 avoided!`);
            }
        } catch (err) {
            console.error('Feedback logging error:', err);
        }
    });
}

function updatePredictionUI(data) {
    const riskPct = (data.late_delivery_risk_probability * 100).toFixed(1);
    document.getElementById('aiRiskPct').textContent = `${riskPct}%`;
    document.getElementById('aiRiskLabel').textContent = data.is_at_risk ? 'CRITICAL BREACH RISK' : 'ON-TIME CONFIDENCE';
    document.getElementById('aiPredictedDays').textContent = `${data.predicted_transit_days} Days`;

    // Update gauge stroke offset (circumference ~ 251.2)
    const offset = 251.2 * (1 - (data.late_delivery_risk_probability));
    const path = document.getElementById('gaugeProgressPath');
    path.style.strokeDashoffset = Math.max(0, Math.min(251.2, offset));
    path.style.stroke = data.is_at_risk ? 'var(--rose)' : 'var(--emerald)';

    // Prescriptive action card, live from inference payload
    if (data.prescriptive) {
        const p = data.prescriptive;
        const air = Number(p.air_reroute_cost_usd), fine = Number(p.otif_fine_usd), net = Number(p.net_benefit_reroute_usd);
        document.getElementById('preAirCost').textContent = `+$${air.toFixed(0)}`;
        document.getElementById('preOtifFine').textContent = `-$${fine.toFixed(0)}`;
        document.getElementById('preNetSavings').textContent = `${net >= 0 ? '+' : '-'}$${Math.abs(net).toFixed(0)} USD`;
        document.getElementById('preNetSavings').className = net >= 0 ? 'text-emerald' : 'text-rose';
        document.getElementById('preRerouteDesc').textContent =
            `Re-routing ${data.order_id} through the Mumbai-Schiphol Air Corridor at ${riskPct}% breach risk eliminates the $${fine.toFixed(0)} contractual OTIF penalty for a minor $${air.toFixed(0)} expedite cost.`;
    }

    // Update SHAP Chart + TCO composition
    renderShapChart(data.shap_drivers || []);
    renderTcoChart(data.tco || null);
}

// ------------------------------------------------------------
// TCO COMPOSITION CHART (LANDED COST STACK)
// ------------------------------------------------------------
function renderTcoChart(tco) {
    const el = document.getElementById('tcoChart');
    if (!el) return;
    const ctx = el.getContext('2d');
    if (tcoChartInstance) tcoChartInstance.destroy();

    const t = tco || { base_freight_usd: 450.0, demurrage_usd: 600.0, otif_penalty_usd: 135.0, holding_cost_usd: 45.0, total_tco_usd: 1230.0, net_profit_after_tco_usd: -780.0 };
    const profit = document.getElementById('tcoNetProfit');
    if (profit) {
        const net = Number(t.net_profit_after_tco_usd);
        profit.textContent = `Net Profit After TCO: ${net >= 0 ? '+' : '-'}$${Math.abs(net).toLocaleString()}`;
        profit.classList.toggle('negative', net < 0);
    }

    tcoChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Landed TCO Stack'],
            datasets: [
                { label: 'Base Freight', data: [t.base_freight_usd], backgroundColor: 'rgba(59, 130, 246, 0.85)' },
                { label: 'Demurrage Accrual', data: [t.demurrage_usd], backgroundColor: 'rgba(139, 92, 246, 0.85)' },
                { label: 'OTIF Penalty', data: [t.otif_penalty_usd], backgroundColor: 'rgba(244, 63, 94, 0.85)' },
                { label: 'Inventory Holding', data: [t.holding_cost_usd], backgroundColor: 'rgba(245, 158, 11, 0.85)' }
            ]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: CHART_LABEL, font: { size: 11 } } },
                tooltip: { callbacks: { label: c => ` ${c.dataset.label}: $${Number(c.parsed.x).toLocaleString()}` } }
            },
            scales: {
                x: { stacked: true, grid: { color: CHART_GRID }, ticks: { color: CHART_TICK, callback: v => `$${v.toLocaleString()}` } },
                y: { stacked: true, grid: { display: false }, ticks: { color: CHART_LABEL } }
            }
        }
    });
}

function renderShapChart(drivers = []) {
    const ctx = document.getElementById('shapChart').getContext('2d');
    if (shapChartInstance) shapChartInstance.destroy();

    const labels = drivers.length > 0 ? drivers.map(d => d.feature) : [
        'Shipping Mode (SLA Infeasibility)',
        'Scheduled SLA Duration (1-Day Promising)',
        'Port Dwell Congestion (Rotterdam Anchor)',
        'Trade Corridor Weather Index',
        'Customer Segment (Corporate Priority)'
    ];

    const values = drivers.length > 0 ? drivers.map(d => d.impact) : [54.0, 21.0, 14.2, 3.8, 2.1];

    shapChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'SHAP Delay Impact (%)',
                data: values,
                backgroundColor: ['#ef4444', '#f97316', '#f59e0b', '#3b82f6', '#10b981'],
                borderRadius: 6
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.06)' },
                    ticks: { color: '#94a3b8' }
                },
                y: {
                    grid: { display: false },
                    ticks: { color: '#f8fafc', font: { size: 12 } }
                }
            }
        }
    });
}

// ========================================================
// 6. DEMURRAGE & FINANCIALS VIEW (LIVE SQL / SANDBOX)
// ========================================================
async function renderDemurrageView() {
    try {
        const res = await authFetch(`${API_BASE}/api/demurrage`);
        const data = res.ok ? await res.json() : null;

        // --- Metric cards ---
        if (data && data.summary) {
            const s = data.summary;
            document.getElementById('demTotalTeu').textContent = `${Number(s.total_containers).toLocaleString()} TEU`;
            document.getElementById('demTotalExposure').textContent = `$${Number(s.current_total_cost_usd).toLocaleString()}`;
            document.getElementById('demFreeCount').textContent = `${Number(s.free_period_count).toLocaleString()} TEU`;
            document.getElementById('demT1Count').textContent = `${Number(s.first_period_count).toLocaleString()} TEU`;
            document.getElementById('demT3Count').textContent = `${Number(s.third_period_count).toLocaleString()} TEU`;
        }

        // --- Ticking dwell clocks ---
        if (data && data.by_port) {
            const list = document.getElementById('dwellClockList');
            list.innerHTML = data.by_port.map(p => {
                const overdueDays = Math.max(0, p.avg_dwell_days - 4);
                const badgeCls = overdueDays >= 3 ? 'badge-danger' : overdueDays >= 1 ? 'badge-amber' : 'badge-emerald';
                const rateCls = p.daily_rate_usd >= 1000 ? 'text-rose' : (p.daily_rate_usd >= 400 ? 'text-rose' : 'text-amber');
                const oDays = Math.floor(overdueDays), oHours = Math.round((overdueDays % 1) * 24);
                return `
                    <div class="dwell-clock-item">
                        <div class="dwell-top">
                            <strong>${p.port_name}, ${p.country}</strong>
                            <span class="${badgeCls}">${oDays}d ${String(oHours).padStart(2, '0')}h Overdue</span>
                        </div>
                        <div class="dwell-details">
                            <span>Avg Dwell: ${p.avg_dwell_days} Days • ${Number(p.containers_at_risk).toLocaleString()} Containers At Risk</span>
                            <strong class="${rateCls}">$${Number(p.daily_rate_usd).toLocaleString()} / Day Rate</strong>
                        </div>
                    </div>`;
            }).join('');
        }

        // --- Tiers chart ---
        const ctx = document.getElementById('demurrageTiersChart').getContext('2d');
        if (demurrageChartInstance) demurrageChartInstance.destroy();

        const labels = data && data.tiers ? data.tiers.map(t => t.period) : ['Free Period (0-4d)', 'Tier 1 (5-7d)', 'Tier 2 (8-10d)', 'Tier 3 (10+d)'];
        const values = data && data.tiers ? data.tiers.map(t => t.total_cost_usd) : [0, 160000, 97500, 270000];
        const colors = data && data.tiers ? data.tiers.map(t => t.color) : ['#3b82f6', '#8b5cf6', '#ec4899', '#ef4444'];

        demurrageChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Total Demurrage Cost ($ USD)',
                        data: values,
                        backgroundColor: colors,
                        borderRadius: 8
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        grid: { color: 'rgba(255,255,255,0.06)' },
                        ticks: { color: '#94a3b8', callback: v => `$${v.toLocaleString()}` }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#f8fafc', font: { size: 10.5 } }
                    }
                }
            }
        });
    } catch (e) {
        console.error('Demurrage view fetch error:', e);
    }
}

// ========================================================
// 7. SIX SIGMA SPC COMPLIANCE VIEW (LIVE SQL / SANDBOX)
// ========================================================
async function renderComplianceView() {
    const ctx = document.getElementById('spcChart').getContext('2d');
    if (spcChartInstance) spcChartInstance.destroy();

    try {
        const res = await authFetch(`${API_BASE}/api/spc`);
        const data = res.ok ? await res.json() : null;

        const months = data && data.monthly_data ? data.monthly_data.map(m => m.month) : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const leadTimes = data && data.monthly_data ? data.monthly_data.map(m => m.mean_lead_time) : [3.2, 2.6, 3.3, 4.1, 6.4, 4.4, 4.6, 3.6, 3.9, 3.3, 6.8, 2.3];
        const ucl = data ? data.ucl : 6.21;
        const xBar = data ? data.x_bar : 3.56;
        const lcl = data ? data.lcl : 0.91;

        // --- metric cards + legend ---
        if (data) {
            document.getElementById('spcUcl').textContent = `${data.ucl} Days`;
            document.getElementById('spcMean').textContent = `${data.x_bar} Days`;
            document.getElementById('spcLcl').textContent = `${data.lcl} Days`;
            document.getElementById('spcSigma').textContent = `${data.sigma_level}σ`;
            document.getElementById('spcDpmo').textContent = `${Number(data.dpmo).toLocaleString()} DPMO (Defects / Million)`;
            document.getElementById('legUcl').textContent = `${data.ucl}d`;
            document.getElementById('legMean').textContent = `${data.x_bar}d`;
            document.getElementById('legLcl').textContent = `${data.lcl}d`;
        }

        // --- SLA compliance grid + late-by-modality chart ---
        renderSlaGrid(data ? data.sla_grid : null);
        renderSlaModeChart(data ? data.sla_grid : null);

        spcChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: months,
                datasets: [
                    {
                        label: `Upper Control Limit (UCL = ${ucl}d)`,
                        data: Array(months.length).fill(ucl),
                        borderColor: '#f43f5e',
                        borderDash: [6, 6],
                        pointRadius: 0,
                        borderWidth: 2
                    },
                    {
                        label: `Process Mean (μ = ${xBar}d)`,
                        data: Array(months.length).fill(xBar),
                        borderColor: '#3b82f6',
                        borderDash: [4, 4],
                        pointRadius: 0,
                        borderWidth: 2
                    },
                    {
                        label: `Lower Control Limit (LCL = ${lcl}d)`,
                        data: Array(months.length).fill(lcl),
                        borderColor: '#10b981',
                        borderDash: [6, 6],
                        pointRadius: 0,
                        borderWidth: 2
                    },
                    {
                        label: 'Monthly Lead Time (Days)',
                        data: leadTimes,
                        borderColor: '#f8fafc',
                        backgroundColor: '#f8fafc',
                        pointBackgroundColor: leadTimes.map(v => v > ucl ? '#ef4444' : '#3b82f6'),
                        pointRadius: leadTimes.map(v => v > ucl ? 8 : 4),
                        pointHoverRadius: 9,
                        borderWidth: 2.5,
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { labels: { color: '#f8fafc', font: { size: 12 } } }
                },
                scales: {
                    y: {
                        grid: { color: 'rgba(255,255,255,0.06)' },
                        ticks: { color: '#94a3b8', callback: v => `${v}d` },
                        min: 0,
                        max: Math.ceil(ucl + 2)
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#f8fafc' }
                    }
                }
            }
        });
    } catch (e) {
        console.error('SPC chart fetch error:', e);
    }
}

function renderSlaGrid(slaGrid) {
    const box = document.getElementById('slaGridList');
    if (!box) return;
    const fallback = [
        { mode: 'Standard Class', promised_days: 4.0, actual_avg_days: 4.58, late_rate_pct: 39.77, status: 'NORMAL' },
        { mode: 'Second Class', promised_days: 2.0, actual_avg_days: 3.14, late_rate_pct: 79.83, status: 'HIGH' },
        { mode: 'First Class', promised_days: 1.0, actual_avg_days: 2.50, late_rate_pct: 100.0, status: 'CRITICAL' },
        { mode: 'Same Day', promised_days: 0.0, actual_avg_days: 0.72, late_rate_pct: 47.97, status: 'MODERATE' }
    ];
    const rows = (slaGrid && slaGrid.length ? slaGrid : fallback);
    const icon = { 'Standard Class': '🚢', 'Second Class': '🚛', 'First Class': '✈️', 'Same Day': '⚡' };
    box.innerHTML = rows.map(r => `
        <div class="sla-row">
            <div class="sla-mode">${icon[r.mode] || '📦'} ${r.mode}</div>
            <div class="sla-metric"><strong>${r.promised_days}d</strong>Promised SLA</div>
            <div class="sla-metric"><strong>${r.actual_avg_days}d</strong>Actual Avg</div>
            <div class="sla-metric"><strong>${r.late_rate_pct}%</strong>Late Breach Rate</div>
            <span class="sla-status-pill sla-status-${r.status}">${r.status}</span>
        </div>
    `).join('');
}

function renderSlaModeChart(slaGrid) {
    const el = document.getElementById('slaModeChart');
    if (!el) return;
    const ctx = el.getContext('2d');
    if (slaModeChartInstance) slaModeChartInstance.destroy();

    const fallback = [
        { mode: 'Standard Class', late_rate_pct: 39.77 },
        { mode: 'Second Class', late_rate_pct: 79.83 },
        { mode: 'First Class', late_rate_pct: 100.0 },
        { mode: 'Same Day', late_rate_pct: 47.97 }
    ];
    const rows = (slaGrid && slaGrid.length ? slaGrid : fallback).slice().sort((a, b) => b.late_rate_pct - a.late_rate_pct);
    slaModeChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: rows.map(r => r.mode),
            datasets: [{
                label: 'Late Breach Rate (%)',
                data: rows.map(r => r.late_rate_pct),
                backgroundColor: rows.map(r => r.late_rate_pct >= 80 ? '#ef4444' : r.late_rate_pct >= 50 ? '#f59e0b' : '#10b981'),
                borderRadius: 7,
                maxBarThickness: 34
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: c => ` ${c.parsed.x}% of ${rows[c.dataIndex].mode} cohort breaches` } }
            },
            scales: {
                x: { min: 0, max: 100, grid: { color: CHART_GRID }, ticks: { color: CHART_TICK, callback: v => `${v}%` } },
                y: { grid: { display: false }, ticks: { color: CHART_LABEL, font: { size: 11.5 } } }
            }
        }
    });
}

// ========================================================
// 8. MARKET & SEGMENTS CHARTS (LIVE SQL)
// ========================================================
async function renderMarketCharts() {
    try {
        const res = await authFetch(`${API_BASE}/api/market-stats`);
        const data = res.ok ? await res.json() : null;

        // 1. Customer Segments Donut (Live SQL)
        const segCtx = document.getElementById('customerSegmentsChart').getContext('2d');
        if (segmentChartInstance) segmentChartInstance.destroy();

        const segLabels = data && data.segments ? data.segments.map(s => `${s.segment} (${s.share_pct}%)`) : ['Consumer (51.8%)', 'Corporate (30.4%)', 'Home Office (17.8%)'];
        const segData = data && data.segments ? data.segments.map(s => s.revenue_usd) : [18240000, 10707000, 6266000];

        segmentChartInstance = new Chart(segCtx, {
            type: 'doughnut',
            data: {
                labels: segLabels,
                datasets: [{
                    data: segData,
                    backgroundColor: ['#3b82f6', '#8b5cf6', '#10b981'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#f8fafc', padding: 16 } }
                },
                cutout: '65%'
            }
        });

        // 2. Regional Sales Bar (Live SQL)
        const mktCtx = document.getElementById('marketSalesChart').getContext('2d');
        if (marketChartInstance) marketChartInstance.destroy();

        const mktLabels = data && data.markets ? data.markets.map(m => `${m.market} ($${(m.revenue_usd/1000000).toFixed(1)}M)`) : ['LATAM ($9.82M)', 'Europe ($10.41M)', 'Pacific Asia ($7.94M)', 'USCA ($4.84M)', 'Africa ($2.21M)'];
        const mktData = data && data.markets ? data.markets.map(m => m.revenue_usd) : [9824329, 10405371, 7942351, 4836413, 2205963];

        marketChartInstance = new Chart(mktCtx, {
            type: 'bar',
            data: {
                labels: mktLabels,
                datasets: [{
                    label: 'Gross Sales ($ USD)',
                    data: mktData,
                    backgroundColor: ['#2563eb', '#9333ea', '#059669', '#ea580c', '#db2777'],
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        grid: { color: 'rgba(255,255,255,0.06)' },
                        ticks: { color: '#94a3b8', callback: v => `$${(v/1000000).toFixed(1)}M` }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#f8fafc', font: { size: 11 } }
                    }
                }
            }
        });

        // 3. Monthly revenue / margin / OTIF trend (Live SQL)
        renderMarketTrendChart(data ? data.monthly_revenue : null);
    } catch (e) {
        console.error('Market chart fetch error:', e);
        renderMarketTrendChart(null);
    }
}

function renderMarketTrendChart(monthlyRevenue) {
    const el = document.getElementById('marketTrendChart');
    if (!el) return;
    const ctx = el.getContext('2d');
    if (marketTrendChartInstance) marketTrendChartInstance.destroy();

    const months = monthlyRevenue && monthlyRevenue.length ? monthlyRevenue.map(m => m.month) : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const revenue = monthlyRevenue && monthlyRevenue.length ? monthlyRevenue.map(m => m.revenue) : [2920000, 2880000, 3010000, 2650000, 3240000, 2890000];
    const profit = monthlyRevenue && monthlyRevenue.length ? monthlyRevenue.map(m => m.profit) : [315000, 311000, 325000, 286000, 349000, 312000];
    const otif = monthlyRevenue && monthlyRevenue.length ? monthlyRevenue.map(m => m.otif_penalties) : [82000, 79000, 83000, 74000, 91000, 81000];

    marketTrendChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [
                { label: 'Gross Revenue', data: revenue, backgroundColor: 'rgba(59, 130, 246, 0.75)', borderRadius: 6, yAxisID: 'y' },
                { label: 'Net Profit', data: profit, backgroundColor: 'rgba(16, 185, 129, 0.75)', borderRadius: 6, yAxisID: 'y' },
                { label: 'OTIF Penalties', type: 'line', data: otif, borderColor: '#f43f5e', backgroundColor: '#f43f5e', pointRadius: 4, borderWidth: 2.5, tension: 0.3, yAxisID: 'y1' }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: CHART_LABEL, font: { size: 11 } } },
                tooltip: {
                    callbacks: {
                        label: c => c.parsed.y > 100000
                            ? ` ${c.dataset.label}: $${(c.parsed.y / 1000000).toFixed(2)}M`
                            : ` ${c.dataset.label}: $${(c.parsed.y / 1000).toFixed(1)}k`
                    }
                }
            },
            scales: {
                y: { grid: { color: CHART_GRID }, ticks: { color: CHART_TICK, callback: v => `$${(v / 1000000).toFixed(1)}M` } },
                y1: { position: 'right', grid: { display: false }, ticks: { color: '#fb7185', callback: v => `$${(v / 1000).toFixed(0)}k` } },
                x: { grid: { display: false }, ticks: { color: CHART_LABEL } }
            }
        }
    });
}

// ========================================================
// 9. SCOPE 3 EMISSIONS VIEW (LIVE SQL / SANDBOX)
// ========================================================
async function renderEmissionsView() {
    const ctx = document.getElementById('emissionsModalChart').getContext('2d');
    if (emissionsChartInstance) emissionsChartInstance.destroy();

    try {
        const res = await authFetch(`${API_BASE}/api/emissions`);
        const data = res.ok ? await res.json() : null;

        const labels = data && data.by_mode ? data.by_mode.map(b => `${b.mode} (${b.share_pct}%)`) : ['Ocean Vessel (42.5%)', 'Road Truckload (21.0%)', 'Air Cargo (20.5%)', 'Rail Intermodal (16.0%)'];
        const values = data && data.by_mode ? data.by_mode.map(b => b.co2_kg ?? b.co2e_kg) : [341354, 168670, 164653, 128511];
        const colors = data && data.by_mode ? data.by_mode.map(b => b.color || '#3b82f6') : ['#2563eb', '#ea580c', '#9333ea', '#db2777'];

        // --- Top-line metric cards ---
        if (data) {
            const find = m => (data.by_mode || []).find(b => b.mode === m);
            const ocean = find('Standard Class'), air = find('First Class'), road = find('Second Class');
            document.getElementById('emTotal').textContent = `${Math.round(data.total_co2_kg).toLocaleString()} kg`;
            document.getElementById('emYoy').textContent = `${data.yoy_change_pct}% YoY Emission Reduction`;
            if (ocean) {
                document.getElementById('emOcean').textContent = `${Math.round(ocean.co2_kg).toLocaleString()} kg`;
                document.getElementById('emOceanShare').textContent = `${ocean.share_pct}% of Corporate Carbon Footprint`;
            }
            if (air) {
                document.getElementById('emAir').textContent = `${Math.round(air.co2_kg).toLocaleString()} kg`;
                document.getElementById('emAirShare').textContent = `${air.share_pct}% (High Carbon Intensity)`;
            }
            if (road) {
                document.getElementById('emRoad').textContent = `${Math.round(road.co2_kg).toLocaleString()} kg`;
                document.getElementById('emRoadShare').textContent = `${road.share_pct}% Heavy Trucking`;
            }
        }

        // --- Corridor intensity table ---
        if (data && data.by_route) {
            const tbody = document.getElementById('corridorTableBody');
            tbody.innerHTML = data.by_route.map(r => {
                const pill = r.mode === 'First Class' ? '<span class="modality-pill pill-air">✈️ Air Cargo</span>'
                    : r.mode === 'Second Class' ? '<span class="modality-pill pill-road">🚛 Road FTL</span>'
                    : r.mode === 'Same Day' ? '<span class="modality-pill pill-road">⚡ Same Day</span>'
                    : '<span class="modality-pill pill-ocean">🚢 Ocean TEU</span>';
                return `<tr>
                    <td>${r.route}</td>
                    <td>${pill}</td>
                    <td>${Number(r.distance_km).toLocaleString()} km</td>
                    <td><strong>${Number(r.co2_output_kg).toLocaleString()} kg</strong></td>
                </tr>`;
            }).join('');
        }

        // --- Modality doughnut ---
        emissionsChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: colors,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#f8fafc', padding: 16 } },
                    tooltip: { callbacks: { label: c => ` ${c.label}: ${Number(c.parsed).toLocaleString()} kg CO₂e` } }
                },
                cutout: '60%'
            }
        });

        // --- Monthly stacked trend ---
        renderEmissionsTrendChart(data ? data.monthly_trend : null);
    } catch (e) {
        console.error('Emissions chart fetch error:', e);
    }
}

function renderEmissionsTrendChart(monthlyTrend) {
    const el = document.getElementById('emissionsTrendChart');
    if (!el) return;
    const ctx = el.getContext('2d');
    if (emissionsTrendChartInstance) emissionsTrendChartInstance.destroy();

    const months = monthlyTrend && monthlyTrend.length ? monthlyTrend.map(m => m.month) : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const pick = k => monthlyTrend && monthlyTrend.length ? monthlyTrend.map(m => m[k]) : [52000, 51000, 53000, 49000, 56000, 50000];

    emissionsTrendChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [
                { label: '🚢 Ocean TEU', data: pick('ocean'), backgroundColor: '#2563eb', borderRadius: 4 },
                { label: '✈️ Air Cargo', data: pick('air'), backgroundColor: '#9333ea', borderRadius: 4 },
                { label: '🚛 Road FTL', data: pick('road'), backgroundColor: '#ea580c', borderRadius: 4 },
                { label: '🚂 Rail/Same-Day', data: pick('rail'), backgroundColor: '#db2777', borderRadius: 4 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: CHART_LABEL, font: { size: 11 } } },
                tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${Number(c.parsed.y).toLocaleString()} kg CO₂e` } }
            },
            scales: {
                y: { stacked: true, grid: { color: CHART_GRID }, ticks: { color: CHART_TICK, callback: v => `${(v / 1000).toFixed(0)}t` } },
                x: { stacked: true, grid: { display: false }, ticks: { color: CHART_LABEL } }
            }
        }
    });
}

// ========================================================
// 10. AI DISPATCHER COPILOT (GROQ & SOP RAG)
// ========================================================
function initAiCopilot() {
    const copilotBtn = document.getElementById('aiCopilotBtn');
    const chatDrawer = document.getElementById('aiChatDrawer');
    const closeBtn = document.getElementById('closeAiChatBtn');
    const chatForm = document.getElementById('chatInputForm');
    const chatInput = document.getElementById('chatUserInput');
    const messagesBox = document.getElementById('chatMessagesBox');
    const quickChips = document.querySelectorAll('.quick-chip');

    let chatHistory = [];

    copilotBtn.addEventListener('click', async () => {
        chatDrawer.style.display = chatDrawer.style.display === 'none' ? 'flex' : 'none';
        if (chatDrawer.style.display === 'flex') {
            chatInput.focus();
            if (!aisSnapshotShown && authToken) {
                aisSnapshotShown = true;
                try {
                    const [kRes, tRes] = await Promise.all([
                        authFetch(`${API_BASE}/api/kpis`),
                        authFetch(`${API_BASE}/api/telemetry/live`)
                    ]);
                    if (kRes.ok && tRes.ok) {
                        const k = await kRes.json();
                        const t = await tRes.json();
                        const s = t.summary || {};
                        appendChatMessage('ai',
                            `🛰️ **Live Ops Snapshot:** ${Number(s.active_vessels || 0)} ocean vessels (${(s.ais_mode || 'simulated').toUpperCase()} AIS), ` +
                            `${s.active_flights || 0} air-cargo transponders, ${s.active_trucks || 0} highway fleets. ` +
                            `On-time SLA: **${k.on_time_percentage}%** • Critical exceptions: **${Number(k.critical_exceptions).toLocaleString()}** • ` +
                            `Demurrage exposure: **$${Number(k.total_demurrage_risk).toLocaleString()}**. Ask away!`);
                    }
                } catch (e) { /* snapshot is best-effort */ }
            }
        }
    });

    closeBtn.addEventListener('click', () => {
        chatDrawer.style.display = 'none';
    });

    quickChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const promptText = chip.getAttribute('data-prompt');
            chatInput.value = promptText;
            chatForm.dispatchEvent(new Event('submit'));
        });
    });

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userMsg = chatInput.value.trim();
        if (!userMsg) return;

        // Append User Bubble
        appendChatMessage('user', userMsg);
        chatInput.value = '';

        // Add Loading Bubble
        const loadingId = appendChatLoading();

        try {
            const res = await authFetch(`${API_BASE}/api/ai/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMsg,
                    history: chatHistory
                })
            });

            removeChatLoading(loadingId);

            if (res.ok) {
                const data = await res.json();
                appendChatMessage('ai', data.reply);
                if (data.provider) {
                    const tag = document.getElementById('copilotProviderTag');
                    if (tag) tag.textContent = `${data.provider} • SOP Knowledge Base`;
                }
                chatHistory.push({ role: 'user', content: userMsg });
                chatHistory.push({ role: 'assistant', content: data.reply });
            } else {
                appendChatMessage('ai', '⚠️ AI Dispatcher service is temporarily unavailable.');
            }
        } catch (err) {
            removeChatLoading(loadingId);
            appendChatMessage('ai', '⚠️ Connection error contacting AI Copilot.');
        }
    });

    function appendChatMessage(role, text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-msg ${role === 'user' ? 'msg-user' : 'msg-ai'}`;

        // Convert the copilot's lightweight markdown to safe-ish HTML
        let formattedText = text
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/^\s*[•-]\s+(.+)$/gm, '<li>$1</li>')
            .replace(/^\s*(\d+)\.\s+(.+)$/gm, '<li>$2</li>')
            .replace(/(<li>[\s\S]*?<\/li>)(?!\s*<li>)/g, '<ul>$1</ul>')
            .replace(/<\/ul>\s*<ul>/g, '')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\n\n/g, '<br><br>')
            .replace(/\n/g, ' ');

        const icon = role === 'user' ? '<i class="fa-solid fa-user"></i>' : '<i class="fa-solid fa-brain"></i>';

        msgDiv.innerHTML = `
            <div class="msg-avatar">${icon}</div>
            <div class="msg-content">${formattedText}</div>
        `;
        messagesBox.appendChild(msgDiv);
        messagesBox.scrollTop = messagesBox.scrollHeight;
    }

    function appendChatLoading() {
        const id = 'loading_' + Date.now();
        const msgDiv = document.createElement('div');
        msgDiv.id = id;
        msgDiv.className = 'chat-msg msg-ai';
        msgDiv.innerHTML = `
            <div class="msg-avatar"><i class="fa-solid fa-brain"></i></div>
            <div class="msg-content"><i class="fa-solid fa-spinner fa-spin"></i> Consulting Business SOP & ML Regressor...</div>
        `;
        messagesBox.appendChild(msgDiv);
        messagesBox.scrollTop = messagesBox.scrollHeight;
        return id;
    }

    function removeChatLoading(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }
}

