import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { ManagedUser, problemMessage, UserAdminService } from './user-admin.service';

/** Actions de compte : activation, réinitialisation du mot de passe et déverrouillage (comptes locaux). */
@Component({
  selector: 'tf-user-account-actions',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mt-6 space-y-4 border-t border-border pt-6" aria-label="Accès au compte">
      <h3 class="font-semibold">Accès au compte</h3>
      <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
        <div>
          <p class="text-sm font-medium">{{ user().active ? 'Compte actif' : 'Compte désactivé' }}</p>
          <p class="text-xs text-muted">{{ user().active ? 'La désactivation ferme ses sessions ; son historique est conservé.' : 'Il ne peut plus se connecter.' }}</p>
        </div>
        @if (confirmingDeactivation()) {
          <div class="flex gap-2">
            <button type="button" (click)="confirmingDeactivation.set(false)" class="min-h-11 rounded-xl border border-border px-3 text-sm">Annuler</button>
            <button type="button" (click)="toggleActive()" [disabled]="busy()" class="min-h-11 rounded-xl bg-error px-3 text-sm font-semibold text-white disabled:opacity-60">Confirmer</button>
          </div>
        } @else {
          <button type="button" (click)="user().active ? confirmingDeactivation.set(true) : toggleActive()" [disabled]="busy() || isSelf()"
            [title]="isSelf() ? 'Vous ne pouvez pas désactiver votre propre compte.' : ''"
            class="min-h-11 rounded-xl border border-border px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60">
            {{ user().active ? 'Désactiver' : 'Réactiver' }}
          </button>
        }
      </div>

      @if (user().accountType === 'LOCAL') {
        @if (user().locked) {
          <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
            <p class="text-sm">Compte verrouillé après plusieurs échecs de connexion.</p>
            <button type="button" (click)="unlock()" [disabled]="busy()" class="min-h-11 rounded-xl border border-border px-4 text-sm font-medium disabled:opacity-60">Déverrouiller</button>
          </div>
        }
        <form (ngSubmit)="resetPassword()" novalidate class="rounded-xl border border-border p-4">
          <label for="reset-password" class="mb-1 block text-sm font-medium">Nouveau mot de passe</label>
          <div class="flex flex-wrap gap-2">
            <input id="reset-password" name="password" type="password" autocomplete="new-password" minlength="12" maxlength="128"
              [ngModel]="password()" (ngModelChange)="password.set($event)" class="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-app px-3 text-sm" />
            <button type="submit" [disabled]="busy() || password().length < 12" class="min-h-11 rounded-xl border border-border px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60">Réinitialiser</button>
          </div>
          <p class="mt-1 text-xs text-muted">12 caractères minimum. Ses sessions ouvertes seront fermées.</p>
        </form>
      } @else {
        <p class="rounded-xl bg-app p-4 text-sm text-muted">
          Mot de passe géré par Microsoft Entra ID.
          {{ user().ssoLinked ? 'Compte lié à Microsoft.' : 'En attente de la première connexion Microsoft.' }}
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

  readonly user = input.required<ManagedUser>();
  readonly currentUserId = input<string | null>(null);
  readonly changed = output<void>();

  readonly busy = signal(false);
  readonly confirmingDeactivation = signal(false);
  readonly password = signal('');
  readonly message = signal('');
  readonly error = signal('');
  readonly isSelf = computed(() => this.user().id === this.currentUserId());

  toggleActive(): void {
    const active = !this.user().active;
    this.run(this.api.setActive(this.user().id, active), active ? 'Compte réactivé.' : 'Compte désactivé.');
    this.confirmingDeactivation.set(false);
  }

  unlock(): void {
    this.run(this.api.unlock(this.user().id), 'Compte déverrouillé.');
  }

  resetPassword(): void {
    if (this.password().length < 12) return;
    this.run(this.api.resetPassword(this.user().id, this.password()), 'Mot de passe réinitialisé.');
    this.password.set('');
  }

  private run(request: Observable<unknown>, success: string): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.message.set('');
    this.error.set('');
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { this.busy.set(false); this.message.set(success); this.changed.emit(); },
      error: error => { this.busy.set(false); this.error.set(problemMessage(error, 'Action impossible. Réessayez.')); }
    });
  }
}
