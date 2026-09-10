import { carrierRepository } from '../repositories/carrier.repository';
import { CarrierValidator } from '../validators/carrier.validator';
import { CarrierEntity } from '../types/entities';
import { AuthUserContext } from '../types/common';
import { auditLogService } from './auditLog.service';
import { normalizeName } from '../utils/normalization';

export class CarrierService {
  async getCarriersByProject(projectId: string): Promise<CarrierEntity[]> {
    return carrierRepository.listByProject(projectId);
  }

  async getCarrier(projectId: string, carrierId: string): Promise<CarrierEntity | null> {
    return carrierRepository.findById(projectId, carrierId);
  }

  async registerCarrier(
    payload: Omit<CarrierEntity, 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>,
    context: AuthUserContext
  ): Promise<CarrierEntity> {
    const name = payload.name || payload.companyNameAr || '';
    const normalizedName = payload.normalizedName || normalizeName(name);
    const status = payload.status || (payload.isActive === false ? 'INACTIVE' : 'ACTIVE');

    const carrierToValidate: typeof payload = {
      ...payload,
      name,
      normalizedName,
      companyNameAr: payload.companyNameAr || name,
      status,
      isActive: status === 'ACTIVE',
    };

    const validation = CarrierValidator.validate(carrierToValidate);
    if (!validation.isValid) {
      throw new Error(`خطأ في بيانات الناقل: ${validation.errors.map(e => e.messageAr).join(' | ')}`);
    }

    if (context.role !== 'PROJECT_ADMIN' && context.role !== 'DISPATCHER') {
      throw new Error('غير مصرح لك بتسجيل ناقل جديد');
    }

    const newCarrier = {
      ...carrierToValidate,
      createdBy: context.userId,
      updatedBy: context.userId,
    };

    await carrierRepository.create(newCarrier);

    await auditLogService.recordLog({
      projectId: payload.projectId,
      entityType: 'CARRIER',
      entityId: payload.carrierId,
      action: 'CREATE',
      after: newCarrier,
    }, context);

    return newCarrier as CarrierEntity;
  }

  async updateCarrier(
    projectId: string,
    carrierId: string,
    updates: Partial<CarrierEntity>,
    context: AuthUserContext
  ): Promise<void> {
    const existing = await carrierRepository.findById(projectId, carrierId);
    if (!existing) {
      throw new Error('الناقل غير موجود');
    }

    const name = updates.name || updates.companyNameAr || existing.name || existing.companyNameAr || '';
    const normalizedName = updates.normalizedName || normalizeName(name);
    const status = updates.status || (updates.isActive !== undefined ? (updates.isActive ? 'ACTIVE' : 'INACTIVE') : existing.status);

    const merged: CarrierEntity = {
      ...existing,
      ...updates,
      name,
      normalizedName,
      companyNameAr: updates.companyNameAr || name,
      status,
      isActive: status === 'ACTIVE',
      carrierId,
      projectId,
    };

    const validation = CarrierValidator.validate(merged);
    if (!validation.isValid) {
      throw new Error(`خطأ في تحديث الناقل: ${validation.errors.map(e => e.messageAr).join(' | ')}`);
    }

    await carrierRepository.update(projectId, carrierId, merged, context.userId);

    await auditLogService.recordLog({
      projectId,
      entityType: 'CARRIER',
      entityId: carrierId,
      action: 'UPDATE',
      before: existing,
      after: merged,
    }, context);
  }

  subscribeByProject(projectId: string, onData: (carriers: CarrierEntity[]) => void) {
    return carrierRepository.subscribeByProject(projectId, onData);
  }
}

export const carrierService = new CarrierService();
