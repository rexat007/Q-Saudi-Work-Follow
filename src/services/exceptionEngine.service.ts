/**
 * Exception Engine Service
 * Authoritative lifecycle management for the 12 operational and financial exception types.
 * Enforces:
 * 1. Strict Exception Schema (exceptionId, projectId, tripId nullable, type, severity, status, description, evidence, openedAt, openedBy, reviewedAt, reviewedBy, resolution, resolutionNote)
 * 2. Strict 4 Statuses: OPEN -> UNDER_REVIEW -> RESOLVED | REJECTED
 * 3. Invariant Mandate: Every single exception processing action records an immutable Audit Log.
 */

import { 
  ExceptionRecord, 
  ExceptionType, 
  ExceptionSeverity, 
  ExceptionStatus, 
  ExceptionAuditLog, 
  CreateExceptionParams, 
  ResolveExceptionParams, 
  RejectExceptionParams, 
  StartReviewParams 
} from '../types/exceptionEngine';

// Seed Exception Records covering all 12 Types
const INITIAL_EXCEPTIONS_SEED: ExceptionRecord[] = [
  {
    exceptionId: 'EXP-2026-001',
    projectId: 'PRJ-NEOM-001',
    tripId: 'TRP-2026-00891',
    type: 'WEIGHT_VARIANCE',
    severity: 'HIGH',
    status: 'OPEN',
    description: 'فارق وزني غير طبيعي يتجاوز تفاوت المادة المحدد (-1,450 كجم، النسبة -4.6% بينما الحد 1.5%)',
    evidence: {
      loadedNetKg: 31400,
      receivedNetKg: 29950,
      varianceKg: -1450,
      variancePercent: -4.62,
      toleranceLimitKg: 471,
      weighbridgeOrigin: 'WB-QUARRY-TABUK',
      weighbridgeDest: 'WB-NEOM-SITE-04'
    },
    openedAt: '2026-09-09T09:15:00.000Z',
    openedBy: 'SYSTEM_WEIGHT_ENGINE',
    reviewedAt: null,
    reviewedBy: null,
    resolution: null,
    resolutionNote: null
  },
  {
    exceptionId: 'EXP-2026-002',
    projectId: 'PRJ-NEOM-001',
    tripId: 'TRP-2026-00895',
    type: 'TRUCK_CARRIER_CONFLICT',
    severity: 'BLOCKING',
    status: 'UNDER_REVIEW',
    description: 'تعارض الشاحنة: الشاحنة (أ ب د 8812) مسجلة رسمياً تحت الناقل (أساطيل الشرق)، بينما بوليصة الشحن مسندة للناقل (المجدوعي)',
    evidence: {
      truckPlate: 'أ ب د 8812',
      truckRegisteredCarrierId: 'CAR-SHARQ-01',
      truckRegisteredCarrierName: 'مؤسسة أساطيل الشرق للنقل',
      dispatchedCarrierId: 'CAR-ALMAJDOUIE',
      dispatchedCarrierName: 'شركة المجدوعي للخدمات اللوجستية',
      tgaCardExpiry: '2027-02-15'
    },
    openedAt: '2026-09-09T08:45:00.000Z',
    openedBy: 'DISPATCH_VALIDATOR',
    reviewedAt: '2026-09-09T10:00:00.000Z',
    reviewedBy: 'ENG-AUDITOR-01',
    resolution: null,
    resolutionNote: 'جاري التحقق من عقد التشغيل بالباطن المبرم بين الناقلين وتحديث تصريح البوابة الأمنية'
  },
  {
    exceptionId: 'EXP-2026-003',
    projectId: 'PRJ-REDSEA-002',
    tripId: 'TRP-2026-00899',
    type: 'DRIVER_CARRIER_CONFLICT',
    severity: 'HIGH',
    status: 'RESOLVED',
    description: 'السائق (محمد عبد الرحمن - إقامة 2489012345) مسجل بكفالة ناقل آخر وغير مرتبط بناقل الرحلة الحالي',
    evidence: {
      driverName: 'محمد عبد الرحمن الصالح',
      driverIqama: '2489012345',
      driverSponsorCarrierId: 'CAR-RAWABI-09',
      tripCarrierId: 'CAR-BINLADIN-03',
      qiwaStatus: 'TRANSFER_IN_PROGRESS'
    },
    openedAt: '2026-09-08T14:20:00.000Z',
    openedBy: 'FLEET_COMPLIANCE_BOT',
    reviewedAt: '2026-09-08T16:30:00.000Z',
    reviewedBy: 'USR-FLEET-DIRECTOR',
    resolution: 'MANUAL_COMPLIANCE_APPROVED',
    resolutionNote: 'تم إرفاق موافقة منصة قوى المؤقتة وإشعار أجير ساري المفعول حتى 2026-10-01'
  },
  {
    exceptionId: 'EXP-2026-004',
    projectId: 'PRJ-REDSEA-002',
    tripId: 'TRP-2026-00902',
    type: 'MATERIAL_NOT_ALLOWED',
    severity: 'BLOCKING',
    status: 'REJECTED',
    description: 'المادة المحملة (دفان بيسكورس فئة ب - MAT-SUBBASE-B) غير مدرجة في المواد المصرح بدخولها إلى منطقة الجزيرة الحساسة بيئياً',
    evidence: {
      requestedMaterialId: 'MAT-SUBBASE-B',
      requestedMaterialName: 'بيسكورس فئة ب عالي النعومة',
      zoneRestriction: 'ENV_ZONE_A_ISLANDS',
      allowedMaterialsList: ['MAT-BASALT-01', 'MAT-RIPRAP-HD', 'MAT-READYMIX-C40']
    },
    openedAt: '2026-09-08T11:10:00.000Z',
    openedBy: 'SITE_GATE_OFFICER',
    reviewedAt: '2026-09-08T12:00:00.000Z',
    reviewedBy: 'ENG-ENVIRONMENT-HEAD',
    resolution: 'REJECTED_AS_PROHIBITED',
    resolutionNote: 'تم منع تفريغ الشحنة نهائياً وإعادة توجيه الشاحنة خارج الموقع لعدم مطابقة المعايير البيئية للمشروع'
  },
  {
    exceptionId: 'EXP-2026-005',
    projectId: 'PRJ-QIDDIYA-003',
    tripId: 'TRP-2026-00910',
    type: 'CARRIER_NOT_ALLOWED',
    severity: 'BLOCKING',
    status: 'OPEN',
    description: 'الناقل (شركة النقل السريع - CAR-EXPRESS-99) معلق في المشروع لانتهاء شهادة السلامة المرورية',
    evidence: {
      carrierId: 'CAR-EXPRESS-99',
      carrierName: 'شركة النقل السريع اللوجستية',
      reasonSuspension: 'SAFETY_CERT_EXPIRED',
      expiredDate: '2026-08-31',
      attemptedGate: 'GATE_QIDDIYA_SOUTH'
    },
    openedAt: '2026-09-09T07:15:00.000Z',
    openedBy: 'ACCESS_CONTROL_SYSTEM',
    reviewedAt: null,
    reviewedBy: null,
    resolution: null,
    resolutionNote: null
  },
  {
    exceptionId: 'EXP-2026-006',
    projectId: 'PRJ-QIDDIYA-003',
    tripId: 'TRP-2026-00914',
    type: 'AMBIGUOUS_TRIP',
    severity: 'MEDIUM',
    status: 'UNDER_REVIEW',
    description: 'غموض في مطابقة الرحلة: وجود تذكرتي ميزان صادرتين لنفس الشاحنة في نافذة زمنية متقاربة (خلال 20 دقيقة) بدون أمر تفريغ وسيط',
    evidence: {
      truckPlate: 'ر ص ع 4455',
      ticket1: 'WB-TKT-10491 (06:40)',
      ticket2: 'WB-TKT-10492 (06:58)',
      recordedNetWeight1: 28400,
      recordedNetWeight2: 28450
    },
    openedAt: '2026-09-09T07:30:00.000Z',
    openedBy: 'WEIGHBRIDGE_INSPECTOR',
    reviewedAt: '2026-09-09T08:15:00.000Z',
    reviewedBy: 'OPR-DISPATCH-LEAD',
    resolution: null,
    resolutionNote: 'جاري مراجعة كاميرا الميزان للتأكد هل قامت الشاحنة بالدوران المزدوج بسبب خطأ وزني أولي'
  },
  {
    exceptionId: 'EXP-2026-007',
    projectId: 'PRJ-JUBAIL-004',
    tripId: 'TRP-2026-00922',
    type: 'DUPLICATE_TRIP',
    severity: 'HIGH',
    status: 'RESOLVED',
    description: 'محاولة إدخال رحلة مكررة بنفس الرقم التسلسلي لتذكرة الميزان المحررة (WB-TKT-88091)',
    evidence: {
      duplicateTicketNo: 'WB-TKT-88091',
      firstTripId: 'TRP-2026-00919',
      firstTripCreatedAt: '2026-09-07T10:00:00.000Z',
      duplicateAttemptAt: '2026-09-07T10:14:00.000Z',
      attemptSource: 'ERP_REST_API'
    },
    openedAt: '2026-09-07T10:14:05.000Z',
    openedBy: 'IDEMPOTENCY_GUARD',
    reviewedAt: '2026-09-07T11:00:00.000Z',
    reviewedBy: 'SYS-ADMIN-SA',
    resolution: 'DUPLICATE_PURGED',
    resolutionNote: 'تم إلغاء المحاولة المكررة تلقائياً واعتماد العملية الأصلية المسجلة مسبقاً'
  },
  {
    exceptionId: 'EXP-2026-008',
    projectId: 'PRJ-JUBAIL-004',
    tripId: 'TRP-2026-00928',
    type: 'INVALID_WEIGHT',
    severity: 'BLOCKING',
    status: 'OPEN',
    description: 'قيمة وزن غير صالحة حسابياً: وزن القائم أقل من وزن الفارغ (gross: 12,500 كجم < tare: 14,200 كجم)',
    evidence: {
      tareWeightKg: 14200,
      grossWeightKg: 12500,
      calculatedNetKg: null,
      violatedCondition: 'gross > tare',
      weighbridgeTerminal: 'TERMINAL_JUBAIL_OUT_02'
    },
    openedAt: '2026-09-09T10:30:00.000Z',
    openedBy: 'WEIGHT_ENGINE_VALIDATOR',
    reviewedAt: null,
    reviewedBy: null,
    resolution: null,
    resolutionNote: null
  },
  {
    exceptionId: 'EXP-2026-009',
    projectId: 'PRJ-AMAALA-005',
    tripId: 'TRP-2026-00933',
    type: 'MISSING_PRICING',
    severity: 'HIGH',
    status: 'OPEN',
    description: 'لا توجد قاعدة تسعير معتمدة وسارية للناقل (CAR-ALBILAD-08) لنقل مادة الصخور البحرية (MAT-ARMOR-ROCK) للمشروع',
    evidence: {
      carrierId: 'CAR-ALBILAD-08',
      carrierName: 'مؤسسة البلاد للنقل',
      materialId: 'MAT-ARMOR-ROCK',
      contractDate: '2026-09-09',
      availablePricingRulesCount: 0
    },
    openedAt: '2026-09-09T09:50:00.000Z',
    openedBy: 'PRICING_ENGINE_MATCHER',
    reviewedAt: null,
    reviewedBy: null,
    resolution: null,
    resolutionNote: null
  },
  {
    exceptionId: 'EXP-2026-010',
    projectId: 'PRJ-AMAALA-005',
    tripId: 'TRP-2026-00940',
    type: 'PRICING_CONFLICT',
    severity: 'HIGH',
    status: 'UNDER_REVIEW',
    description: 'تعارض في قواعد التسعير: وجود قاعدتي تسعير نشطتين ومتداخلتين في نفس النطاق الزمني لنفس المادة والناقل (سعر الطن 52 ر.س مقابل سعر المقطوعية 1,850 ر.س)',
    evidence: {
      ruleA: 'PRC-AMAALA-TON-01 (52.00 SAR / TON)',
      ruleB: 'PRC-AMAALA-TRIP-02 (1,850.00 SAR / TRIP)',
      carrierId: 'CAR-SAUDI-CARGO',
      materialId: 'MAT-READYMIX-35'
    },
    openedAt: '2026-09-08T15:40:00.000Z',
    openedBy: 'SETTLEMENT_CALCULATOR',
    reviewedAt: '2026-09-09T08:20:00.000Z',
    reviewedBy: 'FIN-CONTROLLER-01',
    resolution: null,
    resolutionNote: 'جاري مراجعة الملحق رقم 3 من العقد لتحديد نموذج الفوترة المعتمد للشحنات الليلية'
  },
  {
    exceptionId: 'EXP-2026-011',
    projectId: 'PRJ-NEOM-001',
    tripId: null, // Nullable tripId demonstration: System-level sync failure
    type: 'SYNC_FAILURE',
    severity: 'MEDIUM',
    status: 'RESOLVED',
    description: 'فشل مزامنة حزمة بيانات موازين موقعية واردة من جهاز المحطة الطرفية اللاسلكي رقم #04 بسبب انقطاع شبكة 5G',
    evidence: {
      deviceId: 'GATEWAY-RUGGED-04',
      failedPayloadSizeKB: 248,
      recordsCountInBatch: 18,
      httpErrorCode: 504,
      retryCount: 5,
      lastAttempt: '2026-09-08T22:15:00.000Z'
    },
    openedAt: '2026-09-08T22:16:00.000Z',
    openedBy: 'OFFLINE_SYNC_WORKER',
    reviewedAt: '2026-09-08T23:00:00.000Z',
    reviewedBy: 'SYS-NETWORK-ENG',
    resolution: 'BATCH_REPLAYED_SUCCESSFULLY',
    resolutionNote: 'تمت استعادة الاتصال عبر مسار القمر الصناعي البديل Starlink ومزامنة كافة السجلات الـ 18 دون أي فقد'
  },
  {
    exceptionId: 'EXP-2026-012',
    projectId: 'PRJ-NEOM-001',
    tripId: 'TRP-2026-00891',
    type: 'VERSION_CONFLICT',
    severity: 'HIGH',
    status: 'OPEN',
    description: 'تعارض النسخ المتفائلة (Optimistic Concurrency Clash): محاولة تحديث تذكرة الوصول بالنسخة رقم (1) بينما خادم قاعدة البيانات يحتوي النسخة رقم (2)',
    evidence: {
      targetTripId: 'TRP-2026-00891',
      clientReportedVersion: 1,
      databaseCurrentVersion: 2,
      conflictingFields: ['destNetWeight', 'status', 'updatedAt'],
      clientOriginIp: '192.168.10.45'
    },
    openedAt: '2026-09-09T11:46:00.000Z',
    openedBy: 'FIRESTORE_TRANSACTION_MANAGER',
    reviewedAt: null,
    reviewedBy: null,
    resolution: null,
    resolutionNote: null
  }
];

