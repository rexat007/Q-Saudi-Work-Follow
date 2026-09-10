import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  FolderTree, 
  Database, 
  Layers, 
  ArrowRightLeft, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ExternalLink, 
  FileUp, 
  ShieldCheck, 
  Lock, 
  FileText, 
  Truck, 
  UserCheck, 
  AlertTriangle, 
  Calculator, 
  HardDrive, 
  Key, 
  Search,
  Sparkles,
  Info,
  Clock,
  ChevronDown,
  Building2,
  FolderOpen
} from 'lucide-react';
import { 
  WORKSPACE_TABS, 
  OPERATIONS_LEGACY_COLUMNS, 
  OPERATIONS_PRICING_COLUMNS, 
  OPERATIONS_AUDIT_COLUMNS,
  OPERATIONS_FULL_COLUMNS,
  WorkspaceSheetTab,
  SchemaMigrationPlan,
  GoogleDriveProjectStructure,
  WorkspaceSyncSummary
} from '../../types/workspace';
import { DEFAULT_PROJECTS } from '../../data/defaultMasterData';
import { ProjectEntity } from '../../types/entities';
import { clientWorkspaceService } from '../../services/workspace.service';
import { tripEngineService } from '../../services/tripEngine.service';
import { useAuth } from '../../firebase/authContext';

