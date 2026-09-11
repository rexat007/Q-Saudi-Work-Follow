/**
 * BLOCK 35: Intelligent Entity Resolution & Data Quality Service
 * 
 * Implements a secure, deterministic 5-stage matching pipeline:
 * 1. Exact Match
 * 2. Normalized Match
 * 3. Approved Alias / Variant Match
 * 4. Fuzzy Candidate Generation (Requires Review - NEVER Auto-Accepted)
 * 5. Unknown / No Match
 * 
 * Core Features:
 * - Critical Relationship Validation (Truck ↔ Carrier, Driver ↔ Carrier, Material ↔ Project)
 * - Truck without Carrier detection (TRUCK_MATCHED_CARRIER_UNKNOWN)
 * - Strict Project Isolation (Server-side enforcement against cross-project entity hijacking)
 * - Risk Scoring (LOW, MEDIUM, HIGH, CRITICAL)
 * - Auto-Accept Rules (Strictly for LOW risk with 0 relationship conflicts)
 * - Human Review Decision Engine & Immutable Auditing
 * - Approved Alias Learning / Memory
 * - Strict Invariant: Zero Firestore writes during resolution phase
 */

import {
  EntityResolutionMethod,
  EntityResolutionItem,
  EntityResolutionCandidate,
  EntityResolutionConfig,
  EntityResolutionAuditEntry,
  ApprovedAliasEntry,
  TargetEntityType,
  ResolutionRiskLevel,
  RelationshipStatus,
  EntityResolutionRecommendation,
} from '../../types/entityResolution';
import { PipelineContext, ImportRow } from '../../types/unifiedImport';
import { EntityNormalizationService } from './entityNormalization.service';
import { computeArabicSimilarity, isOnlyAlifOrVowelDifference } from '../dataQuality/fuzzyMatch';

export const DEFAULT_ENTITY_RESOLUTION_CONFIG: EntityResolutionConfig = {
  highConfidenceThreshold: 0.90,
  fuzzyConfidenceThreshold: 0.65,
  ambiguityMargin: 0.05,
  autoAcceptAllowed: true,
};

export class EntityResolutionService {
  // In-memory alias registry: [projectId][entityType][normalizedAlias] => ApprovedAliasEntry
  private static approvedAliasesMemory: Map<string, Map<string, Map<string, ApprovedAliasEntry>>> = new Map();

  // In-memory audit log for resolution decisions
  private static resolutionAuditLog: EntityResolutionAuditEntry[] = [];

