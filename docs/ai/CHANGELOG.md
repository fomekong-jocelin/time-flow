# Changelog

Format inspiré de Keep a Changelog. Versioning Semantic Versioning.

## [Unreleased]

### Added

- Configuration du budget projet (jours globaux, prix/forfait), TJM et devises configurables (€, $, XAF...) (TICKET-0017) :
  - **Modèle de données & Migration Flyway** :
    - Migration `V8__project_budget_currency.sql` ajoutant `budget_days NUMERIC(10,2)`, `total_price NUMERIC(12,2)` et `currency VARCHAR(10) NOT NULL DEFAULT 'EUR'` sur la table `project`.
  - **Administration des projets (API REST & Sécurité RBAC)** :
    - Endpoints sécurisés `POST /api/v1/admin/projects` et `PUT /api/v1/admin/projects/{id}` protégés par `@PreAuthorize("hasAnyRole('ADMIN', 'DIRECTION')")`.
    - Support complet de la création et modification des projets : nom, statut actif, facturable par défaut, TJM négocié, budget jours, prix total et devise.
    - Masquage financier strict côté backend : `dailyRate` et `totalPrice` sont automatiquement masqués (`null`) pour `COLLABORATOR` et `MANAGER` sur `GET /api/v1/projects`.
  - **TJM de référence collaborateur** :
    - Exposition de `dailyRate` sur `UserSummary` et `UserProfileChange` dans l'API d'administration des utilisateurs (`UserAdminController`).
    - Champ TJM de référence collaborateur dans le formulaire `UserFormComponent` et affichage dans la liste des utilisateurs desktop et mobile.
  - **Import / Export Excel non destructif** :
    - Support transparent dans `ProjectWorkbook` et `ExcelProject` des classeurs historiques à 4 colonnes ou étendus à 8 colonnes (avec TJM, Jours budget, Budget total, Devise).
    - `COALESCE` sur les colonnes financières et devise dans `ProjectStore.importExcel` préservant les configurations manuelles lors des réimports.
  - **Facturation multi-devises et suivi budgétaire** :
    - `ProjectBillingItem` enrichi de `budgetDays`, `totalPrice`, `currency`.
    - Remplacement des symboles en dur `€` par la devise réelle du projet (`EUR`, `USD`, `XAF`, `GBP`, `CHF`, `CAD`, etc.) dans les synthèses et exports Excel / CSV.
    - Suivi de la consommation budgétaire (jours et montants consommés vs budget, pourcentages et alertes de dépassement) dans l'IHM et les rapports.
  - **Interface utilisateur Angular** :
    - Nouveau composant `ProjectFormComponent` (`tf-project-form`) avec sélection de devises usuelles ou saisie libre de devises personnalisées, champs budget jours, TJM, prix total et aide au calcul croisé automatique (`jours × taux = total`).
    - Volet latéral escamotable de création et modification de projet dans `ProjectsPageComponent` avec badges visuels de budget, TJM et devises.
    - Colonne de suivi budgétaire avec barre de progression proportionnelle et colorée dans `BillingPageComponent`.
    - Tests automatisés : 140 tests backend réussis (`mvn clean test`), 14 tests frontend réussis (`npm test`), 0 avertissement i18n.


