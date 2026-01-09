@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1
title Polyva 3D - Service Launcher

:: ============================================
:: Script khoi dong tat ca services
:: Double-click file nay de chay
:: ============================================

:: Lay duong dan thu muc chua file bat nay
set "BASE_DIR=%~dp0"
:: Bo dau \ cuoi neu co
if "%BASE_DIR:~-1%"=="\" set "BASE_DIR=%BASE_DIR:~0,-1%"

cls
echo.
echo =========================================
echo   POLYVA 3D - SERVICE LAUNCHER
echo =========================================
echo.
echo Base Directory: %BASE_DIR%
echo.

:: Kiem tra thu muc ton tai
if not exist "%BASE_DIR%\AI-service" (
    echo [ERROR] AI-service folder not found!
    pause
    exit /b 1
)

if not exist "%BASE_DIR%\Back-end" (
    echo [ERROR] Back-end folder not found!
    pause
    exit /b 1
)

if not exist "%BASE_DIR%\front-end" (
    echo [ERROR] front-end folder not found!
    pause
    exit /b 1
)

:: ============================================
:: Khoi dong AI Service
:: ============================================
echo [1/3] Starting AI Service (Port 5001)...

:: Kiem tra virtual environment
if exist "%BASE_DIR%\AI-service\venv311\Scripts\activate.bat" (
    start "AI Service - Port 5001" cmd /k "cd /d "%BASE_DIR%\AI-service" && call venv311\Scripts\activate.bat && echo AI Service starting... && python app.py"
) else (
    echo [WARNING] venv311 not found, trying default python...
    start "AI Service - Port 5001" cmd /k "cd /d "%BASE_DIR%\AI-service" && echo AI Service starting... && python app.py"
)

echo    Waiting for AI Service to initialize...
timeout /t 5 /nobreak > nul

:: ============================================
:: Khoi dong Backend
:: ============================================
echo [2/3] Starting Backend Service (Port 5000)...

:: Kiem tra node_modules
if not exist "%BASE_DIR%\Back-end\src\node_modules" (
    echo    Installing Backend dependencies...
    start "Backend Install" /wait cmd /c "cd /d "%BASE_DIR%\Back-end\src" && npm install"
)

start "Backend - Port 5000" cmd /k "cd /d "%BASE_DIR%\Back-end\src" && echo Backend starting... && npm run dev"

echo    Waiting for Backend to initialize...
timeout /t 3 /nobreak > nul

:: ============================================
:: Khoi dong Frontend
:: ============================================
echo [3/3] Starting Frontend (Port 3000)...

:: Kiem tra node_modules
if not exist "%BASE_DIR%\front-end\node_modules" (
    echo    Installing Frontend dependencies...
    start "Frontend Install" /wait cmd /c "cd /d "%BASE_DIR%\front-end" && npm install"
)

start "Frontend - Port 3000" cmd /k "cd /d "%BASE_DIR%\front-end" && echo Frontend starting... && npm run dev"

echo    Waiting for Frontend to initialize...
timeout /t 5 /nobreak > nul

:: ============================================
:: Hoan tat
:: ============================================
echo.
echo =========================================
echo   ALL SERVICES STARTED!
echo =========================================
echo.
echo   Frontend:    http://localhost:3000
echo   Backend:     http://localhost:5000
echo   AI Service:  http://localhost:5001
echo.
echo =========================================
echo.
echo Opening browser...
timeout /t 2 /nobreak > nul

:: Mo trinh duyet
start "" "http://localhost:3000"

echo.
echo Press any key to close this window...
echo (Services will continue running in their own windows)
pause > nul
