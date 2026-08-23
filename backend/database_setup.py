import os
import pandas as pd
from sqlalchemy import create_engine, text

def setup_database():
    print("="*50)
    print("STARTING POSTGRESQL DATABASE INGESTION")
    print("="*50)
    
    # Credentials
    db_user = "postgres"
    db_pass = "admin321"
    db_host = "localhost"
    db_port = "5432"
    new_db_name = "smart_track"
    
    csv_path = r"d:\smart_track\processed_data\ml_ready_shipments.csv"
    
    if not os.path.exists(csv_path):
        print(f"ERROR: Cannot find {csv_path}")
        return

    # 1. Connect to default postgres database to create the new one
    print(f"Connecting to default Postgres to create database '{new_db_name}'...")
    default_engine = create_engine(f"postgresql://{db_user}:{db_pass}@{db_host}:{db_port}/postgres")
    
    try:
        with default_engine.connect() as conn:
            # Must commit out of any transaction block to create a DB
            conn.execute(text("COMMIT"))
            # Check if DB exists
            result = conn.execute(text(f"SELECT 1 FROM pg_database WHERE datname = '{new_db_name}'"))
            if not result.fetchone():
                print(f"Creating database {new_db_name}...")
                conn.execute(text(f"CREATE DATABASE {new_db_name}"))
            else:
                print(f"Database '{new_db_name}' already exists.")
    except Exception as e:
        print(f"ERROR: Failed to connect or create DB. Is Postgres running? Details: {e}")
        return

    # 2. Connect to the new database
    print(f"\nConnecting to '{new_db_name}'...")
    engine = create_engine(f"postgresql://{db_user}:{db_pass}@{db_host}:{db_port}/{new_db_name}")

    # 3. Read CSV and Ingest
    print(f"Loading {csv_path} into memory...")
    df = pd.read_csv(csv_path)
    
    # We will clean up column names so they are SQL friendly (lowercase, replace spaces with underscores)
    df.columns = [c.strip().lower().replace(" ", "_").replace("(", "").replace(")", "").replace("/", "_") for c in df.columns]
    
    table_name = "shipments"
    print(f"Ingesting {len(df)} rows into table '{table_name}' (This may take a minute)...")
    
    try:
        # chunksize helps avoid memory issues
        df.to_sql(table_name, engine, if_exists='replace', index=False, chunksize=10000, method='multi')
        print(f"SUCCESS! {len(df)} records inserted into {table_name}.")
    except Exception as e:
        print(f"ERROR during ingestion: {e}")
        
    print("="*50)
    print("DATABASE SETUP COMPLETE")
    print("="*50)

if __name__ == "__main__":
    setup_database()
