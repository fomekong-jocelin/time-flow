# TICKET-0008 — Préparation de la Facturation & Exports de Contrôle (Excel / CSV)

## Contexte & Objectifs

Après la saisie et la validation managériale des feuilles de temps (CRA), l'étape suivante de la chaîne de valeur consiste à préparer les éléments de facturation client et les synthèses d'activité de l'équipe :
1. **Préparation de la facturation par Projet / Client** :
   - Agrégation des volumes d'heures et conversion en **jours facturés**.
   - Calcul des montants facturables si le rôle dispose des habilitations financières.
2. **Synthèse d'activité par Collaborateur** :
   - Suivi des heures normales, heures supplémentaires (OT) et jours imputés.
3. **Exports de contrôle (Excel `.xlsx` & CSV)** :
   - Export comptable et opérationnel permettant d'extraire les données consolidées par projet ou par collaborateur.

---

## 🔒 Règle Non Négociable de Confidentialité Financière (TJM / TH / Coûts / Prix)

> **Exigence explicite de l'utilisateur :**
> *"ce n'est pas tous les profils qui verront les données de paie, notamment le TJ, ou TH ou les coûts ; ils peuvent voir les jours facturés mais pas le prix"*

### Matrice d'habilitation et cloisonnement (Backend maître)

| Rôle | Périmètre visualisé | Jours facturés & Heures | TJM / TH / Prix / Montant HT | Export Excel / CSV |
|---|---|---|---|---|
| **DIRECTION** | Tous les projets & collaborateurs | ✅ Oui | ✅ **Visible** | ✅ Avec colonnes financières |
| **ADMIN** | Tous les projets & collaborateurs | ✅ Oui | ✅ **Visible** | ✅ Avec colonnes financières |
| **MANAGER** | Projets & subordonnés directs uniquement | ✅ Oui | ❌ **MASQUÉ (non exposé par l'API)** | ✅ **SANS colonnes financières** |
| **COLLABORATOR** | Ses propres temps validés | ✅ Oui | ❌ **MASQUÉ** | ❌ Non éligible ou sans finances |

### Sécurité Deny-by-Default
- **Au niveau API REST** :
  - Les DTOs (`BillingProjectSummary`, `BillingUserSummary`) ne contiennent pas les champs `dailyRate`, `hourlyRate`, `totalAmount` ou les renvoient à `null` si le demandeur n'a pas le rôle `DIRECTION` ou `ADMIN`.
- **Au niveau Génération Excel & CSV** :
  - Le service d'export backend inspecte les autorités de l'utilisateur connecté (`principal.role()`).
  - Si l'utilisateur n'a pas les droits financiers, les colonnes *"TJM (€)"*, *"Taux Horaire (€)"*, et *"Montant Total HT (€)"* **ne sont pas créées dans le classeur Excel ni dans le CSV**.

---

## Spécification Technique

### 1. Base de données & Modèle
- Migration Flyway `V7__billing_rates_and_locking.sql` :
  - Ajout de `daily_rate NUMERIC(10,2)` sur la table `project` (TJM négocié sur le projet).
  - Ajout de `daily_rate NUMERIC(10,2)` sur la table `app_user` (TJM / Coût de référence du collaborateur).
- Statut des feuilles pris en compte pour la facturation : `VALIDATED` et `LOCKED`.

### 2. Backend (`cm.indyli.timeflow.billing`)
- **Package `cm.indyli.timeflow.billing`** :
  - `application.BillingService` :
    - `getProjectBillingSummary(principal, period, clientId, projectId)`
    - `getUserBillingSummary(principal, period, userId)`
    - Conversion heures -> jours facturés : `billableMinutes / 420.0` (base 7h standard ou selon régime).
    - Calcul du montant : `billableDays * dailyRate` (uniquement pour `DIRECTION` et `ADMIN`).
  - `application.BillingExportService` :
    - Génération de classeur Excel multi-onglets (`Apache POI`) :
      - Onglet 1 : Synthèse par Projet / Mission.
      - Onglet 2 : Synthèse par Collaborateur.
      - Onglet 3 : Détail des imputations validées.
    - Génération CSV.
    - Omission stricte des colonnes financières pour les non-autorisés.
  - `api.BillingController` :
    - `GET /api/v1/billing/projects`
    - `GET /api/v1/billing/users`
    - `GET /api/v1/billing/export/excel`
    - `GET /api/v1/billing/export/csv`
  - Tests unitaires et d'intégration sécurisés.

### 3. Frontend (`frontend/src/app/features/billing`)
- Page `/facturation` (ou sous-espace accessible selon rôle) :
  - Filtre par Période (Mois, Trimestre, Année), Client, Projet, Collaborateur.
  - Cartes KPI synthétiques : Total jours facturés, Total heures saisies, Projets facturables, et si autorisé (`DIRECTION`/`ADMIN`) : Montant Total HT.
  - Tableau à onglets : « Synthèse par Projet » et « Synthèse par Collaborateur ».
  - Conditionnement strict de l'affichage des colonnes TJM / Prix via Signals (`canViewFinancials()`).
  - Boutons d'export « Télécharger Excel (.xlsx) » et « Télécharger CSV ».
- Traductions FR/EN complètes sans aucun texte en dur.

---

## Définition de Terminé (DoD)
- [x] 1. Migration Flyway `V7__billing_rates.sql` exécutée et compatible PostgreSQL + H2 (`daily_rate` sur `project` et `app_user`).
- [x] 2. Calcul des jours facturés (base 420 min / 7h) et valorisation conditionnelle testés unitairement (13/13 tests backend passants, vérification stricte du masquage manager et calcul direction).
- [x] 3. Export Excel POI (3 onglets formatés) & CSV vérifiés avec et sans colonnes financières (aucun TJM ou montant généré pour les rôles non-autorisés).
- [x] 4. Interface Angular `/facturation` responsive desktop/mobile, bilingue, sans fuite de données financières dans les devtools ni le JSON de l'API.
- [x] 5. Changements tracés dans `PROJECT-TRACKING.md` et `CHANGELOG.md`.

