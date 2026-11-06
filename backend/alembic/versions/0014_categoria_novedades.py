"""Categoría «Novedades».

Revision ID: 0014
Revises: 0013
Create Date: 2026-11-06
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0014"
down_revision: str | None = "0013"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        INSERT INTO categorias (nombre, slug, descripcion, orden)
        VALUES ('Novedades', 'novedades', 'Noticias y lanzamientos del mundo de la tecnología.', 6)
        ON CONFLICT DO NOTHING
        """
    )


def downgrade() -> None:
    op.execute("DELETE FROM categorias WHERE slug = 'novedades'")
