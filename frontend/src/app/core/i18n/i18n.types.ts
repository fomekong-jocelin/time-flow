export type SupportedLang = 'fr' | 'en';

export interface Translations {
  [key: string]: string | Translations;
}

export type TranslationShape<T> = { [K in keyof T]: T[K] extends string ? string : TranslationShape<T[K]> };
