import type {LocaleResource} from '../locales/types';

export type TranslationKey<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${TranslationKey<T[K]>}`
}[keyof T & string];

export type AppTranslationKey = TranslationKey<LocaleResource>;
export type SupportedLocale = 'ar' | 'en' | 'ur';

export const LOCALE_CODES = ['ar', 'en', 'ur'] as const satisfies readonly SupportedLocale[];
