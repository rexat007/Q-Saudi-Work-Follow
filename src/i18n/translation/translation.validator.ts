/**
 * BLOCK 43 — Translation Proposal Validation Engine
 */

import { TranslationProposal, TranslationValidationResult } from './translation.types';
import { validateTokenPreservation } from './translation.protectedTokens';
import { INTERPOLATION_REGEX } from '../catalog/translationCatalog.constants';

/**
 * Validates a single translation proposal against all architectural invariance rules
 */
export function validateTranslationProposal(proposal: TranslationProposal): TranslationValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let preservedParams = true;
  let preservedTokens = true;

  // 1. Validate key existence
  if (!proposal.key || typeof proposal.key !== 'string' || proposal.key.trim().length === 0) {
    errors.push('Missing or empty translation key');
  }

  // 2. Validate Arabic source text existence
  if (!proposal.sourceTextAr || typeof proposal.sourceTextAr !== 'string' || proposal.sourceTextAr.trim().length === 0) {
    errors.push('Missing or empty Arabic source text');
  }

  // 3. Validate bracket balance in all translations
  const checkBrackets = (text: string | null, lang: string) => {
    if (!text) return;
    const openCount = (text.match(/\{/g) || []).length;
    const closeCount = (text.match(/\}/g) || []).length;
    if (openCount !== closeCount) {
      errors.push(`Mismatched interpolation brackets in ${lang} translation: '{' (${openCount}) vs '}' (${closeCount})`);
    }
  };

  checkBrackets(proposal.sourceTextAr, 'ar');
  checkBrackets(proposal.proposedTextEn, 'en');
  checkBrackets(proposal.proposedTextUr, 'ur');

  // 4. Validate Interpolation Parameters Preservation (English)
  if (proposal.proposedTextEn) {
    const enParamValidation = validateTokenPreservation(
      proposal.sourceTextAr,
      proposal.proposedTextEn,
      proposal.protectedTokens,
      proposal.interpolationParams
    );

    if (!enParamValidation.valid) {
      if (enParamValidation.missingParams.length > 0) {
        errors.push(`English proposal missing required interpolation parameters: [${enParamValidation.missingParams.join(', ')}]`);
        preservedParams = false;
      }
      if (enParamValidation.unauthorizedExtraParams.length > 0) {
        errors.push(`English proposal introduced unexpected parameters: [${enParamValidation.unauthorizedExtraParams.join(', ')}]`);
        preservedParams = false;
      }
      if (enParamValidation.missingTokens.length > 0) {
        warnings.push(`English proposal missing verbatim protected tokens: [${enParamValidation.missingTokens.join(', ')}]`);
        preservedTokens = false;
      }
    }
  }

  // 5. Validate Interpolation Parameters Preservation (Urdu)
  if (proposal.proposedTextUr) {
    const urParamValidation = validateTokenPreservation(
      proposal.sourceTextAr,
      proposal.proposedTextUr,
      proposal.protectedTokens,
      proposal.interpolationParams
    );

    if (!urParamValidation.valid) {
      if (urParamValidation.missingParams.length > 0) {
        errors.push(`Urdu proposal missing required interpolation parameters: [${urParamValidation.missingParams.join(', ')}]`);
        preservedParams = false;
      }
      if (urParamValidation.unauthorizedExtraParams.length > 0) {
        errors.push(`Urdu proposal introduced unexpected parameters: [${urParamValidation.unauthorizedExtraParams.join(', ')}]`);
        preservedParams = false;
      }
      if (urParamValidation.missingTokens.length > 0) {
        warnings.push(`Urdu proposal missing verbatim protected tokens: [${urParamValidation.missingTokens.join(', ')}]`);
        preservedTokens = false;
      }
    }
  }

  // 6. Pluralization integrity
  if (proposal.pluralization.required) {
    if (!proposal.pluralization.formsAr || proposal.pluralization.formsAr.length === 0) {
      warnings.push('Pluralization required but Arabic forms array is empty');
    }
  }

  // 7. Internal field protection in report/export
  if (proposal.isReportOrExportField && proposal.internalDataKey) {
    // Internal data key must remain alphanumeric camelCase/snakeCase without translation
    if (/[^a-zA-Z0-9_]/.test(proposal.internalDataKey)) {
      errors.push(`Internal data key '${proposal.internalDataKey}' contains non-identifier characters`);
    }
  }

  // 8. Proposals marked as GENERATED or VALIDATED must have non-empty proposals
  if ((proposal.statusEn === 'GENERATED' || proposal.statusEn === 'VALIDATED') && !proposal.proposedTextEn) {
    errors.push(`Status for English is ${proposal.statusEn} but proposedTextEn is empty`);
  }
  if ((proposal.statusUr === 'GENERATED' || proposal.statusUr === 'VALIDATED') && !proposal.proposedTextUr) {
    errors.push(`Status for Urdu is ${proposal.statusUr} but proposedTextUr is empty`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    preservedParams,
    preservedTokens,
  };
}
