import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/auth/auth.service';
import { IconComponent } from '../../shared/ui/icon.component';
import { AvatarComponent } from '../../shared/ui/avatar.component';
import { KpiCardComponent } from '../../shared/ui/kpi-card.component';
import { ManagedUser, NewUser, ROLE_OPTIONS, UserAdminService } from './user-admin.service';
import { UserFormComponent } from './user-form.component';
import { UserAccountActionsComponent } from './user-account-actions.component';
import { WorkScheduleProfile } from '../work-schedules/work-schedule.models';
import { WorkScheduleService } from '../work-schedules/work-schedule.service';

import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { I18nService } from '../../core/i18n/i18n.service';

type Panel = { mode: 'create' } | { mode: 'edit'; id: string } | null;
const ROLE_LABELS = Object.fromEntries(ROLE_OPTIONS.map(option => [option.value, option.label]));

@Component({
  selector: 'tf-users-page',
  imports: [ FormsModule, IconComponent, AvatarComponent, KpiCardComponent, UserFormComponent, UserAccountActionsComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div class="flex items-center gap-2 text-sm font-medium text-brand-600">
          <span>TimeFlow</span>
          <span class="text-muted">/</span>
          <span>{{ 'nav.users' | translate }}</span>
        </div>
        <h1 class="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">{{ 'users.title' | translate }}</h1>
        <p class="mt-1 text-sm text-muted">{{ 'users.subtitle' | translate }}</p>
      </div>
      <button type="button" (click)="openCreate()"
        class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white shadow-2xs transition hover:bg-brand-700 whitespace-nowrap">
        <tf-icon name="plus" [size]="18" /> {{ 'users.addUser' | translate }}
      </button>
    </header>

    <!-- Cartes synthétiques KPI réutilisables -->
    <section class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
      <tf-kpi-card
        [label]="'users.kpiTotal' | translate"
        [value]="users().length"
        [description]="'users.kpiActiveDesc' | translate:{ active: activeCount(), inactive: (users().length - activeCount()) }" />
      <tf-kpi-card
        [label]="'users.kpiSso' | translate"
        [value]="'users.kpiSsoDesc' | translate:{ sso: ssoCount(), local: localCount() }"
        variant="brand"
        [description]="'users.kpiSsoSubtitle' | translate" />
      <tf-kpi-card
        [label]="'users.kpiSchedules' | translate"
        [value]="assignedSchedulesCount()"
        [description]="'users.kpiSchedulesDesc' | translate:{ total: users().length }" />
    </section>

    <!-- Grille adaptative : 1 colonne pleine largeur par défaut, 2 colonnes avec sticky aside si panneau ouvert -->
    <div class="grid gap-6 items-start" [class.xl:grid-cols-[minmax(0,1fr)_28rem]]="panel() !== null">
      <section class="min-w-0 overflow-hidden rounded-xl border border-border bg-surface shadow-2xs" [attr.aria-label]="'users.title' | translate" [attr.aria-busy]="loading()">
        <!-- Filtres et recherche -->
        <div class="flex flex-col gap-4 border-b border-border p-4 sm:p-5 sm:flex-row sm:items-end">
          <div class="flex-1">
            <label for="user-search" class="mb-1.5 block text-sm font-medium">{{ 'users.searchLabel' | translate }}</label>
            <input id="user-search" type="search" maxlength="320" [ngModel]="query()" (ngModelChange)="query.set($event)"
              [placeholder]="'users.searchPlaceholder' | translate" class="min-h-11 w-full rounded-xl border border-border bg-app px-3.5 text-sm" />
          </div>
          <div>
            <label for="user-type" class="mb-1.5 block text-sm font-medium whitespace-nowrap">{{ 'users.loginType' | translate }}</label>
            <select id="user-type" [ngModel]="typeFilter()" (ngModelChange)="typeFilter.set($event)" class="min-h-11 w-full rounded-xl border border-border bg-app px-3 text-sm sm:w-44">
              <option value="all">{{ 'users.allTypes' | translate }}</option>
              <option value="SSO">{{ 'users.ssoMicrosoft' | translate }}</option>
              <option value="LOCAL">{{ 'users.localAccount' | translate }}</option>
            </select>
          </div>
          <div>
            <label for="user-status" class="mb-1.5 block text-sm font-medium whitespace-nowrap">{{ 'common.status' | translate }}</label>
            <select id="user-status" [ngModel]="statusFilter()" (ngModelChange)="statusFilter.set($event)" class="min-h-11 w-full rounded-xl border border-border bg-app px-3 text-sm sm:w-36">
              <option value="active">{{ 'users.statusActive' | translate }}</option>
              <option value="inactive">{{ 'users.statusInactive' | translate }}</option>
              <option value="all">{{ 'common.all' | translate }}</option>
            </select>
          </div>
        </div>

        @if (loading()) {
          <p class="p-12 text-center text-muted" role="status">{{ 'users.loading' | translate }}</p>
        } @else if (error()) {
          <div class="p-12 text-center" role="alert">
            <p>{{ 'users.loadError' | translate }}</p>
            <button type="button" (click)="load()" class="mt-4 min-h-11 rounded-xl border border-border px-5 text-sm font-medium">{{ 'common.retry' | translate }}</button>
          </div>
        } @else if (visibleUsers().length === 0) {
          <p class="p-12 text-center text-sm text-muted">{{ 'users.noUsersFound' | translate }}</p>
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
                    <span class="text-muted block text-[11px]">{{ 'users.roleAndLogin' | translate }}</span>
                    <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span class="font-medium text-ink">{{ roleLabel(user.role) }}</span>
                      <span class="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted">{{ user.accountType === 'SSO' ? 'SSO' : 'Local' }}</span>
                    </div>
                  </div>
                  <div>
                    <span class="text-muted block text-[11px]">{{ 'users.colManager' | translate }}</span>
                    <span class="font-medium text-ink mt-0.5 block truncate">{{ user.managerName ?? ('users.noManager' | translate) }}</span>
                  </div>
                </div>

                <div class="flex items-center justify-between gap-2 pt-1 border-t border-border/50 text-xs">
                  <div>
                    <span class="text-muted block text-[11px] mb-1">{{ 'users.scheduleProfile' | translate }}</span>
                    <span class="inline-flex items-center rounded-md bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-800 whitespace-nowrap">
                      {{ user.workScheduleProfileName || 'Standard 35h' }}
                    </span>
                  </div>
                  <div class="text-right">
                    <span class="text-muted block text-[11px] mb-1">{{ 'users.colDailyRate' | translate }}</span>
                    <span class="text-xs font-medium text-ink whitespace-nowrap">
                      {{ user.dailyRate ? (user.dailyRate + ' €/j') : '—' }}
                    </span>
                  </div>
                </div>

                <div class="pt-2 border-t border-border flex justify-end">
                  <button type="button" (click)="openEdit(user.id)" class="w-full rounded-lg border border-border px-4 py-2.5 text-xs font-semibold text-brand-600 transition hover:bg-brand-50 text-center">
                    {{ 'users.editUserBtn' | translate }}
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
                  <th scope="col" class="px-5 py-3.5 whitespace-nowrap">{{ 'users.colCollaborator' | translate }}</th>
                  <th scope="col" class="px-4 py-3.5 whitespace-nowrap">{{ 'users.colAccountType' | translate }}</th>
                  <th scope="col" class="px-4 py-3.5 whitespace-nowrap">{{ 'users.colRole' | translate }}</th>
                  <th scope="col" class="px-4 py-3.5 whitespace-nowrap">{{ 'users.colManager' | translate }}</th>
                  <th scope="col" class="px-4 py-3.5 whitespace-nowrap">{{ 'users.colSchedule' | translate }}</th>
                  <th scope="col" class="px-4 py-3.5 whitespace-nowrap">{{ 'users.colDailyRate' | translate }}</th>
                  <th scope="col" class="px-4 py-3.5 whitespace-nowrap">{{ 'users.colStatus' | translate }}</th>
                  <th scope="col" class="px-4 py-3.5 whitespace-nowrap">{{ 'common.date' | translate }}</th>
                  <th scope="col" class="px-5 py-3.5 text-right whitespace-nowrap">{{ 'common.actions' | translate }}</th>
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
                        {{ user.accountType === 'SSO' ? ('users.ssoMicrosoft' | translate) : ('users.localAccount' | translate) }}
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
                    <td class="px-4 py-3.5 whitespace-nowrap text-sm font-medium text-ink">
                      {{ user.dailyRate ? (user.dailyRate + ' €/j') : '—' }}
                    </td>
                    <td class="px-4 py-3.5 whitespace-nowrap">
                      <span class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium" [class]="statusClass(user)">
                        {{ statusLabel(user) }}
                      </span>
                    </td>
                    <td class="px-4 py-3.5 text-xs text-muted whitespace-nowrap">
                      {{ user.lastLoginAt ? (i18n.formatDate(user.lastLoginAt, true)) : ('users.neverLoggedIn' | translate) }}
                    </td>
                    <td class="px-5 py-3.5 text-right whitespace-nowrap" (click)="$event.stopPropagation()">
                      <button type="button" (click)="openEdit(user.id)" class="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-brand-600 transition hover:bg-brand-50 hover:border-brand-300">
                        {{ 'common.edit' | translate }}
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <p class="border-t border-border px-5 py-3 text-xs text-muted" aria-live="polite">{{ 'users.displayedUsersCount' | translate:{ count: visibleUsers().length } }}</p>
        }
      </section>

      @if (panel(); as current) {
        <aside class="h-fit rounded-xl border border-border bg-surface p-5 xl:sticky xl:top-6 shadow-2xs" aria-labelledby="user-panel-title">
          <div class="mb-4 flex items-center justify-between border-b border-border pb-3">
            <h2 id="user-panel-title" class="text-lg font-semibold text-ink">
              {{ current.mode === 'create' ? ('users.newUserTitle' | translate) : (selectedUser()?.displayName || ('users.editUser' | translate)) }}
            </h2>
            <button type="button" (click)="close()" class="rounded-lg p-1.5 text-muted transition hover:bg-app hover:text-ink" [attr.aria-label]="'users.closePanel' | translate">
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
  readonly i18n = inject(I18nService);
  readonly currentUserId = computed(() => this.auth.currentUser()?.id ?? null);

  readonly users = signal<ManagedUser[]>([]);
  readonly workSchedules = signal<WorkScheduleProfile[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly saving = signal(false);
  readonly panel = signal<Panel>(null);
  readonly panelError = this.i18n.messageSignal('');
  readonly notice = this.i18n.messageSignal('');
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
        this.notice.set(() => panel.mode === 'create' ? this.i18n.t('messages.userCreated', { email: value.email }) : this.i18n.t('messages.saved'));
        if (panel.mode === 'create') this.close();
        this.load();
      },
      error: error => {
        this.saving.set(false);
        this.panelError.set(() => error?.status === 409 ? this.i18n.t('messages.duplicateEmail') : this.i18n.problem(error, this.i18n.t('messages.saveFailed')));
      }
    });
  }

  roleLabel(role: string): string {
    const key = 'roles.' + role;
    const trans = this.i18n.t(key);
    return trans !== key ? trans : (ROLE_LABELS[role] ?? role);
  }

  statusLabel(user: ManagedUser): string {
    if (!user.active) return this.i18n.t('common.inactive');
    if (user.locked) return this.i18n.t('timesheets.statusLocked');
    return user.accountType === 'SSO' && !user.ssoLinked ? this.i18n.t('common.pending') : this.i18n.t('common.active');
  }

  statusClass(user: ManagedUser): string {
    if (!user.active) return 'bg-app text-muted';
    if (user.locked || (user.accountType === 'SSO' && !user.ssoLinked)) return 'bg-warning/10 text-warning-700';
    return 'bg-success-50 text-success-700';
  }
}
