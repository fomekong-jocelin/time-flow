import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../shared/ui/icon.component';
import { addWeeks, calendarWeek, CalendarWeek, toIsoDateString } from './current-week';
import { ActiveProject, ActivityType, SaveTimesheetPayload, TimesheetOverview, TimesheetStatus } from './timesheet.models';
import { TimesheetService } from './timesheet.service';
import { TimesheetSidePanelComponent } from './timesheet-side-panel.component';
import { WorkScheduleService } from '../work-schedules/work-schedule.service';
import { WorkScheduleProfile } from '../work-schedules/work-schedule.models';
import { StatusBadgeComponent } from '../../shared/ui/status-badge.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { I18nService } from '../../core/i18n/i18n.service';

interface RowViewModel {
  projectId: string;
  projectName: string;
  clientName?: string | null;
  activityType: ActivityType;
  billable: boolean;
  comment?: string | null;
  hoursByDate: Record<string, number>;
}

@Component({
  selector: 'tf-timesheet-page',
  imports: [FormsModule, IconComponent, TimesheetSidePanelComponent, StatusBadgeComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './timesheet-page.component.html'
})
export class TimesheetPageComponent implements OnInit {
  private readonly timesheetService = inject(TimesheetService);
  private readonly workScheduleService = inject(WorkScheduleService);
  protected readonly i18n = inject(I18nService);

  readonly currentDate = signal<Date>(new Date());
  readonly mySchedule = signal<WorkScheduleProfile | null>(null);

  readonly timesheet = signal<TimesheetOverview | null>(null);

  readonly week = computed<CalendarWeek>(() => {
    const sched = this.mySchedule();
    const workingDays = sched ? sched.workingDays : ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
    const allowWeekend = sched ? sched.allowWeekendEntry : false;
    const holidays = this.timesheet()?.holidays || [];
    return calendarWeek(this.currentDate(), new Date(), workingDays, allowWeekend, holidays, this.i18n.currentLang());
  });

  readonly overtimeHours = computed<number>(() => {
    const total = this.totalHours();
    const target = this.targetHours();
    return total > target ? +(total - target).toFixed(2) : 0;
  });

  readonly activeProjects = signal<ActiveProject[]>([]);
  readonly rows = signal<RowViewModel[]>([]);

  readonly loading = signal<boolean>(true);
  readonly saving = signal<boolean>(false);
  readonly errorMessage = this.i18n.messageSignal(null);
  readonly successMessage = this.i18n.messageSignal(null);

  readonly showAddLineModal = signal<boolean>(false);
  selectedProjectId = '';
  selectedActivityType: ActivityType = 'PROJECT';
  selectedBillable = true;
  selectedComment = '';

  readonly status = computed<TimesheetStatus>(() => this.timesheet()?.status ?? 'DRAFT');
  readonly isEditable = computed<boolean>(() => this.timesheet()?.editable ?? true);

  readonly targetHours = computed<number>(() => {
    const sched = this.mySchedule();
    if (sched) return sched.weeklyTargetMinutes / 60;
    const minutes = this.timesheet()?.weeklyTargetMinutes ?? 2100;
    return minutes / 60;
  });

  readonly maxWeeklyHours = computed<number>(() => {
    const sched = this.mySchedule();
    return sched ? sched.maxWeeklyMinutes / 60 : 48;
  });

  readonly maxDailyHours = computed<number>(() => {
    const sched = this.mySchedule();
    return sched ? sched.maxDailyMinutes / 60 : 10;
  });

  readonly dailyTotals = computed<Record<string, number>>(() => {
    const totals: Record<string, number> = {};
    for (const day of this.week().days) {
      let sum = 0;
      for (const row of this.rows()) {
        sum += row.hoursByDate[day.isoDate] || 0;
      }
      totals[day.isoDate] = sum;
    }
    return totals;
  });

  readonly totalHours = computed<number>(() => {
    let sum = 0;
    for (const hours of Object.values(this.dailyTotals())) {
      sum += hours;
    }
    return sum;
  });

  readonly billableHours = computed<number>(() => {
    let sum = 0;
    for (const row of this.rows()) {
      if (row.billable) {
        for (const hours of Object.values(row.hoursByDate)) {
          sum += hours || 0;
        }
      }
    }
    return sum;
  });

  readonly internalHours = computed<number>(() => {
    let sum = 0;
    for (const row of this.rows()) {
      if (row.activityType === 'INTERNAL' || !row.billable) {
        for (const hours of Object.values(row.hoursByDate)) {
          sum += hours || 0;
        }
      }
    }
    return sum;
  });

  readonly columnCount = computed<number>(() => this.week().days.length + (this.isEditable() ? 5 : 4));

  ngOnInit(): void {
    this.loadMySchedule();
    this.loadActiveProjects();
    this.loadTimesheet();
  }

  loadMySchedule(): void {
    this.workScheduleService.getMyWorkSchedule().subscribe({
      next: schedule => this.mySchedule.set(schedule),
      error: () => { /* fallback automatique au profil standard */ }
    });
  }

  previousWeek(): void {
    this.currentDate.update(d => addWeeks(d, -1));
    this.loadTimesheet();
  }

  nextWeek(): void {
    this.currentDate.update(d => addWeeks(d, 1));
    this.loadTimesheet();
  }

  resetToCurrentWeek(): void {
    this.currentDate.set(new Date());
    this.loadTimesheet();
  }

  loadActiveProjects(): void {
    this.timesheetService.getActiveProjects().subscribe({
      next: projects => this.activeProjects.set(projects),
      error: () => { /* silencieux : liste vide par défaut */ }
    });
  }

  loadTimesheet(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const weekIso = this.week().mondayIsoDate;
    this.timesheetService.getTimesheet(weekIso).subscribe({
      next: overview => {
        this.timesheet.set(overview);
        this.buildRowsFromOverview(overview);
        this.loading.set(false);
      },
      error: err => {
        this.errorMessage.set(() => this.i18n.problem(err, this.i18n.t('messages.loadTimesheet')));
        this.loading.set(false);
      }
    });
  }

  onHourChange(row: RowViewModel, isoDate: string, rawValue: unknown): void {
    const val = typeof rawValue === 'number' ? rawValue : parseFloat(String(rawValue || '0'));
    const safeVal = isNaN(val) || val < 0 ? 0 : Math.min(val, 24);
    row.hoursByDate[isoDate] = safeVal;
    // Trigger signal update
    this.rows.update(r => [...r]);
  }

  calculateRowTotal(row: RowViewModel): number {
    let sum = 0;
    for (const h of Object.values(row.hoursByDate)) {
      sum += h || 0;
    }
    return sum;
  }

  openAddLineModal(): void {
    this.selectedProjectId = this.activeProjects().length > 0 ? this.activeProjects()[0].id : '';
    this.selectedActivityType = 'PROJECT';
    this.selectedBillable = this.activeProjects().length > 0 ? this.activeProjects()[0].billableDefault : true;
    this.selectedComment = '';
    this.showAddLineModal.set(true);
  }

  confirmAddLine(): void {
    const project = this.activeProjects().find(p => p.id === this.selectedProjectId);
    if (!project) return;

    const initialHours: Record<string, number> = {};
    for (const day of this.week().days) {
      initialHours[day.isoDate] = 0;
    }

    const newRow: RowViewModel = {
      projectId: project.id,
      projectName: project.name,
      activityType: this.selectedActivityType,
      billable: this.selectedBillable,
      comment: this.selectedComment.trim() || null,
      hoursByDate: initialHours
    };

    this.rows.update(r => [...r, newRow]);
    this.showAddLineModal.set(false);
  }

  removeLine(index: number): void {
    this.rows.update(r => r.filter((_, i) => i !== index));
  }

  saveDraft(): void {
    this.saving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const payload = this.buildPayload();
    this.timesheetService.saveDraft(this.week().mondayIsoDate, payload).subscribe({
      next: overview => {
        this.timesheet.set(overview);
        this.buildRowsFromOverview(overview);
        this.saving.set(false);
        this.successMessage.set(() => this.i18n.t('messages.draftSaved'));
      },
      error: err => {
        this.saving.set(false);
        this.errorMessage.set(() => this.i18n.problem(err, this.i18n.t('messages.draftFailed')));
      }
    });
  }

  submit(): void {
    if (this.totalHours() <= 0) {
      this.errorMessage.set(() => this.i18n.t('messages.emptyTimesheet'));
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const payload = this.buildPayload();
    this.timesheetService.submit(this.week().mondayIsoDate, payload).subscribe({
      next: overview => {
        this.timesheet.set(overview);
        this.buildRowsFromOverview(overview);
        this.saving.set(false);
        this.successMessage.set(() => this.i18n.t('messages.submitted'));
      },
      error: err => {
        this.saving.set(false);
        this.errorMessage.set(() => this.i18n.problem(err, this.i18n.t('messages.submitFailed')));
      }
    });
  }

  formatHours(h: number): string {
    return h.toLocaleString(this.i18n.locale(), { minimumFractionDigits: 0, maximumFractionDigits: 1 }) + ' h';
  }

  activityLabel(type: ActivityType): string {
    switch (type) {
      case 'PROJECT': return this.i18n.t('activities.PROJECT');
      case 'TRAINING': return this.i18n.t('activities.TRAINING');
      case 'SUPPORT': return this.i18n.t('activities.SUPPORT');
      case 'INTERNAL': return this.i18n.t('activities.INTERNAL');
    }
  }

  activityBadgeClass(type: ActivityType): string {
    switch (type) {
      case 'PROJECT': return 'bg-brand-50 text-brand-700 border-brand-200';
      case 'TRAINING': return 'bg-violet-50 text-violet-700 border-violet-200';
      case 'SUPPORT': return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'INTERNAL': return 'bg-slate/10 text-slate border-slate/20';
    }
  }

  private buildRowsFromOverview(overview: TimesheetOverview): void {
    const newRows: RowViewModel[] = [];
    for (const line of overview.lines) {
      const hoursMap: Record<string, number> = {};
      for (const entry of line.entries) {
        hoursMap[entry.date] = entry.minutes / 60;
      }
      newRows.push({
        projectId: line.projectId,
        projectName: line.projectName,
        clientName: line.clientName,
        activityType: line.activityType,
        billable: line.billable,
        comment: line.comment,
        hoursByDate: hoursMap
      });
    }
    this.rows.set(newRows);
  }

  private buildPayload(): SaveTimesheetPayload {
    return {
      lines: this.rows().map(row => ({
        projectId: row.projectId,
        activityType: row.activityType,
        billable: row.billable,
        comment: row.comment,
        entries: Object.entries(row.hoursByDate).map(([date, hours]) => ({
          entryDate: date,
          minutes: Math.round((hours || 0) * 60)
        }))
      }))
    };
  }
}
