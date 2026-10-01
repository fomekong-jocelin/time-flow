import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/auth/auth.service';
import { IconComponent } from '../../shared/ui/icon.component';
import { AvatarComponent } from '../../shared/ui/avatar.component';
import { KpiCardComponent } from '../../shared/ui/kpi-card.component';
import { StatusBadgeComponent } from '../../shared/ui/status-badge.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { I18nService } from '../../core/i18n/i18n.service';
import { AnalyticsOverview } from './analytics.models';
import { AnalyticsService } from './analytics.service';
import { ValidationService } from '../validation/validation.service';
import { SubordinateSummary } from '../validation/validation.models';
import { ProjectService, Project } from '../projects/project.service';

interface PeriodPreset {
  key: string;
  label: string;
}

interface ChartBarData {
  key: string;
  label: string;
  dayOfMonth: number;
  totalMinutes: number;
  billableMinutes: number;
  x: number;
  y: number;
  width: number;
  height: number;
  isTick: boolean;
  tickX: number;
  tickLabel: string;
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
    StatusBadgeComponent,
    TranslatePipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <!-- En-tête de page -->
      <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div class="flex items-center gap-2 text-sm font-medium text-brand-600 dark:text-brand-400">
            <span>{{ 'nav.analytics' | translate }}</span>
            <span class="text-muted">/</span>
            <span>{{ 'analytics.period' | translate }}</span>
          </div>
          <h1 class="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">{{ 'analytics.title' | translate }}</h1>
          <p class="mt-1 text-sm text-muted">
            {{ 'analytics.subtitle' | translate }}
          </p>
        </div>

        <div class="flex items-center gap-2 self-start sm:self-auto">
          @if (hasActiveFilters()) {
            <button
              type="button"
              (click)="resetFilters()"
              class="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline cursor-pointer">
              {{ 'analytics.resetFilters' | translate }}
            </button>
          }
          <button
            type="button"
            (click)="toggleFilterPanel()"
            class="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 text-xs font-semibold text-ink shadow-2xs transition hover:bg-app whitespace-nowrap cursor-pointer"
            [class.border-brand-500]="showFilterPanel() || hasActiveFilters()"
            [class.bg-brand-50]="showFilterPanel()"
            [class.dark:bg-brand-950/40]="showFilterPanel()">
            <tf-icon name="filter" [size]="14" />
            <span>{{ 'common.filter' | translate }}</span>
            @if (activeFilterCount() > 0) {
              <span class="rounded-full bg-brand-600 text-white px-1.5 py-0.2 text-[10px] font-bold">{{ activeFilterCount() }}</span>
            }
          </button>
        </div>
      </header>

      <!-- Panneau de filtres multi-critères dépliable (Collaborateur, Projet) -->
      @if (showFilterPanel()) {
        <div class="rounded-2xl border border-border bg-surface p-4 sm:p-5 shadow-2xs space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <tf-icon name="sliders" [size]="16" class="text-brand-600 dark:text-brand-400" />
              <span class="text-xs font-semibold uppercase tracking-wider text-ink">{{ 'analytics.filterPanelTitle' | translate }}</span>
            </div>
            @if (hasActiveFilters()) {
              <button
                type="button"
                (click)="resetFilters()"
                class="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline cursor-pointer">
                {{ 'analytics.resetFilters' | translate }}
              </button>
            }
          </div>

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-2 border-t border-border/60">
            @if (canViewTeam()) {
              <div>
                <label class="block text-[11px] font-medium text-muted mb-1">{{ 'analytics.filterWho' | translate }}</label>
                <select
                  [ngModel]="selectedUserId()"
                  (ngModelChange)="selectedUserId.set($event); onFilterChange()"
                  class="w-full rounded-xl border border-border bg-app px-3 py-2 text-xs font-medium text-ink focus:border-brand-500 focus:outline-none">
                  <option value="">{{ 'analytics.allCollaborators' | translate }}</option>
                  @for (sub of subordinates(); track sub.id) {
                    <option [value]="sub.id">{{ sub.displayName }} ({{ sub.email }})</option>
                  }
                </select>
              </div>
            }

            <div>
              <label class="block text-[11px] font-medium text-muted mb-1">{{ 'analytics.filterProject' | translate }}</label>
              <select
                [ngModel]="selectedProjectId()"
                (ngModelChange)="selectedProjectId.set($event); onFilterChange()"
                class="w-full rounded-xl border border-border bg-app px-3 py-2 text-xs font-medium text-ink focus:border-brand-500 focus:outline-none">
                <option value="">{{ 'analytics.allProjects' | translate }}</option>
                @for (proj of projects(); track proj.id) {
                  <option [value]="proj.id">{{ proj.name }}</option>
                }
              </select>
            </div>
          </div>
        </div>
      }

