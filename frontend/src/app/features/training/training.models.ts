export type DeliveryMode = 'REMOTE' | 'ON_SITE' | 'HYBRID';
export type TrainingCategory = 'INTERNAL' | 'CLIENT';
export type TrainingStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type ParticipantStatus = 'REGISTERED' | 'ATTENDED' | 'CANCELLED';

export interface TrainingParticipant {
  id: string;
  userId: string;
  userDisplayName: string;
  userEmail: string;
  status: ParticipantStatus;
  registeredAt: string;
}

export interface TrainingSession {
  id: string;
  reference: string;
  title: string;
  description: string | null;
  trainerId: string | null;
  trainerDisplayName: string | null;
  trainerEmail: string | null;
  location: string | null;
  deliveryMode: DeliveryMode;
  category: TrainingCategory;
  status: TrainingStatus;
  startDate: string;
  endDate: string;
  durationHours: number;
  maxParticipants: number;
  registeredCount: number;
  isCurrentUserRegistered: boolean;
  isCurrentUserTrainer: boolean;
  participants: TrainingParticipant[];
  createdAt: string;
  updatedAt: string;
}

export interface TrainingKpi {
  totalSessions: number;
  plannedSessions: number;
  inProgressSessions: number;
  completedSessions: number;
  totalPlannedHours: number;
  totalRegistrations: number;
}

export interface TrainingFormData {
  reference: string;
  title: string;
  description: string | null;
  trainerId: string | null;
  location: string | null;
  deliveryMode: DeliveryMode;
  category: TrainingCategory;
  status: TrainingStatus;
  startDate: string;
  endDate: string;
  durationHours: number;
  maxParticipants: number;
}
