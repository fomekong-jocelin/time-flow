import { ChangeDetectionStrategy, Component, DestroyRef, inject, output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProjectService } from './project.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'tf-project-excel',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mb-6 rounded-xl border border-border bg-surface p-5" [attr.aria-label]="'projects.excel.ariaLabel' | translate">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 class="font-semibold">{{ 'projects.excel.title' | translate }}</h2>
          <p class="mt-1 max-w-2xl text-sm text-muted">{{ 'projects.excel.subtitle' | translate }}</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button type="button" (click)="download(true)" [disabled]="downloading()" class="min-h-11 rounded-xl border border-border px-4 text-sm font-medium disabled:opacity-60">{{ 'projects.excel.downloadTemplate' | translate }}</button>
          <button type="button" (click)="download(false)" [disabled]="downloading()" class="min-h-11 rounded-xl border border-border px-4 text-sm font-medium disabled:opacity-60">{{ 'projects.excel.exportProjects' | translate }}</button>
        </div>
      </div>
      <div class="mt-5 flex flex-wrap items-end gap-3">
        <div class="min-w-0 flex-1">
          <label for="project-workbook" class="mb-2 block text-sm font-medium">{{ 'projects.excel.fileLabel' | translate }}</label>
          <input id="project-workbook" type="file" accept=".xlsx" [disabled]="importing()" (change)="select($event)"
            aria-describedby="excel-help" class="min-h-11 w-full rounded-xl border border-border bg-app p-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-1 file:text-brand-800" />
        </div>
        <button type="button" (click)="upload()" [disabled]="!file() || importing()"
          class="min-h-11 rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60">
          {{ (importing() ? 'projects.excel.importing' : 'projects.excel.importBtn') | translate }}
        </button>
      </div>
      <p id="excel-help" class="mt-3 text-xs text-muted">{{ 'projects.excel.helpText' | translate }}</p>
      @if (message()) { <p class="mt-3 text-sm text-muted" role="status">{{ message() }}</p> }
      @if (error()) { <p class="mt-3 text-sm text-warning-700" role="alert">{{ error() }}</p> }
    </section>
  `
})
export class ProjectExcelComponent {
  readonly i18n = inject(I18nService);
  private readonly api = inject(ProjectService);
  private readonly destroyRef = inject(DestroyRef);
  readonly imported = output<void>();
  readonly file = signal<File | null>(null);
  readonly importing = signal(false);
  readonly downloading = signal(false);
  readonly message = this.i18n.messageSignal('');
  readonly error = this.i18n.messageSignal('');

  select(event: Event): void {
    this.file.set((event.target as HTMLInputElement).files?.[0] ?? null);
    this.message.set(''); this.error.set('');
  }

  upload(): void {
    const file = this.file();
    if (!file || this.importing()) return;
    this.importing.set(true); this.message.set(''); this.error.set('');
    this.api.importWorkbook(file).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: result => {
        this.importing.set(false);
        this.message.set(() => this.i18n.t('projects.excel.importedSuccess', { count: result.importedCount }));
        this.imported.emit();
      },
      error: (response: HttpErrorResponse) => {
        this.importing.set(false);
        this.error.set(() => this.i18n.problem(response, this.i18n.t('projects.excel.importError')));
      }
    });
  }

  download(template: boolean): void {
    if (this.downloading()) return;
    this.downloading.set(true); this.error.set('');
    this.api.workbook(template).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = template ? 'modele-projets-timeflow.xlsx' : 'projets-timeflow.xlsx';
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        this.downloading.set(false);
        this.message.set(() => this.i18n.t('projects.excel.downloadPrepared'));
      },
      error: () => { this.downloading.set(false); this.error.set(() => this.i18n.t('projects.excel.downloadError')); }
    });
  }
}
