"""
Stable Diffusion Text-to-Image Generator
Supports SD 1.5 (fast) and SDXL (quality)

Optimized for RTX 3060 12GB
"""
import torch
import gc
from PIL import Image
from diffusers import (
    StableDiffusionPipeline, 
    StableDiffusionXLPipeline,
    DPMSolverMultistepScheduler,
    EulerAncestralDiscreteScheduler
)
from config import SDConfig, DEVICE, CACHE_DIR

# Import GPU optimizer for automatic optimizations
try:
    from gpu_optimizer import gpu_optimizer
    GPU_OPTIMIZER_AVAILABLE = True
    print("✅ GPU Optimizer loaded")
except ImportError:
    GPU_OPTIMIZER_AVAILABLE = False
    print("⚠️ GPU Optimizer not available, using default settings")


def check_vram_status():
    """Check VRAM and warn if low"""
    if not torch.cuda.is_available():
        return
    
    allocated = torch.cuda.memory_allocated() / (1024 ** 3)
    total = torch.cuda.get_device_properties(0).total_memory / (1024 ** 3)
    free = total - allocated
    
    print(f"📊 VRAM: {allocated:.1f}GB used / {total:.1f}GB total ({free:.1f}GB free)")
    
    if free < 3.0:
        print("⚠️ Low VRAM, clearing cache...")
        torch.cuda.empty_cache()
        gc.collect()


