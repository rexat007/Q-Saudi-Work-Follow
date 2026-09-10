export interface CommonTranslations {
  appName: string;
  appSubtitle: string;
  enterpriseArch: string;
  ksaLogistics: string;
  save: string;
  cancel: string;
  delete: string;
  edit: string;
  update: string;
  create: string;
  new: string;
  search: string;
  filter: string;
  reset: string;
  refresh: string;
  close: string;
  back: string;
  next: string;
  previous: string;
  submit: string;
  confirm: string;
  yes: string;
  no: string;
  actions: string;
  status: string;
  date: string;
  time: string;
  total: string;
  details: string;
  view: string;
  download: string;
  export: string;
  print: string;
  share: string;
  copy: string;
  copied: string;
  loading: string;
  processing: string;
  success: string;
  failed: string;
  warning: string;
  info: string;
  error: string;
  noData: string;
  selectAll: string;
  deselectAll: string;
  language: string;
  arabic: string;
  english: string;
  urdu: string;
  direction: string;
  currencySAR: string;
  perTon: string;
  perTrip: string;
  perKm: string;
  flatRate: string;
  weightKg: string;
  weightTon: string;
  project: string;
  carrier: string;
  truck: string;
  driver: string;
  material: string;
  plateNumber: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  byUser: string;
  online: string;
  offline: string;
  syncing: string;
  all: string;
  searchPlaceholder: string;
}

export interface AuthTranslations {
  login: string;
  logout: string;
  signedInAs: string;
  guest: string;
  switchAccount: string;
  unauthorized: string;
  accessDenied: string;
  role: string;
  roles: {
    ADMIN: string;
    SUPER_ADMIN: string;
    PROJECT_ADMIN: string;
    LOADING_SUPERVISOR: string;
    UNLOADING_SUPERVISOR: string;
    SITE_SUPERVISOR: string;
    DISPATCHER: string;
    FINANCE_AUDITOR: string;
    VIEWER: string;
  };
  permissions: string;
  sessionExpired: string;
  authenticating: string;
  signInWithGoogle: string;
  userProfile: string;
  accountSettings: string;
  anonymousMode: string;
}

export interface DashboardTranslations {
  title: string;
  subtitle: string;
  overview: string;
  activeTrips: string;
  completedToday: string;
  pendingUnload: string;
  totalTonnage: string;
  grossWeight: string;
  netWeight: string;
  revenueSAR: string;
  demurrageSAR: string;
  fleetUtilization: string;
  liveOperations: string;
  activeProjects: string;
  carriersActive: string;
  quickActions: string;
  recentActivity: string;
  liveFeed: string;
  dispatchedVsDelivered: string;
  performanceMetrics: string;
  hourlyThroughput: string;
  complianceRate: string;
  auditCoverage: string;
  systemHealth: string;
}

export interface ProjectsTranslations {
  projects: string;
  projectCode: string;
  projectName: string;
  clientName: string;
  contractNumber: string;
  startDate: string;
  endDate: string;
  assignedSites: string;
  originSite: string;
  destinationSite: string;
  geofenceStatus: string;
  activeContract: string;
  switchProject: string;
  allProjects: string;
  projectDetails: string;
  budget: string;
  targetTonnage: string;
  isolationNotice: string;
}

export interface OperationsTranslations {
  operationalCenter: string;
  dispatchControl: string;
  liveTrips: string;
  weightStations: string;
  scaleStatus: string;
  gatePass: string;
  tareScale: string;
  grossScale: string;
  shift: string;
  dayShift: string;
  nightShift: string;
  supervisorOnDuty: string;
  dispatchTrip: string;
  manualEntry: string;
  autoCapture: string;
  varianceTolerated: string;
  varianceAlert: string;
  quickDispatch: string;
}

export interface LoadingTranslations {
  loadingStation: string;
  originScale: string;
  grossWeightCapture: string;
  tareWeightCapture: string;
  netWeightCalc: string;
  loaderOperator: string;
  scaleTicketNumber: string;
  loadingTime: string;
  loadingApproval: string;
  sealNumber: string;
  waybillGenerated: string;
  readyForTransit: string;
  tareOverTolerance: string;
  loadingNotes: string;
  confirmLoading: string;
}

export interface UnloadingTranslations {
  unloadingStation: string;
  destinationScale: string;
  destGrossWeight: string;
  destTareWeight: string;
  destNetWeight: string;
  varianceWeight: string;
  weightLossTonnage: string;
  weightLossPct: string;
  unloaderOperator: string;
  destinationTicket: string;
  unloadTime: string;
  materialInspection: string;
  discharged: string;
  qualityPassed: string;
  qualityRejected: string;
  deductionApplied: string;
  confirmUnloading: string;
}

export interface TripsTranslations {
  tripList: string;
  tripDetails: string;
  tripNumber: string;
  statuses: {
    DRAFT: string;
    LOADED: string;
    IN_TRANSIT: string;
    ARRIVED: string;
    UNLOADING: string;
    COMPLETED: string;
    RETURN_REQUESTED: string;
    RETURNED: string;
    EXCEPTION: string;
    CANCELLED: string;
    DISPATCHED: string;
    AT_ORIGIN: string;
    AT_DESTINATION: string;
    REJECTED: string;
  };
  financials: string;
  baseAmount: string;
  demurrage: string;
  deductions: string;
  totalSettlement: string;
  vat: string;
  timeline: string;
  originToDest: string;
  estimatedArrival: string;
  actualArrival: string;
  carrierAssignment: string;
  truckAssigned: string;
  driverAssigned: string;
  immutableSnapshot: string;
}

