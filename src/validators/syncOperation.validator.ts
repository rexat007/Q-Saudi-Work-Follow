import { SyncOperationEntity } from '../types/entities';
import { ValidationResult, ValidationError } from '../types/common';

export class SyncOperationValidator {
  static validate(op: Partial<SyncOperationEntity>): ValidationResult {
    const errors: ValidationError[] = [];

    if (!op.operationId || !op.operationId.trim()) {
      errors.push({
        field: 'operationId',
        code: 'REQUIRED',
        messageAr: 'معرّف العملية (Idempotency Key) مطلوب',
        messageEn: 'Operation ID is required',
      });
    }

    if (!op.clientOperationUUID || !op.clientOperationUUID.trim()) {
      errors.push({
        field: 'clientOperationUUID',
        code: 'REQUIRED',
        messageAr: 'معرّف العملية العميل UUID مطلوب',
        messageEn: 'Client Operation UUID is required',
      });
    }

    if (!op.status || !['PROCESSED', 'FAILED', 'REJECTED'].includes(op.status)) {
      errors.push({
        field: 'status',
        code: 'INVALID_STATUS',
        messageAr: 'حالة العملية غير صالحة',
        messageEn: 'Invalid sync operation status',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