  /**
   * Resolves Carrier entity against project master data.
   */
  public static resolveCarrier(
    rawVal: string | null | undefined,
    context: PipelineContext,
    config: EntityResolutionConfig = DEFAULT_ENTITY_RESOLUTION_CONFIG
  ): EntityResolutionItem {
    const raw = String(rawVal ?? '').trim();
    const normalized = EntityNormalizationService.normalizeName(raw);

    if (!raw) {
      return this.createEmptyResolution('CARRIER');
    }

    const carriers = this.getProjectCarriers(context);
    const aliases = this.getApprovedAliases(context.projectId, 'CARRIER', context);

    // 1. Exact Match
    for (const c of carriers) {
      if (c.name.trim() === raw || c.carrierId === raw) {
        return {
          entityType: 'CARRIER',
          sourceValue: raw,
          normalizedValue: normalized,
          matchedValue: c.name,
          entityId: c.carrierId,
          confidence: 1.0,
          matchMethod: 'EXACT',
          riskLevel: 'LOW',
          relationshipStatus: 'VALID',
          recommendation: 'ACCEPT',
          isExact: true,
          isAuthorized: true,
          originalValue: raw,
          matchedId: c.carrierId,
          matchedName: c.name,
        };
      }
    }

    // 2. Normalized Match
    for (const c of carriers) {
      const cNorm = EntityNormalizationService.normalizeName(c.name);
      if (cNorm === normalized) {
        return {
          entityType: 'CARRIER',
          sourceValue: raw,
          normalizedValue: normalized,
          matchedValue: c.name,
          entityId: c.carrierId,
          confidence: 0.92,
          matchMethod: 'NORMALIZED',
          riskLevel: 'LOW',
          relationshipStatus: 'VALID',
          recommendation: 'ACCEPT',
          isExact: false,
          isAuthorized: true,
          originalValue: raw,
          matchedId: c.carrierId,
          matchedName: c.name,
        };
      }
    }

    // 3. Approved Alias / Variant Match
    const aliasEntry = aliases.get(normalized) || aliases.get(EntityNormalizationService.stripCorporateAffixes(raw));
    if (aliasEntry) {
      return {
        entityType: 'CARRIER',
        sourceValue: raw,
        normalizedValue: normalized,
        matchedValue: aliasEntry.targetDisplayName,
        entityId: aliasEntry.targetEntityId,
        confidence: 0.94,
        matchMethod: 'ALIAS',
        riskLevel: 'LOW',
        relationshipStatus: 'VALID',
        recommendation: 'ACCEPT',
        isExact: false,
        isAuthorized: true,
        originalValue: raw,
        matchedId: aliasEntry.targetEntityId,
        matchedName: aliasEntry.targetDisplayName,
      };
    }

    // Check pre-configured aliases inside master carrier objects
    for (const c of carriers) {
      if (c.aliases && Array.isArray(c.aliases)) {
        for (const al of c.aliases) {
          if (
            EntityNormalizationService.normalizeName(al) === normalized ||
            EntityNormalizationService.stripCorporateAffixes(al) === EntityNormalizationService.stripCorporateAffixes(raw)
          ) {
            return {
              entityType: 'CARRIER',
              sourceValue: raw,
              normalizedValue: normalized,
              matchedValue: c.name,
              entityId: c.carrierId,
              confidence: 0.93,
              matchMethod: 'ALIAS',
              riskLevel: 'LOW',
              relationshipStatus: 'VALID',
              recommendation: 'ACCEPT',
              isExact: false,
              isAuthorized: true,
              originalValue: raw,
              matchedId: c.carrierId,
              matchedName: c.name,
            };
          }
        }
      }
    }

    // 4. Fuzzy Match Candidate Generation
    const candidates: EntityResolutionCandidate[] = [];
    for (const c of carriers) {
      const sim = computeArabicSimilarity(raw, c.name);
      const conf = Math.min(1.0, Math.max(0.0, sim.score / 100));
      if (conf >= config.fuzzyConfidenceThreshold) {
        candidates.push({
          candidateEntityId: c.carrierId,
          candidateDisplayName: c.name,
          confidence: conf,
          matchMethod: 'FUZZY',
          normalizedValue: EntityNormalizationService.normalizeName(c.name),
          projectId: c.projectId || context.projectId,
        });
      }
    }

    // Sort descending by confidence
    candidates.sort((a, b) => b.confidence - a.confidence);

    if (candidates.length > 0) {
      const top = candidates[0];
      // Check ambiguity: if top two are within ambiguityMargin
      const isAmbiguous = candidates.length > 1 && (top.confidence - candidates[1].confidence) <= config.ambiguityMargin;

      // Check subtle differences (e.g. vowel elongation: الفازي vs الفزي)
      const vowelDiff = isOnlyAlifOrVowelDifference(normalized, top.normalizedValue);

      return {
        entityType: 'CARRIER',
        sourceValue: raw,
        normalizedValue: normalized,
        matchedValue: top.candidateDisplayName,
        entityId: top.candidateEntityId,
        confidence: top.confidence,
        matchMethod: 'FUZZY',
        riskLevel: isAmbiguous ? 'HIGH' : 'MEDIUM',
        relationshipStatus: 'VALID',
        recommendation: 'REVIEW', // NEVER auto-accepted!
        isExact: false,
        isAuthorized: true,
        candidates,
        ambiguous: isAmbiguous,
        conflictDetails: isAmbiguous
          ? `غموض في المطابقة: يوجد أكثر من ناقل مرشح بنسب متقاربة جداً (${Math.round(top.confidence * 100)}% و ${Math.round(candidates[1].confidence * 100)}%).`
          : vowelDiff
          ? `تشابه تقريبي مع فارق في حرف المد أو الألف (${top.candidateDisplayName}). يتطلب مراجعة بشرية لمنع الدمج الخاطئ.`
          : `مطابقة تقريبية مقترحة (${top.candidateDisplayName}) بنسبة ${Math.round(top.confidence * 100)}%. تتطلب اعتماد المستخدم.`,
        originalValue: raw,
        matchedId: top.candidateEntityId,
        matchedName: top.candidateDisplayName,
      };
    }

    // 5. Unknown
    return {
      entityType: 'CARRIER',
      sourceValue: raw,
      normalizedValue: normalized,
      confidence: 0.0,
      matchMethod: 'NONE',
      riskLevel: 'HIGH',
      relationshipStatus: 'VALID',
      recommendation: 'UNKNOWN',
      isExact: false,
      isAuthorized: false,
      conflictDetails: `الناقل (${raw}) غير مسجل في السجلات المعتمدة للمشروع.`,
      originalValue: raw,
    };
  }

