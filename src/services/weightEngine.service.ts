/**
 * Standalone Weight Engine Service
 *
 * Core Responsibilities & Functional Specifications:
 * 1. calculateNetWeight(tare, gross)
 * 2. calculateVariance(loadedNet, receivedNet)
 * 3. evaluateTolerance(variance, tolerance, loadedNet)
 * 4. calculateSettlement(pricingRule, netWeight)
 *
 * Strict Business & Mathematical Validation:
 * - tare > 0
 * - gross > tare
 * - net > 0
 * - received > 0
 * - NEVER use zero (0) as substitute for missing data!
 * - Missing values MUST BE null.
 *
 * Tolerance Rule Specification:
 * - projectId
 * - materialId
 * - absoluteTolerance (number | null)
 * - percentageTolerance (number | null)
 * - status (ACTIVE | INACTIVE | ARCHIVED)
 * - Supported Modes: absolute, percentage, or both
 * - Outputs: NORMAL | WARNING | EXCEPTION
 */

import {
  ToleranceRule,
  ToleranceRuleStatus,
  ToleranceEvaluationOutput,
  NetWeightResult,
  VarianceResult,
  ToleranceEvaluationResult,
  WeightSettlementResult
} from '../types/weightEngine';
import { MasterPricingRule } from '../data/masterPricingRules';

export class StandaloneWeightEngine {
  // Stored tolerance rules registry
  private toleranceRules: Map<string, ToleranceRule> = new Map();

  constructor() {
    this.seedDefaultRules();
  }

  /**
   * Seeds production-grade baseline tolerance rules for projects and materials.
   */
  private seedDefaultRules(): void {
    const defaultRules: ToleranceRule[] = [
      {
        ruleId: 'TOL-NEOM-AGG-BOTH',
        projectId: 'PRJ-NEOM-001',
        materialId: 'MAT-AGG-01',
        nameAr: 'تفاوت ركام بازلتي نيوم (مطلق ونسبة معاً)',
        absoluteTolerance: 500, // 500 KG
        percentageTolerance: 1.5, // 1.5%
        status: 'ACTIVE',
        warningRatio: 0.75
      },
      {
        ruleId: 'TOL-NEOM-BASE-ABS',
        projectId: 'PRJ-NEOM-001',
        materialId: 'MAT-SUB-02',
        nameAr: 'تفاوت ردميات صب بيس (تفاوت مطلق 400 كجم)',
        absoluteTolerance: 400, // 400 KG
        percentageTolerance: null,
        status: 'ACTIVE',
        warningRatio: 0.80
      },
      {
        ruleId: 'TOL-REDSEA-SAND-PCT',
        projectId: 'PRJ-REDSEA-002',
        materialId: 'MAT-SND-03',
        nameAr: 'تفاوت رمال البحر الأحمر (تفاوت نسبة 2% رطوبة)',
        absoluteTolerance: null,
        percentageTolerance: 2.0, // 2.0%
        status: 'ACTIVE',
        warningRatio: 0.75
      },
      {
        ruleId: 'TOL-QIDDIYA-CEMENT-BOTH',
        projectId: 'PRJ-QIDDIYA-003',
        materialId: 'MAT-CEM-04',
        nameAr: 'تفاوت إسمنت سائب القدية (مطلق 300 كجم ونسبة 1%)',
        absoluteTolerance: 300,
        percentageTolerance: 1.0,
        status: 'ACTIVE',
        warningRatio: 0.70
      }
    ];

    for (const r of defaultRules) {
      this.saveToleranceRule(r);
    }
  }

  /**
   * Generate rule composite key
   */
  private getRuleKey(projectId: string, materialId: string): string {
    return `${projectId}:::${materialId}`;
  }

