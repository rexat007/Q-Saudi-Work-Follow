import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  UploadCloud, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Info, 
  Check, 
  X, 
  SlidersHorizontal, 
  FileText, 
  History, 
  Database, 
  ArrowRight, 
  ShieldAlert, 
  ShieldCheck, 
  Sparkles, 
  Lock, 
  Unlock, 
  RefreshCw, 
  Edit3, 
  Search, 
  Filter, 
  Eye, 
  Download, 
  Play, 
  ChevronDown, 
  AlertCircle,
  HelpCircle,
  Clock,
  HardDrive,
  Scale
} from 'lucide-react';
import { 
  ImportBatch, 
  ImportStage, 
  ReviewTableRow, 
  ReviewActionType, 
  IssueSeverity 
} from '../../types/importCenter';
import { ImportCenterService } from '../../services/dataQuality/importCenterService';
import { SAMPLE_QUALITY_CONTEXT } from '../../data/sampleQualityData';
import { SAMPLE_RAW_CSV_TEXT, createInitialSampleBatch } from '../../data/sampleImportBatches';
import { UnifiedImportArchitectureSection } from './UnifiedImportArchitectureSection';
import { ExcelCsvImportSection } from './ExcelCsvImportSection';
import { GoogleDriveImportSection } from './GoogleDriveImportSection';
import { GoogleSheetsImportSection } from './GoogleSheetsImportSection';
import { WeighbridgeImportSection } from './WeighbridgeImportSection';

