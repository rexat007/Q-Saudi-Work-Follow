/**
 * Offline Master Data Cache Manager.
 * Handles IndexedDB caching for:
 * 1. projects
 * 2. carriers
 * 3. materials
 * 4. trucks
 * 5. drivers
 * 6. pricingRules
 * 
 * Strict Requirement:
 * "لا تخزن فقط البيانات؛ خزن version/timestamp."
 * "لا تسمح بإنشاء رحلة Offline إذا كانت بيانات التسعير غير متاحة."
 */

import { indexedDBService } from './indexedDB.service';
import { 
  CachedProject, 
  CachedCarrier, 
  CachedMaterial, 
  CachedTruck, 
  CachedDriver, 
  CachedPricingRule,
  CacheStoreMetadata,
  CacheStoreName,
  OfflineTripPrerequisitesReport 
} from '../../types/offline';
import { DEFAULT_PROJECTS } from '../../data/defaultMasterData';
import { SAMPLE_QUALITY_CONTEXT } from '../../data/sampleQualityData';
import { MASTER_PRICING_RULES, MasterPricingRule } from '../../data/masterPricingRules';

export class OfflineCacheService {
  private isInitialized = false;

  /**
   * Initializes and hydrates IndexedDB with standard Master Data and Pricing Rules if not already seeded.
   * Stores both item-level version/timestamp and store-level metadata.
   */
  public async initializeCache(forceRefresh = false): Promise<void> {
    if (this.isInitialized && !forceRefresh) {
      return;
    }

    try {
      const projectCount = await indexedDBService.count('projects');
      if (projectCount === 0 || forceRefresh) {
        await this.seedAllMasterData();
      }
      this.isInitialized = true;
    } catch (err) {
      console.warn('Could not initialize IndexedDB cache (running in memory fallback?):', err);
    }
  }

