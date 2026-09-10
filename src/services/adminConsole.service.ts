/**
 * Admin Console Service
 * Enterprise-grade management service for the 11 administrative domains:
 * 1. Projects
 * 2. Carriers
 * 3. Materials
 * 4. Pricing Rules (with Versioning, Copy-on-Write, Historical Immutability & Audit History)
 * 5. Trucks
 * 6. Drivers
 * 7. Users
 * 8. Exceptions
 * 9. Audit Logs
 * 10. Import Batches
 * 11. Sync Health
 */

import { 
  ProjectEntity, 
  CarrierEntity, 
  MaterialEntity, 
  TruckEntity, 
  DriverEntity, 
  UserEntity, 
  TripExceptionEntity,
  AuditLogEntity,
  ImportBatchEntity
} from '../types/entities';
import { 
  DEFAULT_PROJECTS, 
  DEFAULT_CARRIERS, 
  DEFAULT_MATERIALS, 
  DEFAULT_TRUCKS, 
  DEFAULT_DRIVERS 
} from '../data/defaultMasterData';
import { MASTER_PRICING_RULES } from '../data/masterPricingRules';
import { tripEngineService } from './tripEngine.service';
import { AuthUserContext } from '../types/common';

// ============================================================================
// Types for Pricing Rules & Immutability Audit
// ============================================================================

export interface PricingRuleRecord {
  pricingRuleId: string;
  projectId: string;
  version: number;
  parentRuleId?: string;
  carrierId: string;
  carrierName: string;
  pricingType: 'PER_TRIP' | 'PER_TON' | 'PER_KM' | 'FLAT_RATE';
  agreedRate: number;
  currency: string;
  materialId?: string;
  materialName?: string;
  effectiveFrom: string; // YYYY-MM-DD
  effectiveTo: string;   // YYYY-MM-DD
  status: 'ACTIVE' | 'INACTIVE';
  notes?: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export interface PricingAuditHistoryEntry {
  auditId: string;
  pricingRuleId: string;
  parentRuleId?: string;
  version: number;
  carrierName: string;
  action: 'CREATED' | 'VERSIONED_UPDATE' | 'STATUS_TOGGLE' | 'ARCHIVED';
  changedAt: string;
  changedBy: string;
  changedByRole: string;
  reason: string;
  previousValues?: {
    agreedRate?: number;
    pricingType?: string;
    materialName?: string;
    effectiveFrom?: string;
    effectiveTo?: string;
    status?: string;
  };
  newValues: {
    agreedRate: number;
    pricingType: string;
    materialName?: string;
    effectiveFrom: string;
    effectiveTo: string;
    status: string;
  };
  historicalTripsProtectedCount: number;
}

export interface AdminUserRecord extends UserEntity {
  phone?: string;
  lastLoginAt?: string;
}

export interface SyncHealthStatus {
  isOnline: boolean;
  pendingOutboxCount: number;
  conflictCount: number;
  firestoreStatus: 'CONNECTED' | 'DISCONNECTED' | 'PROVISIONED';
  googleWorkspaceStatus: 'CONNECTED' | 'READY' | 'UNLINKED';
  sheetsDriveSyncStatus: 'SYNCED' | 'IDLE' | 'PENDING';
  lastHealthCheck: string;
  databaseId: string;
  activeProjectCount: number;
}

// ============================================================================
// Service Implementation
// ============================================================================

export class AdminConsoleService {
  private projects: ProjectEntity[] = [...DEFAULT_PROJECTS];
  private carriers: CarrierEntity[] = [...DEFAULT_CARRIERS];
  private materials: MaterialEntity[] = [...DEFAULT_MATERIALS];
  private trucks: TruckEntity[] = [...DEFAULT_TRUCKS];
  private drivers: DriverEntity[] = [...DEFAULT_DRIVERS];
  private pricingRules: PricingRuleRecord[] = [];
  private pricingAuditHistory: PricingAuditHistoryEntry[] = [];
  private users: AdminUserRecord[] = [];
  private exceptions: TripExceptionEntity[] = [];
  private auditLogs: AuditLogEntity[] = [];
  private importBatches: ImportBatchEntity[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.initializePricingRules();
    this.initializeUsers();
    this.initializeExceptions();
    this.initializeAuditLogs();
    this.initializeImportBatches();
  }

  // --------------------------------------------------------------------------
  // Reactive Listener Support
  // --------------------------------------------------------------------------
  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(cb => {
      try { cb(); } catch (e) { console.error('Admin Console subscriber error', e); }
    });
  }

