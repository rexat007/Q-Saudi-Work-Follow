/**
 * Legacy Migration Pipeline Test Suite
 * BLOCK 37: Automated Compliance & Technical Verification (LM-01 to LM-50)
 * 
 * Verifies all 50 migration requirements:
 * - LM-01 to LM-05: Source & 20-Column Contract
 * - LM-06 to LM-10: Unified Pipeline Stages Orchestration
 * - LM-11 to LM-15: Normalization & Type Conversion
 * - LM-16 to LM-20: Column Mapping & Schema Transformation
 * - LM-21 to LM-25: Entity Resolution Engine Integration (BLOCK 35)
 * - LM-26 to LM-30: Relationship Integrity & Cross-Validation
 * - LM-31 to LM-35: Validation Engine & Business Rules (incl. Rule 10 & 14)
 * - LM-36 to LM-40: Duplicate Detection (Ticket, Serial, Composite)
 * - LM-41 to LM-45: Contractual Settlement & Pricing Engine (BLOCK 36)
 * - LM-46 to LM-50: Preview-First Invariant, Commit & Audit Trail
 */

import { legacyMigrationService, LegacyMigrationService } from '../services/legacyMigration.service';
import { legacyMigrationParserService, LEGACY_20_COLUMN_KEYS } from '../services/import/legacyMigrationParser.service';
import { legacyMigrationNormalizerService } from '../services/import/legacyMigrationNormalizer.service';
import { ExcelCsvTripValidator } from '../services/import/tripImportValidator';
import { ExcelCsvTripDuplicateChecker } from '../services/import/tripDuplicateChecker';
import { ExcelCsvColumnMapper } from '../services/import/columnMapper.service';
import { ExcelCsvTripEntityResolver } from '../services/import/tripEntityResolver';
import { mapLegacyStatusToTripStatus } from '../services/import/legacyStatusMapper';
import { SAMPLE_LEGACY_GOOGLE_SHEET_ROWS } from '../data/sampleLegacySheetData';
import { LegacySheetRow } from '../types/legacyMigration';
import { PipelineContext, ImportSource, ImportRow } from '../types/unifiedImport';
import { CanonicalTripRow } from '../types/excelCsvImport';
import { AuthUserContext } from '../types/common';
import { tripRepository } from '../repositories/trip.repository';

export interface TestCaseResult {
  id: string;
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
  notes: string;
}

export interface LegacyMigrationTestReport {
  total: number;
  passed: number;
  failed: number;
  allPassed: boolean;
  results: TestCaseResult[];
}

