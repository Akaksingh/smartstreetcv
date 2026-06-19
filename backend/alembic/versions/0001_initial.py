"""initial schema

Revision ID: 0001_initial
Revises: 
Create Date: 2026-06-19 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "issues",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("image_url", sa.Text(), nullable=False, server_default=""),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("location_name", sa.Text(), nullable=True),
        sa.Column("ward_name", sa.Text(), nullable=True),
        sa.Column("issue_type", sa.Text(), nullable=False, server_default="unknown"),
        sa.Column("severity", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column("description_en", sa.Text(), nullable=True),
        sa.Column("description_hi", sa.Text(), nullable=True),
        sa.Column("recommended_action", sa.Text(), nullable=True),
        sa.Column("overall_condition", sa.Integer(), nullable=True),
        sa.Column("is_safe_vehicles", sa.Boolean(), nullable=True),
        sa.Column("is_safe_pedestrians", sa.Boolean(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="open"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("raw_vlm_output", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )

    op.create_table(
        "complaint_reports",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("issue_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("issues.id", ondelete="CASCADE"), nullable=False),
        sa.Column("report_english", sa.Text(), nullable=False),
        sa.Column("report_hindi", sa.Text(), nullable=False),
        sa.Column("pdf_path", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("complaint_reports")
    op.drop_table("issues")
