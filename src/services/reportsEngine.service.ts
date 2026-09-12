/**
 * Reports Engine Service
 * Authoritative computational engine for Saudi Enterprise Logistics.
 * 
 * BLOCK 39 — Advanced Operational & Financial Reporting Suite:
 * 1. Historical Snapshot Invariance: uses `settlementAmount` from trip pricing snapshot, 
 *    NEVER recalculates historical trips using current master pricing tariffs.
 * 2. Multi-Criteria Filter Parameters: projectId, dateFrom, dateTo, shift, carrierId,
 *    materialId, pricingType, status, sourceType, truckId, driverId, supervisorId.
 * 3. Live Master Data Labels: removes static DEFAULT_ arrays; resolves labels from
 *    MasterDataService / cached lookups with zero N+1 queries.
 * 4. Pending Settlement Separation: strictly isolates pending trips from finalized financial totals.
 * 5. Demurrage Integrity: reads contractual snapshot rates without guesswork (DEMURRAGE_PENDING).
 * 6. Weighbridge Traceability: distinguishes actual destination scale from origin net accepted.
 * 7. Source Breakdown: aggregates metrics across 8 source types.
 * 8. Exports: high-fidelity CSV (UTF-8 BOM) and binary XLSX with sourceType, snapshot date,
 *    destination weight source, and finalized vs pending settlement status.
 */

import * as XLSX from 'xlsx';
import { TripRecord, TripPricingType, TripEngineStatus, OperationSourceType } from '../types/tripEngine';
import { 
  ReportType, 
  OperationalReportType, 
  PricingReportType, 
  ReportFilterParams, 
  ReportDataset, 
  ReportFinancialSummary, 
  ReportColumnDef,
  OPERATIONAL_REPORTS_METADATA, 
  PRICING_REPORTS_METADATA 
} from '../types/reports';
import { tripEngineService } from './tripEngine.service';
import { exceptionEngine } from './exceptionEngine.service';
import { pricingService } from './pricing.service';
import { masterDataService } from './masterData.service';

export interface LiveEntityLookup {
  projectName?: string;
  carrierName?: string;
  materialName?: string;
  truckPlate?: string;
  truckPayloadLimit?: number;
  driverName?: string;
}

export interface LiveMasterDataLookup {
  projects?: Map<string, { nameAr: string; clientName?: string; projectCode?: string }>;
  carriers?: Map<string, { companyNameAr: string; name?: string }>;
  materials?: Map<string, { nameAr: string; code?: string }>;
  trucks?: Map<string, { plateNumberAr: string; legalPayloadLimitKg?: number }>;
  drivers?: Map<string, { fullNameAr: string; phone?: string }>;
}

export class ReportsEngineService {
  /**
   * High-performance in-memory cache for live Master Data entities per project.
   * Eliminates N+1 database queries when rendering large report datasets.
   */
  private masterDataCache = new Map<string, LiveMasterDataLookup>();

  /**
   * Registers or updates master data lookup tables in cache (for tests or pre-warming).
   */
  public registerMasterData(key: string, lookup: LiveMasterDataLookup): void {
    this.masterDataCache.set(key, lookup);
  }

  /**
   * Retrieves cached master data lookup for a project or 'ALL'.
   */
  public getMasterDataLookup(key: string): LiveMasterDataLookup | undefined {
    return this.masterDataCache.get(key);
  }

  /**
   * Warms the master data cache for a specific project using MasterDataService.
   */
  public async warmMasterData(projectId: string): Promise<LiveMasterDataLookup> {
    if (this.masterDataCache.has(projectId)) {
      return this.masterDataCache.get(projectId)!;
    }

    try {
      const data = await masterDataService.getProjectMasterData(projectId);
      const lookup: LiveMasterDataLookup = {
        projects: new Map([[projectId, { nameAr: data.projectNameAr }]]),
        carriers: new Map(data.allCarriers.map(c => [c.carrierId, { companyNameAr: c.companyNameAr || c.name }])),
        materials: new Map(data.allMaterials.map(m => [m.materialId, { nameAr: m.nameAr || m.name, code: m.code }])),
        trucks: new Map(data.allTrucks.map(t => [t.truckId, { plateNumberAr: t.plateNumberAr || (t as any).plate || t.truckId, legalPayloadLimitKg: t.legalPayloadLimitKg }])),
        drivers: new Map(data.allDrivers.map(d => [d.driverId, { fullNameAr: d.fullNameAr || d.name, phone: d.phone }])),
      };
      this.masterDataCache.set(projectId, lookup);
      return lookup;
    } catch {
      return {};
    }
  }

  /**
   * Filters trips according to the multi-criteria parameters.
   * Enforces strict Project Isolation (RP-01, RP-26, RP-35).
   */
  public filterTrips(trips: TripRecord[], filters: ReportFilterParams): TripRecord[] {
    return trips.filter((t) => {
      // 1. Project - Strict Isolation Boundary
      if (filters.projectId && filters.projectId !== 'ALL' && t.projectId !== filters.projectId) {
        return false;
      }

      // 2. Date Range (supports dateFrom/dateTo and shiftDateFrom/shiftDateTo)
      const fromDate = filters.dateFrom || filters.shiftDateFrom;
      const toDate = filters.dateTo || filters.shiftDateTo;
      const tripDate = t.shiftDate || (t.loadTime ? t.loadTime.split('T')[0] : '');

      if (fromDate && tripDate < fromDate) {
        return false;
      }
      if (toDate && tripDate > toDate) {
        return false;
      }

      // 3. Shift filter
      if (filters.shift && filters.shift !== 'ALL') {
        const tripShift = this.determineShift(t.loadTime || t.createdAt);
        if (tripShift.code !== filters.shift) {
          return false;
        }
      }

      // 4. Carrier
      if (filters.carrierId && filters.carrierId !== 'ALL' && t.carrierId !== filters.carrierId) {
        return false;
      }

      // 5. Material
      if (filters.materialId && filters.materialId !== 'ALL' && t.materialId !== filters.materialId) {
        return false;
      }

      // 6. Pricing Type (PER_TRIP or PER_TON)
      if (filters.pricingType && filters.pricingType !== 'ALL') {
        const tPricingType = t.pricingSnapshot?.pricingType || t.pricingType;
        if (tPricingType !== filters.pricingType) {
          return false;
        }
      }

      // 7. Status
      if (filters.status && filters.status !== 'ALL' && t.status !== filters.status) {
        return false;
      }

      // 8. Source Type (MANUAL, WEIGHBRIDGE, EXCEL, CSV, GOOGLE_SHEETS, GOOGLE_DRIVE, API, MIGRATION)
      if (filters.sourceType && filters.sourceType !== 'ALL') {
        const tSource = t.sourceType || t.loadingDataSource || 'WEIGHBRIDGE';
        if (tSource !== filters.sourceType) {
          return false;
        }
      }

      // 9. Truck
      if (filters.truckId && filters.truckId !== 'ALL' && t.truckId !== filters.truckId) {
        return false;
      }

      // 10. Driver
      if (filters.driverId && filters.driverId !== 'ALL' && t.driverId !== filters.driverId) {
        return false;
      }

      // 11. Supervisor (matches loaderId, unloaderId, createdBy, updatedBy)
      if (filters.supervisorId && filters.supervisorId !== 'ALL') {
        const sup = filters.supervisorId;
        const matches = 
          t.loaderId === sup || 
          t.unloaderId === sup || 
          t.createdBy === sup || 
          t.updatedBy === sup;
        if (!matches) return false;
      }

      return true;
    });
  }

  /**
   * Determines work shift from trip loadTime ISO string.
   */
  public determineShift(loadTime: string | null): { code: 'MORNING' | 'EVENING' | 'NIGHT'; titleAr: string } {
    if (!loadTime) return { code: 'MORNING', titleAr: 'الوردية الصباحية (افتراضي)' };
    const date = new Date(loadTime);
    const hour = date.getUTCHours() + 3; // AST (UTC+3) Saudi Time
    const normalizedHour = (hour + 24) % 24;

    if (normalizedHour >= 6 && normalizedHour < 14) {
      return { code: 'MORNING', titleAr: 'الوردية الصباحية (06:00 - 14:00)' };
    } else if (normalizedHour >= 14 && normalizedHour < 22) {
      return { code: 'EVENING', titleAr: 'الوردية المسائية (14:00 - 22:00)' };
    } else {
      return { code: 'NIGHT', titleAr: 'الوردية الليلية (22:00 - 06:00)' };
    }
  }

  /**
   * Resolves entity names using live Master Data / cache / entity snapshots.
   * Does NOT rely on static DEFAULT_CARRIERS or DEFAULT_PROJECTS arrays in production reports (RP-27, RP-28, RP-34).
   */
  public getEntityLabels(trip: TripRecord, customLookup?: LiveMasterDataLookup): {
    projectName: string;
    carrierName: string;
    materialName: string;
    truckPlate: string;
    truckPayloadLimit: number;
    driverName: string;
  } {
    const lookup = customLookup || this.masterDataCache.get(trip.projectId) || this.masterDataCache.get('ALL');
    const entitySnapshots = (trip as any).entitySnapshots;

    // 1. Project
    const projectLive = lookup?.projects?.get(trip.projectId);
    const projectName = projectLive?.nameAr || entitySnapshots?.projectName || trip.projectId;

    // 2. Carrier
    const carrierLive = lookup?.carriers?.get(trip.carrierId);
    const carrierName = carrierLive?.companyNameAr || carrierLive?.name || entitySnapshots?.carrierName || (trip as any).carrierName || trip.carrierId;

    // 3. Material
    const materialLive = lookup?.materials?.get(trip.materialId);
    const materialName = materialLive?.nameAr || entitySnapshots?.materialName || (trip as any).materialName || trip.materialId;

    // 4. Truck
    const truckLive = lookup?.trucks?.get(trip.truckId);
    const truckPlate = truckLive?.plateNumberAr || entitySnapshots?.truckPlate || (trip as any).truckPlate || trip.truckId;
    const truckPayloadLimit = truckLive?.legalPayloadLimitKg || (trip as any).legalPayloadLimitKg || 32000;

    // 5. Driver
    const driverLive = lookup?.drivers?.get(trip.driverId);
    const driverName = driverLive?.fullNameAr || entitySnapshots?.driverName || (trip as any).driverName || trip.driverId;

    return {
      projectName,
      carrierName,
      materialName,
      truckPlate,
      truckPayloadLimit,
      driverName,
    };
  }

  /**
   * Distinguishes actual destination weighbridge measurement vs origin net accepted as destination.
   * Strictly enforces that zero variance does NOT assume physical weighbridge measurement (RP-20, RP-21, RP-22).
   */
  public resolveDestinationWeightInfo(t: TripRecord): {
    isOriginNetAccepted: boolean;
    destinationWeightSource: 'DESTINATION_SCALE' | 'ORIGIN_NET_ACCEPTED' | 'PENDING_RECEIPT';
    destinationWeightSourceLabelAr: string;
    unloadDecision: string;
  } {
    const isOriginNetAccepted = Boolean(
      (t as any).unloadDecision === 'ACCEPT_ORIGIN_NET_AS_DESTINATION' ||
      (t as any).destinationWeightSource === 'ORIGIN_NET_ACCEPTED' ||
      (t as any).isAcceptedOriginNet === true ||
      (t as any).weights?.destinationWeightSource === 'ORIGIN_NET_ACCEPTED'
    );

    if (isOriginNetAccepted) {
      return {
        isOriginNetAccepted: true,
        destinationWeightSource: 'ORIGIN_NET_ACCEPTED',
        destinationWeightSourceLabelAr: 'صافي المصدر المعتمد كمقصد (Origin Net Accepted)',
        unloadDecision: 'ACCEPT_ORIGIN_NET_AS_DESTINATION',
      };
    }

    if (t.destNetWeight !== null && t.destNetWeight !== undefined) {
      return {
        isOriginNetAccepted: false,
        destinationWeightSource: 'DESTINATION_SCALE',
        destinationWeightSourceLabelAr: 'ميزان المقصد الفعلي (Actual Destination Scale)',
        unloadDecision: (t as any).unloadDecision || 'MEASURED_DESTINATION',
      };
    }

    return {
      isOriginNetAccepted: false,
      destinationWeightSource: 'PENDING_RECEIPT',
      destinationWeightSourceLabelAr: 'بانتظار الوزن بالمقصد',
      unloadDecision: 'PENDING',
    };
  }

