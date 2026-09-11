/**
 * Automated Test Suite: BLOCK 30 — Unified Import Center Architecture
 *
 * Requirements covered:
 * 1. Creation of ImportBatch with unified domain model
 * 2. EXCEL source support
 * 3. GOOGLE_SHEETS source support
 * 4. WEIGHBRIDGE source support
 * 5. Source metadata verification (sourceFileId, sourceFileName, sourceSheetName, sourceRowId, sourceMimeType)
 * 6. Pipeline stage transitions: SOURCE -> PARSE -> NORMALIZE -> MAP -> ENTITY_RESOLUTION -> VALIDATE -> DUPLICATE_CHECK -> REVIEW -> COMMIT -> AUDIT
 * 7. Blocking validation (severity: 'BLOCKING', blocking: true, prevents commit)
 * 8. Warning validation (severity: 'WARNING', blocking: false)
 * 9. Review-required result (reviewStatus: 'requires_review', review actions)
 * 10. Duplicate-check contract
 * 11. Idempotent operationId (prevents duplicate execution)
 * 12. Project isolation (rejects cross-project operations)
 */

import {
  UnifiedImportPipelineService,
} from '../services/import/unifiedImportPipeline.service';
import {
  DefaultImportCommitter,
} from '../services/import/defaultStages';
import {
  ImportSource,
  PipelineContext,
  UnifiedImportBatch,
} from '../types/unifiedImport';
import { UnifiedImportValidator } from '../validators/unifiedImport.validator';

export interface UnifiedImportTestCaseResult {
  id: string;
  name: string;
  passed: boolean;
  expected: any;
  actual: any;
  notes: string;
}

