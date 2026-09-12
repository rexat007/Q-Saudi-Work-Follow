/**
 * BLOCK 43 — Human Translation Review Queue Formatter & Reason Classifier
 */

import { TranslationProposal, ReviewReason } from './translation.types';

export const ALL_REVIEW_REASONS: ReviewReason[] = [
  'SEMANTIC_CONFLICT',
  'DOMAIN_TERM',
  'INTERPOLATION_RISK',
  'PLURALIZATION_RISK',
  'REPORT_EXPORT_RISK',
  'BUSINESS_DATA_RISK',
  'LOW_CONFIDENCE',
  'DIRECTIONAL_RISK',
  'VALIDATION_FAILURE',
  'OTHER',
];

export const REVIEW_REASON_DESCRIPTIONS: Record<ReviewReason, string> = {
  SEMANTIC_CONFLICT: 'Identical source texts with different operational meanings quarantined to prevent UI/business conflation',
  DOMAIN_TERM: 'Domain-specific terminology requiring operational verification by enterprise domain leads',
  INTERPOLATION_RISK: 'Complex dynamic placeholders or parameter sequences requiring syntax verification',
  PLURALIZATION_RISK: 'Quantities requiring 6 Arabic plural forms aligned with target language plural rules',
  REPORT_EXPORT_RISK: 'Report column or export header requiring separation of internal data key from display label',
  BUSINESS_DATA_RISK: 'Formulas, rates, or business calculations requiring strict identifier preservation',
  LOW_CONFIDENCE: 'Ambiguous or composite phrases generated with low statistical confidence',
  DIRECTIONAL_RISK: 'Mixed-direction content (Arabic and Latin/numbers) needing directional inspection',
  VALIDATION_FAILURE: 'Proposal encountered parameter mismatch, missing tokens, or structural defects',
  OTHER: 'General review requirements flagged by migration pipeline',
};

/**
 * Groups proposals requiring review by their primary review reason
 */
export function buildReviewQueuesByReason(
  proposals: TranslationProposal[]
): Record<ReviewReason, TranslationProposal[]> {
  const queues: Record<ReviewReason, TranslationProposal[]> = {
    SEMANTIC_CONFLICT: [],
    DOMAIN_TERM: [],
    INTERPOLATION_RISK: [],
    PLURALIZATION_RISK: [],
    REPORT_EXPORT_RISK: [],
    BUSINESS_DATA_RISK: [],
    LOW_CONFIDENCE: [],
    DIRECTIONAL_RISK: [],
    VALIDATION_FAILURE: [],
    OTHER: [],
  };

  for (const p of proposals) {
    if (!p.reviewRequired) continue;

    if (p.reviewReasons.length === 0) {
      queues.OTHER.push(p);
      continue;
    }

    // Place into the highest-priority reason queue
    const primaryReason = ALL_REVIEW_REASONS.find((r) => p.reviewReasons.includes(r)) || 'OTHER';
    queues[primaryReason].push(p);
  }

  return queues;
}

/**
 * Generates an actionable recommendation for a human translator or reviewer
 */
export function generateRecommendation(proposal: TranslationProposal, reason: ReviewReason): string {
  switch (reason) {
    case 'SEMANTIC_CONFLICT':
      return `Verify context '${proposal.semanticContext}'. Do NOT merge with other instances of '${proposal.sourceTextAr}'.`;
    case 'DOMAIN_TERM':
      return `Confirm domain term aligns with KSA logistics standard glossary for category '${proposal.category}'.`;
    case 'INTERPOLATION_RISK':
      return `Ensure parameter(s) [${proposal.interpolationParams.join(', ')}] remain unmodified in translation syntax.`;
    case 'PLURALIZATION_RISK':
      return `Validate plural rules for Arabic (zero, one, two, few, many, other) vs English/Urdu (one, other).`;
    case 'REPORT_EXPORT_RISK':
      return `Ensure internal key '${proposal.internalDataKey || 'none'}' remains untranslated; translate presentation label only.`;
    case 'BUSINESS_DATA_RISK':
      return `Protect financial or scale tokens: [${proposal.protectedTokens.join(', ')}].`;
    case 'LOW_CONFIDENCE':
      return `Review phrasing carefully; replace with verified domain phrase if needed.`;
    case 'DIRECTIONAL_RISK':
      return `Check bidirectional text alignment (RTL/LTR) for mixed Latin and Arabic characters.`;
    case 'VALIDATION_FAILURE':
      return `Fix validation errors: ${proposal.validationErrors.join('; ')}`;
    default:
      return 'Verify operational meaning with logistics dispatcher.';
  }
}

/**
 * Formats the Human Translation Review Queue report as Markdown
 */
export function formatReviewQueueMarkdown(
  queues: Record<ReviewReason, TranslationProposal[]>,
  totalProposals: number
): string {
  let totalReviewItems = 0;
  for (const items of Object.values(queues)) {
    totalReviewItems += items.length;
  }

  let md = `# Professional Translation Human Review Queue (BLOCK 43)\n\n`;
  md += `**Generated At:** ${new Date().toISOString()}\n`;
  md += `**Total Catalog Entries Processed:** ${totalProposals}\n`;
  md += `**Total Proposals Requiring Human Review:** ${totalReviewItems} (${((totalReviewItems / (totalProposals || 1)) * 100).toFixed(1)}%)\n\n`;

  md += `## Review Instructions for Translators & Enterprise Auditors\n\n`;
  md += `1. **Arabic Canonical Invariance:** The Arabic text is the canonical source and must never be altered.\n`;
  md += `2. **Parameter Preservation:** Dynamic variables like \`{count}\` or \`{ticketNo}\` must appear verbatim with exact casing and brackets.\n`;
  md += `3. **Protected Identifiers:** Database fields (e.g. \`ticketId\`, \`truckNo\`) and currency codes (\`SAR\`, \`KG\`, \`TON\`) must never be translated as data identifiers.\n`;
  md += `4. **Operational Disambiguation:** Terms like "تحميل" must translate to operational "Loading" in station contexts, not "Download".\n\n`;

  md += `## Review Summary by Risk Reason\n\n`;
  md += `| Review Reason | Queue Count | Architectural Description |\n`;
  md += `| :--- | :--- | :--- |\n`;
  for (const reason of ALL_REVIEW_REASONS) {
    const count = queues[reason].length;
    md += `| \`${reason}\` | **${count}** | ${REVIEW_REASON_DESCRIPTIONS[reason]} |\n`;
  }
  md += `\n`;

  for (const reason of ALL_REVIEW_REASONS) {
    const items = queues[reason];
    if (items.length === 0) continue;

    md += `### 1. Reason: \`${reason}\` (${items.length} items)\n\n`;
    md += `> ${REVIEW_REASON_DESCRIPTIONS[reason]}\n\n`;

    md += `| Key | Arabic Source | Proposed English | Proposed Urdu | Recommendation & Context |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- |\n`;

    const sample = items.slice(0, 25);
    for (const item of sample) {
      const rec = generateRecommendation(item, reason);
      const en = item.proposedTextEn ? `"${item.proposedTextEn}"` : '*[None]*';
      const ur = item.proposedTextUr ? `"${item.proposedTextUr}"` : '*[None]*';
      md += `| \`${item.key}\` | "${item.sourceTextAr}" | ${en} | ${ur} | ${rec} |\n`;
    }

    if (items.length > 25) {
      md += `| ... | *and ${items.length - 25} more items in this queue* | | | |\n`;
    }
    md += `\n`;
  }

  return md;
}
