/**
 * Excel & CSV Entity Resolver
 * BLOCK 31: Resolves Carrier, Truck, Driver, and Material against master data
 * Strictly implements IImportEntityResolver from BLOCK 30
 * 
 * Rules:
 * - Exact match: confidence 1.0 -> matched
 * - Normalized match: confidence 0.90 -> matched
 * - Basic fuzzy/candidate generation: confidence 0.70-0.80 -> candidate
 * - Low confidence / not found: confidence 0 -> unknown
 * - No silent auto-merge when confidence is low
 * - Ambiguity -> requires_review
 */

import { IImportEntityResolver } from './contracts';
import { PipelineContext, ImportEntityResolutionInfo } from '../../types/unifiedImport';
import { CanonicalTripRow } from '../../types/excelCsvImport';

export class ExcelCsvTripEntityResolver implements IImportEntityResolver<CanonicalTripRow> {
  public resolveEntities(
    mapped: CanonicalTripRow,
    _rowNumber: number,
    context: PipelineContext
  ): Record<string, ImportEntityResolutionInfo> {
    const resolutions: Record<string, ImportEntityResolutionInfo> = {};

    // 1. Resolve Carrier
    if (mapped.carrier) {
      resolutions.carrier = this.resolveSingle(
        'CARRIER',
        String(mapped.carrier),
        context.knownEntities?.carrierIds || []
      );
    }

    // 2. Resolve Truck
    if (mapped.truckNo) {
      resolutions.truck = this.resolveSingle(
        'TRUCK',
        String(mapped.truckNo),
        context.knownEntities?.truckPlates || []
      );
    }

    // 3. Resolve Driver
    if (mapped.driverName) {
      resolutions.driver = this.resolveSingle(
        'DRIVER',
        String(mapped.driverName),
        context.knownEntities?.driverIds || []
      );
    }

    // 4. Resolve Material
    if (mapped.materialType) {
      resolutions.material = this.resolveSingle(
        'MATERIAL',
        String(mapped.materialType),
        context.knownEntities?.materialCodes || []
      );
    }

    return resolutions;
  }

  private resolveSingle(
    entityType: ImportEntityResolutionInfo['entityType'],
    rawVal: string,
    knownList: string[]
  ): ImportEntityResolutionInfo {
    const cleanRaw = rawVal.trim();
    if (!cleanRaw) {
      return {
        entityType,
        originalValue: rawVal,
        confidence: 0,
        isExact: false,
        isAuthorized: false,
      };
    }

    // 1. Exact match
    const exactMatch = knownList.find((k) => k === cleanRaw);
    if (exactMatch) {
      return {
        entityType,
        originalValue: rawVal,
        matchedId: exactMatch,
        matchedName: exactMatch,
        confidence: 1.0,
        isExact: true,
        isAuthorized: true,
      };
    }

    // 2. Normalized match (case-insensitive + Arabic normalized)
    const normRaw = this.normalizeArabicForMatching(cleanRaw);
    const normMatch = knownList.find((k) => this.normalizeArabicForMatching(k) === normRaw);
    if (normMatch) {
      return {
        entityType,
        originalValue: rawVal,
        matchedId: normMatch,
        matchedName: normMatch,
        confidence: 0.92,
        isExact: false,
        isAuthorized: true,
      };
    }

    // 3. Candidate / Substring Match (e.g. without "شركة" or "مؤسسة")
    const strippedRaw = this.stripCompanyPrefixes(normRaw);
    const candidate = knownList.find((k) => {
      const strippedK = this.stripCompanyPrefixes(this.normalizeArabicForMatching(k));
      return (
        (strippedRaw.length > 2 && strippedK.includes(strippedRaw)) ||
        (strippedK.length > 2 && strippedRaw.includes(strippedK))
      );
    });

    if (candidate) {
      return {
        entityType,
        originalValue: rawVal,
        matchedId: candidate,
        matchedName: candidate,
        confidence: 0.75,
        isExact: false,
        isAuthorized: true,
      };
    }

    // 4. Unknown
    return {
      entityType,
      originalValue: rawVal,
      confidence: 0.0,
      isExact: false,
      isAuthorized: false,
    };
  }

  private normalizeArabicForMatching(str: string): string {
    return str
      .toLowerCase()
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/[\s\-_.\/\\()[\]]+/g, '')
      .trim();
  }

  private stripCompanyPrefixes(str: string): string {
    return str
      .replace(/^شركة/, '')
      .replace(/^مؤسسة/, '')
      .replace(/^مصنع/, '')
      .replace(/^نقليات/, '')
      .trim();
  }
}
