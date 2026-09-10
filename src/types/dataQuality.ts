/**
 * Data Quality Engine Type Definitions
 * Saudi Heavy Transport & Multi-Party Project Infrastructure
 */

export type MatchType = 'EXACT' | 'FUZZY' | 'RELATIONSHIP' | 'NO_MATCH';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type PipelineStep = 
  | 'RAW_VALUE'
  | 'NORMALIZE'
  | 'EXACT_MATCH'
  | 'FUZZY_MATCH'
  | 'RELATIONSHIP_VALIDATION'
  | 'BUSINESS_VALIDATION'
  | 'RISK_SCORE'
  | 'HUMAN_REVIEW';

export type QualityIssueCode = 
  | 'CARRIER_TRUCK_CONFLICT'
  | 'MATERIAL_NOT_ALLOWED'
  | 'CARRIER_NOT_ALLOWED'
  | 'DRIVER_CARRIER_CONFLICT'
  | 'FUZZY_SIMILARITY_WARNING'
  | 'INVALID_PLATE_FORMAT'
  | 'INVALID_PHONE_FORMAT'
  | 'INVALID_ID_NUMBER'
  | 'ILLEGAL_WEIGHT_CONFIGURATION'
  | 'INACTIVE_ENTITY_REFERENCED'
  | 'DUPLICATE_CANDIDATE';

export interface PipelineTraceStep {
  step: PipelineStep;
  nameAr: string;
  status: 'PASSED' | 'WARNING' | 'FAILED' | 'SKIPPED';
  details: string;
  executionMs?: number;
}

export interface MatchingCandidate {
  id: string;
  value: string;
  normalizedValue: string;
  entityType: 'CARRIER' | 'MATERIAL' | 'TRUCK' | 'DRIVER' | 'PROJECT';
  metadata?: Record<string, any>;
}

export interface MatchingResult {
  sourceValue: string;
  candidateId?: string;
  candidateValue?: string;
  matchScore: number; // 0 to 100
  matchType: MatchType;
  riskLevel: RiskLevel;
  reasons: string[];
  issueCodes: QualityIssueCode[];
  pipelineTrace: PipelineTraceStep[];
  
  // Actionability flags
  canAutoAccept: boolean;       // Only for LOW risk
  requiresConfirmation: boolean;// For MEDIUM risk
  requiresExplicitDecision: boolean; // For HIGH risk
  isBlocked: boolean;           // For CRITICAL risk: cannot import until resolved
  
  // Recommended action guidance
  recommendedAction: 'AUTO_ACCEPT' | 'REQUIRE_CONFIRMATION' | 'MANUAL_REVIEW' | 'BLOCK_AND_RESOLVE';
  explanationAr: string;
}

export interface RelationshipContext {
  projectId: string;
  authorizedCarrierIds: string[];
  authorizedMaterialIds: string[];
  knownCarriers: { carrierId: string; name: string; status: 'ACTIVE' | 'INACTIVE' }[];
  knownTrucks: { truckId: string; plate: string; carrierId: string; status: 'ACTIVE' | 'INACTIVE' }[];
  knownDrivers: { driverId: string; name: string; phone?: string; idNumber?: string; carrierId: string; status: 'ACTIVE' | 'INACTIVE' }[];
  knownMaterials: { materialId: string; name: string; code: string; status: 'ACTIVE' | 'INACTIVE' }[];
}

export interface ImportRecordPayload {
  rowId: string;
  sourceSheet?: string;
  carrierInput?: {
    carrierId?: string;
    rawName: string;
  };
  truckInput?: {
    truckId?: string;
    rawPlate: string;
    carrierId?: string;
    tareKg?: number;
    grossKg?: number;
  };
  driverInput?: {
    driverId?: string;
    rawName: string;
    rawPhone?: string;
    rawIdNumber?: string;
    carrierId?: string;
  };
  materialInput?: {
    materialId?: string;
    rawName: string;
    rawCode?: string;
  };
  status?: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'RESOLVED';
  resolutionNote?: string;
}

export interface BatchQualityReport {
  totalRecords: number;
  lowRiskCount: number;
  mediumRiskCount: number;
  highRiskCount: number;
  criticalRiskCount: number;
  conflictsCount: number;
  records: {
    record: ImportRecordPayload;
    carrierResult?: MatchingResult;
    truckResult?: MatchingResult;
    driverResult?: MatchingResult;
    materialResult?: MatchingResult;
    overallRisk: RiskLevel;
    hasBlockingIssue: boolean;
  }[];
}
