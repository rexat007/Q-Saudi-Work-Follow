/**
 * Conflict Resolution Verification Test Suite
 * 
 * Programmatically verifies user mandates:
 * 1. The 7 Conflict Types:
 *    - VERSION_CONFLICT
 *    - PRICING_CHANGED
 *    - TRIP_ALREADY_COMPLETED
 *    - TRIP_ALREADY_RETURNED
 *    - DUPLICATE_OPERATION
 *    - TRUCK_CARRIER_CONFLICT
 *    - MASTER_DATA_CHANGED
 * 
 * 2. Strict Conflict Handling Mandates:
 *    - Anti-LWW: NEVER use "Last Write Wins" for operational trips
 *    - Preserve local command (operation payload, device ID, client timestamp)
 *    - Preserve server state (authoritative snapshot, server version, reason)
 *    - Create conflict record (unique ID, status 'OPEN', audit diffs)
 *    - Notify user (callback invocation with security/warning details)
 *    - Require explicit resolution (mandates strategy, supervisor identity, audit trail)
 * 
 * 3. Pricing Invariance Guarantee:
 *    - If a trip was created offline with a valid Pricing Snapshot, its value is NEVER altered by server price updates.
 *    - The new server price applies strictly to future trips.
 */

import { conflictResolutionService } from '../services/offline/conflictResolution.service';
import { tripEngineService, MASTER_PRICING_RULES } from '../services/tripEngine.service';
import { ConflictType, ResolutionStrategy } from '../types/conflict';
import { OutboxOperation } from '../types/offline';

export interface ConflictTestCaseResult {
  id: string;
  nameAr: string;
  nameEn: string;
  category: 'CONFLICT_DETECTION' | 'MANDATES_VERIFICATION' | 'PRICING_INVARIANCE' | 'EXPLICIT_RESOLUTION';
  passed: boolean;
  expected: string;
  actual: string;
  details: string;
}

