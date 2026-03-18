"""
Hunyuan3D-2 Image-to-3D Generator
Uses Tencent's Hunyuan3D-2 for high-quality single-image 3D reconstruction
with built-in texture synthesis.

Official repo: https://github.com/Tencent-Hunyuan/Hunyuan3D-2

Key advantages over TripoSR:
- Flow-matching diffusion transformer (1.1B params) for shape
- Dedicated paint model (1.3B params) for UV-mapped texture
- Much higher geometry detail and texture quality
- Native Y-up output (GLB standard) — no orientation fix needed
- Built-in background removal and mesh cleanup

Pipeline:
1. Background removal (if needed)
2. Shape generation via Hunyuan3D-DiT (flow matching diffusion)
3. Mesh post-processing (floater removal, face reduction)
4. Texture synthesis via Hunyuan3D-Paint (multiview baking)
5. Export as GLB

VRAM Requirements:
- Shape only: ~6 GB
- Shape + Texture: ~16 GB
- With low_vram_mode: fits in 12 GB (RTX 3060)

Turbo mode available for 5-step inference (vs 50 standard).
"""
import torch
import numpy as np
from PIL import Image
from pathlib import Path
import sys
import os
import gc
import trimesh
import time

from config import Hunyuan3DConfig, DEVICE, OUTPUT_DIR, CACHE_DIR

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


