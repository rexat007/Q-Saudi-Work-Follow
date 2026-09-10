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

  async startReview(
    projectId: string,
    tripId: string | null,
    exceptionId: string,
    note: string,
    context: AuthUserContext
  ): Promise<void> {
    const updates: Partial<TripExceptionEntity> = {
      status: 'UNDER_REVIEW',
      reviewedAt: new Date().toISOString(),
      reviewedBy: context.displayName,
      resolutionNote: note
    };

    await exceptionRepository.update(projectId, tripId, exceptionId, updates, context.userId);

    await auditLogService.recordLog({
      projectId,
      entityType: 'EXCEPTION',
      entityId: exceptionId,
      action: 'UPDATE',
      after: updates,
    }, context);
  }

  async resolveException(
    projectId: string,
    tripId: string | null,
    exceptionId: string,
    resolution: {
      notes: string;
      status?: 'RESOLVED' | 'WAIVED';
      resolutionCode?: string;
      financialPenaltySAR?: number;
    },
    context: AuthUserContext
  ): Promise<void> {
    if (context.role !== 'PROJECT_ADMIN' && context.role !== 'FINANCE_AUDITOR') {
      throw new Error('البت في الاستثناءات التشغيلية والمالية مقتصر على مدير المشروع أو المدقق المالي');
    }

    const resolvedStatus = resolution.status || 'RESOLVED';
    const updates: Partial<TripExceptionEntity> = {
      status: resolvedStatus,
      reviewedAt: new Date().toISOString(),
      reviewedBy: context.displayName,
      resolutionNote: resolution.notes,
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
      action: resolvedStatus === 'WAIVED' ? 'WAIVE_EXCEPTION' : 'UPDATE',
      after: updates,
    }, context);
  }

  async rejectException(
    projectId: string,
    tripId: string | null,
    exceptionId: string,
    rejection: {
      reason: string;
      notes: string;
    },
    context: AuthUserContext
  ): Promise<void> {
    const updates: Partial<TripExceptionEntity> = {
      status: 'REJECTED',
      reviewedAt: new Date().toISOString(),
      reviewedBy: context.displayName,
      resolution: rejection.reason,
      resolutionNote: rejection.notes
    };

    await exceptionRepository.update(projectId, tripId, exceptionId, updates, context.userId);

    await auditLogService.recordLog({
      projectId,
      entityType: 'EXCEPTION',
      entityId: exceptionId,
      action: 'UPDATE',
      after: updates,
    }, context);
  }

  subscribeToTripExceptions(projectId: string, tripId: string, onData: (exceptions: TripExceptionEntity[]) => void) {
    return exceptionRepository.subscribeByTrip(projectId, tripId, onData);
  }
}

export const exceptionService = new ExceptionService();