export async function runConflictResolutionTestSuite(): Promise<{
  allPassed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: ConflictTestCaseResult[];
}> {
  const results: ConflictTestCaseResult[] = [];
  const nowIso = new Date().toISOString();

  // ---------------------------------------------------------------------------
  // Category 1: Detection of all 7 Conflict Types
  // ---------------------------------------------------------------------------

  // Test 1: VERSION_CONFLICT
  {
    const existing = tripEngineService.getTrips().find(t => t.status !== 'COMPLETED' && t.status !== 'RETURNED' && (t.version || 1) > 1) 
      || tripEngineService.getTrips()[2] 
      || tripEngineService.getTrips()[0];
    const op: OutboxOperation = {
      operationId: `OP-TEST-VER-${Date.now()}`,
      projectId: existing?.projectId || 'PRJ-NEOM-NORTH',
      userId: 'TESTER-01',
      deviceId: 'DEV-TEST-01',
      operationType: 'UPDATE_TRIP_STATUS',
      createdAt: nowIso,
      retryCount: 0,
      status: 'PENDING',
      payload: {
        tripId: existing?.tripId || 'TRP-101',
        tripSerial: existing?.tripSerial || 'TRP-NEOM-9021',
        ticketId: existing?.ticketId || 'WB-2026-9021',
        status: 'IN_TRANSIT',
        version: 1, // Stale version (server is higher)
        notes: 'تعديل بالتوازي في وضع عدم الاتصال',
      }
    };

    const conflict = conflictResolutionService.detectConflict(op);
    const passed = conflict !== null && conflict.conflictType === 'VERSION_CONFLICT';
    results.push({
      id: 'CONF-TEST-01',
      nameAr: 'اكتشاف تعارض الإصدارات (VERSION_CONFLICT)',
      nameEn: 'Version Conflict Detection',
      category: 'CONFLICT_DETECTION',
      passed,
      expected: 'VERSION_CONFLICT',
      actual: conflict?.conflictType || 'NONE',
      details: passed 
        ? `تم بنجاح رصد تعارض الإصدار (خادم: v${conflict?.serverState?.serverVersion} مقابل محلي: v1)` 
        : 'فشل اكتشاف تعارض الإصدار',
    });
  }

  // Test 2: PRICING_CHANGED
  {
    const op: OutboxOperation = {
      operationId: `OP-TEST-PRC-${Date.now()}`,
      projectId: 'PRJ-NEOM-NORTH',
      userId: 'TESTER-01',
      deviceId: 'DEV-TEST-01',
      operationType: 'CREATE_TRIP_LOADING',
      createdAt: nowIso,
      retryCount: 0,
      status: 'PENDING',
      payload: {
        tripId: `TRP-PRICE-${Date.now()}`,
        tripSerial: 'TRP-NEOM-TEST-PRC',
        ticketId: `WB-TKT-PRC-${Date.now()}`,
        truckId: 'TRK-9011',
        driverId: 'DRV-501',
        carrierId: 'CAR-001',
        materialId: 'MAT-AGG-01',
        tareWeight: 14000,
        grossWeight: 44000,
        netWeight: 30000,
        pricingRuleId: 'PRC-AGG-TON-01',
        pricingType: 'PER_TON',
        agreedRate: 8.5,
        settlementAmount: 255.00,
        pricingSnapshot: {
          pricingRuleId: 'PRC-AGG-TON-01',
          ruleName: 'تسعيرة بحص أساس توريد نيوم (بالطن)',
          pricingType: 'PER_TON',
          agreedRate: 8.5, // Offline snapshot rate
          currency: 'SAR',
          settlementBase: 30.0,
          settlementAmount: 255.00,
          pricingSnapshotAt: nowIso,
        }
      }
    };

    // Temporarily simulate server rule update
    const rule = MASTER_PRICING_RULES.find(r => r.pricingRuleId === 'PRC-AGG-TON-01') || MASTER_PRICING_RULES.find(r => r.pricingRuleId === 'PRC-NEOM-HAUL-TON-8.5');
    const originalRate = rule ? rule.agreedRate : 8.5;
    if (rule) rule.agreedRate = 12.0; // Server updated price to 12.0 SAR

    const conflict = conflictResolutionService.detectConflict(op);
    const passed = conflict !== null && 
                   conflict.conflictType === 'PRICING_CHANGED' && 
                   conflict.pricingProtection?.hasValidSnapshot === true &&
                   conflict.pricingProtection?.snapshotRate === 8.5 &&
                   conflict.pricingProtection?.serverCurrentRate === 12.0;

    if (rule) rule.agreedRate = originalRate; // Restore original rate

    results.push({
      id: 'CONF-TEST-02',
      nameAr: 'اكتشاف تغير السعر الخادومي مع حماية اللقطة (PRICING_CHANGED)',
      nameEn: 'Pricing Changed with Snapshot Protection',
      category: 'CONFLICT_DETECTION',
      passed,
      expected: 'PRICING_CHANGED with snapshotRate=8.5 and serverRate=12.0',
      actual: `${conflict?.conflictType} (Snapshot: ${conflict?.pricingProtection?.snapshotRate}, Server: ${conflict?.pricingProtection?.serverCurrentRate})`,
      details: passed
        ? 'تم حماية لقطة السعر وقت الإنشاء بنجاح دون المساس بقيمة الرحلة الأصلية'
        : 'فشل اكتشاف تعارض السعر أو حماية اللقطة',
    });

    // Restore server rule
    if (rule) rule.agreedRate = originalRate;
  }

  // Test 3: TRIP_ALREADY_COMPLETED
  {
    const trips = tripEngineService.getTrips();
    const targetTrip = trips[0];
    const prevStatus = targetTrip.status;
    targetTrip.status = 'COMPLETED';

    const op: OutboxOperation = {
      operationId: `OP-TEST-CMP-${Date.now()}`,
      projectId: targetTrip.projectId,
      userId: 'TESTER-01',
      deviceId: 'DEV-TEST-01',
      operationType: 'UPDATE_TRIP_STATUS',
      createdAt: nowIso,
      retryCount: 0,
      status: 'PENDING',
      payload: {
        tripId: targetTrip.tripId,
        tripSerial: targetTrip.tripSerial,
        ticketId: targetTrip.ticketId,
        status: 'IN_TRANSIT', // Client thinks it's IN_TRANSIT, but server is COMPLETED
        notes: 'محاولة تعديل رحلة مغلقة',
      }
    };

    const conflict = conflictResolutionService.detectConflict(op);
    const passed = conflict !== null && conflict.conflictType === 'TRIP_ALREADY_COMPLETED';
    results.push({
      id: 'CONF-TEST-03',
      nameAr: 'منع الكتابة فوق الرحلات المكتملة (TRIP_ALREADY_COMPLETED)',
      nameEn: 'Trip Already Completed Conflict',
      category: 'CONFLICT_DETECTION',
      passed,
      expected: 'TRIP_ALREADY_COMPLETED',
      actual: conflict?.conflictType || 'NONE',
      details: passed
        ? `تم رصد إغلاق الرحلة الخادومي (${targetTrip.tripSerial}) ومنع الكتابة التلقائية`
        : 'فشل رصد تعارض الرحلة المكتملة',
    });

    // Restore
    targetTrip.status = prevStatus;
  }

  // Test 4: TRIP_ALREADY_RETURNED
  {
    const trips = tripEngineService.getTrips();
    const targetTrip = trips[1] || trips[0];
    const prevStatus = targetTrip.status;
    targetTrip.status = 'RETURNED';

    const op: OutboxOperation = {
      operationId: `OP-TEST-RET-${Date.now()}`,
      projectId: targetTrip.projectId,
      userId: 'TESTER-01',
      deviceId: 'DEV-TEST-01',
      operationType: 'UPDATE_TRIP_STATUS',
      createdAt: nowIso,
      retryCount: 0,
      status: 'PENDING',
      payload: {
        tripId: targetTrip.tripId,
        tripSerial: targetTrip.tripSerial,
        ticketId: targetTrip.ticketId,
        status: 'IN_TRANSIT',
        notes: 'تحديث على رحلة مرتجعة',
      }
    };

    const conflict = conflictResolutionService.detectConflict(op);
    const passed = conflict !== null && conflict.conflictType === 'TRIP_ALREADY_RETURNED';
    results.push({
      id: 'CONF-TEST-04',
      nameAr: 'رصد تعارض الرحلة المرتجعة (TRIP_ALREADY_RETURNED)',
      nameEn: 'Trip Already Returned Conflict',
      category: 'CONFLICT_DETECTION',
      passed,
      expected: 'TRIP_ALREADY_RETURNED',
      actual: conflict?.conflictType || 'NONE',
      details: passed
        ? `تم رصد حالة الإرجاع الخادومية وتجميد الأمر المحلي`
        : 'فشل رصد تعارض الرحلة المرتجعة',
    });

    // Restore
    targetTrip.status = prevStatus;
  }

  // Test 5: DUPLICATE_OPERATION
  {
    const existing = tripEngineService.getTrips()[0];
    const op: OutboxOperation = {
      operationId: `OP-TEST-DUP-${Date.now()}`,
      projectId: 'PRJ-NEOM-NORTH',
      userId: 'TESTER-01',
      deviceId: 'DEV-TEST-01',
      operationType: 'CREATE_TRIP_LOADING',
      createdAt: nowIso,
      retryCount: 0,
      status: 'PENDING',
      payload: {
        tripId: `TRP-NEW-${Date.now()}`,
        tripSerial: 'TRP-NEOM-9999',
        ticketId: existing?.ticketId, // Duplicate ticketId!
        truckId: 'TRK-9012',
        driverId: 'DRV-502',
        carrierId: 'CAR-001',
        materialId: 'MAT-AGG-01',
        tareWeight: 14000,
        grossWeight: 42000,
      }
    };

    const conflict = conflictResolutionService.detectConflict(op);
    const passed = conflict !== null && conflict.conflictType === 'DUPLICATE_OPERATION';
    results.push({
      id: 'CONF-TEST-05',
      nameAr: 'اكتشاف تكرار تذكرة الميزان والعملية (DUPLICATE_OPERATION)',
      nameEn: 'Duplicate Operation Detection',
      category: 'CONFLICT_DETECTION',
      passed,
      expected: 'DUPLICATE_OPERATION',
      actual: conflict?.conflictType || 'NONE',
      details: passed
        ? `تم رصد التكرار على تذكرة الميزان (${existing?.ticketId}) ومنع التكرار الميداني`
        : 'فشل رصد العملية المكررة',
    });
  }

  // Test 6: TRUCK_CARRIER_CONFLICT
  {
    const op: OutboxOperation = {
      operationId: `OP-TEST-TRK-${Date.now()}`,
      projectId: 'PRJ-NEOM-NORTH',
      userId: 'TESTER-01',
      deviceId: 'DEV-TEST-01',
      operationType: 'CREATE_TRIP_LOADING',
      createdAt: nowIso,
      retryCount: 0,
      status: 'PENDING',
      payload: {
        tripId: `TRP-TRK-${Date.now()}`,
        tripSerial: 'TRP-NEOM-8888',
        ticketId: `WB-TRK-${Date.now()}`,
        truckId: 'TRK-9011',
        carrierId: 'CAR-003', // Conflict: TRK-9011 belongs to CAR-001 on server
        driverId: 'DRV-501',
        materialId: 'MAT-AGG-01',
        tareWeight: 14000,
        grossWeight: 42000,
      }
    };

    const conflict = conflictResolutionService.detectConflict(op);
    const passed = conflict !== null && conflict.conflictType === 'TRUCK_CARRIER_CONFLICT';
    results.push({
      id: 'CONF-TEST-06',
      nameAr: 'تعارض تبعية الشاحنة للناقل (TRUCK_CARRIER_CONFLICT)',
      nameEn: 'Truck-Carrier Conflict Detection',
      category: 'CONFLICT_DETECTION',
      passed,
      expected: 'TRUCK_CARRIER_CONFLICT',
      actual: conflict?.conflictType || 'NONE',
      details: passed
        ? `تم اكتشاف تعارض التبعية للشاحنة TRK-9011 والناقل CAR-003 بنجاح`
        : 'فشل اكتشاف تعارض الشاحنة والناقل',
    });
  }

  // Test 7: MASTER_DATA_CHANGED
  {
    const op: OutboxOperation = {
      operationId: `OP-TEST-MD-${Date.now()}`,
      projectId: 'PRJ-NEOM-NORTH',
      userId: 'TESTER-01',
      deviceId: 'DEV-TEST-01',
      operationType: 'CREATE_TRIP_LOADING',
      createdAt: nowIso,
      retryCount: 0,
      status: 'PENDING',
      payload: {
        tripId: `TRP-MD-${Date.now()}`,
        tripSerial: 'TRP-NEOM-7777',
        ticketId: `WB-MD-${Date.now()}`,
        truckId: 'TRK-9011',
        carrierId: 'CAR-001',
        driverId: 'DRV-501',
        materialId: 'MAT-DEACTIVATED', // Deactivated on server
        tareWeight: 14000,
        grossWeight: 42000,
      }
    };

    const conflict = conflictResolutionService.detectConflict(op);
    const passed = conflict !== null && conflict.conflictType === 'MASTER_DATA_CHANGED';
    results.push({
      id: 'CONF-TEST-07',
      nameAr: 'تغيير أو إيقاف البيانات الأساسية (MASTER_DATA_CHANGED)',
      nameEn: 'Master Data Changed Detection',
      category: 'CONFLICT_DETECTION',
      passed,
      expected: 'MASTER_DATA_CHANGED',
      actual: conflict?.conflictType || 'NONE',
      details: passed
        ? `تم رصد المادة الموقوفة (MAT-DEACTIVATED) وتجميد العملية`
        : 'فشل رصد تغيير البيانات الأساسية',
    });
  }

  // ---------------------------------------------------------------------------
  // Category 2: Mandates Verification (Anti-LWW, Preserves, Notification)
  // ---------------------------------------------------------------------------

  // Test 8: Anti-LWW & Preservation of Local Command & Server State
  {
    let notified = false;
    conflictResolutionService.setNotificationCallback(() => {
      notified = true;
    });

    const conflict = await conflictResolutionService.simulateConflict('VERSION_CONFLICT');
    const hasLocalPreserved = !!conflict.localCommand && !!conflict.localCommand.payload && conflict.localCommand.version !== undefined;
    const hasServerPreserved = !!conflict.serverState && conflict.serverState.serverVersion !== undefined;
    const isOpen = conflict.status === 'OPEN';

    const passed = hasLocalPreserved && hasServerPreserved && isOpen && notified;
    results.push({
      id: 'CONF-TEST-08',
      nameAr: 'الحفاظ الصارم على الأمرين وإشعار المستخدم (Preserve Local & Server State)',
      nameEn: 'Preserve States & Notify Mandate',
      category: 'MANDATES_VERIFICATION',
      passed,
      expected: 'localCommand preserved, serverState preserved, status=OPEN, user notified',
      actual: `LocalPreserved=${hasLocalPreserved}, ServerPreserved=${hasServerPreserved}, Status=${conflict.status}, Notified=${notified}`,
      details: passed
        ? 'تم تجميد الأمر المحلي وحفظ حالة الخادم وإرسال إشعار للمستخدم وفتح سجل تعارض صريح'
        : 'فشل في حفظ أحد الأمرين أو في إشعار المستخدم',
    });
  }

  // ---------------------------------------------------------------------------
  // Category 3: Pricing Invariance Guarantee
  // ---------------------------------------------------------------------------

  // Test 9: Pricing Snapshot Invariance (Offline creation snapshot stays immutable)
  {
    const priceConflict = await conflictResolutionService.simulateConflict('PRICING_CHANGED');
    const originalRate = priceConflict.localCommand.pricingSnapshot?.agreedRate || 8.5;
    const originalSettlement = priceConflict.localCommand.pricingSnapshot?.settlementAmount || 238.00;

    // Explicitly resolve using PRESERVE_PRICING_SNAPSHOT
    const resolution = await conflictResolutionService.resolveConflict(priceConflict.conflictId, {
      strategy: 'PRESERVE_PRICING_SNAPSHOT',
      resolvedBy: 'مشرف الميزان والرقابة (Scale Supervisor)',
      justification: 'حماية القيمة التعاقدية للرحلة المنشأة بوضع عدم الاتصال بموجب لقطة التسعير الميدانية',
    });

    const committedTrip = resolution.committedTrip;
    const passed = resolution.success &&
                   committedTrip !== undefined &&
                   committedTrip.agreedRate === originalRate &&
                   committedTrip.settlementAmount === originalSettlement &&
                   committedTrip.pricingSnapshot?.agreedRate === originalRate;

    results.push({
      id: 'CONF-TEST-09',
      nameAr: 'ثبات تسعير الـ Offline وعدم تأثره بتحديثات السعر اللاحقة (Pricing Invariance)',
      nameEn: 'Pricing Snapshot Invariance Guarantee',
      category: 'PRICING_INVARIANCE',
      passed,
      expected: `agreedRate=${originalRate} SAR, settlementAmount=${originalSettlement} SAR`,
      actual: `CommittedRate=${committedTrip?.agreedRate} SAR, CommittedSettlement=${committedTrip?.settlementAmount} SAR`,
      details: passed
        ? `تم تأكيد اعتماد الرحلة بقيمة (${originalRate} ر.س) استناداً للقطة وقت الإنشاء دون أي تأثر بالسعر المحدث.`
        : 'فشل ثبات تسعير الـ Offline',
    });
  }

  // ---------------------------------------------------------------------------
  // Category 4: Explicit Resolution Mandate
  // ---------------------------------------------------------------------------

  // Test 10: Explicit Resolution with Supervisor Audit Trail
  {
    const dupConflict = await conflictResolutionService.simulateConflict('DUPLICATE_OPERATION');
    const resolution = await conflictResolutionService.resolveConflict(dupConflict.conflictId, {
      strategy: 'ASSIGN_NEW_SERIAL',
      resolvedBy: 'مراقب المحطة الرئيسية (Site Controller)',
      justification: 'إعادة إصدار تذكرة جديدة برقم معتمد لفك التكرار',
    });

    const updatedConf = conflictResolutionService.getConflictById(dupConflict.conflictId);
    const passed = resolution.success &&
                   updatedConf?.status === 'RESOLVED' &&
                   updatedConf?.resolution?.strategy === 'ASSIGN_NEW_SERIAL' &&
                   updatedConf?.resolution?.resolvedBy === 'مراقب المحطة الرئيسية (Site Controller)';

    results.push({
      id: 'CONF-TEST-10',
      nameAr: 'التسوية الصريحة والتدقيق الإلزامي (Explicit Resolution & Audit Trail)',
      nameEn: 'Explicit Resolution Mandate with Audit Trail',
      category: 'EXPLICIT_RESOLUTION',
      passed,
      expected: 'status=RESOLVED, strategy=ASSIGN_NEW_SERIAL, resolvedBy documented',
      actual: `Status=${updatedConf?.status}, Strategy=${updatedConf?.resolution?.strategy}, ResolvedBy=${updatedConf?.resolution?.resolvedBy}`,
      details: passed
        ? 'تم توثيق التدقيق وسجل الحل الصريح وهوية المسؤول وتاريخ القرار بنجاح'
        : 'فشل في تطبيق التسوية الصريحة',
    });
  }

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
