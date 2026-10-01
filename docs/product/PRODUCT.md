# Produit — TimeFlow

## Chaîne métier cible

Client → Mission/Projet/Formation → Activité → Temps saisi → Soumission → Validation → Verrouillage → Reporting / préparation facturation.

## Rôles

- Collaborateur / développeur : saisie, correction, soumission.
- Formateur / consultant : animation, préparation, accompagnement, déplacement.
- Chef de projet / manager : suivi, validation, rejet.
- Direction : charge, occupation, consommé, rentabilité.
- Administrateur : règles, catégories, utilisateurs, intégrations.

## V1

1. Authentification et rôles.
2. Synchronisation des projets Azure DevOps.
3. Saisie hebdomadaire des temps.
4. Brouillon → soumis → rejeté/validé → verrouillé.
5. Activités de formation.
6. Dashboards de base.
7. Exports de contrôle.

## Design

Palette : Indigo `#4F46E5`, Violet `#8B5CF6`, Teal `#14B8A6`, Midnight `#101828`, fond `#F8FAFC`.

Azure DevOps reste une source discrète : badge `ADO` dans les données, configuration dans Paramètres > Intégrations.
