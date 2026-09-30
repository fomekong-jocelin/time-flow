# TICKET-0002 — Recentrage du kit sur le diagnostic Talend TOS DI/ESB

## 1. Objectif

Transformer le kit générique full-stack en kit de diagnostic Talend TOS DI/ESB 8.0.1, strictement en lecture seule, fondé sur les preuves et moins coûteux en contexte.

## 2. Critères d’acceptation

- [x] Les artefacts Talend sont explicitement protégés contre toute modification.
- [x] Le noyau obligatoire est court et les guides détaillés sont chargés à la demande.
- [x] Les règles `tContextLoad`, `tRunJob`, `tRESTRequest` et contextes sont reliées à Qlik Help.
- [x] TOS 8.0.1 est distingué des mises à jour mensuelles Talend Studio 8 sous abonnement.
- [x] Le diagnostic impose une classification Fait / Inférence / Hypothèse / Inconnu.
- [x] Les diagrammes sont produits uniquement depuis le graphe et le contexte réellement observés.
- [x] Un modèle de diagnostic Talend et une checklist spécialisée existent.
- [x] Les adaptateurs Codex, Claude et Gemini pointent vers la même source de vérité.

## 3. Contexte analysé

- [x] `AGENTS.md` et sa copie ont été comparés.
- [x] `SKILL.md` a été lu intégralement.
- [x] Les documents existants de `docs/ai/` ont été lus dans l’ordre imposé.
- [x] L’image `exemple-job.png` a été inspectée.
- [x] Les pages Qlik Help citées dans le besoin ont été vérifiées.
- [x] Les pages Qlik Help relatives aux exports, Project Settings et releases mensuelles ont été vérifiées.
- [x] Aucun Job, Route, Service, contexte, routine ou metadata Talend n’est présent dans ce kit.

## 4. Décisions

- Conserver `AGENTS.md` comme règle d’entrée unique.
- Transformer `AGENTS-TALEND-DIAGNOSTIC.md` en alias court pour éviter la duplication.
- Remplacer le contenu Spring/Angular/Flutter par un workflow Talend spécialisé.
- Charger les fiches composants, la checklist et les références uniquement lorsque le symptôme les rend pertinentes.
- Garder `exemple-job.png` comme illustration didactique, sans valeur probante.

## 5. Vérifications

- [x] Vérifier les liens Markdown locaux.
- [x] Vérifier l’absence de contenu full-stack résiduel hors historique.
- [x] Vérifier que tous les exemples de correction exigent une action manuelle dans Talend Studio.
- [x] Vérifier qu’aucun fichier `.item` ou `.properties` Talend n’a été créé ou modifié.
- [x] Vérifier la cohérence du manifest et du suivi.

## 6. Documentation

- [x] `PROJECT-TRACKING.md` mis à jour.
- [x] `CHANGELOG.md` mis à jour.
- [x] `MANIFEST.md` mis à jour.

## 7. Statut final

Statut : DONE

Dernière mise à jour : 2026-07-29
