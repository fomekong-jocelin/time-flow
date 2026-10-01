import { ChangeDetectionStrategy, Component, OnInit, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AccountType, ManagedUser, MANAGER_ROLES, NewUser, ROLE_OPTIONS, UserRole } from './user-admin.service';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_WEEKLY_HOURS = 70;

/** Formulaire profil : création (SSO ou local) ou modification d'un utilisateur. */
@Component({
  selector: 'tf-user-form',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form (ngSubmit)="submit()" novalidate class="space-y-4">
      @if (!user()) {
        <fieldset>
          <legend class="mb-2 text-sm font-medium">Type de compte</legend>
          <div class="grid grid-cols-2 gap-2">
            @for (option of accountTypes; track option.value) {
              <label class="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 text-sm"
                [class]="accountType() === option.value ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-border'">
                <input type="radio" name="accountType" [value]="option.value" [ngModel]="accountType()" (ngModelChange)="accountType.set($event)" />
                {{ option.label }}
              </label>
            }
          </div>
          <p class="mt-2 text-xs text-muted">{{ accountType() === 'SSO'
            ? 'Collaborateur interne : il se connectera avec Microsoft. Son compte sera lié à sa première connexion.'
            : 'Intervenant externe : transmettez-lui le mot de passe initial par un canal sûr.' }}</p>
        </fieldset>
        <div>
          <label for="user-email" class="mb-1 block text-sm font-medium">Email</label>
          <input id="user-email" name="email" type="email" maxlength="320" autocomplete="off" [ngModel]="email()" (ngModelChange)="email.set($event)"
            [attr.aria-invalid]="touched() && !!emailError()" class="min-h-11 w-full rounded-xl border border-border bg-app px-3 text-sm" />
          @if (touched() && emailError()) { <p class="mt-1 text-xs text-error">{{ emailError() }}</p> }
        </div>
      }
      <div>
        <label for="user-name" class="mb-1 block text-sm font-medium">Nom affiché</label>
        <input id="user-name" name="displayName" maxlength="200" [ngModel]="displayName()" (ngModelChange)="displayName.set($event)"
          [attr.aria-invalid]="touched() && !displayName().trim()" class="min-h-11 w-full rounded-xl border border-border bg-app px-3 text-sm" />
        @if (touched() && !displayName().trim()) { <p class="mt-1 text-xs text-error">Le nom est obligatoire.</p> }
      </div>
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label for="user-role" class="mb-1 block text-sm font-medium">Rôle</label>
          <select id="user-role" name="role" [ngModel]="role()" (ngModelChange)="role.set($event)" class="min-h-11 w-full rounded-xl border border-border bg-app px-3 text-sm">
            @for (option of roles; track option.value) { <option [value]="option.value">{{ option.label }}</option> }
          </select>
        </div>
        <div>
          <label for="user-hours" class="mb-1 block text-sm font-medium">Heures / semaine</label>
          <input id="user-hours" name="hours" type="number" min="0" [max]="maxHours" step="0.5" [ngModel]="hours()" (ngModelChange)="hours.set($event)"
            [attr.aria-invalid]="touched() && !hoursValid()" class="min-h-11 w-full rounded-xl border border-border bg-app px-3 text-sm" />
          @if (touched() && !hoursValid()) { <p class="mt-1 text-xs text-error">Entre 0 et {{ maxHours }} heures.</p> }
        </div>
      </div>
      <div>
        <label for="user-manager" class="mb-1 block text-sm font-medium">Manager (validation des temps)</label>
        <select id="user-manager" name="managerId" [ngModel]="managerId()" (ngModelChange)="managerId.set($event)" class="min-h-11 w-full rounded-xl border border-border bg-app px-3 text-sm">
          <option [ngValue]="null">Aucun manager</option>
          @for (manager of managerOptions(); track manager.id) { <option [ngValue]="manager.id">{{ manager.displayName }}</option> }
        </select>
      </div>
      <div>
        <label for="user-work-schedule" class="mb-1 block text-sm font-medium">Régime de temps de travail</label>
        <select id="user-work-schedule" name="workScheduleProfileId" [ngModel]="workScheduleProfileId()" (ngModelChange)="onScheduleChange($event)" class="min-h-11 w-full rounded-xl border border-border bg-app px-3 text-sm">
          <option [ngValue]="null">Régime par défaut</option>
          @for (schedule of workSchedules(); track schedule.id) {
            <option [ngValue]="schedule.id">{{ schedule.name }} ({{ schedule.weeklyTargetMinutes / 60 }}h)</option>
          }
        </select>
        <p class="mt-1 text-xs text-muted">Définit les jours ouvrés, objectifs et plafonds légaux.</p>
      </div>
      @if (!user() && accountType() === 'LOCAL') {
        <div>
          <label for="user-password" class="mb-1 block text-sm font-medium">Mot de passe initial</label>
          <input id="user-password" name="password" type="password" minlength="12" maxlength="128" autocomplete="new-password"
            [ngModel]="password()" (ngModelChange)="password.set($event)" [attr.aria-invalid]="touched() && !passwordValid()"
            class="min-h-11 w-full rounded-xl border border-border bg-app px-3 text-sm" />
          @if (touched() && !passwordValid()) { <p class="mt-1 text-xs text-error">12 caractères minimum.</p> }
        </div>
      }
      <div class="flex flex-wrap justify-end gap-2 pt-2">
        <button type="button" (click)="cancelled.emit()" class="min-h-11 rounded-xl border border-border px-4 text-sm font-medium">Annuler</button>
        <button type="submit" [disabled]="busy()" class="min-h-11 rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-wait disabled:opacity-60">
          {{ busy() ? 'Enregistrement…' : user() ? 'Enregistrer' : 'Créer le compte' }}
        </button>
      </div>
    </form>
  `
})
export class UserFormComponent implements OnInit {
  readonly user = input<ManagedUser | null>(null);
  readonly users = input<ManagedUser[]>([]);
  readonly workSchedules = input<import('../work-schedules/work-schedule.models').WorkScheduleProfile[]>([]);
  readonly busy = input(false);
  readonly saved = output<NewUser>();
  readonly cancelled = output<void>();

  protected readonly roles = ROLE_OPTIONS;
  protected readonly maxHours = MAX_WEEKLY_HOURS;
  protected readonly accountTypes: readonly { value: AccountType; label: string }[] = [
    { value: 'SSO', label: 'SSO Microsoft' },
    { value: 'LOCAL', label: 'Compte local' }
  ];

  readonly accountType = signal<AccountType>('SSO');
  readonly email = signal('');
  readonly displayName = signal('');
  readonly role = signal<UserRole>('COLLABORATOR');
  readonly hours = signal(35);
  readonly managerId = signal<string | null>(null);
  readonly workScheduleProfileId = signal<string | null>(null);
  readonly password = signal('');
  readonly touched = signal(false);

  readonly managerOptions = computed(() => this.users()
    .filter(candidate => candidate.active && MANAGER_ROLES.includes(candidate.role) && candidate.id !== this.user()?.id));
  readonly emailError = computed(() => {
    const value = this.email().trim();
    if (!value) return 'L’email est obligatoire.';
    return EMAIL_PATTERN.test(value) ? '' : 'Email invalide.';
  });
  readonly hoursValid = computed(() => {
    const value = Number(this.hours());
    return Number.isFinite(value) && value >= 0 && value <= MAX_WEEKLY_HOURS;
  });
  readonly passwordValid = computed(() => this.password().length >= 12 && this.password().length <= 128);

  ngOnInit(): void {
    const user = this.user();
    if (!user) return;
    this.displayName.set(user.displayName);
    this.role.set(user.role);
    this.hours.set(user.weeklyTargetMinutes / 60);
    this.managerId.set(user.managerId);
    this.workScheduleProfileId.set(user.workScheduleProfileId ?? null);
  }

  onScheduleChange(scheduleId: string | null): void {
    this.workScheduleProfileId.set(scheduleId);
    if (scheduleId) {
      const schedule = this.workSchedules().find(p => p.id === scheduleId);
      if (schedule) {
        this.hours.set(schedule.weeklyTargetMinutes / 60);
      }
    }
  }

  submit(): void {
    this.touched.set(true);
    const creating = !this.user();
    const valid = !!this.displayName().trim() && this.hoursValid()
      && (!creating || (!this.emailError() && (this.accountType() === 'SSO' || this.passwordValid())));
    if (!valid || this.busy()) return;
    this.saved.emit({
      accountType: this.accountType(),
      email: this.email().trim(),
      displayName: this.displayName().trim(),
      role: this.role(),
      managerId: this.managerId(),
      weeklyTargetMinutes: Math.round(Number(this.hours()) * 60),
      workScheduleProfileId: this.workScheduleProfileId(),
      password: creating && this.accountType() === 'LOCAL' ? this.password() : undefined
    });
  }
}
