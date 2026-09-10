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

  subscribeByProject(projectId: string, onData: (trucks: TruckEntity[]) => void) {
    return truckRepository.subscribeByProject(projectId, onData);
  }
}

export const truckService = new TruckService();
