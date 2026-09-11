/**
 * Weighbridge Import Section Component
 * BLOCK 34 — Weighbridge Import over Unified Import Center
 * 
 * Implements:
 * - Weighbridge Profile over the 10-stage Unified Pipeline (BLOCK 30)
 * - Multi-source intake (Excel, CSV, Google Drive, Google Sheets)
 * - Display of mandatory and optional weighbridge fields
 * - Weight calculation tolerance and invariant indicators
 * - Missing unload data handling (non-blocking warning, WEIGHED_ORIGIN, no fake zero variance)
 * - Explicit "Accept Origin Net as Destination" action with audited confirmation modal
 * - Zero Firestore writes prior to COMMIT
 * - OperationId idempotency and Project Isolation
 */

import React, { useState, useMemo } from 'react';
import {
  Scale,
  FileSpreadsheet,
  HardDrive,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  Check,
  X,
  Lock,
  Unlock,
  Play,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  History,
  FileText,
  Sparkles,
  HelpCircle,
  RefreshCw,
  Search,
  Filter,
} from 'lucide-react';
import {
  WeighbridgeFileIntakeType,
  WeighbridgeRowSummary,
} from '../../types/weighbridgeImport';
import {
  UnifiedImportBatch,
  PipelineContext,
  ImportResult,
} from '../../types/unifiedImport';
import { WeighbridgeImportService } from '../../services/import/weighbridgeImport.service';
import { ExcelCsvTripCommitter } from '../../services/import/tripImportCommitter';

// Sample Weighbridge Datasets for interactive demonstration
const SAMPLE_WEIGHBRIDGE_CSV = `تاريخ,رقم_التذكرة,رقم_الشاحنة,الناقل,المادة,الوزن_الفارغ,الوزن_القائم,الوزن_الصافي,ساعة_الوزن
2026-09-15,WB-2026-091,7845-أ ب د,شركة أجياد لنقل الركام,بحص متدرج 20 ملم,14200,42800,28600,08:30:00
2026-09-15,WB-2026-092,3312-ر س ل,مؤسسة الوفاق اللوجستية,رمل أحمر مغسول,13800,43200,,09:15:22
2026-09-15,WB-2026-093,9910-ح ط ك,شركة أجياد لنقل الركام,دفان صخري معتمد,15100,44900,29800,10:05:40
2026-09-15,WB-2026-094,5540-ع ن م,شركة النقل السريع للخدمات,ركام أساس A,14500,43100,28600,11:20:15`;

const SAMPLE_WEIGHBRIDGE_WITH_ERRORS_CSV = `تاريخ,رقم_التذكرة,رقم_الشاحنة,الناقل,الوزن_الفارغ,الوزن_القائم,الوزن_الصافي
2026-09-15,WB-ERR-101,1111-أ ب ج,شركة أجياد لنقل الركام,45000,15000,30000
2026-09-15,,2222-د هـ و,مؤسسة الوفاق اللوجستية,14000,42000,28000
2026-09-15,WB-ERR-103,,شركة النقل السريع,14000,43000,29000
2026-09-15,WB-ERR-104,4444-ز ح ط,شركة أجياد لنقل الركام,14000,43000,25000`;

interface WeighbridgeImportSectionProps {
  projectId?: string;
}

