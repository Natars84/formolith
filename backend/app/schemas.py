import uuid
from datetime import datetime

from pydantic import BaseModel


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
