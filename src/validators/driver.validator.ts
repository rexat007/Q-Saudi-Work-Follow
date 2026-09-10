import { DriverEntity } from '../types/entities';
import { ValidationResult, ValidationError } from '../types/common';

export class DriverValidator {
  static validate(driver: Partial<DriverEntity>): ValidationResult {
    const errors: ValidationError[] = [];

    if (!driver.driverId || !driver.driverId.trim()) {
      errors.push({
        field: 'driverId',
        code: 'REQUIRED',
        messageAr: 'معرّف السائق مطلوب',
        messageEn: 'Driver ID is required',
      });
    }

    if (!driver.projectId || !driver.projectId.trim()) {
      errors.push({
        field: 'projectId',
        code: 'REQUIRED',
        messageAr: 'معرّف المشروع مطلوب',
        messageEn: 'Project ID is required',
      });
    }

    if (!driver.carrierId || !driver.carrierId.trim()) {
      errors.push({
        field: 'carrierId',
        code: 'REQUIRED',
        messageAr: 'معرّف الناقل التابع له السائق مطلوب (العلاقة: Driver → Carrier)',
        messageEn: 'Carrier ID is required for driver',
      });
    }

    const name = driver.name || driver.fullNameAr;
    if (!name || name.trim().length < 3) {
      errors.push({
        field: 'name',
        code: 'INVALID_NAME',
        messageAr: 'اسم السائق مطلوب ويجب ألا يقل عن 3 أحرف',
        messageEn: 'Driver name is required and must be at least 3 characters',
      });
    }

    const idNumber = driver.idNumber || driver.nationalOrIqamaId;
    if (!idNumber || !/^[1-2][0-9]{9}$/.test(idNumber)) {
      errors.push({
        field: 'idNumber',
        code: 'INVALID_SAUDI_ID',
        messageAr: 'رقم الهوية الوطنية أو الإقامة يجب أن يتكون من 10 أرقام ويبدأ بـ 1 أو 2',
        messageEn: 'National ID or Iqama must start with 1 or 2 and be exactly 10 digits',
      });
    }

    if (!driver.phone || !/^(05|\+9665)[0-9]{8}$/.test(driver.phone.replace(/[\s-]/g, ''))) {
      errors.push({
        field: 'phone',
        code: 'INVALID_SAUDI_MOBILE',
        messageAr: 'رقم جوال السائق يجب أن يكون رقم جوال سعودي صحيح (05xxxxxxxx أو +9665xxxxxxxx)',
        messageEn: 'Driver phone must be a valid Saudi mobile number',
      });
    }

    if (driver.status && !['ACTIVE', 'INACTIVE'].includes(driver.status)) {
      errors.push({
        field: 'status',
        code: 'INVALID_STATUS',
        messageAr: 'حالة السائق يجب أن تكون ACTIVE أو INACTIVE',
        messageEn: 'Driver status must be ACTIVE or INACTIVE',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
