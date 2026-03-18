@echo off
chcp 65001 >nul 2>&1
title Polyva 3D - Start All

set "BASE_DIR=%~dp0"

:: ---- CUDA Environment ----
set "CUDA_PATH=C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.1"
set "CUDA_HOME=%CUDA_PATH%"
set "PATH=%CUDA_PATH%\bin;%PATH%"
set "CUDA_VISIBLE_DEVICES=0"
set "PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:512"

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

:: ---- Stop any existing services first ----
echo  Cleaning up old processes...
taskkill /FI "WINDOWTITLE eq AI-Service*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Backend*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Frontend*" /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr :8000 ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr :5000 ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr :3000 ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>&1
timeout /t 2 /nobreak >nul

:: ---- 1. AI Service ----
echo  [1/3] AI Service (Hunyuan3D-2)...

:: Create temporary launcher scripts to avoid nested-quote issues in CMD
set "AI_LAUNCHER=%TEMP%\polyva_ai_start.bat"
> "%AI_LAUNCHER%" (
    echo @echo off
    echo title AI-Service
    echo cd /d "%BASE_DIR%AI-service"
    echo set "CUDA_PATH=C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.1"
    echo set "CUDA_HOME=%%CUDA_PATH%%"
    echo set "PATH=%%CUDA_PATH%%\bin;%%PATH%%"
    echo set "CUDA_VISIBLE_DEVICES=0"
    echo set "PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:512"
)
if exist "%BASE_DIR%AI-service\venv\Scripts\activate.bat" (
    >> "%AI_LAUNCHER%" echo call venv\Scripts\activate.bat
) else if exist "%BASE_DIR%.venv\Scripts\activate.bat" (
    >> "%AI_LAUNCHER%" echo call "%BASE_DIR%.venv\Scripts\activate.bat"
)
>> "%AI_LAUNCHER%" (
    echo python app.py
    echo pause
)
start "AI-Service" /min cmd /c "%AI_LAUNCHER%"
echo  [OK] AI Service starting on port 8000
timeout /t 5 /nobreak >nul

:: ---- 2. Backend ----
echo  [2/3] Backend...
set "BE_LAUNCHER=%TEMP%\polyva_be_start.bat"
> "%BE_LAUNCHER%" (
    echo @echo off
    echo title Backend
    echo cd /d "%BASE_DIR%Back-end\src"
    echo npm run dev
    echo pause
)
start "Backend" /min cmd /c "%BE_LAUNCHER%"
echo  [OK] Backend starting on port 5000
timeout /t 3 /nobreak >nul

:: ---- 3. Frontend ----
echo  [3/3] Frontend...
set "FE_LAUNCHER=%TEMP%\polyva_fe_start.bat"
> "%FE_LAUNCHER%" (
    echo @echo off
    echo title Frontend
    echo cd /d "%BASE_DIR%front-end"
    echo npm run dev
    echo pause
)
start "Frontend" /min cmd /c "%FE_LAUNCHER%"
echo  [OK] Frontend starting on port 3000
timeout /t 5 /nobreak >nul

:: ---- Done ----
echo.
echo  ========================================
echo   ALL RUNNING!
echo  ========================================
echo   Frontend:   http://localhost:3000
echo   Backend:    http://localhost:5000
echo   AI Service: http://localhost:8000
echo   3D Engine:  Hunyuan3D-2 (Tencent)
echo  ========================================
echo.

:: ---- Open in Coc Coc Browser ----
echo  Opening in Coc Coc...
if exist "C:\Program Files\CocCoc\Browser\Application\browser.exe" (
    start "" "C:\Program Files\CocCoc\Browser\Application\browser.exe" "http://localhost:3000"
) else if exist "C:\Program Files (x86)\CocCoc\Browser\Application\browser.exe" (
    start "" "C:\Program Files (x86)\CocCoc\Browser\Application\browser.exe" "http://localhost:3000"
) else (
    echo  [!] Coc Coc not found, opening with default browser...
    start http://localhost:3000
)

echo.
echo  Press any key to close this window...
echo  (Services will keep running in background)
pause >nul
