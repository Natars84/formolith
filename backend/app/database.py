from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.config import settings

#### Engine et session SQLAlchemy, réutilisés dans toute l'application
engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


#### Vérifie que la connexion à Postgres est fonctionnelle
def check_db_connection() -> bool:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
