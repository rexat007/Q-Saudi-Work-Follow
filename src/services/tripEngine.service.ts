/**
 * Trip Engine Service
 * Authoritative business rules, validation, weight logic, and server-side settlement.
 */

import { 
  TripRecord, 
  CreateTripParams, 
  DestinationReceiptParams, 
  TripValidationReport,
  RuleValidationResult,
  TripPricingSnapshot,
  TripEngineStatus,
  TripActorRole,
  TransitionContext,
  TransitionPayload,
  TripLifecycleEvent,
  TripAuditLog
} from '../types/tripEngine';
import { SAMPLE_QUALITY_CONTEXT } from '../data/sampleQualityData';
import { tripStateMachine, STATE_TRANSITIONS } from './tripStateMachine.service';

// Initial Mock/In-Memory trips database populated with realistic high-fidelity Saudi logistics data
const INITIAL_TRIP_SEED: TripRecord[] = [
  {
    tripId: 'TRP-2026-00891',
    projectId: 'PRJ-NEOM-001',
    tripSerial: 'TRP-NEOM-8891',
    ticketId: 'WB-TKT-99101',
    truckId: 'TRK-9901',
    driverId: 'DRV-101',
    carrierId: 'CAR-ALMAJDOUIE',
    materialId: 'MAT-AGG-01',
    shiftDate: '2026-09-09',
    tareWeight: 14200,
    grossWeight: 45600,
    netWeight: 31400, // 45600 - 14200
    destNetWeight: 31250, // Unloaded at site
    varianceWeight: -150, // 31250 - 31400 = -150 kg shrinkage
    pricingRuleId: 'PRC-NEOM-AGG-TON',
    pricingType: 'PER_TON',
    agreedRate: 48.5,
    currency: 'SAR',
    settlementBase: 31.4, // 31.400 Tons
    settlementAmount: 1522.9, // 31.4 * 48.5
    loaderId: 'OPR-SCALE-01',
    unloaderId: 'ENG-SITE-04',
    status: 'COMPLETED',
    version: 2,
    loadTime: '2026-09-09T08:30:00.000Z',
    arrivalTime: '2026-09-09T11:15:00.000Z',
    unloadTime: '2026-09-09T11:45:00.000Z',
    notes: 'تمت مطابقة الموازين واعتماد الفارق المسموح (-0.48%)',
    createdAt: '2026-09-09T08:15:00.000Z',
    createdBy: 'USR-DISPATCHER-01',
    updatedAt: '2026-09-09T11:50:00.000Z',
    updatedBy: 'USR-AUDITOR-01',
    pricingSnapshot: {
      pricingRuleId: 'PRC-NEOM-AGG-TON',
      pricingType: 'PER_TON',
      agreedRate: 48.5,
      currency: 'SAR',
      settlementBase: 31.4,
      settlementAmount: 1522.9,
      ruleName: 'تسعيرة ركام بازلتي - نيوم بالطن',
      pricingSnapshotAt: '2026-09-09T08:15:00.000Z',
      effectiveFrom: '2026-01-01',
      effectiveTo: '2026-12-31'
    },
    entitySnapshots: {
      carrier: { carrierId: 'CAR-ALMAJDOUIE', companyNameAr: 'شركة المجدوعي اللوجستية' },
      truck: { truckId: 'TRK-9901', plateNumberAr: 'أ ب ج 1234', truckType: 'TIPPER_32M3', tareWeightKg: 14200 },
      driver: { driverId: 'DRV-101', fullNameAr: 'خالد عبدالله الشمري', idNumber: '1098765432', phone: '0501234567' },
      material: { materialId: 'MAT-AGG-01', nameAr: 'ركام بازلتي مقاس 20 ملم', code: 'AGG-20MM', unitOfMeasure: 'TON' }
    }
  },
  {
    tripId: 'TRP-2026-00892',
    projectId: 'PRJ-NEOM-001',
    tripSerial: 'TRP-NEOM-8892',
    ticketId: 'WB-TKT-99102',
    truckId: 'TRK-9902',
    driverId: 'DRV-102',
    carrierId: 'CAR-BINLADIN',
    materialId: 'MAT-SND-01',
    shiftDate: '2026-09-09',
    tareWeight: 13800,
    grossWeight: 44300,
    netWeight: 30500, // 44300 - 13800
    destNetWeight: null, // Still in transit!
    varianceWeight: null, // null until destNetWeight exists
    pricingRuleId: 'PRC-NEOM-SND-TRIP',
    pricingType: 'PER_TRIP',
    agreedRate: 1400.0,
    currency: 'SAR',
    settlementBase: 1, // 1 Trip
    settlementAmount: 1400.0,
    loaderId: 'OPR-SCALE-02',
    unloaderId: null,
    status: 'IN_TRANSIT',
    version: 1,
    loadTime: '2026-09-09T14:10:00.000Z',
    arrivalTime: null,
    unloadTime: null,
    notes: 'شحنة رمل ناعم قيد التوصيل إلى قطاع الميناء',
    createdAt: '2026-09-09T14:00:00.000Z',
    createdBy: 'USR-DISPATCHER-02',
    updatedAt: '2026-09-09T14:15:00.000Z',
    updatedBy: 'USR-DISPATCHER-02',
    pricingSnapshot: {
      pricingRuleId: 'PRC-NEOM-SND-TRIP',
      pricingType: 'PER_TRIP',
      agreedRate: 1400.0,
      currency: 'SAR',
      settlementBase: 1,
      settlementAmount: 1400.0,
      ruleName: 'مقطوعية نقل رمل ردميات بالرد',
      pricingSnapshotAt: '2026-09-09T14:00:00.000Z',
      effectiveFrom: '2026-01-01',
      effectiveTo: '2026-12-31'
    },
    entitySnapshots: {
      carrier: { carrierId: 'CAR-BINLADIN', companyNameAr: 'مجموعة بن لادن للنقل' },
      truck: { truckId: 'TRK-9902', plateNumberAr: 'د هـ و 5678', truckType: 'TRAILER_24M', tareWeightKg: 13800 },
      driver: { driverId: 'DRV-102', fullNameAr: 'محمد إبراهيم الزهراني', idNumber: '1012345678', phone: '0559876543' },
      material: { materialId: 'MAT-SND-01', nameAr: 'رمل أحمر ردميات ناعم', code: 'SND-RED-01', unitOfMeasure: 'TRIP' }
    }
  },
  {
    tripId: 'TRP-2026-00893',
    projectId: 'PRJ-NEOM-001',
    tripSerial: 'TRP-NEOM-8893',
    ticketId: 'WB-TKT-99103',
    truckId: 'TRK-9901',
    driverId: 'DRV-101',
    carrierId: 'CAR-ALMAJDOUIE',
    materialId: 'MAT-AGG-01',
    shiftDate: '2026-09-09',
    tareWeight: 14100,
    grossWeight: 46200,
    netWeight: 32100,
    destNetWeight: null, // Still unloading! Must be provided before COMPLETED
    varianceWeight: null,
    pricingRuleId: 'PRC-NEOM-AGG-TON',
    pricingType: 'PER_TON',
    agreedRate: 48.5,
    currency: 'SAR',
    settlementBase: 32.1,
    settlementAmount: 1556.85,
    loaderId: 'OPR-SCALE-01',
    unloaderId: 'ENG-SITE-04',
    status: 'UNLOADING',
    version: 3,
    loadTime: '2026-09-09T09:00:00.000Z',
    arrivalTime: '2026-09-09T12:00:00.000Z',
    unloadTime: null,
    notes: 'الشاحنة في منصة التفريغ رقم 2 بانتظار استكمال الوزن النهائي واحتساب التفاوت',
    createdAt: '2026-09-09T08:45:00.000Z',
    createdBy: 'USR-DISPATCHER-01',
    updatedAt: '2026-09-09T12:05:00.000Z',
    updatedBy: 'ENG-SITE-04',
    pricingSnapshot: {
      pricingRuleId: 'PRC-NEOM-AGG-TON',
      pricingType: 'PER_TON',
      agreedRate: 48.5,
      currency: 'SAR',
      settlementBase: 32.1,
      settlementAmount: 1556.85,
      ruleName: 'تسعيرة ركام بازلتي - نيوم بالطن',
      pricingSnapshotAt: '2026-09-09T08:45:00.000Z',
      effectiveFrom: '2026-01-01',
      effectiveTo: '2026-12-31'
    }
  },
  {
    tripId: 'TRP-2026-00894',
    projectId: 'PRJ-NEOM-001',
    tripSerial: 'TRP-NEOM-8894',
    ticketId: 'WB-TKT-99104',
    truckId: 'TRK-9903',
    driverId: 'DRV-103',
    carrierId: 'CAR-ALMAJDOUIE',
    materialId: 'MAT-AGG-01',
    shiftDate: '2026-09-09',
    tareWeight: 14500,
    grossWeight: 45000,
    netWeight: 30500,
    destNetWeight: null,
    varianceWeight: null,
    pricingRuleId: 'PRC-NEOM-AGG-TON',
    pricingType: 'PER_TON',
    agreedRate: 48.5,
    currency: 'SAR',
    settlementBase: 30.5,
    settlementAmount: 1479.25,
    loaderId: 'OPR-SCALE-01',
    unloaderId: null,
    status: 'LOADED',
    version: 1,
    loadTime: '2026-09-09T13:30:00.000Z',
    arrivalTime: null,
    unloadTime: null,
    notes: 'تم وزن القائم والفارغ بنجاح وجاهزة لأمر الانطلاق والترحيل (IN_TRANSIT)',
    createdAt: '2026-09-09T13:15:00.000Z',
    createdBy: 'OPR-SCALE-01',
    updatedAt: '2026-09-09T13:30:00.000Z',
    updatedBy: 'OPR-SCALE-01',
    pricingSnapshot: {
      pricingRuleId: 'PRC-NEOM-AGG-TON',
      pricingType: 'PER_TON',
      agreedRate: 48.5,
      currency: 'SAR',
      settlementBase: 30.5,
      settlementAmount: 1479.25,
      ruleName: 'تسعيرة ركام بازلتي - نيوم بالطن',
      pricingSnapshotAt: '2026-09-09T13:15:00.000Z',
      effectiveFrom: '2026-01-01',
      effectiveTo: '2026-12-31'
    }
  },
  {
    tripId: 'TRP-2026-00895',
    projectId: 'PRJ-NEOM-001',
    tripSerial: 'TRP-NEOM-8895',
    ticketId: 'WB-TKT-99105',
    truckId: 'TRK-9902',
    driverId: 'DRV-102',
    carrierId: 'CAR-BINLADIN',
    materialId: 'MAT-SND-01',
    shiftDate: '2026-09-09',
    tareWeight: 13800,
    grossWeight: 0,
    netWeight: 0,
    destNetWeight: null,
    varianceWeight: null,
    pricingRuleId: 'PRC-NEOM-SND-TRIP',
    pricingType: 'PER_TRIP',
    agreedRate: 1400.0,
    currency: 'SAR',
    settlementBase: 1,
    settlementAmount: 1400.0,
    loaderId: null,
    unloaderId: null,
    status: 'DRAFT',
    version: 1,
    loadTime: null,
    arrivalTime: null,
    unloadTime: null,
    notes: 'مسودة أمر نقل مسجلة لم يتم تحميلها بعد بالموقع',
    createdAt: '2026-09-09T14:30:00.000Z',
    createdBy: 'USR-DISPATCHER-02',
    updatedAt: '2026-09-09T14:30:00.000Z',
    updatedBy: 'USR-DISPATCHER-02',
    pricingSnapshot: {
      pricingRuleId: 'PRC-NEOM-SND-TRIP',
      pricingType: 'PER_TRIP',
      agreedRate: 1400.0,
      currency: 'SAR',
      settlementBase: 1,
      settlementAmount: 1400.0,
      ruleName: 'مقطوعية نقل رمل ردميات بالرد',
      pricingSnapshotAt: '2026-09-09T14:30:00.000Z',
      effectiveFrom: '2026-01-01',
      effectiveTo: '2026-12-31'
    }
  },
  {
    tripId: 'TRP-2026-00896',
    projectId: 'PRJ-NEOM-001',
    tripSerial: 'TRP-NEOM-8896',
    ticketId: 'WB-TKT-99106',
    truckId: 'TRK-9901',
    driverId: 'DRV-101',
    carrierId: 'CAR-ALMAJDOUIE',
    materialId: 'MAT-AGG-01',
    shiftDate: '2026-09-09',
    tareWeight: 14200,
    grossWeight: 45200,
    netWeight: 31000,
    destNetWeight: null,
    varianceWeight: null,
    pricingRuleId: 'PRC-NEOM-AGG-TON',
    pricingType: 'PER_TON',
    agreedRate: 48.5,
    currency: 'SAR',
    settlementBase: 31.0,
    settlementAmount: 1503.5,
    loaderId: 'OPR-SCALE-01',
    unloaderId: null,
    status: 'ARRIVED',
    version: 2,
    loadTime: '2026-09-09T10:00:00.000Z',
    arrivalTime: '2026-09-09T13:45:00.000Z',
    unloadTime: null,
    notes: 'وصلت الشاحنة إلى البوابة الرئيسية لمشروع نيوم - بانتظار إذن الدخول للتفريغ',
    createdAt: '2026-09-09T09:45:00.000Z',
    createdBy: 'USR-DISPATCHER-01',
    updatedAt: '2026-09-09T13:45:00.000Z',
    updatedBy: 'DRV-101',
    pricingSnapshot: {
      pricingRuleId: 'PRC-NEOM-AGG-TON',
      pricingType: 'PER_TON',
      agreedRate: 48.5,
      currency: 'SAR',
      settlementBase: 31.0,
      settlementAmount: 1503.5,
      ruleName: 'تسعيرة ركام بازلتي - نيوم بالطن',
      pricingSnapshotAt: '2026-09-09T09:45:00.000Z',
      effectiveFrom: '2026-01-01',
      effectiveTo: '2026-12-31'
    }
  },
  {
    tripId: 'TRP-2026-00897',
    projectId: 'PRJ-NEOM-001',
    tripSerial: 'TRP-NEOM-8897',
    ticketId: 'WB-TKT-99107',
    truckId: 'TRK-9903',
    driverId: 'DRV-103',
    carrierId: 'CAR-ALMAJDOUIE',
    materialId: 'MAT-AGG-01',
    shiftDate: '2026-09-09',
    tareWeight: 14500,
    grossWeight: 44900,
    netWeight: 30400,
    destNetWeight: null,
    varianceWeight: null,
    pricingRuleId: 'PRC-NEOM-AGG-TON',
    pricingType: 'PER_TON',
    agreedRate: 48.5,
    currency: 'SAR',
    settlementBase: 30.4,
    settlementAmount: 1474.4,
    loaderId: 'OPR-SCALE-01',
    unloaderId: null,
    status: 'EXCEPTION',
    version: 3,
    loadTime: '2026-09-09T07:30:00.000Z',
    arrivalTime: null,
    unloadTime: null,
    notes: 'تسجيل استثناء: عطل في الإطار على الطريق السريع، تم إرسال فريق الصيانة',
    createdAt: '2026-09-09T07:15:00.000Z',
    createdBy: 'USR-DISPATCHER-01',
    updatedAt: '2026-09-09T09:10:00.000Z',
    updatedBy: 'DRV-103',
    pricingSnapshot: {
      pricingRuleId: 'PRC-NEOM-AGG-TON',
      pricingType: 'PER_TON',
      agreedRate: 48.5,
      currency: 'SAR',
      settlementBase: 30.4,
      settlementAmount: 1474.4,
      ruleName: 'تسعيرة ركام بازلتي - نيوم بالطن',
      pricingSnapshotAt: '2026-09-09T07:15:00.000Z',
      effectiveFrom: '2026-01-01',
      effectiveTo: '2026-12-31'
    }
  }
];

