/**
 * Legacy Migration Parser
 * BLOCK 37: Implements IImportParser for the 20-column legacy sheet format
 * 
 * Supports:
 * - Direct LegacySheetRow[] objects
 * - 2D Array raw data with 20-column headers
 * - Plain object collections
 * - Filters completely empty rows
 * - Strictly read-only
 */

import { IImportParser } from './contracts';
import { ImportSource, RawParsedOutput } from '../../types/unifiedImport';
import { OperationSourceType } from '../../types/entities';
import { LegacySheetRow } from '../../types/legacyMigration';
import { SAMPLE_LEGACY_GOOGLE_SHEET_ROWS } from '../../data/sampleLegacySheetData';

export const LEGACY_20_COLUMN_KEYS = [
  'projectId',
  'shiftDate',
  'ticketId',
  'carrier',
  'truckNo',
  'driverName',
  'materialType',
  'tareWeight',
  'grossWeight',
  'netWeight',
  'destNetWeight',
  'varianceWeight',
  'loader',
  'unloader',
  'tripRate',
  'status',
  'tripSerial',
  'loadTime',
  'unloadTime',
  'note',
] as const;

export class LegacyMigrationParserService implements IImportParser<LegacySheetRow[] | any, Record<string, any>> {
  public readonly supportedSourceTypes: readonly OperationSourceType[] = [
    'MIGRATION',
    'GOOGLE_SHEETS',
    'EXCEL',
    'CSV',
  ] as const;

  public parse(
    source: ImportSource,
    input?: LegacySheetRow[] | any
  ): RawParsedOutput<Record<string, any>> {
    const rawData = input ?? source.rawInput ?? SAMPLE_LEGACY_GOOGLE_SHEET_ROWS;

    if (!Array.isArray(rawData)) {
      return {
        headers: [...LEGACY_20_COLUMN_KEYS],
        rows: [],
      };
    }

    // Case 1: 2D Array input (first row might be headers)
    if (rawData.length > 0 && Array.isArray(rawData[0])) {
      const headerRow = rawData[0].map((h: any) => String(h || '').trim());
      const dataRows = rawData.slice(1);
      const rows: Record<string, any>[] = [];

      for (let i = 0; i < dataRows.length; i++) {
        const rowArr = dataRows[i];
        if (!Array.isArray(rowArr)) continue;

        // Skip completely empty rows
        const hasContent = rowArr.some((cell: any) => cell !== null && cell !== undefined && String(cell).trim() !== '');
        if (!hasContent) continue;

        const rowObj: Record<string, any> = {
          sourceRowId: i + 2, // 1-indexed header + 1
        };

        for (let j = 0; j < headerRow.length; j++) {
          const colName = headerRow[j] || `col_${j}`;
          rowObj[colName] = rowArr[j] !== undefined ? rowArr[j] : null;
        }
        rows.push(rowObj);
      }

      return {
        headers: headerRow,
        rows,
        metadata: {
          totalRead: rawData.length,
          dataRowsCount: rows.length,
        },
      };
    }

    // Case 2: Array of objects (e.g. LegacySheetRow[] or raw record objects)
    const validRows: Record<string, any>[] = [];
    const headers = new Set<string>();

    for (let i = 0; i < rawData.length; i++) {
      const item = rawData[i];
      if (!item || typeof item !== 'object') continue;

      const keys = Object.keys(item);
      keys.forEach((k) => headers.add(k));

      // Filter completely empty rows
      const hasContent = Object.values(item).some(
        (val) => val !== null && val !== undefined && String(val).trim() !== ''
      );
      if (!hasContent) continue;

      validRows.push({
        ...item,
        sourceRowId: (item as any).sourceRowId ?? (i + 1),
      });
    }

    return {
      headers: headers.size > 0 ? Array.from(headers) : [...LEGACY_20_COLUMN_KEYS],
      rows: validRows,
      metadata: {
        totalRead: rawData.length,
        dataRowsCount: validRows.length,
      },
    };
  }
}

export const legacyMigrationParserService = new LegacyMigrationParserService();
