import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../shared/ui/icon.component';
import { ALL_WEEK_DAYS, CreateWorkScheduleRequest, UpdateWorkScheduleRequest, WorkScheduleProfile } from './work-schedule.models';
import { WorkScheduleService } from './work-schedule.service';

@Component({
  selector: 'tf-work-schedules-page',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <!-- En-tête -->
      <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-ink sm:text-3xl">Configuration du temps de travail</h1>
          <p class="mt-1 text-sm text-muted">
            Définition des régimes horaires, jours ouvrés, seuils légaux et autorisations applicables aux collaborateurs.
          </p>
        </div>
        <button
          type="button"
          (click)="openCreateModal()"
          class="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2">
          <tf-icon name="plus" [size]="18" />
          Nouveau régime horaire
        </button>
      </header>

      <!-- Cartes synthétiques -->
      <section class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div class="rounded-xl border border-border bg-surface p-4 shadow-xs">
          <p class="text-xs font-medium uppercase tracking-wider text-muted">Total des régimes</p>
          <p class="mt-1 text-2xl font-bold text-ink">{{ profiles().length }}</p>
          <p class="mt-1 text-xs text-muted">{{ activeCount() }} actif(s) · {{ profiles().length - activeCount() }} inactif(s)</p>
        </div>
        <div class="rounded-xl border border-border bg-surface p-4 shadow-xs">
          <p class="text-xs font-medium uppercase tracking-wider text-muted">Régime par défaut</p>
          <div class="mt-1 flex items-center gap-2">
            <p class="truncate text-xl font-bold text-brand-600">{{ defaultProfile()?.name || 'Aucun' }}</p>
            <span class="inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-800">Défaut</span>
          </div>
          <p class="mt-1 text-xs text-muted">{{ formatMinutes(defaultProfile()?.weeklyTargetMinutes || 0) }} / semaine</p>
        </div>
        <div class="rounded-xl border border-border bg-surface p-4 shadow-xs">
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

      <!-- Grille / Tableau des régimes -->
      <div class="overflow-hidden rounded-xl border border-border bg-surface shadow-xs">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="border-b border-border bg-app/50 text-xs font-semibold uppercase tracking-wider text-muted">
              <tr>
                <th scope="col" class="px-5 py-3.5">Régime / Code</th>
                <th scope="col" class="px-5 py-3.5">Jours ouvrés</th>
                <th scope="col" class="px-5 py-3.5">Cibles (Hebdo / Jour)</th>
                <th scope="col" class="px-5 py-3.5">Plafonds légaux</th>
                <th scope="col" class="px-5 py-3.5">Week-end</th>
                <th scope="col" class="px-5 py-3.5">Collaborateurs</th>
                <th scope="col" class="px-5 py-3.5">Statut</th>
                <th scope="col" class="px-5 py-3.5 text-right">Actions</th>
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
                    <td class="px-5 py-4">
                      <div class="flex items-center gap-2">
                        <span class="font-semibold text-ink">{{ profile.name }}</span>
                        @if (profile.isDefault) {
                          <span class="inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-800">
                            Par défaut
                          </span>
                        }
                      </div>
                      <p class="font-mono text-xs text-muted">{{ profile.code }}</p>
                      @if (profile.description) {
                        <p class="mt-0.5 max-w-xs truncate text-xs text-muted/80" [title]="profile.description">{{ profile.description }}</p>
                      }
                    </td>
                    <td class="px-5 py-4">
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
                    <td class="px-5 py-4">
                      <div class="font-medium text-ink">{{ formatMinutes(profile.weeklyTargetMinutes) }} / sem</div>
                      <div class="text-xs text-muted">{{ formatMinutes(profile.dailyTargetMinutes) }} / jour</div>
                    </td>
                    <td class="px-5 py-4">
                      <div class="text-xs text-ink">Max {{ formatMinutes(profile.maxDailyMinutes) }} / j</div>
                      <div class="text-xs text-muted">Max {{ formatMinutes(profile.maxWeeklyMinutes) }} / sem</div>
                    </td>
                    <td class="px-5 py-4">
                      @if (profile.allowWeekendEntry) {
                        <span class="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          Autorisé
                        </span>
                      } @else {
                        <span class="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                          Interdit
                        </span>
                      }
                    </td>
                    <td class="px-5 py-4">
                      <span class="font-medium text-ink">{{ profile.assignedUsersCount }}</span>
                      <span class="text-xs text-muted ml-1">collab.</span>
                    </td>
                    <td class="px-5 py-4">
                      @if (profile.active) {
                        <span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                          <span class="size-1.5 rounded-full bg-emerald-500" aria-hidden="true"></span>
                          Actif
                        </span>
                      } @else {
                        <span class="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
                          <span class="size-1.5 rounded-full bg-zinc-400" aria-hidden="true"></span>
                          Inactif
                        </span>
                      }
                    </td>
                    <td class="px-5 py-4 text-right">
                      <div class="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          (click)="openEditModal(profile)"
                          class="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-ink transition hover:bg-app"
                          title="Modifier les paramètres">
                          Modifier
                        </button>
                        @if (!profile.isDefault) {
                          <button
                            type="button"
                            (click)="setDefault(profile)"
                            [disabled]="!profile.active"
                            class="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-brand-600 transition hover:bg-brand-50 disabled:opacity-40"
                            title="Définir comme profil par défaut">
                            Par défaut
                          </button>
                          <button
                            type="button"
                            (click)="toggleActive(profile)"
                            class="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted transition hover:bg-app hover:text-ink"
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

      <!-- Modale Création / Édition -->
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
                <p class="mt-1 text-[11px] text-muted">Sélectionnez les jours normaux de travail pour ce profil.</p>
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
                  <p class="mt-1 text-[11px] text-muted">{{ MathRound(formWeeklyHours * 60) }} minutes / sem</p>
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
                  <p class="mt-1 text-[11px] text-muted">{{ MathRound(formDailyHours * 60) }} minutes / jour</p>
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
                  <p class="mt-1 text-[11px] text-muted">Limite légale (ex: 10 h ou 12 h)</p>
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
                  <p class="mt-1 text-[11px] text-muted">Limite légale (ex: 48 h ou 60 h)</p>
                </div>
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
                    <p class="text-xs text-muted">À cocher pour les profils astreinte, support ou interventions exceptionnelles.</p>
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
                  class="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-500 focus:outline-none disabled:opacity-50">
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
    if (edit) {
      const req: UpdateWorkScheduleRequest = {
        name: this.formName.trim(),
        description: this.formDescription.trim() || null,
        weeklyTargetMinutes: weeklyMins,
        dailyTargetMinutes: dailyMins,
        maxDailyMinutes: maxDailyMins,
        maxWeeklyMinutes: maxWeeklyMins,
        workingDays: this.formWorkingDays(),
        allowWeekendEntry: this.formAllowWeekend
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
        isDefault: this.formIsDefault
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
