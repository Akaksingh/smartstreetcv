from __future__ import annotations

from pathlib import Path
from uuid import uuid4

import httpx
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool

from config import settings
from schemas import AnalyzeUrlRequest
from services.agent import run_civic_analysis
from services.geo import extract_gps_coordinates
from services.vlm_client import compress_image_bytes

router = APIRouter(tags=["analysis"])


def _persist_image_bytes(image_bytes: bytes, prefix: str = "upload") -> str:
    """Save image bytes to disk and return the web-accessible relative URL path."""
    filename = f"{prefix}-{uuid4().hex}.jpg"
    target_path = settings.upload_dir / filename
    target_path.write_bytes(image_bytes)
    # Return relative URL that the /complaints static mount serves
    relative = target_path.relative_to(settings.complaints_dir)
    return f"/complaints/{relative.as_posix()}"


@router.post("/analyze")
async def analyze_image_upload(
    image: UploadFile = File(...),
    latitude: float | None = Form(None),
    longitude: float | None = Form(None),
    location_name: str | None = Form(None),
):
    try:
        uploaded_bytes = await image.read()
        if latitude is None or longitude is None:
            exif_lat, exif_lon = extract_gps_coordinates(uploaded_bytes)
            if exif_lat is not None and exif_lon is not None:
                latitude = exif_lat
                longitude = exif_lon

        compressed_bytes = compress_image_bytes(uploaded_bytes)
        saved_path = _persist_image_bytes(compressed_bytes, prefix="upload")
        result = await run_in_threadpool(
            run_civic_analysis,
            compressed_bytes,
            latitude,
            longitude,
            location_name,
            None,
            saved_path,
        )
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/analyze/url")
async def analyze_image_url(payload: AnalyzeUrlRequest):
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.get(payload.image_url)
            response.raise_for_status()
            downloaded_bytes = response.content

        compressed_bytes = compress_image_bytes(downloaded_bytes)
        saved_path = _persist_image_bytes(compressed_bytes, prefix="url")
        result = await run_in_threadpool(
            run_civic_analysis,
            compressed_bytes,
            payload.latitude,
            payload.longitude,
            payload.location_name,
            payload.image_url,
            saved_path,
        )
        return result
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Failed to download image_url: {exc}") from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
