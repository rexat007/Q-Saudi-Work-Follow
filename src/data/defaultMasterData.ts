import { ProjectEntity, CarrierEntity, MaterialEntity, TruckEntity, DriverEntity } from '../types/entities';
import { ProjectMasterDataOverview } from '../services/masterData.service';
import { normalizeName, normalizePlate } from '../utils/normalization';

export const DEFAULT_PROJECTS: ProjectEntity[] = [
  {
    projectId: 'PRJ-NEOM-NORTH-01',
    projectCode: 'NEOM-N01',
    nameAr: 'مشروع حزم البنية التحتية - نيوم الشمالية',
    nameEn: 'NEOM North Infrastructure Package',
    clientName: 'شركة نيوم للإنشاءات',
    location: {
      lat: 28.003,
      lng: 35.212,
      geoFenceRadiusMeters: 500,
      addressAr: 'نيوم - المنطقة الشمالية',
    },
    settings: {
      zatcaTaxNumber: '300012345600003',
      vatRatePercent: 15,
      allowDriverSelfDispatch: false,
    },
    authorizedCarrierIds: ['CAR-ALMAJDOUIE', 'CAR-BINLADIN'],
    authorizedMaterialIds: ['MAT-AGG-01', 'MAT-SND-01'],
    status: 'ACTIVE',
    createdAt: new Date() as any,
    createdBy: 'SYSTEM',
    updatedAt: new Date() as any,
    updatedBy: 'SYSTEM',
  },
  {
    projectId: 'PRJ-REDSEA-RESORT-02',
    projectCode: 'RSR-02',
    nameAr: 'مشروع وجهة البحر الأحمر - منطقة الجزر السياحية',
    nameEn: 'Red Sea Destination Coastal Resort',
    clientName: 'شركة البحر الأحمر الدولية',
    location: {
      lat: 25.531,
      lng: 36.924,
      geoFenceRadiusMeters: 1000,
      addressAr: 'مشروع البحر الأحمر - رصيف الشحن الساحلي',
    },
    settings: {
      zatcaTaxNumber: '300098765400003',
      vatRatePercent: 15,
      allowDriverSelfDispatch: false,
    },
    authorizedCarrierIds: ['CAR-ALMAJDOUIE'],
    authorizedMaterialIds: ['MAT-AGG-01'],
    status: 'ACTIVE',
    createdAt: new Date() as any,
    createdBy: 'SYSTEM',
    updatedAt: new Date() as any,
    updatedBy: 'SYSTEM',
  }
];

const now = new Date();

export const DEFAULT_CARRIERS: CarrierEntity[] = [
  {
    carrierId: 'CAR-ALMAJDOUIE',
    projectId: 'PRJ-NEOM-NORTH-01',
    name: 'شركة المجدوعي اللوجستية',
    normalizedName: normalizeName('شركة المجدوعي اللوجستية'),
    status: 'ACTIVE',
    companyNameAr: 'شركة المجدوعي اللوجستية',
    commercialRegistrationNo: '1010334455',
    transportLicenseNo: 'TGA-KSA-9988',
    isActive: true,
    createdAt: now,
    createdBy: 'SYSTEM',
    updatedAt: now,
    updatedBy: 'SYSTEM',
  },
  {
    carrierId: 'CAR-BINLADIN',
    projectId: 'PRJ-NEOM-NORTH-01',
    name: 'شركة أبناء بن لادن للنقل',
    normalizedName: normalizeName('شركة أبناء بن لادن للنقل'),
    status: 'ACTIVE',
    companyNameAr: 'شركة أبناء بن لادن للنقل',
    commercialRegistrationNo: '1010998877',
    transportLicenseNo: 'TGA-KSA-7766',
    isActive: true,
    createdAt: now,
    createdBy: 'SYSTEM',
    updatedAt: now,
    updatedBy: 'SYSTEM',
  },
  {
    carrierId: 'CAR-ALSHARQI',
    projectId: 'PRJ-NEOM-NORTH-01',
    name: 'مؤسسة الشرقي للنقل والتجارة',
    normalizedName: normalizeName('مؤسسة الشرقي للنقل والتجارة'),
    status: 'INACTIVE',
    companyNameAr: 'مؤسسة الشرقي للنقل والتجارة',
    commercialRegistrationNo: '1010112233',
    isActive: false,
    createdAt: now,
    createdBy: 'SYSTEM',
    updatedAt: now,
    updatedBy: 'SYSTEM',
  },
];

