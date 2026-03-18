
import numpy as np
from PIL import Image, ImageEnhance
from config import ProcessingConfig as cfg

# Lazy load rembg
_rembg_session = None

def _get_rembg_session():
    """Lazy load rembg session (faster than re-initializing each time)"""
    global _rembg_session
    if _rembg_session is None:
        try:
            import rembg
            _rembg_session = rembg.new_session()
            print("  ✓ rembg session created")
        except Exception as e:
            print(f"  ⚠️ Could not create rembg session: {e}")
            _rembg_session = "failed"
    return _rembg_session


def remove_background(image: Image.Image) -> Image.Image:
    """
    Remove background from image using rembg (U2-Net).
    Returns RGBA image with transparent background.
    Uses TripoSR's same approach from tsr/utils.py.
    """
    session = _get_rembg_session()
    
    try:
        import rembg
        
        # Check if image already has transparency
        if image.mode == "RGBA":
            extrema = image.getextrema()
            if extrema[3][0] < 255:  # Already has transparency
                print("    (image already has alpha, skipping rembg)")
                return image
        
        # Use rembg with session for speed
        if session != "failed":
            result = rembg.remove(image, session=session)
        else:
            result = rembg.remove(image)
        
        return result.convert('RGBA')
        
    except Exception as e:
        print(f"  ⚠️ Background removal failed: {e}")
        return image.convert('RGBA')


def resize_foreground(image: Image.Image, ratio: float = 0.85) -> Image.Image:
    """
    Crop to foreground, pad to square, then pad by foreground ratio.
    This is the EXACT same logic as TripoSR's tsr/utils.py resize_foreground().
    
    The foreground_ratio controls how much of the final image the object fills.
    0.85 means the object takes up 85% of the image, with 15% padding.
    """
    img_array = np.array(image)
    assert img_array.shape[-1] == 4, "Image must be RGBA"
    
    # Find foreground pixels via alpha
    alpha = np.where(img_array[..., 3] > 0)
    
    if len(alpha[0]) == 0:
        # No foreground found, return as-is
        print("    ⚠️ No foreground found in image")
        return image
    
    y1, y2 = alpha[0].min(), alpha[0].max()
    x1, x2 = alpha[1].min(), alpha[1].max()
    
    # Crop the foreground (tight crop)
    fg = img_array[y1:y2, x1:x2]
    
    # Pad to square
    size = max(fg.shape[0], fg.shape[1])
    ph0, pw0 = (size - fg.shape[0]) // 2, (size - fg.shape[1]) // 2
    ph1, pw1 = size - fg.shape[0] - ph0, size - fg.shape[1] - pw0
    new_image = np.pad(
        fg,
        ((ph0, ph1), (pw0, pw1), (0, 0)),
        mode="constant",
        constant_values=((0, 0), (0, 0), (0, 0)),
    )
    
    # Compute padding according to the ratio
    new_size = int(new_image.shape[0] / ratio)
    ph0, pw0 = (new_size - size) // 2, (new_size - size) // 2
    ph1, pw1 = new_size - size - ph0, new_size - size - pw0
    new_image = np.pad(
        new_image,
        ((ph0, ph1), (pw0, pw1), (0, 0)),
        mode="constant",
        constant_values=((0, 0), (0, 0), (0, 0)),
    )
    
    return Image.fromarray(new_image)


def composite_on_gray(image: Image.Image) -> Image.Image:
    """
    Composite RGBA image onto GRAY (0.5) background.
    This is CRITICAL for TripoSR - it was trained on gray backgrounds.
    
    From TripoSR's run.py:
        image = image[:,:,:3] * image[:,:,3:4] + (1 - image[:,:,3:4]) * 0.5
    """
    img_array = np.array(image).astype(np.float32) / 255.0
    
    if img_array.shape[-1] == 4:
        # RGBA: composite foreground on gray background
        rgb = img_array[:, :, :3]
        alpha = img_array[:, :, 3:4]
        # foreground * alpha + gray * (1 - alpha)
        composited = rgb * alpha + (1.0 - alpha) * 0.5
    else:
        composited = img_array[:, :, :3]
    
    result = (composited * 255.0).astype(np.uint8)
    return Image.fromarray(result)


def enhance_for_3d(image: Image.Image) -> Image.Image:
    """
    Optional image enhancement (DISABLED by default — factors = 1.0).
    
    Official TripoSR pipeline does NO enhancement at all.
    Enhancement was found to HURT quality by amplifying SD artifacts.
    
    With default config (ENHANCE_CONTRAST=1.0, ENHANCE_SHARPNESS=1.0),
    this function is a no-op passthrough.
    """
    result = image
    
    # Contrast (only if configured, default 1.0 = no change)
    contrast_factor = cfg.ENHANCE_CONTRAST
    if contrast_factor != 1.0:
        enhancer = ImageEnhance.Contrast(result)
        result = enhancer.enhance(contrast_factor)
        print(f"    ✓ Contrast: {contrast_factor}")
    
    # Sharpness (only if configured, default 1.0 = no change)
    sharpness_factor = cfg.ENHANCE_SHARPNESS
    if sharpness_factor != 1.0:
        enhancer = ImageEnhance.Sharpness(result)
        result = enhancer.enhance(sharpness_factor)
        print(f"    ✓ Sharpness: {sharpness_factor}")
    
    return result


