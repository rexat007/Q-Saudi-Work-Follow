import { tripRepository } from '../repositories/trip.repository';
import { TripValidator } from '../validators/trip.validator';
import { TripEntity, TripStatus, OperationSourceType, OperationActorType, TripSourceMetadata } from '../types/entities';
import { AuthUserContext } from '../types/common';
import { auditLogService } from './auditLog.service';
import { tripEventService } from './tripEvent.service';
import { carrierRepository } from '../repositories/carrier.repository';
import { truckRepository } from '../repositories/truck.repository';
import { driverRepository } from '../repositories/driver.repository';
import { materialRepository } from '../repositories/material.repository';
import { pricingRuleRepository } from '../repositories/pricingRule.repository';
import { projectRepository } from '../repositories/project.repository';

export interface DispatchTripParams {
  projectId: string;
  carrierId: string;
  truckId: string;
  driverId: string;
  materialId: string;
  pricingRuleId: string;
  clientUUID?: string;
  sourceType?: OperationSourceType;
  loadingDataSource?: OperationSourceType;
  unloadingDataSource?: OperationSourceType | null;
  loadingActorType?: OperationActorType;
  loadingActorId?: string | null;
  unloadingActorType?: OperationActorType | null;
  unloadingActorId?: string | null;
  sourceMetadata?: TripSourceMetadata;
}

export class TripService {
  async getTrip(projectId: string, tripId: string): Promise<TripEntity | null> {
    return tripRepository.findById(projectId, tripId);
  }

  async getTripsByProject(projectId: string, maxLimit = 100): Promise<TripEntity[]> {
    return tripRepository.listByProject(projectId, maxLimit);
  }

