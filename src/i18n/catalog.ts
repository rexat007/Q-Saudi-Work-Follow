import type {LocaleResource} from '../locales/types';

export type TranslationLeaf<T> = T extends string ? '' : {
  [K in keyof T & string]: `${K}${TranslationLeaf<T[K]> extends '' ? '' : `.${TranslationLeaf<T[K]>}`}`
}[keyof T & string];

export type TranslationKey = TranslationLeaf<LocaleResource>;

export const LOCALE_CODES = ['ar', 'en', 'ur'] as const;
export type SupportedLocale = typeof LOCALE_CODES[number];

export function isTranslationKey(value: string): value is TranslationKey {
  return value.length > 0 && value.split('.').every(Boolean);
}