- Préparation de la facturation & exports de contrôle Excel/CSV avec cloisonnement financier strict (TICKET-0008) :
  - **Confidentialité financière non-négociable (Backend maître)** :
    - Règle stricte : Seules `DIRECTION` et `ADMIN` ont accès aux données financières (TJM négocié sur le projet, TJM de référence du collaborateur, valorisation et montants totaux HT).
    - Pour les rôles `MANAGER`, `COLLABORATOR` et `TRAINER`, les taux et montants sont obligatoirement `null` dans l'API REST et **strictement omis** des classeurs Excel et fichiers CSV générés par le serveur.
    - Bannière d'habilitation explicite dans l'interface informant l'utilisateur du masquage des données financières ou de l'activation du mode financier Direction.
  - **Modèle de données & Persistance** :
    - Migration Flyway `V7__billing_rates.sql` ajoutant la colonne `daily_rate NUMERIC(10,2)` sur les tables `project` et `app_user`.
    - Extension des entités JPA `AppUserEntity` et requêtes `ProjectStore` pour gérer le taux journalier.
  - **Moteur de calcul de facturation (`BillingService`)** :
    - Agrégation des feuilles de temps validées (`VALIDATED`) et verrouillées (`LOCKED`) sur la période demandée (Mois, Trimestre, Année, Semaine).
    - Conversion automatique des heures en **jours facturés** selon le standard de service (420 minutes = 1 jour, arrondi à 2 décimales).
    - Résolution hiérarchique du TJM effectif (taux négocié sur le projet en priorité, sinon taux de référence du collaborateur).
    - Synthèses consolidées par projet (`ProjectBillingItem`), par collaborateur (`UserBillingItem`) et détail ligne à ligne des imputations (`BillingDetailItem`).
  - **Générateur de classeur Excel multi-onglets & CSV (`BillingExportService`)** :
    - Génération de classeur Excel `.xlsx` via `Apache POI` avec 3 onglets formatés : « Synthèse Projets », « Synthèse Collaborateurs » et « Détail Imputations ».
    - En-têtes indigo stylisés, volet figé sur la ligne d'en-tête (`freezePane`), filtres automatiques activés et formattage numérique des heures, jours et devises.
    - Omission conditionnelle des colonnes financières pour les utilisateurs non habilités.
    - Export CSV encodé en UTF-8 avec BOM (`\uFEFF`) pour une compatibilité immédiate avec Microsoft Excel sur Windows/Mac, délimité par des points-virgules (`;`).
  - **API REST sécurisée (`BillingController`)** :
    - `GET /api/v1/billing/overview`, `GET /api/v1/billing/details`, `GET /api/v1/billing/export/excel`, `GET /api/v1/billing/export/csv`.
    - Protection `@PreAuthorize` et cloisonnement d'équipe managériale deny-by-default.
  - **Interface utilisateur Angular (`/facturation`)** :
    - Navigation accessible aux rôles habilités (`MANAGER`, `DIRECTION`, `ADMIN`) via `managerGuard`.
    - Sélecteur de période dynamique, volet de filtres multi-critères (Projet, Collaborateur).
    - 5 cartes KPI réactives (Jours facturés, Heures facturables, Projets actifs, Contributeurs, Montant Total HT si autorisé).
    - Navigation à 3 onglets (« Synthèse par Projet », « Synthèse par Collaborateur », « Détail des Imputations ») avec tableaux desktop lisibles et cartes ergonomiques sur mobile.
    - Boutons d'export Excel et CSV avec indicateurs de téléchargement.
    - Nouvelles icônes `receipt` et `download` dans `IconComponent`.
    - Traduction bilingue FR/EN complète (13/13 tests passants).

