export interface MoneyTotal { currency: string; amount: number; unpricedBillableMinutes: number; }
export interface ProjectBillingItem {
  projectId: string; projectName: string; projectReference?: string | null; clientOrganization?: string | null;
  totalMinutes: number; billableMinutes: number; billableDays: number; dailyRate?: number | null;
  totalAmount?: number | null; contributorsCount: number; currency: string;
  budgetDays?: number | null; totalPrice?: number | null; remainingDays?: number | null;
  progressDaysPercent?: number | null; remainingAmount?: number | null; progressAmountPercent?: number | null;
}
export interface UserBillingItem {
  userId: string; displayName: string; email: string; role: string; workScheduleName: string;
  totalMinutes: number; billableMinutes: number; billableDays: number; overtimeMinutes: number;
  dailyRate?: number | null; totalAmount?: number | null; dailyRateCurrency?: string | null; moneyTotals?: MoneyTotal[];
}
export interface BillingDetailItem {
  entryDate: string; userId: string; userDisplayName: string; projectId: string; projectName: string;
  activityType: string; minutes: number; billable: boolean; billableDays: number;
  dailyRate?: number | null; totalAmount?: number | null; comment?: string | null; currency?: string;
}
export interface BillingOverview {
  period: string; periodLabel: string; startDate: string; endDate: string; totalMinutes: number;
  billableMinutes: number; billableDays: number; totalProjectsCount: number; totalContributorsCount: number;
  canViewFinancials: boolean; totalFinancialAmount?: number | null; moneyTotals?: MoneyTotal[];
  projects: ProjectBillingItem[]; users: UserBillingItem[];
}