class Hunyuan3DGenerator:
    """
    Hunyuan3D-2 Image-to-3D Generator.

    Two-stage pipeline:
    1. Shape generation: Hunyuan3D-DiT (flow matching diffusion transformer)
    2. Texture synthesis: Hunyuan3D-Paint (multiview texture baking)

    Uses Turbo models by default for faster inference on consumer GPUs.
    """

    def __init__(self):
        self.shape_pipeline = None
        self.texture_pipeline = None
        self.rembg_processor = None
        self.floater_remover = None
        self.degenerate_remover = None
        self.face_reducer = None
        self.initialized_shape = False
        self.initialized_texture = False
        self.initialized_rembg = False

    def _load_rembg(self):
        """Load Hunyuan3D's built-in background remover"""
        if self.initialized_rembg:
            return

        print("📦 Loading background remover...")
        try:
            from hy3dgen.rembg import BackgroundRemover
            self.rembg_processor = BackgroundRemover()
            print("  ✓ Hunyuan3D BackgroundRemover loaded")
        except ImportError:
            print("  ⚠️ Hunyuan3D rembg not available, falling back to rembg library")
            self.rembg_processor = None

        self.initialized_rembg = True

    def _load_shape_model(self):
        """Load Hunyuan3D-DiT shape generation model"""
        if self.initialized_shape:
            return

        check_vram_before_inference()

        print("📦 Loading Hunyuan3D-DiT shape model...")
        print(f"  Model: {Hunyuan3DConfig.SHAPE_MODEL_PATH}")
        print(f"  Subfolder: {Hunyuan3DConfig.SHAPE_SUBFOLDER}")

        from hy3dgen.shapegen import (
            Hunyuan3DDiTFlowMatchingPipeline,
            FloaterRemover,
            DegenerateFaceRemover,
            FaceReducer
        )

        kwargs = {
            'use_safetensors': True,
        }

        if Hunyuan3DConfig.SHAPE_SUBFOLDER:
            kwargs['subfolder'] = Hunyuan3DConfig.SHAPE_SUBFOLDER

        if Hunyuan3DConfig.USE_FP16:
            kwargs['variant'] = 'fp16'

        self.shape_pipeline = Hunyuan3DDiTFlowMatchingPipeline.from_pretrained(
            Hunyuan3DConfig.SHAPE_MODEL_PATH,
            **kwargs
        )

        # Enable FlashVDM for turbo mode (much faster)
        if Hunyuan3DConfig.USE_TURBO:
            try:
                self.shape_pipeline.enable_flashvdm()
                print("  ✓ FlashVDM (turbo) enabled")
            except Exception as e:
                print(f"  ⚠️ FlashVDM not available: {e}")

        # Enable low VRAM mode for 12GB cards
        if Hunyuan3DConfig.LOW_VRAM_MODE:
            try:
                self.shape_pipeline.enable_model_cpu_offload()
                print("  ✓ CPU offload enabled (low VRAM mode)")
            except Exception as e:
                print(f"  ⚠️ CPU offload failed: {e}")

        # Initialize mesh post-processors
        self.floater_remover = FloaterRemover()
        self.degenerate_remover = DegenerateFaceRemover()
        self.face_reducer = FaceReducer()

        self.initialized_shape = True
        print("  ✓ Hunyuan3D-DiT shape model loaded")

    def _load_texture_model(self):
        """Load Hunyuan3D-Paint texture synthesis model"""
        if self.initialized_texture:
            return

        if not Hunyuan3DConfig.ENABLE_TEXTURE:
            print("  ⚠️ Texture generation disabled in config")
            return

        check_vram_before_inference()

        print("📦 Loading Hunyuan3D-Paint texture model...")
        print(f"  Model: {Hunyuan3DConfig.TEXTURE_MODEL_PATH}")

        try:
            from hy3dgen.texgen import Hunyuan3DPaintPipeline

            kwargs = {}
            if Hunyuan3DConfig.TEXTURE_SUBFOLDER:
                kwargs['subfolder'] = Hunyuan3DConfig.TEXTURE_SUBFOLDER

            self.texture_pipeline = Hunyuan3DPaintPipeline.from_pretrained(
                Hunyuan3DConfig.TEXTURE_MODEL_PATH,
                **kwargs
            )

            # Enable low VRAM mode
            if Hunyuan3DConfig.LOW_VRAM_MODE:
                try:
                    self.texture_pipeline.enable_model_cpu_offload()
                    print("  ✓ Texture model CPU offload enabled")
                except Exception as e:
                    print(f"  ⚠️ Texture CPU offload failed: {e}")

            self.initialized_texture = True
            print("  ✓ Hunyuan3D-Paint texture model loaded")
        except ImportError as e:
            print(f"  ⚠️ Texture model dependencies missing: {e}")
            print("  → Texture generation requires custom_rasterizer and differentiable_renderer")
            print("  → Run: cd hy3dgen/texgen/custom_rasterizer && python setup.py install")
            self.initialized_texture = False
        except Exception as e:
            print(f"  ⚠️ Texture model failed to load: {e}")
            self.initialized_texture = False

    def _prepare_image(self, image: Image.Image) -> Image.Image:
        """
        Prepare image for Hunyuan3D inference.

        Hunyuan3D expects RGBA image with background removed.
        If image is RGB, we remove the background first.
        """
        # Ensure we have background removal
        self._load_rembg()

        # Convert to RGBA if needed
        if image.mode != 'RGBA':
            image = image.convert('RGBA')

        # Check if background already removed (has transparency)
        extrema = image.getextrema()
        has_alpha = len(extrema) >= 4 and extrema[3][0] < 250

        if not has_alpha:
            print("  → Removing background for Hunyuan3D...")
            if self.rembg_processor is not None:
                image = self.rembg_processor(image)
            else:
                # Fallback to rembg library
                try:
                    import rembg
                    image = rembg.remove(image)
                    image = image.convert('RGBA')
                except Exception as e:
                    print(f"  ⚠️ Background removal failed: {e}")
        else:
            print("  → Image already has transparency, skipping rembg")

        return image

    def generate_3d(
        self,
        image: Image.Image,
        output_path: str = None,
        num_inference_steps: int = None,
        guidance_scale: float = None,
        octree_resolution: int = None,
        num_chunks: int = None,
        seed: int = None,
        with_texture: bool = None,
        max_faces: int = None,
    ) -> str:
        """
        Generate 3D mesh from image using Hunyuan3D-2.

        Full pipeline:
        1. Prepare image (remove background → RGBA)
        2. Generate shape via Hunyuan3D-DiT
        3. Clean mesh (remove floaters, degenerate faces)
        4. Reduce faces if needed
        5. (Optional) Generate texture via Hunyuan3D-Paint
        6. Export as GLB

        Args:
            image: Input PIL Image (RGB or RGBA)
            output_path: Where to save the .glb file
            num_inference_steps: Diffusion steps (5 for turbo, 50 for quality)
            guidance_scale: Classifier-free guidance scale
            octree_resolution: Mesh extraction resolution (256-512)
            num_chunks: Number of chunks for mesh extraction
            seed: Random seed for reproducibility
            with_texture: Whether to generate texture (default from config)
            max_faces: Maximum face count for mesh reduction

        Returns:
            Path to the generated .glb file
        """
        check_vram_before_inference()

        # Load shape model
        self._load_shape_model()

        # Apply defaults from config
        if num_inference_steps is None:
            num_inference_steps = Hunyuan3DConfig.NUM_INFERENCE_STEPS
        if guidance_scale is None:
            guidance_scale = Hunyuan3DConfig.GUIDANCE_SCALE
        if octree_resolution is None:
            octree_resolution = Hunyuan3DConfig.OCTREE_RESOLUTION
        if num_chunks is None:
            num_chunks = Hunyuan3DConfig.NUM_CHUNKS
        if with_texture is None:
            with_texture = Hunyuan3DConfig.ENABLE_TEXTURE
        if max_faces is None:
            max_faces = Hunyuan3DConfig.MAX_FACES
        if seed is None:
            seed = Hunyuan3DConfig.DEFAULT_SEED

        # Prepare output path
        if output_path is None:
            import uuid
            output_path = str(OUTPUT_DIR / f"{uuid.uuid4()}.glb")

        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        # Step 1: Prepare image
        print(f"🔮 Generating 3D model with Hunyuan3D-2...")
        print(f"  Image size: {image.size}, mode: {image.mode}")
        print(f"  Steps: {num_inference_steps}, guidance: {guidance_scale}")
        print(f"  Octree resolution: {octree_resolution}, chunks: {num_chunks}")
        print(f"  Texture: {with_texture}, max faces: {max_faces}")
        print(f"  Seed: {seed}")

        prepared_image = self._prepare_image(image)

        # Step 2: Generate shape
        print("\n  📐 Generating shape (Hunyuan3D-DiT)...")
        start_time = time.time()

        generator = torch.Generator(device='cpu').manual_seed(seed)

        with torch.inference_mode():
            mesh = self.shape_pipeline(
                image=prepared_image,
                num_inference_steps=num_inference_steps,
                guidance_scale=guidance_scale,
                octree_resolution=octree_resolution,
                num_chunks=num_chunks,
                generator=generator,
                output_type='trimesh'
            )[0]

        shape_time = time.time() - start_time
        print(f"  ✓ Shape generated in {shape_time:.1f}s")
        print(f"    Vertices: {len(mesh.vertices)}, Faces: {len(mesh.faces)}")

        # Step 3: Clean mesh
        print("\n  🧹 Cleaning mesh...")
        try:
            mesh = self.floater_remover(mesh)
            print("    ✓ Floaters removed")
        except Exception as e:
            print(f"    ⚠️ Floater removal failed: {e}")

        try:
            mesh = self.degenerate_remover(mesh)
            print("    ✓ Degenerate faces removed")
        except Exception as e:
            print(f"    ⚠️ Degenerate removal failed: {e}")

        # Step 4: Reduce faces
        if max_faces > 0 and len(mesh.faces) > max_faces:
            print(f"  → Reducing faces: {len(mesh.faces)} → {max_faces}...")
            try:
                mesh = self.face_reducer(mesh, max_facenum=max_faces)
                print(f"    ✓ Reduced to {len(mesh.faces)} faces")
            except Exception as e:
                print(f"    ⚠️ Face reduction failed: {e}")

        # Step 5: Generate texture (if enabled and model loaded)
        if with_texture:
            print("\n  🎨 Generating texture (Hunyuan3D-Paint)...")
            tex_start = time.time()

            # Free shape model VRAM before loading texture model
            if Hunyuan3DConfig.LOW_VRAM_MODE:
                print("    → Freeing shape model VRAM...")
                torch.cuda.empty_cache()
                gc.collect()

            try:
                self._load_texture_model()
                if self.initialized_texture and self.texture_pipeline is not None:
                    mesh = self.texture_pipeline(mesh, image=prepared_image)
                    tex_time = time.time() - tex_start
                    print(f"    ✓ Texture generated in {tex_time:.1f}s")
                else:
                    print("    ⚠️ Texture pipeline not available, exporting without texture")
            except Exception as e:
                print(f"    ⚠️ Texture generation failed: {e}")
                import traceback
                traceback.print_exc()
                print("    → Exporting shape without texture")

        # Step 6: Export
        print(f"\n  💾 Exporting to {output_path}...")
        mesh.export(str(output_path))

        # Verify
        try:
            check = trimesh.load(str(output_path), force='mesh')
            print(f"  ✓ Model saved: {len(check.vertices)} verts, {len(check.faces)} faces")
            extents = check.extents
            print(f"  ✓ Extents: X={extents[0]:.3f}, Y={extents[1]:.3f}, Z={extents[2]:.3f}")
        except:
            print(f"  ✓ Model saved to {output_path}")

        total_time = time.time() - start_time
        print(f"\n  ⏱️ Total generation time: {total_time:.1f}s")

        return str(output_path)

    def unload_shape(self):
        """Unload shape model to free VRAM"""
        if self.shape_pipeline is not None:
            del self.shape_pipeline
            self.shape_pipeline = None
            self.initialized_shape = False
        if self.floater_remover is not None:
            del self.floater_remover
            self.floater_remover = None
        if self.degenerate_remover is not None:
            del self.degenerate_remover
            self.degenerate_remover = None
        if self.face_reducer is not None:
            del self.face_reducer
            self.face_reducer = None
        torch.cuda.empty_cache()
        gc.collect()
        print("🗑️ Hunyuan3D shape model unloaded")

    def unload_texture(self):
        """Unload texture model to free VRAM"""
        if self.texture_pipeline is not None:
            del self.texture_pipeline
            self.texture_pipeline = None
            self.initialized_texture = False
        torch.cuda.empty_cache()
        gc.collect()
        print("🗑️ Hunyuan3D texture model unloaded")

    def unload(self):
        """Unload all models to free VRAM"""
        self.unload_shape()
        self.unload_texture()
        print("🗑️ All Hunyuan3D models unloaded")


# Singleton instance
hunyuan3d_generator = Hunyuan3DGenerator()


def image_to_3d(image: Image.Image, output_path: str = None, with_texture: bool = None) -> str:
    """
    Convenience function for image to 3D generation.
    Drop-in replacement for triposr_wrapper.image_to_3d()
    """
    return hunyuan3d_generator.generate_3d(image, output_path, with_texture=with_texture)


if __name__ == "__main__":
    if len(sys.argv) > 1:
        img_path = sys.argv[1]
        output = sys.argv[2] if len(sys.argv) > 2 else "test_model.glb"

        img = Image.open(img_path)
        result_path = image_to_3d(img, output)
        print(f"Model saved to: {result_path}")
    else:
        print("Usage: python hunyuan3d_wrapper.py <image_path> [output_path]")
