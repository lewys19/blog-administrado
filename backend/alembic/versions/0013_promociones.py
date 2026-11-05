"""Academia: promociones (packs con precio especial, se compran por WhatsApp).

Revision ID: 0013
Revises: 0012
Create Date: 2026-11-04
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0013"
down_revision: str | None = "0012"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "academia_promociones",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("titulo", sa.String(length=80), nullable=False),
        sa.Column("detalle", sa.Text(), nullable=False),
        sa.Column("precio_anterior", sa.Numeric(8, 2), nullable=True),
        sa.Column("precio", sa.Numeric(8, 2), nullable=False),
        sa.Column("orden", sa.SmallInteger(), nullable=False),
        sa.Column("activa", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_academia_promociones")),
    )


def downgrade() -> None:
    op.drop_table("academia_promociones")
