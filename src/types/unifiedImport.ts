/**
 * Unified Import Center Architecture — Domain Model & Types
 * BLOCK 30: Unified, extensible architecture for all future import sources
 * Built on top of Operation Source Model (BLOCK 29)
 * 
 * Pipeline:
 * SOURCE -> PARSE -> NORMALIZE -> MAP -> ENTITY_RESOLUTION -> VALIDATE -> DUPLICATE_CHECK -> REVIEW -> COMMIT -> AUDIT
 */

import { OperationSourceType, TripSourceMetadata } from './entities';

/**
 * The 10 Decoupled Pipeline Stages
 */
export type UnifiedImportPipelineStage =
  | 'SOURCE'
  | 'PARSE'
  | 'NORMALIZE'
  | 'MAP'
  | 'ENTITY_RESOLUTION'
  | 'VALIDATE'
  | 'DUPLICATE_CHECK'
  | 'REVIEW'
  | 'COMMIT'
  | 'AUDIT';

export const UNIFIED_IMPORT_PIPELINE_STAGES: readonly UnifiedImportPipelineStage[] = [
  'SOURCE',
  'PARSE',
  'NORMALIZE',
  'MAP',
  'ENTITY_RESOLUTION',
  'VALIDATE',
  'DUPLICATE_CHECK',
  'REVIEW',
  'COMMIT',
  'AUDIT',
] as const;

/**
 * Import Validation Status
 */
export type ImportValidationStatus = 'PENDING' | 'PASSED' | 'WARNING' | 'FAILED';

/**
 * Import Commit Status
 */
export type ImportCommitStatus =
  | 'DRAFT'
  | 'PARSED'
  | 'NORMALIZED'
  | 'MAPPED'
  | 'RESOLVED'
  | 'VALIDATED'
  | 'AWAITING_REVIEW'
  | 'READY_TO_COMMIT'
  | 'COMMITTED'
  | 'REJECTED'
  | 'FAILED';

/**
 * Severity of an import issue
 */
export type ImportIssueSeverity = 'BLOCKING' | 'WARNING' | 'INFO';

/**
 * Row/Item Review Status
 */
export type ImportReviewStatus = 'accepted' | 'warning' | 'error' | 'requires_review';

/**
 * Unified Import Issue Definition
 */
export interface ImportIssue {
  issueId: string;
  row: number;
  field: string;
  code: string;
  severity: ImportIssueSeverity;
  message: string;
  messageAr?: string;
  resolvable: boolean;
  blocking: boolean;
  suggestedValue?: any;
  originalValue?: any;
}

/**
 * Unified Import Source Descriptor
 * Fully bound to Operation Source Model (BLOCK 29)
 */
export interface ImportSource {
  sourceType: OperationSourceType;
  importBatchId: string;
  sourceFileId?: string;
  sourceFileName?: string;
  sourceSheetName?: string;
  sourceRowId?: string | number;
  sourceMimeType?: string;
  rawInput?: any;
  metadata?: Record<string, any>;
}

/**
 * Resolution info for a mapped entity
 */
export interface ImportEntityResolutionInfo {
  entityType: 'CARRIER' | 'TRUCK' | 'DRIVER' | 'MATERIAL' | 'PRICING_RULE' | 'PROJECT';
  originalValue: string;
  matchedId?: string;
  matchedName?: string;
  confidence: number;
  isExact: boolean;
  isAuthorized?: boolean;
}

/**
 * Duplicate detection metadata
 */
export interface ImportDuplicateInfo {
  isDuplicate: boolean;
  duplicateWithRow?: number;
  existingEntityId?: string;
  duplicateKey: string;
  reason?: string;
}

/**
 * Unified Import Row
 */
export interface ImportRow<TRaw = Record<string, any>, TCanonical = Record<string, any>> {
  rowNumber: number;
  sourceRowId?: string | number;
  raw: TRaw;
  canonical?: TCanonical;
  mapped?: Record<string, any>;
  entityResolutions?: Record<string, ImportEntityResolutionInfo>;
  validationIssues: ImportIssue[];
  duplicateInfo?: ImportDuplicateInfo;
  reviewStatus: ImportReviewStatus;
  reviewAction?: string;
  status: 'PENDING' | 'VALID' | 'WARNING' | 'ERROR' | 'REJECTED' | 'COMMITTED';
  rejectionReason?: string;
  resolvedValues?: Record<string, any>;
}

/**
 * Unified Audit Trail Entry
 */
export interface UnifiedImportAuditEntry {
  timestamp: string;
  userId: string;
  userName?: string;
  action: string;
  fromStage?: UnifiedImportPipelineStage;
  toStage?: UnifiedImportPipelineStage;
  details: string;
  metadata?: Record<string, any>;
}

/**
 * Unified Import Batch
 */
export interface UnifiedImportBatch {
  importBatchId: string;
  projectId: string;
  source: ImportSource;
  currentStage: UnifiedImportPipelineStage;
  validationStatus: ImportValidationStatus;
  commitStatus: ImportCommitStatus;
  
  // Counters
  totalRows: number;
  validRows: number;
  warningRows: number;
  errorRows: number;
  requiresReviewRows: number;
  committedRows: number;

  // Data
  rows: ImportRow[];
  issues: ImportIssue[];

  // Idempotency & Operation Tracking
  operationId: string;
  idempotencyKey?: string;

  // Metadata & Timestamps
  createdAt: string;
  createdBy: string;
  committedAt?: string;
  committedBy?: string;
  metadata?: Record<string, any>;

  // Warning Confirmation for Commit
  warningConfirmation?: {
    confirmed: boolean;
    confirmedBy: string;
    confirmedAt: string;
    notes?: string;
  };

  // Audit
  auditTrail: UnifiedImportAuditEntry[];
}

/**
 * Final Import Result Contract
 */
export interface ImportResult {
  importBatchId: string;
  projectId: string;
  operationId: string;
  sourceType: OperationSourceType;
  success: boolean;
  totalRows: number;
  committedRows: number;
  skippedRows: number;
  failedRows: number;
  issues: ImportIssue[];
  committedEntityIds?: string[];
  executedAt: string;
  error?: string;
}

/**
 * Raw Parsed Output Contract for Parsers
 */
export interface RawParsedOutput<TRaw = Record<string, any>> {
  headers?: string[];
  rows: TRaw[];
  metadata?: Record<string, any>;
}

/**
 * Pipeline Execution Context
 */
export interface PipelineContext {
  projectId: string;
  userId: string;
  userName?: string;
  role?: string;
  operationId: string;
  idempotencyKey?: string;
  allowWarningsCommit?: boolean;
  warningConfirmationNotes?: string;
  existingKeys?: Set<string>;
  knownEntities?: {
    carrierIds?: string[];
    truckPlates?: string[];
    driverIds?: string[];
    materialCodes?: string[];
  };
}
