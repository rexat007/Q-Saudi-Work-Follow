/**
 * Exception Engine Data Contracts and Types
 * 
 * Strict 12 Exception Types:
 * 1. WEIGHT_VARIANCE
 * 2. TRUCK_CARRIER_CONFLICT
 * 3. DRIVER_CARRIER_CONFLICT
 * 4. MATERIAL_NOT_ALLOWED
 * 5. CARRIER_NOT_ALLOWED
 * 6. AMBIGUOUS_TRIP
 * 7. DUPLICATE_TRIP
 * 8. INVALID_WEIGHT
 * 9. MISSING_PRICING
 * 10. PRICING_CONFLICT
 * 11. SYNC_FAILURE
 * 12. VERSION_CONFLICT
 * 
 * Statuses:
 * - OPEN
 * - UNDER_REVIEW
 * - RESOLVED
 * - REJECTED
 * 
 * Audit Mandate:
 * Every single Exception processing action MUST record an immutable Audit entry.
 */

export type ExceptionType =
  | 'WEIGHT_VARIANCE'
  | 'TRUCK_CARRIER_CONFLICT'
  | 'DRIVER_CARRIER_CONFLICT'
  | 'MATERIAL_NOT_ALLOWED'
  | 'CARRIER_NOT_ALLOWED'
  | 'AMBIGUOUS_TRIP'
  | 'DUPLICATE_TRIP'
  | 'INVALID_WEIGHT'
  | 'MISSING_PRICING'
  | 'PRICING_CONFLICT'
  | 'SYNC_FAILURE'
  | 'VERSION_CONFLICT';

export type ExceptionSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'BLOCKING' | 'CRITICAL';

export type ExceptionStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'REJECTED';

export interface ExceptionRecord {
  exceptionId: string;
  projectId: string;
  tripId: string | null; // nullable (e.g. general pricing/sync issues can exist without trip)
  type: ExceptionType;
  severity: ExceptionSeverity;
  status: ExceptionStatus;
  description: string;
  evidence: Record<string, any>;
  openedAt: string; // ISO 8601 string
  openedBy: string; // userId or displayName
  reviewedAt: string | null; // nullable
  reviewedBy: string | null; // nullable
  resolution: string | null; // nullable
  resolutionNote: string | null; // nullable
}

export type ExceptionAuditAction =
  | 'CREATED'
  | 'UNDER_REVIEW_STARTED'
  | 'RESOLVED'
  | 'REJECTED'
  | 'EVIDENCE_ATTACHED'
  | 'NOTE_ADDED';

export interface ExceptionAuditLog {
  auditId: string;
  exceptionId: string;
  projectId: string;
  action: ExceptionAuditAction;
  actorId: string;
  actorName: string;
  actorRole: string;
  timestamp: string; // ISO 8601 string
  beforeState: Partial<ExceptionRecord> | null;
  afterState: Partial<ExceptionRecord>;
  note?: string;
  ipAddress?: string;
}

export interface CreateExceptionParams {
  exceptionId?: string;
  projectId: string;
  tripId?: string | null; // nullable
  type: ExceptionType;
  severity: ExceptionSeverity;
  description: string;
  evidence?: Record<string, any>;
  openedBy: string;
}

export interface ResolveExceptionParams {
  exceptionId: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  resolution: string;
  resolutionNote: string;
}

export interface RejectExceptionParams {
  exceptionId: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  rejectionReason: string;
  resolutionNote: string;
}

export interface StartReviewParams {
  exceptionId: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  notes?: string;
}
