/**
 * Excel & CSV Import Pipeline Service
 * BLOCK 31: Bridges file intake to UnifiedImportPipelineService (BLOCK 30)
 * 
 * Rules:
 * - Direct usage of UnifiedImportPipelineService
 * - NO separate pipeline architecture
 * - NO Firestore writes before COMMIT
 * - Full 10-stage execution support
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

export interface ProcessFileOptions {
  sheetName?: string;
  headerRowIndex?: number;
  customMappings?: Record<string, keyof CanonicalTripRow>;
}

export class ExcelCsvPipelineService {
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
   * Initializes and executes an import file through the pipeline up to the REVIEW stage
   * (NO FIRESTORE WRITES HERE)
   */
  public static async processFileToReview(
    inputData: ArrayBuffer | Uint8Array | string,
    fileName: string,
    fileSize: number,
    mimeType: string | undefined,
    context: PipelineContext,
    options?: ProcessFileOptions
  ): Promise<UnifiedImportBatch> {
    // 1. File Intake Validation
    const intakeValidation = FileIntakeValidator.validate(fileName, fileSize, mimeType);
    if (!intakeValidation.isValid) {
      throw new Error(`خطأ في فحص الملف: ${intakeValidation.errors.join(' | ')}`);
    }

    const sourceType = intakeValidation.fileType === 'EXCEL' ? 'EXCEL' : 'CSV';
    const importBatchId = `BAT-${sourceType.slice(0, 3)}-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const parser = sourceType === 'EXCEL' ? new ExcelImportParser() : new CsvImportParser();
    const normalizer = new ExcelCsvNormalizer();
    const mapper = new ExcelCsvColumnMapper(options?.customMappings);
    const entityResolver = new ExcelCsvTripEntityResolver();
    const validator = new ExcelCsvTripValidator();
    const duplicateChecker = new ExcelCsvTripDuplicateChecker();
    const committer = new ExcelCsvTripCommitter();

    const pipeline = new UnifiedImportPipelineService({
      parser,
      normalizer,
      mapper,
      entityResolver,
      validator,
      duplicateChecker,
      committer,
    });

    const source: ImportSource = {
      sourceType,
      importBatchId,
      sourceFileName: fileName,
      sourceMimeType: mimeType,
      sourceSheetName: options?.sheetName,
      rawInput: inputData,
    };

    // 2. Create batch (Stage: SOURCE)
    const batch = pipeline.createBatch(source, context);

    // 3. Process through PARSE -> NORMALIZE -> MAP -> RESOLVE -> VALIDATE -> DUPLICATE_CHECK -> REVIEW
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
