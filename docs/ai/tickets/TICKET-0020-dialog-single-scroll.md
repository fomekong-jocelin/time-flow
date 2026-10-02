# TICKET-0020 : une seule zone de défilement dans les modales

Status: IN_REVIEW
Date: 2026-10-02
Base: 9313b21 (fix/ticket-0006-audit-remediation)
Branche: fix/ticket-0020-dialog-single-scroll

## Constat
Retour utilisateur sur la modale « Voir la formation » : deux barres de défilement imbriquées (celle du `<dialog>` et celle du corps), plus le défilement de la page derrière.

## Cause
`tf-dialog` limitait le `<dialog>` à `max-h-[90dvh]` avec une bordure, et son conteneur interne aussi à `90dvh`. Avec `box-sizing: border-box`, le contenu dépassait de 2px, donc le `<dialog>` (overflow `auto` par défaut du navigateur) affichait sa propre barre en plus de celle du corps.

## Correction
- Le `<dialog>` devient la colonne flex (`open:flex`, pour conserver le `display:none` natif d'une modale fermée) et passe en `overflow-hidden`. Le conteneur intermédiaire est supprimé.
- Seul le corps (`section`) défile : `flex-1 min-h-0 overflow-y-auto overscroll-contain`. L'en-tête avec « Fermer » reste fixe.
- `html:has(dialog[open]) { overflow: hidden; }` bloque le défilement de la page tant qu'une modale est ouverte.
- Aucun changement de contrat, de logique métier ni d'accessibilité : focus, Échap et aria restent inchangés. Le correctif s'applique à toutes les modales `tf-dialog`.

## Vérifications
- `ng build` réussi (Node 22.22.3). CSS générée contrôlée : `open\:flex`, `overscroll-contain`, `html:has(dialog[open])`.
- `npm test` : 53 tests, 53 réussites.
- [ ] Recette visuelle navigateur non faite dans ce conteneur : modale formation longue (desktop + mobile), formulaire de session, thèmes clair/sombre.
