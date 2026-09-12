/**
 * BLOCK 42 — Translation Catalog Generation & Semantic Review Layer
 * TypeScript Type Definitions
 */

import { SemanticCategory, MigrationRisk, DirectionalClassRisk } from './catalog.types';

export type TranslationStatus =
  | 'TRANSLATED'
  | 'UNTRANSLATED'
  | 'REVIEW_REQUIRED'
  | 'AMBIGUOUS'
  | 'PROTECTED'
  | 'NOT_APPLICABLE';

export type TranslationReviewStatus =
  | 'APPROVED'
  | 'REVIEW_REQUIRED'
  | 'AMBIGUOUS'
  | 'PROTECTED'
  | 'REJECTED';

export type TranslationConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export type ArabicPluralForm = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';
export type EnglishPluralForm = 'one' | 'other';
export type UrduPluralForm = 'one' | 'other';

export type DuplicateClassification =
  | 'A_EXACT_SAME_MEANING'
  | 'B_DIFFERENT_MEANING_SAME_TEXT'
  | 'C_FORMAT_PUNCTUATION_VARIATION'
  | 'D_UNCERTAIN';

export interface SourceReference {
  file: string;
  line?: number;
  column?: number;
  element?: string;
  contextSnippet?: string;
}

export interface LanguageTranslationSlot {
  text: string | null;
  status: TranslationStatus;
  confidence: TranslationConfidence;
  lastReviewed?: string;
  reviewedBy?: string;
  notes?: string;
}

export interface DirectionalMigrationMetadata {
  originalPhysicalDirection: string;
  recommendedLogicalDirection: string;
  risk: DirectionalClassRisk;
  reviewRequired: boolean;
  file?: string;
  line?: number;
  contextSnippet?: string;
}

export interface TranslationCatalogEntry {
  key: string;
  category: SemanticCategory;
  semanticContext: string;
  sourceTextAr: string;
  sourceTextEn: string | null;
  sourceTextUr: string | null;
  translations: {
    ar: LanguageTranslationSlot;
    en: LanguageTranslationSlot;
    ur: LanguageTranslationSlot;
  };
  description: string;
  interpolationParams: string[];
  pluralizationRequired: boolean;
  pluralFormsRequired: ArabicPluralForm[];
  reviewStatus: TranslationReviewStatus;
  translationConfidence: TranslationConfidence;
  migrationRisk: MigrationRisk;
  protectedTokens: string[];
  sourceReferences: SourceReference[];
  duplicateGroupId?: string;
  duplicateClassification?: DuplicateClassification;
  semanticConflictGroupId?: string;
  isReportOrExportField?: boolean;
  internalDataKey?: string;
  presentationLabel?: string;
  directionalMetadata?: DirectionalMigrationMetadata;
  notes: string[];
}

export interface DomainReviewQueueItem {
  key: string;
  category: SemanticCategory;
  sourceTextAr: string;
  context: string;
  sourceFiles: string[];
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  suggestedTerms?: { en?: string; ur?: string };
  reviewReason: string;
  protectedTokens?: string[];
  interpolationParams?: string[];
}

export interface TranslationCatalogSummary {
  totalCatalogEntries: number;
  translatedCount: number;
  untranslatedCount: number;
  reviewRequiredCount: number;
  ambiguousCount: number;
  protectedCount: number;
  interpolationCount: number;
  pluralizationCount: number;
  duplicateSharingCandidates: number;
  semanticConflictCount: number;
  highRiskEntries: number;
  directionalMigrationQueue: number;
  categoryStatistics: Record<
    SemanticCategory,
    {
      total: number;
      translated: number;
      untranslated: number;
      reviewRequired: number;
      ambiguous: number;
      protected: number;
    }
  >;
}

export interface ProductionTranslationCatalog {
  generatedAt: string;
  version: string;
  summary: TranslationCatalogSummary;
  duplicateGroupsSummary: {
    totalGroups: number;
    typeA_exactSameMeaning: number;
    typeB_differentMeaning: number;
    typeC_formatVariation: number;
    typeD_uncertain: number;
  };
  directionalMigrationQueue: {
    total: number;
    items: DirectionalMigrationMetadata[];
  };
  domainReviewQueues: Record<string, DomainReviewQueueItem[]>;
  entries: Record<string, TranslationCatalogEntry>;
}
