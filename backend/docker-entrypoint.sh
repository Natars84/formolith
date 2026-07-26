#!/bin/sh
set -e

#### Toujours à jour avant de démarrer, peu importe comment le conteneur a été lancé
alembic upgrade head

exec uvicorn app.main:app --host 0.0.0.0 --port 8000