def select_best_view_for_triposr(views: dict) -> Image.Image:
    """
    From a dict of {view_name: PIL Image}, select the best single view
    for 3D reconstruction (works for both TripoSR and Hunyuan3D).
    
    Priority:
    1. three_quarter view (shows most 3D information — front + side + top)
    2. front view (standard, well-supported by training data)
    3. Any available view
    """
    priority = ['three_quarter', 'front', 'left', 'right', 'back', 'top']
    
    for view_name in priority:
        if view_name in views:
            print(f"  → Selected '{view_name}' view for 3D reconstruction")
            return views[view_name]
    
    # Fallback: return first available
    first_key = next(iter(views))
    print(f"  → Using '{first_key}' view (fallback)")
    return views[first_key]


def preprocess_for_hunyuan3d(
    image: Image.Image,
    remove_bg: bool = True,
) -> Image.Image:
    """
    Preprocessing pipeline for Hunyuan3D-2.
    
    Hunyuan3D-2 expects RGBA image with transparent background.
    Unlike TripoSR (which needs gray background), Hunyuan3D has its own
    built-in background removal and image preprocessing, so we just need
    to ensure the image is clean RGBA.
    
    Pipeline:
    1. Remove background → RGBA with transparent bg
    2. Resize foreground to fill ~85% of image area
    3. Return as RGBA (NOT composited on gray — Hunyuan3D handles this)
    """
    # Step 1: Remove background → RGBA
    if remove_bg:
        print("  → Removing background for Hunyuan3D...")
        rgba_image = remove_background(image)
    else:
        rgba_image = image.convert('RGBA') if image.mode != 'RGBA' else image
    
    # Step 2: Resize foreground (crop, pad to square, pad by ratio)
    print(f"  → Resizing foreground (ratio: {cfg.FOREGROUND_RATIO})...")
    rgba_image = resize_foreground(rgba_image, cfg.FOREGROUND_RATIO)
    
    print("  ✓ Hunyuan3D preprocessing complete (RGBA)")
    return rgba_image


def preprocess_image(
    image: Image.Image,
    remove_bg: bool = True,
    normalize: bool = True,
    target_size: int = None,
    foreground_ratio: float = 0.85,
    enhance: bool = True
) -> Image.Image:
    """
    Full preprocessing pipeline for TripoSR 3D conversion.
    Matches OFFICIAL TripoSR run.py pipeline.
    
    1. Remove background → RGBA with transparent bg
    2. Resize foreground → crop, pad to square, pad by ratio  
    3. Composite on GRAY (0.5) background → RGB
    4. (Optional) Enhancement — DISABLED by default (factors = 1.0)
    5. Resize to target size (512)
    
    IMPORTANT: Official TripoSR does steps 1-3 only, NO enhancement.
    Enhancement is disabled by default (config factors = 1.0).
    """
    if target_size is None:
        target_size = cfg.TARGET_SIZE
    
    # Step 1: Remove background → RGBA
    if remove_bg:
        print("  → Removing background...")
        rgba_image = remove_background(image)
    else:
        rgba_image = image.convert('RGBA') if image.mode != 'RGBA' else image
    
    # Step 2: Resize foreground (TripoSR's exact method)
    print(f"  → Resizing foreground (ratio: {foreground_ratio})...")
    rgba_image = resize_foreground(rgba_image, foreground_ratio)
    
    # Step 3: Composite on GRAY (0.5) background (CRITICAL for TripoSR)
    print("  → Compositing on gray background (TripoSR standard)...")
    result = composite_on_gray(rgba_image)
    
    # Step 4: Enhancement (DISABLED by default — official TripoSR does NONE)
    if enhance:
        result = enhance_for_3d(result)
    
    # Step 5: Resize to target size
    print(f"  → Resizing to {target_size}px...")
    result = result.resize((target_size, target_size), Image.Resampling.LANCZOS)
    
    print("  ✓ Preprocessing complete")
    return result


if __name__ == "__main__":
    # Test preprocessing
    import sys
    if len(sys.argv) > 1:
        img_path = sys.argv[1]
        img = Image.open(img_path)
        result = preprocess_image(img)
        result.save("preprocessed_test.png")
        print("Saved to preprocessed_test.png")
