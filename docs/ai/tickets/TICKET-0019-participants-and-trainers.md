# TICKET-0019 : retrait, correction des présences et séparation formateur/participant

Status: IN_REVIEW
Date: 2026-10-02
Base: 4aae928c3df3b34699732099f811c7878dab0ffd
Branche: fix/ticket-0006-audit-remediation
PR: #19, vers main, sans fusion ni déploiement dans cette intervention.

## Besoin validé
À partir des captures utilisateur : retirer un participant, corriger une présence erronée sans effacer son historique, empêcher une personne d'être formateur et participant actif de la même session. Le rôle TRAINER reste compatible avec une inscription à une autre session.

## Règles et parcours
- Inscrit, session planifiée/en cours : bouton « Retirer de la formation » avec confirmation nommée, annulation logique et restitution de la place. Les annulations sont regroupées dans une section repliable.
- Présent, ou inscrit dans une session clôturée : ADMIN/DIRECTION disposent d'une correction dédiée avec motif de 5 à 500 caractères. Le serveur contrôle le rôle, le statut attendu et la cible. Un retrait est possible après clôture sans rouvrir la session. Le retour à Inscrit reste réservé aux sessions planifiées/en cours. La correction ne permet pas d'inventer une présence.
- L'événement conserve l'auteur, l'horodatage, le motif et les statuts avant/après. Les motifs ne sont pas exposés par le DTO de consultation générale. Les anciennes présences et leurs événements ne sont pas supprimés.
- Les inscriptions/réactivations et l'émargement refusent le formateur affecté, même via une requête directe faite par un administrateur.
- Une affectation de formateur vérifie sa participation sous le même verrou de session que les inscriptions. Une inscription REGISTERED peut être annulée dans la même transaction uniquement avec le consentement explicite withdrawTrainerRegistration. Une présence ATTENDED doit être corrigée au préalable. Aucun transfert silencieux.
- Le formulaire charge le détail complet avant l'édition, pour détecter les participants. Le formateur est exclu du sélecteur d'inscription et le bouton d'auto-inscription devient « Vous animez cette formation ».
- La date d'inscription n'est plus présentée comme date de présence. attendedAt est extrait d'une transition réelle vers ATTENDED. Les snapshots de migration sans ancien statut ne permettent pas d'inventer un horaire; l'interface indique alors que la date est indisponible.
- Les contradictions déjà présentes (formateur aussi participant, présents dans une session planifiée) sont signalées, pas automatiquement modifiées en base.

## Contrats
POST /api/v1/trainings/{id}/participants/{userId}/corrections
Body : { expectedStatus, status: REGISTERED|CANCELLED, reason }
ADMIN/DIRECTION et CSRF obligatoires. 204 au succès; 403 sans droits; 400 pour saisie invalide; 409 sur conflit de statut, capacité, affectation ou clôture.
PUT session : champ optionnel withdrawTrainerRegistration (false par défaut). Les anciens constructeurs Java et appels API restent compatibles.
DTO participant : attendedAt optionnel, sans modification de registeredAt.

## Données et concurrence
V11 ajoute reason et event_kind à training_participant_event, avec une contrainte sur les corrections administratives. V9 et V10 restent inchangées. Aucun nettoyage automatique des données historiques. Les anciennes participations restent corrigeables explicitement dans l'interface.
Toutes les opérations de modification de participation/affectation utilisent le verrou pessimiste de la même session. Le contrôle et le transfert ont lieu dans la même transaction. Le détail charge les événements en groupe via EntityGraph.

## Tests et preuves
Exécuté dans cette intervention :
- 16 tests Node ciblés, 16 réussites, zéro échec : sélection, auto-inscription, réactivation, motif, détection de conflits, FR/EN et libellés des dates.
- 29 assertions Java sur la vraie politique de production TrainingParticipantPolicy, toutes réussies.
- 8 fichiers TypeScript transpilés sans diagnostic syntaxique. Ce contrôle n'est pas un build Angular AOT.

Commandes reproductibles :
```bash
bash scripts/verify-training-participant-policy.sh
cd frontend
node --experimental-strip-types --test tests/training-participation.test.mjs
```
Les dépendances Spring/Angular complètes ne sont pas disponibles dans le conteneur, et github.com n'y est pas résolu. Les nouveaux tests JUnit/service, HTTP/CSRF et PostgreSQL sont écrits, mais leur exécution complète n'est pas revendiquée.

## Validation restante avant DONE
- [ ] Maven verify avec les tests de correction, de rôle et de concurrence PostgreSQL (base éphémère, TIMEFLOW_TEST_DB=true).
- [ ] npm test complet et npm run build.
- [ ] Navigateur : retrait et compteur, raison invalide/valide, erreur réseau avec saisie conservée, transfert formateur, historique annulé, clavier/mobile, langues FR/EN.
- [ ] Migration V11 sur copie de données comprenant des événements V10 et des conflits hérités.
- [ ] Vérifier le SHA réellement publié et les checks de PR. Ne pas déclarer la CI complète réussie à partir des tests ciblés.
