import { ProjectEntity } from '../types/entities';
import { ValidationResult, ValidationError } from '../types/common';

export class ProjectValidator {
  static validate(project: Partial<ProjectEntity>): ValidationResult {
    const errors: ValidationError[] = [];

    if (!project.projectId || !project.projectId.trim()) {
      errors.push({
        field: 'projectId',
        code: 'REQUIRED',
        messageAr: 'معرّف المشروع مطلوب ولا يمكن تركه فارغاً',
        messageEn: 'Project ID is required',
      });
    } else if (!/^[a-zA-Z0-9_-]+$/.test(project.projectId)) {
      errors.push({
        field: 'projectId',
        code: 'INVALID_FORMAT',
        messageAr: 'معرّف المشروع يجب أن يحتوي على أحرف وأرقام وشرطات فقط',
        messageEn: 'Project ID must match pattern ^[a-zA-Z0-9_-]+$',
      });
    }

    if (!project.nameAr || project.nameAr.trim().length < 3) {
      errors.push({
        field: 'nameAr',
        code: 'INVALID_LENGTH',
        messageAr: 'اسم المشروع بالعربية يجب ألا يقل عن 3 أحرف',
        messageEn: 'Arabic project name must be at least 3 characters',
      });
    }

    if (!project.status || !['ACTIVE', 'SUSPENDED', 'ARCHIVED'].includes(project.status)) {
      errors.push({
        field: 'status',
        code: 'INVALID_STATUS',
        messageAr: 'حالة المشروع غير صالحة',
        messageEn: 'Invalid project status',
      });
    }

    if (project.settings?.zatcaTaxNumber) {
      if (!/^[0-9]{15}$/.test(project.settings.zatcaTaxNumber)) {
        errors.push({
          field: 'settings.zatcaTaxNumber',
          code: 'INVALID_ZATCA_VAT',
          messageAr: 'الرقم الضريبي لهيئة الزكاة والضريبة والجمارك (ZATCA) يجب أن يتكون من 15 رقمًا',
          messageEn: 'ZATCA Tax number must be exactly 15 digits',
        });
      }
    }

    if (project.settings && typeof project.settings.vatRatePercent === 'number') {
      if (project.settings.vatRatePercent < 0 || project.settings.vatRatePercent > 100) {
        errors.push({
          field: 'settings.vatRatePercent',
          code: 'INVALID_VAT_RATE',
          messageAr: 'نسبة ضريبة القيمة المضافة غير صحيحة',
          messageEn: 'VAT rate percent must be between 0 and 100',
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
