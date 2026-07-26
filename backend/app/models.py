import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


#### Un formulaire : identité stable (titre, statut), indépendante de son contenu
class Form(Base):
    __tablename__ = "forms"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, default="draft")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    blocks: Mapped[list["Block"]] = relationship(back_populates="form", cascade="all, delete-orphan")
    submissions: Mapped[list["Submission"]] = relationship(back_populates="form", cascade="all, delete-orphan")


#### Un élément du formulaire (champ texte, curseur, choix unique, ...)
class Block(Base):
    __tablename__ = "blocks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    form_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("forms.id"), nullable=False)

    #### Attributs communs à tous les types de blocs -> colonnes classiques
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    type: Mapped[str] = mapped_column(String, nullable=False)
    label: Mapped[str] = mapped_column(String, nullable=False)
    required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    #### Largeur d'affichage : "full" / "half" / "third" -> permet de placer des blocs côte à côte
    width: Mapped[str] = mapped_column(String, nullable=False, default="full")

    #### Paramètres spécifiques au type (min/max d'un slider, options d'un select, ...)
    config: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    form: Mapped["Form"] = relationship(back_populates="blocks")


#### Une réponse envoyée par un répondant, rattachée directement au formulaire
class Submission(Base):
    __tablename__ = "submissions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    form_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("forms.id"), nullable=False)

    #### Clé = id du bloc, valeur = réponse donnée par le répondant
    data: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    form: Mapped["Form"] = relationship(back_populates="submissions")
