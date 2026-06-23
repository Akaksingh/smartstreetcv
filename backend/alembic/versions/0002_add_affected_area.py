"""add affected_area_m2 to issues

Revision ID: 0002_add_affected_area
Revises: 0001_initial
Create Date: 2026-06-23 19:50:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "0002_add_affected_area"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("issues", sa.Column("affected_area_m2", sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column("issues", "affected_area_m2")
