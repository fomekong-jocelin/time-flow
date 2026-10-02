export type DeliveryMode = 'REMOTE' | 'ON_SITE' | 'HYBRID';
export type TrainingCategory = 'INTERNAL' | 'CLIENT';
export type TrainingStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type ParticipantStatus = 'REGISTERED' | 'ATTENDED' | 'CANCELLED';
export interface TrainingParticipant {
  id: string; userId: string; userDisplayName: string; userEmail: string;
  status: ParticipantStatus; registeredAt: string;
}
export interface TrainingSession {
  id: string; reference: string; title: string; description: string | null;
  trainerId: string | null; trainerDisplayName: string | null; trainerEmail: string | null;
  location: string | null; deliveryMode: DeliveryMode; category: TrainingCategory; status: TrainingStatus;
  startDate: string; endDate: string; durationHours: number; maxParticipants: number;
  registeredCount: number; isCurrentUserRegistered: boolean; isCurrentUserTrainer: boolean;
  participants: TrainingParticipant[]; createdAt: string; updatedAt: string;
  startsAt?: string | null; endsAt?: string | null; timeZone?: string | null;
  currentUserParticipantStatus?: ParticipantStatus | null;
}
export interface TrainingPage {
  items: TrainingSession[]; page: number; size: number; totalItems: number; totalPages: number;
}
export interface TrainingKpi {
  totalSessions: number; plannedSessions: number; inProgressSessions: number;
  completedSessions: number; totalPlannedHours: number; totalRegistrations: number;
}
export interface TrainingFormData {
  reference: string; title: string; description: string | null; trainerId: string | null;
  location: string | null; deliveryMode: DeliveryMode; category: TrainingCategory; status: TrainingStatus;
  startDate: string; endDate: string; durationHours: number; maxParticipants: number;
  startsAt?: string | null; endsAt?: string | null; timeZone?: string | null;
}
export interface TrainingUser { id: string; displayName: string; email: string; role: string; }
export interface TrainingFilters {
  query?: string; status?: string; category?: string; deliveryMode?: string;
  trainerId?: string; onlyMine?: boolean; page?: number; size?: number;
}
