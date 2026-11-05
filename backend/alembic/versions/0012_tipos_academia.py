"""Academia: además de cursos, manuales, separatas y sistemas (con tecnologías y cómo instalar).

Revision ID: 0012
Revises: 0011
Create Date: 2026-11-04
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0012"
down_revision: str | None = "0011"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

SISTEMAS = {"Linux": "POS", "Docker": "CRM", "Git": "Automatización"}


def upgrade() -> None:
    tipo = sa.Enum("curso", "manual", "separata", "sistema", name="tipo_recurso")
    tipo.create(op.get_bind())
    op.add_column("cursos", sa.Column("tipo", tipo, server_default="curso", nullable=False))
    op.add_column("cursos", sa.Column("tecnologias", sa.String(length=300), server_default="", nullable=False))
    op.add_column("cursos", sa.Column("instalacion", sa.Text(), server_default="", nullable=False))
    op.create_index(op.f("ix_cursos_tipo"), "cursos", ["tipo"])
    # «Sistemas» son los proyectos propios, no herramientas: cambian las etiquetas de ese grupo.
    for antes, ahora in SISTEMAS.items():
        op.execute(
            sa.text("UPDATE academia_etiquetas SET nombre = :ahora WHERE grupo = 'sistemas' AND nombre = :antes").bindparams(
                antes=antes, ahora=ahora
            )
        )


def downgrade() -> None:
    for antes, ahora in SISTEMAS.items():
        op.execute(
            sa.text("UPDATE academia_etiquetas SET nombre = :antes WHERE grupo = 'sistemas' AND nombre = :ahora").bindparams(
                antes=antes, ahora=ahora
            )
        )
    op.drop_index(op.f("ix_cursos_tipo"), table_name="cursos")
    op.drop_column("cursos", "instalacion")
    op.drop_column("cursos", "tecnologias")
    op.drop_column("cursos", "tipo")
    sa.Enum(name="tipo_recurso").drop(op.get_bind())
