import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { SupportedLang } from '../../core/i18n/i18n.types';
import { IconComponent } from './icon.component';

@Component({
  selector: 'tf-lang-toggle',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (variant() === 'segmented') {
      <div class="inline-flex items-center rounded-lg border border-border bg-app p-0.5 text-xs text-muted" role="group" [attr.aria-label]="i18n.t('lang.title')">
        <button
          type="button"
          (click)="setLang('fr')"
          [class.bg-surface]="currentLang() === 'fr'"
          [class.text-ink]="currentLang() === 'fr'"
          [class.shadow-2xs]="currentLang() === 'fr'"
          class="flex items-center gap-1 rounded-md px-2 py-1 font-medium transition hover:text-ink"
          [attr.aria-pressed]="currentLang() === 'fr'"
          title="Français">
          FR
        </button>
        <button
          type="button"
          (click)="setLang('en')"
          [class.bg-surface]="currentLang() === 'en'"
          [class.text-ink]="currentLang() === 'en'"
          [class.shadow-2xs]="currentLang() === 'en'"
          class="flex items-center gap-1 rounded-md px-2 py-1 font-medium transition hover:text-ink"
          [attr.aria-pressed]="currentLang() === 'en'"
          title="English">
          EN
        </button>
      </div>
    } @else {
      <button
        type="button"
        (click)="toggleLang()"
        class="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-muted transition hover:bg-app hover:text-ink"
        [title]="tooltipLabel()"
        [attr.aria-label]="tooltipLabel()">
        <tf-icon name="globe" [size]="iconSize()" />
        <span>{{ displayBadge() }}</span>
      </button>
    }
  `
})
export class LangToggleComponent {
  readonly i18n = inject(I18nService);

  readonly variant = input<'compact' | 'segmented'>('compact');
  readonly iconSize = input(16);

  protected readonly currentLang = this.i18n.currentLang;

  protected readonly displayBadge = computed(() => {
    return this.currentLang().toUpperCase();
  });

  protected readonly tooltipLabel = computed(() => {
    return this.i18n.t('lang.switchTooltip');
  });

  setLang(lang: SupportedLang): void {
    this.i18n.setLang(lang);
  }

  toggleLang(): void {
    this.i18n.toggleLang();
  }
}
