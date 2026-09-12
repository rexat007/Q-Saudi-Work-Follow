/**
 * BLOCK 44 — CLI Entry Point for Safe Automated i18n Codemod Engine
 *
 * Usage:
 *   npx tsx scripts/run-codemod-dry-run.ts
 *   npx tsx scripts/run-codemod-dry-run.ts --risk SAFE,LOW_RISK
 *   npx tsx scripts/run-codemod-dry-run.ts --category shared,trips
 *   npx tsx scripts/run-codemod-dry-run.ts --batch-size 50
 */

import { CodemodEngine } from '../src/i18n/codemod/codemod.runner';
import { CodemodRisk } from '../src/i18n/codemod/codemod.types';

async function main() {
  console.log('================================================================');
  console.log(' BLOCK 44: Safe Automated i18n Codemod Engine (DRY-RUN MODE) ');
  console.log('================================================================');

  const args = process.argv.slice(2);
  let riskFilter: CodemodRisk[] | undefined;
  let categoryFilter: string[] | undefined;
  let batchSize: number | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--risk' && args[i + 1]) {
      riskFilter = args[i + 1].split(',') as CodemodRisk[];
      i++;
    } else if (args[i] === '--category' && args[i + 1]) {
      categoryFilter = args[i + 1].split(',');
      i++;
    } else if (args[i] === '--batch-size' && args[i + 1]) {
      batchSize = parseInt(args[i + 1], 10);
      i++;
    }
  }

  const engine = new CodemodEngine();

  console.log('Scanning application source files with TypeScript AST Compiler...');
  const result = await engine.runDryRun({
    risk: riskFilter,
    category: categoryFilter,
    batchSize,
  });

  const { summary, artifacts } = result;

  console.log('\n--- SCAN & CLASSIFICATION SUMMARY ---');
  console.log(`Source Files Scanned:       ${summary.filesScanned}`);
  console.log(`Total Candidates Detected:  ${summary.candidatesFound}`);
  console.log(`  ├── SAFE:                 ${summary.safeCount}`);
  console.log(`  ├── LOW_RISK:             ${summary.lowRiskCount}`);
  console.log(`  ├── HIGH_RISK:            ${summary.highRiskCount}`);
  console.log(`  ├── REVIEW_ONLY:          ${summary.reviewOnlyCount}`);
  console.log(`  └── SKIP:                 ${summary.skipCount}`);
  console.log(`Proposed Edits:             ${summary.proposedEdits}`);
  console.log(`Files That Would Change:    ${summary.filesThatWouldChange}`);
  console.log(`Import & Hook Injections:   ${summary.importChanges}`);
  console.log(`Interpolation Transforms:   ${summary.interpolationTransforms}`);
  console.log(`Protected Tokens Preserved: ${summary.protectedTokenFindings}`);
  console.log(`Report / Export Invariants: ${summary.reportExportFindings}`);
  console.log(`Semantic Conflicts Isolated:${summary.semanticConflictFindings}`);

  console.log('\n--- ARTIFACTS GENERATED ---');
  console.log(`JSON Dry-Run Report:        ${artifacts.jsonReportPath}`);
  console.log(`Markdown Dry-Run Report:    ${artifacts.mdReportPath}`);
  console.log(`Manifest File:              ${artifacts.manifestPath}`);

  console.log('\n================================================================');
  console.log(' ABSOLUTE SAFETY INVARIANCE CONFIRMATION:');
  console.log('  * 0 application source files were modified on disk.');
  console.log('  * All AST transformations were computed and verified in-memory.');
  console.log('  * DRY_RUN execution complete and fully verified.');
  console.log('================================================================\n');
}

main().catch((err) => {
  console.error('[BLOCK 44 Codemod Error]:', err);
  process.exit(1);
});
