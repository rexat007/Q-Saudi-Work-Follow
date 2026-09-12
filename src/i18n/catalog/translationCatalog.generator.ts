/**
 * BLOCK 42 — Translation Catalog Generator & Semantic Review Pipeline
 */

import fs from 'fs';
import path from 'path';
import { CatalogReport, CatalogEntry, SemanticCategory, MigrationRisk } from './catalog.types';
import {
  TranslationCatalogEntry,
  ProductionTranslationCatalog,
  TranslationCatalogSummary,
  DomainReviewQueueItem,
  DuplicateClassification,
  DirectionalMigrationMetadata,
  TranslationReviewStatus,
} from './translationCatalog.types';
import {
  FOUNDATION_VOCABULARY,
  MANDATORY_DOMAIN_QUEUES,
  ARABIC_PLURAL_FORMS,
  INTERPOLATION_REGEX,
  PLURAL_DETECTION_PATTERNS,
} from './translationCatalog.constants';
import { PROTECTED_BUSINESS_TOKENS, PRESENTATION_UNIT_CURRENCY_MAP } from './catalog.constants';

/**
 * Extracts interpolation parameter names from a text
 */
export function extractInterpolationParams(text: string): string[] {
  const params: string[] = [];
  const matches = text.matchAll(INTERPOLATION_REGEX);
  for (const match of matches) {
    const p = match[1] || match[2];
    if (p && !params.includes(p)) {
      params.push(p);
    }
  }
  return params;
}

/**
 * Detects if a text represents a quantity requiring pluralization
 */