  // --------------------------------------------------------------------------
  // 1. Initial Data Setup
  // --------------------------------------------------------------------------
  private initializePricingRules(): void {
    const carrierNameMap = new Map<string, string>();
    this.carriers.forEach(c => carrierNameMap.set(c.carrierId, c.name || c.companyNameAr || c.carrierId));

    const materialNameMap = new Map<string, string>();
    this.materials.forEach(m => materialNameMap.set(m.materialId, m.name || m.nameAr || m.code));

    const initialRules: PricingRuleRecord[] = MASTER_PRICING_RULES.map((r, index) => {
      const carrierName = r.carrierId ? (carrierNameMap.get(r.carrierId) || r.carrierId) : 'كافة الناقلين (عام)';
      const materialName = r.materialId ? (materialNameMap.get(r.materialId) || r.materialId) : 'كافة المواد والخامات (عام)';
      
      return {
        pricingRuleId: r.pricingRuleId,
        projectId: r.projectId,
        version: 1,
        carrierId: r.carrierId || 'CAR-ALMAJDOUIE',
        carrierName,
        pricingType: r.pricingType as any,
        agreedRate: r.agreedRate,
        currency: r.currency || 'SAR',
        materialId: r.materialId,
        materialName,
        effectiveFrom: r.effectiveFrom || '2026-01-01',
        effectiveTo: r.effectiveTo || '2026-12-31',
        status: r.status || 'ACTIVE',
        notes: r.name,
        createdAt: '2026-01-01T08:00:00.000Z',
        createdBy: 'USR-FIN-AUDITOR-01',
        updatedAt: '2026-01-01T08:00:00.000Z',
        updatedBy: 'USR-FIN-AUDITOR-01',
      };
    });

    this.pricingRules = initialRules;

    // Initial audit records for pricing rules
    initialRules.forEach(rule => {
      this.pricingAuditHistory.push({
        auditId: `AUD-PRC-INIT-${rule.pricingRuleId}`,
        pricingRuleId: rule.pricingRuleId,
        version: 1,
        carrierName: rule.carrierName,
        action: 'CREATED',
        changedAt: rule.createdAt,
        changedBy: 'م. راكان الغامدي (مدقق مالي)',
        changedByRole: 'FINANCE_AUDITOR',
        reason: 'تهيئة التعرفة التعاقدية المعتمدة للمشروع',
        newValues: {
          agreedRate: rule.agreedRate,
          pricingType: rule.pricingType,
          materialName: rule.materialName,
          effectiveFrom: rule.effectiveFrom,
          effectiveTo: rule.effectiveTo,
          status: rule.status,
        },
        historicalTripsProtectedCount: 0,
      });
    });
  }

  private initializeUsers(): void {
    this.users = [
      {
        userId: 'USR-ADMIN-001',
        email: 'admin@qsaudi.com',
        fullName: 'المهندس طارق بن خالد الشمري',
        role: 'PROJECT_ADMIN',
        assignedProjectIds: ['PRJ-NEOM-NORTH-01', 'PRJ-REDSEA-RESORT-02'],
        isActive: true,
        phone: '0551122334',
        lastLoginAt: new Date().toISOString(),
        createdAt: new Date() as any,
        createdBy: 'SYSTEM',
        updatedAt: new Date() as any,
        updatedBy: 'SYSTEM',
      },
      {
        userId: 'USR-DISPATCHER-02',
        email: 'dispatcher.neom@qsaudi.com',
        fullName: 'سلطان فهد الفازي (مشرف الميزان والترحيل)',
        role: 'DISPATCHER',
        assignedProjectIds: ['PRJ-NEOM-NORTH-01'],
        isActive: true,
        phone: '0509988776',
        lastLoginAt: '2026-09-10T06:12:00.000Z',
        createdAt: new Date() as any,
        createdBy: 'USR-ADMIN-001',
        updatedAt: new Date() as any,
        updatedBy: 'USR-ADMIN-001',
      },
      {
        userId: 'USR-FIN-AUDITOR-01',
        email: 'auditor.finance@qsaudi.com',
        fullName: 'راكان عبدالله الغامدي (مدقق الحسابات والعقود)',
        role: 'FINANCE_AUDITOR',
        assignedProjectIds: ['PRJ-NEOM-NORTH-01', 'PRJ-REDSEA-RESORT-02'],
        isActive: true,
        phone: '0544332211',
        lastLoginAt: '2026-09-09T18:45:00.000Z',
        createdAt: new Date() as any,
        createdBy: 'USR-ADMIN-001',
        updatedAt: new Date() as any,
        updatedBy: 'USR-ADMIN-001',
      },
      {
        userId: 'USR-DISPATCHER-REDSEA',
        email: 'dispatcher.redsea@qsaudi.com',
        fullName: 'عمر بن عبدالعزيز القحطاني',
        role: 'DISPATCHER',
        assignedProjectIds: ['PRJ-REDSEA-RESORT-02'],
        isActive: true,
        phone: '0567788990',
        lastLoginAt: '2026-09-08T11:20:00.000Z',
        createdAt: new Date() as any,
        createdBy: 'USR-ADMIN-001',
        updatedAt: new Date() as any,
        updatedBy: 'USR-ADMIN-001',
      },
      {
        userId: 'USR-VIEWER-CLIENT',
        email: 'client.rep@neom.sa',
        fullName: 'ممثل إدارة مشاريع نيوم (استعراض ومطابقة)',
        role: 'VIEWER',
        assignedProjectIds: ['PRJ-NEOM-NORTH-01'],
        isActive: true,
        phone: '0533322110',
        lastLoginAt: '2026-09-09T14:10:00.000Z',
        createdAt: new Date() as any,
        createdBy: 'USR-ADMIN-001',
        updatedAt: new Date() as any,
        updatedBy: 'USR-ADMIN-001',
      },
    ];
  }

