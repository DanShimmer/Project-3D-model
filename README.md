# Polyva 3D — AI-Powered 3D Model Generation Platform

> React + Express + Python Flask | TripoSR + SDXL + ControlNet | Procedural Animation

---

## 📋 Mục lục

1. [Tổng quan hệ thống](#tổng-quan-hệ-thống)
2. [Kiến trúc](#kiến-trúc)
3. [Tính năng đã triển khai](#tính-năng-đã-triển-khai)
4. [Nghiên cứu Kaedim AI](#nghiên-cứu-kaedim-ai)
5. [Hướng dẫn cài đặt & chạy](#hướng-dẫn-cài-đặt--chạy)
6. [Cấu trúc thư mục](#cấu-trúc-thư-mục)

---

## Tổng quan hệ thống

**Polyva 3D** là nền tảng web cho phép người dùng tạo mô hình 3D từ ảnh hoặc văn bản, sau đó tô màu (thủ công / AI), rigging, animation và xuất file GLB.

### Tech Stack

| Layer | Công nghệ |
|-------|-----------|
| **Front-end** | React 18, Three.js (react-three-fiber), Tailwind CSS, Vite |
| **Back-end** | Express.js, TypeScript, MongoDB, JWT Auth |
| **AI Service** | Python Flask (port 8000), CUDA/GPU, TripoSR, SDXL, ControlNet |
| **Desktop** | Electron (optional) |

---

## Kiến trúc

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│   React App     │────▶│  Express API     │────▶│   Flask AI Service  │
│   (port 3000)   │     │  (port 5000)     │     │   (port 8000)       │
│                 │     │                  │     │                     │
│ • ModelViewer   │     │ • Auth (JWT+OTP) │     │ • TripoSR (3D gen) │
│ • TexturingPanel│     │ • Model CRUD     │     │ • SDXL+ControlNet  │
│ • GeneratePage  │     │ • File upload    │     │ • Procedural tex.  │
│ • Paint system  │     │ • Admin panel    │     │ • Rigging & Anim.  │
└─────────────────┘     └──────────────────┘     └─────────────────────┘
```

---

## Tính năng đã triển khai

### 1. 🎨 Hệ thống tô màu thủ công (Manual Paint) — **OVERHAULED**

**Vấn đề cũ:** Vertex painting sử dụng Gaussian falloff + alpha blending → màu bị nhạt, pha trộn lẫn nhau ("tạt sơn"), không thể tô màu đậm rõ ràng.

**Giải pháp mới — 2 chế độ tô:**

| Chế độ | Mô tả | Khi nào dùng |
|--------|--------|--------------|
| 🪣 **Fill** (mặc định) | Click vào mesh → tô toàn bộ phần đó bằng màu đặc 100% | Tô nhanh từng bộ phận (thân, tay, chân, đầu...) |
| 🖌️ **Brush** | Giữ chuột kéo → tô bằng disc phẳng, thay thế trực tiếp (không blend) | Vẽ chi tiết, đường kẻ, hoa văn |

**Chi tiết kỹ thuật:**
- **Fill mode**: Lặp qua tất cả vertex của mesh được click → set `colorAttr.setXYZ(i, r, g, b)` — không alpha, không falloff
- **Brush mode**: Flat disc với 85% inner radius tô 100% replace, 15% outer edge softened nhẹ. Không dùng Gaussian, không accumulate
- **Material fix**: Set `material.color = 0xffffff` cho untextured model → tránh `finalColor = material.color × vertexColor` gây tối màu
- **UI**: Toggle Fill/Brush trong TexturingPanel, brush size slider chỉ hiện ở Brush mode

**Files đã sửa:**
- `front-end/src/Components/ModelViewer.jsx` — Viết lại `paintAtPoint()` hoàn toàn
- `front-end/src/GeneratePage.jsx` — Thêm `brushMode` state
- `front-end/src/Components/Phase2/TexturingPanel.jsx` — Thêm UI toggle Fill/Brush

---

### 2. 🤖 AI Texturing Pipeline (ComfyUI + SDXL + ControlNet Depth)

**Pipeline:**
```
3D Model → Render multi-view depth maps → SDXL + ControlNet Depth generate textured views
→ Back-project onto mesh vertices → Bake to UV texture → Export GLB
```

**Fallback:** Smart procedural coloring khi ComfyUI không khả dụng (regex prompt parser → map màu theo keyword).

**Key fix đã làm:**
- Chuyển từ Gemini API → ComfyUI local pipeline
- Fix gray texture bug: Export luôn dùng `PBRMaterial(baseColorFactor=WHITE)` để texture không bị nhân với gray factor
- Texture cache system (`AI-service/cache/textures/`)

**File:** `AI-service/texturing_service.py` (1436 dòng)

---

### 3. 💃 Hệ thống Animation — **60 Keyframes, CUBICSPLINE**

**Vấn đề cũ:** Animation cứng, ít keyframe, LINEAR interpolation → robot-like.

**Overhaul hoàn toàn 18 animations:**

| # | Animation | Đặc điểm chuyển động |
|---|-----------|---------------------|
| 1 | Idle | Breathing cycle, subtle weight shift, micro head bob |
| 2 | Walk | Figure-8 hip sway, heel-strike → toe-off, arm counter-swing |
| 3 | Run | Forward lean, aggressive arm pump, flight phase |
| 4 | Jump | Crouch anticipation → launch → peak float → landing absorb |
| 5 | Dance | Latin-inspired hip motion, arm waves, head groove |
| 6 | Wave | Forearm pivot, wrist flex, finger spread feel |
| 7 | Kick | Chamber → extend → snap back, hip rotation drive |
| 8 | Punch | Shoulder wind-up → full extension → recoil |
| 9 | Sit | Controlled descent, spine curve, hands on knees |
| 10 | Bow | Torso fold forward, arms sweep back, head follow |
| 11 | Clap | Asymmetric arm paths, acceleration into contact |
| 12 | Spin | Wind-up → 360° rotation → controlled deceleration |
| 13 | Crouch | Tactical lower, wide stance, arms ready |
| 14 | Backflip | Crouch → explosive launch → tuck → layout → land |
| 15 | Swim | Crawl stroke, bilateral breathing, flutter kick |
| 16 | Climb | Alternating reach, pull-up, foot placement |
| 17 | Fly | Cape-hero hover, gentle banking, arm glide |
| 18 | Death | Stagger → collapse → settle, ragdoll-inspired |

**Kỹ thuật:**
- **60 keyframes** mỗi animation (thay vì 10-20 cũ)
- **CUBICSPLINE interpolation** với Catmull-Rom tangent calculation
- **Overlapping action**: Phần trên/dưới cơ thể chuyển động lệch phase
- **Figure-8 hip motion** (walk, dance) cho tự nhiên
- **12 principles of animation** applied: anticipation, follow-through, slow-in/slow-out, arcs

**File:** `AI-service/phase2_service.py` (~4067 dòng)

---

### 4. 🦴 Auto-Rigging System

Tự động gắn skeleton vào mesh:
- Phát hiện bounding box → xác định tỷ lệ cơ thể
- Tạo bone hierarchy: Hips → Spine → Chest → Neck → Head, + Arms, + Legs
- Vertex skinning dựa trên khoảng cách → bone weights
- Export ra GLB với skeleton + skin data

---

### 5. 🔄 Remeshing Service

- Chuyển đổi topology (triangle ↔ quad)
- Simplification / subdivision
- Watertight mesh repair

---

### 6. 🔐 Authentication System

- JWT token-based auth
- Email OTP verification
- Admin panel với user management
- Role-based access control

---

### 7. 🖥️ 3D Model Viewer (ModelViewer.jsx)

- Real-time 3D rendering với Three.js
- Camera orbit controls
- Animation playback (mixer-based)
- Wireframe toggle
- Brightness control
- PBR material support
- Raycasting cho paint system

---

## Nghiên cứu Kaedim AI

### Kaedim là gì?

[Kaedim](https://kaedim3d.com) là dịch vụ enterprise tạo 3D asset từ ảnh 2D, kết hợp AI + đội ngũ 3D artist in-house để đảm bảo chất lượng production-ready.

### Có thể tích hợp thay ControlNet không?

**❌ KHÔNG THỂ tích hợp trực tiếp vào hệ thống Polyva 3D.**

| Tiêu chí | Kaedim | Hệ thống hiện tại (SDXL + ControlNet) |
|----------|--------|---------------------------------------|
| **Loại dịch vụ** | Enterprise SaaS, closed-source | Open-source, self-hosted |
| **API** | Không có public API tự do | Full control qua ComfyUI API |
| **Pricing** | Custom enterprise (liên hệ sales) | Miễn phí (chạy local GPU) |
| **Tốc độ** | Hàng giờ → ngày (có human review) | Real-time (vài giây trên GPU) |
| **Focus** | Tạo 3D model từ ảnh (không phải texturing riêng) | Texturing cho model có sẵn |
| **Human-in-the-loop** | Có (artist chỉnh sửa output AI) | Không cần |
| **Self-hosted** | ❌ Không | ✅ Có |
| **Use case** | Studio AAA cần asset production | App web real-time cho end-user |

### Lý do không phù hợp:

1. **Không có public API**: Kaedim chỉ phục vụ enterprise qua hợp đồng custom, không có REST API để gọi từ code
2. **Human-in-the-loop**: Pipeline của Kaedim có artist chỉnh sửa → không real-time, không phù hợp web app
3. **Focus khác nhau**: Kaedim tạo _toàn bộ 3D model_ từ ảnh, còn ta cần _tô texture lên model có sẵn_
4. **Chi phí**: Enterprise pricing (hàng nghìn USD/tháng) vs. self-hosted miễn phí
5. **Latency**: Kaedim mất hàng giờ → ngày, ta cần phản hồi trong vài giây

### Giải pháp hiện tại đã tối ưu:

Hệ thống Polyva 3D đã có pipeline texturing mạnh:
- **AI Texturing**: SDXL + ControlNet Depth (local GPU, real-time)
- **Manual Paint**: Fill mode (tô nhanh) + Brush mode (vẽ chi tiết)
- **Procedural fallback**: Tự động tô màu theo prompt khi không có GPU

### Các AI texturing thay thế khả thi hơn (tham khảo tương lai):

| Tool | Khả năng tích hợp | Ghi chú |
|------|-------------------|---------|
| **TEXTure** (Weizmann) | ✅ Open-source | Text-guided texture generation, có thể self-host |
| **Text2Tex** (Tsinghua) | ✅ Open-source | Text-driven texture synthesis |
| **Meshy AI** | ⚠️ Có API nhưng trả phí | $20/mo cho API access |
| **Rodin Gen-1** | ⚠️ Closed beta | Microsoft Research |
| **Kaedim** | ❌ Enterprise only | Không có public API |

---

## Hướng dẫn cài đặt & chạy

### Yêu cầu
- Node.js 18+
- Python 3.11+ với CUDA (RTX 3060 12GB+ khuyến nghị)
- MongoDB

### Khởi chạy nhanh

```bash
# 1. Chạy tất cả services
start-all.bat

# Hoặc chạy riêng từng service:

# Front-end (port 3000)
cd front-end && npm run dev

# Back-end (port 5000)
cd Back-end/src && npm start

# AI Service (port 8000) — QUAN TRỌNG: dùng venv Python
cd AI-service
C:\Users\MSI\Downloads\Project-3D-model\.venv\Scripts\python.exe app.py
```

### ⚠️ Lưu ý quan trọng về Python Environment

Terminal có thể activate `.venv` nhưng `python` vẫn resolve về system Python. **Luôn dùng đường dẫn tuyệt đối**:
```
C:\Users\MSI\Downloads\Project-3D-model\.venv\Scripts\python.exe
```

---

## Cấu trúc thư mục

```
Project-3D-model/
├── front-end/                    # React + Vite
│   └── src/
│       ├── GeneratePage.jsx      # Trang chính: generate, texture, rig, animate
│       ├── Components/
│       │   ├── ModelViewer.jsx    # 3D viewer + paint system (fill/brush)
│       │   └── Phase2/
│       │       └── TexturingPanel.jsx  # UI panel: manual paint + AI texture
│       ├── api/                  # API client functions
│       └── styles/               # CSS
│
├── Back-end/                     # Express.js API
│   └── src/
│       ├── server.ts
│       ├── controllers/          # Auth, Model, Generate, Admin
│       ├── models/               # MongoDB schemas
│       └── routes/               # API routes
│
├── AI-service/                   # Python Flask AI
│   ├── app.py                    # Main Flask app (port 8000)
│   ├── phase2_service.py         # Rigging + Animation (18 anims, 60fps)
│   ├── texturing_service.py      # ComfyUI + SDXL + ControlNet pipeline
│   ├── triposr_wrapper.py        # TripoSR 3D generation
│   ├── stable_diffusion.py       # SD utilities
│   ├── preprocessing.py          # Image preprocessing
│   ├── postprocessing.py         # Mesh postprocessing
│   ├── gpu_optimizer.py          # CUDA memory management
│   └── TripoSR/                  # TripoSR model code
│
├── start-all.bat                 # Launch all services
├── stop-all.bat                  # Stop all services
└── README.md                     # This file
```

---

## Changelog

### Session: Paint System Overhaul + Animation + Kaedim Research

**Paint System (v2):**
- ✅ Thêm Fill mode: click tô toàn bộ mesh part, màu đặc 100%
- ✅ Thêm Brush mode: flat disc, direct color replace, không blend
- ✅ Fix `material.color` = white cho untextured models
- ✅ UI toggle Fill/Brush trong TexturingPanel
- ✅ Brush size slider ẩn khi ở Fill mode

**Animation (v2):**
- ✅ Viết lại 18 animations với 60 keyframes mỗi cái
- ✅ CUBICSPLINE interpolation + Catmull-Rom tangents
- ✅ Overlapping action, figure-8 hip motion
- ✅ Biomechanics-based movement (heel-strike, weight shift, breathing)

**AI Texturing:**
- ✅ Chuyển Gemini → ComfyUI (SDXL + ControlNet Depth)
- ✅ Fix gray texture bug (baseColorFactor = WHITE)
- ✅ Texture caching system

**Research:**
- ✅ Kaedim AI: Enterprise SaaS, không có public API, không phù hợp tích hợp
- ✅ Gợi ý alternatives: TEXTure, Text2Tex (open-source, self-host được)