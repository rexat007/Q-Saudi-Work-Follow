import { MaterialEntity } from '../types/entities';
import { ValidationResult, ValidationError } from '../types/common';

export class MaterialValidator {
  static validate(material: Partial<MaterialEntity>): ValidationResult {
    const errors: ValidationError[] = [];

    if (!material.materialId || !material.materialId.trim()) {
      errors.push({
        field: 'materialId',
        code: 'REQUIRED',
        messageAr: 'معرّف المادة مطلوب',
        messageEn: 'Material ID is required',
      });
    }

    if (!material.projectId || !material.projectId.trim()) {
      errors.push({
        field: 'projectId',
        code: 'REQUIRED',
        messageAr: 'معرّف المشروع مطلوب',
        messageEn: 'Project ID is required',
      });
    }

    if (!material.code || material.code.trim().length < 2) {
      errors.push({
        field: 'code',
        code: 'INVALID_CODE',
        messageAr: 'رمز المادة مطلوب ويجب أن يتكون من حرفين على الأقل',
        messageEn: 'Material code must be at least 2 characters',
      });
    }

    const name = material.name || material.nameAr;
    if (!name || name.trim().length < 2) {
      errors.push({
        field: 'name',
        code: 'INVALID_NAME',
        messageAr: 'اسم المادة مطلوب ويجب ألا يقل عن حرفين',
        messageEn: 'Material name must be at least 2 characters',
      });
    }

    if (material.status && !['ACTIVE', 'INACTIVE'].includes(material.status)) {
      errors.push({
        field: 'status',
        code: 'INVALID_STATUS',
        messageAr: 'حالة المادة يجب أن تكون ACTIVE أو INACTIVE',
        messageEn: 'Material status must be ACTIVE or INACTIVE',
      });
    }

    if (material.unitOfMeasure && !['TON', 'M3', 'TRIP'].includes(material.unitOfMeasure)) {
      errors.push({
        field: 'unitOfMeasure',
        code: 'INVALID_UOM',
        messageAr: 'وحدة القياس يجب أن تكون بالطن أو المتر المكعب أو الرد',
        messageEn: 'Unit of measure must be TON, M3, or TRIP',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
