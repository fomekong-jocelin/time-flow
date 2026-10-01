import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../shared/ui/icon.component';
import { ALL_WEEK_DAYS, CreateWorkScheduleRequest, UpdateWorkScheduleRequest, WorkScheduleProfile } from './work-schedule.models';
import { WorkScheduleService } from './work-schedule.service';
import { PublicHolidaysPanelComponent } from './public-holidays-panel.component';
import { OvertimePoliciesPanelComponent } from './overtime-policies-panel.component';

@Component({
  selector: 'tf-work-schedules-page',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, PublicHolidaysPanelComponent, OvertimePoliciesPanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <!-- En-tête de page responsive -->
      <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-ink sm:text-3xl">Configuration du temps de travail</h1>
          <p class="mt-1 text-sm text-muted">
            Régimes horaires, jours ouvrés, seuils légaux, règles OT/ET et jours fériés.
          </p>
        </div>
        @if (activeTab() === 'schedules') {
          <button
            type="button"
            (click)="openCreateModal()"
            class="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-2xs transition hover:bg-brand-500 focus:outline-none whitespace-nowrap">
            <tf-icon name="plus" [size]="18" />
            <span>Nouveau régime horaire</span>
          </button>
        }
      </header>

      <!-- Navigation par sous-onglets fluide -->
      <div class="flex gap-2 border-b border-border overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          (click)="activeTab.set('schedules')"
          class="flex items-center gap-2 border-b-2 px-3.5 py-2 text-sm font-medium transition whitespace-nowrap"
          [class.border-brand-600]="activeTab() === 'schedules'"
          [class.text-brand-600]="activeTab() === 'schedules'"
          [class.font-semibold]="activeTab() === 'schedules'"
          [class.border-transparent]="activeTab() !== 'schedules'"
          [class.text-muted]="activeTab() !== 'schedules'"
          [class.hover:text-ink]="activeTab() !== 'schedules'">
          <tf-icon name="clock" [size]="16" />
          <span>Régimes horaires</span>
        </button>

        <button
          type="button"
          (click)="activeTab.set('ot_et')"
          class="flex items-center gap-2 border-b-2 px-3.5 py-2 text-sm font-medium transition whitespace-nowrap"
          [class.border-brand-600]="activeTab() === 'ot_et'"
          [class.text-brand-600]="activeTab() === 'ot_et'"
          [class.font-semibold]="activeTab() === 'ot_et'"
          [class.border-transparent]="activeTab() !== 'ot_et'"
          [class.text-muted]="activeTab() !== 'ot_et'"
          [class.hover:text-ink]="activeTab() !== 'ot_et'">
          <tf-icon name="sliders" [size]="16" />
          <span>Politiques OT & ET</span>
        </button>

        <button
          type="button"
          (click)="activeTab.set('holidays')"
          class="flex items-center gap-2 border-b-2 px-3.5 py-2 text-sm font-medium transition whitespace-nowrap"
          [class.border-brand-600]="activeTab() === 'holidays'"
          [class.text-brand-600]="activeTab() === 'holidays'"
          [class.font-semibold]="activeTab() === 'holidays'"
          [class.border-transparent]="activeTab() !== 'holidays'"
          [class.text-muted]="activeTab() !== 'holidays'"
          [class.hover:text-ink]="activeTab() !== 'holidays'">
          <tf-icon name="calendar" [size]="16" />
          <span>Jours fériés</span>
        </button>
      </div>

      <!-- Onglet 1 : Régimes horaires -->
      @if (activeTab() === 'schedules') {
        <!-- Cartes synthétiques KPI sans coupure -->
        <section class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div class="rounded-xl border border-border bg-surface p-4 shadow-2xs">
            <p class="text-xs font-medium uppercase tracking-wider text-muted">Total des régimes</p>
            <p class="mt-1 text-2xl font-bold text-ink">{{ profiles().length }}</p>
            <p class="mt-1 text-xs text-muted">{{ activeCount() }} actif(s) · {{ profiles().length - activeCount() }} inactif(s)</p>
          </div>
          <div class="rounded-xl border border-border bg-surface p-4 shadow-2xs">
            <p class="text-xs font-medium uppercase tracking-wider text-muted">Régime par défaut</p>
            <div class="mt-1 flex items-center gap-2 flex-wrap">
              <p class="text-lg font-bold text-brand-600 sm:text-xl">{{ defaultProfile()?.name || 'Aucun' }}</p>
              <span class="inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-800 whitespace-nowrap">Défaut</span>
            </div>
            <p class="mt-1 text-xs text-muted">{{ formatMinutes(defaultProfile()?.weeklyTargetMinutes || 0) }} / semaine</p>
          </div>
          <div class="rounded-xl border border-border bg-surface p-4 shadow-2xs">
            <p class="text-xs font-medium uppercase tracking-wider text-muted">Collaborateurs rattachés</p>
            <p class="mt-1 text-2xl font-bold text-ink">{{ totalAssignedUsers() }}</p>
            <p class="mt-1 text-xs text-muted">Sur l'ensemble des régimes configurés</p>
          </div>
        </section>

        <!-- Feedback messages -->
        @if (errorMessage()) {
          <div class="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
            <tf-icon name="alert" class="shrink-0 text-red-600" />
            <span>{{ errorMessage() }}</span>
            <button type="button" (click)="errorMessage.set(null)" class="ml-auto text-xs font-medium underline">Fermer</button>
          </div>
        }
        @if (successMessage()) {
          <div class="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800" role="alert">
            <tf-icon name="check" class="shrink-0 text-emerald-600" />
            <span>{{ successMessage() }}</span>
            <button type="button" (click)="successMessage.set(null)" class="ml-auto text-xs font-medium underline">Fermer</button>
          </div>
        }

        <!-- Vue mobile (< lg) : cartes d'application tactiles modernes -->
        <div class="space-y-3 block lg:hidden">
          @if (loading()) {
            <div class="rounded-xl border border-border bg-surface p-8 text-center text-muted">
              Chargement des régimes horaires...
            </div>
          } @else if (profiles().length === 0) {
            <div class="rounded-xl border border-border bg-surface p-8 text-center text-muted">
              Aucun régime horaire trouvé.
            </div>
          } @else {
            @for (profile of profiles(); track profile.id) {
              <div class="rounded-xl border border-border bg-surface p-4 shadow-2xs space-y-3" [class.opacity-60]="!profile.active">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="font-bold text-ink text-base leading-tight">{{ profile.name }}</span>
                      @if (profile.isDefault) {
                        <span class="inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-800 whitespace-nowrap">
                          Par défaut
                        </span>
                      }
                    </div>
                    <p class="font-mono text-xs text-muted mt-0.5">{{ profile.code }}</p>
                    @if (profile.description) {
                      <p class="text-xs text-muted mt-1 leading-relaxed">{{ profile.description }}</p>
                    }
                  </div>
                  <span class="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap"
                    [class]="profile.active ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-600'">
                    <span class="size-1.5 rounded-full" [class]="profile.active ? 'bg-emerald-500' : 'bg-zinc-400'"></span>
                    {{ profile.active ? 'Actif' : 'Inactif' }}
                  </span>
                </div>

                <!-- Jours ouvrés en pilules tactiles -->
                <div>
                  <p class="text-[11px] font-medium uppercase tracking-wider text-muted mb-1">Jours ouvrés</p>
                  <div class="flex items-center gap-1">
                    @for (day of weekDays; track day.key) {
                      <span
                        [title]="day.fullLabel"
                        class="inline-grid size-7 place-items-center rounded-md text-xs font-medium"
                        [class.bg-brand-600]="isWorkingDay(profile, day.key)"
                        [class.text-white]="isWorkingDay(profile, day.key)"
                        [class.bg-app]="!isWorkingDay(profile, day.key)"
                        [class.text-muted]="!isWorkingDay(profile, day.key)"
                        [class.opacity-40]="!isWorkingDay(profile, day.key)">
                        {{ day.shortLabel[0] }}
                      </span>
                    }
                  </div>
                </div>

                <!-- Grille métriques -->
                <div class="grid grid-cols-2 gap-2 text-xs rounded-lg bg-app/50 p-3">
                  <div>
                    <span class="text-muted block text-[11px]">Cibles :</span>
                    <span class="font-semibold text-ink">{{ formatMinutes(profile.weeklyTargetMinutes) }} / sem</span>
                    <span class="text-muted text-[11px] ml-1">({{ formatMinutes(profile.dailyTargetMinutes) }} / j)</span>
                  </div>
                  <div>
                    <span class="text-muted block text-[11px]">Plafonds max :</span>
                    <span class="font-medium text-ink">Max {{ formatMinutes(profile.maxDailyMinutes) }} / j</span>
                  </div>
                  <div>
                    <span class="text-muted block text-[11px]">Week-end :</span>
                    <span [class]="profile.allowWeekendEntry ? 'text-emerald-700 font-semibold' : 'text-zinc-600'">
                      {{ profile.allowWeekendEntry ? 'Autorisé' : 'Interdit' }}
                    </span>
                  </div>
                  <div>
                    <span class="text-muted block text-[11px]">Collaborateurs :</span>
                    <span class="font-semibold text-ink">{{ profile.assignedUsersCount }} collab.</span>
                  </div>
                </div>

                <!-- Boutons d'action -->
                <div class="pt-2 border-t border-border flex items-center justify-end gap-2 flex-wrap">
                  <button
                    type="button"
                    (click)="openEditModal(profile)"
                    class="flex-1 min-w-[5rem] rounded-lg border border-border px-3 py-2 text-xs font-medium text-ink transition hover:bg-app text-center whitespace-nowrap">
                    Modifier
                  </button>
                  @if (!profile.isDefault) {
                    <button
                      type="button"
                      (click)="setDefault(profile)"
                      [disabled]="!profile.active"
                      class="flex-1 min-w-[5rem] rounded-lg border border-border px-3 py-2 text-xs font-medium text-brand-600 transition hover:bg-brand-50 disabled:opacity-40 text-center whitespace-nowrap">
                      Par défaut
                    </button>
                    <button
                      type="button"
                      (click)="toggleActive(profile)"
                      class="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted transition hover:bg-app hover:text-ink text-center whitespace-nowrap">
                      {{ profile.active ? 'Désactiver' : 'Activer' }}
                    </button>
                  }
                </div>
              </div>
            }
          }
        </div>

        <!-- Vue desktop (hidden lg:block) : grand tableau sans aucune coupure de texte -->
        <div class="hidden lg:block overflow-hidden rounded-xl border border-border bg-surface shadow-2xs">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="border-b border-border bg-app/50 text-xs font-semibold uppercase tracking-wider text-muted">
                <tr>
                  <th scope="col" class="px-5 py-3.5 whitespace-nowrap">Régime / Code</th>
                  <th scope="col" class="px-5 py-3.5 whitespace-nowrap">Jours ouvrés</th>
                  <th scope="col" class="px-5 py-3.5 whitespace-nowrap">Cibles (Hebdo / Jour)</th>
                  <th scope="col" class="px-5 py-3.5 whitespace-nowrap">Plafonds légaux</th>
                  <th scope="col" class="px-5 py-3.5 whitespace-nowrap">Week-end</th>
                  <th scope="col" class="px-5 py-3.5 whitespace-nowrap">Collaborateurs</th>
                  <th scope="col" class="px-5 py-3.5 whitespace-nowrap">Statut</th>
                  <th scope="col" class="px-5 py-3.5 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border">
                @if (loading()) {
                  <tr>
                    <td colspan="8" class="px-5 py-8 text-center text-muted">Chargement des régimes horaires...</td>
                  </tr>
                } @else if (profiles().length === 0) {
                  <tr>
                    <td colspan="8" class="px-5 py-8 text-center text-muted">Aucun régime horaire trouvé.</td>
                  </tr>
                } @else {
                  @for (profile of profiles(); track profile.id) {
                    <tr class="transition hover:bg-app/40" [class.opacity-60]="!profile.active">
                      <td class="px-5 py-4 whitespace-nowrap">
                        <div class="flex items-center gap-2">
                          <span class="font-semibold text-ink">{{ profile.name }}</span>
                          @if (profile.isDefault) {
                            <span class="inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-800 whitespace-nowrap">
                              Par défaut
                            </span>
                          }
                        </div>
                        <p class="font-mono text-xs text-muted">{{ profile.code }}</p>
                        @if (profile.description) {
                          <p class="mt-0.5 max-w-xs truncate text-xs text-muted/80" [title]="profile.description">{{ profile.description }}</p>
                        }
                      </td>
                      <td class="px-5 py-4 whitespace-nowrap">
                        <div class="flex items-center gap-1">
                          @for (day of weekDays; track day.key) {
                            <span
                              [title]="day.fullLabel"
                              class="inline-grid size-6 place-items-center rounded text-[11px] font-medium"
                              [class.bg-brand-600]="isWorkingDay(profile, day.key)"
                              [class.text-white]="isWorkingDay(profile, day.key)"
                              [class.bg-app]="!isWorkingDay(profile, day.key)"
                              [class.text-muted]="!isWorkingDay(profile, day.key)"
                              [class.opacity-40]="!isWorkingDay(profile, day.key)">
                              {{ day.shortLabel[0] }}
                            </span>
                          }
                        </div>
                      </td>
                      <td class="px-5 py-4 whitespace-nowrap">
                        <div class="font-medium text-ink">{{ formatMinutes(profile.weeklyTargetMinutes) }} / sem</div>
                        <div class="text-xs text-muted">{{ formatMinutes(profile.dailyTargetMinutes) }} / jour</div>
                      </td>
                      <td class="px-5 py-4 whitespace-nowrap">
                        <div class="text-xs text-ink font-medium">Max {{ formatMinutes(profile.maxDailyMinutes) }} / j</div>
                        <div class="text-xs text-muted">Max {{ formatMinutes(profile.maxWeeklyMinutes) }} / sem</div>
                      </td>
                      <td class="px-5 py-4 whitespace-nowrap">
                        @if (profile.allowWeekendEntry) {
                          <span class="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 whitespace-nowrap">
                            Autorisé
                          </span>
                        } @else {
                          <span class="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 whitespace-nowrap">
                            Interdit
                          </span>
                        }
                      </td>
                      <td class="px-5 py-4 whitespace-nowrap">
                        <span class="font-medium text-ink">{{ profile.assignedUsersCount }}</span>
                        <span class="text-xs text-muted ml-1">collab.</span>
                      </td>
                      <td class="px-5 py-4 whitespace-nowrap">
                        @if (profile.active) {
                          <span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 whitespace-nowrap">
                            <span class="size-1.5 rounded-full bg-emerald-500" aria-hidden="true"></span>
                            Actif
                          </span>
                        } @else {
                          <span class="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 whitespace-nowrap">
                            <span class="size-1.5 rounded-full bg-zinc-400" aria-hidden="true"></span>
                            Inactif
                          </span>
                        }
                      </td>
                      <td class="px-5 py-4 text-right whitespace-nowrap">
                        <div class="flex items-center justify-end gap-1.5 whitespace-nowrap">
                          <button
                            type="button"
                            (click)="openEditModal(profile)"
                            class="whitespace-nowrap inline-flex items-center rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-ink transition hover:bg-app"
                            title="Modifier les paramètres">
                            Modifier
                          </button>
                          @if (!profile.isDefault) {
                            <button
                              type="button"
                              (click)="setDefault(profile)"
                              [disabled]="!profile.active"
                              class="whitespace-nowrap inline-flex items-center rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-brand-600 transition hover:bg-brand-50 disabled:opacity-40"
                              title="Définir comme profil par défaut">
                              Par défaut
                            </button>
                            <button
                              type="button"
                              (click)="toggleActive(profile)"
                              class="whitespace-nowrap inline-flex items-center rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted transition hover:bg-app hover:text-ink"
                              [title]="profile.active ? 'Désactiver le profil' : 'Activer le profil'">
                              {{ profile.active ? 'Désactiver' : 'Activer' }}
                            </button>
                          }
                        </div>
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- Onglet 2 : Politiques OT & ET -->
      @if (activeTab() === 'ot_et') {
        <tf-overtime-policies-panel
          [profiles]="profiles()"
          (editRequested)="openEditModal($event)" />
      }

      <!-- Onglet 3 : Jours fériés -->
      @if (activeTab() === 'holidays') {
        <tf-public-holidays-panel />
      }

      <!-- Modale Création / Édition complète avec onglet OT/ET -->
      @if (modalOpen()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs" role="dialog" aria-modal="true">
          <div class="w-full max-w-2xl rounded-2xl border border-border bg-surface p-6 shadow-xl space-y-5 max-h-[90vh] overflow-y-auto">
            <header class="flex items-center justify-between border-b border-border pb-3">
              <h2 class="text-lg font-bold text-ink">
                {{ editingProfile() ? 'Modifier le régime horaire' : 'Nouveau régime horaire' }}
              </h2>
              <button type="button" (click)="closeModal()" class="text-muted hover:text-ink text-sm">✕</button>
            </header>

            <form (ngSubmit)="saveModal()" class="space-y-4">
              <!-- Code & Nom -->
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label class="block text-xs font-semibold uppercase tracking-wider text-muted">Code unique</label>
                  <input
                    type="text"
                    [(ngModel)]="formCode"
                    name="formCode"
                    [disabled]="editingProfile() !== null"
                    placeholder="EX: CADRE_38H30"
                    required
                    class="mt-1.5 w-full rounded-lg border border-border bg-app px-3 py-2 text-sm font-mono text-ink placeholder:text-muted/50 focus:border-brand-500 focus:outline-none disabled:opacity-50" />
                  <p class="mt-1 text-[11px] text-muted">Identifiant technique unique</p>
                </div>
                <div>
                  <label class="block text-xs font-semibold uppercase tracking-wider text-muted">Nom usuel</label>
                  <input
                    type="text"
                    [(ngModel)]="formName"
                    name="formName"
                    placeholder="Ex: Forfait Cadre 38 h 30"
                    required
                    class="mt-1.5 w-full rounded-lg border border-border bg-app px-3 py-2 text-sm text-ink placeholder:text-muted/50 focus:border-brand-500 focus:outline-none" />
                </div>
              </div>

              <!-- Description -->
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-muted">Description (optionnelle)</label>
                <input
                  type="text"
                  [(ngModel)]="formDescription"
                  name="formDescription"
                  placeholder="Ex: Régime applicable aux consultants cadres avec acquisition de RTT"
                  class="mt-1.5 w-full rounded-lg border border-border bg-app px-3 py-2 text-sm text-ink placeholder:text-muted/50 focus:border-brand-500 focus:outline-none" />
              </div>

              <!-- Jours ouvrés -->
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">Jours ouvrés contractuels</label>
                <div class="flex flex-wrap gap-2">
                  @for (day of weekDays; track day.key) {
                    <button
                      type="button"
                      (click)="toggleFormDay(day.key)"
                      class="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition"
                      [class.bg-brand-50]="formWorkingDays().includes(day.key)"
                      [class.border-brand-500]="formWorkingDays().includes(day.key)"
                      [class.text-brand-800]="formWorkingDays().includes(day.key)"
                      [class.border-border]="!formWorkingDays().includes(day.key)"
                      [class.bg-app]="!formWorkingDays().includes(day.key)"
                      [class.text-muted]="!formWorkingDays().includes(day.key)">
                      <tf-icon [name]="formWorkingDays().includes(day.key) ? 'check' : 'bars'" [size]="14" />
                      {{ day.fullLabel }}
                    </button>
                  }
                </div>
              </div>

              <!-- Heures Cibles -->
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 rounded-xl border border-border bg-app/30 p-3.5">
                <div>
                  <label class="block text-xs font-semibold uppercase tracking-wider text-muted">Cible hebdomadaire (heures)</label>
                  <div class="mt-1.5 flex items-center gap-2">
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      max="60"
                      [(ngModel)]="formWeeklyHours"
                      name="formWeeklyHours"
                      (change)="recalcDailyFromWeekly()"
                      required
                      class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-brand-500 focus:outline-none" />
                    <span class="text-xs text-muted font-medium">h / sem</span>
                  </div>
                  <p class="mt-1 text-[11px] text-muted">{{ MathRound(formWeeklyHours * 60) }} min / sem</p>
                </div>
                <div>
                  <label class="block text-xs font-semibold uppercase tracking-wider text-muted">Cible quotidienne (heures)</label>
                  <div class="mt-1.5 flex items-center gap-2">
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="12"
                      [(ngModel)]="formDailyHours"
                      name="formDailyHours"
                      required
                      class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-brand-500 focus:outline-none" />
                    <span class="text-xs text-muted font-medium">h / jour</span>
                  </div>
                  <p class="mt-1 text-[11px] text-muted">{{ MathRound(formDailyHours * 60) }} min / jour</p>
                </div>
              </div>

              <!-- Plafonds Légaux -->
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 rounded-xl border border-border bg-app/30 p-3.5">
                <div>
                  <label class="block text-xs font-semibold uppercase tracking-wider text-muted">Plafond quotidien max (heures)</label>
                  <div class="mt-1.5 flex items-center gap-2">
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      max="12"
                      [(ngModel)]="formMaxDailyHours"
                      name="formMaxDailyHours"
                      required
                      class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-brand-500 focus:outline-none" />
                    <span class="text-xs text-muted font-medium">h / j</span>
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-semibold uppercase tracking-wider text-muted">Plafond hebdomadaire max (heures)</label>
                  <div class="mt-1.5 flex items-center gap-2">
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      max="60"
                      [(ngModel)]="formMaxWeeklyHours"
                      name="formMaxWeeklyHours"
                      required
                      class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-brand-500 focus:outline-none" />
                    <span class="text-xs text-muted font-medium">h / sem</span>
                  </div>
                </div>
              </div>

              <!-- Section Paramètres OT (Overtime / Heures supplémentaires) -->
              <div class="rounded-xl border border-border bg-brand-50/20 p-3.5 space-y-3">
                <div class="flex items-center gap-2">
                  <tf-icon name="clock" [size]="16" class="text-brand-600" />
                  <h4 class="text-xs font-bold uppercase tracking-wider text-brand-600">Paramètres OT (Overtime - Heures supplémentaires)</h4>
                </div>
                <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label class="block text-[11px] font-medium text-muted">Seuil déclenchement OT (h)</label>
                    <input
                      type="number"
                      step="0.5"
                      [(ngModel)]="formOtThresholdHours"
                      name="formOtThresholdHours"
                      class="mt-1 w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-ink focus:border-brand-500 focus:outline-none" />
                  </div>
                  <div>
                    <label class="block text-[11px] font-medium text-muted">Majoration Tranche 1 (taux)</label>
                    <input
                      type="number"
                      step="0.05"
                      [(ngModel)]="formOtRateTier1"
                      name="formOtRateTier1"
                      placeholder="1.25 (+25%)"
                      class="mt-1 w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-ink focus:border-brand-500 focus:outline-none" />
                  </div>
                  <div>
                    <label class="block text-[11px] font-medium text-muted">Majoration Tranche 2 (taux)</label>
                    <input
                      type="number"
                      step="0.05"
                      [(ngModel)]="formOtRateTier2"
                      name="formOtRateTier2"
                      placeholder="1.50 (+50%)"
                      class="mt-1 w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-ink focus:border-brand-500 focus:outline-none" />
                  </div>
                </div>
                <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label class="block text-[11px] font-medium text-muted">Majoration Dimanches & Fériés (taux)</label>
                    <input
                      type="number"
                      step="0.05"
                      [(ngModel)]="formOtRateHoliday"
                      name="formOtRateHoliday"
                      placeholder="2.00 (+100%)"
                      class="mt-1 w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-ink focus:border-brand-500 focus:outline-none" />
                  </div>
                  <div>
                    <label class="block text-[11px] font-medium text-muted">Mode de compensation OT</label>
                    <select
                      [(ngModel)]="formOtCompensationMode"
                      name="formOtCompensationMode"
                      class="mt-1 w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-ink focus:border-brand-500 focus:outline-none">
                      <option value="PAY">Paiement majoré sur salaire</option>
                      <option value="RECOVERY">Repos compensateur / RTT</option>
                      <option value="HYBRID">Paiement ou RTT au choix</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- Section Paramètres ET (Extra Time / Heures complémentaires) -->
              <div class="rounded-xl border border-border bg-teal-50/20 p-3.5 space-y-3">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <tf-icon name="sliders" [size]="16" class="text-teal-600" />
                    <h4 class="text-xs font-bold uppercase tracking-wider text-teal-700">Paramètres ET (Extra Time - Heures complémentaires)</h4>
                  </div>
                  <label class="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      [(ngModel)]="formEtAllowed"
                      name="formEtAllowed"
                      class="rounded border-border text-teal-600 focus:ring-teal-500" />
                    <span class="font-medium text-ink">Activer l'Extra Time</span>
                  </label>
                </div>
                @if (formEtAllowed) {
                  <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label class="block text-[11px] font-medium text-muted">Plafond max ET (h / sem)</label>
                      <input
                        type="number"
                        step="0.5"
                        [(ngModel)]="formEtMaxHours"
                        name="formEtMaxHours"
                        class="mt-1 w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-ink focus:border-teal-500 focus:outline-none" />
                    </div>
                    <div>
                      <label class="block text-[11px] font-medium text-muted">Majoration ET (taux)</label>
                      <input
                        type="number"
                        step="0.05"
                        [(ngModel)]="formEtRate"
                        name="formEtRate"
                        placeholder="1.10 (+10%)"
                        class="mt-1 w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-ink focus:border-teal-500 focus:outline-none" />
                    </div>
                    <div>
                      <label class="block text-[11px] font-medium text-muted">Compensation ET</label>
                      <select
                        [(ngModel)]="formEtCompensationMode"
                        name="formEtCompensationMode"
                        class="mt-1 w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-ink focus:border-teal-500 focus:outline-none">
                        <option value="PAY">Paiement sur salaire</option>
                        <option value="RECOVERY">Repos compensateur</option>
                      </select>
                    </div>
                  </div>
                }
              </div>

              <!-- Options Week-end & Défaut -->
              <div class="space-y-3 pt-2">
                <label class="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    [(ngModel)]="formAllowWeekend"
                    name="formAllowWeekend"
                    class="rounded border-border text-brand-600 focus:ring-brand-500" />
                  <div>
                    <span class="text-sm font-medium text-ink">Autoriser la saisie le week-end (Samedi & Dimanche)</span>
                    <p class="text-xs text-muted">À cocher pour les profils astreinte ou interventions exceptionnelles.</p>
                  </div>
                </label>

                @if (!editingProfile()) {
                  <label class="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      [(ngModel)]="formIsDefault"
                      name="formIsDefault"
                      class="rounded border-border text-brand-600 focus:ring-brand-500" />
                    <div>
                      <span class="text-sm font-medium text-ink">Définir comme régime par défaut</span>
                      <p class="text-xs text-muted">Sera automatiquement attribué aux nouveaux collaborateurs.</p>
                    </div>
                  </label>
                }
              </div>

              @if (modalError()) {
                <div class="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                  {{ modalError() }}
                </div>
              }

              <!-- Boutons action -->
              <div class="flex items-center justify-end gap-3 border-t border-border pt-4">
                <button
                  type="button"
                  (click)="closeModal()"
                  class="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted transition hover:bg-app hover:text-ink">
                  Annuler
                </button>
                <button
                  type="submit"
                  [disabled]="submitting()"
                  class="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-2xs transition hover:bg-brand-500 focus:outline-none disabled:opacity-50">
                  @if (submitting()) {
                    <span>Enregistrement...</span>
                  } @else {
                    <span>{{ editingProfile() ? 'Mettre à jour' : 'Créer le régime' }}</span>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `
})
export class WorkSchedulesPageComponent implements OnInit {
  private readonly service = inject(WorkScheduleService);

  readonly activeTab = signal<'schedules' | 'ot_et' | 'holidays'>('schedules');
  readonly weekDays = ALL_WEEK_DAYS;
  readonly profiles = signal<WorkScheduleProfile[]>([]);
  readonly loading = signal(false);
  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  // Modal State
  readonly modalOpen = signal(false);
  readonly editingProfile = signal<WorkScheduleProfile | null>(null);
  readonly modalError = signal<string | null>(null);

  formCode = '';
  formName = '';
  formDescription = '';
  readonly formWorkingDays = signal<string[]>(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']);
  formWeeklyHours = 35;
  formDailyHours = 7;
  formMaxDailyHours = 10;
  formMaxWeeklyHours = 48;
  formAllowWeekend = false;
  formIsDefault = false;

  // OT / ET Form State
  formOtThresholdHours = 35;
  formOtRateTier1 = 1.25;
  formOtRateTier2 = 1.50;
  formOtRateHoliday = 2.00;
  formOtCompensationMode: 'PAY' | 'RECOVERY' | 'HYBRID' = 'PAY';

  formEtAllowed = true;
  formEtMaxHours = 7;
  formEtRate = 1.10;
  formEtCompensationMode: 'PAY' | 'RECOVERY' | 'HYBRID' = 'PAY';

  readonly activeCount = computed(() => this.profiles().filter(p => p.active).length);
  readonly defaultProfile = computed(() => this.profiles().find(p => p.isDefault));
  readonly totalAssignedUsers = computed(() => this.profiles().reduce((acc, p) => acc + p.assignedUsersCount, 0));

  readonly MathRound = Math.round;

  ngOnInit(): void {
    this.loadProfiles();
  }

  loadProfiles(): void {
    this.loading.set(true);
    this.service.listAll(true).subscribe({
      next: data => {
        this.profiles.set(data);
        this.loading.set(false);
      },
      error: err => {
        this.errorMessage.set(err.error?.message || 'Erreur lors du chargement des régimes horaires.');
        this.loading.set(false);
      }
    });
  }

  isWorkingDay(profile: WorkScheduleProfile, dayKey: string): boolean {
    return profile.workingDays.includes(dayKey);
  }

  formatMinutes(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`;
  }

  openCreateModal(): void {
    this.editingProfile.set(null);
    this.formCode = '';
    this.formName = '';
    this.formDescription = '';
    this.formWorkingDays.set(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']);
    this.formWeeklyHours = 35;
    this.formDailyHours = 7;
    this.formMaxDailyHours = 10;
    this.formMaxWeeklyHours = 48;
    this.formAllowWeekend = false;
    this.formIsDefault = false;
    this.formOtThresholdHours = 35;
    this.formOtRateTier1 = 1.25;
    this.formOtRateTier2 = 1.50;
    this.formOtRateHoliday = 2.00;
    this.formOtCompensationMode = 'PAY';
    this.formEtAllowed = false;
    this.formEtMaxHours = 0;
    this.formEtRate = 1.10;
    this.formEtCompensationMode = 'PAY';
    this.modalError.set(null);
    this.modalOpen.set(true);
  }

  openEditModal(profile: WorkScheduleProfile): void {
    this.editingProfile.set(profile);
    this.formCode = profile.code;
    this.formName = profile.name;
    this.formDescription = profile.description || '';
    this.formWorkingDays.set([...profile.workingDays]);
    this.formWeeklyHours = +(profile.weeklyTargetMinutes / 60).toFixed(2);
    this.formDailyHours = +(profile.dailyTargetMinutes / 60).toFixed(2);
    this.formMaxDailyHours = +(profile.maxDailyMinutes / 60).toFixed(2);
    this.formMaxWeeklyHours = +(profile.maxWeeklyMinutes / 60).toFixed(2);
    this.formAllowWeekend = profile.allowWeekendEntry;
    this.formIsDefault = profile.isDefault;
    this.formOtThresholdHours = +(profile.overtimeThresholdMinutes / 60).toFixed(2);
    this.formOtRateTier1 = profile.overtimeRateTier1;
    this.formOtRateTier2 = profile.overtimeRateTier2;
    this.formOtRateHoliday = profile.overtimeRateHoliday;
    this.formOtCompensationMode = profile.overtimeCompensationMode;
    this.formEtAllowed = profile.extraTimeAllowed;
    this.formEtMaxHours = +(profile.extraTimeMaxWeeklyMinutes / 60).toFixed(2);
    this.formEtRate = profile.extraTimeRate;
    this.formEtCompensationMode = profile.extraTimeCompensationMode;
    this.modalError.set(null);
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.editingProfile.set(null);
    this.modalError.set(null);
  }

  toggleFormDay(dayKey: string): void {
    const current = this.formWorkingDays();
    if (current.includes(dayKey)) {
      if (current.length === 1) {
        this.modalError.set('Au moins un jour ouvré de travail doit être sélectionné.');
        return;
      }
      this.formWorkingDays.set(current.filter(d => d !== dayKey));
    } else {
      this.formWorkingDays.set([...current, dayKey]);
    }
    this.modalError.set(null);
    this.recalcDailyFromWeekly();
  }

  recalcDailyFromWeekly(): void {
    const daysCount = this.formWorkingDays().length;
    if (daysCount > 0 && this.formWeeklyHours > 0) {
      this.formDailyHours = +(this.formWeeklyHours / daysCount).toFixed(2);
    }
  }

  saveModal(): void {
    if (!this.formName.trim()) {
      this.modalError.set('Le nom du régime est obligatoire.');
      return;
    }
    if (this.formWorkingDays().length === 0) {
      this.modalError.set('Veuillez sélectionner au moins un jour ouvré.');
      return;
    }

    const weeklyMins = Math.round(this.formWeeklyHours * 60);
    const dailyMins = Math.round(this.formDailyHours * 60);
    const maxDailyMins = Math.round(this.formMaxDailyHours * 60);
    const maxWeeklyMins = Math.round(this.formMaxWeeklyHours * 60);

    if (maxDailyMins < dailyMins) {
      this.modalError.set('Le plafond quotidien max doit être supérieur ou égal à la cible journalière.');
      return;
    }
    if (maxWeeklyMins < weeklyMins) {
      this.modalError.set('Le plafond hebdomadaire max doit être supérieur ou égal à la cible hebdomadaire.');
      return;
    }

    this.submitting.set(true);
    this.modalError.set(null);

    const edit = this.editingProfile();
    const otMins = Math.round(this.formOtThresholdHours * 60);
    const etMins = Math.round(this.formEtMaxHours * 60);

    if (edit) {
      const req: UpdateWorkScheduleRequest = {
        name: this.formName.trim(),
        description: this.formDescription.trim() || null,
        weeklyTargetMinutes: weeklyMins,
        dailyTargetMinutes: dailyMins,
        maxDailyMinutes: maxDailyMins,
        maxWeeklyMinutes: maxWeeklyMins,
        workingDays: this.formWorkingDays(),
        allowWeekendEntry: this.formAllowWeekend,
        overtimeThresholdMinutes: otMins,
        overtimeRateTier1: this.formOtRateTier1,
        overtimeRateTier2: this.formOtRateTier2,
        overtimeRateHoliday: this.formOtRateHoliday,
        overtimeCompensationMode: this.formOtCompensationMode,
        extraTimeAllowed: this.formEtAllowed,
        extraTimeMaxWeeklyMinutes: etMins,
        extraTimeRate: this.formEtRate,
        extraTimeCompensationMode: this.formEtCompensationMode
      };

      this.service.update(edit.id, req).subscribe({
        next: () => {
          this.submitting.set(false);
          this.closeModal();
          this.successMessage.set('Régime horaire mis à jour avec succès.');
          this.loadProfiles();
        },
        error: err => {
          this.submitting.set(false);
          this.modalError.set(err.error?.message || 'Erreur lors de la mise à jour.');
        }
      });
    } else {
      if (!this.formCode.trim()) {
        this.modalError.set('Le code du régime est obligatoire.');
        this.submitting.set(false);
        return;
      }

      const req: CreateWorkScheduleRequest = {
        code: this.formCode.trim().toUpperCase(),
        name: this.formName.trim(),
        description: this.formDescription.trim() || null,
        weeklyTargetMinutes: weeklyMins,
        dailyTargetMinutes: dailyMins,
        maxDailyMinutes: maxDailyMins,
        maxWeeklyMinutes: maxWeeklyMins,
        workingDays: this.formWorkingDays(),
        allowWeekendEntry: this.formAllowWeekend,
        isDefault: this.formIsDefault,
        overtimeThresholdMinutes: otMins,
        overtimeRateTier1: this.formOtRateTier1,
        overtimeRateTier2: this.formOtRateTier2,
        overtimeRateHoliday: this.formOtRateHoliday,
        overtimeCompensationMode: this.formOtCompensationMode,
        extraTimeAllowed: this.formEtAllowed,
        extraTimeMaxWeeklyMinutes: etMins,
        extraTimeRate: this.formEtRate,
        extraTimeCompensationMode: this.formEtCompensationMode
      };

      this.service.create(req).subscribe({
        next: () => {
          this.submitting.set(false);
          this.closeModal();
          this.successMessage.set('Nouveau régime horaire créé avec succès.');
          this.loadProfiles();
        },
        error: err => {
          this.submitting.set(false);
          this.modalError.set(err.error?.message || 'Erreur lors de la création.');
        }
      });
    }
  }

  setDefault(profile: WorkScheduleProfile): void {
    if (profile.isDefault || !profile.active) return;
    this.service.setDefault(profile.id).subscribe({
      next: () => {
        this.successMessage.set(`Le régime « ${profile.name} » est désormais le régime par défaut.`);
        this.loadProfiles();
      },
      error: err => {
        this.errorMessage.set(err.error?.message || 'Impossible de définir comme profil par défaut.');
      }
    });
  }

  toggleActive(profile: WorkScheduleProfile): void {
    if (profile.isDefault) return;
    this.service.toggleActive(profile.id).subscribe({
      next: () => {
        this.successMessage.set(`Statut du régime « ${profile.name} » modifié.`);
        this.loadProfiles();
      },
      error: err => {
        this.errorMessage.set(err.error?.message || 'Impossible de modifier le statut actif.');
      }
    });
  }
}
