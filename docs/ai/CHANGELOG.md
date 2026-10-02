# Changelog

Format inspiré de Keep a Changelog. Versioning Semantic Versioning.

## [Unreleased]

### Fixed : TICKET-0020, défilement des modales

- Une seule barre de défilement dans les modales `tf-dialog` (corps défilant, en-tête fixe, page de fond bloquée). Voir [TICKET-0020](tickets/TICKET-0020-dialog-single-scroll.md).

### Fixed : TICKET-0019, participants et formateurs

- Retrait d'un inscrit avec confirmation nommée, annulations séparées et historique conservé.
- Correction administrative d'une présence ou participation clôturée, avec motif obligatoire, contrôle de rôle/CSRF et statut attendu.
- Interdiction du cumul formateur/participant actif sur une même session dans les parcours UI et serveur.
- Transfert explicite d'un inscrit vers le rôle de formateur dans une seule transaction; présence existante à corriger préalablement.
- Affichage séparé des dates d'inscription et de présence, sans réutiliser la date d'inscription comme date de présence.
- V11 additive pour les motifs et types d'événements, sans réécriture des migrations ni nettoyage automatique des données.
- Tests ciblés exécutés : 16 tests Node et 29 assertions de politique Java. Tests Spring/PostgreSQL et build Angular à confirmer. Voir [TICKET-0019](tickets/TICKET-0019-participants-and-trainers.md).

### Fixed : TICKET-0018, audit des formations et de la facturation

- Vérification serveur de l'affectation du TRAINER avant modification de présence; validation du statut obligatoire et erreurs métier codées.
- Contrat de planification conservant dates civiles, horaires et fuseau; compatibilité des anciennes sessions sans horaire et édition d'une journée sans déplacement artificiel.
- Capacité commune aux participants REGISTERED et ATTENDED, verrou de session pour les commandes concurrentes et contrôle de réduction de capacité.
- Désinscription par annulation logique, réactivation de la même participation et événements d'historique. Protection des présences et sessions clôturées contre les suppressions destructives.
- Recherche paginée côté base avec comptages groupés; détail complet, validations alignées, formateurs éligibles, erreurs contextualisées et dialogue natif.
- Totaux financiers regroupés par devise et valorisation manquante explicitée. Aucun change implicite, ni conversion du tarif utilisateur historique EUR vers une autre devise.
- Budget restant fondé sur la consommation globale du projet; distinction entre périmètre filtré et cumul autorisé.
- Neutralisation des textes CSV destinés aux tableurs et devises explicites dans les XLSX.

### Added

- Migration additive V10 pour les horaires et événements de participation, sans réécriture de V9 ni destruction des données existantes.
- Tests de sécurité objet, transitions, capacité, concurrence PostgreSQL, horaires, budgets et devises.
- Workflow de vérification Maven/PostgreSQL/Angular et script autonome `scripts/verify-audit-helpers.sh`.

### Vérification

PR réelle: [#19](https://github.com/fomekong-jocelin/time-flow/pull/19), vers main, non fusionnée.
Statut: **IN_REVIEW**, pas DONE. Les 21 tests ciblés Node et 29 assertions Java de TICKET-0018 ont été exécutés lors de l'intervention précédente. Les suites/builds complets et la recette visuelle restent non validés. Voir [les preuves et limites](verification/TICKET-0018-checks.md), [TICKET-0018](tickets/TICKET-0018-audit-remediation.md) et les vérifications propres à TICKET-0019 ci-dessus.

## Historique antérieur conservé intégralement

Les entrées précédentes (tickets 0001 à 0017, livraisons avant cette remédiation) sont conservées sans modification dans [le changelog historique](history/CHANGELOG-before-TICKET-0018.md), blob `35afe4f0ca0cd0c1af5fe09c5c3503813c8bd82d`. Leurs mentions de tests réussis décrivent les livraisons antérieures et ne valent pas validation de cette PR.
