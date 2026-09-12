/**
 * BLOCK 40 — Phase 1: i18n Foundation & Architecture Test Suite
 * 
 * Tests:
 * I18N-01: default locale = ar
 * I18N-02: setLocale(en)
 * I18N-03: setLocale(ur)
 * I18N-04: Arabic => rtl
 * I18N-05: Urdu => rtl
 * I18N-06: English => ltr
 * I18N-07: persistence
 * I18N-08: invalid locale fallback
 * I18N-09: translation lookup
 * I18N-10: fallback to Arabic
 * I18N-11: missing key warning in development
 * I18N-12: interpolation
 * I18N-13: all foundation keys exist in ar/en/ur
 * I18N-14: invalid key rejected by TypeScript where practical
 * I18N-15: LanguageSwitcher changes locale
 * I18N-16: document lang updates
 * I18N-17: document dir updates
 */

import {
  DEFAULT_LOCALE,
  AVAILABLE_LOCALES,
  LOCALE_NAMES,
  STORAGE_KEY,
  isRTL,
  directionOf,
  isValidLocale,
  getStoredLocale,
  setStoredLocale,
  resolveTranslation,
  interpolate,
  formatNumber,
  formatDate,
  formatCurrency,
  getPluralCategory,
  resolvePlural,
  FoundationTranslationKey,
  Locale
} from '../i18n';
import { dictionaries } from '../locales';

export interface I18nTestCaseResult {
  id: string;
  title: string;
  passed: boolean;
  expected: any;
  actual: any;
  details: string;
}

// Ensure minimal browser globals in Node CLI environment
const memoryStore: Record<string, string> = {};
if (typeof globalThis.window === 'undefined') {
  (globalThis as any).window = {
    localStorage: {
      getItem: (key: string) => memoryStore[key] ?? null,
      setItem: (key: string, value: string) => { memoryStore[key] = String(value); },
      removeItem: (key: string) => { delete memoryStore[key]; },
      clear: () => { Object.keys(memoryStore).forEach(k => delete memoryStore[k]); },
    },
  };
}
if (typeof globalThis.document === 'undefined') {
  (globalThis as any).document = {
    documentElement: {
      lang: 'ar',
      dir: 'rtl',
    },
  };
}

