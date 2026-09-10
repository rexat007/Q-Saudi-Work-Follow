/**
 * Types & Data Contract for Standalone Weight Engine
 * 
 * Strict Validation Constraints:
 * - tare > 0
 * - gross > tare
 * - net > 0
 * - received > 0
 * - Missing values MUST be null, NEVER 0!
 */

export type ToleranceRuleStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export type ToleranceEvaluationOutput = 'NORMAL' | 'WARNING' | 'EXCEPTION';

export interface ToleranceRule {
  ruleId?: string;
  projectId: string;
  materialId: string;
  absoluteTolerance: number | null; // e.g. in KG (e.g. 500)
  percentageTolerance: number | null; // e.g. in % (e.g. 1.5)
  status: ToleranceRuleStatus;
  nameAr?: string;
  warningRatio?: number; // ratio of threshold that triggers WARNING (default: 0.75)
}

export interface NetWeightResult {
  netWeight: number | null; // Null on missing or invalid, NEVER 0
  isValid: boolean;
  validationErrors: string[];
  tare: number | null;
  gross: number | null;
}

export interface VarianceResult {
  variance: number | null; // receivedNet - loadedNet. Null on missing or invalid, NEVER 0
  variancePercentage: number | null; // (variance / loadedNet) * 100. Null if missing, NEVER 0
  isValid: boolean;
  validationErrors: string[];
  loadedNet: number | null;
  receivedNet: number | null;
}

export interface ToleranceEvaluationResult {
  status: ToleranceEvaluationOutput; // 'NORMAL' | 'WARNING' | 'EXCEPTION'
  isValid: boolean;
  validationErrors: string[];
  variance: number | null;
  absVariance: number | null;
  variancePercentage: number | null;
  rule: ToleranceRule | null;
  toleranceTypeApplied: 'ABSOLUTE' | 'PERCENTAGE' | 'BOTH' | 'NONE';
  limitKg: number | null;
  limitPercentage: number | null;
  warningLimitKg: number | null;
  isException: boolean;
  isWarning: boolean;
  isNormal: boolean;
  messageAr: string;
}

export interface WeightSettlementResult {
  settlementAmount: number | null; // Null on missing or invalid, NEVER 0
  pricingType: 'PER_TON' | 'PER_TRIP' | null;
  agreedRate: number | null;
  currency: string;
  netWeight: number | null;
  billableTons: number | null;
  formula: string;
  isValid: boolean;
  validationErrors: string[];
}