      <!-- Sélecteur de période fluide -->
      <div class="flex items-center gap-2 border-b border-border pb-3 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        @for (preset of periodPresets(); track preset.key) {
          <button
            type="button"
            (click)="selectPeriod(preset.key)"
            class="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition whitespace-nowrap cursor-pointer"
            [class]="selectedPeriod() === preset.key
              ? 'bg-brand-600 text-white shadow-xs'
              : 'bg-surface text-muted hover:text-ink border border-border hover:bg-app'">
            {{ preset.label }}
          </button>
        }
      </div>

      <!-- Messages d'erreur -->
      @if (error()) {
        <div class="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300" role="alert">
          <tf-icon name="alert" class="shrink-0 text-red-600 dark:text-red-400" />
          <span>{{ 'common.error' | translate }}</span>
          <button type="button" (click)="load()" class="ml-auto text-xs font-semibold underline cursor-pointer">{{ 'common.retry' | translate }}</button>
        </div>
      }

      @if (loading()) {
        <div class="rounded-2xl border border-border bg-surface p-12 text-center text-muted">
          <p>{{ 'analytics.calculating' | translate }}</p>
        </div>
      } @else if (overview(); as data) {
        <!-- 1. Rangée des 4 Cartes KPI synthétiques avec icônes distinctives -->
        <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <tf-kpi-card
            icon="percent"
            iconColor="purple"
            [label]="'analytics.tace' | translate"
            [value]="i18n.formatNumber(data.activityRate) + ' %'"
            [variant]="taceKpiVariant(data.activityRate)"
            [description]="'analytics.taceDescDetail' | translate:{ billable: formatHours(data.billableMinutes), total: formatHours(data.totalMinutes) }" />

          <tf-kpi-card
            icon="file"
            iconColor="blue"
            [label]="'analytics.billable' | translate"
            [value]="formatHours(data.billableMinutes)"
            variant="brand"
            [description]="'analytics.billableActiveProjects' | translate:{ count: data.projectsBreakdown.length }" />

          <tf-kpi-card
            icon="graduation"
            iconColor="purple"
            [label]="'analytics.internal' | translate"
            [value]="formatHours(data.internalMinutes + data.trainingMinutes)"
            variant="default"
            [description]="'analytics.internalSubDetail' | translate" />

          <tf-kpi-card
            icon="clock"
            iconColor="purple"
            [label]="'analytics.overtime' | translate"
            [value]="formatHours(data.overtimeMinutes)"
            [variant]="data.overtimeMinutes > 0 ? 'warning' : 'default'"
            [description]="'analytics.overtimeSubDetail' | translate" />
        </section>

        <!-- 2. Rangée centrale : Donut Répartition globale & Histogramme Tendance des heures -->
        <section class="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <!-- Carte Gauche : Donut de répartition globale des activités -->
          <div class="lg:col-span-5 rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
            <div>
              <div class="flex items-start justify-between gap-2 border-b border-border/60 pb-3">
                <div>
                  <h2 class="text-base font-semibold text-ink">{{ 'analytics.activityDistributionTitle' | translate }}</h2>
                  <p class="text-xs text-muted mt-0.5">{{ 'analytics.activityDistributionSub' | translate:{ period: periodLabel(), count: data.contributorsCount } }}</p>
                </div>
                <span class="rounded-full bg-brand-50 dark:bg-brand-950/60 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:text-brand-300 border border-brand-200/60 dark:border-brand-800/60 whitespace-nowrap">
                  {{ 'analytics.totalConsolidated' | translate:{ total: formatHours(data.totalMinutes) } }}
                </span>
              </div>

              <!-- Zone visuelle Donut + Légende -->
              <div class="mt-5 flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-around">
                <!-- SVG Donut Chart -->
                <div class="relative flex size-44 shrink-0 items-center justify-center">
                  <svg viewBox="0 0 160 160" class="size-full -rotate-90">
                    <!-- Cercle de fond (track) -->
                    <circle
                      cx="80"
                      cy="80"
                      r="60"
                      fill="none"
                      stroke-width="18"
                      class="stroke-zinc-100 dark:stroke-zinc-800/80" />

                    <!-- Segments d'activités -->
                    @for (seg of donutSegments(); track seg.type) {
                      <circle
                        cx="80"
                        cy="80"
                        r="60"
                        fill="none"
                        [attr.stroke]="seg.color"
                        stroke-width="18"
                        stroke-linecap="round"
                        [attr.stroke-dasharray]="seg.dashArray"
                        [attr.stroke-dashoffset]="seg.dashOffset"
                        class="transition-all duration-500" />
                    }
                  </svg>

                  <!-- Texte central -->
                  <div class="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                    <span class="text-lg font-bold tracking-tight text-ink tabular-nums">{{ formatHours(data.totalMinutes) }}</span>
                    <span class="text-[11px] font-medium uppercase tracking-wider text-muted">{{ 'common.total' | translate }}</span>
                    <span class="mt-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">{{ i18n.formatNumber(data.activityRate) }}%</span>
                  </div>
                </div>

                <!-- Légende synthétique -->
                <div class="flex-1 space-y-3 w-full sm:w-auto">
                  @for (act of data.activitiesBreakdown; track act.activityType) {
                    <div class="flex items-center justify-between gap-3 text-xs">
                      <div class="flex items-center gap-2 min-w-0">
                        <span class="size-2.5 rounded-full shrink-0" [style.background-color]="activityColor(act.activityType)"></span>
                        <span class="text-muted truncate">{{ ('activities.' + act.activityType) | translate }}</span>
                      </div>
                      <div class="flex items-center gap-2 tabular-nums shrink-0">
                        <span class="font-semibold text-ink">{{ formatHours(act.totalMinutes) }}</span>
                        <span class="text-[11px] text-muted">({{ i18n.formatNumber(act.sharePercentage) }}%)</span>
                      </div>
                    </div>
                  }
                  @if (data.overtimeMinutes > 0) {
                    <div class="flex items-center justify-between gap-3 text-xs">
                      <div class="flex items-center gap-2 min-w-0">
                        <span class="size-2.5 rounded-full shrink-0 bg-amber-500"></span>
                        <span class="text-muted truncate">{{ 'analytics.overtime' | translate }}</span>
                      </div>
                      <span class="font-semibold text-amber-600 dark:text-amber-400 tabular-nums">{{ formatHours(data.overtimeMinutes) }}</span>
                    </div>
                  }
                </div>
              </div>
            </div>

            <!-- Synthèse intégrée Facturable vs Non Facturable (évite un second donut superflu) -->
            <div class="mt-5 pt-3.5 border-t border-border/60">
              <div class="flex items-center justify-between text-xs mb-2">
                <span class="font-semibold text-ink">{{ 'analytics.billableVsNonBillable' | translate }}</span>
                <span class="text-muted tabular-nums">
                  {{ i18n.formatNumber(data.activityRate) }}% {{ 'analytics.billableHours' | translate | lowercase }}
                </span>
              </div>
              <div class="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800 flex">
                <div class="h-full bg-brand-600 transition-all duration-500" [style.width.%]="data.activityRate"></div>
                <div class="h-full bg-indigo-300 dark:bg-indigo-900/60 transition-all duration-500" [style.width.%]="100 - data.activityRate"></div>
              </div>
              <div class="mt-2 flex items-center justify-between text-[11px] text-muted">
                <span class="flex items-center gap-1.5">
                  <span class="size-2 rounded-full bg-brand-600"></span>
                  <span>{{ 'analytics.billableHours' | translate }}: {{ formatHours(data.billableMinutes) }}</span>
                </span>
                <span class="flex items-center gap-1.5">
                  <span class="size-2 rounded-full bg-indigo-300 dark:bg-indigo-900/60"></span>
                  <span>{{ 'analytics.nonBillableHours' | translate }}: {{ formatHours(data.totalMinutes - data.billableMinutes) }}</span>
                </span>
              </div>
            </div>
          </div>

          <!-- Carte Droite : Histogramme Tendance des heures (Hours Trend) -->
          <div class="lg:col-span-7 rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
            <div>
              <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-3">
                <div>
                  <h2 class="text-base font-semibold text-ink">{{ 'analytics.hoursTrend' | translate:{ period: periodLabel() } }}</h2>
                  <p class="text-xs text-muted mt-0.5">
                    {{ (hasDailyTrend() ? 'analytics.hoursTrendDaily' : 'analytics.hoursTrendMonthly') | translate:{ total: formatHours(data.totalMinutes) } }}
                  </p>
                </div>
                <!-- Indicateur au survol -->
                @if (activeBar(); as bar) {
                  <div class="rounded-lg bg-brand-500/10 border border-brand-500/20 px-2.5 py-1 text-xs font-semibold text-brand-600 dark:text-brand-400 tabular-nums">
                    {{ bar.label }} : {{ formatHours(bar.totalMinutes) }}
                  </div>
                }
              </div>

              <!-- Graphique Histogramme SVG responsive -->
              <div class="mt-4 w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <svg viewBox="0 0 600 220" class="w-full min-w-[480px] h-56 select-none">
                  <!-- Lignes directrices horizontales (grid lines) et étiquettes Y -->
                  @for (tick of yAxisTicks(); track tick.value) {
                    <g>
                      <line
                        x1="45"
                        [attr.y1]="tick.y"
                        x2="585"
                        [attr.y2]="tick.y"
                        stroke="currentColor"
                        [attr.stroke-dasharray]="tick.value === 0 ? '0' : '3 3'"
                        class="stroke-border/70" />
                      <text
                        x="38"
                        [attr.y]="tick.y + 4"
                        text-anchor="end"
                        class="text-[11px] font-medium fill-muted">
                        {{ tick.value }} h
                      </text>
                    </g>
                  }

                  <!-- Colonnes / Barres -->
                  @for (bar of chartBars(); track bar.key) {
                    <g
                      (mouseenter)="activeBar.set(bar)"
                      (mouseleave)="activeBar.set(null)"
                      class="cursor-pointer group">
                      @if (bar.height > 0) {
                        <rect
                          [attr.x]="bar.x"
                          [attr.y]="bar.y"
                          [attr.width]="bar.width"
                          [attr.height]="bar.height"
                          rx="3"
                          class="fill-brand-600 dark:fill-brand-500 group-hover:fill-brand-400 transition-colors">
                          <title>{{ 'analytics.dayHourTooltip' | translate:{ date: bar.label, hours: formatHours(bar.totalMinutes), billable: formatHours(bar.billableMinutes) } }}</title>
                        </rect>
                      } @else {
                        <!-- Repère subtil à la base -->
                        <line
                          [attr.x1]="bar.x"
                          y1="180"
                          [attr.x2]="bar.x + bar.width"
                          y2="180"
                          stroke="currentColor"
                          class="stroke-border/40" />
                      }

                      <!-- Repères de date sur l'axe X -->
                      @if (bar.isTick) {
                        <text
                          [attr.x]="bar.tickX"
                          y="200"
                          text-anchor="middle"
                          class="text-[11px] font-medium fill-muted">
                          {{ bar.tickLabel }}
                        </text>
                      }
                    </g>
                  }
                </svg>
              </div>
            </div>

            <!-- Sous-titre indicatif -->
            <div class="mt-2 flex items-center justify-between text-[11px] text-muted border-t border-border/40 pt-2.5">
              <span>{{ hasDailyTrend() ? ('analytics.currentMonth' | translate) : ('analytics.currentYear' | translate) }}</span>
              <span class="flex items-center gap-1.5">
                <span class="size-2 rounded-full bg-brand-500"></span>
                <span>{{ 'analytics.totalSaisi' | translate }}</span>
              </span>
            </div>
          </div>
        </section>

        <!-- 3. Section basse : Navigation & Découpage Projets & Équipe (« Moins chargé ») -->
        <div class="space-y-4">
          @if (canViewTeam()) {
            <div class="flex items-center gap-2 border-b border-border pb-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <button
                type="button"
                (click)="activeTab.set('projects')"
                class="flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-2 text-sm font-medium transition whitespace-nowrap cursor-pointer"
                [class.border-brand-600]="activeTab() === 'projects'"
                [class.text-brand-600]="activeTab() === 'projects'"
                [class.font-semibold]="activeTab() === 'projects'"
                [class.border-transparent]="activeTab() !== 'projects'"
                [class.text-muted]="activeTab() !== 'projects'">
                <tf-icon name="folder" [size]="16" />
                <span>{{ 'analytics.projectsTab' | translate:{ count: data.projectsBreakdown.length } }}</span>
              </button>

              <button
                type="button"
                (click)="activeTab.set('team')"
                class="flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-2 text-sm font-medium transition whitespace-nowrap cursor-pointer"
                [class.border-brand-600]="activeTab() === 'team'"
                [class.text-brand-600]="activeTab() === 'team'"
                [class.font-semibold]="activeTab() === 'team'"
                [class.border-transparent]="activeTab() !== 'team'"
                [class.text-muted]="activeTab() !== 'team'">
                <tf-icon name="users" [size]="16" />
                <span>{{ 'analytics.teamTab' | translate:{ count: data.usersBreakdown.length } }}</span>
              </button>
            </div>
          }

          <!-- Vue Onglet 1 : Ventilation par Projet -->
          @if (activeTab() === 'projects') {
            <section class="rounded-2xl border border-border bg-surface shadow-2xs overflow-hidden">
              <div class="flex items-center justify-between border-b border-border p-4 sm:p-5">
                <div>
                  <h2 class="text-base font-semibold text-ink">{{ 'analytics.projectsBreakdown' | translate }}</h2>
                  <p class="text-xs text-muted mt-0.5">{{ 'analytics.projectsBreakdownSub' | translate }}</p>
                </div>
                <span class="rounded-full bg-app px-2.5 py-1 text-xs font-medium text-muted border border-border">
                  {{ 'projects.projectsDisplayed' | translate:{ count: data.projectsBreakdown.length } }}
                </span>
              </div>

              @if (data.projectsBreakdown.length === 0) {
                <p class="p-8 text-center text-sm text-muted">{{ 'analytics.noData' | translate }}</p>
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
                        <span class="rounded-full bg-brand-50 dark:bg-brand-950/60 px-2 py-0.5 text-xs font-semibold text-brand-700 dark:text-brand-300 whitespace-nowrap">
                          {{ p.sharePercentage }} %
                        </span>
                      </div>

                      <div class="h-2 w-full overflow-hidden rounded-full bg-app">
                        <div class="h-full bg-brand-600 rounded-full" [style.width.%]="p.sharePercentage"></div>
                      </div>

                      <div class="flex items-center justify-between text-xs pt-1 border-t border-border/50">
                        <div>
                          <span class="text-muted block text-[11px]">{{ 'analytics.totalSaisi' | translate }}</span>
                          <span class="font-semibold text-ink">{{ formatHours(p.totalMinutes) }}</span>
                        </div>
                        <div class="text-right">
                          <span class="text-muted block text-[11px]">{{ 'timesheets.sidePanel.billableBadge' | translate }}</span>
                          <span class="font-semibold text-emerald-600 dark:text-emerald-400">{{ formatHours(p.billableMinutes) }}</span>
                        </div>
                      </div>
                    </div>
                  }
                </div>

                <!-- Desktop view (hidden md:block) : tableau propre sans coupure -->
                <div class="hidden md:block overflow-x-auto">
                  <table class="w-full text-left text-sm">
                    <thead class="border-b border-border bg-app/50 text-xs font-semibold uppercase tracking-wider text-muted">
                      <tr>
                        <th scope="col" class="px-5 py-3.5 whitespace-nowrap">{{ 'activities.PROJECT' | translate }}</th>
                        <th scope="col" class="px-4 py-3.5 whitespace-nowrap">{{ 'analytics.refCol' | translate }}</th>
                        <th scope="col" class="px-4 py-3.5 text-right whitespace-nowrap">{{ 'analytics.totalSaisi' | translate }}</th>
                        <th scope="col" class="px-4 py-3.5 text-right whitespace-nowrap">{{ 'timesheets.sidePanel.billableBadge' | translate }}</th>
                        <th scope="col" class="px-5 py-3.5 whitespace-nowrap min-w-[12rem]">{{ 'analytics.shareOfTime' | translate }}</th>
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
                          <td class="px-4 py-3.5 text-right font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap">
                            {{ formatHours(p.billableMinutes) }}
                          </td>
                          <td class="px-5 py-3.5 whitespace-nowrap">
                            <div class="flex items-center gap-3">
                              <div class="h-2 w-32 overflow-hidden rounded-full bg-app">
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

          <!-- Vue Onglet 2 : Bilan par Collaborateur (si manager / admin) -->
          @if (activeTab() === 'team' && canViewTeam()) {
            <section class="rounded-2xl border border-border bg-surface shadow-2xs overflow-hidden">
              <div class="flex items-center justify-between border-b border-border p-4 sm:p-5">
                <div>
                  <h2 class="text-base font-semibold text-ink">{{ 'analytics.teamBreakdownTitle' | translate }}</h2>
                  <p class="text-xs text-muted mt-0.5">{{ 'analytics.teamBreakdownSub' | translate }}</p>
                </div>
                <span class="rounded-full bg-app px-2.5 py-1 text-xs font-medium text-muted border border-border">
                  {{ 'workSchedules.collabCount' | translate:{ count: data.usersBreakdown.length } }}
                </span>
              </div>

              @if (data.usersBreakdown.length === 0) {
                <p class="p-8 text-center text-sm text-muted">{{ 'analytics.noTeamData' | translate }}</p>
              } @else {
                <!-- Mobile view (< md) : cartes tactiles -->
                <div class="space-y-3 p-4 md:hidden">
                  @for (u of data.usersBreakdown; track u.userId) {
                    <div class="rounded-xl border border-border bg-surface p-4 shadow-2xs space-y-3">
                      <div class="flex items-center justify-between gap-2.5">
                        <tf-avatar [name]="u.displayName" [subtext]="u.email" size="md" class="min-w-0 flex-1" />
                        <tf-status-badge [variant]="taceBadgeVariant(u.activityRate)" class="shrink-0">
                          {{ i18n.formatNumber(u.activityRate) }} %
                        </tf-status-badge>
                      </div>

                      <div class="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/50">
                        <div class="min-w-0">
                          <span class="text-muted block text-[11px]">{{ 'users.colSchedule' | translate }}</span>
                          <span class="font-medium text-ink mt-0.5 block truncate" [title]="u.workScheduleName">{{ u.workScheduleName }}</span>
                        </div>
                        <div class="min-w-0 text-right">
                          <span class="text-muted block text-[11px]">{{ 'analytics.overtimeOt' | translate }}</span>
                          <span class="font-semibold text-amber-600 dark:text-amber-400 mt-0.5 block truncate">{{ formatHours(u.overtimeMinutes) }}</span>
                        </div>
                      </div>

                      <div class="flex items-center justify-between text-xs pt-1 border-t border-border/50">
                        <div>
                          <span class="text-muted block text-[11px]">{{ 'analytics.totalSaisi' | translate }}</span>
                          <span class="font-bold text-ink">{{ formatHours(u.totalMinutes) }}</span>
                        </div>
                        <div class="text-right">
                          <span class="text-muted block text-[11px]">{{ 'analytics.billableClient' | translate }}</span>
                          <span class="font-bold text-emerald-600 dark:text-emerald-400">{{ formatHours(u.billableMinutes) }}</span>
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
                        <th scope="col" class="px-5 py-3.5 whitespace-nowrap">{{ 'users.colCollaborator' | translate }}</th>
                        <th scope="col" class="px-4 py-3.5 whitespace-nowrap">{{ 'workSchedules.overtime.colRegime' | translate }}</th>
                        <th scope="col" class="px-4 py-3.5 text-right whitespace-nowrap">{{ 'analytics.totalSaisi' | translate }}</th>
                        <th scope="col" class="px-4 py-3.5 text-right whitespace-nowrap">{{ 'timesheets.sidePanel.billableBadge' | translate }}</th>
                        <th scope="col" class="px-4 py-3.5 text-right whitespace-nowrap">{{ 'analytics.overtimeOt' | translate }}</th>
                        <th scope="col" class="px-5 py-3.5 text-right whitespace-nowrap">{{ 'analytics.taceCol' | translate }}</th>
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
                          <td class="px-4 py-3.5 text-right font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap">
                            {{ formatHours(u.billableMinutes) }}
                          </td>
                          <td class="px-4 py-3.5 text-right text-amber-600 dark:text-amber-400 font-medium tabular-nums whitespace-nowrap">
                            {{ formatHours(u.overtimeMinutes) }}
                          </td>
                          <td class="px-5 py-3.5 text-right whitespace-nowrap">
                            <tf-status-badge [variant]="taceBadgeVariant(u.activityRate)">
                              {{ i18n.formatNumber(u.activityRate) }} %
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
        </div>
      }
    </div>
  `
})
export class AnalyticsPageComponent implements OnInit {
  private readonly api = inject(AnalyticsService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly validationService = inject(ValidationService);
  private readonly projectService = inject(ProjectService);

  readonly i18n = inject(I18nService);

  readonly showFilterPanel = signal(false);
  readonly selectedUserId = signal<string>('');
  readonly selectedProjectId = signal<string>('');
  readonly subordinates = signal<SubordinateSummary[]>([]);
  readonly projects = signal<Project[]>([]);

  readonly activeFilterCount = computed(() => (this.selectedUserId() ? 1 : 0) + (this.selectedProjectId() ? 1 : 0));
  readonly hasActiveFilters = computed(() => this.activeFilterCount() > 0);

  readonly periodPresets = computed<PeriodPreset[]>(() => {
    const monthLabel = (month: number) => new Intl.DateTimeFormat(this.i18n.locale(), { month: 'long', year: 'numeric' }).format(new Date(2026, month, 1));
    return [
      { key: '2026-10', label: monthLabel(9) },
      { key: '2026-09', label: monthLabel(8) },
      { key: '2026-Q4', label: this.i18n.t('analytics.quarter', { quarter: 4, year: 2026 }) },
      { key: '2026', label: this.i18n.t('analytics.year', { year: 2026 }) }
    ];
  });

  readonly selectedPeriod = signal('2026-10');
  readonly periodLabel = computed(() => this.periodPresets().find(p => p.key === this.selectedPeriod())?.label ?? this.selectedPeriod());
  readonly overview = signal<AnalyticsOverview | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly activeTab = signal<'projects' | 'team'>('projects');
  readonly activeBar = signal<ChartBarData | null>(null);

  readonly canViewTeam = computed(() => {
    const role = this.auth.currentUser()?.role;
    return role === 'MANAGER' || role === 'DIRECTION' || role === 'ADMIN';
  });

  readonly donutCircumference = 2 * Math.PI * 60; // ~376.991

  readonly donutSegments = computed(() => {
    const data = this.overview();
    if (!data || !data.activitiesBreakdown || data.activitiesBreakdown.length === 0 || data.totalMinutes === 0) {
      return [];
    }

    const c = this.donutCircumference;
    let currentOffset = 0;

    return data.activitiesBreakdown.map(act => {
      const share = act.sharePercentage;
      const strokeLength = (share / 100) * c;
      const dashArray = `${strokeLength.toFixed(2)} ${c.toFixed(2)}`;
      const dashOffset = (-currentOffset).toFixed(2);
      currentOffset += strokeLength;

      return {
        type: act.activityType,
        label: act.label,
        totalMinutes: act.totalMinutes,
        sharePercentage: act.sharePercentage,
        color: this.activityColor(act.activityType),
        dashArray,
        dashOffset
      };
    });
  });

  readonly hasDailyTrend = computed(() => {
    const data = this.overview();
    return !!data && !!data.dailyTrend && data.dailyTrend.length > 0;
  });

  readonly maxChartHours = computed(() => {
    const data = this.overview();
    if (!data) return 8;

    let maxMin = 0;
    if (this.hasDailyTrend() && data.dailyTrend) {
      for (const d of data.dailyTrend) {
        if (d.totalMinutes > maxMin) maxMin = d.totalMinutes;
      }
    } else if (data.monthlyTrend) {
      for (const m of data.monthlyTrend) {
        if (m.totalMinutes > maxMin) maxMin = m.totalMinutes;
      }
    }

    const hours = maxMin / 60;
    if (hours <= 0) return 8;
    return Math.max(8, Math.ceil(hours / 2) * 2);
  });

  readonly yAxisTicks = computed(() => {
    const max = this.maxChartHours();
    const step = max / 4;
    return [
      { value: max, y: 20 },
      { value: Math.round(step * 3), y: 60 },
      { value: Math.round(step * 2), y: 100 },
      { value: Math.round(step * 1), y: 140 },
      { value: 0, y: 180 }
    ];
  });

  readonly chartBars = computed<ChartBarData[]>(() => {
    const data = this.overview();
    if (!data) return [];

    const maxMinutes = this.maxChartHours() * 60;
    const chartHeight = 160;
    const baselineY = 180;
    const chartWidth = 540;
    const startX = 45;

    if (this.hasDailyTrend() && data.dailyTrend && data.dailyTrend.length > 0) {
      const items = data.dailyTrend;
      const count = items.length;
      const slotWidth = chartWidth / count;
      const barWidth = Math.max(4, Math.min(10, slotWidth * 0.65));

      return items.map((item, idx) => {
        const slotX = startX + idx * slotWidth;
        const x = slotX + (slotWidth - barWidth) / 2;
        const barH = maxMinutes > 0 ? (item.totalMinutes / maxMinutes) * chartHeight : 0;
        const y = baselineY - barH;
        const isTick = item.dayOfMonth === 1 || item.dayOfMonth % 5 === 0 || idx === count - 1;

        return {
          key: item.date,
          label: item.label,
          dayOfMonth: item.dayOfMonth,
          totalMinutes: item.totalMinutes,
          billableMinutes: item.billableMinutes,
          x,
          y,
          width: barWidth,
          height: barH,
          isTick,
          tickX: x + barWidth / 2,
          tickLabel: `${item.dayOfMonth} ${item.label.split(' ')[1] || ''}`.trim()
        };
      });
    }

    if (data.monthlyTrend && data.monthlyTrend.length > 0) {
      const items = data.monthlyTrend;
      const count = items.length;
      const slotWidth = chartWidth / count;
      const barWidth = Math.max(16, Math.min(32, slotWidth * 0.5));

      return items.map((item, idx) => {
        const slotX = startX + idx * slotWidth;
        const x = slotX + (slotWidth - barWidth) / 2;
        const barH = maxMinutes > 0 ? (item.totalMinutes / maxMinutes) * chartHeight : 0;
        const y = baselineY - barH;

        return {
          key: item.month,
          label: item.label,
          dayOfMonth: 0,
          totalMinutes: item.totalMinutes,
          billableMinutes: item.billableMinutes,
          x,
          y,
          width: barWidth,
          height: barH,
          isTick: true,
          tickX: x + barWidth / 2,
          tickLabel: item.label
        };
      });
    }

    return [];
  });

  ngOnInit(): void {
    this.loadFilterOptions();
    this.load();
  }

  loadFilterOptions(): void {
    if (this.canViewTeam()) {
      this.validationService.getSubordinates().subscribe({
        next: subs => this.subordinates.set(subs),
        error: () => {}
      });
    }
    this.projectService.list().subscribe({
      next: projs => this.projects.set(projs),
      error: () => {}
    });
  }

  toggleFilterPanel(): void {
    this.showFilterPanel.update(v => !v);
  }

  onFilterChange(): void {
    this.load();
  }

  resetFilters(): void {
    this.selectedUserId.set('');
    this.selectedProjectId.set('');
    this.load();
  }

  selectPeriod(period: string): void {
    this.selectedPeriod.set(period);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.api.getOverview(
      this.selectedPeriod(),
      this.selectedUserId() || undefined,
      this.selectedProjectId() || undefined
    )
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

  activityColor(type: string): string {
    const upper = (type || '').toUpperCase();
    if (upper === 'PROJECT' || upper === 'PROJET') return '#6366f1';
    if (upper === 'INTERNAL' || upper === 'INTERNE') return '#818cf8';
    if (upper === 'TRAINING' || upper === 'FORMATION') return '#10b981';
    if (upper === 'SUPPORT') return '#f59e0b';
    if (upper === 'CONGE' || upper === 'LEAVE') return '#06b6d4';
    return '#a1a1aa';
  }
}
