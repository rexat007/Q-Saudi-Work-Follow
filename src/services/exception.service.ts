import { exceptionRepository } from '../repositories/exception.repository';
import { ExceptionValidator } from '../validators/exception.validator';
import { TripExceptionEntity } from '../types/entities';
import { AuthUserContext } from '../types/common';
import { auditLogService } from './auditLog.service';
import { tripRepository } from '../repositories/trip.repository';

export class ExceptionService {
  async getTripExceptions(projectId: string, tripId: string): Promise<TripExceptionEntity[]> {
    return exceptionRepository.listByTrip(projectId, tripId);
  }

  async raiseException(
    payload: Omit<TripExceptionEntity, 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'reportedBy'>,
    context: AuthUserContext
  ): Promise<TripExceptionEntity> {
    const newException: Omit<TripExceptionEntity, 'createdAt' | 'updatedAt'> & { createdBy: string; updatedBy: string } = {
      ...payload,
      reportedBy: {
        userId: context.userId,
        displayName: context.displayName,
      },
      createdBy: context.userId,
      updatedBy: context.userId,
    };

    const validation = ExceptionValidator.validate(newException);
    if (!validation.isValid) {
      throw new Error(`خطأ في بيانات الاستثناء: ${validation.errors.map(e => e.messageAr).join(' | ')}`);
    }

    await exceptionRepository.create(newException);

    // Update trip hasExceptions flag
    await tripRepository.update(payload.projectId, payload.tripId, {
      hasExceptions: true,
    }, context.userId);

    await auditLogService.recordLog({
      projectId: payload.projectId,
      entityType: 'EXCEPTION',
      entityId: payload.exceptionId,
      action: 'CREATE',
      after: newException,
    }, context);

    return newException as TripExceptionEntity;
  }

  async resolveException(
    projectId: string,
    tripId: string,
    exceptionId: string,
    resolution: {
      notes: string;
      status: 'RESOLVED' | 'WAIVED';
      financialPenaltySAR?: number;
    },
    context: AuthUserContext
  ): Promise<void> {
    if (context.role !== 'PROJECT_ADMIN' && context.role !== 'FINANCE_AUDITOR') {
      throw new Error('البت في الاستثناءات التشغيلية والمالية مقتصر على مدير المشروع أو المدقق المالي');
    }

    const updates: Partial<TripExceptionEntity> = {
      status: resolution.status,
      resolution: {
        resolvedByUserId: context.userId,
        resolutionNotes: resolution.notes,
        financialPenaltySAR: resolution.financialPenaltySAR,
        resolvedAt: new Date(),
      },
    };

    await exceptionRepository.update(projectId, tripId, exceptionId, updates, context.userId);

    await auditLogService.recordLog({
      projectId,
      entityType: 'EXCEPTION',
      entityId: exceptionId,
      action: resolution.status === 'WAIVED' ? 'WAIVE_EXCEPTION' : 'UPDATE',
      after: updates,
    }, context);
  }

  subscribeToTripExceptions(projectId: string, tripId: string, onData: (exceptions: TripExceptionEntity[]) => void) {
    return exceptionRepository.subscribeByTrip(projectId, tripId, onData);
  }
}

export const exceptionService = new ExceptionService();
