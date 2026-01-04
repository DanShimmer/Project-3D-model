# 🎨 3D Model Generation System

Hệ thống tạo mô hình 3D từ văn bản và hình ảnh sử dụng AI.

## 📋 Tổng quan kiến trúc

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│    Frontend     │────▶│    Backend      │────▶│   AI Service    │
│    (React)      │     │   (Node.js)     │     │   (Python)      │
│    Port 5173    │     │   Port 5000     │     │   Port 8000     │
│                 │     │                 │     │                 │
└─────────────────┘     └────────┬────────┘     └────────┬────────┘
                                 │                       │
                                 ▼                       ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │    MongoDB      │     │  GPU (CUDA)     │
                        │                 │     │  - SD 1.5/SDXL  │
                        └─────────────────┘     │  - TripoSR      │
                                                └─────────────────┘
```

## 🛠️ Yêu cầu hệ thống

### AI Service (Python)
- **GPU**: NVIDIA với ít nhất 8GB VRAM (SD 1.5) hoặc 12GB+ VRAM (SDXL)
- **CUDA**: 11.8 hoặc 12.1
- **Python**: 3.10+
- **RAM**: Tối thiểu 16GB

### Backend (Node.js)
- **Node.js**: 18+
- **MongoDB**: 6.0+

### Frontend (React)
- **Node.js**: 18+

---

## 🚀 Hướng dẫn cài đặt

### Bước 1: Clone TripoSR (Tùy chọn - Khuyến nghị)

```bash
cd AI-service
git clone https://github.com/VAST-AI-Research/TripoSR.git
```

### Bước 2: Cài đặt AI Service

```bash
cd AI-service

# Tạo virtual environment
python -m venv venv

# Kích hoạt (Windows)
.\venv\Scripts\activate

# Kích hoạt (Linux/Mac)
source venv/bin/activate

# Cài đặt PyTorch với CUDA
# Cho CUDA 11.8:
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118

# Hoặc cho CUDA 12.1:
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121

# Cài đặt dependencies
pip install -r requirements.txt

# Copy file .env
copy .env.example .env
```

### Bước 3: Cài đặt Backend

```bash
cd Back-end/src

# Cài đặt dependencies
npm install

# Tạo file .env
```

Tạo file `.env` trong `Back-end/src/`:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/polyva
JWT_SECRET=your-super-secret-key-here
AI_SERVICE_URL=http://localhost:8000

# Email (cho OTP)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### Bước 4: Cài đặt Frontend

```bash
cd front-end

# Cài đặt dependencies
npm install
```

Tạo file `.env` trong `front-end/`:

```env
VITE_API_URL=http://localhost:5000/api
```

---

## ▶️ Chạy ứng dụng

### Terminal 1: AI Service (Port 8000)

```bash
cd AI-service
.\venv\Scripts\activate  # Windows
# hoặc: source venv/bin/activate  # Linux/Mac

python app.py
```

Lần đầu chạy sẽ tải model (~5-10GB), có thể mất 10-30 phút tùy internet.

### Terminal 2: Backend (Port 5000)

```bash
cd Back-end/src
npm run dev
```

### Terminal 3: Frontend (Port 5173)

```bash
cd front-end
npm run dev
```

### Truy cập ứng dụng

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000/api
- **AI Service**: http://localhost:8000

---

## 📖 Luồng hoạt động

### Text to 3D

```
1. User nhập prompt → Frontend
2. Frontend gửi POST /api/generate/text-to-3d → Backend
3. Backend validate + gửi đến AI Service
4. AI Service:
   ├─ Stable Diffusion: Text → Image (512px hoặc 1024px)
   ├─ Preprocessing: Remove BG, Center, Normalize
   ├─ TripoSR: Image → 3D Mesh
   └─ Postprocessing: Smooth, Reduce poly, Export GLB
5. Backend lưu model vào MongoDB
6. Frontend hiển thị 3D viewer với Three.js
```

### Image to 3D

```
1. User upload ảnh → Frontend
2. Frontend gửi multipart/form-data → Backend
3. Backend forward đến AI Service
4. AI Service:
   ├─ Preprocessing: Remove BG, Center, Resize
   ├─ TripoSR: Image → 3D Mesh
   └─ Postprocessing: Smooth, Reduce poly, Export GLB