  private initializeExceptions(): void {
    this.exceptions = [
      {
        exceptionId: 'EXP-2026-001',
        projectId: 'PRJ-NEOM-NORTH-01',
        tripId: 'TRP-2026-00891',
        type: 'WEIGHT_VARIANCE',
        severity: 'HIGH',
        status: 'OPEN',
        description: 'فارق وزني بين ميزان المقلع وميزان الموقع (-1,450 كجم، بنسبة تفاوت -4.62% بينما الحد الأقصى 1.5%)',
        openedAt: '2026-09-09T09:15:00.000Z',
        openedBy: 'SYSTEM_WEIGHBRIDGE_AI',
        reasonAr: 'تجاوز نسبة التسامح المعتمدة في ميزان الوصول',
        reportedBy: {
          userId: 'SYSTEM',
          displayName: 'نظام التدقيق الوزني الآلي',
        },
        createdAt: new Date() as any,
        createdBy: 'SYSTEM',
        updatedAt: new Date() as any,
        updatedBy: 'SYSTEM',
      },
      {
        exceptionId: 'EXP-2026-002',
        projectId: 'PRJ-NEOM-NORTH-01',
        tripId: 'TRP-2026-00893',
        type: 'TRUCK_CARRIER_CONFLICT',
        severity: 'CRITICAL',
        status: 'UNDER_REVIEW',
        description: 'رقم لوحة الشاحنة مسجل باسم ناقل غير معتمد في عقد المشروع الحالي',
        openedAt: '2026-09-09T11:30:00.000Z',
        openedBy: 'سلطان فهد الفازي',
        reasonAr: 'تعارض في بيانات ملكية الشاحنة المسجلة بهيئة النقل',
        reportedBy: {
          userId: 'USR-DISPATCHER-02',
          displayName: 'سلطان فهد الفازي',
        },
        createdAt: new Date() as any,
        createdBy: 'USR-DISPATCHER-02',
        updatedAt: new Date() as any,
        updatedBy: 'USR-DISPATCHER-02',
      },
      {
        exceptionId: 'EXP-2026-003',
        projectId: 'PRJ-NEOM-NORTH-01',
        tripId: 'TRP-2026-00895',
        type: 'OVERWEIGHT_VIOLATION',
        severity: 'BLOCKING',
        status: 'RESOLVED',
        description: 'حمولة زائدة تجاوزت الوزن الإجمالي النظامي للشاحنة (46,200 كجم مقابل الحد الأقصى 45,000 كجم)',
        openedAt: '2026-09-08T15:20:00.000Z',
        openedBy: 'ميزان المقلع الرئيسي',
        resolutionNote: 'تم تفريغ الحمولة الزائدة (1,200 كجم) وإعادة وزن الشاحنة إلى 44,800 كجم قبل الانطلاق',
        reviewedAt: '2026-09-08T15:45:00.000Z',
        reviewedBy: 'م. راكان الغامدي',
        reasonAr: 'مخالفة نظام أوزان الشاحنات الصادر من وزارة النقل',
        reportedBy: {
          userId: 'SYSTEM',
          displayName: 'حساس ميزان البوابة الجنوبية',
        },
        createdAt: new Date() as any,
        createdBy: 'SYSTEM',
        updatedAt: new Date() as any,
        updatedBy: 'USR-FIN-AUDITOR-01',
      },
    ];
  }

  private initializeAuditLogs(): void {
    this.auditLogs = [
      {
        auditLogId: 'AUD-LOG-9001',
        projectId: 'PRJ-NEOM-NORTH-01',
        entityType: 'PRICING_RULE',
        entityId: 'PRC-NEOM-HAUL-TON-8.5',
        action: 'CREATE',
        actor: {
          userId: 'USR-FIN-AUDITOR-01',
          email: 'auditor.finance@qsaudi.com',
          role: 'FINANCE_AUDITOR',
          ipAddress: '10.0.4.12',
          userAgent: 'Chrome 124 / Linux',
        },
        changes: {
          before: null,
          after: { rate: 8.5, pricingType: 'PER_TON', carrier: 'شركة المجدوعي اللوجستية' },
          deltaFields: ['rate', 'pricingType', 'carrier', 'currency'],
        },
        correlationId: 'TXN-CORR-001',
        createdAt: new Date('2026-09-09T08:00:00.000Z') as any,
        createdBy: 'USR-FIN-AUDITOR-01',
        updatedAt: new Date('2026-09-09T08:00:00.000Z') as any,
        updatedBy: 'USR-FIN-AUDITOR-01',
      },
      {
        auditLogId: 'AUD-LOG-9002',
        projectId: 'PRJ-NEOM-NORTH-01',
        entityType: 'TRUCK',
        entityId: 'TRK-9871',
        action: 'UPDATE',
        actor: {
          userId: 'USR-ADMIN-001',
          email: 'admin@qsaudi.com',
          role: 'PROJECT_ADMIN',
          ipAddress: '10.0.1.5',
          userAgent: 'Firefox 126 / macOS',
        },
        changes: {
          before: { tareWeightKg: 14000 },
          after: { tareWeightKg: 14200 },
          deltaFields: ['tareWeightKg'],
        },
        correlationId: 'TXN-CORR-002',
        createdAt: new Date('2026-09-09T10:15:00.000Z') as any,
        createdBy: 'USR-ADMIN-001',
        updatedAt: new Date('2026-09-09T10:15:00.000Z') as any,
        updatedBy: 'USR-ADMIN-001',
      },
      {
        auditLogId: 'AUD-LOG-9003',
        projectId: 'PRJ-NEOM-NORTH-01',
        entityType: 'EXCEPTION',
        entityId: 'EXP-2026-003',
        action: 'FORCE_STATUS_CHANGE',
        actor: {
          userId: 'USR-FIN-AUDITOR-01',
          email: 'auditor.finance@qsaudi.com',
          role: 'FINANCE_AUDITOR',
          ipAddress: '10.0.4.12',
          userAgent: 'Chrome 124 / Linux',
        },
        changes: {
          before: { status: 'OPEN' },
          after: { status: 'RESOLVED', resolution: 'تم تعديل الحمولة قبل الانطلاق' },
          deltaFields: ['status', 'resolution', 'reviewedAt'],
        },
        correlationId: 'TXN-CORR-003',
        createdAt: new Date('2026-09-08T15:45:00.000Z') as any,
        createdBy: 'USR-FIN-AUDITOR-01',
        updatedAt: new Date('2026-09-08T15:45:00.000Z') as any,
        updatedBy: 'USR-FIN-AUDITOR-01',
      },
    ];
  }