  /**
   * Resolves Truck entity and performs CRITICAL RELATIONSHIP VALIDATION with Carrier.
   */
  public static resolveTruck(
    rawVal: string | null | undefined,
    context: PipelineContext,
    carrierResolution?: EntityResolutionItem,
    rawClaimedCarrier?: string,
    config: EntityResolutionConfig = DEFAULT_ENTITY_RESOLUTION_CONFIG
  ): EntityResolutionItem {
    const raw = String(rawVal ?? '').trim();
    const normalized = EntityNormalizationService.normalizePlate(raw);

    if (!raw) {
      return this.createEmptyResolution('TRUCK');
    }

    const trucks = this.getProjectTrucks(context);
    const truckCarrierMap = context.knownEntities?.truckCarrierMap || {};

    let matchedTruck: { truckId: string; plate: string; carrierId?: string; projectId?: string } | undefined;
    let matchMethod: EntityResolutionMethod = 'NONE';
    let confidence = 0.0;
    let isExact = false;

    // 1. Exact Match
    for (const t of trucks) {
      if (t.plate.trim() === raw || t.truckId === raw) {
        matchedTruck = t;
        matchMethod = 'EXACT';
        confidence = 1.0;
        isExact = true;
        break;
      }
    }

    // 2. Normalized Match
    if (!matchedTruck) {
      for (const t of trucks) {
        if (EntityNormalizationService.normalizePlate(t.plate) === normalized) {
          matchedTruck = t;
          matchMethod = 'NORMALIZED';
          confidence = 0.92;
          isExact = false;
          break;
        }
      }
    }

    // 3. Fallback: Check known truckPlates array if trucks list empty
    if (!matchedTruck && context.knownEntities?.truckPlates) {
      for (const p of context.knownEntities.truckPlates) {
        if (p.trim() === raw) {
          matchedTruck = { truckId: p, plate: p, carrierId: truckCarrierMap[p] || truckCarrierMap[raw] };
          matchMethod = 'EXACT';
          confidence = 1.0;
          isExact = true;
          break;
        }
        if (EntityNormalizationService.normalizePlate(p) === normalized) {
          matchedTruck = { truckId: p, plate: p, carrierId: truckCarrierMap[p] || truckCarrierMap[raw] };
          matchMethod = 'NORMALIZED';
          confidence = 0.92;
          isExact = false;
          break;
        }
      }
    }

    // 4. Fuzzy Candidate Generation
    let candidates: EntityResolutionCandidate[] = [];
    if (!matchedTruck) {
      for (const t of trucks) {
        const sim = computeArabicSimilarity(normalized, EntityNormalizationService.normalizePlate(t.plate));
        const conf = Math.min(1.0, Math.max(0.0, sim.score / 100));
        if (conf >= config.fuzzyConfidenceThreshold) {
          candidates.push({
            candidateEntityId: t.truckId,
            candidateDisplayName: t.plate,
            confidence: conf,
            matchMethod: 'FUZZY',
            normalizedValue: EntityNormalizationService.normalizePlate(t.plate),
            metadata: { carrierId: t.carrierId },
          });
        }
      }

      candidates.sort((a, b) => b.confidence - a.confidence);
      if (candidates.length > 0) {
        const top = candidates[0];
        matchedTruck = {
          truckId: top.candidateEntityId,
          plate: top.candidateDisplayName,
          carrierId: top.metadata?.carrierId,
        };
        matchMethod = 'FUZZY';
        confidence = top.confidence;
      }
    }

    // If Truck is NOT found:
    if (!matchedTruck) {
      return {
        entityType: 'TRUCK',
        sourceValue: raw,
        normalizedValue: normalized,
        confidence: 0.0,
        matchMethod: 'NONE',
        riskLevel: 'HIGH',
        relationshipStatus: 'VALID',
        recommendation: 'REVIEW',
        isExact: false,
        isAuthorized: false,
        conflictDetails: `الشاحنة / اللوحة (${raw}) غير مسجلة في سجلات أسطول المشروع.`,
        originalValue: raw,
      };
    }

    // Truck is recognized! Now evaluate CRITICAL RELATIONSHIP VALIDATION:
    const registeredCarrier =
      matchedTruck.carrierId ||
      truckCarrierMap[matchedTruck.plate] ||
      truckCarrierMap[raw] ||
      truckCarrierMap[normalized];

    const claimedCarrier =
      carrierResolution?.matchedValue ||
      carrierResolution?.entityId ||
      (rawClaimedCarrier ? String(rawClaimedCarrier).trim() : undefined);

    let relStatus: RelationshipStatus = 'VALID';
    let riskLevel: ResolutionRiskLevel = matchMethod === 'FUZZY' ? 'MEDIUM' : 'LOW';
    let recommendation: EntityResolutionRecommendation = matchMethod === 'FUZZY' ? 'REVIEW' : 'ACCEPT';
    let conflictDetails: string | undefined;

    // RULE 9: Truck matched, but Carrier is completely missing from row
    if (!claimedCarrier || claimedCarrier === '') {
      relStatus = 'TRUCK_MATCHED_CARRIER_UNKNOWN';
      riskLevel = 'HIGH';
      recommendation = 'REVIEW';
      conflictDetails = `تم التعرف على الشاحنة (${matchedTruck.plate})، ولكن بيان الناقل مفقود من ملف الاستيراد. النظام يمنع تخمين أو استنتاج الناقل تلقائياً.`;
    }
    // RULE 8: Truck linked to Carrier A in Master Data, but file specifies Carrier B
    else if (registeredCarrier) {
      const regNorm = EntityNormalizationService.normalizeName(registeredCarrier);
      const claimedNorm = EntityNormalizationService.normalizeName(claimedCarrier);

      if (regNorm !== claimedNorm && !this.areCarriersEquivalent(registeredCarrier, claimedCarrier, context)) {
        relStatus = 'RELATIONSHIP_CONFLICT';
        riskLevel = 'CRITICAL';
        recommendation = 'REVIEW'; // STRICTLY FORBIDDEN to auto-accept or silently reassign!
        conflictDetails = `تعارض حرج في العلاقة (RELATIONSHIP_CONFLICT): الشاحنة (${matchedTruck.plate}) مقيدة في السجلات المعتمدة للناقل (${registeredCarrier})، بينما الملف الوارد ينسبها للناقل (${claimedCarrier}). يمنع النظام إعادة تعيين الشاحنة أو تعديل سجلات المشروع الأساسية تلقائياً.`;
      }
    }

    return {
      entityType: 'TRUCK',
      sourceValue: raw,
      normalizedValue: normalized,
      matchedValue: matchedTruck.plate,
      entityId: matchedTruck.truckId,
      confidence,
      matchMethod,
      riskLevel,
      relationshipStatus: relStatus,
      recommendation,
      isExact,
      isAuthorized: true,
      candidates: candidates.length > 0 ? candidates : undefined,
      conflictDetails,
      originalValue: raw,
      matchedId: matchedTruck.truckId,
      matchedName: matchedTruck.plate,
    };
  }