export const DEFAULT_MATERIALS: MaterialEntity[] = [
  {
    materialId: 'MAT-AGG-01',
    projectId: 'PRJ-NEOM-NORTH-01',
    name: 'ركام بازلتي مقاس 3/4 بوصة',
    normalizedName: normalizeName('ركام بازلتي مقاس 3/4 بوصة'),
    code: 'AGG-01',
    status: 'ACTIVE',
    unitOfMeasure: 'TON',
    standardDensityTonPerM3: 1.65,
    isActive: true,
    createdAt: now,
    createdBy: 'SYSTEM',
    updatedAt: now,
    updatedBy: 'SYSTEM',
  },
  {
    materialId: 'MAT-SND-01',
    projectId: 'PRJ-NEOM-NORTH-01',
    name: 'رمل أحمر مغسول للخلطات الخرسانية',
    normalizedName: normalizeName('رمل أحمر مغسول للخلطات الخرسانية'),
    code: 'SND-01',
    status: 'ACTIVE',
    unitOfMeasure: 'TON',
    standardDensityTonPerM3: 1.5,
    isActive: true,
    createdAt: now,
    createdBy: 'SYSTEM',
    updatedAt: now,
    updatedBy: 'SYSTEM',
  },
  {
    materialId: 'MAT-SUB-01',
    projectId: 'PRJ-NEOM-NORTH-01',
    name: 'طبقة أساس حصوي مدموك (Sub-base)',
    normalizedName: normalizeName('طبقة أساس حصوي مدموك (Sub-base)'),
    code: 'SUB-01',
    status: 'INACTIVE',
    unitOfMeasure: 'TON',
    isActive: false,
    createdAt: now,
    createdBy: 'SYSTEM',
    updatedAt: now,
    updatedBy: 'SYSTEM',
  },
];

export const DEFAULT_TRUCKS: TruckEntity[] = [
  {
    truckId: 'TRK-9871',
    projectId: 'PRJ-NEOM-NORTH-01',
    carrierId: 'CAR-ALMAJDOUIE',
    plate: 'أ ب ج 9871',
    normalizedPlate: normalizePlate('أ ب ج 9871'),
    plateNumberAr: 'أ ب ج 9871',
    status: 'ACTIVE',
    tareWeightKg: 14200,
    maxGrossWeightKg: 45000,
    legalPayloadLimitKg: 30800,
    isActive: true,
    createdAt: now,
    createdBy: 'SYSTEM',
    updatedAt: now,
    updatedBy: 'SYSTEM',
  },
  {
    truckId: 'TRK-5542',
    projectId: 'PRJ-NEOM-NORTH-01',
    carrierId: 'CAR-ALMAJDOUIE',
    plate: 'د هـ و 5542',
    normalizedPlate: normalizePlate('د هـ و 5542'),
    plateNumberAr: 'د هـ و 5542',
    status: 'ACTIVE',
    tareWeightKg: 13800,
    maxGrossWeightKg: 45000,
    legalPayloadLimitKg: 31200,
    isActive: true,
    createdAt: now,
    createdBy: 'SYSTEM',
    updatedAt: now,
    updatedBy: 'SYSTEM',
  },
  {
    truckId: 'TRK-1122',
    projectId: 'PRJ-NEOM-NORTH-01',
    carrierId: 'CAR-BINLADIN',
    plate: 'ر ز س 1122',
    normalizedPlate: normalizePlate('ر ز س 1122'),
    plateNumberAr: 'ر ز س 1122',
    status: 'ACTIVE',
    tareWeightKg: 14500,
    maxGrossWeightKg: 45000,
    legalPayloadLimitKg: 30500,
    isActive: true,
    createdAt: now,
    createdBy: 'SYSTEM',
    updatedAt: now,
    updatedBy: 'SYSTEM',
  },
];

