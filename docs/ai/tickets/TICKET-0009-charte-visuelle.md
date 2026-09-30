# TICKET-0009 — Application de la charte visuelle v0.1

## 1. Objectif

Aligner le frontend sur `Charte_Identite_Visuelle_Gestion_Temps_INDYLI_v0.1.pdf` (30/09/2026) : logo, palette, typographie, composants, Dark Mode et écrans de référence Connexion / Mes temps.

## 2. Critères d'acceptation

- [x] Logo TimeFlow by INDYLI (symbole « temps + mouvement », dégradé bleu clair → indigo → violet) livré en SVG : symbole, icône app, favicon.
- [x] Composant `tf-logo` avec variantes `horizontal`, `stacked`, `symbol`, `app-icon` ; tailles minimales de la charte respectées.
- [x] Design tokens Tailwind v4 conformes à la charte §5/§12 (+ `surface`, `slate`, nuances d'état lisibles AA).
- [x] Dark Mode suivant `prefers-color-scheme` : fond `#0B1220`, surface `#111827`, bordure `#253046`.
- [x] Police Inter auto-hébergée (`@fontsource-variable/inter`), aucune requête vers un CDN tiers.
- [x] Icônes outline à trait uniforme (`tf-icon`).
- [x] Connexion : logo centré, fond très clair, formulaire court, SSO visible, erreurs de validation par champ.
- [x] Shell applicatif : navigation latérale (Desktop), barre haute (mobile), utilisateur + rôle + déconnexion.
- [x] Mes temps : KPI avec code couleur métier (saisi = indigo, facturable = vert, interne = slate), tableau hebdomadaire et état vide.
- [x] Inputs et boutons de 44 px, radius 12 px, ombres très légères.
- [x] Mes temps : contenu pleine largeur, numéro et dates de semaine, jour courant surligné, ligne « Total jour », panneau latéral « Pour démarrer » + code couleur.

## 3. Contexte analysé

- [x] Fichiers et comportement existants inspectés (`app.component`, routes, guard, pages login et timesheet).
- [x] Impacts API/data/UI identifiés : aucun contrat API modifié ; routes `/connexion` et `/mes-temps` inchangées (le shell devient une route parente protégée par `authGuard`).
- [x] Sécurité analysée : aucune ressource externe chargée, aucun secret, pas de règle métier côté UI.
- [x] Tests existants vérifiés : aucun test frontend à ce jour.

## 4. Hypothèses

- La charte est exploratoire (V0.1) : le nom « TimeFlow » et le symbole restent à valider juridiquement. Le logo est redessiné en SVG d'après la planche, pas extrait du PDF (JPEG basse résolution).
- Les entrées de navigation non livrées (Projets, Formations, Analyses) sont affichées désactivées avec la mention « Bientôt ».
- Le Dark Mode suit le réglage système ; pas encore de sélecteur manuel.
- Semaine affichée = semaine ISO (lundi → dimanche) calculée côté navigateur, saisie du lundi au vendredi ; présentation uniquement, l'API feuille de temps (TICKET-0004) deviendra la source de vérité de la période.

## 5. Tests et vérifications

- [x] `npm run build` OK.
- [x] Calcul de semaine ISO vérifié : 01/10/2026 → S40, 31/12/2026 → S53, 01/01/2026 → S1.
- [x] Rendu Connexion vérifié en clair et sombre (Chrome headless).
- [ ] Rendu Mes temps connecté vérifié manuellement.
- [ ] Tests de composants Angular (logo, shell, formulaire de connexion).

## 6. Documentation

- [x] PROJECT-TRACKING mis à jour
- [x] CHANGELOG mis à jour

## 7. Reste à faire / risques

- Navigation basse mobile (charte §10) à ajouter lorsque plusieurs écrans existeront.
- Navigation entre semaines et étapes « Pour démarrer » pilotées par l'API (TICKET-0003/0004) ; aujourd'hui seule l'étape « Compte connecté » est cochée.
- Sélecteur de thème manuel et i18n EN.
- Déplacer la charte PDF dans `docs/design/` si elle doit être versionnée.

## 8. Statut

Status: REVIEW
