# README IA — Diagnostic et conception Talend

## Objectif

Ce dossier centralise les preuves, décisions, diagnostics et conceptions
proposées. Il ne contient aucun artefact Talend généré ou modifié.

## Lecture

Ce fichier n'est **pas** lu au démarrage : le noyau est `AGENTS.md` + `SKILL.md`
(routage : `AGENTS.md`, section « Lecture progressive »). Le consulter seulement pour savoir où ranger une
information.

## Où stocker l’information

| Information | Fichier |
|---|---|
| Règles non négociables et routage | `../../AGENTS.md` |
| Méthode compacte | `../../SKILL.md` |
| État global du projet (tickets ouverts) | `PROJECT-TRACKING.md` |
| Anciennes lignes de suivi | `archive/` |
| Travail d’une intervention | `tickets/TICKET-*.md` |
| Rapport d’un incident | `diagnostics/DIAG-*.md` |
| Proposition de conception | `designs/DESIGN-*.md` |
| Décision durable | `adr/ADR-*.md` |
| Évolutions notables côté projet | `CHANGELOG.md` |
| Historique du kit (jamais lu) | `../../.kit/` |
| Sources officielles | `REFERENCES.md` |

## Convention de preuve

Utiliser dans les tickets et diagnostics :

- `Fait observé` : directement visible dans une source ;
- `Inférence` : conséquence directe de faits cités ;
- `Hypothèse non confirmée` : plausible mais incomplète ;
- `Inconnu` : information manquante.

Une information importante ne doit pas rester uniquement dans la conversation.
Ne jamais enregistrer de secret dans cette documentation.

## Limite documentaire

La documentation peut décrire une correction manuelle, mais ne doit contenir
aucun patch XML/XMI destiné à un `.item` ou `.properties` Talend.
