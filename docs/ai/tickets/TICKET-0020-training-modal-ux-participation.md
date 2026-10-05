# TICKET-0020 : Résolution du double scrollbar et refonte UI/UX de la participation aux formations

Status: IN_REVIEW
Date: 2026-10-02
Base: fix/ticket-0006-audit-remediation
Branche: fix/ticket-0006-audit-remediation
PR: #19 vers main

## 1. Contexte & Problème constaté

Sur la capture utilisateur fournie (`pasted-image-11.png`) :
1. **Double ascenseur (« scroll dans un scroll »)** : L'élément natif `<dialog>` générait une barre de défilement externe car sa boîte débordait en hauteur (90dvh + bordures sans `overflow-hidden`), tandis que la `<section>` interne disposait de son propre `overflow-y-auto`. Deux ascenseurs verticaux s'affichaient côte à côte.
2. **UI/UX confuse pour gérer la participation** :
   - Les métadonnées de session occupaient la moitié de la fenêtre avant même d'atteindre la liste des participants.
   - L'utilisateur connecté ouvrant la modal ne disposait d'aucun bandeau ni bouton direct pour s'inscrire ou se désinscrire lui-même depuis les détails.
   - Les participants annulés étaient relégués dans un `<details>` accordéon volumineux ; pour un formateur précédemment inscrit puis affecté formateur (ex: Jocelin FOMEKONG), sa ligne apparaissait sans bouton ni explication de son statut de formateur non-réinscriptible.
   - La liste manquait de hiérarchie visuelle (pas d'avatars, libellés bruts sans badges colorés, absence de jauge de capacité).

## 2. Critères d'acceptation

- [x] **CA-01 (Single scrollbar)** : Le composant `tf-dialog` n'affiche qu'un seul ascenseur vertical interne (`section flex-1 min-h-0 overflow-y-auto`) ; l'élément `<dialog>` est contraint en `flex flex-col max-h-[90dvh] overflow-hidden`.
- [x] **CA-02 (Participation utilisateur)** : La modal affiche clairement l'état de participation de l'utilisateur connecté (Inscrit, Présent, Non-inscrit, Formateur) et permet de s'inscrire ou de se désinscrire directement depuis la vue détaillée.
- [x] **CA-03 (Navigation Active / Annulée)** : La modal organise les participants actifs et les inscriptions annulées via des onglets segmentés élégants évitant l'accumulation verticale.
- [x] **CA-04 (Explication Formateur)** : Un participant annulé qui est le formateur actuel de la session est explicitement badgé et documenté comme formateur référent non réinscriptible.
- [x] **CA-05 (Ergonomie & Badges)** : Statuts avec badges visuels (Inscrit, Présent, Annulé), initiales utilisateur, jauge d'occupation claire, formulaire d'ajout de collaborateur compact.
- [x] **CA-06 (Conformité & Tests)** : Non-régression sur les flux existants (retrait, réinscription, correction administrative, émargement), compatibilité i18n FR/EN, tests unitaires passants.

## 3. Impacts

- **Frontend UI** :
  - `frontend/src/app/shared/ui/dialog.component.ts` : conteneur flex sans double scroll, `overflow-hidden` sur `<dialog>`.
  - `frontend/src/app/features/training/training-participants-modal.component.html` : refonte template avec bandeau de participation de l'utilisateur, onglets actifs/annulés, avatars initials, badges d'état et jauge de capacité.
  - `frontend/src/app/features/training/training-participants-modal.component.ts` : gestion des onglets, auto-inscription/désinscription, détection utilisateur courant et formateur, calcul de places restantes et jauge.
  - `frontend/src/app/features/training/training-page.component.html` / `.ts` : transmission des signaux d'auto-inscription vers la modal, rafraîchissement en place sans fermeture.
  - `frontend/src/app/core/i18n/participation.translations.ts` : nouvelles clés bilingues FR/EN synchronisées.
- **Backend / API / BD** : Aucun changement de schéma ni d'API requis (les endpoints `/register`, `/unregister` et `/corrections` existants sont réutilisés).

## 4. Tests et preuves

- 55 tests Node frontend exécutés avec succès (`npm test`), zéro échec.
- `ng build` exécuté avec succès (bundle production Angular standalone AOT généré sans erreur).
- 29 assertions Java de politique exécutées avec succès (`TrainingParticipantPolicyCheck.java`).
