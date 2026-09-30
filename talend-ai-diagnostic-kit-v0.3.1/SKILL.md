---
name: talend-tos-diagnostic-design-readonly
description: >
  Diagnostic et conception guidée en lecture seule pour Talend TOS DI/ESB
  8.0.1 et legacy 7.x. Analyse les artefacts et logs ou propose des composants,
  réglages et diagrammes à réaliser manuellement dans Talend Studio, sans
  modifier ni générer les artefacts Talend.
---

# Skill — Diagnostic et conception Talend en lecture seule

## Résultat attendu

Produire un diagnostic traçable qui :

- localise le Job, la Route ou le Service concerné ;
- reconstruit son graphe d’exécution réel ;
- identifie les contextes et valeurs susceptibles d’être écrasés ;
- relie l’erreur aux composants, schémas, requêtes et dépendances concernés ;
- classe les causes par niveau de confiance ;
- propose uniquement des actions manuelles dans Talend Studio ;
- liste les vérifications et les informations encore manquantes.

## Limite absolue

Appliquer `AGENTS.md`. Aucun fichier Talend n’est modifié. Les commandes de
build, d’exécution, de déploiement, de connexion externe et d’installation sont
interdites sans demande explicite.

## Démarrage compact

1. Classer la demande : `DIAGNOSTIC` ou `CONCEPTION`.
2. Ouvrir le ticket, diagnostic ou modèle concerné.
3. Extraire avec les scripts (`AGENTS.md` (section « Lecture progressive »)) avant toute lecture de XML ou de log.
4. Charger uniquement le guide spécialisé requis.

En `DIAGNOSTIC`, chercher l’erreur, le Job et ses fichiers associés. En
`CONCEPTION`, lire `docs/ai/CONCEPTION-TALEND.md`, puis une seule fiche de
pattern correspondant au besoin.

Recherche complémentaire en lecture seule (`rg`, ou `findstr /s /n /i` si rg est absent) :

```text
rg -n -i "ERROR|Exception|Caused by|ORA-|PSQLException|ConnectException" .
rg --files process process_mr process_storm route service context metadata code
rg -n "tRunJob|tContextLoad|tRESTRequest|<nom-du-job>" .
```

Ne pas imprimer les secrets ni des fichiers complets.

## Fiche de cadrage

Relever sans inventer :

| Champ | Valeur |
|---|---|
| Artefact | Job / Route / Service / Inconnu |
| Nom et version | valeur observée ou `INCONNU` |
| Produit/build Studio | valeur observée ou `INCONNU` |
| Contexte lancé | valeur observée ou `INCONNU` |
| Mode d’exécution | Studio / standalone / JobServer / Runtime / Inconnu |
| Java | lancement / compilation / exécution / Inconnu |
| Runtime ESB | version observée ou `INCONNU` |
| OS | valeur observée ou `INCONNU` |
| Erreur | message exact, masqué si nécessaire |
| Phase | build / génération / compilation / exécution / déploiement |

Si un champ critique manque, poursuivre avec un diagnostic partiel.

## Localiser l’artefact

Pour un Job :

1. trouver `<job>_<version>.properties` ;
2. trouver le `.item` de même nom ;
3. relever label, version, ID interne et chemin ;
4. extraire composants, réglages et connexions avec
   `talend-item-extract.bat --job <nom> .` (`--component` pour un tMap ou une requête) ;
5. repérer les triggers et sous-jobs ;
6. suivre chaque `tRunJob` vers son Job enfant ;
7. relever les contextes, routines et métadonnées référencés.

Pour ESB, ajouter :

- endpoint entrant, méthode et URI ;
- `Consumes`, `Produces`, headers et paramètres ;
- flux de réponse et gestion d’erreur ;
- port, HTTPS/keystore et mode de packaging observés ;
- Runtime/Karaf et compatibilité Studio/Runtime.

## Registre des preuves

Enregistrer les preuves sous cette forme :

| ID | Classe | Observation | Source | Portée |
|---|---|---|---|---|
| P1 | Fait observé | ... | fichier/log | composant/contexte |
| I1 | Inférence | ... | P1 + P2 | ... |
| H1 | Hypothèse | ... | indices | à confirmer |
| M1 | Inconnu | ... | absent | information demandée |

Une cause de confiance forte exige normalement :

- une erreur ou un comportement observé ;
- un paramètre/configuration cohérent avec l’erreur ;
- un lien d’exécution démontré.

## Reconstruire le graphe

Extraire seulement :

- nom unique du composant ;
- type du composant ;
- sous-job ;
- source et cible de chaque connexion ;
- type de lien (`FLOW`, `ITERATE`, `RUN_IF`, erreur, etc.) ;
- ordre ou condition quand l’artefact le démontre.

Ne pas déduire la position d’exécution depuis la position graphique seule.
Les triggers et connexions contrôlent le graphe.

## Résoudre le contexte effectif

Créer une chronologie par variable critique :

| Étape | Source | Valeur | Preuve | État |
|---|---|---|---|---|
| Lancement | contexte sélectionné | masquée si sensible | script/log | Fait/Inconnu |
| Statique | Job ou repository | ... | `.item`/context | Fait |
| Implicite | Project/Job Settings | ... | configuration | Fait/Inconnu |
| Dynamique | `tContextLoad` | ... | flux amont | Fait/Inconnu |
| Enfant | `tRunJob` | ... | paramètres | Fait/Inconnu |

