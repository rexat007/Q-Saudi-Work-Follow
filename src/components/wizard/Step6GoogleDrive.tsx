import React, { useState } from 'react';
import { WizardGoogleDriveProvisioning } from '../../types/wizard';
import { 
  FolderSync, 
  Sheet, 
  FolderPlus, 
  CheckCircle2, 
  Sparkles, 
  FileSpreadsheet, 
  RefreshCw, 
  ShieldCheck,
  FolderTree,
  ExternalLink
} from 'lucide-react';

interface Step6Props {
  data: WizardGoogleDriveProvisioning;
  projectCode: string;
  projectName: string;
  onChange: (updated: WizardGoogleDriveProvisioning) => void;
  errors?: string[];
}

export const Step6GoogleDrive: React.FC<Step6Props> = ({
  data,
  projectCode,
  projectName,
  onChange,
  errors = [],
}) => {
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionTested, setConnectionTested] = useState(false);

  const update = <K extends keyof WizardGoogleDriveProvisioning>(
    field: K,
    value: WizardGoogleDriveProvisioning[K]
  ) => {
    onChange({
      ...data,
      [field]: value,
    });
  };

  const handleTestConnection = () => {
    setTestingConnection(true);
    setTimeout(() => {
      setTestingConnection(false);
      setConnectionTested(true);
    }, 1000);
  };

  const resetToProjectDefaults = () => {
    const code = projectCode.trim().toUpperCase() || 'PRJ-NEOM-01';
    onChange({
      ...data,
      enabled: true,
      rootFolderName: `${code} - أرشيف ومستندات المشروع اللوجستية`,
      spreadsheetTitle: `سجل رحلات وموازين ${code} - ${projectName || '2026'}`,
      generatedFolderId: `gdrive-${code.toLowerCase()}-${Date.now().toString(36)}`,
      generatedSpreadsheetId: `gsheet-${code.toLowerCase()}-${Date.now().toString(36)}`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-200 gap-3">
        <div>
          <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
            <FolderSync className="w-5 h-5 text-amber-600" />
            الخطوة 6: تهيئة مساحة العمل السحابية (Google Drive & Sheets Provisioning)
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            أتمتة إنشاء مجلدات الأرشفة الرقمية في Google Drive وجداول المطابقات والموازين في Google Sheets.
          </p>
        </div>

        <button
          type="button"
          onClick={resetToProjectDefaults}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-semibold transition-colors self-start sm:self-auto"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>توليد التسميات الآلية للمشروع</span>
        </button>
      </div>

      {errors.length > 0 && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 space-y-1">
          <p className="font-semibold">تنبيهات تهيئة Google Workspace:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {errors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Main Enable Card */}
      <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200/60">
              <FolderPlus className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900">
                تفعيل التهيئة الآلية لمساحة عمل Google Drive و Sheets
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                إنشاء المجلدات السحابية وتوزيع الجداول تلقائياً فور اعتماد المشروع في Firestore.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              id="toggle-gdrive-enabled"
              checked={data.enabled}
              onChange={(e) => update('enabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-stone-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
          </label>
        </div>

        {data.enabled && (
          <div className="pt-4 border-t border-stone-100 space-y-5">
            {/* Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  اسم المجلد الجذري في Google Drive (rootFolderName) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={data.rootFolderName}
                  onChange={(e) => update('rootFolderName', e.target.value)}
                  placeholder="e.g. PRJ-NEOM-WEST-01 - أرشيف ومستندات المشروع"
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
                <p className="text-[11px] text-stone-400 mt-1">
                  المجلد الحاوي لكافة تذاكر الميزان، إشعارات التوريد وسجلات الشاحنات.
                </p>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  عنوان جدول العمليات Google Sheets (spreadsheetTitle)
                </label>
                <input
                  type="text"
                  value={data.spreadsheetTitle}
                  onChange={(e) => update('spreadsheetTitle', e.target.value)}
                  placeholder="سجل رحلات وموازين المشروع"
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
                <p className="text-[11px] text-stone-400 mt-1">
                  المصنف المالي والتشغيلي المتزامن لحظياً مع Firestore.
                </p>
              </div>
            </div>

            {/* Folder Structure Preview */}
            <div className="bg-stone-50 rounded-xl p-4 border border-stone-200">
              <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FolderTree className="w-4 h-4 text-stone-600" />
                هيكل المجلدات والأوراق السحابية التي سيتم إنشاؤها تلقائياً:
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Drive Structure */}
                <div className="bg-white p-3 rounded-lg border border-stone-200 space-y-1.5">
                  <span className="font-bold text-stone-800 block text-[11px] text-amber-700">
                    📂 مجلدات Google Drive:
                  </span>
                  <ul className="text-stone-600 space-y-1 font-mono text-[11px]">
                    {data.folderStructure.map((folder, idx) => (
                      <li key={idx} className="flex items-center gap-1.5">
                        <span className="text-stone-400">├──</span>
                        <span>{folder}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Sheets Structure */}
                <div className="bg-white p-3 rounded-lg border border-stone-200 space-y-1.5">
                  <span className="font-bold text-stone-800 block text-[11px] text-emerald-700">
                    📊 أوراق عمل Google Sheets (Tabs):
                  </span>
                  <ul className="text-stone-600 space-y-1 text-[11px]">
                    <li className="flex items-center gap-1.5">
                      <Sheet className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="font-semibold">سجل الرحلات اليومي (Trips Log)</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Sheet className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="font-semibold">تذاكر الميزان الرقمية (Weighbridge Tickets)</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Sheet className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="font-semibold">كشف مطابقات الناقلين (Carrier Settlements)</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Sheet className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="font-semibold">ملخص استهلاك المواد الصادرة (Material Totals)</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Sync Triggers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <label className="flex items-center gap-2 p-3 bg-stone-50 rounded-lg border border-stone-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.autoSyncTickets}
                  onChange={(e) => update('autoSyncTickets', e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded border-stone-300 focus:ring-amber-500"
                />
                <span className="font-semibold text-stone-700">
                  مزامنة تذاكر الميزان آلياً فور اكتمال وزن الشاحنة
                </span>
              </label>

              <label className="flex items-center gap-2 p-3 bg-stone-50 rounded-lg border border-stone-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.archiveDailyTrips}
                  onChange={(e) => update('archiveDailyTrips', e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded border-stone-300 focus:ring-amber-500"
                />
                <span className="font-semibold text-stone-700">
                  أرشفة ملخص الرحلات وإشعارات التوريد بنهاية كل وردية
                </span>
              </label>
            </div>

            {/* Simulated Connectivity Check */}
            <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-stone-700">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  جاهزية حساب الخدمة وحقوق الوصول السحابية (Service Account Credentials)
                </span>
              </div>

              <div className="flex items-center gap-2">
                {connectionTested && (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded flex items-center gap-1 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    تم التحقق من الاتصال السحابي بنجاح
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                  className="px-3 py-1 bg-white hover:bg-stone-100 border border-stone-300 rounded font-semibold text-stone-800 flex items-center gap-1 shadow-2xs disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
                  <span>{testingConnection ? 'جارٍ الفحص...' : 'فحص الاتصال'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