import { MasterPricingRule, MASTER_PRICING_RULES } from '../data/masterPricingRules';
export type { MasterPricingRule };
export { MASTER_PRICING_RULES };

class TripEngineService {
  private trips: TripRecord[] = [...INITIAL_TRIP_SEED];

  /**
   * Retrieves all trips for a given project or all projects.
   */
  getTrips(projectId?: string): TripRecord[] {
    if (projectId) {
      return this.trips.filter(t => t.projectId === projectId);
    }
    return [...this.trips];
  }

  getTripById(tripId: string): TripRecord | undefined {
    return this.trips.find(t => t.tripId === tripId);
  }

  /**
   * Evaluates the 6 Core Master Data Rules strictly against a prospective trip payload.
   */
  validateTripRules(params: CreateTripParams): TripValidationReport {
    const results: RuleValidationResult[] = [];
    const context = SAMPLE_QUALITY_CONTEXT;

    // RULE 1: truck يجب أن يكون تابعاً للمشروع
    const truck = context.knownTrucks.find(t => t.truckId === params.truckId);
    let rule1Passed = false;
    let rule1Msg = '';
    if (!truck) {
      rule1Msg = `الشاحنة (${params.truckId}) غير مسجلة بالنظام`;
    } else if (truck.status !== 'ACTIVE') {
      rule1Msg = `الشاحنة (${truck.plate}) حالتها معطلة (INACTIVE)`;
    } else if (!context.authorizedCarrierIds.includes(truck.carrierId)) {
      rule1Msg = `الشاحنة تتبع ناقل غير معتمد بالمشروع (${truck.carrierId})`;
    } else {
      rule1Passed = true;
      rule1Msg = `الشاحنة (${truck.plate}) معتمدة وتابعة لناقل مصرح بالمشروع`;
    }
    results.push({
      passed: rule1Passed,
      ruleCode: 'RULE_1_TRUCK_PROJECT',
      ruleDescriptionAr: 'truck يجب أن يكون تابعاً للمشروع',
      messageAr: rule1Msg,
      severity: rule1Passed ? 'SUCCESS' : 'CRITICAL'
    });

    // RULE 2: driver يجب أن يكون صالحاً
    const driver = context.knownDrivers.find(d => d.driverId === params.driverId);
    let rule2Passed = false;
    let rule2Msg = '';
    if (!driver) {
      rule2Msg = `السائق (${params.driverId}) غير مسجل بالنظام`;
    } else if (driver.status !== 'ACTIVE') {
      rule2Msg = `السائق (${driver.name}) حالته معطلة (INACTIVE)`;
    } else if (!driver.idNumber || driver.idNumber.length !== 10) {
      rule2Msg = `رقم هوية/إقامة السائق (${driver.name}) غير صالح`;
    } else {
      rule2Passed = true;
      rule2Msg = `السائق (${driver.name}) صالح ونشط وهوية رقم (${driver.idNumber})`;
    }
    results.push({
      passed: rule2Passed,
      ruleCode: 'RULE_2_DRIVER_VALID',
      ruleDescriptionAr: 'driver يجب أن يكون صالحاً ونشطاً',
      messageAr: rule2Msg,
      severity: rule2Passed ? 'SUCCESS' : 'CRITICAL'
    });

    // RULE 3: carrier يجب أن يكون تابعاً للمشروع
    const carrier = context.knownCarriers.find(c => c.carrierId === params.carrierId);
    let rule3Passed = false;
    let rule3Msg = '';
    if (!carrier) {
      rule3Msg = `الناقل (${params.carrierId}) غير مسجل في النظام`;
    } else if (carrier.status !== 'ACTIVE') {
      rule3Msg = `الناقل (${carrier.name}) حالته معطلة (INACTIVE)`;
    } else if (!context.authorizedCarrierIds.includes(params.carrierId)) {
      rule3Msg = `الناقل (${carrier.name}) ليس ضمن الناقلين المصرح لهم بالمشروع (${context.projectId})`;
    } else {
      rule3Passed = true;
      rule3Msg = `الناقل (${carrier.name}) مصرح له رسمياً بالمشروع`;
    }
    results.push({
      passed: rule3Passed,
      ruleCode: 'RULE_3_CARRIER_PROJECT',
      ruleDescriptionAr: 'carrier يجب أن يكون تابعاً ومصرحاً للمشروع',
      messageAr: rule3Msg,
      severity: rule3Passed ? 'SUCCESS' : 'CRITICAL'
    });

    // RULE 4: material يجب أن تكون مسموحة في المشروع
    const material = context.knownMaterials.find(m => m.materialId === params.materialId);
    let rule4Passed = false;
    let rule4Msg = '';
    if (!material) {
      rule4Msg = `المادة (${params.materialId}) غير مسجلة في النظام`;
    } else if (material.status !== 'ACTIVE') {
      rule4Msg = `المادة (${material.name}) معطلة (INACTIVE)`;
    } else if (!context.authorizedMaterialIds.includes(params.materialId)) {
      rule4Msg = `المادة (${material.name}) غير مسموحة للتوريد في هذا المشروع (${context.projectId})`;
    } else {
      rule4Passed = true;
      rule4Msg = `المادة (${material.name}) مصرح بتوريدها في نطاق المشروع`;
    }
    results.push({
      passed: rule4Passed,
      ruleCode: 'RULE_4_MATERIAL_PROJECT',
      ruleDescriptionAr: 'material يجب أن تكون مسموحة ومصرحة في المشروع',
      messageAr: rule4Msg,
      severity: rule4Passed ? 'SUCCESS' : 'CRITICAL'
    });

    // RULE 5: truck/carrier relationship يجب أن تكون صحيحة
    let rule5Passed = false;
    let rule5Msg = '';
    if (truck && truck.carrierId !== params.carrierId) {
      const actualCarrier = context.knownCarriers.find(c => c.carrierId === truck.carrierId)?.name || truck.carrierId;
      rule5Msg = `تعارض علاقة: الشاحنة (${truck.plate}) تتبع الناقل (${actualCarrier}) وليس الناقل المختار (${params.carrierId})`;
    } else if (driver && driver.carrierId !== params.carrierId) {
      const actualCarrier = context.knownCarriers.find(c => c.carrierId === driver.carrierId)?.name || driver.carrierId;
      rule5Msg = `تعارض علاقة: السائق (${driver.name}) يتبع كفالة الناقل (${actualCarrier}) وليس الناقل المختار (${params.carrierId})`;
    } else {
      rule5Passed = true;
      rule5Msg = `علاقة الشاحنة والسائق بالناقل صحيحة وموثقة كفالياً وتشغيلياً`;
    }
    results.push({
      passed: rule5Passed,
      ruleCode: 'RULE_5_TRUCK_CARRIER_RELATION',
      ruleDescriptionAr: 'truck/carrier relationship يجب أن تكون صحيحة',
      messageAr: rule5Msg,
      severity: rule5Passed ? 'SUCCESS' : 'CRITICAL'
    });

    // RULE 6: pricing rule يجب أن تكون صالحة في تاريخ الرحلة
    const pricingRule = MASTER_PRICING_RULES.find(p => p.pricingRuleId === params.pricingRuleId);
    let rule6Passed = false;
    let rule6Msg = '';
    if (!pricingRule) {
      rule6Msg = `قاعدة التسعير (${params.pricingRuleId}) غير موجودة بالنظام`;
    } else if (pricingRule.status !== 'ACTIVE') {
      rule6Msg = `قاعدة التسعير (${pricingRule.name}) معطلة (INACTIVE)`;
    } else if (params.shiftDate < pricingRule.effectiveFrom || params.shiftDate > pricingRule.effectiveTo) {
      rule6Msg = `قاعدة التسعير (${pricingRule.name}) غير صالحة في تاريخ الرحلة (${params.shiftDate}). نطاق الصلاحية: [${pricingRule.effectiveFrom} إلى ${pricingRule.effectiveTo}]`;
    } else {
      rule6Passed = true;
      rule6Msg = `قاعدة التسعير (${pricingRule.name}) نشطة وصالحة لتاريخ التشغيل (${params.shiftDate})`;
    }
    results.push({
      passed: rule6Passed,
      ruleCode: 'RULE_6_PRICING_RULE_VALID_DATE',
      ruleDescriptionAr: 'pricing rule يجب أن تكون صالحة في تاريخ الرحلة',
      messageAr: rule6Msg,
      severity: rule6Passed ? 'SUCCESS' : 'CRITICAL'
    });

    const isValid = results.every(r => r.passed);
    const blockingError = results.find(r => !r.passed)?.messageAr;

    return {
      isValid,
      results,
      blockingError
    };
  }