// Seed Audit Records
const INITIAL_AUDITS_SEED: ExceptionAuditLog[] = [
  {
    auditId: 'AUD-EXP-001',
    exceptionId: 'EXP-2026-001',
    projectId: 'PRJ-NEOM-001',
    action: 'CREATED',
    actorId: 'SYSTEM_WEIGHT_ENGINE',
    actorName: 'محرك الأوزان الآلي',
    actorRole: 'SYSTEM_BOT',
    timestamp: '2026-09-09T09:15:00.000Z',
    beforeState: null,
    afterState: {
      status: 'OPEN',
      type: 'WEIGHT_VARIANCE',
      severity: 'HIGH'
    },
    note: 'تم اكتشاف فارغ وزني قدره -1450 كجم يتجاوز تفاوت 1.5%'
  },
  {
    auditId: 'AUD-EXP-002',
    exceptionId: 'EXP-2026-002',
    projectId: 'PRJ-NEOM-001',
    action: 'CREATED',
    actorId: 'DISPATCH_VALIDATOR',
    actorName: 'مدقق الإرسال والتحميل',
    actorRole: 'SYSTEM_BOT',
    timestamp: '2026-09-09T08:45:00.000Z',
    beforeState: null,
    afterState: {
      status: 'OPEN',
      type: 'TRUCK_CARRIER_CONFLICT',
      severity: 'BLOCKING'
    },
    note: 'لوحة الشاحنة مسجلة لناقل مختلف'
  },
  {
    auditId: 'AUD-EXP-003',
    exceptionId: 'EXP-2026-002',
    projectId: 'PRJ-NEOM-001',
    action: 'UNDER_REVIEW_STARTED',
    actorId: 'ENG-AUDITOR-01',
    actorName: 'م. سالم القحطاني',
    actorRole: 'PROJECT_ADMIN',
    timestamp: '2026-09-09T10:00:00.000Z',
    beforeState: {
      status: 'OPEN',
      reviewedAt: null,
      reviewedBy: null
    },
    afterState: {
      status: 'UNDER_REVIEW',
      reviewedAt: '2026-09-09T10:00:00.000Z',
      reviewedBy: 'ENG-AUDITOR-01'
    },
    note: 'بدء مراجعة العقد الفرعي للناقلين'
  },
  {
    auditId: 'AUD-EXP-004',
    exceptionId: 'EXP-2026-003',
    projectId: 'PRJ-REDSEA-002',
    action: 'CREATED',
    actorId: 'FLEET_COMPLIANCE_BOT',
    actorName: 'روبوت الامتثال التابع لوزارة النقل',
    actorRole: 'SYSTEM_BOT',
    timestamp: '2026-09-08T14:20:00.000Z',
    beforeState: null,
    afterState: { status: 'OPEN', type: 'DRIVER_CARRIER_CONFLICT' },
    note: 'السائق غير مرتبط بناقل الرحلة'
  },
  {
    auditId: 'AUD-EXP-005',
    exceptionId: 'EXP-2026-003',
    projectId: 'PRJ-REDSEA-002',
    action: 'RESOLVED',
    actorId: 'USR-FLEET-DIRECTOR',
    actorName: 'فهد العتيبي (مدير الأسطول)',
    actorRole: 'FINANCE_AUDITOR',
    timestamp: '2026-09-08T16:30:00.000Z',
    beforeState: { status: 'OPEN', resolution: null },
    afterState: {
      status: 'RESOLVED',
      resolution: 'MANUAL_COMPLIANCE_APPROVED',
      resolutionNote: 'تم إرفاق موافقة منصة قوى المؤقتة وإشعار أجير ساري المفعول حتى 2026-10-01'
    },
    note: 'تم إرفاق مستند أجير واعتماد الرحلة'
  },
  {
    auditId: 'AUD-EXP-006',
    exceptionId: 'EXP-2026-004',
    projectId: 'PRJ-REDSEA-002',
    action: 'CREATED',
    actorId: 'SITE_GATE_OFFICER',
    actorName: 'مشرف البوابة الأمنية',
    actorRole: 'DISPATCHER',
    timestamp: '2026-09-08T11:10:00.000Z',
    beforeState: null,
    afterState: { status: 'OPEN', type: 'MATERIAL_NOT_ALLOWED' },
    note: 'المادة غير مصرحة في الجزيرة'
  },
  {
    auditId: 'AUD-EXP-007',
    exceptionId: 'EXP-2026-004',
    projectId: 'PRJ-REDSEA-002',
    action: 'REJECTED',
    actorId: 'ENG-ENVIRONMENT-HEAD',
    actorName: 'د. طارق الغامدي (رئيس الحماية البيئية)',
    actorRole: 'PROJECT_ADMIN',
    timestamp: '2026-09-08T12:00:00.000Z',
    beforeState: { status: 'OPEN', resolution: null },
    afterState: {
      status: 'REJECTED',
      resolution: 'REJECTED_AS_PROHIBITED',
      resolutionNote: 'تم منع تفريغ الشحنة نهائياً وإعادة توجيه الشاحنة خارج الموقع'
    },
    note: 'مرفوضة لحماية البيئة البحرية'
  }
];

