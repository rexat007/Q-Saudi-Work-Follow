import { OperationSourceType, OperationActorType, TripSourceMetadata, TripEntity } from '../types/entities';
import { TripRecord } from '../types/tripEngine';
import { ValidationResult, ValidationError } from '../types/common';

export const VALID_OPERATION_SOURCE_TYPES: readonly OperationSourceType[] = [
  'MANUAL',
  'WEIGHBRIDGE',
  'EXCEL',
  'CSV',
  'GOOGLE_SHEETS',
  'GOOGLE_DRIVE',
  'API',
  'MIGRATION',
] as const;

export const VALID_OPERATION_ACTOR_TYPES: readonly OperationActorType[] = [
  'USER',
  'IMPORT',
  'SYSTEM',
] as const;

export interface OperationSourceInput {
  sourceType?: any;
  loadingDataSource?: any;
  unloadingDataSource?: any;
  loadingActorType?: any;
  loadingActorId?: any;
  unloadingActorType?: any;
  unloadingActorId?: any;
  sourceMetadata?: any;
  destNetWeight?: any;
  varianceWeight?: any;
  unloadTime?: any;
  status?: any;
}

export class OperationSourceValidator {
  /**
   * Type guard for OperationSourceType
   */
  static isValidSourceType(value: any): value is OperationSourceType {
    return typeof value === 'string' && (VALID_OPERATION_SOURCE_TYPES as readonly string[]).includes(value);
  }

  /**
   * Type guard for OperationActorType
   */
  static isValidActorType(value: any): value is OperationActorType {
    return typeof value === 'string' && (VALID_OPERATION_ACTOR_TYPES as readonly string[]).includes(value);
  }