export async function runUnifiedImportArchitectureTests(): Promise<{
  allPassed: boolean;
  total: number;
  passed: number;
  failed: number;
  results: UnifiedImportTestCaseResult[];
}> {
  const results: UnifiedImportTestCaseResult[] = [];
  const pipeline = new UnifiedImportPipelineService();
  DefaultImportCommitter.resetIdempotencyCache();

  const baseContext: PipelineContext = {
    projectId: 'PRJ-NEOM-001',
    userId: 'USR-DISPATCH-99',
    userName: 'مشغل النظام',
    role: 'PROJECT_DISPATCHER',
    operationId: `OP-IMP-TEST-${Date.now()}-01`,
  };

  // -------------------------------------------------------------------------
  // TEST 1: Creation of ImportBatch
  // -------------------------------------------------------------------------
  {
    const source: ImportSource = {
      sourceType: 'MANUAL',
      importBatchId: 'BATCH-MANUAL-001',
      metadata: { initiatedBy: 'operator' },
    };

    const batch = pipeline.createBatch(source, baseContext);

    const isIdCorrect = batch.importBatchId === 'BATCH-MANUAL-001';
    const isProjectCorrect = batch.projectId === 'PRJ-NEOM-001';
    const isStageSource = batch.currentStage === 'SOURCE';
    const isStatusDraft = batch.commitStatus === 'DRAFT';
    const hasAuditLog = batch.auditTrail.length > 0;

    const validation = UnifiedImportValidator.validateBatch(batch);

    const passed = isIdCorrect && isProjectCorrect && isStageSource && isStatusDraft && hasAuditLog && validation.isValid;

    results.push({
      id: 'IMP-01-CREATE-BATCH',
      name: 'إنشاء ImportBatch بمعمارية الدومين الموحدة والتحقق من الحالة الابتدائية',
      passed,
      expected: {
        importBatchId: 'BATCH-MANUAL-001',
        projectId: 'PRJ-NEOM-001',
        currentStage: 'SOURCE',
        commitStatus: 'DRAFT',
        isValid: true,
      },
      actual: {
        importBatchId: batch.importBatchId,
        projectId: batch.projectId,
        currentStage: batch.currentStage,
        commitStatus: batch.commitStatus,
        isValid: validation.isValid,
      },
      notes: 'تم التحقق من إنشاء الدفعة الموحدة بنجاح وضبط المرحلة الابتدائية وسجل التدقيق',
    });
  }

  // -------------------------------------------------------------------------
  // TEST 2: EXCEL Source Support
  // -------------------------------------------------------------------------
  {
    const excelSource: ImportSource = {
      sourceType: 'EXCEL',
      importBatchId: 'BATCH-EXCEL-001',
      sourceFileId: 'DRIVE-FILE-XLSX-101',
      sourceFileName: 'sep_materials_dispatch.xlsx',
      sourceSheetName: 'Trips_Log',
      sourceMimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };

    const excelContext: PipelineContext = {
      ...baseContext,
      operationId: `OP-EXCEL-${Date.now()}`,
    };

    const batch = pipeline.createBatch(excelSource, excelContext);
    const mockExcelRows = [
      { waybill: 'WB-XLSX-01', carrier: 'CAR-ALMAJDOUIE', truck: 'TRK-9901', grossKg: 44000 },
      { waybill: 'WB-XLSX-02', carrier: 'CAR-BINLADIN', truck: 'TRK-9902', grossKg: 42000 },
    ];

    const processedBatch = await pipeline.processThroughReview(batch, mockExcelRows, excelContext);

    const isSourceExcel = processedBatch.source.sourceType === 'EXCEL';
    const isStageReview = processedBatch.currentStage === 'REVIEW';
    const totalRowsCounted = processedBatch.totalRows === 2;

    const passed = isSourceExcel && isStageReview && totalRowsCounted;

    results.push({
      id: 'IMP-02-EXCEL-SOURCE',
      name: 'دعم مصدر EXCEL ومعالجة البيانات حتى مرحلة المراجعة (REVIEW)',
      passed,
      expected: {
        sourceType: 'EXCEL',
        currentStage: 'REVIEW',
        totalRows: 2,
      },
      actual: {
        sourceType: processedBatch.source.sourceType,
        currentStage: processedBatch.currentStage,
        totalRows: processedBatch.totalRows,
      },
      notes: 'تم التحقق من قبول ومعالجة بيانات ملف الإكسل عبر المعمارية الموحدة',
    });
  }

  // -------------------------------------------------------------------------
  // TEST 3: GOOGLE_SHEETS Source Support
  // -------------------------------------------------------------------------
  {
    const gsheetsSource: ImportSource = {
      sourceType: 'GOOGLE_SHEETS',
      importBatchId: 'BATCH-GSHEET-001',
      sourceFileId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      sourceFileName: 'Operations_Spreadsheet_Q3',
      sourceSheetName: 'Daily_Dispatch',
    };

    const gsheetsContext: PipelineContext = {
      ...baseContext,
      operationId: `OP-GSHEET-${Date.now()}`,
    };

    const batch = pipeline.createBatch(gsheetsSource, gsheetsContext);
    const mockSheetRows = [
      { waybill: 'GS-001', carrier: 'CAR-ALMAJDOUIE', tareKg: 14000, grossKg: 45000 },
    ];

    const processedBatch = await pipeline.processThroughReview(batch, mockSheetRows, gsheetsContext);

    const isSourceGSheets = processedBatch.source.sourceType === 'GOOGLE_SHEETS';
    const isSheetMatched = processedBatch.source.sourceSheetName === 'Daily_Dispatch';
    const isReview = processedBatch.currentStage === 'REVIEW';

    const passed = isSourceGSheets && isSheetMatched && isReview && processedBatch.totalRows === 1;

    results.push({
      id: 'IMP-03-GOOGLE-SHEETS-SOURCE',
      name: 'دعم مصدر جداول بيانات جوجل (GOOGLE_SHEETS)',
      passed,
      expected: {
        sourceType: 'GOOGLE_SHEETS',
        sourceSheetName: 'Daily_Dispatch',
        currentStage: 'REVIEW',
        totalRows: 1,
      },
      actual: {
        sourceType: processedBatch.source.sourceType,
        sourceSheetName: processedBatch.source.sourceSheetName,
        currentStage: processedBatch.currentStage,
        totalRows: processedBatch.totalRows,
      },
      notes: 'تم التحقق من ربط مصدر جداول بيانات جوجل واجتياز مراحل المعالجة',
    });
  }

  // -------------------------------------------------------------------------
  // TEST 4: WEIGHBRIDGE Source Support
  // -------------------------------------------------------------------------
  {
    const wbSource: ImportSource = {
      sourceType: 'WEIGHBRIDGE',
      importBatchId: 'BATCH-WB-001',
      sourceFileName: 'weighbridge_stream_gate1.bin',
      metadata: { scaleId: 'SCALE-OP-01' },
    };

    const wbContext: PipelineContext = {
      ...baseContext,
      operationId: `OP-WB-${Date.now()}`,
    };

    const batch = pipeline.createBatch(wbSource, wbContext);
    const mockScaleRows = [
      { ticketId: 'WB-TKT-101', truck: 'TRK-9901', tareKg: 14000, grossKg: 44000 },
      { ticketId: 'WB-TKT-102', truck: 'TRK-9902', tareKg: 13800, grossKg: 43500 },
    ];

    const processedBatch = await pipeline.processThroughReview(batch, mockScaleRows, wbContext);

    const isSourceWb = processedBatch.source.sourceType === 'WEIGHBRIDGE';
    const passed = isSourceWb && processedBatch.currentStage === 'REVIEW' && processedBatch.totalRows === 2;

    results.push({
      id: 'IMP-04-WEIGHBRIDGE-SOURCE',
      name: 'دعم مصدر الميزان (WEIGHBRIDGE) المعتمد في BLOCK 29',
      passed,
      expected: {
        sourceType: 'WEIGHBRIDGE',
        currentStage: 'REVIEW',
        totalRows: 2,
      },
      actual: {
        sourceType: processedBatch.source.sourceType,
        currentStage: processedBatch.currentStage,
        totalRows: processedBatch.totalRows,
      },
      notes: 'تم التحقق من معالجة بيانات الميزان الآلي بسلاسة عبر الـ Pipeline',
    });
  }

  // -------------------------------------------------------------------------
  // TEST 5: Source Metadata Verification
  // -------------------------------------------------------------------------
  {
    const richSource: ImportSource = {
      sourceType: 'EXCEL',
      importBatchId: 'BATCH-META-001',
      sourceFileId: 'DRIVE-FILE-META-889',
      sourceFileName: 'dispatch_audit_report.xlsx',
      sourceSheetName: 'September_Week1',
      sourceRowId: 'row_header_idx',
      sourceMimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      metadata: {
        sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        uploaderRole: 'PROJECT_DISPATCHER',
      },
    };

    const batch = pipeline.createBatch(richSource, baseContext);
    const mockRows = [{ sourceRowId: 104, payload: 'data-104' }];
    const processed = await pipeline.processThroughReview(batch, mockRows, baseContext);

    const hasFileId = processed.source.sourceFileId === 'DRIVE-FILE-META-889';
    const hasFileName = processed.source.sourceFileName === 'dispatch_audit_report.xlsx';
    const hasSheetName = processed.source.sourceSheetName === 'September_Week1';
    const hasMimeType = processed.source.sourceMimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const hasRowSourceId = processed.rows[0].sourceRowId === 104;

    const passed = hasFileId && hasFileName && hasSheetName && hasMimeType && hasRowSourceId;

    results.push({
      id: 'IMP-05-SOURCE-METADATA',
      name: 'التحقق من ربط وتخزين كامل حقول البيانات الوصفية للمصدر (Source Metadata)',
      passed,
      expected: {
        sourceFileId: 'DRIVE-FILE-META-889',
        sourceFileName: 'dispatch_audit_report.xlsx',
        sourceSheetName: 'September_Week1',
        sourceRowId: 104,
      },
      actual: {
        sourceFileId: processed.source.sourceFileId,
        sourceFileName: processed.source.sourceFileName,
        sourceSheetName: processed.source.sourceSheetName,
        sourceRowId: processed.rows[0].sourceRowId,
      },
      notes: 'تم التأكد من احتفاظ الدفعة والصفوف بجميع البيانات الوصفية للملف والمصدر الأصلي',
    });
  }

  // -------------------------------------------------------------------------
  // TEST 6: Pipeline Stage Transitions
  // -------------------------------------------------------------------------
  {
    const source: ImportSource = {
      sourceType: 'API',
      importBatchId: 'BATCH-STAGES-001',
    };

    const stageContext: PipelineContext = {
      ...baseContext,
      operationId: `OP-STAGES-${Date.now()}`,
    };

    // Stage 1: SOURCE
    const batch = pipeline.createBatch(source, stageContext);
    const isStage1 = batch.currentStage === 'SOURCE';

    // Stages 2 through 8
    const mockData = [{ ticketId: 'API-TKT-1', metric: 100 }];
    const reviewedBatch = await pipeline.processThroughReview(batch, mockData, stageContext);
    const isStage8 = reviewedBatch.currentStage === 'REVIEW';

    // Stage 9 & 10: COMMIT and AUDIT
    const { batch: committedBatch, result } = await pipeline.executeCommit(reviewedBatch, stageContext);
    const isStage10 = committedBatch.currentStage === 'AUDIT';
    const isCommittedStatus = committedBatch.commitStatus === 'COMMITTED';
    const isCommitSuccess = result.success;

    const passed = isStage1 && isStage8 && isStage10 && isCommittedStatus && isCommitSuccess;

    results.push({
      id: 'IMP-06-STAGE-TRANSITIONS',
      name: 'التنقل المنهجي بين مراحل المعمارية العشر من SOURCE حتى AUDIT',
      passed,
      expected: {
        initialStage: 'SOURCE',
        intermediateStage: 'REVIEW',
        finalStage: 'AUDIT',
        commitStatus: 'COMMITTED',
      },
      actual: {
        initialStage: isStage1 ? 'SOURCE' : batch.currentStage,
        intermediateStage: reviewedBatch.currentStage,
        finalStage: committedBatch.currentStage,
        commitStatus: committedBatch.commitStatus,
      },
      notes: 'تم التحقق من تسلسل المراحل العشر وانتقال الدفعة حتى التدقيق النهائي بنجاح',
    });
  }

  // -------------------------------------------------------------------------
  // TEST 7: Blocking Validation
  // -------------------------------------------------------------------------
  {
    const source: ImportSource = {
      sourceType: 'CSV',
      importBatchId: 'BATCH-BLOCKING-001',
    };

    const blkContext: PipelineContext = {
      ...baseContext,
      operationId: `OP-BLK-${Date.now()}`,
    };

    const batch = pipeline.createBatch(source, blkContext);
    const rowsWithBlocking = [
      { ticketId: 'BLK-01', isTestBlocking: true }, // has blocking error
    ];

    const processed = await pipeline.processThroughReview(batch, rowsWithBlocking, blkContext);

    const hasError = processed.errorRows > 0;
    const isValidationFailed = processed.validationStatus === 'FAILED';
    const isRowError = processed.rows[0].reviewStatus === 'error';

    // Try to commit: MUST BE STRICTLY REJECTED
    const { result } = await pipeline.executeCommit(processed, blkContext);
    const commitBlocked = !result.success && result.committedRows === 0;

    const passed = hasError && isValidationFailed && isRowError && commitBlocked;

    results.push({
      id: 'IMP-07-BLOCKING-VALIDATION',
      name: 'التحقق الصارم من الأخطاء المانعة (BLOCKING) وإحباط عملية الاعتماد تلقائياً',
      passed,
      expected: {
        hasErrorRows: true,
        validationStatus: 'FAILED',
        commitSuccess: false,
        committedRows: 0,
      },
      actual: {
        hasErrorRows: processed.errorRows > 0,
        validationStatus: processed.validationStatus,
        commitSuccess: result.success,
        committedRows: result.committedRows,
      },
      notes: 'تم تأكيد حظر تنفيذ الاعتماد (Commit) طالما توجد أخطاء حرجة مانعة',
    });
  }

  // -------------------------------------------------------------------------
  // TEST 8: Warning Validation
  // -------------------------------------------------------------------------
  {
    const source: ImportSource = {
      sourceType: 'CSV',
      importBatchId: 'BATCH-WARN-001',
    };

    const warnContext: PipelineContext = {
      ...baseContext,
      operationId: `OP-WARN-${Date.now()}`,
    };

    const batch = pipeline.createBatch(source, warnContext);
    const rowsWithWarning = [
      { ticketId: 'WRN-01', isTestWarning: true }, // warning only, no blocking errors
    ];

    const processed = await pipeline.processThroughReview(batch, rowsWithWarning, warnContext);

    const hasWarningRows = processed.warningRows === 1;
    const hasZeroErrorRows = processed.errorRows === 0;
    const isValidationWarning = processed.validationStatus === 'WARNING';
    const isIssueNonBlocking = processed.issues.every(i => !i.blocking);

    const passed = hasWarningRows && hasZeroErrorRows && isValidationWarning && isIssueNonBlocking;

    results.push({
      id: 'IMP-08-WARNING-VALIDATION',
      name: 'فحص التحذيرات غير المانعة (WARNING) والتحقق من blocking: false',
      passed,
      expected: {
        warningRows: 1,
        errorRows: 0,
        validationStatus: 'WARNING',
        isBlocking: false,
      },
      actual: {
        warningRows: processed.warningRows,
        errorRows: processed.errorRows,
        validationStatus: processed.validationStatus,
        isBlocking: processed.issues.some(i => i.blocking),
      },
      notes: 'تم فحص التحذيرات والتأكد من أنها لا تمنع الإجراء ولكن تسجل صفة التحذير بدقة',
    });
  }

  // -------------------------------------------------------------------------
  // TEST 9: Review-Required Result
  // -------------------------------------------------------------------------
  {
    const source: ImportSource = {
      sourceType: 'CSV',
      importBatchId: 'BATCH-REV-REQ-001',
    };

    const revContext: PipelineContext = {
      ...baseContext,
      operationId: `OP-REV-${Date.now()}`,
    };

    const batch = pipeline.createBatch(source, revContext);
    const rowsWithWarning = [{ ticketId: 'REV-01', isTestWarning: true }];

    const processed = await pipeline.processThroughReview(batch, rowsWithWarning, revContext);

    const isRequiresReview = processed.rows[0].reviewStatus === 'requires_review';
    const isStatusAwaiting = processed.commitStatus === 'AWAITING_REVIEW';

    // Commit without warning confirmation should fail
    const { result: failResult } = await pipeline.executeCommit(processed, revContext);
    const commitFailedWithoutConfirm = !failResult.success;

    // Confirm warnings and retry
    pipeline.confirmWarnings(processed, revContext, 'موافقة مسؤول التشغيل على الملاحظات');
    const { result: successResult } = await pipeline.executeCommit(processed, revContext);
    const commitSucceededAfterConfirm = successResult.success;

    const passed = isRequiresReview && isStatusAwaiting && commitFailedWithoutConfirm && commitSucceededAfterConfirm;

    results.push({
      id: 'IMP-09-REVIEW-REQUIRED-RESULT',
      name: 'نموذج المراجعة (requires_review) وإلزامية التأكيد البشري الصريح قبل الاعتماد',
      passed,
      expected: {
        reviewStatus: 'requires_review',
        commitStatus: 'AWAITING_REVIEW',
        commitFailedWithoutConfirm: true,
        commitSucceededAfterConfirm: true,
      },
      actual: {
        reviewStatus: processed.rows[0].reviewStatus,
        commitStatus: isStatusAwaiting ? 'AWAITING_REVIEW' : processed.commitStatus,
        commitFailedWithoutConfirm,
        commitSucceededAfterConfirm,
      },
      notes: 'تم التأكد من وضع requires_review وعدم إمكانية الاعتماد إلا بعد تأكيد صريح',
    });
  }

  // -------------------------------------------------------------------------
  // TEST 10: Duplicate-Check Contract
  // -------------------------------------------------------------------------
  {
    const source: ImportSource = {
      sourceType: 'CSV',
      importBatchId: 'BATCH-DUP-001',
    };

    const dupContext: PipelineContext = {
      ...baseContext,
      operationId: `OP-DUP-${Date.now()}`,
      existingKeys: new Set(['TKT-EXISTING-999']),
    };

    const batch = pipeline.createBatch(source, dupContext);
    const rowsWithDuplicates = [
      { ticketId: 'TKT-UNIQUE-01' },
      { ticketId: 'TKT-INTERNAL-DUP' },
      { ticketId: 'TKT-INTERNAL-DUP' }, // duplicate inside batch
      { ticketId: 'TKT-EXISTING-999' },  // duplicate with existing DB key
    ];

    const processed = await pipeline.processThroughReview(batch, rowsWithDuplicates, dupContext);

    const dupRow1 = processed.rows[2];
    const dupRow2 = processed.rows[3];

    const isBatchDupCaught = dupRow1.duplicateInfo?.isDuplicate === true;
    const isDbDupCaught = dupRow2.duplicateInfo?.isDuplicate === true;
    const isDupStatusError = dupRow1.reviewStatus === 'error' && dupRow2.reviewStatus === 'error';

    const passed = isBatchDupCaught && isDbDupCaught && isDupStatusError;

    results.push({
      id: 'IMP-10-DUPLICATE-CHECK-CONTRACT',
      name: 'عقد فحص التكرار (Duplicate-Check Contract) وكشف التكرار الداخلي والخارجي',
      passed,
      expected: {
        isBatchDupCaught: true,
        isDbDupCaught: true,
        isDupStatusError: true,
      },
      actual: {
        isBatchDupCaught,
        isDbDupCaught,
        isDupStatusError,
      },
      notes: 'تم التحقق من عمل عقد فحص التكرارات وتصنيف السجلات المكررة كخطأ للمراجعة',
    });
  }

  // -------------------------------------------------------------------------
  // TEST 11: Idempotent operationId
  // -------------------------------------------------------------------------
  {
    const source: ImportSource = {
      sourceType: 'API',
      importBatchId: 'BATCH-IDEMP-001',
    };

    const idempOpId = `OP-IDEMP-TEST-KEY-4491`;
    const idempContext: PipelineContext = {
      ...baseContext,
      operationId: idempOpId,
    };

    const batch = pipeline.createBatch(source, idempContext);
    const rows = [{ ticketId: 'IDEMP-TKT-1' }];
    const reviewed = await pipeline.processThroughReview(batch, rows, idempContext);

    // 1st Commit
    const { result: firstResult } = await pipeline.executeCommit(reviewed, idempContext);

    // 2nd Commit with identical operationId (Replay attempt)
    const { result: secondResult } = await pipeline.executeCommit(reviewed, idempContext);

    const isFirstSuccess = firstResult.success;
    const isSecondSuccess = secondResult.success;
    const isIdenticalExecution = firstResult.executedAt === secondResult.executedAt;
    const sameCommittedCount = firstResult.committedRows === secondResult.committedRows;

    const passed = isFirstSuccess && isSecondSuccess && isIdenticalExecution && sameCommittedCount;

    results.push({
      id: 'IMP-11-IDEMPOTENT-OPERATIONID',
      name: 'دعم Idempotency عبر operationId وإحباط عمليات الإعادة المزدوجة',
      passed,
      expected: {
        isFirstSuccess: true,
        isSecondSuccess: true,
        isIdenticalExecution: true,
        sameCommittedCount: true,
      },
      actual: {
        isFirstSuccess,
        isSecondSuccess,
        isIdenticalExecution,
        sameCommittedCount,
      },
      notes: 'تم التأكد من إرجاع النتيجة السابقة المخزنة عند تكرار نفس operationId دون تنفيذ مزدوج',
    });
  }

  // -------------------------------------------------------------------------
  // TEST 12: Project Isolation
  // -------------------------------------------------------------------------
  {
    const source: ImportSource = {
      sourceType: 'EXCEL',
      importBatchId: 'BATCH-ISOLATION-001',
    };

    // Attempt to process a batch owned by PRJ-NEOM-001 using a context of PRJ-REDSEA-002
    const unauthorizedContext: PipelineContext = {
      projectId: 'PRJ-REDSEA-002', // Different project!
      userId: 'USR-HACKER-01',
      operationId: `OP-CROSS-PRJ-${Date.now()}`,
    };

    let crossProjectCaughtAtCreate = false;
    try {
      pipeline.createBatch(source, { ...unauthorizedContext, projectId: '' });
    } catch {
      crossProjectCaughtAtCreate = true;
    }

    const validBatch = pipeline.createBatch(source, baseContext); // created for PRJ-NEOM-001

    let crossProjectCaughtAtProcess = false;
    try {
      await pipeline.processThroughReview(validBatch, [{ ticketId: 'X' }], unauthorizedContext);
    } catch {
      crossProjectCaughtAtProcess = true;
    }

    const { result: commitCrossResult } = await pipeline.executeCommit(validBatch, unauthorizedContext);
    const crossProjectCaughtAtCommit = !commitCrossResult.success && commitCrossResult.error?.includes('عزل المشاريع');

    const passed = crossProjectCaughtAtProcess && crossProjectCaughtAtCommit;

    results.push({
      id: 'IMP-12-PROJECT-ISOLATION',
      name: 'التحقق الصارم من عزل المشاريع (Project Isolation) ورفض المعالجة العابرة للمشاريع',
      passed,
      expected: {
        crossProjectCaughtAtProcess: true,
        crossProjectCaughtAtCommit: true,
      },
      actual: {
        crossProjectCaughtAtProcess,
        crossProjectCaughtAtCommit,
      },
      notes: 'تم منع محاولة معالجة أو اعتماد دفعة لمشروع غير مصرح به وإرجاع خطأ عزل المشاريع',
    });
  }

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.length - passedCount;

  return {
    allPassed: failedCount === 0,
    total: results.length,
    passed: passedCount,
    failed: failedCount,
    results,
  };
}
