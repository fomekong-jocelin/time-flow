import type { TranslationShape } from './i18n.types';

export const FIX_FR = {
  training: {
    fix: {
      ambiguousTime: "Cette heure apparaît deux fois lors du changement d’heure. Choisissez un créneau non ambigu ; un horaire existant inchangé est conservé.",
      capacityError: 'Saisissez un nombre entier de 1 à 500 participants.',
      dateOnly: 'Session au jour près : aucune heure ni aucun fuseau ne sont inventés.',
      datesError: 'Vérifiez les dates. Pour un créneau horaire, la fin doit suivre le début et les heures doivent exister dans ce fuseau.',
      descriptionError: 'La description ne doit pas dépasser 2 000 caractères.',
      durationError: 'Saisissez de 0,50 à 9 999,99 heures, avec deux décimales au maximum.',
      globalKpis: 'Catalogue global, indépendamment des filtres. Le total des sessions inclut les annulations ; les heures et inscriptions les excluent.',
      includeTimes: 'Planifier des horaires précis', kpiError: 'Les indicateurs ne sont pas disponibles.',
      locationError: 'Le lieu ou lien ne doit pas dépasser 200 caractères.',
      next: 'Suivant', occupiedSeats: 'Places occupées', openMeeting: 'Ouvrir le lien de la formation',
      pageCount: 'Page {page} sur {total} · {count} sessions', pagination: 'Pagination des formations', previous: 'Précédent',
      readOnly: 'Session clôturée ou annulée : les inscriptions et présences sont conservées en lecture seule.',
      referenceError: 'La référence est obligatoire et limitée à 50 caractères.',
      resetFilters: 'Réinitialiser les filtres', restoreRegistration: 'Réinscrire', retry: 'Réessayer',
      timeZone: 'Les champs horaires sont affichés et saisis dans le fuseau de votre navigateur : {zone}.',
      sessionZone: 'Fuseau conservé pour la session : {zone}.',
      titleError: 'Le titre est obligatoire et limité à 200 caractères.',
      usersError: 'Impossible de charger les utilisateurs. Réessayez avant de modifier une affectation.',
      viewDetails: 'Voir la formation'
    },
    errors: {
      invalid: 'Vérifiez les champs saisis.', notFound: 'La formation est introuvable.',
      full: 'La formation est complète. Actualisez la liste des participants.', closed: 'Cette formation ne permet plus cette modification.',
      historyProtected: 'Cette opération supprimerait ou modifierait un historique protégé. Les présences et sessions clôturées sont conservées.',
      duplicateReference: 'Une formation utilise déjà cette référence.',
      capacityBelowOccupancy: 'La capacité ne peut pas être inférieure au nombre de places occupées.',
      notRegistered: 'Cette inscription est introuvable.', userUnavailable: 'Cet utilisateur est introuvable ou désactivé.',
      trainerInvalid: 'Choisissez un formateur actif ayant le rôle Formateur, Administration ou Direction.',
      attendanceNotOpen: 'Une présence peut être enregistrée pour un participant inscrit lorsque la session est en cours.',
      datesInvalid: 'Les dates, horaires et le fuseau ne correspondent pas. Vérifiez le créneau.',
      conflict: 'Les données ont changé. Actualisez puis réessayez.', forbidden: 'Vous ne pouvez pas effectuer cette action sur cette session ou cet utilisateur.'
    }
  },
  billing: { fix: {
    exportError: 'Impossible de générer l’export. Réessayez.',
    globalBudget: 'Les heures et montants affichés correspondent à la période. Le reste du budget est global au projet, tous collaborateurs et toutes périodes validées confondus, valorisé aux tarifs configurés.',
    loadError: 'Impossible de charger une synthèse et un détail cohérents. Réessayez.',
    missingRate: 'Valorisation incomplète : un taux est absent ou sa devise ne correspond pas.',
    noFx: 'Montants valorisés séparés par devise. Aucune conversion ni addition entre devises. Les temps sans tarif sont signalés, jamais considérés comme gratuits.',
    optionsError: 'Impossible de charger les options de filtre.', pricedTotals: 'Montants valorisés par devise',
    remainingAmount: 'Reste du budget global', remainingDays: 'Reste global : {days} jours',
    restrictedBudget: 'Les totaux suivent votre périmètre. Le solde global du projet est réservé à la Direction et à l’Administration.',
    unpriced: '{hours} h facturables restent à valoriser.', views: 'Vues de facturation'
  } }
} as const;

