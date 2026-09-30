# TICKET-0002 — Authentification hybride SSO + locale (#1)

## 1. Objectif

Fournir une authentification sécurisée adaptée aux collaborateurs internes et aux intervenants externes.

## 2. Critères d'acceptation

- [x] Architecture BFF/session documentée.
- [x] OIDC Microsoft Entra ID intégré côté backend.
- [x] Login local email/mot de passe implémenté.
- [x] Les deux modes de connexion sont toujours visibles dans l'interface.
- [x] Le bouton SSO indique clairement lorsqu'Entra n'est pas configuré dans l'environnement.
- [x] Premier administrateur local créé automatiquement au premier démarrage.
- [x] Email admin par défaut : `admin@indyli-services.com`.
- [x] Mot de passe initial généré avec `SecureRandom` et affiché une seule fois dans la console.
- [x] Aucun mot de passe administrateur n'est codé en dur dans Git.
- [x] Argon2id configuré.
- [x] Verrouillage après tentatives répétées implémenté.
- [x] Endpoint `/api/v1/auth/me` disponible.
- [x] CSRF et logout session configurés.
- [x] RBAC backend ADMIN sur `/api/v1/admin/**`.
- [x] Provisioning explicite d'un compte local par un administrateur.
- [x] Écran Angular hybride SSO + login local.
- [x] Route guard sans stockage de token dans le navigateur.
- [x] Test unitaire du login local ajouté.
- [x] Angular 22.2 aligné avec TypeScript 6.0 pour corriger `ERESOLVE`.
- [x] Option TypeScript dépréciée `baseUrl` supprimée au lieu de masquer l'avertissement TS5101.
- [x] Dépendance Bouncy Castle explicitement versionnée pour le support Argon2.
- [x] Node 24 LTS documenté via `.nvmrc`.
- [x] Script PostgreSQL local ajouté pour créer `timeflow` et ses droits.
- [ ] Tests d'intégration Spring Security exécutés.
- [ ] Parcours SSO validé avec un vrai App Registration Entra.
- [ ] Build Maven/Angular exécuté avec succès sur environnement développeur.

## 3. Sécurité analysée

- [x] Aucun token OAuth remis au SPA.
- [x] Aucun secret Entra dans le code.
- [x] Aucun mot de passe bootstrap réel dans le dépôt.
- [x] Le bootstrap ne modifie jamais le mot de passe d'un compte déjà existant.
- [x] Le mot de passe initial n'est affiché que lors de la création effective du compte.
- [x] Pas d'auto-liaison par email entre deux providers.
- [x] Inscription publique désactivée.
- [x] Session fixation prise en compte.
- [x] Erreur d'identifiants locale générique.
- [x] Rôle PostgreSQL local créé sans SUPERUSER, CREATEDB, CREATEROLE ni REPLICATION.

## 4. Reste à faire

- Rejouer `npm install`, `npm run build` et `npm test` avec Node 24 LTS.
- Rejouer `mvn test` puis `mvn spring-boot:run` depuis le dossier `backend`.
- Récupérer dans la console le mot de passe initial de `admin@indyli-services.com` lors du premier démarrage.
- Corriger tout défaut de compilation ou de démarrage remonté par ces commandes.
- Valider les Redirect URIs dans Entra ID.
- Ajouter le parcours invitation/réinitialisation de mot de passe (#7).
- Ajouter une limitation distribuée par IP si l'application est exposée publiquement à forte volumétrie.
- Ajouter des tests d'intégration avec PostgreSQL/Testcontainers lorsque le build est disponible.

## 5. Statut

Status: IN_PROGRESS
