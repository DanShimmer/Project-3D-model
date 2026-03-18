"""
Phase 2 AI Service - Advanced 3D Processing
Handles Texturing, Rigging, Animation, and Remeshing

Required GPU: NVIDIA GPU with at least 8GB VRAM (recommended: RTX 3080+)
"""
import os
import uuid
import time
import traceback
import struct
import json
import math
import copy
from pathlib import Path
from flask import Blueprint, request, jsonify, send_file
import numpy as np

# Create blueprint for Phase 2 routes
phase2_bp = Blueprint('phase2', __name__, url_prefix='/api/phase2')

# Output directory
OUTPUT_DIR = Path(__file__).parent / "outputs"
OUTPUT_DIR.mkdir(exist_ok=True)

# Track Phase 2 jobs
phase2_jobs = {}


def resolve_model_path(model_path: str) -> str:
    """
    Resolve model path from various formats to an absolute local file path.
    
    The frontend may send:
    1. Full URL: 'http://localhost:8000/outputs/xxx/v0.glb'
    2. Relative /outputs/ path: '/outputs/xxx/v0.glb'  
    3. Just filename: 'xxx/v0.glb'
    4. Already absolute: 'C:\\...\\outputs\\xxx\\v0.glb'
    
    All must resolve to a real file on disk.
    """
    if not model_path:
        return model_path
    
    original = model_path
    
    # Step 1: Strip full URL prefix (http://host:port)
    # Handle both http and https, any host/port
    import re
    url_match = re.match(r'https?://[^/]+(/.+)', model_path)
    if url_match:
        model_path = url_match.group(1)  # Extract just the path part
    
    # Step 2: Strip /outputs/ prefix and resolve to OUTPUT_DIR
    if model_path.startswith('/outputs/'):
        model_path = str(OUTPUT_DIR / model_path[len('/outputs/'):])
    elif model_path.startswith('outputs/'):
        model_path = str(OUTPUT_DIR / model_path[len('outputs/'):])
    elif not os.path.isabs(model_path):
        model_path = str(OUTPUT_DIR / model_path)
    
    if original != model_path:
        print(f"  📂 Path resolved: {original[:80]}... → {model_path}")
    
    return model_path


# ============================================
# CONFIGURATION - Set based on your GPU
# ============================================
class Phase2Config:
    """
    Configuration for Phase 2 features
    GPU features are now ENABLED for real AI processing
    """
    # Master switch - ENABLED for GPU processing
    ENABLE_GPU_FEATURES = True
    
    # Feature flags
    ENABLE_TEXTURING = True      # AI texture generation
    ENABLE_RIGGING = True        # Auto rigging with Mixamo-style
    ENABLE_ANIMATION = True      # Animation retargeting
    ENABLE_REMESH = True         # Topology modification
    
    # GPU Requirements
    MIN_VRAM_GB = 8              # Minimum VRAM required
    RECOMMENDED_VRAM_GB = 12     # Recommended VRAM
    
    # Model paths (will be populated when models are downloaded)
    TEXTURE_MODEL_PATH = None    # Path to texture generation model
    RIG_MODEL_PATH = None        # Path to auto-rigging model
    
    @classmethod
    def check_gpu(cls):
        """Check if GPU meets requirements"""
        try:
            import torch
            if not torch.cuda.is_available():
                return {
                    "available": False,
                    "reason": "No CUDA GPU detected"
                }
            
            gpu_name = torch.cuda.get_device_name(0)
            vram_gb = torch.cuda.get_device_properties(0).total_memory / (1024**3)
            
            return {
                "available": True,
                "gpu_name": gpu_name,
                "vram_gb": round(vram_gb, 2),
                "meets_minimum": vram_gb >= cls.MIN_VRAM_GB,
                "meets_recommended": vram_gb >= cls.RECOMMENDED_VRAM_GB,
                "features_enabled": cls.ENABLE_GPU_FEATURES
            }
        except Exception as e:
            return {
                "available": False,
                "reason": str(e)
            }


# ============================================
# TEXTURING SERVICE (Uses AI Texturing)
# ============================================
# Import the AI texturing service
try:
    from texturing_service import ai_texturing_service, AITexturingService
    AI_TEXTURING_AVAILABLE = True
    print("✅ AI Texturing Service imported successfully")
except ImportError as e:
    AI_TEXTURING_AVAILABLE = False
    print(f"⚠️ AI Texturing Service not available: {e}")


class TexturingService:
    """
    AI-powered texture generation service
    Uses Stable Diffusion + ControlNet for automatic texturing
    """
    
    def __init__(self):
        self.ai_service = ai_texturing_service if AI_TEXTURING_AVAILABLE else None
        self.loaded = False
    
    def load_model(self):
        """Load texture generation model"""
        if not Phase2Config.ENABLE_GPU_FEATURES:
            return False
        
        if not AI_TEXTURING_AVAILABLE:
            print("⚠️ AI Texturing not available")
            return False
        
        try:
            success = self.ai_service.load_models()
            self.loaded = success
            return success
        except Exception as e:
            print(f"Failed to load texture model: {e}")
            return False
    
    def generate_texture(self, model_path: str, prompt: str = None, style: str = "realistic"):
        """
        Generate texture for a 3D model using AI
        
        Args:
            model_path: Path to the GLB/OBJ model
            prompt: Optional text prompt for texture customization
            style: Texture style (realistic, stylized, pbr, hand-painted)
        
        Returns:
            Path to textured model
        """
        if not Phase2Config.ENABLE_GPU_FEATURES or not AI_TEXTURING_AVAILABLE:
            # Demo mode - return mock result
            return {
                "success": True,
                "demo_mode": True,
                "message": "Texturing simulated (GPU not enabled)",
                "textured_model_path": model_path
            }
        
        # Real AI texturing implementation
        try:
            # Ensure model is loaded
            if not self.loaded:
                self.load_model()
            
            # Call AI texturing service
            result = self.ai_service.generate_texture(model_path, style, prompt)
            
            if result.get("success"):
                return {
                    "success": True,
                    "textured_model_path": result.get("textured_model_path"),
                    "texture_path": result.get("texture_path"),
                    "style": style,
                    "texture_maps": {
                        "diffuse": result.get("texture_path")
                    }
                }
            else:
                return {
                    "success": False,
                    "error": result.get("error", "Unknown texturing error")
                }
                
        except Exception as e:
            traceback.print_exc()
            return {"success": False, "error": str(e)}
    
    def generate_pbr_maps(self, texture_path: str):
        """
        Generate PBR maps (normal, roughness, metallic) from diffuse texture
        
        Args:
            texture_path: Path to diffuse texture image
            
        Returns:
            Dictionary with paths to normal, roughness, metallic maps
        """
        if not Phase2Config.ENABLE_GPU_FEATURES or not AI_TEXTURING_AVAILABLE:
            return {
                "success": True,
                "demo_mode": True,
                "message": "PBR generation simulated"
            }
        
        try:
            result = self.ai_service.generate_pbr_maps(texture_path)
            return result
        except Exception as e:
            traceback.print_exc()
            return {"success": False, "error": str(e)}


# ============================================
# RIGGING SERVICE — Real Implementation
# ============================================

def _read_glb(path: str):
    """Read a GLB file and return (json_chunk, bin_chunk) as dict and bytes."""
    with open(path, 'rb') as f:
        magic, version, length = struct.unpack('<III', f.read(12))
        assert magic == 0x46546C67, "Not a valid GLB file"
        
        # JSON chunk
        chunk_len, chunk_type = struct.unpack('<II', f.read(8))
        assert chunk_type == 0x4E4F534A  # JSON
        json_data = json.loads(f.read(chunk_len).decode('utf-8'))
        
        # BIN chunk (may not exist)
        bin_data = b''
        remaining = length - 12 - 8 - chunk_len
        if remaining > 8:
            chunk_len2, chunk_type2 = struct.unpack('<II', f.read(8))
            if chunk_type2 == 0x004E4942:  # BIN
                bin_data = f.read(chunk_len2)
    
    return json_data, bytearray(bin_data)


def _write_glb(path: str, gltf_json: dict, bin_data: bytes):
    """Write a GLB file from json dict and binary data."""
    json_str = json.dumps(gltf_json, separators=(',', ':')).encode('utf-8')
    # Pad JSON to 4-byte alignment
    while len(json_str) % 4 != 0:
        json_str += b' '
    # Pad BIN to 4-byte alignment
    bin_data = bytearray(bin_data)
    while len(bin_data) % 4 != 0:
        bin_data += b'\x00'
    
    total_length = 12 + 8 + len(json_str) + 8 + len(bin_data)
    
    with open(path, 'wb') as f:
        # Header
        f.write(struct.pack('<III', 0x46546C67, 2, total_length))
        # JSON chunk
        f.write(struct.pack('<II', len(json_str), 0x4E4F534A))
        f.write(json_str)
        # BIN chunk
        f.write(struct.pack('<II', len(bin_data), 0x004E4942))
        f.write(bin_data)


def _append_to_buffer(bin_data: bytearray, new_bytes: bytes, gltf: dict) -> int:
    """Append bytes to the binary buffer and return the byte offset. Ensures 4-byte alignment."""
    # Pad to 4-byte alignment first
    while len(bin_data) % 4 != 0:
        bin_data += b'\x00'
    offset = len(bin_data)
    bin_data += bytearray(new_bytes)
    # Update buffer byte length
    if gltf.get("buffers"):
        gltf["buffers"][0]["byteLength"] = len(bin_data)
    return offset


