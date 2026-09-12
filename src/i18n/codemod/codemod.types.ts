/**
 * BLOCK 44 — Safe Automated i18n Codemod Engine with Dry-Run Verification
 * Types & Schema Definitions
 */

import { SemanticCategory, MigrationRisk } from '../catalog/catalog.types';

export type CodemodMode = 'DRY_RUN' | 'APPLY' | 'APPLIED';

export type CodemodRisk = 'SAFE' | 'LOW_RISK' | 'HIGH_RISK' | 'REVIEW_ONLY' | 'SKIP';

export type CodemodClassification =
  | 'TRANSFORM_SAFE'
  | 'TRANSFORM_LOW_RISK'
  | 'TRANSFORM_HIGH_RISK'
  | 'REVIEW_ONLY'
  | 'SKIP';

export type CandidateNodeKind =
  | 'JsxText'
  | 'JsxAttribute'
  | 'CallExpression'
  | 'StringLiteral'
  | 'TemplateExpression'
  | 'NoSubstitutionTemplateLiteral'
  | 'BinaryExpression'
  | 'ConditionalExpression'
  | 'ObjectLiteralExpression'
  | 'Other';

export type SourceFileType = 'COMPONENT_TSX' | 'NON_COMPONENT_TSX' | 'MODULE_TS' | 'UNSUPPORTED';

export interface SourceLocation {
  line: number;
  column: number;
  startPos: number;
  endPos: number;
}

export interface CodemodCandidate {
  id: string; // Unique deterministic candidate ID: e.g. cand_<fileHash>_<line>_<col>
  sourceFile: string;
  sourceLocation: SourceLocation;
  nodeKind: CandidateNodeKind;
  originalText: string;
  proposedReplacement: string;
  translationKey: string | null;
  category: SemanticCategory | 'shared' | 'other' | null;
  risk: CodemodRisk;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  classification: CodemodClassification;
  reason: string;
  reviewReasons: string[];
  interpolationParams: string[];
  protectedTokens: string[];
  requiresImport: boolean;
  requiresHook: boolean;
  targetComponent: string | null;
  isAlreadyTranslated: boolean;
  semanticContext: string;
  internalDataKey?: string;
  isReportOrExportField?: boolean;
}

export interface CodemodDiff {
  sourceFile: string;
  line: number;
  before: string;
  after: string;
  patch: string;
}

export interface CodemodBatchFilter {
  risk?: CodemodRisk[];
  category?: string[];
  batchSize?: number;
  files?: string[];
  mode?: CodemodMode;
}

export interface CodemodSummary {
  filesScanned: number;
  candidatesFound: number;
  safeCount: number;
  lowRiskCount: number;
  highRiskCount: number;
  reviewOnlyCount: number;
  skipCount: number;
  proposedEdits: number;
  filesThatWouldChange: number;
  importChanges: number;
  interpolationTransforms: number;
  protectedTokenFindings: number;
  reportExportFindings: number;
  semanticConflictFindings: number;
  categoryBreakdown: Record<string, number>;
  riskBreakdown: Record<CodemodRisk, number>;
}

export interface CodemodDryRunReport {
  version: string;
  generatedAt: string;
  mode: CodemodMode;
  summary: CodemodSummary;
  candidates: CodemodCandidate[];
  diffs: CodemodDiff[];
}

export interface CodemodManifestEntry {
  sourceFile: string;
  originalHash: string;
  modifiedHash: string;
  translationKeysInserted: string[];
  timestamp: string;
  transformCount: number;
}

export interface CodemodManifest {
  version: string;
  generatedAt: string;
  mode: CodemodMode;
  entries: CodemodManifestEntry[];
}

export interface TransformResult {
  transformedContent: string;
  isValid: boolean;
  parseErrors: string[];
  appliedCandidates: CodemodCandidate[];
  skippedCandidates: CodemodCandidate[];
}

export interface SafetyCheckResult {
  id: string;
  name: string;
  passed: boolean;
  message: string;
  details?: string;
}
