import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'tf-timesheet-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-6">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-sm font-medium text-brand-600">Mes temps</p>
          <h1 class="mt-1 text-3xl font-bold tracking-tight">Semaine en cours</h1>
          <p class="mt-2 text-sm text-muted">Saisis tes activités puis soumets ta feuille pour validation.</p>
        </div>
        <button type="button" disabled class="rounded-ui bg-brand-600 px-5 py-3 text-sm font-semibold text-white opacity-50">
          Soumettre
        </button>
      </div>

      <div class="grid gap-4 md:grid-cols-3">
        <article class="rounded-ui border border-border bg-white p-5">
          <p class="text-sm text-muted">Temps saisi</p>
          <p class="mt-2 text-2xl font-bold">0 h</p>
        </article>
        <article class="rounded-ui border border-border bg-white p-5">
          <p class="text-sm text-muted">Facturable</p>
          <p class="mt-2 text-2xl font-bold text-teal-600">0 h</p>
        </article>
        <article class="rounded-ui border border-border bg-white p-5">
          <p class="text-sm text-muted">Interne</p>
          <p class="mt-2 text-2xl font-bold">0 h</p>
        </article>
      </div>

      <article class="overflow-hidden rounded-ui border border-border bg-white">
        <div class="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 class="font-semibold">Feuille de temps</h2>
            <p class="mt-1 text-sm text-muted">Les projets synchronisés depuis Azure DevOps apparaîtront ici.</p>
          </div>
          <button type="button" disabled class="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted">
            + Ajouter une activité
          </button>
        </div>
        <div class="grid min-h-56 place-items-center px-6 py-12 text-center">
          <div class="max-w-md">
            <div class="mx-auto grid size-12 place-items-center rounded-full bg-brand-50 text-brand-600">↻</div>
            <h3 class="mt-4 font-semibold">Aucun projet disponible</h3>
            <p class="mt-2 text-sm leading-6 text-muted">La prochaine étape connectera TimeFlow à Azure DevOps. Aucun projet fictif n'est injecté dans le produit.</p>
          </div>
        </div>
      </article>
    </section>
  `
})
export class TimesheetPageComponent {}
