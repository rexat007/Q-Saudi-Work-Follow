import { AuditLogEntity } from '../types/entities';
import { ValidationResult, ValidationError } from '../types/common';

export class AuditLogValidator {
  static validate(log: Partial<AuditLogEntity>): ValidationResult {
    const errors: ValidationError[] = [];

    if (!log.auditLogId || !log.auditLogId.trim()) {
      errors.push({
        field: 'auditLogId',
        code: 'REQUIRED',
        messageAr: 'معرّف سجل التدقيق مطلوب',
        messageEn: 'Audit Log ID is required',
      });
    }

    if (!log.entityType || !log.entityId) {
      errors.push({
        field: 'entity',
        code: 'REQUIRED',
        messageAr: 'نوع الكيان ومعرّفه مطلوبان لسجل التدقيق',
        messageEn: 'Entity type and entity ID are required',
      });
    }

    if (!log.action) {
      errors.push({
        field: 'action',
        code: 'REQUIRED',
        messageAr: 'الإجراء المنفذ مطلوب لسجل التدقيق',
        messageEn: 'Audit action is required',
      });
    }

    if (!log.actor?.userId) {
      errors.push({
        field: 'actor.userId',
        code: 'REQUIRED',
        messageAr: 'معلومات الفاعل مطلوبة لتوثيق المسؤولية القانونية',
        messageEn: 'Actor information is required for audit liability',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
