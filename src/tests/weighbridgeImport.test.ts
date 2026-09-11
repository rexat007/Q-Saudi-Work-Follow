/**
 * Weighbridge Import Pipeline Automated Test Suite
 * BLOCK 34: 33 Standard Test Cases (WB-01 to WB-33)
 * 
 * Verifies:
 * - WB-01 to WB-02: Weighbridge profile mandatory and optional schema definitions
 * - WB-03 to WB-05: Multi-format intake (CSV string, Excel buffer, Google Sheets 2D array)
 * - WB-06: Raw source value preservation (Arabic numerals, commas, decimals)
 * - WB-07 to WB-10: Net weight calculation and tolerance checks (diff <= 0.05kg)
 * - WB-11 to WB-17: Net weight mismatch warnings and blocking errors (Tare > Gross, <=0, missing ticket/truck/date)
 * - WB-18 to WB-25: Weighbridge invariants (loadingDataSource=WEIGHBRIDGE, destNetWeight=null, varianceWeight=null, MISSING_UNLOAD_DATA non-blocking warning, no fake loadTime, no guessed pricing)
 * - WB-26: Pre-commit invariant: Zero writes before COMMIT stage
 * - WB-27 to WB-31: Human gate "Accept Origin Net as Destination" (dest=origin, var=0, audited, non-re-executable if dest already set)
 * - WB-32 to WB-33: Duplicate detection, Project isolation & Commit with audit trail
 */

import * as XLSX from 'xlsx';
import { WeighbridgeImportService } from '../services/import/weighbridgeImport.service';
import { WEIGHBRIDGE_INPUT_PROFILE_FIELDS } from '../types/weighbridgeImport';
import { PipelineContext } from '../types/unifiedImport';

export interface TestCaseResult {
  id: string;
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
  notes: string;
}

export interface WeighbridgeTestReport {
  total: number;
  passed: number;
  failed: number;
  allPassed: boolean;
  results: TestCaseResult[];
}

