import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { ThemeMode, ThemeService } from '../../core/theme/theme.service';
import { IconComponent, IconName } from './icon.component';

@Component({
  selector: 'tf-theme-toggle',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (variant() === 'segmented') {
      <div class="inline-flex items-center rounded-lg border border-border bg-app p-0.5 text-xs text-muted" role="group" [attr.aria-label]="i18n.t('theme.title')">
        <button
          type="button"
          (click)="setTheme('light')"
          [class.bg-surface]="theme() === 'light'"
          [class.text-ink]="theme() === 'light'"
          [class.shadow-2xs]="theme() === 'light'"
          class="flex items-center gap-1.5 rounded-md px-2 py-1 transition hover:text-ink"
          [attr.aria-pressed]="theme() === 'light'"
          [title]="i18n.t('theme.lightTitle')">
          <tf-icon name="sun" [size]="14" />
          @if (showLabels()) {
            <span>{{ i18n.t('theme.light') }}</span>
          }
        </button>
        <button
          type="button"
          (click)="setTheme('system')"
          [class.bg-surface]="theme() === 'system'"
          [class.text-ink]="theme() === 'system'"
          [class.shadow-2xs]="theme() === 'system'"
          class="flex items-center gap-1.5 rounded-md px-2 py-1 transition hover:text-ink"
          [attr.aria-pressed]="theme() === 'system'"
          [title]="i18n.t('theme.systemTitle')">
          <tf-icon name="monitor" [size]="14" />
          @if (showLabels()) {
            <span>{{ i18n.t('theme.system') }}</span>
          }
        </button>
        <button
          type="button"
          (click)="setTheme('dark')"
          [class.bg-surface]="theme() === 'dark'"
          [class.text-ink]="theme() === 'dark'"
          [class.shadow-2xs]="theme() === 'dark'"
          class="flex items-center gap-1.5 rounded-md px-2 py-1 transition hover:text-ink"
          [attr.aria-pressed]="theme() === 'dark'"
          [title]="i18n.t('theme.darkTitle')">
          <tf-icon name="moon" [size]="14" />
          @if (showLabels()) {
            <span>{{ i18n.t('theme.dark') }}</span>
          }
        </button>
      </div>
    } @else {
      <button
        type="button"
        (click)="cycleTheme()"
        class="grid size-9 place-items-center rounded-lg text-muted transition hover:bg-app hover:text-ink"
        [title]="themeLabel()"
        [attr.aria-label]="themeLabel()">
        <tf-icon [name]="currentIcon()" [size]="iconSize()" />
      </button>
    }
  `
})
export class ThemeToggleComponent {
  readonly i18n = inject(I18nService);
  private readonly themeService = inject(ThemeService);

  readonly variant = input<'compact' | 'segmented'>('compact');
  readonly showLabels = input(false);
  readonly iconSize = input(18);

  protected readonly theme = this.themeService.theme;

  protected readonly currentIcon = computed<IconName>(() => {
    switch (this.theme()) {
      case 'light': return 'sun';
      case 'dark': return 'moon';
      default: return 'monitor';
    }
  });

  protected readonly themeLabel = computed(() => {
    return this.i18n.t('theme.' + this.theme()) + ' · ' + this.i18n.t('theme.cycleTooltip');
  });

  setTheme(mode: ThemeMode): void {
    this.themeService.setTheme(mode);
  }

  cycleTheme(): void {
    this.themeService.cycleTheme();
  }
}
