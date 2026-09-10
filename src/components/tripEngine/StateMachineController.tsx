import React, { useState } from 'react';
import { 
  GitCommit, 
  ShieldCheck, 
  ShieldAlert, 
  ArrowRight, 
  UserCheck, 
  Building2, 
  Clock, 
  History, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  FileText, 
  Scale, 
  Sparkles, 
  Play, 
  Layers,
  ChevronRight,
  Eye,
  Lock,
  RefreshCw,
  Sliders,
  Check
} from 'lucide-react';
import { 
  TripRecord, 
  TripEngineStatus, 
  TripActorRole, 
  TransitionContext, 
  TransitionPayload, 
  TripLifecycleEvent, 
  TripAuditLog 
} from '../../types/tripEngine';
import { tripEngineService, MASTER_PRICING_RULES } from '../../services/tripEngine.service';
import { tripStateMachine, STATE_TRANSITIONS } from '../../services/tripStateMachine.service';

interface StateMachineControllerProps {
  trips: TripRecord[];
  onTripUpdated: (updatedTrip: TripRecord) => void;
  onNotification: (notif: { type: 'SUCCESS' | 'ERROR' | 'SECURITY'; message: string }) => void;
  selectedTripId?: string;
  onSelectTrip: (tripId: string) => void;
}

