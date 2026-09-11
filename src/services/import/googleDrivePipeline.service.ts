/**
 * Google Drive Import Pipeline Service
 * BLOCK 32: Bridges Google Drive File Intake to UnifiedImportPipelineService (BLOCK 30)
 * 
 * Rules:
 * - Direct usage of UnifiedImportPipelineService
 * - Source Type: 'GOOGLE_DRIVE'
 * - NO separate pipeline architecture
 * - NO duplication of Excel/CSV parsing logic (reuses BLOCK 31 parsers)
 * - Strictly NO OAuth secrets or access tokens stored in Firestore or Trip records
 * - Pre-commit gate strictly enforced: zero Firestore writes before COMMIT stage
 * - Project Isolation & RBAC strictly validated
 */

import { UnifiedImportPipelineService } from './unifiedImportPipeline.service';
import { ExcelImportParser } from './excelParser.service';
import { CsvImportParser } from './csvParser.service';
import { ExcelCsvNormalizer } from './normalizer.service';
import { ExcelCsvColumnMapper } from './columnMapper.service';
import { ExcelCsvTripEntityResolver } from './tripEntityResolver';
import { ExcelCsvTripValidator } from './tripImportValidator';
import { ExcelCsvTripDuplicateChecker } from './tripDuplicateChecker';
import { ExcelCsvTripCommitter } from './tripImportCommitter';
import { FileIntakeValidator } from './fileIntake.validator';
import {
  UnifiedImportBatch,
  ImportSource,
  PipelineContext,
  ImportResult,
} from '../../types/unifiedImport';
import { CanonicalTripRow, ColumnMappingMatch } from '../../types/excelCsvImport';
import { GoogleDriveFileItem, GoogleDriveProcessOptions } from '../../types/googleDriveImport';

export class GoogleDrivePipelineService {
  /**
   * Detects whether a Google Drive file is Excel (.xlsx/.xls) or CSV (.csv)
   */
  public static detectDriveFormat(fileName: string, mimeType?: string): 'EXCEL' | 'CSV' {
    const intake = FileIntakeValidator.validate(fileName, 1024, mimeType);
    if (intake.isValid && intake.fileType === 'EXCEL') return 'EXCEL';
    if (intake.isValid && intake.fileType === 'CSV') return 'CSV';

    const lower = (fileName || '').toLowerCase();
    if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) return 'EXCEL';
    return 'CSV';
  }

  /**
   * Helper to inspect workbook sheets before full parsing
   */
  public static getExcelSheets(data: ArrayBuffer | Uint8Array | string): string[] {
    return ExcelImportParser.getWorkbookSheetNames(data);
  }

  /**
   * Helper to inspect column mappings for raw headers
   */
  public static inspectColumnMappings(headers: string[]): Record<string, ColumnMappingMatch> {
    return ExcelCsvColumnMapper.mapHeaders(headers);
  }

  /**
   * Initializes and executes a Google Drive import file through the pipeline up to the REVIEW stage
   * (STRICT INVARIANT: ZERO FIRESTORE WRITES HERE)
   */
  public static async processDriveFileToReview(
    inputData: ArrayBuffer | Uint8Array | string,
    driveFileMeta: GoogleDriveFileItem,
    context: PipelineContext,
    options?: GoogleDriveProcessOptions
  ): Promise<UnifiedImportBatch> {
    // 1. File Intake Validation
    const intakeValidation = FileIntakeValidator.validate(
      driveFileMeta.name,
      driveFileMeta.size,
      driveFileMeta.mimeType
    );
    if (!intakeValidation.isValid) {
      throw new Error(`خطأ في فحص ملف Google Drive: ${intakeValidation.errors.join(' | ')}`);
    }

    const format = intakeValidation.fileType === 'EXCEL' ? 'EXCEL' : 'CSV';
    const importBatchId = `BAT-GDRV-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // 2. Reuse existing BLOCK 31 parsers based on format (NO DUPLICATION)
    const parser = format === 'EXCEL' ? new ExcelImportParser() : new CsvImportParser();
    const normalizer = new ExcelCsvNormalizer();
    const mapper = new ExcelCsvColumnMapper(options?.customMappings);
    const entityResolver = new ExcelCsvTripEntityResolver();
    const validator = new ExcelCsvTripValidator();
    const duplicateChecker = new ExcelCsvTripDuplicateChecker();
    const committer = new ExcelCsvTripCommitter();

    // 3. Connect to unified 10-stage pipeline orchestrator (BLOCK 30)
    const pipeline = new UnifiedImportPipelineService({
      parser,
      normalizer,
      mapper,
      entityResolver,
      validator,
      duplicateChecker,
      committer,
    });

    // 4. Build source descriptor with Operation Source Model (BLOCK 29)
    // CRITICAL: Absolutely no OAuth tokens or credentials in source or metadata
    const source: ImportSource = {
      sourceType: 'GOOGLE_DRIVE',
      importBatchId,
      sourceFileId: driveFileMeta.id,
      sourceFileName: driveFileMeta.name,
      sourceMimeType: driveFileMeta.mimeType,
      sourceSheetName: options?.sheetName,
      rawInput: inputData,
      metadata: {
        driveFileId: driveFileMeta.id,
        driveFileName: driveFileMeta.name,
        driveMimeType: driveFileMeta.mimeType,
        driveFileSize: driveFileMeta.size,
        driveModifiedTime: driveFileMeta.modifiedTime,
        driveWebViewLink: driveFileMeta.webViewLink,
        folderId: driveFileMeta.folderId,
        folderName: driveFileMeta.folderName,
        format,
      },
    };

    // 5. Create batch (Stage 1: SOURCE)
    const batch = pipeline.createBatch(source, context);

    // 6. Process through PARSE -> NORMALIZE -> MAP -> RESOLVE -> VALIDATE -> DUPLICATE_CHECK -> REVIEW
    const reviewedBatch = await pipeline.processThroughReview(batch, inputData, context);

    return reviewedBatch;
  }

  /**
   * Applies user review action on a specific row (e.g. ACCEPT_WARNING or REJECT_ROW)
   */
  public static applyRowReview(
    batch: UnifiedImportBatch,
    rowNumber: number,
    action: 'ACCEPT_WARNING' | 'REJECT_ROW',
    context: PipelineContext,
    resolutionNotes?: string
  ): UnifiedImportBatch {
    const pipeline = new UnifiedImportPipelineService();
    return pipeline.applyReviewAction(batch, rowNumber, action, { notes: resolutionNotes }, context);
  }

  /**
   * Commits the reviewed batch into official Trips
   * (FIRESTORE WRITES HAPPEN ONLY HERE)
   */
  public static async commitBatch(
    batch: UnifiedImportBatch,
    context: PipelineContext
  ): Promise<{ batch: UnifiedImportBatch; result: ImportResult }> {
    const committer = new ExcelCsvTripCommitter();
    const pipeline = new UnifiedImportPipelineService({
      committer,
    });

    return pipeline.executeCommit(batch, context);
  }
}