def _add_accessor(gltf: dict, buffer_view_idx: int, component_type: int,
                  count: int, acc_type: str, min_val=None, max_val=None) -> int:
    """Add an accessor to glTF and return its index."""
    if "accessors" not in gltf:
        gltf["accessors"] = []
    acc = {
        "bufferView": buffer_view_idx,
        "componentType": component_type,
        "count": count,
        "type": acc_type
    }
    if min_val is not None:
        acc["min"] = min_val
    if max_val is not None:
        acc["max"] = max_val
    gltf["accessors"].append(acc)
    return len(gltf["accessors"]) - 1


def _add_buffer_view(gltf: dict, byte_offset: int, byte_length: int,
                     target=None, byte_stride=None) -> int:
    """Add a bufferView and return its index."""
    if "bufferViews" not in gltf:
        gltf["bufferViews"] = []
    bv = {
        "buffer": 0,
        "byteOffset": byte_offset,
        "byteLength": byte_length
    }
    if target is not None:
        bv["target"] = target
    if byte_stride is not None:
        bv["byteStride"] = byte_stride
    gltf["bufferViews"].append(bv)
    return len(gltf["bufferViews"]) - 1


def _compute_humanoid_joints(bounds_min, bounds_max):
    """
    Compute humanoid skeleton joint positions from mesh bounding box.
    Returns list of (name, parent_index, [x,y,z]) tuples.
    Uses Y-up coordinate system (glTF standard).
    """
    cx = (bounds_min[0] + bounds_max[0]) / 2
    cz = (bounds_min[2] + bounds_max[2]) / 2
    
    height = bounds_max[1] - bounds_min[1]
    base_y = bounds_min[1]
    
    w = bounds_max[0] - bounds_min[0]
    shoulder_half = w * 0.35
    hip_half = w * 0.15
    
    # Joint positions in world space (Y-up)
    joints = [
        # (name, parent_idx, [x, y, z])
        ("root",        -1, [cx, base_y + height * 0.0,  cz]),
        ("hips",         0, [cx, base_y + height * 0.45, cz]),
        ("spine",        1, [cx, base_y + height * 0.55, cz]),
        ("spine1",       2, [cx, base_y + height * 0.65, cz]),
        ("spine2",       3, [cx, base_y + height * 0.72, cz]),
        ("neck",         4, [cx, base_y + height * 0.82, cz]),
        ("head",         5, [cx, base_y + height * 0.90, cz]),
        # Left arm
        ("shoulder_l",   4, [cx - shoulder_half * 0.3, base_y + height * 0.78, cz]),
        ("arm_l",        7, [cx - shoulder_half,        base_y + height * 0.76, cz]),
        ("forearm_l",    8, [cx - shoulder_half * 1.4,  base_y + height * 0.60, cz]),
        ("hand_l",       9, [cx - shoulder_half * 1.6,  base_y + height * 0.48, cz]),
        # Right arm
        ("shoulder_r",   4, [cx + shoulder_half * 0.3, base_y + height * 0.78, cz]),
        ("arm_r",       11, [cx + shoulder_half,        base_y + height * 0.76, cz]),
        ("forearm_r",   12, [cx + shoulder_half * 1.4,  base_y + height * 0.60, cz]),
        ("hand_r",      13, [cx + shoulder_half * 1.6,  base_y + height * 0.48, cz]),
        # Left leg
        ("thigh_l",      1, [cx - hip_half, base_y + height * 0.42, cz]),
        ("shin_l",      15, [cx - hip_half, base_y + height * 0.22, cz]),
        ("foot_l",      16, [cx - hip_half, base_y + height * 0.03, cz]),
        ("toe_l",       17, [cx - hip_half, base_y + height * 0.0,  cz + 0.05 * height]),
        # Right leg
        ("thigh_r",      1, [cx + hip_half, base_y + height * 0.42, cz]),
        ("shin_r",      19, [cx + hip_half, base_y + height * 0.22, cz]),
        ("foot_r",      20, [cx + hip_half, base_y + height * 0.03, cz]),
        ("toe_r",       21, [cx + hip_half, base_y + height * 0.0,  cz + 0.05 * height]),
    ]
    return joints


def _compute_quadruped_joints(bounds_min, bounds_max):
    """
    Compute quadruped skeleton joint positions from mesh bounding box.
    """
    cx = (bounds_min[0] + bounds_max[0]) / 2
    cy_mid = (bounds_min[1] + bounds_max[1]) / 2
    cz = (bounds_min[2] + bounds_max[2]) / 2
    
    length = bounds_max[2] - bounds_min[2]  # Z-length for quadruped
    height = bounds_max[1] - bounds_min[1]
    width = bounds_max[0] - bounds_min[0]
    
    base_y = bounds_min[1]
    leg_half = width * 0.25
    
    joints = [
        ("root",             -1, [cx, base_y + height * 0.5,  cz]),
        ("hips",              0, [cx, base_y + height * 0.55, cz + length * 0.3]),
        ("spine",             1, [cx, base_y + height * 0.6,  cz]),
        ("spine1",            2, [cx, base_y + height * 0.6,  cz - length * 0.15]),
        ("neck",              3, [cx, base_y + height * 0.65, cz - length * 0.3]),
        ("head",              4, [cx, base_y + height * 0.7,  cz - length * 0.42]),
        # Front left leg
        ("front_shoulder_l",  3, [cx - leg_half, base_y + height * 0.55, cz - length * 0.25]),
        ("front_arm_l",       6, [cx - leg_half, base_y + height * 0.28, cz - length * 0.25]),
        ("front_hand_l",      7, [cx - leg_half, base_y + height * 0.02, cz - length * 0.25]),
        # Front right leg
        ("front_shoulder_r",  3, [cx + leg_half, base_y + height * 0.55, cz - length * 0.25]),
        ("front_arm_r",       9, [cx + leg_half, base_y + height * 0.28, cz - length * 0.25]),
        ("front_hand_r",     10, [cx + leg_half, base_y + height * 0.02, cz - length * 0.25]),
        # Back left leg
        ("back_thigh_l",      1, [cx - leg_half, base_y + height * 0.5,  cz + length * 0.25]),
        ("back_shin_l",      12, [cx - leg_half, base_y + height * 0.25, cz + length * 0.25]),
        ("back_foot_l",      13, [cx - leg_half, base_y + height * 0.02, cz + length * 0.25]),
        # Back right leg
        ("back_thigh_r",      1, [cx + leg_half, base_y + height * 0.5,  cz + length * 0.25]),
        ("back_shin_r",      15, [cx + leg_half, base_y + height * 0.25, cz + length * 0.25]),
        ("back_foot_r",      16, [cx + leg_half, base_y + height * 0.02, cz + length * 0.25]),
        # Tail
        ("tail1",             1, [cx, base_y + height * 0.55, cz + length * 0.4]),
        ("tail2",            18, [cx, base_y + height * 0.6,  cz + length * 0.48]),
    ]
    return joints


def _compute_vertex_weights(positions, joints, character_type):
    """
    Compute per-vertex bone weights using bone-segment distance + Gaussian falloff.
    
    Improvements over simple joint-point inverse-distance:
    1. Uses distance to bone SEGMENT (line from parent to child joint), not to joint point
       → vertices along a bone's shaft get correct weight for that bone
    2. Gaussian falloff exp(-d²/2σ²) instead of 1/d
       → smooth transitions at joints instead of sharp boundaries
    3. Vectorized with numpy for performance
    
    Each vertex gets up to 4 bone influences (glTF JOINTS_0 + WEIGHTS_0).
    Returns: (joints_array, weights_array) — both as lists of 4-element lists per vertex.
    """
    num_verts = len(positions) // 3
    num_joints = len(joints)
    
    # Reshape positions to (N, 3)
    P = np.array(positions, dtype=np.float64).reshape(-1, 3)
    
    # Build bone segments: segment from parent joint to this joint
    seg_a = np.zeros((num_joints, 3), dtype=np.float64)  # segment start (parent)
    seg_b = np.zeros((num_joints, 3), dtype=np.float64)  # segment end (this joint)
    
    for i, (name, parent_idx, pos) in enumerate(joints):
        seg_b[i] = pos
        if parent_idx >= 0:
            seg_a[i] = joints[parent_idx][2]
        else:
            seg_a[i] = pos  # root: degenerate segment (point)
    
    # Compute adaptive sigma from average bone length
    bone_vecs = seg_b - seg_a
    bone_lengths = np.linalg.norm(bone_vecs, axis=1)
    valid_lengths = bone_lengths[bone_lengths > 1e-6]
    avg_bone_len = float(valid_lengths.mean()) if len(valid_lengths) > 0 else 0.1
    sigma = avg_bone_len * 1.2  # Gaussian sigma — controls falloff width
    sigma_sq_2 = 2.0 * sigma * sigma
    
    print(f"    📊 Avg bone length: {avg_bone_len:.4f}, sigma: {sigma:.4f}")
    
    # --- Vectorized point-to-segment distance computation ---
    # P: (N, 3), seg_a: (J, 3), seg_b: (J, 3)
    # Broadcast: P -> (N, 1, 3), seg -> (1, J, 3)
    
    Pv = P[:, np.newaxis, :]       # (N, 1, 3)
    A = seg_a[np.newaxis, :, :]    # (1, J, 3)
    B = seg_b[np.newaxis, :, :]    # (1, J, 3)
    
    AB = B - A                      # (1, J, 3) bone direction vectors
    AP = Pv - A                     # (N, J, 3) vertex-to-segment-start vectors
    
    # Project vertex onto bone line: t = dot(AP, AB) / dot(AB, AB)
    ab_sq = np.sum(AB * AB, axis=2)              # (1, J)
    ab_sq_safe = np.maximum(ab_sq, 1e-12)        # avoid division by zero
    ap_dot_ab = np.sum(AP * AB, axis=2)           # (N, J)
    t = np.clip(ap_dot_ab / ab_sq_safe, 0.0, 1.0)  # (N, J) clamped to segment
    
    # Closest point on segment: A + t * AB
    closest_pt = A + t[:, :, np.newaxis] * AB     # (N, J, 3)
    diff = Pv - closest_pt                         # (N, J, 3)
    dist_sq = np.sum(diff * diff, axis=2)          # (N, J)
    
    # Gaussian weights: exp(-d² / 2σ²)
    raw_weights = np.exp(-dist_sq / sigma_sq_2)    # (N, J)
    
    # Pick top 4 bones per vertex
    if num_joints <= 4:
        top4_idx = np.tile(np.arange(num_joints), (num_verts, 1))
        top4_w = raw_weights
    else:
        # argpartition is O(N) per row — much faster than full sort
        top4_idx = np.argpartition(-raw_weights, 4, axis=1)[:, :4]  # (N, 4)
        top4_w = np.take_along_axis(raw_weights, top4_idx, axis=1)  # (N, 4)
    
    # Normalize so weights sum to 1
    w_sum = top4_w.sum(axis=1, keepdims=True)
    w_sum = np.maximum(w_sum, 1e-10)
    top4_w = top4_w / w_sum
    
    # Convert to Python lists
    all_joints = top4_idx.astype(int).tolist()
    all_weights = top4_w.tolist()
    
    return all_joints, all_weights