  // =========================================================================
  // 1. calculateNetWeight(tare, gross)
  // =========================================================================
  /**
   * Calculates net weight: gross - tare.
   *
   * Strict Validation Rules:
   * - tare > 0
   * - gross > tare
   * - net > 0
   * - Missing values MUST BE null, NEVER 0!
   */
  public calculateNetWeight(
    tare: number | null | undefined,
    gross: number | null | undefined
  ): NetWeightResult {
    const errors: string[] = [];

    // Check missing values
    if (tare === null || tare === undefined) {
      errors.push('قيمة وزن الفارغ (tare) مفقودة أو غير محددة (يجب أن تكون null وليس 0).');
    }

    if (gross === null || gross === undefined) {
      errors.push('قيمة وزن القائم (gross) مفقودة أو غير محددة (يجب أن تكون null وليس 0).');
    }

    // Stop early if any required input is null or undefined
    if (tare === null || tare === undefined || gross === null || gross === undefined) {
      return {
        netWeight: null, // NEVER 0 on missing data!
        isValid: false,
        validationErrors: errors,
        tare: tare ?? null,
        gross: gross ?? null
      };
    }

    // Rule: tare > 0
    if (tare <= 0) {
      errors.push(`وزن الفارغ غير صالح (${tare} كجم). يجب أن يكون وزن الفارغ أكبر من صفر قطعي (tare > 0).`);
    }

    // Rule: gross > tare
    if (gross <= tare) {
      errors.push(`وزن القائم (${gross} كجم) يجب أن يكون أكبر قطعي من وزن الفارغ (${tare} كجم) (gross > tare).`);
    }

    if (errors.length > 0) {
      return {
        netWeight: null, // NEVER 0 on validation failure!
        isValid: false,
        validationErrors: errors,
        tare,
        gross
      };
    }

    const net = Math.round((gross - tare) * 1000) / 1000;

    // Rule: net > 0
    if (net <= 0) {
      errors.push(`الوزن الصافي المحسوب (${net} كجم) يجب أن يكون أكبر من صفر (net > 0).`);
      return {
        netWeight: null,
        isValid: false,
        validationErrors: errors,
        tare,
        gross
      };
    }

    return {
      netWeight: net,
      isValid: true,
      validationErrors: [],
      tare,
      gross
    };
  }

  // =========================================================================
  // 2. calculateVariance(loadedNet, receivedNet)
  // =========================================================================
  /**
   * Calculates weight variance between destination and origin: receivedNet - loadedNet.
   *
   * Strict Validation Rules:
   * - net > 0 (loadedNet > 0)
   * - received > 0 (receivedNet > 0)
   * - Missing values MUST BE null, NEVER 0!
   */
  public calculateVariance(
    loadedNet: number | null | undefined,
    receivedNet: number | null | undefined
  ): VarianceResult {
    const errors: string[] = [];

    // Check missing values
    if (loadedNet === null || loadedNet === undefined) {
      errors.push('وزن الصافي المحمّل بالمصدر (loadedNet) مفقود (يجب أن يكون null وليس 0).');
    }

    if (receivedNet === null || receivedNet === undefined) {
      errors.push('وزن الصافي المستلم بالموقع (receivedNet) مفقود (يجب أن يكون null وليس 0).');
    }

    if (loadedNet === null || loadedNet === undefined || receivedNet === null || receivedNet === undefined) {
      return {
        variance: null, // NEVER 0 on missing data!
        variancePercentage: null,
        isValid: false,
        validationErrors: errors,
        loadedNet: loadedNet ?? null,
        receivedNet: receivedNet ?? null
      };
    }

    // Rule: net > 0
    if (loadedNet <= 0) {
      errors.push(`وزن المصدر غير صالح (${loadedNet} كجم). يجب أن يكون صافي التحميل أكبر من صفر (net > 0).`);
    }

    // Rule: received > 0
    if (receivedNet <= 0) {
      errors.push(`وزن الاستلام غير صالح (${receivedNet} كجم). يجب أن يكون صافي الاستلام أكبر من صفر (received > 0).`);
    }

    if (errors.length > 0) {
      return {
        variance: null,
        variancePercentage: null,
        isValid: false,
        validationErrors: errors,
        loadedNet,
        receivedNet
      };
    }

    const variance = Math.round((receivedNet - loadedNet) * 1000) / 1000;
    const variancePercentage = Math.round(((variance / loadedNet) * 100) * 1000) / 1000;

    return {
      variance,
      variancePercentage,
      isValid: true,
      validationErrors: [],
      loadedNet,
      receivedNet
    };
  }