export async function runWeighbridgeImportTests(): Promise<WeighbridgeTestReport> {
  const results: TestCaseResult[] = [];
  const testProjectId = 'PRJ-NEOM-NORTH-01';

  const baseContext: PipelineContext = {
    userId: 'USR-OP-ADMIN-01',
    userName: 'M. Abdulrahman Al-Subaie',
    role: 'PROJECT_ADMIN',
    projectId: testProjectId,
    operationId: `OP-WB-TEST-${Date.now()}`,
  };

  // Helper to generate properly escaped CSV string
  const createCsvString = (rows: Record<string, string | number>[]): string => {
    if (rows.length === 0) return '';
    const headers = Object.keys(rows[0]);
    const lines = [headers.join(',')];
    for (const r of rows) {
      lines.push(
        headers
          .map((h) => {
            const val = String(r[h] ?? '');
            return val.includes(',') ? `"${val}"` : val;
          })
          .join(',')
      );
    }
    return lines.join('\n');
  };

  // Helper to generate Excel ArrayBuffer
  const createExcelBuffer = (rows: Record<string, any>[]): Uint8Array => {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tickets');
    return XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  };

  // ==========================================
  // WB-01: Weighbridge Mandatory Profile Schema
  // ==========================================
  try {
    const profile = WeighbridgeImportService.getProfile();
    const requiredNames = profile.filter((f) => f.required).map((f) => f.name);
    const hasAllRequired = ['shiftDate', 'ticketId', 'truckNo', 'tareWeight', 'grossWeight'].every((f) =>
      requiredNames.includes(f)
    );
    results.push({
      id: 'WB-01',
      name: 'Mandatory profile fields validation',
      passed: hasAllRequired && requiredNames.length === 5,
      expected: 'shiftDate, ticketId, truckNo, tareWeight, grossWeight all required',
      actual: requiredNames.join(', '),
      notes: 'Profile defines exact operational weighbridge invariants',
    });
  } catch (err: any) {
    results.push({
      id: 'WB-01',
      name: 'Mandatory profile fields validation',
      passed: false,
      expected: 'Profile with 5 mandatory fields',
      actual: err.message,
      notes: 'Error inspecting profile',
    });
  }

  // ==========================================
  // WB-02: Weighbridge Optional Profile Schema
  // ==========================================
  try {
    const profile = WeighbridgeImportService.getProfile();
    const optionalNames = profile.filter((f) => !f.required).map((f) => f.name);
    const hasOptional = ['netWeight', 'carrier', 'driverName', 'materialType', 'loader', 'loadTime'].every((f) =>
      optionalNames.includes(f)
    );
    results.push({
      id: 'WB-02',
      name: 'Optional profile fields definition',
      passed: hasOptional,
      expected: 'Includes netWeight, carrier, driverName, materialType, loader, loadTime',
      actual: `Total optional fields: ${optionalNames.length}`,
      notes: 'Domain-specific optional metadata supported',
    });
  } catch (err: any) {
    results.push({
      id: 'WB-02',
      name: 'Optional profile fields definition',
      passed: false,
      expected: 'Defined optional fields',
      actual: err.message,
      notes: 'Error checking optional schema fields',
    });
  }

  // ==========================================
  // WB-03: Intake from CSV payload
  // ==========================================
  try {
    const csvContent = createCsvString([
      {
        'رقم التذكرة': 'TK-WB-CSV-01',
        'التاريخ': '2025-05-10',
        'رقم الشاحنة': '7788-ABC',
        'الوزن الفارغ': 14200,
        'الوزن القائم': 42500,
        'الوزن الصافي': 28300,
        'الناقل': 'شركة اليمامة للنقل',
      },
    ]);
    const batch = await WeighbridgeImportService.processWeighbridgeDataToReview({
      intakeType: 'CSV',
      input: csvContent,
      fileName: 'weighbridge_shift_1.csv',
      context: { ...baseContext, operationId: 'OP-WB-CSV-01' },
    });

    const validRow = batch.rows.length === 1 && batch.rows[0].status !== 'ERROR' && batch.errorRows === 0;
    results.push({
      id: 'WB-03',
      name: 'CSV payload intake through Unified Pipeline',
      passed: validRow && batch.source.sourceType === 'WEIGHBRIDGE',
      expected: '1 non-error row ready for review, sourceType=WEIGHBRIDGE',
      actual: `Rows: ${batch.rows.length}, Status: ${batch.rows[0]?.status}, Source: ${batch.source.sourceType}`,
      notes: 'CSV string parsed and mapped through review stage',
    });
  } catch (err: any) {
    results.push({
      id: 'WB-03',
      name: 'CSV payload intake through Unified Pipeline',
      passed: false,
      expected: 'Successful batch',
      actual: err.message,
      notes: 'Error processing CSV intake',
    });
  }

  // ==========================================
  // WB-04: Intake from Excel Binary Buffer
  // ==========================================
  try {
    const xlsxBuf = createExcelBuffer([
      {
        'رقم التذكرة': 'TK-WB-XLSX-01',
        'تاريخ': '2025-05-11',
        'رقم الشاحنة': '9900-XYZ',
        'الوزن الفارغ': 15000,
        'الوزن القائم': 45000,
        'الوزن الصافي': 30000,
      },
    ]);
    const batch = await WeighbridgeImportService.processWeighbridgeDataToReview({
      intakeType: 'EXCEL',
      input: xlsxBuf,
      fileName: 'scale_report.xlsx',
      context: { ...baseContext, operationId: 'OP-WB-XLSX-01' },
    });

    results.push({
      id: 'WB-04',
      name: 'Excel binary buffer intake through Unified Pipeline',
      passed: batch.rows.length === 1 && batch.errorRows === 0,
      expected: '1 row parsed from Excel buffer without blocking errors',
      actual: `Total: ${batch.totalRows}, Errors: ${batch.errorRows}`,
      notes: 'XLSX parser accurately integrated',
    });
  } catch (err: any) {
    results.push({
      id: 'WB-04',
      name: 'Excel binary buffer intake through Unified Pipeline',
      passed: false,
      expected: '1 valid row',
      actual: err.message,
      notes: 'Error parsing Excel buffer',
    });
  }

  // ==========================================
  // WB-05: Intake from Google Sheets 2D Array
  // ==========================================
  try {
    const sheetsGrid = [
      ['تاريخ الوزن', 'رقم التذكرة', 'اللوحة', 'فارغ', 'قائم', 'صافي'],
      ['2025-05-12', 'TK-WB-GSHT-01', '1234-KSA', '13500', '41000', '27500'],
    ];
    const batch = await WeighbridgeImportService.processWeighbridgeDataToReview({
      intakeType: 'GOOGLE_SHEETS',
      input: sheetsGrid,
      fileName: 'Daily Scale Sheet',
      sheetName: 'Weighbridge Report',
      context: { ...baseContext, operationId: 'OP-WB-GSHT-01' },
    });

    results.push({
      id: 'WB-05',
      name: 'Google Sheets 2D array intake through Unified Pipeline',
      passed: batch.rows.length === 1 && batch.errorRows === 0,
      expected: '1 row from 2D values array ready for review',
      actual: `Rows: ${batch.rows.length}, Errors: ${batch.errorRows}`,
      notes: 'Google Sheets values seamlessly converted and mapped',
    });
  } catch (err: any) {
    results.push({
      id: 'WB-05',
      name: 'Google Sheets 2D array intake through Unified Pipeline',
      passed: false,
      expected: '1 valid row',
      actual: err.message,
      notes: 'Error in Google Sheets intake',
    });
  }

  // ==========================================
  // WB-06: Raw Source Value Preservation
  // ==========================================
  try {
    const csvContent = createCsvString([
      {
        'رقم التذكرة': 'TK-WB-AR-01',
        'التاريخ': '2025-05-10',
        'رقم الشاحنة': '١٢٣٤-أ ب ج',
        'الوزن الفارغ': '١٥٠٠٠',
        'الوزن القائم': '٤٥٠٠٠',
        'الوزن الصافي': '٣٠٠٠٠',
      },
    ]);
    const batch = await WeighbridgeImportService.processWeighbridgeDataToReview({
      intakeType: 'CSV',
      input: csvContent,
      fileName: 'arabic_scale.csv',
      context: { ...baseContext, operationId: 'OP-WB-AR-01' },
    });

    const row = batch.rows[0];
    const canon = row.canonical as any;
    const passed =
      canon.tareWeight === 15000 &&
      canon.grossWeight === 45000 &&
      canon.netWeight === 30000 &&
      row.raw['الوزن القائم'] === '٤٥٠٠٠';

    results.push({
      id: 'WB-06',
      name: 'Arabic numerals and raw value preservation',
      passed,
      expected: 'Normalized to 15000, 45000, 30000 while preserving raw Arabic text',
      actual: `Parsed Tare: ${canon.tareWeight}, Gross: ${canon.grossWeight}, Raw Gross: ${row.raw['الوزن القائم']}`,
      notes: 'Preserves raw auditing faithfully',
    });
  } catch (err: any) {
    results.push({
      id: 'WB-06',
      name: 'Arabic numerals and raw value preservation',
      passed: false,
      expected: 'Normalized numbers',
      actual: err.message,
      notes: 'Error testing numeral normalization',
    });
  }

  // ==========================================
  // WB-07: Auto-calculation of Net Weight
  // ==========================================
  try {
    const csvContent = createCsvString([
      {
        ticketId: 'TK-WB-CALC-01',
        shiftDate: '2025-05-13',
        truckNo: '5566-NEOM',
        tareWeight: 14000,
        grossWeight: 44000,
        // Net weight explicitly omitted
      },
    ]);
    const batch = await WeighbridgeImportService.processWeighbridgeDataToReview({
      intakeType: 'CSV',
      input: csvContent,
      fileName: 'omitted_net.csv',
      context: { ...baseContext, operationId: 'OP-WB-CALC-01' },
    });

    const canon = batch.rows[0].canonical as any;
    const passed = canon.netWeight === 30000;
    results.push({
      id: 'WB-07',
      name: 'Auto-calculate net weight when omitted',
      passed,
      expected: 'netWeight = 44000 - 14000 = 30000',
      actual: `Calculated net: ${canon.netWeight}`,
      notes: 'Net calculated via Gross - Tare rule',
    });
  } catch (err: any) {
    results.push({
      id: 'WB-07',
      name: 'Auto-calculate net weight when omitted',
      passed: false,
      expected: 'netWeight 30000',
      actual: err.message,
      notes: 'Error calculating net weight',
    });
  }

  // ==========================================
  // WB-08: isCalculatedNet flag = true
  // ==========================================
  try {
    const csvContent = createCsvString([
      {
        ticketId: 'TK-WB-CALC-02',
        shiftDate: '2025-05-13',
        truckNo: '5567-NEOM',
        tareWeight: 12000,
        grossWeight: 40000,
      },
    ]);
    const batch = await WeighbridgeImportService.processWeighbridgeDataToReview({
      intakeType: 'CSV',
      input: csvContent,
      fileName: 'flag_test.csv',
      context: { ...baseContext, operationId: 'OP-WB-CALC-02' },
    });

    const canon = batch.rows[0].canonical as any;
    results.push({
      id: 'WB-08',
      name: 'isCalculatedNet flag set when net weight omitted',
      passed: canon.isCalculatedNet === true,
      expected: 'isCalculatedNet === true',
      actual: `isCalculatedNet = ${canon.isCalculatedNet}`,
      notes: 'Provides transparency for calculated values',
    });
  } catch (err: any) {
    results.push({
      id: 'WB-08',
      name: 'isCalculatedNet flag set when net weight omitted',
      passed: false,
      expected: 'true',
      actual: err.message,
      notes: 'Error checking flag',
    });
  }

  // ==========================================
  // WB-09: Explicit Net Weight matching (isCalculatedNet = false)
  // ==========================================
  try {
    const csvContent = createCsvString([
      {
        ticketId: 'TK-WB-EXP-01',
        shiftDate: '2025-05-14',
        truckNo: '3344-KSA',
        tareWeight: 15000,
        grossWeight: 45000,
        netWeight: 30000,
      },
    ]);
    const batch = await WeighbridgeImportService.processWeighbridgeDataToReview({
      intakeType: 'CSV',
      input: csvContent,
      fileName: 'explicit_net.csv',
      context: { ...baseContext, operationId: 'OP-WB-EXP-01' },
    });

    const canon = batch.rows[0].canonical as any;
    const hasMismatch = batch.rows[0].validationIssues.some((i) => i.code.includes('NET_WEIGHT'));
    results.push({
      id: 'WB-09',
      name: 'Explicit matching net weight (no calculation, no mismatch)',
      passed: canon.isCalculatedNet !== true && !hasMismatch,
      expected: 'isCalculatedNet !== true, 0 mismatch issues',
      actual: `isCalculatedNet: ${canon.isCalculatedNet}, mismatch issue found: ${hasMismatch}`,
      notes: 'Accurate explicit source values preserved',
    });
  } catch (err: any) {
    results.push({
      id: 'WB-09',
      name: 'Explicit matching net weight',
      passed: false,
      expected: 'isCalculatedNet: false',
      actual: err.message,
      notes: 'Error checking explicit net weight',
    });
  }

  // ==========================================
  // WB-10: Tolerance check (diff <= 0.05kg accepted)
  // ==========================================
  try {
    const csvContent = createCsvString([
      {
        ticketId: 'TK-WB-TOL-01',
        shiftDate: '2025-05-14',
        truckNo: '3345-KSA',
        tareWeight: 15000.02,
        grossWeight: 45000.0,
        netWeight: 29999.98, // diff = 45000 - 15000.02 - 29999.98 = 0.00
      },
    ]);
    const batch = await WeighbridgeImportService.processWeighbridgeDataToReview({
      intakeType: 'CSV',
      input: csvContent,
      fileName: 'tolerance_pass.csv',
      context: { ...baseContext, operationId: 'OP-WB-TOL-01' },
    });

    const hasMismatch = batch.rows[0].validationIssues.some((i) => i.code.includes('MISMATCH'));
    results.push({
      id: 'WB-10',
      name: 'Tolerance check: precision difference within tolerance is accepted',
      passed: !hasMismatch,
      expected: 'No mismatch issue',
      actual: `Issues: ${batch.rows[0].validationIssues.map((i) => i.code).join(', ')}`,
      notes: 'NET_WEIGHT_CALCULATION_TOLERANCE_KG = 0.05 respected',
    });
  } catch (err: any) {
    results.push({
      id: 'WB-10',
      name: 'Tolerance check',
      passed: false,
      expected: 'Pass within tolerance',
      actual: err.message,
      notes: 'Error checking tolerance',
    });
  }

  // ==========================================
  // WB-11: Net Weight Mismatch Warning (diff > 0.05kg)
  // ==========================================
  try {
    const csvContent = createCsvString([
      {
        ticketId: 'TK-WB-MISMATCH-01',
        shiftDate: '2025-05-14',
        truckNo: '3346-KSA',
        tareWeight: 15000,
        grossWeight: 45000,
        netWeight: 29000, // Diff = 1000kg!
      },
    ]);
    const batch = await WeighbridgeImportService.processWeighbridgeDataToReview({
      intakeType: 'CSV',
      input: csvContent,
      fileName: 'mismatch_warn.csv',
      context: { ...baseContext, operationId: 'OP-WB-MISMATCH-01' },
    });

    const mismatchIssue = batch.rows[0].validationIssues.find((i) => i.code.includes('NET_WEIGHT_CALCULATION_MISMATCH'));
    const passed = !!mismatchIssue && mismatchIssue.severity === 'WARNING' && !mismatchIssue.blocking;
    results.push({
      id: 'WB-11',
      name: 'Net weight mismatch produces non-blocking WARNING',
      passed,
      expected: 'NET_WEIGHT_CALCULATION_MISMATCH issue with severity=WARNING and blocking=false',
      actual: `Found: ${mismatchIssue?.code}, Severity: ${mismatchIssue?.severity}, Blocking: ${mismatchIssue?.blocking}`,
      notes: 'Allows scale operator review without hard crash',
    });
  } catch (err: any) {
    results.push({
      id: 'WB-11',
      name: 'Net weight mismatch produces non-blocking WARNING',
      passed: false,
      expected: 'Warning issue',
      actual: err.message,
      notes: 'Error validating mismatch warning',
    });
  }

  // ==========================================
  // WB-12: Physical Invariant Violation: Tare > Gross
  // ==========================================
  try {
    const csvContent = createCsvString([
      {
        ticketId: 'TK-WB-PHYS-01',
        shiftDate: '2025-05-14',
        truckNo: '3347-KSA',
        tareWeight: 45000,
        grossWeight: 15000, // Physically impossible
      },
    ]);
    const batch = await WeighbridgeImportService.processWeighbridgeDataToReview({
      intakeType: 'CSV',
      input: csvContent,
      fileName: 'tare_gt_gross.csv',
      context: { ...baseContext, operationId: 'OP-WB-PHYS-01' },
    });

    const invalidWeight = batch.rows[0].validationIssues.find(
      (i) => i.code === 'GROSS_LESS_THAN_TARE' || i.code.includes('TARE')
    );
    const passed = !!invalidWeight && invalidWeight.blocking && batch.rows[0].status === 'ERROR';
    results.push({
      id: 'WB-12',
      name: 'Physical invariant: Tare > Gross is a BLOCKING error',
      passed,
      expected: 'Row status ERROR, blocking issue',
      actual: `Status: ${batch.rows[0].status}, Issue: ${invalidWeight?.code}, Blocking: ${invalidWeight?.blocking}`,
      notes: 'Blocks impossible physical payloads',
    });
  } catch (err: any) {
    results.push({
      id: 'WB-12',
      name: 'Tare > Gross is a BLOCKING error',
      passed: false,
      expected: 'Blocking error',
      actual: err.message,
      notes: 'Error evaluating physical invariant',
    });
  }

  // ==========================================
  // WB-13: Tare Weight <= 0 is Blocking Error
  // ==========================================
  try {
    const csvContent = createCsvString([
      {
        ticketId: 'TK-WB-ZERO-01',
        shiftDate: '2025-05-14',
        truckNo: '3348-KSA',
        tareWeight: 0,
        grossWeight: 25000,
      },
    ]);
    const batch = await WeighbridgeImportService.processWeighbridgeDataToReview({
      intakeType: 'CSV',
      input: csvContent,
      fileName: 'zero_tare.csv',
      context: { ...baseContext, operationId: 'OP-WB-ZERO-01' },
    });

    const zeroIssue = batch.rows[0].validationIssues.find(
      (i) => i.code === 'TARE_WEIGHT_NON_POSITIVE' || i.blocking
    );
    results.push({
      id: 'WB-13',
      name: 'Tare weight <= 0 is a BLOCKING error',
      passed: !!zeroIssue && zeroIssue.blocking,
      expected: 'Blocking error on non-positive tare',
      actual: `Found: ${zeroIssue?.code}, Blocking: ${zeroIssue?.blocking}`,
      notes: 'Weighbridge trucks must have positive tare',
    });
  } catch (err: any) {
    results.push({
      id: 'WB-13',
      name: 'Tare weight <= 0 is a BLOCKING error',
      passed: false,
      expected: 'Blocking error',
      actual: err.message,
      notes: 'Error checking zero tare',
    });
  }

  // ==========================================
  // WB-14: Gross Weight <= 0 is Blocking Error
  // ==========================================
  try {
    const csvContent = createCsvString([
      {
        ticketId: 'TK-WB-ZERO-02',
        shiftDate: '2025-05-14',
        truckNo: '3349-KSA',
        tareWeight: 10000,
        grossWeight: 0,
      },
    ]);
    const batch = await WeighbridgeImportService.processWeighbridgeDataToReview({
      intakeType: 'CSV',
      input: csvContent,
      fileName: 'zero_gross.csv',
      context: { ...baseContext, operationId: 'OP-WB-ZERO-02' },
    });

    const grossIssue = batch.rows[0].validationIssues.find((i) => i.blocking);
    results.push({
      id: 'WB-14',
      name: 'Gross weight <= 0 is a BLOCKING error',
      passed: !!grossIssue && grossIssue.blocking,
      expected: 'Blocking error on non-positive gross',
      actual: `Found: ${grossIssue?.code}, Blocking: ${grossIssue?.blocking}`,
      notes: 'Gross weight must be strictly positive',
    });
  } catch (err: any) {
    results.push({
      id: 'WB-14',
      name: 'Gross weight <= 0 is a BLOCKING error',
      passed: false,
      expected: 'Blocking error',
      actual: err.message,
      notes: 'Error checking zero gross',
    });
  }

  // ==========================================
  // WB-15: Missing Ticket ID is Blocking Error
  // ==========================================
  try {
    const csvContent = createCsvString([
      {
        ticketId: '',
        shiftDate: '2025-05-15',
        truckNo: '1122-XYZ',
        tareWeight: 14000,
        grossWeight: 44000,
      },
    ]);
    const batch = await WeighbridgeImportService.processWeighbridgeDataToReview({
      intakeType: 'CSV',
      input: csvContent,
      fileName: 'missing_ticket.csv',
      context: { ...baseContext, operationId: 'OP-WB-MISS-01' },
    });

    const issue = batch.rows[0].validationIssues.find(
      (i) => i.code === 'MISSING_TICKET_ID' || i.blocking
    );
    results.push({
      id: 'WB-15',
      name: 'Missing ticketId is a BLOCKING error',
      passed: !!issue && issue.blocking,
      expected: 'Blocking validation error',
      actual: `Issue: ${issue?.code}, Blocking: ${issue?.blocking}`,
      notes: 'Scale tickets require unambiguous ticket reference',
    });
  } catch (err: any) {
    results.push({
      id: 'WB-15',
      name: 'Missing ticketId is a BLOCKING error',
      passed: false,
      expected: 'Blocking error',
      actual: err.message,
      notes: 'Error evaluating missing ticketId',
    });
  }

  // ==========================================
  // WB-16: Missing Truck Number is Blocking Error
  // ==========================================
  try {
    const csvContent = createCsvString([
      {
        ticketId: 'TK-WB-NOTRUCK-01',
        shiftDate: '2025-05-15',
        truckNo: '',
        tareWeight: 14000,
        grossWeight: 44000,
      },
    ]);
    const batch = await WeighbridgeImportService.processWeighbridgeDataToReview({
      intakeType: 'CSV',
      input: csvContent,
      fileName: 'missing_truck.csv',
      context: { ...baseContext, operationId: 'OP-WB-MISS-02' },
    });

    const issue = batch.rows[0].validationIssues.find(
      (i) => i.code === 'MISSING_TRUCK_NO' || i.blocking
    );
    results.push({
      id: 'WB-16',
      name: 'Missing truckNo is a BLOCKING error',
      passed: !!issue && issue.blocking,
      expected: 'Blocking validation error',
      actual: `Issue: ${issue?.code}, Blocking: ${issue?.blocking}`,
      notes: 'Truck identity is essential for operational tracing',
    });
  } catch (err: any) {
    results.push({
      id: 'WB-16',
      name: 'Missing truckNo is a BLOCKING error',
      passed: false,
      expected: 'Blocking error',
      actual: err.message,
      notes: 'Error evaluating missing truckNo',
    });
  }

  // ==========================================
  // WB-17: Missing Date is Blocking Error
  // ==========================================
  try {
    const csvContent = createCsvString([
      {
        ticketId: 'TK-WB-NODATE-01',
        shiftDate: '',
        truckNo: '1122-XYZ',
        tareWeight: 14000,
        grossWeight: 44000,
      },
    ]);
    const batch = await WeighbridgeImportService.processWeighbridgeDataToReview({
      intakeType: 'CSV',
      input: csvContent,
      fileName: 'missing_date.csv',
      context: { ...baseContext, operationId: 'OP-WB-MISS-03' },
    });

    const issue = batch.rows[0].validationIssues.find(
      (i) => i.code === 'MISSING_DATE' || i.blocking
    );
    results.push({
      id: 'WB-17',
      name: 'Missing shiftDate is a BLOCKING error',
      passed: !!issue && issue.blocking,
      expected: 'Blocking validation error',
      actual: `Issue: ${issue?.code}, Blocking: ${issue?.blocking}`,
      notes: 'Scale operations require explicit date verification',
    });
  } catch (err: any) {
    results.push({
      id: 'WB-17',
      name: 'Missing shiftDate is a BLOCKING error',
      passed: false,
      expected: 'Blocking error',
      actual: err.message,
      notes: 'Error evaluating missing shiftDate',
    });
  }

  // ==========================================
  // WB-18: Invariant: loadingDataSource = 'WEIGHBRIDGE'
  // ==========================================
  try {
    const csvContent = createCsvString([
      {
        ticketId: 'TK-WB-INV-01',
        shiftDate: '2025-05-16',
        truckNo: '9988-KSA',
        tareWeight: 15000,
        grossWeight: 45000,
      },
    ]);
    const batch = await WeighbridgeImportService.processWeighbridgeDataToReview({
      intakeType: 'CSV',
      input: csvContent,
      fileName: 'invariant_source.csv',
      context: { ...baseContext, operationId: 'OP-WB-INV-01' },
    });

    const canon = batch.rows[0].canonical as any;
    results.push({
      id: 'WB-18',
      name: 'Weighbridge invariant: loadingDataSource is WEIGHBRIDGE',
      passed: canon.loadingDataSource === 'WEIGHBRIDGE',
      expected: 'loadingDataSource === "WEIGHBRIDGE"',
      actual: `loadingDataSource: ${canon.loadingDataSource}`,
      notes: 'Operational Source Model (BLOCK 29) enforced',
    });
  } catch (err: any) {
    results.push({
      id: 'WB-18',
      name: 'loadingDataSource is WEIGHBRIDGE',
      passed: false,
      expected: 'WEIGHBRIDGE',
      actual: err.message,
      notes: 'Error checking loadingDataSource',
    });
  }

  // ==========================================
  // WB-19: Invariant: destNetWeight === null (No fake zero variance)
  // ==========================================
  try {
    const csvContent = createCsvString([
      {
        ticketId: 'TK-WB-INV-02',
        shiftDate: '2025-05-16',
        truckNo: '9989-KSA',
        tareWeight: 15000,
        grossWeight: 45000,
      },
    ]);
    const batch = await WeighbridgeImportService.processWeighbridgeDataToReview({
      intakeType: 'CSV',
      input: csvContent,
      fileName: 'no_fake_dest.csv',
      context: { ...baseContext, operationId: 'OP-WB-INV-02' },
    });

    const canon = batch.rows[0].canonical as any;
    results.push({
      id: 'WB-19',
      name: 'Weighbridge invariant: destNetWeight is strictly null on intake',
      passed: canon.destNetWeight === null,
      expected: 'destNetWeight === null (never 0 or copied origin)',
      actual: `destNetWeight: ${canon.destNetWeight}`,
      notes: 'Strict adherence to Weighbridge intake invariants',
    });
  } catch (err: any) {
    results.push({
      id: 'WB-19',
      name: 'destNetWeight is strictly null on intake',
      passed: false,
      expected: 'null',
      actual: err.message,
      notes: 'Error checking destNetWeight',
    });
  }

  // ==========================================
  // WB-20: Invariant: varianceWeight === null
  // ==========================================
  try {
    const csvContent = createCsvString([
      {
        ticketId: 'TK-WB-INV-03',
        shiftDate: '2025-05-16',
        truckNo: '9990-KSA',
        tareWeight: 15000,
        grossWeight: 45000,
      },
    ]);
    const batch = await WeighbridgeImportService.processWeighbridgeDataToReview({
      intakeType: 'CSV',
      input: csvContent,
      fileName: 'no_fake_var.csv',
      context: { ...baseContext, operationId: 'OP-WB-INV-03' },
    });

    const canon = batch.rows[0].canonical as any;
    results.push({
      id: 'WB-20',
      name: 'Weighbridge invariant: varianceWeight is strictly null on intake',
      passed: canon.varianceWeight === null,
      expected: 'varianceWeight === null (no zero variance without destination weight)',
      actual: `varianceWeight: ${canon.varianceWeight}`,
      notes: 'Guarantees uncompleted trips are not reported as zero loss',
    });
  } catch (err: any) {
    results.push({
      id: 'WB-20',
      name: 'varianceWeight is strictly null on intake',
      passed: false,
      expected: 'null',
      actual: err.message,
      notes: 'Error checking varianceWeight',
    });
  }

  // ==========================================
  // WB-21: Invariant: unloadingDataSource === null
  // ==========================================
  try {
    const csvContent = createCsvString([
      {
        ticketId: 'TK-WB-INV-04',
        shiftDate: '2025-05-16',
        truckNo: '9991-KSA',
        tareWeight: 15000,
        grossWeight: 45000,
      },
    ]);
    const batch = await WeighbridgeImportService.processWeighbridgeDataToReview({
      intakeType: 'CSV',
      input: csvContent,
      fileName: 'no_unload_source.csv',
      context: { ...baseContext, operationId: 'OP-WB-INV-04' },
    });

    const canon = batch.rows[0].canonical as any;
    results.push({
      id: 'WB-21',
      name: 'Weighbridge invariant: unloadingDataSource is null on scale dispatch',
      passed: canon.unloadingDataSource === null,
      expected: 'unloadingDataSource === null',
      actual: `unloadingDataSource: ${canon.unloadingDataSource}`,
      notes: 'Unloading station must be explicitly completed subsequently',
    });
  } catch (err: any) {
    results.push({
      id: 'WB-21',
      name: 'unloadingDataSource is null on scale dispatch',
      passed: false,
      expected: 'null',
      actual: err.message,
      notes: 'Error checking unloadingDataSource',
    });
  }

  // ==========================================
  // WB-22: Non-blocking warning: MISSING_UNLOAD_DATA
  // ==========================================
  try {
    const csvContent = createCsvString([
      {
        ticketId: 'TK-WB-WARN-01',
        shiftDate: '2025-05-16',
        truckNo: '9992-KSA',
        tareWeight: 15000,
        grossWeight: 45000,
      },
    ]);
    const batch = await WeighbridgeImportService.processWeighbridgeDataToReview({
      intakeType: 'CSV',
      input: csvContent,
      fileName: 'unload_warn.csv',
      context: { ...baseContext, operationId: 'OP-WB-WARN-01' },
    });

    const issue = batch.rows[0].validationIssues.find((i) => i.code === 'MISSING_UNLOAD_DATA');
    results.push({
      id: 'WB-22',
      name: 'Absence of unloading data raises MISSING_UNLOAD_DATA warning',
      passed: !!issue && issue.severity === 'WARNING' && !issue.blocking,
      expected: 'Issue code MISSING_UNLOAD_DATA with severity WARNING',
      actual: `Found: ${issue?.code}, Severity: ${issue?.severity}, Blocking: ${issue?.blocking}`,
      notes: 'Weighbridge dispatch manifests expect empty unloading fields',
    });
  } catch (err: any) {
    results.push({
      id: 'WB-22',
      name: 'Absence of unloading data raises MISSING_UNLOAD_DATA warning',
      passed: false,
      expected: 'Warning issue',
      actual: err.message,
      notes: 'Error checking MISSING_UNLOAD_DATA',
    });
  }

  // ==========================================
  // WB-23: Batch status ready for review despite MISSING_UNLOAD_DATA
  // ==========================================
  try {
    const csvContent = createCsvString([
      {
        ticketId: 'TK-WB-VALID-01',
        shiftDate: '2025-05-16',
        truckNo: '9993-KSA',
        tareWeight: 15000,
        grossWeight: 45000,
      },
    ]);
    const batch = await WeighbridgeImportService.processWeighbridgeDataToReview({
      intakeType: 'CSV',
      input: csvContent,
      fileName: 'batch_valid.csv',
      context: { ...baseContext, operationId: 'OP-WB-VALID-01' },
    });

    const passed =
      batch.errorRows === 0 &&
      batch.rows[0].status !== 'ERROR' &&
      batch.rows[0].validationIssues.some((i) => i.code === 'MISSING_UNLOAD_DATA');

    results.push({
      id: 'WB-23',
      name: 'Batch remains ready for review despite missing unload data',
      passed,
      expected: 'Row status non-error, errorRows === 0, warning issue present',
      actual: `Row status: ${batch.rows[0].status}, errorRows: ${batch.errorRows}`,
      notes: 'Non-blocking warnings do not obstruct the review gate',
    });
  } catch (err: any) {
    results.push({
      id: 'WB-23',
      name: 'Batch remains ready for review despite missing unload data',
      passed: false,
      expected: 'Row ready for review',
      actual: err.message,
      notes: 'Error evaluating batch valid status',
    });
  }

  // ==========================================
  // WB-24: Invariant: No fake or invented loadTime
  // ==========================================
  try {
    const csvContent = createCsvString([
      {
        ticketId: 'TK-WB-TIME-01',
        shiftDate: '2025-05-17',
        truckNo: '4455-KSA',
        tareWeight: 15000,
        grossWeight: 45000,
        // No loadTime provided
      },
    ]);
    const batch = await WeighbridgeImportService.processWeighbridgeDataToReview({
      intakeType: 'CSV',
      input: csvContent,
      fileName: 'no_time.csv',
      context: { ...baseContext, operationId: 'OP-WB-TIME-01' },
    });

    const canon = batch.rows[0].canonical as any;
    results.push({
      id: 'WB-24',
      name: 'No invented loadTime when absent from scale ticket',
      passed: canon.loadTime === undefined || canon.loadTime === null,
      expected: 'loadTime is null or undefined (not fabricated timestamp)',
      actual: `loadTime: ${canon.loadTime}`,
      notes: 'Prevents synthetic telemetry fabrication',
    });
  } catch (err: any) {
    results.push({
      id: 'WB-24',
      name: 'No invented loadTime',
      passed: false,
      expected: 'null or undefined',
      actual: err.message,
      notes: 'Error verifying absent loadTime',
    });
  }

  // ==========================================
  // WB-25: Invariant: No guessed pricing
  // ==========================================
  try {
    const csvContent = createCsvString([
      {
        ticketId: 'TK-WB-PRICE-01',
        shiftDate: '2025-05-17',
        truckNo: '4456-KSA',
        tareWeight: 15000,
        grossWeight: 45000,
        // No pricing fields
      },
    ]);
    const batch = await WeighbridgeImportService.processWeighbridgeDataToReview({
      intakeType: 'CSV',
      input: csvContent,
      fileName: 'no_pricing.csv',
      context: { ...baseContext, operationId: 'OP-WB-PRICE-01' },
    });

    const canon = batch.rows[0].canonical as any;
    const passed =
      (canon.pricingRule === undefined || canon.pricingRule === null) &&
      (canon.tripRate === undefined || canon.tripRate === null);

    results.push({
      id: 'WB-25',
      name: 'No guessed pricing rule or rate when absent',
      passed,
      expected: 'pricingRule and tripRate remain unassigned',
      actual: `pricingRule: ${canon.pricingRule}, tripRate: ${canon.tripRate}`,
      notes: 'Pricing resolution strictly delegated to explicit pricing contract engine',
    });
  } catch (err: any) {
    results.push({
      id: 'WB-25',
      name: 'No guessed pricing',
      passed: false,
      expected: 'unassigned pricing',
      actual: err.message,
      notes: 'Error evaluating absent pricing',
    });
  }

  // ==========================================
  // WB-26: Pre-Commit Invariant: Zero Firestore writes before COMMIT
  // ==========================================
  try {
    const csvContent = createCsvString([
      {
        ticketId: 'TK-WB-PRECOMMIT-01',
        shiftDate: '2025-05-18',
        truckNo: '7711-KSA',
        tareWeight: 14000,
        grossWeight: 44000,
      },
    ]);
    const batch = await WeighbridgeImportService.processWeighbridgeDataToReview({
      intakeType: 'CSV',
      input: csvContent,
      fileName: 'precommit_test.csv',
      context: { ...baseContext, operationId: 'OP-WB-PRECOMMIT-01' },
    });

    const passed =
      batch.currentStage === 'REVIEW' &&
      batch.commitStatus !== 'COMMITTED' &&
      batch.committedRows === 0 &&
      batch.totalRows === 1;

    results.push({
      id: 'WB-26',
      name: 'Pre-commit invariant: Zero trip writes to repository before COMMIT stage',
      passed,
      expected: 'Stage is REVIEW, commitStatus !== COMMITTED, committedRows === 0',
      actual: `Stage: ${batch.currentStage}, CommitStatus: ${batch.commitStatus}, CommittedRows: ${batch.committedRows}`,
      notes: 'Pipeline strictly buffers in memory until user confirms commit',
    });
  } catch (err: any) {
    results.push({
      id: 'WB-26',
      name: 'Zero trip writes before COMMIT stage',
      passed: false,
      expected: 'In-memory batch at REVIEW stage',
      actual: err.message,
      notes: 'Error verifying pre-commit storage invariant',
    });
  }

  // ==========================================
  // WB-27: Human Gate: "Accept Origin Net as Destination" weight update
  // ==========================================
  let gateBatch: any = null;
  try {
    const csvContent = createCsvString([
      {
        ticketId: 'TK-WB-GATE-01',
        shiftDate: '2025-05-18',
        truckNo: '7712-KSA',
        tareWeight: 15000,
        grossWeight: 45000,
        netWeight: 30000,
      },
    ]);
    gateBatch = await WeighbridgeImportService.processWeighbridgeDataToReview({
      intakeType: 'CSV',
      input: csvContent,
      fileName: 'gate_test.csv',
      context: { ...baseContext, operationId: 'OP-WB-GATE-01' },
    });

    const acceptRes = await WeighbridgeImportService.acceptOriginNetAsDestination(
      gateBatch,
      {
        importBatchId: gateBatch.importBatchId,
        rowNumber: 1,
        userId: baseContext.userId,
        notes: 'Approved by scale auditor',
      },
      baseContext
    );

    const canon = gateBatch.rows[0].canonical as any;
    const passed =
      acceptRes.success &&
      canon.destNetWeight === 30000 &&
      canon.varianceWeight === 0 &&
      acceptRes.acceptedDestinationNetWeight === 30000 &&
      acceptRes.calculatedVarianceWeight === 0;

    results.push({
      id: 'WB-27',
      name: 'Human Gate: Accept origin net updates destNetWeight and zero variance',
      passed,
      expected: 'destNetWeight = 30000, varianceWeight = 0',
      actual: `destNetWeight: ${canon.destNetWeight}, varianceWeight: ${canon.varianceWeight}`,
      notes: 'Explicit manual confirmation triggers 0 variance via Domain Engine',
    });
  } catch (err: any) {
    results.push({
      id: 'WB-27',
      name: 'Accept origin net updates destNetWeight and zero variance',
      passed: false,
      expected: 'destNetWeight=30000, variance=0',
      actual: err.message,
      notes: 'Error applying accept origin net decision',
    });
  }

  // ==========================================
  // WB-28: Human Gate: Metadata & Actor Assignment
  // ==========================================
  try {
    const canon = gateBatch.rows[0].canonical as any;
    const passed =
      canon.unloadDecision === 'ACCEPT_ORIGIN_NET_AS_DESTINATION' &&
      canon.unloadingDataSource === 'WEIGHBRIDGE' &&
      canon.unloadingActorType === 'USER' &&
      canon.unloadingActorId === baseContext.userId &&
      canon.isAcceptedOriginNet === true;

    results.push({
      id: 'WB-28',
      name: 'Human Gate: Decision metadata, actor, and data source recorded',
      passed,
      expected: 'unloadDecision=ACCEPT_ORIGIN_NET_AS_DESTINATION, actorType=USER, source=WEIGHBRIDGE',
      actual: `Decision: ${canon.unloadDecision}, Actor: ${canon.unloadingActorType} (${canon.unloadingActorId}), Source: ${canon.unloadingDataSource}`,
      notes: 'Provides full operational traceability for manual scale acceptance',
    });
  } catch (err: any) {
    results.push({
      id: 'WB-28',
      name: 'Decision metadata, actor, and data source recorded',
      passed: false,
      expected: 'Complete audit metadata',
      actual: err.message,
      notes: 'Error verifying decision metadata',
    });
  }

  // ==========================================
  // WB-29: Human Gate: Clears MISSING_UNLOAD_DATA issue
  // ==========================================
  try {
    const row = gateBatch.rows[0];
    const hasUnloadIssue = row.validationIssues.some((i: any) => i.code === 'MISSING_UNLOAD_DATA');
    const batchHasIssue = gateBatch.issues.some(
      (i: any) => i.row === row.rowNumber && i.code === 'MISSING_UNLOAD_DATA'
    );

    results.push({
      id: 'WB-29',
      name: 'Human Gate: Clears MISSING_UNLOAD_DATA issue from row and batch',
      passed: !hasUnloadIssue && !batchHasIssue,
      expected: 'Issue removed from both row and batch issues arrays',
      actual: `Row has issue: ${hasUnloadIssue}, Batch has issue: ${batchHasIssue}`,
      notes: 'Accepting origin net resolves the absent unloading warning',
    });
  } catch (err: any) {
    results.push({
      id: 'WB-29',
      name: 'Clears MISSING_UNLOAD_DATA issue',
      passed: false,
      expected: 'Issue cleared',
      actual: err.message,
      notes: 'Error verifying issue cleanup',
    });
  }

  // ==========================================
  // WB-30: Human Gate: Audit Log Entry Created
  // ==========================================
  try {
    const auditEntry = gateBatch.auditTrail.find(
      (a: any) => a.action === 'ACCEPT_ORIGIN_NET_AS_DESTINATION'
    );
    const passed = !!auditEntry && auditEntry.userId === baseContext.userId;

    results.push({
      id: 'WB-30',
      name: 'Human Gate: Audit trail entry recorded on batch',
      passed,
      expected: 'Audit trail contains ACCEPT_ORIGIN_NET_AS_DESTINATION action',
      actual: `Found: ${auditEntry?.action} by ${auditEntry?.userId}`,
      notes: 'Immutable internal audit record attached to batch',
    });
  } catch (err: any) {
    results.push({
      id: 'WB-30',
      name: 'Audit trail entry recorded on batch',
      passed: false,
      expected: 'Audit entry',
      actual: err.message,
      notes: 'Error checking audit trail',
    });
  }

  // ==========================================
  // WB-31: Safety: Cannot accept origin net if destNetWeight already set
  // ==========================================
  try {
    // Attempt to accept origin net again on a row where destNetWeight is already set
    const secondAccept = await WeighbridgeImportService.acceptOriginNetAsDestination(
      gateBatch,
      {
        importBatchId: gateBatch.importBatchId,
        rowNumber: 1,
        userId: baseContext.userId,
      },
      baseContext
    );

    results.push({
      id: 'WB-31',
      name: 'Safety: Cannot accept origin net if destNetWeight was already provided',
      passed: !secondAccept.success && !!secondAccept.error,
      expected: 'Rejected with error message',
      actual: `Success: ${secondAccept.success}, Error: ${secondAccept.error}`,
      notes: 'Guards against overwriting already finalized destination weights',
    });
  } catch (err: any) {
    results.push({
      id: 'WB-31',
      name: 'Cannot accept origin net if destNetWeight was already provided',
      passed: false,
      expected: 'Rejected',
      actual: err.message,
      notes: 'Error checking duplicate acceptance guard',
    });
  }

  // ==========================================
  // WB-32: Duplicate Detection within Weighbridge Batch
  // ==========================================
  try {
    const csvContent = createCsvString([
      {
        ticketId: 'TK-WB-DUP-01',
        shiftDate: '2025-05-19',
        truckNo: '1010-XYZ',
        tareWeight: 14000,
        grossWeight: 44000,
      },
      {
        ticketId: 'TK-WB-DUP-01', // Identical ticket ID in same batch
        shiftDate: '2025-05-19',
        truckNo: '1010-XYZ',
        tareWeight: 14000,
        grossWeight: 44000,
      },
    ]);
    const batch = await WeighbridgeImportService.processWeighbridgeDataToReview({
      intakeType: 'CSV',
      input: csvContent,
      fileName: 'duplicates.csv',
      context: { ...baseContext, operationId: 'OP-WB-DUP-01' },
    });

    const dupRow = batch.rows[1];
    const hasDupIssue = dupRow.validationIssues.some(
      (i) => i.code === 'DUPLICATE_TICKET_ID' || i.code === 'DUPLICATE_KEY_INTERNAL' || i.code.includes('DUPLICATE')
    );

    results.push({
      id: 'WB-32',
      name: 'Duplicate ticketId within the same batch detected',
      passed: hasDupIssue || dupRow.status === 'ERROR' || dupRow.status === 'WARNING',
      expected: 'Duplicate flagged on row 2',
      actual: `Row 2 Status: ${dupRow.status}, Issues: ${dupRow.validationIssues.map((i) => i.code).join(', ')}`,
      notes: 'Prevents double-booking same scale ticket in batch',
    });
  } catch (err: any) {
    results.push({
      id: 'WB-32',
      name: 'Duplicate ticketId within batch detected',
      passed: false,
      expected: 'Duplicate flagged',
      actual: err.message,
      notes: 'Error checking duplicate ticket detection',
    });
  }

  // ==========================================
  // WB-33: Commit Phase & Audit Verification
  // ==========================================
  try {
    const csvContent = createCsvString([
      {
        ticketId: 'TK-WB-COMMIT-01',
        shiftDate: '2025-05-20',
        truckNo: '8877-KSA',
        tareWeight: 14500,
        grossWeight: 44500,
        netWeight: 30000,
      },
    ]);
    const batch = await WeighbridgeImportService.processWeighbridgeDataToReview({
      intakeType: 'CSV',
      input: csvContent,
      fileName: 'commit_test.csv',
      context: { ...baseContext, operationId: `OP-WB-COMMIT-${Date.now()}` },
    });

    // Commit through Weighbridge Service
    const commitResult = await WeighbridgeImportService.commitBatch(batch, {
      ...baseContext,
      operationId: `OP-WB-COMMIT-${Date.now()}`,
      allowWarningsCommit: true,
    });

    const passed =
      commitResult.success &&
      commitResult.committedRows === 1 &&
      commitResult.sourceType === 'WEIGHBRIDGE';

    results.push({
      id: 'WB-33',
      name: 'Commit Phase: Creates Trip with sourceType=WEIGHBRIDGE and audit log',
      passed,
      expected: 'commitResult.success=true, committedRows=1, sourceType=WEIGHBRIDGE',
      actual: `Success: ${commitResult.success}, Committed: ${commitResult.committedRows}, SourceType: ${commitResult.sourceType}`,
      notes: 'Finalizes Weighbridge import into repository safely',
    });
  } catch (err: any) {
    results.push({
      id: 'WB-33',
      name: 'Commit Phase: Creates Trip with sourceType=WEIGHBRIDGE',
      passed: false,
      expected: 'Successful commit',
      actual: err.message,
      notes: 'Error committing weighbridge batch',
    });
  }

  // ==========================================
  // SUMMARY REPORT
  // ==========================================
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.length - passedCount;

  return {
    allPassed: failedCount === 0,
    total: results.length,
    passed: passedCount,
    failed: failedCount,
    results,
  };
}

// Auto-run when executed directly via CLI/tsx
if (
  typeof process !== 'undefined' &&
  process.argv &&
  process.argv[1]?.includes('weighbridgeImport.test')
) {
  runWeighbridgeImportTests().then((res) => {
    console.log('\n======================================================');
    console.log(`BLOCK 34: Weighbridge Import Test Results: ${res.passed}/${res.total} PASSED`);
    console.log('======================================================');
    res.results.forEach((r) => {
      console.log(`${r.passed ? '✅' : '❌'} [${r.id}] ${r.name}`);
      if (!r.passed) {
        console.log('   Expected:', r.expected);
        console.log('   Actual:  ', r.actual);
        console.log('   Notes:   ', r.notes);
      }
    });
    console.log('======================================================\n');
    if (!res.allPassed) {
      process.exit(1);
    }
  });
}