  /**
   * Resolves Driver entity and performs CRITICAL RELATIONSHIP VALIDATION with Carrier.
   */
  public static resolveDriver(
    rawVal: string | null | undefined,
    context: PipelineContext,
    carrierResolution?: EntityResolutionItem,
    rawClaimedCarrier?: string,
    config: EntityResolutionConfig = DEFAULT_ENTITY_RESOLUTION_CONFIG
  ): EntityResolutionItem {
    const raw = String(rawVal ?? '').trim();
    const normalized = EntityNormalizationService.normalizeName(raw);

    if (!raw) {
      return this.createEmptyResolution('DRIVER');
    }

    const drivers = this.getProjectDrivers(context);
    const driverCarrierMap = context.knownEntities?.driverCarrierMap || {};

    let matchedDriver: { driverId: string; name: string; carrierId?: string; projectId?: string } | undefined;
    let matchMethod: EntityResolutionMethod = 'NONE';
    let confidence = 0.0;
    let isExact = false;

    // 1. Exact Match
    for (const d of drivers) {
      if (d.name.trim() === raw || d.driverId === raw) {
        matchedDriver = d;
        matchMethod = 'EXACT';
        confidence = 1.0;
        isExact = true;
        break;
      }
    }

    // 2. Normalized Match
    if (!matchedDriver) {
      for (const d of drivers) {
        if (EntityNormalizationService.normalizeName(d.name) === normalized) {
          matchedDriver = d;
          matchMethod = 'NORMALIZED';
          confidence = 0.92;
          isExact = false;
          break;
        }
      }
    }

    // Fallback: check driverIds array
    if (!matchedDriver && context.knownEntities?.driverIds) {
      for (const dName of context.knownEntities.driverIds) {
        if (dName.trim() === raw) {
          matchedDriver = { driverId: dName, name: dName, carrierId: driverCarrierMap[dName] };
          matchMethod = 'EXACT';
          confidence = 1.0;
          isExact = true;
          break;
        }
        if (EntityNormalizationService.normalizeName(dName) === normalized) {
          matchedDriver = { driverId: dName, name: dName, carrierId: driverCarrierMap[dName] };
          matchMethod = 'NORMALIZED';
          confidence = 0.92;
          isExact = false;
          break;
        }
      }
    }

    // 4. Fuzzy Match
    if (!matchedDriver) {
      for (const d of drivers) {
        const sim = computeArabicSimilarity(raw, d.name);
        const conf = Math.min(1.0, Math.max(0.0, sim.score / 100));
        if (conf >= config.fuzzyConfidenceThreshold) {
          matchedDriver = { driverId: d.driverId, name: d.name, carrierId: d.carrierId };
          matchMethod = 'FUZZY';
          confidence = conf;
          break;
        }
      }
    }

    // If Driver is NOT found
    if (!matchedDriver) {
      return {
        entityType: 'DRIVER',
        sourceValue: raw,
        normalizedValue: normalized,
        confidence: 0.0,
        matchMethod: 'NONE',
        riskLevel: 'MEDIUM', // Driver is usually optional
        relationshipStatus: 'VALID',
        recommendation: 'REVIEW',
        isExact: false,
        isAuthorized: false,
        conflictDetails: `السائق (${raw}) غير مسجل في قاعدة بيانات السائقين للمشروع.`,
        originalValue: raw,
      };
    }

    // Driver recognized! RULE 10: Validate Driver ↔ Carrier relationship
    const registeredCarrier =
      matchedDriver.carrierId ||
      driverCarrierMap[matchedDriver.name] ||
      driverCarrierMap[raw] ||
      driverCarrierMap[normalized];

    const claimedCarrier =
      carrierResolution?.matchedValue ||
      carrierResolution?.entityId ||
      (rawClaimedCarrier ? String(rawClaimedCarrier).trim() : undefined);

    let relStatus: RelationshipStatus = 'VALID';
    let riskLevel: ResolutionRiskLevel = matchMethod === 'FUZZY' ? 'MEDIUM' : 'LOW';
    let recommendation: EntityResolutionRecommendation = matchMethod === 'FUZZY' ? 'REVIEW' : 'ACCEPT';
    let conflictDetails: string | undefined;

    if (registeredCarrier && claimedCarrier) {
      const regNorm = EntityNormalizationService.normalizeName(registeredCarrier);
      const claimedNorm = EntityNormalizationService.normalizeName(claimedCarrier);

      if (regNorm !== claimedNorm && !this.areCarriersEquivalent(registeredCarrier, claimedCarrier, context)) {
        relStatus = 'RELATIONSHIP_CONFLICT';
        riskLevel = 'CRITICAL';
        recommendation = 'REVIEW';
        conflictDetails = `تعارض كفالة/تشغيل السائق: السائق (${matchedDriver.name}) مسجل تحت الناقل (${registeredCarrier})، بينما ملف الاستيراد يشير للناقل (${claimedCarrier}). لا يتم تعديل كفالة السائق تلقائياً.`;
      }
    }

    return {
      entityType: 'DRIVER',
      sourceValue: raw,
      normalizedValue: normalized,
      matchedValue: matchedDriver.name,
      entityId: matchedDriver.driverId,
      confidence,
      matchMethod,
      riskLevel,
      relationshipStatus: relStatus,
      recommendation,
      isExact,
      isAuthorized: true,
      conflictDetails,
      originalValue: raw,
      matchedId: matchedDriver.driverId,
      matchedName: matchedDriver.name,
    };
  }

