/**
 * BLOCK 41 — i18n Catalog Deduplication & Semantic Conflict Detection
 */

import {
  CatalogEntry,
  DuplicateGroup,
  SemanticConflictGroup,
  SemanticConflictContext,
} from './catalog.types';

/**
 * Normalizes text for comparison while strictly preserving semantic distinctions.
 * - Trims whitespace
 * - Collapses internal consecutive whitespace/newlines
 * - Unicode NFKC normalization
 * - Trims trailing/leading non-semantic punctuation (colons, dashes, bullet points)
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFKC')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[:\-\u2022\u25CF\s]+|[:\-\u2022\u25CF\s]+$/g, '')
    .trim();
}

/**
 * Creates deterministic duplicate groups from catalog entries.
 */
export function groupDuplicates(entries: CatalogEntry[]): DuplicateGroup[] {
  const map = new Map<string, CatalogEntry[]>();

  for (const entry of entries) {
    const norm = entry.normalizedText || normalizeText(entry.originalText);
    if (!norm) continue;

    const existing = map.get(norm);
    if (existing) {
      existing.push(entry);
    } else {
      map.set(norm, [entry]);
    }
  }

  const groups: DuplicateGroup[] = [];

  for (const [norm, groupEntries] of map.entries()) {
    if (groupEntries.length <= 1) continue; // Only actual duplicates (> 1 occurrence)

    const files = Array.from(new Set(groupEntries.map((e) => e.sourceFile))).sort();
    const categories = Array.from(new Set(groupEntries.map((e) => e.semanticCategory))).sort();
    const isCrossCategory = categories.length > 1;

    // Distinct proposed keys in this group
    const distinctProposedKeys = Array.from(
      new Set(groupEntries.map((e) => e.proposedTranslationKey))
    ).sort();

    // Deterministic group ID
    const safeSlug = norm.slice(0, 30).replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_');
    const groupId = `dup_${safeSlug}_${groupEntries.length}`;

    // Tag the entries with the duplicate group ID
    for (const entry of groupEntries) {
      entry.duplicateGroupId = groupId;
    }

    groups.push({
      id: groupId,
      normalizedText: norm,
      entriesCount: groupEntries.length,
      files,
      categories,
      isCrossCategory,
      isSemanticDuplicate: !isCrossCategory || distinctProposedKeys.length === 1,
      distinctProposedKeys,
    });
  }

  // Sort groups deterministically by occurrences descending, then text
  return groups.sort((a, b) => b.entriesCount - a.entriesCount || a.normalizedText.localeCompare(b.normalizedText));
}

/**
 * Identifies semantic conflicts where identical text has different meanings in different contexts,
 * e.g., "إلغاء" in generic action vs. trip cancellation vs. import cancellation.
 */
export function identifySemanticConflicts(entries: CatalogEntry[]): SemanticConflictGroup[] {
  const normMap = new Map<string, CatalogEntry[]>();

  for (const entry of entries) {
    if (!entry.isUserFacing) continue;
    const norm = entry.normalizedText || normalizeText(entry.originalText);
    if (!norm) continue;

    const list = normMap.get(norm);
    if (list) {
      list.push(entry);
    } else {
      normMap.set(norm, [entry]);
    }
  }

  const conflicts: SemanticConflictGroup[] = [];

  for (const [norm, groupEntries] of normMap.entries()) {
    // Group by category and context
    const contextMap = new Map<string, SemanticConflictContext>();

    for (const entry of groupEntries) {
      const key = `${entry.semanticCategory}::${entry.semanticContext}::${entry.proposedTranslationKey}`;
      const existing = contextMap.get(key);
      if (existing) {
        existing.occurrenceCount++;
        if (!existing.files.includes(entry.sourceFile)) {
          existing.files.push(entry.sourceFile);
        }
      } else {
        contextMap.set(key, {
          category: entry.semanticCategory,
          context: entry.semanticContext,
          proposedKey: entry.proposedTranslationKey,
          files: [entry.sourceFile],
          occurrenceCount: 1,
        });
      }
    }

    // A semantic conflict exists if identical text maps to multiple distinct proposed translation keys
    // OR spans multiple distinct non-shared semantic categories
    const contexts = Array.from(contextMap.values());
    const distinctKeys = new Set(contexts.map((c) => c.proposedKey));

    if (distinctKeys.size > 1) {
      const safeSlug = norm.slice(0, 30).replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_');
      const conflictId = `conflict_${safeSlug}`;

      let reason = `Identical string "${norm}" occurs in multiple semantic contexts with distinct keys (${Array.from(distinctKeys).join(', ')}).`;
      if (contexts.some((c) => c.category === 'trips') && contexts.some((c) => c.category === 'shared')) {
        reason += ' Requires distinct contextual key separation to prevent domain coupling.';
      }

      conflicts.push({
        id: conflictId,
        normalizedText: norm,
        occurrences: groupEntries.length,
        contexts,
        reason,
      });
    }
  }

  return conflicts.sort((a, b) => b.occurrences - a.occurrences || a.normalizedText.localeCompare(b.normalizedText));
}
