"""
=============================================================================
Polyva AI Service - Production Ready
Full 3D Generation with GPU Support
=============================================================================

Requirements:
- NVIDIA GPU with CUDA support (GTX 1080+ / RTX series recommended)
- VRAM: 8GB+ (12GB+ for best quality)
- Python 3.10 or 3.11 (NOT 3.12+)
- PyTorch with CUDA

Installation:
1. Create virtual environment:
   python -m venv venv
   venv\\Scripts\\activate  (Windows) or source venv/bin/activate (Linux)

2. Install PyTorch with CUDA:
   pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121

3. Install other dependencies:
   pip install -r requirements_full.txt

4. Run:
   python app_full.py
=============================================================================
"""

import os
import uuid
import time
import traceback
import threading
import gc
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename
from PIL import Image
import io

# Configuration
HOST = os.getenv('AI_HOST', '0.0.0.0')
PORT = int(os.getenv('AI_PORT', 8000))
DEBUG = os.getenv('AI_DEBUG', 'false').lower() == 'true'
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}

# Directories
BASE_DIR = Path(__file__).parent
UPLOAD_DIR = BASE_DIR / "uploads"
OUTPUT_DIR = BASE_DIR / "outputs"
CACHE_DIR = BASE_DIR / "cache"
MODEL_DIR = BASE_DIR / "models"

for d in [UPLOAD_DIR, OUTPUT_DIR, CACHE_DIR, MODEL_DIR]:
    d.mkdir(exist_ok=True)


# =============================================================================
# Model Configuration
# =============================================================================

class ModelConfig:
    """AI Model Configuration"""
    
    # Stable Diffusion settings
    SD_MODEL_FAST = "runwayml/stable-diffusion-v1-5"
    SD_MODEL_QUALITY = "stabilityai/stable-diffusion-xl-base-1.0"
    
    # TripoSR settings  
    TRIPOSR_MODEL = "stabilityai/TripoSR"
    TRIPOSR_CHUNK_SIZE = 8192
    TRIPOSR_MC_RESOLUTION = 256  # Marching cubes resolution
    
    # Generation settings
    SD15_STEPS = 30
    SD15_CFG = 7.5
    SD15_RESOLUTION = 512
    
    SDXL_STEPS = 40
    SDXL_CFG = 7.0
    SDXL_RESOLUTION = 1024
    
    # Optimization
    USE_HALF_PRECISION = True  # FP16 for faster generation
    ENABLE_XFORMERS = True     # Memory efficient attention
    ENABLE_TORCH_COMPILE = False  # Torch 2.0 compile (experimental)
    

# =============================================================================
# GPU Utilities
# =============================================================================

def check_gpu():
    """Check GPU availability and return info"""
    try:
        import torch
        if torch.cuda.is_available():
            gpu_name = torch.cuda.get_device_name(0)
            vram = torch.cuda.get_device_properties(0).total_memory / (1024**3)
            return {
                'available': True,
                'name': gpu_name,
                'vram_gb': round(vram, 1),
                'cuda_version': torch.version.cuda
            }
    except:
        pass
    return {'available': False, 'name': None, 'vram_gb': 0}


def clear_gpu_memory():
    """Clear GPU memory cache"""
    try:
        import torch
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            gc.collect()
    except:
        pass


# =============================================================================
# Stable Diffusion - Text to Image
# =============================================================================

_sd_pipeline = None
_sd_model_type = None