  /**
   * Seeds all required master datasets into IndexedDB with explicit versions and ISO timestamps.
   */
  public async seedAllMasterData(): Promise<void> {
    const now = new Date().toISOString();
    const currentVersion = 1;

    // 1. Projects
    const projectsToCache: CachedProject[] = [
      {
        projectId: 'PRJ-NEOM-001',
        projectCode: 'NEOM-001',
        nameAr: 'مشروع نيوم - البنية التحتية والمحاجر (PRJ-NEOM-001)',
        clientName: 'شركة نيوم للإنشاءات',
        authorizedCarrierIds: ['CAR-ALMAJDOUIE', 'CAR-BINLADIN'],
        authorizedMaterialIds: ['MAT-AGG-01', 'MAT-SND-01'],
        status: 'ACTIVE',
        _version: currentVersion,
        _cachedAt: now,
      },
      ...DEFAULT_PROJECTS.map((p, idx) => ({
        projectId: p.projectId,
        projectCode: p.projectCode,
        nameAr: p.nameAr,
        nameEn: p.nameEn,
        clientName: p.clientName,
        authorizedCarrierIds: p.authorizedCarrierIds,
        authorizedMaterialIds: p.authorizedMaterialIds,
        status: p.status,
        _version: currentVersion,
        _cachedAt: now,
      }))
    ];
    // Deduplicate by projectId
    const uniqueProjects = Array.from(new Map(projectsToCache.map(p => [p.projectId, p])).values());
    await indexedDBService.putMany('projects', uniqueProjects);
    await indexedDBService.setMetadata({
      storeName: 'projects',
      version: currentVersion,
      timestamp: now,
      recordCount: uniqueProjects.length,
      lastSyncedBy: 'SYSTEM_SEED',
    });

    // 2. Carriers
    const carriersToCache: CachedCarrier[] = SAMPLE_QUALITY_CONTEXT.knownCarriers.map(c => ({
      carrierId: c.carrierId,
      projectId: 'PRJ-NEOM-001',
      name: c.name,
      companyNameAr: c.name,
      commercialRegistrationNo: '1010' + Math.floor(100000 + Math.random() * 900000),
      status: c.status,
      _version: currentVersion,
      _cachedAt: now,
    }));
    await indexedDBService.putMany('carriers', carriersToCache);
    await indexedDBService.setMetadata({
      storeName: 'carriers',
      version: currentVersion,
      timestamp: now,
      recordCount: carriersToCache.length,
      lastSyncedBy: 'SYSTEM_SEED',
    });

    // 3. Materials
    const materialsToCache: CachedMaterial[] = SAMPLE_QUALITY_CONTEXT.knownMaterials.map(m => ({
      materialId: m.materialId,
      projectId: 'PRJ-NEOM-001',
      name: m.name,
      nameAr: m.name,
      code: m.code,
      unitOfMeasure: 'TON',
      standardDensityTonPerM3: 1.6,
      status: 'ACTIVE',
      _version: currentVersion,
      _cachedAt: now,
    }));
    await indexedDBService.putMany('materials', materialsToCache);
    await indexedDBService.setMetadata({
      storeName: 'materials',
      version: currentVersion,
      timestamp: now,
      recordCount: materialsToCache.length,
      lastSyncedBy: 'SYSTEM_SEED',
    });

    // 4. Trucks
    const trucksToCache: CachedTruck[] = SAMPLE_QUALITY_CONTEXT.knownTrucks.map(t => ({
      truckId: t.truckId,
      carrierId: t.carrierId,
      projectId: 'PRJ-NEOM-001',
      plate: t.plate,
      plateNumberAr: t.plate,
      truckType: 'TIPPER_30T',
      tareWeightKg: 8200,
      legalPayloadLimitKg: 35000,
      status: t.status,
      _version: currentVersion,
      _cachedAt: now,
    }));
    await indexedDBService.putMany('trucks', trucksToCache);
    await indexedDBService.setMetadata({
      storeName: 'trucks',
      version: currentVersion,
      timestamp: now,
      recordCount: trucksToCache.length,
      lastSyncedBy: 'SYSTEM_SEED',
    });

    // 5. Drivers
    const driversToCache: CachedDriver[] = SAMPLE_QUALITY_CONTEXT.knownDrivers.map(d => ({
      driverId: d.driverId,
      carrierId: d.carrierId,
      projectId: 'PRJ-NEOM-001',
      name: d.name,
      fullNameAr: d.name,
      phone: d.phone,
      idNumber: d.idNumber,
      status: d.status,
      _version: currentVersion,
      _cachedAt: now,
    }));
    await indexedDBService.putMany('drivers', driversToCache);
    await indexedDBService.setMetadata({
      storeName: 'drivers',
      version: currentVersion,
      timestamp: now,
      recordCount: driversToCache.length,
      lastSyncedBy: 'SYSTEM_SEED',
    });

    // 6. Pricing Rules
    const pricingRulesToCache: CachedPricingRule[] = MASTER_PRICING_RULES.map(r => ({
      pricingRuleId: r.pricingRuleId,
      projectId: r.projectId,
      name: r.name,
      pricingType: r.pricingType,
      agreedRate: r.agreedRate,
      currency: r.currency || 'SAR',
      effectiveFrom: r.effectiveFrom,
      effectiveTo: r.effectiveTo,
      carrierId: r.carrierId,
      materialId: r.materialId,
      status: r.status,
      _version: currentVersion,
      _cachedAt: now,
    }));
    await indexedDBService.putMany('pricingRules', pricingRulesToCache);
    await indexedDBService.setMetadata({
      storeName: 'pricingRules',
      version: currentVersion,
      timestamp: now,
      recordCount: pricingRulesToCache.length,
      lastSyncedBy: 'SYSTEM_SEED',
    });
  }

  // ---------------- Query Cached Data ---------------- //

  public async getProjects(): Promise<CachedProject[]> {
    await this.initializeCache();
    return indexedDBService.getAll<CachedProject>('projects');
  }

  public async getCarriers(projectId?: string): Promise<CachedCarrier[]> {
    await this.initializeCache();
    const list = await indexedDBService.getAll<CachedCarrier>('carriers');
    if (projectId) {
      return list.filter(c => c.projectId === projectId || !c.projectId);
    }
    return list;
  }

