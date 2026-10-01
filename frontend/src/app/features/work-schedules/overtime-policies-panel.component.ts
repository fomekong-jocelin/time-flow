import { ChangeDetectionStrategy, Component, computed, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../shared/ui/icon.component';
import { WorkScheduleProfile } from './work-schedule.models';

@Component({
  selector: 'tf-overtime-policies-panel',
  standalone: true,
  imports: [CommonModule, IconComponent],
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
            <h3 class="text-sm font-bold text-ink">Cadre des Heures Supplémentaires (OT) & Heures Complémentaires (ET)</h3>
            <p class="mt-1 text-xs text-muted leading-relaxed">
              <strong>OT (Overtime)</strong> s'applique aux heures excédant la durée légale ou contractuelle (ex: au-delà de 35h avec majoration de +25%, +50%, ou +100% le dimanche et jours fériés).<br>
              <strong>ET (Extra Time)</strong> s'applique aux heures complémentaires effectuées par les collaborateurs à temps partiel (majoration de +10% dans la limite contractuelle autorisée).
            </p>
          </div>
        </div>
      </div>

      <!-- KPI Synthétiques -->
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div class="rounded-xl border border-border bg-surface p-3.5 shadow-2xs">
          <p class="text-xs font-medium uppercase tracking-wider text-muted">Seuil OT standard</p>
          <p class="mt-1 text-2xl font-bold text-brand-600">35 h / sem</p>
          <p class="mt-0.5 text-xs text-muted">Déclenchement des tranches T1 & T2</p>
        </div>
        <div class="rounded-xl border border-border bg-surface p-3.5 shadow-2xs">
          <p class="text-xs font-medium uppercase tracking-wider text-muted">Majorations Légales OT</p>
          <div class="mt-1 flex items-center gap-2">
            <span class="rounded bg-brand-50 px-1.5 py-0.5 text-xs font-bold text-brand-700">+25%</span>
            <span class="rounded bg-brand-50 px-1.5 py-0.5 text-xs font-bold text-brand-700">+50%</span>
            <span class="rounded bg-purple-100 px-1.5 py-0.5 text-xs font-bold text-purple-800">+100% Férié</span>
          </div>
          <p class="mt-0.5 text-xs text-muted">Tranche 1, Tranche 2, Dimanches/Fériés</p>
        </div>
        <div class="rounded-xl border border-border bg-surface p-3.5 shadow-2xs">
          <p class="text-xs font-medium uppercase tracking-wider text-muted">Régimes avec Extra Time (ET)</p>
          <p class="mt-1 text-2xl font-bold text-teal-600">{{ etEnabledCount() }} / {{ profiles.length }}</p>
          <p class="mt-0.5 text-xs text-muted">Temps partiels & astreintes</p>
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
              <p class="text-xs font-semibold uppercase tracking-wider text-brand-600">Règles OT (Overtime)</p>
              <div class="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span class="text-muted">Seuil déclenchement : </span>
                  <span class="font-medium text-ink">{{ formatMinutes(profile.overtimeThresholdMinutes) }} / sem</span>
                </div>
                <div>
                  <span class="text-muted">Compensation : </span>
                  <span class="font-medium text-ink">{{ compensationLabel(profile.overtimeCompensationMode) }}</span>
                </div>
                <div>
                  <span class="text-muted">Tranche 1 : </span>
                  <span class="font-medium text-ink">+{{ formatRate(profile.overtimeRateTier1) }}%</span>
                </div>
                <div>
                  <span class="text-muted">Tranche 2 : </span>
                  <span class="font-medium text-ink">+{{ formatRate(profile.overtimeRateTier2) }}%</span>
                </div>
                <div class="col-span-2">
                  <span class="text-muted">Dimanche & Férié : </span>
                  <span class="font-bold text-purple-700">+{{ formatRate(profile.overtimeRateHoliday) }}%</span>
                </div>
              </div>
            </div>

            <!-- Paramètres ET -->
            <div class="rounded-lg bg-app/50 p-2.5 space-y-1.5">
              <div class="flex items-center justify-between">
                <p class="text-xs font-semibold uppercase tracking-wider text-teal-600">Règles ET (Extra Time)</p>
                @if (profile.extraTimeAllowed) {
                  <span class="rounded bg-teal-50 px-1.5 py-0.2 text-[10px] font-semibold text-teal-700">Autorisé</span>
                } @else {
                  <span class="rounded bg-zinc-100 px-1.5 py-0.2 text-[10px] font-semibold text-zinc-500">Non autorisé</span>
                }
              </div>
              @if (profile.extraTimeAllowed) {
                <div class="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span class="text-muted">Plafond max : </span>
                    <span class="font-medium text-ink">{{ formatMinutes(profile.extraTimeMaxWeeklyMinutes) }} / sem</span>
                  </div>
                  <div>
                    <span class="text-muted">Majoration : </span>
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
                Ajuster les règles OT / ET
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
              <th scope="col" class="px-5 py-3 whitespace-nowrap">Régime</th>
              <th scope="col" class="px-5 py-3 whitespace-nowrap">Seuil OT Hebdo</th>
              <th scope="col" class="px-5 py-3 whitespace-nowrap">Majoration T1</th>
              <th scope="col" class="px-5 py-3 whitespace-nowrap">Majoration T2</th>
              <th scope="col" class="px-5 py-3 whitespace-nowrap">Dimanche & Férié</th>
              <th scope="col" class="px-5 py-3 whitespace-nowrap">Compensation OT</th>
              <th scope="col" class="px-5 py-3 whitespace-nowrap">Extra Time (ET)</th>
              <th scope="col" class="px-5 py-3 whitespace-nowrap text-right">Actions</th>
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
                  {{ formatMinutes(profile.overtimeThresholdMinutes) }} / sem
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
                    <span class="text-xs text-muted">Non applicable</span>
                  }
                </td>
                <td class="px-5 py-3.5 text-right whitespace-nowrap">
                  <button
                    type="button"
                    (click)="editRequested.emit(profile)"
                    class="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-ink transition hover:bg-app whitespace-nowrap">
                    Modifier
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
        return 'Repos compensateur / RTT';
      case 'HYBRID':
        return 'Paiement ou RTT au choix';
      case 'PAY':
      default:
        return 'Paiement majoré (Salaire)';
    }
  }
}
