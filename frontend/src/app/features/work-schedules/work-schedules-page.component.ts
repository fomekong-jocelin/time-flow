import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../shared/ui/icon.component';
import { ALL_WEEK_DAYS, CreateWorkScheduleRequest, UpdateWorkScheduleRequest, WorkScheduleProfile } from './work-schedule.models';
import { WorkScheduleService } from './work-schedule.service';
import { PublicHolidaysPanelComponent } from './public-holidays-panel.component';
import { OvertimePoliciesPanelComponent } from './overtime-policies-panel.component';

import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { I18nService } from '../../core/i18n/i18n.service';

@Component({
  selector: 'tf-work-schedules-page',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, PublicHolidaysPanelComponent, OvertimePoliciesPanelComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './work-schedules-page.component.html'
})
export class WorkSchedulesPageComponent implements OnInit {
  private readonly service = inject(WorkScheduleService);
  protected readonly i18n = inject(I18nService);

  readonly activeTab = signal<'schedules' | 'ot_et' | 'holidays'>('schedules');
  readonly weekDays = computed(() => {
    const isEn = this.i18n.currentLang() === 'en';
    return [
      { key: 'MONDAY', shortLabel: isEn ? 'Mon' : this.i18n.t('timesheets.days.mon'), fullLabel: isEn ? 'Monday' : 'Lundi' },
      { key: 'TUESDAY', shortLabel: isEn ? 'Tue' : this.i18n.t('timesheets.days.tue'), fullLabel: isEn ? 'Tuesday' : 'Mardi' },
      { key: 'WEDNESDAY', shortLabel: isEn ? 'Wed' : this.i18n.t('timesheets.days.wed'), fullLabel: isEn ? 'Wednesday' : 'Mercredi' },
      { key: 'THURSDAY', shortLabel: isEn ? 'Thu' : this.i18n.t('timesheets.days.thu'), fullLabel: isEn ? 'Thursday' : 'Jeudi' },
      { key: 'FRIDAY', shortLabel: isEn ? 'Fri' : this.i18n.t('timesheets.days.fri'), fullLabel: isEn ? 'Friday' : 'Vendredi' },
      { key: 'SATURDAY', shortLabel: isEn ? 'Sat' : this.i18n.t('timesheets.days.sat'), fullLabel: isEn ? 'Saturday' : 'Samedi' },
      { key: 'SUNDAY', shortLabel: isEn ? 'Sun' : this.i18n.t('timesheets.days.sun'), fullLabel: isEn ? 'Sunday' : 'Dimanche' }
    ];
  });
  readonly profiles = signal<WorkScheduleProfile[]>([]);
  readonly loading = signal(false);
  readonly submitting = signal(false);
  readonly errorMessage = this.i18n.messageSignal(null);
  readonly successMessage = this.i18n.messageSignal(null);

  // Modal State
  readonly modalOpen = signal(false);
  readonly editingProfile = signal<WorkScheduleProfile | null>(null);
  readonly modalError = this.i18n.messageSignal(null);

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
        this.errorMessage.set(() => this.i18n.problem(err, this.i18n.t('messages.loadSchedules')));
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
        this.modalError.set(() => this.i18n.t('messages.lastWorkingDay'));
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
      this.modalError.set(() => this.i18n.t('messages.scheduleNameRequired'));
      return;
    }
    if (this.formWorkingDays().length === 0) {
      this.modalError.set(() => this.i18n.t('messages.selectWorkingDay'));
      return;
    }

    const weeklyMins = Math.round(this.formWeeklyHours * 60);
    const dailyMins = Math.round(this.formDailyHours * 60);
    const maxDailyMins = Math.round(this.formMaxDailyHours * 60);
    const maxWeeklyMins = Math.round(this.formMaxWeeklyHours * 60);

    if (maxDailyMins < dailyMins) {
      this.modalError.set(() => this.i18n.t('messages.dailyCap'));
      return;
    }
    if (maxWeeklyMins < weeklyMins) {
      this.modalError.set(() => this.i18n.t('messages.weeklyCap'));
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
          this.successMessage.set(() => this.i18n.t('messages.scheduleUpdated'));
          this.loadProfiles();
        },
        error: err => {
          this.submitting.set(false);
          this.modalError.set(() => this.i18n.problem(err, this.i18n.t('messages.updateFailed')));
        }
      });
    } else {
      if (!this.formCode.trim()) {
        this.modalError.set(() => this.i18n.t('messages.scheduleCodeRequired'));
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
          this.successMessage.set(() => this.i18n.t('messages.scheduleCreated'));
          this.loadProfiles();
        },
        error: err => {
          this.submitting.set(false);
          this.modalError.set(() => this.i18n.problem(err, this.i18n.t('messages.createFailed')));
        }
      });
    }
  }

  setDefault(profile: WorkScheduleProfile): void {
    if (profile.isDefault || !profile.active) return;
    this.service.setDefault(profile.id).subscribe({
      next: () => {
        this.successMessage.set(() => this.i18n.t('messages.defaultSchedule', { name: profile.name }));
        this.loadProfiles();
      },
      error: err => {
        this.errorMessage.set(() => this.i18n.problem(err, this.i18n.t('messages.defaultFailed')));
      }
    });
  }

  toggleActive(profile: WorkScheduleProfile): void {
    if (profile.isDefault) return;
    this.service.toggleActive(profile.id).subscribe({
      next: () => {
        this.successMessage.set(() => this.i18n.t('messages.scheduleStatus', { name: profile.name }));
        this.loadProfiles();
      },
      error: err => {
        this.errorMessage.set(() => this.i18n.problem(err, this.i18n.t('messages.activeFailed')));
      }
    });
  }
}
