import React, { useState, useEffect, useMemo } from 'react';
import { 
  adminConsoleService, 
  PricingRuleRecord, 
  PricingAuditHistoryEntry, 
  AdminUserRecord, 
  SyncHealthStatus 
} from '../../services/adminConsole.service';
import { 
  ProjectEntity, 
  CarrierEntity, 
  MaterialEntity, 
  TruckEntity, 
  DriverEntity, 
  TripExceptionEntity, 
  AuditLogEntity, 
  ImportBatchEntity 
} from '../../types/entities';
import { AuthUserContext } from '../../types/common';
import { 
  Building2, 
  Truck, 
  Boxes, 
  DollarSign, 
  ShieldAlert, 
  Users, 
  FileSpreadsheet, 
  Activity, 
  History, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Plus, 
  Edit3, 
  Search, 
  Filter, 
  ArrowRight, 
  Layers, 
  Tag, 
  Calendar, 
  Scale, 
  RefreshCw,
  ShieldCheck,
  Eye,
  ChevronDown,
  Info,
  Check,
  Smartphone,
  CreditCard,
  FileCheck,
  HelpCircle
} from 'lucide-react';

type AdminSection = 
  | 'PROJECTS'
  | 'CARRIERS'
  | 'MATERIALS'
  | 'PRICING_RULES'
  | 'TRUCKS'
  | 'DRIVERS'
  | 'USERS'
  | 'EXCEPTIONS'
  | 'AUDIT_LOGS'
  | 'IMPORT_BATCHES'
  | 'SYNC_HEALTH';

