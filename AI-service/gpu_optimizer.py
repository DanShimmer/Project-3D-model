"""
GPU Optimization Configuration for RTX 3060 12GB
Optimized settings for best performance with 12GB VRAM

This file contains optimized configurations for:
- Stable Diffusion 1.5 and SDXL
- TripoSR 3D generation
- AI Texturing with ControlNet
- Memory management
"""
import torch
import os

# ============================================
# GPU DETECTION AND OPTIMIZATION
# ============================================

class GPUOptimizer:
    """
    Automatic GPU optimization based on available hardware
    Optimized for NVIDIA RTX 3060 12GB
    """
    
    # RTX 3060 12GB specs
    TARGET_VRAM_GB = 12
    TARGET_COMPUTE_CAPABILITY = (8, 6)  # Ampere architecture
    
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.gpu_info = self._detect_gpu()
        self.optimizations = self._calculate_optimizations()
        
    def _detect_gpu(self):
        """Detect GPU specifications"""
        if not torch.cuda.is_available():
            return {
                "available": False,
                "name": "CPU",
                "vram_gb": 0,
                "compute_capability": None
            }
        
        props = torch.cuda.get_device_properties(0)
        return {
            "available": True,
            "name": props.name,
            "vram_gb": props.total_memory / (1024 ** 3),
            "vram_free_gb": (props.total_memory - torch.cuda.memory_allocated()) / (1024 ** 3),
            "compute_capability": (props.major, props.minor),
            "multi_processor_count": props.multi_processor_count,
            "is_rtx_3060_12gb": "3060" in props.name and props.total_memory > 10 * (1024 ** 3)
        }
    
    def _calculate_optimizations(self):
        """Calculate optimal settings based on GPU"""
        if not self.gpu_info["available"]:
            return self._cpu_settings()
        
        vram = self.gpu_info["vram_gb"]
        
        if vram >= 12:  # RTX 3060 12GB, RTX 3080, RTX 4090, etc.
            return self._high_vram_settings()
        elif vram >= 8:  # RTX 3070, RTX 4060, etc.
            return self._medium_vram_settings()
        else:  # < 8GB
            return self._low_vram_settings()
    
    def _high_vram_settings(self):
        """Settings for 12GB+ VRAM (RTX 3060 12GB)"""
        return {
            # Stable Diffusion settings
            "sd": {
                "dtype": torch.float16,
                "enable_attention_slicing": False,  # Not needed with 12GB
                "enable_vae_slicing": False,
                "enable_vae_tiling": False,
                "enable_xformers": True,
                "enable_torch_compile": True,
                "batch_size": 1,
                "max_concurrent_models": 1,  # Can keep SD and TripoSR loaded
            },
            # SD 1.5 specific
            "sd15": {
                "resolution": 512,
                "steps": 30,
                "guidance_scale": 7.5,
            },
            # SDXL specific
            "sdxl": {
                "resolution": 1024,
                "steps": 40,
                "guidance_scale": 7.5,
                "enable_model_cpu_offload": False,  # Not needed
            },
            # TripoSR settings
            "triposr": {
                "chunk_size": 8192,  # Can use larger chunks
                "mc_resolution": 256,
                "batch_size": 1,
            },
            # Texturing settings
            "texturing": {
                "controlnet_conditioning_scale": 0.8,
                "num_views": 4,  # Can render 4 views
                "texture_resolution": 1024,
            },
            # Memory settings
            "memory": {
                "gradient_checkpointing": False,
                "clear_cache_between_steps": False,
                "offload_to_cpu": False,
            }
        }
    
    def _medium_vram_settings(self):
        """Settings for 8-11GB VRAM"""
        return {
            "sd": {
                "dtype": torch.float16,
                "enable_attention_slicing": True,
                "enable_vae_slicing": True,
                "enable_vae_tiling": False,
                "enable_xformers": True,
                "enable_torch_compile": False,
                "batch_size": 1,
                "max_concurrent_models": 1,
            },
            "sd15": {
                "resolution": 512,
                "steps": 25,
                "guidance_scale": 7.5,
            },
            "sdxl": {
                "resolution": 1024,
                "steps": 30,
                "guidance_scale": 7.0,
                "enable_model_cpu_offload": True,
            },
            "triposr": {
                "chunk_size": 4096,
                "mc_resolution": 192,
                "batch_size": 1,
            },
            "texturing": {
                "controlnet_conditioning_scale": 0.7,
                "num_views": 2,
                "texture_resolution": 768,
            },
            "memory": {
                "gradient_checkpointing": True,
                "clear_cache_between_steps": True,
                "offload_to_cpu": True,
            }
        }
    
    def _low_vram_settings(self):
        """Settings for < 8GB VRAM"""
        return {
            "sd": {
                "dtype": torch.float16,
                "enable_attention_slicing": True,
                "enable_vae_slicing": True,
                "enable_vae_tiling": True,
                "enable_xformers": True,
                "enable_torch_compile": False,
                "batch_size": 1,
                "max_concurrent_models": 1,
            },
            "sd15": {
                "resolution": 512,
                "steps": 20,
                "guidance_scale": 7.0,
            },
            "sdxl": {
                "resolution": 768,  # Reduced resolution
                "steps": 25,
                "guidance_scale": 7.0,
                "enable_model_cpu_offload": True,
            },
            "triposr": {
                "chunk_size": 2048,
                "mc_resolution": 128,
                "batch_size": 1,
            },
            "texturing": {
                "controlnet_conditioning_scale": 0.6,
                "num_views": 1,
                "texture_resolution": 512,
            },
            "memory": {
                "gradient_checkpointing": True,
                "clear_cache_between_steps": True,
                "offload_to_cpu": True,
            }
        }
    
    def _cpu_settings(self):
        """Settings for CPU-only mode"""
        return {
            "sd": {
                "dtype": torch.float32,
                "enable_attention_slicing": True,
                "enable_vae_slicing": True,
                "enable_vae_tiling": True,
                "enable_xformers": False,
                "enable_torch_compile": False,
                "batch_size": 1,
                "max_concurrent_models": 1,
            },
            "sd15": {
                "resolution": 512,
                "steps": 15,
                "guidance_scale": 7.0,
            },
            "sdxl": {
                "resolution": 512,
                "steps": 15,
                "guidance_scale": 7.0,
                "enable_model_cpu_offload": True,
            },
            "triposr": {
                "chunk_size": 1024,
                "mc_resolution": 96,
                "batch_size": 1,
            },
            "texturing": {
                "controlnet_conditioning_scale": 0.5,
                "num_views": 1,
                "texture_resolution": 512,
            },
            "memory": {
                "gradient_checkpointing": True,
                "clear_cache_between_steps": True,
                "offload_to_cpu": True,
            }
        }
    
    def apply_sd_optimizations(self, pipe):
        """Apply optimizations to Stable Diffusion pipeline"""
        opts = self.optimizations["sd"]
        
        if opts["enable_attention_slicing"]:
            pipe.enable_attention_slicing()
        
        if opts["enable_vae_slicing"]:
            pipe.enable_vae_slicing()
        
        if opts["enable_vae_tiling"]:
            pipe.enable_vae_tiling()
        
        if opts["enable_xformers"]:
            try:
                pipe.enable_xformers_memory_efficient_attention()
                print("  ✓ xformers enabled")
            except Exception as e:
                print(f"  ⚠️ xformers not available: {e}")
        
        return pipe
    
    def clear_memory(self):
        """Clear GPU memory"""
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            torch.cuda.synchronize()
    
    def get_memory_info(self):
        """Get current memory usage"""
        if not torch.cuda.is_available():
            return {"available": False}
        
        allocated = torch.cuda.memory_allocated() / (1024 ** 3)
        reserved = torch.cuda.memory_reserved() / (1024 ** 3)
        total = torch.cuda.get_device_properties(0).total_memory / (1024 ** 3)
        
        return {
            "available": True,
            "allocated_gb": round(allocated, 2),
            "reserved_gb": round(reserved, 2),
            "total_gb": round(total, 2),
            "free_gb": round(total - allocated, 2)
        }
    
    def print_status(self):
        """Print GPU status and optimizations"""
        print("\n" + "=" * 60)
        print("🖥️  GPU OPTIMIZATION STATUS")
        print("=" * 60)
        
        if self.gpu_info["available"]:
            print(f"GPU: {self.gpu_info['name']}")
            print(f"VRAM: {self.gpu_info['vram_gb']:.1f} GB")
            print(f"Compute Capability: {self.gpu_info['compute_capability']}")
            print(f"Is RTX 3060 12GB: {self.gpu_info.get('is_rtx_3060_12gb', False)}")
        else:
            print("GPU: Not available (using CPU)")
        
        print("\nOptimizations Applied:")
        print(f"  - SD dtype: {self.optimizations['sd']['dtype']}")
        print(f"  - Attention slicing: {self.optimizations['sd']['enable_attention_slicing']}")
        print(f"  - VAE slicing: {self.optimizations['sd']['enable_vae_slicing']}")
        print(f"  - xformers: {self.optimizations['sd']['enable_xformers']}")
        print(f"  - SDXL resolution: {self.optimizations['sdxl']['resolution']}")
        print(f"  - TripoSR chunk size: {self.optimizations['triposr']['chunk_size']}")
        
        mem = self.get_memory_info()
        if mem["available"]:
            print(f"\nMemory: {mem['allocated_gb']:.1f}/{mem['total_gb']:.1f} GB used")
        
        print("=" * 60 + "\n")


# Global optimizer instance
gpu_optimizer = GPUOptimizer()

# Auto-print status on import
if __name__ != "__main__":
    gpu_optimizer.print_status()
