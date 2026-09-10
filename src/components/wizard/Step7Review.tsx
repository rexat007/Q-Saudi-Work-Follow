import React from 'react';
import { 
  ProjectSetupWizardData, 
  WizardFullValidation, 
  ProjectProvisioningResult 
} from '../../types/wizard';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Building2, 
  Boxes, 
  Truck, 
  CircleDollarSign, 
  Users, 
  FolderSync, 
  ShieldCheck, 
  ArrowRight, 
  ArrowLeft,
  Loader2,
  Database,
  ExternalLink,
  Copy,
  Sparkles
} from 'lucide-react';

interface Step7Props {
  data: ProjectSetupWizardData;
  validation: WizardFullValidation;
  isProvisioning: boolean;
  provisioningStepIndex: number;
  provisionResult: ProjectProvisioningResult | null;
  onJumpToStep: (stepNumber: number) => void;
  onProvision: () => void;
  onReset: () => void;
}

export const Step7Review: React.FC<Step7Props> = ({
  data,
  validation,
  isProvisioning,
  provisioningStepIndex,
  provisionResult,
  onJumpToStep,
  onProvision,
  onReset,
}) => {
  const activeMaterials = data.materials.filter((m) => m.status === 'ACTIVE');
  const activeCarriers = data.carriers.filter((c) => c.status === 'ACTIVE');
  const assignedUsers = data.userAccess.filter((u) => u.isAssigned);

  const PROVISIONING_STAGES = [
    'التحقق النهائي من القواعد وسياسات النزاهة الهندسية',
    'إنشاء وثيقة المشروع الرئيسية في /projects/{projectId}',
    `تسجيل وحفظ ${data.materials.length} مواد في المجموعة الفرعية /materials`,
    `توثيق ${data.carriers.length} شركات نقل في المجموعة الفرعية /carriers`,
    `تثبيت ${data.pricingRules.length} قواعد تسعير غير متداخلة في /pricing_rules`,
    `تحديث صلاحيات ${assignedUsers.length} مستخدمين في /users`,
    'تهيئة مساحة عمل Google Drive وجداول Sheets في /sync_operations',
    'تدوين سجل التدقيق الموثق وغير القابل للإلغاء في /audit_logs',
  ];

  // If provisioned successfully, show Success Screen
  if (provisionResult && provisionResult.success) {
    return (
      <div className="bg-white border border-emerald-200 rounded-2xl p-6 sm:p-8 text-center space-y-6 shadow-xs animate-fade-in">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto ring-8 ring-emerald-50">
          <CheckCircle2 className="w-10 h-10 text-emerald-600" />
        </div>

        <div>
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            تم اكتمال تهيئة وتأسيس المشروع بنجاح
          </span>
          <h2 className="text-xl font-black text-stone-900">
            {provisionResult.projectName}
          </h2>
          <p className="text-xs text-stone-500 font-mono mt-1">
            معرف المشروع في Firestore: <span className="font-bold text-stone-800">{provisionResult.projectId}</span>
          </p>
        </div>

        {/* Provisioning Stat Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto text-xs">
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
            <span className="text-stone-400 block text-[11px]">المواد المعتمدة</span>
            <span className="text-lg font-bold text-stone-800 font-mono">{provisionResult.materialsCount}</span>
          </div>
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
            <span className="text-stone-400 block text-[11px]">الناقلون المسجلون</span>
            <span className="text-lg font-bold text-stone-800 font-mono">{provisionResult.carriersCount}</span>
          </div>
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
            <span className="text-stone-400 block text-[11px]">اتفاقيات التسعير</span>
            <span className="text-lg font-bold text-stone-800 font-mono">{provisionResult.pricingRulesCount}</span>
          </div>
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
            <span className="text-stone-400 block text-[11px]">المستخدمون المصرحون</span>
            <span className="text-lg font-bold text-stone-800 font-mono">{provisionResult.assignedUsersCount}</span>
          </div>
        </div>

        {/* Audit info */}
        <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl max-w-2xl mx-auto text-xs text-right space-y-1.5 text-stone-600">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-stone-500">سجل التدقيق (Audit Log ID):</span>
            <span className="font-mono text-[11px] font-bold text-stone-800">{provisionResult.auditLogId}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-stone-500">طابع التأسيس (Timestamp):</span>
            <span className="font-mono text-[11px]">{new Date(provisionResult.createdAt).toLocaleString('ar-SA')}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-stone-500">مساحة Google Drive و Sheets:</span>
            <span className="font-semibold text-emerald-700">
              {provisionResult.googleDriveProvisioned ? 'تمت التهيئة والأرشفة بنجاح' : 'معطل'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-stone-100">
          <button
            type="button"
            onClick={onReset}
            className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-colors"
          >
            تهيئة مشروع جديد (New Wizard)
          </button>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(provisionResult.projectId);
              alert(`تم نسخ معرّف المشروع: ${provisionResult.projectId}`);
            }}
            className="px-4 py-2 bg-white border border-stone-300 hover:bg-stone-50 text-stone-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>نسخ رمز المشروع</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-200 gap-3">
        <div>
          <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-600" />
            الخطوة 7: المراجعة الشاملة ومحرك التحقق (Review & Validation Gate)
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            فحص دقيق لجميع الخطوات السابقة قبل إطلاق المشروع. لن يُسمح بالكتابة في Firestore إلا بعد اجتياز كافة القواعد.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {validation.isValid ? (
            <span className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              جاهز للتأسيس (All Validations Passed)
            </span>
          ) : (
            <span className="px-3 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5">
              <XCircle className="w-4 h-4 text-rose-600" />
              مطلوب معالجة {validation.totalErrors} أخطاء قبل الإنشاء
            </span>
          )}
        </div>
      </div>

      {/* Validation Checklist Grid */}
      <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs space-y-3">
        <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider mb-2">
          بوابة التحقق الصارمة (Validation Gate Checklist)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          {validation.stepResults.map((step) => {
            const isStepValid = step.isValid;
            return (
              <div
                key={step.step}
                className={`p-3 rounded-xl border transition-all ${
                  isStepValid
                    ? 'bg-emerald-50/50 border-emerald-200'
                    : 'bg-rose-50/70 border-rose-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 font-bold">
                    {isStepValid ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span className={isStepValid ? 'text-emerald-900' : 'text-rose-900'}>
                      الخطوة {step.step}: {step.titleAr}
                    </span>
                  </div>

                  {!isStepValid && (
                    <button
                      type="button"
                      onClick={() => onJumpToStep(step.step)}
                      className="text-[11px] font-bold text-rose-700 hover:text-rose-900 underline shrink-0"
                    >
                      تصحيح
                    </button>
                  )}
                </div>

                {isStepValid ? (
                  <p className="text-[11px] text-emerald-700">مكتملة ومستوفية للشروط النظامية.</p>
                ) : (
                  <ul className="text-[11px] text-rose-800 list-disc list-inside space-y-0.5 mt-1 font-medium">
                    {step.errors.map((err, errIdx) => (
                      <li key={errIdx}>{err}</li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Overlap conflict deep check review */}
      {validation.pricingConflicts.length > 0 && (
        <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-xl space-y-2">
          <div className="flex items-center gap-2 font-bold text-xs text-rose-900">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <span>قيد منع التداخل الزمني في التسعير (Overlap Prevention Rule)</span>
          </div>
          <div className="space-y-1 text-xs text-rose-800">
            {validation.pricingConflicts.map((c, idx) => (
              <p key={idx} className="bg-white/80 p-2 rounded border border-rose-200">
                {c.messageAr}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Review Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Step 1 Review */}
        <div className="p-4 bg-white border border-stone-200 rounded-xl shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-stone-100">
            <h4 className="font-bold text-stone-900 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-amber-600" />
              بيانات المشروع (Step 1)
            </h4>
            <button
              type="button"
              onClick={() => onJumpToStep(1)}
              className="text-[11px] text-amber-700 hover:underline font-semibold"
            >
              تعديل
            </button>
          </div>
          <div className="space-y-1.5 text-stone-600">
            <p className="flex justify-between">
              <span className="text-stone-400">الرمز:</span>
              <span className="font-mono font-bold text-stone-900">{data.projectInfo.projectCode}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-stone-400">الاسم:</span>
              <span className="font-semibold text-stone-800 text-left">{data.projectInfo.projectName}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-stone-400">فترة العمليات:</span>
              <span className="font-mono">{data.projectInfo.startDate} إلى {data.projectInfo.endDate || 'مفتوح'}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-stone-400">الضريبة / العملة:</span>
              <span>{data.projectInfo.defaultSettings.vatRatePercent}% VAT / {data.projectInfo.defaultSettings.currency}</span>
            </p>
          </div>
        </div>

        {/* Step 2 Review */}
        <div className="p-4 bg-white border border-stone-200 rounded-xl shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-stone-100">
            <h4 className="font-bold text-stone-900 flex items-center gap-1.5">
              <Boxes className="w-4 h-4 text-amber-600" />
              المواد المعتمدة (Step 2)
            </h4>
            <button
              type="button"
              onClick={() => onJumpToStep(2)}
              className="text-[11px] text-amber-700 hover:underline font-semibold"
            >
              تعديل
            </button>
          </div>
          <div className="space-y-1 text-stone-600">
            <p className="text-[11px] text-stone-500 mb-1">
              إجمالي المواد: <strong className="text-stone-800">{data.materials.length}</strong> (النشطة: {activeMaterials.length})
            </p>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {data.materials.map((m) => (
                <span
                  key={m.id}
                  className={`px-2 py-0.5 rounded text-[11px] border font-medium ${
                    m.status === 'ACTIVE'
                      ? 'bg-stone-50 border-stone-200 text-stone-800'
                      : 'bg-stone-100 border-stone-200 text-stone-400 line-through'
                  }`}
                >
                  {m.materialName} ({m.materialCode})
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Step 3 Review */}
        <div className="p-4 bg-white border border-stone-200 rounded-xl shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-stone-100">
            <h4 className="font-bold text-stone-900 flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-amber-600" />
              شركات النقل (Step 3)
            </h4>
            <button
              type="button"
              onClick={() => onJumpToStep(3)}
              className="text-[11px] text-amber-700 hover:underline font-semibold"
            >
              تعديل
            </button>
          </div>
          <div className="space-y-1 text-stone-600">
            <p className="text-[11px] text-stone-500 mb-1">
              إجمالي الناقلين: <strong className="text-stone-800">{data.carriers.length}</strong> (النشطون: {activeCarriers.length})
            </p>
            <div className="space-y-1">
              {data.carriers.map((c) => (
                <div key={c.id} className="flex items-center justify-between text-[11px] p-1 bg-stone-50 rounded">
                  <span className="font-semibold text-stone-800">{c.carrierName}</span>
                  <span className="font-mono text-[10px] text-stone-500">{c.carrierId}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Step 4 Review */}
        <div className="p-4 bg-white border border-stone-200 rounded-xl shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-stone-100">
            <h4 className="font-bold text-stone-900 flex items-center gap-1.5">
              <CircleDollarSign className="w-4 h-4 text-amber-600" />
              قواعد واتفاقيات التسعير (Step 4)
            </h4>
            <button
              type="button"
              onClick={() => onJumpToStep(4)}
              className="text-[11px] text-amber-700 hover:underline font-semibold"
            >
              تعديل
            </button>
          </div>
          <div className="space-y-1 text-stone-600">
            <p className="text-[11px] text-stone-500 mb-1">
              إجمالي الاتفاقيات: <strong className="text-stone-800">{data.pricingRules.length}</strong>
            </p>
            <div className="space-y-1 max-h-28 overflow-y-auto">
              {data.pricingRules.map((r) => (
                <div key={r.id} className="flex items-center justify-between text-[11px] p-1 bg-stone-50 rounded">
                  <span>{r.carrierId} ➔ {r.pricingType === 'PER_TRIP' ? 'بالرد' : 'بالطن'}</span>
                  <span className="font-mono font-bold text-amber-700">{r.rate} SAR</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Step 5 Review */}
        <div className="p-4 bg-white border border-stone-200 rounded-xl shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-stone-100">
            <h4 className="font-bold text-stone-900 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-amber-600" />
              المستخدمون المصرحون (Step 5)
            </h4>
            <button
              type="button"
              onClick={() => onJumpToStep(5)}
              className="text-[11px] text-amber-700 hover:underline font-semibold"
            >
              تعديل
            </button>
          </div>
          <div className="space-y-1 text-stone-600">
            <p className="text-[11px] text-stone-500 mb-1">
              المستخدمون المعينون: <strong className="text-stone-800">{assignedUsers.length}</strong>
            </p>
            <div className="space-y-1">
              {assignedUsers.map((u) => (
                <div key={u.userId} className="flex items-center justify-between text-[11px] p-1 bg-stone-50 rounded">
                  <span className="font-semibold text-stone-800">{u.fullName}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-200 text-stone-700 font-mono">
                    {u.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Step 6 Review */}
        <div className="p-4 bg-white border border-stone-200 rounded-xl shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-stone-100">
            <h4 className="font-bold text-stone-900 flex items-center gap-1.5">
              <FolderSync className="w-4 h-4 text-amber-600" />
              تكامل Google Workspace (Step 6)
            </h4>
            <button
              type="button"
              onClick={() => onJumpToStep(6)}
              className="text-[11px] text-amber-700 hover:underline font-semibold"
            >
              تعديل
            </button>
          </div>
          <div className="space-y-1.5 text-stone-600 text-[11px]">
            <p className="flex justify-between">
              <span className="text-stone-400">الحالة:</span>
              <span className="font-semibold text-stone-800">
                {data.googleDrive.enabled ? 'مفعّل تلقائياً' : 'معطّل'}
              </span>
            </p>
            {data.googleDrive.enabled && (
              <>
                <p className="flex justify-between">
                  <span className="text-stone-400">مجلد Drive:</span>
                  <span className="font-mono truncate max-w-[200px]">{data.googleDrive.rootFolderName}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-stone-400">جدول Sheets:</span>
                  <span className="font-mono truncate max-w-[200px]">{data.googleDrive.spreadsheetTitle}</span>
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Provisioning Progress Overlay / Panel */}
      {isProvisioning && (
        <div className="p-5 bg-amber-50 border border-amber-300 rounded-xl space-y-3">
          <div className="flex items-center gap-2 font-bold text-xs text-amber-900">
            <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />
            <span>جارٍ إنشاء وتأسيس المشروع في قاعدة بيانات Firestore...</span>
          </div>

          <div className="space-y-1.5 text-xs text-stone-700">
            {PROVISIONING_STAGES.map((stage, idx) => {
              const isCompleted = idx < provisioningStepIndex;
              const isCurrent = idx === provisioningStepIndex;
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-2 p-1.5 rounded transition-all ${
                    isCurrent
                      ? 'bg-amber-100 font-bold text-amber-900'
                      : isCompleted
                      ? 'text-emerald-700'
                      : 'text-stone-400'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : isCurrent ? (
                    <Loader2 className="w-3.5 h-3.5 text-amber-600 animate-spin shrink-0" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-stone-300 shrink-0" />
                  )}
                  <span>{stage}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div className="pt-4 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          {!validation.isValid && (
            <p className="text-xs font-bold text-rose-700 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>لا يمكن إنشاء المشروع إلا بعد اجتياز جميع التحققات وحل التضاربات.</span>
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => onJumpToStep(6)}
            disabled={isProvisioning}
            className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
          >
            الرجوع للخطوة السابقة
          </button>

          <button
            type="button"
            id="btn-provision-project"
            disabled={!validation.isValid || isProvisioning}
            onClick={onProvision}
            className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all ${
              validation.isValid && !isProvisioning
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 ring-2 ring-emerald-500/30 cursor-pointer'
                : 'bg-stone-200 text-stone-400 cursor-not-allowed border border-stone-300'
            }`}
          >
            {isProvisioning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جارٍ تهيئة المشروع...</span>
              </>
            ) : (
              <>
                <Database className="w-4 h-4" />
                <span>تأكيد وتأسيس المشروع في Firestore (Provision Project)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
