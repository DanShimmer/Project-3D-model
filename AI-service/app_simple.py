"""
Simplified AI Service Flask API
Demo mode - returns sample 3D models without actual AI generation
"""
import os
import uuid
import time
from pathlib import Path
from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
from PIL import Image
import io

app = Flask(__name__)
CORS(app)

# Create directories
OUTPUT_DIR = Path("outputs")
UPLOAD_DIR = Path("uploads")
SAMPLE_DIR = Path("samples")

OUTPUT_DIR.mkdir(exist_ok=True)
UPLOAD_DIR.mkdir(exist_ok=True)
SAMPLE_DIR.mkdir(exist_ok=True)

# Active jobs tracking
jobs = {}


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'gpu_available': False,
        'gpu_name': 'Demo Mode - No GPU Required',
        'mode': 'demo'
    })


@app.route('/api/text-to-3d', methods=['POST'])
def text_to_3d_endpoint():
    """Text to 3D generation endpoint - Demo mode"""
    try:
        data = request.get_json()
        
        if not data or 'prompt' not in data:
            return jsonify({'ok': False, 'error': 'Prompt is required'}), 400
        
        prompt = data['prompt'].strip()
        mode = data.get('mode', 'fast')
        job_id = data.get('jobId', str(uuid.uuid4()))
        
        if not prompt:
            return jsonify({'ok': False, 'error': 'Prompt cannot be empty'}), 400
        
        print(f"\n{'='*60}")
        print(f"📝 Text-to-3D Job: {job_id}")
        print(f"   Prompt: {prompt[:100]}")
        print(f"   Mode: {mode}")
        print(f"{'='*60}\n")
        
        # Simulate processing time
        jobs[job_id] = {'status': 'processing', 'prompt': prompt}
        
        # Demo: Simulate generation time
        process_time = 3 if mode == 'fast' else 6
        time.sleep(process_time)
        
        # Return demo 3D model URL
        # In production, this would be the actual generated model
        demo_model_url = f"/api/demo-model/{job_id}.glb"
        demo_preview_url = f"/api/demo-preview/{job_id}.png"
        
        jobs[job_id]['status'] = 'completed'
        
        print(f"✅ Job {job_id} completed in {process_time}s (demo mode)")
        
        return jsonify({
            'ok': True,
            'jobId': job_id,
            'modelPath': demo_model_url,
            'imageUrl': demo_preview_url,
            'message': 'Demo mode - sample model returned'
        })
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return jsonify({'ok': False, 'error': str(e)}), 500


@app.route('/api/image-to-3d', methods=['POST'])
def image_to_3d_endpoint():
    """Image to 3D generation endpoint - Demo mode"""
    try:
        if 'image' not in request.files:
            return jsonify({'ok': False, 'error': 'Image file is required'}), 400
        
        file = request.files['image']
        mode = request.form.get('mode', 'fast')
        job_id = request.form.get('jobId', str(uuid.uuid4()))
        
        if file.filename == '':
            return jsonify({'ok': False, 'error': 'No file selected'}), 400
        
        print(f"\n{'='*60}")
        print(f"🖼️ Image-to-3D Job: {job_id}")
        print(f"   Filename: {file.filename}")
        print(f"   Mode: {mode}")
        print(f"{'='*60}\n")
        
        # Save uploaded image
        filename = f"{job_id}_{file.filename}"
        filepath = UPLOAD_DIR / filename
        file.save(str(filepath))
        
        jobs[job_id] = {'status': 'processing', 'image': filename}
        
        # Demo: Simulate generation time
        process_time = 5 if mode == 'fast' else 10
        time.sleep(process_time)
        
        # Return demo 3D model URL
        demo_model_url = f"/api/demo-model/{job_id}.glb"
        demo_preview_url = f"/api/demo-preview/{job_id}.png"
        
        jobs[job_id]['status'] = 'completed'
        
        print(f"✅ Job {job_id} completed in {process_time}s (demo mode)")
        
        return jsonify({
            'ok': True,
            'jobId': job_id,
            'modelPath': demo_model_url,
            'imageUrl': demo_preview_url,
            'message': 'Demo mode - sample model returned'
        })
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return jsonify({'ok': False, 'error': str(e)}), 500


@app.route('/api/job/<job_id>', methods=['GET'])
def get_job_status(job_id):
    """Get job status"""
    if job_id in jobs:
        return jsonify({
            'ok': True,
            'status': jobs[job_id].get('status', 'unknown'),
            'data': jobs[job_id]
        })
    return jsonify({'ok': False, 'error': 'Job not found'}), 404


@app.route('/api/demo-model/<filename>')
def serve_demo_model(filename):
    """Serve a demo 3D model"""
    # Return a sample cube GLB model (base64 embedded minimal GLB)
    # This is a minimal valid GLB file representing a simple shape
    sample_glb_path = SAMPLE_DIR / "sample_cube.glb"
    
    if sample_glb_path.exists():
        return send_file(str(sample_glb_path), mimetype='model/gltf-binary')
    
    # Create minimal GLB if not exists
    create_sample_glb(sample_glb_path)
    return send_file(str(sample_glb_path), mimetype='model/gltf-binary')


