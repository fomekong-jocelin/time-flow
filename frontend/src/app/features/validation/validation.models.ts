import { TimesheetOverview, TimesheetStatus } from '../timesheets/timesheet.models';

export interface PendingTimesheetSummary {
  id: string;
  userId: string;
  userDisplayName: string;
  userEmail: string;
  weekStart: string; // YYYY-MM-DD
  weekEnd: string;
  status: TimesheetStatus;
  submittedAt: string;
  totalMinutes: number;
  billableMinutes: number;
  linesCount: number;
}

export interface ValidationHistoryItem {
  id: string;
  decision: string;
  comment?: string | null;
  validatorDisplayName: string;
  decidedAt: string;
}

export interface ManagerTimesheetDetail {
  timesheetId: string;
  userId: string;
  userDisplayName: string;
  userEmail: string;
  overview: TimesheetOverview;
  history: ValidationHistoryItem[];
}
