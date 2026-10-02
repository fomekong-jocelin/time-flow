import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ParticipantStatus, TrainingParticipant, TrainingSession, TrainingUser } from './training.models';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { DialogComponent } from '../../shared/ui/dialog.component';
import { I18nService } from '../../core/i18n/i18n.service';
import { meetingUrl } from './training-time';

@Component({
  selector: 'tf-training-participants-modal', standalone: true,
  imports: [FormsModule, TranslatePipe, DialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush, templateUrl: './training-participants-modal.component.html'
})
export class TrainingParticipantsModalComponent {
  protected readonly i18n = inject(I18nService);
  readonly session = input<TrainingSession | null>(null);
  readonly title = input(''); readonly users = input<TrainingUser[]>([]);
  readonly canManage = input(false); readonly canUpdateStatus = input(false);
  readonly busy = input(false); readonly loading = input(false); readonly error = input<string | null>(null);
  readonly usersLoading = input(false); readonly usersError = input<string | null>(null);
  readonly close = output<void>(); readonly retry = output<void>(); readonly reloadUsers = output<void>();
  readonly addParticipant = output<string>(); readonly removeParticipant = output<string>();
  readonly updateStatus = output<{ userId: string; status: ParticipantStatus }>();
  readonly selectedUserId = signal('');
  readonly participants = computed(() => this.session()?.participants ?? []);
  readonly mutable = computed(() => ['PLANNED', 'IN_PROGRESS'].includes(this.session()?.status ?? ''));
  readonly roomAvailable = computed(() => (this.session()?.registeredCount ?? 0) < (this.session()?.maxParticipants ?? 0));
  readonly link = computed(() => meetingUrl(this.session()?.location));
  readonly availableUsers = computed(() => {
    const active = new Set(this.participants().filter(p => p.status !== 'CANCELLED').map(p => p.userId));
    return this.users().filter(u => !active.has(u.id));
  });
  readonly validSelection = computed(() => this.availableUsers().some(u => u.id === this.selectedUserId()));
  handleAdd(): void {
    if (this.validSelection() && !this.busy() && this.roomAvailable()) this.addParticipant.emit(this.selectedUserId());
  }
  cancelRegistration(p: TrainingParticipant): void {
    if (this.canManage()) this.removeParticipant.emit(p.userId);
    else this.updateStatus.emit({ userId: p.userId, status: 'CANCELLED' });
  }
  mark(p: TrainingParticipant, status: ParticipantStatus): void { this.updateStatus.emit({ userId: p.userId, status }); }
  statusKey(status: ParticipantStatus): string {
    return { REGISTERED: 'training.participantRegistered', ATTENDED: 'training.participantAttended', CANCELLED: 'training.participantCancelled' }[status];
  }
  schedule(s: TrainingSession): string {
    if (s.startsAt && s.endsAt) {
      const formatter = new Intl.DateTimeFormat(this.i18n.locale(), {
        dateStyle: 'medium', timeStyle: 'short', timeZone: s.timeZone || 'UTC'
      });
      return `${formatter.format(new Date(s.startsAt))} → ${formatter.format(new Date(s.endsAt))}`;
    }
    return s.startDate === s.endDate ? this.i18n.formatDate(s.startDate)
      : `${this.i18n.formatDate(s.startDate)} → ${this.i18n.formatDate(s.endDate)}`;
  }
}
