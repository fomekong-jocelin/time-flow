import { ChangeDetectionStrategy, Component, computed, EventEmitter, inject, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../shared/ui/icon.component';
import { WorkScheduleProfile } from './work-schedule.models';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { I18nService } from '../../core/i18n/i18n.service';

@Component({
  selector: 'tf-overtime-policies-panel',
  standalone: true,
  imports: [CommonModule, IconComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-5">
      <!-- Synthèse générale des règles légales OT & ET -->
      <div class="rounded-xl border border-border bg-surface p-4 shadow-2xs">
        <div class="flex items-start gap-3">
          <div class="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
            <tf-icon name="sliders" [size]="18" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-ink">{{ 'workSchedules.overtime.bannerTitle' | translate }}</h3>
            <p class="mt-1 text-xs text-muted leading-relaxed">
              <strong>OT (Overtime)</strong> {{ 'workSchedules.overtime.bannerOtDesc' | translate }}<br>
              <strong>ET (Extra Time)</strong> {{ 'workSchedules.overtime.bannerEtDesc' | translate }}
            </p>
          </div>
        </div>
      </div>

      <!-- KPI Synthétiques -->
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div class="rounded-xl border border-border bg-surface p-3.5 shadow-2xs">
          <p class="text-xs font-medium uppercase tracking-wider text-muted">{{ 'workSchedules.overtime.kpiOtThreshold' | translate }}</p>
          <p class="mt-1 text-2xl font-bold text-brand-600">35 h {{ 'workSchedules.perWeekShort' | translate }}</p>
          <p class="mt-0.5 text-xs text-muted">{{ 'workSchedules.overtime.kpiOtThresholdSub' | translate }}</p>
        </div>
        <div class="rounded-xl border border-border bg-surface p-3.5 shadow-2xs">
          <p class="text-xs font-medium uppercase tracking-wider text-muted">{{ 'workSchedules.overtime.kpiLegalBonuses' | translate }}</p>
          <div class="mt-1 flex items-center gap-2">
            <span class="rounded bg-brand-50 px-1.5 py-0.5 text-xs font-bold text-brand-700">+25%</span>
            <span class="rounded bg-brand-50 px-1.5 py-0.5 text-xs font-bold text-brand-700">+50%</span>
            <span class="rounded bg-purple-100 px-1.5 py-0.5 text-xs font-bold text-purple-800">+100% {{ 'timesheets.holiday' | translate }}</span>
          </div>
          <p class="mt-0.5 text-xs text-muted">{{ 'workSchedules.overtime.kpiLegalBonusesSub' | translate }}</p>
        </div>
        <div class="rounded-xl border border-border bg-surface p-3.5 shadow-2xs">
          <p class="text-xs font-medium uppercase tracking-wider text-muted">{{ 'workSchedules.overtime.kpiEtRegimes' | translate }}</p>
          <p class="mt-1 text-2xl font-bold text-teal-600">{{ etEnabledCount() }} / {{ profiles.length }}</p>
          <p class="mt-0.5 text-xs text-muted">{{ 'workSchedules.overtime.kpiEtRegimesSub' | translate }}</p>
        </div>
      </div>

      <!-- Vue mobile : cartes d'application (< lg) -->
      <div class="space-y-3 block lg:hidden">
        @for (profile of profiles; track profile.id) {
          <div class="rounded-xl border border-border bg-surface p-4 shadow-2xs space-y-3">
            <div class="flex items-center justify-between gap-2">
              <span class="font-bold text-ink text-sm">{{ profile.name }}</span>
              <span class="font-mono text-xs text-muted">{{ profile.code }}</span>
            </div>

            <!-- Paramètres OT -->
            <div class="rounded-lg bg-app/50 p-2.5 space-y-1.5">
              <p class="text-xs font-semibold uppercase tracking-wider text-brand-600">{{ 'workSchedules.overtime.otRules' | translate }}</p>
              <div class="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span class="text-muted">{{ 'workSchedules.overtime.threshold' | translate }} </span>
                  <span class="font-medium text-ink">{{ formatMinutes(profile.overtimeThresholdMinutes) }} {{ 'workSchedules.perWeekShort' | translate }}</span>
                </div>
                <div>
                  <span class="text-muted">{{ 'workSchedules.overtime.compensation' | translate }} </span>
                  <span class="font-medium text-ink">{{ compensationLabel(profile.overtimeCompensationMode) }}</span>
                </div>
                <div>
                  <span class="text-muted">{{ 'workSchedules.overtime.tier1' | translate }} </span>
                  <span class="font-medium text-ink">+{{ formatRate(profile.overtimeRateTier1) }}%</span>
                </div>
                <div>
                  <span class="text-muted">{{ 'workSchedules.overtime.tier2' | translate }} </span>
                  <span class="font-medium text-ink">+{{ formatRate(profile.overtimeRateTier2) }}%</span>
                </div>
                <div class="col-span-2">
                  <span class="text-muted">{{ 'workSchedules.overtime.sundayHoliday' | translate }} </span>
                  <span class="font-bold text-purple-700">+{{ formatRate(profile.overtimeRateHoliday) }}%</span>
                </div>
              </div>
            </div>

            <!-- Paramètres ET -->
            <div class="rounded-lg bg-app/50 p-2.5 space-y-1.5">
              <div class="flex items-center justify-between">
                <p class="text-xs font-semibold uppercase tracking-wider text-teal-600">{{ 'workSchedules.overtime.etRules' | translate }}</p>
                @if (profile.extraTimeAllowed) {
                  <span class="rounded bg-teal-50 px-1.5 py-0.2 text-[10px] font-semibold text-teal-700">{{ 'workSchedules.overtime.allowed' | translate }}</span>
                } @else {
                  <span class="rounded bg-zinc-100 px-1.5 py-0.2 text-[10px] font-semibold text-zinc-500">{{ 'workSchedules.overtime.notAllowed' | translate }}</span>
                }
              </div>
              @if (profile.extraTimeAllowed) {
                <div class="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span class="text-muted">{{ 'workSchedules.overtime.maxCap' | translate }} </span>
                    <span class="font-medium text-ink">{{ formatMinutes(profile.extraTimeMaxWeeklyMinutes) }} {{ 'workSchedules.perWeekShort' | translate }}</span>
                  </div>
                  <div>
                    <span class="text-muted">{{ 'workSchedules.overtime.bonus' | translate }} </span>
                    <span class="font-medium text-ink">+{{ formatRate(profile.extraTimeRate) }}%</span>
                  </div>
                </div>
              }
            </div>

            <div class="pt-2 border-t border-border flex justify-end">
              <button
                type="button"
                (click)="editRequested.emit(profile)"
                class="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-app">
                {{ 'workSchedules.overtime.adjustRules' | translate }}
              </button>
            </div>
          </div>
        }
      </div>

      <!-- Vue desktop : grand tableau sans coupure de texte (hidden lg:block) -->
      <div class="hidden lg:block overflow-hidden rounded-xl border border-border bg-surface shadow-2xs">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-border bg-app/50 text-xs font-semibold uppercase tracking-wider text-muted">
            <tr>
              <th scope="col" class="px-5 py-3 whitespace-nowrap">{{ 'workSchedules.overtime.colRegime' | translate }}</th>
              <th scope="col" class="px-5 py-3 whitespace-nowrap">{{ 'workSchedules.overtime.colOtThreshold' | translate }}</th>
              <th scope="col" class="px-5 py-3 whitespace-nowrap">{{ 'workSchedules.overtime.colBonusT1' | translate }}</th>
              <th scope="col" class="px-5 py-3 whitespace-nowrap">{{ 'workSchedules.overtime.colBonusT2' | translate }}</th>
              <th scope="col" class="px-5 py-3 whitespace-nowrap">{{ 'workSchedules.overtime.colBonusHoliday' | translate }}</th>
              <th scope="col" class="px-5 py-3 whitespace-nowrap">{{ 'workSchedules.overtime.colOtCompensation' | translate }}</th>
              <th scope="col" class="px-5 py-3 whitespace-nowrap">{{ 'workSchedules.overtime.colExtraTime' | translate }}</th>
              <th scope="col" class="px-5 py-3 whitespace-nowrap text-right">{{ 'common.actions' | translate }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            @for (profile of profiles; track profile.id) {
              <tr class="transition hover:bg-app/40">
                <td class="px-5 py-3.5 whitespace-nowrap">
                  <div class="font-semibold text-ink">{{ profile.name }}</div>
                  <div class="font-mono text-xs text-muted">{{ profile.code }}</div>
                </td>
                <td class="px-5 py-3.5 font-medium text-ink whitespace-nowrap">
                  {{ formatMinutes(profile.overtimeThresholdMinutes) }} {{ 'workSchedules.perWeekShort' | translate }}
                </td>
                <td class="px-5 py-3.5 whitespace-nowrap">
                  <span class="inline-flex rounded bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
                    +{{ formatRate(profile.overtimeRateTier1) }}%
                  </span>
                </td>
                <td class="px-5 py-3.5 whitespace-nowrap">
                  <span class="inline-flex rounded bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
                    +{{ formatRate(profile.overtimeRateTier2) }}%
                  </span>
                </td>
                <td class="px-5 py-3.5 whitespace-nowrap">
                  <span class="inline-flex rounded bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-800">
                    +{{ formatRate(profile.overtimeRateHoliday) }}%
                  </span>
                </td>
                <td class="px-5 py-3.5 whitespace-nowrap">
                  <span class="inline-flex items-center rounded-md border border-border px-2 py-0.5 text-xs font-medium text-ink">
                    {{ compensationLabel(profile.overtimeCompensationMode) }}
                  </span>
                </td>
                <td class="px-5 py-3.5 whitespace-nowrap">
                  @if (profile.extraTimeAllowed) {
                    <div class="text-xs">
                      <span class="font-semibold text-teal-700">Max {{ formatMinutes(profile.extraTimeMaxWeeklyMinutes) }}</span>
                      <span class="text-muted ml-1">(+{{ formatRate(profile.extraTimeRate) }}%)</span>
                    </div>
                  } @else {
                    <span class="text-xs text-muted">{{ 'workSchedules.overtime.notApplicable' | translate }}</span>
                  }
                </td>
                <td class="px-5 py-3.5 text-right whitespace-nowrap">
                  <button
                    type="button"
                    (click)="editRequested.emit(profile)"
                    class="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-ink transition hover:bg-app whitespace-nowrap">
                    {{ 'common.edit' | translate }}
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class OvertimePoliciesPanelComponent {
  readonly i18n = inject(I18nService);
  @Input({ required: true }) profiles: WorkScheduleProfile[] = [];
  @Output() editRequested = new EventEmitter<WorkScheduleProfile>();

  readonly etEnabledCount = computed(() => this.profiles.filter(p => p.extraTimeAllowed).length);

  formatMinutes(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins === 0 ? `${hours} h` : `${hours} h ${mins.toString().padStart(2, '0')}`;
  }

  formatRate(rate: number): string {
    const percentage = Math.round((rate - 1.0) * 100);
    return percentage > 0 ? `${percentage}` : '0';
  }

  compensationLabel(mode: string): string {
    switch (mode) {
      case 'RECOVERY':
        return this.i18n.t('workSchedules.overtime.compRecovery');
      case 'HYBRID':
        return this.i18n.t('workSchedules.overtime.compHybrid');
      case 'PAY':
      default:
        return this.i18n.t('workSchedules.overtime.compPay');
    }
  }
}
