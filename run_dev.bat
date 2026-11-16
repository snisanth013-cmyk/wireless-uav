@echo off
echo =========================================================================
echo  UAV-DRN - Starting Development Servers (Backend + Frontend Dev)
echo =========================================================================
echo.
set PYTHONPATH=%~dp0uav_drn_implementation;%PYTHONPATH%

start cmd /k "echo Starting Flask API on :5000... && C:\Users\snisa\AppData\Local\Programs\Python\Python312\python.exe backend\app.py"
start cmd /k "echo Starting Vite Dev Server on :5173... && cd frontend && npm run dev"

echo.
echo Both servers are starting up:
echo  - Backend API: http://127.0.0.1:5000
echo  - Frontend UI: http://127.0.0.1:5173
echo.
start "" http://localhost:5173
