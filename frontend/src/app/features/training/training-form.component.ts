import { ChangeDetectionStrategy, Component, OnInit, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { DeliveryMode, TrainingCategory, TrainingFormData, TrainingSession, TrainingStatus, TrainingUser } from './training.models';
import { localDateTime, schedulePayload, tomorrowSchedule, validCapacity, validDuration } from './training-time';
import { trainerParticipation } from './training-participation';

@Component({
  selector: 'tf-training-form', standalone: true, imports: [FormsModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush, templateUrl: './training-form.component.html'
})
export class TrainingFormComponent implements OnInit {
  readonly session = input<TrainingSession | null>(null);
  readonly users = input<TrainingUser[]>([]);
  readonly busy = input(false);
  readonly saved = output<TrainingFormData>();
  readonly cancelled = output<void>();
  readonly reference = signal(''); readonly title = signal(''); readonly description = signal('');
  readonly trainerId = signal<string | null>(null); readonly location = signal('');
  readonly deliveryMode = signal<DeliveryMode>('REMOTE');
  readonly category = signal<TrainingCategory>('INTERNAL'); readonly status = signal<TrainingStatus>('PLANNED');
  readonly timed = signal(true); readonly startDate = signal(''); readonly endDate = signal('');
  readonly durationHours = signal<number | null>(7); readonly maxParticipants = signal<number | null>(12);
  readonly errors = signal<Record<string, string>>({});
  readonly zone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  readonly trainers = computed(() => this.users().filter(u => ['TRAINER', 'ADMIN', 'DIRECTION'].includes(u.role)));
  readonly trainerParticipant = computed(() => trainerParticipation(this.session(), this.trainerId()));
  readonly withdrawTrainerRegistration = signal(false);
  ngOnInit(): void {
    const s = this.session();
    if (!s) {
      const defaults = tomorrowSchedule();
      this.startDate.set(defaults.start); this.endDate.set(defaults.end);
      return;
    }
    this.reference.set(s.reference); this.title.set(s.title); this.description.set(s.description ?? '');
    this.trainerId.set(s.trainerId); this.location.set(s.location ?? '');
    this.deliveryMode.set(s.deliveryMode); this.category.set(s.category); this.status.set(s.status);
    this.durationHours.set(s.durationHours); this.maxParticipants.set(s.maxParticipants);
    this.timed.set(Boolean(s.startsAt && s.endsAt));
    this.startDate.set(s.startsAt ? localDateTime(new Date(s.startsAt)) : s.startDate);
    this.endDate.set(s.endsAt ? localDateTime(new Date(s.endsAt)) : s.endDate);
  }
  selectTrainer(id: string | null): void {
    this.trainerId.set(id || null); this.withdrawTrainerRegistration.set(false); this.clear('trainer');
  }
  toggleTimed(value: boolean): void {
    this.timed.set(value);
    this.startDate.set(this.startDate().slice(0, 10) + (value ? 'T09:00' : ''));
    this.endDate.set(this.endDate().slice(0, 10) + (value ? 'T17:00' : ''));
    this.clear('dates');
  }
  clear(field: string): void {
    this.errors.update(errors => { const next = { ...errors }; delete next[field]; return next; });
  }
  submit(): void {
    if (this.busy()) return;
    const errors: Record<string, string> = {};
    const reference = this.reference().trim(), title = this.title().trim();
    if (!reference || reference.length > 50) errors['reference'] = 'training.fix.referenceError';
    if (!title || title.length > 200) errors['title'] = 'training.fix.titleError';
    if (this.description().length > 2000) errors['description'] = 'training.fix.descriptionError';
    if (this.location().length > 200) errors['location'] = 'training.fix.locationError';
    const trainerParticipant = this.trainerParticipant();
    if (trainerParticipant?.status === 'ATTENDED') errors['trainer'] = 'training.errors.trainerAttendanceConflict';
    else if (trainerParticipant && !this.withdrawTrainerRegistration()) errors['trainer'] = 'training.errors.trainerWithdrawalRequired';
    const durationHours = Number(this.durationHours()), maxParticipants = Number(this.maxParticipants());
    if (!validDuration(durationHours)) errors['duration'] = 'training.fix.durationError';
    if (!validCapacity(maxParticipants)) errors['capacity'] = 'training.fix.capacityError';
    let schedule: ReturnType<typeof schedulePayload> | undefined;
    try {
      schedule = schedulePayload(this.timed(), this.startDate(), this.endDate(),
        this.session()?.startsAt, this.session()?.endsAt, this.session()?.timeZone);
    } catch (error) {
      errors['dates'] = error instanceof Error && error.message === 'ambiguousTime'
        ? 'training.fix.ambiguousTime' : 'training.fix.datesError';
    }
    this.errors.set(errors);
    if (Object.keys(errors).length || !schedule) return;
    this.saved.emit({ reference, title, description: this.description().trim() || null,
      trainerId: this.trainerId() || null, location: this.location().trim() || null,
      deliveryMode: this.deliveryMode(), category: this.category(), status: this.status(),
      withdrawTrainerRegistration: trainerParticipant?.status === 'REGISTERED' && this.withdrawTrainerRegistration(),
      durationHours, maxParticipants, ...schedule });
  }
}
