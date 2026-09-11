/**
 * Excel & CSV Entity Resolver
 * BLOCK 31 & BLOCK 35: Entity Resolution & Intelligent Data Quality
 * Strictly implements IImportEntityResolver from BLOCK 30
 * 
 * Powered by EntityResolutionService:
 * - Exact Match (1.0)
 * - Normalized Match (0.92)
 * - Approved Alias / Variant (0.94)
 * - Fuzzy Candidate Generation (0.65-0.89)
 * - Critical Relationship Validations (Truck ↔ Carrier, Driver ↔ Carrier, Material ↔ Project)
 * - Truck without Carrier detection (TRUCK_MATCHED_CARRIER_UNKNOWN)
 * - Strict Project Isolation (Server-side)
 * - Composite Risk Scoring (LOW / MEDIUM / HIGH / CRITICAL)
 * - No silent auto-merge
 */

import { IImportEntityResolver } from './contracts';
import { PipelineContext, ImportEntityResolutionInfo, EntityResolutionItem } from '../../types/unifiedImport';
import { CanonicalTripRow } from '../../types/excelCsvImport';
import { EntityResolutionService } from './entityResolution.service';

export class ExcelCsvTripEntityResolver implements IImportEntityResolver<CanonicalTripRow> {
  public resolveEntities(
    mapped: CanonicalTripRow,
    _rowNumber: number,
    context: PipelineContext
  ): Record<string, ImportEntityResolutionInfo> {
    const resolutions: Record<string, ImportEntityResolutionInfo> = {};

    // 1. Resolve Carrier
    let carrierRes: EntityResolutionItem | undefined;
    if (mapped.carrier !== undefined && mapped.carrier !== null) {
      carrierRes = EntityResolutionService.resolveCarrier(String(mapped.carrier), context);
      resolutions.carrier = carrierRes;
    }

    // 2. Resolve Truck (with CRITICAL RELATIONSHIP VALIDATION against Carrier)
    if (mapped.truckNo !== undefined && mapped.truckNo !== null) {
      resolutions.truck = EntityResolutionService.resolveTruck(
        String(mapped.truckNo),
        context,
        carrierRes,
        mapped.carrier ? String(mapped.carrier) : undefined
      );
    }

    // 3. Resolve Driver (with CRITICAL RELATIONSHIP VALIDATION against Carrier)
    if (mapped.driverName !== undefined && mapped.driverName !== null) {
      resolutions.driver = EntityResolutionService.resolveDriver(
        String(mapped.driverName),
        context,
        carrierRes,
        mapped.carrier ? String(mapped.carrier) : undefined
      );
    }

    // 4. Resolve Material (with Material ↔ Project scope validation)
    if (mapped.materialType !== undefined && mapped.materialType !== null) {
      resolutions.material = EntityResolutionService.resolveMaterial(
        String(mapped.materialType),
        context
      );
    }

    return resolutions;
  }
}
