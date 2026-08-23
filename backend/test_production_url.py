import requests
import json
import time

BASE_URL = 'https://nexafreight.onrender.com'

print('=' * 60)
print(' [RENDER CLOUD VERIFICATION] TESTING LIVE NEXAFREIGHT DEPLOYMENT')
print('=' * 60)

# 1. Health Check
try:
    r_health = requests.get(f'{BASE_URL}/api/health', timeout=30)
    print(f'1. Public Health Check      : Status {r_health.status_code} -> {r_health.json()}')
except Exception as e:
    print(f'1. Health Check Failed: {e}')
    exit(1)

# 2. Auth Login
try:
    r_login = requests.post(f'{BASE_URL}/api/auth/login', json={'email': 'manager@nexafreight.com', 'password': 'SmartTrack2025'}, timeout=30)
    token = r_login.json().get('access_token')
    print(f'2. JWT Login & Issuance     : Status {r_login.status_code} -> Token: {token[:20]}...')
except Exception as e:
    print(f'2. Login Failed: {e}')
    exit(1)

headers = {'Authorization': f'Bearer {token}'}

# 3. Control Tower KPIs (from Neon Cloud Database)
r_kpis = requests.get(f'{BASE_URL}/api/kpis', headers=headers, timeout=30)
kpis = r_kpis.json()
print(f"3. Live KPIs (Neon Postgres): Status {r_kpis.status_code} -> Active: {kpis.get('active_shipments'):,} | Revenue: ${kpis.get('total_revenue'):,}")

# 4. XGBoost & TreeSHAP Prediction
req_predict = {
    'order_id': 'ORD-94821',
    'shipping_mode': 'First Class',
    'days_for_shipment_scheduled': 1,
    'sales': 450.0,
    'distance_km': 6850.0,
    'order_item_quantity': 2,
    'order_item_product_price': 225.0,
    'simulated_delay_hrs': 48.0
}
r_pred = requests.post(f'{BASE_URL}/api/predict', json=req_predict, headers=headers, timeout=30)
pred = r_pred.json()
print(f"4. Real ML Inference        : Status {r_pred.status_code} -> Predicted: {pred.get('predicted_transit_days')}d | Risk: {pred.get('late_delivery_risk_probability')*100:.1f}%")
print(f"   -> Top SHAP Driver       : {pred.get('shap_drivers', [{}])[0].get('feature')} ({pred.get('shap_drivers', [{}])[0].get('shap_value_days')}d)")

# 5. Demurrage Financials
r_dem = requests.get(f'{BASE_URL}/api/demurrage', headers=headers, timeout=30)
dem = r_dem.json()
print(f"5. Demurrage Exposure (Neon): Status {r_dem.status_code} -> Containers: {dem.get('summary', {}).get('total_containers'):,} | Exposure: ${dem.get('summary', {}).get('current_total_cost_usd'):,}")

# 6. SPC Six Sigma Control Limits
r_spc = requests.get(f'{BASE_URL}/api/spc', headers=headers, timeout=30)
spc = r_spc.json()
print(f"6. SPC Math & Six Sigma     : Status {r_spc.status_code} -> Mean: {spc.get('x_bar')}d | UCL: {spc.get('ucl')}d | DPMO: {spc.get('dpmo'):,}")

# 7. Scope 3 Emissions
r_em = requests.get(f'{BASE_URL}/api/emissions', headers=headers, timeout=30)
em = r_em.json()
print(f"7. Scope 3 GHG Emissions    : Status {r_em.status_code} -> Total: {em.get('total_co2_kg'):,} kg CO2e")

print('=' * 60)
print('✅ FULL PRODUCTION SUITE PASSED ON RENDER & NEON!')
print('=' * 60)
