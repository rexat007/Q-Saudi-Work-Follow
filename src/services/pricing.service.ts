import { 
  PricingRule, 
  PricingType, 
  ResolvePricingParams, 
  CalculateSettlementParams, 
  SettlementCalculationResult, 
  TripPricingSnapshot 
} from '../types/pricing';
import { pricingRuleRepository } from '../repositories/pricingRule.repository';

export class PricingService {
  /**
   * Normalizes any Date, ISO string, or Timestamp representation into standard 'YYYY-MM-DD'.
   */
  private normalizeDate(dateVal: string | Date | any): string {
    if (!dateVal) return '';
    if (typeof dateVal === 'string') {
      return dateVal.split('T')[0].trim();
    }
    if (dateVal instanceof Date) {
      return dateVal.toISOString().split('T')[0];
    }
    if (dateVal && typeof dateVal.toDate === 'function') {
      return dateVal.toDate().toISOString().split('T')[0];
    }
    return String(dateVal).split('T')[0];
  }

  /**
   * Pure evaluation function: Resolves active pricing rule from a given in-memory array of rules.
   * Useful for offline execution, simulation, and automated test runners.
   */
  resolvePricingRuleFromList(
    rules: PricingRule[],
    params: ResolvePricingParams
  ): { rule: PricingRule | null; reasonAr?: string; reasonCode?: string } {
    const targetDate = this.normalizeDate(params.tripDate);

    if (!targetDate) {
      return {
        rule: null,
        reasonAr: 'تاريخ الرحلة غير محدد أو غير صالح',
        reasonCode: 'INVALID_TRIP_DATE',
      };
    }

    // Filter by project and carrier (specific carrier or universal wildcard)
    const projectRules = rules.filter(
      (r) => r.projectId === params.projectId && (r.carrierId === params.carrierId || r.carrierId === 'ALL' || r.carrierId === '*')
    );

    if (projectRules.length === 0) {
      return {
        rule: null,
        reasonAr: `لا توجد أي قواعد تسعير مسجلة للناقل [${params.carrierId}] في هذا المشروع`,
        reasonCode: 'MISSING_PRICING',
      };
    }

    // Find rules matching material (or fallback to general material)
    const materialMatches = projectRules.filter((r) => {
      if (params.materialId && r.materialId === params.materialId) return true;
      if (!r.materialId || r.materialId === 'ALL_MATERIALS') return true;
      return false;
    });

    if (materialMatches.length === 0) {
      return {
        rule: null,
        reasonAr: `لا توجد تسعيرة متوافقة مع المادة [${params.materialId || 'عام'}] للناقل المحدد`,
        reasonCode: 'MISSING_PRICING',
      };
    }

    // Check active status & date validity
    const activeRules = materialMatches.filter((r) => r.status === 'ACTIVE');

    if (activeRules.length === 0) {
      return {
        rule: null,
        reasonAr: `قواعد التسعير للناقل موجودة ولكنها معطلة أو مسودة (INACTIVE/DRAFT)`,
        reasonCode: 'PRICING_INACTIVE',
      };
    }

    // Match within date range
    const validDateRules = activeRules.filter((r) => {
      const from = this.normalizeDate(r.effectiveFrom);
      const to = this.normalizeDate(r.effectiveTo);
      const afterFrom = !from || targetDate >= from;
      const beforeTo = !to || targetDate <= to;
      return afterFrom && beforeTo;
    });

    if (validDateRules.length === 0) {
      // Check if expired
      const expiredRules = activeRules.filter((r) => {
        const to = this.normalizeDate(r.effectiveTo);
        return to && targetDate > to;
      });

      if (expiredRules.length > 0) {
        return {
          rule: null,
          reasonAr: `تسعيرة الناقل منتهية الصلاحية بتاريخ ${expiredRules[0].effectiveTo} (تاريخ الرحلة: ${targetDate})`,
          reasonCode: 'EXPIRED_PRICING',
        };
      }

      return {
        rule: null,
        reasonAr: `تاريخ الرحلة [${targetDate}] خارج النطاق الزمني لسريان تسعيرة الناقل`,
        reasonCode: 'PRICING_OUT_OF_RANGE',
      };
    }

    // Prioritize specificity:
    // 1. Specific carrier + Specific material (highest)
    // 2. Specific carrier + Universal material
    // 3. Universal carrier + Specific material
    // 4. Universal carrier + Universal material (lowest)
    const sorted = [...validDateRules].sort((a, b) => {
      const aSpecificCarrier = a.carrierId !== 'ALL' && a.carrierId !== '*' ? 2 : 0;
      const bSpecificCarrier = b.carrierId !== 'ALL' && b.carrierId !== '*' ? 2 : 0;
      const aSpecificMat = a.materialId && a.materialId !== 'ALL_MATERIALS' ? 1 : 0;
      const bSpecificMat = b.materialId && b.materialId !== 'ALL_MATERIALS' ? 1 : 0;
      
      const scoreA = aSpecificCarrier + aSpecificMat;
      const scoreB = bSpecificCarrier + bSpecificMat;
      return scoreB - scoreA;
    });

    return {
      rule: sorted[0],
    };
  }

