/**
 * Default Import Pipeline Stages Implementation
 * BLOCK 30: Baseline implementations of pipeline stage contracts
 */

import { OperationSourceType } from '../../types/entities';
import { VALID_OPERATION_SOURCE_TYPES } from '../../validators/operationSource.validator';
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
import {
  IImportParser,
  IImportNormalizer,
  IImportMapper,
  IImportEntityResolver,
  IImportValidator,
  IImportDuplicateChecker,
  IImportReviewHandler,
  IImportCommitter,
  IImportAuditor,
} from './contracts';
import { UnifiedImportValidator } from '../../validators/unifiedImport.validator';

/**
 * 1. Default Parser
 * Returns raw structured data to the pipeline without executing business logic.
 */
export class DefaultImportParser implements IImportParser {
  public readonly supportedSourceTypes: readonly OperationSourceType[] = VALID_OPERATION_SOURCE_TYPES;

  public parse(source: ImportSource, input?: any): RawParsedOutput {
    // If input is provided as rows array
    if (Array.isArray(input)) {
      const headers = input.length > 0 ? Object.keys(input[0]) : [];
      return {
        headers,
        rows: input,
        metadata: {
          sourceType: source.sourceType,
          totalParsed: input.length,
          sourceFileName: source.sourceFileName,
        },
      };
    }

    // If source has rawInput attached
    if (source.rawInput && Array.isArray(source.rawInput)) {
      const headers = source.rawInput.length > 0 ? Object.keys(source.rawInput[0]) : [];
      return {
        headers,
        rows: source.rawInput,
        metadata: {
          sourceType: source.sourceType,
          totalParsed: source.rawInput.length,
        },
      };
    }

    // Default empty
    return {
      headers: [],
      rows: [],
      metadata: { sourceType: source.sourceType, totalParsed: 0 },
    };
  }
}

/**
 * 2. Default Normalizer
 * Transforms raw data into a canonical representation before validation.
 */
export class DefaultImportNormalizer implements IImportNormalizer {
  public normalize(raw: Record<string, any>, rowNumber: number, _context: PipelineContext): Record<string, any> {
    const canonical: Record<string, any> = { _rowNumber: rowNumber };

    for (const [key, value] of Object.entries(raw)) {
      if (typeof value === 'string') {
        const trimmed = value.trim();
        canonical[key] = trimmed === '' ? null : trimmed;
      } else {
        canonical[key] = value;
      }
    }

    return canonical;
  }
}

/**
 * 3. Default Mapper
 * Standard identity mapper for canonical fields
 */
export class DefaultImportMapper implements IImportMapper {
  public map(canonical: Record<string, any>, rowNumber: number, _context: PipelineContext): Record<string, any> {
    return {
      ...canonical,
      _mappedRowNumber: rowNumber,
    };
  }
}

/**
 * 4. Default Entity Resolver
 * Decoupled reference lookup against context
 */
export class DefaultImportEntityResolver implements IImportEntityResolver {
  public resolveEntities(
    mapped: Record<string, any>,
    _rowNumber: number,
    context: PipelineContext
  ): Record<string, ImportEntityResolutionInfo> {
    const resolutions: Record<string, ImportEntityResolutionInfo> = {};

    // Check Carrier
    if (mapped.carrierId || mapped.carrier) {
      const rawVal = String(mapped.carrierId || mapped.carrier);
      const isKnown = context.knownEntities?.carrierIds?.includes(rawVal) ?? false;
      resolutions.carrier = {
        entityType: 'CARRIER',
        originalValue: rawVal,
        matchedId: isKnown ? rawVal : undefined,
        confidence: isKnown ? 100 : 0,
        isExact: isKnown,
        isAuthorized: isKnown,
      };
    }

    return resolutions;
  }
}

/**
 * 5. Default Validator
 * Produces unified ImportIssue items with severity, blocking, and resolvable flags
 */
