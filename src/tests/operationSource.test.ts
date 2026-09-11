/**
 * Automated Test Suite: BLOCK 29 — Operation Source Model
 *
 * Requirements covered:
 * 1. OperationSourceType & OperationActorType definitions
 * 2. Trip metadata: sourceType, loadingDataSource, unloadingDataSource,
 *    loadingActorType, loadingActorId, unloadingActorType, unloadingActorId, sourceMetadata
 * 3. WEIGHBRIDGE flow:
 *    - sourceType = WEIGHBRIDGE
 *    - loadingDataSource = WEIGHBRIDGE
 *    - loadingActorType = IMPORT
 *    - destNetWeight = null, varianceWeight = null, unloadTime = null, unloadingActorId = null
 *    - absence of unloading data is NOT an error
 *    - status is IN_TRANSIT
 * 4. Legacy compatibility:
 *    - trips without sourceType default to MANUAL
 *    - loadingDataSource & unloadingDataSource default to MANUAL
 *    - legacy records never broken
 * 5. Strict validation for invalid sourceType and invalid actorType
 * 6. Test coverage:
 *    - MANUAL
 *    - WEIGHBRIDGE
 *    - EXCEL
 *    - GOOGLE_SHEETS
 *    - legacy trip
 *    - null unloading data
 *    - invalid sourceType
 *    - invalid actorType
 */

import {
  OperationSourceValidator,
  VALID_OPERATION_SOURCE_TYPES,
  VALID_OPERATION_ACTOR_TYPES,
} from '../validators/operationSource.validator';
import { TripValidator } from '../validators/trip.validator';
import { tripEngineService } from '../services/tripEngine.service';
import { CreateTripParams } from '../types/tripEngine';
import { TripEntity } from '../types/entities';

export interface OperationSourceTestCaseResult {
  id: string;
  name: string;
  passed: boolean;
  expected: any;
  actual: any;
  notes: string;
}

