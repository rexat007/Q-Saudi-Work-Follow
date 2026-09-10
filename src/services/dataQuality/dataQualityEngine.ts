/**
 * Independent Data Quality Engine (محرك جودة البيانات المستقل)
 * 
 * Executes an 8-Stage Deterministic Pipeline:
 * 1. RAW VALUE
 * 2. NORMALIZE
 * 3. EXACT MATCH
 * 4. FUZZY MATCH
 * 5. RELATIONSHIP VALIDATION
 * 6. BUSINESS VALIDATION
 * 7. RISK SCORE
 * 8. HUMAN REVIEW
 * 
 * Complies with strict Saudi heavy logistics and multi-tenant project mandates.
 */

import { 
  MatchingResult, 
  MatchType, 
  RiskLevel, 
  QualityIssueCode, 
  PipelineTraceStep, 
  RelationshipContext,
  MatchingCandidate
} from '../../types/dataQuality';
import { 
  normalizeArabicText, 
  normalizeName, 
  normalizePlate, 
  normalizePhone, 
  normalizeIdNumber 
} from './normalization';
import { computeArabicSimilarity, isOnlyAlifOrVowelDifference } from './fuzzyMatch';

export class DataQualityEngine {
  /**
   * Evaluates a single entity value (e.g. Carrier Name, Plate, Driver Name, Material)
   * through the 8-stage pipeline against a set of known master data candidates.
   */
  public static evaluateValue(
    sourceRawValue: string,
    candidates: MatchingCandidate[],
    entityType: 'CARRIER' | 'MATERIAL' | 'TRUCK' | 'DRIVER' = 'CARRIER',
    customContext?: Partial<RelationshipContext>
  ): MatchingResult {
    const startTime = performance.now();
    const trace: PipelineTraceStep[] = [];
    const reasons: string[] = [];
    const issueCodes: QualityIssueCode[] = [];

    // ================= STAGE 1: RAW VALUE =================
    const rawVal = sourceRawValue ? sourceRawValue.trim() : '';
    if (!rawVal) {
      trace.push({
        step: 'RAW_VALUE',
        nameAr: '1. القيمة الأولية (Raw Value)',
        status: 'FAILED',
        details: 'القيمة المدخلة فارغة تماماً',
      });
      return {
        sourceValue: rawVal,
        matchScore: 0,
        matchType: 'NO_MATCH',
        riskLevel: 'CRITICAL',
        reasons: ['القيمة المدخلة فارغة، لا يمكن معالجة سجل بدون بيانات أساسية.'],
        issueCodes: ['INVALID_PLATE_FORMAT'],
        pipelineTrace: trace,
        canAutoAccept: false,
        requiresConfirmation: false,
        requiresExplicitDecision: true,
        isBlocked: true,
        recommendedAction: 'BLOCK_AND_RESOLVE',
        explanationAr: 'القيمة مفقودة وتمنع الإدخال.',
      };
    }

    trace.push({
      step: 'RAW_VALUE',
      nameAr: '1. القيمة الأولية (Raw Value)',
      status: 'PASSED',
      details: `تم استلام القيمة الأولية: "${rawVal}" (${entityType})`,
    });

    // ================= STAGE 2: NORMALIZE =================
    let normalizedVal = '';
    switch (entityType) {
      case 'CARRIER':
      case 'DRIVER':
      case 'MATERIAL':
        normalizedVal = normalizeName(rawVal);
        break;
      case 'TRUCK':
        normalizedVal = normalizePlate(rawVal);
        break;
    }

    trace.push({
      step: 'NORMALIZE',
      nameAr: '2. المعايرة القياسية (Normalize)',
      status: 'PASSED',
      details: `تمت المعايرة مع الحفاظ على المعنى: "${normalizedVal}"`,
    });

    // ================= STAGE 3: EXACT MATCH =================
    let exactCandidate: MatchingCandidate | undefined;
    for (const c of candidates) {
      const cNorm = c.normalizedValue || normalizeName(c.value);
      if (cNorm === normalizedVal || c.value.trim().toLowerCase() === rawVal.toLowerCase()) {
        exactCandidate = c;
        break;
      }
    }

    if (exactCandidate) {
      trace.push({
        step: 'EXACT_MATCH',
        nameAr: '3. التطابق التام (Exact Match)',
        status: 'PASSED',
        details: `تطابق تام (100%) مع الكيان المعرف: "${exactCandidate.value}" [ID: ${exactCandidate.id}]`,
      });

      // Advance to stages 5-8 with EXACT
      return this.finalizeEvaluation({
        sourceValue: rawVal,
        candidateId: exactCandidate.id,
        candidateValue: exactCandidate.value,
        matchScore: 100,
        matchType: 'EXACT',
        riskLevel: 'LOW',
        reasons: ['تطابق تام وموثق مع قاعدة البيانات المرجعية.'],
        issueCodes: [],
        trace,
        entityType,
        customContext,
        candidateObj: exactCandidate,
      });
    }

    trace.push({
      step: 'EXACT_MATCH',
      nameAr: '3. التطابق التام (Exact Match)',
      status: 'WARNING',
      details: 'لا يوجد تطابق تام. الانتقال لمرحلة المطابقة التقريبية الذكية.',
    });

    // ================= STAGE 4: FUZZY MATCH =================
    let bestCandidate: MatchingCandidate | undefined;
    let highestScore = 0;
    let matchDetails = '';
    let isVowelAlifDiff = false;

    for (const c of candidates) {
      const sim = computeArabicSimilarity(rawVal, c.value);
      if (sim.score > highestScore) {
        highestScore = sim.score;
        bestCandidate = c;
        matchDetails = sim.details;
        isVowelAlifDiff = isOnlyAlifOrVowelDifference(normalizeName(rawVal), normalizeName(c.value));
      }
    }

    let matchType: MatchType = 'NO_MATCH';
    if (highestScore >= 65 && bestCandidate) {
      matchType = 'FUZZY';
      trace.push({
        step: 'FUZZY_MATCH',
        nameAr: '4. المطابقة التقريبية (Fuzzy Match)',
        status: 'WARNING',
        details: `عُثر على تطابق مقترح (Possible Match) بنسبة ${highestScore}% مع "${bestCandidate.value}". ${matchDetails}`,
      });

      if (isVowelAlifDiff) {
        reasons.push(
          `فارق في حرف المد أو الألف بين "${rawVal}" و "${bestCandidate.value}". النظام يمنع الدمج التلقائي (Auto-Merge) لاحتمالية اختلاف العائلة أو الكيان.`
        );
        issueCodes.push('FUZZY_SIMILARITY_WARNING');
      } else {
        reasons.push(`تشابه لغوي بنسبة ${highestScore}% مع "${bestCandidate.value}".`);
      }
    } else {
      trace.push({
        step: 'FUZZY_MATCH',
        nameAr: '4. المطابقة التقريبية (Fuzzy Match)',
        status: 'FAILED',
        details: `لم يتم العثور على أي كيان مشابه (أعلى نسبة: ${highestScore}%). الكيان جديد أو غير مسجل.`,
      });
      reasons.push('لا يوجد أي كيان مسجل يطابق أو يقارب القيمة المدخلة.');
    }

    return this.finalizeEvaluation({
      sourceValue: rawVal,
      candidateId: bestCandidate?.id,
      candidateValue: bestCandidate?.value,
      matchScore: highestScore,
      matchType,
      riskLevel: matchType === 'NO_MATCH' ? 'HIGH' : (highestScore >= 90 && !isVowelAlifDiff ? 'LOW' : 'MEDIUM'),
      reasons,
      issueCodes,
      trace,
      entityType,
      customContext,
      candidateObj: bestCandidate,
      isVowelAlifDiff,
    });
  }

