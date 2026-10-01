# Catalogue projets et intégration Azure DevOps

## Configuration

Fournir au **processus backend** `TIMEFLOW_AZURE_ORGANIZATION` (nom court de l'organisation) et `TIMEFLOW_AZURE_PAT` (secret avec le droit de lecture des projets). Spring résout ces variables vers `timeflow.azure.organization` et `timeflow.azure.pat`. Le fichier `.env.example` est un exemple ; Maven ne charge pas automatiquement un fichier `.env`.

Ne jamais placer le PAT dans le frontend, une URL, les logs ou Git. Le client contacte uniquement `https://dev.azure.com`, refuse les redirections et borne les délais réseau. L'intégration reste désactivée tant que sa configuration est absente/invalide.

## Contrat HTTP

| Endpoint | Autorisation | Réponse |
|---|---|---|
| GET `/api/v1/projects` | Utilisateur authentifié | Liste triée de `{id,name,source,organization,active,billableDefault,reference}` |
| GET `/api/v1/admin/integrations/azure/projects` | ADMIN | `{configured,latestRun}` ; dernier audit nullable |
| POST `/api/v1/admin/integrations/azure/projects/sync` | ADMIN + CSRF | `{importedCount}` |

La synchronisation est synchrone. Configuration absente : 503 ; import déjà en cours dans la même instance : 409 ; erreur distante/import : 502. Le client affiche un message générique et permet de réessayer. `importedCount` compte les projets traités, y compris ceux déjà présents.

## Conservation et limites

- API Azure 7.1 `Projects - List`, `stateFilter=all`, pagination par `x-ms-continuationtoken`, 100 éléments demandés par page, maximum 100 pages.
- Référence : [Microsoft Learn, Projects - List](https://learn.microsoft.com/en-us/rest/api/azure/devops/core/projects/list?view=azure-devops-rest-7.1).
- Lecture complète avant transaction ; réponse invalide ou page en échec : aucun import partiel.
- Upsert sur `(external_source, organization_key, external_id)` ; identifiant TimeFlow, client, facturation et historique conservés.
- Seul `wellFormed` est disponible pour les prochaines saisies. Les autres états explicites sont indisponibles ; aucun projet absent de la réponse n'est supprimé ni désactivé automatiquement.
- L'audit de succès et l'import sont atomiques. Un échec est audité dans une transaction distincte avec un message fixe sans données distantes.
- Verrou PostgreSQL pendant l'import pour sérialiser les écritures ; un verrou local empêche les doubles clics dans la même instance. La coordination des lectures entre plusieurs instances et la reprise d'audits RUNNING après arrêt brutal restent à ajouter avant déploiement multi-instance.
- Catalogue commun aux comptes authentifiés, sans affectations utilisateur/projet à ce stade. Pas de sélection Work Items, de planification ou d'interface de gestion des secrets.
- Liste intégralement chargée côté UI ; pagination serveur à prévoir pour les catalogues volumineux.

## Vérification manuelle

1. Redémarrer le backend avec les variables, ouvrir Projets avec un administrateur et synchroniser.
2. Réimporter : nombre de lignes et identifiants TimeFlow stables ; changement de nom reflété.
3. Vérifier qu'un projet devenu indisponible garde ses références de temps et sa facturation locale.
4. Tester un PAT révoqué : erreur générique, audit FAILED, catalogue inchangé.
5. Avec un collaborateur : lecture autorisée, synchronisation refusée même par appel direct.
6. Contrôler l'écran clair/sombre, clavier, mobile, recherche sans résultat et reprise après erreur réseau.

## Import/export Excel indépendant

Depuis Projets, un administrateur peut télécharger le modèle, importer un `.xlsx` et exporter le catalogue. Aucun paramètre Azure n'est nécessaire. Après mise à jour du code, redémarrer le backend afin de charger les nouveaux endpoints et Apache POI.

| Endpoint | Autorisation | Format |
|---|---|---|
| GET `/api/v1/admin/projects/excel/template` | ADMIN | Classeur avec un projet DEMO-001 |
| GET `/api/v1/admin/projects/excel/export` | ADMIN | Classeur complet, téléchargement sans cache |
| POST `/api/v1/admin/projects/excel/import` | ADMIN + CSRF | Multipart `file`, réponse `{importedCount}` |

L'onglet **Projets** contient exactement `Référence`, `Nom`, `Actif`, `Facturable`. Les cellules sont textuelles et les deux dernières colonnes acceptent OUI/NON. La référence (sensible à la casse) est stable et unique, 100 caractères maximum parmi lettres, chiffres, `.`, `_`, `-`. Le nom est limité à 255 caractères. Les autres onglets ne sont pas importés.

L'export place les projets Excel dans Projets et les projets Azure/internes dans **Autres sources**. Réimporter l'export ne modifie donc que les projets Excel. Un catalogue sans projets Excel produit un onglet Projets vide : ajoutez des lignes ou utilisez le modèle avant import.

L'import valide toutes les lignes avant un upsert transactionnel sous la source EXCEL et l'organisation LOCAL. L'UUID local et les références historiques restent stables ; nom, actif et facturable sont mis à jour. Aucun projet absent n'est supprimé. Une référence nouvelle crée un projet, même si son nom existe déjà sous Azure.

Limites : 1 Mo compressé, 20 Mo décompressés, 1 000 entrées ZIP, 5 000 lignes de données. Fichiers anciens `.xls`, cellules numériques/formules, macros et liens externes refusés. Erreurs de contenu : 400 avec message de ligne ; dépassement multipart : 413. Les protections ZIP natives d'Apache POI restent actives.

Pour tester : télécharger le modèle, importer DEMO-001, rechercher sa référence, réimporter (une seule ligne), exporter, modifier le nom ou Facturable dans Projets, réimporter et vérifier la mise à jour. Tester ensuite un doublon de référence dans le fichier : aucune ligne ne doit être enregistrée.

Bibliothèque : [Apache POI 5.5.1](https://poi.apache.org/download.html). Les tests de codec ouvrent et relisent les classeurs produits ; la mise en page Excel n'a pas été contrôlée visuellement.
