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
 * - effectiveFrom
 * - effectiveTo
 * - status
 * - createdAt
 * - createdBy
 * - updatedAt
 */
export interface PricingRule {
  pricingRuleId: string;
  projectId: string;
  carrierId: string;
  materialId: string | null;
  pricingType: PricingType;
  rate: number;
  currency: string;
  effectiveFrom: string; // YYYY-MM-DD or ISO
  effectiveTo: string;   // YYYY-MM-DD or ISO
  status: PricingRuleStatus;
  createdAt: string | Date | Timestamp;
  createdBy: string;
  updatedAt: string | Date | Timestamp;
  updatedBy?: string;
  notes?: string;
}

/**
 * Immutable Historical Snapshot permanently attached to a Trip at dispatch/creation.
 * Ensures that if a master Pricing Rule is later edited or deleted, old trips retain
 * their original audited agreed rates and settlement calculations.
 */
export interface TripPricingSnapshot {
  pricingRuleId: string;
  pricingType: PricingType;
  agreedRate: number;
  currency: string;
  settlementBase: number;       // 1 for PER_TRIP; Net Weight in Tons for PER_TON
  settlementAmount: number;     // Final calculated amount calculated exclusively by server
  pricingSnapshotAt: string;    // ISO timestamp of snapshot creation
  materialIdApplied?: string | null;
  formulaDescriptionAr?: string;
}

export interface ResolvePricingParams {
  projectId: string;
  carrierId: string;
  materialId?: string | null;
  tripDate: string | Date;      // Trip operational dispatch/execution date
}

export interface CalculateSettlementParams {
  pricingRule: PricingRule | {
    pricingRuleId: string;
    pricingType: PricingType;
    rate: number;
    currency: string;
  };
  netWeightKg?: number;         // Weighbridge Net Weight in kilograms
  netWeightTon?: number;        // Weighbridge Net Weight in metric tons
  unitsCount?: number;          // Default 1 for PER_TRIP
  clientSuppliedAmount?: number; // Detected and rejected by server for security
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
}
