# TICKET-0005 — Conception guidée de Jobs Talend

## Objectif

Permettre au kit de proposer manuellement un Job à partir d’un besoin,
sélectionner les composants officiels appropriés, expliquer leurs réglages et
produire un schéma exact sans générer d’artefact Talend.

## Critères d’acceptation

- [x] Le mode conception reste strictement en lecture seule.
- [x] La disponibilité et la fiche officielle précèdent la recommandation.
- [x] Une seule fiche de pattern est chargée selon le besoin.
- [x] Le pattern CSV vers MySQL distingue graphe minimal et `tMap` conditionnel.
- [x] Les actions destructrices de `tMysqlOutput` ne sont jamais proposées par
  défaut.
- [x] Un manifeste `[C]` précède le Mermaid et l’image éventuelle.
- [x] Une image proposée est clairement distinguée d’une capture Studio.
- [x] Aucun `.item` ou `.properties` Talend n’est créé ou modifié.

## Fichiers documentaires

- `docs/ai/CONCEPTION-TALEND.md`
- `docs/ai/patterns/CSV-VERS-MYSQL.md`
- `docs/ai/designs/TEMPLATE-conception.md`
- `docs/ai/VISUALISATION-TALEND.md`
- `docs/ai/REFERENCES.md`

## Statut

`DONE` — contrôles documentaires locaux terminés le 2026-07-29.

