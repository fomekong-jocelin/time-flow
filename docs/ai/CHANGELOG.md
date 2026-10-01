# Changelog

Format inspiré de Keep a Changelog. Versioning Semantic Versioning.

## [Unreleased]

### Added

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