Règles prouvées par Qlik Help :

- `tContextLoad` modifie le contexte actif au moment où il s’exécute ;
- un chargement dynamique remplace les valeurs statiques concernées ;
- `tContextLoad` ne crée pas une variable absente du contexte ;
- les paramètres explicites de `tRunJob` priment pour l’exécution enfant ;
- `Transmit whole context` et le contexte enfant doivent être inspectés
  ensemble.

Ne pas afficher les valeurs de type `Password`.

## Contrôles par zone

### Schémas et mappings

- colonnes attendues/réelles, ordre et alias ;
- type Talend/type source, nullabilité, longueur et précision ;
- formats de date, encodage et conversions ;
- schéma repository désynchronisé ;
- expressions Java dans `tMap`, `tFilterRow`, `tXMLMap`, `tJavaRow`.

### SQL et transactions

- concaténations et quotes autour de `context.*` ;
- noms de base, schéma, table, colonne et alias ;
- filtres de période, jointures et cas « zéro ligne » ;
- procédures, commit, rollback, verrou et droits ;
- injection possible si une entrée externe est concaténée.

Ne jamais corriger la requête dans le `.item`.

### Routines et dépendances

- import, signature et méthode renommée ;
- JAR absent ou version incompatible ;
- conformité Java réellement utilisée ;
- exception masquée ;
- usage concurrent de `globalMap` ;
- `ClassNotFoundException`, `NoClassDefFoundError`,
  `InaccessibleObjectException` et `--add-opens`.

### Logs et erreurs

Lire la chaîne complète :

```text
ERROR -> Exception -> Caused by -> premier appel projet/composant utile
```

Comparer les compteurs d’entrée, de sortie et de rejet lorsqu’ils existent.

## Routage composants

Si le graphe contient `tContextLoad`, `tRunJob` ou `tRESTRequest`, lire
`docs/ai/COMPONENTS-TALEND.md`. Ne pas charger cette fiche sinon.

Si un composant est absent de la Palette, inconnu, non chargeable, en erreur de
génération/compilation ou issu d’une migration :

1. relever son type exact dans le `.item` ;
2. identifier produit, build, type de Job et fonctionnalités installées ;
3. appliquer la porte de disponibilité décrite dans `docs/ai/REFERENCES.md` ;
4. ouvrir ensuite la documentation détaillée du composant ;
5. comparer avec l’erreur et l’état local du Studio.

La matrice de disponibilité est une preuve de compatibilité documentaire, pas
une preuve que le composant est effectivement installé.

Si une règle dépend d’une release, lire `docs/ai/REFERENCES.md` et appliquer la
porte de compatibilité avant de conclure.

## Visualisation

Appliquer `AGENTS.md` (section « Diagrammes et images »). Partir du Mermaid de `talend-item-extract.bat --mermaid`,
le compléter seulement avec des faits observés (contexte lancé, overrides) et
marquer le reste `[H]` ou `[?]`. Lire `docs/ai/VISUALISATION-TALEND.md` seulement
pour une planche PNG/SVG ou un graphe de contexte complexe.

## Discipline de consommation de tokens

- extraire avec `talend-item-extract.bat` et `talend-log-extract.bat` avant d’ouvrir ;
- utiliser `rg` pour cibler avant d’ouvrir ;
- lire le couple `.properties`/`.item` concerné, pas tout `process/` ;
- suivre seulement les dépendances réellement référencées ;
- résumer un composant sur une ligne ;
- ne jamais recopier le XML complet ;
- ne conserver qu’un extrait de log autour de la première cause utile ;
- charger une seule fiche spécialisée à la fois ;
- s’arrêter lorsque les preuves suffisent à classer la cause et les tests.

Pour une conception :

- sélectionner un seul pattern ;
- vérifier uniquement les composants candidats de ce pattern ;
- proposer le graphe minimal avant les options ;
- expliquer chaque composant en une phrase ;
- fournir uniquement les réglages qui changent le comportement ;
- poser au plus cinq questions bloquantes et marquer le reste `[H]`.

## Correction et vérification

Chaque action commence par :

```text
Correction proposée à appliquer manuellement dans Talend Studio : ...
```

Puis préciser :

1. vue Studio à ouvrir ;
2. Job/Route/Service et composant ;
3. paramètre à contrôler ou modifier ;
4. valeur attendue sans exposer de secret ;
5. test ciblé à réaliser ;
6. risque de régression.

Ne pas exécuter le test à la place du développeur sans autorisation.

## Sortie

Rapport complet : `docs/ai/diagnostics/TEMPLATE-diagnostic.md`. Conception :
`docs/ai/designs/TEMPLATE-conception.md`, qui commence par « Conception proposée
à réaliser manuellement dans Talend Studio. ». Coller dans le rapport les
tableaux produits par les scripts plutôt que du XML ou des logs bruts.

Ne jamais générer un `.item`, un `.properties` ou un patch XML/XMI.

Réponse dans le chat : format court de `AGENTS.md` (section « Sortie attendue »), avec lien vers le rapport.

