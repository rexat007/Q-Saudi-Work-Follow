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
  TripAuditLog,
  UnloadingSearchResult,
  UnloadingCompletionParams,
  UnloadingCompletionResult
} from '../types/tripEngine';
import { TripExceptionEntity } from '../types/entities';
import { SAMPLE_QUALITY_CONTEXT } from '../data/sampleQualityData';
import { tripStateMachine, STATE_TRANSITIONS } from './tripStateMachine.service';
import { exceptionEngine } from './exceptionEngine.service';

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
  },
  {
    tripId: 'TRP-2026-00898',
    projectId: 'PRJ-NEOM-001',
    tripSerial: 'TRP-NEOM-8898',
    ticketId: 'WB-TKT-99108',
    truckId: 'TRK-9902',
    driverId: 'DRV-102',
    carrierId: 'CAR-BINLADIN',
    materialId: 'MAT-SND-01',
    shiftDate: '2026-09-09',
    tareWeight: 13800,
    grossWeight: 44800,
    netWeight: 31000,
    destNetWeight: 30350,
    varianceWeight: -650, // Significant negative shrinkage > tolerance
    pricingRuleId: 'PRC-NEOM-SND-TRIP',
    pricingType: 'PER_TRIP',
    agreedRate: 1400.0,
    currency: 'SAR',
    settlementBase: 1,
    settlementAmount: 1400.0,
    loaderId: 'OPR-SCALE-02',
    unloaderId: 'ENG-SITE-04',
    status: 'COMPLETED',
    version: 4,
    loadTime: '2026-09-09T18:30:00.000Z', // Evening shift
    arrivalTime: '2026-09-09T21:15:00.000Z',
    unloadTime: '2026-09-09T21:50:00.000Z',
    notes: 'تم التفريغ في الوردية المسائية مع تسجيل فارق وزني تجاوز نسبة التسامح (-650 كجم)',
    createdAt: '2026-09-09T18:15:00.000Z',
    createdBy: 'USR-DISPATCHER-02',
    updatedAt: '2026-09-09T22:00:00.000Z',
    updatedBy: 'ENG-SITE-04',
    pricingSnapshot: {
      pricingRuleId: 'PRC-NEOM-SND-TRIP',
      pricingType: 'PER_TRIP',
      agreedRate: 1400.0,
      currency: 'SAR',
      settlementBase: 1,
      settlementAmount: 1400.0,
      ruleName: 'مقطوعية نقل رمل ردميات بالرد',
      pricingSnapshotAt: '2026-09-09T18:15:00.000Z',
      effectiveFrom: '2026-01-01',
      effectiveTo: '2026-12-31'
    }
  },
  {
    tripId: 'TRP-2026-00899',
    projectId: 'PRJ-NEOM-001',
    tripSerial: 'TRP-NEOM-8899',
    ticketId: 'WB-TKT-99109',
    truckId: 'TRK-9901',
    driverId: 'DRV-101',
    carrierId: 'CAR-ALMAJDOUIE',
    materialId: 'MAT-AGG-01',
    shiftDate: '2026-09-08',
    tareWeight: 14200,
    grossWeight: 45800,
    netWeight: 31600,
    destNetWeight: 0,
    varianceWeight: -31600,
    pricingRuleId: 'PRC-NEOM-AGG-TON',
    pricingType: 'PER_TON',
    agreedRate: 48.5,
    currency: 'SAR',
    settlementBase: 0,
    settlementAmount: 0,
    loaderId: 'OPR-SCALE-01',
    unloaderId: 'ENG-SITE-04',
    status: 'RETURNED', // Returned trip!
    version: 4,
    loadTime: '2026-09-08T11:00:00.000Z',
    arrivalTime: '2026-09-08T14:30:00.000Z',
    unloadTime: null,
    notes: 'تم إرجاع الشحنة بالكامل لعدم مطابقة مقاس الركام وتجاوز نسبة الرطوبة 8% المسموحة في كود البناء',
    createdAt: '2026-09-08T10:45:00.000Z',
    createdBy: 'USR-DISPATCHER-01',
    updatedAt: '2026-09-08T15:00:00.000Z',
    updatedBy: 'ENG-SITE-04',
    pricingSnapshot: {
      pricingRuleId: 'PRC-NEOM-AGG-TON',
      pricingType: 'PER_TON',
      agreedRate: 48.5,
      currency: 'SAR',
      settlementBase: 0,
      settlementAmount: 0, // Returned trips settle at 0 net
      ruleName: 'تسعيرة ركام بازلتي - نيوم بالطن',
      pricingSnapshotAt: '2026-09-08T10:45:00.000Z',
      effectiveFrom: '2026-01-01',
      effectiveTo: '2026-12-31'
    }
  },
  {
    tripId: 'TRP-2026-00900',
    projectId: 'PRJ-REDSEA-RESORT-02',
    tripSerial: 'TRP-RSR-9900',
    ticketId: 'WB-TKT-88001',
    truckId: 'TRK-9903',
    driverId: 'DRV-103',
    carrierId: 'CAR-ALMAJDOUIE',
    materialId: 'MAT-AGG-01',
    shiftDate: '2026-09-10',
    tareWeight: 14400,
    grossWeight: 46200,
    netWeight: 31800,
    destNetWeight: 31920,
    varianceWeight: 120, // +120 kg within tolerance
    pricingRuleId: 'PRC-REDSEA-AGG-TON',
    pricingType: 'PER_TON',
    agreedRate: 54.0,
    currency: 'SAR',
    settlementBase: 31.8,
    settlementAmount: 1717.2, // 31.8 * 54
    loaderId: 'OPR-SCALE-02',
    unloaderId: 'ENG-AUDITOR-01',
    status: 'COMPLETED',
    version: 3,
    loadTime: '2026-09-10T23:30:00.000Z', // Night shift
    arrivalTime: '2026-09-11T02:15:00.000Z',
    unloadTime: '2026-09-11T02:45:00.000Z',
    notes: 'توريد وردية ليلية لمشروع جزر البحر الأحمر - تم اعتماد الوزن وتصفية التذكرة',
    createdAt: '2026-09-10T23:15:00.000Z',
    createdBy: 'USR-SUPERVISOR-HQ',
    updatedAt: '2026-09-11T02:50:00.000Z',
    updatedBy: 'ENG-AUDITOR-01',
    pricingSnapshot: {
      pricingRuleId: 'PRC-REDSEA-AGG-TON',
      pricingType: 'PER_TON',
      agreedRate: 54.0,
      currency: 'SAR',
      settlementBase: 31.8,
      settlementAmount: 1717.2,
      ruleName: 'تسعيرة ركام - البحر الأحمر بالطن',
      pricingSnapshotAt: '2026-09-10T23:15:00.000Z',
      effectiveFrom: '2026-01-01',
      effectiveTo: '2026-12-31'
    }
  },
  {
    tripId: 'TRP-2026-00901',
    projectId: 'PRJ-REDSEA-RESORT-02',
    tripSerial: 'TRP-RSR-9901',
    ticketId: 'WB-TKT-88002',
    truckId: 'TRK-9902',
    driverId: 'DRV-102',
    carrierId: 'CAR-BINLADIN',
    materialId: 'MAT-SND-01',
    shiftDate: '2026-09-10',
    tareWeight: 13900,
    grossWeight: 44500,
    netWeight: 30600,
    destNetWeight: 30550,
    varianceWeight: -50,
    pricingRuleId: 'PRC-REDSEA-SND-TRIP',
    pricingType: 'PER_TRIP',
    agreedRate: 1650.0,
    currency: 'SAR',
    settlementBase: 1,
    settlementAmount: 1650.0,
    loaderId: 'OPR-SCALE-02',
    unloaderId: 'ENG-AUDITOR-01',
    status: 'COMPLETED',
    version: 3,
    loadTime: '2026-09-10T09:15:00.000Z', // Morning shift
    arrivalTime: '2026-09-10T12:30:00.000Z',
    unloadTime: '2026-09-10T13:00:00.000Z',
    notes: 'توريد ردميات بالرد المقطوع إلى منطقة المرسى السياحي',
    createdAt: '2026-09-10T09:00:00.000Z',
    createdBy: 'USR-SUPERVISOR-HQ',
    updatedAt: '2026-09-10T13:05:00.000Z',
    updatedBy: 'ENG-AUDITOR-01',
    pricingSnapshot: {
      pricingRuleId: 'PRC-REDSEA-SND-TRIP',
      pricingType: 'PER_TRIP',
      agreedRate: 1650.0,
      currency: 'SAR',
      settlementBase: 1,
      settlementAmount: 1650.0,
      ruleName: 'مقطوعية رمل ردميات - البحر الأحمر بالرد',
      pricingSnapshotAt: '2026-09-10T09:00:00.000Z',
      effectiveFrom: '2026-01-01',
      effectiveTo: '2026-12-31'
    }
  }
];