def _read_mesh_indices(gltf, bin_data, primitive):
    """
    Read triangle indices from a glTF mesh primitive.
    Returns flat list of vertex indices, or None if non-indexed.
    """
    if "indices" not in primitive:
        return None
    
    idx_accessor = gltf["accessors"][primitive["indices"]]
    idx_bv = gltf["bufferViews"][idx_accessor["bufferView"]]
    idx_offset = idx_bv.get("byteOffset", 0) + idx_accessor.get("byteOffset", 0)
    idx_count = idx_accessor["count"]
    comp_type = idx_accessor["componentType"]
    
    indices = []
    for i in range(idx_count):
        if comp_type == 5123:   # UNSIGNED_SHORT
            val = struct.unpack_from('<H', bin_data, idx_offset + i * 2)[0]
        elif comp_type == 5125:  # UNSIGNED_INT
            val = struct.unpack_from('<I', bin_data, idx_offset + i * 4)[0]
        elif comp_type == 5121:  # UNSIGNED_BYTE
            val = struct.unpack_from('<B', bin_data, idx_offset + i)[0]
        else:
            return None
        indices.append(val)
    
    return indices


def _smooth_vertex_weights(all_joints, all_weights, indices, num_verts, num_joints, iterations=2, strength=0.5):
    """
    Smooth skinning weights using mesh face-connectivity.
    
    For each vertex, blends its weights with the average of its neighbors.
    This eliminates sharp weight boundaries that cause mesh tearing.
    
    Args:
        all_joints: list of [j0,j1,j2,j3] per vertex
        all_weights: list of [w0,w1,w2,w3] per vertex
        indices: flat triangle index list
        num_verts: total vertex count
        num_joints: total joint count
        iterations: smoothing passes (more = smoother)
        strength: blend factor (0=no smooth, 1=full neighbor average)
    
    Returns: (smoothed_joints, smoothed_weights) in same format
    """
    if indices is None or len(indices) < 3:
        return all_joints, all_weights
    
    # Build dense weight matrix (N, J) from sparse top-4 representation
    W = np.zeros((num_verts, num_joints), dtype=np.float64)
    for vi in range(num_verts):
        for k in range(4):
            ji = all_joints[vi][k]
            W[vi, ji] += all_weights[vi][k]
    
    # Build adjacency: for each vertex, set of neighboring vertices
    # Using numpy arrays for speed
    idx_arr = np.array(indices, dtype=np.int32)
    num_tris = len(idx_arr) // 3
    tris = idx_arr.reshape(num_tris, 3)
    
    # Build sparse adjacency pairs
    edge_pairs = np.vstack([
        tris[:, [0, 1]], tris[:, [1, 0]],
        tris[:, [1, 2]], tris[:, [2, 1]],
        tris[:, [0, 2]], tris[:, [2, 0]],
    ])  # (6*num_tris, 2)
    
    # Build adjacency list using dictionary for speed
    adj = {}
    for row, col in edge_pairs:
        r, c = int(row), int(col)
        if r not in adj:
            adj[r] = set()
        adj[r].add(c)
    
    # Laplacian smoothing iterations
    for iteration in range(iterations):
        W_new = W.copy()
        for vi in range(num_verts):
            neighbors = adj.get(vi)
            if not neighbors:
                continue
            # Compute average neighbor weights
            neighbor_w = np.zeros(num_joints, dtype=np.float64)
            for ni in neighbors:
                neighbor_w += W[ni]
            neighbor_w /= len(neighbors)
            # Blend: (1-strength)*self + strength*neighbor_avg
            W_new[vi] = (1.0 - strength) * W[vi] + strength * neighbor_w
        W = W_new
    
    # Convert back to top-4 sparse format
    new_joints = []
    new_weights = []
    for vi in range(num_verts):
        row = W[vi]
        if num_joints <= 4:
            top4 = np.arange(num_joints)
        else:
            top4 = np.argpartition(-row, 4)[:4]
        w4 = row[top4]
        total = w4.sum()
        if total < 1e-10:
            total = 1.0
        w4 = w4 / total
        new_joints.append(top4.astype(int).tolist())
        new_weights.append(w4.tolist())
    
    print(f"    🔄 Weight smoothing: {iterations} iterations, strength={strength}")
    return new_joints, new_weights


def _identity_matrix():
    """Return 4x4 identity matrix as flat list (column-major for glTF)."""
    return [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]


def _inverse_bind_matrix(tx, ty, tz):
    """
    Compute inverse bind matrix for a joint at world position (tx, ty, tz).
    This is a simple translation-only inverse: translate by (-tx, -ty, -tz).
    Column-major order for glTF.
    """
    return [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        -tx, -ty, -tz, 1
    ]


