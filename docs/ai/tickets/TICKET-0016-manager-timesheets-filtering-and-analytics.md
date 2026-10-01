# TICKET-0016 — Filtrage multi-critères des feuilles de temps et heures passées (Manager & Admin)

## Contexte & Objectifs

Un responsable hiérarchique (Manager) doit pouvoir suivre, contrôler et analyser avec précision les feuilles de temps et les heures passées de **ses collaborateurs / subordonnés directs**.
De même, un profil avec privilèges étendus (Administrateur ou Direction) doit pouvoir visualiser l'ensemble des feuilles et heures de l'entreprise.

Pour piloter l'activité opérationnelle et répondre aux questions fondamentales de gestion :
- **Qui ?** : Quel collaborateur ou sous-ensemble de l'équipe a travaillé ?
- **Sur quel projet ?** : Quelles imputations ont été réalisées sur une mission client ou un projet interne spécifique ?
- **Quand ?** : Sur quelle période, semaine ou mois ces temps ont-ils été passés ?
- **Sommes et indicateurs ?** : Quel est le total d'heures cumulées, le volume facturable, le taux de facturabilité (TACE) et le nombre de feuilles concernées ?

Ce besoin se matérialise à la fois :
1. **Dans l'Espace Validation & Contrôle (`/validation`)** :
   - Mise à disposition d'une barre de filtres multi-critères (Statut, Collaborateur, Projet, Semaine/Période).
   - Bandeau synthétique affichant les **Sommes en temps réel** (Total heures, Total facturable, Taux de facturabilité moyen, Nombre de feuilles).
2. **Dans le Tableau de bord Analyses & Reporting (`/analyses`)** :
   - Déploiement du volet de filtres avancés (Collaborateur, Projet) relié dynamiquement à l'API `/api/v1/analytics/overview`.
   - Bouton « Filtrer » interactif permettant d'ouvrir/fermer le panneau de filtrage sans rechargement inutile, avec compteur de filtres actifs et lien de réinitialisation.
3. **Ergonomie Mobile & Responsiveness pro** :
   - Correction des coupures de badges et de textes d'avatars sur mobile (`AvatarComponent` et `StatusBadgeComponent` avec `min-w-0 flex-1`, `truncate` et `shrink-0`).
   - Barre d'onglets Projets / Équipe avec défilement tactile fluide horizontal (`overflow-x-auto`) sans coupure de texte.
4. **Cloisonnement et sécurité deny-by-default** :
   - Un `MANAGER` ne peut accéder qu'aux données de ses subordonnés directs (`app_user.manager_id = manager.id`) et de lui-même. Toute tentative d'accès à un tiers est rejetée (`403 Forbidden`).
   - `ADMIN` et `DIRECTION` disposent d'une visibilité globale transverse.

## Spécification Technique & Réalisations

### Backend (`cm.indyli.timeflow.timesheet` & `cm.indyli.timeflow.analytics`)
1. **DTO `SubordinateSummary`** :
   - `id`, `displayName`, `email`, `role`.
2. **Service `TimesheetValidationService`** :
   - Méthode `getManagedUsers(TimeFlowPrincipal principal)` : retourne les subordonnés pour un Manager ou tous les utilisateurs pour Admin/Direction.
   - Méthode `listPending(principal, statusFilter, weekFilter, targetUserId, targetProjectId, fromWeek, toWeek)` :
     - Vérification de l'habilitation du manager sur `targetUserId` (exception `AccessDeniedException` si non managé).
     - Filtrage par `targetProjectId` (recherche des feuilles comportant des entrées sur le projet).
     - Filtrage temporel par semaine ou intervalle de semaines.
3. **Contrôleur `TimesheetManagerController`** :
   - Endpoint `GET /api/v1/manager/timesheets/subordinates`.
   - Paramètres étendus sur `GET /api/v1/manager/timesheets` : `status`, `weekStart`, `userId`, `projectId`, `fromWeek`, `toWeek`.
4. **Tests automatisés** :
   - `TimesheetValidationServiceTest` & `TimesheetManagerSecurityTest` (16/16 tests passants).
   - Suite complète backend : 123/123 tests passants.

### Frontend (`frontend/src/app/features/`)
1. **Module Validation (`/validation`)** :
   - Intégration des filtres dynamiques (Collaborateur, Projet, Semaine, Statut).
   - Calcul réactif des sommes : Total heures, Total facturable, TACE, Feuilles affichées.
   - Affichage en cartes KPI réutilisables `tf-kpi-card`.
2. **Module Analytics (`/analyses`)** :
   - Bouton « Filtrer » interactif pour basculer le panneau de filtres (Collaborateur, Projet) avec badge du nombre de filtres actifs et lien « Réinitialiser ».
   - Rechargement instantané des KPIs, du Donut, de l'Histogramme et des ventilations projets/équipe selon les critères choisis.
3. **Composants partagés & Robustesse mobile** :
   - `AvatarComponent` : déclaration hôte `block min-w-0`, libellé et email protégés avec `truncate` et infobulle `title`.
   - `StatusBadgeComponent` : déclaration hôte `inline-flex shrink-0` pour empêcher le rognage sur petit écran.
   - Onglets Projet / Équipe avec défilement tactile horizontal sans débordement.
4. **Traductions i18n FR/EN** :
   - Dictionnaires complets pour tous les nouveaux libellés de filtres et de métriques de somme (11/11 tests i18n passants).

## Statut
- **DONE**
