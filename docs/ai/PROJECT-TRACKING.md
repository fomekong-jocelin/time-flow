# PROJECT TRACKING — TimeFlow

## Statut global

| Champ | Valeur |
|---|---|
| Dernière mise à jour | 2026-10-01 |
| Phase | Module Formations : Catalogue, planification des sessions, formateurs et participants (TICKET-0006) |
| État | DONE |
| Cible V1 | Sync projets Azure DevOps + saisie hebdomadaire + validation + reporting de base |
| Risque actuel | Parcours SSO à valider avec une App Registration Microsoft Entra réelle |

## Backlog initial

| ID | GitHub | Sujet | Statut | Priorité |
|---|---:|---|---|---|
| TICKET-0001 | PR #6 | Bootstrap architecture + gouvernance | DONE | P0 |
| TICKET-0002 | #1 (PR #8) | Authentification hybride et rôles | DONE | P0 |
| TICKET-0003 | #2 (PR #9) | Catalogue projets + Azure DevOps + import/export Excel | DONE | P0 |
| TICKET-0004 | #3 + #4 (PR #11) | Feuille de temps / CRA API + UI | DONE | P0 |
| TICKET-0005 | #5 (PR #12) | Validation manager | DONE | P0 |
| TICKET-0006 | à créer | Formations | DONE | P1 |
| TICKET-0007 | à créer | Dashboard / reporting (KPI, TACE, OT, Projets, Équipe) | DONE | P1 |
| TICKET-0008 | à créer | Exports / préparation facturation (avec masquage financier TJM/prix) | DONE | P1 |
| TICKET-0009 | PR #8 | Application de la charte visuelle v0.1 | DONE | P1 |
| TICKET-0010 | PR #10 | Gestion des utilisateurs SSO + locaux (rôle, manager, temps théorique, activation) | DONE | P0 |
| TICKET-0011 | à créer | Groupes de configuration du temps de travail & paramètres dynamiques (Work Schedules) | DONE | P0 |
| TICKET-0012 | à créer | Refonte mobile responsive, zéro coupure texte, Jours Fériés et OT/ET (Overtime & Extra Time) | DONE | P0 |
| TICKET-0013 | à créer | Composants UI réutilisables, optimisation de l'espace et refonte mobile des tableaux | DONE | P0 |
| TICKET-0014 | à créer | Thème Clair / Sombre (Light/Dark/System) & Internationalisation (i18n FR/EN) | DONE | P0 |
| TICKET-0015 | à créer | Refonte du rendu Analytics épuré (Donut SVG, Tendance des heures, KPI visuels, mise en page sans redondance) | DONE | P0 |
| TICKET-0016 | à créer | Filtrage multi-critères (qui, projet, quand, sommes en temps réel) & réactivité mobile (Manager/Admin) | DONE | P0 |
| TICKET-0017 | à créer | Configuration du budget projet (jours globaux, prix/forfait), TJM et devises configurables (€, $, XAF...) | DONE | P0 |

## Décisions actées

- Authentification hybride : SSO Entra ID pour internes + comptes locaux pour externes.
- Modèle BFF/session : aucun access token OAuth dans le SPA.
- Inscription publique désactivée.
- Type de compte exclusif SSO **ou** local ; un ADMIN peut pré-provisionner un compte SSO, lié à la première connexion uniquement depuis le tenant `ENTRA_TENANT_ID` (TICKET-0010).
- Aucun compte n'est supprimé : désactivation uniquement, sessions révoquées.
- Charte visuelle v0.1 appliquée au frontend (TimeFlow by INDYLI, palette Indigo/Violet/Teal, Inter, Dark Mode).
- Configuration dynamique des temps de travail (TICKET-0011) : profils configurables (jours ouvrés, volume hebdo/journalier, plafonds légaux, autorisation week-end), affectation aux collaborateurs et adaptation dynamique de la saisie CRA.
- Préparation de la facturation & exports de contrôle (TICKET-0008) : conversion heures en jours facturés (base 420 min / 7h), agrégation par projet et par collaborateur, classeur Excel multi-onglets (Apache POI) et export CSV. Cloisonnement strict de la confidentialité financière (Backend maître) : TJM, TH, coûts et montants HT exposés uniquement pour DIRECTION et ADMIN ; strictement masqués et omis pour MANAGER et COLLABORATOR.
- Pilotage budgétaire et multi-devises par projet (TICKET-0017) :
  - Configuration de budget temps (`budget_days`), prix/forfait total (`total_price`), TJM négocié (`daily_rate`) et devise personnalisable (`currency`, ex: EUR, USD, XAF, GBP, CHF, CAD...).
  - Création et modification de projets par les profils autorisés (`ADMIN`, `DIRECTION`) via IHM et API REST (`POST / PUT /api/v1/admin/projects`).
  - TJM de référence collaborateur (`app_user.daily_rate`) administrable dans `/admin/utilisateurs`.
  - Suivi budgétaire en temps réel sur la page de facturation (jauge de consommation jours et montants) et dans les exports Excel/CSV avec la devise réelle du projet.
  - Masquage financier backend absolu : `COLLABORATOR` et `MANAGER` ne reçoivent jamais de TJM ni de prix projet (`null`).
- Module Formations (TICKET-0006) :
  - Tables `training_session` et `training_participant` via migration Flyway `V9__training_sessions.sql`.
  - Typologies de formation (Interne / Client), modalités (Présentiel, Distanciel, Hybride), planification avec statut (Planifiée, En cours, Terminée, Annulée).
  - Contrôle d'accès RBAC : Admin et Direction pilotent le catalogue, créent, éditent et suppriment les sessions. Les formateurs (`TRAINER`) accèdent à leurs sessions et mettent à jour les présences (`ATTENDED`, `CANCELLED`). Les collaborateurs et managers consultent le catalogue et gèrent leurs inscriptions / désinscriptions.
  - Interface Angular sous `/formations` avec tableau de bord KPI, filtres multi-critères, catalogue en grille de cartes responsives, jauges d'inscriptions et modales dédiées.

## Décisions produit encore ouvertes

- Projet seul ou Work Item Azure DevOps dès V1.
- Règle de validation : manager, chef de projet ou double validation (hypothèse TICKET-0010 : manager direct `app_user.manager_id`).
- Périodicité hebdomadaire uniquement ou mensuelle également.
