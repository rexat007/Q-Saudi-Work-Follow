import { carrierRepository } from '../repositories/carrier.repository';
import { materialRepository } from '../repositories/material.repository';
import { truckRepository } from '../repositories/truck.repository';
import { driverRepository } from '../repositories/driver.repository';
import { tripRepository } from '../repositories/trip.repository';
import { projectRepository } from '../repositories/project.repository';
import { CarrierEntity, MaterialEntity, TruckEntity, DriverEntity } from '../types/entities';
import { AuthUserContext } from '../types/common';
import { carrierService } from './carrier.service';
import { materialService } from './material.service';
import { truckService } from './truck.service';
import { driverService } from './driver.service';
import { auditLogService } from './auditLog.service';
import { normalizeName, normalizePlate, normalizePhone, normalizeIdNumber, normalizeCode } from '../utils/normalization';

export type MasterEntityType = 'CARRIER' | 'MATERIAL' | 'TRUCK' | 'DRIVER';

export interface TripUsageResult {
  isUsed: boolean;
  count: number;
  tripNumbers: string[];
}

export interface ProjectMasterDataOverview {
  projectId: string;
  projectNameAr: string;
  authorizedCarriers: CarrierEntity[];
  authorizedMaterials: MaterialEntity[];
  authorizedTrucks: TruckEntity[];
  authorizedDrivers: DriverEntity[];
  allCarriers: CarrierEntity[];
  allMaterials: MaterialEntity[];
  allTrucks: TruckEntity[];
  allDrivers: DriverEntity[];
}

export class MasterDataService {
  /**
   * Checks whether a Master Data entity has been referenced in any historical or existing Trips.
   * Rule: ممنوع حذف Master Data المستخدمة في رحلات سابقة.
   */
  async checkTripUsage(
    projectId: string,
    entityType: MasterEntityType,
    entityId: string
  ): Promise<TripUsageResult> {
    try {
      const trips = await tripRepository.listByProject(projectId, 500);
      const matchingTrips = trips.filter(trip => {
        switch (entityType) {
          case 'CARRIER':
            return trip.carrierId === entityId || trip.carrierSnapshot?.carrierId === entityId;
          case 'MATERIAL':
            return trip.materialId === entityId || trip.materialSnapshot?.materialId === entityId;
          case 'TRUCK':
            return trip.truckId === entityId || trip.truckSnapshot?.truckId === entityId;
          case 'DRIVER':
            return trip.driverId === entityId || trip.driverSnapshot?.driverId === entityId;
          default:
            return false;
        }
      });

      return {
        isUsed: matchingTrips.length > 0,
        count: matchingTrips.length,
        tripNumbers: matchingTrips.map(t => t.tripNumber || t.tripId),
      };
    } catch {
      // In case of error or empty collection
      return {
        isUsed: false,
        count: 0,
        tripNumbers: [],
      };
    }
  }

  /**
   * Deletion guard enforcing:
   * 1. ممنوع حذف Master Data المستخدمة في رحلات سابقة (Blocks hard-delete if used in trips).
   * 2. استخدم ACTIVE/INACTIVE بدلاً من hard delete (Defaults to soft-delete by setting status = INACTIVE).
   */
  async deleteMasterEntity(
    projectId: string,
    entityType: MasterEntityType,
    entityId: string,
    context: AuthUserContext
  ): Promise<{ success: boolean; softDeleted: boolean; message: string }> {
    const usage = await this.checkTripUsage(projectId, entityType, entityId);

    if (usage.isUsed) {
      throw new Error(
        `ممنوع حذف هذا السجل (${entityId}) نظراً لارتباطه بـ ${usage.count} رحلة سابقة مسجلة (${usage.tripNumbers.slice(0, 3).join(', ')}${usage.tripNumbers.length > 3 ? '...' : ''}). لحماية السلامة المحاسبية والتاريخية، يُرجى استخدام التعطيل (INACTIVE) بدلاً من الحذف.`
      );
    }

    // Even if never used in a trip, enforce: "استخدم ACTIVE/INACTIVE بدلاً من hard delete"
    await this.setEntityStatus(projectId, entityType, entityId, 'INACTIVE', context);

    return {
      success: true,
      softDeleted: true,
      message: 'تم تعطيل السجل بنجاح وتحويل حالته إلى (INACTIVE) وفقاً لسياسة منع الحذف الفعلي.',
    };
  }

