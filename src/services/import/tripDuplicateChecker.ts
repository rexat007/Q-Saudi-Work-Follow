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

      const dupKey = this.extractDuplicateKey(canonical);

      if (!dupKey) {
        return row;
      }

      // 1. Check Batch internal duplicate
      if (seenBatchKeys.has(dupKey)) {
        const firstSeenRow = seenBatchKeys.get(dupKey)!;
        return {
          ...row,
          duplicateInfo: {
            isDuplicate: true,
            duplicateWithRow: firstSeenRow,
            duplicateKey: dupKey,
            reason: `تكرار داخل نفس الملف مع الصف رقم (${firstSeenRow}) للمفتاح (${dupKey})`,
          },
          reviewStatus: 'requires_review',
        };
      }
      seenBatchKeys.set(dupKey, row.rowNumber);

      // 2. Check Database existing keys
      const rawTicketKey = canonical.ticketId ? String(canonical.ticketId).trim() : null;
      if (
        context.existingKeys &&
        (context.existingKeys.has(dupKey) || (rawTicketKey && context.existingKeys.has(rawTicketKey)))
      ) {
        return {
          ...row,
          duplicateInfo: {
            isDuplicate: true,
            duplicateKey: dupKey,
            reason: `المفتاح (${dupKey}) مسجل مسبقاً في قاعدة بيانات النظام`,
          },
          reviewStatus: 'requires_review',
        };
      }

      return row;
    });
  }

  private extractDuplicateKey(canonical: Partial<CanonicalTripRow>): string | null {
    if (canonical.ticketId && String(canonical.ticketId).trim() !== '') {
      const rawTicket = String(canonical.ticketId).trim();
      return rawTicket.startsWith('TKT-') ? rawTicket : `TKT-${rawTicket}`;
    }

    if (canonical.truckNo && canonical.shiftDate) {
      const truck = String(canonical.truckNo).trim();
      const date = String(canonical.shiftDate).trim();
      const tare = canonical.tareWeight !== undefined ? canonical.tareWeight : '';
      return `TRK-${truck}-${date}-${tare}`;
    }

    return null;
  }
}
