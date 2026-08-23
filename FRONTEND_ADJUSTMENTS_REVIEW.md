# 🚀 Frontend Review & Adjustment Guide

**To:** Frontend Partner  
**From:** Backend & Architecture  
**Status:** Live Bundle Inspected (`https://logistics-dashboard-red-eight.vercel.app/`)  
**Design Reference:** [`d:\smart_track\ui\`](file:///d:/smart_track/ui)

---

## 🌟 Great Job!
The UI structure, navigation flow, and data modeling across all **8 screens** are spot-on and match our API contracts cleanly. 

Here are **4 quick adjustments** to polish the deployment and align with our final design specifications:

---

## 1. Fix the Vercel 404 on Direct Subroutes (30-Second Fix)

### The Issue:
Navigating directly to `https://logistics-dashboard-red-eight.vercel.app/dashboard` returns **404 Not Found** because Vercel looks for a static file instead of letting React Router handle single-page routing.

### The Fix:
Create a file named `vercel.json` in your frontend **root folder** with this exact content:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

Commit and push to GitHub:
```bash
git add vercel.json
git commit -m "fix: add vercel SPA rewrites for subroutes"
git push
```
*Once deployed, all direct links like `/dashboard`, `/shipments`, `/predictions` will load instantly without 404s.*

---

## 2. Add Multi-Modal Transit Badges (`🚢 Ocean`, `✈️ Air`, `🚛 Road`)

*Reference: [`ui/02_dashboard_overview.jpg`](file:///d:/smart_track/ui/02_dashboard_overview.jpg) & [`ui/03_shipments_table.jpg`](file:///d:/smart_track/ui/03_shipments_table.jpg)*

### On the Shipments Table (`/shipments`):
Ensure the **Transit Modality** column displays explicit pill badges with icons:
- `🚢 Ocean TEU Container` *(Standard Class)* — Blue badge
- `✈️ Air Cargo ULD` *(First Class / Express)* — Purple badge
- `🚛 Highway FTL Van` *(Second Class / Same Day)* — Green badge

### On the Global Freight Map (`/dashboard`):
Tag the vehicle markers with modality and live telemetry:
- 🚢 **Ship Marker:** `Vessel Nexa-Titan (Speed: 18.2 kts • ETA: 4.2d)`
- ✈️ **Flight Marker:** `Air Cargo Flight LH8402 (Alt: 34,000ft • On-Schedule)`
- 🚛 **Truck Marker:** `Fleet Truck #TRK-912 (Speed: 62 km/h)`

---

## 3. Explicit Metric Context & Chart Labels

*Reference: [`ui/04_ai_predictions.jpg`](file:///d:/smart_track/ui/04_ai_predictions.jpg) & [`ui/06_compliance_six_sigma.jpg`](file:///d:/smart_track/ui/06_compliance_six_sigma.jpg)*

Make sure evaluators and managers know what each metric represents:

### A. On AI Predictions (`/predictions`):
- **Risk Gauge Subtitle:**  
  `XGBoost Supervised Late Delivery Classifier (Threshold >= 0.50)`
- **SHAP Drivers Title:**  
  `SHAP Feature Attribution: Drivers Pushing Shipment Toward SLA Delay`  
  *(+54.0% Shipping Mode, +21.0% Scheduled SLA, +14.2% Port Dwell)*
- **1-Click Action Card:**  
  `✈️ Modal Shift to Express Air Freight (Cost: +$350 | Avoids: -$1,200 OTIF Fine | Net Benefit: +$850)`

### B. On Compliance (`/compliance`):
- **SPC Chart Header:**  
  `Statistical Process Control (SPC) X-bar Chart: Lead Time in Days from Dispatch to Delivery`
- **Recharts Line Legend:**
  - Red dashed line: `UCL (Upper Control Limit = 6.21 Days)`
  - Blue line: `X-bar Mean (3.56 Days)`
  - Green line: `LCL (Lower Control Limit = 0.91 Days)`
- **Quality Capability Card:**  
  `Six Sigma Score: 1.60σ • 572,900 DPMO (Defective Deliveries / Million)`

### C. On Financials (`/financials`):
- **Demurrage Header:**  
  `975 Ocean Containers • $527,500 Total Demurrage Exposure ($300/day after 4-day harbor free-time allowance)`

---

## 4. Connecting to the Live Backend URL

When ready to switch from local mock resolvers to the live backend:

### In your `.env` (or `.env.local`):
```env
# For Vite:
VITE_API_URL=http://<BACKEND_HOST_IP>:8000

# For Next.js:
NEXT_PUBLIC_API_URL=http://<BACKEND_HOST_IP>:8000
```

### In `lib/api.ts`:
Ensure requests use `baseURL = import.meta.env.VITE_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'`.

---

*Once `vercel.json` is pushed and these badges/labels are verified, the frontend will be 100% production-ready for live API integration!*
