/**
 * Centralized Trip State Machine Service
 *
 * Strict Architectural Invariants:
 * 1. Client cannot mutate status directly (throws on direct mutation).
 * 2. States: DRAFT, LOADED, IN_TRANSIT, ARRIVED, UNLOADING, COMPLETED, RETURN_REQUESTED, RETURNED, EXCEPTION, CANCELLED.
 * 3. Every transition:
 *    - validates current state
 *    - validates role
 *    - validates project
 *    - validates required fields
 *    - creates event
 *    - creates audit log
 *    - increments version
 * 4. Cannot complete trip without: destNetWeight, unloaderId, unloadTime.
 * 5. Cannot complete trip without calculating variance (varianceWeight = destNetWeight - netWeight).
 * 6. Cannot start trip (transition to IN_TRANSIT) if Pricing Resolution fails.
 */

import {
  TripRecord,
  TripEngineStatus,
  TripActorRole,
  TripLifecycleEvent,
  TripAuditLog,
  TransitionContext,
  TransitionPayload,
} from '../types/tripEngine';
import { MASTER_PRICING_RULES } from '../data/masterPricingRules';

export interface TransitionRule {
  targetStatus: TripEngineStatus;
  allowedFrom: TripEngineStatus[];
  allowedRoles: TripActorRole[];
  labelAr: string;
  descriptionAr: string;
  requiresReason?: boolean;
}

export interface TransitionCheckResult {
  canTransition: boolean;
  targetStatus: TripEngineStatus;
  errors: string[];
  warnings: string[];
}

// Map of all valid transitions and their guard rules
export const STATE_TRANSITIONS: Record<TripEngineStatus, TransitionRule> = {
  DRAFT: {
    targetStatus: 'DRAFT',
    allowedFrom: [],
    allowedRoles: ['DISPATCHER', 'OPERATIONS_MANAGER'],
    labelAr: 'مسودة',
    descriptionAr: 'إنشاء مسودة سجل الرحلة الأولي'
  },
  LOADED: {
    targetStatus: 'LOADED',
    allowedFrom: ['DRAFT'],
    allowedRoles: ['SCALE_OPERATOR', 'DISPATCHER', 'OPERATIONS_MANAGER'],
    labelAr: 'تم التحميل والوزن',
    descriptionAr: 'اكتمال عملية التحميل في الموقع ووزن الميزان القائم والفارغ بالمصدر'
  },
  IN_TRANSIT: {
    targetStatus: 'IN_TRANSIT',
    allowedFrom: ['LOADED', 'DRAFT', 'EXCEPTION'],
    allowedRoles: ['DISPATCHER', 'SCALE_OPERATOR', 'OPERATIONS_MANAGER'],
    labelAr: 'بدء الرحلة (في الطريق)',
    descriptionAr: 'ترحيل الشاحنة وانطلاقها على المسار المعتمد بعد اجتياز تسعير الرحلة'
  },
  ARRIVED: {
    targetStatus: 'ARRIVED',
    allowedFrom: ['IN_TRANSIT', 'EXCEPTION'],
    allowedRoles: ['DRIVER', 'SITE_RECEIVER', 'DISPATCHER', 'OPERATIONS_MANAGER'],
    labelAr: 'وصول الشاحنة',
    descriptionAr: 'وصول الشاحنة إلى بوابة موقع الاستلام/التفريغ'
  },
  UNLOADING: {
    targetStatus: 'UNLOADING',
    allowedFrom: ['ARRIVED', 'EXCEPTION'],
    allowedRoles: ['SITE_RECEIVER', 'OPERATIONS_MANAGER'],
    labelAr: 'بدء التفريغ',
    descriptionAr: 'دخول الشاحنة إلى منصة/قمع التفريغ بعد التفتيش المبدئي'
  },
  COMPLETED: {
    targetStatus: 'COMPLETED',
    allowedFrom: ['UNLOADING', 'EXCEPTION'],
    allowedRoles: ['SITE_RECEIVER', 'OPERATIONS_MANAGER', 'AUDITOR'],
    labelAr: 'إكمال الرحلة والتسوية',
    descriptionAr: 'إتمام التفريغ وتوثيق صافي وزن الوصول واحتساب تفاوت الوزن تلقائياً'
  },
  RETURN_REQUESTED: {
    targetStatus: 'RETURN_REQUESTED',
    allowedFrom: ['IN_TRANSIT', 'ARRIVED', 'UNLOADING', 'EXCEPTION'],
    allowedRoles: ['SITE_RECEIVER', 'DISPATCHER', 'OPERATIONS_MANAGER'],
    labelAr: 'طلب إرجاع الشحنة',
    descriptionAr: 'رفض الشحنة لعدم مطابقة المواصفات أو تعذر التفريغ وطلب العودة للمصدر',
    requiresReason: true
  },
  RETURNED: {
    targetStatus: 'RETURNED',
    allowedFrom: ['RETURN_REQUESTED'],
    allowedRoles: ['SCALE_OPERATOR', 'DISPATCHER', 'OPERATIONS_MANAGER'],
    labelAr: 'تم الإرجاع للمصدر',
    descriptionAr: 'تأكيد وصول الشاحنة المرتجعة إلى المحجر أو الكسارة المصدرية',
    requiresReason: true
  },
  EXCEPTION: {
    targetStatus: 'EXCEPTION',
    allowedFrom: ['LOADED', 'IN_TRANSIT', 'ARRIVED', 'UNLOADING', 'RETURN_REQUESTED'],
    allowedRoles: ['DRIVER', 'DISPATCHER', 'SITE_RECEIVER', 'OPERATIONS_MANAGER'],
    labelAr: 'تسجيل استثناء / عطل',
    descriptionAr: 'توثيق حالة طارئة كعطل ميكانيكي، حادث مروري، أو نزاع وزني',
    requiresReason: true
  },
  CANCELLED: {
    targetStatus: 'CANCELLED',
    allowedFrom: ['DRAFT', 'LOADED', 'EXCEPTION'],
    allowedRoles: ['DISPATCHER', 'OPERATIONS_MANAGER'],
    labelAr: 'إلغاء الرحلة',
    descriptionAr: 'إلغاء أمر الرحلة كلياً قبل الانطلاق أو بقرار تشغيلي معتمد',
    requiresReason: true
  }
};

