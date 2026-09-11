import { Timestamp } from 'firebase/firestore';

export type PricingType = 'PER_TRIP' | 'PER_TON';
export type PricingRuleStatus = 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'DRAFT';

/**
 * Strict Pricing Rule Schema as mandated by specifications:
 * - pricingRuleId
 * - projectId
 * - carrierId
 * - materialId (nullable)
 * - pricingType (PER_TRIP | PER_TON)
 * - rate
 * - currency
 * - settlementBase
 * - effectiveFrom
 * - effectiveTo
 * - status
 * - version
 * - createdAt
 * - createdBy
 * - updatedAt
 */
export interface PricingRule {
  pricingRuleId: string;
  projectId: string;
  carrierId: string;
  materialId?: string | null;
  pricingType: PricingType;
  rate: number;
  currency: string;
  settlementBase?: string | number; // 'NET_WEIGHT' | 'TRIP'
  effectiveFrom: string; // YYYY-MM-DD or ISO
  effectiveTo?: string | null;   // YYYY-MM-DD or ISO
  status: PricingRuleStatus;
  version?: number;
  parentRuleId?: string;
  createdAt: string | Date | Timestamp;
  createdBy: string;
  updatedAt?: string | Date | Timestamp;
  updatedBy?: string;
  notes?: string;

  // Compatibility properties
  name?: string;
  baseRateSAR?: number;
  pricingModel?: string;
  isActive?: boolean;
  demurrageRatePerHourSAR?: number;
  freeTimeHours?: number;
}

/**
 * Immutable Historical Snapshot permanently attached to a Trip at dispatch/creation.
 * Ensures that if a master Pricing Rule is later edited or deleted, old trips retain
 * their original audited agreed rates and settlement calculations.
 */
export interface TripPricingSnapshot {
  pricingRuleId: string;
  pricingType: 'PER_TRIP' | 'PER_TON' | 'LEGACY_UNRESOLVED' | 'PER_KM' | 'FLAT_RATE';
  agreedRate: number;
  currency: string;
  settlementBase: number;       // 1 for PER_TRIP; Net Weight in Tons for PER_TON
  settlementAmount: number;     // Final calculated amount calculated exclusively by server
  pricingSnapshotAt: string;    // ISO timestamp of snapshot creation
  pricingRuleVersion?: number;
  carrierAgreementId?: string;
  materialId?: string | null;
  materialIdApplied?: string | null;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  formulaDescriptionAr?: string;
  isPending?: boolean;
  pendingReason?: string;

  // Backward-compatibility properties
  pricingModel?: string;
  baseRateSAR?: number;
  vatApplicable?: boolean;
  vatRatePercent?: number;
  demurrageRatePerHourSAR?: number;
  demurrageAmountSAR?: number;
  waitingDurationHours?: number;
  freeTimeHours?: number;
}

export type PricingResolutionStatus = 'RESOLVED' | 'NOT_FOUND' | 'AMBIGUOUS' | 'INVALID';

export interface PricingResolutionResult {
  status: PricingResolutionStatus;
  selectedRule: PricingRule | null;
  rule: PricingRule | null; // Alias for selectedRule for seamless backward compatibility
  reason: string;
  reasonAr: string;
  reasonCode: string;
  candidates: PricingRule[];
}

export interface ResolvePricingParams {
  projectId: string;
  carrierId: string;
  materialId?: string | null;
  tripDate: string | Date;      // Trip operational dispatch/execution date
  pricingType?: PricingType;
}

export interface CalculateSettlementParams {
  pricingRule: PricingRule | {
    pricingRuleId: string;
    pricingType: PricingType;
    rate: number;
    currency: string;
    settlementBase?: string | number;
    version?: number;
    materialId?: string | null;
    effectiveFrom?: string;
    effectiveTo?: string | null;
  };
  netWeightKg?: number;         // Weighbridge Net Weight in kilograms
  netWeightTon?: number;        // Weighbridge Net Weight in metric tons
  unitsCount?: number;          // Default 1 for PER_TRIP
  clientSuppliedAmount?: number; // Detected and rejected by server for security
  allowMissingWeight?: boolean;
}

export interface SettlementCalculationResult {
  pricingRuleId: string;
  pricingType: PricingType;
  agreedRate: number;
  currency: string;
  settlementBase: number;
  settlementAmount: number;
  calculationDetailsAr: string;
  pricingSnapshotAt: string;
  snapshot: TripPricingSnapshot;
  isPending?: boolean;
  pendingReason?: string;
}