export const StateMachineController: React.FC<StateMachineControllerProps> = ({
  trips,
  onTripUpdated,
  onNotification,
  selectedTripId,
  onSelectTrip
}) => {
  // Current active actor / persona for RBAC validation testing
  const [activeRole, setActiveRole] = useState<TripActorRole>('DISPATCHER');
  const [activeActorId, setActiveActorId] = useState<string>('USR-DISPATCHER-01');
  const [activeActorName, setActiveActorName] = useState<string>('م. صالح الغامدي');
  const [activeProjectId, setActiveProjectId] = useState<string>('PRJ-NEOM-001');

  // Currently selected trip for lifecycle operations
  const activeTrip = trips.find(t => t.tripId === (selectedTripId || trips[0]?.tripId)) || trips[0];

  // Transition form state
  const [transitionTarget, setTransitionTarget] = useState<TripEngineStatus | null>(null);
  const [transitionPayload, setTransitionPayload] = useState<TransitionPayload>({
    destGrossWeight: 45600,
    destTareWeight: 14200,
    destNetWeight: 31400,
    unloaderId: 'ENG-SITE-04',
    unloadTime: new Date().toISOString(),
    reason: '',
    notes: ''
  });

  // Active view tab inside State Machine
  const [innerTab, setInnerTab] = useState<'CONTROLLER' | 'EVENTS' | 'AUDIT_TRAIL' | 'DIAGRAM'>('CONTROLLER');

  // Negative test logs
  const [stressTestLog, setStressTestLog] = useState<{
    testName: string;
    passedBlocked: boolean;
    serverMessage: string;
    timestamp: string;
  } | null>(null);

  const availableTransitions = activeTrip 
    ? tripStateMachine.getAvailableTransitions(activeTrip, activeRole)
    : [];

  const tripEvents = activeTrip ? tripEngineService.getEvents(activeTrip.tripId) : [];
  const tripAudits = activeTrip ? tripEngineService.getAuditLogs(activeTrip.tripId) : [];

  // Handle legitimate transition
  const handleExecuteTransition = (targetStatus: TripEngineStatus) => {
    if (!activeTrip) return;

    try {
      const context: TransitionContext = {
        actorId: activeActorId,
        actorRole: activeRole,
        actorName: activeActorName,
        projectId: activeProjectId,
        reason: transitionPayload.reason || STATE_TRANSITIONS[targetStatus].labelAr
      };

      const result = tripEngineService.executeTransition(
        activeTrip.tripId,
        targetStatus,
        context,
        transitionPayload
      );

      onTripUpdated(result.updatedTrip);
      setTransitionTarget(null);
      setStressTestLog(null);

      onNotification({
        type: 'SUCCESS',
        message: `تم ترقية حالة الرحلة بنجاح إلى [${targetStatus}] وتحديث الـ Version إلى v${result.updatedTrip.version} وتسجيل حدث التدقيق.`
      });
    } catch (err: any) {
      onNotification({
        type: 'ERROR',
        message: err.message || 'فشل تنفيذ الانتقال في محرك الحالات'
      });
    }
  };

  // ===================== NEGATIVE TEST CASES (STRESS TESTS) =====================

  // Test 1: Direct client mutation (client attempts to bypass state machine)
  const testDirectClientMutation = () => {
    if (!activeTrip) return;
    try {
      // Direct client mutation simulation
      const maliciousClientPayload = {
        ...activeTrip,
        status: 'COMPLETED' as TripEngineStatus // Client tries to force COMPLETED directly!
      };

      // Invariant Check
      tripEngineService.assertNoDirectStatusMutation(activeTrip, maliciousClientPayload);

      // If it didn't throw, it failed the security test
      setStressTestLog({
        testName: 'حظر التعديل المباشر من العميل (Direct Mutation Guard)',
        passedBlocked: false,
        serverMessage: 'فشل الحظر: سمح النظام للعميل بتعديل الحالة مباشرة!',
        timestamp: new Date().toLocaleTimeString('ar-SA')
      });
    } catch (err: any) {
      // Successfully blocked!
      setStressTestLog({
        testName: 'حظر التعديل المباشر من العميل (Direct Mutation Guard)',
        passedBlocked: true,
        serverMessage: err.message,
        timestamp: new Date().toLocaleTimeString('ar-SA')
      });
      onNotification({
        type: 'SECURITY',
        message: `[اختبار أمني ناجح]: تم حظر محاولة العميل لتعديل status مباشرة بنجاح!`
      });
    }
  };

  // Test 2: Complete trip without destNetWeight
  const testCompleteWithoutDestNetWeight = () => {
    if (!activeTrip) return;
    try {
      const context: TransitionContext = {
        actorId: 'REC-01',
        actorRole: 'SITE_RECEIVER',
        actorName: 'مستلم تجريبي',
        projectId: activeTrip.projectId,
        reason: 'محاولة إكمال بدون صافي وزن الوصول'
      };

      // Pass undefined / missing destNetWeight
      tripStateMachine.transition(activeTrip, 'COMPLETED', context, {
        destNetWeight: undefined,
        destGrossWeight: undefined,
        unloaderId: 'ENG-01',
        unloadTime: new Date().toISOString()
      });

      setStressTestLog({
        testName: 'إكمال الرحلة بدون destNetWeight',
        passedBlocked: false,
        serverMessage: 'خطأ: سمح النظام بإكمال الرحلة بدون صافي وزن موقع الاستلام!',
        timestamp: new Date().toLocaleTimeString('ar-SA')
      });
    } catch (err: any) {
      setStressTestLog({
        testName: 'حظر إكمال الرحلة بدون destNetWeight',
        passedBlocked: true,
        serverMessage: err.message,
        timestamp: new Date().toLocaleTimeString('ar-SA')
      });
      onNotification({
        type: 'SECURITY',
        message: `[قاعدة رقابية]: تم حظر إكمال الرحلة لعدم وجود صافي وزن موقع الاستلام (destNetWeight).`
      });
    }
  };

  // Test 3: Complete trip without unloaderId or unloadTime
  const testCompleteWithoutUnloaderOrTime = () => {
    if (!activeTrip) return;
    try {
      const context: TransitionContext = {
        actorId: '',
        actorRole: 'SITE_RECEIVER',
        actorName: 'مستلم تجريبي',
        projectId: activeTrip.projectId,
        reason: 'محاولة إكمال بدون تحديد مستلم أو وقت تفريغ'
      };

      // Clear unloaderId and unloadTime
      const tripWithoutUnloader = { ...activeTrip, unloaderId: null, unloadTime: null };

      tripStateMachine.transition(tripWithoutUnloader, 'COMPLETED', context, {
        destNetWeight: 31200,
        unloaderId: '', // Missing unloaderId
        unloadTime: '' // Missing unloadTime
      });

      setStressTestLog({
        testName: 'إكمال الرحلة بدون unloaderId أو unloadTime',
        passedBlocked: false,
        serverMessage: 'خطأ: سمح النظام بإكمال الرحلة بدون تحديد مستلم الموقع أو وقت التفريغ!',
        timestamp: new Date().toLocaleTimeString('ar-SA')
      });
    } catch (err: any) {
      setStressTestLog({
        testName: 'حظر إكمال الرحلة بدون unloaderId أو unloadTime',
        passedBlocked: true,
        serverMessage: err.message,
        timestamp: new Date().toLocaleTimeString('ar-SA')
      });
      onNotification({
        type: 'SECURITY',
        message: `[قاعدة رقابية]: تم حظر إكمال الرحلة بدون مستلم معتمد (unloaderId) ووقت تفريغ (unloadTime).`
      });
    }
  };

  // Test 4: Complete trip without calculating variance
  const testCompleteWithoutVariance = () => {
    if (!activeTrip) return;
    try {
      // Simulate missing net weight which prevents variance calculation
      const brokenTrip = { ...activeTrip, netWeight: 0 };
      const context: TransitionContext = {
        actorId: 'REC-01',
        actorRole: 'SITE_RECEIVER',
        actorName: 'مستلم تجريبي',
        projectId: activeTrip.projectId,
        reason: 'محاولة إكمال بدون احتساب الفارق'
      };

      tripStateMachine.transition(brokenTrip, 'COMPLETED', context, {
        destNetWeight: 31200,
        unloaderId: 'REC-01',
        unloadTime: new Date().toISOString()
      });

      setStressTestLog({
        testName: 'إتمام رحلة بدون حساب variance',
        passedBlocked: false,
        serverMessage: 'خطأ: سمح النظام بإتمام الرحلة دون إمكانية حساب variance بدقة!',
        timestamp: new Date().toLocaleTimeString('ar-SA')
      });
    } catch (err: any) {
      setStressTestLog({
        testName: 'حظر إتمام رحلة بدون حساب variance',
        passedBlocked: true,
        serverMessage: err.message,
        timestamp: new Date().toLocaleTimeString('ar-SA')
      });
      onNotification({
        type: 'SECURITY',
        message: `[قاعدة رقابية]: تم حظر إتمام الرحلة بدون حساب فرق الوزن (varianceWeight = destNetWeight - netWeight).`
      });
    }
  };

  // Test 5: Start trip (IN_TRANSIT) if Pricing Resolution fails
  const testStartTripWithFailedPricing = () => {
    if (!activeTrip) return;
    try {
      // Tamper trip with an invalid/expired pricing rule
      const brokenTrip: TripRecord = {
        ...activeTrip,
        pricingRuleId: 'PRC-NEOM-EXPIRED', // Expired in master data!
        pricingSnapshot: {
          ...activeTrip.pricingSnapshot,
          pricingRuleId: 'PRC-NEOM-EXPIRED',
          effectiveTo: '2025-12-31', // Expired!
          agreedRate: 0, // Zero rate!
          settlementAmount: 0
        }
      };

      const context: TransitionContext = {
        actorId: activeActorId,
        actorRole: 'DISPATCHER',
        actorName: activeActorName,
        projectId: activeTrip.projectId,
        reason: 'محاولة بدء رحلة بتسعيرة منتهية الصلاحية ومعدومة القيمة'
      };

      tripStateMachine.transition(brokenTrip, 'IN_TRANSIT', context, {
        loadTime: new Date().toISOString()
      });

      setStressTestLog({
        testName: 'بدء رحلة عند فشل Pricing Resolution',
        passedBlocked: false,
        serverMessage: 'خطأ: سمح النظام ببدء الرحلة بالرغم من فشل حل التسعيرة!',
        timestamp: new Date().toLocaleTimeString('ar-SA')
      });
    } catch (err: any) {
      setStressTestLog({
        testName: 'حظر بدء رحلة إذا فشل Pricing Resolution',
        passedBlocked: true,
        serverMessage: err.message,
        timestamp: new Date().toLocaleTimeString('ar-SA')
      });
      onNotification({
        type: 'SECURITY',
        message: `[قاعدة رقابية]: تم حظر بدء الرحلة لأن حل التسعير غير صالح أو منتهي الصلاحية (Pricing Resolution Failed).`
      });
    }
  };

  // Test 6: Invalid state jump (e.g. from DRAFT straight to COMPLETED)
  const testInvalidStateJump = () => {
    if (!activeTrip) return;
    try {
      const draftTrip: TripRecord = { ...activeTrip, status: 'DRAFT' };
      const context: TransitionContext = {
        actorId: activeActorId,
        actorRole: 'OPERATIONS_MANAGER',
        actorName: activeActorName,
        projectId: activeTrip.projectId,
        reason: 'محاولة قفز غير قانوني من DRAFT إلى COMPLETED'
      };

      tripStateMachine.transition(draftTrip, 'COMPLETED', context, {
        destNetWeight: 31200,
        unloaderId: 'REC-01',
        unloadTime: new Date().toISOString()
      });

      setStressTestLog({
        testName: 'القفز غير القانوني بين الحالات',
        passedBlocked: false,
        serverMessage: 'خطأ: سمح النظام بالقفز مباشرة من DRAFT إلى COMPLETED!',
        timestamp: new Date().toLocaleTimeString('ar-SA')
      });
    } catch (err: any) {
      setStressTestLog({
        testName: 'حظر القفز غير القانوني للحالة',
        passedBlocked: true,
        serverMessage: err.message,
        timestamp: new Date().toLocaleTimeString('ar-SA')
      });
      onNotification({
        type: 'SECURITY',
        message: `[محرك الحالات]: تم حظر القفز غير المسموح به في مخطط الحالات.`
      });
    }
  };

  // Test 7: Unauthorized role
  const testUnauthorizedRole = () => {
    if (!activeTrip) return;
    try {
      // Driver tries to execute LOADED or COMPLETED
      const context: TransitionContext = {
        actorId: 'DRV-101',
        actorRole: 'DRIVER', // Unauthorized for LOADED or COMPLETED
        actorName: 'سائق تجريبي',
        projectId: activeTrip.projectId,
        reason: 'محاولة تغيير الحالة برتبة سائق'
      };

      tripStateMachine.transition(activeTrip, 'LOADED', context);

      setStressTestLog({
        testName: 'التحول برتبة غير مصرحة',
        passedBlocked: false,
        serverMessage: 'خطأ: سمح النظام للسائق باعتماد حالة التحميل!',
        timestamp: new Date().toLocaleTimeString('ar-SA')
      });
    } catch (err: any) {
      setStressTestLog({
        testName: 'حظر التحول لرتبة غير مصرحة (Role Guard)',
        passedBlocked: true,
        serverMessage: err.message,
        timestamp: new Date().toLocaleTimeString('ar-SA')
      });
      onNotification({
        type: 'SECURITY',
        message: `[حظر الصلاحيات]: الرتبة غير مصرح لها بتنفيذ هذا التحول في دورة الحياة.`
      });
    }
  };

  // Test 8: Project mismatch
  const testProjectMismatch = () => {
    if (!activeTrip) return;
    try {
      const context: TransitionContext = {
        actorId: activeActorId,
        actorRole: 'OPERATIONS_MANAGER',
        actorName: activeActorName,
        projectId: 'PRJ-REDSEA-999', // Mismatched project!
        reason: 'محاولة تعديل رحلة نيوم من مستخدم يتبع مشروع البحر الأحمر'
      };

      tripStateMachine.transition(activeTrip, 'IN_TRANSIT', context);

      setStressTestLog({
        testName: 'التحول من مشروع غير مطابق',
        passedBlocked: false,
        serverMessage: 'خطأ: سمح النظام للمستخدم بالتحكم برحلة تتبع مشروعاً آخر!',
        timestamp: new Date().toLocaleTimeString('ar-SA')
      });
    } catch (err: any) {
      setStressTestLog({
        testName: 'حظر تعارض المشاريع (Project Isolation Guard)',
        passedBlocked: true,
        serverMessage: err.message,
        timestamp: new Date().toLocaleTimeString('ar-SA')
      });
      onNotification({
        type: 'SECURITY',
        message: `[عزل المشاريع]: تم حظر التعديل بسبب عدم تطابق مشروع المشغل مع مشروع الرحلة.`
      });
    }
  };

  // State status badge helper
  const renderStatusBadge = (status: TripEngineStatus) => {
    switch (status) {
      case 'DRAFT':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-stone-100 text-stone-700 border border-stone-300">مسودة (DRAFT)</span>;
      case 'LOADED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-300">تم التحميل والوزن (LOADED)</span>;
      case 'IN_TRANSIT':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">في الطريق (IN_TRANSIT)</span>;
      case 'ARRIVED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-300">وصلت الموقع (ARRIVED)</span>;
      case 'UNLOADING':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-300">قيد التفريغ (UNLOADING)</span>;
      case 'COMPLETED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">مكتملة ومسواة (COMPLETED)</span>;
      case 'RETURN_REQUESTED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-950 border border-orange-300">طلب إرجاع (RETURN_REQUESTED)</span>;
      case 'RETURNED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-stone-200 text-stone-900 border border-stone-400">مرتجعة للمصدر (RETURNED)</span>;
      case 'EXCEPTION':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-950 border border-rose-300">استثناء مسجل (EXCEPTION)</span>;
      case 'CANCELLED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-900 border border-red-300">ملغاة (CANCELLED)</span>;
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Banner: Central State Machine Architecture & Roles */}
      <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-stone-100 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold shadow-xs">
              <GitCommit className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <span>محرك الحالات المركزي (Centralized Trip State Machine)</span>
                <span className="px-2 py-0.5 text-[10px] font-black bg-amber-100 text-amber-900 rounded-md">
                  10 حالات رسمية + حظر التعديل المباشر
                </span>
              </h2>
              <p className="text-xs text-stone-500">
                حوكمة كاملة لجميع تحولات دورة الحياة، التحقق من الرتبة والمشروع، إلزامية أوزان ومستلم وميقات الوصول، واحتساب التفاوت والتسوية خادومياً.
              </p>
            </div>
          </div>

          {/* Sub Navigation */}
          <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200 gap-1 overflow-x-auto">
            <button
              onClick={() => setInnerTab('CONTROLLER')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                innerTab === 'CONTROLLER' 
                  ? 'bg-amber-600 text-white shadow-xs' 
                  : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/50'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>لوحة التحكم والانتقال</span>
            </button>
            <button
              onClick={() => setInnerTab('DIAGRAM')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                innerTab === 'DIAGRAM' 
                  ? 'bg-amber-600 text-white shadow-xs' 
                  : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/50'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>مخطط الحالات العشر (Diagram)</span>
            </button>
            <button
              onClick={() => setInnerTab('EVENTS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                innerTab === 'EVENTS' 
                  ? 'bg-amber-600 text-white shadow-xs' 
                  : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/50'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>الأحداث (Events: {tripEvents.length})</span>
            </button>
            <button
              onClick={() => setInnerTab('AUDIT_TRAIL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                innerTab === 'AUDIT_TRAIL' 
                  ? 'bg-amber-600 text-white shadow-xs' 
                  : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/50'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>سجل التدقيق (Audit: {tripAudits.length})</span>
            </button>
          </div>
        </div>

        {/* Persona / RBAC Context Bar */}
        <div className="bg-stone-50 rounded-xl p-3 border border-stone-200/70 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-stone-700 flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-amber-600" />
              <span>رتبة المشغل الحالي:</span>
            </span>
            <select
              value={activeRole}
              onChange={e => {
                const role = e.target.value as TripActorRole;
                setActiveRole(role);
                if (role === 'SCALE_OPERATOR') setActiveActorName('سعد الشهري (كاتب ميزان)');
                if (role === 'DISPATCHER') setActiveActorName('صالح الغامدي (مرحل عمليات)');
                if (role === 'DRIVER') setActiveActorName('خالد الشمري (سائق شاحنة)');
                if (role === 'SITE_RECEIVER') setActiveActorName('م. فهد الزهراني (مستلم موقع)');
                if (role === 'OPERATIONS_MANAGER') setActiveActorName('م. عبدالرحمن النمر (مدير عمليات)');
                if (role === 'AUDITOR') setActiveActorName('أحمد المطيري (مدقق مالي)');
              }}
              className="bg-white border border-stone-300 rounded-lg px-2.5 py-1 text-xs font-bold text-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="DISPATCHER">DISPATCHER (مرحل العمليات)</option>
              <option value="SCALE_OPERATOR">SCALE_OPERATOR (كاتب ميزان المصدر)</option>
              <option value="DRIVER">DRIVER (السائق)</option>
              <option value="SITE_RECEIVER">SITE_RECEIVER (مستلم ومفتش الموقع)</option>
              <option value="OPERATIONS_MANAGER">OPERATIONS_MANAGER (مدير العمليات)</option>
              <option value="AUDITOR">AUDITOR (المدقق المالي ومفتش الجودة)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-stone-700 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>المشروع النشط للمستخدم:</span>
            </span>
            <select
              value={activeProjectId}
              onChange={e => setActiveProjectId(e.target.value)}
              className="bg-white border border-stone-300 rounded-lg px-2.5 py-1 text-xs font-bold text-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="PRJ-NEOM-001">PRJ-NEOM-001 (مشروع نيوم - مطابق)</option>
              <option value="PRJ-REDSEA-002">PRJ-REDSEA-002 (مشروع البحر الأحمر - لاختبار التعارض ✗)</option>
            </select>
          </div>

          <div className="text-[11px] text-stone-500 font-mono">
            المشغل: <strong className="text-stone-800">{activeActorName}</strong> | المشروع: <strong className={activeProjectId === activeTrip?.projectId ? 'text-emerald-700' : 'text-rose-700'}>{activeProjectId}</strong>
          </div>
        </div>
      </div>

      {/* Selected Trip Selector Bar */}
      <div className="bg-white rounded-2xl border border-stone-200/80 p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-stone-700">اختر رحلة للاختبار والتحكم:</span>
            <select
              value={activeTrip?.tripId || ''}
              onChange={e => onSelectTrip(e.target.value)}
              className="bg-amber-50 border border-amber-300 rounded-lg px-3 py-1.5 text-xs font-bold text-stone-900 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {trips.map((t, idx) => (
                <option key={`${t.tripId}-${idx}`} value={t.tripId}>
                  {t.tripSerial} — الحالة: [{t.status}] — v{t.version} — {t.entitySnapshots?.material?.nameAr || t.materialId}
                </option>
              ))}
            </select>
          </div>

          {activeTrip && (
            <div className="flex items-center gap-3 text-xs">
              <span className="text-stone-500 font-mono">تذكرة: <strong className="text-stone-900">{activeTrip.ticketId}</strong></span>
              <span className="text-stone-300">|</span>
              <span className="text-stone-500">الحالة الحالية: {renderStatusBadge(activeTrip.status)}</span>
              <span className="text-stone-300">|</span>
              <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-700 font-mono font-black text-[11px]">
                الإصدار: v{activeTrip.version}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ===================== TAB 1: CONTROLLER VIEW ===================== */}
      {innerTab === 'CONTROLLER' && activeTrip && (
        <div className="space-y-6">
          {/* Top Grid: Trip State Snapshot + Allowed Transitions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Column 1 & 2: Active Trip Invariant State & Controls */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                    <Scale className="w-4 h-4 text-amber-600" />
                    <span>سجل قيود وأوزان وتوافقات الرحلة ({activeTrip.tripSerial})</span>
                  </h3>
                  <div className="text-xs text-stone-500">
                    مشروع: <span className="font-bold text-stone-800 font-mono">{activeTrip.projectId}</span>
                  </div>
                </div>

                {/* Key Invariant Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/60">
                    <span className="text-[10px] text-stone-500 block mb-1">صافي وزن المصدر (معتمد)</span>
                    <div className="font-mono text-sm font-bold text-stone-900">
                      {activeTrip.netWeight.toLocaleString()} <span className="text-[10px] text-stone-500">كجم</span>
                    </div>
                    <span className="text-[9px] text-stone-400 font-mono">
                      قائم: {activeTrip.grossWeight.toLocaleString()} - فارغ: {activeTrip.tareWeight.toLocaleString()}
                    </span>
                  </div>

                  <div className={`p-3 rounded-xl border ${
                    activeTrip.destNetWeight !== null 
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900' 
                      : 'bg-stone-50 border-stone-200 text-stone-400'
                  }`}>
                    <span className="text-[10px] block mb-1">صافي وزن الوصول (destNet)</span>
                    <div className="font-mono text-sm font-bold">
                      {activeTrip.destNetWeight !== null ? `${activeTrip.destNetWeight.toLocaleString()} كجم` : 'null (غير مدخل)'}
                    </div>
                    <span className="text-[9px]">إلزامي قبل إكمال الرحلة</span>
                  </div>

                  <div className={`p-3 rounded-xl border ${
                    activeTrip.varianceWeight !== null 
                      ? 'bg-indigo-50/60 border-indigo-200 text-indigo-900' 
                      : 'bg-stone-50 border-stone-200 text-stone-400'
                  }`}>
                    <span className="text-[10px] block mb-1">تفاوت الوزن (variance)</span>
                    <div className="font-mono text-sm font-bold">
                      {activeTrip.varianceWeight !== null ? `${activeTrip.varianceWeight > 0 ? `+${activeTrip.varianceWeight}` : activeTrip.varianceWeight} كجم` : 'null (معلق)'}
                    </div>
                    <span className="text-[9px]">destNet - netWeight</span>
                  </div>

                  <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200/60 text-amber-950">
                    <span className="text-[10px] text-amber-800 block mb-1">التسعير والتسوية الخادومية</span>
                    <div className="font-mono text-sm font-bold">
                      {activeTrip.settlementAmount.toLocaleString()} <span className="text-[10px]">SAR</span>
                    </div>
                    <span className="text-[9px] text-amber-700">
                      {activeTrip.pricingSnapshot.agreedRate} SAR ({activeTrip.pricingType === 'PER_TON' ? 'طن' : 'رد'})
                    </span>
                  </div>
                </div>

                {/* Pricing Resolution Status Invariant */}
                <div className="bg-stone-50 rounded-xl p-3 border border-stone-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <div>
                      <div className="font-bold text-stone-800">
                        حل التسعير (Pricing Resolution): {activeTrip.pricingSnapshot.ruleName || activeTrip.pricingRuleId}
                      </div>
                      <div className="text-[10px] text-stone-500">
                        سارية من {activeTrip.pricingSnapshot.effectiveFrom || '2026-01-01'} إلى {activeTrip.pricingSnapshot.effectiveTo || '2026-12-31'} — تاريخ الرحلة: {activeTrip.shiftDate}
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    صالح ومحلول ✓
                  </span>
                </div>

                {/* Available Transitions For Current Role */}
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                    <ArrowRight className="w-3.5 h-3.5 text-amber-600" />
                    <span>التحولات المتاحة لرتبة [{activeRole}] من الحالة [{activeTrip.status}]:</span>
                  </h4>

                  {availableTransitions.length === 0 ? (
                    <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-stone-500 text-xs text-center">
                      لا توجد تحولات قانونية متاحة للرتبة الحالية ({activeRole}) من حالة ({activeTrip.status}). قم بتبديل الرتبة من الشريط العلوي إن أردت محاكاة مشغل آخر.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {availableTransitions.map(tr => (
                        <div 
                          key={tr.targetStatus}
                          className="p-3 rounded-xl border border-stone-200 bg-white hover:border-amber-400 hover:shadow-xs transition-all space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-stone-900">{tr.labelAr}</span>
                            <span className="text-[10px] font-mono text-stone-500">{tr.targetStatus}</span>
                          </div>
                          <p className="text-[11px] text-stone-500 leading-snug">
                            {tr.descriptionAr}
                          </p>
                          <div className="pt-1 flex items-center justify-between">
                            <button
                              onClick={() => {
                                setTransitionTarget(tr.targetStatus);
                                if (tr.targetStatus === 'COMPLETED') {
                                  setTransitionPayload(prev => ({
                                    ...prev,
                                    destGrossWeight: activeTrip.grossWeight - 150,
                                    destTareWeight: activeTrip.tareWeight,
                                    destNetWeight: (activeTrip.grossWeight - 150) - activeTrip.tareWeight,
                                    unloaderId: activeTrip.unloaderId || 'ENG-SITE-04',
                                    unloadTime: new Date().toISOString()
                                  }));
                                }
                              }}
                              className="w-full py-1.5 px-3 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-center gap-1.5 transition-all shadow-2xs"
                            >
                              <Play className="w-3 h-3" />
                              <span>تنفيذ التحول إلى [{tr.targetStatus}]</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Transition Modal/Input when clicked */}
                {transitionTarget && (
                  <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/50 space-y-3 animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                      <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                        <Play className="w-3.5 h-3.5 text-amber-600" />
                        <span>تأكيد التحول إلى [{transitionTarget}] — التحقق من الحقول الإلزامية</span>
                      </span>
                      <button
                        onClick={() => setTransitionTarget(null)}
                        className="text-stone-400 hover:text-stone-600 text-xs"
                      >
                        إلغاء ✕
                      </button>
                    </div>

                    {/* Specific required fields for COMPLETED */}
                    {transitionTarget === 'COMPLETED' && (
                      <div className="space-y-3 bg-white p-3 rounded-lg border border-amber-200">
                        <div className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>الشروط الإلزامية المطلوبة: صافي وزن الاستلام + هوية المستلم + وقت التفريغ + احتساب التفاوت:</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-stone-700 mb-1">صافي وزن الاستلام (destNetWeight)</label>
                            <input
                              type="number"
                              value={transitionPayload.destNetWeight || ''}
                              onChange={e => setTransitionPayload({ ...transitionPayload, destNetWeight: parseFloat(e.target.value) || 0 })}
                              className="w-full border border-stone-300 rounded px-2 py-1 text-xs font-mono font-bold text-stone-900"
                              placeholder="مثال: 31250"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-stone-700 mb-1">هوية مستلم الموقع (unloaderId)</label>
                            <input
                              type="text"
                              value={transitionPayload.unloaderId || ''}
                              onChange={e => setTransitionPayload({ ...transitionPayload, unloaderId: e.target.value })}
                              className="w-full border border-stone-300 rounded px-2 py-1 text-xs text-stone-900"
                              placeholder="ENG-SITE-04"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-stone-700 mb-1">وقت التفريغ الفعلي (unloadTime)</label>
                            <input
                              type="text"
                              value={transitionPayload.unloadTime || ''}
                              onChange={e => setTransitionPayload({ ...transitionPayload, unloadTime: e.target.value })}
                              className="w-full border border-stone-300 rounded px-2 py-1 text-xs font-mono text-stone-900"
                              placeholder="2026-09-09T14:30:00Z"
                            />
                          </div>
                        </div>

                        {transitionPayload.destNetWeight && activeTrip.netWeight && (
                          <div className="p-2 rounded bg-indigo-50 border border-indigo-200 text-indigo-900 text-[11px] font-mono flex items-center justify-between">
                            <span>فارق الوزن المحسوب خادومياً (Variance):</span>
                            <strong>{transitionPayload.destNetWeight - activeTrip.netWeight} كجم</strong>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Reason input for transitions requiring reason */}
                    <div>
                      <label className="block text-[10px] font-bold text-stone-700 mb-1">
                        سبب أو ملاحظة التحول (يُحفظ في سجل الأحداث والتدقيق):
                      </label>
                      <input
                        type="text"
                        value={transitionPayload.reason || ''}
                        onChange={e => setTransitionPayload({ ...transitionPayload, reason: e.target.value })}
                        placeholder="سبب التحول (إلزامي في حالات الاستثناء والإلغاء والإرجاع)..."
                        className="w-full border border-stone-300 rounded-lg px-3 py-1.5 text-xs text-stone-900 bg-white"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => setTransitionTarget(null)}
                        className="px-3 py-1.5 rounded-lg border border-stone-300 text-stone-600 hover:bg-stone-100 text-xs font-bold"
                      >
                        إلغاء
                      </button>
                      <button
                        onClick={() => handleExecuteTransition(transitionTarget)}
                        className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>اعتماد الانتقال وزيادة الـ Version</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Column 3: Negative Invariant Stress-Tests & Guardrail Provers */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-xs space-y-3">
                <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <h3 className="text-xs font-bold text-stone-900">
                    مصفوفة إثبات الحظر الرقابي (Negative Stress Tests)
                  </h3>
                </div>
                <p className="text-[11px] text-stone-500 leading-relaxed">
                  انقر على أي تجربة أدناه لإثبات أن محرك الحالات يرفض أي اختراق أو انتهاك لقواعد الحوكمة الصارمة:
                </p>

                <div className="space-y-2">
                  {/* Test 1: Direct Client Mutation */}
                  <button
                    onClick={testDirectClientMutation}
                    className="w-full text-right p-2.5 rounded-xl border border-rose-200 bg-rose-50/40 hover:bg-rose-50 text-rose-950 transition-all flex items-start gap-2 text-xs group"
                  >
                    <Lock className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">1. تجربة التعديل المباشر من العميل (Direct Mutation)</span>
                      <span className="text-[10px] text-rose-700">يحظر تعديل status مباشرة دون المرور بالمحرك</span>
                    </div>
                  </button>

                  {/* Test 2: Complete without destNetWeight */}
                  <button
                    onClick={testCompleteWithoutDestNetWeight}
                    className="w-full text-right p-2.5 rounded-xl border border-amber-200 bg-amber-50/40 hover:bg-amber-50 text-amber-950 transition-all flex items-start gap-2 text-xs group"
                  >
                    <Scale className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">2. إكمال الرحلة بدون صافي وزن الاستلام</span>
                      <span className="text-[10px] text-amber-800">يحظر إكمال الرحلة إذا كان destNetWeight مفقوداً</span>
                    </div>
                  </button>

                  {/* Test 3: Complete without unloaderId or unloadTime */}
                  <button
                    onClick={testCompleteWithoutUnloaderOrTime}
                    className="w-full text-right p-2.5 rounded-xl border border-amber-200 bg-amber-50/40 hover:bg-amber-50 text-amber-950 transition-all flex items-start gap-2 text-xs group"
                  >
                    <UserCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">3. إكمال الرحلة بدون unloaderId أو unloadTime</span>
                      <span className="text-[10px] text-amber-800">يحظر الإكمال بدون هوية المستلم ووقت التفريغ</span>
                    </div>
                  </button>

                  {/* Test 4: Complete without variance calculation */}
                  <button
                    onClick={testCompleteWithoutVariance}
                    className="w-full text-right p-2.5 rounded-xl border border-amber-200 bg-amber-50/40 hover:bg-amber-50 text-amber-950 transition-all flex items-start gap-2 text-xs group"
                  >
                    <Scale className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">4. إتمام رحلة بدون حساب variance</span>
                      <span className="text-[10px] text-amber-800">يحظر الإتمام إذا تعذر احتساب الفارق بدقة</span>
                    </div>
                  </button>

                  {/* Test 5: Start trip with failed pricing resolution */}
                  <button
                    onClick={testStartTripWithFailedPricing}
                    className="w-full text-right p-2.5 rounded-xl border border-rose-200 bg-rose-50/40 hover:bg-rose-50 text-rose-950 transition-all flex items-start gap-2 text-xs group"
                  >
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">5. بدء رحلة إذا فشل Pricing Resolution</span>
                      <span className="text-[10px] text-rose-700">يحظر التحول إلى IN_TRANSIT إذا فشل التسعير</span>
                    </div>
                  </button>

                  {/* Test 6: Invalid state jump */}
                  <button
                    onClick={testInvalidStateJump}
                    className="w-full text-right p-2.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-900 transition-all flex items-start gap-2 text-xs group"
                  >
                    <GitCommit className="w-4 h-4 text-stone-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">6. قفز غير قانوني (DRAFT ➔ COMPLETED)</span>
                      <span className="text-[10px] text-stone-500">يحظر تخطي المراحل التشغيلية الإلزامية</span>
                    </div>
                  </button>

                  {/* Test 7: Unauthorized role */}
                  <button
                    onClick={testUnauthorizedRole}
                    className="w-full text-right p-2.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-900 transition-all flex items-start gap-2 text-xs group"
                  >
                    <ShieldAlert className="w-4 h-4 text-stone-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">7. تغيير الحالة برتبة غير مصرحة</span>
                      <span className="text-[10px] text-stone-500">مثال: محاولة السائق اعتماد التحميل أو الاستلام</span>
                    </div>
                  </button>

                  {/* Test 8: Project mismatch */}
                  <button
                    onClick={testProjectMismatch}
                    className="w-full text-right p-2.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-900 transition-all flex items-start gap-2 text-xs group"
                  >
                    <Building2 className="w-4 h-4 text-stone-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">8. تعارض المشروع (Project Isolation)</span>
                      <span className="text-[10px] text-stone-500">يحظر تعديل رحلة من مستخدم يتبع مشروعاً آخر</span>
                    </div>
                  </button>
                </div>

                {/* Stress Test Result Box */}
                {stressTestLog && (
                  <div className={`p-3 rounded-xl border text-xs space-y-1 mt-3 animate-fadeIn ${
                    stressTestLog.passedBlocked 
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950' 
                      : 'bg-rose-50 border-rose-300 text-rose-950'
                  }`}>
                    <div className="flex items-center justify-between font-bold">
                      <span className="flex items-center gap-1.5">
                        {stressTestLog.passedBlocked ? <ShieldCheck className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
                        <span>{stressTestLog.testName}</span>
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/70 font-mono">
                        {stressTestLog.passedBlocked ? 'تم الحظر بنجاح ✓' : 'فشل الحظر ✗'}
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed font-mono">
                      {stressTestLog.serverMessage}
                    </p>
                    <div className="text-[9px] text-stone-400 text-left font-mono">
                      {stressTestLog.timestamp}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 2: VISUAL STATE DIAGRAM ===================== */}
      {innerTab === 'DIAGRAM' && (
        <div className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-xs space-y-6">
          <div className="border-b border-stone-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-600" />
                <span>المخطط الهيكلي للحالات العشر (10-State Lifecycle Topology)</span>
              </h3>
              <p className="text-xs text-stone-500">
                تسلسل الحالات التشغيلية، بوابات الحوكمة، ومسارات الاستثناء والإرجاع والإلغاء:
              </p>
            </div>
            <span className="text-xs text-stone-400 font-mono">
              الرحلة الحالية: <strong className="text-stone-800">{activeTrip?.tripSerial}</strong> في [{activeTrip?.status}]
            </span>
          </div>

          {/* Primary Golden Path Flow */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-stone-700 block">المسار الذهبي القياسي (Happy Path):</span>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
              {[
                { st: 'DRAFT', label: '1. مسودة', sub: 'إنشاء أولي', roles: 'DISPATCHER' },
                { st: 'LOADED', label: '2. تحميل ووزن', sub: 'فارغ + قائم', roles: 'SCALE_OP' },
                { st: 'IN_TRANSIT', label: '3. في الطريق', sub: 'تسعير معتمد', roles: 'DISPATCHER' },
                { st: 'ARRIVED', label: '4. وصول الموقع', sub: 'بوابة الاستلام', roles: 'DRIVER/REC' },
                { st: 'UNLOADING', label: '5. قيد التفريغ', sub: 'فحص الحوض', roles: 'RECEIVER' },
                { st: 'COMPLETED', label: '6. مكتملة ومسواة', sub: 'destNet + فرق', roles: 'RECEIVER' }
              ].map((item, idx) => {
                const isCurrent = activeTrip?.status === item.st;
                return (
                  <div 
                    key={item.st}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      isCurrent 
                        ? 'border-amber-500 bg-amber-50 shadow-xs ring-2 ring-amber-400' 
                        : 'border-stone-200 bg-stone-50/60'
                    }`}
                  >
                    <div className="text-[11px] font-black text-stone-900 mb-0.5">{item.label}</div>
                    <div className="text-[10px] font-mono text-stone-500">{item.sub}</div>
                    <div className="mt-2 text-[9px] px-1.5 py-0.5 rounded bg-white border border-stone-200 text-stone-600 font-semibold inline-block">
                      {item.roles}
                    </div>
                    {isCurrent && (
                      <div className="mt-1 text-[9px] font-black text-amber-700 animate-pulse">
                        ● الرحلة هنا (v{activeTrip.version})
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Alternative & Exception Branches */}
          <div className="space-y-2 pt-4 border-t border-stone-100">
            <span className="text-xs font-bold text-stone-700 block">مسارات الاستثناء والإرجاع والإلغاء (Branches & Terminals):</span>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div className={`p-3 rounded-xl border ${activeTrip?.status === 'RETURN_REQUESTED' ? 'border-orange-500 bg-orange-50' : 'border-stone-200 bg-stone-50'}`}>
                <div className="font-bold text-orange-900 mb-1">RETURN_REQUESTED (طلب إرجاع)</div>
                <div className="text-[11px] text-stone-500 mb-2">رفض الشحنة بالموقع أو تلف العينات مع اشتراط كتابة السبب.</div>
                <span className="text-[10px] bg-white px-2 py-0.5 rounded border text-stone-700">SITE_RECEIVER, DISPATCHER</span>
              </div>

              <div className={`p-3 rounded-xl border ${activeTrip?.status === 'RETURNED' ? 'border-stone-600 bg-stone-200' : 'border-stone-200 bg-stone-50'}`}>
                <div className="font-bold text-stone-900 mb-1">RETURNED (تم الإرجاع للمصدر)</div>
                <div className="text-[11px] text-stone-500 mb-2">تأكيد رجوع الشاحنة إلى الكسارة أو المحجر المصدر.</div>
                <span className="text-[10px] bg-white px-2 py-0.5 rounded border text-stone-700">SCALE_OPERATOR</span>
              </div>

              <div className={`p-3 rounded-xl border ${activeTrip?.status === 'EXCEPTION' ? 'border-rose-500 bg-rose-50' : 'border-stone-200 bg-stone-50'}`}>
                <div className="font-bold text-rose-900 mb-1">EXCEPTION (استثناء / عطل)</div>
                <div className="text-[11px] text-stone-500 mb-2">حادث، عطل طريق، نزاع وزني، أو تعذر الوصول للموقع.</div>
                <span className="text-[10px] bg-white px-2 py-0.5 rounded border text-stone-700">DRIVER, DISPATCHER, RECEIVER</span>
              </div>

              <div className={`p-3 rounded-xl border ${activeTrip?.status === 'CANCELLED' ? 'border-red-500 bg-red-50' : 'border-stone-200 bg-stone-50'}`}>
                <div className="font-bold text-red-900 mb-1">CANCELLED (ملغاة)</div>
                <div className="text-[11px] text-stone-500 mb-2">إلغاء أمر الرحلة قبل الانطلاق بقرار تشغيلي معتمد ومبرر.</div>
                <span className="text-[10px] bg-white px-2 py-0.5 rounded border text-stone-700">DISPATCHER, OPERATIONS_MGR</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 3: LIFECYCLE EVENTS STREAM ===================== */}
      {innerTab === 'EVENTS' && activeTrip && (
        <div className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-xs space-y-4">
          <div className="border-b border-stone-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <History className="w-4 h-4 text-amber-600" />
                <span>سجل أحداث دورة الحياة (Lifecycle Events Stream) — الرحلة {activeTrip.tripSerial}</span>
              </h3>
              <p className="text-xs text-stone-500">
                كل تحول ينشئ حدثاً مستقلاً موثقاً بالوقت والرتبة والمشروع والبيانات المرفقة:
              </p>
            </div>
            <span className="text-xs font-mono text-stone-400 font-bold">
              {tripEvents.length} حدث مسجل
            </span>
          </div>

          {tripEvents.length === 0 ? (
            <div className="text-center py-8 text-xs text-stone-400">
              لا توجد أحداث مسجلة لهذه الرحلة بعد. قم بتنفيذ تحول في دورة الحياة لتوليد الحدث الأول.
            </div>
          ) : (
            <div className="space-y-3">
              {tripEvents.map(evt => (
                <div 
                  key={evt.eventId}
                  className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-stone-900 bg-white px-2 py-0.5 rounded border border-stone-200">
                        {evt.eventId}
                      </span>
                      <span className="font-bold text-stone-800">{evt.action}</span>
                      <div className="flex items-center gap-1 font-mono text-[11px]">
                        <span className="px-1.5 py-0.2 bg-stone-200 text-stone-700 rounded font-bold">{evt.fromStatus}</span>
                        <span>➔</span>
                        <span className="px-1.5 py-0.2 bg-amber-200 text-amber-900 rounded font-bold">{evt.toStatus}</span>
                      </div>
                    </div>
                    <div className="text-[11px] text-stone-600">
                      السبب/الملاحظة: <strong className="text-stone-800">{evt.reason || 'لا يوجد سبب إضافي'}</strong>
                    </div>
                  </div>

                  <div className="text-left font-mono text-[11px] text-stone-500 space-y-0.5">
                    <div>المشغل: <strong className="text-stone-800">{evt.actorName}</strong> ({evt.actorRole})</div>
                    <div>المشروع: <strong className="text-stone-800">{evt.projectId}</strong> | v{evt.version}</div>
                    <div className="text-[10px] text-stone-400">{new Date(evt.timestamp).toLocaleString('ar-SA')}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===================== TAB 4: AUDIT TRAIL WITH VERSIONING ===================== */}
      {innerTab === 'AUDIT_TRAIL' && activeTrip && (
        <div className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-xs space-y-4">
          <div className="border-b border-stone-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-600" />
                <span>سجل التدقيق الرقابي غير القابل للتعديل (Immutable Audit Trail)</span>
              </h3>
              <p className="text-xs text-stone-500">
                توثيق التغييرات والمقارنة التفاضلية (Diff) وتتبع تزايد الإصدارات (Optimistic Versioning):
              </p>
            </div>
            <span className="text-xs font-mono text-stone-400 font-bold">
              {tripAudits.length} إدخال تدقيقي
            </span>
          </div>

          {tripAudits.length === 0 ? (
            <div className="text-center py-8 text-xs text-stone-400">
              لا يوجد سجل تدقيق متاح حالياً لهذه الرحلة.
            </div>
          ) : (
            <div className="space-y-3">
              {tripAudits.map(aud => (
                <div 
                  key={aud.auditId}
                  className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 space-y-2 text-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200/60 pb-2">
                    <div className="flex items-center gap-2 font-mono">
                      <span className="font-bold text-stone-900 bg-white px-2 py-0.5 rounded border border-stone-200">
                        {aud.auditId}
                      </span>
                      <span className="text-indigo-900 font-bold">{aud.action}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-mono text-stone-600">
                      <span>إصدار: <strong>v{aud.versionBefore}</strong> ➔ <strong className="text-amber-700">v{aud.versionAfter}</strong></span>
                      <span className="text-stone-300">|</span>
                      <span>بواسطة: <strong>{aud.actorName}</strong> ({aud.actorRole})</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-stone-700 leading-relaxed font-sans">
                    {aud.details}
                  </p>

                  {aud.diff && Object.keys(aud.diff).length > 0 && (
                    <div className="bg-white p-2.5 rounded-lg border border-stone-200 space-y-1 font-mono text-[11px]">
                      <span className="text-[10px] font-bold text-stone-500 block">الفروقات الموثقة (Field-level Diff):</span>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(aud.diff).map(([key, value]) => (
                          <div key={key} className="px-2 py-1 rounded bg-stone-100 border border-stone-200 text-stone-800">
                            <strong>{key}</strong>: <span className="text-rose-600">{String(value.before)}</span> ➔ <span className="text-emerald-700 font-bold">{String(value.after)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="text-[10px] text-stone-400 text-left font-mono">
                    {new Date(aud.timestamp).toLocaleString('ar-SA')} | مشروع: {aud.projectId}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