export class ExceptionEngineService {
  private exceptions: ExceptionRecord[] = [...INITIAL_EXCEPTIONS_SEED];
  private auditLogs: ExceptionAuditLog[] = [...INITIAL_AUDITS_SEED];
  private listeners: Array<() => void> = [];

  // =========================================================================
  // Listener Subscriptions
  // =========================================================================
  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (e) {
        console.error('ExceptionEngine listener error:', e);
      }
    });
  }

  // =========================================================================
  // Invariant Audit Logging Helper
  // =========================================================================
  private recordAudit(
    exceptionId: string,
    projectId: string,
    action: ExceptionAuditLog['action'],
    actorId: string,
    actorName: string,
    actorRole: string,
    beforeState: Partial<ExceptionRecord> | null,
    afterState: Partial<ExceptionRecord>,
    note?: string
  ): ExceptionAuditLog {
    const auditEntry: ExceptionAuditLog = {
      auditId: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      exceptionId,
      projectId,
      action,
      actorId,
      actorName,
      actorRole,
      timestamp: new Date().toISOString(),
      beforeState: beforeState ? JSON.parse(JSON.stringify(beforeState)) : null,
      afterState: JSON.parse(JSON.stringify(afterState)),
      note,
      ipAddress: '10.240.0.12' // Internal cloud cluster IP
    };

    this.auditLogs.unshift(auditEntry);
    return auditEntry;
  }

  // =========================================================================
  // Exception Lifecycle Method 1: Create Exception
  // =========================================================================
  public createException(params: CreateExceptionParams): ExceptionRecord {
    const exceptionId = params.exceptionId || `EXP-${new Date().getFullYear()}-${String(this.exceptions.length + 1).padStart(3, '0')}`;
    const openedAt = new Date().toISOString();

    const newRecord: ExceptionRecord = {
      exceptionId,
      projectId: params.projectId,
      tripId: params.tripId !== undefined ? params.tripId : null,
      type: params.type,
      severity: params.severity,
      status: 'OPEN',
      description: params.description,
      evidence: params.evidence || {},
      openedAt,
      openedBy: params.openedBy,
      reviewedAt: null,
      reviewedBy: null,
      resolution: null,
      resolutionNote: null
    };

    this.exceptions.unshift(newRecord);

    // Mandate: Record Audit
    this.recordAudit(
      newRecord.exceptionId,
      newRecord.projectId,
      'CREATED',
      params.openedBy,
      params.openedBy,
      'CREATOR',
      null,
      {
        exceptionId: newRecord.exceptionId,
        type: newRecord.type,
        severity: newRecord.severity,
        status: newRecord.status,
        tripId: newRecord.tripId,
        description: newRecord.description
      },
      `تم فتح الاستثناء بنجاح بنوع (${newRecord.type}) وأولوية (${newRecord.severity})`
    );

    this.notify();
    return newRecord;
  }

  // =========================================================================
  // Exception Lifecycle Method 2: Start Review (Move to UNDER_REVIEW)
  // =========================================================================
  public startReview(params: StartReviewParams): ExceptionRecord {
    const existing = this.exceptions.find(e => e.exceptionId === params.exceptionId);
    if (!existing) {
      throw new Error(`الاستثناء بالمعرف ${params.exceptionId} غير موجود`);
    }

    const beforeState: Partial<ExceptionRecord> = {
      status: existing.status,
      reviewedAt: existing.reviewedAt,
      reviewedBy: existing.reviewedBy
    };

    existing.status = 'UNDER_REVIEW';
    existing.reviewedAt = new Date().toISOString();
    existing.reviewedBy = `${params.actorName} (${params.actorId})`;
    if (params.notes) {
      existing.resolutionNote = params.notes;
    }

    const afterState: Partial<ExceptionRecord> = {
      status: existing.status,
      reviewedAt: existing.reviewedAt,
      reviewedBy: existing.reviewedBy,
      resolutionNote: existing.resolutionNote
    };

    // Mandate: Record Audit
    this.recordAudit(
      existing.exceptionId,
      existing.projectId,
      'UNDER_REVIEW_STARTED',
      params.actorId,
      params.actorName,
      params.actorRole,
      beforeState,
      afterState,
      params.notes || 'تم بدء فحص ومراجعة مستندات الاستثناء التشغيلي'
    );

    this.notify();
    return existing;
  }

  // =========================================================================
  // Exception Lifecycle Method 3: Resolve Exception
  // =========================================================================
  public resolveException(params: ResolveExceptionParams): ExceptionRecord {
    const existing = this.exceptions.find(e => e.exceptionId === params.exceptionId);
    if (!existing) {
      throw new Error(`الاستثناء بالمعرف ${params.exceptionId} غير موجود`);
    }

    const beforeState: Partial<ExceptionRecord> = {
      status: existing.status,
      resolution: existing.resolution,
      resolutionNote: existing.resolutionNote,
      reviewedAt: existing.reviewedAt,
      reviewedBy: existing.reviewedBy
    };

    existing.status = 'RESOLVED';
    existing.reviewedAt = new Date().toISOString();
    existing.reviewedBy = `${params.actorName} (${params.actorId})`;
    existing.resolution = params.resolution;
    existing.resolutionNote = params.resolutionNote;

    const afterState: Partial<ExceptionRecord> = {
      status: existing.status,
      resolution: existing.resolution,
      resolutionNote: existing.resolutionNote,
      reviewedAt: existing.reviewedAt,
      reviewedBy: existing.reviewedBy
    };

    // Mandate: Record Audit
    this.recordAudit(
      existing.exceptionId,
      existing.projectId,
      'RESOLVED',
      params.actorId,
      params.actorName,
      params.actorRole,
      beforeState,
      afterState,
      `تم اعتماد حل الاستثناء: [${params.resolution}] - ${params.resolutionNote}`
    );

    this.notify();
    return existing;
  }

  // =========================================================================
  // Exception Lifecycle Method 4: Reject Exception
  // =========================================================================
  public rejectException(params: RejectExceptionParams): ExceptionRecord {
    const existing = this.exceptions.find(e => e.exceptionId === params.exceptionId);
    if (!existing) {
      throw new Error(`الاستثناء بالمعرف ${params.exceptionId} غير موجود`);
    }

    const beforeState: Partial<ExceptionRecord> = {
      status: existing.status,
      resolution: existing.resolution,
      resolutionNote: existing.resolutionNote,
      reviewedAt: existing.reviewedAt,
      reviewedBy: existing.reviewedBy
    };

    existing.status = 'REJECTED';
    existing.reviewedAt = new Date().toISOString();
    existing.reviewedBy = `${params.actorName} (${params.actorId})`;
    existing.resolution = params.rejectionReason;
    existing.resolutionNote = params.resolutionNote;

    const afterState: Partial<ExceptionRecord> = {
      status: existing.status,
      resolution: existing.resolution,
      resolutionNote: existing.resolutionNote,
      reviewedAt: existing.reviewedAt,
      reviewedBy: existing.reviewedBy
    };

    // Mandate: Record Audit
    this.recordAudit(
      existing.exceptionId,
      existing.projectId,
      'REJECTED',
      params.actorId,
      params.actorName,
      params.actorRole,
      beforeState,
      afterState,
      `تم رفض الاستثناء / عدم الموافقة على الطلب: [${params.rejectionReason}] - ${params.resolutionNote}`
    );

    this.notify();
    return existing;
  }

  // =========================================================================
  // Query & Getter Methods
  // =========================================================================
  public getAllExceptions(): ExceptionRecord[] {
    return [...this.exceptions];
  }

  public getExceptionById(exceptionId: string): ExceptionRecord | null {
    return this.exceptions.find(e => e.exceptionId === exceptionId) || null;
  }

  public getExceptionsByTrip(tripId: string): ExceptionRecord[] {
    return this.exceptions.filter(e => e.tripId === tripId);
  }

  public getExceptionsByProject(projectId: string): ExceptionRecord[] {
    return this.exceptions.filter(e => e.projectId === projectId);
  }

  public getExceptionsByStatus(status: ExceptionStatus): ExceptionRecord[] {
    return this.exceptions.filter(e => e.status === status);
  }

  public getExceptionsByType(type: ExceptionType): ExceptionRecord[] {
    return this.exceptions.filter(e => e.type === type);
  }

  public getAuditHistoryForException(exceptionId: string): ExceptionAuditLog[] {
    return this.auditLogs.filter(a => a.exceptionId === exceptionId);
  }

  public getAllAuditLogs(): ExceptionAuditLog[] {
    return [...this.auditLogs];
  }

  // =========================================================================
  // Statistics and Summary
  // =========================================================================
  public getStatistics() {
    const total = this.exceptions.length;
    const open = this.exceptions.filter(e => e.status === 'OPEN').length;
    const underReview = this.exceptions.filter(e => e.status === 'UNDER_REVIEW').length;
    const resolved = this.exceptions.filter(e => e.status === 'RESOLVED').length;
    const rejected = this.exceptions.filter(e => e.status === 'REJECTED').length;
    const blocking = this.exceptions.filter(e => e.severity === 'BLOCKING' && (e.status === 'OPEN' || e.status === 'UNDER_REVIEW')).length;
    const criticalOrHigh = this.exceptions.filter(e => (e.severity === 'CRITICAL' || e.severity === 'HIGH') && (e.status === 'OPEN' || e.status === 'UNDER_REVIEW')).length;

    // By Type Counts
    const byType: Record<ExceptionType, number> = {
      WEIGHT_VARIANCE: 0,
      TRUCK_CARRIER_CONFLICT: 0,
      DRIVER_CARRIER_CONFLICT: 0,
      MATERIAL_NOT_ALLOWED: 0,
      CARRIER_NOT_ALLOWED: 0,
      AMBIGUOUS_TRIP: 0,
      DUPLICATE_TRIP: 0,
      INVALID_WEIGHT: 0,
      MISSING_PRICING: 0,
      PRICING_CONFLICT: 0,
      SYNC_FAILURE: 0,
      VERSION_CONFLICT: 0
    };

    this.exceptions.forEach(e => {
      if (byType[e.type] !== undefined) {
        byType[e.type]++;
      }
    });

    return {
      total,
      open,
      underReview,
      resolved,
      rejected,
      blocking,
      criticalOrHigh,
      totalAudits: this.auditLogs.length,
      byType
    };
  }

  // Reset to seed if needed for tests
  public resetToSeed() {
    this.exceptions = [...INITIAL_EXCEPTIONS_SEED];
    this.auditLogs = [...INITIAL_AUDITS_SEED];
    this.notify();
  }
}

export const exceptionEngine = new ExceptionEngineService();
