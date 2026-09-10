import React, { useState, useMemo } from 'react';
import { 
  Scale, 
  Truck, 
  User, 
  Building2, 
  Boxes, 
  FileCheck, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Calculator, 
  ShieldCheck, 
  Lock, 
  Send, 
  Zap, 
  Sparkles,
  RotateCcw,
  Check,
  AlertCircle
} from 'lucide-react';
import { TripRecord, CreateTripParams, TripActorRole } from '../../types/tripEngine';
import { tripEngineService, MasterPricingRule, MASTER_PRICING_RULES } from '../../services/tripEngine.service';
import { SAMPLE_QUALITY_CONTEXT } from '../../data/sampleQualityData';

interface LoadingStationProps {
  onTripCreated: (newTrip: TripRecord) => void;
  onViewTripDetails?: (trip: TripRecord) => void;
  onNotification: (notif: { type: 'SUCCESS' | 'ERROR' | 'SECURITY'; message: string }) => void;
}

type WorkflowStep = 
  | 'PROJECT' 
  | 'CARRIER' 
  | 'TRUCK' 
  | 'DRIVER' 
  | 'MATERIAL' 
  | 'TARE' 
  | 'GROSS' 
  | 'PREVIEW';

const STEPS: { id: WorkflowStep; label: string; number: number; icon: any }[] = [
  { id: 'PROJECT', label: 'المشروع', number: 1, icon: Building2 },
  { id: 'CARRIER', label: 'الناقل', number: 2, icon: Truck },
  { id: 'TRUCK', label: 'الشاحنة', number: 3, icon: Truck },
  { id: 'DRIVER', label: 'السائق', number: 4, icon: User },
  { id: 'MATERIAL', label: 'المادة', number: 5, icon: Boxes },
  { id: 'TARE', label: 'وزن الفارغ', number: 6, icon: Scale },
  { id: 'GROSS', label: 'الوزن القائم', number: 7, icon: Scale },
  { id: 'PREVIEW', label: 'المعاينة والتسعير', number: 8, icon: Calculator },
];

