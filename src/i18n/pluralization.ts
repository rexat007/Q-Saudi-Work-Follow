import { Locale, PluralCategory, PluralForms } from './types';
import { interpolate } from './utils';

/**
 * Returns the plural rule category for a given number and locale.
 * Uses native Intl.PluralRules (supports Arabic 6 forms, English 2 forms, Urdu 2 forms).
 */
export function getPluralCategory(locale: Locale, count: number): PluralCategory {
  try {
    const pr = new Intl.PluralRules(locale);
    return pr.select(count) as PluralCategory;
  } catch {
    return count === 1 ? 'one' : 'other';
  }
}

/**
 * Resolves the appropriate plural form with fallback to 'other' and interpolates parameters.
 */
export function resolvePlural(
  locale: Locale,
  count: number,
  forms: PluralForms,
  params?: Record<string, string | number>
): string {
  const category = getPluralCategory(locale, count);
  const template = forms[category] || forms.other;
  return interpolate(template, { count, ...params });
}
