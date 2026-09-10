import { importBatchRepository } from '../repositories/importBatch.repository';
import { ImportBatchValidator } from '../validators/importBatch.validator';
import { ImportBatchEntity } from '../types/entities';
import { AuthUserContext } from '../types/common';
import { auditLogService } from './auditLog.service';

export class ImportBatchService {
  async getBatch(projectId: string, batchId: string): Promise<ImportBatchEntity | null> {
    return importBatchRepository.findById(projectId, batchId);
  }

  async getBatchesByProject(projectId: string): Promise<ImportBatchEntity[]> {
    return importBatchRepository.listByProject(projectId);
  }

  async startBatch(
    payload: Omit<ImportBatchEntity, 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'processedRecords' | 'failedRecords' | 'status'>,
    context: AuthUserContext
  ): Promise<ImportBatchEntity> {
    if (context.role !== 'PROJECT_ADMIN') {
      throw new Error('عمليات الاستيراد الشاملة مقتصرة فقط على مديري المشاريع');
    }

    const newBatch: Omit<ImportBatchEntity, 'createdAt' | 'updatedAt'> & { createdBy: string; updatedBy: string } = {
      ...payload,
      processedRecords: 0,
      failedRecords: 0,
      status: 'PENDING',
      createdBy: context.userId,
      updatedBy: context.userId,
    };

    const validation = ImportBatchValidator.validate(newBatch);
    if (!validation.isValid) {
      throw new Error(`خطأ في دفعة الاستيراد: ${validation.errors.map(e => e.messageAr).join(' | ')}`);
    }

    await importBatchRepository.create(newBatch);

    await auditLogService.recordLog({
      projectId: payload.projectId,
      entityType: 'IMPORT_BATCH' as any,
      entityId: payload.batchId,
      action: 'CREATE',
      after: newBatch,
    }, context);

    return newBatch as ImportBatchEntity;
  }

  async updateBatchProgress(
    projectId: string,
    batchId: string,
    processed: number,
    failed: number,
    status: ImportBatchEntity['status'],
    context: AuthUserContext,
    errorSummary?: string[]
  ): Promise<void> {
    await importBatchRepository.update(projectId, batchId, {
      processedRecords: processed,
      failedRecords: failed,
      status,
      errorSummary,
    }, context.userId);
  }

  subscribeByProject(projectId: string, onData: (batches: ImportBatchEntity[]) => void) {
    return importBatchRepository.subscribeByProject(projectId, onData);
  }
}

export const importBatchService = new ImportBatchService();
