/**
 * BLOCK 44 — Safe Automated i18n Codemod Engine
 * AST-Based In-Memory Transformer
 */

import ts from 'typescript';
import { CodemodCandidate, TransformResult } from './codemod.types';
import { CodemodImportManager } from './codemod.importManager';

export class CodemodTransformer {
  private importManager: CodemodImportManager;

  constructor(importManager?: CodemodImportManager) {
    this.importManager = importManager || new CodemodImportManager();
  }

  /**
   * Transforms source code in-memory by applying eligible candidates.
   * NEVER writes to disk.
   */
  public transformInMemory(
    sourceCode: string,
    filePath: string,
    candidates: CodemodCandidate[]
  ): TransformResult {
    const isTsx = filePath.endsWith('.tsx');
    const appliedCandidates: CodemodCandidate[] = [];
    const skippedCandidates: CodemodCandidate[] = [];

    // Filter to only actionable candidates (e.g. SAFE, LOW_RISK, HIGH_RISK)
    const eligibleCandidates = candidates.filter(
      (c) =>
        (c.classification === 'TRANSFORM_SAFE' ||
          c.classification === 'TRANSFORM_LOW_RISK' ||
          c.classification === 'TRANSFORM_HIGH_RISK') &&
        c.translationKey !== null
    );

    if (eligibleCandidates.length === 0) {
      return {
        transformedContent: sourceCode,
        isValid: true,
        parseErrors: [],
        appliedCandidates: [],
        skippedCandidates: candidates,
      };
    }

    // Sort candidates descending by startPos to replace from bottom to top without invalidating positions
    const sortedCandidates = [...eligibleCandidates].sort(
      (a, b) => b.sourceLocation.startPos - a.sourceLocation.startPos
    );

    let transformedCode = sourceCode;

    for (const cand of sortedCandidates) {
      const { startPos, endPos } = cand.sourceLocation;

      // Extract existing snippet
      const currentSnippet = transformedCode.substring(startPos, endPos);

      // Perform surgical replacement
      const before = transformedCode.substring(0, startPos);
      const after = transformedCode.substring(endPos);

      transformedCode = before + cand.proposedReplacement + after;
      appliedCandidates.push(cand);
    }

    // Mark non-eligible as skipped
    for (const cand of candidates) {
      if (!appliedCandidates.includes(cand)) {
        skippedCandidates.push(cand);
      }
    }

    // Determine if we need to insert `const { t } = useI18n();` and `import { useI18n } from '...'`
    const needsHook = appliedCandidates.some((c) => c.requiresHook);
    const needsImport = appliedCandidates.some((c) => c.requiresImport);

    if (needsHook || needsImport) {
      transformedCode = this.injectHookAndImport(transformedCode, filePath, appliedCandidates);
    }

    // Validate in-memory transformed syntax with TypeScript Compiler
    const sf = ts.createSourceFile(
      isTsx ? 'in_memory.tsx' : 'in_memory.ts',
      transformedCode,
      ts.ScriptTarget.Latest,
      true,
      isTsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );

    const parseDiagnostics = (sf as any).parseDiagnostics || [];
    const parseErrors = parseDiagnostics.map((d: any) =>
      typeof d.messageText === 'string' ? d.messageText : d.messageText.messageText
    );

    return {
      transformedContent: transformedCode,
      isValid: parseErrors.length === 0,
      parseErrors,
      appliedCandidates,
      skippedCandidates,
    };
  }

  /**
   * Safely injects the import statement and hook call into in-memory source.
   */
  private injectHookAndImport(
    sourceCode: string,
    filePath: string,
    appliedCandidates: CodemodCandidate[]
  ): string {
    const isTsx = filePath.endsWith('.tsx');
    let code = sourceCode;

    // 1. Inject useI18n import if needed
    const needsImport = appliedCandidates.some((c) => c.requiresImport);
    if (needsImport && !code.includes('useI18n')) {
      const relPath = this.importManager.calculateRelativeI18nPath(filePath);
      const importLine = `import { useI18n } from '${relPath}';\n`;

      // Find last import statement to insert cleanly after
      const sf = ts.createSourceFile(
        isTsx ? 'temp.tsx' : 'temp.ts',
        code,
        ts.ScriptTarget.Latest,
        true,
        isTsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS
      );

      let lastImportEnd = 0;
      for (const st of sf.statements) {
        if (ts.isImportDeclaration(st)) {
          lastImportEnd = st.getEnd();
        }
      }

      if (lastImportEnd > 0) {
        code = code.substring(0, lastImportEnd) + '\n' + importLine + code.substring(lastImportEnd);
      } else {
        code = importLine + code;
      }
    }

    // 2. Inject `const { t } = useI18n();` inside target component function if needed
    const targetComponents = Array.from(
      new Set(appliedCandidates.filter((c) => c.requiresHook && c.targetComponent).map((c) => c.targetComponent!))
    );

    for (const compName of targetComponents) {
      const hasTDestructured = /const\s*\{[^}]*\bt\b[^}]*\}\s*=\s*useI18n\(\)/.test(code);
      if (!hasTDestructured) {
        // Check if useI18n() is already called in the file
        const existingHookPattern = /const\s*\{([^}]+)\}\s*=\s*useI18n\(\);/;
        const hookMatch = existingHookPattern.exec(code);
        if (hookMatch) {
          const vars = hookMatch[1].split(',').map((s) => s.trim());
          if (!vars.includes('t')) {
            const replacedHook = `const { ${hookMatch[1].trim()}, t } = useI18n();`;
            code = code.replace(hookMatch[0], replacedHook);
          }
        } else {
          // Find component declaration
          const compPattern = new RegExp(`(function\\s+${compName}[^{]*\\{|const\\s+${compName}\\s*=[^{]*\\{)`);
          const match = compPattern.exec(code);
          if (match) {
            const insertIdx = match.index + match[0].length;
            code = code.substring(0, insertIdx) + '\n  const { t } = useI18n();' + code.substring(insertIdx);
          }
        }
      }
    }

    return code;
  }
}
