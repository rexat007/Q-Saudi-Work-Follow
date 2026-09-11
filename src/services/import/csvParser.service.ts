/**
 * CSV Import Parser
 * BLOCK 31: Parses CSV text or buffer into raw structured rows
 * Strictly implements IImportParser from BLOCK 30
 * 
 * Rules:
 * - UTF-8 and BOM (\uFEFF) handling
 * - Comma delimiter with basic auto-detection for semicolon / tab
 * - Quoted fields and escaped quotes ("")
 * - Empty row skipping
 * - Duplicate headers de-duplication
 * - Raw data only: NO business rules, NO Trip creation, NO Firestore writes
 */

import { IImportParser } from './contracts';
import { ImportSource, RawParsedOutput } from '../../types/unifiedImport';
import { OperationSourceType } from '../../types/entities';

export interface CsvParseOptions {
  delimiter?: string;
  headerRowIndex?: number;
}

export class CsvImportParser implements IImportParser<string | ArrayBuffer | Uint8Array, Record<string, any>> {
  public readonly supportedSourceTypes: readonly OperationSourceType[] = ['CSV'];

  public parse(
    source: ImportSource,
    input?: string | ArrayBuffer | Uint8Array,
    options?: CsvParseOptions
  ): RawParsedOutput<Record<string, any>> {
    let csvText = '';
    const rawInput = input || source.rawInput;

    if (!rawInput) {
      return {
        headers: [],
        rows: [],
        metadata: {
          sourceType: 'CSV',
          error: 'لا توجد بيانات مدخلة للتحليل (No input data provided)',
          totalParsed: 0,
        },
      };
    }

    if (typeof rawInput === 'string') {
      csvText = rawInput;
    } else if (rawInput instanceof ArrayBuffer || rawInput instanceof Uint8Array) {
      const decoder = new TextDecoder('utf-8');
      csvText = decoder.decode(rawInput);
    } else {
      csvText = String(rawInput);
    }

    // Strip UTF-8 BOM if present
    if (csvText.charCodeAt(0) === 0xfeff) {
      csvText = csvText.slice(1);
    }

    // Split lines safely handling \r\n, \r, \n
    const lines = this.splitCsvLines(csvText);
    if (lines.length === 0) {
      return {
        headers: [],
        rows: [],
        metadata: { sourceType: 'CSV', totalParsed: 0 },
      };
    }

    // Auto-detect delimiter if not specified
    const delimiter = options?.delimiter || this.detectDelimiter(lines[0]);

    const headerRowIdx = options?.headerRowIndex ?? 0;
    const headerTokens = this.parseCsvLine(lines[headerRowIdx], delimiter);

    // Deduplicate headers safely
    const seenHeaders = new Map<string, number>();
    const sanitizedHeaders: string[] = [];

    headerTokens.forEach((h, colIndex) => {
      const cleanHeader = h.trim();
      const baseName = cleanHeader !== '' ? cleanHeader : `عمود_${colIndex + 1}`;
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

    const structuredRows: Record<string, any>[] = [];
    const dataLines = lines.slice(headerRowIdx + 1);

    for (let i = 0; i < dataLines.length; i++) {
      const lineStr = dataLines[i].trim();
      if (!lineStr) continue;

      const cells = this.parseCsvLine(dataLines[i], delimiter);

      // Check if all cells are empty
      const isCompletelyEmpty = cells.every((c) => c === undefined || c.trim() === '');
      if (isCompletelyEmpty) continue;

      const rowObj: Record<string, any> = {
        _sourceRowIndex: headerRowIdx + 1 + i + 1,
      };

      sanitizedHeaders.forEach((header, colIdx) => {
        rowObj[header] = cells[colIdx] !== undefined ? cells[colIdx] : '';
      });

      structuredRows.push(rowObj);
    }

    return {
      headers: sanitizedHeaders,
      rows: structuredRows,
      metadata: {
        sourceType: 'CSV',
        delimiter,
        totalParsed: structuredRows.length,
        sourceFileName: source.sourceFileName,
      },
    };
  }

  /**
   * Split lines handling newlines inside quotes
   */
  private splitCsvLines(text: string): string[] {
    const lines: string[] = [];
    let currentLine = '';
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        insideQuotes = !insideQuotes;
        currentLine += char;
      } else if (!insideQuotes && (char === '\r' || char === '\n')) {
        if (char === '\r' && nextChar === '\n') {
          i++; // Skip \n
        }
        if (currentLine.trim() !== '') {
          lines.push(currentLine);
        }
        currentLine = '';
      } else {
        currentLine += char;
      }
    }

    if (currentLine.trim() !== '') {
      lines.push(currentLine);
    }

    return lines;
  }

  /**
   * Parses a single CSV line into tokens, respecting quotes and escaped quotes
   */
  private parseCsvLine(line: string, delimiter: string): string[] {
    const tokens: string[] = [];
    let currentToken = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          // Escaped quote: "" -> "
          currentToken += '"';
          i++; // skip next quote
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === delimiter && !insideQuotes) {
        tokens.push(currentToken);
        currentToken = '';
      } else {
        currentToken += char;
      }
    }

    tokens.push(currentToken);
    return tokens;
  }

  /**
   * Detects delimiter (comma, semicolon, tab)
   */
  private detectDelimiter(sampleLine: string): string {
    if (!sampleLine) return ',';
    const commaCount = (sampleLine.match(/,/g) || []).length;
    const semiCount = (sampleLine.match(/;/g) || []).length;
    const tabCount = (sampleLine.match(/\t/g) || []).length;

    if (semiCount > commaCount && semiCount > tabCount) return ';';
    if (tabCount > commaCount && tabCount > semiCount) return '\t';
    return ',';
  }
}
