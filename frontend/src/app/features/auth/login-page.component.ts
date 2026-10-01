import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { AuthConfig } from '../../core/auth/auth.models';
import { IconComponent } from '../../shared/ui/icon.component';
import { LogoComponent } from '../../shared/ui/logo.component';

type LoginField = 'email' | 'password';

/** Écran de connexion — charte v0.1, §10 : logo centré, fond très clair, formulaire court, SSO. */
@Component({
  selector: 'tf-login-page',
  imports: [ReactiveFormsModule, IconComponent, LogoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex min-h-screen flex-col bg-app bg-[radial-gradient(60rem_30rem_at_50%_-10%,var(--color-brand-50),transparent)] px-4 text-ink">
      <main class="mx-auto flex w-full max-w-[26rem] flex-1 flex-col justify-center py-10">
        <div class="mb-8 flex flex-col items-center text-center">
          <tf-logo variant="stacked" [size]="52" />
          <p class="mt-5 text-sm text-muted">Vos temps. Vos projets. Plus de valeur.</p>
        </div>

        <div class="rounded-ui border border-border bg-surface p-6 shadow-sm sm:p-8">
          <h1 class="text-2xl font-semibold tracking-tight">Connexion</h1>
          <p class="mt-1 text-sm text-muted">Choisis ton mode de connexion.</p>

          <p class="mt-6 text-sm font-medium">Collaborateur INDYLI</p>
          <button
            type="button"
            (click)="loginMicrosoft()"
            [disabled]="!config().ssoEnabled"
            [attr.aria-describedby]="config().ssoEnabled ? null : 'sso-status'"
            class="group mt-2 flex h-11 w-full items-center justify-center gap-3 rounded-ui border border-border bg-surface px-4 text-sm font-semibold transition hover:bg-app disabled:cursor-not-allowed disabled:bg-app disabled:text-muted">
            <span class="grid grid-cols-2 gap-[2px] group-disabled:opacity-40 group-disabled:grayscale" aria-hidden="true">
              <span class="size-2 bg-[#f25022]"></span>
              <span class="size-2 bg-[#7fba00]"></span>
              <span class="size-2 bg-[#00a4ef]"></span>
              <span class="size-2 bg-[#ffb900]"></span>
            </span>
            Se connecter avec Microsoft
          </button>
          @if (!config().ssoEnabled) {
            <p id="sso-status" class="mt-2 flex items-center gap-1.5 text-xs text-warning-700">
              <tf-icon name="alert" [size]="14" />
              SSO non configuré sur cet environnement.
            </p>
          }

          <div class="my-6 flex items-center gap-3 text-xs text-muted">
            <span class="h-px flex-1 bg-border"></span>
            ou avec un compte TimeFlow
            <span class="h-px flex-1 bg-border"></span>
          </div>

          <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="space-y-4">
            <div>
              <label for="login-email" class="mb-1.5 block text-sm font-medium">Adresse email</label>
              <input
                id="login-email"
                formControlName="email"
                type="email"
                autocomplete="username"
                inputmode="email"
                placeholder="nom@exemple.com"
                [attr.aria-invalid]="showError('email')"
                [attr.aria-describedby]="showError('email') ? 'login-email-error' : null"
                [class]="inputClass('email')" />
              @if (showError('email')) {
                <p id="login-email-error" class="mt-1.5 text-xs text-error">
                  {{ form.controls.email.hasError('required') ? 'Saisis ton adresse email.' : 'Saisis une adresse email complète, par exemple nom@indyli-services.com.' }}
                </p>
              }
            </div>

            <div>
              <label for="login-password" class="mb-1.5 block text-sm font-medium">Mot de passe</label>
              <div class="relative">
                <input
                  id="login-password"
                  formControlName="password"
                  [type]="passwordVisible() ? 'text' : 'password'"
                  autocomplete="current-password"
                  [attr.aria-invalid]="showError('password')"
                  [attr.aria-describedby]="showError('password') ? 'login-password-error' : null"
                  [class]="inputClass('password') + ' pr-12'" />
                <button
                  type="button"
                  (click)="passwordVisible.set(!passwordVisible())"
                  [attr.aria-label]="passwordVisible() ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
                  [attr.aria-pressed]="passwordVisible()"
                  class="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-ui text-muted transition hover:text-ink">
                  <tf-icon [name]="passwordVisible() ? 'eye-off' : 'eye'" [size]="18" />
                </button>
              </div>
              @if (showError('password')) {
                <p id="login-password-error" class="mt-1.5 text-xs text-error">Saisis ton mot de passe.</p>
              }
            </div>

            @if (errorMessage()) {
              <div role="alert" class="rounded-ui border border-error/20 bg-error/5 px-4 py-3 text-sm text-error">
                {{ errorMessage() }}
              </div>
            }

            <button
              type="submit"
              [disabled]="loading()"
              class="flex h-11 w-full items-center justify-center gap-2 rounded-ui bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-wait disabled:bg-brand-700">
              @if (loading()) {
                <span class="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true"></span>
                Connexion…
              } @else {
                Se connecter
              }
            </button>
          </form>
        </div>

        <p class="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-muted">
          <tf-icon name="lock" [size]="14" />
          Comptes externes créés par un administrateur TimeFlow.
        </p>
      </main>

      <footer class="py-6 text-center text-xs text-muted">INDYLI Services · TimeFlow v0.1</footer>
    </div>
  `
})
export class LoginPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly submitted = signal(false);
  readonly passwordVisible = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly config = signal<AuthConfig>({ ssoEnabled: false, localEnabled: true });

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  ngOnInit(): void {
    this.auth.config().subscribe({ next: value => this.config.set(value) });
  }

  showError(field: LoginField): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.touched || this.submitted());
  }

  inputClass(field: LoginField): string {
    const base = 'h-11 w-full rounded-ui border bg-surface px-3.5 text-sm outline-none transition placeholder:text-muted/70 focus:ring-4';
    return this.showError(field)
      ? `${base} border-error focus:border-error focus:ring-error/15`
      : `${base} border-border focus:border-brand-600 focus:ring-brand-600/15`;
  }

  loginMicrosoft(): void {
    if (!this.config().ssoEnabled) return;
    this.auth.loginWithMicrosoft();
  }

  submit(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    this.errorMessage.set(null);
    const { email, password } = this.form.getRawValue();

    this.auth.loginLocal(email.trim(), password).subscribe({
      next: () => this.router.navigateByUrl('/mes-temps'),
      error: error => {
        this.loading.set(false);
        this.errorMessage.set(error?.error?.detail ?? 'Connexion impossible. Vérifie tes identifiants.');
      }
    });
  }
}
