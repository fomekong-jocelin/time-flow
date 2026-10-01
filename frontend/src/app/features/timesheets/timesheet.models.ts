export type TimesheetStatus = 'DRAFT' | 'SUBMITTED' | 'REJECTED' | 'VALIDATED' | 'LOCKED';

export type ActivityType = 'PROJECT' | 'TRAINING' | 'SUPPORT' | 'INTERNAL';

export interface DayEntry {
  date: string; // YYYY-MM-DD
  minutes: number;
}

export interface TimesheetLine {
  projectId: string;
  projectName: string;
  clientName?: string | null;
  activityType: ActivityType;
  billable: boolean;
  comment?: string | null;
  lineTotalMinutes: number;
  entries: DayEntry[];
}

export interface TimesheetOverview {
  id: string | null;
  userId: string;
  weekStart: string; // YYYY-MM-DD
  weekEnd: string;
  status: TimesheetStatus;
  submittedAt?: string | null;
  validatedAt?: string | null;
  lockedAt?: string | null;
  weeklyTargetMinutes: number;
  totalMinutes: number;
  billableMinutes: number;
  internalMinutes: number;
  dailyTotals: Record<string, number>;
  lines: TimesheetLine[];
  rejectionComment?: string | null;
  editable: boolean;
  holidays?: { date: string; name: string; isWorked: boolean }[];
  overtimeMinutes?: number;
  extraTimeMinutes?: number;
}

export interface SaveTimesheetPayload {
  lines: {
    projectId: string;
    activityType: ActivityType;
    billable: boolean;
    comment?: string | null;
    entries: { entryDate: string; minutes: number }[];
  }[];
}

export interface ActiveProject {
  id: string;
  name: string;
  active: boolean;
  billableDefault: boolean;
}
