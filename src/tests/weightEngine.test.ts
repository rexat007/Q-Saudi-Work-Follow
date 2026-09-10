/**
 * Automated Test Suite: Standalone Weight Engine
 *
 * Verifies strict prompt requirements:
 * 1. calculateNetWeight(tare, gross)
 * 2. calculateVariance(loadedNet, receivedNet)
 * 3. evaluateTolerance(variance, tolerance)
 * 4. calculateSettlement(pricingRule, netWeight)
 *
 * Validations:
 * - tare > 0
 * - gross > tare
 * - net > 0
 * - received > 0
 * - DO NOT use zero as replacement for missing data.
 * - Missing value MUST be null.
 *
 * Tolerance Rule:
 * - projectId, materialId, absoluteTolerance, percentageTolerance, status
 * - Types: absolute, percentage, or both
 * - Outputs: NORMAL, WARNING, EXCEPTION
 */

import { weightEngine } from '../services/weightEngine.service';
import { ToleranceRule } from '../types/weightEngine';
import { MasterPricingRule } from '../data/masterPricingRules';

export interface WeightEngineTestCaseResult {
  name: string;
  category: 'NET_WEIGHT' | 'VARIANCE' | 'TOLERANCE_EVALUATION' | 'SETTLEMENT' | 'MISSING_DATA_NULL_CHECK';
  passed: boolean;
  message: string;
  expected?: any;
  actual?: any;
}