  public async getMaterials(projectId?: string): Promise<CachedMaterial[]> {
    await this.initializeCache();
    const list = await indexedDBService.getAll<CachedMaterial>('materials');
    if (projectId) {
      return list.filter(m => m.projectId === projectId || !m.projectId);
    }
    return list;
  }

  public async getTrucks(carrierId?: string): Promise<CachedTruck[]> {
    await this.initializeCache();
    const list = await indexedDBService.getAll<CachedTruck>('trucks');
    if (carrierId) {
      return list.filter(t => t.carrierId === carrierId);
    }
    return list;
  }

  public async getDrivers(carrierId?: string): Promise<CachedDriver[]> {
    await this.initializeCache();
    const list = await indexedDBService.getAll<CachedDriver>('drivers');
    if (carrierId) {
      return list.filter(d => d.carrierId === carrierId);
    }
    return list;
  }

  public async getPricingRules(params?: {
    projectId?: string;
    carrierId?: string;
    materialId?: string;
  }): Promise<CachedPricingRule[]> {
    await this.initializeCache();
    const list = await indexedDBService.getAll<CachedPricingRule>('pricingRules');
    if (!params) return list;

    return list.filter(r => {
      if (params.projectId && r.projectId !== params.projectId) return false;
      if (params.carrierId && r.carrierId && r.carrierId !== params.carrierId) return false;
      if (params.materialId && r.materialId && r.materialId !== params.materialId) return false;
      return true;
    });
  }

  /**
   * Finds an applicable active pricing rule from local cache for a specific combination.
   */
  public async findApplicablePricingRule(
    projectId: string, 
    carrierId: string, 
    materialId: string,
    specificRuleId?: string
  ): Promise<CachedPricingRule | undefined> {
    await this.initializeCache();
    const all = await this.getPricingRules();
    
    // If specific rule was selected, check if it's available locally
    if (specificRuleId) {
      const found = all.find(r => r.pricingRuleId === specificRuleId && r.status === 'ACTIVE');
      if (found) return found;
    }

    // Otherwise match by project, carrier, material
    const matched = all.find(r => 
      r.status === 'ACTIVE' &&
      r.projectId === projectId &&
      (!r.carrierId || r.carrierId === carrierId) &&
      (!r.materialId || r.materialId === materialId)
    );

    return matched;
  }

