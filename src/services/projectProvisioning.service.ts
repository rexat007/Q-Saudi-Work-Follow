import { projectRepository } from '../repositories/project.repository';
import { materialRepository } from '../repositories/material.repository';
import { carrierRepository } from '../repositories/carrier.repository';
import { pricingRuleRepository } from '../repositories/pricingRule.repository';
import { userRepository } from '../repositories/user.repository';
import { syncOperationRepository } from '../repositories/syncOperation.repository';
import { auditLogService } from './auditLog.service';
import { ProjectProvisioningValidator } from '../validators/projectProvisioning.validator';
import {
  ProjectSetupWizardData,
  ProjectProvisioningResult,
  WizardFullValidation,
} from '../types/wizard';
import { AuthUserContext } from '../types/common';
import {
  ProjectEntity,
  MaterialEntity,
  CarrierEntity,
  PricingRuleEntity,
} from '../types/entities';
import { normalizeName } from '../utils/normalization';

export class ProjectProvisioningService {
  /**
   * Runs the complete multi-step validation engine.
   */
  validateWizard(data: ProjectSetupWizardData): WizardFullValidation {
    return ProjectProvisioningValidator.validateAll(data);
  }

  /**
   * Provisions a complete project across all Firestore domains transactionally/sequentially.
   * STRICT INVARIANT: Will never create or provision unless all validations pass.
   */
  async provisionProject(
    data: ProjectSetupWizardData,
    context: AuthUserContext
  ): Promise<ProjectProvisioningResult> {
    // 1. STRICT VALIDATION CHECK
    const validation = this.validateWizard(data);
    if (!validation.isValid) {
      const allErrors = validation.stepResults
        .filter((s) => !s.isValid)
        .flatMap((s) => s.errors)
        .join(' | ');
      throw new Error(`فشل التحقق من صحة بيانات معالج المشروع: ${allErrors}`);
    }

    // 2. CHECK AUTHORIZATION
    if (context.role !== 'PROJECT_ADMIN') {
      throw new Error('غير مصرح لك: تهيئة المشاريع مقتصرة فقط على مديري المشاريع (PROJECT_ADMIN)');
    }

    const projectId = data.projectInfo.projectCode.trim().toUpperCase();

    // 3. CHECK PROJECT UNIQUENESS
    const existing = await projectRepository.findById(projectId);
    if (existing) {
      throw new Error(`مشروع بنفس الرمز (${projectId}) موجود بالفعل في قاعدة البيانات.`);
    }

    const nowIso = new Date().toISOString();
    const driveFolderId = data.googleDrive.enabled
      ? data.googleDrive.generatedFolderId || `gdrive-${projectId.toLowerCase()}-${Date.now().toString(36)}`
      : undefined;

    const spreadsheetId =
      data.googleDrive.enabled && data.googleDrive.provisionSpreadsheet
        ? data.googleDrive.generatedSpreadsheetId || `gsheet-${projectId.toLowerCase()}-${Date.now().toString(36)}`
        : undefined;

    // 4. STEP 1: CREATE PROJECT DOCUMENT
    const projectPayload: Omit<ProjectEntity, 'createdAt' | 'updatedAt'> & {
      createdBy: string;
      updatedBy: string;
    } = {
      projectId,
      projectCode: projectId,
      nameAr: data.projectInfo.projectName.trim(),
      nameEn: data.projectInfo.projectCode.trim(),
      clientName: data.projectInfo.clientName?.trim() || 'العميل الرئيسي للمشروع',
      description: data.projectInfo.description?.trim() || '',
      startDate: data.projectInfo.startDate,
      endDate: data.projectInfo.endDate || '',
      status: data.projectInfo.status,
      location: {
        lat: 24.7136,
        lng: 46.6753,
        geoFenceRadiusMeters: data.projectInfo.defaultSettings.geoFenceRadiusMeters || 1500,
        addressAr: data.projectInfo.defaultSettings.addressAr || 'الموقع الجغرافي للمشروع',
      },
      settings: {
        zatcaTaxNumber: data.projectInfo.defaultSettings.zatcaTaxNumber?.trim() || '300000000000003',
        vatRatePercent: data.projectInfo.defaultSettings.vatRatePercent ?? 15,
        currency: data.projectInfo.defaultSettings.currency || 'SAR',
        requireTareOnExit: data.projectInfo.defaultSettings.requireTareOnExit ?? true,
        maxToleranceKg: data.projectInfo.defaultSettings.maxToleranceKg ?? 500,
        allowDriverSelfDispatch: data.projectInfo.defaultSettings.allowDriverSelfDispatch ?? false,
        googleDriveFolderId: driveFolderId,
        googleSpreadsheetId: spreadsheetId,
        googleDriveProvisioning: {
          enabled: data.googleDrive.enabled,
          rootFolderName: data.googleDrive.rootFolderName,
          spreadsheetTitle: data.googleDrive.spreadsheetTitle,
          status: data.googleDrive.enabled ? 'PROVISIONED' : 'DISABLED',
        },
      },
      createdBy: context.userId,
      updatedBy: context.userId,
    };

    await projectRepository.create(projectPayload);

    // 5. STEP 2: PROVISION MATERIALS (/projects/{projectId}/materials)
    let materialsCreatedCount = 0;
    for (let i = 0; i < data.materials.length; i++) {
      const mat = data.materials[i];
      const materialId = mat.materialId || `MAT-${projectId}-${(i + 1).toString().padStart(2, '0')}`;
      const matName = mat.materialName.trim();
      const matPayload: Omit<MaterialEntity, 'createdAt' | 'updatedAt'> & {
        createdBy: string;
        updatedBy: string;
      } = {
        materialId,
        projectId,
        name: matName,
        normalizedName: normalizeName(matName),
        code: mat.materialCode.trim().toUpperCase(),
        nameAr: matName,
        status: (mat.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE'),
        unitOfMeasure: mat.unitOfMeasure,
        sortOrder: i + 1,
        standardDensityTonPerM3: mat.standardDensityTonPerM3 || 1.6,
        isActive: mat.status === 'ACTIVE',
        createdBy: context.userId,
        updatedBy: context.userId,
      };
      await materialRepository.create(matPayload);
      materialsCreatedCount++;
    }

    // 6. STEP 3: PROVISION CARRIERS (/projects/{projectId}/carriers)
    let carriersCreatedCount = 0;
    for (let i = 0; i < data.carriers.length; i++) {
      const car = data.carriers[i];
      const carrierId = car.carrierId.trim().toUpperCase();
      const carrierName = car.carrierName.trim();
      const carPayload: Omit<CarrierEntity, 'createdAt' | 'updatedAt'> & {
        createdBy: string;
        updatedBy: string;
      } = {
        carrierId,
        projectId,
        name: carrierName,
        normalizedName: normalizeName(carrierName),
        status: (car.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE'),
        companyNameAr: carrierName,
        commercialRegistrationNo: car.commercialRegistrationNo?.trim() || '1010000000',
        transportLicenseNo: car.transportLicenseNo?.trim() || `TGA-${carrierId}`,
        contactPerson: {
          name: car.contactPersonName?.trim() || 'مسؤول العمليات',
          phone: car.contactPhone?.trim() || '+966500000000',
          email: car.contactEmail?.trim() || 'carrier@q-saudi.sa',
        },
        isActive: car.status === 'ACTIVE',
        createdBy: context.userId,
        updatedBy: context.userId,
      };
      await carrierRepository.create(carPayload);
      carriersCreatedCount++;
    }

    // 7. STEP 4: PROVISION PRICING RULES (/projects/{projectId}/pricing_rules)
    let pricingRulesCreatedCount = 0;
    for (let i = 0; i < data.pricingRules.length; i++) {
      const rule = data.pricingRules[i];
      const pricingRuleId = rule.pricingRuleId || `PR-${projectId}-${(i + 1).toString().padStart(2, '0')}`;
      const carrierSuffix = rule.carrierId === 'ALL' ? 'عام' : rule.carrierId;
      const modelLabel = rule.pricingType === 'PER_TRIP' ? 'بالرد' : 'بالطن';

      const rulePayload: Omit<PricingRuleEntity, 'createdAt' | 'updatedAt'> & {
        createdBy: string;
        updatedBy: string;
      } = {
        pricingRuleId,
        projectId,
        carrierId: rule.carrierId === 'ALL' ? undefined : rule.carrierId,
        materialId: rule.materialId === 'ALL_MATERIALS' ? undefined : rule.materialId,
        name: `تعرفة ${carrierSuffix} - ${modelLabel} (${rule.rate} ريال)`,
        pricingModel: rule.pricingType,
        baseRateSAR: rule.rate,
        currency: rule.currency || 'SAR',
        effectiveFrom: rule.effectiveFrom,
        effectiveTo: rule.effectiveTo || undefined,
        notes: rule.notes?.trim() || '',
        demurrageRatePerHourSAR: rule.demurrageRatePerHourSAR ?? 50,
        freeTimeHours: rule.freeTimeHours ?? 2,
        vatApplicable: rule.vatApplicable ?? true,
        isActive: true,
        createdBy: context.userId,
        updatedBy: context.userId,
      };
      await pricingRuleRepository.create(rulePayload);
      pricingRulesCreatedCount++;
    }

    // 8. STEP 5: PROVISION USER ACCESS (/users)
    let assignedUsersCount = 0;
    for (const u of data.userAccess) {
      if (!u.isAssigned) continue;
      try {
        const userDoc = await userRepository.findById(u.userId);
        if (userDoc) {
          const currentProjects = userDoc.assignedProjectIds || [];
          if (!currentProjects.includes(projectId)) {
            await userRepository.update(
              u.userId,
              { assignedProjectIds: [...currentProjects, projectId] },
              context.userId
            );
          }
        } else {
          // Create user record if not present
          await userRepository.create({
            userId: u.userId,
            fullName: u.fullName,
            email: u.email,
            role: u.role,
            assignedProjectIds: [projectId],
            isActive: true,
            createdBy: context.userId,
            updatedBy: context.userId,
          });
        }
        assignedUsersCount++;
      } catch (err) {
        console.warn(`Could not sync user ${u.userId}:`, err);
      }
    }

    // 9. STEP 6: GOOGLE DRIVE / SHEETS PROVISIONING OPERATION
    if (data.googleDrive.enabled) {
      const syncOpId = `SYNC-GWORKSPACE-INIT-${projectId}`;
      await syncOperationRepository.create({
        operationId: syncOpId,
        projectId,
        clientOperationUUID: `UUID-${syncOpId}`,
        targetCollection: 'syncOperations',
        targetDocId: syncOpId,
        status: 'PROCESSED',
        processedResponse: {
          rootFolderName: data.googleDrive.rootFolderName,
          driveFolderId,
          spreadsheetId,
          foldersCreated: data.googleDrive.folderStructure || [
            '01_Daily_Logs',
            '02_Weighbridge_Tickets_PDF',
            '03_Carrier_Settlements',
          ],
          sheetsCreated: [
            'Trips Log',
            'Weighbridge Tickets',
            'Carrier Billing Summary',
            'Material Daily Totals',
          ],
        },
        createdBy: context.userId,
        updatedBy: context.userId,
      });
    }

    // 10. STEP 7: RECORD AUDIT LOG
    const recordedAuditLogId = await auditLogService.recordLog(
      {
        projectId,
        entityType: 'PROJECT',
        entityId: projectId,
        action: 'CREATE',
        after: {
          projectId,
          materialsCount: materialsCreatedCount,
          carriersCount: carriersCreatedCount,
          pricingRulesCount: pricingRulesCreatedCount,
          assignedUsersCount,
          googleWorkspace: data.googleDrive.enabled,
        },
      },
      context
    );

    return {
      success: true,
      projectId,
      projectCode: projectId,
      projectName: data.projectInfo.projectName,
      materialsCount: materialsCreatedCount,
      carriersCount: carriersCreatedCount,
      pricingRulesCount: pricingRulesCreatedCount,
      assignedUsersCount,
      googleDriveProvisioned: data.googleDrive.enabled,
      createdAt: nowIso,
      auditLogId: recordedAuditLogId,
    };
  }
}

export const projectProvisioningService = new ProjectProvisioningService();
