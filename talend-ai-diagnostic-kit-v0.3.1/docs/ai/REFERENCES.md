# Références Talend/Qlik — DI/ESB hors Cloud

> Vérifiées le 2026-07-29. Utiliser une source externe seulement lorsqu’un fait
> local ne suffit pas. Conserver le lien dans le diagnostic, sans recopier la
> page complète.

## 1. Règle d’applicabilité

La mention « Talend 8.0.1 » ne prouve pas qu’une mise à jour mensuelle
`RYYYY-MM` est installée.

| Source | Usage |
|---|---|
| Page composant `8.0` | comportement fonctionnel général, à confirmer dans le composant local |
| Guide `8.0-RYYYY-MM` | seulement si le build/patch est compatible ou pour formuler une hypothèse |
| Release notes mensuelles | compatibilité Java/Camel/Runtime du patch concerné |
| Guide 7.x ou v5 | compréhension legacy uniquement |

Formulation legacy obligatoire :

```text
Le guide v5 indique ..., mais pour Talend 8 il faut vérifier la documentation
Qlik/Talend 8.x avant de conclure.
```

## 2. Pages prioritaires

### Disponibilité des composants

- [Talend Studio components availability 8.0](https://help.qlik.com/talend/en-US/studio-components-availability/8.0/studio-components-availability)
- Base de la [documentation détaillée des composants 8.0](https://help.qlik.com/talend/en-US/components/8.0/)

Objet : vérifier la disponibilité d’un composant selon le produit, le type de
Job et les fonctionnalités Talend Studio installées.

Consulté le : 2026-07-29.

#### Porte de disponibilité pour le débogage

| Contrôle | Preuve attendue |
|---|---|
| Type exact | valeur du composant dans le `.item` |
| Framework | Standard, Spark Batch, Spark Streaming, Route ou Service |
| Produit | TOS DI, TOS ESB ou édition Studio observée |
| Build | numéro complet et patch éventuel |
| Installation locale | composant dans la Palette, feature/plugin présent |
| Disponibilité officielle | ligne correspondante dans la matrice |
| Comportement | fiche détaillée du composant |
| Échec réel | log et chaîne `Caused by` |

Cas de diagnostic :

- composant absent ou inconnu ;
- Job importé/migré impossible à ouvrir ou compiler ;
- composant non supporté dans le framework du Job ;
- fonctionnalité requise non installée ;
- composant déprécié, retiré ou réservé à une édition.

La matrice ne prouve pas l’installation locale et ne remplace ni le `.item`, ni
la Palette, ni le build, ni les logs. Toujours ouvrir la fiche du composant
avant une décision d’implémentation ou de migration.

### Contextes

- [Contextes et variables Studio](https://help.qlik.com/talend/en-US/studio-user-guide/8.0-R2024-06/contexts-and-variables)
- [`tContextLoad`](https://help.qlik.com/talend/en-US/components/8.0/context/tcontextload)
- [Application de Project Settings](https://help.qlik.com/talend/en-US/studio-user-guide/8.0-R2024-11/applying-project-settings)

Règles retenues :

- utiliser des types adaptés (`Password`, `File`, `Directory`, etc.) ;
- `globalMap` n’est pas synchronisé par défaut ;
- un chargement dynamique peut rendre les valeurs statiques inopérantes ;
- Implicit Context Load et Stats & Logs peuvent être appliqués par projet ;
- `tContextLoad` charge un flux à deux colonnes, modifie le contexte actif et
  ne crée pas une variable absente.

### Jobs enfants

- [`tRunJob` — paramètres spécifiques](https://help.qlik.com/talend/en-US/job-script-reference-guide/8.0/component-specific-settings-for-trunjob)

Règles retenues :

- vérifier Job, ID, version et contexte enfant ;
- les paramètres explicites enfant priment sur les valeurs transmises ;
- le mode dynamique utilise la dernière version et un processus indépendant ;
- les modes dynamique/indépendant peuvent être incompatibles avec le cache
  JobServer et une connexion DB partagée ;
- `Die on child error` et `Transmit whole context` doivent être relevés.

### Conception DI — fichier délimité vers MySQL

- [`tFileInputDelimited` Standard](https://help.qlik.com/talend/en-US/components/8.0/delimited/tfileinputdelimited-standard-properties)
- [`tMap` Standard](https://help.qlik.com/talend/en-US/components/8.0/tmap/tmap-standard-properties)
- [`tMysqlOutput` Standard](https://help.qlik.com/talend/en-US/components/8.0/mysql/tmysqloutput-standard-properties)
- [Composants MySQL](https://help.qlik.com/talend/en-US/components/8.0/mysql/mysql-component)

Règles retenues :

- `tFileInputDelimited` lit les fichiers délimités selon le séparateur, les
  options CSV, l’en-tête, l’encodage et le schéma ;
- `tMap` est conditionnel si le flux nécessite mapping, conversion, filtre ou
  règle métier ;
- `tMysqlOutput` écrit un flux dans une table et son action sur les données doit
  être choisie selon la stratégie de clé et d’idempotence ;
- une action destructrice sur la table n’est jamais une valeur par défaut ;
- `Die on error` et les liens `Row > Reject` doivent refléter la politique de
  rejet ;
- batch, connexion partagée et transaction sont des optimisations ou garanties
  à justifier, pas des composants obligatoires du graphe minimal.

### ESB REST

- [`tRESTRequest`](https://help.qlik.com/talend/en-US/components/8.0/esb-rest/trestrequest)

Règles retenues :

- composant de la famille ESB, à analyser avec le Service Repository ;
- méthodes HTTP, endpoint, URI pattern, `Consumes` et `Produces` à comparer ;
- un schéma est requis pour les paramètres de chemin et autres paramètres ;
- le body POST/PUT utilise une colonne `body` et un type supporté ;
- HTTPS dépend du keystore et de la configuration du Runtime ;
- les ports documentés sont des valeurs par défaut, pas une preuve du port
  réellement utilisé.

### Studio et export

- [Vues de Talend Studio](https://help.qlik.com/talend/en-US/discovering-talend-studio/8.0/inside-talend-studio)
- [Build d’un Job standalone](https://help.qlik.com/talend/en-US/studio-user-guide/8.0-R2024-10/building-job-as-standalone-job)

Règles retenues :

- Repository, Designer, Component et Run ont des rôles distincts ;
- `.item` et `.properties` sont des sources Studio, pas des fichiers à éditer ;
- l’export stocke la sélection de contexte dans le script `.bat`/`.sh` et les
  valeurs dans des fichiers de contexte `.properties` d’exécution : ces
  derniers doivent être distingués des `.properties` d’artefact Talend.

## 3. Compatibilité conditionnelle des mises à jour Studio 8

- [Release notes Talend Studio 8 R2025-04](https://help.qlik.com/talend/en-US/release-notes/8.0/r2025-04-studio)
- [Patch officiel R2025-02 ciblant 8.0.1](https://update.talend.com/Studio/8/updates/R2025-02/PATCH_RELEASE_NOTE.html)
- [Java des routines, documentation R2025-09](https://help.qlik.com/talend/en-US/studio-user-guide/8.0-R2025-09/setting-compiler-compliance-level)

Ces pages montrent que les releases mensuelles peuvent changer Java, Camel et
les exigences Runtime tout en gardant la base « 8.0.1 ». Elles ne prouvent pas
qu’un TOS 8.0.1 GA dispose de Java 17, Camel 4 ou des fonctions récentes.

Règle :

```text
Ne jamais recommander `--add-opens`, Java 17, Camel 4 ou une mise à niveau
Runtime sur le seul libellé 8.0.1. Exiger le build complet, le patch et l’erreur.
```

## 4. Fin de Talend Open Studio

L’ancienne annonce Talend peut rediriger vers une page produit Qlik. Ne pas
l’utiliser comme source de comportement technique :

- [Ancienne URL d’annonce TOS](https://www.talend.com/blog/update-on-the-future-of-talend-open-studio/)

Le kit reste utilisable pour diagnostiquer les dépôts TOS existants, sans
supposer un accès aux dépôts de mises à jour sous abonnement.

## 5. Contrat de citation

Dans le rapport, préciser :

- page consultée ;
- version affichée par la page ;
- règle retenue ;
- build local auquel elle est appliquée ;
- limite ou incompatibilité restante.

Si la page est plus récente que le Studio observé, classer la règle comme
`Hypothèse non confirmée` jusqu’à validation.
