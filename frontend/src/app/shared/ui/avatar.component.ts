import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Composant Avatar réutilisable pour TimeFlow.
 * Affiche les initiales de l'utilisateur avec couleurs de marque,
 * avec option pour nom, sous-titre (email ou rôle) et badge.
 */
@Component({
  selector: 'tf-avatar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block min-w-0'
  },
  template: `
    <div class="flex items-center gap-3 min-w-0">
      <span
        [class]="sizeClass()"
        class="grid shrink-0 place-items-center rounded-full bg-brand-50 font-semibold text-brand-800 border border-brand-200 shadow-2xs dark:bg-brand-950/60 dark:text-brand-200 dark:border-brand-800"
        aria-hidden="true">
        {{ initials() }}
      </span>
      @if (name()) {
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="block font-semibold text-ink leading-tight truncate" [title]="name()">{{ name() }}</span>
            @if (badge()) {
              <span class="rounded-full bg-brand-50 px-2 py-0.2 text-[10px] font-semibold text-brand-600 border border-brand-200 whitespace-nowrap dark:bg-brand-950/60 dark:text-brand-300 dark:border-brand-800">
                {{ badge() }}
              </span>
            }
          </div>
          @if (subtext()) {
            <span class="block text-xs text-muted truncate mt-0.5" [title]="subtext()">{{ subtext() }}</span>
          }
        </div>
      }
    </div>
  `
})
export class AvatarComponent {
  readonly name = input<string>('');
  readonly subtext = input<string>('');
  readonly badge = input<string>('');
  readonly size = input<'sm' | 'md' | 'lg'>('md');

  protected readonly initials = computed(() => {
    const val = this.name().trim();
    if (!val) return '?';
    return val
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0].toUpperCase())
      .join('') || '?';
  });

  protected readonly sizeClass = computed(() => {
    switch (this.size()) {
      case 'sm': return 'size-8 text-xs';
      case 'lg': return 'size-11 text-base';
      default: return 'size-9 text-sm';
    }
  });
}
