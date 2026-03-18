@echo off
REM ============================================================
REM  Hunyuan3D-2 Installation Script
REM  GPU: NVIDIA RTX 3060 12GB+ recommended
REM  CUDA: 11.8 or 12.1
REM ============================================================
echo.
echo ============================================================
echo   Hunyuan3D-2 Setup - 3D Model Generation Engine
echo ============================================================
echo.

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found! Please install Python 3.10+ first.
    pause
    exit /b 1
)

REM Check if we're in the AI-service directory
if not exist "app.py" (
    echo [ERROR] Please run this script from the AI-service directory!
    echo   cd AI-service
    echo   setup_hunyuan3d.bat
    pause
    exit /b 1
)

REM Step 1: Create/activate virtual environment
echo.
echo [Step 1/6] Setting up Python virtual environment...
if not exist "..\\.venv" (
    echo Creating new virtual environment...
    python -m venv ..\.venv
)
call ..\.venv\Scripts\activate.bat
echo   OK - Virtual environment activated

REM Step 2: Install PyTorch with CUDA
echo.
echo [Step 2/6] Installing PyTorch with CUDA support...
echo   This may take a few minutes...
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121 --quiet
if errorlevel 1 (
    echo   Trying CUDA 11.8 instead...
    pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118 --quiet
)
echo   OK - PyTorch installed

REM Step 3: Install base requirements
echo.
echo [Step 3/6] Installing base requirements...
pip install -r requirements.txt --quiet
echo   OK - Base requirements installed

REM Step 4: Clone Hunyuan3D-2 repository
echo.
echo [Step 4/6] Setting up Hunyuan3D-2 repository...
if not exist "Hunyuan3D-2" (
    echo   Cloning Hunyuan3D-2 from GitHub...
    git clone https://github.com/Tencent/Hunyuan3D-2.git
    if errorlevel 1 (
        echo [ERROR] Failed to clone repository. Check your internet connection and git installation.
        pause
        exit /b 1
    )
) else (
    echo   Hunyuan3D-2 directory already exists, pulling latest...
    cd Hunyuan3D-2
    git pull
    cd ..
)

REM Step 5: Install Hunyuan3D-2 package
echo.
echo [Step 5/6] Installing Hunyuan3D-2 package (hy3dgen)...
cd Hunyuan3D-2

REM Install Hunyuan3D-2 requirements
if exist "requirements.txt" (
    pip install -r requirements.txt --quiet
)

REM Install the hy3dgen package in development mode
pip install -e . --quiet
if errorlevel 1 (
    echo [WARNING] pip install -e . failed, trying alternative...
    pip install . --quiet
)

REM Build custom CUDA extensions (required for texture generation)
echo.
echo   Building CUDA extensions (custom_rasterizer, differentiable_renderer)...
echo   This requires NVIDIA CUDA Toolkit to be installed.

if exist "hy3dgen\texgen\custom_rasterizer" (
    echo   Building custom_rasterizer...
    cd hy3dgen\texgen\custom_rasterizer
    pip install -e . --quiet 2>nul
    if errorlevel 1 (
        echo   [WARNING] custom_rasterizer build failed - texture generation may not work
        echo   You need NVIDIA CUDA Toolkit installed for this. Shape generation will still work.
    )
    cd ..\..\..
)

if exist "hy3dgen\texgen\differentiable_renderer" (
    echo   Building differentiable_renderer...
    cd hy3dgen\texgen\differentiable_renderer
    pip install -e . --quiet 2>nul
    if errorlevel 1 (
        echo   [WARNING] differentiable_renderer build failed - texture generation may not work
    )
    cd ..\..\..
)

cd ..
echo   OK - Hunyuan3D-2 installed

REM Step 6: Pre-download models
echo.
echo [Step 6/6] Pre-downloading Hunyuan3D-2 models...
echo   This will download ~5GB of model weights from HuggingFace.
echo   Models: tencent/Hunyuan3D-2 (shape + texture)
echo.

python -c "
from huggingface_hub import snapshot_download
import os

print('  Downloading Hunyuan3D-2 models...')
print('  (Shape: hunyuan3d-dit-v2-0-turbo, Texture: hunyuan3d-paint-v2-0)')
print()

try:
    # Download shape model (turbo version - faster inference)
    snapshot_download(
        'tencent/Hunyuan3D-2',
        allow_patterns=['hunyuan3d-dit-v2-0-turbo/**', 'config.json'],
        local_dir=os.path.join('cache', 'hunyuan3d-2'),
    )
    print('  OK - Shape model (turbo) downloaded')
except Exception as e:
    print(f'  Note: Model will be auto-downloaded on first use. ({e})')

try:
    # Download texture model
    snapshot_download(
        'tencent/Hunyuan3D-2',
        allow_patterns=['hunyuan3d-paint-v2-0/**'],
        local_dir=os.path.join('cache', 'hunyuan3d-2'),
    )
    print('  OK - Texture model downloaded')
except Exception as e:
    print(f'  Note: Texture model will be auto-downloaded on first use. ({e})')
"

echo.
echo ============================================================
echo   Setup Complete!
echo ============================================================
echo.
echo   3D Engine:   Hunyuan3D-2 (Tencent)
echo   Shape Model: hunyuan3d-dit-v2-0-turbo (5-step inference)
echo   VRAM Mode:   LOW_VRAM (CPU offload for 12GB GPUs)
echo.
echo   To start the AI service:
echo     start-ai-service.bat
echo.
echo   Configuration: config.py (Hunyuan3DConfig)
echo   GPU Settings:  LOW_VRAM_MODE = True (for RTX 3060 12GB)
echo.
echo   Tips for RTX 3060 12GB:
echo   - Shape generation: ~6GB VRAM, works great
echo   - Texture generation: ~16GB needed, uses CPU offload
echo   - If texture fails, disable in config: ENABLE_TEXTURE = False
echo.
pause