  /**
   * Resolves Material entity and validates Material ↔ Project scope.
   */
  public static resolveMaterial(
    rawVal: string | null | undefined,
    context: PipelineContext,
    config: EntityResolutionConfig = DEFAULT_ENTITY_RESOLUTION_CONFIG
  ): EntityResolutionItem {
    const raw = String(rawVal ?? '').trim();
    const normalized = EntityNormalizationService.normalizeName(raw);

    if (!raw) {
      return this.createEmptyResolution('MATERIAL');
    }

    const materials = this.getProjectMaterials(context);
    const authorizedMaterialIds = context.knownEntities?.projectMaterials || context.knownEntities?.materialCodes;

    let matchedMaterial: { materialId: string; name: string; code?: string; projectId?: string } | undefined;
    let matchMethod: EntityResolutionMethod = 'NONE';
    let confidence = 0.0;
    let isExact = false;

    // 1. Exact Match
    for (const m of materials) {
      if (m.name.trim() === raw || m.code?.trim() === raw || m.materialId === raw) {
        matchedMaterial = m;
        matchMethod = 'EXACT';
        confidence = 1.0;
        isExact = true;
        break;
      }
    }

    // 2. Normalized Match
    if (!matchedMaterial) {
      for (const m of materials) {
        if (
          EntityNormalizationService.normalizeName(m.name) === normalized ||
          (m.code && EntityNormalizationService.normalizeName(m.code) === normalized)
        ) {
          matchedMaterial = m;
          matchMethod = 'NORMALIZED';
          confidence = 0.92;
          isExact = false;
          break;
        }
      }
    }

    // Fallback check in materialCodes
    if (!matchedMaterial && context.knownEntities?.materialCodes) {
      for (const code of context.knownEntities.materialCodes) {
        if (code.trim() === raw) {
          matchedMaterial = { materialId: code, name: code, code };
          matchMethod = 'EXACT';
          confidence = 1.0;
          isExact = true;
          break;
        }
        if (EntityNormalizationService.normalizeName(code) === normalized) {
          matchedMaterial = { materialId: code, name: code, code };
          matchMethod = 'NORMALIZED';
          confidence = 0.92;
          isExact = false;
          break;
        }
      }
    }

    // 4. Fuzzy Match
    let candidates: EntityResolutionCandidate[] = [];
    if (!matchedMaterial) {
      for (const m of materials) {
        const sim = computeArabicSimilarity(raw, m.name);
        const conf = Math.min(1.0, Math.max(0.0, sim.score / 100));
        if (conf >= config.fuzzyConfidenceThreshold) {
          candidates.push({
            candidateEntityId: m.materialId,
            candidateDisplayName: m.name,
            confidence: conf,
            matchMethod: 'FUZZY',
            normalizedValue: EntityNormalizationService.normalizeName(m.name),
          });
        }
      }

      candidates.sort((a, b) => b.confidence - a.confidence);
      if (candidates.length > 0) {
        const top = candidates[0];
        const isAmbiguous = candidates.length > 1 && (top.confidence - candidates[1].confidence) <= config.ambiguityMargin;
        matchedMaterial = {
          materialId: top.candidateEntityId,
          name: top.candidateDisplayName,
        };
        matchMethod = 'FUZZY';
        confidence = top.confidence;
      }
    }

    // If NOT found:
    if (!matchedMaterial) {
      return {
        entityType: 'MATERIAL',
        sourceValue: raw,
        normalizedValue: normalized,
        confidence: 0.0,
        matchMethod: 'NONE',
        riskLevel: 'HIGH',
        relationshipStatus: 'VALID',
        recommendation: 'REVIEW',
        isExact: false,
        isAuthorized: false,
        conflictDetails: `المادة (${raw}) غير مسجلة في قائمة المواد المعتمدة للمشروع.`,
        originalValue: raw,
      };
    }

    // Material recognized! RULE 11: Validate Material ↔ Project scope
    let relStatus: RelationshipStatus = 'VALID';
    let riskLevel: ResolutionRiskLevel = matchMethod === 'FUZZY' ? 'MEDIUM' : 'LOW';
    let recommendation: EntityResolutionRecommendation = matchMethod === 'FUZZY' ? 'REVIEW' : 'ACCEPT';
    let conflictDetails: string | undefined;

    if (authorizedMaterialIds && authorizedMaterialIds.length > 0) {
      const isAuthorized =
        authorizedMaterialIds.includes(matchedMaterial.materialId) ||
        authorizedMaterialIds.includes(matchedMaterial.name) ||
        (matchedMaterial.code ? authorizedMaterialIds.includes(matchedMaterial.code) : false) ||
        authorizedMaterialIds.some((auth) => EntityNormalizationService.normalizeName(auth) === normalized);

      if (!isAuthorized) {
        relStatus = 'MATERIAL_PROJECT_CONFLICT';
        riskLevel = 'CRITICAL';
        recommendation = 'REVIEW';
        conflictDetails = `تعارض المادة مع نطاق المشروع: المادة [${matchedMaterial.name}] غير مصرح بنقلها أو غير معتمدة في هذا المشروع (${context.projectId}). يمنع استيرادها تلقائياً.`;
      }
    }

    return {
      entityType: 'MATERIAL',
      sourceValue: raw,
      normalizedValue: normalized,
      matchedValue: matchedMaterial.name,
      entityId: matchedMaterial.materialId,
      confidence,
      matchMethod,
      riskLevel,
      relationshipStatus: relStatus,
      recommendation,
      isExact,
      isAuthorized: relStatus === 'VALID',
      candidates: candidates.length > 0 ? candidates : undefined,
      conflictDetails,
      originalValue: raw,
      matchedId: matchedMaterial.materialId,
      matchedName: matchedMaterial.name,
    };
  }

