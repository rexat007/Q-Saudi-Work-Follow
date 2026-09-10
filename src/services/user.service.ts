import { userRepository } from '../repositories/user.repository';
import { UserValidator } from '../validators/user.validator';
import { UserEntity } from '../types/entities';
import { AuthUserContext } from '../types/common';
import { auditLogService } from './auditLog.service';

export class UserService {
  async getUser(userId: string): Promise<UserEntity | null> {
    return userRepository.findById(userId);
  }

  async getAllUsers(): Promise<UserEntity[]> {
    return userRepository.listAll();
  }

  async registerUser(
    payload: Omit<UserEntity, 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>,
    context: AuthUserContext
  ): Promise<UserEntity> {
    const validation = UserValidator.validate(payload);
    if (!validation.isValid) {
      throw new Error(`خطأ في بيانات المستخدم: ${validation.errors.map(e => e.messageAr).join(' | ')}`);
    }

    if (context.role !== 'PROJECT_ADMIN') {
      throw new Error('غير مصرح لك بإضافة مستخدمين للنظام (مقتصر على مدير المشروع)');
    }

    const newUser = {
      ...payload,
      createdBy: context.userId,
      updatedBy: context.userId,
    };

    await userRepository.create(newUser);

    await auditLogService.recordLog({
      projectId: payload.assignedProjectIds[0] || 'SYSTEM',
      entityType: 'USER_ROLE',
      entityId: payload.userId,
      action: 'CREATE',
      after: newUser,
    }, context);

    return newUser as UserEntity;
  }

  async updateUserRole(
    targetUserId: string,
    role: UserEntity['role'],
    context: AuthUserContext
  ): Promise<void> {
    if (context.role !== 'PROJECT_ADMIN') {
      throw new Error('تعديل الصلاحيات مقتصر فقط على مدير المشروع');
    }

    const existing = await userRepository.findById(targetUserId);
    if (!existing) {
      throw new Error('المستخدم غير موجود');
    }

    await userRepository.update(targetUserId, { role }, context.userId);

    await auditLogService.recordLog({
      projectId: existing.assignedProjectIds[0] || 'SYSTEM',
      entityType: 'USER_ROLE',
      entityId: targetUserId,
      action: 'UPDATE',
      before: existing,
      after: { ...existing, role },
    }, context);
  }

  subscribeToUsers(onData: (users: UserEntity[]) => void) {
    return userRepository.subscribeToUsers(onData);
  }
}

export const userService = new UserService();
