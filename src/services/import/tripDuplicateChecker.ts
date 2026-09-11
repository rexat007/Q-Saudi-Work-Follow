/**
 * Excel & CSV Duplicate Checker
 * BLOCK 31: Detects duplicate rows within the batch or against existing store
 * Strictly implements IImportDuplicateChecker from BLOCK 30
 * 
 * Rules:
 * - Duplicate detection based on appropriate identifiers actually present in data
 * - Primary: ticketId
 * - Secondary: truckNo + shiftDate + tareWeight
 * - Never consider a row duplicate based solely on partial name similarity
 * - Ambiguity -> requires_review
 */

import { IImportDuplicateChecker } from './contracts';
import { ImportRow, PipelineContext } from '../../types/unifiedImport';
import { CanonicalTripRow } from '../../types/excelCsvImport';

export class ExcelCsvTripDuplicateChecker implements IImportDuplicateChecker {
  public checkDuplicates(rows: ImportRow[], context: PipelineContext): ImportRow[] {
    const seenBatchKeys = new Map<string, number>(); // key -> first rowNumber seen

    return rows.map((row) => {
      const canonical: Partial<CanonicalTripRow> =
        (row.mapped as any) || (row.canonical as any) || {};

      const dupKeys = this.extractDuplicateKeys(canonical);

      if (dupKeys.length === 0) {
        return row;
      }

      // 1. Check Batch internal duplicate for any key
      for (const key of dupKeys) {
        if (seenBatchKeys.has(key)) {
          const firstSeenRow = seenBatchKeys.get(key)!;
          return {
            ...row,
            duplicateInfo: {
              isDuplicate: true,
              duplicateWithRow: firstSeenRow,
              duplicateKey: key,
              reason: `تكرار داخل نفس الملف مع الصف رقم (${firstSeenRow}) للمفتاح (${key})`,
            },
            reviewStatus: 'requires_review',
          };
        }
      }

      // Record all keys for this row
      for (const key of dupKeys) {
        seenBatchKeys.set(key, row.rowNumber);
      }

      // 2. Check Database existing keys
      const rawTicketKey = canonical.ticketId ? String(canonical.ticketId).trim() : null;
      const rawSerialKey = canonical.tripSerial !== undefined && canonical.tripSerial !== null ? String(canonical.tripSerial).trim() : null;
      for (const key of dupKeys) {
        if (
          context.existingKeys &&
          (context.existingKeys.has(key) ||
            (rawTicketKey && context.existingKeys.has(rawTicketKey)) ||
            (rawSerialKey && context.existingKeys.has(rawSerialKey)))
        ) {
          return {
            ...row,
            duplicateInfo: {
              isDuplicate: true,
              duplicateKey: key,
              reason: `المفتاح (${key}) مسجل مسبقاً في قاعدة بيانات النظام`,
            },
            reviewStatus: 'requires_review',
          };
        }
      }

      return row;
    });
  }

  public extractDuplicateKeys(canonical: Partial<CanonicalTripRow>): string[] {
    const keys: string[] = [];

    if (canonical.ticketId && String(canonical.ticketId).trim() !== '') {
      const rawTicket = String(canonical.ticketId).trim();
      keys.push(rawTicket.startsWith('TKT-') ? rawTicket : `TKT-${rawTicket}`);
    }

    if (canonical.tripSerial !== undefined && canonical.tripSerial !== null && String(canonical.tripSerial).trim() !== '') {
      const rawSerial = String(canonical.tripSerial).trim();
      const proj = canonical.projectId ? `${canonical.projectId}-` : '';
      keys.push(`SERIAL-${proj}${rawSerial}`);
      keys.push(`SRL-${rawSerial}`);
    }

    if (canonical.truckNo && canonical.shiftDate) {
      const truck = String(canonical.truckNo).trim();
      const date = String(canonical.shiftDate).trim();
      const tare = canonical.tareWeight !== undefined ? canonical.tareWeight : '';
      keys.push(`TRK-${truck}-${date}-${tare}`);
    }

    return keys;
  }

  public extractDuplicateKey(canonical: Partial<CanonicalTripRow>): string | null {
    const keys = this.extractDuplicateKeys(canonical);
    return keys.length > 0 ? keys[0] : null;
  }
}
