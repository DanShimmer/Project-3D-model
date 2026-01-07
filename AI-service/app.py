"""
AI Service Flask API
Handles Text-to-3D and Image-to-3D requests
"""
import os
import sys
import uuid
import time
import traceback
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

from config import (
    HOST, PORT, DEBUG, 
    UPLOAD_DIR, OUTPUT_DIR,
    SDConfig, ProcessingConfig
)
from preprocessing import preprocess_image
from stable_diffusion import text_to_image
from triposr_wrapper import image_to_3d
from postprocessing import postprocess_mesh


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
    """Health check endpoint"""
    import torch
    return jsonify({
        'status': 'healthy',
        'gpu_available': torch.cuda.is_available(),
        'gpu_name': torch.cuda.get_device_name(0) if torch.cuda.is_available() else None
    })


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
        
        if not prompt:
            return jsonify({'ok': False, 'error': 'Prompt cannot be empty'}), 400
        
        if len(prompt) > 500:
            return jsonify({'ok': False, 'error': 'Prompt too long (max 500 chars)'}), 400
        
        print(f"\n{'='*60}")
        print(f"📝 Text-to-3D Job: {job_id}")
        print(f"   Prompt: {prompt[:100]}...")
        print(f"   Mode: {mode}")
        print(f"{'='*60}\n")
        
        start_time = time.time()
        
        # Track job
        jobs[job_id] = {
            'status': 'processing',
            'step': 'text-to-image',
            'progress': 0
        }
        
        # Step 1: Text to Image (Stable Diffusion)
        print("🎨 Step 1: Text → Image")
        jobs[job_id]['step'] = 'text-to-image'
        jobs[job_id]['progress'] = 10
        
        generated_image = text_to_image(prompt, mode)
        
        # Save preview image
        preview_path = OUTPUT_DIR / f"{job_id}_preview.png"
        generated_image.save(preview_path)
        print(f"  ✓ Preview saved: {preview_path}")
        
        # Step 2: Preprocess Image
        print("\n🖼️ Step 2: Preprocessing image")
        jobs[job_id]['step'] = 'preprocessing'
        jobs[job_id]['progress'] = 40
        
        target_size = SDConfig.SD15_RESOLUTION if mode == 'fast' else SDConfig.SDXL_RESOLUTION
        preprocessed = preprocess_image(
            generated_image,
            remove_bg=True,
            normalize=True,
            target_size=min(target_size, 512)  # TripoSR works best at 512
        )
        
        # Save preprocessed image
        preprocessed_path = OUTPUT_DIR / f"{job_id}_preprocessed.png"
        preprocessed.save(preprocessed_path)
        
        # Step 3: Image to 3D (TripoSR)
        print("\n🔮 Step 3: Image → 3D")
        jobs[job_id]['step'] = 'image-to-3d'
        jobs[job_id]['progress'] = 60
        
        raw_model_path = str(OUTPUT_DIR / f"{job_id}_raw.glb")
        image_to_3d(preprocessed, raw_model_path)
        
        # Step 4: Post-process 3D model
        print("\n🔧 Step 4: Post-processing 3D model")
        jobs[job_id]['step'] = 'postprocessing'
        jobs[job_id]['progress'] = 85
        
        final_model_path = str(OUTPUT_DIR / f"{job_id}.glb")
        postprocess_mesh(raw_model_path, final_model_path)
        
        # Cleanup raw model
        try:
            os.remove(raw_model_path)
        except:
            pass
        
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
            'imageUrl': f"/outputs/{job_id}_preview.png",
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
        print(f"  ✓ Original saved: {original_path}")
        
        # Step 1: Preprocess Image
        print("\n🖼️ Step 1: Preprocessing image")
        jobs[job_id]['step'] = 'preprocessing'
        jobs[job_id]['progress'] = 20
        
        preprocessed = preprocess_image(
            image,
            remove_bg=True,
            normalize=True,
            target_size=512
        )
        
        # Save preprocessed
        preprocessed_path = OUTPUT_DIR / f"{job_id}_preprocessed.png"
        preprocessed.save(preprocessed_path)
        
        # Step 2: Image to 3D (TripoSR)
        print("\n🔮 Step 2: Image → 3D")
        jobs[job_id]['step'] = 'image-to-3d'
        jobs[job_id]['progress'] = 50
        
        raw_model_path = str(OUTPUT_DIR / f"{job_id}_raw.glb")
        image_to_3d(preprocessed, raw_model_path)
        
        # Step 3: Post-process 3D model
        print("\n🔧 Step 3: Post-processing 3D model")
        jobs[job_id]['step'] = 'postprocessing'
        jobs[job_id]['progress'] = 80
        
        final_model_path = str(OUTPUT_DIR / f"{job_id}.glb")
        postprocess_mesh(raw_model_path, final_model_path)
        
        # Cleanup raw model
        try:
            os.remove(raw_model_path)
        except:
            pass
        
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


if __name__ == '__main__':
    print(f"""
╔══════════════════════════════════════════════════════════════╗
║                    🤖 AI Service                              ║
║                                                              ║
║  Text-to-3D:  POST /api/text-to-3d                          ║
║  Image-to-3D: POST /api/image-to-3d                         ║
║  Job Status:  GET  /api/job/<job_id>                        ║
║  Files:       GET  /outputs/<filename>                      ║
║                                                              ║
║  Port: {PORT:<5}                                              ║
╚══════════════════════════════════════════════════════════════╝
""")
    app.run(host=HOST, port=PORT, debug=DEBUG)
