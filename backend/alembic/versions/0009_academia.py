"""Academia Digital: categorías propias y cursos.

Revision ID: 0009
Revises: 0008
Create Date: 2026-11-04
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0009"
down_revision: str | None = "0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

CATEGORIAS = [
    ("Inteligencia Artificial", "inteligencia-artificial"),
    ("Programación", "programacion"),
    ("Backend", "backend"),
    ("QA Testing", "qa-testing"),
    ("DevOps", "devops"),
    ("Linux", "linux"),
    ("Ciberseguridad", "ciberseguridad"),
    ("Matemáticas", "matematicas"),
]


def upgrade() -> None:
    categorias = op.create_table(
        "academia_categorias",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nombre", sa.String(length=60), nullable=False),
        sa.Column("slug", sa.String(length=70), nullable=False),
        sa.Column("descripcion", sa.String(length=300), nullable=True),
        sa.Column("orden", sa.SmallInteger(), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_academia_categorias")),
        sa.UniqueConstraint("nombre", name=op.f("uq_academia_categorias_nombre")),
        sa.UniqueConstraint("slug", name=op.f("uq_academia_categorias_slug")),
    )
    op.bulk_insert(categorias, [{"nombre": n, "slug": s, "orden": i} for i, (n, s) in enumerate(CATEGORIAS, 1)])
    op.create_table(
        "cursos",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("categoria_id", sa.Integer(), nullable=False),
        sa.Column("titulo", sa.String(length=120), nullable=False),
        sa.Column("slug", sa.String(length=130), nullable=False),
        sa.Column("descripcion", sa.Text(), nullable=False),
        sa.Column("temario", sa.Text(), nullable=False),
        sa.Column("nivel", sa.Enum("principiante", "intermedio", "avanzado", name="nivel_curso"), nullable=False),
        sa.Column("horas", sa.SmallInteger(), nullable=True),
        sa.Column("precio_anterior", sa.Numeric(8, 2), nullable=True),
        sa.Column("precio", sa.Numeric(8, 2), nullable=False),
        sa.Column("portada_clave", sa.String(length=200), nullable=True),
        sa.Column("destacado", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("publicado", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("actualizado_en", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(
            ["categoria_id"],
            ["academia_categorias.id"],
            name=op.f("fk_cursos_categoria_id_academia_categorias"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_cursos")),
        sa.UniqueConstraint("slug", name=op.f("uq_cursos_slug")),
    )
    op.create_index(op.f("ix_cursos_categoria_id"), "cursos", ["categoria_id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_cursos_categoria_id"), table_name="cursos")
    op.drop_table("cursos")
    op.drop_table("academia_categorias")
    sa.Enum(name="nivel_curso").drop(op.get_bind())
