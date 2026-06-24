"""fix overall_condition type from integer to text

Revision ID: 0003_fix_overall_condition_type
Revises: 0002_add_affected_area
Create Date: 2026-06-24 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa

revision = "0003_fix_overall_condition_type"
down_revision = "0002_add_affected_area"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Change overall_condition from Integer to Text
    # VLM returns string values like "poor", "fair", "good" — not integers
    op.alter_column(
        "issues",
        "overall_condition",
        existing_type=sa.Integer(),
        type_=sa.Text(),
        existing_nullable=True,
        postgresql_using="overall_condition::text"
    )


def downgrade() -> None:
    op.alter_column(
        "issues",
        "overall_condition",
        existing_type=sa.Text(),
        type_=sa.Integer(),
        existing_nullable=True,
        postgresql_using="NULL"
    )
