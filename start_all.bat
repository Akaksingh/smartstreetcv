@echo off
echo ========================================
echo  NagarAI — Starting All Services
echo ========================================

echo.
echo [1/3] Starting VLM Server on port 8001...
start "VLM Server" cmd /k "cd /d D:\smartstreetcv && D:\smartstreetcv\backend\.venv\Scripts\python.exe vlm_server.py"

timeout /t 2 /nobreak >nul

echo [2/3] Starting Backend API on port 8000...
start "NagarAI Backend" cmd /k "cd /d D:\smartstreetcv\backend && .venv\Scripts\uvicorn main:app --reload --port 8000"

timeout /t 3 /nobreak >nul

echo [3/3] Starting Frontend on port 3000...
start "NagarAI Frontend" cmd /k "cd /d D:\smartstreetcv\frontend && npm run dev"

echo.
echo ========================================
echo  All services started!
echo  - Frontend : http://localhost:3000
echo  - Backend  : http://localhost:8000
echo  - API Docs : http://localhost:8000/docs
echo  - VLM      : http://localhost:8001
echo ========================================
echo.
echo Close this window or press any key to exit.
pause >nul
