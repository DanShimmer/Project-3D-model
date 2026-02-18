@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1
title Polyva 3D - Start All

set "BASE_DIR=%~dp0"

cls
echo.
echo  ========================================
echo     POLYVA 3D - Starting Services
echo  ========================================
echo.

nvidia-smi --query-gpu=name --format=csv,noheader 2>nul
if %errorlevel%==0 (
    echo  [OK] GPU detected
) else (
    echo  [!] CPU mode
)

echo.
echo  [1/3] AI Service...
if exist "%BASE_DIR%AI-service\venv311\Scripts\activate.bat" (
    start "AI-Service" /min cmd /k "cd /d "%BASE_DIR%AI-service" & call venv311\Scripts\activate.bat & python app.py"
) else (
    start "AI-Service" /min cmd /k "cd /d "%BASE_DIR%AI-service" & python app.py"
)
timeout /t 3 /nobreak >nul

echo  [2/3] Backend...
start "Backend" /min cmd /k "cd /d "%BASE_DIR%Back-end\src" & npm run dev"
timeout /t 2 /nobreak >nul

echo  [3/3] Frontend...
start "Frontend" /min cmd /k "cd /d "%BASE_DIR%front-end" & npm run dev"
timeout /t 3 /nobreak >nul

echo.
echo  ========================================
echo   ALL RUNNING!
echo  ========================================
echo   Frontend:   http://localhost:3000
echo   Backend:    http://localhost:5000
echo   AI Service: http://localhost:5001
echo  ========================================
echo.

timeout /t 2 /nobreak >nul
start http://localhost:3000

echo  Press any key to close...
pause >nul
