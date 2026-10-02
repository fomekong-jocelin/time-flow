# PROJECT TRACKING : TimeFlow

## Statut global

| Champ | Valeur |
|---|---|
| Dernière mise à jour | 2026-10-02 |
| Phase | Remédiation Formations/Facturation et gestion des participants (TICKET-0018/0019) |
| État | IN_REVIEW |
| Cible V1 | Sync projets Azure DevOps + saisie hebdomadaire + validation + reporting de base |
| Risques actuels | Vérifications complètes non validées; recette navigateur et parcours SSO avec App Registration Microsoft Entra réelle à effectuer |
| PR de remédiation réelle | #19 vers main; branche fix/ticket-0006-audit-remediation |

## Backlog initial et remédiation

| ID | GitHub | Sujet | Statut | Priorité |
|---|---|---|---|---|
| TICKET-0001 | PR #6 | Bootstrap architecture + gouvernance | DONE | P0 |
| TICKET-0002 | #1 (PR #8) | Authentification hybride et rôles | DONE | P0 |
| TICKET-0003 | #2 (PR #9) | Catalogue projets + Azure DevOps + import/export Excel | DONE | P0 |
| TICKET-0004 | #3 + #4 (PR #11) | Feuille de temps / CRA API + UI | DONE | P0 |
| TICKET-0005 | #5 (PR #12) | Validation manager | DONE | P0 |
| TICKET-0006 | PR #19 | Formations et correctifs d'audit | IN_REVIEW | P1 |
| TICKET-0007 | à créer | Dashboard / reporting (KPI, TACE, OT, Projets, Équipe) | DONE | P1 |
| TICKET-0008 | PR #19 | Exports / préparation facturation et corrections devises/CSV | IN_REVIEW | P1 |
| TICKET-0009 | PR #8 | Application de la charte visuelle v0.1 | DONE | P1 |
| TICKET-0010 | PR #10 | Gestion des utilisateurs SSO + locaux | DONE | P0 |
| TICKET-0011 | à créer | Groupes de configuration du temps de travail & paramètres dynamiques | DONE | P0 |
| TICKET-0012 | à créer | Refonte mobile, jours fériés et OT/ET | DONE | P0 |
| TICKET-0013 | à créer | Composants UI réutilisables, espace et tableaux mobile | DONE | P0 |
| TICKET-0014 | à créer | Thèmes Light/Dark/System & i18n FR/EN | DONE | P0 |
| TICKET-0015 | à créer | Analytics épuré : donut, tendance, KPI | DONE | P0 |
| TICKET-0016 | à créer | Filtrage multi-critères et réactivité mobile Manager/Admin | DONE | P0 |
| TICKET-0017 | PR #19 | Budget projet, tarifs et devises : correction du cumul | IN_REVIEW | P0 |
| TICKET-0018 | PR #19 | Remédiation TF-01 à TF-11, BF-01 à BF-03, GOV-01 | IN_REVIEW | P0 |
| TICKET-0019 | PR #19 | Retrait, correction administrative des présences, exclusion formateur/participant | IN_REVIEW | P1 |

## Décisions actées

- Authentification hybride : SSO Entra ID pour internes et comptes locaux pour externes.
- Modèle BFF/session : aucun access token OAuth dans le SPA. Inscription publique désactivée.
- Type de compte exclusif SSO ou local; pré-provisionnement SSO ADMIN et liaison depuis le tenant ENTRA_TENANT_ID uniquement.
- Aucun compte supprimé : désactivation et révocation des sessions.
- Charte visuelle v0.1 : TimeFlow by INDYLI, Indigo/Violet/Teal, Inter, clair/sombre.
- Temps de travail dynamiques : profils configurables (jours ouvrés, volumes hebdomadaires/journaliers, plafonds, week-end), affectation aux collaborateurs et saisie CRA adaptée.
- Préparation facturation : 420 minutes = 1 jour; agrégations par projet/collaborateur et exports Excel/CSV. TJM, TH, coûts et montants réservés à ADMIN/DIRECTION, masqués pour les autres rôles côté backend et omis des exports.
- Budgets projets : budget_days, total_price, daily_rate, currency; création/modification ADMIN/DIRECTION via POST/PUT /api/v1/admin/projects; taux utilisateur administré dans /admin/utilisateurs.
- Correctif TICKET-0018 : regrouper les montants par devise, afficher les heures non valorisées, ne pas supposer de change, et utiliser le cumul complet autorisé du projet pour les soldes budgétaires.
- Formations : tables training_session et training_participant, interne/client, présentiel/distanciel/hybride et états planifié/en cours/terminé/annulé.
- ADMIN/DIRECTION pilotent le catalogue. Le TRAINER affecté émarge; les collaborateurs/managers gèrent leurs inscriptions. Les présences et sessions clôturées sont conservées. L'annulation logique et la réactivation ajoutent des événements.
- Les anciens enregistrements restent au jour près; les horaires explicites sont ajoutés par V10 sans inventer les données manquantes. Catalogue paginé et détails sous /formations.
- TICKET-0019 : retrait confirmé, correction administrative motivée et horodatée, séparation formateur/participant dans une même session, transfert explicite d'un inscrit vers formateur. Les sessions clôturées peuvent faire l'objet d'un retrait administratif sans réouverture. V11 conserve les motifs sans altérer les anciennes données.

## Preuves de remédiation

Les 21 tests ciblés Node et 29 assertions Java de TICKET-0018 ont été exécutés avec succès lors de l'intervention précédente sur des fichiers dont les empreintes Git ont été vérifiées. Les checks GitHub Actions déclenchés sur 2869214 n'ont pas produit de validation complète. Voir [le journal](verification/TICKET-0018-checks.md).

TICKET-0019 : 16 tests Node et 29 assertions Java de politique exécutés avec succès; 8 fichiers TypeScript transpilés sans diagnostic syntaxique. Tests Spring/HTTP/PostgreSQL ajoutés, non exécutés dans ce conteneur. Ne pas assimiler les contrôles ciblés à mvn verify, npm test complet ou une recette visuelle. Voir [le ticket](tickets/TICKET-0019-participants-and-trainers.md).

La PR #13 concerne un autre changement déjà fusionné. La PR correcte est #19. Aucun changement de cette remédiation n'est déclaré fusionné ni déployé ici.

## Décisions produit encore ouvertes

- Projet seul ou Work Item Azure DevOps dès V1.
- Validation par manager, chef de projet ou double validation; hypothèse actuelle : manager direct app_user.manager_id.
- Périodicité hebdomadaire uniquement ou mensuelle également.
- Visibilité fine de l'annuaire/participants pour les comptes externes et gestion future des données de démonstration historiques. Ces décisions ne sont pas remplacées par des hypothèses silencieuses.