def rig_model_glb(input_path: str, output_path: str, character_type: str, markers=None):
    """
    Real implementation: add a skeleton (skin) to a GLB model.
    
    Steps:
    1. Parse the GLB file
    2. Compute bounding box from mesh positions
    3. Create skeleton joints based on character type
    4. Compute per-vertex bone weights
    5. Add skin, joints, weights to the glTF structure
    6. Write the modified GLB
    
    Returns: dict with success status and bone list
    """
    print(f"  🦴 Rigging model: {input_path}")
    print(f"  📐 Character type: {character_type}")
    
    gltf, bin_data = _read_glb(input_path)
    
    # Find mesh and its position accessor
    mesh = gltf["meshes"][0]
    primitive = mesh["primitives"][0]
    pos_accessor_idx = primitive["attributes"]["POSITION"]
    pos_accessor = gltf["accessors"][pos_accessor_idx]
    
    pos_bv = gltf["bufferViews"][pos_accessor["bufferView"]]
    pos_offset = pos_bv.get("byteOffset", 0) + pos_accessor.get("byteOffset", 0)
    pos_count = pos_accessor["count"]
    pos_stride = pos_bv.get("byteStride", 12)  # Default: tightly packed 3 floats
    
    # Read vertex positions
    positions = []
    for i in range(pos_count):
        off = pos_offset + i * pos_stride
        x, y, z = struct.unpack_from('<fff', bin_data, off)
        positions.extend([x, y, z])
    
    # Compute bounding box
    xs = positions[0::3]
    ys = positions[1::3]
    zs = positions[2::3]
    bounds_min = [min(xs), min(ys), min(zs)]
    bounds_max = [max(xs), max(ys), max(zs)]
    
    print(f"  📏 Mesh bounds: min={[round(v,3) for v in bounds_min]} max={[round(v,3) for v in bounds_max]}")
    
    # Compute joint positions
    if character_type == "quadruped":
        joints = _compute_quadruped_joints(bounds_min, bounds_max)
    else:
        joints = _compute_humanoid_joints(bounds_min, bounds_max)
    
    num_joints = len(joints)
    bone_names = [j[0] for j in joints]
    print(f"  🦴 Created {num_joints} bones: {bone_names[:6]}...")
    
    # Compute vertex weights (bone-segment distance + Gaussian falloff)
    joint_indices, joint_weights = _compute_vertex_weights(positions, joints, character_type)
    print(f"  ⚖️ Computed weights for {pos_count} vertices")
    
    # Read mesh indices for weight smoothing
    mesh_indices = _read_mesh_indices(gltf, bin_data, primitive)
    if mesh_indices is not None:
        print(f"  🔗 Read {len(mesh_indices)} triangle indices for smoothing")
        joint_indices, joint_weights = _smooth_vertex_weights(
            joint_indices, joint_weights, mesh_indices,
            pos_count, num_joints, iterations=2, strength=0.5
        )
    else:
        print(f"  ⚠️ No index buffer — skipping weight smoothing")
    
    # --- Build glTF skin data ---
    
    # 1. Create joint nodes
    if "nodes" not in gltf:
        gltf["nodes"] = []
    
    joint_node_start = len(gltf["nodes"])
    
    for i, (name, parent_idx, pos) in enumerate(joints):
        # Joint translation is LOCAL (relative to parent)
        if parent_idx >= 0:
            parent_pos = joints[parent_idx][2]
            local_pos = [pos[0] - parent_pos[0], pos[1] - parent_pos[1], pos[2] - parent_pos[2]]
        else:
            local_pos = pos[:]
        
        node = {
            "name": name,
            "translation": local_pos,
            "children": []
        }
        gltf["nodes"].append(node)
    
    # Set up parent-child relationships
    for i, (name, parent_idx, pos) in enumerate(joints):
        node_idx = joint_node_start + i
        if parent_idx >= 0:
            parent_node_idx = joint_node_start + parent_idx
            gltf["nodes"][parent_node_idx]["children"].append(node_idx)
    
    # Remove empty children arrays
    for i in range(joint_node_start, len(gltf["nodes"])):
        if not gltf["nodes"][i]["children"]:
            del gltf["nodes"][i]["children"]
    
    # Add root joint node to scene
    root_joint_idx = joint_node_start  # The "root" bone
    if "scenes" in gltf and gltf["scenes"]:
        scene = gltf["scenes"][gltf.get("scene", 0)]
        if "nodes" not in scene:
            scene["nodes"] = []
        scene["nodes"].append(root_joint_idx)
    
    # 2. Create inverse bind matrices
    ibm_data = bytearray()
    for name, parent_idx, pos in joints:
        ibm = _inverse_bind_matrix(pos[0], pos[1], pos[2])
        ibm_data += struct.pack('<16f', *ibm)
    
    ibm_offset = _append_to_buffer(bin_data, bytes(ibm_data), gltf)
    ibm_bv_idx = _add_buffer_view(gltf, ibm_offset, len(ibm_data))
    ibm_acc_idx = _add_accessor(gltf, ibm_bv_idx, 5126, num_joints, "MAT4")  # 5126 = FLOAT
    
    # 3. Create JOINTS_0 attribute (4 joint indices per vertex, UNSIGNED_SHORT)
    joints_data = bytearray()
    for j4 in joint_indices:
        joints_data += struct.pack('<4H', *[min(j, num_joints - 1) for j in j4])
    
    joints_offset = _append_to_buffer(bin_data, bytes(joints_data), gltf)
    joints_bv_idx = _add_buffer_view(gltf, joints_offset, len(joints_data))
    joints_acc_idx = _add_accessor(gltf, joints_bv_idx, 5123, pos_count, "VEC4")  # 5123 = UNSIGNED_SHORT
    
    # 4. Create WEIGHTS_0 attribute (4 weights per vertex, FLOAT)
    weights_data = bytearray()
    for w4 in joint_weights:
        weights_data += struct.pack('<4f', *w4)
    
    weights_offset = _append_to_buffer(bin_data, bytes(weights_data), gltf)
    weights_bv_idx = _add_buffer_view(gltf, weights_offset, len(weights_data))
    weights_acc_idx = _add_accessor(gltf, weights_bv_idx, 5126, pos_count, "VEC4")  # 5126 = FLOAT
    
    # 5. Add attributes to mesh primitive
    primitive["attributes"]["JOINTS_0"] = joints_acc_idx
    primitive["attributes"]["WEIGHTS_0"] = weights_acc_idx
    
    # 6. Create skin
    joint_node_indices = list(range(joint_node_start, joint_node_start + num_joints))
    
    if "skins" not in gltf:
        gltf["skins"] = []
    
    skin_idx = len(gltf["skins"])
    gltf["skins"].append({
        "name": f"{character_type}_skeleton",
        "inverseBindMatrices": ibm_acc_idx,
        "joints": joint_node_indices,
        "skeleton": root_joint_idx
    })
    
    # 7. Assign skin to the mesh node
    # Find the node that references this mesh
    for node in gltf["nodes"][:joint_node_start]:
        if "mesh" in node and node["mesh"] == 0:
            node["skin"] = skin_idx
            break
    
    # Write output
    _write_glb(output_path, gltf, bytes(bin_data))
    
    file_size = os.path.getsize(output_path)
    print(f"  ✅ Rigged model saved: {output_path} ({file_size / 1024:.1f} KB)")
    
    return {
        "success": True,
        "rigged_model_path": output_path,
        "bones": bone_names,
        "character_type": character_type,
        "num_joints": num_joints,
        "num_vertices_weighted": pos_count
    }


class RiggingService:
    """
    Auto-rigging service for humanoid and quadruped models.
    Creates a real glTF skeleton with per-vertex bone weights.
    """
    
    HUMANOID_BONES = [
        "root", "hips", "spine", "spine1", "spine2", "neck", "head",
        "shoulder_l", "arm_l", "forearm_l", "hand_l",
        "shoulder_r", "arm_r", "forearm_r", "hand_r",
        "thigh_l", "shin_l", "foot_l", "toe_l",
        "thigh_r", "shin_r", "foot_r", "toe_r"
    ]
    
    QUADRUPED_BONES = [
        "root", "hips", "spine", "spine1", "neck", "head",
        "front_shoulder_l", "front_arm_l", "front_hand_l",
        "front_shoulder_r", "front_arm_r", "front_hand_r",
        "back_thigh_l", "back_shin_l", "back_foot_l",
        "back_thigh_r", "back_shin_r", "back_foot_r",
        "tail1", "tail2"
    ]
    
    def __init__(self):
        self.loaded = True  # No external model needed
    
    def load_model(self):
        """Load auto-rigging model — no external model needed, uses geometry-based rigging."""
        print("✅ Rigging service ready (geometry-based)")
        self.loaded = True
        return True
    
    def auto_rig(self, model_path: str, character_type: str, markers: list = None):
        """
        Automatically rig a 3D model by adding a skeleton and vertex weights.
        
        Args:
            model_path: Path to GLB model
            character_type: "humanoid" or "quadruped"
            markers: Optional list of marker positions for guided rigging
        
        Returns:
            Dict with rigged model path and bone list
        """
        try:
            # Verify input file exists
            if not os.path.exists(model_path):
                return {"success": False, "error": f"Model file not found: {model_path}"}
            
            output_path = str(OUTPUT_DIR / f"{uuid.uuid4()}_rigged.glb")
            
            result = rig_model_glb(model_path, output_path, character_type, markers)
            
            if result["success"]:
                # Return URL path for frontend
                rigged_filename = os.path.basename(output_path)
                result["rigged_model_url"] = f"/outputs/{rigged_filename}"
            
            return result
            
        except Exception as e:
            traceback.print_exc()
            return {"success": False, "error": f"Rigging failed: {str(e)}"}


# ============================================
# ANIMATION SERVICE — Real Implementation
# ============================================

def _quaternion_from_euler(rx, ry, rz):
    """Convert Euler angles (radians) to quaternion [x, y, z, w]."""
    cx = math.cos(rx / 2); sx = math.sin(rx / 2)
    cy = math.cos(ry / 2); sy = math.sin(ry / 2)
    cz = math.cos(rz / 2); sz = math.sin(rz / 2)
    
    return [
        sx * cy * cz - cx * sy * sz,
        cx * sy * cz + sx * cy * sz,
        cx * cy * sz - sx * sy * cz,
        cx * cy * cz + sx * sy * sz
    ]


