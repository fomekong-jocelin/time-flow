import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { IconComponent } from '../../shared/ui/icon.component';
import { AvatarComponent } from '../../shared/ui/avatar.component';
import { KpiCardComponent } from '../../shared/ui/kpi-card.component';
import { ActivityType, DayEntry, TimesheetLine, TimesheetOverview, TimesheetStatus } from '../timesheets/timesheet.models';
import { ManagerTimesheetDetail, PendingTimesheetSummary, SubordinateSummary } from '../validation/validation.models';
import { ValidationService } from '../validation/validation.service';
import { ProjectService, Project } from '../projects/project.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { I18nService } from '../../core/i18n/i18n.service';
import { calendarWeek, toIsoDateString, addWeeks } from '../timesheets/current-week';

@Component({
  selector: 'tf-team-timesheets-page',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, AvatarComponent, KpiCardComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './team-timesheets-page.component.html'
})
export class TeamTimesheetsPageComponent implements OnInit {
  private readonly validationService = inject(ValidationService);
  private readonly projectService = inject(ProjectService);
  private readonly auth = inject(AuthService);
  readonly i18n = inject(I18nService);

  readonly timesheets = signal<PendingTimesheetSummary[]>([]);
  readonly subordinates = signal<SubordinateSummary[]>([]);
  readonly projects = signal<Project[]>([]);
  readonly loading = signal<boolean>(true);
  readonly actionPending = signal<boolean>(false);
  readonly detailLoading = signal<boolean>(false);

  readonly errorMessage = this.i18n.messageSignal(null);
  readonly successMessage = this.i18n.messageSignal(null);

  // Filtres
  readonly selectedUserId = signal<string>('');
  readonly selectedStatus = signal<string>('ALL');
  readonly selectedProjectId = signal<string>('');
  readonly selectedWeekDate = signal<Date | null>(new Date()); // Par défaut cette semaine

  // Détail / Modale de consultation
  readonly selectedDetail = signal<ManagerTimesheetDetail | null>(null);
  readonly currentDetailWeek = signal<Date>(new Date());
  readonly currentDetailUserId = signal<string>('');

  // Rejet
  readonly rejectModalOpen = signal<boolean>(false);
  targetRejectTimesheetId: string | null = null;
  rejectComment = '';

  readonly currentUserId = computed(() => this.auth.currentUser()?.id);

  readonly selectedWeekIso = computed(() => {
    const d = this.selectedWeekDate();
    if (!d) return '';
    const cal = calendarWeek(d, new Date(), undefined, false, [], this.i18n.currentLang());
    return cal.mondayIsoDate;
  });

  readonly selectedWeekLabel = computed(() => {
    const d = this.selectedWeekDate();
    if (!d) return this.i18n.t('teamTimesheets.allWeeks');
    const cal = calendarWeek(d, new Date(), undefined, false, [], this.i18n.currentLang());
    return `${this.i18n.t('timesheets.weekShort')}${cal.number} (${cal.range})`;
  });

  // KPIs calculés sur les données filtrées affichées
  readonly totalMinutesSum = computed(() => this.timesheets().reduce((acc, t) => acc + t.totalMinutes, 0));
  readonly billableMinutesSum = computed(() => this.timesheets().reduce((acc, t) => acc + t.billableMinutes, 0));
  readonly totalDaysEquivalent = computed(() => {
    const totalHours = this.totalMinutesSum() / 60;
    return Math.round((totalHours / 7) * 10) / 10;
  });

  readonly averageTace = computed(() => {
    const total = this.totalMinutesSum();
    const billable = this.billableMinutesSum();
    return total > 0 ? Math.round((billable * 1000) / total) / 10 : 0;
  });

  readonly uniqueUsersCount = computed(() => {
    const set = new Set(this.timesheets().map(t => t.userId));
    return set.size;
  });

  readonly draftCount = computed(() => this.timesheets().filter(t => t.status === 'DRAFT').length);
  readonly submittedCount = computed(() => this.timesheets().filter(t => t.status === 'SUBMITTED').length);
  readonly validatedCount = computed(() => this.timesheets().filter(t => t.status === 'VALIDATED').length);
  readonly rejectedCount = computed(() => this.timesheets().filter(t => t.status === 'REJECTED').length);

