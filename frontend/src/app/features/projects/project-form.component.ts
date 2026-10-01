import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PRESET_CURRENCIES, Project, ProjectFormData } from './project.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { I18nService } from '../../core/i18n/i18n.service';
import { IconComponent } from '../../shared/ui/icon.component';

@Component({
  selector: 'tf-project-form',
  standalone: true,
  imports: [FormsModule, TranslatePipe, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form (ngSubmit)="submit()" novalidate class="space-y-4 text-ink">
      <!-- Nom du projet -->
      <div>
        <label for="project-name" class="mb-1 block text-sm font-medium">{{ 'projects.name' | translate }} *</label>
        <input
          id="project-name"
          name="name"
          type="text"
          maxlength="200"
          [placeholder]="'projects.namePlaceholder' | translate"
          [ngModel]="name()"
          (ngModelChange)="name.set($event)"
          [attr.aria-invalid]="touched() && !name().trim()"
          class="min-h-11 w-full rounded-xl border border-border bg-app px-3 text-sm focus:border-brand-500 focus:outline-none" />
        @if (touched() && !name().trim()) {
          <p class="mt-1 text-xs text-error">{{ 'projects.nameRequired' | translate }}</p>
        }
      </div>

      <!-- Statuts : Actif & Facturable par défaut -->
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label class="flex items-start gap-2.5 rounded-xl border border-border bg-surface p-3 cursor-pointer select-none transition hover:bg-app">
          <input
            type="checkbox"
            name="active"
            [ngModel]="active()"
            (ngModelChange)="active.set($event)"
            class="mt-0.5 size-4 rounded text-brand-600 focus:ring-brand-500" />
          <div class="text-xs">
            <span class="font-medium text-ink block">{{ 'projects.active' | translate }}</span>
            <span class="text-muted block mt-0.5 leading-snug">{{ 'projects.activeDescription' | translate }}</span>
          </div>
        </label>

        <label class="flex items-start gap-2.5 rounded-xl border border-border bg-surface p-3 cursor-pointer select-none transition hover:bg-app">
          <input
            type="checkbox"
            name="billableDefault"
            [ngModel]="billableDefault()"
            (ngModelChange)="billableDefault.set($event)"
            class="mt-0.5 size-4 rounded text-brand-600 focus:ring-brand-500" />
          <div class="text-xs">
            <span class="font-medium text-ink block">{{ 'projects.billable' | translate }}</span>
            <span class="text-muted block mt-0.5 leading-snug">{{ 'projects.billableDescription' | translate }}</span>
          </div>
        </label>
      </div>

      <!-- Section Budget & Tarifs -->
      <div class="rounded-xl border border-border bg-surface p-4 space-y-3.5 shadow-2xs">
        <div class="flex items-center gap-2 border-b border-border/60 pb-2">
          <tf-icon name="receipt" [size]="16" class="text-brand-600 dark:text-brand-400" />
          <h3 class="text-xs font-semibold uppercase tracking-wider text-ink">{{ 'projects.financialsTitle' | translate }}</h3>
        </div>

        <!-- Devise -->
        <div>
          <label for="project-currency" class="mb-1 block text-xs font-medium text-muted">{{ 'projects.currency' | translate }}</label>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <select
              id="project-currency"
              name="currencyOption"
              [ngModel]="selectedCurrencyOption()"
              (ngModelChange)="selectedCurrencyOption.set($event)"
              class="min-h-10 w-full rounded-xl border border-border bg-app px-3 text-xs font-medium text-ink focus:border-brand-500 focus:outline-none">
              @for (preset of presets; track preset.code) {
                <option [value]="preset.code">{{ preset.label }}</option>
              }
              <option value="CUSTOM">{{ 'projects.currencyOther' | translate }}</option>
            </select>

            @if (selectedCurrencyOption() === 'CUSTOM') {
              <input
                id="custom-currency"
                name="customCurrency"
                type="text"
                maxlength="10"
                [placeholder]="'projects.customCurrencyCode' | translate"
                [ngModel]="customCurrency()"
                (ngModelChange)="customCurrency.set($event)"
                class="min-h-10 w-full rounded-xl border border-border bg-app px-3 text-xs uppercase focus:border-brand-500 focus:outline-none" />
            }
          </div>
        </div>

        <!-- Budget Jours & TJM -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label for="project-budget-days" class="mb-1 block text-xs font-medium text-muted">{{ 'projects.budgetDays' | translate }}</label>
            <div class="relative">
              <input
                id="project-budget-days"
                name="budgetDays"
                type="number"
                min="0"
                step="0.5"
                [placeholder]="'projects.budgetDaysPlaceholder' | translate"
                [ngModel]="budgetDays()"
                (ngModelChange)="budgetDays.set($event)"
                class="min-h-10 w-full rounded-xl border border-border bg-app px-3 pr-8 text-xs font-mono focus:border-brand-500 focus:outline-none" />
              <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted">j</span>
            </div>
            <p class="mt-1 text-[11px] text-muted">{{ 'projects.budgetDaysNotice' | translate }}</p>
          </div>

          <div>
            <label for="project-daily-rate" class="mb-1 block text-xs font-medium text-muted">{{ 'projects.dailyRate' | translate }}</label>
            <div class="relative">
              <input
                id="project-daily-rate"
                name="dailyRate"
                type="number"
                min="0"
                step="10"
                [placeholder]="'projects.dailyRatePlaceholder' | translate"
                [ngModel]="dailyRate()"
                (ngModelChange)="dailyRate.set($event)"
                class="min-h-10 w-full rounded-xl border border-border bg-app px-3 pr-10 text-xs font-mono focus:border-brand-500 focus:outline-none" />
              <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted">{{ currencySymbol() }} / j</span>
            </div>
            <p class="mt-1 text-[11px] text-muted">{{ 'projects.dailyRateNotice' | translate }}</p>
          </div>
        </div>

        <!-- Prix Total / Budget global -->
        <div>
          <label for="project-total-price" class="mb-1 block text-xs font-medium text-muted">{{ 'projects.totalPrice' | translate }}</label>
          <div class="relative">
            <input
              id="project-total-price"
              name="totalPrice"
              type="number"
              min="0"
              step="100"
              [placeholder]="'projects.totalPricePlaceholder' | translate"
              [ngModel]="totalPrice()"
              (ngModelChange)="totalPrice.set($event)"
              class="min-h-10 w-full rounded-xl border border-border bg-app px-3 pr-12 text-xs font-mono font-medium focus:border-brand-500 focus:outline-none" />
            <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted">{{ currencySymbol() }}</span>
          </div>
          <p class="mt-1 text-[11px] text-muted">{{ 'projects.totalPriceNotice' | translate }}</p>
        </div>

        <!-- Aides au calcul croisé -->
        @if (canSuggestPrice()) {
          <div class="flex items-center justify-between rounded-lg bg-brand-50/70 dark:bg-brand-950/30 p-2 text-xs text-brand-800 dark:text-brand-300">
            <span>{{ 'projects.calculatePrice' | translate:calculatePriceParams() }}</span>
            <button
              type="button"
              (click)="applyCalculatedPrice()"
              class="rounded-md bg-brand-600 px-2 py-0.5 text-[11px] font-semibold text-white transition hover:bg-brand-700 cursor-pointer">
              {{ 'projects.apply' | translate }}
            </button>
          </div>
        } @else if (canSuggestDays()) {
          <div class="flex items-center justify-between rounded-lg bg-brand-50/70 dark:bg-brand-950/30 p-2 text-xs text-brand-800 dark:text-brand-300">
            <span>{{ 'projects.calculateDays' | translate:calculateDaysParams() }}</span>
            <button
              type="button"
              (click)="applyCalculatedDays()"
              class="rounded-md bg-brand-600 px-2 py-0.5 text-[11px] font-semibold text-white transition hover:bg-brand-700 cursor-pointer">
              {{ 'projects.apply' | translate }}
            </button>
          </div>
        }
      </div>

      <!-- Actions -->
      <div class="flex flex-wrap justify-end gap-2 pt-2">
        <button
          type="button"
          (click)="cancelled.emit()"
          class="min-h-11 rounded-xl border border-border px-4 text-sm font-medium transition hover:bg-app cursor-pointer">
          {{ 'common.cancel' | translate }}
        </button>
        <button
          type="submit"
          [disabled]="busy()"
          class="min-h-11 rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-wait disabled:opacity-60 cursor-pointer">
          {{ busy() ? ('common.loading' | translate) : project() ? ('projects.saveProject' | translate) : ('projects.createProject' | translate) }}
        </button>
      </div>
    </form>
  `
})
export class ProjectFormComponent implements OnInit {
  protected readonly i18n = inject(I18nService);
  protected readonly presets = PRESET_CURRENCIES;

  readonly project = input<Project | null>(null);
  readonly busy = input(false);
  readonly saved = output<ProjectFormData>();
  readonly cancelled = output<void>();

  readonly name = signal('');
  readonly active = signal(true);
  readonly billableDefault = signal(true);
  readonly selectedCurrencyOption = signal('EUR');
  readonly customCurrency = signal('');
  readonly budgetDays = signal<number | null>(null);
  readonly dailyRate = signal<number | null>(null);
  readonly totalPrice = signal<number | null>(null);
  readonly touched = signal(false);

  readonly effectiveCurrency = computed(() => {
    if (this.selectedCurrencyOption() === 'CUSTOM') {
      const custom = this.customCurrency().trim().toUpperCase();
      return custom || 'EUR';
    }
    return this.selectedCurrencyOption();
  });

  readonly currencySymbol = computed(() => {
    const eff = this.effectiveCurrency();
    const preset = this.presets.find(p => p.code === eff);
    return preset ? preset.symbol : eff;
  });

  readonly calculatedTotalPrice = computed(() => {
    const days = this.budgetDays();
    const rate = this.dailyRate();
    if (days !== null && days !== undefined && rate !== null && rate !== undefined && days > 0 && rate > 0) {
      return Math.round(Number(days) * Number(rate) * 100) / 100;
    }
    return null;
  });

  readonly calculatedBudgetDays = computed(() => {
    const price = this.totalPrice();
    const rate = this.dailyRate();
    if (price !== null && price !== undefined && rate !== null && rate !== undefined && price > 0 && rate > 0) {
      return Math.round((Number(price) / Number(rate)) * 10) / 10;
    }
    return null;
  });

  readonly canSuggestPrice = computed(() => {
    const calc = this.calculatedTotalPrice();
    return calc !== null && (this.totalPrice() === null || this.totalPrice() === undefined || Math.abs(Number(this.totalPrice()) - calc) > 0.01);
  });

  readonly canSuggestDays = computed(() => {
    const calc = this.calculatedBudgetDays();
    return calc !== null && (this.budgetDays() === null || this.budgetDays() === undefined || Math.abs(Number(this.budgetDays()) - calc) > 0.01);
  });

  readonly calculatePriceParams = computed(() => ({
    days: this.budgetDays() ?? 0,
    rate: this.dailyRate() ?? 0,
    amount: this.formatCalculatedPrice()
  }));

  readonly calculateDaysParams = computed(() => ({
    price: this.totalPrice() ?? 0,
    rate: this.dailyRate() ?? 0,
    days: this.calculatedBudgetDays() ?? 0
  }));

  ngOnInit(): void {
    const p = this.project();
    if (!p) return;
    this.name.set(p.name);
    this.active.set(p.active);
    this.billableDefault.set(p.billableDefault);
    const curr = (p.currency || 'EUR').trim().toUpperCase();
    const isPreset = this.presets.some(preset => preset.code === curr);
    if (isPreset) {
      this.selectedCurrencyOption.set(curr);
    } else {
      this.selectedCurrencyOption.set('CUSTOM');
      this.customCurrency.set(curr);
    }
    this.budgetDays.set(p.budgetDays ?? null);
    this.dailyRate.set(p.dailyRate ?? null);
    this.totalPrice.set(p.totalPrice ?? null);
  }

  formatCalculatedPrice(): string {
    const calc = this.calculatedTotalPrice();
    if (calc === null) return '';
    return `${this.i18n.formatNumber(calc)} ${this.currencySymbol()}`;
  }

  applyCalculatedPrice(): void {
    const calc = this.calculatedTotalPrice();
    if (calc !== null) {
      this.totalPrice.set(calc);
    }
  }

  applyCalculatedDays(): void {
    const calc = this.calculatedBudgetDays();
    if (calc !== null) {
      this.budgetDays.set(calc);
    }
  }

  submit(): void {
    this.touched.set(true);
    const nameValid = !!this.name().trim();
    if (!nameValid || this.busy()) return;

    this.saved.emit({
      name: this.name().trim(),
      active: this.active(),
      billableDefault: this.billableDefault(),
      currency: this.effectiveCurrency(),
      budgetDays: this.budgetDays() !== null && this.budgetDays() !== undefined && this.budgetDays() !== ('' as any)
        ? Number(this.budgetDays()) : null,
      dailyRate: this.dailyRate() !== null && this.dailyRate() !== undefined && this.dailyRate() !== ('' as any)
        ? Number(this.dailyRate()) : null,
      totalPrice: this.totalPrice() !== null && this.totalPrice() !== undefined && this.totalPrice() !== ('' as any)
        ? Number(this.totalPrice()) : null
    });
  }
}