def get_sd_pipeline(mode='fast'):
    """Get or load Stable Diffusion pipeline"""
    global _sd_pipeline, _sd_model_type
    
    import torch
    from diffusers import (
        StableDiffusionPipeline, 
        StableDiffusionXLPipeline,
        DPMSolverMultistepScheduler,
        EulerAncestralDiscreteScheduler
    )
    
    model_id = ModelConfig.SD_MODEL_FAST if mode == 'fast' else ModelConfig.SD_MODEL_QUALITY
    
    # Reload if model type changed
    if _sd_pipeline is not None and _sd_model_type != mode:
        del _sd_pipeline
        clear_gpu_memory()
        _sd_pipeline = None
    
    if _sd_pipeline is None:
        print(f"📥 Loading Stable Diffusion ({mode})...")
        
        dtype = torch.float16 if ModelConfig.USE_HALF_PRECISION else torch.float32
        
        if mode == 'fast':
            _sd_pipeline = StableDiffusionPipeline.from_pretrained(
                model_id,
                torch_dtype=dtype,
                cache_dir=str(CACHE_DIR),
                safety_checker=None,
                requires_safety_checker=False
            )
            _sd_pipeline.scheduler = DPMSolverMultistepScheduler.from_config(
                _sd_pipeline.scheduler.config
            )
        else:
            _sd_pipeline = StableDiffusionXLPipeline.from_pretrained(
                model_id,
                torch_dtype=dtype,
                cache_dir=str(CACHE_DIR),
                use_safetensors=True,
                variant="fp16" if ModelConfig.USE_HALF_PRECISION else None
            )
            _sd_pipeline.scheduler = EulerAncestralDiscreteScheduler.from_config(
                _sd_pipeline.scheduler.config
            )
        
        # Move to GPU
        if torch.cuda.is_available():
            _sd_pipeline = _sd_pipeline.to("cuda")
            
            # Enable memory optimizations
            if ModelConfig.ENABLE_XFORMERS:
                try:
                    _sd_pipeline.enable_xformers_memory_efficient_attention()
                    print("  ✓ xFormers enabled")
                except:
                    _sd_pipeline.enable_attention_slicing()
                    print("  ✓ Attention slicing enabled")
        
        _sd_model_type = mode
        print(f"  ✓ Stable Diffusion loaded")
    
    return _sd_pipeline


def text_to_image(prompt: str, mode: str = 'fast') -> Image.Image:
    """Generate image from text prompt"""
    import torch
    
    pipeline = get_sd_pipeline(mode)
    
    # Configure generation params
    if mode == 'fast':
        params = {
            'num_inference_steps': ModelConfig.SD15_STEPS,
            'guidance_scale': ModelConfig.SD15_CFG,
            'width': ModelConfig.SD15_RESOLUTION,
            'height': ModelConfig.SD15_RESOLUTION,
        }
    else:
        params = {
            'num_inference_steps': ModelConfig.SDXL_STEPS,
            'guidance_scale': ModelConfig.SDXL_CFG,
            'width': ModelConfig.SDXL_RESOLUTION,
            'height': ModelConfig.SDXL_RESOLUTION,
        }
    
    # Enhance prompt for 3D-friendly output
    enhanced_prompt = f"{prompt}, 3d render, centered object, white background, studio lighting, high quality, detailed"
    negative_prompt = "blurry, low quality, multiple objects, cluttered background, text, watermark"
    
    with torch.inference_mode():
        result = pipeline(
            prompt=enhanced_prompt,
            negative_prompt=negative_prompt,
            **params
        )
    
    return result.images[0]


# =============================================================================
# TripoSR - Image to 3D
# =============================================================================

_triposr_model = None

def get_triposr_model():
    """Get or load TripoSR model"""
    global _triposr_model
    
    if _triposr_model is None:
        import torch
        import sys
        
        # Add TripoSR to path
        triposr_path = BASE_DIR / "TripoSR"
        if str(triposr_path) not in sys.path:
            sys.path.insert(0, str(triposr_path))
        
        from tsr.system import TSR
        
        print("📥 Loading TripoSR...")
        
        device = "cuda" if torch.cuda.is_available() else "cpu"
        
        _triposr_model = TSR.from_pretrained(
            ModelConfig.TRIPOSR_MODEL,
            config_name="config.yaml",
            weight_name="model.ckpt",
            cache_dir=str(CACHE_DIR)
        )
        _triposr_model.to(device)
        
        # Set chunk size for memory management
        _triposr_model.renderer.set_chunk_size(ModelConfig.TRIPOSR_CHUNK_SIZE)
        
        print(f"  ✓ TripoSR loaded on {device}")
    
    return _triposr_model


