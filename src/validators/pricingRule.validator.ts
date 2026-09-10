import { PricingRuleEntity } from '../types/entities';
import { ValidationResult, ValidationError } from '../types/common';

export class PricingRuleValidator {
  static validate(rule: Partial<PricingRuleEntity>): ValidationResult {
    const errors: ValidationError[] = [];

    if (!rule.pricingRuleId || !rule.pricingRuleId.trim()) {
      errors.push({
        field: 'pricingRuleId',
        code: 'REQUIRED',
        messageAr: 'معرّف قاعدة التسعير مطلوب',
        messageEn: 'Pricing Rule ID is required',
      });
    }

    if (!rule.projectId || !rule.projectId.trim()) {
      errors.push({
        field: 'projectId',
        code: 'REQUIRED',
        messageAr: 'معرّف المشروع مطلوب',
        messageEn: 'Project ID is required',
      });
    }

    if (!rule.pricingModel || !['PER_TON', 'PER_TRIP', 'PER_KM', 'FLAT_RATE'].includes(rule.pricingModel)) {
      errors.push({
        field: 'pricingModel',
        code: 'INVALID_MODEL',
        messageAr: 'نموذج التسعير غير معتمد في المنظومة',
        messageEn: 'Invalid pricing model',
      });
    }

    if (typeof rule.baseRateSAR !== 'number' || rule.baseRateSAR < 0) {
      errors.push({
        field: 'baseRateSAR',
        code: 'INVALID_RATE',
        messageAr: 'السعر الأساسي بالريال يجب أن يكون رقمًا غير سالب',
        messageEn: 'Base rate in SAR must be a non-negative number',
      });
    }

    if (typeof rule.demurrageRatePerHourSAR === 'number' && rule.demurrageRatePerHourSAR < 0) {
      errors.push({
        field: 'demurrageRatePerHourSAR',
        code: 'INVALID_DEMURRAGE',
        messageAr: 'سعر غرامة التأخير يجب أن يكون قيمة موجبة أو صفر',
        messageEn: 'Demurrage rate must be non-negative',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