  /**
   * Computes financial breakdown for a trip using its pricing snapshot.
   * 
   * Strict Rules:
   * 1. Uses `settlementAmount` from trip snapshot for gross (historical invariance).
   * 2. Pending Settlement isolation: isPending = true excludes trip from finalized settlement totals.
   * 3. Finalized 0 SAR (e.g. isFinalizedZero = true or explicit non-pending 0 SAR rate) is NOT pending.
   * 4. Demurrage: reads contractual rate without hardcoded fallbacks; uncontracted demurrage becomes DEMURRAGE_PENDING.
   */
  public computeTripFinancialBreakdown(trip: TripRecord) {
    const isExplicitFinalizedZero = (trip as any).isFinalizedZero === true || 
      (trip.pricingSnapshot?.isPending === false && trip.pricingSnapshot?.settlementAmount === 0 && trip.pricingSnapshot?.agreedRate === 0);

    const isPending = !isExplicitFinalizedZero && Boolean(
      trip.pricingSnapshot?.isPending === true ||
      trip.pricingSnapshot?.pricingRuleId === 'UNRESOLVED_PENDING' ||
      (trip as any).pricingStatus === 'PENDING' ||
      (trip as any).pricingStatus === 'UNRESOLVED_PENDING' ||
      trip.pricingRuleId === 'UNRESOLVED_PENDING' ||
      (!trip.pricingSnapshot && (trip.settlementAmount === 0 || !trip.pricingRuleId) && (trip.agreedRate === 0 || !trip.agreedRate))
    );

    // Contractual Snapshot Invariance: authoritative gross amount is settlementAmount saved in trip
    const rawGross = trip.pricingSnapshot?.settlementAmount ?? trip.settlementAmount ?? 0;
    const gross = isPending ? 0 : rawGross;

    let adjustments = 0;
    let exceptionDeductions = 0;
    let demurrageStatus: 'RESOLVED' | 'DEMURRAGE_PENDING' | 'NOT_APPLICABLE' = 'NOT_APPLICABLE';
    let demurrageAmount = 0;

    if (!isPending) {
      // 1. Returned or Cancelled trips
      if (trip.status === 'RETURNED' || trip.status === 'CANCELLED') {
        exceptionDeductions = gross;
      } 
      // 2. Weight variance out-of-tolerance deduction (excess shrinkage > 500 kg)
      else if (trip.varianceWeight && trip.varianceWeight < -500) {
        const agreedRate = trip.pricingSnapshot?.agreedRate ?? trip.agreedRate ?? 0;
        const excessShrinkageTons = Math.abs(trip.varianceWeight + 500) / 1000;
        const deduction = excessShrinkageTons * agreedRate;
        exceptionDeductions += Math.round(deduction * 100) / 100;
      }

      // 3. Demurrage calculation (Strict No-Guesswork Rule: RP-16, RP-17, RP-18)
      const hasDemurrageClaim = Boolean(
        (trip.notes && trip.notes.includes('بدل انتظار')) ||
        (trip.pricingSnapshot?.waitingDurationHours && trip.pricingSnapshot.waitingDurationHours > 0) ||
        ((trip as any).waitingDurationHours && (trip as any).waitingDurationHours > 0)
      );

      if (hasDemurrageClaim) {
        if (trip.pricingSnapshot?.demurrageAmountSAR !== undefined) {
          demurrageAmount = trip.pricingSnapshot.demurrageAmountSAR;
          demurrageStatus = 'RESOLVED';
          adjustments += demurrageAmount;
        } else {
          const contractualRate = 
            trip.pricingSnapshot?.demurrageRatePerHourSAR ??
            (trip as any).demurrageRatePerHourSAR ??
            pricingService.getPricingRule(trip.pricingRuleId)?.demurrageRatePerHourSAR;

          const billableHours = 
            trip.pricingSnapshot?.waitingDurationHours ??
            (trip as any).waitingDurationHours ??
            1;

          if (contractualRate !== undefined && contractualRate > 0) {
            demurrageAmount = Math.round(contractualRate * billableHours * 100) / 100;
            demurrageStatus = 'RESOLVED';
            adjustments += demurrageAmount;
          } else {
            // NO GUESSING! Must NOT use 150 SAR or any fallback.
            // Demurrage remains pending contractual tariff resolution.
            demurrageStatus = 'DEMURRAGE_PENDING';
            demurrageAmount = 0;
          }
        }
      }
    }

    const net = isPending ? 0 : Math.max(0, gross + adjustments - exceptionDeductions);

    return {
      grossAmount: Math.round(gross * 100) / 100,
      adjustments: Math.round(adjustments * 100) / 100,
      exceptions: Math.round(exceptionDeductions * 100) / 100,
      netAmount: Math.round(net * 100) / 100,
      isPending,
      pendingReason: isPending 
        ? (trip.pricingSnapshot?.pendingReason || (trip as any).pendingReason || 'التسعير معلق — بانتظار استكمال أو اعتماد عقد الناقل قبل التسوية النهائية')
        : undefined,
      pricingStatusLabelAr: isPending ? 'معلق التسوية (Pending Settlement)' : 'تسوية معتمدة (Finalized)',
      demurrageStatus,
      demurrageAmount: Math.round(demurrageAmount * 100) / 100,
      pricingType: trip.pricingSnapshot?.pricingType || trip.pricingType || 'PER_TON',
      agreedRate: trip.pricingSnapshot?.agreedRate ?? trip.agreedRate ?? 0,
      currency: trip.pricingSnapshot?.currency || trip.currency || 'SAR',
      settlementBase: trip.pricingSnapshot?.settlementBase ?? trip.settlementBase ?? 0,
      pricingRuleId: trip.pricingSnapshot?.pricingRuleId || trip.pricingRuleId || 'UNSET',
      pricingSnapshotAt: trip.pricingSnapshot?.pricingSnapshotAt || (trip as any).pricingSnapshotAt || trip.createdAt,
    };
  }

  /**
   * Aggregates financial and operational summary from filtered trips.
   * Strictly isolates pending settlement trips from finalized financial totals (RP-12, RP-13).
   */
  public calculateSummary(trips: TripRecord[]): ReportFinancialSummary {
    let gross = 0;
    let adjustments = 0;
    let exceptions = 0;
    let net = 0;
    let totalKg = 0;
    let completedCount = 0;
    let returnedCount = 0;
    let exceptionTripsCount = 0;
    let pricedTrips = 0;
    let pendingSettlementTrips = 0;
    let totalDemurrage = 0;
    let pendingDemurrage = 0;

    for (const t of trips) {
      const breakdown = this.computeTripFinancialBreakdown(t);
      if (breakdown.isPending) {
        pendingSettlementTrips++;
      } else {
        pricedTrips++;
        gross += breakdown.grossAmount;
        adjustments += breakdown.adjustments;
        exceptions += breakdown.exceptions;
        net += breakdown.netAmount;
        totalDemurrage += breakdown.demurrageAmount;
      }

      if (breakdown.demurrageStatus === 'DEMURRAGE_PENDING') {
        pendingDemurrage++;
      }

      totalKg += t.netWeight || 0;
      if (t.status === 'COMPLETED') completedCount++;
      if (t.status === 'RETURNED' || t.status === 'RETURN_REQUESTED') returnedCount++;
      if (t.status === 'EXCEPTION' || t.hasExceptions) exceptionTripsCount++;
    }

    const finalSettlementAmount = Math.round(net * 100) / 100;

    return {
      grossAmountSAR: Math.round(gross * 100) / 100,
      adjustmentsSAR: Math.round(adjustments * 100) / 100,
      exceptionsSAR: Math.round(exceptions * 100) / 100,
      netAmountSAR: finalSettlementAmount,
      totalTrips: trips.length,
      totalNetWeightKg: totalKg,
      totalNetWeightTons: Math.round((totalKg / 1000) * 100) / 100,
      completedTripsCount: completedCount,
      exceptionsCount: exceptionTripsCount,
      returnedTripsCount: returnedCount,

      pricedTrips,
      pendingSettlementTrips,
      finalSettlementAmount,
      pendingSettlementAmount: 0,
      totalDemurrageAmountSAR: Math.round(totalDemurrage * 100) / 100,
      pendingDemurrageCount: pendingDemurrage,
    };
  }

  // =========================================================================
  // 9 OPERATIONAL REPORTS GENERATORS
  // =========================================================================

  /**
   * 1. Daily Operations Report
   */
  public generateDailyOperationsReport(trips: TripRecord[], filters: ReportFilterParams): ReportDataset {
    const meta = OPERATIONAL_REPORTS_METADATA.DAILY_OPERATIONS;
    const filtered = this.filterTrips(trips, filters);
    const summary = this.calculateSummary(filtered);

    // Group by shiftDate
    const dateMap = new Map<string, TripRecord[]>();
    filtered.forEach(t => {
      const list = dateMap.get(t.shiftDate) || [];
      list.push(t);
      dateMap.set(t.shiftDate, list);
    });

    const rows: Record<string, any>[] = [];
    Array.from(dateMap.keys()).sort().reverse().forEach(dateStr => {
      const groupTrips = dateMap.get(dateStr) || [];
      const grpSummary = this.calculateSummary(groupTrips);
      const completed = groupTrips.filter(t => t.status === 'COMPLETED').length;
      const inTransit = groupTrips.filter(t => t.status === 'IN_TRANSIT' || t.status === 'LOADED').length;
      const returned = groupTrips.filter(t => t.status === 'RETURNED' || t.status === 'RETURN_REQUESTED').length;
      const exc = groupTrips.filter(t => t.status === 'EXCEPTION' || t.hasExceptions).length;

      rows.push({
        shiftDate: dateStr,
        totalTrips: groupTrips.length,
        completedTrips: completed,
        inTransitTrips: inTransit,
        returnedTrips: returned,
        exceptionTrips: exc,
        totalTons: grpSummary.totalNetWeightTons,
        pricedTrips: grpSummary.pricedTrips,
        pendingTrips: grpSummary.pendingSettlementTrips,
        grossAmount: grpSummary.grossAmountSAR,
        netAmount: grpSummary.netAmountSAR,
        completionRate: groupTrips.length > 0 ? Math.round((completed / groupTrips.length) * 100) : 0,
      });
    });

    const columns: ReportColumnDef[] = [
      { key: 'shiftDate', labelAr: 'تاريخ التشغيل', labelEn: 'Shift Date', format: 'text', align: 'right' },
      { key: 'totalTrips', labelAr: 'إجمالي الرحلات', labelEn: 'Total Trips', format: 'number', align: 'center' },
      { key: 'completedTrips', labelAr: 'المكتملة', labelEn: 'Completed', format: 'number', align: 'center' },
      { key: 'inTransitTrips', labelAr: 'قيد النقل', labelEn: 'In Transit', format: 'number', align: 'center' },
      { key: 'returnedTrips', labelAr: 'المرتجعة', labelEn: 'Returned', format: 'number', align: 'center' },
      { key: 'exceptionTrips', labelAr: 'الاستثناءات', labelEn: 'Exceptions', format: 'number', align: 'center' },
      { key: 'totalTons', labelAr: 'الصافي (طن)', labelEn: 'Net Tons', format: 'number', align: 'left' },
      { key: 'pricedTrips', labelAr: 'الرحلات المسعرة', labelEn: 'Priced Trips', format: 'number', align: 'center' },
      { key: 'pendingTrips', labelAr: 'معلقة التسوية', labelEn: 'Pending Trips', format: 'number', align: 'center' },
      { key: 'grossAmount', labelAr: 'المبلغ الإجمالي (SAR)', labelEn: 'Gross SAR', format: 'currency', align: 'left' },
      { key: 'netAmount', labelAr: 'صافي المستحق (SAR)', labelEn: 'Net SAR', format: 'currency', align: 'left' },
      { key: 'completionRate', labelAr: 'نسبة الإنجاز (%)', labelEn: 'Completion %', format: 'percent', align: 'center' },
    ];

    return {
      reportType: 'DAILY_OPERATIONS',
      category: 'OPERATIONAL',
      titleAr: meta.titleAr,
      titleEn: meta.titleEn,
      descriptionAr: meta.descriptionAr,
      generatedAt: new Date().toISOString(),
      filtersApplied: filters,
      summary,
      columns,
      rows,
      notes: 'تعتمد الأرقام على تسجيلات الموازين المعتمدة وسجلات التشغيل في Firestore.',
    };
  }

