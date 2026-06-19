from __future__ import annotations

import os
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.parse import quote

import requests
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

from config import settings
from models import Issue

HINDI_HEADER = "नगर निगम को शिकायत"
HINDI_FOOTER = "NagarAI — एआई नागरिक इंटेलिजेंस सिस्टम"


def ensure_devanagari_font() -> str:
    font_path = settings.devanagari_font_path
    if not font_path.exists():
        response = requests.get(settings.complaint_font_url, timeout=60)
        response.raise_for_status()
        font_path.write_bytes(response.content)

    font_name = "NotoSansDevanagari"
    if font_name not in pdfmetrics.getRegisteredFontNames():
        pdfmetrics.registerFont(TTFont(font_name, str(font_path)))
    return font_name


def build_complaint_content(issue: Issue) -> dict[str, str]:
    report_date = datetime.now().strftime("%d %B %Y")
    location_bits = [part for part in [issue.location_name, issue.ward_name] if part]
    location_text = ", ".join(location_bits) if location_bits else "Reported location"
    coordinates_text = "N/A"
    if issue.latitude is not None and issue.longitude is not None:
        coordinates_text = f"{issue.latitude:.6f}, {issue.longitude:.6f}"

    english = (
        f"To,\nThe Municipal Corporation\n\n"
        f"Subject: Complaint regarding {issue.issue_type} at {location_text}.\n\n"
        f"Date: {report_date}\n"
        f"Ward: {issue.ward_name or 'N/A'}\n"
        f"Coordinates: {coordinates_text}\n"
        f"Severity: {issue.severity}/4\n\n"
        f"Issue description:\n{issue.description_en or 'No English description was generated.'}\n\n"
        f"Recommended action:\n{issue.recommended_action or 'Please inspect and remediate this issue at the earliest.'}\n\n"
        f"This complaint has been generated automatically by NagarAI based on AI-assisted road inspection."
    )

    hindi = (
        f"नगर निगम के संबंधित अधिकारी के लिए,\n\n"
        f"विषय: {location_text} में {issue.issue_type} के संबंध में शिकायत।\n\n"
        f"तारीख: {report_date}\n"
        f"वार्ड: {issue.ward_name or 'उपलब्ध नहीं'}\n"
        f"निर्देशांक: {coordinates_text}\n"
        f"गंभीरता: {issue.severity}/4\n\n"
        f"मुख्य शिकायत:\n{issue.description_hi or 'कोई हिंदी विवरण उपलब्ध नहीं है।'}\n\n"
        f"अनुशंसित कार्यवाही:\n{issue.recommended_action or 'कृपया तुरंत निरीक्षण और मरम्मत करें।'}\n\n"
        f"यह शिकायत NagarAI द्वारा स्वचालित रूप से तैयार की गई है।"
    )

    summary = (
        f"NagarAI complaint for {issue.issue_type} at {location_text}. "
        f"Severity {issue.severity}/4. Ward: {issue.ward_name or 'N/A'}."
    )

    return {
        "report_english": english,
        "report_hindi": hindi,
        "whatsapp_summary": summary,
    }


def _build_styles(hindi_font: str) -> dict[str, ParagraphStyle]:
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="TitleCenter",
            parent=styles["Title"],
            alignment=TA_CENTER,
            fontName="Helvetica-Bold",
            fontSize=18,
            leading=22,
            textColor=colors.HexColor("#1f2937"),
        )
    )
    styles.add(
        ParagraphStyle(
            name="HindiTitleCenter",
            parent=styles["Title"],
            alignment=TA_CENTER,
            fontName=hindi_font,
            fontSize=16,
            leading=20,
            textColor=colors.HexColor("#1f2937"),
        )
    )
    styles.add(
        ParagraphStyle(
            name="SectionHeading",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=12,
            leading=15,
            textColor=colors.HexColor("#0f172a"),
            spaceBefore=10,
            spaceAfter=6,
        )
    )
    styles.add(
        ParagraphStyle(
            name="BodyEnglish",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=10.5,
            leading=15,
            textColor=colors.HexColor("#111827"),
        )
    )
    styles.add(
        ParagraphStyle(
            name="BodyHindi",
            parent=styles["BodyText"],
            fontName=hindi_font,
            fontSize=11,
            leading=15,
            textColor=colors.HexColor("#111827"),
        )
    )
    return styles


