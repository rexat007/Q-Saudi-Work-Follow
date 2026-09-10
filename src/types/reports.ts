import { TripEngineStatus, TripPricingType, TripRecord } from './tripEngine';

export type ReportCategory = 'OPERATIONAL' | 'PRICING';

export type OperationalReportType =
  | 'DAILY_OPERATIONS'
  | 'SHIFT_OPERATIONS'
  | 'CARRIER_PERFORMANCE'
  | 'MATERIAL_MOVEMENT'
  | 'TRUCK_UTILIZATION'
  | 'WEIGHT_VARIANCE'
  | 'RETURNED_TRIPS'
  | 'EXCEPTION_REPORT';

export type PricingReportType =
  | 'SETTLEMENT_BY_CARRIER'
  | 'SETTLEMENT_BY_PRICING_TYPE'
  | 'SETTLEMENT_BY_MATERIAL'
  | 'TRIP_BASED_SETTLEMENT'
  | 'TON_BASED_SETTLEMENT'
  | 'DAILY_SETTLEMENT'
  | 'PROJECT_SETTLEMENT_SUMMARY';

export type ReportType = OperationalReportType | PricingReportType;

export interface ReportFilterParams {
  projectId: string; // 'ALL' or specific ID
  shiftDateFrom?: string; // YYYY-MM-DD
  shiftDateTo?: string; // YYYY-MM-DD
  carrierId?: string; // 'ALL' or ID
  materialId?: string; // 'ALL' or ID
  pricingType?: 'ALL' | TripPricingType;
  status?: 'ALL' | TripEngineStatus;
  truckId?: string; // 'ALL' or ID
  driverId?: string; // 'ALL' or ID
  supervisorId?: string; // 'ALL' or ID (matched against loaderId, unloaderId, createdBy)
}

export interface ReportFinancialSummary {
  grossAmountSAR: number;
  adjustmentsSAR: number;
  exceptionsSAR: number;
  netAmountSAR: number;
  totalTrips: number;
  totalNetWeightKg: number;
  totalNetWeightTons: number;
  completedTripsCount: number;
  exceptionsCount: number;
  returnedTripsCount: number;
}

export interface ReportColumnDef {
  key: string;
  labelAr: string;
  labelEn: string;
  align?: 'right' | 'left' | 'center';
  format?: 'currency' | 'number' | 'percent' | 'date' | 'badge' | 'text';
}

export interface ReportDataset {
  reportType: ReportType;
  category: ReportCategory;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  generatedAt: string;
  filtersApplied: ReportFilterParams;
  summary: ReportFinancialSummary;
  columns: ReportColumnDef[];
  rows: Record<string, any>[];
  notes?: string;
}

export interface ReportMetaDefinition {
  type: ReportType;
  category: ReportCategory;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  iconName: string;
  primaryMetricLabel: string;
}

export const OPERATIONAL_REPORTS_METADATA: Record<OperationalReportType, ReportMetaDefinition> = {
  DAILY_OPERATIONS: {
    type: 'DAILY_OPERATIONS',
    category: 'OPERATIONAL',
    titleAr: 'العمليات اليومية',
    titleEn: 'Daily Operations',
    descriptionAr: 'حصر شامل للرحلات اليومية والأوزان المنقولة ونسب الإنجاز لكل تاريخ تشغيل',
    iconName: 'Calendar',
    primaryMetricLabel: 'إجمالي الرحلات اليومية',
  },
  SHIFT_OPERATIONS: {
    type: 'SHIFT_OPERATIONS',
    category: 'OPERATIONAL',
    titleAr: 'عمليات الورديات',
    titleEn: 'Shift Operations',
    descriptionAr: 'توزيع حركة النقل والشحن حسب ورديات العمل (صباحية، مسائية، ليلية) ومعدلات الإنتاجية',
    iconName: 'Clock',
    primaryMetricLabel: 'الإنتاجية حسب الوردية',
  },
  CARRIER_PERFORMANCE: {
    type: 'CARRIER_PERFORMANCE',
    category: 'OPERATIONAL',
    titleAr: 'أداء الناقلين',
    titleEn: 'Carrier Performance',
    descriptionAr: 'تقييم كفاءة أساطيل الناقلين، الالتزام بالأوزان النظامية، ونسب إكمال النقل بدون استثناءات',
    iconName: 'Truck',
    primaryMetricLabel: 'معدل إنجاز الناقل',
  },
  MATERIAL_MOVEMENT: {
    type: 'MATERIAL_MOVEMENT',
    category: 'OPERATIONAL',
    titleAr: 'حركة المواد والكميات',
    titleEn: 'Material Movement',
    descriptionAr: 'تتبع حركة المواد الموردة بالأطنان والردود ومطابقة التوريدات بالمشاريع',
    iconName: 'Layers',
    primaryMetricLabel: 'إجمالي الأطنان الموردة',
  },
  TRUCK_UTILIZATION: {
    type: 'TRUCK_UTILIZATION',
    category: 'OPERATIONAL',
    titleAr: 'معدل استغلال الشاحنات',
    titleEn: 'Truck Utilization',
    descriptionAr: 'كفاءة الحمولة للشاحنات مقارنة بالحمولة النظامية المسموحة وتكرار الرحلات',
    iconName: 'Gauge',
    primaryMetricLabel: 'نسبة استغلال الحمولة',
  },
  WEIGHT_VARIANCE: {
    type: 'WEIGHT_VARIANCE',
    category: 'OPERATIONAL',
    titleAr: 'فروقات الموازين',
    titleEn: 'Weight Variance',
    descriptionAr: 'مقارنة دقيقة بين وزن المصدر ووزن المقصد واحتساب نسبة العجز والزيادة والحدود المسموحة',
    iconName: 'Scale',
    primaryMetricLabel: 'صافي الفروقات الموزنية (كجم)',
  },
  RETURNED_TRIPS: {
    type: 'RETURNED_TRIPS',
    category: 'OPERATIONAL',
    titleAr: 'الرحلات المرتجعة والمرفوضة',
    titleEn: 'Returned Trips',
    descriptionAr: 'حصر الرحلات التي تم إرجاعها أو رفضها مع أسباب الرفض ومسؤولي التوجيه بالموقع',
    iconName: 'RotateCcw',
    primaryMetricLabel: 'إجمالي الرحلات المرتجعة',
  },
  EXCEPTION_REPORT: {
    type: 'EXCEPTION_REPORT',
    category: 'OPERATIONAL',
    titleAr: 'تقرير الاستثناءات',
    titleEn: 'Exception Report',
    descriptionAr: 'تحليل حالات عدم المطابقة الـ 12 وحالات التدقيق والتسوية التشغيلية',
    iconName: 'AlertTriangle',
    primaryMetricLabel: 'عدد حالات الاستثناء المفتوحة',
  },
};

