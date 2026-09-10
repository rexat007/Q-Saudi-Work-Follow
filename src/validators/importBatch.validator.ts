import { ImportBatchEntity } from '../types/entities';
import { ValidationResult, ValidationError } from '../types/common';

export class ImportBatchValidator {
  static validate(batch: Partial<ImportBatchEntity>): ValidationResult {
    const errors: ValidationError[] = [];

    if (!batch.batchId || !batch.batchId.trim()) {
      errors.push({
        field: 'batchId',
        code: 'REQUIRED',
        messageAr: 'معرّف دفعة الاستيراد مطلوب',
        messageEn: 'Batch ID is required',
      });
    }

    if (!batch.projectId || !batch.projectId.trim()) {
      errors.push({
        field: 'projectId',
        code: 'REQUIRED',
        messageAr: 'معرّف المشروع مطلوب',
        messageEn: 'Project ID is required',
      });
    }

    if (!batch.batchType || !['FLEET_IMPORT', 'DRIVER_IMPORT', 'WEIGHBRIDGE_IMPORT', 'LEGACY_TRIPS'].includes(batch.batchType)) {
      errors.push({
        field: 'batchType',
        code: 'INVALID_TYPE',
        messageAr: 'نوع دفعة الاستيراد غير صحيح',
        messageEn: 'Invalid import batch type',
      });
    }

    if (typeof batch.totalRecords !== 'number' || batch.totalRecords < 0) {
      errors.push({
        field: 'totalRecords',
        code: 'INVALID_COUNT',
        messageAr: 'إجمالي السجلات يجب أن يكون رقمًا غير سالب',
        messageEn: 'Total records must be non-negative',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
