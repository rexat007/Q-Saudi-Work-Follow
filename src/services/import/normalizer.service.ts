/**
 * Excel & CSV Data Normalizer
 * BLOCK 31: Normalizes raw parsed cell values into canonical formats
 * Strictly implements IImportNormalizer from BLOCK 30
 * 
 * Rules:
 * - Retain raw value inside raw object
 * - Trim and collapse whitespace
 * - Arabic / English digit normalization (٠١٢٣٤٥٦٧٨٩ -> 0123456789)
 * - Decimal comma / period normalization (٫ / , / .)
 * - Strip unit strings (kg, كجم, طن, ton) from numeric fields
 * - Date normalization into YYYY-MM-DD format (including Excel serial numbers)
 * - Empty string / N/A / '-' to null
 */

import { IImportNormalizer } from './contracts';
import { PipelineContext } from '../../types/unifiedImport';
import { ExcelCsvColumnMapper } from './columnMapper.service';

export class ExcelCsvNormalizer implements IImportNormalizer<Record<string, any>, Record<string, any>> {
  public normalize(
    raw: Record<string, any>,
    rowNumber: number,
    _context: PipelineContext
  ): Record<string, any> {
    const normalized: Record<string, any> = {
      _rowNumber: rowNumber,
      _sourceRowIndex: raw._sourceRowIndex || rowNumber,
    };

    for (const [key, val] of Object.entries(raw)) {
      if (key.startsWith('_')) {
        normalized[key] = val;
        continue;
      }

      normalized[key] = ExcelCsvNormalizer.normalizeValue(val, key);
    }

    // Identify canonical fields if raw headers are aliases
    const headers = Object.keys(raw);
    const mappings = ExcelCsvColumnMapper.mapHeaders(headers);
    for (const [rawHeader, match] of Object.entries(mappings)) {
      if (match && match.confidence >= 0.70 && !match.isAmbiguous) {
        normalized[match.canonicalField] = ExcelCsvNormalizer.normalizeValue(raw[rawHeader], match.canonicalField as string);
      }
    }

    // Auto-calculate netWeight if gross and tare are present but net is absent
    const tare = normalized.tareWeight ?? normalized.tare ?? normalized['فارغ'] ?? normalized['الوزن الفارغ'];
    const gross = normalized.grossWeight ?? normalized.gross ?? normalized['قائم'] ?? normalized['الوزن القائم'];
    const net = normalized.netWeight ?? normalized.net ?? normalized['الصافي'] ?? normalized['الوزن الصافي'];

    if (net !== null && net !== undefined && typeof net === 'number' && !isNaN(net)) {
      normalized.netWeightSource = 'SUPPLIED';
      normalized.isCalculatedNet = false;
    } else if (typeof gross === 'number' && typeof tare === 'number' && !isNaN(gross) && !isNaN(tare)) {
      normalized.netWeight = Math.round((gross - tare) * 100) / 100;
      normalized.netWeightSource = 'CALCULATED';
      normalized.isCalculatedNet = true;
    } else {
      normalized.netWeight = null;
      normalized.isCalculatedNet = false;
    }

    // BLOCK 33/34 Weighbridge Rule: If destination net weight is missing, ensure destNetWeight = null, varianceWeight = null (do NOT create fake 0 variance)
    if (normalized.destNetWeight === undefined) {
      normalized.destNetWeight = null;
    }
    if (normalized.varianceWeight === undefined) {
      normalized.varianceWeight = null;
    }

    // BLOCK 34 Rule 25: Load Time preservation rule
    // If loadTime was present, preserve it; if absent, keep null. Never invent or use createdAt!
    if (normalized.loadTime === undefined) {
      normalized.loadTime = normalized.weighTime ?? null;
    }
    if (normalized.unloadTime === undefined) {
      normalized.unloadTime = null;
    }

    return normalized;
  }

  /**
   * Normalizes a single cell value
   */
  public static normalizeValue(value: any, fieldKey?: string): any {
    if (value === undefined || value === null) {
      return null;
    }

    if (typeof value === 'number') {
      // Check if it's an Excel date serial (if field key suggests date)
      if (fieldKey && ExcelCsvNormalizer.isDateFieldKey(fieldKey) && value > 25000 && value < 60000) {
        return ExcelCsvNormalizer.convertExcelSerialToDate(value);
      }
      return isNaN(value) ? null : value;
    }

    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }

    if (typeof value !== 'string') {
      return value;
    }

    // 1. Trim & collapse whitespace
    let str = value.trim().replace(/\s+/g, ' ');

    // 2. Check empty / null representation
    if (str === '' || str === '-' || str.toLowerCase() === 'n/a' || str.toLowerCase() === 'null') {
      return null;
    }

