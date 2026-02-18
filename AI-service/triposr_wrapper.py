"""
TripoSR Image-to-3D Generator
Uses the TripoSR model from StabilityAI for single-image 3D reconstruction

Optimized for RTX 3060 12GB
"""
import torch
import numpy as np
from PIL import Image
from pathlib import Path
import sys
import os
import gc

# Add TripoSR to path if cloned locally
TRIPOSR_PATH = os.getenv("TRIPOSR_PATH", "./TripoSR")
if os.path.exists(TRIPOSR_PATH):
    sys.path.insert(0, TRIPOSR_PATH)

from config import TripoConfig, DEVICE, OUTPUT_DIR

# Import GPU optimizer
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
    
    # TripoSR needs ~3-4GB, require at least 4GB free
    if free < 4.0:
        print(f"⚠️ Low VRAM ({free:.1f}GB free), clearing cache...")
        torch.cuda.empty_cache()
        gc.collect()
        
        # Check again
        allocated = torch.cuda.memory_allocated() / (1024 ** 3)
        free = total - allocated
        print(f"  ✓ After clear: {free:.1f}GB free")


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
            # Try to import from local TripoSR installation
            from tsr.system import TSR
            
            self.model = TSR.from_pretrained(
                TripoConfig.MODEL_ID,
                config_name="config.yaml",
                weight_name="model.ckpt"
            )
            self.model.to(DEVICE)
            self.use_local = True
            
            # Enable optimizations for local version
            if DEVICE == "cuda":
                try:
                    self.model.renderer.set_chunk_size(TripoConfig.CHUNK_SIZE)
                except:
                    pass
            
        except ImportError as e:
            # Fallback: Use HuggingFace transformers version
            print(f"  ⚠️ Local TripoSR not found ({e}), using HuggingFace version...")
            from transformers import AutoModel, AutoProcessor
            
            self.model = AutoModel.from_pretrained(
                "stabilityai/TripoSR",
                trust_remote_code=True
            )
            self.model.to(DEVICE)
            self.use_local = False
        
        self.initialized = True
        print("  ✓ TripoSR loaded")
        
    def generate_3d(
        self,
        image: Image.Image,
        output_path: str = None,
        mc_resolution: int = None
    ) -> str:
        """
        Generate 3D mesh from image
        
        Args:
            image: Preprocessed PIL Image (should have white/clean background)
            output_path: Where to save the .glb file
            mc_resolution: Marching cubes resolution
            
        Returns:
            Path to the generated .glb file
        """
        # Check VRAM before loading model
        check_vram_before_inference()
        
        self._load_model()
        
        if mc_resolution is None:
            mc_resolution = TripoConfig.MC_RESOLUTION
            # Use GPU optimizer settings if available
            if GPU_OPTIMIZER_AVAILABLE:
                mc_resolution = gpu_optimizer.optimizations["triposr"]["mc_resolution"]
            
        # Generate output path if not provided
        if output_path is None:
            import uuid
            output_path = str(OUTPUT_DIR / f"{uuid.uuid4()}.glb")
        
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        print(f"🔮 Generating 3D model (resolution: {mc_resolution})...")
        
        with torch.inference_mode():
            # Run TripoSR inference
            try:
                if self.use_local:
                    # For local TripoSR
                    scene_codes = self.model([image], device=DEVICE)
                    
                    # Extract mesh using marching cubes
                    meshes = self.model.extract_mesh(
                        scene_codes,
                        resolution=mc_resolution
                    )
                    
                    # Export to GLB
                    mesh = meshes[0]
                    mesh.export(str(output_path))
                else:
                    # For HuggingFace version
                    # Preprocess image
                    if image.mode != 'RGB':
                        image = image.convert('RGB')
                    
                    # Run model
                    with torch.no_grad():
                        outputs = self.model(image, device=DEVICE)
                    
                    # Extract mesh
                    if hasattr(outputs, 'meshes') and len(outputs.meshes) > 0:
                        mesh = outputs.meshes[0]
                        mesh.export(str(output_path))
                    elif hasattr(self.model, 'extract_mesh'):
                        meshes = self.model.extract_mesh(outputs, resolution=mc_resolution)
                        meshes[0].export(str(output_path))
                    else:
                        raise Exception("Could not extract mesh from model output")
                
            except Exception as e:
                print(f"  ⚠️ Error during generation: {e}")
                
                # Fallback: Try alternative method
                try:
                    # Ensure image is properly formatted
                    if image.mode != 'RGB':
                        image = image.convert('RGB')
                    
                    # Try calling with different API
                    result = self.model(image)
                    
                    if hasattr(result, 'export'):
                        result.export(str(output_path))
                    elif isinstance(result, tuple) and len(result) >= 2:
                        vertices, faces = result[0], result[1]
                        if isinstance(vertices, torch.Tensor):
                            vertices = vertices.cpu().numpy()
                        if isinstance(faces, torch.Tensor):
                            faces = faces.cpu().numpy()
                        self._export_to_glb(vertices, faces, str(output_path))
                    else:
                        raise Exception(f"Unexpected output format: {type(result)}")
                        
                except Exception as e2:
                    raise Exception(f"All generation methods failed: {e}, {e2}")
        
        print(f"  ✓ Model saved to {output_path}")
        return str(output_path)
    
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
    # Test generation
    if len(sys.argv) > 1:
        img_path = sys.argv[1]
        output = sys.argv[2] if len(sys.argv) > 2 else "test_model.glb"
        
        img = Image.open(img_path)
        result_path = image_to_3d(img, output)
        print(f"Model saved to: {result_path}")
    else:
        print("Usage: python triposr_wrapper.py <image_path> [output_path]")
