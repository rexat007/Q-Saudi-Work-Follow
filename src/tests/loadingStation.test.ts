/**
 * Automated Test Suite for Loading Station Workflow & Calculation Rules
 */

import { tripEngineService } from '../services/tripEngine.service';
import { CreateTripParams } from '../types/tripEngine';

export interface LoadingStationTestResult {
  id: string;
  name: string;
  passed: boolean;
  expected: any;
  actual: any;
  notes: string;
}

export function runLoadingStationTests(): {
  allPassed: boolean;
  total: number;
  passed: number;
  failed: number;
  results: LoadingStationTestResult[];
} {
  const results: LoadingStationTestResult[] = [];

  // Test 1: PER_TON calculation (37.4 tons × 8.5 SAR = 317.90 SAR)
  {
    const tareWeight = 8200;
    const grossWeight = 45600;
    const netKg = grossWeight - tareWeight; // 37,400 kg
    const netTons = netKg / 1000; // 37.4 tons
    const rate = 8.5;
    const expectedSettlement = parseFloat((netTons * rate).toFixed(2)); // 317.90 SAR

    const params: CreateTripParams = {
      tripId: 'TRP-TEST-LS-01',
      projectId: 'PRJ-NEOM-001',
      carrierId: 'CAR-ALMAJDOUIE',
      truckId: 'TRK-9901',
      driverId: 'DRV-101',
      materialId: 'MAT-AGG-01',
      pricingRuleId: 'PRC-NEOM-HAUL-TON-8.5',
      shiftDate: '2026-09-09',
      tareWeight,
      grossWeight
    };

    const outcome = tripEngineService.createTripViaLoadingStation(params, {
      actorId: 'TEST-SCALE-OP',
      actorName: 'فاحص الميزان التجريبي'
    });

    const isAmountCorrect = outcome.trip.settlementAmount === 317.9;
    const isNetCorrect = outcome.trip.netWeight === 37400;
    const isStateInTransit = outcome.trip.status === 'IN_TRANSIT';
    const isLoadedEventEmitted = outcome.loadedEvent.toStatus === 'LOADED';
    const isTransitEventEmitted = outcome.transitEvent.toStatus === 'IN_TRANSIT';

    results.push({
      id: 'LS-01-PER-TON',
      name: 'احتساب تسعيرة الطن: 37.4 × 8.5 = 317.90 SAR',
      passed: isAmountCorrect && isNetCorrect && isStateInTransit && isLoadedEventEmitted && isTransitEventEmitted,
      expected: { settlement: 317.90, netWeight: 37400, status: 'IN_TRANSIT' },
      actual: { settlement: outcome.trip.settlementAmount, netWeight: outcome.trip.netWeight, status: outcome.trip.status },
      notes: 'تم التحقق من الحساب الخادومي والتسلسل الثلاثي للعمليات'
    });
  }

  // Test 2: PER_TRIP calculation (120 SAR flat rate)
  {
    const tareWeight = 14000;
    const grossWeight = 42000; // 28 tons
    const expectedSettlement = 120.0;

    const params: CreateTripParams = {
      tripId: 'TRP-TEST-LS-02',
      projectId: 'PRJ-NEOM-001',
      carrierId: 'CAR-ALMAJDOUIE',
      truckId: 'TRK-9901',
      driverId: 'DRV-101',
      materialId: 'MAT-AGG-01',
      pricingRuleId: 'PRC-NEOM-SHORT-TRIP-120',
      shiftDate: '2026-09-09',
      tareWeight,
      grossWeight
    };

    const outcome = tripEngineService.createTripViaLoadingStation(params);

    const isAmountCorrect = outcome.trip.settlementAmount === 120;
    const isBaseCorrect = outcome.trip.settlementBase === 1;
    const isStateInTransit = outcome.trip.status === 'IN_TRANSIT';

    results.push({
      id: 'LS-02-PER-TRIP',
      name: 'احتساب تسعيرة المقطوعية: 120 SAR للرد',
      passed: isAmountCorrect && isBaseCorrect && isStateInTransit,
      expected: { settlement: 120.0, base: 1, status: 'IN_TRANSIT' },
      actual: { settlement: outcome.trip.settlementAmount, base: outcome.trip.settlementBase, status: outcome.trip.status },
      notes: 'تم التحقق من تسعيرة الرد الثابتة بغض النظر عن وزن الحمولة'
    });
  }

  // Test 3: Enforcement of immutable settlement & rejection of client tampering
  {
    const params: CreateTripParams = {
      tripId: 'TRP-TEST-LS-03',
      projectId: 'PRJ-NEOM-001',
      carrierId: 'CAR-ALMAJDOUIE',
      truckId: 'TRK-9901',
      driverId: 'DRV-101',
      materialId: 'MAT-AGG-01',
      pricingRuleId: 'PRC-NEOM-HAUL-TON-8.5',
      shiftDate: '2026-09-09',
      tareWeight: 8200,
      grossWeight: 45600,
      clientNetWeight: 99999 // Tampered net weight
    };

    const outcome = tripEngineService.createTripViaLoadingStation(params);

    // Server should enforce 37,400 kg and 317.90 SAR, discarding clientNetWeight
    const rejectedTamper = outcome.trip.netWeight === 37400 && outcome.trip.settlementAmount === 317.9;
    const hasSecurityWarning = outcome.securityLog !== undefined;

    results.push({
      id: 'LS-03-SECURITY-ENFORCEMENT',
      name: 'منع تعديل التسوية أو الوزن الصافي من الواجهة',
      passed: rejectedTamper && hasSecurityWarning,
      expected: { netWeight: 37400, settlement: 317.9 },
      actual: { netWeight: outcome.trip.netWeight, settlement: outcome.trip.settlementAmount },
      notes: 'تم رفض الوزن المرسل من العميل واعتماد الحساب الخادومي الصارم'
    });
  }

  // Test 4: Rejection if grossWeight <= tareWeight
  {
    let rejected = false;
    try {
      tripEngineService.createTripViaLoadingStation({
        projectId: 'PRJ-NEOM-001',
        carrierId: 'CAR-ALMAJDOUIE',
        truckId: 'TRK-9901',
        driverId: 'DRV-101',
        materialId: 'MAT-AGG-01',
        pricingRuleId: 'PRC-NEOM-HAUL-TON-8.5',
        shiftDate: '2026-09-09',
        tareWeight: 20000,
        grossWeight: 18000 // Invalid!
      });
    } catch {
      rejected = true;
    }

    results.push({
      id: 'LS-04-WEIGHT-INVARIANT',
      name: 'حظر الرحلة في حال كان الوزن القائم أقل من أو يساوي الفارغ',
      passed: rejected,
      expected: 'Throw Exception',
      actual: rejected ? 'Throw Exception' : 'Did not throw',
      notes: 'تم منع إنشاء الرحلة بأوزان غير منطقية'
    });
  }

  // Clean up test trips so they do not pollute operational state
  tripEngineService.removeTrip('TRP-TEST-LS-01');
  tripEngineService.removeTrip('TRP-TEST-LS-02');
  tripEngineService.removeTrip('TRP-TEST-LS-03');

  const passedCount = results.filter(r => r.passed).length;
  return {
    allPassed: passedCount === results.length,
    total: results.length,
    passed: passedCount,
    failed: results.length - passedCount,
    results
  };
}
