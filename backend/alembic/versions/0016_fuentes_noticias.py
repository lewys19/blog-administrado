"""Fuentes externas por RSS y bandeja de noticias.

Revision ID: 0016
Revises: 0015
Create Date: 2026-11-06
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0016"
down_revision: str | None = "0015"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

FUENTES = [
    ("Xataka", "https://www.xataka.com/feedburner.xml"),
    ("Genbeta", "https://www.genbeta.com/feedburner.xml"),
    ("The Verge", "https://www.theverge.com/rss/index.xml"),
    ("TechCrunch", "https://techcrunch.com/feed/"),
    ("OpenAI", "https://openai.com/news/rss.xml"),
    ("Google AI", "https://blog.google/technology/ai/rss/"),
    ("Dev.to", "https://dev.to/feed"),
    ("Hacker News", "https://hnrss.org/frontpage"),
    ("Towards Data Science", "https://towardsdatascience.com/feed"),
    ("KDnuggets", "https://www.kdnuggets.com/feed"),
    ("Kaggle", "https://medium.com/feed/kaggle-blog"),
]


def upgrade() -> None:
    fuentes = op.create_table(
        "fuentes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nombre", sa.String(length=80), nullable=False),
        sa.Column("url", sa.String(length=500), nullable=False),
        sa.Column("categoria_id", sa.Integer(), nullable=True),
        sa.Column("activa", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("leida_en", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ultimo_error", sa.String(length=300), nullable=True),
        sa.ForeignKeyConstraint(
            ["categoria_id"], ["categorias.id"], name=op.f("fk_fuentes_categoria_id_categorias"), ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_fuentes")),
        sa.UniqueConstraint("url", name=op.f("uq_fuentes_url")),
    )
    op.create_table(
        "noticias_fuente",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("fuente_id", sa.Integer(), nullable=False),
        sa.Column("titulo", sa.String(length=300), nullable=False),
        sa.Column("enlace", sa.String(length=700), nullable=False),
        sa.Column("extracto", sa.Text(), server_default="", nullable=False),
        sa.Column("publicado_en", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "estado",
            sa.Enum("nueva", "usada", "descartada", name="estado_noticia"),
            server_default="nueva",
            nullable=False,
        ),
        sa.Column("articulo_id", sa.Integer(), nullable=True),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(
            ["articulo_id"], ["articulos.id"], name=op.f("fk_noticias_fuente_articulo_id_articulos"), ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["fuente_id"], ["fuentes.id"], name=op.f("fk_noticias_fuente_fuente_id_fuentes"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_noticias_fuente")),
        sa.UniqueConstraint("enlace", name=op.f("uq_noticias_fuente_enlace")),
    )
    op.create_index(op.f("ix_noticias_fuente_estado"), "noticias_fuente", ["estado"])
    op.create_index(op.f("ix_noticias_fuente_fuente_id"), "noticias_fuente", ["fuente_id"])
    op.bulk_insert(fuentes, [{"nombre": n, "url": u} for n, u in FUENTES])


def downgrade() -> None:
    op.drop_table("noticias_fuente")
    op.drop_table("fuentes")
    sa.Enum(name="estado_noticia").drop(op.get_bind())
