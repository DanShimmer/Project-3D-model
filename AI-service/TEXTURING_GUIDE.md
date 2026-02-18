# AI Texturing & Advanced Features Guide

## Overview

This guide explains the new AI-powered features for 3D model texturing, painting, and rigging.

## Features

### 1. AI Auto-Texturing

Automatically generate textures for your 3D models using AI (Stable Diffusion + ControlNet).

**How it works:**
1. Generate or upload a 3D model (white/clay model)
2. Click the **Texture** button in the sidebar
3. Select a texture style:
   - **Realistic**: Photorealistic textures
   - **Stylized**: Game-ready artistic textures
   - **PBR**: Physically-based rendering textures
   - **Hand-painted**: Painterly, WoW-style textures
4. Click **Apply Texture** to run AI texturing

**Note:** This requires GPU with at least 8GB VRAM for best results.

### 2. Manual Painting

Paint directly on your 3D model with a color palette.

**How to use:**
1. Open the Texturing panel
2. Click on any color in the color palette
3. The cursor will change to a brush (crosshair)
4. Hold **left mouse button** and drag on the model to paint
5. Adjust **Brush Size** slider for bigger/smaller strokes
6. Click **Exit** to stop painting mode
7. Click the **Reset** button to clear all paint

### 3. Rigging (Humanoid & Quadruped)

Add a skeleton to your model for animation.

**Supported model types:**
- **Humanoid**: Robots, humans, characters with 2 arms and 2 legs
- **Quadruped**: Animals with 4 legs (dogs, cats, etc.)

**How it works:**
1. Generate or upload a riggable model
2. Click the **Rig** button in the sidebar
3. The system will auto-detect if your model is humanoid or quadruped
4. Select the character type
5. Adjust marker positions on the model
6. Click **Confirm** to apply rigging

### 4. Animation (After Rigging)

Apply pre-built animations to rigged models.

**Available animations:**
- Idle
- Walk
- Run
- Jump
- Wave
- And more...

## Installation (GPU Mode)

To enable full AI texturing with GPU:

1. Navigate to the AI-service folder:
   ```
   cd AI-service
   ```

2. Run the installation script:
   ```
   install_texturing.bat
   ```

3. This will install:
   - Stable Diffusion models
   - ControlNet models
   - Required Python packages

4. Restart the AI service

## Requirements

### Minimum:
- NVIDIA GPU with 8GB VRAM
- CUDA 11.8+
- Python 3.11
- 20GB disk space (for models)

### Recommended:
- NVIDIA RTX 3080+ with 12GB+ VRAM
- CUDA 12.0+
- 32GB RAM

## API Endpoints

### Apply Texture
```
POST /api/phase2/texture
{
  "modelPath": "/outputs/model.glb",
  "style": "realistic",
  "prompt": "optional custom prompt"
}
```

### Apply Rig
```
POST /api/phase2/rig
{
  "modelPath": "/outputs/model.glb",
  "characterType": "humanoid",
  "markers": []
}
```

### Generate PBR Maps
```
POST /api/phase2/pbr
{
  "modelPath": "/outputs/model.glb"
}
```

## Troubleshooting

### "Failed to load AI models"
- Ensure you have sufficient VRAM (8GB+)
- Check CUDA installation: `nvidia-smi`
- Try reducing batch size in config

### Texture looks wrong
- Try a different style
- Ensure the model has proper UV coordinates
- The AI works best with centered, clean models

### Painting not working
- Make sure you're in Paint Mode (indicator shows in panel)
- Hold left mouse button and drag
- Check brush size (larger = easier to paint)

### Rig markers not visible
- Switch to Step 2 (Place Markers)
- Markers appear as colored circles
- Drag to adjust positions

## Configuration

Edit `AI-service/phase2_service.py` to adjust settings:

```python
class Phase2Config:
    ENABLE_GPU_FEATURES = True  # Enable/disable GPU
    ENABLE_TEXTURING = True     # Enable texturing
    ENABLE_RIGGING = True       # Enable rigging
    ENABLE_ANIMATION = True     # Enable animation
```

## Credits

- Stable Diffusion by Stability AI
- ControlNet by lllyasviel
- TripoSR for 3D generation
- Three.js for WebGL rendering
