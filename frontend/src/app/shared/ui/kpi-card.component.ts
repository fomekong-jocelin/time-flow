import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Carte synthétique KPI réutilisable pour TimeFlow.
 * Affiche une métrique clé avec titre, valeur et description/sous-texte.
 */
@Component({
  selector: 'tf-kpi-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded-xl border border-border bg-surface p-4 shadow-2xs transition hover:border-brand-300">
      <p class="text-xs font-medium uppercase tracking-wider text-muted">{{ label() }}</p>
      <p class="mt-1 text-2xl font-bold tracking-tight" [class]="valueColorClass()">
        {{ value() }}
      </p>
      @if (description()) {
        <p class="mt-1 text-xs text-muted leading-relaxed">{{ description() }}</p>
      }
    </div>
  `
})
export class KpiCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly description = input<string>('');
  readonly variant = input<'default' | 'brand' | 'success' | 'warning' | 'danger'>('default');

  protected readonly valueColorClass = computed(() => {
    switch (this.variant()) {
      case 'brand': return 'text-brand-600';
      case 'success': return 'text-emerald-600';
      case 'warning': return 'text-amber-600';
      case 'danger': return 'text-rose-600';
      default: return 'text-ink';
    }
  });
}