export function ImportCenterView() {
  // Navigation between Weighbridge, Google Sheets, Google Drive, Excel/CSV, Unified Architecture, and Active Batch
  const [centerSubTab, setCenterSubTab] = useState<'WEIGHBRIDGE_IMPORT' | 'GOOGLE_SHEETS_IMPORT' | 'GOOGLE_DRIVE_IMPORT' | 'EXCEL_CSV_IMPORT' | 'UNIFIED_ARCHITECTURE' | 'ACTIVE_BATCH'>('WEIGHBRIDGE_IMPORT');

  // Active batch state
  const [activeBatch, setActiveBatch] = useState<ImportBatch>(createInitialSampleBatch);
  const [batchHistory, setBatchHistory] = useState<ImportBatch[]>([createInitialSampleBatch()]);

  // UI Filter states
  const [selectedSeverityFilter, setSelectedSeverityFilter] = useState<'ALL' | IssueSeverity>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Modals & Drawers
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [showRawSnapshotModal, setShowRawSnapshotModal] = useState<boolean>(false);
  const [showAuditTrailModal, setShowAuditTrailModal] = useState<boolean>(false);
  const [showWarningConfirmModal, setShowWarningConfirmModal] = useState<boolean>(false);
  const [warningConfirmNotes, setWarningConfirmNotes] = useState<string>('');
  
  // Inline Master Record Selector Modal
  const [selectingMasterItem, setSelectingMasterItem] = useState<ReviewTableRow | null>(null);
  
  // Inline Manual Edit Modal
  const [editingItem, setEditingItem] = useState<ReviewTableRow | null>(null);
  const [manualInputValue, setManualInputValue] = useState<string>('');

  // Upload Form State
  const [uploadedFileName, setUploadedFileName] = useState<string>('بيانات_توريد_جديدة.csv');
  const [rawUploadText, setRawUploadText] = useState<string>(SAMPLE_RAW_CSV_TEXT);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  // User identity context
  const currentUserName = 'م. عبدالرحمن السبيعي (مدير حركة النقل)';
  const currentUserId = 'USR-NEOM-881';

  // 12 Pipeline Stages definition for Stepper
  const pipelineStages: { stage: ImportStage; number: number; nameAr: string; desc: string }[] = [
    { stage: 'UPLOAD', number: 1, nameAr: 'رفع الملف', desc: 'Upload' },
    { stage: 'PARSE', number: 2, nameAr: 'تفكيك البيانات', desc: 'Parse' },
    { stage: 'DETECT_COLUMNS', number: 3, nameAr: 'كشف الأعمدة', desc: 'Detect Columns' },
    { stage: 'NORMALIZE', number: 4, nameAr: 'المعايرة القياسية', desc: 'Normalize' },
    { stage: 'MATCH_ENTITIES', number: 5, nameAr: 'مطابقة الكيانات', desc: 'Match Entities' },
    { stage: 'VALIDATE_RELATIONSHIPS', number: 6, nameAr: 'تحقق العلاقات', desc: 'Validate Relations' },
    { stage: 'DETECT_DUPLICATES', number: 7, nameAr: 'كشف التكرار', desc: 'Detect Duplicates' },
    { stage: 'GENERATE_REPORT', number: 8, nameAr: 'تقرير المراجعة', desc: 'Generate Report' },
    { stage: 'HUMAN_CORRECTION', number: 9, nameAr: 'التصحيح البشري', desc: 'Human Correction' },
    { stage: 'FINAL_VALIDATION', number: 10, nameAr: 'التحقق النهائي', desc: 'Final Validation' },
    { stage: 'COMMIT', number: 11, nameAr: 'الاعتماد النهائي', desc: 'Commit' },
    { stage: 'AUDIT', number: 12, nameAr: 'التدقيق الرقابي', desc: 'Audit' },
  ];

  // Filtered review items
  const filteredReviewItems = useMemo(() => {
    return activeBatch.reviewItems.filter((item) => {
      // Severity filter
      if (selectedSeverityFilter !== 'ALL' && item.severity !== selectedSeverityFilter) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesField = item.field.toLowerCase().includes(q);
        const matchesOrig = item.originalValue.toLowerCase().includes(q);
        const matchesSugg = item.suggestedValue.toLowerCase().includes(q);
        const matchesIssue = item.issue.toLowerCase().includes(q);
        const matchesRow = String(item.rowNumber).includes(q);
        if (!matchesField && !matchesOrig && !matchesSugg && !matchesIssue && !matchesRow) {
          return false;
        }
      }
      return true;
    });
  }, [activeBatch.reviewItems, selectedSeverityFilter, searchQuery]);

  // Handle uploading and parsing a new file
  const handleStartImport = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      const { headers, rows } = ImportCenterService.parseRawText(rawUploadText);
      const newBatch = ImportCenterService.processImportBatch({
        importBatchId: `BATCH-NEOM-${Date.now().toString().slice(-6)}`,
        projectId: 'PRJ-NEOM-001',
        fileName: uploadedFileName,
        uploadedBy: currentUserName,
        rawRows: rows,
        headers,
        context: SAMPLE_QUALITY_CONTEXT,
      });

      setActiveBatch(newBatch);
      setBatchHistory((prev) => [newBatch, ...prev]);
      setShowUploadModal(false);
      setIsAnalyzing(false);
    }, 400);
  };

  // Action Handlers
  const handleApplyAction = (
    itemId: string,
    action: ReviewActionType,
    payload: {
      chosenMasterId?: string;
      chosenMasterValue?: string;
      manualValue?: string;
      notes?: string;
    } = {}
  ) => {
    const updated = ImportCenterService.applyItemAction(activeBatch, itemId, action, {
      userId: currentUserId,
      userName: currentUserName,
      ...payload,
    });
    setActiveBatch(updated);
  };

  // Bulk Accept High-Confidence Suggestions
  const handleBulkAccept = () => {
    const updated = ImportCenterService.bulkAcceptSuggestions(activeBatch, currentUserName);
    setActiveBatch(updated);
  };

  // Reject all rows that have CRITICAL errors
  const handleRejectAllCriticalRows = () => {
    const criticalRowNumbers = new Set(
      activeBatch.reviewItems
        .filter((i) => i.severity === 'CRITICAL' && i.rowStatus === 'ACTIVE')
        .map((i) => i.rowNumber)
    );

    let updated = activeBatch;
    activeBatch.reviewItems.forEach((item) => {
      if (criticalRowNumbers.has(item.rowNumber)) {
        updated = ImportCenterService.applyItemAction(updated, item.id, 'REJECT_ROW', {
          userId: currentUserId,
          userName: currentUserName,
          notes: 'استبعاد جماعي للصفوف ذات الأخطاء الحرجة',
        });
      }
    });

    setActiveBatch(updated);
  };

  // Commit Batch handler
  const handleCommitBatch = (confirmWarnings: boolean = false) => {
    if (activeBatch.errorCount > 0) {
      alert(`لا يمكن الاعتماد: يوجد (${activeBatch.errorCount}) أخطاء حرجة (CRITICAL). يجب تصحيحها أو استبعاد الصفوف أولاً.`);
      return;
    }

    if (activeBatch.warningCount > 0 && !confirmWarnings) {
      setShowWarningConfirmModal(true);
      return;
    }

    const result = ImportCenterService.commitBatch(activeBatch, {
      userId: currentUserId,
      userName: currentUserName,
      confirmWarnings,
      warningConfirmationNotes: warningConfirmNotes,
    });

    if (result.success) {
      setActiveBatch(result.updatedBatch);
      setShowWarningConfirmModal(false);
      // Update in history
      setBatchHistory((prev) =>
        prev.map((b) => (b.importBatchId === result.updatedBatch.importBatchId ? result.updatedBatch : b))
      );
    } else {
      alert(result.error);
    }
  };

  // Helper for action badge/label
  const getActionBadge = (action: ReviewActionType, rowStatus: 'ACTIVE' | 'REJECTED') => {
    if (rowStatus === 'REJECTED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-stone-200 text-stone-700">
          <X className="w-3 h-3" /> تم رفض الصف (Reject Row)
        </span>
      );
    }

    switch (action) {
      case 'ACCEPT_SUGGESTION':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800">
            <Check className="w-3 h-3" /> تم قبول الاقتراح (Accept)
          </span>
        );
      case 'KEEP_ORIGINAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800">
            <CheckCircle2 className="w-3 h-3" /> الإبقاء على الأصل (Keep Original)
          </span>
        );
      case 'CHOOSE_MASTER_RECORD':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-purple-100 text-purple-800">
            <Database className="w-3 h-3" /> اختيار سجل معتمد (Master)
          </span>
        );
      case 'EDIT_MANUALLY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-sky-100 text-sky-800">
            <Edit3 className="w-3 h-3" /> تعديل يدوي (Manual Edit)
          </span>
        );
      case 'IGNORE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-stone-100 text-stone-600">
            <Eye className="w-3 h-3" /> تم التجاهل (Ignored)
          </span>
        );
      case 'REJECT_ROW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-100 text-rose-800">
            <X className="w-3 h-3" /> استبعاد الصف (Reject Row)
          </span>
        );
    }
  };

  // Severity badge helper
  const getSeverityBadge = (severity: IssueSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>CRITICAL</span>
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>WARNING</span>
          </span>
        );
      case 'INFO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-800 border border-sky-200">
            <Info className="w-3.5 h-3.5 text-sky-600" />
            <span>INFO</span>
          </span>
        );
    }
  };

  const isCommitted = activeBatch.status === 'COMMITTED';
  const hasCritical = activeBatch.errorCount > 0;
  const hasWarnings = activeBatch.warningCount > 0;

  return (
    <div className="space-y-6">
      {/* Sub-navigation tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200/80 pb-3 flex-wrap">
        <button
          onClick={() => setCenterSubTab('WEIGHBRIDGE_IMPORT')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            centerSubTab === 'WEIGHBRIDGE_IMPORT'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <Scale className="w-3.5 h-3.5 text-amber-400" />
          <span>استيراد الميزان (BLOCK 34 Weighbridge)</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-500 text-stone-950 font-black">Weighbridge</span>
        </button>
        <button
          onClick={() => setCenterSubTab('GOOGLE_SHEETS_IMPORT')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            centerSubTab === 'GOOGLE_SHEETS_IMPORT'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
          <span>استيراد Google Sheets (BLOCK 33)</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-600 text-white font-black">Google Sheets</span>
        </button>
        <button
          onClick={() => setCenterSubTab('GOOGLE_DRIVE_IMPORT')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            centerSubTab === 'GOOGLE_DRIVE_IMPORT'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <HardDrive className="w-3.5 h-3.5 text-blue-400" />
          <span>استيراد Google Drive (BLOCK 32)</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-500 text-white font-black">Google Drive</span>
        </button>
        <button
          onClick={() => setCenterSubTab('EXCEL_CSV_IMPORT')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            centerSubTab === 'EXCEL_CSV_IMPORT'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>استيراد ملفات Excel / CSV (BLOCK 31)</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-400 text-stone-950 font-black">XLSX / XLS / CSV</span>
        </button>
        <button
          onClick={() => setCenterSubTab('UNIFIED_ARCHITECTURE')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            centerSubTab === 'UNIFIED_ARCHITECTURE'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <span>معمارية الاستيراد الموحد (BLOCK 30 Unified Architecture)</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-400 text-stone-950 font-black">10 Stages</span>
        </button>
        <button
          onClick={() => setCenterSubTab('ACTIVE_BATCH')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            centerSubTab === 'ACTIVE_BATCH'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          استعراض ومراجعة الدفعة النشطة (Active Batch Review)
        </button>
      </div>

      {centerSubTab === 'WEIGHBRIDGE_IMPORT' ? (
        <WeighbridgeImportSection projectId="PRJ-NEOM-NORTH-01" />
      ) : centerSubTab === 'GOOGLE_SHEETS_IMPORT' ? (
        <GoogleSheetsImportSection projectId="PRJ-NEOM-NORTH-01" />
      ) : centerSubTab === 'GOOGLE_DRIVE_IMPORT' ? (
        <GoogleDriveImportSection />
      ) : centerSubTab === 'EXCEL_CSV_IMPORT' ? (
        <ExcelCsvImportSection />
      ) : centerSubTab === 'UNIFIED_ARCHITECTURE' ? (
        <UnifiedImportArchitectureSection />
      ) : (
        <>
          {/* 1. TOP HEADER & CONTROLS */}
          <div className="bg-white border border-stone-200/80 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 flex items-center justify-center shrink-0 shadow-xs">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black tracking-tight text-stone-900">
                  مركز الاستيراد المتقدم (Import Center)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900">
                  12-Stage Controlled Pipeline
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                  توقف إلزامي قبل الاعتماد (Pre-Commit Gate)
                </span>
              </div>
              <p className="text-xs sm:text-sm text-stone-600 mt-1">
                استيراد وتدقيق دفعات الشحنات والتوريدات عبر 12 مرحلة تحكم ورقابة صارمة. يحتفظ بالنسخة الأصلية للبيانات لأغراض التدقيق.
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>رفع ملف استيراد جديد (Upload)</span>
            </button>

            <button
              onClick={() => setShowRawSnapshotModal(true)}
              className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-all border border-stone-200 flex items-center gap-1.5 cursor-pointer"
            >
              <Eye className="w-4 h-4 text-stone-500" />
              <span>النسخة الأصلية للبيانات (Raw Snapshot)</span>
            </button>

            <button
              onClick={() => setShowAuditTrailModal(true)}
              className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-all border border-stone-200 flex items-center gap-1.5 cursor-pointer"
            >
              <History className="w-4 h-4 text-stone-500" />
              <span>سجل التدقيق ({activeBatch.auditTrail.length})</span>
            </button>
          </div>
        </div>

        {/* 2. BATCH METADATA HEADER */}
        <div className="mt-5 pt-5 border-t border-stone-100">
          <div className="bg-stone-50/80 rounded-xl p-4 border border-stone-200/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200/60 text-xs">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-bold text-stone-500">معرف الدفعة (Batch ID):</span>
                <span className="font-mono font-black text-stone-900 bg-white px-2.5 py-0.5 rounded border border-stone-200">
                  {activeBatch.importBatchId}
                </span>

                <span className="font-bold text-stone-500">المشروع:</span>
                <span className="font-bold text-stone-800 bg-white px-2 py-0.5 rounded border border-stone-200">
                  {activeBatch.projectId}
                </span>

                <span className="font-bold text-stone-500">اسم الملف:</span>
                <span className="font-bold text-stone-800 bg-white px-2 py-0.5 rounded border border-stone-200">
                  {activeBatch.fileName}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-stone-500">بواسطة:</span>
                <span className="font-bold text-stone-800">{activeBatch.uploadedBy}</span>
                <span className="text-stone-400">|</span>
                <span className="text-stone-500 font-mono text-[11px]">{new Date(activeBatch.createdAt).toLocaleDateString('ar-SA')}</span>
              </div>
            </div>

            {/* Batch Counters Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 text-right">
              <div className="bg-white p-2.5 rounded-lg border border-stone-200/70">
                <span className="text-[10px] text-stone-500 block font-semibold">إجمالي الصفوف (rowCount)</span>
                <span className="text-lg font-black text-stone-900">{activeBatch.rowCount}</span>
              </div>
              <div className="bg-emerald-50/80 p-2.5 rounded-lg border border-emerald-200/60">
                <span className="text-[10px] text-emerald-800 block font-semibold">الصفوف الصالحة (validCount)</span>
                <span className="text-lg font-black text-emerald-900">{activeBatch.validCount}</span>
              </div>
              <div className="bg-amber-50/80 p-2.5 rounded-lg border border-amber-200/60">
                <span className="text-[10px] text-amber-800 block font-semibold">التحذيرات (warningCount)</span>
                <span className="text-lg font-black text-amber-900">{activeBatch.warningCount}</span>
                <span className="text-[9px] text-amber-700 block">تتطلب تأكيداً (Confirmation)</span>
              </div>
              <div className="bg-rose-50/80 p-2.5 rounded-lg border border-rose-200/60">
                <span className="text-[10px] text-rose-800 block font-semibold">الأخطاء الحرجة (errorCount)</span>
                <span className="text-lg font-black text-rose-900">{activeBatch.errorCount}</span>
                <span className="text-[9px] text-rose-700 block">تمنع الاعتماد (Blocks Commit)</span>
              </div>
              <div className="bg-stone-100 p-2.5 rounded-lg border border-stone-200 flex flex-col justify-center">
                <span className="text-[10px] text-stone-500 block font-semibold">حالة الدفعة (status)</span>
                <div className="mt-1">
                  {activeBatch.status === 'COMMITTED' ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-black bg-emerald-600 text-white inline-flex items-center gap-1">
                      <Check className="w-3 h-3" /> COMMITTED
                    </span>
                  ) : activeBatch.errorCount > 0 ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-black bg-rose-600 text-white inline-flex items-center gap-1">
                      <Lock className="w-3 h-3" /> AWAITING_CORRECTION
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-xs font-black bg-amber-600 text-white inline-flex items-center gap-1">
                      <Unlock className="w-3 h-3" /> READY_TO_COMMIT
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. 12-STAGE PIPELINE VISUAL STEPPER */}
      <div className="bg-stone-900 text-white rounded-2xl p-5 shadow-md border border-stone-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-stone-800">
          <div>
            <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span>مسار المراحل الـ 12 الإلزامي (The 12-Stage Import Architecture)</span>
            </h3>
            <p className="text-xs text-stone-400 mt-0.5">
              يتوقف مسار الاستيراد حتمياً عند المرحلة التاسعة (التصحيح البشري) ولا يُسمح بالانتقال إلى المرحلة الـ 11 (الاعتماد) إلا بعد استيفاء الشروط.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-stone-800 text-stone-300 border border-stone-700">
              {isCommitted ? 'اكتملت جميع المراحل 12/12' : 'متوقف حالياً: المرحلة 9 (التصحيح والمراجعة البشرية)'}
            </span>
          </div>
        </div>

        {/* Stepper Steps Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12 gap-2">
          {pipelineStages.map((st) => {
            const isPassed = isCommitted || st.number <= 9;
            const isCurrent = !isCommitted && (st.number === 9 || st.number === 10);
            const isPending = !isCommitted && st.number > 10;
            const isPauseGate = st.number === 9;

            return (
              <div
                key={st.stage}
                className={`relative rounded-xl p-2.5 flex flex-col justify-between transition-all border ${
                  isCurrent
                    ? 'bg-amber-500/20 border-amber-400 text-white ring-2 ring-amber-400/40'
                    : isPassed
                    ? 'bg-stone-800/80 border-emerald-500/40 text-stone-200'
                    : 'bg-stone-800/40 border-stone-800 text-stone-500'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center ${
                      isCurrent 
                        ? 'bg-amber-400 text-stone-950 font-bold' 
                        : isPassed 
                        ? 'bg-emerald-500/20 text-emerald-400 font-bold' 
                        : 'bg-stone-700 text-stone-400'
                    }`}>
                      {st.number}
                    </span>
                    {isCurrent ? (
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    ) : isPassed ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Lock className="w-3 h-3 text-stone-600" />
                    )}
                  </div>
                  <div className="font-bold text-[11px] leading-tight mt-1">{st.nameAr}</div>
                  <div className="text-[9px] text-stone-400 font-mono mt-0.5">{st.desc}</div>
                </div>

                {isPauseGate && !isCommitted && (
                  <div className="mt-2 pt-1 border-t border-amber-400/30 text-[9px] text-amber-300 font-bold flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>نقطة توقف إلزامية</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. COMMIT STATUS & PRE-COMMIT ENFORCEMENT BANNER */}
      {!isCommitted ? (
        <div className={`p-5 rounded-2xl border text-right transition-all ${
          hasCritical 
            ? 'bg-rose-50 border-rose-200 text-rose-950'
            : hasWarnings
            ? 'bg-amber-50 border-amber-200 text-amber-950'
            : 'bg-emerald-50 border-emerald-200 text-emerald-950'
        }`}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-start gap-3">
              {hasCritical ? (
                <div className="p-2.5 rounded-xl bg-rose-600 text-white shrink-0 mt-0.5">
                  <Lock className="w-6 h-6" />
                </div>
              ) : hasWarnings ? (
                <div className="p-2.5 rounded-xl bg-amber-600 text-white shrink-0 mt-0.5">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-emerald-600 text-white shrink-0 mt-0.5">
                  <ShieldCheck className="w-6 h-6" />
                </div>
              )}
              <div>
                <h4 className="text-base font-black">
                  {hasCritical ? (
                    <span>يمنع تنفيذ الاعتماد (Commit Blocked) — يوجد ({activeBatch.errorCount}) أخطاء حرجة (CRITICAL)</span>
                  ) : hasWarnings ? (
                    <span>جاهز للاعتماد مع اشتراط التأكيد — يوجد ({activeBatch.warningCount}) تحذيرات (WARNING)</span>
                  ) : (
                    <span>جاهز للاعتماد الفوري — جميع الصفوف مطابقة ومستوفية للشروط بنسبة 100%</span>
                  )}
                </h4>
                <p className="text-xs mt-1 leading-relaxed opacity-90">
                  {hasCritical ? (
                    <span>
                      النظام يمنع كتابة أي سجل إلى قاعدة البيانات حتى معالجة جميع التعارضات الحرجة (مثل تعارض تبعية الشاحنة، أو ناقل غير مرخص في المشروع، أو أوزان غير متطابقة). يمكنك تعديل القيمة أو اختيار سجل مرجعي أو استبعاد الصفوف المتعثرة.
                    </span>
                  ) : hasWarnings ? (
                    <span>
                      تم حل جميع الأخطاء الحرجة. السجلات المتبقية تحوي تحذيرات فقط (مثل تطابق تقريبي للأسماء). يتطلب النظام تأكيداً بشرياً صريحاً قبل إتمام الـ Commit.
                    </span>
                  ) : (
                    <span>
                      اجتازت الدفعة جميع مراحل التدقيق والتحقق. يمكنك النقر على زر الاعتماد لترحيل السجلات وإنشاء سجل التدقيق الرقابي.
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Enforcement Action Buttons */}
            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
              {hasCritical && (
                <button
                  onClick={handleRejectAllCriticalRows}
                  className="px-3.5 py-2 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-900 border border-rose-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <X className="w-4 h-4 text-rose-700" />
                  <span>استبعاد كافة الصفوف الحرجة ({activeBatch.errorCount})</span>
                </button>
              )}

              <button
                disabled={hasCritical}
                onClick={() => handleCommitBatch(false)}
                className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all shadow-md flex items-center gap-2 ${
                  hasCritical
                    ? 'bg-stone-300 text-stone-500 cursor-not-allowed border border-stone-300'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-98'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>تنفيذ الاعتماد النهائي (Commit Batch)</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-600 text-white">
              <Check className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-black">
                تم اعتماد الدفعة بنجاح (Batch Committed)
              </h4>
              <p className="text-xs text-emerald-800 mt-0.5">
                تم ترحيل ({activeBatch.committedRecordCount}) سجل بنجاح وحفظ النسخة الأصلية للبيانات في أرشيف التدقيق الرقابي في ({new Date(activeBatch.committedAt || '').toLocaleString('ar-SA')}).
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAuditTrailModal(true)}
            className="px-4 py-2 rounded-xl bg-white border border-emerald-300 text-emerald-900 text-xs font-bold shadow-xs hover:bg-emerald-100 transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <History className="w-4 h-4 text-emerald-700" />
            <span>عرض وثيقة التدقيق الصادرة</span>
          </button>
        </div>
      )}

      {/* 5. REVIEW TABLE SECTION */}
      <div className="bg-white border border-stone-200/80 rounded-2xl p-5 sm:p-6 shadow-xs">
        {/* Table Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 mb-4 border-b border-stone-100">
          <div>
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-amber-600" />
              <span>جدول مراجعة وتصحيح الحقول (Human Review & Correction Table)</span>
            </h3>
            <p className="text-xs text-stone-500">
              قم بمراجعة الاقتراحات واتخاذ القرارات التصحيحية لكل حقل (قبول الاقتراح، الإبقاء على الأصل، اختيار سجل معتمد، تعديل يدوي، أو رفض الصف).
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Bulk Action */}
            {!isCommitted && (
              <button
                onClick={handleBulkAccept}
                className="px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>قبول كافة الاقتراحات الموثوقة ({'>'}80%)</span>
              </button>
            )}

            {/* Severity Filter Tabs */}
            <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200 text-xs">
              <button
                onClick={() => setSelectedSeverityFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  selectedSeverityFilter === 'ALL' ? 'bg-stone-900 text-white shadow-xs' : 'text-stone-700'
                }`}
              >
                الكل ({activeBatch.reviewItems.length})
              </button>
              <button
                onClick={() => setSelectedSeverityFilter('CRITICAL')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  selectedSeverityFilter === 'CRITICAL' ? 'bg-rose-600 text-white shadow-xs' : 'text-rose-800'
                }`}
              >
                حرجة ({activeBatch.reviewItems.filter((i) => i.severity === 'CRITICAL').length})
              </button>
              <button
                onClick={() => setSelectedSeverityFilter('WARNING')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  selectedSeverityFilter === 'WARNING' ? 'bg-amber-600 text-white shadow-xs' : 'text-amber-800'
                }`}
              >
                تحذيرات ({activeBatch.reviewItems.filter((i) => i.severity === 'WARNING').length})
              </button>
              <button
                onClick={() => setSelectedSeverityFilter('INFO')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  selectedSeverityFilter === 'INFO' ? 'bg-sky-600 text-white shadow-xs' : 'text-sky-800'
                }`}
              >
                معلومات ({activeBatch.reviewItems.filter((i) => i.severity === 'INFO').length})
              </button>
            </div>
          </div>
        </div>

        {/* Search input */}
        <div className="mb-4">
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="البحث برقم الصف، أو اسم الحقل، أو القيمة، أو المشكلة..."
              className="w-full text-xs pr-9 pl-4 py-2 rounded-xl border border-stone-200 bg-stone-50/60 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-medium"
            />
          </div>
        </div>

        {/* 6. EXACT REQUESTED REVIEW TABLE */}
        <div className="overflow-x-auto border border-stone-200 rounded-xl">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-stone-100/80 text-stone-700 font-bold border-b border-stone-200">
                <th className="py-3 px-3 w-14">Row</th>
                <th className="py-3 px-3 w-36">Field</th>
                <th className="py-3 px-3 min-w-[140px]">Original Value</th>
                <th className="py-3 px-3 min-w-[150px]">Suggested Value</th>
                <th className="py-3 px-3 w-28 text-center">Confidence</th>
                <th className="py-3 px-3 min-w-[220px]">Issue</th>
                <th className="py-3 px-3 w-24 text-center">Severity</th>
                <th className="py-3 px-3 min-w-[200px] text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredReviewItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-stone-400">
                    لا توجد عناصر مراجعة مطابقة للفلتر المحدد.
                  </td>
                </tr>
              ) : (
                filteredReviewItems.map((item) => {
                  const isRowRejected = item.rowStatus === 'REJECTED';

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-stone-50/80 transition-colors ${
                        isRowRejected
                          ? 'bg-stone-100/70 opacity-60'
                          : item.severity === 'CRITICAL' && item.action === 'KEEP_ORIGINAL'
                          ? 'bg-rose-50/40'
                          : item.severity === 'CRITICAL'
                          ? 'bg-rose-50/20'
                          : item.severity === 'WARNING'
                          ? 'bg-amber-50/20'
                          : ''
                      }`}
                    >
                      {/* 1. Row */}
                      <td className="py-3 px-3 font-mono font-bold text-stone-600">
                        #{item.rowNumber}
                      </td>

                      {/* 2. Field */}
                      <td className="py-3 px-3 font-bold text-stone-800">
                        {item.field}
                      </td>

                      {/* 3. Original Value */}
                      <td className="py-3 px-3 text-stone-900 font-medium">
                        <div className="font-mono bg-stone-100 px-2 py-1 rounded inline-block">
                          {item.originalValue || <span className="text-stone-400 italic">فارغ</span>}
                        </div>
                      </td>

                      {/* 4. Suggested Value */}
                      <td className="py-3 px-3 font-semibold">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-amber-900 font-mono bg-amber-50 px-2 py-1 rounded border border-amber-200/60">
                            {item.manualValue || item.chosenMasterValue || item.suggestedValue}
                          </span>
                          {item.manualValue && (
                            <span className="text-[10px] text-sky-700 bg-sky-50 px-1 rounded font-bold">مخصص</span>
                          )}
                          {item.chosenMasterValue && (
                            <span className="text-[10px] text-purple-700 bg-purple-50 px-1 rounded font-bold">معتمد</span>
                          )}
                        </div>
                      </td>

                      {/* 5. Confidence */}
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded-full text-xs bg-stone-100 text-stone-800 border border-stone-200">
                          <span className={item.confidence >= 80 ? 'text-emerald-700' : item.confidence >= 50 ? 'text-amber-700' : 'text-stone-600'}>
                            {item.confidence}%
                          </span>
                        </div>
                      </td>

                      {/* 6. Issue */}
                      <td className="py-3 px-3 text-stone-700 text-xs">
                        <div className="leading-relaxed">
                          {item.issue}
                        </div>
                      </td>

                      {/* 7. Severity */}
                      <td className="py-3 px-3 text-center">
                        {getSeverityBadge(item.severity)}
                      </td>

                      {/* 8. Action (Drop-down or Select with all required actions) */}
                      <td className="py-3 px-3">
                        <div className="flex flex-col gap-1.5">
                          {getActionBadge(item.action, item.rowStatus)}

                          {!isCommitted && (
                            <div className="flex items-center gap-1 flex-wrap mt-1">
                              {/* 1. Accept Suggestion */}
                              {item.confidence > 0 && (
                                <button
                                  onClick={() => handleApplyAction(item.id, 'ACCEPT_SUGGESTION')}
                                  title="Accept Suggestion (قبول الاقتراح)"
                                  className="px-2 py-1 text-[10px] font-bold rounded bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 cursor-pointer"
                                >
                                  قبول الاقتراح
                                </button>
                              )}

                              {/* 2. Keep Original */}
                              <button
                                onClick={() => handleApplyAction(item.id, 'KEEP_ORIGINAL')}
                                title="Keep Original (الإبقاء على الأصل)"
                                className="px-2 py-1 text-[10px] font-bold rounded bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200 cursor-pointer"
                              >
                                إبقاء الأصل
                              </button>

                              {/* 3. Choose Master Record */}
                              <button
                                onClick={() => setSelectingMasterItem(item)}
                                title="Choose Master Record (اختيار سجل مرجعي)"
                                className="px-2 py-1 text-[10px] font-bold rounded bg-purple-50 text-purple-900 hover:bg-purple-100 border border-purple-200 cursor-pointer"
                              >
                                اختيار معتمد...
                              </button>

                              {/* 4. Edit Manually */}
                              <button
                                onClick={() => {
                                  setEditingItem(item);
                                  setManualInputValue(item.manualValue || item.suggestedValue || item.originalValue);
                                }}
                                title="Edit Manually (تعديل يدوي)"
                                className="px-2 py-1 text-[10px] font-bold rounded bg-sky-50 text-sky-900 hover:bg-sky-100 border border-sky-200 cursor-pointer"
                              >
                                تعديل يدوي...
                              </button>

                              {/* 5. Ignore */}
                              <button
                                onClick={() => handleApplyAction(item.id, 'IGNORE')}
                                title="Ignore (تجاهل)"
                                className="px-2 py-1 text-[10px] font-bold rounded bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-200 cursor-pointer"
                              >
                                تجاهل
                              </button>

                              {/* 6. Reject Row */}
                              <button
                                onClick={() => handleApplyAction(item.id, 'REJECT_ROW')}
                                title="Reject Row (استبعاد الصف)"
                                className="px-2 py-1 text-[10px] font-bold rounded bg-rose-50 text-rose-900 hover:bg-rose-100 border border-rose-200 cursor-pointer"
                              >
                                رفض الصف
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 7. MODAL: Upload New File */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-stone-200 text-right animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-100 text-amber-800">
                  <UploadCloud className="w-5 h-5" />
                </span>
                <h4 className="text-base font-bold text-stone-900">
                  رفع ملف استيراد جديد (Import Center Upload)
                </h4>
              </div>
              <button 
                onClick={() => setShowUploadModal(false)}
                className="text-stone-400 hover:text-stone-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  اسم الملف المصدر
                </label>
                <input
                  type="text"
                  value={uploadedFileName}
                  onChange={(e) => setUploadedFileName(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  محتوى البيانات (CSV أو مفصول بفواصل/جدولة)
                </label>
                <textarea
                  rows={8}
                  value={rawUploadText}
                  onChange={(e) => setRawUploadText(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 font-mono text-left dir-ltr bg-stone-50"
                  dir="ltr"
                />
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-600">
                <span className="font-bold block mb-1">سلوك مسار المعالجة:</span>
                <p>
                  سيقوم النظام بتنفيذ المراحل من 1 إلى 8 تلقائياً (تفكيك الأعمدة، المعايرة، المطابقة، كشف التكرار)، ثم سيتوقف إلزامياً عند المرحلة التاسعة (التصحيح البشري) لعرض جدول المراجعة قبل الاعتماد.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-stone-100">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100"
              >
                إلغاء
              </button>
              <button
                disabled={isAnalyzing}
                onClick={handleStartImport}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer"
              >
                {isAnalyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                <span>بدء مسار الاستيراد والفحص (Start Pipeline)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. MODAL: Raw Data Snapshot Viewer (Audit Retention) */}
      {showRawSnapshotModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-stone-200 text-right animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-stone-100 shrink-0">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-sky-100 text-sky-800">
                  <Database className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="text-base font-bold text-stone-900">
                    النسخة الأصلية للبيانات المستوردة (Raw Data Snapshot)
                  </h4>
                  <p className="text-xs text-stone-500">
                    محفوظة بالكامل داخل Import Batch لأغراض التدقيق الرقابي والامتثال الحكومي.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowRawSnapshotModal(false)}
                className="text-stone-400 hover:text-stone-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto border border-stone-200 rounded-xl">
              <pre className="text-xs font-mono p-4 bg-stone-900 text-amber-300 dir-ltr text-left overflow-x-auto">
                {JSON.stringify(activeBatch.originalRawData, null, 2)}
              </pre>
            </div>

            <div className="flex items-center justify-between pt-4 mt-4 border-t border-stone-100 shrink-0">
              <span className="text-xs text-stone-500">
                إجمالي السجلات الأصلية المؤرشفة: {activeBatch.originalRawData.length} سجل
              </span>
              <button
                onClick={() => {
                  const blob = new Blob([JSON.stringify(activeBatch.originalRawData, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `raw_snapshot_${activeBatch.importBatchId}.json`;
                  a.click();
                }}
                className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>تحميل النسخة الأصلية (JSON)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. MODAL: Audit Trail */}
      {showAuditTrailModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-stone-200 text-right animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-stone-100 shrink-0">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-100 text-amber-800">
                  <History className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="text-base font-bold text-stone-900">
                    سجل التدقيق الرقابي للدفعة (Audit Trail Log)
                  </h4>
                  <p className="text-xs text-stone-500">
                    يوثق كل إجراء بشري، قرار تصحيحي، وتاريخ الاعتماد النهائي مع هوية المستخدم.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowAuditTrailModal(false)}
                className="text-stone-400 hover:text-stone-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto space-y-3">
              {activeBatch.auditTrail.map((log, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-stone-900 font-mono">{log.actionType}</span>
                    <span className="text-[11px] text-stone-500 font-mono">
                      {new Date(log.timestamp).toLocaleString('ar-SA')}
                    </span>
                  </div>
                  <p className="text-stone-700 leading-relaxed">{log.detailsAr}</p>
                  <div className="mt-2 pt-2 border-t border-stone-200/60 flex items-center justify-between text-[11px] text-stone-500">
                    <span>المستخدم: {log.userName}</span>
                    {log.affectedRowNumber && <span>الصف المتأثر: #{log.affectedRowNumber}</span>}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-4 mt-4 border-t border-stone-100 shrink-0">
              <button
                onClick={() => setShowAuditTrailModal(false)}
                className="px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-bold"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. MODAL: Warning Confirmation Dialog */}
      {showWarningConfirmModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 text-right animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-100 text-amber-900">
                  <AlertTriangle className="w-5 h-5 text-amber-700" />
                </span>
                <h4 className="text-base font-bold text-stone-900">
                  تأكيد اعتماد السجلات ذات التحذيرات (WARNING Confirmation)
                </h4>
              </div>
              <button 
                onClick={() => setShowWarningConfirmModal(false)}
                className="text-stone-400 hover:text-stone-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-stone-700">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-950">
                <span className="font-bold block mb-1">تنبيه رقابي إلزامي:</span>
                <p className="leading-relaxed">
                  توجد <strong>({activeBatch.warningCount})</strong> تحذيرات في هذه الدفعة. لائحة حوكمة البيانات تتطلب إقراراً وتأكيداً بشرياً صريحاً قبل إتمام الاعتماد (Commit).
                </p>
              </div>

              <div>
                <label className="block font-bold text-stone-800 mb-1.5">
                  مبررات الاعتماد وملاحظات التدقيق (Audit Notes)
                </label>
                <textarea
                  rows={3}
                  value={warningConfirmNotes}
                  onChange={(e) => setWarningConfirmNotes(e.target.value)}
                  placeholder="اكتب سبب قبول هذه التحذيرات (مثال: تم التأكد من هوية السائق ورقياً، أو تم التنسيق مع مقاول النقل)..."
                  className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 font-medium"
                />
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-[11px] text-stone-600">
                <span>المسؤول المعتمد: </span>
                <strong className="text-stone-900">{currentUserName}</strong>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-stone-100">
              <button
                onClick={() => setShowWarningConfirmModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100"
              >
                إلغاء
              </button>
              <button
                onClick={() => handleCommitBatch(true)}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>تأكيد واعتماد الدفعة نهائياً</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 11. MODAL: Choose Master Record */}
      {selectingMasterItem && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 text-right animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-purple-100 text-purple-900">
                  <Database className="w-5 h-5" />
                </span>
                <h4 className="text-base font-bold text-stone-900">
                  اختيار سجل معتمد (Choose Master Record)
                </h4>
              </div>
              <button 
                onClick={() => setSelectingMasterItem(null)}
                className="text-stone-400 hover:text-stone-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-stone-600">
                حدد الكيان المعتمد لربطه بالحقل <strong>[{selectingMasterItem.field}]</strong> في الصف #{selectingMasterItem.rowNumber}:
              </p>

              <div className="max-h-60 overflow-y-auto space-y-2">
                {selectingMasterItem.fieldKey === 'carrier' && (
                  SAMPLE_QUALITY_CONTEXT.knownCarriers.map((c) => (
                    <button
                      key={c.carrierId}
                      onClick={() => {
                        handleApplyAction(selectingMasterItem.id, 'CHOOSE_MASTER_RECORD', {
                          chosenMasterId: c.carrierId,
                          chosenMasterValue: c.name,
                        });
                        setSelectingMasterItem(null);
                      }}
                      className="w-full text-right p-3 rounded-xl border border-stone-200 hover:border-purple-400 hover:bg-purple-50/50 transition-all text-xs font-semibold block cursor-pointer"
                    >
                      <div className="font-bold text-stone-900">{c.name}</div>
                      <div className="text-[10px] text-stone-500 mt-0.5 font-mono">
                        {c.carrierId} {SAMPLE_QUALITY_CONTEXT.authorizedCarrierIds.includes(c.carrierId) ? '✓ مصرح في المشروع' : '✗ غير مصرح'}
                      </div>
                    </button>
                  ))
                )}

                {selectingMasterItem.fieldKey === 'truck' && (
                  SAMPLE_QUALITY_CONTEXT.knownTrucks.map((t) => (
                    <button
                      key={t.truckId}
                      onClick={() => {
                        handleApplyAction(selectingMasterItem.id, 'CHOOSE_MASTER_RECORD', {
                          chosenMasterId: t.truckId,
                          chosenMasterValue: t.plate,
                        });
                        setSelectingMasterItem(null);
                      }}
                      className="w-full text-right p-3 rounded-xl border border-stone-200 hover:border-purple-400 hover:bg-purple-50/50 transition-all text-xs font-semibold block cursor-pointer"
                    >
                      <div className="font-bold text-stone-900">{t.plate}</div>
                      <div className="text-[10px] text-stone-500 mt-0.5 font-mono">
                        {t.truckId} | الناقل: {t.carrierId}
                      </div>
                    </button>
                  ))
                )}

                {selectingMasterItem.fieldKey === 'material' && (
                  SAMPLE_QUALITY_CONTEXT.knownMaterials.map((m) => (
                    <button
                      key={m.materialId}
                      onClick={() => {
                        handleApplyAction(selectingMasterItem.id, 'CHOOSE_MASTER_RECORD', {
                          chosenMasterId: m.materialId,
                          chosenMasterValue: m.name,
                        });
                        setSelectingMasterItem(null);
                      }}
                      className="w-full text-right p-3 rounded-xl border border-stone-200 hover:border-purple-400 hover:bg-purple-50/50 transition-all text-xs font-semibold block cursor-pointer"
                    >
                      <div className="font-bold text-stone-900">{m.name}</div>
                      <div className="text-[10px] text-stone-500 mt-0.5 font-mono">
                        {m.code} {SAMPLE_QUALITY_CONTEXT.authorizedMaterialIds.includes(m.materialId) ? '✓ مصرح' : '✗ غير مصرح'}
                      </div>
                    </button>
                  ))
                )}

                {selectingMasterItem.fieldKey === 'driver' && (
                  SAMPLE_QUALITY_CONTEXT.knownDrivers.map((d) => (
                    <button
                      key={d.driverId}
                      onClick={() => {
                        handleApplyAction(selectingMasterItem.id, 'CHOOSE_MASTER_RECORD', {
                          chosenMasterId: d.driverId,
                          chosenMasterValue: d.name,
                        });
                        setSelectingMasterItem(null);
                      }}
                      className="w-full text-right p-3 rounded-xl border border-stone-200 hover:border-purple-400 hover:bg-purple-50/50 transition-all text-xs font-semibold block cursor-pointer"
                    >
                      <div className="font-bold text-stone-900">{d.name}</div>
                      <div className="text-[10px] text-stone-500 mt-0.5 font-mono">
                        {d.driverId} | كفالة: {d.carrierId}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 12. MODAL: Edit Manually */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 text-right animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-sky-100 text-sky-900">
                  <Edit3 className="w-5 h-5" />
                </span>
                <h4 className="text-base font-bold text-stone-900">
                  تعديل القيمة يدوياً (Edit Manually)
                </h4>
              </div>
              <button 
                onClick={() => setEditingItem(null)}
                className="text-stone-400 hover:text-stone-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <span className="text-stone-500 block mb-1">الحقل والصف:</span>
                <span className="font-bold text-stone-900">{editingItem.field} — الصف #{editingItem.rowNumber}</span>
              </div>

              <div>
                <span className="text-stone-500 block mb-1">القيمة الأصلية:</span>
                <span className="font-mono bg-stone-100 px-2 py-1 rounded block">{editingItem.originalValue}</span>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  القيمة المعدلة الجديدة:
                </label>
                <input
                  type="text"
                  value={manualInputValue}
                  onChange={(e) => setManualInputValue(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 font-bold focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-stone-100">
              <button
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  handleApplyAction(editingItem.id, 'EDIT_MANUALLY', {
                    manualValue: manualInputValue,
                  });
                  setEditingItem(null);
                }}
                className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                حفظ التعديل
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
