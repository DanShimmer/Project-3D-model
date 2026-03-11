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
    SD15_STEPS = 50          # Higher steps = cleaner image for TripoSR
    
    # SDXL - Quality mode (more VRAM, better quality)
    SDXL_MODEL = "stabilityai/stable-diffusion-xl-base-1.0"
    SDXL_RESOLUTION = 1024
    SDXL_STEPS = 75          # Max quality for SDXL — crisp details for TripoSR
    
    # Generation params
    GUIDANCE_SCALE = 9.0     # 9.0: strong prompt adherence for detailed 3D shapes
    NEGATIVE_PROMPT = (
        # CRITICAL: Prevent holes and thin geometry
        "holes in body, gaps in mesh, broken geometry, missing parts, "
        "thin limbs, thin arms, thin legs, skinny, slender, stick figure, "
        "open mouth showing inside, hollow, see-through, translucent, transparent, "
        # Quality / Artifacts
        "blurry, low quality, low resolution, lowres, jpeg artifacts, "
        "noise, grain, pixelated, compression artifacts, out of focus, bokeh, "
        "ugly, deformed, distorted, disfigured, mutated, malformed, "
        # Anatomy (characters/creatures)
        "bad anatomy, bad proportions, extra limbs, missing limbs, "
        "fused fingers, too many fingers, long neck, cloned face, floating limbs, "
        "disconnected body parts, extra heads, extra arms, extra legs, "
        # Composition (CRITICAL: must be single object)
        "multiple objects, multiple views, collage, split view, "
        "side by side, grid, reference sheet, turnaround, diptych, triptych, "
        # Background/framing (CRITICAL: clean bg for rembg)
        "frame, border, picture frame, box, container, "
        "complex background, busy background, gradient background, "
        "ground, floor, shadow on ground, pedestal, stand, base, table, surface, "
        "environment, landscape, room, interior, outdoor scene, "
        # Flatness (CRITICAL: TripoSR needs 3D form)
        "flat, 2D, drawing, sketch, illustration, painting, cartoon, anime, "
        "bas-relief, relief, engraved, embossed, coin, medal, stamp, "
        "icon, logo, sticker, clipart, line art, cel shaded, "
        "front view, orthographic, flat lighting, no shadows, "
        # Cropping
        "cropped, cut off, partial, out of frame, truncated, "
        # Other
        "watermark, text, signature, label, caption, "
        "wireframe, grid, pattern, tiled, transparent background, "
        "photo, photograph, real person, realistic face"
    )
    
    # Prompt suffix (appended to enhanced prompt if needed)
    PROMPT_SUFFIX = ""


class TripoConfig:
    """TripoSR Configuration"""
    MODEL_ID = "stabilityai/TripoSR"
    CHUNK_SIZE = 8192
    MC_RESOLUTION = 512  # 512 is safe max for RTX 3060 12GB (grid = 512³×3×4 = 1.6GB)
                         # 1024 needs ~12.9GB VRAM → OOM → blob output
    MC_THRESHOLD = 10.0  # 10: captures fine detail while filtering noise
                         # Too low (<7) = noise becomes geometry = ugly holes
                         # Too high (>20) = thin parts disappear
    FOREGROUND_RATIO = 0.85  # 0.85 is TripoSR's default, well-tested
    

class ProcessingConfig:
    """Image/3D Processing Configuration"""
    # Image preprocessing
    TARGET_SIZE = 512
    BACKGROUND_COLOR = (127, 127, 127)  # GRAY background for TripoSR (0.5 * 255)
    FOREGROUND_RATIO = 0.85  # TripoSR default, well-tested
    
    # 3D post-processing
    TARGET_FACES = 200000  # 200k: preserves detail from MC 512, keeps file small
                           # MC 512 typically outputs ~100-300k faces
    SMOOTHING_ITERATIONS = 0  # 0: preserve all detail from higher MC resolution
    REMOVE_DISCONNECTED = True  # Remove disconnected components (frames/artifacts)
    

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