export const FIX_EN: TranslationShape<typeof FIX_FR> = {
  training: {
    fix: {
      ambiguousTime: 'This clock time occurs twice during the daylight-saving transition. Choose an unambiguous time; an unchanged existing instant is preserved.',
      capacityError: 'Enter a whole number from 1 to 500 participants.',
      dateOnly: 'Date-only session: no time or time zone is invented.',
      datesError: 'Check the dates. For a timed session, the end must follow the start and the clock times must exist in this time zone.',
      descriptionError: 'The description must not exceed 2,000 characters.',
      durationError: 'Enter 0.50 to 9,999.99 hours, with no more than two decimal places.',
      globalKpis: 'Global catalogue, independent of filters. Total sessions include cancellations; hours and registrations exclude them.',
      includeTimes: 'Schedule precise times', kpiError: 'The indicators are unavailable.',
      locationError: 'The location or link must not exceed 200 characters.',
      next: 'Next', occupiedSeats: 'Occupied seats', openMeeting: 'Open the training link',
      pageCount: 'Page {page} of {total} · {count} sessions', pagination: 'Training pagination', previous: 'Previous',
      readOnly: 'Completed or cancelled session: registrations and attendance are retained as read-only records.',
      referenceError: 'A reference is required, with no more than 50 characters.',
      resetFilters: 'Reset filters', restoreRegistration: 'Register again', retry: 'Try again',
      timeZone: 'Time fields are displayed and entered in your browser time zone: {zone}.',
      sessionZone: 'The session retains this time zone: {zone}.',
      titleError: 'A title is required, with no more than 200 characters.',
      usersError: 'Unable to load users. Try again before changing an assignment.', viewDetails: 'View training'
    },
    errors: {
      invalid: 'Check the submitted fields.', notFound: 'The training session was not found.',
      full: 'The session is full. Refresh the participant list.', closed: 'This session no longer permits this change.',
      historyProtected: 'This operation would delete or modify protected history. Attendance and completed sessions are retained.',
      duplicateReference: 'Another session already uses this reference.', capacityBelowOccupancy: 'Capacity cannot be lower than the number of occupied seats.',
      notRegistered: 'This registration was not found.', userUnavailable: 'This user was not found or is inactive.',
      trainerInvalid: 'Choose an active Trainer, Administrator or Direction user.',
      attendanceNotOpen: 'Attendance can be recorded for a registered participant while the session is in progress.',
      datesInvalid: 'The dates, times and time zone do not match. Check the schedule.',
      conflict: 'The data changed. Refresh and try again.', forbidden: 'You cannot perform this action on this session or user.'
    }
  },
  billing: { fix: {
    exportError: 'Unable to generate the export. Try again.',
    globalBudget: 'Hours and amounts cover the selected period. Remaining budgets cover the entire project across all users and approved periods, valued at configured rates.',
    loadError: 'Unable to load a consistent overview and detail. Try again.',
    missingRate: 'Valuation is incomplete: a rate is missing or its currency does not match.',
    noFx: 'Priced amounts are separated by currency. No conversion or cross-currency addition. Time without a rate is flagged, never treated as free.',
    optionsError: 'Unable to load filter options.', pricedTotals: 'Priced amounts by currency', remainingAmount: 'Remaining global budget',
    remainingDays: 'Global balance: {days} days', restrictedBudget: 'Totals follow your access scope. Global project balances are available only to Direction and Administration.',
    unpriced: '{hours} billable hours still need a rate.', views: 'Billing views'
  } }
};
