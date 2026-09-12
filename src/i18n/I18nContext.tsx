import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { Locale, I18nContextValue, TranslationKey } from './types';
import { DEFAULT_LOCALE, LOCALE_NAMES } from './constants';
import { isRTL, directionOf, getStoredLocale, setStoredLocale, resolveTranslation } from './utils';
import { formatNumber, formatDate, formatCurrency } from './formatters';

export const I18nContext = createContext<I18nContextValue | null>(null);

export interface I18nProviderProps {
  children: React.ReactNode;
  initialLocale?: Locale;
}

export function I18nProvider({ children, initialLocale }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (initialLocale) {
      return initialLocale;
    }
    return getStoredLocale();
  });

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    setStoredLocale(newLocale);
  }, []);

  // Synchronize document.documentElement attributes
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const dir = directionOf(locale);
      document.documentElement.lang = locale;
      document.documentElement.dir = dir;
    }
  }, [locale]);

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) => {
      return resolveTranslation(key, locale, params);
    },
    [locale]
  );

  const contextValue: I18nContextValue = useMemo(() => {
    const direction = directionOf(locale);
    return {
      locale,
      setLocale,
      t,
      direction,
      languageName: LOCALE_NAMES[locale] || LOCALE_NAMES[DEFAULT_LOCALE],
      isRTL: isRTL(locale),
      formatNumber: (value, options) => formatNumber(value, locale, options),
      formatDate: (date, options) => formatDate(date, locale, options),
      formatCurrency: (amount, currency, options) => formatCurrency(amount, locale, currency, options),
    };
  }, [locale, setLocale, t]);

  return (
    <I18nContext.Provider value={contextValue}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
