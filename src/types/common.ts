import { Timestamp } from 'firebase/firestore';

export interface BaseAuditedEntity {
  createdAt: Timestamp | Date;
  createdBy: string;
  updatedAt: Timestamp | Date;
  updatedBy: string;
}

export type UserRole = 
  | 'PROJECT_ADMIN' 
  | 'SUPER_ADMIN' 
  | 'SITE_SUPERVISOR' 
  | 'SUPERVISOR' 
  | 'DISPATCHER' 
  | 'FINANCE_AUDITOR' 
  | 'SCALE_OPERATOR' 
  | 'DRIVER' 
  | 'VIEWER';

export interface AuthUserContext {
  userId: string;
  email: string;
  displayName: string;
  role: UserRole;
  assignedProjectIds?: string[];
  ipAddress?: string;
  userAgent?: string;
}

export interface ValidationError {
  field: string;
  messageAr: string;
  messageEn: string;
  code: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}
