import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ParticipantStatus, TrainingParticipant, TrainingSession } from './training.models';
import { ManagedUser } from '../users/user-admin.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { IconComponent } from '../../shared/ui/icon.component';
import { I18nService } from '../../core/i18n/i18n.service';

@Component({
  selector: 'tf-training-participants-modal',
  standalone: true,
  imports: [FormsModule, TranslatePipe, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
      (click)="onBackdropClick($event)"
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="'training.viewParticipants' | translate">
      <div class="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-border bg-surface shadow-2xl text-ink overflow-hidden">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-border p-4 sm:p-5">
          <div>
            <h2 class="text-base sm:text-lg font-semibold text-ink">
              {{ 'training.participantsTitle' | translate:titleParams() }}
            </h2>
            <p class="text-xs text-muted truncate max-w-md">
              {{ session().title }} ({{ session().reference }})
            </p>
          </div>
          <button
            type="button"
            (click)="close.emit()"
            class="grid size-9 place-items-center rounded-lg text-muted transition hover:bg-app hover:text-ink cursor-pointer"
            [attr.aria-label]="'common.close' | translate">
            <tf-icon name="x" [size]="18" />
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          <!-- Formulaire d'ajout (Admin / Direction) -->
          @if (canManage()) {
            <div class="rounded-xl border border-border bg-app p-3 sm:p-4 space-y-3">
              <label for="add-participant-select" class="block text-xs font-semibold uppercase tracking-wider text-muted">
                {{ 'training.addParticipant' | translate }}
              </label>
              <div class="flex flex-col sm:flex-row gap-2">
                <select
                  id="add-participant-select"
                  name="selectedUser"
                  [ngModel]="selectedUserId()"
                  (ngModelChange)="selectedUserId.set($event)"
                  class="min-h-10 flex-1 rounded-xl border border-border bg-surface px-3 text-xs font-medium focus:border-brand-500 focus:outline-none">
                  <option [ngValue]="null">{{ 'training.selectParticipant' | translate }}</option>
                  @for (u of availableUsers(); track u.id) {
                    <option [value]="u.id">{{ u.displayName }} ({{ u.email }})</option>
                  }
                </select>
                <button
                  type="button"
                  [disabled]="!selectedUserId() || busy()"
                  (click)="handleAdd()"
                  class="min-h-10 inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-4 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50 cursor-pointer">
                  <tf-icon name="plus" [size]="14" />
                  <span>{{ 'training.addParticipant' | translate }}</span>
                </button>
              </div>
            </div>
          }

          <!-- Liste des participants -->
          @if (participants().length === 0) {
            <div class="rounded-xl border border-dashed border-border py-12 text-center">
              <tf-icon name="users" [size]="32" class="mx-auto text-muted/50 mb-2" />
              <p class="text-xs text-muted">{{ 'training.noParticipants' | translate }}</p>
            </div>
          } @else {
            <div class="overflow-x-auto rounded-xl border border-border">
              <table class="w-full text-left text-xs">
                <thead class="bg-app text-muted font-medium border-b border-border">
                  <tr>
                    <th scope="col" class="py-2.5 px-3">{{ 'training.colAttendee' | translate }}</th>
                    <th scope="col" class="py-2.5 px-3">{{ 'training.colStatus' | translate }}</th>
                    <th scope="col" class="hidden sm:table-cell py-2.5 px-3">{{ 'training.colRegisteredAt' | translate }}</th>
                    <th scope="col" class="py-2.5 px-3 text-right">{{ 'training.colActions' | translate }}</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border">
                  @for (p of participants(); track p.userId) {
                    <tr class="hover:bg-app/40 transition">
                      <td class="py-2.5 px-3">
                        <div class="flex items-center gap-2.5">
                          <span class="grid size-7 shrink-0 place-items-center rounded-full bg-brand-100 dark:bg-brand-950 font-semibold text-[11px] text-brand-700 dark:text-brand-300">
                            {{ initials(p.userDisplayName) }}
                          </span>
                          <div class="min-w-0">
                            <p class="font-medium text-ink truncate">{{ p.userDisplayName }}</p>
                            <p class="text-[11px] text-muted truncate">{{ p.userEmail }}</p>
                          </div>
                        </div>
                      </td>
                      <td class="py-2.5 px-3">
                        @switch (p.status) {
                          @case ('REGISTERED') {
                            <span class="inline-flex items-center rounded-md bg-sky-100 dark:bg-sky-950/60 px-2 py-0.5 text-[11px] font-medium text-sky-700 dark:text-sky-300">
                              {{ 'training.participantRegistered' | translate }}
                            </span>
                          }
                          @case ('ATTENDED') {
                            <span class="inline-flex items-center rounded-md bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                              {{ 'training.participantAttended' | translate }}
                            </span>
                          }
                          @case ('CANCELLED') {
                            <span class="inline-flex items-center rounded-md bg-stone-100 dark:bg-stone-800 px-2 py-0.5 text-[11px] font-medium text-stone-600 dark:text-stone-400">
                              {{ 'training.participantCancelled' | translate }}
                            </span>
                          }
                        }
                      </td>
                      <td class="hidden sm:table-cell py-2.5 px-3 text-muted">
                        {{ i18n.formatDate(p.registeredAt) }}
                      </td>
                      <td class="py-2.5 px-3 text-right">
                        <div class="inline-flex items-center gap-1">
                          @if (canUpdateStatus()) {
                            @if (p.status !== 'ATTENDED') {
                              <button
                                type="button"
                                (click)="handleStatusChange(p, 'ATTENDED')"
                                [disabled]="busy()"
                                [title]="'training.markAttended' | translate"
                                class="grid size-7 place-items-center rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition cursor-pointer">
                                <tf-icon name="check" [size]="14" />
                              </button>
                            }
                            @if (p.status !== 'CANCELLED') {
                              <button
                                type="button"
                                (click)="handleStatusChange(p, 'CANCELLED')"
                                [disabled]="busy()"
                                [title]="'training.markCancelled' | translate"
                                class="grid size-7 place-items-center rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950 transition cursor-pointer">
                                <tf-icon name="x" [size]="14" />
                              </button>
                            }
                          }
                          @if (canManage()) {
                            <button
                              type="button"
                              (click)="removeParticipant.emit(p.userId)"
                              [disabled]="busy()"
                              [title]="'common.delete' | translate"
                              class="grid size-7 place-items-center rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950 transition cursor-pointer">
                              <tf-icon name="trash" [size]="14" />
                            </button>
                          }
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>

        <!-- Footer -->
        <div class="border-t border-border p-4 bg-app/50 flex justify-end">
          <button
            type="button"
            (click)="close.emit()"
            class="min-h-10 rounded-xl border border-border px-4 text-xs font-semibold transition hover:bg-app cursor-pointer">
            {{ 'common.close' | translate }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class TrainingParticipantsModalComponent {
  protected readonly i18n = inject(I18nService);

  readonly session = input.required<TrainingSession>();
  readonly users = input<ManagedUser[]>([]);
  readonly canManage = input(false);
  readonly canUpdateStatus = input(false);
  readonly busy = input(false);

  readonly close = output<void>();
  readonly addParticipant = output<string>();
  readonly removeParticipant = output<string>();
  readonly updateStatus = output<{ userId: string; status: ParticipantStatus }>();

  readonly selectedUserId = signal<string | null>(null);

  readonly participants = computed(() => this.session().participants ?? []);

  readonly titleParams = computed(() => ({
    count: String(this.session().registeredCount ?? this.participants().length),
    max: String(this.session().maxParticipants)
  }));

  readonly availableUsers = computed(() => {
    const registeredIds = new Set(this.participants().map(p => p.userId));
    return this.users().filter(u => !registeredIds.has(u.id));
  });

  onBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.close.emit();
    }
  }

  handleAdd() {
    const uid = this.selectedUserId();
    if (uid) {
      this.addParticipant.emit(uid);
      this.selectedUserId.set(null);
    }
  }

  handleStatusChange(p: TrainingParticipant, status: ParticipantStatus) {
    this.updateStatus.emit({ userId: p.userId, status });
  }

  initials(name?: string): string {
    if (!name) return '??';
    return name
      .split(/\s+/)
      .map(part => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
}