  /**
   * Directly blocks any attempt to hard-delete Master Data.
   */
  async hardDeleteMasterEntity(
    projectId: string,
    entityType: MasterEntityType,
    entityId: string,
    context: AuthUserContext
  ): Promise<void> {
    const usage = await this.checkTripUsage(projectId, entityType, entityId);
    if (usage.isUsed) {
      throw new Error(
        `ممنوع حذف Master Data المستخدمة في رحلات سابقة (${entityId}). يوجد ${usage.count} رحلة سابقة مرتبطة به.`
      );
    }
    throw new Error(
      `ممنوع الحذف الفعلي (Hard Delete) في النظام المعماري. استخدم ACTIVE/INACTIVE بدلاً من hard delete.`
    );
  }

  /**
   * Sets entity status to ACTIVE or INACTIVE
   */
  async setEntityStatus(
    projectId: string,
    entityType: MasterEntityType,
    entityId: string,
    status: 'ACTIVE' | 'INACTIVE',
    context: AuthUserContext
  ): Promise<void> {
    const isActive = status === 'ACTIVE';

    switch (entityType) {
      case 'CARRIER':
        await carrierService.updateCarrier(projectId, entityId, { status, isActive }, context);
        break;
      case 'MATERIAL':
        await materialService.updateMaterial(projectId, entityId, { status, isActive }, context);
        break;
      case 'TRUCK':
        await truckService.updateTruck(projectId, entityId, { status, isActive }, context);
        break;
      case 'DRIVER':
        await driverService.updateDriver(projectId, entityId, { status, isActive }, context);
        break;
    }

    await auditLogService.recordLog({
      projectId,
      entityType: entityType as any,
      entityId,
      action: 'UPDATE',
      after: { status, isActive },
    }, context);
  }

  /**
   * Enforces Project Scoping:
   * Rule: اجعل كل Project يحتوي فقط على المواد والناقلين المصرح لهم به.
   * Trucks and Drivers available for the project are constrained to those belonging to authorized Carriers.
   */
  async getProjectMasterData(projectId: string): Promise<ProjectMasterDataOverview> {
    const [project, allCarriers, allMaterials, allTrucks, allDrivers] = await Promise.all([
      projectRepository.findById(projectId),
      carrierRepository.listByProject(projectId),
      materialRepository.listByProject(projectId),
      truckRepository.listByProject(projectId),
      driverRepository.listByProject(projectId),
    ]);

    const projectNameAr = project?.nameAr || 'المشروع';
    const authCarrierIds = project?.authorizedCarrierIds || allCarriers.map(c => c.carrierId);
    const authMaterialIds = project?.authorizedMaterialIds || allMaterials.map(m => m.materialId);

    // 1. Authorized Carriers (must be in authorizedCarrierIds and status === ACTIVE)
    const authorizedCarriers = allCarriers.filter(
      c => authCarrierIds.includes(c.carrierId) && c.status === 'ACTIVE'
    );

    // 2. Authorized Materials (must be in authorizedMaterialIds and status === ACTIVE)
    const authorizedMaterials = allMaterials.filter(
      m => authMaterialIds.includes(m.materialId) && m.status === 'ACTIVE'
    );

    // 3. Authorized Trucks: Belongs to authorized Carrier (Truck → Carrier) AND status === ACTIVE
    const authorizedCarrierIdSet = new Set(authorizedCarriers.map(c => c.carrierId));
    const authorizedTrucks = allTrucks.filter(
      t => authorizedCarrierIdSet.has(t.carrierId) && t.status === 'ACTIVE'
    );

    // 4. Authorized Drivers: Belongs to authorized Carrier (Driver → Carrier) AND status === ACTIVE
    const authorizedDrivers = allDrivers.filter(
      d => authorizedCarrierIdSet.has(d.carrierId) && d.status === 'ACTIVE'
    );

    return {
      projectId,
      projectNameAr,
      authorizedCarriers,
      authorizedMaterials,
      authorizedTrucks,
      authorizedDrivers,
      allCarriers,
      allMaterials,
      allTrucks,
      allDrivers,
    };
  }

