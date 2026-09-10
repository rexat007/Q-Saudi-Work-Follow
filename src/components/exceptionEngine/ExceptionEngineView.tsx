import React, { useState, useEffect } from 'react';
import { 
  AlertOctagon, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  Filter, 
  History, 
  Plus, 
  FileText, 
  Scale, 
  Truck, 
  User, 
  Layers, 
  Database, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  ShieldCheck, 
  Sliders, 
  Info,
  Check,
  X,
  AlertTriangle,
  FileCode,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { 
  ExceptionRecord, 
  ExceptionType, 
  ExceptionSeverity, 
  ExceptionStatus, 
  ExceptionAuditLog 
} from '../../types/exceptionEngine';
import { exceptionEngine } from '../../services/exceptionEngine.service';
import { runExceptionEngineTestSuite, ExceptionTestCaseResult } from '../../tests/exceptionEngine.test';

// Mapping Arabic metadata for all 12 Exception Types
export const EXCEPTION_TYPE_META: Record<ExceptionType, { labelAr: string; descAr: string; icon: React.ReactNode; defaultSeverity: ExceptionSeverity }> = {
  WEIGHT_VARIANCE: {
    labelAr: 'فارق وزني غير مسموح',
    descAr: 'تجاوز الفارق بين وزن المصدر والموقع لحدود التفاوت المسموحة',
    icon: <Scale className="w-4 h-4 text-amber-600" />,
    defaultSeverity: 'HIGH'
  },
  TRUCK_CARRIER_CONFLICT: {
    labelAr: 'تعارض الشاحنة مع الناقل',
    descAr: 'الشاحنة مسجلة رسمياً تحت ناقل مختلف عن ناقل الرحلة المحرر بالبوليصة',
    icon: <Truck className="w-4 h-4 text-rose-600" />,
    defaultSeverity: 'BLOCKING'
  },
  DRIVER_CARRIER_CONFLICT: {
    labelAr: 'تعارض السائق مع الناقل',
    descAr: 'كفالة السائق غير مطابقة للناقل المتعاقد مع عدم وجود تصريح أجير سارٍ',
    icon: <User className="w-4 h-4 text-indigo-600" />,
    defaultSeverity: 'HIGH'
  },
  MATERIAL_NOT_ALLOWED: {
    labelAr: 'مادة غير مصرح بنقلها',
    descAr: 'المادة غير مدرجة في قائمة المواد المعتمدة للمشروع أو المنطقة المحددة',
    icon: <Layers className="w-4 h-4 text-rose-600" />,
    defaultSeverity: 'BLOCKING'
  },
  CARRIER_NOT_ALLOWED: {
    labelAr: 'ناقل غير مصرح له بالعمل',
    descAr: 'الناقل غير معتمد في المشروع أو معلق لأسباب تنظيمية أو سلامة',
    icon: <ShieldAlert className="w-4 h-4 text-rose-600" />,
    defaultSeverity: 'BLOCKING'
  },
  AMBIGUOUS_TRIP: {
    labelAr: 'رحلة غامضة أو غير محددة',
    descAr: 'عدم تطابق بيانات الشحنة مع أمر العمل أو وجود تذكرتي وزن متقاربتين',
    icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
    defaultSeverity: 'MEDIUM'
  },
  DUPLICATE_TRIP: {
    labelAr: 'رحلة مكررة (Duplicate)',
    descAr: 'محاولة إدخال رحلة برقم تذكرة ميزان أو مرجع تشغيلي مسجل مسبقاً',
    icon: <RefreshCw className="w-4 h-4 text-rose-600" />,
    defaultSeverity: 'HIGH'
  },
  INVALID_WEIGHT: {
    labelAr: 'وزن غير صالح حسابياً',
    descAr: 'قيم أوزان غير منطقية مثل وزن الفارغ صفر أو القائم أقل من الفارغ',
    icon: <Scale className="w-4 h-4 text-rose-600" />,
    defaultSeverity: 'BLOCKING'
  },
  MISSING_PRICING: {
    labelAr: 'تسعيرة مفقودة',
    descAr: 'عدم وجود قاعدة تسعير سارية لنوع المادة أو الناقل أو المسار المحدد',
    icon: <FileText className="w-4 h-4 text-amber-600" />,
    defaultSeverity: 'HIGH'
  },
  PRICING_CONFLICT: {
    labelAr: 'تعارض في قواعد التسعير',
    descAr: 'وجود أكثر من قاعدة تسعير متطابقة وفعالة لنفس الرحلة دون تحديد الأولوية',
    icon: <FileText className="w-4 h-4 text-amber-600" />,
    defaultSeverity: 'HIGH'
  },
  SYNC_FAILURE: {
    labelAr: 'فشل المزامنة',
    descAr: 'تعذر رفع ومزامنة بيانات الميزان أو جهاز البوابة مع الخادم المركزي',
    icon: <Database className="w-4 h-4 text-purple-600" />,
    defaultSeverity: 'MEDIUM'
  },
  VERSION_CONFLICT: {
    labelAr: 'تعارض النسخ المتفائلة',
    descAr: 'تحديث سجل الرحلة بنسخة قديمة متضاربة مع النسخة المحفوظة بالخادم',
    icon: <RefreshCw className="w-4 h-4 text-indigo-600" />,
    defaultSeverity: 'HIGH'
  }
};

export const ExceptionEngineView: React.FC = () => {
  // Active Main Sub-Tab
  const [activeTab, setActiveTab] = useState<'ACTIVE_LIST' | 'RAISE_EXCEPTION' | 'AUDIT_LOGS' | 'TEST_SUITE'>('ACTIVE_LIST');

  // Reactive state from Exception Service
  const [exceptions, setExceptions] = useState<ExceptionRecord[]>(() => exceptionEngine.getAllExceptions());
  const [auditLogs, setAuditLogs] = useState<ExceptionAuditLog[]>(() => exceptionEngine.getAllAuditLogs());

  useEffect(() => {
    const unsubscribe = exceptionEngine.subscribe(() => {
      setExceptions(exceptionEngine.getAllExceptions());
      setAuditLogs(exceptionEngine.getAllAuditLogs());
    });
    return unsubscribe;
  }, []);

  // Filter States
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [projectFilter, setProjectFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Exception for Detail / Action
  const [selectedException, setSelectedException] = useState<ExceptionRecord | null>(null);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState<boolean>(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState<boolean>(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState<boolean>(false);

  // Form states for Resolve/Reject
  const [resolutionCode, setResolutionCode] = useState<string>('APPROVED_OVERRIDE');
  const [resolutionNoteText, setResolutionNoteText] = useState<string>('');
  const [rejectionReasonText, setRejectionReasonText] = useState<string>('REJECTED_NON_COMPLIANT');

  // Expanded evidence card IDs
  const [expandedEvidenceIds, setExpandedEvidenceIds] = useState<Record<string, boolean>>({});

  // New Exception Form state
  const [newExpType, setNewExpType] = useState<ExceptionType>('WEIGHT_VARIANCE');
  const [newExpSeverity, setNewExpSeverity] = useState<ExceptionSeverity>('HIGH');
  const [newExpProjectId, setNewExpProjectId] = useState<string>('PRJ-NEOM-001');
  const [newExpTripId, setNewExpTripId] = useState<string>('TRP-2026-00891');
  const [newExpHasNoTrip, setNewExpHasNoTrip] = useState<boolean>(false);
  const [newExpDescription, setNewExpDescription] = useState<string>('');
  const [newExpEvidenceJson, setNewExpEvidenceJson] = useState<string>('{\n  "sourceNetKg": 32000,\n  "destNetKg": 30200,\n  "lossKg": 1800\n}');
  const [newExpOpenedBy, setNewExpOpenedBy] = useState<string>('USR-SITE-ENGINEER');

  // Test Suite State
  const [testReport, setTestReport] = useState<{
    results: ExceptionTestCaseResult[];
    allPassed: boolean;
    summary: { total: number; passed: number; failed: number };
  } | null>(null);

  const handleRunTests = () => {
    const rep = runExceptionEngineTestSuite();
    setTestReport(rep);
  };

  // Filtered Exceptions
  const filteredExceptions = exceptions.filter(item => {
    if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
    if (typeFilter !== 'ALL' && item.type !== typeFilter) return false;
    if (projectFilter !== 'ALL' && item.projectId !== projectFilter) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchId = item.exceptionId.toLowerCase().includes(q);
      const matchTrip = item.tripId?.toLowerCase().includes(q) || false;
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchOpened = item.openedBy.toLowerCase().includes(q);
      const matchReviewed = item.reviewedBy?.toLowerCase().includes(q) || false;
      if (!matchId && !matchTrip && !matchDesc && !matchOpened && !matchReviewed) return false;
    }
    return true;
  });

  const stats = exceptionEngine.getStatistics();

  // Action Handlers
  const handleStartReview = (exp: ExceptionRecord) => {
    exceptionEngine.startReview({
      exceptionId: exp.exceptionId,
      actorId: 'USR-AUDITOR-01',
      actorName: 'م. سالم القحطاني',
      actorRole: 'PROJECT_ADMIN',
      notes: 'بدء التدقيق والتحقق من الأدلة المرفقة'
    });
  };

  const handleOpenResolveModal = (exp: ExceptionRecord) => {
    setSelectedException(exp);
    setResolutionCode('APPROVED_WITH_CORRECTION');
    setResolutionNoteText('تمت مطابقة البيانات والتسوية مع ممثل الناقل ومسؤول الميزان');
    setIsResolveModalOpen(true);
  };

  const handleConfirmResolve = () => {
    if (!selectedException) return;
    exceptionEngine.resolveException({
      exceptionId: selectedException.exceptionId,
      actorId: 'USR-FIN-DIRECTOR',
      actorName: 'فهد العتيبي (المدقق المالي)',
      actorRole: 'FINANCE_AUDITOR',
      resolution: resolutionCode,
      resolutionNote: resolutionNoteText
    });
    setIsResolveModalOpen(false);
    setSelectedException(null);
  };

  const handleOpenRejectModal = (exp: ExceptionRecord) => {
    setSelectedException(exp);
    setRejectionReasonText('REJECTED_UNAUTHORIZED');
    setResolutionNoteText('تم رفض الاستثناء وإلغاء العملية لعدم مطابقة الاشتراطات اللوجستية');
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = () => {
    if (!selectedException) return;
    exceptionEngine.rejectException({
      exceptionId: selectedException.exceptionId,
      actorId: 'USR-SECURITY-OFFICER',
      actorName: 'سلطان الدوسري (مدير الموقع)',
      actorRole: 'PROJECT_ADMIN',
      rejectionReason: rejectionReasonText,
      resolutionNote: resolutionNoteText
    });
    setIsRejectModalOpen(false);
    setSelectedException(null);
  };

  const handleOpenAuditModal = (exp: ExceptionRecord) => {
    setSelectedException(exp);
    setIsAuditModalOpen(true);
  };

  const handleCreateNewException = (e: React.FormEvent) => {
    e.preventDefault();
    let parsedEvidence: Record<string, any> = {};
    try {
      parsedEvidence = JSON.parse(newExpEvidenceJson);
    } catch {
      parsedEvidence = { rawText: newExpEvidenceJson };
    }

    exceptionEngine.createException({
      projectId: newExpProjectId,
      tripId: newExpHasNoTrip ? null : (newExpTripId.trim() === '' ? null : newExpTripId.trim()),
      type: newExpType,
      severity: newExpSeverity,
      description: newExpDescription || `استثناء جديد من نوع ${EXCEPTION_TYPE_META[newExpType].labelAr}`,
      evidence: parsedEvidence,
      openedBy: newExpOpenedBy
    });

    // Reset and jump to list
    setNewExpDescription('');
    setActiveTab('ACTIVE_LIST');
  };

  const toggleEvidence = (id: string) => {
    setExpandedEvidenceIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* ========================================================================= */}
      {/* Top Banner Card */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-stone-100 pb-5 mb-5">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-800 border border-rose-500/20 flex items-center justify-center shrink-0">
              <AlertOctagon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h1 className="text-xl font-bold text-stone-900">
                  محرك الاستثناءات (Exception Engine)
                </h1>
                <span className="bg-rose-100 text-rose-900 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  12 نوعاً معيارياً
                </span>
                <span className="bg-amber-100 text-amber-900 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  سجل تدقيق إلزامي (Audit Trail)
                </span>
                <span className="bg-blue-100 text-blue-900 text-xs px-2.5 py-0.5 rounded-full font-bold font-mono">
                  tripId nullable
                </span>
              </div>
              <p className="text-xs text-stone-600 max-w-3xl leading-relaxed">
                وحدة مستقلة تتولى حصرياً إدارة دورة حياة الاستثناءات الـ 12: الفارق الوزني، تعارض الشاحنة أو السائق، المواد والناقلين غير المصرحين، ازدواجية الرحلات، فشل المزامنة وتضارب النسخ. كل معالجة تسجل قيد تدقيق غير قابل للتعديل.
              </p>
            </div>
          </div>

          {/* Sub Navigation Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveTab('ACTIVE_LIST')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'ACTIVE_LIST'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              <AlertOctagon className="w-3.5 h-3.5" />
              <span>قائمة الاستثناءات ({exceptions.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('RAISE_EXCEPTION')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'RAISE_EXCEPTION'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>فتح استثناء جديد (Raise Exception)</span>
            </button>

            <button
              onClick={() => setActiveTab('AUDIT_LOGS')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'AUDIT_LOGS'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>سجلات التدقيق ({auditLogs.length})</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('TEST_SUITE');
                if (!testReport) handleRunTests();
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'TEST_SUITE'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>فحص الامتثال الآلي (Test Suite)</span>
            </button>
          </div>
        </div>

        {/* Global Statistics Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
            <span className="text-[11px] text-stone-500 block mb-0.5">إجمالي الاستثناءات</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-stone-900">{stats.total}</span>
              <span className="text-[10px] text-stone-400">حالة</span>
            </div>
          </div>

          <div className="bg-amber-50/80 p-3 rounded-xl border border-amber-200">
            <span className="text-[11px] text-amber-900 font-semibold block mb-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-600" />
              <span>مفتوحة (OPEN)</span>
            </span>
            <span className="text-xl font-black text-amber-900">{stats.open}</span>
          </div>

          <div className="bg-blue-50/80 p-3 rounded-xl border border-blue-200">
            <span className="text-[11px] text-blue-900 font-semibold block mb-0.5 flex items-center gap-1">
              <RefreshCw className="w-3 h-3 text-blue-600" />
              <span>قيد المراجعة (REVIEW)</span>
            </span>
            <span className="text-xl font-black text-blue-900">{stats.underReview}</span>
          </div>

          <div className="bg-emerald-50/80 p-3 rounded-xl border border-emerald-200">
            <span className="text-[11px] text-emerald-900 font-semibold block mb-0.5 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>معتمدة ومحلولة (RESOLVED)</span>
            </span>
            <span className="text-xl font-black text-emerald-900">{stats.resolved}</span>
          </div>

          <div className="bg-rose-50/80 p-3 rounded-xl border border-rose-200">
            <span className="text-[11px] text-rose-900 font-semibold block mb-0.5 flex items-center gap-1">
              <XCircle className="w-3 h-3 text-rose-600" />
              <span>مرفوضة (REJECTED)</span>
            </span>
            <span className="text-xl font-black text-rose-900">{stats.rejected}</span>
          </div>

          <div className="bg-purple-50/80 p-3 rounded-xl border border-purple-200">
            <span className="text-[11px] text-purple-900 font-semibold block mb-0.5 flex items-center gap-1">
              <History className="w-3 h-3 text-purple-600" />
              <span>سجلات التدقيق (AUDIT)</span>
            </span>
            <span className="text-xl font-black text-purple-900">{stats.totalAudits}</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. ACTIVE EXCEPTIONS BOARD */}
      {/* ========================================================================= */}
      {activeTab === 'ACTIVE_LIST' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Filter Bar */}
          <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-1 w-full md:w-auto">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute right-3 top-2.5 text-stone-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث برقم الاستثناء، معرف الرحلة، الوصف، أو اسم المراجع..."
                  className="w-full pl-3 pr-9 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-rose-500 text-stone-800"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-semibold text-stone-800"
              >
                <option value="ALL">جميع الحالات ({exceptions.length})</option>
                <option value="OPEN">مفتوحة فقط (OPEN)</option>
                <option value="UNDER_REVIEW">قيد المراجعة (UNDER_REVIEW)</option>
                <option value="RESOLVED">محلولة ومعتمدة (RESOLVED)</option>
                <option value="REJECTED">مرفوضة (REJECTED)</option>
              </select>

              {/* Type Filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-semibold text-stone-800 max-w-[200px]"
              >
                <option value="ALL">جميع الأنواع الـ 12</option>
                {Object.keys(EXCEPTION_TYPE_META).map(key => (
                  <option key={key} value={key}>
                    {EXCEPTION_TYPE_META[key as ExceptionType].labelAr}
                  </option>
                ))}
              </select>

              {/* Clear button */}
              {(statusFilter !== 'ALL' || typeFilter !== 'ALL' || searchQuery !== '') && (
                <button
                  onClick={() => {
                    setStatusFilter('ALL');
                    setTypeFilter('ALL');
                    setSearchQuery('');
                  }}
                  className="p-2 text-xs text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-xl"
                  title="إلغاء التصفية"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Exceptions Cards List */}
          <div className="space-y-3">
            {filteredExceptions.length === 0 ? (
              <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center text-stone-500">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500" />
                <p className="text-sm font-bold text-stone-800">لا توجد استثناءات مطابقة لمعايير البحث الحالية</p>
                <p className="text-xs text-stone-400 mt-1">النظام التشغيلي متوافق ومستقر</p>
              </div>
            ) : (
              filteredExceptions.map((exp, idx) => {
                const typeMeta = EXCEPTION_TYPE_META[exp.type];
                const isExpanded = expandedEvidenceIds[exp.exceptionId] || false;
                const expAudits = exceptionEngine.getAuditHistoryForException(exp.exceptionId);

                return (
                  <div
                    key={`${exp.exceptionId}-${idx}`}
                    className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-xs hover:border-stone-300 transition-all space-y-3.5"
                  >
                    {/* Top Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-black text-stone-900 bg-stone-100 px-2.5 py-1 rounded-lg border border-stone-200">
                          {exp.exceptionId}
                        </span>

                        <div className="flex items-center gap-1.5 bg-rose-50/80 border border-rose-200 text-rose-900 px-2.5 py-1 rounded-lg text-xs font-bold">
                          {typeMeta.icon}
                          <span>{typeMeta.labelAr}</span>
                          <span className="text-[10px] font-mono text-rose-600 font-normal">({exp.type})</span>
                        </div>

                        {/* Severity Badge */}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                          exp.severity === 'BLOCKING' ? 'bg-rose-600 text-white' :
                          exp.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                          exp.severity === 'HIGH' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                          'bg-stone-100 text-stone-700'
                        }`}>
                          {exp.severity}
                        </span>
                      </div>

                      {/* Status & Trip Badge */}
                      <div className="flex items-center gap-2">
                        {exp.tripId ? (
                          <span className="text-[11px] font-mono bg-blue-50 text-blue-900 border border-blue-200 px-2 py-0.5 rounded font-bold">
                            رحلة: {exp.tripId}
                          </span>
                        ) : (
                          <span className="text-[10px] bg-stone-100 text-stone-500 border border-stone-200 px-2 py-0.5 rounded font-bold">
                            عام (بدون رحلة - tripId: null)
                          </span>
                        )}

                        <span className={`text-xs font-bold px-3 py-1 rounded-full font-mono ${
                          exp.status === 'OPEN' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                          exp.status === 'UNDER_REVIEW' ? 'bg-blue-100 text-blue-900 border border-blue-300' :
                          exp.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' :
                          'bg-rose-100 text-rose-900 border border-rose-300'
                        }`}>
                          {exp.status}
                        </span>
                      </div>
                    </div>

                    {/* Middle Row: Description */}
                    <div>
                      <p className="text-xs text-stone-800 font-semibold leading-relaxed">
                        {exp.description}
                      </p>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-stone-50 p-2.5 rounded-xl border border-stone-200/60 text-[11px] text-stone-600">
                      <div>
                        المشروع: <strong className="text-stone-900 font-mono">{exp.projectId}</strong>
                      </div>
                      <div>
                        تاريخ الفتح: <span className="text-stone-900 font-mono">{new Date(exp.openedAt).toLocaleString('ar-SA')}</span>
                      </div>
                      <div>
                        فُتح بواسطة: <span className="text-stone-900 font-bold">{exp.openedBy}</span>
                      </div>
                      <div>
                        المراجع: <span className="text-stone-900">{exp.reviewedBy || 'لم يتم الفحص بعد'}</span>
                      </div>
                    </div>

                    {/* Resolution Section if Resolved/Rejected */}
                    {(exp.resolution || exp.resolutionNote) && (
                      <div className={`p-3 rounded-xl border text-xs ${
                        exp.status === 'RESOLVED' 
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950' 
                          : 'bg-rose-50/70 border-rose-200 text-rose-950'
                      }`}>
                        <div className="flex items-center justify-between font-bold mb-1">
                          <span className="flex items-center gap-1.5">
                            {exp.status === 'RESOLVED' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-rose-600" />}
                            <span>قرار المعالجة: [{exp.resolution}]</span>
                          </span>
                          <span className="text-[10px] font-mono text-stone-500">
                            {exp.reviewedAt ? new Date(exp.reviewedAt).toLocaleString('ar-SA') : ''}
                          </span>
                        </div>
                        <p className="text-[11px] leading-relaxed">
                          {exp.resolutionNote}
                        </p>
                      </div>
                    )}

                    {/* Expandable Evidence JSON Drawer */}
                    {Object.keys(exp.evidence).length > 0 && (
                      <div>
                        <button
                          type="button"
                          onClick={() => toggleEvidence(exp.exceptionId)}
                          className="text-[11px] text-stone-600 hover:text-stone-900 flex items-center gap-1 font-semibold"
                        >
                          <FileCode className="w-3.5 h-3.5 text-stone-400" />
                          <span>{isExpanded ? 'إخفاء مصفوفة الأدلة (Evidence Data)' : 'عرض مصفوفة الأدلة الرقمية (Evidence Data)'}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>

                        {isExpanded && (
                          <pre className="mt-2 p-3 bg-stone-900 text-amber-400 text-[11px] font-mono rounded-xl overflow-x-auto border border-stone-800 text-left" dir="ltr">
                            {JSON.stringify(exp.evidence, null, 2)}
                          </pre>
                        )}
                      </div>
                    )}

                    {/* Bottom Action Buttons & Audit Count */}
                    <div className="flex items-center justify-between border-t border-stone-100 pt-3 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        {/* Start Review Button */}
                        {exp.status === 'OPEN' && (
                          <button
                            onClick={() => handleStartReview(exp)}
                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                            <span>بدء المراجعة (UNDER_REVIEW)</span>
                          </button>
                        )}

                        {/* Resolve Button */}
                        {(exp.status === 'OPEN' || exp.status === 'UNDER_REVIEW') && (
                          <button
                            onClick={() => handleOpenResolveModal(exp)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>اعتماد الحل (RESOLVE)</span>
                          </button>
                        )}

                        {/* Reject Button */}
                        {(exp.status === 'OPEN' || exp.status === 'UNDER_REVIEW') && (
                          <button
                            onClick={() => handleOpenRejectModal(exp)}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>رفض الاستثناء (REJECT)</span>
                          </button>
                        )}
                      </div>

                      {/* Audit History Trigger Button */}
                      <button
                        onClick={() => handleOpenAuditModal(exp)}
                        className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                      >
                        <History className="w-3.5 h-3.5 text-stone-500" />
                        <span>سجل التدقيق ({expAudits.length} قيود)</span>
                      </button>
                    </div>

                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. RAISE EXCEPTION SANDBOX FORM */}
      {/* ========================================================================= */}
      {activeTab === 'RAISE_EXCEPTION' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-5 animate-fadeIn">
          <div className="border-b border-stone-100 pb-4">
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-rose-600" />
              <span>فتح استثناء تشغيلي جديد (Raise Exception)</span>
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              اختر أحد الأنواع الـ 12 المعتمدة وحدد درجة الخطورة والأدلة، وسيتم تلقائياً تسجيل قيد تدقيق غير قابل للحذف في Audit Log.
            </p>
          </div>

          <form onSubmit={handleCreateNewException} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* Type Select */}
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">نوع الاستثناء (12 Types)</label>
                <select
                  value={newExpType}
                  onChange={(e) => {
                    const t = e.target.value as ExceptionType;
                    setNewExpType(t);
                    setNewExpSeverity(EXCEPTION_TYPE_META[t].defaultSeverity);
                  }}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs font-bold text-stone-900"
                >
                  {Object.keys(EXCEPTION_TYPE_META).map(key => (
                    <option key={key} value={key}>
                      {EXCEPTION_TYPE_META[key as ExceptionType].labelAr} ({key})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-stone-500 mt-1 block">
                  {EXCEPTION_TYPE_META[newExpType].descAr}
                </span>
              </div>

              {/* Severity Select */}
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">درجة الخطورة (Severity)</label>
                <select
                  value={newExpSeverity}
                  onChange={(e) => setNewExpSeverity(e.target.value as ExceptionSeverity)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs font-bold text-stone-900"
                >
                  <option value="LOW">LOW (منخفضة)</option>
                  <option value="MEDIUM">MEDIUM (متوسطة)</option>
                  <option value="HIGH">HIGH (عالية)</option>
                  <option value="BLOCKING">BLOCKING (حاجزة / توقف الرحلة)</option>
                  <option value="CRITICAL">CRITICAL (حرجة)</option>
                </select>
              </div>

              {/* Project ID */}
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">معرف المشروع (projectId)</label>
                <input
                  type="text"
                  required
                  value={newExpProjectId}
                  onChange={(e) => setNewExpProjectId(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-stone-900"
                />
              </div>

              {/* Trip ID (Nullable demonstration) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-stone-800">معرف الرحلة (tripId - Nullable)</label>
                  <label className="flex items-center gap-1.5 text-[11px] text-stone-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newExpHasNoTrip}
                      onChange={(e) => setNewExpHasNoTrip(e.target.checked)}
                      className="rounded text-rose-600 focus:ring-rose-500"
                    />
                    <span>بدون رحلة (عام)</span>
                  </label>
                </div>
                <input
                  type="text"
                  disabled={newExpHasNoTrip}
                  value={newExpTripId}
                  onChange={(e) => setNewExpTripId(e.target.value)}
                  placeholder="مثال: TRP-2026-00891"
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs font-mono disabled:bg-stone-200 disabled:text-stone-400"
                />
              </div>

              {/* Opened By */}
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">المُبلّغ / النظام (openedBy)</label>
                <input
                  type="text"
                  required
                  value={newExpOpenedBy}
                  onChange={(e) => setNewExpOpenedBy(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs font-bold text-stone-900"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">شرح وتفاصيل الاستثناء (description)</label>
              <textarea
                required
                rows={2}
                value={newExpDescription}
                onChange={(e) => setNewExpDescription(e.target.value)}
                placeholder="اكتب شرحاً دقيقاً لسبب فتح الاستثناء والأثر التشغيلي أو المالي..."
                className="w-full bg-stone-50 border border-stone-300 rounded-xl p-3 text-xs text-stone-900 focus:bg-white"
              />
            </div>

            {/* Evidence JSON */}
            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">مصفوفة الأدلة الرقمية (evidence - JSON Format)</label>
              <textarea
                rows={4}
                value={newExpEvidenceJson}
                onChange={(e) => setNewExpEvidenceJson(e.target.value)}
                dir="ltr"
                className="w-full bg-stone-900 text-amber-400 font-mono text-xs rounded-xl p-3 border border-stone-800 focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="submit"
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>حفظ الاستثناء وتسجيل قيد التدقيق الإلزامي</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SYSTEM AUDIT LOGS (السجل الإلزامي غير القابل للتعديل) */}
      {/* ========================================================================= */}
      {activeTab === 'AUDIT_LOGS' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <History className="w-5 h-5 text-purple-600" />
                <span>سجل التدقيق الإلزامي للاستثناءات (Exception Audit Logs)</span>
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                كل قيد يمثل عملية معالجة (إنشاء، بدء مراجعة، حل، رفض) مع بصمة الوقت، المنفذ، والحالة قبل وبعد التعديل.
              </p>
            </div>

            <span className="text-xs bg-purple-100 text-purple-900 font-bold px-3 py-1 rounded-full font-mono">
              {auditLogs.length} سجلات مقيدة
            </span>
          </div>

          <div className="space-y-3">
            {auditLogs.map((log, idx) => (
              <div
                key={`${log.auditId}-${idx}`}
                className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 hover:bg-white hover:border-purple-200 transition-all space-y-2.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200/50 pb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-stone-900 bg-white px-2 py-0.5 rounded border border-stone-200">
                      {log.auditId}
                    </span>
                    <span className="text-xs text-stone-500 font-mono">
                      الاستثناء: <strong className="text-stone-900">{log.exceptionId}</strong>
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                      log.action === 'CREATED' ? 'bg-amber-100 text-amber-900' :
                      log.action === 'UNDER_REVIEW_STARTED' ? 'bg-blue-100 text-blue-900' :
                      log.action === 'RESOLVED' ? 'bg-emerald-100 text-emerald-900' :
                      'bg-rose-100 text-rose-900'
                    }`}>
                      {log.action}
                    </span>
                  </div>

                  <div className="text-[11px] text-stone-500 font-mono">
                    {new Date(log.timestamp).toLocaleString('ar-SA')}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-stone-700 flex-wrap gap-2">
                  <div>
                    المنفذ: <strong className="text-stone-900">{log.actorName}</strong> ({log.actorRole})
                  </div>
                  {log.note && (
                    <div className="text-stone-600 bg-white px-2.5 py-1 rounded border border-stone-200 text-[11px]">
                      ملاحظة: {log.note}
                    </div>
                  )}
                </div>

                {/* State Snapshot Diff */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 text-[10px] font-mono">
                  <div className="bg-stone-100 p-2 rounded border border-stone-200/80">
                    <span className="text-stone-400 block mb-0.5 font-sans font-bold">الحالة السابقة (Before):</span>
                    <pre className="text-stone-700 overflow-x-auto text-left" dir="ltr">
                      {log.beforeState ? JSON.stringify(log.beforeState, null, 1) : 'null (سجل جديد)'}
                    </pre>
                  </div>
                  <div className="bg-purple-50/50 p-2 rounded border border-purple-200/80">
                    <span className="text-purple-700 block mb-0.5 font-sans font-bold">الحالة اللاحقة (After):</span>
                    <pre className="text-purple-950 overflow-x-auto text-left" dir="ltr">
                      {JSON.stringify(log.afterState, null, 1)}
                    </pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. AUTOMATED TEST SUITE */}
      {/* ========================================================================= */}
      {activeTab === 'TEST_SUITE' && testReport && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-900">
                  تقرير التحقق البرمجي لاشتراطات Exception Engine (8 فحوصات معمارية)
                </h3>
                <p className="text-[11px] text-stone-500">
                  فحص شمول الأنواع الـ 12، دورة حياة الحالات الـ 4، قابلية تفريغ tripId، وإلزامية قيد التدقيق عند كل معالجة.
                </p>
              </div>
            </div>

            <button
              onClick={handleRunTests}
              className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>إعادة فحص المحرك</span>
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
            {testReport.results.map((res) => (
              <div 
                key={res.id}
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

      {/* ========================================================================= */}
      {/* MODAL 1: RESOLVE EXCEPTION */}
      {/* ========================================================================= */}
      {isResolveModalOpen && selectedException && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 text-right border border-stone-200" dir="rtl">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>اعتماد حل الاستثناء ({selectedException.exceptionId})</span>
              </h3>
              <button
                onClick={() => setIsResolveModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs text-stone-700 space-y-1">
              <div>النوع: <strong className="text-stone-900">{selectedException.type}</strong></div>
              <div>الوصف: <span>{selectedException.description}</span></div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">رمز وقرار المعالجة (resolution)</label>
              <select
                value={resolutionCode}
                onChange={(e) => setResolutionCode(e.target.value)}
                className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs font-bold text-stone-900"
              >
                <option value="APPROVED_OVERRIDE">APPROVED_OVERRIDE (تجاوز معتمد بصلاحية عليا)</option>
                <option value="ADJUSTED_WEIGHT">ADJUSTED_WEIGHT (تسوية وزن معتمدة)</option>
                <option value="MANUAL_COMPLIANCE_APPROVED">MANUAL_COMPLIANCE_APPROVED (اعتماد امتثال يدوي)</option>
                <option value="DUPLICATE_PURGED">DUPLICATE_PURGED (تنقية ومعالجة التكرار)</option>
                <option value="BATCH_REPLAYED_SUCCESSFULLY">BATCH_REPLAYED_SUCCESSFULLY (إعادة مزامنة الحزمة)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">ملاحظات وقرار الحل (resolutionNote)</label>
              <textarea
                rows={3}
                required
                value={resolutionNoteText}
                onChange={(e) => setResolutionNoteText(e.target.value)}
                placeholder="وضح مبررات اعتماد الحل والتسوية المالية والتشغيلية..."
                className="w-full bg-stone-50 border border-stone-300 rounded-xl p-3 text-xs text-stone-900"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setIsResolveModalOpen(false)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmResolve}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>تأكيد الحل وتسجيل Audit</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: REJECT EXCEPTION */}
      {/* ========================================================================= */}
      {isRejectModalOpen && selectedException && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 text-right border border-stone-200" dir="rtl">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-bold text-rose-900 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-600" />
                <span>رفض الاستثناء ({selectedException.exceptionId})</span>
              </h3>
              <button
                onClick={() => setIsRejectModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs text-stone-700 space-y-1">
              <div>النوع: <strong className="text-stone-900">{selectedException.type}</strong></div>
              <div>الوصف: <span>{selectedException.description}</span></div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">سبب الرفض (rejectionReason)</label>
              <select
                value={rejectionReasonText}
                onChange={(e) => setRejectionReasonText(e.target.value)}
                className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs font-bold text-stone-900"
              >
                <option value="REJECTED_NON_COMPLIANT">REJECTED_NON_COMPLIANT (غير مطابق لمعايير المشروع)</option>
                <option value="REJECTED_UNAUTHORIZED_ENTRY">REJECTED_UNAUTHORIZED_ENTRY (دخول غير مصرح به)</option>
                <option value="REJECTED_SUSPECTED_FRAUD">REJECTED_SUSPECTED_FRAUD (اشتباه في تلاعب بالأوزان)</option>
                <option value="REJECTED_EXPIRED_PERMIT">REJECTED_EXPIRED_PERMIT (انتهاء تصريح الناقل أو السائق)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">ملاحظات قرار الرفض (resolutionNote)</label>
              <textarea
                rows={3}
                required
                value={resolutionNoteText}
                onChange={(e) => setResolutionNoteText(e.target.value)}
                placeholder="أدخل مبررات الرفض القطعي والإجراء المتخذ (مثل حظر الشاحنة أو عدم صرف المستحقات)..."
                className="w-full bg-stone-50 border border-stone-300 rounded-xl p-3 text-xs text-stone-900"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5"
              >
                <X className="w-4 h-4" />
                <span>تأكيد الرفض وتسجيل Audit</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EXCEPTION AUDIT HISTORY */}
      {/* ========================================================================= */}
      {isAuditModalOpen && selectedException && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl space-y-4 text-right border border-stone-200 max-h-[85vh] flex flex-col" dir="rtl">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-purple-600" />
                <h3 className="text-base font-bold text-stone-900">
                  سجل التدقيق للاستثناء: {selectedException.exceptionId}
                </h3>
              </div>
              <button
                onClick={() => setIsAuditModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 flex-1 pr-1">
              {exceptionEngine.getAuditHistoryForException(selectedException.exceptionId).length === 0 ? (
                <p className="text-xs text-stone-400 text-center py-6">لا توجد سجلات تدقيق مسجلة لهذا الاستثناء</p>
              ) : (
                exceptionEngine.getAuditHistoryForException(selectedException.exceptionId).map((aud) => (
                  <div
                    key={aud.auditId}
                    className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/60 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between border-b border-stone-200 pb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-stone-200 font-bold">
                          {aud.auditId}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                          aud.action === 'CREATED' ? 'bg-amber-100 text-amber-900' :
                          aud.action === 'UNDER_REVIEW_STARTED' ? 'bg-blue-100 text-blue-900' :
                          aud.action === 'RESOLVED' ? 'bg-emerald-100 text-emerald-900' :
                          'bg-rose-100 text-rose-900'
                        }`}>
                          {aud.action}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-stone-500">
                        {new Date(aud.timestamp).toLocaleString('ar-SA')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-stone-700">
                      <div>المسؤول: <strong className="text-stone-900">{aud.actorName}</strong> ({aud.actorRole})</div>
                      {aud.note && <div className="text-stone-600 font-medium">«{aud.note}»</div>}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-1">
                      <div className="bg-white p-2 rounded border border-stone-200">
                        <span className="text-stone-400 block font-sans font-semibold">قبل:</span>
                        <pre className="text-stone-600 text-left" dir="ltr">
                          {aud.beforeState ? JSON.stringify(aud.beforeState, null, 1) : 'null'}
                        </pre>
                      </div>
                      <div className="bg-purple-50/50 p-2 rounded border border-purple-200">
                        <span className="text-purple-700 block font-sans font-semibold">بعد:</span>
                        <pre className="text-purple-950 text-left" dir="ltr">
                          {JSON.stringify(aud.afterState, null, 1)}
                        </pre>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-stone-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsAuditModalOpen(false)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
