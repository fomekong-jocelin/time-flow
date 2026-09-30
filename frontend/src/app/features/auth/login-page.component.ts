import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { AuthConfig } from '../../core/auth/auth.models';

@Component({
  selector: 'tf-login-page',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mx-auto grid min-h-[72vh] max-w-5xl items-center gap-10 lg:grid-cols-[1.05fr_.95fr]">
      <div class="hidden lg:block">
        <p class="text-sm font-semibold uppercase tracking-[.22em] text-brand-600">TimeFlow by INDYLI</p>
        <h1 class="mt-5 max-w-xl text-5xl font-bold leading-tight tracking-tight text-ink">
          Tes temps, tes projets, une seule expérience.
        </h1>
        <p class="mt-5 max-w-lg text-lg leading-8 text-muted">
          Collaborateur interne ? Utilise le SSO Microsoft. Formateur, consultant ou intervenant externe ? Utilise ton compte TimeFlow.
        </p>
        <div class="mt-8 flex gap-3 text-sm text-muted">
          <span class="rounded-full bg-brand-50 px-3 py-1.5 text-brand-800">SSO Microsoft</span>
          <span class="rounded-full bg-teal-500/10 px-3 py-1.5 text-teal-600">Compte externe sécurisé</span>
        </div>
      </div>

      <div class="rounded-2xl border border-border bg-white p-6 shadow-[0_20px_70px_rgba(16,24,40,.08)] sm:p-8">
        <div>
          <div class="grid size-12 place-items-center rounded-xl bg-brand-600 text-lg font-bold text-white">TF</div>
          <h2 class="mt-5 text-2xl font-bold tracking-tight">Connexion</h2>
          <p class="mt-2 text-sm text-muted">Choisis ton mode de connexion.</p>
        </div>

        <div class="mt-7 rounded-ui border border-border bg-app/60 p-4">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="font-semibold text-ink">Compte entreprise</p>
              <p class="mt-1 text-sm text-muted">Pour les collaborateurs disposant d'un compte Microsoft INDYLI.</p>
            </div>
            <span class="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-800">SSO</span>
          </div>

          <button
            type="button"
            (click)="loginMicrosoft()"
            [disabled]="!config().ssoEnabled"
            class="mt-4 flex w-full items-center justify-center gap-3 rounded-ui border border-border bg-white px-4 py-3 font-semibold transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none">
            <span class="grid grid-cols-2 gap-[2px]" aria-hidden="true">
              <span class="size-2 bg-[#f25022]"></span>
              <span class="size-2 bg-[#7fba00]"></span>
              <span class="size-2 bg-[#00a4ef]"></span>
              <span class="size-2 bg-[#ffb900]"></span>
            </span>
            Se connecter avec Microsoft
          </button>

          @if (!config().ssoEnabled) {
            <p class="mt-2 text-xs text-warning">SSO non configuré sur cet environnement.</p>
          }
        </div>

        <div class="my-6 flex items-center gap-4 text-xs uppercase tracking-wider text-muted">
          <span class="h-px flex-1 bg-border"></span>
          ou
          <span class="h-px flex-1 bg-border"></span>
        </div>

        <div>
          <div class="mb-4 flex items-start justify-between gap-4">
            <div>
              <p class="font-semibold text-ink">Compte TimeFlow</p>
              <p class="mt-1 text-sm text-muted">Pour les formateurs, consultants et autres intervenants externes.</p>
            </div>
            <span class="rounded-full bg-teal-500/10 px-2.5 py-1 text-xs font-medium text-teal-600">Externe</span>
          </div>

          <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
            <label class="block">
              <span class="mb-1.5 block text-sm font-medium">Adresse email</span>
              <input formControlName="email" type="email" autocomplete="username" class="w-full rounded-ui border border-border bg-white px-3.5 py-3 text-sm outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-50" placeholder="nom@exemple.com" />
            </label>

            <label class="block">
              <span class="mb-1.5 block text-sm font-medium">Mot de passe</span>
              <input formControlName="password" type="password" autocomplete="current-password" class="w-full rounded-ui border border-border bg-white px-3.5 py-3 text-sm outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-50" placeholder="••••••••••••" />
            </label>

            @if (errorMessage()) {
              <div role="alert" class="rounded-ui border border-error/20 bg-error/5 px-4 py-3 text-sm text-error">
                {{ errorMessage() }}
              </div>
            }

            <button type="submit" [disabled]="form.invalid || loading()" class="w-full rounded-ui bg-brand-600 px-4 py-3 font-semibold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50">
              {{ loading() ? 'Connexion…' : 'Se connecter avec mon compte TimeFlow' }}
            </button>
          </form>
        </div>

        <p class="mt-6 text-center text-xs leading-5 text-muted">
          Les comptes externes sont créés par un administrateur TimeFlow. L'inscription publique est désactivée.
        </p>
      </div>
    </section>
  `
})
export class LoginPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly config = signal<AuthConfig>({ ssoEnabled: false, localEnabled: true });

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  ngOnInit(): void {
    this.auth.config().subscribe({ next: value => this.config.set(value) });
  }

  loginMicrosoft(): void {
    if (!this.config().ssoEnabled) return;
    this.auth.loginWithMicrosoft();
  }

  submit(): void {
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    this.errorMessage.set(null);
    const { email, password } = this.form.getRawValue();

    this.auth.loginLocal(email, password).subscribe({
      next: () => this.router.navigateByUrl('/mes-temps'),
      error: error => {
        this.loading.set(false);
        this.errorMessage.set(error?.error?.detail ?? 'Connexion impossible. Vérifie tes identifiants.');
      }
    });
  }
}
