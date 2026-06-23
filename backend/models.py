from __future__ import annotations

from uuid import uuid4

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from database import Base


class Issue(Base):
    __tablename__ = "issues"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    image_url = Column(Text, nullable=False, default="")
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    location_name = Column(Text, nullable=True)
    ward_name = Column(Text, nullable=True)
    issue_type = Column(Text, nullable=False, default="unknown")
    severity = Column(Integer, nullable=False, default=1)
    confidence = Column(Float, nullable=True)
    description_en = Column(Text, nullable=True)
    description_hi = Column(Text, nullable=True)
    recommended_action = Column(Text, nullable=True)
    overall_condition = Column(Integer, nullable=True)
    is_safe_vehicles = Column(Boolean, nullable=True)
    is_safe_pedestrians = Column(Boolean, nullable=True)
    affected_area_m2 = Column(Float, nullable=True)
    status = Column(String(32), nullable=False, default="open")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    raw_vlm_output = Column(JSONB, nullable=False, default=dict)

    reports = relationship("ComplaintReport", back_populates="issue", cascade="all, delete-orphan")


class ComplaintReport(Base):
    __tablename__ = "complaint_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    issue_id = Column(UUID(as_uuid=True), ForeignKey("issues.id", ondelete="CASCADE"), nullable=False)
    report_english = Column(Text, nullable=False)
    report_hindi = Column(Text, nullable=False)
    pdf_path = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    issue = relationship("Issue", back_populates="reports")
