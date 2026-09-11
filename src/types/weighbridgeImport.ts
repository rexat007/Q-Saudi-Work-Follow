/**
 * Weighbridge Import Domain Types
 * BLOCK 34 — Weighbridge Import over Unified Import Center (BLOCK 30)
 * 
 * Rules:
 * - Profile + Rules + UI + Validation + Review Actions on existing Unified Pipeline
 * - Preserves distinction between Operational Source Type (WEIGHBRIDGE) and Intake File Source (EXCEL/CSV/DRIVE/SHEETS)
 * - Strict invariants: No fake zero variance, no invented load time, explicit audited acceptance of origin net as destination
 */

import { OperationSourceType, OperationActorType, TripStatus } from './entities';
import { PipelineContext, ImportIssue, ImportRow, UnifiedImportBatch } from './unifiedImport';
import { CanonicalTripRow } from './excelCsvImport';

export type WeighbridgeFileIntakeType = 'EXCEL' | 'CSV' | 'GOOGLE_DRIVE' | 'GOOGLE_SHEETS';

export interface WeighbridgeFieldProfile {
  name: string;
  labelAr: string;
  required: boolean;
  type: 'string' | 'number' | 'date' | 'datetime';
  descriptionAr: string;
}

export const WEIGHBRIDGE_INPUT_PROFILE_FIELDS: WeighbridgeFieldProfile[] = [
  // Required
  { name: 'shiftDate', labelAr: 'التاريخ', required: true, type: 'date', descriptionAr: 'تاريخ عملية الوزن بالميزان' },
  { name: 'ticketId', labelAr: 'رقم التذكرة', required: true, type: 'string', descriptionAr: 'رقم تذكرة الميزان الفريد' },
  { name: 'truckNo', labelAr: 'رقم الشاحنة / اللوحة', required: true, type: 'string', descriptionAr: 'لوحة الشاحنة أو رقم التعريف' },
  { name: 'tareWeight', labelAr: 'الوزن الفارغ', required: true, type: 'number', descriptionAr: 'وزن الشاحنة وهي فارغة (كجم)' },
  { name: 'grossWeight', labelAr: 'الوزن القائم', required: true, type: 'number', descriptionAr: 'وزن الشاحنة الإجمالي مع الحمولة (كجم)' },

  // Optional
  { name: 'netWeight', labelAr: 'الوزن الصافي', required: false, type: 'number', descriptionAr: 'الوزن الصافي المسجل في التذكرة' },
  { name: 'carrier', labelAr: 'الناقل / شركة النقل', required: false, type: 'string', descriptionAr: 'اسم أو معرف شركة النقل' },
  { name: 'driverName', labelAr: 'اسم السائق', required: false, type: 'string', descriptionAr: 'اسم السائق' },
  { name: 'materialType', labelAr: 'المادة / الصنف', required: false, type: 'string', descriptionAr: 'اسم أو رمز المادة المحملة' },
  { name: 'loader', labelAr: 'المحمل / مشغل الميزان', required: false, type: 'string', descriptionAr: 'مشغل الميزان أو مسؤول التحميل' },
  { name: 'loadingStation', labelAr: 'محطة التحميل', required: false, type: 'string', descriptionAr: 'موقع أو كبينة الميزان' },
  { name: 'loadTime', labelAr: 'وقت التحميل', required: false, type: 'datetime', descriptionAr: 'التوقيت الدقيق لعملية الوزن' },
  { name: 'pricingRule', labelAr: 'قاعدة التسعير', required: false, type: 'string', descriptionAr: 'معرف قاعدة التسعير التعاقدية' },
  { name: 'carrierAgreementId', labelAr: 'معرف الاتفاقية', required: false, type: 'string', descriptionAr: 'رقم اتفاقية الناقل المعتمدة' },
  { name: 'tripRate', labelAr: 'سعر الرد / الطن', required: false, type: 'number', descriptionAr: 'السعر المتفق عليه إن وجد' },
  { name: 'note', labelAr: 'ملاحظات', required: false, type: 'string', descriptionAr: 'ملاحظات إضافية على تذكرة الميزان' },
];

export interface WeighbridgeIntakeMetadata {
  fileType: WeighbridgeFileIntakeType;
  fileName: string;
  fileId?: string;
  sheetName?: string;
  mimeType?: string;
  sizeBytes?: number;
}

export interface AcceptOriginNetDecisionPayload {
  importBatchId: string;
  rowNumber: number;
  ticketId?: string;
  userId: string;
  userName?: string;
  notes?: string;
}

export interface AcceptOriginNetResult {
  success: boolean;
  rowNumber: number;
  originalNetWeight: number;
  acceptedDestinationNetWeight: number;
  calculatedVarianceWeight: number;
  unloadDecision: 'ACCEPT_ORIGIN_NET_AS_DESTINATION';
  unloadingActorType: 'USER';
  unloadingActorId: string;
  unloadingDataSource: 'WEIGHBRIDGE';
  auditLogId?: string;
  error?: string;
}

export interface WeighbridgeRowSummary {
  rowNumber: number;
  ticketId: string;
  shiftDate?: string;
  truckNo: string;
  carrier?: string;
  driverName?: string;
  materialType?: string;
  tareWeight: number;
  grossWeight: number;
  netWeight: number;
  isCalculatedNet: boolean;
  netWeightMismatch: boolean;
  destNetWeight: number | null;
  varianceWeight: number | null;
  loadTime?: string | null;
  isAcceptedOriginNet: boolean;
  canAcceptOriginNet: boolean;
  status: 'VALID' | 'WARNING' | 'ERROR' | 'COMMITTED';
  reviewStatus: string;
  issues: ImportIssue[];
}
