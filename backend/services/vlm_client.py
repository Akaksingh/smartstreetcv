from __future__ import annotations

import base64
import io
import logging
import time
from datetime import datetime, timezone
from typing import Any, Optional

import requests
from PIL import Image, ImageOps

from config import settings

logger = logging.getLogger("nagarai.vlm")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO)


def compress_image_bytes(image_bytes: bytes, max_side: Optional[int] = None) -> bytes:
    max_side = max_side or settings.max_image_side
    with Image.open(io.BytesIO(image_bytes)) as image:
        image = ImageOps.exif_transpose(image)
        if image.mode not in ("RGB", "L"):
            image = image.convert("RGB")
        else:
            image = image.convert("RGB")

        image.thumbnail((max_side, max_side))
        output = io.BytesIO()
        image.save(output, format="JPEG", quality=85, optimize=True)
        return output.getvalue()


def _to_base64_jpeg(image_bytes: bytes) -> str:
    compressed = compress_image_bytes(image_bytes)
    return base64.b64encode(compressed).decode("utf-8")


def analyze_image(
    image_bytes: bytes,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    location_name: Optional[str] = None,
) -> dict[str, Any]:
    if not settings.vlm_api_url:
        raise RuntimeError("VLM_API_URL is not configured")

    url = f"{settings.vlm_api_url}/analyze"
    payload: dict[str, Any] = {"image_base64": _to_base64_jpeg(image_bytes)}
    if latitude is not None:
        payload["latitude"] = latitude
    if longitude is not None:
        payload["longitude"] = longitude
    if location_name:
        payload["location_name"] = location_name

    timestamp = datetime.now(timezone.utc).isoformat()
    last_error: Optional[Exception] = None

    for attempt in range(1, settings.vlm_retry_count + 1):
        started = time.perf_counter()
        try:
            logger.info("VLM analyze started at %s attempt=%s url=%s", timestamp, attempt, url)
            response = requests.post(url, json=payload, timeout=settings.vlm_timeout_seconds)
            response.raise_for_status()
            result = response.json()
            if not isinstance(result, dict):
                raise RuntimeError("VLM API returned a non-object response")
            if result.get("success") is False:
                raise RuntimeError(f"VLM API reported failure: {result}")

            elapsed = round(time.perf_counter() - started, 2)
            logger.info("VLM analyze finished at %s attempt=%s elapsed=%s", timestamp, attempt, elapsed)
            return result
        except (requests.RequestException, ValueError, RuntimeError) as exc:
            elapsed = round(time.perf_counter() - started, 2)
            logger.warning("VLM analyze failed attempt=%s elapsed=%s error=%s", attempt, elapsed, exc)
            last_error = exc
            if attempt >= settings.vlm_retry_count:
                break

    raise RuntimeError(f"VLM analysis failed after retries: {last_error}")