  private initializeImportBatches(): void {
    this.importBatches = [
      {
        batchId: 'BATCH-NEOM-2026-0901',
        projectId: 'PRJ-NEOM-NORTH-01',
        batchType: 'WEIGHBRIDGE_IMPORT',
        sourceFileName: 'كشف_شحنات_الركام_الأسبوعي_نيوم.csv',
        totalRecords: 142,
        processedRecords: 140,
        failedRecords: 2,
        status: 'COMPLETED',
        errorSummary: ['بوليصة مكررة في السطر 45', 'رقم لوحة غير متطابق في السطر 112'],
        createdAt: new Date('2026-09-09T07:30:00.000Z') as any,
        createdBy: 'سلطان فهد الفازي',
        updatedAt: new Date('2026-09-09T07:34:00.000Z') as any,
        updatedBy: 'سلطان فهد الفازي',
      },
      {
        batchId: 'BATCH-REDSEA-2026-0888',
        projectId: 'PRJ-REDSEA-RESORT-02',
        batchType: 'FLEET_IMPORT',
        sourceFileName: 'سجل_تحديث_أسطول_المقاول_البحر_الأحمر.xlsx',
        totalRecords: 38,
        processedRecords: 38,
        failedRecords: 0,
        status: 'COMPLETED',
        createdAt: new Date('2026-09-07T14:10:00.000Z') as any,
        createdBy: 'عمر القحطاني',
        updatedAt: new Date('2026-09-07T14:11:00.000Z') as any,
        updatedBy: 'عمر القحطاني',
      },
    ];
  }

  // ==========================================================================
  // 1. Projects Section
  // ==========================================================================
  public getProjects(): ProjectEntity[] {
    return [...this.projects];
  }

  public createProject(payload: Partial<ProjectEntity>, context: AuthUserContext): ProjectEntity {
    const newProject: ProjectEntity = {
      projectId: payload.projectId || `PRJ-${Date.now().toString(36).toUpperCase()}`,
      projectCode: payload.projectCode || `PRJ-${this.projects.length + 1}`,
      nameAr: payload.nameAr || 'مشروع جديد',
      nameEn: payload.nameEn || 'New Project',
      clientName: payload.clientName || 'الجهة المالكة',
      location: payload.location || {
        lat: 24.7136,
        lng: 46.6753,
        geoFenceRadiusMeters: 500,
        addressAr: 'المملكة العربية السعودية',
      },
      settings: {
        zatcaTaxNumber: payload.settings?.zatcaTaxNumber || '300000000000003',
        vatRatePercent: payload.settings?.vatRatePercent ?? 15,
        allowDriverSelfDispatch: payload.settings?.allowDriverSelfDispatch ?? false,
      },
      authorizedCarrierIds: payload.authorizedCarrierIds || [],
      authorizedMaterialIds: payload.authorizedMaterialIds || [],
      status: payload.status || 'ACTIVE',
      createdAt: new Date() as any,
      createdBy: context.userId || 'ADMIN',
      updatedAt: new Date() as any,
      updatedBy: context.userId || 'ADMIN',
    };

    this.projects.push(newProject);
    this.recordAuditLog('PROJECT', newProject.projectId, 'CREATE', null, newProject, context);
    this.notify();
    return newProject;
  }

  public updateProject(projectId: string, updates: Partial<ProjectEntity>, context: AuthUserContext): void {
    const idx = this.projects.findIndex(p => p.projectId === projectId);
    if (idx === -1) throw new Error('المشروع غير موجود');

    const before = { ...this.projects[idx] };
    this.projects[idx] = {
      ...this.projects[idx],
      ...updates,
      updatedAt: new Date() as any,
      updatedBy: context.userId,
    };

    this.recordAuditLog('PROJECT', projectId, 'UPDATE', before, this.projects[idx], context);
    this.notify();
  }

  // ==========================================================================
  // 2. Carriers Section
  // ==========================================================================
  public getCarriers(projectId?: string): CarrierEntity[] {
    if (!projectId || projectId === 'ALL') return [...this.carriers];
    return this.carriers.filter(c => c.projectId === projectId);
  }

  public createCarrier(payload: Partial<CarrierEntity>, context: AuthUserContext): CarrierEntity {
    const name = payload.name || payload.companyNameAr || 'ناقل جديد';
    const newCarrier: CarrierEntity = {
      carrierId: payload.carrierId || `CAR-${Date.now().toString(36).toUpperCase()}`,
      projectId: payload.projectId || this.projects[0]?.projectId || 'PRJ-NEOM-NORTH-01',
      name,
      normalizedName: name.trim().toLowerCase(),
      companyNameAr: name,
      commercialRegistrationNo: payload.commercialRegistrationNo || '1010000000',
      transportLicenseNo: payload.transportLicenseNo || 'TGA-9999',
      status: payload.status || 'ACTIVE',
      isActive: payload.status !== 'INACTIVE',
      contactPerson: payload.contactPerson || {
        name: 'مسؤول العمليات',
        phone: '0500000000',
        email: 'ops@carrier.com',
      },
      createdAt: new Date() as any,
      createdBy: context.userId,
      updatedAt: new Date() as any,
      updatedBy: context.userId,
    };

    this.carriers.push(newCarrier);
    this.recordAuditLog('CARRIER', newCarrier.carrierId, 'CREATE', null, newCarrier, context);
    this.notify();
    return newCarrier;
  }

  public toggleCarrierStatus(carrierId: string, context: AuthUserContext): void {
    const carrier = this.carriers.find(c => c.carrierId === carrierId);
    if (!carrier) throw new Error('الناقل غير موجود');

    const before = { ...carrier };
    carrier.status = carrier.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    carrier.isActive = carrier.status === 'ACTIVE';
    carrier.updatedAt = new Date() as any;
    carrier.updatedBy = context.userId;

    this.recordAuditLog('CARRIER', carrierId, 'UPDATE', before, carrier, context);
    this.notify();
  }