  /**
   * Dispatches and creates a new Trip adhering to all rules:
   * 1. Evaluates all 6 Master Data rules.
   * 2. Calculates netWeight = grossWeight - tareWeight server-side (strictly discards clientNetWeight).
   * 3. Sets destNetWeight = null and varianceWeight = null.
   * 4. Calculates settlementBase and settlementAmount server-side.
   * 5. Saves immutable pricing snapshot inside the trip.
   */
  createTrip(params: CreateTripParams): { trip: TripRecord; securityLog?: string } {
    // 1. Enforce the 6 Rules
    const validation = this.validateTripRules(params);
    if (!validation.isValid) {
      throw new Error(`تعذر إنشاء الرحلة لانتهاك قواعد التحقق المعمارية: ${validation.blockingError}`);
    }

    // 2. Weights: netWeight = grossWeight - tareWeight (Server-Side Authority)
    if (params.grossWeight <= params.tareWeight) {
      throw new Error(`الوزن القائم (${params.grossWeight} كجم) يجب أن يكون أكبر من وزن الفارغ (${params.tareWeight} كجم)`);
    }

    const calculatedNetWeight = params.grossWeight - params.tareWeight;
    let securityLog: string | undefined;

    // Rule: لا تقبل netWeight من client كمصدر موثوق
    if (params.clientNetWeight !== undefined && params.clientNetWeight !== calculatedNetWeight) {
      securityLog = `تنبيه أمني رقابي: تم رفض الوزن الصافي المرسل من العميل (${params.clientNetWeight} كجم) واعتماد الحساب الخادومي الصارم: (${params.grossWeight} - ${params.tareWeight} = ${calculatedNetWeight} كجم)`;
    }

    // 3. Rule: destNetWeight = null حتى عملية الاستلام
    const destNetWeight: number | null = null;

    // Rule: varianceWeight = null حتى وجود destNetWeight
    const varianceWeight: number | null = null;

    // 4. Pricing & Settlement: يحسب server-side فقط
    const pricingRule = MASTER_PRICING_RULES.find(p => p.pricingRuleId === params.pricingRuleId)!;
    const agreedRate = pricingRule.agreedRate;
    const currency = pricingRule.currency || 'SAR';
    const pricingType = pricingRule.pricingType;

    let settlementBase = 0;
    let settlementAmount = 0;

    if (pricingType === 'PER_TON') {
      // Settlement base is net weight in metric tons
      settlementBase = parseFloat((calculatedNetWeight / 1000).toFixed(3));
      settlementAmount = parseFloat((settlementBase * agreedRate).toFixed(2));
    } else {
      // PER_TRIP
      settlementBase = 1;
      settlementAmount = agreedRate;
    }

    // Snapshots
    const context = SAMPLE_QUALITY_CONTEXT;
    const carrier = context.knownCarriers.find(c => c.carrierId === params.carrierId);
    const truck = context.knownTrucks.find(t => t.truckId === params.truckId);
    const driver = context.knownDrivers.find(d => d.driverId === params.driverId);
    const material = context.knownMaterials.find(m => m.materialId === params.materialId);

    const nowIso = new Date().toISOString();
    const tripId = `TRP-${Date.now()}`;
    const tripSerial = `TRP-NEOM-${Math.floor(1000 + Math.random() * 9000)}`;
    const ticketId = params.ticketId || `WB-TKT-${Math.floor(100000 + Math.random() * 900000)}`;

    const pricingSnapshot: TripPricingSnapshot = {
      pricingRuleId: pricingRule.pricingRuleId,
      pricingType,
      agreedRate,
      currency,
      settlementBase,
      settlementAmount,
      ruleName: pricingRule.name,
      pricingSnapshotAt: nowIso,
      effectiveFrom: pricingRule.effectiveFrom,
      effectiveTo: pricingRule.effectiveTo
    };

    const newTrip: TripRecord = {
      tripId,
      projectId: params.projectId,
      tripSerial,
      ticketId,
      truckId: params.truckId,
      driverId: params.driverId,
      carrierId: params.carrierId,
      materialId: params.materialId,
      shiftDate: params.shiftDate,

      // Origin Weights
      tareWeight: params.tareWeight,
      grossWeight: params.grossWeight,
      netWeight: calculatedNetWeight, // Server computed

      // Destination Weights
      destNetWeight, // null
      varianceWeight, // null

      // Pricing & Settlement
      pricingRuleId: params.pricingRuleId,
      pricingType,
      agreedRate,
      currency,
      settlementBase,
      settlementAmount,

      loaderId: params.loaderId || 'SCALE-OP-01',
      unloaderId: null,

      status: 'IN_TRANSIT',
      version: 1,

      loadTime: nowIso,
      arrivalTime: null,
      unloadTime: null,

      notes: securityLog ? `${params.notes || ''} [${securityLog}]`.trim() : (params.notes || 'تم إنشاء الرحلة واحتساب الوزن والتسعير خادومياً'),
      createdAt: nowIso,
      createdBy: params.createdBy || 'USR-DISPATCHER',
      updatedAt: nowIso,
      updatedBy: params.createdBy || 'USR-DISPATCHER',

      pricingSnapshot,
      entitySnapshots: {
        carrier: carrier ? { carrierId: carrier.carrierId, companyNameAr: carrier.name } : undefined,
        truck: truck ? { truckId: truck.truckId, plateNumberAr: truck.plate, tareWeightKg: params.tareWeight } : undefined,
        driver: driver ? { driverId: driver.driverId, fullNameAr: driver.name, idNumber: driver.idNumber, phone: driver.phone } : undefined,
        material: material ? { materialId: material.materialId, nameAr: material.name, code: material.code } : undefined
      }
    };

    // Prepend to trips
    this.trips = [newTrip, ...this.trips];

    // Seed state machine events & audit log for this new trip
    try {
      const initEvent: TripLifecycleEvent = {
        eventId: `EVT-${Date.now()}-GEN`,
        tripId,
        action: 'TRIP_GENESIS_DISPATCH',
        fromStatus: 'LOADED',
        toStatus: 'IN_TRANSIT',
        actorId: params.createdBy || 'USR-DISPATCHER',
        actorRole: 'DISPATCHER',
        actorName: 'مرحل العمليات اللوجستية',
        projectId: params.projectId,
        timestamp: nowIso,
        reason: 'تم إنشاء أمر الرحلة واعتماد تسعير الرد والقواعد الستة',
        version: 1
      };
      const initAudit: TripAuditLog = {
        auditId: `AUD-${Date.now()}-GEN`,
        tripId,
        action: 'CREATE_AND_DISPATCH',
        fromStatus: 'LOADED',
        toStatus: 'IN_TRANSIT',
        actorId: params.createdBy || 'USR-DISPATCHER',
        actorRole: 'DISPATCHER',
        actorName: 'مرحل العمليات اللوجستية',
        projectId: params.projectId,
        versionBefore: 0,
        versionAfter: 1,
        timestamp: nowIso,
        details: `إنشاء الرحلة (${tripSerial}) بعد اجتياز فحص القواعد الستة واعتماد لقطة التسعير (${pricingSnapshot.ruleName}) واحتساب صافي الوزن (${calculatedNetWeight.toLocaleString()} كجم).`,
        diff: {
          status: { before: 'LOADED', after: 'IN_TRANSIT' },
          version: { before: 0, after: 1 }
        }
      };
      (tripStateMachine as any).events.set(tripId, [initEvent]);
      (tripStateMachine as any).auditLogs.set(tripId, [initAudit]);
    } catch {
      // Non-fatal fallback
    }

    return { trip: newTrip, securityLog };
  }

