"""
TripoSR Image-to-3D Generator
Uses the TripoSR model from StabilityAI for single-image 3D reconstruction
Official repo: https://github.com/VAST-AI-Research/TripoSR

NOTE: Raw mesh is saved in TripoSR's native Z-up coordinate system.
Orientation fix (Z-up → Y-up) is applied in postprocessing.py by directly
swapping vertex coordinates — this is more reliable than apply_transform
which can be lost during GLB export/import round-trips.

Key pipeline settings (OFFICIAL DEFAULTS — proven on YouTube demos):
- MC Resolution: 256 (official default, clean meshes)
- Density Threshold: 25 (official default, prevents blob geometry)
- Bake Texture: True (proper UV-mapped texture atlas vs vertex colors)
- Texture Resolution: 2048 (texture atlas pixel resolution)

LESSON LEARNED: Previous settings (MC 512, threshold 10) caused issues:
- Threshold 10 extracted noise as geometry → blob models
- Aggressive postprocessing then destroyed what little detail remained

Optimized for RTX 3060 12GB
"""
import torch
import numpy as np
from PIL import Image
from pathlib import Path
import sys
import os
import gc
import trimesh
import trimesh.transformations


# Resolve TripoSR path relative to THIS file, not CWD
_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
TRIPOSR_PATH = os.getenv("TRIPOSR_PATH", os.path.join(_THIS_DIR, "TripoSR"))
if os.path.exists(TRIPOSR_PATH):
    sys.path.insert(0, TRIPOSR_PATH)
    print(f"✅ TripoSR path resolved: {TRIPOSR_PATH}")

from config import TripoConfig, DEVICE, OUTPUT_DIR, CACHE_DIR

try:
    from gpu_optimizer import gpu_optimizer
    GPU_OPTIMIZER_AVAILABLE = True
except ImportError:
    GPU_OPTIMIZER_AVAILABLE = False


def check_vram_before_inference():
    """Check if enough VRAM is available, clear if needed"""
    if not torch.cuda.is_available():
        return
    
    allocated = torch.cuda.memory_allocated() / (1024 ** 3)
    total = torch.cuda.get_device_properties(0).total_memory / (1024 ** 3)
    free = total - allocated
    
    
    if free < 4.0:
        print(f"⚠️ Low VRAM ({free:.1f}GB free), clearing cache...")
        torch.cuda.empty_cache()
        gc.collect()
        
        
        allocated = torch.cuda.memory_allocated() / (1024 ** 3)
        free = total - allocated
        print(f"  ✓ After clear: {free:.1f}GB free")


def _download_triposr_files():
    """Pre-download TripoSR files to local cache using hf_hub_download (supports resume)"""
    from huggingface_hub import hf_hub_download
    
    config_path = hf_hub_download(
        repo_id=TripoConfig.MODEL_ID,
        filename="config.yaml",
        cache_dir=str(CACHE_DIR)
    )
    weight_path = hf_hub_download(
        repo_id=TripoConfig.MODEL_ID,
        filename="model.ckpt",
        cache_dir=str(CACHE_DIR)
    )
    return config_path, weight_path


