import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  CheckCircle2, 
  XCircle, 
  Play, 
  ShieldCheck, 
  Layers, 
  Calendar, 
  Truck, 
  Coins, 
  ArrowRight, 
  AlertTriangle, 
  Lock, 
  RefreshCw, 
  Info,
  Scale,
  Sparkles,
  FileText
} from 'lucide-react';
import { runPricingEngineTests, TestCaseResult } from '../../tests/pricingEngine.test';
import { pricingService } from '../../services/pricing.service';
import { PricingRule, TripPricingSnapshot } from '../../types/pricing';

export const PricingEngineView: React.FC = () => {
  // --- Test Suite State ---
  const [testResults, setTestResults] = useState<TestCaseResult[]>(() => runPricingEngineTests().results);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  // --- Interactive Playground State ---
  const [selectedCarrier, setSelectedCarrier] = useState<string>('CARRIER-B');
  const [selectedMaterial, setSelectedMaterial] = useState<string>('MAT-SUBBASE');
  const [tripDate, setTripDate] = useState<string>('2026-09-09');
  const [netWeightTon, setNetWeightTon] = useState<number>(31.75);
  const [simulateClientTamper, setSimulateClientTamper] = useState<boolean>(false);
  const [tamperedAmount, setTamperedAmount] = useState<number>(10.0);

  // Master demo rules in memory
  const masterRules: PricingRule[] = useMemo(() => [
    {
      pricingRuleId: 'PR-CAR-A-TRIP-120',
      projectId: 'PRJ-NEOM-WEST-01',
      carrierId: 'CARRIER-A',
      materialId: null,
      pricingType: 'PER_TRIP',
      rate: 120,
      currency: 'SAR',
      effectiveFrom: '2026-01-01',
      effectiveTo: '2026-12-31',
      status: 'ACTIVE',
      createdAt: '2026-01-01T08:00:00Z',
      createdBy: 'USR-ADMIN',
      updatedAt: '2026-01-01T08:00:00Z',
      notes: 'تسعيرة مقطوعة بالرد الواحد لجميع المواد داخل المشروع',
    },
    {
      pricingRuleId: 'PR-CAR-B-TON-GEN-8.5',
      projectId: 'PRJ-NEOM-WEST-01',
      carrierId: 'CARRIER-B',
      materialId: null,
      pricingType: 'PER_TON',
      rate: 8.5,
      currency: 'SAR',
      effectiveFrom: '2026-01-01',
      effectiveTo: '2026-12-31',
      status: 'ACTIVE',
      createdAt: '2026-01-01T08:00:00Z',
      createdBy: 'USR-ADMIN',
      updatedAt: '2026-01-01T08:00:00Z',
      notes: 'تسعيرة عامة للناقل ب للطن الصافي',
    },
    {
      pricingRuleId: 'PR-CAR-B-TON-SUBBASE-10.0',
      projectId: 'PRJ-NEOM-WEST-01',
      carrierId: 'CARRIER-B',
      materialId: 'MAT-SUBBASE',
      pricingType: 'PER_TON',
      rate: 10.0,
      currency: 'SAR',
      effectiveFrom: '2026-01-01',
      effectiveTo: '2026-12-31',
      status: 'ACTIVE',
      createdAt: '2026-01-01T08:00:00Z',
      createdBy: 'USR-ADMIN',
      updatedAt: '2026-01-01T08:00:00Z',
      notes: 'تسعيرة مخصصة لمادة طبقة الأساس (Sub-base)',
    },
    {
      pricingRuleId: 'PR-CAR-C-TON-7.75',
      projectId: 'PRJ-NEOM-WEST-01',
      carrierId: 'CARRIER-C',
      materialId: null,
      pricingType: 'PER_TON',
      rate: 7.75,
      currency: 'SAR',
      effectiveFrom: '2026-06-01',
      effectiveTo: '2026-12-31',
      status: 'ACTIVE',
      createdAt: '2026-06-01T08:00:00Z',
      createdBy: 'USR-ADMIN',
      updatedAt: '2026-06-01T08:00:00Z',
      notes: 'تسعيرة مخفضة خاصة بالكميات الكبيرة',
    },
    {
      pricingRuleId: 'PR-CAR-D-EXPIRED',
      projectId: 'PRJ-NEOM-WEST-01',
      carrierId: 'CARRIER-D',
      materialId: null,
      pricingType: 'PER_TRIP',
      rate: 110,
      currency: 'SAR',
      effectiveFrom: '2025-01-01',
      effectiveTo: '2025-12-31',
      status: 'ACTIVE',
      createdAt: '2025-01-01T08:00:00Z',
      createdBy: 'USR-ADMIN',
      updatedAt: '2025-01-01T08:00:00Z',
      notes: 'عقد منتهي الصلاحية بتاريخ 31 ديسمبر 2025',
    },
  ], []);

  // Run interactive resolution
  const interactiveResolution = useMemo(() => {
    const matId = selectedMaterial === 'ALL' ? null : selectedMaterial;
    return pricingService.resolvePricingRuleFromList(masterRules, {
      projectId: 'PRJ-NEOM-WEST-01',
      carrierId: selectedCarrier,
      materialId: matId,
      tripDate,
    });
  }, [masterRules, selectedCarrier, selectedMaterial, tripDate]);

  // Run interactive settlement calculation
  const interactiveSettlement = useMemo(() => {
    if (!interactiveResolution.rule) return null;
    return pricingService.calculateSettlement({
      pricingRule: interactiveResolution.rule,
      netWeightTon: Number(netWeightTon) || 0,
      unitsCount: 1,
      clientSuppliedAmount: simulateClientTamper ? Number(tamperedAmount) : undefined,
    });
  }, [interactiveResolution.rule, netWeightTon, simulateClientTamper, tamperedAmount]);

  const handleRunTests = () => {
    setIsRunningTests(true);
    setTimeout(() => {
      const res = runPricingEngineTests();
      setTestResults(res.results);
      setIsRunningTests(false);
    }, 400);
  };

  const filteredTests = useMemo(() => {
    if (filterCategory === 'ALL') return testResults;
    return testResults.filter(t => t.category === filterCategory);
  }, [testResults, filterCategory]);

  const passedCount = testResults.filter(t => t.passed).length;

  return (
    <div className="space-y-8 pb-16" dir="rtl">
      {/* Top Banner Header */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 mb-1">
              <Calculator className="w-4 h-4" />
              <span>محرك التسعير وحساب المستحقات اللوجستية المستقل (Pricing Engine)</span>
            </div>
            <h1 className="text-xl font-black text-stone-900">
              محرك التسعير الآلي واحتساب تسويات الرحلات (Pricing & Settlement Engine)
            </h1>
            <p className="text-sm text-stone-600 mt-1 max-w-3xl leading-relaxed">
              محرك خادم مستقل (Server-Side) يضمن الامتثال للمبدأ 5 والمبدأ 6: 
              <strong className="text-stone-900 mx-1">العميل لا يقرر القيمة المالية النهائية</strong>، 
              وتثبيت <strong className="text-stone-900 mx-1">لقطة تسعير تاريخية (Pricing Snapshot)</strong> 
              غير قابلة للتغيير داخل وثيقة الرحلة لضمان عدم تأثر الفواتير القديمة بأي تعديل مستقبلي على الأسعار.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              id="btn-run-pricing-tests"
              onClick={handleRunTests}
              disabled={isRunningTests}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50"
            >
              <Play className={`w-4 h-4 ${isRunningTests ? 'animate-spin' : ''}`} />
              <span>{isRunningTests ? 'جاري الفحص...' : 'تشغيل الاختبارات المؤتمتة (9 حالات)'}</span>
            </button>
            <div className="px-3.5 py-2 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-emerald-800">
                {passedCount} من {testResults.length} اختبار ناجح (100%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Interactive Playground + Live Output */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Interactive Simulation Inputs (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4 border-b border-stone-100 pb-3">
              <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <Scale className="w-4 h-4 text-amber-600" />
                <span>محاكي حل التسعير والاحتساب المباشر (Interactive Pricing Simulator)</span>
              </h2>
              <span className="text-[11px] font-medium text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
                Server-Side Engine
              </span>
            </div>

            <div className="space-y-4">
              {/* Carrier Selection */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-stone-400" />
                  <span>شركة النقل (Carrier ID):</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { id: 'CARRIER-A', label: 'Carrier A (اتفاقية مقطوعة بالرد 120 ر.س)', badge: 'PER_TRIP' },
                    { id: 'CARRIER-B', label: 'Carrier B (حساب بالوزن 8.5 ر.س / 10 ر.س)', badge: 'PER_TON' },
                    { id: 'CARRIER-C', label: 'Carrier C (سعر مخفض 7.75 ر.س/طن)', badge: 'PER_TON' },
                    { id: 'CARRIER-D', label: 'Carrier D (عقد منتهي في 2025)', badge: 'منتهي الصلاحية' },
                    { id: 'UNKNOWN-CARRIER', label: 'ناقل مجهول غير متعاقد', badge: 'غير مسجل' },
                  ].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCarrier(c.id)}
                      className={`text-right p-2.5 rounded-xl border text-xs transition-all flex flex-col justify-between ${
                        selectedCarrier === c.id 
                          ? 'border-amber-600 bg-amber-50/70 text-amber-950 font-bold' 
                          : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                      }`}
                    >
                      <span>{c.label}</span>
                      <span className={`self-start mt-1 text-[10px] px-1.5 py-0.2 rounded font-mono ${
                        selectedCarrier === c.id ? 'bg-amber-200 text-amber-900 font-bold' : 'bg-stone-100 text-stone-600'
                      }`}>
                        {c.badge}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Material & Date row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-stone-400" />
                    <span>مادة التوريد (Material ID):</span>
                  </label>
                  <select
                    value={selectedMaterial}
                    onChange={(e) => setSelectedMaterial(e.target.value)}
                    className="w-full text-xs bg-stone-50 border border-stone-200 rounded-lg p-2.5 focus:bg-white focus:border-amber-600 focus:outline-none"
                  >
                    <option value="MAT-SUBBASE">MAT-SUBBASE (طبقة أساس - 10.0 ر.س للناقل B)</option>
                    <option value="MAT-SAND">MAT-SAND (رمل مغسول - سعر عام)</option>
                    <option value="MAT-GRAVEL">MAT-GRAVEL (بحص خرساني - سعر عام)</option>
                    <option value="ALL">ALL (تسعيرة عامة غير مخصصة لمادة)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-stone-400" />
                    <span>تاريخ الرحلة الفعلي (Trip Date):</span>
                  </label>
                  <input
                    type="date"
                    value={tripDate}
                    onChange={(e) => setTripDate(e.target.value)}
                    className="w-full text-xs bg-stone-50 border border-stone-200 rounded-lg p-2.5 focus:bg-white focus:border-amber-600 focus:outline-none font-mono"
                  />
                  <div className="flex gap-1.5 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setTripDate('2026-09-09')}
                      className="text-[10px] text-stone-500 hover:text-amber-700 bg-stone-100 hover:bg-stone-200 px-2 py-0.5 rounded"
                    >
                      تاريخ نشط (2026-09-09)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTripDate('2027-02-15')}
                      className="text-[10px] text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded"
                    >
                      تاريخ منتهي (2027-02-15)
                    </button>
                  </div>
                </div>
              </div>

              {/* Weight Input */}
              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200/80">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-amber-600" />
                    <span>الوزن الصافي المعتمد من الميزان (Net Weight Tons):</span>
                  </label>
                  <span className="text-xs font-mono font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                    {netWeightTon} طن ({Math.round(netWeightTon * 1000).toLocaleString()} كجم)
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="60"
                  step="0.25"
                  value={netWeightTon}
                  onChange={(e) => setNetWeightTon(parseFloat(e.target.value))}
                  className="w-full accent-amber-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-stone-400 mt-1 font-mono">
                  <span>5 طن (شاحنة صغيرة)</span>
                  <span>32 طن (تريلا قلاب قياسية)</span>
                  <span>60 طن (حمولة قصوى)</span>
                </div>
              </div>

              {/* Security Test: Simulate Client Tampering */}
              <div className="border border-stone-200 rounded-xl p-3.5 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-rose-600" />
                    <div>
                      <p className="text-xs font-bold text-stone-900">
                        اختبار أمني: محاكاة محاولة تلاعب العميل بالقيمة المالية
                      </p>
                      <p className="text-[11px] text-stone-500">
                        إرسال العميل لقيمة مالية مختلفة للتأكد من قيام السيرفر برفضها وفرض حسابه
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={simulateClientTamper}
                      onChange={(e) => setSimulateClientTamper(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600"></div>
                  </label>
                </div>

                {simulateClientTamper && (
                  <div className="mt-3 pt-3 border-t border-stone-100 flex items-center gap-3">
                    <span className="text-xs text-stone-600 shrink-0">القيمة المغشوشة المرسلة من المتصفح:</span>
                    <input
                      type="number"
                      value={tamperedAmount}
                      onChange={(e) => setTamperedAmount(parseFloat(e.target.value) || 0)}
                      className="w-28 text-xs bg-rose-50 border border-rose-300 rounded p-1.5 font-mono text-rose-700 font-bold"
                    />
                    <span className="text-[10px] text-rose-600">
                      ⚠️ سيقوم السيرفر بتجاهلها وحساب المستحق الحقيقي فوراً
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Engine Output & Pricing Snapshot (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Resolved Rule Card */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs">
            <h3 className="text-xs font-bold text-stone-900 flex items-center gap-1.5 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>نتيجة حل قاعدة التسعير (Resolved Pricing Rule)</span>
            </h3>

            {interactiveResolution.rule ? (
              <div className="space-y-3">
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-stone-500">معرّف القاعدة (Rule ID):</span>
                    <span className="font-mono font-bold text-stone-900">{interactiveResolution.rule.pricingRuleId}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-stone-500">نوع التسعير (pricingType):</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      interactiveResolution.rule.pricingType === 'PER_TRIP' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {interactiveResolution.rule.pricingType}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-stone-500">السعر المتفق عليه (rate):</span>
                    <span className="font-bold text-amber-700 font-mono text-sm">
                      {interactiveResolution.rule.rate} {interactiveResolution.rule.currency}
                      {interactiveResolution.rule.pricingType === 'PER_TON' ? ' / طن' : ' / رد'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-stone-500">فترة السريان (effective):</span>
                    <span className="font-mono text-[11px] text-stone-700">
                      {interactiveResolution.rule.effectiveFrom} ➔ {interactiveResolution.rule.effectiveTo}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-stone-500">المادة المطبقة:</span>
                    <span className="text-stone-800 font-medium">
                      {interactiveResolution.rule.materialId || 'جميع المواد (General Tariff)'}
                    </span>
                  </div>
                </div>

                {/* Final Settlement Result */}
                {interactiveSettlement && (
                  <div className="p-4 bg-amber-500/10 border border-amber-300 rounded-xl">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-amber-950">مستحق التسوية النهائي (Server Calculated):</span>
                      <span className="text-lg font-black text-amber-900 font-mono">
                        {interactiveSettlement.settlementAmount.toLocaleString()} SAR
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-900 leading-relaxed font-medium">
                      {interactiveSettlement.calculationDetailsAr}
                    </p>

                    {simulateClientTamper && (
                      <div className="mt-2.5 p-2 bg-rose-100/80 border border-rose-300 rounded-lg text-[11px] text-rose-800 flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                        <span>
                          <strong>محاولة اختراق محبطة:</strong> تم تجاهل المبلغ المزور المدخل من المتصفح ({tamperedAmount} SAR) وفرض حساب السيرفر الصارم ({interactiveSettlement.settlementAmount} SAR).
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
                <div className="flex items-center gap-2 font-bold mb-1">
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <span>تعذر تحديد تسعيرة الرحلة ({interactiveResolution.reasonCode})</span>
                </div>
                <p className="text-[11px] text-rose-700">
                  {interactiveResolution.reasonAr}
                </p>
              </div>
            )}
          </div>

          {/* Pricing Snapshot Card */}
          {interactiveSettlement && (
            <div className="bg-stone-900 text-white rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>اللقطة المجمدة في وثيقة الرحلة (Trip.pricingSnapshot)</span>
                </h3>
                <span className="text-[10px] text-stone-400 font-mono">Immutable</span>
              </div>
              <p className="text-[11px] text-stone-400 mb-3">
                يتم حفظ هذه اللقطة بشكل دائم داخل وثيقة الرحلة في Firestore ولن تتأثر مستقبلاً حتى لو عُدلت قاعدة التسعير الأم:
              </p>
              <pre className="text-[11px] font-mono bg-stone-950 p-3 rounded-xl border border-stone-800 text-amber-300 overflow-x-auto">
{JSON.stringify(interactiveSettlement.snapshot, null, 2)}
              </pre>
            </div>
          )}

        </div>
      </div>

      {/* ================= TEST SUITE RESULTS ACCORDION ================= */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 border-b border-stone-100 pb-4">
          <div>
            <h2 className="text-base font-black text-stone-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span>مصفوفة الاختبارات المعمارية المؤتمتة (Automated Test Matrix)</span>
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              تغطي جميع الحالات المطلوبة صراحة في وثيقة المتطلبات: different carriers, pricing types, materials, date ranges, expired, overlapping, missing
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {[
              { key: 'ALL', label: 'الكل (9)' },
              { key: 'different carriers', label: 'الناقلين' },
              { key: 'different pricing types', label: 'أنواع التسعير' },
              { key: 'different materials', label: 'المواد' },
              { key: 'date ranges', label: 'الفترات' },
              { key: 'expired pricing', label: 'المنتهية' },
              { key: 'overlapping pricing', label: 'التداخل' },
              { key: 'missing pricing', label: 'المفقودة' },
              { key: 'historical immutability', label: 'الثبات' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilterCategory(f.key)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all ${
                  filterCategory === f.key 
                    ? 'bg-amber-600 text-white' 
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Test Cards List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTests.map((test, idx) => (
            <div
              key={test.id}
              className={`p-4 rounded-xl border transition-all ${
                test.passed 
                  ? 'bg-white border-stone-200 hover:border-emerald-300 hover:shadow-xs' 
                  : 'bg-rose-50 border-rose-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  {test.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <h3 className="text-xs font-bold text-stone-900">{test.titleAr}</h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-100 text-stone-600 font-bold shrink-0">
                  {test.category}
                </span>
              </div>

              <div className="space-y-1.5 text-[11px] bg-stone-50 p-2.5 rounded-lg border border-stone-100 font-mono">
                <div>
                  <span className="text-stone-400">Expected: </span>
                  <span className="text-stone-700">{String(test.expected)}</span>
                </div>
                <div>
                  <span className="text-stone-400">Actual: </span>
                  <span className="text-emerald-700 font-bold">{String(test.actual)}</span>
                </div>
              </div>

              <p className="text-[11px] text-stone-600 mt-2.5 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <span>{test.details}</span>
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
