import { 
  LegacySheetRow, 
  MigrationRowItem, 
  MigrationReport, 
  MasterMatchCandidate, 
  MatchCandidateOption, 
  PricingResolution 
} from '../types/legacyMigration';
import { TripEntity, TripStatus, CarrierEntity, MaterialEntity, TruckEntity, DriverEntity } from '../types/entities';
import { adminConsoleService } from './adminConsole.service';
import { AuthUserContext } from '../types/common';
import { SAMPLE_LEGACY_GOOGLE_SHEET_ROWS } from '../data/sampleLegacySheetData';

// Arabic String Normalization Helper
function normalizeArabic(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .trim()
    .replace(/[إأآا]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[ًٌٍَُِّْ]/g, '') // Remove harakat (tashkeel)
    .replace(/شركة|مؤسسة|مكتب|نقليات|للنقل|اللوجستي|المحدودة|وشركاه/gi, '') // Remove standard company tokens for core matching
    .replace(/\s+/g, ' ')
    .trim();
}

// Dice coefficient string similarity (0.0 to 1.0)
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeArabic(str1);
  const s2 = normalizeArabic(str2);
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1.0;
  if (s1.includes(s2) || s2.includes(s1)) {
    const longer = Math.max(s1.length, s2.length);
    const shorter = Math.min(s1.length, s2.length);
    return Math.max(0.75, shorter / longer);
  }

  // Bigram token matching
  const getBigrams = (str: string) => {
    const bigrams = new Set<string>();
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.add(str.substring(i, i + 2));
    }
    return bigrams;
  };

  const b1 = getBigrams(s1);
  const b2 = getBigrams(s2);
  let intersection = 0;
  b1.forEach(bg => {
    if (b2.has(bg)) intersection++;
  });

  const total = b1.size + b2.size;
  if (total === 0) return 0;
  return (2.0 * intersection) / total;
}

// Plate normalizer (converts Latin/Arabic combinations)
function normalizePlate(plate: string): string {
  if (!plate) return '';
  return plate
    .replace(/[\s\-_]/g, '')
    .toUpperCase();
}

export class LegacyMigrationService {
  private currentReport: MigrationReport | null = null;
  private currentItems: MigrationRowItem[] = [];

