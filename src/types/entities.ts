import { Timestamp } from 'firebase/firestore';
import { BaseAuditedEntity } from './common';

// 1. Project Entity
export interface ProjectEntity extends BaseAuditedEntity {
  projectId: string;
  projectCode?: string;
  nameAr: string;
  nameEn: string;
  clientName: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  location: {
    lat: number;
    lng: number;
    geoFenceRadiusMeters: number;
    addressAr: string;
  };
  settings: {
    zatcaTaxNumber: string; // 15 digits
    vatRatePercent: number; // 15%
    googleDriveFolderId?: string;
    googleSpreadsheetId?: string;
    allowDriverSelfDispatch: boolean;
    currency?: string;
    requireTareOnExit?: boolean;
    maxToleranceKg?: number;
    googleDriveProvisioning?: {
      enabled: boolean;
      rootFolderName?: string;
      spreadsheetTitle?: string;
      status?: 'PROVISIONED' | 'DISABLED';
    };
  };
  authorizedCarrierIds?: string[];
  authorizedMaterialIds?: string[];
  status: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED' | 'PLANNING';
}

// 2. Carrier Entity
export interface CarrierEntity extends BaseAuditedEntity {
  carrierId: string;
  name: string;
  normalizedName: string;
  status: 'ACTIVE' | 'INACTIVE';
  projectId: string;
  companyNameAr?: string; // backward compat
  commercialRegistrationNo?: string; // 10 digits
  transportLicenseNo?: string;       // TGA License
  contactPerson?: {
    name: string;
    phone: string;
    email: string;
  };
  defaultPricingRuleId?: string;
  isActive?: boolean;
}

// 3. Pricing Rule Entity
export interface PricingRuleEntity extends BaseAuditedEntity {
  pricingRuleId: string;
  projectId: string;
  carrierId?: string; // Optional: carrier-specific tariff
  materialId?: string;
  name: string;
  pricingModel: 'PER_TON' | 'PER_TRIP' | 'PER_KM' | 'FLAT_RATE';
  baseRateSAR: number;
  currency?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  notes?: string;
  minimumBillableWeightKg?: number;
  demurrageRatePerHourSAR: number;
  freeTimeHours: number;
  vatApplicable: boolean;
  status?: 'ACTIVE' | 'INACTIVE';
  isActive: boolean;
}

// 4. Material Entity
export interface MaterialEntity extends BaseAuditedEntity {
  materialId: string;
  name: string;
  normalizedName: string;
  code: string;
  status: 'ACTIVE' | 'INACTIVE';
  projectId: string;
  nameAr?: string; // backward compat
  unitOfMeasure?: 'TON' | 'M3' | 'TRIP';
  sortOrder?: number;
  standardDensityTonPerM3?: number;
  maxAllowableMoisturePercent?: number;
  isActive?: boolean;
}

// 5. Truck Entity
export interface TruckEntity extends BaseAuditedEntity {
  truckId: string;
  plate: string;
  normalizedPlate: string;
  carrierId: string;
  status: 'ACTIVE' | 'INACTIVE';
  projectId: string;
  plateNumberAr?: string; // backward compat
  plateNumberEn?: string;
  truckType?: 'TIPPER_32M3' | 'TRAILER_24M' | 'FLATBED' | 'DUMPER';
  tareWeightKg?: number;
  maxGrossWeightKg?: number;
  legalPayloadLimitKg?: number; // maxGrossWeightKg - tareWeightKg
  mvpiValidUntil?: Timestamp | Date;
  insuranceValidUntil?: Timestamp | Date;
  isActive?: boolean;
}

// 6. Driver Entity
export interface DriverEntity extends BaseAuditedEntity {
  driverId: string;
  name: string;
  normalizedName: string;
  phone: string;
  idNumber: string;
  carrierId: string;
  status: 'ACTIVE' | 'INACTIVE';
  projectId: string;
  fullNameAr?: string; // backward compat
  nationalOrIqamaId?: string; // backward compat
  licenseNumber?: string;
  licenseValidUntil?: Timestamp | Date;
  currentAssignedTruckId?: string;
  isActive?: boolean;
}

