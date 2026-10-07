import { DestroyRef, Injectable, effect, inject, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'timeflow-theme';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  readonly theme = signal<ThemeMode>(this.getInitialTheme());
  readonly resolvedTheme = signal<'light' | 'dark'>(this.computeResolved(this.getInitialTheme()));

  private mediaQuery: MediaQueryList | null = null;
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    if (typeof window !== 'undefined' && 'matchMedia' in window) {
      this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const onChange = () => {
        if (this.theme() === 'system') {
          this.applyTheme('system');
        }
      };
      this.mediaQuery.addEventListener('change', onChange);
      this.destroyRef.onDestroy(() => this.mediaQuery?.removeEventListener('change', onChange));
    }

    // Effect to apply theme whenever the signal changes
    effect(() => {
      const mode = this.theme();
      this.applyTheme(mode);
    });
  }

  setTheme(mode: ThemeMode): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, mode);
      } catch {
        // Ignore localStorage errors (e.g. private browsing quota)
      }
    }
    this.theme.set(mode);
  }

  cycleTheme(): void {
    const current = this.theme();
    if (current === 'system') {
      this.setTheme('light');
    } else if (current === 'light') {
      this.setTheme('dark');
    } else {
      this.setTheme('system');
    }
  }

  private getInitialTheme(): ThemeMode {
    if (typeof window === 'undefined') return 'system';
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        return saved;
      }
    } catch {
      // Ignore
    }
    return 'system';
  }

  private computeResolved(mode: ThemeMode): 'light' | 'dark' {
    if (mode === 'dark') return 'dark';
    if (mode === 'light') return 'light';
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  }

  private applyTheme(mode: ThemeMode): void {
    const resolved = this.computeResolved(mode);
    this.resolvedTheme.set(resolved);

    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    if (resolved === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    }
  }
}
