/**
 * Automated Test Suite: Unloading Station (محطة التفريغ والاستلام)
 *
 * Verifies strict adherence to prompt requirements:
 * 1. Search cascade: Primary tripSerial -> then ticketId -> then truckId.
 * 2. Prohibiting truckPlate alone to resolve a trip.
 * 3. Search outcome mapping: 0 -> NOT_FOUND, 1 -> CONTINUE, >1 -> AMBIGUOUS.
 * 4. Workflow transitions: IN_TRANSIT -> ARRIVED -> UNLOADING -> COMPLETED.
 * 5. Server-side authoritative calculations: destNetWeight, varianceWeight.
 * 6. Atomic updates: unloaderId, arrivalTime, unloadTime, destNetWeight, varianceWeight.
 * 7. Real Exception creation for out-of-tolerance variance (not merely a UI color).
 */

import { tripEngineService } from '../services/tripEngine.service';
import { tripStateMachine } from '../services/tripStateMachine.service';
import { TripRecord } from '../types/tripEngine';

export interface UnloadingTestResult {
  name: string;
  category: 'SEARCH_CASCADE' | 'PLATE_SECURITY' | 'MATCH_DISPOSITION' | 'TRANSITION_FLOW' | 'WEIGHT_CALC' | 'EXCEPTION_CREATION';
  passed: boolean;
  message: string;
  details?: any;
}

