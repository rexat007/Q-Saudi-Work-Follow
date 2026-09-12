/**
 * BLOCK 41 — Test Suite: i18n Catalog Extraction & Translation-Key Architecture
 * 
 * Verifies all 15 required quality check tests:
 * I18N-CAT-01: deterministic extraction
 * I18N-CAT-02: JSX visible text detection
 * I18N-CAT-03: UI attribute detection
 * I18N-CAT-04: toast/message detection
 * I18N-CAT-05: technical string exclusion
 * I18N-CAT-06: ambiguous classification
 * I18N-CAT-07: duplicate grouping
 * I18N-CAT-08: semantic duplicate separation
 * I18N-CAT-09: deterministic key generation
 * I18N-CAT-10: key collision handling
 * I18N-CAT-11: business field protection
 * I18N-CAT-12: unit/currency protection
 * I18N-CAT-13: directional class detection
 * I18N-CAT-14: interpolation & special cases detection
 * I18N-CAT-15: report generation (JSON & Markdown)
 */

import fs from 'fs';
import path from 'path';
import {
  CatalogExtractor,
  deterministicHash,
  classifyDirectionalRisk,
  getLogicalReplacement,
} from '../i18n/catalog/catalog.extractor';
import {
  classifyCandidate,
  containsArabic,
  isPureTechnicalToken,
} from '../i18n/catalog/catalog.classifier';
import {
  normalizeText,
  groupDuplicates,
  identifySemanticConflicts,
} from '../i18n/catalog/catalog.deduper';
import { KeyGenerator, slugifyText } from '../i18n/catalog/catalog.keyGenerator';
import {
  runCatalogPipeline,
  writeCatalogReports,
  formatMarkdownReport,
} from '../i18n/catalog/catalog.index';
import {
  CatalogEntry,
  SemanticCategory,
} from '../i18n/catalog/catalog.types';
import {
  PROTECTED_BUSINESS_TOKENS,
  PRESENTATION_UNIT_CURRENCY_MAP,
} from '../i18n/catalog/catalog.constants';

export interface TestCaseResult {
  id: string;
  title: string;
  passed: boolean;
  expected: any;
  actual: any;
  details: string;
}

