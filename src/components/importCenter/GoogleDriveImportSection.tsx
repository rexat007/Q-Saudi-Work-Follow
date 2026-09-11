import React, { useState, useEffect, useMemo } from 'react';
import {
  HardDrive,
  FileSpreadsheet,
  FileText,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Filter,
  Check,
  X,
  Eye,
  Layers,
  Sparkles,
  HelpCircle,
  SlidersHorizontal,
  ExternalLink,
  Folder,
  Lock,
  Database,
} from 'lucide-react';
import { GoogleDrivePipelineService } from '../../services/import/googleDrivePipeline.service';
import { clientWorkspaceService } from '../../services/workspace.service';
import {
  UnifiedImportBatch,
  PipelineContext,
  ImportResult,
  ImportRow,
} from '../../types/unifiedImport';
import { ColumnMappingMatch } from '../../types/excelCsvImport';
import { GoogleDriveFileItem } from '../../types/googleDriveImport';
import {
  runGoogleDriveImportTests,
  GoogleDriveTestCaseResult,
} from '../../tests/googleDriveImport.test';

interface GoogleDriveImportSectionProps {
  currentProjectId?: string;
  userId?: string;
  userName?: string;
  onCommitSuccess?: (result: ImportResult) => void;
}

export function GoogleDriveImportSection({
  currentProjectId = 'PRJ-NEOM-NORTH-01',
  userId = 'usr_admin_01',
  userName = 'مدير العمليات (مشروع نيوم)',
  onCommitSuccess,
}: GoogleDriveImportSectionProps) {
  // Drive browser state
  const [driveFiles, setDriveFiles] = useState<GoogleDriveFileItem[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(true);
  const [fileListError, setFileListError] = useState<string | null>(null);
  const [folderName, setFolderName] = useState<string>('imported files');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [formatFilter, setFormatFilter] = useState<'ALL' | 'EXCEL' | 'CSV'>('ALL');

  // Selected file state
  const [selectedFileMeta, setSelectedFileMeta] = useState<GoogleDriveFileItem | null>(null);
  const [downloadedBuffer, setDownloadedBuffer] = useState<ArrayBuffer | null>(null);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');

  // Pipeline Batch state
  const [activeBatch, setActiveBatch] = useState<UnifiedImportBatch | null>(null);
  const [columnMappings, setColumnMappings] = useState<Record<string, ColumnMappingMatch>>({});
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processError, setProcessError] = useState<string | null>(null);

  // Review & Commit state
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'VALID' | 'WARNING' | 'ERROR' | 'REQUIRES_REVIEW'>('ALL');
  const [confirmWarnings, setConfirmWarnings] = useState<boolean>(false);
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [commitResult, setCommitResult] = useState<ImportResult | null>(null);
  const [showMappingDrawer, setShowMappingDrawer] = useState<boolean>(false);

  // Automated Test Suite State
  const [testResults, setTestResults] = useState<{
    ran: boolean;
    allPassed: boolean;
    total: number;
    passed: number;
    failed: number;
    results: GoogleDriveTestCaseResult[];
  } | null>(null);
  const [isRunningTests, setIsRunningTests] = useState<boolean>(false);
  const [showTestPanel, setShowTestPanel] = useState<boolean>(false);

  const runAutomatedTests = async () => {
    setIsRunningTests(true);
    setShowTestPanel(true);
    try {
      const res = await runGoogleDriveImportTests();
      setTestResults({
        ran: true,
        allPassed: res.allPassed,
        total: res.total,
        passed: res.passed,
        failed: res.failed,
        results: res.results,
      });
    } catch (err: any) {
      console.error('Error running Google Drive tests:', err);
    } finally {
      setIsRunningTests(false);
    }
  };

  const context: PipelineContext = {
    projectId: currentProjectId,
    userId,
    userName,
    role: 'PROJECT_ADMIN',
    operationId: `OP-GDRV-${Date.now()}`,
    allowWarningsCommit: confirmWarnings,
    knownEntities: {
      carrierIds: [
        'CARRIER-01',
        'الشركة الشرقية للنقل',
        'مؤسسة الرمال السريعة',
        'شركة نقليات الرياض',
        'الناقل العام',
      ],
      truckPlates: ['1010-أ ب ج', '2020-د هـ و', '3030-س ص ع', '4040-ق ك ل'],
      driverIds: ['محمد أحمد', 'علي حسن', 'سعيد الغامدي', 'عمر المطيري'],
      materialCodes: ['AGG-01', 'ركام ناعم 0-5 مم', 'ركام خشن 10-20 مم', 'دفان معتمد', 'حصى وادي'],
    },
    existingKeys: new Set(['TKT-OLD-999', 'TKT-EXISTING-001']),
  };

  // Fetch Drive Files for current project
  const loadDriveFiles = async () => {
    setIsLoadingFiles(true);
    setFileListError(null);
    try {
      const res = await clientWorkspaceService.listDriveImportFiles(currentProjectId);
      setDriveFiles(res.files || []);
      if (res.folderName) setFolderName(res.folderName);
    } catch (err: any) {
      setFileListError(err?.message || 'فشل في استعراض ملفات Google Drive');
    } finally {
      setIsLoadingFiles(false);
    }
  };

  useEffect(() => {
    loadDriveFiles();
  }, [currentProjectId]);

  // Filtered Drive files in browser
  const filteredFiles = useMemo(() => {
    return driveFiles.filter((file) => {
      if (formatFilter !== 'ALL' && file.format !== formatFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return file.name.toLowerCase().includes(q);
      }
      return true;
    });
  }, [driveFiles, formatFilter, searchQuery]);

  // Handle selecting and downloading file from Google Drive
  const handleSelectDriveFile = async (file: GoogleDriveFileItem) => {
    setSelectedFileMeta(file);
    setProcessError(null);
    setActiveBatch(null);
    setCommitResult(null);
    setConfirmWarnings(false);
    setIsDownloading(true);

    try {
      const { buffer } = await clientWorkspaceService.downloadDriveFileContent(file.id);
      setDownloadedBuffer(buffer);

      let sheets: string[] = [];
      let defaultSheet = '';

      if (file.format === 'EXCEL') {
        sheets = GoogleDrivePipelineService.getExcelSheets(buffer);
        setAvailableSheets(sheets);
        defaultSheet = sheets.length > 0 ? sheets[0] : '';
        setSelectedSheet(defaultSheet);
      } else {
        setAvailableSheets([]);
        setSelectedSheet('');
      }

      // Execute pipeline intake
      await runPipeline(buffer, file, defaultSheet);
    } catch (err: any) {
      setProcessError(err?.message || 'فشل في تحميل ومعالجة ملف Google Drive');
    } finally {
      setIsDownloading(false);
    }
  };

  const runPipeline = async (
    buffer: ArrayBuffer,
    fileMeta: GoogleDriveFileItem,
    sheetName?: string
  ) => {
    try {
      setIsProcessing(true);
      setProcessError(null);

      const batch = await GoogleDrivePipelineService.processDriveFileToReview(
        buffer,
        fileMeta,
        context,
        { sheetName }
      );

      setActiveBatch(batch);

      // Inspect column mappings
      if (batch.rows.length > 0 && batch.rows[0].raw) {
        const rawHeaders = Object.keys(batch.rows[0].raw).filter((k) => !k.startsWith('_'));
        const mappings = GoogleDrivePipelineService.inspectColumnMappings(rawHeaders);
        setColumnMappings(mappings);
      }
    } catch (err: any) {
      setProcessError(err?.message || 'حدث خطأ أثناء فحص وتحليل الملف');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSheetChange = async (newSheet: string) => {
    setSelectedSheet(newSheet);
    if (downloadedBuffer && selectedFileMeta) {
      await runPipeline(downloadedBuffer, selectedFileMeta, newSheet);
    }
  };

  const handleApplyRowAction = (
    rowNumber: number,
    action: 'ACCEPT_WARNING' | 'REJECT_ROW'
  ) => {
    if (!activeBatch) return;
    const updated = GoogleDrivePipelineService.applyRowReview(
      activeBatch,
      rowNumber,
      action,
      context,
      action === 'ACCEPT_WARNING' ? 'قبول يدوي من مراجع Google Drive' : 'استبعاد السطر يدوياً'
    );
    setActiveBatch(updated);
  };

  const handleCommit = async () => {
    if (!activeBatch) return;

    try {
      setIsCommitting(true);
      setProcessError(null);

      const { batch: finalBatch, result } = await GoogleDrivePipelineService.commitBatch(
        activeBatch,
        {
          ...context,
          allowWarningsCommit: confirmWarnings,
        }
      );

      setActiveBatch(finalBatch);
      setCommitResult(result);

      if (result.success && onCommitSuccess) {
        onCommitSuccess(result);
      }
    } catch (err: any) {
      setProcessError(err?.message || 'حدث خطأ أثناء اعتماد الدفعة');
    } finally {
      setIsCommitting(false);
    }
  };

  const filteredRows = useMemo(() => {
    if (!activeBatch) return [];
    return activeBatch.rows.filter((r) => {
      if (filterStatus === 'ALL') return true;
      if (filterStatus === 'VALID') return r.status === 'VALID';
      if (filterStatus === 'WARNING') return r.status === 'WARNING';
      if (filterStatus === 'ERROR') return r.status === 'ERROR';
      if (filterStatus === 'REQUIRES_REVIEW') return r.reviewStatus === 'requires_review';
      return true;
    });
  }, [activeBatch, filterStatus]);

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6" id="google-drive-import-section">
      {/* 1. Header Banner */}
      <div className="bg-white border border-stone-200/90 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-700 flex items-center justify-center shrink-0 shadow-xs">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black tracking-tight text-stone-900">
                  استيراد ملفات Google Drive (BLOCK 32)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-200">
                  Google Drive Source
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Reuses Unified Pipeline (BLOCK 30)
                </span>
              </div>
              <p className="text-xs sm:text-sm text-stone-600 mt-1">
                تصفح واختيار ملفات Excel و CSV من مجلد المشروع في Google Drive ثم تمريرها إلى مسار التدقيق الموحد بدون أي كتابة في قاعدة البيانات قبل الاعتماد.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 border border-stone-200 text-xs font-semibold text-stone-700">
              <Folder className="w-3.5 h-3.5 text-blue-600" />
              <span>المجلد: {folderName}</span>
            </div>
            <button
              onClick={runAutomatedTests}
              disabled={isRunningTests}
              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isRunningTests ? 'animate-spin' : ''}`} />
              <span>فحص واختبارات BLOCK 32</span>
            </button>
            <button
              onClick={loadDriveFiles}
              disabled={isLoadingFiles}
              className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFiles ? 'animate-spin' : ''}`} />
              <span>تحديث الملفات</span>
            </button>
          </div>
        </div>
      </div>

      {/* Automated Tests Result Panel */}
      {showTestPanel && testResults && (
        <div className="bg-white border border-purple-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-purple-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center font-black">
                ✓
              </div>
              <div>
                <h3 className="text-sm font-black text-stone-900">
                  نتائج اختبارات تكامل Google Drive (BLOCK 32 Verification Suite)
                </h3>
                <p className="text-xs text-stone-600">
                  {testResults.allPassed
                    ? `اجتازت جميع الفحوصات (${testResults.passed} من ${testResults.total}) بنجاح تام وبدون أي أخطاء.`
                    : `فشلت بعض الفحوصات (${testResults.failed} من ${testResults.total}).`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-black ${
                  testResults.allPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}
              >
                {testResults.passed} / {testResults.total} ناجح
              </span>
              <button
                onClick={() => setShowTestPanel(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {testResults.results.map((t) => (
              <div
                key={t.id}
                className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                  t.passed
                    ? 'bg-emerald-50/40 border-emerald-200 text-emerald-950'
                    : 'bg-rose-50/50 border-rose-200 text-rose-950'
                }`}
              >
                {t.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-0.5 flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-bold text-stone-500">{t.id}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        t.passed ? 'bg-emerald-200/60 text-emerald-900' : 'bg-rose-200 text-rose-900'
                      }`}
                    >
                      {t.passed ? 'PASSED' : 'FAILED'}
                    </span>
                  </div>
                  <h5 className="font-bold text-stone-900 truncate" title={t.name}>
                    {t.name}
                  </h5>
                  <p className="text-[11px] text-stone-600">{t.notes}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Drive Files Browser & Picker */}
      <div className="bg-white border border-stone-200/90 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-blue-600" />
              <span>الملفات المتاحة في Google Drive للمشروع ({currentProjectId})</span>
            </h3>
            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-stone-100 text-stone-600">
              {filteredFiles.length} ملف
            </span>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute right-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث باسم الملف..."
                className="pr-8 pl-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-stone-400 w-48"
              />
            </div>

            <div className="flex items-center border border-stone-200 rounded-lg p-0.5 bg-stone-50 text-xs">
              <button
                onClick={() => setFormatFilter('ALL')}
                className={`px-2 py-1 rounded-md font-semibold transition-all ${
                  formatFilter === 'ALL' ? 'bg-white shadow-xs text-stone-900' : 'text-stone-600'
                }`}
              >
                الكل
              </button>
              <button
                onClick={() => setFormatFilter('EXCEL')}
                className={`px-2 py-1 rounded-md font-semibold transition-all ${
                  formatFilter === 'EXCEL' ? 'bg-white shadow-xs text-emerald-800' : 'text-stone-600'
                }`}
              >
                Excel
              </button>
              <button
                onClick={() => setFormatFilter('CSV')}
                className={`px-2 py-1 rounded-md font-semibold transition-all ${
                  formatFilter === 'CSV' ? 'bg-white shadow-xs text-blue-800' : 'text-stone-600'
                }`}
              >
                CSV
              </button>
            </div>
          </div>
        </div>

        {/* Files Grid / List */}
        {isLoadingFiles ? (
          <div className="py-12 text-center text-stone-500 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
            <p className="text-xs">جاري فحص واسترجاع ملفات Google Drive...</p>
          </div>
        ) : fileListError ? (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{fileListError}</span>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="py-10 text-center text-stone-500 space-y-1">
            <Folder className="w-8 h-8 mx-auto text-stone-300" />
            <p className="text-xs font-bold text-stone-700">لا توجد ملفات متوافقة في المجلد</p>
            <p className="text-[11px] text-stone-500">
              تأكد من وجود ملفات بصيغة .xlsx أو .xls أو .csv في مجلد المشروع.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredFiles.map((file) => {
              const isSelected = selectedFileMeta?.id === file.id;
              return (
                <div
                  key={file.id}
                  className={`p-4 rounded-xl border transition-all text-right flex flex-col justify-between gap-3 ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/40 shadow-xs'
                      : 'border-stone-200 hover:border-stone-300 bg-white hover:bg-stone-50/50'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black font-mono ${
                          file.format === 'EXCEL'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}
                      >
                        {file.format}
                      </span>
                      <div className="w-8 h-8 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center shrink-0">
                        {file.format === 'EXCEL' ? (
                          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <FileText className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-stone-900 leading-snug line-clamp-1">
                        {file.name}
                      </h4>
                      <p className="text-[10px] text-stone-500 mt-0.5 font-mono">
                        ID: {file.id}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1 border-t border-stone-100">
                      <span>الحجم: {formatFileSize(file.size)}</span>
                      <span>
                        {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString('ar-SA') : ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleSelectDriveFile(file)}
                      disabled={isDownloading && isSelected}
                      className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-stone-900 hover:bg-stone-800 text-white'
                      }`}
                    >
                      {isDownloading && isSelected ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>جاري التحميل...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>اختيار وتمرير للـ Pipeline</span>
                        </>
                      )}
                    </button>
                    {file.webViewLink && (
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="p-2 rounded-lg border border-stone-200 text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors"
                        title="فتح في Google Drive"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Selected File Intake & Sheet Configuration */}
      {selectedFileMeta && (
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black text-stone-900">{selectedFileMeta.name}</h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white">
                    GOOGLE_DRIVE SOURCE
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-stone-600 mt-0.5">
                  <span>معرف الملف: {selectedFileMeta.id}</span>
                  <span>•</span>
                  <span>الحجم: {formatFileSize(selectedFileMeta.size)}</span>
                  <span>•</span>
                  <span>الصيغة: {selectedFileMeta.format}</span>
                </div>
              </div>
            </div>

            {/* Multi-sheet selector for Excel */}
            {availableSheets.length > 1 && (
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-stone-200">
                <span className="text-xs font-bold text-stone-700 whitespace-nowrap">ورقة العمل (Sheet):</span>
                <select
                  value={selectedSheet}
                  onChange={(e) => handleSheetChange(e.target.value)}
                  disabled={isProcessing}
                  className="text-xs bg-transparent border-0 font-bold text-stone-900 focus:outline-none cursor-pointer"
                >
                  {availableSheets.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {processError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{processError}</span>
            </div>
          )}
        </div>
      )}

      {/* 4. Active Batch Statistics & Stage Tracker */}
      {activeBatch && (
        <div className="bg-white border border-stone-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-200">
                  بوابة المراجعة البشرية (REVIEW GATE)
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-stone-100 text-stone-700">
                  {activeBatch.importBatchId}
                </span>
              </div>
              <p className="text-xs text-stone-500">
                تم استلام ملف Google Drive وتمريره عبر 7 مراحل تدقيق متتالية. توقف إلزامي لمنع أي كتابة قبل الاعتماد الصريح.
              </p>
            </div>

            <button
              onClick={() => setShowMappingDrawer(!showMappingDrawer)}
              className="px-3 py-1.5 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-100 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>فحص مطابقة الأعمدة ({Object.keys(columnMappings).length})</span>
            </button>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 space-y-1">
              <span className="text-xs font-bold text-stone-500">إجمالي الصفوف</span>
              <p className="text-2xl font-black text-stone-900 font-mono">{activeBatch.totalRows}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 space-y-1">
              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>صفوف سليمة</span>
              </span>
              <p className="text-2xl font-black text-emerald-800 font-mono">{activeBatch.validRows}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-1">
              <span className="text-xs font-bold text-amber-700 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>تحذيرات (Warnings)</span>
              </span>
              <p className="text-2xl font-black text-amber-800 font-mono">{activeBatch.warningRows}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200/80 space-y-1">
              <span className="text-xs font-bold text-rose-700 flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" />
                <span>أخطاء مانعة (Errors)</span>
              </span>
              <p className="text-2xl font-black text-rose-800 font-mono">{activeBatch.errorRows}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200/80 space-y-1 col-span-2 sm:col-span-1">
              <span className="text-xs font-bold text-purple-700 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>تتطلب مراجعة</span>
              </span>
              <p className="text-2xl font-black text-purple-800 font-mono">{activeBatch.requiresReviewRows}</p>
            </div>
          </div>

          {/* Column Mappings Drawer if toggled */}
          {showMappingDrawer && (
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
              <h4 className="text-xs font-bold text-stone-900">
                خريطة مطابقة الأعمدة المكتشفة من ملف Google Drive:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {Object.entries(columnMappings).map(([rawCol, mapping]) => (
                  <div
                    key={rawCol}
                    className="p-2.5 rounded-lg bg-white border border-stone-200 flex items-center justify-between text-xs"
                  >
                    <span className="font-bold text-stone-800 font-mono truncate max-w-[140px]" title={rawCol}>
                      {rawCol}
                    </span>
                    <div className="flex items-center gap-1">
                      <ArrowRight className="w-3 h-3 text-stone-400 rotate-180" />
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800">
                        {String(mapping.canonicalField)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Table Filters */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setFilterStatus('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filterStatus === 'ALL' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600'
                }`}
              >
                الكل ({activeBatch.rows.length})
              </button>
              <button
                onClick={() => setFilterStatus('VALID')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filterStatus === 'VALID' ? 'bg-white text-emerald-800 shadow-xs' : 'text-stone-600'
                }`}
              >
                سليم ({activeBatch.validRows})
              </button>
              <button
                onClick={() => setFilterStatus('WARNING')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filterStatus === 'WARNING' ? 'bg-white text-amber-800 shadow-xs' : 'text-stone-600'
                }`}
              >
                تحذير ({activeBatch.warningRows})
              </button>
              <button
                onClick={() => setFilterStatus('ERROR')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filterStatus === 'ERROR' ? 'bg-white text-rose-800 shadow-xs' : 'text-stone-600'
                }`}
              >
                خطأ ({activeBatch.errorRows})
              </button>
            </div>

            <span className="text-xs text-stone-500">
              معروض: {filteredRows.length} من {activeBatch.rows.length} سطر
            </span>
          </div>

          {/* Rows Table */}
          <div className="overflow-x-auto border border-stone-200 rounded-xl">
            <table className="w-full text-right text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-700 font-bold">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">رقم التذكرة</th>
                  <th className="p-3">رقم الشاحنة</th>
                  <th className="p-3">الناقل</th>
                  <th className="p-3">السائق</th>
                  <th className="p-3">المادة</th>
                  <th className="p-3">الوزن (صافي / قائم / فارغ)</th>
                  <th className="p-3">الحالة والملاحظات</th>
                  <th className="p-3 text-center">إجراءات المراجعة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredRows.map((row) => {
                  const canonical = (row.mapped || row.canonical || {}) as any;
                  const hasErrors = row.validationIssues.some((i) => i.blocking);
                  const hasWarnings = row.validationIssues.some((i) => i.severity === 'WARNING');
                  const isRejected = row.status === 'REJECTED';

                  return (
                    <tr
                      key={row.rowNumber}
                      className={`hover:bg-stone-50/60 transition-colors ${
                        isRejected
                          ? 'bg-stone-100/70 opacity-60'
                          : hasErrors
                          ? 'bg-rose-50/30'
                          : hasWarnings
                          ? 'bg-amber-50/30'
                          : ''
                      }`}
                    >
                      <td className="p-3 font-mono font-bold text-stone-500">{row.rowNumber}</td>
                      <td className="p-3 font-bold font-mono text-stone-900">
                        {canonical.ticketId || canonical.ticketNo || '—'}
                      </td>
                      <td className="p-3 font-mono text-stone-800">
                        {canonical.truckId || canonical.truckNo || '—'}
                      </td>
                      <td className="p-3 text-stone-800">
                        {canonical.carrierId || canonical.carrier || '—'}
                      </td>
                      <td className="p-3 text-stone-700">
                        {canonical.driverId || canonical.driverName || '—'}
                      </td>
                      <td className="p-3 text-stone-700">
                        {canonical.materialId || canonical.materialType || '—'}
                      </td>
                      <td className="p-3 font-mono text-[11px]">
                        <span className="font-bold text-stone-900">
                          {canonical.netWeight ? `${canonical.netWeight} كجم` : '—'}
                        </span>
                        <span className="text-stone-400 block text-[10px]">
                          قائم: {canonical.grossWeight || 0} | فارغ: {canonical.tareWeight || 0}
                        </span>
                      </td>
                      <td className="p-3 space-y-1 max-w-xs">
                        {isRejected ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-stone-200 text-stone-700">
                            مستبعد (Rejected)
                          </span>
                        ) : hasErrors ? (
                          row.validationIssues
                            .filter((i) => i.blocking)
                            .map((issue) => (
                              <div
                                key={issue.issueId}
                                className="text-[11px] text-rose-700 font-semibold flex items-center gap-1"
                              >
                                <XCircle className="w-3 h-3 shrink-0" />
                                <span>{issue.messageAr || issue.message}</span>
                              </div>
                            ))
                        ) : hasWarnings ? (
                          row.validationIssues
                            .filter((i) => i.severity === 'WARNING')
                            .map((issue) => (
                              <div
                                key={issue.issueId}
                                className="text-[11px] text-amber-800 flex items-center gap-1"
                              >
                                <AlertTriangle className="w-3 h-3 shrink-0 text-amber-600" />
                                <span>{issue.messageAr || issue.message}</span>
                              </div>
                            ))
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>سليم ومطابق</span>
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {row.reviewStatus === 'warning' && !isRejected && (
                            <button
                              onClick={() => handleApplyRowAction(row.rowNumber, 'ACCEPT_WARNING')}
                              className="px-2 py-1 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[11px] transition-colors cursor-pointer"
                              title="قبول التنبيه يدوياً"
                            >
                              قبول التنبيه
                            </button>
                          )}
                          {!isRejected && (
                            <button
                              onClick={() => handleApplyRowAction(row.rowNumber, 'REJECT_ROW')}
                              className="px-2 py-1 rounded bg-stone-100 hover:bg-rose-100 text-stone-600 hover:text-rose-800 font-bold text-[11px] transition-colors cursor-pointer"
                              title="استبعاد هذا السطر"
                            >
                              استبعاد
                            </button>
                          )}
                          {isRejected && (
                            <span className="text-[11px] text-stone-400 font-bold">تم الاستبعاد</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 5. Pre-Commit Gate & Final Transaction Action */}
          <div className="p-5 rounded-2xl bg-stone-900 text-white space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <h4 className="text-base font-black">بوابة الاعتماد والتسجيل (Commit Gate)</h4>
                </div>
                <p className="text-xs text-stone-300">
                  {activeBatch.errorRows > 0
                    ? `توجد (${activeBatch.errorRows}) أخطاء مانعة. يمنع النظام الاعتماد حتى معالجة أو استبعاد الصفوف المرفوضة.`
                    : activeBatch.warningRows > 0
                    ? `توجد (${activeBatch.warningRows}) تنبيهات تشغيلية. يلزم تأكيد المشرف قبل الاعتماد.`
                    : 'كافة الصفوف مفحوصة ومطابقة وجاهزة للتسجيل النهائي في سجل رحلات المشروع.'}
                </p>
              </div>

              {/* Warning Confirmation Checkbox */}
              {activeBatch.warningRows > 0 && activeBatch.errorRows === 0 && (
                <label className="flex items-center gap-2 bg-stone-800 px-4 py-2 rounded-xl text-xs text-amber-300 font-bold cursor-pointer border border-amber-500/30">
                  <input
                    type="checkbox"
                    checked={confirmWarnings}
                    onChange={(e) => setConfirmWarnings(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                  />
                  <span>أؤكد مراجعة كافة التنبيهات وموافقتي على تسجيل الرحلات</span>
                </label>
              )}

              {/* Commit Button */}
              <button
                onClick={handleCommit}
                disabled={
                  isCommitting ||
                  activeBatch.errorRows > 0 ||
                  (activeBatch.warningRows > 0 && !confirmWarnings)
                }
                className={`px-5 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 transition-all shadow-md shrink-0 cursor-pointer ${
                  activeBatch.errorRows > 0 || (activeBatch.warningRows > 0 && !confirmWarnings)
                    ? 'bg-stone-700 text-stone-400 cursor-not-allowed opacity-60'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-stone-950'
                }`}
              >
                {isCommitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جاري الاعتماد الفعلي...</span>
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4" />
                    <span>اعتماد وتسجيل الرحلات الرسمية (Commit to Trips)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Commit Success Banner */}
      {commitResult && commitResult.success && (
        <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 space-y-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black">
                تم اعتماد وتوثيق دفعة Google Drive بنجاح في سجل الرحلات الرسمي!
              </h3>
              <p className="text-xs text-emerald-800">
                المصدر: Google Drive | معرف العملية (Operation ID): {commitResult.operationId} | المشروع:{' '}
                {commitResult.projectId}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3 bg-white rounded-xl border border-emerald-200">
              <span className="text-[11px] text-stone-500 font-bold block">الرحلات المسجلة</span>
              <span className="text-xl font-black text-emerald-700 font-mono">
                {commitResult.committedRows} رحلة
              </span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-emerald-200">
              <span className="text-[11px] text-stone-500 font-bold block">الصفوف المستبعدة</span>
              <span className="text-xl font-black text-stone-600 font-mono">
                {commitResult.skippedRows} سطر
              </span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-emerald-200">
              <span className="text-[11px] text-stone-500 font-bold block">حالة المصدر</span>
              <span className="text-sm font-black text-emerald-800">GOOGLE_DRIVE</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-emerald-200">
              <span className="text-[11px] text-stone-500 font-bold block">التدقيق والرقابة</span>
              <span className="text-sm font-black text-emerald-800">سجل تدقيق موثق</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