  /**
   * 2. Shift Operations Report
   */
  public generateShiftOperationsReport(trips: TripRecord[], filters: ReportFilterParams): ReportDataset {
    const meta = OPERATIONAL_REPORTS_METADATA.SHIFT_OPERATIONS;
    const filtered = this.filterTrips(trips, filters);
    const summary = this.calculateSummary(filtered);

    const shiftMap = new Map<string, { shiftTitleAr: string; trips: TripRecord[] }>();
    filtered.forEach(t => {
      const shift = this.determineShift(t.loadTime);
      const key = `${t.shiftDate}_${shift.code}`;
      const entry = shiftMap.get(key) || { shiftTitleAr: `${t.shiftDate} - ${shift.titleAr}`, trips: [] };
      entry.trips.push(t);
      shiftMap.set(key, entry);
    });

    const rows: Record<string, any>[] = [];
    shiftMap.forEach((entry) => {
      const grpSummary = this.calculateSummary(entry.trips);
      const completed = entry.trips.filter(t => t.status === 'COMPLETED').length;
      const supervisors = Array.from(new Set(entry.trips.map(t => t.unloaderId || t.loaderId || t.createdBy).filter(Boolean))).join(', ');

      rows.push({
        shiftName: entry.shiftTitleAr,
        supervisors: supervisors || 'مكتب الحركة المركزي',
        tripsCount: entry.trips.length,
        completedCount: completed,
        totalTons: grpSummary.totalNetWeightTons,
        pricedTrips: grpSummary.pricedTrips,
        pendingTrips: grpSummary.pendingSettlementTrips,
        grossAmount: grpSummary.grossAmountSAR,
        netAmount: grpSummary.netAmountSAR,
        productivityRate: entry.trips.length > 0 ? (grpSummary.totalNetWeightTons / entry.trips.length).toFixed(2) : '0',
      });
    });

    const columns: ReportColumnDef[] = [
      { key: 'shiftName', labelAr: 'الوردية وتاريخ التشغيل', labelEn: 'Shift & Date', format: 'text', align: 'right' },
      { key: 'supervisors', labelAr: 'مسؤولو الوردية', labelEn: 'Shift Supervisors', format: 'text', align: 'right' },
      { key: 'tripsCount', labelAr: 'عدد الردود', labelEn: 'Trips', format: 'number', align: 'center' },
      { key: 'completedCount', labelAr: 'الردود المفرغة', labelEn: 'Unloaded', format: 'number', align: 'center' },
      { key: 'totalTons', labelAr: 'الأطنان المنقولة', labelEn: 'Tons', format: 'number', align: 'left' },
      { key: 'productivityRate', labelAr: 'معدل الحمولة (طن/رد)', labelEn: 'Ton/Trip', format: 'number', align: 'center' },
      { key: 'grossAmount', labelAr: 'المبلغ الإجمالي (SAR)', labelEn: 'Gross SAR', format: 'currency', align: 'left' },
      { key: 'netAmount', labelAr: 'صافي المستحق (SAR)', labelEn: 'Net SAR', format: 'currency', align: 'left' },
    ];

    return {
      reportType: 'SHIFT_OPERATIONS',
      category: 'OPERATIONAL',
      titleAr: meta.titleAr,
      titleEn: meta.titleEn,
      descriptionAr: meta.descriptionAr,
      generatedAt: new Date().toISOString(),
      filtersApplied: filters,
      summary,
      columns,
      rows,
    };
  }

  /**
   * 3. Carrier Performance Report (RP-24)
   */
  public generateCarrierPerformanceReport(trips: TripRecord[], filters: ReportFilterParams): ReportDataset {
    const meta = OPERATIONAL_REPORTS_METADATA.CARRIER_PERFORMANCE;
    const filtered = this.filterTrips(trips, filters);
    const summary = this.calculateSummary(filtered);

    const carrierMap = new Map<string, TripRecord[]>();
    filtered.forEach(t => {
      const list = carrierMap.get(t.carrierId) || [];
      list.push(t);
      carrierMap.set(t.carrierId, list);
    });

    const rows: Record<string, any>[] = [];
    carrierMap.forEach((carrierTrips, carrierId) => {
      const labels = this.getEntityLabels(carrierTrips[0]);
      const grpSummary = this.calculateSummary(carrierTrips);
      const completed = carrierTrips.filter(t => t.status === 'COMPLETED').length;
      const returned = carrierTrips.filter(t => t.status === 'RETURNED' || t.status === 'RETURN_REQUESTED').length;
      const exc = carrierTrips.filter(t => t.status === 'EXCEPTION' || t.hasExceptions).length;
      const activeTrucks = new Set(carrierTrips.map(t => t.truckId)).size;
      const avgPayload = carrierTrips.length > 0 ? (grpSummary.totalNetWeightTons / carrierTrips.length).toFixed(2) : '0';

      // Aggregate source breakdown for carrier
      const sourceCounts = new Map<string, number>();
      let totalVarianceKg = 0;
      carrierTrips.forEach(t => {
        const src = t.sourceType || t.loadingDataSource || 'WEIGHBRIDGE';
        sourceCounts.set(src, (sourceCounts.get(src) || 0) + 1);
        if (t.varianceWeight) totalVarianceKg += t.varianceWeight;
      });
      const sourceBreakdown = Array.from(sourceCounts.entries())
        .map(([src, count]) => `${src}: ${count}`)
        .join(', ');

      rows.push({
        carrierName: labels.carrierName,
        carrierId,
        activeTrucks,
        totalTrips: carrierTrips.length,
        completedTrips: completed,
        returnedTrips: returned,
        exceptions: exc,
        totalTons: grpSummary.totalNetWeightTons,
        avgPayloadTons: avgPayload,
        complianceRate: carrierTrips.length > 0 ? Math.round(((carrierTrips.length - returned - exc) / carrierTrips.length) * 100) : 100,
        pricedTrips: grpSummary.pricedTrips,
        pendingTrips: grpSummary.pendingSettlementTrips,
        grossAmount: grpSummary.grossAmountSAR,
        demurrageAmount: grpSummary.totalDemurrageAmountSAR || 0,
        varianceKg: totalVarianceKg,
        netAmount: grpSummary.netAmountSAR,
        sourceBreakdown,
      });
    });

    const columns: ReportColumnDef[] = [
      { key: 'carrierName', labelAr: 'اسم الناقل اللوجستي', labelEn: 'Carrier Name', format: 'text', align: 'right' },
      { key: 'activeTrucks', labelAr: 'الشاحنات العاملة', labelEn: 'Trucks Active', format: 'number', align: 'center' },
      { key: 'totalTrips', labelAr: 'إجمالي الردود', labelEn: 'Total Trips', format: 'number', align: 'center' },
      { key: 'completedTrips', labelAr: 'المكتملة', labelEn: 'Completed', format: 'number', align: 'center' },
      { key: 'returnedTrips', labelAr: 'المرتجعة', labelEn: 'Returned', format: 'number', align: 'center' },
      { key: 'totalTons', labelAr: 'إجمالي الأطنان', labelEn: 'Total Tons', format: 'number', align: 'left' },
      { key: 'avgPayloadTons', labelAr: 'متوسط الحمولة (طن)', labelEn: 'Avg Payload', format: 'number', align: 'center' },
      { key: 'pricedTrips', labelAr: 'المعتمدة مالياً', labelEn: 'Priced Trips', format: 'number', align: 'center' },
      { key: 'pendingTrips', labelAr: 'معلقة التسوية', labelEn: 'Pending Trips', format: 'number', align: 'center' },
      { key: 'demurrageAmount', labelAr: 'بدل الانتظار (SAR)', labelEn: 'Demurrage SAR', format: 'currency', align: 'left' },
      { key: 'netAmount', labelAr: 'صافي المستحق النهائي (SAR)', labelEn: 'Final Net SAR', format: 'currency', align: 'left' },
      { key: 'complianceRate', labelAr: 'نسبة الامتثال (%)', labelEn: 'Compliance %', format: 'percent', align: 'center' },
    ];

    return {
      reportType: 'CARRIER_PERFORMANCE',
      category: 'OPERATIONAL',
      titleAr: meta.titleAr,
      titleEn: meta.titleEn,
      descriptionAr: meta.descriptionAr,
      generatedAt: new Date().toISOString(),
      filtersApplied: filters,
      summary,
      columns,
      rows,
    };
  }

