import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { MoneyTotal } from './billing.models';
import { formatMoney } from './money-format';

@Component({
  selector: 'tf-money-totals', standalone: true, imports: [TranslatePipe], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-1">
      @for (item of items(); track item.currency) {
        <p class="break-words font-mono font-semibold">{{ money(item.amount, item.currency) }}</p>
        @if (item.unpricedBillableMinutes > 0) {
          <p class="text-xs font-normal text-error">{{ 'billing.fix.unpriced' | translate:{hours: i18n.formatNumber(item.unpricedBillableMinutes / 60)} }}</p>
        }
      } @empty { <span class="text-muted">–</span> }
    </div>
  `
})
export class MoneyTotalsComponent {
  protected readonly i18n = inject(I18nService);
  readonly items = input<MoneyTotal[]>([]);
  money(amount: number, currency: string): string { return formatMoney(amount, currency, this.i18n.locale()); }
}