  /**
   * Loading Station Dedicated Workflow:
   * 1. createTrip() in LOADED state (version 1)
   * 2. createEvent(LOADED) -> SCALE_WEIGHT_CONFIRMED
   * 3. transition(IN_TRANSIT) -> validates pricing resolution and moves to IN_TRANSIT (version 2)
   * Enforces: لا تسمح بتعديل settlementAmount من الواجهة (server computed only).
   */
  createTripViaLoadingStation(
    params: CreateTripParams,
    actorContext?: { actorId?: string; actorRole?: TripActorRole; actorName?: string }
  ): {
    trip: TripRecord;
    loadedEvent: TripLifecycleEvent;
    transitEvent: TripLifecycleEvent;
    securityLog?: string;
  } {
    // 1. Enforce the 6 Master Data Rules
    const validation = this.validateTripRules(params);
    if (!validation.isValid) {
      throw new Error(`تعذر إنشاء واعتماد الشحنة بمحطة التحميل: ${validation.blockingError}`);
    }

    // 2. Weights Validation
    if (params.grossWeight <= params.tareWeight) {
      throw new Error(
        `الوزن القائم (${params.grossWeight.toLocaleString()} كجم) يجب أن يكون أكبر من وزن الفارغ (${params.tareWeight.toLocaleString()} كجم)`
      );
    }

    const calculatedNetWeight = params.grossWeight - params.tareWeight;
    let securityLog: string | undefined;

    // Rule: لا تسمح بتعديل settlementAmount أو netWeight من الواجهة
    if (params.clientNetWeight !== undefined && params.clientNetWeight !== calculatedNetWeight) {
      securityLog = `تنبيه أمني رقابي: تم حظر صافي الوزن المرسل من الواجهة (${params.clientNetWeight} كجم) واعتماد الحساب الخادومي الدقيق (${params.grossWeight} - ${params.tareWeight} = ${calculatedNetWeight} كجم)`;
    }

    // Pricing Rule Lookup
    const pricingRule = MASTER_PRICING_RULES.find(p => p.pricingRuleId === params.pricingRuleId);
    if (!pricingRule) {
      throw new Error(`قاعدة التسعير (${params.pricingRuleId}) غير موجودة بالنظام`);
    }

    const agreedRate = pricingRule.agreedRate;
    const currency = pricingRule.currency || 'SAR';
    const pricingType = pricingRule.pricingType;

    let settlementBase = 0;
    let settlementAmount = 0;

    if (pricingType === 'PER_TON') {
      settlementBase = parseFloat((calculatedNetWeight / 1000).toFixed(3));
      settlementAmount = parseFloat((settlementBase * agreedRate).toFixed(2));
    } else {
      settlementBase = 1;
      settlementAmount = agreedRate;
    }

    const nowIso = new Date().toISOString();
    const tripId = `TRP-${Date.now()}`;
    const tripSerial = `TRP-NEOM-${Math.floor(1000 + Math.random() * 9000)}`;
    const ticketId = params.ticketId || `WB-TKT-${Math.floor(100000 + Math.random() * 900000)}`;

    const context = SAMPLE_QUALITY_CONTEXT;
    const carrier = context.knownCarriers.find(c => c.carrierId === params.carrierId);
    const truck = context.knownTrucks.find(t => t.truckId === params.truckId);
    const driver = context.knownDrivers.find(d => d.driverId === params.driverId);
    const material = context.knownMaterials.find(m => m.materialId === params.materialId);

    const pricingSnapshot: TripPricingSnapshot = {
      pricingRuleId: pricingRule.pricingRuleId,
      pricingType,
      agreedRate,
      currency,
      settlementBase,
      settlementAmount,
      ruleName: pricingRule.name,
      pricingSnapshotAt: nowIso,
      effectiveFrom: pricingRule.effectiveFrom,
      effectiveTo: pricingRule.effectiveTo
    };

    // Step 1: createTrip in initial LOADED status
    const initialTrip: TripRecord = {
      tripId,
      projectId: params.projectId,
      tripSerial,
      ticketId,
      truckId: params.truckId,
      driverId: params.driverId,
      carrierId: params.carrierId,
      materialId: params.materialId,
      shiftDate: params.shiftDate,

      tareWeight: params.tareWeight,
      grossWeight: params.grossWeight,
      netWeight: calculatedNetWeight,

      destNetWeight: null,
      varianceWeight: null,

      pricingRuleId: params.pricingRuleId,
      pricingType,
      agreedRate,
      currency,
      settlementBase,
      settlementAmount,

      loaderId: params.loaderId || 'SCALE-OP-01',
      unloaderId: null,

      status: 'LOADED',
      version: 1,

      loadTime: nowIso,
      arrivalTime: null,
      unloadTime: null,

      notes: securityLog 
        ? `${params.notes || ''} [${securityLog}]`.trim() 
        : (params.notes || 'تم تأكيد الوزن والتحميل بمحطة الميزان المركزية'),
      createdAt: nowIso,
      createdBy: params.createdBy || 'SCALE-OP-01',
      updatedAt: nowIso,
      updatedBy: params.createdBy || 'SCALE-OP-01',

      pricingSnapshot,
      entitySnapshots: {
        carrier: carrier ? { carrierId: carrier.carrierId, companyNameAr: carrier.name } : undefined,
        truck: truck ? { truckId: truck.truckId, plateNumberAr: truck.plate, tareWeightKg: params.tareWeight } : undefined,
        driver: driver ? { driverId: driver.driverId, fullNameAr: driver.name, idNumber: driver.idNumber, phone: driver.phone } : undefined,
        material: material ? { materialId: material.materialId, nameAr: material.name, code: material.code } : undefined
      }
    };

    // Step 2: createEvent(LOADED)
    const loadedEvent: TripLifecycleEvent = {
      eventId: `EVT-${Date.now()}-LOADED`,
      tripId,
      action: 'SCALE_WEIGHT_CONFIRMED',
      fromStatus: 'DRAFT',
      toStatus: 'LOADED',
      actorId: actorContext?.actorId || 'SCALE-OP-01',
      actorRole: 'SCALE_OPERATOR',
      actorName: actorContext?.actorName || 'مشغل محطة التحميل والميزان',
      projectId: params.projectId,
      timestamp: nowIso,
      reason: `توثيق أوزان الميزان (فارغ: ${params.tareWeight.toLocaleString()} كجم، قائم: ${params.grossWeight.toLocaleString()} كجم، صافي: ${calculatedNetWeight.toLocaleString()} كجم) واعتماد تسعيرة (${pricingRule.name})`,
      payload: {
        tareWeight: params.tareWeight,
        grossWeight: params.grossWeight,
        netWeight: calculatedNetWeight,
        pricingRuleId: pricingRule.pricingRuleId
      },
      version: 1
    };

    const loadedAudit: TripAuditLog = {
      auditId: `AUD-${Date.now()}-LOADED`,
      tripId,
      action: 'SCALE_WEIGH_AND_LOAD',
      fromStatus: 'DRAFT',
      toStatus: 'LOADED',
      actorId: loadedEvent.actorId,
      actorRole: loadedEvent.actorRole,
      actorName: loadedEvent.actorName,
      projectId: params.projectId,
      versionBefore: 0,
      versionAfter: 1,
      timestamp: nowIso,
      details: `تم وزن وتحميل الشاحنة (${truck?.plate || params.truckId}) بصافي حمولة (${calculatedNetWeight.toLocaleString()} كجم). تسعيرة معتمدة: (${pricingRule.name} - ${agreedRate} ${currency} / ${pricingType === 'PER_TON' ? 'طن' : 'رد'}).`,
      diff: {
        status: { before: 'DRAFT', after: 'LOADED' },
        tareWeight: { before: 0, after: params.tareWeight },
        grossWeight: { before: 0, after: params.grossWeight },
        netWeight: { before: 0, after: calculatedNetWeight },
        version: { before: 0, after: 1 }
      }
    };

    tripStateMachine.addLifecycleEvent(loadedEvent);
    tripStateMachine.addAuditLog(loadedAudit);

    // Step 3: transition(IN_TRANSIT)
    const dispatchContext: TransitionContext = {
      actorId: actorContext?.actorId || 'DISPATCH-OP-01',
      actorRole: 'DISPATCHER',
      actorName: actorContext?.actorName || 'مرحل العمليات والترحيل',
      projectId: params.projectId,
      reason: 'ترحيل الشاحنة وانطلاقها من محطة التحميل بعد اعتماد قسيمة الوزن والتسعيرة',
      timestamp: new Date(Date.now() + 500).toISOString()
    };

    const transitionResult = tripStateMachine.transition(
      initialTrip,
      'IN_TRANSIT',
      dispatchContext,
      {
        tareWeight: params.tareWeight,
        grossWeight: params.grossWeight
      }
    );

    // Add final trip to service in-memory store
    this.trips = [transitionResult.updatedTrip, ...this.trips];

    return {
      trip: transitionResult.updatedTrip,
      loadedEvent,
      transitEvent: transitionResult.event,
      securityLog
    };
  }

