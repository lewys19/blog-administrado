"""Temas de las guías (Python, Backend, Django, Otros) y el tema de cada guía.

Revision ID: 0007
Revises: 0006
Create Date: 2026-11-02
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0007"
down_revision: str | None = "0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

TEMAS = [("Python", "python", 1), ("Backend", "backend", 2), ("Django", "django", 3), ("Otros", "otros", 99)]


def upgrade() -> None:
    temas = op.create_table(
        "temas_guia",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nombre", sa.String(length=60), nullable=False),
        sa.Column("slug", sa.String(length=70), nullable=False),
        sa.Column("orden", sa.SmallInteger(), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_temas_guia")),
        sa.UniqueConstraint("slug", name=op.f("uq_temas_guia_slug")),
    )
    op.bulk_insert(temas, [{"nombre": n, "slug": s, "orden": o} for n, s, o in TEMAS])
    op.add_column("articulos", sa.Column("tema_id", sa.Integer(), nullable=True))
    op.create_index(op.f("ix_articulos_tema_id"), "articulos", ["tema_id"])
    op.create_foreign_key(
        op.f("fk_articulos_tema_id_temas_guia"), "articulos", "temas_guia", ["tema_id"], ["id"], ondelete="RESTRICT"
    )
    # Guías que ya existan sin tema: a «Otros».
    op.execute("UPDATE articulos SET tema_id = (SELECT id FROM temas_guia WHERE slug = 'otros') WHERE tipo = 'guia'")


def downgrade() -> None:
    op.drop_constraint(op.f("fk_articulos_tema_id_temas_guia"), "articulos", type_="foreignkey")
    op.drop_index(op.f("ix_articulos_tema_id"), table_name="articulos")
    op.drop_column("articulos", "tema_id")
    op.drop_table("temas_guia")