  // ==========================================================================
  // 3. Materials Section
  // ==========================================================================
  public getMaterials(projectId?: string): MaterialEntity[] {
    if (!projectId || projectId === 'ALL') return [...this.materials];
    return this.materials.filter(m => m.projectId === projectId);
  }

  public createMaterial(payload: Partial<MaterialEntity>, context: AuthUserContext): MaterialEntity {
    const name = payload.name || payload.nameAr || 'خامة جديدة';
    const newMaterial: MaterialEntity = {
      materialId: payload.materialId || `MAT-${Date.now().toString(36).toUpperCase()}`,
      projectId: payload.projectId || this.projects[0]?.projectId || 'PRJ-NEOM-NORTH-01',
      name,
      normalizedName: name.trim().toLowerCase(),
      code: payload.code || `MAT-${this.materials.length + 1}`,
      unitOfMeasure: payload.unitOfMeasure || 'TON',
      standardDensityTonPerM3: payload.standardDensityTonPerM3 || 1.6,
      status: payload.status || 'ACTIVE',
      isActive: payload.status !== 'INACTIVE',
      createdAt: new Date() as any,
      createdBy: context.userId,
      updatedAt: new Date() as any,
      updatedBy: context.userId,
    };

    this.materials.push(newMaterial);
    this.recordAuditLog('CARRIER', newMaterial.materialId, 'CREATE', null, newMaterial, context);
    this.notify();
    return newMaterial;
  }

  public toggleMaterialStatus(materialId: string, context: AuthUserContext): void {
    const mat = this.materials.find(m => m.materialId === materialId);
    if (!mat) throw new Error('المادة غير موجودة');

    const before = { ...mat };
    mat.status = mat.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    mat.isActive = mat.status === 'ACTIVE';
    mat.updatedAt = new Date() as any;
    mat.updatedBy = context.userId;

    this.recordAuditLog('CARRIER', materialId, 'UPDATE', before, mat, context);
    this.notify();
  }

  // ==========================================================================
  // 4. Pricing Rules Section: Copy-on-Write Versioning, Trips Protection & Audit
  // ==========================================================================

  /**
   * Returns pricing rules filtered by project or status
   */
  public getPricingRules(projectId?: string): PricingRuleRecord[] {
    if (!projectId || projectId === 'ALL') return [...this.pricingRules];
    return this.pricingRules.filter(r => r.projectId === projectId);
  }

  /**
   * Returns the complete audit history of pricing changes
   */
  public getPricingAuditHistory(ruleId?: string): PricingAuditHistoryEntry[] {
    if (!ruleId) return [...this.pricingAuditHistory].reverse();
    return this.pricingAuditHistory.filter(h => h.pricingRuleId === ruleId || h.parentRuleId === ruleId).reverse();
  }

  /**
   * Count how many existing trips rely on a specific pricing rule.
   * Crucial for proving to the user that previous Trips were NOT mutated!
   */
  public countHistoricalTripsForRule(ruleId: string): number {
    try {
      const trips = tripEngineService.getTrips();
      return trips.filter(t => t.pricingRuleId === ruleId || t.pricingSnapshot?.pricingRuleId === ruleId).length;
    } catch {
      return 0;
    }
  }

  /**
   * Create a brand new Pricing Rule
   */
  public createPricingRule(
    params: {
      projectId: string;
      carrierId: string;
      carrierName: string;
      pricingType: 'PER_TRIP' | 'PER_TON' | 'PER_KM' | 'FLAT_RATE';
      agreedRate: number;
      currency: string;
      materialId?: string;
      materialName?: string;
      effectiveFrom: string;
      effectiveTo: string;
      status: 'ACTIVE' | 'INACTIVE';
      notes?: string;
    },
    context: AuthUserContext
  ): PricingRuleRecord {
    const pricingRuleId = `PRC-${Date.now().toString(36).toUpperCase()}-v1`;

    const newRule: PricingRuleRecord = {
      pricingRuleId,
      projectId: params.projectId,
      version: 1,
      carrierId: params.carrierId,
      carrierName: params.carrierName,
      pricingType: params.pricingType,
      agreedRate: params.agreedRate,
      currency: params.currency || 'SAR',
      materialId: params.materialId,
      materialName: params.materialName || 'كافة المواد والخامات (عام)',
      effectiveFrom: params.effectiveFrom,
      effectiveTo: params.effectiveTo,
      status: params.status,
      notes: params.notes || `تعرفة جديدة للناقل ${params.carrierName}`,
      createdAt: new Date().toISOString(),
      createdBy: context.displayName || context.userId,
      updatedAt: new Date().toISOString(),
      updatedBy: context.displayName || context.userId,
    };

    this.pricingRules.push(newRule);

    // Record Pricing Audit Entry
    this.pricingAuditHistory.push({
      auditId: `AUD-PRC-${Date.now()}`,
      pricingRuleId: newRule.pricingRuleId,
      version: 1,
      carrierName: newRule.carrierName,
      action: 'CREATED',
      changedAt: new Date().toISOString(),
      changedBy: context.displayName || context.email,
      changedByRole: context.role,
      reason: params.notes || 'إنشاء قاعدة تسعير تعاقدية جديدة',
      newValues: {
        agreedRate: newRule.agreedRate,
        pricingType: newRule.pricingType,
        materialName: newRule.materialName,
        effectiveFrom: newRule.effectiveFrom,
        effectiveTo: newRule.effectiveTo,
        status: newRule.status,
      },
      historicalTripsProtectedCount: 0,
    });

    this.recordAuditLog('PRICING_RULE', newRule.pricingRuleId, 'CREATE', null, newRule, context);
    this.notify();
    return newRule;
  }

