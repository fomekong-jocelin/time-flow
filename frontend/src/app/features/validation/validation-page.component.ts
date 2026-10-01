import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { IconComponent } from '../../shared/ui/icon.component';
import { AvatarComponent } from '../../shared/ui/avatar.component';
import { ActivityType, TimesheetOverview, TimesheetStatus } from '../timesheets/timesheet.models';
import { ManagerTimesheetDetail, PendingTimesheetSummary } from './validation.models';
import { problemMessage, ValidationService } from './validation.service';

@Component({
  selector: 'tf-validation-page',
  imports: [FormsModule, IconComponent, AvatarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-6">
      <!-- En-tête -->
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div class="flex items-center gap-2 text-sm font-medium text-brand-600">
            <span>Espace Manager</span>
            <span class="text-muted">/</span>
            <span>Contrôle & Validation</span>
          </div>
          <h1 class="mt-1 text-3xl font-bold tracking-tight">Validation des temps</h1>
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
          class="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition"
          [class]="selectedStatus() === 'SUBMITTED' ? 'bg-brand-600 text-white shadow-xs' : 'bg-surface text-muted hover:text-foreground border border-border'">
          <span>À valider</span>
          @if (pendingCount() > 0) {
            <span class="rounded-full bg-white/20 px-2 py-0.2 text-[11px] font-bold">{{ pendingCount() }}</span>
          }
        </button>

        <button
          type="button"
          (click)="setStatusFilter('VALIDATED')"
          class="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition"
          [class]="selectedStatus() === 'VALIDATED' ? 'bg-brand-600 text-white shadow-xs' : 'bg-surface text-muted hover:text-foreground border border-border'">
          Validées
        </button>

        <button
          type="button"
          (click)="setStatusFilter('REJECTED')"
          class="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition"
          [class]="selectedStatus() === 'REJECTED' ? 'bg-brand-600 text-white shadow-xs' : 'bg-surface text-muted hover:text-foreground border border-border'">
          Rejetées
        </button>

        <button
          type="button"
          (click)="setStatusFilter('ALL')"
          class="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition"
          [class]="selectedStatus() === 'ALL' ? 'bg-brand-600 text-white shadow-xs' : 'bg-surface text-muted hover:text-foreground border border-border'">
          Toutes
        </button>
      </div>

      <!-- Règle des 4 yeux / Info auto-validation -->
      @if (hasSelfPendingTimesheet()) {
        <div class="flex items-start gap-3 rounded-ui border border-brand-200 bg-brand-50/50 p-4 text-xs text-brand-800">
          <tf-icon name="lock" [size]="18" class="text-brand-600 shrink-0 mt-0.5" />
          <div class="leading-relaxed">
            <span class="font-semibold">Règle de séparation des contrôles (principe des 4 yeux) :</span>
            Votre propre feuille de temps est soumise pour validation. Conformément aux règles d'audit, elle doit être approuvée par votre supérieur hiérarchique ou un autre administrateur.
          </div>
        </div>
      }

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
            <p class="mt-1 text-xs">Toutes les soumissions sous votre responsabilité sont à jour.</p>
          </div>
        } @else {
          <!-- Vue mobile (< md) : cartes d'application tactiles modernes -->
          <div class="space-y-3 p-4 md:hidden">
            @for (item of timesheets(); track item.id) {
              <div class="rounded-xl border border-border bg-surface p-4 shadow-2xs space-y-3">
                <div class="flex items-start justify-between gap-2">
                  <tf-avatar [name]="item.userDisplayName" [subtext]="item.userEmail" [badge]="item.selfTimesheet ? 'Vous' : ''" size="md" />

                  <!-- Statut -->
                  @switch (item.status) {
                    @case ('SUBMITTED') {
                      <span class="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-600 border border-brand-200 whitespace-nowrap">
                        En attente
                      </span>
                    }
                    @case ('VALIDATED') {
                      <span class="inline-flex shrink-0 items-center gap-1 rounded-full bg-success-50 px-2.5 py-0.5 text-xs font-semibold text-success-700 border border-success-200 whitespace-nowrap">
                        Validée
                      </span>
                    }
                    @case ('REJECTED') {
                      <span class="inline-flex shrink-0 items-center gap-1 rounded-full bg-danger-50 px-2.5 py-0.5 text-xs font-semibold text-danger-700 border border-danger-200 whitespace-nowrap">
                        Rejetée
                      </span>
                    }
                    @default {
                      <span class="inline-flex shrink-0 items-center rounded-full bg-app px-2.5 py-0.5 text-xs text-muted border border-border whitespace-nowrap">
                        {{ item.status }}
                      </span>
                    }
                  }
                </div>

                <!-- Semaine & Dates -->
                <div class="flex items-center justify-between gap-2 pt-1 border-t border-border/50 text-xs">
                  <div class="flex items-center gap-2">
                    <span class="rounded bg-app px-1.5 py-0.5 text-[11px] font-bold text-muted border border-border">S{{ getWeekNumber(item.weekStart) }}</span>
                    <span class="font-medium text-ink">Du {{ formatDate(item.weekStart) }} au {{ formatDate(item.weekEnd) }}</span>
                  </div>
                  @if (item.submittedAt) {
                    <span class="text-muted text-[11px] whitespace-nowrap">Le {{ formatDate(item.submittedAt) }}</span>
                  }
                </div>

                <!-- Métriques heures (Total saisi, Facturable, Alerte légale) -->
                <div class="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-border/50">
                  <div class="rounded-lg bg-app/50 p-2.5 border border-border">
                    <span class="text-muted block text-[11px]">Total saisi</span>
                    <div class="flex items-baseline gap-1 mt-0.5">
                      <span class="font-bold text-ink text-base">{{ formatHours(item.totalMinutes) }}</span>
                      <span class="text-[11px] text-muted">/ {{ formatHours(item.weeklyTargetMinutes) }}</span>
                    </div>
                    @if (item.complianceAlert) {
                      <span class="mt-1 inline-flex items-center gap-1 rounded bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-semibold text-amber-500">
                        <tf-icon name="alert" [size]="10" /> Alerte légale
                      </span>
                    }
                  </div>
                  <div class="rounded-lg bg-app/50 p-2.5 border border-border">
                    <span class="text-muted block text-[11px]">Facturable</span>
                    <div class="flex items-baseline gap-1 mt-0.5">
                      <span class="font-bold text-success-700 text-base">{{ formatHours(item.billableMinutes) }}</span>
                      <span class="text-[11px] text-muted">({{ getBillableRate(item) }})</span>
                    </div>
                  </div>
                </div>

                <!-- Projets -->
                @if (item.projectNames.length > 0) {
                  <div class="pt-1 border-t border-border/50">
                    <span class="text-muted block text-[11px] mb-1">Projets</span>
                    <div class="flex flex-wrap gap-1">
                      @for (proj of item.projectNames; track proj) {
                        <span class="rounded-md bg-brand-50/70 border border-brand-200/60 px-2 py-0.5 text-[11px] font-medium text-brand-700">
                          {{ proj }}
                        </span>
                      }
                    </div>
                  </div>
                }

                <!-- Actions tactiles -->
                <div class="pt-2 border-t border-border flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    (click)="openDetail(item.id)"
                    class="flex-1 min-w-[5rem] inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-foreground hover:bg-app transition shadow-xs text-center">
                    <tf-icon name="eye" [size]="14" />
                    <span>Détail</span>
                  </button>

                  @if (item.status === 'SUBMITTED' && !item.selfTimesheet) {
                    <button
                      type="button"
                      (click)="quickValidate(item)"
                      [disabled]="actionPending()"
                      class="flex-1 min-w-[5rem] inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition shadow-xs disabled:opacity-50 text-center">
                      <tf-icon name="check" [size]="14" />
                      <span>Valider</span>
                    </button>

                    <button
                      type="button"
                      (click)="openRejectModal(item)"
                      [disabled]="actionPending()"
                      class="flex-1 min-w-[5rem] inline-flex items-center justify-center gap-1.5 rounded-lg border border-danger-500/40 bg-surface px-3 py-2 text-xs font-semibold text-danger-600 hover:bg-danger-500/10 transition disabled:opacity-50 text-center">
                      <tf-icon name="alert" [size]="14" />
                      <span>Rejeter</span>
                    </button>
                  }

                  @if (item.selfTimesheet) {
                    <span class="w-full inline-flex items-center justify-center gap-1 rounded-lg bg-app px-2.5 py-1.5 text-xs font-medium text-muted border border-border">
                      <tf-icon name="lock" [size]="12" />
                      <span>Validation tierce requise (principe des 4 yeux)</span>
                    </span>
                  }
                </div>
              </div>
            }
          </div>

          <!-- Vue desktop (hidden md:block) : vrai tableau sans coupure -->
          <div class="hidden md:block overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="border-b border-border bg-app/50 text-xs text-muted">
                <tr>
                  <th scope="col" class="px-5 py-3 text-left font-medium whitespace-nowrap">Collaborateur</th>
                  <th scope="col" class="px-4 py-3 text-left font-medium whitespace-nowrap">Semaine</th>
                  <th scope="col" class="px-4 py-3 text-right font-medium whitespace-nowrap">Total saisi</th>
                  <th scope="col" class="px-4 py-3 text-right font-medium whitespace-nowrap">Facturable</th>
                  <th scope="col" class="px-4 py-3 text-left font-medium whitespace-nowrap">Projets</th>
                  <th scope="col" class="px-3 py-3 text-center font-medium whitespace-nowrap">Statut</th>
                  <th scope="col" class="px-4 py-3 text-left font-medium whitespace-nowrap">Soumise le</th>
                  <th scope="col" class="px-5 py-3 text-right font-medium whitespace-nowrap min-w-[15rem]">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border">
                @for (item of timesheets(); track item.id) {
                  <tr class="transition hover:bg-app/40">
                    <!-- Collaborateur -->
                    <td class="px-5 py-3">
                      <tf-avatar [name]="item.userDisplayName" [subtext]="item.userEmail" [badge]="item.selfTimesheet ? 'Vous' : ''" />
                    </td>

                    <!-- Semaine -->
                    <td class="px-4 py-3 whitespace-nowrap">
                      <div class="flex items-center gap-2">
                        <span class="rounded bg-app px-1.5 py-0.5 text-[11px] font-bold text-muted border border-border">S{{ getWeekNumber(item.weekStart) }}</span>
                        <span class="text-xs font-medium text-foreground">Du {{ formatDate(item.weekStart) }} au {{ formatDate(item.weekEnd) }}</span>
                      </div>
                    </td>

                    <!-- Total saisi & conformité -->
                    <td class="px-4 py-3 text-right whitespace-nowrap">
                      <div class="flex flex-col items-end">
                        <span class="font-bold tabular-nums text-foreground leading-tight">{{ formatHours(item.totalMinutes) }}</span>
                        <span class="text-[11px] text-muted leading-tight">Obj. {{ formatHours(item.weeklyTargetMinutes) }}</span>
                        @if (item.complianceAlert) {
                          <span class="mt-1 inline-flex items-center gap-1 rounded bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-semibold text-amber-500" title="Dépassement du plafond légal de 48h ou plus de 10h par jour">
                            <tf-icon name="alert" [size]="10" />
                            Alerte légale
                          </span>
                        }
                      </div>
                    </td>

                    <!-- Facturable -->
                    <td class="px-4 py-3 text-right whitespace-nowrap">
                      <div class="flex flex-col items-end">
                        <span class="tabular-nums font-semibold text-success-700 leading-tight">{{ formatHours(item.billableMinutes) }}</span>
                        <span class="text-[11px] text-muted leading-tight">{{ getBillableRate(item) }}</span>
                      </div>
                    </td>

                    <!-- Projets -->
                    <td class="px-4 py-3">
                      <div class="flex flex-wrap gap-1 max-w-[13rem]">
                        @for (proj of item.projectNames.slice(0, 2); track proj) {
                          <span class="inline-block truncate max-w-[11rem] rounded-md bg-brand-50/70 border border-brand-200/60 px-2 py-0.5 text-[11px] font-medium text-brand-700" [title]="proj">
                            {{ proj }}
                          </span>
                        }
                        @if (item.projectNames.length > 2) {
                          <span class="inline-block rounded-md bg-app border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted" [title]="item.projectNames.slice(2).join(', ')">
                            +{{ item.projectNames.length - 2 }}
                          </span>
                        }
                        @if (item.projectNames.length === 0) {
                          <span class="text-xs text-muted">—</span>
                        }
                      </div>
                    </td>

                    <!-- Statut -->
                    <td class="px-3 py-3 text-center whitespace-nowrap">
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
                    <td class="px-4 py-3 text-xs text-muted whitespace-nowrap">
                      {{ item.submittedAt ? formatDateTime(item.submittedAt) : '—' }}
                    </td>

                    <!-- Actions (alignées horizontalement) -->
                    <td class="px-5 py-3 text-right whitespace-nowrap">
                      <div class="inline-flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          (click)="openDetail(item.id)"
                          class="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-xs font-semibold text-foreground hover:bg-app transition shadow-xs">
                          <tf-icon name="eye" [size]="14" />
                          <span>Détail</span>
                        </button>

                        @if (item.status === 'SUBMITTED' && !item.selfTimesheet) {
                          <button
                            type="button"
                            (click)="quickValidate(item)"
                            [disabled]="actionPending()"
                            title="Valider la feuille"
                            class="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-500 transition shadow-xs disabled:opacity-50">
                            <tf-icon name="check" [size]="14" />
                            <span>Valider</span>
                          </button>

                          <button
                            type="button"
                            (click)="openRejectModal(item)"
                            [disabled]="actionPending()"
                            title="Rejeter avec motif"
                            class="inline-flex h-8 items-center gap-1.5 rounded-lg border border-danger-500/40 bg-surface px-2.5 text-xs font-semibold text-danger-600 hover:bg-danger-500/10 transition disabled:opacity-50">
                            <tf-icon name="alert" [size]="14" />
                            <span>Rejeter</span>
                          </button>
                        }

                        @if (item.selfTimesheet) {
                          <span class="inline-flex items-center gap-1 rounded-full bg-slate/10 px-2.5 py-1 text-[11px] font-medium text-slate border border-border/50" title="Vous ne pouvez pas valider votre propre feuille (principe des 4 yeux)">
                            <tf-icon name="lock" [size]="11" />
                            <span>Validation tierce</span>
                          </span>
                        }
                      </div>
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
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs" role="dialog" aria-modal="true" aria-labelledby="detail-title">
          <div class="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-ui border border-border bg-surface p-6 shadow-2xl space-y-6">
            <div class="flex items-start justify-between border-b border-border pb-4">
              <tf-avatar
                [name]="selectedDetail()?.userDisplayName || ''"
                [subtext]="(selectedDetail()?.userEmail || '') + ' — Semaine du ' + formatDate(selectedDetail()?.overview?.weekStart!) + ' au ' + formatDate(selectedDetail()?.overview?.weekEnd!)"
                [badge]="isSelectedDetailSelf() ? 'Votre feuille' : ''"
                size="lg" />

              <button type="button" (click)="selectedDetail.set(null)" class="text-muted hover:text-foreground p-1 rounded-lg hover:bg-app transition" aria-label="Fermer">
                <tf-icon name="x" [size]="20" />
              </button>
            </div>

            <!-- Avertissement conformité légale si > 48h -->
            @if (selectedDetail()?.overview?.totalMinutes! > 2880) {
              <div class="rounded-ui border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-600 flex items-start gap-3">
                <tf-icon name="alert" [size]="20" class="text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p class="font-semibold text-amber-500">Avertissement de conformité légale (Code du travail)</p>
                  <p class="mt-0.5 text-amber-600">
                    Cette feuille déclare <strong>{{ formatHours(selectedDetail()?.overview?.totalMinutes || 0) }}</strong>, ce qui dépasse le plafond hebdomadaire légal de 48 heures (Article L. 3121-20). Veuillez vérifier les justificatifs ou conventions d'astreinte avant validation.
                  </p>
                </div>
              </div>
            }

            <!-- KPIs de la feuille examinée -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div class="rounded-ui border border-border bg-app/40 p-3">
                <p class="text-xs text-muted">Total des heures</p>
                <p class="text-xl font-bold tabular-nums text-foreground">{{ formatHours(selectedDetail()?.overview?.totalMinutes || 0) }}</p>
                <p class="text-[11px] text-muted">Objectif : {{ formatHours(selectedDetail()?.overview?.weeklyTargetMinutes || 2100) }}</p>
              </div>
              <div class="rounded-ui border border-border bg-app/40 p-3">
                <p class="text-xs text-muted">Heures facturables</p>
                <p class="text-xl font-bold tabular-nums text-success-700">{{ formatHours(selectedDetail()?.overview?.billableMinutes || 0) }}</p>
                <p class="text-[11px] text-muted">Directement imputables aux clients</p>
              </div>
              <div class="rounded-ui border border-border bg-app/40 p-3">
                <p class="text-xs text-muted">Heures internes / hors projet</p>
                <p class="text-xl font-bold tabular-nums text-slate">{{ formatHours(selectedDetail()?.overview?.internalMinutes || 0) }}</p>
                <p class="text-[11px] text-muted">Support, formations, structure</p>
              </div>
            </div>

            <!-- Grille détaillée des lignes -->
            <div class="overflow-x-auto rounded-ui border border-border">
              <table class="w-full min-w-[38rem] text-xs">
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
                    <th scope="col" class="px-2 py-2 text-center font-medium bg-app/40 text-muted/70">Sam</th>
                    <th scope="col" class="px-2 py-2 text-center font-medium bg-app/40 text-muted/70">Dim</th>
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
                        <td class="px-2 py-2 text-center tabular-nums" [class.bg-amber-500/10]="entry.minutes > 600">
                          {{ entry.minutes > 0 ? (entry.minutes / 60) + ' h' : '—' }}
                        </td>
                      }
                      @for (entry of line.entries.slice(5, 7); track $index) {
                        <td class="px-2 py-2 text-center tabular-nums bg-app/30 text-muted/80">
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
                @if (isSelectedDetailSelf()) {
                  <div class="rounded-md bg-app border border-border px-3 py-2 text-xs text-muted flex items-center gap-2">
                    <tf-icon name="lock" [size]="14" />
                    <span>Auto-validation interdite (règle des 4 yeux) : l'approbation doit être effectuée par un tiers.</span>
                  </div>
                } @else {
                  <div class="flex gap-2">
                    <button
                      type="button"
                      (click)="openRejectModalFromDetail()"
                      [disabled]="actionPending()"
                      class="rounded-ui border border-danger-500/40 bg-surface px-4 py-2 text-sm font-semibold text-danger-600 hover:bg-danger-500/10 transition disabled:opacity-50">
                      Rejeter la feuille
                    </button>
                    <button
                      type="button"
                      (click)="validateFromDetail()"
                      [disabled]="actionPending()"
                      class="rounded-ui bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-500 transition shadow-xs disabled:opacity-50">
                      Valider la feuille
                    </button>
                  </div>
                }
              }
            </div>
          </div>
        </div>
      }

      <!-- Modal Saisie Motif de Rejet -->
      @if (rejectModalOpen()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs" role="dialog" aria-modal="true" aria-labelledby="reject-title">
          <div class="w-full max-w-md rounded-ui border border-border bg-surface p-6 shadow-2xl">
            <h3 id="reject-title" class="text-lg font-bold text-foreground">Rejeter la feuille de temps</h3>
            <p class="mt-1 text-xs text-muted">
              Veuillez indiquer au collaborateur la raison précise du rejet afin qu'il puisse corriger sa saisie. Ce motif s'affichera directement sur son écran CRA.
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
                  placeholder="Ex : Merci de corriger les heures déclarées le mardi ou de ventiler par projet..."
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
  private readonly auth = inject(AuthService);

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

  readonly currentUserId = computed(() => this.auth.currentUser()?.id);
  readonly isSelectedDetailSelf = computed(() => this.selectedDetail()?.userId === this.currentUserId());
  readonly hasSelfPendingTimesheet = computed(() =>
    this.timesheets().some(t => t.selfTimesheet && t.status === 'SUBMITTED')
  );

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
        const actionableCount = list.filter(item => item.status === 'SUBMITTED' && !item.selfTimesheet).length;
        this.pendingCount.set(actionableCount);
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
    if (item.selfTimesheet) return;
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
    if (!detail || this.isSelectedDetailSelf()) return;
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
    if (item.selfTimesheet) return;
    this.targetTimesheetId = item.id;
    this.rejectComment = '';
    this.rejectModalOpen.set(true);
  }

  openRejectModalFromDetail(): void {
    const detail = this.selectedDetail();
    if (!detail || this.isSelectedDetailSelf()) return;
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

  getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).map(p => p[0].toUpperCase()).join('') || '?';
  }

  getWeekNumber(isoDate: string): number {
    if (!isoDate) return 0;
    const date = new Date(isoDate);
    const thursday = new Date(date.getTime() + (3 - ((date.getDay() + 6) % 7)) * 86400000);
    const firstThursday = new Date(thursday.getFullYear(), 0, 4);
    firstThursday.setDate(firstThursday.getDate() - ((firstThursday.getDay() + 6) % 7) + 3);
    return 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * 86400000));
  }

  getBillableRate(item: PendingTimesheetSummary): string {
    if (item.totalMinutes <= 0) return '0%';
    const pct = Math.round((item.billableMinutes / item.totalMinutes) * 100);
    return `${pct}%`;
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
