import React, { useState, useMemo } from 'react';
import { 
  LayoutDashboard, 
  ShieldCheck, 
  ShieldAlert, 
  Filter, 
  RotateCcw, 
  Building2, 
  Calendar, 
  Truck, 
  Layers, 
  Calculator, 
  CheckCircle2, 
  Clock, 
  RotateCw, 
  AlertTriangle, 
  Banknote, 
  Scale, 
  Activity, 
  Search, 
  Play, 
  X, 
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  UserCheck,
  TrendingUp,
  Check,
  Radio
} from 'lucide-react';
import { 
  DashboardFilterParams, 
  UserSecurityProfile 
} from '../../types/dashboard';
import { 
  dashboardService, 
  PREDEFINED_SECURITY_PROFILES 
} from '../../services/dashboard.service';
import { WidgetFilterBar } from './WidgetFilterBar';
import { runDashboardSecurityAndMetricsTests, DashboardTestCaseResult } from '../../tests/dashboard.test';
import { DEFAULT_CARRIERS, DEFAULT_MATERIALS } from '../../data/defaultMasterData';

export const OperationsDashboardView: React.FC = () => {
  // 1. User Security Profile & Project Authorization
  const [activeProfile, setActiveProfile] = useState<UserSecurityProfile>(PREDEFINED_SECURITY_PROFILES[0]);
  
  // 2. Global Dashboard Filters
  const [globalFilters, setGlobalFilters] = useState<DashboardFilterParams>({
    projectId: 'ALL',
    shiftDateFrom: '',
    shiftDateTo: '',
    carrierId: 'ALL',
    materialId: 'ALL',
    pricingType: 'ALL',
  });

  // 3. Per-Widget Override Filters State
  const [widgetFilterOverrides, setWidgetFilterOverrides] = useState<{
    tripsCard?: DashboardFilterParams;
    tonnageCard?: DashboardFilterParams;
    settlementCard?: DashboardFilterParams;
    carrierPerf?: DashboardFilterParams;
    materialDist?: DashboardFilterParams;
    pricingDist?: DashboardFilterParams;
    terminalBoard?: DashboardFilterParams;
  }>({});

  // 4. Expanded Widget Filter Toggles
  const [expandedWidgetFilters, setExpandedWidgetFilters] = useState<Record<string, boolean>>({});

  const toggleWidgetFilter = (widgetKey: string) => {
    setExpandedWidgetFilters(prev => ({
      ...prev,
      [widgetKey]: !prev[widgetKey],
    }));
  };

  const getEffectiveFilters = (widgetKey: string): { filters: DashboardFilterParams; isCustomized: boolean } => {
    const override = (widgetFilterOverrides as any)[widgetKey];
    if (override) {
      return { filters: override, isCustomized: true };
    }
    return { filters: globalFilters, isCustomized: false };
  };

  const setWidgetFilter = (widgetKey: string, newFilters: DashboardFilterParams) => {
    setWidgetFilterOverrides(prev => ({
      ...prev,
      [widgetKey]: newFilters,
    }));
  };

  const resetWidgetFilter = (widgetKey: string) => {
    setWidgetFilterOverrides(prev => {
      const copy = { ...prev };
      delete (copy as any)[widgetKey];
      return copy;
    });
  };

  // 5. Authorized Projects for Active Profile
  const authorizedProjects = useMemo(() => {
    return dashboardService.getAuthorizedProjects(activeProfile);
  }, [activeProfile]);

  // When profile changes, reset any invalid project selection
  const handleProfileChange = (profile: UserSecurityProfile) => {
    setActiveProfile(profile);
    // If current global filter selected a project not authorized in new profile, reset to ALL or first authorized
    if (globalFilters.projectId !== 'ALL' && !dashboardService.isProjectAuthorized(globalFilters.projectId, profile)) {
      setGlobalFilters(prev => ({
        ...prev,
        projectId: profile.isRestricted ? profile.authorizedProjectIds[0] : 'ALL',
      }));
    }
    // Clear all widget overrides when changing profile to prevent lingering unauthorized states
    setWidgetFilterOverrides({});
  };

  // 6. Live Terminal Board Search & Filter
  const [terminalSearch, setTerminalSearch] = useState<string>('');
  const [terminalStatusFilter, setTerminalStatusFilter] = useState<string>('ALL');

  // 7. Automated Test Suite State
  const [isTestModalOpen, setIsTestModalOpen] = useState<boolean>(false);
  const [testResults, setTestResults] = useState(() => runDashboardSecurityAndMetricsTests());

  // 8. Computations for each widget
  // (A) Trips Volume & Status Cards
  const tripsFilters = getEffectiveFilters('tripsCard').filters;
  const tripsData = useMemo(() => {
    const { trips, securityViolated } = dashboardService.getFilteredTrips(tripsFilters, activeProfile);
    return {
      metrics: dashboardService.computeTripStatusMetrics(trips),
      securityViolated,
    };
  }, [tripsFilters, activeProfile]);

  // (B) Tonnage & Weighbridge Variance Cards
  const tonnageFilters = getEffectiveFilters('tonnageCard').filters;
  const tonnageData = useMemo(() => {
    const { trips, securityViolated } = dashboardService.getFilteredTrips(tonnageFilters, activeProfile);
    return {
      metrics: dashboardService.computeTonnageMetrics(trips),
      securityViolated,
    };
  }, [tonnageFilters, activeProfile]);

  // (C) Financial Settlement Cards
  const settlementFilters = getEffectiveFilters('settlementCard').filters;
  const settlementData = useMemo(() => {
    const { trips, securityViolated } = dashboardService.getFilteredTrips(settlementFilters, activeProfile);
    return {
      metrics: dashboardService.computeSettlementMetrics(trips),
      securityViolated,
    };
  }, [settlementFilters, activeProfile]);

  // (D) Carrier Performance Widget
  const carrierFilters = getEffectiveFilters('carrierPerf').filters;
  const carrierData = useMemo(() => {
    const { trips, securityViolated } = dashboardService.getFilteredTrips(carrierFilters, activeProfile);
    return {
      items: dashboardService.computeCarrierPerformance(trips),
      securityViolated,
    };
  }, [carrierFilters, activeProfile]);

  // (E) Material Distribution Widget
  const materialFilters = getEffectiveFilters('materialDist').filters;
  const materialData = useMemo(() => {
    const { trips, securityViolated } = dashboardService.getFilteredTrips(materialFilters, activeProfile);
    return {
      items: dashboardService.computeMaterialDistribution(trips),
      securityViolated,
    };
  }, [materialFilters, activeProfile]);

  // (F) Pricing Distribution Widget
  const pricingFilters = getEffectiveFilters('pricingDist').filters;
  const pricingData = useMemo(() => {
    const { trips, securityViolated } = dashboardService.getFilteredTrips(pricingFilters, activeProfile);
    return {
      items: dashboardService.computePricingDistribution(trips),
      securityViolated,
    };
  }, [pricingFilters, activeProfile]);

  // (G) Live Terminal Board Widget
  const terminalFilters = getEffectiveFilters('terminalBoard').filters;
  const terminalData = useMemo(() => {
    const { trips, securityViolated } = dashboardService.getFilteredTrips(terminalFilters, activeProfile);
    let board = dashboardService.generateLiveTerminalBoard(trips);

    if (terminalStatusFilter !== 'ALL') {
      board = board.filter(b => b.status === terminalStatusFilter);
    }

    if (terminalSearch.trim()) {
      const q = terminalSearch.toLowerCase();
      board = board.filter(b => 
        b.tripSerial.toLowerCase().includes(q) ||
        b.ticketId.toLowerCase().includes(q) ||
        b.truckPlateAr.toLowerCase().includes(q) ||
        b.driverNameAr.toLowerCase().includes(q) ||
        b.carrierNameAr.toLowerCase().includes(q) ||
        b.materialNameAr.toLowerCase().includes(q)
      );
    }

    return {
      items: board,
      securityViolated,
    };
  }, [terminalFilters, activeProfile, terminalStatusFilter, terminalSearch]);

  return (
    <div className="space-y-6">
      
      {/* 1. Header & Security Role Switcher (Project Authorization Enforcement) */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-700">
                <LayoutDashboard className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                  <span>لوحة العمليات والتحكم اللوجستي (Operations Dashboard)</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                    مباشر (Live)
                  </span>
                </h1>
                <p className="text-xs text-stone-500 mt-0.5">
                  رصد ومتابعة مؤشرات الحركة، الأوزان، التسويات التعاقدية، ولوحة البوابات المباشرة مع عزل أمني صارم للمشاريع.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Strict Security Profile Switcher */}
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-2.5 flex items-center gap-2 text-xs">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] text-stone-500 font-bold">صلاحية المستخدم والمشاريع:</span>
                <select
                  value={activeProfile.userId}
                  onChange={(e) => {
                    const p = PREDEFINED_SECURITY_PROFILES.find(x => x.userId === e.target.value);
                    if (p) handleProfileChange(p);
                  }}
                  className="bg-white border border-stone-300 rounded-lg px-2 py-1 text-xs font-bold text-stone-800 focus:border-amber-500 outline-none cursor-pointer"
                >
                  {PREDEFINED_SECURITY_PROFILES.map((prof) => (
                    <option key={prof.userId} value={prof.userId}>
                      {prof.roleTitleAr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Run Automated Compliance Tests Button */}
            <button
              id="btn-run-dashboard-tests"
              onClick={() => {
                setTestResults(runDashboardSecurityAndMetricsTests());
                setIsTestModalOpen(true);
              }}
              className="flex items-center gap-2 px-3.5 py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer"
              title="تشغيل فحص الامتثال الآلي لعزل المشاريع وصحة العمليات"
            >
              <Play className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>فحص الأمان والامتثال ({testResults.passedTests}/{testResults.totalTests})</span>
            </button>
          </div>
        </div>

        {/* Security Boundary Active Notice */}
        <div className="mt-4 pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-600">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>المشاريع المصرح بها لهذا الحساب:</span>
            {activeProfile.authorizedProjectIds.includes('ALL') ? (
              <span className="font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                كافة المشاريع (وصول مركزي غير مقيد)
              </span>
            ) : (
              <div className="flex flex-wrap gap-1">
                {authorizedProjects.map(p => (
                  <span key={p.projectId} className="font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md text-[11px]">
                    {p.nameAr} ({p.projectCode})
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="text-[11px] text-stone-500">
            {activeProfile.isRestricted ? (
              <span className="text-amber-800 font-bold flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" />
                يتم حجب أي رحلة خارج النطاق المصرح به آلياً
              </span>
            ) : (
              <span className="text-stone-500">مستوى صلاحيات المدير العام للمنظومة</span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Global Dashboard Filter Bar */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3 text-xs">
          <div className="flex items-center gap-2 font-bold text-stone-800">
            <Filter className="w-4 h-4 text-amber-600" />
            <span className="text-sm">الفلاتر العامة للوحة القيادة (Global Dashboard Filters)</span>
            <span className="text-[11px] font-normal text-stone-500">
              - تُطبَّق تلقائياً على كافة الودجات ما لم يتم تخصيص ودجت محدد
            </span>
          </div>

          <button
            onClick={() => {
              setGlobalFilters({
                projectId: 'ALL',
                shiftDateFrom: '',
                shiftDateTo: '',
                carrierId: 'ALL',
                materialId: 'ALL',
                pricingType: 'ALL',
              });
              setWidgetFilterOverrides({});
            }}
            className="flex items-center gap-1.5 text-xs text-stone-600 hover:text-stone-900 font-bold cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>إعادة تعيين الكل</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          {/* Project Filter */}
          <div>
            <label className="block text-[11px] font-bold text-stone-600 mb-1 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-stone-400" />
              <span>المشروع المصرح به</span>
            </label>
            <select
              value={globalFilters.projectId}
              onChange={(e) => setGlobalFilters(prev => ({ ...prev, projectId: e.target.value }))}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-semibold text-stone-800 focus:bg-white focus:border-amber-500 outline-none"
            >
              {!activeProfile.isRestricted && (
                <option value="ALL">كافة المشاريع المصرحة (All Projects)</option>
              )}
              {authorizedProjects.map(p => (
                <option key={p.projectId} value={p.projectId}>
                  {p.nameAr}
                </option>
              ))}
            </select>
          </div>

          {/* Shift Date Filter */}
          <div>
            <label className="block text-[11px] font-bold text-stone-600 mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-stone-400" />
              <span>تاريخ الوردية (Shift Date)</span>
            </label>
            <input
              type="date"
              value={globalFilters.shiftDateFrom}
              onChange={(e) => setGlobalFilters(prev => ({ ...prev, shiftDateFrom: e.target.value }))}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-800 focus:bg-white focus:border-amber-500 outline-none"
            />
          </div>

          {/* Carrier Filter */}
          <div>
            <label className="block text-[11px] font-bold text-stone-600 mb-1 flex items-center gap-1">
              <Truck className="w-3 h-3 text-stone-400" />
              <span>الناقل (Carrier)</span>
            </label>
            <select
              value={globalFilters.carrierId}
              onChange={(e) => setGlobalFilters(prev => ({ ...prev, carrierId: e.target.value }))}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-800 focus:bg-white focus:border-amber-500 outline-none"
            >
              <option value="ALL">كافة الناقلين (All Carriers)</option>
              {DEFAULT_CARRIERS.map(c => (
                <option key={c.carrierId} value={c.carrierId}>
                  {c.companyNameAr || c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Material Filter */}
          <div>
            <label className="block text-[11px] font-bold text-stone-600 mb-1 flex items-center gap-1">
              <Layers className="w-3 h-3 text-stone-400" />
              <span>المادة (Material)</span>
            </label>
            <select
              value={globalFilters.materialId}
              onChange={(e) => setGlobalFilters(prev => ({ ...prev, materialId: e.target.value }))}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-800 focus:bg-white focus:border-amber-500 outline-none"
            >
              <option value="ALL">كافة المواد (All Materials)</option>
              {DEFAULT_MATERIALS.map(m => (
                <option key={m.materialId} value={m.materialId}>
                  {m.nameAr || m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Pricing Type Filter */}
          <div>
            <label className="block text-[11px] font-bold text-stone-600 mb-1 flex items-center gap-1">
              <Calculator className="w-3 h-3 text-stone-400" />
              <span>نوع التسعير (Pricing Type)</span>
            </label>
            <select
              value={globalFilters.pricingType}
              onChange={(e) => setGlobalFilters(prev => ({ ...prev, pricingType: e.target.value as any }))}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-800 focus:bg-white focus:border-amber-500 outline-none"
            >
              <option value="ALL">الكل (PER_TRIP + PER_TON)</option>
              <option value="PER_TRIP">مقطوعية بالرد (PER_TRIP)</option>
              <option value="PER_TON">بالطن المتري (PER_TON)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. SECTION ONE: Trips Volume & Status Cards */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-bold text-stone-900">
              بطاقات حجم وحالات الرحلات (Trips Volume & Operational Status)
            </h3>
          </div>

          <button
            onClick={() => toggleWidgetFilter('tripsCard')}
            className="flex items-center gap-1.5 text-xs text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>فلتر البطاقة</span>
            {getEffectiveFilters('tripsCard').isCustomized && (
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            )}
            {expandedWidgetFilters['tripsCard'] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Collapsible Widget Filter */}
        {expandedWidgetFilters['tripsCard'] && (
          <WidgetFilterBar
            filters={tripsFilters}
            onFilterChange={(f) => setWidgetFilter('tripsCard', f)}
            authorizedProjects={authorizedProjects}
            userProfile={activeProfile}
            isCustomized={getEffectiveFilters('tripsCard').isCustomized}
            onResetToGlobal={() => resetWidgetFilter('tripsCard')}
          />
        )}

        {/* 5 Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Total Trips */}
          <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-xs font-bold text-stone-500">إجمالي الرحلات (Total Trips)</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-stone-900 font-mono">
                {tripsData.metrics.totalTrips}
              </span>
              <span className="text-xs text-stone-500">رحلة</span>
            </div>
            <div className="mt-2 text-[11px] text-stone-600 font-medium">
              الخاضعة للتحميل والترحيل
            </div>
          </div>

          {/* Completed */}
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900">مكتملة (Completed)</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-900 font-mono">
                {tripsData.metrics.completedTrips}
              </span>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                {tripsData.metrics.completedRatePercent}%
              </span>
            </div>
            <div className="mt-2 text-[11px] text-emerald-800">
              تم تفريغها ومطابقة أوزانها
            </div>
          </div>

          {/* In Transit */}
          <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-900">قيد النقل (In Transit)</span>
              <Clock className="w-4 h-4 text-blue-600 animate-spin" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-blue-900 font-mono">
                {tripsData.metrics.inTransitTrips}
              </span>
              <span className="text-xs text-blue-700">على الطريق</span>
            </div>
            <div className="mt-2 text-[11px] text-blue-800">
              انطلقت من ميزان التحميل
            </div>
          </div>

          {/* Returned */}
          <div className="bg-rose-50/70 border border-rose-200/80 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-900">مرتجعة (Returned)</span>
              <RotateCw className="w-4 h-4 text-rose-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-rose-900 font-mono">
                {tripsData.metrics.returnedTrips}
              </span>
              <span className="text-xs font-bold text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded">
                {tripsData.metrics.returnedRatePercent}%
              </span>
            </div>
            <div className="mt-2 text-[11px] text-rose-800">
              شحنات مرفوضة بالموقع
            </div>
          </div>

          {/* Exceptions */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900">استثناءات (Exceptions)</span>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-900 font-mono">
                {tripsData.metrics.exceptionTrips}
              </span>
              <span className="text-xs text-amber-700">معلقة</span>
            </div>
            <div className="mt-2 text-[11px] text-amber-800">
              تجاوز فارق أو أعطال مسار
            </div>
          </div>
        </div>
      </div>

      {/* 4. SECTION TWO: Tonnage & Weighbridge Variance Cards */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-bold text-stone-900">
              بطاقات الأوزان وتفاوت الموازين (Tonnage & Weighbridge Variance)
            </h3>
          </div>

          <button
            onClick={() => toggleWidgetFilter('tonnageCard')}
            className="flex items-center gap-1.5 text-xs text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>فلتر البطاقة</span>
            {getEffectiveFilters('tonnageCard').isCustomized && (
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            )}
            {expandedWidgetFilters['tonnageCard'] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Collapsible Widget Filter */}
        {expandedWidgetFilters['tonnageCard'] && (
          <WidgetFilterBar
            filters={tonnageFilters}
            onFilterChange={(f) => setWidgetFilter('tonnageCard', f)}
            authorizedProjects={authorizedProjects}
            userProfile={activeProfile}
            isCustomized={getEffectiveFilters('tonnageCard').isCustomized}
            onResetToGlobal={() => resetWidgetFilter('tonnageCard')}
          />
        )}

        {/* 3 Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Total Loaded Tons */}
          <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-4">
            <span className="text-xs font-bold text-stone-500">إجمالي أوزان التحميل (Total Loaded Tons)</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-stone-900 font-mono">
                {tonnageData.metrics.totalLoadedTons.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-stone-600">طن متري</span>
            </div>
            <div className="mt-1 text-[11px] text-stone-500">
              محسوبة عند ميزان الانطلاق (القائم - الفارغ)
            </div>
          </div>

          {/* Total Received Tons */}
          <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-4">
            <span className="text-xs font-bold text-stone-500">إجمالي أوزان الاستلام بالموقع (Total Received Tons)</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-stone-900 font-mono">
                {tonnageData.metrics.totalReceivedTons.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-stone-600">طن متري</span>
            </div>
            <div className="mt-1 text-[11px] text-stone-500">
              الصافي المعتمد في نقطة التفريغ
            </div>
          </div>

          {/* Total Variance */}
          <div className={`rounded-xl p-4 border ${
            tonnageData.metrics.isVarianceAcceptable 
              ? 'bg-emerald-50/70 border-emerald-200' 
              : 'bg-rose-50/70 border-rose-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-700">صافي فارق الموازين (Total Variance)</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                tonnageData.metrics.isVarianceAcceptable 
                  ? 'bg-emerald-100 text-emerald-800' 
                  : 'bg-rose-100 text-rose-800'
              }`}>
                {tonnageData.metrics.isVarianceAcceptable ? 'ضمن نسبة التسامح (±1%)' : 'تجاوز نسبة التسامح'}
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className={`text-2xl font-black font-mono ${
                tonnageData.metrics.isVarianceAcceptable ? 'text-emerald-950' : 'text-rose-950'
              }`}>
                {tonnageData.metrics.totalVarianceTons > 0 ? `+${tonnageData.metrics.totalVarianceTons}` : tonnageData.metrics.totalVarianceTons}
              </span>
              <span className="text-xs font-bold text-stone-600">طن</span>
              <span className={`text-xs font-bold font-mono ${
                tonnageData.metrics.isVarianceAcceptable ? 'text-emerald-700' : 'text-rose-700'
              }`}>
                ({tonnageData.metrics.variancePercent}%)
              </span>
            </div>
            <div className="mt-1 text-[11px] text-stone-500">
              الفارق بين وزن الموقع ووزن المقلع
            </div>
          </div>
        </div>
      </div>

      {/* 5. SECTION THREE: Financial Settlement Cards */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Banknote className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-bold text-stone-900">
              بطاقات التسويات والمستحقات المالية (Financial Settlement - Snapshot Invariance)
            </h3>
          </div>

          <button
            onClick={() => toggleWidgetFilter('settlementCard')}
            className="flex items-center gap-1.5 text-xs text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>فلتر البطاقة</span>
            {getEffectiveFilters('settlementCard').isCustomized && (
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            )}
            {expandedWidgetFilters['settlementCard'] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Collapsible Widget Filter */}
        {expandedWidgetFilters['settlementCard'] && (
          <WidgetFilterBar
            filters={settlementFilters}
            onFilterChange={(f) => setWidgetFilter('settlementCard', f)}
            authorizedProjects={authorizedProjects}
            userProfile={activeProfile}
            isCustomized={getEffectiveFilters('settlementCard').isCustomized}
            onResetToGlobal={() => resetWidgetFilter('settlementCard')}
          />
        )}

        {/* 3 Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Total Settlement */}
          <div className="bg-stone-900 text-white rounded-xl p-4 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold text-stone-400">إجمالي التسويات المعتمدة (Total Settlement)</span>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-amber-400">
                {settlementData.metrics.totalSettlementAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-xs font-bold text-stone-300">ر.س</span>
            </div>
            <div className="mt-2 text-[11px] text-stone-400">
              محسوبة بدقة من لقطات التسعير التعاقدية المثبتة
            </div>
          </div>

          {/* Trip-based Settlement */}
          <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-600">تسويات المقطوعية بالرد (Trip-based Settlement)</span>
              <span className="text-[10px] font-mono bg-blue-100 text-blue-900 px-1.5 py-0.2 rounded font-bold">
                PER_TRIP
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-stone-900">
                {settlementData.metrics.tripBasedSettlementAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-xs font-bold text-stone-500">ر.س</span>
            </div>
            <div className="mt-2 text-[11px] text-stone-600 flex items-center justify-between">
              <span>{settlementData.metrics.tripBasedTripsCount} رحلة بالمقطوعية</span>
              <span className="font-mono text-[10px] text-stone-400">العدد × السعر</span>
            </div>
          </div>

          {/* Ton-based Settlement */}
          <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-600">تسويات الأطنان (Ton-based Settlement)</span>
              <span className="text-[10px] font-mono bg-emerald-100 text-emerald-900 px-1.5 py-0.2 rounded font-bold">
                PER_TON
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-stone-900">
                {settlementData.metrics.tonBasedSettlementAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-xs font-bold text-stone-500">ر.س</span>
            </div>
            <div className="mt-2 text-[11px] text-stone-600 flex items-center justify-between">
              <span>{settlementData.metrics.tonBasedTripsCount} رحلة بالطن</span>
              <span className="font-mono text-[10px] text-stone-400">الصافي × سعر الطن</span>
            </div>
          </div>
        </div>
      </div>

      {/* 6. SECTION FOUR & FIVE: Carrier Performance & Material Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Carrier Performance Widget */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-stone-900">
                  لوحة أداء ومطابقة الناقلين (Carrier Performance)
                </h3>
              </div>

              <button
                onClick={() => toggleWidgetFilter('carrierPerf')}
                className="flex items-center gap-1 text-xs text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-2 py-1 rounded-lg font-bold cursor-pointer"
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span>فلتر</span>
                {getEffectiveFilters('carrierPerf').isCustomized && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                )}
              </button>
            </div>

            {expandedWidgetFilters['carrierPerf'] && (
              <div className="mb-3">
                <WidgetFilterBar
                  filters={carrierFilters}
                  onFilterChange={(f) => setWidgetFilter('carrierPerf', f)}
                  authorizedProjects={authorizedProjects}
                  userProfile={activeProfile}
                  isCustomized={getEffectiveFilters('carrierPerf').isCustomized}
                  onResetToGlobal={() => resetWidgetFilter('carrierPerf')}
                />
              </div>
            )}

            {/* Carrier Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500 font-bold">
                    <th className="py-2 px-1">الناقل</th>
                    <th className="py-2 px-1 text-center">الرحلات</th>
                    <th className="py-2 px-1 text-center">المكتملة</th>
                    <th className="py-2 px-1 text-center">أطنان التحميل</th>
                    <th className="py-2 px-1 text-left">المستحقات (ر.س)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium">
                  {carrierData.items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-stone-400">
                        لا توجد بيانات ناقلين مطابقة لمعايير الفلترة الحالية.
                      </td>
                    </tr>
                  ) : (
                    carrierData.items.map((c) => (
                      <tr key={c.carrierId} className="hover:bg-stone-50/80">
                        <td className="py-2.5 px-1 font-bold text-stone-800">
                          <div>{c.carrierNameAr}</div>
                          <span className="text-[10px] text-stone-400 font-mono">{c.carrierId}</span>
                        </td>
                        <td className="py-2.5 px-1 text-center font-mono font-bold text-stone-900">
                          {c.totalTrips}
                        </td>
                        <td className="py-2.5 px-1 text-center">
                          <span className="font-mono font-bold text-emerald-700">
                            {c.completedTrips}
                          </span>
                          <span className="text-[10px] text-stone-400 ml-1">({c.completionRatePercent}%)</span>
                        </td>
                        <td className="py-2.5 px-1 text-center font-mono text-stone-700">
                          {c.loadedTons.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-1 text-left font-mono font-bold text-stone-900">
                          {c.settlementAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Material Distribution Widget */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-stone-900">
                  توزيع المواد والخامات (Material Distribution)
                </h3>
              </div>

              <button
                onClick={() => toggleWidgetFilter('materialDist')}
                className="flex items-center gap-1 text-xs text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-2 py-1 rounded-lg font-bold cursor-pointer"
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span>فلتر</span>
                {getEffectiveFilters('materialDist').isCustomized && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                )}
              </button>
            </div>

            {expandedWidgetFilters['materialDist'] && (
              <div className="mb-3">
                <WidgetFilterBar
                  filters={materialFilters}
                  onFilterChange={(f) => setWidgetFilter('materialDist', f)}
                  authorizedProjects={authorizedProjects}
                  userProfile={activeProfile}
                  isCustomized={getEffectiveFilters('materialDist').isCustomized}
                  onResetToGlobal={() => resetWidgetFilter('materialDist')}
                />
              </div>
            )}

            {/* Material Items List */}
            <div className="space-y-3">
              {materialData.items.length === 0 ? (
                <div className="py-8 text-center text-xs text-stone-400">
                  لا توجد شحنات مواد مطابقة للفلاتر.
                </div>
              ) : (
                materialData.items.map((m) => (
                  <div key={m.materialId} className="bg-stone-50 rounded-xl p-3 border border-stone-200/70 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-stone-900 flex items-center gap-1.5">
                        <span>{m.materialNameAr}</span>
                        <span className="text-[10px] text-stone-500 font-mono">({m.code})</span>
                      </div>
                      <div className="text-left font-mono font-bold text-stone-900">
                        {m.loadedTons.toLocaleString()} طن
                        <span className="text-[10px] text-amber-800 mr-1.5">({m.sharePercent}%)</span>
                      </div>
                    </div>

                    {/* Visual Progress Bar */}
                    <div className="w-full bg-stone-200 rounded-full h-2 mt-2 overflow-hidden">
                      <div 
                        className="bg-amber-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(5, m.sharePercent))}%` }}
                      ></div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-stone-500 mt-2">
                      <span>{m.totalTrips} رحلة نقل</span>
                      <span className="font-mono">{m.settlementAmount.toLocaleString()} ر.س</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      {/* 7. SECTION SIX: Pricing Distribution Widget */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-bold text-stone-900">
              توزيع نماذج التسعير التعاقدية (Pricing Distribution: PER_TRIP vs PER_TON)
            </h3>
          </div>

          <button
            onClick={() => toggleWidgetFilter('pricingDist')}
            className="flex items-center gap-1.5 text-xs text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>فلتر الودجت</span>
            {getEffectiveFilters('pricingDist').isCustomized && (
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            )}
          </button>
        </div>

        {expandedWidgetFilters['pricingDist'] && (
          <WidgetFilterBar
            filters={pricingFilters}
            onFilterChange={(f) => setWidgetFilter('pricingDist', f)}
            authorizedProjects={authorizedProjects}
            userProfile={activeProfile}
            isCustomized={getEffectiveFilters('pricingDist').isCustomized}
            onResetToGlobal={() => resetWidgetFilter('pricingDist')}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pricingData.items.map((p) => (
            <div 
              key={p.pricingType} 
              className={`rounded-xl p-4 border flex flex-col justify-between ${
                p.pricingType === 'PER_TRIP' 
                  ? 'bg-blue-50/40 border-blue-200' 
                  : 'bg-emerald-50/40 border-emerald-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-stone-900">{p.titleAr}</span>
                  <span className="text-xs font-mono font-bold bg-white px-2 py-0.5 rounded border border-stone-200">
                    {p.sharePercent}% من الإجمالي
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                  <div className="bg-white/80 p-2.5 rounded-lg border border-stone-200/60">
                    <span className="block text-[10px] text-stone-500 font-bold">الرحلات</span>
                    <span className="text-lg font-black font-mono text-stone-900">{p.totalTrips}</span>
                  </div>
                  <div className="bg-white/80 p-2.5 rounded-lg border border-stone-200/60">
                    <span className="block text-[10px] text-stone-500 font-bold">الأطنان</span>
                    <span className="text-lg font-black font-mono text-stone-900">{p.totalTons.toLocaleString()}</span>
                  </div>
                  <div className="bg-white/80 p-2.5 rounded-lg border border-stone-200/60">
                    <span className="block text-[10px] text-stone-500 font-bold">متوسط السعر</span>
                    <span className="text-lg font-black font-mono text-stone-900">{p.averageRate}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-stone-200/60 flex items-center justify-between text-xs">
                <span className="font-bold text-stone-600">إجمالي مستحق النموذج:</span>
                <span className="font-mono font-bold text-stone-900 text-sm">
                  {p.totalSettlementAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 8. SECTION SEVEN: Live Terminal Board */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></div>
            <div>
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <span>لوحة البوابات والموازين الحية (Live Terminal Board)</span>
                <span className="text-[10px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full font-mono font-bold border border-stone-200">
                  {terminalData.items.length} حركة نشطة
                </span>
              </h3>
              <p className="text-[11px] text-stone-500">
                متابعة فورية ومباشرة للشاحنات عبر موازين التحميل، الترحيل الميداني، والتفريغ في المواقع
              </p>
            </div>
          </div>

          {/* Search and Quick Filters */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-stone-400" />
              <input
                type="text"
                placeholder="بحث برقم التذكرة، اللوحة، أو السائق..."
                value={terminalSearch}
                onChange={(e) => setTerminalSearch(e.target.value)}
                className="pr-8 pl-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:border-amber-500 outline-none w-48 sm:w-60"
              />
            </div>

            <select
              value={terminalStatusFilter}
              onChange={(e) => setTerminalStatusFilter(e.target.value)}
              className="bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-stone-700 focus:bg-white focus:border-amber-500 outline-none cursor-pointer"
            >
              <option value="ALL">كافة الحالات</option>
              <option value="IN_TRANSIT">قيد النقل (IN_TRANSIT)</option>
              <option value="LOADED">تم التحميل (LOADED)</option>
              <option value="COMPLETED">مكتملة (COMPLETED)</option>
              <option value="RETURNED">مرتجعة (RETURNED)</option>
              <option value="EXCEPTION">استثناء (EXCEPTION)</option>
            </select>

            <button
              onClick={() => toggleWidgetFilter('terminalBoard')}
              className="p-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl cursor-pointer"
              title="فلتر الودجت المخصص"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {expandedWidgetFilters['terminalBoard'] && (
          <WidgetFilterBar
            filters={terminalFilters}
            onFilterChange={(f) => setWidgetFilter('terminalBoard', f)}
            authorizedProjects={authorizedProjects}
            userProfile={activeProfile}
            isCustomized={getEffectiveFilters('terminalBoard').isCustomized}
            onResetToGlobal={() => resetWidgetFilter('terminalBoard')}
          />
        )}

        {/* Terminal Table */}
        <div className="overflow-x-auto border border-stone-100 rounded-xl">
          <table className="w-full text-right text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold">
              <tr>
                <th className="py-2.5 px-3">رقم الرحلة / التذكرة</th>
                <th className="py-2.5 px-3">الشاحنة والسائق</th>
                <th className="py-2.5 px-3">المشروع والمادة</th>
                <th className="py-2.5 px-3">الناقل</th>
                <th className="py-2.5 px-3 text-center">الحالة</th>
                <th className="py-2.5 px-3 text-center">أوزان التحميل / الموقع</th>
                <th className="py-2.5 px-3 text-center">فارق الميزان</th>
                <th className="py-2.5 px-3 text-left">المستحق التعاقدي</th>
                <th className="py-2.5 px-3 text-center">التوقيت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium">
              {terminalData.items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-stone-400">
                    لا توجد حركات مسجلة تطابق معايير الفلترة أو البحث الحالية.
                  </td>
                </tr>
              ) : (
                terminalData.items.map((row) => (
                  <tr key={row.tripId} className="hover:bg-stone-50/80 transition-colors">
                    <td className="py-3 px-3">
                      <span className="font-mono font-bold text-stone-900 block">{row.tripSerial}</span>
                      <span className="text-[10px] text-stone-400 font-mono">{row.ticketId}</span>
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-bold text-stone-800 flex items-center gap-1">
                        <Truck className="w-3 h-3 text-stone-400" />
                        <span>{row.truckPlateAr}</span>
                      </div>
                      <span className="text-[10px] text-stone-500 block">{row.driverNameAr}</span>
                    </td>

                    <td className="py-3 px-3">
                      <span className="font-bold text-stone-800 block">{row.materialNameAr}</span>
                      <span className="text-[10px] text-stone-400">{row.projectNameAr}</span>
                    </td>

                    <td className="py-3 px-3 text-stone-700">
                      {row.carrierNameAr}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        row.status === 'COMPLETED' 
                          ? 'bg-emerald-100 text-emerald-800'
                          : row.status === 'IN_TRANSIT'
                          ? 'bg-blue-100 text-blue-800 animate-pulse'
                          : row.status === 'LOADED'
                          ? 'bg-purple-100 text-purple-800'
                          : row.status === 'RETURNED'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {row.status === 'COMPLETED' && 'مكتملة'}
                        {row.status === 'IN_TRANSIT' && 'قيد النقل'}
                        {row.status === 'LOADED' && 'تم التحميل'}
                        {row.status === 'RETURNED' && 'مرتجعة'}
                        {row.status === 'EXCEPTION' && 'استثناء'}
                        {row.status === 'DRAFT' && 'مسودة'}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center font-mono">
                      <div>{(row.loadedWeightKg / 1000).toFixed(2)} طن</div>
                      {row.receivedWeightKg !== null ? (
                        <div className="text-[10px] text-stone-500">الموقع: {(row.receivedWeightKg / 1000).toFixed(2)} طن</div>
                      ) : (
                        <div className="text-[10px] text-amber-600 font-bold">بانتظار الوصول</div>
                      )}
                    </td>

                    <td className="py-3 px-3 text-center font-mono">
                      {row.varianceKg !== null ? (
                        <span className={`font-bold ${
                          Math.abs(row.variancePercent || 0) <= 1 ? 'text-emerald-700' : 'text-rose-700'
                        }`}>
                          {row.varianceKg > 0 ? `+${row.varianceKg}` : row.varianceKg} كجم
                          <span className="text-[10px] block">({row.variancePercent}%)</span>
                        </span>
                      ) : (
                        <span className="text-stone-300">-</span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-left font-mono font-bold text-stone-900">
                      {row.settlementAmount > 0 ? (
                        <span>{row.settlementAmount.toLocaleString()} {row.currency}</span>
                      ) : (
                        <span className="text-stone-400 text-xs">0.00 ر.س</span>
                      )}
                      <span className="text-[9px] block text-stone-400">{row.pricingType}</span>
                    </td>

                    <td className="py-3 px-3 text-center text-[11px] text-stone-500 font-mono">
                      {row.eventTimeFormatted}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 9. Automated Test Suite Results Modal */}
      {isTestModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-stone-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-stone-900 text-white">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <span className="font-bold text-sm">نتائج فحص أمان المشاريع وصحة مؤشرات العمليات (Compliance Suite)</span>
              </div>
              <button
                onClick={() => setIsTestModalOpen(false)}
                className="p-1 text-stone-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-4">
              <div className={`p-4 rounded-xl border flex items-center justify-between ${
                testResults.allPassed 
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950' 
                  : 'bg-rose-50 border-rose-300 text-rose-950'
              }`}>
                <div className="flex items-center gap-3">
                  {testResults.allPassed ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  ) : (
                    <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0" />
                  )}
                  <div>
                    <h4 className="font-black text-sm">
                      {testResults.allPassed ? 'كافة فحوصات الأمان والعمليات ناجحة بنسبة 100%' : 'توجد إخفاقات'}
                    </h4>
                    <p className="text-xs text-stone-600 mt-0.5">
                      تم اجتياز {testResults.passedTests} من أصل {testResults.totalTests} اختباراً لعزل المشاريع وحسابات الأوزان والتسويات.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setTestResults(runDashboardSecurityAndMetricsTests())}
                  className="px-3 py-1.5 bg-white border border-stone-300 text-stone-800 rounded-lg text-xs font-bold hover:bg-stone-50 cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>إعادة الفحص</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {testResults.results.map((t) => (
                  <div 
                    key={t.id}
                    className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] bg-stone-200 text-stone-700 px-1.5 py-0.2 rounded font-bold">
                          {t.id}
                        </span>
                        <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded font-bold">
                          {t.category}
                        </span>
                        <h5 className="font-bold text-stone-900">{t.titleAr}</h5>
                      </div>
                      <p className="text-[11px] text-stone-600 leading-relaxed">{t.details}</p>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5 font-bold">
                      {t.passed ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full text-[10px]">
                          <Check className="w-3 h-3" />
                          <span>ناجح (PASSED)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full text-[10px]">
                          <X className="w-3 h-3" />
                          <span>فشل (FAILED)</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-stone-100 border-t border-stone-200 flex justify-end">
              <button
                onClick={() => setIsTestModalOpen(false)}
                className="px-4 py-2 bg-stone-900 text-white text-xs font-bold rounded-xl hover:bg-stone-800 cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