export function AdminConsoleView() {
  const [activeSection, setActiveSection] = useState<AdminSection>('PRICING_RULES');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Current admin session context
  const [authContext] = useState<AuthUserContext>({
    userId: 'USR-ADMIN-001',
    email: 'admin@qsaudi.com',
    role: 'PROJECT_ADMIN',
    displayName: 'المهندس طارق الشمري (مدير النظام)',
  });

  // State collections from AdminConsoleService
  const [projects, setProjects] = useState<ProjectEntity[]>([]);
  const [carriers, setCarriers] = useState<CarrierEntity[]>([]);
  const [materials, setMaterials] = useState<MaterialEntity[]>([]);
  const [pricingRules, setPricingRules] = useState<PricingRuleRecord[]>([]);
  const [pricingAuditHistory, setPricingAuditHistory] = useState<PricingAuditHistoryEntry[]>([]);
  const [trucks, setTrucks] = useState<TruckEntity[]>([]);
  const [drivers, setDrivers] = useState<DriverEntity[]>([]);
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [exceptions, setExceptions] = useState<TripExceptionEntity[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntity[]>([]);
  const [importBatches, setImportBatches] = useState<ImportBatchEntity[]>([]);
  const [syncHealth, setSyncHealth] = useState<SyncHealthStatus>(adminConsoleService.getSyncHealth());

  // Pricing Rule Versioning Modal
  const [editingRule, setEditingRule] = useState<PricingRuleRecord | null>(null);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState<boolean>(false);
  const [versionFormData, setVersionFormData] = useState({
    carrierId: '',
    carrierName: '',
    pricingType: 'PER_TON' as 'PER_TON' | 'PER_TRIP' | 'PER_KM' | 'FLAT_RATE',
    agreedRate: 0,
    currency: 'SAR',
    materialId: '',
    materialName: '',
    effectiveFrom: new Date().toISOString().split('T')[0],
    effectiveTo: '2026-12-31',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
    modificationReason: '',
  });

  // Pricing History Drawer / Modal
  const [selectedRuleForHistory, setSelectedRuleForHistory] = useState<string | null>(null);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState<boolean>(false);

  // General Notification Banner
  const [alertBanner, setAlertBanner] = useState<{ type: 'success' | 'info' | 'warning'; message: string } | null>(null);

  // Subscribe to service changes
  useEffect(() => {
    const refreshData = () => {
      setProjects(adminConsoleService.getProjects());
      setCarriers(adminConsoleService.getCarriers(selectedProjectId));
      setMaterials(adminConsoleService.getMaterials(selectedProjectId));
      setPricingRules(adminConsoleService.getPricingRules(selectedProjectId));
      setPricingAuditHistory(adminConsoleService.getPricingAuditHistory());
      setTrucks(adminConsoleService.getTrucks(selectedProjectId));
      setDrivers(adminConsoleService.getDrivers(selectedProjectId));
      setUsers(adminConsoleService.getUsers());
      setExceptions(adminConsoleService.getExceptions(selectedProjectId));
      setAuditLogs(adminConsoleService.getAuditLogs());
      setImportBatches(adminConsoleService.getImportBatches(selectedProjectId));
      setSyncHealth(adminConsoleService.getSyncHealth());
    };

    refreshData();
    const unsubscribe = adminConsoleService.subscribe(refreshData);
    return () => unsubscribe();
  }, [selectedProjectId]);

  // Dismiss banner after 6s
  useEffect(() => {
    if (alertBanner) {
      const timer = setTimeout(() => setAlertBanner(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [alertBanner]);

  // Open Versioning Modal for a rule
  const handleOpenVersionModal = (rule: PricingRuleRecord) => {
    setEditingRule(rule);
    setVersionFormData({
      carrierId: rule.carrierId,
      carrierName: rule.carrierName,
      pricingType: rule.pricingType,
      agreedRate: rule.agreedRate,
      currency: rule.currency || 'SAR',
      materialId: rule.materialId || '',
      materialName: rule.materialName || '',
      effectiveFrom: new Date().toISOString().split('T')[0],
      effectiveTo: rule.effectiveTo || '2026-12-31',
      status: rule.status,
      modificationReason: `تعديل السعر المعتمد (إنشاء النسخة v${(rule.version || 1) + 1}) وحماية الرحلات السابقة`,
    });
    setIsVersionModalOpen(true);
  };

  // Submit Versioning Form (Copy-on-write without mutating past trips)
  const handleSubmitVersioning = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule) return;

    try {
      const result = adminConsoleService.versionAndModifyPricingRule(
        editingRule.pricingRuleId,
        {
          ...versionFormData,
          agreedRate: Number(versionFormData.agreedRate),
        },
        authContext
      );

      setIsVersionModalOpen(false);
      setAlertBanner({
        type: 'success',
        message: `تم إنشاء النسخة الجديدة (${result.newVersionRule.pricingRuleId}) بنجاح بمعدل ${result.newVersionRule.agreedRate} ${result.newVersionRule.currency}. تم تأمين وحماية ${result.protectedTripsCount} رحلة تاريخية في السجل المحاسبي دون أي تعديل!`,
      });
    } catch (err: any) {
      setAlertBanner({
        type: 'warning',
        message: `خطأ أثناء تحديث التعرفة: ${err.message || err}`,
      });
    }
  };

  // Open History Drawer
  const handleOpenHistoryDrawer = (ruleId?: string) => {
    setSelectedRuleForHistory(ruleId || null);
    setIsHistoryDrawerOpen(true);
  };

  // Filtered pricing rules
  const filteredPricingRules = useMemo(() => {
    return pricingRules.filter(r => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || 
        r.carrierName.toLowerCase().includes(q) || 
        r.pricingRuleId.toLowerCase().includes(q) || 
        (r.materialName && r.materialName.toLowerCase().includes(q)) ||
        (r.notes && r.notes.toLowerCase().includes(q));
      return matchSearch;
    });
  }, [pricingRules, searchQuery]);

  return (
    <div className="space-y-6 pb-16 font-sans text-stone-900" dir="rtl">
      
      {/* Alert Banner */}
      {alertBanner && (
        <div className={`p-4 rounded-xl flex items-center justify-between border shadow-sm transition-all ${
          alertBanner.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
            : alertBanner.type === 'warning'
            ? 'bg-amber-50 border-amber-200 text-amber-900'
            : 'bg-stone-50 border-stone-200 text-stone-900'
        }`}>
          <div className="flex items-center gap-3">
            {alertBanner.type === 'success' && <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />}
            {alertBanner.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />}
            {alertBanner.type === 'info' && <Info className="w-5 h-5 text-stone-600 shrink-0" />}
            <span className="text-sm font-medium">{alertBanner.message}</span>
          </div>
          <button 
            onClick={() => setAlertBanner(null)}
            className="text-xs px-2 py-1 bg-white/60 hover:bg-white rounded font-bold"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white border border-stone-200/90 rounded-2xl p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200/60 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                وحدة التحكم المركزية (Admin Console)
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-stone-100 text-stone-600">
                11 قسماً إدارياً ورقابياً
              </span>
            </div>
            <h1 className="text-2xl font-black text-stone-900 tracking-tight">
              إدارة المنظومة والبيانات المرجعية (Master Data & Control)
            </h1>
            <p className="text-stone-600 text-sm mt-1 max-w-3xl">
              إدارة متكاملة لجميع قواعد العمليات اللوجستية، مصفوفات الأسعار مع حماية السلامة التاريخية للرحلات السابقة (Copy-on-write Versioning)، وسجلات التدقيق الشاملة.
            </p>
          </div>

          {/* Quick Context & Project Selector */}
          <div className="flex items-center gap-3 bg-stone-50 p-2.5 rounded-xl border border-stone-200/80">
            <Building2 className="w-4 h-4 text-stone-500" />
            <div className="text-xs">
              <span className="text-stone-500 block">المشروع المحدد:</span>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="bg-transparent font-bold text-stone-800 focus:outline-none cursor-pointer"
              >
                <option value="ALL">كافة المشاريع المصرحة (عرض شامل)</option>
                {projects.map(p => (
                  <option key={p.projectId} value={p.projectId}>{p.nameAr}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 11 Section Navigation Bar */}
        <div className="mt-6 pt-4 border-t border-stone-100 overflow-x-auto pb-1 scrollbar-thin">
          <div className="flex items-center gap-1.5 min-w-max">
            
            {/* 1. Projects */}
            <button
              onClick={() => setActiveSection('PROJECTS')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeSection === 'PROJECTS'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Projects (المشاريع)</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 text-current">
                {projects.length}
              </span>
            </button>

            {/* 2. Carriers */}
            <button
              onClick={() => setActiveSection('CARRIERS')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeSection === 'CARRIERS'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Carriers (الناقلين)</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 text-current">
                {carriers.length}
              </span>
            </button>

            {/* 3. Materials */}
            <button
              onClick={() => setActiveSection('MATERIALS')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeSection === 'MATERIALS'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              <Boxes className="w-4 h-4" />
              <span>Materials (المواد)</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 text-current">
                {materials.length}
              </span>
            </button>

            {/* 4. Pricing Rules (Highlighted) */}
            <button
              onClick={() => setActiveSection('PRICING_RULES')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeSection === 'PRICING_RULES'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200/60'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>Pricing Rules (قواعد الأسعار)</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeSection === 'PRICING_RULES' ? 'bg-white/25 text-white' : 'bg-amber-200 text-amber-900'
              }`}>
                محمي وتاريخي
              </span>
            </button>

            {/* 5. Trucks */}
            <button
              onClick={() => setActiveSection('TRUCKS')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeSection === 'TRUCKS'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Trucks (الشاحنات)</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 text-current">
                {trucks.length}
              </span>
            </button>

            {/* 6. Drivers */}
            <button
              onClick={() => setActiveSection('DRIVERS')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeSection === 'DRIVERS'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Drivers (السائقين)</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 text-current">
                {drivers.length}
              </span>
            </button>

            {/* 7. Users */}
            <button
              onClick={() => setActiveSection('USERS')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeSection === 'USERS'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Users (المستخدمين والأدوار)</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 text-current">
                {users.length}
              </span>
            </button>

            {/* 8. Exceptions */}
            <button
              onClick={() => setActiveSection('EXCEPTIONS')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeSection === 'EXCEPTIONS'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Exceptions (الاستثناءات)</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 text-current">
                {exceptions.length}
              </span>
            </button>

            {/* 9. Audit Logs */}
            <button
              onClick={() => setActiveSection('AUDIT_LOGS')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeSection === 'AUDIT_LOGS'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Audit Logs (سجل التدقيق)</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 text-current">
                {auditLogs.length}
              </span>
            </button>

            {/* 10. Import Batches */}
            <button
              onClick={() => setActiveSection('IMPORT_BATCHES')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeSection === 'IMPORT_BATCHES'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Import Batches (دفعات الاستيراد)</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 text-current">
                {importBatches.length}
              </span>
            </button>

            {/* 11. Sync Health */}
            <button
              onClick={() => setActiveSection('SYNC_HEALTH')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeSection === 'SYNC_HEALTH'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Sync Health (صحة المزامنة)</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </button>

          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 4. PRICING RULES SECTION (PRIMARY FOCUS) */}
      {/* ==================================================================== */}
      {activeSection === 'PRICING_RULES' && (
        <div className="space-y-6">
          
          {/* Rules Control Bar & Policy Declaration */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700 shrink-0 mt-0.5">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-amber-950">
                  قواعد تسعير النقل وضمان الحصانة التاريخية (Pricing Rules & Immutability)
                </h2>
                <p className="text-xs text-amber-900/80 mt-1 leading-relaxed max-w-3xl">
                  <strong>القاعدة المحاسبية الصارمة:</strong> عند تعديل أي قاعدة تسعير، لا يتم المساس بالرحلات السابقة (Historical Trips) إطلاقاً. يتم توليد نسخة جديدة (Version) تسري فقط من تاريخ النفاذ الجديد، بينما تظل كافة الرحلات السابقة محتفظة بلقطة التعرفة الأصلية.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={() => handleOpenHistoryDrawer()}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-amber-300/80 text-amber-900 text-xs font-bold hover:bg-amber-100/50 shadow-2xs transition-all"
              >
                <History className="w-4 h-4 text-amber-700" />
                <span>عرض سجل تاريخ التغييرات (Audit History)</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-stone-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث بالناقل، رمز القاعدة، المادة..."
                className="w-full pr-10 pl-4 py-2.5 bg-white border border-stone-200/90 rounded-xl text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-amber-500 shadow-2xs"
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-stone-500">
              <span>إجمالي القواعد: <strong>{filteredPricingRules.length}</strong></span>
              <span>•</span>
              <span>سجلات التدقيق: <strong>{pricingAuditHistory.length}</strong></span>
            </div>
          </div>

          {/* Rules Table */}
          <div className="bg-white border border-stone-200/90 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-50/90 border-b border-stone-200/80 text-stone-600 font-bold">
                    <th className="py-3 px-4">رقم النسخة والقاعدة</th>
                    <th className="py-3 px-4">اسم الناقل</th>
                    <th className="py-3 px-4">نوع التسعير</th>
                    <th className="py-3 px-4">السعر</th>
                    <th className="py-3 px-4">العملة</th>
                    <th className="py-3 px-4">المادة الاختيارية</th>
                    <th className="py-3 px-4">من تاريخ</th>
                    <th className="py-3 px-4">إلى تاريخ</th>
                    <th className="py-3 px-4">الحالة</th>
                    <th className="py-3 px-4 text-center">الرحلات المحمية</th>
                    <th className="py-3 px-4 text-left">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredPricingRules.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-stone-400 text-xs">
                        لا توجد قواعد تسعير مطابقة للبحث أو للمشروع المحدد.
                      </td>
                    </tr>
                  ) : (
                    filteredPricingRules.map((rule) => {
                      const tripCount = adminConsoleService.countHistoricalTripsForRule(rule.pricingRuleId);
                      return (
                        <tr key={rule.pricingRuleId} className="hover:bg-amber-50/30 transition-colors">
                          
                          {/* ID & Version Badge */}
                          <td className="py-3.5 px-4 font-mono text-[11px]">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-stone-900">{rule.pricingRuleId}</span>
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-stone-100 text-stone-700 border border-stone-200">
                                v{rule.version || 1}
                              </span>
                            </div>
                            {rule.parentRuleId && (
                              <span className="text-[10px] text-stone-400 block mt-0.5 font-sans">
                                مستحدث من {rule.parentRuleId}
                              </span>
                            )}
                          </td>

                          {/* Carrier Name */}
                          <td className="py-3.5 px-4 font-semibold text-stone-900">
                            {rule.carrierName}
                          </td>

                          {/* Pricing Type */}
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.8 rounded text-[11px] font-bold ${
                              rule.pricingType === 'PER_TON' 
                                ? 'bg-indigo-50 text-indigo-800 border border-indigo-200/50' 
                                : rule.pricingType === 'PER_TRIP'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/50'
                                : 'bg-stone-100 text-stone-700'
                            }`}>
                              {rule.pricingType === 'PER_TON' ? 'بالطن (PER_TON)' :
                               rule.pricingType === 'PER_TRIP' ? 'بالرد (PER_TRIP)' :
                               rule.pricingType === 'PER_KM' ? 'بالكيلو (PER_KM)' : 'مقطوعية'}
                            </span>
                          </td>

                          {/* Price / Rate */}
                          <td className="py-3.5 px-4 font-mono font-bold text-stone-900 text-sm">
                            {rule.agreedRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>

                          {/* Currency */}
                          <td className="py-3.5 px-4 text-stone-600 font-bold">
                            {rule.currency || 'SAR'}
                          </td>

                          {/* Optional Material */}
                          <td className="py-3.5 px-4 text-stone-700">
                            {rule.materialName ? (
                              <span className="font-medium text-stone-800">{rule.materialName}</span>
                            ) : (
                              <span className="text-stone-400 italic">كافة المواد والخامات (عام)</span>
                            )}
                          </td>

                          {/* Effective From */}
                          <td className="py-3.5 px-4 font-mono text-stone-600">
                            {rule.effectiveFrom}
                          </td>

                          {/* Effective To */}
                          <td className="py-3.5 px-4 font-mono text-stone-600">
                            {rule.effectiveTo}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              rule.status === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-stone-100 text-stone-600'
                            }`}>
                              {rule.status === 'ACTIVE' ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>نشط</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3 h-3 text-stone-400" />
                                  <span>مؤرشف / منتهي</span>
                                </>
                              )}
                            </span>
                          </td>

                          {/* Protected Trips Badge */}
                          <td className="py-3.5 px-4 text-center">
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100/70 text-amber-900 border border-amber-200" title="عدد الرحلات السابقة المسجلة بهذه التعرفة والتي تظل محمية تماماً">
                              {tripCount} رحلة تاريخية
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-left">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenVersionModal(rule)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-stone-900 hover:bg-amber-600 text-white text-[11px] font-bold transition-all shadow-2xs"
                                title="تعديل السعر بإنشاء نسخة جديدة لحماية السجلات السابقة"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>تعديل (نسخة v{(rule.version || 1) + 1})</span>
                              </button>

                              <button
                                onClick={() => handleOpenHistoryDrawer(rule.pricingRuleId)}
                                className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition-all"
                                title="عرض سجل التدقيق وتاريخ التغييرات"
                              >
                                <History className="w-3.5 h-3.5 text-stone-600" />
                              </button>
                            </div>
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ==================================================================== */}
      {/* 1. PROJECTS SECTION */}
      {/* ==================================================================== */}
      {activeSection === 'PROJECTS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-stone-900">سجل المشاريع الإنشائية المعتمدة (Project Registry)</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((p) => (
              <div key={p.projectId} className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200/60 font-mono">
                      {p.projectId}
                    </span>
                    <h3 className="font-bold text-stone-900 text-base mt-2">{p.nameAr}</h3>
                    <p className="text-xs text-stone-500">{p.nameEn} • {p.clientName}</p>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    p.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'
                  }`}>
                    {p.status === 'ACTIVE' ? 'مشروع نشط' : 'مخطط'}
                  </span>
                </div>
                
                <div className="mt-4 pt-4 border-t border-stone-100 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-stone-400 block text-[11px]">الرقم الضريبي ZATCA</span>
                    <span className="font-mono font-semibold text-stone-800">{p.settings.zatcaTaxNumber}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-[11px]">نسبة الضريبة</span>
                    <span className="font-bold text-stone-800">{p.settings.vatRatePercent}%</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-[11px]">الموقع والسياج</span>
                    <span className="text-stone-800 font-medium">{p.location.addressAr} ({p.location.geoFenceRadiusMeters}م)</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-[11px]">الناقلين المصرحين</span>
                    <span className="text-stone-800 font-bold">{p.authorizedCarrierIds?.length || 0} شركات</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2. CARRIERS SECTION */}
      {/* ==================================================================== */}
      {activeSection === 'CARRIERS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-stone-900">سجل شركات النقل والخدمات اللوجستية (Carriers Registry)</h2>
          </div>
          <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold">
                  <th className="py-3 px-4">رقم الناقل</th>
                  <th className="py-3 px-4">اسم الشركة</th>
                  <th className="py-3 px-4">السجل التجاري (CR)</th>
                  <th className="py-3 px-4">ترخيص هيئة النقل (TGA)</th>
                  <th className="py-3 px-4">المسؤول والهاتف</th>
                  <th className="py-3 px-4">الحالة</th>
                  <th className="py-3 px-4 text-left">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {carriers.map(c => (
                  <tr key={c.carrierId} className="hover:bg-stone-50">
                    <td className="py-3 px-4 font-mono font-bold text-stone-700">{c.carrierId}</td>
                    <td className="py-3 px-4 font-semibold text-stone-900">{c.name || c.companyNameAr}</td>
                    <td className="py-3 px-4 font-mono text-stone-600">{c.commercialRegistrationNo || '—'}</td>
                    <td className="py-3 px-4 font-mono text-stone-600">{c.transportLicenseNo || '—'}</td>
                    <td className="py-3 px-4 text-stone-700">
                      {c.contactPerson ? `${c.contactPerson.name} (${c.contactPerson.phone})` : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        c.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {c.status === 'ACTIVE' ? 'معتمد' : 'معطل'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-left">
                      <button
                        onClick={() => adminConsoleService.toggleCarrierStatus(c.carrierId, authContext)}
                        className="px-2.5 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-[11px]"
                      >
                        {c.status === 'ACTIVE' ? 'تعطيل' : 'تفعيل'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 3. MATERIALS SECTION */}
      {/* ==================================================================== */}
      {activeSection === 'MATERIALS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-stone-900">سجل المواد والخامات المعتمدة (Materials Registry)</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {materials.map(m => (
              <div key={m.materialId} className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                    {m.code}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    m.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'
                  }`}>
                    {m.status === 'ACTIVE' ? 'نشط' : 'معطل'}
                  </span>
                </div>
                <h3 className="font-bold text-stone-900 text-sm mt-3">{m.name || m.nameAr}</h3>
                <div className="mt-3 pt-3 border-t border-stone-100 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-stone-400 block text-[11px]">وحدة القياس</span>
                    <span className="font-bold text-stone-800">{m.unitOfMeasure === 'TON' ? 'طن متري' : m.unitOfMeasure}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-[11px]">الكثافة القياسية</span>
                    <span className="font-mono font-bold text-stone-800">{m.standardDensityTonPerM3 || 1.6} طن/م³</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 5. TRUCKS SECTION */}
      {/* ==================================================================== */}
      {activeSection === 'TRUCKS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-stone-900">أسطول الشاحنات والأوزان المعتمدة (Trucks & Tare Weights)</h2>
          </div>
          <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold">
                  <th className="py-3 px-4">رقم الشاحنة</th>
                  <th className="py-3 px-4">رقم اللوحة</th>
                  <th className="py-3 px-4">الناقل المالك</th>
                  <th className="py-3 px-4">وزن الفارغ (Tare Kg)</th>
                  <th className="py-3 px-4">الوزن الأقصى (Gross)</th>
                  <th className="py-3 px-4">الحمولة النظامية (Net)</th>
                  <th className="py-3 px-4">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {trucks.map(t => (
                  <tr key={t.truckId} className="hover:bg-stone-50">
                    <td className="py-3 px-4 font-mono font-bold text-stone-800">{t.truckId}</td>
                    <td className="py-3 px-4 font-bold text-stone-900">{t.plate || t.plateNumberAr}</td>
                    <td className="py-3 px-4 text-stone-600 font-medium">{t.carrierId}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-stone-800">
                      {t.tareWeightKg?.toLocaleString()} كجم
                    </td>
                    <td className="py-3 px-4 font-mono text-stone-700">
                      {t.maxGrossWeightKg?.toLocaleString()} كجم
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-800">
                      {t.legalPayloadLimitKg?.toLocaleString()} كجم
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        t.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'
                      }`}>
                        {t.status === 'ACTIVE' ? 'نشط' : 'معطل'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 6. DRIVERS SECTION */}
      {/* ==================================================================== */}
      {activeSection === 'DRIVERS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-stone-900">سجل السائقين وتراخيص القيادة (Drivers Registry)</h2>
          </div>
          <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold">
                  <th className="py-3 px-4">رقم السائق</th>
                  <th className="py-3 px-4">اسم السائق</th>
                  <th className="py-3 px-4">الهوية الوطنية / الإقامة</th>
                  <th className="py-3 px-4">الجوال</th>
                  <th className="py-3 px-4">الناقل</th>
                  <th className="py-3 px-4">الشاحنة المعينة</th>
                  <th className="py-3 px-4">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {drivers.map(d => (
                  <tr key={d.driverId} className="hover:bg-stone-50">
                    <td className="py-3 px-4 font-mono font-bold text-stone-800">{d.driverId}</td>
                    <td className="py-3 px-4 font-semibold text-stone-900">{d.name || d.fullNameAr}</td>
                    <td className="py-3 px-4 font-mono text-stone-600">{d.idNumber || d.nationalOrIqamaId}</td>
                    <td className="py-3 px-4 font-mono text-stone-600">{d.phone}</td>
                    <td className="py-3 px-4 text-stone-700 font-medium">{d.carrierId}</td>
                    <td className="py-3 px-4 font-mono text-stone-700">{d.currentAssignedTruckId || '—'}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        d.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'
                      }`}>
                        {d.status === 'ACTIVE' ? 'نشط' : 'معطل'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 7. USERS SECTION */}
      {/* ==================================================================== */}
      {activeSection === 'USERS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-stone-900">إدارة المستخدمين وصلاحيات الأدوار (RBAC Users)</h2>
          </div>
          <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold">
                  <th className="py-3 px-4">المعرف والاسم</th>
                  <th className="py-3 px-4">البريد الإلكتروني</th>
                  <th className="py-3 px-4">الدور الوظيفي</th>
                  <th className="py-3 px-4">المشاريع المسندة</th>
                  <th className="py-3 px-4">الحالة</th>
                  <th className="py-3 px-4 text-left">تعديل الدور</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {users.map(u => (
                  <tr key={u.userId} className="hover:bg-stone-50">
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-stone-900 block">{u.fullName}</span>
                      <span className="font-mono text-[10px] text-stone-400">{u.userId}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-stone-600">{u.email}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.8 rounded text-[11px] font-bold ${
                        u.role === 'PROJECT_ADMIN' ? 'bg-purple-100 text-purple-800' :
                        u.role === 'FINANCE_AUDITOR' ? 'bg-amber-100 text-amber-800' :
                        u.role === 'DISPATCHER' ? 'bg-blue-100 text-blue-800' :
                        'bg-stone-100 text-stone-700'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-stone-600">
                      {u.assignedProjectIds.join(', ')}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        u.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {u.isActive ? 'نشط' : 'معطل'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-left">
                      <select
                        value={u.role}
                        onChange={(e) => adminConsoleService.updateUserRole(u.userId, e.target.value as any, authContext)}
                        className="bg-stone-50 border border-stone-200 rounded px-2 py-1 text-[11px] font-semibold text-stone-800 focus:outline-none"
                      >
                        <option value="PROJECT_ADMIN">PROJECT_ADMIN</option>
                        <option value="DISPATCHER">DISPATCHER</option>
                        <option value="FINANCE_AUDITOR">FINANCE_AUDITOR</option>
                        <option value="VIEWER">VIEWER</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 8. EXCEPTIONS SECTION */}
      {/* ==================================================================== */}
      {activeSection === 'EXCEPTIONS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-stone-900">الاستثناءات والتعارضات التشغيلية (Exceptions Engine)</h2>
          </div>
          <div className="space-y-3">
            {exceptions.map(exc => (
              <div key={exc.exceptionId} className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-stone-900">{exc.exceptionId}</span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      exc.severity === 'BLOCKING' || exc.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-800' :
                      exc.severity === 'HIGH' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {exc.severity}
                    </span>
                    <span className="text-xs font-semibold text-stone-700">{exc.type}</span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    exc.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' :
                    exc.status === 'UNDER_REVIEW' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {exc.status}
                  </span>
                </div>
                <p className="text-xs text-stone-800 mt-2 font-medium">{exc.description}</p>
                {exc.resolutionNote && (
                  <div className="mt-2.5 p-2.5 rounded-lg bg-emerald-50 text-emerald-900 text-xs border border-emerald-200/60">
                    <strong>قرار المعالجة:</strong> {exc.resolutionNote}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 9. AUDIT LOGS SECTION */}
      {/* ==================================================================== */}
      {activeSection === 'AUDIT_LOGS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-stone-900">سجل التدقيق الشامل غير القابل للتعديل (System Audit Trail)</h2>
          </div>
          <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold">
                  <th className="py-3 px-4">رقم القيد والتاريخ</th>
                  <th className="py-3 px-4">نوع الكيان</th>
                  <th className="py-3 px-4">الإجراء</th>
                  <th className="py-3 px-4">المنفذ</th>
                  <th className="py-3 px-4">الحقول المعدلة (Delta)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {auditLogs.map(log => (
                  <tr key={log.auditLogId} className="hover:bg-stone-50">
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-stone-800 block text-[11px]">{log.auditLogId}</span>
                      <span className="text-[10px] text-stone-400 font-mono">{new Date(log.createdAt as any).toLocaleString('ar-SA')}</span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-stone-800">{log.entityType} ({log.entityId})</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-stone-100 text-stone-800">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-stone-700">
                      <span className="font-medium block">{log.actor.userId}</span>
                      <span className="text-[10px] text-stone-400">{log.actor.role}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-stone-600">
                      {log.changes.deltaFields.join(', ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 10. IMPORT BATCHES SECTION */}
      {/* ==================================================================== */}
      {activeSection === 'IMPORT_BATCHES' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-stone-900">سجل دفعات الاستيراد المجمعة (Import Batches)</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {importBatches.map(b => (
              <div key={b.batchId} className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xs font-bold text-stone-900">{b.batchId}</span>
                    <h3 className="font-bold text-stone-800 text-sm mt-1">{b.sourceFileName}</h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                    {b.status}
                  </span>
                </div>
                <div className="mt-4 pt-4 border-t border-stone-100 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 bg-stone-50 rounded-lg">
                    <span className="text-stone-400 block text-[10px]">إجمالي السجلات</span>
                    <span className="font-bold text-sm text-stone-900">{b.totalRecords}</span>
                  </div>
                  <div className="p-2 bg-emerald-50 rounded-lg">
                    <span className="text-emerald-700 block text-[10px]">المعالجة بنجاح</span>
                    <span className="font-bold text-sm text-emerald-800">{b.processedRecords}</span>
                  </div>
                  <div className="p-2 bg-rose-50 rounded-lg">
                    <span className="text-rose-700 block text-[10px]">المرفوضة</span>
                    <span className="font-bold text-sm text-rose-800">{b.failedRecords}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 11. SYNC HEALTH SECTION */}
      {/* ==================================================================== */}
      {activeSection === 'SYNC_HEALTH' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-stone-900">صحة المزامنة السحابية وقاعدة البيانات (Sync Health Monitor)</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-500">حالة قاعدة بيانات Firestore</span>
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-xl font-bold text-stone-900 mt-2">{syncHealth.firestoreStatus}</p>
              <p className="text-[11px] text-stone-400 font-mono mt-1">{syncHealth.databaseId}</p>
            </div>

            <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-500">تكامل Google Workspace</span>
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-xl font-bold text-stone-900 mt-2">{syncHealth.googleWorkspaceStatus}</p>
              <p className="text-[11px] text-stone-500 mt-1">Sheets & Drive Projections Ready</p>
            </div>

            <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-500">العمليات المعلقة في Outbox</span>
                <Activity className="w-5 h-5 text-stone-400" />
              </div>
              <p className="text-xl font-bold text-emerald-700 mt-2">{syncHealth.pendingOutboxCount} عمليات</p>
              <p className="text-[11px] text-stone-500 mt-1">كافة البيانات متزامنة محلياً وسحابياً</p>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: PRICING RULE VERSIONING (COPY-ON-WRITE) */}
      {/* ==================================================================== */}
      {isVersionModalOpen && editingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-stone-100 flex items-center justify-between">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                  إنشاء نسخة جديدة v{(editingRule.version || 1) + 1}
                </span>
                <h3 className="text-lg font-black text-stone-900 mt-1.5">
                  تعديل قاعدة التسعير: {editingRule.carrierName}
                </h3>
              </div>
              <button
                onClick={() => setIsVersionModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Immutability Notice */}
            <div className="p-4 mx-6 mt-6 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs leading-relaxed">
              <div className="flex items-center gap-2 font-bold mb-1">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                <span>ضمان الحصانة التاريخية (Historical Immutability):</span>
              </div>
              لن يتم تعديل أي رحلة سابقة تم تسجيلها بهذه التعرفة (محمية: {adminConsoleService.countHistoricalTripsForRule(editingRule.pricingRuleId)} رحلة سابقة). سيتم إغلاق النسخة القديمة وإنشاء نسخة تسعير جديدة تسري من تاريخ النفاذ المحدد.
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitVersioning} className="p-6 space-y-4 text-xs">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Carrier Name */}
                <div>
                  <label className="block font-bold text-stone-700 mb-1">اسم الناقل</label>
                  <select
                    value={versionFormData.carrierId}
                    onChange={(e) => {
                      const sel = carriers.find(c => c.carrierId === e.target.value);
                      setVersionFormData({
                        ...versionFormData,
                        carrierId: e.target.value,
                        carrierName: sel?.name || sel?.companyNameAr || e.target.value,
                      });
                    }}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-semibold text-stone-800"
                    required
                  >
                    {carriers.map(c => (
                      <option key={c.carrierId} value={c.carrierId}>{c.name || c.companyNameAr}</option>
                    ))}
                  </select>
                </div>

                {/* Pricing Type */}
                <div>
                  <label className="block font-bold text-stone-700 mb-1">نوع التسعير</label>
                  <select
                    value={versionFormData.pricingType}
                    onChange={(e) => setVersionFormData({ ...versionFormData, pricingType: e.target.value as any })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-semibold text-stone-800"
                    required
                  >
                    <option value="PER_TON">بالطن المتري (PER_TON)</option>
                    <option value="PER_TRIP">بالرد / مقطوعية (PER_TRIP)</option>
                    <option value="PER_KM">بالكيلومتر (PER_KM)</option>
                    <option value="FLAT_RATE">مقطوعية ثابتة (FLAT_RATE)</option>
                  </select>
                </div>

                {/* Price / Rate */}
                <div>
                  <label className="block font-bold text-stone-700 mb-1">السعر التعاقدي الجديد</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={versionFormData.agreedRate}
                      onChange={(e) => setVersionFormData({ ...versionFormData, agreedRate: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold font-mono text-stone-900"
                      required
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-bold">
                      {versionFormData.currency}
                    </span>
                  </div>
                </div>

                {/* Currency */}
                <div>
                  <label className="block font-bold text-stone-700 mb-1">العملة</label>
                  <input
                    type="text"
                    value={versionFormData.currency}
                    onChange={(e) => setVersionFormData({ ...versionFormData, currency: e.target.value })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold font-mono text-stone-800"
                    required
                  />
                </div>

                {/* Optional Material */}
                <div>
                  <label className="block font-bold text-stone-700 mb-1">المادة الاختيارية (Material)</label>
                  <select
                    value={versionFormData.materialId}
                    onChange={(e) => {
                      const sel = materials.find(m => m.materialId === e.target.value);
                      setVersionFormData({
                        ...versionFormData,
                        materialId: e.target.value,
                        materialName: sel ? (sel.name || sel.nameAr || sel.code) : '',
                      });
                    }}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-semibold text-stone-800"
                  >
                    <option value="">كافة المواد والخامات (عام لكافة الخامات)</option>
                    {materials.map(m => (
                      <option key={m.materialId} value={m.materialId}>{m.name || m.nameAr} ({m.code})</option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block font-bold text-stone-700 mb-1">الحالة للنسخة الجديدة</label>
                  <select
                    value={versionFormData.status}
                    onChange={(e) => setVersionFormData({ ...versionFormData, status: e.target.value as any })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-semibold text-stone-800"
                  >
                    <option value="ACTIVE">نشط (ACTIVE)</option>
                    <option value="INACTIVE">معطل (INACTIVE)</option>
                  </select>
                </div>

                {/* Effective From */}
                <div>
                  <label className="block font-bold text-stone-700 mb-1">من تاريخ (Effective From)</label>
                  <input
                    type="date"
                    value={versionFormData.effectiveFrom}
                    onChange={(e) => setVersionFormData({ ...versionFormData, effectiveFrom: e.target.value })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono text-stone-800"
                    required
                  />
                </div>

                {/* Effective To */}
                <div>
                  <label className="block font-bold text-stone-700 mb-1">إلى تاريخ (Effective To)</label>
                  <input
                    type="date"
                    value={versionFormData.effectiveTo}
                    onChange={(e) => setVersionFormData({ ...versionFormData, effectiveTo: e.target.value })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono text-stone-800"
                    required
                  />
                </div>

              </div>

              {/* Justification / Note */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">سبب التعديل والاعتماد المالي</label>
                <textarea
                  rows={2}
                  value={versionFormData.modificationReason}
                  onChange={(e) => setVersionFormData({ ...versionFormData, modificationReason: e.target.value })}
                  placeholder="مثال: تم اعتماد ملحق العقد الجديد مع زيادة تسعيرة الركام 10% اعتباراً من بداية الربع..."
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 focus:outline-none"
                  required
                />
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-stone-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsVersionModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-700 font-bold hover:bg-stone-50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-xs flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>اعتماد وإنشاء النسخة v{(editingRule.version || 1) + 1}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* DRAWER: PRICING AUDIT HISTORY */}
      {/* ==================================================================== */}
      {isHistoryDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white h-full w-full max-w-xl shadow-2xl p-6 overflow-y-auto flex flex-col justify-between">
            
            <div className="space-y-6">
              
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-stone-100">
                <div>
                  <h3 className="font-bold text-lg text-stone-900">سجل تاريخ تغييرات الأسعار (Audit History)</h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {selectedRuleForHistory 
                      ? `سجل التعديلات والنسخ للقاعدة: ${selectedRuleForHistory}`
                      : 'سجل التعديلات الشامل لكافة قواعد ومصفوفات التسعير'}
                  </p>
                </div>
                <button
                  onClick={() => setIsHistoryDrawerOpen(false)}
                  className="p-1.5 text-stone-400 hover:text-stone-700 font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Timeline Entries */}
              <div className="space-y-4">
                {adminConsoleService.getPricingAuditHistory(selectedRuleForHistory || undefined).length === 0 ? (
                  <p className="text-xs text-stone-400 py-8 text-center">لا توجد سجلات تدقيق سابقة.</p>
                ) : (
                  adminConsoleService.getPricingAuditHistory(selectedRuleForHistory || undefined).map((entry) => (
                    <div key={entry.auditId} className="bg-stone-50 border border-stone-200/80 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            entry.action === 'VERSIONED_UPDATE' ? 'bg-amber-100 text-amber-900 border border-amber-300/50' : 'bg-stone-200 text-stone-800'
                          }`}>
                            {entry.action === 'VERSIONED_UPDATE' ? `نسخة جديدة v${entry.version}` : entry.action}
                          </span>
                          <span className="font-mono text-xs font-bold text-stone-900">{entry.pricingRuleId}</span>
                        </div>
                        <span className="text-[11px] font-mono text-stone-400">{new Date(entry.changedAt).toLocaleString('ar-SA')}</span>
                      </div>

                      <p className="text-xs text-stone-800 font-semibold">{entry.carrierName}</p>
                      
                      {/* Before / After Delta */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] bg-white p-2.5 rounded-lg border border-stone-200">
                        {entry.previousValues && (
                          <div>
                            <span className="text-stone-400 block text-[10px]">القيمة السابقة</span>
                            <span className="font-mono text-stone-600 line-through">
                              {entry.previousValues.agreedRate} ر.س ({entry.previousValues.pricingType})
                            </span>
                          </div>
                        )}
                        <div>
                          <span className="text-emerald-700 block text-[10px]">القيمة الجديدة المعتمدة</span>
                          <span className="font-mono font-bold text-emerald-800">
                            {entry.newValues.agreedRate} ر.س ({entry.newValues.pricingType})
                          </span>
                        </div>
                      </div>

                      {/* Historical Protection Indicator */}
                      <div className="flex items-center justify-between text-[11px] pt-1 text-stone-500">
                        <span>المنفذ: <strong>{entry.changedBy}</strong> ({entry.changedByRole})</span>
                        <span className="text-amber-800 font-bold bg-amber-100/60 px-2 py-0.5 rounded">
                          {entry.historicalTripsProtectedCount} رحلة تاريخية لم تتأثر
                        </span>
                      </div>

                      {entry.reason && (
                        <p className="text-[11px] text-stone-600 italic bg-stone-100/50 p-1.5 rounded">
                          سبب التعديل: {entry.reason}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>

            </div>

            <div className="pt-4 border-t border-stone-100">
              <button
                onClick={() => setIsHistoryDrawerOpen(false)}
                className="w-full py-2.5 rounded-xl bg-stone-900 text-white font-bold text-xs"
              >
                إغلاق السجل
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
