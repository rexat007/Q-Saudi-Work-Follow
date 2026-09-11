/**
 * BLOCK 35: Entity Resolution & Intelligent Data Quality Types
 * 
 * Defines contracts for entity resolution, relationship validation,
 * confidence scoring, risk evaluation, and human decision auditing.
 * 
 * Complies with Saudi Heavy Transport logistics domain and Unified Import Pipeline.
 */

export type EntityResolutionMethod = 'EXACT' | 'NORMALIZED' | 'ALIAS' | 'FUZZY' | 'NONE';

export type ResolutionRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type EntityResolutionRecommendation = 'ACCEPT' | 'REVIEW' | 'REJECT' | 'UNKNOWN';

export type RelationshipStatus = 
  | 'VALID'
  | 'RELATIONSHIP_CONFLICT'
  | 'TRUCK_MATCHED_CARRIER_UNKNOWN'
  | 'DRIVER_CARRIER_CONFLICT'
  | 'MATERIAL_PROJECT_CONFLICT'
  | 'CROSS_PROJECT_BLOCKED'
  | 'NOT_APPLICABLE';

export type TargetEntityType = 'CARRIER' | 'TRUCK' | 'DRIVER' | 'MATERIAL' | 'PROJECT' | 'PRICING_RULE';

/**
 * Candidate entity match proposal
 */
export interface EntityResolutionCandidate {
  candidateEntityId: string;
  candidateDisplayName: string;
  confidence: number; // 0.0 to 1.0
  matchMethod: EntityResolutionMethod;
  normalizedValue: string;
  projectId?: string;
  metadata?: Record<string, any>;
}

/**
 * Result of entity resolution for a single field in an imported row
 */
export interface EntityResolutionItem {
  entityType: TargetEntityType;
  sourceValue: string;        // Raw original value (strictly preserved)
  normalizedValue: string;    // Normalized representation
  matchedValue?: string;      // Resolved or proposed display value
  entityId?: string;          // Matched or proposed entity ID
  confidence: number;         // 0.0 to 1.0 (e.g. 1.0, 0.92, 0.75, 0.0)
  matchMethod: EntityResolutionMethod;
  riskLevel: ResolutionRiskLevel;
  relationshipStatus: RelationshipStatus;
  recommendation: EntityResolutionRecommendation;
  
  isExact: boolean;
  isAuthorized: boolean;
  
  conflictDetails?: string;
  candidates?: EntityResolutionCandidate[];
  ambiguous?: boolean;
  
  // Backward compatibility with ImportEntityResolutionInfo from BLOCK 30
  originalValue: string;
  matchedId?: string;
  matchedName?: string;
}

/**
 * Master entity records supplied to resolution engine
 */
export interface MasterCarrierRecord {
  carrierId: string;
  name: string;
  aliases?: string[];
  projectId?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface MasterTruckRecord {
  truckId: string;
  plate: string;
  carrierId?: string;
  projectId?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface MasterDriverRecord {
  driverId: string;
  name: string;
  carrierId?: string;
  phone?: string;
  projectId?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface MasterMaterialRecord {
  materialId: string;
  name: string;
  code?: string;
  projectId?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

/**
 * Configuration for the entity resolution engine
 */
export interface EntityResolutionConfig {
  highConfidenceThreshold: number;   // default: 0.90
  fuzzyConfidenceThreshold: number;  // default: 0.65
  ambiguityMargin: number;           // default: 0.05
  autoAcceptAllowed: boolean;        // default: true (strictly for LOW risk only)
}

/**
 * Audit trail entry for manual entity resolution decisions
 */
export interface EntityResolutionAuditEntry {
  projectId: string;
  importBatchId: string;
  operationId: string;
  rowId: string | number;
  entityType: TargetEntityType;
  sourceValue: string;
  selectedEntityId?: string;
  previousResolution?: Partial<EntityResolutionItem>;
  newResolution?: Partial<EntityResolutionItem>;
  confidence: number;
  matchMethod: EntityResolutionMethod;
  riskLevel: ResolutionRiskLevel;
  actorId: string;
  timestamp: string;
  decision: 'ACCEPT_CANDIDATE' | 'REJECT_CANDIDATE' | 'SELECT_ALTERNATE' | 'LEAVE_UNRESOLVED' | string;
  notes?: string;
}

/**
 * Approved alias record for learning / alias memory
 */
export interface ApprovedAliasEntry {
  aliasId: string;
  projectId: string;
  entityType: TargetEntityType;
  aliasText: string;
  normalizedAlias: string;
  targetEntityId: string;
  targetDisplayName: string;
  approvedBy: string;
  approvedAt: string;
}
