import { Timestamp } from 'firebase/firestore';

export interface BaseAuditedEntity {
  createdAt: Timestamp | Date;
  createdBy: string;
  updatedAt: Timestamp | Date;
  updatedBy: string;
}

export interface AuthUserContext {
  userId: string;
  email: string;
  displayName: string;
  role: 'PROJECT_ADMIN' | 'DISPATCHER' | 'FINANCE_AUDITOR' | 'DRIVER' | 'VIEWER';
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
