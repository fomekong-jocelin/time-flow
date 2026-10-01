import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/auth/auth.service';
import { IconComponent } from '../../shared/ui/icon.component';
import { AvatarComponent } from '../../shared/ui/avatar.component';
import { KpiCardComponent } from '../../shared/ui/kpi-card.component';
import { ManagedUser, NewUser, problemMessage, ROLE_OPTIONS, UserAdminService } from './user-admin.service';
import { UserFormComponent } from './user-form.component';
import { UserAccountActionsComponent } from './user-account-actions.component';
import { WorkScheduleProfile } from '../work-schedules/work-schedule.models';
import { WorkScheduleService } from '../work-schedules/work-schedule.service';

type Panel = { mode: 'create' } | { mode: 'edit'; id: string } | null;
const ROLE_LABELS = Object.fromEntries(ROLE_OPTIONS.map(option => [option.value, option.label]));

@Component({
  selector: 'tf-users-page',
  imports: [DatePipe, FormsModule, IconComponent, AvatarComponent, KpiCardComponent, UserFormComponent, UserAccountActionsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="mb-1 text-sm font-medium text-muted">Administration</p>
        <h1 class="text-2xl font-bold tracking-tight text-ink sm:text-3xl">Utilisateurs</h1>
        <p class="mt-1 text-sm text-muted">Comptes SSO Microsoft et comptes locaux, rôles, managers et régimes horaires.</p>
      </div>
      <button type="button" (click)="openCreate()"
        class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white shadow-2xs transition hover:bg-brand-700 whitespace-nowrap">
        <tf-icon name="plus" [size]="18" /> Nouvel utilisateur
      </button>
    </header>

    <!-- Cartes synthétiques KPI réutilisables -->
    <section class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
      <tf-kpi-card
        label="Total des utilisateurs"
        [value]="users().length"
        [description]="activeCount() + ' actif(s) · ' + (users().length - activeCount()) + ' inactif(s)'" />
      <tf-kpi-card
        label="Comptes SSO / Locaux"
        [value]="ssoCount() + ' SSO · ' + localCount() + ' Locaux'"
        variant="brand"
        description="Microsoft Entra ID & comptes internes" />
      <tf-kpi-card
        label="Régimes horaires assignés"
        [value]="assignedSchedulesCount()"
        [description]="'Sur ' + users().length + ' utilisateur(s)'" />
    </section>

    <!-- Grille adaptative : 1 colonne pleine largeur par défaut, 2 colonnes avec sticky aside si panneau ouvert -->
    <div class="grid gap-6 items-start" [class.xl:grid-cols-[minmax(0,1fr)_28rem]]="panel() !== null">
      <section class="min-w-0 overflow-hidden rounded-xl border border-border bg-surface shadow-2xs" aria-label="Liste des utilisateurs" [attr.aria-busy]="loading()">
        <!-- Filtres et recherche -->
        <div class="flex flex-col gap-4 border-b border-border p-4 sm:p-5 sm:flex-row sm:items-end">
          <div class="flex-1">
            <label for="user-search" class="mb-1.5 block text-sm font-medium">Rechercher</label>
            <input id="user-search" type="search" maxlength="320" [ngModel]="query()" (ngModelChange)="query.set($event)"
              placeholder="Nom ou email..." class="min-h-11 w-full rounded-xl border border-border bg-app px-3.5 text-sm" />
          </div>
          <div>
            <label for="user-type" class="mb-1.5 block text-sm font-medium whitespace-nowrap">Connexion</label>
            <select id="user-type" [ngModel]="typeFilter()" (ngModelChange)="typeFilter.set($event)" class="min-h-11 w-full rounded-xl border border-border bg-app px-3 text-sm sm:w-44">
              <option value="all">Toutes</option>
              <option value="SSO">SSO Microsoft</option>
              <option value="LOCAL">Compte local</option>
            </select>
          </div>
          <div>
            <label for="user-status" class="mb-1.5 block text-sm font-medium whitespace-nowrap">Statut</label>
            <select id="user-status" [ngModel]="statusFilter()" (ngModelChange)="statusFilter.set($event)" class="min-h-11 w-full rounded-xl border border-border bg-app px-3 text-sm sm:w-36">
              <option value="active">Actifs</option>
              <option value="inactive">Désactivés</option>
              <option value="all">Tous</option>
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
          <!-- Vue mobile (< md) : cartes d'application tactiles modernes -->
          <div class="space-y-3 p-4 md:hidden">
            @for (user of visibleUsers(); track user.id) {
              <div class="rounded-xl border border-border bg-surface p-4 shadow-2xs space-y-3" [class.opacity-60]="!user.active" [class.ring-2]="selectedId() === user.id" [class.ring-brand-500]="selectedId() === user.id">
                <div class="flex items-start justify-between gap-2">
                  <tf-avatar [name]="user.displayName" [subtext]="user.email" size="md" />
                  <span class="inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap" [class]="statusClass(user)">
                    {{ statusLabel(user) }}
                  </span>
                </div>

                <div class="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-border/50">
                  <div>
                    <span class="text-muted block text-[11px]">Rôle & Connexion</span>
                    <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span class="font-medium text-ink">{{ roleLabel(user.role) }}</span>
                      <span class="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted">{{ user.accountType === 'SSO' ? 'SSO' : 'Local' }}</span>
                    </div>
                  </div>
                  <div>
                    <span class="text-muted block text-[11px]">Manager</span>
                    <span class="font-medium text-ink mt-0.5 block truncate">{{ user.managerName ?? 'Sans manager' }}</span>
                  </div>
                </div>

                <div class="flex items-center justify-between gap-2 pt-1 border-t border-border/50 text-xs">
                  <div>
                    <span class="text-muted block text-[11px] mb-1">Régime horaire</span>
                    <span class="inline-flex items-center rounded-md bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-800 whitespace-nowrap">
                      {{ user.workScheduleProfileName || 'Standard 35h' }}
                    </span>
                  </div>
                  <div class="text-right">
                    <span class="text-muted block text-[11px] mb-1">Dernière connexion</span>
                    <span class="text-xs text-muted whitespace-nowrap">
                      {{ user.lastLoginAt ? (user.lastLoginAt | date:'dd/MM/yyyy') : 'Jamais connecté' }}
                    </span>
                  </div>
                </div>

                <div class="pt-2 border-t border-border flex justify-end">
                  <button type="button" (click)="openEdit(user.id)" class="w-full rounded-lg border border-border px-4 py-2.5 text-xs font-semibold text-brand-600 transition hover:bg-brand-50 text-center">
                    Modifier l'utilisateur
                  </button>
                </div>
              </div>
            }
          </div>

          <!-- Vue desktop (hidden md:block) : vrai tableau sans coupure ni espace perdu -->
          <div class="hidden md:block overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="border-b border-border bg-app/50 text-xs font-semibold uppercase tracking-wider text-muted">
                <tr>
                  <th scope="col" class="px-5 py-3.5 whitespace-nowrap">Collaborateur</th>
                  <th scope="col" class="px-4 py-3.5 whitespace-nowrap">Connexion</th>
                  <th scope="col" class="px-4 py-3.5 whitespace-nowrap">Rôle</th>
                  <th scope="col" class="px-4 py-3.5 whitespace-nowrap">Manager</th>
                  <th scope="col" class="px-4 py-3.5 whitespace-nowrap">Régime horaire</th>
                  <th scope="col" class="px-4 py-3.5 whitespace-nowrap">Statut</th>
                  <th scope="col" class="px-4 py-3.5 whitespace-nowrap">Dernière connexion</th>
                  <th scope="col" class="px-5 py-3.5 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border">
                @for (user of visibleUsers(); track user.id) {
                  <tr class="transition hover:bg-app/80 cursor-pointer" [class.bg-brand-50/40]="selectedId() === user.id" (click)="openEdit(user.id)">
                    <td class="px-5 py-3.5">
                      <tf-avatar [name]="user.displayName" [subtext]="user.email" size="md" />
                    </td>
                    <td class="px-4 py-3.5 whitespace-nowrap">
                      <span class="inline-flex items-center rounded-md border border-border px-2 py-0.5 text-xs font-medium text-muted">
                        {{ user.accountType === 'SSO' ? 'SSO Microsoft' : 'Compte local' }}
                      </span>
                    </td>
                    <td class="px-4 py-3.5 whitespace-nowrap">
                      <span class="text-sm font-medium text-ink">{{ roleLabel(user.role) }}</span>
                    </td>
                    <td class="px-4 py-3.5 whitespace-nowrap">
                      <span class="text-sm text-muted">{{ user.managerName ?? '—' }}</span>
                    </td>
                    <td class="px-4 py-3.5 whitespace-nowrap">
                      <span class="inline-flex items-center gap-1.5 rounded-md bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-800">
                        <span class="size-1.5 rounded-full bg-brand-500"></span>
                        {{ user.workScheduleProfileName || 'Standard 35h' }}
                      </span>
                    </td>
                    <td class="px-4 py-3.5 whitespace-nowrap">
                      <span class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium" [class]="statusClass(user)">
                        {{ statusLabel(user) }}
                      </span>
                    </td>
                    <td class="px-4 py-3.5 text-xs text-muted whitespace-nowrap">
                      {{ user.lastLoginAt ? (user.lastLoginAt | date:'dd/MM/yyyy HH:mm') : 'Jamais connecté' }}
                    </td>
                    <td class="px-5 py-3.5 text-right whitespace-nowrap" (click)="$event.stopPropagation()">
                      <button type="button" (click)="openEdit(user.id)" class="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-brand-600 transition hover:bg-brand-50 hover:border-brand-300">
                        Modifier
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <p class="border-t border-border px-5 py-3 text-xs text-muted" aria-live="polite">{{ visibleUsers().length }} utilisateur(s) affiché(s)</p>
        }
      </section>

      @if (panel(); as current) {
        <aside class="h-fit rounded-xl border border-border bg-surface p-5 xl:sticky xl:top-6 shadow-2xs" aria-labelledby="user-panel-title">
          <div class="mb-4 flex items-center justify-between border-b border-border pb-3">
            <h2 id="user-panel-title" class="text-lg font-semibold text-ink">
              {{ current.mode === 'create' ? 'Nouvel utilisateur' : (selectedUser()?.displayName || 'Modifier utilisateur') }}
            </h2>
            <button type="button" (click)="close()" class="rounded-lg p-1.5 text-muted transition hover:bg-app hover:text-ink" aria-label="Fermer le panneau">
              <tf-icon name="x" [size]="18" />
            </button>
          </div>
          @if (current.mode === 'edit' && selectedUser(); as user) {
            <p class="mb-4 break-all text-sm text-muted">{{ user.email }}</p>
            @for (editing of [user]; track editing.id) {
              <tf-user-form [user]="user" [users]="users()" [workSchedules]="workSchedules()" [busy]="saving()" (saved)="save($event)" (cancelled)="close()" />
              <tf-user-account-actions [user]="user" [currentUserId]="currentUserId()" (changed)="load()" />
            }
          } @else if (current.mode === 'create') {
            <tf-user-form [users]="users()" [workSchedules]="workSchedules()" [busy]="saving()" (saved)="save($event)" (cancelled)="close()" />
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
  private readonly workScheduleService = inject(WorkScheduleService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthService);
  readonly currentUserId = computed(() => this.auth.currentUser()?.id ?? null);

  readonly users = signal<ManagedUser[]>([]);
  readonly workSchedules = signal<WorkScheduleProfile[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly saving = signal(false);
  readonly panel = signal<Panel>(null);
  readonly panelError = signal('');
  readonly notice = signal('');
  readonly query = signal('');
  readonly typeFilter = signal('all');
  readonly statusFilter = signal('active');

  readonly activeCount = computed(() => this.users().filter(user => user.active).length);
  readonly ssoCount = computed(() => this.users().filter(user => user.accountType === 'SSO').length);
  readonly localCount = computed(() => this.users().filter(user => user.accountType === 'LOCAL').length);
  readonly assignedSchedulesCount = computed(() => this.users().filter(user => !!user.workScheduleProfileId).length);

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
    this.workScheduleService.listAll(true).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: schedules => this.workSchedules.set(schedules),
      error: () => {}
    });
  }

  openCreate(): void { this.panel.set({ mode: 'create' }); this.panelError.set(''); this.notice.set(''); }
  openEdit(id: string): void { this.panel.set({ mode: 'edit', id }); this.panelError.set(''); this.notice.set(''); }
  close(): void { this.panel.set(null); this.panelError.set(''); }

  save(value: NewUser): void {
    const panel = this.panel();
    if (!panel || this.saving()) return;
    const { displayName, role, managerId, weeklyTargetMinutes, workScheduleProfileId } = value;
    const request = panel.mode === 'create'
      ? this.api.create(value)
      : this.api.update(panel.id, { displayName, role, managerId, weeklyTargetMinutes, workScheduleProfileId });
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
}