def image_to_3d(image: Image.Image, output_path: str, mc_resolution: int = None):
    """Convert image to 3D mesh"""
    import torch
    import numpy as np
    
    model = get_triposr_model()
    device = next(model.parameters()).device
    
    resolution = mc_resolution or ModelConfig.TRIPOSR_MC_RESOLUTION
    
    print(f"  → Running TripoSR (resolution: {resolution})...")
    
    with torch.inference_mode():
        # Process image
        scene_codes = model([image], device=device)
        
        # Extract mesh
        mesh = model.extract_mesh(
            scene_codes,
            resolution=resolution,
            threshold=0.0
        )[0]
    
    # Export to GLB
    mesh.export(output_path)
    print(f"  ✓ Mesh exported: {output_path}")
    
    return output_path


# =============================================================================
# Image Preprocessing
# =============================================================================

def preprocess_image(
    image: Image.Image,
    remove_bg: bool = True,
    target_size: int = 512,
    padding: float = 0.1
) -> Image.Image:
    """Preprocess image for 3D generation"""
    
    # Convert to RGB if needed
    if image.mode != 'RGB':
        image = image.convert('RGB')
    
    # Remove background
    if remove_bg:
        try:
            from rembg import remove
            
            # Convert to RGBA for rembg
            image_rgba = remove(image.convert('RGBA'))
            
            # Get alpha mask bounds
            alpha = image_rgba.split()[-1]
            bbox = alpha.getbbox()
            
            if bbox:
                # Crop to content
                image_rgba = image_rgba.crop(bbox)
                
                # Add padding
                w, h = image_rgba.size
                pad = int(max(w, h) * padding)
                
                # Create square canvas with padding
                size = max(w, h) + pad * 2
                canvas = Image.new('RGBA', (size, size), (255, 255, 255, 255))
                
                # Center the image
                x = (size - w) // 2
                y = (size - h) // 2
                canvas.paste(image_rgba, (x, y), image_rgba)
                
                image = canvas.convert('RGB')
                
        except ImportError:
            print("  ⚠ rembg not installed, skipping background removal")
    
    # Resize to target size
    image = image.resize((target_size, target_size), Image.Resampling.LANCZOS)
    
    return image


# =============================================================================
# Mesh Post-processing  
# =============================================================================

def postprocess_mesh(input_path: str, output_path: str):
    """Post-process 3D mesh for better quality"""
    try:
        import trimesh
        
        mesh = trimesh.load(input_path)
        
        # Fix normals
        if hasattr(mesh, 'fix_normals'):
            mesh.fix_normals()
        
        # Remove duplicate vertices
        if hasattr(mesh, 'merge_vertices'):
            mesh.merge_vertices()
        
        # Smooth mesh (optional - may reduce detail)
        # mesh = trimesh.smoothing.filter_laplacian(mesh, iterations=1)
        
        # Export optimized mesh
        mesh.export(output_path, file_type='glb')
        
    except ImportError:
        # If trimesh not available, just copy the file
        import shutil
        shutil.copy(input_path, output_path)


# =============================================================================
# Flask Application
# =============================================================================

app = Flask(__name__)
CORS(app)

# Job tracking
jobs: Dict[str, Dict[str, Any]] = {}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    gpu_info = check_gpu()
    return jsonify({
        'status': 'healthy',
        'mode': 'production',
        'gpu_available': gpu_info['available'],
        'gpu_name': gpu_info['name'],
        'gpu_vram_gb': gpu_info.get('vram_gb', 0),
        'cuda_version': gpu_info.get('cuda_version'),
        'timestamp': datetime.now().isoformat()
    })