// 7. User Entity
export interface UserEntity extends BaseAuditedEntity {
  userId: string;
  email: string;
  fullName: string;
  role: 'PROJECT_ADMIN' | 'SUPER_ADMIN' | 'SITE_SUPERVISOR' | 'SUPERVISOR' | 'DISPATCHER' | 'FINANCE_AUDITOR' | 'SCALE_OPERATOR' | 'DRIVER' | 'VIEWER';
  assignedProjectIds: string[];
  isActive: boolean;
}

// Operation Source Model (BLOCK 29)
export type OperationSourceType =
  | 'MANUAL'
  | 'WEIGHBRIDGE'
  | 'EXCEL'
  | 'CSV'
  | 'GOOGLE_SHEETS'
  | 'GOOGLE_DRIVE'
  | 'API'
  | 'MIGRATION';

export type OperationActorType =
  | 'USER'
  | 'IMPORT'
  | 'SYSTEM';

export interface TripSourceMetadata {
  importBatchId?: string;
  sourceFileId?: string;
  sourceFileName?: string;
  sourceSheetName?: string;
  sourceRowId?: string | number;
  sourceMimeType?: string;
}

// 8. Trip Entity
export type TripStatus = 
  | 'DRAFT'
  | 'DISPATCHED'
  | 'AT_ORIGIN'
  | 'LOADING'
  | 'WEIGHED_ORIGIN'
  | 'IN_TRANSIT'
  | 'AT_DESTINATION'
  | 'WEIGHED_DESTINATION'
  | 'OFFLOADED'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED';

export interface TripEntity extends BaseAuditedEntity {
  tripId: string;
  tripNumber: string; // e.g. "TRP-2026-00100"
  projectId: string;
  carrierId: string;
  truckId: string;
  driverId: string;
  materialId: string;
  pricingRuleId: string;

  // Operation Source Model (BLOCK 29)
  sourceType?: OperationSourceType;
  loadingDataSource?: OperationSourceType;
  unloadingDataSource?: OperationSourceType | null;
  loadingActorType?: OperationActorType;
  loadingActorId?: string | null;
  unloadingActorType?: OperationActorType | null;
  unloadingActorId?: string | null;
  sourceMetadata?: TripSourceMetadata;

  // Snapshots (Historical immutability)
  carrierSnapshot: {
    carrierId: string;
    companyNameAr: string;
    commercialRegistrationNo: string;
  };
  truckSnapshot: {
    truckId: string;
    plateNumberAr: string;
    tareWeightKg: number;
    legalPayloadLimitKg: number;
  };
  driverSnapshot: {
    driverId: string;
    fullNameAr: string;
    nationalOrIqamaId: string;
    phone: string;
  };
  materialSnapshot: {
    materialId: string;
    code: string;
    nameAr: string;
    unitOfMeasure: string;
  };
  pricingSnapshot: {
    pricingRuleId: string;
    pricingType: 'PER_TRIP' | 'PER_TON' | 'LEGACY_UNRESOLVED' | 'PER_KM' | 'FLAT_RATE';
    agreedRate: number;
    currency: string;
    settlementBase: number;
    settlementAmount: number;
    pricingSnapshotAt: string;
    // Backwards compatibility helpers
    pricingModel?: string;
    baseRateSAR?: number;
    vatApplicable?: boolean;
    vatRatePercent?: number;
  };

  status: TripStatus;

  // Weights
  weights: {
    originTareKg?: number;
    originGrossKg?: number;
    originNetKg?: number;
    originTicketNo?: string;
    originTicketDriveFileId?: string;

    destinationTareKg?: number;
    destinationGrossKg?: number;
    destinationNetKg?: number;
    destinationTicketNo?: string;
    destinationTicketDriveFileId?: string;

    billableWeightKg?: number;
  };

  // Financials
  financials: {
    baseAmountSAR: number;
    demurrageAmountSAR: number;
    deductionsAmountSAR: number;
    subtotalSAR: number;
    vatAmountSAR: number;
    totalAmountSAR: number;
    currency: 'SAR';
    isFinalized: boolean;
    finalizedAt?: Timestamp | Date;
  };

  clientUUID: string;
  syncStatus: 'SYNCED' | 'PENDING' | 'CONFLICT';
  hasExceptions: boolean;
  activeExceptionCount: number;
}