class TripoSRGenerator:
    def __init__(self):
        self.model = None
        self.initialized = False
        self.use_local = False
        
    def _load_model(self):
        """Load TripoSR model"""
        if self.initialized:
            return
            
        print("📦 Loading TripoSR model...")
        
        try:
           
            from tsr.system import TSR
            
            print("  📥 Checking model files in cache...")
            config_path, weight_path = _download_triposr_files()
            

            local_dir = str(Path(config_path).parent)
            self.model = TSR.from_pretrained(
                local_dir,
                config_name="config.yaml",
                weight_name="model.ckpt"
            )
            self.model.to(DEVICE)
            self.use_local = True
            
  
            if DEVICE == "cuda":
                try:
                    self.model.renderer.set_chunk_size(TripoConfig.CHUNK_SIZE)
                except:
                    pass
            
        except ImportError as e:
    
            print(f"  ⚠️ Local TripoSR not found ({e})")
            print(f"  📁 Expected TripoSR at: {TRIPOSR_PATH}")
            print(f"  📁 Exists? {os.path.exists(TRIPOSR_PATH)}")
            if os.path.exists(TRIPOSR_PATH):
                print(f"  📁 Contents: {os.listdir(TRIPOSR_PATH)}")
                tsr_dir = os.path.join(TRIPOSR_PATH, "tsr")
                if os.path.exists(tsr_dir):
                    print(f"  📁 tsr/ contents: {os.listdir(tsr_dir)}")
                else:
                    print(f"  ❌ tsr/ directory NOT FOUND in {TRIPOSR_PATH}")
            
            # Try again with absolute path forced into sys.path
            abs_triposr = os.path.abspath(TRIPOSR_PATH)
            if abs_triposr not in sys.path:
                sys.path.insert(0, abs_triposr)
            
            try:
                from tsr.system import TSR
                print("  ✅ TripoSR found after path fix!")
                
                config_path, weight_path = _download_triposr_files()
                local_dir = str(Path(config_path).parent)
                self.model = TSR.from_pretrained(
                    local_dir,
                    config_name="config.yaml",
                    weight_name="model.ckpt"
                )
                self.model.to(DEVICE)
                self.use_local = True
                
                if DEVICE == "cuda":
                    try:
                        self.model.renderer.set_chunk_size(TripoConfig.CHUNK_SIZE)
                    except:
                        pass
            except ImportError as e2:
                raise RuntimeError(
                    f"TripoSR module 'tsr' not found. "
                    f"Checked paths: {TRIPOSR_PATH}, {abs_triposr}. "
                    f"Make sure TripoSR is cloned into AI-service/TripoSR/. "
                    f"Original error: {e2}"
                )
        
        self.initialized = True
        print("  ✓ TripoSR loaded")
        
    def generate_3d(
        self,
        image: Image.Image,
        output_path: str = None,
        mc_resolution: int = None,
        mc_threshold: float = None,
        bake_texture: bool = None,
        texture_resolution: int = None
    ) -> str:
        """
        Generate 3D mesh from image using TripoSR.
        
        Follows the official VAST-AI-Research/TripoSR pipeline:
        1. Run model inference → scene_codes
        2. Extract mesh via marching cubes (resolution, threshold)
        3. Optionally bake UV-mapped texture atlas (much better than vertex colors)
        
        Args:
            image: Preprocessed PIL Image (should have gray background)
            output_path: Where to save the .glb file
            mc_resolution: Marching cubes grid resolution (default 512)
            mc_threshold: Density threshold for surface extraction (default 10.0)
            bake_texture: Whether to bake UV-mapped texture (default from config)
            texture_resolution: Texture atlas resolution in pixels (default 2048)
            
        Returns:
            Path to the generated .glb file
        """
 
        check_vram_before_inference()
        
        self._load_model()
        
        if mc_resolution is None:
            mc_resolution = TripoConfig.MC_RESOLUTION
    
            if GPU_OPTIMIZER_AVAILABLE:
                mc_resolution = gpu_optimizer.optimizations["triposr"]["mc_resolution"]
        
        if mc_threshold is None:
            mc_threshold = TripoConfig.MC_THRESHOLD
        
        if bake_texture is None:
            bake_texture = TripoConfig.BAKE_TEXTURE
        
        if texture_resolution is None:
            texture_resolution = TripoConfig.TEXTURE_RESOLUTION
            

        if output_path is None:
            import uuid
            output_path = str(OUTPUT_DIR / f"{uuid.uuid4()}.glb")
        
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Log image info for debugging
        print(f"🔮 Generating 3D model...")
        print(f"  Image size: {image.size}, mode: {image.mode}")
        print(f"  MC resolution: {mc_resolution}, threshold: {mc_threshold}")
        print(f"  Bake texture: {bake_texture}, texture res: {texture_resolution}")
        
        # Verify image has actual content (not blank)
        img_array = np.array(image)
        img_std = img_array.std()
        print(f"  Image std deviation: {img_std:.2f} (should be >10 for good content)")
        if img_std < 5:
            print("  ⚠️ WARNING: Image appears nearly blank! Check preprocessing.")
        
        with torch.inference_mode():
            # Run TripoSR inference
            try:
                if self.use_local:
                    # Pass image to TripoSR model
                    # The model's ImagePreprocessor will convert & resize internally
                    scene_codes = self.model([image], device=DEVICE)
                    
                    # Extract mesh — when baking texture, we DON'T need vertex colors
                    # (the texture atlas provides colors instead)
                    has_vertex_color = not bake_texture
                    
                    meshes = self.model.extract_mesh(
                        scene_codes,
                        has_vertex_color=has_vertex_color,
                        resolution=mc_resolution,
                        threshold=mc_threshold
                    )
                    
                    mesh = meshes[0]
                    
                    print(f"  ✓ Mesh extracted: {len(mesh.vertices)} verts, {len(mesh.faces)} faces")
                    
                    # Bake texture: UV-mapped texture atlas (from official TripoSR repo)
                    # This gives MUCH better visual quality than vertex colors
                    if bake_texture:
                        mesh = self._bake_texture_atlas(
                            mesh, scene_codes[0], texture_resolution
                        )
                    
                    # NOTE: Do NOT apply orientation here.
                    # TripoSR outputs Z-up. The GLB round-trip (export→load in
                    # postprocessing) can lose transforms applied via apply_transform.
                    # Orientation fix is done in postprocessing.py AFTER all mesh
                    # operations, by directly swapping vertex coordinates.
                    
                    mesh.export(str(output_path))
                else:
                    if image.mode != 'RGB':
                        image = image.convert('RGB')
                    
                    with torch.no_grad():
                        outputs = self.model(image, device=DEVICE)
                    
                    if hasattr(outputs, 'meshes') and len(outputs.meshes) > 0:
                        mesh = outputs.meshes[0]
                        mesh.export(str(output_path))
                    elif hasattr(self.model, 'extract_mesh'):
                        meshes = self.model.extract_mesh(outputs, resolution=mc_resolution)
                        mesh = meshes[0]
                        mesh.export(str(output_path))
                    else:
                        raise Exception("Could not extract mesh from model output")
                
            except Exception as e:
                print(f"  ⚠️ Error during generation: {e}")
                import traceback
                traceback.print_exc()
                raise Exception(f"3D generation failed: {e}")
        
        # Log mesh stats
        try:
            mesh_check = trimesh.load(str(output_path), force='mesh')
            print(f"  ✓ Model saved: {len(mesh_check.vertices)} verts, {len(mesh_check.faces)} faces")
            extents = mesh_check.extents
            print(f"  ✓ Extents: X={extents[0]:.3f}, Y={extents[1]:.3f}, Z={extents[2]:.3f}")
        except:
            print(f"  ✓ Model saved to {output_path}")
        
        return str(output_path)
    
    def _bake_texture_atlas(
        self,
        mesh: 'trimesh.Trimesh',
        scene_code: torch.Tensor,
        texture_resolution: int = 2048
    ) -> 'trimesh.Trimesh':
        """
        Bake a UV-mapped texture atlas for the mesh.
        
        This is from the official TripoSR repo (tsr/bake_texture.py):
        1. Generate UV atlas with xatlas
        2. Rasterize position map 
        3. Query TripoSR's triplane for colors at each UV position
        4. Export mesh with UV map + texture image
        
        Falls back to vertex colors if baking dependencies are missing.
        """
        print("  → Baking texture atlas (UV-mapped)...")
        
        try:
            from tsr.bake_texture import bake_texture
            import xatlas
            
            bake_output = bake_texture(
                mesh, self.model, scene_code, texture_resolution
            )
            
            # Create the textured mesh using xatlas export format
            # Re-map vertices and faces according to UV atlas
            textured_vertices = mesh.vertices[bake_output["vmapping"]]
            textured_normals = mesh.vertex_normals[bake_output["vmapping"]]
            textured_faces = bake_output["indices"]
            textured_uvs = bake_output["uvs"]
            
            # Create texture image
            texture_colors = bake_output["colors"]
            texture_image = Image.fromarray(
                (texture_colors * 255.0).astype(np.uint8)
            ).transpose(Image.FLIP_TOP_BOTTOM)
            
            # Build a trimesh with proper UV mapping and texture
            import trimesh.visual
            
            material = trimesh.visual.material.PBRMaterial(
                baseColorTexture=texture_image,
                metallicFactor=0.0,
                roughnessFactor=1.0
            )
            
            visual = trimesh.visual.TextureVisuals(
                uv=textured_uvs,
                material=material
            )
            
            textured_mesh = trimesh.Trimesh(
                vertices=textured_vertices,
                faces=textured_faces,
                vertex_normals=textured_normals,
                visual=visual
            )
            
            print(f"    ✓ Texture baked: {texture_resolution}x{texture_resolution}px atlas")
            print(f"    ✓ UV-mapped mesh: {len(textured_vertices)} verts, {len(textured_faces)} faces")
            return textured_mesh
            
        except ImportError as e:
            print(f"    ⚠️ Bake-texture dependencies missing ({e})")
            print(f"    → Install with: pip install xatlas moderngl")
            print(f"    → Falling back to vertex colors")
            
            # Re-extract with vertex colors
            scene_codes_batch = scene_code.unsqueeze(0)
            meshes = self.model.extract_mesh(
                scene_codes_batch,
                has_vertex_color=True,
                resolution=TripoConfig.MC_RESOLUTION,
                threshold=TripoConfig.MC_THRESHOLD
            )
            return meshes[0]
            
        except Exception as e:
            print(f"    ⚠️ Texture baking failed: {e}")
            print(f"    → Falling back to vertex colors")
            import traceback
            traceback.print_exc()
            
            # Re-extract with vertex colors
            scene_codes_batch = scene_code.unsqueeze(0)
            meshes = self.model.extract_mesh(
                scene_codes_batch,
                has_vertex_color=True,
                resolution=TripoConfig.MC_RESOLUTION,
                threshold=TripoConfig.MC_THRESHOLD
            )
            return meshes[0]
        
        return str(output_path)
    
    def _apply_orientation_fix(self, mesh: 'trimesh.Trimesh') -> 'trimesh.Trimesh':
        """
        Apply TripoSR's official orientation fix (to_gradio_3d_orientation).
        
        TripoSR's coordinate system (from tsr/utils.py get_spherical_cameras):
            "right hand coordinate system, x back, y right, z up"
        
        GLB/Three.js coordinate system:
            Y-up, -Z forward
        
        Transform:
            1. Rotate -90° around X: converts Z-up → Y-up
            2. Rotate +90° around Y: adjusts front-facing direction
        
        This is applied IMMEDIATELY after mesh extraction, BEFORE any GLB export,
        to avoid coordinate system issues from GLB format round-trips.
        """
        print("  → Fixing orientation (TripoSR Z-up → GLB Y-up)...")
        
        # Step 1: Z-up → Y-up
        rot_x = trimesh.transformations.rotation_matrix(-np.pi / 2, [1, 0, 0])
        mesh.apply_transform(rot_x)
        
        # Step 2: Adjust front-facing direction
        rot_y = trimesh.transformations.rotation_matrix(np.pi / 2, [0, 1, 0])
        mesh.apply_transform(rot_y)
        
        extents = mesh.extents
        print(f"    ✓ Oriented: X={extents[0]:.3f}, Y={extents[1]:.3f}, Z={extents[2]:.3f}")
        return mesh
    
    def _export_to_glb(self, vertices: np.ndarray, faces: np.ndarray, path: str):
        """Export mesh to GLB format using trimesh"""
        import trimesh
        
        mesh = trimesh.Trimesh(vertices=vertices, faces=faces)
        mesh.export(path, file_type='glb')
        
    def unload(self):
        """Unload model to free VRAM"""
        if self.model is not None:
            del self.model
            self.model = None
            self.initialized = False
        if DEVICE == "cuda":
            torch.cuda.empty_cache()
        print("🗑️ TripoSR unloaded")


# Singleton instance
triposr_generator = TripoSRGenerator()


def image_to_3d(image: Image.Image, output_path: str = None) -> str:
    """
    Convenience function for image to 3D generation
    """
    return triposr_generator.generate_3d(image, output_path)


if __name__ == "__main__":
  
    if len(sys.argv) > 1:
        img_path = sys.argv[1]
        output = sys.argv[2] if len(sys.argv) > 2 else "test_model.glb"
        
        img = Image.open(img_path)
        result_path = image_to_3d(img, output)
        print(f"Model saved to: {result_path}")
    else:
        print("Usage: python triposr_wrapper.py <image_path> [output_path]")
