/**
 * BLOCK 41 — i18n Catalog Extraction & Translation-Key Architecture
 * Types & Schema Definitions
 */

export type SemanticCategory =
  | 'navigation'
  | 'dashboard'
  | 'authentication'
  | 'projects'
  | 'carriers'
  | 'trucks'
  | 'drivers'
  | 'materials'
  | 'trips'
  | 'loading'
  | 'unloading'
  | 'weighbridge'
  | 'imports'
  | 'entityResolution'
  | 'pricing'
  | 'legacyMigration'
  | 'reports'
  | 'security'
  | 'offline'
  | 'exceptions'
  | 'validation'
  | 'shared'
  | 'other';

export type ClassificationType =
  | 'REAL_USER_FACING'
  | 'LIKELY_USER_FACING'
  | 'AMBIGUOUS'
  | 'NON_USER_FACING'
  | 'TECHNICAL'
  | 'COMMENT';

export type ExtractionConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export type MigrationRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type DirectionalClassRisk = 'MUST_MIGRATE' | 'PROBABLY_SAFE' | 'TECHNICAL';

export type SpecialCaseType =
  | 'concatenated'
  | 'template_literal'
  | 'interpolation'
  | 'mixed_numbers'
  | 'date_string'
  | 'currency_string'
  | 'unit_string'
  | 'report_column_key'
  | 'export_header'
  | 'sorting_filter'
  | 'shared_business_ui';

export interface CatalogEntry {
  id: string; // Deterministic hash: e.g. cat_entry_<hash>
  sourceFile: string;
  sourceLine?: number;
  sourceColumn?: number;
  originalText: string;
  normalizedText: string;
  semanticCategory: SemanticCategory;
  semanticContext: string;
  proposedTranslationKey: string;
  duplicateGroupId?: string;
  extractionConfidence: ExtractionConfidence;
  migrationRisk: MigrationRisk;
  isUserFacing: boolean;
  classification: ClassificationType;
  reviewRequired: boolean;
  specialCases: SpecialCaseType[];
  notes?: string[];
}

export interface DuplicateGroup {
  id: string;
  normalizedText: string;
  entriesCount: number;
  files: string[];
  categories: SemanticCategory[];
  isCrossCategory: boolean;
  isSemanticDuplicate: boolean;
  distinctProposedKeys: string[];
}

export interface SemanticConflictContext {
  category: SemanticCategory;
  context: string;
  proposedKey: string;
  files: string[];
  occurrenceCount: number;
}

export interface SemanticConflictGroup {
  id: string;
  normalizedText: string;
  occurrences: number;
  contexts: SemanticConflictContext[];
  reason: string;
}

export interface DirectionalClassUsage {
  file: string;
  line: number;
  column: number;
  className: string;
  type: 'text-alignment' | 'padding' | 'margin' | 'border' | 'position' | 'icon';
  risk: DirectionalClassRisk;
  element?: string;
  suggestedReplacement?: string;
  contextSnippet?: string;
}

export interface BusinessDataFinding {
  token: string;
  file: string;
  line: number;
  isProtected: boolean;
  reason: string;
}

export interface UnitCurrencyFinding {
  token: string;
  file: string;
  line: number;
  isUnit: boolean;
  isCurrency: boolean;
  presentationText: string;
  internalCode: string;
}

export interface CatalogSummary {
  totalFilesScanned: number;
  totalCandidates: number;
  userFacingCount: number;
  likelyUserFacingCount: number;
  ambiguousCount: number;
  technicalCount: number;
  nonUserFacingCount: number;
  commentCount: number;
  duplicateGroupsCount: number;
  semanticConflictGroupsCount: number;
  proposedKeyCount: number;
  keysRequiringReviewCount: number;
  highRiskCount: number;
  criticalRiskCount: number;
  categoryCounts: Record<SemanticCategory, number>;
  directionalClassesCount: {
    total: number;
    mustMigrate: number;
    probablySafe: number;
    technical: number;
  };
  specialCasesCount: Record<SpecialCaseType, number>;
}

export interface CatalogReport {
  generatedAt: string;
  summary: CatalogSummary;
  directionalInventory: DirectionalClassUsage[];
  semanticConflicts: SemanticConflictGroup[];
  duplicateGroups: DuplicateGroup[];
  highRiskHotspots: CatalogEntry[];
  entries: CatalogEntry[];
}
