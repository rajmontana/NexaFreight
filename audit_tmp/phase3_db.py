import sqlite3
import json
import os

db_path = os.path.abspath("backend/data/nexafreight.db")
conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
cursor = conn.cursor()

cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [row[0] for row in cursor.fetchall()]
for table in tables:
    cursor.execute(f"SELECT count(*) FROM {table}")
    print(f"Row count for {table}: {cursor.fetchone()[0]}")

queries = [
    ("legs.shipment_id missing", "SELECT count(*) FROM legs LEFT JOIN shipments ON legs.shipment_id = shipments.id WHERE shipments.id IS NULL"),
    ("orders.shipment_id missing", "SELECT count(*) FROM orders LEFT JOIN shipments ON orders.shipment_id = shipments.id WHERE orders.shipment_id IS NOT NULL AND shipments.id IS NULL"),
    ("alerts.shipment_id missing", "SELECT count(*) FROM alerts LEFT JOIN shipments ON alerts.shipment_id = shipments.id WHERE alerts.shipment_id IS NOT NULL AND shipments.id IS NULL"),
    ("network_edges.from_node_id missing", "SELECT count(*) FROM network_edges LEFT JOIN network_nodes ON network_edges.from_node_id = network_nodes.id WHERE network_nodes.id IS NULL"),
    ("network_edges.to_node_id missing", "SELECT count(*) FROM network_edges LEFT JOIN network_nodes ON network_edges.to_node_id = network_nodes.id WHERE network_nodes.id IS NULL")
]
for name, q in queries:
    try:
        cursor.execute(q)
        print(f"Orphan {name}: {cursor.fetchone()[0]}")
    except Exception as e:
        print(f"Orphan error for {name}: {e}")

cursor.execute("SELECT mode, from_node_id, to_node_id, count(*) FROM network_edges GROUP BY mode, from_node_id, to_node_id HAVING count(*) > 1")
print(f"Duplicate network_edges: {len(cursor.fetchall())}")
cursor.execute("SELECT name, country_code, count(*) FROM locations GROUP BY name, country_code HAVING count(*) > 1")
print(f"Duplicate locations: {len(cursor.fetchall())}")

cursor.execute("SELECT mode, geometry_json FROM network_edges")
modes = {"AIR": [0,0], "RAIL": [0,0], "ROAD": [0,0], "SEA": [0,0]}
for mode, geo in cursor.fetchall():
    if geo:
        try:
            g = json.loads(geo)
            if g.get("type") == "LineString" and len(g.get("coordinates", [])) >= 2:
                valid = True
                for c in g["coordinates"]:
                    if not (isinstance(c, list) and len(c) == 2 and -180 <= c[0] <= 180 and -90 <= c[1] <= 90):
                        valid = False
                if valid:
                    modes[mode][0] += 1
                else:
                    modes[mode][1] += 1
            else:
                modes[mode][1] += 1
        except:
            modes[mode][1] += 1

cursor.execute("SELECT mode, count(*) FROM network_edges WHERE geometry_json IS NOT NULL GROUP BY mode")
filled = dict(cursor.fetchall())
cursor.execute("SELECT mode, count(*) FROM network_edges GROUP BY mode")
total = dict(cursor.fetchall())
for m in modes:
    print(f"{m} geometry: {filled.get(m, 0)}/{total.get(m, 0)} filled, {modes[m][1]} invalid")

for loc in ["INJNP", "INMUN", "NLRTM", "SGSIN"]:
    cursor.execute("SELECT latitude, longitude FROM locations WHERE locode = ?", (loc,))
    row = cursor.fetchone()
    if row:
        print(f"Port {loc}: {row[0]}/{row[1]}")
    else:
        print(f"Port {loc}: Not found")

cursor.execute("SELECT DISTINCT primary_transport_mode FROM shipments")
print("Transport modes:", [r[0] for r in cursor.fetchall()])
cursor.execute("SELECT DISTINCT status FROM shipments")
print("Shipment statuses:", [r[0] for r in cursor.fetchall()])
cursor.execute("SELECT DISTINCT provenance FROM legs")
print("Leg provenances:", [r[0] for r in cursor.fetchall()])

cursor.execute("SELECT count(*) FROM shipments WHERE created_at > updated_at")
print("Shipments created > updated:", cursor.fetchone()[0])
cursor.execute("SELECT count(*) FROM legs WHERE created_at > updated_at")
print("Legs created > updated:", cursor.fetchone()[0])

cursor.execute("SELECT version_num FROM alembic_version")
print("Alembic version:", cursor.fetchone()[0])

conn.close()
