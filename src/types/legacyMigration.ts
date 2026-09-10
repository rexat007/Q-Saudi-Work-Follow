/**
 * Legacy Migration Types
 * 20 Legacy Operational Google Sheet Columns Transformation & Master Data Matching Engine
 * 
 * Strict constraints:
 * - Read-only source (No source sheet mutation)
 * - Preview-first workflow
 * - Master Data matching: carrier, material, truck, driver
 * - Candidate review required when strong potential match exists (No blind auto-creation)
 * - tripRate pricingType resolution: default to LEGACY_UNRESOLVED when ambiguous (No guessing PER_TRIP / PER_TON)
 * - Two-phase execution: Admin confirmation strictly required before commit
 */

import { TripEntity, TripStatus } from './entities';

/**
 * The exact 20 legacy operational columns from the Google Sheet
 */
export interface LegacySheetRow {
  projectId: string;        // 1. Project ID
  shiftDate: string;        // 2. Operational Shift Date (YYYY-MM-DD)
  ticketId: string;         // 3. Scale / Weighbridge Ticket ID
  carrier: string;          // 4. Carrier Name or Identifier
  truckNo: string;          // 5. Truck Number / Plate
  driverName: string;       // 6. Driver Name
  materialType: string;     // 7. Material Type / Name / Code
  tareWeight: number | string;      // 8. Tare Weight (KG)
  grossWeight: number | string;     // 9. Gross Weight (KG)
  netWeight: number | string;       // 10. Net Weight (KG)
  destNetWeight: number | string;   // 11. Destination Net Weight (KG)
  varianceWeight: number | string;  // 12. Scale Variance (KG)
  loader: string;           // 13. Origin Loader / Scale Operator
  unloader: string;         // 14. Destination Unloader / Receiver
  tripRate: number | string;        // 15. Contracted / Sheet Trip Rate
  status: string;           // 16. Operational Status
  tripSerial: number | string;      // 17. Trip Serial Number
  loadTime: string;         // 18. Dispatch / Loading Timestamp
  unloadTime: string;       // 19. Offload / Unload Timestamp
  note: string;             // 20. Remarks / Operations Notes
}

export type MatchStatus = 'EXACT_MATCH' | 'CANDIDATE_MATCH' | 'UNMATCHED';

export interface MatchCandidateOption {
  id: string;
  name: string;
  score: number; // 0.0 - 1.0 (Similarity confidence)
  details?: string;
  isStrongPotential: boolean; // >= 0.70
}

export interface MasterMatchCandidate {
  originalValue: string;
  status: MatchStatus;
  matchedId?: string;
  matchedName?: string;
  confidenceScore: number;
  candidates: MatchCandidateOption[];
  userDecision?: 'ACCEPT_CANDIDATE' | 'SELECT_EXISTING' | 'CREATE_NEW' | 'IGNORE';
  selectedId?: string;
  selectedName?: string;
}

export interface PricingResolution {
  originalRate: number;
  pricingType: 'PER_TRIP' | 'PER_TON' | 'PER_KM' | 'FLAT_RATE' | 'LEGACY_UNRESOLVED';
  isUnresolved: boolean;
  detectedRuleId?: string;
  ruleName?: string;
  explanation: string;
  resolvedRate: number;
  userAssignedType?: 'PER_TRIP' | 'PER_TON' | 'LEGACY_UNRESOLVED';
}

export interface MigrationRowItem {
  rowNumber: number;
  raw: LegacySheetRow;
  transformedTrip?: Partial<TripEntity>;
  
  // Master data matching candidates
  matchedCarrier: MasterMatchCandidate;
  matchedMaterial: MasterMatchCandidate;
  matchedTruck: MasterMatchCandidate;
  matchedDriver: MasterMatchCandidate;
  
  // Pricing resolution
  pricingResolution: PricingResolution;
  
  // Validation, Duplicates & Conflicts
  isValid: boolean;
  validationErrors: string[];
  validationWarnings: string[];
  
  isDuplicate: boolean;
  duplicateReason?: string;
  
  hasConflict: boolean;
  conflictReason?: string;
  
  reviewDecision: 'PENDING' | 'APPROVED' | 'REJECTED' | 'MODIFIED';
}

export interface MigrationReport {
  reportId: string;
  generatedAt: string;
  sourceSpreadsheetId: string;
  sheetTabName: string;
  readOnlyEnforced: boolean; // Must always be true
  
  // User requested report KPIs:
  rowsRead: number;
  rowsValid: number;
  rowsInvalid: number;
  matchedEntities: {
    carriers: number;
    materials: number;
    trucks: number;
    drivers: number;
    total: number;
  };
  unmatchedEntities: {
    carriers: number;
    materials: number;
    trucks: number;
    drivers: number;
    total: number;
  };
  pricingUnresolved: number;
  duplicates: number;
  conflicts: number;

  // Execution state
  isCommitted: boolean;
  committedAt?: string;
  committedBy?: string;
  committedBatchId?: string;
  committedTripsCount?: number;
  createdMasterRecordsCount?: number;
}