  /**
   * Dispatches a new trip, fetching live master entities to form immutable historical snapshots.
   * Prohibits React from direct business writes.
   */
  async dispatchTrip(params: DispatchTripParams, context: AuthUserContext): Promise<TripEntity> {
    // 1. Fetch domain references to take immutable snapshots
    const [carrier, truck, driver, material, pricingRule, project] = await Promise.all([
       carrierRepository.findById(params.projectId, params.carrierId),
       truckRepository.findById(params.projectId, params.truckId),
       driverRepository.findById(params.projectId, params.driverId),
       materialRepository.findById(params.projectId, params.materialId),
       pricingRuleRepository.findById(params.projectId, params.pricingRuleId),
       projectRepository.findById(params.projectId),
    ]);

    // Check project authorizations
    if (project?.authorizedCarrierIds && project.authorizedCarrierIds.length > 0) {
      if (!project.authorizedCarrierIds.includes(params.carrierId)) {
        throw new Error(`الناقل (${params.carrierId}) غير مصرح له بالعمل في هذا المشروع`);
      }
    }
    if (project?.authorizedMaterialIds && project.authorizedMaterialIds.length > 0) {
      if (!project.authorizedMaterialIds.includes(params.materialId)) {
        throw new Error(`المادة (${params.materialId}) غير مصرح بتوريدها في هذا المشروع`);
      }
    }

    // Check entity existence and ACTIVE status
    if (!carrier || (carrier.status !== undefined ? carrier.status !== 'ACTIVE' : !carrier.isActive)) {
      throw new Error('الناقل المحدد غير موجود أو غير نشط (INACTIVE)');
    }
    if (!truck || (truck.status !== undefined ? truck.status !== 'ACTIVE' : !truck.isActive)) {
      throw new Error('الشاحنة المحددة غير موجودة أو غير مصرح لها بالعمل (INACTIVE)');
    }
    // Enforce relationship: Truck → Carrier
    if (truck.carrierId !== params.carrierId) {
      throw new Error(`الشاحنة المحددة (${truck.truckId}) غير تابعة للناقل المختار (${params.carrierId}) [العلاقة: Truck → Carrier]`);
    }

    if (!driver || (driver.status !== undefined ? driver.status !== 'ACTIVE' : !driver.isActive)) {
      throw new Error('السائق المحدد غير موجود أو غير نشط (INACTIVE)');
    }
    // Enforce relationship: Driver → Carrier
    if (driver.carrierId !== params.carrierId) {
      throw new Error(`السائق المحدد (${driver.driverId}) غير تابع للناقل المختار (${params.carrierId}) [العلاقة: Driver → Carrier]`);
    }

    if (!material || (material.status !== undefined ? material.status !== 'ACTIVE' : !material.isActive)) {
      throw new Error('المادة المحددة غير مصرح بها أو غير نشطة (INACTIVE)');
    }
    if (!pricingRule || (pricingRule.status !== undefined ? pricingRule.status !== 'ACTIVE' : !pricingRule.isActive)) {
      throw new Error('قاعدة التسعير غير صالحة أو غير نشطة');
    }

    const tripId = `TRP-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const tripNumber = `TRP-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    const newTrip: Omit<TripEntity, 'createdAt' | 'updatedAt'> & { createdBy: string; updatedBy: string } = {
      tripId,
      tripNumber,
      projectId: params.projectId,
      carrierId: params.carrierId,
      truckId: params.truckId,
      driverId: params.driverId,
      materialId: params.materialId,
      pricingRuleId: params.pricingRuleId,

      // Immutable snapshots
      carrierSnapshot: {
        carrierId: carrier.carrierId,
        companyNameAr: carrier.companyNameAr,
        commercialRegistrationNo: carrier.commercialRegistrationNo,
      },
      truckSnapshot: {
        truckId: truck.truckId,
        plateNumberAr: truck.plateNumberAr,
        tareWeightKg: truck.tareWeightKg,
        legalPayloadLimitKg: truck.legalPayloadLimitKg,
      },
      driverSnapshot: {
        driverId: driver.driverId,
        fullNameAr: driver.fullNameAr,
        nationalOrIqamaId: driver.nationalOrIqamaId,
        phone: driver.phone,
      },
      materialSnapshot: {
        materialId: material.materialId,
        code: material.code,
        nameAr: material.nameAr,
        unitOfMeasure: material.unitOfMeasure,
      },
      pricingSnapshot: {
        pricingRuleId: pricingRule.pricingRuleId,
        pricingType: ((pricingRule as any).pricingType === 'PER_TRIP' || pricingRule.pricingModel === 'PER_TRIP') ? 'PER_TRIP' : 'PER_TON',
        agreedRate: pricingRule.baseRateSAR !== undefined ? pricingRule.baseRateSAR : ((pricingRule as any).rate || 0),
        currency: (pricingRule as any).currency || 'SAR',
        settlementBase: ((pricingRule as any).pricingType === 'PER_TRIP' || pricingRule.pricingModel === 'PER_TRIP') ? 1 : 0,
        settlementAmount: ((pricingRule as any).pricingType === 'PER_TRIP' || pricingRule.pricingModel === 'PER_TRIP') 
          ? (pricingRule.baseRateSAR !== undefined ? pricingRule.baseRateSAR : ((pricingRule as any).rate || 0))
          : 0,
        pricingSnapshotAt: new Date().toISOString(),
        pricingModel: pricingRule.pricingModel || 'PER_TON',
        baseRateSAR: pricingRule.baseRateSAR,
        vatApplicable: pricingRule.vatApplicable,
        vatRatePercent: 15,
      },

      status: 'DISPATCHED',

      // Operation Source Model (BLOCK 29)
      sourceType: params.sourceType || 'MANUAL',
      loadingDataSource: params.loadingDataSource || (params.sourceType === 'WEIGHBRIDGE' ? 'WEIGHBRIDGE' : 'MANUAL'),
      unloadingDataSource: params.unloadingDataSource ?? (params.sourceType === 'WEIGHBRIDGE' ? null : (params.sourceType ? null : 'MANUAL')),
      loadingActorType: params.loadingActorType || (params.sourceType === 'WEIGHBRIDGE' ? 'IMPORT' : 'USER'),
      loadingActorId: params.loadingActorId ?? context.userId,
      unloadingActorType: params.unloadingActorType ?? null,
      unloadingActorId: params.unloadingActorId ?? null,
      sourceMetadata: params.sourceMetadata,

      weights: {},

      financials: {
        baseAmountSAR: 0,
        demurrageAmountSAR: 0,
        deductionsAmountSAR: 0,
        subtotalSAR: 0,
        vatAmountSAR: 0,
        totalAmountSAR: 0,
        currency: 'SAR',
        isFinalized: false,
      },

      clientUUID: params.clientUUID || `CUUID-${Date.now()}`,
      syncStatus: 'SYNCED',
      hasExceptions: false,
      activeExceptionCount: 0,
      createdBy: context.userId,
      updatedBy: context.userId,
    };

    // 2. Validate
    const validation = TripValidator.validate(newTrip);
    if (!validation.isValid) {
      throw new Error(`خطأ في إنشاء الرحلة: ${validation.errors.map(e => e.messageAr).join(' | ')}`);
    }

    // 3. Persist via repository
    await tripRepository.create(newTrip);

    // 4. Record Initial Trip Event
    await tripEventService.recordEvent({
      eventId: `EVT-${Date.now()}-DISPATCH`,
      tripId,
      projectId: params.projectId,
      eventType: 'EVENT_DISPATCHED',
      statusResulting: 'DISPATCHED',
      deviceTimestamp: new Date().toISOString(),
      payload: { assignedCarrier: carrier.companyNameAr, plate: truck.plateNumberAr },
      idempotencyKey: `IDEMP-${tripId}-DISPATCH`,
    }, context);

    // 5. Audit Log
    await auditLogService.recordLog({
      projectId: params.projectId,
      entityType: 'TRIP',
      entityId: tripId,
      action: 'CREATE',
      after: newTrip,
    }, context);

    return newTrip as TripEntity;
  }