  /**
   * Authorizes or unauthorizes a Carrier for a Project
   */
  async toggleCarrierAuthorization(
    projectId: string,
    carrierId: string,
    authorized: boolean,
    context: AuthUserContext
  ): Promise<void> {
    const project = await projectRepository.findById(projectId);
    if (!project) throw new Error('المشروع غير موجود');

    const currentList = project.authorizedCarrierIds || (await carrierRepository.listByProject(projectId)).map(c => c.carrierId);
    let updatedList: string[];

    if (authorized) {
      updatedList = currentList.includes(carrierId) ? currentList : [...currentList, carrierId];
    } else {
      updatedList = currentList.filter(id => id !== carrierId);
    }

    await projectRepository.update(projectId, { authorizedCarrierIds: updatedList }, context.userId);
  }

  /**
   * Authorizes or unauthorizes a Material for a Project
   */
  async toggleMaterialAuthorization(
    projectId: string,
    materialId: string,
    authorized: boolean,
    context: AuthUserContext
  ): Promise<void> {
    const project = await projectRepository.findById(projectId);
    if (!project) throw new Error('المشروع غير موجود');

    const currentList = project.authorizedMaterialIds || (await materialRepository.listByProject(projectId)).map(m => m.materialId);
    let updatedList: string[];

    if (authorized) {
      updatedList = currentList.includes(materialId) ? currentList : [...currentList, materialId];
    } else {
      updatedList = currentList.filter(id => id !== materialId);
    }

    await projectRepository.update(projectId, { authorizedMaterialIds: updatedList }, context.userId);
  }

  /**
   * Validates that dispatch references belong to the authorized project scope
   */
  async validateDispatchAuthorization(
    projectId: string,
    carrierId: string,
    materialId: string,
    truckId: string,
    driverId: string
  ): Promise<{ valid: boolean; errors: string[] }> {
    const data = await this.getProjectMasterData(projectId);
    const errors: string[] = [];

    const carrier = data.authorizedCarriers.find(c => c.carrierId === carrierId);
    if (!carrier) {
      errors.push(`الناقل (${carrierId}) غير مصرح له بالعمل في هذا المشروع أو حالته غير نشطة.`);
    }

    const material = data.authorizedMaterials.find(m => m.materialId === materialId);
    if (!material) {
      errors.push(`المادة (${materialId}) غير مصرح بتوريدها في هذا المشروع أو حالتها غير نشطة.`);
    }

    const truck = data.authorizedTrucks.find(t => t.truckId === truckId);
    if (!truck) {
      errors.push(`الشاحنة (${truckId}) غير مصرح بها أو غير تابعة لناقل معتمد في هذا المشروع.`);
    } else if (truck.carrierId !== carrierId) {
      errors.push(`الشاحنة (${truckId}) غير تابعة للناقل المختار (${carrierId}) - علاقة Truck → Carrier.`);
    }

    const driver = data.authorizedDrivers.find(d => d.driverId === driverId);
    if (!driver) {
      errors.push(`السائق (${driverId}) غير مصرح له أو غير تابع لناقل معتمد في هذا المشروع.`);
    } else if (driver.carrierId !== carrierId) {
      errors.push(`السائق (${driverId}) غير تابع للناقل المختار (${carrierId}) - علاقة Driver → Carrier.`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export const masterDataService = new MasterDataService();
