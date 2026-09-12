/**
 * Operations Dashboard Service
 * Provides calculations for KPIs, tonnage variance, financial settlement snapshots,
 * carrier performance, material & pricing distributions, and live terminal board.
 * Enforces strict project authorization boundaries.
 */

import { TripRecord } from '../types/tripEngine';
import { 
  DashboardFilterParams, 
  UserSecurityProfile, 
  TripStatusMetrics, 
  TonnageMetrics, 
  SettlementMetrics, 
  CarrierPerformanceItem, 
  MaterialDistributionItem, 
  PricingDistributionItem, 
  LiveTerminalEntry 
} from '../types/dashboard';
import { tripEngineService } from './tripEngine.service';
import { DEFAULT_PROJECTS, DEFAULT_CARRIERS, DEFAULT_MATERIALS, DEFAULT_TRUCKS, DEFAULT_DRIVERS } from '../data/defaultMasterData';

// Predefined security profiles for testing and demonstration of access control
export const PREDEFINED_SECURITY_PROFILES: UserSecurityProfile[] = [
  {
    userId: 'USR-SUPER-ADMIN',
    userNameAr: 'المهندس / عبد الرحمن السعدون (مدير العمليات العام)',
    roleTitleAr: 'إدارة العمليات المركزية - كافة المشاريع',
    role: 'SUPER_ADMIN',
    authorizedProjectIds: ['ALL'],
    isRestricted: false,
  },
  {
    userId: 'USR-NEOM-MGR',
    userNameAr: 'المهندس / فهد الشمري (مدير موقع نيوم الشمالية)',
    roleTitleAr: 'إدارة موقع نيوم - محصور بمشاريع نيوم فقط',
    role: 'PROJECT_ADMIN',
    authorizedProjectIds: ['PRJ-NEOM-NORTH-01', 'PRJ-NEOM-001'],
    isRestricted: true,
  },
  {
    userId: 'USR-REDSEA-MGR',
    userNameAr: 'المهندس / خالد القحطاني (مدير وجهة البحر الأحمر)',
    roleTitleAr: 'إدارة موقع البحر الأحمر - محصور بمشروع البحر الأحمر فقط',
    role: 'PROJECT_ADMIN',
    authorizedProjectIds: ['PRJ-REDSEA-RESORT-02'],
    isRestricted: true,
  },
  {
    userId: 'USR-QIDDIYA-LEAD',
    userNameAr: 'المهندس / تركي الدوسري (مشرف مشروع القدية)',
    roleTitleAr: 'مشرف موقع القدية - محصور بمشروع القدية فقط',
    role: 'SITE_SUPERVISOR',
    authorizedProjectIds: ['PRJ-QIDDIYA-EXP-03'],
    isRestricted: true,
  },
];

// Project alias mapping to ensure data consistency
export const PROJECT_ALIASES: Record<string, string[]> = {
  'PRJ-NEOM-NORTH-01': ['PRJ-NEOM-NORTH-01', 'PRJ-NEOM-001'],
  'PRJ-NEOM-001': ['PRJ-NEOM-NORTH-01', 'PRJ-NEOM-001'],
  'PRJ-REDSEA-RESORT-02': ['PRJ-REDSEA-RESORT-02'],
  'PRJ-QIDDIYA-EXP-03': ['PRJ-QIDDIYA-EXP-03'],
};

