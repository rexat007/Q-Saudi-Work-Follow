import { auditLogRepository } from '../repositories/auditLog.repository';
import { AuditLogValidator } from '../validators/auditLog.validator';
import { AuditLogEntity } from '../types/entities';
import { AuthUserContext } from '../types/common';

export class AuditLogService {
  async recordLog(
    params: {
      projectId: string;
      entityType: AuditLogEntity['entityType'];
      entityId: string;
      action: AuditLogEntity['action'];
      before?: Record<string, any> | null;
      after: Record<string, any>;
      correlationId?: string;
    },
    context: AuthUserContext
  ): Promise<string> {
    const auditLogId = `AUD-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    
    // Determine delta fields
    const deltaFields: string[] = [];
    if (params.before) {
      const allKeys = new Set([...Object.keys(params.before), ...Object.keys(params.after)]);
      for (const k of allKeys) {
        if (JSON.stringify(params.before[k]) !== JSON.stringify(params.after[k])) {
          deltaFields.push(k);
        }
      }
    } else {
      deltaFields.push(...Object.keys(params.after));
    }

    const logEntry: Omit<AuditLogEntity, 'createdAt' | 'updatedAt'> & { createdBy: string; updatedBy: string } = {
      auditLogId,
      projectId: params.projectId,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      actor: {
        userId: context.userId,
        email: context.email,
        role: context.role,
        ipAddress: context.ipAddress || 'client-browser',
        userAgent: context.userAgent || 'web',
      },
      changes: {
        before: params.before || null,
        after: params.after,
        deltaFields,
      },
      correlationId: params.correlationId || `CORR-${Date.now()}`,
      createdBy: context.userId,
      updatedBy: context.userId,
    };

    const validation = AuditLogValidator.validate(logEntry);
    if (!validation.isValid) {
      throw new Error(`Audit validation failed: ${validation.errors.map(e => e.messageAr).join(', ')}`);
    }

    await auditLogRepository.create(logEntry);
    return auditLogId;
  }

  async getRecentAuditLogs(maxLimit = 50): Promise<AuditLogEntity[]> {
    return auditLogRepository.listRecent(maxLimit);
  }

  subscribeToRecentLogs(maxLimit = 50, onData: (logs: AuditLogEntity[]) => void) {
    return auditLogRepository.subscribeRecent(maxLimit, onData);
  }
}

export const auditLogService = new AuditLogService();