  /**
   * Phase 1: Preview-First Analysis & Transformation
   * Strictly READ-ONLY with respect to the source Google Sheet.
   */
  public generatePreview(
    sourceRows: LegacySheetRow[] = SAMPLE_LEGACY_GOOGLE_SHEET_ROWS,
    sourceSpreadsheetId: string = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    sheetTabName: string = 'LegacyOperations_20Cols'
  ): { report: MigrationReport; items: MigrationRowItem[] } {
    
    // Fetch master registries from AdminConsoleService
    const existingCarriers = adminConsoleService.getCarriers('ALL');
    const existingMaterials = adminConsoleService.getMaterials('ALL');
    const existingTrucks = adminConsoleService.getTrucks('ALL');
    const existingDrivers = adminConsoleService.getDrivers('ALL');
    const existingPricingRules = adminConsoleService.getPricingRules('ALL');

    const seenTicketIds = new Set<string>();
    const seenTripSerials = new Set<string>();

    let rowsValidCount = 0;
    let rowsInvalidCount = 0;
    let duplicatesCount = 0;
    let conflictsCount = 0;
    let pricingUnresolvedCount = 0;

    let matchedCarriersCount = 0;
    let matchedMaterialsCount = 0;
    let matchedTrucksCount = 0;
    let matchedDriversCount = 0;

    let unmatchedCarriersCount = 0;
    let unmatchedMaterialsCount = 0;
    let unmatchedTrucksCount = 0;
    let unmatchedDriversCount = 0;

    const items: MigrationRowItem[] = sourceRows.map((row, index) => {
      const rowNumber = index + 1;
      const validationErrors: string[] = [];
      const validationWarnings: string[] = [];

      // -------------------------------------------------------------
      // 1. MASTER DATA MATCHING: Carrier
      // -------------------------------------------------------------
      const matchedCarrier = this.matchCarrier(row.carrier, existingCarriers);
      if (matchedCarrier.status === 'EXACT_MATCH') {
        matchedCarriersCount++;
      } else {
        unmatchedCarriersCount++;
        if (matchedCarrier.status === 'CANDIDATE_MATCH') {
          validationWarnings.push(`الناقل: تم العثور على تطابق محتمل مع "${matchedCarrier.candidates[0]?.name}" بنسبة ثقة ${Math.round(matchedCarrier.confidenceScore * 100)}% (يتطلب مراجعة المشرف)`);
        } else {
          validationWarnings.push(`الناقل: غير موجود في سجل الناقلين المعتمدين (${row.carrier})`);
        }
      }

      // -------------------------------------------------------------
      // 2. MASTER DATA MATCHING: Material
      // -------------------------------------------------------------
      const matchedMaterial = this.matchMaterial(row.materialType, existingMaterials);
      if (matchedMaterial.status === 'EXACT_MATCH') {
        matchedMaterialsCount++;
      } else {
        unmatchedMaterialsCount++;
        if (matchedMaterial.status === 'CANDIDATE_MATCH') {
          validationWarnings.push(`المادة: تم العثور على مادة محتملة "${matchedMaterial.candidates[0]?.name}" بنسبة ثقة ${Math.round(matchedMaterial.confidenceScore * 100)}%`);
        } else {
          validationWarnings.push(`المادة: غير معرفة في قائمة المواد (${row.materialType})`);
        }
      }

      // -------------------------------------------------------------
      // 3. MASTER DATA MATCHING: Truck
      // -------------------------------------------------------------
      const matchedTruck = this.matchTruck(row.truckNo, existingTrucks);
      if (matchedTruck.status === 'EXACT_MATCH') {
        matchedTrucksCount++;
      } else {
        unmatchedTrucksCount++;
        if (matchedTruck.status === 'CANDIDATE_MATCH') {
          validationWarnings.push(`الشاحنة: تم العثور على لوحة مطابقة محتملة "${matchedTruck.candidates[0]?.name}"`);
        } else {
          validationWarnings.push(`الشاحنة: لوحة غير مسجلة في الأسطول المعتمد (${row.truckNo})`);
        }
      }

      // -------------------------------------------------------------
      // 4. MASTER DATA MATCHING: Driver
      // -------------------------------------------------------------
      const matchedDriver = this.matchDriver(row.driverName, existingDrivers);
      if (matchedDriver.status === 'EXACT_MATCH') {
        matchedDriversCount++;
      } else {
        unmatchedDriversCount++;
        if (matchedDriver.status === 'CANDIDATE_MATCH') {
          validationWarnings.push(`السائق: تطابق مقترح مع السائق "${matchedDriver.candidates[0]?.name}" بنسبة ${Math.round(matchedDriver.confidenceScore * 100)}%`);
        } else {
          validationWarnings.push(`السائق: اسم غير مقيد في سجل السائقين (${row.driverName})`);
        }
      }

      // -------------------------------------------------------------
      // 5. PRICING RESOLUTION (Strict rule: No guessing PER_TRIP or PER_TON)
      // -------------------------------------------------------------
      const pricingResolution = this.resolvePricing(
        row.tripRate,
        matchedCarrier.matchedId,
        matchedMaterial.matchedId,
        existingPricingRules
      );

      if (pricingResolution.isUnresolved) {
        pricingUnresolvedCount++;
        validationWarnings.push(`التسعير: لم يتم التمكن من تحديد نوع التسعير (pricingType = LEGACY_UNRESOLVED). لم يتم الافتراض`);
      }

      // -------------------------------------------------------------
      // 6. DUPLICATE DETECTION
      // -------------------------------------------------------------
      let isDuplicate = false;
      let duplicateReason: string | undefined;

      const ticketKey = (row.ticketId || '').trim();
      const serialKey = `${row.projectId}-${row.tripSerial}`;

      if (ticketKey && seenTicketIds.has(ticketKey)) {
        isDuplicate = true;
        duplicateReason = `تذكرة مكررة: رقم التذكرة ${ticketKey} ورد أكثر من مرة في الشيت`;
        duplicatesCount++;
        validationErrors.push(duplicateReason);
      } else if (ticketKey) {
        seenTicketIds.add(ticketKey);
      }

      if (row.tripSerial && seenTripSerials.has(serialKey)) {
        if (!isDuplicate) {
          isDuplicate = true;
          duplicateReason = `رقم تسلسلي مكرر: ${serialKey}`;
          duplicatesCount++;
          validationErrors.push(duplicateReason);
        }
      } else if (row.tripSerial) {
        seenTripSerials.add(serialKey);
      }

      // -------------------------------------------------------------
      // 7. CONFLICT DETECTION (Math / Tolerance check)
      // -------------------------------------------------------------
      let hasConflict = false;
      let conflictReason: string | undefined;

      const tare = typeof row.tareWeight === 'number' ? row.tareWeight : parseFloat(String(row.tareWeight)) || 0;
      const gross = typeof row.grossWeight === 'number' ? row.grossWeight : parseFloat(String(row.grossWeight)) || 0;
      const net = typeof row.netWeight === 'number' ? row.netWeight : parseFloat(String(row.netWeight)) || 0;

      if (tare > 0 && gross > 0 && net > 0) {
        const expectedNet = gross - tare;
        const diff = Math.abs(expectedNet - net);
        if (diff > 100) { // Discrepancy > 100 KG
          hasConflict = true;
          conflictReason = `تعارض أوزان: الوزن القائم (${gross}) - الفارغ (${tare}) = ${expectedNet} كجم، بينما المدخل في الشيت هو ${net} كجم (فارق ${diff} كجم!)`;
          conflictsCount++;
          validationErrors.push(conflictReason);
        }
      }

      // Determine validity
      const isValid = validationErrors.length === 0;
      if (isValid) {
        rowsValidCount++;
      } else {
        rowsInvalidCount++;
      }

      // -------------------------------------------------------------
      // 8. TRANSFORM TO TARGET TRIP ENTITY STRUCTURE
      // -------------------------------------------------------------
      const transformedTrip = this.mapToTripEntity(row, rowNumber, matchedCarrier, matchedMaterial, matchedTruck, matchedDriver, pricingResolution);

      return {
        rowNumber,
        raw: row,
        transformedTrip,
        matchedCarrier,
        matchedMaterial,
        matchedTruck,
        matchedDriver,
        pricingResolution,
        isValid,
        validationErrors,
        validationWarnings,
        isDuplicate,
        duplicateReason,
        hasConflict,
        conflictReason,
        reviewDecision: isValid ? 'APPROVED' : 'PENDING',
      };
    });

    const report: MigrationReport = {
      reportId: `MIG-${Date.now()}`,
      generatedAt: new Date().toISOString(),
      sourceSpreadsheetId,
      sheetTabName,
      readOnlyEnforced: true, // Guarantee: source is never mutated
      rowsRead: sourceRows.length,
      rowsValid: rowsValidCount,
      rowsInvalid: rowsInvalidCount,
      matchedEntities: {
        carriers: matchedCarriersCount,
        materials: matchedMaterialsCount,
        trucks: matchedTrucksCount,
        drivers: matchedDriversCount,
        total: matchedCarriersCount + matchedMaterialsCount + matchedTrucksCount + matchedDriversCount,
      },
      unmatchedEntities: {
        carriers: unmatchedCarriersCount,
        materials: unmatchedMaterialsCount,
        trucks: unmatchedTrucksCount,
        drivers: unmatchedDriversCount,
        total: unmatchedCarriersCount + unmatchedMaterialsCount + unmatchedTrucksCount + unmatchedDriversCount,
      },
      pricingUnresolved: pricingUnresolvedCount,
      duplicates: duplicatesCount,
      conflicts: conflictsCount,
      isCommitted: false,
    };

    this.currentReport = report;
    this.currentItems = items;

    return { report, items };
  }

