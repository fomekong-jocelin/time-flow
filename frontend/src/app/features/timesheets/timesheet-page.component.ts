import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IconComponent, IconName } from '../../shared/ui/icon.component';
import { calendarWeek } from './current-week';
import { TimesheetSidePanelComponent } from './timesheet-side-panel.component';

interface Kpi {
  label: string;
  icon: IconName;
  /** Code couleur métier (charte v0.1, §6) : saisi = indigo, facturable = vert, interne = slate. */
  tone: string;
}

const KPIS: readonly Kpi[] = [
  { label: 'Total saisi', icon: 'clock', tone: 'bg-brand-50 text-brand-600' },
  { label: 'Facturable', icon: 'bars', tone: 'bg-success-50 text-success-700' },
  { label: 'Interne', icon: 'database', tone: 'bg-slate/15 text-slate' }
];

@Component({
  selector: 'tf-timesheet-page',
  imports: [IconComponent, TimesheetSidePanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-6">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-sm font-medium text-brand-600">Mes temps</p>
          <h1 class="mt-0.5 text-3xl font-bold tracking-tight">Semaine {{ week.number }}</h1>
          <p class="mt-1 text-sm text-muted">{{ week.range }}</p>
        </div>
        <button
          type="button"
          disabled
          title="Disponible dès qu'une activité est saisie"
          class="inline-flex h-11 items-center justify-center gap-2 rounded-ui bg-brand-600 px-5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-border disabled:text-muted">
          Soumettre
          <tf-icon name="send" [size]="16" />
        </button>
      </div>

      <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div class="min-w-0 space-y-6">
          <div class="grid gap-3 sm:grid-cols-3">
            @for (kpi of kpis; track kpi.label) {
              <article class="flex items-center gap-4 rounded-ui border border-border bg-surface p-4">
                <span class="grid size-11 place-items-center rounded-full" [class]="kpi.tone">
                  <tf-icon [name]="kpi.icon" />
                </span>
                <div>
                  <p class="text-2xl font-bold tabular-nums leading-tight">0 h</p>
                  <p class="text-xs text-muted">{{ kpi.label }}</p>
                </div>
              </article>
            }
          </div>

          <article class="overflow-hidden rounded-ui border border-border bg-surface">
            <div class="overflow-x-auto">
              <table class="w-full min-w-[42rem] text-sm">
                <thead class="border-b border-border text-xs text-muted">
                  <tr>
                    <th scope="col" class="px-5 py-3 text-left font-medium">Projet / Activité</th>
                    <th scope="col" class="px-3 py-3 text-left font-medium">Client</th>
                    @for (day of week.days; track day.label) {
                      <th scope="col" class="w-20 px-2 py-2 text-center font-medium" [class]="day.isToday ? 'bg-brand-50 text-brand-600' : ''" [attr.aria-current]="day.isToday ? 'date' : null">
                        <span class="block">{{ day.label }}</span>
                        <span class="block tabular-nums" [class.font-normal]="!day.isToday">{{ day.date }}</span>
                      </th>
                    }
                    <th scope="col" class="w-20 px-5 py-3 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td [attr.colspan]="columnCount" class="px-6 py-10 text-center">
                      <div class="mx-auto flex max-w-md flex-col items-center">
                        <span class="grid size-11 place-items-center rounded-full bg-brand-50 text-brand-600">
                          <tf-icon name="folder-plus" />
                        </span>
                        <h2 class="mt-3 font-semibold">Aucun projet pour l'instant</h2>
                        <p class="mt-1 leading-6 text-muted">Tes projets Azure DevOps apparaîtront ici dès que la synchronisation sera activée.</p>
                      </div>
                    </td>
                  </tr>
                </tbody>
                <tfoot class="border-t border-border text-sm font-semibold">
                  <tr>
                    <th scope="row" colspan="2" class="px-5 py-3 text-left">Total jour</th>
                    @for (day of week.days; track day.label) {
                      <td class="px-2 py-3 text-center tabular-nums" [class]="day.isToday ? 'bg-brand-50 text-brand-600' : 'text-muted'">0 h</td>
                    }
                    <td class="px-5 py-3 text-right tabular-nums">0 h</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div class="border-t border-border px-5 py-3">
              <button type="button" disabled class="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 disabled:cursor-not-allowed disabled:text-muted">
                <tf-icon name="plus" [size]="16" />
                Ajouter une ligne
              </button>
            </div>
          </article>
        </div>

        <tf-timesheet-side-panel />
      </div>
    </section>
  `
})
export class TimesheetPageComponent {
  protected readonly kpis = KPIS;
  protected readonly week = calendarWeek();
  protected readonly columnCount = this.week.days.length + 3;
}
