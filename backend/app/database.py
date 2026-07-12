from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings

#### Engine et session SQLAlchemy, réutilisés dans toute l'application
engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


#### Classe de base pour tous les modèles (Form, Block, Submission, ...)
class Base(DeclarativeBase):
    pass


#### Vérifie que la connexion à Postgres est fonctionnelle
def check_db_connection() -> bool:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


#### Fournit une session DB à une requête FastAPI, puis la referme systématiquement
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