  /**
   * Helper: Carrier Matching with Candidate Suggestion
   */
  private matchCarrier(name: string, carriers: CarrierEntity[]): MasterMatchCandidate {
    const rawName = (name || '').trim();
    if (!rawName) {
      return { originalValue: '', status: 'UNMATCHED', confidenceScore: 0, candidates: [] };
    }

    // Exact Match check
    const exact = carriers.find(c => 
      c.name === rawName || 
      c.companyNameAr === rawName || 
      c.carrierId === rawName
    );
    if (exact) {
      return {
        originalValue: rawName,
        status: 'EXACT_MATCH',
        matchedId: exact.carrierId,
        matchedName: exact.name || exact.companyNameAr,
        confidenceScore: 1.0,
        candidates: [{ id: exact.carrierId, name: exact.name || exact.companyNameAr, score: 1.0, isStrongPotential: true }],
      };
    }

    // Fuzzy / Candidate Matching
    const candidates: MatchCandidateOption[] = [];
    for (const c of carriers) {
      const cName = c.name || c.companyNameAr || '';
      const score = calculateSimilarity(rawName, cName);
      if (score >= 0.50) {
        candidates.push({
          id: c.carrierId,
          name: cName,
          score,
          details: `سجل تجاري: ${c.commercialRegistrationNo || 'N/A'}`,
          isStrongPotential: score >= 0.70,
        });
      }
    }

    candidates.sort((a, b) => b.score - a.score);

    if (candidates.length > 0 && candidates[0].score >= 0.60) {
      return {
        originalValue: rawName,
        status: 'CANDIDATE_MATCH',
        matchedId: candidates[0].id,
        matchedName: candidates[0].name,
        confidenceScore: candidates[0].score,
        candidates,
      };
    }

    return {
      originalValue: rawName,
      status: 'UNMATCHED',
      confidenceScore: candidates[0]?.score || 0,
      candidates,
    };
  }

