# AGENTS.md — Diagnostic et conception guidée Talend TOS DI / ESB (kit v0.3.1)

## Mission

Diagnostiquer un projet Talend à partir de ses artefacts, de ses logs et de la
documentation officielle, ou proposer une conception à réaliser manuellement
dans Talend Studio.

Périmètre principal :

- Talend Open Studio Data Integration et ESB 8.0.1 ;
- projets Talend 7.x legacy ;
- Talend Studio 8.x uniquement lorsque le build ou le niveau de mise à jour est
  démontré ;
- exécution Studio, export standalone, JobServer ou Talend Runtime/Karaf.

Ce kit ne suppose jamais l’usage de Talend Cloud.

## Règle absolue : artefacts Talend en lecture seule

Ne jamais créer, modifier, reformater, normaliser, déplacer ou supprimer :

- `*.item` et `*.properties` Talend ;
- `talend.project`, `.project`, `.settings/` ;
- Jobs, Joblets, Routes, Services et code généré ;
- routines, beans, contextes et métadonnées ;
- schémas, requêtes SQL et expressions stockées dans les composants ;
- paramètres d’exécution, scripts d’export ou fichiers Runtime ;
- JAR, dépendances ou fichiers de build.

Une demande de « correction » autorise seulement un diagnostic et des
instructions manuelles. Employer exactement :

```text
Correction proposée à appliquer manuellement dans Talend Studio : ...
```

Une demande de conception autorise un manifeste, un diagramme et des étapes de
configuration manuelle, jamais la génération d’un artefact Talend. Employer :

```text
Conception proposée à réaliser manuellement dans Talend Studio.
```

Seule la documentation du kit (`*.md` et `docs/ai/`) peut être mise à jour
lorsque la demande le prévoit. En cas de doute, rester en lecture seule.

## Actions interdites sans autorisation explicite

Ne pas :

- construire, compiler ou exécuter un Job, une Route ou un Service ;
- déployer sur JobServer, Runtime ou Karaf ;
- se connecter à une base, une API, un broker ou un serveur ;
- installer une dépendance, télécharger un JAR ou lancer une migration ;
- importer, exporter ou régénérer des artefacts Talend ;
- utiliser une commande Git destructive.

Les recherches locales, inventaires, extractions XML en lecture seule et
analyses de logs sont autorisés.

## Lecture progressive pour économiser le contexte

### Noyau (toujours)

1. ce fichier ;
2. `SKILL.md` ;
3. le ticket, diagnostic ou conception concerné s'il existe.

`docs/ai/PROJECT-TRACKING.md` ne s'ouvre qu'en fin d'intervention, pour y
mettre à jour une ligne.

### Extraire avant de lire (obligatoire)

| Source | Commande (lecture seule) | À la place de |
|---|---|---|
| Inventaire des Jobs | `scripts\talend-item-extract.bat --list .` | parcourir `process/` |
| Job / Route / Service | `scripts\talend-item-extract.bat --job <nom> . [--mermaid] [--schema]` | lire le `.item` XML |
| Un composant (tMap, SQL…) | `scripts\talend-item-extract.bat <fichier.item> --component <nom_unique>` | lire le `.item` XML |
| Log | `scripts\talend-log-extract.bat <log> [--grep <composant>]` | lire le log entier |

N'ouvrir le XML brut que par plages ciblées (`rg -n`) si l'extraction ne suffit
pas ou échoue, et le dire dans le rapport (recherches `rg` décrites dans
`SKILL.md`, section « Démarrage compact » ; à défaut `findstr /s /n /i`).
Environnement cible : **Windows** ; les scripts `.bat` s'exécutent depuis cmd
ou PowerShell, sans installation (Windows PowerShell intégré).

### Charger seulement si pertinent

| Besoin observé | Document à lire |
|---|---|
| Procédure détaillée | `docs/ai/WORKFLOW-IA.md` |
| Revue finale | `docs/ai/review-checklist.md` |
| `tContextLoad`, `tRunJob`, `tRESTRequest` | `docs/ai/COMPONENTS-TALEND.md` |
| Nouvelle conception | `docs/ai/CONCEPTION-TALEND.md`, puis un seul pattern |
| CSV vers MySQL | `docs/ai/patterns/CSV-VERS-MYSQL.md` |
| Diagramme ou image de conception | `docs/ai/VISUALISATION-TALEND.md` |
| Vérification externe/version | `docs/ai/REFERENCES.md` |
| Où ranger une information | `docs/ai/README-IA.md` |
| Historique d'une décision | `docs/ai/adr/` |

Ne jamais relire tous les fichiers « par sécurité ». Ne jamais lire `.kit/` ni
`docs/prompts/` (modèles destinés aux humains).

## Format des demandes

Les demandes suivent souvent les modèles de `docs/prompts/PROMPTS-TALEND.md` :
des lignes `CLÉ : valeur` en majuscules (`MODE`, `JOB`, `VERSION`, `CONTEXTE`,
`BUILD`, `EXECUTION`, `JAVA`, `LOG`, `ERREUR`, `ATTENDU`, `OBJECTIF`,
`CONSIGNES`…). `MODE` vaut `DIAGNOSTIC` ou `CONCEPTION`.

- Si une valeur contient encore un emplacement `{{…}}` non remplacé, la
  traiter comme inconnue : la demander, ou écrire `INCONNU` dans le rapport.
- Une clé absente n'est pas une erreur : appliquer les règles de ce fichier.

## Contrat anti-hallucination

Chaque affirmation importante doit être classée :

| Classe | Signification |
|---|---|
| **Fait observé** | présent dans un log, un artefact ou une source officielle |
| **Inférence** | déduction directe de plusieurs faits cités |
| **Hypothèse** | explication plausible encore non confirmée |
| **Inconnu** | information absente ou inaccessible |

