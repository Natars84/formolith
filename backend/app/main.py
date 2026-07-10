from fastapi import FastAPI

from app.database import check_db_connection

app = FastAPI(title="FormBuilder API", version="0.1.0")


#### Vérifie que l'API et la base de données sont opérationnelles
@app.get("/health")
def health_check():
    db_ok = check_db_connection()
    return {
        "status": "ok" if db_ok else "degraded",
        "database": "connected" if db_ok else "unreachable",
    }