export const DEFAULT_DRIVERS: DriverEntity[] = [
  {
    driverId: 'DRV-101',
    projectId: 'PRJ-NEOM-NORTH-01',
    carrierId: 'CAR-ALMAJDOUIE',
    name: 'أحمد محمود القرني',
    normalizedName: normalizeName('أحمد محمود القرني'),
    fullNameAr: 'أحمد محمود القرني',
    phone: '0551234567',
    idNumber: '1098765432',
    nationalOrIqamaId: '1098765432',
    status: 'ACTIVE',
    isActive: true,
    createdAt: now,
    createdBy: 'SYSTEM',
    updatedAt: now,
    updatedBy: 'SYSTEM',
  },
  {
    driverId: 'DRV-102',
    projectId: 'PRJ-NEOM-NORTH-01',
    carrierId: 'CAR-ALMAJDOUIE',
    name: 'خالد عبد الله العتيبي',
    normalizedName: normalizeName('خالد عبد الله العتيبي'),
    fullNameAr: 'خالد عبد الله العتيبي',
    phone: '0509876543',
    idNumber: '1012345678',
    nationalOrIqamaId: '1012345678',
    status: 'ACTIVE',
    isActive: true,
    createdAt: now,
    createdBy: 'SYSTEM',
    updatedAt: now,
    updatedBy: 'SYSTEM',
  },
  {
    driverId: 'DRV-201',
    projectId: 'PRJ-NEOM-NORTH-01',
    carrierId: 'CAR-BINLADIN',
    name: 'محمد إبراهيم الشمري',
    normalizedName: normalizeName('محمد إبراهيم الشمري'),
    fullNameAr: 'محمد إبراهيم الشمري',
    phone: '0543322110',
    idNumber: '2088776655',
    nationalOrIqamaId: '2088776655',
    status: 'ACTIVE',
    isActive: true,
    createdAt: now,
    createdBy: 'SYSTEM',
    updatedAt: now,
    updatedBy: 'SYSTEM',
  },
];

export function buildDefaultOverview(
  projectId: string,
  carriers: CarrierEntity[] = DEFAULT_CARRIERS,
  materials: MaterialEntity[] = DEFAULT_MATERIALS,
  trucks: TruckEntity[] = DEFAULT_TRUCKS,
  drivers: DriverEntity[] = DEFAULT_DRIVERS
): ProjectMasterDataOverview {
  const project = DEFAULT_PROJECTS.find(p => p.projectId === projectId) || DEFAULT_PROJECTS[0];
  const authCarrierIds = project.authorizedCarrierIds || carriers.map(c => c.carrierId);
  const authMaterialIds = project.authorizedMaterialIds || materials.map(m => m.materialId);

  const authorizedCarriers = carriers.filter(
    c => authCarrierIds.includes(c.carrierId) && c.status === 'ACTIVE'
  );
  const authorizedMaterials = materials.filter(
    m => authMaterialIds.includes(m.materialId) && m.status === 'ACTIVE'
  );

  const authorizedCarrierIdSet = new Set(authorizedCarriers.map(c => c.carrierId));
  const authorizedTrucks = trucks.filter(
    t => authorizedCarrierIdSet.has(t.carrierId) && t.status === 'ACTIVE'
  );
  const authorizedDrivers = drivers.filter(
    d => authorizedCarrierIdSet.has(d.carrierId) && d.status === 'ACTIVE'
  );

  return {
    projectId,
    projectNameAr: project.nameAr,
    authorizedCarriers,
    authorizedMaterials,
    authorizedTrucks,
    authorizedDrivers,
    allCarriers: carriers,
    allMaterials: materials,
    allTrucks: trucks,
    allDrivers: drivers,
  };
}