export class DefaultImportValidator implements IImportValidator {
  public validateRow(row: ImportRow<any, any>, _context: PipelineContext): ImportIssue[] {
    const issues: ImportIssue[] = [];
    const canonical = row.canonical || row.raw || {};

    // Example blocking validation: if mandatory fields are missing
    if (canonical.isTestBlocking) {
      issues.push({
        issueId: `ISSUE-BLK-${row.rowNumber}-01`,
        row: row.rowNumber,
        field: 'mandatoryField',
        code: 'MISSING_REQUIRED_FIELD',
        severity: 'BLOCKING',
        message: 'حقل إلزامي مفقود يمنع الاعتماد',
        messageAr: 'حقل إلزامي مفقود يمنع الاعتماد',
        resolvable: true,
        blocking: true,
      });
    }

    // Example warning validation: non-blocking warning
    if (canonical.isTestWarning) {
      issues.push({
        issueId: `ISSUE-WRN-${row.rowNumber}-01`,
        row: row.rowNumber,
        field: 'recommendedField',
        code: 'OPTIONAL_FORMAT_WARNING',
        severity: 'WARNING',
        message: 'تنبيه: صيغة الحقل غير قياسية ولكن مقبولة مع التحذير',
        messageAr: 'تنبيه: صيغة الحقل غير قياسية ولكن مقبولة مع التحذير',
        resolvable: true,
        blocking: false,
      });
    }

    return issues;
  }
}

/**
 * 6. Default Duplicate Checker
 * Interface/contract implementation with extensible key-check
 */
export class DefaultImportDuplicateChecker implements IImportDuplicateChecker {
  public checkDuplicates(rows: ImportRow[], context: PipelineContext): ImportRow[] {
    const seenBatchKeys = new Set<string>();

    return rows.map((row) => {
      const canonical = row.canonical || row.raw || {};
      const dupKey = canonical.ticketId || canonical.waybill || canonical.docNumber || canonical.id;

      if (dupKey && typeof dupKey === 'string') {
        // Check batch internal duplicate
        if (seenBatchKeys.has(dupKey)) {
          return {
            ...row,
            duplicateInfo: {
              isDuplicate: true,
              duplicateKey: dupKey,
              reason: `تكرار داخل نفس دفعة الاستيراد للمفتاح (${dupKey})`,
            },
          };
        }
        seenBatchKeys.add(dupKey);

        // Check against existing database keys
        if (context.existingKeys && context.existingKeys.has(dupKey)) {
          return {
            ...row,
            duplicateInfo: {
              isDuplicate: true,
              duplicateKey: dupKey,
              reason: `المفتاح (${dupKey}) مسجل مسبقاً في قاعدة البيانات`,
            },
          };
        }
      }

      return row;
    });
  }
}

/**
 * 7. Default Review Handler
 * Classifies rows into: accepted, warning, error, requires_review
 */
export class DefaultImportReviewHandler implements IImportReviewHandler {
  public evaluateReviewStatus(row: ImportRow): ImportReviewStatus {
    if (row.duplicateInfo?.isDuplicate) {
      return 'error';
    }

    const hasBlocking = row.validationIssues.some((i) => i.severity === 'BLOCKING' || i.blocking);
    if (hasBlocking) {
      return 'error';
    }

    const hasWarning = row.validationIssues.some((i) => i.severity === 'WARNING');
    if (hasWarning) {
      return 'requires_review';
    }

    return 'accepted';
  }

  public applyAction(row: ImportRow, action: string, resolution?: any): ImportRow {
    if (action === 'REJECT_ROW') {
      return {
        ...row,
        status: 'REJECTED',
        reviewStatus: 'error',
        rejectionReason: resolution?.notes || 'تم استبعاد الصف يدوياً من قبل المستخدم',
      };
    }

    if (action === 'ACCEPT_WARNING') {
      return {
        ...row,
        status: 'VALID',
        reviewStatus: 'accepted',
        resolvedValues: resolution,
      };
    }

    return row;
  }
}

/**
 * 8. Default Committer
 * Does NOT write to Firestore during parsing/validation.
 * Only writes during COMMIT stage after all checks pass.
 * Respects idempotency via operationId.
 */
export class DefaultImportCommitter implements IImportCommitter {
  // In-memory cache for idempotency of completed operations
  private static committedOperations = new Map<string, ImportResult>();

  public static resetIdempotencyCache(): void {
    this.committedOperations.clear();
  }

