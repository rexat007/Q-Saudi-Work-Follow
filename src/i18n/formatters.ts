import { Locale } from './types';

export function formatNumber(
  value: number,
  locale: Locale,
  options?: Intl.NumberFormatOptions
): string {
  try {
    return new Intl.NumberFormat(locale, options).format(value);
  } catch {
    return String(value);
  }
}

export function formatDate(
  date: Date | number | string,
  locale: Locale,
  options?: Intl.DateTimeFormatOptions
): string {
  try {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) {
      return String(date);
    }
    const defaultOptions: Intl.DateTimeFormatOptions = options || {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    };
    return new Intl.DateTimeFormat(locale, defaultOptions).format(d);
  } catch {
    return String(date);
  }
}

export function formatCurrency(
  amount: number,
  locale: Locale,
  currency: string = 'SAR',
  options?: Intl.NumberFormatOptions
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
      ...options,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}
