import { materialRepository } from '../repositories/material.repository';
import { MaterialValidator } from '../validators/material.validator';
import { MaterialEntity } from '../types/entities';
import { AuthUserContext } from '../types/common';
import { auditLogService } from './auditLog.service';
import { normalizeName, normalizeCode } from '../utils/normalization';

export class MaterialService {
  async getMaterials(projectId: string): Promise<MaterialEntity[]> {
    return materialRepository.listByProject(projectId);
  }

  async getMaterial(projectId: string, materialId: string): Promise<MaterialEntity | null> {
    return materialRepository.findById(projectId, materialId);
  }

  async createMaterial(
    payload: Omit<MaterialEntity, 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>,
    context: AuthUserContext
  ): Promise<MaterialEntity> {
    const name = payload.name || payload.nameAr || '';
    const normalizedName = payload.normalizedName || normalizeName(name);
    const code = normalizeCode(payload.code);
    const status = payload.status || (payload.isActive === false ? 'INACTIVE' : 'ACTIVE');

    const materialToValidate: typeof payload = {
      ...payload,
      name,
      normalizedName,
      nameAr: payload.nameAr || name,
      code,
      status,
      isActive: status === 'ACTIVE',
    };

    const validation = MaterialValidator.validate(materialToValidate);
    if (!validation.isValid) {
      throw new Error(`خطأ في بيانات المادة: ${validation.errors.map(e => e.messageAr).join(' | ')}`);
    }

    const newMaterial = {
      ...materialToValidate,
      createdBy: context.userId,
      updatedBy: context.userId,
    };

    await materialRepository.create(newMaterial);

    await auditLogService.recordLog({
      projectId: payload.projectId,
      entityType: 'MATERIAL' as any,
      entityId: payload.materialId,
      action: 'CREATE',
      after: newMaterial,
    }, context);

    return newMaterial as MaterialEntity;
  }

  async updateMaterial(
    projectId: string,
    materialId: string,
    updates: Partial<MaterialEntity>,
    context: AuthUserContext
  ): Promise<void> {
    const existing = await materialRepository.findById(projectId, materialId);
    if (!existing) {
      throw new Error('المادة غير موجودة');
    }

    const name = updates.name || updates.nameAr || existing.name || existing.nameAr || '';
    const normalizedName = updates.normalizedName || normalizeName(name);
    const code = updates.code ? normalizeCode(updates.code) : existing.code;
    const status = updates.status || (updates.isActive !== undefined ? (updates.isActive ? 'ACTIVE' : 'INACTIVE') : existing.status);

    const merged: MaterialEntity = {
      ...existing,
      ...updates,
      name,
      normalizedName,
      nameAr: updates.nameAr || name,
      code,
      status,
      isActive: status === 'ACTIVE',
      materialId,
      projectId,
    };

    const validation = MaterialValidator.validate(merged);
    if (!validation.isValid) {
      throw new Error(`خطأ في تحديث المادة: ${validation.errors.map(e => e.messageAr).join(' | ')}`);
    }

    await materialRepository.update(projectId, materialId, merged, context.userId);

    await auditLogService.recordLog({
      projectId,
      entityType: 'MATERIAL' as any,
      entityId: materialId,
      action: 'UPDATE',
      before: existing,
      after: merged,
    }, context);
  }

  subscribeByProject(projectId: string, onData: (materials: MaterialEntity[]) => void) {
    return materialRepository.subscribeByProject(projectId, onData);
  }
}

export const materialService = new MaterialService();