export const LoadingStation: React.FC<LoadingStationProps> = ({
  onTripCreated,
  onViewTripDetails,
  onNotification
}) => {
  // Current Workflow Step
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('PROJECT');

  // Form State
  const [projectId, setProjectId] = useState<string>('PRJ-NEOM-001');
  const [carrierId, setCarrierId] = useState<string>('CAR-ALMAJDOUIE');
  const [truckId, setTruckId] = useState<string>('TRK-9901');
  const [driverId, setDriverId] = useState<string>('DRV-101');
  const [materialId, setMaterialId] = useState<string>('MAT-AGG-01');
  
  // Weights (in KG)
  const [tareWeight, setTareWeight] = useState<number>(8200);
  const [grossWeight, setGrossWeight] = useState<number>(45600);

  // Selected Pricing Rule override (optional if auto-resolved)
  const [pricingRuleId, setPricingRuleId] = useState<string>('PRC-NEOM-HAUL-TON-8.5');

  // Creation State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [createdTripResult, setCreatedTripResult] = useState<TripRecord | null>(null);

  // Reference Context
  const context = SAMPLE_QUALITY_CONTEXT;

  // Available Data lists
  const availableProjects = [
    { id: 'PRJ-NEOM-001', name: 'مشروع نيوم - البنية التحتية والمحاجر (PRJ-NEOM-001)' }
  ];

  const availableCarriers = useMemo(() => {
    return context.knownCarriers.filter(c => context.authorizedCarrierIds.includes(c.carrierId));
  }, [context]);

  const availableTrucks = useMemo(() => {
    return context.knownTrucks.filter(t => t.carrierId === carrierId && t.status === 'ACTIVE');
  }, [context, carrierId]);

  const availableDrivers = useMemo(() => {
    return context.knownDrivers.filter(d => d.carrierId === carrierId && d.status === 'ACTIVE');
  }, [context, carrierId]);

  const availableMaterials = useMemo(() => {
    return context.knownMaterials.filter(m => context.authorizedMaterialIds.includes(m.materialId));
  }, [context]);

  // Pricing rules for project & carrier & material
  const applicablePricingRules = useMemo(() => {
    return MASTER_PRICING_RULES.filter(r => 
      r.projectId === projectId &&
      (!r.carrierId || r.carrierId === carrierId) &&
      (!r.materialId || r.materialId === materialId)
    );
  }, [projectId, carrierId, materialId]);

  // Resolved Pricing Rule
  const activePricingRule = useMemo<MasterPricingRule | undefined>(() => {
    // If selected rule is applicable, use it; otherwise pick first applicable or fallback
    const found = applicablePricingRules.find(r => r.pricingRuleId === pricingRuleId);
    if (found) return found;
    return applicablePricingRules[0] || MASTER_PRICING_RULES.find(r => r.pricingRuleId === pricingRuleId) || MASTER_PRICING_RULES[0];
  }, [applicablePricingRules, pricingRuleId]);

  // Derived Net Weight (Client display calculation - verified server-side)
  const calculatedNetWeightKg = useMemo(() => {
    if (grossWeight && tareWeight && grossWeight > tareWeight) {
      return grossWeight - tareWeight;
    }
    return 0;
  }, [grossWeight, tareWeight]);

  const netWeightTons = useMemo(() => {
    return parseFloat((calculatedNetWeightKg / 1000).toFixed(3));
  }, [calculatedNetWeightKg]);

  // Estimated Settlement Calculation (Strictly Read-Only)
  const estimatedSettlement = useMemo<{
    amount: number;
    formulaText: string;
    pricingType: 'PER_TON' | 'PER_TRIP';
    agreedRate: number;
    currency: string;
  }>(() => {
    if (!activePricingRule) {
      return {
        amount: 0,
        formulaText: 'لا توجد تسعيرة محددة',
        pricingType: 'PER_TON',
        agreedRate: 0,
        currency: 'SAR'
      };
    }

    const { pricingType, agreedRate, currency } = activePricingRule;

    if (pricingType === 'PER_TON') {
      // Net Weight in Tons * Agreed Rate
      const total = parseFloat((netWeightTons * agreedRate).toFixed(2));
      const formulaText = `${netWeightTons} × ${agreedRate} = ${total.toFixed(2)} ${currency}`;
      return {
        amount: total,
        formulaText,
        pricingType: 'PER_TON',
        agreedRate,
        currency
      };
    } else {
      // Fixed PER_TRIP
      const total = agreedRate;
      const formulaText = `${agreedRate.toFixed(2)} ${currency} (مقطوعية ثابتة للرد)`;
      return {
        amount: total,
        formulaText,
        pricingType: 'PER_TRIP',
        agreedRate,
        currency
      };
    }
  }, [activePricingRule, netWeightTons]);

  // Warnings Assessment (Overload, Invariants, Rule Validity)
  const warnings = useMemo<string[]>(() => {
    const list: string[] = [];

    // 1. Weight Validation
    if (grossWeight <= tareWeight) {
      list.push(`الوزن القائم (${grossWeight.toLocaleString()} كجم) يجب أن يكون أكبر من وزن الفارغ (${tareWeight.toLocaleString()} كجم).`);
    }

    // 2. Overload Check (> 35 Metric Tons or Gross > 50 Tons)
    if (netWeightTons > 35) {
      list.push(`تنبيه حمولة زائدة: صافي الحمولة (${netWeightTons} طن) يتجاوز الحد النظامي الموصى به (35 طن) وفق لائحة الهيئة العامة للنقل.`);
    }
    if (grossWeight > 50000) {
      list.push(`تنبيه وزن إجمالي مرتفع: الوزن الإجمالي (${(grossWeight / 1000).toFixed(1)} طن) قد يعرض المركبة لمخالفة الموازين المتنقلة.`);
    }

    // 3. Pricing Rule Validity
    if (activePricingRule) {
      if (activePricingRule.status !== 'ACTIVE') {
        list.push(`قاعدة التسعير المختارة (${activePricingRule.name}) معطلة أو غير نشطة حالياً.`);
      }
      const today = '2026-09-09';
      if (today < activePricingRule.effectiveFrom || today > activePricingRule.effectiveTo) {
        list.push(`قاعدة التسعير منتهية الصلاحية أو غير سارية بتاريخ اليوم (${activePricingRule.effectiveFrom} إلى ${activePricingRule.effectiveTo}).`);
      }
      if (activePricingRule.agreedRate <= 0) {
        list.push(`سعر الوحدة غير صالح أو مساوٍ للصفر (${activePricingRule.agreedRate}).`);
      }
    } else {
      list.push('لم يتم العثور على قاعدة تسعير سارية تطابق المشروع والناقل والمادة.');
    }

    // 4. Carrier Authorization
    if (!context.authorizedCarrierIds.includes(carrierId)) {
      list.push('الناقل المحدد غير مصرح له بالعمل في هذا المشروع.');
    }

    // 5. Material Authorization
    if (!context.authorizedMaterialIds.includes(materialId)) {
      list.push('المادة المحددة غير معتمدة ضمن توريدات هذا المشروع.');
    }

    return list;
  }, [grossWeight, tareWeight, netWeightTons, activePricingRule, context, carrierId, materialId]);

  // Fast scenario loader for the user's explicit examples
  const loadScenario = (type: 'PER_TON' | 'PER_TRIP') => {
    setProjectId('PRJ-NEOM-001');
    setCarrierId('CAR-ALMAJDOUIE');
    setTruckId('TRK-9901');
    setDriverId('DRV-101');
    setMaterialId('MAT-AGG-01');

    if (type === 'PER_TON') {
      // User's example: 37.4 × 8.5 = 317.90 SAR
      setTareWeight(8200);
      setGrossWeight(45600); // 45600 - 8200 = 37400 kg = 37.4 tons
      setPricingRuleId('PRC-NEOM-HAUL-TON-8.5');
      onNotification({
        type: 'SUCCESS',
        message: 'تم تحميل سيناريو مثال التسعير بالطن (37.4 طن × 8.5 ر.س = 317.90 ر.س)'
      });
    } else {
      // User's example: PER_TRIP: 120 SAR
      setTareWeight(14000);
      setGrossWeight(42000); // 28 tons
      setPricingRuleId('PRC-NEOM-SHORT-TRIP-120');
      onNotification({
        type: 'SUCCESS',
        message: 'تم تحميل سيناريو مثال التسعير بالمقطوعية (120 ر.س / رد)'
      });
    }
    setCurrentStep('PREVIEW');
  };

  // Step Navigation
  const stepIndex = STEPS.findIndex(s => s.id === currentStep);
  const goToNextStep = () => {
    if (stepIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[stepIndex + 1].id);
    }
  };
  const goToPrevStep = () => {
    if (stepIndex > 0) {
      setCurrentStep(STEPS[stepIndex - 1].id);
    }
  };

  // Execution: createTrip() -> createEvent(LOADED) -> transition(IN_TRANSIT)
  const handleConfirmAndDispatch = async () => {
    // Guard against invalid weights or pricing
    if (grossWeight <= tareWeight) {
      onNotification({
        type: 'ERROR',
        message: 'لا يمكن تأكيد الرحلة: الوزن القائم يجب أن يكون أكبر من وزن الفارغ.'
      });
      return;
    }

    if (!activePricingRule || activePricingRule.status !== 'ACTIVE') {
      onNotification({
        type: 'ERROR',
        message: 'فشل حظر بدء الرحلة: قاعدة التسعير غير صالحة أو غير نشطة.'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const createParams: CreateTripParams = {
        projectId,
        carrierId,
        truckId,
        driverId,
        materialId,
        pricingRuleId: activePricingRule.pricingRuleId,
        tareWeight,
        grossWeight,
        shiftDate: '2026-09-09',
        loaderId: 'SCALE-OP-01',
        createdBy: 'SCALE-OP-01',
        notes: `تم إنشاء واعتماد الرحلة من محطة التحميل والميزان (الصافي: ${calculatedNetWeightKg.toLocaleString()} كجم)`
      };

      // Executes: createTrip() -> createEvent(LOADED) -> transition(IN_TRANSIT)
      const result = tripEngineService.createTripViaLoadingStation(createParams, {
        actorId: 'SCALE-OP-01',
        actorRole: 'SCALE_OPERATOR',
        actorName: 'مشغل محطة التحميل والميزان'
      });

      setCreatedTripResult(result.trip);
      onTripCreated(result.trip);

      onNotification({
        type: 'SUCCESS',
        message: `تم إنشاء وتأكيد الرحلة بنجاح! رقم الرحلة: ${result.trip.tripSerial} - التذكرة: ${result.trip.ticketId} (الحالة: في الطريق IN_TRANSIT)`
      });
    } catch (err: any) {
      onNotification({
        type: 'ERROR',
        message: err.message || 'حدث خطأ أثناء تأكيد وتمرير الرحلة بمحطة التحميل'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setCreatedTripResult(null);
    setCurrentStep('PROJECT');
  };

  return (
    <div id="loading-station-container" className="space-y-6">
      {/* Top Banner & Quick Presets */}
      <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-amber-100 text-amber-900">
              <Scale className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-stone-900">محطة التحميل والميزان (Loading Station)</h2>
              <p className="text-xs text-stone-500">
                تسلسل خطوات التحميل والوزن بالمصدر، احتساب صافي الحمولة، والتحقق من التسعيرة قبل الترحيل
              </p>
            </div>
          </div>
        </div>

        {/* Quick Example Loaders */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-stone-500">نماذج الأمثلة المطلوبة:</span>
          <button
            onClick={() => loadScenario('PER_TON')}
            className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
            title="تحميل مثال التسعير بالطن (37.4 × 8.5 = 317.90 SAR)"
          >
            <Zap className="w-3.5 h-3.5 text-sky-600" />
            <span>مثال بالطن: 37.4 × 8.5 = 317.90 ر.س</span>
          </button>
          <button
            onClick={() => loadScenario('PER_TRIP')}
            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
            title="تحميل مثال التسعير بالمقطوعية (120 SAR)"
          >
            <Zap className="w-3.5 h-3.5 text-emerald-600" />
            <span>مثال بالرد: 120 ر.س مقطوع</span>
          </button>
        </div>
      </div>

      {/* Workflow Stepper Header */}
      <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 shadow-2xs overflow-x-auto">
        <div className="flex items-center justify-between min-w-[700px] gap-2 px-2">
          {STEPS.map((step, idx) => {
            const isCompleted = stepIndex > idx;
            const isCurrent = step.id === currentStep;
            const Icon = step.icon;

            return (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => setCurrentStep(step.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                    isCurrent
                      ? 'bg-amber-600 text-white shadow-xs'
                      : isCompleted
                      ? 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                      : 'bg-white text-stone-500 border border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isCurrent 
                      ? 'bg-white text-amber-700' 
                      : isCompleted 
                      ? 'bg-amber-600 text-white' 
                      : 'bg-stone-200 text-stone-600'
                  }`}>
                    {isCompleted ? <Check className="w-3 h-3" /> : step.number}
                  </span>
                  <Icon className="w-3.5 h-3.5" />
                  <span>{step.label}</span>
                </button>

                {idx < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 min-w-[12px] ${stepIndex > idx ? 'bg-amber-500' : 'bg-stone-200'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Step Content & Live Summary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left / Center: Active Step Form */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-xs min-h-[420px] flex flex-col justify-between">
            
            {/* ================= STEP 1: PROJECT ================= */}
            {currentStep === 'PROJECT' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
                  <Building2 className="w-5 h-5 text-amber-600" />
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">الخطوة 1: اختيار المشروع (Project)</h3>
                    <p className="text-xs text-stone-500">تحديد المشروع التابع له أمر التحميل لتطبيق لوائح العزل والتسعير</p>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <label className="block text-xs font-bold text-stone-700">مشروع العمل المعتمد</label>
                  <div className="grid grid-cols-1 gap-3">
                    {availableProjects.map(p => (
                      <div
                        key={p.id}
                        onClick={() => setProjectId(p.id)}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                          projectId === p.id 
                            ? 'border-amber-600 bg-amber-50/50' 
                            : 'border-stone-200 hover:border-stone-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            projectId === p.id ? 'border-amber-600 bg-amber-600' : 'border-stone-300'
                          }`}>
                            {projectId === p.id && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </span>
                          <div>
                            <div className="text-xs font-bold text-stone-900">{p.name}</div>
                            <div className="text-[11px] text-stone-500">معرّف المشروع: {p.id}</div>
                          </div>
                        </div>
                        <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          نشط ومعتمد
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ================= STEP 2: CARRIER ================= */}
            {currentStep === 'CARRIER' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
                  <Truck className="w-5 h-5 text-amber-600" />
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">الخطوة 2: اختيار الناقل المعتمد (Carrier)</h3>
                    <p className="text-xs text-stone-500">يقتصر الاختيار على شركات النقل المصرح لها بالعمل في المشروع</p>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <label className="block text-xs font-bold text-stone-700">شركات النقل المصرحة</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {availableCarriers.map(c => (
                      <div
                        key={c.carrierId}
                        onClick={() => {
                          setCarrierId(c.carrierId);
                          // Auto select first truck & driver for this carrier
                          const trk = context.knownTrucks.find(t => t.carrierId === c.carrierId);
                          if (trk) setTruckId(trk.truckId);
                          const drv = context.knownDrivers.find(d => d.carrierId === c.carrierId);
                          if (drv) setDriverId(drv.driverId);
                        }}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-2 ${
                          carrierId === c.carrierId 
                            ? 'border-amber-600 bg-amber-50/50 shadow-2xs' 
                            : 'border-stone-200 hover:border-stone-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-stone-900">{c.name}</span>
                          <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            carrierId === c.carrierId ? 'border-amber-600 bg-amber-600' : 'border-stone-300'
                          }`}>
                            {carrierId === c.carrierId && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-500">رمز الناقل: {c.carrierId}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ================= STEP 3: TRUCK ================= */}
            {currentStep === 'TRUCK' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
                  <Truck className="w-5 h-5 text-amber-600" />
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">الخطوة 3: اختيار الشاحنة (Truck)</h3>
                    <p className="text-xs text-stone-500">شاحنات أسطول الناقل التابعة للمشروع</p>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <label className="block text-xs font-bold text-stone-700">الشاحنات المتاحة للناقل المختار</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {availableTrucks.map(t => (
                      <div
                        key={t.truckId}
                        onClick={() => setTruckId(t.truckId)}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-2 ${
                          truckId === t.truckId 
                            ? 'border-amber-600 bg-amber-50/50 shadow-2xs' 
                            : 'border-stone-200 hover:border-stone-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-stone-900">{t.plate}</span>
                          <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            truckId === t.truckId ? 'border-amber-600 bg-amber-600' : 'border-stone-300'
                          }`}>
                            {truckId === t.truckId && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-stone-500">
                          <span>رقم الشاحنة: {t.truckId}</span>
                          <span className="font-mono text-stone-600">فحص دوري سارٍ</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ================= STEP 4: DRIVER ================= */}
            {currentStep === 'DRIVER' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
                  <User className="w-5 h-5 text-amber-600" />
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">الخطوة 4: اختيار السائق (Driver)</h3>
                    <p className="text-xs text-stone-500">السائقون المصرحون والمسجلون تحت الناقل والشاحنة</p>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <label className="block text-xs font-bold text-stone-700">السائقون المصرحون</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {availableDrivers.map(d => (
                      <div
                        key={d.driverId}
                        onClick={() => setDriverId(d.driverId)}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-2 ${
                          driverId === d.driverId 
                            ? 'border-amber-600 bg-amber-50/50 shadow-2xs' 
                            : 'border-stone-200 hover:border-stone-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-stone-900">{d.name}</span>
                          <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            driverId === d.driverId ? 'border-amber-600 bg-amber-600' : 'border-stone-300'
                          }`}>
                            {driverId === d.driverId && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </span>
                        </div>
                        <div className="space-y-0.5 text-[11px] text-stone-500">
                          <div>الهوية/الإقامة: <span className="font-mono text-stone-700">{d.idNumber}</span></div>
                          <div>الجوال: <span className="font-mono text-stone-700">{d.phone}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ================= STEP 5: MATERIAL ================= */}
            {currentStep === 'MATERIAL' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
                  <Boxes className="w-5 h-5 text-amber-600" />
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">الخطوة 5: اختيار المادة (Material)</h3>
                    <p className="text-xs text-stone-500">المواد المعتمدة للتوريد في موقع المشروع</p>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <label className="block text-xs font-bold text-stone-700">المواد المصرحة بالمشروع</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {availableMaterials.map(m => (
                      <div
                        key={m.materialId}
                        onClick={() => setMaterialId(m.materialId)}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-2 ${
                          materialId === m.materialId 
                            ? 'border-amber-600 bg-amber-50/50 shadow-2xs' 
                            : 'border-stone-200 hover:border-stone-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-stone-900">{m.name}</span>
                          <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            materialId === m.materialId ? 'border-amber-600 bg-amber-600' : 'border-stone-300'
                          }`}>
                            {materialId === m.materialId && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-500">كود المادة: <span className="font-mono text-stone-700">{m.code}</span></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ================= STEP 6: TARE ================= */}
            {currentStep === 'TARE' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
                  <Scale className="w-5 h-5 text-amber-600" />
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">الخطوة 6: وزن الشاحنة الفارغة (Tare Weight)</h3>
                    <p className="text-xs text-stone-500">قراءة ميزان الدخول بالمصدر (Scale In) بالكيلوجرام</p>
                  </div>
                </div>

                <div className="space-y-4 pt-2 max-w-lg">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5">
                      وزن الفارغ بالكيلوجرام (Tare Weight - KG)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={tareWeight}
                        onChange={e => setTareWeight(Math.max(0, Number(e.target.value)))}
                        className="w-full text-lg font-mono font-bold px-4 py-3 rounded-xl border border-stone-300 bg-white text-stone-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      />
                      <span className="absolute left-3 top-3.5 text-xs font-bold text-stone-400">KG</span>
                    </div>
                  </div>

                  {/* Fast simulator buttons */}
                  <div>
                    <span className="text-[11px] font-bold text-stone-500 block mb-1.5">أوزان فارغة نموذجية (محاكاة الميزان):</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setTareWeight(8200)}
                        className="px-2.5 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-mono font-bold"
                      >
                        8,200 كجم (تريلا خفيفة)
                      </button>
                      <button
                        type="button"
                        onClick={() => setTareWeight(14200)}
                        className="px-2.5 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-mono font-bold"
                      >
                        14,200 كجم (قلاب ثقيل)
                      </button>
                      <button
                        type="button"
                        onClick={() => setTareWeight(15000)}
                        className="px-2.5 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-mono font-bold"
                      >
                        15,000 كجم (رأس وتيدر)
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ================= STEP 7: GROSS ================= */}
            {currentStep === 'GROSS' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
                  <Scale className="w-5 h-5 text-amber-600" />
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">الخطوة 7: الوزن القائم للشاحنة (Gross Weight)</h3>
                    <p className="text-xs text-stone-500">قراءة ميزان الخروج بعد اكتمال تعبئة الحمولة (Scale Out) بالكيلوجرام</p>
                  </div>
                </div>

                <div className="space-y-4 pt-2 max-w-lg">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5">
                      الوزن القائم بالكيلوجرام (Gross Weight - KG)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={grossWeight}
                        onChange={e => setGrossWeight(Math.max(0, Number(e.target.value)))}
                        className="w-full text-lg font-mono font-bold px-4 py-3 rounded-xl border border-stone-300 bg-white text-stone-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      />
                      <span className="absolute left-3 top-3.5 text-xs font-bold text-stone-400">KG</span>
                    </div>
                  </div>

                  {/* Immediate dynamic calculation card */}
                  <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3.5 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-amber-800 font-medium">صافي الحمولة المحسوب فورياً (Net Weight):</div>
                      <div className="text-base font-mono font-bold text-amber-950">
                        {calculatedNetWeightKg.toLocaleString()} كجم ({netWeightTons} طن)
                      </div>
                    </div>
                    <span className="text-xs font-mono text-amber-700 bg-amber-100 px-2 py-1 rounded">
                      {grossWeight} - {tareWeight}
                    </span>
                  </div>

                  {/* Fast simulator buttons */}
                  <div>
                    <span className="text-[11px] font-bold text-stone-500 block mb-1.5">أوزان قائمة نموذجية:</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setGrossWeight(45600)}
                        className="px-2.5 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-mono font-bold"
                      >
                        45,600 كجم (صافي 37.4 طن)
                      </button>
                      <button
                        type="button"
                        onClick={() => setGrossWeight(42000)}
                        className="px-2.5 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-mono font-bold"
                      >
                        42,000 كجم (صافي 28 طن)
                      </button>
                      <button
                        type="button"
                        onClick={() => setGrossWeight(49800)}
                        className="px-2.5 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-mono font-bold"
                      >
                        49,800 كجم (صافي 35.6 طن)
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ================= STEP 8: PREVIEW & CONFIRM ================= */}
            {currentStep === 'PREVIEW' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-amber-600" />
                    <div>
                      <h3 className="text-sm font-bold text-stone-900">الخطوة 8: معاينة بطاقة التحميل والتسعير (Preview)</h3>
                      <p className="text-xs text-stone-500">
                        مراجعة صافي الوزن، نوع التسعير، السعر المتفق عليه، والتسوية التقديرية قبل التأكيد
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold flex items-center gap-1">
                    <Lock className="w-3 h-3 text-amber-700" />
                    <span>التسوية محمية رقابياً</span>
                  </span>
                </div>

                {/* 4 Core Summary Stat Tiles */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* 1. Net Weight */}
                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-3">
                    <div className="text-[11px] font-bold text-stone-500 mb-1">صافي الوزن (Net Weight)</div>
                    <div className="text-lg font-mono font-bold text-stone-900">
                      {netWeightTons} <span className="text-xs font-normal text-stone-500">طن</span>
                    </div>
                    <div className="text-[10px] text-stone-400 font-mono">
                      {calculatedNetWeightKg.toLocaleString()} كجم
                    </div>
                  </div>

                  {/* 2. Pricing Type */}
                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-3">
                    <div className="text-[11px] font-bold text-stone-500 mb-1">نوع التسعير (Pricing Type)</div>
                    <div className="text-sm font-bold text-stone-900">
                      {activePricingRule?.pricingType === 'PER_TON' ? 'بالطن (PER_TON)' : 'بالرد (PER_TRIP)'}
                    </div>
                    <div className="text-[10px] text-stone-500 truncate">
                      {activePricingRule?.name}
                    </div>
                  </div>

                  {/* 3. Agreed Rate */}
                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-3">
                    <div className="text-[11px] font-bold text-stone-500 mb-1">السعر المتفق عليه (Agreed Rate)</div>
                    <div className="text-lg font-mono font-bold text-stone-900">
                      {activePricingRule?.agreedRate.toFixed(2)}{' '}
                      <span className="text-xs font-normal text-stone-500">
                        {activePricingRule?.currency || 'SAR'} / {activePricingRule?.pricingType === 'PER_TON' ? 'طن' : 'رد'}
                      </span>
                    </div>
                    <div className="text-[10px] text-emerald-600 font-medium">سارٍ وموثق بالعقد</div>
                  </div>

                  {/* 4. Estimated Settlement */}
                  <div className="bg-amber-50 border border-amber-300 rounded-xl p-3">
                    <div className="text-[11px] font-bold text-amber-900 mb-1">التسوية التقديرية (Settlement)</div>
                    <div className="text-lg font-mono font-bold text-amber-950">
                      {estimatedSettlement.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                      <span className="text-xs font-normal text-amber-800">{estimatedSettlement.currency}</span>
                    </div>
                    <div className="text-[10px] text-amber-700 font-medium">محسوبة خادومياً بالكامل</div>
                  </div>
                </div>

                {/* Explicit Pricing Method Display (Requirement: يجب إظهار طريقة التسعير للمستخدم قبل التأكيد) */}
                <div className="bg-gradient-to-r from-amber-50 via-white to-amber-50 border-2 border-amber-300 rounded-xl p-4 shadow-2xs">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-amber-700" />
                      <span className="text-xs font-bold text-amber-950">طريقة احتساب التسعيرة المعتمدة قبل التأكيد:</span>
                    </div>
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-amber-200/60 text-amber-900">
                      {activePricingRule?.pricingType}
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-xs text-stone-600">المعادلة الحسابية المطبقة:</div>
                      <div className="text-base font-mono font-bold text-stone-900 mt-0.5">
                        {activePricingRule?.pricingType === 'PER_TON' ? (
                          <span>
                            {netWeightTons} طن × {activePricingRule.agreedRate} ر.س = <span className="text-amber-700">{estimatedSettlement.amount.toFixed(2)} ر.س</span>
                          </span>
                        ) : (
                          <span>
                            رد مقطوع بسعر ثابت = <span className="text-amber-700">{activePricingRule?.agreedRate.toFixed(2)} ر.س</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-stone-500 bg-stone-50 px-3 py-1.5 rounded-lg border border-stone-200">
                      <Lock className="w-3.5 h-3.5 text-stone-400" />
                      <span className="text-[11px]">ممنوع تعديل قيمة التسوية من الواجهة</span>
                    </div>
                  </div>

                  {/* Switch pricing rule selector if needed */}
                  {applicablePricingRules.length > 1 && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-[11px] font-bold text-stone-600">تبديل قاعدة التسعير للمقارنة:</span>
                      <select
                        value={activePricingRule?.pricingRuleId}
                        onChange={e => setPricingRuleId(e.target.value)}
                        className="text-xs border border-stone-200 rounded-lg px-2 py-1 bg-white font-medium text-stone-800"
                      >
                        {applicablePricingRules.map(r => (
                          <option key={r.pricingRuleId} value={r.pricingRuleId}>
                            {r.name} ({r.agreedRate} {r.currency} / {r.pricingType === 'PER_TON' ? 'طن' : 'رد'})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Warnings Card */}
                {warnings.length > 0 ? (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 space-y-1.5">
                    <div className="flex items-center gap-2 text-rose-900 text-xs font-bold">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>التنبيهات الرقابية والفحص المسبق (Warnings):</span>
                    </div>
                    <ul className="space-y-1 pr-5 list-disc text-xs text-rose-800">
                      {warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2 text-emerald-900 text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>تم اجتياز جميع الفحوصات الرقابية، الأوزان، وقواعد التسعير بنجاح تام!</span>
                  </div>
                )}

                {/* Success Result Box (if just created) */}
                {createdTripResult && (
                  <div className="bg-emerald-50 border-2 border-emerald-400 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-emerald-950 font-bold text-sm">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        <span>تم إنشاء وتأكيد أمر الرحلة بمحطة التحميل بنجاح!</span>
                      </div>
                      <span className="px-2.5 py-1 rounded bg-emerald-200 text-emerald-900 font-mono text-xs font-bold">
                        {createdTripResult.status} (v{createdTripResult.version})
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-white p-3 rounded-lg border border-emerald-200">
                      <div>
                        <span className="text-stone-500 block">رقم الرحلة:</span>
                        <span className="font-mono font-bold text-stone-900">{createdTripResult.tripSerial}</span>
                      </div>
                      <div>
                        <span className="text-stone-500 block">رقم التذكرة:</span>
                        <span className="font-mono font-bold text-stone-900">{createdTripResult.ticketId}</span>
                      </div>
                      <div>
                        <span className="text-stone-500 block">صافي الوزن المعتمد:</span>
                        <span className="font-mono font-bold text-stone-900">{createdTripResult.netWeight.toLocaleString()} كجم</span>
                      </div>
                      <div>
                        <span className="text-stone-500 block">التسوية المعتمدة:</span>
                        <span className="font-mono font-bold text-emerald-700">
                          {createdTripResult.settlementAmount.toFixed(2)} {createdTripResult.currency}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <div className="text-[11px] text-emerald-800">
                        تسلسل المحرك المنجز: <strong>createTrip()</strong> ➔ <strong>createEvent(LOADED)</strong> ➔ <strong>transition(IN_TRANSIT)</strong>
                      </div>
                      {onViewTripDetails && (
                        <button
                          onClick={() => onViewTripDetails(createdTripResult)}
                          className="mr-auto px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold transition-colors"
                        >
                          عرض تفاصيل الرحلة
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Bottom Step Actions */}
            <div className="border-t border-stone-100 pt-4 mt-6 flex items-center justify-between">
              <div>
                {stepIndex > 0 ? (
                  <button
                    onClick={goToPrevStep}
                    className="px-4 py-2 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <ArrowRight className="w-4 h-4" />
                    <span>السابق</span>
                  </button>
                ) : (
                  <div />
                )}
              </div>

              <div className="flex items-center gap-2">
                {createdTripResult && (
                  <button
                    onClick={resetForm}
                    className="px-3 py-2 rounded-lg border border-stone-300 text-stone-700 text-xs font-bold hover:bg-stone-50 transition-colors flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>إنشاء رحلة جديدة</span>
                  </button>
                )}

                {stepIndex < STEPS.length - 1 ? (
                  <button
                    onClick={goToNextStep}
                    className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
                  >
                    <span>التالي ({STEPS[stepIndex + 1].label})</span>
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleConfirmAndDispatch}
                    disabled={isSubmitting || grossWeight <= tareWeight}
                    className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-xs"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSubmitting ? 'جاري التأكيد والترحيل...' : 'تأكيد وترحيل الشحنة (Confirm & Dispatch)'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Live Loading Card & Audit Inspector */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-stone-900 text-white rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold">بطاقة الوزن المباشرة (Scale Slip)</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-stone-800 text-[10px] font-mono text-amber-300">
                LIVE SCALE
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-stone-800">
                <span className="text-stone-400">المشروع:</span>
                <span className="font-bold text-stone-200">PRJ-NEOM-001</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-stone-800">
                <span className="text-stone-400">الناقل:</span>
                <span className="font-bold text-stone-200">
                  {context.knownCarriers.find(c => c.carrierId === carrierId)?.name || carrierId}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-stone-800">
                <span className="text-stone-400">الشاحنة:</span>
                <span className="font-mono font-bold text-amber-300">
                  {context.knownTrucks.find(t => t.truckId === truckId)?.plate || truckId}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-stone-800">
                <span className="text-stone-400">السائق:</span>
                <span className="font-bold text-stone-200">
                  {context.knownDrivers.find(d => d.driverId === driverId)?.name || driverId}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-stone-800">
                <span className="text-stone-400">المادة:</span>
                <span className="font-bold text-stone-200">
                  {context.knownMaterials.find(m => m.materialId === materialId)?.name || materialId}
                </span>
              </div>
            </div>

            {/* Weights Breakdown */}
            <div className="bg-stone-800/80 rounded-lg p-3 space-y-2 font-mono text-xs">
              <div className="flex justify-between text-stone-300">
                <span>الوزن القائم (Gross):</span>
                <span>{grossWeight.toLocaleString()} KG</span>
              </div>
              <div className="flex justify-between text-stone-400">
                <span>وزن الفارغ (Tare):</span>
                <span>- {tareWeight.toLocaleString()} KG</span>
              </div>
              <div className="border-t border-stone-700 pt-1.5 flex justify-between font-bold text-amber-400 text-sm">
                <span>صافي الحمولة (Net):</span>
                <span>{calculatedNetWeightKg.toLocaleString()} KG</span>
              </div>
              <div className="text-left text-[11px] text-stone-400">
                ({netWeightTons} Metric Tons)
              </div>
            </div>

            {/* Settlement Lock Badge */}
            <div className="bg-amber-950/40 border border-amber-800/60 rounded-lg p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-amber-400 text-[11px] font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>حماية التسوية الآلية</span>
              </div>
              <p className="text-[10px] text-stone-300 leading-relaxed">
                يتم احتساب تسوية الرحلة ({estimatedSettlement.amount.toFixed(2)} {estimatedSettlement.currency}) برمجياً بناءً على صافي الوزن المعتمد وسعر العقد. لا يُسمح بإدخال أو تعديل القيمة من الواجهة لضمان الشفافية المحاسبية.
              </p>
            </div>
          </div>

          {/* Workflow Sequence Info Box */}
          <div className="bg-white border border-stone-200 rounded-xl p-4 text-xs space-y-2 text-stone-700">
            <div className="font-bold text-stone-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>تسلسل المحرك بعد التأكيد:</span>
            </div>
            <ol className="space-y-1 pr-4 list-decimal text-[11px] text-stone-600">
              <li><strong>createTrip()</strong>: إنشاء سجل الرحلة بحالة التحميل المبدئية.</li>
              <li><strong>createEvent(LOADED)</strong>: تسجيل حدث توثيق الأوزان بالميزان.</li>
              <li><strong>transition(IN_TRANSIT)</strong>: فحص وحل التسعيرة التاريخية والتحول لحالة في الطريق.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};
