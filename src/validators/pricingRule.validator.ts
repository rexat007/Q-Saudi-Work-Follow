import { PricingRuleEntity } from '../types/entities';
import { PricingRule } from '../types/pricing';
import { ValidationResult, ValidationError } from '../types/common';

export class PricingRuleValidator {
  static validate(rule: Partial<PricingRuleEntity | PricingRule>): ValidationResult {
    const errors: ValidationError[] = [];

    // 1. pricingRuleId
    if (!rule.pricingRuleId || !rule.pricingRuleId.trim()) {
      errors.push({
        field: 'pricingRuleId',
        code: 'REQUIRED',
        messageAr: 'معرّف قاعدة التسعير مطلوب',
        messageEn: 'Pricing Rule ID is required',
      });
    }

    // 2. projectId
    if (!rule.projectId || !rule.projectId.trim()) {
      errors.push({
        field: 'projectId',
        code: 'REQUIRED',
        messageAr: 'معرّف المشروع مطلوب',
        messageEn: 'Project ID is required',
      });
    }

    // 3. carrierId (BLOCK 36: Carrier-specific agreement required)
    const carrier = (rule as any).carrierId;
    if (!carrier || !carrier.trim() || carrier === 'ALL' || carrier === '*') {
      errors.push({
        field: 'carrierId',
        code: 'REQUIRED_CARRIER',
        messageAr: 'يجب تحديد الناقل المتعاقد معه صراحة ولا يسمح باتفاقية مجهولة الناقل',
        messageEn: 'Specific carrier is required for contractual pricing',
      });
    }

    // 4. pricingType / pricingModel
    const pType = (rule as any).pricingType || (rule as any).pricingModel;
    if (!pType || !['PER_TON', 'PER_TRIP', 'PER_KM', 'FLAT_RATE'].includes(pType)) {
      errors.push({
        field: 'pricingType',
        code: 'INVALID_MODEL',
        messageAr: 'نموذج التسعير غير معتمد في المنظومة (يجب أن يكون PER_TON أو PER_TRIP)',
        messageEn: 'Invalid pricing model (must be PER_TON or PER_TRIP)',
      });
    }

    // 5. rate: strictly positive (> 0), no negative or zero rates
    const rateVal = (rule as any).rate !== undefined ? (rule as any).rate : (rule as any).baseRateSAR;
    if (typeof rateVal !== 'number' || isNaN(rateVal) || rateVal <= 0) {
      errors.push({
        field: 'rate',
        code: 'INVALID_RATE',
        messageAr: 'سعر التعرفة يجب أن يكون رقمًا موجبًا أكبر من الصفر',
        messageEn: 'Tariff rate must be a strictly positive number (> 0)',
      });
    }

    // 6. currency: valid non-empty string
    const currency = (rule as any).currency || 'SAR';
    if (!currency || !currency.trim() || currency.trim().length < 2) {
      errors.push({
        field: 'currency',
        code: 'INVALID_CURRENCY',
        messageAr: 'رمز العملة غير صالح أو مفقود',
        messageEn: 'Invalid or missing currency',
      });
    }

    // 7. effectiveFrom and effectiveTo
    const effectiveFrom = (rule as any).effectiveFrom;
    const effectiveTo = (rule as any).effectiveTo;

    if (!effectiveFrom || !effectiveFrom.trim()) {
      errors.push({
        field: 'effectiveFrom',
        code: 'REQUIRED_EFFECTIVE_FROM',
        messageAr: 'تاريخ بدء سريان التسعيرة مطلوب',
        messageEn: 'Effective from date is required',
      });
    } else if (isNaN(new Date(effectiveFrom).getTime())) {
      errors.push({
        field: 'effectiveFrom',
        code: 'INVALID_DATE',
        messageAr: 'تاريخ بدء السريان غير صالح',
        messageEn: 'Invalid effective from date',
      });
    }

    if (effectiveTo && effectiveTo.trim()) {
      if (isNaN(new Date(effectiveTo).getTime())) {
        errors.push({
          field: 'effectiveTo',
          code: 'INVALID_DATE',
          messageAr: 'تاريخ نهاية السريان غير صالح',
          messageEn: 'Invalid effective to date',
        });
      } else if (effectiveFrom && new Date(effectiveFrom).getTime() > new Date(effectiveTo).getTime()) {
        errors.push({
          field: 'effectiveTo',
          code: 'INVALID_DATE_RANGE',
          messageAr: 'تاريخ نهاية السريان يجب أن يكون لاحقًا لتاريخ البداية أو مساويًا له',
          messageEn: 'Effective to date must be greater than or equal to effective from date',
        });
      }
    }

    if (typeof (rule as any).demurrageRatePerHourSAR === 'number' && (rule as any).demurrageRatePerHourSAR < 0) {
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

  /**
   * Validates whether a candidate rule collides with existing rules
   * for the same project + carrier + material across overlapping active date windows.
   */
  static checkOverlap(candidate: Partial<PricingRule>, existingRules: PricingRule[]): {
    hasOverlap: boolean;
    conflictingRules: PricingRule[];
    reasonAr?: string;
  } {
    if (!candidate.carrierId || !candidate.effectiveFrom || !candidate.projectId) {
      return { hasOverlap: false, conflictingRules: [] };
    }

    const candFrom = candidate.effectiveFrom.slice(0, 10);
    const candTo = candidate.effectiveTo ? candidate.effectiveTo.slice(0, 10) : '9999-12-31';
    const candMat = candidate.materialId || null;

    const conflicts = existingRules.filter((r) => {
      // Ignore self
      if (candidate.pricingRuleId && r.pricingRuleId === candidate.pricingRuleId) return false;
      // Must be same project
      if (r.projectId !== candidate.projectId) return false;
      // Must be same carrier
      if (r.carrierId !== candidate.carrierId) return false;
      // Must be active
      if (r.status !== 'ACTIVE' && (r as any).isActive === false) return false;
      // Must be same material specificity
      const rMat = r.materialId || null;
      if (candMat !== rMat) return false;

      const rFrom = r.effectiveFrom.slice(0, 10);
      const rTo = r.effectiveTo ? r.effectiveTo.slice(0, 10) : '9999-12-31';

      // Date intersection test: candFrom <= rTo && candTo >= rFrom
      return candFrom <= rTo && candTo >= rFrom;
    });

    if (conflicts.length > 0) {
      return {
        hasOverlap: true,
        conflictingRules: conflicts,
        reasonAr: `يوجد تداخل زمني مع قاعدة تسعير سارية لنفس الناقل والمادة (${conflicts.map(c => c.pricingRuleId).join(', ')}) للفترة [${conflicts[0].effectiveFrom} - ${conflicts[0].effectiveTo || 'مفتوح'}]`,
      };
    }

    return { hasOverlap: false, conflictingRules: [] };
  }

  /**
   * Convenience alias for UI and external components
   */
  static detectOverlap(existingRules: any[], candidate: any): {
    hasOverlap: boolean;
    conflictingRules: PricingRule[];
    messageAr?: string;
  } {
    const res = this.checkOverlap(candidate, existingRules as any[]);
    return {
      hasOverlap: res.hasOverlap,
      conflictingRules: res.conflictingRules,
      messageAr: res.reasonAr,
    };
  }

  /**
   * Strictly enforces project isolation: carrier and material must belong to same project
   */
  static validateProjectIsolation(
    projectId: string,
    carrierProjectId?: string,
    materialProjectId?: string
  ): { isIsolated: boolean; violation?: string } {
    if (carrierProjectId && carrierProjectId !== projectId) {
      return {
        isIsolated: false,
        violation: `محاولة اختراق عزل المشاريع: الناقل ينتمي للمشروع (${carrierProjectId}) وليس المشروع الحالي (${projectId})`,
      };
    }
    if (materialProjectId && materialProjectId !== projectId) {
      return {
        isIsolated: false,
        violation: `محاولة اختراق عزل المشاريع: المادة تنتمي للمشروع (${materialProjectId}) وليس المشروع الحالي (${projectId})`,
      };
    }
    return { isIsolated: true };
  }
}

