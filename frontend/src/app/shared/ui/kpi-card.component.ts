import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent, IconName } from './icon.component';

/**
 * Carte synthétique KPI réutilisable pour TimeFlow.
 * Affiche une métrique clé avec icône optionnelle, titre, valeur et description/sous-texte.
 */
@Component({
  selector: 'tf-kpi-card',
  standalone: true,
  imports: [CommonModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded-2xl border border-border bg-surface p-4 sm:p-5 shadow-2xs transition hover:border-brand-300 dark:hover:border-brand-600/60">
      <div class="flex items-start gap-3.5">
        @if (icon()) {
          <div class="flex size-10 shrink-0 items-center justify-center rounded-xl transition" [class]="iconBgClass()">
            <tf-icon [name]="icon()!" [size]="18" [class]="iconColorClass()" />
          </div>
        }
        <div class="min-w-0 flex-1">
          <p class="text-[11px] font-semibold uppercase tracking-wider text-muted truncate">{{ label() }}</p>
          <p class="mt-1 text-2xl font-bold tracking-tight" [class]="valueColorClass()">
            {{ value() }}
          </p>
          @if (description()) {
            <p class="mt-1 text-xs text-muted leading-relaxed">{{ description() }}</p>
          }
        </div>
      </div>
    </div>
  `
})
export class KpiCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly description = input<string>('');
  readonly variant = input<'default' | 'brand' | 'success' | 'warning' | 'danger'>('default');
  readonly icon = input<IconName | null>(null);
  readonly iconColor = input<'brand' | 'success' | 'warning' | 'purple' | 'blue' | 'default'>('default');

  protected readonly iconBgClass = computed(() => {
    switch (this.iconColor()) {
      case 'brand': return 'bg-brand-500/10 border border-brand-500/20 text-brand-600 dark:text-brand-400';
      case 'purple': return 'bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400';
      case 'blue': return 'bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400';
      case 'success': return 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400';
      case 'warning': return 'bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400';
      default: return 'bg-app border border-border text-muted';
    }
  });

  protected readonly iconColorClass = computed(() => {
    switch (this.iconColor()) {
      case 'brand': return 'text-brand-600 dark:text-brand-400';
      case 'purple': return 'text-purple-600 dark:text-purple-400';
      case 'blue': return 'text-blue-600 dark:text-blue-400';
      case 'success': return 'text-emerald-600 dark:text-emerald-400';
      case 'warning': return 'text-amber-600 dark:text-amber-400';
      default: return 'text-muted';
    }
  });

  protected readonly valueColorClass = computed(() => {
    switch (this.variant()) {
      case 'brand': return 'text-brand-600 dark:text-brand-400';
      case 'success': return 'text-emerald-600 dark:text-emerald-400';
      case 'warning': return 'text-amber-600 dark:text-amber-400';
      case 'danger': return 'text-rose-600 dark:text-rose-400';
      default: return 'text-ink';
    }
  });
}
