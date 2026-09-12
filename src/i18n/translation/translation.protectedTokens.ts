/**
 * BLOCK 43 — Protected Tokens & Identity Invariance Module
 */

import {
  PROTECTED_BUSINESS_TOKENS,
  PROTECTED_UNIT_CURRENCY_CODES,
  PRESENTATION_UNIT_CURRENCY_MAP,
} from '../catalog/catalog.constants';
import { INTERPOLATION_REGEX } from '../catalog/translationCatalog.constants';

/**
 * Checks if a token is a protected system token
 */
export function isProtectedToken(token: string): boolean {
  if (PROTECTED_BUSINESS_TOKENS.has(token)) return true;
  if ((PROTECTED_UNIT_CURRENCY_CODES as readonly string[]).includes(token)) return true;
  return false;
}

/**
 * Extracts all protected tokens and interpolation placeholders present in a text
 */
export function extractProtectedTokens(text: string): string[] {
  const found = new Set<string>();

  // 1. Check interpolation parameters {param}
  const matches = text.matchAll(INTERPOLATION_REGEX);
  for (const m of matches) {
    const p = m[1] || m[2];
    if (p) found.add(p);
  }

  // 2. Check business tokens
  for (const token of PROTECTED_BUSINESS_TOKENS) {
    const wordRegex = new RegExp(`\\b${token}\\b`, 'i');
    if (wordRegex.test(text)) {
      found.add(token);
    }
  }

  // 3. Check unit and currency codes
  for (const code of PROTECTED_UNIT_CURRENCY_CODES) {
    const codeRegex = new RegExp(`\\b${code}\\b`, 'i');
    if (codeRegex.test(text)) {
      found.add(code);
    }
  }

  // 4. Check presentation units/currencies in Arabic
  for (const [arText, info] of Object.entries(PRESENTATION_UNIT_CURRENCY_MAP)) {
    if (text.includes(arText)) {
      found.add(info.internalCode);
    }
  }

  return Array.from(found);
}

/**
 * Validates that all expected protected tokens and parameters are strictly preserved in the target proposal
 */
export function validateTokenPreservation(
  sourceAr: string,
  targetText: string,
  expectedTokens: string[],
  interpolationParams: string[]
): {
  valid: boolean;
  missingTokens: string[];
  missingParams: string[];
  unauthorizedExtraParams: string[];
} {
  const missingTokens: string[] = [];
  const missingParams: string[] = [];
  const unauthorizedExtraParams: string[] = [];

  // 1. Verify all interpolation parameters in Arabic are in target
  for (const param of interpolationParams) {
    const pattern = new RegExp(`\\{${param}\\}|\\{\\{${param}\\}\\}`, 'i');
    if (!pattern.test(targetText)) {
      missingParams.push(param);
    }
  }

  // 2. Check for unexpected newly introduced parameters in target
  const targetMatches = targetText.matchAll(INTERPOLATION_REGEX);
  for (const tm of targetMatches) {
    const tp = tm[1] || tm[2];
    if (tp && !interpolationParams.includes(tp)) {
      unauthorizedExtraParams.push(tp);
    }
  }

  // 3. Check protected business tokens
  for (const token of expectedTokens) {
    // If it's not a unit or currency code, it must appear verbatim if it was in the Arabic string
    if (sourceAr.includes(token)) {
      const tokenRegex = new RegExp(`\\b${token}\\b`, 'i');
      if (!tokenRegex.test(targetText)) {
        missingTokens.push(token);
      }
    }
  }

  const valid = missingTokens.length === 0 && missingParams.length === 0 && unauthorizedExtraParams.length === 0;

  return {
    valid,
    missingTokens,
    missingParams,
    unauthorizedExtraParams,
  };
}

/**
 * Canonical unit and currency mappings for translations
 */
export function getStandardUnitOrCurrency(token: string): { en: string; ur: string } | null {
  const upper = token.toUpperCase();
  if (upper === 'KG') return { en: 'kg', ur: 'کلوگرام' };
  if (upper === 'TON') return { en: 'ton', ur: 'ٹن' };
  if (upper === 'SAR') return { en: 'SAR', ur: 'سعودی ریال' };
  if (upper === 'USD') return { en: 'USD', ur: 'امریکی ڈالر' };
  if (upper === 'EUR') return { en: 'EUR', ur: 'یورو' };
  return null;
}
