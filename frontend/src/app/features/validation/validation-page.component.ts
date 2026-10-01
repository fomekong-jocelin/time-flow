import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../shared/ui/icon.component';
import { ActivityType, TimesheetOverview, TimesheetStatus } from '../timesheets/timesheet.models';
import { ManagerTimesheetDetail, PendingTimesheetSummary } from './validation.models';
import { problemMessage, ValidationService } from './validation.service';

@Component({
  selector: 'tf-validation-page',
  imports: [FormsModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-6">
      <!-- En-tête -->
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-sm font-medium text-brand-600">Espace Manager</p>
          <h1 class="text-3xl font-bold tracking-tight">Validation des temps</h1>
          <p class="mt-1 text-sm text-muted">Contrôlez, approuvez ou renvoyez pour correction les feuilles de temps de votre équipe.</p>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            (click)="loadTimesheets()"
            [disabled]="loading()"
            class="inline-flex h-10 items-center gap-2 rounded-ui border border-border bg-surface px-4 text-xs font-semibold text-foreground shadow-xs transition hover:bg-app disabled:opacity-50">
            <tf-icon name="clock" [size]="14" />
            <span>Rafraîchir</span>
          </button>
        </div>
      </div>

      <!-- Filtres par statut -->
      <div class="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <button
          type="button"
          (click)="setStatusFilter('SUBMITTED')"
          class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition"
          [class]="selectedStatus() === 'SUBMITTED' ? 'bg-brand-600 text-white shadow-xs' : 'bg-surface text-muted hover:text-foreground border border-border'">
          <span>À valider</span>
          @if (pendingCount() > 0) {
            <span class="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px]">{{ pendingCount() }}</span>
          }
        </button>

        <button
          type="button"
          (click)="setStatusFilter('VALIDATED')"
          class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition"
          [class]="selectedStatus() === 'VALIDATED' ? 'bg-brand-600 text-white shadow-xs' : 'bg-surface text-muted hover:text-foreground border border-border'">
          Validées
        </button>

        <button
          type="button"
          (click)="setStatusFilter('REJECTED')"
          class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition"
          [class]="selectedStatus() === 'REJECTED' ? 'bg-brand-600 text-white shadow-xs' : 'bg-surface text-muted hover:text-foreground border border-border'">
          Rejetées
        </button>

        <button
          type="button"
          (click)="setStatusFilter('ALL')"
          class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition"
          [class]="selectedStatus() === 'ALL' ? 'bg-brand-600 text-white shadow-xs' : 'bg-surface text-muted hover:text-foreground border border-border'">
          Toutes
        </button>
      </div>

      <!-- Messages alertes -->
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

      <!-- Tableau des feuilles -->
      <article class="overflow-hidden rounded-ui border border-border bg-surface shadow-xs">
        @if (loading()) {
          <div class="p-12 text-center text-sm text-muted">
            <p>Chargement des feuilles de temps...</p>
          </div>
        } @else if (timesheets().length === 0) {
          <div class="p-12 text-center text-sm text-muted">
            <span class="mx-auto grid size-12 place-items-center rounded-full bg-brand-50 text-brand-600">
              <tf-icon name="check" [size]="24" />
            </span>
            <p class="mt-3 font-semibold text-foreground">Aucune feuille de temps dans cette catégorie</p>
            <p class="mt-1 text-xs">Toutes les soumissions de votre équipe ont été traitées.</p>
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full min-w-[50rem] text-sm">
              <thead class="border-b border-border bg-app/50 text-xs text-muted">
                <tr>
                  <th scope="col" class="px-5 py-3 text-left font-medium">Collaborateur</th>
                  <th scope="col" class="px-3 py-3 text-left font-medium">Semaine</th>
                  <th scope="col" class="px-3 py-3 text-right font-medium">Total saisi</th>
                  <th scope="col" class="px-3 py-3 text-right font-medium">Facturable</th>
                  <th scope="col" class="px-3 py-3 text-center font-medium">Projets</th>
                  <th scope="col" class="px-3 py-3 text-center font-medium">Statut</th>
                  <th scope="col" class="px-3 py-3 text-left font-medium">Soumise le</th>
                  <th scope="col" class="w-48 px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border">
                @for (item of timesheets(); track item.id) {
                  <tr class="transition hover:bg-app/40">
                    <!-- Collaborateur -->
                    <td class="px-5 py-3">
                      <p class="font-semibold text-foreground">{{ item.userDisplayName }}</p>
                      <p class="text-xs text-muted">{{ item.userEmail }}</p>
                    </td>

                    <!-- Semaine -->
                    <td class="px-3 py-3 font-medium text-foreground">
                      <span>Du {{ formatDate(item.weekStart) }} au {{ formatDate(item.weekEnd) }}</span>
                    </td>

                    <!-- Total -->
                    <td class="px-3 py-3 text-right font-bold tabular-nums text-foreground">
                      {{ formatHours(item.totalMinutes) }}
                    </td>

                    <!-- Facturable -->
                    <td class="px-3 py-3 text-right tabular-nums text-success-700 font-semibold">
                      {{ formatHours(item.billableMinutes) }}
                    </td>

                    <!-- Projets distincts -->
                    <td class="px-3 py-3 text-center tabular-nums text-muted">
                      {{ item.linesCount }}
                    </td>

                    <!-- Statut -->
                    <td class="px-3 py-3 text-center">
                      @switch (item.status) {
                        @case ('SUBMITTED') {
                          <span class="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-600 border border-brand-200">
                            En attente
                          </span>
                        }
                        @case ('VALIDATED') {
                          <span class="inline-flex items-center gap-1 rounded-full bg-success-50 px-2.5 py-0.5 text-xs font-semibold text-success-700 border border-success-200">
                            Validée
                          </span>
                        }
                        @case ('REJECTED') {
                          <span class="inline-flex items-center gap-1 rounded-full bg-danger-50 px-2.5 py-0.5 text-xs font-semibold text-danger-700 border border-danger-200">
                            Rejetée
                          </span>
                        }
                        @default {
                          <span class="text-xs text-muted">{{ item.status }}</span>
                        }
                      }
                    </td>

                    <!-- Soumise le -->
                    <td class="px-3 py-3 text-xs text-muted">
                      {{ item.submittedAt ? formatDateTime(item.submittedAt) : '—' }}
                    </td>

                    <!-- Actions -->
                    <td class="px-5 py-3 text-right space-x-1">
                      <button
                        type="button"
                        (click)="openDetail(item.id)"
                        class="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-surface px-2.5 text-xs font-semibold text-foreground hover:bg-app transition">
                        <tf-icon name="eye" [size]="14" />
                        <span>Détail</span>
                      </button>

                      @if (item.status === 'SUBMITTED') {
                        <button
                          type="button"
                          (click)="quickValidate(item)"
                          [disabled]="actionPending()"
                          title="Valider la feuille"
                          class="inline-flex h-8 items-center gap-1 rounded-md bg-success-600 px-2.5 text-xs font-semibold text-white hover:bg-success-700 transition disabled:opacity-50">
                          <tf-icon name="check" [size]="14" />
                          <span>Valider</span>
                        </button>

                        <button
                          type="button"
                          (click)="openRejectModal(item)"
                          [disabled]="actionPending()"
                          title="Rejeter avec motif"
                          class="inline-flex h-8 items-center gap-1 rounded-md bg-danger-600 px-2.5 text-xs font-semibold text-white hover:bg-danger-700 transition disabled:opacity-50">
                          <tf-icon name="alert" [size]="14" />
                          <span>Rejeter</span>
                        </button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </article>

      <!-- Modal Examen Détaillé -->
      @if (selectedDetail()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs" role="dialog" aria-modal="true" aria-labelledby="detail-title">
          <div class="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-ui border border-border bg-surface p-6 shadow-2xl space-y-6">
            <div class="flex items-start justify-between border-b border-border pb-4">
              <div>
                <p class="text-xs font-semibold text-brand-600 uppercase tracking-wider">Feuille de temps CRA</p>
                <h3 id="detail-title" class="text-xl font-bold text-foreground">{{ selectedDetail()?.userDisplayName }}</h3>
                <p class="text-xs text-muted">{{ selectedDetail()?.userEmail }} — Semaine du {{ formatDate(selectedDetail()?.overview?.weekStart!) }} au {{ formatDate(selectedDetail()?.overview?.weekEnd!) }}</p>
              </div>

              <button type="button" (click)="selectedDetail.set(null)" class="text-muted hover:text-foreground text-xl">×</button>
            </div>

            <!-- KPIs de la feuille examinée -->
            <div class="grid grid-cols-3 gap-3">
              <div class="rounded-ui border border-border bg-app/40 p-3">
                <p class="text-xs text-muted">Total des heures</p>
                <p class="text-xl font-bold tabular-nums text-foreground">{{ formatHours(selectedDetail()?.overview?.totalMinutes || 0) }}</p>
              </div>
              <div class="rounded-ui border border-border bg-app/40 p-3">
                <p class="text-xs text-muted">Heures facturables</p>
                <p class="text-xl font-bold tabular-nums text-success-700">{{ formatHours(selectedDetail()?.overview?.billableMinutes || 0) }}</p>
              </div>
              <div class="rounded-ui border border-border bg-app/40 p-3">
                <p class="text-xs text-muted">Heures internes</p>
                <p class="text-xl font-bold tabular-nums text-slate">{{ formatHours(selectedDetail()?.overview?.internalMinutes || 0) }}</p>
              </div>
            </div>

            <!-- Grille détaillée des lignes -->
            <div class="overflow-x-auto rounded-ui border border-border">
              <table class="w-full min-w-[36rem] text-xs">
                <thead class="bg-app/60 border-b border-border text-muted">
                  <tr>
                    <th scope="col" class="px-3 py-2 text-left font-medium">Projet</th>
                    <th scope="col" class="px-2 py-2 text-center font-medium">Activité</th>
                    <th scope="col" class="px-2 py-2 text-center font-medium">Fact.</th>
                    <th scope="col" class="px-2 py-2 text-center font-medium">Lun</th>
                    <th scope="col" class="px-2 py-2 text-center font-medium">Mar</th>
                    <th scope="col" class="px-2 py-2 text-center font-medium">Mer</th>
                    <th scope="col" class="px-2 py-2 text-center font-medium">Jeu</th>
                    <th scope="col" class="px-2 py-2 text-center font-medium">Ven</th>
                    <th scope="col" class="px-3 py-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border">
                  @for (line of selectedDetail()?.overview?.lines; track $index) {
                    <tr>
                      <td class="px-3 py-2">
                        <p class="font-semibold text-foreground">{{ line.projectName }}</p>
                        @if (line.comment) {
                          <p class="italic text-muted mt-0.5">{{ line.comment }}</p>
                        }
                      </td>
                      <td class="px-2 py-2 text-center">
                        <span class="inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium border border-border"
                          [class]="activityBadgeClass(line.activityType)">
                          {{ line.activityType }}
                        </span>
                      </td>
                      <td class="px-2 py-2 text-center">
                        {{ line.billable ? '✓' : '—' }}
                      </td>
                      @for (entry of line.entries.slice(0, 5); track $index) {
                        <td class="px-2 py-2 text-center tabular-nums">
                          {{ entry.minutes > 0 ? (entry.minutes / 60) + ' h' : '—' }}
                        </td>
                      }
                      <td class="px-3 py-2 text-right font-bold tabular-nums text-foreground">
                        {{ formatHours(line.lineTotalMinutes) }}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- Historique des validations précédentes -->
            @if (selectedDetail()?.history?.length! > 0) {
              <div class="space-y-2 border-t border-border pt-4">
                <h4 class="text-xs font-semibold text-muted uppercase tracking-wider">Historique des décisions</h4>
                <div class="space-y-2">
                  @for (h of selectedDetail()?.history; track h.id) {
                    <div class="rounded-ui border border-border bg-app/30 p-2.5 text-xs flex justify-between items-start">
                      <div>
                        <span class="font-semibold" [class.text-success-700]="h.decision === 'VALIDATED'" [class.text-danger-700]="h.decision === 'REJECTED'">
                          {{ h.decision === 'VALIDATED' ? '✓ Validée' : '✗ Rejetée' }}
                        </span>
                        <span class="text-muted ml-2">par {{ h.validatorDisplayName }}</span>
                        @if (h.comment) {
                          <p class="mt-1 italic text-foreground">« {{ h.comment }} »</p>
                        }
                      </div>
                      <span class="text-muted text-[10px]">{{ h.decidedAt }}</span>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- Actions du modal -->
            <div class="flex items-center justify-between border-t border-border pt-4">
              <button
                type="button"
                (click)="selectedDetail.set(null)"
                class="rounded-ui border border-border px-4 py-2 text-sm font-medium text-muted hover:bg-app">
                Fermer
              </button>

              @if (selectedDetail()?.overview?.status === 'SUBMITTED') {
                <div class="flex gap-2">
                  <button
                    type="button"
                    (click)="openRejectModalFromDetail()"
                    [disabled]="actionPending()"
                    class="rounded-ui bg-danger-600 px-4 py-2 text-sm font-semibold text-white hover:bg-danger-700 transition disabled:opacity-50">
                    Rejeter la feuille
                  </button>
                  <button
                    type="button"
                    (click)="validateFromDetail()"
                    [disabled]="actionPending()"
                    class="rounded-ui bg-success-600 px-5 py-2 text-sm font-semibold text-white hover:bg-success-700 transition disabled:opacity-50">
                    Valider la feuille
                  </button>
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- Modal Saisie Motif de Rejet -->
      @if (rejectModalOpen()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs" role="dialog" aria-modal="true" aria-labelledby="reject-title">
          <div class="w-full max-w-md rounded-ui border border-border bg-surface p-6 shadow-2xl">
            <h3 id="reject-title" class="text-lg font-bold text-foreground">Rejeter la feuille de temps</h3>
            <p class="mt-1 text-xs text-muted">
              Veuillez indiquer au collaborateur la raison précise du rejet afin qu'il puisse ajuster sa saisie.
            </p>

            <form (ngSubmit)="confirmReject()" class="mt-4 space-y-4">
              <div>
                <label for="reject-comment" class="block text-xs font-semibold uppercase tracking-wider text-muted">
                  Motif de rejet * (min 3 caractères)
                </label>
                <textarea
                  id="reject-comment"
                  [(ngModel)]="rejectComment"
                  name="rejectComment"
                  rows="3"
                  required
                  placeholder="Ex : Merci de corriger les 24h déclarées le mardi..."
                  class="mt-1 block w-full rounded-ui border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-danger-600 focus:outline-none focus:ring-1 focus:ring-danger-600"></textarea>
              </div>

              <div class="flex justify-end gap-3 pt-2 border-t border-border">
                <button
                  type="button"
                  (click)="rejectModalOpen.set(false)"
                  class="rounded-ui border border-border px-4 py-2 text-sm font-medium text-muted hover:bg-app">
                  Annuler
                </button>
                <button
                  type="submit"
                  [disabled]="actionPending() || rejectComment.trim().length < 3"
                  class="rounded-ui bg-danger-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-danger-700 disabled:opacity-50">
                  Confirmer le rejet
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </section>
  `
})
export class ValidationPageComponent implements OnInit {
  private readonly validationService = inject(ValidationService);

  readonly timesheets = signal<PendingTimesheetSummary[]>([]);
  readonly loading = signal<boolean>(true);
  readonly actionPending = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly selectedStatus = signal<string>('SUBMITTED');
  readonly selectedDetail = signal<ManagerTimesheetDetail | null>(null);

  readonly rejectModalOpen = signal<boolean>(false);
  targetTimesheetId: string | null = null;
  rejectComment = '';

  readonly pendingCount = signal<number>(0);

  ngOnInit(): void {
    this.loadTimesheets();
  }

  setStatusFilter(status: string): void {
    this.selectedStatus.set(status);
    this.loadTimesheets();
  }

  loadTimesheets(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.validationService.listPending(this.selectedStatus()).subscribe({
      next: list => {
        this.timesheets.set(list);
        if (this.selectedStatus() === 'SUBMITTED') {
          this.pendingCount.set(list.length);
        }
        this.loading.set(false);
      },
      error: err => {
        this.errorMessage.set(problemMessage(err, 'Impossible de charger les feuilles de temps.'));
        this.loading.set(false);
      }
    });
  }

  openDetail(timesheetId: string): void {
    this.actionPending.set(true);
    this.validationService.getDetail(timesheetId).subscribe({
      next: detail => {
        this.selectedDetail.set(detail);
        this.actionPending.set(false);
      },
      error: err => {
        this.errorMessage.set(problemMessage(err, 'Impossible de charger le détail de la feuille.'));
        this.actionPending.set(false);
      }
    });
  }

  quickValidate(item: PendingTimesheetSummary): void {
    this.actionPending.set(true);
    this.validationService.validate(item.id, 'Feuille validée.').subscribe({
      next: () => {
        this.actionPending.set(false);
        this.successMessage.set(`La feuille de ${item.userDisplayName} a été validée avec succès.`);
        this.loadTimesheets();
      },
      error: err => {
        this.actionPending.set(false);
        this.errorMessage.set(problemMessage(err, 'Erreur lors de la validation de la feuille.'));
      }
    });
  }

  validateFromDetail(): void {
    const detail = this.selectedDetail();
    if (!detail) return;
    this.actionPending.set(true);
    this.validationService.validate(detail.timesheetId, 'Feuille validée.').subscribe({
      next: () => {
        this.actionPending.set(false);
        this.selectedDetail.set(null);
        this.successMessage.set(`La feuille de ${detail.userDisplayName} a été validée avec succès.`);
        this.loadTimesheets();
      },
      error: err => {
        this.actionPending.set(false);
        this.errorMessage.set(problemMessage(err, 'Erreur lors de la validation.'));
      }
    });
  }

  openRejectModal(item: PendingTimesheetSummary): void {
    this.targetTimesheetId = item.id;
    this.rejectComment = '';
    this.rejectModalOpen.set(true);
  }

  openRejectModalFromDetail(): void {
    const detail = this.selectedDetail();
    if (!detail) return;
    this.targetTimesheetId = detail.timesheetId;
    this.rejectComment = '';
    this.rejectModalOpen.set(true);
  }

  confirmReject(): void {
    if (!this.targetTimesheetId || this.rejectComment.trim().length < 3) return;

    this.actionPending.set(true);
    this.validationService.reject(this.targetTimesheetId, this.rejectComment.trim()).subscribe({
      next: () => {
        this.actionPending.set(false);
        this.rejectModalOpen.set(false);
        this.selectedDetail.set(null);
        this.successMessage.set('La feuille de temps a été rejetée et renvoyée pour correction.');
        this.loadTimesheets();
      },
      error: err => {
        this.actionPending.set(false);
        this.errorMessage.set(problemMessage(err, 'Erreur lors du rejet de la feuille.'));
      }
    });
  }

  formatHours(minutes: number): string {
    const h = minutes / 60;
    return h.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 1 }) + ' h';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}`;
  }

  formatDateTime(isoStr: string): string {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  activityBadgeClass(type: ActivityType): string {
    switch (type) {
      case 'PROJECT': return 'bg-brand-50 text-brand-700 border-brand-200';
      case 'TRAINING': return 'bg-violet-50 text-violet-700 border-violet-200';
      case 'SUPPORT': return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'INTERNAL': return 'bg-slate/10 text-slate border-slate/20';
    }
  }
}
