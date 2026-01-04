"""
Image Preprocessing Module
- Background removal
- Resize and normalize
- Center object
"""
import io
import numpy as np
from PIL import Image
from rembg import remove
import cv2
from config import ProcessingConfig as cfg


def remove_background(image: Image.Image) -> Image.Image:
    """
    Remove background from image using rembg (U2-Net)
    Returns RGBA image with transparent background
    """
    # Convert to bytes for rembg
    img_bytes = io.BytesIO()
    image.save(img_bytes, format='PNG')
    img_bytes.seek(0)
    
    # Remove background
    output_bytes = remove(img_bytes.read())
    result = Image.open(io.BytesIO(output_bytes)).convert('RGBA')
    
    return result


def add_white_background(image: Image.Image) -> Image.Image:
    """
    Add white background to RGBA image
    """
    if image.mode != 'RGBA':
        return image.convert('RGB')
    
    # Create white background
    background = Image.new('RGB', image.size, cfg.BACKGROUND_COLOR)
    
    # Composite
    background.paste(image, mask=image.split()[3])  # Use alpha channel as mask
    
    return background


def center_and_crop(image: Image.Image, padding: float = 0.1) -> Image.Image:
    """
    Center the object in the image and crop with padding
    """
    # Convert to numpy for processing
    img_array = np.array(image)
    
    if len(img_array.shape) == 3 and img_array.shape[2] == 4:
        # Use alpha channel to find object bounds
        alpha = img_array[:, :, 3]
        mask = alpha > 10
    else:
        # Convert to grayscale and threshold
        gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        # Assume white background
        mask = gray < 250
    
    # Find bounding box
    rows = np.any(mask, axis=1)
    cols = np.any(mask, axis=0)
    
    if not np.any(rows) or not np.any(cols):
        return image
    
    rmin, rmax = np.where(rows)[0][[0, -1]]
    cmin, cmax = np.where(cols)[0][[0, -1]]
    
    # Add padding
    h, w = img_array.shape[:2]
    pad_h = int((rmax - rmin) * padding)
    pad_w = int((cmax - cmin) * padding)
    
    rmin = max(0, rmin - pad_h)
    rmax = min(h, rmax + pad_h)
    cmin = max(0, cmin - pad_w)
    cmax = min(w, cmax + pad_w)
    
    # Crop
    cropped = img_array[rmin:rmax, cmin:cmax]
    
    # Make square by padding
    crop_h, crop_w = cropped.shape[:2]
    max_dim = max(crop_h, crop_w)
    
    if len(cropped.shape) == 3 and cropped.shape[2] == 4:
        # RGBA - transparent padding
        square = np.zeros((max_dim, max_dim, 4), dtype=np.uint8)
    else:
        # RGB - white padding
        square = np.ones((max_dim, max_dim, 3), dtype=np.uint8) * 255
    
    # Center paste
    y_offset = (max_dim - crop_h) // 2
    x_offset = (max_dim - crop_w) // 2
    square[y_offset:y_offset+crop_h, x_offset:x_offset+crop_w] = cropped
    
    return Image.fromarray(square)


def resize_image(image: Image.Image, target_size: int = None) -> Image.Image:
    """
    Resize image to target size while maintaining aspect ratio
    """
    if target_size is None:
        target_size = cfg.TARGET_SIZE
    
    return image.resize((target_size, target_size), Image.Resampling.LANCZOS)


def normalize_lighting(image: Image.Image) -> Image.Image:
    """
    Normalize image lighting using histogram equalization
    """
    img_array = np.array(image)
    
    # Convert to LAB color space
    if len(img_array.shape) == 3 and img_array.shape[2] >= 3:
        lab = cv2.cvtColor(img_array[:, :, :3], cv2.COLOR_RGB2LAB)
        
        # Apply CLAHE to L channel
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        lab[:, :, 0] = clahe.apply(lab[:, :, 0])
        
        # Convert back to RGB
        result = cv2.cvtColor(lab, cv2.COLOR_LAB2RGB)
        
        # Preserve alpha if present
        if img_array.shape[2] == 4:
            result = np.dstack([result, img_array[:, :, 3]])
        
        return Image.fromarray(result)
    
    return image


def preprocess_image(
    image: Image.Image,
    remove_bg: bool = True,
    normalize: bool = True,
    target_size: int = None
) -> Image.Image:
    """
    Full preprocessing pipeline
    1. Remove background (optional)
    2. Center and crop object
    3. Normalize lighting (optional)
    4. Resize to target size
    5. Add white background
    """
    result = image.convert('RGB') if image.mode != 'RGB' else image
    
    # Step 1: Remove background
    if remove_bg:
        print("  → Removing background...")
        result = remove_background(result)
    
    # Step 2: Center and crop
    print("  → Centering object...")
    result = center_and_crop(result)
    
    # Step 3: Normalize lighting
    if normalize:
        print("  → Normalizing lighting...")
        result = normalize_lighting(result)
    
    # Step 4: Resize
    print(f"  → Resizing to {target_size or cfg.TARGET_SIZE}px...")
    result = resize_image(result, target_size)
    
    # Step 5: Add white background (for TripoSR)
    if result.mode == 'RGBA':
        result = add_white_background(result)
    
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