@app.route('/api/text-to-3d', methods=['POST'])
def text_to_3d_endpoint():
    """
    Text to 3D generation
    
    POST JSON:
    {
        "prompt": "a cute robot toy",
        "mode": "fast" | "quality",
        "jobId": "optional-custom-id"
    }
    """
    job_id = None
    try:
        data = request.get_json()
        
        if not data or 'prompt' not in data:
            return jsonify({'ok': False, 'error': 'Prompt is required'}), 400
        
        prompt = data['prompt'].strip()
        mode = data.get('mode', 'fast')
        job_id = data.get('jobId', str(uuid.uuid4()))
        
        if not prompt:
            return jsonify({'ok': False, 'error': 'Prompt cannot be empty'}), 400
        
        if len(prompt) > 500:
            return jsonify({'ok': False, 'error': 'Prompt too long (max 500 chars)'}), 400
        
        print(f"\n{'='*60}")
        print(f"📝 Text-to-3D Job: {job_id}")
        print(f"   Prompt: {prompt[:80]}{'...' if len(prompt) > 80 else ''}")
        print(f"   Mode: {mode}")
        print(f"{'='*60}")
        
        start_time = time.time()
        jobs[job_id] = {'status': 'processing', 'step': 'starting', 'progress': 0}
        
        # Step 1: Text → Image
        print("\n🎨 Step 1: Generating image from text...")
        jobs[job_id].update({'step': 'text-to-image', 'progress': 10})
        
        generated_image = text_to_image(prompt, mode)
        
        preview_path = OUTPUT_DIR / f"{job_id}_preview.png"
        generated_image.save(preview_path)
        print(f"  ✓ Preview saved: {preview_path}")
        
        # Step 2: Preprocess
        print("\n🖼️ Step 2: Preprocessing image...")
        jobs[job_id].update({'step': 'preprocessing', 'progress': 40})
        
        preprocessed = preprocess_image(
            generated_image,
            remove_bg=True,
            target_size=512
        )
        
        preprocessed_path = OUTPUT_DIR / f"{job_id}_preprocessed.png"
        preprocessed.save(preprocessed_path)
        
        # Step 3: Image → 3D
        print("\n🔮 Step 3: Converting to 3D mesh...")
        jobs[job_id].update({'step': 'image-to-3d', 'progress': 60})
        
        raw_model_path = str(OUTPUT_DIR / f"{job_id}_raw.glb")
        image_to_3d(preprocessed, raw_model_path)
        
        # Step 4: Post-process
        print("\n🔧 Step 4: Post-processing mesh...")
        jobs[job_id].update({'step': 'postprocessing', 'progress': 85})
        
        final_model_path = str(OUTPUT_DIR / f"{job_id}.glb")
        postprocess_mesh(raw_model_path, final_model_path)
        
        # Cleanup
        try:
            os.remove(raw_model_path)
        except:
            pass
        
        clear_gpu_memory()
        
        # Done
        elapsed = time.time() - start_time
        jobs[job_id].update({'status': 'completed', 'progress': 100})
        
        print(f"\n{'='*60}")
        print(f"✅ Job completed in {elapsed:.1f}s")
        print(f"   Output: {final_model_path}")
        print(f"{'='*60}\n")
        
        return jsonify({
            'ok': True,
            'jobId': job_id,
            'modelPath': f"/outputs/{job_id}.glb",
            'imageUrl': f"/outputs/{job_id}_preview.png",
            'elapsed': round(elapsed, 1)
        })
        
    except Exception as e:
        traceback.print_exc()
        if job_id and job_id in jobs:
            jobs[job_id].update({'status': 'failed', 'error': str(e)})
        return jsonify({'ok': False, 'error': str(e)}), 500


