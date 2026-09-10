import { truckRepository } from '../repositories/truck.repository';
import { carrierRepository } from '../repositories/carrier.repository';
import { TruckValidator } from '../validators/truck.validator';
import { TruckEntity } from '../types/entities';
import { AuthUserContext } from '../types/common';
import { auditLogService } from './auditLog.service';
import { normalizePlate } from '../utils/normalization';

export class TruckService {
  async getTrucks(projectId: string): Promise<TruckEntity[]> {
    return truckRepository.listByProject(projectId);
  }

  async getTruck(projectId: string, truckId: string): Promise<TruckEntity | null> {
    return truckRepository.findById(projectId, truckId);
  }

  async registerTruck(
    payload: Omit<TruckEntity, 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>,
    context: AuthUserContext
  ): Promise<TruckEntity> {
    // Enforce relationship: Truck -> Carrier
    if (!payload.carrierId || !payload.carrierId.trim()) {
      throw new Error('يجب تحديد الناقل التابع له الشاحنة (العلاقة: Truck → Carrier)');
    }

    const plate = payload.plate || payload.plateNumberAr || '';
    const normalizedPlate = payload.normalizedPlate || normalizePlate(plate);
    const status = payload.status || (payload.isActive === false ? 'INACTIVE' : 'ACTIVE');
    const tare = payload.tareWeightKg || 14000;
    const gross = payload.maxGrossWeightKg || 45000;

    const completePayload: typeof payload = {
      ...payload,
      plate,
      normalizedPlate,
      plateNumberAr: payload.plateNumberAr || plate,
      status,
      isActive: status === 'ACTIVE',
      tareWeightKg: tare,
      maxGrossWeightKg: gross,
      legalPayloadLimitKg: Math.max(0, gross - tare),
    };

    const validation = TruckValidator.validate(completePayload);
    if (!validation.isValid) {
      throw new Error(`خطأ في بيانات الشاحنة: ${validation.errors.map(e => e.messageAr).join(' | ')}`);
    }

    const newTruck = {
      ...completePayload,
      createdBy: context.userId,
      updatedBy: context.userId,
    };

    await truckRepository.create(newTruck);

    await auditLogService.recordLog({
      projectId: payload.projectId,
      entityType: 'TRUCK',
      entityId: payload.truckId,
      action: 'CREATE',
      after: newTruck,
    }, context);

    return newTruck as TruckEntity;
  }

  async updateTruck(
    projectId: string,
    truckId: string,
    updates: Partial<TruckEntity>,
    context: AuthUserContext
  ): Promise<void> {
    const existing = await truckRepository.findById(projectId, truckId);
    if (!existing) {
      throw new Error('الشاحنة غير موجودة');
    }

    const plate = updates.plate || updates.plateNumberAr || existing.plate || existing.plateNumberAr || '';
    const normalizedPlate = updates.normalizedPlate || (updates.plate ? normalizePlate(updates.plate) : existing.normalizedPlate);
    const status = updates.status || (updates.isActive !== undefined ? (updates.isActive ? 'ACTIVE' : 'INACTIVE') : existing.status);

    const merged: TruckEntity = {
      ...existing,
      ...updates,
      plate,
      normalizedPlate,
      plateNumberAr: updates.plateNumberAr || plate,
      status,
      isActive: status === 'ACTIVE',
      truckId,
      projectId,
    };

    if (merged.maxGrossWeightKg && merged.tareWeightKg) {
      merged.legalPayloadLimitKg = Math.max(0, merged.maxGrossWeightKg - merged.tareWeightKg);
    }

    const validation = TruckValidator.validate(merged);
    if (!validation.isValid) {
      throw new Error(`خطأ في تحديث الشاحنة: ${validation.errors.map(e => e.messageAr).join(' | ')}`);
    }

    await truckRepository.update(projectId, truckId, merged, context.userId);

    await auditLogService.recordLog({
      projectId,
      entityType: 'TRUCK',
      entityId: truckId,
      action: 'UPDATE',
      before: existing,
      after: merged,
    }, context);
  }

  /**
   * Imports a truck under a specific carrier with strict relationship validation.
   * Security Mandate: Prohibit importing a truck belonging to a different carrier.
   */
  async importTruck(
    projectId: string,
    targetCarrierId: string,
    truckPayload: Partial<TruckEntity>,
    context: AuthUserContext
  ): Promise<TruckEntity> {
    if (!targetCarrierId || !targetCarrierId.trim()) {
      throw new Error('يجب تحديد الناقل المستهدف للاستيراد');
    }

    // Check Carrier Mismatch in payload
    if (truckPayload.carrierId && truckPayload.carrierId !== targetCarrierId) {
      throw new Error(`تعارض أمني في الاستيراد: الشاحنة محددة لناقل (${truckPayload.carrierId}) يختلف عن الناقل المستهدف للاستيراد (${targetCarrierId}). يُحظر استيراد شاحنة تابعة لناقل مختلف`);
    }

    // Check existing trucks in the project/system
    const existingTrucks = await truckRepository.listByProject(projectId);
    const plate = truckPayload.plate || truckPayload.plateNumberAr || '';
    const normPlate = normalizePlate(plate);

    const conflictingTruck = existingTrucks.find(t => 
      (truckPayload.truckId && t.truckId === truckPayload.truckId) ||
      (normPlate && t.normalizedPlate === normPlate)
    );

    if (conflictingTruck && conflictingTruck.carrierId !== targetCarrierId) {
      throw new Error(`تعارض أمني (Truck-Carrier Mismatch): الشاحنة (${plate || truckPayload.truckId}) مسجلة مسبقاً في النظام تابعة لناقل آخر (${conflictingTruck.carrierId}). يُحظر استيرادها أو ربطها بالناقل (${targetCarrierId}) بدون إجراءات نقل ملكية واعتماد رسمي`);
    }

    const truckToRegister: Omit<TruckEntity, 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'> = {
      truckId: truckPayload.truckId || `TRK-${Date.now().toString(36).toUpperCase()}`,
      projectId,
      carrierId: targetCarrierId,
      plate,
      normalizedPlate: normPlate,
      plateNumberAr: truckPayload.plateNumberAr || plate,
      truckType: truckPayload.truckType || 'TIPPER_32M3',
      tareWeightKg: truckPayload.tareWeightKg || 14000,
      maxGrossWeightKg: truckPayload.maxGrossWeightKg || 45000,
      legalPayloadLimitKg: (truckPayload.maxGrossWeightKg || 45000) - (truckPayload.tareWeightKg || 14000),
      status: truckPayload.status || 'ACTIVE',
      isActive: truckPayload.status !== 'INACTIVE',
    };

    return this.registerTruck(truckToRegister, context);
  }

  subscribeByProject(projectId: string, onData: (trucks: TruckEntity[]) => void) {
    return truckRepository.subscribeByProject(projectId, onData);
  }
}

export const truckService = new TruckService();
