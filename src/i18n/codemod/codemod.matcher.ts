/**
 * BLOCK 44 — Safe Automated i18n Codemod Engine
 * Catalog Matcher & Indexing Service
 */

import fs from 'fs';
import path from 'path';
import { TranslationCatalogEntry, ProductionTranslationCatalog } from '../catalog/translationCatalog.types';
import { TranslationProposal, ProductionGeneratedCatalog } from '../translation/translation.types';
import {
  PROTECTED_BUSINESS_TOKENS,
  PROTECTED_STATUS_CODES,
  SHARED_ACTION_KEY_MAPPINGS,
} from './codemod.constants';

export interface MatchResult {
  matched: boolean;
  proposal?: TranslationProposal;
  catalogEntry?: TranslationCatalogEntry;
  key?: string;
  isUnique: boolean;
  hasSemanticConflict: boolean;
  isReportOrExport: boolean;
  isSharedAction: boolean;
  isProtectedToken: boolean;
  hasValidTranslations: boolean;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  reasons: string[];
}

export class CodemodCatalogMatcher {
  private static instance: CodemodCatalogMatcher | null = null;

  private keyToProposal: Map<string, TranslationProposal> = new Map();
  private keyToCatalogEntry: Map<string, TranslationCatalogEntry> = new Map();
  private textToProposals: Map<string, TranslationProposal[]> = new Map();
  private sourceRefIndex: Map<string, TranslationProposal[]> = new Map();
  private conflictGroupKeys: Set<string> = new Set();
  private reportExportKeys: Set<string> = new Set();
  private isLoaded = false;

  public static getInstance(): CodemodCatalogMatcher {
    if (!CodemodCatalogMatcher.instance) {
      CodemodCatalogMatcher.instance = new CodemodCatalogMatcher();
    }
    return CodemodCatalogMatcher.instance;
  }

  /**
   * Initializes or reloads indexes from disk reports.
   */
  public loadCatalogs(
    options: {
      translationCatalogPath?: string;
      generatedTranslationsPath?: string;
      silent?: boolean;
    } = {}
  ): void {
    const cwd = process.cwd();
    const transCatalogPath =
      options.translationCatalogPath || path.join(cwd, 'reports/i18n-translation-catalog.json');
    const genTranslationsPath =
      options.generatedTranslationsPath || path.join(cwd, 'reports/i18n-generated-translations.json');

    this.keyToProposal.clear();
    this.keyToCatalogEntry.clear();
    this.textToProposals.clear();
    this.sourceRefIndex.clear();
    this.conflictGroupKeys.clear();
    this.reportExportKeys.clear();

    // 1. Load Translation Catalog if exists
    if (fs.existsSync(transCatalogPath)) {
      try {
        const raw = fs.readFileSync(transCatalogPath, 'utf-8');
        const parsed: ProductionTranslationCatalog = JSON.parse(raw);
        if (parsed && parsed.entries) {
          for (const [key, entry] of Object.entries(parsed.entries)) {
            this.keyToCatalogEntry.set(key, entry);
            if (entry.semanticConflictGroupId) {
              this.conflictGroupKeys.add(key);
            }
            if (entry.isReportOrExportField) {
              this.reportExportKeys.add(key);
            }
          }
        }
      } catch (err) {
        if (!options.silent) {
          console.warn('[CodemodCatalogMatcher] Failed to parse translation catalog:', err);
        }
      }
    }

    // 2. Load Generated Translations
    if (fs.existsSync(genTranslationsPath)) {
      try {
        const raw = fs.readFileSync(genTranslationsPath, 'utf-8');
        const parsed: ProductionGeneratedCatalog = JSON.parse(raw);
        if (parsed && parsed.proposals) {
          for (const [key, proposal] of Object.entries(parsed.proposals)) {
            this.keyToProposal.set(key, proposal);

            // Index by normalized Arabic text
            const normText = this.normalizeText(proposal.sourceTextAr);
            const existingTextList = this.textToProposals.get(normText) || [];
            existingTextList.push(proposal);
            this.textToProposals.set(normText, existingTextList);

            // Index by source references (file + line)
            if (proposal.sourceReferences && Array.isArray(proposal.sourceReferences)) {
              for (const ref of proposal.sourceReferences) {
                if (ref.file && ref.line !== undefined) {
                  const normFile = this.normalizeFilePath(ref.file);
                  const refKey = `${normFile}:${ref.line}`;
                  const existingRefList = this.sourceRefIndex.get(refKey) || [];
                  existingRefList.push(proposal);
                  this.sourceRefIndex.set(refKey, existingRefList);
                }
              }
            }

            if (proposal.semanticConflictGroupId) {
              this.conflictGroupKeys.add(key);
            }
            if (proposal.isReportOrExportField) {
              this.reportExportKeys.add(key);
            }
          }
        }
      } catch (err) {
        if (!options.silent) {
          console.warn('[CodemodCatalogMatcher] Failed to parse generated translations:', err);
        }
      }
    }

    this.isLoaded = true;
  }