export class TripStateMachine {
  private events: Map<string, TripLifecycleEvent[]> = new Map();
  private auditLogs: Map<string, TripAuditLog[]> = new Map();

  constructor() {
    this.seedInitialAudit();
  }

  private seedInitialAudit() {
    // Seed initial event for TRP-101
    const seedEvent: TripLifecycleEvent = {
      eventId: 'EVT-INIT-101',
      tripId: 'TRP-101',
      action: 'SYSTEM_GENESIS',
      fromStatus: 'UNLOADING',
      toStatus: 'COMPLETED',
      actorId: 'REC-INSPECTOR-NEOM',
      actorRole: 'SITE_RECEIVER',
      actorName: 'م. فهد الزهراني',
      projectId: 'PRJ-NEOM-01',
      timestamp: '2026-09-08T15:00:00.000Z',
      reason: 'اعتماد تفريغ الشحنة ووزن الوصول الأولي',
      version: 2
    };
    this.events.set('TRP-101', [seedEvent]);

    const seedAudit: TripAuditLog = {
      auditId: 'AUD-INIT-101',
      tripId: 'TRP-101',
      action: 'STATUS_CHANGE_UNLOADING_TO_COMPLETED',
      fromStatus: 'UNLOADING',
      toStatus: 'COMPLETED',
      actorId: 'REC-INSPECTOR-NEOM',
      actorRole: 'SITE_RECEIVER',
      actorName: 'م. فهد الزهراني',
      projectId: 'PRJ-NEOM-01',
      versionBefore: 1,
      versionAfter: 2,
      timestamp: '2026-09-08T15:00:00.000Z',
      details: 'تم ترقية حالة الرحلة إلى COMPLETED بعد التحقق من صافي وزن الوصول (30,850 كجم) واحتساب التفاوت (-150 كجم).',
      diff: {
        status: { before: 'UNLOADING', after: 'COMPLETED' },
        destNetWeight: { before: null, after: 30850 },
        varianceWeight: { before: null, after: -150 },
        version: { before: 1, after: 2 }
      }
    };
    this.auditLogs.set('TRP-101', [seedAudit]);
  }

