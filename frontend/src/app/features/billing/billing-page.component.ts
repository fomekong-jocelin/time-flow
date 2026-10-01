import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/auth/auth.service';
import { IconComponent } from '../../shared/ui/icon.component';
import { AvatarComponent } from '../../shared/ui/avatar.component';
import { KpiCardComponent } from '../../shared/ui/kpi-card.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { I18nService } from '../../core/i18n/i18n.service';
import { BillingDetailItem, BillingOverview, ProjectBillingItem, UserBillingItem } from './billing.models';
import { BillingService } from './billing.service';
import { ProjectService, Project } from '../projects/project.service';
import { ValidationService } from '../validation/validation.service';
import { SubordinateSummary } from '../validation/validation.models';

interface PeriodPreset {
  key: string;
  label: string;
}

@Component({
  selector: 'tf-billing-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IconComponent,
    AvatarComponent,
    KpiCardComponent,
    TranslatePipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <!-- En-tête de page & actions d'export -->
      <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div class="flex items-center gap-2 text-sm font-medium text-brand-600 dark:text-brand-400">
            <span>{{ 'nav.billing' | translate }}</span>
            <span class="text-muted">/</span>
            <span>{{ overview()?.periodLabel || ('billing.period' | translate) }}</span>
          </div>
          <h1 class="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">{{ 'billing.title' | translate }}</h1>
          <p class="mt-1 text-sm text-muted">
            {{ 'billing.subtitle' | translate }}
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          @if (hasActiveFilters()) {
            <button
              type="button"
              (click)="resetFilters()"
              class="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline cursor-pointer">
              {{ 'common.filter' | translate }} : {{ 'common.none' | translate }}
            </button>
          }

          <!-- Bouton panneau filtres -->
          <button
            type="button"
            (click)="toggleFilterPanel()"
            class="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-ink shadow-2xs transition hover:bg-app whitespace-nowrap cursor-pointer"
            [class.border-brand-500]="showFilterPanel() || hasActiveFilters()"
            [class.bg-brand-50]="showFilterPanel()"
            [class.dark:bg-brand-950/40]="showFilterPanel()">
            <tf-icon name="filter" [size]="14" />
            <span>{{ 'common.filter' | translate }}</span>
            @if (activeFilterCount() > 0) {
              <span class="rounded-full bg-brand-600 text-white px-1.5 py-0.2 text-[10px] font-bold">{{ activeFilterCount() }}</span>
            }
          </button>

          <!-- Bouton Export CSV -->
          <button
            type="button"
            (click)="exportCsv()"
            [disabled]="exportingCsv() || loading()"
            class="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-ink shadow-2xs transition hover:bg-app whitespace-nowrap cursor-pointer disabled:opacity-50">
            <tf-icon name="download" [size]="14" />
            <span>{{ exportingCsv() ? ('billing.exporting' | translate) : ('billing.exportCsv' | translate) }}</span>
          </button>

          <!-- Bouton Export Excel -->
          <button
            type="button"
            (click)="exportExcel()"
            [disabled]="exportingExcel() || loading()"
            class="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-brand-600 px-3.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-brand-700 whitespace-nowrap cursor-pointer disabled:opacity-50">
            <tf-icon name="receipt" [size]="14" />
            <span>{{ exportingExcel() ? ('billing.exporting' | translate) : ('billing.exportExcel' | translate) }}</span>
          </button>
        </div>
      </header>

      <!-- Avertissement de confidentialité / habilitation financière -->
      @if (canViewFinancials()) {
        <div class="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
          <tf-icon name="check" [size]="16" class="text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{{ 'billing.financialAccessNotice' | translate }}</span>
        </div>
      } @else {
        <div class="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs font-medium text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
          <tf-icon name="lock" [size]="16" class="text-amber-600 dark:text-amber-400 shrink-0" />
          <span>{{ 'billing.confidentialNotice' | translate }}</span>
        </div>
      }

      <!-- Panneau de filtres dépliable -->
      @if (showFilterPanel()) {
        <div class="rounded-2xl border border-border bg-surface p-4 shadow-2xs space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <tf-icon name="sliders" [size]="16" class="text-brand-600 dark:text-brand-400" />
              <span class="text-xs font-semibold uppercase tracking-wider text-ink">{{ 'common.filter' | translate }}</span>
            </div>
            @if (hasActiveFilters()) {
              <button
                type="button"
                (click)="resetFilters()"
                class="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline cursor-pointer">
                {{ 'common.delete' | translate }}
              </button>
            }
          </div>

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-2 border-t border-border/60">
            @if (canViewTeam()) {
              <div>
                <label class="block text-[11px] font-medium text-muted mb-1">{{ 'billing.collaborator' | translate }}</label>
                <select
                  [ngModel]="selectedUserId()"
                  (ngModelChange)="selectedUserId.set($event); onFilterChange()"
                  class="w-full rounded-xl border border-border bg-app px-3 py-2 text-xs font-medium text-ink focus:border-brand-500 focus:outline-none">
                  <option value="">{{ 'billing.allCollaborators' | translate }}</option>
                  @for (sub of subordinates(); track sub.id) {
                    <option [value]="sub.id">{{ sub.displayName }} ({{ sub.email }})</option>
                  }
                </select>
              </div>
            }

            <div>
              <label class="block text-[11px] font-medium text-muted mb-1">{{ 'billing.project' | translate }}</label>
              <select
                [ngModel]="selectedProjectId()"
                (ngModelChange)="selectedProjectId.set($event); onFilterChange()"
                class="w-full rounded-xl border border-border bg-app px-3 py-2 text-xs font-medium text-ink focus:border-brand-500 focus:outline-none">
                <option value="">{{ 'billing.allProjects' | translate }}</option>
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

      <!-- Erreurs éventuelles -->
      @if (error()) {
        <div class="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300" role="alert">
          <tf-icon name="alert" class="shrink-0 text-red-600 dark:text-red-400" />
          <div class="min-w-0 flex-1">
            <p class="font-semibold">{{ error() }}</p>
          </div>
          <button
            type="button"
            (click)="loadData()"
            class="rounded-lg border border-red-300 bg-white px-3 py-1 text-xs font-semibold text-red-800 shadow-2xs hover:bg-red-50 dark:border-red-800 dark:bg-red-900/60 dark:text-red-200 cursor-pointer">
            {{ 'common.retry' | translate }}
          </button>
        </div>
      }

      <!-- Grille KPI Synthétique -->
      @if (overview(); as o) {
        <div class="grid grid-cols-2 gap-3 sm:gap-4" [class]="canViewFinancials() ? 'lg:grid-cols-5' : 'lg:grid-cols-4'">
          <tf-kpi-card
            [label]="'billing.kpiTotalDays' | translate"
            [value]="o.billableDays + ' j'"
            [icon]="'calendar'"
            [iconColor]="'brand'"
            variant="brand" />

          <tf-kpi-card
            [label]="'billing.kpiTotalHours' | translate"
            [value]="formatHours(o.billableMinutes)"
            [icon]="'clock'"
            [iconColor]="'blue'" />

          <tf-kpi-card
            [label]="'billing.kpiTotalProjects' | translate"
            [value]="o.totalProjectsCount"
            [icon]="'folder'"
            [iconColor]="'purple'" />

          <tf-kpi-card
            [label]="'billing.kpiTotalContributors' | translate"
            [value]="o.totalContributorsCount"
            [icon]="'users'"
            [iconColor]="'default'" />

          @if (canViewFinancials()) {
            <tf-kpi-card
              [label]="'billing.kpiTotalAmount' | translate"
              [value]="formatCurrency(o.totalFinancialAmount)"
              [icon]="'receipt'"
              [iconColor]="'success'"
              variant="success" />
          }
        </div>
      }

      <!-- Onglets Synthèse Projet / Collaborateur / Détail -->
      <div class="border-b border-border">
        <nav class="flex gap-4 sm:gap-8 overflow-x-auto" aria-label="Tabs">
          <button
            type="button"
            (click)="setActiveTab('projects')"
            class="flex items-center gap-2 border-b-2 py-3 px-1 text-xs sm:text-sm font-semibold transition whitespace-nowrap cursor-pointer"
            [class]="activeTab() === 'projects'
              ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
              : 'border-transparent text-muted hover:border-border hover:text-ink'">
            <tf-icon name="folder" [size]="16" />
            <span>{{ 'billing.tabProjects' | translate }}</span>
            <span class="rounded-full bg-app px-2 py-0.5 text-[10px] font-bold text-muted border border-border">
              {{ overview()?.projects?.length || 0 }}
            </span>
          </button>

          <button
            type="button"
            (click)="setActiveTab('users')"
            class="flex items-center gap-2 border-b-2 py-3 px-1 text-xs sm:text-sm font-semibold transition whitespace-nowrap cursor-pointer"
            [class]="activeTab() === 'users'
              ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
              : 'border-transparent text-muted hover:border-border hover:text-ink'">
            <tf-icon name="users" [size]="16" />
            <span>{{ 'billing.tabUsers' | translate }}</span>
            <span class="rounded-full bg-app px-2 py-0.5 text-[10px] font-bold text-muted border border-border">
              {{ overview()?.users?.length || 0 }}
            </span>
          </button>

          <button
            type="button"
            (click)="setActiveTab('details')"
            class="flex items-center gap-2 border-b-2 py-3 px-1 text-xs sm:text-sm font-semibold transition whitespace-nowrap cursor-pointer"
            [class]="activeTab() === 'details'
              ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
              : 'border-transparent text-muted hover:border-border hover:text-ink'">
            <tf-icon name="file" [size]="16" />
            <span>{{ 'billing.tabDetails' | translate }}</span>
            <span class="rounded-full bg-app px-2 py-0.5 text-[10px] font-bold text-muted border border-border">
              {{ details().length }}
            </span>
          </button>
        </nav>
      </div>

      <!-- Vues des Données -->
      @if (loading()) {
        <div class="flex items-center justify-center py-16 text-muted">
          <div class="flex items-center gap-3">
            <span class="inline-block size-5 animate-spin rounded-full border-2 border-brand-600 border-t-transparent"></span>
            <span class="text-sm font-medium">{{ 'common.loading' | translate }}</span>
          </div>
        </div>
      } @else {
        <!-- ONGLET 1 : SYNTHÈSE PROJETS -->
        @if (activeTab() === 'projects') {
          @if (!overview()?.projects?.length) {
            <div class="rounded-2xl border border-dashed border-border bg-surface p-12 text-center text-muted">
              <tf-icon name="folder" [size]="32" class="mx-auto mb-2 opacity-40" />
              <p class="text-sm">{{ 'billing.noData' | translate }}</p>
            </div>
          } @else {
            <!-- Vue Desktop Tableau Projets -->
            <div class="hidden md:block overflow-hidden rounded-2xl border border-border bg-surface shadow-2xs">
              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                  <thead class="bg-app border-b border-border text-[11px] font-semibold uppercase tracking-wider text-muted">
                    <tr>
                      <th class="px-4 py-3">{{ 'billing.colReference' | translate }}</th>
                      <th class="px-4 py-3">{{ 'billing.colProject' | translate }}</th>
                      <th class="px-4 py-3">{{ 'billing.colClient' | translate }}</th>
                      <th class="px-4 py-3 text-center">{{ 'billing.colContributors' | translate }}</th>
                      <th class="px-4 py-3 text-right">{{ 'billing.colTotalHours' | translate }}</th>
                      <th class="px-4 py-3 text-right">{{ 'billing.colBillableHours' | translate }}</th>
                      <th class="px-4 py-3 text-right font-bold text-brand-600 dark:text-brand-400">{{ 'billing.colBillableDays' | translate }}</th>
                      @if (canViewFinancials()) {
                        <th class="px-4 py-3 text-right">{{ 'billing.colDailyRate' | translate }}</th>
                        <th class="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">{{ 'billing.colTotalAmount' | translate }}</th>
                      }
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-border">
                    @for (p of overview()?.projects; track p.projectId) {
                      <tr class="hover:bg-app/50 transition">
                        <td class="px-4 py-3 font-mono text-muted">{{ p.projectReference || '-' }}</td>
                        <td class="px-4 py-3 font-semibold text-ink">{{ p.projectName }}</td>
                        <td class="px-4 py-3 text-muted">{{ p.clientOrganization || '-' }}</td>
                        <td class="px-4 py-3 text-center font-medium">{{ p.contributorsCount }}</td>
                        <td class="px-4 py-3 text-right text-muted">{{ formatMinutesToHours(p.totalMinutes) }}</td>
                        <td class="px-4 py-3 text-right text-ink font-medium">{{ formatMinutesToHours(p.billableMinutes) }}</td>
                        <td class="px-4 py-3 text-right font-bold text-brand-600 dark:text-brand-400">{{ p.billableDays }} j</td>
                        @if (canViewFinancials()) {
                          <td class="px-4 py-3 text-right text-muted font-mono">{{ formatCurrency(p.dailyRate) }}</td>
                          <td class="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono">{{ formatCurrency(p.totalAmount) }}</td>
                        }
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Vue Mobile Cartes Projets -->
            <div class="grid grid-cols-1 gap-3 md:hidden">
              @for (p of overview()?.projects; track p.projectId) {
                <div class="rounded-2xl border border-border bg-surface p-4 shadow-2xs space-y-3">
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0">
                      <p class="font-semibold text-ink truncate">{{ p.projectName }}</p>
                      <p class="text-xs text-muted">{{ p.clientOrganization || '-' }}</p>
                    </div>
                    @if (p.projectReference) {
                      <span class="rounded bg-app px-2 py-0.5 font-mono text-[10px] text-muted border border-border">
                        {{ p.projectReference }}
                      </span>
                    }
                  </div>

                  <div class="grid grid-cols-2 gap-2 border-t border-border/60 pt-2 text-xs">
                    <div>
                      <span class="text-muted">{{ 'billing.colBillableDays' | translate }} :</span>
                      <span class="font-bold text-brand-600 dark:text-brand-400 ml-1">{{ p.billableDays }} j</span>
                    </div>
                    <div>
                      <span class="text-muted">{{ 'billing.colBillableHours' | translate }} :</span>
                      <span class="font-medium text-ink ml-1">{{ formatMinutesToHours(p.billableMinutes) }}</span>
                    </div>
                  </div>

                  @if (canViewFinancials() && p.totalAmount !== null && p.totalAmount !== undefined) {
                    <div class="flex items-center justify-between border-t border-border/60 pt-2 text-xs">
                      <span class="text-muted">{{ 'billing.colTotalAmount' | translate }} :</span>
                      <span class="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{{ formatCurrency(p.totalAmount) }}</span>
                    </div>
                  }
                </div>
              }
            </div>
          }
        }

        <!-- ONGLET 2 : SYNTHÈSE COLLABORATEURS -->
        @if (activeTab() === 'users') {
          @if (!overview()?.users?.length) {
            <div class="rounded-2xl border border-dashed border-border bg-surface p-12 text-center text-muted">
              <tf-icon name="users" [size]="32" class="mx-auto mb-2 opacity-40" />
              <p class="text-sm">{{ 'billing.noData' | translate }}</p>
            </div>
          } @else {
            <!-- Vue Desktop Tableau Collaborateurs -->
            <div class="hidden md:block overflow-hidden rounded-2xl border border-border bg-surface shadow-2xs">
              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                  <thead class="bg-app border-b border-border text-[11px] font-semibold uppercase tracking-wider text-muted">
                    <tr>
                      <th class="px-4 py-3">{{ 'billing.colUser' | translate }}</th>
                      <th class="px-4 py-3">{{ 'billing.colRole' | translate }}</th>
                      <th class="px-4 py-3">{{ 'billing.colSchedule' | translate }}</th>
                      <th class="px-4 py-3 text-right">{{ 'billing.colTotalHours' | translate }}</th>
                      <th class="px-4 py-3 text-right">{{ 'billing.colBillableHours' | translate }}</th>
                      <th class="px-4 py-3 text-right font-bold text-brand-600 dark:text-brand-400">{{ 'billing.colBillableDays' | translate }}</th>
                      <th class="px-4 py-3 text-right">{{ 'billing.colOvertime' | translate }}</th>
                      @if (canViewFinancials()) {
                        <th class="px-4 py-3 text-right">{{ 'billing.colUserRate' | translate }}</th>
                        <th class="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">{{ 'billing.colTotalAmount' | translate }}</th>
                      }
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-border">
                    @for (u of overview()?.users; track u.userId) {
                      <tr class="hover:bg-app/50 transition">
                        <td class="px-4 py-3">
                          <tf-avatar [name]="u.displayName" [subtext]="u.email" size="sm" />
                        </td>
                        <td class="px-4 py-3 text-muted">
                          <span class="rounded-full bg-app px-2 py-0.5 text-[11px] border border-border">
                            {{ 'roles.' + u.role | translate }}
                          </span>
                        </td>
                        <td class="px-4 py-3 text-muted">{{ u.workScheduleName }}</td>
                        <td class="px-4 py-3 text-right text-muted">{{ formatMinutesToHours(u.totalMinutes) }}</td>
                        <td class="px-4 py-3 text-right text-ink font-medium">{{ formatMinutesToHours(u.billableMinutes) }}</td>
                        <td class="px-4 py-3 text-right font-bold text-brand-600 dark:text-brand-400">{{ u.billableDays }} j</td>
                        <td class="px-4 py-3 text-right">
                          @if (u.overtimeMinutes > 0) {
                            <span class="font-semibold text-amber-600 dark:text-amber-400">+{{ formatMinutesToHours(u.overtimeMinutes) }}</span>
                          } @else {
                            <span class="text-muted">-</span>
                          }
                        </td>
                        @if (canViewFinancials()) {
                          <td class="px-4 py-3 text-right text-muted font-mono">{{ formatCurrency(u.dailyRate) }}</td>
                          <td class="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono">{{ formatCurrency(u.totalAmount) }}</td>
                        }
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Vue Mobile Cartes Collaborateurs -->
            <div class="grid grid-cols-1 gap-3 md:hidden">
              @for (u of overview()?.users; track u.userId) {
                <div class="rounded-2xl border border-border bg-surface p-4 shadow-2xs space-y-3">
                  <div class="flex items-center justify-between gap-2">
                    <tf-avatar [name]="u.displayName" [subtext]="u.email" size="sm" />
                    <span class="rounded-full bg-app px-2 py-0.5 text-[10px] font-semibold text-muted border border-border">
                      {{ 'roles.' + u.role | translate }}
                    </span>
                  </div>

                  <div class="grid grid-cols-2 gap-2 border-t border-border/60 pt-2 text-xs">
                    <div>
                      <span class="text-muted">{{ 'billing.colBillableDays' | translate }} :</span>
                      <span class="font-bold text-brand-600 dark:text-brand-400 ml-1">{{ u.billableDays }} j</span>
                    </div>
                    <div>
                      <span class="text-muted">{{ 'billing.colBillableHours' | translate }} :</span>
                      <span class="font-medium text-ink ml-1">{{ formatMinutesToHours(u.billableMinutes) }}</span>
                    </div>
                  </div>

                  @if (canViewFinancials() && u.totalAmount !== null && u.totalAmount !== undefined) {
                    <div class="flex items-center justify-between border-t border-border/60 pt-2 text-xs">
                      <span class="text-muted">{{ 'billing.colTotalAmount' | translate }} :</span>
                      <span class="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{{ formatCurrency(u.totalAmount) }}</span>
                    </div>
                  }
                </div>
              }
            </div>
          }
        }

        <!-- ONGLET 3 : DÉTAIL DES IMPUTATIONS -->
        @if (activeTab() === 'details') {
          @if (!details().length) {
            <div class="rounded-2xl border border-dashed border-border bg-surface p-12 text-center text-muted">
              <tf-icon name="file" [size]="32" class="mx-auto mb-2 opacity-40" />
              <p class="text-sm">{{ 'billing.noData' | translate }}</p>
            </div>
          } @else {
            <!-- Vue Desktop Tableau Détails -->
            <div class="hidden md:block overflow-hidden rounded-2xl border border-border bg-surface shadow-2xs">
              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                  <thead class="bg-app border-b border-border text-[11px] font-semibold uppercase tracking-wider text-muted">
                    <tr>
                      <th class="px-4 py-3">{{ 'billing.colDate' | translate }}</th>
                      <th class="px-4 py-3">{{ 'billing.colUser' | translate }}</th>
                      <th class="px-4 py-3">{{ 'billing.colProject' | translate }}</th>
                      <th class="px-4 py-3">{{ 'billing.colActivity' | translate }}</th>
                      <th class="px-4 py-3 text-right">{{ 'billing.colTotalHours' | translate }}</th>
                      <th class="px-4 py-3 text-center">{{ 'billing.colBillable' | translate }}</th>
                      <th class="px-4 py-3 text-right font-bold text-brand-600 dark:text-brand-400">{{ 'billing.colBillableDays' | translate }}</th>
                      @if (canViewFinancials()) {
                        <th class="px-4 py-3 text-right">{{ 'billing.colUserRate' | translate }}</th>
                        <th class="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">{{ 'billing.colTotalAmount' | translate }}</th>
                      }
                      <th class="px-4 py-3">{{ 'billing.colComment' | translate }}</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-border">
                    @for (d of details(); track $index) {
                      <tr class="hover:bg-app/50 transition">
                        <td class="px-4 py-3 font-mono text-muted whitespace-nowrap">{{ formatDate(d.entryDate) }}</td>
                        <td class="px-4 py-3 font-medium text-ink whitespace-nowrap">{{ d.userDisplayName }}</td>
                        <td class="px-4 py-3 text-ink">{{ d.projectName }}</td>
                        <td class="px-4 py-3 text-muted">
                          <span class="rounded bg-app px-1.5 py-0.5 text-[10px] border border-border">
                            {{ d.activityType }}
                          </span>
                        </td>
                        <td class="px-4 py-3 text-right text-ink font-medium">{{ formatMinutesToHours(d.minutes) }}</td>
                        <td class="px-4 py-3 text-center">
                          <span class="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                            [class]="d.billable ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-app text-muted'">
                            {{ d.billable ? ('common.yes' | translate) : ('common.no' | translate) }}
                          </span>
                        </td>
                        <td class="px-4 py-3 text-right font-bold text-brand-600 dark:text-brand-400">{{ d.billableDays }} j</td>
                        @if (canViewFinancials()) {
                          <td class="px-4 py-3 text-right text-muted font-mono">{{ formatCurrency(d.dailyRate) }}</td>
                          <td class="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono">{{ formatCurrency(d.totalAmount) }}</td>
                        }
                        <td class="px-4 py-3 text-muted max-w-xs truncate" [title]="d.comment || ''">{{ d.comment || '-' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Vue Mobile Cartes Détails -->
            <div class="grid grid-cols-1 gap-3 md:hidden">
              @for (d of details(); track $index) {
                <div class="rounded-2xl border border-border bg-surface p-4 shadow-2xs space-y-2 text-xs">
                  <div class="flex items-center justify-between">
                    <span class="font-mono text-muted">{{ formatDate(d.entryDate) }}</span>
                    <span class="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      [class]="d.billable ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-app text-muted'">
                      {{ d.billable ? ('common.yes' | translate) : ('common.no' | translate) }}
                    </span>
                  </div>

                  <div>
                    <p class="font-semibold text-ink">{{ d.userDisplayName }}</p>
                    <p class="text-muted">{{ d.projectName }} · <span class="text-brand-600 dark:text-brand-400 font-medium">{{ d.activityType }}</span></p>
                  </div>

                  <div class="flex items-center justify-between border-t border-border/60 pt-2">
                    <div>
                      <span class="text-muted">{{ 'billing.colBillableDays' | translate }} :</span>
                      <span class="font-bold text-brand-600 dark:text-brand-400 ml-1">{{ d.billableDays }} j</span>
                      <span class="text-muted ml-2">({{ formatMinutesToHours(d.minutes) }})</span>
                    </div>
                    @if (canViewFinancials() && d.totalAmount !== null && d.totalAmount !== undefined) {
                      <span class="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{{ formatCurrency(d.totalAmount) }}</span>
                    }
                  </div>

                  @if (d.comment) {
                    <p class="text-[11px] text-muted italic bg-app/60 rounded p-1.5 border border-border/40">{{ d.comment }}</p>
                  }
                </div>
              }
            </div>
          }
        }
      }
    </div>
  `
})
export class BillingPageComponent implements OnInit {
  private readonly billingService = inject(BillingService);
  private readonly projectService = inject(ProjectService);
  private readonly validationService = inject(ValidationService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly i18n = inject(I18nService);

  readonly overview = signal<BillingOverview | null>(null);
  readonly details = signal<BillingDetailItem[]>([]);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly activeTab = signal<'projects' | 'users' | 'details'>('projects');

  readonly selectedPeriod = signal<string>('current');
  readonly selectedProjectId = signal<string>('');
  readonly selectedUserId = signal<string>('');
  readonly showFilterPanel = signal<boolean>(false);

  readonly exportingExcel = signal<boolean>(false);
  readonly exportingCsv = signal<boolean>(false);

  readonly projects = signal<Project[]>([]);
  readonly subordinates = signal<SubordinateSummary[]>([]);

  readonly canViewFinancials = computed(() => this.overview()?.canViewFinancials ?? false);
  readonly canViewTeam = computed(() => {
    const role = this.auth.currentUser()?.role;
    return role === 'MANAGER' || role === 'DIRECTION' || role === 'ADMIN';
  });

  readonly hasActiveFilters = computed(() => !!this.selectedProjectId() || !!this.selectedUserId());
  readonly activeFilterCount = computed(() => (this.selectedProjectId() ? 1 : 0) + (this.selectedUserId() ? 1 : 0));

  readonly periodPresets = computed<PeriodPreset[]>(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = (now.getMonth() + 1).toString().padStart(2, '0');
    const curMonthKey = `${curYear}-${curMonth}`;

    const prevDate = new Date(curYear, now.getMonth() - 1, 1);
    const prevYear = prevDate.getFullYear();
    const prevMonth = (prevDate.getMonth() + 1).toString().padStart(2, '0');
    const prevMonthKey = `${prevYear}-${prevMonth}`;

    const curQuarter = Math.floor(now.getMonth() / 3) + 1;
    const curQuarterKey = `${curYear}-Q${curQuarter}`;

    return [
      { key: curMonthKey, label: this.i18n.t('billing.currentMonth') },
      { key: prevMonthKey, label: this.i18n.t('billing.previousMonth') },
      { key: curQuarterKey, label: this.i18n.t('billing.currentQuarter') },
      { key: `${curYear}`, label: this.i18n.t('billing.currentYear') }
    ];
  });

  ngOnInit(): void {
    const presets = this.periodPresets();
    if (presets.length > 0 && this.selectedPeriod() === 'current') {
      this.selectedPeriod.set(presets[0].key);
    }
    this.loadFilterOptions();
    this.loadData();
  }

  loadFilterOptions(): void {
    if (this.canViewTeam()) {
      this.validationService.getSubordinates().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: subs => this.subordinates.set(subs),
        error: () => {}
      });
    }
    this.projectService.list().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: projs => this.projects.set(projs),
      error: () => {}
    });
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);

    const period = this.selectedPeriod();
    const userId = this.selectedUserId() || undefined;
    const projectId = this.selectedProjectId() || undefined;

    this.billingService.getOverview(period, userId, projectId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: data => {
          this.overview.set(data);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Impossible de charger les données de facturation.');
          this.loading.set(false);
        }
      });

    // Also load details for the details tab
    this.billingService.getDetails(period, userId, projectId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: items => this.details.set(items),
        error: () => {}
      });
  }

  selectPeriod(periodKey: string): void {
    if (this.selectedPeriod() === periodKey) return;
    this.selectedPeriod.set(periodKey);
    this.loadData();
  }

  setActiveTab(tab: 'projects' | 'users' | 'details'): void {
    this.activeTab.set(tab);
  }

  toggleFilterPanel(): void {
    this.showFilterPanel.update(v => !v);
  }

  onFilterChange(): void {
    this.loadData();
  }

  resetFilters(): void {
    this.selectedProjectId.set('');
    this.selectedUserId.set('');
    this.loadData();
  }

  exportExcel(): void {
    this.exportingExcel.set(true);
    const period = this.selectedPeriod();
    const userId = this.selectedUserId() || undefined;
    const projectId = this.selectedProjectId() || undefined;

    this.billingService.exportExcel(period, userId, projectId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: blob => {
          const filename = `facturation-${period}.xlsx`;
          this.billingService.triggerDownload(blob, filename);
          this.exportingExcel.set(false);
        },
        error: () => {
          this.error.set('Erreur lors de la génération de l\'export Excel.');
          this.exportingExcel.set(false);
        }
      });
  }

  exportCsv(): void {
    this.exportingCsv.set(true);
    const period = this.selectedPeriod();
    const userId = this.selectedUserId() || undefined;
    const projectId = this.selectedProjectId() || undefined;

    this.billingService.exportCsv(period, userId, projectId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: blob => {
          const filename = `facturation-${period}.csv`;
          this.billingService.triggerDownload(blob, filename);
          this.exportingCsv.set(false);
        },
        error: () => {
          this.error.set('Erreur lors de la génération de l\'export CSV.');
          this.exportingCsv.set(false);
        }
      });
  }

  formatHours(minutes: number): string {
    const hours = Math.round((minutes / 60.0) * 10) / 10;
    return `${hours} h`;
  }

  formatMinutesToHours(minutes: number): string {
    const hours = Math.round((minutes / 60.0) * 100) / 100;
    return `${hours.toFixed(2)} h`;
  }

  formatCurrency(amount: number | null | undefined): string {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  }
}
