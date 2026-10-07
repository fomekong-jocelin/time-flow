# TICKET-0015 — Refonte du rendu Analytics (Donut, Tendance des heures, KPI visuels, mise en page épurée)

## Contexte & Objectifs

L'interface actuelle d'Analyses & Reporting (`/analyses`) fournit des métriques fiables (TACE, heures facturables, répartition activités/projets/équipe).
Cependant, le rendu visuel manquait de fidélité par rapport à la maquette cible souhaitée, tout en évitant les surcharges de visualisations redondantes observées sur la capture initiale (notamment la multiplication de donuts identiques et la répétition de graphes projet superflus).

Le besoin utilisateur exprimé :
> « pour la partie analytic il faut faire un rendu ainsi mais moin chargé » (en référence à la capture du dashboard dark-mode avec cartes KPI iconées, Donut central de distribution globale et histogramme d'évolution quotidienne des heures).

## Critères d'acceptation

1. **Cartes KPI enrichies avec icônes de catégorie** :
   - Badge d'icône distinctif (en conteneur arrondi translucent) : `%` (Taux de facturabilité / TACE), Document/Fichier (Heures facturables client), Chapeau universitaire/Graduation (Interne & formation), Horloge (Heures supplémentaires OT).
   - Affichage grand format des métriques clés (100%, 20 h 00, etc.) avec colorisation sémantique (vert/émeraude pour bon TACE, indigo pour facturable, ambre pour OT).
   - Sous-titres contextuels explicites (« 20 h 00 facturables sur 20 h 00 », « 1 projet(s) actif(s) sur la période », etc.).

2. **Graphique Donut SVG — Répartition globale du temps travaillé (Overall Work Time Distribution)** :
   - Graphique circulaire Donut en SVG natif réactif, avec texte central synthétique : Total des heures (ex. « 20 h 00 ») et mention « Total » / pourcentage.
   - Segments colorés selon le type d'activité (Mission client / Indigo, Interne & formation / Violet clair, Heures sup / Ambre).
   - Légende épurée avec puces de couleur, libellés clairs, volume d'heures et pourcentages.
   - Synthèse facturable vs non facturable intégrée sans nécessiter un second donut redondant.

3. **Graphique Histogramme SVG — Tendance des heures (Hours Trend)** :
   - Histogramme réactif affichant les heures déclarées sur la période (vue journalière pour les mois, vue mensuelle pour trimestre/année).
   - Axe vertical Y gradué (0h, 2h, 4h, 6h, 8h...) avec lignes directrices horizontales en tirets.
   - Barres stylisées avec angles arrondis sur le dessus, état actif sur les jours déclarés.
   - Tooltip d'information au survol avec la date et le volume précis d'heures.
   - Axe horizontal X lisible avec repères de dates (ex. 1 oct., 5 oct., 10 oct., 15 oct., 20 oct., 25 oct., 31 oct.).

4. **Ventilation des Projets & Équipe unifiée et « Moins chargée »** :
   - Unification de la consommation projet en une section moderne et lisible (nom, référence, barres de progression proportionnelles, heures totales et facturables, part en %).
   - Élimination de la redondance entre graphiques barre et liste de progression.
   - Préservation des onglets d'équipe pour les profils Manager, Direction et Admin.

5. **Architecture, Sécurité & i18n** :
   - Backend maître des calculs métier (`DailyTrendItem` calculé par `AnalyticsService`).
   - Support bilingue FR/EN et mode sombre/clair fluide.
   - Tests backend et frontend 100% au vert.
