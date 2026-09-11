/**
 * Unified Import Pipeline Contracts
 * BLOCK 30: Decoupled contracts for each pipeline stage:
 * SOURCE -> PARSE -> NORMALIZE -> MAP -> ENTITY_RESOLUTION -> VALIDATE -> DUPLICATE_CHECK -> REVIEW -> COMMIT -> AUDIT
 */

import { OperationSourceType } from '../../types/entities';
import {
  ImportSource,
  ImportRow,
  ImportIssue,
  ImportEntityResolutionInfo,
  ImportReviewStatus,
  UnifiedImportBatch,
  ImportResult,
  RawParsedOutput,
  PipelineContext,
} from '../../types/unifiedImport';

/**
 * 1. Parser Contract
 * Every future source (Excel, CSV, Google Sheets, Google Drive, Weighbridge, API, Migration)
 * returns raw data to the pipeline without executing business logic inside.
 */
export interface IImportParser<TInput = any, TRawOutput = Record<string, any>> {
  readonly supportedSourceTypes: readonly OperationSourceType[];
  parse(source: ImportSource, input?: TInput): Promise<RawParsedOutput<TRawOutput>> | RawParsedOutput<TRawOutput>;
}

/**
 * 2. Normalizer Contract
 * Transforms raw data into a canonical representation before validation.
 */
export interface IImportNormalizer<TRaw = Record<string, any>, TCanonical = Record<string, any>> {
  normalize(raw: TRaw, rowNumber: number, context: PipelineContext): Promise<TCanonical> | TCanonical;
}

/**
 * 3. Field Mapper Contract
 * Maps canonical properties to domain model properties.
 */
export interface IImportMapper<TCanonical = Record<string, any>, TMapped = Record<string, any>> {
  map(canonical: TCanonical, rowNumber: number, context: PipelineContext): Promise<TMapped> | TMapped;
}

/**
 * 4. Entity Resolution Contract
 * Resolves references against master data without blocking pipeline extension.
 */
export interface IImportEntityResolver<TMapped = Record<string, any>> {
  resolveEntities(
    mapped: TMapped,
    rowNumber: number,
    context: PipelineContext
  ): Promise<Record<string, ImportEntityResolutionInfo>> | Record<string, ImportEntityResolutionInfo>;
}

/**
 * 5. Validator Contract
 * Evaluates row validity and assigns unified issues with severity, resolvable, and blocking attributes.
 */
export interface IImportValidator<TMapped = Record<string, any>> {
  validateRow(row: ImportRow<any, any>, context: PipelineContext): Promise<ImportIssue[]> | ImportIssue[];
}

/**
 * 6. Duplicate Checker Contract
 * Detects duplicates across the batch or against existing data store.
 * Interface/contract only — extensible for future algorithms.
 */
export interface IImportDuplicateChecker {
  checkDuplicates(rows: ImportRow[], context: PipelineContext): Promise<ImportRow[]> | ImportRow[];
}

/**
 * 7. Review Model Contract
 * Determines review status: accepted, warning, error, requires_review
 */
export interface IImportReviewHandler {
  evaluateReviewStatus(row: ImportRow): ImportReviewStatus;
  applyAction(row: ImportRow, action: string, resolution?: any): ImportRow;
}

/**
 * 8. Committer Contract
 * The pipeline MUST NOT write to Firestore during parsing, normalization, or validation.
 * Actual writes happen only in COMMIT stage after passing preconditions.
 */
export interface IImportCommitter {
  commit(batch: UnifiedImportBatch, context: PipelineContext): Promise<ImportResult>;
}

/**
 * 9. Auditor Contract
 * Connects to the existing audit infrastructure (AuditLogService).
 */
export interface IImportAuditor {
  recordAudit(
    batch: UnifiedImportBatch,
    action: string,
    details: string,
    context: PipelineContext
  ): Promise<void>;
}
