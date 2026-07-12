"""creation tables metier (forms, blocks, submissions)

Revision ID: 1cff52677fb2
Revises:
Create Date: 2026-07-12

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "1cff52677fb2"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    #### Table forms : identité stable du formulaire
    op.create_table(
        "forms",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="draft"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    #### Table blocks : un élément de formulaire par ligne
    op.create_table(
        "blocks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("form_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("forms.id"), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("label", sa.String(), nullable=False),
        sa.Column("required", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("config", postgresql.JSONB(), nullable=False, server_default="{}"),
    )
    #### Index pour récupérer rapidement les blocs d'un formulaire, déjà triés
    op.create_index("ix_blocks_form_id_position", "blocks", ["form_id", "position"])

    #### Table submissions : une réponse par ligne, rattachée directement au formulaire
    op.create_table(
        "submissions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("form_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("forms.id"), nullable=False),
        sa.Column("data", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_submissions_form_id", "submissions", ["form_id"])


def downgrade() -> None:
    op.drop_index("ix_submissions_form_id", table_name="submissions")
    op.drop_table("submissions")
    op.drop_index("ix_blocks_form_id_position", table_name="blocks")
    op.drop_table("blocks")
    op.drop_table("forms")
