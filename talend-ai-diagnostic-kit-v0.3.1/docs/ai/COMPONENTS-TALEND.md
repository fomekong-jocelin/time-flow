# Fiches ciblées — Composants Talend critiques

Lire seulement la fiche du composant réellement présent.

## `tContextLoad`

Source : [Qlik Help 8.0](https://help.qlik.com/talend/en-US/components/8.0/context/tcontextload)

### Faits documentés

- charge le contexte depuis un flux amont ;
- schéma à deux colonnes : nom du paramètre et valeur ;
- modifie dynamiquement le contexte actif ;
- les valeurs dynamiques concernées remplacent les valeurs statiques ;
- avertit des clés inconnues ou non chargées sans bloquer par défaut ces
  contrôles ;
- `Die on error` est sélectionné par défaut ;
- ne peut pas être le premier composant ;
- ne crée pas une variable absente du contexte par défaut ;
- expose notamment `KEY_NOT_INCONTEXT`, `KEY_NOT_LOADED` et `ERROR_MESSAGE`.

### Preuves à extraire

- composant amont et format source ;
- ordre des colonnes du schéma ;
- séparateur, encodage et header du fichier éventuel ;
- position réelle dans le graphe ;
- options d’erreur et de log ;
- clés réellement chargées, sans afficher les secrets ;
- activation éventuelle d’Implicit Context Load en parallèle.

### Causes fréquentes

- colonnes clé/valeur inversées ;
- clé mal orthographiée ou absente du contexte ;
- variable de contexte non fournie dans la source ;
- mauvais contexte lancé ;
- valeur statique supposée active alors qu’elle a été remplacée ;
- `Print operations` exposant une valeur sensible ;
- erreur non bloquante interprétée comme succès complet.

## `tRunJob`

Source : [Qlik Help 8.0](https://help.qlik.com/talend/en-US/job-script-reference-guide/8.0/component-specific-settings-for-trunjob)

### Faits documentés

- `PROCESS` identifie le Job appelé ;
- le contexte enfant et la version peuvent être précisés ;
- la dernière version est utilisée par défaut si aucune version n’est fixée ;
- `Die on child error` vaut `true` par défaut dans la référence ;
- `Transmit whole context` transmet les valeurs parent ;
- les paramètres explicites enfant l’emportent pour l’exécution enfant ;
- le mode dynamique appelle la dernière version via un processus indépendant ;
- processus dynamique/indépendant et connexion DB partagée peuvent être
  incompatibles ;
- le cache JobServer peut être incompatible avec ces modes.

### Preuves à extraire

- nom, ID et version du Job enfant ;
- contexte enfant sélectionné ;
- transmission complète ;
- liste des paramètres explicites ;
- option d’erreur enfant ;
- mode dynamique ou indépendant ;
- connexions DB partagées ;
- gestion du retour ou du buffer ;
- log complet de l’enfant.

### Causes fréquentes

- contexte enfant différent du parent ;
- paramètre explicite obsolète écrasant la bonne valeur parent ;
- version enfant inattendue ;
- erreur enfant masquée ;
- incompatibilité processus indépendant/connexion partagée ;
- dépendance absente uniquement dans l’environnement enfant.

## `tRESTRequest`

Source : [Qlik Help 8.0](https://help.qlik.com/talend/en-US/components/8.0/esb-rest/trestrequest)

### Faits documentés

- reçoit des requêtes HTTP/HTTPS côté serveur ;
- appartient à la famille ESB et se traite avec le Service Repository ;
- gère notamment GET, POST, PUT, PATCH et DELETE ;
- endpoint et URI pattern sont distincts ;
- un schéma devient nécessaire pour les paramètres de chemin, query, header ou
  form ;
- les commentaires de colonnes identifient le type de paramètre ;
- le body POST/PUT est récupéré via une colonne nommée `body` avec un type
  supporté ;
- `Consumes` et `Produces` doivent correspondre au contrat ;
- HTTPS nécessite un keystore et une configuration du Runtime.

### Preuves à extraire

- Service/Job contenant le composant ;
- endpoint résolu après contexte ;
- verbe et URI pattern ;
- schéma de chaque flow ;
- commentaires `path`, `query`, `header`, `form`, etc. ;
- défauts des paramètres optionnels ;
- `Consumes`, `Produces`, body et réponse ;
- port, keystore et configuration Runtime ;
- logs CXF/Karaf et version du Runtime.

### Causes fréquentes

- mauvais endpoint ou contexte ;
- port Studio confondu avec port Runtime ;
- verbe non mappé ;
- paramètre de chemin absent du schéma ;
- nom de colonne non compatible avec le code généré ;
- `Consumes`/payload ou `Produces`/réponse incohérents ;
- header obligatoire absent ;
- service construit avec une version Studio incompatible avec le Runtime.

## Formulation de correction

Ne jamais fournir un patch XML. Utiliser :

```text
Correction proposée à appliquer manuellement dans Talend Studio : ouvrir le
Job/Service ..., sélectionner le composant ..., contrôler ..., puis exécuter le
test ciblé ... dans le contexte ....
```
