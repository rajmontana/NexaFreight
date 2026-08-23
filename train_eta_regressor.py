import pandas as pd
import xgboost as xgb
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import joblib
import json
import time

def train_eta():
    print("="*60)
    print(" [STARTING] TRAINING XGBOOST ETA REGRESSOR (GPU) ")
    print("="*60)

    # 1. Load Data
    print("\nLoading augmented dataset splits...")
    try:
        train_df = pd.read_csv('processed_data/train_processed.csv')
        test_df = pd.read_csv('processed_data/test_processed.csv')
        
        target_col = 'Days for shipping (real)'
        y_train = train_df[target_col]
        X_train = train_df.drop(columns=[target_col])
        
        y_test = test_df[target_col]
        X_test = test_df.drop(columns=[target_col])
    except FileNotFoundError:
        print("Dataset not found! Please run dataco_pipeline.py first.")
        return

    print(f"Training Features: {X_train.shape[1]}")
    print(f"Training Samples: {X_train.shape[0]}")
    
    # Check for non-numeric columns
    non_numeric_cols = X_train.select_dtypes(exclude=['number']).columns
    if len(non_numeric_cols) > 0:
        print(f"WARNING: Dropping non-numeric columns that leaked: {list(non_numeric_cols)}")
        X_train = X_train.drop(columns=non_numeric_cols)
        X_test = X_test.drop(columns=non_numeric_cols)

    # 2. Configure XGBoost Regressor for GPU
    print("\nConfiguring XGBRegressor (tree_method='hist', device='cuda')...")
    model = xgb.XGBRegressor(
        tree_method='hist',
        device='cuda',
        n_estimators=1000,       
        max_depth=8,            
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        eval_metric='mae'
    )

    # 3. Train Model
    start_time = time.time()
    print("Training model... (This will be lightning fast on the RTX 3050)")
    
    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=100
    )
    
    end_time = time.time()
    print(f"Training completed in {end_time - start_time:.2f} seconds!")

    # 4. Evaluate Performance
    print("\nEvaluating ETA Accuracy...")
    y_pred = model.predict(X_test)
    
    mae = mean_absolute_error(y_test, y_pred)
    import numpy as np
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2 = r2_score(y_test, y_pred)
    
    print(f"Mean Absolute Error (MAE): {mae:.4f} days")
    print(f"Root Mean Squared Error (RMSE): {rmse:.4f} days")
    print(f"R2 Score: {r2:.4f}")
    
    print(f"-> The AI is accurate to within {mae*24:.1f} hours of the exact delivery time!")

    # 5. Extract Feature Importances
    importances = model.feature_importances_
    feature_names = X_train.columns
    feature_importance_dict = {str(feat): float(imp) for feat, imp in zip(feature_names, importances)}
    
    # Sort importances
    sorted_importances = dict(sorted(feature_importance_dict.items(), key=lambda item: item[1], reverse=True))

    print("\nTop 10 Most Important Features:")
    for i, (feat, imp) in enumerate(list(sorted_importances.items())[:10]):
        print(f"  {i+1}. {feat}: {imp:.4f}")

    # 6. Save Artifacts
    print("\nSaving Models and Artifacts...")
    
    joblib.dump(model, 'backend/models/eta_prediction_model.pkl')
    print("Saved 'backend/models/eta_prediction_model.pkl'")
    
    with open('backend/models/eta_feature_importances.json', 'w') as f:
        json.dump(sorted_importances, f, indent=4)
    print("Saved 'backend/models/eta_feature_importances.json'")
    
    print("\n✅ ETA Engine Successfully Trained!")

if __name__ == "__main__":
    train_eta()
