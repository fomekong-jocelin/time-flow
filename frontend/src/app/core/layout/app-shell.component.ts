import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { CurrentUser } from '../auth/auth.models';
import { I18nService } from '../i18n/i18n.service';
import { IconComponent, IconName } from '../../shared/ui/icon.component';
import { LogoComponent } from '../../shared/ui/logo.component';
import { ThemeToggleComponent } from '../../shared/ui/theme-toggle.component';
import { LangToggleComponent } from '../../shared/ui/lang-toggle.component';

interface NavItemDef {
  key: string;
  icon: IconName;
  path?: string;
  role?: CurrentUser['role'];
  roles?: readonly CurrentUser['role'][];
}

const NAV_ITEM_DEFS: readonly NavItemDef[] = [
  { key: 'nav.timesheets', icon: 'clock', path: '/mes-temps' },
  { key: 'nav.validation', icon: 'check', path: '/validation', roles: ['MANAGER', 'DIRECTION', 'ADMIN'] },
  { key: 'nav.projects', icon: 'folder', path: '/projets' },
  { key: 'nav.training', icon: 'graduation' },
  { key: 'nav.analytics', icon: 'analytics', path: '/analyses' },
  { key: 'nav.workSchedules', icon: 'sliders', path: '/admin/configuration-temps', roles: ['ADMIN', 'DIRECTION'] },
  { key: 'nav.users', icon: 'users', path: '/admin/utilisateurs', role: 'ADMIN' }
];

@Component({
  selector: 'tf-app-shell',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    IconComponent,
    LogoComponent,
    ThemeToggleComponent,
    LangToggleComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-app text-ink lg:grid lg:grid-cols-[16rem_1fr]">
      <aside class="hidden border-r border-border bg-surface lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col">
        <a routerLink="/mes-temps" class="mx-4 mt-5 mb-6 self-start rounded-lg p-2" [attr.aria-label]="i18n.t('nav.ariaHome')">
          <tf-logo [size]="30" />
        </a>

        <nav [attr.aria-label]="i18n.t('nav.ariaMain')" class="flex-1 space-y-1 overflow-y-auto px-3">
          @for (item of navItems(); track item.key) {
            @if (item.path) {
              <a
                [routerLink]="item.path"
                routerLinkActive="bg-brand-50 text-brand-600 font-semibold dark:bg-brand-950/60 dark:text-brand-300"
                ariaCurrentWhenActive="page"
                class="flex h-11 items-center gap-3 rounded-lg px-3 text-sm text-muted transition hover:bg-app hover:text-ink">
                <tf-icon [name]="item.icon" />
                {{ item.label }}
              </a>
            } @else {
              <span class="flex h-11 cursor-default items-center gap-3 rounded-lg px-3 text-sm text-muted/60" aria-disabled="true">
                <tf-icon [name]="item.icon" />
                {{ item.label }}
                <span class="ml-auto rounded-full border border-border px-2 py-0.5 text-[11px] text-muted">{{ i18n.t('nav.comingSoon') }}</span>
              </span>
            }
          }
        </nav>

        <!-- Barre de personnalisation (Langue & Thème) -->
        <div class="border-t border-border px-3 py-2 flex items-center justify-between gap-1">
          <tf-lang-toggle variant="segmented" />
          <tf-theme-toggle variant="segmented" />
        </div>

        @if (user(); as u) {
          <div class="border-t border-border p-3">
            <div class="flex items-center gap-3 rounded-lg p-2">
              <span class="grid size-9 shrink-0 place-items-center rounded-full bg-brand-50 text-sm font-semibold text-brand-800 dark:bg-brand-950/60 dark:text-brand-200" aria-hidden="true">{{ initials() }}</span>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium" [title]="u.email">{{ u.displayName }}</p>
                <p class="text-xs text-muted">{{ roleLabel() }}</p>
              </div>
              <button
                type="button"
                (click)="logout()"
                [disabled]="loggingOut()"
                class="grid size-9 place-items-center rounded-lg text-muted transition hover:bg-app hover:text-ink disabled:cursor-wait"
                [attr.aria-label]="i18n.t('nav.logout')"
                [title]="i18n.t('nav.logout')">
                <tf-icon name="logout" [size]="18" />
              </button>
            </div>
          </div>
        }
      </aside>

      <div class="min-w-0">
        <!-- En-tête mobile sticky complet (branding + actions rapides + navigation horizontale tactile) -->
        <header class="sticky top-0 z-30 flex flex-col border-b border-border bg-surface/95 backdrop-blur-md lg:hidden">
          <div class="flex items-center justify-between px-4 py-2.5">
            <a routerLink="/mes-temps" [attr.aria-label]="i18n.t('nav.ariaHome')" class="flex items-center gap-2">
              <tf-logo [size]="26" />
            </a>
            <div class="flex items-center gap-1 sm:gap-2">
              <tf-lang-toggle variant="compact" [iconSize]="16" />
              <tf-theme-toggle variant="compact" [iconSize]="16" />
              @if (user()) {
                <span class="grid size-8 place-items-center rounded-full bg-brand-50 text-xs font-semibold text-brand-800 dark:bg-brand-950/60 dark:text-brand-200" aria-hidden="true">{{ initials() }}</span>
                <button
                  type="button"
                  (click)="logout()"
                  [disabled]="loggingOut()"
                  class="grid size-8 place-items-center rounded-lg text-muted transition hover:bg-app hover:text-ink"
                  [attr.aria-label]="i18n.t('nav.logout')"
                  [title]="i18n.t('nav.logout')">
                  <tf-icon name="logout" [size]="16" />
                </button>
              }
            </div>
          </div>

          <nav [attr.aria-label]="i18n.t('nav.ariaMobile')" class="flex gap-1.5 overflow-x-auto px-3 pb-2 pt-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            @for (item of navItems(); track item.key) {
              @if (item.path) {
                <a
                  [routerLink]="item.path"
                  routerLinkActive="bg-brand-50 text-brand-600 font-semibold shadow-2xs dark:bg-brand-950/60 dark:text-brand-300"
                  ariaCurrentWhenActive="page"
                  class="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-muted transition hover:bg-app hover:text-ink whitespace-nowrap">
                  <tf-icon [name]="item.icon" [size]="15" />
                  <span>{{ item.label }}</span>
                </a>
              }
            }
          </nav>
        </header>

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
  protected readonly i18n = inject(I18nService);

  readonly user = this.auth.currentUser;

  protected readonly navItems = computed(() => {
    // Écoute réactive de la langue sélectionnée
    this.i18n.currentLang();
    const userRole = this.user()?.role;
    return NAV_ITEM_DEFS
      .filter(item => {
        if (item.roles) return userRole ? item.roles.includes(userRole) : false;
        if (item.role) return userRole ? item.role === userRole : false;
        return true;
      })
      .map(item => ({
        ...item,
        label: this.i18n.t(item.key)
      }));
  });

  readonly loggingOut = signal(false);

  readonly roleLabel = computed(() => {
    this.i18n.currentLang();
    const user = this.user();
    return user ? this.i18n.t(`roles.${user.role}`) : '';
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