class DashboardService {
  /**
   * Checks if a project is authorized for the given security profile.
   */
  public isProjectAuthorized(projectId: string, userProfile: UserSecurityProfile): boolean {
    if (!userProfile.isRestricted || userProfile.authorizedProjectIds.includes('ALL')) {
      return true;
    }

    // Check direct match
    if (userProfile.authorizedProjectIds.includes(projectId)) {
      return true;
    }

    // Check alias match
    for (const authId of userProfile.authorizedProjectIds) {
      const aliases = PROJECT_ALIASES[authId] || [authId];
      if (aliases.includes(projectId)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Returns only the projects that this user profile is permitted to see.
   */
  public getAuthorizedProjects(userProfile: UserSecurityProfile) {
    if (!userProfile.isRestricted || userProfile.authorizedProjectIds.includes('ALL')) {
      return DEFAULT_PROJECTS;
    }

    return DEFAULT_PROJECTS.filter(project => 
      this.isProjectAuthorized(project.projectId, userProfile)
    );
  }

  /**
   * Strictly filters raw trips by the user's project authorization boundaries.
   * GUARANTEE: No unauthorized project data will ever leak.
   */
  public filterTripsByAuthorization(
    rawTrips: TripRecord[], 
    userProfile: UserSecurityProfile
  ): TripRecord[] {
    return rawTrips.filter(trip => this.isProjectAuthorized(trip.projectId, userProfile));
  }

  /**
   * Applies both security authorization and functional filters (project, date, carrier, material, pricingType).
   */
  public getFilteredTrips(
    filters: DashboardFilterParams, 
    userProfile: UserSecurityProfile,
    customTripsPool?: TripRecord[]
  ): { trips: TripRecord[]; securityViolated: boolean } {
    const pool = customTripsPool || tripEngineService.getAllTrips();

    // 1. Check if the user is attempting to query a project they are NOT authorized for
    if (filters.projectId !== 'ALL' && !this.isProjectAuthorized(filters.projectId, userProfile)) {
      // SECURITY VIOLATION: Zero data returned
      return { trips: [], securityViolated: true };
    }

    // 2. Strict authorization boundary
    const authorizedTrips = this.filterTripsByAuthorization(pool, userProfile);

    // 3. Functional filter parameters
    const filtered = authorizedTrips.filter(trip => {
      // Project filter
      if (filters.projectId !== 'ALL') {
        const allowedAliases = PROJECT_ALIASES[filters.projectId] || [filters.projectId];
        if (!allowedAliases.includes(trip.projectId)) {
          return false;
        }
      }

      // Date range filter
      if (filters.shiftDateFrom && trip.shiftDate < filters.shiftDateFrom) {
        return false;
      }
      if (filters.shiftDateTo && trip.shiftDate > filters.shiftDateTo) {
        return false;
      }

      // Carrier filter
      if (filters.carrierId !== 'ALL' && trip.carrierId !== filters.carrierId) {
        return false;
      }

      // Material filter
      if (filters.materialId !== 'ALL' && trip.materialId !== filters.materialId) {
        return false;
      }

      // Pricing type filter
      if (filters.pricingType !== 'ALL' && trip.pricingType !== filters.pricingType) {
        return false;
      }

      return true;
    });

    return { trips: filtered, securityViolated: false };
  }

  /**
   * 1. Calculate Trip Status & Volume Metrics
   */
  public computeTripStatusMetrics(trips: TripRecord[]): TripStatusMetrics {
    const totalTrips = trips.length;
    let completedTrips = 0;
    let inTransitTrips = 0;
    let returnedTrips = 0;
    let exceptionTrips = 0;
    let pendingReviewTrips = 0;
    let pendingPricingTrips = 0;
    let weighbridgeTrips = 0;
    let manualTrips = 0;

    trips.forEach(t => {
      switch (t.status) {
        case 'COMPLETED':
          completedTrips++;
          break;
        case 'IN_TRANSIT':
        case 'LOADED':
          inTransitTrips++;
          break;
        case 'RETURNED':
          returnedTrips++;
          break;
        case 'EXCEPTION':
          exceptionTrips++;
          break;
      }

      // Review status
      if (t.hasExceptions || t.status === 'EXCEPTION' || (t as any).requiresReview) {
        pendingReviewTrips++;
      }

      // Pricing status (pending settlement or unresolved pricing)
      const isPendingPricing = Boolean(
        t.pricingSnapshot?.isPending === true ||
        t.pricingSnapshot?.pricingRuleId === 'UNRESOLVED_PENDING' ||
        t.pricingRuleId === 'UNRESOLVED_PENDING' ||
        (t as any).pricingStatus === 'PENDING' ||
        (t as any).pricingStatus === 'UNRESOLVED_PENDING' ||
        (!t.pricingSnapshot && (t.settlementAmount === 0 || !t.pricingRuleId) && (t.agreedRate === 0 || !t.agreedRate))
      );
      if (isPendingPricing) {
        pendingPricingTrips++;
      }

      // Source type (Weighbridge vs Manual vs other)
      const source = t.sourceType || t.loadingDataSource || 'WEIGHBRIDGE';
      if (source === 'WEIGHBRIDGE') {
        weighbridgeTrips++;
      } else if (source === 'MANUAL') {
        manualTrips++;
      }
    });

    const completedRatePercent = totalTrips > 0 ? Number(((completedTrips / totalTrips) * 100).toFixed(1)) : 0;
    const returnedRatePercent = totalTrips > 0 ? Number(((returnedTrips / totalTrips) * 100).toFixed(1)) : 0;

    return {
      totalTrips,
      completedTrips,
      inTransitTrips,
      returnedTrips,
      exceptionTrips,
      completedRatePercent,
      returnedRatePercent,
      pendingReviewTrips,
      pendingPricingTrips,
      weighbridgeTrips,
      manualTrips,
    };
  }

  /**
   * 2. Calculate Tonnage & Weighbridge Variance Metrics
   */
  public computeTonnageMetrics(trips: TripRecord[]): TonnageMetrics {
    let totalLoadedKg = 0;
    let totalReceivedKg = 0;

    trips.forEach(t => {
      // Net weight loaded at origin
      const loaded = t.netWeight || (t.grossWeight && t.tareWeight ? t.grossWeight - t.tareWeight : 0);
      totalLoadedKg += Math.max(0, loaded);

      // Destination net weight (if received)
      if (t.destNetWeight !== null && t.destNetWeight !== undefined) {
        totalReceivedKg += Math.max(0, t.destNetWeight);
      } else if (t.status === 'COMPLETED') {
        // If completed without separate destNet, fallback to origin net
        totalReceivedKg += Math.max(0, loaded);
      }
    });

    const totalLoadedTons = Number((totalLoadedKg / 1000).toFixed(2));
    const totalReceivedTons = Number((totalReceivedKg / 1000).toFixed(2));
    const totalVarianceTons = Number((totalReceivedTons - totalLoadedTons).toFixed(2));

    const variancePercent = totalLoadedTons > 0 
      ? Number(((totalVarianceTons / totalLoadedTons) * 100).toFixed(2)) 
      : 0;

    // Normal acceptable tolerance is within ±1.0% in construction & bulk transport
    const isVarianceAcceptable = Math.abs(variancePercent) <= 1.0;

    return {
      totalLoadedTons,
      totalReceivedTons,
      totalVarianceTons,
      variancePercent,
      isVarianceAcceptable,
    };
  }

  /**
   * 3. Calculate Financial Settlement Metrics (Strict Snapshot Invariance)
   */
  public computeSettlementMetrics(trips: TripRecord[]): SettlementMetrics {
    let totalSettlementAmount = 0;
    let tripBasedSettlementAmount = 0;
    let tonBasedSettlementAmount = 0;
    let tripBasedTripsCount = 0;
    let tonBasedTripsCount = 0;

    trips.forEach(t => {
      // Historical Snapshot settlementAmount is authoritative
      const amount = Number(t.settlementAmount || 0);
      totalSettlementAmount += amount;

      if (t.pricingType === 'PER_TRIP') {
        tripBasedSettlementAmount += amount;
        tripBasedTripsCount++;
      } else if (t.pricingType === 'PER_TON') {
        tonBasedSettlementAmount += amount;
        tonBasedTripsCount++;
      }
    });

    return {
      totalSettlementAmount: Number(totalSettlementAmount.toFixed(2)),
      tripBasedSettlementAmount: Number(tripBasedSettlementAmount.toFixed(2)),
      tonBasedSettlementAmount: Number(tonBasedSettlementAmount.toFixed(2)),
      tripBasedTripsCount,
      tonBasedTripsCount,
      currency: 'SAR',
    };
  }

  /**
   * 4. Calculate Carrier Performance
   */
  public computeCarrierPerformance(trips: TripRecord[]): CarrierPerformanceItem[] {
    const carrierMap = new Map<string, {
      totalTrips: number;
      completedTrips: number;
      returnedTrips: number;
      exceptionTrips: number;
      loadedKg: number;
      receivedKg: number;
      settlementAmount: number;
    }>();

    trips.forEach(t => {
      const cid = t.carrierId || 'UNKNOWN';
      if (!carrierMap.has(cid)) {
        carrierMap.set(cid, {
          totalTrips: 0,
          completedTrips: 0,
          returnedTrips: 0,
          exceptionTrips: 0,
          loadedKg: 0,
          receivedKg: 0,
          settlementAmount: 0,
        });
      }

      const rec = carrierMap.get(cid)!;
      rec.totalTrips++;
      if (t.status === 'COMPLETED') rec.completedTrips++;
      if (t.status === 'RETURNED') rec.returnedTrips++;
      if (t.status === 'EXCEPTION') rec.exceptionTrips++;

      const loaded = t.netWeight || (t.grossWeight && t.tareWeight ? t.grossWeight - t.tareWeight : 0);
      rec.loadedKg += Math.max(0, loaded);

      const received = t.destNetWeight !== null && t.destNetWeight !== undefined 
        ? t.destNetWeight 
        : (t.status === 'COMPLETED' ? loaded : 0);
      rec.receivedKg += Math.max(0, received);

      rec.settlementAmount += Number(t.settlementAmount || 0);
    });

    const items: CarrierPerformanceItem[] = [];
    carrierMap.forEach((val, cid) => {
      const carrier = DEFAULT_CARRIERS.find(c => c.carrierId === cid);
      const carrierNameAr = carrier?.companyNameAr || carrier?.name || cid;
      const loadedTons = Number((val.loadedKg / 1000).toFixed(2));
      const receivedTons = Number((val.receivedKg / 1000).toFixed(2));
      const varianceTons = Number((receivedTons - loadedTons).toFixed(2));
      const completionRatePercent = val.totalTrips > 0 
        ? Number(((val.completedTrips / val.totalTrips) * 100).toFixed(1)) 
        : 0;

      items.push({
        carrierId: cid,
        carrierNameAr,
        totalTrips: val.totalTrips,
        completedTrips: val.completedTrips,
        returnedTrips: val.returnedTrips,
        exceptionTrips: val.exceptionTrips,
        loadedTons,
        receivedTons,
        varianceTons,
        settlementAmount: Number(val.settlementAmount.toFixed(2)),
        completionRatePercent,
      });
    });

    return items.sort((a, b) => b.totalTrips - a.totalTrips);
  }

  /**
   * 5. Calculate Material Distribution
   */
  public computeMaterialDistribution(trips: TripRecord[]): MaterialDistributionItem[] {
    const matMap = new Map<string, {
      totalTrips: number;
      loadedKg: number;
      receivedKg: number;
      settlementAmount: number;
    }>();

    let grandTotalKg = 0;

    trips.forEach(t => {
      const mid = t.materialId || 'UNKNOWN';
      if (!matMap.has(mid)) {
        matMap.set(mid, {
          totalTrips: 0,
          loadedKg: 0,
          receivedKg: 0,
          settlementAmount: 0,
        });
      }

      const rec = matMap.get(mid)!;
      rec.totalTrips++;

      const loaded = t.netWeight || (t.grossWeight && t.tareWeight ? t.grossWeight - t.tareWeight : 0);
      rec.loadedKg += Math.max(0, loaded);
      grandTotalKg += Math.max(0, loaded);

      const received = t.destNetWeight !== null && t.destNetWeight !== undefined 
        ? t.destNetWeight 
        : (t.status === 'COMPLETED' ? loaded : 0);
      rec.receivedKg += Math.max(0, received);

      rec.settlementAmount += Number(t.settlementAmount || 0);
    });

    const items: MaterialDistributionItem[] = [];
    matMap.forEach((val, mid) => {
      const material = DEFAULT_MATERIALS.find(m => m.materialId === mid);
      const materialNameAr = material?.nameAr || material?.name || mid;
      const code = material?.code || mid;
      const loadedTons = Number((val.loadedKg / 1000).toFixed(2));
      const receivedTons = Number((val.receivedKg / 1000).toFixed(2));
      const sharePercent = grandTotalKg > 0 
        ? Number(((val.loadedKg / grandTotalKg) * 100).toFixed(1)) 
        : 0;

      items.push({
        materialId: mid,
        materialNameAr,
        code,
        totalTrips: val.totalTrips,
        loadedTons,
        receivedTons,
        settlementAmount: Number(val.settlementAmount.toFixed(2)),
        sharePercent,
      });
    });

    return items.sort((a, b) => b.loadedTons - a.loadedTons);
  }

  /**
   * 6. Calculate Pricing Distribution
   */
  public computePricingDistribution(trips: TripRecord[]): PricingDistributionItem[] {
    let tripModelTrips = 0;
    let tripModelTons = 0;
    let tripModelAmount = 0;

    let tonModelTrips = 0;
    let tonModelTons = 0;
    let tonModelAmount = 0;

    trips.forEach(t => {
      const loadedKg = t.netWeight || (t.grossWeight && t.tareWeight ? t.grossWeight - t.tareWeight : 0);
      const tons = Math.max(0, loadedKg / 1000);
      const amt = Number(t.settlementAmount || 0);

      if (t.pricingType === 'PER_TRIP') {
        tripModelTrips++;
        tripModelTons += tons;
        tripModelAmount += amt;
      } else if (t.pricingType === 'PER_TON') {
        tonModelTrips++;
        tonModelTons += tons;
        tonModelAmount += amt;
      }
    });

    const totalAmount = tripModelAmount + tonModelAmount;

    const items: PricingDistributionItem[] = [
      {
        pricingType: 'PER_TRIP',
        titleAr: 'عقود المقطوعية بالرد (PER_TRIP)',
        totalTrips: tripModelTrips,
        totalTons: Number(tripModelTons.toFixed(2)),
        totalSettlementAmount: Number(tripModelAmount.toFixed(2)),
        averageRate: tripModelTrips > 0 ? Number((tripModelAmount / tripModelTrips).toFixed(2)) : 0,
        sharePercent: totalAmount > 0 ? Number(((tripModelAmount / totalAmount) * 100).toFixed(1)) : 0,
      },
      {
        pricingType: 'PER_TON',
        titleAr: 'عقود الطن المتري (PER_TON)',
        totalTrips: tonModelTrips,
        totalTons: Number(tonModelTons.toFixed(2)),
        totalSettlementAmount: Number(tonModelAmount.toFixed(2)),
        averageRate: tonModelTons > 0 ? Number((tonModelAmount / tonModelTons).toFixed(2)) : 0,
        sharePercent: totalAmount > 0 ? Number(((tonModelAmount / totalAmount) * 100).toFixed(1)) : 0,
      },
    ];

    return items;
  }

  /**
   * 7. Generate Live Terminal Board Entries
   */
  public generateLiveTerminalBoard(trips: TripRecord[]): LiveTerminalEntry[] {
    return trips.map(t => {
      const project = DEFAULT_PROJECTS.find(p => p.projectId === t.projectId);
      const carrier = DEFAULT_CARRIERS.find(c => c.carrierId === t.carrierId);
      const material = DEFAULT_MATERIALS.find(m => m.materialId === t.materialId);
      const truck = DEFAULT_TRUCKS.find(tk => tk.truckId === t.truckId);
      const driver = DEFAULT_DRIVERS.find(d => d.driverId === t.driverId);

      const loadedWeightKg = t.netWeight || (t.grossWeight && t.tareWeight ? t.grossWeight - t.tareWeight : 0);
      const receivedWeightKg = t.destNetWeight;
      
      let varianceKg: number | null = null;
      let variancePercent: number | null = null;

      if (receivedWeightKg !== null && receivedWeightKg !== undefined && loadedWeightKg > 0) {
        varianceKg = receivedWeightKg - loadedWeightKg;
        variancePercent = Number(((varianceKg / loadedWeightKg) * 100).toFixed(2));
      }

      // Formatting time
      const timeSource = t.unloadTime || t.arrivalTime || t.loadTime || t.createdAt || '2026-09-09T08:00:00.000Z';
      let eventTimeFormatted = '';
      try {
        const d = new Date(timeSource);
        eventTimeFormatted = d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
      } catch (e) {
        eventTimeFormatted = timeSource.slice(11, 16);
      }

      return {
        tripId: t.tripId,
        tripSerial: t.tripSerial,
        ticketId: t.ticketId,
        projectId: t.projectId,
        projectNameAr: project?.nameAr || t.projectId,
        truckPlateAr: truck?.plateNumberAr || truck?.plate || t.truckId,
        truckType: truck?.truckType,
        driverNameAr: driver?.name || t.driverId,
        carrierNameAr: carrier?.companyNameAr || carrier?.name || t.carrierId,
        materialNameAr: material?.nameAr || material?.name || t.materialId,
        pricingType: t.pricingType,
        status: t.status,
        loadedWeightKg,
        receivedWeightKg,
        varianceKg,
        variancePercent,
        settlementAmount: Number(t.settlementAmount || 0),
        currency: t.currency || 'SAR',
        eventTimeFormatted,
        notes: t.notes || '',
      };
    }).sort((a, b) => {
      // Prioritize active in-transit and loaded first, then completed
      const priority: Record<string, number> = {
        'IN_TRANSIT': 1,
        'LOADED': 2,
        'EXCEPTION': 3,
        'RETURNED': 4,
        'COMPLETED': 5,
        'DRAFT': 6,
      };
      const pA = priority[a.status] || 99;
      const pB = priority[b.status] || 99;
      return pA - pB;
    });
  }
}

export const dashboardService = new DashboardService();