def _generate_animation_keyframes(animation_id: str, bone_names: list, duration: float):
    """
    Generate animation keyframes for each bone.
    
    Returns dict: {bone_name: {"times": [...], "rotations": [...quaternions...]}}
    Each rotation is [x, y, z, w] quaternion.
    """
    identity_q = [0, 0, 0, 1]
    keyframes = {}
    
    # Number of keyframes
    n = 12
    times = [i * duration / (n - 1) for i in range(n)]
    
    for bone in bone_names:
        keyframes[bone] = {
            "times": times,
            "rotations": [identity_q[:] for _ in range(n)]
        }
    
    if animation_id == "walk":
        # Walk cycle — realistic bipedal locomotion
        # Uses double-sine for natural stride + secondary motion
        for i in range(n):
            t = i / (n - 1)
            phase = math.sin(t * 2 * math.pi)          # main stride
            phase2 = math.sin(t * 4 * math.pi)         # double-time bounce
            half_phase = math.sin(t * 2 * math.pi + 0.3)  # slightly offset for natural feel
            
            # --- Legs ---
            # Upper legs swing forward/back (main stride)
            if "thigh_l" in keyframes:
                keyframes["thigh_l"]["rotations"][i] = _quaternion_from_euler(phase * 0.4, 0, 0)
            if "thigh_r" in keyframes:
                keyframes["thigh_r"]["rotations"][i] = _quaternion_from_euler(-phase * 0.4, 0, 0)
            
            # Knees only bend during back-swing (passing/push-off phase)
            if "shin_l" in keyframes:
                bend = max(0, -phase) * 0.6  # bend when leg swings back
                keyframes["shin_l"]["rotations"][i] = _quaternion_from_euler(bend, 0, 0)
            if "shin_r" in keyframes:
                bend = max(0, phase) * 0.6
                keyframes["shin_r"]["rotations"][i] = _quaternion_from_euler(bend, 0, 0)
            
            # Feet pitch to push off and land
            if "foot_l" in keyframes:
                foot_angle = -phase * 0.15 + max(0, -phase) * 0.1
                keyframes["foot_l"]["rotations"][i] = _quaternion_from_euler(foot_angle, 0, 0)
            if "foot_r" in keyframes:
                foot_angle = phase * 0.15 + max(0, phase) * 0.1
                keyframes["foot_r"]["rotations"][i] = _quaternion_from_euler(foot_angle, 0, 0)
            
            # --- Torso ---
            # Hips rotate opposite to shoulders (counter-rotation)
            if "hips" in keyframes:
                keyframes["hips"]["rotations"][i] = _quaternion_from_euler(
                    phase2 * 0.02,    # subtle vertical bounce
                    phase * 0.06,     # yaw twist with stride
                    phase * 0.02      # slight lateral sway
                )
            
            # Spine counter-rotates against hips for natural twist
            if "spine" in keyframes:
                keyframes["spine"]["rotations"][i] = _quaternion_from_euler(0, -phase * 0.04, -phase * 0.015)
            if "spine1" in keyframes:
                keyframes["spine1"]["rotations"][i] = _quaternion_from_euler(0, -phase * 0.02, 0)
            
            # --- Arms swing opposite to legs ---
            if "arm_l" in keyframes:
                keyframes["arm_l"]["rotations"][i] = _quaternion_from_euler(-phase * 0.25, 0, -0.05)
            if "arm_r" in keyframes:
                keyframes["arm_r"]["rotations"][i] = _quaternion_from_euler(phase * 0.25, 0, 0.05)
            
            # Forearms stay slightly bent and swing gently
            if "forearm_l" in keyframes:
                keyframes["forearm_l"]["rotations"][i] = _quaternion_from_euler(-0.15 + max(0, phase) * 0.1, 0, 0)
            if "forearm_r" in keyframes:
                keyframes["forearm_r"]["rotations"][i] = _quaternion_from_euler(-0.15 + max(0, -phase) * 0.1, 0, 0)
            
            # --- Head ---
            if "head" in keyframes:
                # Very subtle head bob, stays mostly upright
                keyframes["head"]["rotations"][i] = _quaternion_from_euler(phase2 * 0.015, 0, 0)
    
    elif animation_id == "run":
        for i in range(n):
            t = i / (n - 1)
            phase = math.sin(t * 2 * math.pi)
            
            if "thigh_l" in keyframes:
                keyframes["thigh_l"]["rotations"][i] = _quaternion_from_euler(phase * 0.8, 0, 0)
            if "thigh_r" in keyframes:
                keyframes["thigh_r"]["rotations"][i] = _quaternion_from_euler(-phase * 0.8, 0, 0)
            if "shin_l" in keyframes:
                keyframes["shin_l"]["rotations"][i] = _quaternion_from_euler(max(0, -phase) * 0.9, 0, 0)
            if "shin_r" in keyframes:
                keyframes["shin_r"]["rotations"][i] = _quaternion_from_euler(max(0, phase) * 0.9, 0, 0)
            if "arm_l" in keyframes:
                keyframes["arm_l"]["rotations"][i] = _quaternion_from_euler(-phase * 0.6, 0, 0)
            if "arm_r" in keyframes:
                keyframes["arm_r"]["rotations"][i] = _quaternion_from_euler(phase * 0.6, 0, 0)
            if "forearm_l" in keyframes:
                keyframes["forearm_l"]["rotations"][i] = _quaternion_from_euler(-0.6, 0, 0)
            if "forearm_r" in keyframes:
                keyframes["forearm_r"]["rotations"][i] = _quaternion_from_euler(-0.6, 0, 0)
            if "spine" in keyframes:
                keyframes["spine"]["rotations"][i] = _quaternion_from_euler(0.05, -phase * 0.08, 0)
    
    elif animation_id == "attack":
        for i in range(n):
            t = i / (n - 1)
            
            if t < 0.3:
                # Wind up — raise right arm
                p = t / 0.3
                if "arm_r" in keyframes:
                    keyframes["arm_r"]["rotations"][i] = _quaternion_from_euler(-p * 1.2, 0, -p * 0.2)
                if "forearm_r" in keyframes:
                    keyframes["forearm_r"]["rotations"][i] = _quaternion_from_euler(-p * 0.7, 0, 0)
                if "spine2" in keyframes:
                    keyframes["spine2"]["rotations"][i] = _quaternion_from_euler(0, p * 0.25, 0)
            elif t < 0.5:
                # Strike forward
                p = (t - 0.3) / 0.2
                if "arm_r" in keyframes:
                    keyframes["arm_r"]["rotations"][i] = _quaternion_from_euler(-1.2 + p * 1.8, 0, -0.2 + p * 0.2)
                if "forearm_r" in keyframes:
                    keyframes["forearm_r"]["rotations"][i] = _quaternion_from_euler(-0.7 + p * 0.7, 0, 0)
                if "spine2" in keyframes:
                    keyframes["spine2"]["rotations"][i] = _quaternion_from_euler(p * 0.15, 0.3 - p * 0.6, 0)
            else:
                # Recovery
                p = (t - 0.5) / 0.5
                if "arm_r" in keyframes:
                    keyframes["arm_r"]["rotations"][i] = _quaternion_from_euler(0.6 * (1-p), 0, 0)
                if "spine2" in keyframes:
                    keyframes["spine2"]["rotations"][i] = _quaternion_from_euler(0.12 * (1-p), -0.25 * (1-p), 0)
    
    elif animation_id == "dance":
        for i in range(n):
            t = i / (n - 1)
            phase1 = math.sin(t * 4 * math.pi)
            phase2 = math.cos(t * 4 * math.pi)
            
            if "hips" in keyframes:
                keyframes["hips"]["rotations"][i] = _quaternion_from_euler(0, phase1 * 0.2, phase2 * 0.1)
            if "spine" in keyframes:
                keyframes["spine"]["rotations"][i] = _quaternion_from_euler(0, -phase1 * 0.15, 0)
            if "arm_l" in keyframes:
                keyframes["arm_l"]["rotations"][i] = _quaternion_from_euler(phase2 * 0.5 - 0.8, 0, phase1 * 0.3)
            if "arm_r" in keyframes:
                keyframes["arm_r"]["rotations"][i] = _quaternion_from_euler(-phase2 * 0.5 - 0.8, 0, -phase1 * 0.3)
            if "forearm_l" in keyframes:
                keyframes["forearm_l"]["rotations"][i] = _quaternion_from_euler(-1.0 + phase1 * 0.3, 0, 0)
            if "forearm_r" in keyframes:
                keyframes["forearm_r"]["rotations"][i] = _quaternion_from_euler(-1.0 - phase1 * 0.3, 0, 0)
            if "thigh_l" in keyframes:
                keyframes["thigh_l"]["rotations"][i] = _quaternion_from_euler(max(0, phase1) * 0.3, 0, 0)
            if "thigh_r" in keyframes:
                keyframes["thigh_r"]["rotations"][i] = _quaternion_from_euler(max(0, -phase1) * 0.3, 0, 0)
    
    elif animation_id == "agree":
        for i in range(n):
            t = i / (n - 1)
            nod = math.sin(t * 6 * math.pi) * 0.25
            if "head" in keyframes:
                keyframes["head"]["rotations"][i] = _quaternion_from_euler(nod, 0, 0)
            if "neck" in keyframes:
                keyframes["neck"]["rotations"][i] = _quaternion_from_euler(nod * 0.3, 0, 0)
    
    elif animation_id == "alert":
        for i in range(n):
            t = i / (n - 1)
            if t < 0.3:
                p = t / 0.3
                if "spine" in keyframes:
                    keyframes["spine"]["rotations"][i] = _quaternion_from_euler(-p * 0.1, 0, 0)
                if "head" in keyframes:
                    keyframes["head"]["rotations"][i] = _quaternion_from_euler(0, p * 0.5, 0)
            else:
                look = math.sin((t - 0.3) / 0.7 * 2 * math.pi)
                if "head" in keyframes:
                    keyframes["head"]["rotations"][i] = _quaternion_from_euler(0, 0.5 * look, 0)
                if "spine" in keyframes:
                    keyframes["spine"]["rotations"][i] = _quaternion_from_euler(-0.1, look * 0.1, 0)
    
    elif animation_id == "arise":
        for i in range(n):
            t = i / (n - 1)
            # Start crouched, stand up
            crouch = max(0, 1 - t * 2)
            if "hips" in keyframes:
                keyframes["hips"]["rotations"][i] = _quaternion_from_euler(crouch * 0.4, 0, 0)
            if "spine" in keyframes:
                keyframes["spine"]["rotations"][i] = _quaternion_from_euler(crouch * 0.3, 0, 0)
            if "thigh_l" in keyframes:
                keyframes["thigh_l"]["rotations"][i] = _quaternion_from_euler(crouch * 0.8, 0, 0)
            if "thigh_r" in keyframes:
                keyframes["thigh_r"]["rotations"][i] = _quaternion_from_euler(crouch * 0.8, 0, 0)
            if "shin_l" in keyframes:
                keyframes["shin_l"]["rotations"][i] = _quaternion_from_euler(-crouch * 1.0, 0, 0)
            if "shin_r" in keyframes:
                keyframes["shin_r"]["rotations"][i] = _quaternion_from_euler(-crouch * 1.0, 0, 0)
    
    elif animation_id == "dead":
        # Death animation — smooth collapse with ragdoll-like secondary motion
        # Phase 1 (0-0.4): stagger & lose balance  
        # Phase 2 (0.4-0.7): fall forward/sideways
        # Phase 3 (0.7-1.0): settle on ground
        for i in range(n):
            t = i / (n - 1)
            
            if t < 0.15:
                # Initial hit reaction — slight recoil backward
                p = t / 0.15
                if "spine" in keyframes:
                    keyframes["spine"]["rotations"][i] = _quaternion_from_euler(-p * 0.15, 0, 0)
                if "head" in keyframes:
                    keyframes["head"]["rotations"][i] = _quaternion_from_euler(-p * 0.25, 0, 0)
                if "arm_l" in keyframes:
                    keyframes["arm_l"]["rotations"][i] = _quaternion_from_euler(0, 0, p * 0.2)
                if "arm_r" in keyframes:
                    keyframes["arm_r"]["rotations"][i] = _quaternion_from_euler(0, 0, -p * 0.15)
                    
            elif t < 0.4:
                # Stagger — knees buckle, lean forward
                p = (t - 0.15) / 0.25
                if "hips" in keyframes:
                    keyframes["hips"]["rotations"][i] = _quaternion_from_euler(p * 0.3, 0, p * 0.08)
                if "spine" in keyframes:
                    keyframes["spine"]["rotations"][i] = _quaternion_from_euler(-0.15 + p * 0.35, 0, p * 0.05)
                if "head" in keyframes:
                    keyframes["head"]["rotations"][i] = _quaternion_from_euler(-0.25 + p * 0.5, 0, p * 0.1)
                if "thigh_l" in keyframes:
                    keyframes["thigh_l"]["rotations"][i] = _quaternion_from_euler(p * 0.3, 0, 0)
                if "thigh_r" in keyframes:
                    keyframes["thigh_r"]["rotations"][i] = _quaternion_from_euler(p * 0.2, 0, 0)
                if "shin_l" in keyframes:
                    keyframes["shin_l"]["rotations"][i] = _quaternion_from_euler(-p * 0.5, 0, 0)
                if "shin_r" in keyframes:
                    keyframes["shin_r"]["rotations"][i] = _quaternion_from_euler(-p * 0.4, 0, 0)
                if "arm_l" in keyframes:
                    keyframes["arm_l"]["rotations"][i] = _quaternion_from_euler(-p * 0.3, 0, 0.2 + p * 0.3)
                if "arm_r" in keyframes:
                    keyframes["arm_r"]["rotations"][i] = _quaternion_from_euler(-p * 0.2, 0, -0.15 - p * 0.25)
                    
            elif t < 0.7:
                # Collapse — fall to the side/forward
                p = (t - 0.4) / 0.3
                ease = 1 - (1 - p) * (1 - p)  # ease-out for natural fall
                if "hips" in keyframes:
                    keyframes["hips"]["rotations"][i] = _quaternion_from_euler(
                        0.3 + ease * 0.6,   # pitch forward
                        0,
                        0.08 + ease * 0.15   # roll sideways
                    )
                if "spine" in keyframes:
                    keyframes["spine"]["rotations"][i] = _quaternion_from_euler(0.2 + ease * 0.15, 0, ease * 0.08)
                if "head" in keyframes:
                    keyframes["head"]["rotations"][i] = _quaternion_from_euler(0.25 + ease * 0.2, 0, ease * 0.15)
                if "thigh_l" in keyframes:
                    keyframes["thigh_l"]["rotations"][i] = _quaternion_from_euler(0.3 + ease * 0.15, 0, 0)
                if "thigh_r" in keyframes:
                    keyframes["thigh_r"]["rotations"][i] = _quaternion_from_euler(0.2 + ease * 0.1, 0, ease * 0.1)
                if "shin_l" in keyframes:
                    keyframes["shin_l"]["rotations"][i] = _quaternion_from_euler(-0.5 + ease * 0.15, 0, 0)
                if "shin_r" in keyframes:
                    keyframes["shin_r"]["rotations"][i] = _quaternion_from_euler(-0.4 + ease * 0.1, 0, 0)
                if "arm_l" in keyframes:
                    keyframes["arm_l"]["rotations"][i] = _quaternion_from_euler(-0.3 - ease * 0.2, 0, 0.5 + ease * 0.3)
                if "arm_r" in keyframes:
                    keyframes["arm_r"]["rotations"][i] = _quaternion_from_euler(-0.2 - ease * 0.15, 0, -0.4 - ease * 0.2)
                    
            else:
                # Settled on ground — hold final pose with tiny settling motion
                p = (t - 0.7) / 0.3
                settle = 1 + math.sin(p * math.pi) * 0.03  # tiny bounce
                if "hips" in keyframes:
                    keyframes["hips"]["rotations"][i] = _quaternion_from_euler(0.9 * settle, 0, 0.23)
                if "spine" in keyframes:
                    keyframes["spine"]["rotations"][i] = _quaternion_from_euler(0.35 * settle, 0, 0.08)
                if "head" in keyframes:
                    keyframes["head"]["rotations"][i] = _quaternion_from_euler(0.45, 0, 0.15 + (1 - p) * 0.05)
                if "thigh_l" in keyframes:
                    keyframes["thigh_l"]["rotations"][i] = _quaternion_from_euler(0.45, 0, 0)
                if "thigh_r" in keyframes:
                    keyframes["thigh_r"]["rotations"][i] = _quaternion_from_euler(0.3, 0, 0.1)
                if "shin_l" in keyframes:
                    keyframes["shin_l"]["rotations"][i] = _quaternion_from_euler(-0.35, 0, 0)
                if "shin_r" in keyframes:
                    keyframes["shin_r"]["rotations"][i] = _quaternion_from_euler(-0.3, 0, 0)
                if "arm_l" in keyframes:
                    keyframes["arm_l"]["rotations"][i] = _quaternion_from_euler(-0.5, 0, 0.8)
                if "arm_r" in keyframes:
                    keyframes["arm_r"]["rotations"][i] = _quaternion_from_euler(-0.35, 0, -0.6)
                if "forearm_l" in keyframes:
                    keyframes["forearm_l"]["rotations"][i] = _quaternion_from_euler(-0.3, 0, 0)
                if "forearm_r" in keyframes:
                    keyframes["forearm_r"]["rotations"][i] = _quaternion_from_euler(-0.2, 0, 0)
    
    elif animation_id == "behit-flyup":
        for i in range(n):
            t = i / (n - 1)
            if t < 0.3:
                p = t / 0.3
                if "spine" in keyframes:
                    keyframes["spine"]["rotations"][i] = _quaternion_from_euler(-p * 0.5, 0, 0)
                if "head" in keyframes:
                    keyframes["head"]["rotations"][i] = _quaternion_from_euler(-p * 0.8, 0, 0)
            elif t < 0.6:
                p = (t - 0.3) / 0.3
                if "spine" in keyframes:
                    keyframes["spine"]["rotations"][i] = _quaternion_from_euler(-0.5 + p * 0.8, 0, 0)
                if "arm_l" in keyframes:
                    keyframes["arm_l"]["rotations"][i] = _quaternion_from_euler(-p * 1.2, 0, p * 0.4)
                if "arm_r" in keyframes:
                    keyframes["arm_r"]["rotations"][i] = _quaternion_from_euler(-p * 1.2, 0, -p * 0.4)
            else:
                p = (t - 0.6) / 0.4
                if "spine" in keyframes:
                    keyframes["spine"]["rotations"][i] = _quaternion_from_euler(0.3 * (1-p), 0, 0)
                if "arm_l" in keyframes:
                    keyframes["arm_l"]["rotations"][i] = _quaternion_from_euler(-1.2 * (1-p), 0, 0.4 * (1-p))
                if "arm_r" in keyframes:
                    keyframes["arm_r"]["rotations"][i] = _quaternion_from_euler(-1.2 * (1-p), 0, -0.4 * (1-p))
    
    return keyframes


