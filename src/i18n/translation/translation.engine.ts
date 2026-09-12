/**
 * BLOCK 43 — Translation Generation Engine
 */

import {
  TranslationProposal,
  TranslationProvider,
  TranslationBatchOptions,
  TranslationGenerationSummary,
  ProductionGeneratedCatalog,
  TranslationConfidence,
  TranslationTier,
  ReviewReason,
} from './translation.types';
import { ProductionTranslationCatalog, TranslationCatalogEntry } from '../catalog/translationCatalog.types';
import { SemanticCategory } from '../catalog/catalog.types';
import { ALL_SEMANTIC_CATEGORIES } from '../catalog/catalog.constants';
import { getTranslationProvider } from './translation.provider';

export class TranslationEngine {
  private provider: TranslationProvider;

  constructor(provider?: TranslationProvider) {
    this.provider = provider || getTranslationProvider('deterministic');
  }

  /**
   * Sets the active provider
   */
  public setProvider(provider: TranslationProvider): void {
    this.provider = provider;
  }

  /**
   * Generates translation proposals for an entire catalog or a slice of it
   */
  public async processCatalog(
    catalog: ProductionTranslationCatalog,
    options?: TranslationBatchOptions,
    existingProposals: Record<string, TranslationProposal> = {}
  ): Promise<{
    proposals: Record<string, TranslationProposal>;
    summary: TranslationGenerationSummary;
  }> {
    const allEntries = Object.values(catalog.entries);

    // Apply filtering if specified
    let filteredEntries = allEntries;
    if (options?.categoryFilter && options.categoryFilter.length > 0) {
      filteredEntries = filteredEntries.filter((e) => options.categoryFilter!.includes(e.category));
    }
    if (options?.keyFilter && options.keyFilter.length > 0) {
      filteredEntries = filteredEntries.filter((e) => options.keyFilter!.includes(e.key));
    }

    const startIndex = options?.startIndex || 0;
    const maxEntries = options?.maxEntries ? Math.min(options.maxEntries, filteredEntries.length) : filteredEntries.length;
    const batchSize = options?.batchSize || 100;
    const targetSlice = filteredEntries.slice(startIndex, startIndex + maxEntries);

    const proposals: Record<string, TranslationProposal> = { ...existingProposals };

    // Process in batches for performance and memory optimization
    for (let i = 0; i < targetSlice.length; i += batchSize) {
      const batchEntries = targetSlice.slice(i, i + batchSize);

      for (const entry of batchEntries) {
        // Idempotency: if proposal already exists and forceRegenerate is not requested, keep existing
        if (!options?.forceRegenerate && proposals[entry.key]) {
          continue;
        }

        // Generate proposal
        const proposal = await this.provider.generateProposal(entry);
        proposals[entry.key] = proposal;
      }
    }

    // Compute summary
    const summary = this.computeSummary(Object.values(proposals));

    return {
      proposals,
      summary,
    };
  }

  /**
   * Computes comprehensive translation generation summary
   */
  public computeSummary(proposals: TranslationProposal[]): TranslationGenerationSummary {
    let generatedEnCount = 0;
    let generatedUrCount = 0;
    let reviewRequiredCount = 0;
    let skippedCount = 0;
    let protectedCount = 0;
    let interpolationCount = 0;
    let pluralizationCount = 0;
    let highRiskCount = 0;
    let semanticConflictCount = 0;
    let domainTerminologyCount = 0;

    const confidenceBreakdown: Record<TranslationConfidence, number> = {
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
    };

    const tierBreakdown: Record<TranslationTier, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
    };

    const reviewReasonsBreakdown: Record<ReviewReason, number> = {
      SEMANTIC_CONFLICT: 0,
      DOMAIN_TERM: 0,
      INTERPOLATION_RISK: 0,
      PLURALIZATION_RISK: 0,
      REPORT_EXPORT_RISK: 0,
      BUSINESS_DATA_RISK: 0,
      LOW_CONFIDENCE: 0,
      DIRECTIONAL_RISK: 0,
      VALIDATION_FAILURE: 0,
      OTHER: 0,
    };

    const categoryBreakdown = {} as Record<
      SemanticCategory,
      { total: number; generated: number; reviewRequired: number; high: number; medium: number; low: number }
    >;

    for (const cat of ALL_SEMANTIC_CATEGORIES) {
      categoryBreakdown[cat] = {
        total: 0,
        generated: 0,
        reviewRequired: 0,
        high: 0,
        medium: 0,
        low: 0,
      };
    }

    for (const p of proposals) {
      if (p.proposedTextEn) generatedEnCount++;
      if (p.proposedTextUr) generatedUrCount++;
      if (p.reviewRequired) reviewRequiredCount++;
      if (p.statusEn === 'PROTECTED') protectedCount++;
      if (p.statusEn === 'SKIPPED') skippedCount++;
      if (p.interpolationParams.length > 0) interpolationCount++;
      if (p.pluralization.required) pluralizationCount++;
      if (p.risk === 'HIGH' || p.risk === 'CRITICAL' || p.tier === 4) highRiskCount++;
      if (p.semanticConflictGroupId) semanticConflictCount++;
      if (p.tier === 3 || p.reviewReasons.includes('DOMAIN_TERM')) domainTerminologyCount++;

      confidenceBreakdown[p.confidence] = (confidenceBreakdown[p.confidence] || 0) + 1;
      tierBreakdown[p.tier] = (tierBreakdown[p.tier] || 0) + 1;

      for (const reason of p.reviewReasons) {
        reviewReasonsBreakdown[reason] = (reviewReasonsBreakdown[reason] || 0) + 1;
      }

      if (categoryBreakdown[p.category]) {
        categoryBreakdown[p.category].total++;
        if (p.proposedTextEn && p.proposedTextUr) categoryBreakdown[p.category].generated++;
        if (p.reviewRequired) categoryBreakdown[p.category].reviewRequired++;
        if (p.confidence === 'HIGH') categoryBreakdown[p.category].high++;
        if (p.confidence === 'MEDIUM') categoryBreakdown[p.category].medium++;
        if (p.confidence === 'LOW') categoryBreakdown[p.category].low++;
      }
    }

    return {
      totalEntries: proposals.length,
      generatedEnCount,
      generatedUrCount,
      reviewRequiredCount,
      skippedCount,
      protectedCount,
      interpolationCount,
      pluralizationCount,
      highRiskCount,
      semanticConflictCount,
      domainTerminologyCount,
      confidenceBreakdown,
      tierBreakdown,
      reviewReasonsBreakdown,
      categoryBreakdown,
    };
  }

  /**
   * Builds the complete production generated catalog artifact
   */
  public buildProductionArtifact(
    proposals: Record<string, TranslationProposal>,
    summary: TranslationGenerationSummary
  ): ProductionGeneratedCatalog {
    return {
      generatedAt: new Date().toISOString(),
      version: '1.0.0-block43',
      provider: this.provider.name,
      summary,
      proposals,
    };
  }
}