  /**
   * CRITICAL MANDATE IMPLEMENTATION:
   * "عند تعديل Pricing Rule:
   * لا تعدل Trips السابقة.
   * أنشئ نسخة جديدة من Pricing Rule عند الحاجة بدلاً من mutation تؤثر على التاريخ.
   * اعرض تاريخ تغييرات التسعير Audit History."
   * 
   * This method executes Copy-On-Write Versioning:
   * 1. Finds existing rule and counts historical trips linked to it.
   * 2. Preserves the old rule record (closing its effectiveTo or marking previous version)
   * 3. NEVER touches existing trips - their immutable snapshot remains untouched!
   * 4. Spawns a new version of the rule with updated rate/dates.
   * 5. Records comprehensive Pricing Audit Log showing the exact delta and historical protection count.
   */
  public versionAndModifyPricingRule(
    existingRuleId: string,
    modifications: {
      agreedRate: number;
      pricingType: 'PER_TRIP' | 'PER_TON' | 'PER_KM' | 'FLAT_RATE';
      currency: string;
      carrierId: string;
      carrierName: string;
      materialId?: string;
      materialName?: string;
      effectiveFrom: string;
      effectiveTo: string;
      status: 'ACTIVE' | 'INACTIVE';
      modificationReason: string;
    },
    context: AuthUserContext
  ): { oldRule: PricingRuleRecord; newVersionRule: PricingRuleRecord; protectedTripsCount: number } {
    const existingIndex = this.pricingRules.findIndex(r => r.pricingRuleId === existingRuleId);
    if (existingIndex === -1) {
      throw new Error(`قاعدة التسعير (${existingRuleId}) غير موجودة.`);
    }

    const oldRule = { ...this.pricingRules[existingIndex] };
    const protectedTripsCount = this.countHistoricalTripsForRule(existingRuleId);

    // Calculate next version
    const newVersion = (oldRule.version || 1) + 1;
    const baseRuleId = oldRule.parentRuleId || oldRule.pricingRuleId.replace(/-v\d+$/, '');
    const newRuleId = `${baseRuleId}-v${newVersion}`;

    // 1. Close or archive the old rule (seal its effectiveTo to the day before the new effectiveFrom)
    const yesterdayDate = new Date(new Date(modifications.effectiveFrom).getTime() - 86400000)
      .toISOString().split('T')[0];
    
    this.pricingRules[existingIndex] = {
      ...oldRule,
      effectiveTo: yesterdayDate,
      status: 'INACTIVE', // old version retired for new trips, but valid for past trips
      updatedAt: new Date().toISOString(),
      updatedBy: context.displayName || context.userId,
      notes: `${oldRule.notes || ''} [أُغلقت واستبدلت بالنسخة v${newVersion} بتاريخ ${new Date().toLocaleDateString('ar-SA')}]`,
    };

    // 2. Create the new version rule
    const newVersionRule: PricingRuleRecord = {
      pricingRuleId: newRuleId,
      projectId: oldRule.projectId,
      version: newVersion,
      parentRuleId: baseRuleId,
      carrierId: modifications.carrierId || oldRule.carrierId,
      carrierName: modifications.carrierName || oldRule.carrierName,
      pricingType: modifications.pricingType,
      agreedRate: modifications.agreedRate,
      currency: modifications.currency || oldRule.currency || 'SAR',
      materialId: modifications.materialId,
      materialName: modifications.materialName || 'كافة المواد والخامات (عام)',
      effectiveFrom: modifications.effectiveFrom,
      effectiveTo: modifications.effectiveTo,
      status: modifications.status,
      notes: modifications.modificationReason || `تحديث السعر إلى النسخة ${newVersion}`,
      createdAt: new Date().toISOString(),
      createdBy: context.displayName || context.userId,
      updatedAt: new Date().toISOString(),
      updatedBy: context.displayName || context.userId,
    };

    this.pricingRules.push(newVersionRule);

    // 3. Record Audit History Entry (Immutability Proof)
    const auditEntry: PricingAuditHistoryEntry = {
      auditId: `AUD-PRC-${Date.now()}`,
      pricingRuleId: newRuleId,
      parentRuleId: baseRuleId,
      version: newVersion,
      carrierName: newVersionRule.carrierName,
      action: 'VERSIONED_UPDATE',
      changedAt: new Date().toISOString(),
      changedBy: context.displayName || context.email,
      changedByRole: context.role,
      reason: modifications.modificationReason || 'تعديل تعرفة تعاقدية مع إنشاء نسخة جديدة وحماية الرحلات السابقة',
      previousValues: {
        agreedRate: oldRule.agreedRate,
        pricingType: oldRule.pricingType,
        materialName: oldRule.materialName,
        effectiveFrom: oldRule.effectiveFrom,
        effectiveTo: oldRule.effectiveTo,
        status: oldRule.status,
      },
      newValues: {
        agreedRate: newVersionRule.agreedRate,
        pricingType: newVersionRule.pricingType,
        materialName: newVersionRule.materialName,
        effectiveFrom: newVersionRule.effectiveFrom,
        effectiveTo: newVersionRule.effectiveTo,
        status: newVersionRule.status,
      },
      historicalTripsProtectedCount: protectedTripsCount,
    };

    this.pricingAuditHistory.push(auditEntry);

    // Record general System Audit Log
    this.recordAuditLog(
      'PRICING_RULE',
      newRuleId,
      'UPDATE',
      oldRule,
      newVersionRule,
      context
    );

    this.notify();

    return {
      oldRule: this.pricingRules[existingIndex],
      newVersionRule,
      protectedTripsCount,
    };
  }

