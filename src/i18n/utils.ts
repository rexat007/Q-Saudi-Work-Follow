import { Locale, Direction, TranslationKey, TranslationDictionary } from './types';
import { AVAILABLE_LOCALES, DEFAULT_LOCALE, LOCALE_DIRECTIONS, STORAGE_KEY } from './constants';
import { dictionaries } from '../locales';

export function isRTL(locale: Locale): boolean {
  return LOCALE_DIRECTIONS[locale] === 'rtl';
}

export function directionOf(locale: Locale): Direction {
  return LOCALE_DIRECTIONS[locale] || 'rtl';
}

export function isValidLocale(value: unknown): value is Locale {
  return typeof value === 'string' && AVAILABLE_LOCALES.includes(value as Locale);
}

export function getStoredLocale(): Locale {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (isValidLocale(stored)) {
        return stored;
      }
    }
  } catch {
    // localStorage access denied or unavailable
  }
  return DEFAULT_LOCALE;
}

export function setStoredLocale(locale: Locale): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, locale);
    }
  } catch {
    // localStorage access denied or unavailable
  }
}

export function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params || Object.keys(params).length === 0) {
    return template;
  }
  return template.replace(/\{(\w+)\}|\{\{(\w+)\}\}/g, (match, p1, p2) => {
    const key = p1 || p2;
    return key in params ? String(params[key]) : match;
  });
}

export function resolveTranslation(
  key: TranslationKey | string,
  locale: Locale,
  params?: Record<string, string | number>,
  customDicts?: Record<Locale, Partial<TranslationDictionary>>
): string {
  const dictSource = customDicts || dictionaries;
  const targetDict = dictSource[locale] as Partial<TranslationDictionary> | undefined;
  let text = targetDict ? targetDict[key as TranslationKey] : undefined;

  if (text === undefined) {
    // Dev warning
    if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
      console.warn(`[i18n] Missing translation key "${key}" for locale "${locale}"`);
    }

    // Fallback to DEFAULT_LOCALE ('ar')
    const fallbackDict = dictSource[DEFAULT_LOCALE] as Partial<TranslationDictionary> | undefined;
    text = fallbackDict ? fallbackDict[key as TranslationKey] : undefined;

    // If still missing, return key itself
    if (text === undefined) {
      text = key;
    }
  }

  return interpolate(text, params);
}
