from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKEND_ROOT = Path(__file__).resolve().parent


class Settings:
    def __init__(self) -> None:
        self.vlm_api_url = os.getenv("VLM_API_URL", "").rstrip("/")
        self.database_url = os.getenv(
            "DATABASE_URL",
            "postgresql://nagarai:nagarai@localhost:5432/nagarai",
        )
        self.gemini_api_key = os.getenv("GEMINI_API_KEY")
        self.secret_key = os.getenv("SECRET_KEY", "change-this-to-random-string")

        self.complaints_dir = Path(os.getenv("COMPLAINTS_DIR", str(PROJECT_ROOT / "complaints")))
        self.font_dir = Path(os.getenv("FONT_DIR", str(self.complaints_dir / "fonts")))
        self.upload_dir = Path(os.getenv("UPLOAD_DIR", str(self.complaints_dir / "uploads")))

        self.max_image_side = int(os.getenv("MAX_IMAGE_SIDE", "800"))
        self.vlm_timeout_seconds = int(os.getenv("VLM_TIMEOUT_SECONDS", "120"))
        self.vlm_retry_count = int(os.getenv("VLM_RETRY_COUNT", "3"))
        self.nominatim_timeout_seconds = int(os.getenv("NOMINATIM_TIMEOUT_SECONDS", "15"))

        self.complaint_font_url = os.getenv(
            "DEVA_FONT_URL",
            "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSansDevanagari/NotoSansDevanagari-Regular.ttf",
        )

        self.complaints_dir.mkdir(parents=True, exist_ok=True)
        self.font_dir.mkdir(parents=True, exist_ok=True)
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    @property
    def devanagari_font_path(self) -> Path:
        return self.font_dir / "NotoSansDevanagari-Regular.ttf"


settings = Settings()
