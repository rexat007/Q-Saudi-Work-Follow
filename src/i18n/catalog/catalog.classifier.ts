/**
 * BLOCK 41 — i18n Catalog Classifier
 * Classifies string candidates into deterministic user-facing & risk categories.
 */

import {
  ClassificationType,
  ExtractionConfidence,
  MigrationRisk,
  SemanticCategory,
  SpecialCaseType,
} from './catalog.types';
import {
  PROTECTED_BUSINESS_TOKENS,
  PRESENTATION_UNIT_CURRENCY_MAP,
  USER_FACING_ATTRIBUTES,
  TECHNICAL_ATTRIBUTES,
} from './catalog.constants';

const ARABIC_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const TAILWIND_TOKEN_REGEX = /^(flex|grid|hidden|block|inline|text-|bg-|border-|rounded|p-|px-|py-|pt-|pb-|pl-|pr-|m-|mx-|my-|mt-|mb-|ml-|mr-|w-|h-|max-w-|min-w-|z-|gap-|space-|col-|row-|items-|justify-|cursor-|transition-|duration-|shadow|opacity-|overflow-|font-|leading-|tracking-|antialiased|sticky|relative|absolute|fixed)/;
const URL_OR_PATH_REGEX = /^(\/|[a-z]+:\/\/|[a-z0-9_-]+\/[a-z0-9_-]+|\.\/|\.\.\/)/i;
const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}){1,2}$/;
const REGEX_OR_OPERATOR_REGEX = /^[\^$\[\]()+*?.\\/|]+$/;
const AMBIGUOUS_SHORT_CODES = new Set(['OK', 'CSV', 'ID', 'PDF', 'XLSX', 'API', '0', '1', 'A', 'B', 'C', 'N/A', 'NA']);

export interface ClassifierInput {
  text: string;
  sourceFile: string;
  isJsxText?: boolean;
  jsxAttributeName?: string;
  isComment?: boolean;
  isCallExpression?: boolean;
  callFunctionName?: string;
  isObjectKey?: boolean;
  isObjectValue?: boolean;
  parentObjectKey?: string;
  isTemplateLiteral?: boolean;
  hasTemplateExpressions?: boolean;
  isPartOfBinaryConcatenation?: boolean;
}

export interface ClassificationResult {
  classification: ClassificationType;
  confidence: ExtractionConfidence;
  risk: MigrationRisk;
  isUserFacing: boolean;
  reviewRequired: boolean;
  specialCases: SpecialCaseType[];
  notes: string[];
}

export function containsArabic(text: string): boolean {
  return ARABIC_REGEX.test(text);
}

export function isPureTechnicalToken(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length === 0) return true;
  if (AMBIGUOUS_SHORT_CODES.has(trimmed.toUpperCase())) return false;
  if (trimmed.length === 1 && !containsArabic(trimmed)) return true; // Single punctuation or symbol
  if (HEX_COLOR_REGEX.test(trimmed)) return true;
  if (URL_OR_PATH_REGEX.test(trimmed) && !containsArabic(trimmed)) return true;
  if (REGEX_OR_OPERATOR_REGEX.test(trimmed)) return true;

  // Machine identifiers / status codes / uppercase enums
  if (/^[A-Z0-9_]{3,}$/.test(trimmed)) {
    if (trimmed.includes('_') || trimmed.length > 4) {
      return true; // e.g., WEIGHED_ORIGIN, PER_TRIP, TRP_STATUS
    }
  }

  // CSS class string: space separated tailwind utility classes
  const parts = trimmed.split(/\s+/);
  if (parts.length > 1 && parts.every((p) => TAILWIND_TOKEN_REGEX.test(p) || p.startsWith('hover:') || p.startsWith('focus:'))) {
    return true;
  }

  return false;
}

