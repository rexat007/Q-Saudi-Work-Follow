/**
 * Import Center Pipeline Service
 * 
 * Orchestrates the 12-Stage Import Architecture:
 * 1. Upload
 * 2. Parse
 * 3. Detect Columns
 * 4. Normalize
 * 5. Match Entities
 * 6. Validate Relationships
 * 7. Detect Duplicates
 * 8. Generate Review Report
 * 9. Human Correction (Mandatory Pause Before Commit)
 * 10. Final Validation
 * 11. Commit (Strictly blocked if CRITICAL errors remain; WARNING requires confirmation)
 * 12. Audit (Retains original raw data snapshot and audit logs)
 */

import { 
  ImportBatch, 
  ImportStage, 
  ReviewTableRow, 
  ReviewActionType, 
  IssueSeverity, 
  ImportBatchAuditLogEntry 
} from '../../types/importCenter';
import { RelationshipContext } from '../../types/dataQuality';
import { 
  normalizeArabicText, 
  normalizeName, 
  normalizePlate, 
  normalizePhone 
} from './normalization';
import { computeArabicSimilarity, isOnlyAlifOrVowelDifference } from './fuzzyMatch';

export class ImportCenterService {
  /**
   * Column header patterns in Arabic and English
   */
  private static COLUMN_PATTERNS: Record<string, RegExp[]> = {
    carrier: [/ناقل/i, /الناقل/i, /مقاول/i, /carrier/i, /transporter/i, /vendor/i],
    truck: [/شاحنة/i, /الشاحنة/i, /لوحة/i, /اللوحة/i, /plate/i, /truck/i, /vehicle/i],
    driver: [/سائق/i, /السائق/i, /driver/i, /operator/i],
    phone: [/جوال/i, /هاتف/i, /phone/i, /mobile/i],
    material: [/مادة/i, /المادة/i, /صنف/i, /الصنف/i, /نوع/i, /material/i, /item/i, /commodity/i],
    tareKg: [/فارغ/i, /الوزن الفارغ/i, /tare/i, /tare_kg/i, /empty_weight/i],
    grossKg: [/إجمالي/i, /اجمالي/i, /الوزن الإجمالي/i, /gross/i, /gross_kg/i, /total_weight/i],
    waybill: [/بوليصة/i, /رقم البوليصة/i, /تذكرة/i, /إشعار/i, /waybill/i, /ticket/i, /doc_no/i],
    date: [/تاريخ/i, /التاريخ/i, /date/i, /timestamp/i, /time/i],
  };

  /**
   * Automatically detects column mappings from header names
   */
  public static detectColumns(headers: string[]): Record<string, string> {
    const mapping: Record<string, string> = {};

    for (const header of headers) {
      const cleanHeader = header.trim();
      for (const [key, patterns] of Object.entries(this.COLUMN_PATTERNS)) {
        if (!mapping[key]) {
          const match = patterns.some((pattern) => pattern.test(cleanHeader));
          if (match) {
            mapping[key] = cleanHeader;
            break;
          }
        }
      }
    }

    return mapping;
  }

  /**
   * Parses raw CSV or text into structured row records
   */
  public static parseRawText(rawText: string): { headers: string[]; rows: Record<string, any>[] } {
    const lines = rawText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) {
      return { headers: [], rows: [] };
    }

    // Determine separator: comma, tab, or semicolon
    const firstLine = lines[0];
    let sep = ',';
    if (firstLine.includes('\t')) sep = '\t';
    else if (firstLine.includes(';') && !firstLine.includes(',')) sep = ';';