  public ensureLoaded(): void {
    if (!this.isLoaded) {
      this.loadCatalogs({ silent: true });
    }
  }

  /**
   * Primary matching algorithm:
   * 1. Check shared action whitelist.
   * 2. Try exact file + line reference.
   * 3. Try exact normalized Arabic text match.
   * 4. Verify uniqueness and absence of unresolved semantic conflicts.
   */
  public match(
    filePath: string,
    line: number,
    text: string,
    context?: string
  ): MatchResult {
    this.ensureLoaded();

    const trimmedText = text.trim();
    const normText = this.normalizeText(trimmedText);
    const normFile = this.normalizeFilePath(filePath);

    const reasons: string[] = [];

    // Check if protected status code
    if (PROTECTED_STATUS_CODES.has(trimmedText)) {
      return {
        matched: false,
        isUnique: false,
        hasSemanticConflict: false,
        isReportOrExport: false,
        isSharedAction: false,
        isProtectedToken: true,
        hasValidTranslations: false,
        confidence: 'LOW',
        reasons: ['PROTECTED_STATUS_CODE'],
      };
    }

    // Check if protected business token
    if (PROTECTED_BUSINESS_TOKENS.has(trimmedText)) {
      return {
        matched: false,
        isUnique: false,
        hasSemanticConflict: false,
        isReportOrExport: false,
        isSharedAction: false,
        isProtectedToken: true,
        hasValidTranslations: false,
        confidence: 'LOW',
        reasons: ['PROTECTED_BUSINESS_TOKEN'],
      };
    }

    // 1. Shared Action Check (e.g. حفظ, إلغاء)
    if (SHARED_ACTION_KEY_MAPPINGS[trimmedText]) {
      const sharedKey = SHARED_ACTION_KEY_MAPPINGS[trimmedText];
      const proposal = this.keyToProposal.get(sharedKey);
      const catalogEntry = this.keyToCatalogEntry.get(sharedKey);

      return {
        matched: true,
        proposal,
        catalogEntry,
        key: sharedKey,
        isUnique: true,
        hasSemanticConflict: false,
        isReportOrExport: false,
        isSharedAction: true,
        isProtectedToken: false,
        hasValidTranslations: true,
        confidence: 'HIGH',
        reasons: ['SHARED_ACTION_MATCH'],
      };
    }

    // 2. Exact File + Line Match
    const refKey = `${normFile}:${line}`;
    const fileLineMatches = this.sourceRefIndex.get(refKey);

    if (fileLineMatches && fileLineMatches.length > 0) {
      // Find candidate with matching text
      const exactMatch = fileLineMatches.find(
        (p) => this.normalizeText(p.sourceTextAr) === normText
      );
      if (exactMatch) {
        const isConflict = this.conflictGroupKeys.has(exactMatch.key);
        const isReport = this.reportExportKeys.has(exactMatch.key);
        const validTrans = this.checkValidTranslations(exactMatch.key);

        if (isConflict) reasons.push('SEMANTIC_CONFLICT');
        if (isReport) reasons.push('REPORT_EXPORT_FIELD');

        return {
          matched: true,
          proposal: exactMatch,
          catalogEntry: this.keyToCatalogEntry.get(exactMatch.key),
          key: exactMatch.key,
          isUnique: true,
          hasSemanticConflict: isConflict,
          isReportOrExport: isReport,
          isSharedAction: false,
          isProtectedToken: false,
          hasValidTranslations: validTrans,
          confidence: isConflict ? 'LOW' : 'HIGH',
          reasons,
        };
      }
    }

    // 3. Normalized Arabic Text Match across catalog
    const textMatches = this.textToProposals.get(normText);
    if (textMatches && textMatches.length > 0) {
      if (textMatches.length === 1) {
        const singleMatch = textMatches[0];
        const isConflict = this.conflictGroupKeys.has(singleMatch.key);
        const isReport = this.reportExportKeys.has(singleMatch.key);
        const validTrans = this.checkValidTranslations(singleMatch.key);

        if (isConflict) reasons.push('SEMANTIC_CONFLICT');
        if (isReport) reasons.push('REPORT_EXPORT_FIELD');

        return {
          matched: true,
          proposal: singleMatch,
          catalogEntry: this.keyToCatalogEntry.get(singleMatch.key),
          key: singleMatch.key,
          isUnique: true,
          hasSemanticConflict: isConflict,
          isReportOrExport: isReport,
          isSharedAction: false,
          isProtectedToken: false,
          hasValidTranslations: validTrans,
          confidence: isConflict ? 'LOW' : 'MEDIUM',
          reasons,
        };
      } else {
        // Multiple proposals for this text! Check if they are unified or in conflict.
        const uniqueKeys = Array.from(new Set(textMatches.map((m) => m.key)));
        if (uniqueKeys.length === 1) {
          const key = uniqueKeys[0];
          const isConflict = this.conflictGroupKeys.has(key);
          const isReport = this.reportExportKeys.has(key);

          return {
            matched: true,
            proposal: textMatches[0],
            catalogEntry: this.keyToCatalogEntry.get(key),
            key,
            isUnique: true,
            hasSemanticConflict: isConflict,
            isReportOrExport: isReport,
            isSharedAction: false,
            isProtectedToken: false,
            hasValidTranslations: this.checkValidTranslations(key),
            confidence: 'MEDIUM',
            reasons: ['UNIFIED_DUPLICATE_GROUP'],
          };
        }

        // Semantic ambiguity across distinct keys
        reasons.push('AMBIGUOUS_MULTIPLE_KEYS');
        return {
          matched: true,
          proposal: textMatches[0],
          catalogEntry: this.keyToCatalogEntry.get(textMatches[0].key),
          key: textMatches[0].key,
          isUnique: false,
          hasSemanticConflict: true,
          isReportOrExport: false,
          isSharedAction: false,
          isProtectedToken: false,
          hasValidTranslations: false,
          confidence: 'LOW',
          reasons,
        };
      }
    }

    return {
      matched: false,
      isUnique: false,
      hasSemanticConflict: false,
      isReportOrExport: false,
      isSharedAction: false,
      isProtectedToken: false,
      hasValidTranslations: false,
      confidence: 'LOW',
      reasons: ['NOT_IN_CATALOG'],
    };
  }

  public getProposal(key: string): TranslationProposal | undefined {
    this.ensureLoaded();
    return this.keyToProposal.get(key);
  }

  public getCatalogEntry(key: string): TranslationCatalogEntry | undefined {
    this.ensureLoaded();
    return this.keyToCatalogEntry.get(key);
  }

  public checkValidTranslations(key: string): boolean {
    const proposal = this.keyToProposal.get(key);
    if (proposal) {
      return (
        proposal.sourceTextAr !== '' &&
        proposal.proposedTextEn !== null &&
        proposal.proposedTextUr !== null
      );
    }
    const cat = this.keyToCatalogEntry.get(key);
    if (cat) {
      return Boolean(cat.translations.ar && cat.translations.en && cat.translations.ur);
    }
    return false;
  }

  private normalizeText(text: string): string {
    return text.trim().replace(/\s+/g, ' ');
  }

  private normalizeFilePath(filePath: string): string {
    return filePath.replace(/\\/g, '/').replace(/^\.\//, '');
  }
}