export function classifyCandidate(input: ClassifierInput): ClassificationResult {
  const trimmed = input.text.trim();
  const notes: string[] = [];
  const specialCases: SpecialCaseType[] = [];

  // 1. Comments
  if (input.isComment) {
    return {
      classification: 'COMMENT',
      confidence: 'HIGH',
      risk: 'LOW',
      isUserFacing: false,
      reviewRequired: false,
      specialCases: [],
      notes: ['Comment in source code'],
    };
  }

  // 2. Pure technical tokens & CSS
  if (input.jsxAttributeName && TECHNICAL_ATTRIBUTES.has(input.jsxAttributeName)) {
    return {
      classification: 'TECHNICAL',
      confidence: 'HIGH',
      risk: 'LOW',
      isUserFacing: false,
      reviewRequired: false,
      specialCases: [],
      notes: [`Inside technical attribute: ${input.jsxAttributeName}`],
    };
  }

  if (isPureTechnicalToken(trimmed)) {
    return {
      classification: 'TECHNICAL',
      confidence: 'HIGH',
      risk: 'LOW',
      isUserFacing: false,
      reviewRequired: false,
      specialCases: [],
      notes: ['Technical code, enum, path, or CSS utility string'],
    };
  }

  // 3. Protected business identifiers check
  if (PROTECTED_BUSINESS_TOKENS.has(trimmed)) {
    notes.push(`Protected business identifier: "${trimmed}" - MUST remain code`);
    return {
      classification: 'NON_USER_FACING',
      confidence: 'HIGH',
      risk: 'CRITICAL',
      isUserFacing: false,
      reviewRequired: true,
      specialCases: ['shared_business_ui'],
      notes,
    };
  }

  // 3b. Ambiguous short codes check (OK, CSV, ID, etc.)
  if (AMBIGUOUS_SHORT_CODES.has(trimmed.toUpperCase())) {
    return {
      classification: 'AMBIGUOUS',
      confidence: 'LOW',
      risk: 'MEDIUM',
      isUserFacing: false,
      reviewRequired: true,
      specialCases: [],
      notes: [`Ambiguous short token "${trimmed}" requiring human review (e.g. OK, CSV, ID)`],
    };
  }

  // 4. Detect special cases in the string
  if (input.isPartOfBinaryConcatenation) {
    specialCases.push('concatenated');
    notes.push('String is part of a binary concatenation (+)');
  }
  if (input.isTemplateLiteral || input.hasTemplateExpressions) {
    specialCases.push('template_literal');
    notes.push('Template literal containing dynamic expressions');
  }
  if (/\{[a-zA-Z0-9_-]+\}|\{\{[a-zA-Z0-9_-]+\}\}/.test(trimmed)) {
    specialCases.push('interpolation');
    notes.push('Contains parameter placeholder ({param})');
  }
  if (/\d+/.test(trimmed) && containsArabic(trimmed)) {
    specialCases.push('mixed_numbers');
    notes.push('Contains mixed numeric digits with text');
  }
  if (/\d{4}-\d{2}-\d{2}|تاريخ|اليوم|أمس|ساعة/.test(trimmed)) {
    specialCases.push('date_string');
  }
  if (/(SAR|ر\.س|ريال)/i.test(trimmed)) {
    specialCases.push('currency_string');
  }
  if (/(كجم|طن|كيلوغرام|kg|ton)/i.test(trimmed)) {
    specialCases.push('unit_string');
  }

  // 5. User-facing checks
  const hasArabic = containsArabic(trimmed);

  // Visible JSX Text
  if (input.isJsxText) {
    if (hasArabic) {
      return {
        classification: 'REAL_USER_FACING',
        confidence: 'HIGH',
        risk: specialCases.length > 0 ? 'HIGH' : 'LOW',
        isUserFacing: true,
        reviewRequired: specialCases.includes('concatenated'),
        specialCases,
        notes: ['Visible JSX text in Arabic'],
      };
    }

    // English JSX text
    if (/^[A-Za-z0-9\s.,!?:;()\-_&/%$#@+*]+$/.test(trimmed) && trimmed.length > 1) {
      return {
        classification: 'LIKELY_USER_FACING',
        confidence: 'MEDIUM',
        risk: 'LOW',
        isUserFacing: true,
        reviewRequired: false,
        specialCases,
        notes: ['Visible JSX text in English'],
      };
    }
  }

  // User-facing attribute (placeholder, title, label, aria-label, etc.)
  if (input.jsxAttributeName && USER_FACING_ATTRIBUTES.has(input.jsxAttributeName)) {
    return {
      classification: hasArabic ? 'REAL_USER_FACING' : 'LIKELY_USER_FACING',
      confidence: 'HIGH',
      risk: specialCases.length > 0 ? 'HIGH' : 'LOW',
      isUserFacing: true,
      reviewRequired: false,
      specialCases,
      notes: [`User-facing JSX attribute: ${input.jsxAttributeName}`],
    };
  }

  // UI Toast / Message calls
  const isToastOrAlert =
    input.callFunctionName &&
    /^(toast|alert|confirm|notify|showError|showSuccess|showWarning|showMessage)$/i.test(input.callFunctionName);

  if (isToastOrAlert) {
    return {
      classification: 'REAL_USER_FACING',
      confidence: 'HIGH',
      risk: specialCases.length > 0 ? 'HIGH' : 'LOW',
      isUserFacing: true,
      reviewRequired: false,
      specialCases,
      notes: [`Toast/Notification function argument: ${input.callFunctionName}`],
    };
  }

  // Error messages
  const isErrorCall = input.callFunctionName && /^(Error|TypeError|RangeError)$/.test(input.callFunctionName);
  if (isErrorCall) {
    if (hasArabic) {
      return {
        classification: 'REAL_USER_FACING',
        confidence: 'HIGH',
        risk: 'MEDIUM',
        isUserFacing: true,
        reviewRequired: true,
        specialCases,
        notes: ['User-facing validation or business Error constructor with Arabic message'],
      };
    }
    return {
      classification: 'AMBIGUOUS',
      confidence: 'LOW',
      risk: 'MEDIUM',
      isUserFacing: false,
      reviewRequired: true,
      specialCases,
      notes: ['Internal or developer-facing Error message in English'],
    };
  }

  // Object values under UI-related keys
  if (input.parentObjectKey && /^(title|label|header|message|desc|description|placeholder|badge|tooltip|text)$/i.test(input.parentObjectKey)) {
    if (hasArabic) {
      return {
        classification: 'REAL_USER_FACING',
        confidence: 'HIGH',
        risk: specialCases.length > 0 ? 'HIGH' : 'LOW',
        isUserFacing: true,
        reviewRequired: false,
        specialCases,
        notes: [`UI object property value under "${input.parentObjectKey}"`],
      };
    }
    return {
      classification: 'LIKELY_USER_FACING',
      confidence: 'MEDIUM',
      risk: 'LOW',
      isUserFacing: true,
      reviewRequired: false,
      specialCases,
      notes: [`UI object property value under "${input.parentObjectKey}" in English`],
    };
  }

  // General Arabic strings anywhere in code
  if (hasArabic) {
    return {
      classification: 'REAL_USER_FACING',
      confidence: 'MEDIUM',
      risk: specialCases.length > 0 ? 'HIGH' : 'LOW',
      isUserFacing: true,
      reviewRequired: specialCases.length > 0,
      specialCases,
      notes: ['Arabic string literal in source file'],
    };
  }

  // Unclassified short English tokens without context
  if (/^[A-Za-z0-9_-]+$/.test(trimmed)) {
    return {
      classification: 'AMBIGUOUS',
      confidence: 'LOW',
      risk: 'MEDIUM',
      isUserFacing: false,
      reviewRequired: true,
      specialCases,
      notes: ['Ambiguous standalone identifier or unclassified token'],
    };
  }

  return {
    classification: 'NON_USER_FACING',
    confidence: 'MEDIUM',
    risk: 'LOW',
    isUserFacing: false,
    reviewRequired: false,
    specialCases,
    notes: ['General non-user-facing code string'],
  };
}
