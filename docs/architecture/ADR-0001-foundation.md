# ADR-0001 — Fondation technique TimeFlow

Date : 2026-09-30
Statut : Accepted

## Contexte

TimeFlow doit servir une ESN réalisant développement, support et formations, avec Azure DevOps comme référentiel de projets.

## Décision

Adopter un monorepo avec Spring Boot côté serveur et Angular côté client. Le backend porte les règles métier et l'intégration Azure DevOps. PostgreSQL assure la persistance ; Flyway versionne le schéma.

La sécurité démarre en deny-by-default. L'authentification métier sera ajoutée dans un ticket dédié afin de ne pas introduire un faux mécanisme définitif.

## Conséquences

- Les projets Azure DevOps sont synchronisés et stockés localement pour la résilience.
- Le frontend ne reçoit jamais de secret Azure DevOps.
- Les règles de workflow CRA restent testables indépendamment de l'UI.
- Les évolutions sont versionnées par migrations DB et contrats API.
