# TICKET-0010 — Gestion des utilisateurs SSO + locaux

## 1. Objectif

Permettre à un administrateur de gérer les comptes utilisés par les feuilles de temps (TICKET-0004) et la validation manager (TICKET-0005), qu'ils se connectent par SSO Microsoft Entra ID ou par compte local TimeFlow.

## 2. Critères d'acceptation

- [x] CA-01 : un ADMIN liste tous les utilisateurs avec type de compte (SSO / local), rôle, statut, manager, temps hebdomadaire théorique, dernière connexion, verrouillage et liaison SSO.
- [x] CA-02 : un ADMIN crée un compte local (contrat `POST /api/v1/admin/users/local` conservé, champs `managerId` / `weeklyTargetMinutes` optionnels ajoutés).
- [x] CA-03 : un ADMIN pré-provisionne un utilisateur SSO par email (`POST /api/v1/admin/users/sso`) afin de fixer rôle et manager avant sa première connexion.
- [x] CA-04 : à la première connexion SSO, le compte pré-provisionné est lié uniquement si le compte est de type SSO, sans identité Entra existante, et si le jeton provient du tenant configuré (`ENTRA_TENANT_ID`, claim `tid`).
- [x] CA-05 : un ADMIN modifie nom affiché, rôle, manager et temps hebdomadaire théorique (`PUT /api/v1/admin/users/{id}`).
- [x] CA-06 : un ADMIN active / désactive un compte (`PUT /api/v1/admin/users/{id}/active`) ; aucun compte ni historique de temps n'est supprimé.
- [x] CA-07 : un ADMIN réinitialise le mot de passe d'un compte local (`POST .../{id}/password`) et le déverrouille (`POST .../{id}/unlock`) ; refusé pour un compte SSO.
- [x] CA-08 : règles de garde : pas d'auto-désactivation ni d'auto-rétrogradation, toujours au moins un ADMIN actif, manager actif de rôle MANAGER/DIRECTION/ADMIN, sans cycle hiérarchique.
- [x] CA-09 : toute action d'administration est auditée (`user_admin_audit`) sans secret.
- [x] CA-10 : désactivation, changement de rôle ou de mot de passe révoquent les sessions serveur de l'utilisateur ciblé.
- [x] CA-11 : écran Angular `/admin/utilisateurs` visible et accessible aux seuls ADMIN (guard + RBAC backend).

## 3. Contexte analysé

- [x] `app_user`, `auth_identity`, Spring Session JDBC, `EntraOidcUserService`, `LocalUserAdminService`, `AdminUserController`, `SecurityConfig`.
- [x] Impacts : migration V4 (type de compte, manager, contrainte temps hebdo, audit) ; nouvelle API admin ; nouvel écran.
- [x] Sécurité : `/api/v1/admin/**` réservé ADMIN + CSRF ; aucune liaison SSO/local ; liaison SSO pré-provisionnée restreinte au tenant configuré.
- [x] Tests existants vérifiés (auth, projets).

## 4. Hypothèses (à valider)

- H1 : le validateur d'une feuille de temps est le manager direct (`app_user.manager_id`). La règle finale (manager / chef de projet / double validation) reste ouverte pour TICKET-0005.
- H2 : un manager doit avoir le rôle MANAGER, DIRECTION ou ADMIN.
- H3 : temps hebdomadaire théorique saisi en minutes, 0 à 4 200 (70 h), défaut 2 100 (35 h).
- H4 : sans `ENTRA_TENANT_ID` configuré (tenant `common`), aucune liaison automatique d'un compte pré-provisionné n'est faite : l'auto-provisioning historique (COLLABORATOR) reste inchangé pour les nouveaux emails.
- H5 : le type de compte est exclusif (SSO **ou** local) ; un utilisateur ne cumule pas les deux identités.

## 5. Implémentation

- Backend : module `users` (`api`, `application`, `domain`, `infrastructure`), politique de garde `UserAdministrationPolicy`, révocation de sessions via `FindByIndexNameSessionRepository`.
- `AdminUserController` (auth) remplacé par `UserAdminController` (users) ; contrat `POST /local` conservé (champs additionnels optionnels, réponse enrichie).
- Frontend : `features/users` (liste, filtres, création locale/SSO, panneau d'édition), lien de navigation ADMIN, `adminGuard`.

## 6. Tests et vérifications

- [x] Unit tests : politique de garde, service d'administration, liaison SSO pré-provisionnée.
- [x] Tests HTTP Spring Security : ADMIN requis, CSRF requis, validation des entrées.
- [ ] Integration tests PostgreSQL (migration V4 sur base réelle, révocation de sessions JDBC).
- [ ] UI/component tests : infrastructure de tests Angular absente.
- [x] Security checks : RBAC, CSRF, pas de secret dans l'audit/logs, messages d'erreur génériques.
- [x] Regression checks : login local et SSO existants.

## 7. Documentation

- [x] PROJECT-TRACKING mis à jour
- [x] CHANGELOG mis à jour
- [x] ADR-0002 complété (pré-provisioning SSO)

## 8. Reste à faire / risques

- Valider la liaison pré-provisionnée avec un vrai tenant Entra.
- Invitation par email / mot de passe à usage unique pour les locaux (#7) : aujourd'hui l'ADMIN transmet le mot de passe initial hors application.
- Endpoint « mon équipe » pour les managers (TICKET-0005).
- Pagination serveur de la liste au-delà de quelques centaines d'utilisateurs.

## 9. Statut

Status: REVIEW
