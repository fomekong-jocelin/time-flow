import { Injectable, computed, effect, signal } from '@angular/core';
import { SupportedLang, Translations } from './i18n.types';
import { TRANSLATIONS } from './translations';

const STORAGE_KEY = 'timeflow-lang';

@Injectable({
  providedIn: 'root'
})
export class I18nService {
  readonly currentLang = signal<SupportedLang>(this.getInitialLang());
  readonly locale = computed(() => this.currentLang() === 'en' ? 'en-US' : 'fr-FR');

  constructor() {
    effect(() => {
      const lang = this.currentLang();
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('lang', lang);
      }
    });
  }

  setLang(lang: SupportedLang): void {
    if (lang !== 'fr' && lang !== 'en') return;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, lang);
      } catch {
        // Ignore localStorage error
      }
    }
    this.currentLang.set(lang);
  }

  toggleLang(): void {
    this.setLang(this.currentLang() === 'fr' ? 'en' : 'fr');
  }

  t(key: string, params?: Record<string, string | number>): string {
    const lang = this.currentLang();
    const dictionary = TRANSLATIONS[lang] || TRANSLATIONS.fr;
    let value = this.resolvePath(dictionary, key);

    if (value === undefined && lang !== 'fr') {
      value = this.resolvePath(TRANSLATIONS.fr, key);
    }

    if (typeof value !== 'string') {
      return key;
    }

    if (params) {
      return value.replace(/\{(\w+)\}/g, (token, name: string) =>
        Object.hasOwn(params, name) ? String(params[name]) : token);
    }

    return value;
  }

  messageSignal(initial: string | null = '') {
    const value = signal<string | null | (() => string)>(initial);
    return Object.assign(computed(() => {
      const message = value();
      return typeof message === 'function' ? message() : message;
    }), { set: (message: string | null | (() => string)) => value.set(message) });
  }

  formatDate(value: string, withTime = false): string {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
    return new Intl.DateTimeFormat(this.locale(), {
      year: 'numeric', month: '2-digit', day: '2-digit',
      ...(withTime ? { hour: '2-digit', minute: '2-digit' } as const : {})
    }).format(date);
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat(this.locale(), { maximumFractionDigits: 2 }).format(value);
  }

  problem(error: unknown, fallback: string): string {
    const response = error as { error?: { code?: unknown; detail?: unknown } } | null;
    const code = response?.error?.code;
    if (typeof code === 'string') {
      const translated = this.t(`errors.${code}`);
      if (translated !== `errors.${code}`) return translated;
    }
    const detail = response?.error?.detail;
    // Legacy APIs do not all expose a stable error code yet.
    return this.currentLang() === 'fr' && typeof detail === 'string' && detail.length < 300
      ? detail : fallback;
  }

  private resolvePath(obj: Translations, path: string): string | undefined {
    const keys = path.split('.');
    let current: string | Translations = obj;
    for (const k of keys) {
      if (typeof current !== 'object' || !Object.hasOwn(current, k)) return undefined;
      current = current[k];
    }
    return typeof current === 'string' ? current : undefined;
  }

  private getInitialLang(): SupportedLang {
    if (typeof window === 'undefined') return 'fr';
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as SupportedLang | null;
      if (saved === 'fr' || saved === 'en') {
        return saved;
      }
    } catch {
      // Ignore
    }
    const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
    for (const language of languages) {
      const base = language?.toLowerCase().split('-')[0];
      if (base === 'fr' || base === 'en') return base;
    }
    return 'fr';
  }
}
