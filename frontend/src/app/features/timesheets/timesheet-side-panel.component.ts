import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Code couleur métier — charte v0.1, §6. Le libellé accompagne toujours la couleur. */
const ACTIVITY_TYPES = [
  { label: 'Projet', dot: 'bg-brand-600' },
  { label: 'Formation', dot: 'bg-violet-500' },
  { label: 'Support', dot: 'bg-teal-500' },
  { label: 'Interne', dot: 'bg-slate' },
  { label: 'Facturable', dot: 'bg-success' }
];

@Component({
  selector: 'tf-timesheet-side-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-4' },
  template: `
    <article class="rounded-ui border border-border bg-surface p-5">
      <div class="flex items-center justify-between">
        <h2 class="font-semibold">Pour démarrer</h2>
        <span class="text-xs tabular-nums text-muted">{{ doneCount() }}/{{ steps().length }}</span>
      </div>
      <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-app" role="progressbar" [attr.aria-valuenow]="doneCount()" aria-valuemin="0" [attr.aria-valuemax]="steps().length" aria-label="Progression de la mise en route">
        <div class="h-full rounded-full bg-brand-600 transition-all duration-300" [style.width.%]="(doneCount() / steps().length) * 100"></div>
      </div>
      <ol class="mt-4 space-y-3.5">
        @for (step of steps(); track step.title; let i = $index) {
          <li class="flex gap-3">
            @if (step.done) {
              <span class="grid size-6 shrink-0 place-items-center rounded-full bg-success-50 text-success-700">
                <svg viewBox="0 0 24 24" class="size-3.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>
                <span class="sr-only">Terminé :</span>
              </span>
            } @else {
              <span class="grid size-6 shrink-0 place-items-center rounded-full border border-border text-xs font-medium text-muted">{{ i + 1 }}</span>
            }
            <div class="min-w-0">
              <p class="text-sm font-medium" [class.text-muted]="!step.done && i > firstPending()">{{ step.title }}</p>
              <p class="text-xs leading-5 text-muted">{{ step.detail }}</p>
            </div>
          </li>
        }
      </ol>
    </article>

    <article class="rounded-ui border border-border bg-surface p-5">
      <h2 class="font-semibold">Code couleur</h2>
      <p class="mt-1 text-xs text-muted">Repères utilisés dans la feuille de temps.</p>
      <ul class="mt-3 flex flex-wrap gap-2">
        @for (type of activityTypes; track type.label) {
          <li class="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs">
            <span class="size-2 rounded-full" [class]="type.dot" aria-hidden="true"></span>
            {{ type.label }}
          </li>
        }
      </ul>
    </article>
  `
})
export class TimesheetSidePanelComponent {
  readonly hasProjects = input<boolean>(false);
  readonly hasEntries = input<boolean>(false);
  readonly isSubmitted = input<boolean>(false);

  protected readonly activityTypes = ACTIVITY_TYPES;

  protected readonly steps = computed(() => [
    { title: 'Compte connecté', detail: 'Ta session TimeFlow est active.', done: true },
    { title: 'Projets synchronisés', detail: 'Import Azure DevOps ou Excel.', done: this.hasProjects() },
    { title: 'Saisie des temps', detail: 'Heures par jour, projet et activité.', done: this.hasEntries() },
    { title: 'Soumission', detail: 'Envoi de la semaine pour validation.', done: this.isSubmitted() }
  ]);

  protected readonly doneCount = computed(() => this.steps().filter(s => s.done).length);
  protected readonly firstPending = computed(() => this.steps().findIndex(s => !s.done));
}
