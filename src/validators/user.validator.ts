import { UserEntity } from '../types/entities';
import { ValidationResult, ValidationError } from '../types/common';

export class UserValidator {
  static validate(user: Partial<UserEntity>): ValidationResult {
    const errors: ValidationError[] = [];

    if (!user.userId || !user.userId.trim()) {
      errors.push({
        field: 'userId',
        code: 'REQUIRED',
        messageAr: 'معرّف المستخدم مطلوب',
        messageEn: 'User ID is required',
      });
    }

    if (!user.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
      errors.push({
        field: 'email',
        code: 'INVALID_EMAIL',
        messageAr: 'البريد الإلكتروني غير صالح',
        messageEn: 'Invalid email address',
      });
    }

    if (!user.role || !['PROJECT_ADMIN', 'DISPATCHER', 'FINANCE_AUDITOR', 'DRIVER', 'VIEWER'].includes(user.role)) {
      errors.push({
        field: 'role',
        code: 'INVALID_ROLE',
        messageAr: 'الدور الوظيفي للمستخدم غير صالح',
        messageEn: 'Invalid user role',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
