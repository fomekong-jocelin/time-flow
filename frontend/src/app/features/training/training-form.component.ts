import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DeliveryMode, TrainingCategory, TrainingFormData, TrainingSession, TrainingStatus } from './training.models';
import { ManagedUser } from '../users/user-admin.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { I18nService } from '../../core/i18n/i18n.service';

@Component({
  selector: 'tf-training-form',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form (ngSubmit)="submit()" novalidate class="space-y-4 text-ink">
      <!-- Référence & Titre -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div class="sm:col-span-1">
          <label for="training-ref" class="mb-1 block text-sm font-medium">{{ 'training.reference' | translate }} *</label>
          <input
            id="training-ref"
            name="reference"
            type="text"
            maxlength="30"
            [placeholder]="'training.referencePlaceholder' | translate"
            [ngModel]="reference()"
            (ngModelChange)="reference.set($event)"
            [attr.aria-invalid]="touched() && !reference().trim()"
            class="min-h-11 w-full rounded-xl border border-border bg-app px-3 text-sm font-mono uppercase focus:border-brand-500 focus:outline-none" />
          @if (touched() && !reference().trim()) {
            <p class="mt-1 text-xs text-error">{{ 'training.referenceRequired' | translate }}</p>
          }
        </div>

        <div class="sm:col-span-2">
          <label for="training-title" class="mb-1 block text-sm font-medium">{{ 'training.titleLabel' | translate }} *</label>
          <input
            id="training-title"
            name="title"
            type="text"
            maxlength="200"
            [placeholder]="'training.titlePlaceholder' | translate"
            [ngModel]="title()"
            (ngModelChange)="title.set($event)"
            [attr.aria-invalid]="touched() && !title().trim()"
            class="min-h-11 w-full rounded-xl border border-border bg-app px-3 text-sm focus:border-brand-500 focus:outline-none" />
          @if (touched() && !title().trim()) {
            <p class="mt-1 text-xs text-error">{{ 'training.titleRequired' | translate }}</p>
          }
        </div>
      </div>

      <!-- Description / Objectifs pédagogiques -->
      <div>
        <label for="training-desc" class="mb-1 block text-sm font-medium">{{ 'training.descriptionLabel' | translate }}</label>
        <textarea
          id="training-desc"
          name="description"
          rows="3"
          maxlength="2000"
          [placeholder]="'training.descriptionPlaceholder' | translate"
          [ngModel]="description()"
          (ngModelChange)="description.set($event)"
          class="w-full rounded-xl border border-border bg-app p-3 text-sm focus:border-brand-500 focus:outline-none"></textarea>
      </div>

      <!-- Typologie, Modalité, Statut -->
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label for="training-cat" class="mb-1 block text-xs font-medium text-muted">{{ 'training.category' | translate }}</label>
          <select
            id="training-cat"
            name="category"
            [ngModel]="category()"
            (ngModelChange)="category.set($event)"
            class="min-h-10 w-full rounded-xl border border-border bg-app px-3 text-xs font-medium focus:border-brand-500 focus:outline-none">
            <option value="INTERNAL">{{ 'training.categoryInternal' | translate }}</option>
            <option value="CLIENT">{{ 'training.categoryClient' | translate }}</option>
          </select>
        </div>

        <div>
          <label for="training-mode" class="mb-1 block text-xs font-medium text-muted">{{ 'training.deliveryMode' | translate }}</label>
          <select
            id="training-mode"
            name="deliveryMode"
            [ngModel]="deliveryMode()"
            (ngModelChange)="deliveryMode.set($event)"
            class="min-h-10 w-full rounded-xl border border-border bg-app px-3 text-xs font-medium focus:border-brand-500 focus:outline-none">
            <option value="REMOTE">{{ 'training.modalityRemote' | translate }}</option>
            <option value="ON_SITE">{{ 'training.modalityOnSite' | translate }}</option>
            <option value="HYBRID">{{ 'training.modalityHybrid' | translate }}</option>
          </select>
        </div>

        <div>
          <label for="training-status" class="mb-1 block text-xs font-medium text-muted">{{ 'training.statusLabel' | translate }}</label>
          <select
            id="training-status"
            name="status"
            [ngModel]="status()"
            (ngModelChange)="status.set($event)"
            class="min-h-10 w-full rounded-xl border border-border bg-app px-3 text-xs font-medium focus:border-brand-500 focus:outline-none">
            <option value="PLANNED">{{ 'training.statusPlanned' | translate }}</option>
            <option value="IN_PROGRESS">{{ 'training.statusInProgress' | translate }}</option>
            <option value="COMPLETED">{{ 'training.statusCompleted' | translate }}</option>
            <option value="CANCELLED">{{ 'training.statusCancelled' | translate }}</option>
          </select>
        </div>
      </div>

      <!-- Formateur référent & Lieu / Lien visio -->
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label for="training-trainer" class="mb-1 block text-xs font-medium text-muted">{{ 'training.trainer' | translate }}</label>
          <select
            id="training-trainer"
            name="trainerId"
            [ngModel]="trainerId()"
            (ngModelChange)="trainerId.set($event)"
            class="min-h-10 w-full rounded-xl border border-border bg-app px-3 text-xs font-medium focus:border-brand-500 focus:outline-none">
            <option [ngValue]="null">{{ 'training.noTrainer' | translate }}</option>
            @for (u of users(); track u.id) {
              <option [value]="u.id">{{ u.displayName }} ({{ u.role }})</option>
            }
          </select>
        </div>

        <div>
          <label for="training-loc" class="mb-1 block text-xs font-medium text-muted">{{ 'training.location' | translate }}</label>
          <input
            id="training-loc"
            name="location"
            type="text"
            maxlength="255"
            [placeholder]="'training.locationPlaceholder' | translate"
            [ngModel]="location()"
            (ngModelChange)="location.set($event)"
            class="min-h-10 w-full rounded-xl border border-border bg-app px-3 text-xs focus:border-brand-500 focus:outline-none" />
        </div>
      </div>

      <!-- Dates début & fin -->
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label for="training-start" class="mb-1 block text-xs font-medium text-muted">{{ 'training.startDate' | translate }} *</label>
          <input
            id="training-start"
            name="startDate"
            type="datetime-local"
            [ngModel]="startDate()"
            (ngModelChange)="startDate.set($event); checkDates()"
            [attr.aria-invalid]="touched() && (!startDate() || dateError())"
            class="min-h-10 w-full rounded-xl border border-border bg-app px-3 text-xs font-mono focus:border-brand-500 focus:outline-none" />
        </div>

        <div>
          <label for="training-end" class="mb-1 block text-xs font-medium text-muted">{{ 'training.endDate' | translate }} *</label>
          <input
            id="training-end"
            name="endDate"
            type="datetime-local"
            [ngModel]="endDate()"
            (ngModelChange)="endDate.set($event); checkDates()"
            [attr.aria-invalid]="touched() && (!endDate() || dateError())"
            class="min-h-10 w-full rounded-xl border border-border bg-app px-3 text-xs font-mono focus:border-brand-500 focus:outline-none" />
        </div>
      </div>

      @if (dateError()) {
        <p class="text-xs text-error">{{ 'training.datesInvalid' | translate }}</p>
      }

      <!-- Durée (heures) & Capacité maximale -->
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label for="training-duration" class="mb-1 block text-xs font-medium text-muted">{{ 'training.durationHours' | translate }} *</label>
          <input
            id="training-duration"
            name="durationHours"
            type="number"
            min="0.5"
            step="0.5"
            [placeholder]="'training.durationHoursPlaceholder' | translate"
            [ngModel]="durationHours()"
            (ngModelChange)="durationHours.set($event)"
            class="min-h-10 w-full rounded-xl border border-border bg-app px-3 text-xs font-mono focus:border-brand-500 focus:outline-none" />
        </div>

        <div>
          <label for="training-max" class="mb-1 block text-xs font-medium text-muted">{{ 'training.maxParticipants' | translate }} *</label>
          <input
            id="training-max"
            name="maxParticipants"
            type="number"
            min="1"
            max="1000"
            [placeholder]="'training.maxParticipantsPlaceholder' | translate"
            [ngModel]="maxParticipants()"
            (ngModelChange)="maxParticipants.set($event)"
            class="min-h-10 w-full rounded-xl border border-border bg-app px-3 text-xs font-mono focus:border-brand-500 focus:outline-none" />
        </div>
      </div>

      <!-- Actions -->
      <div class="flex flex-wrap justify-end gap-2 pt-3">
        <button
          type="button"
          (click)="cancelled.emit()"
          class="min-h-11 rounded-xl border border-border px-4 text-sm font-medium transition hover:bg-app cursor-pointer">
          {{ 'common.cancel' | translate }}
        </button>
        <button
          type="submit"
          [disabled]="busy()"
          class="min-h-11 rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-wait disabled:opacity-60 cursor-pointer">
          {{ busy() ? ('common.loading' | translate) : ('training.saveSession' | translate) }}
        </button>
      </div>
    </form>
  `
})
export class TrainingFormComponent implements OnInit {
  protected readonly i18n = inject(I18nService);

  readonly session = input<TrainingSession | null>(null);
  readonly users = input<ManagedUser[]>([]);
  readonly busy = input(false);

  readonly saved = output<TrainingFormData>();
  readonly cancelled = output<void>();

  readonly reference = signal('');
  readonly title = signal('');
  readonly description = signal('');
  readonly trainerId = signal<string | null>(null);
  readonly location = signal('');
  readonly deliveryMode = signal<DeliveryMode>('REMOTE');
  readonly category = signal<TrainingCategory>('INTERNAL');
  readonly status = signal<TrainingStatus>('PLANNED');
  readonly startDate = signal('');
  readonly endDate = signal('');
  readonly durationHours = signal<number | null>(7);
  readonly maxParticipants = signal<number | null>(12);
  readonly touched = signal(false);
  readonly dateError = signal(false);

  ngOnInit() {
    const s = this.session();
    if (s) {
      this.reference.set(s.reference);
      this.title.set(s.title);
      this.description.set(s.description ?? '');
      this.trainerId.set(s.trainerId);
      this.location.set(s.location ?? '');
      this.deliveryMode.set(s.deliveryMode);
      this.category.set(s.category);
      this.status.set(s.status);
      this.startDate.set(this.formatForInput(s.startDate));
      this.endDate.set(this.formatForInput(s.endDate));
      this.durationHours.set(s.durationHours);
      this.maxParticipants.set(s.maxParticipants);
    } else {
      // Default dates: tomorrow at 09:00 to 17:00
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const startIso = new Date(tomorrow.setHours(9, 0, 0, 0)).toISOString().slice(0, 16);
      const endIso = new Date(tomorrow.setHours(17, 0, 0, 0)).toISOString().slice(0, 16);
      this.startDate.set(startIso);
      this.endDate.set(endIso);
    }
  }

  checkDates() {
    const s = this.startDate();
    const e = this.endDate();
    if (s && e) {
      this.dateError.set(new Date(e) <= new Date(s));
    } else {
      this.dateError.set(false);
    }
  }

  submit() {
    this.touched.set(true);
    this.checkDates();

    const ref = this.reference().trim();
    const tit = this.title().trim();
    const start = this.startDate();
    const end = this.endDate();
    const dur = Number(this.durationHours());
    const max = Number(this.maxParticipants());

    if (!ref || !tit || !start || !end || this.dateError() || dur <= 0 || max < 1) {
      return;
    }

    const payload: TrainingFormData = {
      reference: ref,
      title: tit,
      description: this.description().trim() || null,
      trainerId: this.trainerId() || null,
      location: this.location().trim() || null,
      deliveryMode: this.deliveryMode(),
      category: this.category(),
      status: this.status(),
      startDate: new Date(start).toISOString(),
      endDate: new Date(end).toISOString(),
      durationHours: dur,
      maxParticipants: max
    };

    this.saved.emit(payload);
  }

  private formatForInput(isoString: string): string {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return isoString.slice(0, 16);
    }
  }
}
