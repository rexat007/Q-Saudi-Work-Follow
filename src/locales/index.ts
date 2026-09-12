import { Locale, TranslationDictionary } from '../i18n/types';
import { arTranslations } from './ar';
import { enTranslations } from './en';
import { urTranslations } from './ur';

export const dictionaries: Record<Locale, TranslationDictionary> = {
  ar: arTranslations,
  en: enTranslations,
  ur: urTranslations,
};

export { arTranslations, enTranslations, urTranslations };