    // 3. Convert Eastern Arabic numerals to standard Western numerals
    str = ExcelCsvNormalizer.convertArabicNumerals(str);

    // 4. Date handling if field key indicates date
    if (fieldKey && ExcelCsvNormalizer.isDateFieldKey(fieldKey)) {
      const parsedDate = ExcelCsvNormalizer.parseFlexibleDate(str);
      if (parsedDate) return parsedDate;
    }

    // 5. Numeric handling if field key indicates weight / number or value looks purely numeric
    if (fieldKey && ExcelCsvNormalizer.isNumericFieldKey(fieldKey)) {
      const parsedNum = ExcelCsvNormalizer.parseFlexibleNumber(str);
      if (parsedNum !== null) return parsedNum;
    }

    // Generic numeric check
    if (/^[\d,.\s\u066B\u066C+-]+$/.test(str) && !str.includes('-') && !str.includes('/')) {
      const parsedNum = ExcelCsvNormalizer.parseFlexibleNumber(str);
      if (parsedNum !== null) return parsedNum;
    }

    return str;
  }

  /**
   * Translates Arabic Eastern numerals to ASCII numerals
   */
  public static convertArabicNumerals(str: string): string {
    const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    let result = str;
    for (let i = 0; i < 10; i++) {
      result = result.replace(new RegExp(arabicDigits[i], 'g'), String(i));
    }
    // Arabic decimal separator ٫ (\u066B) -> .
    result = result.replace(/\u066B/g, '.');
    // Arabic thousands separator ٬ (\u066C) -> ,
    result = result.replace(/\u066C/g, ',');
    return result;
  }

  /**
   * Parses flexible number with commas, decimal separators, and unit strings
   */
  public static parseFlexibleNumber(str: string): number | null {
    // Strip unit strings
    let clean = str
      .replace(/(?:kg|كجم|كيلو|طن|ton|tons|sar|ريال)/gi, '')
      .trim();

    // Check if comma is used as decimal separator (e.g. 1250,50 vs 1,250.50)
    if (clean.includes(',') && clean.includes('.')) {
      // e.g. 1,250.50 -> remove commas
      clean = clean.replace(/,/g, '');
    } else if (clean.includes(',')) {
      const parts = clean.split(',');
      if (parts.length === 2 && parts[1].length <= 3 && !parts[1].includes('000')) {
        // e.g. 1250,50 -> 1250.50
        clean = parts[0] + '.' + parts[1];
      } else {
        // Thousands separator e.g. 25,000
        clean = clean.replace(/,/g, '');
      }
    }

    // Remove any remaining whitespace
    clean = clean.replace(/\s+/g, '');

    const num = Number(clean);
    return isNaN(num) ? null : num;
  }

  /**
   * Normalizes dates to YYYY-MM-DD
   */
  public static parseFlexibleDate(str: string): string | null {
    const clean = str.trim();

    // ISO format: YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      return clean;
    }

    // DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = clean.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, '0');
      const month = dmyMatch[2].padStart(2, '0');
      const year = dmyMatch[3];
      return `${year}-${month}-${day}`;
    }

    // YYYY/MM/DD
    const ymdMatch = clean.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
    if (ymdMatch) {
      const year = ymdMatch[1];
      const month = ymdMatch[2].padStart(2, '0');
      const day = ymdMatch[3].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    // Try standard JS Date parsing
    const d = new Date(clean);
    if (!isNaN(d.getTime()) && d.getFullYear() > 2000) {
      return d.toISOString().slice(0, 10);
    }

    return clean; // Return original if unparseable so validator can flag it
  }

  /**
   * Converts Excel date serial number to YYYY-MM-DD
   */
  public static convertExcelSerialToDate(serial: number): string {
    // Excel epoch starts at 1899-12-30 due to the 1900 leap year bug
    const utcDays = Math.floor(serial - 25569);
    const utcValue = utcDays * 86400 * 1000;
    const dateInfo = new Date(utcValue);
    return dateInfo.toISOString().slice(0, 10);
  }

  private static isDateFieldKey(key: string): boolean {
    const k = key.toLowerCase();
    return k.includes('date') || k.includes('تاريخ') || k.includes('يوم') || k.includes('time');
  }

  private static isNumericFieldKey(key: string): boolean {
    const k = key.toLowerCase();
    return (
      k.includes('weight') ||
      k.includes('tare') ||
      k.includes('gross') ||
      k.includes('net') ||
      k.includes('وزن') ||
      k.includes('قائم') ||
      k.includes('فارغ') ||
      k.includes('صافي') ||
      k.includes('price') ||
      k.includes('rate') ||
      k.includes('سعر')
    );
  }
}
