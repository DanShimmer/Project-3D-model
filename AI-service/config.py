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
    """Stable Diffusion Configuration — Clean 3D Render style for TripoSR
    
    DESIGN PHILOSOPHY (revised — learned from official TripoSR + YouTube demos):
    TripoSR was trained on the Objaverse dataset = rendered 3D objects with
    COLOR, texture, and studio lighting. The DINOv2 encoder extracts rich
    visual features from colorful images.
    
    PREVIOUS MISTAKE: Gray clay images strip too much info → bad reconstruction.
    YouTube users feed colorful, detailed images → get great models.
    
    SOLUTION: Generate images that look like clean 3D GAME ASSET renders:
    - Colorful with simple/flat color palette (like a game asset)
    - Clean studio lighting (soft, even, no dramatic shadows)
    - Gray background (matches TripoSR training data)
    - Clear silhouette with solid proportions
    - Simple surface (not photorealistic, not hyperdetailed)
    """
    # SD 1.5 - Fast mode
    SD15_MODEL = "runwayml/stable-diffusion-v1-5"
    SD15_RESOLUTION = 512    # 512: SD1.5's native resolution, most stable
    SD15_STEPS = 25          # DPM++ 2M Karras converges fast at 25
    SD15_GUIDANCE = 7.5      # 7.5: strong adherence to clay/sculpt style
    
    # SDXL - Quality mode
    SDXL_MODEL = "stabilityai/stable-diffusion-xl-base-1.0"
    SDXL_RESOLUTION = 1024
    SDXL_STEPS = 30          # 30 steps with Karras is enough for SDXL
    SDXL_GUIDANCE = 7.0      # 7.0: balanced for SDXL
    
    # Shared fallback
    GUIDANCE_SCALE = 7.5
    
    # === NEGATIVE PROMPT — block things that hurt TripoSR reconstruction ===
    # Block: shadows on ground (reconstructed as geometry), complex backgrounds,
    # photorealism (too detailed), thin/broken geometry, 2D/flat styles.
    # DO NOT block: color, simple textures, lighting (these HELP TripoSR)
    NEGATIVE_PROMPT = (
        # Kill ground shadows — TripoSR reconstructs them as concave geometry
        "shadow on ground, cast shadow, drop shadow, ground shadow, "
        # Kill environment — TripoSR reconstructs background as solid geometry
        "environment, landscape, scenery, background scene, background details, "
        "floor, ground, ground plane, "
        "pedestal, stand, platform, base, surface, table, "
        # Kill photorealism (too much detail confuses geometry extraction)
        "photorealistic, photograph, photo, hyperrealistic, "
        "skin pores, fabric weave, intricate engraving, filigree, "
        # Kill composition issues
        "multiple objects, multiple views, split view, "
        "cropped, cut off, partial body, "
        "text, logo, watermark, signature, "
        # Kill thin/broken geometry
        "thin limbs, stick figure, elongated, stretched, "
        "floating parts, disconnected, holes, gaps, "
        "transparent, translucent, see-through, "
        # Kill flat/2D
        "flat, 2D, sketch, painting, illustration, "
        "anime, cartoon style, cel shading, line art"
    )
    
    # === BASE PROMPT — clean 3D render for geometry + color reconstruction ===
    # KEY INSIGHT: TripoSR was trained on Objaverse renders = colorful 3D objects
    # with studio lighting. Colorful images give DINOv2 MORE features to work with.
    # YouTube demos use colorful images → great models.
    # Gray clay strips info → bad models.
    BASE_3D_PROMPT = (
        "3D render, clean studio lighting, solid geometry, "
        "centered object, gray background, high quality, "
        "game asset style, simple clean surface, "
        "sharp silhouette, professional 3D model render"
    )
    
    # === MULTI-VIEW PROMPTS for 6-view generation ===
    # Each view adds a camera angle modifier to the base prompt.
    # Same seed across all views ensures consistent object identity.
    VIEW_PROMPTS = {
        'front':         'front view, facing camera',
        'back':          'back view, rear view, from behind',
        'left':          'left side view, profile view from left',
        'right':         'right side view, profile view from right',
        'top':           'top view, top-down view, bird eye view, overhead',
        'bottom':        'bottom view, underside view, from below',
        'three_quarter': 'three-quarter view from slightly above, 3/4 perspective',
    }


