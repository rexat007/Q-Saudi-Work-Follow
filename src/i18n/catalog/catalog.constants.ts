/**
 * BLOCK 41 — i18n Catalog Constants
 */

import { SemanticCategory, SpecialCaseType } from './catalog.types';

export const ALL_SEMANTIC_CATEGORIES: SemanticCategory[] = [
  'navigation',
  'dashboard',
  'authentication',
  'projects',
  'carriers',
  'trucks',
  'drivers',
  'materials',
  'trips',
  'loading',
  'unloading',
  'weighbridge',
  'imports',
  'entityResolution',
  'pricing',
  'legacyMigration',
  'reports',
  'security',
  'offline',
  'exceptions',
  'validation',
  'shared',
  'other',
];

export const CATEGORY_DESCRIPTIONS: Record<SemanticCategory, string> = {
  navigation: 'Main navigation, headers, footers, tabs, and routing controls',
  dashboard: 'Operations overview, status widgets, KPI cards, and summaries',
  authentication: 'User login, roles, permissions, and session management',
  projects: 'Project setup, configurations, and project isolation',
  carriers: 'Carrier directory, profiles, contracts, and fleet associations',
  trucks: 'Truck fleet records, plate numbers, and capacities',
  drivers: 'Driver records, licenses, contact details, and assignments',
  materials: 'Materials catalog, aggregate categories, and specifications',
  trips: 'Trip dispatch, workflow, lifecycle events, and tracking',
  loading: 'Origin site dispatch, loading confirmations, and ticket issuance',
  unloading: 'Destination receipt, unloading sign-offs, and quality checks',
  weighbridge: 'Weighbridge integration, gross/tare/net scale measurements',
  imports: 'Excel and CSV batch ingestion, mapping, validation, and commit',
  entityResolution: 'Disambiguation and matching of raw text to master entities',
  pricing: 'Contractual rules, pricing engine, settlements, and demurrage',
  legacyMigration: 'Historical data import, transformation, and audit trails',
  reports: 'Operational reports, financial statements, and exports',
  security: 'Security audit logs, access control, and Firestore rules audit',
  offline: 'PWA service worker, offline outbox, sync, and conflict resolution',
  exceptions: 'Variance detection, incident logging, and exception approval workflows',
  validation: 'Form validation, business constraint errors, and schema rules',
  shared: 'Common UI actions (Save, Cancel, Delete, Edit, Close), status badges, and units',
  other: 'Miscellaneous or uncategorized UI elements',
};

/**
 * JSX Attributes containing human-facing text
 */
export const USER_FACING_ATTRIBUTES = new Set([
  'placeholder',
  'title',
  'label',
  'aria-label',
  'aria-description',
  'alt',
  'emptyText',
  'helperText',
  'heading',
  'subheading',
  'confirmText',
  'cancelText',
  'buttonText',
  'tooltip',
  'description',
  'badgeText',
]);

/**
 * Attributes that are strictly technical or styling
 */
export const TECHNICAL_ATTRIBUTES = new Set([
  'className',
  'id',
  'key',
  'name',
  'type',
  'role',
  'dir',
  'lang',
  'href',
  'src',
  'width',
  'height',
  'style',
  'fill',
  'stroke',
  'viewBox',
  'd',
  'xmlns',
  'strokeWidth',
  'strokeLinecap',
  'strokeLinejoin',
  'tabIndex',
  'autoComplete',
  'target',
  'rel',
]);

/**
 * Protected Business tokens — must remain code/data and never translated as identifiers
 */
export const PROTECTED_BUSINESS_TOKENS = new Set([
  'projectId',
  'ticketId',
  'truckNo',
  'carrierId',
  'driverId',
  'materialId',
  'status',
  'pricingType',
  'sourceType',
  'settlementBase',
  'grossWeight',
  'tareWeight',
  'netWeight',
  'effectiveDate',
  'expiryDate',
  'ratePerTon',
  'ratePerTrip',
  'demurrageRatePerHour',
  'varianceWeight',
  'settlementAmount',
  'contractRef',
  'sourceSystem',
  'batchId',
  'outboxId',
]);

