import sqlite3

def activate():
    conn = sqlite3.connect('backend/data/nexafreight.db')
    c = conn.cursor()

    # 1. Activate AIR shipments & legs
    # Leg 60: Hyderabad Airport (HYD) -> Delhi Airport (DEL)
    c.execute("UPDATE shipments SET status = 'IN_TRANSIT' WHERE id = 'dbc51597-a524-4da4-933f-313c72a06270'")
    c.execute("""
        UPDATE legs 
        SET status = 'IN_PROGRESS',
            planned_departure = '2026-10-01 10:00:00.000000',
            actual_departure = '2026-10-01 10:05:00.000000',
            planned_arrival = '2026-10-02 02:00:00.000000'
        WHERE id = 60
    """)

    # Leg 64: Delhi Airport (DEL) -> Mumbai Airport (BOM)
    c.execute("UPDATE shipments SET status = 'IN_TRANSIT' WHERE id = '53fbeb3d-0965-47a1-b221-74e3e6047435'")
    c.execute("""
        UPDATE legs 
        SET status = 'IN_PROGRESS',
            planned_departure = '2026-10-01 11:00:00.000000',
            actual_departure = '2026-10-01 11:05:00.000000',
            planned_arrival = '2026-10-02 01:00:00.000000'
        WHERE id = 64
    """)

    # Leg 126: Delhi Airport (DEL) -> Kolkata Airport (CCU)
    c.execute("UPDATE shipments SET status = 'IN_TRANSIT' WHERE id = '0c695406-5088-4a69-bd37-ca78f8a53788'")
    c.execute("""
        UPDATE legs 
        SET status = 'IN_PROGRESS',
            planned_departure = '2026-10-01 09:30:00.000000',
            actual_departure = '2026-10-01 09:35:00.000000',
            planned_arrival = '2026-10-02 00:30:00.000000'
        WHERE id = 126
    """)

    # 2. Activate ROAD (truck) shipments & legs
    # Leg 59: Mumbai -> Pune Express Highway
    c.execute("UPDATE shipments SET status = 'IN_TRANSIT' WHERE id = '09ca02dc-54a3-4f07-bd85-078ff5848854'")
    c.execute("""
        UPDATE legs 
        SET status = 'IN_PROGRESS',
            planned_departure = '2026-10-01 08:00:00.000000',
            actual_departure = '2026-10-01 08:15:00.000000',
            planned_arrival = '2026-10-02 04:00:00.000000'
        WHERE id = 59
    """)

    # Leg 66: Mumbai -> Ahmednagar Drayage
    c.execute("UPDATE shipments SET status = 'IN_TRANSIT' WHERE id = '4653eb5d-88b5-4476-9e6a-aa6990515235'")
    c.execute("""
        UPDATE legs 
        SET status = 'IN_PROGRESS',
            planned_departure = '2026-10-01 07:30:00.000000',
            actual_departure = '2026-10-01 07:40:00.000000',
            planned_arrival = '2026-10-02 03:00:00.000000'
        WHERE id = 66
    """)

    # Leg 57: Delhi Tughlakabad ICD -> Delhi NCR Road Hub
    c.execute("""
        UPDATE legs 
        SET status = 'IN_PROGRESS',
            planned_departure = '2026-10-01 09:00:00.000000',
            actual_departure = '2026-10-01 09:10:00.000000',
            planned_arrival = '2026-10-02 05:00:00.000000'
        WHERE id = 57
    """)

    # Leg 70: Chennai Hub -> Chennai Cargo Gateway
    c.execute("UPDATE shipments SET status = 'IN_TRANSIT' WHERE id = '139808ae-c059-4691-8a4c-3619d8d4c2ce'")
    c.execute("""
        UPDATE legs 
        SET status = 'IN_PROGRESS',
            planned_departure = '2026-10-01 08:30:00.000000',
            actual_departure = '2026-10-01 08:35:00.000000',
            planned_arrival = '2026-10-02 06:00:00.000000'
        WHERE id = 70
    """)

    conn.commit()
    print("Successfully activated AIR and ROAD legs in SQLite!")

    # Verify
    c.execute("""
        SELECT l.id, l.transport_mode, l.status, l.planned_departure, l.planned_arrival
        FROM legs l
        WHERE l.status = 'IN_PROGRESS'
    """)
    rows = c.fetchall()
    print(f"Total IN_PROGRESS legs: {len(rows)}")
    for r in rows:
        print(" ", r)
    conn.close()

if __name__ == '__main__':
    activate()
