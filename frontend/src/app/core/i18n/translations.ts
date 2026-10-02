import { SupportedLang, Translations } from './i18n.types';
import { FR } from './fr';
import { EN } from './en';
import { FIX_FR, FIX_EN } from './remediation.translations';

function merge(base: Translations, additions: Translations): Translations {
  const result: Translations = { ...base };
  for (const [key, value] of Object.entries(additions)) {
    const existing = result[key];
    result[key] = typeof value === 'string' ? value : merge(typeof existing === 'object' ? existing : {}, value);
  }
  return result;
}
export const TRANSLATIONS: Record<SupportedLang, Translations> = { fr: merge(FR, FIX_FR), en: merge(EN, FIX_EN) };
