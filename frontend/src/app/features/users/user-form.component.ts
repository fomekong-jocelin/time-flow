import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AccountType, ManagedUser, MANAGER_ROLES, NewUser, ROLE_OPTIONS, UserRole } from './user-admin.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { I18nService } from '../../core/i18n/i18n.service';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_WEEKLY_HOURS = 70;

/** Formulaire profil : création (SSO ou local) ou modification d'un utilisateur. */
@Component({
  selector: 'tf-user-form',
  imports: [FormsModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form (ngSubmit)="submit()" novalidate class="space-y-4">
      @if (!user()) {
        <fieldset>
          <legend class="mb-2 text-sm font-medium">{{ 'users.accountTypeField' | translate }}</legend>
          <div class="grid grid-cols-2 gap-2">
            @for (option of accountTypes(); track option.value) {
              <label class="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 text-sm"
                [class]="accountType() === option.value ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-border'">
                <input type="radio" name="accountType" [value]="option.value" [ngModel]="accountType()" (ngModelChange)="accountType.set($event)" />
                {{ option.value === 'SSO' ? ('users.ssoMicrosoft' | translate) : ('users.localAccount' | translate) }}
              </label>
            }
          </div>
          <p class="mt-2 text-xs text-muted">{{ (accountType() === 'SSO' ? 'users.ssoNotice' : 'users.localNotice') | translate }}</p>
        </fieldset>
        <div>
          <label for="user-email" class="mb-1 block text-sm font-medium">{{ 'common.email' | translate }}</label>
          <input id="user-email" name="email" type="email" maxlength="320" autocomplete="off" [ngModel]="email()" (ngModelChange)="email.set($event)"
            [attr.aria-invalid]="touched() && !!emailError()" class="min-h-11 w-full rounded-xl border border-border bg-app px-3 text-sm" />
          @if (touched() && emailError()) { <p class="mt-1 text-xs text-error">{{ emailError() }}</p> }
        </div>
      }
      <div>
        <label for="user-name" class="mb-1 block text-sm font-medium">{{ 'users.displayName' | translate }}</label>
        <input id="user-name" name="displayName" maxlength="200" [ngModel]="displayName()" (ngModelChange)="displayName.set($event)"
          [attr.aria-invalid]="touched() && !displayName().trim()" class="min-h-11 w-full rounded-xl border border-border bg-app px-3 text-sm" />
        @if (touched() && !displayName().trim()) { <p class="mt-1 text-xs text-error">{{ 'users.nameRequired' | translate }}</p> }
      </div>
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label for="user-role" class="mb-1 block text-sm font-medium">{{ 'users.colRole' | translate }}</label>
          <select id="user-role" name="role" [ngModel]="role()" (ngModelChange)="role.set($event)" class="min-h-11 w-full rounded-xl border border-border bg-app px-3 text-sm">
            @for (option of roles; track option.value) { <option [value]="option.value">{{ ('roles.' + option.value) | translate }}</option> }
          </select>
        </div>
        <div>
          <label for="user-hours" class="mb-1 block text-sm font-medium">{{ 'users.weeklyHours' | translate }}</label>
          <input id="user-hours" name="hours" type="number" min="0" [max]="maxHours" step="0.5" [ngModel]="hours()" (ngModelChange)="hours.set($event)"
            [attr.aria-invalid]="touched() && !hoursValid()" class="min-h-11 w-full rounded-xl border border-border bg-app px-3 text-sm" />
          @if (touched() && !hoursValid()) { <p class="mt-1 text-xs text-error">{{ 'users.hoursRange' | translate:{ max: maxHours } }}</p> }
        </div>
      </div>
      <div>
        <label for="user-manager" class="mb-1 block text-sm font-medium">{{ 'users.managerValidation' | translate }}</label>
        <select id="user-manager" name="managerId" [ngModel]="managerId()" (ngModelChange)="managerId.set($event)" class="min-h-11 w-full rounded-xl border border-border bg-app px-3 text-sm">
          <option [ngValue]="null">{{ 'users.noManager' | translate }}</option>
          @for (manager of managerOptions(); track manager.id) { <option [ngValue]="manager.id">{{ manager.displayName }}</option> }
        </select>
      </div>
      <div>
        <label for="user-work-schedule" class="mb-1 block text-sm font-medium">{{ 'users.workSchedule' | translate }}</label>
        <select id="user-work-schedule" name="workScheduleProfileId" [ngModel]="workScheduleProfileId()" (ngModelChange)="onScheduleChange($event)" class="min-h-11 w-full rounded-xl border border-border bg-app px-3 text-sm">
          <option [ngValue]="null">{{ 'users.defaultSchedule' | translate }}</option>
          @for (schedule of workSchedules(); track schedule.id) {
            <option [ngValue]="schedule.id">{{ schedule.name }} ({{ schedule.weeklyTargetMinutes / 60 }}h)</option>
          }
        </select>
        <p class="mt-1 text-xs text-muted">{{ 'users.scheduleNotice' | translate }}</p>
      </div>
      <div>
        <label for="user-daily-rate" class="mb-1 block text-sm font-medium">{{ 'users.colDailyRate' | translate }}</label>
        <div class="relative">
          <input id="user-daily-rate" name="dailyRate" type="number" min="0" step="10" [ngModel]="dailyRate()" (ngModelChange)="dailyRate.set($event)"
            placeholder="ex: 550" class="min-h-11 w-full rounded-xl border border-border bg-app px-3 text-sm" />
          <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted">€ / j</span>
        </div>
        <p class="mt-1 text-xs text-muted">{{ 'users.dailyRateNotice' | translate }}</p>
      </div>
      @if (!user() && accountType() === 'LOCAL') {
        <div>
          <label for="user-password" class="mb-1 block text-sm font-medium">{{ 'users.initialPassword' | translate }}</label>
          <input id="user-password" name="password" type="password" minlength="12" maxlength="128" autocomplete="new-password"
            [ngModel]="password()" (ngModelChange)="password.set($event)" [attr.aria-invalid]="touched() && !passwordValid()"
            class="min-h-11 w-full rounded-xl border border-border bg-app px-3 text-sm" />
          @if (touched() && !passwordValid()) { <p class="mt-1 text-xs text-error">{{ 'users.minChars' | translate }}</p> }
        </div>
      }
      <div class="flex flex-wrap justify-end gap-2 pt-2">
        <button type="button" (click)="cancelled.emit()" class="min-h-11 rounded-xl border border-border px-4 text-sm font-medium">{{ 'common.cancel' | translate }}</button>
        <button type="submit" [disabled]="busy()" class="min-h-11 rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-wait disabled:opacity-60">
          {{ busy() ? ('common.loading' | translate) : user() ? ('common.save' | translate) : ('users.createUser' | translate) }}
        </button>
      </div>
    </form>
  `
})
export class UserFormComponent implements OnInit {
  readonly i18n = inject(I18nService);
  readonly user = input<ManagedUser | null>(null);
  readonly users = input<ManagedUser[]>([]);
  readonly workSchedules = input<import('../work-schedules/work-schedule.models').WorkScheduleProfile[]>([]);
  readonly busy = input(false);
  readonly saved = output<NewUser>();
  readonly cancelled = output<void>();

  protected readonly roles = ROLE_OPTIONS;
  protected readonly maxHours = MAX_WEEKLY_HOURS;
  protected readonly accountTypes = computed<readonly { value: AccountType; label: string }[]>(() => [
    { value: 'SSO', label: this.i18n.t('users.ssoMicrosoft') },
    { value: 'LOCAL', label: this.i18n.t('users.localAccount') }
  ]);

  readonly accountType = signal<AccountType>('SSO');
  readonly email = signal('');
  readonly displayName = signal('');
  readonly role = signal<UserRole>('COLLABORATOR');
  readonly hours = signal(35);
  readonly managerId = signal<string | null>(null);
  readonly workScheduleProfileId = signal<string | null>(null);
  readonly dailyRate = signal<number | null>(null);
  readonly password = signal('');
  readonly touched = signal(false);

  readonly managerOptions = computed(() => this.users()
    .filter(candidate => candidate.active && MANAGER_ROLES.includes(candidate.role) && candidate.id !== this.user()?.id));
  readonly emailError = computed(() => {
    const value = this.email().trim();
    if (!value) return this.i18n.t('users.emailRequired');
    return EMAIL_PATTERN.test(value) ? '' : this.i18n.t('users.emailInvalid');
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
    this.dailyRate.set(user.dailyRate ?? null);
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
      dailyRate: this.dailyRate() ? Number(this.dailyRate()) : null,
      password: creating && this.accountType() === 'LOCAL' ? this.password() : undefined
    });
  }
}
