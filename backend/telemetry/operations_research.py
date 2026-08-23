import pandas as pd
import numpy as np

def apply_operations_research(df):
    print("Applying Six Sigma Operations Research & Financial TCO Engine...")
    
    # 1. IATA Volumetric Density Matrix (Cargo Mass Engineering)
    # Default density is 1.0 kg/unit if not strictly matched
    density_map = {
        'Cleats': 1.2,
        'Women\'s Apparel': 0.4,
        'Men\'s Footwear': 1.2,
        'Golf Equipment': 8.5,
        'Water Sports': 22.0,
        'Cardio Equipment': 45.0,
        'Shop By Sport': 3.0,
        'Camping & Hiking': 5.0,
        'Fitness Accessories': 2.0,
        'Fishing': 4.5,
        'Electronics': 2.5
    }
    
    df['Density_Factor'] = df['Category Name'].map(density_map).fillna(1.5)
    df['Computed_Cargo_Mass_KG'] = df['Order Item Quantity'] * df['Density_Factor']
    
    # 2. SOLAS VGM Container Mass Checks
    # In reality, this is per container. We will estimate bundle weights per Order Id.
    # Since we dropped Order Id, we evaluate line-item risk.
    df['SOLAS_OVERWEIGHT_HOLD'] = (df['Computed_Cargo_Mass_KG'] > 28200).astype(int)
    
    # 3. Financial Engine: Port Demurrage (SOP-ST-LOG-009)
    # Standard Ocean Free Time (Dry) = 4 days (96 hours). Penalty = $70/day (converted from INR 5900)
    def calculate_demurrage(row):
        delay = row.get('Simulated_Ship_Delay_Hrs', 0)
        shipping_mode = row.get('Shipping Mode', '')
        
        # Default initialization for SOP rules
        dem_cost = 0.0
        dem_001 = False
        dem_002 = False
        dem_003 = False
        dem_004 = False
        dem_005 = False
        dem_006 = False
        escalation_rule = "None"
        
        if shipping_mode == 'Standard Class':
            free_time_hrs = 96
            
            # DEM-001: Ocean container approaching free-time expiry (<= 24 hr remaining)
            # Meaning delay is between 72 and 96 hours
            if 72 <= delay <= 96:
                dem_001 = True
                
            # DEM-002: Free time expired (Day 1 after free time)
            if delay > 96:
                dem_002 = True
                days_over = (delay - 96) / 24.0
                dem_cost = days_over * 70.0  # $70/day penalty
                
            # DEM-003: Demurrage exposure increasing > $250/day
            if dem_cost > 250.0:
                dem_003 = True
                
            # DEM-004: Extended port delay > 48 hr delay
            if delay > 48:
                dem_004 = True
                escalation_rule = "Evaluate alternate port/feeder reroute"
                
            # DEM-005: Critical cargo delay > 72 hr
            if delay > 72:
                dem_005 = True
                escalation_rule = "Evaluate partial air expedite"
                
        # DEM-006: Major financial exposure > $25,000 (We calculate this below after OTIF)
        return pd.Series([dem_cost, dem_001, dem_002, dem_003, dem_004, dem_005, dem_006, escalation_rule])
        
    print("Applying SOP-ST-LOG-009 Rulebook...")
    sop_cols = ['Demurrage_Cost_USD', 'DEM_001_Warning', 'DEM_002_Expired', 'DEM_003_FinRisk', 
                'DEM_004_Reroute', 'DEM_005_Expedite', 'DEM_006_Approval', 'SOP_Escalation']
    
    df[sop_cols] = df.apply(calculate_demurrage, axis=1)
        
    # 4. Financial Engine: OTIF Penalty Exposure (5% fine)
    df['OTIF_Penalty_Exposure'] = df.apply(
        lambda x: x['Sales'] * 0.05 if x.get('Late_delivery_risk', 0) == 1 else 0.0, 
        axis=1
    )
    
    # Calculate Total Mitigation/Financial Exposure
    df['Total_Financial_Exposure'] = df['Demurrage_Cost_USD'] + df['OTIF_Penalty_Exposure']
    
    # DEM-006: Require management approval if Total Exposure > $25k
    df.loc[df['Total_Financial_Exposure'] > 25000, 'DEM_006_Approval'] = True
    df.loc[df['Total_Financial_Exposure'] > 25000, 'SOP_Escalation'] = "Require management approval (Regional Director)"

    
    # Clean up temp cols
    df.drop(columns=['Density_Factor'], inplace=True)
    
    print("Operations Research application complete.")
    return df
