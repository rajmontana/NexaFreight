import sqlite3
con = sqlite3.connect('data/nexafreight.db')
rows = con.execute('select origin_id, destination_id from shipments').fetchall()
print(f"Total shipments: {len(rows)}")

locs = con.execute('select id, locode from locations').fetchall()
loc_dict = dict(locs)
foreign = 0
for o, d in rows:
    o_loc = loc_dict.get(o, "")
    d_loc = loc_dict.get(d, "")
    if not o_loc.startswith("IN") or not d_loc.startswith("IN"):
        foreign += 1
print(f"Foreign shipments: {foreign}")
