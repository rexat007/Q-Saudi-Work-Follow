import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Sparkles,
  Link2Off,
  UserCheck,
  Truck,
  Building2,
  Package,
  Layers,
  History,
  Check,
  X,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Lock,
  ArrowRight,
  SlidersHorizontal,
  BookmarkCheck,
  FileCheck
} from 'lucide-react';
import {
  EntityResolutionItem,
  EntityResolutionCandidate,
  ResolutionRiskLevel,
  RelationshipStatus,
  TargetEntityType,
  EntityResolutionAuditEntry,
  ApprovedAliasEntry
} from '../../types/entityResolution';
import { EntityResolutionService } from '../../services/import/entityResolution.service';
import { EntityNormalizationService } from '../../services/import/entityNormalization.service';
import { PipelineContext } from '../../types/unifiedImport';

interface SampleDemoRow {
  rowNumber: number;
  ticketId: string;
  sourceCarrier: string;
  sourceTruck: string;
  sourceDriver: string;
  sourceMaterial: string;
  isDuplicate?: boolean;
}

const INITIAL_DEMO_ROWS: SampleDemoRow[] = [
  {
    rowNumber: 1,
    ticketId: 'TKT-2026-001',
    sourceCarrier: 'الشركة الشرقية للنقل',
    sourceTruck: '1010-أ ب ج',
    sourceDriver: 'محمد أحمد',
    sourceMaterial: 'AGG-01',
  },
  {
    rowNumber: 2,
    ticketId: 'TKT-2026-002',
    sourceCarrier: 'الفلاح', // Approved Alias
    sourceTruck: '3030 ر س ط',
    sourceDriver: 'عبدالله مسفر',
    sourceMaterial: 'ركام ناعم 0-5 مم',
  },
  {
    rowNumber: 3,
    ticketId: 'TKT-2026-003',
    sourceCarrier: 'مؤسسة الرمال السريعة', // CRITICAL RELATIONSHIP CONFLICT! Truck is assigned to الشرقية
    sourceTruck: '1010-أ ب ج',
    sourceDriver: 'علي حسن',
    sourceMaterial: 'AGG-01',
  },
  {
    rowNumber: 4,
    ticketId: 'TKT-2026-004',
    sourceCarrier: 'شركة النقل المتحد المحدودة', // Fuzzy Candidate
    sourceTruck: '٥٥٦٦-د هـ و', // Eastern numerals
    sourceDriver: 'سائق جديد غير معروف',
    sourceMaterial: 'أسمنت بورتلاندي خاص', // Unauthorized material for project
  },
  {
    rowNumber: 5,
    ticketId: 'TKT-2026-005',
    sourceCarrier: '', // Truck without carrier!
    sourceTruck: '2020-د هـ و',
    sourceDriver: 'سالم القحطاني',
    sourceMaterial: 'AGG-01',
  },
];