export function runUnloadingStationTestSuite(): {
  results: UnloadingTestResult[];
  allPassed: boolean;
  summary: { total: number; passed: number; failed: number };
} {
  const results: UnloadingTestResult[] = [];

  // Reset demo state before tests
  tripEngineService.resetTrips();

  // -------------------------------------------------------------------------
  // Test 1: Primary Search by tripSerial
  // -------------------------------------------------------------------------
  try {
    const searchResult = tripEngineService.searchTripForUnloading('TRP-NEOM-8892');
    const passed = searchResult.status === 'CONTINUE' && 
                   searchResult.matchedBy === 'tripSerial' && 
                   searchResult.trip?.tripSerial === 'TRP-NEOM-8892' &&
                   searchResult.count === 1;

    results.push({
      name: 'البحث الأساسي: المطابقة برقم الرحلة (tripSerial)',
      category: 'SEARCH_CASCADE',
      passed,
      message: passed 
        ? `نجح البحث الأساسي برقم السريال: ${searchResult.trip?.tripSerial} وأرجع حالة CONTINUE`
        : `فشل البحث: ${searchResult.messageAr}`
    });
  } catch (err: any) {
    results.push({
      name: 'البحث الأساسي: المطابقة برقم الرحلة (tripSerial)',
      category: 'SEARCH_CASCADE',
      passed: false,
      message: `استثناء غير متوقع: ${err.message}`
    });
  }

  // -------------------------------------------------------------------------
  // Test 2: Secondary Search by ticketId (when tripSerial does not match)
  // -------------------------------------------------------------------------
  try {
    const searchResult = tripEngineService.searchTripForUnloading('WB-TKT-99102');
    const passed = searchResult.status === 'CONTINUE' && 
                   searchResult.matchedBy === 'ticketId' && 
                   searchResult.trip?.ticketId === 'WB-TKT-99102' &&
                   searchResult.count === 1;

    results.push({
      name: 'البحث الثانوي: المطابقة برقم التذكرة (ticketId)',
      category: 'SEARCH_CASCADE',
      passed,
      message: passed 
        ? `نجح التدرج إلى التذكرة (${searchResult.trip?.ticketId}) بعد عدم تطابق tripSerial`
        : `فشل البحث: ${searchResult.messageAr}`
    });
  } catch (err: any) {
    results.push({
      name: 'البحث الثانوي: المطابقة برقم التذكرة (ticketId)',
      category: 'SEARCH_CASCADE',
      passed: false,
      message: `استثناء: ${err.message}`
    });
  }

  // -------------------------------------------------------------------------
  // Test 3: Tertiary Search by truckId
  // -------------------------------------------------------------------------
  try {
    // TRK-9902 exists for multiple or single trip
    const searchResult = tripEngineService.searchTripForUnloading('TRK-9902');
    const passed = (searchResult.status === 'CONTINUE' || searchResult.status === 'AMBIGUOUS') && 
                   searchResult.matchedBy === 'truckId' &&
                   searchResult.count > 0;

    results.push({
      name: 'البحث الثلاثي: المطابقة بمعرف الشاحنة (truckId)',
      category: 'SEARCH_CASCADE',
      passed,
      message: passed 
        ? `نجح التدرج لمعرف الشاحنة truckId (الحالة: ${searchResult.status}, العدد: ${searchResult.count})`
        : `فشل البحث: ${searchResult.messageAr}`
    });
  } catch (err: any) {
    results.push({
      name: 'البحث الثلاثي: المطابقة بمعرف الشاحنة (truckId)',
      category: 'SEARCH_CASCADE',
      passed: false,
      message: `استثناء: ${err.message}`
    });
  }

  // -------------------------------------------------------------------------
  // Test 4: Strict Prohibiton: Do NOT use truckPlate alone to resolve trip
  // -------------------------------------------------------------------------
  try {
    // "د هـ و 5678" is truck plate for TRK-9902
    const searchResult = tripEngineService.searchTripForUnloading('د هـ و 5678');
    const passed = searchResult.status === 'PLATE_ONLY_PROHIBITED';

    results.push({
      name: 'حظر أمني: منع استخدام لوحة الشاحنة (truckPlate) وحدها لتحديد الرحلة',
      category: 'PLATE_SECURITY',
      passed,
      message: passed 
        ? 'تم حظر البحث باللوحة المنفردة بنجاح وفق اشتراط: لا تستخدم truckPlate وحده لتحديد الرحلة'
        : `فشل الحظر: تم قبول البحث باللوحة بحالة ${searchResult.status}`
    });
  } catch (err: any) {
    results.push({
      name: 'حظر أمني: منع استخدام لوحة الشاحنة (truckPlate) وحدها لتحديد الرحلة',
      category: 'PLATE_SECURITY',
      passed: false,
      message: `استثناء: ${err.message}`
    });
  }

  // -------------------------------------------------------------------------
  // Test 5: Outcome mapping: 0 -> NOT_FOUND
  // -------------------------------------------------------------------------
  try {
    const searchResult = tripEngineService.searchTripForUnloading('NON-EXISTING-TRIP-SERIAL-99999');
    const passed = searchResult.status === 'NOT_FOUND' && searchResult.count === 0;

    results.push({
      name: 'قاعدة المطابقة: 0 نتائج تُرجع NOT_FOUND',
      category: 'MATCH_DISPOSITION',
      passed,
      message: passed 
        ? 'تم إرجاع NOT_FOUND بنجاح عند عدم وجود أي رحلة مطابقة'
        : `فشل التعيين: الحالة ${searchResult.status}`
    });
  } catch (err: any) {
    results.push({
      name: 'قاعدة المطابقة: 0 نتائج تُرجع NOT_FOUND',
      category: 'MATCH_DISPOSITION',
      passed: false,
      message: `استثناء: ${err.message}`
    });
  }

  // -------------------------------------------------------------------------
  // Test 6: Outcome mapping: 1 -> CONTINUE
  // -------------------------------------------------------------------------
  try {
    const searchResult = tripEngineService.searchTripForUnloading('TRP-NEOM-8891');
    const passed = searchResult.status === 'CONTINUE' && searchResult.count === 1 && !!searchResult.trip;

    results.push({
      name: 'قاعدة المطابقة: 1 نتيجة تُرجع CONTINUE',
      category: 'MATCH_DISPOSITION',
      passed,
      message: passed 
        ? 'تم إرجاع CONTINUE بنجاح عند العثور على رحلة واحدة مطابقة'
        : `فشل التعيين: الحالة ${searchResult.status}`
    });
  } catch (err: any) {
    results.push({
      name: 'قاعدة المطابقة: 1 نتيجة تُرجع CONTINUE',
      category: 'MATCH_DISPOSITION',
      passed: false,
      message: `استثناء: ${err.message}`
    });
  }

  // -------------------------------------------------------------------------
  // Test 7: Outcome mapping: >1 -> AMBIGUOUS
  // -------------------------------------------------------------------------
  try {
    // TRK-9901 has trips: TRP-2026-00891, TRP-2026-00893, TRP-2026-00896
    const searchResult = tripEngineService.searchTripForUnloading('TRK-9901');
    const passed = searchResult.status === 'AMBIGUOUS' && searchResult.count > 1 && !!searchResult.candidateTrips;

    results.push({
      name: 'قاعدة المطابقة: > 1 نتائج تُرجع AMBIGUOUS',
      category: 'MATCH_DISPOSITION',
      passed,
      message: passed 
        ? `تم إرجاع AMBIGUOUS بنجاح لوجود ${searchResult.count} رحلات للشاحنة وحظر التحديد العشوائي`
        : `فشل التعيين: الحالة ${searchResult.status}, العدد ${searchResult.count}`
    });
  } catch (err: any) {
    results.push({
      name: 'قاعدة المطابقة: > 1 نتائج تُرجع AMBIGUOUS',
      category: 'MATCH_DISPOSITION',
      passed: false,
      message: `استثناء: ${err.message}`
    });
  }

  // -------------------------------------------------------------------------
  // Test 8: State Transition: IN_TRANSIT -> ARRIVED (عند الوصول)
  // -------------------------------------------------------------------------
  try {
    // TRP-2026-00892 is IN_TRANSIT
    const arrivalTime = '2026-09-09T14:15:00.000Z';
    const arrivalResult = tripEngineService.processUnloadingArrival('TRP-2026-00892', arrivalTime);
    const passed = arrivalResult.trip.status === 'ARRIVED' && 
                   arrivalResult.trip.arrivalTime === arrivalTime &&
                   arrivalResult.event.action === 'STATUS_CHANGE_IN_TRANSIT_TO_ARRIVED';

    results.push({
      name: 'المسار التشغيلي: عند الوصول تحويل IN_TRANSIT إلى ARRIVED',
      category: 'TRANSITION_FLOW',
      passed,
      message: passed 
        ? `تم التحول بنجاح إلى ARRIVED مع تسجيل وقت الوصول (${arrivalTime})`
        : `فشل التحول: الحالة الحالية ${arrivalResult.trip.status}`
    });
  } catch (err: any) {
    results.push({
      name: 'المسار التشغيلي: عند الوصول تحويل IN_TRANSIT إلى ARRIVED',
      category: 'TRANSITION_FLOW',
      passed: false,
      message: `استثناء: ${err.message}`
    });
  }

  // -------------------------------------------------------------------------
  // Test 9: State Transition: ARRIVED -> UNLOADING (عند بدء التفريغ)
  // -------------------------------------------------------------------------
  try {
    const unloaderId = 'REC-NEOM-04';
    const startResult = tripEngineService.processUnloadingStart('TRP-2026-00892', unloaderId);
    const passed = startResult.trip.status === 'UNLOADING' && 
                   startResult.trip.unloaderId === unloaderId &&
                   startResult.event.action === 'STATUS_CHANGE_ARRIVED_TO_UNLOADING';

    results.push({
      name: 'المسار التشغيلي: عند بدء التفريغ تحويل ARRIVED إلى UNLOADING',
      category: 'TRANSITION_FLOW',
      passed,
      message: passed 
        ? `تم التحول بنجاح إلى UNLOADING مع تعيين مستلم الموقع (${unloaderId})`
        : `فشل التحول: الحالة الحالية ${startResult.trip.status}`
    });
  } catch (err: any) {
    results.push({
      name: 'المسار التشغيلي: عند بدء التفريغ تحويل ARRIVED إلى UNLOADING',
      category: 'TRANSITION_FLOW',
      passed: false,
      message: `استثناء: ${err.message}`
    });
  }

  // -------------------------------------------------------------------------
  // Test 10: Server Calculation: destNetWeight, varianceWeight, and 5-field atomic update
  // -------------------------------------------------------------------------
  try {
    // TRP-2026-00892 netWeight is 30,500 kg
    // Deliver destNetWeight: 30,350 kg (variance: -150 kg, within 1.5% tolerance)
    const completionResult = tripEngineService.completeUnloadingWithVariance({
      tripId: 'TRP-2026-00892',
      destNetWeight: 30350,
      unloaderId: 'REC-INSPECTOR-01',
      arrivalTime: '2026-09-09T14:15:00.000Z',
      unloadTime: '2026-09-09T15:00:00.000Z',
      notes: 'تفريغ مطابق ضمن التفاوت المسموح'
    });

    const trip = completionResult.trip;
    const isVarianceCorrect = completionResult.varianceWeight === -150;
    const isFieldsUpdated = trip.unloaderId === 'REC-INSPECTOR-01' &&
                            trip.arrivalTime === '2026-09-09T14:15:00.000Z' &&
                            trip.unloadTime === '2026-09-09T15:00:00.000Z' &&
                            trip.destNetWeight === 30350 &&
                            trip.varianceWeight === -150;
    const isCompleted = trip.status === 'COMPLETED';

    const passed = isVarianceCorrect && isFieldsUpdated && isCompleted && !completionResult.isOutOfTolerance;

    results.push({
      name: 'الحساب الخادومي والتحديث الذري للحقول الـ 5 والتحول إلى COMPLETED',
      category: 'WEIGHT_CALC',
      passed,
      message: passed 
        ? `تم الحساب الخادومي الدقيق: varianceWeight = ${completionResult.varianceWeight} كجم، وتحديث unloaderId, arrivalTime, unloadTime, destNetWeight, varianceWeight، وترقية الحالة إلى COMPLETED`
        : `فشل التحقق: variance=${completionResult.varianceWeight}, status=${trip.status}`
    });
  } catch (err: any) {
    results.push({
      name: 'الحساب الخادومي والتحديث الذري للحقول الـ 5 والتحول إلى COMPLETED',
      category: 'WEIGHT_CALC',
      passed: false,
      message: `استثناء: ${err.message}`
    });
  }

  // -------------------------------------------------------------------------
  // Test 11: Real Exception Creation on Out-of-Tolerance Variance
  // "إذا كان هناك فرق خارج tolerance: أنشئ Exception. ولا تعتبر الفرق مجرد لون في الواجهة."
  // -------------------------------------------------------------------------
  try {
    // Let's test with TRP-2026-00893 (currently UNLOADING, netWeight = 32,100 kg)
    // Send destNetWeight = 29,000 kg (variance = -3,100 kg, ~9.6% loss -> way outside 1.5% / 500kg tolerance)
    const completionResult = tripEngineService.completeUnloadingWithVariance({
      tripId: 'TRP-2026-00893',
      destNetWeight: 29000,
      unloaderId: 'REC-INSPECTOR-02',
      notes: 'عجز وزني كبير غير مبرر أثناء التفريغ',
      tolerancePercent: 1.5,
      toleranceKg: 500
    });

    const trip = completionResult.trip;
    const exceptions = tripEngineService.getTripExceptions('TRP-2026-00893');

    const hasRealExceptionObject = !!completionResult.exceptionCreated &&
                                   completionResult.exceptionCreated.type === 'WEIGHT_DISCREPANCY' &&
                                   completionResult.exceptionCreated.status === 'OPEN' &&
                                   completionResult.exceptionCreated.severity === 'BLOCKING' &&
                                   exceptions.length > 0 &&
                                   exceptions[0].exceptionId === completionResult.exceptionCreated.exceptionId;

    const tripFlagged = trip.hasExceptions === true && (trip.activeExceptionCount || 0) > 0;

    const passed = completionResult.isOutOfTolerance && hasRealExceptionObject && tripFlagged;

    results.push({
      name: 'إنشاء كائن استثناء رسمي (TripExceptionEntity) حقيقي وليس مجرد لون واجهة',
      category: 'EXCEPTION_CREATION',
      passed,
      message: passed 
        ? `تم إنشاء وتوثيق استثناء حقيقي في قاعدة البيانات: (${completionResult.exceptionCreated.exceptionId}) برتبة ${completionResult.exceptionCreated.severity} وحالة OPEN وربطه بسجل الرحلة والتدقيق`
        : `فشل التحقق: isOutOfTolerance=${completionResult.isOutOfTolerance}, hasRealObject=${hasRealExceptionObject}`
    });
  } catch (err: any) {
    results.push({
      name: 'إنشاء كائن استثناء رسمي (TripExceptionEntity) حقيقي وليس مجرد لون واجهة',
      category: 'EXCEPTION_CREATION',
      passed: false,
      message: `استثناء: ${err.message}`
    });
  }

  const passedCount = results.filter(r => r.passed).length;
  return {
    results,
    allPassed: passedCount === results.length,
    summary: {
      total: results.length,
      passed: passedCount,
      failed: results.length - passedCount
    }
  };
}
