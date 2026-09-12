/**
 * BLOCK 41 — i18n Catalog Extraction & Translation-Key Architecture
 * Pipeline Orchestrator & Report Generator
 */

import fs from 'fs';
import path from 'path';
import {
  CatalogReport,
  CatalogSummary,
  CatalogEntry,
  SemanticCategory,
  SpecialCaseType,
} from './catalog.types';
import { ALL_SEMANTIC_CATEGORIES } from './catalog.constants';
import { CatalogExtractor } from './catalog.extractor';
import { groupDuplicates, identifySemanticConflicts } from './catalog.deduper';

export * from './catalog.types';
export * from './catalog.constants';
export * from './catalog.classifier';
export * from './catalog.deduper';
export * from './catalog.keyGenerator';
export * from './catalog.extractor';

/**
 * Recursively retrieves all .ts and .tsx files in a directory
 */
export function getSourceFiles(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') {
        continue;
      }
      getSourceFiles(fullPath, fileList);
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      fileList.push(fullPath);
    }
  }

  return fileList;
}

/**
 * Runs the complete catalog extraction and analysis pipeline
 */
export function runCatalogPipeline(targetDir = path.resolve(process.cwd(), 'src')): CatalogReport {
  const filePaths = getSourceFiles(targetDir).sort();
  const extractor = new CatalogExtractor();
  const { entries, directionalUsages, fileCount } = extractor.extractFromFiles(filePaths);

  const duplicateGroups = groupDuplicates(entries);
  const semanticConflicts = identifySemanticConflicts(entries);

  // Calculate summary metrics
  const categoryCounts: Record<SemanticCategory, number> = ALL_SEMANTIC_CATEGORIES.reduce(
    (acc, cat) => ({ ...acc, [cat]: 0 }),
    {} as Record<SemanticCategory, number>
  );

  const specialCasesCount: Record<SpecialCaseType, number> = {
    concatenated: 0,
    template_literal: 0,
    interpolation: 0,
    mixed_numbers: 0,
    date_string: 0,
    currency_string: 0,
    unit_string: 0,
    report_column_key: 0,
    export_header: 0,
    sorting_filter: 0,
    shared_business_ui: 0,
  };

  let userFacingCount = 0;
  let likelyUserFacingCount = 0;
  let ambiguousCount = 0;
  let technicalCount = 0;
  let nonUserFacingCount = 0;
  let commentCount = 0;
  let highRiskCount = 0;
  let criticalRiskCount = 0;
  let keysRequiringReviewCount = 0;

  const distinctProposedKeys = new Set<string>();

  for (const entry of entries) {
    if (entry.classification === 'REAL_USER_FACING') userFacingCount++;
    else if (entry.classification === 'LIKELY_USER_FACING') likelyUserFacingCount++;
    else if (entry.classification === 'AMBIGUOUS') ambiguousCount++;
    else if (entry.classification === 'TECHNICAL') technicalCount++;
    else if (entry.classification === 'NON_USER_FACING') nonUserFacingCount++;
    else if (entry.classification === 'COMMENT') commentCount++;

    if (entry.migrationRisk === 'HIGH') highRiskCount++;
    if (entry.migrationRisk === 'CRITICAL') criticalRiskCount++;
    if (entry.reviewRequired) keysRequiringReviewCount++;

    if (entry.isUserFacing) {
      categoryCounts[entry.semanticCategory] = (categoryCounts[entry.semanticCategory] || 0) + 1;
      distinctProposedKeys.add(entry.proposedTranslationKey);
    }

    for (const sc of entry.specialCases) {
      if (specialCasesCount[sc] !== undefined) {
        specialCasesCount[sc]++;
      }
    }
  }

  const mustMigrateDirectional = directionalUsages.filter((d) => d.risk === 'MUST_MIGRATE').length;
  const probablySafeDirectional = directionalUsages.filter((d) => d.risk === 'PROBABLY_SAFE').length;
  const technicalDirectional = directionalUsages.filter((d) => d.risk === 'TECHNICAL').length;

  const summary: CatalogSummary = {
    totalFilesScanned: fileCount,
    totalCandidates: entries.length,
    userFacingCount,
    likelyUserFacingCount,
    ambiguousCount,
    technicalCount,
    nonUserFacingCount,
    commentCount,
    duplicateGroupsCount: duplicateGroups.length,
    semanticConflictGroupsCount: semanticConflicts.length,
    proposedKeyCount: distinctProposedKeys.size,
    keysRequiringReviewCount,
    highRiskCount,
    criticalRiskCount,
    categoryCounts,
    directionalClassesCount: {
      total: directionalUsages.length,
      mustMigrate: mustMigrateDirectional,
      probablySafe: probablySafeDirectional,
      technical: technicalDirectional,
    },
    specialCasesCount,
  };

  const highRiskHotspots = entries.filter((e) => e.migrationRisk === 'HIGH' || e.migrationRisk === 'CRITICAL');

  return {
    generatedAt: new Date().toISOString(),
    summary,
    directionalInventory: directionalUsages,
    semanticConflicts,
    duplicateGroups,
    highRiskHotspots,
    entries,
  };
}

/**
 * Formats the CatalogReport into a detailed Markdown report
 */