export interface ImportsTranslations {
  importCenter: string;
  legacyMigration: string;
  googleSheetImport: string;
  uploadExcel: string;
  uploadCSV: string;
  dragDropFile: string;
  supportedFormats: string;
  columnMapping: string;
  previewRows: string;
  rowsRead: string;
  rowsValid: string;
  rowsInvalid: string;
  matchedEntities: string;
  unmatchedEntities: string;
  pricingUnresolved: string;
  duplicates: string;
  conflicts: string;
  commitMigration: string;
  dryRunNotice: string;
  sourceProtected: string;
  adminConfirmationRequired: string;
  previewOnly: string;
  executeMigration: string;
}

export interface ReportsTranslations {
  reportsEngine: string;
  executiveSummary: string;
  carrierPerformance: string;
  materialBreakdown: string;
  dailyLogistics: string;
  weeklyAudit: string;
  financialSettlements: string;
  lossDiscrepancies: string;
  demurrageAnalysis: string;
  dateRange: string;
  today: string;
  yesterday: string;
  last7Days: string;
  last30Days: string;
  customRange: string;
  generateReport: string;
  exportPDF: string;
  exportExcel: string;
}

export interface ExceptionsTranslations {
  exceptionEngine: string;
  openExceptions: string;
  resolvedExceptions: string;
  underReview: string;
  severity: string;
  high: string;
  medium: string;
  low: string;
  critical: string;
  exceptionType: string;
  weightDiscrepancy: string;
  routeDeviation: string;
  overtimeDelay: string;
  overloadViolation: string;
  unauthorizedDriver: string;
  damagedCargo: string;
  investigationNotes: string;
  resolveException: string;
  escalateToAdmin: string;
}

export interface AdminTranslations {
  adminConsole: string;
  systemHealth: string;
  securitySettings: string;
  roleManagement: string;
  projectAssignment: string;
  auditLogs: string;
  databaseSync: string;
  masterDataControls: string;
  platformRules: string;
  cloudServices: string;
  productionReadiness: string;
  diagnostics: string;
  runIntegrityCheck: string;
  clearCache: string;
  securityAudit: string;
  runAuditSuite: string;
}

export interface SettingsTranslations {
  settings: string;
  generalSettings: string;
  localization: string;
  languageSelect: string;
  theme: string;
  notificationsEnabled: string;
  soundAlerts: string;
  scaleIntegration: string;
  autoSyncInterval: string;
  maxTolerancePct: string;
  defaultDemurrageHourly: string;
  printFormat: string;
  thermalReceipt: string;
  a4Standard: string;
  saveSettings: string;
}

export interface SyncTranslations {
  outbox: string;
  syncCenter: string;
  onlineMode: string;
  offlineSimulated: string;
  disconnected: string;
  pendingSync: string;
  syncedOperations: string;
  failedSync: string;
  retryAll: string;
  lastSyncAt: string;
  conflictResolution: string;
  clientWins: string;
  serverWins: string;
  manualMerge: string;
  idempotencyProtected: string;
  antiReplayActive: string;
  pendingQueue: string;
}

export interface AuditTranslations {
  auditLog: string;
  securityAudit: string;
  entityType: string;
  actionType: string;
  beforeState: string;
  afterState: string;
  performedBy: string;
  ipAddress: string;
  timestamp: string;
  changeSummary: string;
  nonRepudiation: string;
  tamperEvident: string;
  verifySignatures: string;
  exportAuditTrail: string;
  auditDomains: string;
  passedCount: string;
  failedCount: string;
}

export interface ValidationTranslations {
  requiredField: string;
  invalidFormat: string;
  minLength: string;
  maxLength: string;
  numberPositive: string;
  weightPositive: string;
  grossMustExceedTare: string;
  dateRangeInvalid: string;
  duplicateEntry: string;
  carrierMismatch: string;
  projectMismatch: string;
  unauthorizedAction: string;
  statusTransitionInvalid: string;
  exceedsPayloadLimit: string;
}

export interface ErrorsTranslations {
  unexpectedError: string;
  networkError: string;
  permissionDenied: string;
  notFound: string;
  conflictError: string;
  timeoutError: string;
  databaseError: string;
  parseError: string;
  validationFailed: string;
  operationFailed: string;
  fileTooLarge: string;
  invalidFileType: string;
  pleaseTryAgain: string;
  contactSupport: string;
}

export interface LocaleResource {
  common: CommonTranslations;
  auth: AuthTranslations;
  dashboard: DashboardTranslations;
  projects: ProjectsTranslations;
  operations: OperationsTranslations;
  loading: LoadingTranslations;
  unloading: UnloadingTranslations;
  trips: TripsTranslations;
  imports: ImportsTranslations;
  reports: ReportsTranslations;
  exceptions: ExceptionsTranslations;
  admin: AdminTranslations;
  settings: SettingsTranslations;
  sync: SyncTranslations;
  audit: AuditTranslations;
  validation: ValidationTranslations;
  errors: ErrorsTranslations;
}
