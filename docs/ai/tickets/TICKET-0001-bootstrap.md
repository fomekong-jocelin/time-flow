# TICKET-0001 — Bootstrap TimeFlow

## 1. Objectif

Mettre en place un socle exécutable et gouverné pour commencer les développements TimeFlow conformément au cahier des charges et au kit IA.

## 2. Critères d'acceptation

- [x] Gouvernance IA adaptée au dépôt.
- [x] Architecture backend/frontend définie.
- [x] Backend Spring Boot Java 21 initialisé.
- [x] PostgreSQL/Flyway configurés.
- [x] Workflow de statut CRA modélisé et testé unitairement dans le code source.
- [x] Frontend Angular/Tailwind initialisé avec design tokens TimeFlow.
- [x] Premier écran `Mes temps` sans données fictives.
- [x] Docker Compose PostgreSQL disponible.
- [ ] Builds Maven/NPM exécutés sur une machine disposant des dépendances réseau.
- [ ] Validation humaine de la PR.

## 3. Contexte analysé

- [x] Expression de besoin TimeFlow.
- [x] Charte visuelle TimeFlow.
- [x] Kit IA générique v0.3.8 retrouvé et adapté.
- [x] Dépôt existant inspecté.
- [x] Kit Talend présent identifié comme hors périmètre.

## 4. Décisions

- Monorepo `backend/` + `frontend/`.
- Backend Java 21 / Spring Boot 3.x / Maven / PostgreSQL.
- Frontend Angular 22 standalone zoneless / Tailwind v4 / sans Angular Material.
- API `/api/v1`.
- Sécurité deny-by-default au bootstrap.
- Azure DevOps traité comme intégration serveur ; aucune clé côté navigateur.

## 5. Vérifications

- [x] Diff GitHub contrôlé : branche en avance sur `main`, sans divergence.
- [x] Les fichiers de gouvernance, backend, frontend et DB sont présents dans la branche.
- [ ] `mvn test` non exécuté depuis cet environnement : accès réseau aux dépendances indisponible.
- [ ] `npm install && npm run build` non exécuté depuis cet environnement : accès réseau aux dépendances indisponible.

## 6. Reste à faire

- Valider la PR bootstrap.
- Authentification et rôles : issue #1.
- Synchronisation Azure DevOps : issue #2.
- API feuille de temps : issue #3.
- Interface Mes temps : issue #4.
- Workflow manager : issue #5.

## 7. Statut

Status: REVIEW
