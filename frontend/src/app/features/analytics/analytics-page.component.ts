import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/auth/auth.service';
import { IconComponent } from '../../shared/ui/icon.component';
import { AvatarComponent } from '../../shared/ui/avatar.component';
import { KpiCardComponent } from '../../shared/ui/kpi-card.component';
import { StatusBadgeComponent } from '../../shared/ui/status-badge.component';
import { AnalyticsOverview } from './analytics.models';
import { AnalyticsService } from './analytics.service';

interface PeriodPreset {
  key: string;
  label: string;
}

@Component({
  selector: 'tf-analytics-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IconComponent,
    AvatarComponent,
    KpiCardComponent,
    StatusBadgeComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <!-- En-tête de page -->
      <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div class="flex items-center gap-2 text-sm font-medium text-brand-600">
            <span>Pilotage & Décision</span>
            <span class="text-muted">/</span>
            <span>Tableau de bord</span>
          </div>
          <h1 class="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">Analyses & Reporting</h1>
          <p class="mt-1 text-sm text-muted">
            Performance opérationnelle, taux d'activité facturable (TACE), suivi des heures supplémentaires et des projets.
          </p>
        </div>

        <button
          type="button"
          (click)="load()"
          [disabled]="loading()"
          class="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 text-xs font-semibold text-ink shadow-2xs transition hover:bg-app disabled:opacity-50 whitespace-nowrap self-start sm:self-auto">
          <tf-icon name="clock" [size]="14" />
          <span>{{ loading() ? 'Actualisation...' : 'Actualiser' }}</span>
        </button>
      </header>

      <!-- Sélecteur de période fluide -->
      <div class="flex items-center gap-2 border-b border-border pb-3 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        @for (preset of periodPresets; track preset.key) {
          <button
            type="button"
            (click)="selectPeriod(preset.key)"
            class="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition whitespace-nowrap"
            [class]="selectedPeriod() === preset.key
              ? 'bg-brand-600 text-white shadow-xs'
              : 'bg-surface text-muted hover:text-ink border border-border'">
            {{ preset.label }}
          </button>
        }
      </div>

      <!-- Messages d'erreur -->
      @if (error()) {
        <div class="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
          <tf-icon name="alert" class="shrink-0 text-red-600" />
          <span>Impossible de charger les données d'analyses. Veuillez réessayer.</span>
          <button type="button" (click)="load()" class="ml-auto text-xs font-semibold underline">Réessayer</button>
        </div>
      }

      @if (loading()) {
        <div class="rounded-xl border border-border bg-surface p-12 text-center text-muted">
          <p>Calcul et consolidation des indicateurs en cours…</p>
        </div>
      } @else if (overview(); as data) {
        <!-- 4 Cartes KPI synthétiques -->
        <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <tf-kpi-card
            label="Taux de facturabilité (TACE)"
            [value]="data.activityRate + ' %'"
            [variant]="taceKpiVariant(data.activityRate)"
            [description]="formatHours(data.billableMinutes) + ' facturables sur ' + formatHours(data.totalMinutes)" />

          <tf-kpi-card
            label="Heures facturables client"
            [value]="formatHours(data.billableMinutes)"
            variant="brand"
            [description]="data.projectsBreakdown.length + ' projet(s) actif(s) sur la période'" />

          <tf-kpi-card
            label="Interne & Formation"
            [value]="formatHours(data.internalMinutes + data.trainingMinutes)"
            description="Support, structure, avant-vente et formation" />

          <tf-kpi-card
            label="Heures supplémentaires (OT)"
            [value]="formatHours(data.overtimeMinutes)"
            [variant]="data.overtimeMinutes > 0 ? 'warning' : 'default'"
            description="Heures réalisées au-delà des régimes légaux" />
        </section>

        <!-- Barre de répartition proportionnelle des activités -->
        <section class="rounded-xl border border-border bg-surface p-5 shadow-2xs space-y-4">
          <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 class="text-base font-semibold text-ink">Répartition globale du temps travaillé</h2>
              <p class="text-xs text-muted">Volume consolidé pour {{ data.periodLabel }} ({{ data.contributorsCount }} collaborateur(s) actif(s))</p>
            </div>
            <span class="text-xs font-semibold text-ink tabular-nums">Total : {{ formatHours(data.totalMinutes) }}</span>
          </div>

          <!-- Jauge segmentée -->
          <div class="h-3 w-full overflow-hidden rounded-full bg-app flex">
            @for (act of data.activitiesBreakdown; track act.activityType) {
              <div
                [style.width.%]="act.sharePercentage"
                [class]="activityColorClass(act.activityType)"
                [title]="act.label + ' : ' + formatHours(act.totalMinutes) + ' (' + act.sharePercentage + '%)'"
                class="h-full transition-all"></div>
            }
          </div>

          <!-- Légende interactive -->
          <div class="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-4 text-xs">
            @for (act of data.activitiesBreakdown; track act.activityType) {
              <div class="flex items-center gap-2">
                <span class="size-2.5 rounded-full shrink-0" [class]="activityDotClass(act.activityType)"></span>
                <div class="min-w-0 flex-1">
                  <span class="block text-muted truncate">{{ act.label }}</span>
                  <span class="font-semibold text-ink">{{ formatHours(act.totalMinutes) }} <span class="text-[11px] text-muted">({{ act.sharePercentage }}%)</span></span>
                </div>
              </div>
            }
          </div>
        </section>

        <!-- Navigation secondaire si manager / admin pour basculer Projets / Équipe -->
        @if (canViewTeam()) {
          <div class="flex gap-2 border-b border-border pb-1">
            <button
              type="button"
              (click)="activeTab.set('projects')"
              class="flex items-center gap-2 border-b-2 px-3.5 py-2 text-sm font-medium transition whitespace-nowrap"
              [class.border-brand-600]="activeTab() === 'projects'"
              [class.text-brand-600]="activeTab() === 'projects'"
              [class.font-semibold]="activeTab() === 'projects'"
              [class.border-transparent]="activeTab() !== 'projects'"
              [class.text-muted]="activeTab() !== 'projects'">
              <tf-icon name="folder" [size]="16" />
              <span>Répartition par Projet ({{ data.projectsBreakdown.length }})</span>
            </button>

            <button
              type="button"
              (click)="activeTab.set('team')"
              class="flex items-center gap-2 border-b-2 px-3.5 py-2 text-sm font-medium transition whitespace-nowrap"
              [class.border-brand-600]="activeTab() === 'team'"
              [class.text-brand-600]="activeTab() === 'team'"
              [class.font-semibold]="activeTab() === 'team'"
              [class.border-transparent]="activeTab() !== 'team'"
              [class.text-muted]="activeTab() !== 'team'">
              <tf-icon name="users" [size]="16" />
              <span>Bilan par Collaborateur ({{ data.usersBreakdown.length }})</span>
            </button>
          </div>
        }

        <!-- Section 1 : Répartition par Projet -->
        @if (activeTab() === 'projects') {
          <section class="rounded-xl border border-border bg-surface shadow-2xs overflow-hidden">
            <div class="border-b border-border p-4 sm:p-5">
              <h2 class="text-base font-semibold text-ink">Consommation par Projet</h2>
              <p class="text-xs text-muted mt-0.5">Ventilation des heures saisies et taux de facturation par mission.</p>
            </div>

            @if (data.projectsBreakdown.length === 0) {
              <p class="p-8 text-center text-sm text-muted">Aucune activité enregistrée sur cette période.</p>
            } @else {
              <!-- Mobile view (< md) : cartes tactiles -->
              <div class="space-y-3 p-4 md:hidden">
                @for (p of data.projectsBreakdown; track p.projectId) {
                  <div class="rounded-xl border border-border bg-surface p-4 shadow-2xs space-y-2.5">
                    <div class="flex items-start justify-between gap-2">
                      <div class="min-w-0 flex-1">
                        <span class="block font-semibold text-ink truncate">{{ p.projectName }}</span>
                        @if (p.projectReference) {
                          <span class="font-mono text-xs text-muted">{{ p.projectReference }}</span>
                        }
                      </div>
                      <span class="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700 whitespace-nowrap">
                        {{ p.sharePercentage }} %
                      </span>
                    </div>

                    <div class="h-2 w-full overflow-hidden rounded-full bg-app">
                      <div class="h-full bg-brand-600 rounded-full" [style.width.%]="p.sharePercentage"></div>
                    </div>

                    <div class="flex items-center justify-between text-xs pt-1 border-t border-border/50">
                      <div>
                        <span class="text-muted block text-[11px]">Total saisi</span>
                        <span class="font-semibold text-ink">{{ formatHours(p.totalMinutes) }}</span>
                      </div>
                      <div class="text-right">
                        <span class="text-muted block text-[11px]">Facturable</span>
                        <span class="font-semibold text-emerald-600">{{ formatHours(p.billableMinutes) }}</span>
                      </div>
                    </div>
                  </div>
                }
              </div>

              <!-- Desktop view (hidden md:block) : vrai tableau sans coupure -->
              <div class="hidden md:block overflow-x-auto">
                <table class="w-full text-left text-sm">
                  <thead class="border-b border-border bg-app/50 text-xs font-semibold uppercase tracking-wider text-muted">
                    <tr>
                      <th scope="col" class="px-5 py-3.5 whitespace-nowrap">Projet</th>
                      <th scope="col" class="px-4 py-3.5 whitespace-nowrap">Référence</th>
                      <th scope="col" class="px-4 py-3.5 text-right whitespace-nowrap">Total saisi</th>
                      <th scope="col" class="px-4 py-3.5 text-right whitespace-nowrap">Facturable</th>
                      <th scope="col" class="px-5 py-3.5 whitespace-nowrap min-w-[12rem]">Part du temps</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-border">
                    @for (p of data.projectsBreakdown; track p.projectId) {
                      <tr class="transition hover:bg-app/50">
                        <td class="px-5 py-3.5 font-semibold text-ink whitespace-nowrap">
                          {{ p.projectName }}
                        </td>
                        <td class="px-4 py-3.5 text-xs font-mono text-muted whitespace-nowrap">
                          {{ p.projectReference || '—' }}
                        </td>
                        <td class="px-4 py-3.5 text-right font-bold text-ink tabular-nums whitespace-nowrap">
                          {{ formatHours(p.totalMinutes) }}
                        </td>
                        <td class="px-4 py-3.5 text-right font-semibold text-emerald-600 tabular-nums whitespace-nowrap">
                          {{ formatHours(p.billableMinutes) }}
                        </td>
                        <td class="px-5 py-3.5 whitespace-nowrap">
                          <div class="flex items-center gap-3">
                            <div class="h-2 w-28 overflow-hidden rounded-full bg-app">
                              <div class="h-full bg-brand-600 rounded-full" [style.width.%]="p.sharePercentage"></div>
                            </div>
                            <span class="text-xs font-semibold text-ink tabular-nums">{{ p.sharePercentage }} %</span>
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </section>
        }

        <!-- Section 2 : Bilan par Collaborateur (si manager / admin) -->
        @if (activeTab() === 'team' && canViewTeam()) {
          <section class="rounded-xl border border-border bg-surface shadow-2xs overflow-hidden">
            <div class="border-b border-border p-4 sm:p-5">
              <h2 class="text-base font-semibold text-ink">Bilan individuel de l'équipe</h2>
              <p class="text-xs text-muted mt-0.5">Taux d'activité et volume horaire par collaborateur.</p>
            </div>

            @if (data.usersBreakdown.length === 0) {
              <p class="p-8 text-center text-sm text-muted">Aucune donnée trouvée pour les membres de l'équipe sur cette période.</p>
            } @else {
              <!-- Mobile view (< md) : cartes tactiles -->
              <div class="space-y-3 p-4 md:hidden">
                @for (u of data.usersBreakdown; track u.userId) {
                  <div class="rounded-xl border border-border bg-surface p-4 shadow-2xs space-y-3">
                    <div class="flex items-start justify-between gap-2">
                      <tf-avatar [name]="u.displayName" [subtext]="u.email" size="md" />
                      <tf-status-badge [variant]="taceBadgeVariant(u.activityRate)">
                        {{ u.activityRate }} % TACE
                      </tf-status-badge>
                    </div>

                    <div class="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-border/50">
                      <div>
                        <span class="text-muted block text-[11px]">Régime horaire</span>
                        <span class="font-medium text-ink mt-0.5 block truncate">{{ u.workScheduleName }}</span>
                      </div>
                      <div>
                        <span class="text-muted block text-[11px]">Heures sup (OT)</span>
                        <span class="font-semibold text-amber-600 mt-0.5 block">{{ formatHours(u.overtimeMinutes) }}</span>
                      </div>
                    </div>

                    <div class="flex items-center justify-between text-xs pt-1 border-t border-border/50">
                      <div>
                        <span class="text-muted block text-[11px]">Total saisi</span>
                        <span class="font-bold text-ink">{{ formatHours(u.totalMinutes) }}</span>
                      </div>
                      <div class="text-right">
                        <span class="text-muted block text-[11px]">Facturable client</span>
                        <span class="font-bold text-emerald-600">{{ formatHours(u.billableMinutes) }}</span>
                      </div>
                    </div>
                  </div>
                }
              </div>

              <!-- Desktop view (hidden md:block) : vrai tableau sans coupure -->
              <div class="hidden md:block overflow-x-auto">
                <table class="w-full text-left text-sm">
                  <thead class="border-b border-border bg-app/50 text-xs font-semibold uppercase tracking-wider text-muted">
                    <tr>
                      <th scope="col" class="px-5 py-3.5 whitespace-nowrap">Collaborateur</th>
                      <th scope="col" class="px-4 py-3.5 whitespace-nowrap">Régime</th>
                      <th scope="col" class="px-4 py-3.5 text-right whitespace-nowrap">Total saisi</th>
                      <th scope="col" class="px-4 py-3.5 text-right whitespace-nowrap">Facturable</th>
                      <th scope="col" class="px-4 py-3.5 text-right whitespace-nowrap">Heures sup (OT)</th>
                      <th scope="col" class="px-5 py-3.5 text-right whitespace-nowrap">TACE (%)</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-border">
                    @for (u of data.usersBreakdown; track u.userId) {
                      <tr class="transition hover:bg-app/50">
                        <td class="px-5 py-3.5 whitespace-nowrap">
                          <tf-avatar [name]="u.displayName" [subtext]="u.email" size="sm" />
                        </td>
                        <td class="px-4 py-3.5 text-xs text-muted whitespace-nowrap">
                          {{ u.workScheduleName }}
                        </td>
                        <td class="px-4 py-3.5 text-right font-bold text-ink tabular-nums whitespace-nowrap">
                          {{ formatHours(u.totalMinutes) }}
                        </td>
                        <td class="px-4 py-3.5 text-right font-semibold text-emerald-600 tabular-nums whitespace-nowrap">
                          {{ formatHours(u.billableMinutes) }}
                        </td>
                        <td class="px-4 py-3.5 text-right text-amber-600 font-medium tabular-nums whitespace-nowrap">
                          {{ formatHours(u.overtimeMinutes) }}
                        </td>
                        <td class="px-5 py-3.5 text-right whitespace-nowrap">
                          <tf-status-badge [variant]="taceBadgeVariant(u.activityRate)">
                            {{ u.activityRate }} %
                          </tf-status-badge>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </section>
        }
      }
    </div>
  `
})
export class AnalyticsPageComponent implements OnInit {
  private readonly api = inject(AnalyticsService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly periodPresets: PeriodPreset[] = [
    { key: '2026-10', label: 'Octobre 2026' },
    { key: '2026-09', label: 'Septembre 2026' },
    { key: '2026-Q4', label: '4e Trimestre 2026' },
    { key: '2026', label: 'Année 2026' }
  ];

  readonly selectedPeriod = signal('2026-10');
  readonly overview = signal<AnalyticsOverview | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly activeTab = signal<'projects' | 'team'>('projects');

  readonly canViewTeam = computed(() => {
    const role = this.auth.currentUser()?.role;
    return role === 'MANAGER' || role === 'DIRECTION' || role === 'ADMIN';
  });

  ngOnInit(): void {
    this.load();
  }

  selectPeriod(period: string): void {
    this.selectedPeriod.set(period);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.api.getOverview(this.selectedPeriod())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: data => {
          this.overview.set(data);
          this.loading.set(false);
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
        }
      });
  }

  formatHours(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h} h ${m.toString().padStart(2, '0')}`;
  }

  taceKpiVariant(rate: number): 'success' | 'brand' | 'warning' | 'default' {
    if (rate >= 80) return 'success';
    if (rate >= 60) return 'brand';
    if (rate > 0) return 'warning';
    return 'default';
  }

  taceBadgeVariant(rate: number): 'success' | 'brand' | 'warning' | 'neutral' {
    if (rate >= 80) return 'success';
    if (rate >= 60) return 'brand';
    if (rate > 0) return 'warning';
    return 'neutral';
  }

  activityColorClass(type: string): string {
    const upper = type.toUpperCase();
    if (upper === 'PROJECT' || upper === 'PROJET') return 'bg-brand-600';
    if (upper === 'INTERNAL' || upper === 'INTERNE') return 'bg-indigo-400';
    if (upper === 'TRAINING' || upper === 'FORMATION') return 'bg-emerald-500';
    if (upper === 'SUPPORT') return 'bg-amber-500';
    return 'bg-zinc-400';
  }

  activityDotClass(type: string): string {
    const upper = type.toUpperCase();
    if (upper === 'PROJECT' || upper === 'PROJET') return 'bg-brand-600';
    if (upper === 'INTERNAL' || upper === 'INTERNE') return 'bg-indigo-400';
    if (upper === 'TRAINING' || upper === 'FORMATION') return 'bg-emerald-500';
    if (upper === 'SUPPORT') return 'bg-amber-500';
    return 'bg-zinc-400';
  }
}
