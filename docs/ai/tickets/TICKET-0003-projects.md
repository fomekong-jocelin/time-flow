# TICKET-0003 — Catalogue et synchronisation des projets (#2)

Status: IN_PROGRESS

## Objectif et critères

- Catalogue Projets accessible depuis le shell, responsive, recherche et filtre actif/archivé.
- API authentifiée ; déclenchement de synchronisation réservé ADMIN et protégé CSRF.
- Import Azure DevOps paginé, idempotent par organisation et identifiant externe.
- Aucun effacement de projet ou de temps ; seuls les états explicitement supprimés sont archivés.
- Audit de chaque synchronisation, erreurs génériques sans secret.
- Tests backend, compilation Angular, documentation et revue.

## Hypothèses et impacts

- Une organisation configurée côté serveur par environnement ; PAT en lecture projets uniquement.
- Catalogue commun aux utilisateurs authentifiés (modèle d'affectation à définir avant restrictions par mission).
- Aucune déduction d'archivage à partir d'un projet absent : les droits du PAT peuvent changer.
- Les projets nouveaux utilisent la valeur de facturation par défaut du schéma ; les imports suivants la préservent.
- Le module utilise les tables `project` et `integration_sync_run` existantes, sans migration.
- Dépendances : authentification TICKET-0002 ; prépare la sélection des projets TICKET-0004.
- La synchronisation manuelle précède une éventuelle planification et l'écran Paramètres.

## Vérifications prévues

- Pagination, données invalides, échec distant sans écriture partielle.
- Réimport et conservation des données locales, autorisation ADMIN et CSRF.
- Build Angular ; états vide/erreur/chargement et navigation mobile.

## Contraintes de livraison

- Modifications locales préexistantes préservées.
- Branche dédiée `feat/projects-catalog` créée depuis `feat/auth-hybrid-sso-local` ; PR à ouvrir avant DONE.

## Extension demandée : import/export Excel

- Service Excel disponible indépendamment de la configuration Azure, réservé ADMIN.
- Modèle `.xlsx` avec une ligne DEMO-001 importable immédiatement.
- Onglet `Projets` : Référence, Nom, Actif, Facturable (texte, OUI/NON).
- Référence stable sensible à la casse, source EXCEL / organisation LOCAL ; réimport par upsert sans suppression, conservation de l'UUID et du client local.
- Export complet : projets EXCEL réimportables dans `Projets`, autres sources dans `Autres sources` pour consultation. Un import Excel ne modifie pas Azure.
- Validation complète avant transaction : taille 1 Mo, 5 000 lignes, en-têtes, références uniques, texte sans formule, booléens stricts.
- Limite décompressée 20 Mo / 1 000 entrées, macros et liens externes refusés. Noms exportés en cellules texte, jamais en formules.
- Chaque import traité par le service est audité ; fichiers rejetés avant le service (taille/multipart) ne créent pas d'audit.
- Dépendance Apache POI 5.5.1 ; aucune migration de schéma.

## Vérifications exécutées le 01/10/2026

- [x] `mvn test -q` : 26 tests réussis, aucun échec (20 nouveaux tests projets).
- [x] Tests HTTP avec la configuration Spring Security réelle : lecture authentifiée, droits ADMIN, CSRF, téléchargements.
- [x] Client Azure : pagination, réponse malformée, boucle de pagination, configuration d'hôte.
- [x] Orchestration : import complet, échec audité sans import partiel, message distant non exposé, libération du verrou local.
- [x] Excel : modèle importable, aller-retour avec référence et booléens conservés, séparation Azure, doublons, formules, en-têtes et taille invalide.
- [x] `npm run build` réussi (Node installé 25.9 ; référence projet Node 24 LTS à conserver).
- [x] `git diff --check` sans erreur.
- [x] Revue : controllers minces, transactions dans la persistance, autorisations et CSRF préservés, secrets côté serveur, classes < 500 lignes.
- [ ] Tests PostgreSQL réels de réimport, rollback et conservation des paramètres locaux (persistance simulée dans les tests de service).
- [ ] Validation avec une organisation Azure réelle.
- [ ] Tests de composants Angular : infrastructure de tests absente du projet actuel.
- [ ] Vérification visuelle : accès navigateur localhost refusé par la politique de permission ; aucune tentative de contournement.
- [x] Branche dédiée et commit. PR à ouvrir (description dans `docs/ai/PR-projects.md`).

Le ticket reste IN_PROGRESS : ne pas assimiler la compilation et les tests unitaires/HTTP à une validation bout en bout.