  /**
   * Computes composite Risk Score for an entire row combining all entity resolution results
   * with duplicate flags and project scope checks.
   */
  public static calculateRowRisk(
    resolutions: Record<string, EntityResolutionItem>,
    isDuplicate: boolean = false
  ): ResolutionRiskLevel {
    const items = Object.values(resolutions);

    // 1. Any CRITICAL relationship conflict
    const hasCriticalConflict = items.some(
      (it) =>
        it.riskLevel === 'CRITICAL' ||
        it.relationshipStatus === 'RELATIONSHIP_CONFLICT' ||
        it.relationshipStatus === 'DRIVER_CARRIER_CONFLICT' ||
        it.relationshipStatus === 'MATERIAL_PROJECT_CONFLICT' ||
        it.relationshipStatus === 'CROSS_PROJECT_BLOCKED'
    );

    if (hasCriticalConflict) {
      return 'CRITICAL';
    }

    // RULE 22: Duplicate + Entity resolution conflict or medium/high risk elevates to CRITICAL
    const hasElevatedEntityRisk = items.some((it) => it.riskLevel === 'HIGH' || it.riskLevel === 'MEDIUM');
    if (isDuplicate && hasElevatedEntityRisk) {
      return 'CRITICAL';
    }

    if (isDuplicate) {
      return 'HIGH';
    }

    // 2. Any HIGH risk (unknown entities, ambiguity, truck without carrier)
    const hasHighRisk = items.some(
      (it) =>
        it.riskLevel === 'HIGH' ||
        it.relationshipStatus === 'TRUCK_MATCHED_CARRIER_UNKNOWN' ||
        it.matchMethod === 'NONE' ||
        it.ambiguous
    );

    if (hasHighRisk) {
      return 'HIGH';
    }

    // 3. Any MEDIUM risk (fuzzy match candidates requiring human confirmation)
    const hasMediumRisk = items.some((it) => it.riskLevel === 'MEDIUM' || it.matchMethod === 'FUZZY');
    if (hasMediumRisk) {
      return 'MEDIUM';
    }

    // 4. LOW: All resolved cleanly with high confidence and no conflicts
    return 'LOW';
  }

  /**
   * Evaluates whether a row is eligible for automatic acceptance (AUTO_ACCEPT).
   * Strict Saudi Logistics Rule: Auto-accept ONLY for LOW risk exact/normalized matches
   * with zero relationship conflicts, zero ambiguity, and zero duplicate flags.
   */
  public static canAutoAcceptRow(
    resolutions: Record<string, EntityResolutionItem>,
    isDuplicate: boolean = false
  ): boolean {
    const risk = this.calculateRowRisk(resolutions, isDuplicate);
    if (risk !== 'LOW') {
      return false;
    }

    for (const item of Object.values(resolutions)) {
      if (item.matchMethod === 'FUZZY' || item.matchMethod === 'NONE') {
        return false;
      }
      if (item.confidence < 0.90) {
        return false;
      }
      if (item.relationshipStatus !== 'VALID' && item.relationshipStatus !== 'NOT_APPLICABLE') {
        return false;
      }
      if (item.ambiguous) {
        return false;
      }
    }

    return true;
  }

