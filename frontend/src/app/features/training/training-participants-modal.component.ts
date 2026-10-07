import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ParticipantStatus, TrainingParticipant, TrainingSession, TrainingUser } from './training.models';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { DialogComponent } from '../../shared/ui/dialog.component';
import { I18nService } from '../../core/i18n/i18n.service';
import { meetingUrl } from './training-time';
import { ParticipantCorrection, attendanceStateInconsistent, canReturnToRegistered,
  eligibleParticipants, validCorrectionReason } from './training-participation';

@Component({
  selector: 'tf-training-participants-modal', standalone: true,
  imports: [FormsModule, NgTemplateOutlet, TranslatePipe, DialogComponent],
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
  readonly correctParticipant = output<ParticipantCorrection>();
  readonly selectedUserId = signal('');
  readonly withdrawal = signal<TrainingParticipant | null>(null);
  readonly correction = signal<TrainingParticipant | null>(null);
  readonly correctionStatus = signal<'REGISTERED' | 'CANCELLED'>('CANCELLED');
  readonly reason = signal(''); readonly correctionTouched = signal(false);
  readonly participants = computed(() => this.session()?.participants ?? []);
  readonly activeParticipants = computed(() => this.participants().filter(p => p.status !== 'CANCELLED'));
  readonly cancelledParticipants = computed(() => this.participants().filter(p => p.status === 'CANCELLED'));
  readonly mutable = computed(() => ['PLANNED', 'IN_PROGRESS'].includes(this.session()?.status ?? ''));
  readonly roomAvailable = computed(() => (this.session()?.registeredCount ?? 0) < (this.session()?.maxParticipants ?? 0));
  readonly link = computed(() => meetingUrl(this.session()?.location));
  readonly availableUsers = computed(() => eligibleParticipants(this.users(), this.session()));
  readonly validSelection = computed(() => this.availableUsers().some(u => u.id === this.selectedUserId()));
  readonly reasonValid = computed(() => validCorrectionReason(this.reason()));

  constructor() {
    effect(() => {
      if (!this.session()) return;
      for (const pending of [this.withdrawal, this.correction]) {
        const selected = pending();
        if (selected && this.participants().find(p => p.userId === selected.userId)?.status !== selected.status) {
          pending.set(null);
        }
      }
    });
  }
  handleAdd(): void {
    if (this.canManage() && this.mutable() && this.validSelection() && !this.busy() && this.roomAvailable()) {
      this.addParticipant.emit(this.selectedUserId());
    }
  }
  requestWithdrawal(p: TrainingParticipant): void {
    if (!this.busy() && this.mutable() && this.canUpdateStatus() && p.status === 'REGISTERED') {
      this.correction.set(null); this.withdrawal.set(p);
    }
  }
  confirmWithdrawal(): void {
    const p = this.withdrawal();
    if (!p || this.busy() || !this.mutable() || !this.canUpdateStatus()) return;
    if (this.canManage()) this.removeParticipant.emit(p.userId);
    else this.updateStatus.emit({ userId: p.userId, status: 'CANCELLED' });
  }
  openCorrection(p: TrainingParticipant): void {
    if (!this.canManage() || this.busy()) return;
    this.withdrawal.set(null); this.correction.set(p);
    this.correctionStatus.set('CANCELLED'); this.reason.set(''); this.correctionTouched.set(false);
  }
  submitCorrection(): void {
    const p = this.correction(), session = this.session();
    this.correctionTouched.set(true);
    if (!p || !session || this.busy() || !this.canManage() || !this.reasonValid()) return;
    if (this.correctionStatus() === 'REGISTERED' && !canReturnToRegistered(session, p)) return;
    this.correctParticipant.emit({ userId: p.userId, expectedStatus: p.status,
      status: this.correctionStatus(), reason: this.reason().trim() });
  }
  canRestore(p: TrainingParticipant): boolean {
    const s = this.session();
    return !!s && canReturnToRegistered(s, p);
  }
  inconsistent(p: TrainingParticipant): boolean {
    const s = this.session(); return !!s && attendanceStateInconsistent(s, p);
  }
  mark(p: TrainingParticipant, status: ParticipantStatus): void {
    if (!this.busy() && this.canUpdateStatus()) this.updateStatus.emit({ userId: p.userId, status });
  }
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
