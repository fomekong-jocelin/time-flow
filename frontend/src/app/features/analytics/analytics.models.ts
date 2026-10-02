export interface ProjectBreakdownItem {
  projectId: string;
  projectName: string;
  projectReference?: string;
  totalMinutes: number;
  billableMinutes: number;
  sharePercentage: number;
}

export interface ActivityBreakdownItem {
  activityType: string;
  label: string;
  totalMinutes: number;
  sharePercentage: number;
}

export interface UserBreakdownItem {
  userId: string;
  displayName: string;
  email: string;
  role: string;
  workScheduleName: string;
  totalMinutes: number;
  billableMinutes: number;
  overtimeMinutes: number;
  activityRate: number;
}

export interface MonthlyTrendItem {
  month: string;
  label: string;
  totalMinutes: number;
  billableMinutes: number;
  activityRate: number;
}

export interface DailyTrendItem {
  date: string;
  label: string;
  dayOfMonth: number;
  totalMinutes: number;
  billableMinutes: number;
}

export interface AnalyticsOverview {
  period: string;
  periodLabel: string;
  startDate: string;
  endDate: string;
  totalMinutes: number;
  billableMinutes: number;
  internalMinutes: number;
  trainingMinutes: number;
  overtimeMinutes: number;
  activityRate: number;
  timesheetsCount: number;
  contributorsCount: number;
  projectsBreakdown: ProjectBreakdownItem[];
  activitiesBreakdown: ActivityBreakdownItem[];
  usersBreakdown: UserBreakdownItem[];
  monthlyTrend: MonthlyTrendItem[];
  dailyTrend: DailyTrendItem[];
}
