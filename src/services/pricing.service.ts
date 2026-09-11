import { 
  PricingRule, 
  PricingType, 
  ResolvePricingParams, 
  CalculateSettlementParams, 
  SettlementCalculationResult, 
  TripPricingSnapshot,
  PricingResolutionResult
} from '../types/pricing';
import { pricingRuleRepository } from '../repositories/pricingRule.repository';
import { MASTER_PRICING_RULES } from '../data/masterPricingRules';

export class PricingService {
  private inMemoryRules: Map<string, PricingRule> = new Map();

  constructor() {
    // Pre-populate with default master pricing rules
    MASTER_PRICING_RULES.forEach(m => {
      this.inMemoryRules.set(m.pricingRuleId, {
        pricingRuleId: m.pricingRuleId,
        projectId: m.projectId,
        name: m.name,
        pricingType: m.pricingType,
        rate: m.agreedRate,
        currency: m.currency,
        effectiveFrom: m.effectiveFrom,
        effectiveTo: m.effectiveTo,
        carrierId: m.carrierId || '',
        materialId: m.materialId,
        status: m.status,
        version: 1,
        createdAt: new Date().toISOString(),
        createdBy: 'system',
      });
    });
  }

  public registerRules(rules: PricingRule[]): void {
    rules.forEach(r => this.inMemoryRules.set(r.pricingRuleId, r));
  }

  public getPricingRule(pricingRuleId?: string | null): PricingRule | undefined {
    if (!pricingRuleId) return undefined;
    return this.inMemoryRules.get(pricingRuleId);
  }

