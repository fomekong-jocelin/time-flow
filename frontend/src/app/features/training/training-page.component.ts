import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Observable, Subject, Subscription, catchError, debounceTime, finalize, startWith, switchMap } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { DialogComponent } from '../../shared/ui/dialog.component';
import { TrainingService } from './training.service';
import { ParticipantCorrection, selfRegistrationAllowed } from './training-participation';
import { ParticipantStatus, TrainingFormData, TrainingKpi, TrainingPage, TrainingSession, TrainingStatus, TrainingUser } from './training.models';
import { TrainingFormComponent } from './training-form.component';
import { TrainingParticipantsModalComponent } from './training-participants-modal.component';

@Component({
  selector: 'tf-training-page', standalone: true,
  imports: [FormsModule, TranslatePipe, DialogComponent, TrainingFormComponent, TrainingParticipantsModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush, templateUrl: './training-page.component.html'
})
export class TrainingPageComponent implements OnInit {
  protected readonly i18n = inject(I18nService);
  private readonly service = inject(TrainingService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly requests = new Subject<void>();
  private detailRequest?: Subscription;
  private formRequest?: Subscription;
  readonly formLoading = signal(false);
  private usersLoaded = false;
  readonly result = signal<TrainingPage>({ items: [], page: 0, size: 24, totalItems: 0, totalPages: 0 });
  readonly loading = signal(false); readonly error = signal<string | null>(null);
  readonly kpis = signal<TrainingKpi | null>(null); readonly kpiError = signal(false);
  readonly users = signal<TrainingUser[]>([]); readonly usersLoading = signal(false); readonly usersError = signal<string | null>(null);
  readonly actionBusy = signal(false); readonly feedback = signal<string | null>(null);
  readonly searchQuery = signal(''); readonly filterStatus = signal(''); readonly filterCategory = signal('');
  readonly filterModality = signal(''); readonly onlyMine = signal(false); readonly page = signal(0);
  readonly showForm = signal(false); readonly editingSession = signal<TrainingSession | null>(null);
  readonly formBusy = signal(false); readonly formError = signal<string | null>(null);
  readonly selectedSession = signal<TrainingSession | null>(null); readonly detail = signal<TrainingSession | null>(null);
  readonly detailLoading = signal(false); readonly detailError = signal<string | null>(null);
  readonly canManage = computed(() => ['ADMIN', 'DIRECTION'].includes(this.auth.currentUser()?.role ?? ''));
  readonly canUpdateAttendance = computed(() => this.canManage()
    || (this.auth.currentUser()?.role === 'TRAINER' && !!this.detail()?.isCurrentUserTrainer));
  readonly kpiCards = computed(() => {
    const k = this.kpis();
    return [
      { label: 'training.kpiTotalSessions', value: k?.totalSessions },
      { label: 'training.kpiPlanned', value: k?.plannedSessions },
      { label: 'training.kpiInProgress', value: k?.inProgressSessions },
      { label: 'training.kpiCompleted', value: k?.completedSessions },
      { label: 'training.kpiTotalHours', value: k?.totalPlannedHours },
      { label: 'training.kpiRegistrations', value: k?.totalRegistrations }
    ];
  });
  ngOnInit(): void {
    this.requests.pipe(startWith(undefined), debounceTime(150), switchMap(() => {
      this.loading.set(true); this.error.set(null);
      return this.service.listPage({ query: this.searchQuery(), status: this.filterStatus(), category: this.filterCategory(),
        deliveryMode: this.filterModality(), onlyMine: this.onlyMine(), page: this.page(), size: 24 }).pipe(
        catchError(error => { this.error.set(this.problem(error)); return EMPTY; }),
        finalize(() => this.loading.set(false)));
    }), takeUntilDestroyed(this.destroyRef)).subscribe(result => {
      if (result.page > 0 && result.page >= result.totalPages) {
        this.page.set(Math.max(0, result.totalPages - 1)); this.requests.next(); return;
      }
      this.result.set(result);
    });
    this.loadKpis();
    this.destroyRef.onDestroy(() => { this.detailRequest?.unsubscribe(); this.formRequest?.unsubscribe(); });
  }
  reload(): void { this.requests.next(); this.loadKpis(); }
  filterChanged(): void { this.page.set(0); this.requests.next(); }
  navigatePage(delta: number): void {
    const page = this.page() + delta;
    if (!this.loading() && page >= 0 && page < this.result().totalPages) { this.page.set(page); this.requests.next(); }
  }
  resetFilters(): void {
    this.searchQuery.set(''); this.filterStatus.set(''); this.filterCategory.set('');
    this.filterModality.set(''); this.onlyMine.set(false); this.filterChanged();
  }
  loadKpis(): void {
    this.kpiError.set(false);
    this.service.getKpis().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: value => this.kpis.set(value), error: () => { this.kpis.set(null); this.kpiError.set(true); }
    });
  }
  loadUsers(force = false): void {
    if (!this.canManage() || this.usersLoading() || (this.usersLoaded && !force)) return;
    this.usersLoading.set(true); this.usersError.set(null);
    this.service.getUsers().pipe(finalize(() => this.usersLoading.set(false)), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: users => { this.users.set(users); this.usersLoaded = true; },
      error: () => this.usersError.set('training.fix.usersError')
    });
  }
  mutable(s: TrainingSession): boolean { return s.status === 'PLANNED' || s.status === 'IN_PROGRESS'; }
  canRegister(s: TrainingSession): boolean { return selfRegistrationAllowed(s); }
  canUnregister(s: TrainingSession): boolean { return this.mutable(s) && s.currentUserParticipantStatus === 'REGISTERED'; }
  statusKey(status: TrainingStatus): string {
    return { PLANNED: 'training.statusPlanned', IN_PROGRESS: 'training.statusInProgress',
      COMPLETED: 'training.statusCompleted', CANCELLED: 'training.statusCancelled' }[status];
  }
  dateRange(s: TrainingSession): string {
    return s.startDate === s.endDate ? this.i18n.formatDate(s.startDate)
      : `${this.i18n.formatDate(s.startDate)} → ${this.i18n.formatDate(s.endDate)}`;
  }
  openForm(session: TrainingSession | null = null): void {
    if (!this.canManage() || this.formBusy() || (session && !this.mutable(session))) return;
    this.formRequest?.unsubscribe();
    this.formError.set(null); this.loadUsers();
    if (!session) {
      this.editingSession.set(null); this.showForm.set(true); return;
    }
    // List DTOs omit participants. Fetch detail before asking for a trainer-transfer confirmation.
    this.formLoading.set(true);
    this.formRequest = this.service.get(session.id).pipe(finalize(() => this.formLoading.set(false)),
      takeUntilDestroyed(this.destroyRef)).subscribe({
        next: full => {
          if (!this.mutable(full)) { this.error.set('training.errors.closed'); return; }
          this.editingSession.set(full); this.showForm.set(true);
        },
        error: error => this.error.set(this.problem(error))
      });
  }
  closeForm(): void { if (!this.formBusy()) { this.showForm.set(false); this.editingSession.set(null); } }
  save(data: TrainingFormData): void {
    if (this.formBusy()) return;
    this.formBusy.set(true); this.formError.set(null);
    const editing = this.editingSession();
    (editing ? this.service.update(editing.id, data) : this.service.create(data))
      .pipe(finalize(() => this.formBusy.set(false)), takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => { this.formBusy.set(false); this.closeForm(); this.feedback.set('common.success'); this.reload(); },
        error: error => this.formError.set(this.problem(error))
      });
  }
  openDetail(session: TrainingSession): void { this.selectedSession.set(session); this.loadDetail(); this.loadUsers(); }
  loadDetail(): void {
    const selected = this.selectedSession();
    if (!selected) return;
    this.detailRequest?.unsubscribe(); this.detail.set(null); this.detailError.set(null); this.detailLoading.set(true);
    this.detailRequest = this.service.get(selected.id).pipe(finalize(() => this.detailLoading.set(false)),
      takeUntilDestroyed(this.destroyRef)).subscribe({
        next: session => this.detail.set(session), error: error => this.detailError.set(this.problem(error))
      });
  }
  closeDetail(): void {
    if (this.actionBusy()) return;
    this.detailRequest?.unsubscribe(); this.selectedSession.set(null); this.detail.set(null);
  }
  registerSelf(s: TrainingSession): void { this.mutate(this.service.register(s.id)); }
  unregisterSelf(s: TrainingSession): void {
    const id = this.auth.currentUser()?.id;
    if (id && confirm(this.i18n.t('training.unregisterConfirm'))) this.mutate(this.service.unregister(s.id, id));
  }
  deleteSession(s: TrainingSession): void {
    if (confirm(this.i18n.t('training.deleteConfirm'))) this.mutate(this.service.delete(s.id));
  }
  addParticipant(userId: string): void {
    const s = this.detail(); if (s) this.mutate(this.service.register(s.id, userId), true);
  }
  removeParticipant(userId: string): void {
    const s = this.detail(); if (s) this.mutate(this.service.unregister(s.id, userId), true);
  }
  updateStatus(event: { userId: string; status: ParticipantStatus }): void {
    const s = this.detail(); if (s) this.mutate(this.service.updateParticipantStatus(s.id, event.userId, event.status), true);
  }
  correctParticipant(event: ParticipantCorrection): void {
    const s = this.detail();
    if (s && this.canManage()) this.mutate(this.service.correctParticipant(s.id, event), true);
  }
  private mutate(request: Observable<unknown>, refreshDetail = false): void {
    if (this.actionBusy()) return;
    this.actionBusy.set(true); this.feedback.set(null); this.detailError.set(null);
    request.pipe(finalize(() => this.actionBusy.set(false)), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { this.feedback.set('common.success'); this.reload(); if (refreshDetail) this.loadDetail(); },
      error: error => refreshDetail ? this.detailError.set(this.problem(error)) : this.error.set(this.problem(error))
    });
  }
  private problem(error: unknown): string {
    const code = (error as { error?: { code?: unknown } })?.error?.code;
    return typeof code === 'string' && /^training\.errors\.\w+$/.test(code) && this.i18n.t(code) !== code ? code : 'common.error';
  }
}
