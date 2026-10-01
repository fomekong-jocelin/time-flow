# TICKET-0011 — Groupes de configuration du temps de travail & paramètres dynamiques (Work Schedules)

## 1. Objectif

Fournir une interface et un moteur de configuration dynamique des temps de travail (« profils / groupes de travail ») inspiré des meilleures pratiques métier (type Pilot App / BoondManager / Lucca) permettant d'administrer les heures de travail contractuelles, jours ouvrés (Lun-Ven, 4/5e, etc.), plafonds d'heures (légal, dérogatoire), autorisations de week-end, et de les affecter aux utilisateurs afin d'adapter dynamiquement la grille de saisie CRA et le moteur de validation manager.

## 2. Critères d'acceptation

- [x] CA-01 : Modèle de données & Migration Flyway `V5__work_schedule_profiles.sql` :
  - Création de la table `work_schedule_profile` (id, code, name, description, weekly_target_minutes, daily_target_minutes, max_daily_minutes, max_weekly_minutes, working_days, allow_weekend_entry, is_default, active, created_at, updated_at).
  - Profils par défaut pré-provisionnés : `STANDARD_35H` (défaut), `CADRE_38H30`, `PART_TIME_80` (mercredi non ouvré), `FLEX_ASTREINTE`.
  - Ajout de la clé étrangère `work_schedule_profile_id` dans `app_user` avec rattachement automatique au profil par défaut.
- [x] CA-02 : Règles de gestion & Domaine (`WorkSchedulePolicy`) :
  - Unicité du code et du nom du profil.
  - Au moins un profil actif par défaut dans l'organisation.
  - Au moins un jour ouvré par semaine de travail.
  - Cohérence des bornes : `weekly_target_minutes <= max_weekly_minutes`, `daily_target_minutes <= max_daily_minutes`.
  - Interdiction de supprimer ou désactiver le profil par défaut sans désignation préalable d'un remplaçant.
- [x] CA-03 : API REST d'administration `/api/v1/admin/work-schedules` :
  - `GET /api/v1/admin/work-schedules` : liste des profils avec décompte des utilisateurs associés.
  - `POST /api/v1/admin/work-schedules` : création d'un profil.
  - `PUT /api/v1/admin/work-schedules/{id}` : mise à jour d'un profil.
  - `POST /api/v1/admin/work-schedules/{id}/set-default` : passage en profil par défaut.
  - `POST /api/v1/admin/work-schedules/{id}/toggle-active` : activation/désactivation.
  - Sécurité : accès réservé `ADMIN` et `DIRECTION`, CSRF activé sur les mutations.
- [x] CA-04 : Endpoint public collaborateur `/api/v1/users/me/work-schedule` :
  - Permet à l'application Angular de récupérer les paramètres dynamiques du collaborateur connecté (jours ouvrés, cible journalière/hebdomadaire, plafonds, week-end autorisé).
- [x] CA-05 : Affectation dans la gestion des utilisateurs (`/api/v1/admin/users`) :
  - Sélection du profil de travail lors de la création d'un compte local ou pré-provisioning SSO.
  - Mise à jour du profil de travail d'un utilisateur existant.
- [x] CA-06 : Interface d'administration Angular `/admin/configuration-temps` :
  - Accès dans le shell via « Configuration temps » sous la section Admin.
  - Vue en cartes et tableau listant les profils, badges par défaut, jours ouvrés (Lun, Mar, Mer, Jeu, Ven, etc.), volume hebdo, seuils et statut.
  - Modale interactive de création/édition avec sélecteur de jours ouvrés à bascule, saisie des heures, case à cocher week-end et profil par défaut.
- [x] CA-07 : Adaptation dynamique de la saisie CRA (« Mes temps ») :
  - Prise en compte des jours ouvrés définis par le profil de l'utilisateur (ex: le mercredi apparaît comme jour non ouvré pour un temps partiel 80%).
  - Calcul dynamique de l'objectif hebdomadaire issu du profil.
  - Respect de l'autorisation de saisie week-end selon le profil.
- [x] CA-08 : Tests et non-régression :
  - Tests unitaires des politiques de configuration (`WorkSchedulePolicyTest`).
  - Tests MockMvc d'accès et de sécurité (`WorkScheduleSecurityTest`).
  - Maintien des tests existants (99/99 backend) et build Angular production réussi.

## 3. Statut

Status: DONE