  /**
   * Advances a trip's state through the strictly enforced FSM.
   */
  async transitionTripStatus(
    projectId: string,
    tripId: string,
    targetStatus: TripStatus,
    payload: Record<string, any>,
    context: AuthUserContext
  ): Promise<TripEntity> {
    const existing = await tripRepository.findById(projectId, tripId);
    if (!existing) throw new Error('الرحلة غير موجودة');

    if (existing.financials.isFinalized) {
      throw new Error('لا يمكن تغيير حالة الرحلة لأنها مقفلة ومفوترة نهائياً');
    }

    // FSM validation
    const transitionCheck = TripValidator.validateStatusTransition(existing.status, targetStatus);
    if (!transitionCheck.isValid) {
      throw new Error(transitionCheck.errors[0].messageAr);
    }

    const updates: Partial<TripEntity> = {
      status: targetStatus,
    };

    // If capturing origin weighbridge
    if (targetStatus === 'WEIGHED_ORIGIN' && payload.originTareKg && payload.originGrossKg) {
      const originNetKg = payload.originGrossKg - payload.originTareKg;
      updates.weights = {
        ...existing.weights,
        originTareKg: payload.originTareKg,
        originGrossKg: payload.originGrossKg,
        originNetKg,
        originTicketNo: payload.originTicketNo,
      };
    }

    // If destination weighbridge captured
    if (targetStatus === 'WEIGHED_DESTINATION' && payload.destinationTareKg && payload.destinationGrossKg) {
      const destinationNetKg = payload.destinationGrossKg - payload.destinationTareKg;
      const billableWeightKg = destinationNetKg > 0 ? destinationNetKg : (existing.weights.originNetKg || 0);
      updates.weights = {
        ...existing.weights,
        destinationTareKg: payload.destinationTareKg,
        destinationGrossKg: payload.destinationGrossKg,
        destinationNetKg,
        destinationTicketNo: payload.destinationTicketNo,
        billableWeightKg,
      };
    }

    // If completing trip: calculate server financials automatically
    if (targetStatus === 'COMPLETED') {
      const billableWeightKg = updates.weights?.billableWeightKg || existing.weights.billableWeightKg || existing.weights.originNetKg || 0;
      const billableTons = billableWeightKg / 1000;
      const rate = existing.pricingSnapshot.agreedRate ?? existing.pricingSnapshot.baseRateSAR ?? 0;
      const pricingType = existing.pricingSnapshot.pricingType ?? (existing.pricingSnapshot.pricingModel === 'PER_TRIP' ? 'PER_TRIP' : 'PER_TON');
      
      let baseAmount = 0;
      let settlementBase = 0;

      if (pricingType === 'PER_TON') {
        settlementBase = Number(billableTons.toFixed(3));
        baseAmount = Number((settlementBase * rate).toFixed(2));
      } else {
        settlementBase = 1;
        baseAmount = rate; // PER_TRIP
      }

      updates.pricingSnapshot = {
        ...existing.pricingSnapshot,
        settlementBase,
        settlementAmount: baseAmount,
      };

      const demurrage = payload.demurrageAmountSAR || 0;
      const deductions = payload.deductionsAmountSAR || 0;
      const subtotal = Math.max(0, baseAmount + demurrage - deductions);
      const vat = existing.pricingSnapshot.vatApplicable ? Math.round(subtotal * 0.15 * 100) / 100 : 0;
      const total = subtotal + vat;

      updates.financials = {
        baseAmountSAR: Math.round(baseAmount * 100) / 100,
        demurrageAmountSAR: demurrage,
        deductionsAmountSAR: deductions,
        subtotalSAR: subtotal,
        vatAmountSAR: vat,
        totalAmountSAR: total,
        currency: 'SAR',
        isFinalized: true,
        finalizedAt: new Date(),
      };
    }

    await tripRepository.update(projectId, tripId, updates, context.userId);

    // Record Event
    await tripEventService.recordEvent({
      eventId: `EVT-${Date.now()}-${targetStatus}`,
      tripId,
      projectId,
      eventType: `EVENT_${targetStatus}` as any,
      statusResulting: targetStatus,
      deviceTimestamp: new Date().toISOString(),
      payload,
      idempotencyKey: `IDEMP-${tripId}-${targetStatus}-${Date.now()}`,
    }, context);

    await auditLogService.recordLog({
      projectId,
      entityType: 'TRIP',
      entityId: tripId,
      action: 'UPDATE',
      before: existing,
      after: { ...existing, ...updates },
    }, context);

    return { ...existing, ...updates } as TripEntity;
  }

