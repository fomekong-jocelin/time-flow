# Kit IA de diagnostic et conception Talend TOS DI / ESB — v0.3.1

Kit à placer à la racine d'un projet Talend pour obtenir des diagnostics
traçables et des conceptions guidées **sans jamais modifier les artefacts Talend**.

## Principes

- lecture seule des `.item`, `.properties`, Jobs, Routes, Services, routines,
  contextes et métadonnées ;
- **extraction avant lecture** : deux scripts résument un Job et un log en
  quelques dizaines de lignes au lieu de faire lire le XML ou le log complet ;
- distinction explicite entre fait, inférence, hypothèse et information manquante ;
- distinction entre TOS 8.0.1 et les releases mensuelles Talend Studio 8 ;
- correction et conception guidées, à appliquer manuellement dans Talend Studio ;
- noyau court (`AGENTS.md` + `SKILL.md`), guides chargés à la demande ;
- réponse courte dans le chat, détail dans le rapport `docs/ai/`.

## Scripts Windows (lecture seule, aucune installation)

Scripts `.bat` autonomes, exécutables depuis cmd ou PowerShell. Ils reposent
sur Windows PowerShell, présent sur tous les postes Windows 10/11.

| Commande | Usage |
|---|---|
| `scripts	alend-item-extract.bat --list .` | inventaire des Jobs/Routes/Services et versions |
| `scripts	alend-item-extract.bat --job {{NOM_DU_JOB}} . --mermaid --schema` | contextes, composants, réglages clés, connexions, Jobs enfants, schémas, Mermaid |
| `scripts	alend-item-extract.bat {{CHEMIN_DU_.item}} --component {{NOM_UNIQUE}}` | détail d'un composant (expressions tMap, requêtes…) |
| `scripts	alend-log-extract.bat {{CHEMIN_DU_LOG}} --grep {{COMPOSANT}}` | première erreur, chaîne `Caused by`, compteurs |

Les valeurs sensibles (mots de passe, `enc:…`, tokens) sont masquées.

## Utilisation

Les modèles de demandes prêts à l'emploi sont dans
`docs/prompts/PROMPTS-TALEND.md` : copier un modèle, remplacer chaque `{{…}}`,
ne pas modifier les mots-clés en majuscules (`MODE :`, `JOB :`…).

Exemple (diagnostic) :

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

Si le contexte, le build ou les logs manquent, l'IA produit un diagnostic
partiel et liste ce qui est nécessaire pour confirmer.

## Structure

```text
AGENTS.md            noyau : règles, routage, sortie
SKILL.md             méthode de diagnostic et conception
CLAUDE.md / GEMINI.md  adaptateurs
VERSION
scripts\            extraction .item et logs (.bat)
docs/prompts/        modèles de demandes (pour les humains)
docs/ai/             guides, patterns, templates, tickets, diagnostics, designs, suivi
docs/illustrations/  illustration pédagogique (jamais une preuve)
.kit/                historique du kit (jamais lu par l'IA)
```

## Limite

Ce kit ne corrige ni ne génère automatiquement les Jobs et ne suppose aucun
accès à Talend Cloud, Talend Management Console ou aux dépôts de patches sous
abonnement.

Installation : `INSTALLATION-TALEND.md`.
