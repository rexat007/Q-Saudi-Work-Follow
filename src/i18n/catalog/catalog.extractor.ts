/**
 * BLOCK 41 — i18n Source Analysis & Catalog Extractor
 * Safely parses TypeScript and TSX ASTs to extract catalog entries and directional classes.
 */

import ts from 'typescript';
import fs from 'fs';
import path from 'path';
import {
  CatalogEntry,
  DirectionalClassUsage,
  DirectionalClassRisk,
  SemanticCategory,
  SpecialCaseType,
} from './catalog.types';
import {
  DIRECTIONAL_CLASS_PREFIXES,
  DIRECTIONAL_ICONS,
  USER_FACING_ATTRIBUTES,
  TECHNICAL_ATTRIBUTES,
  PROTECTED_BUSINESS_TOKENS,
  PRESENTATION_UNIT_CURRENCY_MAP,
} from './catalog.constants';
import { classifyCandidate, containsArabic, isPureTechnicalToken } from './catalog.classifier';
import { normalizeText } from './catalog.deduper';
import { KeyGenerator } from './catalog.keyGenerator';

/**
 * Deterministic 32-bit FNV-1a hash
 */
export function deterministicHash(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Derives the SemanticCategory based on the file path and context
 */
export function inferCategoryFromPath(filePath: string): SemanticCategory {
  const norm = filePath.replace(/\\/g, '/').toLowerCase();

  if (norm.includes('unloading')) return 'unloading';
  if (norm.includes('loading')) return 'loading';
  if (norm.includes('weight') || norm.includes('weighbridge') || norm.includes('scale')) return 'weighbridge';
  if (norm.includes('pricing') || norm.includes('settlement') || norm.includes('rate')) return 'pricing';
  if (norm.includes('report')) return 'reports';
  if (norm.includes('import') || norm.includes('excel') || norm.includes('csv')) return 'imports';
  if (norm.includes('offline') || norm.includes('pwa') || norm.includes('outbox') || norm.includes('sync')) return 'offline';
  if (norm.includes('security') || norm.includes('audit') || norm.includes('admin')) return 'security';
  if (norm.includes('exception') || norm.includes('incident')) return 'exceptions';
  if (norm.includes('dataquality') || norm.includes('entityresolution') || norm.includes('resolution')) return 'entityResolution';
  if (norm.includes('trip')) return 'trips';
  if (norm.includes('project')) return 'projects';
  if (norm.includes('carrier')) return 'carriers';
  if (norm.includes('truck')) return 'trucks';
  if (norm.includes('driver')) return 'drivers';
  if (norm.includes('material')) return 'materials';
  if (norm.includes('auth') || norm.includes('login')) return 'authentication';
  if (norm.includes('app.tsx') || norm.includes('workspace') || norm.includes('navigation') || norm.includes('header') || norm.includes('sidebar') || norm.includes('nav')) return 'navigation';
  if (norm.includes('dashboard') || norm.includes('kpi') || norm.includes('overview')) return 'dashboard';
  if (norm.includes('migration')) return 'legacyMigration';
  if (norm.includes('validator') || norm.includes('validation')) return 'validation';
  if (norm.includes('shared') || norm.includes('components/ui') || norm.includes('common')) return 'shared';

  return 'other';
}

/**
 * Checks whether a class is a directional Tailwind utility
 */
export function isDirectionalTailwindClass(cls: string): boolean {
  if (cls === 'text-left' || cls === 'text-right') return true;
  if (/^p[lr]-([0-9]|px|\[)/.test(cls)) return true;
  if (/^m[lr]-([0-9]|px|auto|\[|-)/.test(cls)) return true;
  if (cls === 'border-l' || cls === 'border-r' || /^border-[lr]-([0-9]|px|\[)/.test(cls)) return true;
  if (/^(left|right)-([0-9]|px|auto|full|1\/|\[|-)/.test(cls)) return true;
  return false;
}

/**
 * Classifies the directional risk of a Tailwind class
 */
export function classifyDirectionalRisk(className: string, filePath: string): DirectionalClassRisk {
  // If file is explicitly LTR technical utility or code editor
  if (filePath.includes('i18nFoundation.test') || filePath.includes('codeEditor')) {
    return 'TECHNICAL';
  }

  // Pure directional classes that invert in RTL
  if (isDirectionalTailwindClass(className)) {
    return 'MUST_MIGRATE';
  }

  return 'PROBABLY_SAFE';
}

/**
 * Suggests standard logical Tailwind CSS replacement for directional classes
 */
export function getLogicalReplacement(className: string): string {
  if (className === 'text-left') return 'text-start';
  if (className === 'text-right') return 'text-end';
  if (className.startsWith('pl-')) return className.replace('pl-', 'ps-');
  if (className.startsWith('pr-')) return className.replace('pr-', 'pe-');
  if (className.startsWith('ml-')) return className.replace('ml-', 'ms-');
  if (className.startsWith('mr-')) return className.replace('mr-', 'me-');
  if (className === 'border-l') return 'border-s';
  if (className === 'border-r') return 'border-e';
  if (className.startsWith('border-l-')) return className.replace('border-l-', 'border-s-');
  if (className.startsWith('border-r-')) return className.replace('border-r-', 'border-e-');
  if (className.startsWith('left-')) return className.replace('left-', 'start-');
  if (className.startsWith('right-')) return className.replace('right-', 'end-');
  return className;
}

export interface ExtractorResult {
  entries: CatalogEntry[];
  directionalUsages: DirectionalClassUsage[];
  fileCount: number;
}

export class CatalogExtractor {
  private keyGen = new KeyGenerator();

  /**
   * Scans a list of source files or directories and extracts all catalog entries.
   */
  extractFromFiles(filePaths: string[]): ExtractorResult {
    this.keyGen.reset();
    const allEntries: CatalogEntry[] = [];
    const allDirectional: DirectionalClassUsage[] = [];

    for (const filePath of filePaths) {
      if (!fs.existsSync(filePath)) continue;
      const code = fs.readFileSync(filePath, 'utf-8');
      const relPath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');

      const isTsx = filePath.endsWith('.tsx');
      const sourceFile = ts.createSourceFile(
        filePath,
        code,
        ts.ScriptTarget.Latest,
        true,
        isTsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS
      );

      const fileCategory = inferCategoryFromPath(relPath);

      this.walkAst(sourceFile, sourceFile, relPath, fileCategory, allEntries, allDirectional);
    }

    return {
      entries: allEntries,
      directionalUsages: allDirectional,
      fileCount: filePaths.length,
    };
  }

  private walkAst(
    sourceFile: ts.SourceFile,
    node: ts.Node,
    relPath: string,
    fileCategory: SemanticCategory,
    entries: CatalogEntry[],
    directionalUsages: DirectionalClassUsage[]
  ): void {
    // 1. JSX Text
    if (ts.isJsxText(node)) {
      const rawText = node.getText(sourceFile);
      const text = rawText.replace(/\r?\n\s*/g, ' ').trim();

      if (text.length > 0 && !isPureTechnicalToken(text)) {
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
        this.processCandidate({
          text,
          sourceFile: relPath,
          sourceLine: line + 1,
          sourceColumn: character + 1,
          semanticCategory: fileCategory,
          semanticContext: 'jsx_text',
          isJsxText: true,
          entries,
        });
      }
    }

    // 2. JSX Attribute
    else if (ts.isJsxAttribute(node)) {
      const attrName = node.name.getText(sourceFile);
      const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));

      // Scan className for directional utilities
      if (attrName === 'className' && node.initializer && ts.isStringLiteral(node.initializer)) {
        const classStr = node.initializer.text;
        const classes = classStr.split(/\s+/);
        for (const cls of classes) {
          const isDirectional = DIRECTIONAL_CLASS_PREFIXES.some(
            (p) => cls === p || cls.startsWith(p)
          );
          if (isDirectional) {
            const risk = classifyDirectionalRisk(cls, relPath);
            directionalUsages.push({
              file: relPath,
              line: line + 1,
              column: character + 1,
              className: cls,
              type: cls.startsWith('text-')
                ? 'text-alignment'
                : cls.startsWith('p')
                ? 'padding'
                : cls.startsWith('m')
                ? 'margin'
                : cls.startsWith('border-')
                ? 'border'
                : 'position',
              risk,
              suggestedReplacement: getLogicalReplacement(cls),
              contextSnippet: classStr.slice(0, 50),
            });
          }
        }
      }

      // Check for user-facing string literals in attributes
      if (node.initializer && ts.isStringLiteral(node.initializer)) {
        const text = node.initializer.text.trim();
        if (text.length > 0) {
          this.processCandidate({
            text,
            sourceFile: relPath,
            sourceLine: line + 1,
            sourceColumn: character + 1,
            semanticCategory: fileCategory,
            semanticContext: `attr_${attrName}`,
            jsxAttributeName: attrName,
            entries,
          });
        }
      }
    }

    // 3. Directional Icon JSX Element
    else if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      const tagName = node.tagName.getText(sourceFile);
      if (DIRECTIONAL_ICONS.has(tagName)) {
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
        directionalUsages.push({
          file: relPath,
          line: line + 1,
          column: character + 1,
          className: tagName,
          type: 'icon',
          risk: 'MUST_MIGRATE',
          element: tagName,
          suggestedReplacement: `Logical directional flip required (e.g. rtl:rotate-180)`,
          contextSnippet: `<${tagName} />`,
        });
      }
    }

    // 4. String Literals in Call Expressions or Object Literals
    else if (ts.isStringLiteral(node)) {
      // Avoid re-processing JSX attributes
      if (!ts.isJsxAttribute(node.parent)) {
        const text = node.text.trim();
        if (text.length > 0 && !isPureTechnicalToken(text)) {
          const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));

          let callFunctionName: string | undefined;
          let parentObjectKey: string | undefined;
          let isPartOfBinaryConcatenation = false;

          // Check if parent is CallExpression (e.g. toast.error("..."))
          if (ts.isCallExpression(node.parent)) {
            callFunctionName = node.parent.expression.getText(sourceFile).split('.').pop();
          }

          // Check if parent is PropertyAssignment
          if (ts.isPropertyAssignment(node.parent)) {
            parentObjectKey = node.parent.name.getText(sourceFile);
          }

          // Check if parent is BinaryExpression with '+'
          if (ts.isBinaryExpression(node.parent) && node.parent.operatorToken.kind === ts.SyntaxKind.PlusToken) {
            isPartOfBinaryConcatenation = true;
          }

          this.processCandidate({
            text,
            sourceFile: relPath,
            sourceLine: line + 1,
            sourceColumn: character + 1,
            semanticCategory: fileCategory,
            semanticContext: callFunctionName ? `call_${callFunctionName}` : parentObjectKey ? `prop_${parentObjectKey}` : 'literal',
            callFunctionName,
            parentObjectKey,
            isPartOfBinaryConcatenation,
            entries,
          });
        }
      }
    }

    // 5. Template Literals
    else if (ts.isTemplateExpression(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const rawText = node.getText(sourceFile);
      if (containsArabic(rawText)) {
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
        const cleanText = rawText.replace(/^[`'"]|[`'"]$/g, '').trim();

        this.processCandidate({
          text: cleanText,
          sourceFile: relPath,
          sourceLine: line + 1,
          sourceColumn: character + 1,
          semanticCategory: fileCategory,
          semanticContext: 'template_literal',
          isTemplateLiteral: true,
          hasTemplateExpressions: ts.isTemplateExpression(node),
          entries,
        });
      }
    }

    // Continue AST traversal
    ts.forEachChild(node, (child) =>
      this.walkAst(sourceFile, child, relPath, fileCategory, entries, directionalUsages)
    );
  }

  private processCandidate(params: {
    text: string;
    sourceFile: string;
    sourceLine: number;
    sourceColumn: number;
    semanticCategory: SemanticCategory;
    semanticContext: string;
    isJsxText?: boolean;
    jsxAttributeName?: string;
    callFunctionName?: string;
    parentObjectKey?: string;
    isPartOfBinaryConcatenation?: boolean;
    isTemplateLiteral?: boolean;
    hasTemplateExpressions?: boolean;
    entries: CatalogEntry[];
  }): void {
    const { text, sourceFile, sourceLine, sourceColumn, semanticCategory, semanticContext } = params;

    const classificationResult = classifyCandidate({
      text,
      sourceFile,
      isJsxText: params.isJsxText,
      jsxAttributeName: params.jsxAttributeName,
      callFunctionName: params.callFunctionName,
      parentObjectKey: params.parentObjectKey,
      isPartOfBinaryConcatenation: params.isPartOfBinaryConcatenation,
      isTemplateLiteral: params.isTemplateLiteral,
      hasTemplateExpressions: params.hasTemplateExpressions,
    });

    const norm = normalizeText(text);
    const idHash = deterministicHash(`${sourceFile}:${sourceLine}:${sourceColumn}:${norm}`);
    const id = `cat_${idHash}`;

    const proposedKey = this.keyGen.generateKey(semanticCategory, norm, semanticContext);

    params.entries.push({
      id,
      sourceFile,
      sourceLine,
      sourceColumn,
      originalText: text,
      normalizedText: norm,
      semanticCategory,
      semanticContext,
      proposedTranslationKey: proposedKey,
      extractionConfidence: classificationResult.confidence,
      migrationRisk: classificationResult.risk,
      isUserFacing: classificationResult.isUserFacing,
      classification: classificationResult.classification,
      reviewRequired: classificationResult.reviewRequired,
      specialCases: classificationResult.specialCases,
      notes: classificationResult.notes,
    });
  }
}
