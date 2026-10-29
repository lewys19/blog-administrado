"""Usuarios, roles del panel con permisos y tokens de sesión.

Crea los cuatro roles iniciales: Administrador (todo), Editor, Redactor e Invitado.

Revision ID: 0001
Revises:
Create Date: 2026-10-29
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

ROLES = [
    # El Administrador tiene todos los permisos por código (app.core.permisos); su lista queda vacía.
    (1, "Administrador", "Todo el sitio, incluidos ingresos, roles y configuración.", []),
    (
        2,
        "Editor",
        "Publica y edita artículos de cualquier autor, modera comentarios.",
        ["articulos.escribir", "articulos.publicar", "articulos.editar_todos", "categorias.gestionar",
         "seo.gestionar", "comentarios.moderar", "usuarios.ver", "estadisticas.ver", "ia.usar"],
    ),
    (3, "Redactor", "Escribe sus artículos y los envía a revisión.", ["articulos.escribir", "ia.usar"]),
    (4, "Invitado", "Autor externo: escribe borradores.", ["articulos.escribir"]),
]  # fmt: skip


def upgrade() -> None:
    roles = op.create_table(
        "roles",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nombre", sa.String(40), nullable=False),
        sa.Column("descripcion", sa.String(200), nullable=True),
        sa.Column("permisos", postgresql.ARRAY(sa.String(40)), server_default="{}", nullable=False),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_roles")),
        sa.UniqueConstraint("nombre", name=op.f("uq_roles_nombre")),
    )
    op.bulk_insert(roles, [{"id": i, "nombre": n, "descripcion": d, "permisos": p} for i, n, d, p in ROLES])
    op.execute(f"SELECT setval('roles_id_seq', {len(ROLES)})")

    op.create_table(
        "usuarios",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(254), nullable=False),
        sa.Column("username", sa.String(30), nullable=False),
        sa.Column("nombre", sa.String(80), nullable=False),
        sa.Column("biografia", sa.Text(), nullable=True),
        sa.Column("avatar_clave", sa.String(200), nullable=True),
        sa.Column("hash_contrasena", sa.String(255), nullable=False),
        sa.Column("rol_id", sa.Integer(), nullable=True),
        sa.Column("bloqueado", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("acepto_terminos_en", sa.DateTime(timezone=True), nullable=False),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("actualizado_en", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("ultimo_ingreso_en", sa.DateTime(timezone=True), nullable=True),
        sa.Column("eliminado_en", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["rol_id"], ["roles.id"], name=op.f("fk_usuarios_rol_id_roles"), ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_usuarios")),
        sa.UniqueConstraint("email", name=op.f("uq_usuarios_email")),
        sa.UniqueConstraint("username", name=op.f("uq_usuarios_username")),
    )
    op.create_index(op.f("ix_usuarios_rol_id"), "usuarios", ["rol_id"])

    op.create_table(
        "tokens_refresco",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("usuario_id", sa.Integer(), nullable=False),
        sa.Column("huella", sa.String(64), nullable=False),
        sa.Column("expira_en", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revocado_en", sa.DateTime(timezone=True), nullable=True),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["usuario_id"], ["usuarios.id"], name=op.f("fk_tokens_refresco_usuario_id_usuarios"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_tokens_refresco")),
        sa.UniqueConstraint("huella", name=op.f("uq_tokens_refresco_huella")),
    )
    op.create_index(op.f("ix_tokens_refresco_usuario_id"), "tokens_refresco", ["usuario_id"])


def downgrade() -> None:
    op.drop_table("tokens_refresco")
    op.drop_table("usuarios")
    op.drop_table("roles")
