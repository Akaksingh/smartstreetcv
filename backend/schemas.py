from __future__ import annotations

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class DetectedIssue(BaseModel):
    issue_type: str
    severity: int = Field(..., ge=1, le=4)
    confidence: Optional[float] = Field(default=None, ge=0, le=1)
    description_english: Optional[str] = None
    description_hindi: Optional[str] = None
    recommended_action: Optional[str] = None
    estimated_repair_days: Optional[int] = Field(default=None, ge=0)


class AnalyzeUrlRequest(BaseModel):
    image_url: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_name: Optional[str] = None


class IssueStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(open|reported|resolved)$")


class ComplaintCreateRequest(BaseModel):
    issue_id: UUID


class IssueRead(BaseModel):
    id: UUID
    image_url: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_name: Optional[str] = None
    ward_name: Optional[str] = None
    issue_type: str
    severity: int
    confidence: Optional[float] = None
    description_en: Optional[str] = None
    description_hi: Optional[str] = None
    recommended_action: Optional[str] = None
    overall_condition: Optional[int] = None
    is_safe_vehicles: Optional[bool] = None
    is_safe_pedestrians: Optional[bool] = None
    status: str
    created_at: datetime
    raw_vlm_output: Optional[dict[str, Any]] = None

    class Config:
        from_attributes = True


class ComplaintReportRead(BaseModel):
    id: UUID
    issue_id: UUID
    report_english: str
    report_hindi: str
    pdf_path: str
    created_at: datetime

    class Config:
        from_attributes = True


class AnalysisResponse(BaseModel):
    issue_id: UUID
    issues_detected: list[DetectedIssue]
    severity_max: int
    complaint_generated: bool
    complaint_pdf_path: Optional[str] = None
    whatsapp_url: Optional[str] = None
    processing_time: float


class WardStats(BaseModel):
    ward_name: str
    total_issues: int
    avg_severity: float
    critical_count: int
    health_score: float


class SummaryStats(BaseModel):
    total_issues: int
    open_issues: int
    critical_issues: int
    most_affected_ward: Optional[str] = None
    issues_last_7_days: int
