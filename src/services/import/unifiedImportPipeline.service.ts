/**
 * Unified Import Pipeline Orchestrator
 * BLOCK 30: 10-Stage Decoupled Pipeline
 * SOURCE -> PARSE -> NORMALIZE -> MAP -> ENTITY_RESOLUTION -> VALIDATE -> DUPLICATE_CHECK -> REVIEW -> COMMIT -> AUDIT
 */

import {
  UnifiedImportBatch,
  ImportSource,
  ImportRow,
  ImportIssue,
  ImportResult,
  PipelineContext,
  UnifiedImportPipelineStage,
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
import {
  DefaultImportParser,
  DefaultImportNormalizer,
  DefaultImportMapper,
  DefaultImportEntityResolver,
  DefaultImportValidator,
  DefaultImportDuplicateChecker,
  DefaultImportReviewHandler,
  DefaultImportCommitter,
  DefaultImportAuditor,
} from './defaultStages';
import { UnifiedImportValidator } from '../../validators/unifiedImport.validator';

export interface UnifiedPipelineCustomStages {
  parser?: IImportParser;
  normalizer?: IImportNormalizer;
  mapper?: IImportMapper;
  entityResolver?: IImportEntityResolver;
  validator?: IImportValidator;
  duplicateChecker?: IImportDuplicateChecker;
  reviewHandler?: IImportReviewHandler;
  committer?: IImportCommitter;
  auditor?: IImportAuditor;
}

export class UnifiedImportPipelineService {
  private parser: IImportParser;
  private normalizer: IImportNormalizer;
  private mapper: IImportMapper;
  private entityResolver: IImportEntityResolver;
  private validator: IImportValidator;
  private duplicateChecker: IImportDuplicateChecker;
  private reviewHandler: IImportReviewHandler;
  private committer: IImportCommitter;
  private auditor: IImportAuditor;

  constructor(customStages?: UnifiedPipelineCustomStages) {
    this.parser = customStages?.parser || new DefaultImportParser();
    this.normalizer = customStages?.normalizer || new DefaultImportNormalizer();
    this.mapper = customStages?.mapper || new DefaultImportMapper();
    this.entityResolver = customStages?.entityResolver || new DefaultImportEntityResolver();
    this.validator = customStages?.validator || new DefaultImportValidator();
    this.duplicateChecker = customStages?.duplicateChecker || new DefaultImportDuplicateChecker();
    this.reviewHandler = customStages?.reviewHandler || new DefaultImportReviewHandler();
    this.committer = customStages?.committer || new DefaultImportCommitter();
    this.auditor = customStages?.auditor || new DefaultImportAuditor();
  }

  /**
   * Initializes a new UnifiedImportBatch at stage 'SOURCE'
   */
  public createBatch(source: ImportSource, context: PipelineContext): UnifiedImportBatch {
    // Validate project isolation
    const isolation = UnifiedImportValidator.enforceProjectIsolation(context.projectId, context);
    if (!isolation.isAllowed) {
      throw new Error(isolation.error || 'Project isolation violation');
    }

    // Validate source definition
    const sourceVal = UnifiedImportValidator.validateSource(source);
    if (!sourceVal.isValid) {
      throw new Error(sourceVal.errors.map((e) => e.messageAr).join(', '));
    }

    const batch: UnifiedImportBatch = {
      importBatchId: source.importBatchId,
      projectId: context.projectId,
      source,
      currentStage: 'SOURCE',
      validationStatus: 'PENDING',
      commitStatus: 'DRAFT',
      totalRows: 0,
      validRows: 0,
      warningRows: 0,
      errorRows: 0,
      requiresReviewRows: 0,
      committedRows: 0,
      rows: [],
      issues: [],
      operationId: context.operationId,
      idempotencyKey: context.idempotencyKey || context.operationId,
      createdAt: new Date().toISOString(),
      createdBy: context.userId,
      auditTrail: [
        {
          timestamp: new Date().toISOString(),
          userId: context.userId,
          userName: context.userName,
          action: 'BATCH_CREATED',
          fromStage: 'SOURCE',
          toStage: 'SOURCE',
          details: `تم إنشاء دفعة استيراد موحدة بمصدر (${source.sourceType}) ومعرف (${source.importBatchId}).`,
        },
      ],
    };

    return batch;
  }

  /**
   * Executes stages PARSE through REVIEW.
   * STRICT INVARIANT: Does NOT write to Firestore or target storage.
   */
  public async processThroughReview(
    batch: UnifiedImportBatch,
    inputData: any,
    context: PipelineContext
  ): Promise<UnifiedImportBatch> {
    // Project Isolation Check
    const isolation = UnifiedImportValidator.enforceProjectIsolation(batch.projectId, context);
    if (!isolation.isAllowed) {
      throw new Error(isolation.error || 'Project isolation violation');
    }

    // -------------------------------------------------------------
    // STAGE 2: PARSE
    // -------------------------------------------------------------
    batch.currentStage = 'PARSE';
    const parsedOutput = await this.parser.parse(batch.source, inputData);
    const rawRows = parsedOutput.rows || [];
    batch.totalRows = rawRows.length;
    batch.commitStatus = 'PARSED';

    // -------------------------------------------------------------
    // STAGE 3: NORMALIZE
    // -------------------------------------------------------------
    batch.currentStage = 'NORMALIZE';
    const normalizedRows: ImportRow[] = [];
    for (let i = 0; i < rawRows.length; i++) {
      const rowNum = i + 1;
      const raw = rawRows[i];
      const canonical = await this.normalizer.normalize(raw, rowNum, context);
      normalizedRows.push({
        rowNumber: rowNum,
        sourceRowId: raw.sourceRowId || rowNum,
        raw,
        canonical,
        validationIssues: [],
        reviewStatus: 'accepted',
        status: 'PENDING',
      });
    }
    batch.rows = normalizedRows;
    batch.commitStatus = 'NORMALIZED';

    // -------------------------------------------------------------
    // STAGE 4: MAP
    // -------------------------------------------------------------
    batch.currentStage = 'MAP';
    for (const row of batch.rows) {
      row.mapped = await this.mapper.map(row.canonical || row.raw, row.rowNumber, context);
      if (row.canonical && typeof row.canonical === 'object' && row.mapped && typeof row.mapped === 'object') {
        row.canonical = { ...row.canonical, ...row.mapped };
      }
    }
    batch.commitStatus = 'MAPPED';

    // -------------------------------------------------------------
    // STAGE 5: ENTITY_RESOLUTION
    // -------------------------------------------------------------
    batch.currentStage = 'ENTITY_RESOLUTION';
    for (const row of batch.rows) {
      row.entityResolutions = await this.entityResolver.resolveEntities(
        row.mapped || row.canonical || row.raw,
        row.rowNumber,
        context
      );
    }
    batch.commitStatus = 'RESOLVED';

    // -------------------------------------------------------------
    // STAGE 6: VALIDATE
    // -------------------------------------------------------------
    batch.currentStage = 'VALIDATE';
    const allIssues: ImportIssue[] = [];
    for (const row of batch.rows) {
      const rowIssues = await this.validator.validateRow(row, context);
      row.validationIssues = rowIssues;
      allIssues.push(...rowIssues);
    }
    batch.issues = allIssues;
    batch.commitStatus = 'VALIDATED';

    // -------------------------------------------------------------
    // STAGE 7: DUPLICATE_CHECK
    // -------------------------------------------------------------
    batch.currentStage = 'DUPLICATE_CHECK';
    batch.rows = await this.duplicateChecker.checkDuplicates(batch.rows, context);

    // -------------------------------------------------------------
    // STAGE 8: REVIEW
    // -------------------------------------------------------------
    batch.currentStage = 'REVIEW';
    let validCount = 0;
    let warningCount = 0;
    let errorCount = 0;
    let requiresReviewCount = 0;

    for (const row of batch.rows) {
      const reviewStatus = this.reviewHandler.evaluateReviewStatus(row);
      row.reviewStatus = reviewStatus;

      if (reviewStatus === 'error') {
        errorCount++;
        row.status = 'ERROR';
      } else if (reviewStatus === 'requires_review') {
        requiresReviewCount++;
        warningCount++;
        row.status = 'WARNING';
      } else if (reviewStatus === 'warning') {
        warningCount++;
        row.status = 'WARNING';
      } else {
        validCount++;
        row.status = 'VALID';
      }
    }

    batch.validRows = validCount;
    batch.warningRows = warningCount;
    batch.errorRows = errorCount;
    batch.requiresReviewRows = requiresReviewCount;

    if (errorCount > 0) {
      batch.validationStatus = 'FAILED';
      batch.commitStatus = 'AWAITING_REVIEW';
    } else if (warningCount > 0) {
      batch.validationStatus = 'WARNING';
      batch.commitStatus = 'AWAITING_REVIEW';
    } else {
      batch.validationStatus = 'PASSED';
      batch.commitStatus = 'READY_TO_COMMIT';
    }

    await this.auditor.recordAudit(
      batch,
      'STAGE_REVIEW_REACHED',
      `اكتملت مراحل التحليل والمعايرة حتى المراجعة (REVIEW). الإجمالي: ${batch.totalRows}، صالح: ${validCount}، تحذيرات: ${warningCount}، أخطاء: ${errorCount}.`,
      context
    );

    return batch;
  }

  /**
   * Applies a human review action on a specific row
   */
  public applyReviewAction(
    batch: UnifiedImportBatch,
    rowNumber: number,
    action: string,
    resolution: any,
    context: PipelineContext
  ): UnifiedImportBatch {
    const targetRowIndex = batch.rows.findIndex((r) => r.rowNumber === rowNumber);
    if (targetRowIndex === -1) {
      throw new Error(`الصف #${rowNumber} غير موجود في الدفعة`);
    }

    const updatedRow = this.reviewHandler.applyAction(batch.rows[targetRowIndex], action, resolution);
    batch.rows[targetRowIndex] = updatedRow;

    // Recalculate counters
    let validCount = 0;
    let warningCount = 0;
    let errorCount = 0;
    let requiresReviewCount = 0;

    for (const row of batch.rows) {
      if (row.status === 'REJECTED') {
        continue;
      }
      if (row.reviewStatus === 'error' || row.status === 'ERROR') {
        errorCount++;
      } else if (row.reviewStatus === 'requires_review') {
        requiresReviewCount++;
        warningCount++;
      } else if (row.reviewStatus === 'warning') {
        warningCount++;
      } else {
        validCount++;
      }
    }

    batch.validRows = validCount;
    batch.warningRows = warningCount;
    batch.errorRows = errorCount;
    batch.requiresReviewRows = requiresReviewCount;

    if (errorCount > 0) {
      batch.commitStatus = 'AWAITING_REVIEW';
      batch.validationStatus = 'FAILED';
    } else if (warningCount > 0 && !batch.warningConfirmation?.confirmed) {
      batch.commitStatus = 'AWAITING_REVIEW';
      batch.validationStatus = 'WARNING';
    } else {
      batch.commitStatus = 'READY_TO_COMMIT';
      batch.validationStatus = warningCount > 0 ? 'WARNING' : 'PASSED';
    }

    return batch;
  }

  /**
   * Confirms warnings for the batch, enabling commit
   */
  public confirmWarnings(
    batch: UnifiedImportBatch,
    context: PipelineContext,
    notes?: string
  ): UnifiedImportBatch {
    batch.warningConfirmation = {
      confirmed: true,
      confirmedBy: context.userName || context.userId,
      confirmedAt: new Date().toISOString(),
      notes,
    };

    if (batch.errorRows === 0) {
      batch.commitStatus = 'READY_TO_COMMIT';
    }

    return batch;
  }

  /**
   * Executes STAGE 9: COMMIT and STAGE 10: AUDIT
   * Performs actual persistent writes and records audit.
   */
  public async executeCommit(
    batch: UnifiedImportBatch,
    context: PipelineContext
  ): Promise<{ batch: UnifiedImportBatch; result: ImportResult }> {
    // 1. Commit Stage
    batch.currentStage = 'COMMIT';
    const result = await this.committer.commit(batch, context);

    if (result.success) {
      batch.commitStatus = 'COMMITTED';
      batch.committedRows = result.committedRows;
      batch.committedAt = result.executedAt;
      batch.committedBy = context.userName || context.userId;

      // Mark committed rows
      batch.rows = batch.rows.map((r) =>
        r.status === 'VALID' || r.status === 'WARNING'
          ? { ...r, status: 'COMMITTED' as const }
          : r
      );

      // 2. Audit Stage
      batch.currentStage = 'AUDIT';
      await this.auditor.recordAudit(
        batch,
        'BATCH_COMMITTED',
        `تم اعتماد (${result.committedRows}) سجل بنجاح عبر عملية (${context.operationId}).`,
        context
      );
    } else {
      batch.commitStatus = 'FAILED';
      await this.auditor.recordAudit(
        batch,
        'COMMIT_FAILED',
        `فشل اعتماد الدفعة: ${result.error}`,
        context
      );
    }

    return { batch, result };
  }
}

export const unifiedImportPipelineService = new UnifiedImportPipelineService();
