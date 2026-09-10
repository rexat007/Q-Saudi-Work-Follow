/**
 * Conflict Resolution Service for Offline-First Architecture.
 * 
 * Strict Mandates:
 * 1. NEVER use "Last Write Wins" (LWW) for operational trips.
 * 2. When a conflict occurs:
 *    - Preserve local command
 *    - Preserve server state
 *    - Create conflict record
 *    - Notify user
 *    - Require explicit resolution
 * 3. Pricing Invariance Guarantee:
 *    - If a trip is created offline with a valid Pricing Snapshot at creation time,
 *      NEVER alter the trip's price later due to server price updates.
 *    - The new server price applies strictly to FUTURE trips.
 */

import { indexedDBService } from './indexedDB.service';
import { 
  ConflictRecord, 
  ConflictType, 
  ConflictStatus, 
  ConflictResolutionDetails, 
  ResolutionStrategy,
  ConflictDiffField,
  ConflictPricingProtection 
} from '../../types/conflict';
import { OutboxOperation } from '../../types/offline';
import { tripEngineService, MASTER_PRICING_RULES, MasterPricingRule } from '../tripEngine.service';
import { tripStateMachine } from '../tripStateMachine.service';
import { TripRecord, TripLifecycleEvent } from '../../types/tripEngine';

type ConflictListener = () => void;

class ConflictResolutionService {
  private inMemoryConflicts: Map<string, ConflictRecord> = new Map();
  private listeners: Set<ConflictListener> = new Set();
  private notificationCallback?: (notif: { type: 'SECURITY' | 'ERROR' | 'SUCCESS'; message: string }) => void;

  constructor() {
    this.initFromStorage();
  }

  private async initFromStorage() {
    try {
      const records = await indexedDBService.getConflictRecords();
      records.forEach(r => this.inMemoryConflicts.set(r.conflictId, r));
      this.notifyListeners();
    } catch {
      // IndexedDB might not be available yet in some SSR contexts
    }
  }

  public setNotificationCallback(cb: (notif: { type: 'SECURITY' | 'ERROR' | 'SUCCESS'; message: string }) => void) {
    this.notificationCallback = cb;
  }

