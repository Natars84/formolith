import uuid

from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy.orm import Session

from app.database import check_db_connection, get_db
from app.models import Form
from app.schemas import FormCreate, FormRead

app = FastAPI(title="FormBuilder API", version="0.1.0")


#### Vérifie que l'API et la base de données sont opérationnelles
@app.get("/health")
def health_check():
    db_ok = check_db_connection()
    return {
        "status": "ok" if db_ok else "degraded",
        "database": "connected" if db_ok else "unreachable",
    }


#### Crée un formulaire vide (sans bloc) -> valide que la table forms fonctionne
@app.post("/forms", response_model=FormRead)
def create_form(payload: FormCreate, db: Session = Depends(get_db)):
    form = Form(title=payload.title)
    db.add(form)
    db.commit()
    db.refresh(form)
    return form


#### Relit un formulaire par son id -> valide que la lecture fonctionne aussi
@app.get("/forms/{form_id}", response_model=FormRead)
def read_form(form_id: uuid.UUID, db: Session = Depends(get_db)):
    form = db.get(Form, form_id)
    if form is None:
        raise HTTPException(status_code=404, detail="Formulaire introuvable")
    return form
