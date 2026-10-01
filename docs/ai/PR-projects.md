# feat: catalogue projets avec Azure DevOps et import/export Excel

L'entrée Projets était désactivée. Elle ouvre désormais un catalogue avec recherche, disponibilité, provenance et navigation mobile. Les administrateurs peuvent synchroniser Azure DevOps ou importer un fichier Excel sans configurer Azure.

L'import Azure lit toutes les pages avant d'enregistrer les projets par identité externe. L'import Excel valide le classeur puis crée ou met à jour les projets par référence stable. Les deux sources conservent leurs identifiants locaux et leurs historiques. Le modèle contient DEMO-001 pour tester ; l'export sépare les données Excel réimportables des autres sources consultables.

## Validation

- Maven : 26 tests réussis, incluant contrôles HTTP ADMIN/CSRF, pagination et erreurs Azure, validation et aller-retour Excel.
- Angular : build production réussi.
- Revue et `git diff --check` effectués ; tracking, changelog, ticket et configuration documentés.

## Avant validation finale

- Vérifier le réimport et rollback sur PostgreSQL réel, la connexion Azure et le rendu desktop/mobile/clair/sombre.
- Ajouter les tests de composants Angular quand l'infrastructure de test sera installée.
- Prévoir coordination multi-instance, reprise des audits interrompus et pagination du catalogue avant montée en charge.

Cette description est prête pour une PR ; aucune PR n'a été ouverte, les permissions du checkout interdisent l'écriture dans `.git`. Ne pas inclure les modifications locales préexistantes `.idea/misc.xml`, `application.yml`, `frontend/angular.json` et `frontend/package-lock.json` sans revue séparée.
