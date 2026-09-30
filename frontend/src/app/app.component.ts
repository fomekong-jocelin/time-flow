import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'tf-root',
  imports: [RouterLink, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-app text-ink">
      <header class="border-b border-border bg-white">
        <div class="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <a routerLink="/mes-temps" class="flex items-center gap-3 font-semibold">
            <span class="grid size-9 place-items-center rounded-xl bg-brand-600 text-white">TF</span>
            <span>TimeFlow <span class="text-muted font-normal">by INDYLI</span></span>
          </a>
          <span class="text-sm text-muted">V0.1</span>
        </div>
      </header>
      <main class="mx-auto max-w-7xl px-5 py-8">
        <router-outlet />
      </main>
    </div>
  `
})
export class AppComponent {}
