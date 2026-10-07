# TICKET-0017 — Configuration du budget projet (jours globaux, prix/forfait), TJM et devises configurables (€, $, XAF...)

## 1. Objectif

Permettre la configuration et le pilotage du budget des projets :
- **Budget temps** : Nombre de jours global alloué/vendu sur le projet (`budget_days`).
- **Budget financier / Prix global** : Montant total forfaitaire du projet (`total_price`).
- **Taux Journalier Moyen (TJM)** : Taux négocié au niveau du projet (`daily_rate`) et TJM de référence du collaborateur (`daily_rate` sur `app_user`).
- **Devise configurable** : Devise par projet (€, $, XAF, £, CAD, CHF...) avec présélection et saisie libre (`currency`).
- **Gestion des projets (IHM & API)** : Création et modification des projets directement dans l'interface par les profils autorisés (`ADMIN`, `DIRECTION`).
- **Suivi consommé vs budget** : Restitution des taux d'avancement (jours consommés / jours prévus, montant consommé / budget total) dans la préparation de facturation et les exports.
- **Confidentialité financière préservée** : Masquage strict côté backend des montants financiers (TJM, prix total) pour les rôles non habilités (`MANAGER`, `COLLABORATOR`).

## 2. Critères d'acceptation

- [x] CA-01 : Migration Flyway `V8__project_budget_currency.sql` ajoutant `budget_days`, `total_price` et `currency` (défaut 'EUR') sur la table `project`.
- [x] CA-02 : Les administrateurs et la direction peuvent créer ou modifier un projet via l'API REST (`POST /api/v1/admin/projects`, `PUT /api/v1/admin/projects/{id}`).
- [x] CA-03 : Les paramètres de devises (€, $, XAF, £, CAD, CHF...) sont modifiables par projet et appliqués de manière dynamique dans l'affichage et les exports.
- [x] CA-04 : Le TJM de référence du collaborateur (`app_user.daily_rate`) est modifiable dans la gestion des utilisateurs (`/admin/utilisateurs`).
- [x] CA-05 : L'import et l'export Excel des projets intègrent les colonnes optionnelles de budget, TJM et devise sans casser la rétrocompatibilité (4 ou 8 colonnes supportées).
- [x] CA-06 : La page de facturation (`/facturation`) et les exports Excel/CSV affichent la devise dynamique du projet ainsi que la consommation budgétaire (jours et montants consommés vs budget).
- [x] CA-07 : Règle de sécurité non négociable : les données financières (TJM, prix total, montants) restent strictement masquées (`null` ou masquées) pour les utilisateurs non autorisés (`COLLABORATOR`, `MANAGER`).
- [x] CA-08 : Internationalisation FR/EN complète et tests automatisés (backend et frontend) 100% au vert.

## 3. Contexte analysé

- [x] Fichiers et comportement existants inspectés : `ProjectStore.java`, `ProjectController.java`, `ProjectWorkbook.java`, `BillingService.java`, `BillingExportService.java`, `UserAdministrationService.java`, `UserAdminController.java`, `projects-page.component.ts`, `users-page.component.ts`, `billing-page.component.ts`.
- [x] Impacts API/data/UI identifiés :
  - DB : Colonnes `budget_days NUMERIC(10,2)`, `total_price NUMERIC(12,2)`, `currency VARCHAR(10) NOT NULL DEFAULT 'EUR'` sur `project`.
  - API : Endpoints CRUD projet sécurisés sous `/api/v1/admin/projects`. Extension des DTO user admin avec `dailyRate`.
  - UI : Modale d'édition/création projet sur `/projets`, sélecteur de devise, champ TJM dans `/admin/utilisateurs`, devises et jauges de budget dans `/facturation`.
- [x] Sécurité analysée : `@PreAuthorize("hasAnyRole('ADMIN', 'DIRECTION')")` sur la modification des projets et l'exposition des données financières.
- [x] Tests existants vérifiés : 140 tests backend et 14 tests frontend passants.

## 4. Plan d'action

