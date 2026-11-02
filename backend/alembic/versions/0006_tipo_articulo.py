"""Tipo de artículo: noticia (/blog) o guía (/guias).

Revision ID: 0006
Revises: 0005
Create Date: 2026-11-02
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0006"
down_revision: str | None = "0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Lo ya escrito queda como noticia.
    op.add_column("articulos", sa.Column("tipo", sa.String(length=10), server_default="noticia", nullable=False))
    op.create_index(op.f("ix_articulos_tipo"), "articulos", ["tipo"])


def downgrade() -> None:
    op.drop_index(op.f("ix_articulos_tipo"), table_name="articulos")
    op.drop_column("articulos", "tipo")