  /**
   * Applies a manual user decision on an entity resolution item (Human-in-the-loop).
   * Generates an immutable audit trail entry and strictly enforces project isolation.
   */
  public static applyUserDecision(params: {
    projectId: string;
    importBatchId: string;
    operationId: string;
    rowNumber: number;
    entityType: TargetEntityType;
    decision: 'ACCEPT_CANDIDATE' | 'REJECT_CANDIDATE' | 'SELECT_ALTERNATE' | 'LEAVE_UNRESOLVED';
    selectedEntityId?: string;
    selectedDisplayName?: string;
    currentRowResolution: EntityResolutionItem;
    context: PipelineContext;
    actorId: string;
    notes?: string;
  }): {
    updatedResolution: EntityResolutionItem;
    auditEntry: EntityResolutionAuditEntry;
  } {
    const {
      projectId,
      importBatchId,
      operationId,
      rowNumber,
      entityType,
      decision,
      selectedEntityId,
      selectedDisplayName,
      currentRowResolution,
      context,
      actorId,
      notes,
    } = params;

    // RULE 20 & 21: Server-side Project Isolation Verification
    if (selectedEntityId && (decision === 'ACCEPT_CANDIDATE' || decision === 'SELECT_ALTERNATE')) {
      const isEntityInProject = this.verifyEntityBelongsToProject(selectedEntityId, entityType, projectId, context);
      if (!isEntityInProject) {
        throw new Error(
          `Security Violation: Entity ID (${selectedEntityId}) does not belong to project (${projectId}). Cross-project entity hijacking blocked.`
        );
      }
    }

    const previousResolution = { ...currentRowResolution };
    const updatedResolution: EntityResolutionItem = { ...currentRowResolution };

    switch (decision) {
      case 'ACCEPT_CANDIDATE':
        updatedResolution.entityId = selectedEntityId || currentRowResolution.entityId;
        updatedResolution.matchedValue = selectedDisplayName || currentRowResolution.matchedValue;
        updatedResolution.matchedId = updatedResolution.entityId;
        updatedResolution.matchedName = updatedResolution.matchedValue;
        updatedResolution.recommendation = 'ACCEPT';
        updatedResolution.riskLevel = 'LOW';
        updatedResolution.conflictDetails = undefined;
        updatedResolution.relationshipStatus = 'VALID';
        break;

      case 'REJECT_CANDIDATE':
        updatedResolution.entityId = undefined;
        updatedResolution.matchedValue = undefined;
        updatedResolution.matchedId = undefined;
        updatedResolution.matchedName = undefined;
        updatedResolution.recommendation = 'REJECT';
        updatedResolution.riskLevel = 'HIGH';
        updatedResolution.conflictDetails = 'تم رفض المرشح المقترح من قبل المستخدم.';
        break;

      case 'SELECT_ALTERNATE':
        updatedResolution.entityId = selectedEntityId;
        updatedResolution.matchedValue = selectedDisplayName || selectedEntityId;
        updatedResolution.matchedId = selectedEntityId;
        updatedResolution.matchedName = updatedResolution.matchedValue;
        updatedResolution.confidence = 1.0;
        updatedResolution.matchMethod = 'EXACT';
        updatedResolution.recommendation = 'ACCEPT';
        updatedResolution.riskLevel = 'LOW';
        updatedResolution.relationshipStatus = 'VALID';
        updatedResolution.conflictDetails = undefined;
        break;

      case 'LEAVE_UNRESOLVED':
        updatedResolution.recommendation = 'REVIEW';
        updatedResolution.riskLevel = 'HIGH';
        break;
    }

    // Generate Audit Trail Entry
    const auditEntry: EntityResolutionAuditEntry = {
      projectId,
      importBatchId,
      operationId,
      rowId: rowNumber,
      entityType,
      sourceValue: currentRowResolution.sourceValue,
      selectedEntityId: updatedResolution.entityId,
      previousResolution,
      newResolution: updatedResolution,
      confidence: updatedResolution.confidence,
      matchMethod: updatedResolution.matchMethod,
      riskLevel: updatedResolution.riskLevel,
      actorId,
      timestamp: new Date().toISOString(),
      decision,
      notes,
    };

    this.resolutionAuditLog.push(auditEntry);

    return { updatedResolution, auditEntry };
  }

