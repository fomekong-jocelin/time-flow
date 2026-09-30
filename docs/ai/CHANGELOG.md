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
- Provisioning administrateur des comptes locaux.

### Security

- Politique backend deny-by-default au bootstrap ; seule la sonde de santé est publique.
- Session serveur HttpOnly : aucun access token OAuth n'est stocké dans le navigateur.
- CSRF activé, Argon2id pour les mots de passe locaux et verrouillage temporaire après échecs répétés.
- Liaison automatique entre identité SSO et locale interdite.
