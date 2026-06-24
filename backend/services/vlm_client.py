"""
VLM client — routes to Gemini (cloud) or Ollama (local) based on env vars.

  GEMINI_API_KEY set  → Google Gemini 1.5 Flash (cloud, 1-2s, free 1500/day)
  VLM_API_URL set     → Local Ollama via vlm_server.py proxy

The JSON schema returned is identical in both cases.
"""
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
    """Resize + compress image to JPEG under max_side pixels."""
    max_side = max_side or settings.max_image_side
    with Image.open(io.BytesIO(image_bytes)) as image:
        image = ImageOps.exif_transpose(image)
        image = image.convert("RGB")
        image.thumbnail((max_side, max_side))
        output = io.BytesIO()
        image.save(output, format="JPEG", quality=85, optimize=True)
        return output.getvalue()


def _to_base64_jpeg(image_bytes: bytes) -> str:
    compressed = compress_image_bytes(image_bytes)
    return base64.b64encode(compressed).decode("utf-8")


def _analyze_ollama(
    image_bytes: bytes,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    location_name: Optional[str] = None,
) -> dict[str, Any]:
    """Call local Ollama VLM proxy server."""
    if not settings.vlm_api_url:
        raise RuntimeError("VLM_API_URL is not configured (required for Ollama mode)")

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
            logger.info("Ollama analyze attempt=%s url=%s time=%s", attempt, url, timestamp)
            response = requests.post(url, json=payload, timeout=settings.vlm_timeout_seconds)
            response.raise_for_status()
            result = response.json()
            if not isinstance(result, dict):
                raise RuntimeError("Ollama VLM returned non-object response")
            if result.get("success") is False:
                raise RuntimeError(f"Ollama VLM reported failure: {result}")
            elapsed = round(time.perf_counter() - started, 2)
            logger.info("Ollama analyze finished attempt=%s elapsed=%ss", attempt, elapsed)
            return result
        except (requests.RequestException, ValueError, RuntimeError) as exc:
            elapsed = round(time.perf_counter() - started, 2)
            logger.warning("Ollama attempt=%s failed elapsed=%ss error=%s", attempt, elapsed, exc)
            last_error = exc

    raise RuntimeError(f"Ollama VLM failed after {settings.vlm_retry_count} retries: {last_error}")


def analyze_image(
    image_bytes: bytes,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    location_name: Optional[str] = None,
) -> dict[str, Any]:
    """
    Route to the appropriate VLM backend based on configuration.
    Priority: Gemini (cloud) > Ollama (local).
    """
    if settings.gemini_api_key:
        logger.info("VLM backend: Gemini 1.5 Flash (cloud)")
        from services.vlm_gemini import analyze_image_gemini
        return analyze_image_gemini(image_bytes, latitude, longitude, location_name)

    logger.info("VLM backend: Ollama (local)")
    return _analyze_ollama(image_bytes, latitude, longitude, location_name)
