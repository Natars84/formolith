# Formolith

Un outil self-hosted de création de formulaires par blocs : gestion des réponses, notifications en direct (mail, webhooks, MQTT), liens à expiration.

Statut : 🚧 en construction, bloc par bloc.

## Avancement

- **Bloc 1** — Squelette : API FastAPI minimale, endpoint `/health` vérifiant la connexion à Postgres, Alembic initialisé. ✅
- **Bloc 2** — Modèle de données : tables `forms`, `blocks`, `submissions` + migration Alembic + endpoints `POST /forms` et `GET /forms/{id}` de vérification. ✅
- **Bloc 3** — À venir.

## Modèle de données

Trois tables, sans versionning de formulaire (une modification après publication se fait par duplication, pas par version interne) :

- `forms` — identité du formulaire (titre, statut, dates)
- `blocks` — un élément de formulaire par ligne (position, type, label, obligatoire en colonnes classiques ; paramètres spécifiques au type en JSONB), rattaché à `forms`
- `submissions` — une réponse par ligne, rattachée directement à `forms`

## Démarrage

​```bash
cp .env.example .env
docker compose up --build -d
docker compose exec api alembic upgrade head
​```

Vérifier : [http://localhost:8000/health](http://localhost:8000/health)

Réponse attendue :
​```json
{"status": "ok", "database": "connected"}
​```

Créer un formulaire :
​```bash
curl -X POST http://localhost:8000/forms \
  -H "Content-Type: application/json" \
  -d '{"title":"Mon premier formulaire"}'
​```

## Stack

- **Backend** : FastAPI (Python)
- **Base de données** : PostgreSQL
- **Migrations** : Alembic
- **Frontend** : React + Vite *(à venir)*
- **Orchestration** : Docker Compose — ports exposés directement, aucun reverse proxy requis

## Philosophie

Ce projet est pensé pour tourner sur n'importe quelle machine avec juste Docker installé : pas de dépendance à un reverse proxy ou une infra spécifique.