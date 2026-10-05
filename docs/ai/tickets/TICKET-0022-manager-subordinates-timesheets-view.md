# TICKET-0022 — Écran de consultation et suivi des feuilles de temps des collaborateurs (N+1 / Manager / Direction)

## 1. Objectif

Permettre aux responsables hiérarchiques (N+1 / Manager), ainsi qu'à la Direction et aux Administrateurs, de **visualiser et suivre à tout moment les feuilles de temps de leurs collaborateurs / subordonnés directs**, au-delà du seul rituel d'approbation (`/validation`).

Ce module offre :
1. **Un écran dédié de suivi d'équipe** (`/equipe/temps` — « Temps équipe ») dans la barre de navigation.
2. **Une barre de filtres multi-critères** : Collaborateur managé, Période/Semaine (avec navigation précédente/suivante et cette semaine), Statut (Tous les statuts par défaut : Brouillon, Soumise, Validée, Rejetée), et Projet.
3. **Des indicateurs de synthèse de l'équipe (KPIs)** : Volume total d'heures de l'équipe, heures facturables, TACE moyen, répartition par état (Brouillons, Soumises, Validées).
4. **Un tableau de bord d'équipe réactif** : Affichage clair des feuilles avec jauges d'avancement par rapport aux objectifs contractuels (ex: 35h hebdo), badges projets, alertes de conformité et état d'avancement.
5. **Une vue détaillée haute fidélité YouTrack-style de la feuille du collaborateur** : Consultation intégrale de la grille matricielle (projets, Work Items Azure DevOps, activités, heures jour par jour, totaux, et commentaires d'imputation journaliers), historique de validation, et possibilité de valider/rejeter directement si la feuille est en attente (`SUBMITTED`).
6. **Une sécurité deny-by-default** : Contrôle strict du périmètre managé (`ValidationPolicy.ensureManagerScope` ; 403 Forbidden si l'utilisateur ciblé n'est pas sous la responsabilité managériale du demandeur).

---

## 2. Critères d'acceptation

- [x] **CA-01 (Backend - Endpoint de consultation de semaine collaborateur)** :
  - Endpoint `GET /api/v1/manager/timesheets/view?userId={userId}&weekStart={weekStart}` dans `TimesheetManagerController`.
  - Contrôle d'accès : vérification `ensureManagerScope(author.getManagerId(), principal.userId(), principal.role())`.
  - Si une feuille existe (en base avec statut `DRAFT`, `SUBMITTED`, `VALIDATED`, etc.), retour de `ManagerTimesheetDetail` avec la grille complète et l'historique.
  - Si aucune feuille n'est encore créée en base pour cette semaine, retour d'un `ManagerTimesheetDetail` vide structuré (0h, statut non initialisé) sans erreur 404 ni crash.
  
- [x] **CA-02 (Backend - Requête multi-statuts et tri par semaine)** :
  - Dans `TimesheetRepository`, tri des feuilles par `t.weekStart DESC, t.submittedAt DESC` pour un ordonnancement naturel et cohérent lorsque `status` est nul ou `DRAFT`.
  - `TimesheetManagerController.listPending` supporte `status=ALL` (ou absence de filtre de statut) pour retourner l'ensemble des feuilles de l'équipe.

- [x] **CA-03 (Frontend - Route, Navigation & Droits d'accès)** :
  - Déclaration de la route `/equipe/temps` protégée par `managerGuard` dans `app.routes.ts`.
  - Ajout de l'entrée de navigation « Temps équipe » (`nav.teamTimesheets`) dans `app-shell.component.ts` pour `MANAGER`, `DIRECTION`, `ADMIN` avec l'icône `calendar`.

- [x] **CA-04 (Frontend - Barre de filtres multi-critères)** :
  - Filtre Collaborateur : liste des subordonnés directs du manager + option « Tous mes collaborateurs ».
  - Filtre Semaine : sélecteur avec boutons rapides `← Semaine précédente`, `Semaine suivante →`, et bouton `Cette semaine` / option `Toutes les semaines`.
  - Filtre Statut : `Tous les statuts` (défaut), `Brouillon`, `Soumise`, `Validée`, `Rejetée`.
  - Filtre Projet : `Tous les projets` ou sélection d'un projet actif.
  - Bouton de réinitialisation des filtres.

- [x] **CA-05 (Frontend - Tableau récapitulatif & KPIs d'équipe)** :
  - Cartes KPI récapitulatives en haut de page (Collaborateurs actifs, Total heures, Facturable & TACE, État d'avancement des feuilles).
  - Tableau / cartes d'équipe avec barres de complétude YouTrack-style, statuts colorés, badges de projets et alertes de conformité.
  - Clic sur une ligne ou bouton « Voir la feuille » ouvrant la consultation détaillée.

- [x] **CA-06 (Frontend - Consultation détaillée YouTrack-style)** :
  - Affichage de la feuille hebdomadaire complète du collaborateur :
    - Grille matricielle identique au CRA avec colonnes Lun-Dim, Projets, Work Items Azure DevOps (#ID et titre), commentaires journaliers visualisables.
    - Totaux hebdomadaires, heures régulières, heures sup (OT), heures exceptionnelles (ET).
    - Historique des décisions de validation.
    - Actions de validation / rejet directes intégrées si la feuille est en attente (`SUBMITTED`).
    - Navigation d'une semaine à l'autre pour le collaborateur sélectionné.

- [x] **CA-07 (Internationalisation, Tests & Qualité)** :
  - Traductions complètes FR/EN sans clé manquante.
  - Tests automatisés backend (`TimesheetManagerSecurityTest`, `TimesheetValidationServiceTest`).
  - Tests unitaires frontend Node/ESM et build de production Angular sans avertissement.

---

## 3. Contexte analysé

- [x] Contrôleur existant : `TimesheetManagerController` gère déjà `/subordinates`, `/timesheets` et `/timesheets/{id}`.
- [x] Service existant : `TimesheetValidationService` possède déjà `getManagedUsers` et `getTimesheetDetail`.
- [x] Modèle de données : les feuilles de temps en base possèdent les statuts `DRAFT`, `SUBMITTED`, `VALIDATED`, `REJECTED`, `LOCKED`.
- [x] Périmètre de sécurité : `ValidationPolicy.ensureManagerScope` applique déjà la règle stricte deny-by-default pour les Managers (seuls leurs subordonnés directs sont accessibles, ou tout le monde pour ADMIN/DIRECTION).

---

## 4. Plan d'action

1. **Backend** :
   - Ajouter la méthode `getSubordinateWeekDetail(principal, userId, weekStart)` dans `TimesheetValidationService`.
   - Exposer l'endpoint `GET /api/v1/manager/timesheets/view` dans `TimesheetManagerController`.
   - Optimiser le tri dans `TimesheetRepository` (`ORDER BY t.weekStart DESC, t.submittedAt DESC`).
   - Compléter les tests unitaires et de sécurité backend.
2. **Frontend** :
   - Créer le service et le composant `team-timesheets-page` (`TeamTimesheetsPageComponent`).
   - Ajouter la route `/equipe/temps` dans `app.routes.ts`.
   - Ajouter l'élément de menu dans `app-shell.component.ts`.
   - Ajouter les clés i18n FR et EN.
   - Écrire les tests frontend dédiés.
3. **Vérification** :
   - `mvn test` et `npm test` + `npm run build`.
   - Mise à jour de `PROJECT-TRACKING.md` et `CHANGELOG.md`.

---

## 5. Statut

Status: DONE
Resolved Date: 2026-10-05
Branch: `feat/ticket-0022-manager-subordinates-timesheets-view`
Verification:
- Backend: 20 tests unitaires & de sécurité réussis (`TimesheetValidationServiceTest`, `TimesheetManagerSecurityTest`).
- Frontend: 58 tests Node unitaires & i18n réussis (`team-timesheets.test.mjs`, `i18n.test.mjs`).
- Compilation Angular: bundle `team-timesheets-page-component` généré avec succès en lazy chunk sans erreur.
