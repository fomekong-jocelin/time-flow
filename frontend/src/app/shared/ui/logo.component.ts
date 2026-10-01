import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type LogoVariant = 'horizontal' | 'stacked' | 'symbol' | 'app-icon';

/**
 * Logo TimeFlow by INDYLI (charte v0.1, §2 et §4) : symbole « temps + mouvement »
 * en dégradé bleu clair → indigo → violet, wordmark « Time » + « Flow ».
 * Le symbole est servi en SVG autonome (public/brand) : un dégradé inline casserait
 * avec <base href> dès qu'on change de route.
 * Taille minimale écran : symbole ≥ 20 px, lockup complet ≥ 110 px de large.
 */
@Component({
  selector: 'tf-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
  template: `
    @if (variant() === 'app-icon') {
      <img src="brand/timeflow-app-icon.svg" alt="TimeFlow" [width]="size()" [height]="size()" />
    } @else {
      <span class="flex items-center" [class]="variant() === 'stacked' ? 'flex-col gap-1.5' : 'gap-2'">
        <img
          src="brand/timeflow-symbol.svg"
          [alt]="variant() === 'symbol' ? 'TimeFlow' : ''"
          [width]="symbolWidth()"
          [height]="size()" />
        @if (variant() !== 'symbol') {
          <span class="flex flex-col items-end leading-none">
            <span class="font-bold tracking-tight" [style.font-size.px]="wordmarkSize()">
              <span class="text-ink">Time</span><span class="bg-linear-to-r from-brand-600 to-violet-500 bg-clip-text text-transparent">Flow</span>
            </span>
            @if (baseline()) {
              <span class="mt-0.5 font-semibold text-ink" [style.font-size.px]="baselineSize()">by INDYLI</span>
            }
          </span>
        }
      </span>
    }
  `
})
export class LogoComponent {
  readonly variant = input<LogoVariant>('horizontal');
  /** Hauteur du symbole en pixels. */
  readonly size = input(32);
  /** Affiche la baseline « by INDYLI ». */
  readonly baseline = input(true);

  protected readonly symbolWidth = computed(() => Math.round(this.size() * 1.2));
  protected readonly wordmarkSize = computed(() => Math.round(this.size() * 0.66));
  protected readonly baselineSize = computed(() => Math.max(Math.round(this.size() * 0.26), 9));
}
