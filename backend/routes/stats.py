from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import case, desc, func, select, text
from sqlalchemy.orm import Session

from database import get_db
from models import Issue
from schemas import SummaryStats, WardStats

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/wards")
def ward_stats(db: Session = Depends(get_db)):
    ward_label = func.coalesce(Issue.ward_name, "Unknown")
    stmt = (
        select(
            ward_label.label("ward_name"),
            func.count(Issue.id).label("total_issues"),
            func.coalesce(func.avg(Issue.severity), 0).label("avg_severity"),
            func.coalesce(func.sum(case((Issue.severity >= 3, 1), else_=0)), 0).label("critical_count"),
        )
        .group_by(ward_label)
        .order_by(desc("total_issues"))
    )
    rows = db.execute(stmt).all()
    results = []
    for row in rows:
        avg_severity = float(row.avg_severity or 0)
        health_score = max(0.0, min(100.0, 100.0 - (avg_severity * 25.0)))
        results.append(
            WardStats(
                ward_name=row.ward_name,
                total_issues=int(row.total_issues or 0),
                avg_severity=round(avg_severity, 2),
                critical_count=int(row.critical_count or 0),
                health_score=round(health_score, 2),
            )
        )
    return results


@router.get("/summary")
def summary_stats(db: Session = Depends(get_db)):
    total_issues = db.scalar(select(func.count(Issue.id))) or 0
    open_issues = db.scalar(select(func.count(Issue.id)).where(Issue.status == "open")) or 0
    critical_issues = db.scalar(select(func.count(Issue.id)).where(Issue.severity >= 3)) or 0
    issues_last_7_days = (
        db.scalar(select(func.count(Issue.id)).where(Issue.created_at >= func.now() - text("interval '7 days'")))
        or 0
    )

    ward_stmt = (
        select(
            func.coalesce(Issue.ward_name, "Unknown").label("ward_name"),
            func.count(Issue.id).label("total_issues"),
        )
        .group_by(func.coalesce(Issue.ward_name, "Unknown"))
        .order_by(desc("total_issues"))
        .limit(1)
    )
    top_ward_row = db.execute(ward_stmt).first()
    most_affected_ward = top_ward_row.ward_name if top_ward_row else None

    return SummaryStats(
        total_issues=int(total_issues),
        open_issues=int(open_issues),
        critical_issues=int(critical_issues),
        most_affected_ward=most_affected_ward,
        issues_last_7_days=int(issues_last_7_days),
    )
