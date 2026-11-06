"""Academia: solicitudes de cursos de pago con código y aprobación en el panel.

Revision ID: 0015
Revises: 0014
Create Date: 2026-11-06
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0015"
down_revision: str | None = "0014"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "academia_solicitudes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("curso_id", sa.Integer(), nullable=True),
        sa.Column("curso_titulo", sa.String(length=120), nullable=False),
        sa.Column("codigo", sa.String(length=20), nullable=False),
        sa.Column("nombre", sa.String(length=80), nullable=False),
        sa.Column("whatsapp", sa.String(length=20), nullable=False),
        sa.Column(
            "estado",
            sa.Enum("pendiente", "aprobada", "rechazada", name="estado_solicitud"),
            server_default="pendiente",
            nullable=False,
        ),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("revisado_en", sa.DateTime(timezone=True), nullable=True),
        sa.Column("entregado_en", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["curso_id"], ["cursos.id"], name=op.f("fk_academia_solicitudes_curso_id_cursos"), ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_academia_solicitudes")),
        sa.UniqueConstraint("codigo", name=op.f("uq_academia_solicitudes_codigo")),
    )
    op.create_index(op.f("ix_academia_solicitudes_estado"), "academia_solicitudes", ["estado"])


def downgrade() -> None:
    op.drop_index(op.f("ix_academia_solicitudes_estado"), table_name="academia_solicitudes")
    op.drop_table("academia_solicitudes")
    sa.Enum(name="estado_solicitud").drop(op.get_bind())
