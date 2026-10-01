import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TrainingService } from './training.service';
import { DeliveryMode, ParticipantStatus, TrainingCategory, TrainingFormData, TrainingKpi, TrainingSession, TrainingStatus, TrainingUser } from './training.models';
import { AuthService } from '../../core/auth/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { IconComponent } from '../../shared/ui/icon.component';
import { TrainingFormComponent } from './training-form.component';
import { TrainingParticipantsModalComponent } from './training-participants-modal.component';

@Component({
  selector: 'tf-training-page',
  standalone: true,
  imports: [
    FormsModule,
    TranslatePipe,
    IconComponent,
    TrainingFormComponent,
    TrainingParticipantsModalComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 p-4 sm:p-6 lg:p-8">
      <!-- En-tête de la page -->
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-ink">
            {{ 'training.title' | translate }}
          </h1>
          <p class="text-xs sm:text-sm text-muted mt-1">
            {{ 'training.subtitle' | translate }}
          </p>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            (click)="reload()"
            [disabled]="loading()"
            class="min-h-10 inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 text-xs font-semibold transition hover:bg-app cursor-pointer"
            [title]="'common.refresh' | translate">
            <tf-icon name="sliders" [size]="16" />
            <span class="hidden sm:inline">{{ 'common.refresh' | translate }}</span>
          </button>

          @if (canManage()) {
            <button
              type="button"
              (click)="openCreateModal()"
              class="min-h-10 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 text-xs font-semibold text-white shadow-xs transition hover:bg-brand-700 cursor-pointer">
              <tf-icon name="plus" [size]="16" />
              <span>{{ 'training.createSession' | translate }}</span>
            </button>
          }
        </div>
      </div>

      <!-- Message d'alerte / feedback -->
      @if (feedback()) {
        <div
          class="flex items-center justify-between rounded-xl p-3 text-xs"
          [class.bg-emerald-50]="feedback()?.type === 'success'"
          [class.text-emerald-800]="feedback()?.type === 'success'"
          [class.dark:bg-emerald-950/40]="feedback()?.type === 'success'"
          [class.dark:text-emerald-300]="feedback()?.type === 'success'"
          [class.bg-rose-50]="feedback()?.type === 'error'"
          [class.text-rose-800]="feedback()?.type === 'error'"
          [class.dark:bg-rose-950/40]="feedback()?.type === 'error'"
          [class.dark:text-rose-300]="feedback()?.type === 'error'">
          <span>{{ feedback()?.text }}</span>
          <button type="button" (click)="feedback.set(null)" class="text-current opacity-70 hover:opacity-100">
            <tf-icon name="x" [size]="14" />
          </button>
        </div>
      }

      <!-- Cartes KPI -->
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div class="rounded-xl border border-border bg-surface p-3.5 shadow-2xs">
          <p class="text-[11px] font-medium text-muted uppercase tracking-wider">{{ 'training.kpiTotalSessions' | translate }}</p>
          <p class="mt-1.5 text-xl font-bold font-mono text-ink">{{ kpis()?.totalSessions ?? 0 }}</p>
        </div>

        <div class="rounded-xl border border-border bg-surface p-3.5 shadow-2xs">
          <p class="text-[11px] font-medium text-muted uppercase tracking-wider">{{ 'training.kpiPlanned' | translate }}</p>
          <p class="mt-1.5 text-xl font-bold font-mono text-sky-600 dark:text-sky-400">{{ kpis()?.plannedSessions ?? 0 }}</p>
        </div>

        <div class="rounded-xl border border-border bg-surface p-3.5 shadow-2xs">
          <p class="text-[11px] font-medium text-muted uppercase tracking-wider">{{ 'training.kpiInProgress' | translate }}</p>
          <p class="mt-1.5 text-xl font-bold font-mono text-amber-600 dark:text-amber-400">{{ kpis()?.inProgressSessions ?? 0 }}</p>
        </div>

        <div class="rounded-xl border border-border bg-surface p-3.5 shadow-2xs">
          <p class="text-[11px] font-medium text-muted uppercase tracking-wider">{{ 'training.kpiCompleted' | translate }}</p>
          <p class="mt-1.5 text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">{{ kpis()?.completedSessions ?? 0 }}</p>
        </div>

        <div class="rounded-xl border border-border bg-surface p-3.5 shadow-2xs">
          <p class="text-[11px] font-medium text-muted uppercase tracking-wider">{{ 'training.kpiTotalHours' | translate }}</p>
          <p class="mt-1.5 text-xl font-bold font-mono text-ink">{{ kpis()?.totalPlannedHours ?? 0 }}</p>
        </div>

        <div class="rounded-xl border border-border bg-surface p-3.5 shadow-2xs">
          <p class="text-[11px] font-medium text-muted uppercase tracking-wider">{{ 'training.kpiRegistrations' | translate }}</p>
          <p class="mt-1.5 text-xl font-bold font-mono text-purple-600 dark:text-purple-400">{{ kpis()?.totalRegistrations ?? 0 }}</p>
        </div>
      </div>

      <!-- Filtres et Recherche -->
      <div class="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 shadow-2xs lg:flex-row lg:items-center">
        <!-- Recherche texte -->
        <div class="relative flex-1">
          <input
            type="search"
            [placeholder]="'training.searchPlaceholder' | translate"
            [ngModel]="searchQuery()"
            (ngModelChange)="searchQuery.set($event); applyFilters()"
            class="min-h-10 w-full rounded-xl border border-border bg-app px-3 pl-9 text-xs focus:border-brand-500 focus:outline-none" />
          <span class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted">
            <tf-icon name="filter" [size]="14" />
          </span>
        </div>

        <!-- Filtre Statut -->
        <select
          [ngModel]="filterStatus()"
          (ngModelChange)="filterStatus.set($event); applyFilters()"
          class="min-h-10 rounded-xl border border-border bg-app px-3 text-xs font-medium focus:border-brand-500 focus:outline-none">
          <option value="">{{ 'training.filterStatus' | translate }}</option>
          <option value="PLANNED">{{ 'training.statusPlanned' | translate }}</option>
          <option value="IN_PROGRESS">{{ 'training.statusInProgress' | translate }}</option>
          <option value="COMPLETED">{{ 'training.statusCompleted' | translate }}</option>
          <option value="CANCELLED">{{ 'training.statusCancelled' | translate }}</option>
        </select>

        <!-- Filtre Catégorie -->
        <select
          [ngModel]="filterCategory()"
          (ngModelChange)="filterCategory.set($event); applyFilters()"
          class="min-h-10 rounded-xl border border-border bg-app px-3 text-xs font-medium focus:border-brand-500 focus:outline-none">
          <option value="">{{ 'training.filterCategory' | translate }}</option>
          <option value="INTERNAL">{{ 'training.categoryInternal' | translate }}</option>
          <option value="CLIENT">{{ 'training.categoryClient' | translate }}</option>
        </select>

        <!-- Filtre Modalité -->
        <select
          [ngModel]="filterModality()"
          (ngModelChange)="filterModality.set($event); applyFilters()"
          class="min-h-10 rounded-xl border border-border bg-app px-3 text-xs font-medium focus:border-brand-500 focus:outline-none">
          <option value="">{{ 'training.filterModality' | translate }}</option>
          <option value="REMOTE">{{ 'training.modalityRemote' | translate }}</option>
          <option value="ON_SITE">{{ 'training.modalityOnSite' | translate }}</option>
          <option value="HYBRID">{{ 'training.modalityHybrid' | translate }}</option>
        </select>

        <!-- Bouton bascule "Mes formations" -->
        <button
          type="button"
          (click)="toggleOnlyMine()"
          [class.bg-brand-600]="onlyMine()"
          [class.text-white]="onlyMine()"
          [class.border-brand-600]="onlyMine()"
          class="min-h-10 inline-flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 text-xs font-medium transition hover:bg-app cursor-pointer">
          <tf-icon name="graduation" [size]="14" />
          <span>{{ 'training.onlyMine' | translate }}</span>
        </button>
      </div>

      <!-- Liste / Grille des sessions de formation -->
      @if (loading() && sessions().length === 0) {
        <div class="py-16 text-center text-xs text-muted">
          {{ 'common.loading' | translate }}
        </div>
      } @else if (filteredSessions().length === 0) {
        <div class="rounded-2xl border border-dashed border-border py-16 text-center bg-surface">
          <tf-icon name="graduation" [size]="40" class="mx-auto text-muted/40 mb-3" />
          <p class="text-sm font-medium text-ink">{{ 'training.emptyCatalog' | translate }}</p>
        </div>
      } @else {
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          @for (s of filteredSessions(); track s.id) {
            <div class="flex flex-col justify-between rounded-2xl border border-border bg-surface p-5 shadow-2xs hover:border-brand-300 dark:hover:border-brand-800 transition">
              <!-- Haut de carte : Badges & Actions rapides -->
              <div class="space-y-3">
                <div class="flex items-center justify-between gap-2 flex-wrap">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <!-- Catégorie -->
                    @if (s.category === 'INTERNAL') {
                      <span class="rounded-md bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 text-[11px] font-medium text-indigo-700 dark:text-indigo-300">
                        {{ 'training.categoryInternal' | translate }}
                      </span>
                    } @else {
                      <span class="rounded-md bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                        {{ 'training.categoryClient' | translate }}
                      </span>
                    }

                    <!-- Modalité -->
                    <span class="rounded-md border border-border bg-app px-2 py-0.5 text-[11px] text-muted">
                      @switch (s.deliveryMode) {
                        @case ('REMOTE') { {{ 'training.modalityRemote' | translate }} }
                        @case ('ON_SITE') { {{ 'training.modalityOnSite' | translate }} }
                        @case ('HYBRID') { {{ 'training.modalityHybrid' | translate }} }
                      }
                    </span>

                    <!-- Statut -->
                    @switch (s.status) {
                      @case ('PLANNED') {
                        <span class="rounded-md bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 text-[11px] font-medium text-sky-700 dark:text-sky-300">
                          {{ 'training.statusPlanned' | translate }}
                        </span>
                      }
                      @case ('IN_PROGRESS') {
                        <span class="rounded-md bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                          {{ 'training.statusInProgress' | translate }}
                        </span>
                      }
                      @case ('COMPLETED') {
                        <span class="rounded-md bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                          {{ 'training.statusCompleted' | translate }}
                        </span>
                      }
                      @case ('CANCELLED') {
                        <span class="rounded-md bg-stone-100 dark:bg-stone-800 px-2 py-0.5 text-[11px] font-medium text-stone-600 dark:text-stone-400">
                          {{ 'training.statusCancelled' | translate }}
                        </span>
                      }
                    }
                  </div>

                  @if (canManage()) {
                    <div class="flex items-center gap-1">
                      <button
                        type="button"
                        (click)="openEditModal(s)"
                        [title]="'training.editSession' | translate"
                        class="grid size-8 place-items-center rounded-lg text-muted hover:bg-app hover:text-ink cursor-pointer">
                        <tf-icon name="sliders" [size]="14" />
                      </button>
                      <button
                        type="button"
                        (click)="deleteSession(s)"
                        [title]="'training.deleteSession' | translate"
                        class="grid size-8 place-items-center rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 cursor-pointer">
                        <tf-icon name="trash" [size]="14" />
                      </button>
                    </div>
                  }
                </div>

                <!-- Référence et Titre -->
                <div>
                  <p class="font-mono text-xs font-semibold text-brand-600 dark:text-brand-400">
                    {{ s.reference }}
                  </p>
                  <h3 class="text-sm sm:text-base font-semibold text-ink line-clamp-2 mt-0.5">
                    {{ s.title }}
                  </h3>
                </div>

                <!-- Description succincte -->
                @if (s.description) {
                  <p class="text-xs text-muted line-clamp-2">
                    {{ s.description }}
                  </p>
                }

                <!-- Informations pratiques (Dates, Horaires, Lieu) -->
                <div class="space-y-1.5 border-t border-border/70 pt-2 text-xs text-muted">
                  <div class="flex items-center gap-2">
                    <tf-icon name="calendar" [size]="14" class="text-muted/70" />
                    <span>{{ formatDateRange(s.startDate, s.endDate) }}</span>
                  </div>

                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <tf-icon name="clock" [size]="14" class="text-muted/70" />
                      <span>{{ s.durationHours }} {{ 'common.hours' | translate }}</span>
                    </div>

                    @if (s.location) {
                      <span class="truncate max-w-[180px] text-[11px]" [title]="s.location">
                        {{ s.location }}
                      </span>
                    }
                  </div>

                  <!-- Formateur -->
                  <div class="flex items-center gap-2 pt-1">
                    <tf-icon name="graduation" [size]="14" class="text-brand-600 dark:text-brand-400" />
                    <span class="text-ink font-medium text-[11px]">
                      {{ s.trainerDisplayName || ('training.noTrainer' | translate) }}
                    </span>
                  </div>
                </div>

                <!-- Jauge de remplissage -->
                <div class="space-y-1 pt-1">
                  <div class="flex items-center justify-between text-[11px]">
                    <span class="text-muted font-mono">
                      {{ 'training.participantsCount' | translate:capacityParams(s) }}
                    </span>
                    @if (s.registeredCount >= s.maxParticipants) {
                      <span class="rounded bg-rose-100 dark:bg-rose-950 px-1.5 py-0.2 text-[10px] font-semibold text-rose-700 dark:text-rose-300">
                        {{ 'training.fullBadge' | translate }}
                      </span>
                    }
                  </div>
                  <div class="h-1.5 w-full overflow-hidden rounded-full bg-border">
                    <div
                      class="h-full transition-all duration-300 rounded-full"
                      [class.bg-brand-600]="s.registeredCount < s.maxParticipants"
                      [class.bg-rose-500]="s.registeredCount >= s.maxParticipants"
                      [style.width.%]="calcPercentage(s.registeredCount, s.maxParticipants)"></div>
                  </div>
                </div>
              </div>

              <!-- Bas de carte : Boutons d'inscription & Liste des inscrits -->
              <div class="flex items-center justify-between gap-2 border-t border-border pt-4 mt-4">
                <button
                  type="button"
                  (click)="openParticipantsModal(s)"
                  class="inline-flex items-center gap-1.5 rounded-xl border border-border bg-app px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-border/40 cursor-pointer">
                  <tf-icon name="users" [size]="14" />
                  <span>{{ 'training.viewParticipants' | translate }}</span>
                  <span class="font-mono font-semibold">({{ s.registeredCount }})</span>
                </button>

                <div class="flex items-center gap-2">
                  @if (s.isCurrentUserRegistered) {
                    <span class="rounded-lg bg-emerald-50 dark:bg-emerald-950/60 px-2 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                      {{ 'training.registeredBadge' | translate }}
                    </span>
                    <button
                      type="button"
                      [disabled]="actionBusy()"
                      (click)="unregisterSelf(s)"
                      class="rounded-xl border border-border px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition cursor-pointer">
                      {{ 'training.unregisterMe' | translate }}
                    </button>
                  } @else if (canRegister(s)) {
                    <button
                      type="button"
                      [disabled]="actionBusy() || s.registeredCount >= s.maxParticipants"
                      (click)="registerSelf(s)"
                      class="rounded-xl bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-700 transition disabled:opacity-50 cursor-pointer">
                      {{ 'training.registerMe' | translate }}
                    </button>
                  }
                </div>
              </div>
            </div>
          }
        </div>
      }

      <!-- Modale de Création / Modification d'une session -->
      @if (showFormModal()) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="editingSession() ? ('training.editSession' | translate) : ('training.createSession' | translate)">
          <div class="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-border bg-surface shadow-2xl text-ink overflow-hidden">
            <div class="flex items-center justify-between border-b border-border p-4 sm:p-5">
              <h2 class="text-base sm:text-lg font-semibold text-ink">
                {{ editingSession() ? ('training.editSession' | translate) : ('training.createSession' | translate) }}
              </h2>
              <button
                type="button"
                (click)="closeFormModal()"
                class="grid size-9 place-items-center rounded-lg text-muted transition hover:bg-app hover:text-ink cursor-pointer"
                [attr.aria-label]="'common.close' | translate">
                <tf-icon name="x" [size]="18" />
              </button>
            </div>

            <div class="flex-1 overflow-y-auto p-4 sm:p-6">
              <tf-training-form
                [session]="editingSession()"
                [users]="availableUsers()"
                [busy]="formBusy()"
                (saved)="handleSaveSession($event)"
                (cancelled)="closeFormModal()" />
            </div>
          </div>
        </div>
      }

      <!-- Modale des Participants -->
      @if (activeParticipantsSession()) {
        <tf-training-participants-modal
          [session]="activeParticipantsSession()!"
          [users]="availableUsers()"
          [canManage]="canManage()"
          [canUpdateStatus]="canUpdateStatus(activeParticipantsSession()!)"
          [busy]="actionBusy()"
          (close)="activeParticipantsSession.set(null)"
          (addParticipant)="handleAddParticipant($event)"
          (removeParticipant)="handleRemoveParticipant($event)"
          (updateStatus)="handleUpdateParticipantStatus($event)" />
      }
    </div>
  `
})
export class TrainingPageComponent implements OnInit {
  protected readonly i18n = inject(I18nService);
  private readonly trainingService = inject(TrainingService);
  private readonly authService = inject(AuthService);

  readonly sessions = signal<TrainingSession[]>([]);
  readonly kpis = signal<TrainingKpi | null>(null);
  readonly availableUsers = signal<TrainingUser[]>([]);
  readonly loading = signal(false);
  readonly actionBusy = signal(false);
  readonly formBusy = signal(false);
  readonly feedback = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filtres
  readonly searchQuery = signal('');
  readonly filterStatus = signal('');
  readonly filterCategory = signal('');
  readonly filterModality = signal('');
  readonly onlyMine = signal(false);

  // Modales
  readonly showFormModal = signal(false);
  readonly editingSession = signal<TrainingSession | null>(null);
  readonly activeParticipantsSession = signal<TrainingSession | null>(null);

  readonly currentUser = computed(() => this.authService.currentUser());

  readonly canManage = computed(() => {
    const role = this.currentUser()?.role;
    return role === 'ADMIN' || role === 'DIRECTION';
  });

  readonly filteredSessions = computed(() => {
    let result = this.sessions();
    const query = this.searchQuery().trim().toLowerCase();
    const status = this.filterStatus();
    const category = this.filterCategory();
    const modality = this.filterModality();
    const mine = this.onlyMine();

    if (query) {
      result = result.filter(s =>
        s.title.toLowerCase().includes(query) ||
        s.reference.toLowerCase().includes(query) ||
        (s.trainerDisplayName && s.trainerDisplayName.toLowerCase().includes(query))
      );
    }

    if (status) {
      result = result.filter(s => s.status === status);
    }

    if (category) {
      result = result.filter(s => s.category === category);
    }

    if (modality) {
      result = result.filter(s => s.deliveryMode === modality);
    }

    if (mine) {
      result = result.filter(s => s.isCurrentUserRegistered || s.isCurrentUserTrainer);
    }

    return result;
  });

  ngOnInit() {
    this.reload();
    this.loadUsers();
  }

  reload() {
    this.loading.set(true);
    this.trainingService.list().subscribe({
      next: (list) => {
        this.sessions.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.feedback.set({ type: 'error', text: this.i18n.t('common.error') });
      }
    });

    this.trainingService.getKpis().subscribe({
      next: (kpis) => this.kpis.set(kpis),
      error: () => {}
    });
  }

  loadUsers() {
    this.trainingService.getUsers().subscribe({
      next: (users) => this.availableUsers.set(users),
      error: () => {}
    });
  }

  applyFilters() {
    // computed updates automatically
  }

  toggleOnlyMine() {
    this.onlyMine.set(!this.onlyMine());
  }

  canRegister(s: TrainingSession): boolean {
    return s.status === 'PLANNED' || s.status === 'IN_PROGRESS';
  }

  canUpdateStatus(s: TrainingSession): boolean {
    if (this.canManage()) return true;
    return s.isCurrentUserTrainer;
  }

  capacityParams(s: TrainingSession) {
    return {
      count: String(s.registeredCount),
      max: String(s.maxParticipants)
    };
  }

  calcPercentage(count: number, max: number): number {
    if (!max || max <= 0) return 0;
    return Math.min(100, Math.round((count / max) * 100));
  }

  formatDateRange(startIso: string, endIso: string): string {
    const s = this.i18n.formatDate(startIso);
    const e = this.i18n.formatDate(endIso);
    return s === e ? s : `${s} → ${e}`;
  }

  openCreateModal() {
    this.loadUsers();
    this.editingSession.set(null);
    this.showFormModal.set(true);
  }

  openEditModal(s: TrainingSession) {
    this.loadUsers();
    this.editingSession.set(s);
    this.showFormModal.set(true);
  }

  closeFormModal() {
    this.showFormModal.set(false);
    this.editingSession.set(null);
  }

  openParticipantsModal(s: TrainingSession) {
    this.loadUsers();
    this.trainingService.get(s.id).subscribe({
      next: (full) => this.activeParticipantsSession.set(full),
      error: () => this.activeParticipantsSession.set(s)
    });
  }

  handleSaveSession(data: TrainingFormData) {
    this.formBusy.set(true);
    const s = this.editingSession();
    const req = s
      ? this.trainingService.update(s.id, data)
      : this.trainingService.create(data);

    req.subscribe({
      next: () => {
        this.formBusy.set(false);
        this.closeFormModal();
        this.reload();
        this.feedback.set({ type: 'success', text: this.i18n.t('common.success') });
      },
      error: () => {
        this.formBusy.set(false);
        this.feedback.set({ type: 'error', text: this.i18n.t('common.error') });
      }
    });
  }

  deleteSession(s: TrainingSession) {
    if (!confirm(this.i18n.t('training.deleteConfirm'))) return;

    this.actionBusy.set(true);
    this.trainingService.delete(s.id).subscribe({
      next: () => {
        this.actionBusy.set(false);
        this.reload();
        this.feedback.set({ type: 'success', text: this.i18n.t('common.success') });
      },
      error: () => {
        this.actionBusy.set(false);
        this.feedback.set({ type: 'error', text: this.i18n.t('common.error') });
      }
    });
  }

  registerSelf(s: TrainingSession) {
    this.actionBusy.set(true);
    this.trainingService.register(s.id).subscribe({
      next: () => {
        this.actionBusy.set(false);
        this.reload();
        this.feedback.set({ type: 'success', text: this.i18n.t('common.success') });
      },
      error: () => {
        this.actionBusy.set(false);
        this.feedback.set({ type: 'error', text: this.i18n.t('common.error') });
      }
    });
  }

  unregisterSelf(s: TrainingSession) {
    if (!confirm(this.i18n.t('training.unregisterConfirm'))) return;

    const myId = this.currentUser()?.id;
    if (!myId) return;

    this.actionBusy.set(true);
    this.trainingService.unregister(s.id, myId).subscribe({
      next: () => {
        this.actionBusy.set(false);
        this.reload();
        this.feedback.set({ type: 'success', text: this.i18n.t('common.success') });
      },
      error: () => {
        this.actionBusy.set(false);
        this.feedback.set({ type: 'error', text: this.i18n.t('common.error') });
      }
    });
  }

  handleAddParticipant(userId: string) {
    const s = this.activeParticipantsSession();
    if (!s) return;

    this.actionBusy.set(true);
    this.trainingService.register(s.id, userId).subscribe({
      next: () => {
        this.actionBusy.set(false);
        this.trainingService.get(s.id).subscribe(updated => {
          this.activeParticipantsSession.set(updated);
          this.reload();
        });
      },
      error: () => {
        this.actionBusy.set(false);
        this.feedback.set({ type: 'error', text: this.i18n.t('common.error') });
      }
    });
  }

  handleRemoveParticipant(userId: string) {
    const s = this.activeParticipantsSession();
    if (!s) return;

    this.actionBusy.set(true);
    this.trainingService.unregister(s.id, userId).subscribe({
      next: () => {
        this.actionBusy.set(false);
        this.trainingService.get(s.id).subscribe(updated => {
          this.activeParticipantsSession.set(updated);
          this.reload();
        });
      },
      error: () => {
        this.actionBusy.set(false);
        this.feedback.set({ type: 'error', text: this.i18n.t('common.error') });
      }
    });
  }

  handleUpdateParticipantStatus(event: { userId: string; status: ParticipantStatus }) {
    const s = this.activeParticipantsSession();
    if (!s) return;

    this.actionBusy.set(true);
    this.trainingService.updateParticipantStatus(s.id, event.userId, event.status).subscribe({
      next: () => {
        this.actionBusy.set(false);
        this.trainingService.get(s.id).subscribe(updated => {
          this.activeParticipantsSession.set(updated);
          this.reload();
        });
      },
      error: () => {
        this.actionBusy.set(false);
        this.feedback.set({ type: 'error', text: this.i18n.t('common.error') });
      }
    });
  }
}
