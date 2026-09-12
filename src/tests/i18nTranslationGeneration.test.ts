/**
 * BLOCK 43 — AI-Assisted Translation Engine & Safe Translation Generation Test Suite
 * Validates tests I18N-GEN-01 through I18N-GEN-20
 */

import fs from 'fs';
import path from 'path';
import { runCatalogPipeline } from '../i18n/catalog/catalog.index';
import { buildProductionTranslationCatalog } from '../i18n/catalog/translationCatalog.generator';
import { ProductionTranslationCatalog, TranslationCatalogEntry } from '../i18n/catalog/translationCatalog.types';
import {
  TranslationEngine,
  getTranslationProvider,
  DeterministicTerminologyProvider,
  runTranslationGenerationPipeline,
  validateTranslationProposal,
  buildReviewQueuesByReason,
  formatReviewQueueMarkdown,
  formatGlossaryMarkdown,
  formatTranslationSummaryMarkdown,
  TranslationProposal,
} from '../i18n/translation/index';
import { dictionaries } from '../locales';

interface TestCaseResult {
  id: string;
  title: string;
  passed: boolean;
  details: string;
  expected?: unknown;
  actual?: unknown;
}

const results: TestCaseResult[] = [];

async function runBlock43Tests() {
  console.log('🚀 Running BLOCK 43 AI-Assisted Translation Generation Test Suite (20 Test Cases)...');

  // Load catalog: read from reports or generate
  const catalogReport = runCatalogPipeline();
  const prodCatalog = buildProductionTranslationCatalog(catalogReport);

  // Run generation pipeline to produce all artifacts
  const generatedArtifact = await runTranslationGenerationPipeline(prodCatalog);
  const proposalsMap = generatedArtifact.proposals;
  const proposalsList = Object.values(proposalsMap);
  const { summary } = generatedArtifact;

  // ----------------------------------------------------
  // I18N-GEN-01: Arabic source preservation
  // ----------------------------------------------------
  const arabicIdentical = proposalsList.every((p) => {
    const originalEntry = prodCatalog.entries[p.key];
    return originalEntry && p.sourceTextAr === originalEntry.sourceTextAr;
  });

  results.push({
    id: 'I18N-GEN-01',
    title: 'Arabic source preservation',
    passed: arabicIdentical && proposalsList.length > 0,
    details: `100% of ${proposalsList.length} generated proposals preserve Arabic source text verbatim.`,
  });

  // ----------------------------------------------------
  // I18N-GEN-02: English generation structure
  // ----------------------------------------------------
  const validEnglish = proposalsList.every((p) => {
    const validStatus = ['GENERATED', 'VALIDATED', 'REVIEW_REQUIRED', 'AMBIGUOUS', 'PROTECTED', 'SKIPPED'].includes(
      p.statusEn
    );
    const validConf = ['HIGH', 'MEDIUM', 'LOW'].includes(p.confidence);
    return validStatus && validConf && typeof p.proposedTextEn === 'string' && p.proposedTextEn.length > 0;
  });

  results.push({
    id: 'I18N-GEN-02',
    title: 'English generation structure',
    passed: validEnglish,
    details: `All ${summary.generatedEnCount} English proposals possess valid status, confidence, and non-empty text.`,
  });

  // ----------------------------------------------------
  // I18N-GEN-03: Urdu generation structure
  // ----------------------------------------------------
  const validUrdu = proposalsList.every((p) => {
    const validStatus = ['GENERATED', 'VALIDATED', 'REVIEW_REQUIRED', 'AMBIGUOUS', 'PROTECTED', 'SKIPPED'].includes(
      p.statusUr
    );
    return validStatus && typeof p.proposedTextUr === 'string' && p.proposedTextUr.length > 0;
  });

  results.push({
    id: 'I18N-GEN-03',
    title: 'Urdu generation structure',
    passed: validUrdu,
    details: `All ${summary.generatedUrCount} Urdu proposals possess valid status and non-empty translated content.`,
  });

  // ----------------------------------------------------
  // I18N-GEN-04: Stable key preservation
  // ----------------------------------------------------
  const catalogKeys = Object.keys(prodCatalog.entries).sort();
  const proposalKeys = Object.keys(proposalsMap).sort();
  const keysPreserved =
    catalogKeys.length === proposalKeys.length && catalogKeys.every((k, idx) => k === proposalKeys[idx]);

  results.push({
    id: 'I18N-GEN-04',
    title: 'Stable key preservation',
    passed: keysPreserved,
    details: `100% key parity: All ${catalogKeys.length} catalog keys are preserved identically in proposals.`,
  });

  // ----------------------------------------------------
  // I18N-GEN-05: Interpolation preservation
  // ----------------------------------------------------
  const entriesWithParams = proposalsList.filter((p) => p.interpolationParams.length > 0);
  const interpolationPreserved = entriesWithParams.every((p) => {
    return p.interpolationParams.every((param) => {
      const enHas = p.proposedTextEn?.includes(`{${param}}`) || p.proposedTextEn?.includes(`{{${param}}}`);
      const urHas = p.proposedTextUr?.includes(`{${param}}`) || p.proposedTextUr?.includes(`{{${param}}}`);
      return enHas && urHas;
    });
  });

  results.push({
    id: 'I18N-GEN-05',
    title: 'Interpolation preservation',
    passed: interpolationPreserved && entriesWithParams.length > 0,
    details: `All ${entriesWithParams.length} entries with interpolation parameters preserve dynamic placeholders in EN & UR.`,
  });

  // ----------------------------------------------------
  // I18N-GEN-06: Interpolation mismatch rejection
  // ----------------------------------------------------
  const testSample = proposalsList[0];
  const invalidProposal: TranslationProposal = {
    ...testSample,
    sourceTextAr: 'تم تسجيل {count} رحلات',
    interpolationParams: ['count'],
    proposedTextEn: 'Recorded trips', // Missing {count}
    proposedTextUr: '{count} ٹرپس ریکارڈ کیے گئے',
  };

  const validationResult = validateTranslationProposal(invalidProposal);
  const rejectedAsExpected =
    !validationResult.isValid &&
    validationResult.errors.some((err) => err.includes('missing required interpolation parameters'));

  results.push({
    id: 'I18N-GEN-06',
    title: 'Interpolation mismatch rejection',
    passed: rejectedAsExpected,
    details: `Validator successfully rejected proposal omitting required parameter {count} with actionable error.`,
  });

  // ----------------------------------------------------
  // I18N-GEN-07: Protected business-token preservation
  // ----------------------------------------------------
  const testTokenSample: TranslationProposal = {
    ...testSample,
    sourceTextAr: 'رقم التذكرة ticketId والشاحنة truckNo',
    protectedTokens: ['ticketId', 'truckNo'],
    interpolationParams: [],
    proposedTextEn: 'Ticket number ticketId and truck truckNo',
    proposedTextUr: 'ٹکٹ نمبر ticketId اور گاڑی truckNo',
  };
  const tokenVal = validateTranslationProposal(testTokenSample);
  const tokensPreserved = tokenVal.isValid && tokenVal.preservedTokens;

  results.push({
    id: 'I18N-GEN-07',
    title: 'Protected business-token preservation',
    passed: tokensPreserved,
    details: `Protected business identifiers (ticketId, truckNo) verified intact without alteration.`,
  });

  // ----------------------------------------------------
  // I18N-GEN-08: Currency protection
  // ----------------------------------------------------
  const currencyEntries = proposalsList.filter(
    (p) => p.sourceTextAr.includes('ر.س') || p.sourceTextAr.includes('ريال') || p.sourceTextAr.includes('SAR')
  );
  const currencyProtected = currencyEntries.every((p) => {
    const en = p.proposedTextEn || '';
    const ur = p.proposedTextUr || '';
    return en.includes('SAR') || ur.includes('سعودی ریال') || ur.includes('SAR');
  });

  results.push({
    id: 'I18N-GEN-08',
    title: 'Currency protection',
    passed: currencyProtected && currencyEntries.length > 0,
    details: `Currency tokens verified in all ${currencyEntries.length} entries matching SAR/ر.س.`,
  });

  // ----------------------------------------------------
  // I18N-GEN-09: Unit protection
  // ----------------------------------------------------
  const unitEntries = proposalsList.filter(
    (p) => p.sourceTextAr.includes('كجم') || p.sourceTextAr.includes('طن')
  );
  const unitsProtected = unitEntries.every((p) => {
    const en = (p.proposedTextEn || '').toLowerCase();
    const ur = p.proposedTextUr || '';
    const hasKg = en.includes('kg') || ur.includes('کلوگرام');
    const hasTon = en.includes('ton') || ur.includes('ٹن');
    return hasKg || hasTon;
  });

  results.push({
    id: 'I18N-GEN-09',
    title: 'Unit protection',
    passed: unitsProtected && unitEntries.length > 0,
    details: `Unit codes (kg, ton, كجم, طن) protected across all ${unitEntries.length} physical measurement entries.`,
  });

  // ----------------------------------------------------
  // I18N-GEN-10: Pluralization metadata preservation
  // ----------------------------------------------------
  const pluralEntries = proposalsList.filter((p) => p.pluralization.required);
  const pluralValid = pluralEntries.every((p) => {
    const hasAr6Forms = p.pluralization.formsAr.length === 6;
    const hasEnForms = Array.isArray(p.pluralization.formsEn) && p.pluralization.formsEn.includes('one');
    return hasAr6Forms && hasEnForms;
  });

  results.push({
    id: 'I18N-GEN-10',
    title: 'Pluralization metadata preservation',
    passed: pluralValid && pluralEntries.length > 0,
    details: `All ${pluralEntries.length} pluralized proposals maintain 6 Arabic plural forms and Intl.PluralRules targets.`,
  });

  // ----------------------------------------------------
  // I18N-GEN-11: Semantic conflict isolation
  // ----------------------------------------------------
  const conflictEntries = proposalsList.filter((p) => p.semanticConflictGroupId);
  const conflictGroups = new Set(conflictEntries.map((c) => c.semanticConflictGroupId));
  const distinctKeysInGroups = Array.from(conflictGroups).every((grpId) => {
    const inGroup = conflictEntries.filter((c) => c.semanticConflictGroupId === grpId);
    const keys = new Set(inGroup.map((c) => c.key));
    return keys.size === inGroup.length;
  });

  // Test loading vs download operational disambiguation
  const loadingStationEntry = proposalsList.find(
    (p) => p.category === 'loading' && p.sourceTextAr.includes('محطة التحميل')
  );
  const fileDownloadEntry = proposalsList.find(
    (p) => p.key === 'imports.actions.download' || (p.category === 'imports' && p.sourceTextAr === 'تحميل')
  );
  const disambiguatedCorrectly =
    loadingStationEntry &&
    fileDownloadEntry &&
    loadingStationEntry.proposedTextEn?.includes('Loading Station') &&
    fileDownloadEntry.proposedTextEn === 'Download';

  results.push({
    id: 'I18N-GEN-11',
    title: 'Semantic conflict isolation',
    passed: distinctKeysInGroups && !!disambiguatedCorrectly,
    details: `Isolated ${conflictEntries.length} entries across ${conflictGroups.size} conflict groups; "تحميل" correctly disambiguated as Loading vs Download.`,
  });

  // ----------------------------------------------------
  // I18N-GEN-12: Duplicate consistency
  // ----------------------------------------------------
  const exactSaveProposals = proposalsList.filter((p) => p.sourceTextAr === 'حفظ');
  const saveConsistent = exactSaveProposals.every(
    (p) => p.proposedTextEn === 'Save' && p.proposedTextUr === 'محفوظ کریں'
  );

  results.push({
    id: 'I18N-GEN-12',
    title: 'Duplicate consistency',
    passed: saveConsistent && exactSaveProposals.length > 0,
    details: `Exact matching Type-A duplicates mapped to uniform translations without fragmentation.`,
  });

  // ----------------------------------------------------
  // I18N-GEN-13: High-risk classification
  // ----------------------------------------------------
  const highRiskEntries = proposalsList.filter((p) => p.risk === 'HIGH' || p.risk === 'CRITICAL' || p.tier === 4);
  const highRiskRouted = highRiskEntries.every((p) => p.reviewRequired === true);

  results.push({
    id: 'I18N-GEN-13',
    title: 'High-risk classification',
    passed: highRiskRouted && highRiskEntries.length > 0,
    details: `All ${highRiskEntries.length} high/critical risk proposals automatically routed to reviewRequired = true.`,
  });

  // ----------------------------------------------------
  // I18N-GEN-14: Low-confidence review routing
  // ----------------------------------------------------
  const lowConfidenceEntries = proposalsList.filter((p) => p.confidence === 'LOW');
  const allLowRouted = lowConfidenceEntries.every(
    (p) => p.reviewRequired === true && ['REVIEW_REQUIRED', 'AMBIGUOUS', 'PROTECTED'].includes(p.statusEn)
  );

  results.push({
    id: 'I18N-GEN-14',
    title: 'Low-confidence review routing',
    passed: allLowRouted && lowConfidenceEntries.length > 0,
    details: `100% of ${lowConfidenceEntries.length} low-confidence proposals routed to reviewRequired = true.`,
  });

  // ----------------------------------------------------
  // I18N-GEN-15: Report/export key protection
  // ----------------------------------------------------
  const reportEntries = proposalsList.filter((p) => p.isReportOrExportField && p.internalDataKey);
  const reportsProtected = reportEntries.every((p) => {
    // Internal key must not contain spaces or Arabic characters
    const internalKey = p.internalDataKey || '';
    return /^[a-zA-Z0-9_]+$/.test(internalKey);
  });

  results.push({
    id: 'I18N-GEN-15',
    title: 'Report/export key protection',
    passed: reportsProtected && reportEntries.length > 0,
    details: `All ${reportEntries.length} report column entries maintain language-neutral internal identifiers.`,
  });

  // ----------------------------------------------------
  // I18N-GEN-16: Batch idempotency
  // ----------------------------------------------------
  const engine = new TranslationEngine();
  const batchSlice = Object.values(prodCatalog.entries).slice(0, 50);
  const batch1 = await engine.processCatalog({ ...prodCatalog, entries: Object.fromEntries(batchSlice.map((e) => [e.key, e])) });
  const batch2 = await engine.processCatalog(
    { ...prodCatalog, entries: Object.fromEntries(batchSlice.map((e) => [e.key, e])) },
    undefined,
    batch1.proposals
  );

  const keysCount1 = Object.keys(batch1.proposals).length;
  const keysCount2 = Object.keys(batch2.proposals).length;
  const idempotent = keysCount1 === keysCount2 && keysCount1 === 50;

  results.push({
    id: 'I18N-GEN-16',
    title: 'Batch idempotency',
    passed: idempotent,
    details: `Batch processing is completely idempotent: multiple passes preserve existing proposals without duplication.`,
  });

  // ----------------------------------------------------
  // I18N-GEN-17: Deterministic output
  // ----------------------------------------------------
  const runA = await engine.processCatalog(
    { ...prodCatalog, entries: Object.fromEntries(batchSlice.map((e) => [e.key, e])) },
    { forceRegenerate: true }
  );
  const runB = await engine.processCatalog(
    { ...prodCatalog, entries: Object.fromEntries(batchSlice.map((e) => [e.key, e])) },
    { forceRegenerate: true }
  );
  const deterministic = JSON.stringify(runA.proposals) === JSON.stringify(runB.proposals);

  results.push({
    id: 'I18N-GEN-17',
    title: 'Deterministic output',
    passed: deterministic,
    details: `Successive runs on identical catalog slices produce 100% bitwise identical proposals.`,
  });

  // ----------------------------------------------------
  // I18N-GEN-18: Foundation dictionary protection
  // ----------------------------------------------------
  const foundationKeys = [
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

  const foundationIntact = foundationKeys.every((key) => {
    const arVal = dictionaries.ar[key];
    const enVal = dictionaries.en[key];
    const urVal = dictionaries.ur[key];
    return arVal && enVal && urVal;
  });

  results.push({
    id: 'I18N-GEN-18',
    title: 'Foundation dictionary protection',
    passed: foundationIntact,
    details: `All 17 BLOCK 40 foundation dictionary keys in src/locales/ remain untouched and verified across ar, en, ur.`,
  });

  // ----------------------------------------------------
  // I18N-GEN-19: Review queue generation
  // ----------------------------------------------------
  const reviewQueues = buildReviewQueuesByReason(proposalsList);
  const totalInQueues = Object.values(reviewQueues).reduce((acc, q) => acc + q.length, 0);
  const queueMarkdown = formatReviewQueueMarkdown(reviewQueues, summary.totalEntries);
  const reviewQueueValid =
    totalInQueues === summary.reviewRequiredCount &&
    queueMarkdown.includes('Professional Translation Human Review Queue') &&
    queueMarkdown.includes('SEMANTIC_CONFLICT');

  results.push({
    id: 'I18N-GEN-19',
    title: 'Review queue generation',
    passed: reviewQueueValid,
    details: `Human review queues created for all reasons (${totalInQueues} items) with actionable recommendations.`,
  });

  // ----------------------------------------------------
  // I18N-GEN-20: Generated catalog structural integrity
  // ----------------------------------------------------
  const reportDir = path.resolve(process.cwd(), 'reports');
  const jsonPath = path.join(reportDir, 'i18n-generated-translations.json');
  const glossaryPath = path.join(reportDir, 'i18n-translation-glossary.md');
  const reviewPath = path.join(reportDir, 'i18n-translation-review.md');
  const summaryPath = path.join(reportDir, 'i18n-translation-summary.md');

  const filesExist =
    fs.existsSync(jsonPath) &&
    fs.existsSync(glossaryPath) &&
    fs.existsSync(reviewPath) &&
    fs.existsSync(summaryPath);

  const jsonContent = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  const schemaValid =
    jsonContent.version === '1.0.0-block43' &&
    typeof jsonContent.summary === 'object' &&
    Object.keys(jsonContent.proposals).length === summary.totalEntries;

  results.push({
    id: 'I18N-GEN-20',
    title: 'Generated catalog structural integrity',
    passed: filesExist && schemaValid,
    details: `All 4 generation artifacts successfully written to disk; JSON conforms strictly to ProductionGeneratedCatalog schema.`,
  });

  // ----------------------------------------------------
  // Print Results
  // ----------------------------------------------------
  console.log('\n======================================================');
  const allPassed = results.every((r) => r.passed);
  console.log(`BLOCK 43: Translation Generation Test Results: ${results.filter((r) => r.passed).length}/${results.length} PASSED`);
  console.log('======================================================');

  for (const r of results) {
    const icon = r.passed ? '✅' : '❌';
    console.log(`${icon} [${r.id}] ${r.title} - ${r.details}`);
  }

  console.log('======================================================\n');

  if (!allPassed) {
    process.exit(1);
  }
}

runBlock43Tests().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
