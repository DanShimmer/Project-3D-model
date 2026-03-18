"""
Pre-download all AI models from HuggingFace
Run this BEFORE your demo to avoid long waits during generation.

Usage:
    python predownload_models.py          # Download all models
    python predownload_models.py fast     # Download SD 1.5 only
    python predownload_models.py quality  # Download SDXL only
"""
import sys
import os
import time

# Ensure proper encoding on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

from config import SDConfig, CACHE_DIR, DEVICE

def download_sd15():
    """Pre-download Stable Diffusion 1.5"""
    print("\n" + "=" * 60)
    print("📦 Downloading Stable Diffusion 1.5...")
    print(f"   Model: {SDConfig.SD15_MODEL}")
    print(f"   Cache: {CACHE_DIR}")
    print("=" * 60)
    
    import torch
    from diffusers import StableDiffusionPipeline
    
    start = time.time()
    dtype = torch.float16 if DEVICE == "cuda" else torch.float32
    
    pipe = StableDiffusionPipeline.from_pretrained(
        SDConfig.SD15_MODEL,
        torch_dtype=dtype,
        cache_dir=str(CACHE_DIR),
        safety_checker=None,
        requires_safety_checker=False
    )
    del pipe
    
    elapsed = time.time() - start
    print(f"✅ SD 1.5 downloaded in {elapsed:.1f}s")


def download_sdxl():
    """Pre-download Stable Diffusion XL"""
    print("\n" + "=" * 60)
    print("📦 Downloading Stable Diffusion XL...")
    print(f"   Model: {SDConfig.SDXL_MODEL}")
    print(f"   Cache: {CACHE_DIR}")
    print("   ⚠️  This is ~6.5GB, please be patient!")
    print("=" * 60)
    
    import torch
    from diffusers import StableDiffusionXLPipeline
    
    start = time.time()
    dtype = torch.float16 if DEVICE == "cuda" else torch.float32
    
    pipe = StableDiffusionXLPipeline.from_pretrained(
        SDConfig.SDXL_MODEL,
        torch_dtype=dtype,
        cache_dir=str(CACHE_DIR),
        variant="fp16" if DEVICE == "cuda" else None,
        use_safetensors=True
    )
    del pipe
    
    elapsed = time.time() - start
    print(f"✅ SDXL downloaded in {elapsed:.1f}s")


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "all"
    
    print("🚀 Polyva 3D - Model Pre-Download")
    print(f"   Device: {DEVICE}")
    print(f"   Cache dir: {CACHE_DIR}")
    print("   Note: Hunyuan3D-2 models are downloaded automatically on first use.")
    
    total_start = time.time()
    
    if mode in ("all", "fast"):
        download_sd15()
    
    if mode in ("all", "quality"):
        download_sdxl()
    
    total_elapsed = time.time() - total_start
    print("\n" + "=" * 60)
    print(f"🎉 All models downloaded! Total time: {total_elapsed:.1f}s")
    print("   You can now run the AI service without long waits.")
    print("=" * 60)


if __name__ == "__main__":
    main()