/**
 * Protected internal unit and currency codes
 */
export const PROTECTED_UNIT_CURRENCY_CODES = ['KG', 'TON', 'SAR', 'USD', 'EUR'] as const;

/**
 * Known presentation strings for units & currencies
 */
export const PRESENTATION_UNIT_CURRENCY_MAP: Record<string, { internalCode: string; type: 'unit' | 'currency' }> = {
  'كجم': { internalCode: 'KG', type: 'unit' },
  'كيلوغرام': { internalCode: 'KG', type: 'unit' },
  'طن': { internalCode: 'TON', type: 'unit' },
  'ر.س': { internalCode: 'SAR', type: 'currency' },
  'ريال': { internalCode: 'SAR', type: 'currency' },
  'SAR': { internalCode: 'SAR', type: 'currency' },
  'kg': { internalCode: 'KG', type: 'unit' },
  'ton': { internalCode: 'TON', type: 'unit' },
};

/**
 * Directional Tailwind classes to inventory
 */
export const DIRECTIONAL_CLASS_PREFIXES = [
  'text-left',
  'text-right',
  'pl-',
  'pr-',
  'ml-',
  'mr-',
  'border-l',
  'border-r',
  'left-',
  'right-',
];

export const DIRECTIONAL_ICONS = new Set([
  'ChevronLeft',
  'ChevronRight',
  'ArrowLeft',
  'ArrowRight',
  'ChevronsLeft',
  'ChevronsRight',
  'MoveLeft',
  'MoveRight',
]);

/**
 * Standard Arabic vocabulary to English semantic slug mapping
 */
export const ARABIC_TO_KEY_SLUG_MAP: Record<string, string> = {
  // Shared actions
  'حفظ': 'save',
  'إلغاء': 'cancel',
  'تأكيد': 'confirm',
  'إغلاق': 'close',
  'حذف': 'delete',
  'تعديل': 'edit',
  'إضافة': 'add',
  'إنشاء': 'create',
  'تصدير': 'export',
  'استيراد': 'import',
  'بحث': 'search',
  'تصفية': 'filter',
  'تحديث': 'refresh',
  'عرض': 'view',
  'تفاصيل': 'details',
  'تحميل': 'download',
  'رفع': 'upload',
  'متابعة': 'continue',
  'رجوع': 'back',
  'التالي': 'next',
  'إعادة المحاولة': 'retry',

  // Statuses
  'نشط': 'active',
  'مكتمل': 'completed',
  'معلق': 'pending',
  'ملغي': 'cancelled',
  'فشل': 'failed',
  'نجاح': 'success',
  'تحذير': 'warning',
  'خطأ': 'error',
  'جاري التحميل': 'loading',
  'مسودة': 'draft',

  // Core entities & fields
  'الرحلات': 'trips',
  'رحلة': 'trip',
  'الناقل': 'carrier',
  'الناقلون': 'carriers',
  'السائق': 'driver',
  'السائقون': 'drivers',
  'الشاحنة': 'truck',
  'الشاحنات': 'trucks',
  'المشروع': 'project',
  'المشاريع': 'projects',
  'المادة': 'material',
  'المواد': 'materials',
  'الميزان': 'weighbridge',
  'التسعير': 'pricing',
  'التقارير': 'reports',
  'الوزن الصافي': 'netWeight',
  'الوزن الإجمالي': 'grossWeight',
  'الوزن الفارغ': 'tareWeight',
  'رقم التذكرة': 'ticketNumber',
  'رقم اللوحة': 'plateNumber',
  'اسم السائق': 'driverName',
  'اسم الناقل': 'carrierName',
  'نوع المادة': 'materialType',
  'الحالة': 'status',
  'التاريخ': 'date',
  'الوقت': 'time',
  'الموقع': 'location',
  'الملاحظات': 'notes',
  'السعر': 'price',
  'الإجمالي': 'total',
  'الكمية': 'quantity',
  'المستخدم': 'user',
  'الإعدادات': 'settings',
};
