"""
AI Texturing Service — ComfyUI + SDXL + ControlNet Pipeline

StableGen-style pipeline for AI-powered 3D model texturing:
  3D model → render multi-view depth maps → SDXL + ControlNet generate textured
  views → back-project onto mesh vertices → bake to UV texture → export GLB

Falls back to smart procedural coloring when ComfyUI is unavailable.

KEY FIX: All exports use UV texture with PBRMaterial(baseColorFactor=WHITE)
to prevent the gray-darkening bug caused by non-white baseColorFactor
multiplying with texture/vertex colors.
"""
import os
import sys
import uuid
import time
import math
import traceback
from pathlib import Path

import numpy as np

# Fix encoding issues on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# Output directory
OUTPUT_DIR = Path(__file__).parent / "outputs"
OUTPUT_DIR.mkdir(exist_ok=True)

# Texture cache directory
TEXTURE_CACHE_DIR = Path(__file__).parent / "cache" / "textures"
TEXTURE_CACHE_DIR.mkdir(parents=True, exist_ok=True)


# ══════════════════════════════════════════════════════════════
# AI TEXTURING SERVICE
# ══════════════════════════════════════════════════════════════


class AITexturingService:
    """
    AI-powered texture generation service.

    Pipeline priority:
    1. ComfyUI (SDXL + ControlNet Depth) — external server
    2. Direct SD1.5 + ControlNet-Depth — in-process (diffusers)
    3. Procedural fallback — fast regex-based coloring
    """

    def __init__(self):
        self.comfyui = None
        self.controlnet_pipe = None
        self._controlnet_loading = False
        self._try_init_comfyui()

    def _try_init_comfyui(self):
        """Try to create a ComfyUI client."""
        try:
            from comfyui_client import ComfyUIClient
            from config import ComfyUIConfig

            self.comfyui = ComfyUIClient(ComfyUIConfig.URL)
            if self.comfyui.is_available():
                print("✅ ComfyUI connected at", ComfyUIConfig.URL)
            else:
                print(
                    f"⚠️  ComfyUI not reachable at {ComfyUIConfig.URL} — "
                    "will try direct ControlNet pipeline."
                )
        except Exception as e:
            print(f"⚠️  ComfyUI client init failed: {e}")
            self.comfyui = None

    def _load_controlnet_pipeline(self):
        """Load SD1.5 + ControlNet-Depth pipeline using diffusers (in-process)."""
        if self.controlnet_pipe is not None:
            return True
        if self._controlnet_loading:
            return False

        self._controlnet_loading = True
        try:
            import torch
            from diffusers import (
                StableDiffusionControlNetPipeline,
                ControlNetModel,
                UniPCMultistepScheduler,
            )

            cache_dir = str(TEXTURE_CACHE_DIR)
            device = "cuda" if torch.cuda.is_available() else "cpu"
            dtype = torch.float16 if device == "cuda" else torch.float32

            print("📦 Loading ControlNet-Depth model...")
            controlnet = ControlNetModel.from_pretrained(
                "lllyasviel/sd-controlnet-depth",
                torch_dtype=dtype,
                cache_dir=cache_dir,
            )

            print("📦 Loading SD 1.5 + ControlNet pipeline...")
            pipe = StableDiffusionControlNetPipeline.from_pretrained(
                "runwayml/stable-diffusion-v1-5",
                controlnet=controlnet,
                torch_dtype=dtype,
                cache_dir=cache_dir,
                safety_checker=None,
                requires_safety_checker=False,
            )
            pipe.scheduler = UniPCMultistepScheduler.from_config(
                pipe.scheduler.config
            )
            pipe = pipe.to(device)

            # Memory optimizations for RTX 3060 12GB
            if device == "cuda":
                pipe.enable_attention_slicing()
                try:
                    pipe.enable_xformers_memory_efficient_attention()
                    print("  ✓ xformers enabled")
                except Exception:
                    pass

            self.controlnet_pipe = pipe
            print("✅ SD1.5 + ControlNet-Depth pipeline loaded")
            return True
        except Exception as e:
            print(f"⚠️  ControlNet pipeline load failed: {e}")
            traceback.print_exc()
            self.controlnet_pipe = None
            return False
        finally:
            self._controlnet_loading = False

    def _unload_controlnet_pipeline(self):
        """Free VRAM after texturing."""
        if self.controlnet_pipe is not None:
            import torch, gc
            del self.controlnet_pipe
            self.controlnet_pipe = None
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            gc.collect()
            print("🗑️ ControlNet pipeline unloaded")

    def _render_depth_map(self, mesh, resolution=512):
        """
        Render a depth map of the mesh from the front view.
        Fast vectorized approach: project vertices, draw face triangles via PIL.
        """
        from PIL import Image, ImageDraw
        import trimesh as tm

        vertices = mesh.vertices.copy()
        faces = mesh.faces

        # Normalize to [-1, 1] centered
        center = (vertices.max(axis=0) + vertices.min(axis=0)) / 2
        scale = (vertices.max(axis=0) - vertices.min(axis=0)).max()
        if scale < 1e-6:
            scale = 1.0
        vertices = (vertices - center) / scale * 1.8

        s = resolution
        half = s / 2

        # Project ALL vertices to screen space at once (orthographic front view)
        sx_all = (vertices[:, 0] * half * 0.9 + half).astype(np.int32)
        sy_all = (-vertices[:, 1] * half * 0.9 + half).astype(np.int32)
        sz_all = vertices[:, 2]

        # Per-face average depth (for sorting: painter's algorithm)
        face_z = sz_all[faces].mean(axis=1)
        # Sort faces back-to-front (highest z = furthest away, drawn first)
        order = np.argsort(-face_z)

        # Draw faces as filled polygons with grayscale depth color
        z_min = sz_all.min()
        z_max = sz_all.max()
        z_range = z_max - z_min if z_max > z_min else 1.0

        img = Image.new("RGB", (s, s), (0, 0, 0))
        draw = ImageDraw.Draw(img)

        for fi in order:
            f = faces[fi]
            poly = [
                (int(sx_all[f[0]]), int(sy_all[f[0]])),
                (int(sx_all[f[1]]), int(sy_all[f[1]])),
                (int(sx_all[f[2]]), int(sy_all[f[2]])),
            ]
            # Average depth of face → grayscale (closer = brighter)
            avg_z = face_z[fi]
            brightness = int(255 - ((avg_z - z_min) / z_range * 200 + 30))
            brightness = max(10, min(250, brightness))
            draw.polygon(poly, fill=(brightness, brightness, brightness))

        return img

    def _generate_controlnet_texture(
        self, model_path: str, style: str, job_id: str, prompt: str
    ):
        """
        Generate texture using SD1.5 + ControlNet-Depth (direct, in-process).

        Pipeline:
        1. Load mesh → render depth map
        2. SD1.5 + ControlNet → generate textured front view from depth
        3. Project generated colors back onto mesh vertices via normal direction
        4. Bake to UV texture → export GLB
        """
        import torch
        import trimesh
        from PIL import Image, ImageEnhance
        from config import ComfyUIConfig

        t_start = time.time()

        # Load mesh
        mesh = trimesh.load(model_path)
        if isinstance(mesh, trimesh.Scene):
            mesh = mesh.dump(concatenate=True)

        print(f"   📐 Mesh: {len(mesh.vertices)} verts, {len(mesh.faces)} faces")

        # Step 1: Render depth map
        print("   🖼️ Rendering depth map...")
        depth_image = self._render_depth_map(mesh, resolution=512)
        depth_path = str(OUTPUT_DIR / f"{job_id}_depth.png")
        depth_image.save(depth_path)
        print(f"   💾 Depth map saved: {depth_path}")

        # Step 2: Build prompt
        style_prompt = ComfyUIConfig.STYLE_PROMPTS.get(
            style, ComfyUIConfig.STYLE_PROMPTS["realistic"]
        )
        obj_type = self._classify_object_for_texture(prompt) if prompt else "prop"

        full_prompt = f"{prompt}, {style_prompt}" if prompt else style_prompt
        full_prompt += ", 3D model texture, front view, studio lighting, white background"
        negative_prompt = ComfyUIConfig.NEGATIVE_PROMPT

        print(f"   📝 Prompt: {full_prompt[:120]}...")
        print(f"   🎯 Object type: {obj_type}")

        # Step 3: Generate textured view via ControlNet
        print("   🚀 Running SD1.5 + ControlNet-Depth...")
        device = "cuda" if torch.cuda.is_available() else "cpu"
        generator = torch.Generator(device=device).manual_seed(42)

        with torch.inference_mode():
            result = self.controlnet_pipe(
                prompt=full_prompt,
                negative_prompt=negative_prompt,
                image=depth_image,
                num_inference_steps=20,
                guidance_scale=7.5,
                controlnet_conditioning_scale=0.85,
                generator=generator,
                height=512,
                width=512,
            )
        generated_image = result.images[0]

        # Save generated texture view
        gen_path = str(OUTPUT_DIR / f"{job_id}_generated.png")
        generated_image.save(gen_path)
        print(f"   💾 Generated view saved: {gen_path}")

        # Step 4: Project generated image colors back onto mesh vertices
        print("   🎨 Projecting colors onto mesh...")
        gen_array = np.array(generated_image)
        vertices = mesh.vertices.copy()
        N = len(vertices)

        # Normalize vertices the same way as depth rendering
        center = (vertices.max(axis=0) + vertices.min(axis=0)) / 2
        scale_factor = (vertices.max(axis=0) - vertices.min(axis=0)).max()
        if scale_factor < 1e-6:
            scale_factor = 1.0
        v_norm = (vertices - center) / scale_factor * 1.8

        vertex_colors = np.full((N, 3), 128, dtype=np.float32)
        s = 512
        half = s / 2

        for i in range(N):
            vx = int(v_norm[i, 0] * half * 0.9 + half)
            vy = int(-v_norm[i, 1] * half * 0.9 + half)
            vx = np.clip(vx, 0, s - 1)
            vy = np.clip(vy, 0, s - 1)
            vertex_colors[i] = gen_array[vy, vx, :3].astype(np.float32)

        # Enhance colors
        # Boost saturation slightly for vivid result
        avg = vertex_colors.mean(axis=1, keepdims=True)
        vertex_colors = avg + (vertex_colors - avg) * 1.3
        vertex_colors = np.clip(vertex_colors, 0, 255)

        # Step 5: Ensure UV coordinates
        has_uv = False
        try:
            has_uv = (
                hasattr(mesh.visual, "uv")
                and mesh.visual.uv is not None
                and len(mesh.visual.uv) > 0
            )
        except Exception:
            pass
        if not has_uv:
            mesh = self._generate_uv_box_projection(mesh)

        # Step 6: Bake to UV texture
        texture_image = self._bake_vertex_colors_to_uv(
            mesh, vertex_colors, size=1024
        )

        texture_path = str(OUTPUT_DIR / f"{job_id}_texture.png")
        texture_image.save(texture_path)

        # Step 7: Export GLB
        output_path = str(OUTPUT_DIR / f"{job_id}_textured.glb")
        self._export_textured_glb(
            mesh, texture_image, mesh.visual.uv, output_path
        )

        # Free VRAM
        self._unload_controlnet_pipeline()

        elapsed = time.time() - t_start
        print(
            f"   ✅ ControlNet texture applied in {elapsed:.1f}s "
            f"({obj_type}, {N} verts)"
        )

        return {
            "success": True,
            "textured_model_path": output_path,
            "texture_path": texture_path,
            "depth_path": depth_path,
            "generated_view_path": gen_path,
            "style": style,
            "controlnet": True,
            "object_type": obj_type,
        }

    # ─── Stub for backward compat (phase2_service calls this) ──
    def load_models(self):
        """No heavy models to load — ComfyUI handles SDXL loading."""
        return True

    # ════════════════════════════════════════════════════════════
    # PUBLIC API
    # ════════════════════════════════════════════════════════════

    def generate_texture(
        self, model_path: str, style: str = "realistic", prompt: str = None
    ):
        """
        Generate texture for a 3D model.

        Pipeline priority:
        1. ComfyUI (SDXL + ControlNet) — high-quality AI texturing
        2. Direct SD1.5 + ControlNet-Depth — in-process via diffusers
        3. Procedural fallback — fast, regex-based body-part coloring

        Both pipelines export with UV texture + WHITE PBRMaterial to avoid gray.
        """
        job_id = str(uuid.uuid4())

        print(f"\n{'='*60}")
        print(f"🎨 Texturing Job: {job_id}")
        print(f"   Model:  {model_path}")
        print(f"   Style:  {style}")
        print(f"   Prompt: '{prompt}'")
        print(f"{'='*60}\n")

        # ── Try ComfyUI pipeline first ──
        if self.comfyui:
            if self.comfyui.is_available():
                try:
                    print("🚀 Using ComfyUI SDXL+ControlNet pipeline")
                    return self._generate_comfyui_texture(
                        model_path, style, job_id, prompt or ""
                    )
                except Exception as e:
                    print(f"⚠️  ComfyUI pipeline failed: {e}")
                    traceback.print_exc()
                    print("   Trying direct ControlNet pipeline...")
            else:
                print("⚠️  ComfyUI not reachable — trying direct ControlNet")

        # ── Try direct SD1.5 + ControlNet-Depth pipeline ──
        try:
            if self._load_controlnet_pipeline():
                try:
                    print("🚀 Using direct SD1.5 + ControlNet-Depth pipeline")
                    return self._generate_controlnet_texture(
                        model_path, style, job_id, prompt or ""
                    )
                except Exception as e:
                    print(f"⚠️  ControlNet pipeline failed: {e}")
                    traceback.print_exc()
                    self._unload_controlnet_pipeline()
                    print("   Falling back to procedural texturing...")
            else:
                print("⚠️  ControlNet pipeline unavailable — using procedural fallback")
        except Exception as e:
            print(f"⚠️  ControlNet check failed: {e}")

        # ── Procedural fallback ──
        print("🎨 Using procedural texturing")
        return self._generate_procedural_texture(
            model_path, style, job_id, prompt or ""
        )

    # ════════════════════════════════════════════════════════════
    # COMFYUI PIPELINE
    # ════════════════════════════════════════════════════════════

    def _generate_comfyui_texture(
        self, model_path: str, style: str, job_id: str, prompt: str
    ):
        """
        Full ComfyUI SDXL + ControlNet pipeline:
        1. Load mesh & ensure UVs
        2. Render depth maps from multiple camera angles
        3. Send each depth map to ComfyUI for SDXL generation
        4. Back-project generated textures onto mesh vertices
        5. Bake to UV texture
        6. Export GLB with PBRMaterial (white baseColorFactor)
        """
        import trimesh
        from PIL import Image
        from config import ComfyUIConfig

        t_start = time.time()

        # ── 1. Load mesh ──
        print("📦 Step 1: Loading mesh...")
        mesh = trimesh.load(model_path)
        if isinstance(mesh, trimesh.Scene):
            mesh = mesh.dump(concatenate=True)

        # ── 2. Ensure UV coordinates ──
        print("🗺️  Step 2: Checking UV coordinates...")
        has_uv = False
        try:
            has_uv = (
                hasattr(mesh.visual, "uv")
                and mesh.visual.uv is not None
                and len(mesh.visual.uv) > 0
            )
        except Exception:
            pass
        if not has_uv:
            print("   Generating box-projection UVs...")
            mesh = self._generate_uv_box_projection(mesh)

        # ── 3. Render multi-view depth maps ──
        num_views = ComfyUIConfig.NUM_VIEWS
        render_res = ComfyUIConfig.RENDER_RESOLUTION
        print(f"📷 Step 3: Rendering {num_views} depth views ({render_res}×{render_res})...")
        views = self._render_depth_views(mesh, num_views=num_views, resolution=render_res)
        print(f"   ✓ Rendered {len(views)} depth views")

        # ── 4. Generate textured views via ComfyUI ──
        print("🎨 Step 4: Generating AI textures via ComfyUI...")
        style_prompt = ComfyUIConfig.STYLE_PROMPTS.get(
            style, ComfyUIConfig.STYLE_PROMPTS["realistic"]
        )
        obj_type = self._classify_object_for_texture(prompt)

        # Build the full prompt
        base_prompt = f"{prompt}, {style_prompt}" if prompt else style_prompt
        base_prompt += f", 3D model texture, {obj_type}, studio lighting"

        comfyui_config = {
            "checkpoint": ComfyUIConfig.CHECKPOINT,
            "controlnet": ComfyUIConfig.CONTROLNET_MODEL,
            "width": ComfyUIConfig.TEXTURE_SIZE,
            "height": ComfyUIConfig.TEXTURE_SIZE,
            "steps": ComfyUIConfig.STEPS,
            "cfg": ComfyUIConfig.CFG,
            "seed": ComfyUIConfig.SEED,
            "strength": ComfyUIConfig.CONTROLNET_STRENGTH,
            "sampler": ComfyUIConfig.SAMPLER,
            "scheduler": ComfyUIConfig.SCHEDULER,
            "denoise": ComfyUIConfig.DENOISE,
            "timeout": ComfyUIConfig.TIMEOUT,
            "use_sd15": ComfyUIConfig.USE_SD15,
        }

        # Generate a textured view for each depth map
        view_directions = ["front", "right", "back", "left", "top", "bottom"]
        for i, view in enumerate(views):
            direction = view_directions[i] if i < len(view_directions) else f"view_{i}"
            view_prompt = f"{base_prompt}, {direction} view"

            print(f"   View {i+1}/{len(views)} ({direction})...")
            generated = self.comfyui.generate_texture_from_depth(
                depth_image=view["depth_image"],
                prompt=view_prompt,
                negative_prompt=ComfyUIConfig.NEGATIVE_PROMPT,
                config={**comfyui_config, "seed": ComfyUIConfig.SEED + i},
            )
            view["generated_image"] = generated

        # ── 5. Back-project onto vertices ──
        print("🔄 Step 5: Back-projecting textures onto mesh...")
        vertex_colors = self._backproject_to_vertex_colors(mesh, views)
        print(f"   ✓ {len(vertex_colors)} vertices colored")

        # ── 6. Bake to UV texture ──
        tex_size = ComfyUIConfig.TEXTURE_SIZE
        print(f"🧵 Step 6: Baking to {tex_size}×{tex_size} UV texture...")
        texture_image = self._bake_vertex_colors_to_uv(mesh, vertex_colors, size=tex_size)

        # ── 7. Export GLB ──
        texture_path = str(OUTPUT_DIR / f"{job_id}_texture.png")
        output_path = str(OUTPUT_DIR / f"{job_id}_textured.glb")
        texture_image.save(texture_path)

        self._export_textured_glb(mesh, texture_image, mesh.visual.uv, output_path)

        elapsed = time.time() - t_start
        print(f"\n✅ ComfyUI texturing complete in {elapsed:.1f}s")
        print(f"   Output: {output_path}")

        return {
            "success": True,
            "textured_model_path": output_path,
            "texture_path": texture_path,
            "style": style,
            "procedural": False,
            "object_type": obj_type,
            "elapsed_time": elapsed,
        }

    # ─── Depth Map Rendering (numpy + PIL) ────────────────────

    def _render_depth_views(self, mesh, num_views=4, resolution=512):
        """
        Render depth maps from multiple camera angles using numpy projection
        and PIL polygon rasterization (painter's algorithm).

        Returns list of view dicts with camera info, depth images, and masks.
        """
        from PIL import Image, ImageDraw

        views = []

        # Model bounding box
        bounds = mesh.bounds
        center = (bounds[0] + bounds[1]) / 2.0
        extent = np.linalg.norm(bounds[1] - bounds[0])
        distance = extent * 2.0
        elevation = extent * 0.25

        # Camera angles: evenly spaced azimuth
        angles = np.linspace(0, 360, num_views, endpoint=False)
        fov = 50  # degrees

        vertices = mesh.vertices
        faces = mesh.faces

        for angle_deg in angles:
            angle_rad = np.radians(angle_deg)
            cam_pos = np.array(
                [
                    center[0] + distance * np.sin(angle_rad),
                    center[1] + elevation,
                    center[2] + distance * np.cos(angle_rad),
                ]
            )

            # Build MVP matrix
            mvp = self._build_view_projection(
                cam_pos, center, fov, resolution,
                near=distance * 0.01, far=distance * 5.0,
            )

            # Project all vertices to screen space
            screen_xy, depths = self._project_vertices(vertices, mvp, resolution)

            # Compute linear distance from camera for depth encoding
            dists = np.linalg.norm(vertices - cam_pos[None, :], axis=1)
            d_min, d_max = dists.min(), dists.max()
            d_range = d_max - d_min + 1e-6
            # ControlNet convention: white = near, black = far
            depth_values = 1.0 - (dists - d_min) / d_range

            # Render depth using PIL polygon rasterization
            depth_img = Image.new("L", (resolution, resolution), 0)
            mask_img = Image.new("L", (resolution, resolution), 0)
            depth_draw = ImageDraw.Draw(depth_img)
            mask_draw = ImageDraw.Draw(mask_img)

            # Sort faces by distance from camera (painter's algorithm: far → near)
            face_dists = dists[faces].mean(axis=1)
            sorted_idx = np.argsort(-face_dists)

            for fi in sorted_idx:
                face = faces[fi]
                pts = [
                    (int(screen_xy[face[0], 0]), int(screen_xy[face[0], 1])),
                    (int(screen_xy[face[1], 0]), int(screen_xy[face[1], 1])),
                    (int(screen_xy[face[2], 0]), int(screen_xy[face[2], 1])),
                ]

                # Skip off-screen triangles
                xs = [p[0] for p in pts]
                ys = [p[1] for p in pts]
                if (
                    max(xs) < 0
                    or min(xs) >= resolution
                    or max(ys) < 0
                    or min(ys) >= resolution
                ):
                    continue

                avg_depth_val = depth_values[face].mean()
                gray = int(np.clip(avg_depth_val * 255, 1, 255))
                depth_draw.polygon(pts, fill=gray)
                mask_draw.polygon(pts, fill=255)

            # Convert to RGB for ControlNet
            depth_rgb = Image.merge("RGB", [depth_img, depth_img, depth_img])

            views.append(
                {
                    "angle": angle_deg,
                    "camera_pos": cam_pos,
                    "target": center,
                    "mvp": mvp,
                    "fov": fov,
                    "resolution": resolution,
                    "depth_image": depth_rgb,
                    "mask": mask_img,
                    "screen_xy": screen_xy,
                    "depth_values": depth_values,
                }
            )

        return views

    def _build_view_projection(
        self, eye, target, fov_deg, resolution, near=0.01, far=100.0
    ):
        """Build a 4×4 combined view-projection matrix (perspective)."""
        forward = target - eye
        forward = forward / np.linalg.norm(forward)

        world_up = np.array([0.0, 1.0, 0.0])
        if abs(np.dot(forward, world_up)) > 0.99:
            world_up = np.array([0.0, 0.0, 1.0])

        right = np.cross(forward, world_up)
        right = right / np.linalg.norm(right)

        up = np.cross(right, forward)
        up = up / np.linalg.norm(up)

        # View matrix (look-at)
        view = np.eye(4)
        view[0, :3] = right
        view[1, :3] = up
        view[2, :3] = -forward
        view[0, 3] = -np.dot(right, eye)
        view[1, 3] = -np.dot(up, eye)
        view[2, 3] = np.dot(forward, eye)

        # Perspective projection matrix (aspect = 1)
        fov_rad = np.radians(fov_deg)
        f = 1.0 / np.tan(fov_rad / 2.0)

        proj = np.zeros((4, 4))
        proj[0, 0] = f
        proj[1, 1] = f
        proj[2, 2] = (far + near) / (near - far)
        proj[2, 3] = 2.0 * far * near / (near - far)
        proj[3, 2] = -1.0

        return proj @ view

    def _project_vertices(self, vertices, mvp, resolution):
        """
        Project 3D vertices to 2D screen coordinates.
        Returns (screen_xy, depth) — both shape (N, ...).
        """
        N = len(vertices)
        v4 = np.hstack([vertices, np.ones((N, 1))])
        clip = (mvp @ v4.T).T  # (N, 4)

        w = clip[:, 3:4]
        w_safe = np.where(np.abs(w) < 1e-8, 1e-8, w)
        ndc = clip[:, :3] / w_safe

        screen_x = (ndc[:, 0] + 1.0) * 0.5 * (resolution - 1)
        screen_y = (1.0 - ndc[:, 1]) * 0.5 * (resolution - 1)
        depth = (ndc[:, 2] + 1.0) * 0.5

        return np.stack([screen_x, screen_y], axis=1), depth

    # ─── Back-projection: generated images → vertex colors ────

    def _backproject_to_vertex_colors(self, mesh, views):
        """
        For each vertex, project through the best camera view(s) and sample
        the generated texture to get a color.

        Weighted blending: weight = max(0, dot(vertex_normal, camera_direction))
        """
        vertices = mesh.vertices
        N = len(vertices)
        normals = mesh.vertex_normals

        if normals is None or len(normals) != N:
            try:
                mesh.fix_normals()
                normals = mesh.vertex_normals
            except Exception:
                normals = np.zeros_like(vertices)
                normals[:, 1] = 1.0

        # Accumulate weighted colors
        color_accum = np.zeros((N, 3), dtype=np.float64)
        weight_accum = np.zeros(N, dtype=np.float64)

        for view in views:
            if "generated_image" not in view:
                continue

            cam_pos = view["camera_pos"]
            target = view["target"]
            mvp = view["mvp"]
            gen_img = np.array(view["generated_image"])
            tex_h, tex_w = gen_img.shape[:2]
            mask = np.array(view["mask"]) if "mask" in view else None
            resolution = view["resolution"]

            # Camera direction
            cam_dir = target - cam_pos
            cam_dir = cam_dir / np.linalg.norm(cam_dir)

            # Weight: how well each vertex faces this camera
            dots = np.sum(normals * cam_dir[None, :], axis=1)
            weights = np.clip(dots, 0.0, 1.0)

            # Project vertices through this camera
            screen_xy, _ = self._project_vertices(vertices, mvp, resolution)

            # Scale screen coordinates to generated image resolution
            scale_x = tex_w / resolution
            scale_y = tex_h / resolution
            px = (screen_xy[:, 0] * scale_x).astype(np.int32)
            py = (screen_xy[:, 1] * scale_y).astype(np.int32)

            # Clamp to image bounds
            px = np.clip(px, 0, tex_w - 1)
            py = np.clip(py, 0, tex_h - 1)

            # Check mask (only sample where the model is visible)
            if mask is not None:
                mask_arr = np.array(mask)
                mx = np.clip(screen_xy[:, 0].astype(np.int32), 0, resolution - 1)
                my = np.clip(screen_xy[:, 1].astype(np.int32), 0, resolution - 1)
                visible = mask_arr[my, mx] > 128
                weights *= visible.astype(np.float64)

            # Only accumulate for vertices with positive weight
            active = weights > 0.05
            if not active.any():
                continue

            sampled = gen_img[py[active], px[active], :3].astype(np.float64)
            color_accum[active] += sampled * weights[active, None]
            weight_accum[active] += weights[active]

        # Normalize
        has_color = weight_accum > 0
        color_accum[has_color] /= weight_accum[has_color, None]

        # Fill vertices with no coverage (use average of colored vertices)
        if has_color.any() and not has_color.all():
            avg_color = color_accum[has_color].mean(axis=0)
            color_accum[~has_color] = avg_color

        return np.clip(color_accum, 0, 255).astype(np.float32)

    # ════════════════════════════════════════════════════════════
    # UV BAKING & GLB EXPORT (shared by ComfyUI + procedural)
    # ════════════════════════════════════════════════════════════

    def _bake_vertex_colors_to_uv(self, mesh, vertex_colors, size=1024):
        """
        Bake per-vertex colors into a UV texture atlas using PIL polygon draw.
        Each face gets the average color of its 3 vertices, drawn as a UV triangle.
        """
        from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

        uvs = mesh.visual.uv
        faces = mesh.faces

        texture = Image.new("RGB", (size, size), (80, 85, 90))
        draw = ImageDraw.Draw(texture)

        # Pre-compute face colors as average of 3 vertex colors (vectorized)
        v0c = vertex_colors[faces[:, 0]]
        v1c = vertex_colors[faces[:, 1]]
        v2c = vertex_colors[faces[:, 2]]
        face_colors = ((v0c + v1c + v2c) / 3).astype(np.uint8)

        # Pre-compute UV pixel coordinates (vectorized)
        s = size - 1
        uv0 = uvs[faces[:, 0]]
        uv1 = uvs[faces[:, 1]]
        uv2 = uvs[faces[:, 2]]

        px0 = (uv0[:, 0] * s).astype(np.int32)
        py0 = ((1 - uv0[:, 1]) * s).astype(np.int32)
        px1 = (uv1[:, 0] * s).astype(np.int32)
        py1 = ((1 - uv1[:, 1]) * s).astype(np.int32)
        px2 = (uv2[:, 0] * s).astype(np.int32)
        py2 = ((1 - uv2[:, 1]) * s).astype(np.int32)

        # Draw each face as a filled polygon (PIL C-level fast)
        for i in range(len(faces)):
            color = tuple(face_colors[i])
            polygon = [(px0[i], py0[i]), (px1[i], py1[i]), (px2[i], py2[i])]
            draw.polygon(polygon, fill=color)

        # Post-processing: fill UV gaps + vivid enhancement
        texture = texture.filter(ImageFilter.MedianFilter(size=3))
        enhancer = ImageEnhance.Contrast(texture)
        texture = enhancer.enhance(1.15)
        enhancer = ImageEnhance.Color(texture)
        texture = enhancer.enhance(1.35)
        texture = texture.filter(ImageFilter.GaussianBlur(radius=0.5))

        return texture

    def _export_textured_glb(self, mesh, texture_image, uvs, output_path):
        """
        Export GLB with UV texture and WHITE PBRMaterial.

        THE CRITICAL FIX: baseColorFactor = [1, 1, 1, 1] (pure white).
        Without this, trimesh's default can set a grayish factor that
        multiplies with the texture, causing the 'everything looks gray' bug.
        """
        import trimesh

        try:
            # Try PBRMaterial (trimesh >= 4.0)
            from trimesh.visual.material import PBRMaterial

            material = PBRMaterial(
                baseColorTexture=texture_image,
                baseColorFactor=[1.0, 1.0, 1.0, 1.0],  # WHITE — no darkening
                metallicFactor=0.0,
                roughnessFactor=0.5,
            )
            mesh.visual = trimesh.visual.TextureVisuals(
                uv=uvs,
                material=material,
            )
        except (ImportError, TypeError, AttributeError):
            # Fallback: SimpleMaterial
            try:
                from trimesh.visual.material import SimpleMaterial

                material = SimpleMaterial(
                    image=texture_image,
                    diffuse=[255, 255, 255, 255],
                    ambient=[255, 255, 255, 255],
                )
                mesh.visual = trimesh.visual.TextureVisuals(
                    uv=uvs,
                    material=material,
                    image=texture_image,
                )
            except Exception:
                # Last resort: TextureVisuals with just image
                mesh.visual = trimesh.visual.TextureVisuals(
                    uv=uvs,
                    image=texture_image,
                )

        mesh.export(output_path)
        print(f"   💾 Exported: {output_path}")

    def _generate_uv_box_projection(self, mesh):
        """Generate UV coordinates using box projection."""
        import trimesh

        try:
            vertices = mesh.vertices
            normals = mesh.vertex_normals if hasattr(mesh, "vertex_normals") else None

            if normals is None:
                mesh.fix_normals()
                normals = mesh.vertex_normals

            uvs = np.zeros((len(vertices), 2))

            for i, (v, n) in enumerate(zip(vertices, normals)):
                abs_n = np.abs(n)
                dominant = np.argmax(abs_n)
                if dominant == 0:
                    uvs[i] = [v[2], v[1]]
                elif dominant == 1:
                    uvs[i] = [v[0], v[2]]
                else:
                    uvs[i] = [v[0], v[1]]

            # Normalize to [0, 1]
            uv_min = uvs.min(axis=0)
            uv_max = uvs.max(axis=0)
            uv_range = uv_max - uv_min + 1e-8
            uvs = (uvs - uv_min) / uv_range

            mesh.visual = trimesh.visual.TextureVisuals(uv=uvs)
            return mesh
        except Exception as e:
            print(f"   UV generation error: {e}")
            return mesh

    # ════════════════════════════════════════════════════════════
    # PROCEDURAL FALLBACK (no AI needed)
    # ════════════════════════════════════════════════════════════

    def _generate_procedural_texture(
        self, model_path: str, style: str, job_id: str, prompt: str = ""
    ):
        """
        Fast 3D-aware procedural texture using vectorized numpy operations.

        TWO MODES:
        A) Prompt-based: "pink head, brown legs, white hands"
           → regex body-part→color map → paints mesh regions
        B) Auto palette: no prompt → classifies object type → predefined palette

        EXPORT: Bakes to UV texture with PBRMaterial (WHITE baseColorFactor).
        """
        from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
        import trimesh

        try:
            t_start = time.time()

            # Load mesh
            mesh = trimesh.load(model_path)
            if isinstance(mesh, trimesh.Scene):
                mesh = mesh.dump(concatenate=True)

            size = 1024

            # Parse texture prompt for body-part → color instructions
            color_instructions = self._parse_texture_prompt(prompt)
            use_prompt_colors = len(color_instructions) > 0

            obj_type = self._classify_object_for_texture(prompt) if prompt else "prop"

            if use_prompt_colors:
                print(
                    f"   🎨 Prompt-based coloring: {len(color_instructions)} instructions"
                )
                for region, color in color_instructions:
                    print(f"      • {region} → RGB{color}")
            else:
                print("   🎨 Auto palette mode (no color instructions in prompt)")

            # ── Prepare vertex data ──
            vertices = mesh.vertices
            N = len(vertices)
            normals = (
                mesh.vertex_normals
                if hasattr(mesh, "vertex_normals") and mesh.vertex_normals is not None
                else None
            )
            if normals is None or len(normals) != N:
                try:
                    mesh.fix_normals()
                    normals = mesh.vertex_normals
                except Exception:
                    normals = np.zeros_like(vertices)
                    normals[:, 1] = 1.0

            # Normalize vertex positions to [0, 1]
            vmin = vertices.min(axis=0)
            vmax = vertices.max(axis=0)
            extent = vmax - vmin
            extent[extent < 1e-6] = 1.0
            v_norm = (vertices - vmin) / extent

            heights = v_norm[:, 1]
            normal_x = normals[:, 0]
            normal_y = normals[:, 1]
            normal_z = normals[:, 2]

            if use_prompt_colors:
                # ══════════════════════════════════════════════
                # MODE A: PROMPT-BASED COLORING
                # ══════════════════════════════════════════════
                overall_color = None
                region_colors = []
                for region, color in color_instructions:
                    if region == "__overall__":
                        overall_color = color
                    else:
                        region_colors.append((region, color))

                if overall_color:
                    base = np.array(overall_color, dtype=np.float32)
                else:
                    if region_colors:
                        avg = np.mean(
                            [np.array(c, dtype=np.float32) for _, c in region_colors],
                            axis=0,
                        )
                        base = avg * 0.3 + np.array([210, 215, 220], dtype=np.float32) * 0.7
                    else:
                        base = np.array([210, 215, 220], dtype=np.float32)

                vertex_colors = np.tile(base, (N, 1))

                for region_key, color_rgb in region_colors:
                    region_info = self.BODY_REGION_MAP.get(region_key)
                    if not region_info:
                        continue

                    h_min = region_info["h_min"]
                    h_max = region_info["h_max"]
                    color_arr = np.array(color_rgb, dtype=np.float32)

                    h_range = h_max - h_min
                    fade = max(0.02, h_range * 0.15)

                    core_mask = (heights >= h_min + fade) & (heights <= h_max - fade)

                    fade_in_mask = (heights >= h_min) & (heights < h_min + fade)
                    fade_in_t = np.clip((heights[fade_in_mask] - h_min) / fade, 0, 1)

                    fade_out_mask = (heights > h_max - fade) & (heights <= h_max)
                    fade_out_t = np.clip(
                        (h_max - heights[fade_out_mask]) / fade, 0, 1
                    )

                    # Normal direction filters
                    if "nz_min" in region_info:
                        nz_threshold = region_info["nz_min"]
                        core_mask &= normal_z >= nz_threshold
                        fade_in_t *= (normal_z[fade_in_mask] >= nz_threshold).astype(
                            np.float32
                        )
                        fade_out_t *= (
                            normal_z[fade_out_mask] >= nz_threshold
                        ).astype(np.float32)
                    if "nz_max" in region_info:
                        nz_threshold = region_info["nz_max"]
                        core_mask &= normal_z <= nz_threshold
                        fade_in_t *= (normal_z[fade_in_mask] <= nz_threshold).astype(
                            np.float32
                        )
                        fade_out_t *= (
                            normal_z[fade_out_mask] <= nz_threshold
                        ).astype(np.float32)
                    if "nx_abs_min" in region_info:
                        nx_threshold = region_info["nx_abs_min"]
                        core_mask &= np.abs(normal_x) >= nx_threshold
                        fade_in_t *= (
                            np.abs(normal_x[fade_in_mask]) >= nx_threshold
                        ).astype(np.float32)
                        fade_out_t *= (
                            np.abs(normal_x[fade_out_mask]) >= nx_threshold
                        ).astype(np.float32)

                    vertex_colors[core_mask] = color_arr[None, :]
                    if fade_in_t.size > 0:
                        vertex_colors[fade_in_mask] = (
                            vertex_colors[fade_in_mask] * (1 - fade_in_t[:, None])
                            + color_arr[None, :] * fade_in_t[:, None]
                        )
                    if fade_out_t.size > 0:
                        vertex_colors[fade_out_mask] = (
                            vertex_colors[fade_out_mask] * (1 - fade_out_t[:, None])
                            + color_arr[None, :] * fade_out_t[:, None]
                        )

                    print(
                        f"      ✅ {region_key}: {int(core_mask.sum())} core + "
                        f"{int(fade_in_mask.sum()) + int(fade_out_mask.sum())} fade verts"
                    )

                # Subtle 3D lighting (keep colors vivid)
                up_factor = np.clip(normal_y, 0, 1)
                mask = up_factor > 0.7
                blend = np.clip((up_factor[mask] - 0.7) / 0.3 * 0.08, 0, 0.08)
                highlight_c = np.array([255, 255, 255], dtype=np.float32)
                vertex_colors[mask] = (
                    vertex_colors[mask] * (1 - blend[:, None])
                    + highlight_c[None, :] * blend[:, None]
                )

                mask = normal_y < -0.4
                shadow_f = np.clip(
                    (np.abs(normal_y[mask]) - 0.4) / 0.6 * 0.15, 0, 0.15
                )
                vertex_colors[mask] *= 1 - shadow_f[:, None]

            else:
                # ══════════════════════════════════════════════
                # MODE B: AUTO PALETTE
                # ══════════════════════════════════════════════
                obj_type = self._classify_object_for_texture(prompt)
                print(f"   🎯 Object type: {obj_type}")

                palettes = {
                    "robot": {
                        "zone_top": (60, 80, 110),
                        "zone_upper": (50, 130, 210),
                        "zone_mid": (85, 95, 115),
                        "zone_lower": (55, 140, 220),
                        "zone_bottom": (45, 55, 75),
                        "accent": (255, 60, 40),
                        "highlight": (180, 210, 240),
                        "front_tint": (70, 150, 220),
                    },
                    "mech": {
                        "zone_top": (80, 95, 60),
                        "zone_upper": (100, 120, 75),
                        "zone_mid": (65, 80, 55),
                        "zone_lower": (90, 110, 70),
                        "zone_bottom": (50, 60, 40),
                        "accent": (255, 180, 30),
                        "highlight": (160, 180, 140),
                        "front_tint": (110, 140, 90),
                    },
                    "character": {
                        "zone_top": (220, 180, 150),
                        "zone_upper": (60, 90, 180),
                        "zone_mid": (210, 170, 140),
                        "zone_lower": (50, 80, 160),
                        "zone_bottom": (80, 60, 50),
                        "accent": (230, 120, 50),
                        "highlight": (240, 210, 190),
                        "front_tint": (80, 120, 200),
                    },
                    "creature": {
                        "zone_top": (60, 160, 70),
                        "zone_upper": (40, 140, 100),
                        "zone_mid": (80, 150, 60),
                        "zone_lower": (50, 130, 90),
                        "zone_bottom": (40, 80, 50),
                        "accent": (240, 190, 50),
                        "highlight": (120, 200, 130),
                        "front_tint": (70, 170, 110),
                    },
                    "weapon": {
                        "zone_top": (160, 170, 180),
                        "zone_upper": (100, 105, 120),
                        "zone_mid": (180, 150, 90),
                        "zone_lower": (80, 85, 100),
                        "zone_bottom": (50, 50, 60),
                        "accent": (220, 160, 50),
                        "highlight": (200, 210, 220),
                        "front_tint": (130, 140, 160),
                    },
                    "vehicle": {
                        "zone_top": (30, 100, 200),
                        "zone_upper": (25, 90, 180),
                        "zone_mid": (60, 70, 90),
                        "zone_lower": (35, 100, 190),
                        "zone_bottom": (30, 40, 55),
                        "accent": (255, 60, 60),
                        "highlight": (100, 160, 220),
                        "front_tint": (50, 120, 210),
                    },
                    "building": {
                        "zone_top": (180, 160, 130),
                        "zone_upper": (160, 140, 120),
                        "zone_mid": (170, 155, 130),
                        "zone_lower": (140, 130, 115),
                        "zone_bottom": (100, 90, 80),
                        "accent": (70, 120, 180),
                        "highlight": (210, 200, 185),
                        "front_tint": (150, 145, 130),
                    },
                    "prop": {
                        "zone_top": (200, 160, 100),
                        "zone_upper": (80, 120, 180),
                        "zone_mid": (180, 150, 100),
                        "zone_lower": (70, 110, 170),
                        "zone_bottom": (60, 55, 50),
                        "accent": (230, 150, 50),
                        "highlight": (220, 200, 170),
                        "front_tint": (100, 140, 190),
                    },
                }

                palette = palettes.get(obj_type, palettes["prop"])

                # Apply style modifier to palette
                if style == "stylized":
                    # Boost saturation, more cartoonish vivid colors
                    for k in ["zone_top", "zone_upper", "zone_mid", "zone_lower", "zone_bottom", "accent"]:
                        c = list(palette[k])
                        avg = sum(c) / 3
                        palette[k] = tuple(int(np.clip(avg + (v - avg) * 1.8, 0, 255)) for v in c)
                elif style == "hand-painted":
                    # Warmer, slightly desaturated painterly tones
                    for k in ["zone_top", "zone_upper", "zone_mid", "zone_lower", "zone_bottom"]:
                        r, g, b = palette[k]
                        palette[k] = (min(255, r + 20), g, max(0, b - 15))
                elif style == "pbr":
                    # More metallic/neutral, higher contrast
                    for k in ["zone_top", "zone_upper", "zone_mid", "zone_lower", "zone_bottom"]:
                        c = list(palette[k])
                        avg = sum(c) / 3
                        palette[k] = tuple(int(np.clip(avg + (v - avg) * 0.6, 0, 255)) for v in c)

                ztop = np.array(palette["zone_top"], dtype=np.float32)
                zupper = np.array(palette["zone_upper"], dtype=np.float32)
                zmid = np.array(palette["zone_mid"], dtype=np.float32)
                zlower = np.array(palette["zone_lower"], dtype=np.float32)
                zbottom = np.array(palette["zone_bottom"], dtype=np.float32)
                accent_c = np.array(palette["accent"], dtype=np.float32)
                highlight_c = np.array(palette["highlight"], dtype=np.float32)
                front_c = np.array(palette["front_tint"], dtype=np.float32)

                vertex_colors = np.tile(zbottom, (N, 1))

                # Sharp step boundaries — narrow 3% transition bands
                mask = heights > 0.20
                t = np.clip((heights[mask] - 0.20) / 0.03, 0, 1)
                vertex_colors[mask] = (
                    zbottom[None, :] * (1 - t[:, None])
                    + zlower[None, :] * t[:, None]
                )

                mask = heights > 0.40
                t = np.clip((heights[mask] - 0.40) / 0.03, 0, 1)
                vertex_colors[mask] = (
                    zlower[None, :] * (1 - t[:, None])
                    + zmid[None, :] * t[:, None]
                )

                mask = heights > 0.60
                t = np.clip((heights[mask] - 0.60) / 0.03, 0, 1)
                vertex_colors[mask] = (
                    zmid[None, :] * (1 - t[:, None])
                    + zupper[None, :] * t[:, None]
                )

                mask = heights > 0.80
                t = np.clip((heights[mask] - 0.80) / 0.03, 0, 1)
                vertex_colors[mask] = (
                    zupper[None, :] * (1 - t[:, None])
                    + ztop[None, :] * t[:, None]
                )

                # Front tint (subtle — preserve base color)
                front_factor = np.clip(normal_z, 0, 1)
                mask = front_factor > 0.5
                blend = np.clip((front_factor[mask] - 0.5) / 0.5 * 0.12, 0, 0.12)
                vertex_colors[mask] = (
                    vertex_colors[mask] * (1 - blend[:, None])
                    + front_c[None, :] * blend[:, None]
                )

                # Upward highlight (subtle)
                up_factor = np.clip(normal_y, 0, 1)
                mask = up_factor > 0.7
                blend = np.clip((up_factor[mask] - 0.7) / 0.3 * 0.10, 0, 0.10)
                vertex_colors[mask] = (
                    vertex_colors[mask] * (1 - blend[:, None])
                    + highlight_c[None, :] * blend[:, None]
                )

                # Downward shadow (adds depth)
                mask = normal_y < -0.4
                shadow_f = np.clip(
                    (np.abs(normal_y[mask]) - 0.4) / 0.6 * 0.20, 0, 0.20
                )
                vertex_colors[mask] *= (1 - shadow_f[:, None])

                # Accent bands
                for band_h in [0.25, 0.50, 0.75]:
                    dist = np.abs(heights - band_h)
                    mask = dist < 0.03
                    accent_blend = np.clip(
                        (1 - dist[mask] / 0.03) * 0.4, 0, 0.4
                    )
                    vertex_colors[mask] = (
                        vertex_colors[mask] * (1 - accent_blend[:, None])
                        + accent_c[None, :] * accent_blend[:, None]
                    )

            # ── Add subtle noise ──
            np.random.seed(hash(job_id) % (2**31))
            noise = np.random.uniform(-6, 6, vertex_colors.shape)
            vertex_colors = np.clip(vertex_colors + noise, 0, 255)

            print(
                f"   ⚡ Vertex colors computed in {time.time() - t_start:.2f}s ({N} verts)"
            )

            # ── Ensure UV coordinates ──
            has_uv = False
            try:
                has_uv = (
                    hasattr(mesh.visual, "uv")
                    and mesh.visual.uv is not None
                    and len(mesh.visual.uv) > 0
                )
            except Exception:
                pass
            if not has_uv:
                mesh = self._generate_uv_box_projection(mesh)

            # ── Bake to UV texture ──
            texture_image = self._bake_vertex_colors_to_uv(
                mesh, vertex_colors, size=size
            )

            # Save texture PNG
            texture_path = str(OUTPUT_DIR / f"{job_id}_texture.png")
            texture_image.save(texture_path)

            # ── Export GLB with UV texture + WHITE PBRMaterial ──
            output_path = str(OUTPUT_DIR / f"{job_id}_textured.glb")
            self._export_textured_glb(
                mesh, texture_image, mesh.visual.uv, output_path
            )

            elapsed = time.time() - t_start
            print(
                f"   ✅ Procedural texture applied in {elapsed:.1f}s "
                f"({obj_type}, {N} verts, {len(mesh.faces)} faces)"
            )

            return {
                "success": True,
                "textured_model_path": output_path,
                "texture_path": texture_path,
                "style": style,
                "procedural": True,
                "object_type": obj_type,
            }

        except Exception as e:
            traceback.print_exc()
            return {"success": False, "error": f"Procedural texture failed: {e}"}

    # ════════════════════════════════════════════════════════════
    # PROMPT PARSING (regex only — no Gemini)
    # ════════════════════════════════════════════════════════════

    def _parse_texture_prompt(self, prompt: str):
        """
        Parse a texture prompt into (body_region_key, color_rgb) pairs.
        Uses regex matching only.

        Examples:
            "pink head, brown legs"
            → [("head", (255,182,193)), ("legs", (139,90,43))]

            "red"
            → [("__overall__", (220,50,50))]
        """
        if not prompt or not prompt.strip():
            return []

        parts = [p.strip() for p in prompt.replace(";", ",").split(",") if p.strip()]
        result = []

        for part in parts:
            part_lower = part.lower().strip()

            matched_region = None
            sorted_regions = sorted(
                self.BODY_REGION_MAP.keys(), key=len, reverse=True
            )
            for region_key in sorted_regions:
                if region_key in part_lower:
                    matched_region = region_key
                    break

            color = self._parse_color_from_text(part_lower)

            if color:
                if matched_region:
                    result.append((matched_region, color))
                else:
                    result.append(("__overall__", color))

        return result

    def _parse_color_from_text(self, text: str):
        """Parse a color from text. Returns (R,G,B) tuple or None."""
        import re

        text = text.strip().lower()

        hex_match = re.search(r"#([0-9a-fA-F]{6})", text)
        if hex_match:
            h = hex_match.group(1)
            return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))

        sorted_names = sorted(self.COLOR_MAP.keys(), key=len, reverse=True)
        for name in sorted_names:
            if name in text:
                return self.COLOR_MAP[name]

        return None

    def _classify_object_for_texture(self, prompt: str) -> str:
        """Classify the object type from the generation prompt."""
        prompt_lower = prompt.lower() if prompt else ""

        robot_words = [
            "robot", "mech", "android", "cyborg", "droid", "automaton", "bot",
            "iron man", "transformer", "gundam", "armor suit", "exosuit",
            "power armor",
        ]
        if any(w in prompt_lower for w in robot_words):
            if any(
                w in prompt_lower
                for w in ["mech", "gundam", "heavy", "military", "battle"]
            ):
                return "mech"
            return "robot"

        char_words = [
            "character", "person", "human", "man", "woman", "warrior", "knight",
            "soldier", "hero", "villain", "wizard", "mage", "archer", "assassin",
            "samurai", "ninja", "pirate", "cowboy", "astronaut", "prince",
            "princess", "elf", "dwarf", "orc",
        ]
        if any(w in prompt_lower for w in char_words):
            return "character"

        creature_words = [
            "creature", "monster", "dragon", "beast", "dinosaur", "alien",
            "demon", "wolf", "lion", "bear", "spider", "snake", "fish",
            "bird", "phoenix", "griffin", "hydra", "golem", "troll", "ogre",
            "cat", "dog", "horse", "animal",
        ]
        if any(w in prompt_lower for w in creature_words):
            return "creature"

        weapon_words = [
            "sword", "axe", "hammer", "bow", "shield", "staff", "wand",
            "gun", "rifle", "pistol", "blade", "dagger", "spear", "mace",
            "weapon", "katana", "scythe",
        ]
        if any(w in prompt_lower for w in weapon_words):
            return "weapon"

        vehicle_words = [
            "car", "truck", "tank", "ship", "boat", "plane", "aircraft",
            "spaceship", "motorcycle", "bike", "helicopter", "rocket",
            "vehicle", "train", "bus",
        ]
        if any(w in prompt_lower for w in vehicle_words):
            return "vehicle"

        building_words = [
            "building", "house", "castle", "tower", "temple", "church",
            "fortress", "bridge", "wall", "gate", "dungeon", "palace",
            "cabin", "hut", "shrine",
        ]
        if any(w in prompt_lower for w in building_words):
            return "building"

        return "prop"

    # ════════════════════════════════════════════════════════════
    # PBR MAP GENERATION
    # ════════════════════════════════════════════════════════════

    def generate_pbr_maps(self, texture_path: str):
        """Generate PBR maps (normal, roughness, metallic) from diffuse texture."""
        try:
            from PIL import Image, ImageFilter, ImageOps
            import cv2

            job_id = str(uuid.uuid4())
            print(f"\n🗺️  Generating PBR maps for: {texture_path}")

            diffuse = Image.open(texture_path)
            diffuse_array = np.array(diffuse)

            # Normal map via Sobel
            print("   Generating normal map...")
            gray = cv2.cvtColor(diffuse_array, cv2.COLOR_RGB2GRAY)
            sobelx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
            sobely = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
            sobelx = sobelx / (np.max(np.abs(sobelx)) + 1e-8)
            sobely = sobely / (np.max(np.abs(sobely)) + 1e-8)

            normal_map = np.zeros((*gray.shape, 3), dtype=np.float32)
            normal_map[:, :, 0] = sobelx * 0.5 + 0.5
            normal_map[:, :, 1] = sobely * 0.5 + 0.5
            normal_map[:, :, 2] = 1.0

            norm = np.sqrt(np.sum(normal_map**2, axis=2, keepdims=True))
            normal_map = normal_map / (norm + 1e-8)
            normal_map = ((normal_map + 1) / 2 * 255).astype(np.uint8)

            normal_img = Image.fromarray(normal_map)
            normal_path = str(OUTPUT_DIR / f"{job_id}_normal.png")
            normal_img.save(normal_path)

            # Roughness map
            print("   Generating roughness map...")
            roughness = cv2.GaussianBlur(gray, (5, 5), 0)
            roughness = cv2.Laplacian(roughness, cv2.CV_64F)
            roughness = np.abs(roughness)
            roughness = (roughness / (roughness.max() + 1e-8) * 255).astype(np.uint8)
            roughness = 255 - roughness
            roughness = cv2.GaussianBlur(roughness, (15, 15), 0)

            roughness_img = Image.fromarray(roughness)
            roughness_path = str(OUTPUT_DIR / f"{job_id}_roughness.png")
            roughness_img.save(roughness_path)

            # Metallic map
            print("   Generating metallic map...")
            metallic = np.full(gray.shape, 30, dtype=np.uint8)
            metallic_img = Image.fromarray(metallic)
            metallic_path = str(OUTPUT_DIR / f"{job_id}_metallic.png")
            metallic_img.save(metallic_path)

            print("✅ PBR maps generated!")
            return {
                "success": True,
                "normal_map": normal_path,
                "roughness_map": roughness_path,
                "metallic_map": metallic_path,
            }

        except Exception as e:
            print(f"❌ PBR generation error: {e}")
            traceback.print_exc()
            return {"success": False, "error": str(e)}

    # ════════════════════════════════════════════════════════════
    # DATA: Named color lookup table
    # ════════════════════════════════════════════════════════════

    COLOR_MAP = {
        # Reds / Pinks
        "red": (220, 50, 50), "dark red": (139, 0, 0), "light red": (255, 102, 102),
        "crimson": (220, 20, 60), "scarlet": (255, 36, 0), "maroon": (128, 0, 0),
        "pink": (255, 182, 193), "hot pink": (255, 105, 180),
        "light pink": (255, 200, 210),
        "dark pink": (231, 84, 128), "magenta": (255, 0, 255),
        "rose": (255, 0, 127),
        "salmon": (250, 128, 114), "coral": (255, 127, 80),
        # Oranges
        "orange": (255, 165, 0), "dark orange": (255, 140, 0),
        "light orange": (255, 200, 130),
        "peach": (255, 218, 185), "apricot": (251, 206, 177),
        "tangerine": (255, 154, 0),
        # Yellows
        "yellow": (255, 255, 0), "gold": (255, 215, 0), "golden": (255, 215, 0),
        "dark yellow": (204, 204, 0), "light yellow": (255, 255, 200),
        "amber": (255, 191, 0), "honey": (235, 177, 52), "lemon": (255, 247, 0),
        # Greens
        "green": (76, 175, 80), "dark green": (0, 100, 0),
        "light green": (144, 238, 144),
        "lime": (0, 255, 0), "olive": (128, 128, 0), "emerald": (80, 200, 120),
        "forest green": (34, 139, 34), "mint": (152, 255, 152),
        "teal": (0, 128, 128),
        "sage": (188, 184, 138), "jade": (0, 168, 107),
        "seafoam": (159, 226, 191),
        # Blues
        "blue": (66, 133, 244), "dark blue": (0, 0, 139),
        "light blue": (173, 216, 230),
        "sky blue": (135, 206, 235), "navy": (0, 0, 128),
        "royal blue": (65, 105, 225),
        "cyan": (0, 255, 255), "azure": (0, 127, 255), "cobalt": (0, 71, 171),
        "indigo": (75, 0, 130), "turquoise": (64, 224, 208),
        "ice blue": (173, 216, 230),
        "baby blue": (137, 207, 240), "powder blue": (176, 224, 230),
        # Purples
        "purple": (128, 0, 128), "dark purple": (72, 0, 72),
        "light purple": (200, 162, 255),
        "violet": (148, 0, 211), "lavender": (230, 190, 255),
        "plum": (221, 160, 221),
        "lilac": (200, 162, 200), "mauve": (224, 176, 255),
        # Browns
        "brown": (139, 90, 43), "dark brown": (101, 67, 33),
        "light brown": (181, 137, 87),
        "tan": (210, 180, 140), "beige": (245, 245, 220),
        "chocolate": (123, 63, 0),
        "coffee": (111, 78, 55), "caramel": (255, 195, 107),
        "khaki": (240, 230, 140),
        "leather": (150, 100, 50), "wood": (150, 111, 51),
        "wooden": (150, 111, 51),
        # Grays / Neutrals
        "gray": (158, 158, 158), "grey": (158, 158, 158),
        "dark gray": (96, 96, 96), "dark grey": (96, 96, 96),
        "light gray": (211, 211, 211), "light grey": (211, 211, 211),
        "charcoal": (54, 69, 79), "slate": (112, 128, 144),
        "ash": (178, 190, 181),
        # Black / White
        "black": (30, 30, 30), "white": (245, 245, 245),
        "ivory": (255, 255, 240), "cream": (255, 253, 208),
        "snow": (255, 250, 250),
        "off-white": (240, 240, 230),
        # Metallics
        "silver": (192, 192, 192), "metallic": (192, 192, 200),
        "chrome": (210, 213, 219),
        "metallic silver": (200, 205, 215), "metallic gold": (212, 175, 55),
        "steel": (176, 196, 222), "iron": (135, 140, 145),
        "copper": (184, 115, 51),
        "bronze": (205, 127, 50), "brass": (181, 166, 66),
        "platinum": (229, 228, 226),
        "titanium": (135, 134, 129),
        # Special
        "skin": (232, 190, 155), "flesh": (232, 190, 155),
        "bone": (227, 218, 201), "ivory white": (255, 255, 240),
        "rust": (183, 65, 14), "burgundy": (128, 0, 32),
        "neon green": (57, 255, 20), "neon blue": (77, 77, 255),
        "neon pink": (255, 16, 240),
        "glowing": (200, 240, 255), "glowing blue": (100, 180, 255),
        "glowing red": (255, 80, 80),
        "scaly": (90, 120, 70), "dark claws": (50, 45, 40),
    }

    # ════════════════════════════════════════════════════════════
    # DATA: Body region → height zone mapping
    # ════════════════════════════════════════════════════════════

    BODY_REGION_MAP = {
        "head": {"h_min": 0.82, "h_max": 1.0},
        "face": {"h_min": 0.85, "h_max": 1.0, "nz_min": 0.3},
        "hair": {"h_min": 0.90, "h_max": 1.0},
        "eyes": {"h_min": 0.88, "h_max": 0.94, "nz_min": 0.5},
        "helmet": {"h_min": 0.85, "h_max": 1.0},
        "crown": {"h_min": 0.92, "h_max": 1.0},
        "horn": {"h_min": 0.90, "h_max": 1.0},
        "horns": {"h_min": 0.90, "h_max": 1.0},
        "neck": {"h_min": 0.78, "h_max": 0.85},
        "collar": {"h_min": 0.78, "h_max": 0.85},
        "shoulder": {"h_min": 0.72, "h_max": 0.82},
        "shoulders": {"h_min": 0.72, "h_max": 0.82},
        "arm": {"h_min": 0.45, "h_max": 0.75, "nx_abs_min": 0.5},
        "arms": {"h_min": 0.45, "h_max": 0.75, "nx_abs_min": 0.5},
        "hand": {"h_min": 0.35, "h_max": 0.50, "nx_abs_min": 0.4},
        "hands": {"h_min": 0.35, "h_max": 0.50, "nx_abs_min": 0.4},
        "claw": {"h_min": 0.00, "h_max": 0.10},
        "claws": {"h_min": 0.00, "h_max": 0.10},
        "chest": {"h_min": 0.60, "h_max": 0.78, "nz_min": 0.2},
        "body": {"h_min": 0.30, "h_max": 0.78},
        "torso": {"h_min": 0.40, "h_max": 0.78},
        "belly": {"h_min": 0.35, "h_max": 0.50, "nz_min": 0.3},
        "stomach": {"h_min": 0.35, "h_max": 0.50, "nz_min": 0.3},
        "back": {"h_min": 0.40, "h_max": 0.78, "nz_max": -0.3},
        "cape": {"h_min": 0.40, "h_max": 0.85, "nz_max": -0.3},
        "armor": {"h_min": 0.40, "h_max": 0.78},
        "wing": {"h_min": 0.50, "h_max": 0.80, "nx_abs_min": 0.5},
        "wings": {"h_min": 0.50, "h_max": 0.80, "nx_abs_min": 0.5},
        "waist": {"h_min": 0.35, "h_max": 0.45},
        "hip": {"h_min": 0.30, "h_max": 0.40},
        "hips": {"h_min": 0.30, "h_max": 0.40},
        "leg": {"h_min": 0.08, "h_max": 0.35},
        "legs": {"h_min": 0.08, "h_max": 0.35},
        "thigh": {"h_min": 0.20, "h_max": 0.35},
        "thighs": {"h_min": 0.20, "h_max": 0.35},
        "knee": {"h_min": 0.18, "h_max": 0.25},
        "knees": {"h_min": 0.18, "h_max": 0.25},
        "shin": {"h_min": 0.08, "h_max": 0.18},
        "shins": {"h_min": 0.08, "h_max": 0.18},
        "foot": {"h_min": 0.00, "h_max": 0.08},
        "feet": {"h_min": 0.00, "h_max": 0.08},
        "boot": {"h_min": 0.00, "h_max": 0.15},
        "boots": {"h_min": 0.00, "h_max": 0.15},
        "shoe": {"h_min": 0.00, "h_max": 0.08},
        "shoes": {"h_min": 0.00, "h_max": 0.08},
        "blade": {"h_min": 0.40, "h_max": 1.0},
        "handle": {"h_min": 0.10, "h_max": 0.40},
        "grip": {"h_min": 0.10, "h_max": 0.35},
        "guard": {"h_min": 0.35, "h_max": 0.45},
        "pommel": {"h_min": 0.00, "h_max": 0.12},
        "hilt": {"h_min": 0.20, "h_max": 0.40},
        "wheel": {"h_min": 0.00, "h_max": 0.15},
        "wheels": {"h_min": 0.00, "h_max": 0.15},
        "hood": {"h_min": 0.60, "h_max": 0.80, "nz_min": 0.3},
        "roof": {"h_min": 0.85, "h_max": 1.0},
        "bumper": {"h_min": 0.05, "h_max": 0.20},
        "trim": {"h_min": 0.20, "h_max": 0.30},
        "top": {"h_min": 0.80, "h_max": 1.0},
        "upper": {"h_min": 0.60, "h_max": 0.80},
        "middle": {"h_min": 0.35, "h_max": 0.65},
        "lower": {"h_min": 0.15, "h_max": 0.35},
        "bottom": {"h_min": 0.00, "h_max": 0.15},
        "front": {"h_min": 0.0, "h_max": 1.0, "nz_min": 0.4},
        "joint": {"h_min": 0.20, "h_max": 0.25},
        "joints": {"h_min": 0.15, "h_max": 0.30},
    }


# ══════════════════════════════════════════════════════════════
# GLOBAL INSTANCE & CONVENIENCE FUNCTIONS
# ══════════════════════════════════════════════════════════════

ai_texturing_service = AITexturingService()


def auto_texture_model(model_path: str, style: str = "realistic"):
    """Convenience function for auto-texturing a model."""
    result = ai_texturing_service.generate_texture(model_path, style)
    if result.get("success"):
        return result.get("textured_model_path")
    return None


if __name__ == "__main__":
    print("AI Texturing Service Test")
    print("=" * 40)

    # Check ComfyUI
    if ai_texturing_service.comfyui and ai_texturing_service.comfyui.is_available():
        print("✅ ComfyUI is available — AI texturing enabled")
    else:
        print("⚠️  ComfyUI not available — procedural fallback will be used")

    # Test with a sample model if available
    sample_dir = Path(__file__).parent / "outputs"
    glb_files = list(sample_dir.glob("*.glb"))

    if glb_files:
        test_model = str(glb_files[0])
        print(f"\nTesting with: {test_model}")
        result = ai_texturing_service.generate_texture(
            test_model, style="realistic", prompt="red robot"
        )
        print(f"\nResult: {result}")
    else:
        print("\nNo test models found in outputs/")
