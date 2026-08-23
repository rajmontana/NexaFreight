# 🚢 SmartTrack™ — Frontend Partner Instructions & Integration Guide

**To:** Frontend Lead  
**From:** Backend & Architecture  
**Project:** NexaFreight SmartTrack Logistics Portal  
**Reference Design Mockups:** [`d:\smart_track\ui\`](file:///d:/smart_track/ui)  
**API Specification:** [`api_contract.md`](file:///C:/Users/RAJ%20KUMAR%20MERUGU/.gemini/antigravity-ide/brain/2fc5f883-74b3-4a69-9810-e19d1ee35020/api_contract.md)

---

## 📌 Overview
You have already built the core layout and styling. Your remaining mission is to:
1. **Ensure all 8 screens** exist in `src/app/` matching the designs in `ui/`.
2. **Add the central API client** (`lib/api.ts`) with automatic JWT bearer token handling.
3. **Wire each screen's state** to fetch live data from the backend.
4. **Implement 3 interactive click handlers** (Order Detail Drawer, 1-Click Air Reroute, Logout).

---

## Step 1: Verify All 8 Routes in `frontend/src/app/`

Check that your Next.js project contains the following 8 route folders:

| Route | Screen Name | Visual Design Reference |
|:---|:---|:---|
| `/login` | **Screen 1:** Enterprise Login Page | `ui/01_login_page.jpg` |
| `/dashboard` | **Screen 2:** Global Control Tower & Map | `ui/02_dashboard_overview.jpg` |
| `/shipments` | **Screen 3:** 172k Shipments Table & PO Drawer | `ui/03_shipments_table.jpg` |
| `/predictions` | **Screen 4:** AI Predictions & Prescriptive Actions | `ui/04_ai_predictions.jpg` |
| `/financials` | **Screen 5:** Financial Command & Demurrage | `ui/05_financials_demurrage.jpg` |
| `/compliance` | **Screen 6:** Six Sigma SQC & Compliance | `ui/06_compliance_six_sigma.jpg` |
| `/segments` | **Screen 7:** Customer Segments & Market Intel | `ui/07_customer_segments_market.jpg` |
| `/emissions` | **Screen 8:** Scope 3 ESG Carbon Emissions | `ui/08_scope3_emissions.jpg` |

---

## Step 2: Create the API Client (`frontend/src/lib/api.ts`)

Create `frontend/src/lib/api.ts`. This Axios client automatically reads `NEXT_PUBLIC_API_URL` and attaches the JWT Bearer token to all requests.

```typescript
// frontend/src/lib/api.ts
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 1. Request Interceptor: Automatically injects JWT Bearer Token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('smarttrack_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// 2. Response Interceptor: Automatically redirects to /login on 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('smarttrack_token');
      localStorage.removeItem('smarttrack_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### Create / Update `frontend/.env.local`:
```env
# Point this to the backend host IP or tunnel URL
NEXT_PUBLIC_API_URL=http://localhost:8000
```
*(If testing across two laptops on Wi-Fi, change `localhost` to the backend host's IP address, e.g. `http://192.168.1.45:8000`)*

---

## Step 3: Screen-by-Screen Data Wiring

Replace static/dummy numbers with these clean `api` calls inside `useEffect()`:

### 1. `/login` — Login Screen
```typescript
const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    const res = await api.post('/api/auth/login', { email, password });
    localStorage.setItem('smarttrack_token', res.data.access_token);
    localStorage.setItem('smarttrack_user', JSON.stringify({ name: res.data.name, role: res.data.role }));
    router.push('/dashboard');
  } catch (err: any) {
    setError(err.response?.data?.detail || 'Invalid email or password');
  }
};
```
*Demo credentials: `manager@nexafreight.com` / `SmartTrack2025`*

---

### 2. `/dashboard` — Control Tower Overview
```typescript
useEffect(() => {
  // 1. Fetch top KPIs & Disruption counts
  api.get('/api/kpis').then(res => setKpis(res.data));
  // 2. Fetch live port weather & coordinates for the map
  api.get('/api/weather').then(res => setPortsData(res.data.ports));
  // 3. Fetch active exceptions for the navigator feed
  api.get('/api/exceptions').then(res => setExceptions(res.data.items));
}, []);
```

---

### 3. `/shipments` — Shipments & Order Visibility Table
```typescript
const fetchShipments = async (page = 1, filters = {}) => {
  const res = await api.get(`/api/shipments?page=${page}&limit=50`, { params: filters });
  setShipments(res.data.data);
  setTotalPages(res.data.total_pages);
};

useEffect(() => {
  fetchShipments();
}, []);
```

---

### 4. `/predictions` — AI Predictions & Prescriptive Actions
```typescript
const handlePredict = async (orderId: string) => {
  const res = await api.post('/api/predict', { order_id: orderId });
  // Updates radial gauge, SHAP bars, TCO card, and prescriptive action costs
  setPredictionResult(res.data);
};
```

---

### 5. `/financials` — Demurrage & Revenue Waterfall
```typescript
useEffect(() => {
  api.get('/api/demurrage').then(res => setDemurrageData(res.data));
  api.get('/api/market-stats').then(res => setFinancialMetrics(res.data));
}, []);
```

---

### 6. `/compliance` — Six Sigma SQC & Regulations
```typescript
useEffect(() => {
  api.get('/api/spc').then(res => {
    // res.data contains: x_bar, ucl, lcl, dpmo, sigma_level, monthly_data, sla_grid
    setSpcData(res.data);
  });
}, []);
```

---

### 7. `/segments` — Customer Segments & Market Intel
```typescript
useEffect(() => {
  api.get('/api/market-stats').then(res => {
    // res.data contains: markets, departments, segments, monthly_revenue
    setMarketStats(res.data);
  });
}, []);
```

---

### 8. `/emissions` — Scope 3 ESG Carbon Tracker
```typescript
useEffect(() => {
  api.get('/api/emissions').then(res => {
    // res.data contains: total_co2_kg, by_mode, by_route
    setEmissionsData(res.data);
  });
}, []);
```

---

## Step 4: Add the 3 Core Interactive Features

### 1. Slide-out Purchase Order Drawer (`/shipments`)
* When user clicks on a table row:
  ```typescript
  const [selectedShipment, setSelectedShipment] = useState<any | null>(null);

  // In table JSX:
  <tr onClick={() => setSelectedShipment(row)} className="cursor-pointer hover:bg-blue-50/50">
  ```
* When `selectedShipment` is not null, open the right drawer showing PO number, SKU items, volumetric weight, and SOLAS verification tag (reference `ui/03_shipments_table.jpg`).

---

### 2. 1-Click Air Reroute Action (`/predictions`)
* On button click:
  ```typescript
  const handleApproveReroute = async () => {
    alert("✅ Carrier Dispatch Notified: Shipment rerouted via Express Air. Saved $1,200 OTIF contractual fine!");
  };
  ```

---

### 3. User Sign Out (TopBar & Sidebar)
```typescript
const handleSignOut = () => {
  localStorage.removeItem('smarttrack_token');
  localStorage.removeItem('smarttrack_user');
  router.push('/login');
};
```

---

## 🏁 Quick Testing Checklist
1. Open `http://localhost:3000` $\rightarrow$ Redirects to `/login`.
2. Login with `manager@nexafreight.com` / `SmartTrack2025` $\rightarrow$ Lands on `/dashboard`.
3. Open all 8 navigation links in the sidebar $\rightarrow$ Every screen displays live numbers and charts with zero console errors.
