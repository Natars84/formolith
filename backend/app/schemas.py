import uuid
from datetime import datetime

from pydantic import BaseModel

from app.block_types import BlockType


#### Données attendues pour créer un formulaire
class FormCreate(BaseModel):
    title: str


#### Données renvoyées par l'API pour un formulaire
class FormRead(BaseModel):
    id: uuid.UUID
    title: str
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


#### Données attendues pour créer un bloc (position calculée automatiquement, pas fournie ici)
class BlockCreate(BaseModel):
    type: BlockType
    label: str
    required: bool = False
    config: dict = {}


#### Données attendues pour modifier un bloc existant (type non modifiable, tout le reste optionnel)
class BlockUpdate(BaseModel):
    label: str | None = None
    required: bool | None = None
    config: dict | None = None


#### Données attendues pour réorganiser les blocs -> ordre de la liste = nouvel ordre des positions
class BlockReorder(BaseModel):
    block_ids: list[uuid.UUID]


#### Données renvoyées par l'API pour un bloc
class BlockRead(BaseModel):
    id: uuid.UUID
    form_id: uuid.UUID
    position: int
    type: str
    label: str
    required: bool
    config: dict

    class Config:
        from_attributes = True


#### Données attendues pour enregistrer une réponse (clé = id du bloc, valeur = réponse donnée)
class SubmissionCreate(BaseModel):
    data: dict


#### Données renvoyées par l'API pour une réponse
class SubmissionRead(BaseModel):
    id: uuid.UUID
    form_id: uuid.UUID
    data: dict
    submitted_at: datetime

    class Config:
        from_attributes = True
