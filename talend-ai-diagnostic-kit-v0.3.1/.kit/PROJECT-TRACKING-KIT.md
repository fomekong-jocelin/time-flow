# PROJECT TRACKING — Kit de diagnostic et conception Talend

## Statut global

| Champ | Valeur |
|---|---|
| Dernière mise à jour | 2026-07-29 |
| État global | Diagnostic et conception guidée en lecture seule, revue locale terminée |
| Périmètre | TOS DI/ESB 8.0.1, legacy 7.x, Studio 8.x conditionnel |
| Risque majeur | Confusion possible entre TOS GA et releases mensuelles Studio 8 |
| Prochaine priorité | Tester le diagnostic réel et la conception CSV vers MySQL |

## Suivi

| ID | Type | Titre | Statut | Priorité | Dernière MAJ | Reste à faire |
|---|---|---|---|---|---|---|
| TICKET-0001 | Gouvernance | Gouvernance IA générique initiale | DONE | P2 | 2026-06-29 | Historique conservé |
| TICKET-0002 | Documentation | Recentrer le kit sur Talend TOS DI/ESB | DONE | P0 | 2026-07-29 | Valider sur un premier projet Talend réel |
| TICKET-0003 | Visualisation | Générer une image fidèle au Job réel | DONE | P1 | 2026-07-29 | Valider sur un premier Job réel |
| TICKET-0004 | Documentation | Exploiter la disponibilité des composants | DONE | P1 | 2026-07-29 | Valider sur un composant absent ou incompatible réel |
| TICKET-0005 | Conception | Guider un Job CSV vers MySQL avec schéma exact | DONE | P0 | 2026-07-29 | Valider avec un schéma CSV et une table MySQL réels |

## Points à valider sur le premier projet réel

- [ ] Extraction correcte d’un graphe de Job depuis `.item`.
- [ ] Résolution d’un contexte avec Implicit Context Load et `tContextLoad`.
- [ ] Suivi parent/enfant via `tRunJob`.
- [ ] Diagnostic ESB `tRESTRequest` avec logs Runtime/Karaf.
- [ ] Lisibilité du Mermaid généré depuis les preuves.
- [ ] Réduction réelle du contexte chargé par rapport à l’ancien kit.
- [ ] Sélection minimale `tFileInputDelimited` → `tMysqlOutput`.
- [ ] Ajout de `tMap` seulement si le mapping réel le justifie.
- [ ] Image de conception conforme au manifeste `[C]`.

## Statuts

`TODO` · `IN_PROGRESS` · `BLOCKED` · `REVIEW` · `DONE` · `CANCELLED`

Ne mettre `DONE` que lorsque les contrôles documentaires sont terminés. Un
diagnostic projet reste `IN_PROGRESS` si des preuves essentielles manquent.
