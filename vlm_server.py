import os
import json
import logging
import time
import requests
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv

# Load configurations from root .env and backend/.env
load_dotenv()
load_dotenv(os.path.join(os.path.dirname(__file__), "backend", ".env"))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("vlm-proxy")

app = FastAPI(title="NagarAI VLM Local Proxy")

# Load VLM system prompt
PROMPT_FILE = os.path.join(os.path.dirname(__file__), "vlm_system_prompt.md")
system_prompt = ""
if os.path.exists(PROMPT_FILE):
    with open(PROMPT_FILE, "r", encoding="utf-8") as f:
        content = f.read()
        if "```markdown" in content:
            system_prompt = content.split("```markdown")[1].split("```")[0].strip()
        else:
            system_prompt = content.strip()
    logger.info("Loaded system prompt successfully.")
else:
    logger.warning("vlm_system_prompt.md not found in the root directory!")


def normalize_vlm_output(parsed: dict) -> dict:
    """
    Normalize the VLM output to ensure it matches the expected schema.
    Handles cases where the model returns a slightly different structure.
    """
    # If top-level key is "issues", structure is already correct
    if "issues" in parsed:
        return parsed

    # Some models wrap the result under different keys
    for key in ("result", "analysis", "output", "data"):
        if key in parsed and isinstance(parsed[key], dict):
            inner = parsed[key]
            if "issues" in inner:
                logger.info(f"Normalized: found issues under '{key}' key.")
                return inner

    # If no issues key found at all, wrap the entire response as a single issue
    logger.warning("VLM output did not contain 'issues' key. Attempting field-level normalization.")
    return {
        "overall_road_condition": parsed.get("overall_road_condition", "poor"),
        "is_safe_for_vehicles": parsed.get("is_safe_for_vehicles", False),
        "is_safe_for_pedestrians": parsed.get("is_safe_for_pedestrians", False),
        "issues": parsed.get("issues", [])
    }


class AnalyzeRequest(BaseModel):
    image_base64: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_name: Optional[str] = None


@app.post("/analyze")
def analyze(payload: AnalyzeRequest):
    ollama_url = os.getenv("OLLAMA_HOST", "http://localhost:11434")
    model_name = os.getenv("VLM_MODEL_NAME", "qwen2.5vl:3b")

    content_text = (
        f"{system_prompt}\n\n"
        "Analyze the uploaded Indian road image carefully and respond ONLY with a valid JSON object "
        "matching the schema above. Do not include any explanation, markdown, or extra text. "
        "Output the raw JSON only."
    )

    ollama_payload = {
        "model": model_name,
        "messages": [
            {
                "role": "user",
                "content": content_text,
                "images": [payload.image_base64]
            }
        ],
        "stream": False,
        "format": "json",
        "options": {
            "temperature": 0.1,
            "num_predict": 1024
        }
    }

    logger.info(f"Sending request to Ollama at {ollama_url}/api/chat using model={model_name}...")
    start_time = time.perf_counter()

    timeout = int(os.getenv("VLM_TIMEOUT_SECONDS", "300"))

    try:
        response = requests.post(
            f"{ollama_url}/api/chat",
            json=ollama_payload,
            timeout=timeout
        )
        response.raise_for_status()
        resp_data = response.json()

        message_content = resp_data.get("message", {}).get("content", "").strip()
        elapsed = round(time.perf_counter() - start_time, 2)

        # Log the FULL raw response for debugging
        logger.info(f"=== RAW VLM RESPONSE ({elapsed}s) ===")
        logger.info(message_content)
        logger.info("=== END RAW RESPONSE ===")

        try:
            parsed_json = json.loads(message_content)
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {e}")
            logger.error(f"Raw content was: {message_content}")
            raise HTTPException(status_code=500, detail=f"VLM returned invalid JSON: {e}")

        normalized = normalize_vlm_output(parsed_json)
        logger.info(f"Issues detected: {len(normalized.get('issues', []))}")

        return {
            "success": True,
            "result": normalized,
            "processing_time_seconds": elapsed
        }

    except requests.exceptions.Timeout:
        logger.error(f"Ollama request timed out after {timeout}s")
        raise HTTPException(status_code=504, detail=f"Ollama timed out after {timeout}s. Try a smaller model like qwen2.5vl:3b.")
    except requests.RequestException as e:
        logger.error(f"Error contacting Ollama: {e}")
        raise HTTPException(status_code=502, detail=f"Ollama server error: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
