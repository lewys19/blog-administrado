"""Comentarios de los lectores, con moderación.

Revision ID: 0004
Revises: 0003
Create Date: 2026-10-30
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table('comentarios',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('articulo_id', sa.Integer(), nullable=False),
    sa.Column('nombre', sa.String(length=60), nullable=False),
    sa.Column('correo', sa.String(length=254), nullable=False),
    sa.Column('contenido', sa.Text(), nullable=False),
    sa.Column('estado', sa.String(length=10), nullable=False),
    sa.Column('huella', sa.String(length=16), nullable=False),
    sa.Column('creado_en', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('moderado_en', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['articulo_id'], ['articulos.id'], name=op.f('fk_comentarios_articulo_id_articulos'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_comentarios'))
    )
    op.create_index('ix_comentarios_articulo_estado', 'comentarios', ['articulo_id', 'estado'], unique=False)
    op.create_index(op.f('ix_comentarios_correo'), 'comentarios', ['correo'], unique=False)
    op.create_index(op.f('ix_comentarios_creado_en'), 'comentarios', ['creado_en'], unique=False)
    op.create_index(op.f('ix_comentarios_estado'), 'comentarios', ['estado'], unique=False)
    op.create_index(op.f('ix_comentarios_huella'), 'comentarios', ['huella'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_comentarios_huella'), table_name='comentarios')
    op.drop_index(op.f('ix_comentarios_estado'), table_name='comentarios')
    op.drop_index(op.f('ix_comentarios_creado_en'), table_name='comentarios')
    op.drop_index(op.f('ix_comentarios_correo'), table_name='comentarios')
    op.drop_index('ix_comentarios_articulo_estado', table_name='comentarios')
    op.drop_table('comentarios')
