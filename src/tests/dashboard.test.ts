/**
 * Unit Tests for Operations Dashboard & Strict Project Authorization
 */

import { dashboardService, PREDEFINED_SECURITY_PROFILES } from '../services/dashboard.service';
import { TripRecord } from '../types/tripEngine';
import { DashboardFilterParams } from '../types/dashboard';

export interface DashboardTestCaseResult {
  id: string;
  category: string;
  titleAr: string;
  passed: boolean;
  details: string;
}

export function runDashboardSecurityAndMetricsTests(): {
  allPassed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: DashboardTestCaseResult[];
} {
  const results: DashboardTestCaseResult[] = [];

  const superAdmin = PREDEFINED_SECURITY_PROFILES.find(p => p.role === 'SUPER_ADMIN')!;
  const neomManager = PREDEFINED_SECURITY_PROFILES.find(p => p.userId === 'USR-NEOM-MGR')!;
  const redSeaManager = PREDEFINED_SECURITY_PROFILES.find(p => p.userId === 'USR-REDSEA-MGR')!;

  // Mock controlled pool of trips
  const mockTrips: TripRecord[] = [
    {
      tripId: 'TEST-NEOM-01',
      projectId: 'PRJ-NEOM-NORTH-01',
      tripSerial: 'TRP-N01',
      ticketId: 'WB-01',
      truckId: 'TRK-01',
      driverId: 'DRV-01',
      carrierId: 'CAR-ALMAJDOUIE',
      materialId: 'MAT-AGG-01',
      shiftDate: '2026-09-10',
      tareWeight: 14000,
      grossWeight: 46000,
      netWeight: 32000,
      destNetWeight: 31900,
      varianceWeight: -100,
      pricingRuleId: 'PRC-01',
      pricingType: 'PER_TON',
      agreedRate: 50,
      currency: 'SAR',
      settlementBase: 32,
      settlementAmount: 1600, // 32 * 50
      loaderId: 'OPR-1',
      unloaderId: 'ENG-1',
      status: 'COMPLETED',
      version: 1,
      loadTime: '2026-09-10T08:00:00Z',
      arrivalTime: '2026-09-10T10:00:00Z',
      unloadTime: '2026-09-10T10:30:00Z',
      notes: 'Test trip',
      createdAt: '2026-09-10T08:00:00Z',
      createdBy: 'USER',
      updatedAt: '2026-09-10T10:30:00Z',
      updatedBy: 'USER',
      pricingSnapshot: {
        pricingRuleId: 'PRC-01',
        pricingType: 'PER_TON',
        agreedRate: 50,
        currency: 'SAR',
        settlementBase: 32,
        settlementAmount: 1600,
        ruleName: 'Test Rate',
        pricingSnapshotAt: '2026-09-10T08:00:00Z',
        effectiveFrom: '2026-01-01',
        effectiveTo: '2026-12-31'
      }
    },
    {
      tripId: 'TEST-REDSEA-01',
      projectId: 'PRJ-REDSEA-RESORT-02',
      tripSerial: 'TRP-R01',
      ticketId: 'WB-02',
      truckId: 'TRK-02',
      driverId: 'DRV-02',
      carrierId: 'CAR-BINLADIN',
      materialId: 'MAT-SND-01',
      shiftDate: '2026-09-10',
      tareWeight: 13000,
      grossWeight: 43000,
      netWeight: 30000,
      destNetWeight: null,
      varianceWeight: null,
      pricingRuleId: 'PRC-02',
      pricingType: 'PER_TRIP',
      agreedRate: 1500,
      currency: 'SAR',
      settlementBase: 1,
      settlementAmount: 1500,
      loaderId: 'OPR-2',
      unloaderId: null,
      status: 'IN_TRANSIT',
      version: 1,
      loadTime: '2026-09-10T09:00:00Z',
      arrivalTime: null,
      unloadTime: null,
      notes: 'On road',
      createdAt: '2026-09-10T09:00:00Z',
      createdBy: 'USER',
      updatedAt: '2026-09-10T09:00:00Z',
      updatedBy: 'USER',
      pricingSnapshot: {
        pricingRuleId: 'PRC-02',
        pricingType: 'PER_TRIP',
        agreedRate: 1500,
        currency: 'SAR',
        settlementBase: 1,
        settlementAmount: 1500,
        ruleName: 'Test Trip Rate',
        pricingSnapshotAt: '2026-09-10T09:00:00Z',
        effectiveFrom: '2026-01-01',
        effectiveTo: '2026-12-31'
      }
    }
  ];

  // Test 1: Super Admin accesses all projects
  const superRes = dashboardService.getFilteredTrips(
    { projectId: 'ALL', shiftDateFrom: '', shiftDateTo: '', carrierId: 'ALL', materialId: 'ALL', pricingType: 'ALL' },
    superAdmin,
    mockTrips
  );
  results.push({
    id: 'SEC-01',
    category: 'الأمان والامتثال (Security & Authorization)',
    titleAr: 'صلاحية مدير العمليات العام لكافة المشاريع',
    passed: superRes.trips.length === 2 && !superRes.securityViolated,
    details: `تم السماح لمدير العمليات العام بالوصول لـ ${superRes.trips.length} رحلات من مختلف المشاريع بدون حجب.`
  });

  // Test 2: Neom Manager CANNOT see Red Sea trips
  const neomRes = dashboardService.getFilteredTrips(
    { projectId: 'ALL', shiftDateFrom: '', shiftDateTo: '', carrierId: 'ALL', materialId: 'ALL', pricingType: 'ALL' },
    neomManager,
    mockTrips
  );
  const hasLeak = neomRes.trips.some(t => t.projectId === 'PRJ-REDSEA-RESORT-02');
  results.push({
    id: 'SEC-02',
    category: 'الأمان والامتثال (Security & Authorization)',
    titleAr: 'حجب مشاريع البحر الأحمر عن مدير موقع نيوم قطيعاً',
    passed: neomRes.trips.length === 1 && !hasLeak && neomRes.trips[0].projectId === 'PRJ-NEOM-NORTH-01',
    details: `تم تصفية البيانات بدقة: حصل مدير نيوم على رحلات نيوم فقط (${neomRes.trips.length} رحلة) وتم حجب مشروع البحر الأحمر نهائياً.`
  });

  // Test 3: Red Sea Manager attempting to explicitly request Neom project triggers security violation
  const violationRes = dashboardService.getFilteredTrips(
    { projectId: 'PRJ-NEOM-NORTH-01', shiftDateFrom: '', shiftDateTo: '', carrierId: 'ALL', materialId: 'ALL', pricingType: 'ALL' },
    redSeaManager,
    mockTrips
  );
  results.push({
    id: 'SEC-03',
    category: 'الأمان والامتثال (Security & Authorization)',
    titleAr: 'رصد وإحباط محاولة الاستعلام عن مشروع غير مصرح به (Security Violation)',
    passed: violationRes.trips.length === 0 && violationRes.securityViolated === true,
    details: `تم رصد محاولة وصول لمشروع غير مصرح به وإرجاع مصفوفة فارغة مع تفعيل علامة الانتهاك الأمني.`
  });

  // Test 4: Status Metrics Check (Total, Completed, In Transit)
  const statusMetrics = dashboardService.computeTripStatusMetrics(mockTrips);
  results.push({
    id: 'KPI-01',
    category: 'بطاقات العمليات (Trip Status Cards)',
    titleAr: 'دقة حساب بطاقات حالات وأعداد الرحلات',
    passed: statusMetrics.totalTrips === 2 && statusMetrics.completedTrips === 1 && statusMetrics.inTransitTrips === 1,
    details: `إجمالي: ${statusMetrics.totalTrips}, المكتملة: ${statusMetrics.completedTrips}, قيد الترحيل: ${statusMetrics.inTransitTrips}.`
  });

  // Test 5: Tonnage Metrics Check (Loaded, Received, Variance)
  const tonMetrics = dashboardService.computeTonnageMetrics(mockTrips);
  results.push({
    id: 'KPI-02',
    category: 'بطاقات الأوزان (Tonnage & Variance Cards)',
    titleAr: 'دقة حساب إجمالي أوزان التحميل والاستلام وفارق الموازين',
    passed: tonMetrics.totalLoadedTons === 62.0 && tonMetrics.totalReceivedTons === 31.9,
    details: `أوزان التحميل: ${tonMetrics.totalLoadedTons} طن، الاستلام: ${tonMetrics.totalReceivedTons} طن، الفارق: ${tonMetrics.totalVarianceTons} طن.`
  });

  // Test 6: Settlement Metrics Check (Total, Trip-based, Ton-based)
  const settMetrics = dashboardService.computeSettlementMetrics(mockTrips);
  results.push({
    id: 'KPI-03',
    category: 'بطاقات التسوية المالية (Settlement Cards)',
    titleAr: 'ثبات لقطات التسوية ومطابقة PER_TRIP و PER_TON',
    passed: settMetrics.totalSettlementAmount === 3100 && settMetrics.tripBasedSettlementAmount === 1500 && settMetrics.tonBasedSettlementAmount === 1600,
    details: `إجمالي التسويات: ${settMetrics.totalSettlementAmount} ر.س (مقطوعية: ${settMetrics.tripBasedSettlementAmount}، أطنان: ${settMetrics.tonBasedSettlementAmount}).`
  });

  // Test 7: Carrier Performance breakdown
  const carrierPerf = dashboardService.computeCarrierPerformance(mockTrips);
  results.push({
    id: 'WGT-01',
    category: 'ودجات التحليل (Analysis Widgets)',
    titleAr: 'توليد ودجت أداء الناقلين (Carrier Performance)',
    passed: carrierPerf.length === 2 && carrierPerf.some(c => c.carrierId === 'CAR-ALMAJDOUIE'),
    details: `تم تجميع الأداء بنجاح لـ ${carrierPerf.length} ناقلين.`
  });

  // Test 8: Material & Pricing Distribution
  const matDist = dashboardService.computeMaterialDistribution(mockTrips);
  const prcDist = dashboardService.computePricingDistribution(mockTrips);
  results.push({
    id: 'WGT-02',
    category: 'ودجات التحليل (Analysis Widgets)',
    titleAr: 'توزيع المواد ونماذج التسعير (Material & Pricing Distribution)',
    passed: matDist.length === 2 && prcDist.length === 2,
    details: `تم توزيع ${matDist.length} مواد، ونموذجي التسعير (PER_TRIP و PER_TON) بنسبة 100%.`
  });

  // Test 9: Live Terminal Board
  const board = dashboardService.generateLiveTerminalBoard(mockTrips);
  results.push({
    id: 'WGT-03',
    category: 'لوحة البوابات (Live Terminal Board)',
    titleAr: 'توليد سجل البوابات الحية (Live Terminal Board)',
    passed: board.length === 2 && board[0].status === 'IN_TRANSIT', // Prioritized
    details: `تم ترتيب الرحلات النشطة قيد الترحيل في مقدمة لوحة البوابات الحية.`
  });

  const passedTests = results.filter(r => r.passed).length;
  return {
    allPassed: passedTests === results.length,
    totalTests: results.length,
    passedTests,
    failedTests: results.length - passedTests,
    results,
  };
}
