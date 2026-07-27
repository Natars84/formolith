"""ajoute le token de lien public sur forms

Revision ID: 5ccbcee0462f
Revises: 0b032bd14f96
Create Date: 2026-07-27

"""
import secrets

from alembic import op
import sqlalchemy as sa

revision = "5ccbcee0462f"
down_revision = "0b032bd14f96"
branch_labels = None
depends_on = None


def upgrade() -> None:
    #### Colonne d'abord nullable -> le temps de générer un token pour les lignes déjà existantes
    op.add_column("forms", sa.Column("public_token", sa.String(), nullable=True))

    connection = op.get_bind()
    existing_ids = connection.execute(sa.text("SELECT id FROM forms")).fetchall()
    for (form_id,) in existing_ids:
        connection.execute(
            sa.text("UPDATE forms SET public_token = :token WHERE id = :id"),
            {"token": secrets.token_urlsafe(16), "id": form_id},
        )

    op.alter_column("forms", "public_token", nullable=False)
    op.create_unique_constraint("uq_forms_public_token", "forms", ["public_token"])


def downgrade() -> None:
    op.drop_constraint("uq_forms_public_token", "forms", type_="unique")
    op.drop_column("forms", "public_token")