def animate_model_glb(input_path: str, output_path: str, animation_id: str, animation_info: dict):
    """
    Real implementation: add animation keyframes to a rigged GLB model.
    
    The input must be a rigged GLB (with skins and joint nodes).
    
    Steps:
    1. Parse the GLB file
    2. Find the skin and joint nodes
    3. Generate keyframe data for the animation
    4. Create glTF animation channels and samplers
    5. Write the animated GLB
    """
    print(f"  🎬 Animating model: {input_path}")
    print(f"  🎭 Animation: {animation_id} ({animation_info.get('name', '')})")
    
    gltf, bin_data = _read_glb(input_path)
    
    # Verify model has skin (is rigged)
    if "skins" not in gltf or not gltf["skins"]:
        return {"success": False, "error": "Model is not rigged. Please rig the model first."}
    
    skin = gltf["skins"][0]
    joint_node_indices = skin["joints"]
    
    # Get bone names from joint nodes
    bone_names = []
    for idx in joint_node_indices:
        bone_names.append(gltf["nodes"][idx].get("name", f"joint_{idx}"))
    
    duration = animation_info.get("duration", 1.0)
    is_loop = animation_info.get("loop", False)
    
    # Generate keyframes
    keyframes = _generate_animation_keyframes(animation_id, bone_names, duration)
    
    # Create glTF animation
    if "animations" not in gltf:
        gltf["animations"] = []
    
    channels = []
    samplers = []
    sampler_idx = 0
    
    for bone_idx, node_idx in enumerate(joint_node_indices):
        bone_name = bone_names[bone_idx]
        if bone_name not in keyframes:
            continue
        
        kf = keyframes[bone_name]
        times = kf["times"]
        rotations = kf["rotations"]
        
        # Check if this bone has any actual motion (not all identity)
        has_motion = False
        for rot in rotations:
            if abs(rot[0]) > 0.001 or abs(rot[1]) > 0.001 or abs(rot[2]) > 0.001 or abs(rot[3] - 1.0) > 0.001:
                has_motion = True
                break
        
        if not has_motion:
            continue
        
        # Write time values to buffer
        time_data = struct.pack(f'<{len(times)}f', *times)
        time_offset = _append_to_buffer(bin_data, time_data, gltf)
        time_bv_idx = _add_buffer_view(gltf, time_offset, len(time_data))
        time_acc_idx = _add_accessor(
            gltf, time_bv_idx, 5126, len(times), "SCALAR",
            min_val=[min(times)], max_val=[max(times)]
        )
        
        # Write rotation quaternions to buffer
        rot_flat = []
        for r in rotations:
            rot_flat.extend(r)
        rot_data = struct.pack(f'<{len(rot_flat)}f', *rot_flat)
        rot_offset = _append_to_buffer(bin_data, rot_data, gltf)
        rot_bv_idx = _add_buffer_view(gltf, rot_offset, len(rot_data))
        rot_acc_idx = _add_accessor(gltf, rot_bv_idx, 5126, len(rotations), "VEC4")
        
        # Create sampler
        samplers.append({
            "input": time_acc_idx,
            "output": rot_acc_idx,
            "interpolation": "LINEAR"
        })
        
        # Create channel
        channels.append({
            "sampler": sampler_idx,
            "target": {
                "node": node_idx,
                "path": "rotation"
            }
        })
        sampler_idx += 1
    
    if not channels:
        print("  ⚠️ No animated bones found for this animation")
        return {
            "success": True,
            "animated_model_path": input_path,
            "animation": animation_info,
            "warning": "No bones were animated"
        }
    
    gltf["animations"].append({
        "name": animation_info.get("name", animation_id),
        "channels": channels,
        "samplers": samplers
    })
    
    # Write output
    _write_glb(output_path, gltf, bytes(bin_data))
    
    file_size = os.path.getsize(output_path)
    print(f"  ✅ Animated model saved: {output_path} ({file_size / 1024:.1f} KB)")
    print(f"  🎬 Animation: {len(channels)} bone channels, {duration}s duration")
    
    return {
        "success": True,
        "animated_model_path": output_path,
        "animation": animation_info,
        "num_channels": len(channels),
        "duration": duration
    }


