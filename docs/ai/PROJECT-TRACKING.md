# PROJECT TRACKING — TimeFlow

## Statut global

| Champ | Valeur |
|---|---|
| Dernière mise à jour | 2026-10-01 |
| Phase | Validation manager des feuilles de temps (TICKET-0005) |
| État | IN_PROGRESS |
| Cible V1 | Sync projets Azure DevOps + saisie hebdomadaire + validation + reporting de base |
| Risque actuel | Parcours SSO à valider avec une App Registration Microsoft Entra réelle |

## Backlog initial

| ID | GitHub | Sujet | Statut | Priorité |
|---|---:|---|---|---|
| TICKET-0001 | PR #6 | Bootstrap architecture + gouvernance | DONE | P0 |
| TICKET-0002 | #1 (PR #8) | Authentification hybride et rôles | DONE | P0 |
| TICKET-0003 | #2 (PR #9) | Catalogue projets + Azure DevOps + import/export Excel | DONE | P0 |
| TICKET-0004 | #3 + #4 (PR #11) | Feuille de temps / CRA API + UI | DONE | P0 |
| TICKET-0005 | #5 (PR #12) | Validation manager | DONE | P0 |
| TICKET-0006 | à créer | Formations | TODO | P1 |
| TICKET-0007 | à créer | Dashboard / reporting | TODO | P1 |
| TICKET-0008 | à créer | Exports / préparation facturation | TODO | P1 |
| TICKET-0009 | PR #8 | Application de la charte visuelle v0.1 | DONE | P1 |
| TICKET-0010 | PR #10 | Gestion des utilisateurs SSO + locaux (rôle, manager, temps théorique, activation) | DONE | P0 |

## Décisions actées

- Authentification hybride : SSO Entra ID pour internes + comptes locaux pour externes.
- Modèle BFF/session : aucun access token OAuth dans le SPA.
- Inscription publique désactivée.
- Type de compte exclusif SSO **ou** local ; un ADMIN peut pré-provisionner un compte SSO, lié à la première connexion uniquement depuis le tenant `ENTRA_TENANT_ID` (TICKET-0010).
- Aucun compte n'est supprimé : désactivation uniquement, sessions révoquées.
- Charte visuelle v0.1 appliquée au frontend (TimeFlow by INDYLI, palette Indigo/Violet/Teal, Inter, Dark Mode).

## Décisions produit encore ouvertes

- Projet seul ou Work Item Azure DevOps dès V1.
- Règle de validation : manager, chef de projet ou double validation (hypothèse TICKET-0010 : manager direct `app_user.manager_id`).
- Temps théorique par profil.
- Périodicité hebdomadaire uniquement ou mensuelle également.
- Taux journalier et budget temps dans V1 ou V1.1.
