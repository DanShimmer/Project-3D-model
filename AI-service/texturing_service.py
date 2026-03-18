"""
AI Texturing Service - Advanced 3D Model Texturing
Uses Stable Diffusion + ControlNet for automatic texture generation

This service provides:
1. Auto-texturing: AI generates textures based on model geometry
2. Style-based texturing: Different visual styles (realistic, stylized, PBR, hand-painted)
3. PBR map generation: Normal, roughness, metallic maps

Requirements:
- diffusers
- controlnet_aux
- transformers
- trimesh
- PIL
"""
import os
import sys
import uuid
import time
import traceback
from pathlib import Path
import numpy as np

# Fix encoding issues on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Output directory
OUTPUT_DIR = Path(__file__).parent / "outputs"
OUTPUT_DIR.mkdir(exist_ok=True)

# Texture cache directory
TEXTURE_CACHE_DIR = Path(__file__).parent / "cache" / "textures"
TEXTURE_CACHE_DIR.mkdir(parents=True, exist_ok=True)


class TexturingConfig:
    """Configuration for AI texturing"""
    # Model settings
    SD_MODEL = "runwayml/stable-diffusion-v1-5"
    CONTROLNET_DEPTH = "lllyasviel/sd-controlnet-depth"
    CONTROLNET_NORMAL = "lllyasviel/sd-controlnet-normal"
    
    # Generation settings
    TEXTURE_SIZE = 2048  # Higher resolution texture for more detail (was 1024)
    GUIDANCE_SCALE = 9.0  # Stronger prompt adherence for detailed textures (was 7.5)
    NUM_INFERENCE_STEPS = 40  # More steps for better quality (was 30)
    
    # Style prompts - much more detailed for higher quality
    STYLE_PROMPTS = {
        "realistic": (
            "ultra detailed realistic texture map, photorealistic surface material, "
            "8k high resolution, intricate surface detail, pores and micro-textures, "
            "natural color variation, physically accurate material, studio quality"
        ),
        "stylized": (
            "beautiful stylized game texture, vibrant rich colors, artistic hand-crafted feel, "
            "AAA game asset quality, clean crisp details, stylized PBR, "
            "Riot Games art style, professional game art"
        ),
        "pbr": (
            "professional PBR texture map, physically based rendering material, "
            "detailed albedo with natural color variation, game-ready texture, "
            "Substance Painter quality, consistent lighting, Unreal Engine quality"
        ),
        "hand-painted": (
            "masterful hand-painted texture, beautiful brush strokes with visible detail, "
            "World of Warcraft art style, vibrant saturated colors, painterly game art, "
            "professional stylized game texture, Blizzard quality hand-painted"
        )
    }
    
    # Negative prompts - more comprehensive
    NEGATIVE_PROMPT = (
        "blurry, low quality, pixelated, noisy, watermark, text, signature, "
        "tiled, repeating pattern, seams, stretching, distorted, "
        "flat color, solid color, no detail, boring, plain, "
        "jpeg artifacts, compression artifacts, low resolution"
    )


