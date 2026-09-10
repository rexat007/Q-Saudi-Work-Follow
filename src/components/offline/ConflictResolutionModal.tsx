import React, { useState } from 'react';
import { 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  Scale, 
  FileText, 
  ArrowRightLeft, 
  DollarSign, 
  Layers, 
  Clock, 
  Server, 
  Smartphone, 
  Lock, 
  RefreshCw,
  HelpCircle
} from 'lucide-react';
import { ConflictRecord, ResolutionStrategy, ConflictType } from '../../types/conflict';
import { conflictResolutionService } from '../../services/offline/conflictResolution.service';

interface ConflictResolutionModalProps {
  conflict: ConflictRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onResolved?: (conflictId: string, message: string) => void;
}

export const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  conflict,
  isOpen,
  onClose,
  onResolved
}) => {
  const [selectedStrategy, setSelectedStrategy] = useState<ResolutionStrategy | null>(null);
  const [justification, setJustification] = useState<string>('');
  const [isResolving, setIsResolving] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<'DIFF' | 'RAW'>('DIFF');

  if (!isOpen || !conflict) return null;

  // Set default strategy based on conflict type
  const getDefaultStrategy = (type: ConflictType): ResolutionStrategy => {
    switch (type) {
      case 'PRICING_CHANGED':
        return 'PRESERVE_PRICING_SNAPSHOT'; // Default is strict pricing invariance!
      case 'VERSION_CONFLICT':
        return 'ACCEPT_SERVER_STATE';
      case 'TRIP_ALREADY_COMPLETED':
      case 'TRIP_ALREADY_RETURNED':
        return 'ACCEPT_SERVER_STATE';
      case 'DUPLICATE_OPERATION':
        return 'DISCARD_DUPLICATE';
      case 'TRUCK_CARRIER_CONFLICT':
      case 'MASTER_DATA_CHANGED':
        return 'UPDATE_MASTER_DATA_RELATION';
      default:
        return 'ACCEPT_SERVER_STATE';
    }
  };

  const currentStrategy = selectedStrategy || getDefaultStrategy(conflict.conflictType);

  const handleResolve = async () => {
    if (!currentStrategy) return;
    setIsResolving(true);
    try {
      const res = await conflictResolutionService.resolveConflict(conflict.conflictId, {
        strategy: currentStrategy,
        resolvedBy: 'مشرف العمليات الميدانية (Scale Supervisor)',
        justification: justification.trim() || 'تم اعتماد القرار وفق سياسات الحوكمة ومنع الكتابة التلقائية',
      });

      onResolved?.(conflict.conflictId, res.messageAr);
      onClose();
    } catch (err: any) {
      alert(err.message || 'فشلت معالجة التعارض');
    } finally {
      setIsResolving(false);
    }
  };

  const getConflictTypeBadge = (type: ConflictType) => {
    const map: Record<ConflictType, { label: string; color: string; desc: string }> = {
      VERSION_CONFLICT: {
        label: 'تعارض إصدار (VERSION_CONFLICT)',
        color: 'bg-indigo-100 text-indigo-900 border-indigo-300',
        desc: 'السجل على الخادم تم تعديله بالتوازي بإصدار أحدث.'
      },
      PRICING_CHANGED: {
        label: 'تحديث سعر الخادم (PRICING_CHANGED)',
        color: 'bg-amber-100 text-amber-900 border-amber-300',
        desc: 'تم تحديث سعر القاعدة على الخادم؛ تحمي المنظومة لقطة السعر وقت الإنشاء.'
      },
      TRIP_ALREADY_COMPLETED: {
        label: 'الرحلة مكتملة خادومياً (TRIP_ALREADY_COMPLETED)',
        color: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        desc: 'تم استلام وتفريغ الرحلة وإغلاقها مسبقاً في الموقع.'
      },
      TRIP_ALREADY_RETURNED: {
        label: 'الرحلة مرتجعة (TRIP_ALREADY_RETURNED)',
        color: 'bg-rose-100 text-rose-900 border-rose-300',
        desc: 'تم تسجيل رفض أو إرجاع الشحنة على الخادم.'
      },
      DUPLICATE_OPERATION: {
        label: 'عملية مكررة (DUPLICATE_OPERATION)',
        color: 'bg-orange-100 text-orange-900 border-orange-300',
        desc: 'رقم التذكرة أو الرحلة مسجل مسبقاً لعملية أخرى.'
      },
      TRUCK_CARRIER_CONFLICT: {
        label: 'تعارض الناقل للشاحنة (TRUCK_CARRIER_CONFLICT)',
        color: 'bg-purple-100 text-purple-900 border-purple-300',
        desc: 'تبعية الشاحنة للناقل بالخادم تختلف عن الذاكرة المحلية.'
      },
      MASTER_DATA_CHANGED: {
        label: 'تغيير بيانات أساسية (MASTER_DATA_CHANGED)',
        color: 'bg-cyan-100 text-cyan-900 border-cyan-300',
        desc: 'أحد الكيانات (المشروع/المادة/الناقل) تم إيقافه أو تعديل مواصفاته.'
      },
    };
    const c = map[type] || { label: type, color: 'bg-stone-100 text-stone-800 border-stone-300', desc: '' };
    return (
      <div className="space-y-1">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${c.color}`}>
          {c.label}
        </span>
        <p className="text-xs text-stone-500">{c.desc}</p>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-stone-200 overflow-hidden">
        
        {/* Header */}
        <div className="bg-stone-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-stone-100">مركز معالجة التعارضات التشغيلية (Conflict Resolution)</h3>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-stone-800 text-amber-300 border border-amber-500/30">
                  {conflict.conflictId}
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                مبدأ إلزامي: منع "آخر كتابة تفوز" (Anti Last-Write-Wins) لحماية سلامة بيانات الرحلات
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1.5 rounded-lg hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Anti-LWW & Conflict Notice */}
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-start gap-3 text-xs text-amber-950">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-bold">{conflict.titleAr}</div>
            <div className="text-amber-900 leading-relaxed">{conflict.descriptionAr}</div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Pricing Invariance Guarantee Card (if PRICING_CHANGED or pricingProtection exists) */}
          {conflict.pricingProtection && (
            <div className="bg-emerald-50/80 border-2 border-emerald-300 rounded-xl p-4.5 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-950 font-bold text-sm">
                  <Lock className="w-4 h-4 text-emerald-700" />
                  <span>ضمانة ثبات تسعير الـ Offline (Pricing Snapshot Invariance)</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-200/80 text-emerald-900 border border-emerald-300">
                  سعر محمي تعاقدياً
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="bg-white p-3 rounded-lg border border-emerald-200">
                  <span className="text-stone-500 block text-[11px]">سعر لقطة وثيقة التحميل (Snapshot):</span>
                  <div className="text-base font-bold text-emerald-900 font-mono mt-0.5">
                    {conflict.pricingProtection.snapshotRate} {conflict.pricingProtection.currency} / طن
                  </div>
                  <span className="text-[10px] text-emerald-700 block mt-1">ساري وقت إنشاء الرحلة بدون اتصال</span>
                </div>

                <div className="bg-white p-3 rounded-lg border border-emerald-200">
                  <span className="text-stone-500 block text-[11px]">السعر المحدث على الخادم (Server):</span>
                  <div className="text-base font-bold text-amber-900 font-mono mt-0.5">
                    {conflict.pricingProtection.serverCurrentRate} {conflict.pricingProtection.currency} / طن
                  </div>
                  <span className="text-[10px] text-amber-700 block mt-1">
                    فارق السعر: {conflict.pricingProtection.rateDifference > 0 ? `+${conflict.pricingProtection.rateDifference}` : conflict.pricingProtection.rateDifference} ر.س
                  </span>
                </div>

                <div className="bg-white p-3 rounded-lg border border-emerald-200">
                  <span className="text-stone-500 block text-[11px]">القاعدة المعمارية الصارمة:</span>
                  <p className="text-[11px] text-stone-700 font-medium leading-relaxed mt-0.5">
                    لا يتم تغيير قيمة هذه الرحلة لاحقاً بسبب تحديث السعر. السعر الجديد يستخدم فقط للرحلات المستقبلية.
                  </p>
                </div>
              </div>

              <div className="text-[11px] text-emerald-900 bg-emerald-100/70 p-2.5 rounded-lg border border-emerald-200 leading-relaxed font-medium">
                {conflict.pricingProtection.policyNoteAr}
              </div>
            </div>
          )}

          {/* Side-by-Side Comparison: Preserved Local Command vs Preserved Server State */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                <ArrowRightLeft className="w-4 h-4 text-stone-500" />
                <span>مقارنة الحالة المحفوظة (Preserved Local Command vs Server State)</span>
              </h4>
              <div className="flex items-center gap-1 text-xs">
                <button
                  onClick={() => setActiveView('DIFF')}
                  className={`px-2.5 py-1 rounded-md font-bold transition-colors ${
                    activeView === 'DIFF' ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  جدول الفروقات (Diff)
                </button>
                <button
                  onClick={() => setActiveView('RAW')}
                  className={`px-2.5 py-1 rounded-md font-bold transition-colors ${
                    activeView === 'RAW' ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  البيانات الخام (JSON)
                </button>
              </div>
            </div>

            {activeView === 'DIFF' ? (
              <div className="border border-stone-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-right text-xs">
                  <thead className="bg-stone-100 text-stone-700 border-b border-stone-200">
                    <tr>
                      <th className="py-2.5 px-4 font-bold">الحقل</th>
                      <th className="py-2.5 px-4 font-bold flex items-center gap-1">
                        <Smartphone className="w-3.5 h-3.5 text-amber-600" />
                        <span>الأمر الميداني المحلي (Local Command)</span>
                      </th>
                      <th className="py-2.5 px-4 font-bold">
                        <div className="flex items-center gap-1">
                          <Server className="w-3.5 h-3.5 text-blue-600" />
                          <span>حالة الخادم (Server State)</span>
                        </div>
                      </th>
                      <th className="py-2.5 px-4 font-bold">ملاحظات التحكيم</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 bg-white">
                    {conflict.diffFields.map((df, idx) => (
                      <tr key={idx} className="hover:bg-amber-50/40 transition-colors">
                        <td className="py-3 px-4 font-bold text-stone-800">
                          <div>{df.fieldLabelAr}</div>
                          <span className="font-mono text-[10px] text-stone-400">{df.field}</span>
                        </td>
                        <td className="py-3 px-4 text-stone-900 bg-amber-50/20 font-medium">
                          <span className="px-2 py-0.5 rounded bg-white border border-amber-200 font-mono text-xs">
                            {String(df.localValue)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-stone-900 bg-blue-50/20 font-medium">
                          <span className="px-2 py-0.5 rounded bg-white border border-blue-200 font-mono text-xs">
                            {String(df.serverValue)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-stone-600 text-[11px]">
                          {df.isProtectedBySnapshot ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                              <Lock className="w-3 h-3" />
                              <span>محمي باللقطة</span>
                            </span>
                          ) : (
                            df.notesAr || 'يتطلب اعتماد المشرف'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="bg-stone-900 text-stone-200 p-3.5 rounded-xl font-mono overflow-x-auto max-h-56 text-left" dir="ltr">
                  <div className="text-amber-400 font-bold mb-1">// 1. Preserved Local Command</div>
                  <pre>{JSON.stringify(conflict.localCommand, null, 2)}</pre>
                </div>
                <div className="bg-stone-900 text-stone-200 p-3.5 rounded-xl font-mono overflow-x-auto max-h-56 text-left" dir="ltr">
                  <div className="text-blue-400 font-bold mb-1">// 2. Preserved Server State</div>
                  <pre>{JSON.stringify(conflict.serverState, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>

          {/* Explicit Resolution Decision Panel */}
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-5 space-y-4">
            <div>
              <h4 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                <Scale className="w-4 h-4 text-amber-600" />
                <span>القرار الإلزامي الصريح (Explicit Resolution Strategy)</span>
              </h4>
              <p className="text-xs text-stone-500 mt-0.5">
                اختر استراتيجية الحل المناسبة مع توثيق سبب القرار في سجل التدقيق الأمني
              </p>
            </div>

            {/* Contextual Options tailored by conflictType */}
            <div className="space-y-2.5">
              {conflict.conflictType === 'PRICING_CHANGED' && (
                <>
                  <label className={`block p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    currentStrategy === 'PRESERVE_PRICING_SNAPSHOT'
                      ? 'border-emerald-500 bg-emerald-50/70 shadow-xs'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}>
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="resolutionStrategy"
                        value="PRESERVE_PRICING_SNAPSHOT"
                        checked={currentStrategy === 'PRESERVE_PRICING_SNAPSHOT'}
                        onChange={() => setSelectedStrategy('PRESERVE_PRICING_SNAPSHOT')}
                        className="mt-1 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div className="space-y-1">
                        <div className="font-bold text-xs text-emerald-950 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>الخيار القياسي المعتمد: المحافظة على سعر لقطة وثيقة التحميل (Lock Snapshot Rate)</span>
                        </div>
                        <p className="text-xs text-emerald-900 leading-relaxed">
                          الالتزام الصارم بسعر اللقطة المحفوظة ({conflict.pricingProtection?.snapshotRate} ر.س/طن) وعدم تغيير قيمة الرحلة، مع قصر السعر الخادومي الجديد على الرحلات المستقبلية فقط.
                        </p>
                      </div>
                    </div>
                  </label>

                  <label className={`block p-3.5 rounded-xl border cursor-pointer transition-all ${
                    currentStrategy === 'OVERRIDE_TO_NEW_PRICING'
                      ? 'border-amber-500 bg-amber-50/70 shadow-xs'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}>
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="resolutionStrategy"
                        value="OVERRIDE_TO_NEW_PRICING"
                        checked={currentStrategy === 'OVERRIDE_TO_NEW_PRICING'}
                        onChange={() => setSelectedStrategy('OVERRIDE_TO_NEW_PRICING')}
                        className="mt-1 text-amber-600 focus:ring-amber-500"
                      />
                      <div className="space-y-1">
                        <div className="font-bold text-xs text-stone-900">
                          استثناء إداري: إعادة الاحتساب بالسعر الخادومي الجديد ({conflict.pricingProtection?.serverCurrentRate} ر.س/طن)
                        </div>
                        <p className="text-xs text-stone-600 leading-relaxed">
                          يتطلب موافقة خطية ومبرراً رسمياً لتعديل سعر التعاقد الأصلي للرحلة.
                        </p>
                      </div>
                    </div>
                  </label>
                </>
              )}

              {conflict.conflictType === 'VERSION_CONFLICT' && (
                <>
                  <label className={`block p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    currentStrategy === 'ACCEPT_SERVER_STATE'
                      ? 'border-blue-500 bg-blue-50/70 shadow-xs'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}>
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="resolutionStrategy"
                        value="ACCEPT_SERVER_STATE"
                        checked={currentStrategy === 'ACCEPT_SERVER_STATE'}
                        onChange={() => setSelectedStrategy('ACCEPT_SERVER_STATE')}
                        className="mt-1 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="space-y-1">
                        <div className="font-bold text-xs text-blue-950">
                          اعتماد حالة الخادم (Accept Server State)
                        </div>
                        <p className="text-xs text-blue-900 leading-relaxed">
                          الاحتفاظ ببيانات الخادم الحالية v{conflict.serverState.serverVersion} وإلغاء التعديل المحلي القديم.
                        </p>
                      </div>
                    </div>
                  </label>

                  <label className={`block p-3.5 rounded-xl border cursor-pointer transition-all ${
                    currentStrategy === 'FORCE_CLIENT_STATE'
                      ? 'border-amber-500 bg-amber-50/70 shadow-xs'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}>
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="resolutionStrategy"
                        value="FORCE_CLIENT_STATE"
                        checked={currentStrategy === 'FORCE_CLIENT_STATE'}
                        onChange={() => setSelectedStrategy('FORCE_CLIENT_STATE')}
                        className="mt-1 text-amber-600 focus:ring-amber-500"
                      />
                      <div className="space-y-1">
                        <div className="font-bold text-xs text-stone-900">
                          فرض الأمر المحلي بالإصدار الجديد (Force Local With Audit)
                        </div>
                        <p className="text-xs text-stone-600 leading-relaxed">
                          تطبيق الأمر الميداني فوق بيانات الخادم مع رفع رقم الإصدار تلقائياً وتوثيق هوية المشرف.
                        </p>
                      </div>
                    </div>
                  </label>
                </>
              )}

              {(conflict.conflictType === 'TRIP_ALREADY_COMPLETED' || conflict.conflictType === 'TRIP_ALREADY_RETURNED') && (
                <>
                  <label className={`block p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    currentStrategy === 'ACCEPT_SERVER_STATE'
                      ? 'border-emerald-500 bg-emerald-50/70 shadow-xs'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}>
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="resolutionStrategy"
                        value="ACCEPT_SERVER_STATE"
                        checked={currentStrategy === 'ACCEPT_SERVER_STATE'}
                        onChange={() => setSelectedStrategy('ACCEPT_SERVER_STATE')}
                        className="mt-1 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div className="space-y-1">
                        <div className="font-bold text-xs text-stone-900">
                          الالتزام بقرار الخادم النهائي ({conflict.serverState.status})
                        </div>
                        <p className="text-xs text-stone-600 leading-relaxed">
                          إغلاق العملية المعلقة واعتبار الرحلة في حالتها النهائية المسجلة خادومياً.
                        </p>
                      </div>
                    </div>
                  </label>

                  <label className={`block p-3.5 rounded-xl border cursor-pointer transition-all ${
                    currentStrategy === 'CANCEL_LOCAL_OPERATION'
                      ? 'border-rose-500 bg-rose-50/70 shadow-xs'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}>
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="resolutionStrategy"
                        value="CANCEL_LOCAL_OPERATION"
                        checked={currentStrategy === 'CANCEL_LOCAL_OPERATION'}
                        onChange={() => setSelectedStrategy('CANCEL_LOCAL_OPERATION')}
                        className="mt-1 text-rose-600 focus:ring-rose-500"
                      />
                      <div className="space-y-1">
                        <div className="font-bold text-xs text-rose-900">
                          إلغاء العملية المحلية مع تسجيل تقرير تباين تشغيلي (Exception Report)
                        </div>
                        <p className="text-xs text-stone-600 leading-relaxed">
                          حذف العملية من طابور الصادر وحفظ ملف التدقيق للمراجعة اللوجستية.
                        </p>
                      </div>
                    </div>
                  </label>
                </>
              )}

              {conflict.conflictType === 'DUPLICATE_OPERATION' && (
                <>
                  <label className={`block p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    currentStrategy === 'DISCARD_DUPLICATE'
                      ? 'border-blue-500 bg-blue-50/70 shadow-xs'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}>
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="resolutionStrategy"
                        value="DISCARD_DUPLICATE"
                        checked={currentStrategy === 'DISCARD_DUPLICATE'}
                        onChange={() => setSelectedStrategy('DISCARD_DUPLICATE')}
                        className="mt-1 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="space-y-1">
                        <div className="font-bold text-xs text-stone-900">
                          استبعاد العملية المكررة (Discard Duplicate)
                        </div>
                        <p className="text-xs text-stone-600 leading-relaxed">
                          إلغاء التذكرة المكررة محلياً حيث تم ترحيلها بنجاح مسبقاً.
                        </p>
                      </div>
                    </div>
                  </label>

                  <label className={`block p-3.5 rounded-xl border cursor-pointer transition-all ${
                    currentStrategy === 'ASSIGN_NEW_SERIAL'
                      ? 'border-amber-500 bg-amber-50/70 shadow-xs'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}>
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="resolutionStrategy"
                        value="ASSIGN_NEW_SERIAL"
                        checked={currentStrategy === 'ASSIGN_NEW_SERIAL'}
                        onChange={() => setSelectedStrategy('ASSIGN_NEW_SERIAL')}
                        className="mt-1 text-amber-600 focus:ring-amber-500"
                      />
                      <div className="space-y-1">
                        <div className="font-bold text-xs text-stone-900">
                          إعادة إصدار رقم تذكرة جديد واعتماد الرحلة (Re-issue Ticket)
                        </div>
                        <p className="text-xs text-stone-600 leading-relaxed">
                          توليد رقم تذكرة ميزان جديد فريد لتفادي التكرار واعتماد قيد الرحلة.
                        </p>
                      </div>
                    </div>
                  </label>
                </>
              )}

              {(conflict.conflictType === 'TRUCK_CARRIER_CONFLICT' || conflict.conflictType === 'MASTER_DATA_CHANGED') && (
                <>
                  <label className={`block p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    currentStrategy === 'UPDATE_MASTER_DATA_RELATION'
                      ? 'border-emerald-500 bg-emerald-50/70 shadow-xs'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}>
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="resolutionStrategy"
                        value="UPDATE_MASTER_DATA_RELATION"
                        checked={currentStrategy === 'UPDATE_MASTER_DATA_RELATION'}
                        onChange={() => setSelectedStrategy('UPDATE_MASTER_DATA_RELATION')}
                        className="mt-1 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div className="space-y-1">
                        <div className="font-bold text-xs text-stone-900">
                          تسوية ومطابقة التبعية مع البيانات الأساسية للخادم
                        </div>
                        <p className="text-xs text-stone-600 leading-relaxed">
                          إعادة ربط الشاحنة أو الكيان بالناقل/المشروع المصرح به خادومياً واعتماد الرحلة.
                        </p>
                      </div>
                    </div>
                  </label>

                  <label className={`block p-3.5 rounded-xl border cursor-pointer transition-all ${
                    currentStrategy === 'CANCEL_LOCAL_OPERATION'
                      ? 'border-rose-500 bg-rose-50/70 shadow-xs'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}>
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="resolutionStrategy"
                        value="CANCEL_LOCAL_OPERATION"
                        checked={currentStrategy === 'CANCEL_LOCAL_OPERATION'}
                        onChange={() => setSelectedStrategy('CANCEL_LOCAL_OPERATION')}
                        className="mt-1 text-rose-600 focus:ring-rose-500"
                      />
                      <div className="space-y-1">
                        <div className="font-bold text-xs text-rose-900">
                          إلغاء أمر الرحلة لعدم صلاحية الكيان (Cancel Dispatch)
                        </div>
                        <p className="text-xs text-stone-600 leading-relaxed">
                          رفض ترحيل الشحنة لمخالفتها شروط التفويض في السجل المركزي.
                        </p>
                      </div>
                    </div>
                  </label>
                </>
              )}
            </div>

            {/* Mandatory Justification */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 block">
                مبرر القرار التدقيقي (Audit Justification):
              </label>
              <textarea
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="أدخل مبرر اعتماد القرار التشغيلي لتوثيقه في سجل التدقيق والمراقبة..."
                rows={2}
                className="w-full text-xs p-2.5 rounded-lg border border-stone-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
              />
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-stone-100 p-4 px-6 border-t border-stone-200 flex items-center justify-between">
          <div className="text-xs text-stone-500 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-stone-400" />
            <span>سيتم تسجيل القرار في سجل التدقيق ومزامنة حالة Outbox تلقائياً</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isResolving}
              className="px-4 py-2 rounded-xl border border-stone-300 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-colors"
            >
              إلغاء ومراجعة لاحقاً
            </button>
            <button
              onClick={handleResolve}
              disabled={isResolving}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
            >
              {isResolving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>اعتماد الحل الصريح والترحيل</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