  /**
   * Evaluates an Outbox operation against current server state and returns a ConflictRecord if any conflict exists.
   */
  public detectConflict(op: OutboxOperation): ConflictRecord | null {
    const payload = op.payload || {};
    const tripId = payload.tripId;
    const nowIso = new Date().toISOString();

    // 1. Check for TRIP_ALREADY_COMPLETED & TRIP_ALREADY_RETURNED & VERSION_CONFLICT on existing trip
    if (tripId) {
      const serverTrip = tripEngineService.getTripById(tripId);
      if (serverTrip) {
        // 1a. TRIP_ALREADY_COMPLETED
        if (serverTrip.status === 'COMPLETED' && payload.status !== 'COMPLETED') {
          return this.buildConflictRecord({
            operationId: op.operationId,
            projectId: op.projectId,
            conflictType: 'TRIP_ALREADY_COMPLETED',
            titleAr: 'تعارض: الرحلة مكتملة ومغلقة بالفعل على الخادم',
            descriptionAr: `تم تفريغ واستلام الرحلة (${serverTrip.tripSerial}) وتأكيد اكتمالها خادومياً قبل مزامنة العملية المحلية. يمنع نظامياً الكتابة فوق الرحلات المكتملة (Anti Last-Write-Wins).`,
            tripId: serverTrip.tripId,
            tripSerial: serverTrip.tripSerial,
            ticketId: serverTrip.ticketId,
            op,
            serverState: {
              trip: serverTrip,
              status: serverTrip.status,
              serverVersion: serverTrip.version,
              serverUpdatedAt: serverTrip.updatedAt,
              reasonAr: 'تم إغلاق الرحلة في محطة التفريغ/المشروع مسبقاً',
            },
            diffFields: [
              {
                field: 'status',
                fieldLabelAr: 'حالة الرحلة',
                localValue: payload.status || 'IN_TRANSIT',
                serverValue: serverTrip.status,
                notesAr: 'الحالة في الخادم مكتملة رسمياً',
              },
              {
                field: 'version',
                fieldLabelAr: 'رقم الإصدار',
                localValue: payload.version || 1,
                serverValue: serverTrip.version,
              }
            ]
          });
        }

        // 1b. TRIP_ALREADY_RETURNED
        if (serverTrip.status === 'RETURNED') {
          return this.buildConflictRecord({
            operationId: op.operationId,
            projectId: op.projectId,
            conflictType: 'TRIP_ALREADY_RETURNED',
            titleAr: 'تعارض: الرحلة مصنفة كمرتجعة (RETURNED) على الخادم',
            descriptionAr: `تم رفض الشحنة أو إرجاعها إلى المصدر (${serverTrip.tripSerial}) على الخادم قبل وصول العملية المحلية.`,
            tripId: serverTrip.tripId,
            tripSerial: serverTrip.tripSerial,
            ticketId: serverTrip.ticketId,
            op,
            serverState: {
              trip: serverTrip,
              status: serverTrip.status,
              serverVersion: serverTrip.version,
              serverUpdatedAt: serverTrip.updatedAt,
              reasonAr: 'تم تسجيل إرجاع الشحنة من مراقب الموقع',
            },
            diffFields: [
              {
                field: 'status',
                fieldLabelAr: 'حالة الرحلة',
                localValue: payload.status || 'IN_TRANSIT',
                serverValue: 'RETURNED',
              }
            ]
          });
        }

        // 1c. VERSION_CONFLICT
        const localVersion = payload.version || 1;
        if (serverTrip.version > localVersion) {
          return this.buildConflictRecord({
            operationId: op.operationId,
            projectId: op.projectId,
            conflictType: 'VERSION_CONFLICT',
            titleAr: 'تعارض في إصدارات السجل (Version Conflict)',
            descriptionAr: `السجل في الخادم تم تعديله (الإصدار الحالي: v${serverTrip.version}) بينما تم إعداد الأمر المحلي بالاعتماد على الإصدار (v${localVersion}). يمنع الكتابة التلقائية دون حل معتمد.`,
            tripId: serverTrip.tripId,
            tripSerial: serverTrip.tripSerial,
            ticketId: serverTrip.ticketId,
            op,
            serverState: {
              trip: serverTrip,
              serverVersion: serverTrip.version,
              serverUpdatedAt: serverTrip.updatedAt,
              status: serverTrip.status,
            },
            diffFields: [
              {
                field: 'version',
                fieldLabelAr: 'إصدار السجل',
                localValue: `v${localVersion}`,
                serverValue: `v${serverTrip.version}`,
              },
              {
                field: 'notes',
                fieldLabelAr: 'الملاحظات وبيانات التحديث',
                localValue: payload.notes || 'N/A',
                serverValue: serverTrip.notes || 'N/A',
              }
            ]
          });
        }
      }
    }

    // 2. DUPLICATE_OPERATION: Check for duplicate ticketId or tripSerial on distinct trip
    if (payload.ticketId) {
      const existingWithTicket = tripEngineService.getTrips().find(t => 
        t.ticketId === payload.ticketId && t.tripId !== tripId
      );
      if (existingWithTicket) {
        return this.buildConflictRecord({
          operationId: op.operationId,
          projectId: op.projectId,
          conflictType: 'DUPLICATE_OPERATION',
          titleAr: 'تعارض تكرار التذكرة/العملية (Duplicate Operation)',
          descriptionAr: `رقم تذكرة الميزان (${payload.ticketId}) مسجل مسبقاً لرحلة أخرى في النظام (${existingWithTicket.tripSerial}). لا يمكن إصدار تذكرتين برقم موحد.`,
          tripId: payload.tripId,
          tripSerial: payload.tripSerial,
          ticketId: payload.ticketId,
          op,
          serverState: {
            trip: existingWithTicket,
            status: existingWithTicket.status,
            serverVersion: existingWithTicket.version,
          },
          diffFields: [
            {
              field: 'ticketId',
              fieldLabelAr: 'رقم تذكرة الميزان',
              localValue: payload.ticketId,
              serverValue: existingWithTicket.ticketId,
              notesAr: 'التذكرة محجوزة لرحلة سابقة',
            }
          ]
        });
      }
    }

    // 3. PRICING_CHANGED: Server pricing rule updated compared to local creation snapshot
    const pricingRuleId = payload.pricingRuleId || payload.pricingSnapshot?.pricingRuleId;
    if (pricingRuleId) {
      let currentServerRule = MASTER_PRICING_RULES.find(r => r.pricingRuleId === pricingRuleId);
      if (!currentServerRule && (pricingRuleId === 'PRC-AGG-TON-01' || pricingRuleId === 'PRC-NEOM-AGG-TON-01')) {
        currentServerRule = MASTER_PRICING_RULES.find(r => r.pricingRuleId === 'PRC-NEOM-HAUL-TON-8.5') || MASTER_PRICING_RULES[0];
      }
      const localSnapshot = payload.pricingSnapshot;

      if (currentServerRule && localSnapshot) {
        const rateChanged = currentServerRule.agreedRate !== localSnapshot.agreedRate;
        const typeChanged = currentServerRule.pricingType !== localSnapshot.pricingType;

        if (rateChanged || typeChanged) {
          // Rule mandate: If trip was created offline with a valid snapshot,
          // do not alter trip price. New price only applies to future trips.
          const rateDiff = currentServerRule.agreedRate - localSnapshot.agreedRate;
          const protection: ConflictPricingProtection = {
            hasValidSnapshot: true,
            snapshotRate: localSnapshot.agreedRate,
            serverCurrentRate: currentServerRule.agreedRate,
            rateDifference: rateDiff,
            pricingSnapshotDate: localSnapshot.pricingSnapshotAt || payload.createdAt || nowIso,
            ruleName: currentServerRule.name,
            currency: localSnapshot.currency || 'SAR',
            policyNoteAr: 'قاعدة عدم المساس بالقيمة التعاقدية للـ Offline: نظراً لإنشاء الرحلة باستخدام لقطة تسعير (Pricing Snapshot) صالحة ومعتمدة وقت الإنشاء، فإن قيمة الرحلة تظل ثابتة تماماً باللقطة الأصلية. التحديث الخادومي يسري فقط على الرحلات المستقبلية.',
          };

          return this.buildConflictRecord({
            operationId: op.operationId,
            projectId: op.projectId,
            conflictType: 'PRICING_CHANGED',
            titleAr: 'تحديث في قاعدة التسعير الخادومية (Pricing Changed)',
            descriptionAr: `تم تحديث سعر القاعدة (${currentServerRule.name}) على الخادم من (${localSnapshot.agreedRate} ر.س) إلى (${currentServerRule.agreedRate} ر.س). تحمي المنظومة السعر الأصلي للرحلة استناداً للقطة التسعير الموثقة وقت الإنشاء.`,
            tripId: payload.tripId,
            tripSerial: payload.tripSerial,
            ticketId: payload.ticketId,
            op,
            serverState: {
              pricingRule: currentServerRule,
              reasonAr: 'تم تعديل السعر المعتمد على الخادم بعد إنشاء الرحلة Offline',
            },
            pricingProtection: protection,
            diffFields: [
              {
                field: 'agreedRate',
                fieldLabelAr: 'السعر المتفق عليه (ر.س)',
                localValue: `${localSnapshot.agreedRate} ر.س (لقطة التحميل المحمية)`,
                serverValue: `${currentServerRule.agreedRate} ر.س (السعر الحالي على الخادم)`,
                isProtectedBySnapshot: true,
                notesAr: 'محمي باللقطة التعاقدية وقت الإنشاء',
              },
              {
                field: 'settlementAmount',
                fieldLabelAr: 'إجمالي التسوية المالية التقديرية',
                localValue: `${payload.settlementAmount?.toLocaleString()} ر.س`,
                serverValue: `${(currentServerRule.agreedRate * (payload.netWeight ? payload.netWeight / 1000 : 1)).toFixed(2)} ر.س (إذا أعيد الاحتساب)`,
                isProtectedBySnapshot: true,
              }
            ]
          });
        }
      }
    }

    // 4. TRUCK_CARRIER_CONFLICT: Truck reassigned or not linked to current carrier on server
    if (payload.truckId && payload.carrierId) {
      // Check if truck is flagged with another carrier in server state
      const serverTruckConflict = this.checkTruckCarrierMismatch(payload.truckId, payload.carrierId);
      if (serverTruckConflict) {
        return this.buildConflictRecord({
          operationId: op.operationId,
          projectId: op.projectId,
          conflictType: 'TRUCK_CARRIER_CONFLICT',
          titleAr: 'تعارض تبعية الشاحنة للناقل (Truck-Carrier Conflict)',
          descriptionAr: `الشاحنة (${payload.truckId}) مسجلة على الخادم تابعة لناقل آخر (${serverTruckConflict.serverCarrierName}) أو تم إلغاء ربطها بالناقل (${payload.carrierId}).`,
          tripId: payload.tripId,
          tripSerial: payload.tripSerial,
          ticketId: payload.ticketId,
          op,
          serverState: {
            masterData: serverTruckConflict,
            reasonAr: 'تحديث في سجل ملكية أو تفويض الشاحنات على الخادم',
          },
          diffFields: [
            {
              field: 'carrierId',
              fieldLabelAr: 'الناقل المفوض',
              localValue: payload.carrierId,
              serverValue: serverTruckConflict.serverCarrierId,
              notesAr: `الناقل الفعلي بالخادم: ${serverTruckConflict.serverCarrierName}`,
            }
          ]
        });
      }
    }

    // 5. MASTER_DATA_CHANGED: Project, Material or Driver suspended on server
    const masterDataIssue = this.checkMasterDataStatus(payload);
    if (masterDataIssue) {
      return this.buildConflictRecord({
        operationId: op.operationId,
        projectId: op.projectId,
        conflictType: 'MASTER_DATA_CHANGED',
        titleAr: 'تغيير في البيانات الأساسية (Master Data Changed)',
        descriptionAr: masterDataIssue.messageAr,
        tripId: payload.tripId,
        tripSerial: payload.tripSerial,
        ticketId: payload.ticketId,
        op,
        serverState: {
          masterData: masterDataIssue.details,
          status: 'INACTIVE',
          reasonAr: masterDataIssue.messageAr,
        },
        diffFields: [
          {
            field: masterDataIssue.entityField,
            fieldLabelAr: masterDataIssue.entityLabelAr,
            localValue: 'نشط ومصرح به محلياً (Active in Cache)',
            serverValue: `${masterDataIssue.currentStatus} على الخادم`,
            notesAr: 'تم تعليق أو تعديل الكيان خادومياً أثناء عمل الـ Offline',
          }
        ]
      });
    }

    return null;
  }

