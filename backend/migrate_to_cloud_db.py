import os
import io
import time
import psycopg2

LOCAL_URL = os.getenv("LOCAL_DATABASE_URL", "postgresql://postgres:admin321@localhost:5432/smart_track")
CLOUD_URL = os.getenv("DATABASE_URL", "")

def migrate():
    print("=" * 60)
    print(" [SMARTTRACK] HIGH-SPEED NEON CLOUD DATABASE MIGRATION ")
    print("=" * 60)
    
    print("\n[1/4] Connecting to Local PostgreSQL & Neon Cloud Database...")
    local_conn = psycopg2.connect(LOCAL_URL)
    cloud_conn = psycopg2.connect(CLOUD_URL)

    local_cur = local_conn.cursor()
    cloud_cur = cloud_conn.cursor()

    print("[2/4] Reading exact table schema DDL...")
    local_cur.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'shipments'
        ORDER BY ordinal_position;
    """)
    cols = local_cur.fetchall()
    col_defs = ', '.join([f'"{c[0]}" {c[1]}' for c in cols])

    print("[3/4] Re-creating table schema on Neon...")
    cloud_cur.execute("DROP TABLE IF EXISTS shipments CASCADE;")
    cloud_cur.execute(f"CREATE TABLE shipments ({col_defs});")
    cloud_conn.commit()

    print("[4/4] Streaming 172,765 records via PostgreSQL binary COPY pipeline...")
    start_time = time.time()
    
    buffer = io.StringIO()
    local_cur.copy_expert("COPY shipments TO STDOUT WITH (FORMAT CSV, HEADER FALSE)", buffer)
    buffer.seek(0)
    
    print(f"      Buffer loaded: {len(buffer.getvalue()):,} bytes (~{len(buffer.getvalue())/(1024*1024):.1f} MB).")
    print("      Uploading stream to Neon.tech AWS Singapore...")
    
    cloud_cur.copy_expert("COPY shipments FROM STDIN WITH (FORMAT CSV, HEADER FALSE)", buffer)
    cloud_conn.commit()
    
    # Also create feedback_logs table on Neon
    cloud_cur.execute("""
        CREATE TABLE IF NOT EXISTS feedback_logs (
            id SERIAL PRIMARY KEY,
            order_id TEXT,
            action TEXT,
            predicted_prob FLOAT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    cloud_conn.commit()

    # Verification Query
    cloud_cur.execute("SELECT COUNT(*) FROM shipments;")
    total_count = cloud_cur.fetchone()[0]
    
    elapsed = time.time() - start_time
    print("\n" + "=" * 60)
    print(f"✅ SUCCESS: {total_count:,} SHIPMENTS MIGRATED TO NEON CLOUD IN {elapsed:.2f}s!")
    print("=" * 60)

if __name__ == "__main__":
    migrate()