class AnimationService:
    """
    Animation service — generates real glTF animations with bone keyframes.
    """
    
    ANIMATION_LIBRARY = {
        "agree": {"name": "Agree Gesture", "duration": 1.5, "loop": False},
        "alert": {"name": "Alert", "duration": 2.0, "loop": False},
        "dance": {"name": "Dance", "duration": 4.0, "loop": True},
        "arise": {"name": "Arise", "duration": 2.5, "loop": False},
        "behit-flyup": {"name": "Be Hit Fly Up", "duration": 1.8, "loop": False},
        "walk": {"name": "Walk", "duration": 1.0, "loop": True},
        "dead": {"name": "Dead", "duration": 2.0, "loop": False},
        "run": {"name": "Run", "duration": 0.8, "loop": True},
        "attack": {"name": "Attack", "duration": 1.2, "loop": False}
    }
    
    def __init__(self):
        self.animations_dir = Path(__file__).parent / "animations"
        self.animations_dir.mkdir(exist_ok=True)
    
    def get_available_animations(self):
        """Get list of available animations"""
        return self.ANIMATION_LIBRARY
    
    def apply_animation(self, rigged_model_path: str, animation_id: str):
        """
        Apply animation to a rigged model by embedding keyframe data into the GLB.
        
        Args:
            rigged_model_path: Path to rigged GLB model (must have skins)
            animation_id: ID of animation to apply
        
        Returns:
            Dict with animated model path
        """
        if animation_id not in self.ANIMATION_LIBRARY:
            return {"success": False, "error": f"Unknown animation: {animation_id}"}
        
        if not os.path.exists(rigged_model_path):
            return {"success": False, "error": f"Model file not found: {rigged_model_path}"}
        
        try:
            animation_info = self.ANIMATION_LIBRARY[animation_id]
            output_path = str(OUTPUT_DIR / f"{uuid.uuid4()}_animated.glb")
            
            result = animate_model_glb(rigged_model_path, output_path, animation_id, animation_info)
            
            if result.get("success"):
                animated_filename = os.path.basename(output_path)
                result["animated_model_url"] = f"/outputs/{animated_filename}"
            
            return result
            
        except Exception as e:
            traceback.print_exc()
            return {"success": False, "error": f"Animation failed: {str(e)}"}


# ============================================
# REMESH SERVICE (Uses Real Remesh Service)
# ============================================
# Import the real remesh service
try:
    from remesh_service import remesh_service as real_remesh_service
    REAL_REMESH_AVAILABLE = True
    print("✅ Real Remesh Service imported successfully")
except ImportError as e:
    REAL_REMESH_AVAILABLE = False
    print(f"⚠️ Real Remesh Service not available: {e}")


class RemeshService:
    """
    Topology modification service
    Converts between triangle and quad meshes
    Uses real remesh_service for actual mesh processing
    """
    
    def remesh(self, model_path: str, topology: str = "triangle", quality: str = "medium"):
        """
        Remesh a model with different topology
        
        Args:
            model_path: Path to input model
            topology: "triangle" or "quad"
            quality: "low", "medium", or "high"
        
        Returns:
            Path to remeshed model with stats
        """
        if not Phase2Config.ENABLE_GPU_FEATURES:
            # Demo mode
            return {
                "success": True,
                "demo_mode": True,
                "message": f"Remesh to {topology} simulated",
                "remeshed_model_path": model_path,
                "topology": topology
            }
        
        # Use real remesh service if available
        if REAL_REMESH_AVAILABLE:
            try:
                result = real_remesh_service.remesh(model_path, topology, quality)
                return result
            except Exception as e:
                traceback.print_exc()
                return {"success": False, "error": str(e)}
        else:
            # Fallback to demo
            return {
                "success": True,
                "demo_mode": True,
                "message": f"Remesh to {topology} (remesh_service not available)",
                "remeshed_model_path": model_path,
                "topology": topology
            }


# ============================================
# MODEL EXPORT SERVICE
# ============================================
class ExportService:
    """
    Export models to various formats
    """
    
    SUPPORTED_FORMATS = {
        "glb": {"mime": "model/gltf-binary", "extension": ".glb"},
        "obj": {"mime": "text/plain", "extension": ".obj"},
        "fbx": {"mime": "application/octet-stream", "extension": ".fbx"},
        "usdz": {"mime": "model/vnd.usdz+zip", "extension": ".usdz"},
        "stl": {"mime": "application/sla", "extension": ".stl"},
        "3mf": {"mime": "application/vnd.ms-package.3dmanufacturing-3dmodel+xml", "extension": ".3mf"},
        "blend": {"mime": "application/x-blender", "extension": ".blend"}
    }
    
    def export(self, model_path: str, format: str):
        """
        Export model to specified format using trimesh.
        
        Supports: GLB, OBJ, STL, 3MF, PLY natively via trimesh.
        FBX, USDZ, BLEND require external tools (returns error if unavailable).
        
        Args:
            model_path: Path to source model (GLB)
            format: Target format (glb, obj, fbx, usdz, stl, 3mf, blend)
        
        Returns:
            dict with success, download_url, format
        """
        if format not in self.SUPPORTED_FORMATS:
            return {"success": False, "error": f"Unsupported format: {format}"}
        
        try:
            import trimesh
            import shutil
            
            ext = self.SUPPORTED_FORMATS[format]['extension']
            export_id = str(uuid.uuid4())[:8]
            base_name = Path(model_path).stem
            output_filename = f"{base_name}_{export_id}{ext}"
            output_path = str(OUTPUT_DIR / output_filename)
            
            # GLB → GLB: just copy the file (no conversion needed)
            if format == "glb":
                if os.path.exists(model_path):
                    shutil.copy2(model_path, output_path)
                else:
                    return {"success": False, "error": f"Source file not found: {model_path}"}
            
            # Trimesh-supported formats: OBJ, STL, 3MF, PLY
            elif format in ("obj", "stl", "3mf", "ply"):
                mesh = trimesh.load(model_path, force='mesh')
                mesh.export(output_path, file_type=format)
            
            # Unsupported formats: inform user
            elif format in ("fbx", "usdz", "blend"):
                return {
                    "success": False,
                    "error": f"{format.upper()} export requires Blender. Please import the GLB file into Blender and export manually."
                }
            
            else:
                return {"success": False, "error": f"Export to {format} not implemented"}
            
            # Verify output file exists
            if not os.path.exists(output_path):
                return {"success": False, "error": "Export failed: output file not created"}
            
            download_url = f"/outputs/{output_filename}"
            print(f"  ✓ Exported to {format}: {output_path}")
            
            return {
                "success": True,
                "download_url": download_url,
                "exported_path": output_path,
                "format": format,
                "filename": output_filename
            }
        except Exception as e:
            traceback.print_exc()
            return {"success": False, "error": str(e)}


# ============================================
# Initialize services
# ============================================
texturing_service = TexturingService()
rigging_service = RiggingService()
animation_service = AnimationService()
remesh_service = RemeshService()
export_service = ExportService()


# ============================================
# API ROUTES
# ============================================

@phase2_bp.route('/health', methods=['GET'])
def phase2_health():
    """Check Phase 2 service health and GPU status"""
    gpu_info = Phase2Config.check_gpu()
    return jsonify({
        "status": "healthy",
        "phase2_enabled": Phase2Config.ENABLE_GPU_FEATURES,
        "gpu": gpu_info,
        "features": {
            "texturing": Phase2Config.ENABLE_TEXTURING,
            "rigging": Phase2Config.ENABLE_RIGGING,
            "animation": Phase2Config.ENABLE_ANIMATION,
            "remesh": Phase2Config.ENABLE_REMESH
        }
    })


