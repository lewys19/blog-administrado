"""Boletín: suscriptores y envíos.

Revision ID: 0005
Revises: 0004
Create Date: 2026-10-30
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0005"
down_revision: str | None = "0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table('suscriptores',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('correo', sa.String(length=254), nullable=False),
    sa.Column('estado', sa.String(length=10), nullable=False),
    sa.Column('token', sa.String(length=40), nullable=False),
    sa.Column('creado_en', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('confirmado_en', sa.DateTime(timezone=True), nullable=True),
    sa.Column('baja_en', sa.DateTime(timezone=True), nullable=True),
    sa.Column('aviso_enviado_en', sa.DateTime(timezone=True), nullable=True),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_suscriptores')),
    sa.UniqueConstraint('correo', name=op.f('uq_suscriptores_correo')),
    sa.UniqueConstraint('token', name=op.f('uq_suscriptores_token'))
    )
    op.create_index(op.f('ix_suscriptores_estado'), 'suscriptores', ['estado'], unique=False)
    op.create_table('envios',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('articulo_id', sa.Integer(), nullable=True),
    sa.Column('autor_id', sa.Integer(), nullable=True),
    sa.Column('asunto', sa.String(length=200), nullable=False),
    sa.Column('estado', sa.String(length=10), nullable=False),
    sa.Column('total', sa.Integer(), nullable=False),
    sa.Column('enviados', sa.Integer(), nullable=False),
    sa.Column('fallidos', sa.Integer(), nullable=False),
    sa.Column('creado_en', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('terminado_en', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['articulo_id'], ['articulos.id'], name=op.f('fk_envios_articulo_id_articulos'), ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['autor_id'], ['usuarios.id'], name=op.f('fk_envios_autor_id_usuarios'), ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_envios'))
    )
    op.create_index(op.f('ix_envios_articulo_id'), 'envios', ['articulo_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_envios_articulo_id'), table_name='envios')
    op.drop_table('envios')
    op.drop_index(op.f('ix_suscriptores_estado'), table_name='suscriptores')
    op.drop_table('suscriptores')
