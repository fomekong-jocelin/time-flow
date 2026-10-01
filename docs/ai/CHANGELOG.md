# Changelog

Format inspiré de Keep a Changelog. Versioning Semantic Versioning.

## [Unreleased]

### Added

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