export function runOperationSourceTests(): {
  allPassed: boolean;
  total: number;
  passed: number;
  failed: number;
  results: OperationSourceTestCaseResult[];
} {
  const results: OperationSourceTestCaseResult[] = [];

  // -------------------------------------------------------------------------
  // TEST 1: MANUAL Operation Source Flow
  // -------------------------------------------------------------------------
  {
    const params: CreateTripParams = {
      tripId: 'TRP-TEST-OP-MANUAL',
      projectId: 'PRJ-NEOM-001',
      carrierId: 'CAR-ALMAJDOUIE',
      truckId: 'TRK-9901',
      driverId: 'DRV-101',
      materialId: 'MAT-AGG-01',
      pricingRuleId: 'PRC-NEOM-HAUL-TON-8.5',
      shiftDate: '2026-09-09',
      tareWeight: 14000,
      grossWeight: 44000,
      sourceType: 'MANUAL',
      loadingDataSource: 'MANUAL',
      loadingActorType: 'USER',
      loaderId: 'USR-OPERATOR-1',
    };

    const outcome = tripEngineService.createTrip(params);
    const trip = outcome.trip;

    const isSourceTypeCorrect = trip.sourceType === 'MANUAL';
    const isLoadingDataSourceCorrect = trip.loadingDataSource === 'MANUAL';
    const isLoadingActorTypeCorrect = trip.loadingActorType === 'USER';
    const validation = OperationSourceValidator.validate(trip);

    results.push({
      id: 'OP-01-MANUAL',
      name: 'إنشاء رحلة يدوية (MANUAL) بمصدر تحميل MANUAL ومنفذ USER',
      passed: isSourceTypeCorrect && isLoadingDataSourceCorrect && isLoadingActorTypeCorrect && validation.isValid,
      expected: {
        sourceType: 'MANUAL',
        loadingDataSource: 'MANUAL',
        loadingActorType: 'USER',
        isValid: true,
      },
      actual: {
        sourceType: trip.sourceType,
        loadingDataSource: trip.loadingDataSource,
        loadingActorType: trip.loadingActorType,
        isValid: validation.isValid,
      },
      notes: 'تم التحقق من ضبط مصدر البيانات ومنفذ العملية كـ MANUAL و USER بنجاح',
    });
  }

  // -------------------------------------------------------------------------
  // TEST 2: WEIGHBRIDGE Operation Source Flow
  // -------------------------------------------------------------------------
  {
    const params: CreateTripParams = {
      tripId: 'TRP-TEST-OP-WEIGHBRIDGE',
      projectId: 'PRJ-NEOM-001',
      carrierId: 'CAR-ALMAJDOUIE',
      truckId: 'TRK-9901',
      driverId: 'DRV-101',
      materialId: 'MAT-AGG-01',
      pricingRuleId: 'PRC-NEOM-HAUL-TON-8.5',
      shiftDate: '2026-09-09',
      tareWeight: 14200,
      grossWeight: 45000,
      sourceType: 'WEIGHBRIDGE',
      ticketId: 'WB-TKT-99104',
      loaderId: 'SCALE-OP-01',
    };

    const outcome = tripEngineService.createTrip(params);
    const trip = outcome.trip;

    const isSourceTypeWeighbridge = trip.sourceType === 'WEIGHBRIDGE';
    const isLoadingDataSourceWeighbridge = trip.loadingDataSource === 'WEIGHBRIDGE';
    const isLoadingActorTypeImport = trip.loadingActorType === 'IMPORT';
    const isStatusInTransit = trip.status === 'IN_TRANSIT';
    const isDestNetWeightNull = trip.destNetWeight === null;
    const isVarianceWeightNull = trip.varianceWeight === null;
    const isUnloadTimeNull = trip.unloadTime === null;
    const isUnloadingActorIdNull = trip.unloadingActorId === null;

    const validation = OperationSourceValidator.validate(trip);

    const passed =
      isSourceTypeWeighbridge &&
      isLoadingDataSourceWeighbridge &&
      isLoadingActorTypeImport &&
      isStatusInTransit &&
      isDestNetWeightNull &&
      isVarianceWeightNull &&
      isUnloadTimeNull &&
      isUnloadingActorIdNull &&
      validation.isValid;

    results.push({
      id: 'OP-02-WEIGHBRIDGE',
      name: 'إنشاء رحلة من مصدر ميزان (WEIGHBRIDGE) مع التحقق من الحقول وغياب بيانات التفريغ',
      passed,
      expected: {
        sourceType: 'WEIGHBRIDGE',
        loadingDataSource: 'WEIGHBRIDGE',
        loadingActorType: 'IMPORT',
        status: 'IN_TRANSIT',
        destNetWeight: null,
        varianceWeight: null,
        unloadTime: null,
        unloadingActorId: null,
        isValid: true,
      },
      actual: {
        sourceType: trip.sourceType,
        loadingDataSource: trip.loadingDataSource,
        loadingActorType: trip.loadingActorType,
        status: trip.status,
        destNetWeight: trip.destNetWeight,
        varianceWeight: trip.varianceWeight,
        unloadTime: trip.unloadTime,
        unloadingActorId: trip.unloadingActorId,
        isValid: validation.isValid,
      },
      notes: 'تم التحقق من مطابقة متطلبات الميزان: sourceType=WEIGHBRIDGE، loadingActorType=IMPORT، والحالة IN_TRANSIT مع null لأوزان ومواعيد التفريغ',
    });
  }

  // -------------------------------------------------------------------------
  // TEST 3: EXCEL Import Operation Source Flow
  // -------------------------------------------------------------------------
  {
    const params: CreateTripParams = {
      tripId: 'TRP-TEST-OP-EXCEL',
      projectId: 'PRJ-NEOM-001',
      carrierId: 'CAR-BINLADIN',
      truckId: 'TRK-9902',
      driverId: 'DRV-102',
      materialId: 'MAT-SND-01',
      pricingRuleId: 'PRC-NEOM-SND-TRIP',
      shiftDate: '2026-09-09',
      tareWeight: 13800,
      grossWeight: 44300,
      sourceType: 'EXCEL',
      loadingDataSource: 'EXCEL',
      loadingActorType: 'IMPORT',
      sourceMetadata: {
        importBatchId: 'BATCH-2026-EXCEL-001',
        sourceFileId: 'DRIVE-FILE-88910',
        sourceFileName: 'dispatch_log_sep09.xlsx',
        sourceSheetName: 'Trips_Sheet_1',
        sourceRowId: 104,
        sourceMimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    };

    const outcome = tripEngineService.createTrip(params);
    const trip = outcome.trip;

    const isSourceExcel = trip.sourceType === 'EXCEL';
    const isLoadingSourceExcel = trip.loadingDataSource === 'EXCEL';
    const isActorImport = trip.loadingActorType === 'IMPORT';
    const hasMetadata =
      trip.sourceMetadata?.sourceFileName === 'dispatch_log_sep09.xlsx' &&
      trip.sourceMetadata?.sourceRowId === 104 &&
      trip.sourceMetadata?.importBatchId === 'BATCH-2026-EXCEL-001';

    const validation = OperationSourceValidator.validate(trip);

    results.push({
      id: 'OP-03-EXCEL',
      name: 'إنشاء رحلة مستوردة من ملف إكسل (EXCEL) مع حفظ البيانات الوصفية sourceMetadata',
      passed: isSourceExcel && isLoadingSourceExcel && isActorImport && hasMetadata && validation.isValid,
      expected: {
        sourceType: 'EXCEL',
        loadingDataSource: 'EXCEL',
        loadingActorType: 'IMPORT',
        sourceFileName: 'dispatch_log_sep09.xlsx',
        sourceRowId: 104,
        isValid: true,
      },
      actual: {
        sourceType: trip.sourceType,
        loadingDataSource: trip.loadingDataSource,
        loadingActorType: trip.loadingActorType,
        sourceFileName: trip.sourceMetadata?.sourceFileName,
        sourceRowId: trip.sourceMetadata?.sourceRowId,
        isValid: validation.isValid,
      },
      notes: 'تم التحقق من دعم استيراد إكسل وتخزين البيانات الوصفية للملف والصف دون أخطاء',
    });
  }

  // -------------------------------------------------------------------------
  // TEST 4: GOOGLE_SHEETS Operation Source Flow
  // -------------------------------------------------------------------------
  {
    const params: CreateTripParams = {
      tripId: 'TRP-TEST-OP-GSHEETS',
      projectId: 'PRJ-NEOM-001',
      carrierId: 'CAR-BINLADIN',
      truckId: 'TRK-9902',
      driverId: 'DRV-102',
      materialId: 'MAT-SND-01',
      pricingRuleId: 'PRC-NEOM-SND-TRIP',
      shiftDate: '2026-09-09',
      tareWeight: 13800,
      grossWeight: 44300,
      sourceType: 'GOOGLE_SHEETS',
      loadingDataSource: 'GOOGLE_SHEETS',
      loadingActorType: 'IMPORT',
      sourceMetadata: {
        sourceFileId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
        sourceSheetName: 'Daily_Dispatch_Log',
        sourceRowId: 'row_42',
      },
    };

    const outcome = tripEngineService.createTrip(params);
    const trip = outcome.trip;

    const isSourceGSheets = trip.sourceType === 'GOOGLE_SHEETS';
    const isActorImport = trip.loadingActorType === 'IMPORT';
    const hasSheetData =
      trip.sourceMetadata?.sourceSheetName === 'Daily_Dispatch_Log' &&
      trip.sourceMetadata?.sourceFileId === '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';

    const validation = OperationSourceValidator.validate(trip);

    results.push({
      id: 'OP-04-GOOGLE_SHEETS',
      name: 'إنشاء رحلة مستوردة من جداول بيانات جوجل (GOOGLE_SHEETS)',
      passed: isSourceGSheets && isActorImport && hasSheetData && validation.isValid,
      expected: {
        sourceType: 'GOOGLE_SHEETS',
        loadingActorType: 'IMPORT',
        sourceSheetName: 'Daily_Dispatch_Log',
        isValid: true,
      },
      actual: {
        sourceType: trip.sourceType,
        loadingActorType: trip.loadingActorType,
        sourceSheetName: trip.sourceMetadata?.sourceSheetName,
        isValid: validation.isValid,
      },
      notes: 'تم التحقق من دعم مصدر GOOGLE_SHEETS وربط معرف الملف والورقة',
    });
  }

  // -------------------------------------------------------------------------
  // TEST 5: Legacy Trip Compatibility
  // -------------------------------------------------------------------------
  {
    // A legacy trip created before BLOCK 29 that has NO sourceType or source fields
    const legacyTrip: Partial<TripEntity> = {
      tripId: 'TRP-LEGACY-2025-001',
      tripNumber: 'TRP-2025-001',
      projectId: 'PRJ-NEOM-NORTH-01',
      carrierId: 'CAR-ALMAJDOUIE',
      truckId: 'TRK-9901',
      driverId: 'DRV-101',
      materialId: 'MAT-AGG-01',
      pricingRuleId: 'PRC-NEOM-AGG-TON',
      status: 'COMPLETED',
      weights: {
        originTareKg: 14000,
        originGrossKg: 44000,
        originNetKg: 30000,
      },
      carrierSnapshot: {
        carrierId: 'CAR-ALMAJDOUIE',
        companyNameAr: 'شركة المجدوعي',
        commercialRegistrationNo: '1010101010',
      },
      truckSnapshot: {
        truckId: 'TRK-9901',
        plateNumberAr: 'أ ب ج 1234',
        tareWeightKg: 14000,
        legalPayloadLimitKg: 32000,
      },
      driverSnapshot: {
        driverId: 'DRV-101',
        fullNameAr: 'خالد عبدالله',
        nationalOrIqamaId: '1098765432',
        phone: '0501234567',
      },
      materialSnapshot: {
        materialId: 'MAT-AGG-01',
        code: 'AGG-20MM',
        nameAr: 'ركام بازلتي',
        unitOfMeasure: 'TON',
      },
      pricingSnapshot: {
        pricingRuleId: 'PRC-NEOM-AGG-TON',
        pricingType: 'PER_TON',
        agreedRate: 45,
        currency: 'SAR',
        settlementBase: 30,
        settlementAmount: 1350,
        pricingSnapshotAt: '2025-12-01T10:00:00.000Z',
      },
      financials: {
        baseAmountSAR: 1350,
        demurrageAmountSAR: 0,
        deductionsAmountSAR: 0,
        subtotalSAR: 1350,
        vatAmountSAR: 202.5,
        totalAmountSAR: 1552.5,
        currency: 'SAR',
        isFinalized: true,
      },
      clientUUID: 'LEGACY-UUID-01',
      syncStatus: 'SYNCED',
      hasExceptions: false,
      activeExceptionCount: 0,
    };

    // 1. TripValidator.validate must not fail on missing sourceType
    const tripValidation = TripValidator.validate(legacyTrip);

    // 2. Normalization must assign MANUAL defaults
    const normalized = OperationSourceValidator.normalizeTripOperationSource(legacyTrip);

    const isLegacyValid = tripValidation.isValid;
    const isDefaultManual = normalized.sourceType === 'MANUAL';
    const isLoadingManual = normalized.loadingDataSource === 'MANUAL';
    const isUnloadingManual = normalized.unloadingDataSource === 'MANUAL';
    const isActorUser = normalized.loadingActorType === 'USER';

    const passed = isLegacyValid && isDefaultManual && isLoadingManual && isUnloadingManual && isActorUser;

    results.push({
      id: 'OP-05-LEGACY-COMPATIBILITY',
      name: 'التوافق مع الرحلات القديمة (Legacy Trips) وتعيين القيم الافتراضية MANUAL بدون كسر السجلات',
      passed,
      expected: {
        isLegacyValid: true,
        sourceType: 'MANUAL',
        loadingDataSource: 'MANUAL',
        unloadingDataSource: 'MANUAL',
        loadingActorType: 'USER',
      },
      actual: {
        isLegacyValid,
        sourceType: normalized.sourceType,
        loadingDataSource: normalized.loadingDataSource,
        unloadingDataSource: normalized.unloadingDataSource,
        loadingActorType: normalized.loadingActorType,
      },
      notes: 'الرحلات القديمة التي لا تملك sourceType لا تفشل في التحقق وتُضبط افتراضياً على MANUAL و USER',
    });
  }

  // -------------------------------------------------------------------------
  // TEST 6: Null Unloading Data in In-Transit Weighbridge Trip
  // -------------------------------------------------------------------------
  {
    const weighbridgeInTransit = {
      sourceType: 'WEIGHBRIDGE' as const,
      loadingDataSource: 'WEIGHBRIDGE' as const,
      loadingActorType: 'IMPORT' as const,
      loadingActorId: 'SCALE-OP-01',
      destNetWeight: null,
      varianceWeight: null,
      unloadTime: null,
      unloadingActorId: null,
      unloadingDataSource: null,
      unloadingActorType: null,
      status: 'IN_TRANSIT',
    };

    const validation = OperationSourceValidator.validate(weighbridgeInTransit);

    // Absence of unloading data MUST NOT be an error
    const noUnloadingErrors = !validation.errors.some(
      e => e.field.includes('destNetWeight') || e.field.includes('varianceWeight') || e.field.includes('unloadTime')
    );

    results.push({
      id: 'OP-06-NULL-UNLOADING-DATA',
      name: 'غياب بيانات التفريغ في رحلة الميزان (null) لا يعتبر خطأ أثناء مرحلة العبور (IN_TRANSIT)',
      passed: validation.isValid && noUnloadingErrors,
      expected: {
        isValid: true,
        destNetWeightNullAllowed: true,
        varianceWeightNullAllowed: true,
      },
      actual: {
        isValid: validation.isValid,
        errorsCount: validation.errors.length,
      },
      notes: 'تم تأكيد أن غياب بيانات التفريغ ليس خطأ في رحلات الميزان قيد التوصيل',
    });
  }

  // -------------------------------------------------------------------------
  // TEST 7: Invalid sourceType Strict Validation
  // -------------------------------------------------------------------------
  {
    const invalidInputs = ['PAPER_SLIP', 'DATABASE', 'EXTERNAL_SOURCE', '', 12345];
    let allInvalidCaught = true;
    const failureDetails: string[] = [];

    for (const invalidSource of invalidInputs) {
      const valResult = OperationSourceValidator.validate({
        sourceType: invalidSource,
      });

      const hasSourceTypeError = valResult.errors.some(e => e.code === 'INVALID_OPERATION_SOURCE_TYPE');
      if (valResult.isValid || !hasSourceTypeError) {
        allInvalidCaught = false;
        failureDetails.push(`Failed to catch invalid sourceType: "${invalidSource}"`);
      }
    }

    results.push({
      id: 'OP-07-INVALID-SOURCETYPE',
      name: 'التحقق الصارم من رفض أي sourceType غير صالح (مثل PAPER_SLIP أو DATABASE)',
      passed: allInvalidCaught,
      expected: { allInvalidCaught: true },
      actual: { allInvalidCaught, failureDetails },
      notes: 'تم رفض كافة القيم غير المصرح بها وإرجاع كود الخطأ INVALID_OPERATION_SOURCE_TYPE',
    });
  }

  // -------------------------------------------------------------------------
  // TEST 8: Invalid actorType Strict Validation
  // -------------------------------------------------------------------------
  {
    const invalidActors = ['ROBOT', 'EXTERNAL', 'AUTOMATION', 'SCRIPT', 999];
    let allInvalidCaught = true;
    const failureDetails: string[] = [];

    for (const invalidActor of invalidActors) {
      const valResult = OperationSourceValidator.validate({
        sourceType: 'MANUAL',
        loadingActorType: invalidActor,
      });

      const hasActorError = valResult.errors.some(e => e.code === 'INVALID_OPERATION_ACTOR_TYPE');
      if (valResult.isValid || !hasActorError) {
        allInvalidCaught = false;
        failureDetails.push(`Failed to catch invalid actorType: "${invalidActor}"`);
      }
    }

    results.push({
      id: 'OP-08-INVALID-ACTORTYPE',
      name: 'التحقق الصارم من رفض أي actorType غير صالح (مثل ROBOT أو EXTERNAL)',
      passed: allInvalidCaught,
      expected: { allInvalidCaught: true },
      actual: { allInvalidCaught, failureDetails },
      notes: 'تم رفض كافة المنفذين غير المصرح بهم وإرجاع كود الخطأ INVALID_OPERATION_ACTOR_TYPE',
    });
  }

  // -------------------------------------------------------------------------
  // TEST 9: Full Source Types & Actor Types Coverage (CSV, GOOGLE_DRIVE, API, MIGRATION, SYSTEM)
  // -------------------------------------------------------------------------
  {
    const sourceTypes = VALID_OPERATION_SOURCE_TYPES;
    const actorTypes = VALID_OPERATION_ACTOR_TYPES;

    let allSourcesValid = true;
    for (const st of sourceTypes) {
      if (!OperationSourceValidator.isValidSourceType(st)) {
        allSourcesValid = false;
      }
    }

    let allActorsValid = true;
    for (const at of actorTypes) {
      if (!OperationSourceValidator.isValidActorType(at)) {
        allActorsValid = false;
      }
    }

    // Test API source with SYSTEM actor
    const apiSystemValidation = OperationSourceValidator.validate({
      sourceType: 'API',
      loadingDataSource: 'API',
      loadingActorType: 'SYSTEM',
      loadingActorId: 'GATEWAY-API-SVC-01',
    });

    // Test MIGRATION source
    const migrationValidation = OperationSourceValidator.validate({
      sourceType: 'MIGRATION',
      loadingDataSource: 'MIGRATION',
      loadingActorType: 'SYSTEM',
    });

    // Test CSV source
    const csvValidation = OperationSourceValidator.validate({
      sourceType: 'CSV',
      loadingDataSource: 'CSV',
      loadingActorType: 'IMPORT',
      sourceMetadata: {
        sourceFileName: 'trips_dump.csv',
      },
    });

    // Test GOOGLE_DRIVE source
    const driveValidation = OperationSourceValidator.validate({
      sourceType: 'GOOGLE_DRIVE',
      loadingDataSource: 'GOOGLE_DRIVE',
      loadingActorType: 'IMPORT',
      sourceMetadata: {
        sourceFileId: 'DRIVE_ID_ABC123',
      },
    });

    const passed =
      allSourcesValid &&
      allActorsValid &&
      sourceTypes.length === 8 &&
      actorTypes.length === 3 &&
      apiSystemValidation.isValid &&
      migrationValidation.isValid &&
      csvValidation.isValid &&
      driveValidation.isValid;

    results.push({
      id: 'OP-09-FULL-ENUM-COVERAGE',
      name: 'التحقق من تغطية جميع الأنواع الثمانية للمصادر (8 Types) والأنواع الثلاثة للمنفذين (3 Actors)',
      passed,
      expected: {
        totalSources: 8,
        totalActors: 3,
        apiSystemValid: true,
        migrationValid: true,
        csvValid: true,
        driveValid: true,
      },
      actual: {
        totalSources: sourceTypes.length,
        totalActors: actorTypes.length,
        apiSystemValid: apiSystemValidation.isValid,
        migrationValid: migrationValidation.isValid,
        csvValid: csvValidation.isValid,
        driveValid: driveValidation.isValid,
      },
      notes: 'تم فحص MANUAL, WEIGHBRIDGE, EXCEL, CSV, GOOGLE_SHEETS, GOOGLE_DRIVE, API, MIGRATION و USER, IMPORT, SYSTEM',
    });
  }

  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.length - passedCount;

  return {
    allPassed: failedCount === 0,
    total: results.length,
    passed: passedCount,
    failed: failedCount,
    results,
  };
}
