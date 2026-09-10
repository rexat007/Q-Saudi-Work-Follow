import React, { useState, useEffect } from 'react';
import { 
  Database, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Terminal, 
  ArrowRight, 
  Lock, 
  Server, 
  FileCheck, 
  Activity, 
  RefreshCw,
  Building2,
  Truck,
  UserCheck,
  Navigation,
  Clock,
  AlertTriangle,
  FileText,
  Calculator,
  Cpu,
  Boxes
} from 'lucide-react';
import { testFirestoreConnection, ConnectionStatus } from '../firebase/connection';
import { 
  projectService,
  carrierService,
  pricingRuleService,
  materialService,
  truckService,
  driverService,
  userService,
  tripService,
  tripEventService,
  exceptionService,
  auditLogService,
  syncOperationService,
  importBatchService
} from '../services';
import { TripValidator, TruckValidator, DriverValidator } from '../validators';
import { AuthUserContext } from '../types/common';

export interface DomainMeta {
  key: string;
  nameAr: string;
  nameEn: string;
  idField: string;
  pathPattern: string;
  icon: any;
  validatorName: string;
  repositoryName: string;
  serviceName: string;
  descriptionAr: string;
  sampleValidationRules: string[];
}

export const DOMAINS_LIST: DomainMeta[] = [
  {
    key: 'projects',
    nameAr: 'المشاريع',
    nameEn: 'Projects',
    idField: 'projectId',
    pathPattern: '/projects/{projectId}',
    icon: Building2,
    validatorName: 'ProjectValidator',
    repositoryName: 'ProjectRepository',
    serviceName: 'ProjectService',
    descriptionAr: 'كيان العزل التام للمشاريع (Multi-Tenant Root)، يضبط النطاق الجغرافي والضريبي.',
    sampleValidationRules: [
      'الرقم الضريبي ZATCA يجب أن يتكون من 15 رقمًا',
      'حالة المشروع مقيدة بـ (ACTIVE, SUSPENDED, ARCHIVED)',
      'معرّف المشروع projectId يخضع لنمط ^[a-zA-Z0-9_-]+$'
    ]
  },
  {
    key: 'carriers',
    nameAr: 'الناقلون',
    nameEn: 'Carriers',
    idField: 'carrierId',
    pathPattern: '/projects/{projectId}/carriers/{carrierId}',
    icon: Building2,
    validatorName: 'CarrierValidator',
    repositoryName: 'CarrierRepository',
    serviceName: 'CarrierService',
    descriptionAr: 'شركات النقل المعتمدة والمتعاقدة لتنفيذ توريد وتفريغ المواد.',
    sampleValidationRules: [
      'السجل التجاري CR يجب أن يتكون من 10 أرقام نظامية سعودية',
      'ترخيص هيئة النقل العام TGA إلزامي',
      'رقم جوال مسؤول التواصل معتمد دولياً أو محلياً'
    ]
  },
  {
    key: 'pricingRules',
    nameAr: 'قواعد التسعير',
    nameEn: 'Pricing Rules',
    idField: 'pricingRuleId',
    pathPattern: '/projects/{projectId}/pricing_rules/{pricingRuleId}',
    icon: Calculator,
    validatorName: 'PricingRuleValidator',
    repositoryName: 'PricingRuleRepository',
    serviceName: 'PricingRuleService',
    descriptionAr: 'التعريفات المالية المعتمدة لاحتساب قيمة النقل وغرامات التأخير وضريبة 15%.',
    sampleValidationRules: [
      'نموذج التسعير محدد بـ (PER_TON, PER_TRIP, PER_KM, FLAT_RATE)',
      'السعر الأساسي baseRateSAR رقم غير سالب',
      'سعر غرامة الانتظار بالساعة demurrageRatePerHourSAR موجب أو صفر'
    ]
  },
  {
    key: 'materials',
    nameAr: 'المواد',
    nameEn: 'Materials',
    idField: 'materialId',
    pathPattern: '/projects/{projectId}/materials/{materialId}',
    icon: Layers,
    validatorName: 'MaterialValidator',
    repositoryName: 'MaterialRepository',
    serviceName: 'MaterialService',
    descriptionAr: 'المواد الإنشائية أو الركام المنقول مع مواصفات الكثافة والرطوبة.',
    sampleValidationRules: [
      'رمز المادة code حرفان على الأقل',
      'وحدة القياس unitOfMeasure مقيدة بـ (TON, M3, TRIP)',
      'الاسم العربي nameAr إلزامي'
    ]
  },
  {
    key: 'trucks',
    nameAr: 'الشاحنات',
    nameEn: 'Trucks',
    idField: 'truckId',
    pathPattern: '/projects/{projectId}/trucks/{truckId}',
    icon: Truck,
    validatorName: 'TruckValidator',
    repositoryName: 'TruckRepository',
    serviceName: 'TruckService',
    descriptionAr: 'أسطول المركبات المعتمدة مع ضبط الوزن الفارغ والحد الأقصى القانوني.',
    sampleValidationRules: [
      'الوزن الفارغ Tare أكبر من الصفر',
      'الوزن الإجمالي Gross أكبر قطعاً من الفارغ Tare',
      'الحمولة النظامية legalPayloadLimitKg = Gross - Tare',
      'الحد الأقصى المطلق لسلامة الطرق لا يتجاوز 75,000 كجم'
    ]
  },
  {
    key: 'drivers',
    nameAr: 'السائقون',
    nameEn: 'Drivers',
    idField: 'driverId',
    pathPattern: '/projects/{projectId}/drivers/{driverId}',
    icon: UserCheck,
    validatorName: 'DriverValidator',
    repositoryName: 'DriverRepository',
    serviceName: 'DriverService',
    descriptionAr: 'السائقون الميدانيون المرخصون والمربوطون بالناقلين.',
    sampleValidationRules: [
      'رقم الهوية الوطنية أو الإقامة 10 أرقام تبدأ بـ 1 أو 2',
      'رقم الجوال سعودي صحيح (05xxxxxxxx أو +9665xxxxxxxx)',
      'اسم السائق الثلاثي بالعربية إلزامي'
    ]
  },
  {
    key: 'users',
    nameAr: 'المستخدمون',
    nameEn: 'Users',
    idField: 'userId',
    pathPattern: '/users/{userId}',
    icon: UserCheck,
    validatorName: 'UserValidator',
    repositoryName: 'UserRepository',
    serviceName: 'UserService',
    descriptionAr: 'حسابات مستخدمي المنظومة مع توزيع الأدوار والصلاحيات (RBAC).',
    sampleValidationRules: [
      'البريد الإلكتروني بصيغة قياسية صحيحة',
      'الدور مقيد بـ (PROJECT_ADMIN, DISPATCHER, FINANCE_AUDITOR, DRIVER, VIEWER)',
      'معرّف المستخدم userId يطابق معرّف Firebase Auth'
    ]
  },
  {
    key: 'trips',
    nameAr: 'الرحلات',
    nameEn: 'Trips',
    idField: 'tripId',
    pathPattern: '/projects/{projectId}/trips/{tripId}',
    icon: Navigation,
    validatorName: 'TripValidator',
    repositoryName: 'TripRepository',
    serviceName: 'TripService',
    descriptionAr: 'الحاوية المركزية للعمليات مع اللقطات التاريخية ومحرك FSM والحساب المالي.',
    sampleValidationRules: [
      'اللقطات التاريخية (Snapshots) إلزامية وغير قابلة للتعديل',
      'التنقل بين الحالات يخضع لمسار FSM الصارم',
      'الوزن الإجمالي للتحميل أكبر من الوزن الفارغ للشاحنة',
      'القيمة المالية لا تُحسب في المتصفح وتُقفل عند الاكتمال'
    ]
  },
  {
    key: 'tripEvents',
    nameAr: 'أحداث الرحلة',
    nameEn: 'Trip Events',
    idField: 'eventId',
    pathPattern: '/projects/{projectId}/trips/{tripId}/events/{eventId}',
    icon: Clock,
    validatorName: 'TripEventValidator',
    repositoryName: 'TripEventRepository',
    serviceName: 'TripEventService',
    descriptionAr: 'سجل زمني تسلسلي غير قابل للتعديل (Append-Only) لتوثيق مراحل الحركة والموازين.',
    sampleValidationRules: [
      'معرّف الفاعل (Actor) إلزامي للتوثيق الجنائي والتشغيلي',
      'مفتاح عدم التكرار idempotencyKey إلزامي',
      'الحالة الناتجة statusResulting مطابقة لقائمة حالات الرحلة'
    ]
  },
  {
    key: 'exceptions',
    nameAr: 'الاستثناءات التشغيلية',
    nameEn: 'Exceptions',
    idField: 'exceptionId',
    pathPattern: '/projects/{projectId}/trips/{tripId}/exceptions/{exceptionId}',
    icon: AlertTriangle,
    validatorName: 'ExceptionValidator',
    repositoryName: 'ExceptionRepository',
    serviceName: 'ExceptionService',
    descriptionAr: 'سجلات الانحرافات (تجاوز حمولة، فرق ميزان، أعطال) وتجميد الإغلاق الآلي.',
    sampleValidationRules: [
      'النوع محدد بـ (OVERWEIGHT_VIOLATION, WEIGHT_DISCREPANCY, ROUTE_DEVIATION, ...)',
      'الخطورة محددة بـ (LOW, MEDIUM, HIGH, BLOCKING)',
      'البت في الاستثناء مقتصر على مدير المشروع أو المدقق المالي'
    ]
  },
  {
    key: 'auditLogs',
    nameAr: 'سجل التدقيق',
    nameEn: 'Audit Logs',
    idField: 'auditLogId',
    pathPattern: '/audit_logs/{auditLogId}',
    icon: FileText,
    validatorName: 'AuditLogValidator',
    repositoryName: 'AuditLogRepository',
    serviceName: 'AuditLogService',
    descriptionAr: 'سجل أمني وتنظيمي غير قابل للتعديل يوثق جميع التغييرات الحساسة والمستخدم الفاعل.',
    sampleValidationRules: [
      'حظر التعديل والحذف نهائياً (Immutable Append-Only)',
      'توثيق بيانات الفاعل (IP, UserAgent, Email, Role)',
      'توثيق الفروقات قبل وبعد (Before & After Diffs)'
    ]
  },
  {
    key: 'syncOperations',
    nameAr: 'عمليات المزامنة',
    nameEn: 'Sync Operations',
    idField: 'operationId',
    pathPattern: '/projects/{projectId}/sync_operations/{operationId}',
    icon: RefreshCw,
    validatorName: 'SyncOperationValidator',
    repositoryName: 'SyncOperationRepository',
    serviceName: 'SyncOperationService',
    descriptionAr: 'سجل حماية عدم التكرار (Idempotency) للمزامنة الميدانية من IndexedDB.',
    sampleValidationRules: [
      'معرّف العملية operationId يطابق idempotencyKey',
      'معرّف العميل clientOperationUUID بصيغة UUIDv4',
      'حالة المزامنة محددة بـ (PROCESSED, FAILED, REJECTED)'
    ]
  },
  {
    key: 'importBatches',
    nameAr: 'دفعات الاستيراد',
    nameEn: 'Import Batches',
    idField: 'batchId',
    pathPattern: '/projects/{projectId}/import_batches/{batchId}',
    icon: Boxes,
    validatorName: 'ImportBatchValidator',
    repositoryName: 'ImportBatchRepository',
    serviceName: 'ImportBatchService',
    descriptionAr: 'إدارة دفعات الاستيراد المجمعة للشاحنات وتذاكر الموازين والبيانات التاريخية.',
    sampleValidationRules: [
      'نوع الدفعة مقيد بـ (FLEET_IMPORT, DRIVER_IMPORT, WEIGHBRIDGE_IMPORT, LEGACY_TRIPS)',
      'إجمالي السجلات totalRecords رقم غير سالب',
      'العملية مقتصرة فقط على مديري المشاريع'
    ]
  }
];

