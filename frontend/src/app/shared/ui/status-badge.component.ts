import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'brand';

/**
 * Badge de statut unifié et réutilisable pour TimeFlow.
 * Garantit un alignement et une palette harmonieuse sur mobile et desktop.
 */
@Component({
  selector: 'tf-status-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap border shadow-2xs"
      [class]="variantClasses()">
      <span class="size-1.5 rounded-full shrink-0" [class]="dotClass()"></span>
      <ng-content />
    </span>
  `
})
export class StatusBadgeComponent {
  readonly variant = input<BadgeVariant>('neutral');

  protected readonly variantClasses = computed(() => {
    switch (this.variant()) {
      case 'success':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
      case 'warning':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
      case 'danger':
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800';
      case 'info':
        return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800';
      case 'brand':
        return 'bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-950/40 dark:text-brand-300 dark:border-brand-800';
      case 'neutral':
      default:
        return 'bg-app text-muted border-border dark:bg-slate-900/60 dark:text-slate-300 dark:border-slate-800';
    }
  });

  protected readonly dotClass = computed(() => {
    switch (this.variant()) {
      case 'success': return 'bg-emerald-500';
      case 'warning': return 'bg-amber-500';
      case 'danger': return 'bg-rose-500';
      case 'info':
      case 'brand': return 'bg-brand-500';
      case 'neutral':
      default: return 'bg-zinc-400';
    }
  });
}
