from __future__ import annotations

from uuid import uuid4

import httpx
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool

from schemas import AnalyzeUrlRequest
from services.agent import run_civic_analysis
from services.geo import extract_gps_coordinates
from services.image_storage import upload_image
from services.vlm_client import compress_image_bytes

router = APIRouter(tags=["analysis"])


def _save_image(image_bytes: bytes, prefix: str = "upload") -> str:
    """Compress and persist image, returning its public URL."""
    filename = f"{prefix}-{uuid4().hex}.jpg"
    compressed = compress_image_bytes(image_bytes)
    return upload_image(compressed, filename)


@router.post("/analyze")
async def analyze_image_upload(
    image: UploadFile = File(...),
    latitude: float | None = Form(None),
    longitude: float | None = Form(None),
    location_name: str | None = Form(None),
):
    try:
        uploaded_bytes = await image.read()

        # Fall back to EXIF GPS if no coordinates provided
        if latitude is None or longitude is None:
            exif_lat, exif_lon = extract_gps_coordinates(uploaded_bytes)
            if exif_lat is not None and exif_lon is not None:
                latitude = exif_lat
                longitude = exif_lon

        # Save to cloud storage (Cloudinary) or local
        saved_url = await run_in_threadpool(_save_image, uploaded_bytes, "upload")

        result = await run_in_threadpool(
            run_civic_analysis,
            uploaded_bytes,
            latitude,
            longitude,
            location_name,
            None,          # image_url param
            saved_url,     # source_image_path param (now a URL)
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

        saved_url = await run_in_threadpool(_save_image, downloaded_bytes, "url")
        result = await run_in_threadpool(
            run_civic_analysis,
            downloaded_bytes,
            payload.latitude,
            payload.longitude,
            payload.location_name,
            payload.image_url,
            saved_url,
        )
        return result
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Failed to download image: {exc}") from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