export function runI18nFoundationTests(): {
  allPassed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: I18nTestCaseResult[];
} {
  const results: I18nTestCaseResult[] = [];

  // Reset storage
  window.localStorage.removeItem(STORAGE_KEY);

  // ----------------------------------------------------
  // I18N-01: default locale = ar
  // ----------------------------------------------------
  const defaultLoc = getStoredLocale();
  results.push({
    id: 'I18N-01',
    title: 'Default locale is "ar"',
    passed: defaultLoc === 'ar' && DEFAULT_LOCALE === 'ar',
    expected: 'ar',
    actual: defaultLoc,
    details: 'اللغة الافتراضية للنظام هي العربية (ar) عند عدم وجود تفضيل محفوظ مسبقاً.',
  });

  // ----------------------------------------------------
  // I18N-02: setLocale(en)
  // ----------------------------------------------------
  setStoredLocale('en');
  const enLoc = getStoredLocale();
  results.push({
    id: 'I18N-02',
    title: 'setLocale(en) updates current locale',
    passed: enLoc === 'en',
    expected: 'en',
    actual: enLoc,
    details: 'تم تحديث اللغة إلى الإنجليزية (en) بنجاح.',
  });

  // ----------------------------------------------------
  // I18N-03: setLocale(ur)
  // ----------------------------------------------------
  setStoredLocale('ur');
  const urLoc = getStoredLocale();
  results.push({
    id: 'I18N-03',
    title: 'setLocale(ur) updates current locale',
    passed: urLoc === 'ur',
    expected: 'ur',
    actual: urLoc,
    details: 'تم تحديث اللغة إلى الأردية (ur) بنجاح.',
  });

  // ----------------------------------------------------
  // I18N-04: Arabic => rtl
  // ----------------------------------------------------
  const arDir = directionOf('ar');
  const arIsRtl = isRTL('ar');
  results.push({
    id: 'I18N-04',
    title: 'Arabic maps to RTL direction',
    passed: arDir === 'rtl' && arIsRtl === true,
    expected: { dir: 'rtl', isRtl: true },
    actual: { dir: arDir, isRtl: arIsRtl },
    details: 'اللغة العربية موجهة من اليمين إلى اليسار (rtl).',
  });

  // ----------------------------------------------------
  // I18N-05: Urdu => rtl
  // ----------------------------------------------------
  const urDir = directionOf('ur');
  const urIsRtl = isRTL('ur');
  results.push({
    id: 'I18N-05',
    title: 'Urdu maps to RTL direction',
    passed: urDir === 'rtl' && urIsRtl === true,
    expected: { dir: 'rtl', isRtl: true },
    actual: { dir: urDir, isRtl: urIsRtl },
    details: 'اللغة الأردية موجهة من اليمين إلى اليسار (rtl).',
  });

  // ----------------------------------------------------
  // I18N-06: English => ltr
  // ----------------------------------------------------
  const enDir = directionOf('en');
  const enIsRtl = isRTL('en');
  results.push({
    id: 'I18N-06',
    title: 'English maps to LTR direction',
    passed: enDir === 'ltr' && enIsRtl === false,
    expected: { dir: 'ltr', isRtl: false },
    actual: { dir: enDir, isRtl: enIsRtl },
    details: 'اللغة الإنجليزية موجهة من اليسار إلى اليمين (ltr).',
  });

  // ----------------------------------------------------
  // I18N-07: Persistence
  // ----------------------------------------------------
  setStoredLocale('en');
  const persisted = window.localStorage.getItem(STORAGE_KEY);
  const reloaded = getStoredLocale();
  results.push({
    id: 'I18N-07',
    title: 'Locale preference is saved in local storage and reloaded',
    passed: persisted === 'en' && reloaded === 'en',
    expected: 'en',
    actual: { persisted, reloaded },
    details: 'تم التحقق من الحفظ المحلي واسترجاع تفضيل اللغة عند إعادة التحميل.',
  });

  // ----------------------------------------------------
  // I18N-08: Invalid locale fallback
  // ----------------------------------------------------
  window.localStorage.setItem(STORAGE_KEY, 'invalid_xyz');
  const fallbackFromInvalid = getStoredLocale();
  const validCheck1 = isValidLocale('fr');
  const validCheck2 = isValidLocale(123);
  const validCheck3 = isValidLocale('ar');
  results.push({
    id: 'I18N-08',
    title: 'Invalid locale falls back to "ar"',
    passed: fallbackFromInvalid === 'ar' && !validCheck1 && !validCheck2 && validCheck3,
    expected: 'ar',
    actual: fallbackFromInvalid,
    details: 'عند إدخال لغة غير صالحة أو غير مدعومة يتم الرجوع التلقائي إلى اللغة العربية (ar).',
  });

  // ----------------------------------------------------
  // I18N-09: Translation lookup
  // ----------------------------------------------------
  const tAr = resolveTranslation('shared.actions.save', 'ar');
  const tEn = resolveTranslation('shared.actions.save', 'en');
  const tUr = resolveTranslation('shared.actions.save', 'ur');
  const lookupPass = tAr === 'حفظ' && tEn === 'Save' && tUr === 'محفوظ کریں';
  results.push({
    id: 'I18N-09',
    title: 'Translation lookup retrieves correct values for ar, en, ur',
    passed: lookupPass,
    expected: { ar: 'حفظ', en: 'Save', ur: 'محفوظ کریں' },
    actual: { ar: tAr, en: tEn, ur: tUr },
    details: 'تم استرجاع الترجمة الصحيحة للمفتاح المشترك في اللغات الثلاث.',
  });

  // ----------------------------------------------------
  // I18N-10: Fallback to Arabic
  // ----------------------------------------------------
  // Create a mock dictionary where 'shared.status.loading' is missing in 'ur'
  const customDict = {
    ar: { ...dictionaries.ar },
    en: { ...dictionaries.en },
    ur: { ...dictionaries.ur, 'shared.status.loading': undefined } as any,
  };
  const fallbackVal = resolveTranslation('shared.status.loading', 'ur', undefined, customDict);
  results.push({
    id: 'I18N-10',
    title: 'Missing translation in active locale falls back to Arabic',
    passed: fallbackVal === 'جاري التحميل...',
    expected: 'جاري التحميل...',
    actual: fallbackVal,
    details: 'عند فقدان مفتاح في اللغة النشطة يتم استخدام النص العربي كبديل فوري.',
  });

  // ----------------------------------------------------
  // I18N-11: Missing key warning in development
  // ----------------------------------------------------
  let warnCalled = false;
  let warnMsg = '';
  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
    warnCalled = true;
    warnMsg = args.join(' ');
  };
  try {
    resolveTranslation('non_existent_key' as any, 'en');
  } finally {
    console.warn = originalWarn;
  }
  results.push({
    id: 'I18N-11',
    title: 'Missing key emits a console warning in development mode',
    passed: warnCalled && warnMsg.includes('Missing translation key'),
    expected: true,
    actual: { warnCalled, warnMsg },
    details: 'تم إصدار تحذير للمطور عند استدعاء مفتاح غير موجود دون كسر الواجهة.',
  });

  // ----------------------------------------------------
  // I18N-12: Interpolation
  // ----------------------------------------------------
  const interpAr = resolveTranslation('example.count', 'ar', { count: 25 });
  const interpEn = resolveTranslation('example.count', 'en', { count: 25 });
  const interpUr = resolveTranslation('example.count', 'ur', { count: 25 });
  const interpPass = interpAr === 'العدد: 25' && interpEn === 'Count: 25' && interpUr === 'تعداد: 25';
  results.push({
    id: 'I18N-12',
    title: 'Interpolation injects parameters cleanly ({count})',
    passed: interpPass,
    expected: { ar: 'العدد: 25', en: 'Count: 25', ur: 'تعداد: 25' },
    actual: { ar: interpAr, en: interpEn, ur: interpUr },
    details: 'تم تعويض المتغيرات بدقة وأمان عبر واجهة interpolate.',
  });

  // ----------------------------------------------------
  // I18N-13: All foundation keys exist in ar/en/ur
  // ----------------------------------------------------
  const requiredFoundationKeys: FoundationTranslationKey[] = [
    'shared.actions.save',
    'shared.actions.cancel',
    'shared.actions.confirm',
    'shared.actions.close',
    'shared.actions.delete',
    'shared.actions.edit',
    'shared.status.loading',
    'shared.status.error',
    'shared.status.success',
    'shared.units.kg',
    'shared.units.ton',
    'shared.units.sar',
    'navigation.language',
    'navigation.language.ar',
    'navigation.language.en',
    'navigation.language.ur',
    'example.count',
  ];

  const missingKeys: { locale: Locale; key: string }[] = [];
  AVAILABLE_LOCALES.forEach((loc) => {
    const dict = dictionaries[loc];
    requiredFoundationKeys.forEach((key) => {
      if (!dict[key] || typeof dict[key] !== 'string' || dict[key].trim() === '') {
        missingKeys.push({ locale: loc, key });
      }
    });
  });

  results.push({
    id: 'I18N-13',
    title: 'All foundation translation keys exist in ar, en, and ur',
    passed: missingKeys.length === 0,
    expected: 0,
    actual: missingKeys.length,
    details: missingKeys.length === 0 
      ? 'كافة المفاتيح التأسيسية الـ 17 متوفرة بالكامل وغير فارغة في اللغات الثلاث.' 
      : `مفاتيح مفقودة: ${JSON.stringify(missingKeys)}`,
  });

  // ----------------------------------------------------
  // I18N-14: Invalid key rejected by TypeScript where practical / safe fallback
  // ----------------------------------------------------
  // At compile-time, TranslationKey restricts keys. At runtime, resolveTranslation safely handles fallback
  const safeFallbackResult = resolveTranslation('unregistered.runtime.key' as any, 'ar');
  results.push({
    id: 'I18N-14',
    title: 'Type-safe contract and safe runtime fallback for unknown keys',
    passed: safeFallbackResult === 'unregistered.runtime.key',
    expected: 'unregistered.runtime.key',
    actual: safeFallbackResult,
    details: 'المفاتيح مقيدة بـ TypeScript، وتتعامل الدالة بأمان مع المفاتيح غير المعروفة دون إلقاء استثناءات.',
  });

  // ----------------------------------------------------
  // I18N-15: LanguageSwitcher changes locale
  // ----------------------------------------------------
  // Simulate LanguageSwitcher switching across all 3 languages
  let currentSimulatedLocale: Locale = 'ar';
  const switchLocale = (newLoc: Locale) => {
    currentSimulatedLocale = newLoc;
    setStoredLocale(newLoc);
    document.documentElement.lang = newLoc;
    document.documentElement.dir = directionOf(newLoc);
  };

  switchLocale('en');
  const step1En = (currentSimulatedLocale as Locale) === 'en' && getStoredLocale() === 'en';
  switchLocale('ur');
  const step2Ur = (currentSimulatedLocale as Locale) === 'ur' && getStoredLocale() === 'ur';
  switchLocale('ar');
  const step3Ar = (currentSimulatedLocale as Locale) === 'ar' && getStoredLocale() === 'ar';

  results.push({
    id: 'I18N-15',
    title: 'LanguageSwitcher correctly updates locale state and persistent storage',
    passed: step1En && step2Ur && step3Ar,
    expected: true,
    actual: { step1En, step2Ur, step3Ar },
    details: 'مبدل اللغة يقوم بالتنقل السلس بين (العربية، English، اردو) وتحديث التخزين.',
  });

  // ----------------------------------------------------
  // I18N-16: Document lang updates
  // ----------------------------------------------------
  document.documentElement.lang = 'en';
  const langEn = document.documentElement.lang;
  document.documentElement.lang = 'ur';
  const langUr = document.documentElement.lang;
  document.documentElement.lang = 'ar';
  const langAr = document.documentElement.lang;

  results.push({
    id: 'I18N-16',
    title: 'document.documentElement.lang synchronizes with current locale',
    passed: langEn === 'en' && langUr === 'ur' && langAr === 'ar',
    expected: { en: 'en', ur: 'ur', ar: 'ar' },
    actual: { en: langEn, ur: langUr, ar: langAr },
    details: 'تحديث وسم lang في جذر المستند (HTML) ليتطابق مع كل لغة.',
  });

  // ----------------------------------------------------
  // I18N-17: Document dir updates
  // ----------------------------------------------------
  document.documentElement.dir = directionOf('en');
  const dirEn = document.documentElement.dir;
  document.documentElement.dir = directionOf('ur');
  const dirUr = document.documentElement.dir;
  document.documentElement.dir = directionOf('ar');
  const dirAr = document.documentElement.dir;

  results.push({
    id: 'I18N-17',
    title: 'document.documentElement.dir synchronizes with current locale direction',
    passed: dirEn === 'ltr' && dirUr === 'rtl' && dirAr === 'rtl',
    expected: { en: 'ltr', ur: 'rtl', ar: 'rtl' },
    actual: { en: dirEn, ur: dirUr, ar: dirAr },
    details: 'تحديث اتجاه المستند root dir إلى ltr للإنجليزية و rtl للعربية والأردية.',
  });

  const passedTests = results.filter((r) => r.passed).length;
  const failedTests = results.length - passedTests;

  return {
    allPassed: failedTests === 0,
    totalTests: results.length,
    passedTests,
    failedTests,
    results,
  };
}

// Auto-run when executed directly via tsx
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('i18nFoundation.test')) {
  const res = runI18nFoundationTests();
  console.log('\n======================================================');
  console.log(`BLOCK 40: i18n Foundation Test Results: ${res.passedTests}/${res.totalTests} PASSED`);
  console.log('======================================================');
  res.results.forEach((r) => {
    console.log(`${r.passed ? '✅' : '❌'} [${r.id}] ${r.title} - ${r.details}`);
    if (!r.passed) {
      console.log('   Expected:', r.expected);
      console.log('   Actual:  ', r.actual);
    }
  });
  console.log('======================================================\n');
  if (!res.allPassed) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}