export function requiresPluralization(text: string, params: string[]): boolean {
  if (params.includes('count') || params.includes('total') || params.includes('quantity')) {
    return true;
  }
  for (const pattern of PLURAL_DETECTION_PATTERNS) {
    if (pattern.test(text)) {
      // If it contains quantity keywords and also numbers or interpolation or count indicators
      if (params.length > 0 || /\d/.test(text) || /عدد|كمية|إجمالي/.test(text)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Identifies protected business data tokens in a text
 */
export function identifyProtectedTokens(text: string): string[] {
  const protectedFound: string[] = [];

  // Check business identifiers
  for (const token of PROTECTED_BUSINESS_TOKENS) {
    if (new RegExp(`\\b${token}\\b`, 'i').test(text)) {
      if (!protectedFound.includes(token)) {
        protectedFound.push(token);
      }
    }
  }

  // Check unit & currency presentation strings
  for (const [pres, mapping] of Object.entries(PRESENTATION_UNIT_CURRENCY_MAP)) {
    if (text.includes(pres)) {
      if (!protectedFound.includes(mapping.internalCode)) {
        protectedFound.push(mapping.internalCode);
      }
    }
  }

  return protectedFound;
}

/**
 * Derives the language-neutral internal data key for a report/export column
 */
export function deriveInternalDataKey(key: string, originalText: string): string {
  // If key is like reports.columns.netWeight -> netWeight
  const parts = key.split('.');
  if (parts.length >= 3 && (parts[1] === 'columns' || parts[1] === 'fields' || parts[1] === 'filters')) {
    return parts.slice(2).join('.');
  }
  return parts[parts.length - 1] || originalText;
}

/**
 * Builds the production translation catalog from BLOCK 41 extraction report
 */
export function buildProductionTranslationCatalog(catalogReport: CatalogReport): ProductionTranslationCatalog {
  const { entries, duplicateGroups, semanticConflicts, directionalInventory } = catalogReport;

  // Index semantic conflict texts and groups
  const semanticConflictMap = new Map<string, string>(); // normalizedText -> conflictGroupId
  for (const sc of semanticConflicts) {
    semanticConflictMap.set(sc.normalizedText, sc.id);
  }

  // Index duplicate groups
  const duplicateGroupMap = new Map<string, string>(); // normalizedText -> duplicateGroupId
  for (const dg of duplicateGroups) {
    duplicateGroupMap.set(dg.normalizedText, dg.id);
  }

  // Directional metadata map by file and line
  const directionalByFileLine = new Map<string, DirectionalMigrationMetadata>();
  for (const d of directionalInventory) {
    if (d.risk === 'MUST_MIGRATE') {
      const key = `${d.file}:${d.line}`;
      directionalByFileLine.set(key, {
        originalPhysicalDirection: d.className,
        recommendedLogicalDirection: d.suggestedReplacement || '',
        risk: d.risk,
        reviewRequired: true,
        file: d.file,
        line: d.line,
        contextSnippet: d.contextSnippet,
      });
    }
  }

  const catalogEntries: Record<string, TranslationCatalogEntry> = {};

  // Group candidate entries by their proposedTranslationKey
  const keyGroupMap = new Map<string, CatalogEntry[]>();
  for (const entry of entries) {
    // Only process real user-facing, likely user-facing, or ambiguous/protected entries
    if (entry.classification === 'TECHNICAL' || entry.classification === 'NON_USER_FACING' || entry.classification === 'COMMENT') {
      continue;
    }
    const k = entry.proposedTranslationKey;
    if (!keyGroupMap.has(k)) {
      keyGroupMap.set(k, []);
    }
    keyGroupMap.get(k)!.push(entry);
  }

  let translatedCount = 0;
  let untranslatedCount = 0;
  let reviewRequiredCount = 0;
  let ambiguousCount = 0;
  let protectedCount = 0;
  let interpolationCount = 0;
  let pluralizationCount = 0;
  let highRiskEntries = 0;

  let typeA_count = 0;
  let typeB_count = 0;
  let typeC_count = 0;
  let typeD_count = 0;

  const categoryStats: Record<SemanticCategory, { total: number; translated: number; untranslated: number; reviewRequired: number; ambiguous: number; protected: number }> =
    {} as any;

  for (const key of Array.from(keyGroupMap.keys()).sort()) {
    const occurrences = keyGroupMap.get(key)!;
    const firstOcc = occurrences[0];
    const category = firstOcc.semanticCategory;

    if (!categoryStats[category]) {
      categoryStats[category] = { total: 0, translated: 0, untranslated: 0, reviewRequired: 0, ambiguous: 0, protected: 0 };
    }

    // Canonical Arabic source text: preserved exactly from code
    const sourceTextAr = firstOcc.originalText;
    const normalizedText = firstOcc.normalizedText;

    // Collect all source references
    const sourceReferences = occurrences.map((o) => ({
      file: o.sourceFile,
      line: o.sourceLine,
      column: o.sourceColumn,
      element: o.semanticContext,
    }));

    // Interpolation detection
    const interpolationParams = extractInterpolationParams(sourceTextAr);
    if (interpolationParams.length > 0) {
      interpolationCount++;
    }

    // Pluralization detection
    const pluralRequired = requiresPluralization(sourceTextAr, interpolationParams);
    if (pluralRequired) {
      pluralizationCount++;
    }

    // Protected tokens detection
    const protectedTokens = identifyProtectedTokens(sourceTextAr);

    // Duplicate classification
    const dupGroupId = duplicateGroupMap.get(normalizedText);
    const semConflictId = semanticConflictMap.get(normalizedText);

    let duplicateClassification: DuplicateClassification | undefined;
    if (semConflictId) {
      duplicateClassification = 'B_DIFFERENT_MEANING_SAME_TEXT';
      typeB_count++;
    } else if (occurrences.length > 1) {
      const distinctCats = new Set(occurrences.map((o) => o.semanticCategory));
      if (distinctCats.size === 1) {
        duplicateClassification = 'A_EXACT_SAME_MEANING';
        typeA_count++;
      } else {
        duplicateClassification = 'D_UNCERTAIN';
        typeD_count++;
      }
    } else if (/[.,!?:;]/.test(sourceTextAr)) {
      duplicateClassification = 'C_FORMAT_PUNCTUATION_VARIATION';
      typeC_count++;
    }

    // Report / Export field separation
    const isReportOrExportField =
      category === 'reports' ||
      key.includes('.columns.') ||
      key.includes('.fields.') ||
      key.includes('.filters.');
    const internalDataKey = isReportOrExportField ? deriveInternalDataKey(key, sourceTextAr) : undefined;
    const presentationLabel = isReportOrExportField ? sourceTextAr : undefined;

    // Directional metadata if any source reference intersects with directional class
    let directionalMetadata: DirectionalMigrationMetadata | undefined;
    for (const ref of sourceReferences) {
      if (ref.line) {
        const dMeta = directionalByFileLine.get(`${ref.file}:${ref.line}`);
        if (dMeta) {
          directionalMetadata = dMeta;
          break;
        }
      }
    }

    // Check Phase 1 foundation vocabulary
    const foundationMatch = FOUNDATION_VOCABULARY[key];
    const isFoundationGeneric = foundationMatch && foundationMatch.ar === sourceTextAr;

    let sourceTextEn: string | null = null;
    let sourceTextUr: string | null = null;
    let reviewStatus: TranslationReviewStatus = 'REVIEW_REQUIRED';
    let migrationRisk: MigrationRisk = firstOcc.migrationRisk;
    const notes: string[] = [];

    if (interpolationParams.length > 0) {
      notes.push(`Preserve dynamic parameters: {${interpolationParams.join(', ')}}`);
      migrationRisk = 'HIGH';
    }

    if (pluralRequired) {
      notes.push('Quantity detected: Requires 6 Arabic plural forms (zero, one, two, few, many, other)');
    }

    if (protectedTokens.length > 0) {
      notes.push(`Protected business/currency tokens: [${protectedTokens.join(', ')}] must not be altered`);
    }

    if (semConflictId) {
      notes.push(`Semantic conflict group ${semConflictId}: Retained distinct key "${key}" to avoid accidental merge.`);
    }

    // Classification & Translation Slot status
    let statusAr: any = 'TRANSLATED';
    let statusEn: any = 'UNTRANSLATED';
    let statusUr: any = 'UNTRANSLATED';
    let confEn: any = 'LOW';
    let confUr: any = 'LOW';

    if (isFoundationGeneric) {
      sourceTextEn = foundationMatch.en;
      sourceTextUr = foundationMatch.ur;
      statusEn = 'TRANSLATED';
      statusUr = 'TRANSLATED';
      confEn = 'HIGH';
      confUr = 'HIGH';
      reviewStatus = 'APPROVED';
      translatedCount++;
      categoryStats[category].translated++;
    } else if (firstOcc.classification === 'AMBIGUOUS') {
      reviewStatus = 'AMBIGUOUS';
      statusEn = 'AMBIGUOUS';
      statusUr = 'AMBIGUOUS';
      ambiguousCount++;
      categoryStats[category].ambiguous++;
      notes.push('Ambiguous/isolated string: Human verification required before translation.');
    } else if (protectedTokens.length > 0 && protectedTokens.includes(sourceTextAr)) {
      reviewStatus = 'PROTECTED';
      statusEn = 'PROTECTED';
      statusUr = 'PROTECTED';
      protectedCount++;
      categoryStats[category].protected++;
      notes.push('Pure technical identifier/code: Translation NOT applicable.');
    } else {
      untranslatedCount++;
      reviewRequiredCount++;
      categoryStats[category].untranslated++;
      categoryStats[category].reviewRequired++;
    }

    if (migrationRisk === 'HIGH' || migrationRisk === 'CRITICAL') {
      highRiskEntries++;
    }

    categoryStats[category].total++;

    const entryItem: TranslationCatalogEntry = {
      key,
      category,
      semanticContext: firstOcc.semanticContext,
      sourceTextAr,
      sourceTextEn,
      sourceTextUr,
      translations: {
        ar: {
          text: sourceTextAr,
          status: statusAr,
          confidence: 'HIGH',
        },
        en: {
          text: sourceTextEn,
          status: statusEn,
          confidence: confEn,
          notes: isFoundationGeneric ? 'Phase 1 Foundation vocabulary' : 'Requires professional translator review',
        },
        ur: {
          text: sourceTextUr,
          status: statusUr,
          confidence: confUr,
          notes: isFoundationGeneric ? 'Phase 1 Foundation vocabulary' : 'Requires professional translator review',
        },
      },
      description: `${category} > ${firstOcc.semanticContext}`,
      interpolationParams,
      pluralizationRequired: pluralRequired,
      pluralFormsRequired: ARABIC_PLURAL_FORMS,
      reviewStatus,
      translationConfidence: isFoundationGeneric ? 'HIGH' : 'LOW',
      migrationRisk,
      protectedTokens,
      sourceReferences,
      duplicateGroupId: dupGroupId,
      duplicateClassification,
      semanticConflictGroupId: semConflictId,
      isReportOrExportField,
      internalDataKey,
      presentationLabel,
      directionalMetadata,
      notes,
    };

    catalogEntries[key] = entryItem;
  }

  // Build the 12 domain review queues
  const domainReviewQueues: Record<string, DomainReviewQueueItem[]> = {};
  for (const domain of MANDATORY_DOMAIN_QUEUES) {
    domainReviewQueues[domain] = [];
  }

  for (const [key, entry] of Object.entries(catalogEntries)) {
    if (entry.reviewStatus === 'REVIEW_REQUIRED' || entry.reviewStatus === 'AMBIGUOUS') {
      const cat = entry.category;
      if (domainReviewQueues[cat]) {
        domainReviewQueues[cat].push({
          key,
          category: cat,
          sourceTextAr: entry.sourceTextAr,
          context: entry.semanticContext,
          sourceFiles: entry.sourceReferences.map((r) => `${r.file}:${r.line || 0}`).slice(0, 5),
          priority: entry.migrationRisk === 'CRITICAL' ? 'CRITICAL' : entry.migrationRisk === 'HIGH' ? 'HIGH' : 'MEDIUM',
          reviewReason: entry.semanticConflictGroupId
            ? 'Semantic conflict isolation'
            : entry.interpolationParams.length > 0
            ? 'Dynamic interpolation placeholders'
            : 'Domain-specific terminology translation',
          protectedTokens: entry.protectedTokens.length > 0 ? entry.protectedTokens : undefined,
          interpolationParams: entry.interpolationParams.length > 0 ? entry.interpolationParams : undefined,
        });
      }
    }
  }

  // Directional migration queue
  const directionalMustMigrateItems = directionalInventory
    .filter((d) => d.risk === 'MUST_MIGRATE')
    .map((d) => ({
      originalPhysicalDirection: d.className,
      recommendedLogicalDirection: d.suggestedReplacement || '',
      risk: d.risk,
      reviewRequired: true,
      file: d.file,
      line: d.line,
      contextSnippet: d.contextSnippet,
    }));

  const totalEntries = Object.keys(catalogEntries).length;

  const summary: TranslationCatalogSummary = {
    totalCatalogEntries: totalEntries,
    translatedCount,
    untranslatedCount,
    reviewRequiredCount,
    ambiguousCount,
    protectedCount,
    interpolationCount,
    pluralizationCount,
    duplicateSharingCandidates: typeA_count,
    semanticConflictCount: semanticConflicts.length,
    highRiskEntries,
    directionalMigrationQueue: directionalMustMigrateItems.length,
    categoryStatistics: categoryStats,
  };

  return {
    generatedAt: new Date().toISOString(),
    version: '1.0.0-block42',
    summary,
    duplicateGroupsSummary: {
      totalGroups: duplicateGroups.length,
      typeA_exactSameMeaning: typeA_count,
      typeB_differentMeaning: typeB_count,
      typeC_formatVariation: typeC_count,
      typeD_uncertain: typeD_count,
    },
    directionalMigrationQueue: {
      total: directionalMustMigrateItems.length,
      items: directionalMustMigrateItems,
    },
    domainReviewQueues,
    entries: catalogEntries,
  };
}

/**
 * Formats the comprehensive Markdown catalog report
 */
export function formatTranslationCatalogMarkdown(catalog: ProductionTranslationCatalog): string {
  const { summary, duplicateGroupsSummary, directionalMigrationQueue } = catalog;

  let md = `# Production Translation Catalog & Semantic Review Report (BLOCK 42)\n\n`;
  md += `**Generated At:** ${catalog.generatedAt}\n`;
  md += `**Catalog Version:** ${catalog.version}\n`;
  md += `**Canonical Source Language:** Arabic (\`ar\`) — 100% Preserved Invariance\n`;
  md += `**Target Languages:** English (\`en\`), Urdu (\`ur\`)\n\n`;

  md += `## 1. Executive Catalog Metrics\n\n`;
  md += `| Metric | Count | Description |\n`;
  md += `| :--- | :--- | :--- |\n`;
  md += `| **Total Unique Catalog Keys** | **${summary.totalCatalogEntries}** | Distinct semantic translation keys generated |\n`;
  md += `| **Translated Keys (Phase 1 Foundation)** | **${summary.translatedCount}** | Approved canonical terms (ar, en, ur verified) |\n`;
  md += `| **Untranslated Slots (Pending Review)** | **${summary.untranslatedCount}** | Explicitly flagged for professional human review |\n`;
  md += `| **Review Required Keys** | **${summary.reviewRequiredCount}** | Domain terminology requiring semantic verification |\n`;
  md += `| **Ambiguous Keys Isolated** | **${summary.ambiguousCount}** | Short tokens or codes quarantined from auto-translation |\n`;
  md += `| **Protected Business Tokens** | **${summary.protectedCount}** | Database identifiers, formulas, units, currencies |\n`;
  md += `| **Interpolation Placeholders** | **${summary.interpolationCount}** | Dynamic parameters (e.g. \`{count}\`) strictly preserved |\n`;
  md += `| **Pluralization Requirements** | **${summary.pluralizationCount}** | Expressions requiring 6 Arabic plural forms |\n`;
  md += `| **Semantic Conflicts Isolated** | **${summary.semanticConflictCount}** | Identical texts split into separate contextual keys |\n`;
  md += `| **Duplicate Groups (Type A Sharing)** | **${duplicateGroupsSummary.typeA_exactSameMeaning}** | Safe identical-context key reuse candidates |\n`;
  md += `| **Directional Migration Queue** | **${directionalMigrationQueue.total}** | Physical Tailwind classes flagged for RTL/LTR migration |\n\n`;

  md += `## 2. Category Distribution & Translation Readiness\n\n`;
  md += `| Category | Total Keys | Translated | Untranslated | Review Required | Ambiguous |\n`;
  md += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;
  for (const [cat, stats] of Object.entries(summary.categoryStatistics).sort((a, b) => b[1].total - a[1].total)) {
    md += `| \`${cat}\` | ${stats.total} | ${stats.translated} | ${stats.untranslated} | ${stats.reviewRequired} | ${stats.ambiguous} |\n`;
  }
  md += `\n`;

  md += `## 3. Semantic Conflict Separation (Sample)\n\n`;
  md += `Identical Arabic terms separated into distinct keys based on operational context to prevent catastrophic UI or business conflation:\n\n`;
  md += `| Key | Arabic Source | Category | Semantic Context | Review Status |\n`;
  md += `| :--- | :--- | :--- | :--- | :--- |\n`;
  let scPrinted = 0;
  for (const entry of Object.values(catalog.entries)) {
    if (entry.semanticConflictGroupId && scPrinted < 15) {
      md += `| \`${entry.key}\` | "${entry.sourceTextAr}" | \`${entry.category}\` | ${entry.semanticContext} | \`${entry.reviewStatus}\` |\n`;
      scPrinted++;
    }
  }
  md += `\n`;

  md += `## 4. Directional Migration Queue (First 15 Items)\n\n`;
  md += `| File | Line | Physical Class | Recommended Logical Class | Risk |\n`;
  md += `| :--- | :--- | :--- | :--- | :--- |\n`;
  for (const item of directionalMigrationQueue.items.slice(0, 15)) {
    md += `| \`${item.file}\` | ${item.line} | \`${item.originalPhysicalDirection}\` | \`${item.recommendedLogicalDirection}\` | \`${item.risk}\` |\n`;
  }
  md += `\n`;

  md += `## 5. Non-Destructive Invariance Guarantees\n\n`;
  md += `- **No Application Strings Modified:** Arabic UI strings remain 100% identical.\n`;
  md += `- **No Codemod Executed:** Components continue serving literal strings in production.\n`;
  md += `- **Complete Key Alignment:** 100% of keys exist in all 3 language slots with explicit status.\n`;
  md += `- **Business Data Intact:** Calculations, Firestore, pricing, reports, and weight state machines remain untouched.\n`;

  return md;
}

/**
 * Formats the concise human-review queue report
 */
export function formatTranslationReviewMarkdown(catalog: ProductionTranslationCatalog): string {
  const { domainReviewQueues } = catalog;

  let md = `# Professional Translation Review Queue (BLOCK 42)\n\n`;
  md += `This document contains domain-specific terminology requiring human verification and professional translation.\n`;
  md += `**Instructions:** Review Arabic canonical terminology, provide precise English and Urdu terms, and maintain parameter names.\n\n`;

  for (const [domain, items] of Object.entries(domainReviewQueues)) {
    md += `## Domain: \`${domain}\` (${items.length} items requiring review)\n\n`;
    if (items.length === 0) {
      md += `*No review items pending in this domain.*\n\n`;
      continue;
    }

    md += `| Key | Arabic Source | Context | Priority | Reason & Placeholders |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- |\n`;
    for (const item of items.slice(0, 20)) {
      const extra = [];
      if (item.interpolationParams) extra.push(`Params: {${item.interpolationParams.join(',')}}`);
      if (item.protectedTokens) extra.push(`Protected: [${item.protectedTokens.join(',')}]`);
      const extraStr = extra.length > 0 ? ` (${extra.join('; ')})` : '';
      md += `| \`${item.key}\` | "${item.sourceTextAr}" | ${item.context} | \`${item.priority}\` | ${item.reviewReason}${extraStr} |\n`;
    }
    if (items.length > 20) {
      md += `| ... | *and ${items.length - 20} more items in this domain queue* | | | |\n`;
    }
    md += `\n`;
  }

  return md;
}

/**
 * Writes reports to reports/ directory
 */
export function writeProductionCatalogReports(
  catalog: ProductionTranslationCatalog,
  outputDir = path.resolve(process.cwd(), 'reports')
): void {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const jsonPath = path.join(outputDir, 'i18n-translation-catalog.json');
  const mdCatalogPath = path.join(outputDir, 'i18n-translation-catalog.md');
  const mdReviewPath = path.join(outputDir, 'i18n-translation-review.md');

  fs.writeFileSync(jsonPath, JSON.stringify(catalog, null, 2), 'utf-8');
  fs.writeFileSync(mdCatalogPath, formatTranslationCatalogMarkdown(catalog), 'utf-8');
  fs.writeFileSync(mdReviewPath, formatTranslationReviewMarkdown(catalog), 'utf-8');
}
