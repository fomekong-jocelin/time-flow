# Workflow IA — TimeFlow

## Flux obligatoire

1. Comprendre le besoin et lire le contexte projet.
2. Créer/mettre à jour le ticket d'action.
3. Analyser impacts métier, API, données, UI, sécurité et tests.
4. Implémenter le changement le plus petit cohérent.
5. Exécuter les vérifications pertinentes.
6. Faire la revue anti-régression et sécurité.
7. Mettre à jour tracking/changelog/ADR si nécessaire.
8. Ouvrir une Pull Request avec preuves et travaux restants.

## Branches

- `feat/<sujet>` : fonctionnalité.
- `fix/<sujet>` : correction.
- `chore/<sujet>` : maintenance.
- `docs/<sujet>` : documentation.

`main` reste intégrable ; pas de feature directement sur `main`.