class Hunyuan3DConfig:
    """Hunyuan3D-2 Configuration — High-quality 3D generation from Tencent
    
    Hunyuan3D-2 uses a two-stage pipeline:
    1. Shape generation: Hunyuan3D-DiT (flow-matching diffusion transformer)
    2. Texture synthesis: Hunyuan3D-Paint (multiview texture baking)
    
    Models are downloaded from HuggingFace automatically.
    
    VRAM Requirements:
    - Shape only: ~6 GB
    - Shape + Texture: ~16 GB (use LOW_VRAM_MODE for 12GB GPUs)
    
    Turbo models use 5 steps (vs 50) with FlashVDM for 10x faster inference.
    Mini models (0.6B) are lighter alternatives to standard (1.1B).
    """
    
    # === Shape Generation Model ===
    # Options:
    #   'tencent/Hunyuan3D-2'     (1.1B, standard quality)
    #   'tencent/Hunyuan3D-2mini' (0.6B, faster, less VRAM)
    #   'tencent/Hunyuan3D-2mv'   (1.1B, multiview input)
    SHAPE_MODEL_PATH = "tencent/Hunyuan3D-2"
    
    # Subfolder within the model repo:
    #   'hunyuan3d-dit-v2-0'       (standard, 50 steps)
    #   'hunyuan3d-dit-v2-0-turbo' (turbo, 5 steps with FlashVDM)
    #   'hunyuan3d-dit-v2-0-fast'  (fast, guidance distillation)
    #   'hunyuan3d-dit-v2-mini'    (mini 0.6B)
    #   'hunyuan3d-dit-v2-mini-turbo' (mini turbo)
    SHAPE_SUBFOLDER = "hunyuan3d-dit-v2-0-turbo"
    
    # === Texture Generation Model ===
    TEXTURE_MODEL_PATH = "tencent/Hunyuan3D-2"
    TEXTURE_SUBFOLDER = None  # Uses default paint model
    ENABLE_TEXTURE = True     # Set False to skip texture (shape only, much faster)
    
    # === Inference Settings ===
    # Turbo mode: 5 steps is enough with FlashVDM
    # Standard mode: 50 steps for maximum quality
    USE_TURBO = True
    NUM_INFERENCE_STEPS = 5   # 5 for turbo, 50 for standard
    GUIDANCE_SCALE = 5.0      # 5.0 for turbo/flow-matching, 7.5 for standard
    
    # === Mesh Extraction Settings ===
    OCTREE_RESOLUTION = 380   # Higher = more detail (256-512), 380 is good balance
    NUM_CHUNKS = 200000       # Memory chunks for marching cubes (increase if OOM)
    MAX_FACES = 100000        # Face reduction target (0 = no reduction)
    
    # === GPU/VRAM Settings ===
    USE_FP16 = True           # Half precision for less VRAM
    LOW_VRAM_MODE = False     # Disabled: shape-only uses ~6GB, fits in 12GB RTX 3060 without offload
    
    # === Reproducibility ===
    DEFAULT_SEED = 12345
    

class ProcessingConfig:
    """Image/3D Processing Configuration"""
    # Image preprocessing
    TARGET_SIZE = 512
    BACKGROUND_COLOR = (127, 127, 127)  # Gray background (fallback only)
    FOREGROUND_RATIO = 0.85  # How much of image the object fills
    
    # Image enhancement — DISABLED (Hunyuan3D handles its own preprocessing)
    ENHANCE_CONTRAST = 1.0    # 1.0 = NO enhancement
    ENHANCE_SHARPNESS = 1.0   # 1.0 = NO enhancement
    BILATERAL_DENOISE = False  # DISABLED
    
    # Multi-view settings (for Text-to-3D with SD image generation)
    ENABLE_MULTIVIEW = True
    MULTIVIEW_VIEWS = ['front', 'back', 'left', 'right', 'top', 'three_quarter']
    PRIMARY_VIEW = 'three_quarter'  # Best view for single-image reconstruction
    
    # 3D post-processing — MINIMAL
    # Hunyuan3D-2 has built-in mesh cleanup (FloaterRemover, DegenerateFaceRemover)
    # and outputs Y-up GLB standard. Post-processing is mainly for:
    # - Ensuring upright orientation
    # - Normalizing scale for the viewer
    # - Grounding model at Y=0 for rigging
    TARGET_FACES = 200000  # Only reduce if exceeding this (unlikely)
    SMOOTHING_ITERATIONS = 0  # DISABLED: Hunyuan3D output is already smooth
    REMOVE_DISCONNECTED = True  # Remove floating artifacts
    
    # Rigging cleanup
    SYMMETRIZE_MESH = False     # DISABLED: Hunyuan3D preserves intended asymmetry
    CLOSE_MESH_HOLES = False    # DISABLED: Hunyuan3D produces cleaner topology
    MERGE_CLOSE_VERTICES = True # Non-destructive micro-gap cleanup
    MERGE_THRESHOLD = 0.001     # Vertex merge distance threshold
    

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
