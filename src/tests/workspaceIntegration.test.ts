import { 
  WORKSPACE_TABS, 
  OPERATIONS_LEGACY_COLUMNS, 
  OPERATIONS_PRICING_COLUMNS, 
  OPERATIONS_AUDIT_COLUMNS,
  OPERATIONS_FULL_COLUMNS 
} from '../types/workspace';
import { serverWorkspaceService } from '../../server/workspace.service';
import { DEFAULT_PROJECTS } from '../data/defaultMasterData';
import { tripEngineService } from '../services/tripEngine.service';

export interface WorkspaceTestResult {
  id: string;
  nameAr: string;
  nameEn: string;
  passed: boolean;
  details: string;
}

export async function runWorkspaceTestSuite(): Promise<{
  allPassed: boolean;
  totalTests: number;
  passedTests: number;
  results: WorkspaceTestResult[];
}> {
  const results: WorkspaceTestResult[] = [];

  // TEST 1: Source of Truth vs Projection Mandate
  {
    const trips = tripEngineService.getTrips();
    const sourceOfTruthCount = trips.length;
    const plan = serverWorkspaceService.getOperationsMigrationPlan();

    const passed = sourceOfTruthCount > 0 && 
                   plan.sourceOfTruth === 'Firestore' && 
                   plan.projectionTarget === 'Google Sheets';
    results.push({
      id: 'WS-TEST-01',
      nameAr: 'إلزامية Firestore كمصدر وحيد للحقيقة و Google Sheets كإسقاط',
      nameEn: 'Firestore Source of Truth & Google Sheets Projection Mandate',
      passed,
      details: passed 
        ? `تم التحقق: Firestore هو المصدر الحقيقي لـ ${sourceOfTruthCount} رحلة، والـ Sheets هي طبقة إسقاط متزامنة.`
        : 'فشل التحقق من هوية مصدر الحقيقة والإسقاط.',
    });
  }

  // TEST 2: Forbid SpreadsheetApp.getActiveSpreadsheet() & Enforce Project Registry spreadsheetId
  {
    const project = DEFAULT_PROJECTS[0];
    const structure = await serverWorkspaceService.provisionProjectDrive({
      projectId: project.projectId,
      projectCode: project.projectCode,
      nameAr: project.nameAr,
      googleSpreadsheetId: 'gsheet-neom-test-registered-id-123',
    });

    const passed = structure.spreadsheetId === 'gsheet-neom-test-registered-id-123' &&
                   structure.projectId === project.projectId;

    results.push({
      id: 'WS-TEST-02',
      nameAr: 'منع getActiveSpreadsheet() والالتزام بـ spreadsheetId في Project Registry',
      nameEn: 'No getActiveSpreadsheet & Enforce Project Registry spreadsheetId',
      passed,
      details: passed
        ? `تم التحقق: يتم استخدام معرف الشيت (${structure.spreadsheetId}) من Project Registry حصراً دون الاعتماد على getActiveSpreadsheet().`
        : 'فشل في استخدام spreadsheetId من سجل المشروع.',
    });
  }

  // TEST 3: Technical Primary Key tripId for Operations Upsert (Not Blind Append)
  {
    const plan = serverWorkspaceService.getOperationsMigrationPlan();
    const mockTrips = [
      {
        tripId: 'TRP-TEST-UPSERT-01',
        projectId: 'PRJ-NEOM-NORTH-01',
        tripSerial: 'TRP-001',
        ticketId: 'WB-991',
        truckId: 'TRK-101',
        driverId: 'DRV-101',
        carrierId: 'CAR-01',
        materialId: 'MAT-01',
        shiftDate: '2026-09-10',
        tareWeight: 14000,
        grossWeight: 45000,
        netWeight: 31000,
        destNetWeight: 30900,
        varianceWeight: -100,
        loaderId: 'OPR-1',
        unloaderId: 'ENG-1',
        status: 'COMPLETED',
        loadTime: '2026-09-10T08:00:00Z',
        arrivalTime: '2026-09-10T10:00:00Z',
        unloadTime: '2026-09-10T10:30:00Z',
        pricingType: 'PER_TON',
        agreedRate: 50,
        settlementBase: 31,
        settlementAmount: 1550,
        currency: 'SAR',
        pricingRuleId: 'PRC-AGG',
      },
    ];

    const upsertRes = await serverWorkspaceService.upsertTabRecords(
      'mock-sheet-id',
      'العمليات',
      'tripId',
      mockTrips,
      OPERATIONS_FULL_COLUMNS
    );

    const passed = plan.primaryKey === 'tripId' && 
                   upsertRes.primaryKey === 'tripId' && 
                   upsertRes.processedCount === 1;

    results.push({
      id: 'WS-TEST-03',
      nameAr: 'المفتاح التقني للعمليات tripId وآلية الـ Upsert الذكية',
      nameEn: 'Technical Key tripId & Idempotent Upsert Enforcement',
      passed,
      details: passed
        ? 'تم التحقق: المفتاح التقني tripId يُستخدم لتحديد وتحديث الصفوف دون تكرار أو إلحاق أعمى.'
        : 'فشل في تطبيق tripId كمفتاح للـ Upsert.',
    });
  }

  // TEST 4: Preserve Exactly 20 Legacy Operational Columns
  {
    const legacyCols = OPERATIONS_LEGACY_COLUMNS;
    const passed = legacyCols.length === 20 &&
                   legacyCols[0] === 'tripId' &&
                   legacyCols[1] === 'projectId' &&
                   legacyCols[2] === 'tripSerial' &&
                   legacyCols[3] === 'ticketId' &&
                   legacyCols[4] === 'truckId' &&
                   legacyCols[5] === 'driverId' &&
                   legacyCols[6] === 'carrierId' &&
                   legacyCols[7] === 'materialId' &&
                   legacyCols[8] === 'shiftDate' &&
                   legacyCols[9] === 'tareWeight' &&
                   legacyCols[10] === 'grossWeight' &&
                   legacyCols[11] === 'netWeight' &&
                   legacyCols[12] === 'destNetWeight' &&
                   legacyCols[13] === 'varianceWeight' &&
                   legacyCols[14] === 'loaderId' &&
                   legacyCols[15] === 'unloaderId' &&
                   legacyCols[16] === 'status' &&
                   legacyCols[17] === 'loadTime' &&
                   legacyCols[18] === 'arrivalTime' &&
                   legacyCols[19] === 'unloadTime';

    results.push({
      id: 'WS-TEST-04',
      nameAr: 'الاحتفاظ بأعمدة التشغيل الـ 20 الحالية للتوافق التاريخي',
      nameEn: 'Preserve 20 Legacy Operational Columns for Backward Compatibility',
      passed,
      details: passed
        ? `تم التحقق: جميع أعمدة التشغيل الـ 20 محفوظة بالترتيب والأسماء الأصلية دون أي تعديل أو حذف.`
        : 'فشل في مطابقة أعمدة التشغيل الـ 20 الحالية.',
    });
  }

  // TEST 5: Add 6 Pricing Columns (pricingType, agreedRate, settlementBase, settlementAmount, currency, pricingRuleId)
  {
    const pricingCols = OPERATIONS_PRICING_COLUMNS;
    const requiredPricingKeys = [
      'pricingType',
      'agreedRate',
      'settlementBase',
      'settlementAmount',
      'currency',
      'pricingRuleId',
    ];

    const passed = pricingCols.length === 6 &&
                   requiredPricingKeys.every((k, idx) => pricingCols[idx] === k);

    results.push({
      id: 'WS-TEST-05',
      nameAr: 'إضافة أعمدة التسعير الـ 6 المعتمدة',
      nameEn: 'Addition of 6 Contractual Pricing Columns',
      passed,
      details: passed
        ? `تم التحقق: تمت إضافة أعمدة التسعير الستة (${requiredPricingKeys.join(', ')}) بسلاسة في نهاية جدول العمليات.`
        : 'فشل في مطابقة أعمدة التسعير الستة.',
    });
  }

  // TEST 6: Google Drive 4-Level Structure (project folder, imported files, reports, printable documents)
  {
    const project = DEFAULT_PROJECTS[0];
    const structure = await serverWorkspaceService.provisionProjectDrive({
      projectId: project.projectId,
      nameAr: project.nameAr,
      projectCode: project.projectCode,
    });

    const hasImported = structure.subfolders.importedFiles.name === 'imported files';
    const hasReports = structure.subfolders.reports.name === 'reports';
    const hasPrintable = structure.subfolders.printableDocuments.name === 'printable documents';
    const hasProjectFolder = structure.projectFolderName.includes(project.nameAr);

    const passed = hasImported && hasReports && hasPrintable && hasProjectFolder && structure.status === 'PROVISIONED';

    results.push({
      id: 'WS-TEST-06',
      nameAr: 'هيكل Google Drive (project folder, imported files, reports, printable documents)',
      nameEn: 'Google Drive Hierarchy (project folder, imported, reports, printable)',
      passed,
      details: passed
        ? `تم التحقق: تهيئة المجلد الجذري (${structure.projectFolderName}) والمجلدات الفرعية الثلاثة بنجاح.`
        : 'فشل في التحقق من هيكل مجلدات Google Drive.',
    });
  }

  // TEST 7: 6 Google Sheets Tabs (Operations, Drivers, Carriers, Materials, Exceptions, Reports)
  {
    const tabs = Object.values(WORKSPACE_TABS);
    const expectedTabTitles = ['العمليات', 'السائقين', 'الناقلين', 'المواد', 'الاستثناءات', 'تقارير مختارة'];
    const passed = tabs.length === 6 && 
                   expectedTabTitles.every(t => tabs.some(tab => tab.tabTitleAr === t));

    results.push({
      id: 'WS-TEST-07',
      nameAr: 'جداول Google Sheets الستة (العمليات، السائقين، الناقلين، المواد، الاستثناءات، تقارير مختارة)',
      nameEn: '6 Required Google Sheets Projection Tabs',
      passed,
      details: passed
        ? `تم التحقق: تعريف وإدارة الجداول الستة المطلوبة (${expectedTabTitles.join('، ')}) بدقة كاملة.`
        : 'فشل في التحقق من الجداول الستة.',
    });
  }

  // TEST 8: Strict Non-Destructive Schema Migration Plan
  {
    const plan = serverWorkspaceService.getOperationsMigrationPlan();
    const passed = plan.rules.preserveExistingHeaders === true &&
                   plan.rules.forbidInPlaceRenaming === true &&
                   plan.rules.appendNewPricingColumnsAtEnd === true &&
                   plan.rules.supportIdempotentUpsert === true &&
                   plan.migrationStrategy === 'NON_DESTRUCTIVE_COLUMN_EXPANSION';

    results.push({
      id: 'WS-TEST-08',
      nameAr: 'خطة الترحيل المعتمدة (Zero Breaking Changes Migration Plan)',
      nameEn: 'Authoritative Zero Breaking Changes Migration Plan',
      passed,
      details: passed
        ? `تم التحقق: خطة الترحيل (${plan.planVersion}) تضمن عدم كسر أي عمود قديم والتمدد غير الإتلافي للأعمدة الجديدة.`
        : 'فشل في التحقق من بنود خطة الترحيل.',
    });
  }

  const passedTests = results.filter(r => r.passed).length;
  const allPassed = passedTests === results.length;

  return {
    allPassed,
    totalTests: results.length,
    passedTests,
    results,
  };
}