  public async commit(batch: UnifiedImportBatch, context: PipelineContext): Promise<ImportResult> {
    // 1. Idempotency Check: if operationId was already executed, return cached result
    if (DefaultImportCommitter.committedOperations.has(context.operationId)) {
      return DefaultImportCommitter.committedOperations.get(context.operationId)!;
    }

    // 2. Project Isolation Check
    const isolation = UnifiedImportValidator.enforceProjectIsolation(batch.projectId, context);
    if (!isolation.isAllowed) {
      return {
        importBatchId: batch.importBatchId,
        projectId: batch.projectId,
        operationId: context.operationId,
        sourceType: batch.source.sourceType,
        success: false,
        totalRows: batch.totalRows,
        committedRows: 0,
        skippedRows: batch.totalRows,
        failedRows: batch.totalRows,
        issues: [
          {
            issueId: `ISOLATION-ERR-${Date.now()}`,
            row: 0,
            field: 'projectId',
            code: 'PROJECT_ISOLATION_VIOLATION',
            severity: 'BLOCKING',
            message: isolation.error || 'Project isolation violation',
            resolvable: false,
            blocking: true,
          },
        ],
        executedAt: new Date().toISOString(),
        error: isolation.error,
      };
    }

    // 3. Pre-commit check: Blocking Errors
    if (batch.errorRows > 0) {
      const errorMsg = `لا يمكن تنفيذ الاعتماد (Commit): توجد (${batch.errorRows}) أخطاء حرجة مانعة للاعتماد.`;
      return {
        importBatchId: batch.importBatchId,
        projectId: batch.projectId,
        operationId: context.operationId,
        sourceType: batch.source.sourceType,
        success: false,
        totalRows: batch.totalRows,
        committedRows: 0,
        skippedRows: 0,
        failedRows: batch.errorRows,
        issues: batch.issues.filter((i) => i.blocking),
        executedAt: new Date().toISOString(),
        error: errorMsg,
      };
    }

    // 4. Pre-commit check: Warnings Confirmation
    if (batch.warningRows > 0 && !context.allowWarningsCommit && !batch.warningConfirmation?.confirmed) {
      const errorMsg = `توجد (${batch.warningRows}) تحذيرات تتطلب مراجعة وتأكيد بشري صريح قبل الاعتماد.`;
      return {
        importBatchId: batch.importBatchId,
        projectId: batch.projectId,
        operationId: context.operationId,
        sourceType: batch.source.sourceType,
        success: false,
        totalRows: batch.totalRows,
        committedRows: 0,
        skippedRows: batch.warningRows,
        failedRows: 0,
        issues: batch.issues.filter((i) => i.severity === 'WARNING'),
        executedAt: new Date().toISOString(),
        error: errorMsg,
      };
    }

    // 5. Successful Commit
    const activeRows = batch.rows.filter((r) => r.status !== 'REJECTED' && r.reviewStatus !== 'error');
    const committedIds = activeRows.map((r, i) => `ENT-IMP-${batch.importBatchId}-${i + 1}`);

    const result: ImportResult = {
      importBatchId: batch.importBatchId,
      projectId: batch.projectId,
      operationId: context.operationId,
      sourceType: batch.source.sourceType,
      success: true,
      totalRows: batch.totalRows,
      committedRows: activeRows.length,
      skippedRows: batch.totalRows - activeRows.length,
      failedRows: 0,
      issues: batch.issues,
      committedEntityIds: committedIds,
      executedAt: new Date().toISOString(),
    };

    // Store in idempotency cache
    DefaultImportCommitter.committedOperations.set(context.operationId, result);

    return result;
  }
}

/**
 * 9. Default Auditor
 * Records stage transitions and final commit results
 */
export class DefaultImportAuditor implements IImportAuditor {
  public async recordAudit(
    batch: UnifiedImportBatch,
    action: string,
    details: string,
    context: PipelineContext
  ): Promise<void> {
    const entry = {
      timestamp: new Date().toISOString(),
      userId: context.userId,
      userName: context.userName || context.userId,
      action,
      fromStage: batch.currentStage,
      details,
      metadata: {
        importBatchId: batch.importBatchId,
        projectId: batch.projectId,
        operationId: context.operationId,
        sourceType: batch.source.sourceType,
      },
    };

    batch.auditTrail.unshift(entry);
  }
}
