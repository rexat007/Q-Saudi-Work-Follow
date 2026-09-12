import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Calendar, 
  Clock, 
  Truck, 
  Layers, 
  Gauge, 
  Scale, 
  RotateCcw, 
  AlertTriangle, 
  Building2, 
  PieChart, 
  Package, 
  Hash, 
  Calculator, 
  Banknote, 
  Download, 
  Printer, 
  Filter, 
  RotateCw, 
  Search, 
  CheckCircle2, 
  ChevronDown,
  Info,
  ShieldCheck,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';
import { 
  ReportType, 
  ReportCategory, 
  OperationalReportType, 
  PricingReportType, 
  ReportFilterParams, 
  OPERATIONAL_REPORTS_METADATA, 
  PRICING_REPORTS_METADATA 
} from '../../types/reports';
import { TripEngineStatus, TripPricingType, OperationSourceType } from '../../types/tripEngine';
import { reportsEngineService } from '../../services/reportsEngine.service';
import { tripEngineService } from '../../services/tripEngine.service';
import { PrintableReportModal } from './PrintableReportModal';
import { runReportsEngineTests, ReportsTestCaseResult } from '../../tests/reportsEngine.test';
import { Play, Check, X, ShieldAlert } from 'lucide-react';

export const ReportsEngineView: React.FC = () => {
  // Navigation
  const [activeCategory, setActiveCategory] = useState<ReportCategory>('OPERATIONAL');
  const [selectedReportType, setSelectedReportType] = useState<ReportType>('DAILY_OPERATIONS');
  
  // Test suite state
  const [isTestModalOpen, setIsTestModalOpen] = useState<boolean>(false);
  const [testResults, setTestResults] = useState<{
    allPassed: boolean;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    results: ReportsTestCaseResult[];
  }>(() => runReportsEngineTests());
  
  // Filter state (BLOCK 39: multi-criteria filter parameters)
  const [filters, setFilters] = useState<ReportFilterParams>({
    projectId: 'ALL',
    shiftDateFrom: '',
    shiftDateTo: '',
    shift: 'ALL',
    carrierId: 'ALL',
    materialId: 'ALL',
    pricingType: 'ALL',
    status: 'ALL',
    sourceType: 'ALL',
    truckId: 'ALL',
    driverId: 'ALL',
    supervisorId: 'ALL',
  });

  // Table Search and Sorting
  const [tableSearch, setTableSearch] = useState<string>('');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  // Trips from tripEngineService
  const allTrips = useMemo(() => tripEngineService.getTrips(), []);

  // Distinct master data options extracted dynamically from live trips & snapshots (RP-27, RP-28, RP-34)
  const availableProjects = useMemo(() => {
    const map = new Map<string, string>();
    allTrips.forEach(t => {
      const pName = reportsEngineService.getEntityLabels(t).projectName;
      map.set(t.projectId, pName);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ projectId: id, nameAr: name }));
  }, [allTrips]);

  const availableCarriers = useMemo(() => {
    const map = new Map<string, string>();
    allTrips.forEach(t => {
      const cName = reportsEngineService.getEntityLabels(t).carrierName;
      map.set(t.carrierId, cName);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ carrierId: id, nameAr: name }));
  }, [allTrips]);

  const availableMaterials = useMemo(() => {
    const map = new Map<string, string>();
    allTrips.forEach(t => {
      const mName = reportsEngineService.getEntityLabels(t).materialName;
      map.set(t.materialId, mName);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ materialId: id, nameAr: name }));
  }, [allTrips]);

  const availableTrucks = useMemo(() => {
    const map = new Map<string, string>();
    allTrips.forEach(t => {
      const tPlate = reportsEngineService.getEntityLabels(t).truckPlate;
      map.set(t.truckId, tPlate);
    });
    return Array.from(map.entries()).map(([id, plate]) => ({ truckId: id, plateNumberAr: plate }));
  }, [allTrips]);

  const availableDrivers = useMemo(() => {
    const map = new Map<string, string>();
    allTrips.forEach(t => {
      const dName = reportsEngineService.getEntityLabels(t).driverName;
      map.set(t.driverId, dName);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ driverId: id, fullNameAr: name }));
  }, [allTrips]);

  // Distinct supervisors list extracted from trips
  const availableSupervisors = useMemo(() => {
    const list = new Set<string>();
    allTrips.forEach(t => {
      if (t.loaderId) list.add(t.loaderId);
      if (t.unloaderId) list.add(t.unloaderId);
      if (t.createdBy) list.add(t.createdBy);
      if (t.updatedBy) list.add(t.updatedBy);
    });
    return Array.from(list);
  }, [allTrips]);

  // Generate current active dataset
  const currentDataset = useMemo(() => {
    return reportsEngineService.generateReport(selectedReportType, filters);
  }, [selectedReportType, filters, allTrips]);

  // Filter rows by table search
  const filteredRows = useMemo(() => {
    if (!tableSearch.trim()) return currentDataset.rows;
    const query = tableSearch.toLowerCase();
    return currentDataset.rows.filter(r => {
      return Object.values(r).some(val => 
        val !== undefined && val !== null && String(val).toLowerCase().includes(query)
      );
    });
  }, [currentDataset.rows, tableSearch]);

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.projectId !== 'ALL') count++;
    if (filters.shiftDateFrom) count++;
    if (filters.shiftDateTo) count++;
    if (filters.shift && filters.shift !== 'ALL') count++;
    if (filters.carrierId !== 'ALL') count++;
    if (filters.materialId !== 'ALL') count++;
    if (filters.pricingType !== 'ALL') count++;
    if (filters.status !== 'ALL') count++;
    if (filters.sourceType && filters.sourceType !== 'ALL') count++;
    if (filters.truckId !== 'ALL') count++;
    if (filters.driverId !== 'ALL') count++;
    if (filters.supervisorId !== 'ALL') count++;
    return count;
  }, [filters]);

  const handleResetFilters = () => {
    setFilters({
      projectId: 'ALL',
      shiftDateFrom: '',
      shiftDateTo: '',
      shift: 'ALL',
      carrierId: 'ALL',
      materialId: 'ALL',
      pricingType: 'ALL',
      status: 'ALL',
      sourceType: 'ALL',
      truckId: 'ALL',
      driverId: 'ALL',
      supervisorId: 'ALL',
    });
    setTableSearch('');
  };

  const handleExportCSV = () => {
    reportsEngineService.exportToCSV(currentDataset);
  };

  const handleExportXLSX = () => {
    reportsEngineService.exportToXLSX(currentDataset);
  };

  // Icon mapping helper
  const renderReportIcon = (iconName: string, className = 'w-4 h-4') => {
    switch (iconName) {
      case 'Calendar': return <Calendar className={className} />;
      case 'Clock': return <Clock className={className} />;
      case 'Truck': return <Truck className={className} />;
      case 'Layers': return <Layers className={className} />;
      case 'Gauge': return <Gauge className={className} />;
      case 'Scale': return <Scale className={className} />;
      case 'RotateCcw': return <RotateCcw className={className} />;
      case 'AlertTriangle': return <AlertTriangle className={className} />;
      case 'Building2': return <Building2 className={className} />;
      case 'PieChart': return <PieChart className={className} />;
      case 'Package': return <Package className={className} />;
      case 'Hash': return <Hash className={className} />;
      case 'Calculator': return <Calculator className={className} />;
      case 'Banknote': return <Banknote className={className} />;
      default: return <FileText className={className} />;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header Banner & Authoritative Invariance Guarantee */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-700">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                  <span>محرك التقارير اللوجستية والمالية (Reports Engine)</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                    15 تقريراً معتمداً
                  </span>
                </h1>
                <p className="text-xs text-stone-500 mt-0.5">
                  منظومة التقارير التشغيلية والمالية الشاملة المدعومة بضمانة ثبات لقطات التسعير التعاقدية (Snapshot Invariance).
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Snapshot Invariance Badge */}
            <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-950 flex items-start gap-2.5 max-w-md">
              <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">قاعدة الثبات التعاقدي (Snapshot Invariance):</span>
                <p className="text-[11px] text-amber-900 mt-0.5 leading-relaxed">
                  تعتمد التقارير حصرياً على <code className="bg-white px-1 py-0.2 rounded font-mono font-bold text-amber-950">settlementAmount</code> المحفوظ في كل رحلة، وتمنع قطيعاً إعادة تسعير الرحلات التاريخية بالأسعار الحالية.
                </p>
              </div>
            </div>

            {/* Run Automated Tests Button */}
            <button
              id="btn-run-reports-tests"
              onClick={() => {
                setTestResults(runReportsEngineTests());
                setIsTestModalOpen(true);
              }}
              className="flex items-center gap-2 px-3.5 py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer h-full"
              title="تشغيل 9 اختبارات امتثال آلية لقواعد التقارير والتسعير"
            >
              <Play className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>فحص الامتثال الآلي ({testResults.passedTests}/{testResults.totalTests})</span>
            </button>
          </div>
        </div>

        {/* Category Switcher Tabs */}
        <div className="flex items-center gap-3 mt-6 border-t border-stone-100 pt-4">
          <button
            id="tab-operational-reports"
            onClick={() => {
              setActiveCategory('OPERATIONAL');
              setSelectedReportType('DAILY_OPERATIONS');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeCategory === 'OPERATIONAL'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>تقارير التشغيل (9 تقارير)</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] ${activeCategory === 'OPERATIONAL' ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-700'}`}>
              Operational
            </span>
          </button>

          <button
            id="tab-pricing-reports"
            onClick={() => {
              setActiveCategory('PRICING');
              setSelectedReportType('SETTLEMENT_BY_CARRIER');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeCategory === 'PRICING'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            <Banknote className="w-4 h-4" />
            <span>تقارير التسعير والتسويات (7 تقارير)</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] ${activeCategory === 'PRICING' ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-700'}`}>
              Financial
            </span>
          </button>
        </div>

        {/* Report Selector Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2 mt-3">
          {activeCategory === 'OPERATIONAL' &&
            Object.values(OPERATIONAL_REPORTS_METADATA).map((rep) => {
              const isSelected = selectedReportType === rep.type;
              return (
                <button
                  key={rep.type}
                  onClick={() => setSelectedReportType(rep.type)}
                  className={`flex flex-col items-center text-center p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500 text-amber-950 font-bold shadow-2xs'
                      : 'bg-stone-50/70 border-stone-200 text-stone-700 hover:bg-stone-100 hover:border-stone-300'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg mb-1.5 ${isSelected ? 'bg-amber-500 text-white' : 'bg-stone-200 text-stone-600'}`}>
                    {renderReportIcon(rep.iconName, 'w-3.5 h-3.5')}
                  </div>
                  <span className="text-[11px] line-clamp-1">{rep.titleAr}</span>
                </button>
              );
            })}

          {activeCategory === 'PRICING' &&
            Object.values(PRICING_REPORTS_METADATA).map((rep) => {
              const isSelected = selectedReportType === rep.type;
              return (
                <button
                  key={rep.type}
                  onClick={() => setSelectedReportType(rep.type)}
                  className={`flex flex-col items-center text-center p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500 text-amber-950 font-bold shadow-2xs'
                      : 'bg-stone-50/70 border-stone-200 text-stone-700 hover:bg-stone-100 hover:border-stone-300'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg mb-1.5 ${isSelected ? 'bg-amber-600 text-white' : 'bg-stone-200 text-stone-600'}`}>
                    {renderReportIcon(rep.iconName, 'w-3.5 h-3.5')}
                  </div>
                  <span className="text-[11px] line-clamp-1">{rep.titleAr}</span>
                </button>
              );
            })}
        </div>
      </div>

      {/* 2. Comprehensive Filter Engine Bar (Multi-Parameter Filter Engine) */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-stone-700" />
            <h2 className="text-sm font-bold text-stone-900">محرك الفلاتر والتقسيم (Multi-Parameter Filter Engine)</h2>
            {activeFilterCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">
                {activeFilterCount} نشط
              </span>
            )}
          </div>
          {activeFilterCount > 0 && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>إعادة ضبط الفلاتر</span>
            </button>
          )}
        </div>

        {/* Filter Selectors Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          
          {/* 1. Project */}
          <div>
            <label className="block text-[11px] font-bold text-stone-600 mb-1">المشروع (Project)</label>
            <select
              value={filters.projectId}
              onChange={(e) => setFilters(prev => ({ ...prev, projectId: e.target.value }))}
              className="w-full text-xs bg-stone-50 border border-stone-200 rounded-lg p-2 focus:ring-1 focus:ring-amber-500 text-stone-800"
            >
              <option value="ALL">كافة المشاريع (All Projects)</option>
              {availableProjects.map(p => (
                <option key={p.projectId} value={p.projectId}>{p.nameAr}</option>
              ))}
            </select>
          </div>

          {/* 2. Shift Date From & To */}
          <div>
            <label className="block text-[11px] font-bold text-stone-600 mb-1">تاريخ التشغيل من (From)</label>
            <input
              type="date"
              value={filters.shiftDateFrom || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, shiftDateFrom: e.target.value }))}
              className="w-full text-xs bg-stone-50 border border-stone-200 rounded-lg p-2 focus:ring-1 focus:ring-amber-500 text-stone-800"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-stone-600 mb-1">تاريخ التشغيل إلى (To)</label>
            <input
              type="date"
              value={filters.shiftDateTo || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, shiftDateTo: e.target.value }))}
              className="w-full text-xs bg-stone-50 border border-stone-200 rounded-lg p-2 focus:ring-1 focus:ring-amber-500 text-stone-800"
            />
          </div>

          {/* Shift Filter */}
          <div>
            <label className="block text-[11px] font-bold text-stone-600 mb-1">الوردية (Shift)</label>
            <select
              value={filters.shift || 'ALL'}
              onChange={(e) => setFilters(prev => ({ ...prev, shift: e.target.value as any }))}
              className="w-full text-xs bg-stone-50 border border-stone-200 rounded-lg p-2 focus:ring-1 focus:ring-amber-500 text-stone-800"
            >
              <option value="ALL">كافة الورديات (All Shifts)</option>
              <option value="MORNING">الصباحية (06:00 - 14:00)</option>
              <option value="EVENING">المسائية (14:00 - 22:00)</option>
              <option value="NIGHT">الليلية (22:00 - 06:00)</option>
            </select>
          </div>

          {/* 3. Carrier */}
          <div>
            <label className="block text-[11px] font-bold text-stone-600 mb-1">الناقل (Carrier)</label>
            <select
              value={filters.carrierId}
              onChange={(e) => setFilters(prev => ({ ...prev, carrierId: e.target.value }))}
              className="w-full text-xs bg-stone-50 border border-stone-200 rounded-lg p-2 focus:ring-1 focus:ring-amber-500 text-stone-800"
            >
              <option value="ALL">كافة الناقلين (All Carriers)</option>
              {availableCarriers.map(c => (
                <option key={c.carrierId} value={c.carrierId}>{c.nameAr}</option>
              ))}
            </select>
          </div>

          {/* 4. Material */}
          <div>
            <label className="block text-[11px] font-bold text-stone-600 mb-1">المادة (Material)</label>
            <select
              value={filters.materialId}
              onChange={(e) => setFilters(prev => ({ ...prev, materialId: e.target.value }))}
              className="w-full text-xs bg-stone-50 border border-stone-200 rounded-lg p-2 focus:ring-1 focus:ring-amber-500 text-stone-800"
            >
              <option value="ALL">كافة المواد (All Materials)</option>
              {availableMaterials.map(m => (
                <option key={m.materialId} value={m.materialId}>{m.nameAr}</option>
              ))}
            </select>
          </div>

          {/* 5. Pricing Type */}
          <div>
            <label className="block text-[11px] font-bold text-stone-600 mb-1">نوع التسعير (Pricing Type)</label>
            <select
              value={filters.pricingType}
              onChange={(e) => setFilters(prev => ({ ...prev, pricingType: e.target.value as any }))}
              className="w-full text-xs bg-stone-50 border border-stone-200 rounded-lg p-2 focus:ring-1 focus:ring-amber-500 text-stone-800 font-medium"
            >
              <option value="ALL">كافة النماذج (All Models)</option>
              <option value="PER_TON">بالوزن / الطن (PER_TON)</option>
              <option value="PER_TRIP">بالمقطوعية / الرد (PER_TRIP)</option>
            </select>
          </div>

          {/* 6. Status */}
          <div>
            <label className="block text-[11px] font-bold text-stone-600 mb-1">حالة الرحلة (Status)</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
              className="w-full text-xs bg-stone-50 border border-stone-200 rounded-lg p-2 focus:ring-1 focus:ring-amber-500 text-stone-800"
            >
              <option value="ALL">كافة الحالات (All Statuses)</option>
              <option value="COMPLETED">مكتملة (COMPLETED)</option>
              <option value="IN_TRANSIT">قيد النقل (IN_TRANSIT)</option>
              <option value="UNLOADING">قيد التفريغ (UNLOADING)</option>
              <option value="ARRIVED">وصلت للموقع (ARRIVED)</option>
              <option value="LOADED">تم التحميل (LOADED)</option>
              <option value="RETURNED">مرتجعة ومرفوضة (RETURNED)</option>
              <option value="EXCEPTION">استثناء نشط (EXCEPTION)</option>
              <option value="DRAFT">مسودة (DRAFT)</option>
            </select>
          </div>

          {/* Source Type Filter */}
          <div>
            <label className="block text-[11px] font-bold text-stone-600 mb-1">مصدر العملية (Source Type)</label>
            <select
              value={filters.sourceType || 'ALL'}
              onChange={(e) => setFilters(prev => ({ ...prev, sourceType: e.target.value as any }))}
              className="w-full text-xs bg-stone-50 border border-stone-200 rounded-lg p-2 focus:ring-1 focus:ring-amber-500 text-stone-800 font-medium"
            >
              <option value="ALL">كافة المصادر (All Sources)</option>
              <option value="WEIGHBRIDGE">ميزان إلكتروني (WEIGHBRIDGE)</option>
              <option value="MANUAL">إدخال يدوي (MANUAL)</option>
              <option value="EXCEL">استيراد إكسل (EXCEL)</option>
              <option value="CSV">ملف نصي (CSV)</option>
              <option value="GOOGLE_SHEETS">جداول جوجل (GOOGLE_SHEETS)</option>
              <option value="GOOGLE_DRIVE">سحابة درايف (GOOGLE_DRIVE)</option>
              <option value="API">ربط برمجي (API)</option>
              <option value="MIGRATION">ترحيل تاريخي (MIGRATION)</option>
            </select>
          </div>

          {/* 7. Truck */}
          <div>
            <label className="block text-[11px] font-bold text-stone-600 mb-1">الشاحنة (Truck)</label>
            <select
              value={filters.truckId}
              onChange={(e) => setFilters(prev => ({ ...prev, truckId: e.target.value }))}
              className="w-full text-xs bg-stone-50 border border-stone-200 rounded-lg p-2 focus:ring-1 focus:ring-amber-500 text-stone-800"
            >
              <option value="ALL">كافة الشاحنات (All Trucks)</option>
              {availableTrucks.map(t => (
                <option key={t.truckId} value={t.truckId}>{t.plateNumberAr}</option>
              ))}
            </select>
          </div>

          {/* 8. Driver */}
          <div>
            <label className="block text-[11px] font-bold text-stone-600 mb-1">السائق (Driver)</label>
            <select
              value={filters.driverId}
              onChange={(e) => setFilters(prev => ({ ...prev, driverId: e.target.value }))}
              className="w-full text-xs bg-stone-50 border border-stone-200 rounded-lg p-2 focus:ring-1 focus:ring-amber-500 text-stone-800"
            >
              <option value="ALL">كافة السائقين (All Drivers)</option>
              {availableDrivers.map(d => (
                <option key={d.driverId} value={d.driverId}>{d.fullNameAr}</option>
              ))}
            </select>
          </div>

          {/* 9. Supervisor */}
          <div>
            <label className="block text-[11px] font-bold text-stone-600 mb-1">المشرف / مسؤول الميزان (Supervisor)</label>
            <select
              value={filters.supervisorId}
              onChange={(e) => setFilters(prev => ({ ...prev, supervisorId: e.target.value }))}
              className="w-full text-xs bg-stone-50 border border-stone-200 rounded-lg p-2 focus:ring-1 focus:ring-amber-500 text-stone-800"
            >
              <option value="ALL">كافة المشرفين (All Supervisors)</option>
              {availableSupervisors.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* 3. Authoritative Financial KPI Cards (Gross, Adjustments, Exceptions, Net) */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        
        {/* Gross Amount */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <div className="text-[11px] font-bold text-stone-500">المبلغ الإجمالي الأصلي (Gross)</div>
          <div className="text-xl font-black text-stone-900 mt-1 font-mono">
            {currentDataset.summary.grossAmountSAR.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-stone-400 mt-0.5">SAR • من لقطة التسعير</div>
        </div>

        {/* Adjustments */}
        <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200 shadow-xs">
          <div className="text-[11px] font-bold text-emerald-800">التعديلات (Adjustments)</div>
          <div className="text-xl font-black text-emerald-900 mt-1 font-mono">
            +{currentDataset.summary.adjustmentsSAR.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-emerald-700 mt-0.5">SAR • بدلات وتسامح موازين</div>
        </div>

        {/* Exceptions & Deductions */}
        <div className="bg-rose-50/60 p-4 rounded-2xl border border-rose-200 shadow-xs">
          <div className="text-[11px] font-bold text-rose-800">الاستثناءات والخصومات (Exceptions)</div>
          <div className="text-xl font-black text-rose-900 mt-1 font-mono">
            -{currentDataset.summary.exceptionsSAR.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-rose-700 mt-0.5">SAR • جزاءات وعجز أوزان</div>
        </div>

        {/* Net Amount */}
        <div className="bg-amber-500/10 p-4 rounded-2xl border-2 border-amber-500 shadow-xs">
          <div className="text-[11px] font-bold text-amber-900">صافي المستحق النهائي (Net Amount)</div>
          <div className="text-2xl font-black text-amber-950 mt-1 font-mono">
            {currentDataset.summary.netAmountSAR.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-amber-800 font-bold mt-0.5">SAR • Net Payable</div>
        </div>

        {/* Total Trips */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <div className="text-[11px] font-bold text-stone-500">إجمالي الردود / الرحلات</div>
          <div className="text-xl font-black text-stone-900 mt-1 font-mono">
            {currentDataset.summary.totalTrips}
          </div>
          <div className="text-[10px] text-stone-400 mt-0.5">
            {currentDataset.summary.pricedTrips ?? currentDataset.summary.totalTrips} معتمدة
            {currentDataset.summary.pendingSettlementTrips ? (
              <span className="text-amber-700 font-bold mr-1">• {currentDataset.summary.pendingSettlementTrips} معلقة</span>
            ) : ''}
          </div>
        </div>

        {/* Total Metric Tons */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <div className="text-[11px] font-bold text-stone-500">إجمالي الأوزان المنقولة</div>
          <div className="text-xl font-black text-stone-900 mt-1 font-mono">
            {currentDataset.summary.totalNetWeightTons.toLocaleString()}
          </div>
          <div className="text-[10px] text-stone-400 mt-0.5">طن متري (Metric Tons)</div>
        </div>

      </div>

      {/* 3.1 Pending Settlement Isolation Banner */}
      {currentDataset.summary.pendingSettlementTrips > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start sm:items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <div className="text-xs font-bold">عزل الرحلات معلقة التسعير (Pending Settlement Isolation):</div>
              <div className="text-[11px] text-amber-900 mt-0.5 leading-relaxed">
                يوجد <strong className="font-mono">{currentDataset.summary.pendingSettlementTrips}</strong> رحلة مسجلة تشغيلياً دون تعتيم ولكن تسعيرها معلق بانتظار اعتماد العقد. تم عزلها بالكامل من صافي المستحق النهائي (0.00 ر.س لا تعني سعراً نهائياً).
              </div>
            </div>
          </div>
          <div className="shrink-0 bg-amber-200/70 border border-amber-300 text-amber-950 text-xs px-3 py-1.5 rounded-xl font-bold font-mono">
            التسوية النهائية المعتمدة: {currentDataset.summary.finalSettlementAmount.toLocaleString()} ر.س
          </div>
        </div>
      )}

      {/* 4. Active Report Title & Actions Toolbar */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <span>{currentDataset.titleAr}</span>
              <span className="text-xs text-stone-400 font-mono font-normal">({currentDataset.titleEn})</span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">{currentDataset.descriptionAr}</p>
          </div>

          {/* Export and Print Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              id="btn-export-csv"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-all border border-stone-200 shadow-2xs cursor-pointer"
              title="تصدير بيانات التقرير بتنسيق CSV مع دعم UTF-8 BOM"
            >
              <Download className="w-3.5 h-3.5 text-stone-600" />
              <span>تصدير CSV</span>
            </button>

            <button
              id="btn-export-xlsx"
              onClick={handleExportXLSX}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
              title="تصدير تقرير إكسل رسمي (.xlsx) مهيأ بالخلايا العربية والترويسة"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>تصدير Excel (XLSX)</span>
            </button>

            <button
              id="btn-print-pdf"
              onClick={() => setIsPrintModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-stone-950 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              title="معاينة وطباعة المستند الرسمي المعتمد وتصدير PDF"
            >
              <Printer className="w-4 h-4" />
              <span>معاينة وطباعة PDF</span>
            </button>
          </div>
        </div>

        {/* Quick Search Within Current Table */}
        <div className="flex items-center justify-between gap-3 border-t border-stone-100 pt-3">
          <div className="relative w-full max-w-xs">
            <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-stone-400" />
            <input
              type="text"
              placeholder="بحث في نتائج التقرير الحالية..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className="w-full text-xs bg-stone-50 border border-stone-200 rounded-lg pr-8 pl-3 py-1.5 focus:ring-1 focus:ring-amber-500 text-stone-800"
            />
          </div>

          <div className="text-xs text-stone-500 font-mono">
            عرض {filteredRows.length} من أصل {currentDataset.rows.length} سجل
          </div>
        </div>

        {/* Table Rendering */}
        <div className="overflow-x-auto border border-stone-200 rounded-xl">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-stone-50 text-stone-700 font-bold border-b border-stone-200">
                <th className="p-3 text-center w-12 text-stone-500">#</th>
                {currentDataset.columns.map((c) => (
                  <th 
                    key={c.key} 
                    className={`p-3 border-l border-stone-200/60 ${
                      c.align === 'center' ? 'text-center' : c.align === 'left' ? 'text-left' : 'text-right'
                    }`}
                  >
                    {c.labelAr}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={currentDataset.columns.length + 1} className="p-8 text-center text-stone-500">
                    <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto mb-2 opacity-80" />
                    <p className="font-semibold">لا توجد سجلات تطابق الفلاتر المحددة</p>
                    <p className="text-[11px] text-stone-400 mt-1">جرب تغيير معايير الفلترة أو الضغط على "إعادة ضبط الفلاتر"</p>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-stone-50/80 transition-colors">
                    <td className="p-3 text-center text-stone-400 font-mono text-[11px] border-l border-stone-100">
                      {idx + 1}
                    </td>
                    {currentDataset.columns.map((col) => {
                      const val = row[col.key];
                      return (
                        <td 
                          key={col.key} 
                          className={`p-3 border-l border-stone-100 ${
                            col.align === 'center' ? 'text-center' : col.align === 'left' ? 'text-left font-mono font-semibold' : 'text-right'
                          }`}
                        >
                          {col.format === 'currency' && typeof val === 'number' ? (
                            <span className="text-stone-900 font-bold">
                              {val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          ) : col.format === 'number' && typeof val === 'number' ? (
                            <span className="font-semibold text-stone-800">
                              {val.toLocaleString()}
                            </span>
                          ) : col.format === 'badge' ? (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              String(val).includes('مطابق') ? 'bg-emerald-100 text-emerald-800' :
                              String(val).includes('عجز') || String(val).includes('CRITICAL') || String(val).includes('BLOCKING') ? 'bg-rose-100 text-rose-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {String(val)}
                            </span>
                          ) : col.format === 'percent' ? (
                            <span className="font-bold text-emerald-800">
                              {val}%
                            </span>
                          ) : (
                            <span className="text-stone-800">
                              {val !== undefined && val !== null ? String(val) : '-'}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Notes */}
        {currentDataset.notes && (
          <div className="flex items-center gap-2 text-xs text-stone-500 bg-stone-50 p-3 rounded-xl border border-stone-200">
            <Info className="w-4 h-4 text-stone-400 shrink-0" />
            <span>{currentDataset.notes}</span>
          </div>
        )}
      </div>

      {/* 5. Printable PDF Modal */}
      {isPrintModalOpen && (
        <PrintableReportModal
          dataset={currentDataset}
          onClose={() => setIsPrintModalOpen(false)}
        />
      )}

      {/* 6. Automated Test Suite Results Modal */}
      {isTestModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-stone-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-stone-900 text-white">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <span className="font-bold text-sm">نتائج فحص الامتثال الآلي لمحرك التقارير (Compliance Test Suite)</span>
              </div>
              <button
                onClick={() => setIsTestModalOpen(false)}
                className="p-1 text-stone-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Test Summary Banner */}
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
                      {testResults.allPassed ? 'كافة الاختبارات ناجحة بنسبة 100%' : 'توجد إخفاقات في بعض الاختبارات'}
                    </h4>
                    <p className="text-xs text-stone-600 mt-0.5">
                      تم اجتياز {testResults.passedTests} من أصل {testResults.totalTests} اختباراً لسلامة معادلات PER_TRIP، PER_TON، وتوليد التقارير الـ 15 وثبات اللقطة.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setTestResults(runReportsEngineTests())}
                  className="px-3.5 py-1.5 bg-white border border-stone-300 text-stone-800 rounded-lg text-xs font-bold hover:bg-stone-50 cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>إعادة الفحص</span>
                </button>
              </div>

              {/* Individual Test Cases List */}
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

            {/* Modal Footer */}
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
