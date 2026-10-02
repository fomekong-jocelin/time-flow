import { I18nService } from '../../core/i18n/i18n.service';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/auth/auth.service';
import { IconComponent } from '../../shared/ui/icon.component';
import { Integration, PRESET_CURRENCIES, Project, ProjectFormData, ProjectService } from './project.service';
import { ProjectExcelComponent } from './project-excel.component';
import { ProjectFormComponent } from './project-form.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

type ProjectPanel = { mode: 'create' } | { mode: 'edit'; id: string } | null;

@Component({
  selector: 'tf-projects-page',
  standalone: true,
  imports: [FormsModule, IconComponent, ProjectExcelComponent, ProjectFormComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <div class="flex items-center gap-2 text-sm font-medium text-brand-600 dark:text-brand-400">
          <span>TimeFlow</span>
          <span class="text-muted">/</span>
          <span>{{ 'nav.projects' | translate }}</span>
        </div>
        <h1 class="mt-1 text-3xl font-semibold tracking-tight text-ink">{{ 'projects.title' | translate }}</h1>
        <p class="mt-2 text-sm text-muted">{{ 'projects.subtitle' | translate }}</p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        @if (canManage()) {
          <button
            type="button"
            (click)="openCreate()"
            class="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white shadow-2xs transition hover:bg-brand-700 cursor-pointer">
            <tf-icon name="plus" [size]="16" />
            <span>{{ 'projects.newProject' | translate }}</span>
          </button>
        }
        @if (isAdmin()) {
          <button
            type="button"
            (click)="synchronize()"
            [disabled]="syncing() || !integration()?.configured"
            class="min-h-11 rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-ink shadow-2xs transition hover:bg-app disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer">
            {{ syncing() ? ('common.loading' | translate) : ('projects.syncAzure' | translate) }}
          </button>
        }
      </div>
    </header>

    @if (isAdmin()) {
      <tf-project-excel (imported)="load()" />
      <section class="mb-6 rounded-xl border border-border bg-surface p-4 text-sm" aria-label="Synchronisation Azure DevOps">
        <div class="flex flex-wrap items-center gap-3">
          <span class="rounded-md bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-800 dark:bg-brand-950/60 dark:text-brand-300">ADO</span>
          <span class="font-medium text-ink">Azure DevOps</span>
          @if (integration(); as integration) {
            @if (!integration.configured) {
              <span class="text-muted">{{ 'projects.adoCardNotice' | translate }}</span>
            } @else if (integration.latestRun; as run) {
              <span class="text-muted">{{ 'projects.latestRun' | translate:{ date: (i18n.formatDate(run.startedAt, true)), status: (run.status === 'SUCCESS' ? ('projects.statusSuccess' | translate) : run.status === 'FAILED' ? ('projects.statusFailed' | translate) : ('projects.statusRunning' | translate)) } }}</span>
            } @else { <span class="text-muted">{{ 'projects.readyToSync' | translate }}</span> }
          } @else {
            <span class="text-muted">{{ integrationError() ? ('projects.statusUnavailable' | translate) : ('projects.checkingConnection' | translate) }}</span>
          }
        </div>
        @if (syncMessage()) { <p class="mt-3 text-muted" role="status">{{ syncMessage() }}</p> }
      </section>
    }

    <div [class]="panel() ? 'grid gap-6 xl:grid-cols-[1fr_420px]' : ''">
      <section class="overflow-hidden rounded-xl border border-border bg-surface" [attr.aria-label]="'projects.title' | translate" [attr.aria-busy]="loading()">
        <div class="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-end">
          <div class="flex-1">
            <label for="project-search" class="mb-2 block text-sm font-medium text-ink">{{ 'common.search' | translate }}</label>
            <input
              id="project-search"
              type="search"
              maxlength="255"
              [ngModel]="query()"
              (ngModelChange)="query.set($event)"
              [placeholder]="'projects.searchPlaceholder' | translate"
              class="min-h-11 w-full rounded-xl border border-border bg-app px-3 text-sm focus:outline-brand-600" />
          </div>
          <div>
            <label for="project-status" class="mb-2 block text-sm font-medium text-ink">{{ 'common.status' | translate }}</label>
            <select
              id="project-status"
              [ngModel]="filter()"
              (ngModelChange)="filter.set($event)"
              class="min-h-11 w-full rounded-xl border border-border bg-app px-3 text-sm sm:w-48">
              <option value="active">{{ 'common.active' | translate }}</option>
              <option value="archived">{{ 'common.inactive' | translate }}</option>
              <option value="all">{{ 'common.all' | translate }}</option>
            </select>
          </div>
        </div>

        @if (loading()) {
          <p class="p-12 text-center text-muted" role="status">{{ 'projects.loadingProjects' | translate }}</p>
        } @else if (error()) {
          <div class="p-12 text-center" role="alert">
            <p>{{ 'projects.loadError' | translate }}</p>
            <button type="button" (click)="load()" class="mt-4 min-h-11 rounded-xl border border-border px-5 text-sm font-medium cursor-pointer">{{ 'common.retry' | translate }}</button>
          </div>
        } @else if (visibleProjects().length === 0) {
          <div class="flex flex-col items-center px-6 py-16 text-center">
            <span class="mb-4 rounded-2xl bg-brand-50 p-4 text-brand-800"><tf-icon name="folder" [size]="28" /></span>
            <h2 class="text-lg font-semibold text-ink">{{ (projects().length ? 'projects.noMatch' : 'projects.emptyCatalogue') | translate }}</h2>
            <p class="mt-2 max-w-md text-sm text-muted">{{ (projects().length ? 'projects.noMatchSub' : 'projects.emptyCatalogueSub') | translate }}</p>
          </div>
        } @else {
          <ul class="divide-y divide-border">
            @for (project of visibleProjects(); track project.id) {
              <li
                class="flex flex-wrap items-center justify-between gap-3 p-4 sm:gap-4 sm:p-5 transition hover:bg-app/50"
                [class.bg-brand-50/30]="selectedId() === project.id">
                <div class="flex items-start gap-3.5 min-w-0 flex-1 basis-60">
                  <span class="hidden rounded-xl bg-brand-50 p-3 text-brand-800 sm:block shrink-0"><tf-icon name="folder" /></span>
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2 flex-wrap">
                      <h2 class="break-words font-semibold text-ink">{{ project.name }}</h2>
                      @if (project.currency && project.currency !== 'EUR') {
                        <span class="rounded bg-app border border-border px-1.5 py-0.5 text-[10px] font-bold text-muted">
                          {{ project.currency }}
                        </span>
                      }
                    </div>
                    <p class="mt-0.5 text-xs text-muted">
                      {{ project.source === 'EXCEL' ? (project.reference || 'Excel') : (project.organization || ('projects.internalProject' | translate)) }}
                    </p>

                    <!-- Badges Financiers / Budget -->
                    @if (project.budgetDays != null || project.dailyRate != null || project.totalPrice != null) {
                      <div class="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        @if (project.budgetDays != null) {
                          <span class="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2 py-0.5 font-medium text-brand-800 dark:bg-brand-950/60 dark:text-brand-300">
                            <tf-icon name="calendar" [size]="12" />
                            <span>{{ 'projects.budgetBadge' | translate:{ days: project.budgetDays } }}</span>
                          </span>
                        }
                        @if (project.dailyRate != null) {
                          <span class="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 font-medium text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-mono">
                            <span>{{ 'projects.rateBadge' | translate:{ rate: formatRate(project.dailyRate, project.currency) } }}</span>
                          </span>
                        }
                        @if (project.totalPrice != null) {
                          <span class="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 font-medium text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 font-mono">
                            <span>{{ 'projects.totalBadge' | translate:{ total: formatCurrency(project.totalPrice, project.currency) } }}</span>
                          </span>
                        }
                      </div>
                    }
                  </div>
                </div>

                <div class="flex items-center gap-2 flex-wrap self-center">
                  <span class="rounded-md border border-border px-2 py-1 text-xs text-muted">
                    {{ project.source === 'AZURE_DEVOPS' ? 'ADO' : project.source === 'EXCEL' ? 'Excel' : ('projects.internalProject' | translate) }}
                  </span>
                  <span class="rounded-full px-3 py-1 text-xs font-medium" [class]="project.active ? 'bg-success-50 text-success-700' : 'bg-app text-muted'">
                    {{ (project.active ? 'projects.available' : 'projects.unavailable') | translate }}
                  </span>
                  <span class="text-xs text-muted whitespace-nowrap hidden md:inline">
                    {{ (project.billableDefault ? 'projects.billableByDefault' : 'projects.nonBillable') | translate }}
                  </span>

                  @if (canManage()) {
                    <button
                      type="button"
                      (click)="openEdit(project.id)"
                      class="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-brand-600 transition hover:bg-brand-50 hover:border-brand-300 cursor-pointer">
                      {{ 'common.edit' | translate }}
                    </button>
                  }
                </div>
              </li>
            }
          </ul>
          <p class="border-t border-border px-5 py-3 text-xs text-muted" aria-live="polite">
            {{ 'projects.projectsDisplayed' | translate:{ count: visibleProjects().length } }}
          </p>
        }
      </section>

      <!-- Panneau latéral de création / édition -->
      @if (panel(); as current) {
        <aside class="h-fit rounded-xl border border-border bg-surface p-5 xl:sticky xl:top-6 shadow-2xs" aria-labelledby="project-panel-title">
          <div class="mb-4 flex items-center justify-between border-b border-border pb-3">
            <h2 id="project-panel-title" class="text-lg font-semibold text-ink">
              {{ current.mode === 'create' ? ('projects.newProject' | translate) : ('projects.editProject' | translate) }}
            </h2>
            <button
              type="button"
              (click)="close()"
              class="rounded-lg p-1.5 text-muted transition hover:bg-app hover:text-ink cursor-pointer"
              [attr.aria-label]="'projects.closePanel' | translate">
              <tf-icon name="x" [size]="18" />
            </button>
          </div>

          @if (current.mode === 'edit' && selectedProject(); as proj) {
            @for (editing of [proj]; track editing.id) {
              <tf-project-form
                [project]="proj"
                [busy]="saving()"
                (saved)="save($event)"
                (cancelled)="close()" />
            }
          } @else if (current.mode === 'create') {
            <tf-project-form
              [busy]="saving()"
              (saved)="save($event)"
              (cancelled)="close()" />
          }

          @if (panelError()) {
            <p class="mt-4 text-xs text-error" role="alert">{{ panelError() }}</p>
          }
        </aside>
      }
    </div>

    @if (notice()) {
      <p class="mt-4 text-sm text-brand-700 font-medium" role="status">{{ notice() }}</p>
    }
  `
})
export class ProjectsPageComponent {
  readonly i18n = inject(I18nService);
  private readonly api = inject(ProjectService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly isAdmin = computed(() => this.auth.currentUser()?.role === 'ADMIN');
  readonly canManage = computed(() => {
    const role = this.auth.currentUser()?.role;
    return role === 'ADMIN' || role === 'DIRECTION';
  });

  readonly projects = signal<Project[]>([]);
  readonly integration = signal<Integration | null>(null);
  readonly integrationError = signal(false);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly syncing = signal(false);
  readonly syncMessage = this.i18n.messageSignal('');
  readonly query = signal('');
  readonly filter = signal('active');

  readonly panel = signal<ProjectPanel>(null);
  readonly saving = signal(false);
  readonly panelError = this.i18n.messageSignal('');
  readonly notice = this.i18n.messageSignal('');

  readonly selectedId = computed(() => {
    const p = this.panel();
    return p?.mode === 'edit' ? p.id : null;
  });

  readonly selectedProject = computed(() => this.projects().find(p => p.id === this.selectedId()) ?? null);

  readonly visibleProjects = computed(() => {
    const query = this.query().trim().toLocaleLowerCase('fr');
    return this.projects().filter(project =>
      (this.filter() === 'all' || project.active === (this.filter() === 'active')) &&
      `${project.name} ${project.organization ?? ''} ${project.reference ?? ''}`.toLocaleLowerCase('fr').includes(query));
  });

  constructor() {
    this.load();
    this.loadIntegration();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.api.list().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: projects => {
        this.projects.set(projects);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      }
    });
  }

  openCreate(): void {
    this.panel.set({ mode: 'create' });
    this.panelError.set('');
    this.notice.set('');
  }

  openEdit(id: string): void {
    this.panel.set({ mode: 'edit', id });
    this.panelError.set('');
    this.notice.set('');
  }

  close(): void {
    this.panel.set(null);
    this.panelError.set('');
  }

  save(data: ProjectFormData): void {
    const current = this.panel();
    if (!current || this.saving()) return;

    this.saving.set(true);
    this.panelError.set('');

    const request = current.mode === 'create'
      ? this.api.create(data)
      : this.api.update(current.id, data);

    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: savedProject => {
        this.saving.set(false);
        this.notice.set(() => current.mode === 'create'
          ? this.i18n.t('messages.projectCreated', { name: savedProject.name })
          : this.i18n.t('messages.projectUpdated', { name: savedProject.name }));
        this.close();
        this.load();
      },
      error: err => {
        this.saving.set(false);
        this.panelError.set(() => this.i18n.problem(err, this.i18n.t('messages.projectSaveFailed')));
      }
    });
  }

  synchronize(): void {
    if (this.syncing() || !this.integration()?.configured) return;
    this.syncing.set(true);
    this.syncMessage.set('');
    this.api.synchronize().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: result => {
        this.syncing.set(false);
        this.syncMessage.set(() => this.i18n.t('messages.syncSuccess', { count: result.importedCount }));
        this.load();
        this.loadIntegration();
      },
      error: () => {
        this.syncing.set(false);
        this.syncMessage.set(() => this.i18n.t('messages.syncFailed'));
        this.loadIntegration();
      }
    });
  }

  private loadIntegration(): void {
    if (!this.isAdmin()) return;
    this.api.integration().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: integration => {
        this.integration.set(integration);
        this.integrationError.set(false);
      },
      error: () => this.integrationError.set(true)
    });
  }

  formatCurrency(amount: number | null | undefined, currency = 'EUR'): string {
    if (amount === null || amount === undefined) return '-';
    const curr = (currency || 'EUR').trim().toUpperCase();
    try {
      return new Intl.NumberFormat(this.i18n.locale(), {
        style: 'currency',
        currency: curr,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }).format(amount);
    } catch {
      const symbol = PRESET_CURRENCIES.find(p => p.code === curr)?.symbol || curr;
      return `${this.i18n.formatNumber(amount)} ${symbol}`;
    }
  }

  formatRate(rate: number | null | undefined, currency = 'EUR'): string {
    if (rate === null || rate === undefined) return '-';
    return `${this.formatCurrency(rate, currency)}/j`;
  }
}
