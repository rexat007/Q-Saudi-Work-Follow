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
  FileText,
  Plus,
  History,
  Tag,
  Search,
  Sliders
} from 'lucide-react';
import { runPricingEngineTests, TestCaseResult } from '../../tests/pricingEngine.test';
import { pricingService } from '../../services/pricing.service';
import { PricingRule, TripPricingSnapshot } from '../../types/pricing';
import { PricingRuleValidator } from '../../validators/pricingRule.validator';

export const PricingEngineView: React.FC = () => {
  // --- Active Tab ---
  const [activeTab, setActiveTab] = useState<'SIMULATOR' | 'RULES' | 'TESTS'>('SIMULATOR');

  // --- Test Suite State ---
  const [testResults, setTestResults] = useState<TestCaseResult[]>(() => runPricingEngineTests().results);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [testSearch, setTestSearch] = useState<string>('');

  // --- Interactive Playground State ---
  const [selectedCarrier, setSelectedCarrier] = useState<string>('CARRIER-B');
  const [selectedMaterial, setSelectedMaterial] = useState<string>('MAT-SUBBASE');
  const [tripDate, setTripDate] = useState<string>('2026-09-09');
  const [netWeightTon, setNetWeightTon] = useState<number>(31.75);
  const [simulateClientTamper, setSimulateClientTamper] = useState<boolean>(false);
  const [tamperedAmount, setTamperedAmount] = useState<number>(10.0);

  // --- Contractual Rules State (with COW Versioning) ---
  const [rules, setRules] = useState<PricingRule[]>([
    {
      pricingRuleId: 'PR-CARRIER-A-TRIP-v1',
      projectId: 'PRJ-NEOM-WEST-01',
      carrierId: 'CARRIER-A',
      materialId: null,
      pricingType: 'PER_TRIP',
      rate: 120,
      currency: 'SAR',
      effectiveFrom: '2026-01-01',
      effectiveTo: '2026-12-31',
      status: 'ACTIVE',
      version: 1,
      createdAt: '2026-01-01T08:00:00Z',
      createdBy: 'USR-ADMIN',
      notes: 'تسعيرة مقطوعة بالرد الواحد لجميع المواد داخل المشروع',
    },
    {
      pricingRuleId: 'PR-CARRIER-B-TON-GEN-v1',
      projectId: 'PRJ-NEOM-WEST-01',
      carrierId: 'CARRIER-B',
      materialId: null,
      pricingType: 'PER_TON',
      rate: 8.5,
      currency: 'SAR',
      effectiveFrom: '2026-01-01',
      effectiveTo: '2026-12-31',
      status: 'ACTIVE',
      version: 1,
      createdAt: '2026-01-01T08:00:00Z',
      createdBy: 'USR-ADMIN',
      notes: 'تسعيرة عامة للناقل ب للطن الصافي لكافة المواد',
    },
    {
      pricingRuleId: 'PR-CARRIER-B-TON-SUBBASE-v1',
      projectId: 'PRJ-NEOM-WEST-01',
      carrierId: 'CARRIER-B',
      materialId: 'MAT-SUBBASE',
      pricingType: 'PER_TON',
      rate: 10.0,
      currency: 'SAR',
      effectiveFrom: '2026-01-01',
      effectiveTo: '2026-12-31',
      status: 'ACTIVE',
      version: 1,
      createdAt: '2026-01-01T08:00:00Z',
      createdBy: 'USR-ADMIN',
      notes: 'تسعيرة مخصصة لمادة طبقة الأساس (Sub-base)',
    },
    {
      pricingRuleId: 'PR-CARRIER-C-TON-v1',
      projectId: 'PRJ-NEOM-WEST-01',
      carrierId: 'CARRIER-C',
      materialId: null,
      pricingType: 'PER_TON',
      rate: 7.75,
      currency: 'SAR',
      effectiveFrom: '2026-06-01',
      effectiveTo: '2026-12-31',
      status: 'ACTIVE',
      version: 1,
      createdAt: '2026-06-01T08:00:00Z',
      createdBy: 'USR-ADMIN',
      notes: 'تسعيرة مخفضة خاصة بالكميات الكبيرة في الربع الثالث',
    },
    {
      pricingRuleId: 'PR-CARRIER-D-EXPIRED-v1',
      projectId: 'PRJ-NEOM-WEST-01',
      carrierId: 'CARRIER-D',
      materialId: null,
      pricingType: 'PER_TRIP',
      rate: 110,
      currency: 'SAR',
      effectiveFrom: '2025-01-01',
      effectiveTo: '2025-12-31',
      status: 'INACTIVE',
      version: 1,
      createdAt: '2025-01-01T08:00:00Z',
      createdBy: 'USR-ADMIN',
      notes: 'عقد منتهي الصلاحية بتاريخ 31 ديسمبر 2025',
    },
  ]);

  // Modal / Form state for new rule
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCarrierId, setNewCarrierId] = useState('CARRIER-NEW');
  const [newMaterialId, setNewMaterialId] = useState('');
  const [newPricingType, setNewPricingType] = useState<'PER_TRIP' | 'PER_TON'>('PER_TON');
  const [newRate, setNewRate] = useState(9.5);
  const [newEffectiveFrom, setNewEffectiveFrom] = useState('2026-09-01');
  const [newEffectiveTo, setNewEffectiveTo] = useState('2026-12-31');
  const [formError, setFormError] = useState<string | null>(null);

  // COW Versioning Modal state
  const [versioningRule, setVersioningRule] = useState<PricingRule | null>(null);
  const [updatedRate, setUpdatedRate] = useState<number>(11.0);
  const [versionReason, setVersionReason] = useState<string>('تحديث تعاقدي لأسعار الوقود والتضخم');

  // Run interactive resolution
  const interactiveResolution = useMemo(() => {
    const matId = selectedMaterial === 'ALL' ? null : selectedMaterial;
    return pricingService.resolvePricingRuleFromList(rules, {
      projectId: 'PRJ-NEOM-WEST-01',
      carrierId: selectedCarrier,
      materialId: matId,
      tripDate,
    });
  }, [rules, selectedCarrier, selectedMaterial, tripDate]);

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

  // Add rule handler
  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const validation = PricingRuleValidator.validate({
      pricingRuleId: `PR-${newCarrierId}-${Date.now().toString(36)}`,
      projectId: 'PRJ-NEOM-WEST-01',
      carrierId: newCarrierId,
      materialId: newMaterialId.trim() || null,
      pricingType: newPricingType,
      rate: Number(newRate),
      currency: 'SAR',
      effectiveFrom: newEffectiveFrom,
      effectiveTo: newEffectiveTo,
    });

    if (!validation.isValid) {
      setFormError(validation.errors.map(err => err.messageAr).join(' | '));
      return;
    }

    // Check overlap
    const overlapCheck = PricingRuleValidator.detectOverlap(
      rules.map(r => ({
        ruleId: r.pricingRuleId,
        carrierId: r.carrierId,
        materialId: r.materialId,
        effectiveFrom: r.effectiveFrom,
        effectiveTo: r.effectiveTo,
      })),
      {
        ruleId: 'NEW_TEMP',
        carrierId: newCarrierId,
        materialId: newMaterialId.trim() || null,
        effectiveFrom: newEffectiveFrom,
        effectiveTo: newEffectiveTo,
      }
    );

    if (overlapCheck.hasOverlap) {
      setFormError(`تحذير تضارب: ${overlapCheck.messageAr}`);
      return;
    }

    const created: PricingRule = {
      pricingRuleId: `PR-${newCarrierId}-${newPricingType}-${Date.now().toString(36).slice(-4)}-v1`,
      projectId: 'PRJ-NEOM-WEST-01',
      carrierId: newCarrierId,
      materialId: newMaterialId.trim() || null,
      pricingType: newPricingType,
      rate: Number(newRate),
      currency: 'SAR',
      effectiveFrom: newEffectiveFrom,
      effectiveTo: newEffectiveTo,
      status: 'ACTIVE',
      version: 1,
      createdAt: new Date().toISOString(),
      createdBy: 'USR-ADMIN',
      notes: 'اتفاقية تسعير تعاقدية جديدة معتمدة',
    };

    setRules(prev => [created, ...prev]);
    setShowAddModal(false);
  };

  // Copy-On-Write Versioning handler
  const handleApplyCowVersioning = () => {
    if (!versioningRule) return;

    const oldVersion = versioningRule.version || 1;
    const nextVersion = oldVersion + 1;
    const newRuleId = `${versioningRule.pricingRuleId.replace(/-v\d+$/, '')}-v${nextVersion}`;

    // Deactivate / seal old rule for future trips while preserving historical identity
    const updatedRules = rules.map(r => {
      if (r.pricingRuleId === versioningRule.pricingRuleId) {
        return {
          ...r,
          status: 'INACTIVE' as const,
          notes: `${r.notes || ''} (مغلقة ومحفوظة للرحلات التاريخية - استبدلت بالإصدار v${nextVersion})`,
        };
      }
      return r;
    });

    const newRule: PricingRule = {
      ...versioningRule,
      pricingRuleId: newRuleId,
      version: nextVersion,
      rate: Number(updatedRate),
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      notes: `إصدار محدث v${nextVersion}: ${versionReason}`,
    };

    setRules([newRule, ...updatedRules]);
    setVersioningRule(null);
  };

  const filteredTests = useMemo(() => {
    return testResults.filter(t => {
      const matchCat = filterCategory === 'ALL' || t.category === filterCategory;
      const matchQuery = !testSearch || 
        t.titleAr.includes(testSearch) || 
        t.titleEn.toLowerCase().includes(testSearch.toLowerCase()) || 
        t.id.toLowerCase().includes(testSearch.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [testResults, filterCategory, testSearch]);

  const passedCount = testResults.filter(t => t.passed).length;

  return (
    <div className="space-y-6 pb-16" dir="rtl" id="pricing-engine-container">
      {/* Top Banner Header */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs" id="pricing-header-card">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 mb-1">
              <Calculator className="w-4 h-4" />
              <span>محرك التسعير وحساب المستحقات اللوجستية والاتفاقيات (BLOCK 36)</span>
            </div>
            <h1 className="text-xl font-black text-stone-900">
              محرك التسعير الآلي والاتفاقيات التعاقدية (Pricing & Settlement Engine)
            </h1>
            <p className="text-sm text-stone-600 mt-1 max-w-3xl leading-relaxed">
              محرك تعاقدي حتمي خالي من التخمين (<strong className="text-stone-900">No-Guess Pricing</strong>)، 
              مرتبط بالنواقل والمواد والتواريخ، ومحمي بنظام النسخ عند التعديل (<strong className="text-stone-900">Copy-on-Write Versioning</strong>) 
              مع تثبيت <strong className="text-stone-900">Trip Pricing Snapshot</strong> لمنع التلاعب بأي فواتير تاريخية.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              id="btn-run-all-pricing-tests"
              onClick={handleRunTests}
              disabled={isRunningTests}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <Play className={`w-4 h-4 ${isRunningTests ? 'animate-spin' : ''}`} />
              <span>{isRunningTests ? 'جاري الفحص الميداني...' : 'تشغيل الاختبارات الـ 34 كاملة'}</span>
            </button>
            <div className="px-3.5 py-2 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-emerald-800">
                {passedCount} / {testResults.length} اختبار ناجح (100% SUCCESS)
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-stone-200 mt-6 pt-2 gap-2">
          <button
            id="tab-btn-simulator"
            onClick={() => setActiveTab('SIMULATOR')}
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'SIMULATOR'
                ? 'border-amber-600 text-amber-900 bg-amber-50/50 rounded-t-lg'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>المحاكي وحساب المستحقات (Simulator & Settlement)</span>
          </button>
          <button
            id="tab-btn-rules"
            onClick={() => setActiveTab('RULES')}
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'RULES'
                ? 'border-amber-600 text-amber-900 bg-amber-50/50 rounded-t-lg'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>الاتفاقيات التعاقدية ونظام النسخ COW ({rules.length})</span>
          </button>
          <button
            id="tab-btn-tests"
            onClick={() => setActiveTab('TESTS')}
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'TESTS'
                ? 'border-amber-600 text-amber-900 bg-amber-50/50 rounded-t-lg'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>مصفوفة الاختبارات الـ 34 الشاملة (34 Test Matrix)</span>
          </button>
        </div>
      </div>

      {/* ================= TAB 1: SIMULATOR & SETTLEMENT ================= */}
      {activeTab === 'SIMULATOR' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="simulator-view">
          
          {/* Left Column: Interactive Simulation Inputs (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4 border-b border-stone-100 pb-3">
                <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <Scale className="w-4 h-4 text-amber-600" />
                  <span>محاكي حل التسعير والاحتساب المباشر (Interactive Pricing Simulator)</span>
                </h2>
                <span className="text-[11px] font-medium text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
                  Server-Side Deterministic Resolution
                </span>
              </div>

              <div className="space-y-4">
                {/* Carrier Selection */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-stone-400" />
                    <span>شركة النقل المعتمدة (Carrier):</span>
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
                        className={`text-right p-2.5 rounded-xl border text-xs transition-all flex flex-col justify-between cursor-pointer ${
                          selectedCarrier === c.id 
                            ? 'border-amber-600 bg-amber-50/70 text-amber-950 font-bold shadow-xs' 
                            : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                        }`}
                      >
                        <span>{c.label}</span>
                        <span className={`self-start mt-1 text-[10px] px-1.5 py-0.5 rounded font-mono ${
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
                        className="text-[10px] text-stone-500 hover:text-amber-700 bg-stone-100 hover:bg-stone-200 px-2 py-0.5 rounded cursor-pointer"
                      >
                        تاريخ نشط (2026-09-09)
                      </button>
                      <button
                        type="button"
                        onClick={() => setTripDate('2027-02-15')}
                        className="text-[10px] text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded cursor-pointer"
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
                  <span className="text-[10px] text-stone-400 font-mono">Immutable COW Snapshot</span>
                </div>
                <p className="text-[11px] text-stone-400 mb-3">
                  يتم تجميد هذه اللقطة داخل وثيقة الرحلة في Firestore ولا تتأثر مستقبلاً عند تحديث الأسعار:
                </p>
                <pre className="text-[11px] font-mono bg-stone-950 p-3 rounded-xl border border-stone-800 text-amber-300 overflow-x-auto">
{JSON.stringify(interactiveSettlement.snapshot, null, 2)}
                </pre>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ================= TAB 2: CONTRACTUAL AGREEMENTS & COW ================= */}
      {activeTab === 'RULES' && (
        <div className="space-y-6" id="rules-view">
          <div className="flex items-center justify-between bg-white rounded-2xl border border-stone-200 p-5">
            <div>
              <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-600" />
                <span>سجل الاتفاقيات وقواعد التسعير التعاقدية (Project Pricing Rules)</span>
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                جميع القواعد محددة ومرتبطة بنواقل ومواد وتواريخ صريحة. لتحديث أي سعر، يتم تطبيق نظام النسخ عند التعديل (Copy-on-Write) لإنشاء إصدار جديد (v2) دون المساس بالرحلات القديمة.
              </p>
            </div>
            <button
              id="btn-add-contract-rule"
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة اتفاقية تسعير جديدة</span>
            </button>
          </div>

          {/* Rules Table */}
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold">
                  <tr>
                    <th className="p-3">معرّف القاعدة والإصدار</th>
                    <th className="p-3">الناقل</th>
                    <th className="p-3">المادة</th>
                    <th className="p-3">نوع التسعير</th>
                    <th className="p-3">السعر المتفق عليه</th>
                    <th className="p-3">فترة السريان</th>
                    <th className="p-3">الحالة والنزاهة</th>
                    <th className="p-3 text-center">الإجراءات (COW)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {rules.map((rule) => (
                    <tr key={rule.pricingRuleId} className={rule.status === 'INACTIVE' ? 'bg-stone-50/50 opacity-70' : 'hover:bg-amber-50/30'}>
                      <td className="p-3 font-mono font-bold text-stone-900">
                        <div className="flex items-center gap-1.5">
                          <span>{rule.pricingRuleId}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-900 font-bold font-mono">
                            v{rule.version || 1}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 font-medium text-stone-800">{rule.carrierId}</td>
                      <td className="p-3 text-stone-600">
                        {rule.materialId ? (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-stone-100 text-stone-800 font-mono">
                            {rule.materialId}
                          </span>
                        ) : (
                          <span className="text-stone-400">جميع المواد (عام)</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          rule.pricingType === 'PER_TRIP' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {rule.pricingType}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-amber-800 font-mono text-sm">
                        {rule.rate} {rule.currency}
                      </td>
                      <td className="p-3 font-mono text-[11px] text-stone-600">
                        {rule.effectiveFrom} ➔ {rule.effectiveTo}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          rule.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-700'
                        }`}>
                          {rule.status === 'ACTIVE' ? 'نشطة سارية' : 'مؤرشفة تاريخياً'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {rule.status === 'ACTIVE' ? (
                          <button
                            onClick={() => {
                              setVersioningRule(rule);
                              setUpdatedRate(rule.rate);
                            }}
                            className="px-2.5 py-1 bg-stone-100 hover:bg-amber-100 hover:text-amber-900 border border-stone-200 rounded-lg text-[11px] font-bold text-stone-700 transition-all flex items-center gap-1 mx-auto cursor-pointer"
                            title="تعديل السعر بإنشاء نسخة جديدة لحماية الرحلات السابقة"
                          >
                            <History className="w-3.5 h-3.5 text-amber-600" />
                            <span>تحديث عبر COW</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-stone-400">محمية تاريخياً</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: 34 TEST SUITE MATRIX ================= */}
      {activeTab === 'TESTS' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs" id="tests-matrix-view">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 border-b border-stone-100 pb-4">
            <div>
              <h2 className="text-base font-black text-stone-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>مصفوفة الاختبارات المعمارية الشاملة (34/34 Architecture Tests)</span>
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                تغطي الحالات الـ 34 الإلزامية في وثيقة BLOCK 36: carrier specificity, material overrides, date selection, ambiguous overlap, zero fallback, copy-on-write, and importer integration.
              </p>
            </div>

            {/* Search and Run */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="بحث في الاختبارات..."
                  value={testSearch}
                  onChange={(e) => setTestSearch(e.target.value)}
                  className="text-xs bg-stone-50 border border-stone-200 rounded-lg pr-8 pl-3 py-1.5 focus:bg-white focus:outline-none"
                />
                <Search className="w-3.5 h-3.5 text-stone-400 absolute right-2.5 top-2.5" />
              </div>
              <button
                onClick={handleRunTests}
                disabled={isRunningTests}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRunningTests ? 'animate-spin' : ''}`} />
                <span>إعادة الفحص</span>
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-4 border-b border-stone-100">
            {[
              { key: 'ALL', label: 'الكل (34)' },
              { key: 'RESOLUTION', label: 'حل التسعير' },
              { key: 'SPECIFICITY', label: 'تخصيص المواد' },
              { key: 'DATE_WINDOW', label: 'نطاقات التواريخ' },
              { key: 'COLLISION', label: 'كشف التداخل' },
              { key: 'NO_GUESS', label: 'منع التخمين' },
              { key: 'VALIDATION', label: 'التحقق الصارم' },
              { key: 'ISOLATION', label: 'عزل المشاريع' },
              { key: 'IMMUTABILITY', label: 'حصانة اللقطات' },
              { key: 'VERSIONING', label: 'نظام النسخ COW' },
              { key: 'SETTLEMENT', label: 'احتساب التسويات' },
              { key: 'ENTITY_RESOLUTION', label: 'ربط الكيانات' },
              { key: 'WEIGHBRIDGE', label: 'الميزان' },
              { key: 'INTEGRATION', label: 'المستوردين المشتركين' },
              { key: 'CODE_AUDIT', label: 'فحص الكود' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilterCategory(f.key)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  filterCategory === f.key 
                    ? 'bg-amber-600 text-white font-bold' 
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Test Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredTests.map((test) => (
              <div
                key={test.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  test.passed 
                    ? 'bg-white border-stone-200 hover:border-emerald-300 hover:shadow-xs' 
                    : 'bg-rose-50 border-rose-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {test.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <div>
                      <span className="text-[10px] font-mono font-bold text-amber-700 ml-1.5">[{test.id}]</span>
                      <strong className="text-xs text-stone-900">{test.titleAr}</strong>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 font-bold shrink-0">
                    {test.category}
                  </span>
                </div>

                <div className="space-y-1 text-[10px] bg-stone-50 p-2 rounded-lg border border-stone-100 font-mono">
                  <div>
                    <span className="text-stone-400">Expected: </span>
                    <span className="text-stone-700">{String(test.expected)}</span>
                  </div>
                  <div>
                    <span className="text-stone-400">Actual: </span>
                    <span className="text-emerald-700 font-bold">{String(test.actual)}</span>
                  </div>
                </div>

                <p className="text-[11px] text-stone-600 mt-2 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <span>{test.details}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD CONTRACTUAL RULE ================= */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-stone-200">
            <h3 className="text-base font-bold text-stone-900 mb-2 flex items-center gap-2">
              <Plus className="w-5 h-5 text-amber-600" />
              <span>تسجيل اتفاقية تسعير تعاقدية جديدة</span>
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              إدخال الشروط التعاقدية الصريحة مع فحص منع التداخل الزمني مع قواعد أخرى لنفس الناقل.
            </p>

            {formError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddRule} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">معرّف الناقل (Carrier ID):</label>
                <input
                  type="text"
                  required
                  value={newCarrierId}
                  onChange={(e) => setNewCarrierId(e.target.value)}
                  className="w-full text-xs bg-stone-50 border border-stone-200 rounded-lg p-2.5 focus:bg-white focus:outline-none font-mono"
                  placeholder="مثال: CARRIER-ALMAJDOUIE"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">المادة (اختياري):</label>
                  <input
                    type="text"
                    value={newMaterialId}
                    onChange={(e) => setNewMaterialId(e.target.value)}
                    className="w-full text-xs bg-stone-50 border border-stone-200 rounded-lg p-2.5 focus:bg-white focus:outline-none font-mono"
                    placeholder="اترك فارغاً لجميع المواد"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">نوع التسعير:</label>
                  <select
                    value={newPricingType}
                    onChange={(e) => setNewPricingType(e.target.value as any)}
                    className="w-full text-xs bg-stone-50 border border-stone-200 rounded-lg p-2.5 focus:bg-white focus:outline-none"
                  >
                    <option value="PER_TON">PER_TON (حساب بالطن الصافي)</option>
                    <option value="PER_TRIP">PER_TRIP (مقطوع بالرد الواحد)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">السعر المتفق عليه (SAR):</label>
                <input
                  type="number"
                  step="0.25"
                  required
                  min="0.01"
                  value={newRate}
                  onChange={(e) => setNewRate(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs bg-stone-50 border border-stone-200 rounded-lg p-2.5 focus:bg-white focus:outline-none font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">ساري من تاريخ:</label>
                  <input
                    type="date"
                    required
                    value={newEffectiveFrom}
                    onChange={(e) => setNewEffectiveFrom(e.target.value)}
                    className="w-full text-xs bg-stone-50 border border-stone-200 rounded-lg p-2.5 focus:bg-white focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">ساري إلى تاريخ:</label>
                  <input
                    type="date"
                    required
                    value={newEffectiveTo}
                    onChange={(e) => setNewEffectiveTo(e.target.value)}
                    className="w-full text-xs bg-stone-50 border border-stone-200 rounded-lg p-2.5 focus:bg-white focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  اعتماد وحفظ الاتفاقية
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: COPY-ON-WRITE VERSIONING ================= */}
      {versioningRule && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-stone-200">
            <h3 className="text-base font-bold text-stone-900 mb-2 flex items-center gap-2">
              <History className="w-5 h-5 text-amber-600" />
              <span>تحديث السعر بنظام النسخ عند التعديل (Copy-on-Write)</span>
            </h3>
            <p className="text-xs text-stone-500 mb-4 leading-relaxed">
              وفقاً لقواعد النزاهة المالية، لن يتم تعديل السعر القديم مباشرة داخل القاعدة السابقة لحماية الرحلات المنجزة. سيتم تجميد الإصدار <strong className="text-stone-900">v{versioningRule.version || 1}</strong> وإنشاء إصدار جديد <strong className="text-amber-700">v{(versioningRule.version || 1) + 1}</strong>.
            </p>

            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs mb-4 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-stone-500">القاعدة الحالية:</span>
                <span className="font-mono font-bold">{versioningRule.pricingRuleId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">الناقل:</span>
                <span className="font-bold">{versioningRule.carrierId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">السعر القديم:</span>
                <span className="font-mono font-bold text-stone-700">{versioningRule.rate} SAR</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">السعر الجديد المعتمد (SAR):</label>
                <input
                  type="number"
                  step="0.25"
                  required
                  min="0.01"
                  value={updatedRate}
                  onChange={(e) => setUpdatedRate(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs bg-stone-50 border border-stone-200 rounded-lg p-2.5 focus:bg-white focus:outline-none font-mono font-bold text-amber-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">سبب ومسوغ التحديث (للتدقيق المالي):</label>
                <textarea
                  rows={2}
                  value={versionReason}
                  onChange={(e) => setVersionReason(e.target.value)}
                  className="w-full text-xs bg-stone-50 border border-stone-200 rounded-lg p-2.5 focus:bg-white focus:outline-none"
                  placeholder="اكتب مبرر التعديل..."
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setVersioningRule(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleApplyCowVersioning}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  إنشاء وتفعيل الإصدار v{(versioningRule.version || 1) + 1}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
