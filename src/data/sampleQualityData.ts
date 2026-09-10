/**
 * Preset Scenarios and Staged Imports for Data Quality Engine
 * Demonstrates the 8-stage pipeline, conflict detection, and Arabic-aware normalization.
 */

import { RelationshipContext, ImportRecordPayload } from '../types/dataQuality';

export const SAMPLE_QUALITY_CONTEXT: RelationshipContext = {
  projectId: 'PRJ-NEOM-001',
  authorizedCarrierIds: ['CAR-ALMAJDOUIE', 'CAR-BINLADIN'],
  authorizedMaterialIds: ['MAT-AGG-01', 'MAT-SND-01'], // MAT-ASPH-01 is NOT authorized in this project!
  knownCarriers: [
    {
      carrierId: 'CAR-ALMAJDOUIE',
      name: 'شركة المجدوعي اللوجستية',
      status: 'ACTIVE',
    },
    {
      carrierId: 'CAR-BINLADIN',
      name: 'مجموعة بن لادن للنقل',
      status: 'ACTIVE',
    },
    {
      carrierId: 'CAR-ALFAZI',
      name: 'شركة الفزي للنقل السريع', // Notice: "الفزي" in database!
      status: 'ACTIVE',
    },
    {
      carrierId: 'CAR-SHARQI',
      name: 'مؤسسة الشرقي للتجارة والنقل', // Not in authorizedCarrierIds!
      status: 'ACTIVE',
    },
  ],
  knownTrucks: [
    {
      truckId: 'TRK-9901',
      plate: 'أ ب ج 1234',
      carrierId: 'CAR-ALMAJDOUIE',
      status: 'ACTIVE',
    },
    {
      truckId: 'TRK-9902',
      plate: 'د هـ و 5678',
      carrierId: 'CAR-BINLADIN',
      status: 'ACTIVE',
    },
    {
      truckId: 'TRK-9903',
      plate: 'س ص ع 9988',
      carrierId: 'CAR-ALFAZI',
      status: 'ACTIVE',
    },
  ],
  knownDrivers: [
    {
      driverId: 'DRV-101',
      name: 'خالد عبدالله الشمري',
      phone: '0501234567',
      idNumber: '1098765432',
      carrierId: 'CAR-ALMAJDOUIE',
      status: 'ACTIVE',
    },
    {
      driverId: 'DRV-102',
      name: 'محمد إبراهيم الزهراني',
      phone: '0559876543',
      idNumber: '1012345678',
      carrierId: 'CAR-BINLADIN',
      status: 'ACTIVE',
    },
    {
      driverId: 'DRV-103',
      name: 'سلطان فهد الفزي',
      phone: '0567788990',
      idNumber: '2088776655',
      carrierId: 'CAR-ALFAZI',
      status: 'ACTIVE',
    },
  ],
  knownMaterials: [
    {
      materialId: 'MAT-AGG-01',
      name: 'ركام بازلتي مقاس 20 ملم',
      code: 'AGG-20MM',
      status: 'ACTIVE',
    },
    {
      materialId: 'MAT-SND-01',
      name: 'رمل أحمر ردميات ناعم',
      code: 'SND-RED-01',
      status: 'ACTIVE',
    },
    {
      materialId: 'MAT-ASPH-01',
      name: 'خلطة إسفلتية ساخنة درجة 60/70',
      code: 'ASPH-HOT-60',
      status: 'ACTIVE',
    },
  ],
};

export const SAMPLE_STAGED_IMPORTS: ImportRecordPayload[] = [
  {
    rowId: 'IMP-ROW-001',
    sourceSheet: 'كشف شحنات ركاب يومي - نيوم.xlsx',
    carrierInput: {
      rawName: 'شركة الفازي للنقل', // Test: "الفازي" vs "الفزي" -> FUZZY match, NOT auto-merge!
    },
    truckInput: {
      rawPlate: 'س ص ع 9988',
      tareKg: 14200,
      grossKg: 45000,
    },
    driverInput: {
      rawName: 'سلطان فهد الفزي',
      rawPhone: '0567788990',
    },
    materialInput: {
      rawName: 'ركام بازلتي 20 ملم',
    },
    status: 'PENDING',
  },
  {
    rowId: 'IMP-ROW-002',
    sourceSheet: 'فواتير مقاولي الباطن - الرياض.xlsx',
    carrierInput: {
      carrierId: 'CAR-BINLADIN',
      rawName: 'مجموعة بن لادن للنقل',
    },
    truckInput: {
      rawPlate: 'أ ب ج 1234', // TRK-9901 belongs to CAR-ALMAJDOUIE! -> CARRIER_TRUCK_CONFLICT
      carrierId: 'CAR-BINLADIN',
      tareKg: 15000,
      grossKg: 45000,
    },
    driverInput: {
      rawName: 'محمد إبراهيم الزهراني',
      rawPhone: '0559876543',
    },
    materialInput: {
      rawName: 'رمل أحمر ردميات ناعم',
    },
    status: 'PENDING',
  },
  {
    rowId: 'IMP-ROW-003',
    sourceSheet: 'أوامر تسليم الكسارة - مشروع نيوم.xlsx',
    carrierInput: {
      carrierId: 'CAR-SHARQI',
      rawName: 'مؤسسة الشرقي للتجارة والنقل', // CAR-SHARQI is NOT authorized in this project! -> CARRIER_NOT_ALLOWED
    },
    truckInput: {
      rawPlate: 'د هـ و 5678',
      tareKg: 14500,
      grossKg: 45000,
    },
    driverInput: {
      rawName: 'خالد عبدالله الشمري', // Belongs to ALMAJDOUIE, not SHARQI! -> DRIVER_CARRIER_CONFLICT
      rawPhone: '0501234567',
    },
    materialInput: {
      rawName: 'خلطة إسفلتية ساخنة درجة 60/70', // MAT-ASPH-01 is NOT authorized in this project! -> MATERIAL_NOT_ALLOWED
    },
    status: 'PENDING',
  },
  {
    rowId: 'IMP-ROW-004',
    sourceSheet: 'مستخلصات توريد معتمدة.xlsx',
    carrierInput: {
      carrierId: 'CAR-ALMAJDOUIE',
      rawName: 'شركة المجدوعي اللوجستية', // EXACT MATCH
    },
    truckInput: {
      rawPlate: 'ا ب ج 1234', // EXACT MATCH (normalized)
      carrierId: 'CAR-ALMAJDOUIE',
      tareKg: 14200,
      grossKg: 45000,
    },
    driverInput: {
      rawName: 'خالد عبدالله الشمري', // EXACT MATCH
      rawPhone: '0501234567',
    },
    materialInput: {
      rawName: 'ركام بازلتي مقاس 20 ملم', // EXACT MATCH
    },
    status: 'PENDING',
  },
  {
    rowId: 'IMP-ROW-005',
    sourceSheet: 'سجل يدوي من موقع العمل.xlsx',
    carrierInput: {
      rawName: 'ناقل مجهول 99', // NO_MATCH
    },
    truckInput: {
      rawPlate: 'لوحة غير معروفة', // INVALID_PLATE_FORMAT
      tareKg: 20000,
      grossKg: 15000, // Illegal weight tare > gross
    },
    driverInput: {
      rawName: 'أحمد علي',
      rawPhone: '12345', // INVALID_PHONE_FORMAT
    },
    materialInput: {
      rawName: 'حديد تسليح', // NO_MATCH
    },
    status: 'PENDING',
  },
];
