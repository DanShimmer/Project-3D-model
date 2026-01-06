# =============================================================================
#                   POLYVA AI SERVICE - SETUP GUIDE
# =============================================================================
#
#    ███████╗███████╗████████╗██╗   ██╗██████╗ 
#    ██╔════╝██╔════╝╚══██╔══╝██║   ██║██╔══██╗
#    ███████╗█████╗     ██║   ██║   ██║██████╔╝
#    ╚════██║██╔══╝     ██║   ██║   ██║██╔═══╝ 
#    ███████║███████╗   ██║   ╚██████╔╝██║     
#    ╚══════╝╚══════╝   ╚═╝    ╚═════╝ ╚═╝     
#
# =============================================================================


## 🖥️ SYSTEM REQUIREMENTS

### Minimum:
- **GPU**: NVIDIA GTX 1070 / RTX 2060 (6GB VRAM)
- **RAM**: 16GB
- **Storage**: 20GB free (for models)
- **Python**: 3.10 or 3.11 (NOT 3.12+)
- **CUDA**: 11.8 or 12.1

### Recommended:
- **GPU**: NVIDIA RTX 3080 / 4080 (10GB+ VRAM)
- **RAM**: 32GB
- **Storage**: 50GB free


## 📁 FILES OVERVIEW

```
AI-service/
│
├── app_full.py         # 🚀 Production AI service (GPU required)
├── app_simple.py       # 🧪 Demo AI service (no GPU needed)
├── app.py              # Original AI service (backup)
│
├── requirements_full.txt    # Full requirements for GPU version
├── requirements.txt         # Basic requirements
│
├── TripoSR/            # Image-to-3D model (submodule)
├── cache/              # Downloaded model cache
├── outputs/            # Generated 3D models
└── uploads/            # Uploaded images
```


## 🚀 SETUP INSTRUCTIONS

### Option 1: Full GPU Setup (Recommended for Production)

```powershell
# 1. Navigate to AI service folder
cd "c:\Users\Administrator\Downloads\Project 3D model\AI-service"

# 2. Create virtual environment with Python 3.10/3.11
# Download Python 3.10/3.11 from python.org if needed
python -m venv venv

# 3. Activate virtual environment
.\venv\Scripts\activate

# 4. Install PyTorch with CUDA (Choose one based on your CUDA version)
# For CUDA 11.8:
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118

# For CUDA 12.1:
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121

# 5. Install other dependencies
pip install -r requirements_full.txt

# 6. Run the full AI service
python app_full.py
```


### Option 2: Demo Mode (No GPU Required)

```powershell
# 1. Navigate to AI service folder
cd "c:\Users\Administrator\Downloads\Project 3D model\AI-service"

# 2. Install minimal dependencies
pip install flask flask-cors python-dotenv pillow

# 3. Run demo service
python app_simple.py
```


## 🔧 TROUBLESHOOTING

### "CUDA not available"
- Install NVIDIA drivers: https://www.nvidia.com/drivers
- Install CUDA Toolkit: https://developer.nvidia.com/cuda-downloads
- Reinstall PyTorch with CUDA support

### "Python version error" / "open3d not compatible"
- Use Python 3.10 or 3.11
- Download from: https://www.python.org/downloads/
- Create new venv with correct Python version

### "Out of memory"
- Close other GPU applications
- Reduce resolution in ModelConfig
- Enable fp16 (already default)

### "Model download failed"
- Check internet connection
- Models are ~8GB total, may take time
- Check if cache folder has write permissions


## 📊 PERFORMANCE EXPECTATIONS

| GPU                | Text-to-3D | Image-to-3D |
|--------------------|------------|-------------|
| RTX 4090           | ~30s       | ~15s        |
| RTX 3080           | ~45s       | ~20s        |
| RTX 2080           | ~60s       | ~30s        |
| GTX 1080           | ~90s       | ~45s        |
| CPU (no GPU)       | ~10-15min  | ~5-10min    |


## 🌐 API ENDPOINTS

### Health Check
```bash
GET http://localhost:8000/health
```

### Text to 3D
```bash
POST http://localhost:8000/api/text-to-3d
Content-Type: application/json

{
    "prompt": "a cute cartoon robot",
    "mode": "fast"   // or "quality"
}
```

### Image to 3D
```bash
POST http://localhost:8000/api/image-to-3d
Content-Type: multipart/form-data

image: <file>
mode: fast
```


## 🔄 SWITCHING MODES

### Currently Running: Demo Mode
To switch to full production mode:
1. Stop current demo service (Ctrl+C)
2. Follow "Option 1: Full GPU Setup" above
3. Run: python app_full.py

### Need GPU?
The full version requires an NVIDIA GPU with CUDA support.
Without GPU, the demo mode returns sample 3D models for UI testing.


## ✅ VERIFY SETUP

Run this command to check everything:
```powershell
python -c "import torch; print(f'PyTorch: {torch.__version__}'); print(f'CUDA: {torch.cuda.is_available()}'); print(f'GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else \"None\"}')"
```

Expected output for GPU setup:
```
PyTorch: 2.x.x
CUDA: True
GPU: NVIDIA GeForce RTX XXXX
```
