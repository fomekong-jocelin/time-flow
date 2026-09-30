# TICKET-0003 — Image de diagnostic fondée sur le Job réel

## 1. Objectif

Permettre à l’IA de proposer une planche visuelle proche d’une infographie
Talend, tout en garantissant que les composants, connexions, contextes et
paramètres représentés proviennent des artefacts réellement analysés.

## 2. Critères d’acceptation

- [x] Le diagramme exact reste la source de vérité.
- [x] Une image PNG/SVG pédagogique peut être proposée si elle aide le
  développeur.
- [x] Une image générative n’est jamais utilisée seule pour les libellés ou la
  topologie.
- [x] Les noms uniques, types de composants et liens sont contrôlés après
  génération.
- [x] Toute divergence avec le manifeste de preuve bloque la livraison.
- [x] L’image est marquée comme schéma généré, pas comme capture Talend Studio.

## 3. Fichiers mis à jour

- [x] `AGENTS.md`
- [x] `SKILL.md`
- [x] `README.md`
- [x] `docs/ai/VISUALISATION-TALEND.md`
- [x] `docs/ai/CHANGELOG.md`
- [x] `docs/ai/PROJECT-TRACKING.md`

## 4. Vérifications

- [x] Contrôler les liens Markdown locaux.
- [x] Contrôler la présence du contrat d’exactitude visuelle.
- [x] Contrôler que l’image générée ne peut pas remplacer les preuves.

## 5. Statut

Statut : DONE

Dernière mise à jour : 2026-07-29