export const PRICING_REPORTS_METADATA: Record<PricingReportType, ReportMetaDefinition> = {
  SETTLEMENT_BY_CARRIER: {
    type: 'SETTLEMENT_BY_CARRIER',
    category: 'PRICING',
    titleAr: 'تسوية ومستحقات الناقلين',
    titleEn: 'Settlement by Carrier',
    descriptionAr: 'مستحقات الناقلين المعتمدة بناءً على لقطات التسعير التعاقدية للرحلات والتسويات المطبقة',
    iconName: 'Building2',
    primaryMetricLabel: 'صافي مستحق الناقلين (SAR)',
  },
  SETTLEMENT_BY_PRICING_TYPE: {
    type: 'SETTLEMENT_BY_PRICING_TYPE',
    category: 'PRICING',
    titleAr: 'التسوية حسب نوع التسعير',
    titleEn: 'Settlement by Pricing Type',
    descriptionAr: 'مقارنة مالية بين عقود النقل بالطن (PER_TON) وعقود النقل بالرد المقطوع (PER_TRIP)',
    iconName: 'PieChart',
    primaryMetricLabel: 'التوزيع المالي للنماذج',
  },
  SETTLEMENT_BY_MATERIAL: {
    type: 'SETTLEMENT_BY_MATERIAL',
    category: 'PRICING',
    titleAr: 'التسوية حسب نوع المادة',
    titleEn: 'Settlement by Material',
    descriptionAr: 'تكاليف النقل الإجمالية الموزعة على المواد المختلفة ومتوسط تكلفة طن التوريد',
    iconName: 'Package',
    primaryMetricLabel: 'تكلفة النقل لكل مادة (SAR)',
  },
  TRIP_BASED_SETTLEMENT: {
    type: 'TRIP_BASED_SETTLEMENT',
    category: 'PRICING',
    titleAr: 'تسويات الرحلات المقطوعة (PER_TRIP)',
    titleEn: 'Trip-based Settlement',
    descriptionAr: 'تدقيق رحلات الرد المقطوع وفق المعادلة: المبلغ = عدد الرحلات × سعر الرحلة',
    iconName: 'Hash',
    primaryMetricLabel: 'مستحقات رحلات الرد المقطوع (SAR)',
  },
  TON_BASED_SETTLEMENT: {
    type: 'TON_BASED_SETTLEMENT',
    category: 'PRICING',
    titleAr: 'تسويات الأوزان والأطنان (PER_TON)',
    titleEn: 'Ton-based Settlement',
    descriptionAr: 'تدقيق رحلات الطن المتري وفق المعادلة: المبلغ = مجموع صافي الأطنان × سعر الطن',
    iconName: 'Calculator',
    primaryMetricLabel: 'مستحقات رحلات الطن (SAR)',
  },
  DAILY_SETTLEMENT: {
    type: 'DAILY_SETTLEMENT',
    category: 'PRICING',
    titleAr: 'التسوية اليومية',
    titleEn: 'Daily Settlement',
    descriptionAr: 'التدفقات المالية اليومية والالتزامات التعاقدية اليومية للعمليات اللوجستية',
    iconName: 'Banknote',
    primaryMetricLabel: 'المستحق اليومي التراكمي (SAR)',
  },
  PROJECT_SETTLEMENT_SUMMARY: {
    type: 'PROJECT_SETTLEMENT_SUMMARY',
    category: 'PRICING',
    titleAr: 'ملخص التسوية الشامل للمشاريع',
    titleEn: 'Project Settlement Summary',
    descriptionAr: 'تقرير مالي تنفيذي شامل يوضح Gross Amount و Adjustments و Exceptions و Net Amount',
    iconName: 'FileText',
    primaryMetricLabel: 'صافي مستحق المشاريع (SAR)',
  },
};