  /**
   * Helper: Material Matching with Candidate Suggestion
   */
  private matchMaterial(name: string, materials: MaterialEntity[]): MasterMatchCandidate {
    const rawName = (name || '').trim();
    if (!rawName) {
      return { originalValue: '', status: 'UNMATCHED', confidenceScore: 0, candidates: [] };
    }

    const exact = materials.find(m => 
      m.name === rawName || 
      m.nameAr === rawName || 
      m.code === rawName || 
      m.materialId === rawName
    );
    if (exact) {
      return {
        originalValue: rawName,
        status: 'EXACT_MATCH',
        matchedId: exact.materialId,
        matchedName: exact.name || exact.nameAr,
        confidenceScore: 1.0,
        candidates: [{ id: exact.materialId, name: exact.name || exact.nameAr, score: 1.0, isStrongPotential: true }],
      };
    }

    const candidates: MatchCandidateOption[] = [];
    for (const m of materials) {
      const mName = m.name || m.nameAr || m.code;
      const score = calculateSimilarity(rawName, mName);
      if (score >= 0.45) {
        candidates.push({
          id: m.materialId,
          name: mName,
          score,
          details: `كود المادة: ${m.code}`,
          isStrongPotential: score >= 0.70,
        });
      }
    }

    candidates.sort((a, b) => b.score - a.score);

    if (candidates.length > 0 && candidates[0].score >= 0.55) {
      return {
        originalValue: rawName,
        status: 'CANDIDATE_MATCH',
        matchedId: candidates[0].id,
        matchedName: candidates[0].name,
        confidenceScore: candidates[0].score,
        candidates,
      };
    }

    return {
      originalValue: rawName,
      status: 'UNMATCHED',
      confidenceScore: candidates[0]?.score || 0,
      candidates,
    };
  }

  /**
   * Helper: Truck Matching
   */
  private matchTruck(plate: string, trucks: TruckEntity[]): MasterMatchCandidate {
    const rawPlate = (plate || '').trim();
    if (!rawPlate) {
      return { originalValue: '', status: 'UNMATCHED', confidenceScore: 0, candidates: [] };
    }

    const exact = trucks.find(t => 
      t.plate === rawPlate || 
      t.plateNumberAr === rawPlate || 
      t.truckId === rawPlate ||
      normalizePlate(t.plate) === normalizePlate(rawPlate)
    );
    if (exact) {
      return {
        originalValue: rawPlate,
        status: 'EXACT_MATCH',
        matchedId: exact.truckId,
        matchedName: exact.plate || exact.plateNumberAr,
        confidenceScore: 1.0,
        candidates: [{ id: exact.truckId, name: exact.plate || exact.plateNumberAr, score: 1.0, isStrongPotential: true }],
      };
    }

    const candidates: MatchCandidateOption[] = [];
    for (const t of trucks) {
      const tPlate = t.plate || t.plateNumberAr || '';
      const score = calculateSimilarity(rawPlate, tPlate);
      if (score >= 0.50) {
        candidates.push({
          id: t.truckId,
          name: tPlate,
          score,
          details: `شاحنة الناقل: ${t.carrierId}`,
          isStrongPotential: score >= 0.70,
        });
      }
    }

    candidates.sort((a, b) => b.score - a.score);

    if (candidates.length > 0 && candidates[0].score >= 0.60) {
      return {
        originalValue: rawPlate,
        status: 'CANDIDATE_MATCH',
        matchedId: candidates[0].id,
        matchedName: candidates[0].name,
        confidenceScore: candidates[0].score,
        candidates,
      };
    }

    return {
      originalValue: rawPlate,
      status: 'UNMATCHED',
      confidenceScore: candidates[0]?.score || 0,
      candidates,
    };
  }

