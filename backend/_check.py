import json
import urllib.request

BASE = "http://127.0.0.1:8000"

def call(method, path, token=None, payload=None):
    req = urllib.request.Request(BASE + path, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    data = json.dumps(payload).encode() if payload is not None else None
    with urllib.request.urlopen(req, data=data) as r:
        return r.status, json.loads(r.read().decode())

results = []

st, body = call("GET", "/api/health")
results.append(("health endpoint", st == 200 and body.get("status") == "healthy"))

st, body = call("GET", "/api/health/validation")
ok = st == 200 and body.get("all_ok") is True
ok = ok and body.get("pass_count") == body.get("total_count") == 37
results.append(("validation matrix 37/37 GREEN (task 17)", ok))

st, body = call("POST", "/api/auth/login", payload={"email": "operator@nexafreight.local", "password": "operator123"})
tok = body.get("access_token")
results.append(("login operator", st == 200 and bool(tok)))

st, body = call("GET", "/api/shipments", token=tok)
n = len(body) if isinstance(body, list) else len(body.get("items", body.get("shipments", [])))
results.append(("shipments list (got %s)" % n, st == 200 and n > 0))

st, body = call("GET", "/api/analytics/scorecard", token=tok)
buckets = body.get("by_provenance", {})
results.append(("scorecard by_provenance split (task 22 / E12)", st == 200 and len(buckets) >= 1))
print("provenance buckets:", json.dumps({k: v.get("shipments") for k, v in buckets.items()}))

for name, ok in results:
    print(("PASS" if ok else "FAIL"), "-", name)
if all(ok for _, ok in results):
    print("ALL CHECKS PASSED")
else:
    raise SystemExit(1)
