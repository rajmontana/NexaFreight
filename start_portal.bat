@echo off
title SmartTrack Multi-Modal Logistics Intelligence Control Tower
color 0b
echo ======================================================================
echo    STARTING SMARTTRACK(TM) LOGISTICS CONTROL TOWER SERVER (PORT 8000)
echo ======================================================================
echo.
echo [1/3] Navigating to backend directory...
cd /d d:\smart_track\backend

echo [2/3] Initializing FastAPI, XGBoost Regressor, PostgreSQL & Telemetry...
echo.
echo [3/3] SERVER IS LIVE! Open your browser and navigate to:
echo.
echo       >>>  http://localhost:8000  <<<
echo.
echo Demo Credentials:
echo   - Email:    manager@nexafreight.com
echo   - Password: SmartTrack2025
echo.
echo Press CTRL+C to stop the server at any time.
echo ======================================================================
echo.
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
pause
