# Conception guidée Talend — mode lecture seule

## 1. But

Transformer une demande fonctionnelle en proposition de Job, Route ou Service
à réaliser manuellement dans Talend Studio. Ce mode peut recommander des
composants, leurs liens et leurs réglages, mais il ne crée et ne modifie aucun
artefact Talend.

Mention obligatoire :

```text
Conception proposée à réaliser manuellement dans Talend Studio.
```

Il est interdit de générer un `.item`, un `.properties`, du XML/XMI Talend ou un
patch destiné à ces fichiers.

## 2. Entrées minimales

Relever seulement les informations qui changent réellement la conception :

| Zone | Information utile |
|---|---|
| Source | format, schéma, encodage, volume |
| Cible | technologie, objet cible, action attendue |
| Exécution | TOS DI/ESB, build, framework, contexte |
| Fiabilité | rejet, reprise, transaction, idempotence |
| Contraintes | sécurité, performance, Runtime |

Si une information manque, proposer un brouillon minimal et la marquer
`[H]`. Ne demander immédiatement que les inconnues qui changeraient le choix
des composants ou risqueraient de détruire des données.

## 3. Sélection des composants

Pour chaque composant candidat :

1. vérifier son nom exact dans la documentation 8.0 ;
2. appliquer la porte de disponibilité de `REFERENCES.md` ;
3. confirmer le framework et le produit visés ;
4. retenir le plus petit graphe couvrant le besoin ;
5. ajouter un composant optionnel seulement pour une exigence nommée ;
6. expliquer le choix en une phrase et citer la page officielle.

La matrice officielle ne prouve pas que le composant est installé localement.
La présence dans la Palette et le build Studio restent à confirmer.

## 4. Manifeste de conception

Avant de produire un diagramme ou une image, établir :

```text
Mode : CONCEPTION
Produit/build : <observé ou INCONNU>
Framework : <Standard/Route/Service/...>
Composants proposés :
- <uniqueName proposé> | <type exact> | <rôle> | [C]
Connexions proposées :
- <source> -> <cible> | <type de lien> | [C]
Réglages confirmés :
- <composant> | <paramètre> | <valeur non sensible>
Hypothèses :
- <élément> | [H]
Options écartées :
- <composant> | <raison courte>
```

`[C]` signifie « élément proposé », jamais « élément observé dans un Job ».

## 5. Réponse compacte

Livrer, dans cet ordre :

1. architecture proposée en une phrase ;
2. tableau des composants retenus ;
3. réglages essentiels uniquement ;
4. Mermaid exact issu du manifeste ;
5. étapes manuelles dans Talend Studio ;
6. tests, risques et inconnues.

Limiter la réponse au pattern demandé. Ne pas recopier le manuel du composant,
énumérer toutes ses options ou charger les fiches d’autres technologies.

## 6. Image du Job

Une image peut être proposée si le Job contient au moins trois composants, une
branche, une transaction ou si l’utilisateur la demande.

Ordre obligatoire :

1. manifeste de conception ;
2. Mermaid/SVG exact ;
3. image pédagogique éventuelle ;
4. contrôle des noms, liens et réglages visibles contre le manifeste.

Mention obligatoire sur l’image :

```text
Conception proposée — à réaliser manuellement dans Talend Studio — pas une capture Studio.
```

Si le générateur déforme un nom ou un lien, livrer le Mermaid/SVG comme source
de vérité. Voir `VISUALISATION-TALEND.md`.

## 7. Fiches de patterns

Charger une seule fiche correspondant au besoin :

| Besoin | Fiche |
|---|---|
| CSV vers MySQL | `patterns/CSV-VERS-MYSQL.md` |

Si aucun pattern ne correspond, consulter seulement les pages officielles des
composants candidats puis documenter une nouvelle fiche courte après
validation humaine.