  /**
   * Evaluates relationship and business constraints, computes final risk score, and determines human review rules.
   */
  private static finalizeEvaluation(params: {
    sourceValue: string;
    candidateId?: string;
    candidateValue?: string;
    matchScore: number;
    matchType: MatchType;
    riskLevel: RiskLevel;
    reasons: string[];
    issueCodes: QualityIssueCode[];
    trace: PipelineTraceStep[];
    entityType: 'CARRIER' | 'MATERIAL' | 'TRUCK' | 'DRIVER';
    customContext?: Partial<RelationshipContext>;
    candidateObj?: MatchingCandidate;
    isVowelAlifDiff?: boolean;
  }): MatchingResult {
    const { 
      sourceValue, candidateId, candidateValue, matchScore, 
      matchType, reasons, issueCodes, trace, entityType, 
      customContext, candidateObj, isVowelAlifDiff 
    } = params;

    let computedRisk: RiskLevel = params.riskLevel;

    // ================= STAGE 5: RELATIONSHIP VALIDATION =================
    let relStatus: 'PASSED' | 'WARNING' | 'FAILED' = 'PASSED';
    const relDetails: string[] = [];

    if (customContext) {
      // 1. CARRIER_NOT_ALLOWED
      if (entityType === 'CARRIER' && candidateId && customContext.authorizedCarrierIds) {
        if (!customContext.authorizedCarrierIds.includes(candidateId)) {
          computedRisk = 'CRITICAL';
          issueCodes.push('CARRIER_NOT_ALLOWED');
          reasons.push(`الناقل [${candidateValue || candidateId}] غير معتمد أو غير مصرح له في نطاق هذا المشروع.`);
          relDetails.push('الناقل غير مصرح في المشروع (CARRIER_NOT_ALLOWED)');
          relStatus = 'FAILED';
        }
      }

      // 2. MATERIAL_NOT_ALLOWED
      if (entityType === 'MATERIAL' && candidateId && customContext.authorizedMaterialIds) {
        if (!customContext.authorizedMaterialIds.includes(candidateId)) {
          computedRisk = 'CRITICAL';
          issueCodes.push('MATERIAL_NOT_ALLOWED');
          reasons.push(`المادة [${candidateValue || candidateId}] غير مسموح بنقلها أو غير معتمدة في هذا المشروع.`);
          relDetails.push('المادة غير مسموحة في المشروع (MATERIAL_NOT_ALLOWED)');
          relStatus = 'FAILED';
        }
      }

      // 3. CARRIER_TRUCK_CONFLICT: truck belongs to Carrier A, but context claims Carrier B
      if (entityType === 'TRUCK' && candidateObj?.metadata?.carrierId && customContext.knownCarriers) {
        const expectedCarrierId = candidateObj.metadata.carrierId;
        const providedCarrierId = (customContext as any).claimedCarrierId;
        if (providedCarrierId && providedCarrierId !== expectedCarrierId) {
          computedRisk = 'CRITICAL';
          issueCodes.push('CARRIER_TRUCK_CONFLICT');
          const expCarrier = customContext.knownCarriers.find(c => c.carrierId === expectedCarrierId)?.name || expectedCarrierId;
          const provCarrier = customContext.knownCarriers.find(c => c.carrierId === providedCarrierId)?.name || providedCarrierId;
          reasons.push(
            `تعارض في ملكية الشاحنة: الشاحنة [${sourceValue}] مقيدة رسمياً للناقل (${expCarrier})، بينما الإدخال يشير إلى الناقل (${provCarrier}). النظام يمنع التعديل التلقائي للعلاقة.`
          );
          relDetails.push('تعارض تبعية الشاحنة للناقل (CARRIER_TRUCK_CONFLICT)');
          relStatus = 'FAILED';
        }
      }

      // 4. DRIVER_CARRIER_CONFLICT: driver is not linked to the designated carrier
      if (entityType === 'DRIVER' && candidateObj?.metadata?.carrierId && customContext.knownCarriers) {
        const expectedCarrierId = candidateObj.metadata.carrierId;
        const providedCarrierId = (customContext as any).claimedCarrierId;
        if (providedCarrierId && providedCarrierId !== expectedCarrierId) {
          computedRisk = 'CRITICAL';
          issueCodes.push('DRIVER_CARRIER_CONFLICT');
          const expCarrier = customContext.knownCarriers.find(c => c.carrierId === expectedCarrierId)?.name || expectedCarrierId;
          const provCarrier = customContext.knownCarriers.find(c => c.carrierId === providedCarrierId)?.name || providedCarrierId;
          reasons.push(
            `تعارض السائق مع الناقل: السائق [${sourceValue}] مسجل تحت كفالة/تشغيل الناقل (${expCarrier}) وليس الناقل (${provCarrier}).`
          );
          relDetails.push('تعارض تبعية السائق للناقل (DRIVER_CARRIER_CONFLICT)');
          relStatus = 'FAILED';
        }
      }
    }

    trace.push({
      step: 'RELATIONSHIP_VALIDATION',
      nameAr: '5. التحقق من العلاقات (Relationship Validation)',
      status: relStatus,
      details: relDetails.length > 0 ? relDetails.join(' | ') : 'العلاقات والتبعيات والارتباطات التنظيمية صحيحة ومطابقة.',
    });

    // ================= STAGE 6: BUSINESS VALIDATION =================
    let bizStatus: 'PASSED' | 'WARNING' | 'FAILED' = 'PASSED';
    const bizDetails: string[] = [];

    if (entityType === 'TRUCK') {
      const normPlate = normalizePlate(sourceValue);
      const digitsOnly = normPlate.replace(/[^0-9]/g, '');
      if (digitsOnly.length < 1 || digitsOnly.length > 4) {
        issueCodes.push('INVALID_PLATE_FORMAT');
        reasons.push('صيغة لوحة المركبة السعودية غير نظامية (يجب أن تحوي من 1 إلى 4 أرقام وأحرف عربية معتمدة).');
        bizDetails.push('خطأ في صيغة اللوحة (INVALID_PLATE_FORMAT)');
        bizStatus = 'WARNING';
        if (computedRisk !== 'CRITICAL') computedRisk = 'HIGH';
      }
    }

    if (entityType === 'DRIVER') {
      const phone = (customContext as any)?.claimedPhone;
      if (phone) {
        const normPhone = normalizePhone(phone);
        if (!normPhone.startsWith('05') && !normPhone.startsWith('+9665')) {
          issueCodes.push('INVALID_PHONE_FORMAT');
          reasons.push('رقم الجوال غير مطابق للنمط السعودي (+9665xxxxxxx أو 05xxxxxxx).');
          bizDetails.push('صيغة هاتف غير معتمدة');
          bizStatus = 'WARNING';
          if (computedRisk === 'LOW') computedRisk = 'MEDIUM';
        }
      }
    }

    trace.push({
      step: 'BUSINESS_VALIDATION',
      nameAr: '6. التحقق من قواعد الأعمال (Business Validation)',
      status: bizStatus,
      details: bizDetails.length > 0 ? bizDetails.join(' | ') : 'اجتاز جميع قواعد وتراخيص وهيئة النقل العامة.',
    });

    // ================= STAGE 7: RISK SCORE =================
    // Strict Saudi Logistics Risk Matrix
    if (
      issueCodes.includes('CARRIER_TRUCK_CONFLICT') || 
      issueCodes.includes('MATERIAL_NOT_ALLOWED') || 
      issueCodes.includes('CARRIER_NOT_ALLOWED') || 
      issueCodes.includes('DRIVER_CARRIER_CONFLICT')
    ) {
      computedRisk = 'CRITICAL';
    } else if (matchType === 'NO_MATCH' || issueCodes.includes('INVALID_PLATE_FORMAT')) {
      computedRisk = 'HIGH';
    } else if (matchType === 'FUZZY' || isVowelAlifDiff) {
      // "الفازي" vs "الفزي" should produce Possible Match and NOT Auto-Merge (requires confirmation)
      computedRisk = 'MEDIUM';
    } else if (matchType === 'EXACT') {
      computedRisk = 'LOW';
    }

    trace.push({
      step: 'RISK_SCORE',
      nameAr: '7. احتساب مستوى المخاطر (Risk Score)',
      status: computedRisk === 'LOW' ? 'PASSED' : computedRisk === 'MEDIUM' ? 'WARNING' : 'FAILED',
      details: `تم تصنيف مستوى المخاطرة كـ [${computedRisk}] بناءً على نوع المطابقة (${matchType}) والتعارضات المرصودة.`,
    });

    // ================= STAGE 8: HUMAN REVIEW =================
    const canAutoAccept = computedRisk === 'LOW';
    const requiresConfirmation = computedRisk === 'MEDIUM';
    const requiresExplicitDecision = computedRisk === 'HIGH';
    const isBlocked = computedRisk === 'CRITICAL';

    let recommendedAction: 'AUTO_ACCEPT' | 'REQUIRE_CONFIRMATION' | 'MANUAL_REVIEW' | 'BLOCK_AND_RESOLVE';
    let explanationAr = '';

    switch (computedRisk) {
      case 'LOW':
        recommendedAction = 'AUTO_ACCEPT';
        explanationAr = 'يمكن اعتماد القيمة المقترحة تلقائياً لأمان المعطيات ومطابقتها المرجعية التامة.';
        break;
      case 'MEDIUM':
        recommendedAction = 'REQUIRE_CONFIRMATION';
        explanationAr = 'يوجد تطابق تقريبي محتمل (Possible Match). يتطلب إشعار المستخدم والتأكيد اليدوي لمنع الدمج الخاطئ.';
        break;
      case 'HIGH':
        recommendedAction = 'MANUAL_REVIEW';
        explanationAr = 'بيانات جديدة أو غير مؤكدة. لا يتم الاعتماد تلقائياً ويلزم اتخاذ قرار بشري صريح.';
        break;
      case 'CRITICAL':
        recommendedAction = 'BLOCK_AND_RESOLVE';
        explanationAr = 'تعارض حرج في العلاقات أو الصلاحيات. يمنع الإدخال أو الاستيراد نهائياً حتى تتم المعالجة والتصحيح.';
        break;
    }

    trace.push({
      step: 'HUMAN_REVIEW',
      nameAr: '8. قرار المراجعة البشرية (Human Review)',
      status: isBlocked ? 'FAILED' : requiresConfirmation || requiresExplicitDecision ? 'WARNING' : 'PASSED',
      details: explanationAr,
    });

    return {
      sourceValue,
      candidateId,
      candidateValue,
      matchScore,
      matchType,
      riskLevel: computedRisk,
      reasons,
      issueCodes,
      pipelineTrace: trace,
      canAutoAccept,
      requiresConfirmation,
      requiresExplicitDecision,
      isBlocked,
      recommendedAction,
      explanationAr,
    };
  }

