import React, { useState } from 'react';
import { 
  WizardPricingRuleItem, 
  WizardCarrierItem, 
  WizardMaterialItem, 
  PricingType,
  PricingOverlapConflict 
} from '../../types/wizard';
import { ProjectProvisioningValidator } from '../../validators/projectProvisioning.validator';
import { 
  CircleDollarSign, 
  Plus, 
  AlertTriangle, 
  Check, 
  X, 
  Edit2, 
  Trash2, 
  Calendar, 
  Boxes, 
  Truck, 
  Sparkles,
  Layers
} from 'lucide-react';

interface Step4Props {
  pricingRules: WizardPricingRuleItem[];
  carriers: WizardCarrierItem[];
  materials: WizardMaterialItem[];
  onChange: (updated: WizardPricingRuleItem[]) => void;
  errors?: string[];
}

export const Step4PricingRules: React.FC<Step4Props> = ({
  pricingRules,
  carriers,
  materials,
  onChange,
  errors = [],
}) => {
  const [selectedCarrierFilter, setSelectedCarrierFilter] = useState<string>('ALL');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [carrierId, setCarrierId] = useState<string>(carriers[0]?.carrierId || 'CAR-A');
  const [pricingType, setPricingType] = useState<PricingType>('PER_TRIP');
  const [rate, setRate] = useState<number>(120);
  const [currency, setCurrency] = useState<string>('SAR');
  const [effectiveFrom, setEffectiveFrom] = useState<string>('2026-09-01');
  const [effectiveTo, setEffectiveTo] = useState<string>('2027-12-31');
  const [materialId, setMaterialId] = useState<string>('ALL_MATERIALS');
  const [notes, setNotes] = useState<string>('');
  const [vatApplicable, setVatApplicable] = useState<boolean>(true);
  const [demurrageRate, setDemurrageRate] = useState<number>(50);
  const [freeTime, setFreeTime] = useState<number>(2);
  const [formError, setFormError] = useState<string | null>(null);

  // Helper maps
  const carrierMap: Record<string, string> = {};
  carriers.forEach((c) => {
    carrierMap[c.carrierId] = c.carrierName;
  });

  const materialMap: Record<string, string> = {};
  materials.forEach((m) => {
    materialMap[m.materialId] = m.materialName;
  });

  // Calculate live overlaps
  const overlaps: PricingOverlapConflict[] = ProjectProvisioningValidator.detectPricingOverlaps(
    pricingRules,
    carrierMap,
    materialMap
  );

  const resetForm = () => {
    setCarrierId(carriers[0]?.carrierId || 'CAR-A');
    setPricingType('PER_TRIP');
    setRate(120);
    setCurrency('SAR');
    setEffectiveFrom('2026-09-01');
    setEffectiveTo('2027-12-31');
    setMaterialId('ALL_MATERIALS');
    setNotes('');
    setVatApplicable(true);
    setDemurrageRate(50);
    setFreeTime(2);
    setFormError(null);
    setEditingId(null);
    setShowAddForm(false);
  };

  const startEdit = (rule: WizardPricingRuleItem) => {
    setEditingId(rule.id);
    setCarrierId(rule.carrierId);
    setPricingType(rule.pricingType);
    setRate(rule.rate);
    setCurrency(rule.currency || 'SAR');
    setEffectiveFrom(rule.effectiveFrom || '');
    setEffectiveTo(rule.effectiveTo || '');
    setMaterialId(rule.materialId || 'ALL_MATERIALS');
    setNotes(rule.notes || '');
    setVatApplicable(rule.vatApplicable ?? true);
    setDemurrageRate(rule.demurrageRatePerHourSAR ?? 50);
    setFreeTime(rule.freeTimeHours ?? 2);
    setFormError(null);
    setShowAddForm(true);
  };

  const handleSave = () => {
    if (!carrierId) {
      setFormError('يرجى تحديد الناقل المستهدف بالاتفاقية');
      return;
    }
    if (typeof rate !== 'number' || isNaN(rate) || rate <= 0) {
      setFormError('قيمة السعر يجب أن تكون رقماً أكبر من صفر');
      return;
    }
    if (!effectiveFrom) {
      setFormError('تاريخ بدء سريان التسعيرة مطلوب');
      return;
    }
    if (effectiveFrom && effectiveTo && effectiveTo.trim() !== '') {
      if (effectiveTo < effectiveFrom) {
        setFormError('تاريخ انتهاء السريان لا يمكن أن يكون قبل تاريخ البدء');
        return;
      }
    }

    // Temporary list to check if this addition creates an overlap
    const targetId = editingId || `pr-${Date.now()}`;
    const testItem: WizardPricingRuleItem = {
      id: targetId,
      pricingRuleId: `PR-${carrierId}-${pricingType}-${Math.round(rate)}`,
      carrierId,
      pricingType,
      rate,
      currency,
      effectiveFrom,
      effectiveTo: effectiveTo.trim(),
      materialId,
      notes: notes.trim(),
      vatApplicable,
      demurrageRatePerHourSAR: demurrageRate,
      freeTimeHours: freeTime,
    };

    const simulatedList = editingId
      ? pricingRules.map((r) => (r.id === editingId ? testItem : r))
      : [...pricingRules, testItem];

    const simConflicts = ProjectProvisioningValidator.detectPricingOverlaps(
      simulatedList,
      carrierMap,
      materialMap
    );

    // If new conflicts exist specifically for this rule, warn or block!
    const ruleConflicts = simConflicts.filter(
      (c) => c.rule1Id === targetId || c.rule2Id === targetId
    );

    if (ruleConflicts.length > 0) {
      setFormError(
        `تضارب تسعير غير مسموح: ${ruleConflicts[0].messageAr}`
      );
      return;
    }

    onChange(simulatedList);
    resetForm();
  };

  const handleDelete = (id: string) => {
    onChange(pricingRules.filter((r) => r.id !== id));
  };

  // Filter rules by carrier
  const filteredRules =
    selectedCarrierFilter === 'ALL'
      ? pricingRules
      : pricingRules.filter((r) => r.carrierId === selectedCarrierFilter);

  // Quick Preset Handlers for user prompt examples
  const applyPreset = (carId: string, type: PricingType, presetRate: number, desc: string) => {
    const newId = `pr-preset-${Date.now()}-${Math.random().toString(36).substr(2, 3)}`;
    const newRule: WizardPricingRuleItem = {
      id: newId,
      pricingRuleId: `PR-${carId}-${type}-${presetRate}`,
      carrierId: carId,
      pricingType: type,
      rate: presetRate,
      currency: 'SAR',
      effectiveFrom: '2026-09-01',
      effectiveTo: '2027-12-31',
      materialId: 'ALL_MATERIALS',
      notes: desc,
      vatApplicable: true,
      demurrageRatePerHourSAR: 50,
      freeTimeHours: 2,
    };
    onChange([...pricingRules, newRule]);
  };

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-200 gap-3">
        <div>
          <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
            <CircleDollarSign className="w-5 h-5 text-amber-600" />
            الخطوة 4: اتفاقيات وقواعد التسعير المخصصة لكل ناقل (Pricing Rules)
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            يسمح لكل ناقل باتفاق منفصل (بالرد PER_TRIP أو بالطن PER_TON)، مع منع أي تداخل زمني لنفس الناقل والمادة.
          </p>
        </div>
        {!showAddForm && (
          <button
            type="button"
            id="btn-add-pricing-rule"
            onClick={() => {
              resetForm();
              setShowAddForm(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة قاعدة تسعير</span>
          </button>
        )}
      </div>

      {/* OVERLAP CONFLICT BANNER */}
      {overlaps.length > 0 && (
        <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-xl space-y-2 text-rose-900">
          <div className="flex items-center gap-2 font-bold text-xs text-rose-800">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>تنبيه نظامي: تم رصد تضارب في قواعد التسعير (Overlap Violation)</span>
          </div>
          <p className="text-xs text-rose-700 leading-relaxed">
            وفق ميثاق المنظومة، يمنع وجود قاعدتي تسعير لنفس (المشروع + الناقل + نوع التسعير + المادة) في فترات زمنية متداخلة:
          </p>
          <div className="space-y-1.5 mt-2">
            {overlaps.map((conflict, idx) => (
              <div
                key={idx}
                className="p-2.5 bg-white/80 border border-rose-200 rounded-lg text-xs text-rose-950 font-medium"
              >
                {conflict.messageAr}
              </div>
            ))}
          </div>
        </div>
      )}

      {errors.length > 0 && overlaps.length === 0 && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 space-y-1">
          <p className="font-semibold">تنبيهات التسعير:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {errors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Quick Template Presets (Matching User Request Examples) */}
      <div className="bg-stone-50 rounded-xl p-3 border border-stone-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 font-bold text-stone-700">
          <Sparkles className="w-4 h-4 text-amber-600" />
          <span>نماذج تسعير سريعة مطابقة لاشتراطات المشروع:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              applyPreset(
                'CAR-A',
                'PER_TRIP',
                120,
                'اتفاقية Carrier A: مقطوع 120 ريال بالرد الواحد'
              )
            }
            className="px-2.5 py-1 bg-white hover:bg-stone-100 border border-stone-300 rounded text-stone-800 font-semibold transition-colors"
          >
            Carrier A → PER_TRIP (120 SAR)
          </button>
          <button
            type="button"
            onClick={() =>
              applyPreset(
                'CAR-B',
                'PER_TON',
                8.5,
                'اتفاقية Carrier B: صافي 8.5 ريال بالطن'
              )
            }
            className="px-2.5 py-1 bg-white hover:bg-stone-100 border border-stone-300 rounded text-stone-800 font-semibold transition-colors"
          >
            Carrier B → PER_TON (8.5 SAR)
          </button>
          <button
            type="button"
            onClick={() =>
              applyPreset(
                'CAR-C',
                'PER_TON',
                7.75,
                'اتفاقية Carrier C: صافي 7.75 ريال بالطن'
              )
            }
            className="px-2.5 py-1 bg-white hover:bg-stone-100 border border-stone-300 rounded text-stone-800 font-semibold transition-colors"
          >
            Carrier C → PER_TON (7.75 SAR)
          </button>
        </div>
      </div>

      {/* Add / Edit Form Panel */}
      {showAddForm && (
        <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-amber-200/80">
            <h3 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <CircleDollarSign className="w-4 h-4 text-amber-700" />
              {editingId ? 'تعديل اتفاقية التسعير' : 'إضافة قاعدة تسعير جديدة'}
            </h3>
            <button
              type="button"
              onClick={resetForm}
              className="text-stone-400 hover:text-stone-600 text-xs flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              إلغاء
            </button>
          </div>

          {formError && (
            <div className="p-3 bg-rose-100 border border-rose-200 text-rose-800 text-xs rounded-md font-semibold">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Carrier selector */}
            <div>
              <label className="block font-bold text-stone-700 mb-1 flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-stone-500" />
                الناقل المستهدف بالاتفاقية <span className="text-rose-500">*</span>
              </label>
              <select
                id="select-rule-carrier"
                value={carrierId}
                onChange={(e) => setCarrierId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              >
                {carriers.map((c) => (
                  <option key={c.id} value={c.carrierId}>
                    {c.carrierName} ({c.carrierId})
                  </option>
                ))}
                <option value="ALL">جميع الناقلين (تعرفة عامة مشتركة)</option>
              </select>
            </div>

            {/* Pricing Type */}
            <div>
              <label className="block font-bold text-stone-700 mb-1">
                نموذج التسعير (pricingType) <span className="text-rose-500">*</span>
              </label>
              <select
                id="select-rule-pricing-type"
                value={pricingType}
                onChange={(e) => setPricingType(e.target.value as PricingType)}
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-bold"
              >
                <option value="PER_TRIP">بالرد الواحد (PER_TRIP) - مقطوعية</option>
                <option value="PER_TON">بالطن الصافي (PER_TON) - وفق الميزان</option>
              </select>
            </div>

            {/* Rate */}
            <div>
              <label className="block font-bold text-stone-700 mb-1">
                السعر التعاقدي (rate) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="input-rule-rate"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={rate}
                  onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 120 أو 8.5"
                  className="w-full pl-12 pr-3 py-2 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
                <span className="absolute left-3 top-2.5 text-stone-400 font-bold text-[10px]">
                  {currency}
                </span>
              </div>
            </div>

            {/* Material */}
            <div>
              <label className="block font-bold text-stone-700 mb-1 flex items-center gap-1">
                <Boxes className="w-3.5 h-3.5 text-stone-500" />
                المادة المشمولة (اختياري)
              </label>
              <select
                id="select-rule-material"
                value={materialId}
                onChange={(e) => setMaterialId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              >
                <option value="ALL_MATERIALS">كافة المواد المعتمدة (شامل)</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.materialId}>
                    {m.materialName} ({m.materialCode})
                  </option>
                ))}
              </select>
            </div>

            {/* Dates */}
            <div>
              <label className="block font-bold text-stone-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-stone-500" />
                تاريخ سريان الاتفاقية (من) <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-rule-effective-from"
                type="date"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-stone-500" />
                تاريخ انتهاء السريان (إلى) - اختياري
              </label>
              <input
                id="input-rule-effective-to"
                type="date"
                value={effectiveTo}
                onChange={(e) => setEffectiveTo(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-stone-700 mb-1">
                ملاحظات وشروط الاتفاقية (notes)
              </label>
              <input
                id="input-rule-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. خصم 5% في حال تجاوز عدد الردود 100 رد أسبوعياً"
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={resetForm}
              className="px-3 py-1.5 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 rounded-lg text-xs font-semibold"
            >
              إلغاء
            </button>
            <button
              type="button"
              id="btn-save-pricing-rule"
              onClick={handleSave}
              className="flex items-center gap-1 px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{editingId ? 'حفظ الاتفاقية' : 'إضافة الاتفاقية'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Filter Tabs by Carrier */}
      <div className="flex items-center justify-between gap-3 border-b border-stone-200 pb-2 overflow-x-auto text-xs">
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setSelectedCarrierFilter('ALL')}
            className={`px-3 py-1 rounded-md font-semibold transition-all ${
              selectedCarrierFilter === 'ALL'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'text-stone-600 hover:text-stone-900 bg-stone-100'
            }`}
          >
            كافة الناقلين ({pricingRules.length})
          </button>
          {carriers.map((c) => {
            const count = pricingRules.filter((r) => r.carrierId === c.carrierId).length;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCarrierFilter(c.carrierId)}
                className={`px-3 py-1 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                  selectedCarrierFilter === c.carrierId
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900 bg-stone-100'
                }`}
              >
                <span>{c.carrierId}</span>
                <span className="px-1 py-0.2 rounded text-[10px] bg-black/10">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pricing Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRules.map((rule) => {
          const carrierName =
            rule.carrierId === 'ALL'
              ? 'اتفاقية عامة لكافة الناقلين'
              : carrierMap[rule.carrierId] || rule.carrierId;

          const materialName =
            rule.materialId === 'ALL_MATERIALS'
              ? 'كافة المواد'
              : materialMap[rule.materialId] || rule.materialId;

          const isConflicting = overlaps.some(
            (c) => c.rule1Id === rule.id || c.rule2Id === rule.id
          );

          const isPerTrip = rule.pricingType === 'PER_TRIP';

          return (
            <div
              key={rule.id}
              id={`rule-card-${rule.id}`}
              className={`p-4 rounded-xl border transition-all ${
                isConflicting
                  ? 'bg-rose-50/80 border-rose-400 ring-2 ring-rose-200'
                  : 'bg-white border-stone-200 shadow-2xs hover:border-amber-300'
              }`}
            >
              {/* Conflict Warning Badge if any */}
              {isConflicting && (
                <div className="mb-2 px-2 py-1 bg-rose-100 text-rose-800 rounded text-[10px] font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                  <span>تضارب زمني متداخل مع قاعدة أخرى!</span>
                </div>
              )}

              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-stone-900 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                      {rule.carrierId}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                        isPerTrip
                          ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {isPerTrip ? 'بالرد (PER_TRIP)' : 'بالطن (PER_TON)'}
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-stone-800 mt-1 line-clamp-1">
                    {carrierName}
                  </h4>
                </div>

                {/* Rate Display */}
                <div className="text-left">
                  <div className="text-base font-black text-amber-700 font-mono">
                    {rule.rate} <span className="text-[10px] font-semibold text-stone-500">SAR</span>
                  </div>
                  <div className="text-[10px] text-stone-400">
                    {isPerTrip ? 'لكل رد واحد' : 'لكل طن صافي'}
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-1.5 text-[11px] text-stone-600 bg-stone-50/70 p-2.5 rounded-lg border border-stone-100">
                <div className="flex items-center justify-between">
                  <span className="text-stone-400 flex items-center gap-1">
                    <Boxes className="w-3 h-3 text-stone-400" />
                    المادة:
                  </span>
                  <span className="font-semibold text-stone-700">{materialName}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-stone-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-stone-400" />
                    فترة السريان:
                  </span>
                  <span className="font-mono text-[10px]">
                    {rule.effectiveFrom || 'البدء'} ➔ {rule.effectiveTo || 'مفتوح'}
                  </span>
                </div>

                {rule.notes && (
                  <div className="pt-1 border-t border-stone-200/50 text-[10px] text-stone-500 italic">
                    "{rule.notes}"
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-1.5 pt-3">
                <button
                  type="button"
                  id={`btn-edit-rule-${rule.id}`}
                  onClick={() => startEdit(rule)}
                  className="px-2.5 py-1 text-stone-600 hover:text-amber-800 hover:bg-amber-50 rounded text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>تعديل</span>
                </button>
                <button
                  type="button"
                  id={`btn-del-rule-${rule.id}`}
                  onClick={() => handleDelete(rule.id)}
                  className="px-2.5 py-1 text-stone-400 hover:text-rose-700 hover:bg-rose-50 rounded text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>حذف</span>
                </button>
              </div>
            </div>
          );
        })}

        {filteredRules.length === 0 && (
          <div className="col-span-full p-8 text-center bg-white border border-stone-200 rounded-xl">
            <CircleDollarSign className="w-8 h-8 text-stone-300 mx-auto mb-2" />
            <p className="text-xs text-stone-500">لا توجد قواعد تسعير مسجلة لهذا الناقل.</p>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowAddForm(true);
              }}
              className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              أضف أول اتفاقية تسعير
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