  // ==========================================================================
  // 5. Trucks Section
  // ==========================================================================
  public getTrucks(projectId?: string): TruckEntity[] {
    if (!projectId || projectId === 'ALL') return [...this.trucks];
    return this.trucks.filter(t => t.projectId === projectId);
  }

  public createTruck(payload: Partial<TruckEntity>, context: AuthUserContext): TruckEntity {
    const plate = payload.plate || payload.plateNumberAr || 'أ ب ج 0000';
    const newTruck: TruckEntity = {
      truckId: payload.truckId || `TRK-${Date.now().toString(36).toUpperCase()}`,
      projectId: payload.projectId || this.projects[0]?.projectId || 'PRJ-NEOM-NORTH-01',
      carrierId: payload.carrierId || this.carriers[0]?.carrierId || 'CAR-ALMAJDOUIE',
      plate,
      normalizedPlate: plate.trim().toLowerCase(),
      plateNumberAr: plate,
      truckType: payload.truckType || 'TIPPER_32M3',
      tareWeightKg: payload.tareWeightKg || 14000,
      maxGrossWeightKg: payload.maxGrossWeightKg || 45000,
      legalPayloadLimitKg: (payload.maxGrossWeightKg || 45000) - (payload.tareWeightKg || 14000),
      status: payload.status || 'ACTIVE',
      isActive: payload.status !== 'INACTIVE',
      createdAt: new Date() as any,
      createdBy: context.userId,
      updatedAt: new Date() as any,
      updatedBy: context.userId,
    };

    this.trucks.push(newTruck);
    this.recordAuditLog('TRUCK', newTruck.truckId, 'CREATE', null, newTruck, context);
    this.notify();
    return newTruck;
  }

  public toggleTruckStatus(truckId: string, context: AuthUserContext): void {
    const truck = this.trucks.find(t => t.truckId === truckId);
    if (!truck) throw new Error('الشاحنة غير موجودة');

    const before = { ...truck };
    truck.status = truck.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    truck.isActive = truck.status === 'ACTIVE';
    truck.updatedAt = new Date() as any;
    truck.updatedBy = context.userId;

    this.recordAuditLog('TRUCK', truckId, 'UPDATE', before, truck, context);
    this.notify();
  }

  // ==========================================================================
  // 6. Drivers Section
  // ==========================================================================
  public getDrivers(projectId?: string): DriverEntity[] {
    if (!projectId || projectId === 'ALL') return [...this.drivers];
    return this.drivers.filter(d => d.projectId === projectId);
  }

  public createDriver(payload: Partial<DriverEntity>, context: AuthUserContext): DriverEntity {
    const name = payload.name || payload.fullNameAr || 'سائق جديد';
    const newDriver: DriverEntity = {
      driverId: payload.driverId || `DRV-${Date.now().toString(36).toUpperCase()}`,
      projectId: payload.projectId || this.projects[0]?.projectId || 'PRJ-NEOM-NORTH-01',
      carrierId: payload.carrierId || this.carriers[0]?.carrierId || 'CAR-ALMAJDOUIE',
      name,
      normalizedName: name.trim().toLowerCase(),
      fullNameAr: name,
      phone: payload.phone || '0500000000',
      idNumber: payload.idNumber || payload.nationalOrIqamaId || '1000000000',
      nationalOrIqamaId: payload.idNumber || payload.nationalOrIqamaId || '1000000000',
      licenseNumber: payload.licenseNumber || 'LIC-999',
      currentAssignedTruckId: payload.currentAssignedTruckId || this.trucks[0]?.truckId,
      status: payload.status || 'ACTIVE',
      isActive: payload.status !== 'INACTIVE',
      createdAt: new Date() as any,
      createdBy: context.userId,
      updatedAt: new Date() as any,
      updatedBy: context.userId,
    };

    this.drivers.push(newDriver);
    this.recordAuditLog('USER_ROLE', newDriver.driverId, 'CREATE', null, newDriver, context);
    this.notify();
    return newDriver;
  }

  public toggleDriverStatus(driverId: string, context: AuthUserContext): void {
    const driver = this.drivers.find(d => d.driverId === driverId);
    if (!driver) throw new Error('السائق غير موجود');

    const before = { ...driver };
    driver.status = driver.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    driver.isActive = driver.status === 'ACTIVE';
    driver.updatedAt = new Date() as any;
    driver.updatedBy = context.userId;

    this.recordAuditLog('USER_ROLE', driverId, 'UPDATE', before, driver, context);
    this.notify();
  }

  // ==========================================================================
  // 7. Users Section (RBAC & Account Management)
  // ==========================================================================
  public getUsers(): AdminUserRecord[] {
    return [...this.users];
  }

  public createUser(payload: Partial<AdminUserRecord>, context: AuthUserContext): AdminUserRecord {
    const newUser: AdminUserRecord = {
      userId: payload.userId || `USR-${Date.now().toString(36).toUpperCase()}`,
      email: payload.email || 'user@qsaudi.com',
      fullName: payload.fullName || 'مستخدم جديد',
      role: payload.role || 'DISPATCHER',
      assignedProjectIds: payload.assignedProjectIds || [this.projects[0]?.projectId || 'PRJ-NEOM-NORTH-01'],
      isActive: payload.isActive ?? true,
      phone: payload.phone || '0500000000',
      lastLoginAt: new Date().toISOString(),
      createdAt: new Date() as any,
      createdBy: context.userId,
      updatedAt: new Date() as any,
      updatedBy: context.userId,
    };

    this.users.push(newUser);
    this.recordAuditLog('USER_ROLE', newUser.userId, 'CREATE', null, newUser, context);
    this.notify();
    return newUser;
  }

