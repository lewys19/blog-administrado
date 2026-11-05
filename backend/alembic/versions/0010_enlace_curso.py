"""Enlace del curso: dónde está el material (Drive u otro). Los cursos gratis lo muestran a todos.

Revision ID: 0010
Revises: 0009
Create Date: 2026-11-04
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0010"
down_revision: str | None = "0009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("cursos", sa.Column("enlace", sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column("cursos", "enlace")