  /**
   * 4. Material Movement Report (RP-25)
   */
  public generateMaterialMovementReport(trips: TripRecord[], filters: ReportFilterParams): ReportDataset {
    const meta = OPERATIONAL_REPORTS_METADATA.MATERIAL_MOVEMENT;
    const filtered = this.filterTrips(trips, filters);
    const summary = this.calculateSummary(filtered);

    const matMap = new Map<string, TripRecord[]>();
    filtered.forEach(t => {
      const list = matMap.get(t.materialId) || [];
      list.push(t);
      matMap.set(t.materialId, list);
    });

    const rows: Record<string, any>[] = [];
    matMap.forEach((matTrips, materialId) => {
      const labels = this.getEntityLabels(matTrips[0]);
      const grpSummary = this.calculateSummary(matTrips);
      const density = 1.6; // standard aggregate density ton/m3
      const volumeM3 = Math.round((grpSummary.totalNetWeightTons / density) * 10) / 10;

      let originNetKg = 0;
      let destNetKg = 0;
      let varianceKg = 0;
      const carrierNames = new Set<string>();

      matTrips.forEach(t => {
        const oNet = t.netWeight || 0;
        const dNet = t.destNetWeight !== null && t.destNetWeight !== undefined ? t.destNetWeight : oNet;
        originNetKg += oNet;
        destNetKg += dNet;
        varianceKg += (t.varianceWeight !== undefined && t.varianceWeight !== null ? t.varianceWeight : (dNet - oNet));
        const cLabels = this.getEntityLabels(t);
        carrierNames.add(cLabels.carrierName);
      });

      const originNetTons = Math.round((originNetKg / 1000) * 100) / 100;
      const destNetTons = Math.round((destNetKg / 1000) * 100) / 100;
      const varianceTons = Math.round((varianceKg / 1000) * 100) / 100;

      rows.push({
        materialName: labels.materialName,
        materialCode: materialId,
        tripsCount: matTrips.length,
        totalNetKg: originNetKg,
        totalNetTons: originNetTons,
        destNetTons,
        varianceKg,
        varianceTons,
        estimatedVolumeM3: volumeM3,
        avgTonPerTrip: matTrips.length > 0 ? (originNetTons / matTrips.length).toFixed(2) : '0',
        pricedTrips: grpSummary.pricedTrips,
        pendingTrips: grpSummary.pendingSettlementTrips,
        carrierBreakdown: Array.from(carrierNames).join(', '),
        grossAmount: grpSummary.grossAmountSAR,
        netAmount: grpSummary.netAmountSAR,
      });
    });

    const columns: ReportColumnDef[] = [
      { key: 'materialName', labelAr: 'المادة الموردة', labelEn: 'Material Name', format: 'text', align: 'right' },
      { key: 'materialCode', labelAr: 'رمز المادة', labelEn: 'Material Code', format: 'text', align: 'right' },
      { key: 'tripsCount', labelAr: 'عدد الردود', labelEn: 'Trips', format: 'number', align: 'center' },
      { key: 'totalNetTons', labelAr: 'صافي المصدر (طن)', labelEn: 'Origin Net Tons', format: 'number', align: 'left' },
      { key: 'destNetTons', labelAr: 'صافي المقصد (طن)', labelEn: 'Dest Net Tons', format: 'number', align: 'left' },
      { key: 'varianceKg', labelAr: 'الفارق الموزني (كجم)', labelEn: 'Variance KG', format: 'number', align: 'center' },
      { key: 'carrierBreakdown', labelAr: 'الناقلون المنفذون', labelEn: 'Carriers', format: 'text', align: 'right' },
      { key: 'pricedTrips', labelAr: 'الرحلات المسعرة', labelEn: 'Priced Trips', format: 'number', align: 'center' },
      { key: 'pendingTrips', labelAr: 'معلقة التسوية', labelEn: 'Pending', format: 'number', align: 'center' },
      { key: 'netAmount', labelAr: 'صافي المستحق (SAR)', labelEn: 'Net SAR', format: 'currency', align: 'left' },
    ];

    return {
      reportType: 'MATERIAL_MOVEMENT',
      category: 'OPERATIONAL',
      titleAr: meta.titleAr,
      titleEn: meta.titleEn,
      descriptionAr: meta.descriptionAr,
      generatedAt: new Date().toISOString(),
      filtersApplied: filters,
      summary,
      columns,
      rows,
    };
  }

  /**
   * 5. Truck Utilization Report
   */
  public generateTruckUtilizationReport(trips: TripRecord[], filters: ReportFilterParams): ReportDataset {
    const meta = OPERATIONAL_REPORTS_METADATA.TRUCK_UTILIZATION;
    const filtered = this.filterTrips(trips, filters);
    const summary = this.calculateSummary(filtered);

    const truckMap = new Map<string, TripRecord[]>();
    filtered.forEach(t => {
      const list = truckMap.get(t.truckId) || [];
      list.push(t);
      truckMap.set(t.truckId, list);
    });

    const rows: Record<string, any>[] = [];
    truckMap.forEach((truckTrips, truckId) => {
      const labels = this.getEntityLabels(truckTrips[0]);
      const grpSummary = this.calculateSummary(truckTrips);
      const legalLimitTons = labels.truckPayloadLimit / 1000;
      const avgPayloadTons = truckTrips.length > 0 ? (grpSummary.totalNetWeightTons / truckTrips.length) : 0;
      const utilizationRate = legalLimitTons > 0 ? Math.round((avgPayloadTons / legalLimitTons) * 100) : 0;

      rows.push({
        plateNumber: labels.truckPlate,
        truckId,
        carrierName: labels.carrierName,
        tripsCount: truckTrips.length,
        totalTons: grpSummary.totalNetWeightTons,
        legalLimitTons: legalLimitTons.toFixed(1),
        avgPayloadTons: avgPayloadTons.toFixed(2),
        utilizationRate,
        grossAmount: grpSummary.grossAmountSAR,
        netAmount: grpSummary.netAmountSAR,
      });
    });

    const columns: ReportColumnDef[] = [
      { key: 'plateNumber', labelAr: 'رقم اللوحة', labelEn: 'Plate No', format: 'text', align: 'right' },
      { key: 'carrierName', labelAr: 'الناقل التابع', labelEn: 'Carrier', format: 'text', align: 'right' },
      { key: 'tripsCount', labelAr: 'عدد الرحلات', labelEn: 'Trips', format: 'number', align: 'center' },
      { key: 'totalTons', labelAr: 'الأطنان المنقولة', labelEn: 'Total Tons', format: 'number', align: 'left' },
      { key: 'legalLimitTons', labelAr: 'الحمولة النظامية (طن)', labelEn: 'Legal Limit', format: 'number', align: 'center' },
      { key: 'avgPayloadTons', labelAr: 'متوسط الحمولة (طن)', labelEn: 'Avg Payload', format: 'number', align: 'center' },
      { key: 'utilizationRate', labelAr: 'معدل الاستغلال (%)', labelEn: 'Utilization %', format: 'percent', align: 'center' },
      { key: 'netAmount', labelAr: 'صافي المستحق (SAR)', labelEn: 'Net SAR', format: 'currency', align: 'left' },
    ];

    return {
      reportType: 'TRUCK_UTILIZATION',
      category: 'OPERATIONAL',
      titleAr: meta.titleAr,
      titleEn: meta.titleEn,
      descriptionAr: meta.descriptionAr,
      generatedAt: new Date().toISOString(),
      filtersApplied: filters,
      summary,
      columns,
      rows,
    };
  }

  /**
   * 6. Weight Variance Report (RP-20, RP-21, RP-22)
   */
  public generateWeightVarianceReport(trips: TripRecord[], filters: ReportFilterParams): ReportDataset {
    const meta = OPERATIONAL_REPORTS_METADATA.WEIGHT_VARIANCE;
    const filtered = this.filterTrips(trips, filters).filter(t => 
      t.destNetWeight !== null || 
      (t as any).unloadDecision === 'ACCEPT_ORIGIN_NET_AS_DESTINATION' ||
      (t as any).destinationWeightSource === 'ORIGIN_NET_ACCEPTED' ||
      t.status === 'COMPLETED'
    );
    const summary = this.calculateSummary(filtered);

    const rows = filtered.map(t => {
      const labels = this.getEntityLabels(t);
      const destInfo = this.resolveDestinationWeightInfo(t);
      const originNet = t.netWeight || 0;
      const destNet = destInfo.isOriginNetAccepted ? originNet : (t.destNetWeight !== null && t.destNetWeight !== undefined ? t.destNetWeight : originNet);
      const varianceKg = destInfo.isOriginNetAccepted ? 0 : (t.varianceWeight ?? (destNet - originNet));
      const variancePercent = originNet > 0 ? ((varianceKg / originNet) * 100).toFixed(2) : '0';
      
      let varianceClassification = 'مطابق (ضمن النطاق المسموح)';
      if (destInfo.isOriginNetAccepted) {
        varianceClassification = 'مطابق (اعتماد صافي المصدر)';
      } else if (varianceKg < -500) {
        varianceClassification = 'عجز تجاوز التسامح (-)';
      } else if (varianceKg > 500) {
        varianceClassification = 'زيادة تجاوز التسامح (+)';
      }

      return {
        tripSerial: t.tripSerial,
        ticketId: t.ticketId,
        shiftDate: t.shiftDate,
        carrierName: labels.carrierName,
        truckPlate: labels.truckPlate,
        materialName: labels.materialName,
        originNetKg: originNet.toLocaleString(),
        destNetKg: destNet.toLocaleString(),
        destinationWeightSource: destInfo.destinationWeightSource,
        destinationWeightSourceLabelAr: destInfo.destinationWeightSourceLabelAr,
        unloadDecision: destInfo.unloadDecision,
        varianceKg: varianceKg > 0 ? `+${varianceKg}` : varianceKg.toString(),
        variancePercent: `${variancePercent}%`,
        classification: varianceClassification,
        sourceType: t.sourceType || t.loadingDataSource || 'WEIGHBRIDGE',
        unloader: t.unloaderId || 'مهندس الموقع',
        notes: t.notes || (destInfo.isOriginNetAccepted ? 'تم قبول صافي وزن المصدر بالمقصد' : 'مطابقة نظامية'),
      };
    });

    const columns: ReportColumnDef[] = [
      { key: 'tripSerial', labelAr: 'الرقم التسلسلي', labelEn: 'Trip Serial', format: 'text', align: 'right' },
      { key: 'ticketId', labelAr: 'تذكرة الميزان', labelEn: 'Ticket ID', format: 'text', align: 'right' },
      { key: 'carrierName', labelAr: 'الناقل', labelEn: 'Carrier', format: 'text', align: 'right' },
      { key: 'truckPlate', labelAr: 'الشاحنة', labelEn: 'Truck', format: 'text', align: 'center' },
      { key: 'materialName', labelAr: 'المادة', labelEn: 'Material', format: 'text', align: 'right' },
      { key: 'originNetKg', labelAr: 'صافي المصدر (كجم)', labelEn: 'Origin Net', format: 'number', align: 'left' },
      { key: 'destNetKg', labelAr: 'صافي المقصد (كجم)', labelEn: 'Dest Net', format: 'number', align: 'left' },
      { key: 'destinationWeightSourceLabelAr', labelAr: 'مصدر وزن المقصد', labelEn: 'Dest Scale Source', format: 'badge', align: 'center' },
      { key: 'varianceKg', labelAr: 'الفارق (كجم)', labelEn: 'Variance KG', format: 'text', align: 'center' },
      { key: 'variancePercent', labelAr: 'نسبة الفارق', labelEn: 'Variance %', format: 'text', align: 'center' },
      { key: 'classification', labelAr: 'التصنيف الرقابي', labelEn: 'Compliance', format: 'badge', align: 'center' },
    ];

    return {
      reportType: 'WEIGHT_VARIANCE',
      category: 'OPERATIONAL',
      titleAr: meta.titleAr,
      titleEn: meta.titleEn,
      descriptionAr: meta.descriptionAr,
      generatedAt: new Date().toISOString(),
      filtersApplied: filters,
      summary,
      columns,
      rows,
      notes: 'الحد الأقصى للتفاوت المسموح به تعاقدياً هو ±1.5% أو 500 كجم كحد أقصى.',
    };
  }

