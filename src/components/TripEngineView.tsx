import React, { useState } from 'react';
import { 
  Truck, 
  Scale, 
  Calculator, 
  ShieldCheck, 
  ShieldAlert, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCcw, 
  Send, 
  FileText, 
  Boxes, 
  UserCheck, 
  BadgePercent, 
  ArrowRight, 
  Sparkles,
  Search,
  SlidersHorizontal,
  X,
  Eye,
  Building2,
  ChevronDown,
  GitCommit
} from 'lucide-react';
import { 
  TripRecord, 
  CreateTripParams, 
  DestinationReceiptParams,
  TripEngineStatus
} from '../types/tripEngine';
import { 
  tripEngineService, 
  MASTER_PRICING_RULES 
} from '../services/tripEngine.service';
import { SAMPLE_QUALITY_CONTEXT } from '../data/sampleQualityData';
import { StateMachineController } from './tripEngine/StateMachineController';
import { LoadingStation } from './tripEngine/LoadingStation';

export const TripEngineView: React.FC = () => {
  const [trips, setTrips] = useState<TripRecord[]>(() => tripEngineService.getTrips());
  const [selectedTrip, setSelectedTrip] = useState<TripRecord | null>(null);
  const [receiptModalTrip, setReceiptModalTrip] = useState<TripRecord | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'LOADING_STATION' | 'STATE_MACHINE' | 'LIST' | 'DISPATCH' | 'TEST_MATRIX'>('LOADING_STATION');

  // Filter & Search states
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Dispatch Form State
  const [formData, setFormData] = useState<CreateTripParams>({
    projectId: 'PRJ-NEOM-001',
    carrierId: 'CAR-ALMAJDOUIE',
    truckId: 'TRK-9901',
    driverId: 'DRV-101',
    materialId: 'MAT-AGG-01',
    pricingRuleId: 'PRC-NEOM-AGG-TON',
    shiftDate: new Date().toISOString().split('T')[0],
    ticketId: `WB-TKT-${Math.floor(100000 + Math.random() * 900000)}`,
    tareWeight: 14200,
    grossWeight: 45800,
    loaderId: 'OPR-SCALE-01',
    notes: 'شحنة ركام خرساني معتمدة لمشروع نيوم',
    createdBy: 'USR-DISPATCHER-01'
  });

  // Client Net Weight Tampering Simulation
  const [simulateTampering, setSimulateTampering] = useState<boolean>(false);
  const [tamperedNetWeight, setTamperedNetWeight] = useState<number>(99999);

  // Receipt Modal Form State
  const [receiptForm, setReceiptForm] = useState<{
    destGrossWeight: number;
    destTareWeight: number;
    unloaderId: string;
    notes: string;
  }>({
    destGrossWeight: 45650,
    destTareWeight: 14200,
    unloaderId: 'ENG-SITE-04',
    notes: 'تمت مطابقة ميزان الجسر بموقع الاستلام واحتساب فارق الوزن'
  });

  const [notification, setNotification] = useState<{
    type: 'SUCCESS' | 'ERROR' | 'SECURITY';
    message: string;
  } | null>(null);

  const refreshTrips = () => {
    setTrips(tripEngineService.getTrips());
  };

  // Real-time live validation of form
  const liveValidation = tripEngineService.validateTripRules(formData);

  // Server-side live calculations for preview
  const liveCalculatedNet = Math.max(0, formData.grossWeight - formData.tareWeight);
  const selectedRule = MASTER_PRICING_RULES.find(r => r.pricingRuleId === formData.pricingRuleId);
  const liveSettlementBase = selectedRule?.pricingType === 'PER_TON' 
    ? parseFloat((liveCalculatedNet / 1000).toFixed(3)) 
    : 1;
  const liveSettlementAmount = selectedRule 
    ? parseFloat((liveSettlementBase * selectedRule.agreedRate).toFixed(2)) 
    : 0;

  // Handle Dispatch Submit
  const handleDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: CreateTripParams = {
        ...formData,
        clientNetWeight: simulateTampering ? tamperedNetWeight : undefined
      };

      const result = tripEngineService.createTrip(payload);
      refreshTrips();

      if (result.securityLog) {
        setNotification({
          type: 'SECURITY',
          message: `${result.securityLog} - تم تسجيل الرحلة برقم: ${result.trip.tripSerial}`
        });
      } else {
        setNotification({
          type: 'SUCCESS',
          message: `تم إنشاء وترحيل الرحلة (${result.trip.tripSerial}) بنجاح! تم احتساب صافي الوزن (${result.trip.netWeight} كجم) والتسوية (${result.trip.settlementAmount} ريال) خادومياً.`
        });
      }

      // Refresh ticket ID for next entry
      setFormData(prev => ({
        ...prev,
        ticketId: `WB-TKT-${Math.floor(100000 + Math.random() * 900000)}`
      }));
      setActiveSubTab('LIST');
    } catch (err: any) {
      setNotification({
        type: 'ERROR',
        message: err.message || 'فشل إنشاء الرحلة'
      });
    }
  };

  // Handle Destination Receipt
  const handleRecordReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptModalTrip) return;

    try {
      const params: DestinationReceiptParams = {
        tripId: receiptModalTrip.tripId,
        projectId: receiptModalTrip.projectId,
        destGrossWeight: receiptForm.destGrossWeight,
        destTareWeight: receiptForm.destTareWeight,
        unloaderId: receiptForm.unloaderId,
        notes: receiptForm.notes
      };

      const updated = tripEngineService.recordDestinationReceipt(params);
      refreshTrips();
      setReceiptModalTrip(null);
      setSelectedTrip(updated);

      setNotification({
        type: 'SUCCESS',
        message: `تم توثيق استلام الرحلة (${updated.tripSerial}) بنجاح! تم احتساب صافي وزن الوصول (${updated.destNetWeight} كجم) وفارق الوزن (${updated.varianceWeight} كجم).`
      });
    } catch (err: any) {
      setNotification({
        type: 'ERROR',
        message: err.message || 'فشل توثيق استلام الرحلة'
      });
    }
  };

  // Scenario quick setters
  const applyScenario = (scenarioKey: string) => {
    switch (scenarioKey) {
      case 'SUCCESS_TON':
        setFormData({
          projectId: 'PRJ-NEOM-001',
          carrierId: 'CAR-ALMAJDOUIE',
          truckId: 'TRK-9901',
          driverId: 'DRV-101',
          materialId: 'MAT-AGG-01',
          pricingRuleId: 'PRC-NEOM-AGG-TON',
          shiftDate: new Date().toISOString().split('T')[0],
          ticketId: `WB-TKT-${Math.floor(100000 + Math.random() * 900000)}`,
          tareWeight: 14200,
          grossWeight: 45800,
          loaderId: 'OPR-SCALE-01',
          notes: 'شحنة ركام بازلتي مطابقة 100% لجميع الشروط والمعايير (تسعير بالطن)',
          createdBy: 'USR-DISPATCHER'
        });
        setSimulateTampering(false);
        setActiveSubTab('DISPATCH');
        break;

      case 'SUCCESS_TRIP':
        setFormData({
          projectId: 'PRJ-NEOM-001',
          carrierId: 'CAR-BINLADIN',
          truckId: 'TRK-9902',
          driverId: 'DRV-102',
          materialId: 'MAT-SND-01',
          pricingRuleId: 'PRC-NEOM-SND-TRIP',
          shiftDate: new Date().toISOString().split('T')[0],
          ticketId: `WB-TKT-${Math.floor(100000 + Math.random() * 900000)}`,
          tareWeight: 13800,
          grossWeight: 44300,
          loaderId: 'OPR-SCALE-02',
          notes: 'شحنة رمل ناعم مطابقة 100% بنظام المقطوعية بالرد (PER_TRIP)',
          createdBy: 'USR-DISPATCHER'
        });
        setSimulateTampering(false);
        setActiveSubTab('DISPATCH');
        break;

      case 'FAIL_RULE_3_CARRIER':
        // Carrier not authorized in project
        setFormData(prev => ({
          ...prev,
          carrierId: 'CAR-SHARQI', // مؤسسة الشرقي غير مصرح بها في نيوم
          notes: 'محاولة ترحيل رحلة لناقل غير مصرح به في المشروع'
        }));
        setActiveSubTab('DISPATCH');
        break;

      case 'FAIL_RULE_4_MATERIAL':
        // Material not authorized in project
        setFormData(prev => ({
          ...prev,
          materialId: 'MAT-ASPH-01', // أسفلت غير مصرح به في مشروع الردميات
          notes: 'محاولة توريد خلطة أسفلتية غير مصرح بها في هذا المشروع'
        }));
        setActiveSubTab('DISPATCH');
        break;

      case 'FAIL_RULE_5_RELATION':
        // Truck belongs to Al-Majdouie, but Bin Ladin carrier selected
        setFormData(prev => ({
          ...prev,
          carrierId: 'CAR-BINLADIN',
          truckId: 'TRK-9901', // truck belongs to CAR-ALMAJDOUIE!
          notes: 'محاولة مخالفة تبعية وكفالة الشاحنة للناقل المختار'
        }));
        setActiveSubTab('DISPATCH');
        break;

      case 'FAIL_RULE_6_PRICING':
        // Pricing rule is expired
        setFormData(prev => ({
          ...prev,
          pricingRuleId: 'PRC-NEOM-EXPIRED', // Ended in 2025!
          notes: 'محاولة تطبيق تسعيرة منتهية الصلاحية الزمنية'
        }));
        setActiveSubTab('DISPATCH');
        break;

      case 'TEST_WEIGHT_SECURITY':
        // Client tries to tamper with netWeight
        setFormData({
          projectId: 'PRJ-NEOM-001',
          carrierId: 'CAR-ALMAJDOUIE',
          truckId: 'TRK-9901',
          driverId: 'DRV-101',
          materialId: 'MAT-AGG-01',
          pricingRuleId: 'PRC-NEOM-AGG-TON',
          shiftDate: new Date().toISOString().split('T')[0],
          ticketId: `WB-TKT-SEC-${Math.floor(1000 + Math.random() * 9000)}`,
          tareWeight: 14000,
          grossWeight: 44000, // Actual net is 30,000 kg
          loaderId: 'OPR-SCALE-01',
          notes: 'اختبار حوكمة الأوزان: العميل يحاول إرسال netWeight = 99,999 كجم',
          createdBy: 'TEST-SECURITY-AGENT'
        });
        setSimulateTampering(true);
        setTamperedNetWeight(99999);
        setActiveSubTab('DISPATCH');
        break;
    }
  };

  // Filter trips
  const filteredTrips = trips.filter(t => {
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.tripSerial.toLowerCase().includes(q) ||
        t.ticketId.toLowerCase().includes(q) ||
        t.truckId.toLowerCase().includes(q) ||
        t.driverId.toLowerCase().includes(q) ||
        t.carrierId.toLowerCase().includes(q) ||
        t.materialId.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // KPI Metrics
  const totalTripsCount = trips.length;
  const inTransitCount = trips.filter(t => t.status === 'IN_TRANSIT').length;
  const completedCount = trips.filter(t => t.status === 'COMPLETED').length;
  const totalNetTonnage = trips.reduce((acc, t) => acc + (t.netWeight / 1000), 0).toFixed(1);
  const totalSettlementSAR = trips.reduce((acc, t) => acc + t.settlementAmount, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Banner / Notification */}
      {notification && (
        <div 
          className={`p-4 rounded-xl border flex items-start justify-between gap-3 text-sm font-medium animate-fadeIn ${
            notification.type === 'SUCCESS' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
              : notification.type === 'SECURITY'
              ? 'bg-amber-50 border-amber-300 text-amber-950'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === 'SUCCESS' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
            {notification.type === 'SECURITY' && <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0" />}
            {notification.type === 'ERROR' && <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />}
            <span>{notification.message}</span>
          </div>
          <button 
            onClick={() => setNotification(null)}
            className="text-stone-400 hover:text-stone-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & KPI Summary */}
      <div className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-stone-100 pb-5 mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                <Truck className="w-4 h-4" />
              </div>
              <h1 className="text-xl font-bold text-stone-900">
                محرك الرحلات اللوجستية (Trip Engine)
              </h1>
              <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
                قواعد البيانات المرجعية الستة
              </span>
            </div>
            <p className="text-xs text-stone-600 max-w-3xl">
              المحرك المركزي للتحقق من علاقات الكيانات، فرض الحساب الخادومي الصارم للوزن الصافي، تجميد التسعير التاريخي (Pricing Snapshot)، وحوكمة استلام الموقع وتوثيق فارق الوزن.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveSubTab('LOADING_STATION')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeSubTab === 'LOADING_STATION' 
                  ? 'bg-amber-600 text-white shadow-xs' 
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>محطة التحميل والميزان (Loading Station)</span>
            </button>
            <button
              onClick={() => setActiveSubTab('STATE_MACHINE')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeSubTab === 'STATE_MACHINE' 
                  ? 'bg-amber-600 text-white shadow-xs' 
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              <GitCommit className="w-3.5 h-3.5" />
              <span>محرك الحالات المركزي (State Machine)</span>
            </button>
            <button
              onClick={() => setActiveSubTab('LIST')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeSubTab === 'LIST' 
                  ? 'bg-amber-600 text-white shadow-xs' 
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>سجل الرحلات ({totalTripsCount})</span>
            </button>
            <button
              onClick={() => setActiveSubTab('DISPATCH')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeSubTab === 'DISPATCH' 
                  ? 'bg-amber-600 text-white shadow-xs' 
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>إنشاء وترحيل رحلة (New Trip)</span>
            </button>
            <button
              onClick={() => setActiveSubTab('TEST_MATRIX')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeSubTab === 'TEST_MATRIX' 
                  ? 'bg-amber-600 text-white shadow-xs' 
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>مصفوفة سيناريوهات الاختبار (7 حالات)</span>
            </button>
            <button
              onClick={() => {
                tripEngineService.resetTrips();
                refreshTrips();
                setNotification({ type: 'SUCCESS', message: 'تمت استعادة الرحلات التوضيحية الافتراضية' });
              }}
              title="إعادة ضبط الرحلات الافتراضية"
              className="p-2 rounded-lg text-xs font-medium bg-stone-100 text-stone-600 hover:bg-stone-200"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-stone-50 rounded-xl p-3 border border-stone-200/60">
            <span className="text-[11px] font-medium text-stone-500 block mb-1">إجمالي الرحلات</span>
            <div className="text-xl font-black text-stone-900">{totalTripsCount}</div>
            <span className="text-[10px] text-stone-400">سجلات نظامية موثقة</span>
          </div>

          <div className="bg-amber-50/60 rounded-xl p-3 border border-amber-200/60">
            <span className="text-[11px] font-medium text-amber-800 block mb-1">قيد النقل (In-Transit)</span>
            <div className="text-xl font-black text-amber-900 flex items-center gap-1.5">
              <span>{inTransitCount}</span>
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            </div>
            <span className="text-[10px] text-amber-700">destNetWeight = null</span>
          </div>

          <div className="bg-emerald-50/60 rounded-xl p-3 border border-emerald-200/60">
            <span className="text-[11px] font-medium text-emerald-800 block mb-1">مستلمة ومفرغة بالكامل</span>
            <div className="text-xl font-black text-emerald-900">{completedCount}</div>
            <span className="text-[10px] text-emerald-700">تم احتساب varianceWeight</span>
          </div>

          <div className="bg-indigo-50/60 rounded-xl p-3 border border-indigo-200/60">
            <span className="text-[11px] font-medium text-indigo-800 block mb-1">إجمالي التسوية المحسوبة</span>
            <div className="text-xl font-black text-indigo-900">{totalSettlementSAR} <span className="text-xs font-normal">ر.س</span></div>
            <span className="text-[10px] text-indigo-700">احتساب خادومي Server-Side</span>
          </div>
        </div>
      </div>

      {/* ==================== SUB-TAB: LOADING STATION ==================== */}
      {activeSubTab === 'LOADING_STATION' && (
        <LoadingStation
          onTripCreated={(newTrip) => {
            refreshTrips();
            setSelectedTrip(newTrip);
          }}
          onViewTripDetails={(trip) => {
            setSelectedTrip(trip);
            setActiveSubTab('LIST');
          }}
          onNotification={setNotification}
        />
      )}

      {/* ==================== SUB-TAB: CENTRALIZED STATE MACHINE ==================== */}
      {activeSubTab === 'STATE_MACHINE' && (
        <StateMachineController
          trips={trips}
          selectedTripId={selectedTrip?.tripId}
          onSelectTrip={(id) => {
            const found = trips.find(t => t.tripId === id);
            if (found) setSelectedTrip(found);
          }}
          onTripUpdated={(updatedTrip) => {
            refreshTrips();
            setSelectedTrip(updatedTrip);
          }}
          onNotification={setNotification}
        />
      )}

      {/* ==================== SUB-TAB 1: DISPATCH / CREATE TRIP ==================== */}
      {activeSubTab === 'DISPATCH' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left / Main Form Column */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-stone-200/80 p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-5">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-stone-900">إنشاء وترحيل رحلة جديدة (Dispatch Trip)</h2>
                  <p className="text-xs text-stone-500">يتم التحقق خادومياً من القواعد الستة واحتساب الأوزان والتسوية تلقائياً.</p>
                </div>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 ${
                liveValidation.isValid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {liveValidation.isValid ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>مطابق للقواعد الـ 6</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>انتهاك قواعد التحقق</span>
                  </>
                )}
              </span>
            </div>

            <form onSubmit={handleDispatch} className="space-y-4">
              {/* Row 1: Project & Shift Date & Ticket */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">المشروع (projectId)</label>
                  <input 
                    type="text" 
                    value={formData.projectId} 
                    disabled 
                    className="w-full bg-stone-100 border border-stone-200 rounded-lg px-3 py-2 text-xs font-semibold text-stone-600 cursor-not-allowed"
                  />
                  <span className="text-[10px] text-stone-400">نيوم - القطاع 4 اللوجستي</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">تاريخ الوردية (shiftDate)</label>
                  <input 
                    type="date" 
                    value={formData.shiftDate} 
                    onChange={e => setFormData({ ...formData, shiftDate: e.target.value })}
                    className="w-full bg-white border border-stone-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                  <span className="text-[10px] text-stone-400">يُفحص به سريان قاعدة التسعير</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">رقم تذكرة الميزان (ticketId)</label>
                  <input 
                    type="text" 
                    value={formData.ticketId} 
                    onChange={e => setFormData({ ...formData, ticketId: e.target.value })}
                    className="w-full bg-white border border-stone-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
              </div>

              {/* Row 2: Carrier & Material */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    الناقل (carrierId)
                    <span className="text-stone-400 font-normal mr-1">[قاعدة 3: مصرح للمشروع]</span>
                  </label>
                  <select
                    value={formData.carrierId}
                    onChange={e => setFormData({ ...formData, carrierId: e.target.value })}
                    className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {SAMPLE_QUALITY_CONTEXT.knownCarriers.map(c => {
                      const isAuth = SAMPLE_QUALITY_CONTEXT.authorizedCarrierIds.includes(c.carrierId);
                      return (
                        <option key={c.carrierId} value={c.carrierId}>
                          {c.name} ({c.carrierId}) {isAuth ? '✓ مصرح' : '✗ غير مصرح'}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    المادة (materialId)
                    <span className="text-stone-400 font-normal mr-1">[قاعدة 4: مصرح للمشروع]</span>
                  </label>
                  <select
                    value={formData.materialId}
                    onChange={e => setFormData({ ...formData, materialId: e.target.value })}
                    className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {SAMPLE_QUALITY_CONTEXT.knownMaterials.map(m => {
                      const isAuth = SAMPLE_QUALITY_CONTEXT.authorizedMaterialIds.includes(m.materialId);
                      return (
                        <option key={m.materialId} value={m.materialId}>
                          {m.name} ({m.code}) {isAuth ? '✓ مصرح' : '✗ غير مصرح'}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Row 3: Truck & Driver */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    الشاحنة (truckId)
                    <span className="text-stone-400 font-normal mr-1">[قاعدة 1 و 5: تبعية الناقل]</span>
                  </label>
                  <select
                    value={formData.truckId}
                    onChange={e => setFormData({ ...formData, truckId: e.target.value })}
                    className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {SAMPLE_QUALITY_CONTEXT.knownTrucks.map(t => {
                      const ownerCarrier = SAMPLE_QUALITY_CONTEXT.knownCarriers.find(c => c.carrierId === t.carrierId)?.name || t.carrierId;
                      return (
                        <option key={t.truckId} value={t.truckId}>
                          {t.plate} [{t.truckId}] — تتبع: {ownerCarrier}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    السائق (driverId)
                    <span className="text-stone-400 font-normal mr-1">[قاعدة 2 و 5: صالح وكفالة الناقل]</span>
                  </label>
                  <select
                    value={formData.driverId}
                    onChange={e => setFormData({ ...formData, driverId: e.target.value })}
                    className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {SAMPLE_QUALITY_CONTEXT.knownDrivers.map(d => {
                      const ownerCarrier = SAMPLE_QUALITY_CONTEXT.knownCarriers.find(c => c.carrierId === d.carrierId)?.name || d.carrierId;
                      return (
                        <option key={d.driverId} value={d.driverId}>
                          {d.name} (هوية: {d.idNumber}) — كفالة: {ownerCarrier}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Row 4: Pricing Rule Selection */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  قاعدة التسعير (pricingRuleId)
                  <span className="text-stone-400 font-normal mr-1">[قاعدة 6: سارية في تاريخ الرحلة]</span>
                </label>
                <select
                  value={formData.pricingRuleId}
                  onChange={e => setFormData({ ...formData, pricingRuleId: e.target.value })}
                  className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {MASTER_PRICING_RULES.map(r => (
                    <option key={r.pricingRuleId} value={r.pricingRuleId}>
                      {r.name} — {r.agreedRate} {r.currency}/{r.pricingType === 'PER_TON' ? 'طن' : 'رد'} [صلاحية: {r.effectiveFrom} إلى {r.effectiveTo}] {r.status !== 'ACTIVE' ? '(معطلة)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Row 5: Scale Weights at Origin (tareWeight, grossWeight) */}
              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200">
                <div className="flex items-center gap-2 mb-2">
                  <Scale className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-stone-900">أوزان ميزان البسكول في موقع المصدر (Origin Scale)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">وزن الفارغ (tareWeight) كجم</label>
                    <input 
                      type="number"
                      value={formData.tareWeight}
                      onChange={e => setFormData({ ...formData, tareWeight: Number(e.target.value) })}
                      className="w-full bg-white border border-stone-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-stone-800"
                      min={1000}
                      step={50}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">الوزن القائم (grossWeight) كجم</label>
                    <input 
                      type="number"
                      value={formData.grossWeight}
                      onChange={e => setFormData({ ...formData, grossWeight: Number(e.target.value) })}
                      className="w-full bg-white border border-stone-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-stone-800"
                      min={formData.tareWeight + 100}
                      step={50}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-indigo-900 mb-1">صافي الوزن المحسوب خادومياً</label>
                    <div className="bg-indigo-100/60 border border-indigo-200 rounded-lg px-3 py-1.5 text-xs font-black text-indigo-950 flex items-center justify-between">
                      <span>{liveCalculatedNet.toLocaleString()} كجم</span>
                      <span className="text-[10px] font-normal text-indigo-700">({(liveCalculatedNet / 1000).toFixed(3)} طن)</span>
                    </div>
                  </div>
                </div>

                {/* Weight Security Verification Simulation */}
                <div className="mt-3 pt-3 border-t border-stone-200/80">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={simulateTampering}
                      onChange={e => setSimulateTampering(e.target.checked)}
                      className="w-4 h-4 text-amber-600 rounded border-stone-300 focus:ring-amber-500"
                    />
                    <span className="text-xs font-bold text-rose-800">
                      محاكاة إرسال netWeight غير موثوق من العميل لاختبار الحماية الرقابية: "لا تقبل netWeight من client"
                    </span>
                  </label>

                  {simulateTampering && (
                    <div className="mt-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">قيمة صافي الوزن المرسلة من العميل:</span>
                        <input 
                          type="number"
                          value={tamperedNetWeight}
                          onChange={e => setTamperedNetWeight(Number(e.target.value))}
                          className="w-28 bg-white border border-rose-300 rounded px-2 py-0.5 text-xs font-bold text-rose-900"
                        />
                        <span>كجم</span>
                      </div>
                      <p className="text-[11px] text-rose-700">
                        سيقوم الخادم برفض هذه القيمة فوراً واحتساب: {formData.grossWeight} - {formData.tareWeight} = {liveCalculatedNet} كجم، وتوثيق محاولة التلاعب في السجل.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Loader ID & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">مسؤول التحميل / كاتب الميزان (loaderId)</label>
                  <input 
                    type="text" 
                    value={formData.loaderId || ''} 
                    onChange={e => setFormData({ ...formData, loaderId: e.target.value })}
                    className="w-full bg-white border border-stone-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-stone-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">ملاحظات الرحلة (notes)</label>
                  <input 
                    type="text" 
                    value={formData.notes || ''} 
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full bg-white border border-stone-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-stone-800"
                  />
                </div>
              </div>

              {/* Submit Dispatch Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!liveValidation.isValid}
                  className={`w-full py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs ${
                    liveValidation.isValid 
                      ? 'bg-amber-600 hover:bg-amber-700 text-white cursor-pointer' 
                      : 'bg-stone-200 text-stone-400 cursor-not-allowed border border-stone-300'
                  }`}
                >
                  <Send className="w-4 h-4" />
                  <span>ترحيل واعتماد الرحلة فوراً في النظام (Dispatch Trip)</span>
                </button>
                {!liveValidation.isValid && (
                  <p className="text-[11px] text-rose-600 font-bold text-center mt-1.5">
                    تعذر الاعتماد: {liveValidation.blockingError}
                  </p>
                )}
              </div>
            </form>
          </div>

          {/* Right Column: Live Rules & Server Calculations Preview */}
          <div className="lg:col-span-4 space-y-4">
            {/* Live 6-Rules Matrix Box */}
            <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-xs">
              <h3 className="text-xs font-bold text-stone-900 flex items-center gap-1.5 mb-3 border-b border-stone-100 pb-2.5">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span>حالة فحص القواعد الستة اللحظي</span>
              </h3>

              <div className="space-y-2">
                {liveValidation.results.map(r => (
                  <div 
                    key={r.ruleCode}
                    className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                      r.passed 
                        ? 'bg-emerald-50/70 border-emerald-200/80 text-emerald-950' 
                        : 'bg-rose-50/70 border-rose-200/80 text-rose-950'
                    }`}
                  >
                    {r.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="font-bold text-[11px] flex items-center justify-between">
                        <span>{r.ruleDescriptionAr}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-black ${
                          r.passed ? 'bg-emerald-200/60 text-emerald-900' : 'bg-rose-200/60 text-rose-900'
                        }`}>
                          {r.passed ? 'PASSED' : 'BLOCKED'}
                        </span>
                      </div>
                      <p className="text-[10px] mt-0.5 opacity-90 leading-relaxed">
                        {r.messageAr}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Server-Side Calculations Preview Box */}
            <div className="bg-stone-900 text-stone-100 rounded-2xl p-5 shadow-sm border border-stone-800">
              <div className="flex items-center gap-2 mb-3 border-b border-stone-800 pb-2.5">
                <Calculator className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold text-stone-200">
                  الحسابات الخادومية الصارمة (Server-Side)
                </h3>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-stone-800">
                  <span className="text-stone-400">صافي الوزن (netWeight):</span>
                  <span className="font-mono font-bold text-amber-400">{liveCalculatedNet.toLocaleString()} كجم</span>
                </div>

                <div className="flex justify-between py-1 border-b border-stone-800">
                  <span className="text-stone-400">وزن الوصول (destNetWeight):</span>
                  <span className="font-mono text-stone-400 italic">null (في انتظار الاستلام)</span>
                </div>

                <div className="flex justify-between py-1 border-b border-stone-800">
                  <span className="text-stone-400">فارق الوزن (varianceWeight):</span>
                  <span className="font-mono text-stone-400 italic">null (في انتظار الاستلام)</span>
                </div>

                <div className="flex justify-between py-1 border-b border-stone-800">
                  <span className="text-stone-400">أساس التسوية (settlementBase):</span>
                  <span className="font-mono text-stone-200">
                    {liveSettlementBase} {selectedRule?.pricingType === 'PER_TON' ? 'طن' : 'رد'}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-stone-800">
                  <span className="text-stone-400">سعر الوحدة المتفق عليه:</span>
                  <span className="font-mono text-stone-200">
                    {selectedRule?.agreedRate || 0} {selectedRule?.currency || 'SAR'}
                  </span>
                </div>

                <div className="flex justify-between py-1.5 bg-stone-800/80 px-2.5 rounded-lg text-emerald-400 font-bold">
                  <span>مبلغ التسوية المستحق:</span>
                  <span className="font-mono text-sm">{liveSettlementAmount.toLocaleString()} ر.س</span>
                </div>
              </div>

              <div className="mt-3 pt-2 text-[10px] text-stone-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>يتم حفظ لقطة التسعير (Pricing Snapshot) داخل سجل الرحلة لضمان عدم التلاعب المستقبلي.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== SUB-TAB 2: TEST MATRIX & SCENARIOS ==================== */}
      {activeSubTab === 'TEST_MATRIX' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-xs">
            <h2 className="text-base font-bold text-stone-900 mb-1 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
              <span>مصفوفة سيناريوهات الاختبار العملي للقواعد المعمارية</span>
            </h2>
            <p className="text-xs text-stone-500 mb-5">
              انقر على أي سيناريو أدناه لتحميل بياناته فوراً وملاحظة سلوك محرك الرحلات في القبول أو الحظر:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {/* Scenario 1 */}
              <div 
                onClick={() => applyScenario('SUCCESS_TON')}
                className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50 cursor-pointer transition-all space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900">سيناريو 1: رحلة مطابقة (بالطن)</span>
                  <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded font-black">ناجح ✓</span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  ناقل مصرح (المجدوعي)، شاحنة وسائق مطابقان، مادة ركام معتمدة، وتسعيرة سارية بالطن.
                </p>
                <div className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 group-hover:underline">
                  <span>تحميل واختبار السيناريو</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>

              {/* Scenario 2 */}
              <div 
                onClick={() => applyScenario('SUCCESS_TRIP')}
                className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50 cursor-pointer transition-all space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900">سيناريو 2: رحلة مقطوعية (بالرد)</span>
                  <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded font-black">ناجح ✓</span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  ناقل بن لادن، شاحنة وسائق مطابقان، مادة رمل، تسعيرة مقطوعية ثابتة 1400 ر.س للرد الواحد.
                </p>
                <div className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 group-hover:underline">
                  <span>تحميل واختبار السيناريو</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>

              {/* Scenario 3 */}
              <div 
                onClick={() => applyScenario('FAIL_RULE_3_CARRIER')}
                className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 hover:bg-rose-50 cursor-pointer transition-all space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-900">سيناريو 3: ناقل غير مصرح</span>
                  <span className="text-[10px] bg-rose-200 text-rose-900 px-2 py-0.5 rounded font-black">قاعدة 3 ✗</span>
                </div>
                <p className="text-[11px] text-rose-800 leading-relaxed">
                  اختيار "مؤسسة الشرقي" التي لا تملك ترخيص عمل في مشروع نيوم. يحظر النظام إنشاء الرحلة.
                </p>
                <div className="text-[10px] text-rose-700 font-bold flex items-center gap-1 group-hover:underline">
                  <span>تحميل واختبار السيناريو</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>

              {/* Scenario 4 */}
              <div 
                onClick={() => applyScenario('FAIL_RULE_4_MATERIAL')}
                className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 hover:bg-rose-50 cursor-pointer transition-all space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-900">سيناريو 4: مادة غير مسموحة</span>
                  <span className="text-[10px] bg-rose-200 text-rose-900 px-2 py-0.5 rounded font-black">قاعدة 4 ✗</span>
                </div>
                <p className="text-[11px] text-rose-800 leading-relaxed">
                  محاولة توريد "خلطة أسفلتية ساخنة" في مشروع مخصص لنقل الردميات والركام. حظر فوري.
                </p>
                <div className="text-[10px] text-rose-700 font-bold flex items-center gap-1 group-hover:underline">
                  <span>تحميل واختبار السيناريو</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>

              {/* Scenario 5 */}
              <div 
                onClick={() => applyScenario('FAIL_RULE_5_RELATION')}
                className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 hover:bg-rose-50 cursor-pointer transition-all space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-900">سيناريو 5: تعارض الشاحنة والناقل</span>
                  <span className="text-[10px] bg-rose-200 text-rose-900 px-2 py-0.5 rounded font-black">قاعدة 5 ✗</span>
                </div>
                <p className="text-[11px] text-rose-800 leading-relaxed">
                  اختيار شاحنة كفالتها تتبع المجدوعي مع تعيين الناقل بن لادن. يتم الحظر لعدم صحة العلاقة.
                </p>
                <div className="text-[10px] text-rose-700 font-bold flex items-center gap-1 group-hover:underline">
                  <span>تحميل واختبار السيناريو</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>

              {/* Scenario 6 */}
              <div 
                onClick={() => applyScenario('FAIL_RULE_6_PRICING')}
                className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 hover:bg-rose-50 cursor-pointer transition-all space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-900">سيناريو 6: تسعيرة منتهية الصلاحية</span>
                  <span className="text-[10px] bg-rose-200 text-rose-900 px-2 py-0.5 rounded font-black">قاعدة 6 ✗</span>
                </div>
                <p className="text-[11px] text-rose-800 leading-relaxed">
                  اختيار قاعدة تسعير انتهت صلاحيتها بتاريخ 2025-12-31 وتاريخ الرحلة 2026. حظر فوري.
                </p>
                <div className="text-[10px] text-rose-700 font-bold flex items-center gap-1 group-hover:underline">
                  <span>تحميل واختبار السيناريو</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>

              {/* Scenario 7: Weight Security Tampering */}
              <div 
                onClick={() => applyScenario('TEST_WEIGHT_SECURITY')}
                className="p-4 rounded-xl border border-amber-300 bg-amber-50/50 hover:bg-amber-50 cursor-pointer transition-all space-y-2 group md:col-span-2 lg:col-span-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-700" />
                    <span className="text-xs font-bold text-amber-950">
                      سيناريو 7: اختبار أمان الأوزان - رفض netWeight من العميل وحسابه خادومياً
                    </span>
                  </div>
                  <span className="text-[10px] bg-amber-200 text-amber-950 px-2 py-0.5 rounded font-black">SECURITY GUARD 🛡️</span>
                </div>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  يحاكي محاولة العميل إرسال صافي وزن مزور (99,999 كجم) بينما الأوزان هي: قائم 44,000 كجم وفارغ 14,000 كجم. يقوم المحرك برفض قيمة العميل، واحتساب 30,000 كجم بدقة، وتوثيق تنبيه الحوكمة الأمني في ملاحظات الرحلة.
                </p>
                <div className="text-[10px] text-amber-800 font-bold flex items-center gap-1 group-hover:underline">
                  <span>تحميل واختبار سيناريو الأمان الرقابي</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== SUB-TAB 0: TRIPS LIST & TABLE ==================== */}
      {activeSubTab === 'LIST' && (
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
          {/* Table Controls */}
          <div className="p-4 border-b border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute right-3 top-2.5" />
                <input 
                  type="text"
                  placeholder="بحث برقم الرحلة، التذكرة، الشاحنة..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-3 pr-8 py-1.5 rounded-lg border border-stone-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs text-stone-700 bg-stone-50 font-medium"
              >
                <option value="ALL">جميع الحالات (10 حالات)</option>
                <option value="DRAFT">مسودة (DRAFT)</option>
                <option value="LOADED">تم التحميل (LOADED)</option>
                <option value="IN_TRANSIT">في الطريق (IN_TRANSIT)</option>
                <option value="ARRIVED">وصلت الموقع (ARRIVED)</option>
                <option value="UNLOADING">قيد التفريغ (UNLOADING)</option>
                <option value="COMPLETED">مكتملة ومستلمة (COMPLETED)</option>
                <option value="RETURN_REQUESTED">طلب إرجاع (RETURN_REQ)</option>
                <option value="RETURNED">مرتجعة (RETURNED)</option>
                <option value="EXCEPTION">استثناء (EXCEPTION)</option>
                <option value="CANCELLED">ملغاة (CANCELLED)</option>
              </select>
            </div>

            <div className="text-xs text-stone-500 font-medium self-end sm:self-auto">
              عرض {filteredTrips.length} من أصل {trips.length} رحلة
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-stone-50/80 text-stone-600 font-bold border-b border-stone-200">
                <tr>
                  <th className="py-3 px-3">رقم الرحلة / التذكرة</th>
                  <th className="py-3 px-3">الناقل والشاحنة</th>
                  <th className="py-3 px-3">السائق والمادة</th>
                  <th className="py-3 px-3 text-center">أوزان المصدر (كجم)</th>
                  <th className="py-3 px-3 text-center">وزن الوصول الصافي</th>
                  <th className="py-3 px-3 text-center">فارق الوزن</th>
                  <th className="py-3 px-3 text-center">التسوية (SAR)</th>
                  <th className="py-3 px-3 text-center">الحالة / الإصدار</th>
                  <th className="py-3 px-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredTrips.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-stone-400 text-xs font-medium">
                      لا توجد رحلات مطابقة لمعايير البحث
                    </td>
                  </tr>
                ) : (
                  filteredTrips.map(trip => (
                    <tr key={trip.tripId} className="hover:bg-amber-50/30 transition-colors">
                      {/* Trip Serial & Ticket */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-stone-900 font-mono text-xs">{trip.tripSerial}</div>
                        <div className="text-[10px] text-stone-400 font-mono">تذكرة: {trip.ticketId}</div>
                        <div className="text-[10px] text-stone-500">{trip.shiftDate}</div>
                      </td>

                      {/* Carrier & Truck */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-stone-800">
                          {trip.entitySnapshots?.carrier?.companyNameAr || trip.carrierId}
                        </div>
                        <div className="text-[10px] text-stone-500 font-mono">
                          شاحنة: {trip.entitySnapshots?.truck?.plateNumberAr || trip.truckId}
                        </div>
                      </td>

                      {/* Driver & Material */}
                      <td className="py-3 px-3">
                        <div className="font-medium text-stone-800">
                          {trip.entitySnapshots?.driver?.fullNameAr || trip.driverId}
                        </div>
                        <div className="text-[10px] text-stone-500">
                          {trip.entitySnapshots?.material?.nameAr || trip.materialId}
                        </div>
                      </td>

                      {/* Origin Weights */}
                      <td className="py-3 px-3 text-center">
                        <div className="font-bold text-stone-900 font-mono">
                          {trip.netWeight.toLocaleString()} <span className="text-[10px] font-normal text-stone-500">كجم</span>
                        </div>
                        <div className="text-[10px] text-stone-400 font-mono">
                          قائم: {trip.grossWeight.toLocaleString()} | فارغ: {trip.tareWeight.toLocaleString()}
                        </div>
                      </td>

                      {/* Destination Net Weight */}
                      <td className="py-3 px-3 text-center">
                        {trip.destNetWeight !== null ? (
                          <div className="font-bold text-stone-900 font-mono">
                            {trip.destNetWeight.toLocaleString()} <span className="text-[10px] font-normal text-stone-500">كجم</span>
                          </div>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-stone-100 text-stone-500 italic">
                            null (لم تُستلم)
                          </span>
                        )}
                      </td>

                      {/* Variance Weight */}
                      <td className="py-3 px-3 text-center">
                        {trip.varianceWeight !== null ? (
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            trip.varianceWeight === 0 
                              ? 'bg-stone-100 text-stone-700' 
                              : trip.varianceWeight < 0 
                              ? 'bg-amber-100 text-amber-900' 
                              : 'bg-emerald-100 text-emerald-900'
                          }`}>
                            {trip.varianceWeight > 0 ? `+${trip.varianceWeight}` : trip.varianceWeight} كجم
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-stone-100 text-stone-500 italic">
                            null
                          </span>
                        )}
                      </td>

                      {/* Settlement */}
                      <td className="py-3 px-3 text-center">
                        <div className="font-bold text-indigo-900 font-mono">
                          {trip.settlementAmount.toLocaleString()} <span className="text-[10px] font-normal text-indigo-700">SAR</span>
                        </div>
                        <div className="text-[10px] text-stone-400">
                          {trip.settlementBase} {trip.pricingType === 'PER_TON' ? 'طن' : 'رد'} × {trip.agreedRate}
                        </div>
                      </td>

                      {/* Status & Version */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            trip.status === 'COMPLETED' 
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300' 
                              : trip.status === 'IN_TRANSIT'
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : trip.status === 'LOADED'
                              ? 'bg-sky-100 text-sky-800 border-sky-300'
                              : trip.status === 'ARRIVED'
                              ? 'bg-purple-100 text-purple-900 border-purple-300'
                              : trip.status === 'UNLOADING'
                              ? 'bg-blue-100 text-blue-900 border-blue-300'
                              : trip.status === 'RETURN_REQUESTED'
                              ? 'bg-orange-100 text-orange-900 border-orange-300'
                              : trip.status === 'RETURNED'
                              ? 'bg-stone-200 text-stone-900 border-stone-400'
                              : trip.status === 'EXCEPTION'
                              ? 'bg-rose-100 text-rose-900 border-rose-300'
                              : trip.status === 'CANCELLED'
                              ? 'bg-red-100 text-red-900 border-red-300'
                              : 'bg-stone-100 text-stone-700 border-stone-300'
                          }`}>
                            {trip.status === 'COMPLETED' && 'مكتملة ومفرغة'}
                            {trip.status === 'IN_TRANSIT' && 'في الطريق'}
                            {trip.status === 'LOADED' && 'تم التحميل والوزن'}
                            {trip.status === 'ARRIVED' && 'وصلت الموقع'}
                            {trip.status === 'UNLOADING' && 'قيد التفريغ'}
                            {trip.status === 'RETURN_REQUESTED' && 'طلب إرجاع'}
                            {trip.status === 'RETURNED' && 'مرتجعة للمصدر'}
                            {trip.status === 'EXCEPTION' && 'استثناء مسجل'}
                            {trip.status === 'CANCELLED' && 'ملغاة'}
                            {trip.status === 'DRAFT' && 'مسودة'}
                          </span>
                          <span className="text-[9px] text-stone-400 font-mono font-bold">v{trip.version}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedTrip(trip);
                              setActiveSubTab('STATE_MACHINE');
                            }}
                            className="px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-[10px] font-bold transition-all flex items-center gap-1 shadow-2xs"
                            title="التحكم في دورة الحياة بالمحرك المركزي"
                          >
                            <GitCommit className="w-3 h-3 text-amber-700" />
                            <span>محرك الحالة</span>
                          </button>

                          <button
                            onClick={() => setSelectedTrip(trip)}
                            className="p-1.5 rounded hover:bg-stone-100 text-stone-600 hover:text-stone-900 transition-colors"
                            title="عرض تفاصيل الرحلة والـ Snapshot"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {trip.status === 'IN_TRANSIT' && (
                            <button
                              onClick={() => {
                                setReceiptModalTrip(trip);
                                setReceiptForm({
                                  destGrossWeight: trip.grossWeight - 150,
                                  destTareWeight: trip.tareWeight,
                                  unloaderId: 'ENG-SITE-04',
                                  notes: 'تمت مطابقة ميزان الاستلام في الموقع'
                                });
                              }}
                              className="px-2 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold transition-all flex items-center gap-1 shadow-2xs"
                              title="تسجيل وصول واستلام في الموقع"
                            >
                              <Scale className="w-3 h-3" />
                              <span>استلام الموقع</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== DESTINATION RECEIPT MODAL ==================== */}
      {receiptModalTrip && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-stone-200 max-w-lg w-full p-6 shadow-xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-100 text-amber-800">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">تسجيل استلام الموقع وميزان الوصول</h3>
                  <p className="text-xs text-stone-500">الرحلة: {receiptModalTrip.tripSerial}</p>
                </div>
              </div>
              <button onClick={() => setReceiptModalTrip(null)} className="text-stone-400 hover:text-stone-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-stone-50 rounded-xl text-xs space-y-1 border border-stone-200">
              <div className="flex justify-between">
                <span className="text-stone-500">صافي وزن المصدر (Origin Net):</span>
                <span className="font-bold text-stone-900 font-mono">{receiptModalTrip.netWeight.toLocaleString()} كجم</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">الناقل والشاحنة:</span>
                <span className="font-medium text-stone-800">{receiptModalTrip.entitySnapshots?.truck?.plateNumberAr} ({receiptModalTrip.entitySnapshots?.carrier?.companyNameAr})</span>
              </div>
            </div>

            <form onSubmit={handleRecordReceipt} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-stone-700 mb-1">الوزن القائم بالوصول (كجم)</label>
                  <input 
                    type="number"
                    value={receiptForm.destGrossWeight}
                    onChange={e => setReceiptForm({ ...receiptForm, destGrossWeight: Number(e.target.value) })}
                    className="w-full border border-stone-300 rounded-lg p-2 text-xs font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium text-stone-700 mb-1">وزن الفارغ بالوصول (كجم)</label>
                  <input 
                    type="number"
                    value={receiptForm.destTareWeight}
                    onChange={e => setReceiptForm({ ...receiptForm, destTareWeight: Number(e.target.value) })}
                    className="w-full border border-stone-300 rounded-lg p-2 text-xs font-semibold"
                    required
                  />
                </div>
              </div>

              {/* Live Preview of Calculated Destination Net and Variance */}
              {receiptForm.destGrossWeight > receiptForm.destTareWeight && (
                <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 space-y-1">
                  <div className="flex justify-between font-bold text-indigo-950">
                    <span>صافي وزن الوصول المحسوب (destNetWeight):</span>
                    <span className="font-mono">{(receiptForm.destGrossWeight - receiptForm.destTareWeight).toLocaleString()} كجم</span>
                  </div>
                  <div className="flex justify-between text-indigo-900">
                    <span>فارق الوزن المحسوب (varianceWeight = dest - origin):</span>
                    <span className="font-mono font-bold">
                      {(receiptForm.destGrossWeight - receiptForm.destTareWeight - receiptModalTrip.netWeight).toLocaleString()} كجم
                    </span>
                  </div>
                  <p className="text-[10px] text-indigo-700">
                    التحقق من القاعدة: يتم تحويل destNetWeight و varianceWeight من null إلى أرقام محققة.
                  </p>
                </div>
              )}

              <div>
                <label className="block font-medium text-stone-700 mb-1">مستلم الموقع / المفتش (unloaderId)</label>
                <input 
                  type="text"
                  value={receiptForm.unloaderId}
                  onChange={e => setReceiptForm({ ...receiptForm, unloaderId: e.target.value })}
                  className="w-full border border-stone-300 rounded-lg p-2 text-xs font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">ملاحظات الاستلام</label>
                <input 
                  type="text"
                  value={receiptForm.notes}
                  onChange={e => setReceiptForm({ ...receiptForm, notes: e.target.value })}
                  className="w-full border border-stone-300 rounded-lg p-2 text-xs font-semibold"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReceiptModalTrip(null)}
                  className="px-4 py-2 rounded-lg border border-stone-300 text-stone-700 text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
                >
                  تأكيد الاستلام واعتماد الفارق
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== TRIP DETAIL & PRICING SNAPSHOT DRAWER ==================== */}
      {selectedTrip && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex justify-end z-50">
          <div className="bg-white max-w-2xl w-full h-full p-6 shadow-2xl overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-amber-100 text-amber-900">
                    {selectedTrip.tripSerial}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    selectedTrip.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {selectedTrip.status}
                  </span>
                  <span className="text-[10px] text-stone-400 font-mono">الإصدار: v{selectedTrip.version}</span>
                </div>
                <h2 className="text-base font-bold text-stone-900 mt-1">سجل الرحلة التفصيلي واللقطة السعرية</h2>
              </div>
              <button 
                onClick={() => setSelectedTrip(null)} 
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Trip Attributes Grid */}
            <div className="space-y-4 text-xs">
              <h3 className="font-bold text-stone-900 border-b pb-1">1. المعرفات والبيانات التشغيلية</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-2.5 rounded-lg bg-stone-50 border">
                  <span className="text-[10px] text-stone-500 block">tripId</span>
                  <span className="font-mono font-bold text-stone-900 break-all">{selectedTrip.tripId}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-stone-50 border">
                  <span className="text-[10px] text-stone-500 block">projectId</span>
                  <span className="font-mono font-bold text-stone-900">{selectedTrip.projectId}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-stone-50 border">
                  <span className="text-[10px] text-stone-500 block">ticketId</span>
                  <span className="font-mono font-bold text-stone-900">{selectedTrip.ticketId}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-stone-50 border">
                  <span className="text-[10px] text-stone-500 block">truckId</span>
                  <span className="font-mono font-bold text-stone-900">{selectedTrip.truckId}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-stone-50 border">
                  <span className="text-[10px] text-stone-500 block">driverId</span>
                  <span className="font-mono font-bold text-stone-900">{selectedTrip.driverId}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-stone-50 border">
                  <span className="text-[10px] text-stone-500 block">carrierId</span>
                  <span className="font-mono font-bold text-stone-900">{selectedTrip.carrierId}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-stone-50 border">
                  <span className="text-[10px] text-stone-500 block">materialId</span>
                  <span className="font-mono font-bold text-stone-900">{selectedTrip.materialId}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-stone-50 border">
                  <span className="text-[10px] text-stone-500 block">shiftDate</span>
                  <span className="font-mono font-bold text-stone-900">{selectedTrip.shiftDate}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-stone-50 border">
                  <span className="text-[10px] text-stone-500 block">version</span>
                  <span className="font-mono font-bold text-stone-900">{selectedTrip.version}</span>
                </div>
              </div>

              <h3 className="font-bold text-stone-900 border-b pb-1 pt-2">2. حوكمة الأوزان (Weights)</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-2.5 rounded-lg bg-stone-50 border">
                  <span className="text-[10px] text-stone-500 block">وزن الفارغ (tareWeight)</span>
                  <span className="font-mono font-bold text-stone-900">{selectedTrip.tareWeight.toLocaleString()} كجم</span>
                </div>
                <div className="p-2.5 rounded-lg bg-stone-50 border">
                  <span className="text-[10px] text-stone-500 block">الوزن القائم (grossWeight)</span>
                  <span className="font-mono font-bold text-stone-900">{selectedTrip.grossWeight.toLocaleString()} كجم</span>
                </div>
                <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-200">
                  <span className="text-[10px] text-indigo-700 block font-bold">صافي المصدر (netWeight)</span>
                  <span className="font-mono font-black text-indigo-950">{selectedTrip.netWeight.toLocaleString()} كجم</span>
                  <span className="text-[9px] text-indigo-600 block">حساب خادومي صارم</span>
                </div>
                <div className="p-2.5 rounded-lg bg-stone-50 border">
                  <span className="text-[10px] text-stone-500 block">صافي الوصول (destNetWeight)</span>
                  <span className="font-mono font-bold text-stone-900">
                    {selectedTrip.destNetWeight !== null ? `${selectedTrip.destNetWeight.toLocaleString()} كجم` : 'null (لم تُستلم)'}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-stone-50 border">
                  <span className="text-[10px] text-stone-500 block">فارق الوزن (varianceWeight)</span>
                  <span className="font-mono font-bold text-stone-900">
                    {selectedTrip.varianceWeight !== null ? `${selectedTrip.varianceWeight.toLocaleString()} كجم` : 'null'}
                  </span>
                </div>
              </div>

              <h3 className="font-bold text-stone-900 border-b pb-1 pt-2">3. التسوية واللقطة السعرية التاريخية (Pricing Snapshot)</h3>
              <div className="bg-stone-900 text-stone-100 rounded-xl p-4 space-y-2 border border-stone-800">
                <div className="flex justify-between">
                  <span className="text-stone-400">pricingRuleId:</span>
                  <span className="font-mono text-amber-300 font-bold">{selectedTrip.pricingSnapshot.pricingRuleId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">pricingType:</span>
                  <span className="font-mono text-stone-200">{selectedTrip.pricingSnapshot.pricingType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">agreedRate:</span>
                  <span className="font-mono text-stone-200">{selectedTrip.pricingSnapshot.agreedRate} {selectedTrip.pricingSnapshot.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">settlementBase:</span>
                  <span className="font-mono text-stone-200">{selectedTrip.pricingSnapshot.settlementBase}</span>
                </div>
                <div className="flex justify-between text-emerald-400 font-bold text-sm pt-1 border-t border-stone-800">
                  <span>settlementAmount:</span>
                  <span className="font-mono">{selectedTrip.pricingSnapshot.settlementAmount.toLocaleString()} {selectedTrip.pricingSnapshot.currency}</span>
                </div>
                <div className="flex justify-between text-[10px] text-stone-500 pt-1">
                  <span>تاريخ التقاط التسعيرة:</span>
                  <span className="font-mono">{selectedTrip.pricingSnapshot.pricingSnapshotAt}</span>
                </div>
              </div>

              <h3 className="font-bold text-stone-900 border-b pb-1 pt-2">4. المشغلون والتوقيت والملاحظات</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 rounded-lg bg-stone-50 border">
                  <span className="text-[10px] text-stone-500 block">loaderId</span>
                  <span className="font-mono font-bold text-stone-900">{selectedTrip.loaderId || 'غير مسجل'}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-stone-50 border">
                  <span className="text-[10px] text-stone-500 block">unloaderId</span>
                  <span className="font-mono font-bold text-stone-900">{selectedTrip.unloaderId || 'غير مسجل حتى الآن'}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-stone-50 border">
                  <span className="text-[10px] text-stone-500 block">loadTime</span>
                  <span className="font-mono text-stone-800 text-[11px]">{selectedTrip.loadTime || '-'}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-stone-50 border">
                  <span className="text-[10px] text-stone-500 block">unloadTime</span>
                  <span className="font-mono text-stone-800 text-[11px]">{selectedTrip.unloadTime || '-'}</span>
                </div>
              </div>

              <div className="p-3 bg-stone-50 rounded-lg border">
                <span className="text-[10px] text-stone-500 block mb-1">ملاحظات الرحلة والتتبع الرقابي (notes):</span>
                <p className="text-xs text-stone-800 leading-relaxed font-mono">
                  {selectedTrip.notes || 'لا توجد ملاحظات'}
                </p>
              </div>

              <div className="pt-2 text-[10px] text-stone-400 flex justify-between">
                <span>تم الإنشاء: {selectedTrip.createdAt} ({selectedTrip.createdBy})</span>
                <span>آخر تحديث: {selectedTrip.updatedAt} ({selectedTrip.updatedBy})</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
