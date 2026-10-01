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
  overtimeThresholdMinutes: number;
  overtimeRateTier1: number;
  overtimeRateTier2: number;
  overtimeRateHoliday: number;
  overtimeCompensationMode: 'PAY' | 'RECOVERY' | 'HYBRID';
  extraTimeAllowed: boolean;
  extraTimeMaxWeeklyMinutes: number;
  extraTimeRate: number;
  extraTimeCompensationMode: 'PAY' | 'RECOVERY' | 'HYBRID';
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
  overtimeThresholdMinutes?: number;
  overtimeRateTier1?: number;
  overtimeRateTier2?: number;
  overtimeRateHoliday?: number;
  overtimeCompensationMode?: 'PAY' | 'RECOVERY' | 'HYBRID';
  extraTimeAllowed?: boolean;
  extraTimeMaxWeeklyMinutes?: number;
  extraTimeRate?: number;
  extraTimeCompensationMode?: 'PAY' | 'RECOVERY' | 'HYBRID';
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
  overtimeThresholdMinutes?: number;
  overtimeRateTier1?: number;
  overtimeRateTier2?: number;
  overtimeRateHoliday?: number;
  overtimeCompensationMode?: 'PAY' | 'RECOVERY' | 'HYBRID';
  extraTimeAllowed?: boolean;
  extraTimeMaxWeeklyMinutes?: number;
  extraTimeRate?: number;
  extraTimeCompensationMode?: 'PAY' | 'RECOVERY' | 'HYBRID';
}

export interface PublicHoliday {
  id: string;
  holidayDate: string;
  name: string;
  isWorked: boolean;
  year: number;
}

export interface CreateHolidayRequest {
  holidayDate: string;
  name: string;
  isWorked: boolean;
}

export interface UpdateHolidayRequest {
  name: string;
  isWorked: boolean;
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
