"""
Cloud image storage via Cloudinary.
Falls back to local filesystem if CLOUDINARY_URL is not set.
"""
from __future__ import annotations

import logging
import os
from typing import Optional

logger = logging.getLogger("nagarai.storage")


def upload_image(image_bytes: bytes, filename: str) -> str:
    """
    Upload image_bytes to Cloudinary (if configured) or save locally.
    Returns a public URL.
    """
    cloudinary_url = os.getenv("CLOUDINARY_URL", "")

    if cloudinary_url:
        return _upload_cloudinary(image_bytes, filename)
    else:
        return _save_local(image_bytes, filename)


def _upload_cloudinary(image_bytes: bytes, filename: str) -> str:
    """Upload to Cloudinary and return the secure URL."""
    try:
        import cloudinary  # type: ignore
        import cloudinary.uploader  # type: ignore
    except ImportError:
        raise RuntimeError("cloudinary package not installed. Run: pip install cloudinary")

    # CLOUDINARY_URL is auto-parsed by the SDK
    public_id = f"nagarai/uploads/{filename.replace('.jpg', '')}"
    result = cloudinary.uploader.upload(
        image_bytes,
        public_id=public_id,
        resource_type="image",
        format="jpg",
        quality="auto",
        fetch_format="auto",
    )
    url: str = result["secure_url"]
    logger.info("Cloudinary upload complete: %s", url)
    return url


def _save_local(image_bytes: bytes, filename: str) -> str:
    """Fallback: save to local filesystem and return relative URL."""
    from config import settings
    target = settings.upload_dir / filename
    target.write_bytes(image_bytes)
    relative = target.relative_to(settings.complaints_dir)
    url = f"/complaints/{relative.as_posix()}"
    logger.info("Local save: %s", url)
    return url
