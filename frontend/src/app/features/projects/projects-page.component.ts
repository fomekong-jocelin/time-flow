import { I18nService } from '../../core/i18n/i18n.service';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/auth/auth.service';
import { IconComponent } from '../../shared/ui/icon.component';
import { Integration, Project, ProjectService } from './project.service';
import { ProjectExcelComponent } from './project-excel.component';

import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'tf-projects-page',
  imports: [ FormsModule, IconComponent, ProjectExcelComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <div class="flex items-center gap-2 text-sm font-medium text-brand-600">
          <span>TimeFlow</span>
          <span class="text-muted">/</span>
          <span>{{ 'nav.projects' | translate }}</span>
        </div>
        <h1 class="mt-1 text-3xl font-semibold tracking-tight">{{ 'projects.title' | translate }}</h1>
        <p class="mt-2 text-sm text-muted">{{ 'projects.subtitle' | translate }}</p>
      </div>
      @if (isAdmin()) {
        <button type="button" (click)="synchronize()" [disabled]="syncing() || !integration()?.configured"
          class="min-h-11 rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60">
          {{ syncing() ? ('common.loading' | translate) : ('projects.syncAzure' | translate) }}
        </button>
      }
    </header>
    @if (isAdmin()) {
      <tf-project-excel (imported)="load()" />
      <section class="mb-6 rounded-xl border border-border bg-surface p-4 text-sm" aria-label="Synchronisation Azure DevOps">
        <div class="flex flex-wrap items-center gap-3">
          <span class="rounded-md bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-800 dark:bg-brand-950/60 dark:text-brand-300">ADO</span>
          <span class="font-medium">Azure DevOps</span>
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
    <section class="overflow-hidden rounded-xl border border-border bg-surface" [attr.aria-label]="'projects.title' | translate" [attr.aria-busy]="loading()">
      <div class="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-end">
        <div class="flex-1">
          <label for="project-search" class="mb-2 block text-sm font-medium">{{ 'common.search' | translate }}</label>
          <input id="project-search" type="search" maxlength="255" [ngModel]="query()" (ngModelChange)="query.set($event)"
            [placeholder]="'projects.searchPlaceholder' | translate" class="min-h-11 w-full rounded-xl border border-border bg-app px-3 text-sm focus:outline-brand-600" />
        </div>
        <div>
          <label for="project-status" class="mb-2 block text-sm font-medium">{{ 'common.status' | translate }}</label>
          <select id="project-status" [ngModel]="filter()" (ngModelChange)="filter.set($event)"
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
          <button type="button" (click)="load()" class="mt-4 min-h-11 rounded-xl border border-border px-5 text-sm font-medium">{{ 'common.retry' | translate }}</button>
        </div>
      } @else if (visibleProjects().length === 0) {
        <div class="flex flex-col items-center px-6 py-16 text-center">
          <span class="mb-4 rounded-2xl bg-brand-50 p-4 text-brand-800"><tf-icon name="folder" [size]="28" /></span>
          <h2 class="text-lg font-semibold">{{ (projects().length ? 'projects.noMatch' : 'projects.emptyCatalogue') | translate }}</h2>
          <p class="mt-2 max-w-md text-sm text-muted">{{ (projects().length ? 'projects.noMatchSub' : 'projects.emptyCatalogueSub') | translate }}</p>
        </div>
      } @else {
        <ul class="divide-y divide-border">
          @for (project of visibleProjects(); track project.id) {
            <li class="flex flex-wrap items-center justify-between sm:justify-start gap-3 p-4 sm:gap-4 sm:p-5">
              <span class="hidden rounded-xl bg-brand-50 p-3 text-brand-800 sm:block"><tf-icon name="folder" /></span>
              <div class="min-w-0 flex-1 basis-40">
                <h2 class="break-words font-semibold">{{ project.name }}</h2>
                <p class="mt-1 text-sm text-muted">{{ project.source === 'EXCEL' ? project.reference : (project.organization || ('projects.internalProject' | translate)) }}</p>
              </div>
              <div class="flex items-center gap-2 flex-wrap">
                <span class="rounded-md border border-border px-2 py-1 text-xs text-muted">{{ project.source === 'AZURE_DEVOPS' ? 'ADO' : project.source === 'EXCEL' ? 'Excel' : ('projects.internalProject' | translate) }}</span>
                <span class="rounded-full px-3 py-1 text-xs font-medium" [class]="project.active ? 'bg-success-50 text-success-700' : 'bg-app text-muted'">{{ (project.active ? 'projects.available' : 'projects.unavailable') | translate }}</span>
                <span class="text-xs text-muted whitespace-nowrap sm:w-36 sm:text-sm">{{ (project.billableDefault ? 'projects.billableByDefault' : 'projects.nonBillable') | translate }}</span>
              </div>
            </li>
          }
        </ul>
        <p class="border-t border-border px-5 py-3 text-xs text-muted" aria-live="polite">{{ 'projects.projectsDisplayed' | translate:{ count: visibleProjects().length } }}</p>
      }
    </section>
  `
})
export class ProjectsPageComponent {
  readonly i18n = inject(I18nService);
  private readonly api = inject(ProjectService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  readonly isAdmin = computed(() => this.auth.currentUser()?.role === 'ADMIN');
  readonly projects = signal<Project[]>([]);
  readonly integration = signal<Integration | null>(null);
  readonly integrationError = signal(false);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly syncing = signal(false);
  readonly syncMessage = this.i18n.messageSignal('');
  readonly query = signal('');
  readonly filter = signal('active');
  readonly visibleProjects = computed(() => {
    const query = this.query().trim().toLocaleLowerCase('fr');
    return this.projects().filter(project =>
      (this.filter() === 'all' || project.active === (this.filter() === 'active')) &&
      `${project.name} ${project.organization ?? ''} ${project.reference ?? ''}`.toLocaleLowerCase('fr').includes(query));
  });
  constructor() { this.load(); this.loadIntegration(); }
  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.api.list().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: projects => { this.projects.set(projects); this.loading.set(false); },
      error: () => { this.error.set(true); this.loading.set(false); }
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
        this.load(); this.loadIntegration();
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
      next: integration => { this.integration.set(integration); this.integrationError.set(false); },
      error: () => this.integrationError.set(true)
    });
  }
}