  /**
   * Resolves the active pricing rule using Firestore repository or provided list.
   * Throws informative error if no pricing rule is active for that date.
   */
  async resolvePricingRule(params: ResolvePricingParams): Promise<PricingRule> {
    // Query repository
    const rawEntities = await pricingRuleRepository.listByProject(params.projectId);
    
    // Map to canonical PricingRule schema
    const rules: PricingRule[] = rawEntities.map((e: any) => ({
      pricingRuleId: e.pricingRuleId,
      projectId: e.projectId,
      carrierId: e.carrierId || 'ALL',
      materialId: e.materialId || null,
      pricingType: (e.pricingModel === 'PER_TRIP' || e.pricingType === 'PER_TRIP') ? 'PER_TRIP' : 'PER_TON',
      rate: e.baseRateSAR !== undefined ? e.baseRateSAR : (e.rate || 0),
      currency: e.currency || 'SAR',
      effectiveFrom: e.effectiveFrom || '2020-01-01',
      effectiveTo: e.effectiveTo || '2099-12-31',
      status: e.isActive ? 'ACTIVE' : 'INACTIVE',
      createdAt: e.createdAt || new Date().toISOString(),
      createdBy: e.createdBy || 'system',
      updatedAt: e.updatedAt || new Date().toISOString(),
      notes: e.notes,
    }));

    const result = this.resolvePricingRuleFromList(rules, params);

    if (!result.rule) {
      throw new Error(`[PricingEngine] فشل تحديد تسعيرة الرحلة: ${result.reasonAr} (كود: ${result.reasonCode})`);
    }

    return result.rule;
  }

  /**
   * Server-Side Settlement Calculator.
   * 
   * Strict Rule: Client is STRICTLY PROHIBITED from supplying the final settlementAmount.
   * All business calculations are performed and verified on the server-side.
   * 
   * Formula:
   * - PER_TRIP: settlementAmount = rate (or rate * tripCount)
   * - PER_TON:  settlementAmount = netWeightTon * rate
   */
  calculateSettlement(params: CalculateSettlementParams): SettlementCalculationResult {
    const { pricingRule, clientSuppliedAmount } = params;

    let settlementBase = 0;
    let settlementAmount = 0;
    let calculationDetailsAr = '';

    if (pricingRule.pricingType === 'PER_TRIP') {
      const unitsCount = params.unitsCount && params.unitsCount > 0 ? params.unitsCount : 1;
      settlementBase = unitsCount;
      settlementAmount = Number((pricingRule.rate * unitsCount).toFixed(2));
      calculationDetailsAr = `تسعيرة مقطوعة بالرد: ${pricingRule.rate} ${pricingRule.currency} × ${unitsCount} رد = ${settlementAmount} ${pricingRule.currency}`;
    } else if (pricingRule.pricingType === 'PER_TON') {
      let weightTon = 0;
      if (params.netWeightTon !== undefined) {
        weightTon = params.netWeightTon;
      } else if (params.netWeightKg !== undefined) {
        weightTon = params.netWeightKg / 1000;
      }

      // Round base to 3 decimal places (standard metric ton precision)
      settlementBase = Number(weightTon.toFixed(3));
      settlementAmount = Number((settlementBase * pricingRule.rate).toFixed(2));
      calculationDetailsAr = `حساب صافي بالوزن: ${settlementBase} طن × ${pricingRule.rate} ${pricingRule.currency}/طن = ${settlementAmount} ${pricingRule.currency}`;
    } else {
      throw new Error(`نوع التسعير غير مدعوم: ${(pricingRule as any).pricingType}`);
    }

    // Security Gate: Check if client attempted to tamper with final amount
    if (clientSuppliedAmount !== undefined) {
      if (Math.abs(clientSuppliedAmount - settlementAmount) > 0.001) {
        console.warn(
          `[PricingEngine Security Alert] Client submitted tampered settlementAmount (${clientSuppliedAmount} SAR). Server enforced calculated value (${settlementAmount} SAR).`
        );
      }
    }

    const nowIso = new Date().toISOString();
    const snapshot: TripPricingSnapshot = {
      pricingRuleId: pricingRule.pricingRuleId,
      pricingType: pricingRule.pricingType,
      agreedRate: pricingRule.rate,
      currency: pricingRule.currency,
      settlementBase,
      settlementAmount,
      pricingSnapshotAt: nowIso,
      formulaDescriptionAr: calculationDetailsAr,
    };

    return {
      pricingRuleId: pricingRule.pricingRuleId,
      pricingType: pricingRule.pricingType,
      agreedRate: pricingRule.rate,
      currency: pricingRule.currency,
      settlementBase,
      settlementAmount,
      calculationDetailsAr,
      pricingSnapshotAt: nowIso,
      snapshot,
    };
  }

  /**
   * Helper to construct immutable TripPricingSnapshot ready for insertion into Trip entity.
   */
  createTripPricingSnapshot(
    pricingRule: PricingRule,
    weights?: { netWeightKg?: number; netWeightTon?: number }
  ): TripPricingSnapshot {
    const calc = this.calculateSettlement({
      pricingRule,
      netWeightKg: weights?.netWeightKg,
      netWeightTon: weights?.netWeightTon,
    });
    return calc.snapshot;
  }
}

export const pricingService = new PricingService();
