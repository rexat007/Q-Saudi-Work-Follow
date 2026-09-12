/**
 * BLOCK 42 — Translation Catalog Constants & Foundation Mappings
 */

import { SemanticCategory } from './catalog.types';
import { ArabicPluralForm } from './translationCatalog.types';

/**
 * The 12 mandatory domain terminology review queues specified in BLOCK 42
 */
export const MANDATORY_DOMAIN_QUEUES: SemanticCategory[] = [
  'trips',
  'loading',
  'unloading',
  'weighbridge',
  'imports',
  'entityResolution',
  'pricing',
  'reports',
  'security',
  'offline',
  'exceptions',
  'legacyMigration',
];

/**
 * Standard 6 Arabic plural forms compliant with Intl.PluralRules
 */
export const ARABIC_PLURAL_FORMS: ArabicPluralForm[] = ['zero', 'one', 'two', 'few', 'many', 'other'];

/**
 * High-confidence Phase 1 Foundation Vocabulary
 * Entries matching these keys and Arabic texts can be safely populated with canonical translations
 */
export interface FoundationTranslationMapping {
  key: string;
  ar: string;
  en: string;
  ur: string;
  description: string;
}

export const FOUNDATION_VOCABULARY: Record<string, FoundationTranslationMapping> = {
  'shared.actions.save': {
    key: 'shared.actions.save',
    ar: 'حفظ',
    en: 'Save',
    ur: 'محفوظ کریں',
    description: 'Generic action button to persist data changes',
  },
  'shared.actions.cancel': {
    key: 'shared.actions.cancel',
    ar: 'إلغاء',
    en: 'Cancel',
    ur: 'منسوخ کریں',
    description: 'Generic action button to dismiss a modal, form, or dialog',
  },
  'shared.actions.confirm': {
    key: 'shared.actions.confirm',
    ar: 'تأكيد',
    en: 'Confirm',
    ur: 'تصدیق کریں',
    description: 'Generic action button to confirm a dialog or decision',
  },
  'shared.actions.close': {
    key: 'shared.actions.close',
    ar: 'إغلاق',
    en: 'Close',
    ur: 'بند کریں',
    description: 'Generic action button to close an overlay, drawer, or modal',
  },
  'shared.actions.delete': {
    key: 'shared.actions.delete',
    ar: 'حذف',
    en: 'Delete',
    ur: 'حذف کریں',
    description: 'Generic action button to permanently remove a record',
  },
  'shared.actions.edit': {
    key: 'shared.actions.edit',
    ar: 'تعديل',
    en: 'Edit',
    ur: 'ترمیم کریں',
    description: 'Generic action button to enter editing mode',
  },
  'shared.status.loading': {
    key: 'shared.status.loading',
    ar: 'جاري التحميل...',
    en: 'Loading...',
    ur: 'لوڈ ہو رہا ہے...',
    description: 'Generic loading indicator text',
  },
  'shared.status.error': {
    key: 'shared.status.error',
    ar: 'حدث خطأ',
    en: 'An error occurred',
    ur: 'ایک خرابی پیش آگئی',
    description: 'Generic error notification alert',
  },
  'shared.status.success': {
    key: 'shared.status.success',
    ar: 'تمت العملية بنجاح',
    en: 'Operation completed successfully',
    ur: 'آپریشن کامیابی سے مکمل ہوا',
    description: 'Generic operation success feedback',
  },
  'shared.units.kg': {
    key: 'shared.units.kg',
    ar: 'كجم',
    en: 'kg',
    ur: 'کلوگرام',
    description: 'Standard unit of mass: Kilogram',
  },
  'shared.units.ton': {
    key: 'shared.units.ton',
    ar: 'طن',
    en: 'ton',
    ur: 'ٹن',
    description: 'Standard unit of mass: Metric Ton',
  },
  'shared.units.sar': {
    key: 'shared.units.sar',
    ar: 'ر.س',
    en: 'SAR',
    ur: 'سعودی ریال',
    description: 'Standard currency: Saudi Riyal',
  },
  'navigation.language': {
    key: 'navigation.language',
    ar: 'اللغة',
    en: 'Language',
    ur: 'زبان',
    description: 'Language selector menu label',
  },
  'navigation.language.ar': {
    key: 'navigation.language.ar',
    ar: 'العربية',
    en: 'Arabic',
    ur: 'عربی',
    description: 'Arabic language option label',
  },
  'navigation.language.en': {
    key: 'navigation.language.en',
    ar: 'الإنجليزية',
    en: 'English',
    ur: 'انگریزی',
    description: 'English language option label',
  },
  'navigation.language.ur': {
    key: 'navigation.language.ur',
    ar: 'الأردية',
    en: 'Urdu',
    ur: 'اردو',
    description: 'Urdu language option label',
  },
  'example.count': {
    key: 'example.count',
    ar: 'العدد: {count}',
    en: 'Count: {count}',
    ur: 'تعداد: {count}',
    description: 'Interpolation parameter count label',
  },
};

/**
 * Regex for detecting interpolation placeholders {param} or {{param}}
 */
export const INTERPOLATION_REGEX = /\{(\w+)\}|\{\{(\w+)\}\}/g;

/**
 * Regular expressions indicating presence of quantities requiring pluralization
 */
export const PLURAL_DETECTION_PATTERNS = [
  /\{count\}/i,
  /\{total\}/i,
  /\{quantity\}/i,
  /(?:^|[^\u0600-\u06FF\w])(عدد|إجمالي|كمية)(?:$|[^\u0600-\u06FF\w])/,
  /(?:^|[^\u0600-\u06FF\w])(رحلة|رحلات)(?:$|[^\u0600-\u06FF\w])/,
  /(?:^|[^\u0600-\u06FF\w])(شاحنة|شاحنات)(?:$|[^\u0600-\u06FF\w])/,
  /(?:^|[^\u0600-\u06FF\w])(سائق|سائقين|سائقون)(?:$|[^\u0600-\u06FF\w])/,
  /(?:^|[^\u0600-\u06FF\w])(مادة|مواد)(?:$|[^\u0600-\u06FF\w])/,
  /(?:^|[^\u0600-\u06FF\w])(طن|أطنان)(?:$|[^\u0600-\u06FF\w])/,
  /(?:^|[^\u0600-\u06FF\w])(تذكرة|تذاكر)(?:$|[^\u0600-\u06FF\w])/,
  /(?:^|[^\u0600-\u06FF\w])(يوم|أيام)(?:$|[^\u0600-\u06FF\w])/,
  /(?:^|[^\u0600-\u06FF\w])(ساعة|ساعات)(?:$|[^\u0600-\u06FF\w])/,
  /(?:^|[^\u0600-\u06FF\w])(دقيقة|دقائق)(?:$|[^\u0600-\u06FF\w])/,
  /(?:^|[^\u0600-\u06FF\w])(سجل|سجلات)(?:$|[^\u0600-\u06FF\w])/,
];
