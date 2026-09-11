/**
 * Google Sheets Import Pipeline Service
 * BLOCK 33: Bridges Google Sheets Intake to UnifiedImportPipelineService (BLOCK 30)
 * 
 * Rules:
 * - Direct usage of UnifiedImportPipelineService (NO duplicate or parallel pipeline)
 * - Source Type: 'GOOGLE_SHEETS'
 * - Preserves real operation source: loadingDataSource may be 'WEIGHBRIDGE' if sheet contains weighbridge data
 * - Reuses existing BLOCK 31 components (Normalizer, ColumnMapper, Validator, DuplicateChecker, EntityResolver, Committer)
 * - Strictly NO OAuth secrets or access tokens stored in Firestore, Trip, or ImportBatch records
 * - Pre-commit invariant strictly enforced: ZERO Firestore writes before COMMIT stage
 * - Project Isolation & RBAC strictly validated
 */

import { UnifiedImportPipelineService } from './unifiedImportPipeline.service';
import { GoogleSheetsImportParser } from './googleSheetsParser.service';
import { ExcelCsvNormalizer } from './normalizer.service';
import { ExcelCsvColumnMapper } from './columnMapper.service';
import { ExcelCsvTripEntityResolver } from './tripEntityResolver';
import { ExcelCsvTripValidator } from './tripImportValidator';
import { ExcelCsvTripDuplicateChecker } from './tripDuplicateChecker';
import { ExcelCsvTripCommitter } from './tripImportCommitter';
import {
  UnifiedImportBatch,
  ImportSource,
  PipelineContext,
  ImportResult,
} from '../../types/unifiedImport';
import { ColumnMappingMatch } from '../../types/excelCsvImport';
import {
  GoogleSpreadsheetItem,
  GoogleSheetsProcessOptions,
} from '../../types/googleSheetsImport';

export class GoogleSheetsPipelineService {
  /**
   * Helper to inspect column mappings for raw headers in a Google Sheet
   */
  public static inspectColumnMappings(headers: string[]): Record<string, ColumnMappingMatch> {
    return ExcelCsvColumnMapper.mapHeaders(headers);
  }

  /**
   * Initializes and executes a Google Sheets import through the pipeline up to the REVIEW stage
   * (STRICT INVARIANT: ZERO FIRESTORE WRITES HERE)
   */
  public static async processSheetsDataToReview(
    values: any[][],
    spreadsheetMeta: GoogleSpreadsheetItem,
    sheetTitle: string,
    context: PipelineContext,
    options?: GoogleSheetsProcessOptions
  ): Promise<UnifiedImportBatch> {
    if (!values || !Array.isArray(values)) {
      throw new Error('بيانات Google Sheets غير متوفرة أو بتنسيق غير صالح.');
    }

    if (!spreadsheetMeta || !spreadsheetMeta.id) {
      throw new Error('معرف جدول بيانات Google Sheets مطلوب.');
    }

    const importBatchId = `BAT-GSHT-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // 1. Instantiate existing parser & pipeline components (NO DUPLICATION)
    const parser = new GoogleSheetsImportParser();
    const normalizer = new ExcelCsvNormalizer();
    const mapper = new ExcelCsvColumnMapper(options?.customMappings);
    const entityResolver = new ExcelCsvTripEntityResolver();
    const validator = new ExcelCsvTripValidator();
    const duplicateChecker = new ExcelCsvTripDuplicateChecker();
    const committer = new ExcelCsvTripCommitter();

    // 2. Connect to unified 10-stage pipeline orchestrator (BLOCK 30)
    const pipeline = new UnifiedImportPipelineService({
      parser,
      normalizer,
      mapper,
      entityResolver,
      validator,
      duplicateChecker,
      committer,
    });

    // 3. Build source descriptor with Operation Source Model (BLOCK 29)
    // CRITICAL: Strictly NO OAuth tokens, refresh tokens, or secrets in source or metadata
    const source: ImportSource = {
      sourceType: 'GOOGLE_SHEETS',
      importBatchId,
      sourceFileId: spreadsheetMeta.id,
      sourceFileName: spreadsheetMeta.name,
      sourceSheetName: sheetTitle,
      sourceMimeType: 'application/vnd.google-apps.spreadsheet',
      rawInput: values,
      metadata: {
        spreadsheetId: spreadsheetMeta.id,
        spreadsheetTitle: spreadsheetMeta.name,
        sheetTitle,
        modifiedTime: spreadsheetMeta.modifiedTime,
        webViewLink: spreadsheetMeta.webViewLink,
        totalRawRows: values.length,
      },
    };

    // 4. Create batch (Stage 1: SOURCE)
    const batch = pipeline.createBatch(source, context);

    // 5. Process through PARSE -> NORMALIZE -> MAP -> RESOLVE -> VALIDATE -> DUPLICATE_CHECK -> REVIEW
    const reviewedBatch = await pipeline.processThroughReview(batch, values, context);

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
