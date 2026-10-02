import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { ManagedUser, UserAdminService } from './user-admin.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { I18nService } from '../../core/i18n/i18n.service';

/** Actions de compte : activation, réinitialisation du mot de passe et déverrouillage (comptes locaux). */
@Component({
  selector: 'tf-user-account-actions',
  imports: [FormsModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mt-6 space-y-4 border-t border-border pt-6" [attr.aria-label]="'users.accountAccess' | translate">
      <h3 class="font-semibold">{{ 'users.accountAccess' | translate }}</h3>
      <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
        <div>
          <p class="text-sm font-medium">{{ (user().active ? 'users.accountActive' : 'users.accountInactive') | translate }}</p>
          <p class="text-xs text-muted">{{ (user().active ? 'users.deactivateNotice' : 'users.deactivatedNotice') | translate }}</p>
        </div>
        @if (confirmingDeactivation()) {
          <div class="flex gap-2">
            <button type="button" (click)="confirmingDeactivation.set(false)" class="min-h-11 rounded-xl border border-border px-3 text-sm">{{ 'common.cancel' | translate }}</button>
            <button type="button" (click)="toggleActive()" [disabled]="busy()" class="min-h-11 rounded-xl bg-error px-3 text-sm font-semibold text-white disabled:opacity-60">{{ 'users.confirmDeactivation' | translate }}</button>
          </div>
        } @else {
          <button type="button" (click)="user().active ? confirmingDeactivation.set(true) : toggleActive()" [disabled]="busy() || isSelf()"
            [title]="isSelf() ? ('users.selfDeactivateForbidden' | translate) : ''"
            class="min-h-11 rounded-xl border border-border px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60">
            {{ (user().active ? 'users.deactivate' : 'users.reactivate') | translate }}
          </button>
        }
      </div>

      @if (user().accountType === 'LOCAL') {
        @if (user().locked) {
          <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
            <p class="text-sm">{{ 'users.accountLocked' | translate }}</p>
            <button type="button" (click)="unlock()" [disabled]="busy()" class="min-h-11 rounded-xl border border-border px-4 text-sm font-medium disabled:opacity-60">{{ 'users.unlock' | translate }}</button>
          </div>
        }
        <form (ngSubmit)="resetPassword()" novalidate class="rounded-xl border border-border p-4">
          <label for="reset-password" class="mb-1 block text-sm font-medium">{{ 'users.newPassword' | translate }}</label>
          <div class="flex flex-wrap gap-2">
            <input id="reset-password" name="password" type="password" autocomplete="new-password" minlength="12" maxlength="128"
              [ngModel]="password()" (ngModelChange)="password.set($event)" class="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-app px-3 text-sm" />
            <button type="submit" [disabled]="busy() || password().length < 12" class="min-h-11 rounded-xl border border-border px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60">{{ 'users.resetPassword' | translate }}</button>
          </div>
          <p class="mt-1 text-xs text-muted">{{ 'users.passwordResetNotice' | translate }}</p>
        </form>
      } @else {
        <p class="rounded-xl bg-app p-4 text-sm text-muted">
          {{ 'users.ssoPasswordNotice' | translate }}
          {{ (user().ssoLinked ? 'users.ssoLinked' : 'users.ssoPending') | translate }}
        </p>
      }
      @if (message()) { <p class="text-sm text-muted" role="status">{{ message() }}</p> }
      @if (error()) { <p class="text-sm text-error" role="alert">{{ error() }}</p> }
    </section>
  `
})
export class UserAccountActionsComponent {
  private readonly api = inject(UserAdminService);
  private readonly destroyRef = inject(DestroyRef);
  readonly i18n = inject(I18nService);

  readonly user = input.required<ManagedUser>();
  readonly currentUserId = input<string | null>(null);
  readonly changed = output<void>();

  readonly busy = signal(false);
  readonly confirmingDeactivation = signal(false);
  readonly password = signal('');
  readonly message = this.i18n.messageSignal('');
  readonly error = this.i18n.messageSignal('');
  readonly isSelf = computed(() => this.user().id === this.currentUserId());

  toggleActive(): void {
    const active = !this.user().active;
    this.run(this.api.setActive(this.user().id, active), () => active ? this.i18n.t('messages.reactivated') : this.i18n.t('messages.deactivated'));
    this.confirmingDeactivation.set(false);
  }

  unlock(): void {
    this.run(this.api.unlock(this.user().id), () => this.i18n.t('messages.unlocked'));
  }

  resetPassword(): void {
    if (this.password().length < 12) return;
    this.run(this.api.resetPassword(this.user().id, this.password()), () => this.i18n.t('messages.passwordReset'));
    this.password.set('');
  }

  private run(request: Observable<unknown>, success: string | (() => string)): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.message.set('');
    this.error.set('');
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { this.busy.set(false); this.message.set(success); this.changed.emit(); },
      error: error => { this.busy.set(false); this.error.set(() => this.i18n.problem(error, this.i18n.t('messages.actionFailed'))); }
    });
  }
}
