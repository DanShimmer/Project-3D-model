@echo off
REM ============================================
REM GPU Setup Script for RTX 3060 12GB
REM Full AI Service Installation
REM ============================================

echo.
echo ========================================
echo     POLYVA AI Service - GPU Setup
echo     Optimized for RTX 3060 12GB
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.10 or 3.11
    pause
    exit /b 1
)

REM Check CUDA
nvidia-smi >nul 2>&1
if errorlevel 1 (
    echo WARNING: nvidia-smi not found. GPU may not be available.
    echo Continuing anyway...
) else (
    echo.
    echo GPU Status:
    nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv
    echo.
)

REM Create virtual environment if not exists
if not exist "venv311" (
    echo Creating virtual environment...
    python -m venv venv311
)

REM Activate virtual environment
echo Activating virtual environment...
call venv311\Scripts\activate.bat

REM Upgrade pip
echo Upgrading pip...
python -m pip install --upgrade pip

REM Install PyTorch with CUDA 12.1 (best for RTX 3060)
echo.
echo ========================================
echo Installing PyTorch with CUDA 12.1...
echo ========================================
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

REM Install xformers for memory efficiency
echo.
echo ========================================
echo Installing xformers...
echo ========================================
pip install xformers

REM Install main requirements
echo.
echo ========================================
echo Installing main dependencies...
echo ========================================
pip install -r requirements.txt

REM Install texturing requirements if exists
if exist "requirements_texturing.txt" (
    echo.
    echo ========================================
    echo Installing texturing dependencies...
    echo ========================================
    pip install -r requirements_texturing.txt
)

REM Download models (optional, will auto-download on first use)
echo.
echo ========================================
echo Pre-downloading AI models...
echo This may take a while (several GB)
echo ========================================

python -c "
print('Downloading Stable Diffusion 1.5...')
from diffusers import StableDiffusionPipeline
import torch
pipe = StableDiffusionPipeline.from_pretrained(
    'runwayml/stable-diffusion-v1-5',
    torch_dtype=torch.float16,
    cache_dir='cache'
)
del pipe
print('SD 1.5 downloaded!')
"

REM Verify installation
echo.
echo ========================================
echo Verifying Installation...
echo ========================================

python -c "
import torch
print(f'PyTorch: {torch.__version__}')
print(f'CUDA available: {torch.cuda.is_available()}')
if torch.cuda.is_available():
    print(f'GPU: {torch.cuda.get_device_name(0)}')
    print(f'VRAM: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB')

try:
    import xformers
    print(f'xformers: {xformers.__version__}')
except:
    print('xformers: not installed')

from diffusers import __version__ as diffusers_version
print(f'diffusers: {diffusers_version}')

import trimesh
print(f'trimesh: {trimesh.__version__}')
"

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo To start the AI service:
echo   1. Activate: call venv311\Scripts\activate.bat
echo   2. Run: python app.py
echo.
echo Or use: start-ai-service.bat
echo.

pause
