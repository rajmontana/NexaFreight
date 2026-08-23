import pandas as pd
import numpy as np
import os
import sys
from sqlalchemy import create_engine
from sklearn.preprocessing import LabelEncoder
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from backend.telemetry.telemetry_engine import generate_telemetry_features
from backend.telemetry.operations_research import apply_operations_research

def run_dataco_pipeline():
    print("="*60)
    print("INITIALIZING DATACO PIPELINE WITH POSTGRES AUGMENTATION")
    print("="*60)

    # 1. Load Raw DataCo Data
    raw_path = r"D:\smart_track\DataCoSupplyChainDataset.csv"
    out_dir = r"d:\smart_track\processed_data"
    os.makedirs(out_dir, exist_ok=True)
    
    print(f"Loading {raw_path}...")
    df = pd.read_csv(raw_path, encoding='latin1')
    
    # 2. Connect to Postgres to fetch augmentation data
    print("Connecting to Postgres (localhost:5432) to fetch Weather & Port telemetry...")
    engine = create_engine("postgresql://postgres:admin321@localhost:5432/smart_track")
    
    df_weather = pd.read_sql("SELECT order_city, date, precipitation_mm, max_wind_kmh FROM historical_weather", engine)
    
    # For ports, we get the global daily sum
    port_query = "SELECT date, sum(portcalls) as global_daily_portcalls FROM port_activity GROUP BY date"
    df_port = pd.read_sql(port_query, engine)

    # 3. Drop Leakage Columns
    leakage_cols = [
        'Delivery Status', 
        'Order Status', 
        'shipping date (DateOrders)'
    ]
    df.drop(columns=[col for col in leakage_cols if col in df.columns], inplace=True)

    # 3.5 Run Telemetry Physics Engine (Needs Zipcodes)
    df = generate_telemetry_features(df)
    
    # 3.7 Run Operations Research & Financial Engine
    df = apply_operations_research(df)

    # 4. Drop PII, Noise, and Redundant Categorical Geographies
    # We drop States and Regions because we are generating exact physical coordinates
    # and Haversine distances in the telemetry engine, which XGBoost vastly prefers.
    noise_cols = [
        'Customer Email', 'Customer Password', 'Customer Fname', 'Customer Lname', 
        'Customer Street', 'Product Image', 'Product Description', 
        'Order Zipcode', 'Customer Zipcode', 'Customer State', 'Order State', 'Order Region',
        'Order Id', 'Order Item Id', 'Customer Id', 'Product Card Id', 
        'Order Item Cardprod Id', 'Category Id', 'Department Id', 'Product Category Id'
    ]
    df.drop(columns=[col for col in noise_cols if col in df.columns], inplace=True)

    # 5. Feature Engineering: Deep Temporal & Date Formatting for SQL Joins
    print("Extracting Temporal Patterns and formatting SQL join keys...")
    df['order date (DateOrders)'] = pd.to_datetime(df['order date (DateOrders)'], format='mixed')
    
    # Store standard date string for joining with weather/port
    df['join_date'] = df['order date (DateOrders)'].dt.strftime('%Y-%m-%d')
    
    # Temporal Features
    df['Order_Month'] = df['order date (DateOrders)'].dt.month
    df['Order_DayOfWeek'] = df['order date (DateOrders)'].dt.dayofweek
    df['Order_Hour'] = df['order date (DateOrders)'].dt.hour
    df['Is_Weekend'] = df['Order_DayOfWeek'].apply(lambda x: 1 if x >= 5 else 0)

    # Format SQL date strings
    df_weather['date'] = pd.to_datetime(df_weather['date'], format='mixed').dt.strftime('%Y-%m-%d')
    df_port['date'] = pd.to_datetime(df_port['date']).dt.strftime('%Y-%m-%d')

    # 6. Perform the Left-Joins (Data Augmentation)
    print("Merging Weather data by Order City and Date...")
    df = pd.merge(df, df_weather, how='left', left_on=['Order City', 'join_date'], right_on=['order_city', 'date'])
    
    print("Merging Global Port Congestion telemetry by Date...")
    df = pd.merge(df, df_port, how='left', left_on='join_date', right_on='date')

    # Clean up join keys to prevent strings from leaking into XGBoost
    drop_keys = ['join_date', 'date_x', 'date_y', 'order_city', 'order date (DateOrders)']
    df.drop(columns=[k for k in drop_keys if k in df.columns], inplace=True, errors='ignore')

    # 7. Handle Missing Values
    print("Imputing missing values...")
    # If weather/port is missing, default to 0 for weather, and median for ports
    if 'precipitation_mm' in df.columns:
        df['precipitation_mm'] = df['precipitation_mm'].fillna(0)
    if 'max_wind_kmh' in df.columns:
        df['max_wind_kmh'] = df['max_wind_kmh'].fillna(0)
    if 'global_daily_portcalls' in df.columns:
        df['global_daily_portcalls'] = df['global_daily_portcalls'].fillna(df['global_daily_portcalls'].median())

    for col in df.columns:
        if df[col].dtype == 'object':
            df[col] = df[col].fillna("UNKNOWN")
        else:
            df[col] = df[col].fillna(df[col].median())

    # 8. Label Encoding
    print("Encoding categorical strings to numerics...")
    categorical_cols = df.select_dtypes(include=['object']).columns
    le = LabelEncoder()
    for col in categorical_cols:
        df[col] = df[col].astype(str)
        df[col] = le.fit_transform(df[col])

    # 9. Split into Train/Test
    # Split into Train/Test for ETA REGRESSOR (Continuous)
    # The target is 'Days for shipping (real)'
    print("Performing strict 80/20 random split for ETA Regressor...")
    target_col = 'Days for shipping (real)'
    
    # Sort just to ensure determinism if needed, but we will shuffle via train_test_split
    from sklearn.model_selection import train_test_split
    
    # We must drop Late_delivery_risk since it is mathematically correlated with the real shipping days
    df.drop(columns=['Late_delivery_risk'], inplace=True, errors='ignore')
    
    y = df[target_col]
    X = df.drop(columns=[target_col])
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    train_df = X_train.copy()
    train_df[target_col] = y_train
    
    test_df = X_test.copy()
    test_df[target_col] = y_test

    print(f"Final Train shape: {train_df.shape}")
    print(f"Final Test shape: {test_df.shape}")

    # 10. Export
    train_path = os.path.join(out_dir, "train_processed.csv")
    test_path = os.path.join(out_dir, "test_processed.csv")
    
    print("Writing augmented matrices to disk...")
    train_df.to_csv(train_path, index=False)
    test_df.to_csv(test_path, index=False)
    
    print("="*60)
    print("AUGMENTATION PIPELINE COMPLETE")
    print("="*60)

if __name__ == "__main__":
    run_dataco_pipeline()