  /**
   * 7. Returned Trips Report
   */
  public generateReturnedTripsReport(trips: TripRecord[], filters: ReportFilterParams): ReportDataset {
    const meta = OPERATIONAL_REPORTS_METADATA.RETURNED_TRIPS;
    const filtered = this.filterTrips(trips, filters).filter(
      t => t.status === 'RETURNED' || t.status === 'RETURN_REQUESTED' || t.destNetWeight === 0
    );
    const summary = this.calculateSummary(filtered);

    const rows = filtered.map(t => {
      const labels = this.getEntityLabels(t);
      const breakdown = this.computeTripFinancialBreakdown(t);

      return {
        tripSerial: t.tripSerial,
        ticketId: t.ticketId,
        shiftDate: t.shiftDate,
        carrierName: labels.carrierName,
        truckPlate: labels.truckPlate,
        driverName: labels.driverName,
        materialName: labels.materialName,
        tareWeight: t.tareWeight,
        grossWeight: t.grossWeight,
        netWeightTons: ((t.netWeight || 0) / 1000).toFixed(2),
        rejectionReason: t.notes || 'رفض الشحنة لعدم مطابقة المواصفات الفنية أو التفتيش الميداني',
        supervisor: t.unloaderId || t.updatedBy || 'مفتش الجودة',
        grossAmount: breakdown.grossAmount,
        deduction: breakdown.exceptions,
        netAmount: breakdown.netAmount,
      };
    });

    const columns: ReportColumnDef[] = [
      { key: 'tripSerial', labelAr: 'الرقم التسلسلي', labelEn: 'Trip Serial', format: 'text', align: 'right' },
      { key: 'ticketId', labelAr: 'تذكرة الميزان', labelEn: 'Ticket', format: 'text', align: 'right' },
      { key: 'shiftDate', labelAr: 'التاريخ', labelEn: 'Date', format: 'date', align: 'center' },
      { key: 'carrierName', labelAr: 'الناقل', labelEn: 'Carrier', format: 'text', align: 'right' },
      { key: 'truckPlate', labelAr: 'الشاحنة', labelEn: 'Truck', format: 'text', align: 'center' },
      { key: 'materialName', labelAr: 'المادة المرفوضة', labelEn: 'Material', format: 'text', align: 'right' },
      { key: 'netWeightTons', labelAr: 'الكمية المرتجعة (طن)', labelEn: 'Returned Tons', format: 'number', align: 'left' },
      { key: 'rejectionReason', labelAr: 'سبب الرفض والإرجاع', labelEn: 'Rejection Reason', format: 'text', align: 'right' },
      { key: 'supervisor', labelAr: 'المشرف المعتمد للرفض', labelEn: 'Approver', format: 'text', align: 'right' },
      { key: 'netAmount', labelAr: 'صافي المستحق المحتسب', labelEn: 'Net Settled', format: 'currency', align: 'left' },
    ];

    return {
      reportType: 'RETURNED_TRIPS',
      category: 'OPERATIONAL',
      titleAr: meta.titleAr,
      titleEn: meta.titleEn,
      descriptionAr: meta.descriptionAr,
      generatedAt: new Date().toISOString(),
      filtersApplied: filters,
      summary,
      columns,
      rows,
      notes: 'الشحنات المرتجعة لا يُستحق عنها أجر نقل وتخضع لخصم كامل وفقاً لشروط العقد.',
    };
  }

  /**
   * 8. Exception Report
   */
  public generateExceptionReport(trips: TripRecord[], filters: ReportFilterParams): ReportDataset {
    const meta = OPERATIONAL_REPORTS_METADATA.EXCEPTION_REPORT;
    const allExceptions = exceptionEngine.getAllExceptions();
    const filteredTrips = this.filterTrips(trips, filters);
    const tripIds = new Set(filteredTrips.map(t => t.tripId));

    const matchedExceptions = allExceptions.filter(e => {
      if (filters.projectId && filters.projectId !== 'ALL' && e.projectId !== filters.projectId) return false;
      if (e.tripId && !tripIds.has(e.tripId) && filteredTrips.length < trips.length) return false;
      return true;
    });

    const summary = this.calculateSummary(filteredTrips);

    const rows = matchedExceptions.map(e => {
      const trip = trips.find(t => t.tripId === e.tripId);
      const labels = trip ? this.getEntityLabels(trip) : { carrierName: 'غير محدد', truckPlate: '-', materialName: '-' };

      let penalty = 0;
      if (e.severity === 'CRITICAL' || e.severity === 'BLOCKING') penalty = 500;
      else if (e.severity === 'HIGH') penalty = 250;

      return {
        exceptionId: e.exceptionId,
        tripId: e.tripId || 'N/A',
        type: e.type,
        severity: e.severity,
        status: e.status,
        carrierName: labels.carrierName,
        truckPlate: labels.truckPlate,
        description: e.description,
        openedAt: new Date(e.openedAt).toLocaleDateString('ar-SA'),
        resolutionNote: e.resolutionNote || 'قيد المتابعة والتدقيق الإداري',
        penaltyAmount: penalty,
      };
    });

    const columns: ReportColumnDef[] = [
      { key: 'exceptionId', labelAr: 'معرف الاستثناء', labelEn: 'Exception ID', format: 'text', align: 'right' },
      { key: 'tripId', labelAr: 'معرف الرحلة', labelEn: 'Trip ID', format: 'text', align: 'right' },
      { key: 'type', labelAr: 'نوع الاستثناء', labelEn: 'Type', format: 'text', align: 'right' },
      { key: 'severity', labelAr: 'درجة الخطورة', labelEn: 'Severity', format: 'badge', align: 'center' },
      { key: 'status', labelAr: 'حالة الاستثناء', labelEn: 'Status', format: 'badge', align: 'center' },
      { key: 'carrierName', labelAr: 'الناقل المعني', labelEn: 'Carrier', format: 'text', align: 'right' },
      { key: 'description', labelAr: 'وصف حالة عدم المطابقة', labelEn: 'Description', format: 'text', align: 'right' },
      { key: 'resolutionNote', labelAr: 'إجراء المعالجة والحل', labelEn: 'Resolution', format: 'text', align: 'right' },
      { key: 'penaltyAmount', labelAr: 'الجزاء المترتب (SAR)', labelEn: 'Penalty SAR', format: 'currency', align: 'left' },
    ];

    return {
      reportType: 'EXCEPTION_REPORT',
      category: 'OPERATIONAL',
      titleAr: meta.titleAr,
      titleEn: meta.titleEn,
      descriptionAr: meta.descriptionAr,
      generatedAt: new Date().toISOString(),
      filtersApplied: filters,
      summary,
      columns,
      rows,
    };
  }

  /**
   * 9. Operation Source Breakdown Report (RP-23)
   * Analyzes count, weights, finalized settlements, and pending settlement counts across 8 source types.
   */
  public generateSourceBreakdownReport(trips: TripRecord[], filters: ReportFilterParams): ReportDataset {
    const meta = OPERATIONAL_REPORTS_METADATA.SOURCE_BREAKDOWN;
    const filtered = this.filterTrips(trips, filters);
    const summary = this.calculateSummary(filtered);

    const sourceMap = new Map<string, TripRecord[]>();
    const allKnownSources = ['WEIGHBRIDGE', 'MANUAL', 'EXCEL', 'CSV', 'GOOGLE_SHEETS', 'GOOGLE_DRIVE', 'API', 'MIGRATION'];

    // Initialize all known sources so they are visible even if 0
    allKnownSources.forEach(s => sourceMap.set(s, []));

    filtered.forEach(t => {
      const src = t.sourceType || t.loadingDataSource || 'WEIGHBRIDGE';
      const list = sourceMap.get(src) || [];
      list.push(t);
      sourceMap.set(src, list);
    });

    const sourceLabelsAr: Record<string, string> = {
      WEIGHBRIDGE: 'ميزان إلكتروني معتمد (Weighbridge)',
      MANUAL: 'إدخال يدوي ميداني (Manual Entry)',
      EXCEL: 'استيراد ملفات إكسل (Excel Import)',
      CSV: 'ملفات البيانات النصية (CSV)',
      GOOGLE_SHEETS: 'جداول جوجل المتزامنة (Google Sheets)',
      GOOGLE_DRIVE: 'ملفات سحابة جوجل (Google Drive)',
      API: 'واجهة الربط البرمجي (External API)',
      MIGRATION: 'ترحيل بيانات تاريخية (Legacy Migration)',
    };

    const rows: Record<string, any>[] = [];
    sourceMap.forEach((srcTrips, srcKey) => {
      // If no trips and not in filtered trips, only show if we had some or it's requested
      if (srcTrips.length === 0 && filtered.length > 0 && !allKnownSources.slice(0, 4).includes(srcKey)) {
        return;
      }

      const grpSummary = this.calculateSummary(srcTrips);
      const completed = srcTrips.filter(t => t.status === 'COMPLETED').length;

      rows.push({
        sourceType: srcKey,
        sourceTypeLabelAr: sourceLabelsAr[srcKey] || srcKey,
        tripsCount: srcTrips.length,
        completedCount: completed,
        totalNetTons: grpSummary.totalNetWeightTons,
        pricedTrips: grpSummary.pricedTrips,
        pendingSettlementTrips: grpSummary.pendingSettlementTrips,
        grossAmount: grpSummary.grossAmountSAR,
        netAmount: grpSummary.netAmountSAR,
      });
    });

    const columns: ReportColumnDef[] = [
      { key: 'sourceTypeLabelAr', labelAr: 'مصدر تسجيل العملية', labelEn: 'Operation Source', format: 'text', align: 'right' },
      { key: 'tripsCount', labelAr: 'عدد الرحلات', labelEn: 'Trips', format: 'number', align: 'center' },
      { key: 'completedCount', labelAr: 'المكتملة', labelEn: 'Completed', format: 'number', align: 'center' },
      { key: 'totalNetTons', labelAr: 'الأطنان المنقولة (طن)', labelEn: 'Total Tons', format: 'number', align: 'left' },
      { key: 'pricedTrips', labelAr: 'الرحلات المسعرة', labelEn: 'Priced Trips', format: 'number', align: 'center' },
      { key: 'pendingSettlementTrips', labelAr: 'معلقة التسوية', labelEn: 'Pending Settlement', format: 'number', align: 'center' },
      { key: 'grossAmount', labelAr: 'المبلغ الإجمالي (SAR)', labelEn: 'Gross SAR', format: 'currency', align: 'left' },
      { key: 'netAmount', labelAr: 'صافي المستحق المعتمد (SAR)', labelEn: 'Final Net SAR', format: 'currency', align: 'left' },
    ];

    return {
      reportType: 'SOURCE_BREAKDOWN',
      category: 'OPERATIONAL',
      titleAr: meta.titleAr,
      titleEn: meta.titleEn,
      descriptionAr: meta.descriptionAr,
      generatedAt: new Date().toISOString(),
      filtersApplied: filters,
      summary,
      columns,
      rows,
      notes: 'يعزل التقرير مبالغ الرحلات المعلقة عن صافي المستحق النهائي المعتمد وفقاً لقواعد التدقيق المالي.',
    };
  }

  // =========================================================================
  // 7 PRICING & FINANCIAL REPORTS GENERATORS
  // =========================================================================

