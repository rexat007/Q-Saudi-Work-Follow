/**
 * BLOCK 43 — Context Sensitivity & Operational Disambiguation
 */

import { SemanticCategory, MigrationRisk } from '../catalog/catalog.types';
import { TranslationCatalogEntry } from '../catalog/translationCatalog.types';
import { TranslationTier, ReviewReason } from './translation.types';
import { TIER1_GENERIC_UI_DICTIONARY, TIER2_CONTEXTUAL_DICTIONARY } from './translation.constants';

const ARABIC_CHAR_REGEX = /[\u0600-\u06FF]/;
const LATIN_CHAR_REGEX = /[a-zA-Z]/;

/**
 * Checks if a string contains mixed directional content (Arabic + Latin / digits)
 */
export function hasMixedDirectionContent(text: string): boolean {
  const hasArabic = ARABIC_CHAR_REGEX.test(text);
  const hasLatin = LATIN_CHAR_REGEX.test(text);
  return hasArabic && hasLatin;
}

/**
 * Disambiguates contextual terms like 'تحميل' or 'إلغاء' based on catalog category and semantic context
 */
export function resolveOperationalContext(
  text: string,
  category: SemanticCategory,
  semanticContext: string,
  key: string
): { isOperationalLoading: boolean; isTripCancellation: boolean; isModalAction: boolean } {
  const normalizedText = text.trim();
  const lowerContext = (semanticContext + ' ' + key + ' ' + category).toLowerCase();

  const isOperationalLoading =
    normalizedText.includes('تحميل') &&
    (category === 'loading' ||
      category === 'trips' ||
      category === 'weighbridge' ||
      lowerContext.includes('station') ||
      lowerContext.includes('truck') ||
      lowerContext.includes('dispatch') ||
      lowerContext.includes('aggregate') ||
      lowerContext.includes('loadingstation'));

  const isTripCancellation =
    normalizedText.includes('إلغاء') &&
    (category === 'trips' ||
      lowerContext.includes('trip') ||
      lowerContext.includes('statemachine') ||
      lowerContext.includes('canceltrip'));

  const isModalAction =
    (normalizedText === 'إلغاء' || normalizedText === 'حفظ' || normalizedText === 'إغلاق') &&
    (lowerContext.includes('modal') ||
      lowerContext.includes('dialog') ||
      lowerContext.includes('btn') ||
      lowerContext.includes('button') ||
      category === 'shared');

  return {
    isOperationalLoading,
    isTripCancellation,
    isModalAction,
  };
}

/**
 * Evaluates which tier an entry belongs to based on category, text, risk, and conflict flags
 */
export function classifyTranslationTier(
  entry: TranslationCatalogEntry
): { tier: TranslationTier; reasons: ReviewReason[] } {
  const reasons: ReviewReason[] = [];
  const text = entry.sourceTextAr.trim();

  // Tier 4 — High Risk Conditions (automatically triggers REVIEW_REQUIRED)
  if (entry.semanticConflictGroupId) {
    reasons.push('SEMANTIC_CONFLICT');
  }

  if (entry.migrationRisk === 'CRITICAL' || entry.migrationRisk === 'HIGH') {
    reasons.push('BUSINESS_DATA_RISK');
  }

  if (entry.interpolationParams.length > 2) {
    reasons.push('INTERPOLATION_RISK');
  }

  if (entry.pluralizationRequired) {
    reasons.push('PLURALIZATION_RISK');
  }

  if (entry.isReportOrExportField && entry.internalDataKey) {
    reasons.push('REPORT_EXPORT_RISK');
  }

  if (entry.reviewStatus === 'AMBIGUOUS' || entry.translationConfidence === 'LOW') {
    reasons.push('LOW_CONFIDENCE');
  }

  if (reasons.length > 0 || entry.semanticConflictGroupId) {
    return { tier: 4, reasons };
  }

  // Tier 1 — Safe Generic UI
  if (TIER1_GENERIC_UI_DICTIONARY[text] && entry.interpolationParams.length === 0) {
    return { tier: 1, reasons: [] };
  }

  // Tier 2 — Contextual Application UI
  if (
    TIER2_CONTEXTUAL_DICTIONARY[text] ||
    entry.category === 'navigation' ||
    entry.category === 'dashboard' ||
    entry.category === 'trucks' ||
    entry.category === 'drivers' ||
    entry.category === 'materials' ||
    entry.category === 'carriers' ||
    entry.category === 'projects'
  ) {
    return { tier: 2, reasons: [] };
  }

  // Tier 3 — Domain-Sensitive
  const domainCategories: SemanticCategory[] = [
    'pricing',
    'reports',
    'security',
    'offline',
    'exceptions',
    'legacyMigration',
    'entityResolution',
    'weighbridge',
  ];

  if (domainCategories.includes(entry.category)) {
    reasons.push('DOMAIN_TERM');
    return { tier: 3, reasons };
  }

  // Default to Tier 2 if no risk, or Tier 3
  return { tier: 2, reasons: [] };
}
