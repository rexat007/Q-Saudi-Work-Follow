/**
 * Trip Engine Domain Types & Schemas
 * Strictly adhering to architectural requirements:
 * - 6 Core Master Data validation rules
 * - Server-side authoritative weight calculations
 * - Null destination weight before receipt
 * - Server-side only settlement calculation
 * - Historical pricing snapshot storage
 */

export type TripPricingType = 'PER_TON' | 'PER_TRIP';

export type TripEngineStatus = 
  | 'DRAFT'
  | 'LOADED'
  | 'IN_TRANSIT'
  | 'ARRIVED'
  | 'UNLOADING'
  | 'COMPLETED'
  | 'RETURN_REQUESTED'
  | 'RETURNED'
  | 'EXCEPTION'
  | 'CANCELLED';

export type TripActorRole = 
  | 'DISPATCHER'
  | 'SCALE_OPERATOR'
  | 'DRIVER'
  | 'SITE_RECEIVER'
  | 'OPERATIONS_MANAGER'
  | 'AUDITOR';

export interface TripLifecycleEvent {
  eventId: string;
  tripId: string;
  action: string;
  fromStatus: TripEngineStatus;
  toStatus: TripEngineStatus;
  actorId: string;
  actorRole: TripActorRole;
  actorName: string;
  projectId: string;
  timestamp: string;
  reason?: string;
  payload?: Record<string, any>;
  version: number;
}

export interface TripAuditLog {
  auditId: string;
  tripId: string;
  action: string;
  fromStatus: TripEngineStatus;
  toStatus: TripEngineStatus;
  actorId: string;
  actorRole: TripActorRole;
  actorName: string;
  projectId: string;
  versionBefore: number;
  versionAfter: number;
  timestamp: string;
  details: string;
  diff?: Record<string, { before: any; after: any }>;
}

export interface TransitionContext {
  actorId: string;
  actorRole: TripActorRole;
  actorName: string;
  projectId: string;
  reason?: string;
  timestamp?: string;
}

export interface TransitionPayload {
  tareWeight?: number;
  grossWeight?: number;
  loaderId?: string;
  loadTime?: string;
  ticketId?: string;
  arrivalTime?: string;
  unloaderId?: string;
  destTareWeight?: number;
  destGrossWeight?: number;
  destNetWeight?: number;
  unloadTime?: string;
  reason?: string;
  resolutionNotes?: string;
  notes?: string;
}

export interface TripPricingSnapshot {
  pricingRuleId: string;
  pricingType: TripPricingType;
  agreedRate: number;
  currency: string;
  settlementBase: number;
  settlementAmount: number;
  ruleName?: string;
  pricingSnapshotAt: string;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface TripEntitySnapshot {
  carrier?: {
    carrierId: string;
    companyNameAr: string;
    commercialRegistrationNo?: string;
  };
  truck?: {
    truckId: string;
    plateNumberAr: string;
    truckType?: string;
    tareWeightKg?: number;
  };
  driver?: {
    driverId: string;
    fullNameAr: string;
    nationalOrIqamaId?: string;
    idNumber?: string;
    phone?: string;
  };
  material?: {
    materialId: string;
    nameAr: string;
    code: string;
    unitOfMeasure?: string;
  };
}

export interface TripRecord {
  tripId: string;
  projectId: string;
  tripSerial: string;
  ticketId: string;
  truckId: string;
  driverId: string;
  carrierId: string;
  materialId: string;
  shiftDate: string; // YYYY-MM-DD

  // Origin Weights (KG)
  tareWeight: number;
  grossWeight: number;
  netWeight: number; // calculated server-side: grossWeight - tareWeight

  // Destination Weights (KG)
  destNetWeight: number | null; // null until receipt
  varianceWeight: number | null; // null until destNetWeight exists: destNetWeight - netWeight

  // Pricing & Settlement (Calculated server-side only)
  pricingRuleId: string;
  pricingType: TripPricingType;
  agreedRate: number;
  currency: string;
  settlementBase: number; // tons if PER_TON, 1 if PER_TRIP
  settlementAmount: number; // settlementBase * agreedRate

  // Personnel
  loaderId: string | null;
  unloaderId: string | null;

  // Lifecycle & Concurrency
  status: TripEngineStatus;
  version: number; // Concurrency tracking, starts at 1

  // Timestamps (ISO strings)
  loadTime: string | null;
  arrivalTime: string | null;
  unloadTime: string | null;

  // Meta & Audit
  notes: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;

  // Historical Pricing Snapshot stored inside trip
  pricingSnapshot: TripPricingSnapshot;

  // Master Data snapshots for immutable auditing
  entitySnapshots?: TripEntitySnapshot;

  // Exceptions & Quality Compliance
  hasExceptions?: boolean;
  activeExceptionCount?: number;
}

export type UnloadingSearchResultStatus = 'NOT_FOUND' | 'CONTINUE' | 'AMBIGUOUS' | 'PLATE_ONLY_PROHIBITED';

export interface UnloadingSearchResult {
  status: UnloadingSearchResultStatus;
  matchedBy?: 'tripSerial' | 'ticketId' | 'truckId';
  trip?: TripRecord;
  candidateTrips?: TripRecord[];
  count: number;
  messageAr: string;
}

export interface UnloadingCompletionParams {
  tripId: string;
  destNetWeight: number;
  unloaderId: string;
  arrivalTime?: string;
  unloadTime?: string;
  notes?: string;
  toleranceKg?: number; // default e.g. 500 kg
  tolerancePercent?: number; // default e.g. 1.5%
  actorName?: string;
}

export interface UnloadingCompletionResult {
  trip: TripRecord;
  varianceWeight: number;
  variancePercent: number;
  isOutOfTolerance: boolean;
  toleranceThresholdKg: number;
  exceptionCreated?: any; // TripExceptionEntity
  event: TripLifecycleEvent;
  auditLog: TripAuditLog;
}

export interface CreateTripParams {
  tripId?: string;
  projectId: string;
  carrierId: string;
  truckId: string;
  driverId: string;
  materialId: string;
  pricingRuleId: string;
  shiftDate: string; // YYYY-MM-DD
  ticketId?: string;
  tareWeight: number;
  grossWeight: number;
  // Note: client-provided netWeight may be sent for testing, but MUST be rejected/overridden!
  clientNetWeight?: number;
  loaderId?: string | null;
  notes?: string;
  createdBy?: string;
}

export interface DestinationReceiptParams {
  tripId: string;
  projectId: string;
  destTareWeight?: number;
  destGrossWeight?: number;
  destNetWeight?: number;
  unloaderId: string;
  unloadTime?: string;
  notes?: string;
  updatedBy?: string;
}

export interface RuleValidationResult {
  passed: boolean;
  ruleCode: string;
  ruleDescriptionAr: string;
  messageAr: string;
  severity: 'CRITICAL' | 'SUCCESS';
}

export interface TripValidationReport {
  isValid: boolean;
  results: RuleValidationResult[];
  blockingError?: string;
}
