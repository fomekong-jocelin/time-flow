# TICKET-0018 : correction des constats de l'audit du ticket 0006

Status: IN_REVIEW
Date: 2026-10-02
Base inspectée: 5adeb68f103ab21c145ce5c920d885a9e45887d2
Branche: fix/ticket-0006-audit-remediation

## Objectif
Corriger TF-01 à TF-11, BF-01 à BF-03 et les preuves de validation GOV-01 de la revue. Ne pas modifier main directement. Le commit 2f9895d et la PR 13 annoncés précédemment ne constituent pas des preuves de publication de ces correctifs.

## Choix de compatibilité et règles
- Conserver les dates civiles existantes. Ajouter startsAt/endsAt/timeZone pour les vraies sessions horaires; ne pas inventer les horaires des anciennes sessions.
- Migration V10 additive, V9 inchangée. Aucun jeu de données existant supprimé.
- Seuls ADMIN/DIRECTION ou le TRAINER affecté peuvent émarger. L'API et les services appliquent cette règle.
- Les inscriptions REGISTERED et ATTENDED occupent une place. Verrouiller la session pour chaque changement de capacité/participation.
- Annuler logiquement, réactiver la même participation et conserver les événements. Ne pas effacer une présence par désinscription. Les sessions clôturées/annulées sont immuables dans cette correction; une procédure de correction après clôture constitue un futur besoin explicite.
- Préserver le catalogue existant. Une nouvelle recherche paginée est utilisée par le frontend. Les KPI sont explicitement globaux et excluent les annulations dans les volumes actifs.
- Totaux financiers par devise, sans conversion implicite. Les tarifs utilisateurs historiques sont exprimés en EUR; aucun repli sur ces tarifs pour une autre devise. Un tarif inconnu ne signifie pas gratuit: afficher les minutes restant à valoriser.
- Budget global calculé sur toutes les imputations validées/verrouillées du projet. Les vues à périmètre restreint ne reçoivent pas les consommations globales non autorisées.
- Champs textuels CSV neutralisés pour les tableurs. Les XLSX conservent leurs cellules texte et des devises explicites.

## Implémentation et tests
Les fichiers de correction préparés lors de l'intervention précédente sont récupérés dans un véritable commit et relus avant publication. Les nouveaux tests couvrent l'accès objet, les horaires/date seule, les transitions et la concurrence PostgreSQL, la multi-devise, la valorisation manquante et le budget cumulé.

## Vérification requise avant DONE
- [ ] mvn verify avec TIMEFLOW_TEST_DB=true sur PostgreSQL éphémère.
- [ ] npm ci, npm test et npm run build.
- [ ] Vérification de tous les fichiers et régression de la navigation/fonctions existantes.
- [ ] Recette navigateur: mobile, clavier, dialogue, changement de langue, saisie/relecture d'horaires et erreurs réseau.
- [ ] Test des exports avec les tableurs cibles.
- [ ] Relecture et résultats de CI attachés à la PR réelle.

Le workflow .github/workflows/verify.yml permet de reproduire les tests et builds. Tant qu'aucun résultat d'exécution n'est disponible, ne pas annoncer qu'ils passent et ne pas déclarer le ticket DONE. Aucune certification visuelle Product Design n'est revendiquée.
