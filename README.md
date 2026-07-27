# Formolith

Un outil self-hosted de création de formulaires par blocs : gestion des réponses, notifications en direct (mail, webhooks, MQTT), liens à expiration.

**Version : 0.3.0** — développement actif. Tant que la version reste en `0.x`, l'API et le modèle de données peuvent encore changer sans garantie de compatibilité ([SemVer](https://semver.org/lang/fr/)).

## Fonctionnalités

### Formulaires
- Créer, lister, renommer, supprimer
- Statuts : brouillon / publié / archivé — un formulaire non publié refuse toute réponse
- Dupliquer (la copie repart toujours en brouillon) — modifier un formulaire déjà publié se fait par duplication, pas de version interne
- Lien public de partage, distinct de l'id de gestion et régénérable à tout moment (invalide l'ancien lien immédiatement)

### Blocs (10 types)
- **Champs de formulaire** : texte, nombre (avec curseur optionnel), date/heure (date, heure, ou les deux), case à cocher, choix dans une liste (déroulante ou côte à côte, simple ou multiple)
- **Contenu** : titre (H1 à H6, alignement réglable), paragraphe (alignement réglable), texte enrichi Markdown (avec barre d'outils, alignement réglable), espaceur, ligne séparatrice
- Réorganisables, largeur réglable (pleine largeur / moitié / tiers), validation stricte selon le type

### Réponses
- Chaque valeur est validée contre le bloc réel qu'elle remplit (type, contraintes, champs obligatoires)
- Recevables via l'API de gestion ou via le lien public, mêmes règles de validation dans les deux cas

### Interface web
- Liste des formulaires (cartes ou tableau)
- Page de gestion par formulaire (réponses, publier, dupliquer, supprimer, lien public)
- Builder par blocs : panneau de réglages contextuel, essai des champs en direct, auto-enregistrement
- Aperçu du formulaire (avec validation des champs obligatoires), sans jamais rien envoyer à l'API
- Formulaire public réel, à l'adresse `/f/{token}` : ce que voit et remplit un répondant

## Démarrage

```bash
cp .env.example .env
make up
```

API sur [http://localhost:8000](http://localhost:8000), interface sur [http://localhost:8080](http://localhost:8080).

Pas de `make` sous la main ? `docker compose up --build -d` fonctionne aussi — la migration de base de données s'applique automatiquement au démarrage du conteneur, dans les deux cas.

Lancer les tests d'intégration :
```bash
make test
```

## Modèle de données

Trois tables, sans versionning de formulaire :

- `forms` — identité du formulaire (titre, statut, dates)
- `blocks` — un élément de formulaire par ligne (position, type, label, obligatoire, largeur en colonnes classiques ; paramètres spécifiques au type en JSONB), rattaché à `forms`
- `submissions` — une réponse par ligne, rattachée directement à `forms`

## Stack

- **Backend** : FastAPI (Python), PostgreSQL, Alembic
- **Frontend** : React + Vite, lucide-react (icônes), marked + DOMPurify (rendu Markdown assaini)
- **Orchestration** : Docker Compose (ports exposés directement, aucun reverse proxy requis), Makefile pour les commandes courantes

## À venir

- Pièces jointes et images (nécessite une brique de stockage de fichiers)
- Comptes utilisateurs et droits granulaires
- Export des réponses (CSV/JSON), webhooks, notifications par mail
- Date d'expiration sur les liens publics
