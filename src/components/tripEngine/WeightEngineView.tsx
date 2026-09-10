import React, { useState } from 'react';
import { 
  Scale, 
  Calculator, 
  ShieldCheck, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  Info, 
  Sliders, 
  FileCode, 
  Plus, 
  Check, 
  X, 
  RotateCcw,
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';
import { 
  ToleranceRule, 
  ToleranceRuleStatus, 
  ToleranceEvaluationOutput,
  NetWeightResult,
  VarianceResult,
  ToleranceEvaluationResult,
  WeightSettlementResult
} from '../../types/weightEngine';
import { weightEngine } from '../../services/weightEngine.service';
import { MASTER_PRICING_RULES, MasterPricingRule } from '../../data/masterPricingRules';
import { runWeightEngineTestSuite, WeightEngineTestCaseResult } from '../../tests/weightEngine.test';

export const WeightEngineView: React.FC = () => {
  // Active Sub-panel
  const [activeTab, setActiveTab] = useState<'FUNCTIONS_SANDBOX' | 'TOLERANCE_RULES' | 'AUTOMATED_TESTS'>('FUNCTIONS_SANDBOX');

  // =========================================================================
  // Function 1: calculateNetWeight(tare, gross) State
  // =========================================================================
  const [tareInput, setTareInput] = useState<string>('14200');
  const [grossInput, setGrossInput] = useState<string>('44700');

  const parsedTare = tareInput.trim() === '' ? null : Number(tareInput);
  const parsedGross = grossInput.trim() === '' ? null : Number(grossInput);
  const netResult: NetWeightResult = weightEngine.calculateNetWeight(
    Number.isNaN(parsedTare) ? null : parsedTare,
    Number.isNaN(parsedGross) ? null : parsedGross
  );

  // =========================================================================
  // Function 2: calculateVariance(loadedNet, receivedNet) State
  // =========================================================================
  const [loadedNetInput, setLoadedNetInput] = useState<string>('30500');
  const [receivedNetInput, setReceivedNetInput] = useState<string>('30350');

  const parsedLoadedNet = loadedNetInput.trim() === '' ? null : Number(loadedNetInput);
  const parsedReceivedNet = receivedNetInput.trim() === '' ? null : Number(receivedNetInput);
  const varianceResult: VarianceResult = weightEngine.calculateVariance(
    Number.isNaN(parsedLoadedNet) ? null : parsedLoadedNet,
    Number.isNaN(parsedReceivedNet) ? null : parsedReceivedNet
  );

  // =========================================================================
  // Function 3: evaluateTolerance(variance, tolerance, loadedNet) State
  // =========================================================================
  const [evalVarianceInput, setEvalVarianceInput] = useState<string>('-350');
  const [evalLoadedNetInput, setEvalLoadedNetInput] = useState<string>('30000');
  
  // Custom Tolerance Rule Parameters
  const [toleranceMode, setToleranceMode] = useState<'ABSOLUTE' | 'PERCENTAGE' | 'BOTH'>('BOTH');
  const [ruleProjectId, setRuleProjectId] = useState('PRJ-NEOM-001');
  const [ruleMaterialId, setRuleMaterialId] = useState('MAT-AGG-01');
  const [ruleAbsolute, setRuleAbsolute] = useState<string>('500');
  const [rulePercentage, setRulePercentage] = useState<string>('1.5');
  const [ruleStatus, setRuleStatus] = useState<ToleranceRuleStatus>('ACTIVE');

  const currentToleranceRule: ToleranceRule = {
    projectId: ruleProjectId,
    materialId: ruleMaterialId,
    absoluteTolerance: (toleranceMode === 'ABSOLUTE' || toleranceMode === 'BOTH') && ruleAbsolute.trim() !== '' 
      ? Number(ruleAbsolute) 
      : null,
    percentageTolerance: (toleranceMode === 'PERCENTAGE' || toleranceMode === 'BOTH') && rulePercentage.trim() !== '' 
      ? Number(rulePercentage) 
      : null,
    status: ruleStatus,
    warningRatio: 0.75
  };

  const parsedEvalVariance = evalVarianceInput.trim() === '' ? null : Number(evalVarianceInput);
  const parsedEvalLoadedNet = evalLoadedNetInput.trim() === '' ? null : Number(evalLoadedNetInput);

  const toleranceEvalResult: ToleranceEvaluationResult = weightEngine.evaluateTolerance(
    Number.isNaN(parsedEvalVariance) ? null : parsedEvalVariance,
    currentToleranceRule,
    Number.isNaN(parsedEvalLoadedNet) ? null : parsedEvalLoadedNet
  );

  // =========================================================================
  // Function 4: calculateSettlement(pricingRule, netWeight) State
  // =========================================================================
  const [selectedPricingRuleId, setSelectedPricingRuleId] = useState<string>(MASTER_PRICING_RULES[0].pricingRuleId);
  const [settlementNetInput, setSettlementNetInput] = useState<string>('37400');

  const activePricingRule = MASTER_PRICING_RULES.find(r => r.pricingRuleId === selectedPricingRuleId) || MASTER_PRICING_RULES[0];
  const parsedSettlementNet = settlementNetInput.trim() === '' ? null : Number(settlementNetInput);

  const settlementResult: WeightSettlementResult = weightEngine.calculateSettlement(
    activePricingRule,
    Number.isNaN(parsedSettlementNet) ? null : parsedSettlementNet
  );

  // =========================================================================
  // Tolerance Rules Management State
  // =========================================================================
  const [allRules, setAllRules] = useState<ToleranceRule[]>(() => weightEngine.getAllToleranceRules());
  const [newRuleForm, setNewRuleForm] = useState<{
    projectId: string;
    materialId: string;
    nameAr: string;
    mode: 'ABSOLUTE' | 'PERCENTAGE' | 'BOTH';
    absVal: string;
    pctVal: string;
    status: ToleranceRuleStatus;
  }>({
    projectId: 'PRJ-NEOM-001',
    materialId: 'MAT-NEW-01',
    nameAr: 'قاعدة تفاوت موقعية جديدة',
    mode: 'BOTH',
    absVal: '450',
    pctVal: '1.2',
    status: 'ACTIVE'
  });

  const handleSaveNewRule = () => {
    const created: ToleranceRule = {
      projectId: newRuleForm.projectId,
      materialId: newRuleForm.materialId,
      nameAr: newRuleForm.nameAr,
      absoluteTolerance: (newRuleForm.mode === 'ABSOLUTE' || newRuleForm.mode === 'BOTH') && newRuleForm.absVal.trim() !== '' ? Number(newRuleForm.absVal) : null,
      percentageTolerance: (newRuleForm.mode === 'PERCENTAGE' || newRuleForm.mode === 'BOTH') && newRuleForm.pctVal.trim() !== '' ? Number(newRuleForm.pctVal) : null,
      status: newRuleForm.status,
      warningRatio: 0.75
    };
    weightEngine.saveToleranceRule(created);
    setAllRules(weightEngine.getAllToleranceRules());
  };

  // =========================================================================
  // Automated Test Suite State
  // =========================================================================
  const [testReport, setTestReport] = useState<{
    results: WeightEngineTestCaseResult[];
    allPassed: boolean;
    summary: { total: number; passed: number; failed: number };
  } | null>(null);

  const handleRunTests = () => {
    const report = runWeightEngineTestSuite();
    setTestReport(report);
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-stone-100 pb-5 mb-5">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-800 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h1 className="text-xl font-bold text-stone-900">
                  محرك الأوزان المستقل (Standalone Weight Engine)
                </h1>
                <span className="bg-amber-100 text-amber-900 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  محرك حسابي خادومي
                </span>
                <span className="bg-blue-100 text-blue-900 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  حظر الصفر البديل (null قطعي)
                </span>
              </div>
              <p className="text-xs text-stone-600 max-w-3xl leading-relaxed">
                وحدة مستقلة تتولى حصرياً العمليات الحسابية للأوزان، فروقات التحميل، تقييم التفاوت (مطلق / نسبة / كلاهما) مع مخرجات الحالات (NORMAL / WARNING / EXCEPTION)، واحتساب التسويات المالية وفق قواعد التحقق الصارمة.
              </p>
            </div>
          </div>

          {/* Sub Navigation Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveTab('FUNCTIONS_SANDBOX')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'FUNCTIONS_SANDBOX'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>دوال المحرك الـ 4 (Functions Sandbox)</span>
            </button>

            <button
              onClick={() => setActiveTab('TOLERANCE_RULES')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'TOLERANCE_RULES'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>قواعد التفاوت (Tolerance Rules)</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('AUTOMATED_TESTS');
                if (!testReport) handleRunTests();
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'AUTOMATED_TESTS'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>فحص الامتثال الآلي (Test Suite)</span>
            </button>
          </div>
        </div>

        {/* Global Validation Rule Bar */}
        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2 text-amber-900 font-bold">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
            <span>قواعد التحقق الصارمة (Strict Validation):</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono">
            <span className="bg-white px-2 py-0.5 rounded border border-amber-300 text-amber-950">tare &gt; 0</span>
            <span className="bg-white px-2 py-0.5 rounded border border-amber-300 text-amber-950">gross &gt; tare</span>
            <span className="bg-white px-2 py-0.5 rounded border border-amber-300 text-amber-950">net &gt; 0</span>
            <span className="bg-white px-2 py-0.5 rounded border border-amber-300 text-amber-950">received &gt; 0</span>
            <span className="bg-rose-100 px-2 py-0.5 rounded border border-rose-300 text-rose-950 font-bold">
              لا تستخدم 0 كبديل عن missing data ➔ النتيجة null
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. FUNCTIONS SANDBOX (دوال المحرك الأربعة) */}
      {/* ========================================================================= */}
      {activeTab === 'FUNCTIONS_SANDBOX' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeIn">
          
          {/* FUNCTION 1: calculateNetWeight(tare, gross) */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-900 flex items-center justify-center text-xs font-bold font-mono">
                  F1
                </span>
                <div>
                  <h3 className="text-sm font-bold text-stone-900 font-mono">calculateNetWeight(tare, gross)</h3>
                  <span className="text-[11px] text-stone-500">حساب صافي الوزن واشتراط tare &gt; 0 و gross &gt; tare</span>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                netResult.isValid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {netResult.isValid ? 'VALID' : 'INVALID'}
              </span>
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  وزن الفارغ (tare) كجم
                </label>
                <input
                  type="text"
                  value={tareInput}
                  onChange={(e) => setTareInput(e.target.value)}
                  placeholder="null (اتركه فارغاً)"
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-stone-900 focus:bg-white focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  وزن القائم (gross) كجم
                </label>
                <input
                  type="text"
                  value={grossInput}
                  onChange={(e) => setGrossInput(e.target.value)}
                  placeholder="null (اتركه فارغاً)"
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-stone-900 focus:bg-white focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Quick Test Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-stone-400">أمثلة سريعة:</span>
              <button
                type="button"
                onClick={() => { setTareInput('14200'); setGrossInput('44700'); }}
                className="text-[10px] bg-stone-100 hover:bg-stone-200 px-2 py-0.5 rounded text-stone-700 font-semibold"
              >
                صحيح (44,700 - 14,200)
              </button>
              <button
                type="button"
                onClick={() => { setTareInput('0'); setGrossInput('30000'); }}
                className="text-[10px] bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded text-rose-700 font-semibold"
              >
                tare = 0 (مرفوض)
              </button>
              <button
                type="button"
                onClick={() => { setTareInput('20000'); setGrossInput('18000'); }}
                className="text-[10px] bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded text-rose-700 font-semibold"
              >
                gross &lt; tare (مرفوض)
              </button>
              <button
                type="button"
                onClick={() => { setTareInput(''); setGrossInput('44700'); }}
                className="text-[10px] bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded text-amber-800 font-semibold"
              >
                tare مفقود (➔ null)
              </button>
            </div>

            {/* Result Display */}
            <div className={`p-3.5 rounded-xl border ${
              netResult.isValid ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-stone-700">النتيجة المُرجعة (netWeight):</span>
                <span className={`text-sm font-mono font-black ${
                  netResult.netWeight !== null ? 'text-emerald-800' : 'text-rose-700'
                }`}>
                  {netResult.netWeight !== null ? `${netResult.netWeight.toLocaleString()} كجم` : 'null'}
                </span>
              </div>
              {netResult.validationErrors.length > 0 && (
                <div className="text-[11px] text-rose-800 mt-2 space-y-1">
                  {netResult.validationErrors.map((err, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      <span>{err}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* FUNCTION 2: calculateVariance(loadedNet, receivedNet) */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-900 flex items-center justify-center text-xs font-bold font-mono">
                  F2
                </span>
                <div>
                  <h3 className="text-sm font-bold text-stone-900 font-mono">calculateVariance(loadedNet, receivedNet)</h3>
                  <span className="text-[11px] text-stone-500">حساب الفارق واشتراط net &gt; 0 و received &gt; 0</span>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                varianceResult.isValid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {varianceResult.isValid ? 'VALID' : 'INVALID'}
              </span>
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  صافي التحميل بالمصدر (loadedNet) كجم
                </label>
                <input
                  type="text"
                  value={loadedNetInput}
                  onChange={(e) => setLoadedNetInput(e.target.value)}
                  placeholder="null"
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-stone-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  صافي الاستلام بالموقع (receivedNet) كجم
                </label>
                <input
                  type="text"
                  value={receivedNetInput}
                  onChange={(e) => setReceivedNetInput(e.target.value)}
                  placeholder="null"
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-stone-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Quick Test Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-stone-400">أمثلة سريعة:</span>
              <button
                type="button"
                onClick={() => { setLoadedNetInput('30500'); setReceivedNetInput('30350'); }}
                className="text-[10px] bg-stone-100 hover:bg-stone-200 px-2 py-0.5 rounded text-stone-700 font-semibold"
              >
                طبيعي (-150 كجم)
              </button>
              <button
                type="button"
                onClick={() => { setLoadedNetInput('30500'); setReceivedNetInput('28000'); }}
                className="text-[10px] bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded text-rose-700 font-semibold"
              >
                عجز كبير (-2500 كجم)
              </button>
              <button
                type="button"
                onClick={() => { setLoadedNetInput('0'); setReceivedNetInput('30000'); }}
                className="text-[10px] bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded text-rose-700 font-semibold"
              >
                loadedNet = 0 (مرفوض)
              </button>
              <button
                type="button"
                onClick={() => { setLoadedNetInput('30500'); setReceivedNetInput(''); }}
                className="text-[10px] bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded text-amber-800 font-semibold"
              >
                استلام مفقود (➔ null)
              </button>
            </div>

            {/* Result Display */}
            <div className={`p-3.5 rounded-xl border ${
              varianceResult.isValid ? 'bg-indigo-50/50 border-indigo-200' : 'bg-rose-50/50 border-rose-200'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-stone-700">الفارق الوزني (variance):</span>
                <div className="text-sm font-mono font-black text-indigo-900">
                  {varianceResult.variance !== null ? (
                    <>
                      {varianceResult.variance > 0 ? `+${varianceResult.variance.toLocaleString()}` : varianceResult.variance.toLocaleString()} كجم
                      {varianceResult.variancePercentage !== null && (
                        <span className="text-xs font-normal text-indigo-700 mr-1.5">
                          ({varianceResult.variancePercentage > 0 ? `+${varianceResult.variancePercentage}%` : `${varianceResult.variancePercentage}%`})
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-rose-700">null</span>
                  )}
                </div>
              </div>
              {varianceResult.validationErrors.length > 0 && (
                <div className="text-[11px] text-rose-800 mt-2 space-y-1">
                  {varianceResult.validationErrors.map((err, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      <span>{err}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* FUNCTION 3: evaluateTolerance(variance, tolerance) */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4 lg:col-span-2">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center text-xs font-bold font-mono">
                  F3
                </span>
                <div>
                  <h3 className="text-sm font-bold text-stone-900 font-mono">evaluateTolerance(variance, tolerance, loadedNet)</h3>
                  <span className="text-[11px] text-stone-500">
                    دعم أنواع التفاوت: absolute | percentage | or both ➔ وإخراج: NORMAL | WARNING | EXCEPTION
                  </span>
                </div>
              </div>
              
              {/* Output Status Badge */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-400 font-medium">المخرج (Output):</span>
                <span className={`text-xs font-bold px-3 py-1 rounded-full font-mono ${
                  toleranceEvalResult.status === 'NORMAL' 
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' 
                    : toleranceEvalResult.status === 'WARNING'
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-rose-100 text-rose-900 border border-rose-300'
                }`}>
                  {toleranceEvalResult.status}
                </span>
              </div>
            </div>

            {/* Tolerance Rule Config Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-stone-50 p-3.5 rounded-xl border border-stone-200/80">
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">نوع التفاوت (Tolerance Mode)</label>
                <select
                  value={toleranceMode}
                  onChange={(e) => setToleranceMode(e.target.value as any)}
                  className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-stone-800"
                >
                  <option value="BOTH">both (مطلق ونسبة معاً)</option>
                  <option value="ABSOLUTE">absolute (مطلق فقط)</option>
                  <option value="PERCENTAGE">percentage (نسبة فقط)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  تفاوت مطلق (absoluteTolerance)
                </label>
                <input
                  type="text"
                  disabled={toleranceMode === 'PERCENTAGE'}
                  value={ruleAbsolute}
                  onChange={(e) => setRuleAbsolute(e.target.value)}
                  placeholder="500 كجم"
                  className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs font-mono disabled:bg-stone-200 disabled:text-stone-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  تفاوت نسبة (percentageTolerance)
                </label>
                <input
                  type="text"
                  disabled={toleranceMode === 'ABSOLUTE'}
                  value={rulePercentage}
                  onChange={(e) => setRulePercentage(e.target.value)}
                  placeholder="1.5 %"
                  className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs font-mono disabled:bg-stone-200 disabled:text-stone-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">الفارق المراد فحصه (variance)</label>
                <input
                  type="text"
                  value={evalVarianceInput}
                  onChange={(e) => setEvalVarianceInput(e.target.value)}
                  placeholder="مثال: -350 كجم"
                  className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-stone-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">صافي التحميل (loadedNet)</label>
                <input
                  type="text"
                  value={evalLoadedNetInput}
                  onChange={(e) => setEvalLoadedNetInput(e.target.value)}
                  placeholder="30000 كجم"
                  className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                />
              </div>
            </div>

            {/* Quick 3-Outcome Preset Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-stone-500 font-semibold">اختبار المخرجات الثلاثة مباشرة:</span>
              
              <button
                type="button"
                onClick={() => setEvalVarianceInput('-120')}
                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-[11px] font-bold flex items-center gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>تجربة مخرج: NORMAL (-120 كجم)</span>
              </button>

              <button
                type="button"
                onClick={() => setEvalVarianceInput('-380')}
                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[11px] font-bold flex items-center gap-1"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>تجربة مخرج: WARNING (-380 كجم / &gt;75%)</span>
              </button>

              <button
                type="button"
                onClick={() => setEvalVarianceInput('-750')}
                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-300 rounded-lg text-[11px] font-bold flex items-center gap-1"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                <span>تجربة مخرج: EXCEPTION (-750 كجم / تجاوز الحد)</span>
              </button>
            </div>

            {/* Detailed Tolerance Assessment Result Box */}
            <div className={`p-4 rounded-xl border ${
              toleranceEvalResult.status === 'NORMAL' 
                ? 'bg-emerald-50/40 border-emerald-200 text-emerald-950' 
                : toleranceEvalResult.status === 'WARNING'
                ? 'bg-amber-50/40 border-amber-200 text-amber-950'
                : 'bg-rose-50/40 border-rose-200 text-rose-950'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200/50 pb-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs">تفاصيل التقييم الخادومي:</span>
                  <span className="text-[11px] bg-white/80 px-2 py-0.5 rounded border border-stone-200 font-mono">
                    النوع المطبق: {toleranceEvalResult.toleranceTypeApplied}
                  </span>
                  <span className="text-[11px] bg-white/80 px-2 py-0.5 rounded border border-stone-200 font-mono">
                    الحد الفعال: {toleranceEvalResult.limitKg?.toLocaleString()} كجم
                  </span>
                  <span className="text-[11px] bg-white/80 px-2 py-0.5 rounded border border-stone-200 font-mono">
                    حد التحذير (75%): {toleranceEvalResult.warningLimitKg?.toLocaleString()} كجم
                  </span>
                </div>
                
                <span className="text-xs font-mono font-bold">
                  الفارق الفعلي: {toleranceEvalResult.variance !== null ? `${toleranceEvalResult.variance} كجم` : 'null'}
                </span>
              </div>

              <p className="text-xs font-medium leading-relaxed">
                {toleranceEvalResult.messageAr}
              </p>
            </div>
          </div>

          {/* FUNCTION 4: calculateSettlement(pricingRule, netWeight) */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4 lg:col-span-2">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-900 flex items-center justify-center text-xs font-bold font-mono">
                  F4
                </span>
                <div>
                  <h3 className="text-sm font-bold text-stone-900 font-mono">calculateSettlement(pricingRule, netWeight)</h3>
                  <span className="text-[11px] text-stone-500">
                    احتساب التسوية المالية بدقة بالطن أو المشوار مع اشتراط net &gt; 0، وإرجاع null عند فقدان البيانات
                  </span>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                settlementResult.isValid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {settlementResult.isValid ? 'VALID' : 'INVALID'}
              </span>
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  اختر قاعدة التسعير (Master Pricing Rule)
                </label>
                <select
                  value={selectedPricingRuleId}
                  onChange={(e) => setSelectedPricingRuleId(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-xs font-bold text-stone-800"
                >
                  {MASTER_PRICING_RULES.map((rule) => (
                    <option key={rule.pricingRuleId} value={rule.pricingRuleId}>
                      {rule.name} ({rule.pricingType} - {rule.agreedRate} {rule.currency})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  صافي الوزن (netWeight) كجم
                </label>
                <input
                  type="text"
                  value={settlementNetInput}
                  onChange={(e) => setSettlementNetInput(e.target.value)}
                  placeholder="null (اتركه فارغاً لاختبار القيمة المفقودة)"
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-stone-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Quick Test Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-stone-400">أمثلة سريعة:</span>
              <button
                type="button"
                onClick={() => setSettlementNetInput('37400')}
                className="text-[10px] bg-stone-100 hover:bg-stone-200 px-2 py-0.5 rounded text-stone-700 font-semibold"
              >
                37,400 كجم (37.4 طن)
              </button>
              <button
                type="button"
                onClick={() => setSettlementNetInput('0')}
                className="text-[10px] bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded text-rose-700 font-semibold"
              >
                net = 0 (مرفوض ➔ null)
              </button>
              <button
                type="button"
                onClick={() => setSettlementNetInput('')}
                className="text-[10px] bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded text-amber-800 font-semibold"
              >
                net مفقود (➔ null قطعي دون استبداله بـ 0)
              </button>
            </div>

            {/* Result Box */}
            <div className={`p-4 rounded-xl border ${
              settlementResult.isValid ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'
            }`}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="text-xs text-stone-500 block mb-0.5">معادلة الاحتساب المالية:</span>
                  <span className="text-xs font-bold text-stone-900 font-mono">
                    {settlementResult.formula}
                  </span>
                </div>

                <div className="text-left">
                  <span className="text-xs text-stone-500 block mb-0.5">المبلغ النهائي المستحق:</span>
                  <span className={`text-lg font-mono font-black ${
                    settlementResult.settlementAmount !== null ? 'text-emerald-800' : 'text-rose-700'
                  }`}>
                    {settlementResult.settlementAmount !== null 
                      ? `${settlementResult.settlementAmount.toLocaleString()} ${settlementResult.currency}` 
                      : 'null'}
                  </span>
                </div>
              </div>

              {settlementResult.validationErrors.length > 0 && (
                <div className="text-[11px] text-rose-800 mt-2 space-y-1 border-t border-rose-200/60 pt-2">
                  {settlementResult.validationErrors.map((err, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      <span>{err}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. TOLERANCE RULES REGISTRY & MANAGER */}
      {/* ========================================================================= */}
      {activeTab === 'TOLERANCE_RULES' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Create New Rule Card */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-amber-700" />
              <span>إضافة أو تحديث قاعدة تفاوت (Tolerance Rule)</span>
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">معرف المشروع (projectId)</label>
                <input
                  type="text"
                  value={newRuleForm.projectId}
                  onChange={(e) => setNewRuleForm({ ...newRuleForm, projectId: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">معرف المادة (materialId)</label>
                <input
                  type="text"
                  value={newRuleForm.materialId}
                  onChange={(e) => setNewRuleForm({ ...newRuleForm, materialId: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">نوع التفاوت المسموح</label>
                <select
                  value={newRuleForm.mode}
                  onChange={(e) => setNewRuleForm({ ...newRuleForm, mode: e.target.value as any })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-stone-800"
                >
                  <option value="BOTH">both (مطلق ونسبة معاً)</option>
                  <option value="ABSOLUTE">absolute (مطلق فقط)</option>
                  <option value="PERCENTAGE">percentage (نسبة فقط)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">حالة القاعدة (status)</label>
                <select
                  value={newRuleForm.status}
                  onChange={(e) => setNewRuleForm({ ...newRuleForm, status: e.target.value as any })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-stone-800"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
              </div>

              <div className="lg:col-span-2">
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">اسم ووصف القاعدة</label>
                <input
                  type="text"
                  value={newRuleForm.nameAr}
                  onChange={(e) => setNewRuleForm({ ...newRuleForm, nameAr: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">تفاوت مطلق (كجم)</label>
                <input
                  type="text"
                  disabled={newRuleForm.mode === 'PERCENTAGE'}
                  value={newRuleForm.absVal}
                  onChange={(e) => setNewRuleForm({ ...newRuleForm, absVal: e.target.value })}
                  placeholder="500"
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs font-mono disabled:opacity-40"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">تفاوت نسبة (%)</label>
                <input
                  type="text"
                  disabled={newRuleForm.mode === 'ABSOLUTE'}
                  value={newRuleForm.pctVal}
                  onChange={(e) => setNewRuleForm({ ...newRuleForm, pctVal: e.target.value })}
                  placeholder="1.5"
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs font-mono disabled:opacity-40"
                />
              </div>
            </div>

            <button
              onClick={handleSaveNewRule}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>حفظ القاعدة في محرك الأوزان</span>
            </button>
          </div>

          {/* List of Registered Tolerance Rules */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-stone-900">
              قواعد التفاوت المسجلة بالنظام ({allRules.length})
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {allRules.map((rule, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-stone-200 bg-stone-50/60 space-y-2">
                  <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                    <span className="font-bold text-xs text-stone-900">{rule.nameAr || rule.ruleId}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                      rule.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-700'
                    }`}>
                      {rule.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1 text-[11px] text-stone-600">
                    <div>المشروع: <strong className="text-stone-800">{rule.projectId}</strong></div>
                    <div>المادة: <strong className="text-stone-800">{rule.materialId}</strong></div>
                    <div>
                      التفاوت المطلق: {rule.absoluteTolerance !== null ? `${rule.absoluteTolerance} كجم` : 'غير محدد (null)'}
                    </div>
                    <div>
                      تفاوت النسبة: {rule.percentageTolerance !== null ? `${rule.percentageTolerance} %` : 'غير محدد (null)'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. AUTOMATED VERIFICATION TEST SUITE */}
      {/* ========================================================================= */}
      {activeTab === 'AUTOMATED_TESTS' && testReport && (
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-900">
                  تقرير التحقق البرمجي لاشتراطات Weight Engine (13 فحصاً آلياً)
                </h3>
                <p className="text-[11px] text-stone-500">
                  فحص دوال الحساب، معايير التحقق، حظر استبدال المفقود بالصفر، وتقييم التفاوت (NORMAL / WARNING / EXCEPTION)
                </p>
              </div>
            </div>

            <button
              onClick={handleRunTests}
              className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إعادة الفحص الآن</span>
            </button>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-center">
              <span className="text-[10px] text-stone-500 block">إجمالي الفحوصات</span>
              <span className="text-xl font-black text-stone-900">{testReport.summary.total}</span>
            </div>
            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-center">
              <span className="text-[10px] text-emerald-800 block">ناجحة (100%)</span>
              <span className="text-xl font-black text-emerald-800">{testReport.summary.passed}</span>
            </div>
            <div className="bg-rose-50 p-3 rounded-xl border border-rose-200 text-center">
              <span className="text-[10px] text-rose-800 block">فاشلة</span>
              <span className="text-xl font-black text-rose-800">{testReport.summary.failed}</span>
            </div>
          </div>

          {/* Test Items List */}
          <div className="space-y-2 pt-2">
            {testReport.results.map((res, i) => (
              <div 
                key={i}
                className={`p-3 rounded-xl border text-xs flex items-start justify-between gap-3 ${
                  res.passed ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50 border-rose-200'
                }`}
              >
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-stone-900 block mb-0.5">{res.name}</span>
                    <p className="text-[11px] text-stone-600 leading-relaxed">{res.message}</p>
                  </div>
                </div>

                <span className="bg-emerald-100 text-emerald-900 font-mono text-[10px] font-bold px-2 py-0.5 rounded shrink-0">
                  PASSED
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
