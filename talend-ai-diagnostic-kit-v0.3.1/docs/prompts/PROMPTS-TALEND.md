# Modèles de prompts — kit Talend

> Fichier destiné aux **humains** : modèles de demandes prêts à copier dans l'assistant IA.
> L'IA ne lit pas ce fichier.

## Mode d'emploi

1. Copier le bloc du modèle voulu.
2. Remplacer **chaque** élément `{{…}}` (accolades comprises) par votre valeur.
   `{{a | b | c}}` signifie : garder une seule des valeurs proposées.
3. Ne pas modifier les **mots-clés** en majuscules suivis de `:` (`MODE :`, `JOB :`…).
4. Supprimer une ligne si l'information n'existe pas (ex. pas d'erreur), sauf `MODE`.

Si un `{{…}}` est oublié, l'IA demandera la valeur au lieu de l'inventer.

## Sommaire

- T01 — Inventaire d'un projet Talend
- T02 — Diagnostiquer un Job en erreur
- T03 — Diagnostic rapide à partir d'une erreur
- T04 — Compléter un diagnostic
- T05 — Clôturer après correction
- T06 — Concevoir un nouveau Job
- T07 — Vérifier un Job réalisé par rapport à sa conception
- T08 — Documenter un Job existant
- T09 — Analyse d'impact
- T10 — Revue avant mise en production

## Découverte

### T01 — Inventaire d'un projet Talend

*Quand :* Premier contact avec le projet.

```text
MODE : DIAGNOSTIC
OBJECTIF : inventaire du projet
CONSIGNES : lance scripts\talend-item-extract.bat --list . ; résume les Jobs, versions et dossiers ; signale les Jobs présents en plusieurs versions ; ne lis aucun .item en entier.
```

## Diagnostic

### T02 — Diagnostiquer un Job en erreur

*Quand :* Échec d'exécution, résultat incorrect.

```text
MODE : DIAGNOSTIC
JOB : {{NOM_DU_JOB}}
VERSION : {{VERSION_DU_JOB}}
CONTEXTE : {{CONTEXTE_LANCE}}
BUILD : {{BUILD_STUDIO_COMPLET}}
EXECUTION : {{Studio | export standalone | JobServer | Runtime}}
JAVA : {{VERSION_JAVA}}
LOG : {{CHEMIN_DU_LOG}}
ATTENDU : {{RESULTAT_ATTENDU}}
CONSIGNES : rapport dans docs/ai/diagnostics/ ; réponse au format court.
```

### T03 — Diagnostic rapide à partir d'une erreur

*Quand :* Seul le message d'erreur est disponible.

```text
MODE : DIAGNOSTIC
JOB : {{NOM_DU_JOB}}
ERREUR :
{{COLLER_LA_PREMIERE_EXCEPTION_ET_LES_CAUSED_BY}}
CONSIGNES : diagnostic partiel accepté ; liste les éléments manquants pour confirmer.
```

### T04 — Compléter un diagnostic

*Quand :* Réponse aux éléments manquants demandés par le rapport.

```text
MODE : DIAGNOSTIC
RAPPORT : docs/ai/diagnostics/{{NOM_DU_RAPPORT}}.md
ELEMENTS FOURNIS :
- {{ELEMENT_1}}
- {{ELEMENT_2}}
CONSIGNES : mets à jour le rapport et le niveau de confiance ; reclasse les hypothèses confirmées ou infirmées.
```

### T05 — Clôturer après correction

*Quand :* Le développeur a appliqué et testé la correction dans Studio.

```text
MODE : DIAGNOSTIC
RAPPORT : docs/ai/diagnostics/{{NOM_DU_RAPPORT}}.md
CORRECTION APPLIQUEE : {{CE_QUI_A_ETE_FAIT_DANS_STUDIO}}
RESULTAT DU TEST : {{RESULTAT_OBTENU}}
CONSIGNES : reporte le résultat, passe le diagnostic en DONE, mets à jour docs/ai/PROJECT-TRACKING.md.
```

## Conception

### T06 — Concevoir un nouveau Job

*Quand :* Nouveau besoin de flux.

```text
MODE : CONCEPTION
BESOIN : {{DESCRIPTION_DU_FLUX}}
SOURCE : {{TYPE_ET_SCHEMA_SOURCE}}
CIBLE : {{TYPE_ET_SCHEMA_CIBLE}}
REGLES : {{INSERTION_MISE_A_JOUR_REJETS}}
BUILD : {{BUILD_STUDIO_COMPLET}}
CONSIGNES : graphe minimal, réglages essentiels, Mermaid exact, étapes manuelles dans Studio ; aucun .item ; conception dans docs/ai/designs/.
```

### T07 — Vérifier un Job réalisé par rapport à sa conception

*Quand :* Après réalisation dans Studio.

```text
MODE : DIAGNOSTIC
JOB : {{NOM_DU_JOB}}
CONCEPTION : docs/ai/designs/{{NOM_DE_LA_CONCEPTION}}.md
CONSIGNES : compare composants, connexions et réglages du Job réel avec la conception ; liste les écarts.
```

## Documentation

### T08 — Documenter un Job existant

*Quand :* Job non documenté, passation.

```text
MODE : DIAGNOSTIC
OBJECTIF : documentation
JOB : {{NOM_DU_JOB}}
CONSIGNES : lance talend-item-extract.bat avec --mermaid et --schema ; rédige une fiche d'une page (rôle, entrées, sorties, contextes, Jobs enfants, points de vigilance).
```

### T09 — Analyse d'impact

*Quand :* Avant de modifier une table, un fichier, une variable de contexte.

```text
MODE : DIAGNOSTIC
OBJECTIF : analyse d'impact
CHANGEMENT PREVU : {{EX. RENOMMER_LA_COLONNE_client.cree_le}}
CONSIGNES : cherche avec rg dans process, context et metadata ; liste les Jobs et composants concernés ; ne modifie rien.
```

## Qualité

### T10 — Revue avant mise en production

*Quand :* Avant déploiement d'un Job modifié.

```text
MODE : DIAGNOSTIC
OBJECTIF : revue avant production
JOB : {{NOM_DU_JOB}}
VERSION : {{VERSION_DU_JOB}}
CONSIGNES : applique docs/ai/review-checklist.md ; signale les secrets, contextes codés en dur, gestion d'erreur absente et Jobs enfants non maîtrisés.
```
