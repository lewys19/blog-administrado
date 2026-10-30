"""Visitas del blog para la analítica (sin IP ni cookies).

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-29
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table('visitas',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('creado_en', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('ruta', sa.String(length=300), nullable=False),
    sa.Column('articulo_id', sa.Integer(), nullable=True),
    sa.Column('visitante', sa.String(length=16), nullable=False),
    sa.Column('pais', sa.String(length=2), nullable=True),
    sa.Column('origen', sa.String(length=12), nullable=False),
    sa.Column('referente', sa.String(length=120), nullable=True),
    sa.Column('dispositivo', sa.String(length=10), nullable=False),
    sa.Column('segundos', sa.Integer(), server_default='0', nullable=False),
    sa.Column('profundidad', sa.SmallInteger(), server_default='0', nullable=False),
    sa.ForeignKeyConstraint(['articulo_id'], ['articulos.id'], name=op.f('fk_visitas_articulo_id_articulos'), ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_visitas'))
    )
    op.create_index('ix_visitas_articulo_fecha', 'visitas', ['articulo_id', 'creado_en'], unique=False)
    op.create_index(op.f('ix_visitas_creado_en'), 'visitas', ['creado_en'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_visitas_creado_en'), table_name='visitas')
    op.drop_index('ix_visitas_articulo_fecha', table_name='visitas')
    op.drop_table('visitas')
