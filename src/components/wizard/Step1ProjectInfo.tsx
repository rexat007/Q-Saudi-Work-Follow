import React from 'react';
import { ProjectInfoStep } from '../../types/wizard';
import { Building2, Calendar, FileText, Settings, ShieldCheck, MapPin } from 'lucide-react';

interface Step1Props {
  data: ProjectInfoStep;
  onChange: (updated: ProjectInfoStep) => void;
  errors?: string[];
}

export const Step1ProjectInfo: React.FC<Step1Props> = ({ data, onChange, errors = [] }) => {
  const updateField = <K extends keyof ProjectInfoStep>(field: K, value: ProjectInfoStep[K]) => {
    onChange({
      ...data,
      [field]: value,
    });
  };

  const updateSetting = <K extends keyof ProjectInfoStep['defaultSettings']>(
    key: K,
    value: ProjectInfoStep['defaultSettings'][K]
  ) => {
    onChange({
      ...data,
      defaultSettings: {
        ...data.defaultSettings,
        [key]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-200">
        <div>
          <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-600" />
            الخطوة 1: بيانات المشروع الأساسية (Project Information)
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            حدد الرمز النظامي للمشروع، الاسم المعتمد، نطاق العمليات، وفترة السريان التشغيلية.
          </p>
        </div>
        <div className="mt-2 sm:mt-0 flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-stone-100 text-stone-700 border border-stone-200">
            رمز المشروع: {data.projectCode || 'لم يحدد'}
          </span>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 space-y-1">
          <p className="font-semibold">يرجى تصحيح الملاحظات التالية في بيانات المشروع:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {errors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Project Code */}
        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1">
            رمز المشروع التعريفي (projectCode) <span className="text-rose-500">*</span>
          </label>
          <input
            id="input-project-code"
            type="text"
            value={data.projectCode}
            onChange={(e) => updateField('projectCode', e.target.value.toUpperCase())}
            placeholder="e.g. PRJ-NEOM-WEST-01"
            className="w-full text-sm font-mono uppercase px-3 py-2 bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
          />
          <p className="text-[11px] text-stone-400 mt-1">
            معرف وحيد للمشروع في Firestore يمنع تعديله بعد الإنشاء.
          </p>
        </div>

        {/* Project Name */}
        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1">
            اسم المشروع بالعربية (projectName) <span className="text-rose-500">*</span>
          </label>
          <input
            id="input-project-name"
            type="text"
            value={data.projectName}
            onChange={(e) => updateField('projectName', e.target.value)}
            placeholder="e.g. مشروع ناقلات نيوم - قطاع ركام البنية التحتية"
            className="w-full text-sm px-3 py-2 bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
          />
          <p className="text-[11px] text-stone-400 mt-1">الاسم التجاري والتشغيلي المعتمد في السندات والفواتير.</p>
        </div>

        {/* Client Name */}
        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1">
            الجهة المالكة / العميل الرئيسي (Client Name)
          </label>
          <input
            id="input-client-name"
            type="text"
            value={data.clientName}
            onChange={(e) => updateField('clientName', e.target.value)}
            placeholder="e.g. شركة نيوم للتطوير اللوجستي"
            className="w-full text-sm px-3 py-2 bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1">
            حالة المشروع التشغيلية (status) <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(
              [
                { key: 'ACTIVE', label: 'نشط', color: 'border-emerald-500 bg-emerald-50 text-emerald-900' },
                { key: 'PLANNING', label: 'تخطيط', color: 'border-sky-500 bg-sky-50 text-sky-900' },
                { key: 'SUSPENDED', label: 'معلق', color: 'border-amber-500 bg-amber-50 text-amber-900' },
                { key: 'ARCHIVED', label: 'مؤرشف', color: 'border-stone-500 bg-stone-100 text-stone-700' },
              ] as const
            ).map((st) => (
              <button
                key={st.key}
                type="button"
                id={`status-btn-${st.key}`}
                onClick={() => updateField('status', st.key)}
                className={`py-2 px-2 text-xs font-semibold rounded-lg border text-center transition-all ${
                  data.status === st.key
                    ? `${st.color} shadow-xs font-bold ring-1 ring-offset-1`
                    : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dates */}
        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-stone-500" />
            تاريخ بدء العمليات (startDate) <span className="text-rose-500">*</span>
          </label>
          <input
            id="input-start-date"
            type="date"
            value={data.startDate}
            onChange={(e) => updateField('startDate', e.target.value)}
            className="w-full text-sm px-3 py-2 bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-stone-500" />
            تاريخ انتهاء المشروع (endDate) - اختياري
          </label>
          <input
            id="input-end-date"
            type="date"
            value={data.endDate}
            onChange={(e) => updateField('endDate', e.target.value)}
            className="w-full text-sm px-3 py-2 bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
          <FileText className="w-3.5 h-3.5 text-stone-500" />
          وصف المشروع ونطاق العمليات اللوجستية (description)
        </label>
        <textarea
          id="input-description"
          rows={3}
          value={data.description}
          onChange={(e) => updateField('description', e.target.value)}
          placeholder="أدخل ملخصاً عن نطاق المشروع، وجهات التوريد، ونوع الشاحنات المستخدمة..."
          className="w-full text-sm px-3 py-2 bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden resize-none"
        />
      </div>

      {/* Default Settings Section */}
      <div className="bg-stone-50/80 rounded-xl p-4 border border-stone-200">
        <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Settings className="w-4 h-4 text-stone-600" />
          الإعدادات الافتراضية والامتثال النظامي (Default Settings & Compliance)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-stone-700 mb-1">
              العملة التشغيلية (currency)
            </label>
            <input
              type="text"
              value={data.defaultSettings.currency}
              onChange={(e) => updateSetting('currency', e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-md font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-stone-700 mb-1">
              نسبة ضريبة القيمة المضافة % (VAT)
            </label>
            <input
              type="number"
              value={data.defaultSettings.vatRatePercent}
              onChange={(e) => updateSetting('vatRatePercent', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-md font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-stone-700 mb-1">
              الرقم الضريبي للمنشأة ZATCA (15 رقماً)
            </label>
            <input
              type="text"
              maxLength={15}
              value={data.defaultSettings.zatcaTaxNumber}
              onChange={(e) => updateSetting('zatcaTaxNumber', e.target.value)}
              placeholder="300000000000003"
              className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-md font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-stone-700 mb-1">
              التفاوت المسموح في أوزان الشاحنات (كجم)
            </label>
            <input
              type="number"
              value={data.defaultSettings.maxToleranceKg}
              onChange={(e) => updateSetting('maxToleranceKg', parseInt(e.target.value, 10) || 0)}
              className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-md font-mono"
            />
          </div>

          <div className="flex items-center gap-2 pt-5">
            <input
              id="cb-tare"
              type="checkbox"
              checked={data.defaultSettings.requireTareOnExit}
              onChange={(e) => updateSetting('requireTareOnExit', e.target.checked)}
              className="w-4 h-4 text-amber-600 rounded-sm border-stone-300 focus:ring-amber-500"
            />
            <label htmlFor="cb-tare" className="font-semibold text-stone-700 cursor-pointer">
              إلزامية وزن الفارغ عند مغادرة الميزان
            </label>
          </div>

          <div className="flex items-center gap-2 pt-5">
            <input
              id="cb-self-dispatch"
              type="checkbox"
              checked={data.defaultSettings.allowDriverSelfDispatch}
              onChange={(e) => updateSetting('allowDriverSelfDispatch', e.target.checked)}
              className="w-4 h-4 text-amber-600 rounded-sm border-stone-300 focus:ring-amber-500"
            />
            <label htmlFor="cb-self-dispatch" className="font-semibold text-stone-700 cursor-pointer">
              السماح بالتسجيل الذاتي للسائقين
            </label>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-stone-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block font-semibold text-stone-700 mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-stone-500" />
              العنوان / الموقع الجغرافي للمشروع
            </label>
            <input
              type="text"
              value={data.defaultSettings.addressAr}
              onChange={(e) => updateSetting('addressAr', e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-md"
              placeholder="e.g. تبوك - قطاع العمليات 4"
            />
          </div>
          <div>
            <label className="block font-semibold text-stone-700 mb-1">
              نصف قطر السياج الجغرافي للموقع (GeoFence بالمتر)
            </label>
            <input
              type="number"
              value={data.defaultSettings.geoFenceRadiusMeters}
              onChange={(e) => updateSetting('geoFenceRadiusMeters', parseInt(e.target.value, 10) || 1000)}
              className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-md font-mono"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
