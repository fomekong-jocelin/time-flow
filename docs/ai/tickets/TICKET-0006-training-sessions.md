# TICKET-0006 : catalogue, planification, formateurs et participants

Status: IN_REVIEW
Mise à jour: 2026-10-02
PR de remédiation: #19
Suite de l'audit: [TICKET-0018](TICKET-0018-audit-remediation.md)

## 1. Objectif

Gérer les sessions de formation de TimeFlow: catalogue, titre/référence/objectifs, formateur, dates et horaires explicites lorsqu'ils sont connus, durée pédagogique, capacité, modalités (présentiel/distanciel/hybride), catégorie interne/client et statuts.

ADMIN et DIRECTION pilotent les sessions et inscriptions. Le TRAINER consulte et émarge ses sessions affectées. COLLABORATOR et MANAGER consultent le catalogue et gèrent leurs inscriptions. L'interface /formations est bilingue FR/EN, adaptée aux petits écrans et aux interactions clavier.

## 2. Critères d'acceptation après audit

| Critère | Implémentation | Validation restante |
|---|---|---|
| CA-01 : tables sessions/participants | V9 conservée; V10 additive pour horaires et événements | Migration et mapping sur PostgreSQL |
| CA-02 : API sécurisée CRUD, détail, filtres et participants | Contrôleur, services, recherche paginée et codes d'erreur | Exécution de la suite backend |
| CA-03 : autorisation par rôle et affectation | Contrôle objet côté service, principal résolu et statut obligatoire | Tests négatifs HTTP et service réels |
| CA-04 : route /formations et navigation | Conservées | Recette navigateur |
| CA-05 : catalogue, capacité et gestion participants | Comptage inscrits + présents, verrou, réactivation et historique | Concurrence PostgreSQL et flux complets |
| CA-06 : interface FR/EN | Messages et templates traduits | Suite i18n complète et recette |
| CA-07 : tests et builds | Tests ajoutés et 21 tests ciblés Node réussis | mvn verify, npm test complet, build Angular |
| CA-08 : documentation et suivi | Tracking, changelog et ticket de remédiation mis à jour | Revue finale avant DONE |

## 3. Contexte et impacts

La base auditée était 5adeb68, avec le module déclaré DONE. L'audit a identifié des écarts d'accès objet, d'horaires, de capacité, de transitions, de récupération d'erreur et de validation visuelle. Le statut DONE de cette livraison ne vaut pas acceptation après audit.

Les modules impactés sont training/domain, application, persistence, api, les composants Angular de formation, les traductions et le dialogue partagé. Les corrections de facturation embarquées sont suivies dans TICKET-0018 et la même PR.

## 4. Règles de remédiation

- Un TRAINER n'émarge que sa session affectée; ADMIN/DIRECTION conservent leurs droits. Les formateurs affectables doivent être actifs et posséder le rôle éligible.
- Les inscriptions REGISTERED et ATTENDED occupent une place. Toutes les mutations pertinentes verrouillent la session avant calcul.
- CANCELLED peut être réactivé sous réserve d'ouverture et de capacité. Une présence ATTENDED ne peut pas être supprimée par désinscription. Une session comportant un historique ne peut pas être supprimée physiquement par l'API.
- Les sessions clôturées/annulées sont immuables dans cette version. Une correction après clôture nécessitera une procédure explicite.
- Les anciennes sessions date seule restent éditables sans inventer d'horaire. Les sessions horaires conservent startsAt, endsAt et timeZone en plus des dates civiles.
- Les erreurs de détail ne fabriquent pas une liste vide. Les erreurs de mutation sont présentées dans leur contexte, et les descriptions complètes restent consultables.
- L'API historique de liste est conservée; le frontend utilise la nouvelle recherche paginée. Les KPI sont libellés comme globaux.

## 5. Tests et preuves

Les tests de service, sécurité objet, PostgreSQL, dates et i18n sont présents. La commande `bash scripts/verify-audit-helpers.sh` exécute sans installation de dépendances 21 tests Node ciblés et 29 assertions Java concernant les helpers financiers/CSV. Les fichiers vérifiés correspondent aux empreintes Git du code publié.

**Ne pas conclure que tous les tests passent.** Les exécutions CI initiales sont en échec avant validation des suites; la cause détaillée n'a pas pu être obtenue via le connecteur. Les builds complets, la concurrence sur PostgreSQL et la recette navigateur/tableur restent à confirmer.

Voir [le journal de vérification](../verification/TICKET-0018-checks.md). Le ticket ne revient à DONE qu'après ces validations et la revue de la véritable PR #19.