  /**
   * Validates a complete Import Trip Row with multiple relational dependencies:
   * Carrier, Truck, Driver, Material inside a Project scope.
   */
  public static validateImportRecord(
    row: {
      rowId: string;
      rawCarrierName?: string;
      rawPlate?: string;
      claimedCarrierId?: string;
      rawDriverName?: string;
      claimedPhone?: string;
      rawMaterialName?: string;
      tareKg?: number;
      grossKg?: number;
    },
    context: RelationshipContext
  ): {
    carrierResult?: MatchingResult;
    truckResult?: MatchingResult;
    driverResult?: MatchingResult;
    materialResult?: MatchingResult;
    overallRisk: RiskLevel;
    hasBlockingIssue: boolean;
    summaryIssues: string[];
  } {
    const summaryIssues: string[] = [];

    // Format carrier candidates
    const carrierCandidates: MatchingCandidate[] = context.knownCarriers.map(c => ({
      id: c.carrierId,
      value: c.name,
      normalizedValue: normalizeName(c.name),
      entityType: 'CARRIER',
      metadata: { status: c.status },
    }));

    // Format truck candidates
    const truckCandidates: MatchingCandidate[] = context.knownTrucks.map(t => ({
      id: t.truckId,
      value: t.plate,
      normalizedValue: normalizePlate(t.plate),
      entityType: 'TRUCK',
      metadata: { carrierId: t.carrierId, status: t.status },
    }));

    // Format driver candidates
    const driverCandidates: MatchingCandidate[] = context.knownDrivers.map(d => ({
      id: d.driverId,
      value: d.name,
      normalizedValue: normalizeName(d.name),
      entityType: 'DRIVER',
      metadata: { carrierId: d.carrierId, phone: d.phone, status: d.status },
    }));

    // Format material candidates
    const materialCandidates: MatchingCandidate[] = context.knownMaterials.map(m => ({
      id: m.materialId,
      value: m.name,
      normalizedValue: normalizeName(m.name),
      entityType: 'MATERIAL',
      metadata: { code: m.code, status: m.status },
    }));

    // 1. Evaluate Carrier
    let carrierResult: MatchingResult | undefined;
    if (row.rawCarrierName) {
      carrierResult = this.evaluateValue(row.rawCarrierName, carrierCandidates, 'CARRIER', context);
      summaryIssues.push(...carrierResult.reasons);
    }

    // Determine carrier to test truck/driver against
    const effectiveCarrierId = row.claimedCarrierId || carrierResult?.candidateId;

    // 2. Evaluate Truck
    let truckResult: MatchingResult | undefined;
    if (row.rawPlate) {
      truckResult = this.evaluateValue(
        row.rawPlate,
        truckCandidates,
        'TRUCK',
        {
          ...context,
          claimedCarrierId: effectiveCarrierId,
        } as any
      );
      summaryIssues.push(...truckResult.reasons);
    }

    // 3. Evaluate Driver
    let driverResult: MatchingResult | undefined;
    if (row.rawDriverName) {
      driverResult = this.evaluateValue(
        row.rawDriverName,
        driverCandidates,
        'DRIVER',
        {
          ...context,
          claimedCarrierId: effectiveCarrierId,
          claimedPhone: row.claimedPhone,
        } as any
      );
      summaryIssues.push(...driverResult.reasons);
    }

    // 4. Evaluate Material
    let materialResult: MatchingResult | undefined;
    if (row.rawMaterialName) {
      materialResult = this.evaluateValue(row.rawMaterialName, materialCandidates, 'MATERIAL', context);
      summaryIssues.push(...materialResult.reasons);
    }

    // Check legal payload
    if (row.tareKg && row.grossKg && row.tareKg >= row.grossKg) {
      summaryIssues.push('الوزن الفارغ للشاحنة أكبر من أو يساوي الوزن الإجمالي، وهذا مخالف هندسياً.');
    }

    // Determine overall risk
    const risks: RiskLevel[] = [
      carrierResult?.riskLevel || 'LOW',
      truckResult?.riskLevel || 'LOW',
      driverResult?.riskLevel || 'LOW',
      materialResult?.riskLevel || 'LOW',
    ];

    let overallRisk: RiskLevel = 'LOW';
    if (risks.includes('CRITICAL')) {
      overallRisk = 'CRITICAL';
    } else if (risks.includes('HIGH')) {
      overallRisk = 'HIGH';
    } else if (risks.includes('MEDIUM')) {
      overallRisk = 'MEDIUM';
    }

    const hasBlockingIssue = overallRisk === 'CRITICAL';

    return {
      carrierResult,
      truckResult,
      driverResult,
      materialResult,
      overallRisk,
      hasBlockingIssue,
      summaryIssues: Array.from(new Set(summaryIssues)),
    };
  }
}