@app.route('/api/image-to-3d', methods=['POST'])
def image_to_3d_endpoint():
    """
    Image to 3D generation
    
    POST multipart/form-data:
    - image: File
    - mode: "fast" | "quality" (optional)
    - jobId: string (optional)
    """
    job_id = None
    try:
        if 'image' not in request.files:
            return jsonify({'ok': False, 'error': 'No image file provided'}), 400
        
        file = request.files['image']
        
        if file.filename == '':
            return jsonify({'ok': False, 'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'ok': False, 'error': f'Invalid file type. Allowed: {ALLOWED_EXTENSIONS}'}), 400
        
        mode = request.form.get('mode', 'fast')
        job_id = request.form.get('jobId', str(uuid.uuid4()))
        
        print(f"\n{'='*60}")
        print(f"🖼️ Image-to-3D Job: {job_id}")
        print(f"   File: {file.filename}")
        print(f"   Mode: {mode}")
        print(f"{'='*60}")
        
        start_time = time.time()
        jobs[job_id] = {'status': 'processing', 'step': 'uploading', 'progress': 0}
        
        # Read and save original
        image_data = file.read()
        image = Image.open(io.BytesIO(image_data)).convert('RGB')
        
        original_path = UPLOAD_DIR / f"{job_id}_original.png"
        image.save(original_path)
        
        # Step 1: Preprocess
        print("\n🖼️ Step 1: Preprocessing image...")
        jobs[job_id].update({'step': 'preprocessing', 'progress': 20})
        
        mc_resolution = 256 if mode == 'fast' else 384
        
        preprocessed = preprocess_image(
            image,
            remove_bg=True,
            target_size=512
        )
        
        preprocessed_path = OUTPUT_DIR / f"{job_id}_preprocessed.png"
        preprocessed.save(preprocessed_path)
        
        # Step 2: Image → 3D
        print("\n🔮 Step 2: Converting to 3D mesh...")
        jobs[job_id].update({'step': 'image-to-3d', 'progress': 50})
        
        raw_model_path = str(OUTPUT_DIR / f"{job_id}_raw.glb")
        image_to_3d(preprocessed, raw_model_path, mc_resolution=mc_resolution)
        
        # Step 3: Post-process
        print("\n🔧 Step 3: Post-processing mesh...")
        jobs[job_id].update({'step': 'postprocessing', 'progress': 80})
        
        final_model_path = str(OUTPUT_DIR / f"{job_id}.glb")
        postprocess_mesh(raw_model_path, final_model_path)
        
        # Cleanup
        try:
            os.remove(raw_model_path)
        except:
            pass
        
        clear_gpu_memory()
        
        # Done
        elapsed = time.time() - start_time
        jobs[job_id].update({'status': 'completed', 'progress': 100})
        
        print(f"\n{'='*60}")
        print(f"✅ Job completed in {elapsed:.1f}s")
        print(f"   Output: {final_model_path}")
        print(f"{'='*60}\n")
        
        return jsonify({
            'ok': True,
            'jobId': job_id,
            'modelPath': f"/outputs/{job_id}.glb",
            'preprocessedImage': f"/outputs/{job_id}_preprocessed.png",
            'elapsed': round(elapsed, 1)
        })
        
    except Exception as e:
        traceback.print_exc()
        if job_id and job_id in jobs:
            jobs[job_id].update({'status': 'failed', 'error': str(e)})
        return jsonify({'ok': False, 'error': str(e)}), 500


@app.route('/api/job/<job_id>', methods=['GET'])
def get_job_status(job_id):
    """Get job status"""
    if job_id not in jobs:
        return jsonify({'ok': False, 'error': 'Job not found'}), 404
    return jsonify({'ok': True, **jobs[job_id]})


@app.route('/outputs/<path:filename>', methods=['GET'])
def serve_output(filename):
    """Serve generated files"""
    file_path = OUTPUT_DIR / filename
    if not file_path.exists():
        return jsonify({'ok': False, 'error': 'File not found'}), 404
    return send_file(str(file_path))


@app.route('/uploads/<path:filename>', methods=['GET'])
def serve_upload(filename):
    """Serve uploaded files"""
    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        return jsonify({'ok': False, 'error': 'File not found'}), 404
    return send_file(str(file_path))


# =============================================================================
# Main Entry Point
# =============================================================================

if __name__ == '__main__':
    gpu_info = check_gpu()
    
    print(f"""
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║   🤖 Polyva AI Service - Production Mode                         ║
║                                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║   GPU: {'✅ ' + gpu_info['name'] if gpu_info['available'] else '❌ Not available (CPU mode)'}
║   VRAM: {gpu_info.get('vram_gb', 0)} GB
║   CUDA: {gpu_info.get('cuda_version', 'N/A')}
║                                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║   Endpoints:                                                     ║
║   • Health:     GET  /health                                     ║
║   • Text→3D:    POST /api/text-to-3d                            ║
║   • Image→3D:   POST /api/image-to-3d                           ║
║   • Job Status: GET  /api/job/<job_id>                          ║
║   • Files:      GET  /outputs/<filename>                        ║
║                                                                  ║
║   Server: http://{HOST}:{PORT}                                   ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
""")
    
    if not gpu_info['available']:
        print("⚠️  WARNING: No GPU detected! Generation will be very slow.")
        print("    Make sure you have CUDA installed and PyTorch with GPU support.\n")
    
    app.run(host=HOST, port=PORT, debug=DEBUG, threaded=True)