def generate_complaint(issue: Issue) -> str:
    content = build_complaint_content(issue)
    hindi_font = ensure_devanagari_font()
    styles = _build_styles(hindi_font)

    pdf_path = settings.complaints_dir / f"{issue.id}.pdf"
    pdf_path.parent.mkdir(parents=True, exist_ok=True)

    doc = SimpleDocTemplate(
        str(pdf_path),
        pagesize=A4,
        rightMargin=42,
        leftMargin=42,
        topMargin=42,
        bottomMargin=54,
    )

    def add_page_decorations(canvas, _doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 9)
        canvas.setFillColor(colors.HexColor("#475569"))
        canvas.drawRightString(A4[0] - 42, 24, HINDI_FOOTER)
        canvas.setStrokeColor(colors.HexColor("#cbd5e1"))
        canvas.line(42, 34, A4[0] - 42, 34)
        canvas.restoreState()

    location_bits = [part for part in [issue.location_name, issue.ward_name] if part]
    location_text = ", ".join(location_bits) if location_bits else "Reported location"
    coordinates_text = "N/A"
    if issue.latitude is not None and issue.longitude is not None:
        coordinates_text = f"{issue.latitude:.6f}, {issue.longitude:.6f}"

    meta_rows = [
        ["Issue ID", str(issue.id)],
        ["Date", datetime.now().strftime("%d %B %Y")],
        ["Location", location_text],
        ["Ward", issue.ward_name or "N/A"],
        ["Coordinates", coordinates_text],
        ["Severity", f"{issue.severity}/4"],
        ["Recommended Action", issue.recommended_action or "Please inspect and repair promptly."],
    ]

    story: list[Any] = [
        Paragraph("Complaint to Municipal Corporation", styles["TitleCenter"]),
        Spacer(1, 4),
        Paragraph(HINDI_HEADER, styles["HindiTitleCenter"]),
        Spacer(1, 12),
        Table(
            meta_rows,
            colWidths=[1.55 * inch, 4.75 * inch],
            style=TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f8fafc")),
                    ("BACKGROUND", (0, 2), (-1, 2), colors.HexColor("#f8fafc")),
                    ("BACKGROUND", (0, 4), (-1, 4), colors.HexColor("#f8fafc")),
                    ("BACKGROUND", (0, 6), (-1, 6), colors.HexColor("#f8fafc")),
                    ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#cbd5e1")),
                    ("INNERGRID", (0, 0), (-1, -1), 0.45, colors.HexColor("#dbe4f0")),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                    ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
                    ("FONTSIZE", (0, 0), (-1, -1), 9.5),
                    ("LEADING", (0, 0), (-1, -1), 12),
                    ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#111827")),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ]
            ),
        ),
        Spacer(1, 16),
        Paragraph("Issue Description", styles["SectionHeading"]),
        Paragraph(issue.description_en or "No English description was generated.", styles["BodyEnglish"]),
        Spacer(1, 12),
        Paragraph("मुख्य शिकायत", styles["SectionHeading"]),
        Paragraph(issue.description_hi or "कोई हिंदी विवरण उपलब्ध नहीं है।", styles["BodyHindi"]),
        Spacer(1, 12),
        Paragraph("Recommended Action", styles["SectionHeading"]),
        Paragraph(issue.recommended_action or "Please inspect and repair this issue at the earliest.", styles["BodyEnglish"]),
        Spacer(1, 12),
        Paragraph("अनुशंसित कार्यवाही", styles["SectionHeading"]),
        Paragraph(issue.recommended_action or "कृपया तुरंत निरीक्षण और मरम्मत करें।", styles["BodyHindi"]),
        Spacer(1, 16),
        Paragraph(
            "Generated by NagarAI — AI Civic Intelligence System",
            ParagraphStyle(
                name="FooterBlock",
                parent=styles["BodyText"],
                alignment=TA_CENTER,
                fontName="Helvetica-Oblique",
                fontSize=9.5,
                leading=12,
                textColor=colors.HexColor("#475569"),
            ),
        ),
    ]

    doc.build(story, onFirstPage=add_page_decorations, onLaterPages=add_page_decorations)
    return str(pdf_path)


def build_whatsapp_url(summary: str) -> str:
    return f"https://wa.me/?text={quote(summary)}"