5. Backend lưu model vào MongoDB
6. Frontend hiển thị 3D viewer
```

---

## 🎛️ API Endpoints

### Generate API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/generate/text-to-3d` | Tạo 3D từ text |
| POST | `/api/generate/image-to-3d` | Tạo 3D từ image |
| GET | `/api/generate/job/:jobId` | Kiểm tra trạng thái job |
| GET | `/api/generate/health` | Kiểm tra AI Service |

### Request: Text to 3D

```json
{
  "prompt": "a cute robot toy",
  "mode": "fast"  // "fast" = SD 1.5, "quality" = SDXL
}
```

### Request: Image to 3D

```
Content-Type: multipart/form-data
Field: image (file)
```

### Response

```json
{
  "ok": true,
  "jobId": "uuid",
  "model": {
    "_id": "...",
    "name": "...",
    "type": "text-to-3d",
    "modelUrl": "http://...",
    "thumbnailUrl": "http://...",
    "createdAt": "..."
  }
}
```

---

## ⚙️ Cấu hình AI Service

File `AI-service/config.py`:

```python
# Stable Diffusion
SD15_MODEL = "runwayml/stable-diffusion-v1-5"  # Fast mode
SDXL_MODEL = "stabilityai/stable-diffusion-xl-base-1.0"  # Quality mode

# TripoSR
MODEL_ID = "stabilityai/TripoSR"
MC_RESOLUTION = 256  # Marching cubes resolution

# Processing
TARGET_SIZE = 512  # Image preprocessing size
TARGET_FACES = 50000  # Polygon reduction target
```

---

## 🔧 Troubleshooting

### 1. CUDA out of memory

```
Giảm batch size hoặc resolution trong config.py
Sử dụng mode "fast" thay vì "quality"
Đảm bảo không có ứng dụng khác sử dụng GPU
```

### 2. Model download chậm

```
Sử dụng VPN nếu bị chặn
Hoặc tải manual và đặt vào thư mục cache
```

### 3. AI Service không khởi động

```bash
# Kiểm tra CUDA
python -c "import torch; print(torch.cuda.is_available())"

# Kiểm tra phiên bản PyTorch
python -c "import torch; print(torch.__version__)"
```

### 4. Backend không kết nối MongoDB

```bash
# Đảm bảo MongoDB đang chạy
mongod --dbpath /path/to/data

# Hoặc sử dụng MongoDB Atlas (cloud)
```

---

## 📁 Cấu trúc thư mục

```
Project 3D model/
├── AI-service/                 # Python AI Service
│   ├── app.py                  # Flask API server
│   ├── config.py               # Cấu hình
│   ├── preprocessing.py        # Xử lý ảnh đầu vào
│   ├── stable_diffusion.py     # Text to Image
│   ├── triposr_wrapper.py      # Image to 3D
│   ├── postprocessing.py       # Xử lý mesh 3D
│   ├── requirements.txt        # Dependencies
│   ├── uploads/                # Ảnh upload
│   └── outputs/                # Model xuất ra
│
├── Back-end/src/               # Node.js Backend
│   ├── server.ts               # Express server
│   ├── controllers/
│   │   └── generate.controller.ts
│   ├── routes/
│   │   └── generate.ts
│   └── models/
│       └── model.model.ts
│
└── front-end/                  # React Frontend
    ├── src/
    │   ├── GeneratePage.jsx    # Trang generate chính
    │   ├── Components/
    │   │   └── ModelViewer.jsx # 3D viewer component
    │   └── api/
    │       └── generate.js     # API calls
    └── package.json
```

---

## 🎯 Tính năng

- ✅ Text to 3D với Stable Diffusion + TripoSR
- ✅ Image to 3D với TripoSR
- ✅ 2 chế độ quality: Fast (SD 1.5) & Quality (SDXL)
- ✅ Background removal tự động
- ✅ 3D viewer với Three.js (xoay, zoom, pan)
- ✅ Download model .glb
- ✅ Lưu model vào My Storage
- ✅ Authentication (JWT)

---

## 📝 License

MIT License