Formulations obligatoires :

```text
Hypothèse non confirmée : ...
Élément manquant pour confirmer : ...
```

Interdictions :

- inventer un nom de Job, composant, contexte, variable, table ou endpoint ;
- inventer une connexion ou un lien entre composants ;
- présenter une valeur masquée comme une valeur vide ;
- confondre absence de preuve et preuve d’absence ;
- conclure depuis une capture seule si l’artefact ou le log est disponible ;
- appliquer une règle de release mensuelle à TOS 8.0.1 sans preuve du patch.

## Porte de compatibilité TOS 8.0.1

Avant toute conclusion Java, Camel, CXF, Karaf ou Runtime, relever si possible :

- produit exact : TOS DI, TOS ESB ou Talend Studio sous abonnement ;
- build complet de Studio, pas seulement « 8.0.1 » ;
- patch mensuel éventuel (`RYYYY-MM`) ;
- Java de lancement, de compilation et d’exécution ;
- version Talend Runtime/Karaf ;
- OS et mode d’exécution.

Les pages Qlik Help « 8.0 R2024…/R2025…/R2026… » décrivent des mises à jour
mensuelles. Elles servent de source conditionnelle, pas de preuve que la
fonction existe dans un TOS 8.0.1 GA.

Si le build exact manque :

```text
Hypothèse non confirmée : cette règle dépend du niveau de mise à jour Talend 8.
Élément manquant pour confirmer : numéro de build complet de Studio et version du Runtime.
```

## Priorité des preuves

1. erreur complète et chaîne `Caused by` ;
2. logs Studio, JobServer, Runtime/Karaf ou applicatifs ;
3. couple `.properties` + `.item` du Job/Route/Service ;
4. contextes, routines, métadonnées et paramètres projet référencés ;
5. Jobs enfants et dépendances externes ;
6. code Java généré déjà fourni ;
7. documentation Qlik/Talend compatible avec le build ;
8. hypothèses explicitement marquées.

Ne pas recopier de longs XML ou logs. Extraire uniquement la preuve utile et
indiquer son fichier.

## Périmètre relationnel obligatoire

Ne pas traiter le composant fautif isolément. Examiner selon le symptôme :

- Job parent et Jobs enfants `tRunJob` ;
- ordre des sous-jobs, liens row et triggers ;
- contextes locaux/repository et contexte réellement lancé ;
- paramètres d’export et overrides ;
- Implicit Context Load et `tContextLoad` ;
- routines, beans, JAR et imports ;
- métadonnées repository et schémas propagés ;
- transactions, connexions partagées et parallélisation ;
- endpoints, méthodes, schémas et Runtime pour ESB.

## Graphe et contexte réels

Construire un graphe uniquement depuis les nœuds et connexions observés dans
les artefacts. Pour les contextes, représenter la chronologie réelle :

1. contexte sélectionné au lancement ;
2. valeurs statiques/repository observées ;
3. overrides du script ou de l’environnement, s’ils sont fournis ;
4. chargement implicite, s’il est activé ;
5. `tContextLoad` à sa position d’exécution ;
6. passage au Job enfant par `tRunJob`.

Ne pas imposer une priorité universelle non démontrée. Une valeur peut être
écrasée plusieurs fois pendant l’exécution.

## Diagrammes et images

Proposer un diagramme seulement s'il clarifie réellement (parent + enfant,
≥ 3 étapes liées, plusieurs écrasements de contexte, flux ESB, branche d'erreur
complexe). Partir du Mermaid produit par `talend-item-extract.bat --mermaid`.

Règles : vrais noms observés (ou proposés en conception) ; contexte réel ou
`INCONNU` ; marques `[F]` fait, `[C]` conception, `[H]` hypothèse, `[?]`
inconnu ; fichiers sources cités ; aucun secret.

Une planche PNG/SVG pédagogique n'est produite qu'à la demande, après
validation du Mermaid, et doit en reprendre exactement nœuds et liens. Mention
obligatoire : « Schéma généré depuis les artefacts — pas une capture Studio »
(diagnostic) ou « Conception proposée — à réaliser manuellement dans Talend
Studio — pas une capture Studio » (conception). En cas d'écart, livrer
seulement le Mermaid. Détails : `docs/ai/VISUALISATION-TALEND.md`.

## Secrets et données sensibles

Masquer systématiquement :

```text
password=****
token=****
Authorization=Bearer ****
user=<masqué si nécessaire>
host=<masqué si nécessaire>
```

Ne pas reproduire une chaîne de connexion complète, un payload personnel, un
dump ou un log sensible.

## Sortie attendue

Le détail va dans un fichier, pas dans le chat :

- diagnostic → `docs/ai/diagnostics/DIAG-<id>-<nom>.md` depuis
  `docs/ai/diagnostics/TEMPLATE-diagnostic.md` ;
- conception → `docs/ai/designs/DESIGN-<id>-<nom>.md` depuis
  `docs/ai/designs/TEMPLATE-conception.md`.

Réponse finale dans le chat (courte, sans recopier le rapport) :

```markdown
**Résumé** : 1–3 phrases.
**Cause probable** : … (Fait observé / Inférence / Hypothèse non confirmée · confiance faible/moyenne/forte)
**Correction proposée à appliquer manuellement dans Talend Studio** : 1–3 actions.
**Tests après correction** : 1–3 tests.
**Non confirmé / éléments manquants** : …
**Rapport** : lien vers le fichier.
```

Pour une conception, remplacer « Cause probable » et « Correction » par
« Conception proposée à réaliser manuellement dans Talend Studio » (graphe
minimal + lien vers le fichier).

Ne jamais écrire « j'ai corrigé le Job » ou présenter une cause comme certaine
sans preuve.
