/**
 * Excel & CSV Trip Import Validator
 * BLOCK 31: Validates imported rows against domain constraints
 * Strictly implements IImportValidator from BLOCK 30
 * 
 * Rules:
 * - Blocking errors:
 *   * Missing mandatory identification (neither ticketId nor truckNo)
 *   * Invalid numeric value (negative or NaN)
 *   * Invariant: gross < tare (physically impossible)
 *   * Invalid unparseable date
 *   * Invalid source structure
 * - Warnings (Non-blocking):
 *   * Missing driver (optional)
 *   * Missing unload data (destNetWeight) -> weighbridge compatible!
 *   * Unknown carrier / truck / material
 * - Do NOT turn every warning into an error!
 */

import { IImportValidator } from './contracts';
import { ImportRow, ImportIssue, PipelineContext } from '../../types/unifiedImport';
import { CanonicalTripRow } from '../../types/excelCsvImport';

export class ExcelCsvTripValidator implements IImportValidator<CanonicalTripRow> {
  public validateRow(row: ImportRow<any, CanonicalTripRow>, context: PipelineContext): ImportIssue[] {
    const issues: ImportIssue[] = [];
    const canonical: Partial<CanonicalTripRow> = (row.mapped as any) || (row.canonical as any) || {};

    const rowNum = row.rowNumber;

    // 1. Mandatory Identification Check (BLOCKING)
    const hasTicket = canonical.ticketId && String(canonical.ticketId).trim() !== '';
    const hasTruck = canonical.truckNo && String(canonical.truckNo).trim() !== '';

    if (!hasTicket && !hasTruck) {
      issues.push({
        issueId: `ERR-ID-${rowNum}`,
        row: rowNum,
        field: 'identification',
        code: 'MISSING_IDENTIFICATION',
        severity: 'BLOCKING',
        message: 'Missing both Ticket ID and Truck Plate. At least one required.',
        messageAr: 'بيانات التعريف مفقودة: يجب توفر رقم التذكرة أو رقم اللوحة على الأقل.',
        resolvable: true,
        blocking: true,
      });
    }

    // 2. Numeric Weights Validation (BLOCKING if negative, unparseable, or gross < tare)
    const tare = canonical.tareWeight;
    const gross = canonical.grossWeight;
    const net = canonical.netWeight;

    if (tare !== undefined && tare !== null) {
      if (typeof tare !== 'number' || isNaN(tare)) {
        issues.push({
          issueId: `ERR-TARE-NAN-${rowNum}`,
          row: rowNum,
          field: 'tareWeight',
          code: 'INVALID_NUMERIC_TARE',
          severity: 'BLOCKING',
          message: 'Tare weight is not a valid number',
          messageAr: 'الوزن الفارغ غير صالح (قيمة رقمية غير صحيحة)',
          resolvable: true,
          blocking: true,
          originalValue: tare,
        });
      } else if (tare < 0) {
        issues.push({
          issueId: `ERR-TARE-NEG-${rowNum}`,
          row: rowNum,
          field: 'tareWeight',
          code: 'NEGATIVE_WEIGHT',
          severity: 'BLOCKING',
          message: 'Tare weight cannot be negative',
          messageAr: 'الوزن الفارغ لا يمكن أن يكون سالباً',
          resolvable: true,
          blocking: true,
          originalValue: tare,
        });
      }
    }

    if (gross !== undefined && gross !== null) {
      if (typeof gross !== 'number' || isNaN(gross)) {
        issues.push({
          issueId: `ERR-GROSS-NAN-${rowNum}`,
          row: rowNum,
          field: 'grossWeight',
          code: 'INVALID_NUMERIC_GROSS',
          severity: 'BLOCKING',
          message: 'Gross weight is not a valid number',
          messageAr: 'الوزن الإجمالي/القائم غير صالح (قيمة رقمية غير صحيحة)',
          resolvable: true,
          blocking: true,
          originalValue: gross,
        });
      } else if (gross < 0) {
        issues.push({
          issueId: `ERR-GROSS-NEG-${rowNum}`,
          row: rowNum,
          field: 'grossWeight',
          code: 'NEGATIVE_WEIGHT',
          severity: 'BLOCKING',
          message: 'Gross weight cannot be negative',
          messageAr: 'الوزن الإجمالي لا يمكن أن يكون سالباً',
          resolvable: true,
          blocking: true,
          originalValue: gross,
        });
      }
    }

    if (net !== undefined && net !== null) {
      if (typeof net !== 'number' || isNaN(net)) {
        issues.push({
          issueId: `ERR-NET-NAN-${rowNum}`,
          row: rowNum,
          field: 'netWeight',
          code: 'INVALID_NUMERIC_NET',
          severity: 'BLOCKING',
          message: 'Net weight is not a valid number',
          messageAr: 'الوزن الصافي غير صالح (قيمة رقمية غير صحيحة)',
          resolvable: true,
          blocking: true,
          originalValue: net,
        });
      } else if (net < 0) {
        issues.push({
          issueId: `ERR-NET-NEG-${rowNum}`,
          row: rowNum,
          field: 'netWeight',
          code: 'NEGATIVE_WEIGHT',
          severity: 'BLOCKING',
          message: 'Net weight cannot be negative',
          messageAr: 'الوزن الصافي لا يمكن أن يكون سالباً',
          resolvable: true,
          blocking: true,
          originalValue: net,
        });
      }
    }

    // Physical Invariant Check: gross >= tare
    if (
      typeof gross === 'number' &&
      typeof tare === 'number' &&
      !isNaN(gross) &&
      !isNaN(tare) &&
      gross > 0 &&
      tare > 0
    ) {
      if (gross < tare) {
        issues.push({
          issueId: `ERR-PHYSICS-${rowNum}`,
          row: rowNum,
          field: 'grossWeight',
          code: 'GROSS_LESS_THAN_TARE',
          severity: 'BLOCKING',
          message: `Physical invariant violated: Gross weight (${gross}) is less than Tare weight (${tare})`,
          messageAr: `مخالفة فيزيائية حتمية للميزان: الوزن القائم (${gross} كجم) أقل من الوزن الفارغ (${tare} كجم).`,
          resolvable: true,
          blocking: true,
          originalValue: { gross, tare },
        });
      }
    }

    // 3. Date Validation (BLOCKING if invalid unparseable format)
    if (canonical.shiftDate) {
      const dateStr = String(canonical.shiftDate).trim();
      const isIso = /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
      if (!isIso) {
        issues.push({
          issueId: `ERR-DATE-${rowNum}`,
          row: rowNum,
          field: 'shiftDate',
          code: 'INVALID_DATE_FORMAT',
          severity: 'BLOCKING',
          message: `Invalid date format (${dateStr}). Expected YYYY-MM-DD.`,
          messageAr: `صيغة التاريخ غير صالحة (${dateStr}). يجب أن تكون YYYY-MM-DD.`,
          resolvable: true,
          blocking: true,
          originalValue: dateStr,
        });
      }
    }

    // 4. Missing Driver Warning (WARNING - NON-BLOCKING)
    if (!canonical.driverName && !canonical.driverId) {
      issues.push({
        issueId: `WRN-DRIVER-${rowNum}`,
        row: rowNum,
        field: 'driverName',
        code: 'MISSING_OPTIONAL_DRIVER',
        severity: 'WARNING',
        message: 'Driver name is missing. Trip can proceed without assigned driver.',
        messageAr: 'اسم السائق غير مدخل. يمكن قبول الشحنة بدون سائق محدد كتحذير.',
        resolvable: true,
        blocking: false,
      });
    }

    // 5. Missing Unloading Data Warning (WARNING - NON-BLOCKING - WEIGHBRIDGE COMPATIBLE)
    const hasUnloadNet = canonical.destNetWeight !== undefined && canonical.destNetWeight !== null;
    if (!hasUnloadNet) {
      issues.push({
        issueId: `WRN-UNLOAD-${rowNum}`,
        row: rowNum,
        field: 'destNetWeight',
        code: 'MISSING_UNLOAD_DATA',
        severity: 'WARNING',
        message: 'Unload net weight missing. Row accepted as weighbridge origin loading dispatch.',
        messageAr: 'بيانات وزن الوصول/التفريغ غير متوفرة. تم قبول الصف كشحنة محملة من الميزان.',
        resolvable: true,
        blocking: false,
      });
    }

    // 6. Unknown Entity Warnings (WARNING - NON-BLOCKING)
    if (canonical.carrier && context.knownEntities?.carrierIds) {
      const carrierStr = String(canonical.carrier).trim();
      const match = context.knownEntities.carrierIds.some(
        (c) => c.toLowerCase() === carrierStr.toLowerCase()
      );
      if (!match) {
        issues.push({
          issueId: `WRN-CARRIER-UNK-${rowNum}`,
          row: rowNum,
          field: 'carrier',
          code: 'UNKNOWN_CARRIER',
          severity: 'WARNING',
          message: `Carrier (${carrierStr}) not found in master records.`,
          messageAr: `الناقل (${carrierStr}) غير مسجل في السجلات المعتمدة للمشروع.`,
          resolvable: true,
          blocking: false,
          originalValue: carrierStr,
        });
      }
    }

    if (canonical.truckNo && context.knownEntities?.truckPlates) {
      const truckStr = String(canonical.truckNo).trim();
      const match = context.knownEntities.truckPlates.some(
        (t) => t.toLowerCase() === truckStr.toLowerCase()
      );
      if (!match) {
        issues.push({
          issueId: `WRN-TRUCK-UNK-${rowNum}`,
          row: rowNum,
          field: 'truckNo',
          code: 'UNKNOWN_TRUCK',
          severity: 'WARNING',
          message: `Truck plate (${truckStr}) not found in master records.`,
          messageAr: `الشاحنة / اللوحة (${truckStr}) غير مسجلة في السجلات المعتمدة للمشروع.`,
          resolvable: true,
          blocking: false,
          originalValue: truckStr,
        });
      }
    }

    if (canonical.materialType && context.knownEntities?.materialCodes) {
      const matStr = String(canonical.materialType).trim();
      const match = context.knownEntities.materialCodes.some(
        (m) => m.toLowerCase() === matStr.toLowerCase()
      );
      if (!match) {
        issues.push({
          issueId: `WRN-MAT-UNK-${rowNum}`,
          row: rowNum,
          field: 'materialType',
          code: 'UNKNOWN_MATERIAL',
          severity: 'WARNING',
          message: `Material (${matStr}) not found in master records.`,
          messageAr: `المادة (${matStr}) غير مسجلة في قائمة المواد المعتمدة للمشروع.`,
          resolvable: true,
          blocking: false,
          originalValue: matStr,
        });
      }
    }

    return issues;
  }
}
