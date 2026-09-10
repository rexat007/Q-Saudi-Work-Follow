/**
 * Master Data Automated Test Suite (Q Saudi Enterprise)
 * 
 * Verifies all requirements:
 * 1. Relationships: Truck -> Carrier, Driver -> Carrier
 * 2. Schema:
 *    - Truck: truckId, plate, normalizedPlate, carrierId, status
 *    - Driver: driverId, name, normalizedName, phone, idNumber, carrierId, status
 *    - Material: materialId, name, normalizedName, code, status
 *    - Carrier: carrierId, name, normalizedName, status
 * 3. Prohibit deletion of Master Data used in past trips ("ممنوع حذف Master Data المستخدمة في رحلات سابقة")
 * 4. Use ACTIVE/INACTIVE instead of hard delete ("استخدم ACTIVE/INACTIVE بدلاً من hard delete")
 * 5. Enforce project-scoped Carriers and Materials ("اجعل كل Project يحتوي فقط على المواد والناقلين المصرح لهم به")
 * 6. Arabic Normalization (names, plates, phones, IDs)
 */

import { masterDataService } from '../services/masterData.service';
import { tripService } from '../services/trip.service';
import { projectRepository } from '../repositories/project.repository';
import { carrierRepository } from '../repositories/carrier.repository';
import { materialRepository } from '../repositories/material.repository';
import { truckRepository } from '../repositories/truck.repository';
import { driverRepository } from '../repositories/driver.repository';
import { tripRepository } from '../repositories/trip.repository';
import { pricingRuleRepository } from '../repositories/pricingRule.repository';
import { normalizeName, normalizePlate, normalizePhone, normalizeIdNumber } from '../utils/normalization';

export interface MasterDataTestCaseResult {
  id: string;
  category: string;
  titleAr: string;
  titleEn: string;
  passed: boolean;
  expected: any;
  actual: any;
  details: string;
}