  /**
   * Evaluates if ALL required Master Data AND Pricing Data are present locally in IndexedDB.
   * STRICT DIRECTIVE:
   * "يجب أن يعمل Loading أثناء Offline إذا كانت جميع Master Data وPricing Data اللازمة متوفرة محلياً."
   * "لا تسمح بإنشاء رحلة Offline إذا كانت بيانات التسعير غير متاحة."
   */
  public async validateOfflineTripPrerequisites(params: {
    projectId: string;
    carrierId: string;
    truckId: string;
    driverId: string;
    materialId: string;
    pricingRuleId?: string;
    shiftDate?: string;
  }): Promise<OfflineTripPrerequisitesReport> {
    await this.initializeCache();

    const [projects, carriers, trucks, drivers, materials, pricingRules] = await Promise.all([
      this.getProjects(),
      this.getCarriers(),
      this.getTrucks(),
      this.getDrivers(),
      this.getMaterials(),
      this.getPricingRules(),
    ]);

    const hasProject = projects.some(p => p.projectId === params.projectId && p.status === 'ACTIVE');
    const hasCarrier = carriers.some(c => c.carrierId === params.carrierId && c.status === 'ACTIVE');
    const hasTruck = trucks.some(t => t.truckId === params.truckId && t.status === 'ACTIVE');
    const hasDriver = drivers.some(d => d.driverId === params.driverId && d.status === 'ACTIVE');
    const hasMaterial = materials.some(m => m.materialId === params.materialId && m.status === 'ACTIVE');

    // Pricing Rule Lookup from local IndexedDB cache
    let pricingRule: CachedPricingRule | undefined;
    if (params.pricingRuleId) {
      pricingRule = pricingRules.find(r => r.pricingRuleId === params.pricingRuleId && r.status === 'ACTIVE');
    }
    if (!pricingRule) {
      pricingRule = pricingRules.find(r => 
        r.status === 'ACTIVE' &&
        r.projectId === params.projectId &&
        (!r.carrierId || r.carrierId === params.carrierId) &&
        (!r.materialId || r.materialId === params.materialId)
      );
    }

    const hasPricingRule = !!pricingRule && pricingRule.status === 'ACTIVE' && pricingRule.agreedRate > 0;
    const warningsAr: string[] = [];

    // Check date validity if pricing rule exists
    if (pricingRule && params.shiftDate) {
      if (params.shiftDate < pricingRule.effectiveFrom || params.shiftDate > pricingRule.effectiveTo) {
        warningsAr.push(`قاعدة التسعير المحلية خارج نطاق الصلاحية للتشغيل (${pricingRule.effectiveFrom} إلى ${pricingRule.effectiveTo})`);
      }
    }

    let blockingReasonAr: string | undefined;

    // RULE: "لا تسمح بإنشاء رحلة Offline إذا كانت بيانات التسعير غير متاحة."
    if (!hasPricingRule) {
      blockingReasonAr = 'حظر إنشاء الرحلة بدون اتصال: بيانات التسعير غير متاحة محلياً في ذاكرة المتصفح (IndexedDB). لا يُسمح نظامياً بإنشاء أي رحلة بدون احتساب تسعيري معتمد.';
    } else if (!hasProject) {
      blockingReasonAr = `المشروع (${params.projectId}) غير متوفر أو غير معتمد محلياً`;
    } else if (!hasCarrier) {
      blockingReasonAr = `الناقل (${params.carrierId}) غير متوفر أو غير نشط في الذاكرة المحلية`;
    } else if (!hasTruck) {
      blockingReasonAr = `الشاحنة (${params.truckId}) غير متوفرة أو معطلة في الذاكرة المحلية`;
    } else if (!hasDriver) {
      blockingReasonAr = `السائق (${params.driverId}) غير مسجل أو معطل في الذاكرة المحلية`;
    } else if (!hasMaterial) {
      blockingReasonAr = `المادة (${params.materialId}) غير متوفرة محلياً`;
    }

    const isReadyForOfflineCreation = 
      hasProject && 
      hasCarrier && 
      hasTruck && 
      hasDriver && 
      hasMaterial && 
      hasPricingRule && 
      !blockingReasonAr;

    return {
      isReadyForOfflineCreation,
      hasProject,
      hasCarrier,
      hasTruck,
      hasDriver,
      hasMaterial,
      hasPricingRule,
      pricingRule,
      blockingReasonAr,
      warningsAr,
    };
  }

  /**
   * Retrieves all cache metadata reports (version, timestamp, record count for each store).
   */
  public async getCacheMetadata(): Promise<CacheStoreMetadata[]> {
    await this.initializeCache();
    return indexedDBService.getAllMetadata();
  }

  /**
   * Re-caches Master Data and bumps the cache version and timestamp.
   */
  public async refreshCacheWithBump(): Promise<{ success: boolean; newVersion: number; timestamp: string }> {
    const metas = await indexedDBService.getAllMetadata();
    const maxVersion = metas.length > 0 ? Math.max(...metas.map(m => m.version)) : 1;
    const newVersion = maxVersion + 1;
    const now = new Date().toISOString();

    await this.seedAllMasterData();

    // Update all metadata with new version and timestamp
    const storeNames: CacheStoreName[] = ['projects', 'carriers', 'materials', 'trucks', 'drivers', 'pricingRules'];
    for (const name of storeNames) {
      const count = await indexedDBService.count(name);
      await indexedDBService.setMetadata({
        storeName: name,
        version: newVersion,
        timestamp: now,
        recordCount: count,
        lastSyncedBy: 'MANUAL_REFRESH',
      });
    }

    return {
      success: true,
      newVersion,
      timestamp: now,
    };
  }
}

export const offlineCacheService = new OfflineCacheService();