  readonly hasActiveFilters = computed(() =>
    !!this.selectedUserId() ||
    !!this.selectedProjectId() ||
    this.selectedStatus() !== 'ALL' ||
    this.selectedWeekDate() === null
  );

  ngOnInit(): void {
    this.loadFilterOptions();
    this.loadTimesheets();
  }

  loadFilterOptions(): void {
    this.validationService.getSubordinates().subscribe({
      next: subs => this.subordinates.set(subs),
      error: () => {}
    });
    this.projectService.list().subscribe({
      next: projs => this.projects.set(projs),
      error: () => {}
    });
  }

  loadTimesheets(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const weekStart = this.selectedWeekIso() || undefined;
    const userId = this.selectedUserId() || undefined;
    const projectId = this.selectedProjectId() || undefined;
    const status = this.selectedStatus();

    this.validationService.listPending(status, weekStart, userId, projectId).subscribe({
      next: list => {
        this.timesheets.set(list);
        this.loading.set(false);
      },
      error: err => {
        this.errorMessage.set(() => this.i18n.problem(err, this.i18n.t('messages.loadTimesheets')));
        this.loading.set(false);
      }
    });
  }

  onFilterChange(): void {
    this.loadTimesheets();
  }

  setStatusFilter(status: string): void {
    this.selectedStatus.set(status);
    this.loadTimesheets();
  }

  setUserFilter(userId: string): void {
    this.selectedUserId.set(userId);
    this.loadTimesheets();
  }

  setThisWeek(): void {
    this.selectedWeekDate.set(new Date());
    this.loadTimesheets();
  }

  setPreviousWeek(): void {
    const current = this.selectedWeekDate() || new Date();
    this.selectedWeekDate.set(addWeeks(current, -1));
    this.loadTimesheets();
  }

  setNextWeek(): void {
    const current = this.selectedWeekDate() || new Date();
    this.selectedWeekDate.set(addWeeks(current, 1));
    this.loadTimesheets();
  }

  setAllWeeks(): void {
    this.selectedWeekDate.set(null);
    this.loadTimesheets();
  }

  resetFilters(): void {
    this.selectedStatus.set('ALL');
    this.selectedUserId.set('');
    this.selectedProjectId.set('');
    this.selectedWeekDate.set(new Date());
    this.loadTimesheets();
  }

  // Consultation détaillée d'une feuille (avec fallback si non créée pour la semaine)
  openDetail(item: PendingTimesheetSummary): void {
    this.currentDetailUserId.set(item.userId);
    const date = new Date(item.weekStart);
    this.currentDetailWeek.set(isNaN(date.getTime()) ? new Date() : date);
    this.fetchDetailForCurrentWeek();
  }

  openUserWeekDetail(userId: string, weekDate?: Date): void {
    this.currentDetailUserId.set(userId);
    this.currentDetailWeek.set(weekDate || this.selectedWeekDate() || new Date());
    this.fetchDetailForCurrentWeek();
  }

  fetchDetailForCurrentWeek(): void {
    const userId = this.currentDetailUserId();
    if (!userId) return;

    this.detailLoading.set(true);
    const cal = calendarWeek(this.currentDetailWeek(), new Date(), undefined, false, [], this.i18n.currentLang());

    this.validationService.viewSubordinateWeek(userId, cal.mondayIsoDate).subscribe({
      next: detail => {
        this.selectedDetail.set(detail);
        this.detailLoading.set(false);
      },
      error: err => {
        this.errorMessage.set(() => this.i18n.problem(err, this.i18n.t('messages.loadDetail')));
        this.detailLoading.set(false);
      }
    });
  }

  prevDetailWeek(): void {
    this.currentDetailWeek.set(addWeeks(this.currentDetailWeek(), -1));
    this.fetchDetailForCurrentWeek();
  }

  nextDetailWeek(): void {
    this.currentDetailWeek.set(addWeeks(this.currentDetailWeek(), 1));
    this.fetchDetailForCurrentWeek();
  }

  todayDetailWeek(): void {
    this.currentDetailWeek.set(new Date());
    this.fetchDetailForCurrentWeek();
  }

