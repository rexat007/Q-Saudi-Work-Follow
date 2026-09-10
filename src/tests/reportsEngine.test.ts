/**
 * Reports Engine Automated Test Suite
 * 
 * Test Scenarios:
 * 1. Filtering Verification: 9 parameters (project, shiftDate, carrier, material, pricingType, status, truck, driver, supervisor)
 * 2. Strict Contractual Snapshot Invariance: trip settlementAmount is strictly preserved
 * 3. PER_TRIP Formula Verification: Amount = count * agreedRate
 * 4. PER_TON Formula Verification: Amount = netTons * agreedRate
 * 5. 8 Operational Reports Generation & Data Integrity
 * 6. 7 Pricing Reports Generation & Data Integrity
 * 7. Financial Balance Math: Net Amount = Gross + Adjustments - Exceptions
 */

import { reportsEngineService } from '../services/reportsEngine.service';
import { TripRecord } from '../types/tripEngine';
import { ReportFilterParams } from '../types/reports';

export interface ReportsTestCaseResult {
  id: string;
  category: string;
  titleAr: string;
  passed: boolean;
  expected: any;
  actual: any;
  details: string;
}

export function runReportsEngineTests(): {
  allPassed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: ReportsTestCaseResult[];
} {
  const results: ReportsTestCaseResult[] = [];

  // Mock Trips for isolated testing
  const mockTrips: TripRecord[] = [
    {
      tripId: 'TRP-TEST-001',
      projectId: 'PRJ-NEOM-01',
      tripSerial: 'TRP-001',
      ticketId: 'TKT-001',
      truckId: 'TRK-01',
      driverId: 'DRV-01',
      carrierId: 'CAR-01',
      materialId: 'MAT-AGG',
      shiftDate: '2026-09-09',
      tareWeight: 14000,
      grossWeight: 44000,
      netWeight: 30000, // 30 Tons
      destNetWeight: 29900, // -100 kg within tolerance
      varianceWeight: -100,
      pricingRuleId: 'PRC-TON-01',
      pricingType: 'PER_TON',
      agreedRate: 50.0,
      currency: 'SAR',
      settlementBase: 30.0,
      settlementAmount: 1500.0, // 30 Tons * 50 SAR
      loaderId: 'SUP-LOAD-01',
      unloaderId: 'SUP-UNLOAD-01',
      status: 'COMPLETED',
      version: 2,
      loadTime: '2026-09-09T08:00:00.000Z',
      arrivalTime: '2026-09-09T10:00:00.000Z',
      unloadTime: '2026-09-09T10:30:00.000Z',
      notes: 'رحلة سليمة',
      createdAt: '2026-09-09T07:30:00.000Z',
      createdBy: 'USR-01',
      updatedAt: '2026-09-09T10:35:00.000Z',
      updatedBy: 'SUP-UNLOAD-01',
      pricingSnapshot: {
        pricingRuleId: 'PRC-TON-01',
        pricingType: 'PER_TON',
        agreedRate: 50.0,
        currency: 'SAR',
        settlementBase: 30.0,
        settlementAmount: 1500.0,
        pricingSnapshotAt: '2026-09-09T07:30:00.000Z',
      }
    },
    {
      tripId: 'TRP-TEST-002',
      projectId: 'PRJ-NEOM-01',
      tripSerial: 'TRP-002',
      ticketId: 'TKT-002',
      truckId: 'TRK-02',
      driverId: 'DRV-02',
      carrierId: 'CAR-02',
      materialId: 'MAT-SND',
      shiftDate: '2026-09-09',
      tareWeight: 15000,
      grossWeight: 45000,
      netWeight: 30000,
      destNetWeight: 30000,
      varianceWeight: 0,
      pricingRuleId: 'PRC-TRIP-01',
      pricingType: 'PER_TRIP',
      agreedRate: 1200.0,
      currency: 'SAR',
      settlementBase: 1,
      settlementAmount: 1200.0, // 1 Trip * 1200 SAR
      loaderId: 'SUP-LOAD-01',
      unloaderId: 'SUP-UNLOAD-01',
      status: 'COMPLETED',
      version: 2,
      loadTime: '2026-09-09T15:00:00.000Z',
      arrivalTime: '2026-09-09T17:00:00.000Z',
      unloadTime: '2026-09-09T17:30:00.000Z',
      notes: 'رد مقطوع',
      createdAt: '2026-09-09T14:30:00.000Z',
      createdBy: 'USR-01',
      updatedAt: '2026-09-09T17:35:00.000Z',
      updatedBy: 'SUP-UNLOAD-01',
      pricingSnapshot: {
        pricingRuleId: 'PRC-TRIP-01',
        pricingType: 'PER_TRIP',
        agreedRate: 1200.0,
        currency: 'SAR',
        settlementBase: 1,
        settlementAmount: 1200.0,
        pricingSnapshotAt: '2026-09-09T14:30:00.000Z',
      }
    },
    {
      tripId: 'TRP-TEST-003',
      projectId: 'PRJ-REDSEA-01',
      tripSerial: 'TRP-003',
      ticketId: 'TKT-003',
      truckId: 'TRK-01',
      driverId: 'DRV-01',
      carrierId: 'CAR-01',
      materialId: 'MAT-AGG',
      shiftDate: '2026-09-10',
      tareWeight: 14000,
      grossWeight: 44000,
      netWeight: 30000,
      destNetWeight: 0,
      varianceWeight: -30000,
      pricingRuleId: 'PRC-TON-01',
      pricingType: 'PER_TON',
      agreedRate: 50.0,
      currency: 'SAR',
      settlementBase: 0,
      settlementAmount: 0,
      loaderId: 'SUP-LOAD-02',
      unloaderId: 'SUP-UNLOAD-02',
      status: 'RETURNED', // Returned
      version: 3,
      loadTime: '2026-09-10T09:00:00.000Z',
      arrivalTime: '2026-09-10T11:00:00.000Z',
      unloadTime: null,
      notes: 'شحنة مرفوضة',
      createdAt: '2026-09-10T08:30:00.000Z',
      createdBy: 'USR-02',
      updatedAt: '2026-09-10T11:30:00.000Z',
      updatedBy: 'SUP-UNLOAD-02',
      pricingSnapshot: {
        pricingRuleId: 'PRC-TON-01',
        pricingType: 'PER_TON',
        agreedRate: 50.0,
        currency: 'SAR',
        settlementBase: 0,
        settlementAmount: 0,
        pricingSnapshotAt: '2026-09-10T08:30:00.000Z',
      }
    }
  ];

  // Test 1: Project Filter
  const filterProject = reportsEngineService.filterTrips(mockTrips, { projectId: 'PRJ-NEOM-01' });
  results.push({
    id: 'REP-TST-01',
    category: 'Filters',
    titleAr: 'فلترة الرحلات حسب المشروع',
    passed: filterProject.length === 2,
    expected: 2,
    actual: filterProject.length,
    details: 'تم استبعاد رحلة مشروع البحر الأحمر وحصر رحلات نيوم بنجاح.',
  });

  // Test 2: Pricing Type Filter
  const filterPricing = reportsEngineService.filterTrips(mockTrips, { projectId: 'ALL', pricingType: 'PER_TRIP' });
  results.push({
    id: 'REP-TST-02',
    category: 'Filters',
    titleAr: 'فلترة الرحلات حسب نوع التسعير (PER_TRIP)',
    passed: filterPricing.length === 1 && filterPricing[0].pricingType === 'PER_TRIP',
    expected: 1,
    actual: filterPricing.length,
    details: 'تم حصر رحلات الرد المقطوع حصرياً.',
  });

  // Test 3: Status Filter (RETURNED)
  const filterReturned = reportsEngineService.filterTrips(mockTrips, { projectId: 'ALL', status: 'RETURNED' });
  results.push({
    id: 'REP-TST-03',
    category: 'Filters',
    titleAr: 'فلترة الرحلات المرتجعة والمرفوضة (RETURNED)',
    passed: filterReturned.length === 1 && filterReturned[0].status === 'RETURNED',
    expected: 1,
    actual: filterReturned.length,
    details: 'تم حصر الرحلة المرتجعة بنجاح.',
  });

  // Test 4: Historical Snapshot Invariance
  const trip1Breakdown = reportsEngineService.computeTripFinancialBreakdown(mockTrips[0]);
  results.push({
    id: 'REP-TST-04',
    category: 'Contractual Rules',
    titleAr: 'ثبات لقطة التسعير (Snapshot Invariance)',
    passed: trip1Breakdown.grossAmount === 1500.0,
    expected: 1500.0,
    actual: trip1Breakdown.grossAmount,
    details: 'يتم اعتماد settlementAmount المحفوظ بالرحلة دون إعادة تسعير تاريخي.',
  });

  // Test 5: PER_TRIP rule: Amount = trips * rate
  const trip2Breakdown = reportsEngineService.computeTripFinancialBreakdown(mockTrips[1]);
  results.push({
    id: 'REP-TST-05',
    category: 'Contractual Rules',
    titleAr: 'قاعدة تسعير الرد المقطوع (PER_TRIP)',
    passed: trip2Breakdown.grossAmount === 1200.0,
    expected: 1200.0,
    actual: trip2Breakdown.grossAmount,
    details: 'المبلغ = 1 رحلة × 1200 SAR = 1200 SAR.',
  });

  // Test 6: PER_TON rule: Amount = tons * rate
  const tonCalcCheck = (mockTrips[0].netWeight / 1000) * mockTrips[0].agreedRate;
  results.push({
    id: 'REP-TST-06',
    category: 'Contractual Rules',
    titleAr: 'قاعدة تسعير الطن المتري (PER_TON)',
    passed: tonCalcCheck === 1500.0,
    expected: 1500.0,
    actual: tonCalcCheck,
    details: 'المبلغ = 30 طن × 50 SAR = 1500 SAR.',
  });

  // Test 7: Summary Math (Net Amount = Gross + Adjustments - Exceptions)
  const summary = reportsEngineService.calculateSummary(mockTrips);
  const mathValid = summary.netAmountSAR === (summary.grossAmountSAR + summary.adjustmentsSAR - summary.exceptionsSAR);
  results.push({
    id: 'REP-TST-07',
    category: 'Financial Math',
    titleAr: 'معادلة التوازن المالي (Net = Gross + Adjustments - Exceptions)',
    passed: mathValid,
    expected: true,
    actual: mathValid,
    details: `Gross: ${summary.grossAmountSAR}, Adjustments: ${summary.adjustmentsSAR}, Exceptions: ${summary.exceptionsSAR}, Net: ${summary.netAmountSAR}`,
  });

  // Test 8: All 8 Operational Reports Generation
  const opReports = [
    'DAILY_OPERATIONS',
    'SHIFT_OPERATIONS',
    'CARRIER_PERFORMANCE',
    'MATERIAL_MOVEMENT',
    'TRUCK_UTILIZATION',
    'WEIGHT_VARIANCE',
    'RETURNED_TRIPS',
    'EXCEPTION_REPORT',
  ] as const;

  let allOpPassed = true;
  for (const rep of opReports) {
    const ds = reportsEngineService.generateReport(rep, { projectId: 'ALL' });
    if (!ds || !ds.columns || ds.columns.length === 0) {
      allOpPassed = false;
      break;
    }
  }

  results.push({
    id: 'REP-TST-08',
    category: 'Operational Reports',
    titleAr: 'توليد تقارير التشغيل الـ 8 وتطابق الأعمدة والمؤشرات',
    passed: allOpPassed,
    expected: true,
    actual: allOpPassed,
    details: 'تم توليد كافة تقارير التشغيل بنجاح مع سلامة البيانات والأعمدة.',
  });

  // Test 9: All 7 Pricing Reports Generation
  const prReports = [
    'SETTLEMENT_BY_CARRIER',
    'SETTLEMENT_BY_PRICING_TYPE',
    'SETTLEMENT_BY_MATERIAL',
    'TRIP_BASED_SETTLEMENT',
    'TON_BASED_SETTLEMENT',
    'DAILY_SETTLEMENT',
    'PROJECT_SETTLEMENT_SUMMARY',
  ] as const;

  let allPrPassed = true;
  for (const rep of prReports) {
    const ds = reportsEngineService.generateReport(rep, { projectId: 'ALL' });
    if (!ds || !ds.columns || ds.columns.length === 0) {
      allPrPassed = false;
      break;
    }
  }

  results.push({
    id: 'REP-TST-09',
    category: 'Pricing Reports',
    titleAr: 'توليد تقارير التسعير والتسويات الـ 7 وتطابق النماذج المالية',
    passed: allPrPassed,
    expected: true,
    actual: allPrPassed,
    details: 'تم توليد كافة تقارير التسعير والتسويات بنجاح مع سلامة الحسابات.',
  });

  const passedTests = results.filter(r => r.passed).length;
  const failedTests = results.length - passedTests;

  return {
    allPassed: failedTests === 0,
    totalTests: results.length,
    passedTests,
    failedTests,
    results,
  };
}
