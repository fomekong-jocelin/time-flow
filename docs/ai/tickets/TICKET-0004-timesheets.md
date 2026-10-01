# TICKET-0004 — Feuille de temps / CRA (API & UI)

## 1. Objectif

Permettre à chaque collaborateur (interne SSO ou externe local) de saisir, enregistrer en brouillon et soumettre sa feuille de temps hebdomadaire (CRA), avec contrôle de validité, calcul dynamique des totaux et conformité avec la charte visuelle TimeFlow v0.1.

## 2. Critères d'acceptation

- [x] CA-01 : Consultation de la feuille de temps d'une semaine (`GET /api/v1/timesheets?weekStart=YYYY-MM-DD`). Si aucune feuille n'est encore enregistrée pour cette semaine, renvoie un état initialisé à vide en statut `DRAFT`, avec le temps théorique hebdomadaire de l'utilisateur (`weekly_target_minutes`).
- [x] CA-02 : Enregistrement de brouillon (`PUT /api/v1/timesheets/{weekStart}`). Autorisé uniquement si le statut est `DRAFT` ou `REJECTED`. Remplacement transactionnel des entrées (`time_entry`) de la semaine.
- [x] CA-03 : Soumission de la feuille (`POST /api/v1/timesheets/{weekStart}/submit`). Vérifie la transition d'état via `TimesheetStatusTransitions` (`DRAFT` -> `SUBMITTED`, ou `REJECTED` -> `SUBMITTED`), enregistre `submitted_at = NOW()`.
- [x] CA-04 : Contrôles de validation métier côté backend :
  - `weekStart` doit obligatoirement être un lundi.
  - Toute date d'entrée `entryDate` doit être comprise entre le lundi `weekStart` et le dimanche `weekStart + 6`.
  - Durée par entrée en minutes comprise entre 1 et 1440.
  - Total journalier par utilisateur plafonné à 1440 minutes (24h).
  - Projet référencé existant et actif (`active == true`).
  - Type d'activité normalisé (`PROJECT`, `TRAINING`, `SUPPORT`, `INTERNAL`).
- [x] CA-05 : Calcul strict des métriques côté backend :
  - Total général des minutes, total facturable (`billable == true`), total interne (`INTERNAL` ou non facturable).
  - Totaux journaliers par jour de la semaine.
  - Temps théorique hebdomadaire et écart.
- [x] CA-06 : Sécurité et isolation des données :
  - Un collaborateur ne peut accéder ou modifier que ses propres feuilles de temps.
  - Protection CSRF obligatoire sur toutes les mutations.
  - Deny-by-default : authentification requise.
- [x] CA-07 : Interface Angular « Mes temps » interactive et responsive (Desktop, Tablette, Mobile) :
  - Navigation de semaine en semaine (précédente, suivante, bouton retour aujourd'hui).
  - Grille hebdomadaire avec en-têtes de dates dynamiques et surlignage du jour courant.
  - Sélection d'un projet parmi les projets actifs du catalogue (`/api/v1/projects`).
  - Sélection du type d'activité et indicateur de facturation (hérité du projet par défaut, modifiable).
  - Saisie intuitive des durées par jour avec mise à jour immédiate des totaux journaliers et hebdomadaires.
  - KPIs réels connectés aux totaux de la feuille et au temps cible du profil.
  - Boutons d'action « Enregistrer le brouillon » et « Soumettre ».
  - Affichage clair du statut (`DRAFT`, `SUBMITTED`, `REJECTED`, `VALIDATED`, `LOCKED`). Verrouillage en lecture seule lorsque le statut n'est pas modifiable.
  - En cas de rejet, bandeau informatif affichant le motif de rejet du manager avec possibilité de corriger et re-soumettre.
  - États de chargement (skeletons/spinners), état vide et gestion des erreurs de communication.
- [x] CA-08 : Tests et non-régression :
  - Tests unitaires et de validation du domaine (`TimesheetPolicyTest`).
  - Tests applicatifs de service (`TimesheetServiceTest`).
  - Tests MockMvc de sécurité et d'isolation des utilisateurs (`TimesheetSecurityTest`).
  - Build frontend `npm run build` et backend `mvn test` réussis (64 tests au vert, 0 échec).

## 3. Contexte analysé

- Tables existantes créées en V1 : `timesheet`, `time_entry`, `timesheet_validation`, `project`, `app_user`.
- Domaine : `TimesheetStatus`, `TimesheetStatusTransitions`, `ActivityType`, `TimesheetPolicy`.
- Service de catalogue : `ProjectService` et `ProjectStore` dans `cm.indyli.timeflow.projects`.
- Shell et composants visuels : `AppShellComponent`, `tf-logo`, `tf-icon`, `calendarWeek()`, `TimesheetSidePanelComponent`.

## 4. Implémentation

- Backend :
  - `TimesheetEntity` et `TimeEntryEntity` (JPA) mappant les tables existantes `timesheet` et `time_entry`.
  - `TimesheetRepository` avec fetch optimisé.
  - `TimesheetPolicy` encapsulant toutes les règles de garde (lundi obligatoire, dates dans la semaine, plafond journalier 24h, transitions).
  - `TimesheetService` orchestrant la consultation avec état initial vide, le remplacement des entrées en brouillon et la soumission.
  - `TimesheetController` sous `/api/v1/timesheets` avec validation Jakarta et isolation stricte par l'utilisateur connecté (`principal.userId()`).
  - `TimesheetExceptionHandler` traduisant les exceptions métier en `ProblemDetail` standard (HTTP 400 et 409).
- Frontend :
  - `TimesheetService` et modèles TypeScript avec CSRF automatique.
  - `current-week.ts` étendu pour les dates ISO et la navigation entre semaines.
  - `TimesheetPageComponent` entièrement dynamisé avec signaux Angular zoneless, calcul réactif des KPIs, modale d'ajout de projet, saisie rapide par jour, gestion des statuts (brouillon, soumis, rejeté, verrouillé) et alertes de rejet.
  - `TimesheetSidePanelComponent` réactif reflétant l'avancement réel (compte connecté, projets synchronisés, saisie des temps, soumission).

## 5. Tests et vérifications

- [x] Unit tests : `TimesheetPolicyTest` (7 tests), `TimesheetServiceTest` (5 tests).
- [x] Security checks : `TimesheetSecurityTest` (4 tests) validant deny-by-default, RBAC, CSRF requis.
- [x] Regression checks : `mvn test` réussit (64 tests au total, 0 régression).
- [x] Build frontend : `npm run build` exécuté avec succès (0 warning/erreur).

## 6. Documentation

- [x] PROJECT-TRACKING mis à jour
- [x] CHANGELOG mis à jour

## 7. Reste à faire / risques

- Validation manager (TICKET-0005) : écran manager « Mon équipe » pour valider/rejeter les feuilles soumises avec motif.
- Saisie détaillée au niveau Work Item Azure DevOps si requis ultérieurement en V1.1.

## 8. Statut

Status: REVIEW
