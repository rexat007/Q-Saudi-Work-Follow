/**
 * Weighbridge Import Service
 * BLOCK 34 — Weighbridge Import over Unified Import Center (BLOCK 30)
 * 
 * Architectural Invariants:
 * 1. Weighbridge is NOT a new standalone pipeline. It is a Profile + Rules + UI + Validation + Review Actions
 *    built directly on top of the existing Unified Import Pipeline (BLOCK 30).
 * 2. Compulsory 10 stages:
 *    SOURCE -> PARSE -> NORMALIZE -> MAP -> ENTITY_RESOLUTION -> VALIDATE -> DUPLICATE_CHECK -> REVIEW -> COMMIT -> AUDIT
 * 3. Multi-source intake:
 *    - EXCEL (.xlsx, .xls)
 *    - CSV (.csv)
 *    - GOOGLE_DRIVE (via existing integration)
 *    - GOOGLE_SHEETS (via existing integration)
 * 4. Distinguishes between Operational Source Type (WEIGHBRIDGE) and Intake File/Service (EXCEL, CSV, GOOGLE_DRIVE, GOOGLE_SHEETS).
 * 5. Invariants:
 *    - Missing unload data is NON-BLOCKING (WARNING).
 *    - Never create fake zero variance: destNetWeight = null, varianceWeight = null, unloadTime = null when unload is missing.
 *    - Load time is preserved if present, never invented if absent.
 *    - Pricing is never guessed.
 *    - "Accept Origin Net as Destination" is an explicit, audited user action with confirmation.
 *    - Zero Firestore writes prior to COMMIT stage.
 */

import {
  UnifiedImportBatch,
  PipelineContext,
  ImportSource,
  ImportResult,
  RawParsedOutput,
  ImportIssue,
} from '../../types/unifiedImport';
import { OperationSourceType } from '../../types/entities';
import { CanonicalTripRow } from '../../types/excelCsvImport';
import {
  WEIGHBRIDGE_INPUT_PROFILE_FIELDS,
  WeighbridgeFieldProfile,
  WeighbridgeFileIntakeType,
  AcceptOriginNetDecisionPayload,
  AcceptOriginNetResult,
  WeighbridgeRowSummary,
} from '../../types/weighbridgeImport';
import { UnifiedImportPipelineService } from './unifiedImportPipeline.service';
import { ExcelImportParser } from './excelParser.service';
import { CsvImportParser } from './csvParser.service';
import { GoogleSheetsImportParser } from './googleSheetsParser.service';
import { ExcelCsvNormalizer } from './normalizer.service';
import { ExcelCsvColumnMapper } from './columnMapper.service';
import { ExcelCsvTripEntityResolver } from './tripEntityResolver';
import { ExcelCsvTripValidator } from './tripImportValidator';
import { ExcelCsvTripDuplicateChecker } from './tripDuplicateChecker';
import { DefaultImportReviewHandler } from './defaultStages';
import { ExcelCsvTripCommitter } from './tripImportCommitter';
import { StandaloneWeightEngine } from '../weightEngine.service';
import { auditLogService } from '../auditLog.service';
import { UnifiedImportValidator } from '../../validators/unifiedImport.validator';

export class WeighbridgeImportService {
  /**
   * Returns the schema profile for Weighbridge intake
   */
  public static getProfile(): WeighbridgeFieldProfile[] {
    return [...WEIGHBRIDGE_INPUT_PROFILE_FIELDS];
  }