import { MasterPricingRule, MASTER_PRICING_RULES } from '../data/masterPricingRules';
export type { MasterPricingRule };
export { MASTER_PRICING_RULES };

let tripSequenceCounter = 1000;

export function generateUniqueTripId(): string {
  tripSequenceCounter += 1;
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `TRP-${Date.now()}-${tripSequenceCounter}-${rand}`;
}

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

  /**
   * Alias to retrieve all trips across projects
   */
  getAllTrips(): TripRecord[] {
    return this.getTrips();
  }

  getTripById(tripId: string): TripRecord | undefined {
    return this.trips.find(t => t.tripId === tripId);
  }

  /**
   * Removes a trip by ID (useful for unit tests cleanup).
   */
  removeTrip(tripId: string): void {
    this.trips = this.trips.filter(t => t.tripId !== tripId);
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
    const tripId = params.tripId || generateUniqueTripId();
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

    // Prepend or update in trips (guarantees no duplicate tripId)
    const existingIdx = this.trips.findIndex(t => t.tripId === newTrip.tripId);
    if (existingIdx !== -1) {
      this.trips[existingIdx] = newTrip;
    } else {
      this.trips = [newTrip, ...this.trips];
    }

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
    const tripId = params.tripId || generateUniqueTripId();
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

    // Add or update final trip to service in-memory store (guarantees no duplicate tripId)
    const existingIndex = this.trips.findIndex(t => t.tripId === transitionResult.updatedTrip.tripId);
    if (existingIndex !== -1) {
      this.trips[existingIndex] = transitionResult.updatedTrip;
    } else {
      this.trips = [transitionResult.updatedTrip, ...this.trips];
    }

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

  // =========================================================================
  // UNLOADING STATION WORKFLOW & GOVERNANCE METHODS
  // =========================================================================

  private exceptions: Map<string, TripExceptionEntity[]> = new Map();

  /**
   * Search for Unloading Station strictly adhering to required priority:
   * 1. Primary: tripSerial
   * 2. Then: ticketId
   * 3. Then: truckId
   * 
   * Strict Rule: لا تستخدم truckPlate وحده لتحديد الرحلة.
   * Outcomes:
   * - 0 => NOT_FOUND
   * - 1 => CONTINUE
   * - > 1 => AMBIGUOUS
   */
  searchTripForUnloading(rawQuery: string): UnloadingSearchResult {
    const q = (rawQuery || '').trim();
    if (!q) {
      return {
        status: 'NOT_FOUND',
        count: 0,
        messageAr: 'الرجاء إدخال معيار بحث للرحلة'
      };
    }

    const qLower = q.toLowerCase();

    // Check if user entered truck plate ONLY
    const isMatchingPlate = SAMPLE_QUALITY_CONTEXT.knownTrucks.some(
      t => t.plate.toLowerCase() === qLower || t.plate.replace(/\s+/g, '') === qLower.replace(/\s+/g, '')
    ) || this.trips.some(
      t => t.entitySnapshots?.truck?.plateNumberAr?.toLowerCase() === qLower ||
           t.entitySnapshots?.truck?.plateNumberAr?.replace(/\s+/g, '') === qLower.replace(/\s+/g, '')
    );

    // If query matches plate, BUT does NOT match any tripSerial, ticketId, or truckId:
    const matchesTripSerialCheck = this.trips.some(t => t.tripSerial.toLowerCase() === qLower);
    const matchesTicketIdCheck = this.trips.some(t => t.ticketId.toLowerCase() === qLower);
    const matchesTruckIdCheck = this.trips.some(t => t.truckId.toLowerCase() === qLower);

    if (isMatchingPlate && !matchesTripSerialCheck && !matchesTicketIdCheck && !matchesTruckIdCheck) {
      return {
        status: 'PLATE_ONLY_PROHIBITED',
        count: 0,
        messageAr: 'حظر رقابي: لا يُسمح باستخدام لوحة الشاحنة (truckPlate) وحدها لتحديد الرحلة منعاً للتداخل بين رحلات الشاحنة المتعددة عبر الورديات. يُرجى البحث برقم الرحلة (tripSerial) أو رقم التذكرة (ticketId) أو معرف الشاحنة (truckId).'
      };
    }

    // Step 1: Primary Search: tripSerial
    const matchByTripSerial = this.trips.filter(t => t.tripSerial.toLowerCase() === qLower);
    if (matchByTripSerial.length > 0) {
      if (matchByTripSerial.length === 1) {
        return {
          status: 'CONTINUE',
          matchedBy: 'tripSerial',
          trip: matchByTripSerial[0],
          count: 1,
          messageAr: `تم العثور على الرحلة بالبحث الأساسي (tripSerial: ${matchByTripSerial[0].tripSerial})`
        };
      } else {
        return {
          status: 'AMBIGUOUS',
          matchedBy: 'tripSerial',
          candidateTrips: matchByTripSerial,
          count: matchByTripSerial.length,
          messageAr: `تنبيه غامض (AMBIGUOUS): تم العثور على أكثر من رحلة (${matchByTripSerial.length}) مطابقة لنفس الرقم التسلسلي. يلزم تحديد الرحلة يدوياً لمنع الخطأ.`
        };
      }
    }

    // Step 2: Then: ticketId
    const matchByTicketId = this.trips.filter(t => t.ticketId.toLowerCase() === qLower);
    if (matchByTicketId.length > 0) {
      if (matchByTicketId.length === 1) {
        return {
          status: 'CONTINUE',
          matchedBy: 'ticketId',
          trip: matchByTicketId[0],
          count: 1,
          messageAr: `تم العثور على الرحلة برقم تذكرة الميزان (ticketId: ${matchByTicketId[0].ticketId})`
        };
      } else {
        return {
          status: 'AMBIGUOUS',
          matchedBy: 'ticketId',
          candidateTrips: matchByTicketId,
          count: matchByTicketId.length,
          messageAr: `تنبيه غامض (AMBIGUOUS): تم العثور على أكثر من رحلة (${matchByTicketId.length}) بنفس رقم التذكرة. يلزم تحديد الرحلة يدوياً.`
        };
      }
    }

    // Step 3: Then: truckId
    const matchByTruckId = this.trips.filter(t => t.truckId.toLowerCase() === qLower);
    if (matchByTruckId.length > 0) {
      if (matchByTruckId.length === 1) {
        return {
          status: 'CONTINUE',
          matchedBy: 'truckId',
          trip: matchByTruckId[0],
          count: 1,
          messageAr: `تم العثور على رحلة واحدة مطابقة لمعرف الشاحنة (truckId: ${matchByTruckId[0].truckId})`
        };
      } else {
        return {
          status: 'AMBIGUOUS',
          matchedBy: 'truckId',
          candidateTrips: matchByTruckId,
          count: matchByTruckId.length,
          messageAr: `تنبيه غامض (AMBIGUOUS): تم العثور على ${matchByTruckId.length} رحلات مرتبطة بالشاحنة (${q}). يُحظر التحديد التلقائي؛ الرجاء اختيار الرحلة المستهدفة أدناه.`
        };
      }
    }

    // Step 4: 0 => NOT_FOUND
    return {
      status: 'NOT_FOUND',
      count: 0,
      messageAr: `لم يتم العثور على أي رحلة مطابقة للمعايير (tripSerial: ${q} / ticketId / truckId)`
    };
  }

  /**
   * Unloading Station Step 1: Upon Arrival (عند الوصول)
   * IN_TRANSIT -> ARRIVED
   */
  processUnloadingArrival(
    tripId: string, 
    arrivalTime?: string, 
    actorContext?: { actorId?: string; actorName?: string; actorRole?: TripActorRole }
  ): { trip: TripRecord; event: TripLifecycleEvent; auditLog: TripAuditLog } {
    const tripIndex = this.trips.findIndex(t => t.tripId === tripId);
    if (tripIndex === -1) {
      throw new Error(`الرحلة (${tripId}) غير موجودة.`);
    }
    const currentTrip = this.trips[tripIndex];

    const context: TransitionContext = {
      actorId: actorContext?.actorId || 'GATE-SECURITY-01',
      actorRole: actorContext?.actorRole || 'SITE_RECEIVER',
      actorName: actorContext?.actorName || 'مراقب البوابة ومسؤول الوصول',
      projectId: currentTrip.projectId,
      reason: 'توثيق وصول الشاحنة إلى موقع الاستلام/التفريغ'
    };

    const nowIso = arrivalTime || new Date().toISOString();
    const result = tripStateMachine.transition(currentTrip, 'ARRIVED', context, {
      arrivalTime: nowIso
    });

    this.trips[tripIndex] = result.updatedTrip;
    return { trip: result.updatedTrip, event: result.event, auditLog: result.auditLog };
  }

  /**
   * Unloading Station Step 2: Upon Starting Unload (عند بدء التفريغ)
   * ARRIVED -> UNLOADING
   */
  processUnloadingStart(
    tripId: string, 
    unloaderId: string, 
    actorContext?: { actorId?: string; actorName?: string; actorRole?: TripActorRole }
  ): { trip: TripRecord; event: TripLifecycleEvent; auditLog: TripAuditLog } {
    const tripIndex = this.trips.findIndex(t => t.tripId === tripId);
    if (tripIndex === -1) {
      throw new Error(`الرحلة (${tripId}) غير موجودة.`);
    }
    const currentTrip = this.trips[tripIndex];

    const context: TransitionContext = {
      actorId: unloaderId || actorContext?.actorId || 'REC-INSPECTOR-01',
      actorRole: actorContext?.actorRole || 'SITE_RECEIVER',
      actorName: actorContext?.actorName || 'مستلم ومفتش منصة التفريغ',
      projectId: currentTrip.projectId,
      reason: 'دخول الشاحنة إلى منصة التفريغ وبدء تفريغ الحمولة'
    };

    const result = tripStateMachine.transition(currentTrip, 'UNLOADING', context, {
      unloaderId
    });

    this.trips[tripIndex] = result.updatedTrip;
    return { trip: result.updatedTrip, event: result.event, auditLog: result.auditLog };
  }

  /**
   * Unloading Station Step 3 & 4:
   * Upon entering destNetWeight:
   * Server calculates: varianceWeight = destNetWeight - netWeight
   * And updates:
   * - unloaderId
   * - arrivalTime
   * - unloadTime
   * - destNetWeight
   * - varianceWeight
   * 
   * Then: UNLOADING -> COMPLETED
   * 
   * If variance is outside tolerance:
   * Creates real Exception entity (not merely a UI color!).
   */
  completeUnloadingWithVariance(params: UnloadingCompletionParams): UnloadingCompletionResult {
    const tripIndex = this.trips.findIndex(t => t.tripId === params.tripId);
    if (tripIndex === -1) {
      throw new Error(`الرحلة (${params.tripId}) غير موجودة.`);
    }
    const trip = this.trips[tripIndex];

    if (params.destNetWeight === undefined || params.destNetWeight === null || params.destNetWeight <= 0) {
      throw new Error(`الوزن الصافي في موقع التفريغ (destNetWeight) يجب أن يكون قيمة موجبة (تم إدخال: ${params.destNetWeight}).`);
    }

    // 1. Server strictly calculates: varianceWeight = destNetWeight - netWeight
    const calculatedVariance = Math.round(params.destNetWeight - trip.netWeight);
    const variancePercent = trip.netWeight > 0 
      ? parseFloat(((calculatedVariance / trip.netWeight) * 100).toFixed(2))
      : 0;

    // 2. Tolerance calculation (Standard 1.5% or 500 kg max threshold)
    const tolerancePercent = params.tolerancePercent ?? 1.5;
    const toleranceKg = params.toleranceKg ?? 500;
    const thresholdFromPercent = Math.round((trip.netWeight * tolerancePercent) / 100);
    const effectiveToleranceKg = Math.max(toleranceKg, thresholdFromPercent);

    const isOutOfTolerance = Math.abs(calculatedVariance) > effectiveToleranceKg;

    const nowIso = new Date().toISOString();
    const arrivalTime = params.arrivalTime || trip.arrivalTime || nowIso;
    const unloadTime = params.unloadTime || nowIso;
    const unloaderId = params.unloaderId || trip.unloaderId || 'REC-INSPECTOR-01';

    // 3. Centralized State Machine transition: UNLOADING -> COMPLETED
    const context: TransitionContext = {
      actorId: unloaderId,
      actorRole: 'SITE_RECEIVER',
      actorName: params.actorName || 'مستلم ومفتش الموقع',
      projectId: trip.projectId,
      reason: params.notes || `إتمام التفريغ وتوثيق صافي وزن الوصول (${params.destNetWeight.toLocaleString()} كجم) وحساب فارق الوزن (${calculatedVariance.toLocaleString()} كجم)`
    };

    const payload: TransitionPayload = {
      destNetWeight: params.destNetWeight,
      unloaderId,
      arrivalTime,
      unloadTime,
      notes: params.notes
    };

    const transitionResult = tripStateMachine.transition(trip, 'COMPLETED', context, payload);
    const updatedTrip = transitionResult.updatedTrip;

    // Ensure all 5 required fields are fully and atomically updated
    updatedTrip.unloaderId = unloaderId;
    updatedTrip.arrivalTime = arrivalTime;
    updatedTrip.unloadTime = unloadTime;
    updatedTrip.destNetWeight = params.destNetWeight;
    updatedTrip.varianceWeight = calculatedVariance;

    let exceptionCreated: TripExceptionEntity | undefined;

    // 4. "إذا كان هناك فرق خارج tolerance: أنشئ Exception. ولا تعتبر الفرق مجرد لون في الواجهة."
    if (isOutOfTolerance) {
      const exceptionId = `EXP-DISC-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
      const severity = Math.abs(variancePercent) > 3.0 ? 'BLOCKING' : 'HIGH';

      exceptionCreated = {
        exceptionId,
        tripId: trip.tripId,
        projectId: trip.projectId,
        type: 'WEIGHT_DISCREPANCY',
        severity,
        status: 'OPEN',
        reasonAr: `فارق وزن التفريغ (${calculatedVariance > 0 ? '+' : ''}${calculatedVariance.toLocaleString()} كجم / ${variancePercent}%) يتجاوز حد التسامح المسموح (±${effectiveToleranceKg.toLocaleString()} كجم / ±${tolerancePercent}%). وزن المصدر: ${trip.netWeight.toLocaleString()} كجم، وزن الاستلام: ${params.destNetWeight.toLocaleString()} كجم.`,
        reportedBy: {
          userId: unloaderId,
          displayName: params.actorName || 'مستلم ومفتش التفريغ'
        },
        createdAt: nowIso as any,
        updatedAt: nowIso as any,
        createdBy: unloaderId,
        updatedBy: unloaderId
      };

      // Add to exceptions map
      const currentList = this.exceptions.get(trip.tripId) || [];
      this.exceptions.set(trip.tripId, [exceptionCreated, ...currentList]);

      // Integrate with authoritative Exception Engine (and record audit log)
      exceptionEngine.createException({
        exceptionId,
        projectId: trip.projectId,
        tripId: trip.tripId,
        type: 'WEIGHT_VARIANCE',
        severity,
        description: `فارق وزن التفريغ (${calculatedVariance > 0 ? '+' : ''}${calculatedVariance.toLocaleString()} كجم / ${variancePercent}%) يتجاوز حد التسامح المسموح (±${effectiveToleranceKg.toLocaleString()} كجم / ±${tolerancePercent}%). وزن المصدر: ${trip.netWeight.toLocaleString()} كجم، وزن الاستلام: ${params.destNetWeight.toLocaleString()} كجم.`,
        evidence: {
          tripSerial: trip.tripSerial,
          ticketId: trip.ticketId,
          loadedNetKg: trip.netWeight,
          receivedNetKg: params.destNetWeight,
          varianceKg: calculatedVariance,
          variancePercent,
          toleranceLimitKg: effectiveToleranceKg,
          tolerancePercent,
          unloaderId
        },
        openedBy: params.actorName ? `${params.actorName} (${unloaderId})` : unloaderId
      });

      // Update trip exception flags
      updatedTrip.hasExceptions = true;
      updatedTrip.activeExceptionCount = (updatedTrip.activeExceptionCount || 0) + 1;

      // Log formal event and audit in State Machine
      const excEvent: TripLifecycleEvent = {
        eventId: `EVT-${Date.now()}-EXC`,
        tripId: trip.tripId,
        action: 'WEIGHT_DISCREPANCY_EXCEPTION_RAISED',
        fromStatus: 'UNLOADING',
        toStatus: 'COMPLETED',
        actorId: unloaderId,
        actorRole: 'SITE_RECEIVER',
        actorName: params.actorName || 'مستلم ومفتش الموقع',
        projectId: trip.projectId,
        timestamp: nowIso,
        reason: `إنشاء استثناء وزني رسمي (${exceptionId}) لتجاوز حد التفاوت المسموح`,
        payload: {
          exceptionId,
          varianceWeight: calculatedVariance,
          variancePercent,
          toleranceKg: effectiveToleranceKg,
          destNetWeight: params.destNetWeight,
          originNetWeight: trip.netWeight
        },
        version: updatedTrip.version
      };

      const excAudit: TripAuditLog = {
        auditId: `AUD-${Date.now()}-EXC`,
        tripId: trip.tripId,
        action: 'EXCEPTION_WEIGHT_DISCREPANCY_REGISTERED',
        fromStatus: 'UNLOADING',
        toStatus: 'COMPLETED',
        actorId: unloaderId,
        actorRole: 'SITE_RECEIVER',
        actorName: params.actorName || 'مستلم ومفتش الموقع',
        projectId: trip.projectId,
        versionBefore: trip.version,
        versionAfter: updatedTrip.version,
        timestamp: nowIso,
        details: `تسجيل استثناء مالي وتشغيلي رسمي (${exceptionId}) في قاعدة البيانات بسبب تفاوت وزن قدره (${calculatedVariance.toLocaleString()} كجم / ${variancePercent}%) يتجاوز الحد المسموح. هذا استثناء رسمي معتمد يمنع إغلاق التسوية المالية بدون اعتماد إداري.`,
        diff: {
          hasExceptions: { before: false, after: true },
          exceptionId: { before: null, after: exceptionId },
          varianceWeight: { before: null, after: calculatedVariance }
        }
      };

      tripStateMachine.addLifecycleEvent(excEvent);
      tripStateMachine.addAuditLog(excAudit);
    }

    this.trips[tripIndex] = updatedTrip;

    return {
      trip: updatedTrip,
      varianceWeight: calculatedVariance,
      variancePercent,
      isOutOfTolerance,
      toleranceThresholdKg: effectiveToleranceKg,
      exceptionCreated,
      event: transitionResult.event,
      auditLog: transitionResult.auditLog
    };
  }

  /**
   * Retrieves registered exceptions for a given trip.
   */
  getTripExceptions(tripId: string): TripExceptionEntity[] {
    return this.exceptions.get(tripId) || [];
  }

  /**
   * Retrieves all registered exceptions across all trips.
   */
  getAllExceptions(): TripExceptionEntity[] {
    const all: TripExceptionEntity[] = [];
    this.exceptions.forEach(list => all.push(...list));
    return all;
  }

  /**
   * Resolves or waives an exception.
   */
  resolveException(
    tripId: string,
    exceptionId: string,
    resolution: { notes: string; status: 'RESOLVED' | 'WAIVED'; financialPenaltySAR?: number },
    resolvedByUserId: string
  ): void {
    const list = this.exceptions.get(tripId) || [];
    const index = list.findIndex(e => e.exceptionId === exceptionId);
    if (index !== -1) {
      list[index] = {
        ...list[index],
        status: resolution.status,
        resolution: {
          resolvedByUserId,
          resolutionNotes: resolution.notes,
          financialPenaltySAR: resolution.financialPenaltySAR,
          resolvedAt: new Date()
        }
      };
      this.exceptions.set(tripId, list);
    }
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
    this.exceptions.clear();
  }
}

export const tripEngineService = new TripEngineService();