class StableDiffusionGenerator:
    def __init__(self):
        self.sd15_pipe = None
        self.sdxl_pipe = None
        self.current_model = None
        
    def _load_sd15(self):
        """Load SD 1.5 model with GPU optimizations"""
        if self.sd15_pipe is not None:
            return
        
        print("📦 Loading Stable Diffusion 1.5...")
        
        # Get optimized dtype
        dtype = torch.float16 if DEVICE == "cuda" else torch.float32
        if GPU_OPTIMIZER_AVAILABLE:
            dtype = gpu_optimizer.optimizations["sd"]["dtype"]
        
        self.sd15_pipe = StableDiffusionPipeline.from_pretrained(
            SDConfig.SD15_MODEL,
            torch_dtype=dtype,
            cache_dir=str(CACHE_DIR),
            safety_checker=None,
            requires_safety_checker=False
        )
        
        # Use DPM++ 2M scheduler for faster generation
        self.sd15_pipe.scheduler = DPMSolverMultistepScheduler.from_config(
            self.sd15_pipe.scheduler.config
        )
        
        self.sd15_pipe = self.sd15_pipe.to(DEVICE)
        
        # Apply GPU optimizations
        if GPU_OPTIMIZER_AVAILABLE and DEVICE == "cuda":
            self.sd15_pipe = gpu_optimizer.apply_sd_optimizations(self.sd15_pipe)
        elif DEVICE == "cuda":
            self.sd15_pipe.enable_attention_slicing()
            try:
                self.sd15_pipe.enable_xformers_memory_efficient_attention()
                print("  ✓ xformers enabled")
            except:
                pass
        
        print("  ✓ SD 1.5 loaded")
        
    def _load_sdxl(self):
        """Load SDXL model with GPU optimizations"""
        if self.sdxl_pipe is not None:
            return
        
        print("📦 Loading Stable Diffusion XL...")
        
        # Get optimized dtype
        dtype = torch.float16 if DEVICE == "cuda" else torch.float32
        if GPU_OPTIMIZER_AVAILABLE:
            dtype = gpu_optimizer.optimizations["sd"]["dtype"]
        
        self.sdxl_pipe = StableDiffusionXLPipeline.from_pretrained(
            SDConfig.SDXL_MODEL,
            torch_dtype=dtype,
            cache_dir=str(CACHE_DIR),
            variant="fp16" if DEVICE == "cuda" else None,
            use_safetensors=True
        )
        
        # Use Euler Ancestral for SDXL
        self.sdxl_pipe.scheduler = EulerAncestralDiscreteScheduler.from_config(
            self.sdxl_pipe.scheduler.config
        )
        
        self.sdxl_pipe = self.sdxl_pipe.to(DEVICE)
        
        # Apply GPU optimizations
        if GPU_OPTIMIZER_AVAILABLE and DEVICE == "cuda":
            self.sdxl_pipe = gpu_optimizer.apply_sd_optimizations(self.sdxl_pipe)
        elif DEVICE == "cuda":
            self.sdxl_pipe.enable_attention_slicing()
            try:
                self.sdxl_pipe.enable_xformers_memory_efficient_attention()
                print("  ✓ xformers enabled")
            except:
                pass
        
        print("  ✓ SDXL loaded")
        
    def unload_models(self):
        """Unload models to free VRAM"""
        if self.sd15_pipe is not None:
            del self.sd15_pipe
            self.sd15_pipe = None
        if self.sdxl_pipe is not None:
            del self.sdxl_pipe
            self.sdxl_pipe = None
        if DEVICE == "cuda":
            torch.cuda.empty_cache()
        print("🗑️ Models unloaded")
    
    # --- Object type classification for prompt engineering ---
    _CATEGORY_KEYWORDS = {
        'character': [
            'character', 'person', 'man', 'woman', 'girl', 'boy', 'knight',
            'warrior', 'wizard', 'soldier', 'hero', 'villain', 'figure',
            'chibi', 'anime', 'human', 'elf', 'dwarf', 'orc', 'pirate',
            'ninja', 'samurai', 'princess', 'prince', 'king', 'queen',
            'mage', 'archer', 'thief', 'assassin', 'monk', 'cleric',
        ],
        'creature': [
            'dragon', 'monster', 'creature', 'beast', 'demon', 'wolf',
            'cat', 'dog', 'fox', 'bear', 'lion', 'tiger', 'horse',
            'bird', 'eagle', 'phoenix', 'dinosaur', 'snake', 'spider',
            'fish', 'whale', 'shark', 'unicorn', 'griffin', 'hydra',
            'slime', 'golem', 'elemental', 'pet', 'animal', 'bunny',
            'rabbit', 'deer', 'frog', 'turtle', 'owl', 'bat',
        ],
        'vehicle': [
            'car', 'truck', 'tank', 'ship', 'boat', 'airplane', 'plane',
            'spaceship', 'spacecraft', 'helicopter', 'motorcycle', 'bike',
            'train', 'bus', 'mech', 'robot', 'vehicle', 'wagon', 'cart',
            'submarine', 'rocket', 'starfighter', 'hovercraft',
        ],
        'building': [
            'house', 'castle', 'tower', 'building', 'temple', 'church',
            'cathedral', 'fortress', 'cabin', 'hut', 'palace', 'mansion',
            'skyscraper', 'bridge', 'wall', 'gate', 'dungeon', 'shrine',
            'pyramid', 'lighthouse', 'windmill', 'barn',
        ],
        'weapon': [
            'sword', 'axe', 'hammer', 'bow', 'staff', 'wand', 'shield',
            'spear', 'dagger', 'knife', 'gun', 'rifle', 'pistol',
            'blade', 'katana', 'mace', 'scythe', 'trident', 'crossbow',
            'weapon', 'armor', 'helmet', 'gauntlet',
        ],
        'prop': [
            'chest', 'barrel', 'crate', 'potion', 'bottle', 'lamp',
            'lantern', 'torch', 'book', 'scroll', 'gem', 'crystal',
            'coin', 'key', 'ring', 'crown', 'throne', 'table', 'chair',
            'desk', 'bed', 'shelf', 'door', 'window', 'fence',
            'tree', 'rock', 'stone', 'mushroom', 'flower', 'plant',
            'food', 'cake', 'cup', 'mug', 'hat', 'shoe', 'bag',
            'guitar', 'piano', 'drum', 'violin', 'trophy',
        ],
    }
    
    _CATEGORY_QUALITY = {
        'character': (
            "full body standing pose head to feet, "
            "detailed face with eyes nose mouth, "
            "solid thick proportions, collectible figurine"
        ),
        'creature': (
            "full body powerful stance, "
            "detailed face with eyes and teeth, "
            "solid thick body, creature figurine"
        ),
        'vehicle': (
            "complete vehicle all angles visible, "
            "detailed panels wheels windows, "
            "solid connected parts, die-cast model"
        ),
        'building': (
            "complete solid architecture, "
            "detailed walls windows roof, "
            "architectural scale model"
        ),
        'weapon': (
            "complete weapon fully visible, "
            "detailed blade and handle, "
            "solid chunky proportions, prop replica"
        ),
        'prop': (
            "complete solid object, "
            "detailed surface and textures, "
            "clearly defined shape, miniature model"
        ),
    }

    def _classify_object(self, prompt: str) -> str:
        """Classify the user's prompt into an object category for targeted enhancement."""
        prompt_lower = prompt.lower()
        scores = {}
        for cat, keywords in self._CATEGORY_KEYWORDS.items():
            score = sum(1 for kw in keywords if kw in prompt_lower)
            if score > 0:
                scores[cat] = score
        if scores:
            return max(scores, key=scores.get)
        return 'prop'  # default fallback

    def _build_3d_prompt(self, user_prompt: str, mode: str = "fast") -> str:
        """
        Build an EXTREMELY detailed prompt optimized for TripoSR reconstruction.
        
        KEY INSIGHT: TripoSR needs images that look like RENDERS OF SOLID 3D OBJECTS.
        The #1 cause of holes is ambiguous depth cues in the SD-generated image.
        
        What works best:
        - STRONG directional lighting with clear shadows ON the object
        - Three-quarter elevated view (TripoSR training data angle)
        - SOLID, CHUNKY, THICK proportions (thin parts = holes)
        - HIGH CONTRAST between light and shadow sides
        - SMOOTH, SIMPLE surfaces (not overly detailed textures)
        - Clean gray/white background for rembg
        - Object looks like a CLAY/RESIN figure or game asset
        """
        user_prompt = user_prompt.strip().rstrip('.')
        category = self._classify_object(user_prompt)
        cat_quality = self._CATEGORY_QUALITY.get(category, self._CATEGORY_QUALITY['prop'])
        
        print(f"  🏷️ Object category: {category}")
        
        if mode == "quality":
            # SDXL: 154 token limit — can be detailed
            enhanced = (
                f"a highly detailed 3D figurine of {user_prompt}, "
                f"three-quarter view from slightly above, "
                f"single object centered on plain gray background, "
                f"strong directional lighting from upper left with clear shadows on the surface, "
                f"solid thick proportions, no holes or gaps, complete figure, "
                f"smooth clean surface like premium resin collectible, "
                f"{cat_quality}, "
                f"sharp focus, physically based rendering, octane render, 8K detail, "
                f"professional product photography, game asset"
            )
        else:
            # SD 1.5: 77 token limit — must be concise!
            enhanced = (
                f"3D figurine of {user_prompt}, "
                f"three-quarter view from above, gray background, "
                f"strong directional lighting, clear shadows, "
                f"solid thick proportions, no holes, smooth surface, "
                f"{cat_quality}, "
                f"sharp focus, PBR render, product photo"
            )
        
        print(f"  📝 Enhanced prompt: {enhanced[:180]}...")
        return enhanced
        
    def generate(
        self,
        prompt: str,
        mode: str = "fast",  # "fast" (SD 1.5) or "quality" (SDXL)
        seed: int = None,
        negative_prompt: str = None
    ) -> Image.Image:
        """
        Generate image from text prompt
        
        Args:
            prompt: Text description of the 3D object
            mode: "fast" for SD 1.5, "quality" for SDXL
            seed: Random seed for reproducibility
            negative_prompt: What to avoid in generation
            
        Returns:
            PIL Image
        """
        # Enhance prompt for 3D conversion - wrap user prompt with 3D-optimized template
        enhanced_prompt = self._build_3d_prompt(prompt, mode)
        neg_prompt = negative_prompt or SDConfig.NEGATIVE_PROMPT
        
        # Check VRAM before generation
        check_vram_status()
        
        # Set seed for reproducibility
        generator = None
        if seed is not None:
            generator = torch.Generator(device=DEVICE).manual_seed(seed)
        
        if mode == "quality":
            # Use SDXL
            self._load_sdxl()
            
            # Unload SD15 to save VRAM
            if self.sd15_pipe is not None:
                del self.sd15_pipe
                self.sd15_pipe = None
                torch.cuda.empty_cache() if DEVICE == "cuda" else None
            
            print(f"🎨 Generating with SDXL ({SDConfig.SDXL_RESOLUTION}px, {SDConfig.SDXL_STEPS} steps)...")
            
            with torch.inference_mode():
                result = self.sdxl_pipe(
                    prompt=enhanced_prompt,
                    negative_prompt=neg_prompt,
                    num_inference_steps=SDConfig.SDXL_STEPS,
                    guidance_scale=SDConfig.GUIDANCE_SCALE,
                    height=SDConfig.SDXL_RESOLUTION,
                    width=SDConfig.SDXL_RESOLUTION,
                    generator=generator
                ).images[0]
                
        else:
            # Use SD 1.5 (fast mode)
            self._load_sd15()
            
            # Unload SDXL to save VRAM
            if self.sdxl_pipe is not None:
                del self.sdxl_pipe
                self.sdxl_pipe = None
                torch.cuda.empty_cache() if DEVICE == "cuda" else None
            
            print(f"🎨 Generating with SD 1.5 ({SDConfig.SD15_RESOLUTION}px, {SDConfig.SD15_STEPS} steps)...")
            
            with torch.inference_mode():
                result = self.sd15_pipe(
                    prompt=enhanced_prompt,
                    negative_prompt=neg_prompt,
                    num_inference_steps=SDConfig.SD15_STEPS,
                    guidance_scale=SDConfig.GUIDANCE_SCALE,
                    height=SDConfig.SD15_RESOLUTION,
                    width=SDConfig.SD15_RESOLUTION,
                    generator=generator
                ).images[0]
        
        print("  ✓ Image generated")
        return result


# Singleton instance
sd_generator = StableDiffusionGenerator()


def text_to_image(prompt: str, mode: str = "fast", seed: int = None) -> Image.Image:
    """
    Convenience function for text to image generation
    """
    return sd_generator.generate(prompt, mode, seed)


if __name__ == "__main__":
    # Test generation
    import sys
    
    prompt = sys.argv[1] if len(sys.argv) > 1 else "a cute robot toy, simple design"
    mode = sys.argv[2] if len(sys.argv) > 2 else "fast"
    
    print(f"Generating: '{prompt}' (mode: {mode})")
    img = text_to_image(prompt, mode)
    img.save("test_generated.png")
    print("Saved to test_generated.png")
