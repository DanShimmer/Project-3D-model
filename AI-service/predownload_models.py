"""
Pre-download all AI models from HuggingFace
Run this BEFORE your demo to avoid long waits during generation.

Usage:
    python predownload_models.py          # Download all models
    python predownload_models.py fast     # Download SD 1.5 + TripoSR only
    python predownload_models.py quality  # Download SDXL + TripoSR only
"""
import sys
import os
import time

# Ensure proper encoding on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

from config import SDConfig, TripoConfig, CACHE_DIR, DEVICE

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


def download_triposr():
    """Pre-download TripoSR model"""
    print("\n" + "=" * 60)
    print("📦 Downloading TripoSR...")
    print(f"   Model: {TripoConfig.MODEL_ID}")
    print("=" * 60)
    
    start = time.time()
    
    try:
        # Try local TripoSR installation
        TRIPOSR_PATH = os.getenv("TRIPOSR_PATH", "./TripoSR")
        if os.path.exists(TRIPOSR_PATH):
            sys.path.insert(0, TRIPOSR_PATH)
        
        from tsr.system import TSR
        model = TSR.from_pretrained(
            TripoConfig.MODEL_ID,
            config_name="config.yaml",
            weight_name="model.ckpt"
        )
        del model
        elapsed = time.time() - start
        print(f"✅ TripoSR downloaded in {elapsed:.1f}s")
    except ImportError:
        try:
            from huggingface_hub import snapshot_download
            snapshot_download(TripoConfig.MODEL_ID, cache_dir=str(CACHE_DIR))
            elapsed = time.time() - start
            print(f"✅ TripoSR downloaded in {elapsed:.1f}s")
        except Exception as e:
            print(f"⚠️ Could not pre-download TripoSR: {e}")
            print("   It will be downloaded on first use.")


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "all"
    
    print("🚀 Polyva 3D - Model Pre-Download")
    print(f"   Device: {DEVICE}")
    print(f"   Cache dir: {CACHE_DIR}")
    
    total_start = time.time()
    
    if mode in ("all", "fast"):
        download_sd15()
    
    if mode in ("all", "quality"):
        download_sdxl()
    
    download_triposr()
    
    total_elapsed = time.time() - total_start
    print("\n" + "=" * 60)
    print(f"🎉 All models downloaded! Total time: {total_elapsed:.1f}s")
    print("   You can now run the AI service without long waits.")
    print("=" * 60)


if __name__ == "__main__":
    main()