  /**
   * Processes a Weighbridge file/stream through the Unified Import Pipeline up to the REVIEW stage.
   * NO Firestore writes take place in this method.
   */
  public static async processWeighbridgeDataToReview(params: {
    intakeType: WeighbridgeFileIntakeType;
    input: any; // ArrayBuffer, string, or 2D values array for Sheets
    fileName: string;
    fileId?: string;
    sheetName?: string;
    mimeType?: string;
    sizeBytes?: number;
    context: PipelineContext;
    customMappings?: Record<string, keyof CanonicalTripRow>;
  }): Promise<UnifiedImportBatch> {
    const {
      intakeType,
      input,
      fileName,
      fileId,
      sheetName,
      mimeType,
      sizeBytes,
      context,
      customMappings,
    } = params;

    // 1. Enforce Project Isolation and User Authentication
    const isolation = UnifiedImportValidator.enforceProjectIsolation(context.projectId, context);
    if (!isolation.isAllowed) {
      throw new Error(isolation.error || 'Project isolation violation');
    }

    // 2. Select appropriate parser based on intakeType
    let parser: any;
    let parseInput = input;
    let effectiveMime = mimeType;

    switch (intakeType) {
      case 'EXCEL':
        parser = new ExcelImportParser();
        effectiveMime = effectiveMime || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
      case 'CSV':
        parser = new CsvImportParser();
        effectiveMime = effectiveMime || 'text/csv';
        break;
      case 'GOOGLE_DRIVE':
        // Detect Excel vs CSV by file extension or mimeType
        if (fileName.toLowerCase().endsWith('.csv') || effectiveMime === 'text/csv') {
          parser = new CsvImportParser();
        } else {
          parser = new ExcelImportParser();
        }
        break;
      case 'GOOGLE_SHEETS':
        parser = new GoogleSheetsImportParser();
        effectiveMime = effectiveMime || 'application/vnd.google-apps.spreadsheet';
        break;
      default:
        throw new Error(`Unsupported weighbridge intake type: ${intakeType}`);
    }

    // 3. Define Import Source with Operational Source Type WEIGHBRIDGE
    // preserving the physical intake information in metadata
    const source: ImportSource = {
      sourceType: 'WEIGHBRIDGE',
      importBatchId: `BATCH-WB-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sourceFileName: fileName,
      sourceFileId: fileId,
      sourceSheetName: sheetName,
      sourceMimeType: effectiveMime,
      metadata: {
        intakeType,
        originalFileName: fileName,
        originalFileId: fileId,
        sheetName,
        sizeBytes,
        profile: 'WEIGHBRIDGE',
        operationId: context.operationId,
        importedAt: new Date().toISOString(),
      },
    };

    // 4. Configure Unified Pipeline with Weighbridge Profile
    const pipelineContext: PipelineContext = {
      ...context,
      profile: 'WEIGHBRIDGE',
    };

    const pipeline = new UnifiedImportPipelineService({
      parser,
      normalizer: new ExcelCsvNormalizer(),
      mapper: new ExcelCsvColumnMapper(customMappings),
      entityResolver: new ExcelCsvTripEntityResolver(),
      validator: new ExcelCsvTripValidator(),
      duplicateChecker: new ExcelCsvTripDuplicateChecker(),
      reviewHandler: new DefaultImportReviewHandler(),
      committer: new ExcelCsvTripCommitter(),
    });

    // 5. Execute Pipeline through REVIEW stage (NO COMMIT, NO FIRESTORE WRITES)
    const initialBatch = pipeline.createBatch(source, pipelineContext);
    const batch = await pipeline.processThroughReview(initialBatch, parseInput, pipelineContext);

    // 6. Set weighbridge invariants on canonical records to guarantee consistency
    for (const row of batch.rows) {
      if (row.canonical) {
        row.canonical.isWeighbridgeOnly = true;
        row.canonical.loadingDataSource = 'WEIGHBRIDGE';
        row.canonical.destNetWeight = row.canonical.destNetWeight ?? null;
        row.canonical.varianceWeight = row.canonical.varianceWeight ?? null;
        row.canonical.unloadingDataSource = row.canonical.unloadingDataSource ?? null;
      }
      if (row.mapped) {
        (row.mapped as any).isWeighbridgeOnly = true;
        (row.mapped as any).loadingDataSource = 'WEIGHBRIDGE';
        (row.mapped as any).destNetWeight = (row.mapped as any).destNetWeight ?? null;
        (row.mapped as any).varianceWeight = (row.mapped as any).varianceWeight ?? null;
        (row.mapped as any).unloadingDataSource = (row.mapped as any).unloadingDataSource ?? null;
      }
    }

    return batch;
  }

  /**
   * Applies the audited "Accept Origin Net as Destination" business decision to a review row.
   * 
   * Invariants enforced:
   * - Must be an explicit user decision with confirmation
   * - Cannot accept if destination net weight was already provided
   * - Sets destNetWeight = originNetWeight
   * - Sets varianceWeight = StandaloneWeightEngine.calculateVariance(...) => 0 kg
   * - Sets unloadingActorType = 'USER'
   * - Sets unloadingActorId = context.userId
   * - Sets unloadingDataSource = 'WEIGHBRIDGE'
   * - Records an immutable audit log
   * - Removes non-blocking MISSING_UNLOAD_DATA issue
   * - Recalculates batch statistics and updates row reviewStatus
   */
  public static async acceptOriginNetAsDestination(
    batch: UnifiedImportBatch,
    payload: AcceptOriginNetDecisionPayload,
    context: PipelineContext
  ): Promise<AcceptOriginNetResult> {
    // 1. Enforce Project Isolation & Authorization
    const isolation = UnifiedImportValidator.enforceProjectIsolation(batch.projectId, context);
    if (!isolation.isAllowed) {
      throw new Error(isolation.error || 'Project isolation violation');
    }

    // 2. Locate Row
    const row = batch.rows.find((r) => r.rowNumber === payload.rowNumber);
    if (!row) {
      return {
        success: false,
        rowNumber: payload.rowNumber,
        originalNetWeight: 0,
        acceptedDestinationNetWeight: 0,
        calculatedVarianceWeight: 0,
        unloadDecision: 'ACCEPT_ORIGIN_NET_AS_DESTINATION',
        unloadingActorType: 'USER',
        unloadingActorId: context.userId,
        unloadingDataSource: 'WEIGHBRIDGE',
        error: `Row ${payload.rowNumber} not found in import batch`,
      };
    }

    const canonical: Partial<CanonicalTripRow> =
      (row.canonical as any) || (row.mapped as any) || {};

    const originNet = canonical.netWeight;
    if (originNet === undefined || originNet === null || isNaN(originNet) || originNet <= 0) {
      return {
        success: false,
        rowNumber: payload.rowNumber,
        originalNetWeight: originNet || 0,
        acceptedDestinationNetWeight: 0,
        calculatedVarianceWeight: 0,
        unloadDecision: 'ACCEPT_ORIGIN_NET_AS_DESTINATION',
        unloadingActorType: 'USER',
        unloadingActorId: context.userId,
        unloadingDataSource: 'WEIGHBRIDGE',
        error: 'Cannot accept origin net: origin net weight is missing or non-positive',
      };
    }

    // Invariant: If origin net was already accepted as destination, do not re-accept
    if (canonical.isAcceptedOriginNet) {
      return {
        success: false,
        rowNumber: payload.rowNumber,
        originalNetWeight: originNet,
        acceptedDestinationNetWeight: canonical.destNetWeight,
        calculatedVarianceWeight: canonical.varianceWeight || 0,
        unloadDecision: 'ACCEPT_ORIGIN_NET_AS_DESTINATION',
        unloadingActorType: 'USER',
        unloadingActorId: context.userId,
        unloadingDataSource: 'WEIGHBRIDGE',
        error: 'Origin net weight has already been accepted as destination for this row',
      };
    }

    // Invariant: If destination net weight was already supplied in the source file, do not overwrite
    if (canonical.destNetWeight !== null && canonical.destNetWeight !== undefined) {
      return {
        success: false,
        rowNumber: payload.rowNumber,
        originalNetWeight: originNet,
        acceptedDestinationNetWeight: canonical.destNetWeight,
        calculatedVarianceWeight: canonical.varianceWeight || 0,
        unloadDecision: 'ACCEPT_ORIGIN_NET_AS_DESTINATION',
        unloadingActorType: 'USER',
        unloadingActorId: context.userId,
        unloadingDataSource: 'WEIGHBRIDGE',
        error: 'Destination net weight was already explicitly provided in the source file',
      };
    }

    // 3. Calculate Variance via Domain Service (gives exactly 0)
    const weightEngine = new StandaloneWeightEngine();
    const varianceResult = weightEngine.calculateVariance(originNet, originNet);
    const varianceKg = varianceResult.variance ?? 0;

    // 4. Update Canonical and Mapped Data
    canonical.destNetWeight = originNet;
    canonical.varianceWeight = varianceKg;
    canonical.unloadDecision = 'ACCEPT_ORIGIN_NET_AS_DESTINATION';
    canonical.unloadingActorType = 'USER';
    canonical.unloadingActorId = context.userId;
    canonical.unloadingDataSource = 'WEIGHBRIDGE';
    canonical.isAcceptedOriginNet = true;

    if (row.canonical) {
      row.canonical.destNetWeight = originNet;
      row.canonical.varianceWeight = varianceKg;
      row.canonical.unloadDecision = 'ACCEPT_ORIGIN_NET_AS_DESTINATION';
      row.canonical.unloadingActorType = 'USER';
      row.canonical.unloadingActorId = context.userId;
      row.canonical.unloadingDataSource = 'WEIGHBRIDGE';
      row.canonical.isAcceptedOriginNet = true;
    }
    if (row.mapped) {
      (row.mapped as any).destNetWeight = originNet;
      (row.mapped as any).varianceWeight = varianceKg;
      (row.mapped as any).unloadDecision = 'ACCEPT_ORIGIN_NET_AS_DESTINATION';
      (row.mapped as any).unloadingActorType = 'USER';
      (row.mapped as any).unloadingActorId = context.userId;
      (row.mapped as any).unloadingDataSource = 'WEIGHBRIDGE';
      (row.mapped as any).isAcceptedOriginNet = true;
    }

    // 5. Clear MISSING_UNLOAD_DATA from row issues
    row.validationIssues = row.validationIssues.filter(
      (issue) => issue.code !== 'MISSING_UNLOAD_DATA'
    );

    // Also remove from batch-level issues
    batch.issues = batch.issues.filter(
      (issue) => !(issue.row === row.rowNumber && issue.code === 'MISSING_UNLOAD_DATA')
    );

    // 6. Recalculate Row Review Status
    const hasRemainingErrors = row.validationIssues.some((i) => i.blocking);
    const hasRemainingWarnings = row.validationIssues.some((i) => i.severity === 'WARNING');

    if (hasRemainingErrors) {
      row.status = 'ERROR';
      row.reviewStatus = 'error';
    } else if (hasRemainingWarnings) {
      row.status = 'WARNING';
      row.reviewStatus = 'requires_review';
    } else {
      row.status = 'VALID';
      row.reviewStatus = 'accepted';
    }

    // 7. Update Batch Counters
    batch.errorRows = batch.rows.filter((r) => r.status === 'ERROR').length;
    batch.warningRows = batch.rows.filter((r) => r.status === 'WARNING').length;
    batch.validRows = batch.rows.filter((r) => r.status === 'VALID').length;

    // 8. Record Audit Log Entry
    const auditLogId = await auditLogService.recordLog(
      {
        projectId: batch.projectId,
        entityType: 'TRIP',
        entityId: canonical.ticketId || `ROW-${row.rowNumber}`,
        action: 'UPDATE',
        before: {
          destNetWeight: null,
          varianceWeight: null,
          unloadDecision: null,
        },
        after: {
          destNetWeight: originNet,
          varianceWeight: varianceKg,
          unloadDecision: 'ACCEPT_ORIGIN_NET_AS_DESTINATION',
          unloadingActorType: 'USER',
          unloadingActorId: context.userId,
          unloadingDataSource: 'WEIGHBRIDGE',
        },
        correlationId: context.operationId,
      },
      {
        userId: context.userId,
        email: `${context.userId}@system.local`,
        displayName: context.userName || context.userId,
        role: 'PROJECT_ADMIN',
      }
    );

    // Append to batch auditTrail
    batch.auditTrail.push({
      timestamp: new Date().toISOString(),
      userId: context.userId,
      userName: context.userName,
      action: 'ACCEPT_ORIGIN_NET_AS_DESTINATION',
      fromStage: 'REVIEW',
      toStage: 'REVIEW',
      details: `تم قبول صافي المصدر (${originNet} كجم) كصافي وصول للتذكرة [${canonical.ticketId || row.rowNumber}].`,
      metadata: {
        auditLogId,
        rowNumber: row.rowNumber,
        ticketId: canonical.ticketId,
        originNetWeight: originNet,
        acceptedDestinationNetWeight: originNet,
      },
    });

    return {
      success: true,
      rowNumber: row.rowNumber,
      originalNetWeight: originNet,
      acceptedDestinationNetWeight: originNet,
      calculatedVarianceWeight: varianceKg,
      unloadDecision: 'ACCEPT_ORIGIN_NET_AS_DESTINATION',
      unloadingActorType: 'USER',
      unloadingActorId: context.userId,
      unloadingDataSource: 'WEIGHBRIDGE',
      auditLogId,
    };
  }

  /**
   * Commits the reviewed Weighbridge batch to Trip storage.
   * Preserves operationId idempotency and project isolation.
   */
  public static async commitBatch(
    batch: UnifiedImportBatch,
    context: PipelineContext
  ): Promise<ImportResult> {
    const committer = new ExcelCsvTripCommitter();
    const result = await committer.commit(batch, {
      ...context,
      profile: 'WEIGHBRIDGE',
    });

    if (result.success) {
      await auditLogService.recordLog(
        {
          projectId: batch.projectId,
          entityType: 'IMPORT_BATCH',
          entityId: batch.importBatchId,
          action: 'CREATE',
          after: {
            committedRows: result.committedRows,
            totalRows: result.totalRows,
            sourceType: 'WEIGHBRIDGE',
          },
          correlationId: context.operationId,
        },
        {
          userId: context.userId,
          email: `${context.userId}@system.local`,
          displayName: context.userName || context.userId,
          role: 'PROJECT_ADMIN',
        }
      );
    }

    return result;
  }

  /**
   * Extracts a high-level UI summary of the rows in a Weighbridge batch
   */
  public static getWeighbridgeRowSummaries(batch: UnifiedImportBatch): WeighbridgeRowSummary[] {
    return batch.rows.map((row) => {
      const canonical: Partial<CanonicalTripRow> =
        (row.canonical as any) || (row.mapped as any) || {};

      const tare = canonical.tareWeight ?? 0;
      const gross = canonical.grossWeight ?? 0;
      const net = canonical.netWeight ?? Math.max(0, gross - tare);

      const isMismatch =
        typeof canonical.grossWeight === 'number' &&
        typeof canonical.tareWeight === 'number' &&
        typeof canonical.netWeight === 'number' &&
        Math.abs(canonical.grossWeight - canonical.tareWeight - canonical.netWeight) > 0.05;

      const isAcceptedOrigin =
        canonical.unloadDecision === 'ACCEPT_ORIGIN_NET_AS_DESTINATION' ||
        canonical.isAcceptedOriginNet === true;

      const canAccept =
        !isAcceptedOrigin &&
        canonical.destNetWeight === null &&
        net > 0 &&
        row.status !== 'ERROR';

      const mappedStatus: 'VALID' | 'WARNING' | 'ERROR' | 'COMMITTED' =
        row.status === 'COMMITTED'
          ? 'COMMITTED'
          : row.status === 'ERROR' || row.status === 'REJECTED'
          ? 'ERROR'
          : row.status === 'WARNING'
          ? 'WARNING'
          : 'VALID';

      return {
        rowNumber: row.rowNumber,
        ticketId: canonical.ticketId || '',
        shiftDate: canonical.shiftDate,
        truckNo: canonical.truckNo || '',
        carrier: canonical.carrier,
        driverName: canonical.driverName,
        materialType: canonical.materialType,
        tareWeight: tare,
        grossWeight: gross,
        netWeight: net,
        isCalculatedNet: !!canonical.isCalculatedNet,
        netWeightMismatch: isMismatch,
        destNetWeight: canonical.destNetWeight ?? null,
        varianceWeight: canonical.varianceWeight ?? null,
        loadTime: canonical.loadTime,
        isAcceptedOriginNet: isAcceptedOrigin,
        canAcceptOriginNet: canAccept,
        status: mappedStatus,
        reviewStatus: row.reviewStatus,
        issues: row.validationIssues,
      };
    });
  }
}