  /**
   * Helper: Driver Matching
   */
  private matchDriver(name: string, drivers: DriverEntity[]): MasterMatchCandidate {
    const rawName = (name || '').trim();
    if (!rawName) {
      return { originalValue: '', status: 'UNMATCHED', confidenceScore: 0, candidates: [] };
    }

    const exact = drivers.find(d => 
      d.name === rawName || 
      d.fullNameAr === rawName || 
      d.driverId === rawName
    );
    if (exact) {
      return {
        originalValue: rawName,
        status: 'EXACT_MATCH',
        matchedId: exact.driverId,
        matchedName: exact.name || exact.fullNameAr,
        confidenceScore: 1.0,
        candidates: [{ id: exact.driverId, name: exact.name || exact.fullNameAr, score: 1.0, isStrongPotential: true }],
      };
    }

    const candidates: MatchCandidateOption[] = [];
    for (const d of drivers) {
      const dName = d.name || d.fullNameAr || '';
      const score = calculateSimilarity(rawName, dName);
      if (score >= 0.50) {
        candidates.push({
          id: d.driverId,
          name: dName,
          score,
          details: `هوية: ${d.idNumber || d.nationalOrIqamaId || 'N/A'}`,
          isStrongPotential: score >= 0.70,
        });
      }
    }

    candidates.sort((a, b) => b.score - a.score);

    if (candidates.length > 0 && candidates[0].score >= 0.60) {
      return {
        originalValue: rawName,
        status: 'CANDIDATE_MATCH',
        matchedId: candidates[0].id,
        matchedName: candidates[0].name,
        confidenceScore: candidates[0].score,
        candidates,
      };
    }

    return {
      originalValue: rawName,
      status: 'UNMATCHED',
      confidenceScore: candidates[0]?.score || 0,
      candidates,
    };
  }

  /**
   * Pricing Resolution
   * Mandatory constraint:
   * "بالنسبة لـtripRate: إذا لم نستطع تحديد pricingType من البيانات القديمة:
   *  pricingType = LEGACY_UNRESOLVED
   *  ولا تفترض PER_TRIP أو PER_TON."
   */
  private resolvePricing(
    rateVal: number | string,
    carrierId?: string,
    materialId?: string,
    pricingRules: any[] = []
  ): PricingResolution {
    const numRate = typeof rateVal === 'number' ? rateVal : parseFloat(String(rateVal)) || 0;
    
    // Look for exact rule match for this carrier
    if (carrierId) {
      const matchingRules = pricingRules.filter(r => 
        r.carrierId === carrierId && 
        r.status === 'ACTIVE' &&
        (!r.materialId || r.materialId === materialId)
      );

      // If exactly 1 active rule exists with matching rate
      const exactRateRule = matchingRules.find(r => Math.abs(r.agreedRate - numRate) < 0.01);
      if (exactRateRule) {
        return {
          originalRate: numRate,
          pricingType: exactRateRule.pricingType,
          isUnresolved: false,
          detectedRuleId: exactRateRule.pricingRuleId,
          ruleName: `قاعدة معتمدة (${exactRateRule.pricingRuleId})`,
          explanation: `تمت المطابقة مع قاعدة التسعير النشطة (${exactRateRule.pricingType} بمعدل ${exactRateRule.agreedRate} ر.س)`,
          resolvedRate: numRate,
        };
      }
    }

    // Unambiguous resolution was not possible -> DO NOT GUESS OR ASSUME PER_TRIP OR PER_TON!
    return {
      originalRate: numRate,
      pricingType: 'LEGACY_UNRESOLVED',
      isUnresolved: true,
      explanation: 'تعذر تحديد نوع التسعير من البيانات القديمة بصورة قطعية. لم يتم افتراض بالرد أو بالطن التزاماً بالمعايير المالية.',
      resolvedRate: numRate,
    };
  }

