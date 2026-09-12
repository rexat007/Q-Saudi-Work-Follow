/**
 * BLOCK 44 — Safe Automated i18n Codemod Engine
 * Diff Generator & Formatter
 */

import { CodemodDiff } from './codemod.types';

export class CodemodDiffGenerator {
  /**
   * Generates a list of unified diff hunks between original and transformed code.
   */
  public generateDiff(
    originalContent: string,
    transformedContent: string,
    filePath: string
  ): CodemodDiff[] {
    const diffs: CodemodDiff[] = [];

    if (originalContent === transformedContent) {
      return diffs;
    }

    const origLines = originalContent.split('\n');
    const transLines = transformedContent.split('\n');

    let origIdx = 0;
    let transIdx = 0;

    while (origIdx < origLines.length || transIdx < transLines.length) {
      const origLine = origLines[origIdx] ?? '';
      const transLine = transLines[transIdx] ?? '';

      if (origLine !== transLine) {
        // Found difference
        const lineNum = origIdx + 1;
        const before = origLine;
        const after = transLine;

        // Build small patch hunk
        const patch = [
          `@@ -${lineNum},1 +${transIdx + 1},1 @@ ${filePath}`,
          `- ${origLine}`,
          `+ ${transLine}`,
        ].join('\n');

        diffs.push({
          sourceFile: filePath,
          line: lineNum,
          before,
          after,
          patch,
        });
      }

      origIdx++;
      transIdx++;
    }

    return diffs;
  }

  /**
   * Formats diffs as a Markdown section.
   */
  public formatDiffsMarkdown(diffs: CodemodDiff[], maxExamples = 10): string {
    if (diffs.length === 0) {
      return '_No diffs: Source remains completely unchanged._\n';
    }

    let md = `\n### Sample Proposed Diffs (${Math.min(diffs.length, maxExamples)} of ${diffs.length})\n\n`;

    const sample = diffs.slice(0, maxExamples);
    for (const d of sample) {
      md += `**${d.sourceFile}:${d.line}**\n\n`;
      md += '```diff\n';
      md += `- ${d.before.trim()}\n`;
      md += `+ ${d.after.trim()}\n`;
      md += '```\n\n';
    }

    return md;
  }
}
