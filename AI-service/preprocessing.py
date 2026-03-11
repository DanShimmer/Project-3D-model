"""
Image Preprocessing Module
Optimized for TripoSR 3D conversion pipeline.

CRITICAL: TripoSR was trained on images with GRAY (0.5/127) background,
NOT white. Using the wrong background color causes "frame" artifacts
where TripoSR reconstructs the background as geometry.

This module replicates TripoSR's own preprocessing from tsr/utils.py:
1. rembg background removal → RGBA
2. resize_foreground → crop, pad to square, pad by foreground_ratio
3. Composite on GRAY (0.5) background → RGB
"""
import numpy as np
from PIL import Image
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
    Enhance the preprocessed image to give TripoSR stronger 3D depth cues.
    
    TripoSR reconstructs geometry from 2D depth/shading cues.
    Stronger contrast between light and dark areas = clearer depth signal.
    Sharper edges = cleaner mesh boundaries.
    
    This step runs AFTER composite_on_gray, on the final preprocessed image.
    """
    from PIL import ImageEnhance, ImageFilter
    
    print("  → Enhancing image for better 3D reconstruction...")
    
    # Step 1: Moderate contrast boost — clearer light/shadow for depth inference
    enhancer = ImageEnhance.Contrast(image)
    image = enhancer.enhance(1.2)  # 20% contrast boost — enough for depth cues without adding noise
    
    # Step 2: Moderate sharpen — crisper edges without creating noise artifacts
    enhancer = ImageEnhance.Sharpness(image)
    image = enhancer.enhance(1.3)  # 30% sharpness — clean edges without ringing artifacts
    
    # Step 3: Slight saturation boost
    enhancer = ImageEnhance.Color(image)
    image = enhancer.enhance(1.1)  # 10% saturation — subtle surface differentiation
    
    print("    ✓ Contrast +20%, Sharpness +30%, Saturation +10%")
    return image


def preprocess_image(
    image: Image.Image,
    remove_bg: bool = True,
    normalize: bool = True,
    target_size: int = None,
    foreground_ratio: float = 0.85
) -> Image.Image:
    """
    Full preprocessing pipeline optimized for TripoSR 3D conversion.
    Replicates TripoSR's own preprocessing from run.py:
    
    1. Remove background → RGBA with transparent bg
    2. Resize foreground → crop, pad to square, pad by ratio  
    3. Composite on GRAY (0.5) background → RGB
    4. Resize to target size
    
    CRITICAL: Step 3 uses GRAY background, NOT white.
    TripoSR was trained on gray backgrounds. White backgrounds cause
    the model to reconstruct the background as geometry ("frame" artifact).
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
    
    # Step 3.5: Enhance for 3D reconstruction (sharpen + contrast)
    result = enhance_for_3d(result)
    
    # Step 4: Resize to target size
    print(f"  → Resizing to {target_size}px...")
    result = result.resize((target_size, target_size), Image.Resampling.LANCZOS)
    
    print("  ✓ Preprocessing complete (gray background for TripoSR)")
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