  /**
   * 1. Settlement by Carrier (RP-24)
   */
  public generateSettlementByCarrierReport(trips: TripRecord[], filters: ReportFilterParams): ReportDataset {
    const meta = PRICING_REPORTS_METADATA.SETTLEMENT_BY_CARRIER;
    const filtered = this.filterTrips(trips, filters);
    const summary = this.calculateSummary(filtered);

    const carrierMap = new Map<string, TripRecord[]>();
    filtered.forEach(t => {
      const list = carrierMap.get(t.carrierId) || [];
      list.push(t);
      carrierMap.set(t.carrierId, list);
    });

    const rows: Record<string, any>[] = [];
    carrierMap.forEach((carrierTrips, carrierId) => {
      const labels = this.getEntityLabels(carrierTrips[0]);
      const grpSummary = this.calculateSummary(carrierTrips);

      const perTripCount = carrierTrips.filter(t => t.pricingType === 'PER_TRIP').length;
      const perTonCount = carrierTrips.filter(t => t.pricingType === 'PER_TON').length;

      let totalVarianceKg = 0;
      const sourceCounts = new Map<string, number>();
      carrierTrips.forEach(t => {
        if (t.varianceWeight) totalVarianceKg += t.varianceWeight;
        const src = t.sourceType || t.loadingDataSource || 'WEIGHBRIDGE';
        sourceCounts.set(src, (sourceCounts.get(src) || 0) + 1);
      });
      const sourceBreakdown = Array.from(sourceCounts.entries())
        .map(([src, count]) => `${src}: ${count}`)
        .join(', ');

      rows.push({
        carrierName: labels.carrierName,
        carrierId,
        totalTrips: carrierTrips.length,
        pricedTrips: grpSummary.pricedTrips,
        pendingTrips: grpSummary.pendingSettlementTrips,
        pricingSplit: `${perTonCount} طن / ${perTripCount} رد`,
        totalTons: grpSummary.totalNetWeightTons,
        grossAmount: grpSummary.grossAmountSAR,
        adjustments: grpSummary.adjustmentsSAR,
        exceptions: grpSummary.exceptionsSAR,
        demurrageAmount: grpSummary.totalDemurrageAmountSAR || 0,
        varianceKg: totalVarianceKg,
        netAmount: grpSummary.netAmountSAR,
        vat15: Math.round(grpSummary.netAmountSAR * 0.15 * 100) / 100,
        grandTotal: Math.round(grpSummary.netAmountSAR * 1.15 * 100) / 100,
        sourceBreakdown,
      });
    });

    const columns: ReportColumnDef[] = [
      { key: 'carrierName', labelAr: 'اسم الناقل اللوجستي', labelEn: 'Carrier Name', format: 'text', align: 'right' },
      { key: 'totalTrips', labelAr: 'إجمالي الرحلات', labelEn: 'Trips', format: 'number', align: 'center' },
      { key: 'pricedTrips', labelAr: 'المعتمدة مالياً', labelEn: 'Priced Trips', format: 'number', align: 'center' },
      { key: 'pendingTrips', labelAr: 'معلقة التسعير (Pending)', labelEn: 'Pending Trips', format: 'number', align: 'center' },
      { key: 'pricingSplit', labelAr: 'توزيع النماذج', labelEn: 'Pricing Models', format: 'text', align: 'center' },
      { key: 'totalTons', labelAr: 'إجمالي الأطنان', labelEn: 'Tons', format: 'number', align: 'left' },
      { key: 'grossAmount', labelAr: 'المبلغ الإجمالي (Gross)', labelEn: 'Gross SAR', format: 'currency', align: 'left' },
      { key: 'demurrageAmount', labelAr: 'بدل الانتظار المعتمد', labelEn: 'Demurrage SAR', format: 'currency', align: 'left' },
      { key: 'exceptions', labelAr: 'الاستثناءات والخصومات', labelEn: 'Exceptions SAR', format: 'currency', align: 'left' },
      { key: 'netAmount', labelAr: 'صافي المستحق النهائي (Net)', labelEn: 'Net SAR', format: 'currency', align: 'left' },
      { key: 'grandTotal', labelAr: 'المستحق شاملاً الضريبة (15%)', labelEn: 'Total with VAT', format: 'currency', align: 'left' },
    ];

    return {
      reportType: 'SETTLEMENT_BY_CARRIER',
      category: 'PRICING',
      titleAr: meta.titleAr,
      titleEn: meta.titleEn,
      descriptionAr: meta.descriptionAr,
      generatedAt: new Date().toISOString(),
      filtersApplied: filters,
      summary,
      columns,
      rows,
      notes: 'تُحتسب التسويات وفقاً للمبالغ التعاقدية المثبتة في لقطة التسعير (settlementAmount) لكل رحلة.',
    };
  }

  /**
   * 2. Settlement by Pricing Type
   */
  public generateSettlementByPricingTypeReport(trips: TripRecord[], filters: ReportFilterParams): ReportDataset {
    const meta = PRICING_REPORTS_METADATA.SETTLEMENT_BY_PRICING_TYPE;
    const filtered = this.filterTrips(trips, filters);
    const summary = this.calculateSummary(filtered);

    const typeMap = new Map<TripPricingType, TripRecord[]>();
    filtered.forEach(t => {
      const pType = (t.pricingSnapshot?.pricingType || t.pricingType || 'PER_TON') as TripPricingType;
      const list = typeMap.get(pType) || [];
      list.push(t);
      typeMap.set(pType, list);
    });

    const rows: Record<string, any>[] = [];
    (['PER_TON', 'PER_TRIP'] as TripPricingType[]).forEach(pType => {
      const pTrips = typeMap.get(pType) || [];
      const grpSummary = this.calculateSummary(pTrips);
      const titleAr = pType === 'PER_TON' ? 'تسعير بالوزن (سعر الطن المتري)' : 'تسعير مقطوعية (سعر الرحلة / الرد)';
      const formulaDescription = pType === 'PER_TON' ? 'مجموع صافي الأطنان × سعر الطن' : 'عدد الرحلات × سعر الرحلة';

      rows.push({
        pricingType: pType,
        pricingTitleAr: titleAr,
        formula: formulaDescription,
        tripsCount: pTrips.length,
        pricedTrips: grpSummary.pricedTrips,
        pendingTrips: grpSummary.pendingSettlementTrips,
        totalTons: grpSummary.totalNetWeightTons,
        grossAmount: grpSummary.grossAmountSAR,
        adjustments: grpSummary.adjustmentsSAR,
        exceptions: grpSummary.exceptionsSAR,
        netAmount: grpSummary.netAmountSAR,
        percentageOfTotal: summary.netAmountSAR > 0 ? Math.round((grpSummary.netAmountSAR / summary.netAmountSAR) * 100) : 0,
      });
    });

    const columns: ReportColumnDef[] = [
      { key: 'pricingTitleAr', labelAr: 'نموذج التسعير', labelEn: 'Pricing Model', format: 'text', align: 'right' },
      { key: 'formula', labelAr: 'قاعدة الحساب المعتمدة', labelEn: 'Formula', format: 'text', align: 'right' },
      { key: 'tripsCount', labelAr: 'عدد الردود', labelEn: 'Trips', format: 'number', align: 'center' },
      { key: 'pricedTrips', labelAr: 'المعتمدة مالياً', labelEn: 'Priced Trips', format: 'number', align: 'center' },
      { key: 'pendingTrips', labelAr: 'معلقة التسوية', labelEn: 'Pending', format: 'number', align: 'center' },
      { key: 'totalTons', labelAr: 'إجمالي الأطنان', labelEn: 'Tons', format: 'number', align: 'left' },
      { key: 'grossAmount', labelAr: 'المبلغ الإجمالي (Gross)', labelEn: 'Gross SAR', format: 'currency', align: 'left' },
      { key: 'adjustments', labelAr: 'التعديلات (Adjustments)', labelEn: 'Adjustments SAR', format: 'currency', align: 'left' },
      { key: 'exceptions', labelAr: 'الاستثناءات والخصومات', labelEn: 'Exceptions SAR', format: 'currency', align: 'left' },
      { key: 'netAmount', labelAr: 'صافي المستحق (Net)', labelEn: 'Net SAR', format: 'currency', align: 'left' },
      { key: 'percentageOfTotal', labelAr: 'الحصة من الإنفاق (%)', labelEn: '% of Spend', format: 'percent', align: 'center' },
    ];

    return {
      reportType: 'SETTLEMENT_BY_PRICING_TYPE',
      category: 'PRICING',
      titleAr: meta.titleAr,
      titleEn: meta.titleEn,
      descriptionAr: meta.descriptionAr,
      generatedAt: new Date().toISOString(),
      filtersApplied: filters,
      summary,
      columns,
      rows,
    };
  }

  /**
   * 3. Settlement by Material
   */
  public generateSettlementByMaterialReport(trips: TripRecord[], filters: ReportFilterParams): ReportDataset {
    const meta = PRICING_REPORTS_METADATA.SETTLEMENT_BY_MATERIAL;
    const filtered = this.filterTrips(trips, filters);
    const summary = this.calculateSummary(filtered);

    const matMap = new Map<string, TripRecord[]>();
    filtered.forEach(t => {
      const list = matMap.get(t.materialId) || [];
      list.push(t);
      matMap.set(t.materialId, list);
    });

    const rows: Record<string, any>[] = [];
    matMap.forEach((matTrips, materialId) => {
      const labels = this.getEntityLabels(matTrips[0]);
      const grpSummary = this.calculateSummary(matTrips);
      const avgCostPerTon = grpSummary.totalNetWeightTons > 0 ? (grpSummary.netAmountSAR / grpSummary.totalNetWeightTons).toFixed(2) : '0';

      rows.push({
        materialName: labels.materialName,
        materialCode: materialId,
        tripsCount: matTrips.length,
        pricedTrips: grpSummary.pricedTrips,
        pendingTrips: grpSummary.pendingSettlementTrips,
        totalTons: grpSummary.totalNetWeightTons,
        avgCostPerTon,
        grossAmount: grpSummary.grossAmountSAR,
        adjustments: grpSummary.adjustmentsSAR,
        exceptions: grpSummary.exceptionsSAR,
        netAmount: grpSummary.netAmountSAR,
      });
    });

    const columns: ReportColumnDef[] = [
      { key: 'materialName', labelAr: 'اسم المادة', labelEn: 'Material', format: 'text', align: 'right' },
      { key: 'tripsCount', labelAr: 'الردود', labelEn: 'Trips', format: 'number', align: 'center' },
      { key: 'pricedTrips', labelAr: 'المعتمدة', labelEn: 'Priced', format: 'number', align: 'center' },
      { key: 'pendingTrips', labelAr: 'معلقة', labelEn: 'Pending', format: 'number', align: 'center' },
      { key: 'totalTons', labelAr: 'الوزن المنقول (طن)', labelEn: 'Net Tons', format: 'number', align: 'left' },
      { key: 'avgCostPerTon', labelAr: 'متوسط تكلفة النقل/طن (SAR)', labelEn: 'Avg Cost/Ton', format: 'currency', align: 'center' },
      { key: 'grossAmount', labelAr: 'المبلغ الإجمالي (Gross)', labelEn: 'Gross SAR', format: 'currency', align: 'left' },
      { key: 'netAmount', labelAr: 'صافي المستحق (Net)', labelEn: 'Net SAR', format: 'currency', align: 'left' },
    ];

    return {
      reportType: 'SETTLEMENT_BY_MATERIAL',
      category: 'PRICING',
      titleAr: meta.titleAr,
      titleEn: meta.titleEn,
      descriptionAr: meta.descriptionAr,
      generatedAt: new Date().toISOString(),
      filtersApplied: filters,
      summary,
      columns,
      rows,
    };
  }