  /**
   * Prohibits client-side direct mutation of trip.status.
   * If a client tries to patch status directly on the trip object, this check rejects it.
   */
  assertNoDirectStatusMutation(currentTrip: TripRecord, clientProposedTrip: Partial<TripRecord>): void {
    if (clientProposedTrip.status !== undefined && clientProposedTrip.status !== currentTrip.status) {
      throw new Error(
        `[حظر أمني رقابي]: غير مسموح للعميل بتعديل حالة الرحلة (status) مباشرة من '${currentTrip.status}' إلى '${clientProposedTrip.status}'. يجب أن تمر جميع التحولات حصرياً عبر محرك الحالات المركزي (Centralized State Machine) للتحقق من الصلاحيات والقواعد الإلزامية.`
      );
    }
  }

  /**
   * Validates pre-flight conditions for a requested transition without mutating state.
   */
  checkTransition(
    trip: TripRecord,
    targetStatus: TripEngineStatus,
    context: TransitionContext,
    payload?: TransitionPayload
  ): TransitionCheckResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const rule = STATE_TRANSITIONS[targetStatus];

    if (!rule) {
      errors.push(`الحالة المستهدفة (${targetStatus}) غير معرفة في محرك الحالات.`);
      return { canTransition: false, targetStatus, errors, warnings };
    }

    // 1. Validate Current State
    if (!rule.allowedFrom.includes(trip.status)) {
      errors.push(
        `الانتقال من الحالة الحالية [${trip.status}] إلى [${targetStatus}] غير مسموح به. الحالات المسموح بها للانطلاق: [${rule.allowedFrom.join(', ') || 'لا يوجد'}].`
      );
    }

    // 2. Validate Role
    if (!rule.allowedRoles.includes(context.actorRole)) {
      errors.push(
        `الرتبة التشغيلية الحالية [${context.actorRole}] غير مصرح لها بتنفيذ التحول إلى [${targetStatus}]. الأدوار المصرحة: [${rule.allowedRoles.join(', ')}].`
      );
    }

    // 3. Validate Project Match
    if (!context.projectId || context.projectId !== trip.projectId) {
      errors.push(
        `فشل التحقق من المشروع: مشروع المشغل (${context.projectId || 'غير محدد'}) لا يطابق مشروع الرحلة (${trip.projectId}). التحول محظور.`
      );
    }

    // 4. Validate Specific Business Invariants

    // A) Transition to IN_TRANSIT (بدء الرحلة):
    // Invariant: لا تسمح ببدء رحلة إذا فشل Pricing Resolution.
    if (targetStatus === 'IN_TRANSIT') {
      const pricingResolutionResult = this.verifyPricingResolution(trip);
      if (!pricingResolutionResult.passed) {
        errors.push(
          `[حظر بدء الرحلة]: فشل حل التسعير واحتساب التسوية (Pricing Resolution Failed) - ${pricingResolutionResult.message}`
        );
      }
      // Must have origin weights and positive net weight
      const netWeight = payload?.grossWeight && payload?.tareWeight 
        ? payload.grossWeight - payload.tareWeight 
        : trip.netWeight;
      if (!netWeight || netWeight <= 0) {
        errors.push('لا يمكن بدء الرحلة بدون تسجيل وزن صافي موجب بالمصدر (netWeight > 0).');
      }
    }

