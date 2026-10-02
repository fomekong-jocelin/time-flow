export const PARTICIPATION_FR = {
  training: {
    participation: {
      dates: 'Dates de la formation', startDate: 'Date de début', endDate: 'Date de fin',
      youTrain: 'Vous animez cette formation', trainerExcluded: 'Le formateur de cette session ne peut pas être inscrit comme participant.',
      remove: 'Retirer de la formation', confirmRemove: 'Confirmer le retrait',
      removeConfirm: 'Retirer {name} de la formation ?', keepHistory: 'La place sera libérée. L’inscription et son historique seront conservés.',
      correctAttendance: 'Corriger la présence', adminCorrection: 'Correction administrative',
      correctionFor: 'Correction pour {name}', correctionNotice: 'Le motif, l’auteur et la date de cette correction seront conservés. Aucune présence passée ne sera effacée de l’historique.',
      targetStatus: 'Action de correction', returnRegistered: 'Corriger en « Inscrit »', reason: 'Motif obligatoire (5 à 500 caractères)',
      confirmCorrection: 'Confirmer la correction', cancelledList: 'Inscriptions annulées ({count})', noActiveParticipants: 'Aucun participant actif.',
      status: 'Statut', registeredOn: 'Inscrit le', attendanceRecordedOn: 'Présence enregistrée le', unknownAttendanceDate: 'Date non disponible',
      inconsistent: 'Données à corriger : présence sur une session planifiée ou cumul formateur/participant.',
      closedNotice: 'Session clôturée : seule une correction administrative motivée peut retirer une participation. Les inscriptions ne sont pas rouvertes.',
      transferNotice: 'Cette personne est déjà inscrite. Confirmez son retrait des participants pour l’affecter comme formateur, en conservant son historique.',
      transferConsent: 'Je confirme le retrait de cette inscription et l’affectation comme formateur.',
      transferAndSave: 'Retirer des participants et affecter comme formateur'
    },
    errors: {
      trainerParticipantConflict: 'Le formateur ne peut pas être participant actif de cette même session.',
      trainerAttendanceConflict: 'Cette personne est marquée présente. Corrigez sa présence avec un motif avant de l’affecter comme formateur.',
      trainerWithdrawalRequired: 'Confirmez le retrait de l’inscription avant l’affectation comme formateur.',
      correctionReasonRequired: 'Saisissez un motif de 5 à 500 caractères, hors espaces en début et fin.',
      closedReactivation: 'Une session clôturée ne peut pas recevoir d’inscription active. Seul le retrait est disponible.',
      noStatusChange: 'Choisissez un statut différent du statut actuel.'
    }
  }
};
export const PARTICIPATION_EN = {
  training: {
    participation: {
      dates: 'Training dates', startDate: 'Start date', endDate: 'End date',
      youTrain: 'You teach this session', trainerExcluded: 'The assigned trainer cannot enroll as a participant in this session.',
      remove: 'Remove from training', confirmRemove: 'Confirm withdrawal',
      removeConfirm: 'Remove {name} from this training?', keepHistory: 'The seat will be released. The registration and its history will be retained.',
      correctAttendance: 'Correct attendance', adminCorrection: 'Administrative correction',
      correctionFor: 'Correction for {name}', correctionNotice: 'The reason, author and date will be recorded. Previous attendance will remain in the audit history.',
      targetStatus: 'Correction action', returnRegistered: 'Change to Registered', reason: 'Required reason (5 to 500 characters)',
      confirmCorrection: 'Confirm correction', cancelledList: 'Cancelled registrations ({count})', noActiveParticipants: 'No active participants.',
      status: 'Status', registeredOn: 'Registered on', attendanceRecordedOn: 'Attendance recorded on', unknownAttendanceDate: 'Date unavailable',
      inconsistent: 'Correction needed: attendance on a planned session or a trainer also registered as a participant.',
      closedNotice: 'Closed session: only a reasoned administrative correction may withdraw a participation. Enrollment is not reopened.',
      transferNotice: 'This person is already registered. Confirm withdrawal from participants before assigning them as trainer. Their history will be retained.',
      transferConsent: 'I confirm withdrawal of this registration and assignment as trainer.',
      transferAndSave: 'Withdraw registration and assign as trainer'
    },
    errors: {
      trainerParticipantConflict: 'The trainer cannot be an active participant in the same session.',
      trainerAttendanceConflict: 'This person is marked as attended. Correct attendance with a reason before assigning them as trainer.',
      trainerWithdrawalRequired: 'Confirm withdrawal of the registration before assigning the trainer.',
      correctionReasonRequired: 'Enter a reason of 5 to 500 characters, excluding leading and trailing spaces.',
      closedReactivation: 'A closed session cannot receive an active registration. Only withdrawal is available.',
      noStatusChange: 'Choose a status different from the current status.'
    }
  }
};