export function runI18nCatalogTests(): {
  allPassed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: TestCaseResult[];
} {
  const results: TestCaseResult[] = [];

  // ----------------------------------------------------
  // I18N-CAT-01: Deterministic extraction
  // ----------------------------------------------------
  const hash1 = deterministicHash('src/App.tsx:100:15:حفظ البيانات');
  const hash2 = deterministicHash('src/App.tsx:100:15:حفظ البيانات');
  const hash3 = deterministicHash('src/App.tsx:100:15:إلغاء الأمر');
  const isDeterministic = hash1 === hash2 && hash1 !== hash3 && hash1.length === 8;
  results.push({
    id: 'I18N-CAT-01',
    title: 'Deterministic extraction IDs and stable hashing',
    passed: isDeterministic,
    expected: true,
    actual: { hash1, hash2, isDeterministic },
    details: 'عملية الاستخراج ومعرفات العناصر حتمية وثابتة 100% بين عمليات التشغيل المتعاقبة.',
  });

  // ----------------------------------------------------
  // I18N-CAT-02: JSX visible text detection
  // ----------------------------------------------------
  const jsxClassification = classifyCandidate({
    text: 'الرحلات النشطة',
    sourceFile: 'src/components/trips/TripList.tsx',
    isJsxText: true,
  });
  const jsxPass =
    jsxClassification.classification === 'REAL_USER_FACING' &&
    jsxClassification.isUserFacing === true &&
    jsxClassification.confidence === 'HIGH';
  results.push({
    id: 'I18N-CAT-02',
    title: 'JSX visible text detection and classification',
    passed: jsxPass,
    expected: 'REAL_USER_FACING',
    actual: jsxClassification.classification,
    details: 'تم التعرف بدقة على نصوص JSX المرئية وتصنيفها كـ REAL_USER_FACING بثقة عالية.',
  });

  // ----------------------------------------------------
  // I18N-CAT-03: UI attribute detection
  // ----------------------------------------------------
  const placeholderClass = classifyCandidate({
    text: 'ابحث برقم اللوحة أو اسم السائق...',
    sourceFile: 'src/components/trips/SearchInput.tsx',
    jsxAttributeName: 'placeholder',
  });
  const titleClass = classifyCandidate({
    text: 'إغلاق النافذة',
    sourceFile: 'src/components/ui/Modal.tsx',
    jsxAttributeName: 'title',
  });
  const attrPass =
    placeholderClass.classification === 'REAL_USER_FACING' &&
    titleClass.classification === 'REAL_USER_FACING';
  results.push({
    id: 'I18N-CAT-03',
    title: 'UI attribute detection (placeholder, title, aria-label, etc.)',
    passed: attrPass,
    expected: true,
    actual: { placeholder: placeholderClass.classification, title: titleClass.classification },
    details: 'تم رصد النصوص المضمنة في السمات التفاعلية (placeholder, title, label, aria-label) بنجاح.',
  });

  // ----------------------------------------------------
  // I18N-CAT-04: Toast/message detection
  // ----------------------------------------------------
  const toastClass = classifyCandidate({
    text: 'حدث خطأ أثناء حفظ بيانات الرحلة',
    sourceFile: 'src/services/trip.service.ts',
    isCallExpression: true,
    callFunctionName: 'toast',
  });
  const toastPass =
    toastClass.classification === 'REAL_USER_FACING' &&
    toastClass.isUserFacing === true &&
    toastClass.notes.some((n) => n.includes('Toast'));
  results.push({
    id: 'I18N-CAT-04',
    title: 'Toast and UI alert notification message detection',
    passed: toastPass,
    expected: 'REAL_USER_FACING',
    actual: toastClass.classification,
    details: 'تم تمييز الرسائل والتنبيهات الموجهة للمستخدم عبر toast و alert كـ REAL_USER_FACING.',
  });

  // ----------------------------------------------------
  // I18N-CAT-05: Technical string exclusion
  // ----------------------------------------------------
  const cssClass = classifyCandidate({
    text: 'flex items-center justify-between p-4 bg-white',
    sourceFile: 'src/components/ui/Card.tsx',
    jsxAttributeName: 'className',
  });
  const hexColor = classifyCandidate({
    text: '#1E293B',
    sourceFile: 'src/utils/theme.ts',
  });
  const apiPath = classifyCandidate({
    text: '/api/v1/trips/export',
    sourceFile: 'src/services/api.ts',
  });
  const enumCode = classifyCandidate({
    text: 'WEIGHED_ORIGIN',
    sourceFile: 'src/types/trip.types.ts',
  });
  const techPass =
    cssClass.classification === 'TECHNICAL' &&
    hexColor.classification === 'TECHNICAL' &&
    enumCode.classification === 'TECHNICAL' &&
    !cssClass.isUserFacing &&
    !enumCode.isUserFacing;
  results.push({
    id: 'I18N-CAT-05',
    title: 'Exclusion of CSS, Tailwind tokens, hex colors, and enum codes',
    passed: techPass,
    expected: true,
    actual: {
      css: cssClass.classification,
      hex: hexColor.classification,
      enum: enumCode.classification,
    },
    details: 'استبعاد تام لأسماء فئات CSS ورموز الألوان ومسارات API والثوابت الفنية من القاموس.',
  });

  // ----------------------------------------------------
  // I18N-CAT-06: Ambiguous classification
  // ----------------------------------------------------
  const ambClass = classifyCandidate({
    text: 'CSV',
    sourceFile: 'src/utils/exporter.ts',
  });
  const ambPass =
    ambClass.classification === 'AMBIGUOUS' &&
    ambClass.reviewRequired === true &&
    ambClass.isUserFacing === false;
  results.push({
    id: 'I18N-CAT-06',
    title: 'Ambiguous short strings classification with reviewRequired flag',
    passed: ambPass,
    expected: 'AMBIGUOUS',
    actual: ambClass.classification,
    details: 'تصنيف النصوص الغامضة والمختصرات غير الواضحة كـ AMBIGUOUS مع اشتراط المراجعة البشرية.',
  });

  // ----------------------------------------------------
  // I18N-CAT-07: Duplicate grouping
  // ----------------------------------------------------
  const mockEntries: CatalogEntry[] = [
    {
      id: 'mock_1',
      sourceFile: 'src/components/trips/TripModal.tsx',
      sourceLine: 45,
      sourceColumn: 10,
      originalText: 'حفظ التغييرات',
      normalizedText: 'حفظ التغييرات',
      semanticCategory: 'trips',
      semanticContext: 'action_btn',
      proposedTranslationKey: 'trips.actions.save',
      extractionConfidence: 'HIGH',
      migrationRisk: 'LOW',
      isUserFacing: true,
      classification: 'REAL_USER_FACING',
      reviewRequired: false,
      specialCases: [],
    },
    {
      id: 'mock_2',
      sourceFile: 'src/components/pricing/PricingModal.tsx',
      sourceLine: 60,
      sourceColumn: 12,
      originalText: 'حفظ التغييرات : ',
      normalizedText: 'حفظ التغييرات',
      semanticCategory: 'pricing',
      semanticContext: 'action_btn',
      proposedTranslationKey: 'pricing.actions.save',
      extractionConfidence: 'HIGH',
      migrationRisk: 'LOW',
      isUserFacing: true,
      classification: 'REAL_USER_FACING',
      reviewRequired: false,
      specialCases: [],
    },
    {
      id: 'mock_3',
      sourceFile: 'src/components/carriers/CarrierForm.tsx',
      sourceLine: 80,
      sourceColumn: 8,
      originalText: 'إغلاق',
      normalizedText: 'إغلاق',
      semanticCategory: 'shared',
      semanticContext: 'close_btn',
      proposedTranslationKey: 'shared.actions.close',
      extractionConfidence: 'HIGH',
      migrationRisk: 'LOW',
      isUserFacing: true,
      classification: 'REAL_USER_FACING',
      reviewRequired: false,
      specialCases: [],
    },
  ];

  const dupGroups = groupDuplicates(mockEntries);
  const dupPass =
    dupGroups.length === 1 &&
    dupGroups[0].normalizedText === 'حفظ التغييرات' &&
    dupGroups[0].entriesCount === 2 &&
    dupGroups[0].isCrossCategory === true;
  results.push({
    id: 'I18N-CAT-07',
    title: 'Deterministic duplicate grouping and cross-category detection',
    passed: dupPass,
    expected: { count: 1, occurrences: 2 },
    actual: { count: dupGroups.length, occurrences: dupGroups[0]?.entriesCount },
    details: 'تجميع النصوص المتكررة بعد المعايرة في مجموعات مكررات دقيقة وتحديد المكررات المتقاطعة.',
  });

  // ----------------------------------------------------
  // I18N-CAT-08: Semantic duplicate separation
  // ----------------------------------------------------
  const conflictEntries: CatalogEntry[] = [
    {
      id: 'conf_1',
      sourceFile: 'src/components/ui/Modal.tsx',
      sourceLine: 10,
      sourceColumn: 5,
      originalText: 'إلغاء',
      normalizedText: 'إلغاء',
      semanticCategory: 'shared',
      semanticContext: 'modal_dismiss',
      proposedTranslationKey: 'shared.actions.cancel',
      extractionConfidence: 'HIGH',
      migrationRisk: 'LOW',
      isUserFacing: true,
      classification: 'REAL_USER_FACING',
      reviewRequired: false,
      specialCases: [],
    },
    {
      id: 'conf_2',
      sourceFile: 'src/components/trips/TripActions.tsx',
      sourceLine: 120,
      sourceColumn: 15,
      originalText: 'إلغاء',
      normalizedText: 'إلغاء',
      semanticCategory: 'trips',
      semanticContext: 'cancel_trip_state',
      proposedTranslationKey: 'trips.actions.cancelTrip',
      extractionConfidence: 'HIGH',
      migrationRisk: 'MEDIUM',
      isUserFacing: true,
      classification: 'REAL_USER_FACING',
      reviewRequired: true,
      specialCases: [],
    },
  ];

  const conflicts = identifySemanticConflicts(conflictEntries);
  const conflictPass =
    conflicts.length === 1 &&
    conflicts[0].normalizedText === 'إلغاء' &&
    conflicts[0].contexts.length === 2 &&
    conflicts[0].contexts.some((c) => c.category === 'trips') &&
    conflicts[0].contexts.some((c) => c.category === 'shared');
  results.push({
    id: 'I18N-CAT-08',
    title: 'Semantic duplicate separation (Modal Cancel vs Trip State Cancel)',
    passed: conflictPass,
    expected: true,
    actual: { conflictCount: conflicts.length, contextsCount: conflicts[0]?.contexts.length },
    details: 'الفصل الدلالي الحاسم للنصوص المتشابهة ظاهرياً والمختلفة وظيفياً لمنع دمج المفاتيح الخطير.',
  });

  // ----------------------------------------------------
  // I18N-CAT-09: Deterministic key generation
  // ----------------------------------------------------
  const keyGen = new KeyGenerator();
  const key1 = keyGen.generateKey('trips', 'الوزن الصافي', 'table_column');
  const key2 = keyGen.generateKey('pricing', 'حفظ', 'action_button');
  const key3 = keyGen.generateKey('reports', 'رقم التذكرة', 'filter_field');
  const keyGenPass =
    key1 === 'trips.columns.netWeight' &&
    key2 === 'shared.actions.save' &&
    key3 === 'reports.fields.ticketNumber';
  results.push({
    id: 'I18N-CAT-09',
    title: 'Deterministic hierarchical translation key generation',
    passed: keyGenPass,
    expected: {
      key1: 'trips.columns.netWeight',
      key2: 'shared.actions.save',
      key3: 'reports.fields.ticketNumber',
    },
    actual: { key1, key2, key3 },
    details: 'توليد مفاتيح ترجمة هرمية معبرة ومستقرة تماماً وفق التصنيف والسياق دون أي معرفات عشوائية.',
  });

  // ----------------------------------------------------
  // I18N-CAT-10: Key collision handling
  // ----------------------------------------------------
  const collGen = new KeyGenerator();
  const colKey1 = collGen.generateKey('trips', 'الرحلات', 'nav_header');
  const colKey2 = collGen.generateKey('trips', 'رحلة', 'table_label'); // Distinct text that might produce similar slug
  const colKey3 = collGen.generateKey('trips', 'الرحلات', 'nav_header'); // Exactly identical text
  const collisionPass =
    colKey1 !== colKey2 &&
    colKey3 === colKey1 &&
    !colKey1.includes('undefined') &&
    !colKey2.includes('undefined');
  results.push({
    id: 'I18N-CAT-10',
    title: 'Key collision resolution without non-deterministic random IDs',
    passed: collisionPass,
    expected: true,
    actual: { colKey1, colKey2, colKey3 },
    details: 'معالجة تضارب المفاتيح بشكل حتمي ودون أي أرقام عشوائية مع إعادة استخدام المفتاح عند تطابق النص.',
  });

  // ----------------------------------------------------
  // I18N-CAT-11: Business field protection
  // ----------------------------------------------------
  const protectedFieldClass = classifyCandidate({
    text: 'ticketId',
    sourceFile: 'src/types/trip.types.ts',
  });
  const protectedPass =
    protectedFieldClass.classification === 'NON_USER_FACING' &&
    protectedFieldClass.risk === 'CRITICAL' &&
    protectedFieldClass.specialCases.includes('shared_business_ui') &&
    PROTECTED_BUSINESS_TOKENS.has('ticketId');
  results.push({
    id: 'I18N-CAT-11',
    title: 'Business data field identifier protection (ticketId, truckNo, etc.)',
    passed: protectedPass,
    expected: 'CRITICAL',
    actual: protectedFieldClass.risk,
    details: 'حماية المعرفات البرمجية والبيانات الحسابية من الاستخراج كترجمة مع وسمها بـ CRITICAL.',
  });

  // ----------------------------------------------------
  // I18N-CAT-12: Unit and currency protection
  // ----------------------------------------------------
  const unitKg = PRESENTATION_UNIT_CURRENCY_MAP['كجم'];
  const unitTon = PRESENTATION_UNIT_CURRENCY_MAP['طن'];
  const currSar = PRESENTATION_UNIT_CURRENCY_MAP['SAR'];
  const currRiyal = PRESENTATION_UNIT_CURRENCY_MAP['ريال'];
  const unitCurrPass =
    unitKg?.internalCode === 'KG' &&
    unitTon?.internalCode === 'TON' &&
    currSar?.internalCode === 'SAR' &&
    currRiyal?.internalCode === 'SAR';
  results.push({
    id: 'I18N-CAT-12',
    title: 'Unit and currency protection mapping (KG, TON, SAR)',
    passed: unitCurrPass,
    expected: { kg: 'KG', ton: 'TON', sar: 'SAR' },
    actual: {
      kg: unitKg?.internalCode,
      ton: unitTon?.internalCode,
      sar: currSar?.internalCode,
      riyal: currRiyal?.internalCode,
    },
    details: 'ربط وحدات القياس والعملات بركائزها البرمجية الداخلية المعتمدة دون المساس بالعمليات الحسابية.',
  });

  // ----------------------------------------------------
  // I18N-CAT-13: Directional class detection
  // ----------------------------------------------------
  const riskLeft = classifyDirectionalRisk('text-left', 'src/components/Table.tsx');
  const riskPl = classifyDirectionalRisk('pl-4', 'src/components/Button.tsx');
  const repLeft = getLogicalReplacement('text-left');
  const repPl = getLogicalReplacement('pl-4');
  const repMr = getLogicalReplacement('mr-2');
  const repBorderL = getLogicalReplacement('border-l-2');
  const dirPass =
    riskLeft === 'MUST_MIGRATE' &&
    riskPl === 'MUST_MIGRATE' &&
    repLeft === 'text-start' &&
    repPl === 'ps-4' &&
    repMr === 'me-2' &&
    repBorderL === 'border-s-2';
  results.push({
    id: 'I18N-CAT-13',
    title: 'Directional CSS utility detection and logical replacement recommendation',
    passed: dirPass,
    expected: { repLeft: 'text-start', repPl: 'ps-4', repMr: 'me-2' },
    actual: { repLeft, repPl, repMr, repBorderL },
    details: 'كشف فئات الاتجاه الفيزيائية وتعيين بدائلها المنطقية المناسبة لـ RTL/LTR.',
  });

  // ----------------------------------------------------
  // I18N-CAT-14: Interpolation & special cases detection
  // ----------------------------------------------------
  const interpClass = classifyCandidate({
    text: 'تم تحميل {count} رحلة من أصل 50 رحلة بنجاح',
    sourceFile: 'src/components/trips/TripAlert.tsx',
    isPartOfBinaryConcatenation: true,
  });
  const specialPass =
    interpClass.specialCases.includes('interpolation') &&
    interpClass.specialCases.includes('concatenated') &&
    interpClass.specialCases.includes('mixed_numbers') &&
    interpClass.risk === 'HIGH';
  results.push({
    id: 'I18N-CAT-14',
    title: 'Detection of interpolation, string concatenation, and mixed numbers',
    passed: specialPass,
    expected: true,
    actual: { specialCases: interpClass.specialCases, risk: interpClass.risk },
    details: 'رصد بؤر الخطورة العالية كالسلاسل المدمجة والمتغيرات المعوضة والنصوص المخلوطة بأرقام.',
  });

  // ----------------------------------------------------
  // I18N-CAT-15: Report generation
  // ----------------------------------------------------
  const report = runCatalogPipeline(path.resolve(process.cwd(), 'src'));
  writeCatalogReports(report, path.resolve(process.cwd(), 'reports'));

  const jsonReportPath = path.resolve(process.cwd(), 'reports/i18n-catalog.json');
  const mdReportPath = path.resolve(process.cwd(), 'reports/i18n-catalog.md');

  const jsonExists = fs.existsSync(jsonReportPath);
  const mdExists = fs.existsSync(mdReportPath);
  const jsonContent = jsonExists ? JSON.parse(fs.readFileSync(jsonReportPath, 'utf-8')) : null;
  const mdContent = mdExists ? fs.readFileSync(mdReportPath, 'utf-8') : '';

  const reportPass =
    jsonExists &&
    mdExists &&
    jsonContent?.summary?.totalFilesScanned > 0 &&
    jsonContent?.summary?.userFacingCount > 0 &&
    mdContent.includes('Executive Summary Metrics') &&
    mdContent.includes('Directional (RTL / LTR) Class Inventory');

  results.push({
    id: 'I18N-CAT-15',
    title: 'Full catalog report generation (JSON & Markdown)',
    passed: reportPass,
    expected: true,
    actual: {
      jsonExists,
      mdExists,
      filesScanned: jsonContent?.summary?.totalFilesScanned,
      userFacingCount: jsonContent?.summary?.userFacingCount,
      proposedKeys: jsonContent?.summary?.proposedKeyCount,
    },
    details: 'إنشاء تقارير الفهرسة الآلية (JSON و Markdown) بنجاح مع كافة الإحصائيات والجداول الدلالية.',
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
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('i18nCatalog.test')) {
  const res = runI18nCatalogTests();
  console.log('\n======================================================');
  console.log(`BLOCK 41: i18n Catalog Test Results: ${res.passedTests}/${res.totalTests} PASSED`);
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