    // B) Transition to COMPLETED (إكمال الرحلة):
    // Invariant: لا تسمح بإكمال الرحلة بدون: destNetWeight, unloaderId, unloadTime
    // Invariant: لا تسمح بإتمام رحلة بدون حساب variance.
    if (targetStatus === 'COMPLETED') {
      const destNetWeight = payload?.destNetWeight !== undefined 
        ? payload.destNetWeight 
        : (payload?.destGrossWeight && payload?.destTareWeight 
            ? payload.destGrossWeight - payload.destTareWeight 
            : trip.destNetWeight);

      const unloaderId = payload?.unloaderId || trip.unloaderId;
      const unloadTime = payload?.unloadTime || trip.unloadTime;

      if (destNetWeight === null || destNetWeight === undefined || destNetWeight <= 0) {
        errors.push('[حظر إكمال الرحلة]: لا يمكن إكمال الرحلة بدون تسجيل وتأكيد صافي وزن موقع الاستلام (destNetWeight).');
      }

      if (!unloaderId || unloaderId.trim() === '') {
        errors.push('[حظر إكمال الرحلة]: لا يمكن إكمال الرحلة بدون تحديد هوية مستلم الموقع المعتمد (unloaderId).');
      }

      if (!unloadTime || unloadTime.trim() === '') {
        errors.push('[حظر إكمال الرحلة]: لا يمكن إكمال الرحلة بدون تسجيل وقت التفريغ الفعلي (unloadTime).');
      }

      // Variance calculation check
      if (destNetWeight !== null && destNetWeight !== undefined && destNetWeight > 0) {
        if (!trip.netWeight || trip.netWeight <= 0) {
          errors.push('[حظر إكمال الرحلة]: صافي وزن المصدر مفقود، لا يمكن حساب تفاوت الوزن (varianceWeight).');
        }
      }
    }

    // C) Transition requiring reason (EXCEPTION, RETURN_REQUESTED, CANCELLED, RETURNED)
    if (rule.requiresReason) {
      const reason = context.reason || payload?.reason;
      if (!reason || reason.trim().length < 5) {
        errors.push(`يجب كتابة سبب توضيحي صريح ومبرر (5 أحرف على الأقل) للانتقال إلى حالة [${targetStatus}].`);
      }
    }

