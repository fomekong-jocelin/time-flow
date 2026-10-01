import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/auth/auth.service';
import { IconComponent } from '../../shared/ui/icon.component';
import { ManagedUser, NewUser, problemMessage, ROLE_OPTIONS, UserAdminService } from './user-admin.service';
import { UserFormComponent } from './user-form.component';
import { UserAccountActionsComponent } from './user-account-actions.component';

type Panel = { mode: 'create' } | { mode: 'edit'; id: string } | null;
const ROLE_LABELS = Object.fromEntries(ROLE_OPTIONS.map(option => [option.value, option.label]));

@Component({
  selector: 'tf-users-page',
  imports: [DatePipe, FormsModule, IconComponent, UserFormComponent, UserAccountActionsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <p class="mb-2 text-sm font-medium text-muted">Administration</p>
        <h1 class="text-3xl font-semibold tracking-tight">Utilisateurs</h1>
        <p class="mt-2 text-sm text-muted">Comptes SSO Microsoft et comptes locaux, rôles, managers et temps théorique.</p>
      </div>
      <button type="button" (click)="openCreate()" class="flex min-h-11 items-center gap-2 rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700">
        <tf-icon name="plus" [size]="18" /> Nouvel utilisateur
      </button>
    </header>

    <div class="grid gap-6 xl:grid-cols-[1fr_28rem]">
      <section class="min-w-0 overflow-hidden rounded-xl border border-border bg-surface" aria-label="Liste des utilisateurs" [attr.aria-busy]="loading()">
        <div class="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-end">
          <div class="flex-1">
            <label for="user-search" class="mb-2 block text-sm font-medium">Rechercher</label>
            <input id="user-search" type="search" maxlength="320" [ngModel]="query()" (ngModelChange)="query.set($event)"
              placeholder="Nom ou email" class="min-h-11 w-full rounded-xl border border-border bg-app px-3 text-sm" />
          </div>
          <div>
            <label for="user-type" class="mb-2 block text-sm font-medium">Connexion</label>
            <select id="user-type" [ngModel]="typeFilter()" (ngModelChange)="typeFilter.set($event)" class="min-h-11 w-full rounded-xl border border-border bg-app px-3 text-sm sm:w-40">
              <option value="all">Toutes</option><option value="SSO">SSO Microsoft</option><option value="LOCAL">Compte local</option>
            </select>
          </div>
          <div>
            <label for="user-status" class="mb-2 block text-sm font-medium">Statut</label>
            <select id="user-status" [ngModel]="statusFilter()" (ngModelChange)="statusFilter.set($event)" class="min-h-11 w-full rounded-xl border border-border bg-app px-3 text-sm sm:w-36">
              <option value="active">Actifs</option><option value="inactive">Désactivés</option><option value="all">Tous</option>
            </select>
          </div>
        </div>
        @if (loading()) {
          <p class="p-12 text-center text-muted" role="status">Chargement des utilisateurs…</p>
        } @else if (error()) {
          <div class="p-12 text-center" role="alert">
            <p>Impossible de charger les utilisateurs.</p>
            <button type="button" (click)="load()" class="mt-4 min-h-11 rounded-xl border border-border px-5 text-sm font-medium">Réessayer</button>
          </div>
        } @else if (visibleUsers().length === 0) {
          <p class="p-12 text-center text-sm text-muted">Aucun utilisateur ne correspond à ces critères.</p>
        } @else {
          <ul class="divide-y divide-border">
            @for (user of visibleUsers(); track user.id) {
              <li>
                <button type="button" (click)="openEdit(user.id)" [attr.aria-current]="selectedId() === user.id ? 'true' : null"
                  class="flex w-full flex-wrap items-center gap-3 p-4 text-left transition hover:bg-app sm:px-5" [class.bg-app]="selectedId() === user.id">
                  <span class="grid size-10 shrink-0 place-items-center rounded-full bg-brand-50 text-sm font-semibold text-brand-800" aria-hidden="true">{{ initials(user.displayName) }}</span>
                  <span class="min-w-0 flex-1 basis-48">
                    <span class="block truncate font-medium">{{ user.displayName }}</span>
                    <span class="block truncate text-sm text-muted">{{ user.email }}</span>
                  </span>
                  <span class="rounded-md border border-border px-2 py-1 text-xs text-muted">{{ user.accountType === 'SSO' ? 'SSO' : 'Local' }}</span>
                  <span class="w-28 text-sm">{{ roleLabel(user.role) }}</span>
                  <span class="hidden w-36 truncate text-sm text-muted md:block">{{ user.managerName ?? 'Sans manager' }}</span>
                  <span class="rounded-full px-3 py-1 text-xs font-medium" [class]="statusClass(user)">{{ statusLabel(user) }}</span>
                  <span class="hidden w-28 text-right text-xs text-muted lg:block">{{ user.lastLoginAt ? (user.lastLoginAt | date:'dd/MM/yyyy') : 'Jamais connecté' }}</span>
                </button>
              </li>
            }
          </ul>
          <p class="border-t border-border px-5 py-3 text-xs text-muted" aria-live="polite">{{ visibleUsers().length }} utilisateur(s) affiché(s)</p>
        }
      </section>

      @if (panel(); as current) {
        <aside class="h-fit rounded-xl border border-border bg-surface p-5 xl:sticky xl:top-6" aria-labelledby="user-panel-title">
          <h2 id="user-panel-title" class="mb-4 text-lg font-semibold">{{ current.mode === 'create' ? 'Nouvel utilisateur' : selectedUser()?.displayName }}</h2>
          @if (current.mode === 'edit' && selectedUser(); as user) {
            <p class="mb-4 break-all text-sm text-muted">{{ user.email }}</p>
            @for (editing of [user]; track editing.id) {
              <tf-user-form [user]="user" [users]="users()" [busy]="saving()" (saved)="save($event)" (cancelled)="close()" />
              <tf-user-account-actions [user]="user" [currentUserId]="currentUserId()" (changed)="load()" />
            }
          } @else if (current.mode === 'create') {
            <tf-user-form [users]="users()" [busy]="saving()" (saved)="save($event)" (cancelled)="close()" />
          }
          @if (panelError()) { <p class="mt-4 text-sm text-error" role="alert">{{ panelError() }}</p> }
        </aside>
      }
    </div>
    @if (notice()) { <p class="mt-4 text-sm text-muted" role="status">{{ notice() }}</p> }
  `
})
export class UsersPageComponent {
  private readonly api = inject(UserAdminService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthService);
  readonly currentUserId = computed(() => this.auth.currentUser()?.id ?? null);

  readonly users = signal<ManagedUser[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly saving = signal(false);
  readonly panel = signal<Panel>(null);
  readonly panelError = signal('');
  readonly notice = signal('');
  readonly query = signal('');
  readonly typeFilter = signal('all');
  readonly statusFilter = signal('active');

  readonly selectedId = computed(() => { const panel = this.panel(); return panel?.mode === 'edit' ? panel.id : null; });
  readonly selectedUser = computed(() => this.users().find(user => user.id === this.selectedId()) ?? null);
  readonly visibleUsers = computed(() => {
    const query = this.query().trim().toLocaleLowerCase('fr');
    return this.users().filter(user =>
      (this.typeFilter() === 'all' || user.accountType === this.typeFilter()) &&
      (this.statusFilter() === 'all' || user.active === (this.statusFilter() === 'active')) &&
      `${user.displayName} ${user.email}`.toLocaleLowerCase('fr').includes(query));
  });

  constructor() { this.load(); }

  load(): void {
    this.error.set(false);
    this.api.list().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: users => { this.users.set(users); this.loading.set(false); },
      error: () => { this.error.set(true); this.loading.set(false); }
    });
  }

  openCreate(): void { this.panel.set({ mode: 'create' }); this.panelError.set(''); this.notice.set(''); }
  openEdit(id: string): void { this.panel.set({ mode: 'edit', id }); this.panelError.set(''); this.notice.set(''); }
  close(): void { this.panel.set(null); this.panelError.set(''); }

  save(value: NewUser): void {
    const panel = this.panel();
    if (!panel || this.saving()) return;
    const { displayName, role, managerId, weeklyTargetMinutes } = value;
    const request = panel.mode === 'create'
      ? this.api.create(value)
      : this.api.update(panel.id, { displayName, role, managerId, weeklyTargetMinutes });
    this.saving.set(true);
    this.panelError.set('');
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        this.notice.set(panel.mode === 'create' ? `Compte créé pour ${value.email}.` : 'Modifications enregistrées.');
        if (panel.mode === 'create') this.close();
        this.load();
      },
      error: error => {
        this.saving.set(false);
        this.panelError.set(error?.status === 409 ? 'Un utilisateur utilise déjà cet email.' : problemMessage(error, 'Enregistrement impossible. Réessayez.'));
      }
    });
  }

  roleLabel(role: string): string { return ROLE_LABELS[role] ?? role; }

  statusLabel(user: ManagedUser): string {
    if (!user.active) return 'Désactivé';
    if (user.locked) return 'Verrouillé';
    return user.accountType === 'SSO' && !user.ssoLinked ? 'En attente' : 'Actif';
  }

  statusClass(user: ManagedUser): string {
    if (!user.active) return 'bg-app text-muted';
    if (user.locked || (user.accountType === 'SSO' && !user.ssoLinked)) return 'bg-warning/10 text-warning-700';
    return 'bg-success-50 text-success-700';
  }

  initials(name: string): string {
    return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join('') || '?';
  }
}
