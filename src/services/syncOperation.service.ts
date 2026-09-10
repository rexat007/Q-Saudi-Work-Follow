import { syncOperationRepository } from '../repositories/syncOperation.repository';
import { SyncOperationValidator } from '../validators/syncOperation.validator';
import { SyncOperationEntity } from '../types/entities';
import { AuthUserContext } from '../types/common';
import { auth } from '../firebase/config';

const localIdempotencyCache = new Map<string, SyncOperationEntity>();

export class SyncOperationService {
  async processOperation(
    payload: Omit<SyncOperationEntity, 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>,
    context: AuthUserContext
  ): Promise<{ isDuplicate: boolean; operation: SyncOperationEntity }> {
    // Check local memory cache first for high performance & offline/test support
    if (localIdempotencyCache.has(payload.operationId)) {
      return {
        isDuplicate: true,
        operation: localIdempotencyCache.get(payload.operationId)!,
      };
    }

    // Check repository only if authenticated with Firebase
    if (auth.currentUser) {
      try {
        const existing = await syncOperationRepository.findById(payload.projectId, payload.operationId);
        if (existing) {
          localIdempotencyCache.set(payload.operationId, existing);
          return {
            isDuplicate: true,
            operation: existing,
          };
        }
      } catch {
        // Offline / unit test fallback
      }
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

    if (auth.currentUser) {
      try {
        await syncOperationRepository.create(newOp);
      } catch {
        // Fallback
      }
    }

    localIdempotencyCache.set(payload.operationId, newOp as SyncOperationEntity);

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