export function EntityResolutionSection() {
  const currentProjectId = 'PRJ-NEOM-NORTH-01';
  const currentUserId = 'USR-INSPECTOR-09';
  const currentUserName = 'م. أحمد الشمري (أخصائي ضبط جودة البيانات)';

  // Mock Pipeline Context with Master Data and Relationships
  const [pipelineContext] = useState<PipelineContext>({
    projectId: currentProjectId,
    userId: currentUserId,
    userName: currentUserName,
    operationId: 'OP-IMPORT-ER-2026',
    knownEntities: {
      carriers: [
        { carrierId: 'CAR-01', name: 'الشركة الشرقية للنقل', projectId: currentProjectId, aliases: ['الشرقية', 'شرقية ترانسبورت'] },
        { carrierId: 'CAR-02', name: 'مؤسسة الرمال السريعة', projectId: currentProjectId, aliases: ['الرمال'] },
        { carrierId: 'CAR-03', name: 'شركة الفلاح للنقل والخدمات اللوجستية', projectId: currentProjectId, aliases: ['الفلاح'] },
        { carrierId: 'CAR-04', name: 'شركة النقل المتحد', projectId: currentProjectId },
      ],
      trucks: [
        { truckId: 'TRK-01', plate: '1010-أ ب ج', carrierId: 'CAR-01', projectId: currentProjectId },
        { truckId: 'TRK-02', plate: '2020-د هـ و', carrierId: 'CAR-02', projectId: currentProjectId },
        { truckId: 'TRK-03', plate: '3030 ر س ط', carrierId: 'CAR-03', projectId: currentProjectId },
        { truckId: 'TRK-04', plate: '5566 د هـ و', carrierId: 'CAR-04', projectId: currentProjectId },
      ],
      drivers: [
        { driverId: 'DRV-01', name: 'محمد أحمد', carrierId: 'CAR-01', projectId: currentProjectId },
        { driverId: 'DRV-02', name: 'علي حسن', carrierId: 'CAR-01', projectId: currentProjectId },
        { driverId: 'DRV-03', name: 'عبدالله مسفر', carrierId: 'CAR-03', projectId: currentProjectId },
      ],
      materials: [
        { materialId: 'MAT-01', name: 'ركام ناعم 0-5 مم', code: 'AGG-01', projectId: currentProjectId },
        { materialId: 'MAT-02', name: 'ركام خشن 10-20 مم', code: 'AGG-02', projectId: currentProjectId },
        { materialId: 'MAT-03', name: 'رمل أحمر مغسول', code: 'SND-01', projectId: currentProjectId },
      ],
      truckCarrierMap: {
        '1010-أ ب ج': 'الشركة الشرقية للنقل',
        '2020-د هـ و': 'مؤسسة الرمال السريعة',
        '3030 ر س ط': 'شركة الفلاح للنقل والخدمات اللوجستية',
        '5566 د هـ و': 'شركة النقل المتحد',
      },
      driverCarrierMap: {
        'محمد أحمد': 'الشركة الشرقية للنقل',
        'علي حسن': 'الشركة الشرقية للنقل',
        'عبدالله مسفر': 'شركة الفلاح للنقل والخدمات اللوجستية',
      },
      projectMaterials: ['AGG-01', 'ركام ناعم 0-5 مم', 'AGG-02', 'ركام خشن 10-20 مم'],
      approvedAliases: {
        CARRIER: {
          'الفلاح': 'CAR-03',
        },
      },
    },
  });

  const [demoRows, setDemoRows] = useState<SampleDemoRow[]>(INITIAL_DEMO_ROWS);
  const [activeRowNumber, setActiveRowNumber] = useState<number>(3); // Row 3 has critical conflict
  const [selectedFieldForDecision, setSelectedFieldForDecision] = useState<TargetEntityType | null>('TRUCK');
  const [customSelectModalOpen, setCustomSelectModalOpen] = useState<boolean>(false);
  const [targetSelectField, setTargetSelectField] = useState<TargetEntityType>('TRUCK');
  const [selectedAlternateId, setSelectedAlternateId] = useState<string>('');
  const [decisionNotes, setDecisionNotes] = useState<string>('');
  const [auditLogVersion, setAuditLogVersion] = useState<number>(0);
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Row overrides applied by user decisions
  const [rowOverrides, setRowOverrides] = useState<Record<number, Record<string, EntityResolutionItem>>>({});

  // Compute resolutions for all demo rows
  const computedResolutions = useMemo(() => {
    const map: Record<number, Record<string, EntityResolutionItem>> = {};

    demoRows.forEach((row) => {
      const overrides = rowOverrides[row.rowNumber] || {};

      // Carrier resolution
      const carrierRes = overrides['CARRIER'] || EntityResolutionService.resolveCarrier(row.sourceCarrier, pipelineContext);

      // Truck resolution
      const truckRes = overrides['TRUCK'] || EntityResolutionService.resolveTruck(
        row.sourceTruck,
        pipelineContext,
        carrierRes,
        row.sourceCarrier
      );

      // Driver resolution
      const driverRes = overrides['DRIVER'] || EntityResolutionService.resolveDriver(
        row.sourceDriver,
        pipelineContext,
        carrierRes,
        row.sourceCarrier
      );

      // Material resolution
      const materialRes = overrides['MATERIAL'] || EntityResolutionService.resolveMaterial(
        row.sourceMaterial,
        pipelineContext
      );

      map[row.rowNumber] = {
        CARRIER: carrierRes,
        TRUCK: truckRes,
        DRIVER: driverRes,
        MATERIAL: materialRes,
      };
    });

    return map;
  }, [demoRows, rowOverrides, pipelineContext]);

  const activeRow = demoRows.find((r) => r.rowNumber === activeRowNumber) || demoRows[0];
  const activeRowRes = computedResolutions[activeRow.rowNumber] || {};
  const activeRowRisk = EntityResolutionService.calculateRowRisk(activeRowRes, activeRow.isDuplicate);
  const canAutoAccept = EntityResolutionService.canAutoAcceptRow(activeRowRes, activeRow.isDuplicate);

  // Apply user decision
  const handleUserDecision = (
    entityType: TargetEntityType,
    decision: 'ACCEPT_CANDIDATE' | 'REJECT_CANDIDATE' | 'SELECT_ALTERNATE' | 'LEAVE_UNRESOLVED',
    selectedId?: string,
    selectedName?: string
  ) => {
    const currentItem = activeRowRes[entityType];
    if (!currentItem) return;

    try {
      const result = EntityResolutionService.applyUserDecision({
        projectId: currentProjectId,
        importBatchId: 'BATCH-ER-DEMO-2026',
        operationId: 'OP-IMPORT-ER-2026',
        rowNumber: activeRow.rowNumber,
        entityType,
        decision,
        selectedEntityId: selectedId,
        selectedDisplayName: selectedName,
        currentRowResolution: currentItem,
        context: pipelineContext,
        actorId: currentUserId,
        notes: decisionNotes || `قرار يدوي: ${decision}`,
      });

      setRowOverrides((prev) => ({
        ...prev,
        [activeRow.rowNumber]: {
          ...(prev[activeRow.rowNumber] || {}),
          [entityType]: result.updatedResolution,
        },
      }));

      setAuditLogVersion((v) => v + 1);
      setDecisionNotes('');
      setCustomSelectModalOpen(false);
    } catch (err: any) {
      alert(`خطأ في تطبيق القرار: ${err.message}`);
    }
  };

  const auditEntries = useMemo(() => {
    return EntityResolutionService.getAuditLog();
  }, [auditLogVersion]);

  const getRiskBadge = (risk: ResolutionRiskLevel) => {
    switch (risk) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-rose-100 text-rose-800 border border-rose-300">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            حرج (CRITICAL)
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            مرتفع (HIGH)
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 border border-blue-300">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            متوسط (MEDIUM)
          </span>
        );
      case 'LOW':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            آمن (LOW)
          </span>
        );
    }
  };

  const getMethodBadge = (method: string) => {
    switch (method) {
      case 'EXACT':
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-emerald-100 text-emerald-800 border border-emerald-200">تطابق تام (EXACT)</span>;
      case 'NORMALIZED':
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-cyan-100 text-cyan-800 border border-cyan-200">مطابقة معيارية (NORMALIZED)</span>;
      case 'ALIAS':
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-purple-100 text-purple-800 border border-purple-200">اسم مستعار معتمد (ALIAS)</span>;
      case 'FUZZY':
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-amber-100 text-amber-800 border border-amber-200">مطابقة تقريبية (FUZZY)</span>;
      default:
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-gray-100 text-gray-700 border border-gray-200">غير معروف (NONE)</span>;
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-xl border border-indigo-900/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-300 text-sm font-semibold mb-1">
              <Sparkles className="w-4 h-4" />
              <span>BLOCK 35 — منظومة حل الكيانات وضبط جودة البيانات الذكية</span>
              <span className="bg-indigo-500/30 text-indigo-200 text-xs px-2.5 py-0.5 rounded-full border border-indigo-400/30">
                Entity Resolution & Data Quality
              </span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              بوابة المطابقة الذكية وفحص العلاقات والنزاهة
            </h2>
            <p className="text-indigo-200/80 text-sm mt-1 max-w-3xl">
              تطبيق استراتيجية المطابقة خماسية المراحل (Exact → Normalized → Alias → Fuzzy → Review)، مع الحظر الصارم لأي دمج صامت،
              والتحقق الإلزامي من نزاهة العلاقات التشغيلية (شاحنة ↔ ناقل، سائق ↔ كفالة، مادة ↔ نطاق المشروع).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
            <div className="text-right">
              <div className="text-xs text-indigo-300">نطاق المشروع المعزول</div>
              <div className="text-sm font-bold text-white flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                {currentProjectId}
              </div>
            </div>
            <div className="h-8 w-px bg-white/15 mx-1" />
            <div className="text-right">
              <div className="text-xs text-indigo-300">السياسة الرقابية</div>
              <div className="text-sm font-semibold text-amber-300 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                لا دمج صامت (Zero Silent Merge)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Rows List on Left, Active Row Resolution on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Sample Rows in Batch */}
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                صفوف الدفعة التجريبية (Batch Rows)
              </h3>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                {demoRows.length} سجلات
              </span>
            </div>

            <div className="space-y-2">
              {demoRows.map((row) => {
                const res = computedResolutions[row.rowNumber] || {};
                const risk = EntityResolutionService.calculateRowRisk(res, row.isDuplicate);
                const hasConflict = Object.values(res).some((r) => r.relationshipStatus === 'RELATIONSHIP_CONFLICT');
                const isSelected = row.rowNumber === activeRowNumber;

                return (
                  <button
                    key={row.rowNumber}
                    onClick={() => setActiveRowNumber(row.rowNumber)}
                    className={`w-full text-right p-3 rounded-lg border transition-all duration-150 flex flex-col gap-1.5 ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 shadow-sm ring-1 ring-indigo-500'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-xs flex items-center justify-center">
                          {row.rowNumber}
                        </span>
                        <span>{row.ticketId}</span>
                      </div>
                      {getRiskBadge(risk)}
                    </div>

                    <div className="text-xs text-slate-600 grid grid-cols-2 gap-1 mt-1">
                      <div><span className="text-slate-400">شاحنة:</span> {row.sourceTruck}</div>
                      <div><span className="text-slate-400">ناقل:</span> {row.sourceCarrier || '— مفقود —'}</div>
                    </div>

                    {hasConflict && (
                      <div className="mt-1 bg-rose-100 text-rose-800 text-[11px] px-2 py-0.5 rounded font-bold flex items-center gap-1 border border-rose-200">
                        <Link2Off className="w-3.5 h-3.5" />
                        تعارض في العلاقة (Truck ↔ Carrier Conflict)
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Rules Summary Card */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2">
            <div className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
              <BookmarkCheck className="w-4 h-4 text-emerald-600" />
              قواعد الاعتماد الصارمة (BLOCK 35 Invariants)
            </div>
            <ul className="space-y-1.5 list-disc list-inside text-slate-600">
              <li>المطابقة التقريبية (Fuzzy) <strong className="text-rose-600">لا تعتمد تلقائياً أبداً</strong>.</li>
              <li>إذا كانت الشاحنة معينة لناقل (A) وجاء الملف بناقل (B)، يتم تصنيف الحالة <strong className="text-rose-600">تعارض علاقة حرج</strong>.</li>
              <li>لا يتم أبداً تخمين الناقل إذا كان مفقوداً من التذكرة.</li>
              <li>يتم منع أي محاولة لربط كيان من خارج نطاق المشروع.</li>
              <li>صفر عمليات كتابة على قاعدة البيانات في مرحلة القرار.</li>
            </ul>
          </div>
        </div>

        {/* Right Column: Active Row Deep Resolution Panel */}
        <div className="lg:col-span-8 space-y-5">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            {/* Header of Active Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
              <div>
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <span>فحص السجل الوارد رقم {activeRow.rowNumber}</span>
                  <span>•</span>
                  <span>تذكرة: <strong className="text-slate-800">{activeRow.ticketId}</strong></span>
                </div>
                <div className="text-lg font-bold text-slate-900 mt-0.5 flex items-center gap-2">
                  <span>نتائج حل الكيانات وفحص العلاقات</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className="text-[11px] text-slate-500">مستوى مخاطر السجل</div>
                  <div className="mt-0.5">{getRiskBadge(activeRowRisk)}</div>
                </div>
                <div className="h-8 w-px bg-slate-200 mx-2" />
                <div className="text-right">
                  <div className="text-[11px] text-slate-500">الاعتماد التلقائي</div>
                  <div className="mt-0.5">
                    {canAutoAccept ? (
                      <span className="text-xs px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold border border-emerald-300">
                        متاح (Auto-Accept Safe)
                      </span>
                    ) : (
                      <span className="text-xs px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full font-bold border border-amber-300">
                        محظور (Requires Review)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Entities Resolution Breakdown */}
            <div className="mt-4 space-y-4">

              {/* 1. TRUCK Entity Card */}
              {activeRowRes.TRUCK && (
                <div className={`p-4 rounded-xl border transition-all ${
                  activeRowRes.TRUCK.relationshipStatus === 'RELATIONSHIP_CONFLICT'
                    ? 'border-rose-300 bg-rose-50/50'
                    : activeRowRes.TRUCK.relationshipStatus === 'TRUCK_MATCHED_CARRIER_UNKNOWN'
                    ? 'border-amber-300 bg-amber-50/50'
                    : 'border-slate-200 bg-slate-50/50'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                        <Truck className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-slate-800 text-sm">الشاحنة / لوحة المركبة (Truck Plate)</span>
                      {getMethodBadge(activeRowRes.TRUCK.matchMethod)}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">نسبة الثقة:</span>
                      <span className="text-xs font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {Math.round(activeRowRes.TRUCK.confidence * 100)}%
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <div className="text-slate-400 mb-1">القيمة الأصلية من الملف (Raw Value):</div>
                      <div className="font-bold text-slate-800 text-sm font-mono">{activeRowRes.TRUCK.sourceValue || '—'}</div>
                      <div className="text-[11px] text-slate-500 mt-1">المعايرة: {activeRowRes.TRUCK.normalizedValue}</div>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <div className="text-slate-400 mb-1">الكيان المقترح في السجلات (Matched Master):</div>
                      <div className="font-bold text-indigo-700 text-sm">
                        {activeRowRes.TRUCK.matchedValue || 'غير مسجل في الأسطول'}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        معرف الكيان: {activeRowRes.TRUCK.entityId || 'لا يوجد'}
                      </div>
                    </div>
                  </div>

                  {/* CRITICAL RELATIONSHIP CONFLICT BANNER */}
                  {activeRowRes.TRUCK.relationshipStatus === 'RELATIONSHIP_CONFLICT' && (
                    <div className="mt-3 p-3 bg-rose-100/80 border border-rose-300 rounded-lg text-rose-900 text-xs">
                      <div className="font-bold flex items-center gap-1.5 text-rose-800 mb-1">
                        <ShieldAlert className="w-4 h-4 text-rose-600" />
                        تعارض علاقة حرج (RELATIONSHIP CONFLICT): الشاحنة ↔ الناقل
                      </div>
                      <p className="leading-relaxed">
                        {activeRowRes.TRUCK.conflictDetails}
                      </p>
                      <div className="mt-2 p-2 bg-white/80 rounded border border-rose-200 flex items-center justify-between text-[11px]">
                        <div>الناقل الفعلي للشاحنة بالسجلات: <strong className="text-slate-800">الشركة الشرقية للنقل</strong></div>
                        <div className="text-rose-700 font-bold">الناقل المدعى بالملف: {activeRow.sourceCarrier}</div>
                      </div>
                    </div>
                  )}

                  {/* TRUCK MATCHED BUT CARRIER UNKNOWN */}
                  {activeRowRes.TRUCK.relationshipStatus === 'TRUCK_MATCHED_CARRIER_UNKNOWN' && (
                    <div className="mt-3 p-3 bg-amber-100/80 border border-amber-300 rounded-lg text-amber-900 text-xs">
                      <div className="font-bold flex items-center gap-1.5 text-amber-800 mb-1">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        الشاحنة معروفة ولكن الناقل مفقود (TRUCK_MATCHED_CARRIER_UNKNOWN)
                      </div>
                      <p className="leading-relaxed">{activeRowRes.TRUCK.conflictDetails}</p>
                    </div>
                  )}

                  {/* Human Decision Buttons */}
                  <div className="mt-3 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-end gap-2">
                    <button
                      onClick={() => handleUserDecision('TRUCK', 'ACCEPT_CANDIDATE')}
                      disabled={!activeRowRes.TRUCK.entityId}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold flex items-center gap-1 disabled:opacity-40"
                    >
                      <Check className="w-3.5 h-3.5" />
                      قبول المقترح
                    </button>
                    <button
                      onClick={() => handleUserDecision('TRUCK', 'REJECT_CANDIDATE')}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-xs font-semibold border border-rose-200 flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" />
                      رفض المقترح
                    </button>
                    <button
                      onClick={() => {
                        setTargetSelectField('TRUCK');
                        setCustomSelectModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-xs font-semibold border border-indigo-200 flex items-center gap-1"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      اختيار شاحنة أخرى من المشروع
                    </button>
                  </div>
                </div>
              )}

              {/* 2. CARRIER Entity Card */}
              {activeRowRes.CARRIER && (
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-purple-100 text-purple-700 rounded-lg">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-slate-800 text-sm">الناقل التشغيلي (Carrier)</span>
                      {getMethodBadge(activeRowRes.CARRIER.matchMethod)}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">نسبة الثقة:</span>
                      <span className="text-xs font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {Math.round(activeRowRes.CARRIER.confidence * 100)}%
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <div className="text-slate-400 mb-1">القيمة الأصلية من الملف (Raw Value):</div>
                      <div className="font-bold text-slate-800 text-sm">{activeRowRes.CARRIER.sourceValue || '— مفقود —'}</div>
                      <div className="text-[11px] text-slate-500 mt-1">المعايرة: {activeRowRes.CARRIER.normalizedValue || '—'}</div>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <div className="text-slate-400 mb-1">الناقل المطابق / المقترح:</div>
                      <div className="font-bold text-indigo-700 text-sm">
                        {activeRowRes.CARRIER.matchedValue || 'غير معروف'}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        معرف الناقل: {activeRowRes.CARRIER.entityId || 'لا يوجد'}
                      </div>
                    </div>
                  </div>

                  {activeRowRes.CARRIER.conflictDetails && (
                    <div className="mt-2 text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                      {activeRowRes.CARRIER.conflictDetails}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-3 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-end gap-2">
                    <button
                      onClick={() => handleUserDecision('CARRIER', 'ACCEPT_CANDIDATE')}
                      disabled={!activeRowRes.CARRIER.entityId}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold flex items-center gap-1 disabled:opacity-40"
                    >
                      <Check className="w-3.5 h-3.5" />
                      قبول المقترح
                    </button>
                    <button
                      onClick={() => {
                        setTargetSelectField('CARRIER');
                        setCustomSelectModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-xs font-semibold border border-indigo-200 flex items-center gap-1"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      اختيار ناقل آخر
                    </button>
                  </div>
                </div>
              )}

              {/* 3. MATERIAL Entity Card */}
              {activeRowRes.MATERIAL && (
                <div className={`p-4 rounded-xl border transition-all ${
                  activeRowRes.MATERIAL.relationshipStatus === 'MATERIAL_PROJECT_CONFLICT'
                    ? 'border-rose-300 bg-rose-50/50'
                    : 'border-slate-200 bg-slate-50/50'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
                        <Package className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-slate-800 text-sm">المادة الموردة ونطاق المشروع (Material Scope)</span>
                      {getMethodBadge(activeRowRes.MATERIAL.matchMethod)}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">نسبة الثقة:</span>
                      <span className="text-xs font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {Math.round(activeRowRes.MATERIAL.confidence * 100)}%
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <div className="text-slate-400 mb-1">المادة بالملف:</div>
                      <div className="font-bold text-slate-800 text-sm">{activeRowRes.MATERIAL.sourceValue}</div>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <div className="text-slate-400 mb-1">المطابقة المعتمدة:</div>
                      <div className="font-bold text-indigo-700 text-sm">{activeRowRes.MATERIAL.matchedValue || 'غير مطابقة'}</div>
                    </div>
                  </div>

                  {activeRowRes.MATERIAL.relationshipStatus === 'MATERIAL_PROJECT_CONFLICT' && (
                    <div className="mt-3 p-3 bg-rose-100/80 border border-rose-300 rounded-lg text-rose-900 text-xs">
                      <div className="font-bold flex items-center gap-1.5 text-rose-800 mb-1">
                        <ShieldAlert className="w-4 h-4 text-rose-600" />
                        تعارض المادة مع نطاق المشروع (MATERIAL_PROJECT_CONFLICT)
                      </div>
                      <p className="leading-relaxed">{activeRowRes.MATERIAL.conflictDetails}</p>
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        setTargetSelectField('MATERIAL');
                        setCustomSelectModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-xs font-semibold border border-indigo-200 flex items-center gap-1"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      اختيار مادة معتمدة من المشروع
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Audit Trail of Human Decisions */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600" />
                سجل تدقيق قرارات حل الكيانات (Resolution Audit Trail)
              </h4>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                {auditEntries.length} قرارات موثقة
              </span>
            </div>

            {auditEntries.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500">
                لم يتم اتخاذ قرارات يدوية بعد. كافة المقترحات في وضع المراجعة أو معتمدة وفق السياسة الآلية.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                    <tr>
                      <th className="p-2">الوقت</th>
                      <th className="p-2">الصف</th>
                      <th className="p-2">الكيان</th>
                      <th className="p-2">القرار المتخذ</th>
                      <th className="p-2">القيمة المختارة</th>
                      <th className="p-2">المستخدم</th>
                      <th className="p-2">الملاحظات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditEntries.slice(-5).reverse().map((entry, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2 font-mono text-slate-500">{new Date(entry.timestamp).toLocaleTimeString('ar-SA')}</td>
                        <td className="p-2 font-bold text-slate-800">#{entry.rowId}</td>
                        <td className="p-2 font-semibold text-indigo-700">{entry.entityType}</td>
                        <td className="p-2">
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800">
                            {entry.decision}
                          </span>
                        </td>
                        <td className="p-2 font-bold text-slate-800">{entry.selectedEntityId || '—'}</td>
                        <td className="p-2 text-slate-600">{entry.actorId}</td>
                        <td className="p-2 text-slate-500 text-[11px]">{entry.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Modal: Select Alternate Entity from Master Data */}
      {customSelectModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-indigo-600" />
                اختيار كيان معتمد من نطاق المشروع ({targetSelectField})
              </h3>
              <button
                onClick={() => setCustomSelectModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              اختر الكيان المعتمد المخصص لمشروع <strong className="text-slate-800">{currentProjectId}</strong>.
              يمنع النظام الرقابي اختيار أي كيان لا يتبع هذا المشروع.
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {targetSelectField === 'TRUCK' &&
                pipelineContext.knownEntities?.trucks?.map((trk) => (
                  <button
                    key={trk.truckId}
                    onClick={() => {
                      handleUserDecision('TRUCK', 'SELECT_ALTERNATE', trk.truckId, trk.plate);
                    }}
                    className="w-full p-3 text-right rounded-lg border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-800 text-sm font-mono">{trk.plate}</div>
                      <div className="text-slate-500 text-[11px]">الناقل: {trk.carrierId || 'غير محدد'}</div>
                    </div>
                    <span className="text-indigo-600 font-semibold">اختيار</span>
                  </button>
                ))}

              {targetSelectField === 'CARRIER' &&
                pipelineContext.knownEntities?.carriers?.map((car) => (
                  <button
                    key={car.carrierId}
                    onClick={() => {
                      handleUserDecision('CARRIER', 'SELECT_ALTERNATE', car.carrierId, car.name);
                    }}
                    className="w-full p-3 text-right rounded-lg border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-800 text-sm">{car.name}</div>
                      <div className="text-slate-500 text-[11px]">معرف: {car.carrierId}</div>
                    </div>
                    <span className="text-indigo-600 font-semibold">اختيار</span>
                  </button>
                ))}

              {targetSelectField === 'MATERIAL' &&
                pipelineContext.knownEntities?.materials?.map((mat) => (
                  <button
                    key={mat.materialId}
                    onClick={() => {
                      handleUserDecision('MATERIAL', 'SELECT_ALTERNATE', mat.materialId, mat.name);
                    }}
                    className="w-full p-3 text-right rounded-lg border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-800 text-sm">{mat.name}</div>
                      <div className="text-slate-500 text-[11px]">الرمز: {mat.code || mat.materialId}</div>
                    </div>
                    <span className="text-indigo-600 font-semibold">اختيار</span>
                  </button>
                ))}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setCustomSelectModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