  /**
   * Helper to construct and record a conflict record adhering to strict mandates:
   * - preserve local command
   * - preserve server state
   * - create conflict record
   * - notify user
   * - require explicit resolution
   */
  private buildConflictRecord(params: {
    operationId: string;
    projectId: string;
    conflictType: ConflictType;
    titleAr: string;
    descriptionAr: string;
    tripId?: string;
    tripSerial?: string;
    ticketId?: string;
    op: OutboxOperation;
    serverState: any;
    diffFields: ConflictDiffField[];
    pricingProtection?: ConflictPricingProtection;
  }): ConflictRecord {
    const conflictId = `CONF-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const nowIso = new Date().toISOString();

    const record: ConflictRecord = {
      conflictId,
      operationId: params.operationId,
      projectId: params.projectId,
      conflictType: params.conflictType,
      status: 'OPEN',
      titleAr: params.titleAr,
      descriptionAr: params.descriptionAr,
      tripId: params.tripId,
      tripSerial: params.tripSerial,
      ticketId: params.ticketId,

      // 1. Preserve local command strictly
      localCommand: {
        operationType: params.op.operationType,
        payload: params.op.payload,
        createdAt: params.op.createdAt,
        userId: params.op.userId,
        deviceId: params.op.deviceId,
        version: params.op.payload?.version || 1,
        pricingSnapshot: params.op.payload?.pricingSnapshot,
      },

      // 2. Preserve server state strictly
      serverState: params.serverState,

      // Diff & pricing invariance rules
      diffFields: params.diffFields,
      pricingProtection: params.pricingProtection,

      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // 3. Create conflict record in memory & IndexedDB
    this.inMemoryConflicts.set(conflictId, record);
    indexedDBService.saveConflictRecord(record).catch(() => {});

    // 4. Notify User
    if (this.notificationCallback) {
      this.notificationCallback({
        type: 'SECURITY',
        message: `تم اكتشاف تعارض في المزامنة (${params.conflictType}): ${params.titleAr} - يتطلب اتخاذ إجراء وحل يدوي صريح.`
      });
    }

    this.notifyListeners();
    return record;
  }

  /**
   * Resolves a conflict with an explicit resolution strategy.
   * Mandate: "require explicit resolution"
   */
  public async resolveConflict(
    conflictId: string, 
    resolution: {
      strategy: ResolutionStrategy;
      resolvedBy: string;
      justification: string;
      customPayload?: Record<string, any>;
    }
  ): Promise<{ success: boolean; messageAr: string; committedTrip?: TripRecord }> {
    const conflict = this.inMemoryConflicts.get(conflictId) || await indexedDBService.getConflictRecordById(conflictId);
    if (!conflict) {
      throw new Error(`سجل التعارض (${conflictId}) غير موجود`);
    }

    if (conflict.status === 'RESOLVED') {
      return { success: true, messageAr: 'هذا التعارض تمت معالجته وحله مسبقاً' };
    }

    const nowIso = new Date().toISOString();
    let committedTrip: TripRecord | undefined;
    let messageAr = '';

    // Apply strategy based on user/supervisor explicit decision
    switch (resolution.strategy) {
      // 1. For PRICING_CHANGED: Preserve original offline snapshot
      case 'PRESERVE_PRICING_SNAPSHOT': {
        const localPayload = conflict.localCommand.payload;
        // Keep the exact snapshot rate and settlement amount recorded at loading
        const snapshot = localPayload.pricingSnapshot || {
          agreedRate: localPayload.agreedRate || 8.5,
          pricingType: localPayload.pricingType || 'PER_TON',
          settlementAmount: localPayload.settlementAmount,
          ruleName: 'تسعيرة وثيقة التحميل المحمية',
        };

        const serverTrip = this.commitTripWithPreservedSnapshot(localPayload, snapshot, resolution.resolvedBy);
        committedTrip = serverTrip;
        messageAr = `تم تأكيد واعتماد الرحلة مع المحافظة التامة على سعر اللقطة التعاقدية الأصلية (${snapshot.agreedRate} ر.س) دون تأثر بتحديث الأسعار الخادومي.`;
        break;
      }

      // 1b. Exceptional override to new pricing
      case 'OVERRIDE_TO_NEW_PRICING': {
        const localPayload = conflict.localCommand.payload;
        const newRule = conflict.serverState.pricingRule;
        if (!newRule) {
          throw new Error('بيانات السعر الجديد للخادم غير متوفرة للتطبيق');
        }
        const netTons = (localPayload.grossWeight - localPayload.tareWeight) / 1000;
        const updatedAmount = newRule.pricingType === 'PER_TON'
          ? parseFloat((netTons * newRule.agreedRate).toFixed(2))
          : newRule.agreedRate;

        const overriddenSnapshot = {
          pricingRuleId: newRule.pricingRuleId,
          pricingType: newRule.pricingType,
          agreedRate: newRule.agreedRate,
          settlementAmount: updatedAmount,
          ruleName: newRule.name,
          pricingSnapshotAt: nowIso,
          effectiveFrom: newRule.effectiveFrom,
          effectiveTo: newRule.effectiveTo,
        };

        const serverTrip = this.commitTripWithPreservedSnapshot(
          { ...localPayload, settlementAmount: updatedAmount, agreedRate: newRule.agreedRate },
          overriddenSnapshot,
          resolution.resolvedBy
        );
        committedTrip = serverTrip;
        messageAr = `تم تطبيق السعر الجديد استثنائياً (${newRule.agreedRate} ر.س) بناء على اعتماد المشرف.`;
        break;
      }

      // 2. Accept Server State
      case 'ACCEPT_SERVER_STATE': {
        // Keep the server's current state and cancel local conflicting mutations
        messageAr = 'تم اعتماد حالة الخادم بنجاح وإلغاء التعارض المحلي.';
        break;
      }

      // 3. Force Client State (with supervisor audit justification)
      case 'FORCE_CLIENT_STATE': {
        const localPayload = conflict.localCommand.payload;
        const existingTrip = conflict.tripId ? tripEngineService.getTripById(conflict.tripId) : undefined;
        const targetVersion = (existingTrip?.version || conflict.serverState.serverVersion || 1) + 1;

        committedTrip = this.commitTripWithPreservedSnapshot(
          { ...localPayload, version: targetVersion },
          localPayload.pricingSnapshot,
          resolution.resolvedBy
        );
        messageAr = `تم فرض الأمر المحلي واعتماده بالإصدار الجديد v${targetVersion} مع توثيق التدقيق.`;
        break;
      }

      // 4. Discard Duplicate
      case 'DISCARD_DUPLICATE': {
        messageAr = 'تم استبعاد وتجاهل العملية المكررة بنجاح.';
        break;
      }

      // 5. Assign New Ticket Serial
      case 'ASSIGN_NEW_SERIAL': {
        const localPayload = { ...conflict.localCommand.payload };
        const newTicketId = `WB-REISSUE-${Date.now()}`;
        const newTripSerial = `TRP-REISSUE-${Math.floor(1000 + Math.random() * 9000)}`;
        localPayload.ticketId = newTicketId;
        localPayload.tripSerial = newTripSerial;

        committedTrip = this.commitTripWithPreservedSnapshot(
          localPayload,
          localPayload.pricingSnapshot,
          resolution.resolvedBy
        );
        messageAr = `تمت إعادة إصدار تذكرة ميزان جديدة برقم (${newTicketId}) واعتماد الرحلة بنجاح.`;
        break;
      }

      // 6. Update Master Data Relation
      case 'UPDATE_MASTER_DATA_RELATION': {
        const localPayload = { ...conflict.localCommand.payload };
        if (conflict.serverState.masterData?.serverCarrierId) {
          localPayload.carrierId = conflict.serverState.masterData.serverCarrierId;
        }
        committedTrip = this.commitTripWithPreservedSnapshot(
          localPayload,
          localPayload.pricingSnapshot,
          resolution.resolvedBy
        );
        messageAr = 'تمت تسوية ومطابقة التبعية مع البيانات الأساسية للخادم واعتماد الرحلة.';
        break;
      }

      // 7. Cancel Local Operation
      case 'CANCEL_LOCAL_OPERATION': {
        messageAr = 'تم إلغاء العملية المحلية وحفظ سجل المراجعة التدقيقية.';
        break;
      }

      default: {
        messageAr = 'تم تنفيذ الحل الإلزامي بنجاح.';
      }
    }

    // Update conflict record
    const updatedDetails: ConflictResolutionDetails = {
      strategy: resolution.strategy,
      resolvedBy: resolution.resolvedBy,
      resolvedAt: nowIso,
      justification: resolution.justification || 'تم اتخاذ القرار عبر وحدة معالجة التعارضات الصريحة',
      finalPayload: resolution.customPayload,
      notesAr: messageAr,
    };

    conflict.status = 'RESOLVED';
    conflict.resolution = updatedDetails;
    conflict.updatedAt = nowIso;

    this.inMemoryConflicts.set(conflictId, conflict);
    await indexedDBService.updateConflictRecord(conflictId, {
      status: 'RESOLVED',
      resolution: updatedDetails,
    });

    // Update outbox status to SYNCED now that conflict is explicitly resolved
    if (conflict.operationId) {
      await indexedDBService.updateOutboxStatus(conflict.operationId, 'SYNCED', {
        syncedAt: nowIso,
        serverAck: {
          tripId: committedTrip?.tripId || conflict.tripId,
          tripSerial: committedTrip?.tripSerial || conflict.tripSerial,
          committedAt: nowIso,
          messageAr: `تم حل التعارض واعتماد العملية: ${messageAr}`,
        },
      });
    }

    // Record Lifecycle & Audit Trail Event
    if (conflict.tripId) {
      tripStateMachine.addLifecycleEvent({
        eventId: `EVT-CONF-RES-${Date.now()}`,
        tripId: conflict.tripId,
        action: 'STATUS_TRANSITION',
        fromStatus: 'IN_TRANSIT',
        toStatus: committedTrip?.status || 'IN_TRANSIT',
        actorId: resolution.resolvedBy,
        actorRole: 'OPERATIONS_MANAGER',
        actorName: 'مشرف العمليات ومعالجة التعارضات',
        projectId: conflict.projectId,
        timestamp: nowIso,
        reason: `حل تعارض (${conflict.conflictType}) باستراتيجية (${resolution.strategy}): ${resolution.justification}`,
        version: committedTrip?.version || 1,
      });
    }

    this.notifyListeners();
    return { success: true, messageAr, committedTrip };
  }

  /**
   * Helper to commit a trip while ensuring Pricing Snapshot invariance.
   */
  private commitTripWithPreservedSnapshot(
    payload: Record<string, any>,
    snapshot: any,
    actorId: string
  ): TripRecord {
    const tripId = payload.tripId || `TRP-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const netWeight = (payload.grossWeight || 0) - (payload.tareWeight || 0);
    const netTons = parseFloat((netWeight / 1000).toFixed(3));

    const snapshotRate = snapshot?.agreedRate ?? payload.agreedRate ?? 8.5;
    const settledAmount = snapshot?.settlementAmount !== undefined
      ? snapshot.settlementAmount
      : (snapshot?.pricingType === 'PER_TON'
          ? parseFloat((netTons * snapshotRate).toFixed(2))
          : snapshotRate);

    const trip: TripRecord = {
      tripId,
      projectId: payload.projectId || 'PRJ-NEOM-NORTH',
      tripSerial: payload.tripSerial || `TRP-RESOLVED-${Math.floor(1000 + Math.random() * 9000)}`,
      ticketId: payload.ticketId || `WB-TKT-${Math.floor(100000 + Math.random() * 900000)}`,
      truckId: payload.truckId || 'TRK-9011',
      driverId: payload.driverId || 'DRV-501',
      carrierId: payload.carrierId || 'CAR-001',
      materialId: payload.materialId || 'MAT-AGG-01',
      shiftDate: payload.shiftDate || '2026-09-09',
      tareWeight: payload.tareWeight || 14200,
      grossWeight: payload.grossWeight || 42800,
      netWeight,
      destNetWeight: payload.destNetWeight || null,
      varianceWeight: payload.varianceWeight || null,
      pricingRuleId: snapshot?.pricingRuleId || 'PRC-001',
      pricingType: snapshot?.pricingType || 'PER_TON',
      agreedRate: snapshot?.agreedRate || 8.5,
      currency: snapshot?.currency || 'SAR',
      settlementBase: snapshot?.pricingType === 'PER_TON' ? netTons : 1,
      settlementAmount: settledAmount,
      loaderId: payload.loaderId || actorId,
      unloaderId: payload.unloaderId || null,
      status: payload.status || 'IN_TRANSIT',
      version: (payload.version || 1) + 1,
      loadTime: payload.loadTime || nowIso,
      arrivalTime: payload.arrivalTime || null,
      unloadTime: payload.unloadTime || null,
      notes: `${payload.notes || ''} [تم حل التعارض واعتماد لقطة التسعير المحمية]`.trim(),
      createdAt: payload.createdAt || nowIso,
      createdBy: payload.createdBy || actorId,
      updatedAt: nowIso,
      updatedBy: actorId,
      pricingSnapshot: snapshot,
    };

    // Store in tripEngineService memory
    const existing = tripEngineService.getTrips();
    const idx = existing.findIndex(t => t.tripId === tripId);
    if (idx !== -1) {
      existing[idx] = trip;
    } else {
      (tripEngineService as any).trips = [trip, ...existing];
    }

    // Also persist in IndexedDB
    indexedDBService.put('trips', trip).catch(() => {});

    return trip;
  }

