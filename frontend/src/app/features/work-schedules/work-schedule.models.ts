export interface WorkScheduleProfile {
  id: string;
  code: string;
  name: string;
  description: string | null;
  weeklyTargetMinutes: number;
  dailyTargetMinutes: number;
  maxDailyMinutes: number;
  maxWeeklyMinutes: number;
  workingDays: string[];
  allowWeekendEntry: boolean;
  isDefault: boolean;
  active: boolean;
  assignedUsersCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkScheduleRequest {
  code: string;
  name: string;
  description?: string | null;
  weeklyTargetMinutes: number;
  dailyTargetMinutes: number;
  maxDailyMinutes: number;
  maxWeeklyMinutes: number;
  workingDays: string[];
  allowWeekendEntry: boolean;
  isDefault: boolean;
}

export interface UpdateWorkScheduleRequest {
  name: string;
  description?: string | null;
  weeklyTargetMinutes: number;
  dailyTargetMinutes: number;
  maxDailyMinutes: number;
  maxWeeklyMinutes: number;
  workingDays: string[];
  allowWeekendEntry: boolean;
}

export const ALL_WEEK_DAYS = [
  { key: 'MONDAY', shortLabel: 'Lun', fullLabel: 'Lundi' },
  { key: 'TUESDAY', shortLabel: 'Mar', fullLabel: 'Mardi' },
  { key: 'WEDNESDAY', shortLabel: 'Mer', fullLabel: 'Mercredi' },
  { key: 'THURSDAY', shortLabel: 'Jeu', fullLabel: 'Jeudi' },
  { key: 'FRIDAY', shortLabel: 'Ven', fullLabel: 'Vendredi' },
  { key: 'SATURDAY', shortLabel: 'Sam', fullLabel: 'Samedi' },
  { key: 'SUNDAY', shortLabel: 'Dim', fullLabel: 'Dimanche' }
] as const;