@phase2_bp.route('/texture', methods=['POST'])
def apply_texture():
    """Apply AI texture to model"""
    try:
        data = request.get_json()
        model_path = data.get('modelPath')
        prompt = data.get('prompt')
        style = data.get('style', 'realistic')
        ai_options = data.get('aiOptions', ['auto-color'])
        
        if not model_path:
            return jsonify({"ok": False, "error": "Model path required"}), 400
        
        # Resolve model path - handle URLs, relative paths, etc.
        model_path = resolve_model_path(model_path)
        
        # Verify model file exists
        if not os.path.exists(model_path):
            return jsonify({"ok": False, "error": f"Model file not found: {model_path}"}), 404
        
        job_id = str(uuid.uuid4())
        phase2_jobs[job_id] = {"status": "processing", "type": "texture"}
        
        print(f"\n🎨 Texture Job: {job_id}")
        print(f"   Model: {model_path}")
        print(f"   Style: {style}")
        print(f"   AI Options: {ai_options}")
        print(f"   Prompt: {prompt}")
        
        # Build enhanced prompt from AI options
        option_prompts = []
        if 'auto-color' in ai_options:
            option_prompts.append("vivid accurate colors matching the object shape and identity, natural color variation")
        if 'shadows' in ai_options:
            option_prompts.append("ambient occlusion, realistic soft shadows, depth shading, subsurface scattering")
        if 'depth' in ai_options:
            option_prompts.append("volumetric surface detail, depth variation, 3D surface depth, parallax detail")
        if 'detail' in ai_options:
            option_prompts.append("ultra fine surface details, micro-textures, material imperfections, pores, scratches")
        
        enhanced_prompt = ", ".join(option_prompts)
        if prompt:
            enhanced_prompt = f"{prompt}, {enhanced_prompt}"
        if not enhanced_prompt:
            enhanced_prompt = "high quality detailed texture"
        
        result = texturing_service.generate_texture(model_path, enhanced_prompt, style)
        
        if result.get("success"):
            phase2_jobs[job_id]["status"] = "completed"
            
            # Return URLs relative to the outputs directory
            response_data = {"ok": True, "jobId": job_id, "success": True}
            
            if result.get("textured_model_path"):
                textured_filename = os.path.basename(result["textured_model_path"])
                response_data["texturedModelPath"] = f"/outputs/{textured_filename}"
                response_data["textured_model_path"] = result["textured_model_path"]
            
            if result.get("texture_path"):
                texture_filename = os.path.basename(result["texture_path"])
                response_data["texturePath"] = f"/outputs/{texture_filename}"
            
            response_data["style"] = style
            response_data["aiOptions"] = ai_options
            
            return jsonify(response_data)
        else:
            phase2_jobs[job_id]["status"] = "failed"
            return jsonify({"ok": False, **result}), 500
            
    except Exception as e:
        traceback.print_exc()
        return jsonify({"ok": False, "error": str(e)}), 500


@phase2_bp.route('/pbr', methods=['POST'])
def generate_pbr():
    """Generate PBR maps"""
    try:
        data = request.get_json()
        model_path = data.get('modelPath')
        
        # Resolve model path - handle URLs, relative paths, etc.
        if model_path:
            model_path = resolve_model_path(model_path)
        
        result = texturing_service.generate_pbr_maps(model_path)
        
        return jsonify({"ok": True, **result})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@phase2_bp.route('/rig', methods=['POST'])
def apply_rig():
    """Apply auto-rigging to model"""
    try:
        data = request.get_json()
        model_path = data.get('modelPath')
        character_type = data.get('characterType', 'humanoid')
        markers = data.get('markers', [])
        
        if not model_path:
            return jsonify({"ok": False, "error": "Model path required"}), 400
        
        # Resolve model path - handle URLs, relative paths, etc.
        model_path = resolve_model_path(model_path)
        
        # Normalize character type — frontend may send "quadruped-dog", "quadruped-cat", etc.
        if character_type.startswith('quadruped'):
            character_type = 'quadruped'
        
        if character_type not in ['humanoid', 'quadruped']:
            return jsonify({"ok": False, "error": "Invalid character type"}), 400
        
        job_id = str(uuid.uuid4())
        phase2_jobs[job_id] = {"status": "processing", "type": "rig"}
        
        result = rigging_service.auto_rig(model_path, character_type, markers)
        
        if result.get("success"):
            phase2_jobs[job_id]["status"] = "completed"
            return jsonify({"ok": True, "jobId": job_id, **result})
        else:
            phase2_jobs[job_id]["status"] = "failed"
            return jsonify({"ok": False, **result}), 500
            
    except Exception as e:
        traceback.print_exc()
        return jsonify({"ok": False, "error": str(e)}), 500


@phase2_bp.route('/animations', methods=['GET'])
def get_animations():
    """Get available animations"""
    return jsonify({
        "ok": True,
        "animations": animation_service.get_available_animations()
    })


@phase2_bp.route('/animate', methods=['POST'])
def apply_animation():
    """Apply animation to rigged model"""
    try:
        data = request.get_json()
        model_path = data.get('modelPath')
        animation_id = data.get('animationId')
        
        if not model_path or not animation_id:
            return jsonify({"ok": False, "error": "Model path and animation ID required"}), 400
        
        # Resolve model path - handle URLs, relative paths, etc.
        model_path = resolve_model_path(model_path)
        
        job_id = str(uuid.uuid4())
        phase2_jobs[job_id] = {"status": "processing", "type": "animate"}
        
        result = animation_service.apply_animation(model_path, animation_id)
        
        if result.get("success"):
            phase2_jobs[job_id]["status"] = "completed"
            return jsonify({"ok": True, "jobId": job_id, **result})
        else:
            phase2_jobs[job_id]["status"] = "failed"
            return jsonify({"ok": False, **result}), 500
            
    except Exception as e:
        traceback.print_exc()
        return jsonify({"ok": False, "error": str(e)}), 500


@phase2_bp.route('/remesh', methods=['POST'])
def remesh_model():
    """Remesh model with different topology (Quad or Triangle)"""
    try:
        data = request.get_json()
        model_path = data.get('modelPath')
        topology = data.get('topology', 'triangle')
        quality = data.get('quality', 'medium')
        
        if not model_path:
            return jsonify({"ok": False, "error": "Model path required"}), 400
        
        # Resolve model path - handle URLs, relative paths, etc.
        model_path = resolve_model_path(model_path)
        
        if topology not in ['triangle', 'quad']:
            return jsonify({"ok": False, "error": "Invalid topology. Use 'triangle' or 'quad'"}), 400
        
        if quality not in ['low', 'medium', 'high']:
            quality = 'medium'
        
        job_id = str(uuid.uuid4())
        phase2_jobs[job_id] = {"status": "processing", "type": "remesh", "topology": topology}
        
        print(f"\n🔄 Remesh Job: {job_id}")
        print(f"   Model: {model_path}")
        print(f"   Topology: {topology}")
        print(f"   Quality: {quality}")
        
        result = remesh_service.remesh(model_path, topology, quality)
        
        if result.get("success"):
            phase2_jobs[job_id]["status"] = "completed"
            phase2_jobs[job_id]["result"] = result
            return jsonify({"ok": True, "jobId": job_id, **result})
        else:
            phase2_jobs[job_id]["status"] = "failed"
            phase2_jobs[job_id]["error"] = result.get("error")
            return jsonify({"ok": False, **result}), 500
            
    except Exception as e:
        traceback.print_exc()
        return jsonify({"ok": False, "error": str(e)}), 500


@phase2_bp.route('/export', methods=['POST'])
def export_model():
    """Export model to different format with optional rig and animation"""
    try:
        data = request.get_json()
        model_path = data.get('modelPath')
        format = data.get('format', 'glb')
        include_rig = data.get('include_rig', False)
        include_animation = data.get('include_animation')
        include_textures = data.get('include_textures', False)
        
        if not model_path:
            return jsonify({"ok": False, "error": "Model path required"}), 400
        
        # Resolve model path - handle URLs, relative paths, etc.
        model_path = resolve_model_path(model_path)
        
        print(f"\n📦 Export Job:")
        print(f"   Model: {model_path}")
        print(f"   Format: {format}")
        print(f"   Include Rig: {include_rig}")
        print(f"   Include Animation: {include_animation}")
        print(f"   Include Textures: {include_textures}")
        
        result = export_service.export(model_path, format)
        
        # Add export metadata
        result["include_rig"] = include_rig
        result["include_animation"] = include_animation
        result["include_textures"] = include_textures
        
        if result.get("success"):
            return jsonify({"ok": True, **result})
        else:
            return jsonify({"ok": False, **result}), 500
            
    except Exception as e:
        traceback.print_exc()
        return jsonify({"ok": False, "error": str(e)}), 500


@phase2_bp.route('/job/<job_id>', methods=['GET'])
def get_phase2_job(job_id):
    """Get Phase 2 job status"""
    if job_id not in phase2_jobs:
        return jsonify({"ok": False, "error": "Job not found"}), 404
    return jsonify({"ok": True, **phase2_jobs[job_id]})


# ============================================
# Register blueprint in main app
# ============================================
def register_phase2(app):
    """Register Phase 2 blueprint with main Flask app"""
    app.register_blueprint(phase2_bp)
    print("✅ Phase 2 API routes registered")
