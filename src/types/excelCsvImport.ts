/**
 * Types for Excel and CSV Import
 * BLOCK 31 — Excel / CSV Import on Unified Import Pipeline (BLOCK 30)
 */

import { OperationSourceType } from './entities';
import { ImportIssue } from './unifiedImport';

export interface FileIntakeValidationResult {
  isValid: boolean;
  fileType: 'EXCEL' | 'CSV' | 'UNSUPPORTED';
  fileName: string;
  fileSize: number;
  mimeType?: string;
  errors: string[];
}

/**
 * Standard Canonical Trip Model for Imported Rows
 */
export interface CanonicalTripRow {
  projectId: string;
  shiftDate?: string;
  ticketId?: string;
  carrier?: string;
  carrierId?: string;
  truckNo?: string;
  truckId?: string;
  driverName?: string;
  driverId?: string;
  materialType?: string;
  materialId?: string;
  tareWeight?: number;
  grossWeight?: number;
  netWeight?: number;
  destNetWeight?: number;
  varianceWeight?: number;
  loader?: string;
  unloader?: string;
  pricingRule?: string;
  weighTime?: string;
  loadTime?: string;
  unloadTime?: string;
  note?: string;
  isWeighbridgeOnly?: boolean;
  unloadDecision?: 'ACCEPT_ORIGIN_NET_AS_DESTINATION' | string;
  unloadingActorType?: 'USER' | 'IMPORT' | 'SYSTEM' | string;
  unloadingActorId?: string;
  unloadingDataSource?: 'WEIGHBRIDGE' | string;
  isAcceptedOriginNet?: boolean;
  isCalculatedNet?: boolean;
  netWeightSource?: 'SUPPLIED' | 'CALCULATED';
  [key: string]: any;
}

/**
 * Column Mapping Match Information
 */
export interface ColumnMappingMatch {
  headerName: string;
  canonicalField: keyof CanonicalTripRow | string;
  confidence: number; // 0.0 - 1.0
  matchType: 'EXACT' | 'NORMALIZED' | 'ALIAS' | 'TOKEN' | 'MANUAL';
  isAmbiguous?: boolean;
}

export interface SheetInfo {
  name: string;
  rowCount: number;
}
