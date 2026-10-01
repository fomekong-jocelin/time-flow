# TICKET-0005 — Workflow de validation manager (#5)

## 1. Objectif

Permettre aux managers, directeurs et administrateurs de consulter, examiner en détail, approuver ou rejeter (avec motif obligatoire) les feuilles de temps hebdomadaires (CRA) soumises par les collaborateurs de leur équipe.

## 2. Critères d'acceptation

- [x] CA-01 : Consultation de la liste des feuilles de temps à valider (`GET /api/v1/manager/timesheets`).
  - Pour un `MANAGER` : restreint aux collaborateurs rattachés (`app_user.manager_id == principal.userId()`).
  - Pour `DIRECTION` ou `ADMIN` : vue globale sur toute l'organisation.
  - Filtre par statut (défaut `SUBMITTED`, ou optionnel `ALL`, `VALIDATED`, `REJECTED`) et par semaine.
- [x] CA-02 : Consultation détaillée de la feuille d'un collaborateur (`GET /api/v1/manager/timesheets/{timesheetId}`).
  - Détail complet des lignes, projets, types d'activité, entrées journalières, facturabilité, commentaires et informations utilisateur.
  - Contrôle de périmètre d'équipe strict pour les managers.
- [x] CA-03 : Validation d'une feuille soumise (`POST /api/v1/manager/timesheets/{timesheetId}/validate`).
  - Vérification du statut `SUBMITTED`.
  - Règle de garde anti-auto-validation : un manager ne peut pas valider sa propre feuille.
  - Transition vers `VALIDATED`, mise à jour de `validated_at = NOW()`.
  - Enregistrement dans `timesheet_validation` (`decision = 'VALIDATED'`, `validator_user_id = principal.userId()`, commentaire optionnel).
- [x] CA-04 : Rejet d'une feuille soumise (`POST /api/v1/manager/timesheets/{timesheetId}/reject`).
  - Vérification du statut `SUBMITTED`.
  - **Motif de rejet obligatoire** (min 3 caractères, max 1000).
  - Transition vers `REJECTED`.
  - Enregistrement dans `timesheet_validation` (`decision = 'REJECTED'`, `validator_user_id = principal.userId()`, motif).
  - La feuille redevient modifiable par son auteur avec affichage du motif dans son écran « Mes temps ».
- [x] CA-05 : Historique et traçabilité :
  - Conservation de l'historique complet des décisions de validation dans `timesheet_validation`.
- [x] CA-06 : Sécurité, RBAC et CSRF :
  - Endpoints `/api/v1/manager/**` restreints aux rôles `MANAGER`, `DIRECTION`, `ADMIN`.
  - Accès refusé (403 Forbidden) pour le rôle `COLLABORATOR`.
  - Protection CSRF active sur toutes les mutations (`POST`).
- [x] CA-07 : Interface Angular « Validation » dédiée aux managers :
  - Entrée de menu « Validation » dans le shell avec badge du nombre de feuilles en attente.
  - Route `/validation` protégée par `managerGuard`.
  - Liste responsive des feuilles en attente (Collaborateur, Période, Heures totales, Facturable, Soumise le).
  - Vue détaillée (modale / panneau) pour inspecter la répartition quotidienne par projet.
  - Action « Valider » avec confirmation immédiate.
  - Action « Rejeter » avec saisie obligatoire du motif de rejet.
  - Gestion des états de chargement, état vide et notifications de succès/erreur.
- [x] CA-08 : Tests et non-régression :
  - Tests unitaires des règles de validation manager (`ValidationPolicyTest`, `TimesheetValidationServiceTest`).
  - Tests MockMvc de sécurité (`TimesheetManagerSecurityTest` : RBAC, périmètre, CSRF).
  - Tests de régression : 80 tests backend réussis, build production Angular réussi.

## 3. Contexte analysé

- Table `timesheet_validation` créée en V1 :
  `id UUID PRIMARY KEY, timesheet_id UUID, validator_user_id UUID, decision VARCHAR(30), comment VARCHAR(1000), decided_at TIMESTAMPTZ`.
- Relation hiérarchique : `app_user.manager_id` (migration V4).
- Rôles : `UserRole.MANAGER`, `UserRole.DIRECTION`, `UserRole.ADMIN`.
- Machine à états : `TimesheetStatusTransitions` autorise `SUBMITTED -> VALIDATED` et `SUBMITTED -> REJECTED`.

## 4. Plan d'action

1. Backend :
   - Créer `TimesheetValidationEntity` et son repository dans `cm.indyli.timeflow.timesheet.persistence`.
   - Créer `ValidationPolicy` dans `cm.indyli.timeflow.timesheet.domain` pour les règles de garde (statut soumis, anti-auto-validation, commentaire rejet obligatoire).
   - Créer `TimesheetValidationService` dans `cm.indyli.timeflow.timesheet.application`.
   - Créer `TimesheetManagerController` sous `/api/v1/manager/timesheets`.
   - Écrire les tests unitaires et de sécurité MockMvc.
2. Frontend :
   - Créer `manager.guard.ts` pour sécuriser l'accès à la route `/validation`.
   - Créer `validation.service.ts` pour appeler l'API `/api/v1/manager/timesheets`.
   - Ajouter l'entrée « Validation » dans `AppShellComponent` visible pour `MANAGER`, `DIRECTION`, `ADMIN` avec badge.
   - Créer `ValidationPageComponent` dans `frontend/src/app/features/validation/`.
3. Vérification :
   - Exécuter `mvn test` et `npm run build`.
   - Mettre à jour `PROJECT-TRACKING.md` et `CHANGELOG.md`.

## 5. Statut

Status: REVIEW
