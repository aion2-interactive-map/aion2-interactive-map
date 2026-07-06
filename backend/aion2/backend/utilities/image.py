import base64
import hashlib
from typing import BinaryIO
from io import BytesIO

from PIL import Image, ImageOps, UnidentifiedImageError

from aion2.backend.utilities.exceptions import BizError, ErrorCode

def sha256_base64url(data: bytes, length: int = 16) -> str:
    """
    Hash bytes with SHA-256, truncate to `length` bytes,
    and encode using URL-safe Base64 (no padding).

    length = 16 gives a compact ~22-char ID.
    """
    digest = hashlib.sha256(data).digest()[:length]
    encoded = base64.urlsafe_b64encode(digest).decode().rstrip("=")
    return encoded

def load_normalized_image(file: BinaryIO) -> Image.Image:
    """
    Open an image from a file-like object, fix EXIF orientation,
    and choose RGB/RGBA mode based on presence of transparency.
    """
    img_raw = Image.open(file)

    # Fix EXIF orientation (rotated phone photos, etc.)
    img = ImageOps.exif_transpose(img_raw)

    # Best-compatibility mode logic:
    # - If image has transparency, keep it (RGBA).
    # - Otherwise convert to RGB for smaller files.
    if img.mode in ("RGBA", "LA"):
        img = img.convert("RGBA")
    elif img.mode == "P":
        # 'P' can have transparency via palette
        if "transparency" in img.info:
            img = img.convert("RGBA")
        else:
            img = img.convert("RGB")
    else:
        img = img.convert("RGB")

    return img


def resize_fit_max(img: Image.Image, max_size: int) -> Image.Image:
    """
    Resize so that max(width, height) <= max_size, keeping aspect ratio.
    Do NOT upscale if already smaller.
    """
    w, h = img.size
    if max(w, h) <= max_size:
        return img.copy()
    scale = max_size / max(w, h)
    new_w = int(w * scale)
    new_h = int(h * scale)
    return img.resize((new_w, new_h), Image.LANCZOS)


def resize_cover(img: Image.Image, target_w: int, target_h: int) -> Image.Image:
    """
    Resize & crop so that the result is exactly (target_w, target_h),
    covering the entire area (like CSS object-fit: cover):

    1) scale image so that BOTH sides >= target size
    2) center-crop to target size
    """
    src_w, src_h = img.size
    scale = max(target_w / src_w, target_h / src_h)
    new_w = int(src_w * scale)
    new_h = int(src_h * scale)

    img_resized = img.resize((new_w, new_h), Image.LANCZOS)

    left = (new_w - target_w) // 2
    top = (new_h - target_h) // 2
    right = left + target_w
    bottom = top + target_h

    return img_resized.crop((left, top, right, bottom))


def make_full_image(img: Image.Image, quality=100) -> bytes:
    """
    Full version:
      - original resolution (no resize)
      - WEBP quality = 100
    """
    buf = BytesIO()
    img.save(
        buf,
        format="WEBP",
        quality=quality,
        method=6,
    )
    return buf.getvalue()


def make_normal_image(img: Image.Image, size=1280, quality=80) -> bytes:
    """
    Normal version:
      - max(width, height) <= 1280
      - keep aspect ratio, no upscaling
      - WEBP quality = 80
    """
    normal_img = resize_fit_max(img, size)
    buf = BytesIO()
    normal_img.save(
        buf,
        format="WEBP",
        quality=quality,
        method=6,
    )
    return buf.getvalue()


def make_small_image(img: Image.Image, width=320, height=180, quality=60) -> bytes:
    """
    Small version:
      - exactly 320x180, 16:9
      - resize + center crop (cover)
      - WEBP quality = 60
    """
    small_img = resize_cover(img, width, height)
    buf = BytesIO()
    small_img.save(
        buf,
        format="WEBP",
        quality=quality,
        method=6,
    )
    return buf.getvalue()

def process_image(file: BinaryIO) -> dict[str, bytes]:
    """
    Convenience wrapper:
      - loads & normalizes image
      - returns small/normal/full WebP bytes
    """
    try:
        img = load_normalized_image(file)
        full_bytes = make_full_image(img)
        normal_bytes = make_normal_image(img)
        small_bytes = make_small_image(img)

        return {
            "full": full_bytes,
            "normal": normal_bytes,
            "small": small_bytes,
            "width": img.width,
            "height": img.height,
            "digest": sha256_base64url(full_bytes),
        }
    except Exception as e:
        raise BizError(ErrorCode.ImageError, str(e))




