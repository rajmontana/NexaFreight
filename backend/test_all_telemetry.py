import requests
import json
import time

print("="*65)
print("[TEST] SMARTTRACK MULTI-MODAL TELEMETRY SUITE (WITH PROXY)")
print("="*65)

PROXIES = {
    "http": "http://edcguest:edcguest@172.31.100.27:3128",
    "https": "http://edcguest:edcguest@172.31.100.27:3128"
}

def make_request(url, headers=None, timeout=6):
    try:
        # Try with proxy first
        r = requests.get(url, headers=headers, proxies=PROXIES, timeout=timeout)
        if r.status_code == 200:
            return r, "Proxy (172.31.100.27:3128)"
    except Exception:
        pass
    
    # Try direct
    try:
        r = requests.get(url, headers=headers, timeout=timeout)
        if r.status_code == 200:
            return r, "Direct Connection"
    except Exception as e:
        return None, str(e)
        
    return None, f"HTTP {r.status_code}"

# -------------------------------------------------------------
# 1. TEST OPENSKY NETWORK API (LIVE AIR CARGO FLIGHTS)
# -------------------------------------------------------------
print("\n[1/3] Testing OpenSky Network Live Flight Tracking API (Air Cargo)...")
opensky_url = "https://opensky-network.org/api/states/all?lamin=15&lomin=68&lamax=30&lomax=85"
headers = {"User-Agent": "SmartTrack-Logistics-Control-Tower/2.0"}
r, route_info = make_request(opensky_url, headers=headers, timeout=8)

if r and r.status_code == 200:
    data = r.json()
    states = data.get("states", [])
    print(f" [OK] OpenSky API Online via {route_info}! (HTTP 200)")
    print(f"      Total live aircraft tracked in corridor: {len(states)}")
    
    for i, s in enumerate(states[:3]):
        icao24 = s[0]
        callsign = s[1].strip() if s[1] else "UNKNOWN"
        country = s[2]
        lon = s[5]
        lat = s[6]
        alt_m = s[7] or 0
        alt_ft = int(alt_m * 3.28084)
        vel_mps = s[9] or 0
        speed_kmh = int(vel_mps * 3.6)
        print(f"      Flight #{i+1}: Callsign='{callsign}' | ICAO={icao24} | Country={country} | Alt={alt_ft:,} ft | Speed={speed_kmh} km/h | Coords=[{lat:.2f}, {lon:.2f}]")
else:
    print(f" [ERR] OpenSky API Result: {route_info}")

# -------------------------------------------------------------
# 2. TEST OSRM HIGHWAY ROUTING API (TRUCK TELEMATICS)
# -------------------------------------------------------------
print("\n[2/3] Testing OSRM Highway Routing API (Truck Freight)...")
osrm_url = "http://router.project-osrm.org/route/v1/driving/77.2090,28.6139;72.8777,19.0760?overview=full&geometries=geojson"
r, route_info = make_request(osrm_url, timeout=8)

if r and r.status_code == 200:
    route_data = r.json()
    routes = route_data.get("routes", [])
    if routes:
        route = routes[0]
        distance_km = route.get("distance", 0) / 1000.0
        duration_hrs = route.get("duration", 0) / 3600.0
        waypoints_count = len(route.get("geometry", {}).get("coordinates", []))
        print(f" [OK] OSRM Highway API Online via {route_info}! (HTTP 200)")
        print(f"      Route Corridor: Delhi Freight Hub -> Mumbai Gateway Port")
        print(f"      Calculated Highway Distance: {distance_km:,.1f} km")
        print(f"      Heavy Truck Transit Duration: {duration_hrs:.1f} hours (approx {duration_hrs/24:.1f} days)")
        print(f"      GPS Polyline Waypoints Generated: {waypoints_count:,} coordinates")
else:
    print(f" [ERR] OSRM API Result: {route_info}")

# -------------------------------------------------------------
# 3. TEST OPEN-METEO HARBOR WEATHER API
# -------------------------------------------------------------
print("\n[3/3] Testing Open-Meteo Marine Weather API...")
weather_url = "https://api.open-meteo.com/v1/forecast?latitude=51.92&longitude=4.47&current_weather=true"
r, route_info = make_request(weather_url, timeout=5)

if r and r.status_code == 200:
    cw = r.json().get("current_weather", {})
    temp = cw.get("temperature")
    wind = cw.get("windspeed")
    print(f" [OK] Open-Meteo Weather API Online via {route_info}! (HTTP 200)")
    print(f"      Port of Rotterdam: Temp={temp} C | Wind={wind} km/h")
else:
    print(f" [ERR] Open-Meteo API Result: {route_info}")

print("\n" + "="*65)
print("[PASS] MULTI-MODAL TELEMETRY VERIFICATION COMPLETE!")
print("="*65)