    return {
      canTransition: errors.length === 0,
      targetStatus,
      errors,
      warnings
    };
  }

  /**
   * Verifies Pricing Resolution for a trip.
   * Ensures pricingSnapshot exists, agreedRate > 0, rule is active in master data, and dates match shiftDate.
   */
  private verifyPricingResolution(trip: TripRecord): { passed: boolean; message: string } {
    if (!trip.pricingSnapshot) {
      return { passed: false, message: 'لقطة التسعير (Pricing Snapshot) مفقودة في وثيقة الرحلة.' };
    }

    if (!trip.pricingSnapshot.agreedRate || trip.pricingSnapshot.agreedRate <= 0) {
      return { passed: false, message: 'السعر المتفق عليه صفر أو غير محدد في قاعدة التسعير.' };
    }

    if (!trip.pricingSnapshot.settlementAmount || trip.pricingSnapshot.settlementAmount <= 0) {
      return { passed: false, message: 'مبلغ التسوية المحسوب غير صحيح أو يساوي صفراً.' };
    }

    // Verify against active master data pricing rules
    const activePricingRules = MASTER_PRICING_RULES.filter(r => r.projectId === trip.projectId);
    const matchedRule = activePricingRules.find(r => r.pricingRuleId === trip.pricingRuleId);

    if (!matchedRule) {
      return { passed: false, message: `قاعدة التسعير (${trip.pricingRuleId}) غير مسجلة في المشروع الحالي.` };
    }

    if (matchedRule.status !== 'ACTIVE') {
      return { passed: false, message: `قاعدة التسعير (${matchedRule.name}) معطلة أو غير نشطة حالياً.` };
    }

    if (matchedRule.effectiveFrom && trip.shiftDate < matchedRule.effectiveFrom) {
      return { passed: false, message: `تاريخ الرحلة (${trip.shiftDate}) يسبق تاريخ بدء سريان التسعيرة (${matchedRule.effectiveFrom}).` };
    }

    if (matchedRule.effectiveTo && trip.shiftDate > matchedRule.effectiveTo) {
      return { passed: false, message: `انتهت صلاحية قاعدة التسعير في (${matchedRule.effectiveTo}) وتاريخ الوردية (${trip.shiftDate}).` };
    }

    return { passed: true, message: 'تم التحقق بنجاح من قاعدة التسعير وصلاحية التاريخ والتسوية.' };
  }

  /**
   * Executes a formal transition through the Centralized State Machine.
   * Enforces all invariant gates, produces an Event, produces an Audit Log, and increments version.
   */
  transition(
    trip: TripRecord,
    targetStatus: TripEngineStatus,
    context: TransitionContext,
    payload: TransitionPayload = {}
  ): { updatedTrip: TripRecord; event: TripLifecycleEvent; auditLog: TripAuditLog } {
    // 1. Execute check
    const check = this.checkTransition(trip, targetStatus, context, payload);
    if (!check.canTransition) {
      const formattedErrors = check.errors.join(' | ');
      throw new Error(`[خطأ في محرك الحالات المركزي]: فشل الانتقال إلى [${targetStatus}] - ${formattedErrors}`);
    }

    const nowIso = new Date().toISOString();
    const newVersion = trip.version + 1;
    const diff: Record<string, { before: any; after: any }> = {
      status: { before: trip.status, after: targetStatus },
      version: { before: trip.version, after: newVersion }
    };

    // Clone base record
    const updatedTrip: TripRecord = { ...trip };
    updatedTrip.status = targetStatus;
    updatedTrip.version = newVersion;
    updatedTrip.updatedAt = nowIso;
    updatedTrip.updatedBy = `${context.actorName} (${context.actorRole})`;

    // Apply payload fields based on transition
    if (targetStatus === 'LOADED') {
      if (payload.tareWeight !== undefined) {
        diff.tareWeight = { before: trip.tareWeight, after: payload.tareWeight };
        updatedTrip.tareWeight = payload.tareWeight;
      }
      if (payload.grossWeight !== undefined) {
        diff.grossWeight = { before: trip.grossWeight, after: payload.grossWeight };
        updatedTrip.grossWeight = payload.grossWeight;
      }
      if (updatedTrip.grossWeight > updatedTrip.tareWeight) {
        const calculatedNet = updatedTrip.grossWeight - updatedTrip.tareWeight;
        diff.netWeight = { before: trip.netWeight, after: calculatedNet };
        updatedTrip.netWeight = calculatedNet;
      }
      if (payload.loaderId) {
        updatedTrip.loaderId = payload.loaderId;
      }
      if (!updatedTrip.loadTime) {
        updatedTrip.loadTime = nowIso;
      }
    }

    if (targetStatus === 'IN_TRANSIT') {
      if (!updatedTrip.loadTime) {
        updatedTrip.loadTime = payload.loadTime || nowIso;
      }
      if (payload.ticketId) {
        updatedTrip.ticketId = payload.ticketId;
      }
    }

    if (targetStatus === 'ARRIVED') {
      const arrTime = payload.arrivalTime || nowIso;
      diff.arrivalTime = { before: trip.arrivalTime, after: arrTime };
      updatedTrip.arrivalTime = arrTime;
    }

    if (targetStatus === 'UNLOADING') {
      if (payload.unloaderId) {
        diff.unloaderId = { before: trip.unloaderId, after: payload.unloaderId };
        updatedTrip.unloaderId = payload.unloaderId;
      }
    }

    if (targetStatus === 'COMPLETED') {
      // 1. Resolve destNetWeight
      let calculatedDestNet: number;
      if (payload.destGrossWeight !== undefined && payload.destTareWeight !== undefined) {
        calculatedDestNet = payload.destGrossWeight - payload.destTareWeight;
      } else if (payload.destNetWeight !== undefined) {
        calculatedDestNet = payload.destNetWeight;
      } else if (trip.destNetWeight !== null) {
        calculatedDestNet = trip.destNetWeight;
      } else {
        throw new Error('[حظر إكمال الرحلة]: لا يمكن إكمال الرحلة بدون صافي وزن موقع الاستلام.');
      }

      // 2. Strict variance calculation: destNetWeight - netWeight
      const calculatedVariance = calculatedDestNet - updatedTrip.netWeight;

      diff.destNetWeight = { before: trip.destNetWeight, after: calculatedDestNet };
      diff.varianceWeight = { before: trip.varianceWeight, after: calculatedVariance };

      updatedTrip.destNetWeight = calculatedDestNet;
      updatedTrip.varianceWeight = calculatedVariance;

      const unloader = payload.unloaderId || trip.unloaderId || context.actorId;
      const unloadTime = payload.unloadTime || trip.unloadTime || nowIso;

      diff.unloaderId = { before: trip.unloaderId, after: unloader };
      diff.unloadTime = { before: trip.unloadTime, after: unloadTime };

      updatedTrip.unloaderId = unloader;
      updatedTrip.unloadTime = unloadTime;
    }

    if (payload.notes) {
      updatedTrip.notes = `${trip.notes} | ${payload.notes}`;
    }

    const actionName = `TRANSITION_${trip.status}_TO_${targetStatus}`;
    const reasonText = context.reason || payload.reason || STATE_TRANSITIONS[targetStatus].labelAr;

    // Create Immutable Event
    const event: TripLifecycleEvent = {
      eventId: `EVT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      tripId: trip.tripId,
      action: actionName,
      fromStatus: trip.status,
      toStatus: targetStatus,
      actorId: context.actorId,
      actorRole: context.actorRole,
      actorName: context.actorName,
      projectId: context.projectId,
      timestamp: nowIso,
      reason: reasonText,
      payload: { ...payload },
      version: newVersion
    };

    // Store Event
    const currentEvents = this.events.get(trip.tripId) || [];
    this.events.set(trip.tripId, [...currentEvents, event]);

    // Create Audit Log
    const auditLog: TripAuditLog = {
      auditId: `AUD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      tripId: trip.tripId,
      action: actionName,
      fromStatus: trip.status,
      toStatus: targetStatus,
      actorId: context.actorId,
      actorRole: context.actorRole,
      actorName: context.actorName,
      projectId: context.projectId,
      versionBefore: trip.version,
      versionAfter: newVersion,
      timestamp: nowIso,
      details: `تم ترقية حالة الرحلة (${trip.tripSerial}) من [${trip.status}] إلى [${targetStatus}]. السبب/الملاحظة: ${reasonText}`,
      diff
    };

    // Store Audit Log
    const currentAudits = this.auditLogs.get(trip.tripId) || [];
    this.auditLogs.set(trip.tripId, [...currentAudits, auditLog]);

    return { updatedTrip, event, auditLog };
  }

  /**
   * Directly appends a lifecycle event (used for genesis/loading station events).
   */
  addLifecycleEvent(event: TripLifecycleEvent): void {
    const currentEvents = this.events.get(event.tripId) || [];
    this.events.set(event.tripId, [...currentEvents, event]);
  }

  /**
   * Directly appends an audit log (used for genesis/loading station audits).
   */
  addAuditLog(auditLog: TripAuditLog): void {
    const currentAudits = this.auditLogs.get(auditLog.tripId) || [];
    this.auditLogs.set(auditLog.tripId, [...currentAudits, auditLog]);
  }

  /**
   * Retrieves all lifecycle events recorded for a trip.
   */
  getEvents(tripId: string): TripLifecycleEvent[] {
    return this.events.get(tripId) || [];
  }

  /**
   * Retrieves all audit logs recorded for a trip.
   */
  getAuditLogs(tripId: string): TripAuditLog[] {
    return this.auditLogs.get(tripId) || [];
  }

  /**
   * Lists all allowable next transitions for a trip given the actor's role.
   */
  getAvailableTransitions(trip: TripRecord, role: TripActorRole): TransitionRule[] {
    return Object.values(STATE_TRANSITIONS).filter(rule => 
      rule.allowedFrom.includes(trip.status) && rule.allowedRoles.includes(role)
    );
  }
}

export const tripStateMachine = new TripStateMachine();