  /**
   * Strict validation for Operation Source metadata on Trip entities / records
   */
  static validate(input: OperationSourceInput): ValidationResult {
    const errors: ValidationError[] = [];

    // 1. Validate sourceType (optional for legacy compatibility, but if present must be strictly valid)
    if (input.sourceType !== undefined && input.sourceType !== null) {
      if (!this.isValidSourceType(input.sourceType)) {
        errors.push({
          field: 'sourceType',
          code: 'INVALID_OPERATION_SOURCE_TYPE',
          messageAr: `نوع مصدر العملية "${input.sourceType}" غير صالح. القيم المسموحة: ${VALID_OPERATION_SOURCE_TYPES.join(', ')}`,
          messageEn: `Invalid operation source type "${input.sourceType}". Allowed values: ${VALID_OPERATION_SOURCE_TYPES.join(', ')}`,
        });
      }
    }

    // 2. Validate loadingDataSource
    if (input.loadingDataSource !== undefined && input.loadingDataSource !== null) {
      if (!this.isValidSourceType(input.loadingDataSource)) {
        errors.push({
          field: 'loadingDataSource',
          code: 'INVALID_LOADING_DATA_SOURCE',
          messageAr: `مصدر بيانات التحميل "${input.loadingDataSource}" غير صالح. القيم المسموحة: ${VALID_OPERATION_SOURCE_TYPES.join(', ')}`,
          messageEn: `Invalid loading data source "${input.loadingDataSource}". Allowed values: ${VALID_OPERATION_SOURCE_TYPES.join(', ')}`,
        });
      }
    }

    // 3. Validate unloadingDataSource (can be null if not unloaded yet)
    if (input.unloadingDataSource !== undefined && input.unloadingDataSource !== null) {
      if (!this.isValidSourceType(input.unloadingDataSource)) {
        errors.push({
          field: 'unloadingDataSource',
          code: 'INVALID_UNLOADING_DATA_SOURCE',
          messageAr: `مصدر بيانات التفريغ "${input.unloadingDataSource}" غير صالح. القيم المسموحة: ${VALID_OPERATION_SOURCE_TYPES.join(', ')}`,
          messageEn: `Invalid unloading data source "${input.unloadingDataSource}". Allowed values: ${VALID_OPERATION_SOURCE_TYPES.join(', ')}`,
        });
      }
    }

    // 4. Validate loadingActorType
    if (input.loadingActorType !== undefined && input.loadingActorType !== null) {
      if (!this.isValidActorType(input.loadingActorType)) {
        errors.push({
          field: 'loadingActorType',
          code: 'INVALID_OPERATION_ACTOR_TYPE',
          messageAr: `نوع منفذ التحميل "${input.loadingActorType}" غير صالح. القيم المسموحة: ${VALID_OPERATION_ACTOR_TYPES.join(', ')}`,
          messageEn: `Invalid loading actor type "${input.loadingActorType}". Allowed values: ${VALID_OPERATION_ACTOR_TYPES.join(', ')}`,
        });
      }
    }

    // 5. Validate unloadingActorType (can be null if not unloaded yet)
    if (input.unloadingActorType !== undefined && input.unloadingActorType !== null) {
      if (!this.isValidActorType(input.unloadingActorType)) {
        errors.push({
          field: 'unloadingActorType',
          code: 'INVALID_UNLOADING_ACTOR_TYPE',
          messageAr: `نوع منفذ التفريغ "${input.unloadingActorType}" غير صالح. القيم المسموحة: ${VALID_OPERATION_ACTOR_TYPES.join(', ')}`,
          messageEn: `Invalid unloading actor type "${input.unloadingActorType}". Allowed values: ${VALID_OPERATION_ACTOR_TYPES.join(', ')}`,
        });
      }
    }

    // 6. Validate sourceMetadata if provided
    if (input.sourceMetadata !== undefined && input.sourceMetadata !== null) {
      if (typeof input.sourceMetadata !== 'object' || Array.isArray(input.sourceMetadata)) {
        errors.push({
          field: 'sourceMetadata',
          code: 'INVALID_SOURCE_METADATA',
          messageAr: 'البيانات الوصفية للمصدر (sourceMetadata) يجب أن تكون كائناً منظماً',
          messageEn: 'sourceMetadata must be an object',
        });
      } else {
        const meta = input.sourceMetadata as Partial<TripSourceMetadata>;
        if (meta.importBatchId !== undefined && typeof meta.importBatchId !== 'string') {
          errors.push({
            field: 'sourceMetadata.importBatchId',
            code: 'INVALID_TYPE',
            messageAr: 'معرف دفعة الاستيراد (importBatchId) يجب أن يكون نصياً',
            messageEn: 'importBatchId must be a string',
          });
        }
        if (meta.sourceFileId !== undefined && typeof meta.sourceFileId !== 'string') {
          errors.push({
            field: 'sourceMetadata.sourceFileId',
            code: 'INVALID_TYPE',
            messageAr: 'معرف ملف المصدر (sourceFileId) يجب أن يكون نصياً',
            messageEn: 'sourceFileId must be a string',
          });
        }
        if (meta.sourceFileName !== undefined && typeof meta.sourceFileName !== 'string') {
          errors.push({
            field: 'sourceMetadata.sourceFileName',
            code: 'INVALID_TYPE',
            messageAr: 'اسم ملف المصدر (sourceFileName) يجب أن يكون نصياً',
            messageEn: 'sourceFileName must be a string',
          });
        }
        if (meta.sourceSheetName !== undefined && typeof meta.sourceSheetName !== 'string') {
          errors.push({
            field: 'sourceMetadata.sourceSheetName',
            code: 'INVALID_TYPE',
            messageAr: 'اسم ورقة المصدر (sourceSheetName) يجب أن يكون نصياً',
            messageEn: 'sourceSheetName must be a string',
          });
        }
        if (meta.sourceRowId !== undefined && typeof meta.sourceRowId !== 'string' && typeof meta.sourceRowId !== 'number') {
          errors.push({
            field: 'sourceMetadata.sourceRowId',
            code: 'INVALID_TYPE',
            messageAr: 'معرف الصف المصدر (sourceRowId) يجب أن يكون نصياً أو رقماً',
            messageEn: 'sourceRowId must be a string or number',
          });
        }
      }
    }

    // 7. WEIGHBRIDGE Source Case Validation:
    // When sourceType === 'WEIGHBRIDGE', verify source semantics.
    // Explicitly: absence of unloading data (destNetWeight=null, varianceWeight=null, unloadTime=null, unloadingActorId=null)
    // is NOT an error at this stage.
    if (input.sourceType === 'WEIGHBRIDGE') {
      if (input.loadingDataSource !== undefined && input.loadingDataSource !== null && input.loadingDataSource !== 'WEIGHBRIDGE') {
        errors.push({
          field: 'loadingDataSource',
          code: 'WEIGHBRIDGE_LOADING_MISMATCH',
          messageAr: 'عندما يكون نوع المصدر WEIGHBRIDGE يجب أن يكون مصدر التحميل WEIGHBRIDGE',
          messageEn: 'When sourceType is WEIGHBRIDGE, loadingDataSource must be WEIGHBRIDGE',
        });
      }

      if (input.loadingActorType !== undefined && input.loadingActorType !== null && input.loadingActorType !== 'IMPORT') {
        errors.push({
          field: 'loadingActorType',
          code: 'WEIGHBRIDGE_ACTOR_MISMATCH',
          messageAr: 'عند إنشاء رحلة من ميزان (WEIGHBRIDGE) يجب أن يكون منفذ التحميل IMPORT',
          messageEn: 'When creating a trip from WEIGHBRIDGE, loadingActorType must be IMPORT',
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Normalizes a trip (modern or legacy) to ensure Operation Source Model consistency.
   * Legacy trips without sourceType are assigned:
   * - sourceType: 'MANUAL'
   * - loadingDataSource: 'MANUAL'
   * - unloadingDataSource: 'MANUAL' (or null if trip is in transit)
   * - loadingActorType: 'USER'
   * - unloadingActorType: 'USER' (or null if not unloaded)
   *
   * WEIGHBRIDGE trips are normalized with:
   * - sourceType: 'WEIGHBRIDGE'
   * - loadingDataSource: 'WEIGHBRIDGE'
   * - loadingActorType: 'IMPORT'
   */
  static normalizeTripOperationSource<T extends Partial<TripEntity> | Partial<TripRecord>>(trip: T): T & {
    sourceType: OperationSourceType;
    loadingDataSource: OperationSourceType;
    unloadingDataSource: OperationSourceType | null;
    loadingActorType: OperationActorType;
    loadingActorId: string | null;
    unloadingActorType: OperationActorType | null;
    unloadingActorId: string | null;
    sourceMetadata?: TripSourceMetadata;
  } {
    const isWeighbridge = trip.sourceType === 'WEIGHBRIDGE';

    const sourceType: OperationSourceType = trip.sourceType || 'MANUAL';
    const loadingDataSource: OperationSourceType = trip.loadingDataSource || (isWeighbridge ? 'WEIGHBRIDGE' : 'MANUAL');
    const loadingActorType: OperationActorType = trip.loadingActorType || (isWeighbridge ? 'IMPORT' : 'USER');
    const loadingActorId = trip.loadingActorId ?? (trip as any).loaderId ?? (trip as any).createdBy ?? null;

    // For legacy trips that had no sourceType, unloadingDataSource defaults to MANUAL if unloaded, or null if in transit
    let unloadingDataSource: OperationSourceType | null = null;
    if (trip.unloadingDataSource !== undefined) {
      unloadingDataSource = trip.unloadingDataSource;
    } else if (isWeighbridge) {
      unloadingDataSource = null;
    } else if (!trip.sourceType) {
      // Legacy trip: if unloaded or completed, default is MANUAL
      unloadingDataSource = 'MANUAL';
    }

    let unloadingActorType: OperationActorType | null = null;
    if (trip.unloadingActorType !== undefined) {
      unloadingActorType = trip.unloadingActorType;
    } else if (!trip.sourceType) {
      unloadingActorType = 'USER';
    }

    const unloadingActorId = trip.unloadingActorId ?? (trip as any).unloaderId ?? null;

    return {
      ...trip,
      sourceType,
      loadingDataSource,
      unloadingDataSource,
      loadingActorType,
      loadingActorId,
      unloadingActorType,
      unloadingActorId,
      sourceMetadata: trip.sourceMetadata,
    };
  }
}
