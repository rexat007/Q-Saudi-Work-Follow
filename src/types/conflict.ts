/**
 * Types and interfaces for Offline Conflict Detection, Records, and Explicit Resolution.
 * 
 * Mandates:
 * - Never use "Last Write Wins" (LWW) for operational trips.
 * - On Conflict:
 *    1. Preserve local command (full client payload & local state)
 *    2. Preserve server state (authoritative snapshot)
 *    3. Create conflict record
 *    4. Notify user
 *    5. Require explicit resolution
 * 
 * - Pricing Policy:
 *    If trip was created offline with a valid Pricing Snapshot at creation time,
 *    the trip value must NEVER be modified later due to price updates.
 *    The new price applies strictly to FUTURE trips.
 */

export type ConflictType = 
  | 'VERSION_CONFLICT'
  | 'PRICING_CHANGED'
  | 'TRIP_ALREADY_COMPLETED'
  | 'TRIP_ALREADY_RETURNED'
  | 'DUPLICATE_OPERATION'
  | 'TRUCK_CARRIER_CONFLICT'
  | 'MASTER_DATA_CHANGED';

export type ConflictStatus = 'OPEN' | 'RESOLVED' | 'DISCARDED';

export type ResolutionStrategy = 
  | 'PRESERVE_PRICING_SNAPSHOT'
  | 'OVERRIDE_TO_NEW_PRICING'
  | 'ACCEPT_SERVER_STATE'
  | 'FORCE_CLIENT_STATE'
  | 'MANUAL_MERGE'
  | 'DISCARD_DUPLICATE'
  | 'ASSIGN_NEW_SERIAL'
  | 'UPDATE_MASTER_DATA_RELATION'
  | 'CANCEL_LOCAL_OPERATION';

export interface ConflictDiffField {
  field: string;
  fieldLabelAr: string;
  localValue: any;
  serverValue: any;
  isProtectedBySnapshot?: boolean;
  notesAr?: string;
}

export interface ConflictPricingProtection {
  hasValidSnapshot: boolean;
  snapshotRate: number;
  serverCurrentRate: number;
  rateDifference: number;
  pricingSnapshotDate: string;
  ruleName: string;
  currency: string;
  policyNoteAr: string;
}

export interface ConflictResolutionDetails {
  strategy: ResolutionStrategy;
  resolvedBy: string;
  resolvedAt: string; // ISO 8601
  justification: string;
  finalPayload?: Record<string, any>;
  notesAr?: string;
}

export interface ConflictRecord {
  conflictId: string;
  operationId: string;
  projectId: string;
  conflictType: ConflictType;
  status: ConflictStatus;
  titleAr: string;
  descriptionAr: string;
  
  tripId?: string;
  tripSerial?: string;
  ticketId?: string;

  // 1. Preserve local command
  localCommand: {
    operationType: string;
    payload: Record<string, any>;
    createdAt: string;
    userId: string;
    deviceId: string;
    version?: number;
    pricingSnapshot?: any;
  };

  // 2. Preserve server state
  serverState: {
    trip?: any;
    pricingRule?: any;
    masterData?: any;
    serverVersion?: number;
    serverUpdatedAt?: string;
    status?: string;
    reasonAr?: string;
  };

  // Diff & Pricing Snapshot Protection
  diffFields: ConflictDiffField[];
  pricingProtection?: ConflictPricingProtection;

  // Resolution Details (when resolved)
  resolution?: ConflictResolutionDetails;

  createdAt: string;
  updatedAt: string;
}
