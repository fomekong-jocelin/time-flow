# Installation du kit Talend — v0.3.1 (Windows)

## 1. Copier le kit

Le kit se place à la racine du projet Talend : le dossier qui contient
`talend.project` et les dossiers `process\`, `context\`, `metadata\`…

Dans PowerShell (adapter les deux chemins) :

```powershell
$KIT = "C:\Outils\talend-ai-diagnostic-kit-v0.3.1"
$PRJ = "C:\TOS_DI-8.0.1\workspace\CRM_ETL"
Copy-Item "$KIT\AGENTS.md","$KIT\SKILL.md","$KIT\CLAUDE.md","$KIT\GEMINI.md","$KIT\VERSION" $PRJ
Copy-Item "$KIT\scripts","$KIT\docs" $PRJ -Recurse
```

Ne pas remplacer un `AGENTS.md` existant sans revue humaine. Le dossier `.kit\`
est facultatif (historique du kit).

## 2. Vérifier les scripts

Aucune installation n'est nécessaire : les scripts `.bat` utilisent Windows
PowerShell, intégré à Windows 10/11. Test depuis la racine du projet :

```bat
scripts\talend-item-extract.bat --list .
```

La commande doit afficher un tableau des Jobs. Si Windows bloque le script
(stratégie d'exécution d'entreprise), voir la section Dépannage du guide
d'utilisation ; les scripts utilisent déjà `-ExecutionPolicy Bypass` pour
leur propre exécution.

## 3. Migration depuis 0.2.x ou 0.3.0

1. Conserver vos fichiers projet : `docs\ai\diagnostics\DIAG-*`,
   `docs\ai\designs\DESIGN-*`, `docs\ai\tickets\TICKET-*`, `docs\ai\adr\ADR-*`.
2. Remplacer les fichiers du kit (racine, `scripts\`, guides et templates de `docs\ai\`),
   ajouter `docs\prompts\`.
3. Supprimer les anciens scripts `scripts\talend_item_extract.py` et
   `scripts\talend_log_extract.py` s'ils existent.
4. Depuis 0.2.x : supprimer aussi `AGENTS-TALEND-DIAGNOSTIC.md`,
   `exemple-job.png` à la racine, et les dossiers `.git\` / `.agents\` s'ils ont
   été copiés **vides** depuis l'ancienne archive (ne jamais toucher au `.git\`
   réel du projet).

## 4. Périmètre d'écriture

Configurer l'outil IA pour n'autoriser l'écriture que dans `docs\ai\`. Les
dossiers Talend (`process`, `route`, `service`, `context`, `metadata`,
`code`…) restent en lecture seule. Les scripts ne font que lire.

## 5. Informations à fournir pour un bon diagnostic

Utiliser le modèle T02 de `docs\prompts\PROMPTS-TALEND.md` : Job et version,
build Studio complet, contexte lancé, mode d'exécution, Java, chemin du log,
résultat attendu. Les informations manquantes sont signalées, jamais inventées.
