"""
Stable Diffusion Text-to-Image Generator
Supports SD 1.5 (fast) and SDXL (quality)

Optimized for RTX 3060 12GB

PIPELINE: text → SD 3D render image → preprocess → Hunyuan3D → mesh
The SD step generates COLORFUL 3D RENDER images (like game assets).
Texturing can be enhanced separately in Phase 2.
"""
import torch
import gc
from PIL import Image
from diffusers import (
    StableDiffusionPipeline, 
    StableDiffusionXLPipeline,
    DPMSolverMultistepScheduler,
)
from config import SDConfig, ProcessingConfig, DEVICE, CACHE_DIR

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
        
        # Use DPM++ 2M Karras scheduler — fast convergence, high quality
        self.sd15_pipe.scheduler = DPMSolverMultistepScheduler.from_config(
            self.sd15_pipe.scheduler.config,
            use_karras_sigmas=True
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
        
        # Use DPM++ 2M Karras for SDXL — better quality than Euler Ancestral
        self.sdxl_pipe.scheduler = DPMSolverMultistepScheduler.from_config(
            self.sdxl_pipe.scheduler.config,
            use_karras_sigmas=True
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
            "full body character, T-pose, arms slightly away from body, "
            "thick solid limbs, symmetrical body, "
            "clean simple design, solid colors, smooth surface"
        ),
        'creature': (
            "full body creature, neutral standing pose, "
            "thick solid body, chunky proportions, "
            "clean simple design, solid colors, smooth surface"
        ),
        'vehicle': (
            "complete vehicle, all panels connected, "
            "thick solid panels, simple shapes, "
            "clean simple design, solid colors, smooth surface"
        ),
        'building': (
            "complete building, thick solid walls, "
            "simple block shapes, clean design, "
            "solid colors, smooth surface"
        ),
        'weapon': (
            "complete weapon centered in frame, "
            "thick solid blade, chunky proportions, "
            "clean simple design, solid colors, smooth surface"
        ),
        'prop': (
            "complete solid object, simple shapes, "
            "thick proportions, clean design, "
            "solid colors, smooth surface"
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

    def _safe_encode_sd15(self, prompt: str, negative_prompt: str):
        """
        Manually encode prompts for SD 1.5 using CLIP tokenizer with
        explicit truncation=True and max_length=77.
        
        Returns (prompt_embeds, negative_prompt_embeds) tensors.
        
        This BYPASSES the pipeline's internal tokenizer path, preventing
        IndexError when prompts exceed 77 tokens. CLIP's tokenizer keeps
        the first 75 meaningful tokens (+ BOS + EOS = 77), so putting the
        subject and key modifiers FIRST in the prompt preserves quality.
        """
        pipe = self.sd15_pipe
        device = pipe.device
        max_len = pipe.tokenizer.model_max_length  # Should be 77
        
        # Tokenize + encode POSITIVE prompt
        text_inputs = pipe.tokenizer(
            prompt,
            padding="max_length",
            max_length=max_len,
            truncation=True,
            return_tensors="pt"
        )
        token_count = (text_inputs.input_ids != pipe.tokenizer.pad_token_id).sum().item()
        if token_count >= max_len:
            print(f"  ⚠️ Positive prompt uses all {max_len} tokens (some text truncated, subject preserved)")
        else:
            print(f"  📊 Positive prompt: {token_count}/{max_len} tokens")
        
        prompt_embeds = pipe.text_encoder(
            text_inputs.input_ids.to(device)
        )[0]
        
        # Tokenize + encode NEGATIVE prompt
        uncond_inputs = pipe.tokenizer(
            negative_prompt,
            padding="max_length",
            max_length=max_len,
            truncation=True,
            return_tensors="pt"
        )
        negative_prompt_embeds = pipe.text_encoder(
            uncond_inputs.input_ids.to(device)
        )[0]
        
        return prompt_embeds, negative_prompt_embeds
    
    def _ensure_sdxl_tokenizer_limits(self):
        """
        Ensure SDXL's dual tokenizers have correct max_length set.
        This prevents IndexError when prompts exceed CLIP's 77-token limit.
        The pipeline's internal encode_prompt() uses these values for truncation.
        """
        pipe = self.sdxl_pipe
        if pipe.tokenizer.model_max_length != 77:
            pipe.tokenizer.model_max_length = 77
        if hasattr(pipe, 'tokenizer_2') and pipe.tokenizer_2 is not None:
            if pipe.tokenizer_2.model_max_length != 77:
                pipe.tokenizer_2.model_max_length = 77

    def _detect_pose(self, prompt: str) -> str:
        """
        Detect if the user explicitly requested a specific pose.
        Returns a strong pose instruction to prepend to the prompt, or empty string.
        
        CLIP processes tokens LEFT-TO-RIGHT — first tokens have highest weight.
        So we put pose instructions FIRST when the user explicitly requests a pose.
        """
        prompt_lower = prompt.lower()
        
        if 't-pose' in prompt_lower or 't pose' in prompt_lower or 'tpose' in prompt_lower:
            return "T-pose, standing straight with arms extended horizontally to the sides, "
        elif 'a-pose' in prompt_lower or 'a pose' in prompt_lower or 'apose' in prompt_lower:
            return "A-pose, standing straight with arms angled 45 degrees downward from shoulders, "
        elif 'idle' in prompt_lower and ('pose' in prompt_lower or 'stand' in prompt_lower):
            return "idle standing pose, relaxed posture, "
        
        return ""

    def _build_3d_prompt(self, user_prompt: str, mode: str = "fast", view: str = None) -> str:
        """
        Build a 3D RENDER prompt optimized for Hunyuan3D reconstruction.
        
        Structure: {pose_override}, {subject}, {category_style}, {base_3d_prompt}, {view_angle}
        """
        user_prompt = user_prompt.strip().rstrip('.')
        category = self._classify_object(user_prompt)
        cat_quality = self._CATEGORY_QUALITY.get(category, self._CATEGORY_QUALITY['prop'])
        
        # Detect explicit pose request
        pose_prefix = self._detect_pose(user_prompt)
        
        # If user requested a specific pose, adjust the category quality string
        if pose_prefix:
            print(f"  🕺 Pose detected: {pose_prefix.strip().rstrip(',')}")
            # Replace the default T-pose instruction in character category
            if 'T-pose' in cat_quality and 'a-pose' in pose_prefix.lower():
                cat_quality = cat_quality.replace(
                    "T-pose, arms slightly away from body",
                    "A-pose, arms angled 45 degrees down from shoulders"
                )
            elif 'T-pose' not in pose_prefix and 'T-pose' in cat_quality:
                # Remove default T-pose if user wants something else
                cat_quality = cat_quality.replace("T-pose, arms slightly away from body, ", "")
        
        print(f"  🏷️ Object category: {category}")
        
        # View angle modifier
        view_modifier = ""
        if view and view in SDConfig.VIEW_PROMPTS:
            view_modifier = f", {SDConfig.VIEW_PROMPTS[view]}"
        
        # 3D render prompt: {pose}, {subject}, {category style}, {base 3D}, {view}
        # Pose goes FIRST because CLIP gives highest weight to early tokens
        enhanced = (
            f"{pose_prefix}"
            f"{user_prompt}, "
            f"{cat_quality}, "
            f"{SDConfig.BASE_3D_PROMPT}"
            f"{view_modifier}"
        )
        
        print(f"  📝 Enhanced prompt: {enhanced[:200]}...")
        return enhanced

    def generate_multiview(
        self,
        prompt: str,
        mode: str = "fast",
        seed: int = None,
        views: list = None
    ) -> dict:
        """
        Generate multiple views of the same object for better 3D reconstruction.
        
        Uses the SAME seed across all views to maintain consistency.
        Each view adds a camera angle modifier to the prompt.
        
        Returns: dict mapping view_name -> PIL Image
        """
        if views is None:
            views = list(SDConfig.VIEW_PROMPTS.keys())
        
        if seed is None:
            import random
            seed = random.randint(0, 2**31 - 1)
        
        print(f"\n📷 Generating {len(views)} views (seed: {seed})")
        
        results = {}
        neg_prompt = SDConfig.NEGATIVE_PROMPT
        
        for view_name in views:
            print(f"\n  📸 View: {view_name}")
            enhanced_prompt = self._build_3d_prompt(prompt, mode, view=view_name)
            
            # Use same seed for consistency across views
            generator = torch.Generator(device=DEVICE).manual_seed(seed)
            
            if mode == "quality":
                self._load_sdxl()
                if self.sd15_pipe is not None:
                    del self.sd15_pipe
                    self.sd15_pipe = None
                    torch.cuda.empty_cache() if DEVICE == "cuda" else None
                
                self._ensure_sdxl_tokenizer_limits()
                
                with torch.inference_mode():
                    img = self.sdxl_pipe(
                        prompt=enhanced_prompt,
                        negative_prompt=neg_prompt,
                        num_inference_steps=SDConfig.SDXL_STEPS,
                        guidance_scale=SDConfig.SDXL_GUIDANCE,
                        height=SDConfig.SDXL_RESOLUTION,
                        width=SDConfig.SDXL_RESOLUTION,
                        generator=generator
                    ).images[0]
                
                # Downscale SDXL 1024→512 for preprocessing compatibility
                target_size = ProcessingConfig.TARGET_SIZE  # 512
                if img.size[0] > target_size or img.size[1] > target_size:
                    img = img.resize((target_size, target_size), Image.Resampling.LANCZOS)
            else:
                self._load_sd15()
                if self.sdxl_pipe is not None:
                    del self.sdxl_pipe
                    self.sdxl_pipe = None
                    torch.cuda.empty_cache() if DEVICE == "cuda" else None
                
                prompt_embeds, negative_prompt_embeds = self._safe_encode_sd15(
                    enhanced_prompt, neg_prompt
                )
                
                with torch.inference_mode():
                    img = self.sd15_pipe(
                        prompt_embeds=prompt_embeds,
                        negative_prompt_embeds=negative_prompt_embeds,
                        num_inference_steps=SDConfig.SD15_STEPS,
                        guidance_scale=SDConfig.SD15_GUIDANCE,
                        height=SDConfig.SD15_RESOLUTION,
                        width=SDConfig.SD15_RESOLUTION,
                        generator=generator
                    ).images[0]
            
            results[view_name] = img
            print(f"    ✓ {view_name} generated")
        
        print(f"  ✓ All {len(results)} views generated")
        return results
        
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
            
            # Ensure SDXL tokenizers truncate properly (prevents IndexError)
            self._ensure_sdxl_tokenizer_limits()
            
            print(f"🎨 Generating with SDXL ({SDConfig.SDXL_RESOLUTION}px, {SDConfig.SDXL_STEPS} steps, cfg={SDConfig.SDXL_GUIDANCE})...")
            
            with torch.inference_mode():
                result = self.sdxl_pipe(
                    prompt=enhanced_prompt,
                    negative_prompt=neg_prompt,
                    num_inference_steps=SDConfig.SDXL_STEPS,
                    guidance_scale=SDConfig.SDXL_GUIDANCE,
                    height=SDConfig.SDXL_RESOLUTION,
                    width=SDConfig.SDXL_RESOLUTION,
                    generator=generator
                ).images[0]
            
            # SDXL generates at 1024px, downscale to 512 for preprocessing.
            target_size = ProcessingConfig.TARGET_SIZE  # 512
            if result.size[0] > target_size or result.size[1] > target_size:
                print(f"  📐 Resizing SDXL output {result.size[0]}→{target_size}px")
                result = result.resize((target_size, target_size), Image.Resampling.LANCZOS)
                
        else:
            # Use SD 1.5 (fast mode)
            self._load_sd15()
            
            # Unload SDXL to save VRAM
            if self.sdxl_pipe is not None:
                del self.sdxl_pipe
                self.sdxl_pipe = None
                torch.cuda.empty_cache() if DEVICE == "cuda" else None
            
            print(f"🎨 Generating with SD 1.5 ({SDConfig.SD15_RESOLUTION}px, {SDConfig.SD15_STEPS} steps, cfg={SDConfig.SD15_GUIDANCE})...")
            
            # Manually encode prompts (bypasses buggy tokenizer path)
            prompt_embeds, negative_prompt_embeds = self._safe_encode_sd15(
                enhanced_prompt, neg_prompt
            )
            
            with torch.inference_mode():
                result = self.sd15_pipe(
                    prompt_embeds=prompt_embeds,
                    negative_prompt_embeds=negative_prompt_embeds,
                    num_inference_steps=SDConfig.SD15_STEPS,
                    guidance_scale=SDConfig.SD15_GUIDANCE,
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
    Convenience function for text to image generation (single view)
    """
    return sd_generator.generate(prompt, mode, seed)


def text_to_multiview(prompt: str, mode: str = "fast", seed: int = None, views: list = None) -> dict:
    """
    Convenience function for multi-view generation.
    Returns dict: {view_name: PIL Image}
    """
    return sd_generator.generate_multiview(prompt, mode, seed, views)


if __name__ == "__main__":
    # Test generation
    import sys
    
    prompt = sys.argv[1] if len(sys.argv) > 1 else "a cute robot toy, simple design"
    mode = sys.argv[2] if len(sys.argv) > 2 else "fast"
    
    print(f"Generating: '{prompt}' (mode: {mode})")
    img = text_to_image(prompt, mode)
    img.save("test_generated.png")
    print("Saved to test_generated.png")
