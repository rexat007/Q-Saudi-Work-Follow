import { pricingRuleRepository } from '../repositories/pricingRule.repository';
import { PricingRuleValidator } from '../validators/pricingRule.validator';
import { PricingRuleEntity } from '../types/entities';
import { AuthUserContext } from '../types/common';
import { auditLogService } from './auditLog.service';

export class PricingRuleService {
  async getPricingRules(projectId: string): Promise<PricingRuleEntity[]> {
    return pricingRuleRepository.listByProject(projectId);
  }

  async getPricingRule(projectId: string, ruleId: string): Promise<PricingRuleEntity | null> {
    return pricingRuleRepository.findById(projectId, ruleId);
  }

  async createPricingRule(
    payload: Omit<PricingRuleEntity, 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>,
    context: AuthUserContext
  ): Promise<PricingRuleEntity> {
    const validation = PricingRuleValidator.validate(payload);
    if (!validation.isValid) {
      throw new Error(`خطأ في مصفوفة التسعير: ${validation.errors.map(e => e.messageAr).join(' | ')}`);
    }

    if (context.role !== 'PROJECT_ADMIN' && context.role !== 'FINANCE_AUDITOR') {
      throw new Error('غير مصرح لك بإنشاء أو تعديل قواعد التسعير (مقتصر على الإدارة والمدقق المالي)');
    }

    const newRule = {
      ...payload,
      createdBy: context.userId,
      updatedBy: context.userId,
    };

    await pricingRuleRepository.create(newRule);

    await auditLogService.recordLog({
      projectId: payload.projectId,
      entityType: 'PRICING_RULE',
      entityId: payload.pricingRuleId,
      action: 'CREATE',
      after: newRule,
    }, context);

    return newRule as PricingRuleEntity;
  }

  async updatePricingRule(
    projectId: string,
    pricingRuleId: string,
    updates: Partial<PricingRuleEntity>,
    context: AuthUserContext
  ): Promise<void> {
    if (context.role !== 'PROJECT_ADMIN' && context.role !== 'FINANCE_AUDITOR') {
      throw new Error('تعديل التسعير يتطلب صلاحيات تدقيق مالي');
    }

    const existing = await pricingRuleRepository.findById(projectId, pricingRuleId);
    if (!existing) {
      throw new Error('قاعدة التسعير غير موجودة');
    }

    const merged = { ...existing, ...updates, pricingRuleId, projectId };
    const validation = PricingRuleValidator.validate(merged);
    if (!validation.isValid) {
      throw new Error(`خطأ في تحديث التسعير: ${validation.errors.map(e => e.messageAr).join(' | ')}`);
    }

    await pricingRuleRepository.update(projectId, pricingRuleId, updates, context.userId);

    await auditLogService.recordLog({
      projectId,
      entityType: 'PRICING_RULE',
      entityId: pricingRuleId,
      action: 'UPDATE',
      before: existing,
      after: merged,
    }, context);
  }

  subscribeByProject(projectId: string, onData: (rules: PricingRuleEntity[]) => void) {
    return pricingRuleRepository.subscribeByProject(projectId, onData);
  }
}

export const pricingRuleService = new PricingRuleService();
