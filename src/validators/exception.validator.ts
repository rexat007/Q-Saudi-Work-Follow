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

    // tripId is nullable for system-wide or non-trip exceptions
    if (exception.tripId !== undefined && exception.tripId !== null && !exception.tripId.trim()) {
      errors.push({
        field: 'tripId',
        code: 'INVALID_TRIP_ID',
        messageAr: 'معرّف الرحلة غير صالح',
        messageEn: 'Trip ID is invalid',
      });
    }

    const validTypes = [
      'WEIGHT_VARIANCE',
      'TRUCK_CARRIER_CONFLICT',
      'DRIVER_CARRIER_CONFLICT',
      'MATERIAL_NOT_ALLOWED',
      'CARRIER_NOT_ALLOWED',
      'AMBIGUOUS_TRIP',
      'DUPLICATE_TRIP',
      'INVALID_WEIGHT',
      'MISSING_PRICING',
      'PRICING_CONFLICT',
      'SYNC_FAILURE',
      'VERSION_CONFLICT',
      'OVERWEIGHT_VIOLATION',
      'WEIGHT_DISCREPANCY',
      'ROUTE_DEVIATION', 
      'EXCESSIVE_TRANSIT_TIME',
      'DAMAGED_CARGO',
      'VEHICLE_BREAKDOWN',
      'OFF_HOURS_MOVEMENT'
    ];

    if (!exception.type || !validTypes.includes(exception.type)) {
      errors.push({
        field: 'type',
        code: 'INVALID_TYPE',
        messageAr: 'نوع الاستثناء التشغيلي غير معروف',
        messageEn: 'Invalid exception type',
      });
    }

    if (!exception.severity || !['LOW', 'MEDIUM', 'HIGH', 'BLOCKING', 'CRITICAL'].includes(exception.severity)) {
      errors.push({
        field: 'severity',
        code: 'INVALID_SEVERITY',
        messageAr: 'مستوى خطورة الاستثناء غير محدد',
        messageEn: 'Invalid exception severity',
      });
    }

    if (!exception.status || !['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED', 'INVESTIGATING', 'WAIVED'].includes(exception.status)) {
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