  /**
   * Records destination receipt (Scale In/Out at Destination), computes destNetWeight and varianceWeight:
   * Rule: destNetWeight = null حتى عملية الاستلام.
   * Rule: varianceWeight = null حتى وجود destNetWeight.
   * When destNetWeight is provided, computes: varianceWeight = destNetWeight - netWeight.
   */
  recordDestinationReceipt(params: DestinationReceiptParams): TripRecord {
    const tripIndex = this.trips.findIndex(t => t.tripId === params.tripId);
    if (tripIndex === -1) {
      throw new Error(`الرحلة (${params.tripId}) غير موجودة في النظام`);
    }

    const trip = this.trips[tripIndex];

    // Compute destNetWeight server-side
    let calculatedDestNet: number;
    if (params.destGrossWeight !== undefined && params.destTareWeight !== undefined) {
      if (params.destGrossWeight <= params.destTareWeight) {
        throw new Error(`الوزن القائم في موقع الاستلام (${params.destGrossWeight}) يجب أن يكون أكبر من الفارغ (${params.destTareWeight})`);
      }
      calculatedDestNet = params.destGrossWeight - params.destTareWeight;
    } else if (params.destNetWeight !== undefined) {
      calculatedDestNet = params.destNetWeight;
    } else {
      throw new Error('يجب تزويد أوزان موقع الاستلام (الوزن القائم والفارغ أو الصافي المستلم)');
    }

    // Compute varianceWeight = destNetWeight - netWeight
    const calculatedVariance = calculatedDestNet - trip.netWeight;

    const unloaderId = params.unloaderId || 'REC-INSPECTOR-01';
    const unloadTime = params.unloadTime || new Date().toISOString();

    // Route through centralized State Machine to enforce invariants:
    // 1. validates current state
    // 2. validates role
    // 3. validates project
    // 4. validates required fields (destNetWeight, unloaderId, unloadTime)
    // 5. calculates and verifies variance
    // 6. creates event
    // 7. creates audit log
    // 8. increments version
    const context: TransitionContext = {
      actorId: unloaderId,
      actorRole: 'SITE_RECEIVER',
      actorName: 'مستلم ومفتش الموقع',
      projectId: trip.projectId,
      reason: params.notes || 'توثيق أوزان الوصول وإتمام تفريغ الشحنة واعتماد التفاوت'
    };

    const payload: TransitionPayload = {
      destGrossWeight: params.destGrossWeight,
      destTareWeight: params.destTareWeight,
      destNetWeight: calculatedDestNet,
      unloaderId,
      unloadTime,
      notes: params.notes
    };

    // If trip was IN_TRANSIT or ARRIVED, transition smoothly to UNLOADING then to COMPLETED
    if (trip.status === 'IN_TRANSIT') {
      tripStateMachine.transition(trip, 'ARRIVED', context, { arrivalTime: new Date().toISOString() });
      trip.status = 'ARRIVED';
    }
    if (trip.status === 'ARRIVED') {
      tripStateMachine.transition(trip, 'UNLOADING', context, { unloaderId });
      trip.status = 'UNLOADING';
    }

    const { updatedTrip } = tripStateMachine.transition(trip, 'COMPLETED', context, payload);
    this.trips[tripIndex] = updatedTrip;
    return updatedTrip;
  }

