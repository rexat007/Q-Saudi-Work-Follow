/**
 * BLOCK 44 — Safe Automated i18n Codemod Engine
 * Core Engine Orchestrator & Runner
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import ts from 'typescript';
import {
  CodemodMode,
  CodemodRisk,
  CodemodBatchFilter,
  CodemodCandidate,
  CodemodSummary,
  CodemodDryRunReport,
  CodemodManifest,
  CodemodManifestEntry,
  CodemodDiff,
} from './codemod.types';
import { CodemodCatalogMatcher } from './codemod.matcher';
import { CodemodScanner } from './codemod.scanner';
import { CodemodClassifier } from './codemod.classifier';
import { CodemodImportManager } from './codemod.importManager';
import { CodemodTransformer } from './codemod.transformer';
import { CodemodDiffGenerator } from './codemod.diff';
import { CodemodReporter } from './codemod.reporter';
import { CodemodSafety } from './codemod.safety';
import { EXCLUDED_SCAN_PATHS, DEFAULT_BATCH_CONFIG } from './codemod.constants';

export interface CodemodRunOptions extends CodemodBatchFilter {
  rootDir?: string;
  silent?: boolean;
  dryRunReportsDir?: string;
}

export interface CodemodRunResult {
  mode: CodemodMode;
  summary: CodemodSummary;
  candidates: CodemodCandidate[];
  diffs: CodemodDiff[];
  manifest: CodemodManifest;
  artifacts: {
    jsonReportPath: string;
    mdReportPath: string;
    manifestPath: string;
  };
}

export class CodemodEngine {
  private matcher: CodemodCatalogMatcher;
  private scanner: CodemodScanner;
  private classifier: CodemodClassifier;
  private importManager: CodemodImportManager;
  private transformer: CodemodTransformer;
  private diffGenerator: CodemodDiffGenerator;
  private reporter: CodemodReporter;
  private safety: CodemodSafety;

  constructor() {
    this.matcher = CodemodCatalogMatcher.getInstance();
    this.scanner = new CodemodScanner();
    this.importManager = new CodemodImportManager();
    this.classifier = new CodemodClassifier(this.matcher, this.importManager);
    this.transformer = new CodemodTransformer(this.importManager);
    this.diffGenerator = new CodemodDiffGenerator();
    this.reporter = new CodemodReporter();
    this.safety = new CodemodSafety(this.matcher);
  }

  /**
   * Primary Entry Point: Executes a Safe DRY-RUN scan across application sources.
   * NEVER modifies files on disk.
   */
  public async runDryRun(options: CodemodRunOptions = {}): Promise<CodemodRunResult> {
    const rootDir = options.rootDir || path.join(process.cwd(), 'src');
    const mode: CodemodMode = 'DRY_RUN';

    // 1. Ensure catalogs are loaded
    this.matcher.loadCatalogs({ silent: options.silent });

    // 2. Discover target source files (.tsx and .ts)
    const targetFiles = this.discoverSourceFiles(rootDir, options.files);

    const allCandidates: CodemodCandidate[] = [];
    const allDiffs: CodemodDiff[] = [];
    const manifestEntries: CodemodManifestEntry[] = [];
    const changedFilesSet = new Set<string>();

    let importChangesCount = 0;
    let interpolationTransformsCount = 0;
    let protectedTokenFindingsCount = 0;
    let reportExportFindingsCount = 0;
    let semanticConflictFindingsCount = 0;

    const categoryBreakdown: Record<string, number> = {};
    const riskBreakdown: Record<CodemodRisk, number> = {
      SAFE: 0,
      LOW_RISK: 0,
      HIGH_RISK: 0,
      REVIEW_ONLY: 0,
      SKIP: 0,
    };

    // 3. Process each file deterministically
    for (const filePath of targetFiles) {
      const sourceCode = fs.readFileSync(filePath, 'utf-8');
      const originalHash = this.computeHash(sourceCode);
      const isTsx = filePath.endsWith('.tsx');

      const sourceFile = ts.createSourceFile(
        filePath,
        sourceCode,
        ts.ScriptTarget.Latest,
        true,
        isTsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS
      );

      // Scan raw candidates
      const rawCandidates = this.scanner.scanSourceFile(sourceFile, filePath);

      // Classify candidates
      const fileCandidates: CodemodCandidate[] = [];
      for (const raw of rawCandidates) {
        const classified = this.classifier.classify(raw, filePath, sourceFile);

        // Apply batch filters if specified
        if (options.risk && options.risk.length > 0 && !options.risk.includes(classified.risk)) {
          continue;
        }
        if (
          options.category &&
          options.category.length > 0 &&
          classified.category &&
          !options.category.includes(classified.category)
        ) {
          continue;
        }

        fileCandidates.push(classified);
        allCandidates.push(classified);

        // Record metrics
        riskBreakdown[classified.risk] = (riskBreakdown[classified.risk] || 0) + 1;
        const catKey = classified.category || 'uncategorized';
        categoryBreakdown[catKey] = (categoryBreakdown[catKey] || 0) + 1;

        if (classified.requiresImport || classified.requiresHook) {
          importChangesCount++;
        }
        if (classified.nodeKind === 'TemplateExpression') {
          interpolationTransformsCount++;
        }
        if (classified.protectedTokens.length > 0) {
          protectedTokenFindingsCount++;
        }
        if (classified.isReportOrExportField) {
          reportExportFindingsCount++;
        }
        if (classified.reviewReasons.includes('SEMANTIC_CONFLICT')) {
          semanticConflictFindingsCount++;
        }
      }

      // Filter actionable candidates for simulated transformation (SAFE and LOW_RISK)
      const actionableCandidates = fileCandidates.filter(
        (c) => c.classification === 'TRANSFORM_SAFE' || c.classification === 'TRANSFORM_LOW_RISK'
      );

      if (actionableCandidates.length > 0) {
        changedFilesSet.add(filePath);

        // Simulate In-Memory transformation
        const transformRes = this.transformer.transformInMemory(
          sourceCode,
          filePath,
          actionableCandidates
        );

        if (transformRes.isValid) {
          const modifiedHash = this.computeHash(transformRes.transformedContent);
          const diffs = this.diffGenerator.generateDiff(
            sourceCode,
            transformRes.transformedContent,
            filePath
          );
          allDiffs.push(...diffs);

          manifestEntries.push({
            sourceFile: filePath,
            originalHash,
            modifiedHash,
            translationKeysInserted: Array.from(
              new Set(transformRes.appliedCandidates.map((c) => c.translationKey!))
            ),
            timestamp: new Date().toISOString(),
            transformCount: transformRes.appliedCandidates.length,
          });
        }
      }
    }

    // 4. Sort candidates deterministically
    const sortedCandidates = this.sortCandidates(allCandidates);

    // Apply batch size limit if requested
    const finalCandidates = options.batchSize
      ? sortedCandidates.slice(0, options.batchSize)
      : sortedCandidates;

    // 5. Compile Summary
    const proposedEdits = riskBreakdown.SAFE + riskBreakdown.LOW_RISK + riskBreakdown.HIGH_RISK;
    const summary: CodemodSummary = {
      filesScanned: targetFiles.length,
      candidatesFound: allCandidates.length,
      safeCount: riskBreakdown.SAFE,
      lowRiskCount: riskBreakdown.LOW_RISK,
      highRiskCount: riskBreakdown.HIGH_RISK,
      reviewOnlyCount: riskBreakdown.REVIEW_ONLY,
      skipCount: riskBreakdown.SKIP,
      proposedEdits,
      filesThatWouldChange: changedFilesSet.size,
      importChanges: importChangesCount,
      interpolationTransforms: interpolationTransformsCount,
      protectedTokenFindings: protectedTokenFindingsCount,
      reportExportFindings: reportExportFindingsCount,
      semanticConflictFindings: semanticConflictFindingsCount,
      categoryBreakdown,
      riskBreakdown,
    };

    const dryRunReport: CodemodDryRunReport = {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      mode,
      summary,
      candidates: finalCandidates,
      diffs: allDiffs,
    };

    const manifest: CodemodManifest = {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      mode,
      entries: manifestEntries,
    };

    // 6. Generate Report Artifacts
    const artifacts = this.reporter.generateReports(
      dryRunReport,
      manifest,
      options.dryRunReportsDir || 'reports'
    );

    return {
      mode,
      summary,
      candidates: finalCandidates,
      diffs: allDiffs,
      manifest,
      artifacts,
    };
  }

  /**
   * Sorts candidates with deterministic multi-level criteria:
   * category -> sourceFile -> line -> column -> translationKey
   */
  public sortCandidates(candidates: CodemodCandidate[]): CodemodCandidate[] {
    return [...candidates].sort((a, b) => {
      // 1. Category
      const catA = a.category || 'zzz';
      const catB = b.category || 'zzz';
      if (catA !== catB) return catA.localeCompare(catB);

      // 2. Source file
      if (a.sourceFile !== b.sourceFile) return a.sourceFile.localeCompare(b.sourceFile);

      // 3. Line
      if (a.sourceLocation.line !== b.sourceLocation.line) {
        return a.sourceLocation.line - b.sourceLocation.line;
      }

      // 4. Column
      if (a.sourceLocation.column !== b.sourceLocation.column) {
        return a.sourceLocation.column - b.sourceLocation.column;
      }

      // 5. Translation Key
      const keyA = a.translationKey || '';
      const keyB = b.translationKey || '';
      return keyA.localeCompare(keyB);
    });
  }

  /**
   * Recursively discovers all .ts and .tsx source files in src/ excluding tests and node_modules.
   */
  public discoverSourceFiles(rootDir: string, explicitFiles?: string[]): string[] {
    if (explicitFiles && explicitFiles.length > 0) {
      return explicitFiles.filter((f) => fs.existsSync(f));
    }

    const files: string[] = [];

    const walk = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name).replace(/\\/g, '/');

        // Check exclusions
        const isExcluded = EXCLUDED_SCAN_PATHS.some((exc) =>
          fullPath.includes(`/${exc}/`) || fullPath.endsWith(`/${exc}`) || fullPath.startsWith(`${exc}/`)
        );
        if (isExcluded) continue;

        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile()) {
          if (
            DEFAULT_BATCH_CONFIG.SUPPORTED_EXTENSIONS.some((ext) => entry.name.endsWith(ext)) &&
            !entry.name.endsWith('.d.ts')
          ) {
            files.push(fullPath);
          }
        }
      }
    };

    walk(rootDir);
    return files.sort();
  }

  private computeHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
  }
}