- Filtrage multi-critères des feuilles de temps et heures passées (qui, sur quel projet, quand, sommes en temps réel) et optimisation mobile (TICKET-0016) :
  - **Espace Validation & Contrôle (`/validation`)** :
    - Barre de filtres opérationnels combinant Statut (`À valider`, `Validées`, `Rejetées`, `Toutes`), Collaborateur/Subordonné (`userId`), Projet (`projectId`) et Semaine (`weekStart`).
    - 4 Cartes KPI réactives affichant en temps réel les sommes consolidées de la sélection active : Somme Heures Totales, Somme Facturable, TACE Moyen (%) et Nombre de feuilles filtrées.
    - Réinitialisation instantanée des filtres avec réactivité complète des Signals.
  - **Module Analytics & Reporting (`/analyses`)** :
    - Volet de filtres avancés (Collaborateur, Projet) interactif et escamotable via le bouton « Filtrer », avec badge dynamique du nombre de filtres actifs et bouton de réinitialisation.
    - Actualisation en temps réel de tous les indicateurs (KPIs, Donut SVG de distribution, Histogramme SVG de tendance, découpages Projets et Équipe) selon le périmètre sélectionné.
  - **Sécurité et cloisonnement hiérarchique strict (Backend master)** :
    - Exposition de `GET /api/v1/manager/timesheets/subordinates` : un Manager n'obtient que ses collaborateurs directs (`manager_id = manager.id`) et lui-même, tandis qu'Admin et Direction ont la visibilité complète.
    - Contrôle d'habilitation deny-by-default : toute tentative de requêter un collaborateur hors de son équipe directe renvoie une exception `AccessDeniedException` (403 Forbidden).
    - Filtrage des feuilles par projet (`targetProjectId`) basé sur la présence d'imputations sur le projet concerné.
  - **Ergonomie et robustesse mobile (« pro »)** :
    - Remplacement de la barre d'onglets Projets / Équipe sur mobile par un segmented control équilibré (`grid grid-cols-2`) avec libellés courts (`Projets (1)` / `Équipe (1)`), supprimant les débordements et coupures d'onglets.
    - Élimination des pilules de comptage écrasées sur deux lignes sur smartphone (`1 project(s) displayed`, `1 collab.`) en les masquant sur mobile (`hidden sm:inline-flex`) au profit du compteur déjà présent dans l'onglet.
    - Refonte aérée des cartes mobile pour chaque collaborateur et projet : nom complet enveloppé sans coupure (`break-words`), régime horaire en sous-titre clair, badge TACE préservé et bloc de métriques unifié à 3 colonnes (`Total`, `Facturable`, `OT`) lisible et sans empilements disgracieux.
    - Sécurisation des composants partagés `AvatarComponent` et `StatusBadgeComponent` contre le rognage.
  - **Internationalisation FR/EN** :
    - Nouveaux libellés pour les filtres, onglets courts et indicateurs de sommes traduits et testés (11/11 tests passants).

