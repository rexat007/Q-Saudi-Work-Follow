/**
 * Outbox Service for Offline-First Architecture.
 * Manages the client-side operation queue, status transitions, and online synchronization pipeline.
 * 
 * Outbox Schema:
 * - operationId
 * - projectId
 * - userId
 * - deviceId
 * - operationType
 * - payload
 * - createdAt
 * - retryCount
 * - status (PENDING | SENDING | SYNCED | FAILED | CONFLICT)
 * 
 * Synchronization Pipeline (Online):
 * Sync → Server validation → Idempotency → Commit → ACK
 */

import { indexedDBService } from './indexedDB.service';
import { OutboxOperation, OutboxStatus, OutboxStats } from '../../types/offline';
import { tripEngineService, MasterPricingRule, MASTER_PRICING_RULES } from '../tripEngine.service';
import { tripStateMachine } from '../tripStateMachine.service';
import { syncOperationRepository } from '../../repositories/syncOperation.repository';
import { TripRecord, TripLifecycleEvent, TripAuditLog } from '../../types/tripEngine';
import { conflictResolutionService } from './conflictResolution.service';

const DEVICE_ID_KEY = 'q_saudi_device_id';

export class OutboxService {
  private isSyncing = false;
  private listeners: Set<() => void> = new Set();

  /**
   * Retrieves or initializes a persistent device identifier.
   */
  public getDeviceId(): string {
    if (typeof window === 'undefined') return 'DEV-SERVER-STATIC';
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = `DEV-SCALE-${Math.floor(100 + Math.random() * 900)}`;
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  }

