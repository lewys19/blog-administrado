"""Academia: etiquetas de la columna derecha (por grupo) y anuncios.

Revision ID: 0011
Revises: 0010
Create Date: 2026-11-04
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0011"
down_revision: str | None = "0010"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

ETIQUETAS = {
    "cursos": ["Python", "Java", "React"],
    "manuales": ["Angular", "SQL", "MongoDB"],
    "sistemas": ["Linux", "Docker", "Git"],
}


def upgrade() -> None:
    etiquetas = op.create_table(
        "academia_etiquetas",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nombre", sa.String(length=40), nullable=False),
        sa.Column("grupo", sa.Enum("cursos", "manuales", "sistemas", name="grupo_etiqueta"), nullable=False),
        sa.Column("orden", sa.SmallInteger(), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_academia_etiquetas")),
        sa.UniqueConstraint("grupo", "nombre", name=op.f("uq_academia_etiquetas_grupo")),
    )
    op.bulk_insert(
        etiquetas,
        [{"nombre": n, "grupo": g, "orden": i} for g, nombres in ETIQUETAS.items() for i, n in enumerate(nombres, 1)],
    )
    op.create_table(
        "academia_anuncios",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("titulo", sa.String(length=80), nullable=False),
        sa.Column("enlace", sa.String(length=500), nullable=False),
        sa.Column("imagen_clave", sa.String(length=200), nullable=True),
        sa.Column("activo", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_academia_anuncios")),
    )


def downgrade() -> None:
    op.drop_table("academia_anuncios")
    op.drop_table("academia_etiquetas")
    sa.Enum(name="grupo_etiqueta").drop(op.get_bind())
