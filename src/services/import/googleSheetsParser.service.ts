/**
 * Google Sheets Import Parser
 * BLOCK 33: Parses 2D array row data from Google Sheets into RawParsedOutput
 * Strictly implements IImportParser from BLOCK 30 contracts
 * 
 * Rules:
 * - Direct implementation of IImportParser for 'GOOGLE_SHEETS'
 * - Preserves raw values (Arabic digits, decimals, dates) without mutation
 * - Safe empty row filtering with 1-indexed sourceRowId preservation
 * - Header deduplication and sanitization identical to Excel/CSV parsers
 * - Safety limits enforcement (MAX_SHEET_ROWS) to prevent unbounded memory usage
 * - Strictly NO business logic, Trip creation, or Firestore writes inside parser
 */

import { IImportParser } from './contracts';
import { ImportSource, RawParsedOutput } from '../../types/unifiedImport';
import { OperationSourceType } from '../../types/entities';

export interface GoogleSheetsParseOptions {
  sheetName?: string;
  headerRowIndex?: number;
  maxRows?: number;
}

export const MAX_GOOGLE_SHEETS_ROWS = 10000;

export class GoogleSheetsImportParser implements IImportParser<
  any[][] | { values: any[][]; sheetName?: string },
  Record<string, any>
> {
  public readonly supportedSourceTypes: readonly OperationSourceType[] = ['GOOGLE_SHEETS'];

  public parse(
    source: ImportSource,
    input?: any[][] | { values: any[][]; sheetName?: string },
    options?: GoogleSheetsParseOptions
  ): RawParsedOutput<Record<string, any>> {
    const rawInput = input || source.rawInput;

    if (!rawInput) {
      return {
        headers: [],
        rows: [],
        metadata: {
          sourceType: 'GOOGLE_SHEETS',
          error: 'لا توجد بيانات مدخلة للتحليل (No input data provided)',
          totalParsed: 0,
        },
      };
    }

    let values: any[][];
    let sheetName = options?.sheetName || source.sourceSheetName || 'Sheet1';

    if (Array.isArray(rawInput)) {
      values = rawInput;
    } else if (typeof rawInput === 'object' && Array.isArray((rawInput as any).values)) {
      values = (rawInput as any).values;
      if ((rawInput as any).sheetName) {
        sheetName = (rawInput as any).sheetName;
      }
    } else {
      throw new Error('تنسيق بيانات Google Sheets غير صالح. المتوقع مصفوفة صفوف ثنائية الأبعاد.');
    }

    if (!values || values.length === 0) {
      return {
        headers: [],
        rows: [],
        metadata: {
          sourceType: 'GOOGLE_SHEETS',
          selectedSheet: sheetName,
          totalParsed: 0,
          sourceFileName: source.sourceFileName,
        },
      };
    }

    // Safety Limit Enforcement: disallow silent partial drops
    const maxRows = options?.maxRows || MAX_GOOGLE_SHEETS_ROWS;
    if (values.length > maxRows) {
      throw new Error(
        `تجاوز جدول البيانات الحد الأقصى المسموح به للصفوف (${maxRows} صفاً). يحتوي الملف على ${values.length} صفاً. يرجى تقسيم البيانات قبل الاستيراد.`
      );
    }

    const headerRowIdx = options?.headerRowIndex ?? 0;
    if (headerRowIdx >= values.length) {
      throw new Error(`مؤشر صف الترويسة (${headerRowIdx}) أكبر من عدد صفوف الجدول المتاحة (${values.length}).`);
    }

    const rawHeaders = (values[headerRowIdx] || []).map((h) => String(h ?? '').trim());

    // Deduplicate headers safely: e.g. ["الوزن", "الوزن"] -> ["الوزن", "الوزن_2"]
    const seenHeaders = new Map<string, number>();
    const sanitizedHeaders: string[] = [];

    rawHeaders.forEach((header, colIndex) => {
      const baseName = header !== '' ? header : `عمود_${colIndex + 1}`;
      const count = seenHeaders.get(baseName) || 0;
      if (count === 0) {
        seenHeaders.set(baseName, 1);
        sanitizedHeaders.push(baseName);
      } else {
        const nextCount = count + 1;
        seenHeaders.set(baseName, nextCount);
        sanitizedHeaders.push(`${baseName}_${nextCount}`);
      }
    });

    // Map data rows
    const structuredRows: Record<string, any>[] = [];
    const dataRows = values.slice(headerRowIdx + 1);

    for (let rIdx = 0; rIdx < dataRows.length; rIdx++) {
      const rowArr = dataRows[rIdx];
      if (!rowArr || !Array.isArray(rowArr)) continue;

      // Check if row is completely empty
      const isCompletelyEmpty = rowArr.every(
        (cell) => cell === undefined || cell === null || String(cell).trim() === ''
      );
      if (isCompletelyEmpty) {
        continue;
      }

      const rowObj: Record<string, any> = {
        _sourceRowIndex: headerRowIdx + 1 + rIdx + 1, // 1-indexed row number in Google Sheet
      };

      sanitizedHeaders.forEach((header, colIdx) => {
        const cellValue = rowArr[colIdx];
        rowObj[header] = cellValue !== undefined ? cellValue : '';
      });

      structuredRows.push(rowObj);
    }

    return {
      headers: sanitizedHeaders,
      rows: structuredRows,
      metadata: {
        sourceType: 'GOOGLE_SHEETS',
        selectedSheet: sheetName,
        totalParsed: structuredRows.length,
        sourceFileName: source.sourceFileName,
        sourceFileId: source.sourceFileId,
      },
    };
  }
}
