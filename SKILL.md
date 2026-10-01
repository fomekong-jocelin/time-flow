---
name: timeflow-production-ready-engineering
description: Gouvernance d'ingénierie IA pour TimeFlow, applicable à Spring Boot, Angular, PostgreSQL, Azure DevOps, sécurité, tests et documentation.
---

# TimeFlow — Production-Ready AI Engineering Governance

## 0. Source de vérité

La mémoire projet partagée est dans `docs/ai/`. Aucun agent ne doit inventer un contexte caché.

## 1. Definition of Ready

Un ticket est prêt seulement si :

- le besoin métier et les critères d'acceptation sont compris ;
- les modules impactés sont identifiés ;
- l'impact API/data/UI/sécurité est analysé ;
- les dépendances sont connues ;
- la stratégie de test est définie ;
- le fichier `docs/ai/tickets/TICKET-*.md` existe.

## 2. Definition of Done

Une tâche est terminée seulement si :

- l'implémentation est complète ;
- les tests nécessaires existent et passent ;
- les commandes build/lint/test sont connues ;
- la sécurité et les risques de régression ont été contrôlés ;
- `PROJECT-TRACKING.md` est mis à jour ;
- `CHANGELOG.md` est mis à jour si nécessaire ;
- les travaux restants et risques sont explicites ;
- le changement est proposé par Pull Request.

## 3. Architecture

### Backend

- Java 21 + Spring Boot 3.x + Maven.
- `application.yml` uniquement.
- DDD pragmatique : `domain`, `application`, `infrastructure`, `interfaces` lorsque la complexité le justifie.
- Controllers minces, DTO séparés, validation Jakarta.
- Transactions et règles métier dans les services/use cases, jamais dans le controller.
- PostgreSQL + migrations Flyway versionnées.
- API versionnée `/api/v1`.

### Frontend

- Angular 22 standalone + zoneless.
- Tailwind CSS v4, sans Angular Material.
- Mobile-first, thèmes clair/sombre, i18n FR/EN préparée.
- Structure : `core`, `shared`, `features`.
- Pas de règle métier critique dans les composants ; les calculs métier restent côté backend.

### Intégration Azure DevOps

- Azure DevOps est une source de données, pas la marque du produit.
- Les secrets et PAT restent côté serveur.
- Conserver l'identifiant externe Azure DevOps pour l'idempotence.
- Ne jamais supprimer l'historique TimeFlow lorsqu'un projet est archivé côté Azure DevOps.
- Les synchronisations sont auditées.

## 4. Anti-régression

Avant modification, inspecter les contrats API, données, tests, flux UI, sécurité, erreurs, logs, configuration et intégrations concernées.

Interdictions :

- supprimer des tests pour faire passer un build ;
- affaiblir validation ou autorisation ;
- modifier silencieusement un contrat public ;
- hardcoder des secrets ou valeurs d'environnement ;
- dupliquer une règle métier ;
- contourner l'architecture ou la gouvernance du ticket.

## 5. Références

12-Factor App, OWASP Top 10, OWASP API Security Top 10, Spring Boot, Angular, PostgreSQL, Azure DevOps REST API, Conventional Commits, Keep a Changelog et Semantic Versioning.