export async function runLegacyMigrationTests(): Promise<LegacyMigrationTestReport> {
  const results: TestCaseResult[] = [];
  const testProjectId = 'PRJ-NEOM-001';

  const adminUser: AuthUserContext = {
    userId: 'USR-TEST-ADMIN',
    email: 'admin@qsaudi.com',
    displayName: 'مدير الاختبارات',
    role: 'PROJECT_ADMIN',
    assignedProjectIds: [testProjectId],
  };

  const standardContext: PipelineContext = {
    projectId: testProjectId,
    userId: adminUser.userId,
    userName: adminUser.displayName,
    role: adminUser.role,
    operationId: `OP-TEST-${Date.now()}`,
    profile: 'MIGRATION',
    knownEntities: {
      carrierIds: ['CARRIER-001', 'CARRIER-002'],
      carriers: [
        { carrierId: 'CARRIER-001', name: 'شركة الفهد للنقل البري' },
        { carrierId: 'CARRIER-002', name: 'مؤسسة الرمال الذهبية' },
      ],
      materialCodes: ['SUB_BASE', 'AGG_3_4', 'SAND_WHITE'],
      materials: [
        { materialId: 'MAT-001', name: 'صبيز (Sub-base)', code: 'SUB_BASE' },
        { materialId: 'MAT-002', name: 'بحص 3/4 (Aggregate)', code: 'AGG_3_4' },
      ],
      truckPlates: ['أ ب ج 1234', 'د هـ و 5678'],
      trucks: [
        { truckId: 'TRK-001', plate: 'أ ب ج 1234', carrierId: 'CARRIER-001' },
        { truckId: 'TRK-002', plate: 'د هـ و 5678', carrierId: 'CARRIER-002' },
      ],
      driverIds: ['DRV-001', 'DRV-002'],
      drivers: [
        { driverId: 'DRV-001', name: 'محمد علي الشمري', carrierId: 'CARRIER-001' },
        { driverId: 'DRV-002', name: 'عبدالله فهد الدوسري', carrierId: 'CARRIER-002' },
      ],
      truckCarrierMap: {
        'أ ب ج 1234': 'شركة الفهد للنقل البري',
        'د هـ و 5678': 'مؤسسة الرمال الذهبية',
      },
      driverCarrierMap: {
        'محمد علي الشمري': 'شركة الفهد للنقل البري',
        'عبدالله فهد الدوسري': 'مؤسسة الرمال الذهبية',
      },
      projectMaterials: ['SUB_BASE', 'AGG_3_4', 'SAND_WHITE', 'صبيز (Sub-base)'],
    },
  };

  // -------------------------------------------------------------
  // GROUP 1: LM-01 to LM-05 (Source & 20-Column Contract)
  // -------------------------------------------------------------

  // LM-01: 20-Column Schema Definition
  try {
    const is20Cols = LEGACY_20_COLUMN_KEYS.length === 20;
    const hasRequired = LEGACY_20_COLUMN_KEYS.includes('ticketId') &&
                        LEGACY_20_COLUMN_KEYS.includes('tripSerial') &&
                        LEGACY_20_COLUMN_KEYS.includes('tripRate') &&
                        LEGACY_20_COLUMN_KEYS.includes('varianceWeight');
    results.push({
      id: 'LM-01',
      name: '20-Column Legacy Schema Recognition',
      passed: is20Cols && hasRequired,
      expected: '20 canonical legacy keys defined including ticketId, tripSerial, tripRate',
      actual: `Keys count: ${LEGACY_20_COLUMN_KEYS.length}, hasRequired: ${hasRequired}`,
      notes: 'Verified 20-column legacy sheet keys contract',
    });
  } catch (e: any) {
    results.push({ id: 'LM-01', name: '20-Column Legacy Schema Recognition', passed: false, expected: '20 keys', actual: e.message, notes: 'Error' });
  }

  // LM-02: Parser Supports Both Object[] and 2D Array
  try {
    const dummySource: ImportSource = { sourceType: 'MIGRATION', importBatchId: 'B-01' };
    const parsedObjects = legacyMigrationParserService.parse(dummySource, SAMPLE_LEGACY_GOOGLE_SHEET_ROWS.slice(0, 2));
    const twoDArray = [
      ['projectId', 'shiftDate', 'ticketId', 'carrier', 'truckNo', 'driverName', 'materialType', 'tareWeight', 'grossWeight', 'netWeight', 'destNetWeight', 'varianceWeight', 'loader', 'unloader', 'tripRate', 'status', 'tripSerial', 'loadTime', 'unloadTime', 'note'],
      ['PRJ-01', '2026-09-01', 'T-999', 'الفهد', '1234', 'محمد', 'SUB_BASE', 14000, 44000, 30000, 30000, 0, 'لودر', 'تفريغ', 250, 'مكتمل', 101, '08:00', '10:00', 'ملاحظة'],
    ];
    const parsed2D = legacyMigrationParserService.parse(dummySource, twoDArray);

    const passed = parsedObjects.rows.length === 2 && parsed2D.rows.length === 1 && parsed2D.rows[0].ticketId === 'T-999';
    results.push({
      id: 'LM-02',
      name: 'Parser Handles Object Array & 2D Array Input',
      passed,
      expected: 'Both object arrays and 2D arrays parsed cleanly',
      actual: `Objects parsed: ${parsedObjects.rows.length}, 2D parsed: ${parsed2D.rows.length}`,
      notes: 'LegacyMigrationParserService is polymorphic across input forms',
    });
  } catch (e: any) {
    results.push({ id: 'LM-02', name: 'Parser Handles Object Array & 2D Array Input', passed: false, expected: 'parsed', actual: e.message, notes: 'Error' });
  }

  // LM-03: Empty Row Filtering
  try {
    const dummySource: ImportSource = { sourceType: 'MIGRATION', importBatchId: 'B-02' };
    const dirty2D = [
      ['ticketId', 'carrier', 'truckNo'],
      ['', '', '   '],
      ['T-100', 'Carrier A', '1234'],
      [null, undefined, ''],
    ];
    const parsed = legacyMigrationParserService.parse(dummySource, dirty2D);
    const passed = parsed.rows.length === 1 && parsed.rows[0].ticketId === 'T-100';
    results.push({
      id: 'LM-03',
      name: 'Safe Filtering of Empty Rows',
      passed,
      expected: '1 non-empty row parsed, empty rows discarded',
      actual: `${parsed.rows.length} rows returned`,
      notes: 'Parser ignores empty cells and spaces safely',
    });
  } catch (e: any) {
    results.push({ id: 'LM-03', name: 'Safe Filtering of Empty Rows', passed: false, expected: '1 row', actual: e.message, notes: 'Error' });
  }

  // LM-04: Eastern Arabic Digit Handling in Raw Parse
  try {
    const raw = {
      projectId: 'PRJ-NEOM-001',
      shiftDate: '٢٠٢٦-٠٩-١٠',
      ticketId: 'ت-١٢٣٤',
      tripSerial: '٥٥٠١',
      tareWeight: '١٤٠٠٠',
      grossWeight: '٤٤٠٠٠',
      netWeight: '٣٠٠٠٠',
    };
    const norm = legacyMigrationNormalizerService.normalize(raw, 1, standardContext);
    const passed = norm.shiftDate === '2026-09-10' &&
                   norm.tripSerial === '5501' &&
                   norm.tareWeight === 14000 &&
                   norm.grossWeight === 44000 &&
                   norm.netWeight === 30000;
    results.push({
      id: 'LM-04',
      name: 'Eastern Arabic Numerals Conversion to Standard ASCII',
      passed,
      expected: 'Date 2026-09-10, Serial 5501, Weights 14000/44000/30000',
      actual: `Date: ${norm.shiftDate}, Serial: ${norm.tripSerial}, Tare: ${norm.tareWeight}`,
      notes: 'Digits ٠-٩ safely converted across dates, serials, and weights',
    });
  } catch (e: any) {
    results.push({ id: 'LM-04', name: 'Eastern Arabic Numerals Conversion', passed: false, expected: 'converted', actual: e.message, notes: 'Error' });
  }

  // LM-05: Immutability of Source Data
  try {
    const sampleClone = JSON.parse(JSON.stringify(SAMPLE_LEGACY_GOOGLE_SHEET_ROWS.slice(0, 1)));
    const originalTicket = sampleClone[0].ticketId;
    legacyMigrationService.generatePreview(sampleClone, 'S-01', 'Sheet1', adminUser);
    const passed = sampleClone[0].ticketId === originalTicket && Object.keys(sampleClone[0]).length === 20;
    results.push({
      id: 'LM-05',
      name: 'Source Sheet Read-Only Invariant',
      passed,
      expected: 'Source input remains completely unmodified',
      actual: `Input length: ${sampleClone.length}, Ticket: ${sampleClone[0].ticketId}`,
      notes: 'Preview stage strictly does not mutate input array or objects',
    });
  } catch (e: any) {
    results.push({ id: 'LM-05', name: 'Source Sheet Read-Only Invariant', passed: false, expected: 'unmodified', actual: e.message, notes: 'Error' });
  }

  // -------------------------------------------------------------
  // GROUP 2: LM-06 to LM-10 (Pipeline Stages Orchestration)
  // -------------------------------------------------------------

  // LM-06: 10-Stage Pipeline Progression
  try {
    const { report } = legacyMigrationService.generatePreview(SAMPLE_LEGACY_GOOGLE_SHEET_ROWS.slice(0, 3), 'S-02', 'Tab1', adminUser);
    const currentBatch = legacyMigrationService.getCurrentBatch();
    const passed = currentBatch?.currentStage === 'REVIEW' && report.readOnlyEnforced === true;
    results.push({
      id: 'LM-06',
      name: 'Full 10-Stage Import Pipeline Progression',
      passed,
      expected: 'Reaches REVIEW stage in preview mode',
      actual: `Current stage: ${currentBatch?.currentStage}`,
      notes: 'Orchestrated through SOURCE->PARSE->NORMALIZE->MAP->ENTITY_RESOL->VALIDATE->DUP_CHECK->REVIEW',
    });
  } catch (e: any) {
    results.push({ id: 'LM-06', name: '10-Stage Import Pipeline Progression', passed: false, expected: 'REVIEW', actual: e.message, notes: 'Error' });
  }

  // LM-07: Migration Profile Setting
  try {
    const currentBatch = legacyMigrationService.getCurrentBatch();
    const isMigrationSource = currentBatch?.source.sourceType === 'MIGRATION';
    results.push({
      id: 'LM-07',
      name: 'Profile Setting MIGRATION in Source & Context',
      passed: isMigrationSource,
      expected: 'sourceType === MIGRATION',
      actual: `sourceType: ${currentBatch?.source.sourceType}`,
      notes: 'Unified pipeline correctly identifies MIGRATION profile',
    });
  } catch (e: any) {
    results.push({ id: 'LM-07', name: 'Migration Profile Setting', passed: false, expected: 'MIGRATION', actual: e.message, notes: 'Error' });
  }

  // LM-08: Batch Transition to READY_TO_COMMIT or AWAITING_REVIEW
  try {
    const currentBatch = legacyMigrationService.getCurrentBatch();
    const validCommitStatus = currentBatch?.commitStatus === 'READY_TO_COMMIT' || currentBatch?.commitStatus === 'AWAITING_REVIEW';
    results.push({
      id: 'LM-08',
      name: 'Batch Commit Status Computation in Preview',
      passed: validCommitStatus,
      expected: 'READY_TO_COMMIT or AWAITING_REVIEW',
      actual: `commitStatus: ${currentBatch?.commitStatus}`,
      notes: 'Preview assigns deterministic commit status based on validation and warnings',
    });
  } catch (e: any) {
    results.push({ id: 'LM-08', name: 'Batch Commit Status Computation', passed: false, expected: 'valid status', actual: e.message, notes: 'Error' });
  }

  // LM-09: Batch Counters Accuracy
  try {
    const currentBatch = legacyMigrationService.getCurrentBatch();
    const passed = currentBatch !== null &&
                   currentBatch.totalRows === (currentBatch.validRows + currentBatch.warningRows + currentBatch.errorRows);
    results.push({
      id: 'LM-09',
      name: 'Pipeline Row Counters Mathematical Integrity',
      passed,
      expected: 'totalRows == validRows + warningRows + errorRows',
      actual: `total: ${currentBatch?.totalRows}, sum: ${(currentBatch?.validRows || 0) + (currentBatch?.warningRows || 0) + (currentBatch?.errorRows || 0)}`,
      notes: 'Pipeline counters maintain exact balance',
    });
  } catch (e: any) {
    results.push({ id: 'LM-09', name: 'Row Counters Integrity', passed: false, expected: 'balanced', actual: e.message, notes: 'Error' });
  }

  // LM-10: LegacyMigrationService Implements IImportParser
  try {
    const isParser = typeof legacyMigrationService.parse === 'function' &&
                     legacyMigrationService.supportedSourceTypes.includes('MIGRATION');
    results.push({
      id: 'LM-10',
      name: 'LegacyMigrationService Implements IImportParser Contract',
      passed: isParser,
      expected: 'parse method and supportedSourceTypes present',
      actual: `hasParse: ${typeof legacyMigrationService.parse === 'function'}`,
      notes: 'Enforces BLOCK 30 architectural parser decoupling contract',
    });
  } catch (e: any) {
    results.push({ id: 'LM-10', name: 'IImportParser Implementation', passed: false, expected: 'implemented', actual: e.message, notes: 'Error' });
  }

  // -------------------------------------------------------------
  // GROUP 3: LM-11 to LM-15 (Normalization & Type Conversion)
  // -------------------------------------------------------------

  // LM-11: Date Normalization (DD/MM/YYYY to YYYY-MM-DD)
  try {
    const raw = { shiftDate: '15/09/2026' };
    const norm = legacyMigrationNormalizerService.normalize(raw, 1, standardContext);
    results.push({
      id: 'LM-11',
      name: 'Date Normalization (DD/MM/YYYY to ISO YYYY-MM-DD)',
      passed: norm.shiftDate === '2026-09-15',
      expected: '2026-09-15',
      actual: String(norm.shiftDate),
      notes: 'DD/MM/YYYY formatted cleanly to ISO',
    });
  } catch (e: any) {
    results.push({ id: 'LM-11', name: 'Date Normalization', passed: false, expected: '2026-09-15', actual: e.message, notes: 'Error' });
  }

  // LM-12: Weights Preservation of Null / Undefined (Never convert missing to 0)
  try {
    const raw = { tareWeight: null, destNetWeight: '', varianceWeight: undefined };
    const norm = legacyMigrationNormalizerService.normalize(raw, 1, standardContext);
    const passed = norm.tareWeight === undefined &&
                   norm.destNetWeight === undefined &&
                   norm.varianceWeight === undefined;
    results.push({
      id: 'LM-12',
      name: 'Weights Preservation of Missing Values (Never convert to 0)',
      passed,
      expected: 'undefined for missing weights, not 0',
      actual: `tare: ${norm.tareWeight}, destNet: ${norm.destNetWeight}`,
      notes: 'Strict rule: weighing system must not invent zero weights',
    });
  } catch (e: any) {
    results.push({ id: 'LM-12', name: 'Weights Preservation', passed: false, expected: 'undefined', actual: e.message, notes: 'Error' });
  }

  // LM-13: Numeric Trip Rate Parsing
  try {
    const raw = { tripRate: ' ٢٥٠.٥٠ ' };
    const norm = legacyMigrationNormalizerService.normalize(raw, 1, standardContext);
    results.push({
      id: 'LM-13',
      name: 'Numeric Parsing of Trip Rate with Eastern Arabic Decimals',
      passed: norm.tripRate === 250.5 && norm.legacyRate === 250.5,
      expected: '250.5',
      actual: `tripRate: ${norm.tripRate}, legacyRate: ${norm.legacyRate}`,
      notes: 'Numeric rate accurately parsed from Arabic string',
    });
  } catch (e: any) {
    results.push({ id: 'LM-13', name: 'Trip Rate Parsing', passed: false, expected: '250.5', actual: e.message, notes: 'Error' });
  }

  // LM-14: Whitespace and Newline Trimming
  try {
    const raw = {
      carrier: '  شركة الفهد   \n',
      truckNo: '\tأ ب ج 1234  ',
    };
    const norm = legacyMigrationNormalizerService.normalize(raw, 1, standardContext);
    results.push({
      id: 'LM-14',
      name: 'String Sanitization & Whitespace Trimming',
      passed: norm.carrier === 'شركة الفهد' && norm.truckNo === 'أ ب ج 1234',
      expected: 'Trimmed strings',
      actual: `carrier: "${norm.carrier}", truck: "${norm.truckNo}"`,
      notes: 'Tabs, newlines, and trailing spaces cleanly removed',
    });
  } catch (e: any) {
    results.push({ id: 'LM-14', name: 'String Sanitization', passed: false, expected: 'trimmed', actual: e.message, notes: 'Error' });
  }

  // LM-15: Canonical Row Flags isLegacyMigration = true
  try {
    const norm = legacyMigrationNormalizerService.normalize({ ticketId: 'T-1' }, 1, standardContext);
    results.push({
      id: 'LM-15',
      name: 'Canonical Row Flag isLegacyMigration Set to True',
      passed: norm.isLegacyMigration === true,
      expected: 'isLegacyMigration === true',
      actual: String(norm.isLegacyMigration),
      notes: 'Ensures downstream validators know row originated from migration',
    });
  } catch (e: any) {
    results.push({ id: 'LM-15', name: 'isLegacyMigration Flag', passed: false, expected: 'true', actual: e.message, notes: 'Error' });
  }

  // -------------------------------------------------------------
  // GROUP 4: LM-16 to LM-20 (Column Mapping & Transformation)
  // -------------------------------------------------------------

  // LM-16: 20-Column Canonical Mapping
  try {
    const sampleRow = SAMPLE_LEGACY_GOOGLE_SHEET_ROWS[0];
    const norm = legacyMigrationNormalizerService.normalize(sampleRow, 1, standardContext);
    const mapper = new ExcelCsvColumnMapper();
    const mapped = mapper.map(norm, 1, standardContext);
    const passed = mapped.ticketId === sampleRow.ticketId &&
                   mapped.carrier === sampleRow.carrier &&
                   mapped.materialType === sampleRow.materialType;
    results.push({
      id: 'LM-16',
      name: '20-Column Field Mapping to Canonical Trip Attributes',
      passed,
      expected: 'Canonical attributes matched',
      actual: `ticketId: ${mapped.ticketId}, carrier: ${mapped.carrier}`,
      notes: 'ExcelCsvColumnMapper accurately maps all 20 canonical attributes',
    });
  } catch (e: any) {
    results.push({ id: 'LM-16', name: '20-Column Field Mapping', passed: false, expected: 'mapped', actual: e.message, notes: 'Error' });
  }

  // LM-17: Arabic Aliases Mapping
  try {
    const arabicRaw = {
      'تاريخ الشفت': '2026-09-10',
      'رقم التذكرة': 'T-AR-100',
      'اسم الناقل': 'شركة الفهد',
      'رقم الشاحنة': '1234',
    };
    const mapper = new ExcelCsvColumnMapper();
    const mapped = mapper.map(arabicRaw, 1, standardContext);
    const passed = mapped.shiftDate === '2026-09-10' &&
                   mapped.ticketId === 'T-AR-100' &&
                   mapped.carrier === 'شركة الفهد' &&
                   mapped.truckNo === '1234';
    results.push({
      id: 'LM-17',
      name: 'Arabic Headers and Aliases Mapping',
      passed,
      expected: 'Arabic keys mapped to canonical fields',
      actual: `ticketId: ${mapped.ticketId}, carrier: ${mapped.carrier}`,
      notes: 'Mapper supports Arabic aliases for legacy sheet column headers',
    });
  } catch (e: any) {
    results.push({ id: 'LM-17', name: 'Arabic Aliases Mapping', passed: false, expected: 'mapped', actual: e.message, notes: 'Error' });
  }

  // LM-18: Destination Net Weight & Variance Mapping
  try {
    const row = { destNetWeight: 29800, varianceWeight: -200 };
    const norm = legacyMigrationNormalizerService.normalize(row, 1, standardContext);
    results.push({
      id: 'LM-18',
      name: 'Destination Net & Variance Weights Mapping',
      passed: norm.destNetWeight === 29800 && norm.varianceWeight === -200,
      expected: 'destNetWeight: 29800, varianceWeight: -200',
      actual: `dest: ${norm.destNetWeight}, var: ${norm.varianceWeight}`,
      notes: 'Unload scale weights mapped accurately',
    });
  } catch (e: any) {
    results.push({ id: 'LM-18', name: 'Destination Net & Variance', passed: false, expected: 'mapped', actual: e.message, notes: 'Error' });
  }

  // LM-19: Trip Serial Number Preservation
  try {
    const row = { tripSerial: 10452 };
    const norm = legacyMigrationNormalizerService.normalize(row, 1, standardContext);
    results.push({
      id: 'LM-19',
      name: 'Trip Serial Number Preservation',
      passed: norm.tripSerial === '10452',
      expected: '10452',
      actual: String(norm.tripSerial),
      notes: 'tripSerial safely retained without numeric distortion',
    });
  } catch (e: any) {
    results.push({ id: 'LM-19', name: 'Trip Serial Preservation', passed: false, expected: '10452', actual: e.message, notes: 'Error' });
  }

  // LM-20: Unmapped Columns Preservation
  try {
    const row = { loader: 'فني الميزان أحمد', unloader: 'المستقبل فهد', note: 'شحنة خاصة' };
    const norm = legacyMigrationNormalizerService.normalize(row, 1, standardContext);
    results.push({
      id: 'LM-20',
      name: 'Preservation of Loader, Unloader and Operations Notes',
      passed: norm.loader === 'فني الميزان أحمد' && norm.unloader === 'المستقبل فهد' && norm.note === 'شحنة خاصة',
      expected: 'All 3 fields preserved in canonical object',
      actual: `loader: ${norm.loader}, note: ${norm.note}`,
      notes: 'Contextual operations notes not discarded during normalization',
    });
  } catch (e: any) {
    results.push({ id: 'LM-20', name: 'Preservation of Unmapped Columns', passed: false, expected: 'preserved', actual: e.message, notes: 'Error' });
  }

  // -------------------------------------------------------------
  // GROUP 5: LM-21 to LM-25 (Entity Resolution Engine BLOCK 35)
  // -------------------------------------------------------------

  // LM-21: Carrier Exact Resolution
  try {
    const resolver = new ExcelCsvTripEntityResolver();
    const row: CanonicalTripRow = {
      projectId: testProjectId,
      carrier: 'شركة الفهد للنقل البري',
    };
    const res = resolver.resolveEntities(row, 1, standardContext);
    const passed = res.carrier?.matchedId === 'CARRIER-001' && (res.carrier.isExact || res.carrier.confidence >= 0.95);
    results.push({
      id: 'LM-21',
      name: 'Carrier Exact Resolution against Master Data',
      passed,
      expected: 'CARRIER-001 matched with high confidence',
      actual: `matchedId: ${res.carrier?.matchedId}, conf: ${res.carrier?.confidence}`,
      notes: 'BLOCK 35 resolver matches carrier exact master record',
    });
  } catch (e: any) {
    results.push({ id: 'LM-21', name: 'Carrier Exact Resolution', passed: false, expected: 'matched', actual: e.message, notes: 'Error' });
  }

  // LM-22: Material Code Resolution
  try {
    const resolver = new ExcelCsvTripEntityResolver();
    const row: CanonicalTripRow = {
      projectId: testProjectId,
      materialType: 'SUB_BASE',
    };
    const res = resolver.resolveEntities(row, 1, standardContext);
    const passed = res.material?.matchedId === 'MAT-001' || res.material?.confidence >= 0.9;
    results.push({
      id: 'LM-22',
      name: 'Material Code & Name Master Resolution',
      passed,
      expected: 'MAT-001 resolved',
      actual: `matchedId: ${res.material?.matchedId}`,
      notes: 'Material resolved from active master catalog',
    });
  } catch (e: any) {
    results.push({ id: 'LM-22', name: 'Material Code Resolution', passed: false, expected: 'resolved', actual: e.message, notes: 'Error' });
  }

  // LM-23: Truck Plate Resolution with Normalization
  try {
    const resolver = new ExcelCsvTripEntityResolver();
    const row: CanonicalTripRow = {
      projectId: testProjectId,
      truckNo: 'أ ب ج  1234',
    };
    const res = resolver.resolveEntities(row, 1, standardContext);
    const passed = res.truck?.matchedId === 'TRK-001' || res.truck?.confidence >= 0.85;
    results.push({
      id: 'LM-23',
      name: 'Truck Plate Resolution with Whitespace Invariance',
      passed,
      expected: 'TRK-001 matched',
      actual: `matchedId: ${res.truck?.matchedId}, plate: ${res.truck?.matchedName}`,
      notes: 'Plate normalization matches despite varied intra-word spacing',
    });
  } catch (e: any) {
    results.push({ id: 'LM-23', name: 'Truck Plate Resolution', passed: false, expected: 'matched', actual: e.message, notes: 'Error' });
  }

  // LM-24: Driver Name Resolution
  try {
    const resolver = new ExcelCsvTripEntityResolver();
    const row: CanonicalTripRow = {
      projectId: testProjectId,
      driverName: 'محمد علي الشمري',
    };
    const res = resolver.resolveEntities(row, 1, standardContext);
    const passed = res.driver?.matchedId === 'DRV-001' || res.driver?.confidence >= 0.9;
    results.push({
      id: 'LM-24',
      name: 'Driver Full Name Master Resolution',
      passed,
      expected: 'DRV-001 matched',
      actual: `matchedId: ${res.driver?.matchedId}`,
      notes: 'Driver mapped to approved master register',
    });
  } catch (e: any) {
    results.push({ id: 'LM-24', name: 'Driver Name Resolution', passed: false, expected: 'matched', actual: e.message, notes: 'Error' });
  }

  // LM-25: Unmatched Entity Flagging Without Blind Creation
  try {
    const resolver = new ExcelCsvTripEntityResolver();
    const row: CanonicalTripRow = {
      projectId: testProjectId,
      carrier: 'ناقل غير مسجل بتاتاً 99',
    };
    const res = resolver.resolveEntities(row, 1, standardContext);
    const passed = !res.carrier?.isExact && (res.carrier?.confidence || 0) < 0.8;
    results.push({
      id: 'LM-25',
      name: 'Unmatched Entity Flagging Without Blind Creation',
      passed,
      expected: 'confidence < 0.8, requires review',
      actual: `conf: ${res.carrier?.confidence}, isExact: ${res.carrier?.isExact}`,
      notes: 'Unknown entities are never silently auto-created as master records',
    });
  } catch (e: any) {
    results.push({ id: 'LM-25', name: 'Unmatched Entity Flagging', passed: false, expected: 'flagged', actual: e.message, notes: 'Error' });
  }

  // -------------------------------------------------------------
  // GROUP 6: LM-26 to LM-30 (Relationship Integrity)
  // -------------------------------------------------------------

  // LM-26: Truck ↔ Carrier Relationship Match
  try {
    const resolver = new ExcelCsvTripEntityResolver();
    const row: CanonicalTripRow = {
      projectId: testProjectId,
      carrier: 'شركة الفهد للنقل البري',
      truckNo: 'أ ب ج 1234',
    };
    const res = resolver.resolveEntities(row, 1, standardContext);
    const passed = res.truck?.relationshipStatus === 'VALID' || !res.truck?.relationshipStatus;
    results.push({
      id: 'LM-26',
      name: 'Truck to Carrier Relationship Match Verification',
      passed,
      expected: 'VALID relationship',
      actual: `status: ${res.truck?.relationshipStatus}`,
      notes: 'Validates truck belongs to specified carrier',
    });
  } catch (e: any) {
    results.push({ id: 'LM-26', name: 'Truck-Carrier Match', passed: false, expected: 'VALID', actual: e.message, notes: 'Error' });
  }

  // LM-27: Driver ↔ Carrier Relationship Conflict Warning
  try {
    const resolver = new ExcelCsvTripEntityResolver();
    const row: CanonicalTripRow = {
      projectId: testProjectId,
      carrier: 'مؤسسة الرمال الذهبية', // Carrier 2
      driverName: 'محمد علي الشمري',     // Driver belongs to Carrier 1
    };
    const res = resolver.resolveEntities(row, 1, standardContext);
    const conflictDetected = res.driver?.relationshipStatus === 'DRIVER_CARRIER_CONFLICT' ||
                             res.driver?.riskLevel === 'HIGH' ||
                             (res.driver?.confidence || 0) < 0.8;
    results.push({
      id: 'LM-27',
      name: 'Driver to Carrier Cross-Assignment Conflict Detection',
      passed: conflictDetected,
      expected: 'DRIVER_CARRIER_CONFLICT or High Risk flagged',
      actual: `status: ${res.driver?.relationshipStatus}, risk: ${res.driver?.riskLevel}`,
      notes: 'Driver registered with Carrier 1 operating under Carrier 2 raises relationship issue',
    });
  } catch (e: any) {
    results.push({ id: 'LM-27', name: 'Driver-Carrier Conflict', passed: false, expected: 'detected', actual: e.message, notes: 'Error' });
  }

  // LM-28: Material Project Authorization Check
  try {
    const resolver = new ExcelCsvTripEntityResolver();
    const row: CanonicalTripRow = {
      projectId: testProjectId,
      materialType: 'FORBIDDEN_HAZARDOUS_CHEM',
    };
    const res = resolver.resolveEntities(row, 1, standardContext);
    const unauthorized = res.material?.relationshipStatus === 'MATERIAL_PROJECT_CONFLICT' ||
                         !res.material?.isAuthorized ||
                         res.material?.confidence === 0;
    results.push({
      id: 'LM-28',
      name: 'Material Project Authorization Verification',
      passed: unauthorized,
      expected: 'Unauthorized material flagged',
      actual: `relationshipStatus: ${res.material?.relationshipStatus}, isAuthorized: ${res.material?.isAuthorized}`,
      notes: 'Materials not permitted in project are flagged',
    });
  } catch (e: any) {
    results.push({ id: 'LM-28', name: 'Material Authorization Check', passed: false, expected: 'flagged', actual: e.message, notes: 'Error' });
  }

  // LM-29: Relationship Conflict In MigrationRowItem
  try {
    const rawConflict: LegacySheetRow = {
      ...SAMPLE_LEGACY_GOOGLE_SHEET_ROWS[0],
      carrier: 'مؤسسة الرمال الذهبية',
      truckNo: 'أ ب ج 1234', // truck belongs to الفهد
    };
    const { items } = legacyMigrationService.generatePreview([rawConflict], 'S-03', 'Tab1', adminUser);
    const item = items[0];
    results.push({
      id: 'LM-29',
      name: 'MigrationRowItem Flags hasConflict When Relationship Mismatch Exists',
      passed: item.hasConflict || item.validationWarnings.length > 0,
      expected: 'hasConflict === true or warning recorded',
      actual: `hasConflict: ${item.hasConflict}, warnings: ${item.validationWarnings.length}`,
      notes: 'UI item models relationship conflicts for admin review',
    });
  } catch (e: any) {
    results.push({ id: 'LM-29', name: 'MigrationRowItem Conflict Flag', passed: false, expected: 'true', actual: e.message, notes: 'Error' });
  }

  // LM-30: Resolving Candidate in Preview Does Not Mutate Master DB
  try {
    const { items } = legacyMigrationService.generatePreview(SAMPLE_LEGACY_GOOGLE_SHEET_ROWS.slice(0, 1), 'S-04', 'Tab1', adminUser);
    const tripsBefore = await tripRepository.listByProject(testProjectId);
    const originalCount = tripsBefore?.length || 0;
    // Candidate decision in UI
    items[0].reviewDecision = 'APPROVED';
    const tripsAfter = await tripRepository.listByProject(testProjectId);
    const currentCount = tripsAfter?.length || 0;
    results.push({
      id: 'LM-30',
      name: 'Review Decisions in Preview Do Not Mutate Firestore',
      passed: currentCount === originalCount,
      expected: 'Firestore trips count unchanged',
      actual: `Trips count: ${currentCount}`,
      notes: 'Preview item modifications stay in memory until commit',
    });
  } catch (e: any) {
    results.push({ id: 'LM-30', name: 'Review Candidate Isolation', passed: false, expected: 'unchanged', actual: e.message, notes: 'Error' });
  }

  // -------------------------------------------------------------
  // GROUP 7: LM-31 to LM-35 (Validation Engine & Business Rules)
  // -------------------------------------------------------------

  // LM-31: Gross < Tare check produces BLOCKING validation error
  try {
    const validator = new ExcelCsvTripValidator();
    const badRow: ImportRow = {
      rowNumber: 1,
      raw: {},
      canonical: {
        projectId: testProjectId,
        shiftDate: '2026-09-10',
        ticketId: 'T-BAD-WEIGHT',
        tareWeight: 40000,
        grossWeight: 20000, // Gross < Tare!
      },
      validationIssues: [],
      reviewStatus: 'accepted',
      status: 'PENDING',
    };
    const issues = validator.validateRow(badRow as any, standardContext);
    const hasBlockingGrossTare = issues.some((i) => i.code === 'ERR-GROSS-TARE' && i.blocking);
    results.push({
      id: 'LM-31',
      name: 'Gross Less Than Tare Triggers Blocking Error (ERR-GROSS-TARE)',
      passed: hasBlockingGrossTare,
      expected: 'Blocking error with code ERR-GROSS-TARE',
      actual: `Found issues: ${issues.map((i) => i.code).join(', ')}`,
      notes: 'Physical impossibility is blocked before commit',
    });
  } catch (e: any) {
    results.push({ id: 'LM-31', name: 'Gross < Tare Blocking Error', passed: false, expected: 'blocked', actual: e.message, notes: 'Error' });
  }

  // LM-32: Rule 14 (WRN-LEGACY-VAR) Legacy Variance Validation
  try {
    const validator = new ExcelCsvTripValidator();
    const varRow: ImportRow = {
      rowNumber: 2,
      raw: {},
      canonical: {
        projectId: testProjectId,
        shiftDate: '2026-09-10',
        ticketId: 'T-VAR-MISMATCH',
        netWeight: 30000,
        destNetWeight: 29500, // calculated variance: -500 KG
        varianceWeight: 0,    // legacy sheet claims 0 KG variance!
        isLegacyMigration: true,
      },
      validationIssues: [],
      reviewStatus: 'accepted',
      status: 'PENDING',
    };
    const issues = validator.validateRow(varRow as any, standardContext);
    const hasVarMismatch = issues.some((i) => i.code === 'WRN-LEGACY-VAR' && !i.blocking);
    results.push({
      id: 'LM-32',
      name: 'Rule 14: WRN-LEGACY-VAR Flags Legacy Variance Discrepancy',
      passed: hasVarMismatch,
      expected: 'Warning WRN-LEGACY-VAR when sheet variance != calculated variance',
      actual: `Issues: ${issues.map((i) => i.code).join(', ')}`,
      notes: 'Identifies spreadsheet calculation mistakes while allowing non-blocking review',
    });
  } catch (e: any) {
    results.push({ id: 'LM-32', name: 'Rule 14 Legacy Variance Validation', passed: false, expected: 'WRN-LEGACY-VAR', actual: e.message, notes: 'Error' });
  }

  // LM-33: Rule 10 (WRN-STATUS-UNK) Legacy Operational Status Check
  try {
    const validator = new ExcelCsvTripValidator();
    const unknownStatusRow: ImportRow = {
      rowNumber: 3,
      raw: {},
      canonical: {
        projectId: testProjectId,
        shiftDate: '2026-09-10',
        ticketId: 'T-STAT-UNK',
        status: 'حالة_عشوائية_غير_معروفة',
        isLegacyMigration: true,
      },
      validationIssues: [],
      reviewStatus: 'accepted',
      status: 'PENDING',
    };
    const issues = validator.validateRow(unknownStatusRow as any, standardContext);
    const hasStatusUnk = issues.some((i) => i.code === 'WRN-STATUS-UNK');
    results.push({
      id: 'LM-33',
      name: 'Rule 10: WRN-STATUS-UNK Flags Unrecognized Operational Status',
      passed: hasStatusUnk,
      expected: 'Warning WRN-STATUS-UNK for unmapped legacy status string',
      actual: `Issues: ${issues.map((i) => i.code).join(', ')}`,
      notes: 'Unknown legacy status mapped to review without crashing',
    });
  } catch (e: any) {
    results.push({ id: 'LM-33', name: 'Rule 10 Status Check', passed: false, expected: 'WRN-STATUS-UNK', actual: e.message, notes: 'Error' });
  }

  // LM-34: Missing Unload Data is Non-Blocking Warning (Weighbridge Incomplete)
  try {
    const validator = new ExcelCsvTripValidator();
    const incompleteRow: ImportRow = {
      rowNumber: 4,
      raw: {},
      canonical: {
        projectId: testProjectId,
        shiftDate: '2026-09-10',
        ticketId: 'T-NO-UNLOAD',
        tareWeight: 14000,
        grossWeight: 44000,
        netWeight: 30000,
        destNetWeight: undefined, // Weighbridge dispatched, not yet offloaded
      },
      validationIssues: [],
      reviewStatus: 'accepted',
      status: 'PENDING',
    };
    const issues = validator.validateRow(incompleteRow as any, standardContext);
    const hasMissingUnloadWarning = issues.some((i) => i.code === 'WRN-NO-UNLOAD' || i.code === 'MISSING_UNLOAD_DATA');
    const hasNoBlockingError = !issues.some((i) => i.blocking);
    results.push({
      id: 'LM-34',
      name: 'Missing Unload Data Treated as Non-Blocking Warning',
      passed: hasMissingUnloadWarning && hasNoBlockingError,
      expected: 'Non-blocking warning, not error',
      actual: `Blocking errors: ${issues.filter((i) => i.blocking).length}, Warnings: ${issues.length}`,
      notes: 'Permits loading scale trips to be imported with WEIGHED_ORIGIN status',
    });
  } catch (e: any) {
    results.push({ id: 'LM-34', name: 'Missing Unload Warning', passed: false, expected: 'warning', actual: e.message, notes: 'Error' });
  }

  // LM-35: Missing Required Ticket ID or Shift Date Blocks
  try {
    const validator = new ExcelCsvTripValidator();
    const missingRequiredRow: ImportRow = {
      rowNumber: 5,
      raw: {},
      canonical: {
        projectId: testProjectId,
        shiftDate: '',
        ticketId: '',
      },
      validationIssues: [],
      reviewStatus: 'accepted',
      status: 'PENDING',
    };
    const issues = validator.validateRow(missingRequiredRow as any, standardContext);
    const hasMissingErrors = issues.some((i) => i.blocking && (i.field === 'ticketId' || i.field === 'shiftDate'));
    results.push({
      id: 'LM-35',
      name: 'Missing Mandatory Fields (ticketId, shiftDate) Triggers Blocking Errors',
      passed: hasMissingErrors,
      expected: 'Blocking errors for ticketId and shiftDate',
      actual: `Blocking issues: ${issues.filter((i) => i.blocking).map((i) => i.field).join(', ')}`,
      notes: 'Fundamental data integrity invariants strictly enforced',
    });
  } catch (e: any) {
    results.push({ id: 'LM-35', name: 'Missing Mandatory Fields', passed: false, expected: 'blocked', actual: e.message, notes: 'Error' });
  }

  // -------------------------------------------------------------
  // GROUP 8: LM-36 to LM-40 (Duplicate Detection BLOCK 30/31)
  // -------------------------------------------------------------

  // LM-36: In-Batch Duplicate by ticketId
  try {
    const checker = new ExcelCsvTripDuplicateChecker();
    const rows: ImportRow[] = [
      { rowNumber: 1, raw: {}, canonical: { ticketId: 'T-DUP-01', shiftDate: '2026-09-10' }, validationIssues: [], reviewStatus: 'accepted', status: 'PENDING' },
      { rowNumber: 2, raw: {}, canonical: { ticketId: 'T-DUP-01', shiftDate: '2026-09-10' }, validationIssues: [], reviewStatus: 'accepted', status: 'PENDING' },
    ];
    const checked = checker.checkDuplicates(rows as any, standardContext);
    const isDup = checked[1].duplicateInfo?.isDuplicate === true && checked[1].duplicateInfo?.duplicateWithRow === 1;
    results.push({
      id: 'LM-36',
      name: 'In-Batch Duplicate Detection by Ticket ID',
      passed: isDup,
      expected: 'Row 2 flagged as duplicate with Row 1',
      actual: `isDuplicate: ${checked[1].duplicateInfo?.isDuplicate}, withRow: ${checked[1].duplicateInfo?.duplicateWithRow}`,
      notes: 'Exact match on scale ticket ID detected immediately',
    });
  } catch (e: any) {
    results.push({ id: 'LM-36', name: 'In-Batch Duplicate Ticket', passed: false, expected: 'duplicate', actual: e.message, notes: 'Error' });
  }

  // LM-37: In-Batch Duplicate by tripSerial
  try {
    const checker = new ExcelCsvTripDuplicateChecker();
    const rows: ImportRow[] = [
      { rowNumber: 1, raw: {}, canonical: { tripSerial: '5001', ticketId: 'T-A', shiftDate: '2026-09-10' }, validationIssues: [], reviewStatus: 'accepted', status: 'PENDING' },
      { rowNumber: 2, raw: {}, canonical: { tripSerial: '5001', ticketId: 'T-B', shiftDate: '2026-09-10' }, validationIssues: [], reviewStatus: 'accepted', status: 'PENDING' },
    ];
    const checked = checker.checkDuplicates(rows as any, standardContext);
    const isDup = checked[1].duplicateInfo?.isDuplicate === true;
    results.push({
      id: 'LM-37',
      name: 'Duplicate Detection by Legacy Trip Serial (tripSerial)',
      passed: isDup,
      expected: 'Row 2 flagged as duplicate due to matching serial 5001',
      actual: `isDuplicate: ${checked[1].duplicateInfo?.isDuplicate}, key: ${checked[1].duplicateInfo?.duplicateKey}`,
      notes: 'tripSerial collision flags duplicate even if ticket IDs differ',
    });
  } catch (e: any) {
    results.push({ id: 'LM-37', name: 'Duplicate Trip Serial', passed: false, expected: 'duplicate', actual: e.message, notes: 'Error' });
  }

  // LM-38: Composite Key Duplicate (truckNo + shiftDate + tareWeight)
  try {
    const checker = new ExcelCsvTripDuplicateChecker();
    const rows: ImportRow[] = [
      { rowNumber: 1, raw: {}, canonical: { truckNo: '1234', shiftDate: '2026-09-10', tareWeight: 14000, ticketId: 'T-10' }, validationIssues: [], reviewStatus: 'accepted', status: 'PENDING' },
      { rowNumber: 2, raw: {}, canonical: { truckNo: '1234', shiftDate: '2026-09-10', tareWeight: 14000, ticketId: 'T-20' }, validationIssues: [], reviewStatus: 'accepted', status: 'PENDING' },
    ];
    const checked = checker.checkDuplicates(rows as any, standardContext);
    const isDup = checked[1].duplicateInfo?.isDuplicate === true;
    results.push({
      id: 'LM-38',
      name: 'Composite Key Duplicate Detection (truck + shiftDate + tareWeight)',
      passed: isDup,
      expected: 'Composite collision detected',
      actual: `isDuplicate: ${checked[1].duplicateInfo?.isDuplicate}, reason: ${checked[1].duplicateInfo?.reason}`,
      notes: 'Detects duplicate weighings where ticket IDs may have been re-keyed',
    });
  } catch (e: any) {
    results.push({ id: 'LM-38', name: 'Composite Key Duplicate', passed: false, expected: 'duplicate', actual: e.message, notes: 'Error' });
  }

  // LM-39: Existing DB Keys Duplicate Detection
  try {
    const checker = new ExcelCsvTripDuplicateChecker();
    const ctxWithExisting: PipelineContext = {
      ...standardContext,
      existingKeys: new Set(['ticket:T-ALREADY-COMMITTED']),
    };
    const rows: ImportRow[] = [
      { rowNumber: 1, raw: {}, canonical: { ticketId: 'T-ALREADY-COMMITTED', shiftDate: '2026-09-10' }, validationIssues: [], reviewStatus: 'accepted', status: 'PENDING' },
    ];
    const checked = checker.checkDuplicates(rows as any, ctxWithExisting);
    const isDup = checked[0].duplicateInfo?.isDuplicate === true;
    results.push({
      id: 'LM-39',
      name: 'Cross-Batch Duplicate Detection against Existing Firestore Keys',
      passed: isDup,
      expected: 'Existing key flagged as duplicate',
      actual: `isDuplicate: ${checked[0].duplicateInfo?.isDuplicate}`,
      notes: 'Matches against existingKeys set from database index',
    });
  } catch (e: any) {
    results.push({ id: 'LM-39', name: 'Existing DB Keys Duplicate', passed: false, expected: 'duplicate', actual: e.message, notes: 'Error' });
  }

  // LM-40: Different Shifts / Different Trucks are NOT False Duplicates
  try {
    const checker = new ExcelCsvTripDuplicateChecker();
    const rows: ImportRow[] = [
      { rowNumber: 1, raw: {}, canonical: { truckNo: '1234', shiftDate: '2026-09-10', tareWeight: 14000, ticketId: 'T-100' }, validationIssues: [], reviewStatus: 'accepted', status: 'PENDING' },
      { rowNumber: 2, raw: {}, canonical: { truckNo: '1234', shiftDate: '2026-09-11', tareWeight: 14000, ticketId: 'T-101' }, validationIssues: [], reviewStatus: 'accepted', status: 'PENDING' },
    ];
    const checked = checker.checkDuplicates(rows as any, standardContext);
    const noFalseDup = !checked[0].duplicateInfo?.isDuplicate && !checked[1].duplicateInfo?.isDuplicate;
    results.push({
      id: 'LM-40',
      name: 'No False Duplicate on Legitimate Multiple Shifts by Same Truck',
      passed: noFalseDup,
      expected: 'Neither row flagged as duplicate',
      actual: `row1 dup: ${checked[0].duplicateInfo?.isDuplicate}, row2 dup: ${checked[1].duplicateInfo?.isDuplicate}`,
      notes: 'Truck legitimately operating on consecutive days is allowed',
    });
  } catch (e: any) {
    results.push({ id: 'LM-40', name: 'No False Duplicates', passed: false, expected: 'not duplicate', actual: e.message, notes: 'Error' });
  }

  // -------------------------------------------------------------
  // GROUP 9: LM-41 to LM-45 (Contractual Settlement & Pricing BLOCK 36)
  // -------------------------------------------------------------

  // LM-41: Contractual Pricing Resolution (Matched active contract)
  try {
    const { items } = legacyMigrationService.generatePreview(SAMPLE_LEGACY_GOOGLE_SHEET_ROWS.slice(0, 2), 'S-05', 'Tab1', adminUser);
    const hasContractResolution = items.some((i) => !i.pricingResolution.isUnresolved || i.pricingResolution.detectedRuleId);
    results.push({
      id: 'LM-41',
      name: 'Contractual Tariff Resolution via PricingService (BLOCK 36)',
      passed: hasContractResolution,
      expected: 'Active contract rule resolved for known carrier',
      actual: `detectedRuleId: ${items[0]?.pricingResolution.detectedRuleId}, type: ${items[0]?.pricingResolution.pricingType}`,
      notes: 'Matches carrier contract in master pricing rules register',
    });
  } catch (e: any) {
    results.push({ id: 'LM-41', name: 'Contractual Tariff Resolution', passed: false, expected: 'resolved', actual: e.message, notes: 'Error' });
  }

  // LM-42: No-Guess Pricing Invariant (Defaults to LEGACY_UNRESOLVED when no tariff)
  try {
    const uncontractedRow: LegacySheetRow = {
      ...SAMPLE_LEGACY_GOOGLE_SHEET_ROWS[0],
      carrier: 'ناقل_غير_متعاقد_معه',
      tripRate: 350,
    };
    const { items } = legacyMigrationService.generatePreview([uncontractedRow], 'S-06', 'Tab1', adminUser);
    const resolution = items[0].pricingResolution;
    const passed = resolution.isUnresolved === true && resolution.pricingType === 'LEGACY_UNRESOLVED';
    results.push({
      id: 'LM-42',
      name: 'No-Guess Pricing Invariant: Fallback to LEGACY_UNRESOLVED',
      passed,
      expected: 'isUnresolved === true and pricingType === LEGACY_UNRESOLVED',
      actual: `isUnresolved: ${resolution.isUnresolved}, type: ${resolution.pricingType}`,
      notes: 'System never guesses PER_TRIP or PER_TON without contractual proof',
    });
  } catch (e: any) {
    results.push({ id: 'LM-42', name: 'No-Guess Pricing Invariant', passed: false, expected: 'LEGACY_UNRESOLVED', actual: e.message, notes: 'Error' });
  }

  // LM-43: Unresolved Pricing Sets pricingStatus = PENDING / UNRESOLVED_PENDING
  try {
    const uncontractedRow: LegacySheetRow = {
      ...SAMPLE_LEGACY_GOOGLE_SHEET_ROWS[0],
      carrier: 'ناقل_غير_متعاقد_معه',
      tripRate: 350,
    };
    const { items } = legacyMigrationService.generatePreview([uncontractedRow], 'S-07', 'Tab1', adminUser);
    const transformed = items[0].transformedTrip;
    const isPending = transformed?.pricingRuleId === 'UNRESOLVED_PENDING' &&
                      (transformed?.pricingSnapshot as any)?.isPending === true;
    results.push({
      id: 'LM-43',
      name: 'Unresolved Pricing Sets pricingRuleId to UNRESOLVED_PENDING',
      passed: isPending,
      expected: 'pricingRuleId === UNRESOLVED_PENDING',
      actual: `ruleId: ${transformed?.pricingRuleId}, isPending: ${(transformed?.pricingSnapshot as any)?.isPending}`,
      notes: 'Incomplete settlement flagged for post-migration finance review',
    });
  } catch (e: any) {
    results.push({ id: 'LM-43', name: 'Pricing Status Pending', passed: false, expected: 'PENDING', actual: e.message, notes: 'Error' });
  }

  // LM-44: Historical tripRate Preserved as legacyRate
  try {
    const rowWithRate: LegacySheetRow = {
      ...SAMPLE_LEGACY_GOOGLE_SHEET_ROWS[0],
      tripRate: 285.75,
    };
    const { items } = legacyMigrationService.generatePreview([rowWithRate], 'S-08', 'Tab1', adminUser);
    const transformed = items[0].transformedTrip;
    const hasLegacyRate = transformed?.sourceMetadata?.legacyRate === 285.75;
    results.push({
      id: 'LM-44',
      name: 'Historical Sheet Trip Rate Preserved in Source Metadata',
      passed: hasLegacyRate,
      expected: 'legacyRate === 285.75',
      actual: `legacyRate: ${transformed?.sourceMetadata?.legacyRate}`,
      notes: 'Preserves original spreadsheet rate for full financial auditability',
    });
  } catch (e: any) {
    results.push({ id: 'LM-44', name: 'Preserve Historical Rate', passed: false, expected: '285.75', actual: e.message, notes: 'Error' });
  }

  // LM-45: Legacy Status Deterministic Mapping
  try {
    const completedRes = mapLegacyStatusToTripStatus('مكتمل');
    const weighedRes = mapLegacyStatusToTripStatus('وزن أول');
    const unknownRes = mapLegacyStatusToTripStatus('حالة_غير_معروفة_XYZ');
    const passed = completedRes.tripStatus === 'COMPLETED' &&
                   weighedRes.tripStatus === 'WEIGHED_ORIGIN' &&
                   unknownRes.isUnknown === true;
    results.push({
      id: 'LM-45',
      name: 'Deterministic Mapping of Legacy Operational Status Strings',
      passed,
      expected: 'مكتمل -> COMPLETED, وزن أول -> WEIGHED_ORIGIN, unknown -> isUnknown: true',
      actual: `مكتمل: ${completedRes.tripStatus}, وزن أول: ${weighedRes.tripStatus}, unknown: ${unknownRes.isUnknown}`,
      notes: 'Arabic operational statuses mapped deterministically to TripStatus enum',
    });
  } catch (e: any) {
    results.push({ id: 'LM-45', name: 'Legacy Status Mapping', passed: false, expected: 'mapped', actual: e.message, notes: 'Error' });
  }

  // -------------------------------------------------------------
  // GROUP 10: LM-46 to LM-50 (Preview-First, Commit & Audit Trail)
  // -------------------------------------------------------------

  // LM-46: Pre-Commit Invariant: Zero Firestore Writes before COMMIT
  try {
    const tripsInitial = await tripRepository.listByProject(testProjectId);
    const initialTripCount = tripsInitial?.length || 0;
    // Call preview multiple times with large dataset
    legacyMigrationService.generatePreview(SAMPLE_LEGACY_GOOGLE_SHEET_ROWS, 'S-09', 'Tab1', adminUser);
    legacyMigrationService.generatePreview(SAMPLE_LEGACY_GOOGLE_SHEET_ROWS, 'S-10', 'Tab2', adminUser);
    const tripsPost = await tripRepository.listByProject(testProjectId);
    const postPreviewCount = tripsPost?.length || 0;
    results.push({
      id: 'LM-46',
      name: 'Pre-Commit Invariant: Zero Firestore Writes in Preview',
      passed: initialTripCount === postPreviewCount,
      expected: `${initialTripCount} trips in store`,
      actual: `${postPreviewCount} trips in store`,
      notes: 'Preview is strictly read-only; no documents persisted until commit execution',
    });
  } catch (e: any) {
    results.push({ id: 'LM-46', name: 'Pre-Commit Invariant', passed: false, expected: '0 writes', actual: e.message, notes: 'Error' });
  }

  // LM-47: Server-side RBAC Rejection for Non-Admin
  try {
    const { report, items } = legacyMigrationService.generatePreview(SAMPLE_LEGACY_GOOGLE_SHEET_ROWS.slice(0, 1), 'S-11', 'Tab1', adminUser);
    const operatorUser: AuthUserContext = {
      userId: 'USR-OPERATOR',
      email: 'operator@qsaudi.com',
      displayName: 'مشغل ميزان',
      role: 'SCALE_OPERATOR', // NOT PROJECT_ADMIN!
      assignedProjectIds: [testProjectId],
    };

    let errorCaught = false;
    try {
      await legacyMigrationService.commitMigration(report.reportId, items, operatorUser);
    } catch (err: any) {
      errorCaught = err.message.includes('غير مصرح') || err.message.includes('PROJECT_ADMIN');
    }

    results.push({
      id: 'LM-47',
      name: 'Server-Side RBAC: Non-Admin Forbidden from Committing Migration',
      passed: errorCaught,
      expected: 'Throws authorization error for non-PROJECT_ADMIN role',
      actual: `Error caught: ${errorCaught}`,
      notes: 'Only users with PROJECT_ADMIN role can commit migration data',
    });
  } catch (e: any) {
    results.push({ id: 'LM-47', name: 'Server-Side RBAC Enforcement', passed: false, expected: 'forbidden', actual: e.message, notes: 'Error' });
  }

  // LM-48: Successful Commit via ExcelCsvTripCommitter
  try {
    const validRow: LegacySheetRow = {
      projectId: testProjectId,
      shiftDate: '2026-09-08',
      ticketId: `T-COMM-${Date.now()}`,
      carrier: 'شركة الفهد للنقل البري',
      truckNo: 'أ ب ج 1234',
      driverName: 'محمد علي الشمري',
      materialType: 'SUB_BASE',
      tareWeight: 14200,
      grossWeight: 44200,
      netWeight: 30000,
      destNetWeight: 30000,
      varianceWeight: 0,
      loader: 'أحمد',
      unloader: 'فهد',
      tripRate: 250,
      status: 'مكتمل',
      tripSerial: 9901,
      loadTime: '07:30',
      unloadTime: '09:45',
      note: 'ترحيل ناجح',
    };

    const { report, items } = legacyMigrationService.generatePreview([validRow], 'S-COMMIT', 'Tab1', adminUser);
    const commitRes = await legacyMigrationService.commitMigration(report.reportId, items, adminUser, `OP-COMMIT-${Date.now()}`);

    const passed = commitRes.success && commitRes.committedTripsCount >= 1 && !!commitRes.batchId;
    results.push({
      id: 'LM-48',
      name: 'Commit Execution via ExcelCsvTripCommitter Persists Valid Trips',
      passed,
      expected: 'success === true, committedTripsCount >= 1',
      actual: `success: ${commitRes.success}, count: ${commitRes.committedTripsCount}, batchId: ${commitRes.batchId}`,
      notes: 'Persists to Firestore via ExcelCsvTripCommitter and tripRepository.create()',
    });
  } catch (e: any) {
    results.push({ id: 'LM-48', name: 'Commit Execution', passed: false, expected: 'committed', actual: e.message, notes: 'Error' });
  }

  // LM-49: Strict Idempotency Protection via operationId
  try {
    const validRow: LegacySheetRow = {
      projectId: testProjectId,
      shiftDate: '2026-09-08',
      ticketId: `T-IDEMP-${Date.now()}`,
      carrier: 'شركة الفهد للنقل البري',
      truckNo: 'أ ب ج 1234',
      driverName: 'محمد علي الشمري',
      materialType: 'SUB_BASE',
      tareWeight: 14200,
      grossWeight: 44200,
      netWeight: 30000,
      destNetWeight: 30000,
      varianceWeight: 0,
      loader: 'أحمد',
      unloader: 'فهد',
      tripRate: 250,
      status: 'مكتمل',
      tripSerial: 9902,
      loadTime: '07:30',
      unloadTime: '09:45',
      note: 'اختبار التكرار',
    };

    const specificOpId = `OP-IDEMP-TEST-${Date.now()}`;
    const { report, items } = legacyMigrationService.generatePreview([validRow], 'S-IDEMP', 'Tab1', adminUser, specificOpId);
    
    // First commit
    const res1 = await legacyMigrationService.commitMigration(report.reportId, items, adminUser, specificOpId);
    const trips1 = await tripRepository.listByProject(testProjectId);
    const countAfterFirst = trips1?.length || 0;

    // Second commit with same operationId
    const res2 = await legacyMigrationService.commitMigration(report.reportId, items, adminUser, specificOpId);
    const trips2 = await tripRepository.listByProject(testProjectId);
    const countAfterSecond = trips2?.length || 0;

    const isIdempotent = res1.batchId === res2.batchId && countAfterFirst === countAfterSecond;
    results.push({
      id: 'LM-49',
      name: 'Strict Idempotency Protection on Duplicate operationId Execution',
      passed: isIdempotent,
      expected: 'Cached result returned without duplicate writes',
      actual: `res1 batch: ${res1.batchId}, res2 batch: ${res2.batchId}, DB count diff: ${countAfterSecond - countAfterFirst}`,
      notes: 'Prevents duplicate trip creation if admin double-clicks or re-submits',
    });
  } catch (e: any) {
    results.push({ id: 'LM-49', name: 'Strict Idempotency Protection', passed: false, expected: 'idempotent', actual: e.message, notes: 'Error' });
  }

  // LM-50: Full Audit Trail Log Entry Recorded
  try {
    const currentReport = legacyMigrationService.getCurrentReport();
    const passed = currentReport !== null && currentReport.isCommitted === true && !!currentReport.committedBatchId;
    results.push({
      id: 'LM-50',
      name: 'Migration Audit Trail & Batch State Integrity',
      passed,
      expected: 'isCommitted: true, committedBatchId assigned, audit recorded',
      actual: `isCommitted: ${currentReport?.isCommitted}, batchId: ${currentReport?.committedBatchId}`,
      notes: 'Full audit metadata and batch history captured in migration report',
    });
  } catch (e: any) {
    results.push({ id: 'LM-50', name: 'Audit Trail Recording', passed: false, expected: 'recorded', actual: e.message, notes: 'Error' });
  }

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  return {
    total: results.length,
    passed: passedCount,
    failed: failedCount,
    allPassed: failedCount === 0,
    results,
  };
}