  // Helper validation checks
  private checkTruckCarrierMismatch(truckId: string, carrierId: string) {
    // Demo rule: If truck is TRK-9011 and carrier is CAR-003, it's a conflict
    if (truckId === 'TRK-9011' && carrierId === 'CAR-003') {
      return {
        serverCarrierId: 'CAR-001',
        serverCarrierName: 'شركة اليمامة لنقل المواد وتجهيز الطرق',
      };
    }
    return null;
  }

  private checkMasterDataStatus(payload: Record<string, any>) {
    if (payload.materialId === 'MAT-DEACTIVATED') {
      return {
        entityField: 'materialId',
        entityLabelAr: 'المادة المنقولة',
        currentStatus: 'موقوفة (DEACTIVATED)',
        messageAr: 'تم إيقاف توريد هذه المادة خادومياً لعدم مطابقة المواصفات البيئية للمشروع',
        details: { materialId: payload.materialId },
      };
    }
    return null;
  }

  /**
   * Retrieves all conflict records, optionally filtered.
   */
  public async getConflicts(filter?: { status?: ConflictStatus }): Promise<ConflictRecord[]> {
    let records = Array.from(this.inMemoryConflicts.values());
    if (records.length === 0) {
      records = await indexedDBService.getConflictRecords();
      records.forEach(r => this.inMemoryConflicts.set(r.conflictId, r));
    }
    if (filter?.status) {
      records = records.filter(r => r.status === filter.status);
    }
    return records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getConflictById(conflictId: string): ConflictRecord | undefined {
    return this.inMemoryConflicts.get(conflictId);
  }

  /**
   * Quick simulator method for testing all 7 conflict types interactively.
   */
  public async simulateConflict(type: ConflictType): Promise<ConflictRecord> {
    const nowIso = new Date().toISOString();
    const fakeOpId = `OP-SIM-${Date.now()}`;
    const tripSerial = `TRP-SIM-${Math.floor(1000 + Math.random() * 9000)}`;
    const ticketId = `WB-SIM-${Math.floor(100000 + Math.random() * 900000)}`;

    let op: OutboxOperation;

    switch (type) {
      case 'PRICING_CHANGED': {
        op = {
          operationId: fakeOpId,
          projectId: 'PRJ-NEOM-NORTH',
          userId: 'SIM-SCALE-OP',
          deviceId: 'DEV-SIM-PAD',
          operationType: 'CREATE_TRIP_LOADING',
          createdAt: nowIso,
          retryCount: 1,
          status: 'CONFLICT',
          payload: {
            tripId: `TRP-PRICE-TEST-${Date.now()}`,
            tripSerial,
            ticketId,
            truckId: 'TRK-9011',
            driverId: 'DRV-501',
            carrierId: 'CAR-001',
            materialId: 'MAT-AGG-01',
            tareWeight: 14500,
            grossWeight: 42500,
            netWeight: 28000,
            pricingRuleId: 'PRC-AGG-TON-01',
            pricingType: 'PER_TON',
            agreedRate: 6.5,
            settlementAmount: 182.00,
            pricingSnapshot: {
              pricingRuleId: 'PRC-AGG-TON-01',
              ruleName: 'تسعيرة بحص أساس توريد نيوم (بالطن)',
              pricingType: 'PER_TON',
              agreedRate: 6.5,
              currency: 'SAR',
              settlementBase: 28.0,
              settlementAmount: 182.00,
              pricingSnapshotAt: nowIso,
              effectiveFrom: '2026-01-01',
              effectiveTo: '2026-12-31',
            },
          },
        };
        break;
      }

      case 'VERSION_CONFLICT': {
        const existing = tripEngineService.getTrips()[0];
        op = {
          operationId: fakeOpId,
          projectId: existing?.projectId || 'PRJ-NEOM-NORTH',
          userId: 'SIM-SCALE-OP',
          deviceId: 'DEV-SIM-PAD',
          operationType: 'UPDATE_TRIP_STATUS',
          createdAt: nowIso,
          retryCount: 1,
          status: 'CONFLICT',
          payload: {
            tripId: existing?.tripId || 'TRP-101',
            tripSerial: existing?.tripSerial || 'TRP-NEOM-9021',
            ticketId: existing?.ticketId || 'WB-2026-9021',
            status: 'IN_TRANSIT',
            version: 1, // Server is already at version >= 2
            notes: 'تحديث ملاحظات الشحنة محلياً بوضع عدم الاتصال',
          },
        };
        break;
      }

      case 'TRIP_ALREADY_COMPLETED': {
        const existing = tripEngineService.getTrips().find(t => t.status === 'COMPLETED') || tripEngineService.getTrips()[0];
        op = {
          operationId: fakeOpId,
          projectId: existing?.projectId || 'PRJ-NEOM-NORTH',
          userId: 'SIM-SCALE-OP',
          deviceId: 'DEV-SIM-PAD',
          operationType: 'UPDATE_TRIP_STATUS',
          createdAt: nowIso,
          retryCount: 1,
          status: 'CONFLICT',
          payload: {
            tripId: existing?.tripId || 'TRP-101',
            tripSerial: existing?.tripSerial || 'TRP-NEOM-9021',
            ticketId: existing?.ticketId || 'WB-2026-9021',
            status: 'IN_TRANSIT',
            notes: 'محاولة إعادة ترحيل أو تعديل رحلة اكتملت وتفرغت بالفعل في الموقع',
          },
        };
        // Ensure server trip is COMPLETED
        if (existing) {
          (existing as any).status = 'COMPLETED';
        }
        break;
      }

      case 'TRIP_ALREADY_RETURNED': {
        const existing = tripEngineService.getTrips()[1] || tripEngineService.getTrips()[0];
        if (existing) {
          (existing as any).status = 'RETURNED';
        }
        op = {
          operationId: fakeOpId,
          projectId: existing?.projectId || 'PRJ-NEOM-NORTH',
          userId: 'SIM-SCALE-OP',
          deviceId: 'DEV-SIM-PAD',
          operationType: 'UPDATE_TRIP_STATUS',
          createdAt: nowIso,
          retryCount: 1,
          status: 'CONFLICT',
          payload: {
            tripId: existing?.tripId || 'TRP-102',
            tripSerial: existing?.tripSerial || 'TRP-NEOM-9022',
            ticketId: existing?.ticketId || 'WB-2026-9022',
            status: 'IN_TRANSIT',
            notes: 'محاولة ترحيل لرحلة تم رفضها وإرجاعها على الخادم',
          },
        };
        break;
      }

      case 'DUPLICATE_OPERATION': {
        const existing = tripEngineService.getTrips()[0];
        op = {
          operationId: fakeOpId,
          projectId: 'PRJ-NEOM-NORTH',
          userId: 'SIM-SCALE-OP',
          deviceId: 'DEV-SIM-PAD',
          operationType: 'CREATE_TRIP_LOADING',
          createdAt: nowIso,
          retryCount: 1,
          status: 'CONFLICT',
          payload: {
            tripId: `TRP-DUP-${Date.now()}`,
            tripSerial: `TRP-NEOM-${Math.floor(1000 + Math.random() * 9000)}`,
            ticketId: existing?.ticketId || 'WB-2026-9021', // Duplicate ticketId!
            truckId: 'TRK-9012',
            driverId: 'DRV-502',
            carrierId: 'CAR-001',
            materialId: 'MAT-AGG-01',
            tareWeight: 15000,
            grossWeight: 44000,
            netWeight: 29000,
            pricingRuleId: 'PRC-AGG-TON-01',
          },
        };
        break;
      }

      case 'TRUCK_CARRIER_CONFLICT': {
        op = {
          operationId: fakeOpId,
          projectId: 'PRJ-NEOM-NORTH',
          userId: 'SIM-SCALE-OP',
          deviceId: 'DEV-SIM-PAD',
          operationType: 'CREATE_TRIP_LOADING',
          createdAt: nowIso,
          retryCount: 1,
          status: 'CONFLICT',
          payload: {
            tripId: `TRP-TRUCK-CONF-${Date.now()}`,
            tripSerial,
            ticketId,
            truckId: 'TRK-9011',
            carrierId: 'CAR-003', // Mismatched carrier!
            driverId: 'DRV-501',
            materialId: 'MAT-AGG-01',
            tareWeight: 14000,
            grossWeight: 41000,
            netWeight: 27000,
            pricingRuleId: 'PRC-AGG-TON-01',
          },
        };
        break;
      }

      case 'MASTER_DATA_CHANGED': {
        op = {
          operationId: fakeOpId,
          projectId: 'PRJ-NEOM-NORTH',
          userId: 'SIM-SCALE-OP',
          deviceId: 'DEV-SIM-PAD',
          operationType: 'CREATE_TRIP_LOADING',
          createdAt: nowIso,
          retryCount: 1,
          status: 'CONFLICT',
          payload: {
            tripId: `TRP-MD-CONF-${Date.now()}`,
            tripSerial,
            ticketId,
            truckId: 'TRK-9011',
            carrierId: 'CAR-001',
            driverId: 'DRV-501',
            materialId: 'MAT-DEACTIVATED', // Deactivated material!
            tareWeight: 14000,
            grossWeight: 42000,
            netWeight: 28000,
            pricingRuleId: 'PRC-AGG-TON-01',
          },
        };
        break;
      }
    }

    // Save op to IndexedDB outbox
    await indexedDBService.saveOutboxOperation(op);

    // Trigger detection
    const conflict = this.detectConflict(op);
    if (conflict) {
      await indexedDBService.updateOutboxStatus(op.operationId, 'CONFLICT', {
        conflictDetails: {
          conflictId: conflict.conflictId,
          conflictType: conflict.conflictType,
          clientVersion: conflict.localCommand.version,
          serverVersion: conflict.serverState.serverVersion,
          conflictField: conflict.diffFields[0]?.field,
          messageAr: conflict.descriptionAr,
        },
      });
      return conflict;
    }

    throw new Error('فشلت محاكاة التعارض');
  }

  public subscribe(cb: ConflictListener): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notifyListeners(): void {
    this.listeners.forEach(cb => {
      try { cb(); } catch {}
    });
  }
}

export const conflictResolutionService = new ConflictResolutionService();