  /**
   * 4. Trip-based Settlement Report (PER_TRIP exclusively)
   */
  public generateTripBasedSettlementReport(trips: TripRecord[], filters: ReportFilterParams): ReportDataset {
    const meta = PRICING_REPORTS_METADATA.TRIP_BASED_SETTLEMENT;
    const filtered = this.filterTrips(trips, filters).filter(t => (t.pricingSnapshot?.pricingType || t.pricingType) === 'PER_TRIP');
    const summary = this.calculateSummary(filtered);

    const rows = filtered.map(t => {
      const labels = this.getEntityLabels(t);
      const breakdown = this.computeTripFinancialBreakdown(t);
      const rate = breakdown.isPending ? 0 : (t.pricingSnapshot?.agreedRate ?? t.agreedRate ?? 0);
      const tripsCount = 1;
      const formulaCheck = breakdown.isPending 
        ? 'معلق — بانتظار اعتماد عقد التسعير' 
        : `1 × ${rate.toLocaleString()} = ${(tripsCount * rate).toLocaleString()}`;

      const destInfo = this.resolveDestinationWeightInfo(t);

      return {
        tripSerial: t.tripSerial,
        ticketId: t.ticketId,
        shiftDate: t.shiftDate,
        carrierName: labels.carrierName,
        truckPlate: labels.truckPlate,
        materialName: labels.materialName,
        settlementStatus: breakdown.pricingStatusLabelAr,
        isPending: breakdown.isPending,
        sourceType: t.sourceType || t.loadingDataSource || 'WEIGHBRIDGE',
        pricingSnapshotAt: breakdown.pricingSnapshotAt,
        destinationWeightSource: destInfo.destinationWeightSource,
        destinationWeightSourceLabelAr: destInfo.destinationWeightSourceLabelAr,
        agreedRate: rate,
        tripsCount,
        formulaCheck,
        grossAmount: breakdown.grossAmount,
        adjustments: breakdown.adjustments,
        exceptions: breakdown.exceptions,
        netAmount: breakdown.netAmount,
        status: t.status,
      };
    });

    const columns: ReportColumnDef[] = [
      { key: 'tripSerial', labelAr: 'الرقم التسلسلي', labelEn: 'Trip Serial', format: 'text', align: 'right' },
      { key: 'ticketId', labelAr: 'تذكرة الميزان', labelEn: 'Ticket', format: 'text', align: 'right' },
      { key: 'shiftDate', labelAr: 'التاريخ', labelEn: 'Date', format: 'date', align: 'center' },
      { key: 'carrierName', labelAr: 'الناقل', labelEn: 'Carrier', format: 'text', align: 'right' },
      { key: 'truckPlate', labelAr: 'الشاحنة', labelEn: 'Truck', format: 'text', align: 'center' },
      { key: 'materialName', labelAr: 'المادة', labelEn: 'Material', format: 'text', align: 'right' },
      { key: 'settlementStatus', labelAr: 'حالة التسوية', labelEn: 'Settlement Status', format: 'badge', align: 'center' },
      { key: 'agreedRate', labelAr: 'سعر الرد المقطوع (SAR)', labelEn: 'Rate/Trip', format: 'currency', align: 'left' },
      { key: 'formulaCheck', labelAr: 'مطابقة المعادلة (عدد × سعر)', labelEn: 'Formula Verification', format: 'text', align: 'center' },
      { key: 'grossAmount', labelAr: 'الإجمالي (Gross)', labelEn: 'Gross SAR', format: 'currency', align: 'left' },
      { key: 'adjustments', labelAr: 'التعديلات', labelEn: 'Adjustments SAR', format: 'currency', align: 'left' },
      { key: 'exceptions', labelAr: 'الاستثناءات', labelEn: 'Exceptions SAR', format: 'currency', align: 'left' },
      { key: 'netAmount', labelAr: 'صافي المستحق (Net)', labelEn: 'Net SAR', format: 'currency', align: 'left' },
    ];

    return {
      reportType: 'TRIP_BASED_SETTLEMENT',
      category: 'PRICING',
      titleAr: meta.titleAr,
      titleEn: meta.titleEn,
      descriptionAr: meta.descriptionAr,
      generatedAt: new Date().toISOString(),
      filtersApplied: filters,
      summary,
      columns,
      rows,
      notes: 'قاعدة الحساب الصارمة: المبلغ = عدد الرحلات × سعر الرحلة. تعزل الرحلات معلقة التسعير من صافي المستحق النهائي.',
    };
  }

  /**
   * 5. Ton-based Settlement Report (PER_TON exclusively)
   */
  public generateTonBasedSettlementReport(trips: TripRecord[], filters: ReportFilterParams): ReportDataset {
    const meta = PRICING_REPORTS_METADATA.TON_BASED_SETTLEMENT;
    const filtered = this.filterTrips(trips, filters).filter(t => (t.pricingSnapshot?.pricingType || t.pricingType) === 'PER_TON');
    const summary = this.calculateSummary(filtered);

    const rows = filtered.map(t => {
      const labels = this.getEntityLabels(t);
      const breakdown = this.computeTripFinancialBreakdown(t);
      const netTons = (t.netWeight || 0) / 1000;
      const rate = breakdown.isPending ? 0 : (t.pricingSnapshot?.agreedRate ?? t.agreedRate ?? 0);
      const formulaCheck = breakdown.isPending
        ? 'معلق — بانتظار اعتماد عقد التسعير'
        : `${netTons.toFixed(2)} طن × ${rate} = ${(netTons * rate).toFixed(2)}`;

      const destInfo = this.resolveDestinationWeightInfo(t);

      return {
        tripSerial: t.tripSerial,
        ticketId: t.ticketId,
        shiftDate: t.shiftDate,
        carrierName: labels.carrierName,
        truckPlate: labels.truckPlate,
        materialName: labels.materialName,
        netWeightKg: (t.netWeight || 0).toLocaleString(),
        netTons: netTons.toFixed(2),
        settlementStatus: breakdown.pricingStatusLabelAr,
        isPending: breakdown.isPending,
        sourceType: t.sourceType || t.loadingDataSource || 'WEIGHBRIDGE',
        pricingSnapshotAt: breakdown.pricingSnapshotAt,
        destinationWeightSource: destInfo.destinationWeightSource,
        destinationWeightSourceLabelAr: destInfo.destinationWeightSourceLabelAr,
        agreedRate: rate,
        formulaCheck,
        grossAmount: breakdown.grossAmount,
        adjustments: breakdown.adjustments,
        exceptions: breakdown.exceptions,
        netAmount: breakdown.netAmount,
        status: t.status,
      };
    });

    const columns: ReportColumnDef[] = [
      { key: 'tripSerial', labelAr: 'الرقم التسلسلي', labelEn: 'Trip Serial', format: 'text', align: 'right' },
      { key: 'ticketId', labelAr: 'تذكرة الميزان', labelEn: 'Ticket', format: 'text', align: 'right' },
      { key: 'shiftDate', labelAr: 'التاريخ', labelEn: 'Date', format: 'date', align: 'center' },
      { key: 'carrierName', labelAr: 'الناقل', labelEn: 'Carrier', format: 'text', align: 'right' },
      { key: 'truckPlate', labelAr: 'الشاحنة', labelEn: 'Truck', format: 'text', align: 'center' },
      { key: 'netTons', labelAr: 'صافي الوزن (طن)', labelEn: 'Net Tons', format: 'number', align: 'left' },
      { key: 'settlementStatus', labelAr: 'حالة التسوية', labelEn: 'Settlement Status', format: 'badge', align: 'center' },
      { key: 'agreedRate', labelAr: 'سعر الطن المتفق (SAR)', labelEn: 'Rate/Ton', format: 'currency', align: 'left' },
      { key: 'formulaCheck', labelAr: 'مطابقة المعادلة (أطنان × سعر)', labelEn: 'Formula Verification', format: 'text', align: 'center' },
      { key: 'grossAmount', labelAr: 'الإجمالي (Gross)', labelEn: 'Gross SAR', format: 'currency', align: 'left' },
      { key: 'adjustments', labelAr: 'التعديلات', labelEn: 'Adjustments SAR', format: 'currency', align: 'left' },
      { key: 'exceptions', labelAr: 'الاستثناءات', labelEn: 'Exceptions SAR', format: 'currency', align: 'left' },
      { key: 'netAmount', labelAr: 'صافي المستحق (Net)', labelEn: 'Net SAR', format: 'currency', align: 'left' },
    ];

    return {
      reportType: 'TON_BASED_SETTLEMENT',
      category: 'PRICING',
      titleAr: meta.titleAr,
      titleEn: meta.titleEn,
      descriptionAr: meta.descriptionAr,
      generatedAt: new Date().toISOString(),
      filtersApplied: filters,
      summary,
      columns,
      rows,
      notes: 'قاعدة الحساب الصارمة: المبلغ = مجموع صافي الأطنان × سعر الطن. تعزل الرحلات معلقة التسعير من صافي المستحق النهائي.',
    };
  }

  /**
   * 6. Daily Settlement Report
   */
  public generateDailySettlementReport(trips: TripRecord[], filters: ReportFilterParams): ReportDataset {
    const meta = PRICING_REPORTS_METADATA.DAILY_SETTLEMENT;
    const filtered = this.filterTrips(trips, filters);
    const summary = this.calculateSummary(filtered);

    const dateMap = new Map<string, TripRecord[]>();
    filtered.forEach(t => {
      const list = dateMap.get(t.shiftDate) || [];
      list.push(t);
      dateMap.set(t.shiftDate, list);
    });

    const rows: Record<string, any>[] = [];
    Array.from(dateMap.keys()).sort().reverse().forEach(dateStr => {
      const grpTrips = dateMap.get(dateStr) || [];
      const grpSummary = this.calculateSummary(grpTrips);
      const perTonTrips = grpTrips.filter(t => (t.pricingSnapshot?.pricingType || t.pricingType) === 'PER_TON').length;
      const perTripTrips = grpTrips.filter(t => (t.pricingSnapshot?.pricingType || t.pricingType) === 'PER_TRIP').length;

      rows.push({
        shiftDate: dateStr,
        tripsCount: grpTrips.length,
        pricedTrips: grpSummary.pricedTrips,
        pendingTrips: grpSummary.pendingSettlementTrips,
        modelsSplit: `${perTonTrips} بالطن | ${perTripTrips} بالرد`,
        totalTons: grpSummary.totalNetWeightTons,
        grossAmount: grpSummary.grossAmountSAR,
        adjustments: grpSummary.adjustmentsSAR,
        exceptions: grpSummary.exceptionsSAR,
        netAmount: grpSummary.netAmountSAR,
        avgCostPerTrip: grpSummary.pricedTrips > 0 ? (grpSummary.netAmountSAR / grpSummary.pricedTrips).toFixed(2) : '0',
      });
    });

    const columns: ReportColumnDef[] = [
      { key: 'shiftDate', labelAr: 'تاريخ الاستحقاق اليومي', labelEn: 'Date', format: 'text', align: 'right' },
      { key: 'tripsCount', labelAr: 'عدد الردود', labelEn: 'Trips', format: 'number', align: 'center' },
      { key: 'pricedTrips', labelAr: 'المعتمدة مالياً', labelEn: 'Priced Trips', format: 'number', align: 'center' },
      { key: 'pendingTrips', labelAr: 'معلقة التسوية', labelEn: 'Pending', format: 'number', align: 'center' },
      { key: 'modelsSplit', labelAr: 'نماذج التسعير المنفذة', labelEn: 'Pricing Split', format: 'text', align: 'center' },
      { key: 'totalTons', labelAr: 'الأطنان الإجمالية', labelEn: 'Total Tons', format: 'number', align: 'left' },
      { key: 'grossAmount', labelAr: 'المبلغ الإجمالي (Gross)', labelEn: 'Gross SAR', format: 'currency', align: 'left' },
      { key: 'adjustments', labelAr: 'التعديلات (Adjustments)', labelEn: 'Adjustments SAR', format: 'currency', align: 'left' },
      { key: 'exceptions', labelAr: 'الاستثناءات والخصومات', labelEn: 'Exceptions SAR', format: 'currency', align: 'left' },
      { key: 'netAmount', labelAr: 'صافي المستحق اليومي (Net)', labelEn: 'Net SAR', format: 'currency', align: 'left' },
      { key: 'avgCostPerTrip', labelAr: 'متوسط تكلفة الرد المعتمد (SAR)', labelEn: 'Avg Cost/Trip', format: 'currency', align: 'center' },
    ];

    return {
      reportType: 'DAILY_SETTLEMENT',
      category: 'PRICING',
      titleAr: meta.titleAr,
      titleEn: meta.titleEn,
      descriptionAr: meta.descriptionAr,
      generatedAt: new Date().toISOString(),
      filtersApplied: filters,
      summary,
      columns,
      rows,
    };
  }

