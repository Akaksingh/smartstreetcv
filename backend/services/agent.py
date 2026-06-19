from __future__ import annotations

from typing import Any, Optional, TypedDict
from uuid import UUID

from langgraph.graph import END, StateGraph

from config import settings
from database import session_scope
from models import ComplaintReport, Issue
from services.complaint import build_complaint_content, build_whatsapp_url, generate_complaint
from services.geo import lookup_ward_name
from services.vlm_client import analyze_image


class AnalysisState(TypedDict, total=False):
    image_bytes: bytes
    image_url: str
    source_image_path: str
    latitude: float
    longitude: float
    location_name: str
    vlm_result: dict[str, Any]
    issues_detected: list[dict[str, Any]]
    severity_max: int
    processing_time: float
    issue_id: str
    complaint_generated: bool
    complaint_pdf_path: str
    whatsapp_url: str
    report_english: str
    report_hindi: str


def _select_primary_issue(issues: list[dict[str, Any]]) -> dict[str, Any]:
    if not issues:
        return {
            "issue_type": "unknown",
            "severity": 1,
            "confidence": None,
            "description_english": None,
            "description_hindi": None,
            "recommended_action": None,
        }
    return max(issues, key=lambda item: int(item.get("severity") or 1))


def analyze_node(state: AnalysisState) -> AnalysisState:
    result = analyze_image(
        state["image_bytes"],
        latitude=state.get("latitude"),
        longitude=state.get("longitude"),
        location_name=state.get("location_name"),
    )
    issues = result.get("result", {}).get("issues", []) if isinstance(result, dict) else []
    severity_max = max((int(issue.get("severity") or 1) for issue in issues), default=1)
    return {
        "vlm_result": result,
        "issues_detected": issues,
        "severity_max": severity_max,
        "processing_time": float(result.get("processing_time_seconds") or 0.0),
    }


def store_node(state: AnalysisState) -> AnalysisState:
    result = state["vlm_result"]
    issues = state.get("issues_detected", [])
    primary_issue = _select_primary_issue(issues)
    result_block = result.get("result", {}) if isinstance(result, dict) else {}

    ward_name = lookup_ward_name(state.get("latitude"), state.get("longitude"))
    resolved_location_name = state.get("location_name") or ward_name
    raw_image_reference = state.get("source_image_path") or state.get("image_url") or ""

    with session_scope() as db:
        issue = Issue(
            image_url=raw_image_reference,
            latitude=state.get("latitude"),
            longitude=state.get("longitude"),
            location_name=resolved_location_name,
            ward_name=ward_name,
            issue_type=str(primary_issue.get("issue_type") or "unknown"),
            severity=int(primary_issue.get("severity") or 1),
            confidence=primary_issue.get("confidence"),
            description_en=primary_issue.get("description_english"),
            description_hi=primary_issue.get("description_hindi"),
            recommended_action=primary_issue.get("recommended_action"),
            overall_condition=result_block.get("overall_road_condition"),
            is_safe_vehicles=result_block.get("is_safe_for_vehicles"),
            is_safe_pedestrians=result_block.get("is_safe_for_pedestrians"),
            status="open",
            raw_vlm_output=result,
        )
        db.add(issue)
        db.flush()
        issue_id = str(issue.id)

    return {"issue_id": issue_id}


def route_node(state: AnalysisState) -> AnalysisState:
    return {}


def _severity_route(state: AnalysisState) -> str:
    return "complaint" if int(state.get("severity_max") or 1) >= 3 else "done"


def complaint_node(state: AnalysisState) -> AnalysisState:
    issue_uuid = UUID(state["issue_id"])
    with session_scope() as db:
        issue = db.get(Issue, issue_uuid)
        if issue is None:
            raise RuntimeError("Issue not found while generating complaint")

        content = build_complaint_content(issue)
        pdf_path = generate_complaint(issue)
        issue.status = "reported"
        db.add(
            ComplaintReport(
                issue_id=issue.id,
                report_english=content["report_english"],
                report_hindi=content["report_hindi"],
                pdf_path=pdf_path,
            )
        )
        db.flush()

    return {
        "complaint_generated": True,
        "complaint_pdf_path": pdf_path,
        "whatsapp_url": build_whatsapp_url(content["whatsapp_summary"]),
        "report_english": content["report_english"],
        "report_hindi": content["report_hindi"],
    }


def done_node(state: AnalysisState) -> AnalysisState:
    return {
        "complaint_generated": bool(state.get("complaint_generated", False)),
        "complaint_pdf_path": state.get("complaint_pdf_path"),
        "whatsapp_url": state.get("whatsapp_url"),
    }


_graph = StateGraph(AnalysisState)
_graph.add_node("analyze", analyze_node)
_graph.add_node("store", store_node)
_graph.add_node("route", route_node)
_graph.add_node("complaint", complaint_node)
_graph.add_node("done", done_node)

_graph.set_entry_point("analyze")
_graph.add_edge("analyze", "store")
_graph.add_edge("store", "route")
_graph.add_conditional_edges("route", _severity_route, {"complaint": "complaint", "done": "done"})
_graph.add_edge("complaint", "done")
_graph.add_edge("done", END)

analysis_graph = _graph.compile()


def run_civic_analysis(
    image_bytes: bytes,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    location_name: Optional[str] = None,
    image_url: Optional[str] = None,
    source_image_path: Optional[str] = None,
) -> dict[str, Any]:
    state: AnalysisState = {
        "image_bytes": image_bytes,
        "latitude": latitude,
        "longitude": longitude,
        "location_name": location_name,
    }
    if image_url:
        state["image_url"] = image_url
    if source_image_path:
        state["source_image_path"] = source_image_path

    result = analysis_graph.invoke(state)
    return {
        "issue_id": result["issue_id"],
        "issues_detected": result.get("issues_detected", []),
        "severity_max": int(result.get("severity_max") or 1),
        "complaint_generated": bool(result.get("complaint_generated", False)),
        "complaint_pdf_path": result.get("complaint_pdf_path"),
        "whatsapp_url": result.get("whatsapp_url"),
        "processing_time": float(result.get("processing_time") or 0.0),
    }
