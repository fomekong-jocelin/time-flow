import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { IconComponent } from '../../shared/ui/icon.component';
import { AvatarComponent } from '../../shared/ui/avatar.component';
import { KpiCardComponent } from '../../shared/ui/kpi-card.component';
import { ActivityType, TimesheetOverview, TimesheetStatus } from '../timesheets/timesheet.models';
import { ManagerTimesheetDetail, PendingTimesheetSummary, SubordinateSummary } from './validation.models';
import { ValidationService } from './validation.service';
import { ProjectService, Project } from '../projects/project.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { I18nService } from '../../core/i18n/i18n.service';

@Component({
  selector: 'tf-validation-page',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, AvatarComponent, KpiCardComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './validation-page.component.html'
})
export class ValidationPageComponent implements OnInit {
  private readonly validationService = inject(ValidationService);
  private readonly projectService = inject(ProjectService);
  private readonly auth = inject(AuthService);
  readonly i18n = inject(I18nService);

  readonly timesheets = signal<PendingTimesheetSummary[]>([]);
  readonly loading = signal<boolean>(true);
  readonly actionPending = signal<boolean>(false);
  readonly errorMessage = this.i18n.messageSignal(null);
  readonly successMessage = this.i18n.messageSignal(null);

  // Filtres
  readonly selectedStatus = signal<string>('SUBMITTED');
  readonly selectedUserId = signal<string>('');
  readonly selectedProjectId = signal<string>('');
  selectedWeek = '';

  readonly subordinates = signal<SubordinateSummary[]>([]);
  readonly projects = signal<Project[]>([]);

  readonly selectedDetail = signal<ManagerTimesheetDetail | null>(null);
  readonly rejectModalOpen = signal<boolean>(false);
  targetTimesheetId: string | null = null;
  rejectComment = '';

  readonly currentUserId = computed(() => this.auth.currentUser()?.id);
  readonly isSelectedDetailSelf = computed(() => this.selectedDetail()?.userId === this.currentUserId());
  readonly hasSelfPendingTimesheet = computed(() =>
    this.timesheets().some(t => t.selfTimesheet && t.status === 'SUBMITTED')
  );

  readonly pendingCount = signal<number>(0);

  // Sommes et métriques calculées en temps réel sur la sélection filtrée
  readonly totalMinutesSum = computed(() => this.timesheets().reduce((acc, t) => acc + t.totalMinutes, 0));
  readonly billableMinutesSum = computed(() => this.timesheets().reduce((acc, t) => acc + t.billableMinutes, 0));
  readonly averageTace = computed(() => {
    const total = this.totalMinutesSum();
    const billable = this.billableMinutesSum();
    return total > 0 ? Math.round((billable * 1000) / total) / 10 : 0;
  });

  readonly hasActiveFilters = computed(() =>
    !!this.selectedUserId() || !!this.selectedProjectId() || !!this.selectedWeek || this.selectedStatus() !== 'SUBMITTED'
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

  setStatusFilter(status: string): void {
    this.selectedStatus.set(status);
    this.loadTimesheets();
  }

  onFilterChange(): void {
    this.loadTimesheets();
  }

  resetFilters(): void {
    this.selectedStatus.set('SUBMITTED');
    this.selectedUserId.set('');
    this.selectedProjectId.set('');
    this.selectedWeek = '';
    this.loadTimesheets();
  }

  loadTimesheets(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.validationService.listPending(
      this.selectedStatus(),
      this.selectedWeek || undefined,
      this.selectedUserId() || undefined,
      this.selectedProjectId() || undefined
    ).subscribe({
      next: list => {
        this.timesheets.set(list);
        const actionableCount = list.filter(item => item.status === 'SUBMITTED' && !item.selfTimesheet).length;
        this.pendingCount.set(actionableCount);
        this.loading.set(false);
      },
      error: err => {
        this.errorMessage.set(() => this.i18n.problem(err, this.i18n.t('messages.loadTimesheets')));
        this.loading.set(false);
      }
    });
  }

  openDetail(timesheetId: string): void {
    this.actionPending.set(true);
    this.validationService.getDetail(timesheetId).subscribe({
      next: detail => {
        this.selectedDetail.set(detail);
        this.actionPending.set(false);
      },
      error: err => {
        this.errorMessage.set(() => this.i18n.problem(err, this.i18n.t('messages.loadDetail')));
        this.actionPending.set(false);
      }
    });
  }

  quickValidate(item: PendingTimesheetSummary): void {
    if (item.selfTimesheet) return;
    this.actionPending.set(true);
    this.validationService.validate(item.id, this.i18n.t('messages.approved')).subscribe({
      next: () => {
        this.actionPending.set(false);
        this.successMessage.set(() => this.i18n.t('messages.timesheetApproved', { name: item.userDisplayName }));
        this.loadTimesheets();
      },
      error: err => {
        this.actionPending.set(false);
        this.errorMessage.set(() => this.i18n.problem(err, this.i18n.t('messages.approveFailed')));
      }
    });
  }

  validateFromDetail(): void {
    const detail = this.selectedDetail();
    if (!detail || this.isSelectedDetailSelf()) return;
    this.actionPending.set(true);
    this.validationService.validate(detail.timesheetId, this.i18n.t('messages.approved')).subscribe({
      next: () => {
        this.actionPending.set(false);
        this.selectedDetail.set(null);
        this.successMessage.set(() => this.i18n.t('messages.timesheetApproved', { name: detail.userDisplayName }));
        this.loadTimesheets();
      },
      error: err => {
        this.actionPending.set(false);
        this.errorMessage.set(() => this.i18n.problem(err, this.i18n.t('messages.validationFailed')));
      }
    });
  }

  openRejectModal(item: PendingTimesheetSummary): void {
    if (item.selfTimesheet) return;
    this.targetTimesheetId = item.id;
    this.rejectComment = '';
    this.rejectModalOpen.set(true);
  }

  openRejectModalFromDetail(): void {
    const detail = this.selectedDetail();
    if (!detail || this.isSelectedDetailSelf()) return;
    this.targetTimesheetId = detail.timesheetId;
    this.rejectComment = '';
    this.rejectModalOpen.set(true);
  }

  confirmReject(): void {
    if (!this.targetTimesheetId || this.rejectComment.trim().length < 3) return;

    this.actionPending.set(true);
    this.validationService.reject(this.targetTimesheetId, this.rejectComment.trim()).subscribe({
      next: () => {
        this.actionPending.set(false);
        this.rejectModalOpen.set(false);
        this.selectedDetail.set(null);
        this.successMessage.set(() => this.i18n.t('messages.rejected'));
        this.loadTimesheets();
      },
      error: err => {
        this.actionPending.set(false);
        this.errorMessage.set(() => this.i18n.problem(err, this.i18n.t('messages.rejectFailed')));
      }
    });
  }

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

  getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).map(p => p[0].toUpperCase()).join('') || '?';
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

  activityBadgeClass(type: ActivityType): string {
    switch (type) {
      case 'PROJECT': return 'bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-950/60 dark:text-brand-300 dark:border-brand-800/60';
      case 'TRAINING': return 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800/60';
      case 'SUPPORT': return 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800/60';
      case 'INTERNAL': return 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700';
    }
  }
}
