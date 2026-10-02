import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../shared/ui/icon.component';
import { PublicHoliday } from './work-schedule.models';
import { PublicHolidayService } from './public-holiday.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { I18nService } from '../../core/i18n/i18n.service';

@Component({
  selector: 'tf-public-holidays-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-5">
      <!-- Barre d'outils : sélecteur d'année et action d'ajout -->
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-center gap-2">
          <span class="text-xs font-semibold uppercase tracking-wider text-muted">{{ 'workSchedules.holidays.year' | translate }}</span>
          <div class="inline-flex rounded-lg border border-border bg-surface p-0.5 shadow-2xs">
            <button
              type="button"
              (click)="changeYear(2026)"
              [class]="selectedYear() === 2026 ? 'bg-brand-50 text-brand-600 font-semibold' : 'text-muted hover:text-ink'"
              class="rounded-md px-3 py-1 text-xs transition">
              2026
            </button>
            <button
              type="button"
              (click)="changeYear(2027)"
              [class]="selectedYear() === 2027 ? 'bg-brand-50 text-brand-600 font-semibold' : 'text-muted hover:text-ink'"
              class="rounded-md px-3 py-1 text-xs transition">
              2027
            </button>
          </div>
        </div>

        <button
          type="button"
          (click)="openAddModal()"
          class="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs transition hover:bg-brand-500 whitespace-nowrap">
          <tf-icon name="plus" [size]="14" />
          <span>{{ 'workSchedules.holidays.addHoliday' | translate }}</span>
        </button>
      </div>

      <!-- Synthèse des jours fériés -->
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div class="rounded-xl border border-border bg-surface p-3.5 shadow-2xs">
          <p class="text-xs font-medium uppercase tracking-wider text-muted">{{ 'workSchedules.holidays.totalHolidays' | translate }}</p>
          <p class="mt-1 text-2xl font-bold text-ink">{{ holidays().length }}</p>
          <p class="mt-0.5 text-xs text-muted">{{ 'workSchedules.holidays.yearLabel' | translate:{ year: selectedYear() } }}</p>
        </div>
        <div class="rounded-xl border border-border bg-surface p-3.5 shadow-2xs">
          <p class="text-xs font-medium uppercase tracking-wider text-muted">{{ 'workSchedules.holidays.offDays' | translate }}</p>
          <p class="mt-1 text-2xl font-bold text-slate">{{ offCount() }}</p>
          <p class="mt-0.5 text-xs text-muted">{{ 'workSchedules.holidays.offDaysSub' | translate }}</p>
        </div>
        <div class="rounded-xl border border-border bg-surface p-3.5 shadow-2xs">
          <p class="text-xs font-medium uppercase tracking-wider text-muted">{{ 'workSchedules.holidays.workedDays' | translate }}</p>
          <p class="mt-1 text-2xl font-bold text-purple-600">{{ workedCount() }}</p>
          <p class="mt-0.5 text-xs text-muted">{{ 'workSchedules.holidays.workedDaysSub' | translate }}</p>
        </div>
      </div>

      <!-- Messages de feedback -->
      @if (feedbackMessage()) {
        <div class="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-800">
          <tf-icon name="check" class="shrink-0 text-emerald-600" [size]="14" />
          <span>{{ feedbackMessage() }}</span>
        </div>
      }
      @if (feedbackError()) {
        <div class="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800">
          <tf-icon name="alert" class="shrink-0 text-red-600" [size]="14" />
          <span>{{ feedbackError() }}</span>
        </div>
      }

      <!-- Vue mobile : cartes tactiles (< lg) -->
      <div class="space-y-2.5 block lg:hidden">
        @if (loading()) {
          <div class="rounded-xl border border-border bg-surface p-6 text-center text-xs text-muted">
            {{ 'workSchedules.holidays.loading' | translate }}
          </div>
        } @else if (holidays().length === 0) {
          <div class="rounded-xl border border-border bg-surface p-6 text-center text-xs text-muted">
            {{ 'workSchedules.holidays.empty' | translate:{ year: selectedYear() } }}
          </div>
        } @else {
          @for (h of holidays(); track h.id) {
            <div class="rounded-xl border border-border bg-surface p-3.5 shadow-2xs space-y-2">
              <div class="flex items-center justify-between gap-2">
                <span class="inline-flex items-center gap-1.5 rounded-md bg-purple-50 px-2 py-0.5 font-mono text-xs font-semibold text-purple-700">
                  <tf-icon name="calendar" [size]="12" />
                  {{ formatDate(h.holidayDate) }}
                </span>
                @if (h.isWorked) {
                  <span class="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-semibold text-purple-800">
                    {{ 'workSchedules.holidays.worked' | translate }}
                  </span>
                } @else {
                  <span class="inline-flex items-center rounded-full bg-slate/10 px-2 py-0.5 text-[11px] font-semibold text-slate">
                    {{ 'workSchedules.holidays.off' | translate }}
                  </span>
                }
              </div>
              <div>
                <p class="text-sm font-semibold text-ink leading-tight">{{ h.name }}</p>
                <p class="text-xs text-muted mt-0.5">{{ formatFullDate(h.holidayDate) }}</p>
              </div>
              <div class="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
                <button
                  type="button"
                  (click)="toggleWorked(h)"
                  class="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-ink transition hover:bg-app whitespace-nowrap">
                  {{ h.isWorked ? ('workSchedules.holidays.markAsOff' | translate) : ('workSchedules.holidays.markAsWorked' | translate) }}
                </button>
                <button
                  type="button"
                  (click)="deleteHoliday(h)"
                  class="rounded-lg p-1 text-muted transition hover:bg-red-50 hover:text-red-600"
                  [attr.title]="'common.delete' | translate">
                  <tf-icon name="trash" [size]="14" />
                </button>
              </div>
            </div>
          }
        }
      </div>

      <!-- Vue desktop : grand tableau sans coupure de texte (hidden lg:block) -->
      <div class="hidden lg:block overflow-hidden rounded-xl border border-border bg-surface shadow-2xs">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-border bg-app/50 text-xs font-semibold uppercase tracking-wider text-muted">
            <tr>
              <th scope="col" class="px-5 py-3 whitespace-nowrap">{{ 'workSchedules.holidays.colDate' | translate }}</th>
              <th scope="col" class="px-5 py-3 whitespace-nowrap">{{ 'workSchedules.holidays.colDayOfWeek' | translate }}</th>
              <th scope="col" class="px-5 py-3 whitespace-nowrap">{{ 'workSchedules.holidays.colName' | translate }}</th>
              <th scope="col" class="px-5 py-3 whitespace-nowrap">{{ 'workSchedules.holidays.colWorkStatus' | translate }}</th>
              <th scope="col" class="px-5 py-3 whitespace-nowrap text-right">{{ 'common.actions' | translate }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            @if (loading()) {
              <tr>
                <td colspan="5" class="px-5 py-8 text-center text-muted">{{ 'workSchedules.holidays.loading' | translate }}</td>
              </tr>
            } @else if (holidays().length === 0) {
              <tr>
                <td colspan="5" class="px-5 py-8 text-center text-muted">{{ 'workSchedules.holidays.empty' | translate:{ year: selectedYear() } }}</td>
              </tr>
            } @else {
              @for (h of holidays(); track h.id) {
                <tr class="transition hover:bg-app/40">
                  <td class="px-5 py-3.5 font-mono text-xs font-medium text-ink whitespace-nowrap">
                    {{ formatDate(h.holidayDate) }}
                  </td>
                  <td class="px-5 py-3.5 text-xs text-muted capitalize whitespace-nowrap">
                    {{ formatDayOfWeek(h.holidayDate) }}
                  </td>
                  <td class="px-5 py-3.5 font-medium text-ink whitespace-nowrap">
                    {{ h.name }}
                  </td>
                  <td class="px-5 py-3.5 whitespace-nowrap">
                    @if (h.isWorked) {
                      <span class="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800">
                        {{ 'workSchedules.holidays.workedWithBonus' | translate }}
                      </span>
                    } @else {
                      <span class="inline-flex items-center rounded-full bg-slate/10 px-2.5 py-0.5 text-xs font-semibold text-slate">
                        {{ 'workSchedules.holidays.offLegal' | translate }}
                      </span>
                    }
                  </td>
                  <td class="px-5 py-3.5 text-right whitespace-nowrap">
                    <div class="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        (click)="toggleWorked(h)"
                        class="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-ink transition hover:bg-app whitespace-nowrap">
                        {{ h.isWorked ? ('workSchedules.holidays.markAsOff' | translate) : ('workSchedules.holidays.markAsWorked' | translate) }}
                      </button>
                      <button
                        type="button"
                        (click)="deleteHoliday(h)"
                        class="rounded-lg p-1.5 text-muted transition hover:bg-red-50 hover:text-red-600"
                        [attr.title]="'common.delete' | translate">
                        <tf-icon name="trash" [size]="14" />
                      </button>
                    </div>
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>

      <!-- Modale d'ajout d'un jour férié -->
      @if (showModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs" role="dialog" aria-modal="true">
          <div class="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-xl">
            <h3 class="text-lg font-bold text-ink">{{ 'workSchedules.holidays.modalTitle' | translate }}</h3>
            <p class="mt-1 text-xs text-muted">{{ 'workSchedules.holidays.modalWorkedSub' | translate }}</p>

            <form (ngSubmit)="confirmAddHoliday()" class="mt-4 space-y-4">
              <div>
                <label for="holiday-date" class="block text-xs font-semibold uppercase tracking-wider text-muted">{{ 'workSchedules.holidays.modalDateLabel' | translate }} *</label>
                <input
                  type="date"
                  id="holiday-date"
                  [(ngModel)]="newHolidayDate"
                  name="holidayDate"
                  required
                  class="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600" />
              </div>

              <div>
                <label for="holiday-name" class="block text-xs font-semibold uppercase tracking-wider text-muted">{{ 'workSchedules.holidays.modalNameLabel' | translate }} *</label>
                <input
                  type="text"
                  id="holiday-name"
                  [(ngModel)]="newHolidayName"
                  name="holidayName"
                  required
                  class="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600" />
              </div>

              <div class="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="holiday-worked"
                  [(ngModel)]="newHolidayWorked"
                  name="holidayWorked"
                  class="size-4 rounded border-border text-brand-600 focus:ring-brand-600" />
                <label for="holiday-worked" class="text-sm font-medium text-ink">{{ 'workSchedules.holidays.modalWorkedLabel' | translate }}</label>
              </div>

              <div class="mt-6 flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  (click)="showModal.set(false)"
                  class="rounded-lg border border-border px-3.5 py-2 text-xs font-medium text-muted hover:bg-app">
                  {{ 'common.cancel' | translate }}
                </button>
                <button
                  type="submit"
                  [disabled]="!newHolidayDate || !newHolidayName.trim()"
                  class="rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-500 disabled:opacity-40">
                  {{ 'common.save' | translate }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `
})
export class PublicHolidaysPanelComponent implements OnInit {
  private readonly holidayService = inject(PublicHolidayService);
  readonly i18n = inject(I18nService);

  readonly selectedYear = signal(new Date().getFullYear());
  readonly holidays = signal<PublicHoliday[]>([]);
  readonly loading = signal(false);
  readonly feedbackMessage = this.i18n.messageSignal(null);
  readonly feedbackError = this.i18n.messageSignal(null);

  readonly showModal = signal(false);
  newHolidayDate = '';
  newHolidayName = '';
  newHolidayWorked = false;

  readonly offCount = computed(() => this.holidays().filter(h => !h.isWorked).length);
  readonly workedCount = computed(() => this.holidays().filter(h => h.isWorked).length);

  ngOnInit(): void {
    this.loadHolidays();
  }

  changeYear(year: number): void {
    this.selectedYear.set(year);
    this.loadHolidays();
  }

  loadHolidays(): void {
    this.loading.set(true);
    this.feedbackError.set(null);
    this.holidayService.listHolidays(this.selectedYear()).subscribe({
      next: data => {
        this.holidays.set(data);
        this.loading.set(false);
      },
      error: err => {
        this.feedbackError.set(() => this.i18n.problem(err, this.i18n.t('messages.loadHolidays')));
        this.loading.set(false);
      }
    });
  }

  toggleWorked(holiday: PublicHoliday): void {
    const updatedStatus = !holiday.isWorked;
    this.holidayService.updateHoliday(holiday.id, {
      name: holiday.name,
      isWorked: updatedStatus
    }).subscribe({
      next: updated => {
        this.holidays.update(list => list.map(item => item.id === updated.id ? updated : item));
        this.showFeedback(() => this.i18n.t('messages.holidayStatus', { name: holiday.name, status: this.i18n.t(updatedStatus ? 'workSchedules.holidays.worked' : 'workSchedules.holidays.off') }));
      },
      error: err => this.showError(() => this.i18n.problem(err, this.i18n.t('messages.updateFailed')))
    });
  }

  openAddModal(): void {
    this.newHolidayDate = `${this.selectedYear()}-01-01`;
    this.newHolidayName = '';
    this.newHolidayWorked = false;
    this.showModal.set(true);
  }

  confirmAddHoliday(): void {
    if (!this.newHolidayDate || !this.newHolidayName.trim()) return;

    this.holidayService.createHoliday({
      holidayDate: this.newHolidayDate,
      name: this.newHolidayName.trim(),
      isWorked: this.newHolidayWorked
    }).subscribe({
      next: created => {
        this.showModal.set(false);
        this.loadHolidays();
        this.showFeedback(() => this.i18n.t('messages.holidayAdded', { name: created.name }));
      },
      error: err => this.showError(() => this.i18n.problem(err, this.i18n.t('messages.createFailed')))
    });
  }

  deleteHoliday(holiday: PublicHoliday): void {
    if (!confirm(this.i18n.t('messages.deleteHoliday', { name: holiday.name }))) return;

    this.holidayService.deleteHoliday(holiday.id).subscribe({
      next: () => {
        this.holidays.update(list => list.filter(h => h.id !== holiday.id));
        this.showFeedback(() => this.i18n.t('messages.holidayDeleted', { name: holiday.name }));
      },
      error: err => this.showError(() => this.i18n.problem(err, this.i18n.t('messages.deleteFailed')))
    });
  }

  formatDate(isoDate: string): string {
    const [y, m, d] = isoDate.split('-');
    return this.i18n.currentLang() === 'en' ? `${m}/${d}/${y}` : `${d}/${m}/${y}`;
  }

  formatFullDate(isoDate: string): string {
    try {
      const date = new Date(isoDate + 'T00:00:00');
      const locale = this.i18n.currentLang() === 'en' ? 'en-US' : 'fr-FR';
      return new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date);
    } catch {
      return isoDate;
    }
  }

  formatDayOfWeek(isoDate: string): string {
    try {
      const date = new Date(isoDate + 'T00:00:00');
      const locale = this.i18n.currentLang() === 'en' ? 'en-US' : 'fr-FR';
      return new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date);
    } catch {
      return '';
    }
  }

  private showFeedback(msg: string | (() => string)): void {
    this.feedbackMessage.set(msg);
    setTimeout(() => this.feedbackMessage.set(null), 4000);
  }

  private showError(err: string | (() => string)): void {
    this.feedbackError.set(err);
    setTimeout(() => this.feedbackError.set(null), 5000);
  }
}
