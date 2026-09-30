# Changelog

Format inspiré de Keep a Changelog. Versioning Semantic Versioning.

## [Unreleased]

### Added

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

### Fixed

- Connexion : le bouton restait désactivé sans message quand l'email était incomplet (ex. `admin` pré-rempli par le navigateur) ; erreurs désormais affichées sous chaque champ.
- UI connexion / Mes temps : contraste de l'avertissement SSO, états désactivés, état vide, fond bleu de l'autocomplétion Chrome.
- Alignement Angular 22.2 / TypeScript 6.0 pour corriger l'erreur npm `ERESOLVE`.

### Security

- Politique backend deny-by-default au bootstrap ; seule la sonde de santé est publique.
- Session serveur HttpOnly : aucun access token OAuth n'est stocké dans le navigateur.
- CSRF activé, Argon2id pour les mots de passe locaux et verrouillage temporaire après échecs répétés.
- Liaison automatique entre identité SSO et locale interdite.
- Aucun mot de passe administrateur par défaut n'est codé en dur dans le dépôt ; le secret initial est généré avec `SecureRandom`.
- Le bootstrap local ne modifie jamais le mot de passe d'un compte existant.
- Le rôle PostgreSQL local n'obtient aucun privilège SUPERUSER, CREATEDB, CREATEROLE ou REPLICATION.
