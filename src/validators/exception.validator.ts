import { TripExceptionEntity } from '../types/entities';
import { ValidationResult, ValidationError } from '../types/common';

export class ExceptionValidator {
  static validate(exception: Partial<TripExceptionEntity>): ValidationResult {
    const errors: ValidationError[] = [];

    if (!exception.exceptionId || !exception.exceptionId.trim()) {
      errors.push({
        field: 'exceptionId',
        code: 'REQUIRED',
        messageAr: 'معرّف الاستثناء مطلوب',
        messageEn: 'Exception ID is required',
      });
    }

    if (!exception.tripId || !exception.tripId.trim()) {
      errors.push({
        field: 'tripId',
        code: 'REQUIRED',
        messageAr: 'معرّف الرحلة مطلوب',
        messageEn: 'Trip ID is required',
      });
    }

    if (!exception.type || ![
      'OVERWEIGHT_VIOLATION', 'WEIGHT_DISCREPANCY', 'ROUTE_DEVIATION', 
      'EXCESSIVE_TRANSIT_TIME', 'DAMAGED_CARGO', 'VEHICLE_BREAKDOWN', 'OFF_HOURS_MOVEMENT'
    ].includes(exception.type)) {
      errors.push({
        field: 'type',
        code: 'INVALID_TYPE',
        messageAr: 'نوع الاستثناء التشغيلي غير معروف',
        messageEn: 'Invalid exception type',
      });
    }

    if (!exception.severity || !['LOW', 'MEDIUM', 'HIGH', 'BLOCKING'].includes(exception.severity)) {
      errors.push({
        field: 'severity',
        code: 'INVALID_SEVERITY',
        messageAr: 'مستوى خطورة الاستثناء غير محدد',
        messageEn: 'Invalid exception severity',
      });
    }

    if (!exception.status || !['OPEN', 'INVESTIGATING', 'WAIVED', 'RESOLVED'].includes(exception.status)) {
      errors.push({
        field: 'status',
        code: 'INVALID_STATUS',
        messageAr: 'حالة الاستثناء غير صالحة',
        messageEn: 'Invalid exception status',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
