from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import ComplaintReport, Issue
from schemas import ComplaintCreateRequest, ComplaintReportRead
from services.complaint import build_complaint_content, build_whatsapp_url, generate_complaint

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("")
def create_report(payload: ComplaintCreateRequest, db: Session = Depends(get_db)):
    issue = db.get(Issue, payload.issue_id)
    if issue is None:
        raise HTTPException(status_code=404, detail="Issue not found")

    content = build_complaint_content(issue)
    pdf_path = generate_complaint(issue)
    issue.status = "reported"
    report = ComplaintReport(
        issue_id=issue.id,
        report_english=content["report_english"],
        report_hindi=content["report_hindi"],
        pdf_path=pdf_path,
    )
    db.add_all([issue, report])
    db.commit()
    db.refresh(report)

    return {
        **ComplaintReportRead.model_validate(report).model_dump(),
        "whatsapp_url": build_whatsapp_url(content["whatsapp_summary"]),
    }
