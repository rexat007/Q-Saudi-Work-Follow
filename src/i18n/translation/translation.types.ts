/**
 * BLOCK 43 — AI-Assisted Translation Engine & Safe Translation Generation
 * Type Definitions & Schema Contracts
 */

import { SemanticCategory, MigrationRisk } from '../catalog/catalog.types';
import {
  ArabicPluralForm,
  EnglishPluralForm,
  UrduPluralForm,
  SourceReference,
  TranslationCatalogEntry,
} from '../catalog/translationCatalog.types';

export type TranslationStatus =
  | 'GENERATED'
  | 'REVIEW_REQUIRED'
  | 'AMBIGUOUS'
  | 'PROTECTED'
  | 'SKIPPED'
  | 'VALIDATED';

export type TranslationConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export type TranslationTier = 1 | 2 | 3 | 4;

export type ReviewReason =
  | 'SEMANTIC_CONFLICT'
  | 'DOMAIN_TERM'
  | 'INTERPOLATION_RISK'
  | 'PLURALIZATION_RISK'
  | 'REPORT_EXPORT_RISK'
  | 'BUSINESS_DATA_RISK'
  | 'LOW_CONFIDENCE'
  | 'DIRECTIONAL_RISK'
  | 'VALIDATION_FAILURE'
  | 'OTHER';

export interface TranslationProposal {
  key: string;
  category: SemanticCategory;
  semanticContext: string;
  sourceTextAr: string;
  proposedTextEn: string | null;
  proposedTextUr: string | null;
  statusEn: TranslationStatus;
  statusUr: TranslationStatus;
  confidence: TranslationConfidence;
  reviewRequired: boolean;
  reviewReasons: ReviewReason[];
  risk: MigrationRisk;
  tier: TranslationTier;
  interpolationParams: string[];
  pluralization: {
    required: boolean;
    formsAr: ArabicPluralForm[];
    formsEn?: EnglishPluralForm[];
    formsUr?: UrduPluralForm[];
  };
  protectedTokens: string[];
  sourceReferences: SourceReference[];
  semanticConflictGroupId?: string;
  duplicateGroupId?: string;
  notes: string[];
  validationErrors: string[];
  directionMetadata: {
    ar: 'rtl';
    en: 'ltr';
    ur: 'rtl';
    hasMixedDirectionContent: boolean;
  };
  isReportOrExportField?: boolean;
  internalDataKey?: string;
  presentationLabel?: string;
}

export interface DomainGlossaryTerm {
  termKey: string;
  domain: SemanticCategory | string;
  sourceFormAr: string;
  canonicalTermEn: string;
  canonicalTermUr: string;
  notes: string;
  allowedSynonymsEn: string[];
  allowedSynonymsUr: string[];
  forbiddenAlternativesEn: string[];
  forbiddenAlternativesUr: string[];
}

export interface TranslationValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  preservedParams: boolean;
  preservedTokens: boolean;
}

export interface TranslationBatchOptions {
  batchSize?: number;
  startIndex?: number;
  maxEntries?: number;
  forceRegenerate?: boolean;
  categoryFilter?: SemanticCategory[];
  keyFilter?: string[];
}

export interface TranslationGenerationSummary {
  totalEntries: number;
  generatedEnCount: number;
  generatedUrCount: number;
  reviewRequiredCount: number;
  skippedCount: number;
  protectedCount: number;
  interpolationCount: number;
  pluralizationCount: number;
  highRiskCount: number;
  semanticConflictCount: number;
  domainTerminologyCount: number;
  confidenceBreakdown: Record<TranslationConfidence, number>;
  tierBreakdown: Record<TranslationTier, number>;
  reviewReasonsBreakdown: Record<ReviewReason, number>;
  categoryBreakdown: Record<
    SemanticCategory,
    {
      total: number;
      generated: number;
      reviewRequired: number;
      high: number;
      medium: number;
      low: number;
    }
  >;
}

export interface ProductionGeneratedCatalog {
  generatedAt: string;
  version: string;
  provider: string;
  summary: TranslationGenerationSummary;
  proposals: Record<string, TranslationProposal>;
}

export interface TranslationProvider {
  id: string;
  name: string;
  generateProposal(entry: TranslationCatalogEntry): Promise<TranslationProposal>;
  generateBatch(entries: TranslationCatalogEntry[], options?: TranslationBatchOptions): Promise<TranslationProposal[]>;
  validateProposal(proposal: TranslationProposal): TranslationValidationResult;
  generateGlossary(): DomainGlossaryTerm[];
}