class AITexturingService:
    """
    AI-powered texture generation service
    Uses Stable Diffusion + ControlNet for geometry-aware texturing
    """
    
    def __init__(self):
        self.pipe = None
        self.controlnet = None
        self.depth_estimator = None
        self.loaded = False
        self.device = None
    
    def load_models(self):
        """Load AI models for texturing"""
        if self.loaded:
            return True
        
        try:
            import torch
            from diffusers import StableDiffusionControlNetPipeline, ControlNetModel, UniPCMultistepScheduler
            from transformers import pipeline as hf_pipeline
            
            print("🎨 Loading AI Texturing models...")
            
            # Determine device
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
            dtype = torch.float16 if self.device == "cuda" else torch.float32
            
            print(f"   Device: {self.device}")
            
            # Load ControlNet for depth
            print("   Loading ControlNet (depth)...")
            self.controlnet = ControlNetModel.from_pretrained(
                TexturingConfig.CONTROLNET_DEPTH,
                torch_dtype=dtype,
                cache_dir=str(TEXTURE_CACHE_DIR)
            )
            
            # Load Stable Diffusion pipeline with ControlNet
            print("   Loading Stable Diffusion pipeline...")
            self.pipe = StableDiffusionControlNetPipeline.from_pretrained(
                TexturingConfig.SD_MODEL,
                controlnet=self.controlnet,
                torch_dtype=dtype,
                safety_checker=None,
                cache_dir=str(TEXTURE_CACHE_DIR)
            )
            
            # Use efficient scheduler
            self.pipe.scheduler = UniPCMultistepScheduler.from_config(self.pipe.scheduler.config)
            
            # Move to device
            self.pipe = self.pipe.to(self.device)
            
            # Enable memory efficient attention if available
            if self.device == "cuda":
                try:
                    self.pipe.enable_xformers_memory_efficient_attention()
                    print("   ✓ xformers enabled")
                except:
                    try:
                        self.pipe.enable_attention_slicing()
                        print("   ✓ attention slicing enabled")
                    except:
                        pass
            
            # Load depth estimator
            print("   Loading depth estimator...")
            self.depth_estimator = hf_pipeline(
                "depth-estimation", 
                model="Intel/dpt-large",
                device=0 if self.device == "cuda" else -1
            )
            
            self.loaded = True
            print("✅ AI Texturing models loaded successfully!")
            return True
            
        except Exception as e:
            print(f"❌ Failed to load texturing models: {e}")
            traceback.print_exc()
            return False
    
    def render_model_views(self, model_path: str, num_views: int = 6):
        """
        Render multiple views of the 3D model for texture projection
        
        Args:
            model_path: Path to GLB/OBJ model
            num_views: Number of views to render (default 6 for cube map style)
        
        Returns:
            List of rendered view images
        """
        try:
            import trimesh
            from PIL import Image
            import pyrender
            
            # Load mesh
            mesh = trimesh.load(model_path)
            if isinstance(mesh, trimesh.Scene):
                mesh = mesh.dump(concatenate=True)
            
            # Create scene
            scene = pyrender.Scene(bg_color=[1.0, 1.0, 1.0, 1.0])
            
            # Add mesh
            mesh_node = pyrender.Mesh.from_trimesh(mesh)
            scene.add(mesh_node)
            
            # Add light
            light = pyrender.DirectionalLight(color=[1.0, 1.0, 1.0], intensity=3.0)
            scene.add(light)
            
            # Setup camera
            camera = pyrender.PerspectiveCamera(yfov=np.pi / 3.0)
            
            # Render from different angles
            views = []
            angles = [0, 60, 120, 180, 240, 300]  # 6 views around the model
            
            renderer = pyrender.OffscreenRenderer(
                TexturingConfig.TEXTURE_SIZE, 
                TexturingConfig.TEXTURE_SIZE
            )
            
            # Get model bounds for camera positioning
            bounds = mesh.bounds
            center = (bounds[0] + bounds[1]) / 2
            extent = np.linalg.norm(bounds[1] - bounds[0])
            
            for angle in angles[:num_views]:
                # Calculate camera position
                rad = np.radians(angle)
                distance = extent * 2
                cam_pos = np.array([
                    center[0] + distance * np.sin(rad),
                    center[1] + extent * 0.3,
                    center[2] + distance * np.cos(rad)
                ])
                
                # Look at center
                cam_pose = self._look_at_matrix(cam_pos, center)
                
                # Add camera
                cam_node = scene.add(camera, pose=cam_pose)
                
                # Render
                color, depth = renderer.render(scene)
                
                # Convert to PIL
                views.append({
                    'color': Image.fromarray(color),
                    'depth': depth,
                    'angle': angle
                })
                
                # Remove camera for next iteration
                scene.remove_node(cam_node)
            
            renderer.delete()
            return views
            
        except Exception as e:
            print(f"Error rendering model views: {e}")
            traceback.print_exc()
            return None
    
    def _look_at_matrix(self, camera_pos, target_pos, up=np.array([0, 1, 0])):
        """Create a look-at transformation matrix"""
        forward = target_pos - camera_pos
        forward = forward / np.linalg.norm(forward)
        
        right = np.cross(forward, up)
        right = right / np.linalg.norm(right)
        
        actual_up = np.cross(right, forward)
        
        pose = np.eye(4)
        pose[:3, 0] = right
        pose[:3, 1] = actual_up
        pose[:3, 2] = -forward
        pose[:3, 3] = camera_pos
        
        return pose
    
    def generate_depth_map(self, image):
        """Generate depth map from image using AI"""
        if not self.depth_estimator:
            return None
        
        try:
            result = self.depth_estimator(image)
            depth = result['depth']
            return depth
        except Exception as e:
            print(f"Depth estimation error: {e}")
            return None
    
    def generate_texture(self, model_path: str, style: str = "realistic", prompt: str = None):
        """
        Generate texture for a 3D model using AI
        
        Args:
            model_path: Path to the 3D model file
            style: Texture style (realistic, stylized, pbr, hand-painted)
            prompt: Optional additional prompt for customization
        
        Returns:
            Dictionary with texture paths and status
        """
        job_id = str(uuid.uuid4())
        
        try:
            # Load models if not loaded
            if not self.loaded:
                if not self.load_models():
                    # Fall back to procedural texture if AI models can't load
                    print("⚠️ AI models unavailable, falling back to procedural texture...")
                    return self._generate_procedural_texture(model_path, style, job_id)
            
            import trimesh
            from PIL import Image
            
            print(f"\n{'='*60}")
            print(f"🎨 AI Texturing Job: {job_id}")
            print(f"   Model: {model_path}")
            print(f"   Style: {style}")
            print(f"{'='*60}\n")
            
            start_time = time.time()
            
            # Build prompt
            style_prompt = TexturingConfig.STYLE_PROMPTS.get(style, TexturingConfig.STYLE_PROMPTS["realistic"])
            full_prompt = f"{style_prompt}"
            if prompt:
                full_prompt = f"{prompt}, {style_prompt}"
            
            print(f"📝 Prompt: {full_prompt}")
            
            # Step 1: Load and analyze mesh
            print("\n📦 Step 1: Loading mesh...")
            mesh = trimesh.load(model_path)
            if isinstance(mesh, trimesh.Scene):
                mesh = mesh.dump(concatenate=True)
            
            # Check if mesh already has vertex colors
            has_vertex_colors = (
                hasattr(mesh.visual, 'vertex_colors') and 
                mesh.visual.vertex_colors is not None and
                len(mesh.visual.vertex_colors) > 0
            )
            if has_vertex_colors:
                print(f"   ✓ Mesh has {len(mesh.visual.vertex_colors)} vertex colors")
            
            # Step 2: Generate UV coordinates if missing
            print("🗺️ Step 2: Checking UV coordinates...")
            if not hasattr(mesh.visual, 'uv') or mesh.visual.uv is None:
                print("   Generating UV coordinates...")
                # Use simple box projection
                mesh = self._generate_uv_box_projection(mesh)
            
            # Step 3: Render depth/normal views
            print("📷 Step 3: Rendering model views...")
            views = None
            try:
                views = self.render_model_views(model_path, num_views=4)
            except Exception as render_err:
                print(f"   ⚠️ View rendering failed: {render_err}")
                views = None
            
            if views is None:
                # Fallback: Generate texture directly using SD + ControlNet with a simple depth image
                print("   Using direct AI texture generation (no view rendering)...")
                return self._generate_ai_texture_direct(mesh, model_path, full_prompt, style, job_id, start_time)
            
            # Step 4: Generate textures for each view
            print("🎨 Step 4: Generating AI textures...")
            generated_textures = []
            
            for i, view in enumerate(views):
                print(f"   Processing view {i+1}/{len(views)} (angle: {view['angle']}°)...")
                
                # Get depth map
                depth_image = self.generate_depth_map(view['color'])
                if depth_image is None:
                    # Use rendered depth
                    depth_array = view['depth']
                    depth_normalized = (depth_array - depth_array.min()) / (depth_array.max() - depth_array.min() + 1e-8)
                    depth_image = Image.fromarray((depth_normalized * 255).astype(np.uint8))
                
                # Resize for ControlNet
                depth_image = depth_image.resize((512, 512))
                
                # Generate texture with ControlNet
                result = self.pipe(
                    prompt=full_prompt,
                    negative_prompt=TexturingConfig.NEGATIVE_PROMPT,
                    image=depth_image,
                    num_inference_steps=TexturingConfig.NUM_INFERENCE_STEPS,
                    guidance_scale=TexturingConfig.GUIDANCE_SCALE,
                    generator=None
                ).images[0]
                
                # Upscale to target size
                result = result.resize((TexturingConfig.TEXTURE_SIZE, TexturingConfig.TEXTURE_SIZE), Image.LANCZOS)
                generated_textures.append({
                    'image': result,
                    'angle': view['angle']
                })
            
            # Step 5: Create final texture atlas
            print("🧵 Step 5: Creating texture atlas...")
            final_texture = self._create_texture_atlas(generated_textures)
            
            # Step 6: Apply texture to mesh
            print("✨ Step 6: Applying texture to mesh...")
            output_path = str(OUTPUT_DIR / f"{job_id}_textured.glb")
            texture_path = str(OUTPUT_DIR / f"{job_id}_texture.png")
            
            # Save texture
            final_texture.save(texture_path)
            
            # Apply texture and save
            mesh.visual = trimesh.visual.TextureVisuals(
                uv=mesh.visual.uv if hasattr(mesh.visual, 'uv') else None,
                image=final_texture
            )
            mesh.export(output_path)
            
            elapsed = time.time() - start_time
            print(f"\n✅ Texturing complete in {elapsed:.1f}s")
            print(f"   Output: {output_path}")
            
            return {
                "success": True,
                "textured_model_path": output_path,
                "texture_path": texture_path,
                "style": style,
                "elapsed_time": elapsed
            }
            
        except Exception as e:
            print(f"❌ Texturing error: {e}")
            traceback.print_exc()
            return {
                "success": False,
                "error": str(e)
            }
    
    def _generate_ai_texture_direct(self, mesh, model_path, prompt, style, job_id, start_time):
        """
        Generate texture directly using SD + ControlNet without pyrender.
        Creates a synthetic depth map from mesh geometry and uses it for ControlNet.
        """
        try:
            import trimesh
            from PIL import Image
            
            print("🎨 Direct AI texture generation...")
            
            # Step 1: Generate a synthetic depth map from mesh vertices
            print("   Creating synthetic depth map...")
            depth_image = self._create_synthetic_depth(mesh)
            
            # Step 2: Generate texture using ControlNet
            print("   Generating AI texture...")
            if self.pipe and self.loaded:
                depth_resized = depth_image.resize((512, 512))
                
                result = self.pipe(
                    prompt=prompt,
                    negative_prompt=TexturingConfig.NEGATIVE_PROMPT,
                    image=depth_resized,
                    num_inference_steps=TexturingConfig.NUM_INFERENCE_STEPS,
                    guidance_scale=TexturingConfig.GUIDANCE_SCALE,
                ).images[0]
                
                # Upscale to target size
                final_texture = result.resize(
                    (TexturingConfig.TEXTURE_SIZE, TexturingConfig.TEXTURE_SIZE), 
                    Image.LANCZOS
                )
            else:
                # If pipeline not available, use procedural
                return self._generate_procedural_texture(model_path, style, job_id)
            
            # Step 3: Generate UV coordinates if missing
            if not hasattr(mesh.visual, 'uv') or mesh.visual.uv is None:
                print("   Generating UV coordinates...")
                mesh = self._generate_uv_box_projection(mesh)
            
            # Step 4: Apply texture and save
            print("   Applying texture to mesh...")
            texture_path = str(OUTPUT_DIR / f"{job_id}_texture.png")
            final_texture.save(texture_path)
            
            mesh.visual = trimesh.visual.TextureVisuals(
                uv=mesh.visual.uv if hasattr(mesh.visual, 'uv') else None,
                image=final_texture
            )
            
            output_path = str(OUTPUT_DIR / f"{job_id}_textured.glb")
            mesh.export(output_path)
            
            elapsed = time.time() - start_time
            print(f"\n✅ Direct AI texturing complete in {elapsed:.1f}s")
            
            return {
                "success": True,
                "textured_model_path": output_path,
                "texture_path": texture_path,
                "style": style,
                "elapsed_time": elapsed
            }
            
        except Exception as e:
            print(f"❌ Direct AI texture error: {e}")
            traceback.print_exc()
            # Fall back to procedural
            return self._generate_procedural_texture(model_path, style, job_id)
    
    def _create_synthetic_depth(self, mesh, resolution=512):
        """Create a synthetic depth map from mesh geometry for ControlNet input"""
        from PIL import Image
        
        try:
            # Project vertices onto a 2D plane (front view)
            vertices = mesh.vertices.copy()
            
            # Normalize to 0-1 range
            vmin = vertices.min(axis=0)
            vmax = vertices.max(axis=0)
            extent = vmax - vmin
            extent[extent == 0] = 1.0
            
            vertices_norm = (vertices - vmin) / extent
            
            # Create depth image
            depth = np.ones((resolution, resolution), dtype=np.float32)
            
            # Project each vertex (front view: X, Y -> pixel, Z -> depth)
            for v in vertices_norm:
                px = int(v[0] * (resolution - 1))
                py = int((1 - v[1]) * (resolution - 1))  # Flip Y
                pz = v[2]
                
                px = max(0, min(resolution - 1, px))
                py = max(0, min(resolution - 1, py))
                
                # Keep closest depth
                if pz < depth[py, px]:
                    depth[py, px] = pz
            
            # Fill holes using simple dilation
            from PIL import ImageFilter
            
            depth_img = Image.fromarray((depth * 255).astype(np.uint8), mode='L')
            depth_img = depth_img.filter(ImageFilter.MedianFilter(size=3))
            depth_img = depth_img.filter(ImageFilter.GaussianBlur(radius=2))
            
            return depth_img.convert('RGB')
            
        except Exception as e:
            print(f"   Synthetic depth error: {e}")
            # Return a simple gray gradient as fallback
            gradient = np.linspace(200, 50, resolution).reshape(-1, 1).repeat(resolution, axis=1)
            return Image.fromarray(gradient.astype(np.uint8), mode='L').convert('RGB')
    
    def _generate_uv_box_projection(self, mesh):
        """Generate UV coordinates using box projection"""
        try:
            # Get vertices and normals
            vertices = mesh.vertices
            normals = mesh.vertex_normals if hasattr(mesh, 'vertex_normals') else None
            
            if normals is None:
                mesh.compute_vertex_normals()
                normals = mesh.vertex_normals
            
            # Simple box projection
            uvs = np.zeros((len(vertices), 2))
            
            for i, (v, n) in enumerate(zip(vertices, normals)):
                # Determine dominant axis
                abs_n = np.abs(n)
                dominant = np.argmax(abs_n)
                
                if dominant == 0:  # X-facing
                    uvs[i] = [v[2], v[1]]
                elif dominant == 1:  # Y-facing
                    uvs[i] = [v[0], v[2]]
                else:  # Z-facing
                    uvs[i] = [v[0], v[1]]
            
            # Normalize UVs to 0-1
            uvs = (uvs - uvs.min(axis=0)) / (uvs.max(axis=0) - uvs.min(axis=0) + 1e-8)
            
            # Apply UVs
            import trimesh
            mesh.visual = trimesh.visual.TextureVisuals(uv=uvs)
            
            return mesh
        except Exception as e:
            print(f"UV generation error: {e}")
            return mesh
    
    def _create_texture_atlas(self, textures):
        """Combine multiple view textures into an atlas"""
        from PIL import Image
        
        if len(textures) == 0:
            return Image.new('RGB', (TexturingConfig.TEXTURE_SIZE, TexturingConfig.TEXTURE_SIZE), (200, 200, 200))
        
        if len(textures) == 1:
            return textures[0]['image']
        
        # For now, use the front view (angle closest to 0)
        best_texture = min(textures, key=lambda t: abs(t['angle']))
        return best_texture['image']
    
    def _generate_procedural_texture(self, model_path: str, style: str, job_id: str):
        """Enhanced procedural texture generation with gradient, noise, and AO-like effects"""
        from PIL import Image, ImageDraw, ImageFilter
        import trimesh
        
        try:
            # Load mesh
            mesh = trimesh.load(model_path)
            if isinstance(mesh, trimesh.Scene):
                mesh = mesh.dump(concatenate=True)
            
            # Create base texture with more sophisticated approach
            size = TexturingConfig.TEXTURE_SIZE
            
            # Style-based color palettes (primary, secondary, accent)
            style_palettes = {
                "realistic": [(180, 160, 140), (160, 140, 120), (200, 180, 160)],
                "stylized": [(100, 180, 220), (80, 150, 200), (130, 210, 240)],
                "pbr": [(160, 160, 160), (140, 140, 140), (180, 180, 180)],
                "hand-painted": [(200, 170, 140), (180, 150, 120), (220, 190, 160)]
            }
            
            palette = style_palettes.get(style, style_palettes["realistic"])
            base_color = palette[0]
            
            # Create gradient base
            texture = Image.new('RGB', (size, size), base_color)
            draw = ImageDraw.Draw(texture)
            
            # Add smooth gradient variation
            np.random.seed(42)
            for y in range(size):
                for x in range(0, size, 4):  # Step by 4 for performance
                    # Gradient factor based on position
                    gx = x / size
                    gy = y / size
                    grad_factor = 0.8 + 0.4 * (np.sin(gx * 3.14) * np.cos(gy * 3.14))
                    
                    # Blend between palette colors
                    c = tuple(int(base_color[i] * grad_factor) for i in range(3))
                    c = tuple(max(0, min(255, v)) for v in c)
                    draw.rectangle([x, y, x+3, y], fill=c)
            
            # Add fine noise for texture detail
            noise_texture = Image.new('RGB', (size, size))
            noise_draw = ImageDraw.Draw(noise_texture)
            for _ in range(size * 10):
                x = np.random.randint(0, size)
                y = np.random.randint(0, size)
                variation = np.random.randint(-20, 20)
                color = tuple(max(0, min(255, base_color[i] + variation)) for i in range(3))
                noise_draw.rectangle([x, y, x+1, y+1], fill=color)
            
            # Blend noise with base
            from PIL import ImageChops
            texture = ImageChops.add(texture, noise_texture, scale=2, offset=0)
            
            # Apply slight blur for smoothness
            texture = texture.filter(ImageFilter.GaussianBlur(radius=1))
            
            # Boost sharpness for detail
            from PIL import ImageEnhance
            enhancer = ImageEnhance.Sharpness(texture)
            texture = enhancer.enhance(1.3)
            
            # Save texture
            texture_path = str(OUTPUT_DIR / f"{job_id}_texture.png")
            texture.save(texture_path)
            
            # Apply to mesh
            if not hasattr(mesh.visual, 'uv') or mesh.visual.uv is None:
                mesh = self._generate_uv_box_projection(mesh)
            
            mesh.visual = trimesh.visual.TextureVisuals(
                uv=mesh.visual.uv,
                image=texture
            )
            
            output_path = str(OUTPUT_DIR / f"{job_id}_textured.glb")
            mesh.export(output_path)
            
            return {
                "success": True,
                "textured_model_path": output_path,
                "texture_path": texture_path,
                "style": style,
                "procedural": True
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Procedural texture failed: {e}"
            }
    
    def generate_pbr_maps(self, texture_path: str):
        """
        Generate PBR maps (normal, roughness, metallic) from diffuse texture
        
        Uses AI-based normal map generation and heuristics for roughness/metallic
        """
        try:
            from PIL import Image, ImageFilter, ImageOps
            import cv2
            
            job_id = str(uuid.uuid4())
            print(f"\n🗺️ Generating PBR maps for: {texture_path}")
            
            # Load diffuse texture
            diffuse = Image.open(texture_path)
            diffuse_array = np.array(diffuse)
            
            # Generate Normal Map using Sobel filters
            print("   Generating normal map...")
            gray = cv2.cvtColor(diffuse_array, cv2.COLOR_RGB2GRAY)
            
            # Sobel gradients
            sobelx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
            sobely = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
            
            # Normalize
            sobelx = sobelx / (np.max(np.abs(sobelx)) + 1e-8)
            sobely = sobely / (np.max(np.abs(sobely)) + 1e-8)
            
            # Create normal map (tangent space)
            normal_map = np.zeros((*gray.shape, 3), dtype=np.float32)
            normal_map[:, :, 0] = sobelx * 0.5 + 0.5  # R = X
            normal_map[:, :, 1] = sobely * 0.5 + 0.5  # G = Y
            normal_map[:, :, 2] = 1.0                  # B = Z
            
            # Normalize
            norm = np.sqrt(np.sum(normal_map ** 2, axis=2, keepdims=True))
            normal_map = normal_map / (norm + 1e-8)
            normal_map = ((normal_map + 1) / 2 * 255).astype(np.uint8)
            
            normal_img = Image.fromarray(normal_map)
            normal_path = str(OUTPUT_DIR / f"{job_id}_normal.png")
            normal_img.save(normal_path)
            
            # Generate Roughness Map (based on texture variance)
            print("   Generating roughness map...")
            roughness = cv2.GaussianBlur(gray, (5, 5), 0)
            roughness = cv2.Laplacian(roughness, cv2.CV_64F)
            roughness = np.abs(roughness)
            roughness = (roughness / (roughness.max() + 1e-8) * 255).astype(np.uint8)
            # Invert: smooth areas = rough, detailed areas = smooth
            roughness = 255 - roughness
            roughness = cv2.GaussianBlur(roughness, (15, 15), 0)
            
            roughness_img = Image.fromarray(roughness)
            roughness_path = str(OUTPUT_DIR / f"{job_id}_roughness.png")
            roughness_img.save(roughness_path)
            
            # Generate Metallic Map (simple heuristic)
            print("   Generating metallic map...")
            # For now, just a low metallic value everywhere
            metallic = np.full(gray.shape, 30, dtype=np.uint8)
            
            metallic_img = Image.fromarray(metallic)
            metallic_path = str(OUTPUT_DIR / f"{job_id}_metallic.png")
            metallic_img.save(metallic_path)
            
            print("✅ PBR maps generated!")
            
            return {
                "success": True,
                "normal_map": normal_path,
                "roughness_map": roughness_path,
                "metallic_map": metallic_path
            }
            
        except Exception as e:
            print(f"❌ PBR generation error: {e}")
            traceback.print_exc()
            return {
                "success": False,
                "error": str(e)
            }


# Create global instance
ai_texturing_service = AITexturingService()


def auto_texture_model(model_path: str, style: str = "realistic"):
    """
    Convenience function for auto-texturing a model
    
    Args:
        model_path: Path to the 3D model
        style: Texture style
    
    Returns:
        Path to textured model or None on failure
    """
    result = ai_texturing_service.generate_texture(model_path, style)
    if result.get("success"):
        return result.get("textured_model_path")
    return None


# Test function
if __name__ == "__main__":
    print("AI Texturing Service Test")
    print("=" * 40)
    
    # Test loading
    if ai_texturing_service.load_models():
        print("\n✅ Models loaded successfully!")
        
        # Test with a sample model if available
        sample_dir = Path(__file__).parent / "outputs"
        glb_files = list(sample_dir.glob("*.glb"))
        
        if glb_files:
            test_model = str(glb_files[0])
            print(f"\nTesting with: {test_model}")
            
            result = ai_texturing_service.generate_texture(test_model, style="realistic")
            print(f"\nResult: {result}")
        else:
            print("\nNo test models found in outputs/")
    else:
        print("\n❌ Failed to load models")
