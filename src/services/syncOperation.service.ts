import { syncOperationRepository } from '../repositories/syncOperation.repository';
import { SyncOperationValidator } from '../validators/syncOperation.validator';
import { SyncOperationEntity } from '../types/entities';
import { AuthUserContext } from '../types/common';

export class SyncOperationService {
  async processOperation(
    payload: Omit<SyncOperationEntity, 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>,
    context: AuthUserContext
  ): Promise<{ isDuplicate: boolean; operation: SyncOperationEntity }> {
    // Check if operation already exists (Idempotency)
    const existing = await syncOperationRepository.findById(payload.projectId, payload.operationId);
    if (existing) {
      return {
        isDuplicate: true,
        operation: existing,
      };
    }

    const newOp: Omit<SyncOperationEntity, 'createdAt' | 'updatedAt'> & { createdBy: string; updatedBy: string } = {
      ...payload,
      createdBy: context.userId,
      updatedBy: context.userId,
    };

    const validation = SyncOperationValidator.validate(newOp);
    if (!validation.isValid) {
      throw new Error(`خطأ في عملية المزامنة: ${validation.errors.map(e => e.messageAr).join(' | ')}`);
    }

    await syncOperationRepository.create(newOp);

    return {
      isDuplicate: false,
      operation: newOp as SyncOperationEntity,
    };
  }

  async getSyncOperations(projectId: string): Promise<SyncOperationEntity[]> {
    return syncOperationRepository.listByProject(projectId);
  }
}

export const syncOperationService = new SyncOperationService();
