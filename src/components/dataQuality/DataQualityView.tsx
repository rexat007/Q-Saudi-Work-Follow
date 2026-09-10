import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Info, 
  ArrowLeft, 
  RefreshCw, 
  SlidersHorizontal, 
  Filter, 
  Check, 
  X, 
  Layers, 
  Truck, 
  UserCheck, 
  Building2, 
  Sparkles, 
  FileSpreadsheet, 
  ChevronRight,
  Database,
  ArrowRight,
  HelpCircle,
  Clock,
  Play,
  CheckCheck
} from 'lucide-react';
import { 
  MatchingResult, 
  RiskLevel, 
  MatchType, 
  ImportRecordPayload, 
  RelationshipContext, 
  PipelineStep,
  QualityIssueCode
} from '../../types/dataQuality';
import { DataQualityEngine } from '../../services/dataQuality/dataQualityEngine';
import { 
  normalizeArabicText, 
  normalizeName, 
  normalizePlate, 
  normalizePhone 
} from '../../services/dataQuality/normalization';
import { 
  SAMPLE_QUALITY_CONTEXT, 
  SAMPLE_STAGED_IMPORTS 
} from '../../data/sampleQualityData';

export function DataQualityView() {
  const [context, setContext] = useState<RelationshipContext>(SAMPLE_QUALITY_CONTEXT);
  const [stagedRecords, setStagedRecords] = useState<ImportRecordPayload[]>(SAMPLE_STAGED_IMPORTS);
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<'ALL' | RiskLevel>('ALL');
  const [selectedRecordId, setSelectedRecordId] = useState<string>(SAMPLE_STAGED_IMPORTS[0].rowId);

  // Sandbox Tester State
  const [sandboxEntityType, setSandboxEntityType] = useState<'CARRIER' | 'TRUCK' | 'DRIVER' | 'MATERIAL'>('CARRIER');
  const [sandboxInput, setSandboxInput] = useState<string>('شركة الفازي للنقل');
  const [sandboxClaimedCarrierId, setSandboxClaimedCarrierId] = useState<string>('CAR-BINLADIN');
  const [activeStepModal, setActiveStepModal] = useState<PipelineStep | null>(null);
  
  // Conflict Resolution Modal
  const [resolvingRecord, setResolvingRecord] = useState<{
    record: ImportRecordPayload;
    conflictType: QualityIssueCode | string;
  } | null>(null);
  const [resolutionCarrierId, setResolutionCarrierId] = useState<string>('');

  // Evaluate staged records with engine
  const evaluatedRecords = useMemo(() => {
    return stagedRecords.map((record) => {
      const evaluation = DataQualityEngine.validateImportRecord(
        {
          rowId: record.rowId,
          rawCarrierName: record.carrierInput?.rawName,
          rawPlate: record.truckInput?.rawPlate,
          claimedCarrierId: record.truckInput?.carrierId || record.carrierInput?.carrierId,
          rawDriverName: record.driverInput?.rawName,
          claimedPhone: record.driverInput?.rawPhone,
          rawMaterialName: record.materialInput?.rawName,
          tareKg: record.truckInput?.tareKg,
          grossKg: record.truckInput?.grossKg,
        },
        context
      );
      return {
        record,
        evaluation,
      };
    });
  }, [stagedRecords, context]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    if (selectedRiskFilter === 'ALL') return evaluatedRecords;
    return evaluatedRecords.filter((item) => item.evaluation.overallRisk === selectedRiskFilter);
  }, [evaluatedRecords, selectedRiskFilter]);

  // Statistics counters
  const stats = useMemo(() => {
    let critical = 0;
    let high = 0;
    let medium = 0;
    let low = 0;
    let resolved = 0;

    evaluatedRecords.forEach((r) => {
      if (r.record.status === 'RESOLVED' || r.record.status === 'ACCEPTED') {
        resolved++;
      }
      switch (r.evaluation.overallRisk) {
        case 'CRITICAL': critical++; break;
        case 'HIGH': high++; break;
        case 'MEDIUM': medium++; break;
        case 'LOW': low++; break;
      }
    });

    return { total: evaluatedRecords.length, critical, high, medium, low, resolved };
  }, [evaluatedRecords]);

  // Sandbox Live Evaluation
  const sandboxEvaluation: MatchingResult = useMemo(() => {
    let candidates: any[] = [];
    switch (sandboxEntityType) {
      case 'CARRIER':
        candidates = context.knownCarriers.map(c => ({
          id: c.carrierId,
          value: c.name,
          normalizedValue: normalizeName(c.name),
          entityType: 'CARRIER',
          metadata: { status: c.status },
        }));
        break;
      case 'TRUCK':
        candidates = context.knownTrucks.map(t => ({
          id: t.truckId,
          value: t.plate,
          normalizedValue: normalizePlate(t.plate),
          entityType: 'TRUCK',
          metadata: { carrierId: t.carrierId, status: t.status },
        }));
        break;
      case 'DRIVER':
        candidates = context.knownDrivers.map(d => ({
          id: d.driverId,
          value: d.name,
          normalizedValue: normalizeName(d.name),
          entityType: 'DRIVER',
          metadata: { carrierId: d.carrierId, status: d.status },
        }));
        break;
      case 'MATERIAL':
        candidates = context.knownMaterials.map(m => ({
          id: m.materialId,
          value: m.name,
          normalizedValue: normalizeName(m.name),
          entityType: 'MATERIAL',
          metadata: { code: m.code, status: m.status },
        }));
        break;
    }

    return DataQualityEngine.evaluateValue(
      sandboxInput,
      candidates,
      sandboxEntityType,
      {
        ...context,
        claimedCarrierId: sandboxClaimedCarrierId,
      } as any
    );
  }, [sandboxInput, sandboxEntityType, sandboxClaimedCarrierId, context]);

  // Handlers for Sandbox Presets
  const applySandboxPreset = (type: 'ALFAZI' | 'TRUCK_CONFLICT' | 'MATERIAL_NOT_ALLOWED' | 'CARRIER_NOT_ALLOWED' | 'DRIVER_CONFLICT' | 'EXACT') => {
    switch (type) {
      case 'ALFAZI':
        setSandboxEntityType('CARRIER');
        setSandboxInput('شركة الفازي للنقل'); // "الفازي" in input vs "الفزي" in DB
        setSandboxClaimedCarrierId('CAR-ALFAZI');
        break;
      case 'TRUCK_CONFLICT':
        setSandboxEntityType('TRUCK');
        setSandboxInput('أ ب ج 1234'); // Belongs to ALMAJDOUIE, but input claims BINLADIN!
        setSandboxClaimedCarrierId('CAR-BINLADIN');
        break;
      case 'MATERIAL_NOT_ALLOWED':
        setSandboxEntityType('MATERIAL');
        setSandboxInput('خلطة إسفلتية ساخنة درجة 60/70'); // Not in NEOM authorized materials
        break;
      case 'CARRIER_NOT_ALLOWED':
        setSandboxEntityType('CARRIER');
        setSandboxInput('مؤسسة الشرقي للتجارة والنقل'); // Not in NEOM authorized carriers
        break;
      case 'DRIVER_CONFLICT':
        setSandboxEntityType('DRIVER');
        setSandboxInput('خالد عبدالله الشمري'); // Belongs to ALMAJDOUIE, not BINLADIN
        setSandboxClaimedCarrierId('CAR-BINLADIN');
        break;
      case 'EXACT':
        setSandboxEntityType('CARRIER');
        setSandboxInput('شركة المجدوعي اللوجستية');
        setSandboxClaimedCarrierId('CAR-ALMAJDOUIE');
        break;
    }
  };

  // Actions on Staged Records
  const handleAcceptRecord = (rowId: string) => {
    setStagedRecords(prev => prev.map(r => {
      if (r.rowId === rowId) {
        return { ...r, status: 'ACCEPTED', resolutionNote: 'تم الاعتماد بعد اجتياز التحقق والمطابقة.' };
      }
      return r;
    }));
  };

  const handleRejectRecord = (rowId: string) => {
    setStagedRecords(prev => prev.map(r => {
      if (r.rowId === rowId) {
        return { ...r, status: 'REJECTED', resolutionNote: 'تم استبعاد وحظر السجل من الإدخال.' };
      }
      return r;
    }));
  };

  const handleOpenResolveModal = (record: ImportRecordPayload, conflictCode: string) => {
    setResolvingRecord({ record, conflictType: conflictCode });
    setResolutionCarrierId(context.authorizedCarrierIds[0]);
  };

  const handleApplyResolution = () => {
    if (!resolvingRecord) return;
    const { record, conflictType } = resolvingRecord;

    setStagedRecords(prev => prev.map(r => {
      if (r.rowId === record.rowId) {
        const updated = { ...r, status: 'RESOLVED' as const };
        if (conflictType === 'CARRIER_TRUCK_CONFLICT') {
          updated.truckInput = {
            ...updated.truckInput!,
            carrierId: resolutionCarrierId,
          };
          updated.resolutionNote = `تم تصحيح تبعية الشاحنة يدوياً إلى الناقل [${resolutionCarrierId}].`;
        } else if (conflictType === 'CARRIER_NOT_ALLOWED') {
          // Authorize carrier in context
          if (!context.authorizedCarrierIds.includes(resolutionCarrierId)) {
            setContext(prev => ({
              ...prev,
              authorizedCarrierIds: [...prev.authorizedCarrierIds, resolutionCarrierId]
            }));
          }
          updated.resolutionNote = `تم ترخيص الناقل [${resolutionCarrierId}] للمشروع يدوياً.`;
        } else if (conflictType === 'MATERIAL_NOT_ALLOWED') {
          const matId = 'MAT-ASPH-01';
          if (!context.authorizedMaterialIds.includes(matId)) {
            setContext(prev => ({
              ...prev,
              authorizedMaterialIds: [...prev.authorizedMaterialIds, matId]
            }));
          }
          updated.resolutionNote = 'تم منح استثناء وتصريح لنقل المادة في المشروع.';
        }
        return updated;
      }
      return r;
    }));

    setResolvingRecord(null);
  };

  // Helper colors
  const getRiskBadge = (level: RiskLevel) => {
    switch (level) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>حرج (CRITICAL) - يمنع الإدخال</span>
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>عالي (HIGH) - لا تعتمد تلقائياً</span>
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-900 border border-sky-200">
            <Info className="w-3.5 h-3.5 text-sky-600" />
            <span>متوسط (MEDIUM) - يتطلب تأكيداً</span>
          </span>
        );
      case 'LOW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-900 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>منخفض (LOW) - اعتماد آمن</span>
          </span>
        );
    }
  };

  const getMatchTypeBadge = (type: MatchType) => {
    switch (type) {
      case 'EXACT':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">تطابق تام (EXACT)</span>;
      case 'FUZZY':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">تطابق تقريبي (FUZZY)</span>;
      case 'RELATIONSHIP':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">تعارض علاقات (RELATIONSHIP)</span>;
      case 'NO_MATCH':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-stone-100 text-stone-700 border border-stone-300">لا يوجد تطابق (NO_MATCH)</span>;
    }
  };

  const pipelineStepsInfo: { step: PipelineStep; title: string; desc: string; icon: any }[] = [
    { step: 'RAW_VALUE', title: '1. RAW VALUE', desc: 'استلام القيمة النصية الأولية من الملف أو واجهة الإدخال بدون أي تعديل.', icon: FileSpreadsheet },
    { step: 'NORMALIZE', title: '2. NORMALIZE', desc: 'معايرة قياسية ذكية تحافظ على المعنى (إزالة التشكيل والتطويل، توحيد الأرقام، الإبقاء على الفروق الجوهرية).', icon: SlidersHorizontal },
    { step: 'EXACT_MATCH', title: '3. EXACT MATCH', desc: 'فحص التطابق التام 100% مع السجلات المفهرسة والمعتمدة في قاعدة البيانات.', icon: CheckCheck },
    { step: 'FUZZY_MATCH', title: '4. FUZZY MATCH', desc: 'خوارزميات التشابه (Levenshtein & Jaro-Winkler) لحساب نسبة التطابق واكتشاف Possible Matches.', icon: Sparkles },
    { step: 'RELATIONSHIP_VALIDATION', title: '5. RELATIONSHIP', desc: 'التحقق الصارم من التبعيات (الشاحنة للناقل، السائق للناقل، والترخيص في المشروع).', icon: Layers },
    { step: 'BUSINESS_VALIDATION', title: '6. BUSINESS RULES', desc: 'مطابقة لوائح النقل السعودية (صيغ اللوحات، أرقام الهويات، حدود الأوزان والحمولات).', icon: ShieldCheck },
    { step: 'RISK_SCORE', title: '7. RISK SCORE', desc: 'احتساب درجة المخاطرة الحتمية (CRITICAL / HIGH / MEDIUM / LOW).', icon: AlertTriangle },
    { step: 'HUMAN_REVIEW', title: '8. HUMAN REVIEW', desc: 'تحديد الإجراء المطلوب وعرض قرارات التدخل البشري والخيارات التصحيحية.', icon: UserCheck },
  ];

  const selectedRecordItem = evaluatedRecords.find(r => r.record.rowId === selectedRecordId) || evaluatedRecords[0];

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="bg-white border border-stone-200/80 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 flex items-center justify-center shrink-0 shadow-xs">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black tracking-tight text-stone-900">
                  محرك جودة البيانات المستقل (Data Quality Engine)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                  بوابة رقابة إلزامية (Pre-Import Gate)
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                  Arabic-Aware Normalization
                </span>
              </div>
              <p className="text-xs sm:text-sm text-stone-600 mt-1">
                يعمل قبل اعتماد أي ملف استيراد (Import) أو تعديل على البيانات المرجعية (Master Data). يمنع الدمج التلقائي الخاطئ (Auto-Merge) ويحظر التعارضات التنظيمية.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start lg:self-auto bg-stone-50 p-1.5 rounded-xl border border-stone-200">
            <div className="text-right px-2">
              <span className="text-[10px] text-stone-500 block font-medium">نطاق المشروع النشط</span>
              <span className="text-xs font-bold text-stone-800">مشروع نيوم - قطاع الشمال (PRJ-NEOM-001)</span>
            </div>
          </div>
        </div>

        {/* Live Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-5 pt-5 border-t border-stone-100 text-right">
          <div className="bg-stone-50/80 p-3 rounded-xl border border-stone-200/60">
            <span className="text-[11px] text-stone-500 font-semibold block">إجمالي السجلات المفحوصة</span>
            <span className="text-xl font-black text-stone-900">{stats.total}</span>
          </div>
          <div className="bg-rose-50/70 p-3 rounded-xl border border-rose-200/60">
            <span className="text-[11px] text-rose-700 font-semibold block">مخاطر حرجة (CRITICAL)</span>
            <span className="text-xl font-black text-rose-800">{stats.critical}</span>
            <span className="text-[10px] text-rose-600 block mt-0.5">يمنع الإدخال نهائياً</span>
          </div>
          <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200/60">
            <span className="text-[11px] text-amber-800 font-semibold block">مخاطر عالية (HIGH)</span>
            <span className="text-xl font-black text-amber-900">{stats.high}</span>
            <span className="text-[10px] text-amber-700 block mt-0.5">لا تعتمد تلقائياً</span>
          </div>
          <div className="bg-sky-50/70 p-3 rounded-xl border border-sky-200/60">
            <span className="text-[11px] text-sky-800 font-semibold block">مخاطر متوسطة (MEDIUM)</span>
            <span className="text-xl font-black text-sky-900">{stats.medium}</span>
            <span className="text-[10px] text-sky-700 block mt-0.5">تتطلب تأكيداً يدوياً</span>
          </div>
          <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200/60">
            <span className="text-[11px] text-emerald-800 font-semibold block">مطابقة وآمنة (LOW)</span>
            <span className="text-xl font-black text-emerald-900">{stats.low}</span>
            <span className="text-[10px] text-emerald-700 block mt-0.5">يمكن اعتمادها</span>
          </div>
        </div>
      </div>

      {/* Pipeline 8-Stage Architecture Flow Visualizer */}
      <div className="bg-stone-900 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-stone-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span>خط الأنابيب المعماري الإلزامي (The 8-Stage Quality Pipeline)</span>
            </h3>
            <p className="text-xs text-stone-400">
              تسلسل حتمي يضمن معالجة كل قيمة مدخلة عبر 8 محطات تدقيق متتالية قبل أي كتابة في Firestore
            </p>
          </div>
          <span className="text-[11px] bg-stone-800 text-amber-300 px-3 py-1 rounded-full border border-stone-700 font-mono">
            Deterministic Pipeline v2.4
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2.5">
          {pipelineStepsInfo.map((p, idx) => {
            const Icon = p.icon;
            return (
              <div 
                key={p.step}
                className="bg-stone-800/80 hover:bg-stone-800 border border-stone-700/80 rounded-xl p-3 flex flex-col justify-between transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <Icon className="w-4 h-4 text-stone-400" />
                  </div>
                  <h4 className="text-xs font-bold text-stone-200 leading-tight">
                    {p.title.split('. ')[1] || p.title}
                  </h4>
                  <p className="text-[10px] text-stone-400 mt-1 line-clamp-3 leading-relaxed">
                    {p.desc}
                  </p>
                </div>
                <div className="mt-2 pt-2 border-t border-stone-700/50 flex items-center justify-between">
                  <span className="text-[9px] text-stone-400 font-mono">STG-{idx+1}</span>
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION: Interactive Sandbox / Real-Time Tester */}
      <div className="bg-white border border-stone-200/80 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 mb-5 border-b border-stone-100 gap-3">
          <div>
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <Play className="w-4 h-4 text-amber-600" />
              <span>مختبر التحقق المباشر وسيناريوهات الاختبار (Interactive Quality Sandbox)</span>
            </h3>
            <p className="text-xs text-stone-500">
              قم بتجربة أي قيمة نصية أو اضغط على أحد السيناريوهات الجاهزة لاختبار سلوك المحرك وتطبيقه الدقيق للقواعد.
            </p>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-stone-500 font-semibold ml-1">سيناريوهات جاهزة:</span>
            <button
              onClick={() => applySandboxPreset('ALFAZI')}
              className="px-2.5 py-1 text-xs rounded-lg bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200/80 font-bold transition-all cursor-pointer"
            >
              الفازي vs الفزي (Possible Match)
            </button>
            <button
              onClick={() => applySandboxPreset('TRUCK_CONFLICT')}
              className="px-2.5 py-1 text-xs rounded-lg bg-rose-50 text-rose-900 hover:bg-rose-100 border border-rose-200/80 font-bold transition-all cursor-pointer"
            >
              تعارض الشاحنة (CARRIER_TRUCK_CONFLICT)
            </button>
            <button
              onClick={() => applySandboxPreset('MATERIAL_NOT_ALLOWED')}
              className="px-2.5 py-1 text-xs rounded-lg bg-rose-50 text-rose-900 hover:bg-rose-100 border border-rose-200/80 font-bold transition-all cursor-pointer"
            >
              مادة غير مسموحة (MATERIAL_NOT_ALLOWED)
            </button>
            <button
              onClick={() => applySandboxPreset('CARRIER_NOT_ALLOWED')}
              className="px-2.5 py-1 text-xs rounded-lg bg-rose-50 text-rose-900 hover:bg-rose-100 border border-rose-200/80 font-bold transition-all cursor-pointer"
            >
              ناقل غير مصرح (CARRIER_NOT_ALLOWED)
            </button>
            <button
              onClick={() => applySandboxPreset('DRIVER_CONFLICT')}
              className="px-2.5 py-1 text-xs rounded-lg bg-rose-50 text-rose-900 hover:bg-rose-100 border border-rose-200/80 font-bold transition-all cursor-pointer"
            >
              تعارض السائق (DRIVER_CARRIER_CONFLICT)
            </button>
            <button
              onClick={() => applySandboxPreset('EXACT')}
              className="px-2.5 py-1 text-xs rounded-lg bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200/80 font-bold transition-all cursor-pointer"
            >
              تطابق تام (Exact Match)
            </button>
          </div>
        </div>

        {/* Sandbox Input Form */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5">
              نوع الكيان المراد مطابقته
            </label>
            <select
              value={sandboxEntityType}
              onChange={(e) => setSandboxEntityType(e.target.value as any)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 font-medium focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            >
              <option value="CARRIER">ناقل (Carrier)</option>
              <option value="TRUCK">شاحنة / لوحة (Truck)</option>
              <option value="DRIVER">سائق (Driver)</option>
              <option value="MATERIAL">مادة (Material)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5">
              القيمة الأولية المدخلة (Raw Value)
            </label>
            <input
              type="text"
              value={sandboxInput}
              onChange={(e) => setSandboxInput(e.target.value)}
              placeholder="اكتب القيمة المدخلة..."
              className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 bg-white font-medium focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5">
              الناقل المزعوم في الملف (Context Carrier)
            </label>
            <select
              value={sandboxClaimedCarrierId}
              onChange={(e) => setSandboxClaimedCarrierId(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 font-medium focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            >
              {context.knownCarriers.map(c => (
                <option key={c.carrierId} value={c.carrierId}>
                  {c.name} {context.authorizedCarrierIds.includes(c.carrierId) ? '✓ (مصرح في المشروع)' : '✗ (غير مصرح في المشروع)'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Sandbox Live Result Card */}
        <div className="bg-stone-50 border border-stone-200/90 rounded-2xl p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-stone-200">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-stone-600">نتيجة الفحص الفوري:</span>
              {getRiskBadge(sandboxEvaluation.riskLevel)}
              {getMatchTypeBadge(sandboxEvaluation.matchType)}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-stone-600">درجة التطابق (Match Score):</span>
              <div className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-lg border border-stone-200 font-mono font-bold text-sm">
                <span className={sandboxEvaluation.matchScore >= 90 ? 'text-emerald-700' : sandboxEvaluation.matchScore >= 65 ? 'text-amber-700' : 'text-stone-700'}>
                  {sandboxEvaluation.matchScore}%
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Matching Result Details */}
            <div className="space-y-3 bg-white p-4 rounded-xl border border-stone-200/70">
              <h4 className="text-xs font-bold text-stone-800 flex items-center justify-between">
                <span>تفاصيل المطابقة وتفسير الخوارزمية</span>
                <span className="text-[10px] text-stone-400 font-mono">ID: {sandboxEvaluation.candidateId || 'N/A'}</span>
              </h4>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-100">
                  <span className="text-[10px] text-stone-500 block">القيمة المدخلة الأصلية (Source)</span>
                  <span className="font-bold text-stone-900">{sandboxEvaluation.sourceValue}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-100">
                  <span className="text-[10px] text-stone-500 block">المرشح في قاعدة البيانات (Candidate)</span>
                  <span className="font-bold text-amber-900">{sandboxEvaluation.candidateValue || 'لا يوجد مرشح'}</span>
                </div>
              </div>

              {/* Reasons & Codes */}
              <div>
                <span className="text-[11px] font-bold text-stone-700 block mb-1">الأسباب والتعليقات النظامية:</span>
                <ul className="space-y-1.5">
                  {sandboxEvaluation.reasons.map((r, i) => (
                    <li key={i} className="text-xs text-stone-700 flex items-start gap-1.5 bg-stone-50/80 p-2 rounded-lg border border-stone-100">
                      <span className="text-amber-600 font-bold shrink-0">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Rules Notice */}
              <div className={`p-3 rounded-xl border text-xs ${
                sandboxEvaluation.riskLevel === 'CRITICAL' 
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : sandboxEvaluation.riskLevel === 'HIGH'
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : sandboxEvaluation.riskLevel === 'MEDIUM'
                  ? 'bg-sky-50 border-sky-200 text-sky-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}>
                <div className="flex items-center gap-2 font-bold mb-1">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>الإجراء الموصى به: {sandboxEvaluation.recommendedAction}</span>
                </div>
                <p className="text-[11px] opacity-90 leading-relaxed">
                  {sandboxEvaluation.explanationAr}
                </p>
              </div>
            </div>

            {/* Pipeline Trace Visualizer */}
            <div className="bg-white p-4 rounded-xl border border-stone-200/70">
              <h4 className="text-xs font-bold text-stone-800 mb-3 flex items-center justify-between">
                <span>تتبع تنفيذ خط الأنابيب (Pipeline Execution Trace)</span>
                <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                  8 مراحل منفذة
                </span>
              </h4>

              <div className="space-y-2">
                {sandboxEvaluation.pipelineTrace.map((t, idx) => (
                  <div 
                    key={t.step}
                    className="flex items-start gap-2 text-xs p-2 rounded-lg bg-stone-50/60 border border-stone-100"
                  >
                    <div className="mt-0.5 shrink-0">
                      {t.status === 'PASSED' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                      {t.status === 'WARNING' && <AlertTriangle className="w-4 h-4 text-amber-600" />}
                      {t.status === 'FAILED' && <XCircle className="w-4 h-4 text-rose-600" />}
                      {t.status === 'SKIPPED' && <Clock className="w-4 h-4 text-stone-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-stone-800">{t.nameAr}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                          t.status === 'PASSED' ? 'bg-emerald-100 text-emerald-800' :
                          t.status === 'WARNING' ? 'bg-amber-100 text-amber-800' :
                          t.status === 'FAILED' ? 'bg-rose-100 text-rose-800' : 'bg-stone-200 text-stone-600'
                        }`}>
                          {t.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-600 mt-0.5 leading-tight">
                        {t.details}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION: Staged Imports & Human Review Queue */}
      <div className="bg-white border border-stone-200/80 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-5 border-b border-stone-100 gap-3">
          <div>
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-amber-600" />
              <span>طابور تدقيق ملفات الاستيراد والمراجعة البشرية (Human Review Queue)</span>
            </h3>
            <p className="text-xs text-stone-500">
              سجلات الشحن والتوريد المحملة من الإكسل تخضع للفحص المسبق وتُصنف حسب المخاطر لمنع تلوث قاعدة البيانات.
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200/80 overflow-x-auto">
            <button
              onClick={() => setSelectedRiskFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedRiskFilter === 'ALL' ? 'bg-stone-900 text-white shadow-xs' : 'text-stone-700 hover:text-stone-900'
              }`}
            >
              الكل ({stats.total})
            </button>
            <button
              onClick={() => setSelectedRiskFilter('CRITICAL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedRiskFilter === 'CRITICAL' ? 'bg-rose-600 text-white shadow-xs' : 'text-rose-700 hover:bg-rose-50'
              }`}
            >
              حرج ({stats.critical})
            </button>
            <button
              onClick={() => setSelectedRiskFilter('HIGH')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedRiskFilter === 'HIGH' ? 'bg-amber-600 text-white shadow-xs' : 'text-amber-800 hover:bg-amber-50'
              }`}
            >
              عالي ({stats.high})
            </button>
            <button
              onClick={() => setSelectedRiskFilter('MEDIUM')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedRiskFilter === 'MEDIUM' ? 'bg-sky-600 text-white shadow-xs' : 'text-sky-800 hover:bg-sky-50'
              }`}
            >
              متوسط ({stats.medium})
            </button>
            <button
              onClick={() => setSelectedRiskFilter('LOW')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedRiskFilter === 'LOW' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-800 hover:bg-emerald-50'
              }`}
            >
              منخفض ({stats.low})
            </button>
          </div>
        </div>

        {/* Table / List of Records */}
        <div className="space-y-4">
          {filteredRecords.map(({ record, evaluation }) => {
            const hasCritical = evaluation.overallRisk === 'CRITICAL';
            const isResolvedOrAccepted = record.status === 'ACCEPTED' || record.status === 'RESOLVED';
            const isRejected = record.status === 'REJECTED';

            return (
              <div 
                key={record.rowId}
                className={`border rounded-2xl p-4 sm:p-5 transition-all ${
                  isRejected 
                    ? 'bg-stone-100/60 border-stone-200 opacity-60'
                    : isResolvedOrAccepted
                    ? 'bg-emerald-50/40 border-emerald-200/80'
                    : hasCritical 
                    ? 'bg-rose-50/30 border-rose-200 hover:border-rose-300' 
                    : evaluation.overallRisk === 'HIGH'
                    ? 'bg-amber-50/20 border-amber-200 hover:border-amber-300'
                    : 'bg-white border-stone-200 hover:border-stone-300'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-stone-100">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold px-2.5 py-1 bg-stone-100 text-stone-700 rounded-lg">
                      {record.rowId}
                    </span>
                    <span className="text-xs text-stone-500 font-medium">
                      المصدر: {record.sourceSheet}
                    </span>
                    {getRiskBadge(evaluation.overallRisk)}
                  </div>

                  {/* Status Tag */}
                  <div>
                    {record.status === 'ACCEPTED' && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                        <Check className="w-3.5 h-3.5" /> تم الاعتماد
                      </span>
                    )}
                    {record.status === 'RESOLVED' && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800">
                        <CheckCheck className="w-3.5 h-3.5" /> تمت المعالجة اليدوية
                      </span>
                    )}
                    {record.status === 'REJECTED' && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-stone-200 text-stone-700">
                        <X className="w-3.5 h-3.5" /> محظور / مستبعد
                      </span>
                    )}
                    {record.status === 'PENDING' && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                        <Clock className="w-3.5 h-3.5" /> قيد المراجعة البشرية
                      </span>
                    )}
                  </div>
                </div>

                {/* Entity Columns Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 my-3">
                  {/* Carrier */}
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
                    <div className="flex items-center justify-between text-[11px] text-stone-500 mb-1">
                      <span className="font-bold flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-amber-600" /> الناقل
                      </span>
                      {evaluation.carrierResult && getMatchTypeBadge(evaluation.carrierResult.matchType)}
                    </div>
                    <p className="text-xs font-bold text-stone-900">
                      {record.carrierInput?.rawName || 'غير محدد'}
                    </p>
                    {evaluation.carrierResult?.candidateValue && (
                      <p className="text-[10px] text-stone-500 mt-0.5">
                        المرشح: {evaluation.carrierResult.candidateValue} ({evaluation.carrierResult.matchScore}%)
                      </p>
                    )}
                  </div>

                  {/* Truck */}
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
                    <div className="flex items-center justify-between text-[11px] text-stone-500 mb-1">
                      <span className="font-bold flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5 text-blue-600" /> الشاحنة
                      </span>
                      {evaluation.truckResult && getMatchTypeBadge(evaluation.truckResult.matchType)}
                    </div>
                    <p className="text-xs font-bold text-stone-900">
                      {record.truckInput?.rawPlate || 'غير محدد'}
                    </p>
                    {record.truckInput?.tareKg && (
                      <p className="text-[10px] text-stone-500 mt-0.5">
                        وزن فارغ: {record.truckInput.tareKg} كجم | إجمالي: {record.truckInput.grossKg} كجم
                      </p>
                    )}
                  </div>

                  {/* Driver */}
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
                    <div className="flex items-center justify-between text-[11px] text-stone-500 mb-1">
                      <span className="font-bold flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600" /> السائق
                      </span>
                      {evaluation.driverResult && getMatchTypeBadge(evaluation.driverResult.matchType)}
                    </div>
                    <p className="text-xs font-bold text-stone-900">
                      {record.driverInput?.rawName || 'غير محدد'}
                    </p>
                    {record.driverInput?.rawPhone && (
                      <p className="text-[10px] text-stone-500 mt-0.5">
                        الجوال: {record.driverInput.rawPhone}
                      </p>
                    )}
                  </div>

                  {/* Material */}
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
                    <div className="flex items-center justify-between text-[11px] text-stone-500 mb-1">
                      <span className="font-bold flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-orange-600" /> المادة
                      </span>
                      {evaluation.materialResult && getMatchTypeBadge(evaluation.materialResult.matchType)}
                    </div>
                    <p className="text-xs font-bold text-stone-900">
                      {record.materialInput?.rawName || 'غير محدد'}
                    </p>
                    {evaluation.materialResult?.candidateValue && (
                      <p className="text-[10px] text-stone-500 mt-0.5">
                        المرشح: {evaluation.materialResult.candidateValue}
                      </p>
                    )}
                  </div>
                </div>

                {/* Summary Issues / Conflicts */}
                {evaluation.summaryIssues.length > 0 && (
                  <div className="mb-3 p-3 rounded-xl bg-rose-50/70 border border-rose-200 text-rose-900 text-xs">
                    <span className="font-bold block mb-1">تنبيهات وملاحظات التحقق:</span>
                    <ul className="space-y-1">
                      {evaluation.summaryIssues.map((issue, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 text-[11px]">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                          <span>{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Resolution note if processed */}
                {record.resolutionNote && (
                  <div className="mb-3 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs">
                    <span className="font-bold">ملاحظة المعالجة: </span>
                    <span>{record.resolutionNote}</span>
                  </div>
                )}

                {/* Action Buttons */}
                {!isResolvedOrAccepted && !isRejected && (
                  <div className="flex flex-wrap items-center justify-between pt-3 border-t border-stone-100 gap-2">
                    <div className="text-xs text-stone-500">
                      {hasCritical ? (
                        <span className="text-rose-700 font-bold">
                          ⛔ لا يمكن الإدخال حتى تتم معالجة التعارض يدوياً.
                        </span>
                      ) : evaluation.overallRisk === 'HIGH' ? (
                        <span className="text-amber-800 font-bold">
                          ⚠️ يتطلب تدخلاً صريحاً لعدم التطابق الكافي.
                        </span>
                      ) : evaluation.overallRisk === 'MEDIUM' ? (
                        <span className="text-sky-800 font-bold">
                          ℹ️ يوجد مرشح تقريبي (Possible Match)، يرجى التأكيد قبل الدمج.
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-bold">
                          ✓ جميع الحقول مطابقة ومجازة نظامياً.
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Resolve conflict button */}
                      {hasCritical && (
                        <button
                          onClick={() => {
                            const conflictCode = evaluation.carrierResult?.issueCodes[0] || 
                              evaluation.truckResult?.issueCodes[0] || 
                              evaluation.materialResult?.issueCodes[0] || 
                              'CARRIER_TRUCK_CONFLICT';
                            handleOpenResolveModal(record, conflictCode);
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                          <span>معالجة وتصحيح التعارض</span>
                        </button>
                      )}

                      {/* Accept Candidate */}
                      {!hasCritical && (
                        <button
                          onClick={() => handleAcceptRecord(record.rowId)}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>اعتماد المرشح المقترح</span>
                        </button>
                      )}

                      {/* Reject / Block */}
                      <button
                        onClick={() => handleRejectRecord(record.rowId)}
                        className="px-3 py-1.5 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-700 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5 text-stone-500" />
                        <span>استبعاد السجل (Block)</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL: Conflict Resolution Dialog */}
      {resolvingRecord && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 text-right animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-100 text-amber-800">
                  <SlidersHorizontal className="w-5 h-5" />
                </span>
                <h4 className="text-base font-bold text-stone-900">
                  معالجة التعارض التنظيمي (Conflict Resolution)
                </h4>
              </div>
              <button 
                onClick={() => setResolvingRecord(null)}
                className="text-stone-400 hover:text-stone-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-xl">
                <span className="font-bold block mb-1">نوع التعارض: {resolvingRecord.conflictType}</span>
                <p className="text-[11px] leading-relaxed">
                  النظام يمنع التعديل التلقائي للعلاقات أو فرض التبعية بدون موافقة صريحة من المشرف اللوجستي.
                </p>
              </div>

              {resolvingRecord.conflictType === 'CARRIER_TRUCK_CONFLICT' && (
                <div>
                  <label className="block font-bold text-stone-700 mb-1.5">
                    اختر الناقل الصحيح الذي تتبع له الشاحنة ({resolvingRecord.record.truckInput?.rawPlate}):
                  </label>
                  <select
                    value={resolutionCarrierId}
                    onChange={(e) => setResolutionCarrierId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white font-medium focus:ring-2 focus:ring-amber-500"
                  >
                    {context.knownCarriers.map(c => (
                      <option key={c.carrierId} value={c.carrierId}>
                        {c.name} {c.carrierId === 'CAR-ALMAJDOUIE' ? '(المالك الرسمي المقيد)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {resolvingRecord.conflictType === 'CARRIER_NOT_ALLOWED' && (
                <div>
                  <p className="text-stone-700 mb-2">
                    الناقل غير مسجل في قائمة المقاولين المعتمدين للمشروع. هل ترغب في ترخيص هذا الناقل وإضافته للمشروع رسمياً؟
                  </p>
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 font-bold text-stone-900">
                    {resolvingRecord.record.carrierInput?.rawName}
                  </div>
                </div>
              )}

              {resolvingRecord.conflictType === 'MATERIAL_NOT_ALLOWED' && (
                <div>
                  <p className="text-stone-700 mb-2">
                    المادة ({resolvingRecord.record.materialInput?.rawName}) غير مدرجة في جدول الكميات المسموح بها للمشروع.
                    هل ترغب في إصدار تصريح استثنائي للمادة؟
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-stone-100">
              <button
                onClick={() => setResolvingRecord(null)}
                className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-all cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={handleApplyResolution}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                تطبيق المعالجة واعتماد السجل
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
