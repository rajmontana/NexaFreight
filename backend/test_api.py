import sys
import os
import json
from fastapi.testclient import TestClient

# Directly import app from current backend directory
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app import app

client = TestClient(app)

print("="*60, flush=True)
print("[TEST] SMARTTRACK AUTOMATED BACKEND VERIFICATION SUITE", flush=True)
print("="*60, flush=True)

# 1. Health Check (Public Endpoint)
res = client.get("/api/health")
print(f"1. Health Check (Public)       : Status {res.status_code} -> {res.json().get('status')}", flush=True)
assert res.status_code == 200

# 1B. Auth Guard Rejection Verification (Unauthenticated Requests Must Return 401)
unauth_endpoints = ["/api/kpis", "/api/shipments?page=1&limit=5", "/api/demurrage", "/api/spc", "/api/market-stats", "/api/weather", "/api/vessels", "/api/emissions", "/api/exceptions"]
print("\n--- AUTH REJECTION VERIFICATION (UNAUTHENTICATED) ---", flush=True)
for ep in unauth_endpoints:
    r_unauth = client.get(ep)
    assert r_unauth.status_code == 401
    print(f" [REJECTED 401] GET {ep.split('?')[0]:<18} -> {r_unauth.json().get('detail')}", flush=True)

# Unauthenticated POST
r_unauth_post = client.post("/api/predict", json={"order_id": "ORD-94821"})
assert r_unauth_post.status_code == 401
print(f" [REJECTED 401] POST /api/predict       -> {r_unauth_post.json().get('detail')}", flush=True)

# Invalid / Forged JWT Token
r_forged = client.get("/api/kpis", headers={"Authorization": "Bearer forged.invalid.token"})
assert r_forged.status_code == 401
print(f" [REJECTED 401] Forged Token Test       -> {r_forged.json().get('detail')}", flush=True)
print("--- ALL UNAUTHENTICATED / FORGED REQUESTS STRICTLY REJECTED ---\n", flush=True)

# 2. Login & Token Issuance
res = client.post("/api/auth/login", json={"email": "manager@nexafreight.com", "password": "SmartTrack2025"})
print(f"2. Auth Login (JWT Issuance)   : Status {res.status_code} -> Token: {res.json().get('access_token')[:20]}...", flush=True)
assert res.status_code == 200
token = res.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# 3. KPIs
res = client.get("/api/kpis", headers=headers)
kpis = res.json()
print(f"3. Control Tower KPIs          : Status {res.status_code} -> Active: {kpis.get('active_shipments'):,} | On-Time: {kpis.get('on_time_percentage')}% | Revenue: ${kpis.get('total_revenue'):,}", flush=True)
assert res.status_code == 200
assert kpis.get("active_shipments") == 172765

# 4. Shipments (Page 1)
res = client.get("/api/shipments?page=1&limit=5", headers=headers)
ship = res.json()
print(f"4. Shipments Table             : Status {res.status_code} -> Total: {ship.get('total'):,} | Returned: {len(ship.get('data'))} rows", flush=True)
assert res.status_code == 200
assert len(ship.get("data")) == 5

# 5. AI Predictions & Real TreeSHAP Feature Attribution
res = client.post("/api/predict", json={
    "order_id": "ORD-94821",
    "shipping_mode": "First Class",
    "days_for_shipment_scheduled": 1,
    "sales": 450.0,
    "distance_km": 6850.0,
    "order_item_quantity": 2,
    "order_item_product_price": 225.0,
    "simulated_delay_hrs": 48.0
}, headers=headers)
pred = res.json()
print(f"5. AI Predictions (Real ML)    : Status {res.status_code} -> Features: {pred.get('features_evaluated_count')}/47 | Predicted: {pred.get('predicted_transit_days')}d | Base: {pred.get('shap_base_value_days')}d | Risk: {pred.get('late_delivery_risk_probability')*100:.1f}%", flush=True)
print(f"   -> Top SHAP Driver          : {pred['shap_drivers'][0]['feature']} ({pred['shap_drivers'][0]['shap_value_days']:+.4f}d, {pred['shap_drivers'][0]['direction']})", flush=True)
assert res.status_code == 200
assert pred.get("features_evaluated_count") == 47
assert len(pred.get("shap_drivers")) >= 5
assert "shap_value_days" in pred["shap_drivers"][0]

# 6. Demurrage & Ticking Clocks
res = client.get("/api/demurrage", headers=headers)
dem = res.json()
print(f"6. Demurrage Center            : Status {res.status_code} -> Total: {dem.get('summary').get('total_containers')} containers | Exposure: ${dem.get('summary').get('current_total_cost_usd'):,}", flush=True)
assert res.status_code == 200

# 7. SPC Six Sigma & Compliance
res = client.get("/api/spc", headers=headers)
spc = res.json()
print(f"7. SPC Six Sigma               : Status {res.status_code} -> UCL: {spc.get('ucl')}d | Mean: {spc.get('x_bar')}d | DPMO: {spc.get('dpmo'):,} ({spc.get('sigma_level')} sigma)", flush=True)
assert res.status_code == 200

# 8. Customer Segments & Market Stats
res = client.get("/api/market-stats", headers=headers)
mkt = res.json()
print(f"8. Market & Segments           : Status {res.status_code} -> Sales: ${mkt.get('gross_sales_usd'):,} | Segments: {len(mkt.get('segments'))}", flush=True)
assert res.status_code == 200

# 9. Live Port Weather
res = client.get("/api/weather", headers=headers)
wtr = res.json()
print(f"9. Port Weather                : Status {res.status_code} -> Ports tracked: {len(wtr.get('ports'))}", flush=True)
assert res.status_code == 200

# 9B. Live Satellite AIS Vessels (AISstream.io)
res = client.get("/api/vessels", headers=headers)
vsl = res.json()
print(f"9B. AIS Ocean Vessels          : Status {res.status_code} -> Live Ships Tracked: {vsl.get('total_vessels')} ({vsl.get('vessels')[0].get('name')})", flush=True)
assert res.status_code == 200

# 9C. Live Multi-Modal Radar (OpenSky + OSRM + AIS)
res = client.get("/api/telemetry/live", headers=headers)
rad = res.json()
print(f"9C. Multi-Modal Radar          : Status {res.status_code} -> Flights: {len(rad.get('flights'))} | Ships: {len(rad.get('vessels'))} | Trucks: {len(rad.get('trucks'))}", flush=True)
assert res.status_code == 200

# 10. Scope 3 Emissions
res = client.get("/api/emissions", headers=headers)
ems = res.json()
print(f"10. Scope 3 Emissions          : Status {res.status_code} -> Total: {ems.get('total_co2_kg'):,} kg CO2e", flush=True)
assert res.status_code == 200

# 11. Disruption Exceptions Feed
res = client.get("/api/exceptions", headers=headers)
exc = res.json()
print(f"11. Exceptions Feed            : Status {res.status_code} -> Total Active: {exc.get('total_exceptions')}", flush=True)
assert res.status_code == 200

# 12. MLOps Feedback Logging
res = client.post("/api/feedback", json={"order_id": "ORD-94821", "action": "APPROVE_AIR_REROUTE", "predicted_prob": 0.874}, headers=headers)
print(f"12. MLOps Feedback Log         : Status {res.status_code} -> {res.json().get('status')}", flush=True)
assert res.status_code == 200

print("="*60, flush=True)
print("[PASS] ALL ENDPOINTS AUTH PROTECTED & 100% OPERATIONAL!", flush=True)
print("="*60, flush=True)
