# TICKET-0007 — Tableau de bord d'Analyses & Reporting (KPI, TACE, OT/ET, Projets, Équipe)

## Contexte & Objectifs

L'application TimeFlow permet la saisie hebdomadaire des temps par les collaborateurs, la configuration des régimes de travail (35h, Cadre 38h30, Partiel, etc.), le calcul des heures supplémentaires (OT) et complémentaires (ET), ainsi que la validation hiérarchique par les managers.

Cependant, il n'existait pas encore de module d'**Analyses & Reporting** permettant de valoriser ces données pour :
1. **Mesurer la performance opérationnelle et la rentabilité (ESN / Conseil)** :
   - Calculer le TACE (Taux d'Activité Congés Exclus / Taux de Facturabilité).
   - Suivre la répartition du temps : Heures facturables client vs Heures internes/support vs Formations vs Congés/Absences.
2. **Piloter les Heures Supplémentaires (OT) et Complémentaires (ET)** :
   - Volume total d'heures au-delà des plafonds normaux par période pour arbitrage Paie ou RTT.
3. **Restituer la vue par Projet et par Collaborateur** :
   - Quels projets consomment le plus de ressources ?
   - Quel est le taux de facturabilité et la charge de travail par collaborateur ?
4. **Cloisonnement strict et permissions selon le profil (DDD / Sécurité deny-by-default)** :
   - `COLLABORATOR` : accès exclusif à son propre tableau de bord personnel.
   - `MANAGER` : accès aux statistiques consolidées de son équipe directe (collaborateurs rattachés par `manager_id`) ainsi que ses propres temps.
   - `ADMIN` / `DIRECTION` : accès à l'ensemble des données d'entreprise avec filtres multi-critères.
5. **Expérience utilisateur moderne & Mobile-First** :
   - Utilisation de notre kit de composants partagés (`tf-kpi-card`, `tf-avatar`, `tf-status-badge`).
   - Visualisations proportionnelles (barres de progression et jauges épurées).
   - Double affichage Desktop (tableau sans coupure) et Mobile (cartes tactiles ergonomiques).

## Spécification Technique

### Backend (`cm.indyli.timeflow.analytics`)
- **Modèles de domaine & DTOs** :
  - `AnalyticsOverview` : `totalMinutes`, `billableMinutes`, `internalMinutes`, `leaveMinutes`, `overtimeMinutes`, `activityRate` (TACE %), `projectsBreakdown`, `activityTypesBreakdown`, `usersBreakdown`, `monthlyTrend`.
  - `ProjectBreakdownItem` : `projectId`, `projectName`, `totalMinutes`, `billableMinutes`, `sharePercentage`.
  - `ActivityBreakdownItem` : `activityType`, `totalMinutes`, `sharePercentage`.
  - `UserBreakdownItem` : `userId`, `displayName`, `email`, `totalMinutes`, `billableMinutes`, `overtimeMinutes`, `activityRate`.
  - `MonthlyTrendItem` : `month` (ex. `2026-10`), `label`, `totalMinutes`, `billableMinutes`, `activityRate`.
- **Service métier `AnalyticsService`** :
  - Contrôle des accès selon les rôles.
  - Calcul du TACE : `(billableMinutes * 100.0) / (totalMinutes - leaveMinutes)` (ou 0 si 0 min).
  - Détection des heures supplémentaires consolidées (OT).
- **Contrôleur REST `AnalyticsController`** :
  - `GET /api/v1/analytics/overview` avec paramètres de filtrage `period` (ex: `2026`, `2026-10`, `2026-Q4`), `userId`, `projectId`.
- **Tests** :
  - `AnalyticsServiceTest` (calcul TACE, agrégation, respect des règles).
  - `AnalyticsSecurityTest` (cloisonnement collaborateur / manager / admin).

### Frontend (`frontend/src/app/features/analytics`)
- Service `AnalyticsService` (`/api/v1/analytics/overview`).
- Composant `AnalyticsPageComponent` (`/analyses`) :
  - Sélecteur de période fluide (Mois courant, Mois précédent, Année).
  - 4 cartes KPI principales (`tf-kpi-card`) :
    1. TACE / Taux de facturabilité (avec jauge de couleur).
    2. Heures facturables client.
    3. Heures internes & formation.
    4. Heures supplémentaires (OT).
  - Synthèse visuelle de répartition par type d'activité.
  - Tableau / cartes de répartition par projet.
  - Tableau / cartes de répartition par collaborateur (réservé aux Managers, Direction et Admin).
- Intégration de la route `/analyses` dans `app.routes.ts` et activation dans `AppShellComponent`.
