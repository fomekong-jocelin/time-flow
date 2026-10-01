import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { CurrentUser } from '../auth/auth.models';
import { IconComponent, IconName } from '../../shared/ui/icon.component';
import { LogoComponent } from '../../shared/ui/logo.component';

interface NavItem {
  label: string;
  icon: IconName;
  /** Route disponible ; absent = écran pas encore livré. */
  path?: string;
  /** Rôle unique requis pour afficher l'entrée. */
  role?: CurrentUser['role'];
  /** Plusieurs rôles autorisés pour afficher l'entrée. */
  roles?: readonly CurrentUser['role'][];
}

const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Mes temps', icon: 'clock', path: '/mes-temps' },
  { label: 'Validation', icon: 'check', path: '/validation', roles: ['MANAGER', 'DIRECTION', 'ADMIN'] },
  { label: 'Projets', icon: 'folder', path: '/projets' },
  { label: 'Formations', icon: 'graduation' },
  { label: 'Analyses', icon: 'analytics' },
  { label: 'Utilisateurs', icon: 'users', path: '/admin/utilisateurs', role: 'ADMIN' }
];

const ROLE_LABELS: Record<CurrentUser['role'], string> = {
  COLLABORATOR: 'Collaborateur',
  TRAINER: 'Formateur',
  MANAGER: 'Manager',
  DIRECTION: 'Direction',
  ADMIN: 'Administrateur'
};

@Component({
  selector: 'tf-app-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, IconComponent, LogoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-app text-ink lg:grid lg:grid-cols-[16rem_1fr]">
      <aside class="hidden border-r border-border bg-surface lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col">
        <a routerLink="/mes-temps" class="mx-4 mt-5 mb-6 self-start rounded-lg p-2" aria-label="TimeFlow by INDYLI — accueil">
          <tf-logo [size]="30" />
        </a>

        <nav aria-label="Navigation principale" class="flex-1 space-y-1 overflow-y-auto px-3">
          @for (item of navItems(); track item.label) {
            @if (item.path) {
              <a
                [routerLink]="item.path"
                routerLinkActive="bg-brand-50 text-brand-600 font-semibold"
                ariaCurrentWhenActive="page"
                class="flex h-11 items-center gap-3 rounded-lg px-3 text-sm text-muted transition hover:bg-app hover:text-ink">
                <tf-icon [name]="item.icon" />
                {{ item.label }}
              </a>
            } @else {
              <span class="flex h-11 cursor-default items-center gap-3 rounded-lg px-3 text-sm text-muted/60" aria-disabled="true">
                <tf-icon [name]="item.icon" />
                {{ item.label }}
                <span class="ml-auto rounded-full border border-border px-2 py-0.5 text-[11px] text-muted">Bientôt</span>
              </span>
            }
          }
        </nav>

        @if (user(); as u) {
          <div class="border-t border-border p-3">
            <div class="flex items-center gap-3 rounded-lg p-2">
              <span class="grid size-9 shrink-0 place-items-center rounded-full bg-brand-50 text-sm font-semibold text-brand-800" aria-hidden="true">{{ initials() }}</span>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium" [title]="u.email">{{ u.displayName }}</p>
                <p class="text-xs text-muted">{{ roleLabel() }}</p>
              </div>
              <button type="button" (click)="logout()" [disabled]="loggingOut()" class="grid size-9 place-items-center rounded-lg text-muted transition hover:bg-app hover:text-ink disabled:cursor-wait" aria-label="Se déconnecter" title="Se déconnecter">
                <tf-icon name="logout" [size]="18" />
              </button>
            </div>
          </div>
        }
      </aside>

      <div class="min-w-0">
        <header class="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface/90 px-4 py-3 backdrop-blur lg:hidden">
          <a routerLink="/mes-temps" aria-label="TimeFlow by INDYLI — accueil"><tf-logo [size]="26" /></a>
          @if (user()) {
            <div class="flex items-center gap-2">
              <span class="grid size-9 place-items-center rounded-full bg-brand-50 text-sm font-semibold text-brand-800" aria-hidden="true">{{ initials() }}</span>
              <button type="button" (click)="logout()" [disabled]="loggingOut()" class="grid size-11 place-items-center rounded-lg text-muted transition hover:bg-app hover:text-ink" aria-label="Se déconnecter">
                <tf-icon name="logout" />
              </button>
            </div>
          }
        </header>

        <nav aria-label="Navigation mobile" class="flex gap-2 border-b border-border bg-surface px-4 py-2 lg:hidden">
          @for (item of navItems(); track item.label) {
            @if (item.path) {
              <a [routerLink]="item.path" routerLinkActive="bg-brand-50 text-brand-800" ariaCurrentWhenActive="page"
                class="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm"><tf-icon [name]="item.icon" [size]="18" />{{ item.label }}</a>
            }
          }
        </nav>
        <main class="mx-auto w-full max-w-[100rem] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <router-outlet />
        </main>
      </div>
    </div>
  `
})
export class AppShellComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly user = this.auth.currentUser;
  protected readonly navItems = computed(() => {
    const userRole = this.user()?.role;
    return NAV_ITEMS.filter(item => {
      if (item.roles) return userRole ? item.roles.includes(userRole) : false;
      if (item.role) return userRole ? item.role === userRole : false;
      return true;
    });
  });
  readonly loggingOut = signal(false);
  readonly roleLabel = computed(() => {
    const user = this.user();
    return user ? ROLE_LABELS[user.role] : '';
  });
  readonly initials = computed(() => {
    const parts = (this.user()?.displayName ?? '').trim().split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).map(part => part[0].toUpperCase()).join('') || '?';
  });

  logout(): void {
    if (this.loggingOut()) return;
    this.loggingOut.set(true);
    this.auth.logout().subscribe({
      next: () => {
        this.loggingOut.set(false);
        this.router.navigateByUrl('/connexion');
      },
      error: () => this.loggingOut.set(false)
    });
  }
}
