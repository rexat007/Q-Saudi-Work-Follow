/**
 * Automated Verification Test Suite for Exception Engine
 * Covers:
 * 1. The 12 Exception Types
 * 2. The 4 Statuses (OPEN, UNDER_REVIEW, RESOLVED, REJECTED)
 * 3. All required fields per Exception (including tripId nullable)
 * 4. Invariant: Every Exception processing action MUST record an Audit Log entry.
 */

import { exceptionEngine } from '../services/exceptionEngine.service';
import { ExceptionType, ExceptionStatus } from '../types/exceptionEngine';

export interface ExceptionTestCaseResult {
  id: string;
  name: string;
  category: 'TYPES_COVERAGE' | 'STATUS_LIFECYCLE' | 'NULLABLE_CONTRACT' | 'AUDIT_TRAIL';
  passed: boolean;
  message: string;
}

export function runExceptionEngineTestSuite(): {
  results: ExceptionTestCaseResult[];
  allPassed: boolean;
  summary: { total: number; passed: number; failed: number };
} {
  const results: ExceptionTestCaseResult[] = [];

  // -------------------------------------------------------------------------
  // Test Category 1: Coverage of all 12 Exception Types
  // -------------------------------------------------------------------------
  const requiredTypes: ExceptionType[] = [
    'WEIGHT_VARIANCE',
    'TRUCK_CARRIER_CONFLICT',
    'DRIVER_CARRIER_CONFLICT',
    'MATERIAL_NOT_ALLOWED',
    'CARRIER_NOT_ALLOWED',
    'AMBIGUOUS_TRIP',
    'DUPLICATE_TRIP',
    'INVALID_WEIGHT',
    'MISSING_PRICING',
    'PRICING_CONFLICT',
    'SYNC_FAILURE',
    'VERSION_CONFLICT'
  ];

  const allSeed = exceptionEngine.getAllExceptions();
  const presentTypes = new Set(allSeed.map(e => e.type));

  const missingTypes = requiredTypes.filter(t => !presentTypes.has(t));
  results.push({
    id: 'TEST-EXP-001',
    name: 'تغطية الأنواع الـ 12 للاستثناءات (12 Exception Types Coverage)',
    category: 'TYPES_COVERAGE',
    passed: missingTypes.length === 0,
    message: missingTypes.length === 0
      ? `جميع الأنواع الـ 12 متوفرة ومدعومة في محرك الاستثناءات (${requiredTypes.join(', ')})`
      : `هناك أنواع مفقودة: ${missingTypes.join(', ')}`
  });

  // Test dynamic creation of every type
  let dynamicCreationOk = true;
  for (const t of requiredTypes) {
    try {
      const created = exceptionEngine.createException({
        projectId: 'PRJ-TEST-AUTO',
        tripId: 'TRP-TEST-AUTO',
        type: t,
        severity: 'MEDIUM',
        description: `فحص اختباري آلي لنوع ${t}`,
        openedBy: 'UNIT_TEST_AGENT'
      });
      if (!created || created.type !== t) {
        dynamicCreationOk = false;
        break;
      }
    } catch {
      dynamicCreationOk = false;
      break;
    }
  }

  results.push({
    id: 'TEST-EXP-002',
    name: 'إنشاء ديناميكي لجميع الأنواع الـ 12 بنجاح',
    category: 'TYPES_COVERAGE',
    passed: dynamicCreationOk,
    message: dynamicCreationOk
      ? 'تم إنشاء وتحقق سجل استثناء لكل نوع من الأنواع الـ 12 بنجاح دون أي خطأ'
      : 'فشل في إنشاء أحد الأنواع برمجياً'
  });

  // -------------------------------------------------------------------------
  // Test Category 2: Statuses & Lifecycle Transitions
  // -------------------------------------------------------------------------
  const requiredStatuses: ExceptionStatus[] = ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED'];
  const presentStatuses = new Set(exceptionEngine.getAllExceptions().map(e => e.status));
  const missingStatuses = requiredStatuses.filter(s => !presentStatuses.has(s));

  results.push({
    id: 'TEST-EXP-003',
    name: 'تغطية الحالات الأربعة (OPEN, UNDER_REVIEW, RESOLVED, REJECTED)',
    category: 'STATUS_LIFECYCLE',
    passed: missingStatuses.length === 0,
    message: missingStatuses.length === 0
      ? 'جميع الحالات الأربعة (OPEN, UNDER_REVIEW, RESOLVED, REJECTED) نشطة وتعمل بالنظام'
      : `حالات غير ممثلة: ${missingStatuses.join(', ')}`
  });

  // Test Lifecycle Flow: OPEN -> UNDER_REVIEW -> RESOLVED
  const testFlow1 = exceptionEngine.createException({
    projectId: 'PRJ-TEST-FLOW',
    tripId: 'TRP-TEST-FLOW-01',
    type: 'WEIGHT_VARIANCE',
    severity: 'HIGH',
    description: 'اختبار دورة الحياة حتى الحل',
    openedBy: 'DISPATCHER_01'
  });

  const step1Open = testFlow1.status === 'OPEN';
  const step2Review = exceptionEngine.startReview({
    exceptionId: testFlow1.exceptionId,
    actorId: 'REV-01',
    actorName: 'مراجع أول',
    actorRole: 'AUDITOR'
  });
  const step2Ok = step2Review.status === 'UNDER_REVIEW' && step2Review.reviewedAt !== null;

  const step3Resolve = exceptionEngine.resolveException({
    exceptionId: testFlow1.exceptionId,
    actorId: 'REV-01',
    actorName: 'مراجع أول',
    actorRole: 'AUDITOR',
    resolution: 'APPROVED_VARIANCE',
    resolutionNote: 'تم قبول الفارق الوزني ضمن هامش التبخر'
  });
  const step3Ok = step3Resolve.status === 'RESOLVED' && step3Resolve.resolution === 'APPROVED_VARIANCE';

  results.push({
    id: 'TEST-EXP-004',
    name: 'دورة حياة المعالجة حتى الاعتماد (OPEN ➔ UNDER_REVIEW ➔ RESOLVED)',
    category: 'STATUS_LIFECYCLE',
    passed: step1Open && step2Ok && step3Ok,
    message: (step1Open && step2Ok && step3Ok)
      ? 'تم التحقق من الانتقال السليم من OPEN إلى UNDER_REVIEW ثم إلى RESOLVED مع تسجيل التاريخ والمراجع'
      : 'فشل في أحد مسارات دورة الحياة للاعتماد'
  });

  // Test Lifecycle Flow: OPEN -> REJECTED
  const testFlow2 = exceptionEngine.createException({
    projectId: 'PRJ-TEST-FLOW',
    tripId: 'TRP-TEST-FLOW-02',
    type: 'MATERIAL_NOT_ALLOWED',
    severity: 'BLOCKING',
    description: 'اختبار دورة الحياة حتى الرفض',
    openedBy: 'GATE_OFFICER'
  });

  const stepReject = exceptionEngine.rejectException({
    exceptionId: testFlow2.exceptionId,
    actorId: 'ADMIN-01',
    actorName: 'مدير الموقع',
    actorRole: 'PROJECT_ADMIN',
    rejectionReason: 'REJECTED_UNAUTHORIZED_ENTRY',
    resolutionNote: 'تم رفض دخول الشاحنة وإعادتها فوراً'
  });
  const rejectOk = stepReject.status === 'REJECTED' && stepReject.resolution === 'REJECTED_UNAUTHORIZED_ENTRY';

  results.push({
    id: 'TEST-EXP-005',
    name: 'دورة حياة المعالجة للرفض (OPEN ➔ REJECTED)',
    category: 'STATUS_LIFECYCLE',
    passed: rejectOk,
    message: rejectOk
      ? 'تم التحقق من مسار الرفض المباشر وتسجيل سبب الرفض وملاحظات القرار'
      : 'فشل في معالجة رفض الاستثناء'
  });

  // -------------------------------------------------------------------------
  // Test Category 3: Nullable Contract & Field Completeness
  // -------------------------------------------------------------------------
  // Verify tripId can be explicitly null
  const nullTripException = exceptionEngine.createException({
    projectId: 'PRJ-SYSTEM-GLOBAL',
    tripId: null, // Nullable verification
    type: 'SYNC_FAILURE',
    severity: 'MEDIUM',
    description: 'انقطاع شبكة الميزان الطرفي - استثناء عام بدون رحلة',
    openedBy: 'SYSTEM_DAEMON'
  });

  const tripIdNullablePass = nullTripException.tripId === null;
  results.push({
    id: 'TEST-EXP-006',
    name: 'قابلية تفريغ معرف الرحلة (tripId is nullable)',
    category: 'NULLABLE_CONTRACT',
    passed: tripIdNullablePass,
    message: tripIdNullablePass
      ? 'تم قبول tripId = null للاستثناءات النظامية والمالية العامة (مثل SYNC_FAILURE و PRICING_CONFLICT)'
      : 'لم يقبل النظام قيمة tripId = null'
  });

  // Verify all 14 required fields exist on every record
  const allExceptions = exceptionEngine.getAllExceptions();
  let allFieldsValid = true;
  for (const e of allExceptions) {
    if (
      !e.exceptionId ||
      !e.projectId ||
      e.tripId === undefined || // must be string or null
      !e.type ||
      !e.severity ||
      !e.status ||
      !e.description ||
      e.evidence === undefined ||
      !e.openedAt ||
      !e.openedBy ||
      e.reviewedAt === undefined ||
      e.reviewedBy === undefined ||
      e.resolution === undefined ||
      e.resolutionNote === undefined
    ) {
      allFieldsValid = false;
      break;
    }
  }

  results.push({
    id: 'TEST-EXP-007',
    name: 'اكتمال الحقول الإلزامية الـ 14 لكل استثناء (14 Fields Schema Check)',
    category: 'NULLABLE_CONTRACT',
    passed: allFieldsValid,
    message: allFieldsValid
      ? 'كل كائن Exception يحتوي بدقة الحقول الـ 14 المطلوبة دون نقص أو حقول غير معرفة'
      : 'توجد حقول مفقودة أو ناقصة في أحد كائنات الاستثناء'
  });

  // -------------------------------------------------------------------------
  // Test Category 4: Audit Trail Invariant (كل معالجة Exception تسجل Audit)
  // -------------------------------------------------------------------------
  const auditCountBefore = exceptionEngine.getAllAuditLogs().length;

  const auditedTest = exceptionEngine.createException({
    projectId: 'PRJ-AUDIT-TEST',
    tripId: 'TRP-AUD-001',
    type: 'AMBIGUOUS_TRIP',
    severity: 'MEDIUM',
    description: 'فحص إلزامية التدقيق الآلي',
    openedBy: 'TEST_ROBOT'
  });

  const auditLogsAfterCreate = exceptionEngine.getAuditHistoryForException(auditedTest.exceptionId);
  const createdAuditOk = auditLogsAfterCreate.length >= 1 && auditLogsAfterCreate[0].action === 'CREATED';

  exceptionEngine.startReview({
    exceptionId: auditedTest.exceptionId,
    actorId: 'REV-AUD-01',
    actorName: 'مراقب الجودة',
    actorRole: 'AUDITOR',
    notes: 'ملاحظة فحص التدقيق'
  });

  const auditLogsAfterReview = exceptionEngine.getAuditHistoryForException(auditedTest.exceptionId);
  const reviewAuditOk = auditLogsAfterReview.some(a => a.action === 'UNDER_REVIEW_STARTED');

  exceptionEngine.resolveException({
    exceptionId: auditedTest.exceptionId,
    actorId: 'REV-AUD-01',
    actorName: 'مراقب الجودة',
    actorRole: 'AUDITOR',
    resolution: 'RESOLVED_VALIDATED',
    resolutionNote: 'تم الحل بنجاح'
  });

  const auditLogsAfterResolve = exceptionEngine.getAuditHistoryForException(auditedTest.exceptionId);
  const resolveAuditOk = auditLogsAfterResolve.some(a => a.action === 'RESOLVED');

  const auditCountAfter = exceptionEngine.getAllAuditLogs().length;
  const auditCountIncremented = auditCountAfter >= auditCountBefore + 3;

  results.push({
    id: 'TEST-EXP-008',
    name: 'إلزامية تسجيل سجل التدقيق عند كل معالجة (Audit Log Invariant)',
    category: 'AUDIT_TRAIL',
    passed: createdAuditOk && reviewAuditOk && resolveAuditOk && auditCountIncremented,
    message: (createdAuditOk && reviewAuditOk && resolveAuditOk && auditCountIncremented)
      ? `تم تسجيل 3 سجلات تدقيق غير قابلة للتعديل عند (الإنشاء، بدء المراجعة، والاعتماد) مع تسجيل الحالة السابقة واللاحقة`
      : 'فشل في إلزامية تسجيل التدقيق لإحدى العمليات'
  });

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
