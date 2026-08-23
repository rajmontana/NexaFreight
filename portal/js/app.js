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
}

// ========================================================
// 2. NAVIGATION ROUTING
// ========================================================
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const viewTarget = item.getAttribute('data-view');
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
    } else if (viewName === 'demurrage') {
        renderDemurrageChart();
    } else if (viewName === 'compliance') {
        renderSpcChart();
    } else if (viewName === 'market') {
        renderMarketCharts();
    } else if (viewName === 'emissions') {
        renderEmissionsChart();
    } else if (viewName === 'predictions') {
        renderShapChart();
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
        }
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

    // Clear old moving vehicle markers
    mapMarkers.forEach(m => leafletMap.removeLayer(m));
    mapMarkers = [];

    // 1. Plot AIS Ocean Ships
    (telemetry.vessels || []).forEach(v => {
        const iconHtml = `<div class="map-marker-ship" title="${v.name}"><i class="fa-solid fa-ship"></i></div>`;
        const customIcon = L.divIcon({ html: iconHtml, className: 'custom-map-icon', iconSize: [32, 32], iconAnchor: [16, 16] });
        
        const m = L.marker([v.latitude, v.longitude], { icon: customIcon }).addTo(leafletMap);
        m.bindPopup(`
            <div style="font-family:var(--font-main); color:#0f172a; min-width:200px;">
                <h4 style="margin:0 0 4px; color:#1d4ed8;">🚢 ${v.name}</h4>
                <p style="margin:0 0 4px; font-size:12px;"><b>MMSI:</b> ${v.mmsi} | <b>Type:</b> ${v.vessel_type}</p>
                <p style="margin:0 0 4px; font-size:12px;"><b>Speed:</b> ${v.speed_knots} kts • <b>Course:</b> ${v.heading_deg}°</p>
                <p style="margin:0; font-size:11px; color:#475569;"><b>Dest:</b> ${v.destination} (ETA: ${v.eta || 'On Schedule'})</p>
            </div>
        `);
        mapMarkers.push(m);
    });

    // 2. Plot OpenSky Air Cargo Flights
    (telemetry.flights || []).forEach(f => {
        const iconHtml = `<div class="map-marker-plane" title="Flight ${f.callsign}"><i class="fa-solid fa-plane"></i></div>`;
        const customIcon = L.divIcon({ html: iconHtml, className: 'custom-map-icon', iconSize: [32, 32], iconAnchor: [16, 16] });
        
        const m = L.marker([f.latitude, f.longitude], { icon: customIcon }).addTo(leafletMap);
        m.bindPopup(`
            <div style="font-family:var(--font-main); color:#0f172a; min-width:200px;">
                <h4 style="margin:0 0 4px; color:#7e22ce;">✈️ Flight ${f.callsign}</h4>
                <p style="margin:0 0 4px; font-size:12px;"><b>ICAO:</b> ${f.icao24} | <b>Country:</b> ${f.country}</p>
                <p style="margin:0 0 4px; font-size:12px;"><b>Altitude:</b> ${f.altitude_feet.toLocaleString()} ft • <b>Speed:</b> ${f.speed_kmh} km/h</p>
                <span style="display:inline-block; padding:2px 8px; background:#d8b4fe; border-radius:4px; font-size:11px; font-weight:700; color:#581c87;">Express Air Cargo</span>
            </div>
        `);
        mapMarkers.push(m);
    });

    // 3. Plot Highway Fleet Trucks
    (telemetry.trucks || []).forEach(t => {
        const iconHtml = `<div class="map-marker-truck" title="Truck #${t.truck_id}"><i class="fa-solid fa-truck"></i></div>`;
        const customIcon = L.divIcon({ html: iconHtml, className: 'custom-map-icon', iconSize: [30, 30], iconAnchor: [15, 15] });
        
        const m = L.marker([t.latitude, t.longitude], { icon: customIcon }).addTo(leafletMap);
        m.bindPopup(`
            <div style="font-family:var(--font-main); color:#0f172a; min-width:200px;">
                <h4 style="margin:0 0 4px; color:#047857;">🚛 Fleet Truck #${t.truck_id}</h4>
                <p style="margin:0 0 4px; font-size:12px;"><b>Corridor:</b> ${t.corridor}</p>
                <p style="margin:0 0 4px; font-size:12px;"><b>Speed:</b> ${t.speed_kmh} km/h • <b>Status:</b> ${t.status}</p>
                <span style="display:inline-block; padding:2px 8px; background:#a7f3d0; border-radius:4px; font-size:11px; font-weight:700; color:#065f46;">Highway FTL Van</span>
            </div>
        `);
        mapMarkers.push(m);
    });
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

    // Update SHAP Chart
    renderShapChart(data.shap_drivers || []);
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
// 6. DEMURRAGE & FINANCIALS CHARTS (LIVE SQL)
// ========================================================
async function renderDemurrageChart() {
    const ctx = document.getElementById('demurrageTiersChart').getContext('2d');
    if (demurrageChartInstance) demurrageChartInstance.destroy();

    try {
        const res = await authFetch(`${API_BASE}/api/demurrage`);
        const data = res.ok ? await res.json() : null;
        
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
                        ticks: { color: '#f8fafc' }
                    }
                }
            }
        });
    } catch (e) {
        console.error('Demurrage chart fetch error:', e);
    }
}

// ========================================================
// 7. SIX SIGMA SPC COMPLIANCE CHART (LIVE SQL)
// ========================================================
async function renderSpcChart() {
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
                        max: 8
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
    } catch (e) {
        console.error('Market chart fetch error:', e);
    }
}

// ========================================================
// 9. SCOPE 3 EMISSIONS CHART (LIVE SQL)
// ========================================================
async function renderEmissionsChart() {
    const ctx = document.getElementById('emissionsModalChart').getContext('2d');
    if (emissionsChartInstance) emissionsChartInstance.destroy();

    try {
        const res = await authFetch(`${API_BASE}/api/emissions`);
        const data = res.ok ? await res.json() : null;

        const labels = data && data.by_mode ? data.by_mode.map(b => `${b.mode} (${b.share_pct}%)`) : ['Ocean Vessel (42.5%)', 'Road Truckload (21.0%)', 'Air Cargo (20.5%)', 'Rail Intermodal (16.0%)'];
        const values = data && data.by_mode ? data.by_mode.map(b => b.co2e_kg) : [341354, 168670, 164653, 128511];

        emissionsChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: ['#2563eb', '#ea580c', '#9333ea', '#db2777'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#f8fafc', padding: 16 } }
                },
                cutout: '60%'
            }
        });
    } catch (e) {
        console.error('Emissions chart fetch error:', e);
    }
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

    copilotBtn.addEventListener('click', () => {
        chatDrawer.style.display = chatDrawer.style.display === 'none' ? 'flex' : 'none';
        if (chatDrawer.style.display === 'flex') {
            chatInput.focus();
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
        
        // Convert simple markdown bullet points to HTML
        let formattedText = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/•\s*(.*?)(?=\n|$)/g, '<li>$1</li>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\n\n/g, '<br><br>');

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

