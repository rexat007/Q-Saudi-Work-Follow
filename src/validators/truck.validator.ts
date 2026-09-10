import { TruckEntity } from '../types/entities';
import { ValidationResult, ValidationError } from '../types/common';

export class TruckValidator {
  static validate(truck: Partial<TruckEntity>): ValidationResult {
    const errors: ValidationError[] = [];

    if (!truck.truckId || !truck.truckId.trim()) {
      errors.push({
        field: 'truckId',
        code: 'REQUIRED',
        messageAr: 'معرّف الشاحنة مطلوب',
        messageEn: 'Truck ID is required',
      });
    }

    if (!truck.projectId || !truck.projectId.trim()) {
      errors.push({
        field: 'projectId',
        code: 'REQUIRED',
        messageAr: 'معرّف المشروع التابع له الشاحنة مطلوب',
        messageEn: 'Project ID is required',
      });
    }

    if (!truck.carrierId || !truck.carrierId.trim()) {
      errors.push({
        field: 'carrierId',
        code: 'REQUIRED',
        messageAr: 'معرّف الناقل التابع له الشاحنة مطلوب (العلاقة: Truck → Carrier)',
        messageEn: 'Carrier ID is required for truck',
      });
    }

    const plate = truck.plate || truck.plateNumberAr;
    if (!plate || plate.trim().length < 3) {
      errors.push({
        field: 'plate',
        code: 'INVALID_PLATE',
        messageAr: 'رقم لوحة الشاحنة مطلوب ومطابق للأنظمة السعودية',
        messageEn: 'Truck plate is required',
      });
    }

    if (truck.status && !['ACTIVE', 'INACTIVE'].includes(truck.status)) {
      errors.push({
        field: 'status',
        code: 'INVALID_STATUS',
        messageAr: 'حالة الشاحنة يجب أن تكون ACTIVE أو INACTIVE',
        messageEn: 'Truck status must be ACTIVE or INACTIVE',
      });
    }

    if (typeof truck.tareWeightKg !== 'number' || truck.tareWeightKg <= 0) {
      errors.push({
        field: 'tareWeightKg',
        code: 'INVALID_TARE',
        messageAr: 'الوزن الفارغ للشاحنة (Tare) يجب أن يكون أكبر من الصفر',
        messageEn: 'Tare weight must be greater than zero',
      });
    }

    if (typeof truck.maxGrossWeightKg !== 'number' || truck.maxGrossWeightKg <= (truck.tareWeightKg || 0)) {
      errors.push({
        field: 'maxGrossWeightKg',
        code: 'INVALID_GROSS',
        messageAr: 'الحد الأقصى للوزن الإجمالي (Gross) يجب أن يكون أكبر من الوزن الفارغ',
        messageEn: 'Max gross weight must exceed tare weight',
      });
    }

    // Saudi transport limits (Typically 45,000 kg standard legal axle limit unless heavy permits)
    if (truck.maxGrossWeightKg && truck.maxGrossWeightKg > 75000) {
      errors.push({
        field: 'maxGrossWeightKg',
        code: 'EXCEEDS_LEGAL_SAFETY_CEILING',
        messageAr: 'الوزن الإجمالي يتجاوز الحد الأقصى المطلق لسلامة الطرق في المملكة (75 طن)',
        messageEn: 'Gross weight exceeds maximum legal highway safety ceiling',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
