import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/auth/auth.service';
import { IconComponent } from '../../shared/ui/icon.component';
import { Integration, Project, ProjectService } from './project.service';
import { ProjectExcelComponent } from './project-excel.component';

@Component({
  selector: 'tf-projects-page',
  imports: [DatePipe, FormsModule, IconComponent, ProjectExcelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <p class="mb-2 text-sm font-medium text-muted">Votre espace de travail</p>
        <h1 class="text-3xl font-semibold tracking-tight">Projets</h1>
        <p class="mt-2 text-sm text-muted">Retrouvez les projets de vos missions et leur disponibilité.</p>
      </div>
      @if (isAdmin()) {
        <button type="button" (click)="synchronize()" [disabled]="syncing() || !integration()?.configured"
          class="min-h-11 rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60">
          {{ syncing() ? 'Synchronisation en cours…' : 'Synchroniser les projets' }}
        </button>
      }
    </header>
    @if (isAdmin()) {
      <tf-project-excel (imported)="load()" />
      <section class="mb-6 rounded-xl border border-border bg-surface p-4 text-sm" aria-label="Synchronisation Azure DevOps">
        <div class="flex flex-wrap items-center gap-3">
          <span class="rounded-md bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-800">ADO</span>
          <span class="font-medium">Azure DevOps</span>
          @if (integration(); as integration) {
            @if (!integration.configured) {
              <span class="text-muted">Connexion à configurer par votre administrateur.</span>
            } @else if (integration.latestRun; as run) {
              <span class="text-muted">Dernière tentative : {{ run.startedAt | date:'dd/MM/yyyy HH:mm' }} ·
                {{ run.status === 'SUCCESS' ? 'Réussie' : run.status === 'FAILED' ? 'Échec' : 'En cours' }}</span>
            } @else { <span class="text-muted">Prêt pour la première synchronisation.</span> }
          } @else {
            <span class="text-muted">{{ integrationError() ? 'État de la connexion indisponible.' : 'Vérification de la connexion…' }}</span>
          }
        </div>
        @if (syncMessage()) { <p class="mt-3 text-muted" role="status">{{ syncMessage() }}</p> }
      </section>
    }
    <section class="overflow-hidden rounded-xl border border-border bg-surface" aria-label="Catalogue des projets" [attr.aria-busy]="loading()">
      <div class="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-end">
        <div class="flex-1">
          <label for="project-search" class="mb-2 block text-sm font-medium">Rechercher un projet</label>
          <input id="project-search" type="search" maxlength="255" [ngModel]="query()" (ngModelChange)="query.set($event)"
            placeholder="Nom du projet ou organisation" class="min-h-11 w-full rounded-xl border border-border bg-app px-3 text-sm focus:outline-brand-600" />
        </div>
        <div>
          <label for="project-status" class="mb-2 block text-sm font-medium">Disponibilité</label>
          <select id="project-status" [ngModel]="filter()" (ngModelChange)="filter.set($event)"
            class="min-h-11 w-full rounded-xl border border-border bg-app px-3 text-sm sm:w-48">
            <option value="active">Actifs</option><option value="archived">Indisponibles</option><option value="all">Tous les projets</option>
          </select>
        </div>
      </div>
      @if (loading()) {
        <p class="p-12 text-center text-muted" role="status">Chargement des projets…</p>
      } @else if (error()) {
        <div class="p-12 text-center" role="alert">
          <p>Impossible de charger les projets.</p>
          <button type="button" (click)="load()" class="mt-4 min-h-11 rounded-xl border border-border px-5 text-sm font-medium">Réessayer</button>
        </div>
      } @else if (visibleProjects().length === 0) {
        <div class="flex flex-col items-center px-6 py-16 text-center">
          <span class="mb-4 rounded-2xl bg-brand-50 p-4 text-brand-800"><tf-icon name="folder" [size]="28" /></span>
          <h2 class="text-lg font-semibold">{{ projects().length ? 'Aucun projet ne correspond' : 'Vos projets apparaîtront ici' }}</h2>
          <p class="mt-2 max-w-md text-sm text-muted">{{ projects().length ? 'Essayez un autre nom ou modifiez la disponibilité.' : 'Importez un fichier Excel ou synchronisez Azure DevOps pour retrouver les projets de vos missions.' }}</p>
        </div>
      } @else {
        <ul class="divide-y divide-border">
          @for (project of visibleProjects(); track project.id) {
            <li class="flex flex-wrap items-center gap-4 p-5">
              <span class="hidden rounded-xl bg-brand-50 p-3 text-brand-800 sm:block"><tf-icon name="folder" /></span>
              <div class="min-w-0 flex-1 basis-40">
                <h2 class="break-words font-semibold">{{ project.name }}</h2>
                <p class="mt-1 text-sm text-muted">{{ project.source === 'EXCEL' ? project.reference : (project.organization || 'Projet interne') }}</p>
              </div>
              <span class="rounded-md border border-border px-2 py-1 text-xs text-muted">{{ project.source === 'AZURE_DEVOPS' ? 'ADO' : project.source === 'EXCEL' ? 'Excel' : 'Interne' }}</span>
              <span class="rounded-full px-3 py-1 text-xs font-medium" [class]="project.active ? 'bg-success-50 text-success-700' : 'bg-app text-muted'">{{ project.active ? 'Actif' : 'Indisponible' }}</span>
              <span class="w-32 text-sm text-muted">{{ project.billableDefault ? 'Facturable par défaut' : 'Non facturable' }}</span>
            </li>
          }
        </ul>
        <p class="border-t border-border px-5 py-3 text-xs text-muted" aria-live="polite">{{ visibleProjects().length }} projet(s) affiché(s)</p>
      }
    </section>
  `
})
export class ProjectsPageComponent {
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
  readonly syncMessage = signal('');
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
        this.syncMessage.set(`Synchronisation réussie : ${result.importedCount} projet(s) traité(s).`);
        this.load(); this.loadIntegration();
      },
      error: () => {
        this.syncing.set(false);
        this.syncMessage.set('Synchronisation impossible. Vérifiez la connexion Azure DevOps puis réessayez.');
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