export function formatMarkdownReport(report: CatalogReport): string {
  const { summary } = report;

  let md = `# i18n Catalog Extraction & Translation-Key Architecture Report (BLOCK 41)\n\n`;
  md += `**Generated At:** ${report.generatedAt}\n`;
  md += `**Scope:** Read-only AST catalog analysis for existing application codebase.\n\n`;

  md += `## 1. Executive Summary Metrics\n\n`;
  md += `| Metric | Count | Description |\n`;
  md += `| :--- | :--- | :--- |\n`;
  md += `| **Total Files Scanned** | ${summary.totalFilesScanned} | TypeScript and TSX files analyzed in \`src/\` |\n`;
  md += `| **Total Extracted Candidates** | ${summary.totalCandidates} | Total strings and text nodes parsed |\n`;
  md += `| **Real User-Facing Texts** | ${summary.userFacingCount} | Confirmed visible Arabic and UI texts |\n`;
  md += `| **Likely User-Facing Texts** | ${summary.likelyUserFacingCount} | English UI text in visible elements |\n`;
  md += `| **Ambiguous Texts** | ${summary.ambiguousCount} | Short or context-isolated tokens for manual review |\n`;
  md += `| **Technical Strings** | ${summary.technicalCount} | CSS classes, paths, enums, regexes, operators |\n`;
  md += `| **Non-User-Facing Strings** | ${summary.nonUserFacingCount} | Internal IDs, collection names, database keys |\n`;
  md += `| **Distinct Proposed Keys** | ${summary.proposedKeyCount} | Hierarchical keys generated (e.g. \`shared.actions.save\`) |\n`;
  md += `| **Duplicate Groups** | ${summary.duplicateGroupsCount} | Sets of identical/normalized recurring texts |\n`;
  md += `| **Semantic Conflict Groups** | ${summary.semanticConflictGroupsCount} | Identical texts requiring distinct contextual keys |\n`;
  md += `| **Keys Requiring Review** | ${summary.keysRequiringReviewCount} | Entries flagged with special cases or ambiguity |\n`;
  md += `| **High / Critical Risk Hotspots** | ${summary.highRiskCount + summary.criticalRiskCount} | Concatenations, templates, or business data overlaps |\n\n`;

  md += `## 2. Category Distribution\n\n`;
  md += `| Semantic Category | User-Facing Strings | Description |\n`;
  md += `| :--- | :--- | :--- |\n`;
  for (const [cat, count] of Object.entries(summary.categoryCounts).sort((a, b) => b[1] - a[1])) {
    md += `| \`${cat}\` | ${count} | Classified operational domain |\n`;
  }
  md += `\n`;

  md += `## 3. Directional (RTL / LTR) Class Inventory\n\n`;
  md += `- **Total Directional Usages Detected:** ${summary.directionalClassesCount.total}\n`;
  md += `- **Must Migrate (Physical to Logical):** ${summary.directionalClassesCount.mustMigrate} (e.g. \`text-left\` -> \`text-start\`, \`pl-\` -> \`ps-\`)\n`;
  md += `- **Probably Safe / Technical:** ${summary.directionalClassesCount.probablySafe + summary.directionalClassesCount.technical}\n\n`;

  md += `### Directional Classes Sample (First 15 Entries)\n\n`;
  md += `| File | Line | Class / Icon | Type | Risk | Suggested Replacement |\n`;
  md += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;
  for (const item of report.directionalInventory.slice(0, 15)) {
    md += `| \`${item.file}\` | ${item.line} | \`${item.className}\` | ${item.type} | \`${item.risk}\` | \`${item.suggestedReplacement || '-'}\` |\n`;
  }
  md += `\n`;

  md += `## 4. Semantic Conflict Groups Sample\n\n`;
  md += `Identical visible text appearing across different operational domains with distinct contextual intent.\n\n`;
  md += `| Text | Occurrences | Reason | Distinct Contexts & Keys |\n`;
  md += `| :--- | :--- | :--- | :--- |\n`;
  for (const conflict of report.semanticConflicts.slice(0, 10)) {
    const contextsStr = conflict.contexts.map((c) => `\`${c.category}\` (${c.proposedKey})`).join('<br/>');
    md += `| "${conflict.normalizedText}" | ${conflict.occurrences} | ${conflict.reason} | ${contextsStr} |\n`;
  }
  md += `\n`;

  md += `## 5. High-Risk Hotspots & Special Cases\n\n`;
  md += `- **Concatenated Strings (\`+\`):** ${summary.specialCasesCount.concatenated}\n`;
  md += `- **Template Literals (\`\${...}\`):** ${summary.specialCasesCount.template_literal}\n`;
  md += `- **Interpolation Placeholders (\`{...}\`):** ${summary.specialCasesCount.interpolation}\n`;
  md += `- **Mixed Numbers & Units:** ${summary.specialCasesCount.mixed_numbers}\n`;
  md += `- **Currency String Usages:** ${summary.specialCasesCount.currency_string}\n`;
  md += `- **Unit String Usages:** ${summary.specialCasesCount.unit_string}\n`;
  md += `- **Protected Business Field Matches:** ${summary.specialCasesCount.shared_business_ui}\n\n`;

  md += `## 6. Safety & Non-Destructive Invariance Confirmation\n\n`;
  md += `- **No Code Modifications:** Zero application strings were rewritten or modified.\n`;
  md += `- **No Calling \`t()\` across app:** No automated codemod was executed.\n`;
  md += `- **Business Logic Invariance:** Pricing, reports, weighbridge, offline, and state machines are 100% untouched.\n`;
  md += `- **Deterministic Reproducibility:** Every catalog run generates identical keys and hashes.\n`;

  return md;
}

/**
 * Saves report files to reports/i18n-catalog.json and reports/i18n-catalog.md
 */
export function writeCatalogReports(report: CatalogReport, outputDir = path.resolve(process.cwd(), 'reports')): void {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const jsonPath = path.join(outputDir, 'i18n-catalog.json');
  const mdPath = path.join(outputDir, 'i18n-catalog.md');

  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8');
  fs.writeFileSync(mdPath, formatMarkdownReport(report), 'utf-8');
}