  /**
   * Enqueues a new operation into the Outbox with status PENDING.
   */
  public async queueOperation(params: {
    operationId?: string;
    projectId: string;
    userId: string;
    operationType: OutboxOperation['operationType'];
    payload: Record<string, any>;
  }): Promise<OutboxOperation> {
    const operationId = params.operationId || `OP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    const op: OutboxOperation = {
      operationId,
      projectId: params.projectId,
      userId: params.userId,
      deviceId: this.getDeviceId(),
      operationType: params.operationType,
      payload: params.payload,
      createdAt: now,
      retryCount: 0,
      status: 'PENDING',
    };

    await indexedDBService.saveOutboxOperation(op);
    this.notifyListeners();
    return op;
  }

  /**
   * Retrieves all outbox operations.
   */
  public async getOperations(): Promise<OutboxOperation[]> {
    return indexedDBService.getOutboxOperations();
  }

  /**
   * Computes counts for each outbox status.
   */
  public async getStats(): Promise<OutboxStats> {
    const ops = await this.getOperations();
    return {
      total: ops.length,
      pending: ops.filter(o => o.status === 'PENDING').length,
      sending: ops.filter(o => o.status === 'SENDING').length,
      synced: ops.filter(o => o.status === 'SYNCED').length,
      failed: ops.filter(o => o.status === 'FAILED').length,
      conflict: ops.filter(o => o.status === 'CONFLICT').length,
    };
  }

  /**
   * Synchronizes queued Outbox operations when Online.
   * Pipeline:
   * 1. Sync: Fetch PENDING and FAILED operations
   * 2. Server validation: Verify data integrity against server rules
   * 3. Idempotency: Verify operationId hasn't already been committed
   * 4. Commit: Save to authoritative server store
   * 5. ACK: Mark operation as SYNCED with server details
   */
  public async syncAll(isSimulatedOffline = false): Promise<{
    processedCount: number;
    syncedCount: number;
    failedCount: number;
    conflictCount: number;
  }> {
    if (this.isSyncing) {
      return { processedCount: 0, syncedCount: 0, failedCount: 0, conflictCount: 0 };
    }

    if (isSimulatedOffline || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      return { processedCount: 0, syncedCount: 0, failedCount: 0, conflictCount: 0 };
    }

    this.isSyncing = true;
    let processedCount = 0;
    let syncedCount = 0;
    let failedCount = 0;
    let conflictCount = 0;

    try {
      const ops = await this.getOperations();
      const pendingOps = ops.filter(o => o.status === 'PENDING' || (o.status === 'FAILED' && o.retryCount < 5));

      for (const op of pendingOps) {
        processedCount++;

        // Step 1: Set to SENDING
        await indexedDBService.updateOutboxStatus(op.operationId, 'SENDING');
        this.notifyListeners();

        try {
          // Step 2: Server validation
          const validationError = this.validateOperationServerSide(op);
          if (validationError) {
            await indexedDBService.updateOutboxStatus(op.operationId, 'FAILED', {
              retryCount: op.retryCount + 1,
              errorReason: validationError,
            });
            failedCount++;
            continue;
          }

          // Step 3: Idempotency Check
          const existingSyncRecord = await syncOperationRepository.findById(op.projectId, op.operationId);
          if (existingSyncRecord) {
            // Already processed previously on the server!
            await indexedDBService.updateOutboxStatus(op.operationId, 'SYNCED', {
              syncedAt: new Date().toISOString(),
              serverAck: {
                committedAt: existingSyncRecord.createdAt ? new Date(existingSyncRecord.createdAt as any).toISOString() : new Date().toISOString(),
                messageAr: 'تم تأكيد المعالجة السابقة خادومياً (Idempotency Hit)',
              },
            });
            syncedCount++;
            continue;
          }

          // Step 3.5: Conflict Detection Engine (No Last-Write-Wins)
          // Preserves local command, preserves server state, records conflict, and blocks sync until explicit resolution
          const conflict = conflictResolutionService.detectConflict(op);
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
            conflictCount++;
            continue;
          }

          // Step 4: Commit to authoritative stores
          const commitResult = this.commitOperation(op);

          // Register idempotency entry in syncOperationRepository
          try {
            await syncOperationRepository.create({
              operationId: op.operationId,
              projectId: op.projectId,
              clientOperationUUID: op.operationId,
              targetCollection: 'trips',
              targetDocId: commitResult.tripId,
              status: 'PROCESSED',
              processedResponse: {
                tripSerial: commitResult.tripSerial,
                committedAt: new Date().toISOString(),
              },
              createdBy: op.userId,
              updatedBy: op.userId,
            });
          } catch {
            // Non-fatal if repository fails
          }

          // Step 5: ACK
          await indexedDBService.updateOutboxStatus(op.operationId, 'SYNCED', {
            syncedAt: new Date().toISOString(),
            serverAck: {
              tripId: commitResult.tripId,
              tripSerial: commitResult.tripSerial,
              serverVersion: commitResult.version,
              committedAt: new Date().toISOString(),
              messageAr: 'تمت المصادقة والاعتماد الخادومي بنجاح (ACK Confirmed)',
            },
          });
          syncedCount++;
        } catch (err: any) {
          await indexedDBService.updateOutboxStatus(op.operationId, 'FAILED', {
            retryCount: op.retryCount + 1,
            errorReason: err.message || 'خطأ غير متوقع أثناء معالجة المزامنة',
          });
          failedCount++;
        }
      }
    } finally {
      this.isSyncing = false;
      this.notifyListeners();
    }

    return { processedCount, syncedCount, failedCount, conflictCount };
  }

  /**
   * Server validation of operation payload.
   */
  private validateOperationServerSide(op: OutboxOperation): string | null {
    if (!op.projectId) return 'معرف المشروع مفقود في حمولة العملية';
    if (!op.payload) return 'بيانات العملية (Payload) فارغة';

    if (op.operationType === 'CREATE_TRIP_LOADING') {
      const { tareWeight, grossWeight, pricingRuleId, truckId, carrierId, driverId, materialId } = op.payload;
      if (!tareWeight || !grossWeight || grossWeight <= tareWeight) {
        return `فشل التحقق الخادومي: الوزن القائم (${grossWeight}) غير صالح مقارنة بوزن الفارغ (${tareWeight})`;
      }
      if (!pricingRuleId) {
        return 'فشل التحقق الخادومي: بيانات وقاعدة التسعير غير محددة بالرحلة';
      }
      if (!truckId || !carrierId || !driverId || !materialId) {
        return 'فشل التحقق الخادومي: نقص في بيانات Master Data الأساسية';
      }
    }

    return null;
  }

  /**
   * Detects conflict with existing server state.
   */
  private detectStateConflict(op: OutboxOperation): OutboxOperation['conflictDetails'] | null {
    if (op.operationType === 'CREATE_TRIP_LOADING') {
      const existingTrip = tripEngineService.getTripById(op.payload.tripId);
      if (existingTrip && existingTrip.status === 'COMPLETED') {
        return {
          clientVersion: op.payload.version || 1,
          serverVersion: existingTrip.version,
          conflictField: 'status',
          messageAr: 'تعارض: الرحلة منتهية ومكتملة بالفعل على الخادم ولا يمكن إعادة فتحها من التحميل',
        };
      }
    }
    return null;
  }

  /**
   * Commits the operation to authoritative memory/repositories.
   */
  private commitOperation(op: OutboxOperation): { tripId: string; tripSerial: string; version: number } {
    if (op.operationType === 'CREATE_TRIP_LOADING') {
      const p = op.payload;
      const tripId = p.tripId || `TRP-${Date.now()}`;
      const tripSerial = p.tripSerial || `TRP-NEOM-${Math.floor(1000 + Math.random() * 9000)}`;
      const nowIso = new Date().toISOString();

      // Pricing Invariance Mandate:
      // If the trip was created offline with a valid Pricing Snapshot, do NOT alter the trip price later due to server price updates.
      // The new server price applies strictly to future trips.
      const snapshot = p.pricingSnapshot;
      const agreedRate = snapshot?.agreedRate !== undefined ? snapshot.agreedRate : (p.agreedRate || 8.5);
      const pricingType = snapshot?.pricingType || p.pricingType || 'PER_TON';
      const pricingRuleId = snapshot?.pricingRuleId || p.pricingRuleId || 'PRC-AGG-TON-01';
      const ruleName = snapshot?.ruleName || 'تسعيرة وثيقة التحميل المحمية';

      const calculatedNet = p.grossWeight - p.tareWeight;
      const netTons = parseFloat((calculatedNet / 1000).toFixed(3));
      
      const settlementAmount = (snapshot && snapshot.settlementAmount !== undefined)
        ? snapshot.settlementAmount
        : (p.settlementAmount !== undefined 
          ? p.settlementAmount 
          : (pricingType === 'PER_TON' ? parseFloat((netTons * agreedRate).toFixed(2)) : agreedRate));

      const serverTrip: TripRecord = {
        tripId,
        projectId: op.projectId,
        tripSerial,
        ticketId: p.ticketId || `WB-TKT-${Math.floor(100000 + Math.random() * 900000)}`,
        truckId: p.truckId,
        driverId: p.driverId,
        carrierId: p.carrierId,
        materialId: p.materialId,
        shiftDate: p.shiftDate || '2026-09-09',
        tareWeight: p.tareWeight,
        grossWeight: p.grossWeight,
        netWeight: calculatedNet,
        destNetWeight: null,
        varianceWeight: null,
        pricingRuleId,
        pricingType,
        agreedRate,
        currency: snapshot?.currency || p.currency || 'SAR',
        settlementBase: pricingType === 'PER_TON' ? netTons : 1,
        settlementAmount,
        loaderId: p.loaderId || 'SCALE-OP-OFFLINE',
        unloaderId: null,
        status: 'IN_TRANSIT',
        version: (p.version || 1) + 1,
        loadTime: p.loadTime || nowIso,
        arrivalTime: null,
        unloadTime: null,
        notes: `${p.notes || ''} [تمت مزامنة العملية خادومياً مع حماية لقطة التسعير الميدانية]`.trim(),
        createdAt: p.createdAt || nowIso,
        createdBy: op.userId,
        updatedAt: nowIso,
        updatedBy: op.userId,
        pricingSnapshot: snapshot || {
          pricingRuleId,
          pricingType,
          agreedRate,
          currency: 'SAR',
          settlementBase: pricingType === 'PER_TON' ? netTons : 1,
          settlementAmount,
          ruleName,
          pricingSnapshotAt: nowIso,
          effectiveFrom: '2026-01-01',
          effectiveTo: '2026-12-31',
        },
        entitySnapshots: p.entitySnapshots,
      };

      // Add or update to trip service in-memory list
      const existingTrips = tripEngineService.getTrips();
      const exIdx = existingTrips.findIndex(t => t.tripId === tripId);
      if (exIdx !== -1) {
        existingTrips[exIdx] = serverTrip;
      } else {
        (tripEngineService as any).trips = [serverTrip, ...existingTrips];
      }

      // Record Lifecycle & Audit Events
      const syncEvent: TripLifecycleEvent = {
        eventId: `EVT-${Date.now()}-SYNC`,
        tripId,
        action: 'TRIP_GENESIS_DISPATCH',
        fromStatus: 'LOADED',
        toStatus: 'IN_TRANSIT',
        actorId: op.userId,
        actorRole: 'SCALE_OPERATOR',
        actorName: 'مرحل العمليات (Outbox Sync)',
        projectId: op.projectId,
        timestamp: nowIso,
        reason: `مزامنة واعتماد الرحلة خادومياً بعد اتصال الجهاز (${op.deviceId})`,
        version: serverTrip.version,
      };
      tripStateMachine.addLifecycleEvent(syncEvent);

      return {
        tripId: serverTrip.tripId,
        tripSerial: serverTrip.tripSerial,
        version: serverTrip.version,
      };
    }

    return { tripId: op.payload.tripId || 'N/A', tripSerial: 'N/A', version: 1 };
  }

  /**
   * Retries a specific failed or conflicted operation.
   */
  public async retryOperation(operationId: string): Promise<void> {
    await indexedDBService.updateOutboxStatus(operationId, 'PENDING', {
      errorReason: undefined,
    });
    this.notifyListeners();
  }

  /**
   * Removes all acknowledged SYNCED operations from the Outbox.
   */
  public async clearSynced(): Promise<void> {
    const ops = await this.getOperations();
    for (const op of ops) {
      if (op.status === 'SYNCED') {
        await indexedDBService.delete('outbox', op.operationId);
      }
    }
    this.notifyListeners();
  }

  /**
   * Observer subscription for reactive UI updates.
   */
  public subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    this.listeners.forEach(cb => {
      try { cb(); } catch {}
    });
  }
}

export const outboxService = new OutboxService();
