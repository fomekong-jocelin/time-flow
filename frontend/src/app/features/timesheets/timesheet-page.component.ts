import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../shared/ui/icon.component';
import { addWeeks, calendarWeek, CalendarWeek, toIsoDateString } from './current-week';
import { ActiveProject, ActivityType, SaveTimesheetPayload, TimesheetOverview, TimesheetStatus } from './timesheet.models';
import { problemMessage, TimesheetService } from './timesheet.service';
import { TimesheetSidePanelComponent } from './timesheet-side-panel.component';

interface RowViewModel {
  projectId: string;
  projectName: string;
  clientName?: string | null;
  activityType: ActivityType;
  billable: boolean;
  comment?: string | null;
  hoursByDate: Record<string, number>;
}

@Component({
  selector: 'tf-timesheet-page',
  imports: [FormsModule, IconComponent, TimesheetSidePanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-6">
      <!-- En-tête : navigation de semaine, statut et actions -->
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div class="flex items-center gap-2 text-sm font-medium text-brand-600">
            <span>Mes temps</span>
            <span class="text-muted">/</span>
            <span>CRA Hebdomadaire</span>
          </div>
          <div class="mt-1 flex flex-wrap items-center gap-3">
            <h1 class="text-3xl font-bold tracking-tight">Semaine {{ week().number }}</h1>

            <!-- Badge de statut -->
            @switch (status()) {
              @case ('DRAFT') {
                <span class="inline-flex items-center gap-1.5 rounded-full bg-slate/10 px-3 py-0.5 text-xs font-semibold text-slate">
                  <span class="size-1.5 rounded-full bg-slate"></span>
                  Brouillon
                </span>
              }
              @case ('SUBMITTED') {
                <span class="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-0.5 text-xs font-semibold text-brand-600 border border-brand-200">
                  <tf-icon name="send" [size]="12" />
                  Soumise pour validation
                </span>
              }
              @case ('REJECTED') {
                <span class="inline-flex items-center gap-1.5 rounded-full bg-danger-50 px-3 py-0.5 text-xs font-semibold text-danger-700 border border-danger-200">
                  <tf-icon name="alert" [size]="12" />
                  Rejetée
                </span>
              }
              @case ('VALIDATED') {
                <span class="inline-flex items-center gap-1.5 rounded-full bg-success-50 px-3 py-0.5 text-xs font-semibold text-success-700 border border-success-200">
                  <tf-icon name="check" [size]="12" />
                  Validée
                </span>
              }
              @case ('LOCKED') {
                <span class="inline-flex items-center gap-1.5 rounded-full bg-muted/20 px-3 py-0.5 text-xs font-semibold text-muted border border-border">
                  <tf-icon name="lock" [size]="12" />
                  Verrouillée
                </span>
              }
            }
          </div>
          <p class="mt-1 text-sm text-muted">{{ week().range }}</p>
        </div>

        <!-- Navigation de semaine & boutons d'action -->
        <div class="flex flex-wrap items-center gap-2 sm:gap-3">
          <!-- Sélecteur semaine précédente / courante / suivante -->
          <div class="inline-flex items-center rounded-ui border border-border bg-surface p-1 shadow-xs">
            <button
              type="button"
              (click)="previousWeek()"
              title="Semaine précédente"
              class="grid size-9 place-items-center rounded-lg text-muted transition hover:bg-app hover:text-foreground">
              <tf-icon name="chevron-left" [size]="16" />
            </button>
            <button
              type="button"
              (click)="resetToCurrentWeek()"
              class="px-3 text-xs font-semibold text-foreground transition hover:text-brand-600">
              Aujourd'hui
            </button>
            <button
              type="button"
              (click)="nextWeek()"
              title="Semaine suivante"
              class="grid size-9 place-items-center rounded-lg text-muted transition hover:bg-app hover:text-foreground">
              <tf-icon name="chevron-right" [size]="16" />
            </button>
          </div>

          @if (isEditable()) {
            <button
              type="button"
              (click)="saveDraft()"
              [disabled]="saving() || rows().length === 0"
              class="inline-flex h-11 items-center justify-center gap-2 rounded-ui border border-border bg-surface px-4 text-sm font-semibold text-foreground shadow-xs transition hover:bg-app disabled:cursor-not-allowed disabled:opacity-50">
              <tf-icon name="check" [size]="16" />
              <span>Enregistrer brouillon</span>
            </button>

            <button
              type="button"
              (click)="submit()"
              [disabled]="saving() || totalHours() === 0"
              title="Soumettre la feuille pour validation par votre manager"
              class="inline-flex h-11 items-center justify-center gap-2 rounded-ui bg-brand-600 px-5 text-sm font-semibold text-white shadow-xs transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-border disabled:text-muted">
              <span>Soumettre</span>
              <tf-icon name="send" [size]="16" />
            </button>
          }
        </div>
      </div>

      <!-- Messages d'information / alerte -->
      @if (errorMessage()) {
        <div class="flex items-center gap-3 rounded-ui border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">
          <tf-icon name="alert" [size]="20" />
          <p class="flex-1">{{ errorMessage() }}</p>
          <button type="button" (click)="errorMessage.set(null)" class="text-danger-700 hover:opacity-75">×</button>
        </div>
      }

      @if (successMessage()) {
        <div class="flex items-center gap-3 rounded-ui border border-success-200 bg-success-50 p-4 text-sm text-success-700">
          <tf-icon name="check" [size]="20" />
          <p class="flex-1">{{ successMessage() }}</p>
          <button type="button" (click)="successMessage.set(null)" class="text-success-700 hover:opacity-75">×</button>
        </div>
      }

      @if (status() === 'REJECTED' && timesheet()?.rejectionComment) {
        <div class="rounded-ui border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <div class="flex items-center gap-2 font-semibold text-amber-800">
            <tf-icon name="alert" [size]="18" />
            <span>Motif de rejet du manager :</span>
          </div>
          <p class="mt-1 pl-6 text-amber-900">{{ timesheet()?.rejectionComment }}</p>
          <p class="mt-2 pl-6 text-xs text-amber-700">Modifiez vos heures ci-dessous puis soumettez à nouveau la feuille.</p>
        </div>
      }

      @if (totalHours() > 48) {
        <div class="rounded-ui border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-600 flex items-start gap-2.5">
          <tf-icon name="alert" [size]="18" class="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <span class="font-semibold text-amber-500">Avertissement de conformité légale (Code du travail) :</span>
            Votre saisie totalise <strong>{{ formatHours(totalHours()) }}</strong>, ce qui dépasse la durée légale maximale hebdomadaire de 48 heures (Art. L. 3121-20). Veuillez vérifier votre saisie ou justifier les heures exceptionnelles.
          </div>
        </div>
      }

      @if (!isEditable() && status() !== 'REJECTED') {
        <div class="rounded-ui border border-border bg-surface p-3 text-xs text-muted flex items-center gap-2">
          <tf-icon name="lock" [size]="16" />
          <span>Cette feuille de temps est verrouillée en consultation (statut : {{ status() }}). Aucune modification n'est permise.</span>
        </div>
      }

      <!-- Grille principale et panneau latéral -->
      <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div class="min-w-0 space-y-6">
          <!-- KPIs -->
          <div class="grid gap-3 sm:grid-cols-3">
            <article class="flex items-center gap-4 rounded-ui border border-border bg-surface p-4">
              <span class="grid size-11 place-items-center rounded-full bg-brand-50 text-brand-600">
                <tf-icon name="clock" />
              </span>
              <div>
                <p class="text-2xl font-bold tabular-nums leading-tight">{{ formatHours(totalHours()) }}</p>
                <p class="text-xs text-muted">
                  Total saisi (objectif : {{ formatHours(targetHours()) }})
                </p>
              </div>
            </article>

            <article class="flex items-center gap-4 rounded-ui border border-border bg-surface p-4">
              <span class="grid size-11 place-items-center rounded-full bg-success-50 text-success-700">
                <tf-icon name="bars" />
              </span>
              <div>
                <p class="text-2xl font-bold tabular-nums leading-tight">{{ formatHours(billableHours()) }}</p>
                <p class="text-xs text-muted">Facturable</p>
              </div>
            </article>

            <article class="flex items-center gap-4 rounded-ui border border-border bg-surface p-4">
              <span class="grid size-11 place-items-center rounded-full bg-slate/15 text-slate">
                <tf-icon name="database" />
              </span>
              <div>
                <p class="text-2xl font-bold tabular-nums leading-tight">{{ formatHours(internalHours()) }}</p>
                <p class="text-xs text-muted">Interne / Non facturable</p>
              </div>
            </article>
          </div>

          <!-- Tableau de saisie hebdomadaire -->
          <article class="overflow-hidden rounded-ui border border-border bg-surface shadow-xs">
            @if (loading()) {
              <div class="p-12 text-center text-sm text-muted">
                <p>Chargement de la feuille de temps...</p>
              </div>
            } @else {
              <div class="overflow-x-auto">
                <table class="w-full min-w-[46rem] text-sm">
                  <thead class="border-b border-border bg-app/50 text-xs text-muted">
                    <tr>
                      <th scope="col" class="px-4 py-3 text-left font-medium">Projet & Activité</th>
                      <th scope="col" class="w-24 px-3 py-3 text-center font-medium">Type</th>
                      <th scope="col" class="w-20 px-3 py-3 text-center font-medium">Fact.</th>
                      @for (day of week().days; track day.isoDate) {
                        <th scope="col" class="w-20 px-2 py-2 text-center font-medium" [class]="day.isToday ? 'bg-brand-50 text-brand-600 font-semibold' : ''">
                          <span class="block">{{ day.label }}</span>
                          <span class="block tabular-nums" [class.font-normal]="!day.isToday">{{ day.date }}</span>
                        </th>
                      }
                      <th scope="col" class="w-20 px-4 py-3 text-right font-medium">Total</th>
                      @if (isEditable()) {
                        <th scope="col" class="w-12 px-2 py-3 text-center"><span class="sr-only">Actions</span></th>
                      }
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-border">
                    @if (rows().length === 0) {
                      <tr>
                        <td [attr.colspan]="columnCount()" class="px-6 py-12 text-center">
                          <div class="mx-auto flex max-w-md flex-col items-center">
                            <span class="grid size-12 place-items-center rounded-full bg-brand-50 text-brand-600">
                              <tf-icon name="folder-plus" [size]="24" />
                            </span>
                            <h2 class="mt-3 font-semibold text-foreground">Aucune ligne de temps pour cette semaine</h2>
                            <p class="mt-1 text-xs text-muted">
                              Ajoutez une ligne en sélectionnant un projet synchronisé ou interne pour commencer votre saisie.
                            </p>
                            @if (isEditable()) {
                              <button
                                type="button"
                                (click)="openAddLineModal()"
                                class="mt-4 inline-flex h-9 items-center gap-1.5 rounded-ui bg-brand-600 px-4 text-xs font-semibold text-white transition hover:bg-brand-700">
                                <tf-icon name="plus" [size]="14" />
                                Ajouter un projet
                              </button>
                            }
                          </div>
                        </td>
                      </tr>
                    } @else {
                      @for (row of rows(); track $index; let rowIndex = $index) {
                        <tr class="transition hover:bg-app/40">
                          <!-- Projet -->
                          <td class="px-4 py-3">
                            <p class="font-semibold text-foreground leading-tight">{{ row.projectName }}</p>
                            @if (row.comment) {
                              <p class="text-xs text-muted mt-0.5 italic">{{ row.comment }}</p>
                            }
                          </td>

                          <!-- Activité -->
                          <td class="px-3 py-3 text-center">
                            <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border border-border"
                              [class]="activityBadgeClass(row.activityType)">
                              {{ activityLabel(row.activityType) }}
                            </span>
                          </td>

                          <!-- Facturable -->
                          <td class="px-3 py-3 text-center">
                            @if (row.billable) {
                              <span class="inline-flex size-5 items-center justify-center rounded-full bg-success-50 text-success-700 text-xs" title="Facturable">✓</span>
                            } @else {
                              <span class="text-xs text-muted" title="Non facturable">—</span>
                            }
                          </td>

                          <!-- Saisie par jour -->
                          @for (day of week().days; track day.isoDate) {
                            <td class="px-1.5 py-2 text-center" [class]="day.isToday ? 'bg-brand-50/40' : ''">
                              @if (isEditable()) {
                                <input
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  max="12"
                                  [ngModel]="row.hoursByDate[day.isoDate] || 0"
                                  (ngModelChange)="onHourChange(row, day.isoDate, $event)"
                                  [attr.aria-label]="row.projectName + ' ' + day.label"
                                  class="w-16 rounded-md border border-border bg-surface px-1.5 py-1.5 text-center text-sm tabular-nums text-foreground transition focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600" />
                              } @else {
                                <span class="tabular-nums font-medium text-foreground">
                                  {{ (row.hoursByDate[day.isoDate] || 0) > 0 ? (row.hoursByDate[day.isoDate] || 0) + ' h' : '—' }}
                                </span>
                              }
                            </td>
                          }

                          <!-- Total ligne -->
                          <td class="px-4 py-3 text-right font-bold tabular-nums text-foreground">
                            {{ formatHours(calculateRowTotal(row)) }}
                          </td>

                          <!-- Action supprimer ligne -->
                          @if (isEditable()) {
                            <td class="px-2 py-3 text-center">
                              <button
                                type="button"
                                (click)="removeLine(rowIndex)"
                                title="Supprimer la ligne"
                                class="grid size-8 place-items-center rounded-lg text-muted transition hover:bg-danger-50 hover:text-danger-700">
                                <tf-icon name="trash" [size]="16" />
                              </button>
                            </td>
                          }
                        </tr>
                      }
                    }
                  </tbody>
                  <!-- Ligne Total jour -->
                  <tfoot class="border-t border-border bg-app/60 text-sm font-semibold">
                    <tr>
                      <th scope="row" colspan="3" class="px-4 py-3 text-left">Total jour</th>
                      @for (day of week().days; track day.isoDate) {
                        <td class="px-2 py-3 text-center tabular-nums font-bold"
                          [class]="day.isToday ? 'bg-brand-50 text-brand-600' : 'text-foreground'">
                          {{ formatHours(dailyTotals()[day.isoDate] || 0) }}
                        </td>
                      }
                      <td class="px-4 py-3 text-right tabular-nums text-base font-bold text-brand-600">
                        {{ formatHours(totalHours()) }}
                      </td>
                      @if (isEditable()) {
                        <td></td>
                      }
                    </tr>
                  </tfoot>
                </table>
              </div>

              @if (isEditable() && rows().length > 0) {
                <div class="border-t border-border px-4 py-3">
                  <button
                    type="button"
                    (click)="openAddLineModal()"
                    class="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 transition hover:text-brand-700">
                    <tf-icon name="plus" [size]="16" />
                    <span>Ajouter une ligne projet</span>
                  </button>
                </div>
              }
            }
          </article>
        </div>

        <!-- Panneau latéral -->
        <tf-timesheet-side-panel
          [hasProjects]="activeProjects().length > 0"
          [hasEntries]="rows().length > 0"
          [isSubmitted]="status() === 'SUBMITTED' || status() === 'VALIDATED'" />
      </div>

      <!-- Modal Ajouter une ligne -->
      @if (showAddLineModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div class="w-full max-w-md rounded-ui border border-border bg-surface p-6 shadow-xl">
            <h3 id="modal-title" class="text-lg font-bold text-foreground">Ajouter une ligne d'activité</h3>
            <p class="mt-1 text-xs text-muted">Sélectionnez le projet et la nature de l'activité pour cette semaine.</p>

            <form (ngSubmit)="confirmAddLine()" class="mt-4 space-y-4">
              <!-- Projet -->
              <div>
                <label for="project-select" class="block text-xs font-semibold uppercase tracking-wider text-muted">Projet *</label>
                <select
                  id="project-select"
                  [(ngModel)]="selectedProjectId"
                  name="projectSelect"
                  required
                  class="mt-1 block w-full rounded-ui border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600">
                  <option value="" disabled>-- Choisir un projet --</option>
                  @for (project of activeProjects(); track project.id) {
                    <option [value]="project.id">{{ project.name }}</option>
                  }
                </select>
              </div>

              <!-- Type d'activité -->
              <div>
                <label for="activity-select" class="block text-xs font-semibold uppercase tracking-wider text-muted">Type d'activité *</label>
                <select
                  id="activity-select"
                  [(ngModel)]="selectedActivityType"
                  name="activitySelect"
                  class="mt-1 block w-full rounded-ui border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600">
                  <option value="PROJECT">Projet</option>
                  <option value="TRAINING">Formation</option>
                  <option value="SUPPORT">Support</option>
                  <option value="INTERNAL">Interne</option>
                </select>
              </div>

              <!-- Facturable -->
              <div class="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="billable-check"
                  [(ngModel)]="selectedBillable"
                  name="billableCheck"
                  class="size-4 rounded border-border text-brand-600 focus:ring-brand-600" />
                <label for="billable-check" class="text-sm font-medium text-foreground">Activité facturable au client</label>
              </div>

              <!-- Commentaire optionnel -->
              <div>
                <label for="comment-input" class="block text-xs font-semibold uppercase tracking-wider text-muted">Commentaire / Mission (optionnel)</label>
                <input
                  type="text"
                  id="comment-input"
                  [(ngModel)]="selectedComment"
                  name="commentInput"
                  placeholder="Ex : Réalisation sprint 3"
                  class="mt-1 block w-full rounded-ui border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600" />
              </div>

              <!-- Boutons modal -->
              <div class="mt-6 flex justify-end gap-3 pt-2 border-t border-border">
                <button
                  type="button"
                  (click)="showAddLineModal.set(false)"
                  class="rounded-ui border border-border px-4 py-2 text-sm font-medium text-muted hover:bg-app">
                  Annuler
                </button>
                <button
                  type="submit"
                  [disabled]="!selectedProjectId"
                  class="rounded-ui bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50">
                  Ajouter la ligne
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </section>
  `
})
export class TimesheetPageComponent implements OnInit {
  private readonly timesheetService = inject(TimesheetService);

  readonly currentDate = signal<Date>(new Date());
  readonly week = computed<CalendarWeek>(() => calendarWeek(this.currentDate()));

  readonly timesheet = signal<TimesheetOverview | null>(null);
  readonly activeProjects = signal<ActiveProject[]>([]);
  readonly rows = signal<RowViewModel[]>([]);

  readonly loading = signal<boolean>(true);
  readonly saving = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly showAddLineModal = signal<boolean>(false);
  selectedProjectId = '';
  selectedActivityType: ActivityType = 'PROJECT';
  selectedBillable = true;
  selectedComment = '';

  readonly status = computed<TimesheetStatus>(() => this.timesheet()?.status ?? 'DRAFT');
  readonly isEditable = computed<boolean>(() => this.timesheet()?.editable ?? true);

  readonly targetHours = computed<number>(() => {
    const minutes = this.timesheet()?.weeklyTargetMinutes ?? 2100;
    return minutes / 60;
  });

  readonly dailyTotals = computed<Record<string, number>>(() => {
    const totals: Record<string, number> = {};
    for (const day of this.week().days) {
      let sum = 0;
      for (const row of this.rows()) {
        sum += row.hoursByDate[day.isoDate] || 0;
      }
      totals[day.isoDate] = sum;
    }
    return totals;
  });

  readonly totalHours = computed<number>(() => {
    let sum = 0;
    for (const hours of Object.values(this.dailyTotals())) {
      sum += hours;
    }
    return sum;
  });

  readonly billableHours = computed<number>(() => {
    let sum = 0;
    for (const row of this.rows()) {
      if (row.billable) {
        for (const hours of Object.values(row.hoursByDate)) {
          sum += hours || 0;
        }
      }
    }
    return sum;
  });

  readonly internalHours = computed<number>(() => {
    let sum = 0;
    for (const row of this.rows()) {
      if (row.activityType === 'INTERNAL' || !row.billable) {
        for (const hours of Object.values(row.hoursByDate)) {
          sum += hours || 0;
        }
      }
    }
    return sum;
  });

  readonly columnCount = computed<number>(() => this.week().days.length + (this.isEditable() ? 5 : 4));

  ngOnInit(): void {
    this.loadActiveProjects();
    this.loadTimesheet();
  }

  previousWeek(): void {
    this.currentDate.update(d => addWeeks(d, -1));
    this.loadTimesheet();
  }

  nextWeek(): void {
    this.currentDate.update(d => addWeeks(d, 1));
    this.loadTimesheet();
  }

  resetToCurrentWeek(): void {
    this.currentDate.set(new Date());
    this.loadTimesheet();
  }

  loadActiveProjects(): void {
    this.timesheetService.getActiveProjects().subscribe({
      next: projects => this.activeProjects.set(projects),
      error: () => { /* silencieux : liste vide par défaut */ }
    });
  }

  loadTimesheet(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const weekIso = this.week().mondayIsoDate;
    this.timesheetService.getTimesheet(weekIso).subscribe({
      next: overview => {
        this.timesheet.set(overview);
        this.buildRowsFromOverview(overview);
        this.loading.set(false);
      },
      error: err => {
        this.errorMessage.set(problemMessage(err, 'Impossible de charger la feuille de temps.'));
        this.loading.set(false);
      }
    });
  }

  onHourChange(row: RowViewModel, isoDate: string, rawValue: unknown): void {
    const val = typeof rawValue === 'number' ? rawValue : parseFloat(String(rawValue || '0'));
    const safeVal = isNaN(val) || val < 0 ? 0 : Math.min(val, 24);
    row.hoursByDate[isoDate] = safeVal;
    // Trigger signal update
    this.rows.update(r => [...r]);
  }

  calculateRowTotal(row: RowViewModel): number {
    let sum = 0;
    for (const h of Object.values(row.hoursByDate)) {
      sum += h || 0;
    }
    return sum;
  }

  openAddLineModal(): void {
    this.selectedProjectId = this.activeProjects().length > 0 ? this.activeProjects()[0].id : '';
    this.selectedActivityType = 'PROJECT';
    this.selectedBillable = this.activeProjects().length > 0 ? this.activeProjects()[0].billableDefault : true;
    this.selectedComment = '';
    this.showAddLineModal.set(true);
  }

  confirmAddLine(): void {
    const project = this.activeProjects().find(p => p.id === this.selectedProjectId);
    if (!project) return;

    const initialHours: Record<string, number> = {};
    for (const day of this.week().days) {
      initialHours[day.isoDate] = 0;
    }

    const newRow: RowViewModel = {
      projectId: project.id,
      projectName: project.name,
      activityType: this.selectedActivityType,
      billable: this.selectedBillable,
      comment: this.selectedComment.trim() || null,
      hoursByDate: initialHours
    };

    this.rows.update(r => [...r, newRow]);
    this.showAddLineModal.set(false);
  }

  removeLine(index: number): void {
    this.rows.update(r => r.filter((_, i) => i !== index));
  }

  saveDraft(): void {
    this.saving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const payload = this.buildPayload();
    this.timesheetService.saveDraft(this.week().mondayIsoDate, payload).subscribe({
      next: overview => {
        this.timesheet.set(overview);
        this.buildRowsFromOverview(overview);
        this.saving.set(false);
        this.successMessage.set('Brouillon enregistré avec succès.');
      },
      error: err => {
        this.saving.set(false);
        this.errorMessage.set(problemMessage(err, "Erreur lors de l'enregistrement du brouillon."));
      }
    });
  }

  submit(): void {
    if (this.totalHours() <= 0) {
      this.errorMessage.set('Une feuille de temps avec 0 heure ne peut pas être soumise.');
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const payload = this.buildPayload();
    this.timesheetService.submit(this.week().mondayIsoDate, payload).subscribe({
      next: overview => {
        this.timesheet.set(overview);
        this.buildRowsFromOverview(overview);
        this.saving.set(false);
        this.successMessage.set('Feuille de temps soumise avec succès pour validation.');
      },
      error: err => {
        this.saving.set(false);
        this.errorMessage.set(problemMessage(err, 'Erreur lors de la soumission de la feuille.'));
      }
    });
  }

  formatHours(h: number): string {
    return h.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 1 }) + ' h';
  }

  activityLabel(type: ActivityType): string {
    switch (type) {
      case 'PROJECT': return 'Projet';
      case 'TRAINING': return 'Formation';
      case 'SUPPORT': return 'Support';
      case 'INTERNAL': return 'Interne';
    }
  }

  activityBadgeClass(type: ActivityType): string {
    switch (type) {
      case 'PROJECT': return 'bg-brand-50 text-brand-700 border-brand-200';
      case 'TRAINING': return 'bg-violet-50 text-violet-700 border-violet-200';
      case 'SUPPORT': return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'INTERNAL': return 'bg-slate/10 text-slate border-slate/20';
    }
  }

  private buildRowsFromOverview(overview: TimesheetOverview): void {
    const newRows: RowViewModel[] = [];
    for (const line of overview.lines) {
      const hoursMap: Record<string, number> = {};
      for (const entry of line.entries) {
        hoursMap[entry.date] = entry.minutes / 60;
      }
      newRows.push({
        projectId: line.projectId,
        projectName: line.projectName,
        clientName: line.clientName,
        activityType: line.activityType,
        billable: line.billable,
        comment: line.comment,
        hoursByDate: hoursMap
      });
    }
    this.rows.set(newRows);
  }

  private buildPayload(): SaveTimesheetPayload {
    return {
      lines: this.rows().map(row => ({
        projectId: row.projectId,
        activityType: row.activityType,
        billable: row.billable,
        comment: row.comment,
        entries: Object.entries(row.hoursByDate).map(([date, hours]) => ({
          entryDate: date,
          minutes: Math.round((hours || 0) * 60)
        }))
      }))
    };
  }
}
