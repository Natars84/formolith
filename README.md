# FormBuilder

Un outil self-hosted de création de formulaires par blocs : gestion des réponses, notifications en direct (mail, webhooks, MQTT), liens à expiration.

Statut : 🚧 en construction, bloc par bloc.

## Bloc 1 — Squelette (actuel)

- API FastAPI minimale avec un endpoint `/health` qui vérifie la connexion à Postgres.
- Aucune logique métier pour l'instant : c'est juste la base technique.

## Démarrage

​```bash
cp .env.example .env
docker compose up --build
​```

Puis vérifier : [http://localhost:8000/health](http://localhost:8000/health)

Réponse attendue :
​```json
{"status": "ok", "database": "connected"}
​```

## Stack

- **Backend** : FastAPI (Python)
- **Base de données** : PostgreSQL
- **Migrations** : Alembic
- **Frontend** : React + Vite *(à venir)*
- **Orchestration** : Docker Compose — ports exposés directement, aucun reverse proxy requis

## Philosophie

Ce projet est pensé pour tourner sur n'importe quelle machine avec juste Docker installé : pas de dépendance à un reverse proxy ou une infra spécifique.