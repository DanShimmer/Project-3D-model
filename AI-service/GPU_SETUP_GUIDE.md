# GPU Setup Guide for Phase 2 Features

## Tổng Quan

Hệ thống Phase 2 được thiết kế với cơ chế **dual-mode**:
- **Demo Mode**: Chạy khi không có GPU, mô phỏng kết quả để test UI/UX
- **GPU Mode**: Khi có GPU đủ mạnh, sử dụng AI thực sự để render

## Yêu Cầu Phần Cứng

### GPU Khuyến Nghị
| Feature | VRAM Tối Thiểu | GPU Khuyến Nghị |
|---------|----------------|-----------------|
| Texturing | 6GB | RTX 3060, RTX 4060 |
| Rigging | 4GB | GTX 1660, RTX 2060 |
| Animation | 4GB | GTX 1660, RTX 2060 |
| Remeshing | 8GB | RTX 3070, RTX 4070 |
| Full Pipeline | 12GB+ | RTX 3080, RTX 4080, A4000 |

### CUDA Requirements
- CUDA 11.7+ (khuyến nghị 12.1)
- cuDNN 8.6+
- PyTorch 2.0+ với CUDA support

## Cài Đặt

### 1. Cài Đặt PyTorch với CUDA

```bash
# Vào virtual environment
cd AI-service
.\venv311\Scripts\activate

# Cài PyTorch với CUDA (chọn version phù hợp)
# CUDA 11.8
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# CUDA 12.1
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

### 2. Kiểm Tra GPU

```python
import torch
print(f"CUDA available: {torch.cuda.is_available()}")
print(f"GPU: {torch.cuda.get_device_name(0)}")
print(f"VRAM: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB")
```

### 3. Bật GPU Mode

Trong file `phase2_service.py`, tìm class `Phase2Config`:

```python
class Phase2Config:
    # Chuyển từ False sang True khi có GPU
    ENABLE_GPU_FEATURES = True  # <-- Đổi thành True
```

Hoặc sử dụng biến môi trường:

```bash
# Windows
set ENABLE_GPU_FEATURES=true

# Linux/Mac
export ENABLE_GPU_FEATURES=true
```

## Phase 2 Services Chi Tiết

### 1. TexturingService
**Mục đích**: Tự động tạo texture cho 3D model

**Khi GPU enabled**:
- Sử dụng Stable Diffusion để generate texture maps
- Hỗ trợ nhiều style: realistic, stylized, PBR, hand-painted
- Generate diffuse, normal, roughness, metallic maps

**Models cần cài**:
```bash
pip install diffusers transformers accelerate
# Download model
python -c "from diffusers import StableDiffusionPipeline; StableDiffusionPipeline.from_pretrained('runwayml/stable-diffusion-v1-5')"
```

### 2. RiggingService  
**Mục đích**: Tự động rig model cho animation

**Khi GPU enabled**:
- Sử dụng AI để detect body parts
- Auto-generate bone hierarchy
- Support: Humanoid, Quadruped, Custom

**Models cần cài**:
```bash
pip install mediapipe  # For pose detection
```

### 3. AnimationService
**Mục đích**: Thêm animation vào rigged model

**Khi GPU enabled**:
- Support pre-defined animations (walk, run, idle, jump, etc.)
- Mixamo-compatible animations
- BVH motion capture support

### 4. RemeshService
**Mục đích**: Chuyển đổi topology của mesh

**Khi GPU enabled**:
- Triangle to Quad conversion
- Decimation/subdivision
- Clean topology for animation

**Libraries cần cài**:
```bash
pip install trimesh pymeshlab
```

### 5. ExportService
**Mục đích**: Export model sang nhiều format

**Supported formats**:
- FBX (with animations, rig)
- OBJ (basic geometry)
- GLB/GLTF (web-ready)
- USDZ (AR/VR)
- STL (3D printing)
- BLEND (Blender)
- 3MF (advanced 3D printing)

**Libraries cần cài**:
```bash
pip install trimesh pygltflib bpy  # Blender Python API
```

## API Endpoints

### Health Check
```bash
GET /api/phase2/health

Response:
{
  "status": "healthy",
  "gpu_enabled": true,
  "gpu_name": "NVIDIA GeForce RTX 3080",
  "services": {
    "texturing": "available",
    "rigging": "available",
    "animation": "available",
    "remesh": "available",
    "export": "available"
  }
}
```

### Apply Texture
```bash
POST /api/phase2/texture
Content-Type: application/json

{
  "model_path": "/outputs/model.obj",
  "prompt": "weathered metal with rust",
  "options": {
    "style": "realistic",
    "brightness": 100
  }
}
```

### Apply Rig
```bash
POST /api/phase2/rig
Content-Type: application/json

{
  "model_path": "/outputs/model.obj",
  "rig_type": "humanoid",
  "options": {
    "markers": {"head": [0, 1.7, 0], "hips": [0, 1.0, 0]}
  }
}
```

### Apply Animation
```bash
POST /api/phase2/animate
Content-Type: application/json

{
  "model_path": "/outputs/model_rigged.fbx",
  "animation_id": "walk",
  "options": {
    "loop": true,
    "speed": 1.0
  }
}
```

### Remesh
```bash
POST /api/phase2/remesh
Content-Type: application/json

{
  "model_path": "/outputs/model.obj",
  "topology": "quad",
  "options": {
    "target_faces": 5000
  }
}
```

### Export
```bash
POST /api/phase2/export
Content-Type: application/json

{
  "model_path": "/outputs/model.obj",
  "format": "glb",
  "options": {
    "include_textures": true,
    "include_rig": true,
    "include_animation": "walk"
  }
}
```

## Troubleshooting

### GPU không được nhận
```bash
# Kiểm tra CUDA installation
nvcc --version

# Kiểm tra PyTorch CUDA
python -c "import torch; print(torch.cuda.is_available())"

# Kiểm tra NVIDIA driver
nvidia-smi
```

### Out of Memory (OOM)
- Giảm batch size trong config
- Sử dụng half precision (fp16)
- Clear CUDA cache:
```python
import torch
torch.cuda.empty_cache()
```

### Model loading chậm
- Pre-load models khi startup
- Sử dụng model caching
- Optimize với TensorRT

## Chạy Test

```bash
# Test all Phase 2 services
cd AI-service
python -c "
from phase2_service import Phase2Config
print(f'GPU Mode: {Phase2Config.ENABLE_GPU_FEATURES}')
print(f'GPU Available: {Phase2Config.check_gpu()}')
"
```

## Production Deployment

### Docker với GPU
```dockerfile
FROM nvidia/cuda:12.1-runtime-ubuntu22.04

# Install Python và dependencies
RUN apt-get update && apt-get install -y python3.11 python3-pip

# Copy và install requirements
COPY requirements.txt .
RUN pip install -r requirements.txt

# Install PyTorch với CUDA
RUN pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

COPY . /app
WORKDIR /app

ENV ENABLE_GPU_FEATURES=true
CMD ["python", "app.py"]
```

### Docker Compose
```yaml
version: '3.8'
services:
  ai-service:
    build: ./AI-service
    runtime: nvidia
    environment:
      - NVIDIA_VISIBLE_DEVICES=all
      - ENABLE_GPU_FEATURES=true
    ports:
      - "5001:5001"
```

## Liên Hệ Hỗ Trợ

Nếu gặp vấn đề với việc setup GPU, hãy kiểm tra:
1. NVIDIA Driver version
2. CUDA version  
3. PyTorch CUDA compatibility
4. VRAM availability

Có thể test từng service riêng lẻ để xác định vấn đề.
