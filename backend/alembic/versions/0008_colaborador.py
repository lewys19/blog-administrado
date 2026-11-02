"""Rol Colaborador (quien se registra): escribe y publica sus guías.

Revision ID: 0008
Revises: 0007
Create Date: 2026-11-02
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0008"
down_revision: str | None = "0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        "INSERT INTO roles (nombre, descripcion, permisos) "
        "SELECT 'Colaborador', 'Usuario registrado: escribe y publica sus guías.', ARRAY['guias.escribir'] "
        "WHERE NOT EXISTS (SELECT 1 FROM roles WHERE nombre = 'Colaborador')"
    )
    # Editor y Redactor también publican guías al instante.
    op.execute(
        "UPDATE roles SET permisos = array_append(permisos, 'guias.escribir') "
        "WHERE nombre IN ('Editor', 'Redactor') AND NOT ('guias.escribir' = ANY(permisos))"
    )
    # Las cuentas ya registradas sin rol (lectores) pasan a Colaborador; no las eliminadas ni bloqueadas.
    op.execute(
        "UPDATE usuarios SET rol_id = (SELECT id FROM roles WHERE nombre = 'Colaborador') "
        "WHERE rol_id IS NULL AND eliminado_en IS NULL AND NOT bloqueado"
    )


def downgrade() -> None:
    op.execute("UPDATE usuarios SET rol_id = NULL WHERE rol_id = (SELECT id FROM roles WHERE nombre = 'Colaborador')")
    op.execute("UPDATE roles SET permisos = array_remove(permisos, 'guias.escribir')")
    op.execute("DELETE FROM roles WHERE nombre = 'Colaborador'")
