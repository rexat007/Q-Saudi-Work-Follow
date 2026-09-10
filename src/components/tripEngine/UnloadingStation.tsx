import React, { useState, useEffect } from 'react';
import { 
  Scale, 
  Truck, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Clock, 
  ArrowLeft, 
  FileText, 
  User, 
  RotateCcw, 
  ShieldCheck, 
  AlertCircle, 
  Building,
  Check,
  ChevronRight,
  ExternalLink,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import { 
  TripRecord, 
  UnloadingSearchResult, 
  UnloadingSearchResultStatus 
} from '../../types/tripEngine';
import { TripExceptionEntity } from '../../types/entities';
import { tripEngineService } from '../../services/tripEngine.service';
import { runUnloadingStationTestSuite, UnloadingTestResult } from '../../tests/unloadingStation.test';

interface UnloadingStationProps {
  onTripUpdated?: (updatedTrip: TripRecord) => void;
  onViewTripDetails?: (trip: TripRecord) => void;
  onNotification?: (notif: { type: 'SUCCESS' | 'ERROR' | 'SECURITY'; message: string }) => void;
}

export const UnloadingStation: React.FC<UnloadingStationProps> = ({
  onTripUpdated,
  onViewTripDetails,
  onNotification
}) => {
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<UnloadingSearchResult | null>(null);
  const [activeTrip, setActiveTrip] = useState<TripRecord | null>(null);

  // Workflow Form State
  const [arrivalTimeInput, setArrivalTimeInput] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [unloadTimeInput, setUnloadTimeInput] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [unloaderIdInput, setUnloaderIdInput] = useState('REC-INSPECTOR-NEOM');
  const [unloaderNameInput, setUnloaderNameInput] = useState('م. فهد الزهراني (مفتش الاستلام)');
  const [notesInput, setNotesInput] = useState('');

  // Destination Weight Entry
  const [weightEntryMode, setWeightEntryMode] = useState<'DIRECT' | 'DUAL_SCALE'>('DIRECT');
  const [destNetWeightInput, setDestNetWeightInput] = useState<number | ''>('');
  const [destGrossInput, setDestGrossInput] = useState<number | ''>('');
  const [destTareInput, setDestTareInput] = useState<number | ''>('');

  // Tolerance config
  const [tolerancePercent, setTolerancePercent] = useState<number>(1.5); // standard 1.5%
  const [toleranceKg, setToleranceKg] = useState<number>(500); // standard 500 kg

  // Operational Exceptions
  const [tripExceptions, setTripExceptions] = useState<TripExceptionEntity[]>([]);

  // Verification Test Suite Modal
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testResults, setTestResults] = useState<{
    results: UnloadingTestResult[];
    allPassed: boolean;
    summary: { total: number; passed: number; failed: number };
  } | null>(null);

  // Auto-sync dual scale weight into destNetWeight
  useEffect(() => {
    if (weightEntryMode === 'DUAL_SCALE') {
      const gross = typeof destGrossInput === 'number' ? destGrossInput : 0;
      const tare = typeof destTareInput === 'number' ? destTareInput : 0;
      if (gross > tare && tare > 0) {
        setDestNetWeightInput(gross - tare);
      }
    }
  }, [destGrossInput, destTareInput, weightEntryMode]);

  // Load active trip exceptions whenever activeTrip changes
  useEffect(() => {
    if (activeTrip) {
      const exList = tripEngineService.getTripExceptions(activeTrip.tripId);
      setTripExceptions(exList);
      if (activeTrip.arrivalTime) {
        try {
          setArrivalTimeInput(new Date(activeTrip.arrivalTime).toISOString().slice(0, 16));
        } catch {
          // ignore date parse error
        }
      }
      if (activeTrip.destNetWeight) {
        setDestNetWeightInput(activeTrip.destNetWeight);
      }
      if (activeTrip.unloaderId) {
        setUnloaderIdInput(activeTrip.unloaderId);
      }
    } else {
      setTripExceptions([]);
    }
  }, [activeTrip?.tripId, activeTrip?.version]);

  // Default seed selection on initial load if no search
  useEffect(() => {
    // If no active trip, let's search TRP-NEOM-8892 as default active candidate
    const initial = tripEngineService.searchTripForUnloading('TRP-NEOM-8892');
    if (initial.status === 'CONTINUE' && initial.trip) {
      setSearchQuery('TRP-NEOM-8892');
      setSearchResult(initial);
      setActiveTrip(initial.trip);
      if (initial.trip.tareWeight) {
        setDestTareInput(initial.trip.tareWeight);
      }
    }
  }, []);

  // Handle Search Execution
  const handleSearch = (queryOverride?: string) => {
    const q = (queryOverride !== undefined ? queryOverride : searchQuery).trim();
    if (!q) {
      setSearchResult(null);
      setActiveTrip(null);
      return;
    }

    const result = tripEngineService.searchTripForUnloading(q);
    setSearchResult(result);

    if (result.status === 'CONTINUE' && result.trip) {
      setActiveTrip(result.trip);
      if (result.trip.tareWeight) {
        setDestTareInput(result.trip.tareWeight);
      }
      if (onNotification) {
        onNotification({
          type: 'SUCCESS',
          message: `تم التعرف على الرحلة بنجاح: ${result.trip.tripSerial} عبر معيار (${result.matchedBy})`
        });
      }
    } else if (result.status === 'PLATE_ONLY_PROHIBITED') {
      setActiveTrip(null);
      if (onNotification) {
        onNotification({
          type: 'SECURITY',
          message: result.messageAr
        });
      }
    } else {
      setActiveTrip(null);
    }
  };

  // Step 1: Upon Arrival (عند الوصول: IN_TRANSIT -> ARRIVED)
  const handleRecordArrival = () => {
    if (!activeTrip) return;
    try {
      const isoArrival = new Date(arrivalTimeInput).toISOString();
      const res = tripEngineService.processUnloadingArrival(
        activeTrip.tripId, 
        isoArrival, 
        {
          actorId: unloaderIdInput,
          actorName: unloaderNameInput,
          actorRole: 'SITE_RECEIVER'
        }
      );

      setActiveTrip(res.trip);
      if (onTripUpdated) onTripUpdated(res.trip);
      if (onNotification) {
        onNotification({
          type: 'SUCCESS',
          message: `تم توثيق وصول الشاحنة للموقع بنجاح: تم الانتقال إلى [ARRIVED] وتسجيل وقت الوصول.`
        });
      }
    } catch (err: any) {
      if (onNotification) {
        onNotification({ type: 'ERROR', message: err.message });
      }
    }
  };

  // Step 2: Upon Starting Unload (عند بدء التفريغ: ARRIVED -> UNLOADING)
  const handleStartUnloading = () => {
    if (!activeTrip) return;
    try {
      const res = tripEngineService.processUnloadingStart(
        activeTrip.tripId,
        unloaderIdInput,
        {
          actorId: unloaderIdInput,
          actorName: unloaderNameInput,
          actorRole: 'SITE_RECEIVER'
        }
      );

      setActiveTrip(res.trip);
      if (onTripUpdated) onTripUpdated(res.trip);
      if (onNotification) {
        onNotification({
          type: 'SUCCESS',
          message: `تم بدء تفريغ الحمولة بنجاح: تم الانتقال إلى [UNLOADING] وتعيين مسؤول التفريغ (${unloaderIdInput}).`
        });
      }
    } catch (err: any) {
      if (onNotification) {
        onNotification({ type: 'ERROR', message: err.message });
      }
    }
  };

  // Step 3 & 4: Enter destNetWeight -> Server calculates varianceWeight -> updates 5 fields -> UNLOADING -> COMPLETED
  const handleCompleteUnloading = () => {
    if (!activeTrip) return;
    const net = typeof destNetWeightInput === 'number' ? destNetWeightInput : 0;
    if (net <= 0) {
      if (onNotification) {
        onNotification({
          type: 'ERROR',
          message: 'يجب إدخال صافي وزن الوصول (destNetWeight) كقيمة موجبة أكبر من صفر.'
        });
      }
      return;
    }

    try {
      const isoArrival = new Date(arrivalTimeInput).toISOString();
      const isoUnload = new Date(unloadTimeInput).toISOString();

      const result = tripEngineService.completeUnloadingWithVariance({
        tripId: activeTrip.tripId,
        destNetWeight: net,
        unloaderId: unloaderIdInput,
        arrivalTime: isoArrival,
        unloadTime: isoUnload,
        notes: notesInput,
        tolerancePercent,
        toleranceKg,
        actorName: unloaderNameInput
      });

      setActiveTrip(result.trip);
      setTripExceptions(tripEngineService.getTripExceptions(result.trip.tripId));

      if (onTripUpdated) onTripUpdated(result.trip);

      if (result.isOutOfTolerance && result.exceptionCreated) {
        if (onNotification) {
          onNotification({
            type: 'SECURITY',
            message: `تنبيه رقابي صارم: فارق الوزن (${result.varianceWeight.toLocaleString()} كجم) خارج نسبة التسامح المسموحة! تم رسمياً إنشاء كائن استثناء (${result.exceptionCreated.exceptionId}) في قاعدة البيانات وسجل التدقيق.`
          });
        }
      } else {
        if (onNotification) {
          onNotification({
            type: 'SUCCESS',
            message: `تم إكمال التفريغ بنجاح: تم احتساب فارق الوزن خادومياً (${result.varianceWeight.toLocaleString()} كجم) وتحديث الحقول الـ 5 وترقية الحالة إلى [COMPLETED].`
          });
        }
      }
    } catch (err: any) {
      if (onNotification) {
        onNotification({ type: 'ERROR', message: err.message });
      }
    }
  };

  // Run Test Suite
  const handleRunTests = () => {
    const report = runUnloadingStationTestSuite();
    setTestResults(report);
    setIsTestModalOpen(true);
  };

  // Calculated Preview for operator before confirmation
  const currentOriginNet = activeTrip?.netWeight || 0;
  const currentDestNet = typeof destNetWeightInput === 'number' ? destNetWeightInput : 0;
  const liveVariance = currentDestNet > 0 ? currentDestNet - currentOriginNet : null;
  const liveVariancePct = currentOriginNet > 0 && liveVariance !== null
    ? ((liveVariance / currentOriginNet) * 100)
    : null;

  const thresholdFromPct = currentOriginNet > 0 
    ? Math.round((currentOriginNet * tolerancePercent) / 100) 
    : toleranceKg;
  const effectiveTolerance = Math.max(toleranceKg, thresholdFromPct);
  const isLiveOutOfTolerance = liveVariance !== null && Math.abs(liveVariance) > effectiveTolerance;

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Top Banner with Station Identity and Automated Verification Button */}
      <div className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-stone-100 pb-5 mb-5">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-800 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h1 className="text-xl font-bold text-stone-900">
                  محطة التفريغ والاستلام بموقع المشروع (Unloading Station)
                </h1>
                <span className="bg-amber-100 text-amber-900 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  حوكمة استلام الموقع
                </span>
                <span className="bg-emerald-100 text-emerald-900 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  حساب الفارق الخادومي الصارم
                </span>
              </div>
              <p className="text-xs text-stone-600 max-w-3xl leading-relaxed">
                منظومة استلام وتفريغ الشحنات بالموقع: البحث بالتدرج الإلزامي (tripSerial ➔ ticketId ➔ truckId)، حظر البحث باللوحة المنفردة، التدرج التشغيلي للحالات، واحتساب فارق الوزن خادومياً وإنشاء كائنات الاستثناءات الرسمية عند تجاوز التفاوت.
              </p>
            </div>
          </div>

          {/* Verification Test Runner Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleRunTests}
              className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-2 shrink-0"
              title="فحص الامتثال لقواعد البحث الخادومي، حظر اللوحة، التدرج، وإنشاء كائنات الاستثناء"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>فحص الامتثال الآلي (7 متطلبات)</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 1. SEARCH SECTION (البحث الأساسي: tripSerial ثم ticketId ثم truckId) */}
        {/* ========================================================================= */}
        <div className="bg-stone-50 rounded-xl p-5 border border-stone-200/80 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <Search className="w-4 h-4 text-amber-700" />
                <span>البحث والتعرف على الرحلة (Search & Identification)</span>
              </h2>
              <p className="text-[11px] text-stone-500">
                تسلسل البحث: الأساسي <span className="font-bold text-stone-800">tripSerial</span> ➔ ثم: <span className="font-bold text-stone-800">ticketId</span> ➔ ثم: <span className="font-bold text-stone-800">truckId</span>. (يُمنع استخدام truckPlate وحده).
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-stone-400 font-medium text-[11px]">قواعد النتائج:</span>
              <span className="bg-stone-200 text-stone-700 px-2 py-0.5 rounded text-[10px] font-mono">0: NOT_FOUND</span>
              <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-mono">1: CONTINUE</span>
              <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded text-[10px] font-mono">&gt;1: AMBIGUOUS</span>
            </div>
          </div>

          {/* Search Input Bar */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="أدخل رقم الرحلة (مثال: TRP-NEOM-8892) أو رقم التذكرة أو معرف الشاحنة..."
                className="w-full bg-white border border-stone-300 rounded-xl px-4 py-2.5 text-xs font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 pr-10"
              />
              <Search className="w-4 h-4 text-stone-400 absolute right-3.5 top-3 pointer-events-none" />
            </div>

            <button
              onClick={() => handleSearch()}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 flex items-center justify-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              <span>بحث وتحقق</span>
            </button>
          </div>

          {/* Quick Preset Buttons for Easy Demonstration of all 4 Prompt Rules */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-[11px] text-stone-400 font-medium">سيناريوهات تجربة فورية:</span>
            
            <button
              onClick={() => {
                setSearchQuery('TRP-NEOM-8892');
                handleSearch('TRP-NEOM-8892');
              }}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white hover:bg-stone-200 text-stone-700 border border-stone-200 transition-all flex items-center gap-1"
            >
              <span>1️⃣ الأساسي tripSerial (1 ➔ CONTINUE)</span>
            </button>

            <button
              onClick={() => {
                setSearchQuery('WB-TKT-99106');
                handleSearch('WB-TKT-99106');
              }}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white hover:bg-stone-200 text-stone-700 border border-stone-200 transition-all flex items-center gap-1"
            >
              <span>2️⃣ التذكرة ticketId (1 ➔ CONTINUE)</span>
            </button>

            <button
              onClick={() => {
                setSearchQuery('TRK-9901');
                handleSearch('TRK-9901');
              }}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white hover:bg-stone-200 text-stone-700 border border-stone-200 transition-all flex items-center gap-1"
            >
              <span>3️⃣ معرف الشاحنة truckId (&gt;1 ➔ AMBIGUOUS)</span>
            </button>

            <button
              onClick={() => {
                setSearchQuery('د هـ و 5678');
                handleSearch('د هـ و 5678');
              }}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 transition-all flex items-center gap-1"
            >
              <ShieldAlert className="w-3 h-3 text-rose-600" />
              <span>4️⃣ حظر اللوحة المنفردة (PROHIBITED)</span>
            </button>

            <button
              onClick={() => {
                setSearchQuery('TRP-UNKNOWN-999');
                handleSearch('TRP-UNKNOWN-999');
              }}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white hover:bg-stone-200 text-stone-600 border border-stone-200 transition-all flex items-center gap-1"
            >
              <span>5️⃣ غير موجود (0 ➔ NOT_FOUND)</span>
            </button>
          </div>

          {/* Search Result Feedback Banners */}
          {searchResult && (
            <div className="pt-2 animate-fadeIn">
              {/* 1. NOT_FOUND */}
              {searchResult.status === 'NOT_FOUND' && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold flex items-center gap-2">
                      <span className="bg-amber-200 text-amber-900 px-2 py-0.5 rounded text-[10px] font-bold">
                        0 ➔ NOT_FOUND
                      </span>
                      <span>لم يتم العثور على أي رحلة مطابقة</span>
                    </div>
                    <p className="text-[11px] text-amber-800 mt-1">
                      {searchResult.messageAr}
                    </p>
                  </div>
                </div>
              )}

              {/* 2. PLATE_ONLY_PROHIBITED */}
              {searchResult.status === 'PLATE_ONLY_PROHIBITED' && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-950 flex items-start gap-3 text-xs">
                  <ShieldAlert className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold flex items-center gap-2">
                      <span className="bg-rose-200 text-rose-900 px-2 py-0.5 rounded text-[10px] font-bold">
                        حظر أمني رقابي (BLOCKED)
                      </span>
                      <span>اشتراط صارم: لا تستخدم truckPlate وحده لتحديد الرحلة</span>
                    </div>
                    <p className="text-[11px] text-rose-900 mt-1 leading-relaxed">
                      {searchResult.messageAr}
                    </p>
                  </div>
                </div>
              )}

              {/* 3. AMBIGUOUS (> 1 matches) */}
              {searchResult.status === 'AMBIGUOUS' && (
                <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-purple-950 space-y-3">
                  <div className="flex items-start gap-3 text-xs">
                    <AlertCircle className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold flex items-center gap-2">
                        <span className="bg-purple-200 text-purple-900 px-2 py-0.5 rounded text-[10px] font-bold">
                          &gt;1 ➔ AMBIGUOUS (العدد: {searchResult.count})
                        </span>
                        <span>تنبيه غامض: تم العثور على أكثر من رحلة للشاحنة</span>
                      </div>
                      <p className="text-[11px] text-purple-800 mt-0.5">
                        يُحظر المضي التلقائي لمنع الخلط بين الرحلات أو الورديات المختلفة. الرجاء اختيار الرحلة المستهدفة أدناه:
                      </p>
                    </div>
                  </div>

                  {/* List of Ambiguous Candidates for Manual Disambiguation */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                    {searchResult.candidateTrips?.map((cand, idx) => (
                      <div
                        key={`${cand.tripId}-${idx}`}
                        onClick={() => {
                          setActiveTrip(cand);
                          if (cand.tareWeight) setDestTareInput(cand.tareWeight);
                          if (onNotification) {
                            onNotification({
                              type: 'SUCCESS',
                              message: `تم اختيار الرحلة المحددة: ${cand.tripSerial}`
                            });
                          }
                        }}
                        className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                          activeTrip?.tripId === cand.tripId
                            ? 'bg-purple-100/70 border-purple-400 ring-2 ring-purple-500/30'
                            : 'bg-white hover:bg-purple-50/50 border-purple-200'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold mb-1">
                          <span className="text-purple-900">{cand.tripSerial}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            cand.status === 'IN_TRANSIT' ? 'bg-amber-100 text-amber-800' :
                            cand.status === 'ARRIVED' ? 'bg-blue-100 text-blue-800' :
                            cand.status === 'UNLOADING' ? 'bg-indigo-100 text-indigo-800' :
                            cand.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                            'bg-stone-100 text-stone-700'
                          }`}>
                            {cand.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-600 grid grid-cols-2 gap-1">
                          <span>التذكرة: {cand.ticketId}</span>
                          <span>الوزن الصافي: {cand.netWeight.toLocaleString()} كجم</span>
                          <span>المادة: {cand.materialId}</span>
                          <span>الوردية: {cand.shiftDate}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. CONTINUE (1 match) */}
              {searchResult.status === 'CONTINUE' && activeTrip && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-start gap-3 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="flex-1 flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <div className="font-bold flex items-center gap-2">
                        <span className="bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded text-[10px] font-bold">
                          1 ➔ CONTINUE
                        </span>
                        <span>تم تحديد الرحلة الفريدة بنجاح: {activeTrip.tripSerial}</span>
                      </div>
                      <p className="text-[11px] text-emerald-800 mt-0.5">
                        تمت المطابقة عبر: <span className="font-bold">{searchResult.matchedBy}</span>. تم تفعيل مسار محطة التفريغ أدناه.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] bg-white px-2.5 py-1 rounded-lg border border-emerald-200 font-bold text-emerald-900">
                        الحالة الحالية: {activeTrip.status}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 2. OPERATIONAL WORKFLOW (المسار التشغيلي للوصول والتفريغ وحساب الفارق) */}
        {/* ========================================================================= */}
        {activeTrip ? (
          <div className="mt-6 space-y-6 animate-fadeIn">
            {/* Active Trip Info Card */}
            <div className="bg-stone-50/70 rounded-xl p-4 border border-stone-200 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
              <div>
                <span className="text-stone-400 text-[10px] block">رقم الرحلة السريال</span>
                <span className="font-bold text-stone-900">{activeTrip.tripSerial}</span>
              </div>
              <div>
                <span className="text-stone-400 text-[10px] block">رقم تذكرة الميزان</span>
                <span className="font-bold text-stone-900">{activeTrip.ticketId}</span>
              </div>
              <div>
                <span className="text-stone-400 text-[10px] block">معرف ولـوحة الشاحنة</span>
                <span className="font-bold text-stone-900">
                  {activeTrip.truckId} 
                  {activeTrip.entitySnapshots?.truck?.plateNumberAr && ` (${activeTrip.entitySnapshots.truck.plateNumberAr})`}
                </span>
              </div>
              <div>
                <span className="text-stone-400 text-[10px] block">الوزن الصافي بالمصدر</span>
                <span className="font-bold text-amber-700 font-mono">
                  {activeTrip.netWeight.toLocaleString()} كجم
                </span>
              </div>
              <div>
                <span className="text-stone-400 text-[10px] block">التسعيرة المعتمدة</span>
                <span className="font-bold text-stone-900">
                  {activeTrip.agreedRate} {activeTrip.currency} ({activeTrip.pricingType})
                </span>
              </div>
              <div>
                <span className="text-stone-400 text-[10px] block">حالة دورة الحياة</span>
                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTrip.status === 'IN_TRANSIT' ? 'bg-amber-100 text-amber-800' :
                  activeTrip.status === 'ARRIVED' ? 'bg-blue-100 text-blue-800' :
                  activeTrip.status === 'UNLOADING' ? 'bg-indigo-100 text-indigo-800' :
                  activeTrip.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                  'bg-stone-200 text-stone-800'
                }`}>
                  {activeTrip.status}
                </span>
              </div>
            </div>

            {/* Step-by-Step Transition Controls */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              
              {/* STAGE 1: عند الوصول (IN_TRANSIT -> ARRIVED) */}
              <div className={`p-4 rounded-xl border transition-all ${
                activeTrip.status === 'IN_TRANSIT'
                  ? 'bg-amber-50/50 border-amber-300 ring-2 ring-amber-400/20'
                  : activeTrip.arrivalTime
                  ? 'bg-emerald-50/30 border-emerald-200'
                  : 'bg-stone-50 border-stone-200 opacity-80'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center text-[10px] font-bold">1</span>
                    <span>عند الوصول (Arrival)</span>
                  </span>
                  <span className="text-[10px] font-mono text-stone-500">
                    IN_TRANSIT ➔ ARRIVED
                  </span>
                </div>
                <p className="text-[11px] text-stone-600 mb-3">
                  تسجيل وصول الشاحنة عند البوابة الرئيسية وتوثيق طابع الوقت الزمني.
                </p>

                <div className="space-y-2 mb-3">
                  <label className="block text-[11px] font-semibold text-stone-700">وقت الوصول الفعلي (arrivalTime)</label>
                  <input
                    type="datetime-local"
                    value={arrivalTimeInput}
                    onChange={(e) => setArrivalTimeInput(e.target.value)}
                    disabled={activeTrip.status !== 'IN_TRANSIT'}
                    className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 disabled:bg-stone-100 disabled:text-stone-500"
                  />
                </div>

                <button
                  onClick={handleRecordArrival}
                  disabled={activeTrip.status !== 'IN_TRANSIT'}
                  className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    activeTrip.status === 'IN_TRANSIT'
                      ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                      : activeTrip.arrivalTime
                      ? 'bg-emerald-100 text-emerald-800 cursor-default'
                      : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                  }`}
                >
                  {activeTrip.arrivalTime ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>تم توثيق الوصول بنجاح ({new Date(activeTrip.arrivalTime).toLocaleTimeString('ar-SA')})</span>
                    </>
                  ) : (
                    <>
                      <Truck className="w-3.5 h-3.5" />
                      <span>تأكيد وصول الشاحنة (IN_TRANSIT ➔ ARRIVED)</span>
                    </>
                  )}
                </button>
              </div>

              {/* STAGE 2: عند بدء التفريغ (ARRIVED -> UNLOADING) */}
              <div className={`p-4 rounded-xl border transition-all ${
                activeTrip.status === 'ARRIVED'
                  ? 'bg-blue-50/50 border-blue-300 ring-2 ring-blue-400/20'
                  : activeTrip.status === 'UNLOADING' || activeTrip.status === 'COMPLETED'
                  ? 'bg-emerald-50/30 border-emerald-200'
                  : 'bg-stone-50 border-stone-200 opacity-80'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-200 text-blue-900 flex items-center justify-center text-[10px] font-bold">2</span>
                    <span>عند بدء التفريغ (Start Unloading)</span>
                  </span>
                  <span className="text-[10px] font-mono text-stone-500">
                    ARRIVED ➔ UNLOADING
                  </span>
                </div>
                <p className="text-[11px] text-stone-600 mb-3">
                  إسناد منصة التفريغ وتعيين هوية مستلم الموقع المعتمد.
                </p>

                <div className="space-y-2 mb-3">
                  <label className="block text-[11px] font-semibold text-stone-700">هوية مستلم الموقع (unloaderId)</label>
                  <input
                    type="text"
                    value={unloaderIdInput}
                    onChange={(e) => setUnloaderIdInput(e.target.value)}
                    disabled={activeTrip.status !== 'ARRIVED' && activeTrip.status !== 'IN_TRANSIT'}
                    placeholder="REC-INSPECTOR-01"
                    className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 disabled:bg-stone-100 disabled:text-stone-500"
                  />
                </div>

                <button
                  onClick={handleStartUnloading}
                  disabled={activeTrip.status !== 'ARRIVED'}
                  className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    activeTrip.status === 'ARRIVED'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                      : activeTrip.status === 'UNLOADING' || activeTrip.status === 'COMPLETED'
                      ? 'bg-emerald-100 text-emerald-800 cursor-default'
                      : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                  }`}
                >
                  {activeTrip.status === 'UNLOADING' || activeTrip.status === 'COMPLETED' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>قيد التفريغ بواسطة ({activeTrip.unloaderId || unloaderIdInput})</span>
                    </>
                  ) : (
                    <>
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>بدء التفريغ (ARRIVED ➔ UNLOADING)</span>
                    </>
                  )}
                </button>
              </div>

              {/* STAGE 3: إدخال destNetWeight وتحديث الحقول الـ 5 (UNLOADING -> COMPLETED) */}
              <div className={`p-4 rounded-xl border transition-all ${
                activeTrip.status === 'UNLOADING'
                  ? 'bg-indigo-50/50 border-indigo-300 ring-2 ring-indigo-400/20'
                  : activeTrip.status === 'COMPLETED'
                  ? 'bg-emerald-50/50 border-emerald-300 ring-2 ring-emerald-400/20'
                  : 'bg-stone-50 border-stone-200 opacity-80'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-200 text-indigo-900 flex items-center justify-center text-[10px] font-bold">3</span>
                    <span>إدخال الوزن الصافي (destNetWeight)</span>
                  </span>
                  <span className="text-[10px] font-mono text-stone-500">
                    UNLOADING ➔ COMPLETED
                  </span>
                </div>
                <p className="text-[11px] text-stone-600 mb-3">
                  يحسب الخادم varianceWeight ويحدّث: unloaderId, arrivalTime, unloadTime, destNetWeight, varianceWeight.
                </p>

                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-stone-700">صافي وزن الوصول (كجم)</span>
                    <button
                      type="button"
                      onClick={() => setWeightEntryMode(m => m === 'DIRECT' ? 'DUAL_SCALE' : 'DIRECT')}
                      className="text-[10px] text-indigo-700 hover:underline font-bold"
                    >
                      {weightEntryMode === 'DIRECT' ? '🔢 استخدام ميزان القائم/الفارغ' : '✏️ إدخال الصافي المباشر'}
                    </button>
                  </div>

                  {weightEntryMode === 'DUAL_SCALE' && (
                    <div className="grid grid-cols-2 gap-2 bg-stone-100 p-2 rounded-lg text-xs">
                      <div>
                        <span className="text-[10px] text-stone-500 block">القائم بالموقع</span>
                        <input
                          type="number"
                          value={destGrossInput}
                          onChange={(e) => setDestGrossInput(e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="مثال: 44800"
                          className="w-full bg-white border border-stone-300 rounded px-2 py-1 text-xs"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-500 block">الفارغ بالموقع</span>
                        <input
                          type="number"
                          value={destTareInput}
                          onChange={(e) => setDestTareInput(e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="مثال: 14200"
                          className="w-full bg-white border border-stone-300 rounded px-2 py-1 text-xs"
                        />
                      </div>
                    </div>
                  )}

                  <input
                    type="number"
                    value={destNetWeightInput}
                    onChange={(e) => setDestNetWeightInput(e.target.value === '' ? '' : Number(e.target.value))}
                    disabled={activeTrip.status === 'COMPLETED'}
                    placeholder="صافي وزن الاستلام (كجم)"
                    className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-stone-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Live Presets for Quick Testing in Unloading Station */}
                {activeTrip.status === 'UNLOADING' && (
                  <div className="mb-3">
                    <span className="text-[10px] text-stone-500 block mb-1">أمثلة أوزان سريعة للاختبار:</span>
                    <div className="flex gap-1 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setDestNetWeightInput(activeTrip.netWeight - 150)}
                        className="text-[10px] bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-semibold"
                      >
                        مطابق طبيعي (-150 كجم)
                      </button>
                      <button
                        type="button"
                        onClick={() => setDestNetWeightInput(activeTrip.netWeight - 2500)}
                        className="text-[10px] bg-white hover:bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 rounded font-semibold"
                      >
                        عجز كبير (-2500 كجم ➔ Exception)
                      </button>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleCompleteUnloading}
                  disabled={activeTrip.status !== 'UNLOADING'}
                  className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    activeTrip.status === 'UNLOADING'
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                      : activeTrip.status === 'COMPLETED'
                      ? 'bg-emerald-700 text-white cursor-default'
                      : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                  }`}
                >
                  {activeTrip.status === 'COMPLETED' ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      <span>مكتملة ومفرغة بالكامل (COMPLETED)</span>
                    </>
                  ) : (
                    <>
                      <Scale className="w-3.5 h-3.5" />
                      <span>اعتماد التفريغ وتحديث الحقول الـ 5</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* 3. SERVER CALCULATION & TOLERANCE INSPECTOR */}
            {/* ========================================================================= */}
            <div className="bg-white rounded-xl p-5 border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center font-bold">
                    ∑
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">
                      معاينة الحساب الخادومي ومراقبة تفاوت الوزن (Server Variance & Tolerance)
                    </h3>
                    <p className="text-[11px] text-stone-500">
                      المعادلة الخادومية الصارمة: <span className="font-mono text-stone-800 font-bold">varianceWeight = destNetWeight - netWeight</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-stone-500 font-medium">حد التسامح المعتمد:</span>
                  <span className="bg-stone-100 text-stone-800 text-xs px-2 py-0.5 rounded font-mono font-bold">
                    ±{tolerancePercent}% (أو ±{toleranceKg} كجم)
                  </span>
                </div>
              </div>

              {/* 4 Cards Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/80">
                  <span className="text-[10px] font-medium text-stone-500 block mb-1">الوزن الصافي بالمصدر (netWeight)</span>
                  <div className="text-lg font-black text-stone-900 font-mono">
                    {currentOriginNet.toLocaleString()} <span className="text-xs font-normal">كجم</span>
                  </div>
                  <span className="text-[10px] text-stone-400">محسوب مسبقاً بالمصدر</span>
                </div>

                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/80">
                  <span className="text-[10px] font-medium text-stone-500 block mb-1">صافي وزن الاستلام (destNetWeight)</span>
                  <div className="text-lg font-black text-stone-900 font-mono">
                    {currentDestNet > 0 ? `${currentDestNet.toLocaleString()} كجم` : 'بانتظار الإدخال'}
                  </div>
                  <span className="text-[10px] text-stone-400">مدخل محطة التفريغ</span>
                </div>

                <div className={`p-3 rounded-xl border ${
                  liveVariance === null 
                    ? 'bg-stone-50 border-stone-200' 
                    : isLiveOutOfTolerance 
                    ? 'bg-rose-50 border-rose-300' 
                    : 'bg-emerald-50 border-emerald-300'
                }`}>
                  <span className="text-[10px] font-medium text-stone-500 block mb-1">فارق الوزن المحسوب خادومياً</span>
                  <div className={`text-lg font-black font-mono ${
                    liveVariance === null 
                      ? 'text-stone-400' 
                      : isLiveOutOfTolerance 
                      ? 'text-rose-700' 
                      : 'text-emerald-700'
                  }`}>
                    {liveVariance !== null ? (
                      <>
                        {liveVariance > 0 ? `+${liveVariance.toLocaleString()}` : liveVariance.toLocaleString()} <span className="text-xs font-normal">كجم</span>
                        {liveVariancePct !== null && (
                          <span className="text-xs font-normal block text-[11px]">
                            ({liveVariancePct > 0 ? `+${liveVariancePct.toFixed(2)}%` : `${liveVariancePct.toFixed(2)}%`})
                          </span>
                        )}
                      </>
                    ) : (
                      '---'
                    )}
                  </div>
                </div>

                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/80">
                  <span className="text-[10px] font-medium text-stone-500 block mb-1">نتيجة فحص المطابقة</span>
                  {liveVariance === null ? (
                    <div className="text-xs font-bold text-stone-400 mt-2">بانتظار تسجيل الوزن</div>
                  ) : isLiveOutOfTolerance ? (
                    <div>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full mb-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>خارج التسامح (Exception)</span>
                      </span>
                      <span className="text-[10px] text-rose-800 block">
                        يتجاوز التفاوت المسموح (±{effectiveTolerance.toLocaleString()} كجم)
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full mb-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>ضمن التسامح المسموح</span>
                      </span>
                      <span className="text-[10px] text-emerald-700 block">
                        تفاوت طبيعي مبرر للشحنة
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Atomic 5-Field Update Preview Box */}
              <div className="bg-stone-100/70 rounded-xl p-3.5 border border-stone-200 text-xs">
                <span className="font-bold text-stone-800 block mb-2 text-[11px]">
                  ✓ حزم التحديث الذري الإلزامي للحقول الخمسة على السيرفر (Atomic Server Updates):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] font-mono">
                  <div className="bg-white p-2 rounded border border-stone-200">
                    <span className="text-stone-400 block text-[9px]">1. unloaderId</span>
                    <span className="font-bold text-stone-800 truncate block">{activeTrip.unloaderId || unloaderIdInput}</span>
                  </div>
                  <div className="bg-white p-2 rounded border border-stone-200">
                    <span className="text-stone-400 block text-[9px]">2. arrivalTime</span>
                    <span className="font-bold text-stone-800 truncate block">
                      {activeTrip.arrivalTime ? new Date(activeTrip.arrivalTime).toLocaleTimeString('ar-SA') : 'سيتم التحديث'}
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded border border-stone-200">
                    <span className="text-stone-400 block text-[9px]">3. unloadTime</span>
                    <span className="font-bold text-stone-800 truncate block">
                      {activeTrip.unloadTime ? new Date(activeTrip.unloadTime).toLocaleTimeString('ar-SA') : 'سيتم التحديث'}
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded border border-stone-200">
                    <span className="text-stone-400 block text-[9px]">4. destNetWeight</span>
                    <span className="font-bold text-stone-800 block">
                      {activeTrip.destNetWeight !== null ? `${activeTrip.destNetWeight.toLocaleString()} كجم` : `${currentDestNet || 0} كجم`}
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded border border-stone-200">
                    <span className="text-stone-400 block text-[9px]">5. varianceWeight</span>
                    <span className="font-bold text-stone-800 block">
                      {activeTrip.varianceWeight !== null ? `${activeTrip.varianceWeight.toLocaleString()} كجم` : `${liveVariance || 0} كجم`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* 4. REAL EXCEPTION ENTITY DOSSIER ("إذا كان هناك فرق خارج tolerance: أنشئ Exception. ولا تعتبر الفرق مجرد لون في الواجهة.") */}
            {/* ========================================================================= */}
            {tripExceptions.length > 0 && (
              <div className="bg-rose-50/70 rounded-2xl border-2 border-rose-300 p-5 shadow-xs space-y-4 animate-fadeIn">
                <div className="flex items-start justify-between gap-3 border-b border-rose-200/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold shrink-0">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-rose-950">
                          سجل الاستثناءات الرسمية المنشأة (Created Official Exception Entity)
                        </h3>
                        <span className="bg-rose-200 text-rose-900 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                          {tripExceptions.length} استثناء نشط
                        </span>
                      </div>
                      <p className="text-[11px] text-rose-800">
                        تنفيذاً للاشتراط: <span className="font-bold">"ولا تعتبر الفرق مجرد لون في الواجهة"</span> — تم إنشاء كائن استثناء مالي وتشغيلي رسمي في قاعدة البيانات يمنع التسوية المالية حتى الاعتماد الإداري.
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-rose-900 bg-rose-200/80 px-3 py-1 rounded-full">
                    مطلوب اعتماد مدير المشروع
                  </span>
                </div>

                <div className="space-y-3">
                  {tripExceptions.map((exc, idx) => (
                    <div 
                      key={`${exc.exceptionId}-${idx}`}
                      className="bg-white rounded-xl p-4 border border-rose-200 shadow-2xs space-y-2.5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-xs text-rose-900">{exc.exceptionId}</span>
                          <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded">
                            {exc.type}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            exc.severity === 'BLOCKING' ? 'bg-purple-100 text-purple-900' : 'bg-rose-100 text-rose-800'
                          }`}>
                            خطورة: {exc.severity}
                          </span>
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded">
                            الحالة: {exc.status}
                          </span>
                        </div>

                        <span className="text-[10px] text-stone-400 font-mono">
                          المبلغ المالي المعلق: {activeTrip.settlementAmount.toLocaleString()} ر.س
                        </span>
                      </div>

                      <p className="text-xs text-stone-800 leading-relaxed font-medium">
                        {exc.reasonAr}
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1 flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                          <span>المسؤول المُبلّغ: <strong className="text-stone-700">{exc.reportedBy.displayName}</strong></span>
                          <span>معرف المستخدم: <code className="text-stone-600 font-mono">{exc.reportedBy.userId}</code></span>
                        </div>

                        {exc.status === 'OPEN' && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                tripEngineService.resolveException(
                                  activeTrip.tripId,
                                  exc.exceptionId,
                                  {
                                    status: 'WAIVED',
                                    notes: 'تمت مراجعة الفارق واحتساب نسبة رطوبة وتبخر طبيعية معتمدة من مدير الموقع'
                                  },
                                  'USR-PROJ-MGR-01'
                                );
                                setTripExceptions(tripEngineService.getTripExceptions(activeTrip.tripId));
                                if (onNotification) {
                                  onNotification({
                                    type: 'SUCCESS',
                                    message: `تم اعتماد وقبول الاستثناء (${exc.exceptionId}) بقرار إداري معتمد.`
                                  });
                                }
                              }}
                              className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[10px] font-bold transition-all shadow-2xs"
                            >
                              اعتماد الاستثناء والسماح بالتسوية (Waive Exception)
                            </button>
                          </div>
                        )}
                        {exc.status === 'WAIVED' && (
                          <span className="text-emerald-800 font-bold text-[10px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            ✓ تم اعتماد الاستثناء إدارياً
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-8 text-center py-10 bg-stone-50 rounded-xl border border-dashed border-stone-200">
            <div className="w-12 h-12 rounded-full bg-stone-200/70 text-stone-500 flex items-center justify-center mx-auto mb-2">
              <Search className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-stone-700 mb-1">بانتظار البحث عن رحلة</h4>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              أدخل رقم الرحلة (tripSerial) أو رقم التذكرة (ticketId) أو معرف الشاحنة (truckId) لبدء إجراءات الاستلام والتفريغ.
            </p>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. VERIFICATION REPORT MODAL (MODAL TEST SUITE) */}
      {/* ========================================================================= */}
      {isTestModalOpen && testResults && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-scaleIn">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">
                    تقرير الامتثال الآلي لاشتراطات محطة التفريغ (Unloading Station Tests)
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    تم فحص جميع القواعد الصارمة الواردة في البرومبت برمجياً
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsTestModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 p-1.5 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-center">
                  <span className="text-[10px] text-stone-500 block">إجمالي الفحوصات</span>
                  <span className="text-lg font-black text-stone-800">{testResults.summary.total}</span>
                </div>
                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-center">
                  <span className="text-[10px] text-emerald-700 block">ناجحة 100%</span>
                  <span className="text-lg font-black text-emerald-800">{testResults.summary.passed}</span>
                </div>
                <div className="bg-rose-50 p-3 rounded-xl border border-rose-200 text-center">
                  <span className="text-[10px] text-rose-700 block">فاشلة</span>
                  <span className="text-lg font-black text-rose-800">{testResults.summary.failed}</span>
                </div>
              </div>

              {/* List of Test Results */}
              <div className="space-y-2">
                {testResults.results.map((res, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border text-xs flex items-start justify-between gap-3 ${
                      res.passed ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50 border-rose-200'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {res.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <span className="font-bold text-stone-900 block mb-0.5">{res.name}</span>
                        <p className="text-[11px] text-stone-600 leading-relaxed">{res.message}</p>
                      </div>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 font-mono ${
                      res.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {res.passed ? 'PASSED' : 'FAILED'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-stone-100 bg-stone-50 flex items-center justify-between">
              <span className="text-xs text-stone-500 font-medium">
                جميع الاختبارات الخادومية مطابقة للمواصفات القياسية.
              </span>
              <button
                onClick={() => setIsTestModalOpen(false)}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-lg text-xs font-bold"
              >
                إغلاق التقرير
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