export async function runMasterDataTests(): Promise<{
  allPassed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: MasterDataTestCaseResult[];
}> {
  const results: MasterDataTestCaseResult[] = [];
  const TEST_PROJECT_ID = 'PRJ-TEST-MD-99';

  const authContext = {
    userId: 'USR-TEST-AUDITOR',
    role: 'PROJECT_ADMIN' as const,
    email: 'auditor@q-saudi.sa',
    displayName: 'مدقق العمليات اللوجستية',
  };

  // Setup Test Project
  await projectRepository.create({
    projectId: TEST_PROJECT_ID,
    projectCode: 'TEST-MD-99',
    nameAr: 'مشروع اختبار البيانات الرئيسية',
    nameEn: 'Master Data Test Project',
    clientName: 'شركة الاختبارات المعمارية',
    location: { lat: 24.7136, lng: 46.6753, geoFenceRadiusMeters: 500, addressAr: 'الرياض' },
    settings: {
      zatcaTaxNumber: '300099988800003',
      vatRatePercent: 15,
      allowDriverSelfDispatch: false,
    },
    authorizedCarrierIds: ['CAR-TEST-AUTH-1', 'CAR-TEST-UNUSED'],
    authorizedMaterialIds: ['MAT-TEST-AUTH-1'],
    status: 'ACTIVE',
    createdBy: 'TEST_SUITE',
    updatedBy: 'TEST_SUITE',
  });

  // Setup Carrier 1 (Authorized) & Carrier 2 (Unauthorized)
  await carrierRepository.create({
    carrierId: 'CAR-TEST-AUTH-1',
    projectId: TEST_PROJECT_ID,
    name: 'شركة النقل المعتمدة الأولى',
    normalizedName: normalizeName('شركة النقل المعتمدة الأولى'),
    status: 'ACTIVE',
    companyNameAr: 'شركة النقل المعتمدة الأولى',
    commercialRegistrationNo: '1010887766',
    isActive: true,
    createdBy: 'TEST',
    updatedBy: 'TEST',
  });

  await carrierRepository.create({
    carrierId: 'CAR-TEST-UNAUTH-2',
    projectId: TEST_PROJECT_ID,
    name: 'مؤسسة النقل غير المصرح بها',
    normalizedName: normalizeName('مؤسسة النقل غير المصرح بها'),
    status: 'ACTIVE',
    companyNameAr: 'مؤسسة النقل غير المصرح بها',
    commercialRegistrationNo: '1010332211',
    isActive: true,
    createdBy: 'TEST',
    updatedBy: 'TEST',
  });

  // Carrier 3: Unused Carrier to test Soft-Delete transition to INACTIVE
  await carrierRepository.create({
    carrierId: 'CAR-TEST-UNUSED',
    projectId: TEST_PROJECT_ID,
    name: 'شركة النقل الاحتياطية',
    normalizedName: normalizeName('شركة النقل الاحتياطية'),
    status: 'ACTIVE',
    companyNameAr: 'شركة النقل الاحتياطية',
    commercialRegistrationNo: '1010554433',
    isActive: true,
    createdBy: 'TEST',
    updatedBy: 'TEST',
  });

  // Setup Materials
  await materialRepository.create({
    materialId: 'MAT-TEST-AUTH-1',
    projectId: TEST_PROJECT_ID,
    name: 'ركام خرساني معتمد',
    normalizedName: normalizeName('ركام خرساني معتمد'),
    code: 'AGG-AUTH',
    status: 'ACTIVE',
    unitOfMeasure: 'TON',
    isActive: true,
    createdBy: 'TEST',
    updatedBy: 'TEST',
  });

  await materialRepository.create({
    materialId: 'MAT-TEST-UNAUTH-2',
    projectId: TEST_PROJECT_ID,
    name: 'رمل أحمر غير مصرح به بالمشروع',
    normalizedName: normalizeName('رمل أحمر غير مصرح به بالمشروع'),
    code: 'SND-UNAUTH',
    status: 'ACTIVE',
    unitOfMeasure: 'TON',
    isActive: true,
    createdBy: 'TEST',
    updatedBy: 'TEST',
  });

  // Setup Truck (Truck -> Carrier)
  await truckRepository.create({
    truckId: 'TRK-TEST-01',
    projectId: TEST_PROJECT_ID,
    carrierId: 'CAR-TEST-AUTH-1',
    plate: 'أ ب ج 7788',
    normalizedPlate: normalizePlate('أ ب ج 7788'),
    plateNumberAr: 'أ ب ج 7788',
    status: 'ACTIVE',
    tareWeightKg: 14000,
    maxGrossWeightKg: 45000,
    legalPayloadLimitKg: 31000,
    isActive: true,
    createdBy: 'TEST',
    updatedBy: 'TEST',
  });

  // Setup Driver (Driver -> Carrier)
  await driverRepository.create({
    driverId: 'DRV-TEST-01',
    projectId: TEST_PROJECT_ID,
    carrierId: 'CAR-TEST-AUTH-1',
    name: 'أحمد إبراهيم الدوسري',
    normalizedName: normalizeName('أحمد إبراهيم الدوسري'),
    fullNameAr: 'أحمد إبراهيم الدوسري',
    phone: normalizePhone('0551122334'),
    idNumber: normalizeIdNumber('1098877665'),
    nationalOrIqamaId: normalizeIdNumber('1098877665'),
    status: 'ACTIVE',
    isActive: true,
    createdBy: 'TEST',
    updatedBy: 'TEST',
  });

  // Setup Pricing Rule
  await pricingRuleRepository.create({
    pricingRuleId: 'PR-TEST-01',
    projectId: TEST_PROJECT_ID,
    carrierId: 'CAR-TEST-AUTH-1',
    materialId: 'MAT-TEST-AUTH-1',
    pricingModel: 'PER_TON',
    baseRateSAR: 50,
    currency: 'SAR',
    vatApplicable: true,
    demurrageRatePerHourSAR: 100,
    freeTimeHours: 2,
    status: 'ACTIVE',
    isActive: true,
    effectiveFrom: '2026-01-01',
    effectiveTo: '2026-12-31',
    name: 'تسعيرة تجريبية',
    createdBy: 'TEST',
    updatedBy: 'TEST',
  });

  // ----------------------------------------------------
  // TEST 1: Relationship Truck -> Carrier & Driver -> Carrier
  // ----------------------------------------------------
  const truck = await truckRepository.findById(TEST_PROJECT_ID, 'TRK-TEST-01');
  const driver = await driverRepository.findById(TEST_PROJECT_ID, 'DRV-TEST-01');
  const t1Passed = truck?.carrierId === 'CAR-TEST-AUTH-1' && driver?.carrierId === 'CAR-TEST-AUTH-1';
  results.push({
    id: 'MD-TEST-01',
    category: 'العلاقات والترابط (Relationships)',
    titleAr: 'التحقق من علاقة Truck → Carrier وعلاقة Driver → Carrier',
    titleEn: 'Truck-Carrier and Driver-Carrier strict foreign key linkage',
    passed: t1Passed,
    expected: 'carrierId: CAR-TEST-AUTH-1 in both Truck and Driver',
    actual: `Truck carrierId: ${truck?.carrierId}, Driver carrierId: ${driver?.carrierId}`,
    details: 'تم التحقق من ربط الشاحنة والسائق بناقل معتمد مسجل في النظام.',
  });

  // ----------------------------------------------------
  // TEST 2: Schema fields & Normalization
  // ----------------------------------------------------
  const rawPlate = 'أ  ب   ج  ٧٧٨٨';
  const normPlate = normalizePlate(rawPlate);
  const rawName = 'إبراهيم أحمد عبد الله';
  const normName = normalizeName(rawName);
  const rawPhone = '+966 55 112 2334';
  const normPhone = normalizePhone(rawPhone);
  const t2Passed = normPlate === 'ا ب ج 7788' && normName === 'ابراهيم احمد عبد الله' && normPhone === '0551122334';
  results.push({
    id: 'MD-TEST-02',
    category: 'تطبيع البيانات (Saudi Normalization)',
    titleAr: 'تطبيع اللوحات السعودية، الأسماء العربية، وأرقام الجوال',
    titleEn: 'Normalization of Saudi plates, Arabic names, and phone numbers',
    passed: t2Passed,
    expected: 'Plate: "ا ب ج 7788", Name: "ابراهيم احمد عبد الله", Phone: "0551122334"',
    actual: `Plate: "${normPlate}", Name: "${normName}", Phone: "${normPhone}"`,
    details: 'تحويل الأرقام الهندية للعربية، توحيد الهمزات والتاء المربوطة، وتوحيد بادئة الجوال السعودي.',
  });

  // ----------------------------------------------------
  // TEST 3: Project Authorization Scoping (Carriers)
  // ----------------------------------------------------
  let unauthCarrierBlocked = false;
  try {
    await tripService.dispatchTrip({
      projectId: TEST_PROJECT_ID,
      carrierId: 'CAR-TEST-UNAUTH-2', // Unauthorized!
      truckId: 'TRK-TEST-01',
      driverId: 'DRV-TEST-01',
      materialId: 'MAT-TEST-AUTH-1',
      pricingRuleId: 'PR-TEST-01',
    }, authContext);
  } catch (err: any) {
    unauthCarrierBlocked = err.message.includes('غير مصرح له') || err.message.includes('NOT_FOUND') || err.message.includes('CARRIER_NOT_AUTHORIZED');
  }
  results.push({
    id: 'MD-TEST-03',
    category: 'عزل المشاريع (Project Scoping)',
    titleAr: 'حظر تسيير رحلة لناقل غير مصرح به في المشروع',
    titleEn: 'Reject dispatch for Carrier not authorized in project scope',
    passed: unauthCarrierBlocked,
    expected: 'Trip dispatch rejected because carrierId is not authorized in project',
    actual: unauthCarrierBlocked ? 'Rejected as expected' : 'Failed to block',
    details: 'يحتوي كل مشروع فقط على الناقلين المصرح لهم به في authorizedCarrierIds.',
  });

  // ----------------------------------------------------
  // TEST 4: Project Authorization Scoping (Materials)
  // ----------------------------------------------------
  let unauthMaterialBlocked = false;
  try {
    await tripService.dispatchTrip({
      projectId: TEST_PROJECT_ID,
      carrierId: 'CAR-TEST-AUTH-1',
      truckId: 'TRK-TEST-01',
      driverId: 'DRV-TEST-01',
      materialId: 'MAT-TEST-UNAUTH-2', // Unauthorized material!
      pricingRuleId: 'PR-TEST-01',
    }, authContext);
  } catch (err: any) {
    unauthMaterialBlocked = err.message.includes('غير مصرح بتوريدها') || err.message.includes('MATERIAL_NOT_AUTHORIZED');
  }
  results.push({
    id: 'MD-TEST-04',
    category: 'عزل المشاريع (Project Scoping)',
    titleAr: 'حظر تسيير رحلة لمادة غير معتمدة في نطاق المشروع',
    titleEn: 'Reject dispatch for Material not authorized in project scope',
    passed: unauthMaterialBlocked,
    expected: 'Trip dispatch rejected because materialId is not authorized in project',
    actual: unauthMaterialBlocked ? 'Rejected as expected' : 'Failed to block',
    details: 'يحتوي كل مشروع فقط على المواد المصرح بتوريدها في authorizedMaterialIds.',
  });

  // ----------------------------------------------------
  // TEST 5: Create a valid Trip to establish historical usage
  // ----------------------------------------------------
  let tripDispatched = false;
  let dispatchedTripId = '';
  try {
    const trip = await tripService.dispatchTrip({
      projectId: TEST_PROJECT_ID,
      carrierId: 'CAR-TEST-AUTH-1',
      truckId: 'TRK-TEST-01',
      driverId: 'DRV-TEST-01',
      materialId: 'MAT-TEST-AUTH-1',
      pricingRuleId: 'PR-TEST-01',
    }, authContext);
    tripDispatched = !!trip.tripId;
    dispatchedTripId = trip.tripId;
  } catch (err) {
    console.error('Dispatch error:', err);
  }
  results.push({
    id: 'MD-TEST-05',
    category: 'دورة حياة الرحلة (Trip Lifecycle)',
    titleAr: 'نجاح تسيير رحلة متوافقة مع كافة النواقل والمواد المصرح بها',
    titleEn: 'Successful trip dispatch with authorized Master Data',
    passed: tripDispatched,
    expected: 'Trip dispatched with status DISPATCHED',
    actual: tripDispatched ? `Trip dispatched: ${dispatchedTripId}` : 'Dispatch failed',
    details: 'تم التحقق من كافة شروط الاعتماد وعلاقات الشاحنة والسائق والناقل.',
  });

  // ----------------------------------------------------
  // TEST 6: Prohibit Hard Delete of used Master Data (Carrier)
  // ----------------------------------------------------
  const carrierUsage = await masterDataService.checkTripUsage(TEST_PROJECT_ID, 'CARRIER', 'CAR-TEST-AUTH-1');
  let carrierDeleteBlocked = false;
  try {
    await masterDataService.hardDeleteMasterEntity(TEST_PROJECT_ID, 'CARRIER', 'CAR-TEST-AUTH-1', authContext);
  } catch (err: any) {
    carrierDeleteBlocked = err.message.includes('ممنوع حذف') || err.message.includes('DELETE_PROHIBITED') || err.message.includes('رحلة سابقة');
  }
  results.push({
    id: 'MD-TEST-06',
    category: 'حماية السجلات التاريخية (Historical Immutability)',
    titleAr: 'ممنوع حذف Master Data (ناقل) مستخدم في رحلات سابقة',
    titleEn: 'Prohibit hard delete of Carrier referenced in historical trips',
    passed: carrierUsage.isUsed && carrierDeleteBlocked,
    expected: 'Hard delete strictly blocked, usage detected in trips',
    actual: `Usage detected: ${carrierUsage.count} trips, Delete blocked: ${carrierDeleteBlocked}`,
    details: 'القاعدة الصارمة: ممنوع حذف Master Data المستخدمة في رحلات سابقة.',
  });

  // ----------------------------------------------------
  // TEST 7: Prohibit Hard Delete of used Master Data (Truck & Driver)
  // ----------------------------------------------------
  const truckUsage = await masterDataService.checkTripUsage(TEST_PROJECT_ID, 'TRUCK', 'TRK-TEST-01');
  const driverUsage = await masterDataService.checkTripUsage(TEST_PROJECT_ID, 'DRIVER', 'DRV-TEST-01');
  let truckDeleteBlocked = false;
  let driverDeleteBlocked = false;
  try {
    await masterDataService.hardDeleteMasterEntity(TEST_PROJECT_ID, 'TRUCK', 'TRK-TEST-01', authContext);
  } catch (err) {
    truckDeleteBlocked = true;
  }
  try {
    await masterDataService.hardDeleteMasterEntity(TEST_PROJECT_ID, 'DRIVER', 'DRV-TEST-01', authContext);
  } catch (err) {
    driverDeleteBlocked = true;
  }
  const t7Passed = truckUsage.isUsed && driverUsage.isUsed && truckDeleteBlocked && driverDeleteBlocked;
  results.push({
    id: 'MD-TEST-07',
    category: 'حماية السجلات التاريخية (Historical Immutability)',
    titleAr: 'ممنوع حذف الشاحنات والسائقين المرتبطين برحلات سابقة',
    titleEn: 'Prohibit hard delete of Trucks and Drivers referenced in historical trips',
    passed: t7Passed,
    expected: 'Both Truck and Driver hard delete strictly prohibited',
    actual: `Truck blocked: ${truckDeleteBlocked}, Driver blocked: ${driverDeleteBlocked}`,
    details: 'صون النزاهة التاريخية وسلاسل الإمداد المحاسبية للمشاريع.',
  });

  // ----------------------------------------------------
  // TEST 8: Use ACTIVE/INACTIVE instead of hard delete
  // ----------------------------------------------------
  const softDeleteRes = await masterDataService.deleteMasterEntity(TEST_PROJECT_ID, 'CARRIER', 'CAR-TEST-UNUSED', authContext);
  const updatedCarrier = await carrierRepository.findById(TEST_PROJECT_ID, 'CAR-TEST-UNUSED');
  const t8Passed = softDeleteRes.softDeleted === true && updatedCarrier?.status === 'INACTIVE' && updatedCarrier?.isActive === false;
  results.push({
    id: 'MD-TEST-08',
    category: 'إدارة الحالة (Lifecycle Management)',
    titleAr: 'استخدام ACTIVE/INACTIVE بدلاً من الحذف الفعلي (Hard Delete)',
    titleEn: 'Transition entity status to INACTIVE instead of hard delete',
    passed: t8Passed,
    expected: 'Carrier status transitioned to INACTIVE without removing the record',
    actual: `Status: ${updatedCarrier?.status}, isActive: ${updatedCarrier?.isActive}`,
    details: 'الحفاظ على الوثائق المحاسبية والتاريخية مع إيقاف التشغيل المستقبلي.',
  });

  // ----------------------------------------------------
  // TEST 9: Inactive Master Data cannot be dispatched
  // ----------------------------------------------------
  let inactiveDispatchBlocked = false;
  try {
    await tripService.dispatchTrip({
      projectId: TEST_PROJECT_ID,
      carrierId: 'CAR-TEST-UNUSED', // Now INACTIVE!
      truckId: 'TRK-TEST-01',
      driverId: 'DRV-TEST-01',
      materialId: 'MAT-TEST-AUTH-1',
      pricingRuleId: 'PR-TEST-01',
    }, authContext);
  } catch (err: any) {
    inactiveDispatchBlocked = err.message.includes('INACTIVE') || err.message.includes('غير نشط');
  }
  results.push({
    id: 'MD-TEST-09',
    category: 'صلاحيات التسيير (Dispatch Enforcement)',
    titleAr: 'منع تسيير رحلات مستقبلية باستخدام سجل في حالة INACTIVE',
    titleEn: 'Reject trip dispatch when carrier status is INACTIVE',
    passed: inactiveDispatchBlocked,
    expected: 'Dispatch blocked due to INACTIVE carrier status',
    actual: inactiveDispatchBlocked ? 'Blocked as expected' : 'Dispatch allowed incorrectly',
    details: 'الكيانات المعطلة لا يُسمح بتوليد رحلات جديدة لها.',
  });

  const totalTests = results.length;
  const passedTests = results.filter(r => r.passed).length;
  const failedTests = totalTests - passedTests;

  return {
    allPassed: failedTests === 0,
    totalTests,
    passedTests,
    failedTests,
    results,
  };
}
