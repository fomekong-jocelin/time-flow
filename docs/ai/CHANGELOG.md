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
- Bootstrap sécurisé du premier administrateur local par variables d'environnement.
- Script PostgreSQL idempotent pour créer la base `timeflow` et le rôle applicatif local.
- `.nvmrc` pour standardiser le frontend sur Node 24 LTS.

### Fixed

- Alignement Angular 22.2 / TypeScript 6.0 pour corriger l'erreur npm `ERESOLVE`.

### Security

- Politique backend deny-by-default au bootstrap ; seule la sonde de santé est publique.
- Session serveur HttpOnly : aucun access token OAuth n'est stocké dans le navigateur.
- CSRF activé, Argon2id pour les mots de passe locaux et verrouillage temporaire après échecs répétés.
- Liaison automatique entre identité SSO et locale interdite.
- Aucun mot de passe administrateur n'est codé en dur dans le dépôt.
- Le bootstrap local ne modifie jamais un compte existant et doit être désactivé après l'initialisation.
- Le rôle PostgreSQL local n'obtient aucun privilège SUPERUSER, CREATEDB, CREATEROLE ou REPLICATION.