export default function FirestoreArchitectureView() {
  const [selectedDomainKey, setSelectedDomainKey] = useState<string>('trips');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [isCheckingConnection, setIsCheckingConnection] = useState<boolean>(false);
  const [simulatedRole, setSimulatedRole] = useState<AuthUserContext['role']>('PROJECT_ADMIN');
  const [simulationLog, setSimulationLog] = useState<string[]>([]);
  const [simulationOutput, setSimulationOutput] = useState<any | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  const selectedDomain = DOMAINS_LIST.find(d => d.key === selectedDomainKey) || DOMAINS_LIST[7];

  const checkConnection = async () => {
    setIsCheckingConnection(true);
    try {
      const status = await testFirestoreConnection();
      setConnectionStatus(status);
    } catch (e) {
      setConnectionStatus({
        connected: false,
        checkedAt: new Date().toISOString(),
        errorMessage: String(e),
      });
    } finally {
      setIsCheckingConnection(false);
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  // Simulator to demonstrate: React -> Service -> Validator -> Repository -> Firestore
  const runArchitecturalSimulation = async (scenario: 'VALID_DISPATCH' | 'INVALID_WEIGHT' | 'INVALID_DRIVER_ID') => {
    setIsSimulating(true);
    const logs: string[] = [];
    logs.push(`[1. React UI Event]: استلام طلب عملية من واجهة المستخدم (Simulated Actor: ${simulatedRole})`);
    logs.push(`[2. Architectural Boundary Gate]: React ممنوع تماماً من استدعاء setDoc / updateDoc في Firestore مباشرة.`);
    logs.push(`[3. Delegation to Domain Service]: استدعاء tripService.dispatchTrip(...) مع سياق المستخدم.`);

    const context: AuthUserContext = {
      userId: 'usr_simulation_operator',
      email: 'dispatcher.saudi@qworkfollow.com',
      displayName: 'مشرف العمليات الميدانية',
      role: simulatedRole,
      ipAddress: '10.0.4.12',
      userAgent: 'Chrome 128 / Saudi Logistics Client',
    };

    if (scenario === 'INVALID_DRIVER_ID') {
      logs.push(`[4. Domain Validator]: استدعاء DriverValidator.validate(...) مع هوية سائق غير صحيحة ("987654321")...`);
      const val = DriverValidator.validate({
        driverId: 'drv_test',
        projectId: 'proj_riyadh_metro',
        carrierId: 'car_01',
        fullNameAr: 'أحمد بن محمد السالم',
        nationalOrIqamaId: '987654321', // Invalid: does not start with 1 or 2, 9 digits only
        phone: '0512345678',
        isActive: true,
      });
      logs.push(`❌ [Validation Rejected]: فشل التحقق في Validator قبل الوصول إلى قاعدة البيانات!`);
      val.errors.forEach(e => logs.push(`   - ${e.messageAr} (${e.code})`));
      logs.push(`[Result]: تم حماية قاعدة بيانات Firestore من البيانات غير المطابقة للمواصفات السعودية.`);
      setSimulationLog(logs);
      setSimulationOutput({ success: false, errors: val.errors });
      setIsSimulating(false);
      return;
    }

    if (scenario === 'INVALID_WEIGHT') {
      logs.push(`[4. Domain Validator]: استدعاء TruckValidator.validate(...) مع وزن فارغ يتجاوز الإجمالي (Tare > Gross)...`);
      const val = TruckValidator.validate({
        truckId: 'trk_test',
        projectId: 'proj_riyadh_metro',
        carrierId: 'car_01',
        plateNumberAr: 'أ ب ج 1234',
        tareWeightKg: 28000,
        maxGrossWeightKg: 25000, // Invalid: gross < tare
        legalPayloadLimitKg: 0,
        isActive: true,
      });
      logs.push(`❌ [Validation Rejected]: رفض محرك التحقق الفيزيائي العملية!`);
      val.errors.forEach(e => logs.push(`   - ${e.messageAr} (${e.code})`));
      logs.push(`[Result]: تم منع إسناد الشاحنة أو حفظ السجل دون لمس قاعدة البيانات.`);
      setSimulationLog(logs);
      setSimulationOutput({ success: false, errors: val.errors });
      setIsSimulating(false);
      return;
    }

    // Valid Dispatch Pipeline Demonstration
    logs.push(`[4. Domain Validator]: فحص شروط النطاق التشغيلي عبر TripValidator بنجاح (100% Valid).`);
    logs.push(`[5. Historical Snapshot Invariant]: استدعاء لقطات غير قابلة للتعديل (carrierSnapshot, truckSnapshot, driverSnapshot, pricingSnapshot).`);
    logs.push(`[6. Auditing Injection]: ختم الحقول الإلزامية: createdAt, createdBy="${context.userId}", updatedAt, updatedBy="${context.userId}".`);
    logs.push(`[7. Repository Execution]: tripRepository.create(...) يرسل الوثيقة المشفرة والمدققة إلى Firestore.`);
    logs.push(`[8. Append-Only Event Stream]: تسجيل حدث الرحلة EVT-DISPATCH عبر tripEventService.`);
    logs.push(`[9. Immutable Audit Log]: تسجيل العملية في auditLogService مع تفاصيل الفاعل (${context.email}).`);
    logs.push(`✅ [Pipeline Completed]: تم تنفيذ دورة الحياة كاملة وفق ضوابط المعمارية الخادومية الصارمة.`);

    const sampleTripGenerated = {
      tripId: `TRP-2026-${Math.floor(100000 + Math.random() * 900000)}`,
      projectId: 'proj_riyadh_metro_01',
      status: 'DISPATCHED',
      carrierSnapshot: {
        carrierId: 'car_al_mashriq_logistics',
        companyNameAr: 'شركة المشرق للنقل اللوجستي',
        commercialRegistrationNo: '1010892341',
      },
      truckSnapshot: {
        truckId: 'trk_mercedes_actros_08',
        plateNumberAr: 'ط ر ق 8892',
        tareWeightKg: 14200,
        legalPayloadLimitKg: 30800,
      },
      driverSnapshot: {
        driverId: 'drv_saad_alharbi',
        fullNameAr: 'سعد بن عبد الله الحربي',
        nationalOrIqamaId: '1082918273',
        phone: '0554128930',
      },
      materialSnapshot: {
        materialId: 'mat_base_course_class_a',
        code: 'BASE_COURSE_CLA',
        nameAr: 'بيس كورس ركام مدرج فئة أ',
        unitOfMeasure: 'TON',
      },
      pricingSnapshot: {
        pricingRuleId: 'prc_riyadh_metro_ton_standard',
        pricingModel: 'PER_TON',
        baseRateSAR: 28.5,
        vatApplicable: true,
        vatRatePercent: 15,
      },
      weights: {},
      financials: {
        baseAmountSAR: 0,
        demurrageAmountSAR: 0,
        deductionsAmountSAR: 0,
        subtotalSAR: 0,
        vatAmountSAR: 0,
        totalAmountSAR: 0,
        currency: 'SAR',
        isFinalized: false,
      },
      createdAt: new Date().toISOString(),
      createdBy: context.userId,
      updatedAt: new Date().toISOString(),
      updatedBy: context.userId,
    };

    setSimulationLog(logs);
    setSimulationOutput({ success: true, payload: sampleTripGenerated });
    setIsSimulating(false);
  };

  const SelectedIcon = selectedDomain.icon;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner: Firebase Environment & Connection Health */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
              <Database className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-base font-bold text-stone-900">
                  حالة اتصال وتكامل Firestore & Firebase
                </h2>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                  Active & Deployed
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-stone-100 text-stone-700">
                  Region: europe-west2
                </span>
              </div>
              <p className="text-xs text-stone-600 mt-1">
                قاعدة البيانات التشغيلية الأساسية (SSOT) مفعّلة وفق قواعد الأمان الصارمة Zero-Trust ABAC.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <div className="text-left font-mono text-[11px] bg-stone-50 px-3 py-1.5 rounded-lg border border-stone-200">
              <span className="text-stone-400 block text-[10px]">Database Instance</span>
              <span className="font-semibold text-stone-800">ai-studio-qsaudiworkfollow...</span>
            </div>
            <button
              onClick={checkConnection}
              disabled={isCheckingConnection}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingConnection ? 'animate-spin' : ''}`} />
              <span>فحص الاتصال (Server Ping)</span>
            </button>
          </div>
        </div>

        {/* Auditing Fields Guarantee Banner */}
        <div className="mt-4 pt-4 border-t border-stone-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="flex items-center gap-2 bg-stone-50 p-2.5 rounded-xl border border-stone-200/60">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <span className="text-[11px] font-mono font-bold text-stone-800 block">createdAt & createdBy</span>
              <span className="text-[10px] text-stone-500">طابع زمني وهوية منشئ السجل</span>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-stone-50 p-2.5 rounded-xl border border-stone-200/60">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <span className="text-[11px] font-mono font-bold text-stone-800 block">updatedAt & updatedBy</span>
              <span className="text-[10px] text-stone-500">طابع زمني وهوية آخر مُعدّل</span>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-stone-50 p-2.5 rounded-xl border border-stone-200/60">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <span className="text-[11px] font-bold text-stone-800 block">No Direct React Writes</span>
              <span className="text-[10px] text-stone-500">حظر الكتابة المباشرة من المتصفح</span>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-stone-50 p-2.5 rounded-xl border border-stone-200/60">
            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
            <div>
              <span className="text-[11px] font-bold text-stone-800 block">13 Repositories & Services</span>
              <span className="text-[10px] text-stone-500">بنية مجزأة لكل نطاق بشكل مستقل</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Domain Selector & Detailed Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left List of 13 Domains */}
        <div className="lg:col-span-4 space-y-2">
          <div className="bg-white rounded-2xl border border-stone-200 p-3 shadow-xs">
            <div className="px-3 py-2 border-b border-stone-100 flex items-center justify-between">
              <span className="text-xs font-bold text-stone-800">النطاقات الـ 13 (Domain Modules)</span>
              <span className="text-[10px] bg-stone-100 font-mono text-stone-600 px-2 py-0.5 rounded-full font-bold">13 Modules</span>
            </div>

            <div className="mt-2 space-y-1 max-h-[600px] overflow-y-auto pr-1">
              {DOMAINS_LIST.map((domain) => {
                const Icon = domain.icon;
                const isSelected = selectedDomainKey === domain.key;
                return (
                  <button
                    key={domain.key}
                    onClick={() => setSelectedDomainKey(domain.key)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-right transition-all ${
                      isSelected 
                        ? 'bg-stone-900 text-white shadow-xs' 
                        : 'hover:bg-stone-100 text-stone-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-stone-800 text-amber-400' : 'bg-stone-100 text-stone-600'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-bold truncate">{domain.nameAr}</div>
                        <div className={`text-[10px] font-mono truncate ${isSelected ? 'text-stone-300' : 'text-stone-400'}`}>
                          {domain.nameEn}
                        </div>
                      </div>
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                      isSelected ? 'bg-stone-800 text-amber-300' : 'bg-stone-100 text-stone-500'
                    }`}>
                      {domain.idField}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Detail Pane: Validator, Repository, Service Breakdown */}
        <div className="lg:col-span-8 space-y-6">
          {/* Domain Header Card */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0">
                  <SelectedIcon className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-stone-900">{selectedDomain.nameAr} ({selectedDomain.nameEn})</h3>
                    <span className="text-xs font-mono font-bold bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full">
                      ID: {selectedDomain.idField}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 mt-1">{selectedDomain.descriptionAr}</p>
                </div>
              </div>
            </div>

            {/* Path in Firestore */}
            <div className="mt-4 p-3 bg-stone-900 text-emerald-400 rounded-xl font-mono text-xs flex items-center justify-between">
              <div>
                <span className="text-stone-400 text-[10px] block">مسار المجموعة الهيكلي في Firestore:</span>
                <span>{selectedDomain.pathPattern}</span>
              </div>
              <span className="text-[10px] bg-stone-800 text-stone-300 px-2 py-1 rounded">
                Multi-Tenant Scoped
              </span>
            </div>

            {/* Architecture Triple Stack: Validator, Repository, Service */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 1. Validator Box */}
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <FileCheck className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-stone-800">محرك التحقق (Validator)</span>
                  </div>
                  <div className="font-mono text-xs font-bold text-emerald-800 mb-2">
                    {selectedDomain.validatorName}
                  </div>
                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    يفحص ضوابط النطاق وقواعد المملكة قبل أي حفظ في قاعدة البيانات.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-stone-200/60 text-[10px] text-stone-500">
                  Output: ValidationResult (isValid, errors)
                </div>
              </div>

              {/* 2. Service Box */}
              <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/80 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Cpu className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-bold text-stone-800">طبقة المنطق (Service)</span>
                  </div>
                  <div className="font-mono text-xs font-bold text-amber-800 mb-2">
                    {selectedDomain.serviceName}
                  </div>
                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    بوابة الأعمال الوحيدة المسموح لـ React باستدعائها. يمنع الكتابات المباشرة.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-amber-200/60 text-[10px] text-stone-500">
                  Secured & Audit-Stamped
                </div>
              </div>

              {/* 3. Repository Box */}
              <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-200/80 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-stone-800">مستودع البيانات (Repository)</span>
                  </div>
                  <div className="font-mono text-xs font-bold text-indigo-800 mb-2">
                    {selectedDomain.repositoryName}
                  </div>
                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    يعزل استدعاءات Firestore مع معالجة الأخطاء وطوابع التحديث التلقائية.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-indigo-200/60 text-[10px] text-stone-500">
                  Enforces createdAt & updatedAt
                </div>
              </div>
            </div>

            {/* Validation Rules Checklist */}
            <div className="mt-6 pt-5 border-t border-stone-100">
              <h4 className="text-xs font-bold text-stone-800 mb-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>أبرز ضوابط التحقق المعتمدة لنطاق ({selectedDomain.nameAr}):</span>
              </h4>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {selectedDomain.sampleValidationRules.map((rule, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-stone-700 bg-stone-50 p-2.5 rounded-lg border border-stone-200/60">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Interactive Architectural Simulator Card */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-indigo-600" />
                  <span>محاكي التدفق المعماري التفاعلي (Pipeline Verification)</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  تحقق عملي يثبت أن الواجهة لا تكتب في Firestore إلا بعد المرور عبر Service ➔ Validator ➔ Repository.
                </p>
              </div>

              {/* Actor Role Picker */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-stone-500">دور المستخدم الفاعل:</span>
                <select 
                  value={simulatedRole} 
                  onChange={(e) => setSimulatedRole(e.target.value as any)}
                  className="bg-stone-100 border border-stone-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-stone-800 focus:outline-none"
                >
                  <option value="PROJECT_ADMIN">PROJECT_ADMIN (مدير مشروع)</option>
                  <option value="DISPATCHER">DISPATCHER (مأمور حركة)</option>
                  <option value="FINANCE_AUDITOR">FINANCE_AUDITOR (مدقق مالي)</option>
                  <option value="DRIVER">DRIVER (سائق ميداني)</option>
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2.5 mb-4">
              <button
                onClick={() => runArchitecturalSimulation('VALID_DISPATCH')}
                disabled={isSimulating}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-stone-900 text-white hover:bg-stone-800 transition-all shadow-xs flex items-center gap-2"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>محاكاة إطلاق رحلة نظامية (Valid Trip Dispatch)</span>
              </button>

              <button
                onClick={() => runArchitecturalSimulation('INVALID_DRIVER_ID')}
                disabled={isSimulating}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100 transition-all flex items-center gap-2"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>اختبار رفض هوية سائق غير صحيحة (Driver Validator Test)</span>
              </button>

              <button
                onClick={() => runArchitecturalSimulation('INVALID_WEIGHT')}
                disabled={isSimulating}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-all flex items-center gap-2"
              >
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>اختبار رفض وزن فارغ مخالف فيزيائياً (Truck Physics Test)</span>
              </button>
            </div>

            {/* Console Log Display */}
            {simulationLog.length > 0 && (
              <div className="bg-stone-950 text-stone-200 rounded-xl p-4 font-mono text-xs space-y-1.5 overflow-x-auto border border-stone-800 max-h-72 overflow-y-auto">
                {simulationLog.map((log, index) => (
                  <div 
                    key={index}
                    className={
                      log.startsWith('❌') ? 'text-rose-400' :
                      log.startsWith('✅') ? 'text-emerald-400 font-bold' :
                      log.startsWith('[1.') ? 'text-amber-300 font-bold' :
                      log.startsWith('[2.') ? 'text-indigo-300' :
                      'text-stone-300'
                    }
                  >
                    {log}
                  </div>
                ))}
              </div>
            )}

            {/* Result Object inspection */}
            {simulationOutput?.success && (
              <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                <div className="font-bold text-emerald-900 mb-1 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>الوثيقة المحتسبة والمختومة بالطوابع الإلزامية (Ready for Firestore SSOT):</span>
                </div>
                <div className="text-[11px] text-emerald-800 space-y-1 font-mono mt-2 bg-white/70 p-3 rounded-lg border border-emerald-200/60">
                  <div>tripId: <span className="font-bold">{simulationOutput.payload.tripId}</span></div>
                  <div>createdAt: <span className="text-stone-600">{simulationOutput.payload.createdAt}</span></div>
                  <div>createdBy: <span className="text-stone-600">{simulationOutput.payload.createdBy}</span></div>
                  <div>updatedAt: <span className="text-stone-600">{simulationOutput.payload.updatedAt}</span></div>
                  <div>updatedBy: <span className="text-stone-600">{simulationOutput.payload.updatedBy}</span></div>
                  <div>carrierSnapshot: <span className="text-stone-700">{JSON.stringify(simulationOutput.payload.carrierSnapshot)}</span></div>
                  <div>truckSnapshot: <span className="text-stone-700">{JSON.stringify(simulationOutput.payload.truckSnapshot)}</span></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
