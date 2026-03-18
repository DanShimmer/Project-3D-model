"""
AI Service Flask API
Handles Text-to-3D and Image-to-3D requests
"""
import os
import sys
import uuid
import time
import random
import traceback
import threading
from pathlib import Path
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename
from PIL import Image
import io

# Fix encoding issues on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    # Add CUDA DLL directory for custom_rasterizer and other CUDA extensions
    cuda_path = os.environ.get('CUDA_PATH') or os.environ.get('CUDA_HOME') or r'C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.1'
    cuda_bin = os.path.join(cuda_path, 'bin')
    if os.path.isdir(cuda_bin):
        os.add_dll_directory(cuda_bin)

from config import (
    HOST, PORT, DEBUG, 
    UPLOAD_DIR, OUTPUT_DIR,
    SDConfig, ProcessingConfig, Hunyuan3DConfig
)
from preprocessing import preprocess_image, preprocess_for_hunyuan3d, select_best_view
from stable_diffusion import text_to_image, text_to_multiview
from hunyuan3d_wrapper import image_to_3d, hunyuan3d_generator
from postprocessing import postprocess_mesh, render_mesh_thumbnail

# Import Phase 2 services
try:
    from phase2_service import register_phase2, Phase2Config
    PHASE2_AVAILABLE = True
except ImportError:
    PHASE2_AVAILABLE = False
    print("⚠️ Phase 2 services not available")

# Import GPU optimizer
try:
    from gpu_optimizer import gpu_optimizer
    GPU_OPTIMIZER_AVAILABLE = True
except ImportError:
    GPU_OPTIMIZER_AVAILABLE = False
    print("⚠️ GPU Optimizer not available")


app = Flask(__name__)
CORS(app)

# Configure upload
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


