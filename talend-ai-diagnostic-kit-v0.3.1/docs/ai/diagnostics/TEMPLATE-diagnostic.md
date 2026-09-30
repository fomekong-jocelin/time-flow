# Diagnostic Talend — <Job / Route / Service>

## 1. Résumé

- Symptôme : ...
- Environnement : ...
- Produit/build : ...
- Contexte exécuté : ...
- Probabilité de cause principale : Faible / Moyenne / Forte

## 2. Cause probable

Cause : ...

Niveau de confiance : ...

Classe : Fait observé / Inférence / Hypothèse non confirmée

## 3. Preuves observées

| ID | Classe | Preuve | Fichier / Log | Interprétation |
|---|---|---|---|---|
| P1 | Fait observé | ... | ... | ... |

## 4. Analyse détaillée

### 4.1 Graphe d’exécution

Coller le tableau « Composants / Connexions » et le Mermaid produits par
`talend-item-extract.bat`, puis annoter. Pas de XML brut.

### 4.2 Contextes

| Variable | Sources successives | Dernière valeur prouvée | État |
|---|---|---|---|
| ... | ... | ... | Fait / Hypothèse / Inconnu |

### 4.3 Composants critiques

...

### 4.4 Requêtes SQL / mappings

...

### 4.5 Routines / dépendances

...

### 4.6 ESB / Runtime si applicable

...

## 5. Correction proposée à appliquer manuellement dans Talend Studio

1. Correction proposée à appliquer manuellement dans Talend Studio : ...
2. Correction proposée à appliquer manuellement dans Talend Studio : ...

## 6. Tests de vérification après correction

- [ ] Exécuter le Job en contexte `...`
- [ ] Vérifier les compteurs d’entrée/sortie/rejet
- [ ] Vérifier la chaîne d’erreur complète
- [ ] Vérifier les tables, fichiers ou réponses impactés
- [ ] Vérifier le Job parent et les Jobs enfants
- [ ] Vérifier le Runtime ESB si applicable

## 7. Risques de régression

| Risque | Impact | Vérification recommandée |
|---|---|---|
| ... | ... | ... |

## 8. Informations manquantes

- Hypothèse non confirmée : ...
- Élément manquant pour confirmer : ...

## 9. Sources officielles utilisées

| Page | Version affichée | Règle retenue | Applicabilité locale |
|---|---|---|---|
| ... | ... | ... | Confirmée / Conditionnelle |

## 10. Conclusion

...

## Résumé

...

## Source probable du problème

...

## Preuves

...

## Correction manuelle recommandée

...

## Tests à faire après correction

...

## Risques restants

...

## Ce que je n’ai pas pu confirmer

...
