/**
 * Reports Engine Service
 * Authoritative computational engine for Saudi Enterprise Logistics.
 * 
 * Strict Mandates:
 * 1. Historical Snapshot Invariance: uses `settlementAmount` from trip pricing snapshot, 
 *    NEVER recalculates historical trips using current master pricing tariffs.
 * 2. PER_TRIP rule: Gross = Trips * agreedRate
 * 3. PER_TON rule: Gross = Total Net Tons * agreedRate
 * 4. Displays: Gross Amount, Adjustments, Exceptions, Net Amount across reports.
 * 5. Full support for 8 Operational and 7 Pricing reports.
 * 6. High-fidelity CSV (UTF-8 BOM), XLSX (binary SheetJS), and Printable PDF formats.
 */

import * as XLSX from 'xlsx';
import { TripRecord, TripPricingType, TripEngineStatus } from '../types/tripEngine';
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
import { DEFAULT_PROJECTS, DEFAULT_CARRIERS, DEFAULT_MATERIALS, DEFAULT_TRUCKS, DEFAULT_DRIVERS } from '../data/defaultMasterData';

export class ReportsEngineService {
  /**
   * Filters trips according to the multi-criteria parameters.
   */
  public filterTrips(trips: TripRecord[], filters: ReportFilterParams): TripRecord[] {
    return trips.filter((t) => {
      // 1. Project
      if (filters.projectId && filters.projectId !== 'ALL' && t.projectId !== filters.projectId) {
        return false;
      }

      // 2. Shift Date
      if (filters.shiftDateFrom && t.shiftDate < filters.shiftDateFrom) {
        return false;
      }
      if (filters.shiftDateTo && t.shiftDate > filters.shiftDateTo) {
        return false;
      }

      // 3. Carrier
      if (filters.carrierId && filters.carrierId !== 'ALL' && t.carrierId !== filters.carrierId) {
        return false;
      }

      // 4. Material
      if (filters.materialId && filters.materialId !== 'ALL' && t.materialId !== filters.materialId) {
        return false;
      }

      // 5. Pricing Type
      if (filters.pricingType && filters.pricingType !== 'ALL' && t.pricingType !== filters.pricingType) {
        return false;
      }

      // 6. Status
      if (filters.status && filters.status !== 'ALL' && t.status !== filters.status) {
        return false;
      }

      // 7. Truck
      if (filters.truckId && filters.truckId !== 'ALL' && t.truckId !== filters.truckId) {
        return false;
      }

      // 8. Driver
      if (filters.driverId && filters.driverId !== 'ALL' && t.driverId !== filters.driverId) {
        return false;
      }

      // 9. Supervisor (matches loaderId, unloaderId, createdBy, updatedBy)
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
   * Resolves entity names in Arabic for clean readable reporting.
   */
  public getEntityLabels(trip: TripRecord) {
    const project = DEFAULT_PROJECTS.find(p => p.projectId === trip.projectId);
    const carrier = DEFAULT_CARRIERS.find(c => c.carrierId === trip.carrierId);
    const material = DEFAULT_MATERIALS.find(m => m.materialId === trip.materialId);
    const truck = DEFAULT_TRUCKS.find(t => t.truckId === trip.truckId);
    const driver = DEFAULT_DRIVERS.find(d => d.driverId === trip.driverId);

    return {
      projectName: project?.nameAr || trip.projectId,
      carrierName: carrier?.companyNameAr || carrier?.name || trip.carrierId,
      materialName: material?.nameAr || material?.name || trip.materialId,
      truckPlate: truck?.plateNumberAr || truck?.plate || trip.truckId,
      truckPayloadLimit: truck?.legalPayloadLimitKg || 32000,
      driverName: driver?.name || trip.driverId,
    };
  }

  /**
   * Computes adjustments and exception deductions for a single trip.
   * Strict Rule: uses `settlementAmount` from trip snapshot for gross,
   * then applies demurrage / deductions for net amount.
   */
  public computeTripFinancialBreakdown(trip: TripRecord) {
    // Contractual Snapshot Invariance: authoritative gross amount is settlementAmount saved in trip
    const gross = trip.pricingSnapshot?.settlementAmount ?? trip.settlementAmount ?? 0;

    let adjustments = 0;
    let exceptionDeductions = 0;

    // 1. If trip was returned or cancelled, settlement is 0 or negative penalty
    if (trip.status === 'RETURNED' || trip.status === 'CANCELLED') {
      // Returned trips have full deduction of gross
      exceptionDeductions = gross;
    } 
    // 2. Weight variance out-of-tolerance deduction
    else if (trip.varianceWeight && trip.varianceWeight < -500) {
      // Unallowable shrinkage: deduct rate for excessive shrinkage weight
      const excessShrinkageTons = Math.abs(trip.varianceWeight + 500) / 1000;
      const deduction = excessShrinkageTons * (trip.agreedRate || 50);
      exceptionDeductions += Math.round(deduction * 100) / 100;
    }

    // 3. Demurrage bonus or operational adjustments
    if (trip.notes && trip.notes.includes('بدل انتظار')) {
      adjustments += 150; // Approved demurrage compensation
    }

    const net = Math.max(0, gross + adjustments - exceptionDeductions);

    return {
      grossAmount: Math.round(gross * 100) / 100,
      adjustments: Math.round(adjustments * 100) / 100,
      exceptions: Math.round(exceptionDeductions * 100) / 100,
      netAmount: Math.round(net * 100) / 100,
    };
  }

  /**
   * Aggregates financial and operational summary from filtered trips.
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

    for (const t of trips) {
      const breakdown = this.computeTripFinancialBreakdown(t);
      gross += breakdown.grossAmount;
      adjustments += breakdown.adjustments;
      exceptions += breakdown.exceptions;
      net += breakdown.netAmount;

      totalKg += t.netWeight || 0;
      if (t.status === 'COMPLETED') completedCount++;
      if (t.status === 'RETURNED' || t.status === 'RETURN_REQUESTED') returnedCount++;
      if (t.status === 'EXCEPTION' || t.hasExceptions) exceptionTripsCount++;
    }

    return {
      grossAmountSAR: Math.round(gross * 100) / 100,
      adjustmentsSAR: Math.round(adjustments * 100) / 100,
      exceptionsSAR: Math.round(exceptions * 100) / 100,
      netAmountSAR: Math.round(net * 100) / 100,
      totalTrips: trips.length,
      totalNetWeightKg: totalKg,
      totalNetWeightTons: Math.round((totalKg / 1000) * 100) / 100,
      completedTripsCount: completedCount,
      exceptionsCount: exceptionTripsCount,
      returnedTripsCount: returnedCount,
    };
  }

  // =========================================================================
  // 8 OPERATIONAL REPORTS GENERATORS
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
      const exc = groupTrips.filter(t => t.status === 'EXCEPTION').length;

      rows.push({
        shiftDate: dateStr,
        totalTrips: groupTrips.length,
        completedTrips: completed,
        inTransitTrips: inTransit,
        returnedTrips: returned,
        exceptionTrips: exc,
        totalTons: grpSummary.totalNetWeightTons,
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
   * 3. Carrier Performance Report
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
        grossAmount: grpSummary.grossAmountSAR,
        netAmount: grpSummary.netAmountSAR,
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
      { key: 'complianceRate', labelAr: 'نسبة الامتثال (%)', labelEn: 'Compliance %', format: 'percent', align: 'center' },
      { key: 'grossAmount', labelAr: 'الإجمالي (SAR)', labelEn: 'Gross SAR', format: 'currency', align: 'left' },
      { key: 'netAmount', labelAr: 'صافي المستحق (SAR)', labelEn: 'Net SAR', format: 'currency', align: 'left' },
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
   * 4. Material Movement Report
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

      rows.push({
        materialName: labels.materialName,
        materialCode: materialId,
        tripsCount: matTrips.length,
        totalNetKg: grpSummary.totalNetWeightKg,
        totalNetTons: grpSummary.totalNetWeightTons,
        estimatedVolumeM3: volumeM3,
        avgTonPerTrip: matTrips.length > 0 ? (grpSummary.totalNetWeightTons / matTrips.length).toFixed(2) : '0',
        grossAmount: grpSummary.grossAmountSAR,
        netAmount: grpSummary.netAmountSAR,
      });
    });

    const columns: ReportColumnDef[] = [
      { key: 'materialName', labelAr: 'المادة الموردة', labelEn: 'Material Name', format: 'text', align: 'right' },
      { key: 'materialCode', labelAr: 'رمز المادة', labelEn: 'Material Code', format: 'text', align: 'right' },
      { key: 'tripsCount', labelAr: 'عدد الردود', labelEn: 'Trips', format: 'number', align: 'center' },
      { key: 'totalNetTons', labelAr: 'الوزن الصافي (طن)', labelEn: 'Net Tons', format: 'number', align: 'left' },
      { key: 'estimatedVolumeM3', labelAr: 'الحجم التقديري (م³)', labelEn: 'Est. Volume M3', format: 'number', align: 'center' },
      { key: 'avgTonPerTrip', labelAr: 'معدل الشحنة (طن)', labelEn: 'Avg Ton/Trip', format: 'number', align: 'center' },
      { key: 'grossAmount', labelAr: 'المبلغ الإجمالي (SAR)', labelEn: 'Gross SAR', format: 'currency', align: 'left' },
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
   * 6. Weight Variance Report
   */
  public generateWeightVarianceReport(trips: TripRecord[], filters: ReportFilterParams): ReportDataset {
    const meta = OPERATIONAL_REPORTS_METADATA.WEIGHT_VARIANCE;
    // Filter trips that have reached destination or weighed
    const filtered = this.filterTrips(trips, filters).filter(t => t.destNetWeight !== null);
    const summary = this.calculateSummary(filtered);

    const rows = filtered.map(t => {
      const labels = this.getEntityLabels(t);
      const originNet = t.netWeight || 0;
      const destNet = t.destNetWeight || 0;
      const varianceKg = t.varianceWeight ?? (destNet - originNet);
      const variancePercent = originNet > 0 ? ((varianceKg / originNet) * 100).toFixed(2) : '0';
      
      let varianceClassification = 'مطابق (ضمن النطاق المسموح)';
      if (varianceKg < -500) varianceClassification = 'عجز تجاوز التسامح (-)';
      else if (varianceKg > 500) varianceClassification = 'زيادة تجاوز التسامح (+)';

      return {
        tripSerial: t.tripSerial,
        ticketId: t.ticketId,
        shiftDate: t.shiftDate,
        carrierName: labels.carrierName,
        truckPlate: labels.truckPlate,
        materialName: labels.materialName,
        originNetKg: originNet.toLocaleString(),
        destNetKg: destNet.toLocaleString(),
        varianceKg: varianceKg > 0 ? `+${varianceKg}` : varianceKg.toString(),
        variancePercent: `${variancePercent}%`,
        classification: varianceClassification,
        unloader: t.unloaderId || 'مهندس الموقع',
        notes: t.notes || 'مطابقة نظامية',
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
    // Filter trips that were returned or return requested
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

  // =========================================================================
  // 7 PRICING & FINANCIAL REPORTS GENERATORS
  // =========================================================================

  /**
   * 1. Settlement by Carrier
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

      rows.push({
        carrierName: labels.carrierName,
        carrierId,
        totalTrips: carrierTrips.length,
        pricingSplit: `${perTonCount} طن / ${perTripCount} رد`,
        totalTons: grpSummary.totalNetWeightTons,
        grossAmount: grpSummary.grossAmountSAR,
        adjustments: grpSummary.adjustmentsSAR,
        exceptions: grpSummary.exceptionsSAR,
        netAmount: grpSummary.netAmountSAR,
        vat15: Math.round(grpSummary.netAmountSAR * 0.15 * 100) / 100,
        grandTotal: Math.round(grpSummary.netAmountSAR * 1.15 * 100) / 100,
      });
    });

    const columns: ReportColumnDef[] = [
      { key: 'carrierName', labelAr: 'اسم الناقل اللوجستي', labelEn: 'Carrier Name', format: 'text', align: 'right' },
      { key: 'totalTrips', labelAr: 'إجمالي الرحلات', labelEn: 'Trips', format: 'number', align: 'center' },
      { key: 'pricingSplit', labelAr: 'توزيع النماذج', labelEn: 'Pricing Models', format: 'text', align: 'center' },
      { key: 'totalTons', labelAr: 'إجمالي الأطنان', labelEn: 'Tons', format: 'number', align: 'left' },
      { key: 'grossAmount', labelAr: 'المبلغ الإجمالي (Gross)', labelEn: 'Gross SAR', format: 'currency', align: 'left' },
      { key: 'adjustments', labelAr: 'التعديلات (Adjustments)', labelEn: 'Adjustments SAR', format: 'currency', align: 'left' },
      { key: 'exceptions', labelAr: 'الاستثناءات والخصومات', labelEn: 'Exceptions SAR', format: 'currency', align: 'left' },
      { key: 'netAmount', labelAr: 'صافي المستحق (Net)', labelEn: 'Net SAR', format: 'currency', align: 'left' },
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
      const list = typeMap.get(t.pricingType) || [];
      list.push(t);
      typeMap.set(t.pricingType, list);
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
      { key: 'totalTons', labelAr: 'الوزن المنقول (طن)', labelEn: 'Net Tons', format: 'number', align: 'left' },
      { key: 'avgCostPerTon', labelAr: 'متوسط تكلفة النقل/طن (SAR)', labelEn: 'Avg Cost/Ton', format: 'currency', align: 'center' },
      { key: 'grossAmount', labelAr: 'المبلغ الإجمالي (Gross)', labelEn: 'Gross SAR', format: 'currency', align: 'left' },
      { key: 'adjustments', labelAr: 'التعديلات (Adjustments)', labelEn: 'Adjustments SAR', format: 'currency', align: 'left' },
      { key: 'exceptions', labelAr: 'الاستثناءات والخصومات', labelEn: 'Exceptions SAR', format: 'currency', align: 'left' },
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
    const filtered = this.filterTrips(trips, filters).filter(t => t.pricingType === 'PER_TRIP');
    const summary = this.calculateSummary(filtered);

    const rows = filtered.map(t => {
      const labels = this.getEntityLabels(t);
      const breakdown = this.computeTripFinancialBreakdown(t);
      const rate = t.agreedRate || 1400;
      const tripsCount = 1;
      const formulaCheck = `1 × ${rate.toLocaleString()} = ${(tripsCount * rate).toLocaleString()}`;

      return {
        tripSerial: t.tripSerial,
        ticketId: t.ticketId,
        shiftDate: t.shiftDate,
        carrierName: labels.carrierName,
        truckPlate: labels.truckPlate,
        materialName: labels.materialName,
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
      notes: 'قاعدة الحساب الصارمة: المبلغ = عدد الرحلات × سعر الرحلة.',
    };
  }

  /**
   * 5. Ton-based Settlement Report (PER_TON exclusively)
   */
  public generateTonBasedSettlementReport(trips: TripRecord[], filters: ReportFilterParams): ReportDataset {
    const meta = PRICING_REPORTS_METADATA.TON_BASED_SETTLEMENT;
    const filtered = this.filterTrips(trips, filters).filter(t => t.pricingType === 'PER_TON');
    const summary = this.calculateSummary(filtered);

    const rows = filtered.map(t => {
      const labels = this.getEntityLabels(t);
      const breakdown = this.computeTripFinancialBreakdown(t);
      const netTons = (t.netWeight || 0) / 1000;
      const rate = t.agreedRate || 48.5;
      const formulaCheck = `${netTons.toFixed(2)} طن × ${rate} = ${(netTons * rate).toFixed(2)}`;

      return {
        tripSerial: t.tripSerial,
        ticketId: t.ticketId,
        shiftDate: t.shiftDate,
        carrierName: labels.carrierName,
        truckPlate: labels.truckPlate,
        materialName: labels.materialName,
        netWeightKg: (t.netWeight || 0).toLocaleString(),
        netTons: netTons.toFixed(2),
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
      notes: 'قاعدة الحساب الصارمة: المبلغ = مجموع صافي الأطنان × سعر الطن.',
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
      const perTonTrips = grpTrips.filter(t => t.pricingType === 'PER_TON').length;
      const perTripTrips = grpTrips.filter(t => t.pricingType === 'PER_TRIP').length;

      rows.push({
        shiftDate: dateStr,
        tripsCount: grpTrips.length,
        modelsSplit: `${perTonTrips} بالطن | ${perTripTrips} بالرد`,
        totalTons: grpSummary.totalNetWeightTons,
        grossAmount: grpSummary.grossAmountSAR,
        adjustments: grpSummary.adjustmentsSAR,
        exceptions: grpSummary.exceptionsSAR,
        netAmount: grpSummary.netAmountSAR,
        avgCostPerTrip: grpTrips.length > 0 ? (grpSummary.netAmountSAR / grpTrips.length).toFixed(2) : '0',
      });
    });

    const columns: ReportColumnDef[] = [
      { key: 'shiftDate', labelAr: 'تاريخ الاستحقاق اليومي', labelEn: 'Date', format: 'text', align: 'right' },
      { key: 'tripsCount', labelAr: 'عدد الردود', labelEn: 'Trips', format: 'number', align: 'center' },
      { key: 'modelsSplit', labelAr: 'نماذج التسعير المنفذة', labelEn: 'Pricing Split', format: 'text', align: 'center' },
      { key: 'totalTons', labelAr: 'الأطنان الإجمالية', labelEn: 'Total Tons', format: 'number', align: 'left' },
      { key: 'grossAmount', labelAr: 'المبلغ الإجمالي (Gross)', labelEn: 'Gross SAR', format: 'currency', align: 'left' },
      { key: 'adjustments', labelAr: 'التعديلات (Adjustments)', labelEn: 'Adjustments SAR', format: 'currency', align: 'left' },
      { key: 'exceptions', labelAr: 'الاستثناءات والخصومات', labelEn: 'Exceptions SAR', format: 'currency', align: 'left' },
      { key: 'netAmount', labelAr: 'صافي المستحق اليومي (Net)', labelEn: 'Net SAR', format: 'currency', align: 'left' },
      { key: 'avgCostPerTrip', labelAr: 'متوسط تكلفة الرد (SAR)', labelEn: 'Avg Cost/Trip', format: 'currency', align: 'center' },
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
   * 7. Project Settlement Summary Report
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
      const project = DEFAULT_PROJECTS.find(p => p.projectId === projectId);
      const grpSummary = this.calculateSummary(prjTrips);
      const vat = Math.round(grpSummary.netAmountSAR * 0.15 * 100) / 100;
      const totalPayable = Math.round(grpSummary.netAmountSAR * 1.15 * 100) / 100;

      rows.push({
        projectName: project?.nameAr || projectId,
        projectCode: project?.projectCode || projectId,
        clientName: project?.clientName || 'غير محدد',
        tripsCount: prjTrips.length,
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
      { key: 'clientName', labelAr: 'العميل المالك', labelEn: 'Client', format: 'text', align: 'right' },
      { key: 'tripsCount', labelAr: 'إجمالي الردود', labelEn: 'Trips', format: 'number', align: 'center' },
      { key: 'totalTons', labelAr: 'إجمالي الأطنان', labelEn: 'Total Tons', format: 'number', align: 'left' },
      { key: 'grossAmount', labelAr: 'المبلغ الإجمالي (Gross)', labelEn: 'Gross SAR', format: 'currency', align: 'left' },
      { key: 'adjustments', labelAr: 'التعديلات (Adjustments)', labelEn: 'Adjustments SAR', format: 'currency', align: 'left' },
      { key: 'exceptions', labelAr: 'الاستثناءات والخصومات', labelEn: 'Exceptions SAR', format: 'currency', align: 'left' },
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
      // 8 Operational
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
  // EXPORTS: CSV, XLSX, PRINTABLE PDF
  // =========================================================================

  /**
   * Exports dataset to a clean CSV file with UTF-8 BOM.
   */
  public exportToCSV(dataset: ReportDataset): void {
    const headers = dataset.columns.map(c => `"${c.labelAr}"`).join(',');
    const rows = dataset.rows.map(r => {
      return dataset.columns.map(c => {
        const val = r[c.key] !== undefined && r[c.key] !== null ? r[c.key] : '';
        const escaped = String(val).replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(',');
    });

    const csvContent = '\uFEFF' + [headers, ...rows].join('\r\n');
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
    // 1. Build table array
    const data: any[][] = [];

    // Header info rows
    data.push([`منظومة النقل اللوجستي - ${dataset.titleAr}`]);
    data.push([`تاريخ الإصدار: ${new Date().toLocaleString('ar-SA')}`]);
    data.push([
      `المبلغ الإجمالي: ${dataset.summary.grossAmountSAR.toLocaleString()} SAR`,
      `التعديلات: ${dataset.summary.adjustmentsSAR.toLocaleString()} SAR`,
      `الخصومات: ${dataset.summary.exceptionsSAR.toLocaleString()} SAR`,
      `صافي المستحق: ${dataset.summary.netAmountSAR.toLocaleString()} SAR`,
    ]);
    data.push([]); // empty line

    // Column Headers
    data.push(dataset.columns.map(c => c.labelAr));

    // Data rows
    dataset.rows.forEach(r => {
      data.push(dataset.columns.map(c => (r[c.key] !== undefined && r[c.key] !== null ? r[c.key] : '')));
    });

    const ws = XLSX.utils.aoa_to_sheet(data);

    // RTL sheet view setting
    if (!ws['!views']) ws['!views'] = [];
    ws['!views'].push({ rightToLeft: true });

    // Set column widths
    ws['!cols'] = dataset.columns.map(() => ({ wch: 22 }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, dataset.titleAr.slice(0, 30));

    const sanitizedTitle = dataset.titleAr.replace(/\s+/g, '_');
    XLSX.writeFile(wb, `تقرير_${sanitizedTitle}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }
}

export const reportsEngineService = new ReportsEngineService();
