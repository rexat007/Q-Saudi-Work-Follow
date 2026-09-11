/**
 * Legacy Migration Normalizer
 * BLOCK 37: Implements IImportNormalizer for the 20-column legacy sheet format
 * 
 * Rules:
 * - Converts Eastern Arabic digits (٠-٩) to ASCII (0-9)
 * - Normalizes dates to YYYY-MM-DD
 * - Preserves null/undefined weights WITHOUT converting missing values to 0
 * - Parses numeric rates and weights safely
 * - Preserves tripSerial and legacy metadata
 * - Sets isLegacyMigration = true
 */

import { IImportNormalizer } from './contracts';
import { PipelineContext } from '../../types/unifiedImport';
import { CanonicalTripRow } from '../../types/excelCsvImport';

export class LegacyMigrationNormalizerService implements IImportNormalizer<Record<string, any>, CanonicalTripRow> {
  public normalize(raw: Record<string, any>, _rowNumber: number, context: PipelineContext): CanonicalTripRow {
    const projectId = raw.projectId ? String(raw.projectId).trim() : context.projectId;

    return {
      projectId,
      shiftDate: this.normalizeDate(raw.shiftDate || raw.date || raw.weighDate),
      ticketId: this.cleanString(raw.ticketId || raw.scaleTicketNo || raw.ticketNumber),
      carrier: this.cleanString(raw.carrier || raw.transporter || raw.carrierName),
      truckNo: this.cleanString(raw.truckNo || raw.plateNumber || raw.truckNumber),
      driverName: this.cleanString(raw.driverName || raw.driver),
      materialType: this.cleanString(raw.materialType || raw.material || raw.materialName),
      
      tareWeight: this.parseWeight(raw.tareWeight ?? raw.tare),
      grossWeight: this.parseWeight(raw.grossWeight ?? raw.gross),
      netWeight: this.parseWeight(raw.netWeight ?? raw.net),
      destNetWeight: this.parseWeight(raw.destNetWeight ?? raw.destinationNetWeight),
      varianceWeight: this.parseWeight(raw.varianceWeight ?? raw.variance),

      loader: this.cleanString(raw.loader || raw.loadOperator),
      unloader: this.cleanString(raw.unloader || raw.unloadOperator),
      
      tripRate: this.parseNumber(raw.tripRate ?? raw.rate ?? raw.agreedRate),
      legacyRate: this.parseNumber(raw.tripRate ?? raw.rate ?? raw.agreedRate),
      
      status: this.cleanString(raw.status),
      legacyStatus: this.cleanString(raw.status),
      
      tripSerial: raw.tripSerial !== undefined && raw.tripSerial !== null && String(raw.tripSerial).trim() !== ''
        ? String(this.convertEasternArabicToAscii(String(raw.tripSerial))).trim()
        : undefined,
      
      loadTime: this.cleanString(raw.loadTime),
      unloadTime: this.cleanString(raw.unloadTime),
      note: this.cleanString(raw.note || raw.notes || raw.remarks),

      isLegacyMigration: true,
    };
  }

  /**
   * Converts Eastern Arabic numerals (٠-٩) to standard ASCII digits (0-9)
   */
  public convertEasternArabicToAscii(str: string): string {
    if (!str) return '';
    return str.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));
  }

  /**
   * Cleans and trims string values
   */
  public cleanString(val: any): string | undefined {
    if (val === null || val === undefined) return undefined;
    const str = String(val).trim();
    if (str === '') return undefined;
    return str;
  }

  /**
   * Parses weights while strictly preserving null / undefined when not provided.
   * NEVER converts missing weight to 0.
   */
  public parseWeight(val: any): number | undefined {
    if (val === null || val === undefined || val === '') return undefined;
    if (typeof val === 'number') {
      return isNaN(val) ? undefined : val;
    }

    const asciiStr = this.convertEasternArabicToAscii(String(val)).replace(/,/g, '').trim();
    if (asciiStr === '') return undefined;

    const parsed = parseFloat(asciiStr);
    return isNaN(parsed) ? undefined : parsed;
  }

  /**
   * Parses arbitrary numeric field
   */
  public parseNumber(val: any): number | undefined {
    if (val === null || val === undefined || val === '') return undefined;
    if (typeof val === 'number') {
      return isNaN(val) ? undefined : val;
    }

    const asciiStr = this.convertEasternArabicToAscii(String(val)).replace(/,/g, '').trim();
    if (asciiStr === '') return undefined;

    const parsed = parseFloat(asciiStr);
    return isNaN(parsed) ? undefined : parsed;
  }

  /**
   * Normalizes date to YYYY-MM-DD
   */
  public normalizeDate(val: any): string | undefined {
    if (!val) return undefined;
    const cleanStr = this.convertEasternArabicToAscii(String(val)).trim();
    if (!cleanStr) return undefined;

    // ISO format: YYYY-MM-DD
    const isoMatch = cleanStr.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (isoMatch) {
      const year = isoMatch[1];
      const month = isoMatch[2].padStart(2, '0');
      const day = isoMatch[3].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    // DD/MM/YYYY or DD-MM-YYYY format
    const dmyMatch = cleanStr.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, '0');
      const month = dmyMatch[2].padStart(2, '0');
      const year = dmyMatch[3];
      return `${year}-${month}-${day}`;
    }

    // Fallback: Date parse
    try {
      const parsed = new Date(cleanStr);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
    } catch {
      // Return original cleaned string if unparseable
    }

    return cleanStr;
  }
}

export const legacyMigrationNormalizerService = new LegacyMigrationNormalizerService();
