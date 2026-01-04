"""
AI Service Configuration
"""
import os
from pathlib import Path

# Base paths
BASE_DIR = Path(__file__).parent
UPLOAD_DIR = BASE_DIR / "uploads"
OUTPUT_DIR = BASE_DIR / "outputs"
MODELS_DIR = BASE_DIR / "models"
CACHE_DIR = BASE_DIR / "cache"

# Create directories
for d in [UPLOAD_DIR, OUTPUT_DIR, MODELS_DIR, CACHE_DIR]:
    d.mkdir(exist_ok=True)

# Model configurations
class SDConfig:
    """Stable Diffusion Configuration"""
    # SD 1.5 - Fast mode (less VRAM, faster)
    SD15_MODEL = "runwayml/stable-diffusion-v1-5"
    SD15_RESOLUTION = 512
    SD15_STEPS = 30
    
    # SDXL - Quality mode (more VRAM, better quality)
    SDXL_MODEL = "stabilityai/stable-diffusion-xl-base-1.0"
    SDXL_RESOLUTION = 1024
    SDXL_STEPS = 40
    
    # Generation params
    GUIDANCE_SCALE = 7.5
    NEGATIVE_PROMPT = (
        "blurry, low quality, low resolution, ugly, deformed, "
        "distorted, disfigured, bad anatomy, watermark, text, "
        "signature, multiple objects, multiple views"
    )
    
    # Optimized prompt suffix for 3D conversion
    PROMPT_SUFFIX = ", single object, centered, clean background, high quality, detailed, 8k"


class TripoConfig:
    """TripoSR Configuration"""
    MODEL_ID = "stabilityai/TripoSR"
    CHUNK_SIZE = 8192
    MC_RESOLUTION = 256  # Marching cubes resolution
    

class ProcessingConfig:
    """Image/3D Processing Configuration"""
    # Image preprocessing
    TARGET_SIZE = 512
    BACKGROUND_COLOR = (255, 255, 255)  # White background after removal
    
    # 3D post-processing
    TARGET_FACES = 50000  # Target polygon count
    SMOOTHING_ITERATIONS = 2
    

# Server config
HOST = os.getenv("AI_SERVICE_HOST", "0.0.0.0")
PORT = int(os.getenv("AI_SERVICE_PORT", 8000))
DEBUG = os.getenv("AI_SERVICE_DEBUG", "false").lower() == "true"

# Device
import torch
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
print(f"🖥️ AI Service will use: {DEVICE}")
if DEVICE == "cuda":
    print(f"   GPU: {torch.cuda.get_device_name(0)}")
    print(f"   VRAM: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB")