  closeDetail(): void {
    this.selectedDetail.set(null);
  }

  // Actions de validation directe depuis le détail
  canValidateDetail(): boolean {
    const detail = this.selectedDetail();
    if (!detail) return false;
    const isSelf = detail.userId === this.currentUserId();
    return detail.overview.status === 'SUBMITTED' && !isSelf;
  }

  validateFromDetail(): void {
    const detail = this.selectedDetail();
    if (!detail || !detail.timesheetId || !this.canValidateDetail()) return;

    this.actionPending.set(true);
    this.validationService.validate(detail.timesheetId, this.i18n.t('messages.approved')).subscribe({
      next: () => {
        this.actionPending.set(false);
        this.successMessage.set(() => this.i18n.t('messages.timesheetApproved', { name: detail.userDisplayName }));
        this.fetchDetailForCurrentWeek();
        this.loadTimesheets();
      },
      error: err => {
        this.actionPending.set(false);
        this.errorMessage.set(() => this.i18n.problem(err, this.i18n.t('messages.validationFailed')));
      }
    });
  }

  openRejectModalFromDetail(): void {
    const detail = this.selectedDetail();
    if (!detail || !detail.timesheetId || !this.canValidateDetail()) return;

    this.targetRejectTimesheetId = detail.timesheetId;
    this.rejectComment = '';
    this.rejectModalOpen.set(true);
  }

  confirmReject(): void {
    if (!this.targetRejectTimesheetId || this.rejectComment.trim().length < 3) return;

    this.actionPending.set(true);
    this.validationService.reject(this.targetRejectTimesheetId, this.rejectComment.trim()).subscribe({
      next: () => {
        this.actionPending.set(false);
        this.rejectModalOpen.set(false);
        this.successMessage.set(() => this.i18n.t('messages.rejected'));
        this.fetchDetailForCurrentWeek();
        this.loadTimesheets();
      },
      error: err => {
        this.actionPending.set(false);
        this.errorMessage.set(() => this.i18n.problem(err, this.i18n.t('messages.rejectFailed')));
      }
    });
  }

  // Helpers de formatage
  formatHours(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h} h ${m.toString().padStart(2, '0')}`;
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return this.i18n.currentLang() === 'en' ? `${m}/${d}` : `${d}/${m}`;
  }

  formatDateTime(isoStr: string): string {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    const locale = this.i18n.currentLang() === 'en' ? 'en-US' : 'fr-FR';
    return d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  getWeekNumber(isoDate: string): number {
    if (!isoDate) return 0;
    const date = new Date(isoDate);
    const thursday = new Date(date.getTime() + (3 - ((date.getDay() + 6) % 7)) * 86400000);
    const firstThursday = new Date(thursday.getFullYear(), 0, 4);
    firstThursday.setDate(firstThursday.getDate() - ((firstThursday.getDay() + 6) % 7) + 3);
    return 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * 86400000));
  }

  getBillableRate(item: PendingTimesheetSummary): string {
    if (item.totalMinutes <= 0) return '0%';
    const pct = Math.round((item.billableMinutes / item.totalMinutes) * 100);
    return `${pct}%`;
  }

  getCompletionPercent(total: number, target: number): number {
    if (!target || target <= 0) return 0;
    return Math.min(100, Math.round((total / target) * 100));
  }

  activityBadgeClass(type: ActivityType): string {
    switch (type) {
      case 'PROJECT':
        return 'bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-950/60 dark:text-brand-300 dark:border-brand-800/60';
      case 'TRAINING':
        return 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800/60';
      case 'SUPPORT':
        return 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800/60';
      case 'INTERNAL':
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700/60';
      default:
        return 'bg-app text-muted border-border';
    }
  }

  statusBadgeClass(status: TimesheetStatus): string {
    switch (status) {
      case 'DRAFT':
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700/60';
      case 'SUBMITTED':
        return 'bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-950/60 dark:text-brand-300 dark:border-brand-800/60';
      case 'VALIDATED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60';
      case 'REJECTED':
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60';
      case 'LOCKED':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60';
      default:
        return 'bg-app text-muted border-border';
    }
  }
}