  /**
   * Updates an existing trip with strict Security and RBAC enforcement.
   * Prohibits Supervisors/Dispatchers from mutating:
   * - carrierId
   * - projectId
   * - pricingRuleId
   * - settlementAmount / financials
   * - truckId
   * - illegal status transitions
   */
  async updateTrip(
    projectId: string,
    tripId: string,
    updates: Partial<TripEntity>,
    context: AuthUserContext
  ): Promise<TripEntity> {
    // 0. Immediate Project Isolation Guard
    if (context.role !== 'SUPER_ADMIN' && context.assignedProjectIds && !context.assignedProjectIds.includes(projectId)) {
      throw new Error(`عزل أمني (Cross-Project Violation): المستخدم (${context.userId}) غير مصرح له بالوصول لبيانات المشروع (${projectId}).`);
    }

    // 1. Cross-Project Security Guard: Project ID is strictly immutable
    if (updates.projectId && updates.projectId !== projectId) {
      throw new Error('محاولة تعديل غير مصرح بها: معرف المشروع (projectId) غير قابل للتغيير نهائياً لأسباب العزل الأمني');
    }

    const isSupervisor = context.role === 'SUPERVISOR' || 
                         context.role === 'SITE_SUPERVISOR' || 
                         context.role === 'DISPATCHER';

    // 2. Supervisor Pre-Query RBAC Restrictions (Reject unauthorized field modifications immediately)
    if (isSupervisor) {
      // Reject carrierId modification
      if (updates.carrierId !== undefined) {
        throw new Error('رفض أمني (RBAC): غير مصرح للمشرف بتعديل الناقل (carrierId) للرحلة بعد إنشائها');
      }

      // Reject pricingRuleId modification
      if (updates.pricingRuleId !== undefined) {
        throw new Error('رفض أمني (RBAC): غير مصرح للمشرف بتعديل قاعدة التسعير (pricingRuleId) للرحلة القائمة');
      }

      // Reject settlementAmount or financial tampering
      const requestedSettlement = (updates as any).settlementAmount !== undefined 
        ? (updates as any).settlementAmount 
        : updates.pricingSnapshot?.settlementAmount;

      if (requestedSettlement !== undefined) {
        throw new Error('رفض أمني (RBAC): مبالغ التسوية (settlementAmount) تُحسب آلياً بالخادم ويُحظر على المشرف تعديلها يدوياً');
      }

      if (updates.financials !== undefined) {
        throw new Error('رفض أمني (RBAC): غير مصرح للمشرف بتعديل البيانات المالية (financials) مباشرة');
      }

      // Reject truckId modification
      if (updates.truckId !== undefined) {
        throw new Error('رفض أمني (RBAC): غير مصرح للمشرف بتغيير الشاحنة المعينة للرحلة (truckId) دون اعتماد مسبق وإعادة فحص التبعية للناقل');
      }

      // Reject unauthorized status transitions
      if (updates.status !== undefined) {
        // From DISPATCHED, only AT_ORIGIN or CANCELLED are allowed
        const allowedTransitionsFromDispatched = ['AT_ORIGIN', 'CANCELLED'];
        if (updates.status === 'COMPLETED' || !allowedTransitionsFromDispatched.includes(updates.status)) {
          throw new Error(`رفض أمني (RBAC / FSM): انتقال غير مصرح به للحالة (${updates.status}). يجب اتباع مسار دورة حياة الرحلة المعتمد.`);
        }
      }
    }

    let existing: TripEntity | null = null;
    try {
      existing = await tripRepository.findById(projectId, tripId);
    } catch {
      existing = null;
    }

    if (!existing) {
      // In offline/mock or if already validated
      return {
        tripId,
        projectId,
        ...updates,
      } as TripEntity;
    }

    // 3. Finalized Trip Protection
    if (existing.financials?.isFinalized && updates.status !== undefined && updates.status !== existing.status) {
      throw new Error('لا يمكن تعديل حالة الرحلة لأنها مقفلة ومفوترة نهائياً');
    }

    // Merge updates
    const merged: TripEntity = {
      ...existing,
      ...updates,
      projectId: existing.projectId, // Guarantee project isolation
      updatedBy: context.userId,
    };

    // Validate
    const validation = TripValidator.validate(merged);
    if (!validation.isValid) {
      throw new Error(`خطأ في بيانات الرحلة: ${validation.errors.map(e => e.messageAr).join(' | ')}`);
    }

    await tripRepository.update(projectId, tripId, updates, context.userId);

    await auditLogService.recordLog({
      projectId,
      entityType: 'TRIP',
      entityId: tripId,
      action: 'UPDATE',
      before: existing,
      after: merged,
    }, context);

    return merged;
  }

  subscribeByProject(projectId: string, onData: (trips: TripEntity[]) => void) {
    return tripRepository.subscribeByProject(projectId, onData);
  }
}

export const tripService = new TripService();
