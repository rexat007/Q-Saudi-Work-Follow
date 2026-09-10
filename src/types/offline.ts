/**
 * Types and interfaces for Offline-First PWA, IndexedDB storage, and Outbox sync engine.
 */

export type OutboxStatus = 'PENDING' | 'SENDING' | 'SYNCED' | 'FAILED' | 'CONFLICT';

export interface OutboxOperation {
  operationId: string;
  projectId: string;
  userId: string;
  deviceId: string;
  operationType: 
    | 'CREATE_TRIP_LOADING' 
    | 'UPDATE_TRIP_STATUS' 
    | 'RECORD_RECEIPT' 
    | 'REPORT_EXCEPTION';
  payload: Record<string, any>;
  createdAt: string; // ISO 8601 string
  retryCount: number;
  status: OutboxStatus;
  
  // Tracking & Idempotency / Server ACK Details
  errorReason?: string;
  syncedAt?: string;
  serverAck?: {
    tripId?: string;
    tripSerial?: string;
    serverVersion?: number;
    committedAt?: string;
    messageAr?: string;
  };
  conflictDetails?: {
    clientVersion?: number;
    serverVersion?: number;
    conflictField?: string;
    messageAr?: string;
  };
}

export type CacheStoreName = 
  | 'projects' 
  | 'carriers' 
  | 'materials' 
  | 'trucks' 
  | 'drivers' 
  | 'pricingRules' 
  | 'trips';

export interface CacheStoreMetadata {
  storeName: CacheStoreName;
  version: number;
  timestamp: string; // ISO 8601 string
  recordCount: number;
  lastSyncedBy?: string;
}

export interface CachedEntityMeta {
  _version: number;
  _cachedAt: string; // ISO 8601 string
  _syncStatus?: 'SYNCED' | 'PENDING' | 'CONFLICT';
}

export interface CachedProject {
  projectId: string;
  projectCode: string;
  nameAr: string;
  nameEn?: string;
  clientName?: string;
  authorizedCarrierIds: string[];
  authorizedMaterialIds: string[];
  status: 'ACTIVE' | 'PLANNING' | 'SUSPENDED' | 'ARCHIVED' | 'INACTIVE';
  _version: number;
  _cachedAt: string;
}

export interface CachedCarrier {
  carrierId: string;
  projectId: string;
  name: string;
  companyNameAr: string;
  commercialRegistrationNo: string;
  transportLicenseNo?: string;
  status: 'ACTIVE' | 'INACTIVE';
  _version: number;
  _cachedAt: string;
}

export interface CachedMaterial {
  materialId: string;
  projectId: string;
  name: string;
  nameAr?: string;
  code: string;
  unitOfMeasure: string;
  standardDensityTonPerM3?: number;
  status: 'ACTIVE' | 'INACTIVE';
  _version: number;
  _cachedAt: string;
}

export interface CachedTruck {
  truckId: string;
  carrierId: string;
  projectId?: string;
  plate: string;
  plateNumberAr?: string;
  truckType?: string;
  tareWeightKg?: number;
  legalPayloadLimitKg?: number;
  status: 'ACTIVE' | 'INACTIVE';
  _version: number;
  _cachedAt: string;
}

export interface CachedDriver {
  driverId: string;
  carrierId: string;
  projectId?: string;
  name: string;
  fullNameAr?: string;
  phone: string;
  idNumber: string;
  status: 'ACTIVE' | 'INACTIVE';
  _version: number;
  _cachedAt: string;
}

export interface CachedPricingRule {
  pricingRuleId: string;
  projectId: string;
  name: string;
  pricingType: 'PER_TON' | 'PER_TRIP';
  agreedRate: number;
  currency: string;
  effectiveFrom: string;
  effectiveTo: string;
  carrierId?: string;
  materialId?: string;
  status: 'ACTIVE' | 'INACTIVE';
  _version: number;
  _cachedAt: string;
}

export interface OfflineTripPrerequisitesReport {
  isReadyForOfflineCreation: boolean;
  hasProject: boolean;
  hasCarrier: boolean;
  hasTruck: boolean;
  hasDriver: boolean;
  hasMaterial: boolean;
  hasPricingRule: boolean;
  pricingRule?: CachedPricingRule;
  blockingReasonAr?: string;
  warningsAr: string[];
}

export interface OutboxStats {
  total: number;
  pending: number;
  sending: number;
  synced: number;
  failed: number;
  conflict: number;
}
