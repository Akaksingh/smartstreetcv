from __future__ import annotations

import io
from pathlib import Path

from fastapi.testclient import TestClient
from PIL import Image

import config
import main as main_module
from main import app
from services.complaint import build_whatsapp_url
from services.vlm_client import compress_image_bytes


def _make_jpeg(width: int = 1600, height: int = 1200) -> bytes:
    image = Image.new("RGB", (width, height), color=(120, 120, 120))
    output = io.BytesIO()
    image.save(output, format="JPEG", quality=95)
    return output.getvalue()


def test_compress_image_bytes_caps_dimensions() -> None:
    original = _make_jpeg()
    compressed = compress_image_bytes(original, max_side=800)
    with Image.open(io.BytesIO(compressed)) as image:
        assert max(image.size) <= 800


def test_build_whatsapp_url_encodes_text() -> None:
    url = build_whatsapp_url("Issue at Ward 1: pothole detected")
    assert url.startswith("https://wa.me/?text=")
    assert "pothole%20detected" in url


def _make_client(monkeypatch) -> TestClient:
    monkeypatch.setattr(main_module, "init_db", lambda: None)
    return TestClient(app)


def test_health_endpoint(monkeypatch) -> None:
    client = _make_client(monkeypatch)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_analyze_upload_path_uses_agent_and_saves_image(monkeypatch, tmp_path: Path) -> None:
    settings = config.settings
    monkeypatch.setattr(settings, "complaints_dir", tmp_path / "complaints")
    monkeypatch.setattr(settings, "upload_dir", tmp_path / "uploads")
    monkeypatch.setattr(settings, "font_dir", tmp_path / "fonts")
    monkeypatch.setattr(settings, "max_image_side", 800)
    monkeypatch.setattr(settings, "vlm_api_url", "https://example.invalid")
    monkeypatch.setattr(settings, "database_url", "sqlite:///:memory:")
    monkeypatch.setattr(settings, "vlm_retry_count", 0)
    settings.complaints_dir.mkdir(parents=True, exist_ok=True)
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    settings.font_dir.mkdir(parents=True, exist_ok=True)
    monkeypatch.setattr(main_module, "init_db", lambda: None)

    import routes.analyze as analyze_route

    def fake_run_civic_analysis(*args, **kwargs):
        return {
            "issue_id": "11111111-1111-1111-1111-111111111111",
            "issues_detected": [{"issue_type": "pothole", "severity": 4}],
            "severity_max": 4,
            "complaint_generated": True,
            "complaint_pdf_path": str(tmp_path / "complaints" / "11111111-1111-1111-1111-111111111111.pdf"),
            "whatsapp_url": "https://wa.me/?text=test",
            "processing_time": 1.23,
        }

    monkeypatch.setattr(analyze_route, "run_civic_analysis", fake_run_civic_analysis)

    client = TestClient(app)
    image_bytes = _make_jpeg()
    response = client.post(
        "/analyze",
        files={"image": ("road.jpg", image_bytes, "image/jpeg")},
        data={"latitude": "28.6139", "longitude": "77.2090", "location_name": "Dwarka, Delhi"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["severity_max"] == 4
    assert payload["complaint_generated"] is True
    assert payload["whatsapp_url"] == "https://wa.me/?text=test"
