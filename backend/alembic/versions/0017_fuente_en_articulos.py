"""Fuente original visible en los artículos y palabras de filtro por fuente RSS.

Revision ID: 0017
Revises: 0016
Create Date: 2026-11-06
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0017"
down_revision: str | None = "0016"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("articulos", sa.Column("fuente_nombre", sa.String(length=80), nullable=True))
    op.add_column("articulos", sa.Column("fuente_url", sa.String(length=700), nullable=True))
    op.add_column("fuentes", sa.Column("palabras", sa.String(length=300), server_default="", nullable=False))


def downgrade() -> None:
    op.drop_column("fuentes", "palabras")
    op.drop_column("articulos", "fuente_url")
    op.drop_column("articulos", "fuente_nombre")
