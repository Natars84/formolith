#### Étape 1 : build des fichiers statiques
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

#### Étape 2 : servi par Nginx, avec le proxy /api configurable au démarrage
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

#### Adresse du backend, injectée dans nginx.conf.template au démarrage du conteneur.
#### "api" est le nom du service backend dans docker-compose.yml -> résolu par le
#### DNS interne de Docker, uniquement joignable depuis d'autres conteneurs.
ENV API_UPSTREAM=http://api:8000

EXPOSE 80