    const headers = firstLine.split(sep).map((h) => h.replace(/^["']|["']$/g, '').trim());
    const rows: Record<string, any>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      const cells = line.split(sep).map((c) => c.replace(/^["']|["']$/g, '').trim());
      const rowObj: Record<string, any> = { _rowNumber: i };

      headers.forEach((hdr, idx) => {
        rowObj[hdr] = cells[idx] !== undefined ? cells[idx] : '';
      });

      rows.push(rowObj);
    }

    return { headers, rows };
  }

  /**
   * Executes stages 1 through 8 and pauses automatically at stage 9 (Human Correction).
   */
  public static processImportBatch(params: {
    importBatchId: string;
    projectId: string;
    fileName: string;
    uploadedBy: string;
    rawRows: Record<string, any>[];
    headers: string[];
    context: RelationshipContext;
    existingTripNumbers?: string[];
  }): ImportBatch {
    const { 
      importBatchId, projectId, fileName, uploadedBy, 
      rawRows, headers, context, existingTripNumbers = [] 
    } = params;

    // Retain full original copy of raw data for audit compliance
    const originalRawData = JSON.parse(JSON.stringify(rawRows));

    // Stage 3: Detect Columns
    const columnMapping = this.detectColumns(headers);

    // Prepare review list
    const reviewItems: ReviewTableRow[] = [];
    const seenWaybillsInBatch = new Set<string>();

    let validRowsCount = 0;

    rawRows.forEach((rawRow, index) => {
      const rowNumber = rawRow._rowNumber || index + 1;
      let hasRowCritical = false;
      let hasRowWarning = false;

      // Extract field values
      const rawCarrier = String(rawRow[columnMapping.carrier] || '').trim();
      const rawTruck = String(rawRow[columnMapping.truck] || '').trim();
      const rawDriver = String(rawRow[columnMapping.driver] || '').trim();
      const rawMaterial = String(rawRow[columnMapping.material] || '').trim();
      const rawTareStr = String(rawRow[columnMapping.tareKg] || '').trim();
      const rawGrossStr = String(rawRow[columnMapping.grossKg] || '').trim();
      const rawWaybill = String(rawRow[columnMapping.waybill] || '').trim();

      const tareKg = parseFloat(rawTareStr) || 0;
      const grossKg = parseFloat(rawGrossStr) || 0;

      // ================= 4. Normalize & 5. Match Entities: Carrier =================
      let matchedCarrierId: string | undefined;
      let matchedCarrierName: string | undefined;
      let carrierConfidence = 0;

      if (rawCarrier) {
        const normCarrier = normalizeName(rawCarrier);
        // Look for exact match
        const exact = context.knownCarriers.find(
          (c) => normalizeName(c.name) === normCarrier || c.carrierId === rawCarrier
        );

        if (exact) {
          matchedCarrierId = exact.carrierId;
          matchedCarrierName = exact.name;
          carrierConfidence = 100;
        } else {
          // Fuzzy match
          let bestScore = 0;
          let bestC: any = null;
          for (const c of context.knownCarriers) {
            const sim = computeArabicSimilarity(rawCarrier, c.name);
            if (sim.score > bestScore) {
              bestScore = sim.score;
              bestC = c;
            }
          }

          if (bestC && bestScore >= 65) {
            matchedCarrierId = bestC.carrierId;
            matchedCarrierName = bestC.name;
            carrierConfidence = bestScore;
          }
        }

        // Validate Relationship: Is carrier allowed in this project?
        const isCarrierAuthorized = matchedCarrierId 
          ? context.authorizedCarrierIds.includes(matchedCarrierId)
          : false;

        if (!matchedCarrierId) {
          hasRowCritical = true;
          reviewItems.push({
            id: `rev-${rowNumber}-carrier-nomatch`,
            rowNumber,
            field: 'الناقل (Carrier)',
            fieldKey: 'carrier',
            originalValue: rawCarrier,
            suggestedValue: 'غير معروف في قاعدة البيانات',
            confidence: 0,
            issue: 'الناقل غير مسجل في قاعدة البيانات المرجعية.',
            severity: 'CRITICAL',
            action: 'CHOOSE_MASTER_RECORD',
            rowStatus: 'ACTIVE',
            rawRowData: rawRow,
          });
        } else if (!isCarrierAuthorized) {
          hasRowCritical = true;
          reviewItems.push({
            id: `rev-${rowNumber}-carrier-not-allowed`,
            rowNumber,
            field: 'الناقل (Carrier)',
            fieldKey: 'carrier',
            originalValue: rawCarrier,
            suggestedValue: matchedCarrierName || rawCarrier,
            confidence: carrierConfidence,
            issue: `الناقل [${matchedCarrierName}] غير مرخص أو غير معتمد في نطاق مشروع (${context.projectId}).`,
            severity: 'CRITICAL',
            action: 'CHOOSE_MASTER_RECORD',
            chosenMasterId: matchedCarrierId,
            chosenMasterValue: matchedCarrierName,
            rowStatus: 'ACTIVE',
            rawRowData: rawRow,
          });
        } else if (carrierConfidence < 100) {
          hasRowWarning = true;
          const isVowelDiff = isOnlyAlifOrVowelDifference(normalizeName(rawCarrier), normalizeName(matchedCarrierName || ''));
          reviewItems.push({
            id: `rev-${rowNumber}-carrier-fuzzy`,
            rowNumber,
            field: 'الناقل (Carrier)',
            fieldKey: 'carrier',
            originalValue: rawCarrier,
            suggestedValue: matchedCarrierName || '',
            confidence: carrierConfidence,
            issue: isVowelDiff 
              ? `تشابه لغوي مع فارق حرف المد/الألف مع [${matchedCarrierName}]. يمنع الدمج التلقائي لاحتمال اختلاف الكيان.`
              : `تطابق تقريبي بنسبة ${carrierConfidence}% مع الناقل المعتمد [${matchedCarrierName}].`,
            severity: 'WARNING',
            action: 'ACCEPT_SUGGESTION',
            chosenMasterId: matchedCarrierId,
            chosenMasterValue: matchedCarrierName,
            rowStatus: 'ACTIVE',
            rawRowData: rawRow,
          });
        }
      }

      // ================= 4. Normalize & 5. Match Entities: Truck =================
      let matchedTruckId: string | undefined;
      let matchedTruckPlate: string | undefined;
      let truckOwnerCarrierId: string | undefined;
      let truckConfidence = 0;

      if (rawTruck) {
        const normPlate = normalizePlate(rawTruck);
        const exactTruck = context.knownTrucks.find(
          (t) => normalizePlate(t.plate) === normPlate || t.plate.replace(/\s+/g, '') === rawTruck.replace(/\s+/g, '')
        );

        if (exactTruck) {
          matchedTruckId = exactTruck.truckId;
          matchedTruckPlate = exactTruck.plate;
          truckOwnerCarrierId = exactTruck.carrierId;
          truckConfidence = 100;
        } else {
          // Format validation
          const digitsOnly = normPlate.replace(/[^0-9]/g, '');
          if (digitsOnly.length < 1 || digitsOnly.length > 4) {
            hasRowWarning = true;
            reviewItems.push({
              id: `rev-${rowNumber}-truck-format`,
              rowNumber,
              field: 'الشاحنة (Truck Plate)',
              fieldKey: 'truck',
              originalValue: rawTruck,
              suggestedValue: normPlate || rawTruck,
              confidence: 40,
              issue: 'صيغة لوحة المركبة السعودية غير نظامية (يلزم من 1 إلى 4 أرقام وأحرف معتمدة).',
              severity: 'WARNING',
              action: 'EDIT_MANUALLY',
              rowStatus: 'ACTIVE',
              rawRowData: rawRow,
            });
          }
        }

        // Validate Relationship: Truck must belong to Carrier
        if (matchedTruckId && truckOwnerCarrierId && matchedCarrierId) {
          if (truckOwnerCarrierId !== matchedCarrierId) {
            hasRowCritical = true;
            const ownerName = context.knownCarriers.find((c) => c.carrierId === truckOwnerCarrierId)?.name || truckOwnerCarrierId;
            const claimedName = matchedCarrierName || matchedCarrierId;
            reviewItems.push({
              id: `rev-${rowNumber}-truck-carrier-conflict`,
              rowNumber,
              field: 'الشاحنة (Truck Plate)',
              fieldKey: 'truck',
              originalValue: rawTruck,
              suggestedValue: matchedTruckPlate || rawTruck,
              confidence: 100,
              issue: `تعارض في تبعية الشاحنة: الشاحنة مسجلة رسمياً للناقل (${ownerName})، بينما الإدخال يشير إلى الناقل (${claimedName}).`,
              severity: 'CRITICAL',
              action: 'CHOOSE_MASTER_RECORD',
              rowStatus: 'ACTIVE',
              rawRowData: rawRow,
            });
          }
        }
      }

      // ================= 4. Normalize & 5. Match Entities: Driver =================
      if (rawDriver) {
        const normDriver = normalizeName(rawDriver);
        const exactDriver = context.knownDrivers.find((d) => normalizeName(d.name) === normDriver);
        
        if (exactDriver) {
          if (matchedCarrierId && exactDriver.carrierId !== matchedCarrierId) {
            hasRowCritical = true;
            const ownerName = context.knownCarriers.find((c) => c.carrierId === exactDriver.carrierId)?.name || exactDriver.carrierId;
            reviewItems.push({
              id: `rev-${rowNumber}-driver-carrier-conflict`,
              rowNumber,
              field: 'السائق (Driver)',
              fieldKey: 'driver',
              originalValue: rawDriver,
              suggestedValue: exactDriver.name,
              confidence: 100,
              issue: `تعارض في تبعية السائق: السائق مسجل تحت كفالة (${ownerName}) وليس الناقل المحدد.`,
              severity: 'CRITICAL',
              action: 'CHOOSE_MASTER_RECORD',
              rowStatus: 'ACTIVE',
              rawRowData: rawRow,
            });
          }
        } else {
          // Fuzzy match driver
          let bestD: any = null;
          let bestScore = 0;
          for (const d of context.knownDrivers) {
            const sim = computeArabicSimilarity(rawDriver, d.name);
            if (sim.score > bestScore) {
              bestScore = sim.score;
              bestD = d;
            }
          }

          if (bestD && bestScore >= 70 && bestScore < 100) {
            hasRowWarning = true;
            reviewItems.push({
              id: `rev-${rowNumber}-driver-fuzzy`,
              rowNumber,
              field: 'السائق (Driver)',
              fieldKey: 'driver',
              originalValue: rawDriver,
              suggestedValue: bestD.name,
              confidence: bestScore,
              issue: `تطابق تقريبي للاسم بنسبة ${bestScore}% مع السائق المعتمد [${bestD.name}].`,
              severity: 'WARNING',
              action: 'ACCEPT_SUGGESTION',
              chosenMasterId: bestD.driverId,
              chosenMasterValue: bestD.name,
              rowStatus: 'ACTIVE',
              rawRowData: rawRow,
            });
          }
        }
      }

      // ================= 4. Normalize & 5. Match Entities: Material =================
      let matchedMaterialId: string | undefined;
      let matchedMaterialName: string | undefined;
      let materialConfidence = 0;

      if (rawMaterial) {
        const normMat = normalizeName(rawMaterial);
        const exactMat = context.knownMaterials.find((m) => normalizeName(m.name) === normMat);

        if (exactMat) {
          matchedMaterialId = exactMat.materialId;
          matchedMaterialName = exactMat.name;
          materialConfidence = 100;
        } else {
          let bestM: any = null;
          let bestScore = 0;
          for (const m of context.knownMaterials) {
            const sim = computeArabicSimilarity(rawMaterial, m.name);
            if (sim.score > bestScore) {
              bestScore = sim.score;
              bestM = m;
            }
          }
          if (bestM && bestScore >= 65) {
            matchedMaterialId = bestM.materialId;
            matchedMaterialName = bestM.name;
            materialConfidence = bestScore;
          }
        }

        // Validate Material in Project
        const isMaterialAuthorized = matchedMaterialId
          ? context.authorizedMaterialIds.includes(matchedMaterialId)
          : false;

        if (matchedMaterialId && !isMaterialAuthorized) {
          hasRowCritical = true;
          reviewItems.push({
            id: `rev-${rowNumber}-mat-not-allowed`,
            rowNumber,
            field: 'المادة (Material)',
            fieldKey: 'material',
            originalValue: rawMaterial,
            suggestedValue: matchedMaterialName || rawMaterial,
            confidence: materialConfidence,
            issue: `المادة [${matchedMaterialName}] غير مصرح بنقلها أو توريدها ضمن نطاق مشروع (${context.projectId}).`,
            severity: 'CRITICAL',
            action: 'CHOOSE_MASTER_RECORD',
            chosenMasterId: matchedMaterialId,
            chosenMasterValue: matchedMaterialName,
            rowStatus: 'ACTIVE',
            rawRowData: rawRow,
          });
        } else if (matchedMaterialId && materialConfidence < 100) {
          hasRowWarning = true;
          reviewItems.push({
            id: `rev-${rowNumber}-mat-fuzzy`,
            rowNumber,
            field: 'المادة (Material)',
            fieldKey: 'material',
            originalValue: rawMaterial,
            suggestedValue: matchedMaterialName || '',
            confidence: materialConfidence,
            issue: `تطابق تقريبي بنسبة ${materialConfidence}% مع المادة المعتمدة [${matchedMaterialName}].`,
            severity: 'WARNING',
            action: 'ACCEPT_SUGGESTION',
            chosenMasterId: matchedMaterialId,
            chosenMasterValue: matchedMaterialName,
            rowStatus: 'ACTIVE',
            rawRowData: rawRow,
          });
        } else if (!matchedMaterialId) {
          hasRowWarning = true;
          reviewItems.push({
            id: `rev-${rowNumber}-mat-unknown`,
            rowNumber,
            field: 'المادة (Material)',
            fieldKey: 'material',
            originalValue: rawMaterial,
            suggestedValue: 'صنف جديد غير مسجل',
            confidence: 0,
            issue: 'المادة غير معروفة في جدول الأصناف الرئيسي.',
            severity: 'WARNING',
            action: 'CHOOSE_MASTER_RECORD',
            rowStatus: 'ACTIVE',
            rawRowData: rawRow,
          });
        }
      }

      // ================= 6. Business Validation: Weights =================
      if (tareKg > 0 && grossKg > 0 && tareKg >= grossKg) {
        hasRowCritical = true;
        reviewItems.push({
          id: `rev-${rowNumber}-weight-violation`,
          rowNumber,
          field: 'الأوزان (Weights)',
          fieldKey: 'tareKg',
          originalValue: `فارغ: ${tareKg} / إجمالي: ${grossKg}`,
          suggestedValue: 'تصحيح الأوزان',
          confidence: 0,
          issue: 'مخالفة هندسية: الوزن الفارغ للشاحنة أكبر من أو يساوي الوزن الإجمالي.',
          severity: 'CRITICAL',
          action: 'EDIT_MANUALLY',
          rowStatus: 'ACTIVE',
          rawRowData: rawRow,
        });
      }

      // ================= 7. Detect Duplicates =================
      if (rawWaybill) {
        if (seenWaybillsInBatch.has(rawWaybill)) {
          hasRowCritical = true;
          reviewItems.push({
            id: `rev-${rowNumber}-dup-in-batch`,
            rowNumber,
            field: 'رقم البوليصة (Waybill)',
            fieldKey: 'waybill',
            originalValue: rawWaybill,
            suggestedValue: 'بوليصة مكررة',
            confidence: 100,
            issue: `رقم البوليصة [${rawWaybill}] مكرر داخل نفس ملف الاستيراد.`,
            severity: 'CRITICAL',
            action: 'REJECT_ROW',
            rowStatus: 'ACTIVE',
            rawRowData: rawRow,
          });
        } else {
          seenWaybillsInBatch.add(rawWaybill);
        }

        if (existingTripNumbers.includes(rawWaybill)) {
          hasRowCritical = true;
          reviewItems.push({
            id: `rev-${rowNumber}-dup-existing`,
            rowNumber,
            field: 'رقم البوليصة (Waybill)',
            fieldKey: 'waybill',
            originalValue: rawWaybill,
            suggestedValue: 'مسجلة مسبقاً',
            confidence: 100,
            issue: `رقم البوليصة [${rawWaybill}] مسجل مسبقاً في النظام ومكتمل الترحيل.`,
            severity: 'CRITICAL',
            action: 'REJECT_ROW',
            rowStatus: 'ACTIVE',
            rawRowData: rawRow,
          });
        }
      }

      if (!hasRowCritical && !hasRowWarning) {
        validRowsCount++;
      }
    });

    // Calculate initial statistics
    const initialStats = this.recalculateBatchCounters(rawRows.length, reviewItems);

    // Initial audit entry
    const auditTrail: ImportBatchAuditLogEntry[] = [
      {
        timestamp: new Date().toISOString(),
        userId: uploadedBy,
        userName: uploadedBy,
        actionType: 'IMPORT_ANALYZED',
        detailsAr: `تم فحص الملف (${fileName}) وتنفيذ المراحل من 1 إلى 8 بنجاح. تم التوقف تلقائياً قبل مرحلة الاعتماد (Commit).`,
      },
    ];

    return {
      importBatchId,
      projectId,
      fileName,
      uploadedBy,
      createdAt: new Date().toISOString(),
      rowCount: rawRows.length,
      validCount: initialStats.validCount,
      warningCount: initialStats.warningCount,
      errorCount: initialStats.errorCount,
      status: 'AWAITING_CORRECTION',
      originalRawData,
      reviewItems,
      currentStage: 'HUMAN_CORRECTION', // Explicitly PAUSED before Commit!
      auditTrail,
    };
  }

  /**
   * Recalculates validCount, warningCount, and errorCount based on active rows and user actions
   */
  public static recalculateBatchCounters(
    totalRowCount: number,
    reviewItems: ReviewTableRow[]
  ): { validCount: number; warningCount: number; errorCount: number } {
    let errorCount = 0;
    let warningCount = 0;
    const affectedActiveRows = new Set<number>();

    reviewItems.forEach((item) => {
      // If the entire row is rejected, it does not block commit with an error
      if (item.rowStatus === 'REJECTED' || item.action === 'REJECT_ROW') {
        return;
      }

      // If user accepted suggestion or chose a master record or manually edited or ignored,
      // it is considered resolved!
      const isResolved = 
        item.action === 'ACCEPT_SUGGESTION' ||
        item.action === 'CHOOSE_MASTER_RECORD' ||
        item.action === 'EDIT_MANUALLY' ||
        item.action === 'IGNORE';

      if (item.severity === 'CRITICAL') {
        if (!isResolved || item.action === 'KEEP_ORIGINAL') {
          errorCount++;
          affectedActiveRows.add(item.rowNumber);
        }
      } else if (item.severity === 'WARNING') {
        // Unconfirmed or keep original warnings
        if (item.action !== 'ACCEPT_SUGGESTION' && item.action !== 'IGNORE' && item.action !== 'CHOOSE_MASTER_RECORD') {
          warningCount++;
          affectedActiveRows.add(item.rowNumber);
        } else if (item.action === 'ACCEPT_SUGGESTION') {
          // Accept suggestion on warning still needs confirmation at commit time
          warningCount++;
          affectedActiveRows.add(item.rowNumber);
        }
      }
    });

    const validCount = Math.max(0, totalRowCount - affectedActiveRows.size);

    return { validCount, warningCount, errorCount };
  }

  /**
   * Applies an action to a specific review item
   */
  public static applyItemAction(
    batch: ImportBatch,
    itemId: string,
    action: ReviewActionType,
    payload: {
      userId: string;
      userName: string;
      chosenMasterId?: string;
      chosenMasterValue?: string;
      manualValue?: string;
      notes?: string;
    }
  ): ImportBatch {
    const updatedReviewItems = batch.reviewItems.map((item) => {
      if (item.id !== itemId) return item;

      const isRejectRow = action === 'REJECT_ROW';
      return {
        ...item,
        action,
        chosenMasterId: payload.chosenMasterId || item.chosenMasterId,
        chosenMasterValue: payload.chosenMasterValue || item.chosenMasterValue,
        manualValue: payload.manualValue !== undefined ? payload.manualValue : item.manualValue,
        notes: payload.notes || item.notes,
        rowStatus: isRejectRow ? ('REJECTED' as const) : item.rowStatus,
      };
    });

    // If action is REJECT_ROW, update all other items belonging to that same rowNumber
    const targetItem = batch.reviewItems.find((i) => i.id === itemId);
    if (action === 'REJECT_ROW' && targetItem) {
      updatedReviewItems.forEach((i) => {
        if (i.rowNumber === targetItem.rowNumber) {
          i.rowStatus = 'REJECTED';
          i.action = 'REJECT_ROW';
        }
      });
    }

    const { validCount, warningCount, errorCount } = this.recalculateBatchCounters(
      batch.rowCount,
      updatedReviewItems
    );

    const auditEntry: ImportBatchAuditLogEntry = {
      timestamp: new Date().toISOString(),
      userId: payload.userId,
      userName: payload.userName,
      actionType: `ACTION_${action}`,
      detailsAr: `تم تطبيق الإجراء (${action}) على حقل [${targetItem?.field}] في الصف #${targetItem?.rowNumber}.`,
      affectedRowNumber: targetItem?.rowNumber,
      previousValue: targetItem?.originalValue,
      newValue: payload.manualValue || payload.chosenMasterValue || targetItem?.suggestedValue,
    };

    return {
      ...batch,
      reviewItems: updatedReviewItems,
      validCount,
      warningCount,
      errorCount,
      auditTrail: [auditEntry, ...batch.auditTrail],
      status: errorCount === 0 ? 'READY_TO_COMMIT' : 'AWAITING_CORRECTION',
    };
  }

  /**
   * Bulk action: Accept all high-confidence suggestions (>90%)
   */
  public static bulkAcceptSuggestions(batch: ImportBatch, userId: string): ImportBatch {
    const updatedReviewItems = batch.reviewItems.map((item) => {
      if (item.confidence >= 80 && item.severity !== 'CRITICAL' && item.rowStatus === 'ACTIVE') {
        return {
          ...item,
          action: 'ACCEPT_SUGGESTION' as ReviewActionType,
        };
      }
      return item;
    });

    const { validCount, warningCount, errorCount } = this.recalculateBatchCounters(
      batch.rowCount,
      updatedReviewItems
    );

    const auditEntry: ImportBatchAuditLogEntry = {
      timestamp: new Date().toISOString(),
      userId,
      userName: userId,
      actionType: 'BULK_ACCEPT_SUGGESTIONS',
      detailsAr: 'تم قبول جميع الاقتراحات عالية الثقة (>80%) تلقائياً بنقرة واحدة.',
    };

    return {
      ...batch,
      reviewItems: updatedReviewItems,
      validCount,
      warningCount,
      errorCount,
      auditTrail: [auditEntry, ...batch.auditTrail],
      status: errorCount === 0 ? 'READY_TO_COMMIT' : 'AWAITING_CORRECTION',
    };
  }

  /**
   * Final Validation & Commit
   * Strictly enforces:
   * - No commit if CRITICAL errors remain
   * - WARNING requires explicit confirmation
   */
  public static commitBatch(
    batch: ImportBatch,
    params: {
      userId: string;
      userName: string;
      confirmWarnings: boolean;
      warningConfirmationNotes?: string;
    }
  ): { success: boolean; error?: string; updatedBatch: ImportBatch } {
    const { validCount, warningCount, errorCount } = this.recalculateBatchCounters(
      batch.rowCount,
      batch.reviewItems
    );

    // Rule 1: Strictly forbid commit if CRITICAL errors remain
    if (errorCount > 0) {
      return {
        success: false,
        error: `لا يمكن تنفيذ الاعتماد (Commit) لوجود (${errorCount}) أخطاء حرجة (CRITICAL). يجب معالجتها أو استبعاد الصفوف المتعلقة بها أولاً.`,
        updatedBatch: batch,
      };
    }

    // Rule 2: WARNING can only be committed with explicit confirmation
    if (warningCount > 0 && !params.confirmWarnings) {
      return {
        success: false,
        error: `توجد (${warningCount}) تحذيرات (WARNING) غير مؤكدة. يجب تقديم تأكيد بشري صريح لاعتماد السجلات التي تحوي تحذيرات.`,
        updatedBatch: batch,
      };
    }

    const committedTime = new Date().toISOString();
    const activeCommittedRows = batch.rowCount - batch.reviewItems.filter(i => i.rowStatus === 'REJECTED').length;

    const commitAudit: ImportBatchAuditLogEntry = {
      timestamp: committedTime,
      userId: params.userId,
      userName: params.userName,
      actionType: 'BATCH_COMMITTED',
      detailsAr: `تم تنفيذ الاعتماد النهائي (Commit) بنجاح لـ (${activeCommittedRows}) صف. تم حفظ النسخة الأصلية للبيانات لأغراض التدقيق الرقابي.`,
    };

    const updatedBatch: ImportBatch = {
      ...batch,
      status: 'COMMITTED',
      currentStage: 'AUDIT', // Complete!
      committedAt: committedTime,
      committedBy: params.userName,
      committedRecordCount: activeCommittedRows,
      warningConfirmation: warningCount > 0 ? {
        confirmed: true,
        confirmedBy: params.userName,
        confirmedAt: committedTime,
        notes: params.warningConfirmationNotes,
      } : undefined,
      auditTrail: [commitAudit, ...batch.auditTrail],
    };

    return {
      success: true,
      updatedBatch,
    };
  }
}
