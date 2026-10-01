# TICKET-0006 — Module Formations : Catalogue, planification des sessions, formateurs et participants

## 1. Objectif

Mettre en place le module de gestion des formations dans TimeFlow :
- **Catalogue & Sessions de formation** : Création, planification et suivi des sessions de formation (`training_session`).
- **Typologie & Modalités** : Formation interne (montée en compétences) ou client (facturable), modalités (présentiel, distanciel, hybride), volume horaire prévisionnel.
- **Rôles & Responsabilités** :
  - `ADMIN` & `DIRECTION` : Gestion complète du catalogue, planification, affectation des formateurs et inscription des participants.
  - `TRAINER` : Consultation des sessions animées, accès à la liste des participants et émargement/présence.
  - `COLLABORATOR` & `MANAGER` : Consultation du catalogue, visualisation de ses inscriptions aux formations, auto-inscription/désinscription.
- **Participants** : Table de liaison `training_participant` pour inscrire les collaborateurs, suivre leur statut (inscrit, présent, annulé).
- **Interface Utilisateur Angular (`/formations`)** :
  - Remplacement du lien inactif « Bientôt » dans le menu latéral par la route active `/formations`.
  - Dashboard avec KPI (Total sessions, sessions planifiées, en cours, terminées, volume horaire, inscriptions).
  - Vues desktop et mobile ergonomiques sans coupure de texte.
  - Volet ou modale de création / édition de session avec sélection du formateur et des participants.
  - Modale de gestion des participants avec mise à jour du statut de présence (Présent, Annulé).
- **Internationalisation & Sécurité** : Traduction bilingue FR/EN complète, sécurité deny-by-default, tests automatisés 100% passants.

## 2. Critères d'acceptation

- [x] CA-01 : Migration Flyway `V9__training_sessions.sql` créant les tables `training_session` et `training_participant`.
- [x] CA-02 : API REST backend sécurisée sous `/api/v1/trainings` (liste filtrable, détail, création, mise à jour, suppression, changement de statut, inscription/désinscription de participants).
- [x] CA-03 : Contrôle d'accès RBAC : Admin et Direction peuvent créer/modifier des formations ; Formateurs (`TRAINER`) ont accès à leurs sessions animées et peuvent marquer la présence ; Collaborateurs ont accès aux formations disponibles et à leurs inscriptions.
- [x] CA-04 : Route Angular `/formations` intégrée dans `app.routes.ts` et shell applicatif `app-shell.component.ts` (icône `graduation`).
- [x] CA-05 : Interface Angular responsive avec cartes KPI, filtres (statut, modalité, recherche texte), cartes de formation ergonomiques et gestion des participants.
- [x] CA-06 : Internationalisation FR/EN complète (zéro texte en dur, clés conformes aux tests i18n).
- [x] CA-07 : Tests unitaires, de sécurité et d'intégration backend (`mvn test`, 154 tests) et tests frontend (`npm test`, 15 tests) 100% au vert.
- [x] CA-08 : Documentation à jour (`PROJECT-TRACKING.md`, `CHANGELOG.md`).

## 3. Contexte analysé

- [x] Fichiers et comportement existants inspectés : `app-shell.component.ts` (menu `nav.training`), `UserRole.java` (`TRAINER`), `ActivityType.java` (`TRAINING`), `AnalyticsService.java` (`trainingMinutes`).
- [x] Impacts API/data/UI identifiés :
  - DB : `training_session` (titre, référence, description, formateur, dates, heures, statut, modalité, capacité) et `training_participant` (session, collaborateur, statut, date inscription).
  - API : `TrainingController`, `TrainingService`, `TrainingSessionEntity`, `TrainingParticipantEntity`.
  - UI : `TrainingPageComponent`, `TrainingFormComponent`, `TrainingParticipantsModalComponent`, `TrainingService`.
- [x] Sécurité analysée : RBAC deny-by-default, validation CSRF, contraintes d'unicité et validation des dates.
- [x] Tests existants vérifiés : 154 tests backend et 15 tests frontend passants.

## 4. Plan d'action

- [x] 1. Migration Flyway `V9__training_sessions.sql`.
- [x] 2. Backend - Entités JPA, DTOs, Repository et Service de domaine pour les formations.
- [x] 3. Backend - `TrainingController` avec endpoints CRUD et gestion des participants (`/api/v1/trainings`).
- [x] 4. Backend - Tests unitaires et de sécurité (`TrainingSecurityTest`, `TrainingServiceTest`).
- [x] 5. Frontend - Service Angular `training.service.ts` et modèles TypeScript.
- [x] 6. Frontend - Composants `training-form.component.ts` et `training-participants-modal.component.ts`.
- [x] 7. Frontend - Page principale `training-page.component.ts` et activation dans `app.routes.ts` / `app-shell.component.ts`.
- [x] 8. Frontend - Dictionnaires i18n `fr.ts` et `en.ts` et tests unitaires (`training.test.mjs`).
- [x] 9. Vérification complète (`mvn test`, `npm test`, `npm run build`).
- [x] 10. Mise à jour `PROJECT-TRACKING.md` et `CHANGELOG.md`.

## 5. Implémentation

- Backend :
  - `V9__training_sessions.sql` : Tables `training_session` et `training_participant`, index de performance et contraintes d'unicité.
  - Domain : `DeliveryMode`, `TrainingCategory`, `TrainingStatus`, `ParticipantStatus`, `TrainingValidationException`.
  - Persistence : `TrainingSessionEntity`, `TrainingParticipantEntity`, `TrainingSessionRepository`, `TrainingParticipantRepository`.
  - Application : `TrainingService`, `TrainingSessionDto`, `TrainingParticipantDto`, `TrainingKpiDto`, `SaveTrainingCommand`.
  - API : `TrainingController`, `TrainingExceptionHandler`.
- Frontend :
  - `training.models.ts`, `training.service.ts`.
  - `training-form.component.ts` : Formulaire de création / édition avec validation des dates, sélection du formateur et des modalités.
  - `training-participants-modal.component.ts` : Modale de suivi des inscriptions, ajout/suppression et mise à jour de présence (`ATTENDED`, `CANCELLED`).
  - `training-page.component.ts` : Dashboard avec 6 cartes KPI, barre de filtres multi-critères, grille de cartes de sessions avec jauge de remplissage, auto-inscription/désinscription.
  - Activation de la route `/formations` dans `app.routes.ts` et du lien dans `app-shell.component.ts`.
  - Traductions FR/EN complètes dans `fr.ts` et `en.ts`.

## 6. Tests et vérifications

- [x] Unit tests : `TrainingServiceTest` (8 tests)
- [x] Security tests : `TrainingSecurityTest` (6 tests)
- [x] Frontend tests : `training.test.mjs`, `i18n.test.mjs` (15 tests totaux au vert)
- [x] Full build test : `npm run build` (0 erreurs, 0 avertissements) et `mvn test` (154 tests au vert)
- [x] Regression checks : validation des flux existants (CRA, validation manager, facturation, projets)

## 7. Documentation

- [x] PROJECT-TRACKING mis à jour
- [x] CHANGELOG mis à jour
- [x] Ticket de suivi validé

## 8. Statut

Status: DONE