export function runWeightEngineTestSuite(): {
  results: WeightEngineTestCaseResult[];
  allPassed: boolean;
  summary: { total: number; passed: number; failed: number };
} {
  const results: WeightEngineTestCaseResult[] = [];

  // =========================================================================
  // 1. calculateNetWeight tests
  // =========================================================================
  // 1.1 Valid net weight
  {
    const res = weightEngine.calculateNetWeight(14200, 44700);
    const passed = res.isValid && res.netWeight === 30500;
    results.push({
      name: 'calculateNetWeight: حساب صافي الوزن الصحيح (gross - tare)',
      category: 'NET_WEIGHT',
      passed,
      message: passed ? `تم الحساب بنجاح: ${res.netWeight} كجم` : `فشل الحساب: ${res.validationErrors.join(', ')}`,
      expected: 30500,
      actual: res.netWeight
    });
  }

  // 1.2 Validation: tare > 0 (tare = 0 must fail)
  {
    const res = weightEngine.calculateNetWeight(0, 30000);
    const passed = !res.isValid && res.netWeight === null && res.validationErrors.some(e => e.includes('tare > 0'));
    results.push({
      name: 'calculateNetWeight: التحقق الإلزامي من (tare > 0) ورفض القيمة صفر',
      category: 'NET_WEIGHT',
      passed,
      message: passed ? 'تم بنجاح رفض وزن فارغ يساوي صفر أو أقل' : 'فشل التحقق: تم قبول الصفر أو لم تكن النتيجة null',
      expected: null,
      actual: res.netWeight
    });
  }

  // 1.3 Validation: gross > tare (gross <= tare must fail)
  {
    const res = weightEngine.calculateNetWeight(15000, 14000);
    const passed = !res.isValid && res.netWeight === null && res.validationErrors.some(e => e.includes('gross > tare'));
    results.push({
      name: 'calculateNetWeight: التحقق الإلزامي من (gross > tare) ورفض gross <= tare',
      category: 'NET_WEIGHT',
      passed,
      message: passed ? 'تم بنجاح رفض وزن قائم أصغر من أو يساوي وزن الفارغ' : 'فشل التحقق',
      expected: null,
      actual: res.netWeight
    });
  }

  // 1.4 Missing value: missing tare/gross MUST return null, NEVER 0!
  {
    const resNullTare = weightEngine.calculateNetWeight(null, 44000);
    const resNullGross = weightEngine.calculateNetWeight(14000, null);
    const resBothNull = weightEngine.calculateNetWeight(null, null);

    const passed = resNullTare.netWeight === null && 
                   resNullGross.netWeight === null && 
                   resBothNull.netWeight === null &&
                   resNullTare.netWeight !== 0 &&
                   resNullGross.netWeight !== 0;

    results.push({
      name: 'calculateNetWeight: اشتراط صارم - القيمة المفقودة يجب أن تكون null ولا تُستبدل بالصفر 0',
      category: 'MISSING_DATA_NULL_CHECK',
      passed,
      message: passed ? 'تم إرجاع null بشكل قطعي لجميع القيم المفقودة دون استخدام 0' : 'فشل: تم استخدام 0 أو قيمة غير null',
      expected: null,
      actual: { tareNull: resNullTare.netWeight, grossNull: resNullGross.netWeight }
    });
  }

  // =========================================================================
  // 2. calculateVariance tests
  // =========================================================================
  // 2.1 Valid variance
  {
    const res = weightEngine.calculateVariance(30000, 29850);
    const passed = res.isValid && res.variance === -150 && res.variancePercentage === -0.5;
    results.push({
      name: 'calculateVariance: احتساب فارق الوزن (receivedNet - loadedNet)',
      category: 'VARIANCE',
      passed,
      message: passed ? `تم احتساب الفارق: ${res.variance} كجم (${res.variancePercentage}%)` : 'فشل احتساب الفارق',
      expected: -150,
      actual: res.variance
    });
  }

  // 2.2 Validation: net > 0 (loadedNet <= 0 must fail)
  {
    const res = weightEngine.calculateVariance(0, 29000);
    const passed = !res.isValid && res.variance === null && res.validationErrors.some(e => e.includes('net > 0'));
    results.push({
      name: 'calculateVariance: التحقق الإلزامي من (net > 0) لصافي التحميل',
      category: 'VARIANCE',
      passed,
      message: passed ? 'تم بنجاح رفض loadedNet <= 0' : 'فشل التحقق',
      expected: null,
      actual: res.variance
    });
  }

  // 2.3 Validation: received > 0 (receivedNet <= 0 must fail)
  {
    const res = weightEngine.calculateVariance(30000, 0);
    const passed = !res.isValid && res.variance === null && res.validationErrors.some(e => e.includes('received > 0'));
    results.push({
      name: 'calculateVariance: التحقق الإلزامي من (received > 0) لصافي الاستلام',
      category: 'VARIANCE',
      passed,
      message: passed ? 'تم بنجاح رفض receivedNet <= 0' : 'فشل التحقق',
      expected: null,
      actual: res.variance
    });
  }

  // 2.4 Missing value in variance MUST be null, NEVER 0!
  {
    const resMissingLoaded = weightEngine.calculateVariance(null, 30000);
    const resMissingReceived = weightEngine.calculateVariance(30000, null);

    const passed = resMissingLoaded.variance === null && 
                   resMissingReceived.variance === null &&
                   resMissingLoaded.variance !== 0 &&
                   resMissingReceived.variance !== 0;

    results.push({
      name: 'calculateVariance: اشتراط صارم - فارق البيانات المفقودة هو null وليس 0',
      category: 'MISSING_DATA_NULL_CHECK',
      passed,
      message: passed ? 'تم إرجاع null للفارق عند فقدان أي من الوزنين' : 'فشل: تم استخدام 0 كبديل',
      expected: null,
      actual: { missingLoaded: resMissingLoaded.variance, missingReceived: resMissingReceived.variance }
    });
  }

  // =========================================================================
  // 3. evaluateTolerance tests (NORMAL | WARNING | EXCEPTION)
  // =========================================================================
  // 3.1 Absolute tolerance only: NORMAL output
  {
    const rule: ToleranceRule = {
      projectId: 'PRJ-NEOM-001',
      materialId: 'MAT-AGG-01',
      absoluteTolerance: 500, // 500 kg
      percentageTolerance: null,
      status: 'ACTIVE',
      warningRatio: 0.75 // >= 375 kg is WARNING
    };

    const res = weightEngine.evaluateTolerance(-200, rule, 30000);
    const passed = res.status === 'NORMAL' && res.isNormal && res.toleranceTypeApplied === 'ABSOLUTE';
    results.push({
      name: 'evaluateTolerance (Absolute): إخراج حالة NORMAL للفارق المقبول',
      category: 'TOLERANCE_EVALUATION',
      passed,
      message: passed ? `النتيجة NORMAL كما هو متوقع للفارق -200 كجم تحت حد 500 كجم` : `الحالة الفعلية: ${res.status}`,
      expected: 'NORMAL',
      actual: res.status
    });
  }

  // 3.2 Absolute tolerance: WARNING output (near threshold >= 75%)
  {
    const rule: ToleranceRule = {
      projectId: 'PRJ-NEOM-001',
      materialId: 'MAT-AGG-01',
      absoluteTolerance: 500,
      percentageTolerance: null,
      status: 'ACTIVE',
      warningRatio: 0.75
    };

    // 400 kg is >= 375 kg (75%) but <= 500 kg -> WARNING
    const res = weightEngine.evaluateTolerance(-400, rule, 30000);
    const passed = res.status === 'WARNING' && res.isWarning;
    results.push({
      name: 'evaluateTolerance (Absolute): إخراج حالة WARNING عند الاقتراب من الحد (75% فأكثر)',
      category: 'TOLERANCE_EVALUATION',
      passed,
      message: passed ? `النتيجة WARNING كما هو متوقع للفارق 400 كجم المقترب من الحد 500 كجم` : `الحالة: ${res.status}`,
      expected: 'WARNING',
      actual: res.status
    });
  }

  // 3.3 Absolute tolerance: EXCEPTION output (exceeding limit)
  {
    const rule: ToleranceRule = {
      projectId: 'PRJ-NEOM-001',
      materialId: 'MAT-AGG-01',
      absoluteTolerance: 500,
      percentageTolerance: null,
      status: 'ACTIVE'
    };

    // -650 kg > 500 kg -> EXCEPTION
    const res = weightEngine.evaluateTolerance(-650, rule, 30000);
    const passed = res.status === 'EXCEPTION' && res.isException;
    results.push({
      name: 'evaluateTolerance (Absolute): إخراج حالة EXCEPTION عند تجاوز التفاوت المسموح',
      category: 'TOLERANCE_EVALUATION',
      passed,
      message: passed ? `النتيجة EXCEPTION لفارق -650 كجم متجاوزاً حد 500 كجم` : `الحالة: ${res.status}`,
      expected: 'EXCEPTION',
      actual: res.status
    });
  }

  // 3.4 Percentage tolerance only (e.g. 1.5% of 30,000 kg = 450 kg)
  {
    const rule: ToleranceRule = {
      projectId: 'PRJ-NEOM-001',
      materialId: 'MAT-AGG-01',
      absoluteTolerance: null,
      percentageTolerance: 1.5, // 1.5%
      status: 'ACTIVE'
    };

    // 30,000 * 1.5% = 450 kg. Let variance = -300 kg -> NORMAL
    const resNormal = weightEngine.evaluateTolerance(-300, rule, 30000);
    // Let variance = -550 kg -> EXCEPTION
    const resException = weightEngine.evaluateTolerance(-550, rule, 30000);

    const passed = resNormal.status === 'NORMAL' && 
                   resException.status === 'EXCEPTION' && 
                   resNormal.toleranceTypeApplied === 'PERCENTAGE';

    results.push({
      name: 'evaluateTolerance (Percentage): تقييم التفاوت بالنسبة المئوية بنجاح',
      category: 'TOLERANCE_EVALUATION',
      passed,
      message: passed ? 'تم تقييم النسبة المئوية: NORMAL لـ -300 كجم و EXCEPTION لـ -550 كجم' : 'فشل تقييم النسبة المئوية',
      expected: 'NORMAL & EXCEPTION',
      actual: { normal: resNormal.status, exception: resException.status }
    });
  }

  // 3.5 Both (absolute & percentage tolerance combined)
  {
    const rule: ToleranceRule = {
      projectId: 'PRJ-NEOM-001',
      materialId: 'MAT-AGG-01',
      absoluteTolerance: 400, // 400 kg
      percentageTolerance: 1.5, // 1.5% of 30,000 = 450 kg -> max is 450 kg
      status: 'ACTIVE',
      warningRatio: 0.75
    };

    // -350 kg is >= 337.5 kg (75% of 450) and <= 450 -> WARNING
    const resWarn = weightEngine.evaluateTolerance(-350, rule, 30000);
    // -600 kg > 450 kg -> EXCEPTION
    const resEx = weightEngine.evaluateTolerance(-600, rule, 30000);

    const passed = resWarn.toleranceTypeApplied === 'BOTH' &&
                   resWarn.status === 'WARNING' &&
                   resEx.status === 'EXCEPTION';

    results.push({
      name: 'evaluateTolerance (Both): دعم التفاوت المشترك (absolute & percentage معا)',
      category: 'TOLERANCE_EVALUATION',
      passed,
      message: passed ? 'تم تطبيق كلا التفاوتين معا واحتساب الحد الأقصى بنجاح' : 'فشل تقييم التفاوت المشترك',
      expected: 'BOTH -> WARNING & EXCEPTION',
      actual: { warn: resWarn.status, ex: resEx.status }
    });
  }

  // =========================================================================
  // 4. calculateSettlement tests
  // =========================================================================
  // 4.1 PER_TON settlement: netWeight / 1000 * rate
  {
    const rule: MasterPricingRule = {
      pricingRuleId: 'PRC-TEST-TON',
      projectId: 'PRJ-NEOM-001',
      name: 'تسعيرة بالطن',
      pricingType: 'PER_TON',
      agreedRate: 8.5,
      currency: 'SAR',
      effectiveFrom: '2026-01-01',
      effectiveTo: '2026-12-31',
      status: 'ACTIVE'
    };

    // 37,400 kg = 37.400 Ton -> 37.4 * 8.5 = 317.90 SAR
    const res = weightEngine.calculateSettlement(rule, 37400);
    const passed = res.isValid && res.settlementAmount === 317.90 && res.billableTons === 37.4;

    results.push({
      name: 'calculateSettlement (PER_TON): 37.4 طن × 8.5 ر.س = 317.90 ر.س',
      category: 'SETTLEMENT',
      passed,
      message: passed ? `تم احتساب التسوية بنجاح: ${res.settlementAmount} ${res.currency}` : 'فشل احتساب التسوية',
      expected: 317.90,
      actual: res.settlementAmount
    });
  }

  // 4.2 PER_TRIP settlement: flat rate
  {
    const rule: MasterPricingRule = {
      pricingRuleId: 'PRC-TEST-TRIP',
      projectId: 'PRJ-NEOM-001',
      name: 'تسعيرة بالمشوار',
      pricingType: 'PER_TRIP',
      agreedRate: 120,
      currency: 'SAR',
      effectiveFrom: '2026-01-01',
      effectiveTo: '2026-12-31',
      status: 'ACTIVE'
    };

    const res = weightEngine.calculateSettlement(rule, 30000);
    const passed = res.isValid && res.settlementAmount === 120;

    results.push({
      name: 'calculateSettlement (PER_TRIP): مقطوعية ثابتة = 120.00 ر.س',
      category: 'SETTLEMENT',
      passed,
      message: passed ? `تم احتساب تسوية المشوار: ${res.settlementAmount} ${res.currency}` : 'فشل تسوية المشوار',
      expected: 120,
      actual: res.settlementAmount
    });
  }

  // 4.3 Missing netWeight in settlement MUST be null, NEVER 0!
  {
    const rule: MasterPricingRule = {
      pricingRuleId: 'PRC-TEST-TON',
      projectId: 'PRJ-NEOM-001',
      name: 'تسعيرة بالطن',
      pricingType: 'PER_TON',
      agreedRate: 8.5,
      currency: 'SAR',
      effectiveFrom: '2026-01-01',
      effectiveTo: '2026-12-31',
      status: 'ACTIVE'
    };

    const res = weightEngine.calculateSettlement(rule, null);
    const passed = !res.isValid && res.settlementAmount === null && res.settlementAmount !== 0;

    results.push({
      name: 'calculateSettlement: القيمة المفقودة لصافي الوزن تُرجع null للتسوية وليس 0',
      category: 'MISSING_DATA_NULL_CHECK',
      passed,
      message: passed ? 'تم إرجاع null بشكل قطعي دون افتراض 0 ر.س' : 'فشل: تم استخدام 0',
      expected: null,
      actual: res.settlementAmount
    });
  }

  // 4.4 Invalid netWeight <= 0 in settlement MUST be null, NEVER 0!
  {
    const rule: MasterPricingRule = {
      pricingRuleId: 'PRC-TEST-TON',
      projectId: 'PRJ-NEOM-001',
      name: 'تسعيرة بالطن',
      pricingType: 'PER_TON',
      agreedRate: 8.5,
      currency: 'SAR',
      effectiveFrom: '2026-01-01',
      effectiveTo: '2026-12-31',
      status: 'ACTIVE'
    };

    const resZero = weightEngine.calculateSettlement(rule, 0);
    const resNegative = weightEngine.calculateSettlement(rule, -500);
    const passed = resZero.settlementAmount === null && resNegative.settlementAmount === null;

    results.push({
      name: 'calculateSettlement: التحقق الإلزامي من (net > 0) ورفض 0 أو القيم السالبة',
      category: 'SETTLEMENT',
      passed,
      message: passed ? 'تم رفض صافي الوزن صفر أو سالب وإرجاع null' : 'فشل رفض الصفر',
      expected: null,
      actual: { zeroNet: resZero.settlementAmount, negativeNet: resNegative.settlementAmount }
    });
  }

  const passedCount = results.filter(r => r.passed).length;
  return {
    results,
    allPassed: passedCount === results.length,
    summary: {
      total: results.length,
      passed: passedCount,
      failed: results.length - passedCount
    }
  };
}