  /**
   * Normalizes any Date, ISO string, or Timestamp representation into standard 'YYYY-MM-DD'.
   */
  public normalizeDate(dateVal: string | Date | any): string {
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
   * Pure evaluation function: Resolves active pricing rule from a given list of rules.
   * Strictly enforces:
   * 1. Project isolation (no cross-project rules)
   * 2. Carrier-specific agreements (no universal guesswork)
   * 3. Specific material priority over general material
   * 4. Effective date window matching (future and expired rejected)
   * 5. Overlap/collision detection resulting in AMBIGUOUS
   * 6. No hardcoded or guessed fallback rates
   */
  resolvePricingRuleFromList(
    rules: PricingRule[],
    params: ResolvePricingParams
  ): PricingResolutionResult {
    const targetDate = this.normalizeDate(params.tripDate);

    // Validate parameters
    if (!params.projectId || !params.projectId.trim()) {
      return {
        status: 'INVALID',
        selectedRule: null,
        rule: null,
        reason: 'معرّف المشروع مطلوب لحل قاعدة التسعير',
        reasonAr: 'معرّف المشروع مطلوب لحل قاعدة التسعير',
        reasonCode: 'INVALID_PROJECT_ID',
        candidates: [],
      };
    }

    if (!params.carrierId || !params.carrierId.trim() || params.carrierId === 'ALL' || params.carrierId === '*') {
      return {
        status: 'INVALID',
        selectedRule: null,
        rule: null,
        reason: 'يجب تحديد الناقل بشكل صريح ولا يسمح باتفاقية مجهولة الناقل',
        reasonAr: 'يجب تحديد الناقل بشكل صريح ولا يسمح باتفاقية مجهولة الناقل',
        reasonCode: 'INVALID_CARRIER_ID',
        candidates: [],
      };
    }

    if (!targetDate) {
      return {
        status: 'INVALID',
        selectedRule: null,
        rule: null,
        reason: 'تاريخ الرحلة غير محدد أو غير صالح',
        reasonAr: 'تاريخ الرحلة غير محدد أو غير صالح',
        reasonCode: 'INVALID_TRIP_DATE',
        candidates: [],
      };
    }

    // 1. Strict Project Isolation: Only rules belonging to this project
    const projectRules = rules.filter((r) => r.projectId === params.projectId);

    // 2. Carrier-specific filter
    const carrierRules = projectRules.filter((r) => r.carrierId === params.carrierId);

    if (carrierRules.length === 0) {
      return {
        status: 'NOT_FOUND',
        selectedRule: null,
        rule: null,
        reason: `لا توجد أي قواعد تسعير مسجلة للناقل [${params.carrierId}] في هذا المشروع`,
        reasonAr: `لا توجد أي قواعد تسعير مسجلة للناقل [${params.carrierId}] في هذا المشروع`,
        reasonCode: 'MISSING_PRICING',
        candidates: [],
      };
    }

    // Optional pricingType filter
    let typeFiltered = carrierRules;
    if (params.pricingType) {
      typeFiltered = carrierRules.filter((r) => r.pricingType === params.pricingType);
      if (typeFiltered.length === 0) {
        return {
          status: 'NOT_FOUND',
          selectedRule: null,
          rule: null,
          reason: `لا توجد تسعيرة للناقل [${params.carrierId}] بنوع التسعير المطلوب [${params.pricingType}]`,
          reasonAr: `لا توجد تسعيرة للناقل [${params.carrierId}] بنوع التسعير المطلوب [${params.pricingType}]`,
          reasonCode: 'MISSING_PRICING_TYPE',
          candidates: [],
        };
      }
    }

    // 3. Active status filter
    const activeRules = typeFiltered.filter(
      (r) => r.status === 'ACTIVE' || (r as any).isActive === true
    );

    if (activeRules.length === 0) {
      return {
        status: 'NOT_FOUND',
        selectedRule: null,
        rule: null,
        reason: `قواعد التسعير للناقل موجودة ولكنها معطلة أو مسودة (INACTIVE/DRAFT)`,
        reasonAr: `قواعد التسعير للناقل موجودة ولكنها معطلة أو مسودة (INACTIVE/DRAFT)`,
        reasonCode: 'PRICING_INACTIVE',
        candidates: [],
      };
    }

    // 4. Match within effective date range
    const validDateRules = activeRules.filter((r) => {
      const from = this.normalizeDate(r.effectiveFrom);
      const to = r.effectiveTo ? this.normalizeDate(r.effectiveTo) : null;
      const afterFrom = !from || targetDate >= from;
      const beforeTo = !to || targetDate <= to;
      return afterFrom && beforeTo;
    });

    if (validDateRules.length === 0) {
      // Check if expired
      const expiredRules = activeRules.filter((r) => {
        const to = r.effectiveTo ? this.normalizeDate(r.effectiveTo) : null;
        return to && targetDate > to;
      });

      if (expiredRules.length > 0) {
        return {
          status: 'NOT_FOUND',
          selectedRule: null,
          rule: null,
          reason: `تسعيرة الناقل منتهية الصلاحية بتاريخ ${expiredRules[0].effectiveTo} (تاريخ الرحلة: ${targetDate})`,
          reasonAr: `تسعيرة الناقل منتهية الصلاحية بتاريخ ${expiredRules[0].effectiveTo} (تاريخ الرحلة: ${targetDate})`,
          reasonCode: 'EXPIRED_PRICING',
          candidates: [],
        };
      }

      // Check if future
      const futureRules = activeRules.filter((r) => {
        const from = this.normalizeDate(r.effectiveFrom);
        return from && targetDate < from;
      });

      if (futureRules.length > 0) {
        return {
          status: 'NOT_FOUND',
          selectedRule: null,
          rule: null,
          reason: `تسعيرة الناقل تبدأ بتاريخ مستقبلي [${futureRules[0].effectiveFrom}] وتاريخ الرحلة [${targetDate}] سابق لها`,
          reasonAr: `تسعيرة الناقل تبدأ بتاريخ مستقبلي [${futureRules[0].effectiveFrom}] وتاريخ الرحلة [${targetDate}] سابق لها`,
          reasonCode: 'FUTURE_PRICING',
          candidates: [],
        };
      }

      return {
        status: 'NOT_FOUND',
        selectedRule: null,
        rule: null,
        reason: `تاريخ الرحلة [${targetDate}] خارج النطاق الزمني لسريان تسعيرة الناقل`,
        reasonAr: `تاريخ الرحلة [${targetDate}] خارج النطاق الزمني لسريان تسعيرة الناقل`,
        reasonCode: 'PRICING_OUT_OF_RANGE',
        candidates: [],
      };
    }

    // 5. Material Specificity & Deterministic Priority
    let candidatePool: PricingRule[] = [];
    if (params.materialId && params.materialId !== 'ALL' && params.materialId !== 'ALL_MATERIALS') {
      const specificMatches = validDateRules.filter((r) => r.materialId === params.materialId);
      if (specificMatches.length > 0) {
        candidatePool = specificMatches;
      } else {
        // Fallback to general/universal material rules for this carrier
        candidatePool = validDateRules.filter(
          (r) => !r.materialId || r.materialId === 'ALL_MATERIALS' || r.materialId === 'GENERAL'
        );
      }
    } else {
      candidatePool = validDateRules.filter(
        (r) => !r.materialId || r.materialId === 'ALL_MATERIALS' || r.materialId === 'GENERAL'
      );
    }

    if (candidatePool.length === 0) {
      return {
        status: 'NOT_FOUND',
        selectedRule: null,
        rule: null,
        reason: `لا توجد تسعيرة متوافقة مع المادة [${params.materialId || 'عام'}] للناقل المحدد في هذا التاريخ`,
        reasonAr: `لا توجد تسعيرة متوافقة مع المادة [${params.materialId || 'عام'}] للناقل المحدد في هذا التاريخ`,
        reasonCode: 'MISSING_PRICING',
        candidates: [],
      };
    }

    // 6. Conflict & Ambiguity Detection
    // If more than one candidate exists at the same specificity level with different rates or distinct rule IDs:
    if (candidatePool.length > 1) {
      const uniqueRates = new Set(candidatePool.map((c) => c.rate));
      const uniqueIds = new Set(candidatePool.map((c) => c.pricingRuleId));
      if (uniqueRates.size > 1 || uniqueIds.size > 1) {
        return {
          status: 'AMBIGUOUS',
          selectedRule: null,
          rule: null,
          reason: `يوجد أكثر من قاعدة تسعير متداخلة سارية لنفس الناقل والمادة في هذا التاريخ (${candidatePool.map(c => c.pricingRuleId).join(', ')})`,
          reasonAr: `يوجد أكثر من قاعدة تسعير متداخلة سارية لنفس الناقل والمادة في هذا التاريخ (${candidatePool.map(c => c.pricingRuleId).join(', ')})`,
          reasonCode: 'AMBIGUOUS_PRICING',
          candidates: candidatePool,
        };
      }
    }

    // Deterministic unambiguous match
    const resolvedRule = candidatePool[0];
    return {
      status: 'RESOLVED',
      selectedRule: resolvedRule,
      rule: resolvedRule,
      reason: 'تم تحديد قاعدة التسعير التعاقدية بنجاح وبشكل حتمي',
      reasonAr: 'تم تحديد قاعدة التسعير التعاقدية بنجاح وبشكل حتمي',
      reasonCode: 'PRICING_RESOLVED',
      candidates: [resolvedRule],
    };
  }

  /**
   * Resolves the active pricing rule using Firestore repository or stored rules.
   */
  async resolvePricingRule(params: ResolvePricingParams): Promise<PricingResolutionResult> {
    try {
      const rawEntities = await pricingRuleRepository.listByProject(params.projectId);

      const rules: PricingRule[] = rawEntities.map((e: any) => ({
        pricingRuleId: e.pricingRuleId,
        projectId: e.projectId,
        carrierId: e.carrierId || '',
        materialId: e.materialId || null,
        pricingType: (e.pricingModel === 'PER_TRIP' || e.pricingType === 'PER_TRIP') ? 'PER_TRIP' : 'PER_TON',
        rate: e.rate !== undefined ? e.rate : (e.baseRateSAR !== undefined ? e.baseRateSAR : 0),
        currency: e.currency || 'SAR',
        settlementBase: e.settlementBase,
        effectiveFrom: e.effectiveFrom || '2020-01-01',
        effectiveTo: e.effectiveTo || null,
        status: e.status || (e.isActive !== false ? 'ACTIVE' : 'INACTIVE'),
        version: e.version || 1,
        parentRuleId: e.parentRuleId,
        createdAt: e.createdAt || new Date().toISOString(),
        createdBy: e.createdBy || 'system',
        updatedAt: e.updatedAt || new Date().toISOString(),
        notes: e.notes,
      }));

      return this.resolvePricingRuleFromList(rules, params);
    } catch (err: any) {
      return {
        status: 'INVALID',
        selectedRule: null,
        rule: null,
        reason: `خطأ أثناء استعلام قواعد التسعير: ${err?.message || err}`,
        reasonAr: `خطأ أثناء استعلام قواعد التسعير: ${err?.message || err}`,
        reasonCode: 'REPOSITORY_ERROR',
        candidates: [],
      };
    }
  }

  /**
   * Server-Side Settlement Calculator.
   * 
   * Strict Rules:
   * 1. Client is STRICTLY PROHIBITED from supplying the final settlementAmount.
   * 2. PER_TRIP: settlementAmount = agreedRate * unitsCount (settlementBase: TRIP)
   * 3. PER_TON:  settlementAmount = billableWeightTon * agreedRate (settlementBase: NET_WEIGHT)
   * 4. If weight is missing in PER_TON: marks isPending = true and does not guess!
   */
  calculateSettlement(params: CalculateSettlementParams): SettlementCalculationResult {
    const { pricingRule, clientSuppliedAmount, allowMissingWeight } = params;

    let settlementBase = 0;
    let settlementAmount = 0;
    let calculationDetailsAr = '';
    let isPending = false;
    let pendingReason: string | undefined;

    if (!pricingRule || (pricingRule as any).pricingRuleId === 'UNRESOLVED_PENDING') {
      isPending = true;
      pendingReason = (pricingRule as any)?.pendingReason || 'لا توجد قاعدة تسعير تعاقدية معتمدة (معلق التسوية)';
      settlementBase = 0;
      settlementAmount = 0;
      calculationDetailsAr = 'التسوية معلقة بانتظار اعتماد عقد التسعير';
      return {
        pricingRuleId: 'UNRESOLVED_PENDING',
        pricingType: (pricingRule as any)?.pricingType || 'PER_TON',
        agreedRate: 0,
        currency: 'SAR',
        settlementBase: 0,
        settlementAmount: 0,
        calculationDetailsAr,
        pricingSnapshotAt: new Date().toISOString(),
        isPending: true,
        pendingReason,
        snapshot: {
          pricingRuleId: 'UNRESOLVED_PENDING',
          pricingType: (pricingRule as any)?.pricingType || 'PER_TON',
          agreedRate: 0,
          currency: 'SAR',
          settlementBase: 0,
          settlementAmount: 0,
          pricingSnapshotAt: new Date().toISOString(),
          isPending: true,
          pendingReason,
        }
      };
    }

    if (pricingRule.pricingType === 'PER_TRIP') {
      const unitsCount = params.unitsCount && params.unitsCount > 0 ? params.unitsCount : 1;
      settlementBase = unitsCount;
      settlementAmount = Number((pricingRule.rate * unitsCount).toFixed(2));
      calculationDetailsAr = `تسعيرة مقطوعة بالرد: ${pricingRule.rate} ${pricingRule.currency} × ${unitsCount} رد = ${settlementAmount} ${pricingRule.currency}`;
    } else if (pricingRule.pricingType === 'PER_TON') {
      let weightTon: number | undefined;

      if (params.netWeightTon !== undefined && params.netWeightTon !== null) {
        weightTon = params.netWeightTon;
      } else if (params.netWeightKg !== undefined && params.netWeightKg !== null) {
        weightTon = params.netWeightKg / 1000;
      }

      // Check missing or zero weight
      if (weightTon === undefined || (weightTon === 0 && !allowMissingWeight)) {
        isPending = true;
        pendingReason = 'الوزن الصافي المعتمد للفوترة غير متوفر (بانتظار تسجيل الميزان أو تأكيد التنزيل)';
        settlementBase = 0;
        settlementAmount = 0;
        calculationDetailsAr = `بانتظار احتساب الوزن المعتمد للفوترة بالطن (السعر المتفق عليه: ${pricingRule.rate} ${pricingRule.currency}/طن)`;
      } else {
        settlementBase = Number(weightTon.toFixed(3));
        settlementAmount = Number((settlementBase * pricingRule.rate).toFixed(2));
        calculationDetailsAr = `حساب صافي بالوزن: ${settlementBase} طن × ${pricingRule.rate} ${pricingRule.currency}/طن = ${settlementAmount} ${pricingRule.currency}`;
      }
    } else {
      throw new Error(`نوع التسعير غير مدعوم: ${(pricingRule as any).pricingType}`);
    }

    // Security Gate: Check if client attempted to tamper with final amount
    if (clientSuppliedAmount !== undefined && !isPending) {
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
      currency: pricingRule.currency || 'SAR',
      settlementBase,
      settlementAmount,
      pricingSnapshotAt: nowIso,
      pricingRuleVersion: (pricingRule as any).version || 1,
      materialId: (pricingRule as any).materialId || null,
      materialIdApplied: (pricingRule as any).materialId || null,
      effectiveFrom: (pricingRule as any).effectiveFrom,
      effectiveTo: (pricingRule as any).effectiveTo || null,
      formulaDescriptionAr: calculationDetailsAr,
      isPending,
      pendingReason,
      pricingModel: pricingRule.pricingType,
      baseRateSAR: pricingRule.rate,
      demurrageRatePerHourSAR: (pricingRule as any).demurrageRatePerHourSAR,
      freeTimeHours: (pricingRule as any).freeTimeHours,
      waitingDurationHours: (params as any).waitingDurationHours,
    };

    return {
      pricingRuleId: pricingRule.pricingRuleId,
      pricingType: pricingRule.pricingType,
      agreedRate: pricingRule.rate,
      currency: pricingRule.currency || 'SAR',
      settlementBase,
      settlementAmount,
      calculationDetailsAr,
      pricingSnapshotAt: nowIso,
      snapshot,
      isPending,
      pendingReason,
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

  /**
   * Creates a pending snapshot when pricing cannot be resolved deterministically.
   * NO GUESSWORK: Rate and settlement amount are 0.
   */
  createPendingSnapshot(reason: string, partial?: Partial<TripPricingSnapshot>): TripPricingSnapshot {
    return {
      pricingRuleId: 'UNRESOLVED_PENDING',
      pricingType: 'PER_TON',
      agreedRate: 0,
      currency: 'SAR',
      settlementBase: 0,
      settlementAmount: 0,
      pricingSnapshotAt: new Date().toISOString(),
      isPending: true,
      pendingReason: reason,
      formulaDescriptionAr: `تسعيرة معلقة: ${reason}`,
      pricingModel: 'UNRESOLVED_PENDING',
      baseRateSAR: 0,
      ...partial,
    };
  }
}

export const pricingService = new PricingService();
