import uuid

from fastapi import Depends, FastAPI, HTTPException
from pydantic import ValidationError
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.block_types import BlockType, validate_block_config
from app.database import check_db_connection, get_db
from app.models import Block, Form
from app.schemas import BlockCreate, BlockRead, BlockUpdate, FormCreate, FormRead

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


#### Va chercher un formulaire en base ou lève une 404 -> évite de dupliquer ce contrôle dans chaque endpoint bloc
def get_form_or_404(form_id: uuid.UUID, db: Session) -> Form:
    form = db.get(Form, form_id)
    if form is None:
        raise HTTPException(status_code=404, detail="Formulaire introuvable")
    return form


#### Ajoute un bloc à un formulaire, en fin de liste (position calculée automatiquement)
@app.post("/forms/{form_id}/blocks", response_model=BlockRead)
def create_block(form_id: uuid.UUID, payload: BlockCreate, db: Session = Depends(get_db)):
    get_form_or_404(form_id, db)

    try:
        validated_config = validate_block_config(payload.type, payload.config)
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=exc.errors())

    #### Dernière position existante + 1, ou 1 si le formulaire n'a encore aucun bloc
    last_position = db.query(func.max(Block.position)).filter(Block.form_id == form_id).scalar()
    next_position = (last_position or 0) + 1

    block = Block(
        form_id=form_id,
        position=next_position,
        type=payload.type.value,
        label=payload.label,
        required=payload.required,
        config=validated_config,
    )
    db.add(block)
    db.commit()
    db.refresh(block)
    return block


#### Liste les blocs d'un formulaire, triés par position
@app.get("/forms/{form_id}/blocks", response_model=list[BlockRead])
def list_blocks(form_id: uuid.UUID, db: Session = Depends(get_db)):
    get_form_or_404(form_id, db)
    return db.query(Block).filter(Block.form_id == form_id).order_by(Block.position).all()


#### Va chercher un bloc précis, rattaché au bon formulaire, ou lève une 404
def get_block_or_404(form_id: uuid.UUID, block_id: uuid.UUID, db: Session) -> Block:
    block = db.query(Block).filter(Block.id == block_id, Block.form_id == form_id).first()
    if block is None:
        raise HTTPException(status_code=404, detail="Bloc introuvable")
    return block


#### Modifie un bloc existant (label, required, config) -> le type n'est jamais modifiable ici
@app.patch("/forms/{form_id}/blocks/{block_id}", response_model=BlockRead)
def update_block(form_id: uuid.UUID, block_id: uuid.UUID, payload: BlockUpdate, db: Session = Depends(get_db)):
    block = get_block_or_404(form_id, block_id, db)

    if payload.label is not None:
        block.label = payload.label
    if payload.required is not None:
        block.required = payload.required
    if payload.config is not None:
        try:
            block.config = validate_block_config(BlockType(block.type), payload.config)
        except ValidationError as exc:
            raise HTTPException(status_code=422, detail=exc.errors())

    db.commit()
    db.refresh(block)
    return block


#### Supprime un bloc
@app.delete("/forms/{form_id}/blocks/{block_id}", status_code=204)
def delete_block(form_id: uuid.UUID, block_id: uuid.UUID, db: Session = Depends(get_db)):
    block = get_block_or_404(form_id, block_id, db)
    db.delete(block)
    db.commit()