  /**
   * Registers an approved alias for future memory and reuse.
   */
  public static registerApprovedAlias(
    projectId: string,
    entityType: TargetEntityType,
    aliasText: string,
    targetEntityId: string,
    targetDisplayName: string,
    approvedBy: string
  ): ApprovedAliasEntry {
    const normalized = EntityNormalizationService.normalizeName(aliasText);
    const entry: ApprovedAliasEntry = {
      aliasId: `ALIAS-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      projectId,
      entityType,
      aliasText,
      normalizedAlias: normalized,
      targetEntityId,
      targetDisplayName,
      approvedBy,
      approvedAt: new Date().toISOString(),
    };

    if (!this.approvedAliasesMemory.has(projectId)) {
      this.approvedAliasesMemory.set(projectId, new Map());
    }
    const projectMap = this.approvedAliasesMemory.get(projectId)!;

    if (!projectMap.has(entityType)) {
      projectMap.set(entityType, new Map());
    }
    const typeMap = projectMap.get(entityType)!;

    typeMap.set(normalized, entry);
    return entry;
  }

  /**
   * Returns all audit trail entries, optionally filtered by batch or project.
   */
  public static getAuditLog(filter?: { projectId?: string; importBatchId?: string }): EntityResolutionAuditEntry[] {
    return this.resolutionAuditLog.filter((entry) => {
      if (filter?.projectId && entry.projectId !== filter.projectId) return false;
      if (filter?.importBatchId && entry.importBatchId !== filter.importBatchId) return false;
      return true;
    });
  }

  /**
   * Helper to retrieve approved aliases for project & type.
   */
  private static getApprovedAliases(
    projectId: string,
    entityType: TargetEntityType,
    context?: PipelineContext
  ): Map<string, ApprovedAliasEntry> {
    const result = new Map<string, ApprovedAliasEntry>();

    // 1. From context knownEntities.approvedAliases
    if (context?.knownEntities?.approvedAliases?.[entityType]) {
      for (const [aliasStr, targetId] of Object.entries(context.knownEntities.approvedAliases[entityType])) {
        const norm = EntityNormalizationService.normalizeName(aliasStr);
        result.set(norm, {
          aliasId: `CTX-${aliasStr}`,
          projectId,
          entityType,
          aliasText: aliasStr,
          normalizedAlias: norm,
          targetEntityId: targetId,
          targetDisplayName: targetId,
          approvedBy: 'SYSTEM_CONFIG',
          approvedAt: new Date().toISOString(),
        });
      }
    }

    // 2. From in-memory registered aliases
    const projectMap = this.approvedAliasesMemory.get(projectId);
    if (projectMap && projectMap.has(entityType)) {
      const typeMap = projectMap.get(entityType)!;
      typeMap.forEach((val, key) => result.set(key, val));
    }

    return result;
  }

  /**
   * Verifies that an entity exists in the specified project scope (Server-side project isolation).
   */
  private static verifyEntityBelongsToProject(
    entityId: string,
    entityType: TargetEntityType,
    projectId: string,
    context: PipelineContext
  ): boolean {
    if (context.projectId !== projectId) {
      return false;
    }

    switch (entityType) {
      case 'CARRIER': {
        const carriers = this.getProjectCarriers(context);
        return carriers.some((c) => c.carrierId === entityId);
      }
      case 'TRUCK': {
        const trucks = this.getProjectTrucks(context);
        return trucks.some((t) => t.truckId === entityId || t.plate === entityId);
      }
      case 'DRIVER': {
        const drivers = this.getProjectDrivers(context);
        return drivers.some((d) => d.driverId === entityId || d.name === entityId);
      }
      case 'MATERIAL': {
        const materials = this.getProjectMaterials(context);
        return materials.some((m) => m.materialId === entityId || m.name === entityId || m.code === entityId);
      }
      default:
        return true;
    }
  }

  /**
   * Helper: Check if two carrier identifiers are equivalent (e.g. ID vs Name).
   */
  private static areCarriersEquivalent(c1: string, c2: string, context: PipelineContext): boolean {
    const carriers = this.getProjectCarriers(context);
    const found1 = carriers.find((c) => c.carrierId === c1 || c.name === c1);
    const found2 = carriers.find((c) => c.carrierId === c2 || c.name === c2);
    if (found1 && found2) {
      return found1.carrierId === found2.carrierId;
    }
    return EntityNormalizationService.normalizeName(c1) === EntityNormalizationService.normalizeName(c2);
  }

  private static getProjectCarriers(context: PipelineContext): Array<{ carrierId: string; name: string; aliases?: string[]; projectId?: string }> {
    if (context.knownEntities?.carriers && context.knownEntities.carriers.length > 0) {
      return context.knownEntities.carriers.filter((c) => !c.projectId || c.projectId === context.projectId);
    }
    if (context.knownEntities?.carrierIds) {
      return context.knownEntities.carrierIds.map((id) => ({
        carrierId: id,
        name: id,
        projectId: context.projectId,
      }));
    }
    return [];
  }

  private static getProjectTrucks(context: PipelineContext): Array<{ truckId: string; plate: string; carrierId?: string; projectId?: string }> {
    if (context.knownEntities?.trucks && context.knownEntities.trucks.length > 0) {
      return context.knownEntities.trucks.filter((t) => !t.projectId || t.projectId === context.projectId);
    }
    if (context.knownEntities?.truckPlates) {
      return context.knownEntities.truckPlates.map((plate) => ({
        truckId: plate,
        plate,
        carrierId: context.knownEntities?.truckCarrierMap?.[plate],
        projectId: context.projectId,
      }));
    }
    return [];
  }

  private static getProjectDrivers(context: PipelineContext): Array<{ driverId: string; name: string; carrierId?: string; projectId?: string }> {
    if (context.knownEntities?.drivers && context.knownEntities.drivers.length > 0) {
      return context.knownEntities.drivers.filter((d) => !d.projectId || d.projectId === context.projectId);
    }
    if (context.knownEntities?.driverIds) {
      return context.knownEntities.driverIds.map((name) => ({
        driverId: name,
        name,
        carrierId: context.knownEntities?.driverCarrierMap?.[name],
        projectId: context.projectId,
      }));
    }
    return [];
  }

  private static getProjectMaterials(context: PipelineContext): Array<{ materialId: string; name: string; code?: string; projectId?: string }> {
    if (context.knownEntities?.materials && context.knownEntities.materials.length > 0) {
      return context.knownEntities.materials.filter((m) => !m.projectId || m.projectId === context.projectId);
    }
    if (context.knownEntities?.materialCodes) {
      return context.knownEntities.materialCodes.map((code) => ({
        materialId: code,
        name: code,
        code,
        projectId: context.projectId,
      }));
    }
    return [];
  }

  private static createEmptyResolution(entityType: TargetEntityType): EntityResolutionItem {
    return {
      entityType,
      sourceValue: '',
      normalizedValue: '',
      confidence: 0,
      matchMethod: 'NONE',
      riskLevel: 'LOW',
      relationshipStatus: 'VALID',
      recommendation: 'REVIEW',
      isExact: false,
      isAuthorized: false,
      originalValue: '',
    };
  }
}
