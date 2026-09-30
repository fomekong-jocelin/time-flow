# TimeFlow by INDYLI

Application de gestion des feuilles de temps, CRA et pilotage des prestations pour ESN, équipes de développement, consultants et organismes de formation.

## Vision

TimeFlow centralise la saisie et la validation des temps, tout en utilisant Azure DevOps comme source de référence des projets. Le produit distingue les temps facturables, non facturables et internes et prépare le pilotage de la charge, du consommé et de la rentabilité.

## Stack V1

- Backend : Java 21, Spring Boot 3.x, Maven, PostgreSQL, Flyway.
- Frontend : Angular 22, standalone + zoneless, Tailwind CSS v4, sans Angular Material.
- API : REST JSON versionnée sous `/api/v1`.
- Intégration : Azure DevOps REST API, secrets côté serveur uniquement.
- Architecture : DDD pragmatique + SOLID ; backend maître des règles métier.

## Monorepo

```text
backend/               API Spring Boot
frontend/              SPA Angular

docs/ai/               mémoire projet et gouvernance IA
docs/architecture/     ADR et décisions d'architecture
docs/product/          cadrage produit synthétique
```

## Démarrage local

### Base de données

```bash
docker compose up -d postgres
```

### Backend

```bash
cd backend
mvn spring-boot:run
```

### Frontend

```bash
cd frontend
npm install
npm start
```

## Gouvernance IA

Avant toute modification, lire `AGENTS.md`, `SKILL.md` et `docs/ai/`. Chaque changement doit être rattaché à un ticket dans `docs/ai/tickets/`, testé, documenté et soumis par Pull Request.

## Références produit

- `Expression_Besoin_Feuille_Temps_Azure_DevOps_INDYLIServices.docx`
- `Charte_Identite_Visuelle_Gestion_Temps_INDYLI_v0.1.pdf`
