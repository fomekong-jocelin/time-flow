# TICKET-0014 — Thème Clair / Sombre & Internationalisation (i18n FR/EN)

## 1. Objectifs & Contexte

Conformément à la gouvernance `SKILL.md` (« Mobile-first, thèmes clair/sombre, i18n FR/EN préparée ») et à la charte d'identité visuelle v0.1 (`Charte_Identite_Visuelle_Gestion_Temps_INDYLI_v0.1.pdf` §10/§12), l'application TimeFlow doit offrir une expérience personnalisée et internationale :

1. **Thème d'affichage (Light / Dark / System)** :
   - Un sélecteur ergonomique permettant de choisir entre :
     - **Clair (Light)** : fond `#F8FAFC`, surfaces blanches `#FFFFFF`, texte `#101828`.
     - **Sombre (Dark)** : fond `#0B1220`, surfaces `#111827`, bordures `#253046`, texte `#F2F4F7`.
     - **Système (System)** : synchronisé automatiquement avec les préférences du système d'exploitation (`prefers-color-scheme`).
   - Persistance du choix dans `localStorage` (`timeflow-theme`).
   - Script d'amorçage dans `index.html` pour éliminer tout flash de contenu (FOUC).
   - Prise en charge complète sous Tailwind CSS v4 via `@custom-variant dark (&:where(.dark, .dark *));`.
   - Adaptation des composants partagés (`tf-status-badge`, `tf-avatar`, `tf-kpi-card`, inputs, modals, tableaux) pour garantir des contrastes WCAG AA.

2. **Internationalisation (i18n FR / EN)** :
   - Architecture Angular 22 zoneless réactive avec Signals (`currentLang`, `setLang`, `t()`).
   - Pipe de template `translate` (`tfTranslate`) pour les composants Angular standalone.
   - Dictionnaire exhaustif bilingue (Français / Anglais) :
     - Navigation & Shell applicatif.
     - Rôles et types de comptes (Collaborateur, Formateur, Manager, Direction, Administrateur).
     - Terminologie métier (CRA / Timesheet, TACE / Billability, Heures supplémentaires OT / Extra Time ET, Jours fériés, Validation, Projets, Utilisateurs).
     - Actions communes (Sauvegarder, Annuler, Modifier, Supprimer, Valider, Rejeter, Fermer, Connexion, Déconnexion, etc.).
   - Persistance dans `localStorage` (`timeflow-lang`) et détection automatique par le navigateur.
   - Sélecteurs interactifs accessibles depuis la navigation principale (desktop & mobile) ainsi que l'écran de connexion (`LoginPageComponent`).

---

## 2. Spécification Technique Frontend

### 2.1 Thème (`src/app/core/theme`)
- **`theme.service.ts`** :
  - Type `ThemeMode = 'light' | 'dark' | 'system'`.
  - Signal `theme = signal<ThemeMode>(...)`.
  - Signal calculé `resolvedTheme = computed<'light' | 'dark'>(...)`.
  - Synchronisation avec `document.documentElement.classList` (`dark`) et attribut `data-theme`.
  - Écoute dynamique via `window.matchMedia('(prefers-color-scheme: dark)')`.
- **`styles.css`** :
  - Directive `@custom-variant dark (&:where(.dark, .dark *));`.
  - Variables CSS `:root.dark, :root[data-theme="dark"]` conformes à la charte v0.1.
- **`index.html`** :
  - Script inline prévenant le FOUC.

### 2.2 Internationalisation (`src/app/core/i18n`)
- **`i18n.types.ts` & `translations.ts`** :
  - Type `SupportedLang = 'fr' | 'en'`.
  - Dictionnaires structurés pour `nav`, `common`, `auth`, `timesheets`, `validation`, `analytics`, `users`, `workSchedules`, `projects`.
- **`i18n.service.ts`** :
  - Signal `currentLang = signal<SupportedLang>(...)`.
  - Méthode `setLang(lang: SupportedLang)`.
  - Méthode `t(key: string, params?: Record<string, string | number>): string`.
- **`src/app/shared/pipes/translate.pipe.ts`** :
  - Pipe standalone `tfTranslate` (ou `translate`).

### 2.3 Composants de bascule UI (`src/app/shared/ui`)
- **`theme-toggle.component.ts`** :
  - Bouton / menu compact avec icônes `sun`, `moon`, `monitor`.
- **`lang-toggle.component.ts`** :
  - Bouton / sélecteur compact FR / EN avec indicateur actif.
- Intégration dans `AppShellComponent` (sidebar desktop et header mobile) et `LoginPageComponent`.

---

## 3. Critères d'acceptation & Definition of Done

- [x] `theme.service.ts` gère `light`, `dark`, `system` avec persistance `localStorage` et écoute système réactive.
- [x] Tailwind CSS v4 supporte `.dark` avec styles contrastés sur l'ensemble de l'application.
- [x] Aucun flash de style au rechargement de page.
- [x] `i18n.service.ts` fournit des traductions instantanées FR/EN réactives avec Signals.
- [x] `translate.pipe.ts` utilisable dans les templates Angular.
- [x] La navigation, le header, le profil et l'authentification s'adaptent instantanément à la langue sélectionnée.
- [x] `LoginPageComponent` dispose du sélecteur de thème et de langue.
- [x] `npm run build` et `mvn test` s'exécutent avec 100% de réussite.
- [x] `PROJECT-TRACKING.md` et `CHANGELOG.md` mis à jour.
