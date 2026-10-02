import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, catchError, finalize, forkJoin, of, startWith, switchMap } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { KpiCardComponent } from '../../shared/ui/kpi-card.component';
import { BillingDetailItem, BillingOverview } from './billing.models';
import { BillingService } from './billing.service';
import { MoneyTotalsComponent } from './money-totals.component';
import { formatMoney } from './money-format';
import { ProjectService, Project } from '../projects/project.service';
import { ValidationService } from '../validation/validation.service';
import { SubordinateSummary } from '../validation/validation.models';

@Component({
  selector: 'tf-billing-page', standalone: true,
  imports: [FormsModule, TranslatePipe, KpiCardComponent, MoneyTotalsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush, templateUrl: './billing-page.component.html'
})
export class BillingPageComponent implements OnInit {
  protected readonly i18n = inject(I18nService);
  private readonly service = inject(BillingService); private readonly projectService = inject(ProjectService);
  private readonly validationService = inject(ValidationService); private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef); private readonly requests = new Subject<void>();
  readonly overview = signal<BillingOverview | null>(null); readonly details = signal<BillingDetailItem[]>([]);
  readonly loading = signal(false); readonly error = signal<string | null>(null);
  readonly optionsError = signal(false); readonly optionsLoading = signal(false);
  readonly selectedPeriod = signal(''); readonly selectedProjectId = signal(''); readonly selectedUserId = signal('');
  readonly activeTab = signal<'projects' | 'users' | 'details'>('projects'); readonly showFilterPanel = signal(false);
  readonly exportingExcel = signal(false); readonly exportingCsv = signal(false);
  readonly projects = signal<Project[]>([]); readonly subordinates = signal<SubordinateSummary[]>([]);
  readonly canViewFinancials = computed(() => this.overview()?.canViewFinancials ?? false);
  readonly canViewTeam = computed(() => ['MANAGER', 'DIRECTION', 'ADMIN'].includes(this.auth.currentUser()?.role ?? ''));
  readonly tabs = [{ id: 'projects' as const, label: 'billing.tabProjects' }, { id: 'users' as const, label: 'billing.tabUsers' }, { id: 'details' as const, label: 'billing.tabDetails' }];
  readonly periodPresets = computed(() => {
    const now = new Date(), previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const month = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    return [{ key: month(now), label: 'billing.currentMonth' }, { key: month(previous), label: 'billing.previousMonth' },
      { key: `${now.getFullYear()}-Q${Math.floor(now.getMonth() / 3) + 1}`, label: 'billing.currentQuarter' },
      { key: String(now.getFullYear()), label: 'billing.currentYear' }];
  });
  ngOnInit(): void {
    this.selectedPeriod.set(this.periodPresets()[0].key);
    this.requests.pipe(startWith(undefined), switchMap(() => {
      this.loading.set(true); this.error.set(null); this.overview.set(null); this.details.set([]);
      const period = this.selectedPeriod(), user = this.selectedUserId() || undefined, project = this.selectedProjectId() || undefined;
      return forkJoin({ overview: this.service.getOverview(period, user, project), details: this.service.getDetails(period, user, project) })
        .pipe(catchError(() => { this.error.set('billing.fix.loadError'); return EMPTY; }), finalize(() => this.loading.set(false)));
    }), takeUntilDestroyed(this.destroyRef)).subscribe(result => { this.overview.set(result.overview); this.details.set(result.details); });
    this.loadFilterOptions();
  }
  loadData(): void { this.requests.next(); }
  loadFilterOptions(): void {
    if (this.optionsLoading()) return;
    this.optionsLoading.set(true); this.optionsError.set(false);
    forkJoin({ projects: this.projectService.list(), users: this.canViewTeam() ? this.validationService.getSubordinates() : of([] as SubordinateSummary[]) })
      .pipe(finalize(() => this.optionsLoading.set(false)), takeUntilDestroyed(this.destroyRef)).subscribe({
        next: options => { this.projects.set(options.projects); this.subordinates.set(options.users); },
        error: () => this.optionsError.set(true)
      });
  }
  selectPeriod(period: string): void { this.selectedPeriod.set(period); this.loadData(); }
  resetFilters(): void { this.selectedProjectId.set(''); this.selectedUserId.set(''); this.loadData(); }
  exportFile(type: 'excel' | 'csv'): void {
    const busy = type === 'excel' ? this.exportingExcel : this.exportingCsv;
    if (busy() || this.loading()) return;
    busy.set(true); this.error.set(null);
    const period = this.selectedPeriod(), user = this.selectedUserId() || undefined, project = this.selectedProjectId() || undefined;
    const request = type === 'excel' ? this.service.exportExcel(period, user, project) : this.service.exportCsv(period, user, project);
    request.pipe(finalize(() => busy.set(false)), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: blob => this.service.triggerDownload(blob, `facturation-${period}.${type === 'excel' ? 'xlsx' : 'csv'}`),
      error: () => this.error.set('billing.fix.exportError')
    });
  }
  hours(minutes: number): string { return `${this.i18n.formatNumber(minutes / 60)} h`; }
  money(amount: number | null | undefined, currency: string | null | undefined): string { return formatMoney(amount, currency, this.i18n.locale()); }
  clamped(value: number): number { return Math.max(0, Math.min(100, value)); }
}
