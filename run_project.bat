@echo off
echo =========================================================================
echo  UAV-Assisted Cellular Networks for Disaster Recovery (UAV-DRN)
echo  SRM Institute of Science and Technology - Final Year Project
echo =========================================================================
echo.
echo [1/2] Starting Flask Simulation Engine + Integrated React Web Server...
set PYTHONPATH=%~dp0uav_drn_implementation;%PYTHONPATH%

start "" http://127.0.0.1:5000

"C:\Users\snisa\AppData\Local\Programs\Python\Python312\python.exe" backend\app.py

pause