export function WorkspaceIntegrationView() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectEntity[]>(DEFAULT_PROJECTS);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(DEFAULT_PROJECTS[0].projectId);
  const [activeTabKey, setActiveTabKey] = useState<WorkspaceSheetTab>('OPERATIONS');
  
  const [isProvisioning, setIsProvisioning] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [provisionResult, setProvisionResult] = useState<GoogleDriveProjectStructure | null>(null);
  const [syncSummary, setSyncSummary] = useState<WorkspaceSyncSummary | null>(null);
  const [migrationPlan, setMigrationPlan] = useState<SchemaMigrationPlan | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  
  const [uploadFileName, setUploadFileName] = useState<string>('تذكرة_ميزان_WB-99101.pdf');
  const [uploadSubfolder, setUploadSubfolder] = useState<'importedFiles' | 'reports' | 'printableDocuments'>('printableDocuments');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [lastUploadedLink, setLastUploadedLink] = useState<string | null>(null);

  const currentProject = projects.find(p => p.projectId === selectedProjectId) || projects[0];

  useEffect(() => {
    clientWorkspaceService.fetchMigrationPlan().then(setMigrationPlan).catch(console.error);
  }, []);

  const handleRequestOAuth = async () => {
    try {
      setNotification({ type: 'info', text: 'جاري طلب تصاريح Google Drive و Google Sheets...' });
      const token = await clientWorkspaceService.requestGoogleScopes();
      setNotification({ type: 'success', text: 'تم تسجيل الدخول وتفعيل تصاريح Google Workspace بنجاح!' });
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'تعذر الحصول على تصاريح Google' });
    }
  };

  const handleProvisionProject = async () => {
    setIsProvisioning(true);
    setNotification(null);
    try {
      const res = await clientWorkspaceService.provisionProjectDrive(currentProject);
      setProvisionResult(res);
      // Update local state project
      setProjects(prev => prev.map(p => {
        if (p.projectId === currentProject.projectId) {
          return {
            ...p,
            settings: {
              ...p.settings,
              googleDriveFolderId: res.projectFolderId,
              googleSpreadsheetId: res.spreadsheetId,
            }
          };
        }
        return p;
      }));
      setNotification({
        type: 'success',
        text: `تمت تهيئة مجلدات Google Drive وشيت الإسقاط بنجاح للمشروع (${currentProject.nameAr})`,
      });
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'فشلت عملية تهيئة Google Drive للمشروع' });
    } finally {
      setIsProvisioning(false);
    }
  };

  const handleSyncProjection = async () => {
    const spreadsheetId = currentProject.settings.googleSpreadsheetId || provisionResult?.spreadsheetId;
    if (!spreadsheetId) {
      setNotification({
        type: 'error',
        text: 'يرجى تهيئة المشروع في Google Workspace أولاً لتوليد spreadsheetId في سجل المشروع (Project Registry).',
      });
      return;
    }

    setIsSyncing(true);
    setNotification(null);
    try {
      const summary = await clientWorkspaceService.syncProjectionToSheets(currentProject.projectId, spreadsheetId);
      setSyncSummary(summary);
      setNotification({
        type: 'success',
        text: `تمت المزامنة وتطبيق الـ Upsert بنجاح! تم تحديث وإسقاط ${summary.totalRecordsUpserted} سجلاً في Google Sheets.`,
      });
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'فشلت المزامنة مع Google Sheets' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleFileUpload = async () => {
    if (!provisionResult?.subfolders && !currentProject.settings.googleDriveFolderId) {
      setNotification({
        type: 'error',
        text: 'يرجى تهيئة مجلدات المشروع في Google Drive أولاً قبل رفع الملفات.',
      });
      return;
    }

    const subfolderId = provisionResult?.subfolders?.[uploadSubfolder]?.id || `sub_${uploadSubfolder}_${currentProject.projectId}`;
    setIsUploading(true);
    setNotification(null);
    try {
      const dummyContent = `Q-Saudi Enterprise Document\nProject: ${currentProject.nameAr}\nTicket: WB-99101\nDate: ${new Date().toISOString()}`;
      const res = await clientWorkspaceService.uploadDocument(
        subfolderId,
        uploadFileName,
        'application/pdf',
        dummyContent
      );
      setLastUploadedLink(res.webViewLink);
      setNotification({
        type: 'success',
        text: `تم رفع المستند (${uploadFileName}) بنجاح إلى مجلد ${uploadSubfolder} في Google Drive!`,
      });
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'فشل رفع المستند إلى Google Drive' });
    } finally {
      setIsUploading(false);
    }
  };

  const trips = tripEngineService.getTrips();
  const currentSpreadsheetId = currentProject.settings.googleSpreadsheetId || provisionResult?.spreadsheetId;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner: Enterprise Architecture Core Principles */}
      <div className="rounded-2xl bg-gradient-to-r from-stone-900 via-stone-800 to-amber-950 p-6 text-white shadow-md border border-stone-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>معمارية الخادم المتكاملة • Google Workspace Server-Side Integration</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              تكامل Google Sheets و Google Drive من جانب الخادم
            </h1>
            <p className="text-stone-300 text-sm max-w-3xl leading-relaxed">
              تطبيق مبدأ <span className="text-amber-400 font-semibold">Firestore المصدر الوحيد للحقيقة (Source of Truth)</span> و
              <span className="text-emerald-400 font-semibold"> Google Sheets كإسقاط تشغيلي (Projection)</span>،
              مع منع استخدام <code className="bg-stone-800 px-1.5 py-0.5 rounded text-rose-300 font-mono text-xs">SpreadsheetApp.getActiveSpreadsheet()</code> واستخدام <span className="text-amber-400 font-semibold">spreadsheetId</span> المخزن في سجل المشروع (Project Registry).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              id="btn-google-oauth-authorize"
              onClick={handleRequestOAuth}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs shadow-md transition-all active:scale-95"
            >
              <Key className="w-4 h-4" />
              <span>ربط تصاريح Google Workspace</span>
            </button>
            <button
              id="btn-sync-all-projection"
              onClick={handleSyncProjection}
              disabled={isSyncing}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-medium text-xs shadow-md transition-all active:scale-95 ${
                isSyncing ? 'bg-stone-600 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>مزامنة الإسقاط (Upsert Sync)</span>
            </button>
          </div>
        </div>

        {/* 4 Architectural Rule Badges */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-5 border-t border-stone-800">
          <div className="flex items-center gap-2.5 bg-stone-800/60 border border-stone-700/60 rounded-xl p-3">
            <Database className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-white">Firestore هو Source of Truth</div>
              <div className="text-[11px] text-stone-400">سجلات العمليات والتسعير محصنة</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 bg-stone-800/60 border border-stone-700/60 rounded-xl p-3">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-white">Google Sheets هو Projection</div>
              <div className="text-[11px] text-stone-400">إسقاط متزامن للعرض والمراجعة</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 bg-stone-800/60 border border-stone-700/60 rounded-xl p-3">
            <ArrowRightLeft className="w-5 h-5 text-cyan-400 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-white">Upsert وليس Blind Append</div>
              <div className="text-[11px] text-stone-400">المفتاح التقني للعمليات: tripId</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 bg-stone-800/60 border border-stone-700/60 rounded-xl p-3">
            <ShieldCheck className="w-5 h-5 text-purple-400 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-white">Project Registry Binding</div>
              <div className="text-[11px] text-stone-400">ربط مستقل لكل مشروع برقم الشيت</div>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div className={`p-4 rounded-xl text-xs flex items-center justify-between gap-3 shadow-xs border ${
          notification.type === 'success' 
            ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
            : notification.type === 'error'
            ? 'bg-rose-50 text-rose-900 border-rose-200'
            : 'bg-blue-50 text-blue-900 border-blue-200'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
            {notification.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
            {notification.type === 'info' && <Info className="w-4 h-4 text-blue-600 shrink-0" />}
            <span className="font-medium">{notification.text}</span>
          </div>
          <button 
            onClick={() => setNotification(null)}
            className="text-stone-400 hover:text-stone-700 font-bold px-1"
          >
            ×
          </button>
        </div>
      )}

      {/* Project Selection & Registry Card */}
      <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">سجل المشاريع (Project Registry)</h2>
              <p className="text-xs text-stone-500">تحديد معرفات Google Drive و Google Sheets المرتبطة بكل مشروع في Firestore</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              id="select-project-registry"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="px-3.5 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {projects.map((p) => (
                <option key={p.projectId} value={p.projectId}>
                  {p.nameAr} ({p.projectCode || p.projectId})
                </option>
              ))}
            </select>

            <button
              id="btn-provision-drive-sheets"
              onClick={handleProvisionProject}
              disabled={isProvisioning}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium text-white transition-all shadow-xs ${
                isProvisioning ? 'bg-stone-400 cursor-not-allowed' : 'bg-stone-900 hover:bg-stone-800'
              }`}
            >
              <FolderTree className={`w-4 h-4 ${isProvisioning ? 'animate-spin' : ''}`} />
              <span>{isProvisioning ? 'جاري التهيئة...' : 'تهيئة هيكل المشروع في Drive & Sheets'}</span>
            </button>
          </div>
        </div>

        {/* Project Registry Metadata Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-stone-100">
          <div className="bg-stone-50 rounded-xl p-3 border border-stone-200/70">
            <div className="text-[11px] font-semibold text-stone-500 mb-1">المشروع المحدد</div>
            <div className="text-xs font-bold text-stone-900">{currentProject.nameAr}</div>
            <div className="text-[10px] text-stone-500 font-mono mt-0.5">ID: {currentProject.projectId}</div>
          </div>

          <div className="bg-stone-50 rounded-xl p-3 border border-stone-200/70">
            <div className="text-[11px] font-semibold text-stone-500 mb-1">Google Spreadsheet ID (المسجل)</div>
            {currentSpreadsheetId ? (
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-mono font-bold text-emerald-800 truncate">{currentSpreadsheetId}</span>
                <a
                  href={`https://docs.google.com/spreadsheets/d/${currentSpreadsheetId}/edit`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-600 hover:text-emerald-800"
                  title="فتح في Google Sheets"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            ) : (
              <span className="text-xs text-amber-700 font-medium">غير مسجل بعد (اضغط تهيئة المشروع)</span>
            )}
            <div className="text-[10px] text-stone-400 mt-0.5">مفتاح الربط المباشر من Project Registry</div>
          </div>

          <div className="bg-stone-50 rounded-xl p-3 border border-stone-200/70">
            <div className="text-[11px] font-semibold text-stone-500 mb-1">Google Drive Folder ID (المسجل)</div>
            {currentProject.settings.googleDriveFolderId || provisionResult?.projectFolderId ? (
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-mono font-bold text-indigo-800 truncate">
                  {currentProject.settings.googleDriveFolderId || provisionResult?.projectFolderId}
                </span>
                <a
                  href={`https://drive.google.com/drive/folders/${currentProject.settings.googleDriveFolderId || provisionResult?.projectFolderId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 hover:text-indigo-800"
                  title="فتح في Google Drive"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            ) : (
              <span className="text-xs text-amber-700 font-medium">غير مسجل بعد</span>
            )}
            <div className="text-[10px] text-stone-400 mt-0.5">المجلد الجذري للمشروع</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Google Drive Structure & Google Sheets Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left/Main Column: Google Sheets 6-Tabs Projection */}
        <div className="lg:col-span-8 space-y-5">
          <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>جداول الإسقاط الستة في Google Sheets (Projection Tabs)</span>
                </h3>
                <p className="text-xs text-stone-500">تمثيل متزامن ومحدث تلقائياً عبر Upsert بالمعرف التقني</p>
              </div>

              {currentSpreadsheetId && (
                <a
                  id="link-open-google-sheet"
                  href={`https://docs.google.com/spreadsheets/d/${currentSpreadsheetId}/edit`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-900 font-semibold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200"
                >
                  <span>فتح الشيت في Google Docs</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            {/* 6 Tabs Pill Switcher */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-stone-100 rounded-xl">
              {(Object.keys(WORKSPACE_TABS) as WorkspaceSheetTab[]).map((tabKey) => {
                const tab = WORKSPACE_TABS[tabKey];
                const isActive = activeTabKey === tabKey;
                return (
                  <button
                    key={tabKey}
                    id={`sheet-tab-${tabKey.toLowerCase()}`}
                    onClick={() => setActiveTabKey(tabKey)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isActive 
                        ? 'bg-white text-stone-900 shadow-xs border border-stone-200/50' 
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <span>{tab.tabTitleAr}</span>
                    <span className="text-[10px] text-stone-400 font-mono">({tab.primaryKey})</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Info Box */}
            <div className="bg-stone-50 rounded-xl p-3 border border-stone-200/70 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <div className="font-bold text-stone-900 flex items-center gap-2">
                  <span>جدول: {WORKSPACE_TABS[activeTabKey].tabTitleAr}</span>
                  <span className="text-[10px] bg-amber-100 text-amber-800 font-mono px-2 py-0.5 rounded-md font-semibold">
                    المفتاح التقني: {WORKSPACE_TABS[activeTabKey].primaryKey}
                  </span>
                </div>
                <p className="text-stone-500 text-[11px]">{WORKSPACE_TABS[activeTabKey].descriptionAr}</p>
              </div>

              <div className="text-right shrink-0 font-mono text-[11px] text-stone-500">
                طريقة التحديث: <span className="font-bold text-emerald-700">Upsert (In-Place / Append)</span>
              </div>
            </div>

            {/* Special Section for OPERATIONS Tab: The 20 Legacy Columns + 6 Pricing Columns */}
            {activeTabKey === 'OPERATIONS' && (
              <div className="space-y-4 pt-2">
                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-amber-700" />
                      <span>توافق أعمدة العمليات الـ 20 + أعمدة التسعير الـ 6 (مخطط الإسقاط الرسمي)</span>
                    </h4>
                    <span className="text-[10px] font-bold text-amber-900 bg-amber-200/70 px-2 py-0.5 rounded">
                      إجمالي الأعمدة: {OPERATIONS_FULL_COLUMNS.length} عموداً
                    </span>
                  </div>

                  <p className="text-[11px] text-amber-900 leading-relaxed">
                    تم الالتزام الصارم بالاحتفاظ بأعمدة التشغيل الـ 20 الحالية للتوافق ومنع أي تضارب أو كسر في التقارير التاريخية،
                    وإضافة أعمدة التسعير الستة المعتمدة باللقطة التعاقدية دون حذف أو تعديل الأعمدة القديمة.
                  </p>

                  {/* Columns Visualizer */}
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold text-stone-600 uppercase">
                      1. أعمدة التشغيل الـ 20 الحالية (Legacy Operational Columns)
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {OPERATIONS_LEGACY_COLUMNS.map((col, idx) => (
                        <span 
                          key={col} 
                          className="px-2 py-0.5 rounded text-[10px] font-mono bg-white border border-stone-200 text-stone-800 font-medium"
                          title={`العمود رقم ${idx + 1}`}
                        >
                          <span className="text-amber-700 font-bold ml-1">{idx + 1}.</span>
                          {col}
                        </span>
                      ))}
                    </div>

                    <div className="text-[10px] font-bold text-emerald-800 uppercase mt-3">
                      2. أعمدة التسعير الـ 6 المضافة حديثاً (Pricing Snapshot Columns)
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {OPERATIONS_PRICING_COLUMNS.map((col, idx) => (
                        <span 
                          key={col} 
                          className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold"
                          title={`العمود رقم ${21 + idx}`}
                        >
                          <span className="text-emerald-700 font-bold ml-1">{21 + idx}.</span>
                          {col}
                        </span>
                      ))}
                    </div>

                    <div className="text-[10px] font-bold text-stone-500 uppercase mt-3">
                      3. أعمدة التدقيق والمطابقة (Audit Metadata Columns)
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {OPERATIONS_AUDIT_COLUMNS.map((col, idx) => (
                        <span 
                          key={col} 
                          className="px-2 py-0.5 rounded text-[10px] font-mono bg-stone-100 text-stone-600 font-medium"
                        >
                          <span className="text-stone-400 font-bold ml-1">{27 + idx}.</span>
                          {col}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Sample Trips Preview (Showing both operational & pricing columns) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-stone-800">معاينة رحلات المشروع المسقطة (جاهزة للإسقاط بالـ Upsert)</span>
                    <span className="text-stone-500 text-[11px]">{trips.length} رحلة مسجلة في المحرك</span>
                  </div>

                  <div className="overflow-x-auto border border-stone-200 rounded-xl">
                    <table className="w-full text-right text-[11px] border-collapse min-w-[700px]">
                      <thead>
                        <tr className="bg-stone-100 border-b border-stone-200 text-stone-700 font-bold">
                          <th className="p-2 border-l border-stone-200">tripId (PK)</th>
                          <th className="p-2 border-l border-stone-200">الرقم التسلسلي</th>
                          <th className="p-2 border-l border-stone-200">تذكرة الميزان</th>
                          <th className="p-2 border-l border-stone-200">الصافي (كجم)</th>
                          <th className="p-2 border-l border-stone-200">الحالة</th>
                          <th className="p-2 border-l border-stone-200 bg-emerald-50 text-emerald-900">نوع التسعير</th>
                          <th className="p-2 border-l border-stone-200 bg-emerald-50 text-emerald-900">السعر المتفق</th>
                          <th className="p-2 border-l border-stone-200 bg-emerald-50 text-emerald-900">مستحق التسوية</th>
                          <th className="p-2 bg-emerald-50 text-emerald-900">العملة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {trips.slice(0, 5).map((t) => (
                          <tr key={t.tripId} className="hover:bg-amber-50/40">
                            <td className="p-2 font-mono font-bold text-amber-900 border-l border-stone-100">{t.tripId}</td>
                            <td className="p-2 font-mono border-l border-stone-100">{t.tripSerial}</td>
                            <td className="p-2 font-mono border-l border-stone-100">{t.ticketId}</td>
                            <td className="p-2 font-mono border-l border-stone-100">{(t.netWeight || 0).toLocaleString()}</td>
                            <td className="p-2 border-l border-stone-100">
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-stone-100 text-stone-700">
                                {t.status}
                              </span>
                            </td>
                            <td className="p-2 font-mono font-semibold text-emerald-800 bg-emerald-50/40 border-l border-stone-100">
                              {t.pricingType}
                            </td>
                            <td className="p-2 font-mono text-emerald-900 bg-emerald-50/40 border-l border-stone-100">
                              {t.agreedRate}
                            </td>
                            <td className="p-2 font-mono font-bold text-emerald-900 bg-emerald-50/40 border-l border-stone-100">
                              {(t.settlementAmount || 0).toLocaleString()}
                            </td>
                            <td className="p-2 font-mono text-emerald-800 bg-emerald-50/40">{t.currency}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Other Tabs Placeholder Info */}
            {activeTabKey !== 'OPERATIONS' && (
              <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-stone-800">
                  <Info className="w-4 h-4 text-stone-500" />
                  <span>معلومات ومحددات الإسقاط لجدول {WORKSPACE_TABS[activeTabKey].tabTitleAr}</span>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  يتم سحب السجلات من مستودعات البيانات الرئيسية في Firestore وتحديث جدول {WORKSPACE_TABS[activeTabKey].tabTitleAr}
                  باستخدام المفتاح التقني <code className="font-mono bg-stone-200 px-1 py-0.5 rounded">{WORKSPACE_TABS[activeTabKey].primaryKey}</code>.
                  في حال وجود السجل مسبقاً يتم تحديث الصف دون تكرار، وفي حال كونه جديداً يُلحق في نهاية الشيت.
                </p>
              </div>
            )}
          </div>

          {/* Upsert Sync Execution Results Card */}
          {syncSummary && (
            <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>نتائج آخر عملية مزامنة وإسقاط ذكية (Upsert Summary)</span>
                </h3>
                <span className="text-[11px] text-stone-500 font-mono">
                  {new Date(syncSummary.syncedAt).toLocaleTimeString('ar-SA')}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {syncSummary.upsertResults.map((r) => (
                  <div key={r.tabKey} className="bg-stone-50 rounded-xl p-2.5 border border-stone-200 text-center">
                    <div className="text-[11px] font-bold text-stone-800 truncate">{r.tabTitle}</div>
                    <div className="text-base font-bold text-stone-900 mt-1">{r.processedCount}</div>
                    <div className="text-[10px] text-emerald-700 font-medium mt-0.5">
                      +{r.insertedCount} جديد • ~{r.updatedCount} تحديث
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Google Drive Hierarchy & Migration Plan */}
        <div className="lg:col-span-4 space-y-5">
          
          {/* Google Drive Structure Card */}
          <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-stone-900">هيكل Google Drive للمشروع</h3>
              </div>
              <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">
                4 مجلدات فرعية
              </span>
            </div>

            <p className="text-xs text-stone-500 leading-relaxed">
              تنظيم وثائق المشروع داخل المجلد الجذري مع ثلاثة مجلدات فرعية مخصصة للملفات المستوردة والتقارير والمستندات القابلة للطباعة:
            </p>

            {/* Folder Tree Visualizer */}
            <div className="bg-stone-50 rounded-xl p-3 border border-stone-200 text-xs space-y-2 font-mono">
              <div className="flex items-center gap-2 text-stone-900 font-bold">
                <FolderTree className="w-4 h-4 text-amber-600" />
                <span className="truncate">[Q-Saudi] {currentProject.nameAr}</span>
              </div>

              <div className="pr-5 space-y-2 border-r-2 border-stone-200 mr-2 text-[11px]">
                <div className="flex items-center justify-between gap-1 text-stone-700">
                  <div className="flex items-center gap-1.5">
                    <FolderOpen className="w-3.5 h-3.5 text-blue-500" />
                    <span>imported files</span>
                  </div>
                  <span className="text-[10px] text-stone-400 font-sans">ملفات الاستيراد</span>
                </div>

                <div className="flex items-center justify-between gap-1 text-stone-700">
                  <div className="flex items-center gap-1.5">
                    <FolderOpen className="w-3.5 h-3.5 text-emerald-500" />
                    <span>reports</span>
                  </div>
                  <span className="text-[10px] text-stone-400 font-sans">التقارير وسجلات التشغيل</span>
                </div>

                <div className="flex items-center justify-between gap-1 text-stone-700">
                  <div className="flex items-center gap-1.5">
                    <FolderOpen className="w-3.5 h-3.5 text-purple-500" />
                    <span>printable documents</span>
                  </div>
                  <span className="text-[10px] text-stone-400 font-sans">الوثائق القابلة للطباعة</span>
                </div>

                <div className="flex items-center justify-between gap-1 text-emerald-800 font-semibold pt-1 border-t border-stone-200">
                  <div className="flex items-center gap-1.5">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>سجل المشروع (Google Sheets)</span>
                  </div>
                  <span className="text-[10px] font-sans">الإسقاط</span>
                </div>
              </div>
            </div>

            {/* Document Upload Tester to Drive */}
            <div className="bg-stone-50 rounded-xl p-3 border border-stone-200 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800">
                <FileUp className="w-4 h-4 text-amber-700" />
                <span>رفع وثيقة تشغيلية إلى مجلد Drive للمشروع</span>
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  value={uploadFileName}
                  onChange={(e) => setUploadFileName(e.target.value)}
                  placeholder="اسم الملف (مثال: تذكرة_ميزان_WB-99101.pdf)"
                  className="w-full px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-xs font-mono"
                />

                <div className="flex items-center gap-2">
                  <select
                    value={uploadSubfolder}
                    onChange={(e) => setUploadSubfolder(e.target.value as any)}
                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-xs text-stone-700"
                  >
                    <option value="printableDocuments">printable documents (الوثائق القابلة للطباعة)</option>
                    <option value="reports">reports (التقارير)</option>
                    <option value="importedFiles">imported files (ملفات الاستيراد)</option>
                  </select>

                  <button
                    onClick={handleFileUpload}
                    disabled={isUploading}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shrink-0"
                  >
                    {isUploading ? 'جاري الرفع...' : 'رفع'}
                  </button>
                </div>

                {lastUploadedLink && (
                  <div className="text-[11px] text-emerald-700 flex items-center gap-1 pt-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <a href={lastUploadedLink} target="_blank" rel="noreferrer" className="underline font-mono truncate">
                      فتح الملف المرفوع في Google Drive
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Migration Plan Card */}
          <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-stone-900">خطة الترحيل وعدم كسر الأعمدة القديمة</h3>
              </div>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                Migration Plan
              </span>
            </div>

            <div className="space-y-2 text-xs text-stone-600 leading-relaxed">
              <div className="flex items-start gap-2 bg-stone-50 p-2.5 rounded-lg border border-stone-200/60">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-stone-800">حماية الأعمدة الـ 20: </span>
                  لا يتم حذف أو إعادة ترتيب أي عمود قديم لمنع إتلاف التقارير الحالية.
                </div>
              </div>

              <div className="flex items-start gap-2 bg-stone-50 p-2.5 rounded-lg border border-stone-200/60">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-stone-800">التمدد غير الإتلافي (Additive Only): </span>
                  أعمدة التسعير الستة تُضاف في أقصى اليمين (الأعمدة من 21 إلى 26).
                </div>
              </div>

              <div className="flex items-start gap-2 bg-stone-50 p-2.5 rounded-lg border border-stone-200/60">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-stone-800">مطابقة المفتاح التقني tripId: </span>
                  التحديث يتم عبر فحص عمود tripId بدقة ومطابقة الصف المحدد حصراً.
                </div>
              </div>
            </div>

            {migrationPlan && (
              <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500 font-mono">
                <span>الإصدار: {migrationPlan.planVersion}</span>
                <span>الاستراتيجية: {migrationPlan.migrationStrategy}</span>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
