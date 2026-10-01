# ADR-0002 — Authentification hybride SSO + compte local

Date : 2026-09-30
Statut : Accepted

## Contexte

TimeFlow est utilisé par des collaborateurs internes mais aussi par des formateurs, consultants et intervenants externes. Imposer un compte Microsoft à tout le monde serait inutilement contraignant, tandis qu'une authentification locale unique ferait perdre les bénéfices du SSO d'entreprise.

## Décision

Adopter deux fournisseurs d'identité derrière une session TimeFlow unique :

1. **Microsoft Entra ID / OpenID Connect** pour les collaborateurs internes.
2. **Email + mot de passe local** pour les externes explicitement provisionnés par un administrateur.

Le navigateur suit un modèle **BFF** : Spring Boot réalise l'échange OAuth/OIDC, conserve les informations d'authentification côté serveur et ne remet au navigateur qu'un cookie de session `HttpOnly`. Aucun access token n'est stocké dans `localStorage` ou `sessionStorage`.

Les sessions sont persistées en PostgreSQL via Spring Session JDBC afin de permettre plusieurs instances applicatives sans session sticky.

## Contrôles de sécurité

- CSRF compatible SPA avec protection BREACH pour les réponses et acceptation du token brut envoyé par Angular dans l'en-tête.
- Cookie de session HttpOnly, Secure en production et SameSite=Lax.
- Rotation de l'identifiant de session lors du login local ; Spring Security gère la fixation de session OIDC.
- Mots de passe locaux hashés avec Argon2id.
- Verrouillage temporaire après échecs répétés.
- Messages d'échec local génériques afin de limiter l'énumération des comptes.
- RBAC toujours appliqué côté backend.
- Liaison automatique SSO/local par email interdite ; `(provider, subject)` est la clé d'identité.
- Inscription publique désactivée.

## Conséquences

- L'expérience interne reste fluide avec SSO.
- Les intervenants externes n'ont pas besoin d'un tenant Microsoft.
- Aucun jeton OAuth n'est exposé au JavaScript applicatif.
- Une fonctionnalité d'invitation / réinitialisation de mot de passe devra compléter la V1 avant un déploiement externe à grande échelle.