  /**
   * 7. Project Settlement Summary Report (RP-26, RP-28)
   * Enforces project isolation and resolves project names without static DEFAULT_PROJECTS.
   */
  public generateProjectSettlementSummaryReport(trips: TripRecord[], filters: ReportFilterParams): ReportDataset {
    const meta = PRICING_REPORTS_METADATA.PROJECT_SETTLEMENT_SUMMARY;
    const filtered = this.filterTrips(trips, filters);
    const summary = this.calculateSummary(filtered);

    const projectMap = new Map<string, TripRecord[]>();
    filtered.forEach(t => {
      const list = projectMap.get(t.projectId) || [];
      list.push(t);
      projectMap.set(t.projectId, list);
    });

    const rows: Record<string, any>[] = [];
    projectMap.forEach((prjTrips, projectId) => {
      const labels = this.getEntityLabels(prjTrips[0]);
      const grpSummary = this.calculateSummary(prjTrips);
      const vat = Math.round(grpSummary.netAmountSAR * 0.15 * 100) / 100;
      const totalPayable = Math.round(grpSummary.netAmountSAR * 1.15 * 100) / 100;

      const distinctMaterials = new Set(prjTrips.map(t => t.materialId)).size;
      const distinctCarriers = new Set(prjTrips.map(t => t.carrierId)).size;

      rows.push({
        projectId,
        projectName: labels.projectName,
        projectCode: projectId,
        clientName: 'جهة الإشراف والاعتماد المالي',
        tripsCount: prjTrips.length,
        pricedTrips: grpSummary.pricedTrips,
        pendingSettlementTrips: grpSummary.pendingSettlementTrips,
        materialsCount: distinctMaterials,
        carriersCount: distinctCarriers,
        totalTons: grpSummary.totalNetWeightTons,
        grossAmount: grpSummary.grossAmountSAR,
        adjustments: grpSummary.adjustmentsSAR,
        exceptions: grpSummary.exceptionsSAR,
        netAmount: grpSummary.netAmountSAR,
        vat15Amount: vat,
        totalPayableWithVAT: totalPayable,
      });
    });

    const columns: ReportColumnDef[] = [
      { key: 'projectName', labelAr: 'المشروع الإنشائي', labelEn: 'Project Name', format: 'text', align: 'right' },
      { key: 'tripsCount', labelAr: 'إجمالي الردود', labelEn: 'Trips', format: 'number', align: 'center' },
      { key: 'pricedTrips', labelAr: 'المعتمدة مالياً', labelEn: 'Priced Trips', format: 'number', align: 'center' },
      { key: 'pendingSettlementTrips', labelAr: 'معلقة التسوية', labelEn: 'Pending Settlement', format: 'number', align: 'center' },
      { key: 'materialsCount', labelAr: 'عدد المواد', labelEn: 'Materials', format: 'number', align: 'center' },
      { key: 'carriersCount', labelAr: 'عدد الناقلين', labelEn: 'Carriers', format: 'number', align: 'center' },
      { key: 'totalTons', labelAr: 'إجمالي الأطنان', labelEn: 'Total Tons', format: 'number', align: 'left' },
      { key: 'grossAmount', labelAr: 'المبلغ الإجمالي (Gross)', labelEn: 'Gross SAR', format: 'currency', align: 'left' },
      { key: 'netAmount', labelAr: 'صافي المستحق قبل الضريبة', labelEn: 'Net Pre-VAT', format: 'currency', align: 'left' },
      { key: 'vat15Amount', labelAr: 'ضريبة القيمة المضافة (15%)', labelEn: 'VAT 15%', format: 'currency', align: 'left' },
      { key: 'totalPayableWithVAT', labelAr: 'المستحق النهائي مع الضريبة', labelEn: 'Total with VAT', format: 'currency', align: 'left' },
    ];

    return {
      reportType: 'PROJECT_SETTLEMENT_SUMMARY',
      category: 'PRICING',
      titleAr: meta.titleAr,
      titleEn: meta.titleEn,
      descriptionAr: meta.descriptionAr,
      generatedAt: new Date().toISOString(),
      filtersApplied: filters,
      summary,
      columns,
      rows,
      notes: 'التقرير المالي التنفيذي العام لمستحقات عقود النقل والتوريد وفقاً لمعايير هيئة الزكاة والضريبة والجمارك (ZATCA).',
    };
  }

  /**
   * Universal Dispatcher: generates any report by its code.
   */
  public generateReport(type: ReportType, filters: ReportFilterParams): ReportDataset {
    const trips = tripEngineService.getTrips();

    switch (type) {
      // 9 Operational
      case 'DAILY_OPERATIONS':
        return this.generateDailyOperationsReport(trips, filters);
      case 'SHIFT_OPERATIONS':
        return this.generateShiftOperationsReport(trips, filters);
      case 'CARRIER_PERFORMANCE':
        return this.generateCarrierPerformanceReport(trips, filters);
      case 'MATERIAL_MOVEMENT':
        return this.generateMaterialMovementReport(trips, filters);
      case 'TRUCK_UTILIZATION':
        return this.generateTruckUtilizationReport(trips, filters);
      case 'WEIGHT_VARIANCE':
        return this.generateWeightVarianceReport(trips, filters);
      case 'RETURNED_TRIPS':
        return this.generateReturnedTripsReport(trips, filters);
      case 'EXCEPTION_REPORT':
        return this.generateExceptionReport(trips, filters);
      case 'SOURCE_BREAKDOWN':
        return this.generateSourceBreakdownReport(trips, filters);

      // 7 Pricing
      case 'SETTLEMENT_BY_CARRIER':
        return this.generateSettlementByCarrierReport(trips, filters);
      case 'SETTLEMENT_BY_PRICING_TYPE':
        return this.generateSettlementByPricingTypeReport(trips, filters);
      case 'SETTLEMENT_BY_MATERIAL':
        return this.generateSettlementByMaterialReport(trips, filters);
      case 'TRIP_BASED_SETTLEMENT':
        return this.generateTripBasedSettlementReport(trips, filters);
      case 'TON_BASED_SETTLEMENT':
        return this.generateTonBasedSettlementReport(trips, filters);
      case 'DAILY_SETTLEMENT':
        return this.generateDailySettlementReport(trips, filters);
      case 'PROJECT_SETTLEMENT_SUMMARY':
        return this.generateProjectSettlementSummaryReport(trips, filters);

      default:
        return this.generateDailyOperationsReport(trips, filters);
    }
  }

  // =========================================================================
  // EXPORTS: CSV (UTF-8 BOM), XLSX, PRINTABLE PDF (RP-29, RP-30, RP-31, RP-32)
  // =========================================================================

  /**
   * Exports dataset to a clean CSV formatted string with UTF-8 BOM.
   * Includes sourceType, pricingSnapshotAt, destinationWeightSource, and settlement status.
   */
  public exportDatasetToCSV(dataset: ReportDataset): string {
    const exportColumns = [...dataset.columns];

    // Ensure audit & traceability columns are present in export
    const hasSourceCol = exportColumns.some(c => c.key === 'sourceType' || c.key === 'sourceTypeLabelAr');
    const hasDestWeightCol = exportColumns.some(c => c.key === 'destinationWeightSource' || c.key === 'destinationWeightSourceLabelAr');
    const hasSnapshotCol = exportColumns.some(c => c.key === 'pricingSnapshotAt' || c.key === 'snapshotDate');
    const hasSettlementStatusCol = exportColumns.some(c => c.key === 'settlementStatus' || c.key === 'pricingStatusLabelAr');

    if (!hasSourceCol) {
      exportColumns.push({ key: 'sourceType', labelAr: 'مصدر العملية (Source Type)', labelEn: 'Source Type', format: 'text' });
    }
    if (!hasSnapshotCol) {
      exportColumns.push({ key: 'pricingSnapshotAt', labelAr: 'تاريخ لقطة التسعير (Snapshot Date)', labelEn: 'Snapshot Date', format: 'text' });
    }
    if (!hasDestWeightCol) {
      exportColumns.push({ key: 'destinationWeightSource', labelAr: 'مصدر وزن المقصد (Dest Weight Source)', labelEn: 'Dest Weight Source', format: 'text' });
    }
    if (!hasSettlementStatusCol) {
      exportColumns.push({ key: 'settlementStatus', labelAr: 'حالة التسوية (Settlement Status)', labelEn: 'Settlement Status', format: 'text' });
    }

    const headers = exportColumns.map(c => `"${c.labelAr}"`).join(',');
    const rows = dataset.rows.map(r => {
      return exportColumns.map(c => {
        let val = r[c.key];
        if (val === undefined || val === null) {
          if (c.key === 'sourceType') val = r.loadingDataSource || r.sourceTypeLabelAr || 'WEIGHBRIDGE';
          else if (c.key === 'pricingSnapshotAt') val = r.snapshotDate || r.shiftDate || new Date().toISOString().slice(0, 10);
          else if (c.key === 'destinationWeightSource') val = r.destinationWeightSourceLabelAr || (r.unloadDecision === 'ACCEPT_ORIGIN_NET_AS_DESTINATION' ? 'ORIGIN_NET_ACCEPTED' : 'DESTINATION_SCALE');
          else if (c.key === 'settlementStatus') val = r.pricingStatusLabelAr || (r.pendingTrips > 0 || r.isPending ? 'معلق التسوية (Pending)' : 'تسوية معتمدة (Finalized)');
          else val = '';
        }
        const escaped = String(val).replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(',');
    });

    return '\uFEFF' + [headers, ...rows].join('\r\n');
  }

  /**
   * Browser-triggered CSV file download.
   */
  public exportToCSV(dataset: ReportDataset): void {
    const csvContent = this.exportDatasetToCSV(dataset);
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const sanitizedTitle = dataset.titleAr.replace(/\s+/g, '_');
    link.download = `تقرير_${sanitizedTitle}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Exports dataset to a true binary Excel (.xlsx) file using SheetJS.
   */
  public exportToXLSX(dataset: ReportDataset): void {
    const csvString = this.exportDatasetToCSV(dataset);
    const lines = csvString.replace(/^\uFEFF/, '').split('\r\n');
    const tableData: any[][] = [];

    // Header info rows
    tableData.push([`منظومة النقل اللوجستي - ${dataset.titleAr}`]);
    tableData.push([`تاريخ الإصدار: ${new Date().toLocaleString('ar-SA')}`]);
    tableData.push([
      `المبلغ الإجمالي: ${dataset.summary.grossAmountSAR.toLocaleString()} SAR`,
      `التعديلات: ${dataset.summary.adjustmentsSAR.toLocaleString()} SAR`,
      `الخصومات: ${dataset.summary.exceptionsSAR.toLocaleString()} SAR`,
      `صافي المستحق المعتمد: ${dataset.summary.netAmountSAR.toLocaleString()} SAR`,
      `الرحلات المعتمدة: ${dataset.summary.pricedTrips}`,
      `الرحلات المعلقة: ${dataset.summary.pendingSettlementTrips}`,
    ]);
    tableData.push([]); // empty line

    lines.forEach(line => {
      if (!line.trim()) return;
      // Simple CSV line parser
      const row = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/^"|"$/g, '').replace(/""/g, '"'));
      tableData.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(tableData);

    if (!ws['!views']) ws['!views'] = [];
    ws['!views'].push({ rightToLeft: true });

    ws['!cols'] = (tableData[4] || []).map(() => ({ wch: 24 }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, dataset.titleAr.slice(0, 30));

    const sanitizedTitle = dataset.titleAr.replace(/\s+/g, '_');
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      XLSX.writeFile(wb, `تقرير_${sanitizedTitle}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    }
  }
}

export const reportsEngineService = new ReportsEngineService();