// 9. Trip Event Entity
export interface TripEventEntity extends BaseAuditedEntity {
  eventId: string;
  tripId: string;
  projectId: string;
  eventType: 
    | 'EVENT_DISPATCHED'
    | 'EVENT_ORIGIN_ARRIVAL'
    | 'EVENT_WEIGHBRIDGE_ORIGIN_CAPTURED'
    | 'EVENT_DEPART_ORIGIN'
    | 'EVENT_DESTINATION_ARRIVAL'
    | 'EVENT_WEIGHBRIDGE_DESTINATION_CAPTURED'
    | 'EVENT_CARGO_OFFLOADED'
    | 'EVENT_TRIP_COMPLETED'
    | 'EVENT_EXCEPTION_RAISED';
  statusResulting: TripStatus;
  sourceType?: OperationSourceType;
  actorType?: OperationActorType;
  sourceMetadata?: TripSourceMetadata;
  actor: {
    userId: string;
    role: string;
    displayName: string;
  };
  deviceTimestamp: string;
  serverTimestamp: Timestamp | Date;
  location?: {
    latitude: number;
    longitude: number;
    accuracyMeters?: number;
  };
  payload: Record<string, any>;
  idempotencyKey: string;
}

// 10. Trip Exception Entity
export interface TripExceptionEntity extends BaseAuditedEntity {
  exceptionId: string;
  tripId: string | null; // nullable as requested for system-level exceptions
  projectId: string;
  type: 
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
    | 'VERSION_CONFLICT'
    | 'OVERWEIGHT_VIOLATION'
    | 'WEIGHT_DISCREPANCY'
    | 'ROUTE_DEVIATION'
    | 'EXCESSIVE_TRANSIT_TIME'
    | 'DAMAGED_CARGO'
    | 'VEHICLE_BREAKDOWN'
    | 'OFF_HOURS_MOVEMENT';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'BLOCKING' | 'CRITICAL';
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'REJECTED' | 'INVESTIGATING' | 'WAIVED';
  description?: string;
  evidence?: Record<string, any>;
  openedAt?: string;
  openedBy?: string;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  resolutionNote?: string | null;
  reasonAr: string;
  reportedBy: {
    userId: string;
    displayName: string;
  };
  resolution?: {
    resolvedByUserId: string;
    resolutionNotes: string;
    financialPenaltySAR?: number;
    resolvedAt: Timestamp | Date;
  } | string | null;
}

// 11. Audit Log Entity
export interface AuditLogEntity extends BaseAuditedEntity {
  auditLogId: string;
  projectId: string;
  entityType: 'TRIP' | 'PRICING_RULE' | 'TRUCK' | 'CARRIER' | 'PROJECT' | 'USER_ROLE' | 'FINANCIAL_ADJUSTMENT' | 'EXCEPTION' | 'MIGRATION_BATCH' | 'IMPORT_BATCH';
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'FORCE_STATUS_CHANGE' | 'RECALCULATE_PRICING' | 'WAIVE_EXCEPTION' | 'COMMIT_LEGACY_MIGRATION' | 'COMMIT_IMPORT_BATCH';
  actor: {
    userId: string;
    email: string;
    role: string;
    ipAddress?: string;
    userAgent?: string;
  };
  changes: {
    before: Record<string, any> | null;
    after: Record<string, any>;
    deltaFields: string[];
  };
  correlationId: string;
}

// 12. Sync Operation Entity
export interface SyncOperationEntity extends BaseAuditedEntity {
  operationId: string; // equal to client idempotencyKey
  projectId: string;
  clientOperationUUID: string;
  targetCollection: string;
  targetDocId: string;
  status: 'PROCESSED' | 'FAILED' | 'REJECTED';
  processedResponse: Record<string, any>;
  ttl?: Timestamp | Date;
}

// 13. Import Batch Entity
export interface ImportBatchEntity extends BaseAuditedEntity {
  batchId: string;
  projectId: string;
  batchType: 'FLEET_IMPORT' | 'DRIVER_IMPORT' | 'WEIGHBRIDGE_IMPORT' | 'LEGACY_TRIPS';
  sourceFileName?: string;
  totalRecords: number;
  processedRecords: number;
  failedRecords: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  errorSummary?: string[];
}
