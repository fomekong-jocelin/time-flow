import { DOCUMENT, AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnDestroy, ViewChild, inject, input, output } from '@angular/core';
import { TranslatePipe } from '../pipes/translate.pipe';

/** Native modal dialogs make the background inert and contain keyboard navigation. */
@Component({
  selector: 'tf-dialog', standalone: true, imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Single scroll container: the <dialog> itself never scrolls (overflow-hidden) and is a flex column only
  // while open (open:flex keeps the UA display:none of a closed dialog). Only the body section scrolls;
  // overscroll-contain stops scroll chaining to the page behind.
  styles: [`dialog::backdrop { background: rgb(0 0 0 / 55%); }`],
  template: `
    <dialog #dialog [attr.aria-labelledby]="titleId" (cancel)="cancel($event)"
      class="m-auto max-h-[90dvh] w-[92vw] max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-surface p-0 text-ink shadow-2xl open:flex">
      <header class="flex shrink-0 items-start justify-between gap-4 border-b border-border p-4 sm:p-5">
        <h2 #heading [id]="titleId" tabindex="-1" class="min-w-0 break-words text-lg font-semibold">{{ title() }}</h2>
        <button type="button" [disabled]="busy()" (click)="requestClose()" [attr.aria-label]="'common.close' | translate"
          class="min-h-11 shrink-0 rounded-xl border border-border px-3 text-sm disabled:opacity-50">{{ 'common.close' | translate }}</button>
      </header>
      <section class="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6"><ng-content /></section>
    </dialog>
  `
})
export class DialogComponent implements AfterViewInit, OnDestroy {
  private static nextId = 0;
  readonly titleId = `tf-dialog-title-${++DialogComponent.nextId}`;
  readonly title = input('');
  readonly busy = input(false);
  readonly closed = output<void>();
  private readonly document = inject(DOCUMENT);
  private previousFocus: HTMLElement | null = null;
  @ViewChild('dialog', { static: true }) private dialog!: ElementRef<HTMLDialogElement>;
  @ViewChild('heading', { static: true }) private heading!: ElementRef<HTMLElement>;
  ngAfterViewInit(): void {
    this.previousFocus = this.document.activeElement as HTMLElement | null;
    this.dialog.nativeElement.showModal();
    this.heading.nativeElement.focus();
  }
  cancel(event: Event): void { event.preventDefault(); this.requestClose(); }
  requestClose(): void { if (!this.busy()) this.closed.emit(); }
  ngOnDestroy(): void {
    this.dialog.nativeElement.close();
    const previous = this.previousFocus;
    queueMicrotask(() => { if (previous?.isConnected && !this.document.querySelector('dialog[open]')) previous.focus(); });
  }
}
