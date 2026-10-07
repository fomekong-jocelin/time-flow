import type { ParticipantStatus, TrainingParticipant, TrainingSession, TrainingUser } from './training.models';

export function eligibleParticipants(users: TrainingUser[], session: TrainingSession | null): TrainingUser[] {
  if (!session) return [];
  const active = new Set(session.participants.filter(p => p.status !== 'CANCELLED').map(p => p.userId));
  return users.filter(user => user.id !== session.trainerId && !active.has(user.id));
}
export function trainerParticipation(session: TrainingSession | null, trainerId: string | null): TrainingParticipant | null {
  return session?.participants.find(p => p.userId === trainerId && p.status !== 'CANCELLED') ?? null;
}
export function selfRegistrationAllowed(session: TrainingSession, now = new Date()): boolean {
  const open = session.endsAt ? new Date(session.endsAt).getTime() > now.getTime()
    : session.endDate >= now.toISOString().slice(0, 10);
  return !session.isCurrentUserTrainer && !session.isCurrentUserRegistered && open
    && ['PLANNED', 'IN_PROGRESS'].includes(session.status) && session.registeredCount < session.maxParticipants;
}
export function validCorrectionReason(reason: string): boolean {
  return reason.trim().length >= 5 && reason.trim().length <= 500;
}
export function canReturnToRegistered(session: TrainingSession, participant: TrainingParticipant): boolean {
  return session.trainerId !== participant.userId && ['PLANNED', 'IN_PROGRESS'].includes(session.status)
    && (participant.status === 'ATTENDED' || session.registeredCount < session.maxParticipants);
}
export function attendanceStateInconsistent(session: TrainingSession, participant: TrainingParticipant): boolean {
  return participant.status !== 'CANCELLED' && participant.userId === session.trainerId
    || participant.status === 'ATTENDED' && session.status === 'PLANNED';
}
export interface ParticipantCorrection {
  userId: string;
  expectedStatus: ParticipantStatus;
  status: 'REGISTERED' | 'CANCELLED';
  reason: string;
}
