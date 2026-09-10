import { CarrierEntity } from '../types/entities';
import { ValidationResult, ValidationError } from '../types/common';

export class CarrierValidator {
  static validate(carrier: Partial<CarrierEntity>): ValidationResult {
    const errors: ValidationError[] = [];

    if (!carrier.carrierId || !carrier.carrierId.trim()) {
      errors.push({
        field: 'carrierId',
        code: 'REQUIRED',
        messageAr: 'معرّف الناقل مطلوب',
        messageEn: 'Carrier ID is required',
      });
    }

    if (!carrier.projectId || !carrier.projectId.trim()) {
      errors.push({
        field: 'projectId',
        code: 'REQUIRED',
        messageAr: 'معرّف المشروع التابع له الناقل مطلوب',
        messageEn: 'Project ID is required',
      });
    }

    const name = carrier.name || carrier.companyNameAr;
    if (!name || name.trim().length < 3) {
      errors.push({
        field: 'name',
        code: 'INVALID_LENGTH',
        messageAr: 'اسم الناقل يجب أن يتكون من 3 أحرف على الأقل',
        messageEn: 'Carrier name must be at least 3 characters',
      });
    }

    if (carrier.status && !['ACTIVE', 'INACTIVE'].includes(carrier.status)) {
      errors.push({
        field: 'status',
        code: 'INVALID_STATUS',
        messageAr: 'حالة الناقل يجب أن تكون ACTIVE أو INACTIVE',
        messageEn: 'Carrier status must be ACTIVE or INACTIVE',
      });
    }

    if (carrier.commercialRegistrationNo && !/^[0-9]{10}$/.test(carrier.commercialRegistrationNo)) {
      errors.push({
        field: 'commercialRegistrationNo',
        code: 'INVALID_CR_NUMBER',
        messageAr: 'رقم السجل التجاري للناقل يجب أن يكون 10 أرقام نظامية سعودية',
        messageEn: 'Commercial Registration (CR) must be exactly 10 digits',
      });
    }

    if (carrier.contactPerson?.phone && !/^\+?[0-9]{9,15}$/.test(carrier.contactPerson.phone.replace(/[\s-]/g, ''))) {
      errors.push({
        field: 'contactPerson.phone',
        code: 'INVALID_PHONE',
        messageAr: 'رقم هاتف مسؤول التواصل غير صحيح',
        messageEn: 'Invalid contact person phone number',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
