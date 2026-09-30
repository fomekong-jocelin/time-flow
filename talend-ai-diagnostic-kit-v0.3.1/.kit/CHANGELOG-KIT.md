# Changelog

## [Unreleased]

## [0.3.1] - 2026-09-29

### Changed

- Scripts portés pour Windows : `talend-item-extract.bat` et
  `talend-log-extract.bat` (Batch + PowerShell intégré, aucune installation),
  sorties identiques aux anciennes versions Python.
- Références par numéro de section (« § ») remplacées par le nom des sections ;
  titres d'`AGENTS.md` et de `SKILL.md` dénumérotés.
- Installation décrite pour Windows (PowerShell).

### Added

- `docs/prompts/PROMPTS-TALEND.md` : 10 modèles de demandes prêts à l'emploi
  (mots-clés en majuscules, éléments à remplacer entre `{{…}}`).
- Section « Format des demandes » dans `AGENTS.md`.

### Removed

- `scripts/talend_item_extract.py` et `scripts/talend_log_extract.py`.

## [0.3.0] - 2026-09-29

### Added

- `scripts/talend_item_extract.py` : résumé compact d'un Job (contextes,
  composants et réglages clés, connexions, Jobs enfants, tMap, schémas,
  Mermaid) à la place de la lecture du XML `.item`. Secrets masqués.
- `scripts/talend_log_extract.py` : première erreur, chaîne `Caused by`
  filtrée, compteurs d'exceptions, fin de Job, à la place du log entier.
- Fichier `VERSION`.

### Changed

- Noyau réduit à `AGENTS.md` + `SKILL.md` + ticket ; `README-IA.md` et
  `PROJECT-TRACKING.md` ne sont plus lus au démarrage.
- `CLAUDE.md` = `@AGENTS.md` ; `GEMINI.md` = `@AGENTS.md` + `@SKILL.md`.
- Réponse finale courte renvoyant au rapport `DIAG-*` / `DESIGN-*` au lieu de
  le recopier dans le chat.
- Sections visualisation et sortie dédoublonnées entre `AGENTS.md` et `SKILL.md`.
- Illustration compressée (5,8 Mo → moins de 300 Ko) et déplacée dans
  `docs/illustrations/`.

### Removed

- Dossiers `.git/` et `.agents/` vides de l'archive (risque de dépôt corrompu).
- Alias `AGENTS-TALEND-DIAGNOSTIC.md`.
- Tickets et suivi de construction du kit sortis de `docs/ai/` vers `.kit/`.

## [0.2.0] - 2026-07-29

### Added

- Mode de conception guidée strictement manuel et en lecture seule.
- Pattern compact CSV vers MySQL avec `tFileInputDelimited`,
  `tMysqlOutput` et `tMap` conditionnel.
- Manifeste `[C]`, modèle de conception et contrat d’image proposée.
- Fiches ciblées `tContextLoad`, `tRunJob` et `tRESTRequest`.
- Porte de disponibilité des composants fondée sur la matrice officielle
  Talend Studio 8 et la fiche détaillée de chaque composant.
- Politique de visualisation fondée sur le graphe et le contexte réels.
- Contrat de génération d’une planche PNG/SVG fidèle aux composants réels,
  avec contrôle contre un manifeste extrait des artefacts.
- Modèle complet de diagnostic Talend.
- Porte de compatibilité entre TOS 8.0.1 et releases mensuelles Studio 8.
- Classification Fait / Inférence / Hypothèse / Inconnu.

### Changed

- Remplacement du noyau Spring/Angular/Flutter par une gouvernance Talend
  DI/ESB strictement en lecture seule.
- Lecture progressive des documents pour réduire la consommation de tokens.
- `AGENTS-TALEND-DIAGNOSTIC.md` devient un alias court de `AGENTS.md`.
- Checklist, workflow, ticket et suivi adaptés aux artefacts Talend.
- Adaptateurs Claude et Gemini alignés sur la même source de vérité.

### Security

- Interdiction réaffirmée de modifier tout artefact Talend.
- Masquage obligatoire des credentials, tokens et données sensibles.
- Interdiction d’un diagramme contenant des valeurs ou liaisons inventées.

## [0.1.0] - 2026-06-29

### Added

- Première version générique du kit documentaire IA.
