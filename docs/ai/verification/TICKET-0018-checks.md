# TICKET-0018 : preuves de vérification et limites

Date: 2026-10-02
PR réelle: https://github.com/fomekong-jocelin/time-flow/pull/19
Base des corrections: 5adeb68f103ab21c145ce5c920d885a9e45887d2
Code publié et examiné: 2869214dfdc17e8eaf459fd0b9305cef5da4e0ca

## Exécutions réalisées

Commande reproductible depuis la racine du dépôt:

```bash
bash scripts/verify-audit-helpers.sh
```

Environnement local de vérification: Node 22.16.0 avec --experimental-strip-types; OpenJDK 21.0.11. Les fichiers ci-dessous ont été copiés depuis les réponses du connecteur GitHub et leur empreinte Git a été comparée à celle du dépôt avant exécution.

Résultats:
- tests/training-time.test.mjs et tests/money-format.test.mjs: **21 tests, 21 réussites, 0 échec, 0 ignoré**.
- AuditHelperCheck.java compilé avec les vraies classes de production CsvCell, MoneyTotal et MoneyTotals: **29 assertions réussies**.
- Les tests de dates couvrent UTC, Africa/Douala, Europe/Paris, America/Edmonton, les sessions d'un jour, les décalages saisonniers, l'édition entre fuseaux, les contraintes numériques et les URL de réunion.
- Les assertions Java couvrent le regroupement par devise, l'absence de total inter-devises, la valorisation manquante, les séparateurs CSV, les guillemets et les préfixes de formules, y compris caractères de contrôle/Unicode.

## Empreintes vérifiées

| Fichier (frontend sauf indication) | Blob Git |
|---|---|
| src/app/features/training/training-time.ts | 791b1110be7736d615fc62bbbde0b8dfec0e320d |
| src/app/features/billing/money-format.ts | 13b9476767849a20a58d4285b0349248e4ccbe34 |
| tests/training-time.test.mjs | 46f30efbf71930e3f0e73c950e078b44277cbaee |
| tests/money-format.test.mjs | c319b2800ea9947694b6ad51180889e6b4159152 |
| backend/.../billing/application/CsvCell.java | d6ab0c475976f6d0dae881ea999aebd975d9391c |
| backend/.../billing/application/MoneyTotal.java | a2156bdf0597f0059b2a121dcf283b698c4bfae2 |
| backend/.../billing/application/MoneyTotals.java | b3ad6e078ffb785b4dc6ce78c754343aa9f6218c |

## CI complète : non validée

Les runs GitHub Actions 37033960301 (push) et 37033992917 (pull_request) ont été déclenchés. Les checks sont marqués failure; le job backend consulté n'a renvoyé aucune étape exécutée. Les annotations détaillant la cause n'étaient pas accessibles via le connecteur disponible. Aucune cause de facturation, de permission ou de code n'est supposée.

Le clonage depuis le conteneur de travail a échoué sur la résolution DNS de github.com et Maven n'y est pas installé. Les 21 tests ciblés et 29 assertions ne remplacent donc **ni mvn verify, ni npm test complet, ni npm run build**.

## Restant avant fusion

Relancer et réussir les suites Maven avec PostgreSQL éphémère (TIMEFLOW_TEST_DB=true), les tests Angular et la compilation AOT. Effectuer la recette navigateur/mobile/clavier et l'ouverture des exports dans les tableurs cibles. Les tests PostgreSQL et les tests de sécurité objet sont présents, mais leur exécution n'est pas revendiquée ici. Aucun audit visuel Product Design complet, déploiement ou fusion n'est revendiqué.

Status: IN_REVIEW
