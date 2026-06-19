from __future__ import annotations

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db
from models import Issue
from schemas import IssueRead, IssueStatusUpdate

router = APIRouter(prefix="/issues", tags=["issues"])


def _issue_to_schema(issue: Issue) -> IssueRead:
    return IssueRead.model_validate(issue)


@router.get("")
def list_issues(
    ward: Optional[str] = Query(None),
    severity_min: Optional[int] = Query(None, ge=1, le=4),
    issue_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    stmt = select(Issue).order_by(Issue.created_at.desc())
    if ward:
        stmt = stmt.where(Issue.ward_name.ilike(f"%{ward}%"))
    if severity_min is not None:
        stmt = stmt.where(Issue.severity >= severity_min)
    if issue_type:
        stmt = stmt.where(Issue.issue_type.ilike(f"%{issue_type}%"))
    if status:
        stmt = stmt.where(Issue.status.ilike(status))

    stmt = stmt.limit(limit).offset(offset)
    items = db.execute(stmt).scalars().all()
    return [_issue_to_schema(item) for item in items]


@router.get("/{issue_id}")
def get_issue(issue_id: UUID, db: Session = Depends(get_db)):
    issue = db.get(Issue, issue_id)
    if issue is None:
        raise HTTPException(status_code=404, detail="Issue not found")
    return _issue_to_schema(issue)


@router.patch("/{issue_id}/status")
def update_issue_status(issue_id: UUID, payload: IssueStatusUpdate, db: Session = Depends(get_db)):
    issue = db.get(Issue, issue_id)
    if issue is None:
        raise HTTPException(status_code=404, detail="Issue not found")

    issue.status = payload.status
    db.add(issue)
    db.commit()
    db.refresh(issue)
    return _issue_to_schema(issue)
