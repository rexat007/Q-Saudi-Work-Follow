/**
 * Unified Import Validator
 * BLOCK 30: Validates ImportBatch, ImportSource, and Project Isolation
 */

import {
  UnifiedImportBatch,
  ImportSource,
  ImportIssue,
  PipelineContext,
} from '../types/unifiedImport';
import { VALID_OPERATION_SOURCE_TYPES } from './operationSource.validator';
import { OperationSourceType } from '../types/entities';

export interface UnifiedValidationResult {
  isValid: boolean;
  errors: {
    field: string;
    code: string;
    messageAr: string;
    messageEn: string;
  }[];
}

export class UnifiedImportValidator {
  /**
   * Validates an ImportSource object against the Operation Source Model (BLOCK 29)
   */
  public static validateSource(source: ImportSource): UnifiedValidationResult {
    const errors: UnifiedValidationResult['errors'] = [];

    if (!source) {
      errors.push({
        field: 'source',
        code: 'SOURCE_REQUIRED',
        messageAr: 'مصدر الاستيراد مطلوب',
        messageEn: 'Import source is required',
      });
      return { isValid: false, errors };
    }

    // 1. sourceType check
    if (!source.sourceType || !VALID_OPERATION_SOURCE_TYPES.includes(source.sourceType as OperationSourceType)) {
      errors.push({
        field: 'source.sourceType',
        code: 'INVALID_OPERATION_SOURCE_TYPE',
        messageAr: `نوع المصدر (${source.sourceType}) غير صالح. الأنواع المعتمدة: ${VALID_OPERATION_SOURCE_TYPES.join(', ')}`,
        messageEn: `Invalid source type: ${source.sourceType}`,
      });
    }

    // 2. importBatchId check
    if (!source.importBatchId || typeof source.importBatchId !== 'string' || !source.importBatchId.trim()) {
      errors.push({
        field: 'source.importBatchId',
        code: 'BATCH_ID_REQUIRED',
        messageAr: 'معرف دفعة الاستيراد importBatchId مطلوب',
        messageEn: 'Import batch ID is required',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates an entire UnifiedImportBatch
   */
  public static validateBatch(batch: UnifiedImportBatch): UnifiedValidationResult {
    const errors: UnifiedValidationResult['errors'] = [];

    if (!batch.importBatchId || !batch.importBatchId.trim()) {
      errors.push({
        field: 'importBatchId',
        code: 'BATCH_ID_REQUIRED',
        messageAr: 'معرف دفعة الاستيراد مطلوب',
        messageEn: 'importBatchId is required',
      });
    }

    if (!batch.projectId || !batch.projectId.trim()) {
      errors.push({
        field: 'projectId',
        code: 'PROJECT_ID_REQUIRED',
        messageAr: 'معرف المشروع مطلوب لضمان العزل',
        messageEn: 'projectId is required for project isolation',
      });
    }

    if (!batch.operationId || !batch.operationId.trim()) {
      errors.push({
        field: 'operationId',
        code: 'OPERATION_ID_REQUIRED',
        messageAr: 'معرف العملية operationId مطلوب لضمان idempotency',
        messageEn: 'operationId is required for idempotency',
      });
    }

    const sourceVal = this.validateSource(batch.source);
    if (!sourceVal.isValid) {
      errors.push(...sourceVal.errors);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Enforces Project Isolation
   * Rejects any attempt by a user to create or commit an import batch outside their authorized project.
   */
  public static enforceProjectIsolation(
    batchProjectId: string,
    context: PipelineContext
  ): { isAllowed: boolean; error?: string } {
    if (!batchProjectId || !context.projectId) {
      return {
        isAllowed: false,
        error: 'معرف المشروع مفقود في سياق التنفيذ أو في دفعة الاستيراد (Project Isolation Violation)',
      };
    }

    if (batchProjectId.trim() !== context.projectId.trim()) {
      return {
        isAllowed: false,
        error: `انتهاك عزل المشاريع: لا يمكن معالجة دفعة لمشروع (${batchProjectId}) في نطاق سياق مشروع (${context.projectId})`,
      };
    }

    return { isAllowed: true };
  }
}
