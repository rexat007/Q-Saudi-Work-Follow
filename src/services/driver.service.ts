import { driverRepository } from '../repositories/driver.repository';
import { DriverValidator } from '../validators/driver.validator';
import { DriverEntity } from '../types/entities';
import { AuthUserContext } from '../types/common';
import { auditLogService } from './auditLog.service';
import { normalizeName, normalizePhone, normalizeIdNumber } from '../utils/normalization';

export class DriverService {
  async getDrivers(projectId: string): Promise<DriverEntity[]> {
    return driverRepository.listByProject(projectId);
  }

  async getDriver(projectId: string, driverId: string): Promise<DriverEntity | null> {
    return driverRepository.findById(projectId, driverId);
  }

  async registerDriver(
    payload: Omit<DriverEntity, 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>,
    context: AuthUserContext
  ): Promise<DriverEntity> {
    // Enforce relationship: Driver -> Carrier
    if (!payload.carrierId || !payload.carrierId.trim()) {
      throw new Error('يجب تحديد الناقل التابع له السائق (العلاقة: Driver → Carrier)');
    }

    const name = payload.name || payload.fullNameAr || '';
    const normalizedName = payload.normalizedName || normalizeName(name);
    const phone = normalizePhone(payload.phone);
    const idNumber = normalizeIdNumber(payload.idNumber || payload.nationalOrIqamaId);
    const status = payload.status || (payload.isActive === false ? 'INACTIVE' : 'ACTIVE');

    const driverToValidate: typeof payload = {
      ...payload,
      name,
      normalizedName,
      fullNameAr: payload.fullNameAr || name,
      phone,
      idNumber,
      nationalOrIqamaId: payload.nationalOrIqamaId || idNumber,
      status,
      isActive: status === 'ACTIVE',
    };

    const validation = DriverValidator.validate(driverToValidate);
    if (!validation.isValid) {
      throw new Error(`خطأ في بيانات السائق: ${validation.errors.map(e => e.messageAr).join(' | ')}`);
    }

    const newDriver = {
      ...driverToValidate,
      createdBy: context.userId,
      updatedBy: context.userId,
    };

    await driverRepository.create(newDriver);

    await auditLogService.recordLog({
      projectId: payload.projectId,
      entityType: 'DRIVER' as any,
      entityId: payload.driverId,
      action: 'CREATE',
      after: newDriver,
    }, context);

    return newDriver as DriverEntity;
  }

  async updateDriver(
    projectId: string,
    driverId: string,
    updates: Partial<DriverEntity>,
    context: AuthUserContext
  ): Promise<void> {
    const existing = await driverRepository.findById(projectId, driverId);
    if (!existing) {
      throw new Error('السائق غير موجود');
    }

    const name = updates.name || updates.fullNameAr || existing.name || existing.fullNameAr || '';
    const normalizedName = updates.normalizedName || normalizeName(name);
    const phone = updates.phone ? normalizePhone(updates.phone) : existing.phone;
    const idNumber = updates.idNumber || updates.nationalOrIqamaId || existing.idNumber || existing.nationalOrIqamaId || '';
    const status = updates.status || (updates.isActive !== undefined ? (updates.isActive ? 'ACTIVE' : 'INACTIVE') : existing.status);

    const merged: DriverEntity = {
      ...existing,
      ...updates,
      name,
      normalizedName,
      fullNameAr: updates.fullNameAr || name,
      phone,
      idNumber: normalizeIdNumber(idNumber),
      nationalOrIqamaId: normalizeIdNumber(idNumber),
      status,
      isActive: status === 'ACTIVE',
      driverId,
      projectId,
    };

    const validation = DriverValidator.validate(merged);
    if (!validation.isValid) {
      throw new Error(`خطأ في تحديث السائق: ${validation.errors.map(e => e.messageAr).join(' | ')}`);
    }

    await driverRepository.update(projectId, driverId, merged, context.userId);

    await auditLogService.recordLog({
      projectId,
      entityType: 'DRIVER' as any,
      entityId: driverId,
      action: 'UPDATE',
      before: existing,
      after: merged,
    }, context);
  }

  subscribeByProject(projectId: string, onData: (drivers: DriverEntity[]) => void) {
    return driverRepository.subscribeByProject(projectId, onData);
  }
}

export const driverService = new DriverService();
