import uuid

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.block_types import BlockType, SubmissionValidationError, validate_block_config, validate_submission_data
from app.database import check_db_connection, get_db
from app.models import Block, Form, Submission
from app.schemas import (
    BlockCreate,
    BlockReorder,
    BlockRead,
    BlockUpdate,
    FormCreate,
    FormRead,
    FormUpdate,
    SubmissionCreate,
    SubmissionRead,
)

app = FastAPI(title="FormBuilder API", version="0.1.0")

#### Autorise le frontend (autre origine que l'API) à faire des appels depuis le navigateur
#### TODO : restreindre à l'origine réelle du frontend une fois déployé, plutôt que "*"
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


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


#### Liste tous les formulaires, les plus récents en premier
@app.get("/forms", response_model=list[FormRead])
def list_forms(db: Session = Depends(get_db)):
    return db.query(Form).order_by(Form.created_at.desc()).all()


#### Relit un formulaire par son id -> valide que la lecture fonctionne aussi
@app.get("/forms/{form_id}", response_model=FormRead)
def read_form(form_id: uuid.UUID, db: Session = Depends(get_db)):
    form = db.get(Form, form_id)
    if form is None:
        raise HTTPException(status_code=404, detail="Formulaire introuvable")
    return form


#### Modifie un formulaire existant (titre et/ou statut)
@app.patch("/forms/{form_id}", response_model=FormRead)
def update_form(form_id: uuid.UUID, payload: FormUpdate, db: Session = Depends(get_db)):
    form = get_form_or_404(form_id, db)

    if payload.title is not None:
        form.title = payload.title
    if payload.status is not None:
        form.status = payload.status

    db.commit()
    db.refresh(form)
    return form


#### Va chercher un formulaire en base ou lève une 404 -> évite de dupliquer ce contrôle dans chaque endpoint bloc
def get_form_or_404(form_id: uuid.UUID, db: Session) -> Form:
    form = db.get(Form, form_id)
    if form is None:
        raise HTTPException(status_code=404, detail="Formulaire introuvable")
    return form


#### Supprime un formulaire -> supprime aussi en cascade ses blocs et ses réponses (cascade définie sur le modèle)
@app.delete("/forms/{form_id}", status_code=204)
def delete_form(form_id: uuid.UUID, db: Session = Depends(get_db)):
    form = get_form_or_404(form_id, db)
    db.delete(form)
    db.commit()


#### Duplique un formulaire et ses blocs -> la copie repart en draft, les réponses ne sont jamais copiées
@app.post("/forms/{form_id}/duplicate", response_model=FormRead)
def duplicate_form(form_id: uuid.UUID, db: Session = Depends(get_db)):
    original = get_form_or_404(form_id, db)

    duplicate = Form(title=f"{original.title} (copie)", status="draft")
    db.add(duplicate)
    db.flush()  # attribue un id à duplicate sans encore valider la transaction, pour pouvoir l'utiliser ci-dessous

    original_blocks = db.query(Block).filter(Block.form_id == form_id).order_by(Block.position).all()
    for block in original_blocks:
        db.add(Block(
            form_id=duplicate.id,
            position=block.position,
            type=block.type,
            label=block.label,
            required=block.required,
            config=block.config,
        ))

    db.commit()
    db.refresh(duplicate)
    return duplicate


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
        width=payload.width,
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


#### Réorganise tous les blocs d'un formulaire selon l'ordre de la liste reçue (tout ou rien)
@app.patch("/forms/{form_id}/blocks/reorder", response_model=list[BlockRead])
def reorder_blocks(form_id: uuid.UUID, payload: BlockReorder, db: Session = Depends(get_db)):
    get_form_or_404(form_id, db)

    existing_blocks = db.query(Block).filter(Block.form_id == form_id).all()
    existing_ids = {block.id for block in existing_blocks}
    received_ids = payload.block_ids

    #### La liste reçue doit contenir exactement les mêmes blocs que ceux du formulaire, sans doublon
    if len(received_ids) != len(set(received_ids)):
        raise HTTPException(status_code=422, detail="La liste contient des doublons")
    if set(received_ids) != existing_ids:
        raise HTTPException(status_code=422, detail="La liste doit contenir exactement tous les blocs du formulaire")

    blocks_by_id = {block.id: block for block in existing_blocks}
    for index, block_id in enumerate(received_ids, start=1):
        blocks_by_id[block_id].position = index

    #### Un seul commit -> soit toutes les positions changent, soit aucune en cas d'erreur avant ce point
    db.commit()

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
    if payload.width is not None:
        block.width = payload.width
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


#### Enregistre une réponse -> chaque valeur est validée contre le bloc réel qu'elle prétend remplir
@app.post("/forms/{form_id}/submissions", response_model=SubmissionRead)
def create_submission(form_id: uuid.UUID, payload: SubmissionCreate, db: Session = Depends(get_db)):
    form = get_form_or_404(form_id, db)

    #### Seul un formulaire publié peut recevoir des réponses
    if form.status != "published":
        raise HTTPException(status_code=403, detail="Ce formulaire n'accepte pas de réponses pour le moment")

    blocks = db.query(Block).filter(Block.form_id == form_id).all()
    try:
        validated_data = validate_submission_data(blocks, payload.data)
    except SubmissionValidationError as exc:
        raise HTTPException(status_code=422, detail=exc.errors)

    submission = Submission(form_id=form_id, data=validated_data)
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return submission


#### Liste les réponses d'un formulaire, les plus récentes en premier
@app.get("/forms/{form_id}/submissions", response_model=list[SubmissionRead])
def list_submissions(form_id: uuid.UUID, db: Session = Depends(get_db)):
    get_form_or_404(form_id, db)
    return (
        db.query(Submission)
        .filter(Submission.form_id == form_id)
        .order_by(Submission.submitted_at.desc())
        .all()
    )


#### Va chercher une réponse précise, rattachée au bon formulaire, ou lève une 404
def get_submission_or_404(form_id: uuid.UUID, submission_id: uuid.UUID, db: Session) -> Submission:
    submission = (
        db.query(Submission)
        .filter(Submission.id == submission_id, Submission.form_id == form_id)
        .first()
    )
    if submission is None:
        raise HTTPException(status_code=404, detail="Réponse introuvable")
    return submission


#### Relit une réponse précise
@app.get("/forms/{form_id}/submissions/{submission_id}", response_model=SubmissionRead)
def read_submission(form_id: uuid.UUID, submission_id: uuid.UUID, db: Session = Depends(get_db)):
    return get_submission_or_404(form_id, submission_id, db)


#### Supprime une réponse (doublon, test, demande de suppression, ...)
@app.delete("/forms/{form_id}/submissions/{submission_id}", status_code=204)
def delete_submission(form_id: uuid.UUID, submission_id: uuid.UUID, db: Session = Depends(get_db)):
    submission = get_submission_or_404(form_id, submission_id, db)
    db.delete(submission)
    db.commit()