# Active jobs tracking
jobs = {}


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint with GPU optimization info"""
    import torch
    
    response = {
        'status': 'healthy',
        'gpu_available': torch.cuda.is_available(),
        'gpu_name': torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
        'phase2_available': PHASE2_AVAILABLE,
        '3d_engine': 'Hunyuan3D-2',
        'texture_enabled': Hunyuan3DConfig.ENABLE_TEXTURE,
        'turbo_mode': Hunyuan3DConfig.USE_TURBO,
    }
    
    # Add GPU optimizer info if available
    if GPU_OPTIMIZER_AVAILABLE:
        response['gpu_optimizer'] = {
            'enabled': True,
            'gpu_info': gpu_optimizer.gpu_info,
            'memory': gpu_optimizer.get_memory_info(),
            'optimizations': {
                'sd_dtype': str(gpu_optimizer.optimizations['sd']['dtype']),
                'xformers': gpu_optimizer.optimizations['sd']['enable_xformers'],
                'sdxl_resolution': gpu_optimizer.optimizations['sdxl']['resolution']
            }
        }
    
    return jsonify(response)


@app.route('/api/text-to-3d', methods=['POST'])
def text_to_3d_endpoint():
    """
    Text to 3D generation endpoint
    
    Request JSON:
    {
        "prompt": "a cute robot toy",
        "mode": "fast" | "quality",  // optional, default "fast"
        "jobId": "xxx"  // optional, for tracking
    }
    
    Response:
    {
        "ok": true,
        "jobId": "xxx",
        "modelPath": "/outputs/xxx.glb",
        "imageUrl": "/outputs/xxx_preview.png"
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'prompt' not in data:
            return jsonify({'ok': False, 'error': 'Prompt is required'}), 400
        
        prompt = data['prompt'].strip()
        mode = data.get('mode', 'fast')
        job_id = data.get('jobId', str(uuid.uuid4()))
        seed = data.get('seed', None)  # Optional seed for reproducible generation
        if seed is not None:
            seed = int(seed)
        
        if not prompt:
            return jsonify({'ok': False, 'error': 'Prompt cannot be empty'}), 400
        
        if len(prompt) > 500:
            return jsonify({'ok': False, 'error': 'Prompt too long (max 500 chars)'}), 400
        
        print(f"\n{'='*60}")
        print(f"📝 Text-to-3D Job: {job_id}")
        print(f"   Prompt: {prompt[:100]}...")
        print(f"   Mode: {mode}")
        print(f"   Seed: {seed or 'random'}")
        print(f"{'='*60}\n")
        
        start_time = time.time()
        
        # Track job
        jobs[job_id] = {
            'status': 'processing',
            'step': 'text-to-image',
            'progress': 0
        }
        
        # Step 1: Text to Image (Stable Diffusion)
        # Generate colorful 3D render images for best Hunyuan3D reconstruction
        print("🎨 Step 1: Text → 3D Render Image(s)")
        jobs[job_id]['step'] = 'text-to-image'
        jobs[job_id]['progress'] = 10
        
        if ProcessingConfig.ENABLE_MULTIVIEW:
            # Generate 6 views for maximum 3D information
            print(f"  📷 Multi-view mode: generating {len(ProcessingConfig.MULTIVIEW_VIEWS)} views")
            view_images = text_to_multiview(prompt, mode, seed=seed, views=ProcessingConfig.MULTIVIEW_VIEWS)
            
            # Save all view previews
            for view_name, view_img in view_images.items():
                view_path = OUTPUT_DIR / f"{job_id}_view_{view_name}.png"
                view_img.save(view_path)
            
            # Select best single view for Hunyuan3D (three-quarter preferred)
            generated_image = select_best_view(view_images)
            
            # Save the primary preview
            preview_path = OUTPUT_DIR / f"{job_id}_preview.png"
            generated_image.save(preview_path)
            print(f"  ✓ {len(view_images)} views generated, primary saved")
        else:
            # Single view generation (faster, less VRAM)
            generated_image = text_to_image(prompt, mode, seed=seed)
            preview_path = OUTPUT_DIR / f"{job_id}_preview.png"
            generated_image.save(preview_path)
            print(f"  ✓ Preview saved: {preview_path}")
        
        # Unload SD models to free VRAM for Hunyuan3D
        print("\n🗑️ Unloading SD models to free VRAM for Hunyuan3D...")
        from stable_diffusion import sd_generator
        sd_generator.unload_models()
        
        # Step 2: Preprocess Image for Hunyuan3D
        print("\n🖼️ Step 2: Preprocessing image for Hunyuan3D")
        jobs[job_id]['step'] = 'preprocessing'
        jobs[job_id]['progress'] = 40
        
        preprocessed = preprocess_for_hunyuan3d(generated_image)
        
        # Save preprocessed image
        preprocessed_path = OUTPUT_DIR / f"{job_id}_preprocessed.png"
        preprocessed.save(preprocessed_path)
        
        # Step 3: Image to 3D (Hunyuan3D-2) — shape only (texture via Phase 2 if desired)
        print("\n🔮 Step 3: Image → 3D (Hunyuan3D-2)")
        jobs[job_id]['step'] = 'image-to-3d'
        jobs[job_id]['progress'] = 60
        
        raw_model_path = str(OUTPUT_DIR / f"{job_id}_raw.glb")
        image_to_3d(preprocessed, raw_model_path, with_texture=False)
        
        # Step 4: Post-process 3D model
        print("\n🔧 Step 4: Post-processing 3D model")
        jobs[job_id]['step'] = 'postprocessing'
        jobs[job_id]['progress'] = 85
        
        final_model_path = str(OUTPUT_DIR / f"{job_id}.glb")
        postprocess_mesh(raw_model_path, final_model_path, source='hunyuan3d')
        
        # Cleanup raw model
        try:
            os.remove(raw_model_path)
        except:
            pass
        
        # Step 5: Render 3D thumbnail (so My Storage shows actual 3D model, not SD image)
        print("\n📸 Step 5: Rendering 3D thumbnail")
        jobs[job_id]['step'] = 'rendering-thumbnail'
        jobs[job_id]['progress'] = 95
        
        thumbnail_path = str(OUTPUT_DIR / f"{job_id}_thumb3d.png")
        thumb_result = render_mesh_thumbnail(final_model_path, thumbnail_path)
        # Use 3D thumbnail if available, otherwise fall back to SD preview
        thumbnail_url = f"/outputs/{job_id}_thumb3d.png" if thumb_result else f"/outputs/{job_id}_preview.png"
        
        # Done
        elapsed = time.time() - start_time
        jobs[job_id]['status'] = 'completed'
        jobs[job_id]['progress'] = 100
        
        print(f"\n✅ Job completed in {elapsed:.1f}s")
        print(f"   Model: {final_model_path}")
        
        return jsonify({
            'ok': True,
            'jobId': job_id,
            'modelPath': f"/outputs/{job_id}.glb",
            'imageUrl': thumbnail_url,
            'elapsed': elapsed
        })
        
    except Exception as e:
        traceback.print_exc()
        if job_id in jobs:
            jobs[job_id]['status'] = 'failed'
            jobs[job_id]['error'] = str(e)
        return jsonify({'ok': False, 'error': str(e)}), 500


@app.route('/api/image-to-3d', methods=['POST'])
def image_to_3d_endpoint():
    """
    Image to 3D generation endpoint
    
    Request: multipart/form-data with 'image' file
    
    Response:
    {
        "ok": true,
        "jobId": "xxx",
        "modelPath": "/outputs/xxx.glb"
    }
    """
    try:
        if 'image' not in request.files:
            return jsonify({'ok': False, 'error': 'No image file provided'}), 400
        
        file = request.files['image']
        
        if file.filename == '':
            return jsonify({'ok': False, 'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'ok': False, 'error': f'Invalid file type. Allowed: {ALLOWED_EXTENSIONS}'}), 400
        
        job_id = request.form.get('jobId', str(uuid.uuid4()))
        
        print(f"\n{'='*60}")
        print(f"🖼️ Image-to-3D Job: {job_id}")
        print(f"   File: {file.filename}")
        print(f"{'='*60}\n")
        
        start_time = time.time()
        
        # Track job
        jobs[job_id] = {
            'status': 'processing',
            'step': 'uploading',
            'progress': 0
        }
        
        # Read image
        image_data = file.read()
        image = Image.open(io.BytesIO(image_data)).convert('RGB')
        
        # Save original
        original_path = UPLOAD_DIR / f"{job_id}_original.png"
        image.save(original_path)
        print(f"  ✓ Original saved: {original_path} (size: {image.size})")
        
        # Unload SD models if loaded (free VRAM for Hunyuan3D)
        try:
            from stable_diffusion import sd_generator
            sd_generator.unload_models()
        except:
            pass
        
        # Step 1: Preprocess Image for Hunyuan3D
        print("\n🖼️ Step 1: Preprocessing image for Hunyuan3D")
        jobs[job_id]['step'] = 'preprocessing'
        jobs[job_id]['progress'] = 20
        
        preprocessed = preprocess_for_hunyuan3d(image)
        
        # Save preprocessed
        preprocessed_path = OUTPUT_DIR / f"{job_id}_preprocessed.png"
        preprocessed.save(preprocessed_path)
        
        # Step 2: Image to 3D (Hunyuan3D-2) — shape only
        print("\n🔮 Step 2: Image → 3D (Hunyuan3D-2)")
        jobs[job_id]['step'] = 'image-to-3d'
        jobs[job_id]['progress'] = 50
        
        raw_model_path = str(OUTPUT_DIR / f"{job_id}_raw.glb")
        image_to_3d(preprocessed, raw_model_path, with_texture=False)
        
        # Step 3: Post-process 3D model
        print("\n🔧 Step 3: Post-processing 3D model")
        jobs[job_id]['step'] = 'postprocessing'
        jobs[job_id]['progress'] = 80
        
        final_model_path = str(OUTPUT_DIR / f"{job_id}.glb")
        postprocess_mesh(raw_model_path, final_model_path, source='hunyuan3d')
        
        # Cleanup raw model
        try:
            os.remove(raw_model_path)
        except:
            pass
        
        # Render 3D thumbnail
        print("\n📸 Rendering 3D thumbnail")
        jobs[job_id]['step'] = 'rendering-thumbnail'
        jobs[job_id]['progress'] = 90
        
        thumbnail_path = str(OUTPUT_DIR / f"{job_id}_thumb3d.png")
        thumb_result = render_mesh_thumbnail(final_model_path, thumbnail_path)
        thumbnail_url = f"/outputs/{job_id}_thumb3d.png" if thumb_result else f"/outputs/{job_id}_preprocessed.png"
        
        # Done
        elapsed = time.time() - start_time
        jobs[job_id]['status'] = 'completed'
        jobs[job_id]['progress'] = 100
        
        print(f"\n✅ Job completed in {elapsed:.1f}s")
        print(f"   Model: {final_model_path}")
        
        return jsonify({
            'ok': True,
            'jobId': job_id,
            'modelPath': f"/outputs/{job_id}.glb",
            'imageUrl': thumbnail_url,
            'preprocessedImage': f"/outputs/{job_id}_preprocessed.png",
            'elapsed': elapsed
        })
        
    except Exception as e:
        traceback.print_exc()
        if 'job_id' in locals() and job_id in jobs:
            jobs[job_id]['status'] = 'failed'
            jobs[job_id]['error'] = str(e)
        return jsonify({'ok': False, 'error': str(e)}), 500


@app.route('/api/job/<job_id>', methods=['GET'])
def get_job_status(job_id):
    """Get job status"""
    if job_id not in jobs:
        return jsonify({'ok': False, 'error': 'Job not found'}), 404
    return jsonify({'ok': True, **jobs[job_id]})


def _run_batch_generation(job_id, prompt, mode, num_variants):
    """
    Background worker for batch generation.
    Updates jobs[job_id] in-place so the polling endpoint can track progress.
    """
    try:
        start_time = time.time()
        
        # Step 1: Generate N images with different seeds
        print(f"🎨 Step 1: Generating {num_variants} images with different seeds...")
        seeds = [random.randint(0, 2**31 - 1) for _ in range(num_variants)]
        generated_images = []
        
        for i, seed in enumerate(seeds):
            print(f"\n  → Variant {i+1}/{num_variants} (seed: {seed})")
            jobs[job_id]['step'] = f'generating-image-{i+1}'
            jobs[job_id]['progress'] = int(5 + (i / num_variants) * 30)
            
            if ProcessingConfig.ENABLE_MULTIVIEW:
                view_images = text_to_multiview(prompt, mode, seed=seed, views=ProcessingConfig.MULTIVIEW_VIEWS)
                img = select_best_view(view_images)
                for view_name, view_img in view_images.items():
                    view_path = OUTPUT_DIR / f"{job_id}_v{i}_view_{view_name}.png"
                    view_img.save(view_path)
            else:
                img = text_to_image(prompt, mode, seed=seed)
            
            preview_path = OUTPUT_DIR / f"{job_id}_v{i}_preview.png"
            img.save(preview_path)
            generated_images.append((img, seed))
        
        # Unload SD models to free VRAM for Hunyuan3D
        print("\n🗑️ Unloading SD models to free VRAM for Hunyuan3D...")
        from stable_diffusion import sd_generator
        sd_generator.unload_models()
        
        # Step 2: Preprocess and convert each image to 3D
        print(f"\n🔮 Step 2: Converting {num_variants} images to 3D (Hunyuan3D-2)...")
        
        for i, (img, seed) in enumerate(generated_images):
            print(f"\n  → Model {i+1}/{num_variants}")
            jobs[job_id]['step'] = f'processing-variant-{i+1}'
            jobs[job_id]['progress'] = int(35 + (i / num_variants) * 55)
            
            # Preprocess for Hunyuan3D
            preprocessed = preprocess_for_hunyuan3d(img)
            preprocessed_path = OUTPUT_DIR / f"{job_id}_v{i}_preprocessed.png"
            preprocessed.save(preprocessed_path)
            
            # Hunyuan3D — shape only for batch (texture via Phase 2 panel if desired)
            # Note: Hunyuan3D-Paint texture needs ~16GB VRAM, exceeds RTX 3060 12GB
            raw_model_path = str(OUTPUT_DIR / f"{job_id}_v{i}_raw.glb")
            image_to_3d(preprocessed, raw_model_path, with_texture=False)
            
            # Post-process
            final_model_path = str(OUTPUT_DIR / f"{job_id}_v{i}.glb")
            postprocess_mesh(raw_model_path, final_model_path, source='hunyuan3d')
            
            try:
                os.remove(raw_model_path)
            except:
                pass
            
            # Render 3D thumbnail
            thumb_path = str(OUTPUT_DIR / f"{job_id}_v{i}_thumb3d.png")
            thumb_ok = render_mesh_thumbnail(final_model_path, thumb_path)
            thumb_url = f"/outputs/{job_id}_v{i}_thumb3d.png" if thumb_ok else f"/outputs/{job_id}_v{i}_preview.png"
            
            # Record completed variant immediately
            variant_data = {
                'modelPath': f"/outputs/{job_id}_v{i}.glb",
                'imageUrl': thumb_url,
                'previewUrl': f"/outputs/{job_id}_v{i}_preview.png",
                'preprocessedUrl': f"/outputs/{job_id}_v{i}_preprocessed.png",
                'seed': seed,
                'variant': i + 1
            }
            jobs[job_id]['variants'].append(variant_data)
            jobs[job_id]['variants_completed'] = i + 1
            print(f"  ✓ Variant {i+1} complete")
        
        # Done
        elapsed = time.time() - start_time
        jobs[job_id]['status'] = 'completed'
        jobs[job_id]['progress'] = 100
        jobs[job_id]['elapsed'] = elapsed
        
        print(f"\n✅ Batch job completed in {elapsed:.1f}s ({num_variants} variants)")
        
    except Exception as e:
        traceback.print_exc()
        jobs[job_id]['status'] = 'failed'
        jobs[job_id]['error'] = str(e)
        print(f"\n❌ Batch job failed: {e}")


@app.route('/api/text-to-3d-batch', methods=['POST'])
def text_to_3d_batch_endpoint():
    """
    Generate multiple 3D model variants from text prompt (ASYNC).
    Returns job_id immediately. Poll GET /api/job/<job_id> for progress.
    Variants appear one-by-one in job status as they complete.
    
    Request JSON:
    {
        "prompt": "a dragon with a hat",
        "mode": "fast" | "quality",
        "num_variants": 4
    }
    
    Immediate Response:
    {
        "ok": true,
        "jobId": "xxx",
        "status": "processing"
    }
    
    Poll GET /api/job/xxx → returns:
    {
        "status": "processing" | "completed" | "failed",
        "progress": 0-100,
        "step": "generating-image-2",
        "variants_completed": 1,
        "total_variants": 4,
        "variants": [ { completed variant data... } ]
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'prompt' not in data:
            return jsonify({'ok': False, 'error': 'Prompt is required'}), 400
        
        prompt = data['prompt'].strip()
        mode = data.get('mode', 'fast')
        num_variants = min(int(data.get('num_variants', 4)), 4)
        job_id = data.get('jobId', str(uuid.uuid4()))
        
        if not prompt:
            return jsonify({'ok': False, 'error': 'Prompt cannot be empty'}), 400
        
        print(f"\n{'='*60}")
        print(f"📝 Text-to-3D BATCH Job: {job_id}")
        print(f"   Prompt: {prompt[:100]}...")
        print(f"   Mode: {mode}")
        print(f"   Variants: {num_variants}")
        print(f"{'='*60}\n")
        
        # Initialize job tracking
        jobs[job_id] = {
            'status': 'processing',
            'step': 'queued',
            'progress': 0,
            'variants_completed': 0,
            'total_variants': num_variants,
            'variants': []  # Filled one-by-one as each completes
        }
        
        # Start background thread — returns immediately to caller
        thread = threading.Thread(
            target=_run_batch_generation,
            args=(job_id, prompt, mode, num_variants),
            daemon=True
        )
        thread.start()
        
        # Return job_id right away (no waiting!)
        return jsonify({
            'ok': True,
            'jobId': job_id,
            'status': 'processing',
            'total_variants': num_variants
        })
        
    except Exception as e:
        traceback.print_exc()
        return jsonify({'ok': False, 'error': str(e)}), 500


@app.route('/api/apply-texture', methods=['POST'])
def apply_hunyuan_texture_endpoint():
    """
    Apply Hunyuan3D-Paint texture to an existing untextured GLB model.
    Called after user selects their preferred variant from shape-only batch.
    
    Request JSON:
    {
        "modelPath": "/outputs/job_v0.glb",
        "preprocessedImage": "/outputs/job_v0_preprocessed.png"  (optional)
    }
    
    Response:
    {
        "ok": true,
        "texturedModelPath": "/outputs/job_v0_textured.glb",
        "elapsed": 180.5
    }
    """
    try:
        data = request.get_json()
        model_path_rel = data.get('modelPath', '')
        
        if not model_path_rel:
            return jsonify({'ok': False, 'error': 'modelPath is required'}), 400
        
        # Resolve to absolute path
        model_path = str(OUTPUT_DIR / model_path_rel.lstrip('/').replace('outputs/', ''))
        
        if not os.path.exists(model_path):
            return jsonify({'ok': False, 'error': f'Model file not found: {model_path_rel}'}), 404
        
        # Load preprocessed image if available (for texture guidance)
        preprocessed_path = data.get('preprocessedImage', '')
        image = None
        if preprocessed_path:
            abs_preproc = str(OUTPUT_DIR / preprocessed_path.lstrip('/').replace('outputs/', ''))
            if os.path.exists(abs_preproc):
                from PIL import Image as PILImage
                image = PILImage.open(abs_preproc).convert('RGBA')
        
        print(f"\n{'='*60}")
        print(f"🎨 Applying Hunyuan3D-Paint texture")
        print(f"   Model: {model_path_rel}")
        print(f"   Image: {'yes' if image else 'no'}")
        print(f"{'='*60}\n")
        
        start_time = time.time()
        
        # Load the untextured mesh
        import trimesh as tm
        mesh = tm.load(model_path, force='mesh')
        
        # Load and apply Hunyuan3D-Paint texture pipeline
        from hunyuan3d_wrapper import hunyuan3d_generator
        hunyuan3d_generator._load_texture_model()
        
        if not hunyuan3d_generator.initialized_texture or hunyuan3d_generator.texture_pipeline is None:
            return jsonify({'ok': False, 'error': 'Texture model not available'}), 503
        
        # Free VRAM before texture
        import torch, gc
        torch.cuda.empty_cache()
        gc.collect()
        
        # Apply texture
        textured_mesh = hunyuan3d_generator.texture_pipeline(mesh, image=image)
        
        # Save textured model
        textured_path = model_path.replace('.glb', '_textured.glb')
        textured_mesh.export(textured_path)
        
        elapsed = time.time() - start_time
        textured_rel = f"/outputs/{os.path.basename(textured_path)}"
        
        print(f"\n✅ Texture applied in {elapsed:.1f}s → {textured_rel}")
        
        return jsonify({
            'ok': True,
            'texturedModelPath': textured_rel,
            'elapsed': elapsed
        })
        
    except Exception as e:
        traceback.print_exc()
        return jsonify({'ok': False, 'error': str(e)}), 500


@app.route('/outputs/<path:filename>', methods=['GET'])
def serve_output(filename):
    """Serve generated files"""
    file_path = OUTPUT_DIR / filename
    if not file_path.exists():
        return jsonify({'ok': False, 'error': 'File not found'}), 404
    return send_file(str(file_path))


@app.route('/api/debug/images/<job_id>', methods=['GET'])
def debug_images(job_id):
    """
    List all generated images for a job (for debugging SD → Hunyuan3D pipeline).
    Returns URLs for: SD preview, preprocessed image, 3D thumbnail, multi-view images.
    
    Usage: GET /api/debug/images/<job_id>
    Or for batch: GET /api/debug/images/<job_id>?variant=0
    """
    variant = request.args.get('variant', None)
    prefix = f"{job_id}_v{variant}_" if variant is not None else f"{job_id}_"
    
    images = {}
    for f in OUTPUT_DIR.iterdir():
        if f.name.startswith(prefix) and f.suffix.lower() in ('.png', '.jpg', '.jpeg'):
            label = f.name.replace(prefix, '').replace(f.suffix, '')
            images[label or 'main'] = f"/outputs/{f.name}"
    
    return jsonify({
        'ok': True,
        'jobId': job_id,
        'variant': variant,
        'images': images,
        'hint': 'Open these URLs in browser to inspect pipeline output: preview=SD image, preprocessed=after enhancement, thumb3d=3D render'
    })


@app.route('/uploads/<path:filename>', methods=['GET'])
def serve_upload(filename):
    """Serve uploaded files"""
    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        return jsonify({'ok': False, 'error': 'File not found'}), 404
    return send_file(str(file_path))


if __name__ == '__main__':
    # Register Phase 2 routes if available
    if PHASE2_AVAILABLE:
        register_phase2(app)
        phase2_status = "✅ Enabled" if Phase2Config.ENABLE_GPU_FEATURES else "⚠️ Demo Mode (GPU not enabled)"
    else:
        phase2_status = "❌ Not Available"
    
    print(f"""
╔══════════════════════════════════════════════════════════════╗
║                    🤖 AI Service                              ║
║                                                              ║
║  Text-to-3D:  POST /api/text-to-3d                          ║
║  Image-to-3D: POST /api/image-to-3d                         ║
║  Job Status:  GET  /api/job/<job_id>                        ║
║  Files:       GET  /outputs/<filename>                      ║
║                                                              ║
║  ═══════════════ Phase 2 Features ═══════════════           ║
║  Status: {phase2_status:<47}║
║  Texture:     POST /api/phase2/texture                      ║
║  Rig:         POST /api/phase2/rig                          ║
║  Animate:     POST /api/phase2/animate                      ║
║  Remesh:      POST /api/phase2/remesh                       ║
║  Export:      POST /api/phase2/export                       ║
║                                                              ║
║  Port: {PORT:<5}                                              ║
╚══════════════════════════════════════════════════════════════╝
""")
    app.run(host=HOST, port=PORT, debug=DEBUG, threaded=True)