  // =========================================================================
  // 3. evaluateTolerance(variance, tolerance, loadedNet)
  // =========================================================================
  /**
   * Evaluates weight variance against a ToleranceRule.
   *
   * Rule can be:
   * - absolute only
   * - percentage only
   * - or both
   *
   * Outputs:
   * - NORMAL: variance is within acceptable tolerance boundaries
   * - WARNING: variance approaches the threshold limit (e.g. >= 75% of limit)
   * - EXCEPTION: variance strictly exceeds the allowed tolerance threshold
   */
  public evaluateTolerance(
    variance: number | null | undefined,
    tolerance: ToleranceRule | null | undefined,
    loadedNet?: number | null | undefined
  ): ToleranceEvaluationResult {
    const errors: string[] = [];

    if (variance === null || variance === undefined) {
      errors.push('قيمة الفارق الوزني (variance) مفقودة أو null.');
    }

    if (!tolerance) {
      errors.push('قاعدة التفاوت (ToleranceRule) مفقودة أو غير محددة.');
    } else if (tolerance.status !== 'ACTIVE') {
      errors.push(`قاعدة التفاوت غير مفعلة (الحالة: ${tolerance.status}).`);
    }

    if (errors.length > 0 || !tolerance || variance === null || variance === undefined) {
      return {
        status: 'EXCEPTION',
        isValid: false,
        validationErrors: errors,
        variance: variance ?? null,
        absVariance: null,
        variancePercentage: null,
        rule: tolerance ?? null,
        toleranceTypeApplied: 'NONE',
        limitKg: null,
        limitPercentage: null,
        warningLimitKg: null,
        isException: true,
        isWarning: false,
        isNormal: false,
        messageAr: errors.join(' | ')
      };
    }

    const absVariance = Math.abs(variance);
    const hasAbsolute = tolerance.absoluteTolerance !== null && tolerance.absoluteTolerance > 0;
    const hasPercentage = tolerance.percentageTolerance !== null && tolerance.percentageTolerance > 0;

    if (!hasAbsolute && !hasPercentage) {
      return {
        status: 'EXCEPTION',
        isValid: false,
        validationErrors: ['قاعدة التفاوت لا تحتوي على معيار مطلق ولا معيار نسبة مئوية.'],
        variance,
        absVariance,
        variancePercentage: null,
        rule: tolerance,
        toleranceTypeApplied: 'NONE',
        limitKg: null,
        limitPercentage: null,
        warningLimitKg: null,
        isException: true,
        isWarning: false,
        isNormal: false,
        messageAr: 'قاعدة التفاوت خالية من أي حدود صالحة.'
      };
    }

    let toleranceTypeApplied: 'ABSOLUTE' | 'PERCENTAGE' | 'BOTH' = 'ABSOLUTE';
    let effectiveLimitKg: number;
    let limitPercentage: number | null = tolerance.percentageTolerance;
    let calculatedPercentage: number | null = null;

    if (loadedNet && loadedNet > 0) {
      calculatedPercentage = Math.round(((variance / loadedNet) * 100) * 1000) / 1000;
    }

    // Case 1: BOTH (absolute & percentage)
    if (hasAbsolute && hasPercentage) {
      toleranceTypeApplied = 'BOTH';
      if (!loadedNet || loadedNet <= 0) {
        errors.push('التقييم المشترك (BOTH) يتطلب loadedNet > 0 لاحتساب حد النسبة المئوية.');
        return {
          status: 'EXCEPTION',
          isValid: false,
          validationErrors: errors,
          variance,
          absVariance,
          variancePercentage: null,
          rule: tolerance,
          toleranceTypeApplied: 'BOTH',
          limitKg: tolerance.absoluteTolerance,
          limitPercentage: tolerance.percentageTolerance,
          warningLimitKg: null,
          isException: true,
          isWarning: false,
          isNormal: false,
          messageAr: errors.join(' | ')
        };
      }

      const pctKg = Math.round(((loadedNet * (tolerance.percentageTolerance as number)) / 100) * 1000) / 1000;
      // In Saudi bulk logistics, when both are specified, the allowed threshold is the greater of the two
      // to accommodate both bulk percentage moisture loss and physical scale calibration tolerance.
      effectiveLimitKg = Math.max(tolerance.absoluteTolerance as number, pctKg);
    }
    // Case 2: PERCENTAGE ONLY
    else if (hasPercentage) {
      toleranceTypeApplied = 'PERCENTAGE';
      if (!loadedNet || loadedNet <= 0) {
        errors.push('تقييم نسبة التفاوت (PERCENTAGE) يتطلب loadedNet > 0.');
        return {
          status: 'EXCEPTION',
          isValid: false,
          validationErrors: errors,
          variance,
          absVariance,
          variancePercentage: null,
          rule: tolerance,
          toleranceTypeApplied: 'PERCENTAGE',
          limitKg: null,
          limitPercentage: tolerance.percentageTolerance,
          warningLimitKg: null,
          isException: true,
          isWarning: false,
          isNormal: false,
          messageAr: errors.join(' | ')
        };
      }

      effectiveLimitKg = Math.round(((loadedNet * (tolerance.percentageTolerance as number)) / 100) * 1000) / 1000;
    }
    // Case 3: ABSOLUTE ONLY
    else {
      toleranceTypeApplied = 'ABSOLUTE';
      effectiveLimitKg = tolerance.absoluteTolerance as number;
    }

    // Warning threshold (default 75% of limit)
    const warningRatio = tolerance.warningRatio ?? 0.75;
    const warningLimitKg = Math.round(effectiveLimitKg * warningRatio * 1000) / 1000;

    // Evaluation Logic: NORMAL | WARNING | EXCEPTION
    let status: ToleranceEvaluationOutput;
    let messageAr = '';

    if (absVariance > effectiveLimitKg) {
      status = 'EXCEPTION';
      messageAr = `تجاوز الفارق (${absVariance.toLocaleString()} كجم) حد التسامح المسموح (${effectiveLimitKg.toLocaleString()} كجم) بموجب قاعدة [${toleranceTypeApplied}]. يتطلب إنشاء استثناء رسمي وحجز التسوية.`;
    } else if (absVariance >= warningLimitKg) {
      status = 'WARNING';
      messageAr = `الفارق (${absVariance.toLocaleString()} كجم) يقترب من حد التسامح الأقصى (${effectiveLimitKg.toLocaleString()} كجم) وبلغ نطاق التحذير الرقابي (${warningLimitKg.toLocaleString()} كجم).`;
    } else {
      status = 'NORMAL';
      messageAr = `الفارق الوزني (${absVariance.toLocaleString()} كجم) طبيعي وضمن حدود التسامح المعتمدة (${effectiveLimitKg.toLocaleString()} كجم).`;
    }

    return {
      status,
      isValid: true,
      validationErrors: [],
      variance,
      absVariance,
      variancePercentage: calculatedPercentage,
      rule: tolerance,
      toleranceTypeApplied,
      limitKg: effectiveLimitKg,
      limitPercentage,
      warningLimitKg,
      isException: status === 'EXCEPTION',
      isWarning: status === 'WARNING',
      isNormal: status === 'NORMAL',
      messageAr
    };
  }

