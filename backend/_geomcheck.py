import json
import sqlite3

con = sqlite3.connect("data/nexafreight.db")
rows = con.execute(
    "select origin_id, destination_id, route_geometry_json from legs "
    "where transport_mode = 'SEA' and route_geometry_json is not null"
).fetchall()

for o, d, geo in rows:
    n = len(json.loads(geo)["coordinates"])
    print(f"SEA leg {o} -> {d}: {n} waypoints")
