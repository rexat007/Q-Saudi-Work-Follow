export type ProjectStatus = 'ACTIVE' | 'PLANNING' | 'SUSPENDED' | 'ARCHIVED';
export type EntityStatus = 'ACTIVE' | 'DISABLED';
export type PricingType = 'PER_TRIP' | 'PER_TON';
export type UnitOfMeasure = 'TON' | 'M3' | 'TRIP';
export type UserRole = 'PROJECT_ADMIN' | 'DISPATCHER' | 'FINANCE_AUDITOR' | 'VIEWER';

export interface ProjectInfoStep {
  projectCode: string;
  projectName: string;
  clientName: string;
  description: string;
  status: ProjectStatus;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD (optional or empty)
  defaultSettings: {
    currency: string;
    vatRatePercent: number;
    zatcaTaxNumber: string;
    requireTareOnExit: boolean;
    maxToleranceKg: number;
    allowDriverSelfDispatch: boolean;
    addressAr: string;
    geoFenceRadiusMeters: number;
  };
}

export interface WizardMaterialItem {
  id: string; // Temporary local ID for keys
  materialId: string;
  materialName: string;
  materialCode: string;
  unitOfMeasure: UnitOfMeasure;
  status: EntityStatus;
  sortOrder: number;
  standardDensityTonPerM3?: number;
}

export interface WizardCarrierItem {
  id: string; // Temporary local ID
  carrierId: string;
  carrierName: string;
  commercialRegistrationNo: string;
  transportLicenseNo: string;
  status: EntityStatus;
  contactPersonName: string;
  contactPhone: string;
  contactEmail: string;
}

export interface WizardPricingRuleItem {
  id: string; // Temporary local ID
  pricingRuleId: string;
  carrierId: string; // carrierId or 'ALL'
  pricingType: PricingType;
  rate: number;
  currency: string;
  effectiveFrom: string; // YYYY-MM-DD
  effectiveTo: string;   // YYYY-MM-DD (empty = indefinite / open)
  materialId: string;    // specific materialId or 'ALL_MATERIALS'
  notes: string;
  minimumBillableWeightKg?: number;
  demurrageRatePerHourSAR?: number;
  freeTimeHours?: number;
  vatApplicable: boolean;
}

export interface WizardUserAccessItem {
  userId: string;
  fullName: string;
  email: string;
  role: UserRole;
  isAssigned: boolean;
}

export interface WizardGoogleDriveProvisioning {
  enabled: boolean;
  rootFolderName: string;
  provisionSpreadsheet: boolean;
  spreadsheetTitle: string;
  autoSyncTickets: boolean;
  archiveDailyTrips: boolean;
  folderStructure: string[];
  generatedFolderId?: string;
  generatedSpreadsheetId?: string;
}

export interface ProjectSetupWizardData {
  projectInfo: ProjectInfoStep;
  materials: WizardMaterialItem[];
  carriers: WizardCarrierItem[];
  pricingRules: WizardPricingRuleItem[];
  userAccess: WizardUserAccessItem[];
  googleDrive: WizardGoogleDriveProvisioning;
}

export interface PricingOverlapConflict {
  rule1Id: string;
  rule2Id: string;
  carrierId: string;
  carrierName?: string;
  pricingType: PricingType;
  materialId: string;
  materialName?: string;
  period1: { from: string; to: string };
  period2: { from: string; to: string };
  messageAr: string;
  messageEn: string;
}

export interface StepValidationResult {
  step: number;
  stepKey: 'info' | 'materials' | 'carriers' | 'pricing' | 'access' | 'google' | 'review';
  titleAr: string;
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface WizardFullValidation {
  isValid: boolean;
  stepResults: StepValidationResult[];
  pricingConflicts: PricingOverlapConflict[];
  totalErrors: number;
}

export interface ProjectProvisioningResult {
  success: boolean;
  projectId: string;
  projectCode: string;
  projectName: string;
  materialsCount: number;
  carriersCount: number;
  pricingRulesCount: number;
  assignedUsersCount: number;
  googleDriveProvisioned: boolean;
  createdAt: string;
  auditLogId: string;
  error?: string;
  messageAr?: string;
  messageEn?: string;
}
