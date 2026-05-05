"""
ComfyUI API Client — Connects to a running ComfyUI instance for
SDXL + ControlNet texture generation.

This implements the StableGen-style pipeline:
  Upload depth image → Build SDXL+ControlNet workflow → Queue prompt →
  Poll for completion → Download generated image

ComfyUI REST API reference:
  POST /upload/image      — Upload an image to input directory
  POST /prompt            — Queue a workflow for execution
  GET  /history/{id}      — Check prompt execution status/results
  GET  /view              — Download a generated image
  GET  /system_stats      — Check if server is alive
"""

import io
import json
import time
import uuid
import traceback

import requests
from PIL import Image


class ComfyUIClient:
    """HTTP client for a ComfyUI server."""

    def __init__(self, base_url: str = "http://127.0.0.1:8188"):
        self.base_url = base_url.rstrip("/")
        self.client_id = uuid.uuid4().hex

    # ─── Connection ────────────────────────────────────────────

    def is_available(self) -> bool:
        """Return True if the ComfyUI server is reachable."""
        try:
            r = requests.get(f"{self.base_url}/system_stats", timeout=3)
            return r.status_code == 200
        except Exception:
            return False

    # ─── Image Upload ──────────────────────────────────────────

    def upload_image(self, image: Image.Image, name: str = None) -> str:
        """
        Upload a PIL Image to ComfyUI's input directory.
        Returns the server-side filename.
        """
        if name is None:
            name = f"polyva_depth_{uuid.uuid4().hex[:8]}.png"

        buf = io.BytesIO()
        image.save(buf, format="PNG")
        buf.seek(0)

        r = requests.post(
            f"{self.base_url}/upload/image",
            files={"image": (name, buf, "image/png")},
            data={"overwrite": "true", "subfolder": "", "type": "input"},
        )
        r.raise_for_status()
        result = r.json()
        return result.get("name", name)

    # ─── Workflow Queue ────────────────────────────────────────

    def queue_prompt(self, workflow: dict) -> str:
        """Queue a workflow and return the prompt_id."""
        payload = {"prompt": workflow, "client_id": self.client_id}
        r = requests.post(f"{self.base_url}/prompt", json=payload)
        r.raise_for_status()
        data = r.json()
        return data["prompt_id"]

    # ─── Result Polling ────────────────────────────────────────

    def wait_for_result(self, prompt_id: str, timeout: int = 180):
        """
        Poll /history/{prompt_id} until the job finishes.
        Returns a list of image info dicts [{filename, subfolder, type}, ...].
        """
        start = time.time()
        while time.time() - start < timeout:
            try:
                r = requests.get(f"{self.base_url}/history/{prompt_id}", timeout=5)
                if r.status_code == 200:
                    history = r.json()
                    if prompt_id in history:
                        outputs = history[prompt_id].get("outputs", {})
                        images = []
                        for _node_id, node_out in outputs.items():
                            if "images" in node_out:
                                images.extend(node_out["images"])
                        if images:
                            return images
            except Exception:
                pass
            time.sleep(1.5)

        raise TimeoutError(
            f"ComfyUI prompt {prompt_id} did not complete within {timeout}s"
        )

    # ─── Image Download ───────────────────────────────────────

    def download_image(
        self, filename: str, subfolder: str = "", img_type: str = "output"
    ) -> Image.Image:
        """Download a generated image from ComfyUI and return as PIL Image."""
        params = {"filename": filename, "subfolder": subfolder, "type": img_type}
        r = requests.get(f"{self.base_url}/view", params=params, timeout=30)
        r.raise_for_status()
        return Image.open(io.BytesIO(r.content)).convert("RGB")

    # ─── High-level: generate texture from depth ──────────────

    def generate_texture_from_depth(
        self,
        depth_image: Image.Image,
        prompt: str,
        negative_prompt: str,
        config: dict,
    ) -> Image.Image:
        """
        End-to-end: upload depth → build workflow → queue → wait → download.

        Args:
            depth_image:     PIL Image – depth map for ControlNet
            prompt:          Positive text prompt
            negative_prompt: Negative text prompt
            config: {
                checkpoint, controlnet, width, height, steps, cfg,
                seed, strength, sampler, scheduler, denoise, timeout,
                use_sd15  (bool)
            }

        Returns:
            PIL Image of the generated textured view.
        """
        print(f"      📤 Uploading depth image to ComfyUI...")
        uploaded_name = self.upload_image(depth_image)

        print(f"      🔧 Building workflow...")
        use_sd15 = config.get("use_sd15", False)
        if use_sd15:
            workflow = self._build_sd15_controlnet_workflow(
                uploaded_name, prompt, negative_prompt, config
            )
        else:
            workflow = self._build_sdxl_controlnet_workflow(
                uploaded_name, prompt, negative_prompt, config
            )

        print(f"      ⏳ Queueing prompt...")
        prompt_id = self.queue_prompt(workflow)

        timeout = config.get("timeout", 180)
        print(f"      ⏳ Waiting for result (timeout={timeout}s)...")
        images = self.wait_for_result(prompt_id, timeout=timeout)

        if not images:
            raise RuntimeError("ComfyUI returned no output images")

        # Download the first result image
        img_info = images[0]
        result = self.download_image(
            img_info["filename"],
            img_info.get("subfolder", ""),
            img_info.get("type", "output"),
        )
        print(f"      ✅ Generated texture downloaded: {img_info['filename']}")
        return result

    # ─── Workflow Builders ────────────────────────────────────

    def _build_sdxl_controlnet_workflow(
        self, image_name: str, prompt: str, negative_prompt: str, config: dict
    ) -> dict:
        """
        Build a ComfyUI workflow JSON for SDXL + ControlNet Depth.

        Node graph:
          [1] CheckpointLoaderSimple (SDXL)
          [2] CLIPTextEncode (positive)
          [3] CLIPTextEncode (negative)
          [4] ControlNetLoader
          [5] LoadImage (uploaded depth)
          [6] ControlNetApplyAdvanced
          [7] EmptyLatentImage
          [8] KSampler
          [9] VAEDecode
          [10] SaveImage
        """
        checkpoint = config.get("checkpoint", "sd_xl_base_1.0.safetensors")
        controlnet = config.get("controlnet", "diffusers_xl_depth_full.safetensors")
        width = config.get("width", 1024)
        height = config.get("height", 1024)
        steps = config.get("steps", 25)
        cfg = config.get("cfg", 7.0)
        seed = config.get("seed", 42)
        cn_strength = config.get("strength", 0.85)
        sampler = config.get("sampler", "euler_ancestral")
        scheduler = config.get("scheduler", "normal")
        denoise = config.get("denoise", 1.0)

        return {
            # ── Load SDXL checkpoint ──
            "1": {
                "class_type": "CheckpointLoaderSimple",
                "inputs": {"ckpt_name": checkpoint},
            },
            # ── Positive prompt ──
            "2": {
                "class_type": "CLIPTextEncode",
                "inputs": {"text": prompt, "clip": ["1", 1]},
            },
            # ── Negative prompt ──
            "3": {
                "class_type": "CLIPTextEncode",
                "inputs": {"text": negative_prompt, "clip": ["1", 1]},
            },
            # ── Load ControlNet model ──
            "4": {
                "class_type": "ControlNetLoader",
                "inputs": {"control_net_name": controlnet},
            },
            # ── Load uploaded depth image ──
            "5": {
                "class_type": "LoadImage",
                "inputs": {"image": image_name},
            },
            # ── Apply ControlNet conditioning ──
            "6": {
                "class_type": "ControlNetApplyAdvanced",
                "inputs": {
                    "positive": ["2", 0],
                    "negative": ["3", 0],
                    "control_net": ["4", 0],
                    "image": ["5", 0],
                    "strength": cn_strength,
                    "start_percent": 0.0,
                    "end_percent": 1.0,
                },
            },
            # ── Empty latent ──
            "7": {
                "class_type": "EmptyLatentImage",
                "inputs": {"width": width, "height": height, "batch_size": 1},
            },
            # ── KSampler ──
            "8": {
                "class_type": "KSampler",
                "inputs": {
                    "model": ["1", 0],
                    "positive": ["6", 0],
                    "negative": ["6", 1],
                    "latent_image": ["7", 0],
                    "seed": seed,
                    "steps": steps,
                    "cfg": cfg,
                    "sampler_name": sampler,
                    "scheduler": scheduler,
                    "denoise": denoise,
                },
            },
            # ── VAE Decode ──
            "9": {
                "class_type": "VAEDecode",
                "inputs": {"samples": ["8", 0], "vae": ["1", 2]},
            },
            # ── Save Image ──
            "10": {
                "class_type": "SaveImage",
                "inputs": {"images": ["9", 0], "filename_prefix": "polyva_texture"},
            },
        }

    def _build_sd15_controlnet_workflow(
        self, image_name: str, prompt: str, negative_prompt: str, config: dict
    ) -> dict:
        """
        Build a ComfyUI workflow JSON for SD1.5 + ControlNet Depth.
        Same structure as SDXL but with different default sizes.
        """
        checkpoint = config.get("checkpoint", "v1-5-pruned-emaonly.safetensors")
        controlnet = config.get(
            "controlnet", "control_v11f1p_sd15_depth.safetensors"
        )
        width = config.get("width", 512)
        height = config.get("height", 512)
        steps = config.get("steps", 30)
        cfg = config.get("cfg", 7.5)
        seed = config.get("seed", 42)
        cn_strength = config.get("strength", 0.85)
        sampler = config.get("sampler", "euler_ancestral")
        scheduler = config.get("scheduler", "normal")
        denoise = config.get("denoise", 1.0)

        return {
            "1": {
                "class_type": "CheckpointLoaderSimple",
                "inputs": {"ckpt_name": checkpoint},
            },
            "2": {
                "class_type": "CLIPTextEncode",
                "inputs": {"text": prompt, "clip": ["1", 1]},
            },
            "3": {
                "class_type": "CLIPTextEncode",
                "inputs": {"text": negative_prompt, "clip": ["1", 1]},
            },
            "4": {
                "class_type": "ControlNetLoader",
                "inputs": {"control_net_name": controlnet},
            },
            "5": {
                "class_type": "LoadImage",
                "inputs": {"image": image_name},
            },
            "6": {
                "class_type": "ControlNetApplyAdvanced",
                "inputs": {
                    "positive": ["2", 0],
                    "negative": ["3", 0],
                    "control_net": ["4", 0],
                    "image": ["5", 0],
                    "strength": cn_strength,
                    "start_percent": 0.0,
                    "end_percent": 1.0,
                },
            },
            "7": {
                "class_type": "EmptyLatentImage",
                "inputs": {"width": width, "height": height, "batch_size": 1},
            },
            "8": {
                "class_type": "KSampler",
                "inputs": {
                    "model": ["1", 0],
                    "positive": ["6", 0],
                    "negative": ["6", 1],
                    "latent_image": ["7", 0],
                    "seed": seed,
                    "steps": steps,
                    "cfg": cfg,
                    "sampler_name": sampler,
                    "scheduler": scheduler,
                    "denoise": denoise,
                },
            },
            "9": {
                "class_type": "VAEDecode",
                "inputs": {"samples": ["8", 0], "vae": ["1", 2]},
            },
            "10": {
                "class_type": "SaveImage",
                "inputs": {"images": ["9", 0], "filename_prefix": "polyva_texture"},
            },
        }
