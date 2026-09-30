# Checklist de revue — Diagnostic Talend

Marquer chaque point `✅`, `❌` ou `➖` avec justification. Ne jamais cocher un
contrôle non réalisé.

## 1. Sécurité et périmètre

- [ ] Aucun `.item` ou `.properties` Talend n’a été modifié.
- [ ] Aucun Job, Route, Service, routine, contexte, metadata ou SQL stocké n’a
  été réécrit.
- [ ] Aucun build, exécution, déploiement ou accès externe n’a été lancé sans
  autorisation.
- [ ] Les secrets, tokens, credentials et données personnelles sont masqués.
- [ ] Les corrections sont formulées comme actions manuelles dans Talend Studio.

## 2. Environnement

- [ ] Produit/édition identifié ou marqué `INCONNU`.
- [ ] Build complet/patch identifié ou marqué `INCONNU`.
- [ ] Contexte exécuté identifié ou marqué `INCONNU`.
- [ ] Mode d’exécution identifié.
- [ ] Java et Runtime pertinents identifiés ou demandés.
- [ ] Les règles d’une release mensuelle ne sont pas attribuées à TOS sans
  preuve.

## 3. Artefact et graphe

- [ ] Couple `.properties`/`.item` correspondant vérifié.
- [ ] Label, version, ID et chemin relevés.
- [ ] Composants et connexions utiles extraits.
- [ ] Triggers et branches d’erreur inspectés.
- [ ] Jobs enfants `tRunJob` suivis.
- [ ] L’ordre n’est pas déduit de la seule position graphique.

## 4. Contextes

- [ ] Contexte de lancement vérifié.
- [ ] Valeurs statiques locales/repository vérifiées.
- [ ] Implicit Context Load vérifié si pertinent.
- [ ] `tContextLoad` et son flux amont vérifiés si présents.
- [ ] Overrides d’export/script vérifiés si fournis.
- [ ] Paramètres `tRunJob` parent/enfant vérifiés.
- [ ] Valeur absente, vide et masquée ne sont pas confondues.
- [ ] Types `Password`, `File`, `Directory`, numériques et booléens contrôlés.

## 5. Données et schémas

- [ ] Colonnes attendues/réelles comparées.
- [ ] Types source/Talend comparés.
- [ ] Nullabilité, longueur et précision contrôlées.
- [ ] Dates, timezone et encodage contrôlés.
- [ ] Schéma repository et propagation contrôlés.
- [ ] Rejets et compteurs examinés.

## 6. SQL et transactions

- [ ] Variables `context.*` et concaténations inspectées.
- [ ] Quotes, dates, alias et noms d’objets inspectés.
- [ ] Jointures et filtres inspectés.
- [ ] Cas « zéro ligne sans erreur » considéré.
- [ ] Commit, rollback, verrou et droits considérés.
- [ ] Risque d’injection signalé si entrée externe concaténée.

## 7. Routines et dépendances

- [ ] Imports, méthodes et signatures inspectés.
- [ ] JAR et versions inspectés si l’erreur le justifie.
- [ ] Compatibilité Java fondée sur le build réel.
- [ ] `globalMap`/parallélisation considérés si pertinents.
- [ ] Exception racine et première frame projet utiles identifiées.

## 8. Disponibilité des composants

- [ ] Type exact extrait de l’artefact.
- [ ] Framework du Job/Route identifié.
- [ ] Produit et build local identifiés ou marqués `INCONNU`.
- [ ] Features/plugins installés vérifiés si pertinent.
- [ ] Matrice officielle consultée.
- [ ] Fiche détaillée du composant consultée.
- [ ] Disponibilité officielle et installation locale non confondues.
- [ ] Aucun remplacement automatique proposé.

## 9. ESB

- [ ] Composant entrant et mode Service/Route identifiés.
- [ ] Endpoint, méthode, URI et contexte vérifiés.
- [ ] `Consumes`, `Produces`, headers, query/form/path params vérifiés.
- [ ] Body et schéma de réponse vérifiés.
- [ ] Port, HTTPS et keystore vérifiés si pertinents.
- [ ] Studio, Runtime, Java, Camel/CXF comparés sans extrapolation.
- [ ] Logs Runtime/Karaf examinés.

## 10. Preuves et conclusion

- [ ] Chaque fait important cite un fichier, log ou lien officiel.
- [ ] Les inférences référencent leurs faits sources.
- [ ] Les hypothèses sont explicitement marquées.
- [ ] Les informations manquantes sont listées.
- [ ] Le niveau de confiance est justifié.
- [ ] Les contre-indices sont mentionnés.
- [ ] La conclusion n’emploie pas de certitude injustifiée.

## 11. Visualisation

- [ ] Un diagramme n’est utilisé que s’il améliore la compréhension.
- [ ] Tous les nœuds et liens sont observés ou marqués hypothétiques.
- [ ] Le contexte affiché est réel ou `INCONNU`.
- [ ] Les fichiers sources sont cités sous le diagramme.
- [ ] Aucune valeur sensible n’apparaît.
- [ ] Aucune illustration du kit (`docs/illustrations/`) utilisée comme preuve d’un projet réel.
- [ ] Tableaux et Mermaid issus des scripts d’extraction, pas de XML ni de log brut recopié.

## 12. Correction et tests

- [ ] Chaque action commence par la formulation manuelle obligatoire.
- [ ] La vue Studio, l’artefact et le composant sont indiqués.
- [ ] Le test est ciblé et reproductible par le développeur.
- [ ] Les compteurs, outputs/rejets et effets de bord sont vérifiés.
- [ ] Le Job parent et les enfants sont inclus.
- [ ] Le Runtime ESB est inclus si applicable.
- [ ] Les risques de régression sont explicites.

## 13. Conception guidée si applicable

- [ ] La proposition commence par la mention de conception manuelle.
- [ ] Aucun `.item`, `.properties` ou XML/XMI Talend n’est généré.
- [ ] Les composants ont leur nom officiel exact.
- [ ] La matrice, le produit, le framework et la Palette sont vérifiés ou
  marqués `INCONNU`.
- [ ] Le graphe minimal est présenté avant les composants optionnels.
- [ ] Chaque composant optionnel répond à une exigence explicite.
- [ ] Les réglages destructeurs sont exclus par défaut.
- [ ] `[C]` proposé n’est jamais présenté comme `[F]` observé.
- [ ] Le Mermaid et l’image correspondent au manifeste de conception.
- [ ] Seule la fiche du pattern demandé a été chargée.

## Critères de rejet immédiat

Rejeter le rapport si :

1. un artefact Talend a été modifié ;
2. une cause est déclarée certaine sans preuve ;
3. une valeur sensible est exposée ;
4. un Job enfant ou un chargement de contexte pertinent est ignoré ;
5. une règle Talend Studio mensuelle est appliquée à TOS sans build confirmé ;
6. le diagramme invente des composants, liens ou valeurs ;
7. une correction est fournie comme patch de `.item`/`.properties`.
8. une conception génère ou prétend générer un artefact importable Talend.
