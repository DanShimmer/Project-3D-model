"""
Stable Diffusion Text-to-Image Generator
Supports SD 1.5 (fast) and SDXL (quality)
"""
import torch
from PIL import Image
from diffusers import (
    StableDiffusionPipeline, 
    StableDiffusionXLPipeline,
    DPMSolverMultistepScheduler,
    EulerAncestralDiscreteScheduler
)
from config import SDConfig, DEVICE, CACHE_DIR


class StableDiffusionGenerator:
    def __init__(self):
        self.sd15_pipe = None
        self.sdxl_pipe = None
        self.current_model = None
        
    def _load_sd15(self):
        """Load SD 1.5 model"""
        if self.sd15_pipe is not None:
            return
        
        print("📦 Loading Stable Diffusion 1.5...")
        self.sd15_pipe = StableDiffusionPipeline.from_pretrained(
            SDConfig.SD15_MODEL,
            torch_dtype=torch.float16 if DEVICE == "cuda" else torch.float32,
            cache_dir=str(CACHE_DIR),
            safety_checker=None,
            requires_safety_checker=False
        )
        
        # Use DPM++ 2M scheduler for faster generation
        self.sd15_pipe.scheduler = DPMSolverMultistepScheduler.from_config(
            self.sd15_pipe.scheduler.config
        )
        
        self.sd15_pipe = self.sd15_pipe.to(DEVICE)
        
        # Enable memory optimizations
        if DEVICE == "cuda":
            self.sd15_pipe.enable_attention_slicing()
            try:
                self.sd15_pipe.enable_xformers_memory_efficient_attention()
                print("  ✓ xformers enabled")
            except:
                pass
        
        print("  ✓ SD 1.5 loaded")
        
    def _load_sdxl(self):
        """Load SDXL model"""
        if self.sdxl_pipe is not None:
            return
        
        print("📦 Loading Stable Diffusion XL...")
        self.sdxl_pipe = StableDiffusionXLPipeline.from_pretrained(
            SDConfig.SDXL_MODEL,
            torch_dtype=torch.float16 if DEVICE == "cuda" else torch.float32,
            cache_dir=str(CACHE_DIR),
            variant="fp16" if DEVICE == "cuda" else None,
            use_safetensors=True
        )
        
        # Use Euler Ancestral for SDXL
        self.sdxl_pipe.scheduler = EulerAncestralDiscreteScheduler.from_config(
            self.sdxl_pipe.scheduler.config
        )
        
        self.sdxl_pipe = self.sdxl_pipe.to(DEVICE)
        
        # Enable memory optimizations
        if DEVICE == "cuda":
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
        # Enhance prompt for 3D conversion
        enhanced_prompt = prompt + SDConfig.PROMPT_SUFFIX
        neg_prompt = negative_prompt or SDConfig.NEGATIVE_PROMPT
        
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
