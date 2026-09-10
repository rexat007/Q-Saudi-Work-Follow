import React from 'react';
import { Filter, RotateCcw, Building2, Calendar, Truck, Layers, Calculator } from 'lucide-react';
import { DashboardFilterParams, UserSecurityProfile } from '../../types/dashboard';
import { ProjectEntity } from '../../types/entities';
import { DEFAULT_CARRIERS, DEFAULT_MATERIALS } from '../../data/defaultMasterData';

interface WidgetFilterBarProps {
  filters: DashboardFilterParams;
  onFilterChange: (newFilters: DashboardFilterParams) => void;
  authorizedProjects: ProjectEntity[];
  userProfile: UserSecurityProfile;
  isCustomized?: boolean;
  onResetToGlobal?: () => void;
  compact?: boolean;
}

export const WidgetFilterBar: React.FC<WidgetFilterBarProps> = ({
  filters,
  onFilterChange,
  authorizedProjects,
  userProfile,
  isCustomized = false,
  onResetToGlobal,
  compact = true,
}) => {
  const handleChange = (key: keyof DashboardFilterParams, value: any) => {
    onFilterChange({
      ...filters,
      [key]: value,
    });
  };

  return (
    <div className={`rounded-xl border p-3 transition-all ${
      isCustomized 
        ? 'bg-amber-500/5 border-amber-300' 
        : 'bg-stone-50 border-stone-200'
    }`}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-stone-200/60 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-stone-700">
          <Filter className="w-3.5 h-3.5 text-stone-500" />
          <span>فلاتر الودجت المخصصة (Widget Filter Controls)</span>
          {isCustomized && (
            <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded font-mono font-bold">
              مخصصة
            </span>
          )}
        </div>

        {isCustomized && onResetToGlobal && (
          <button
            onClick={onResetToGlobal}
            className="flex items-center gap-1 text-[11px] text-amber-800 hover:text-amber-950 font-bold underline cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>إعادة المزامنة مع الفلاتر العامة</span>
          </button>
        )}
      </div>

      <div className={`grid gap-2 text-xs ${compact ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-5'}`}>
        {/* 1. Project Filter (Strictly limited to authorized projects) */}
        <div>
          <label className="block text-[10px] font-bold text-stone-500 mb-0.5 flex items-center gap-1">
            <Building2 className="w-2.5 h-2.5" />
            <span>المشروع</span>
          </label>
          <select
            value={filters.projectId}
            onChange={(e) => handleChange('projectId', e.target.value)}
            className="w-full bg-white border border-stone-200 rounded-lg px-2 py-1 text-xs text-stone-800 focus:border-amber-500 outline-none"
          >
            {!userProfile.isRestricted && (
              <option value="ALL">كافة المشاريع المصرحة</option>
            )}
            {authorizedProjects.map((p) => (
              <option key={p.projectId} value={p.projectId}>
                {p.nameAr}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Date Filter */}
        <div>
          <label className="block text-[10px] font-bold text-stone-500 mb-0.5 flex items-center gap-1">
            <Calendar className="w-2.5 h-2.5" />
            <span>تاريخ الوردية (Shift Date)</span>
          </label>
          <input
            type="date"
            value={filters.shiftDateFrom}
            onChange={(e) => handleChange('shiftDateFrom', e.target.value)}
            className="w-full bg-white border border-stone-200 rounded-lg px-2 py-1 text-xs text-stone-800 focus:border-amber-500 outline-none"
          />
        </div>

        {/* 3. Carrier Filter */}
        <div>
          <label className="block text-[10px] font-bold text-stone-500 mb-0.5 flex items-center gap-1">
            <Truck className="w-2.5 h-2.5" />
            <span>الناقل</span>
          </label>
          <select
            value={filters.carrierId}
            onChange={(e) => handleChange('carrierId', e.target.value)}
            className="w-full bg-white border border-stone-200 rounded-lg px-2 py-1 text-xs text-stone-800 focus:border-amber-500 outline-none"
          >
            <option value="ALL">كافة الناقلين</option>
            {DEFAULT_CARRIERS.map((c) => (
              <option key={c.carrierId} value={c.carrierId}>
                {c.companyNameAr || c.name}
              </option>
            ))}
          </select>
        </div>

        {/* 4. Material Filter */}
        <div>
          <label className="block text-[10px] font-bold text-stone-500 mb-0.5 flex items-center gap-1">
            <Layers className="w-2.5 h-2.5" />
            <span>المادة</span>
          </label>
          <select
            value={filters.materialId}
            onChange={(e) => handleChange('materialId', e.target.value)}
            className="w-full bg-white border border-stone-200 rounded-lg px-2 py-1 text-xs text-stone-800 focus:border-amber-500 outline-none"
          >
            <option value="ALL">كافة المواد</option>
            {DEFAULT_MATERIALS.map((m) => (
              <option key={m.materialId} value={m.materialId}>
                {m.nameAr || m.name}
              </option>
            ))}
          </select>
        </div>

        {/* 5. Pricing Type Filter */}
        <div>
          <label className="block text-[10px] font-bold text-stone-500 mb-0.5 flex items-center gap-1">
            <Calculator className="w-2.5 h-2.5" />
            <span>نوع التسعير</span>
          </label>
          <select
            value={filters.pricingType}
            onChange={(e) => handleChange('pricingType', e.target.value)}
            className="w-full bg-white border border-stone-200 rounded-lg px-2 py-1 text-xs text-stone-800 focus:border-amber-500 outline-none"
          >
            <option value="ALL">الكل (PER_TRIP + PER_TON)</option>
            <option value="PER_TRIP">مقطوعية بالرد (PER_TRIP)</option>
            <option value="PER_TON">بالطن المتري (PER_TON)</option>
          </select>
        </div>
      </div>
    </div>
  );
};
