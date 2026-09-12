export type Locale = 'ar' | 'en' | 'ur';

export type Direction = 'rtl' | 'ltr';

export type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

export type FoundationTranslationKey =
  | 'shared.actions.save'
  | 'shared.actions.cancel'
  | 'shared.actions.confirm'
  | 'shared.actions.close'
  | 'shared.actions.delete'
  | 'shared.actions.edit'
  | 'shared.status.loading'
  | 'shared.status.error'
  | 'shared.status.success'
  | 'shared.units.kg'
  | 'shared.units.ton'
  | 'shared.units.sar'
  | 'navigation.language'
  | 'navigation.language.ar'
  | 'navigation.language.en'
  | 'navigation.language.ur'
  | 'example.count';

export type TranslationKey = FoundationTranslationKey | (string & {});

export type TranslationDictionary = Record<string, string>;

export interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  direction: Direction;
  languageName: string;
  isRTL: boolean;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatDate: (date: Date | number | string, options?: Intl.DateTimeFormatOptions) => string;
  formatCurrency: (amount: number, currency?: string, options?: Intl.NumberFormatOptions) => string;
}

export type PluralForms = Partial<Record<PluralCategory, string>> & {
  other: string;
};
