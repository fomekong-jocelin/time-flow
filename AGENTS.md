# AGENTS.md — TimeFlow

## Lecture obligatoire

Avant toute action, lire :

1. `SKILL.md`
2. `docs/ai/README-IA.md`
3. `docs/ai/WORKFLOW-IA.md`
4. `docs/ai/PROJECT-TRACKING.md`
5. `docs/ai/CHANGELOG.md`
6. `docs/ai/review-checklist.md`
7. le ticket courant dans `docs/ai/tickets/`

## Règles non négociables

- Ne jamais traiter une demande comme un ticket isolé.
- Documenter les hypothèses lorsqu'une décision n'est pas encore validée.
- Backend maître des règles métier ; aucune logique métier critique dans les controllers ou composants Angular.
- Spring Boot + Maven + `application.yml` ; pas de `.properties` applicatif.
- Angular standalone, Tailwind CSS v4, sans Angular Material.
- SOLID, DDD pragmatique, composition privilégiée, classes < 500 lignes, méthodes courtes.
- Aucun secret dans Git, le navigateur, les logs ou les exemples.
- Sécurité deny-by-default, OWASP Top 10 / API Security, validation stricte des entrées.
- Toute modification passe par une branche et une Pull Request ; ne pas pousser directement une feature sur `main`.
- Une tâche n'est DONE que si tests, documentation, suivi projet et changelog sont cohérents.

## Workflow

Comprendre → documenter → tester/implémenter → vérifier → reviewer → rendre compte.
