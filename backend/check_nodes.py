import sqlite3
import json

con = sqlite3.connect('data/nexafreight.db')
rows = con.execute('select transport_mode, route_geometry_json from legs where transport_mode="SEA" and route_geometry_json is not null').fetchall()
for m, g in rows:
    points = json.loads(g)["coordinates"]
    print(m, len(points))
