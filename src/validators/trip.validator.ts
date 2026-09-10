import { TripEntity, TripStatus } from '../types/entities';
import { ValidationResult, ValidationError } from '../types/common';

export const ALLOWED_TRIP_TRANSITIONS: Record<TripStatus, TripStatus[]> = {
  DRAFT: ['DISPATCHED', 'CANCELLED'],
  DISPATCHED: ['AT_ORIGIN', 'CANCELLED'],
  AT_ORIGIN: ['LOADING', 'CANCELLED'],
  LOADING: ['WEIGHED_ORIGIN', 'REJECTED'],
  WEIGHED_ORIGIN: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['AT_DESTINATION', 'REJECTED'],
  AT_DESTINATION: ['WEIGHED_DESTINATION', 'REJECTED'],
  WEIGHED_DESTINATION: ['OFFLOADED', 'REJECTED'],
  OFFLOADED: ['COMPLETED'],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
};

export class TripValidator {
  static validate(trip: Partial<TripEntity>): ValidationResult {
    const errors: ValidationError[] = [];

    if (!trip.tripId || !trip.tripId.trim()) {
      errors.push({
        field: 'tripId',
        code: 'REQUIRED',
        messageAr: 'معرّف الرحلة مطلوب',
        messageEn: 'Trip ID is required',
      });
    }

    if (!trip.projectId || !trip.projectId.trim()) {
      errors.push({
        field: 'projectId',
        code: 'REQUIRED',
        messageAr: 'معرّف المشروع للرحلة مطلوب',
        messageEn: 'Project ID is required',
      });
    }

    if (!trip.carrierId || !trip.truckId || !trip.driverId || !trip.materialId || !trip.pricingRuleId) {
      errors.push({
        field: 'entities',
        code: 'MISSING_ASSOCIATION',
        messageAr: 'الرحلة يجب أن ترتبط بناقل وشاحنة وسائق ومادة وقاعدة تسعير',
        messageEn: 'Trip must be associated with carrier, truck, driver, material, and pricing rule',
      });
    }

    if (!trip.status) {
      errors.push({
        field: 'status',
        code: 'REQUIRED',
        messageAr: 'حالة الرحلة مطلوبة',
        messageEn: 'Trip status is required',
      });
    }

    // Weight physics validation if origin weights are present
    if (trip.weights) {
      const { originTareKg, originGrossKg, originNetKg } = trip.weights;
      if (originTareKg !== undefined && originGrossKg !== undefined) {
        if (originGrossKg <= originTareKg) {
          errors.push({
            field: 'weights.originGrossKg',
            code: 'INVALID_GROSS_LESS_THAN_TARE',
            messageAr: 'الوزن الإجمالي للتحميل يجب أن يتجاوز الوزن الفارغ للشاحنة',
            messageEn: 'Origin gross weight must be strictly greater than origin tare weight',
          });
        }
        if (originNetKg !== undefined && Math.abs(originNetKg - (originGrossKg - originTareKg)) > 1) {
          errors.push({
            field: 'weights.originNetKg',
            code: 'NET_WEIGHT_MISMATCH',
            messageAr: 'الوزن الصافي المحسوب لا يطابق (الإجمالي - الفارغ)',
            messageEn: 'Calculated net weight does not match gross minus tare',
          });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static validateStatusTransition(currentStatus: TripStatus, newStatus: TripStatus): ValidationResult {
    const allowed = ALLOWED_TRIP_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      return {
        isValid: false,
        errors: [{
          field: 'status',
          code: 'INVALID_TRANSITION',
          messageAr: `لا يمكن نقل الرحلة من الحالة "${currentStatus}" إلى الحالة "${newStatus}" في مسار FSM النظامي`,
          messageEn: `Invalid FSM transition from ${currentStatus} to ${newStatus}`,
        }],
      };
    }
    return { isValid: true, errors: [] };
  }
}
