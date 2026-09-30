# WORKFLOW IA — Diagnostic Talend en lecture seule

## 1. Ouvrir ou créer le suivi

- [ ] Identifier le ticket ou créer `tickets/TICKET-<id>.md`.
- [ ] Si un incident est analysé, créer
  `diagnostics/DIAG-<id>-<nom>.md` depuis le modèle.
- [ ] Définir le symptôme et le résultat attendu.
- [ ] Laisser le statut `IN_PROGRESS` tant que la cause ou les preuves restent
  incomplètes.

## 2. Cadrer l’environnement

Relever :

- produit exact et build complet ;
- DI ou ESB ;
- Job, Route ou Service et version ;
- contexte exécuté ;
- Studio, standalone, JobServer ou Runtime ;
- Java de lancement/compilation/exécution ;
- OS, base, API, broker ou fichier concerné ;
- message d’erreur complet et phase d’échec.

Écrire `INCONNU` au lieu d’inventer.

## 3. Inventorier sans tout charger

Chercher d’abord :

```text
talend.project
.project
process/
process_mr/
process_storm/
route/
service/
joblets/
context/
code/routines/
code/beans/
metadata/
*.log
```

Commencer par les extractions en lecture seule :

```text
scripts\talend-item-extract.bat --list .
scripts\talend-item-extract.bat --job <nom> . --mermaid
scripts\talend-log-extract.bat <log> --grep <composant>
```

Puis n’ouvrir, si nécessaire, que des plages ciblées du couple
`.properties`/`.item` concerné et des dépendances qu’il référence.

## 4. Reconstruire le chemin d’exécution

### Job DI

```text
Job parent
├─ sous-job d’entrée
├─ transformations
├─ sorties/rejets
├─ tRunJob -> Job enfant
├─ OnComponentError / OnSubjobError / tDie / tWarn
└─ commit / rollback / logs
```

### Service ou Route ESB

```text
Endpoint entrant
├─ méthode, URI, headers et payload
├─ validation et transformation
├─ appel DB/API/JMS/fichier
├─ réponse
└─ gestion d’erreur et Runtime
```

Utiliser les connexions et triggers observés. La position graphique seule ne
prouve pas l’ordre.

## 5. Résoudre les contextes

Pour chaque variable critique :

1. contexte sélectionné au lancement ;
2. valeur statique du Job ou repository ;
3. override du script/export si fourni ;
4. Implicit Context Load si activé ;
5. `tContextLoad` et son flux amont ;
6. paramètre transmis au Job enfant ;
7. valeur réellement visible dans le log, si elle n’est pas sensible.

Masquer les secrets. Distinguer valeur vide, absente et masquée.

## 6. Vérifier selon le symptôme

### `tRunJob`

- Job, ID et version appelés ;
- contexte enfant ;
- `Transmit whole context` ;
- paramètres explicites ;
- `Die on child error` ;
- processus indépendant/dynamique ;
- connexion DB partagée ;
- propagation du résultat et erreur enfant.

### Schémas et mappings

- noms, ordre, types, nullabilité, longueur, précision ;
- formats de dates et encodage ;
- schéma repository vs composant ;
- propagation après changement ;
- expressions Java et conversions XML/JSON.

### SQL

- `context.*`, quotes et concaténations ;
- noms et alias ;
- jointures, filtres et dates ;
- zéro ligne, droits, verrous, commit/rollback ;
- injection si une entrée externe est concaténée.

### Routines/dépendances

- imports, méthodes, signatures et JAR ;
- compatibilité Java ;
- `globalMap` et parallélisation ;
- exceptions masquées et réflexion Java.

### Disponibilité d’un composant

Appliquer ce contrôle si le log ou Studio indique notamment :

- composant inconnu ou introuvable ;
- composant absent de la Palette ;
- plugin/feature manquant ;
- Job impossible à ouvrir après import ou migration ;
- erreur de génération liée au type du composant ;
- composant autorisé en Standard mais pas dans le framework du Job ;
- composant DI utilisé dans un périmètre ESB/Route incompatible.

Procédure :

1. extraire le type exact du composant depuis le `.item` ;
2. relever Standard, Spark Batch, Spark Streaming, Route ou Service ;
3. relever TOS DI, TOS ESB ou édition Talend Studio observée ;
4. vérifier les fonctionnalités réellement installées dans Studio ;
5. consulter la matrice officielle de disponibilité ;
6. consulter la fiche détaillée du composant ;
7. comparer au build et aux logs locaux.

Si la matrice indique une disponibilité mais que le composant manque localement,
rechercher une feature non installée, une installation incomplète ou un écart
de build. Si elle indique une indisponibilité, classer la cause comme probable
seulement après confirmation du produit et du type de Job.

Ne jamais remplacer automatiquement le composant.

### ESB

- endpoint, port et contexte ;
- méthode, URI pattern, `Consumes`/`Produces` ;
- headers, query/form/path params et body ;
- HTTPS/keystore ;
- versions Studio/Runtime/Java/Camel ;
- logs Karaf et dépendances.

## 7. Lire les logs

D’abord : `scripts\talend-log-extract.bat <log> --grep <composant>`.
Ensuite seulement, si nécessaire, chercher dans le log :

```text
ERROR
Exception
Caused by
NullPointerException
ClassNotFoundException
NoClassDefFoundError
SQLException
ORA-
SQLServerException
PSQLException
MySQLSyntaxErrorException
InaccessibleObjectException
SocketTimeoutException
ConnectException
401
403
404
500
```

Identifier la première cause utile, le composant correspondant et les
compteurs d’entrée/sortie/rejet.

Si les logs sont insuffisants :

```text
Correction proposée à appliquer manuellement dans Talend Studio : activer
temporairement Stats & Logs ou ajouter un point de log non sensible autour du
composant concerné, puis reproduire l’erreur dans un environnement contrôlé.
```

## 8. Appliquer la porte de version

Ne jamais déduire Java/Camel depuis « 8.0.1 » seul.

- build et patch confirmés : utiliser la documentation correspondante ;
- TOS 8.0.1 GA ou build inconnu : rester sur les faits locaux et les pages 8.0
  génériques ;
- release mensuelle citée : vérifier qu’elle est réellement installée ;
- Runtime ESB : exiger l’alignement prouvé avec le Studio avant de conclure.

## 9. Visualiser si cela réduit l’ambiguïté

Créer un diagramme si le Job enfant, les branches d’erreur ou les écrasements
de contexte sont difficiles à suivre. Suivre `VISUALISATION-TALEND.md`.

Ne pas produire d’image décorative ou de faux écran Studio.

## 10. Conclure

Classer chaque cause :

| Cause | Confiance | Preuves | Contre-indices | Manque |
|---|---|---|---|---|
| ... | Faible/Moyenne/Forte | P1, P2 | ... | ... |

Pour chaque correction :

```text
Correction proposée à appliquer manuellement dans Talend Studio : ...
```

Ajouter des tests ciblés et les risques de régression. Ne jamais exécuter le
Job ou le déploiement sans autorisation explicite.

## 11. Fermer le suivi

- [ ] Rapport relu avec `review-checklist.md`.
- [ ] Ticket mis à jour avec seulement les contrôles réellement effectués.
- [ ] `PROJECT-TRACKING.md` mis à jour.
- [ ] `CHANGELOG.md` mis à jour seulement si le kit ou une décision documentée
  change.
- [ ] Statut `DONE` uniquement si aucune action documentaire requise ne reste.
