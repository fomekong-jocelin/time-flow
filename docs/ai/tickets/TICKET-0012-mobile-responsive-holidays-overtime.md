# TICKET-0012 — Refonte Responsive Mobile, Élimination des coupures de texte, Configuration des Jours Fériés et des OT/ET (Overtime & Extra Time)

## 1. Objectif

1. **Refonte Responsive & Expérience Mobile-App** :
   - Corriger les coupures de titres (ex: « Configuration du temps de travail » masqué par le header mobile) et les éléments brisés sur deux lignes (titres de colonnes `CIBLES (HEBDO / JOUR)`, `PLAFONDS LÉGAUX`, `WEEK-END` et boutons `Par défaut`).
   - Offrir sur mobile une ergonomie digne d'une application mobile moderne (cartes structurées, navigation fluide, actions tactiles) en évitant les tableaux horizontaux tronqués.
2. **Gestion des Jours Fériés** :
   - Permettre la configuration et consultation des jours fériés légaux français (11 jours) et d'entreprise.
   - Refléter automatiquement les jours fériés dans la saisie CRA collaborateur (« Mes temps ») avec badge visuel distinctif « Férié ».
3. **Gestion des OT (Overtime / Heures supplémentaires) & ET (Extra Time / Heures complémentaires)** :
   - Paramétrage précis des règles d'heures supplémentaires (**OT - Overtime**) : seuils hebdomadaires, tranches de majoration (Tranche 1 : +25%, Tranche 2 : +50%, Dimanche / Férié : +100%), mode de compensation (Paiement vs RTT/Récupération vs Hybride).
   - Paramétrage des heures complémentaires (**ET - Extra Time**) : autorisation, plafond max hebdomadaire, taux de majoration (+10%), mode de compensation.
   - Intégration par régime horaire et onglet dédié dans la configuration du temps de travail.

## 2. Critères d'acceptation

- [x] CA-01 : Migration Flyway `V6__holidays_and_overtime_extratime.sql` :
  - Création de la table `public_holiday` (`id UUID`, `holiday_date DATE UNIQUE`, `name VARCHAR`, `is_worked BOOLEAN`, `year INT`, `created_at`, `updated_at`).
  - Pré-remplissage des 11 jours fériés officiels français pour 2026 et 2027 (Jour de l'An, Pâques, 1er Mai, 8 Mai, Ascension, Pentecôte, 14 Juillet, 15 Août, Toussaint, 11 Novembre, Noël).
  - Ajout des colonnes OT & ET dans `work_schedule_profile` :
    - `overtime_threshold_minutes INT NOT NULL DEFAULT 2100` (seuil de déclenchement hebdo)
    - `overtime_rate_tier1 NUMERIC(4,2) NOT NULL DEFAULT 1.25` (+25%)
    - `overtime_rate_tier2 NUMERIC(4,2) NOT NULL DEFAULT 1.50` (+50%)
    - `overtime_rate_holiday NUMERIC(4,2) NOT NULL DEFAULT 2.00` (+100%)
    - `overtime_compensation_mode VARCHAR(20) NOT NULL DEFAULT 'PAY'`
    - `extra_time_allowed BOOLEAN NOT NULL DEFAULT TRUE`
    - `extra_time_max_weekly_minutes INT NOT NULL DEFAULT 420` (max 7h)
    - `extra_time_rate NUMERIC(4,2) NOT NULL DEFAULT 1.10` (+10%)
    - `extra_time_compensation_mode VARCHAR(20) NOT NULL DEFAULT 'PAY'`
- [x] CA-02 : Backend Jours Fériés & OT/ET :
  - Module `cm.indyli.timeflow.holidays` : `PublicHolidayEntity`, `PublicHolidayRepository`, `PublicHolidayService`, `PublicHolidayController` (`/api/v1/holidays`).
  - Sécurité et validation : `@PreAuthorize("hasAnyRole('DIRECTION', 'ADMIN')")` sur les mutations, `PublicHolidaySecurityTest`, `PublicHolidayServiceTest`.
  - Mise à jour de `WorkScheduleProfileEntity`, `WorkScheduleSummary`, `CreateWorkScheduleCommand`, `UpdateWorkScheduleCommand`, `WorkSchedulePolicy`.
  - Calcul et exposition des jours fériés dans l'aperçu du CRA collaborateur (`TimesheetOverview`).
- [x] CA-03 : Ergonomie Desktop & Zéro Coupure de texte :
  - Tous les en-têtes de colonnes du tableau des régimes horaires en `whitespace-nowrap` sur une seule ligne (`CIBLES (HEBDO / JOUR)`, `PLAFONDS LÉGAUX`, `WEEK-END`, `OT & ET`, `ACTIONS`).
  - Boutons d'actions horizontaux en `whitespace-nowrap` sans retour à la ligne sur « Par défaut ».
- [x] CA-04 : Ergonomie Mobile-App :
  - Correction de l'en-tête mobile dans `AppShellComponent` : décalage et espacement unifié sticky pour ne plus masquer le titre de page ni tronquer le contenu.
  - Vue mobile dédiée pour les régimes horaires sous forme de cartes d'application modernes (Linear/Pilot App style) remplaçant le tableau tronqué.
  - Cartes KPI réactives sans troncature disgracieuse.
  - Navigation mobile horizontale avec défilement fluide (`overflow-x-auto whitespace-nowrap`).
- [x] CA-05 : Intégration Jours Fériés et OT/ET dans l'UI :
  - Sous-onglets dans `/admin/configuration-temps` : « Régimes horaires », « Politiques OT & ET », « Jours fériés ».
  - Affichage automatique des badges « Férié » dans « Mes temps » (CRA) lors des semaines comportant des jours fériés.
  - Indicateur OT automatique dans le CRA dès que le temps saisi dépasse la cible contractuelle.
- [x] CA-06 : Tests et non-régression :
  - Tests unitaires et de sécurité MVC pour les jours fériés et OT/ET.
  - Compilation Angular et suite de tests backend 100% au vert (110 tests backend OK).

## 3. Statut

Status: DONE
