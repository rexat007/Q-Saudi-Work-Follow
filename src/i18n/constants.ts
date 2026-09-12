import { Locale, Direction } from './types';

export const AVAILABLE_LOCALES: Locale[] = ['ar', 'en', 'ur'];

export const DEFAULT_LOCALE: Locale = 'ar';

export const LOCALE_NAMES: Record<Locale, string> = {
  ar: 'العربية',
  en: 'English',
  ur: 'اردو',
};

export const LOCALE_DIRECTIONS: Record<Locale, Direction> = {
  ar: 'rtl',
  en: 'ltr',
  ur: 'rtl',
};

export const STORAGE_KEY = 'q_saudi_app_locale';
