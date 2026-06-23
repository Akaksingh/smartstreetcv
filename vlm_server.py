import os
import json
import logging
import time
import requests
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("vlm-proxy")

app = FastAPI(title="NagarAI VLM Local Proxy")

# Load VLM system prompt
PROMPT_FILE = os.path.join(os.path.dirname(__file__), "vlm_system_prompt.md")
system_prompt = ""
if os.path.exists(PROMPT_FILE):
    with open(PROMPT_FILE, "r", encoding="utf-8") as f:
        content = f.read()
        # Extract the markdown block inside the first ```markdown block if present
        if "```markdown" in content:
            system_prompt = content.split("```markdown")[1].split("```")[0].strip()
        else:
            system_prompt = content.strip()
else:
    logger.warning("vlm_system_prompt.md not found in the root directory!")

class AnalyzeRequest(BaseModel):
    image_base64: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_name: Optional[str] = None

@app.post("/analyze")
def analyze(payload: AnalyzeRequest):
    ollama_url = os.getenv("OLLAMA_HOST", "http://localhost:11434")
    model_name = os.getenv("VLM_MODEL_NAME", "qwen2-vl")
    
    # Construct the user instructions incorporating the system prompt
    content_text = f"System Instruction:\n{system_prompt}\n\nAnalyze this street image of an Indian road and output the JSON response."
    
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
            "temperature": 0.1
        }
    }
    
    logger.info(f"Sending request to Ollama at {ollama_url}/api/chat for model {model_name}...")
    start_time = time.perf_counter()
    try:
        response = requests.post(f"{ollama_url}/api/chat", json=ollama_payload, timeout=180)
        response.raise_for_status()
        resp_data = response.json()
        
        message_content = resp_data.get("message", {}).get("content", "").strip()
        elapsed = round(time.perf_counter() - start_time, 2)
        logger.info(f"Received response from Ollama in {elapsed}s: {message_content[:200]}...")
        
        parsed_json = json.loads(message_content)
        return {
            "success": True,
            "result": parsed_json,
            "processing_time_seconds": elapsed
        }
    except requests.RequestException as e:
        logger.error(f"Error contacting Ollama: {e}")
        raise HTTPException(status_code=502, detail=f"Ollama server error: {e}")
    except (json.JSONDecodeError, KeyError) as e:
        logger.error(f"Error parsing Ollama response: {e}")
        raise HTTPException(status_code=500, detail="Invalid JSON response returned by VLM")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