@app.route('/api/demo-preview/<filename>')
def serve_demo_preview(filename):
    """Serve a demo preview image"""
    # Create a simple placeholder image
    img = Image.new('RGB', (512, 512), color=(50, 50, 60))
    
    # Draw some text/pattern
    from PIL import ImageDraw
    draw = ImageDraw.Draw(img)
    draw.rectangle([100, 100, 412, 412], fill=(80, 80, 100), outline=(100, 200, 100), width=3)
    draw.text((180, 250), "3D Preview", fill=(200, 200, 200))
    
    img_io = io.BytesIO()
    img.save(img_io, 'PNG')
    img_io.seek(0)
    
    return send_file(img_io, mimetype='image/png')


@app.route('/outputs/<path:filename>')
def serve_output(filename):
    """Serve output files"""
    return send_from_directory(str(OUTPUT_DIR), filename)


def create_sample_glb(filepath):
    """Create a minimal sample GLB file (simple cube)"""
    import struct
    import json
    
    # Minimal GLB with a cube
    # Vertices for a simple cube
    vertices = [
        # Front face
        -0.5, -0.5,  0.5,
         0.5, -0.5,  0.5,
         0.5,  0.5,  0.5,
        -0.5,  0.5,  0.5,
        # Back face
        -0.5, -0.5, -0.5,
        -0.5,  0.5, -0.5,
         0.5,  0.5, -0.5,
         0.5, -0.5, -0.5,
    ]
    
    indices = [
        0, 1, 2, 0, 2, 3,  # Front
        4, 5, 6, 4, 6, 7,  # Back
        0, 3, 5, 0, 5, 4,  # Left
        1, 7, 6, 1, 6, 2,  # Right
        3, 2, 6, 3, 6, 5,  # Top
        0, 4, 7, 0, 7, 1,  # Bottom
    ]
    
    # Pack binary data
    vertex_data = struct.pack(f'{len(vertices)}f', *vertices)
    index_data = struct.pack(f'{len(indices)}H', *indices)
    
    # Pad to 4-byte alignment
    while len(vertex_data) % 4 != 0:
        vertex_data += b'\x00'
    while len(index_data) % 4 != 0:
        index_data += b'\x00'
    
    binary_data = index_data + vertex_data
    
    # Create glTF JSON
    gltf = {
        "asset": {"version": "2.0", "generator": "Polyva Demo"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0, "name": "DemoCube"}],
        "meshes": [{
            "primitives": [{
                "attributes": {"POSITION": 1},
                "indices": 0,
                "mode": 4  # TRIANGLES
            }],
            "name": "CubeMesh"
        }],
        "accessors": [
            {
                "bufferView": 0,
                "componentType": 5123,  # UNSIGNED_SHORT
                "count": len(indices),
                "type": "SCALAR"
            },
            {
                "bufferView": 1,
                "componentType": 5126,  # FLOAT
                "count": len(vertices) // 3,
                "type": "VEC3",
                "min": [-0.5, -0.5, -0.5],
                "max": [0.5, 0.5, 0.5]
            }
        ],
        "bufferViews": [
            {
                "buffer": 0,
                "byteOffset": 0,
                "byteLength": len(index_data),
                "target": 34963  # ELEMENT_ARRAY_BUFFER
            },
            {
                "buffer": 0,
                "byteOffset": len(index_data),
                "byteLength": len(vertex_data),
                "target": 34962  # ARRAY_BUFFER
            }
        ],
        "buffers": [{
            "byteLength": len(binary_data)
        }]
    }
    
    # Create GLB
    json_data = json.dumps(gltf, separators=(',', ':')).encode('utf-8')
    while len(json_data) % 4 != 0:
        json_data += b' '
    
    # GLB Header
    glb_header = struct.pack('<4sII', b'glTF', 2, 12 + 8 + len(json_data) + 8 + len(binary_data))
    json_header = struct.pack('<II', len(json_data), 0x4E4F534A)  # JSON chunk
    bin_header = struct.pack('<II', len(binary_data), 0x004E4942)  # BIN chunk
    
    with open(filepath, 'wb') as f:
        f.write(glb_header)
        f.write(json_header)
        f.write(json_data)
        f.write(bin_header)
        f.write(binary_data)
    
    print(f"📦 Created sample GLB: {filepath}")


if __name__ == '__main__':
    print("\n" + "="*60)
    print("🚀 Polyva AI Service - DEMO MODE")
    print("="*60)
    print("⚠️  Running in demo mode - no actual AI generation")
    print("    Returns sample 3D models for testing purposes")
    print("="*60 + "\n")
    
    app.run(host='0.0.0.0', port=8000, debug=False, threaded=True)