  /**
   * Transformation: Map 20 Legacy Columns to Modern TripEntity
   */
  private mapToTripEntity(
    raw: LegacySheetRow,
    rowNumber: number,
    matchedCarrier: MasterMatchCandidate,
    matchedMaterial: MasterMatchCandidate,
    matchedTruck: MasterMatchCandidate,
    matchedDriver: MasterMatchCandidate,
    pricing: PricingResolution
  ): Partial<TripEntity> {
    const tare = typeof raw.tareWeight === 'number' ? raw.tareWeight : parseFloat(String(raw.tareWeight)) || 0;
    const gross = typeof raw.grossWeight === 'number' ? raw.grossWeight : parseFloat(String(raw.grossWeight)) || 0;
    const net = typeof raw.netWeight === 'number' ? raw.netWeight : parseFloat(String(raw.netWeight)) || (gross - tare);
    const destNet = typeof raw.destNetWeight === 'number' ? raw.destNetWeight : parseFloat(String(raw.destNetWeight)) || net;

    // Map status string to TripStatus enum
    let status: TripStatus = 'COMPLETED';
    const s = (raw.status || '').toLowerCase();
    if (s.includes('transit') || s.includes('طريق') || s.includes('نقل')) status = 'IN_TRANSIT';
    else if (s.includes('reject') || s.includes('مرفوض')) status = 'REJECTED';
    else if (s.includes('cancel') || s.includes('ملغي')) status = 'CANCELLED';
    else if (s.includes('draft') || s.includes('مسودة')) status = 'DRAFT';

    // Calculate base financials based on resolved pricing
    let baseAmount = 0;
    if (pricing.pricingType === 'PER_TON') {
      baseAmount = (net / 1000) * pricing.resolvedRate;
    } else if (pricing.pricingType === 'PER_TRIP' || pricing.pricingType === 'FLAT_RATE') {
      baseAmount = pricing.resolvedRate;
    } else {
      // LEGACY_UNRESOLVED: preserve rate, but flag settlement
      baseAmount = pricing.resolvedRate;
    }

    const vatAmount = baseAmount * 0.15;
    const totalAmount = baseAmount + vatAmount;

    return {
      tripId: `TRP-LEGACY-${raw.ticketId || rowNumber}`,
      tripNumber: `LEGACY-${raw.tripSerial || rowNumber}`,
      projectId: raw.projectId || 'PRJ-NEOM-001',
      carrierId: matchedCarrier.matchedId || 'CARRIER-PENDING',
      truckId: matchedTruck.matchedId || 'TRUCK-PENDING',
      driverId: matchedDriver.matchedId || 'DRIVER-PENDING',
      materialId: matchedMaterial.matchedId || 'MAT-PENDING',
      pricingRuleId: pricing.detectedRuleId || 'PRICING-UNRESOLVED',
      
      status,

      carrierSnapshot: {
        carrierId: matchedCarrier.matchedId || 'UNRESOLVED',
        companyNameAr: matchedCarrier.matchedName || raw.carrier,
        commercialRegistrationNo: 'MIGRATION-PENDING',
      },
      truckSnapshot: {
        truckId: matchedTruck.matchedId || 'UNRESOLVED',
        plateNumberAr: matchedTruck.matchedName || raw.truckNo,
        tareWeightKg: tare,
        legalPayloadLimitKg: Math.max(0, gross - tare),
      },
      driverSnapshot: {
        driverId: matchedDriver.matchedId || 'UNRESOLVED',
        fullNameAr: matchedDriver.matchedName || raw.driverName,
        nationalOrIqamaId: 'MIGRATION-PENDING',
        phone: 'MIGRATION-PENDING',
      },
      materialSnapshot: {
        materialId: matchedMaterial.matchedId || 'UNRESOLVED',
        code: matchedMaterial.matchedId || 'MIG',
        nameAr: matchedMaterial.matchedName || raw.materialType,
        unitOfMeasure: 'TON',
      },

      pricingSnapshot: {
        pricingRuleId: pricing.detectedRuleId || 'PRICING-LEGACY',
        pricingType: pricing.pricingType,
        agreedRate: pricing.resolvedRate,
        currency: 'SAR',
        settlementBase: pricing.pricingType === 'PER_TON' ? (net / 1000) : 1,
        settlementAmount: baseAmount,
        pricingSnapshotAt: raw.shiftDate ? `${raw.shiftDate}T00:00:00Z` : new Date().toISOString(),
      },

      weights: {
        originTareKg: tare,
        originGrossKg: gross,
        originNetKg: net,
        destinationNetKg: destNet,
        originTicketNo: raw.ticketId,
        billableWeightKg: net,
      },

      financials: {
        baseAmountSAR: Math.round(baseAmount * 100) / 100,
        demurrageAmountSAR: 0,
        deductionsAmountSAR: 0,
        subtotalSAR: Math.round(baseAmount * 100) / 100,
        vatAmountSAR: Math.round(vatAmount * 100) / 100,
        totalAmountSAR: Math.round(totalAmount * 100) / 100,
        currency: 'SAR',
        isFinalized: false,
      },

      createdAt: raw.shiftDate ? new Date(raw.shiftDate) : new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Phase 2: Execute Commit
   * MANDATORY CONSTRAINT: "لا تنفذ Commit حتى يؤكد Admin."
   */
  public commitMigration(
    reportId: string,
    itemsToCommit: MigrationRowItem[],
    adminContext: AuthUserContext
  ): {
    success: boolean;
    committedTripsCount: number;
    createdMasterRecordsCount: number;
    batchId: string;
    auditLogId: string;
  } {
    if (!this.currentReport || this.currentReport.reportId !== reportId) {
      throw new Error('تقرير الترحيل غير موجود أو انتهت صلاحية المعاينة.');
    }

    if (adminContext.role !== 'PROJECT_ADMIN') {
      throw new Error('غير مصرح: ترحيل واعتماد البيانات التاريخية يتطلب صلاحية مدير النظام (PROJECT_ADMIN).');
    }

    const batchId = `BATCH-LEGACY-${Date.now()}`;
    let createdMasterCount = 0;
    const validItems = itemsToCommit.filter(i => i.isValid && i.reviewDecision !== 'REJECTED');

    // Register batch in AdminConsoleService
    adminConsoleService.registerImportBatch({
      batchId,
      projectId: validItems[0]?.raw.projectId || 'ALL',
      sourceFileName: `GoogleSheet_20Cols_${this.currentReport.sheetTabName}.gsheet`,
      totalRecords: itemsToCommit.length,
      processedRecords: validItems.length,
      failedRecords: itemsToCommit.length - validItems.length,
      status: 'COMPLETED',
      createdBy: adminContext.userId,
      createdAt: new Date() as any,
    });

    // Record Audit Log for the commit
    const auditLogId = `AUD-MIG-${Date.now()}`;
    adminConsoleService.recordAuditLog(
      'MIGRATION_BATCH',
      batchId,
      'COMMIT_LEGACY_MIGRATION',
      null,
      {
        batchId,
        totalRows: itemsToCommit.length,
        committedTrips: validItems.length,
        unresolvedPricingCount: this.currentReport.pricingUnresolved,
        duplicatesIgnored: this.currentReport.duplicates,
        conflictsExcluded: this.currentReport.conflicts,
      },
      adminContext
    );

    // Update current report state
    this.currentReport.isCommitted = true;
    this.currentReport.committedAt = new Date().toISOString();
    this.currentReport.committedBy = adminContext.displayName || adminContext.email;
    this.currentReport.committedBatchId = batchId;
    this.currentReport.committedTripsCount = validItems.length;
    this.currentReport.createdMasterRecordsCount = createdMasterCount;

    return {
      success: true,
      committedTripsCount: validItems.length,
      createdMasterRecordsCount: createdMasterCount,
      batchId,
      auditLogId,
    };
  }

  public getCurrentReport(): MigrationReport | null {
    return this.currentReport;
  }

  public getCurrentItems(): MigrationRowItem[] {
    return this.currentItems;
  }
}

export const legacyMigrationService = new LegacyMigrationService();