- [x] 1. Migration Flyway `V8__project_budget_currency.sql`.
- [x] 2. Backend - Extension `ProjectStore` et `ExcelProject` / `ProjectWorkbook` (colonnes budget, devise, TJM).
- [x] 3. Backend - Endpoints d'administration des projets (`POST` et `PUT /api/v1/admin/projects`).
- [x] 4. Backend - Exposition du TJM collaborateur dans `UserAdminController` et `UserAdministrationService`.
- [x] 5. Backend - Intégration de la devise dynamique et du suivi budgétaire dans `BillingService` et `BillingExportService`.
- [x] 6. Frontend - Service et composants Angular pour l'édition/création de projet (`ProjectService`, `ProjectFormComponent`, volet d'édition dans `projects-page`).
- [x] 7. Frontend - Champ TJM dans `users-page.component.ts` et `user-form.component.ts`.
- [x] 8. Frontend - Affichage devise dynamique et indicateurs de budget dans `billing-page.component.ts` et `projects-page.component.ts`.
- [x] 9. i18n FR/EN des nouveaux libellés (devises, budget temps, budget financier, etc.).
- [x] 10. Tests unitaires et d'intégration backend & tests frontend (140 backend tests, 14 frontend tests).
- [x] 11. Mise à jour de la documentation (`PROJECT-TRACKING.md`, `CHANGELOG.md`).

## 5. Implémentation

- **Flyway Migration** : `V8__project_budget_currency.sql` ajoute `budget_days NUMERIC(10,2)`, `total_price NUMERIC(12,2)` et `currency VARCHAR(10) NOT NULL DEFAULT 'EUR'` sur la table `project`.
- **Backend Persistence & Domain** :
  - `ProjectStore` étendu avec `create`, `update`, support des nouvelles colonnes et `COALESCE` non destructif lors des imports.
  - `ExcelProject` et `ProjectWorkbook` enrichis : support transparent des fichiers à 4 colonnes (historiques) ou 8 colonnes (avec TJM, Jours budget, Budget total, Devise).
  - `SecurityConfig` autorise `/api/v1/admin/projects/**` pour `ADMIN` et `DIRECTION`.
  - `ProjectController` et `ProjectService` implémentent la création/mise à jour et le masquage financier strict (`dailyRate` et `totalPrice` masqués pour Collaborateur/Manager).
- **Administration Collaborateurs** :
  - `dailyRate` exposé dans `UserSummary`, `UserProfileChange`, `UserAdministrationService`, `UserDirectoryService`, `UserAdminController`.
- **Facturation Multi-Devise & Budget** :
  - `ProjectBillingItem` enrichi avec `budgetDays`, `totalPrice`, `currency`.
  - `BillingExportService` génère des colonnes dynamiques avec la devise spécifique du projet et la consommation budgétaire.
- **Frontend** :
  - `ProjectFormComponent` (`tf-project-form`) pour créer et éditer des projets (nom, statut actif/facturable, devise prédéfinie ou personnalisée, budget jours, TJM, prix global, suggestion de calcul croisé).
  - `ProjectsPageComponent` avec volet latéral d'édition, badges de budget et de devise, bouton « Nouveau projet ».
  - `BillingPageComponent` avec colonne de suivi budgétaire (ratio consommé/prévu et barre de progression dynamique colorée), affichage de la devise réelle du projet.
  - `UserFormComponent` et `UsersPageComponent` avec champ TJM collaborateur et affichage dans la liste desktop et mobile.
  - Internationalisation complète FR/EN dans `fr.ts` et `en.ts`.

## 6. Tests et vérifications

- [x] Unit tests : 140 tests backend (`mvn clean test`) réussis avec 0 échec.
- [x] Integration tests : `ProjectSecurityTest`, `UserAdminSecurityTest`, `BillingExportServiceTest` vérifiant les permissions RBAC et le masquage financier.
- [x] UI/component tests : `npm test` dans `frontend` (14/14 tests réussis, vérification statique i18n sans texte non traduit).
- [x] Security checks : Contrôles d'habilitation `@PreAuthorize` stricts, masquage de `dailyRate` et `totalPrice` pour les utilisateurs non autorisés.
- [x] Regression checks : Rétrocompatibilité totale de l'import/export Excel et de la synchronisation Azure DevOps.

## 7. Documentation

- [x] PROJECT-TRACKING mis à jour
- [x] CHANGELOG mis à jour
- [x] ADR ajouté si nécessaire (Non requis, respecte l'architecture existante)

## 8. Statut

Status: DONE
