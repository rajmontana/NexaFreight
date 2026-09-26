from nexafreight.adapters.routing.sea_route import compute_sea_route
import json
import sqlite3

con = sqlite3.connect('data/nexafreight.db')
nodes = con.execute('select locode, latitude, longitude from network_nodes where locode like "IN%"').fetchall()
node_dict = {locode: (lat, lon) for locode, lat, lon in nodes}

for o, (olat, olon) in node_dict.items():
    for d, (dlat, dlon) in node_dict.items():
        if o != d:
            try:
                route = compute_sea_route(olat, olon, dlat, dlon, vessel_class="neo-panamax")
                geo = json.loads(route.geometry_geojson)
                if len(geo["coordinates"]) > 40:
                    print(f"{o} -> {d}: {len(geo['coordinates'])}")
            except Exception:
                pass
