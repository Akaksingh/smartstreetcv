from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import settings
from database import init_db
from routes.analyze import router as analyze_router
from routes.issues import router as issues_router
from routes.reports import router as reports_router
from routes.stats import router as stats_router

app = FastAPI(title="NagarAI Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/complaints", StaticFiles(directory=str(settings.complaints_dir)), name="complaints")

app.include_router(analyze_router)
app.include_router(issues_router)
app.include_router(reports_router)
app.include_router(stats_router)


@app.on_event("startup")
def startup_event() -> None:
    settings.complaints_dir.mkdir(parents=True, exist_ok=True)
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    settings.font_dir.mkdir(parents=True, exist_ok=True)
    init_db()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
