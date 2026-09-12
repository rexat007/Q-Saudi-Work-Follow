/**
 * BLOCK 44 — Safe Automated i18n Codemod Engine
 * Candidate Classifier & Risk Policy Engine
 */

import ts from 'typescript';
import {
  CodemodCandidate,
  CodemodRisk,
  CodemodClassification,
} from './codemod.types';
import { RawCandidate } from './codemod.scanner';
import { CodemodCatalogMatcher } from './codemod.matcher';
import { CodemodImportManager } from './codemod.importManager';
import {
  SAFE_JSX_ATTRIBUTES,
  EXCLUDED_TECHNICAL_ATTRIBUTES,
  PROTECTED_BUSINESS_TOKENS,
  PROTECTED_STATUS_CODES,
} from './codemod.constants';

export class CodemodClassifier {
  private matcher: CodemodCatalogMatcher;
  private importManager: CodemodImportManager;

  constructor(matcher?: CodemodCatalogMatcher, importManager?: CodemodImportManager) {
    this.matcher = matcher || CodemodCatalogMatcher.getInstance();
    this.importManager = importManager || new CodemodImportManager();
  }

  /**
   * Evaluates a raw AST candidate and produces a fully classified CodemodCandidate.
   */
  public classify(
    raw: RawCandidate,
    filePath: string,
    sourceFile: ts.SourceFile
  ): CodemodCandidate {
    const candidateId = `cand_${this.hash(filePath)}_${raw.sourceLocation.line}_${raw.sourceLocation.column}`;
    const reviewReasons: string[] = [];

    // 1. Check Already-Translated
    if (raw.isAlreadyTranslated) {
      return {
        id: candidateId,
        sourceFile: filePath,
        sourceLocation: raw.sourceLocation,
        nodeKind: raw.nodeKind,
        originalText: raw.originalText,
        proposedReplacement: raw.originalText,
        translationKey: null,
        category: null,
        risk: 'SKIP',
        confidence: 'HIGH',
        classification: 'SKIP',
        reason: 'ALREADY_TRANSLATED',
        reviewReasons: [],
        interpolationParams: [],
        protectedTokens: [],
        requiresImport: false,
        requiresHook: false,
        targetComponent: null,
        isAlreadyTranslated: true,
        semanticContext: raw.semanticContext,
      };
    }

    // 2. Check Technical Logging Call (console.log, logger.error)
    if (raw.semanticContext.startsWith('technical_call_')) {
      return {
        id: candidateId,
        sourceFile: filePath,
        sourceLocation: raw.sourceLocation,
        nodeKind: raw.nodeKind,
        originalText: raw.originalText,
        proposedReplacement: raw.originalText,
        translationKey: null,
        category: null,
        risk: 'SKIP',
        confidence: 'HIGH',
        classification: 'SKIP',
        reason: 'INTERNAL_LOGGING',
        reviewReasons: [],
        interpolationParams: [],
        protectedTokens: [],
        requiresImport: false,
        requiresHook: false,
        targetComponent: null,
        isAlreadyTranslated: false,
        semanticContext: raw.semanticContext,
      };
    }

    // 3. Check Excluded Technical Attributes
    if (raw.nodeKind === 'JsxAttribute' && raw.attributeName) {
      const attr = raw.attributeName;
      const lowerAttr = attr.toLowerCase();
      if (
        EXCLUDED_TECHNICAL_ATTRIBUTES.has(attr) ||
        EXCLUDED_TECHNICAL_ATTRIBUTES.has(lowerAttr) ||
        lowerAttr.startsWith('data-') ||
        (lowerAttr.startsWith('aria-') && lowerAttr !== 'aria-label' && lowerAttr !== 'aria-description')
      ) {
        return {
          id: candidateId,
          sourceFile: filePath,
          sourceLocation: raw.sourceLocation,
          nodeKind: raw.nodeKind,
          originalText: raw.originalText,
          proposedReplacement: raw.originalText,
          translationKey: null,
          category: null,
          risk: 'SKIP',
          confidence: 'HIGH',
          classification: 'SKIP',
          reason: `TECHNICAL_ATTRIBUTE_${raw.attributeName}`,
          reviewReasons: [],
          interpolationParams: [],
          protectedTokens: [],
          requiresImport: false,
          requiresHook: false,
          targetComponent: null,
          isAlreadyTranslated: false,
          semanticContext: raw.semanticContext,
        };
      }
    }

    // 4. Check Protected Status Codes (machine-readable enum values)
    if (PROTECTED_STATUS_CODES.has(raw.originalText.trim())) {
      return {
        id: candidateId,
        sourceFile: filePath,
        sourceLocation: raw.sourceLocation,
        nodeKind: raw.nodeKind,
        originalText: raw.originalText,
        proposedReplacement: raw.originalText,
        translationKey: null,
        category: null,
        risk: 'SKIP',
        confidence: 'HIGH',
        classification: 'SKIP',
        reason: 'PROTECTED_STATUS_CODE',
        reviewReasons: [],
        interpolationParams: [],
        protectedTokens: [raw.originalText.trim()],
        requiresImport: false,
        requiresHook: false,
        targetComponent: null,
        isAlreadyTranslated: false,
        semanticContext: raw.semanticContext,
      };
    }

    // 5. Check Protected Business Tokens (ticketId, truckNo, SAR, KG, TON)
    if (PROTECTED_BUSINESS_TOKENS.has(raw.originalText.trim())) {
      return {
        id: candidateId,
        sourceFile: filePath,
        sourceLocation: raw.sourceLocation,
        nodeKind: raw.nodeKind,
        originalText: raw.originalText,
        proposedReplacement: raw.originalText,
        translationKey: null,
        category: null,
        risk: 'REVIEW_ONLY',
        confidence: 'HIGH',
        classification: 'REVIEW_ONLY',
        reason: 'PROTECTED_BUSINESS_TOKEN',
        reviewReasons: ['PROTECTED_BUSINESS_TOKEN_COLLISION'],
        interpolationParams: [],
        protectedTokens: [raw.originalText.trim()],
        requiresImport: false,
        requiresHook: false,
        targetComponent: null,
        isAlreadyTranslated: false,
        semanticContext: raw.semanticContext,
      };
    }

    // 6. Check String Concatenation (+) -> Must be REVIEW_ONLY
    if (raw.isStringConcatenation) {
      return {
        id: candidateId,
        sourceFile: filePath,
        sourceLocation: raw.sourceLocation,
        nodeKind: raw.nodeKind,
        originalText: raw.originalText,
        proposedReplacement: raw.originalText,
        translationKey: null,
        category: null,
        risk: 'REVIEW_ONLY',
        confidence: 'LOW',
        classification: 'REVIEW_ONLY',
        reason: 'STRING_CONCATENATION_ROUTED_TO_REVIEW',
        reviewReasons: ['STRING_CONCATENATION'],
        interpolationParams: [],
        protectedTokens: [],
        requiresImport: false,
        requiresHook: false,
        targetComponent: null,
        isAlreadyTranslated: false,
        semanticContext: raw.semanticContext,
      };
    }

    // 7. Check Embedded Expressions in JSXText (e.g. <div>الوزن: {netWeight} كجم</div>)
    if (raw.nodeKind === 'JsxText' && raw.hasEmbeddedSiblings) {
      return {
        id: candidateId,
        sourceFile: filePath,
        sourceLocation: raw.sourceLocation,
        nodeKind: raw.nodeKind,
        originalText: raw.originalText,
        proposedReplacement: raw.originalText,
        translationKey: null,
        category: null,
        risk: 'REVIEW_ONLY',
        confidence: 'LOW',
        classification: 'REVIEW_ONLY',
        reason: 'EMBEDDED_JSX_EXPRESSION_ROUTED_TO_REVIEW',
        reviewReasons: ['EMBEDDED_JSX_SIBLING_EXPRESSION'],
        interpolationParams: [],
        protectedTokens: [],
        requiresImport: false,
        requiresHook: false,
        targetComponent: null,
        isAlreadyTranslated: false,
        semanticContext: raw.semanticContext,
      };
    }

    // 8. Catalog Matching
    const match = this.matcher.match(
      filePath,
      raw.sourceLocation.line,
      raw.originalText,
      raw.semanticContext
    );

    if (!match.matched || !match.key) {
      return {
        id: candidateId,
        sourceFile: filePath,
        sourceLocation: raw.sourceLocation,
        nodeKind: raw.nodeKind,
        originalText: raw.originalText,
        proposedReplacement: raw.originalText,
        translationKey: null,
        category: null,
        risk: 'REVIEW_ONLY',
        confidence: 'LOW',
        classification: 'REVIEW_ONLY',
        reason: 'CATALOG_ENTRY_MISSING_OR_UNMATCHED',
        reviewReasons: ['NO_CATALOG_MAPPING'],
        interpolationParams: raw.interpolationParams,
        protectedTokens: [],
        requiresImport: false,
        requiresHook: false,
        targetComponent: null,
        isAlreadyTranslated: false,
        semanticContext: raw.semanticContext,
        internalDataKey: raw.internalDataKey,
        isReportOrExportField: false,
      };
    }

    // 9. Check Semantic Conflict
    if (match.hasSemanticConflict || !match.isUnique) {
      reviewReasons.push('SEMANTIC_CONFLICT');
    }

    // 10. Check Interpolation Parameters
    const proposal = match.proposal;
    const catalogParams = proposal?.interpolationParams || [];
    let isInterpolationValid = true;

    if (raw.interpolationParams.length > 0 || catalogParams.length > 0) {
      if (raw.interpolationParams.length !== catalogParams.length) {
        isInterpolationValid = false;
        reviewReasons.push('INTERPOLATION_PARAM_COUNT_MISMATCH');
      } else {
        for (const p of raw.interpolationParams) {
          if (!catalogParams.includes(p)) {
            isInterpolationValid = false;
            reviewReasons.push(`MISSING_CATALOG_PARAM_${p}`);
          }
        }
      }
    }

    // 11. Analyze Hook Placement Safety
    const hookAnalysis = this.importManager.analyzeHookSafety(raw.node, sourceFile, filePath);
    if (!hookAnalysis.canUseHook) {
      reviewReasons.push(hookAnalysis.reason || 'UNSAFE_HOOK_PLACEMENT');
    }

    // 12. Determine Risk & Classification
    let risk: CodemodRisk;
    let classification: CodemodClassification;
    let reason: string;

    if (reviewReasons.length > 0) {
      risk = 'REVIEW_ONLY';
      classification = 'REVIEW_ONLY';
      reason = reviewReasons.join('; ');
    } else if (match.isReportOrExport) {
      risk = 'HIGH_RISK';
      classification = 'TRANSFORM_HIGH_RISK';
      reason = 'REPORT_EXPORT_PRESENTATION_LABEL';
    } else if (raw.nodeKind === 'TemplateExpression') {
      risk = 'HIGH_RISK';
      classification = 'TRANSFORM_HIGH_RISK';
      reason = 'TEMPLATE_LITERAL_INTERPOLATION';
    } else if (
      match.proposal?.category === 'pricing' ||
      match.proposal?.category === 'imports' ||
      match.proposal?.category === 'security'
    ) {
      risk = 'HIGH_RISK';
      classification = 'TRANSFORM_HIGH_RISK';
      reason = `SENSITIVE_DOMAIN_${match.proposal.category.toUpperCase()}`;
    } else if (raw.nodeKind === 'CallExpression') {
      risk = 'LOW_RISK';
      classification = 'TRANSFORM_LOW_RISK';
      reason = 'USER_FACING_MESSAGE_CALL';
    } else if (
      raw.nodeKind === 'JsxAttribute' &&
      raw.attributeName &&
      SAFE_JSX_ATTRIBUTES.has(raw.attributeName)
    ) {
      risk = 'SAFE';
      classification = 'TRANSFORM_SAFE';
      reason = `SAFE_JSX_ATTRIBUTE_${raw.attributeName}`;
    } else if (match.isSharedAction) {
      risk = 'SAFE';
      classification = 'TRANSFORM_SAFE';
      reason = 'SHARED_ACTION_EXACT_MATCH';
    } else if (raw.nodeKind === 'JsxText') {
      risk = 'SAFE';
      classification = 'TRANSFORM_SAFE';
      reason = 'PLAIN_JSX_TEXT_EXACT_MATCH';
    } else {
      risk = 'LOW_RISK';
      classification = 'TRANSFORM_LOW_RISK';
      reason = 'STANDARD_USER_FACING_TEXT';
    }

    // 13. Build Proposed Replacement Code
    const proposedReplacement = this.buildReplacement(raw, match.key, raw.interpolationParams);

    return {
      id: candidateId,
      sourceFile: filePath,
      sourceLocation: raw.sourceLocation,
      nodeKind: raw.nodeKind,
      originalText: raw.originalText,
      proposedReplacement,
      translationKey: match.key,
      category: match.proposal?.category || (match.catalogEntry?.category as any) || 'shared',
      risk,
      confidence: match.confidence,
      classification,
      reason,
      reviewReasons,
      interpolationParams: raw.interpolationParams,
      protectedTokens: proposal?.protectedTokens || [],
      requiresImport: hookAnalysis.needsImport,
      requiresHook: !hookAnalysis.alreadyHasTHook,
      targetComponent: hookAnalysis.componentName,
      isAlreadyTranslated: false,
      semanticContext: raw.semanticContext,
      internalDataKey: raw.internalDataKey,
      isReportOrExportField: match.isReportOrExport,
    };
  }

  private buildReplacement(
    raw: RawCandidate,
    key: string,
    params: string[]
  ): string {
    let callExpr: string;
    if (params.length > 0) {
      callExpr = `t("${key}", { ${params.join(', ')} })`;
    } else {
      callExpr = `t("${key}")`;
    }

    switch (raw.nodeKind) {
      case 'JsxText':
        return `{${callExpr}}`;
      case 'JsxAttribute':
        // If the attribute value was a string literal, in JSX it becomes attr={t("key")}
        return `{${callExpr}}`;
      case 'CallExpression':
        return callExpr;
      case 'TemplateExpression':
        return callExpr;
      case 'ObjectLiteralExpression':
        return callExpr;
      default:
        return callExpr;
    }
  }

  private hash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).slice(0, 8);
  }
}
