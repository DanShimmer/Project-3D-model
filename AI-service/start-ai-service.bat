@echo off
REM Start AI Service with GPU optimizations

echo Starting Polyva AI Service...
echo.

cd /d "%~dp0"

REM Activate virtual environment
call venv311\Scripts\activate.bat

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
