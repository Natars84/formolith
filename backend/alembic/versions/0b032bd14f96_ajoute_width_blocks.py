"""ajoute la largeur d'affichage des blocs (width)

Revision ID: 0b032bd14f96
Revises: 1cff52677fb2
Create Date: 2026-07-26

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0b032bd14f96"
down_revision = "1cff52677fb2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "blocks",
        sa.Column("width", sa.String(), nullable=False, server_default="full"),
    )


def downgrade() -> None:
    op.drop_column("blocks", "width")
