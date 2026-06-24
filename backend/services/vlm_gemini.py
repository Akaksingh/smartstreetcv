"""
Gemini Vision VLM client for NagarAI.
Uses google-generativeai to call gemini-1.5-flash with the same JSON schema
as the local Ollama/vlm_server pipeline.

Set GEMINI_API_KEY in environment to activate this backend.
"""
from __future__ import annotations

import base64
import json
import logging
import re
import time
from typing import Any, Optional

logger = logging.getLogger("nagarai.gemini")

SYSTEM_PROMPT = """You are an AI that analyzes road/civic infrastructure photos for Indian municipal authorities.

Return ONLY a valid JSON object in this exact format — no markdown, no extra text:
{
  "success": true,
  "result": {
    "overall_road_condition": "good|fair|poor|critical",
    "is_safe_for_vehicles": true,
    "is_safe_for_pedestrians": true,
    "issues": [
      {
        "issue_type": "pothole|waterlogging|open_manhole|debris_dump|encroachment|damaged_footpath|open_drainage|cattle_on_road|missing_road_sign|other",
        "severity": 1,
        "confidence": 0.9,
        "affected_area_m2": 5,
        "description_english": "Description in English.",
        "description_hindi": "हिंदी में विवरण।",
        "recommended_action": "What municipality should do."
      }
    ]
  },
  "processing_time_seconds": 1.0
}

Severity scale: 1=low, 2=moderate, 3=high, 4=critical.
If no issues are found, return an empty issues array.
"""


def analyze_image_gemini(
    image_bytes: bytes,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    location_name: Optional[str] = None,
) -> dict[str, Any]:
    """Call Gemini 1.5 Flash with vision to analyze a road image."""
    try:
        import google.generativeai as genai  # type: ignore
    except ImportError:
        raise RuntimeError("google-generativeai is not installed. Run: pip install google-generativeai")

    from config import settings
    if not settings.gemini_api_key:
        raise RuntimeError("GEMINI_API_KEY is not set in environment")

    genai.configure(api_key=settings.gemini_api_key)
    model = genai.GenerativeModel("gemini-1.5-flash")

    # Build location context
    loc_context = ""
    if location_name:
        loc_context = f"\nLocation: {location_name}"
    if latitude is not None and longitude is not None:
        loc_context += f" ({latitude:.5f}, {longitude:.5f})"

    prompt = SYSTEM_PROMPT + (f"\n{loc_context}" if loc_context else "")

    # Prepare image as base64 inline data
    b64 = base64.b64encode(image_bytes).decode("utf-8")
    image_part = {"mime_type": "image/jpeg", "data": b64}

    started = time.perf_counter()
    logger.info("Gemini Vision analysis started. location=%s", location_name)

    try:
        response = model.generate_content(
            [prompt, image_part],
            generation_config=genai.GenerationConfig(
                temperature=0.1,
                max_output_tokens=2048,
            ),
        )
        raw_text = response.text.strip()
        elapsed = round(time.perf_counter() - started, 2)
        logger.info("Gemini response received. elapsed=%ss", elapsed)

        # Strip markdown code fences if present
        cleaned = re.sub(r"^```(?:json)?\s*", "", raw_text, flags=re.MULTILINE)
        cleaned = re.sub(r"\s*```$", "", cleaned, flags=re.MULTILINE).strip()

        result = json.loads(cleaned)
        result["processing_time_seconds"] = elapsed
        if "result" not in result:
            result = {"success": True, "result": result, "processing_time_seconds": elapsed}
        return result

    except json.JSONDecodeError as e:
        logger.error("Gemini returned invalid JSON: %s | raw=%s", e, raw_text[:500])
        elapsed = round(time.perf_counter() - started, 2)
        return {
            "success": True,
            "result": {
                "overall_road_condition": "unknown",
                "is_safe_for_vehicles": True,
                "is_safe_for_pedestrians": True,
                "issues": [],
            },
            "processing_time_seconds": elapsed,
        }
    except Exception as exc:
        elapsed = round(time.perf_counter() - started, 2)
        logger.error("Gemini analysis failed: %s (elapsed=%ss)", exc, elapsed)
        raise RuntimeError(f"Gemini analysis failed: {exc}") from exc
