import React from 'react';
import { X, Printer, ShieldCheck, Building2, Calendar, FileText } from 'lucide-react';
import { ReportDataset } from '../../types/reports';
import { reportsEngineService } from '../../services/reportsEngine.service';

interface PrintableReportModalProps {
  dataset: ReportDataset;
  onClose: () => void;
}

export const PrintableReportModal: React.FC<PrintableReportModalProps> = ({ dataset, onClose }) => {
  const projectId = dataset.filtersApplied.projectId;
  const projectLookup = reportsEngineService.getMasterDataLookup(projectId) || reportsEngineService.getMasterDataLookup('ALL');
  const projectInfo = projectLookup?.projects?.get(projectId);
  const projectName = projectInfo?.nameAr || (projectId === 'ALL' ? 'كافة المشاريع الإنشائية' : projectId);
  const zatcaTaxNo = (projectInfo as any)?.settings?.zatcaTaxNumber || '300012345600003';
  const referenceCode = `REP-${dataset.reportType.slice(0, 4)}-${Date.now().toString().slice(-6)}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:overflow-visible">
      {/* Container */}
      <div 
        id="printable-report-document"
        className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:rounded-none border border-stone-200"
      >
        {/* Modal Top Action Bar (Hidden during print) */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-stone-900 text-white print:hidden">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-sm">معاينة المستند المعتمد للطباعة وتصدير PDF</span>
            <span className="text-xs bg-stone-800 text-stone-300 px-2 py-0.5 rounded font-mono">
              {referenceCode}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة / حفظ كـ PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Document Body */}
        <div className="p-8 sm:p-10 overflow-y-auto print:overflow-visible space-y-6 text-stone-900 font-sans">
          
          {/* 1. Official Header */}
          <div className="border-b-2 border-stone-800 pb-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-stone-600 uppercase">
                  <span>المملكة العربية السعودية</span>
                  <span>•</span>
                  <span>منظومة تتبع وإدارة النقل اللوجستي للمشاريع الكبرى</span>
                </div>
                <h1 className="text-2xl font-black text-stone-950 mt-1">
                  {dataset.titleAr}
                </h1>
                <p className="text-xs text-stone-500 font-mono tracking-tight mt-0.5">
                  {dataset.titleEn} — Ref: {referenceCode}
                </p>
              </div>

              <div className="text-left sm:text-right border-r sm:border-r-0 sm:border-l border-stone-300 pr-3 sm:pr-0 sm:pl-4">
                <div className="text-xs font-bold text-stone-800">{projectName}</div>
                <div className="text-[11px] text-stone-600 font-mono">الرقم الضريبي ZATCA: {zatcaTaxNo}</div>
                <div className="text-[11px] text-stone-500">
                  تاريخ الإصدار: {new Date(dataset.generatedAt).toLocaleDateString('ar-SA')} ({new Date(dataset.generatedAt).toLocaleTimeString('ar-SA')})
                </div>
              </div>
            </div>

            {/* Applied Filters Strip */}
            <div className="mt-4 bg-stone-50 p-2.5 rounded-lg border border-stone-200 text-xs flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <span className="font-bold text-stone-700">معايير الفلترة المطبقة:</span>
              <span className="text-stone-600">المشروع: <strong>{projectName}</strong></span>
              <span className="text-stone-600">
                الفترة: <strong>{dataset.filtersApplied.shiftDateFrom || 'البداية'} إلى {dataset.filtersApplied.shiftDateTo || 'النهاية'}</strong>
              </span>
              {dataset.filtersApplied.carrierId && dataset.filtersApplied.carrierId !== 'ALL' && (
                <span className="text-stone-600">الناقل: <strong>{dataset.filtersApplied.carrierId}</strong></span>
              )}
              {dataset.filtersApplied.materialId && dataset.filtersApplied.materialId !== 'ALL' && (
                <span className="text-stone-600">المادة: <strong>{dataset.filtersApplied.materialId}</strong></span>
              )}
              {dataset.filtersApplied.pricingType && dataset.filtersApplied.pricingType !== 'ALL' && (
                <span className="text-stone-600">نموذج التسعير: <strong>{dataset.filtersApplied.pricingType}</strong></span>
              )}
              {dataset.filtersApplied.status && dataset.filtersApplied.status !== 'ALL' && (
                <span className="text-stone-600">حالة الرحلة: <strong>{dataset.filtersApplied.status}</strong></span>
              )}
            </div>
          </div>

          {/* 2. Executive 4 Financial Totals & Operations Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200">
              <div className="text-[11px] font-bold text-stone-500">المبلغ الإجمالي التعاقدي (Gross)</div>
              <div className="text-lg font-black text-stone-900 mt-1 font-mono">
                {dataset.summary.grossAmountSAR.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-normal">SAR</span>
              </div>
              <div className="text-[10px] text-stone-500 mt-0.5">مبني على settlementAmount بالرحلة</div>
            </div>

            <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200">
              <div className="text-[11px] font-bold text-emerald-800">التعديلات المعتمدة (Adjustments)</div>
              <div className="text-lg font-black text-emerald-900 mt-1 font-mono">
                +{dataset.summary.adjustmentsSAR.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-normal">SAR</span>
              </div>
              <div className="text-[10px] text-emerald-700 mt-0.5">بدلات انتظار وتسامح موازين</div>
            </div>

            <div className="bg-rose-50/70 p-3.5 rounded-xl border border-rose-200">
              <div className="text-[11px] font-bold text-rose-800">الاستثناءات والخصومات (Exceptions)</div>
              <div className="text-lg font-black text-rose-900 mt-1 font-mono">
                -{dataset.summary.exceptionsSAR.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-normal">SAR</span>
              </div>
              <div className="text-[10px] text-rose-700 mt-0.5">خصم عجز الميزان والرحلات المرتجعة</div>
            </div>

            <div className="bg-amber-500/10 p-3.5 rounded-xl border-2 border-amber-500">
              <div className="text-[11px] font-bold text-amber-900">صافي المستحق النهائي (Net Amount)</div>
              <div className="text-xl font-black text-amber-950 mt-1 font-mono">
                {dataset.summary.netAmountSAR.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-normal">SAR</span>
              </div>
              <div className="text-[10px] text-amber-800 font-bold mt-0.5">صافي الالتزام المالي النهائي</div>
            </div>
          </div>

          {/* Operational Secondary Badges */}
          <div className="flex flex-wrap items-center justify-between text-xs bg-stone-100/70 px-4 py-2 rounded-lg text-stone-700 font-semibold">
            <span>إجمالي الردود المنفذة: <strong>{dataset.summary.totalTrips} رد</strong></span>
            <span>صافي الوزن المنقول: <strong>{dataset.summary.totalNetWeightTons.toLocaleString()} طن متري</strong></span>
            <span>الردود المكتملة: <strong>{dataset.summary.completedTripsCount}</strong></span>
            <span>الردود المرتجعة: <strong>{dataset.summary.returnedTripsCount}</strong></span>
            <span>حالات الاستثناء النشطة: <strong>{dataset.summary.exceptionsCount}</strong></span>
          </div>

          {/* 3. Detailed Data Table */}
          <div className="overflow-x-auto border border-stone-200 rounded-xl">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-stone-800 text-stone-100 font-bold">
                  <th className="p-2.5 text-center w-10">#</th>
                  {dataset.columns.map((c) => (
                    <th 
                      key={c.key} 
                      className={`p-2.5 border-r border-stone-700/50 ${
                        c.align === 'center' ? 'text-center' : c.align === 'left' ? 'text-left' : 'text-right'
                      }`}
                    >
                      {c.labelAr}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 font-normal">
                {dataset.rows.length === 0 ? (
                  <tr>
                    <td colSpan={dataset.columns.length + 1} className="p-6 text-center text-stone-500">
                      لا توجد بيانات مطابقة لمعايير الفلترة المحددة.
                    </td>
                  </tr>
                ) : (
                  dataset.rows.map((row, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-stone-50/50'}>
                      <td className="p-2 text-center text-stone-400 font-mono text-[11px] border-l border-stone-200">
                        {idx + 1}
                      </td>
                      {dataset.columns.map((col) => {
                        const val = row[col.key];
                        return (
                          <td 
                            key={col.key} 
                            className={`p-2 border-l border-stone-200 ${
                              col.align === 'center' ? 'text-center' : col.align === 'left' ? 'text-left font-mono' : 'text-right'
                            }`}
                          >
                            {col.format === 'currency' && typeof val === 'number'
                              ? val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                              : col.format === 'number' && typeof val === 'number'
                              ? val.toLocaleString()
                              : val !== undefined && val !== null ? String(val) : '-'}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 4. Contractual Notes & Rules Compliance */}
          <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-950 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              <span>إقرار التدقيق والامتثال التعاقدي (Contractual Compliance):</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-900">
              تعتمد المبالغ المعروضة في هذا التقرير حصرياً على لقطات التسعير التعاقدية (settlementAmount) المثبتة لحظة إصدار كل رحلة، مع تطبيق قواعد الحساب الصارمة: PER_TRIP (عدد الرحلات × سعر الرحلة)، PER_TON (صافي الأطنان × سعر الطن). لا تتم إعادة تسعير الرحلات التاريخية بالأسعار الحالية تحت أي ظرف امتثالاً لمبدأ Snapshot Invariance المعتمد.
            </p>
          </div>

          {/* 5. Formal Certification & Signature Blocks */}
          <div className="pt-6 border-t-2 border-stone-300 grid grid-cols-3 gap-6 text-center text-xs">
            <div className="space-y-6">
              <div className="font-bold text-stone-700">إعداد / مسؤول الحركة والموازين</div>
              <div className="h-12 border-b border-dashed border-stone-400 mx-6"></div>
              <div className="text-[11px] text-stone-500">التوقيع والتاريخ: _______________</div>
            </div>

            <div className="space-y-6">
              <div className="font-bold text-stone-700">تدقيق / إدارة العقود والرقابة المالية</div>
              <div className="h-12 border-b border-dashed border-stone-400 mx-6"></div>
              <div className="text-[11px] text-stone-500">التوقيع والختم: _______________</div>
            </div>

            <div className="space-y-6">
              <div className="font-bold text-stone-700">اعتماد / مدير المشروع التنفيذي</div>
              <div className="h-12 border-b border-dashed border-stone-400 mx-6"></div>
              <div className="text-[11px] text-stone-500">التوقيع والاعتماد: _______________</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