  public updateUserRole(userId: string, role: UserEntity['role'], context: AuthUserContext): void {
    const user = this.users.find(u => u.userId === userId);
    if (!user) throw new Error('المستخدم غير موجود');

    const before = { ...user };
    user.role = role;
    user.updatedAt = new Date() as any;
    user.updatedBy = context.userId;

    this.recordAuditLog('USER_ROLE', userId, 'UPDATE', before, user, context);
    this.notify();
  }

  public toggleUserStatus(userId: string, context: AuthUserContext): void {
    const user = this.users.find(u => u.userId === userId);
    if (!user) throw new Error('المستخدم غير موجود');

    const before = { ...user };
    user.isActive = !user.isActive;
    user.updatedAt = new Date() as any;
    user.updatedBy = context.userId;

    this.recordAuditLog('USER_ROLE', userId, 'UPDATE', before, user, context);
    this.notify();
  }

  // ==========================================================================
  // 8. Exceptions Section
  // ==========================================================================
  public getExceptions(projectId?: string): TripExceptionEntity[] {
    if (!projectId || projectId === 'ALL') return [...this.exceptions];
    return this.exceptions.filter(e => e.projectId === projectId);
  }

  public updateExceptionStatus(
    exceptionId: string, 
    status: TripExceptionEntity['status'], 
    resolutionNote: string, 
    context: AuthUserContext
  ): void {
    const exc = this.exceptions.find(e => e.exceptionId === exceptionId);
    if (!exc) throw new Error('الاستثناء غير موجود');

    const before = { ...exc };
    exc.status = status;
    exc.resolutionNote = resolutionNote;
    exc.reviewedAt = new Date().toISOString();
    exc.reviewedBy = context.displayName;
    exc.updatedAt = new Date() as any;
    exc.updatedBy = context.userId;

    this.recordAuditLog('EXCEPTION', exceptionId, 'FORCE_STATUS_CHANGE', before, exc, context);
    this.notify();
  }

  // ==========================================================================
  // 9. Audit Logs Section
  // ==========================================================================
  public getAuditLogs(): AuditLogEntity[] {
    return [...this.auditLogs].sort((a, b) => {
      const tA = new Date(a.createdAt as any).getTime();
      const tB = new Date(b.createdAt as any).getTime();
      return tB - tA;
    });
  }

  public recordAuditLog(
    entityType: AuditLogEntity['entityType'],
    entityId: string,
    action: AuditLogEntity['action'],
    before: Record<string, any> | null,
    after: Record<string, any>,
    context: AuthUserContext
  ): void {
    const deltaFields: string[] = [];
    if (before) {
      const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
      keys.forEach(k => {
        if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) {
          deltaFields.push(k);
        }
      });
    } else {
      deltaFields.push(...Object.keys(after));
    }

    const log: AuditLogEntity = {
      auditLogId: `AUD-LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      projectId: after.projectId || 'SYSTEM',
      entityType,
      entityId,
      action,
      actor: {
        userId: context.userId || 'USR-ANONYMOUS',
        email: context.email || 'user@system.local',
        role: context.role || 'ADMIN',
        ipAddress: '10.0.1.1',
        userAgent: 'Web Enterprise Console',
      },
      changes: {
        before,
        after,
        deltaFields,
      },
      correlationId: `TXN-${Date.now()}`,
      createdAt: new Date() as any,
      createdBy: context.userId || 'ADMIN',
      updatedAt: new Date() as any,
      updatedBy: context.userId || 'ADMIN',
    };

    this.auditLogs.unshift(log);
  }

  // ==========================================================================
  // 10. Import Batches Section
  // ==========================================================================
  public getImportBatches(projectId?: string): ImportBatchEntity[] {
    if (!projectId || projectId === 'ALL') return [...this.importBatches];
    return this.importBatches.filter(b => b.projectId === projectId);
  }

  public registerImportBatch(batch: Partial<ImportBatchEntity>): ImportBatchEntity {
    const newBatch: ImportBatchEntity = {
      batchId: batch.batchId || `BATCH-${Date.now()}`,
      projectId: batch.projectId || 'ALL',
      batchType: batch.batchType || 'LEGACY_TRIPS',
      sourceFileName: batch.sourceFileName || 'LegacyGoogleSheet_20Cols.gsheet',
      totalRecords: batch.totalRecords || 0,
      processedRecords: batch.processedRecords || 0,
      failedRecords: batch.failedRecords || 0,
      status: batch.status || 'COMPLETED',
      createdAt: new Date() as any,
      createdBy: batch.createdBy || 'ADMIN',
      updatedAt: new Date() as any,
      updatedBy: batch.updatedBy || 'ADMIN',
    };
    this.importBatches.unshift(newBatch);
    this.notify();
    return newBatch;
  }

  // ==========================================================================
  // 11. Sync Health Section
  // ==========================================================================
  public getSyncHealth(): SyncHealthStatus {
    return {
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      pendingOutboxCount: 0,
      conflictCount: 0,
      firestoreStatus: 'PROVISIONED',
      googleWorkspaceStatus: 'READY',
      sheetsDriveSyncStatus: 'SYNCED',
      lastHealthCheck: new Date().toISOString(),
      databaseId: 'ai-studio-qsaudiworkfollow-ab1cba1e-ac08-4099-bc72-193202e518f1',
      activeProjectCount: this.projects.filter(p => p.status === 'ACTIVE').length,
    };
  }
}

export const adminConsoleService = new AdminConsoleService();
