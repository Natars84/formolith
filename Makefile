.PHONY: up down build logs test

#### Reconstruit ce qui a changé et démarre tout -> la commande à utiliser au quotidien
up:
	docker compose up --build -d

down:
	docker compose down

#### Reconstruit sans démarrer, utile pour juste vérifier que ça compile
build:
	docker compose build

logs:
	docker compose logs -f

#### Migration manuelle -> plus vraiment nécessaire (le conteneur la fait déjà tout seul
#### au démarrage), gardé comme filet de sécurité en cas de besoin ponctuel
migrate:
	docker compose exec api alembic upgrade head

test:
	python3 backend/tests/test_api.py