  /**
   * Executes a formal transition via the Centralized State Machine.
   * Client cannot mutate status directly; all transitions must invoke this method.
   */
  executeTransition(
    tripId: string,
    targetStatus: TripEngineStatus,
    context: TransitionContext,
    payload: TransitionPayload = {}
  ): { updatedTrip: TripRecord; event: TripLifecycleEvent; auditLog: TripAuditLog } {
    const tripIndex = this.trips.findIndex(t => t.tripId === tripId);
    if (tripIndex === -1) {
      throw new Error(`الرحلة (${tripId}) غير موجودة في النظام.`);
    }

    const currentTrip = this.trips[tripIndex];
    const result = tripStateMachine.transition(currentTrip, targetStatus, context, payload);
    this.trips[tripIndex] = result.updatedTrip;
    return result;
  }

  /**
   * Checks pre-flight feasibility of transition without applying changes.
   */
  checkTransition(
    tripId: string,
    targetStatus: TripEngineStatus,
    context: TransitionContext,
    payload: TransitionPayload = {}
  ) {
    const trip = this.getTripById(tripId);
    if (!trip) {
      return { canTransition: false, targetStatus, errors: [`الرحلة (${tripId}) غير موجودة`], warnings: [] };
    }
    return tripStateMachine.checkTransition(trip, targetStatus, context, payload);
  }

  /**
   * Guard: Prohibits direct client mutation of trip.status.
   */
  assertNoDirectStatusMutation(currentTrip: TripRecord, clientProposedTrip: Partial<TripRecord>): void {
    tripStateMachine.assertNoDirectStatusMutation(currentTrip, clientProposedTrip);
  }

  /**
   * Retrieves events and audit logs for a given trip.
   */
  getEvents(tripId: string): TripLifecycleEvent[] {
    return tripStateMachine.getEvents(tripId);
  }

  getAuditLogs(tripId: string): TripAuditLog[] {
    return tripStateMachine.getAuditLogs(tripId);
  }

  /**
   * Resets demo trips back to seed.
   */
  resetTrips(): void {
    this.trips = [...INITIAL_TRIP_SEED];
  }
}

export const tripEngineService = new TripEngineService();
