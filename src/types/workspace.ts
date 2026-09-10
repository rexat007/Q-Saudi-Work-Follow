/**
 * Google Workspace Integration Domain Types
 * Strict constraints:
 * - Firestore is Source of Truth
 * - Google Sheets is Projection
 * - No SpreadsheetApp.getActiveSpreadsheet()
 * - Project Registry stores spreadsheetId and driveFolderId
 * - Upsert by technical key (Operations: tripId)
 * - 20 legacy operational columns preserved + 6 pricing columns added
 * - Google Drive hierarchy: project folder, imported files, reports, printable documents
 */

export type WorkspaceSheetTab = 
  | 'OPERATIONS'
  | 'DRIVERS'
  | 'CARRIERS'
  | 'MATERIALS'
  | 'EXCEPTIONS'
  | 'REPORTS';

export interface WorkspaceTabConfig {
  tabKey: WorkspaceSheetTab;
  tabTitleAr: string;
  tabTitleEn: string;
  primaryKey: string;
  descriptionAr: string;
}

export const WORKSPACE_TABS: Record<WorkspaceSheetTab, WorkspaceTabConfig> = {
  OPERATIONS: {
    tabKey: 'OPERATIONS',
    tabTitleAr: 'العمليات',
    tabTitleEn: 'Operations',
    primaryKey: 'tripId',
    descriptionAr: 'جدول العمليات والرحلات التشغيلية بلقطة التسعير المعتمدة والمفتاح التقني tripId',
  },
  DRIVERS: {
    tabKey: 'DRIVERS',
    tabTitleAr: 'السائقين',
    tabTitleEn: 'Drivers',
    primaryKey: 'driverId',
    descriptionAr: 'سجل السائقين المعتمدين ورخص القيادة وبطاقات الهوية/الإقامة',
  },
  CARRIERS: {
    tabKey: 'CARRIERS',
    tabTitleAr: 'الناقلين',
    tabTitleEn: 'Carriers',
    primaryKey: 'carrierId',
    descriptionAr: 'شركات النقل المعتمدة والسجل التجاري وتراخيص هيئة النقل (TGA)',
  },
  MATERIALS: {
    tabKey: 'MATERIALS',
    tabTitleAr: 'المواد',
    tabTitleEn: 'Materials',
    primaryKey: 'materialId',
    descriptionAr: 'قائمة المواد المصرح بها ووحدات القياس والكثافة المعيارية',
  },
  EXCEPTIONS: {
    tabKey: 'EXCEPTIONS',
    tabTitleAr: 'الاستثناءات',
    tabTitleEn: 'Exceptions',
    primaryKey: 'exceptionId',
    descriptionAr: 'سجل الفروقات الموازين والاستثناءات التشغيلية المعتمدة والمعلقة',
  },
  REPORTS: {
    tabKey: 'REPORTS',
    tabTitleAr: 'تقارير مختارة',
    tabTitleEn: 'Selected Reports',
    primaryKey: 'reportCode',
    descriptionAr: 'مؤشرات الأداء التشغيلية ومجاميع التوريد والتسويات المالية',
  },
};

/**
 * 20 Legacy Operational Columns (strictly preserved for backward compatibility)
 */
export const OPERATIONS_LEGACY_COLUMNS = [
  'tripId',          // 1. Technical Primary Key
  'projectId',       // 2. Project ID
  'tripSerial',      // 3. Serial Number
  'ticketId',        // 4. Weighbridge Ticket ID
  'truckId',         // 5. Truck ID / Plate
  'driverId',        // 6. Driver ID
  'carrierId',       // 7. Carrier ID
  'materialId',      // 8. Material ID
  'shiftDate',       // 9. Operational Shift Date (YYYY-MM-DD)
  'tareWeight',      // 10. Origin Tare Weight (KG)
  'grossWeight',     // 11. Origin Gross Weight (KG)
  'netWeight',       // 12. Origin Net Weight (KG)
  'destNetWeight',   // 13. Destination Net Weight (KG)
  'varianceWeight',  // 14. Scale Variance (KG)
  'loaderId',        // 15. Origin Scale Operator
  'unloaderId',      // 16. Destination Site Receiver
  'status',          // 17. Trip Status
  'loadTime',        // 18. Dispatch Timestamp
  'arrivalTime',     // 19. Arrival Timestamp
  'unloadTime',      // 20. Offload Timestamp
] as const;

/**
 * 6 Pricing Columns (added without modifying or deleting legacy columns)
 */
export const OPERATIONS_PRICING_COLUMNS = [
  'pricingType',      // 21. PER_TON or PER_TRIP
  'agreedRate',       // 22. Agreed Rate (SAR)
  'settlementBase',   // 23. Base quantity (tons or 1)
  'settlementAmount', // 24. Total settlement SAR
  'currency',         // 25. Currency code (SAR)
  'pricingRuleId',    // 26. Master Pricing Rule ID
] as const;

/**
 * Additional audit metadata columns
 */
export const OPERATIONS_AUDIT_COLUMNS = [
  'notes',
  'version',
  'lastSyncedAt',
] as const;

/**
 * Full Operations Projection Schema
 */
export const OPERATIONS_FULL_COLUMNS = [
  ...OPERATIONS_LEGACY_COLUMNS,
  ...OPERATIONS_PRICING_COLUMNS,
  ...OPERATIONS_AUDIT_COLUMNS,
] as const;

export type OperationColumnName = typeof OPERATIONS_FULL_COLUMNS[number];

/**
 * Schema Migration Plan
 */
export interface SchemaMigrationPlan {
  planVersion: string;
  sourceOfTruth: 'Firestore';
  projectionTarget: 'Google Sheets';
  sheetName: string;
  primaryKey: string;
  legacyColumnCount: 20;
  legacyColumns: typeof OPERATIONS_LEGACY_COLUMNS;
  pricingColumnCount: 6;
  pricingColumns: typeof OPERATIONS_PRICING_COLUMNS;
  totalColumnCount: number;
  migrationStrategy: 'NON_DESTRUCTIVE_COLUMN_EXPANSION';
  rules: {
    preserveExistingHeaders: boolean;
    forbidInPlaceRenaming: boolean;
    appendNewPricingColumnsAtEnd: boolean;
    supportIdempotentUpsert: boolean;
    allowRollback: boolean;
  };
}

export interface GoogleDriveProjectStructure {
  projectId: string;
  projectFolderName: string;
  projectFolderId: string;
  spreadsheetId: string;
  spreadsheetUrl: string;
  subfolders: {
    importedFiles: { id: string; name: string; url: string };
    reports: { id: string; name: string; url: string };
    printableDocuments: { id: string; name: string; url: string };
  };
  provisionedAt: string;
  status: 'PROVISIONED' | 'NOT_PROVISIONED' | 'ERROR';
}

export interface UpsertResult {
  tabKey: WorkspaceSheetTab;
  tabTitle: string;
  primaryKey: string;
  processedCount: number;
  insertedCount: number;
  updatedCount: number;
  unchangedCount: number;
  columnsCount: number;
  durationMs: number;
}

export interface WorkspaceSyncSummary {
  projectId: string;
  spreadsheetId: string;
  spreadsheetUrl: string;
  syncedAt: string;
  sourceOfTruth: 'Firestore';
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  upsertResults: UpsertResult[];
  totalRecordsUpserted: number;
  auditMessage: string;
}
