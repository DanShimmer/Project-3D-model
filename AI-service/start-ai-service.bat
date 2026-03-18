@echo off
REM Start AI Service with GPU optimizations

echo Starting Polyva AI Service...
echo.

cd /d "%~dp0"

REM Activate virtual environment (try venv first, then venv311)
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
) else if exist venv311\Scripts\activate.bat (
    call venv311\Scripts\activate.bat
) else (
    echo WARNING: No virtual environment found. Using system Python.
)

REM Set environment variables for GPU optimization
set CUDA_VISIBLE_DEVICES=0
set PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:512

REM Start the service
echo.
echo ========================================
echo    Polyva AI Service
echo    http://localhost:8000
echo ========================================
echo.

python app.py
