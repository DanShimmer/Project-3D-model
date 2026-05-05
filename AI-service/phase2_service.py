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

# Optional: mesh repair and spatial analysis
try:
    import trimesh as _trimesh
    TRIMESH_AVAILABLE = True
except ImportError:
    TRIMESH_AVAILABLE = False

try:
    from scipy.spatial import KDTree as _KDTree
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False

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
    
    # Step 0: Strip query parameters (?t=xxx cache-busting, etc.)
    # The frontend appends ?t=timestamp for browser cache-busting, but
    # these must never be part of the actual filesystem path.
    import re
    model_path = re.split(r'\?', model_path, maxsplit=1)[0]
    
    # Step 1: Strip full URL prefix (http://host:port)
    # Handle both http and https, any host/port
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
    
    hw = (bounds_max[0] - bounds_min[0]) / 2  # half-width (center to arm tip in T-pose)
    hip_half = hw * 0.18
    
    # Joint positions in world space (Y-up)
    # Arms are HORIZONTAL for T-pose models — bones stay near shoulder height
    joints = [
        # (name, parent_idx, [x, y, z])
        ("root",        -1, [cx, base_y + height * 0.0,  cz]),
        ("hips",         0, [cx, base_y + height * 0.45, cz]),
        ("spine",        1, [cx, base_y + height * 0.55, cz]),
        ("spine1",       2, [cx, base_y + height * 0.65, cz]),
        ("spine2",       3, [cx, base_y + height * 0.72, cz]),
        ("neck",         4, [cx, base_y + height * 0.82, cz]),
        ("head",         5, [cx, base_y + height * 0.90, cz]),
        # Left arm — horizontal for T-pose
        ("shoulder_l",   4, [cx - hw * 0.22, base_y + height * 0.78, cz]),
        ("arm_l",        7, [cx - hw * 0.45, base_y + height * 0.77, cz]),
        ("forearm_l",    8, [cx - hw * 0.70, base_y + height * 0.76, cz]),
        ("hand_l",       9, [cx - hw * 0.92, base_y + height * 0.75, cz]),
        # Right arm — horizontal for T-pose
        ("shoulder_r",   4, [cx + hw * 0.22, base_y + height * 0.78, cz]),
        ("arm_r",       11, [cx + hw * 0.45, base_y + height * 0.77, cz]),
        ("forearm_r",   12, [cx + hw * 0.70, base_y + height * 0.76, cz]),
        ("hand_r",      13, [cx + hw * 0.92, base_y + height * 0.75, cz]),
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
    
    FALLBACK method — used only when triangle indices or scipy are unavailable.
    The primary method is _compute_vertex_weights_geodesic() which uses
    geodesic distance on the mesh surface for SMPL-quality results.
    
    Each vertex gets up to 4 bone influences (glTF JOINTS_0 + WEIGHTS_0).
    Returns: (joints_array, weights_array) — both as lists of 4-element lists per vertex.
    """
    num_verts = len(positions) // 3
    num_joints = len(joints)
    
    # Reshape positions to (N, 3)
    P = np.array(positions, dtype=np.float64).reshape(-1, 3)
    
    # Build bone segments: from THIS joint toward its CHILD(ren).
    # CRITICAL FIX: The old code used parent→this, which caused child bones
    # to "steal" their parent's vertices. E.g. shin_l's segment covered the
    # entire upper leg (thigh_l→shin_l), so upper-leg vertices were weighted
    # to shin_l. When shin_l rotated at the knee, the upper leg also bent → TEARING.
    # The fix: each bone's segment goes from THIS joint to its FIRST CHILD,
    # so thigh_l covers thigh_l→shin_l (upper leg) and shin_l covers
    # shin_l→foot_l (lower leg). Each bone owns ITS OWN limb section.
    
    # Build children map
    _children_map = [[] for _ in range(num_joints)]
    for _idx, (_n, _par, _p) in enumerate(joints):
        if _par >= 0:
            _children_map[_par].append(_idx)
    
    seg_a = np.zeros((num_joints, 3), dtype=np.float64)  # segment start (THIS joint)
    seg_b = np.zeros((num_joints, 3), dtype=np.float64)  # segment end (CHILD joint)
    
    for i, (name, parent_idx, pos) in enumerate(joints):
        this_pos = np.array(pos, dtype=np.float64)
        seg_a[i] = this_pos  # always starts at THIS joint
        
        ch = _children_map[i]
        if not ch:
            # Leaf bone (no children): extend in parent→this direction (1.0x bone length)
            if parent_idx >= 0:
                par_pos = np.array(joints[parent_idx][2], dtype=np.float64)
                direction = this_pos - par_pos
                d_len = np.linalg.norm(direction)
                if d_len > 1e-6:
                    seg_b[i] = this_pos + direction * 1.0
                else:
                    seg_b[i] = this_pos + np.array([0, 0.01, 0])
            else:
                seg_b[i] = this_pos + np.array([0, 0.01, 0])
        elif len(ch) == 1:
            # Single child: segment goes to child
            seg_b[i] = np.array(joints[ch[0]][2], dtype=np.float64)
        else:
            # Multiple children: use the child that continues the main chain
            # (the one most aligned with the parent→this direction)
            if parent_idx >= 0:
                par_pos = np.array(joints[parent_idx][2], dtype=np.float64)
                dir_vec = this_pos - par_pos
                d_len = np.linalg.norm(dir_vec)
                dir_norm = dir_vec / d_len if d_len > 1e-8 else np.array([0, 1, 0])
            else:
                dir_norm = np.array([0, 1, 0])  # default: up
            
            best_child = ch[0]
            best_dot = -999.0
            for c in ch:
                child_pos = np.array(joints[c][2], dtype=np.float64)
                to_child = child_pos - this_pos
                tc_len = np.linalg.norm(to_child)
                if tc_len > 1e-8:
                    dot = np.dot(dir_norm, to_child / tc_len)
                    if dot > best_dot:
                        best_dot = dot
                        best_child = c
            seg_b[i] = np.array(joints[best_child][2], dtype=np.float64)
    
    # Compute adaptive sigma from average bone length
    bone_vecs = seg_b - seg_a
    bone_lengths = np.linalg.norm(bone_vecs, axis=1)
    valid_lengths = bone_lengths[bone_lengths > 1e-6]
    avg_bone_len = float(valid_lengths.mean()) if len(valid_lengths) > 0 else 0.1
    sigma = avg_bone_len * 1.0  # Gaussian sigma — tight for decisive bone ownership
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
    
    # Gentle power curve for moderate differentiation (NOT power^5 which causes tearing)
    # SMPL-inspired: keep weights smooth to allow gradual transitions at joints
    raw_weights = raw_weights ** 1.5
    
    # Gentle nearest-bone preference (2x, NOT 25x which creates sharp boundaries)
    nearest_bone = np.argmin(dist_sq, axis=1)  # (N,)
    raw_weights[np.arange(num_verts), nearest_bone] *= 2.0
    
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


def _compute_vertex_weights_geodesic(positions, joints, indices, character_type):
    """
    SMPL-inspired vertex weight computation using geodesic distance on mesh surface.
    
    This replaces the Euclidean distance-based approach that causes mesh tearing.
    
    Key differences from Euclidean:
    1. Geodesic distance follows the mesh surface — prevents weight bleed through
       thin geometry (armpits, crotch, between fingers)
    2. Smooth Gaussian falloff WITHOUT aggressive power-sharpening — no sharp
       weight boundaries that cause tearing
    3. Multi-source Dijkstra on mesh edge graph for efficient computation
    
    This mimics SMPL/SMPL-X skin weights where bone influence follows the body
    surface topology, not straight-line 3D distance.
    """
    from scipy.sparse import coo_matrix
    from scipy.sparse.csgraph import dijkstra as sp_dijkstra
    
    num_verts = len(positions) // 3
    num_joints = len(joints)
    P = np.array(positions, dtype=np.float64).reshape(-1, 3)
    
    print(f"    \U0001f52c SMPL-inspired geodesic weight computation...")
    
    # ── Step 1: Build mesh edge graph ──
    idx_arr = np.array(indices, dtype=np.int32)
    num_tris = len(idx_arr) // 3
    tris = idx_arr.reshape(num_tris, 3)
    
    # Symmetric weighted adjacency matrix (weight = edge length)
    edge_pairs = np.vstack([tris[:, [0, 1]], tris[:, [1, 2]], tris[:, [2, 0]]])
    edge_lens = np.linalg.norm(P[edge_pairs[:, 0]] - P[edge_pairs[:, 1]], axis=1)
    
    rows = np.concatenate([edge_pairs[:, 0], edge_pairs[:, 1]])
    cols = np.concatenate([edge_pairs[:, 1], edge_pairs[:, 0]])
    vals = np.concatenate([edge_lens, edge_lens])
    
    # Add co-located vertex bridge edges (cross UV seams)
    # GLB meshes have split vertices at UV seams with identical positions but
    # different indices. Without bridges, geodesic distance can't cross seams.
    BRIDGE_DECIMALS = 4
    _coloc = {}
    for vi in range(num_verts):
        key = (round(float(P[vi, 0]), BRIDGE_DECIMALS),
               round(float(P[vi, 1]), BRIDGE_DECIMALS),
               round(float(P[vi, 2]), BRIDGE_DECIMALS))
        if key not in _coloc:
            _coloc[key] = []
        _coloc[key].append(vi)
    
    bridge_rows, bridge_cols, bridge_vals = [], [], []
    for _grp in _coloc.values():
        if len(_grp) <= 1:
            continue
        for _a in _grp:
            for _b in _grp:
                if _a != _b:
                    bridge_rows.append(_a)
                    bridge_cols.append(_b)
                    bridge_vals.append(1e-6)  # near-zero weight = same position
    
    if bridge_rows:
        rows = np.concatenate([rows, np.array(bridge_rows, dtype=rows.dtype)])
        cols = np.concatenate([cols, np.array(bridge_cols, dtype=cols.dtype)])
        vals = np.concatenate([vals, np.array(bridge_vals, dtype=vals.dtype)])
        print(f"    \U0001f309 Added {len(bridge_rows)} UV seam bridge edges")
    
    graph = coo_matrix((vals, (rows, cols)), shape=(num_verts, num_verts)).tocsr()
    print(f"    \U0001f4ca Mesh graph: {num_verts} verts, {len(edge_pairs)} face edges")
    
    # ── Step 2: Build bone segments (this→child) ──
    _children_map = [[] for _ in range(num_joints)]
    for _idx, (_n, _par, _p) in enumerate(joints):
        if _par >= 0:
            _children_map[_par].append(_idx)
    
    seg_a = np.zeros((num_joints, 3), dtype=np.float64)
    seg_b = np.zeros((num_joints, 3), dtype=np.float64)
    
    for i, (name, parent_idx, pos) in enumerate(joints):
        this_pos = np.array(pos, dtype=np.float64)
        seg_a[i] = this_pos
        
        ch = _children_map[i]
        if not ch:
            if parent_idx >= 0:
                par_pos = np.array(joints[parent_idx][2], dtype=np.float64)
                direction = this_pos - par_pos
                d_len = np.linalg.norm(direction)
                if d_len > 1e-6:
                    seg_b[i] = this_pos + direction * 1.0
                else:
                    seg_b[i] = this_pos + np.array([0, 0.01, 0])
            else:
                seg_b[i] = this_pos + np.array([0, 0.01, 0])
        elif len(ch) == 1:
            seg_b[i] = np.array(joints[ch[0]][2], dtype=np.float64)
        else:
            if parent_idx >= 0:
                par_pos = np.array(joints[parent_idx][2], dtype=np.float64)
                dir_vec = this_pos - par_pos
                d_len = np.linalg.norm(dir_vec)
                dir_norm = dir_vec / d_len if d_len > 1e-8 else np.array([0, 1, 0])
            else:
                dir_norm = np.array([0, 1, 0])
            best_child = ch[0]
            best_dot = -999.0
            for c in ch:
                child_pos = np.array(joints[c][2], dtype=np.float64)
                to_child = child_pos - this_pos
                tc_len = np.linalg.norm(to_child)
                if tc_len > 1e-8:
                    dot = np.dot(dir_norm, to_child / tc_len)
                    if dot > best_dot:
                        best_dot = dot
                        best_child = c
            seg_b[i] = np.array(joints[best_child][2], dtype=np.float64)
    
    # ── Step 3: Euclidean point-to-segment distance (for seed selection) ──
    Pv = P[:, np.newaxis, :]       # (N, 1, 3)
    A = seg_a[np.newaxis, :, :]    # (1, J, 3)
    B = seg_b[np.newaxis, :, :]    # (1, J, 3)
    AB = B - A
    AP = Pv - A
    ab_sq = np.sum(AB * AB, axis=2)
    ab_sq_safe = np.maximum(ab_sq, 1e-12)
    ap_dot_ab = np.sum(AP * AB, axis=2)
    t = np.clip(ap_dot_ab / ab_sq_safe, 0.0, 1.0)
    closest_pt = A + t[:, :, np.newaxis] * AB
    diff = Pv - closest_pt
    euc_dist_sq = np.sum(diff * diff, axis=2)  # (N, J)
    
    # ── Step 4: Multi-seed Dijkstra for geodesic distances ──
    # Use multiple seeds per bone (closest K vertices to bone segment)
    # to ensure coverage on both sides of thin geometry.
    euc_dists = np.sqrt(euc_dist_sq)  # (N, J)
    bone_lengths = np.linalg.norm(seg_b - seg_a, axis=1)
    valid_lengths = bone_lengths[bone_lengths > 1e-6]
    avg_bone_len = float(valid_lengths.mean()) if len(valid_lengths) > 0 else 0.1
    
    SEEDS_PER_BONE = 8
    all_seeds = []
    seed_bone_map = []  # which bone each seed belongs to
    
    for bone_idx in range(num_joints):
        bone_euc = euc_dists[:, bone_idx]  # (N,)
        k = min(SEEDS_PER_BONE, num_verts)
        closest_k = np.argpartition(bone_euc, k)[:k]
        for v in closest_k:
            all_seeds.append(int(v))
            seed_bone_map.append(bone_idx)
    
    # Deduplicate seeds for efficiency
    unique_seeds = list(set(all_seeds))
    seed_idx_lookup = {v: i for i, v in enumerate(unique_seeds)}
    
    print(f"    \U0001f4ca Running Dijkstra from {len(unique_seeds)} unique seeds ({SEEDS_PER_BONE}/bone)...")
    
    geo_from_seeds = sp_dijkstra(graph, directed=False, indices=unique_seeds)
    # Shape: (len(unique_seeds), N)
    
    # For each bone, take minimum geodesic distance across its seeds
    geo_dists = np.full((num_joints, num_verts), np.inf, dtype=np.float64)
    for seed_pos_in_list, (seed_v, bone_idx) in enumerate(zip(all_seeds, seed_bone_map)):
        row_idx = seed_idx_lookup[seed_v]
        np.minimum(geo_dists[bone_idx], geo_from_seeds[row_idx], out=geo_dists[bone_idx])
    
    # Handle unreachable vertices (disconnected components)
    finite_mask = np.isfinite(geo_dists)
    if not finite_mask.all():
        max_finite = np.max(geo_dists[finite_mask]) if finite_mask.any() else 1.0
        geo_dists = np.where(finite_mask, geo_dists, max_finite * 10)
        unreachable = (~finite_mask).sum()
        print(f"    \u26a0\ufe0f {unreachable} unreachable vertex-bone pairs clamped")
    
    # ── Step 5: Smooth Gaussian on geodesic distance ──
    # SMPL-like sigma: wide Gaussian for very smooth weight transitions at joints
    sigma = avg_bone_len * 1.5
    sigma_sq_2 = 2.0 * sigma * sigma
    
    print(f"    \U0001f4ca Avg bone length: {avg_bone_len:.4f}, geodesic sigma: {sigma:.4f}")
    
    # Gaussian weights from geodesic distances (N, J)
    geo_dists_T = geo_dists.T  # (N, J)
    raw_weights = np.exp(-geo_dists_T**2 / sigma_sq_2)
    
    # Gentle nearest-bone preference (2x, NOT the old 25x)
    nearest_bone = np.argmin(geo_dists_T, axis=1)
    raw_weights[np.arange(num_verts), nearest_bone] *= 2.0
    
    # NO power^5 sharpening — SMPL uses smooth weight fields
    
    # ── Step 6: Pick top 4, normalize ──
    if num_joints <= 4:
        top4_idx = np.tile(np.arange(num_joints), (num_verts, 1))
        top4_w = raw_weights
    else:
        top4_idx = np.argpartition(-raw_weights, 4, axis=1)[:, :4]
        top4_w = np.take_along_axis(raw_weights, top4_idx, axis=1)
    
    w_sum = top4_w.sum(axis=1, keepdims=True)
    w_sum = np.maximum(w_sum, 1e-10)
    top4_w = top4_w / w_sum
    
    # Diagnostics
    dominant_w = np.max(top4_w, axis=1)
    print(f"    \U0001f4ca Geodesic weights: mean_dominant={dominant_w.mean():.3f}, "
          f"min={dominant_w.min():.3f}, max={dominant_w.max():.3f}")
    
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


def _smooth_vertex_weights(all_joints, all_weights, indices, num_verts, num_joints,
                           positions=None, iterations=2, strength=0.5):
    """
    Smooth skinning weights using mesh face-connectivity + UV seam bridging.
    
    CRITICAL FIX: GLB meshes have split vertices at UV seams — same position,
    different vertex index. Standard face-based Laplacian can't cross these seams,
    causing weight divergence → visible tear during animation.
    
    Fix: detect co-located vertices and add synthetic bridge edges so the
    smoothing graph is fully connected across seams.
    
    Uses sparse matrix multiplication for fast vectorized smoothing.
    
    Args:
        all_joints: list of [j0,j1,j2,j3] per vertex
        all_weights: list of [w0,w1,w2,w3] per vertex
        indices: flat triangle index list
        num_verts: total vertex count
        num_joints: total joint count
        positions: flat [x,y,z,...] position list (needed for co-located detection)
        iterations: smoothing passes (more = smoother)
        strength: blend factor (0=no smooth, 1=full neighbor average)
    
    Returns: (smoothed_joints, smoothed_weights) in same format
    """
    if indices is None or len(indices) < 3:
        return all_joints, all_weights
    
    from scipy.sparse import coo_matrix as _coo, diags as _diags
    
    # Build dense weight matrix (N, J) from sparse top-4 representation (vectorized)
    J_arr = np.array(all_joints, dtype=np.int32)    # (N, 4)
    W_arr = np.array(all_weights, dtype=np.float64)  # (N, 4)
    W = np.zeros((num_verts, num_joints), dtype=np.float64)
    vi_idx = np.arange(num_verts)[:, None].repeat(4, axis=1)  # (N, 4)
    np.add.at(W, (vi_idx.ravel(), J_arr.ravel()), W_arr.ravel())
    
    # Build adjacency from face indices
    idx_arr = np.array(indices, dtype=np.int32)
    num_tris = len(idx_arr) // 3
    tris = idx_arr.reshape(num_tris, 3)
    
    edge_pairs = np.vstack([
        tris[:, [0, 1]], tris[:, [1, 0]],
        tris[:, [1, 2]], tris[:, [2, 1]],
        tris[:, [0, 2]], tris[:, [2, 0]],
    ])  # (6*num_tris, 2)
    
    rows = edge_pairs[:, 0].astype(np.int32)
    cols = edge_pairs[:, 1].astype(np.int32)
    
    # ── Add co-located vertex bridge edges (cross UV seams) ──
    bridge_count = 0
    if positions is not None:
        BRIDGE_DEC = 4
        _coloc_groups = {}
        for vi in range(num_verts):
            key = (round(positions[vi * 3], BRIDGE_DEC),
                   round(positions[vi * 3 + 1], BRIDGE_DEC),
                   round(positions[vi * 3 + 2], BRIDGE_DEC))
            if key not in _coloc_groups:
                _coloc_groups[key] = []
            _coloc_groups[key].append(vi)
        
        br_rows, br_cols = [], []
        for _grp in _coloc_groups.values():
            if len(_grp) <= 1:
                continue
            for _a in _grp:
                for _b in _grp:
                    if _a != _b:
                        br_rows.append(_a)
                        br_cols.append(_b)
        
        if br_rows:
            rows = np.concatenate([rows, np.array(br_rows, dtype=np.int32)])
            cols = np.concatenate([cols, np.array(br_cols, dtype=np.int32)])
            bridge_count = len(br_rows)
    
    # Build sparse adjacency matrix (binary: 1 = connected)
    ones = np.ones(len(rows), dtype=np.float64)
    A = _coo((ones, (rows, cols)), shape=(num_verts, num_verts)).tocsr()
    
    # Compute degree and normalized smoothing matrix: S = D^{-1} * A
    degrees = np.array(A.sum(axis=1)).flatten()
    degrees[degrees < 1e-10] = 1.0
    D_inv = _diags(1.0 / degrees)
    S = D_inv @ A  # row-normalized adjacency
    
    # Vectorized Laplacian smoothing: W_new = (1-s)*W + s*(S @ W)
    for _it in range(iterations):
        W_avg = S @ W  # (N, J) — average of neighbor weights
        W = (1.0 - strength) * W + strength * W_avg
    
    # Convert back to top-4 sparse format (fully vectorized)
    if num_joints > 4:
        top4_idx = np.argpartition(-W, 4, axis=1)[:, :4]  # (N, 4)
    else:
        top4_idx = np.tile(np.arange(num_joints), (num_verts, 1))
    top4_w = np.take_along_axis(W, top4_idx, axis=1)  # (N, 4)
    totals = top4_w.sum(axis=1, keepdims=True)
    totals[totals < 1e-10] = 1.0
    top4_w /= totals
    new_joints = top4_idx.astype(int).tolist()
    new_weights = top4_w.tolist()
    
    print(f"    🔄 Laplacian smoothing: {iterations} iters, strength={strength}, "
          f"{bridge_count} UV seam bridges")
    return new_joints, new_weights


def _weld_vertex_weights(positions, all_joints, all_weights, num_joints):
    """
    Ensure vertices at the same spatial position get IDENTICAL weights.
    
    GLB meshes have split vertices at UV seams/hard edges — same position,
    different index. Even after smoothing with UV bridges, tiny floating-point
    differences can remain. During animation these cause visible seam tears.
    
    Fix: group by position (4-decimal grid ≈ 0.1mm), force bitwise-identical
    weights for all vertices in each group.
    """
    num_verts = len(positions) // 3
    
    # 4 decimal places — coarser grid catches more co-located vertices
    DECIMALS = 4
    groups = {}
    for vi in range(num_verts):
        key = (
            round(positions[vi * 3], DECIMALS),
            round(positions[vi * 3 + 1], DECIMALS),
            round(positions[vi * 3 + 2], DECIMALS),
        )
        if key not in groups:
            groups[key] = []
        groups[key].append(vi)
    
    welded_count = 0
    dup_groups = 0
    for key, verts in groups.items():
        if len(verts) <= 1:
            continue
        dup_groups += 1
        
        # Build dense weight vector — average across all co-located vertices
        avg_w = np.zeros(num_joints, dtype=np.float64)
        for vi in verts:
            for k in range(4):
                avg_w[all_joints[vi][k]] += all_weights[vi][k]
        avg_w /= len(verts)
        
        # Extract top-4 and normalize
        if num_joints <= 4:
            top4 = np.arange(num_joints)
        else:
            top4 = np.argpartition(-avg_w, 4)[:4]
        w4 = avg_w[top4]
        total = w4.sum()
        if total < 1e-10:
            total = 1.0
        w4 = w4 / total
        
        # Force bitwise-identical weights to ALL co-located vertices
        top4_list = top4.astype(int).tolist()
        w4_list = w4.tolist()
        for vi in verts:
            all_joints[vi] = top4_list[:]
            all_weights[vi] = w4_list[:]
        welded_count += len(verts)
    
    print(f"    🔗 Vertex welding: {dup_groups} dup groups, {welded_count} verts unified")
    return all_joints, all_weights


def _cleanup_tiny_weights(all_joints, all_weights, num_verts, min_weight=0.02):
    """
    Clamp tiny bone weights to zero and redistribute.
    
    Very small weights (< 2%) create "weight fighting" where many bones
    each contribute a tiny amount → unpredictable motion → micro-tearing.
    Better to have 2-3 clean influences than 4 noisy ones.
    """
    cleaned = 0
    for vi in range(num_verts):
        w = all_weights[vi]
        any_tiny = False
        for k in range(4):
            if 0 < w[k] < min_weight:
                w[k] = 0.0
                any_tiny = True
                cleaned += 1
        if any_tiny:
            total = sum(w)
            if total > 1e-10:
                all_weights[vi] = [x / total for x in w]
            else:
                # Fallback: give full weight to first bone
                all_weights[vi] = [1.0, 0.0, 0.0, 0.0]
    
    print(f"    🧹 Weight cleanup: {cleaned} tiny weights (<{min_weight}) zeroed")
    return all_joints, all_weights


def _enforce_weight_gradient(all_joints, all_weights, indices, positions,
                             num_verts, num_joints, max_delta=0.3, iterations=5):
    """
    Enforce smooth weight gradients between adjacent vertices.
    
    Detects edges where the weight vectors change too drastically (>max_delta)
    and iteratively blends them toward each other. This eliminates the
    "weight cliff" that causes mesh tears at joint boundaries.
    
    Unlike uniform Laplacian smoothing, this ONLY affects vertices at
    problematic boundaries — preserves clean weights in smooth regions.
    """
    if indices is None or len(indices) < 3:
        return all_joints, all_weights
    
    # Build dense weight matrix
    W = np.zeros((num_verts, num_joints), dtype=np.float64)
    for vi in range(num_verts):
        for k in range(4):
            W[vi, all_joints[vi][k]] += all_weights[vi][k]
    
    # Build edge list from triangles
    idx_arr = np.array(indices, dtype=np.int32)
    num_tris = len(idx_arr) // 3
    tris = idx_arr.reshape(num_tris, 3)
    edges = set()
    for tri in tris:
        for a, b in [(tri[0], tri[1]), (tri[1], tri[2]), (tri[0], tri[2])]:
            edges.add((min(a, b), max(a, b)))
    edges = list(edges)
    e0 = np.array([e[0] for e in edges], dtype=np.int32)
    e1 = np.array([e[1] for e in edges], dtype=np.int32)
    
    # Also add co-located vertex pairs
    if positions is not None:
        BRIDGE_DEC = 4
        _coloc = {}
        for vi in range(num_verts):
            key = (round(positions[vi * 3], BRIDGE_DEC),
                   round(positions[vi * 3 + 1], BRIDGE_DEC),
                   round(positions[vi * 3 + 2], BRIDGE_DEC))
            if key not in _coloc:
                _coloc[key] = []
            _coloc[key].append(vi)
        for grp in _coloc.values():
            if len(grp) > 1:
                for ia in range(len(grp)):
                    for ib in range(ia + 1, len(grp)):
                        edges.append((grp[ia], grp[ib]))
        e0 = np.array([e[0] for e in edges], dtype=np.int32)
        e1 = np.array([e[1] for e in edges], dtype=np.int32)
    
    total_fixed = 0
    for _it in range(iterations):
        # Compute weight difference for each edge
        diffs = np.abs(W[e0] - W[e1]).max(axis=1)  # max per-bone diff per edge
        bad_mask = diffs > max_delta
        n_bad = bad_mask.sum()
        if n_bad == 0:
            break
        
        # For bad edges, blend endpoints toward each other
        bad_e0 = e0[bad_mask]
        bad_e1 = e1[bad_mask]
        blend = 0.3  # conservative blend factor
        
        W_new = W.copy()
        for i in range(len(bad_e0)):
            a, b = bad_e0[i], bad_e1[i]
            avg = (W[a] + W[b]) * 0.5
            W_new[a] = (1.0 - blend) * W[a] + blend * avg
            W_new[b] = (1.0 - blend) * W[b] + blend * avg
        W = W_new
        total_fixed += n_bad
    
    # Normalize rows
    row_sums = W.sum(axis=1, keepdims=True)
    row_sums = np.maximum(row_sums, 1e-10)
    W = W / row_sums
    
    # Convert back to top-4
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
    
    print(f"    📐 Gradient enforcement: {iterations} iters, max_delta={max_delta}, "
          f"{total_fixed} edge fixes")
    return new_joints, new_weights


def _build_unique_position_map(positions):
    """
    Build a de-duplicated position set and mapping from original → unique indices.
    
    This is THE definitive fix for UV seam tearing. GLB meshes have split vertices
    at UV seams / hard edges — same 3D position, different vertex index. Previous
    approaches tried to fix this with UV bridges, welding, gradient enforcement,
    but they're all heuristic band-aids that can miss edge cases.
    
    The unique position map approach is MATHEMATICALLY GUARANTEED:
    1. De-duplicate: collapse all co-located vertices into unique positions
    2. Compute all weights on UNIQUE positions only (no duplicates exist)
    3. Map weights back: each original vertex gets weights from its unique position
    
    Since co-located vertices share the SAME unique position index, they get
    BITWISE-IDENTICAL weights. It is literally impossible for them to have
    different weights → zero UV seam tearing, provably.
    
    Returns:
        unique_positions: flat [x,y,z,...] list of unique positions
        vert_to_unique: list mapping original vertex index → unique index
        num_unique: number of unique positions
    """
    num_verts = len(positions) // 3
    DECIMALS = 4  # ~0.1mm precision — catches all co-located vertices
    
    pos_to_unique = {}
    unique_positions = []
    vert_to_unique = [0] * num_verts
    unique_idx = 0
    
    for vi in range(num_verts):
        x = positions[vi * 3]
        y = positions[vi * 3 + 1]
        z = positions[vi * 3 + 2]
        key = (round(x, DECIMALS), round(y, DECIMALS), round(z, DECIMALS))
        
        if key not in pos_to_unique:
            pos_to_unique[key] = unique_idx
            unique_positions.extend([x, y, z])
            unique_idx += 1
        
        vert_to_unique[vi] = pos_to_unique[key]
    
    dup_count = num_verts - unique_idx
    print(f"    🗺️ Unique position map: {num_verts} → {unique_idx} "
          f"({dup_count} UV seam duplicates collapsed)")
    
    return unique_positions, vert_to_unique, unique_idx


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


def _manifold_repair_mesh(input_path: str) -> str:
    """
    Repair a GLB mesh to be watertight and manifold using Voxelization + Marching Cubes.
    
    AI-generated 3D models often have non-manifold edges, holes, and self-intersections
    that cause mesh tearing during skeletal animation. This step creates a guaranteed
    clean mesh by converting to voxels and extracting a new surface.
    
    Returns the path to the repaired GLB file (or original if already clean).
    """
    if not TRIMESH_AVAILABLE:
        print("  ⚠️ Manifold repair skipped (trimesh not installed)")
        return input_path
    
    print(f"  🔧 === Manifold Repair (Voxelization + Marching Cubes) ===")
    
    try:
        loaded = _trimesh.load(input_path, force='mesh')
        if loaded is None or not hasattr(loaded, 'vertices') or len(loaded.vertices) == 0:
            print("  ⚠️ Could not load mesh for repair")
            return input_path
        
        n_orig = len(loaded.vertices)
        is_wt = loaded.is_watertight
        try:
            is_vol = loaded.is_volume
        except Exception:
            is_vol = False
        
        print(f"    📊 Original: {n_orig} verts, {len(loaded.faces)} faces")
        print(f"    📊 Watertight: {is_wt}, Manifold volume: {is_vol}")
        
        # ALWAYS voxel-remesh — even watertight meshes have non-uniform topology
        # (long thin triangles, UV seam vertex splits, varying density at joints)
        # that causes animation tearing. Voxel + marching cubes creates clean,
        # uniform isotropic triangle mesh ideal for rigging.
        if is_wt and is_vol:
            print("    ℹ️ Mesh is manifold — remeshing anyway for uniform rigging topology")
        
        # Save original vertex data for color transfer
        orig_verts = loaded.vertices.copy()
        has_colors = False
        orig_colors = None
        try:
            if (hasattr(loaded.visual, 'vertex_colors') and
                loaded.visual.vertex_colors is not None and
                len(loaded.visual.vertex_colors) == n_orig):
                has_colors = True
                orig_colors = loaded.visual.vertex_colors.copy()
        except Exception:
            pass
        
        # Voxelize at higher resolution for better detail at joints
        resolution = 192
        pitch = loaded.extents.max() / resolution
        print(f"    🔲 Voxelizing (resolution={resolution}, pitch={pitch:.5f})...")
        voxel_grid = loaded.voxelized(pitch)
        filled = voxel_grid.fill()
        
        # Marching cubes surface extraction
        print(f"    🧊 Extracting surface with marching cubes...")
        repaired = filled.marching_cubes
        n_new = len(repaired.vertices)
        print(f"    📊 Repaired: {n_new} verts, {len(repaired.faces)} faces")
        print(f"    📊 Watertight: {repaired.is_watertight}")
        
        # Transfer vertex colors via nearest-vertex mapping
        if has_colors and orig_colors is not None and SCIPY_AVAILABLE:
            try:
                tree = _KDTree(orig_verts)
                _, nearest = tree.query(repaired.vertices)
                repaired.visual.vertex_colors = orig_colors[nearest]
                print(f"    🎨 Vertex colors transferred")
            except Exception as e:
                print(f"    ⚠️ Color transfer failed: {e}")
        
        repaired_path = input_path.replace('.glb', '_manifold.glb')
        repaired.export(repaired_path, file_type='glb')
        fsize = os.path.getsize(repaired_path) / 1024
        print(f"    ✅ Repaired mesh saved: {repaired_path} ({fsize:.1f} KB)")
        return repaired_path
    
    except Exception as e:
        print(f"  ⚠️ Manifold repair error: {e}")
        traceback.print_exc()
        return input_path


def _refine_bone_positions(joints, positions):
    """
    Refine bone positions to be at the volumetric center of each limb.
    
    Bounding-box-based bone placement may put bones on the surface or outside
    the mesh for non-standard models. This function finds nearby vertices for
    each bone and shifts the bone toward their centroid.
    """
    P = np.array(positions, dtype=np.float64).reshape(-1, 3)
    if len(P) < 10:
        return joints
    
    tree = None
    if SCIPY_AVAILABLE:
        tree = _KDTree(P)
    
    print(f"    📍 Refining bone positions using mesh vertex cloud...")
    refined = []
    
    for i, (name, parent_idx, pos) in enumerate(joints):
        if name == "root":
            refined.append((name, parent_idx, pos[:]))
            continue
        
        bone_pos = np.array(pos, dtype=np.float64)
        
        # Adaptive search radius based on bone length to parent
        if parent_idx >= 0:
            par_pos = np.array(joints[parent_idx][2], dtype=np.float64)
            bone_len = np.linalg.norm(bone_pos - par_pos)
            radius = max(bone_len * 0.5, 0.005)
        else:
            radius = 0.02
        
        if tree is not None:
            nearby_idx = tree.query_ball_point(bone_pos, radius)
            nearby = P[nearby_idx] if len(nearby_idx) > 0 else np.empty((0, 3))
        else:
            dists = np.linalg.norm(P - bone_pos, axis=1)
            nearby = P[dists < radius]
        
        if len(nearby) >= 5:
            centroid = nearby.mean(axis=0)
            blend = 0.35  # conservative: 35% toward mesh center
            new_pos = (bone_pos * (1 - blend) + centroid * blend).tolist()
            shift = np.linalg.norm(np.array(new_pos) - bone_pos)
            if shift > 0.0005:
                print(f"      {name}: shifted {shift:.4f} inward ({len(nearby)} verts)")
            refined.append((name, parent_idx, new_pos))
        else:
            refined.append((name, parent_idx, pos[:]))
    
    return refined


def _spatial_smooth_weights(all_joints, all_weights, positions, num_verts, num_joints,
                            iterations=3, strength=0.25, k_neighbors=12):
    """
    Smooth skinning weights using spatial KD-tree neighborhood.
    
    Unlike face-based Laplacian smoothing, this works even for non-manifold meshes
    because it uses spatial proximity rather than mesh connectivity.
    Vectorized with numpy einsum for performance on 50K+ vertex meshes.
    """
    if not SCIPY_AVAILABLE:
        print("    ⚠️ Spatial smoothing skipped (scipy not installed)")
        return all_joints, all_weights
    
    P = np.array(positions, dtype=np.float64).reshape(-1, 3)
    tree = _KDTree(P)
    
    k_actual = min(k_neighbors + 1, num_verts)
    dists, idx = tree.query(P, k=k_actual)
    
    # Build dense weight matrix (N, J) — vectorized
    J_arr = np.array(all_joints, dtype=np.int32)    # (N, 4)
    W_arr = np.array(all_weights, dtype=np.float64)  # (N, 4)
    W = np.zeros((num_verts, num_joints), dtype=np.float64)
    vi_idx = np.arange(num_verts)[:, None].repeat(4, axis=1)
    np.add.at(W, (vi_idx.ravel(), J_arr.ravel()), W_arr.ravel())
    
    # Neighbor data (skip self at index 0)
    n_idx = idx[:, 1:]       # (N, k)
    n_dists = dists[:, 1:]   # (N, k)
    
    # Inverse-distance weights (closer neighbors have more influence)
    inv_d = 1.0 / (n_dists + 1e-8)
    inv_d_sum = inv_d.sum(axis=1, keepdims=True)
    inv_d_norm = inv_d / inv_d_sum   # (N, k) normalized
    
    for _iter in range(iterations):
        W_nbr = W[n_idx]      # (N, k, J)
        W_avg = np.einsum('nk,nkj->nj', inv_d_norm, W_nbr)  # (N, J)
        W = (1.0 - strength) * W + strength * W_avg
    
    # Convert back to top-4 sparse format (fully vectorized)
    if num_joints > 4:
        top4_idx = np.argpartition(-W, 4, axis=1)[:, :4]
    else:
        top4_idx = np.tile(np.arange(num_joints), (num_verts, 1))
    top4_w = np.take_along_axis(W, top4_idx, axis=1)
    totals = top4_w.sum(axis=1, keepdims=True)
    totals[totals < 1e-10] = 1.0
    top4_w /= totals
    new_joints = top4_idx.astype(int).tolist()
    new_weights = top4_w.tolist()
    
    print(f"    🔄 Spatial smoothing: {iterations} iterations, strength={strength}, k={k_neighbors}")
    return new_joints, new_weights


def rig_model_glb(input_path: str, output_path: str, character_type: str, markers=None):
    """
    Add a skeleton (skin) to a GLB model.
    Processes ALL meshes and ALL primitives with ZERO-TEAR guarantee.
    
    Pipeline (SMPL-inspired, zero-tear via unique position map):
    1.  Read original mesh (NO voxel remesh — preserves original quality)
    2.  Compute skeleton joint positions (SMPL-like 23 joints)
    3.  Read triangle indices
    4.  Build UNIQUE POSITION MAP → collapse UV seam split vertices
    5.  Refine bone positions using unique positions
    6.  Remap triangle indices to unique vertex space
    7.  Compute geodesic weights on unique positions (Dijkstra, sigma=1.5×)
    8.  Laplacian smoothing on unique mesh (8 iterations, 0.38 strength)
    9.  Spatial KD-tree smoothing on unique mesh (4 iterations, 0.28 strength, k=20)
    10. Weight cleanup: clamp tiny weights (<2%) to zero
    11. Map weights back to ALL original vertices via unique index
        → ZERO-TEAR GUARANTEE: co-located vertices share the SAME unique index
        → bitwise-identical weights, mathematically impossible to tear
    12. Write skinning data to GLB
    """
    print(f"  🦴 Rigging model: {input_path}")
    print(f"  📐 Character type: {character_type}")
    
    # Read original GLB directly — NO voxel remesh.
    # Voxel remesh (marching cubes) destroys original mesh quality with
    # stair-step/blocky artifacts. The unique position map approach handles
    # UV seam tearing without modifying mesh geometry at all.
    gltf, bin_data = _read_glb(input_path)
    
    # ── Collect ALL primitives and their vertex data ──
    primitives_info = []
    all_positions = []
    
    for mesh_idx, mesh in enumerate(gltf.get("meshes", [])):
        for prim_idx, prim in enumerate(mesh.get("primitives", [])):
            attrs = prim.get("attributes", {})
            if "POSITION" not in attrs:
                continue
            pos_acc = gltf["accessors"][attrs["POSITION"]]
            pos_bv = gltf["bufferViews"][pos_acc["bufferView"]]
            pos_off = pos_bv.get("byteOffset", 0) + pos_acc.get("byteOffset", 0)
            pos_cnt = pos_acc["count"]
            pos_stride = pos_bv.get("byteStride", 12)
            
            positions = []
            for i in range(pos_cnt):
                off = pos_off + i * pos_stride
                x, y, z = struct.unpack_from('<fff', bin_data, off)
                positions.extend([x, y, z])
            
            all_positions.extend(positions)
            primitives_info.append({"prim": prim, "pos_count": pos_cnt})
    
    total_verts = len(all_positions) // 3
    if total_verts == 0:
        return {"success": False, "error": "No vertices found in model"}
    
    print(f"  📦 Found {len(primitives_info)} primitive(s), {total_verts} total vertices")
    
    # ── Compute bounding box from ALL vertices ──
    xs = all_positions[0::3]
    ys = all_positions[1::3]
    zs = all_positions[2::3]
    bounds_min = [min(xs), min(ys), min(zs)]
    bounds_max = [max(xs), max(ys), max(zs)]
    
    print(f"  📏 Mesh bounds: min={[round(v,3) for v in bounds_min]} max={[round(v,3) for v in bounds_max]}")
    
    # ── Compute joint positions ──
    if character_type == "quadruped":
        joints = _compute_quadruped_joints(bounds_min, bounds_max)
    else:
        joints = _compute_humanoid_joints(bounds_min, bounds_max)
    
    num_joints = len(joints)
    bone_names = [j[0] for j in joints]
    print(f"  🦴 Created {num_joints} bones: {bone_names[:8]}...")
    
    # ── Gather ALL triangle indices (needed for geodesic weights + smoothing) ──
    all_indices = []
    vert_offset = 0
    for info in primitives_info:
        prim_indices = _read_mesh_indices(gltf, bin_data, info["prim"])
        if prim_indices:
            all_indices.extend([idx + vert_offset for idx in prim_indices])
        vert_offset += info["pos_count"]
    
    # ══════════════════════════════════════════════════════════════════
    # UNIQUE POSITION MAP — the definitive fix for UV seam tearing
    # ══════════════════════════════════════════════════════════════════
    # GLB meshes have split vertices at UV seams (same position, different index).
    # Previous approach: UV bridges + welding + gradient enforcement = heuristic,
    # always missed some edge cases → still tearing at small points.
    # 
    # New approach: de-duplicate ALL vertices by position. Compute weights on
    # the unique set only. Map back. Co-located vertices share the SAME unique
    # index → they get BITWISE-IDENTICAL weights → ZERO tearing, provably.
    # ══════════════════════════════════════════════════════════════════
    
    unique_pos, vert_to_unique, num_unique = _build_unique_position_map(all_positions)
    
    # ── Remap triangle indices to unique vertex space ──
    unique_indices = [vert_to_unique[i] for i in all_indices] if all_indices else []
    
    # ── Refine bone positions using unique positions (no duplicate bias) ──
    joints = _refine_bone_positions(joints, unique_pos)
    bone_names = [j[0] for j in joints]  # refresh after refinement
    
    # ── Compute vertex weights on UNIQUE positions (no UV seam splits exist) ──
    if unique_indices and SCIPY_AVAILABLE:
        print(f"  🔗 SMPL geodesic weights on {num_unique} unique verts "
              f"({len(unique_indices)} triangle indices)")
        u_ji, u_jw = _compute_vertex_weights_geodesic(
            unique_pos, joints, unique_indices, character_type
        )
    else:
        print(f"  ⚠️ Using Euclidean fallback on {num_unique} unique positions")
        u_ji, u_jw = _compute_vertex_weights(unique_pos, joints, character_type)
    
    # ── Laplacian smoothing on unique mesh (no UV seam issues → moderate params) ──
    if unique_indices and SCIPY_AVAILABLE:
        u_ji, u_jw = _smooth_vertex_weights(
            u_ji, u_jw, unique_indices,
            num_unique, num_joints,
            iterations=8, strength=0.38
        )
    
    # ── Spatial KD-tree smoothing on unique mesh ──
    u_ji, u_jw = _spatial_smooth_weights(
        u_ji, u_jw, unique_pos,
        num_unique, num_joints, iterations=4, strength=0.28, k_neighbors=20
    )
    
    # ── Cleanup tiny weights (<2%) on unique mesh ──
    u_ji, u_jw = _cleanup_tiny_weights(u_ji, u_jw, num_unique, min_weight=0.02)
    
    # ── Map weights back to ALL original vertices ──
    # ZERO-TEAR GUARANTEE: co-located vertices share the SAME unique index
    # → they get BITWISE-IDENTICAL weights → impossible to tear at UV seams
    joint_indices = []
    joint_weights = []
    for vi in range(total_verts):
        uid = vert_to_unique[vi]
        joint_indices.append(u_ji[uid][:])
        joint_weights.append(u_jw[uid][:])
    
    dup_count = total_verts - num_unique
    print(f"  ✅ Weight transfer: {num_unique} unique → {total_verts} total "
          f"({dup_count} duplicates get identical weights, 0 possible tears)")
    
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
    
    # ── Write JOINTS_0 + WEIGHTS_0 for EACH primitive ──
    vert_offset = 0
    for info in primitives_info:
        cnt = info["pos_count"]
        prim = info["prim"]
        prim_ji = joint_indices[vert_offset:vert_offset + cnt]
        prim_jw = joint_weights[vert_offset:vert_offset + cnt]
        
        # JOINTS_0 (4 joint indices per vertex, UNSIGNED_SHORT)
        joints_data = bytearray()
        for j4 in prim_ji:
            joints_data += struct.pack('<4H', *[min(j, num_joints - 1) for j in j4])
        joints_offset = _append_to_buffer(bin_data, bytes(joints_data), gltf)
        joints_bv_idx = _add_buffer_view(gltf, joints_offset, len(joints_data))
        joints_acc_idx = _add_accessor(gltf, joints_bv_idx, 5123, cnt, "VEC4")
        
        # WEIGHTS_0 (4 weights per vertex, FLOAT)
        weights_data = bytearray()
        for w4 in prim_jw:
            weights_data += struct.pack('<4f', *w4)
        weights_offset = _append_to_buffer(bin_data, bytes(weights_data), gltf)
        weights_bv_idx = _add_buffer_view(gltf, weights_offset, len(weights_data))
        weights_acc_idx = _add_accessor(gltf, weights_bv_idx, 5126, cnt, "VEC4")
        
        prim["attributes"]["JOINTS_0"] = joints_acc_idx
        prim["attributes"]["WEIGHTS_0"] = weights_acc_idx
        vert_offset += cnt
    
    print(f"  ✅ Skinning data written to {len(primitives_info)} primitive(s)")
    
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
    
    # 7. Assign skin to ALL mesh nodes (prevents tearing across sub-meshes)
    for node in gltf["nodes"][:joint_node_start]:
        if "mesh" in node:
            node["skin"] = skin_idx
    
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
        "num_vertices_weighted": total_verts,
        "num_primitives_skinned": len(primitives_info)
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


# ════════════════════════════════════════════════════════════════
# SMOOTH ANIMATION HELPERS — Mixamo-quality easing & tangents
# ════════════════════════════════════════════════════════════════

def _ease_in_out(t):
    """Smooth Hermite ease-in-out (S-curve). Maps [0,1]→[0,1]."""
    return t * t * (3.0 - 2.0 * t)

def _ease_in_out_quint(t):
    """Quintic ease-in-out for very smooth transitions."""
    if t < 0.5:
        return 16 * t * t * t * t * t
    p = 2 * t - 2
    return 0.5 * p * p * p * p * p + 1

def _ease_out_cubic(t):
    """Cubic ease-out — fast start, smooth deceleration."""
    p = 1 - t
    return 1 - p * p * p

def _ease_in_cubic(t):
    """Cubic ease-in — smooth start, fast end."""
    return t * t * t

def _ease_out_elastic(t, amplitude=0.08):
    """Subtle elastic overshoot for secondary motion (follow-through)."""
    if t <= 0 or t >= 1:
        return t
    return 1.0 + amplitude * math.sin(-6.5 * math.pi * t) * (1 - t)

def _blend_q(a, b, t):
    """Blend two quaternions component-wise (nlerp). Good for small angles."""
    r = [a[j] + (b[j] - a[j]) * t for j in range(4)]
    ln = math.sqrt(sum(x*x for x in r))
    return [x / ln for x in r] if ln > 1e-8 else [0, 0, 0, 1]

def _q_mul(a, b):
    """Multiply two quaternions a * b. Format: [x, y, z, w]."""
    ax, ay, az, aw = a
    bx, by, bz, bw = b
    return [
        aw*bx + ax*bw + ay*bz - az*by,
        aw*by - ax*bz + ay*bw + az*bx,
        aw*bz + ax*by - ay*bx + az*bw,
        aw*bw - ax*bx - ay*by - az*bz,
    ]

def _compute_catmull_rom_tangents(times, values, component_count, is_loop=False):
    """
    Compute Catmull-Rom tangents for CUBICSPLINE interpolation.
    
    For each keyframe, computes in-tangent and out-tangent using
    the Catmull-Rom formula: tangent[i] = (v[i+1] - v[i-1]) / (t[i+1] - t[i-1])
    
    Args:
        times: list of keyframe times
        values: list of keyframe values (each is a list of `component_count` floats)
        component_count: 4 for quaternions (VEC4), 3 for translations (VEC3)
        is_loop: whether animation loops (for wrap-around tangents)
    
    Returns:
        (in_tangents, out_tangents) — each is list of lists matching values shape
    """
    n = len(times)
    in_tangents = []
    out_tangents = []
    
    for i in range(n):
        if n < 2:
            tang = [0.0] * component_count
            in_tangents.append(tang)
            out_tangents.append(tang[:])
            continue
        
        if i == 0:
            if is_loop:
                prev_v = values[-1]
                prev_t = times[0] - (times[-1] - times[-2])
            else:
                prev_v = values[0]
                prev_t = times[0]
            next_v = values[1]
            next_t = times[1]
        elif i == n - 1:
            prev_v = values[-2]
            prev_t = times[-2]
            if is_loop:
                next_v = values[0]
                next_t = times[-1] + (times[1] - times[0])
            else:
                next_v = values[-1]
                next_t = times[-1]
        else:
            prev_v = values[i - 1]
            prev_t = times[i - 1]
            next_v = values[i + 1]
            next_t = times[i + 1]
        
        dt = next_t - prev_t
        if abs(dt) < 1e-10:
            dt = 1e-10
        
        tang = [(next_v[j] - prev_v[j]) / dt for j in range(component_count)]
        
        # Dampen tangents slightly for more stable interpolation
        tang = [t * 0.85 for t in tang]
        
        in_tangents.append(tang)
        out_tangents.append(tang[:])
    
    return in_tangents, out_tangents


def _generate_animation_keyframes(animation_id: str, bone_names: list, duration: float):
    """
    Generate Mixamo-quality animation keyframes for each bone.
    
    KEY IMPROVEMENTS over old version:
    - 60 keyframes (was 24) for much smoother curves
    - Proper biomechanical gait phases for walk/run
    - Overlapping action: extremities lag behind torso
    - Follow-through: momentum overshoot on stops
    - Anticipation: wind-up before fast actions
    - Smooth easing: quintic/cubic ease curves, not just linear sin()
    - Figure-8 hip motion pattern for locomotion
    - Proper foot roll: heel-strike → flat → toe-off
    
    Returns dict: {bone_name: {"times": [...], "rotations": [...quaternions...]}}
    Each rotation is [x, y, z, w] quaternion.
    """
    identity_q = [0, 0, 0, 1]
    keyframes = {}
    
    # 60 keyframes — Mixamo uses 30-60fps, we use 60 for ultra-smooth curves
    n = 60
    times = [i * duration / (n - 1) for i in range(n)]
    
    for bone in bone_names:
        keyframes[bone] = {
            "times": times,
            "rotations": [identity_q[:] for _ in range(n)],
            "translations": None
        }
    
    # ══════════════════════════════════════════════════════════
    # WALK — Biomechanically accurate gait cycle (Mixamo-quality)
    # ══════════════════════════════════════════════════════════
    if animation_id == "walk":
        for i in range(n):
            t = i / (n - 1)  # 0..1 over one full stride cycle
            
            # --- Phase generators ---
            # Main stride: full sine wave (one complete L-R cycle)
            stride = math.sin(t * 2 * math.pi)
            # Double-time bounce (vertical oscillation, 2x per stride)
            bounce = math.sin(t * 4 * math.pi)
            # Asymmetric stride with sharper push-off (realistic gait)
            stride_asym = math.sin(t * 2 * math.pi) + 0.15 * math.sin(t * 4 * math.pi)
            # Phase-shifted for overlapping action on upper body
            upper_lag = math.sin(t * 2 * math.pi - 0.18)  # upper body lags ~10° behind
            arm_lag = math.sin(t * 2 * math.pi - 0.30)    # arms lag ~17° behind
            # Foot contact phases (asymmetric — fast push-off, slow swing)
            contact_l = max(0, math.sin(t * 2 * math.pi + 0.4))  # left foot on ground
            contact_r = max(0, math.sin(t * 2 * math.pi - math.pi + 0.4))  # right foot
            # Smooth absolute value for knee flex
            knee_flex_l = max(0, -stride) ** 1.3 * 0.45  # flex during back-swing
            knee_flex_r = max(0, stride) ** 1.3 * 0.45
            
            # === HIPS ===
            if "hips" in keyframes:
                hip_pitch = bounce * 0.025                   # vertical nod
                hip_yaw = stride * 0.07                      # twist with stride
                hip_roll = stride * 0.025                    # lateral sway
                keyframes["hips"]["rotations"][i] = _quaternion_from_euler(hip_pitch, hip_yaw, hip_roll)
            
            # === SPINE CHAIN (counter-rotation cascade) ===
            if "spine" in keyframes:
                keyframes["spine"]["rotations"][i] = _quaternion_from_euler(
                    bounce * 0.012, -upper_lag * 0.05, -upper_lag * 0.018)
            if "spine1" in keyframes:
                keyframes["spine1"]["rotations"][i] = _quaternion_from_euler(
                    0, -upper_lag * 0.03, -upper_lag * 0.008)
            if "spine2" in keyframes:
                keyframes["spine2"]["rotations"][i] = _quaternion_from_euler(
                    0, -upper_lag * 0.02, 0)
            
            # === NECK & HEAD (stabilized — minimal movement) ===
            if "neck" in keyframes:
                keyframes["neck"]["rotations"][i] = _quaternion_from_euler(
                    bounce * 0.008, upper_lag * 0.015, 0)
            if "head" in keyframes:
                # Head counter-rotates slightly to stay level (vestibulo-ocular reflex)
                keyframes["head"]["rotations"][i] = _quaternion_from_euler(
                    bounce * 0.010, upper_lag * 0.02, -stride * 0.008)
            
            # === UPPER LEGS (thighs) — Main stride motion ===
            if "thigh_l" in keyframes:
                # Forward swing: smooth, Back swing: quicker (push-off power)
                thigh_l_pitch = stride_asym * 0.30
                thigh_l_roll = -0.02 + bounce * 0.008  # slight abduction
                keyframes["thigh_l"]["rotations"][i] = _quaternion_from_euler(thigh_l_pitch, 0, thigh_l_roll)
            if "thigh_r" in keyframes:
                thigh_r_pitch = -stride_asym * 0.30
                thigh_r_roll = 0.02 - bounce * 0.008
                keyframes["thigh_r"]["rotations"][i] = _quaternion_from_euler(thigh_r_pitch, 0, thigh_r_roll)
            
            # === KNEES (shins) — Flex during swing phase ===
            if "shin_l" in keyframes:
                # Knee flexes during back-swing, extends for heel-strike
                # Also slight flex at loading response (shock absorption)
                loading = max(0, stride) * 0.08  # loading response flex
                keyframes["shin_l"]["rotations"][i] = _quaternion_from_euler(knee_flex_l + loading, 0, 0)
            if "shin_r" in keyframes:
                loading = max(0, -stride) * 0.08
                keyframes["shin_r"]["rotations"][i] = _quaternion_from_euler(knee_flex_r + loading, 0, 0)
            
            # === FEET — Heel-strike → Flat → Toe-off roll ===
            if "foot_l" in keyframes:
                # Dorsiflexion at heel-strike, plantarflexion at push-off
                foot_l = -stride * 0.18 + max(0, -stride) * 0.10
                keyframes["foot_l"]["rotations"][i] = _quaternion_from_euler(foot_l, 0, 0)
            if "foot_r" in keyframes:
                foot_r = stride * 0.18 + max(0, stride) * 0.10
                keyframes["foot_r"]["rotations"][i] = _quaternion_from_euler(foot_r, 0, 0)
            
            # === TOES — Push-off flex ===
            if "toe_l" in keyframes:
                keyframes["toe_l"]["rotations"][i] = _quaternion_from_euler(contact_l * 0.15, 0, 0)
            if "toe_r" in keyframes:
                keyframes["toe_r"]["rotations"][i] = _quaternion_from_euler(contact_r * 0.15, 0, 0)
            
            # === SHOULDERS (overlapping action — lag behind spine) ===
            if "shoulder_l" in keyframes:
                keyframes["shoulder_l"]["rotations"][i] = _quaternion_from_euler(
                    -arm_lag * 0.08, 0, -arm_lag * 0.025)
            if "shoulder_r" in keyframes:
                keyframes["shoulder_r"]["rotations"][i] = _quaternion_from_euler(
                    arm_lag * 0.08, 0, arm_lag * 0.025)
            
            # === ARMS — Opposite to legs with natural pendulum ===
            if "arm_l" in keyframes:
                keyframes["arm_l"]["rotations"][i] = _quaternion_from_euler(
                    -arm_lag * 0.18, 0, -0.04 - abs(arm_lag) * 0.02)
            if "arm_r" in keyframes:
                keyframes["arm_r"]["rotations"][i] = _quaternion_from_euler(
                    arm_lag * 0.18, 0, 0.04 + abs(arm_lag) * 0.02)
            
            # === FOREARMS — Bent more during back-swing (momentum) ===
            if "forearm_l" in keyframes:
                forearm_bend = -0.12 + max(0, arm_lag) * 0.08
                keyframes["forearm_l"]["rotations"][i] = _quaternion_from_euler(forearm_bend, 0, 0)
            if "forearm_r" in keyframes:
                forearm_bend = -0.12 + max(0, -arm_lag) * 0.08
                keyframes["forearm_r"]["rotations"][i] = _quaternion_from_euler(forearm_bend, 0, 0)
            
            # === HANDS — Subtle wrist flex with arm swing ===
            if "hand_l" in keyframes:
                keyframes["hand_l"]["rotations"][i] = _quaternion_from_euler(
                    arm_lag * 0.04, 0, arm_lag * 0.025)
            if "hand_r" in keyframes:
                keyframes["hand_r"]["rotations"][i] = _quaternion_from_euler(
                    -arm_lag * 0.04, 0, -arm_lag * 0.025)
    
    # ══════════════════════════════════════════════════════════
    # RUN — Exaggerated walk with flight phase
    # ══════════════════════════════════════════════════════════
    
    elif animation_id == "run":
        for i in range(n):
            t = i / (n - 1)
            # Phase generators with offset for overlapping action
            stride = math.sin(t * 2 * math.pi)
            stride_asym = stride + 0.2 * math.sin(t * 4 * math.pi)  # sharper push-off
            bounce = math.sin(t * 4 * math.pi)
            upper_lag = math.sin(t * 2 * math.pi - 0.22)
            arm_lag = math.sin(t * 2 * math.pi - 0.35)
            
            # Knee flex — much higher than walk (heel almost touches butt)
            knee_l = max(0, -stride) ** 1.2 * 0.65
            knee_r = max(0, stride) ** 1.2 * 0.65
            
            # === Legs ===
            if "thigh_l" in keyframes:
                keyframes["thigh_l"]["rotations"][i] = _quaternion_from_euler(stride_asym * 0.42, 0, -0.02)
            if "thigh_r" in keyframes:
                keyframes["thigh_r"]["rotations"][i] = _quaternion_from_euler(-stride_asym * 0.42, 0, 0.02)
            if "shin_l" in keyframes:
                loading = max(0, stride) * 0.10
                keyframes["shin_l"]["rotations"][i] = _quaternion_from_euler(knee_l + loading, 0, 0)
            if "shin_r" in keyframes:
                loading = max(0, -stride) * 0.10
                keyframes["shin_r"]["rotations"][i] = _quaternion_from_euler(knee_r + loading, 0, 0)
            if "foot_l" in keyframes:
                keyframes["foot_l"]["rotations"][i] = _quaternion_from_euler(
                    -stride * 0.22 + max(0, -stride) * 0.15, 0, 0)
            if "foot_r" in keyframes:
                keyframes["foot_r"]["rotations"][i] = _quaternion_from_euler(
                    stride * 0.22 + max(0, stride) * 0.15, 0, 0)
            if "toe_l" in keyframes:
                keyframes["toe_l"]["rotations"][i] = _quaternion_from_euler(max(0, stride) * 0.18, 0, 0)
            if "toe_r" in keyframes:
                keyframes["toe_r"]["rotations"][i] = _quaternion_from_euler(max(0, -stride) * 0.18, 0, 0)
            
            # === Torso — forward lean + aggressive counter-rotation ===
            if "hips" in keyframes:
                keyframes["hips"]["rotations"][i] = _quaternion_from_euler(
                    0.06 + bounce * 0.04, stride * 0.10, stride * 0.035)
            if "spine" in keyframes:
                keyframes["spine"]["rotations"][i] = _quaternion_from_euler(
                    0.05 + bounce * 0.015, -upper_lag * 0.10, -upper_lag * 0.02)
            if "spine1" in keyframes:
                keyframes["spine1"]["rotations"][i] = _quaternion_from_euler(
                    0.03, -upper_lag * 0.06, 0)
            if "spine2" in keyframes:
                keyframes["spine2"]["rotations"][i] = _quaternion_from_euler(
                    0.02, -upper_lag * 0.03, 0)
            if "neck" in keyframes:
                keyframes["neck"]["rotations"][i] = _quaternion_from_euler(bounce * 0.018, 0, 0)
            if "head" in keyframes:
                keyframes["head"]["rotations"][i] = _quaternion_from_euler(bounce * 0.022, upper_lag * 0.015, 0)
            
            # === Arms — powerful pump ===
            if "shoulder_l" in keyframes:
                keyframes["shoulder_l"]["rotations"][i] = _quaternion_from_euler(
                    -arm_lag * 0.12, 0, -arm_lag * 0.04)
            if "shoulder_r" in keyframes:
                keyframes["shoulder_r"]["rotations"][i] = _quaternion_from_euler(
                    arm_lag * 0.12, 0, arm_lag * 0.04)
            if "arm_l" in keyframes:
                keyframes["arm_l"]["rotations"][i] = _quaternion_from_euler(
                    -arm_lag * 0.30, 0, -0.05 - abs(arm_lag) * 0.03)
            if "arm_r" in keyframes:
                keyframes["arm_r"]["rotations"][i] = _quaternion_from_euler(
                    arm_lag * 0.30, 0, 0.05 + abs(arm_lag) * 0.03)
            if "forearm_l" in keyframes:
                keyframes["forearm_l"]["rotations"][i] = _quaternion_from_euler(
                    -0.25 + max(0, arm_lag) * 0.12, 0, 0)
            if "forearm_r" in keyframes:
                keyframes["forearm_r"]["rotations"][i] = _quaternion_from_euler(
                    -0.25 + max(0, -arm_lag) * 0.12, 0, 0)
            if "hand_l" in keyframes:
                keyframes["hand_l"]["rotations"][i] = _quaternion_from_euler(0, 0, arm_lag * 0.05)
            if "hand_r" in keyframes:
                keyframes["hand_r"]["rotations"][i] = _quaternion_from_euler(0, 0, -arm_lag * 0.05)
    
    elif animation_id == "attack":
        for i in range(n):
            t = i / (n - 1)
            
            if t < 0.3:
                # Wind up — ease-in (slow start) for anticipation
                p = _ease_in_cubic(t / 0.3)
                if "shoulder_r" in keyframes:
                    keyframes["shoulder_r"]["rotations"][i] = _quaternion_from_euler(-p * 0.35, 0, -p * 0.08)
                if "arm_r" in keyframes:
                    keyframes["arm_r"]["rotations"][i] = _quaternion_from_euler(-p * 1.2, 0, -p * 0.2)
                if "forearm_r" in keyframes:
                    keyframes["forearm_r"]["rotations"][i] = _quaternion_from_euler(-p * 0.7, 0, 0)
                if "hips" in keyframes:
                    keyframes["hips"]["rotations"][i] = _quaternion_from_euler(0, p * 0.12, 0)
                if "spine" in keyframes:
                    keyframes["spine"]["rotations"][i] = _quaternion_from_euler(0, p * 0.08, 0)
                if "spine2" in keyframes:
                    keyframes["spine2"]["rotations"][i] = _quaternion_from_euler(0, p * 0.25, 0)
                # Secondary: weight shift to back foot
                if "thigh_r" in keyframes:
                    keyframes["thigh_r"]["rotations"][i] = _quaternion_from_euler(-p * 0.08, 0, 0)
                if "head" in keyframes:
                    keyframes["head"]["rotations"][i] = _quaternion_from_euler(0, p * 0.08, 0)
            elif t < 0.5:
                # Strike forward — swing arm, twist torso
                p = (t - 0.3) / 0.2
                if "shoulder_r" in keyframes:
                    keyframes["shoulder_r"]["rotations"][i] = _quaternion_from_euler(-0.35 + p * 0.55, 0, -0.08 + p * 0.08)
                if "arm_r" in keyframes:
                    keyframes["arm_r"]["rotations"][i] = _quaternion_from_euler(-1.2 + p * 1.8, 0, -0.2 + p * 0.2)
                if "forearm_r" in keyframes:
                    keyframes["forearm_r"]["rotations"][i] = _quaternion_from_euler(-0.7 + p * 0.7, 0, 0)
                if "hips" in keyframes:
                    keyframes["hips"]["rotations"][i] = _quaternion_from_euler(0, 0.12 - p * 0.24, 0)
                if "spine" in keyframes:
                    keyframes["spine"]["rotations"][i] = _quaternion_from_euler(p * 0.06, 0.08 - p * 0.16, 0)
                if "spine2" in keyframes:
                    keyframes["spine2"]["rotations"][i] = _quaternion_from_euler(p * 0.15, 0.25 - p * 0.55, 0)
            else:
                # Recovery — return to rest
                p = (t - 0.5) / 0.5
                ease = 1 - p  # linear ease-out
                if "shoulder_r" in keyframes:
                    keyframes["shoulder_r"]["rotations"][i] = _quaternion_from_euler(0.2 * ease, 0, 0)
                if "arm_r" in keyframes:
                    keyframes["arm_r"]["rotations"][i] = _quaternion_from_euler(0.6 * ease, 0, 0)
                if "hips" in keyframes:
                    keyframes["hips"]["rotations"][i] = _quaternion_from_euler(0, -0.12 * ease, 0)
                if "spine" in keyframes:
                    keyframes["spine"]["rotations"][i] = _quaternion_from_euler(0.06 * ease, -0.08 * ease, 0)
                if "spine2" in keyframes:
                    keyframes["spine2"]["rotations"][i] = _quaternion_from_euler(0.12 * ease, -0.30 * ease, 0)
    
    elif animation_id == "dance":
        # Smooth dance — layered sine waves at different frequencies + offsets
        for i in range(n):
            t = i / (n - 1)
            # Multiple layered rhythms for organic feel
            beat = math.sin(t * 4 * math.pi)              # main beat (2 per cycle)
            beat_lag = math.sin(t * 4 * math.pi - 0.25)   # upper body lags
            half = math.sin(t * 2 * math.pi)              # half-time sway
            double = math.sin(t * 8 * math.pi)            # double-time accent
            groove = math.cos(t * 4 * math.pi)
            groove_lag = math.cos(t * 4 * math.pi - 0.3)
            
            if "hips" in keyframes:
                keyframes["hips"]["rotations"][i] = _quaternion_from_euler(
                    beat * 0.04 + double * 0.01,  # bounce
                    half * 0.18,                    # sway
                    groove * 0.10)                  # tilt
            if "spine" in keyframes:
                keyframes["spine"]["rotations"][i] = _quaternion_from_euler(
                    beat_lag * 0.03, -half * 0.12, -groove_lag * 0.06)
            if "spine1" in keyframes:
                keyframes["spine1"]["rotations"][i] = _quaternion_from_euler(
                    0, -half * 0.06, 0)
            if "spine2" in keyframes:
                keyframes["spine2"]["rotations"][i] = _quaternion_from_euler(
                    beat_lag * 0.02, -half * 0.04, groove_lag * 0.03)
            if "neck" in keyframes:
                keyframes["neck"]["rotations"][i] = _quaternion_from_euler(
                    beat * 0.03, half * 0.05, groove * 0.02)
            if "head" in keyframes:
                keyframes["head"]["rotations"][i] = _quaternion_from_euler(
                    beat * 0.05 + double * 0.015, half * 0.06, groove * 0.04)
            
            # Arms — expressive with lag
            arm_beat = math.sin(t * 4 * math.pi - 0.35)
            if "shoulder_l" in keyframes:
                keyframes["shoulder_l"]["rotations"][i] = _quaternion_from_euler(
                    groove_lag * 0.12, 0, arm_beat * 0.08)
            if "shoulder_r" in keyframes:
                keyframes["shoulder_r"]["rotations"][i] = _quaternion_from_euler(
                    -groove_lag * 0.12, 0, -arm_beat * 0.08)
            if "arm_l" in keyframes:
                keyframes["arm_l"]["rotations"][i] = _quaternion_from_euler(
                    groove_lag * 0.30 - 0.45, 0, arm_beat * 0.18)
            if "arm_r" in keyframes:
                keyframes["arm_r"]["rotations"][i] = _quaternion_from_euler(
                    -groove_lag * 0.30 - 0.45, 0, -arm_beat * 0.18)
            if "forearm_l" in keyframes:
                keyframes["forearm_l"]["rotations"][i] = _quaternion_from_euler(
                    -0.55 + arm_beat * 0.18, 0, 0)
            if "forearm_r" in keyframes:
                keyframes["forearm_r"]["rotations"][i] = _quaternion_from_euler(
                    -0.55 - arm_beat * 0.18, 0, 0)
            if "hand_l" in keyframes:
                keyframes["hand_l"]["rotations"][i] = _quaternion_from_euler(
                    arm_beat * 0.06, 0, arm_beat * 0.04)
            if "hand_r" in keyframes:
                keyframes["hand_r"]["rotations"][i] = _quaternion_from_euler(
                    -arm_beat * 0.06, 0, -arm_beat * 0.04)
            
            # Legs — stepping with weight
            if "thigh_l" in keyframes:
                keyframes["thigh_l"]["rotations"][i] = _quaternion_from_euler(
                    max(0, beat) * 0.28 + max(0, -half) * 0.05, 0, 0)
            if "thigh_r" in keyframes:
                keyframes["thigh_r"]["rotations"][i] = _quaternion_from_euler(
                    max(0, -beat) * 0.28 + max(0, half) * 0.05, 0, 0)
            if "shin_l" in keyframes:
                keyframes["shin_l"]["rotations"][i] = _quaternion_from_euler(
                    max(0, beat) * 0.15, 0, 0)
            if "shin_r" in keyframes:
                keyframes["shin_r"]["rotations"][i] = _quaternion_from_euler(
                    max(0, -beat) * 0.15, 0, 0)
    
    elif animation_id == "agree":
        for i in range(n):
            t = i / (n - 1)
            # Damped oscillation — nods get smaller over time (natural gesture)
            envelope = 1.0 - 0.4 * t  # gentle decay
            nod = math.sin(t * 6 * math.pi) * 0.28 * envelope
            nod_lag = math.sin(t * 6 * math.pi - 0.2) * 0.28 * envelope
            if "head" in keyframes:
                keyframes["head"]["rotations"][i] = _quaternion_from_euler(nod, 0, nod * 0.03)
            if "neck" in keyframes:
                keyframes["neck"]["rotations"][i] = _quaternion_from_euler(nod_lag * 0.35, 0, 0)
            if "spine2" in keyframes:
                keyframes["spine2"]["rotations"][i] = _quaternion_from_euler(nod_lag * 0.08, 0, 0)
            if "spine" in keyframes:
                keyframes["spine"]["rotations"][i] = _quaternion_from_euler(nod_lag * 0.04, 0, 0)
            # Subtle shoulder micro-movement
            if "shoulder_l" in keyframes:
                keyframes["shoulder_l"]["rotations"][i] = _quaternion_from_euler(nod * 0.02, 0, 0)
            if "shoulder_r" in keyframes:
                keyframes["shoulder_r"]["rotations"][i] = _quaternion_from_euler(nod * 0.02, 0, 0)
    
    elif animation_id == "alert":
        for i in range(n):
            t = i / (n - 1)
            if t < 0.3:
                p = _ease_in_out(t / 0.3)
                if "spine" in keyframes:
                    keyframes["spine"]["rotations"][i] = _quaternion_from_euler(-p * 0.1, 0, 0)
                if "spine2" in keyframes:
                    keyframes["spine2"]["rotations"][i] = _quaternion_from_euler(-p * 0.05, p * 0.06, 0)
                if "head" in keyframes:
                    keyframes["head"]["rotations"][i] = _quaternion_from_euler(0, p * 0.5, p * 0.03)
                if "neck" in keyframes:
                    keyframes["neck"]["rotations"][i] = _quaternion_from_euler(0, p * 0.15, 0)
                # Weight shift
                if "hips" in keyframes:
                    keyframes["hips"]["rotations"][i] = _quaternion_from_euler(0, 0, -p * 0.02)
            else:
                look = math.sin((t - 0.3) / 0.7 * 2 * math.pi)
                look_lag = math.sin((t - 0.3) / 0.7 * 2 * math.pi - 0.15)
                if "head" in keyframes:
                    keyframes["head"]["rotations"][i] = _quaternion_from_euler(
                        math.sin((t-0.3)/0.7 * 4 * math.pi) * 0.04, 0.5 * look, look * 0.03)
                if "neck" in keyframes:
                    keyframes["neck"]["rotations"][i] = _quaternion_from_euler(0, 0.15 * look_lag, 0)
                if "spine2" in keyframes:
                    keyframes["spine2"]["rotations"][i] = _quaternion_from_euler(-0.05, look_lag * 0.08, 0)
                if "spine" in keyframes:
                    keyframes["spine"]["rotations"][i] = _quaternion_from_euler(-0.1, look_lag * 0.04, 0)
                if "hips" in keyframes:
                    keyframes["hips"]["rotations"][i] = _quaternion_from_euler(0, 0, look * 0.015)
                if "spine" in keyframes:
                    keyframes["spine"]["rotations"][i] = _quaternion_from_euler(-0.1, look * 0.1, 0)
    
    elif animation_id == "arise":
        for i in range(n):
            t = i / (n - 1)
            # Smooth ease-out — fast at start (momentum), slows as standing
            crouch_raw = max(0, 1 - t * 2)
            crouch = crouch_raw * crouch_raw  # quadratic ease for natural deceleration
            # Upper body leads, legs follow (overlapping action)
            upper_t = min(1.0, t * 2.2)  # upper body finishes faster
            upper_crouch = max(0, 1 - upper_t)
            upper_crouch = upper_crouch * upper_crouch
            # Head leads the way up (anticipation)
            head_t = min(1.0, t * 2.5)
            head_crouch = max(0, 1 - head_t) ** 2
            
            if "hips" in keyframes:
                keyframes["hips"]["rotations"][i] = _quaternion_from_euler(crouch * 0.4, 0, 0)
            if "spine" in keyframes:
                keyframes["spine"]["rotations"][i] = _quaternion_from_euler(upper_crouch * 0.3, 0, 0)
            if "spine1" in keyframes:
                keyframes["spine1"]["rotations"][i] = _quaternion_from_euler(upper_crouch * 0.15, 0, 0)
            if "neck" in keyframes:
                keyframes["neck"]["rotations"][i] = _quaternion_from_euler(head_crouch * 0.12, 0, 0)
            if "head" in keyframes:
                keyframes["head"]["rotations"][i] = _quaternion_from_euler(head_crouch * 0.18, 0, 0)
            if "shoulder_l" in keyframes:
                keyframes["shoulder_l"]["rotations"][i] = _quaternion_from_euler(upper_crouch * 0.1, 0, upper_crouch * 0.05)
            if "shoulder_r" in keyframes:
                keyframes["shoulder_r"]["rotations"][i] = _quaternion_from_euler(upper_crouch * 0.1, 0, -upper_crouch * 0.05)
            if "arm_l" in keyframes:
                keyframes["arm_l"]["rotations"][i] = _quaternion_from_euler(upper_crouch * 0.2, 0, upper_crouch * 0.1)
            if "arm_r" in keyframes:
                keyframes["arm_r"]["rotations"][i] = _quaternion_from_euler(upper_crouch * 0.2, 0, -upper_crouch * 0.1)
            if "forearm_l" in keyframes:
                keyframes["forearm_l"]["rotations"][i] = _quaternion_from_euler(-upper_crouch * 0.3, 0, 0)
            if "forearm_r" in keyframes:
                keyframes["forearm_r"]["rotations"][i] = _quaternion_from_euler(-upper_crouch * 0.3, 0, 0)
            if "thigh_l" in keyframes:
                keyframes["thigh_l"]["rotations"][i] = _quaternion_from_euler(crouch * 0.8, 0, 0)
            if "thigh_r" in keyframes:
                keyframes["thigh_r"]["rotations"][i] = _quaternion_from_euler(crouch * 0.8, 0, 0)
            if "shin_l" in keyframes:
                keyframes["shin_l"]["rotations"][i] = _quaternion_from_euler(-crouch * 1.0, 0, 0)
            if "shin_r" in keyframes:
                keyframes["shin_r"]["rotations"][i] = _quaternion_from_euler(-crouch * 1.0, 0, 0)
    
    elif animation_id == "dead":
        # Death animation — overlapping ragdoll collapse
        # Principle: extremities go limp first, core follows, gravity accelerates
        for i in range(n):
            t = i / (n - 1)
            
            if t < 0.12:
                # Initial hit reaction — head whips back, arms flinch (fast)
                p = _ease_out_cubic(t / 0.12)
                p_limb = _ease_out_cubic(min(1.0, t / 0.12 * 0.80))  # limbs lag
                if "spine" in keyframes:
                    keyframes["spine"]["rotations"][i] = _quaternion_from_euler(-p * 0.15, 0, 0)
                if "spine1" in keyframes:
                    keyframes["spine1"]["rotations"][i] = _quaternion_from_euler(-p * 0.08, 0, 0)
                if "neck" in keyframes:
                    keyframes["neck"]["rotations"][i] = _quaternion_from_euler(-p * 0.12, 0, p * 0.04)
                if "head" in keyframes:
                    keyframes["head"]["rotations"][i] = _quaternion_from_euler(-p * 0.28, 0, p * 0.06)
                if "arm_l" in keyframes:
                    keyframes["arm_l"]["rotations"][i] = _quaternion_from_euler(0, 0, p_limb * 0.22)
                if "arm_r" in keyframes:
                    keyframes["arm_r"]["rotations"][i] = _quaternion_from_euler(0, 0, -p_limb * 0.18)
                if "shoulder_l" in keyframes:
                    keyframes["shoulder_l"]["rotations"][i] = _quaternion_from_euler(0, 0, p_limb * 0.06)
                if "shoulder_r" in keyframes:
                    keyframes["shoulder_r"]["rotations"][i] = _quaternion_from_euler(0, 0, -p_limb * 0.05)
                    
            elif t < 0.38:
                # Stagger — knees buckle, overlapping spine cascade forward
                p = _ease_in_out((t - 0.12) / 0.26)
                p_spine = _ease_in_out(min(1.0, (t - 0.12) / 0.26 * 1.10))
                p_head = _ease_in_out(min(1.0, (t - 0.12) / 0.26 * 0.85))
                if "hips" in keyframes:
                    keyframes["hips"]["rotations"][i] = _quaternion_from_euler(p * 0.32, 0, p * 0.08)
                if "spine" in keyframes:
                    keyframes["spine"]["rotations"][i] = _quaternion_from_euler(-0.15 + p_spine * 0.38, 0, p_spine * 0.05)
                if "spine1" in keyframes:
                    keyframes["spine1"]["rotations"][i] = _quaternion_from_euler(-0.08 + p_spine * 0.15, 0, p_spine * 0.03)
                if "neck" in keyframes:
                    keyframes["neck"]["rotations"][i] = _quaternion_from_euler(-0.12 + p_head * 0.25, 0, p_head * 0.06)
                if "head" in keyframes:
                    keyframes["head"]["rotations"][i] = _quaternion_from_euler(-0.28 + p_head * 0.55, 0, p_head * 0.10)
                if "thigh_l" in keyframes:
                    keyframes["thigh_l"]["rotations"][i] = _quaternion_from_euler(p * 0.32, 0, 0)
                if "thigh_r" in keyframes:
                    keyframes["thigh_r"]["rotations"][i] = _quaternion_from_euler(p * 0.22, 0, 0)
                if "shin_l" in keyframes:
                    keyframes["shin_l"]["rotations"][i] = _quaternion_from_euler(-p * 0.52, 0, 0)
                if "shin_r" in keyframes:
                    keyframes["shin_r"]["rotations"][i] = _quaternion_from_euler(-p * 0.42, 0, 0)
                # Arms go limp — gravity pulls down, forearms dangle
                if "arm_l" in keyframes:
                    keyframes["arm_l"]["rotations"][i] = _quaternion_from_euler(-p * 0.25, 0, 0.22 + p * 0.28)
                if "arm_r" in keyframes:
                    keyframes["arm_r"]["rotations"][i] = _quaternion_from_euler(-p * 0.18, 0, -0.18 - p * 0.22)
                if "forearm_l" in keyframes:
                    keyframes["forearm_l"]["rotations"][i] = _quaternion_from_euler(-p * 0.35, 0, 0)
                if "forearm_r" in keyframes:
                    keyframes["forearm_r"]["rotations"][i] = _quaternion_from_euler(-p * 0.28, 0, 0)
                if "shoulder_l" in keyframes:
                    keyframes["shoulder_l"]["rotations"][i] = _quaternion_from_euler(-p * 0.08, 0, 0.06 + p * 0.08)
                if "shoulder_r" in keyframes:
                    keyframes["shoulder_r"]["rotations"][i] = _quaternion_from_euler(-p * 0.06, 0, -0.05 - p * 0.06)
                    
            elif t < 0.68:
                # Collapse — accelerating fall with gravity (ease-in for acceleration)
                p = _ease_in_cubic((t - 0.38) / 0.30)
                p_limb = _ease_in_cubic(min(1.0, (t - 0.38) / 0.30 * 0.85))
                if "hips" in keyframes:
                    keyframes["hips"]["rotations"][i] = _quaternion_from_euler(
                        0.32 + p * 0.58, 0, 0.08 + p * 0.15)
                if "spine" in keyframes:
                    keyframes["spine"]["rotations"][i] = _quaternion_from_euler(0.23 + p * 0.14, 0, p * 0.08)
                if "spine1" in keyframes:
                    keyframes["spine1"]["rotations"][i] = _quaternion_from_euler(0.07 + p * 0.08, 0, p * 0.04)
                if "neck" in keyframes:
                    keyframes["neck"]["rotations"][i] = _quaternion_from_euler(0.13 + p * 0.10, 0, p * 0.06)
                if "head" in keyframes:
                    keyframes["head"]["rotations"][i] = _quaternion_from_euler(0.27 + p * 0.20, 0, p * 0.15)
                if "thigh_l" in keyframes:
                    keyframes["thigh_l"]["rotations"][i] = _quaternion_from_euler(0.32 + p * 0.15, 0, 0)
                if "thigh_r" in keyframes:
                    keyframes["thigh_r"]["rotations"][i] = _quaternion_from_euler(0.22 + p * 0.10, 0, p * 0.10)
                if "shin_l" in keyframes:
                    keyframes["shin_l"]["rotations"][i] = _quaternion_from_euler(-0.52 + p * 0.18, 0, 0)
                if "shin_r" in keyframes:
                    keyframes["shin_r"]["rotations"][i] = _quaternion_from_euler(-0.42 + p * 0.14, 0, 0)
                # Arms flop outward
                if "arm_l" in keyframes:
                    keyframes["arm_l"]["rotations"][i] = _quaternion_from_euler(-0.25 - p_limb * 0.25, 0, 0.50 + p_limb * 0.30)
                if "arm_r" in keyframes:
                    keyframes["arm_r"]["rotations"][i] = _quaternion_from_euler(-0.18 - p_limb * 0.18, 0, -0.40 - p_limb * 0.22)
                if "forearm_l" in keyframes:
                    keyframes["forearm_l"]["rotations"][i] = _quaternion_from_euler(-0.35 - p_limb * 0.10, 0, p_limb * 0.08)
                if "forearm_r" in keyframes:
                    keyframes["forearm_r"]["rotations"][i] = _quaternion_from_euler(-0.28 - p_limb * 0.08, 0, -p_limb * 0.06)
                if "hand_l" in keyframes:
                    keyframes["hand_l"]["rotations"][i] = _quaternion_from_euler(-p_limb * 0.15, 0, 0)
                if "hand_r" in keyframes:
                    keyframes["hand_r"]["rotations"][i] = _quaternion_from_euler(-p_limb * 0.12, 0, 0)
                if "shoulder_l" in keyframes:
                    keyframes["shoulder_l"]["rotations"][i] = _quaternion_from_euler(-0.08 - p * 0.05, 0, 0.14 + p * 0.08)
                if "shoulder_r" in keyframes:
                    keyframes["shoulder_r"]["rotations"][i] = _quaternion_from_euler(-0.06 - p * 0.04, 0, -0.11 - p * 0.06)
                    
            else:
                # Settled — damped bounce on ground contact
                p = (t - 0.68) / 0.32
                settle = 1 + math.sin(p * math.pi * 2) * 0.025 * (1 - p)  # damped bounce
                sway = math.sin(p * math.pi) * 0.02 * (1 - p)
                if "hips" in keyframes:
                    keyframes["hips"]["rotations"][i] = _quaternion_from_euler(0.90 * settle, 0, 0.23)
                if "spine" in keyframes:
                    keyframes["spine"]["rotations"][i] = _quaternion_from_euler(0.37 * settle, 0, 0.08 + sway)
                if "spine1" in keyframes:
                    keyframes["spine1"]["rotations"][i] = _quaternion_from_euler(0.15 * settle, 0, sway * 0.5)
                if "neck" in keyframes:
                    keyframes["neck"]["rotations"][i] = _quaternion_from_euler(0.23, 0, (1 - p) * 0.03)
                if "head" in keyframes:
                    keyframes["head"]["rotations"][i] = _quaternion_from_euler(0.47, 0, 0.15 + (1 - p) * 0.05)
                if "thigh_l" in keyframes:
                    keyframes["thigh_l"]["rotations"][i] = _quaternion_from_euler(0.47, 0, 0)
                if "thigh_r" in keyframes:
                    keyframes["thigh_r"]["rotations"][i] = _quaternion_from_euler(0.32, 0, 0.10)
                if "shin_l" in keyframes:
                    keyframes["shin_l"]["rotations"][i] = _quaternion_from_euler(-0.34, 0, 0)
                if "shin_r" in keyframes:
                    keyframes["shin_r"]["rotations"][i] = _quaternion_from_euler(-0.28, 0, 0)
                if "arm_l" in keyframes:
                    keyframes["arm_l"]["rotations"][i] = _quaternion_from_euler(-0.50, 0, 0.80)
                if "arm_r" in keyframes:
                    keyframes["arm_r"]["rotations"][i] = _quaternion_from_euler(-0.36, 0, -0.62)
                if "forearm_l" in keyframes:
                    keyframes["forearm_l"]["rotations"][i] = _quaternion_from_euler(-0.45, 0, 0.08)
                if "forearm_r" in keyframes:
                    keyframes["forearm_r"]["rotations"][i] = _quaternion_from_euler(-0.36, 0, -0.06)
                if "hand_l" in keyframes:
                    keyframes["hand_l"]["rotations"][i] = _quaternion_from_euler(-0.15, 0, 0)
                if "hand_r" in keyframes:
                    keyframes["hand_r"]["rotations"][i] = _quaternion_from_euler(-0.12, 0, 0)
                if "shoulder_l" in keyframes:
                    keyframes["shoulder_l"]["rotations"][i] = _quaternion_from_euler(-0.13, 0, 0.22)
                if "shoulder_r" in keyframes:
                    keyframes["shoulder_r"]["rotations"][i] = _quaternion_from_euler(-0.10, 0, -0.17)
    
    elif animation_id == "run_fast":
        # Sprint cycle — same structure as run but with overlapping action
        for i in range(n):
            t = i / (n - 1)
            stride = math.sin(t * 2 * math.pi)
            stride_asym = stride + 0.25 * math.sin(t * 4 * math.pi)
            bounce = math.sin(t * 4 * math.pi)
            upper_lag = math.sin(t * 2 * math.pi - 0.25)
            arm_lag = math.sin(t * 2 * math.pi - 0.40)
            knee_l = max(0, -stride) ** 1.15 * 0.75
            knee_r = max(0, stride) ** 1.15 * 0.75
            
            if "thigh_l" in keyframes:
                keyframes["thigh_l"]["rotations"][i] = _quaternion_from_euler(stride_asym * 0.50, 0, -0.025)
            if "thigh_r" in keyframes:
                keyframes["thigh_r"]["rotations"][i] = _quaternion_from_euler(-stride_asym * 0.50, 0, 0.025)
            if "shin_l" in keyframes:
                keyframes["shin_l"]["rotations"][i] = _quaternion_from_euler(knee_l + max(0, stride) * 0.12, 0, 0)
            if "shin_r" in keyframes:
                keyframes["shin_r"]["rotations"][i] = _quaternion_from_euler(knee_r + max(0, -stride) * 0.12, 0, 0)
            if "foot_l" in keyframes:
                keyframes["foot_l"]["rotations"][i] = _quaternion_from_euler(
                    -stride * 0.25 + max(0, -stride) * 0.18, 0, 0)
            if "foot_r" in keyframes:
                keyframes["foot_r"]["rotations"][i] = _quaternion_from_euler(
                    stride * 0.25 + max(0, stride) * 0.18, 0, 0)
            if "toe_l" in keyframes:
                keyframes["toe_l"]["rotations"][i] = _quaternion_from_euler(max(0, stride) * 0.20, 0, 0)
            if "toe_r" in keyframes:
                keyframes["toe_r"]["rotations"][i] = _quaternion_from_euler(max(0, -stride) * 0.20, 0, 0)
            
            if "hips" in keyframes:
                keyframes["hips"]["rotations"][i] = _quaternion_from_euler(
                    0.10 + bounce * 0.05, stride * 0.12, stride * 0.045)
            if "spine" in keyframes:
                keyframes["spine"]["rotations"][i] = _quaternion_from_euler(
                    0.10 + bounce * 0.018, -upper_lag * 0.12, -upper_lag * 0.025)
            if "spine1" in keyframes:
                keyframes["spine1"]["rotations"][i] = _quaternion_from_euler(0.05, -upper_lag * 0.06, 0)
            if "spine2" in keyframes:
                keyframes["spine2"]["rotations"][i] = _quaternion_from_euler(0.03, -upper_lag * 0.03, 0)
            if "neck" in keyframes:
                keyframes["neck"]["rotations"][i] = _quaternion_from_euler(bounce * 0.022, 0, 0)
            if "head" in keyframes:
                keyframes["head"]["rotations"][i] = _quaternion_from_euler(bounce * 0.028, 0, 0)
            
            if "shoulder_l" in keyframes:
                keyframes["shoulder_l"]["rotations"][i] = _quaternion_from_euler(
                    -arm_lag * 0.14, 0, -arm_lag * 0.05)
            if "shoulder_r" in keyframes:
                keyframes["shoulder_r"]["rotations"][i] = _quaternion_from_euler(
                    arm_lag * 0.14, 0, arm_lag * 0.05)
            if "arm_l" in keyframes:
                keyframes["arm_l"]["rotations"][i] = _quaternion_from_euler(
                    -arm_lag * 0.40, 0, -0.06 - abs(arm_lag) * 0.04)
            if "arm_r" in keyframes:
                keyframes["arm_r"]["rotations"][i] = _quaternion_from_euler(
                    arm_lag * 0.40, 0, 0.06 + abs(arm_lag) * 0.04)
            if "forearm_l" in keyframes:
                keyframes["forearm_l"]["rotations"][i] = _quaternion_from_euler(
                    -0.45 + max(0, arm_lag) * 0.15, 0, 0)
            if "forearm_r" in keyframes:
                keyframes["forearm_r"]["rotations"][i] = _quaternion_from_euler(
                    -0.45 + max(0, -arm_lag) * 0.15, 0, 0)
            if "hand_l" in keyframes:
                keyframes["hand_l"]["rotations"][i] = _quaternion_from_euler(0, 0, arm_lag * 0.06)
            if "hand_r" in keyframes:
                keyframes["hand_r"]["rotations"][i] = _quaternion_from_euler(0, 0, -arm_lag * 0.06)
    
    elif animation_id == "sit_down":
        # Sit down — smooth transition with overlapping action
        for i in range(n):
            t = i / (n - 1)
            # Different body parts reach final pose at different times
            p_lower = _ease_in_out_quint(t)         # legs lead
            p_upper = _ease_in_out_quint(max(0, (t - 0.05) / 0.95))  # torso follows
            p_arms = _ease_in_out_quint(max(0, (t - 0.10) / 0.90))   # arms last
            p_head = _ease_in_out_quint(max(0, (t - 0.12) / 0.88))   # head settles last
            
            if "hips" in keyframes:
                keyframes["hips"]["rotations"][i] = _quaternion_from_euler(p_lower * 0.15, 0, 0)
            if "spine" in keyframes:
                keyframes["spine"]["rotations"][i] = _quaternion_from_euler(-p_upper * 0.10, 0, 0)
            if "spine1" in keyframes:
                keyframes["spine1"]["rotations"][i] = _quaternion_from_euler(-p_upper * 0.05, 0, 0)
            if "neck" in keyframes:
                keyframes["neck"]["rotations"][i] = _quaternion_from_euler(-p_head * 0.04, 0, 0)
            if "head" in keyframes:
                keyframes["head"]["rotations"][i] = _quaternion_from_euler(-p_head * 0.08, 0, 0)
            if "thigh_l" in keyframes:
                keyframes["thigh_l"]["rotations"][i] = _quaternion_from_euler(p_lower * 1.2, 0, 0)
            if "thigh_r" in keyframes:
                keyframes["thigh_r"]["rotations"][i] = _quaternion_from_euler(p_lower * 1.2, 0, 0)
            if "shin_l" in keyframes:
                keyframes["shin_l"]["rotations"][i] = _quaternion_from_euler(-p_lower * 1.1, 0, 0)
            if "shin_r" in keyframes:
                keyframes["shin_r"]["rotations"][i] = _quaternion_from_euler(-p_lower * 1.1, 0, 0)
            if "arm_l" in keyframes:
                keyframes["arm_l"]["rotations"][i] = _quaternion_from_euler(-p_arms * 0.3, 0, p_arms * 0.15)
            if "arm_r" in keyframes:
                keyframes["arm_r"]["rotations"][i] = _quaternion_from_euler(-p_arms * 0.3, 0, -p_arms * 0.15)
            if "forearm_l" in keyframes:
                keyframes["forearm_l"]["rotations"][i] = _quaternion_from_euler(-p_arms * 0.4, 0, 0)
            if "forearm_r" in keyframes:
                keyframes["forearm_r"]["rotations"][i] = _quaternion_from_euler(-p_arms * 0.4, 0, 0)
    
    elif animation_id == "jump":
        # Jump — anticipation crouch, explosive launch, float, impact absorption
        # Overlapping action: arms lag behind body, head/spine settle after landing
        for i in range(n):
            t = i / (n - 1)
            
            if t < 0.22:
                # Anticipation — crouch with full body compression
                p = _ease_in_out(t / 0.22)
                p_upper = _ease_in_out(min(1.0, t / 0.22 * 1.15))  # upper body slightly ahead
                if "hips" in keyframes:
                    keyframes["hips"]["rotations"][i] = _quaternion_from_euler(p * 0.18, 0, 0)
                if "spine" in keyframes:
                    keyframes["spine"]["rotations"][i] = _quaternion_from_euler(p_upper * 0.08, 0, 0)
                if "spine1" in keyframes:
                    keyframes["spine1"]["rotations"][i] = _quaternion_from_euler(p_upper * 0.04, 0, 0)
                if "head" in keyframes:
                    keyframes["head"]["rotations"][i] = _quaternion_from_euler(-p_upper * 0.08, 0, 0)
                if "neck" in keyframes:
                    keyframes["neck"]["rotations"][i] = _quaternion_from_euler(-p_upper * 0.04, 0, 0)
                if "thigh_l" in keyframes:
                    keyframes["thigh_l"]["rotations"][i] = _quaternion_from_euler(p * 0.55, 0, 0)
                if "thigh_r" in keyframes:
                    keyframes["thigh_r"]["rotations"][i] = _quaternion_from_euler(p * 0.55, 0, 0)
                if "shin_l" in keyframes:
                    keyframes["shin_l"]["rotations"][i] = _quaternion_from_euler(-p * 0.70, 0, 0)
                if "shin_r" in keyframes:
                    keyframes["shin_r"]["rotations"][i] = _quaternion_from_euler(-p * 0.70, 0, 0)
                if "foot_l" in keyframes:
                    keyframes["foot_l"]["rotations"][i] = _quaternion_from_euler(p * 0.15, 0, 0)
                if "foot_r" in keyframes:
                    keyframes["foot_r"]["rotations"][i] = _quaternion_from_euler(p * 0.15, 0, 0)
                # Arms wind back
                p_arm = _ease_in_out(min(1.0, t / 0.22 * 0.85))  # arms lag
                if "shoulder_l" in keyframes:
                    keyframes["shoulder_l"]["rotations"][i] = _quaternion_from_euler(p_arm * 0.08, 0, p_arm * 0.04)
                if "shoulder_r" in keyframes:
                    keyframes["shoulder_r"]["rotations"][i] = _quaternion_from_euler(p_arm * 0.08, 0, -p_arm * 0.04)
                if "arm_l" in keyframes:
                    keyframes["arm_l"]["rotations"][i] = _quaternion_from_euler(p_arm * 0.35, 0, p_arm * 0.12)
                if "arm_r" in keyframes:
                    keyframes["arm_r"]["rotations"][i] = _quaternion_from_euler(p_arm * 0.35, 0, -p_arm * 0.12)
                if "forearm_l" in keyframes:
                    keyframes["forearm_l"]["rotations"][i] = _quaternion_from_euler(-p_arm * 0.20, 0, 0)
                if "forearm_r" in keyframes:
                    keyframes["forearm_r"]["rotations"][i] = _quaternion_from_euler(-p_arm * 0.20, 0, 0)
                    
            elif t < 0.40:
                # Launch — explosive extension, arms sweep up
                p = _ease_out_cubic((t - 0.22) / 0.18)
                p_arm = _ease_out_cubic(min(1.0, (t - 0.22) / 0.18 * 0.80))  # arms lag
                if "hips" in keyframes:
                    keyframes["hips"]["rotations"][i] = _quaternion_from_euler(0.18 - p * 0.30, 0, 0)
                if "spine" in keyframes:
                    keyframes["spine"]["rotations"][i] = _quaternion_from_euler(0.08 - p * 0.14, 0, 0)
                if "spine1" in keyframes:
                    keyframes["spine1"]["rotations"][i] = _quaternion_from_euler(0.04 - p * 0.06, 0, 0)
                if "head" in keyframes:
                    keyframes["head"]["rotations"][i] = _quaternion_from_euler(-0.08 + p * 0.02, 0, 0)
                if "thigh_l" in keyframes:
                    keyframes["thigh_l"]["rotations"][i] = _quaternion_from_euler(0.55 - p * 0.65, 0, 0)
                if "thigh_r" in keyframes:
                    keyframes["thigh_r"]["rotations"][i] = _quaternion_from_euler(0.55 - p * 0.65, 0, 0)
                if "shin_l" in keyframes:
                    keyframes["shin_l"]["rotations"][i] = _quaternion_from_euler(-0.70 + p * 0.70, 0, 0)
                if "shin_r" in keyframes:
                    keyframes["shin_r"]["rotations"][i] = _quaternion_from_euler(-0.70 + p * 0.70, 0, 0)
                if "foot_l" in keyframes:
                    keyframes["foot_l"]["rotations"][i] = _quaternion_from_euler(0.15 - p * 0.40, 0, 0)
                if "foot_r" in keyframes:
                    keyframes["foot_r"]["rotations"][i] = _quaternion_from_euler(0.15 - p * 0.40, 0, 0)
                if "arm_l" in keyframes:
                    keyframes["arm_l"]["rotations"][i] = _quaternion_from_euler(0.35 - p_arm * 1.15, 0, 0.12 + p_arm * 0.18)
                if "arm_r" in keyframes:
                    keyframes["arm_r"]["rotations"][i] = _quaternion_from_euler(0.35 - p_arm * 1.15, 0, -0.12 - p_arm * 0.18)
                if "forearm_l" in keyframes:
                    keyframes["forearm_l"]["rotations"][i] = _quaternion_from_euler(-0.20 + p_arm * 0.10, 0, 0)
                if "forearm_r" in keyframes:
                    keyframes["forearm_r"]["rotations"][i] = _quaternion_from_euler(-0.20 + p_arm * 0.10, 0, 0)
                    
            elif t < 0.62:
                # Airborne — extended pose with slight tuck, arms wide
                p = (t - 0.40) / 0.22
                float_bob = math.sin(p * math.pi) * 0.04  # subtle float
                if "hips" in keyframes:
                    keyframes["hips"]["rotations"][i] = _quaternion_from_euler(-0.12, 0, 0)
                if "spine" in keyframes:
                    keyframes["spine"]["rotations"][i] = _quaternion_from_euler(-0.06 + float_bob, 0, 0)
                if "head" in keyframes:
                    keyframes["head"]["rotations"][i] = _quaternion_from_euler(-0.06, 0, 0)
                if "arm_l" in keyframes:
                    keyframes["arm_l"]["rotations"][i] = _quaternion_from_euler(-0.80, 0, 0.30 + float_bob)
                if "arm_r" in keyframes:
                    keyframes["arm_r"]["rotations"][i] = _quaternion_from_euler(-0.80, 0, -0.30 - float_bob)
                if "forearm_l" in keyframes:
                    keyframes["forearm_l"]["rotations"][i] = _quaternion_from_euler(-0.10, 0, 0)
                if "forearm_r" in keyframes:
                    keyframes["forearm_r"]["rotations"][i] = _quaternion_from_euler(-0.10, 0, 0)
                # Legs slightly tucked
                if "thigh_l" in keyframes:
                    keyframes["thigh_l"]["rotations"][i] = _quaternion_from_euler(-0.10 + p * 0.20, 0, 0)
                if "thigh_r" in keyframes:
                    keyframes["thigh_r"]["rotations"][i] = _quaternion_from_euler(-0.10 + p * 0.20, 0, 0)
                if "shin_l" in keyframes:
                    keyframes["shin_l"]["rotations"][i] = _quaternion_from_euler(-p * 0.15, 0, 0)
                if "shin_r" in keyframes:
                    keyframes["shin_r"]["rotations"][i] = _quaternion_from_euler(-p * 0.15, 0, 0)
                    
            else:
                # Landing — impact absorption with overlapping settle
                p = _ease_out_cubic((t - 0.62) / 0.38)
                # Settle bounce: body compresses then springs back
                settle = math.sin(p * math.pi * 2.5) * (1 - p) * 0.15
                p_head = _ease_out_cubic(min(1.0, (t - 0.62) / 0.38 * 0.75))  # head settles late
                p_arm = _ease_out_cubic(min(1.0, (t - 0.62) / 0.38 * 0.65))   # arms settle latest
                if "hips" in keyframes:
                    keyframes["hips"]["rotations"][i] = _quaternion_from_euler(-0.12 + p * 0.30 + settle, 0, 0)
                if "spine" in keyframes:
                    keyframes["spine"]["rotations"][i] = _quaternion_from_euler(-0.06 + p * 0.10 + settle * 0.6, 0, 0)
                if "spine1" in keyframes:
                    keyframes["spine1"]["rotations"][i] = _quaternion_from_euler(settle * 0.3, 0, 0)
                if "head" in keyframes:
                    keyframes["head"]["rotations"][i] = _quaternion_from_euler(-0.06 + p_head * 0.08 + settle * 0.4, 0, 0)
                if "neck" in keyframes:
                    keyframes["neck"]["rotations"][i] = _quaternion_from_euler(settle * 0.25, 0, 0)
                if "thigh_l" in keyframes:
                    keyframes["thigh_l"]["rotations"][i] = _quaternion_from_euler(0.10 + p * 0.25 + settle * 0.8, 0, 0)
                if "thigh_r" in keyframes:
                    keyframes["thigh_r"]["rotations"][i] = _quaternion_from_euler(0.10 + p * 0.25 + settle * 0.8, 0, 0)
                if "shin_l" in keyframes:
                    keyframes["shin_l"]["rotations"][i] = _quaternion_from_euler(-0.15 - p * 0.25, 0, 0)
                if "shin_r" in keyframes:
                    keyframes["shin_r"]["rotations"][i] = _quaternion_from_euler(-0.15 - p * 0.25, 0, 0)
                if "foot_l" in keyframes:
                    keyframes["foot_l"]["rotations"][i] = _quaternion_from_euler(settle * 0.3, 0, 0)
                if "foot_r" in keyframes:
                    keyframes["foot_r"]["rotations"][i] = _quaternion_from_euler(settle * 0.3, 0, 0)
                if "arm_l" in keyframes:
                    keyframes["arm_l"]["rotations"][i] = _quaternion_from_euler(-0.80 + p_arm * 0.80, 0, 0.30 - p_arm * 0.30)
                if "arm_r" in keyframes:
                    keyframes["arm_r"]["rotations"][i] = _quaternion_from_euler(-0.80 + p_arm * 0.80, 0, -0.30 + p_arm * 0.30)
                if "forearm_l" in keyframes:
                    keyframes["forearm_l"]["rotations"][i] = _quaternion_from_euler(-0.10 + p_arm * 0.10, 0, 0)
                if "forearm_r" in keyframes:
                    keyframes["forearm_r"]["rotations"][i] = _quaternion_from_euler(-0.10 + p_arm * 0.10, 0, 0)
    
    elif animation_id == "wave":
        # Wave — arm raise, waving with overlapping body motion, lower
        for i in range(n):
            t = i / (n - 1)
            # Phase structure: raise arm (0-0.15), wave loop (0.15-0.85), lower (0.85-1.0)
            if t < 0.15:
                # Raise arm up smoothly
                p = _ease_in_out(t / 0.15)
                arm_up = p
                wave_v = 0
            elif t < 0.85:
                arm_up = 1.0
                # Wave motion with overlapping lag
                wave_t = (t - 0.15) / 0.70
                wave_v = math.sin(wave_t * 7 * math.pi) * 0.28
            else:
                # Lower arm
                p = _ease_in_out((t - 0.85) / 0.15)
                arm_up = 1.0 - p
                wave_v = math.sin(0) * 0.28 * (1 - p)
            
            # Lagged body sway (follows hand motion)
            body_wave = math.sin(t * 7 * math.pi - 0.25) * 0.28 if t > 0.15 else 0
            head_wave = math.sin(t * 7 * math.pi - 0.15) * 0.28 if t > 0.15 else 0
            
            if "shoulder_r" in keyframes:
                keyframes["shoulder_r"]["rotations"][i] = _quaternion_from_euler(
                    -arm_up * 0.22, 0, -arm_up * 0.15)
            if "arm_r" in keyframes:
                keyframes["arm_r"]["rotations"][i] = _quaternion_from_euler(
                    -arm_up * 1.35, 0, -arm_up * 0.22)
            if "forearm_r" in keyframes:
                keyframes["forearm_r"]["rotations"][i] = _quaternion_from_euler(
                    -arm_up * 0.50, 0, wave_v)
            if "hand_r" in keyframes:
                keyframes["hand_r"]["rotations"][i] = _quaternion_from_euler(
                    0, wave_v * 0.9, wave_v * 0.3)
            # Spine chain cascade
            if "spine" in keyframes:
                keyframes["spine"]["rotations"][i] = _quaternion_from_euler(
                    0, body_wave * 0.03, body_wave * 0.02)
            if "spine1" in keyframes:
                keyframes["spine1"]["rotations"][i] = _quaternion_from_euler(
                    0, body_wave * 0.02, 0)
            if "neck" in keyframes:
                keyframes["neck"]["rotations"][i] = _quaternion_from_euler(
                    0, head_wave * 0.04, head_wave * 0.02)
            if "head" in keyframes:
                keyframes["head"]["rotations"][i] = _quaternion_from_euler(
                    head_wave * 0.03, head_wave * 0.08, head_wave * 0.04)
            # Counter arm subtly adjusts
            if "arm_l" in keyframes:
                keyframes["arm_l"]["rotations"][i] = _quaternion_from_euler(
                    body_wave * 0.04, 0, -body_wave * 0.02)
            # Subtle weight shift
            if "hips" in keyframes:
                keyframes["hips"]["rotations"][i] = _quaternion_from_euler(
                    0, 0, body_wave * 0.015 - arm_up * 0.02)
    
    elif animation_id == "clap":
        # Clap — enthusiastic rhythmic clapping with body engagement
        for i in range(n):
            t = i / (n - 1)
            # Sharp clap contact + smooth return using asymmetric wave
            raw_clap = math.sin(t * 8 * math.pi)
            clap = max(0, raw_clap) ** 0.7       # sharper peak (hands meet)
            clap_out = max(0, -raw_clap) ** 1.3   # slower separate
            clap_mix = clap - clap_out * 0.4      # combined
            # Body lag — reacts to clap impact
            body_clap = max(0, math.sin(t * 8 * math.pi - 0.20)) ** 0.7
            head_clap = max(0, math.sin(t * 8 * math.pi - 0.12)) ** 0.7
            # Enthusiasm builds
            energy = min(1.0, t * 1.3) if t < 0.9 else max(0.3, 1.0 - (t - 0.9) * 7)
            
            if "shoulder_l" in keyframes:
                keyframes["shoulder_l"]["rotations"][i] = _quaternion_from_euler(
                    -0.15 * energy, 0, -clap_mix * 0.10 * energy)
            if "shoulder_r" in keyframes:
                keyframes["shoulder_r"]["rotations"][i] = _quaternion_from_euler(
                    -0.15 * energy, 0, clap_mix * 0.10 * energy)
            if "arm_l" in keyframes:
                keyframes["arm_l"]["rotations"][i] = _quaternion_from_euler(
                    -0.65 * energy, 0, (-0.30 + clap * 0.35) * energy)
            if "arm_r" in keyframes:
                keyframes["arm_r"]["rotations"][i] = _quaternion_from_euler(
                    -0.65 * energy, 0, (0.30 - clap * 0.35) * energy)
            if "forearm_l" in keyframes:
                keyframes["forearm_l"]["rotations"][i] = _quaternion_from_euler(
                    (-0.85 + clap * 0.20) * energy, 0, 0)
            if "forearm_r" in keyframes:
                keyframes["forearm_r"]["rotations"][i] = _quaternion_from_euler(
                    (-0.85 + clap * 0.20) * energy, 0, 0)
            if "hand_l" in keyframes:
                keyframes["hand_l"]["rotations"][i] = _quaternion_from_euler(
                    clap * 0.12 * energy, 0, clap * 0.06 * energy)
            if "hand_r" in keyframes:
                keyframes["hand_r"]["rotations"][i] = _quaternion_from_euler(
                    clap * 0.12 * energy, 0, -clap * 0.06 * energy)
            # Head nod with body bounce (lagged)
            if "head" in keyframes:
                keyframes["head"]["rotations"][i] = _quaternion_from_euler(
                    head_clap * 0.10 * energy, 0, 0)
            if "neck" in keyframes:
                keyframes["neck"]["rotations"][i] = _quaternion_from_euler(
                    body_clap * 0.04 * energy, 0, 0)
            if "spine" in keyframes:
                keyframes["spine"]["rotations"][i] = _quaternion_from_euler(
                    body_clap * 0.05 * energy, 0, 0)
            if "spine1" in keyframes:
                keyframes["spine1"]["rotations"][i] = _quaternion_from_euler(
                    body_clap * 0.03 * energy, 0, 0)
            # Weight shift with beat
            if "hips" in keyframes:
                keyframes["hips"]["rotations"][i] = _quaternion_from_euler(
                    body_clap * 0.03 * energy, 0, 0)
    
    elif animation_id == "punch":
        # Punch — anticipation wind-up, explosive strike, follow-through, recovery
        # Overlapping: torso leads, arm follows, head whips, settling back
        for i in range(n):
            t = i / (n - 1)
            
            if t < 0.28:
                # Wind up — weight back, rotate right, chambered fist
                p = _ease_in_cubic(t / 0.28)
                p_head = _ease_in_cubic(min(1.0, t / 0.28 * 0.85))  # head lags
                if "hips" in keyframes:
                    keyframes["hips"]["rotations"][i] = _quaternion_from_euler(
                        -p * 0.04, p * 0.18, 0)
                if "spine" in keyframes:
                    keyframes["spine"]["rotations"][i] = _quaternion_from_euler(
                        0, p * 0.22, 0)
                if "spine1" in keyframes:
                    keyframes["spine1"]["rotations"][i] = _quaternion_from_euler(
                        0, p * 0.10, 0)
                if "head" in keyframes:
                    keyframes["head"]["rotations"][i] = _quaternion_from_euler(
                        -p_head * 0.06, p_head * 0.10, 0)
                if "neck" in keyframes:
                    keyframes["neck"]["rotations"][i] = _quaternion_from_euler(
                        0, p_head * 0.05, 0)
                # Right arm chambers back
                if "shoulder_r" in keyframes:
                    keyframes["shoulder_r"]["rotations"][i] = _quaternion_from_euler(
                        p * 0.10, 0, -p * 0.08)
                if "arm_r" in keyframes:
                    keyframes["arm_r"]["rotations"][i] = _quaternion_from_euler(
                        -p * 0.55, p * 0.12, -p * 0.18)
                if "forearm_r" in keyframes:
                    keyframes["forearm_r"]["rotations"][i] = _quaternion_from_euler(
                        -p * 0.90, 0, 0)
                if "hand_r" in keyframes:
                    keyframes["hand_r"]["rotations"][i] = _quaternion_from_euler(
                        p * 0.20, 0, 0)
                # Left arm guard
                if "arm_l" in keyframes:
                    keyframes["arm_l"]["rotations"][i] = _quaternion_from_euler(
                        -p * 0.40, 0, p * 0.08)
                if "forearm_l" in keyframes:
                    keyframes["forearm_l"]["rotations"][i] = _quaternion_from_euler(
                        -p * 0.65, 0, 0)
                # Weight onto back leg
                if "thigh_r" in keyframes:
                    keyframes["thigh_r"]["rotations"][i] = _quaternion_from_euler(
                        -p * 0.08, 0, 0)
                if "thigh_l" in keyframes:
                    keyframes["thigh_l"]["rotations"][i] = _quaternion_from_euler(
                        p * 0.10, 0, 0)
                    
            elif t < 0.42:
                # Strike — explosive torso rotation drives the fist forward
                p = _ease_out_cubic((t - 0.28) / 0.14)
                # Arm snaps out slightly after torso commits
                p_arm = _ease_out_cubic(min(1.0, (t - 0.28) / 0.14 * 0.80))
                p_head = _ease_out_cubic(min(1.0, (t - 0.28) / 0.14 * 0.70))
                if "hips" in keyframes:
                    keyframes["hips"]["rotations"][i] = _quaternion_from_euler(
                        -0.04 + p * 0.08, 0.18 - p * 0.42, 0)
                if "spine" in keyframes:
                    keyframes["spine"]["rotations"][i] = _quaternion_from_euler(
                        p * 0.10, 0.22 - p * 0.55, 0)
                if "spine1" in keyframes:
                    keyframes["spine1"]["rotations"][i] = _quaternion_from_euler(
                        p * 0.05, 0.10 - p * 0.22, 0)
                if "head" in keyframes:
                    keyframes["head"]["rotations"][i] = _quaternion_from_euler(
                        -0.06 + p_head * 0.06, 0.10 - p_head * 0.20, 0)
                if "arm_r" in keyframes:
                    keyframes["arm_r"]["rotations"][i] = _quaternion_from_euler(
                        -0.55 + p_arm * 1.05, 0.12 - p_arm * 0.12, -0.18 + p_arm * 0.18)
                if "forearm_r" in keyframes:
                    keyframes["forearm_r"]["rotations"][i] = _quaternion_from_euler(
                        -0.90 + p_arm * 0.72, 0, 0)
                if "hand_r" in keyframes:
                    keyframes["hand_r"]["rotations"][i] = _quaternion_from_euler(
                        0.20 - p_arm * 0.20, 0, 0)
                if "shoulder_r" in keyframes:
                    keyframes["shoulder_r"]["rotations"][i] = _quaternion_from_euler(
                        0.10 - p * 0.15, 0, -0.08 + p * 0.12)
                # Guard arm stays
                if "arm_l" in keyframes:
                    keyframes["arm_l"]["rotations"][i] = _quaternion_from_euler(
                        -0.40, 0, 0.08)
                if "forearm_l" in keyframes:
                    keyframes["forearm_l"]["rotations"][i] = _quaternion_from_euler(
                        -0.65 - p * 0.10, 0, 0)
                # Weight transfers forward
                if "thigh_l" in keyframes:
                    keyframes["thigh_l"]["rotations"][i] = _quaternion_from_euler(
                        0.10 + p * 0.10, 0, 0)
                    
            else:
                # Recovery — elastic settle back to neutral
                p = _ease_in_out((t - 0.42) / 0.58)
                overshoot = math.sin(p * math.pi * 1.5) * (1 - p) * 0.08
                if "hips" in keyframes:
                    keyframes["hips"]["rotations"][i] = _quaternion_from_euler(
                        0.04 * (1 - p), -0.24 * (1 - p) + overshoot, 0)
                if "spine" in keyframes:
                    keyframes["spine"]["rotations"][i] = _quaternion_from_euler(
                        0.10 * (1 - p), -0.33 * (1 - p) + overshoot, 0)
                if "spine1" in keyframes:
                    keyframes["spine1"]["rotations"][i] = _quaternion_from_euler(
                        0.05 * (1 - p), -0.12 * (1 - p), 0)
                if "head" in keyframes:
                    keyframes["head"]["rotations"][i] = _quaternion_from_euler(
                        0, -0.10 * (1 - p), 0)
                if "arm_r" in keyframes:
                    keyframes["arm_r"]["rotations"][i] = _quaternion_from_euler(
                        0.50 * (1 - p), 0, 0)
                if "forearm_r" in keyframes:
                    keyframes["forearm_r"]["rotations"][i] = _quaternion_from_euler(
                        -0.18 * (1 - p), 0, 0)
                if "arm_l" in keyframes:
                    keyframes["arm_l"]["rotations"][i] = _quaternion_from_euler(
                        -0.40 * (1 - p), 0, 0.08 * (1 - p))
                if "forearm_l" in keyframes:
                    keyframes["forearm_l"]["rotations"][i] = _quaternion_from_euler(
                        -0.75 * (1 - p), 0, 0)
                if "thigh_l" in keyframes:
                    keyframes["thigh_l"]["rotations"][i] = _quaternion_from_euler(
                        0.20 * (1 - p), 0, 0)
    
    elif animation_id == "kick":
        # Kick — weight shift, chamber, snap kick, follow-through, recovery
        # Overlapping: hip rotation leads, leg follows, upper body counterbalances
        for i in range(n):
            t = i / (n - 1)
            
            if t < 0.20:
                # Weight shift + chamber — load onto left leg, bring right knee up
                p = _ease_in_out(t / 0.20)
                p_upper = _ease_in_out(min(1.0, t / 0.20 * 0.85))  # upper body lags
                if "hips" in keyframes:
                    keyframes["hips"]["rotations"][i] = _quaternion_from_euler(
                        p * 0.04, -p * 0.06, -p * 0.08)
                if "spine" in keyframes:
                    keyframes["spine"]["rotations"][i] = _quaternion_from_euler(
                        -p_upper * 0.06, 0, p_upper * 0.04)
                if "spine1" in keyframes:
                    keyframes["spine1"]["rotations"][i] = _quaternion_from_euler(
                        -p_upper * 0.03, 0, 0)
                if "head" in keyframes:
                    keyframes["head"]["rotations"][i] = _quaternion_from_euler(
                        -p_upper * 0.04, -p_upper * 0.08, 0)
                # Right leg chambers
                if "thigh_r" in keyframes:
                    keyframes["thigh_r"]["rotations"][i] = _quaternion_from_euler(
                        p * 0.55, 0, 0)
                if "shin_r" in keyframes:
                    keyframes["shin_r"]["rotations"][i] = _quaternion_from_euler(
                        -p * 0.70, 0, 0)
                if "foot_r" in keyframes:
                    keyframes["foot_r"]["rotations"][i] = _quaternion_from_euler(
                        -p * 0.15, 0, 0)
                # Support leg bends slightly
                if "thigh_l" in keyframes:
                    keyframes["thigh_l"]["rotations"][i] = _quaternion_from_euler(
                        p * 0.12, 0, 0)
                if "shin_l" in keyframes:
                    keyframes["shin_l"]["rotations"][i] = _quaternion_from_euler(
                        -p * 0.15, 0, 0)
                # Arms in guard position
                if "arm_l" in keyframes:
                    keyframes["arm_l"]["rotations"][i] = _quaternion_from_euler(
                        -p * 0.35, 0, p * 0.10)
                if "arm_r" in keyframes:
                    keyframes["arm_r"]["rotations"][i] = _quaternion_from_euler(
                        -p * 0.30, 0, -p * 0.08)
                if "forearm_l" in keyframes:
                    keyframes["forearm_l"]["rotations"][i] = _quaternion_from_euler(
                        -p * 0.50, 0, 0)
                if "forearm_r" in keyframes:
                    keyframes["forearm_r"]["rotations"][i] = _quaternion_from_euler(
                        -p * 0.45, 0, 0)
                    
            elif t < 0.38:
                # Snap kick — explosive extension, hip leads, shin snaps out
                p = _ease_out_cubic((t - 0.20) / 0.18)
                p_shin = _ease_out_cubic(min(1.0, (t - 0.20) / 0.18 * 0.75))  # shin lags
                if "hips" in keyframes:
                    keyframes["hips"]["rotations"][i] = _quaternion_from_euler(
                        0.04 + p * 0.06, -0.06 - p * 0.04, -0.08)
                if "spine" in keyframes:
                    keyframes["spine"]["rotations"][i] = _quaternion_from_euler(
                        -0.06 - p * 0.06, 0, 0.04)
                if "head" in keyframes:
                    keyframes["head"]["rotations"][i] = _quaternion_from_euler(
                        -0.04, -0.08 + p * 0.04, 0)
                if "thigh_r" in keyframes:
                    keyframes["thigh_r"]["rotations"][i] = _quaternion_from_euler(
                        0.55 + p * 0.50, 0, 0)
                if "shin_r" in keyframes:
                    keyframes["shin_r"]["rotations"][i] = _quaternion_from_euler(
                        -0.70 + p_shin * 0.68, 0, 0)
                if "foot_r" in keyframes:
                    keyframes["foot_r"]["rotations"][i] = _quaternion_from_euler(
                        -0.15 - p * 0.20, 0, 0)
                # Counter-balance: lean back, arms out
                if "arm_l" in keyframes:
                    keyframes["arm_l"]["rotations"][i] = _quaternion_from_euler(
                        -0.35 - p * 0.15, 0, 0.10 + p * 0.08)
                if "arm_r" in keyframes:
                    keyframes["arm_r"]["rotations"][i] = _quaternion_from_euler(
                        -0.30 + p * 0.20, 0, -0.08 - p * 0.06)
                    
            elif t < 0.50:
                # Hold kick peak briefly (impact frame)
                p = (t - 0.38) / 0.12
                if "hips" in keyframes:
                    keyframes["hips"]["rotations"][i] = _quaternion_from_euler(
                        0.10, -0.10, -0.08)
                if "spine" in keyframes:
                    keyframes["spine"]["rotations"][i] = _quaternion_from_euler(
                        -0.12, 0, 0.04)
                if "thigh_r" in keyframes:
                    keyframes["thigh_r"]["rotations"][i] = _quaternion_from_euler(1.05, 0, 0)
                if "shin_r" in keyframes:
                    keyframes["shin_r"]["rotations"][i] = _quaternion_from_euler(
                        -0.02 + p * 0.05, 0, 0)  # slight wobble at peak
                if "foot_r" in keyframes:
                    keyframes["foot_r"]["rotations"][i] = _quaternion_from_euler(-0.35, 0, 0)
                if "arm_l" in keyframes:
                    keyframes["arm_l"]["rotations"][i] = _quaternion_from_euler(
                        -0.50, 0, 0.18)
                if "head" in keyframes:
                    keyframes["head"]["rotations"][i] = _quaternion_from_euler(
                        -0.04, -0.04, 0)
                    
            else:
                # Recovery — retract leg, settle body (overlapping)
                p = _ease_in_out((t - 0.50) / 0.50)
                settle = math.sin(p * math.pi * 1.5) * (1 - p) * 0.06
                p_upper = _ease_in_out(min(1.0, (t - 0.50) / 0.50 * 0.80))
                if "hips" in keyframes:
                    keyframes["hips"]["rotations"][i] = _quaternion_from_euler(
                        0.10 * (1 - p) + settle, -0.10 * (1 - p), -0.08 * (1 - p))
                if "spine" in keyframes:
                    keyframes["spine"]["rotations"][i] = _quaternion_from_euler(
                        -0.12 * (1 - p_upper), 0, 0.04 * (1 - p_upper))
                if "spine1" in keyframes:
                    keyframes["spine1"]["rotations"][i] = _quaternion_from_euler(
                        settle * 0.5, 0, 0)
                if "head" in keyframes:
                    keyframes["head"]["rotations"][i] = _quaternion_from_euler(
                        settle * 0.3, 0, 0)
                if "thigh_r" in keyframes:
                    keyframes["thigh_r"]["rotations"][i] = _quaternion_from_euler(
                        1.05 * (1 - p), 0, 0)
                if "shin_r" in keyframes:
                    keyframes["shin_r"]["rotations"][i] = _quaternion_from_euler(
                        -p * 0.15, 0, 0)
                if "foot_r" in keyframes:
                    keyframes["foot_r"]["rotations"][i] = _quaternion_from_euler(
                        -0.35 * (1 - p), 0, 0)
                if "thigh_l" in keyframes:
                    keyframes["thigh_l"]["rotations"][i] = _quaternion_from_euler(
                        0.12 * (1 - p), 0, 0)
                if "shin_l" in keyframes:
                    keyframes["shin_l"]["rotations"][i] = _quaternion_from_euler(
                        -0.15 * (1 - p), 0, 0)
                if "arm_l" in keyframes:
                    keyframes["arm_l"]["rotations"][i] = _quaternion_from_euler(
                        -0.50 * (1 - p), 0, 0.18 * (1 - p))
                if "arm_r" in keyframes:
                    keyframes["arm_r"]["rotations"][i] = _quaternion_from_euler(
                        -0.10 * (1 - p), 0, -0.14 * (1 - p))
                if "forearm_l" in keyframes:
                    keyframes["forearm_l"]["rotations"][i] = _quaternion_from_euler(
                        -0.50 * (1 - p), 0, 0)
                if "forearm_r" in keyframes:
                    keyframes["forearm_r"]["rotations"][i] = _quaternion_from_euler(
                        -0.45 * (1 - p), 0, 0)
    
    elif animation_id == "celebrate":
        # Celebrate — fist pumps + body bounce with layered timing
        for i in range(n):
            t = i / (n - 1)
            beat = math.sin(t * 4 * math.pi)
            beat_lag = math.sin(t * 4 * math.pi - 0.25)
            groove = math.cos(t * 4 * math.pi)
            pump = max(0, math.sin(t * 4 * math.pi))
            pump_lag = max(0, math.sin(t * 4 * math.pi - 0.3))  # arms lag behind
            double = math.sin(t * 8 * math.pi) * 0.3  # micro-bounces
            
            if "hips" in keyframes:
                keyframes["hips"]["rotations"][i] = _quaternion_from_euler(
                    pump * 0.04 + double * 0.01, beat * 0.14, groove * 0.07)
            if "spine" in keyframes:
                keyframes["spine"]["rotations"][i] = _quaternion_from_euler(
                    -pump_lag * 0.08, -beat_lag * 0.10, -groove * 0.04)
            if "spine1" in keyframes:
                keyframes["spine1"]["rotations"][i] = _quaternion_from_euler(
                    -pump_lag * 0.04, -beat_lag * 0.05, 0)
            if "neck" in keyframes:
                keyframes["neck"]["rotations"][i] = _quaternion_from_euler(
                    pump * 0.05, beat * 0.04, 0)
            if "head" in keyframes:
                keyframes["head"]["rotations"][i] = _quaternion_from_euler(
                    -pump * 0.14 + double * 0.02, beat * 0.08, groove * 0.03)
            if "shoulder_l" in keyframes:
                keyframes["shoulder_l"]["rotations"][i] = _quaternion_from_euler(
                    -pump_lag * 0.15, 0, pump_lag * 0.10)
            if "shoulder_r" in keyframes:
                keyframes["shoulder_r"]["rotations"][i] = _quaternion_from_euler(
                    -pump_lag * 0.15, 0, -pump_lag * 0.10)
            if "arm_l" in keyframes:
                keyframes["arm_l"]["rotations"][i] = _quaternion_from_euler(
                    -0.5 - pump_lag * 0.85, 0, 0.2 + pump_lag * 0.18)
            if "arm_r" in keyframes:
                keyframes["arm_r"]["rotations"][i] = _quaternion_from_euler(
                    -0.5 - pump_lag * 0.85, 0, -0.2 - pump_lag * 0.18)
            if "forearm_l" in keyframes:
                keyframes["forearm_l"]["rotations"][i] = _quaternion_from_euler(
                    -0.6 - pump_lag * 0.35, 0, 0)
            if "forearm_r" in keyframes:
                keyframes["forearm_r"]["rotations"][i] = _quaternion_from_euler(
                    -0.6 - pump_lag * 0.35, 0, 0)
            if "hand_l" in keyframes:
                keyframes["hand_l"]["rotations"][i] = _quaternion_from_euler(
                    pump_lag * 0.08, 0, pump_lag * 0.05)
            if "hand_r" in keyframes:
                keyframes["hand_r"]["rotations"][i] = _quaternion_from_euler(
                    pump_lag * 0.08, 0, -pump_lag * 0.05)
            if "thigh_l" in keyframes:
                keyframes["thigh_l"]["rotations"][i] = _quaternion_from_euler(pump * 0.18, 0, 0)
            if "thigh_r" in keyframes:
                keyframes["thigh_r"]["rotations"][i] = _quaternion_from_euler(max(0, -beat) * 0.18, 0, 0)
            if "shin_l" in keyframes:
                keyframes["shin_l"]["rotations"][i] = _quaternion_from_euler(pump * 0.08, 0, 0)
            if "shin_r" in keyframes:
                keyframes["shin_r"]["rotations"][i] = _quaternion_from_euler(max(0, -beat) * 0.08, 0, 0)
    
    elif animation_id == "bow":
        # Bow — respectful bow with overlapping spine cascade + breathing hold
        for i in range(n):
            t = i / (n - 1)
            
            if t < 0.30:
                # Bend forward — spine cascade: hips start, head follows last
                p = _ease_in_out(t / 0.30)
                p_spine = _ease_in_out(min(1.0, t / 0.30 * 1.10))  # spine slightly ahead
                p_head = _ease_in_out(min(1.0, t / 0.30 * 0.85))   # head lags
                p_arms = _ease_in_out(min(1.0, t / 0.30 * 0.80))   # arms lag more
                if "hips" in keyframes:
                    keyframes["hips"]["rotations"][i] = _quaternion_from_euler(p * 0.35, 0, 0)
                if "spine" in keyframes:
                    keyframes["spine"]["rotations"][i] = _quaternion_from_euler(p_spine * 0.25, 0, 0)
                if "spine1" in keyframes:
                    keyframes["spine1"]["rotations"][i] = _quaternion_from_euler(p_spine * 0.15, 0, 0)
                if "spine2" in keyframes:
                    keyframes["spine2"]["rotations"][i] = _quaternion_from_euler(p_spine * 0.08, 0, 0)
                if "neck" in keyframes:
                    keyframes["neck"]["rotations"][i] = _quaternion_from_euler(p_head * 0.08, 0, 0)
                if "head" in keyframes:
                    keyframes["head"]["rotations"][i] = _quaternion_from_euler(p_head * 0.15, 0, 0)
                # Arms slide to sides
                if "shoulder_l" in keyframes:
                    keyframes["shoulder_l"]["rotations"][i] = _quaternion_from_euler(p_arms * 0.04, 0, p_arms * 0.03)
                if "shoulder_r" in keyframes:
                    keyframes["shoulder_r"]["rotations"][i] = _quaternion_from_euler(p_arms * 0.04, 0, -p_arms * 0.03)
                if "arm_l" in keyframes:
                    keyframes["arm_l"]["rotations"][i] = _quaternion_from_euler(p_arms * 0.12, 0, p_arms * 0.06)
                if "arm_r" in keyframes:
                    keyframes["arm_r"]["rotations"][i] = _quaternion_from_euler(p_arms * 0.12, 0, -p_arms * 0.06)
                if "forearm_l" in keyframes:
                    keyframes["forearm_l"]["rotations"][i] = _quaternion_from_euler(-p_arms * 0.08, 0, 0)
                if "forearm_r" in keyframes:
                    keyframes["forearm_r"]["rotations"][i] = _quaternion_from_euler(-p_arms * 0.08, 0, 0)
                # Slight knee bend for balance
                if "thigh_l" in keyframes:
                    keyframes["thigh_l"]["rotations"][i] = _quaternion_from_euler(p * 0.06, 0, 0)
                if "thigh_r" in keyframes:
                    keyframes["thigh_r"]["rotations"][i] = _quaternion_from_euler(p * 0.06, 0, 0)
                if "shin_l" in keyframes:
                    keyframes["shin_l"]["rotations"][i] = _quaternion_from_euler(-p * 0.04, 0, 0)
                if "shin_r" in keyframes:
                    keyframes["shin_r"]["rotations"][i] = _quaternion_from_euler(-p * 0.04, 0, 0)
                    
            elif t < 0.68:
                # Hold bow — subtle breathing motion for life-like feel
                hold_t = (t - 0.30) / 0.38
                breath = math.sin(hold_t * math.pi * 2.5) * 0.012
                micro_sway = math.sin(hold_t * math.pi * 5) * 0.004
                if "hips" in keyframes:
                    keyframes["hips"]["rotations"][i] = _quaternion_from_euler(0.35, 0, micro_sway)
                if "spine" in keyframes:
                    keyframes["spine"]["rotations"][i] = _quaternion_from_euler(0.25 + breath, 0, 0)
                if "spine1" in keyframes:
                    keyframes["spine1"]["rotations"][i] = _quaternion_from_euler(0.15 + breath * 0.6, 0, 0)
                if "spine2" in keyframes:
                    keyframes["spine2"]["rotations"][i] = _quaternion_from_euler(0.08 + breath * 0.3, 0, 0)
                if "neck" in keyframes:
                    keyframes["neck"]["rotations"][i] = _quaternion_from_euler(0.08, 0, 0)
                if "head" in keyframes:
                    keyframes["head"]["rotations"][i] = _quaternion_from_euler(0.15, 0, micro_sway * 0.5)
                if "arm_l" in keyframes:
                    keyframes["arm_l"]["rotations"][i] = _quaternion_from_euler(0.12, 0, 0.06)
                if "arm_r" in keyframes:
                    keyframes["arm_r"]["rotations"][i] = _quaternion_from_euler(0.12, 0, -0.06)
                if "shoulder_l" in keyframes:
                    keyframes["shoulder_l"]["rotations"][i] = _quaternion_from_euler(0.04 + breath * 0.3, 0, 0.03)
                if "shoulder_r" in keyframes:
                    keyframes["shoulder_r"]["rotations"][i] = _quaternion_from_euler(0.04 + breath * 0.3, 0, -0.03)
                if "thigh_l" in keyframes:
                    keyframes["thigh_l"]["rotations"][i] = _quaternion_from_euler(0.06, 0, 0)
                if "thigh_r" in keyframes:
                    keyframes["thigh_r"]["rotations"][i] = _quaternion_from_euler(0.06, 0, 0)
                    
            else:
                # Rise back up — reverse cascade: head rises first, hips last
                p = _ease_in_out((t - 0.68) / 0.32)
                p_head = _ease_in_out(min(1.0, (t - 0.68) / 0.32 * 1.20))  # head leads
                p_arms = _ease_in_out(min(1.0, (t - 0.68) / 0.32 * 1.10))  # arms lead
                r = 1 - p
                r_head = 1 - p_head
                r_arms = 1 - p_arms
                if "hips" in keyframes:
                    keyframes["hips"]["rotations"][i] = _quaternion_from_euler(0.35 * r, 0, 0)
                if "spine" in keyframes:
                    keyframes["spine"]["rotations"][i] = _quaternion_from_euler(0.25 * r, 0, 0)
                if "spine1" in keyframes:
                    keyframes["spine1"]["rotations"][i] = _quaternion_from_euler(0.15 * r, 0, 0)
                if "spine2" in keyframes:
                    keyframes["spine2"]["rotations"][i] = _quaternion_from_euler(0.08 * r, 0, 0)
                if "neck" in keyframes:
                    keyframes["neck"]["rotations"][i] = _quaternion_from_euler(0.08 * r_head, 0, 0)
                if "head" in keyframes:
                    keyframes["head"]["rotations"][i] = _quaternion_from_euler(0.15 * r_head, 0, 0)
                if "arm_l" in keyframes:
                    keyframes["arm_l"]["rotations"][i] = _quaternion_from_euler(0.12 * r_arms, 0, 0.06 * r_arms)
                if "arm_r" in keyframes:
                    keyframes["arm_r"]["rotations"][i] = _quaternion_from_euler(0.12 * r_arms, 0, -0.06 * r_arms)
                if "shoulder_l" in keyframes:
                    keyframes["shoulder_l"]["rotations"][i] = _quaternion_from_euler(0.04 * r_arms, 0, 0.03 * r_arms)
                if "shoulder_r" in keyframes:
                    keyframes["shoulder_r"]["rotations"][i] = _quaternion_from_euler(0.04 * r_arms, 0, -0.03 * r_arms)
                if "forearm_l" in keyframes:
                    keyframes["forearm_l"]["rotations"][i] = _quaternion_from_euler(-0.08 * r_arms, 0, 0)
                if "forearm_r" in keyframes:
                    keyframes["forearm_r"]["rotations"][i] = _quaternion_from_euler(-0.08 * r_arms, 0, 0)
                if "thigh_l" in keyframes:
                    keyframes["thigh_l"]["rotations"][i] = _quaternion_from_euler(0.06 * r, 0, 0)
                if "thigh_r" in keyframes:
                    keyframes["thigh_r"]["rotations"][i] = _quaternion_from_euler(0.06 * r, 0, 0)
                if "shin_l" in keyframes:
                    keyframes["shin_l"]["rotations"][i] = _quaternion_from_euler(-0.04 * r, 0, 0)
                if "shin_r" in keyframes:
                    keyframes["shin_r"]["rotations"][i] = _quaternion_from_euler(-0.04 * r, 0, 0)
    
    elif animation_id == "look_around":
        # Look around — smooth head/body scan with overlapping action
        for i in range(n):
            t = i / (n - 1)
            # Smooth scan: look slowly left, then right, using sine wave
            look = math.sin(t * 2 * math.pi)
            look_lag = math.sin(t * 2 * math.pi - 0.20)   # neck lags head
            look_body = math.sin(t * 2 * math.pi - 0.40)  # body lags further
            # Subtle vertical bob as attention shifts
            vertical = math.sin(t * 4 * math.pi) * 0.06
            vertical_lag = math.sin(t * 4 * math.pi - 0.15) * 0.04
            
            if "head" in keyframes:
                keyframes["head"]["rotations"][i] = _quaternion_from_euler(
                    vertical,        # subtle up/down with attention
                    look * 0.48,     # main left/right scan
                    look * 0.06      # slight tilt follows gaze
                )
            if "neck" in keyframes:
                keyframes["neck"]["rotations"][i] = _quaternion_from_euler(
                    vertical_lag, look_lag * 0.18, look_lag * 0.02)
            if "spine2" in keyframes:
                keyframes["spine2"]["rotations"][i] = _quaternion_from_euler(
                    0, look_body * 0.10, look_body * 0.015)
            if "spine1" in keyframes:
                keyframes["spine1"]["rotations"][i] = _quaternion_from_euler(
                    0, look_body * 0.06, 0)
            if "spine" in keyframes:
                keyframes["spine"]["rotations"][i] = _quaternion_from_euler(
                    0, look_body * 0.04, 0)
            # Weight shifts with gaze direction
            if "hips" in keyframes:
                keyframes["hips"]["rotations"][i] = _quaternion_from_euler(0, 0, look_body * 0.025)
            # Arms sway subtly with body
            if "arm_l" in keyframes:
                keyframes["arm_l"]["rotations"][i] = _quaternion_from_euler(
                    look_body * 0.03, 0, look_body * 0.015)
            if "arm_r" in keyframes:
                keyframes["arm_r"]["rotations"][i] = _quaternion_from_euler(
                    -look_body * 0.03, 0, -look_body * 0.015)
    
    # ── Post-processing: fill identity bones with subtle parent-inherited motion ──
    # Ensures ALL bones have non-identity rotation → prevents mesh tearing
    # Bones still at identity get ~15% of their parent's rotation as follow-through
    BONE_PARENT = {
        "hips": "root", "spine": "hips", "spine1": "spine",
        "spine2": "spine1", "neck": "spine2", "head": "neck",
        "shoulder_l": "spine2", "arm_l": "shoulder_l",
        "forearm_l": "arm_l", "hand_l": "forearm_l",
        "shoulder_r": "spine2", "arm_r": "shoulder_r",
        "forearm_r": "arm_r", "hand_r": "forearm_r",
        "thigh_l": "hips", "shin_l": "thigh_l",
        "foot_l": "shin_l", "toe_l": "foot_l",
        "thigh_r": "hips", "shin_r": "thigh_r",
        "foot_r": "shin_r", "toe_r": "foot_r",
    }
    
    # Process in parent-first order so cascading inheritance works
    for bone_name in bone_names:
        if bone_name not in keyframes or bone_name == "root":
            continue
        kf = keyframes[bone_name]
        is_identity = True
        for rot in kf["rotations"]:
            if (abs(rot[0]) > 1e-5 or abs(rot[1]) > 1e-5 or
                abs(rot[2]) > 1e-5 or abs(rot[3] - 1.0) > 1e-5):
                is_identity = False
                break
        
        if is_identity and bone_name in BONE_PARENT:
            parent_name = BONE_PARENT[bone_name]
            if parent_name in keyframes:
                parent_rots = keyframes[parent_name]["rotations"]
                factor = 0.15  # inherit 15% of parent rotation
                for i in range(n):
                    pr = parent_rots[i]
                    # Scale quaternion rotation by factor (valid for small angles)
                    nx = pr[0] * factor
                    ny = pr[1] * factor
                    nz = pr[2] * factor
                    nw = pr[3]
                    ln = math.sqrt(nx*nx + ny*ny + nz*nz + nw*nw)
                    if ln > 1e-8:
                        kf["rotations"][i] = [nx/ln, ny/ln, nz/ln, nw/ln]
    
    # ── Post-processing: add hip bounce for locomotion ──
    # Figure-8 pattern: vertical bounce (2x per stride) + lateral sway (1x)
    if animation_id in ("walk", "run", "run_fast", "dance", "celebrate"):
        if "hips" in keyframes:
            n_frames = len(keyframes["hips"]["times"])
            amp = {
                "walk": 0.010, "run": 0.018, "run_fast": 0.025,
                "dance": 0.012, "celebrate": 0.014
            }.get(animation_id, 0.010)
            keyframes["hips"]["translations"] = []
            for i in range(n_frames):
                t = i / (n_frames - 1)
                # Figure-8 hip motion: vertical is 2x frequency, lateral is 1x
                bounce_y = math.sin(t * 4 * math.pi) * amp
                sway_x = math.sin(t * 2 * math.pi) * amp * 0.4
                # Subtle forward lean during push-off
                lean_z = math.sin(t * 4 * math.pi + 0.5) * amp * 0.15
                keyframes["hips"]["translations"].append([sway_x, bounce_y, lean_z])
    
    # ── Hip translation for sit_down and jump ──
    if animation_id == "sit_down":
        if "hips" in keyframes:
            n_frames = len(keyframes["hips"]["times"])
            keyframes["hips"]["translations"] = []
            for i in range(n_frames):
                t = i / (n_frames - 1)
                p = t * t * (3 - 2 * t)  # smooth ease
                keyframes["hips"]["translations"].append([0, -p * 0.08, 0])
    
    if animation_id == "jump":
        if "hips" in keyframes:
            n_frames = len(keyframes["hips"]["times"])
            keyframes["hips"]["translations"] = []
            for i in range(n_frames):
                t = i / (n_frames - 1)
                if t < 0.25:
                    y = -(t / 0.25) * 0.02  # crouch down
                elif t < 0.65:
                    p = (t - 0.25) / 0.40
                    y = -0.02 + p * 0.08  # jump up
                else:
                    p = (t - 0.65) / 0.35
                    y = 0.06 * (1 - p * p)  # land
                keyframes["hips"]["translations"].append([0, y, 0])
    
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
        
        # ── Rotation channel — CUBICSPLINE for Mixamo-smooth interpolation ──
        # CUBICSPLINE output format: [inTangent₀, value₀, outTangent₀, inTangent₁, value₁, outTangent₁, ...]
        # This lets the GPU compute Hermite splines between keyframes → silky smooth.
        time_data = struct.pack(f'<{len(times)}f', *times)
        time_offset = _append_to_buffer(bin_data, time_data, gltf)
        time_bv_idx = _add_buffer_view(gltf, time_offset, len(time_data))
        time_acc_idx = _add_accessor(
            gltf, time_bv_idx, 5126, len(times), "SCALAR",
            min_val=[min(times)], max_val=[max(times)]
        )
        
        # Compute Catmull-Rom tangents for rotation (VEC4 quaternion)
        rot_in_tang, rot_out_tang = _compute_catmull_rom_tangents(
            times, rotations, 4, is_loop
        )
        
        # Pack as interleaved triplets: [inTangent, value, outTangent] per keyframe
        rot_flat = []
        for i in range(len(rotations)):
            rot_flat.extend(rot_in_tang[i])     # inTangent (4 floats)
            rot_flat.extend(rotations[i])        # value     (4 floats)
            rot_flat.extend(rot_out_tang[i])     # outTangent(4 floats)
        
        rot_data = struct.pack(f'<{len(rot_flat)}f', *rot_flat)
        rot_offset = _append_to_buffer(bin_data, rot_data, gltf)
        rot_bv_idx = _add_buffer_view(gltf, rot_offset, len(rot_data))
        # For CUBICSPLINE, accessor count = number of keyframes, but data has 3x elements
        rot_acc_idx = _add_accessor(gltf, rot_bv_idx, 5126, len(rotations) * 3, "VEC4")
        
        samplers.append({
            "input": time_acc_idx,
            "output": rot_acc_idx,
            "interpolation": "CUBICSPLINE"
        })
        channels.append({
            "sampler": sampler_idx,
            "target": {"node": node_idx, "path": "rotation"}
        })
        sampler_idx += 1
        
        # ── Translation channel (hip bounce, etc.) — also CUBICSPLINE ──
        translations = kf.get("translations")
        if translations:
            rest_trans = gltf["nodes"][node_idx].get("translation", [0, 0, 0])
            
            t_time_data = struct.pack(f'<{len(times)}f', *times)
            t_time_offset = _append_to_buffer(bin_data, t_time_data, gltf)
            t_time_bv = _add_buffer_view(gltf, t_time_offset, len(t_time_data))
            t_time_acc = _add_accessor(
                gltf, t_time_bv, 5126, len(times), "SCALAR",
                min_val=[min(times)], max_val=[max(times)]
            )
            
            # Compute absolute translations (rest + delta)
            abs_trans = []
            for dt in translations:
                abs_trans.append([
                    rest_trans[0] + dt[0],
                    rest_trans[1] + dt[1],
                    rest_trans[2] + dt[2]
                ])
            
            # Compute Catmull-Rom tangents for translation (VEC3)
            tr_in_tang, tr_out_tang = _compute_catmull_rom_tangents(
                times, abs_trans, 3, is_loop
            )
            
            # Pack as interleaved triplets
            trans_flat = []
            for i in range(len(abs_trans)):
                trans_flat.extend(tr_in_tang[i])    # inTangent (3 floats)
                trans_flat.extend(abs_trans[i])      # value     (3 floats)
                trans_flat.extend(tr_out_tang[i])    # outTangent(3 floats)
            
            trans_data = struct.pack(f'<{len(trans_flat)}f', *trans_flat)
            trans_offset = _append_to_buffer(bin_data, trans_data, gltf)
            trans_bv = _add_buffer_view(gltf, trans_offset, len(trans_data))
            trans_acc = _add_accessor(gltf, trans_bv, 5126, len(abs_trans) * 3, "VEC3")
            
            samplers.append({
                "input": t_time_acc,
                "output": trans_acc,
                "interpolation": "CUBICSPLINE"
            })
            channels.append({
                "sampler": sampler_idx,
                "target": {"node": node_idx, "path": "translation"}
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
        "walk": {"name": "Walk", "duration": 1.0, "loop": True},
        "dead": {"name": "Dead", "duration": 2.0, "loop": False},
        "run": {"name": "Run", "duration": 0.8, "loop": True},
        "run_fast": {"name": "Run Fast", "duration": 0.6, "loop": True},
        "attack": {"name": "Attack", "duration": 1.2, "loop": False},
        "sit_down": {"name": "Sit Down", "duration": 2.0, "loop": False},
        "jump": {"name": "Jump", "duration": 1.0, "loop": False},
        "wave": {"name": "Wave", "duration": 2.0, "loop": True},
        "clap": {"name": "Clap", "duration": 1.5, "loop": True},
        "punch": {"name": "Punch", "duration": 0.8, "loop": False},
        "kick": {"name": "Kick", "duration": 1.0, "loop": False},
        "celebrate": {"name": "Celebrate", "duration": 3.0, "loop": True},
        "bow": {"name": "Bow", "duration": 2.0, "loop": False},
        "look_around": {"name": "Look Around", "duration": 3.0, "loop": True},
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

@phase2_bp.route('/save-painted', methods=['POST'])
def save_painted_model():
    """
    Receive a painted GLB from the frontend (with COLOR_0 vertex colors baked in)
    and save it to disk so the rig/animate pipeline can use it.
    Accepts raw binary GLB body with modelId in query string.
    """
    try:
        model_id = request.args.get('modelId', str(uuid.uuid4()))
        
        # Accept raw binary GLB
        glb_data = request.get_data()
        if not glb_data or len(glb_data) < 12:
            return jsonify({"ok": False, "error": "No GLB data received"}), 400
        
        # Validate GLB magic number
        magic = struct.unpack_from('<I', glb_data, 0)[0]
        if magic != 0x46546C67:  # 'glTF'
            return jsonify({"ok": False, "error": "Invalid GLB format"}), 400
        
        # Save to outputs directory
        painted_dir = OUTPUT_DIR / "painted"
        painted_dir.mkdir(exist_ok=True)
        
        out_name = f"{model_id}_painted.glb"
        out_path = painted_dir / out_name
        
        with open(out_path, 'wb') as f:
            f.write(glb_data)
        
        print(f"  🎨 Saved painted model: {out_path} ({len(glb_data)} bytes)")
        
        return jsonify({
            "ok": True,
            "painted_model_path": str(out_path),
            "painted_model_url": f"/outputs/painted/{out_name}",
            "size": len(glb_data)
        })
        
    except Exception as e:
        traceback.print_exc()
        return jsonify({"ok": False, "error": str(e)}), 500


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
        print(f"   Prompt: '{prompt}'")
        
        # Pass raw user prompt directly to the texturing service.
        # The procedural texture system parses body-part→color instructions
        # from the prompt (e.g. "pink head, brown legs"). Adding boilerplate
        # like "vivid accurate colors..." would just confuse the parser.
        texture_prompt = prompt or ""
        
        print(f"   📝 Sending to texturing service: '{texture_prompt}'")
        
        result = texturing_service.generate_texture(model_path, style, texture_prompt)
        
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