  // =========================================================================
  // 4. calculateSettlement(pricingRule, netWeight)
  // =========================================================================
  /**
   * Calculates authoritative settlement amount based on approved pricing rule.
   *
   * Strict Validation Rules:
   * - net > 0
   * - Missing values MUST BE null, NEVER 0!
   * - Pricing rule must be ACTIVE.
   */
  public calculateSettlement(
    pricingRule: MasterPricingRule | null | undefined,
    netWeight: number | null | undefined
  ): WeightSettlementResult {
    const errors: string[] = [];

    if (netWeight === null || netWeight === undefined) {
      errors.push('قيمة الوزن الصافي (netWeight) مفقودة أو null (يُمنع استخدام 0 كبديل).');
    }

    if (!pricingRule) {
      errors.push('قاعدة التسعير (pricingRule) مفقودة أو غير محددة.');
    }

    if (netWeight === null || netWeight === undefined || !pricingRule) {
      return {
        settlementAmount: null, // NEVER 0 on missing data!
        pricingType: pricingRule?.pricingType ?? null,
        agreedRate: pricingRule?.agreedRate ?? null,
        currency: pricingRule?.currency ?? 'SAR',
        netWeight: netWeight ?? null,
        billableTons: null,
        formula: 'مفقود (غير محدد)',
        isValid: false,
        validationErrors: errors
      };
    }

    // Rule: net > 0
    if (netWeight <= 0) {
      errors.push(`الوزن الصافي (${netWeight} كجم) غير صالح. يجب أن يكون أكبر من صفر (net > 0).`);
      return {
        settlementAmount: null, // NEVER 0!
        pricingType: pricingRule.pricingType,
        agreedRate: pricingRule.agreedRate,
        currency: pricingRule.currency || 'SAR',
        netWeight,
        billableTons: null,
        formula: 'غير صالح (الوزن الصافي <= 0)',
        isValid: false,
        validationErrors: errors
      };
    }

    let amount: number;
    let formula = '';
    let billableTons: number | null = null;

    if (pricingRule.pricingType === 'PER_TON') {
      billableTons = Math.round((netWeight / 1000) * 1000) / 1000;
      amount = Math.round((billableTons * pricingRule.agreedRate) * 100) / 100;
      formula = `${billableTons.toFixed(3)} طن × ${pricingRule.agreedRate.toFixed(2)} ${pricingRule.currency || 'SAR'} = ${amount.toFixed(2)} ${pricingRule.currency || 'SAR'}`;
    } else if (pricingRule.pricingType === 'PER_TRIP') {
      amount = Math.round(pricingRule.agreedRate * 100) / 100;
      formula = `مقطوعية ثابتة للرد = ${amount.toFixed(2)} ${pricingRule.currency || 'SAR'}`;
    } else {
      errors.push(`نوع التسعير غير معروف (${(pricingRule as any).pricingType}).`);
      return {
        settlementAmount: null,
        pricingType: null,
        agreedRate: pricingRule.agreedRate,
        currency: pricingRule.currency || 'SAR',
        netWeight,
        billableTons: null,
        formula: 'خطأ في نوع التسعير',
        isValid: false,
        validationErrors: errors
      };
    }

    return {
      settlementAmount: amount,
      pricingType: pricingRule.pricingType,
      agreedRate: pricingRule.agreedRate,
      currency: pricingRule.currency || 'SAR',
      netWeight,
      billableTons,
      formula,
      isValid: true,
      validationErrors: []
    };
  }

  // =========================================================================
  // Tolerance Rule Management APIs
  // =========================================================================
  public saveToleranceRule(rule: ToleranceRule): ToleranceRule {
    const key = this.getRuleKey(rule.projectId, rule.materialId);
    const ruleWithId: ToleranceRule = {
      ...rule,
      ruleId: rule.ruleId || `TOL-${rule.projectId}-${rule.materialId}`
    };
    this.toleranceRules.set(key, ruleWithId);
    return ruleWithId;
  }

  public getToleranceRule(projectId: string, materialId: string): ToleranceRule | null {
    const key = this.getRuleKey(projectId, materialId);
    return this.toleranceRules.get(key) || null;
  }

  public getAllToleranceRules(): ToleranceRule[] {
    return Array.from(this.toleranceRules.values());
  }

  public deleteToleranceRule(projectId: string, materialId: string): boolean {
    const key = this.getRuleKey(projectId, materialId);
    return this.toleranceRules.delete(key);
  }
}

// Global singleton instance
export const weightEngine = new StandaloneWeightEngine();