- Refonte du rendu Analytics & Reporting (Donut SVG, Tendance des heures, KPI visuels, mise en page épurée sans redondance) (TICKET-0015) :
  - Restitution visuelle moderne et épurée inspirée du design dashboard sombre (Linear/modern BI style) sans les doublons de graphiques.
  - Cartes KPI enrichies avec icônes distinctives en conteneurs arrondis (`%` pour le TACE, Document pour le facturable, Chapeau universitaire pour l'interne/formation, Horloge pour les OT) et sous-titres contextuels détaillés.
  - Graphique Donut SVG réactif pour la répartition globale des activités (`Overall Work Time Distribution`), avec affichage central du volume total et du taux de rentabilité, légende interactive et intégration de la synthèse Facturable vs Non-facturable sans second donut redondant.
  - Histogramme SVG dynamique de la tendance des heures (`Hours Trend`) avec graduation verticale en heures (0h-8h+), lignes repères en pointillés, barres quotidiennes avec coins arrondis, infobulles détaillées au survol et repères temporels lisibles (Oct 1, Oct 5, Oct 10...).
  - Calcul et agrégation backend de la tendance journalière `DailyTrendItem` dans `AnalyticsService` pour garantir que le backend demeure le maître des règles métier et des données.
  - Consommation par projet unifiée et non redondante avec barres de progression proportionnelles, références, heures facturables et préservation du bilan collaborateur pour les managers.
  - Support bilingue FR/EN intégral et adaptation réactive fluide aux thèmes clair et sombre.

- Internationalisation FR/EN et thèmes clair/sombre/système (TICKET-0014) :
  - Service i18n Angular réactif avec Signals, détection navigateur, persistance `timeflow-lang`, interpolation sûre et pipe `translate` standalone.
  - Dictionnaires FR/EN complets pour le shell, l’authentification, les CRA, la validation, les analyses, les utilisateurs, les projets, les régimes horaires et les jours fériés.
  - Traduction dynamique des notifications, erreurs codées backend, statuts, dates, nombres, libellés d’activités et calendriers sans rechargement.
  - Thème `light` / `dark` / `system` persistant dans `timeflow-theme`, écoute de `prefers-color-scheme`, amorçage anti-FOUC et contrôles accessibles dans le shell et la connexion.
  - Tests Node de cohérence des dictionnaires, interpolation, persistance, changements système, bootstrap, templates et formats localisés.

- Tableau de bord d'Analyses & Reporting (KPI, TACE, OT, Projets, Équipe) (TICKET-0007) :
  - Métriques de rentabilité et performance opérationnelle : calcul du TACE (Taux d'Activité Congés Exclus / Taux de Facturabilité), heures facturables, heures internes/support et suivi consolidé des heures supplémentaires (OT).
  - Répartition dynamique par projet avec part relative (%) et par collaborateur (temps total, facturable, OT et TACE individuel).
  - Contrôle d'accès et cloisonnement strict (DDD / Sécurité deny-by-default) : Collaborateur restreint à ses statistiques personnelles, Manager restreint à son équipe directe (`manager_id`) et à lui-même, Direction et Administrateurs avec vision globale multi-critères.
  - API REST `/api/v1/analytics/overview` supportant le filtrage par période (mois, trimestre, année), utilisateur et projet.
  - Interface Angular `/analyses` Mobile-First : intégration des composants partagés (`tf-kpi-card`, `tf-avatar`, `tf-status-badge`), sélecteur de période dynamique, barres d'activité proportionnelles, tables desktop sans coupure et cartes tactiles pour smartphones.

- Composants UI réutilisables & Expérience Mobile-First unifiée (TICKET-0013) :
  - Création de composants partagés dans `frontend/src/app/shared/ui/` : `AvatarComponent` (`tf-avatar`) avec génération automatique d'initiales et badge, `StatusBadgeComponent` (`tf-status-badge`) avec dot indicator et palette sémantique, et `KpiCardComponent` (`tf-kpi-card`) pour les métriques de synthèse.
  - Ajout de l'icône `x` (fermeture) dans `IconComponent`.
- Optimisation de l'espace et refonte du tableau Utilisateurs (TICKET-0013) :
  - Suppression de l'espace vide à droite : grille conditionnelle n'appliquant la colonne latérale que si le panneau d'édition est ouvert (`panel() !== null`), le tableau occupant 100% de la largeur disponible par défaut.
  - Vrai tableau HTML desktop (`hidden md:block`) sans troncature abusive : `whitespace-nowrap`, padding généreux, affichage intégral des noms de managers et des profils horaires (`Temps plein standard (35 h)`).
  - Vue mobile tactile native (`md:hidden`) avec cartes modernes Linear-style intégrant l'avatar, les statuts, les rôles, les régimes horaires et les boutons d'action au doigt.
  - Intégration de 3 cartes synthétiques KPI en en-tête et bouton « X » de fermeture du volet latéral.
- Refonte mobile de la Validation des temps / Espace Manager (TICKET-0013) :
  - Remplacement du tableau horizontal rigide (`min-w-[58rem]`) sur mobile par des cartes tactiles interactives adaptées aux smartphones (`md:hidden`).
  - Affichage direct sur mobile du collaborateur, de la semaine de soumission, des heures et de l'objectif, des alertes de conformité légale et des boutons d'approbation rapide (« Valider » / « Rejeter ») ou badge « Validation tierce ».
  - Adaptation responsive de la modale d'examen détaillé (`grid-cols-1 sm:grid-cols-3` pour les KPI et boutons enveloppés pour les écrans étroits).
- Amélioration de la liste des projets (`/projets`) sur mobile (TICKET-0013) : wrapping fluide des badges et éléments de métadonnées.

- Refonte Responsive Mobile & Expérience Mobile-App (TICKET-0012) :
  - Unification de l'en-tête mobile sticky et de la barre de navigation dans `AppShellComponent` avec défilement tactile fluide sans coupure de contenu ni masquage de titres.
  - Remplacement du tableau horizontal tronqué sur mobile par des cartes d'application modernes (Linear/Pilot App style) pour chaque régime horaire, intégrant nom, statut, jours ouvrés en pilules tactiles, indicateurs de cibles/plafonds et actions complètes.
  - Élimination des retours à la ligne intempestifs sur desktop (`whitespace-nowrap` sur l'ensemble des `<th>`, `<td>` et boutons d'action « Modifier », « Par défaut », « Activer/Désactiver »).
  - Navigation par sous-onglets dans `/admin/configuration-temps` : « Régimes horaires », « Politiques OT & ET », « Jours fériés ».
- Gestion des Jours Fériés légaux et d'entreprise (TICKET-0012) :
  - Modèle de données & Migration Flyway `V6__holidays_and_overtime_extratime.sql` créant la table `public_holiday` et pré-remplissant les 11 jours fériés légaux français pour 2026 et 2027.
  - API REST `/api/v1/holidays` avec endpoints de consultation par année et de gestion (création, modification, suppression, bascule Chômé/Travaillé) sécurisée pour `ADMIN` et `DIRECTION`.
  - Panneau d'administration dédié `PublicHolidaysPanelComponent` avec sélecteur d'année, compteurs de jours chômés/travaillés, tableau desktop et cartes mobiles.
  - Reflet automatique dans « Mes temps » (CRA) : badge violet « Férié » avec nom du jour férié en infobulle dans l'en-tête de colonne et surlignage des cellules de saisie.
- Configuration des OT (Overtime / Heures supplémentaires) et ET (Extra Time / Heures complémentaires) (TICKET-0012) :
  - Extension de `work_schedule_profile` pour héberger les règles OT (seuil de déclenchement hebdo, taux majoration tranche 1 à 25%, tranche 2 à 50%, dimanche/férié à 100%, mode de compensation Paiement/RTT/Hybride).
  - Extension pour les règles ET (autorisation, plafond hebdomadaire, majoration standard à 10%, mode de compensation).
  - Panneau dédié `OvertimePoliciesPanelComponent` avec vue comparative des règles OT/ET entre les régimes, et intégration dans la modale d'édition.
  - Détection automatique et affichage du badge « +X h OT » dans la synthèse KPI du CRA.
  - Suite de tests de sécurité et unitaires `PublicHolidaySecurityTest`, `PublicHolidayServiceTest`, et passage de la suite de tests backend à 110 tests 100% au vert.

- Configuration dynamique des temps de travail & régimes horaires (TICKET-0011) :
  - Modèle de données & Migration Flyway `V5__work_schedule_profiles.sql` créant la table `work_schedule_profile` et rattachant `work_schedule_profile_id` à la table `app_user`.
  - Profils par défaut pré-provisionnés du marché ESN/Conseil : Standard 35h, Cadre & RTT 38h30, Temps partiel 80% (mercredi libéré), Support & Astreinte (week-end autorisé).
  - Règles de domaine et invariants (`WorkSchedulePolicy`) : unicité de code/nom, cohérence des bornes de temps, au moins un jour ouvré, interdiction de désactiver le profil par défaut.
  - API REST d'administration `/api/v1/admin/work-schedules` : liste avec décompte des utilisateurs, création, mise à jour, passage en profil par défaut et activation/désactivation, protégée pour `ADMIN` et `DIRECTION` avec CSRF.
  - Endpoint collaborateur `/api/v1/work-schedules/me` et `/api/v1/users/me/work-schedule` permettant au SPA de récupérer le régime contractuel du collaborateur connecté.
  - Interface Angular `/admin/configuration-temps` : dashboard avec indicateurs synthétiques, tableau détaillé des régimes avec pilules de jours ouvrés interactives, modale de création/édition, bascule par défaut et activation/désactivation.
  - Affectation dans l'administration des utilisateurs (`/admin/utilisateurs`) : sélection du régime horaire dans le formulaire de création/édition et affichage du badge de régime dans la liste des utilisateurs.
  - Adaptation dynamique de « Mes temps » (CRA) : affichage explicite des jours non ouvrés (« Repos »), inputs de saisie stylisés pour les jours chômés, objectif hebdomadaire dynamique issu du profil et seuils d'alerte de conformité légale alignés sur le régime contractuel.
  - Icônes de navigation : ajout des icônes `sliders` et `calendar` à `IconComponent` et entrée « Configuration temps » dans le shell applicatif.
  - Tests unitaires et d'intégration : `WorkSchedulePolicyTest`, `WorkScheduleSecurityTest`, `WorkScheduleServiceTest` portant la suite backend à 99 tests automatisés sans régression.

- Conformité légale et plafonds du Code du travail (CRA) : plafonnement journalier strict à 12h max (`ABSOLUTE_MAX_DAILY_MINUTES = 720`), seuil d'alerte quotidienne à 10h (`STATUTORY_MAX_DAILY_MINUTES = 600`), plafond hebdomadaire dérogatoire à 60h (`ABSOLUTE_MAX_WEEKLY_MINUTES = 3600`) et seuil d'alerte hebdomadaire légal à 48h (`STATUTORY_MAX_WEEKLY_MINUTES = 2880`).
- Séparation des contrôles et principe des 4 yeux : détection automatique de `selfTimesheet`, masquage des boutons d'approbation sur sa propre feuille dans l'espace manager avec badge « Validation tierce requise », et exclusion de ses propres feuilles du compteur de tâches « À valider ».
- UX avancée Espace Manager : refonte de la colonne Actions en groupe horizontal ergonomique, affichage des initiales en avatar, badges des vrais noms de projets (au lieu du chiffre brut), badges d'alerte de conformité légale si > 48h ou > 10h/jour, modale d'examen avec différenciation des jours de repos (week-end).
- UX « Mes temps » (Collaborateur) : avertissement visuel immédiat en cas de dépassement hebdomadaire de 48h, contrainte `max="12"` sur les champs de saisie journalière.
- Validation manager des feuilles de temps (TICKET-0005) : API manager `/api/v1/manager/timesheets`, consultation des feuilles en attente avec périmètre d'équipe strict (ou organisationnel pour Direction/Admin), consultation détaillée par jour et projet, approbation (`VALIDATED`) et rejet (`REJECTED`) avec motif obligatoire (min 3 caractères).
- Traçabilité et historique de validation (TICKET-0005) : entité et table `timesheet_validation` conservant l'historique complet des décisions, horodatages et commentaires/motifs.
- Règles de garde de validation (TICKET-0005) : vérification de statut `SUBMITTED`, interdiction d'auto-validation par un manager sur sa propre feuille, validation stricte du périmètre d'équipe `app_user.manager_id`.
- Interface Angular « Validation » (TICKET-0005) : écran dédié `/validation` protégé par `managerGuard`, filtres par statut, tableau de synthèse d'équipe, modale d'examen détaillé des heures journalières par projet avec historique des décisions, actions de validation directe et rejet avec modale de saisie du motif.
- Shell applicatif (TICKET-0005) : ajout du lien « Validation » pour les rôles `MANAGER`, `DIRECTION` et `ADMIN`.
- Feuille de temps / CRA (TICKET-0004) : API hebdomadaire `/api/v1/timesheets`, consultation, sauvegarde de brouillon et soumission pour validation manager.
- Règles de garde et d'invariants (TICKET-0004) : validation du lundi obligatoire, dates d'entrées dans la semaine, plafond journalier à 24h et vérification de projet actif.
- Calcul dynamique des métriques CRA : total des heures saisies, heures facturables, heures internes, calcul par rapport au temps théorique hebdomadaire du profil.
- Interface « Mes temps » (TICKET-0004) : navigation de semaine interactive, grille de saisie réactive zoneless, modale d'ajout de projet/activité, gestion des statuts (brouillon, soumis, rejeté, validé, verrouillé) et affichage du motif de rejet manager.
- Icônes outline (TICKET-0004) : ajout des symboles `trash`, `chevron-left` et `chevron-right` à `IconComponent`.
- Gestion des utilisateurs (ADMIN) : liste SSO/locaux, création de compte local, pré-provisioning SSO, rôle, manager, temps hebdomadaire théorique, activation/désactivation, réinitialisation de mot de passe et déverrouillage des comptes locaux.
- Écran Angular `/admin/utilisateurs` réservé aux administrateurs.
- Migration V4 : type de compte, manager, contrainte de temps hebdomadaire, audit des actions d'administration.
- Catalogue Projets : recherche, filtre de disponibilité, états de chargement/erreur/vide et navigation mobile.
- API authentifiée du catalogue et synchronisation Azure DevOps réservée ADMIN avec CSRF.
- Import paginé par identifiant externe, conservation des paramètres de facturation et des historiques, audit des succès/échecs.
- Tests du client Azure, de l'orchestration d'import et des accès HTTP au catalogue/synchronisation.
- Import/export Excel des projets indépendant d'Azure : modèle de test, réimport par référence stable et export des sources externes dans un onglet de consultation.
- Validation des classeurs avant import transactionnel, audit Excel, limites de taille et refus des formules/macros/liens externes.

- Gouvernance IA TimeFlow.
- Architecture monorepo backend/frontend.
- Socle Spring Boot, PostgreSQL et Flyway.
- Socle Angular standalone, zoneless et Tailwind CSS v4.
- Première règle de domaine pour le workflow des feuilles de temps.
- Authentification hybride : SSO Microsoft Entra ID + comptes locaux externes.
- Écran de connexion TimeFlow avec choix SSO ou email/mot de passe.
- Affichage permanent des deux parcours de connexion : SSO Microsoft et compte TimeFlow.
- Provisioning administrateur des comptes locaux.
- Création automatique du premier administrateur local `admin@indyli-services.com` au premier démarrage avec mot de passe aléatoire affiché une seule fois dans la console.
- Script PostgreSQL idempotent pour créer la base `timeflow` et le rôle applicatif local.
- `.nvmrc` pour standardiser le frontend sur Node 24 LTS.
- Charte visuelle v0.1 : logo SVG TimeFlow by INDYLI (symbole, icône app, favicon), design tokens, Dark Mode, police Inter auto-hébergée, icônes outline.
- Shell applicatif avec navigation latérale, utilisateur connecté et déconnexion.

### Changed

- `POST /api/v1/admin/users/local` : champs optionnels `managerId` et `weeklyTargetMinutes`, réponse enrichie (`accountType`, `managerId`, `weeklyTargetMinutes`) ; contrat existant conservé.

### Fixed

- Injection Spring : suppression des constructeurs multiples sur `UserDirectoryService` et `UserAdministrationService` éliminant l'erreur `No default constructor found` au démarrage de l'application.
- Connexion : le bouton restait désactivé sans message quand l'email était incomplet (ex. `admin` pré-rempli par le navigateur) ; erreurs désormais affichées sous chaque champ.
- UI connexion / Mes temps : contraste de l'avertissement SSO, états désactivés, état vide, fond bleu de l'autocomplétion Chrome.
- Alignement Angular 22.2 / TypeScript 6.0 pour corriger l'erreur npm `ERESOLVE`.

### Security

- Révocation des sessions serveur d'un utilisateur désactivé, changé de rôle ou dont le mot de passe est réinitialisé.
- Liaison d'un compte SSO pré-provisionné limitée au tenant Entra configuré ; jamais de liaison d'un compte local.
- Règles de garde : pas d'auto-désactivation/rétrogradation, au moins un ADMIN actif, hiérarchie sans cycle.
- Politique backend deny-by-default au bootstrap ; seule la sonde de santé est publique.
- Session serveur HttpOnly : aucun access token OAuth n'est stocké dans le navigateur.
- CSRF activé, Argon2id pour les mots de passe locaux et verrouillage temporaire après échecs répétés.
- Liaison automatique entre identité SSO et locale interdite.
- Aucun mot de passe administrateur par défaut n'est codé en dur dans le dépôt ; le secret initial est généré avec `SecureRandom`.
- Le bootstrap local ne modifie jamais le mot de passe d'un compte existant.
- Le rôle PostgreSQL local n'obtient aucun privilège SUPERUSER, CREATEDB, CREATEROLE ou REPLICATION.
