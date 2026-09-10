import React, { useState, useEffect, useMemo } from 'react';
import { 
  legacyMigrationService 
} from '../../services/legacyMigration.service';
import { 
  MigrationReport, 
  MigrationRowItem, 
  LegacySheetRow, 
  MatchCandidateOption 
} from '../../types/legacyMigration';
import { SAMPLE_LEGACY_GOOGLE_SHEET_ROWS } from '../../data/sampleLegacySheetData';
import { AuthUserContext } from '../../types/common';
import { 
  FileSpreadsheet, 
  ShieldCheck, 
  Lock, 
  Eye, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  HelpCircle, 
  Copy, 
  ArrowRight, 
  Search, 
  Filter, 
  Layers, 
  Scale, 
  Users, 
  Truck, 
  Boxes, 
  DollarSign, 
  RefreshCw, 
  Check, 
  X, 
  AlertOctagon, 
  Activity, 
  Database,
  ExternalLink,
  ChevronDown
} from 'lucide-react';

export function LegacyMigrationView() {
  // Spreadsheet Connection States
  const [spreadsheetId, setSpreadsheetId] = useState<string>('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');
  const [sheetTabName, setSheetTabName] = useState<string>('LegacyOperations_20Cols');
  const [isReadOnlyEnforced] = useState<boolean>(true);

  // Analysis & Preview States
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [report, setReport] = useState<MigrationReport | null>(null);
  const [items, setItems] = useState<MigrationRowItem[]>([]);

  // Filtering & View Tabs
  const [activeFilterTab, setActiveFilterTab] = useState<'ALL' | 'CANDIDATE_MATCHES' | 'UNRESOLVED_PRICING' | 'DUPLICATES' | 'CONFLICTS' | 'VALID'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Candidate Match Review Modal / Inline Selector
  const [reviewingItem, setReviewingItem] = useState<{
    itemIndex: number;
    entityType: 'carrier' | 'material' | 'truck' | 'driver';
    originalValue: string;
    candidates: MatchCandidateOption[];
  } | null>(null);

  // Admin Confirmation & Commit Modal
  const [showCommitModal, setShowCommitModal] = useState<boolean>(false);
  const [adminAcknowledgement, setAdminAcknowledgement] = useState<boolean>(false);
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [commitResult, setCommitResult] = useState<{
    success: boolean;
    batchId: string;
    tripsCount: number;
    auditLogId: string;
  } | null>(null);

  // Current admin session
  const [adminContext] = useState<AuthUserContext>({
    userId: 'USR-ADMIN-001',
    email: 'admin@qsaudi.com',
    role: 'PROJECT_ADMIN',
    displayName: 'المهندس طارق الشمري (مدير النظام)',
  });

  // Run Preview Analysis automatically on mount or button click
  const handleGeneratePreview = () => {
    setIsAnalyzing(true);
    setCommitResult(null);
    setTimeout(() => {
      const result = legacyMigrationService.generatePreview(
        SAMPLE_LEGACY_GOOGLE_SHEET_ROWS,
        spreadsheetId,
        sheetTabName
      );
      setReport(result.report);
      setItems(result.items);
      setIsAnalyzing(false);
    }, 400);
  };

  useEffect(() => {
    handleGeneratePreview();
  }, []);

  // Update candidate match decision
  const handleAcceptCandidate = (itemIndex: number, entityType: 'carrier' | 'material' | 'truck' | 'driver', candidate: MatchCandidateOption) => {
    const updated = [...items];
    const item = updated[itemIndex];
    if (!item) return;

    if (entityType === 'carrier') {
      item.matchedCarrier.matchedId = candidate.id;
      item.matchedCarrier.matchedName = candidate.name;
      item.matchedCarrier.status = 'EXACT_MATCH';
      item.matchedCarrier.userDecision = 'ACCEPT_CANDIDATE';
    } else if (entityType === 'material') {
      item.matchedMaterial.matchedId = candidate.id;
      item.matchedMaterial.matchedName = candidate.name;
      item.matchedMaterial.status = 'EXACT_MATCH';
      item.matchedMaterial.userDecision = 'ACCEPT_CANDIDATE';
    } else if (entityType === 'truck') {
      item.matchedTruck.matchedId = candidate.id;
      item.matchedTruck.matchedName = candidate.name;
      item.matchedTruck.status = 'EXACT_MATCH';
      item.matchedTruck.userDecision = 'ACCEPT_CANDIDATE';
    } else if (entityType === 'driver') {
      item.matchedDriver.matchedId = candidate.id;
      item.matchedDriver.matchedName = candidate.name;
      item.matchedDriver.status = 'EXACT_MATCH';
      item.matchedDriver.userDecision = 'ACCEPT_CANDIDATE';
    }

    setItems(updated);
    setReviewingItem(null);
  };

  // Assign pricing type override for unresolved pricing
  const handleAssignPricingType = (itemIndex: number, newType: 'PER_TRIP' | 'PER_TON' | 'LEGACY_UNRESOLVED') => {
    const updated = [...items];
    const item = updated[itemIndex];
    if (!item) return;

    item.pricingResolution.pricingType = newType;
    item.pricingResolution.isUnresolved = newType === 'LEGACY_UNRESOLVED';
    item.pricingResolution.userAssignedType = newType;
    if (newType !== 'LEGACY_UNRESOLVED') {
      item.pricingResolution.explanation = `تم تحديد نوع التسعير يدوياً بواسطة المشرف (${newType})`;
    }
    setItems(updated);
  };

  // Execute Admin Commit
  const handleExecuteCommit = () => {
    if (!report) return;
    setIsCommitting(true);

    try {
      const res = legacyMigrationService.commitMigration(report.reportId, items, adminContext);
      setCommitResult({
        success: true,
        batchId: res.batchId,
        tripsCount: res.committedTripsCount,
        auditLogId: res.auditLogId,
      });
      setShowCommitModal(false);
      setReport(legacyMigrationService.getCurrentReport());
    } catch (err: any) {
      alert(`فشل الترحيل: ${err.message || err}`);
    } finally {
      setIsCommitting(false);
    }
  };

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Tab filter
      if (activeFilterTab === 'CANDIDATE_MATCHES') {
        const hasCandidate = 
          item.matchedCarrier.status === 'CANDIDATE_MATCH' ||
          item.matchedMaterial.status === 'CANDIDATE_MATCH' ||
          item.matchedTruck.status === 'CANDIDATE_MATCH' ||
          item.matchedDriver.status === 'CANDIDATE_MATCH';
        if (!hasCandidate) return false;
      } else if (activeFilterTab === 'UNRESOLVED_PRICING') {
        if (!item.pricingResolution.isUnresolved) return false;
      } else if (activeFilterTab === 'DUPLICATES') {
        if (!item.isDuplicate) return false;
      } else if (activeFilterTab === 'CONFLICTS') {
        if (!item.hasConflict) return false;
      } else if (activeFilterTab === 'VALID') {
        if (!item.isValid) return false;
      }

      // Search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const match = 
          item.raw.ticketId?.toLowerCase().includes(q) ||
          item.raw.carrier?.toLowerCase().includes(q) ||
          item.raw.driverName?.toLowerCase().includes(q) ||
          item.raw.truckNo?.toLowerCase().includes(q) ||
          item.raw.materialType?.toLowerCase().includes(q) ||
          String(item.raw.tripSerial).includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [items, activeFilterTab, searchQuery]);

  return (
    <div className="space-y-6 pb-16 font-sans text-stone-900" dir="rtl">
      
      {/* Read-Only & Source Security Banner */}
      <div className="bg-emerald-950 text-emerald-100 rounded-2xl p-5 shadow-sm border border-emerald-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-800/60 border border-emerald-700/60 flex items-center justify-center text-emerald-300 shrink-0 mt-0.5">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-800 text-emerald-200 border border-emerald-700">
                🔒 ممنوع تعديل المصدر (Read-Only Guaranteed)
              </span>
              <span className="text-xs font-mono text-emerald-400">
                20 Legacy Columns Schema
              </span>
            </div>
            <h1 className="text-lg font-black text-white mt-1">
              أداة ترحيل البيانات التاريخية من شيت قوقل القديم (Legacy Migration Tool)
            </h1>
            <p className="text-xs text-emerald-200/90 mt-1 max-w-3xl leading-relaxed">
              تتيح الأداة سحب وتحويل الـ 20 عموداً التشغيلية مع فحص ومطابقة الكيانات الأساسية (Master Data Matching)، حماية السجلات القائمة من الازدواجية، ومعاينة تقرير الترحيل بالكامل، مع منع اعتماد أي ترحيل إلا بعد تأكيد صريح من مدير النظام (Admin Commit).
            </p>
          </div>
        </div>

        {/* Source Status Pill */}
        <div className="flex items-center gap-2 bg-emerald-900/80 px-4 py-2.5 rounded-xl border border-emerald-800 text-xs shrink-0">
          <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
          <div>
            <span className="text-[11px] text-emerald-300 block">حالة المصدر:</span>
            <strong className="text-white font-mono">محمي من التعديل (Read-Only)</strong>
          </div>
        </div>
      </div>

      {/* Commit Success Banner */}
      {commitResult && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-emerald-950">تم اعتماد وترحيل البيانات بنجاح!</h3>
              <p className="text-xs text-emerald-800 mt-0.5">
                تم إنشاء دفعة الترحيل <strong>{commitResult.batchId}</strong> بنجاح وترحيل <strong>{commitResult.tripsCount} رحلة</strong> إلى النظام وقاعدة البيانات، مع تسجيل قيد التدقيق <strong>{commitResult.auditLogId}</strong>.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-2xs">
            معتمد من Admin
          </span>
        </div>
      )}

      {/* 20 Columns Specifications & Spreadsheet Connection Card */}
      <div className="bg-white border border-stone-200/90 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-600" />
              <span>أعمدة الشيت القديم الـ 20 المشمولة بالتحويل (20-Column Schema Mapping)</span>
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              يتم تحويل كافة الحقول إلى هيكلية الكيانات الحديثة (Modern FSM Trip Entity) مع مطابقة الناقل، المادة، الشاحنة، والسائق.
            </p>
          </div>

          {/* Action: Generate Preview */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={handleGeneratePreview}
              disabled={isAnalyzing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
              <span>إجراء التحليل والمعاينة فقط (Generate Preview)</span>
            </button>

            {/* Commit Button (Disabled until report exists and not committed) */}
            <button
              onClick={() => {
                setAdminAcknowledgement(false);
                setShowCommitModal(true);
              }}
              disabled={!report || report.isCommitted || items.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{report?.isCommitted ? 'تم الاعتماد والترحيل' : 'تأكيد وترحيل السجلات (Admin Commit)'}</span>
            </button>
          </div>
        </div>

        {/* 20 Badges Grid */}
        <div className="pt-2 border-t border-stone-100">
          <div className="flex flex-wrap gap-1.5 text-[11px] font-mono">
            {[
              '1. projectId', '2. shiftDate', '3. ticketId', '4. carrier', '5. truckNo',
              '6. driverName', '7. materialType', '8. tareWeight', '9. grossWeight', '10. netWeight',
              '11. destNetWeight', '12. varianceWeight', '13. loader', '14. unloader', '15. tripRate',
              '16. status', '17. tripSerial', '18. loadTime', '19. unloadTime', '20. note'
            ].map((col, idx) => (
              <span key={idx} className="px-2 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-200">
                {col}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* MANDATORY MIGRATION REPORT (8 METRICS) */}
      {/* ==================================================================== */}
      {report && (
        <div className="bg-white border border-stone-200/90 rounded-2xl p-6 shadow-xs space-y-5">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                  تقرير التحليل والمعاينة (Migration Report)
                </span>
                <span className="text-xs font-mono text-stone-500">
                  كود التقرير: {report.reportId}
                </span>
              </div>
              <h2 className="text-base font-black text-stone-900 mt-1">
                مؤشرات التحقق والمطابقة الثنائية (Pre-Commit Analysis KPIs)
              </h2>
            </div>

            <div className="flex items-center gap-2 text-xs text-stone-500">
              <span>تاريخ التوليد: <strong>{new Date(report.generatedAt).toLocaleTimeString('ar-SA')}</strong></span>
              <span>•</span>
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <Lock className="w-3 h-3" />
                المصدر غير معدل
              </span>
            </div>
          </div>

          {/* The 8 User Requested Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-center">
            
            {/* 1. rowsRead */}
            <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
              <span className="text-[11px] font-semibold text-stone-500 block">rowsRead</span>
              <span className="text-xl font-black text-stone-900 font-mono mt-1 block">
                {report.rowsRead}
              </span>
              <span className="text-[10px] text-stone-400">إجمالي الأسطر</span>
            </div>

            {/* 2. rowsValid */}
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="text-[11px] font-semibold text-emerald-800 block">rowsValid</span>
              <span className="text-xl font-black text-emerald-700 font-mono mt-1 block">
                {report.rowsValid}
              </span>
              <span className="text-[10px] text-emerald-600">جاهزة للترحيل</span>
            </div>

            {/* 3. rowsInvalid */}
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200">
              <span className="text-[11px] font-semibold text-rose-800 block">rowsInvalid</span>
              <span className="text-xl font-black text-rose-700 font-mono mt-1 block">
                {report.rowsInvalid}
              </span>
              <span className="text-[10px] text-rose-600">بها أخطاء مانعة</span>
            </div>

            {/* 4. matchedEntities */}
            <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200">
              <span className="text-[11px] font-semibold text-indigo-800 block">matchedEntities</span>
              <span className="text-xl font-black text-indigo-900 font-mono mt-1 block">
                {report.matchedEntities.total}
              </span>
              <span className="text-[10px] text-indigo-600">
                مطابقات تامة (ناقل/مادة/شاحنة/سائق)
              </span>
            </div>

            {/* 5. unmatchedEntities */}
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200">
              <span className="text-[11px] font-semibold text-amber-800 block">unmatchedEntities</span>
              <span className="text-xl font-black text-amber-900 font-mono mt-1 block">
                {report.unmatchedEntities.total}
              </span>
              <span className="text-[10px] text-amber-700">
                مقترحات للمراجعة
              </span>
            </div>

            {/* 6. pricingUnresolved */}
            <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200">
              <span className="text-[11px] font-semibold text-purple-900 block">pricingUnresolved</span>
              <span className="text-xl font-black text-purple-700 font-mono mt-1 block">
                {report.pricingUnresolved}
              </span>
              <span className="text-[10px] text-purple-700 font-semibold">
                LEGACY_UNRESOLVED
              </span>
            </div>

            {/* 7. duplicates */}
            <div className="p-3.5 rounded-xl bg-orange-50 border border-orange-200">
              <span className="text-[11px] font-semibold text-orange-900 block">duplicates</span>
              <span className="text-xl font-black text-orange-700 font-mono mt-1 block">
                {report.duplicates}
              </span>
              <span className="text-[10px] text-orange-700">تذاكر مكررة</span>
            </div>

            {/* 8. conflicts */}
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200">
              <span className="text-[11px] font-semibold text-red-900 block">conflicts</span>
              <span className="text-xl font-black text-red-700 font-mono mt-1 block">
                {report.conflicts}
              </span>
              <span className="text-[10px] text-red-700">تعارضات حسابية</span>
            </div>

          </div>

          {/* Sub-breakdown for matched/unmatched entities */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs bg-stone-50 p-4 rounded-xl border border-stone-200/70">
            <div>
              <span className="font-bold text-stone-700 block mb-2">تفصيل الكيانات المطابقة تماماً (Matched):</span>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2 bg-white rounded border border-stone-200">
                  <span className="text-stone-400 block text-[10px]">الناقلين</span>
                  <span className="font-bold text-stone-900">{report.matchedEntities.carriers}</span>
                </div>
                <div className="p-2 bg-white rounded border border-stone-200">
                  <span className="text-stone-400 block text-[10px]">المواد</span>
                  <span className="font-bold text-stone-900">{report.matchedEntities.materials}</span>
                </div>
                <div className="p-2 bg-white rounded border border-stone-200">
                  <span className="text-stone-400 block text-[10px]">الشاحنات</span>
                  <span className="font-bold text-stone-900">{report.matchedEntities.trucks}</span>
                </div>
                <div className="p-2 bg-white rounded border border-stone-200">
                  <span className="text-stone-400 block text-[10px]">السائقين</span>
                  <span className="font-bold text-stone-900">{report.matchedEntities.drivers}</span>
                </div>
              </div>
            </div>

            <div>
              <span className="font-bold text-stone-700 block mb-2">تفصيل الكيانات المحتملة/غير المطابقة (Unmatched / Candidates):</span>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2 bg-white rounded border border-stone-200">
                  <span className="text-stone-400 block text-[10px]">الناقلين</span>
                  <span className="font-bold text-amber-700">{report.unmatchedEntities.carriers}</span>
                </div>
                <div className="p-2 bg-white rounded border border-stone-200">
                  <span className="text-stone-400 block text-[10px]">المواد</span>
                  <span className="font-bold text-amber-700">{report.unmatchedEntities.materials}</span>
                </div>
                <div className="p-2 bg-white rounded border border-stone-200">
                  <span className="text-stone-400 block text-[10px]">الشاحنات</span>
                  <span className="font-bold text-amber-700">{report.unmatchedEntities.trucks}</span>
                </div>
                <div className="p-2 bg-white rounded border border-stone-200">
                  <span className="text-stone-400 block text-[10px]">السائقين</span>
                  <span className="font-bold text-amber-700">{report.unmatchedEntities.drivers}</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Filter Tabs & Search Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveFilterTab('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeFilterTab === 'ALL'
                ? 'bg-stone-900 text-white'
                : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            كافة السجلات ({items.length})
          </button>

          <button
            onClick={() => setActiveFilterTab('CANDIDATE_MATCHES')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeFilterTab === 'CANDIDATE_MATCHES'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>مطابقات مقترحة للمراجعة</span>
          </button>

          <button
            onClick={() => setActiveFilterTab('UNRESOLVED_PRICING')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeFilterTab === 'UNRESOLVED_PRICING'
                ? 'bg-purple-700 text-white'
                : 'bg-purple-50 text-purple-900 hover:bg-purple-100 border border-purple-200'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>تسعير غير محدد (LEGACY_UNRESOLVED)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-200 text-purple-900">
              {report?.pricingUnresolved || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveFilterTab('DUPLICATES')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeFilterTab === 'DUPLICATES'
                ? 'bg-orange-600 text-white'
                : 'bg-orange-50 text-orange-900 hover:bg-orange-100 border border-orange-200'
            }`}
          >
            <Copy className="w-3.5 h-3.5" />
            <span>تذاكر مكررة ({report?.duplicates || 0})</span>
          </button>

          <button
            onClick={() => setActiveFilterTab('CONFLICTS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeFilterTab === 'CONFLICTS'
                ? 'bg-red-600 text-white'
                : 'bg-red-50 text-red-900 hover:bg-red-100 border border-red-200'
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>تعارضات أوزان ({report?.conflicts || 0})</span>
          </button>

          <button
            onClick={() => setActiveFilterTab('VALID')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeFilterTab === 'VALID'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>سجلات سليمة ({report?.rowsValid || 0})</span>
          </button>
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالتذكرة، السائق، الناقل، اللوحة..."
            className="w-full pr-9 pl-3 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 20 COLUMNS PREVIEW TABLE WITH ENTITY MATCHING BADGES */}
      {/* ==================================================================== */}
      <div className="bg-white border border-stone-200/90 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold">
                <th className="py-3 px-3">#</th>
                <th className="py-3 px-3">رقم التذكرة والوردية</th>
                <th className="py-3 px-3">الناقل (Carrier Matching)</th>
                <th className="py-3 px-3">المادة (Material Matching)</th>
                <th className="py-3 px-3">الشاحنة (Truck Matching)</th>
                <th className="py-3 px-3">السائق (Driver Matching)</th>
                <th className="py-3 px-3">الأوزان (قائم/فارغ/صافي)</th>
                <th className="py-3 px-3">التسعير (Pricing Resolution)</th>
                <th className="py-3 px-3">الحالة والتحقق</th>
                <th className="py-3 px-3 text-left">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-stone-400 text-xs">
                    لا توجد سجلات مطابقة لهذا الفلتر أو البحث.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => {
                  const actualIdx = items.indexOf(item);
                  return (
                    <tr 
                      key={idx} 
                      className={`hover:bg-amber-50/20 transition-colors ${
                        item.isDuplicate ? 'bg-orange-50/40' :
                        item.hasConflict ? 'bg-red-50/40' :
                        item.pricingResolution.isUnresolved ? 'bg-purple-50/30' : ''
                      }`}
                    >
                      {/* Row No */}
                      <td className="py-3.5 px-3 font-mono font-bold text-stone-500">
                        {item.rowNumber}
                      </td>

                      {/* Ticket & Shift */}
                      <td className="py-3.5 px-3">
                        <span className="font-mono font-bold text-stone-900 block">{item.raw.ticketId}</span>
                        <span className="text-[10px] text-stone-400 font-mono block">
                          {item.raw.shiftDate} • {item.raw.projectId}
                        </span>
                        {item.isDuplicate && (
                          <span className="inline-block mt-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-orange-100 text-orange-900 border border-orange-300">
                            تذكرة مكررة
                          </span>
                        )}
                      </td>

                      {/* Carrier Matching */}
                      <td className="py-3.5 px-3">
                        <span className="font-semibold text-stone-900 block text-[11px]">{item.raw.carrier}</span>
                        {item.matchedCarrier.status === 'EXACT_MATCH' ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <Check className="w-2.5 h-2.5" />
                            <span>مطابق ({item.matchedCarrier.matchedName})</span>
                          </span>
                        ) : item.matchedCarrier.status === 'CANDIDATE_MATCH' ? (
                          <button
                            onClick={() => setReviewingItem({
                              itemIndex: actualIdx,
                              entityType: 'carrier',
                              originalValue: item.raw.carrier,
                              candidates: item.matchedCarrier.candidates,
                            })}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300 cursor-pointer"
                            title="مطابقة مقترحة - انقر للاعتماد أو التعديل"
                          >
                            <AlertTriangle className="w-2.5 h-2.5 text-amber-700" />
                            <span>مقترح: {item.matchedCarrier.candidates[0]?.name} ({Math.round(item.matchedCarrier.confidenceScore * 100)}%)</span>
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-stone-100 text-stone-600 border border-stone-200">
                            غير مقيد (يتطلب اعتماد ككيان جديد)
                          </span>
                        )}
                      </td>

                      {/* Material Matching */}
                      <td className="py-3.5 px-3">
                        <span className="font-medium text-stone-800 block text-[11px]">{item.raw.materialType}</span>
                        {item.matchedMaterial.status === 'EXACT_MATCH' ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <Check className="w-2.5 h-2.5" />
                            <span>{item.matchedMaterial.matchedName}</span>
                          </span>
                        ) : item.matchedMaterial.status === 'CANDIDATE_MATCH' ? (
                          <button
                            onClick={() => setReviewingItem({
                              itemIndex: actualIdx,
                              entityType: 'material',
                              originalValue: item.raw.materialType,
                              candidates: item.matchedMaterial.candidates,
                            })}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300 cursor-pointer"
                          >
                            <span>مقترح: {item.matchedMaterial.candidates[0]?.name}</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-stone-400">غير معتمد</span>
                        )}
                      </td>

                      {/* Truck Matching */}
                      <td className="py-3.5 px-3">
                        <span className="font-mono font-bold text-stone-800 block text-[11px]">{item.raw.truckNo}</span>
                        {item.matchedTruck.status === 'EXACT_MATCH' ? (
                          <span className="text-[10px] text-emerald-700 font-bold block">معتمد ({item.matchedTruck.matchedId})</span>
                        ) : item.matchedTruck.status === 'CANDIDATE_MATCH' ? (
                          <button
                            onClick={() => setReviewingItem({
                              itemIndex: actualIdx,
                              entityType: 'truck',
                              originalValue: item.raw.truckNo,
                              candidates: item.matchedTruck.candidates,
                            })}
                            className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300"
                          >
                            مقترح: {item.matchedTruck.candidates[0]?.name}
                          </button>
                        ) : (
                          <span className="text-[10px] text-stone-400">لوحة جديدة</span>
                        )}
                      </td>

                      {/* Driver Matching */}
                      <td className="py-3.5 px-3">
                        <span className="font-medium text-stone-800 block text-[11px]">{item.raw.driverName}</span>
                        {item.matchedDriver.status === 'EXACT_MATCH' ? (
                          <span className="text-[10px] text-emerald-700 font-bold">معتمد</span>
                        ) : item.matchedDriver.status === 'CANDIDATE_MATCH' ? (
                          <button
                            onClick={() => setReviewingItem({
                              itemIndex: actualIdx,
                              entityType: 'driver',
                              originalValue: item.raw.driverName,
                              candidates: item.matchedDriver.candidates,
                            })}
                            className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300"
                          >
                            مقترح: {item.matchedDriver.candidates[0]?.name}
                          </button>
                        ) : (
                          <span className="text-[10px] text-stone-400">سائق جديد</span>
                        )}
                      </td>

                      {/* Weights */}
                      <td className="py-3.5 px-3 font-mono text-[11px]">
                        <span className="font-bold text-stone-900 block">{item.raw.netWeight} كجم (صافي)</span>
                        <span className="text-[10px] text-stone-400 block">
                          قائم: {item.raw.grossWeight} | فارغ: {item.raw.tareWeight}
                        </span>
                        {item.hasConflict && (
                          <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-red-100 text-red-900 border border-red-300">
                            تعارض حسابي في الوزن!
                          </span>
                        )}
                      </td>

                      {/* Pricing Resolution */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-stone-900 text-xs">
                            {item.pricingResolution.resolvedRate} ر.س
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                            item.pricingResolution.pricingType === 'PER_TON' ? 'bg-indigo-100 text-indigo-800' :
                            item.pricingResolution.pricingType === 'PER_TRIP' ? 'bg-emerald-100 text-emerald-800' :
                            'bg-purple-100 text-purple-900 border border-purple-300'
                          }`}>
                            {item.pricingResolution.pricingType}
                          </span>
                        </div>

                        {/* Unresolved Pricing Selector Dropdown if ambiguous */}
                        {item.pricingResolution.isUnresolved && (
                          <div className="mt-1 flex items-center gap-1">
                            <span className="text-[10px] text-purple-800 font-semibold">توجيه:</span>
                            <select
                              value={item.pricingResolution.pricingType}
                              onChange={(e) => handleAssignPricingType(actualIdx, e.target.value as any)}
                              className="bg-white border border-purple-300 text-[10px] rounded px-1 py-0.5 text-purple-950 font-bold focus:outline-none"
                            >
                              <option value="LEGACY_UNRESOLVED">LEGACY_UNRESOLVED (غير محدد)</option>
                              <option value="PER_TRIP">بالرد (PER_TRIP)</option>
                              <option value="PER_TON">بالطن (PER_TON)</option>
                            </select>
                          </div>
                        )}
                      </td>

                      {/* Status / Validation */}
                      <td className="py-3.5 px-3">
                        {item.isValid ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>جاهز للترحيل</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800" title={item.validationErrors.join(' | ')}>
                            <XCircle className="w-3 h-3 text-rose-600" />
                            <span>مرفوض ({item.validationErrors[0]})</span>
                          </span>
                        )}
                      </td>

                      {/* Row Action */}
                      <td className="py-3.5 px-3 text-left">
                        <button
                          onClick={() => {
                            const updated = [...items];
                            updated[actualIdx].reviewDecision = updated[actualIdx].reviewDecision === 'REJECTED' ? 'APPROVED' : 'REJECTED';
                            setItems(updated);
                          }}
                          className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                            item.reviewDecision === 'REJECTED'
                              ? 'bg-stone-200 text-stone-700 hover:bg-emerald-100 hover:text-emerald-800'
                              : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                          }`}
                        >
                          {item.reviewDecision === 'REJECTED' ? 'استعادة' : 'استبعاد'}
                        </button>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* MODAL: CANDIDATE MATCH REVIEW DIALOG */}
      {/* ==================================================================== */}
      {reviewingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-lg w-full p-6 text-xs space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                  مراجعة المطابقة المقترحة (Candidate Review)
                </span>
                <h3 className="text-base font-bold text-stone-900 mt-1">
                  مطابقة {reviewingItem.entityType === 'carrier' ? 'الناقل' : reviewingItem.entityType === 'material' ? 'المادة' : reviewingItem.entityType === 'truck' ? 'الشاحنة' : 'السائق'}
                </h3>
              </div>
              <button
                onClick={() => setReviewingItem(null)}
                className="text-stone-400 hover:text-stone-700 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
              <span className="text-stone-400 block text-[10px]">القيمة الواردة في شيت قوقل الأصلي:</span>
              <span className="font-bold text-stone-900 text-sm">{reviewingItem.originalValue}</span>
            </div>

            <div className="space-y-2">
              <span className="font-bold text-stone-700 block">الكيانات المقترحة من سجل البيانات المعتمدة:</span>
              {reviewingItem.candidates.map((cand, cIdx) => (
                <div key={cIdx} className="p-3 bg-white border border-stone-200 rounded-xl flex items-center justify-between hover:border-amber-400 transition-all">
                  <div>
                    <span className="font-bold text-stone-900 block text-xs">{cand.name}</span>
                    <span className="text-[10px] text-stone-400 font-mono">{cand.id} • {cand.details || 'مطابقة تشابه لغوي'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {Math.round(cand.score * 100)}% ثقة
                    </span>
                    <button
                      onClick={() => handleAcceptCandidate(reviewingItem.itemIndex, reviewingItem.entityType, cand)}
                      className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-amber-600 text-white font-bold text-xs shadow-2xs"
                    >
                      اعتماد المطابقة
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setReviewingItem(null)}
                className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs"
              >
                إلغاء
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: ADMIN CONFIRMATION & COMMIT DIALOG */}
      {/* ==================================================================== */}
      {showCommitModal && report && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-xl w-full p-6 text-xs space-y-5">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900">
                    تأكيد واعتماد ترحيل البيانات التاريخية (Admin Commit Confirmation)
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    بصفتك مدير النظام ({adminContext.displayName})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCommitModal(false)}
                className="text-stone-400 hover:text-stone-700 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Impact Summary Checklist */}
            <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-stone-600">إجمالي السجلات السليمة المراد ترحيلها:</span>
                <strong className="text-emerald-700 font-mono text-sm">{report.rowsValid} رحلة</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-600">السجلات المرفوضة (تكرار أو تعارض أوزان) المستبعدة:</span>
                <strong className="text-rose-700 font-mono text-sm">{report.rowsInvalid} سجل</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-600">الرحلات ذات التسعير غير المحدد (LEGACY_UNRESOLVED):</span>
                <strong className="text-purple-700 font-mono text-sm">{report.pricingUnresolved} رحلة (بدون افتراض)</strong>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-stone-200 text-stone-500">
                <span>حماية ملف Google Sheet الأصلي:</span>
                <strong className="text-emerald-700 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  محمي بنسبة 100% (لم ولن يتم تعديل أي بايت)
                </strong>
              </div>
            </div>

            {/* Admin Sign-Off Checkbox */}
            <label className="flex items-start gap-3 p-3.5 bg-amber-50 rounded-xl border border-amber-200 cursor-pointer">
              <input
                type="checkbox"
                checked={adminAcknowledgement}
                onChange={(e) => setAdminAcknowledgement(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
              />
              <span className="text-amber-950 text-xs leading-relaxed font-semibold">
                أقر أنا مدير النظام بصحة مراجعة المطابقات المقترحة، وأوافق على ترحيل الـ {report.rowsValid} رحلة إلى النظام وقاعدة البيانات، مع تسجيل قيد تدقيق غير قابل للحذف يحمل هويتي الرسمية.
              </span>
            </label>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowCommitModal(false)}
                className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-700 font-bold hover:bg-stone-50 text-xs"
              >
                إلغاء والتراجع
              </button>
              <button
                type="button"
                onClick={handleExecuteCommit}
                disabled={!adminAcknowledgement || isCommitting}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isCommitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>جاري الترحيل وتسجيل الدفعة...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>تأكيد واعتماد الترحيل النهائي (Commit)</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