export function WeighbridgeImportSection({
  projectId = 'PRJ-NEOM-NORTH-01',
}: WeighbridgeImportSectionProps) {
  // Intake configuration state
  const [intakeType, setIntakeType] = useState<WeighbridgeFileIntakeType>('CSV');
  const [csvContent, setCsvContent] = useState<string>(SAMPLE_WEIGHBRIDGE_CSV);
  const [fileName, setFileName] = useState<string>('weighbridge_dispatch_neom.csv');

  // Execution state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [activeBatch, setActiveBatch] = useState<UnifiedImportBatch | null>(null);
  const [commitResult, setCommitResult] = useState<ImportResult | null>(null);
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [allowWarnings, setAllowWarnings] = useState<boolean>(false);
  const [warningNotes, setWarningNotes] = useState<string>('');

  // Confirmation Modal state for "Accept Origin Net as Destination"
  const [confirmingRow, setConfirmingRow] = useState<WeighbridgeRowSummary | null>(null);
  const [confirmNotes, setConfirmNotes] = useState<string>('');
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Filter & Search in Review Table
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'VALID' | 'WARNING' | 'ERROR'>('ALL');

  // Context
  const context: PipelineContext = useMemo(
    () => ({
      projectId,
      userId: 'USR-OPS-881',
      userName: 'م. عبدالرحمن السبيعي (مدير حركة النقل)',
      role: 'ADMIN',
      operationId: `OP-WB-${Date.now().toString().slice(-6)}`,
      profile: 'WEIGHBRIDGE',
      allowWarningsCommit: allowWarnings,
      warningConfirmationNotes: warningNotes,
      knownEntities: {
        carrierIds: ['شركة أجياد لنقل الركام', 'مؤسسة الوفاق اللوجستية', 'شركة النقل السريع للخدمات'],
        truckPlates: ['7845-أ ب د', '3312-ر س ل', '9910-ح ط ك', '5540-ع ن م'],
        driverIds: [],
        materialCodes: ['بحص متدرج 20 ملم', 'رمل أحمر مغسول', 'دفان صخري معتمد', 'ركام أساس A'],
        truckCarrierMap: {
          '7845-أ ب د': 'شركة أجياد لنقل الركام',
          '3312-ر س ل': 'مؤسسة الوفاق اللوجستية',
          '9910-ح ط ك': 'شركة أجياد لنقل الركام',
          '5540-ع ن م': 'شركة النقل السريع للخدمات',
        },
      },
    }),
    [projectId, allowWarnings, warningNotes]
  );

  // Process data through Unified Pipeline up to Review stage
  const handleExecuteToReview = async (customText?: string, customName?: string) => {
    setIsProcessing(true);
    setCommitResult(null);
    setActionSuccessMessage(null);
    try {
      const textToParse = customText ?? csvContent;
      const targetName = customName ?? fileName;

      const batch = await WeighbridgeImportService.processWeighbridgeDataToReview({
        intakeType: 'CSV',
        input: textToParse,
        fileName: targetName,
        context,
      });

      setActiveBatch(batch);
    } catch (err: any) {
      console.error('Failed to process weighbridge intake:', err);
      alert(`خطأ في معالجة بيانات الميزان: ${err.message || 'خطأ غير معروف'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Explicit Audited Accept Origin Net as Destination Action
  const handleConfirmAcceptOriginNet = async () => {
    if (!activeBatch || !confirmingRow) return;

    try {
      const result = await WeighbridgeImportService.acceptOriginNetAsDestination(
        activeBatch,
        {
          importBatchId: activeBatch.importBatchId,
          rowNumber: confirmingRow.rowNumber,
          ticketId: confirmingRow.ticketId,
          userId: context.userId,
          userName: context.userName,
          notes: confirmNotes || 'تم قبول صافي المصدر كصافي تفريغ بموجب مراجعة مدير الحركة',
        },
        context
      );

      if (result.success) {
        // Trigger re-render with updated batch
        setActiveBatch({ ...activeBatch });
        setActionSuccessMessage(
          `تم بنجاح اعتماد صافي المصدر (${result.originalNetWeight} كجم) كصافي وصول للتذكرة [${confirmingRow.ticketId}]. حُسب الفرق = 0 كجم وسُجل تدقيق رقابي للعملية.`
        );
      } else {
        alert(`تعذر اعتماد صافي المصدر: ${result.error}`);
      }
    } catch (err: any) {
      alert(`خطأ: ${err.message}`);
    } finally {
      setConfirmingRow(null);
      setConfirmNotes('');
    }
  };

  // Final Commit to Storage
  const handleCommit = async () => {
    if (!activeBatch) return;
    setIsCommitting(true);
    try {
      const result = await WeighbridgeImportService.commitBatch(activeBatch, {
        ...context,
        allowWarningsCommit: allowWarnings,
        warningConfirmationNotes: warningNotes,
      });
      setCommitResult(result);
      if (result.success) {
        activeBatch.commitStatus = 'COMMITTED';
        setActiveBatch({ ...activeBatch });
      }
    } catch (err: any) {
      alert(`فشل الاعتماد النهائي: ${err.message}`);
    } finally {
      setIsCommitting(false);
    }
  };

  // Row summaries for UI display
  const rowSummaries = useMemo(() => {
    if (!activeBatch) return [];
    return WeighbridgeImportService.getWeighbridgeRowSummaries(activeBatch);
  }, [activeBatch]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return rowSummaries.filter((row) => {
      if (statusFilter !== 'ALL' && row.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchTicket = row.ticketId.toLowerCase().includes(q);
        const matchTruck = row.truckNo.toLowerCase().includes(q);
        const matchCarrier = (row.carrier || '').toLowerCase().includes(q);
        if (!matchTicket && !matchTruck && !matchCarrier) return false;
      }
      return true;
    });
  }, [rowSummaries, statusFilter, searchQuery]);

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* 1. SECTION HEADER */}
      <div className="bg-white border border-stone-200/80 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 flex items-center justify-center shrink-0 shadow-xs">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black tracking-tight text-stone-900">
                  استيراد بيانات الميزان (Weighbridge Import)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                  BLOCK 34 Profile
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-stone-100 text-stone-700 border border-stone-200">
                  10-Stage Unified Engine
                </span>
              </div>
              <p className="text-xs sm:text-sm text-stone-600 mt-1">
                بروفايل متخصص لاستيراد تذاكر وسجلات ميزان البسكول عبر مسار الاستيراد الموحد (Unified Pipeline). يفصل بين المصدر التشغيلي (WEIGHBRIDGE) ومصدر الإدخال (Excel/CSV/Sheets/Drive).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                ExcelCsvTripCommitter.resetIdempotencyCache();
                alert('تمت إعادة ضبط ذاكرة التحقق التكراري (Idempotency Cache) للاختبار.');
              }}
              className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-all border border-stone-200 flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-stone-500" />
              <span>إعادة ضبط Idempotency</span>
            </button>
          </div>
        </div>

        {/* Profile Invariants Banner */}
        <div className="mt-4 pt-4 border-t border-stone-100 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-stone-50 rounded-xl p-3 border border-stone-200/70 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <span className="font-bold text-stone-900 block">الحقول الإلزامية لتذكرة الميزان:</span>
              <span className="text-stone-600 text-[11px] leading-relaxed">
                التاريخ (date)، رقم التذكرة (ticketId)، رقم الشاحنة (truckNo)، الوزن الفارغ (tare)، الوزن القائم (gross).
              </span>
            </div>
          </div>

          <div className="bg-stone-50 rounded-xl p-3 border border-stone-200/70 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <span className="font-bold text-stone-900 block">غياب بيانات التفريغ (Non-blocking):</span>
              <span className="text-stone-600 text-[11px] leading-relaxed">
                غياب بيانات وزن الوصول يُنشئ تحذيراً ولا يمنع الاعتماد. يُنشئ الرحلة بحالة WEIGHED_ORIGIN دون فرق وزن وهمي.
              </span>
            </div>
          </div>

          <div className="bg-stone-50 rounded-xl p-3 border border-stone-200/70 flex items-start gap-2.5">
            <Scale className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <span className="font-bold text-stone-900 block">اعتماد صافي المصدر كصافي وصول:</span>
              <span className="text-stone-600 text-[11px] leading-relaxed">
                إجراء رقابي صريح بتأكيد بشري ومسار تدقيق مستقل. يحدد destNetWeight ويحسب الفرق الحقيقي = 0 كجم.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. INTAKE CONFIGURATION & INPUT PANEL */}
      <div className="bg-white border border-stone-200/80 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
          <div>
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-amber-600" />
              <span>مصدر وتنسيق إدخال بيانات الميزان</span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              يدعم مسار الاستيراد الموحد قراءة بيانات الميزان من ملفات CSV وExcel وتكامل Google Drive وSheets.
            </p>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setCsvContent(SAMPLE_WEIGHBRIDGE_CSV);
                setFileName('weighbridge_dispatch_neom.csv');
                handleExecuteToReview(SAMPLE_WEIGHBRIDGE_CSV, 'weighbridge_dispatch_neom.csv');
              }}
              className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-all border border-emerald-200 cursor-pointer"
            >
              نموذج تذاكر ميزان صالحة (4 صفوف)
            </button>
            <button
              type="button"
              onClick={() => {
                setCsvContent(SAMPLE_WEIGHBRIDGE_WITH_ERRORS_CSV);
                setFileName('weighbridge_with_violations.csv');
                handleExecuteToReview(SAMPLE_WEIGHBRIDGE_WITH_ERRORS_CSV, 'weighbridge_with_violations.csv');
              }}
              className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold transition-all border border-rose-200 cursor-pointer"
            >
              نموذج يتضمن مخالفات وأخطاء ميزان
            </button>
          </div>
        </div>

        {/* Input Text / File Area */}
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-stone-600">
            <label className="font-bold flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5 text-stone-500" />
              <span>محتوى ملف الميزان (CSV Text / Raw Input):</span>
            </label>
            <span className="font-mono text-[11px] text-stone-400">الملف: {fileName}</span>
          </div>

          <textarea
            value={csvContent}
            onChange={(e) => setCsvContent(e.target.value)}
            rows={5}
            className="w-full font-mono text-xs p-3 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-stone-800 dir-ltr text-left"
            placeholder="تاريخ,رقم_التذكرة,رقم_الشاحنة,الوزن_الفارغ,الوزن_القائم..."
          />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="text-xs text-stone-500 flex items-center gap-2">
              <Info className="w-4 h-4 text-stone-400" />
              <span>
                المعالجة تتوقف إلزامياً عند مرحلة المراجعة (REVIEW) ولا تُنشئ رحلات أو تكتب في قاعدة البيانات إلا بعد الاعتماد الصريح (COMMIT).
              </span>
            </div>

            <button
              type="button"
              disabled={isProcessing || !csvContent.trim()}
              onClick={() => handleExecuteToReview()}
              className="px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 text-white text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 shadow-xs"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>جاري معالجة المسار الموحد (10 مراحل)...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span>تنفيذ مسار استيراد الميزان وصولاً للمراجعة</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Action Success Alert */}
      {actionSuccessMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-start gap-3 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="block font-black text-emerald-950 mb-0.5">تم تنفيذ الإجراء الرقابي بنجاح:</span>
            <span>{actionSuccessMessage}</span>
          </div>
          <button
            onClick={() => setActionSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer text-sm font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* 3. ACTIVE BATCH METRICS & CONTROLS */}
      {activeBatch && (
        <div className="bg-stone-900 text-white rounded-2xl p-5 shadow-md border border-stone-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded border border-amber-400/30">
                  {activeBatch.importBatchId}
                </span>
                <span className="text-xs text-stone-400 font-bold">المشروع: {activeBatch.projectId}</span>
                <span className="text-xs text-stone-400">|</span>
                <span className="text-xs text-stone-400 font-bold">المصدر التشغيلي: WEIGHBRIDGE</span>
              </div>
              <h3 className="text-base font-black text-white mt-1">
                دفعة الميزان في مرحلة المراجعة (Review Stage - Human Gate)
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-black ${
                activeBatch.commitStatus === 'COMMITTED'
                  ? 'bg-emerald-500 text-white'
                  : activeBatch.errorRows > 0
                  ? 'bg-rose-600 text-white'
                  : activeBatch.warningRows > 0
                  ? 'bg-amber-500 text-stone-950'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-400/40'
              }`}>
                {activeBatch.commitStatus === 'COMMITTED'
                  ? 'تم الاعتماد النهائي (COMMITTED)'
                  : activeBatch.errorRows > 0
                  ? 'يوجد أخطاء مانعة (ERRORS_BLOCKING)'
                  : activeBatch.warningRows > 0
                  ? 'بانتظار تأكيد التحذيرات (WARNINGS_PENDING)'
                  : 'جاهز للاعتماد (READY_TO_COMMIT)'}
              </span>
            </div>
          </div>

          {/* Counters Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-right">
            <div className="bg-stone-800/80 p-3 rounded-xl border border-stone-700/60">
              <span className="text-[11px] text-stone-400 block font-semibold">إجمالي الصفوف</span>
              <span className="text-xl font-black text-white">{activeBatch.totalRows}</span>
            </div>

            <div className="bg-stone-800/80 p-3 rounded-xl border border-emerald-500/30">
              <span className="text-[11px] text-emerald-400 block font-semibold">صفوف صالحة (Valid)</span>
              <span className="text-xl font-black text-emerald-400">{activeBatch.validRows}</span>
            </div>

            <div className="bg-stone-800/80 p-3 rounded-xl border border-amber-500/30">
              <span className="text-[11px] text-amber-400 block font-semibold">تحذيرات (Warnings)</span>
              <span className="text-xl font-black text-amber-400">{activeBatch.warningRows}</span>
              <span className="text-[10px] text-stone-400 block mt-0.5">تتطلب إقراراً ولا تمنع</span>
            </div>

            <div className="bg-stone-800/80 p-3 rounded-xl border border-rose-500/30">
              <span className="text-[11px] text-rose-400 block font-semibold">أخطاء مانعة (Errors)</span>
              <span className="text-xl font-black text-rose-400">{activeBatch.errorRows}</span>
              <span className="text-[10px] text-stone-400 block mt-0.5">تمنع الاعتماد حتمياً</span>
            </div>
          </div>

          {/* Commit Gate Bar */}
          {activeBatch.commitStatus !== 'COMMITTED' && (
            <div className="pt-3 border-t border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-stone-300">
                {activeBatch.errorRows > 0 ? (
                  <span className="text-rose-400 font-bold flex items-center gap-1.5">
                    <Lock className="w-4 h-4 shrink-0" />
                    <span>توجد ({activeBatch.errorRows}) أخطاء مانعة (مثل فارغ أكبر من القائم أو غياب رقم التذكرة). يجب التصحيح أولاً.</span>
                  </span>
                ) : activeBatch.warningRows > 0 ? (
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-amber-300">
                    <input
                      type="checkbox"
                      checked={allowWarnings}
                      onChange={(e) => setAllowWarnings(e.target.checked)}
                      className="w-4 h-4 rounded border-stone-600 bg-stone-800 text-amber-500 focus:ring-amber-400"
                    />
                    <span>أقر بالموافقة على اعتماد الصفوف المتضمنة تحذيرات (مثل شحنات بدون بيانات تفريغ).</span>
                  </label>
                ) : (
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>جميع الصفوف مطابقة لبروفايل الميزان وجاهزة للاعتماد الفوري.</span>
                  </span>
                )}
              </div>

              <button
                type="button"
                disabled={
                  isCommitting ||
                  activeBatch.errorRows > 0 ||
                  (activeBatch.warningRows > 0 && !allowWarnings)
                }
                onClick={handleCommit}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-stone-800 disabled:text-stone-600 text-stone-950 text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 shadow-md"
              >
                {isCommitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جاري الاعتماد وتوليد الرحلات...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>اعتماد دفعة الميزان نهائياً (COMMIT)</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* 4. COMMIT RESULT SUMMARY */}
      {commitResult && (
        <div className={`p-5 rounded-2xl border text-right shadow-xs ${
          commitResult.success
            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
            : 'bg-rose-50/80 border-rose-200 text-rose-950'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {commitResult.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <XCircle className="w-5 h-5 text-rose-600" />
            )}
            <h4 className="text-sm font-black">
              {commitResult.success ? 'تم اعتماد دفعة الميزان بنجاح تام' : 'فشل اعتماد الدفعة'}
            </h4>
          </div>

          <div className="text-xs space-y-1">
            <div><strong>معرف العملية (Operation ID):</strong> <span className="font-mono">{commitResult.operationId}</span></div>
            <div><strong>عدد الرحلات المعتمدة:</strong> {commitResult.committedRows} من أصل {commitResult.totalRows}</div>
            <div><strong>المصدر التشغيلي المسجل:</strong> {commitResult.sourceType}</div>
            {commitResult.committedEntityIds && commitResult.committedEntityIds.length > 0 && (
              <div className="pt-2">
                <span className="font-bold block mb-1">أرقام الرحلات المنشأة:</span>
                <div className="flex items-center gap-2 flex-wrap">
                  {commitResult.committedEntityIds.map((id) => (
                    <span key={id} className="px-2 py-0.5 rounded bg-emerald-100 font-mono text-[11px] font-bold text-emerald-900 border border-emerald-300">
                      {id}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. WEIGHBRIDGE REVIEW TABLE */}
      {activeBatch && (
        <div className="bg-white border border-stone-200/80 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
            <div>
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <Scale className="w-4 h-4 text-amber-600" />
                <span>جدول مراجعة تذاكر الميزان والأوزان (Weighbridge Review Table)</span>
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                فحص تطابق الأوزان، احتساب الصافي، التحقق من الحقول الإلزامية، وتطبيق قرار قبول صافي المصدر كصافي وصول.
              </p>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute right-2.5 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="بحث بالتذكرة أو اللوحة..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-8 pl-3 py-1.5 rounded-lg border border-stone-200 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 text-stone-800"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-bold text-stone-700 focus:outline-none"
              >
                <option value="ALL">جميع الحالات ({rowSummaries.length})</option>
                <option value="VALID">صالحة ({rowSummaries.filter(r => r.status === 'VALID').length})</option>
                <option value="WARNING">تحذيرات ({rowSummaries.filter(r => r.status === 'WARNING').length})</option>
                <option value="ERROR">أخطاء ({rowSummaries.filter(r => r.status === 'ERROR').length})</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto border border-stone-200 rounded-xl">
            <table className="w-full text-right text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">رقم التذكرة</th>
                  <th className="py-2.5 px-3">رقم الشاحنة</th>
                  <th className="py-2.5 px-3">الناقل</th>
                  <th className="py-2.5 px-3">الفارغ (كجم)</th>
                  <th className="py-2.5 px-3">القائم (كجم)</th>
                  <th className="py-2.5 px-3">صافي المصدر</th>
                  <th className="py-2.5 px-3">صافي الوصول</th>
                  <th className="py-2.5 px-3">فرق الوزن</th>
                  <th className="py-2.5 px-3">حالة التدقيق</th>
                  <th className="py-2.5 px-3 text-center">إجراء رقابي (Decision)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredRows.map((row) => {
                  return (
                    <tr
                      key={row.rowNumber}
                      className={`hover:bg-stone-50/80 transition-colors ${
                        row.status === 'ERROR'
                          ? 'bg-rose-50/30'
                          : row.isAcceptedOriginNet
                          ? 'bg-emerald-50/30'
                          : ''
                      }`}
                    >
                      <td className="py-3 px-3 font-mono text-stone-400 font-bold">{row.rowNumber}</td>
                      <td className="py-3 px-3 font-mono font-black text-stone-900">
                        {row.ticketId || <span className="text-rose-500 font-bold">مفقود (Missing)</span>}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-stone-800">
                        {row.truckNo || <span className="text-rose-500 font-bold">مفقود</span>}
                      </td>
                      <td className="py-3 px-3 text-stone-700">{row.carrier || 'غير محدد'}</td>
                      <td className="py-3 px-3 font-mono text-stone-600">{row.tareWeight.toLocaleString()}</td>
                      <td className="py-3 px-3 font-mono text-stone-600">{row.grossWeight.toLocaleString()}</td>
                      <td className="py-3 px-3 font-mono font-bold text-stone-900">
                        <span>{row.netWeight.toLocaleString()} كجم</span>
                        {row.isCalculatedNet && (
                          <span className="mr-1.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-blue-800">
                            محسوب (gross-tare)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono">
                        {row.destNetWeight !== null ? (
                          <span className="font-bold text-emerald-800">{row.destNetWeight.toLocaleString()} كجم</span>
                        ) : (
                          <span className="text-stone-400 font-bold">— (غير متوفر)</span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono">
                        {row.varianceWeight !== null ? (
                          <span className="font-bold text-stone-800">{row.varianceWeight} كجم</span>
                        ) : (
                          <span className="text-stone-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {row.status === 'ERROR' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            خطأ مانع
                          </span>
                        ) : row.isAcceptedOriginNet ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            صافي معتمد
                          </span>
                        ) : row.destNetWeight === null ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            بدون تفريغ (تحذير)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            مطابق
                          </span>
                        )}
                        {row.issues.length > 0 && (
                          <div className="text-[10px] text-stone-500 mt-1 space-y-0.5">
                            {row.issues.map((iss) => (
                              <div key={iss.issueId} className={iss.blocking ? 'text-rose-600 font-bold' : 'text-amber-700'}>
                                • {iss.messageAr || iss.message}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {row.canAcceptOriginNet && (
                          <button
                            type="button"
                            onClick={() => setConfirmingRow(row)}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold border border-blue-200 transition-all cursor-pointer whitespace-nowrap"
                          >
                            قبول صافي المصدر
                          </button>
                        )}
                        {row.isAcceptedOriginNet && (
                          <span className="text-[10px] text-emerald-700 font-bold flex items-center justify-center gap-1">
                            <Check className="w-3 h-3" /> تم القبول الرقابي
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. AUDITED CONFIRMATION MODAL */}
      {confirmingRow && (
        <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-stone-200 space-y-4 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
                <Scale className="w-5 h-5 text-blue-600" />
                <span>تأكيد اعتماد صافي المصدر كصافي وصول (Audit Confirmation)</span>
              </h3>
              <button
                onClick={() => setConfirmingRow(null)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-stone-600 space-y-2">
              <p>
                أنت بصدد اتخاذ قرار رقابي باعتماد وزن صافي المصدر المسجل بميزان التحميل كوزن صافي نهائي لموقع الوصول للشحنة التالية:
              </p>

              <div className="bg-stone-50 rounded-xl p-3 border border-stone-200 font-mono space-y-1 text-stone-800 text-xs">
                <div><strong>رقم التذكرة:</strong> {confirmingRow.ticketId}</div>
                <div><strong>رقم الشاحنة:</strong> {confirmingRow.truckNo}</div>
                <div><strong>الناقل:</strong> {confirmingRow.carrier || 'غير محدد'}</div>
                <div><strong>الوزن الصافي المعتمد:</strong> {confirmingRow.netWeight.toLocaleString()} كجم</div>
                <div><strong>فرق الوزن المحسوب (Variance):</strong> 0.00 كجم</div>
              </div>

              <p className="text-amber-800 font-bold bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-[11px]">
                تنبيه نظامي: سيتم تسجيل هذا القرار في سجل التدقيق الرقابي الدائم (Audit Log) متضمناً اسمك وهويتك ووقت اتخاذ القرار بصفتك مسؤول التشغيل المعتمد.
              </p>

              <div>
                <label className="font-bold block text-stone-700 mb-1">
                  ملاحظات أو مبرر الاعتماد (اختياري):
                </label>
                <input
                  type="text"
                  placeholder="مثال: مطابقة سند التسليم الميداني لموقع التفريغ"
                  value={confirmNotes}
                  onChange={(e) => setConfirmNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setConfirmingRow(null)}
                className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-all cursor-pointer"
              >
                إلغاء وتراجع (Cancel)
              </button>
              <button
                type="button"
                onClick={handleConfirmAcceptOriginNet}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Check className="w-4 h-4" />
                <span>تأكيد واعتماد القرار الرقابي</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
