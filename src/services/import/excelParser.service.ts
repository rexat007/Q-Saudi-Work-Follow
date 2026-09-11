/**
 * Excel Import Parser
 * BLOCK 31: Parses .xlsx and .xls workbooks into raw data
 * Strictly implements IImportParser from BLOCK 30
 * 
 * Rules:
 * - Multi-sheet workbook support
 * - Sheet selection support
 * - Safe empty row filtering
 * - Duplicate headers de-duplication
 * - Raw data only: NO business rules, NO Trip creation, NO Firestore writes
 */

import * as XLSX from 'xlsx';
import { IImportParser } from './contracts';
import { ImportSource, RawParsedOutput } from '../../types/unifiedImport';
import { OperationSourceType } from '../../types/entities';

export interface ExcelParseOptions {
  sheetName?: string;
  headerRowIndex?: number;
}

export class ExcelImportParser implements IImportParser<ArrayBuffer | Uint8Array | string, Record<string, any>> {
  public readonly supportedSourceTypes: readonly OperationSourceType[] = ['EXCEL'];

  /**
   * Helper to inspect workbook sheets without full parse
   */
  public static getWorkbookSheetNames(input: ArrayBuffer | Uint8Array | string): string[] {
    try {
      const workbook = typeof input === 'string'
        ? XLSX.read(input, { type: 'binary', sheetRows: 1 })
        : XLSX.read(input, { type: 'array', sheetRows: 1 });
      return workbook.SheetNames || [];
    } catch {
      return [];
    }
  }

  public parse(
    source: ImportSource,
    input?: ArrayBuffer | Uint8Array | string,
    options?: ExcelParseOptions
  ): RawParsedOutput<Record<string, any>> {
    const rawInput = input || source.rawInput;
    if (!rawInput) {
      return {
        headers: [],
        rows: [],
        metadata: {
          sourceType: 'EXCEL',
          error: 'لا توجد بيانات مدخلة للتحليل (No input data provided)',
          totalParsed: 0,
        },
      };
    }

    let workbook: XLSX.WorkBook;
    try {
      if (typeof rawInput === 'string') {
        // Binary string or base64
        workbook = XLSX.read(rawInput, { type: 'binary', cellDates: true });
      } else {
        workbook = XLSX.read(rawInput, { type: 'array', cellDates: true });
      }
    } catch (err: any) {
      throw new Error(`فشل في قراءة ملف الإكسل: ${err?.message || 'تنسيق الملف غير صالح'}`);
    }

    const sheetNames = workbook.SheetNames || [];
    if (sheetNames.length === 0) {
      return {
        headers: [],
        rows: [],
        metadata: {
          sourceType: 'EXCEL',
          sheetNames: [],
          totalParsed: 0,
        },
      };
    }

    // Determine target sheet
    const targetSheetName =
      options?.sheetName ||
      source.sourceSheetName ||
      sheetNames[0];

    const worksheet = workbook.Sheets[targetSheetName];
    if (!worksheet) {
      throw new Error(`ورقة العمل المحددة (${targetSheetName}) غير موجودة في ملف الإكسل. الأوراق المتاحة: ${sheetNames.join(', ')}`);
    }

    // Convert sheet to array of arrays
    const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, {
      header: 1,
      blankrows: false,
      defval: '',
      raw: false,
      dateNF: 'yyyy-mm-dd',
    });

    if (rawRows.length === 0) {
      return {
        headers: [],
        rows: [],
        metadata: {
          sourceType: 'EXCEL',
          sheetNames,
          selectedSheet: targetSheetName,
          totalParsed: 0,
        },
      };
    }

    const headerRowIdx = options?.headerRowIndex ?? 0;
    const rawHeaders = (rawRows[headerRowIdx] || []).map((h) => String(h || '').trim());

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
    const dataRows = rawRows.slice(headerRowIdx + 1);

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
        _sourceRowIndex: headerRowIdx + 1 + rIdx + 1, // 1-indexed row number in sheet
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
        sourceType: 'EXCEL',
        sheetNames,
        selectedSheet: targetSheetName,
        totalParsed: structuredRows.length,
        sourceFileName: source.sourceFileName,
      },
    };
  }
}
