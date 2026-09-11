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

/**
 * Tolerance for net weight calculation discrepancy (kg).
 * Accounts for standard decimal precision and floating-point representations.
 */
export const NET_WEIGHT_CALCULATION_TOLERANCE_KG = 0.05;

export class ExcelCsvTripValidator implements IImportValidator<CanonicalTripRow> {
  public validateRow(row: ImportRow<any, CanonicalTripRow>, context: PipelineContext): ImportIssue[] {
    const issues: ImportIssue[] = [];
    const canonical: Partial<CanonicalTripRow> = (row.mapped as any) || (row.canonical as any) || {};

    const rowNum = row.rowNumber;

    // 1. Weighbridge Profile vs Standard Intake Checks
    const isWeighbridge =
      context.profile === 'WEIGHBRIDGE' ||
      canonical.isWeighbridgeOnly ||
      (canonical.sourceType as string) === 'WEIGHBRIDGE';

    if (isWeighbridge) {
      // Weighbridge Input Profile Mandatory Fields
      if (!canonical.ticketId || String(canonical.ticketId).trim() === '') {
        issues.push({
          issueId: `ERR-WB-TICKET-${rowNum}`,
          row: rowNum,
          field: 'ticketId',
          code: 'MISSING_TICKET_ID',
          severity: 'BLOCKING',
          message: 'Ticket ID is required for weighbridge intake.',
          messageAr: 'رقم تذكرة الميزان إلزامي لاعتماد بيانات الميزان.',
          resolvable: true,
          blocking: true,
        });
      }

      if (!canonical.truckNo || String(canonical.truckNo).trim() === '') {
        issues.push({
          issueId: `ERR-WB-TRUCK-${rowNum}`,
          row: rowNum,
          field: 'truckNo',
          code: 'MISSING_TRUCK_NO',
          severity: 'BLOCKING',
          message: 'Truck number / plate is required for weighbridge intake.',
          messageAr: 'رقم لوحة / تعريف الشاحنة إلزامي لاعتماد بيانات الميزان.',
          resolvable: true,
          blocking: true,
        });
      }

      if (!canonical.shiftDate || String(canonical.shiftDate).trim() === '') {
        issues.push({
          issueId: `ERR-WB-DATE-${rowNum}`,
          row: rowNum,
          field: 'shiftDate',
          code: 'MISSING_DATE',
          severity: 'BLOCKING',
          message: 'Shift date is required for weighbridge intake.',
          messageAr: 'تاريخ عملية الوزن إلزامي لاعتماد بيانات الميزان.',
          resolvable: true,
          blocking: true,
        });
      }

      if (canonical.tareWeight === undefined || canonical.tareWeight === null) {
        issues.push({
          issueId: `ERR-WB-TARE-${rowNum}`,
          row: rowNum,
          field: 'tareWeight',
          code: 'MISSING_TARE_WEIGHT',
          severity: 'BLOCKING',
          message: 'Tare weight is required for weighbridge intake.',
          messageAr: 'وزن الفارغ إلزامي لاعتماد بيانات الميزان.',
          resolvable: true,
          blocking: true,
        });
      }

      if (canonical.grossWeight === undefined || canonical.grossWeight === null) {
        issues.push({
          issueId: `ERR-WB-GROSS-${rowNum}`,
          row: rowNum,
          field: 'grossWeight',
          code: 'MISSING_GROSS_WEIGHT',
          severity: 'BLOCKING',
          message: 'Gross weight is required for weighbridge intake.',
          messageAr: 'وزن القائم إلزامي لاعتماد بيانات الميزان.',
          resolvable: true,
          blocking: true,
        });
      }
    } else {
      // Standard Identification Check (BLOCKING)
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
      } else if (tare <= 0) {
        issues.push({
          issueId: `ERR-TARE-NONPOS-${rowNum}`,
          row: rowNum,
          field: 'tareWeight',
          code: 'TARE_WEIGHT_NON_POSITIVE',
          severity: 'BLOCKING',
          message: 'Tare weight must be strictly positive',
          messageAr: 'الوزن الفارغ يجب أن يكون أكبر من الصفر',
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
      } else if (gross <= 0) {
        issues.push({
          issueId: `ERR-GROSS-NONPOS-${rowNum}`,
          row: rowNum,
          field: 'grossWeight',
          code: 'GROSS_WEIGHT_NON_POSITIVE',
          severity: 'BLOCKING',
          message: 'Gross weight must be strictly positive',
          messageAr: 'الوزن الإجمالي لا يمكن أن يكون سالباً أو صفراً',
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

    // Check Net Weight Calculation Consistency: net vs (gross - tare)
    // Non-blocking WARNING if gross, tare, and net are all present, valid numbers, gross >= tare, but net differs beyond tolerance
    if (
      typeof gross === 'number' &&
      typeof tare === 'number' &&
      typeof net === 'number' &&
      !isNaN(gross) &&
      !isNaN(tare) &&
      !isNaN(net) &&
      gross >= tare
    ) {
      const calculatedNet = Math.round((gross - tare) * 100) / 100;
      const actualNet = Math.round(net * 100) / 100;
      const difference = Math.round(Math.abs(actualNet - calculatedNet) * 100) / 100;

      if (difference > NET_WEIGHT_CALCULATION_TOLERANCE_KG) {
        issues.push({
          issueId: `WRN-NET-MISMATCH-${rowNum}`,
          row: rowNum,
          field: 'netWeight',
          code: 'NET_WEIGHT_CALCULATION_MISMATCH',
          severity: 'WARNING',
          blocking: false,
          resolvable: true,
          actualNetWeight: net,
          calculatedNetWeight: calculatedNet,
          difference,
          message: `Imported net weight (${net} kg) does not match calculated weight (gross ${gross} - tare ${tare} = ${calculatedNet} kg). Difference: ${difference} kg.`,
          messageAr: `الوزن الصافي المسجل في التذكرة (${net} كجم) يختلف عن الصافي المحسوب (القائم ${gross} - الفارغ ${tare} = ${calculatedNet} كجم) بفارق ${difference} كجم.`,
          originalValue: {
            actualNetWeight: net,
            calculatedNetWeight: calculatedNet,
            difference,
          },
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

    // 7. BLOCK 34 & BLOCK 35: Truck-Carrier Association Integrity Check (WARNING - REQUIRES_REVIEW)
    if (canonical.truckNo && canonical.carrier && context.knownEntities?.truckCarrierMap) {
      const cleanTruck = String(canonical.truckNo).trim();
      // Match case-insensitively across map keys
      const mapKey = Object.keys(context.knownEntities.truckCarrierMap).find(
        (k) => k.toLowerCase() === cleanTruck.toLowerCase()
      );
      if (mapKey) {
        const expectedCarrier = context.knownEntities.truckCarrierMap[mapKey];
        const cleanCarrier = String(canonical.carrier).trim();
        if (expectedCarrier && expectedCarrier.toLowerCase() !== cleanCarrier.toLowerCase()) {
          issues.push({
            issueId: `WRN-TRUCK-CARRIER-${rowNum}`,
            row: rowNum,
            field: 'carrier',
            code: 'RELATIONSHIP_CONFLICT',
            severity: 'WARNING',
            message: `Truck (${cleanTruck}) is assigned to carrier (${expectedCarrier}) in master records, but row lists carrier (${cleanCarrier}).`,
            messageAr: `تعارض في العلاقة: الشاحنة (${cleanTruck}) مرتبطة في السجلات بالناقل (${expectedCarrier}) بينما السجل الوارد ينسبها للناقل (${cleanCarrier}).`,
            resolvable: true,
            blocking: false,
            originalValue: {
              truckNo: cleanTruck,
              rowCarrier: cleanCarrier,
              masterCarrier: expectedCarrier,
            },
          });
        }
      }
    }

    // 8. BLOCK 35: Truck Matched but Carrier Missing Check
    if (canonical.truckNo && (!canonical.carrier || String(canonical.carrier).trim() === '')) {
      const cleanTruck = String(canonical.truckNo).trim();
      const isKnownTruck =
        (context.knownEntities?.truckPlates && context.knownEntities.truckPlates.includes(cleanTruck)) ||
        (context.knownEntities?.truckCarrierMap && Object.keys(context.knownEntities.truckCarrierMap).includes(cleanTruck)) ||
        (context.knownEntities?.trucks && context.knownEntities.trucks.some((t) => t.plate === cleanTruck));

      if (isKnownTruck) {
        issues.push({
          issueId: `WRN-TRUCK-NO-CARRIER-${rowNum}`,
          row: rowNum,
          field: 'carrier',
          code: 'TRUCK_MATCHED_CARRIER_UNKNOWN',
          severity: 'WARNING',
          message: `Truck (${cleanTruck}) recognized in master data, but carrier is missing from the row. Carrier must not be guessed automatically.`,
          messageAr: `تم التعرف على الشاحنة (${cleanTruck}) ولكن بيان الناقل مفقود من السجل الوارد. يمنع تخمين الناقل تلقائياً.`,
          resolvable: true,
          blocking: false,
          originalValue: cleanTruck,
        });
      }
    }

    // 9. BLOCK 35: Driver-Carrier Relationship Integrity Check
    if (canonical.driverName && canonical.carrier && context.knownEntities?.driverCarrierMap) {
      const cleanDriver = String(canonical.driverName).trim();
      const mapKey = Object.keys(context.knownEntities.driverCarrierMap).find(
        (k) => k.toLowerCase() === cleanDriver.toLowerCase()
      );
      if (mapKey) {
        const expectedCarrier = context.knownEntities.driverCarrierMap[mapKey];
        const cleanCarrier = String(canonical.carrier).trim();
        if (expectedCarrier && expectedCarrier.toLowerCase() !== cleanCarrier.toLowerCase()) {
          issues.push({
            issueId: `WRN-DRIVER-CARRIER-${rowNum}`,
            row: rowNum,
            field: 'carrier',
            code: 'DRIVER_CARRIER_CONFLICT',
            severity: 'WARNING',
            message: `Driver (${cleanDriver}) is associated with carrier (${expectedCarrier}), but row lists carrier (${cleanCarrier}).`,
            messageAr: `تعارض كفالة السائق: السائق (${cleanDriver}) مرتبط بالناقل (${expectedCarrier}) بينما السجل الوارد ينسبه للناقل (${cleanCarrier}).`,
            resolvable: true,
            blocking: false,
            originalValue: {
              driverName: cleanDriver,
              rowCarrier: cleanCarrier,
              masterCarrier: expectedCarrier,
            },
          });
        }
      }
    }

    // 10. BLOCK 35: Material-Project Scope Validation
    if (canonical.materialType && context.knownEntities?.projectMaterials && context.knownEntities.projectMaterials.length > 0) {
      const matStr = String(canonical.materialType).trim().toLowerCase();
      const isProjectAuth = context.knownEntities.projectMaterials.some(
        (m) => m.toLowerCase() === matStr
      );
      if (!isProjectAuth) {
        issues.push({
          issueId: `WRN-MAT-PROJ-${rowNum}`,
          row: rowNum,
          field: 'materialType',
          code: 'MATERIAL_PROJECT_CONFLICT',
          severity: 'WARNING',
          message: `Material (${canonical.materialType}) is not authorized for project (${context.projectId}).`,
          messageAr: `المادة (${canonical.materialType}) غير مصرح بها أو غير معتمدة ضمن نطاق هذا المشروع (${context.projectId}).`,
          resolvable: true,
          blocking: false,
          originalValue: canonical.materialType,
        });
      }
    }

    return issues;
  }
}
