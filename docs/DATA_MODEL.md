# Q Saudi Work Follow — نموذج البيانات والمخطط الهيكلي (Data Model & Schema)

## 1. فلسفة تخزين البيانات ومصدر الحقيقة (Storage Philosophy)

* **Firestore** هو قاعدة البيانات العملياتية الأساسية والمصدر الأوحد للحقيقة (Single Source of Truth - SSOT).
* يتم تنظيم البيانات بنمط **Multi-Tenant Scoped Subcollections** لضمان العزل التام للمشاريع وسهولة تطبيق أمان Firestore Security Rules.
* **Denormalization الاستراتيجي للقطات التاريخية (Historical Snapshots):**
  البيانات المرجعية (مثل اسم السائق، رقم لوحة الشاحنة، اسم الناقل، مصفوفة التسعير الحالية) يتم أخذ لقطة فورية منها (`Snapshot`) وتضمينها داخل وثيقة الرحلة (`Trip`). هذا يضمن أن أي تعديل مستقبلي على بيانات السائق أو تعديل في أسعار الناقل لن يغير السجلات المالية والمحاسبية القديمة نهائياً.

---

## 2. الهيكلية الشجرية لمجموعات Firestore (Firestore Hierarchy)

```
/projects/{projectId}                             (وثيقة المشروع الرئيسية)
   ├── /carriers/{carrierId}                      (شركات النقل المتعاقدة)
   ├── /materials/{materialId}                    (المواد المصرح بنقلها ومواصفاتها)
   ├── /pricing_rules/{ruleId}                    (قواعد التسعير والتعريفات)
   ├── /trucks/{truckId}                          (أسطول الشاحنات المعتمد)
   ├── /drivers/{driverId}                        (السائقون المعتمدون)
   ├── /trips/{tripId}                            (سجلات الرحلات الميدانية)
   │      ├── /events/{eventId}                   (الأحداث الزمنية للرحلة)
   │      └── /exceptions/{exceptionId}           (الاستثناءات والتعثرات)
   ├── /sync_operations/{syncOpId}                (عمليات المزامنة لضمان عدم التكرار Idempotency)
   └── /sheet_projections/{projectionId}          (بيانات ربط وإسقاط Google Sheets)

/users/{userId}                                   (ملفات المستخدمين والأدوار)
/audit_logs/{auditLogId}                          (سجل التدقيق الشامل غير القابل للتعديل)
```

---

## 3. تعريفات الكيانات والواجهات البرمجية (TypeScript Entity Schemas)

### 3.1 مشروع (Project Entity)
```typescript
interface Project {
  id: string;                                   // معرّف المشروع (e.g. "proj_riyadh_metro_01")
  nameAr: string;                               // اسم المشروع بالعربية
  nameEn: string;                               // Project Name in English
  clientName: string;                           // اسم العميل / الجهة المالكة
  location: {
    lat: number;
    lng: number;
    geoFenceRadiusMeters: number;               // نطاق السياج الجغرافي للموقع
    addressAr: string;
  };
  settings: {
    zatcaTaxNumber: string;                     // الرقم الضريبي 15 رقم
    vatRatePercent: number;                     // عادة 15% في المملكة
    googleDriveFolderId: string;                // معرّف المجلد الرئيسي على Google Drive
    googleSpreadsheetId: string;                // معرّف ملف Google Sheets للتقارير
    allowDriverSelfDispatch: boolean;
  };
  status: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}
```

### 3.2 الناقل (Carrier Entity)
```typescript
interface Carrier {
  id: string;                                   // معرّف الناقل
  projectId: string;                            // معرّف المشروع المرتبط به
  companyNameAr: string;                        // اسم شركة النقل
  commercialRegistrationNo: string;             // السجل التجاري (CR)
  transportLicenseNo: string;                   // ترخيص هيئة النقل (TGA)
  contactPerson: {
    name: string;
    phone: string;                              // e.g. "+9665XXXXXXXX"
    email: string;
  };
  isActive: boolean;
  pricingRuleId: string;                        // قاعدة التسعير الافتراضية للناقل
  createdAt: FirebaseFirestore.Timestamp;
}
```

### 3.3 المادة (Material Entity)
```typescript
interface Material {
  id: string;
  projectId: string;
  code: string;                                 // e.g. "AGG_20MM", "BASE_COURSE"
  nameAr: string;
  unitOfMeasure: 'TON' | 'M3' | 'TRIP';
  standardDensityTonPerM3?: number;             // الكثافة القياسية
  maxAllowableMoisturePercent?: number;         // نسبة الرطوبة المسموحة
  isActive: boolean;
}
```

### 3.4 الشاحنة (Truck Entity)
```typescript
interface Truck {
  id: string;
  projectId: string;
  carrierId: string;
  plateNumberAr: string;                        // e.g. "أ ب ج 1234"
  plateNumberEn: string;                        // e.g. "ABC 1234"
  truckType: 'TIPPER_32M3' | 'TRAILER_24M' | 'FLATBED' | 'DUMPER';
  tareWeightKg: number;                         // الوزن الفارغ المعتمد رسميًا
  maxGrossWeightKg: number;                     // الحد الأقصى للوزن الإجمالي النظامي
  legalPayloadLimitKg: number;                  // حمولة النظام المسموح بها (Gross - Tare)
  mvpiValidUntil: FirebaseFirestore.Timestamp;  // تاريخ سريان الفحص الدوري
  insuranceValidUntil: FirebaseFirestore.Timestamp;
  isActive: boolean;
}
```

### 3.5 السائق (Driver Entity)
```typescript
interface Driver {
  id: string;
  projectId: string;
  carrierId: string;
  fullNameAr: string;
  nationalOrIqamaId: string;                    // رقم الهوية أو الإقامة (10 أرقام)
  phone: string;                                // جوال السائق للـ OTP
  licenseNumber: string;
  licenseValidUntil: FirebaseFirestore.Timestamp;
  currentAssignedTruckId?: string;
  isActive: boolean;
}
```

### 3.6 قاعدة التسعير (Pricing Rule Entity)
```typescript
interface PricingRule {
  id: string;
  projectId: string;
  carrierId?: string;                           // اختياري إذا كانت خاصة بناقل
  materialId: string;
  name: string;
  pricingModel: 'PER_TON' | 'PER_TRIP' | 'PER_KM' | 'FLAT_RATE';
  baseRateSAR: number;                          // السعر الأساسي بالريال السعودي
  minimumBillableWeightKg?: number;             // الحد الأدنى للوزن المحتسب
  demurrageRatePerHourSAR: number;              // سعر غرامة التأخير في الساعة
  freeTimeHours: number;                        // ساعات الانتظار المجانية المسموحة
  vatApplicable: boolean;                       // خضوع للضريبة (15%)
  effectiveDate: FirebaseFirestore.Timestamp;
  expiryDate?: FirebaseFirestore.Timestamp;
  isActive: boolean;
}
```

### 3.7 الرحلة (Trip Entity - الحاوية المركزية)
```typescript
interface Trip {
  id: string;                                   // Trip ID (UUID or Auto-ID)
  tripNumber: string;                           // الرقم التشغيلي المتسلسل (e.g. "TRP-2026-004128")
  projectId: string;
  
  // لقطات غير قابلة للتعديل للحفاظ على الدقة التاريخية
  carrierSnapshot: {
    id: string;
    nameAr: string;
    commercialRegistrationNo: string;
  };
  truckSnapshot: {
    id: string;
    plateNumberAr: string;
    tareWeightKg: number;
    legalPayloadLimitKg: number;
  };
  driverSnapshot: {
    id: string;
    nameAr: string;
    nationalOrIqamaId: string;
    phone: string;
  };
  materialSnapshot: {
    id: string;
    code: string;
    nameAr: string;
    unitOfMeasure: string;
  };
  pricingSnapshot: {
    ruleId: string;
    pricingModel: string;
    baseRateSAR: number;
    vatApplicable: boolean;
    vatRatePercent: number;
  };

  // الحالة التشغيلية الخادومية (FSM)
  status: 
    | 'DRAFT'
    | 'DISPATCHED'
    | 'AT_ORIGIN'
    | 'LOADING'
    | 'WEIGHED_ORIGIN'
    | 'IN_TRANSIT'
    | 'AT_DESTINATION'
    | 'WEIGHED_DESTINATION'
    | 'OFFLOADED'
    | 'COMPLETED'
    | 'REJECTED'
    | 'CANCELLED';

  // قياسات الميزان (Server Validated Weights)
  weights: {
    originTareKg?: number;
    originGrossKg?: number;
    originNetKg?: number;                       // Gross - Tare
    originWeighbridgeTicketNo?: string;
    originWeighbridgeTicketDriveFileId?: string; // رابط تذكرة الميزان على Google Drive
    
    destinationTareKg?: number;
    destinationGrossKg?: number;
    destinationNetKg?: number;
    destinationWeighbridgeTicketNo?: string;
    destinationWeighbridgeTicketDriveFileId?: string;

    billableWeightKg?: number;                  // الوزن المعتمد للفوترة خادومياً
  };

  // الحساب المالي الخادومي النهائي (لا يحدده العميل أبداً)
  financials: {
    baseAmountSAR: number;                      // القيمة الأساسية
    demurrageAmountSAR: number;                 // غرامات التأخير
    deductionsAmountSAR: number;                // خصومات الجودة أو الانسكاب
    subtotalSAR: number;                        // قبل الضريبة
    vatAmountSAR: number;                       // 15% VAT
    totalAmountSAR: number;                     // الإجمالي النهائي المستحق
    currency: 'SAR';
    isFinalized: boolean;                       // تم قفل القيمة المالية
    finalizedAt?: FirebaseFirestore.Timestamp;
  };

  // بيانات المزامنة والتحكم الميداني
  clientUUID: string;                           // معرّف الرحلة من طرف العميل
  syncStatus: 'SYNCED' | 'PENDING' | 'CONFLICT';
  hasExceptions: boolean;
  activeExceptionCount: number;

  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}
```

### 3.8 أحداث الرحلة (Trip Event Entity)
```typescript
interface TripEvent {
  id: string;
  tripId: string;
  projectId: string;
  eventType: 
    | 'EVENT_DISPATCHED'
    | 'EVENT_ORIGIN_ARRIVAL'
    | 'EVENT_WEIGHBRIDGE_ORIGIN_CAPTURED'
    | 'EVENT_DEPART_ORIGIN'
    | 'EVENT_DESTINATION_ARRIVAL'
    | 'EVENT_WEIGHBRIDGE_DESTINATION_CAPTURED'
    | 'EVENT_CARGO_OFFLOADED'
    | 'EVENT_TRIP_COMPLETED'
    | 'EVENT_EXCEPTION_RAISED';
  
  statusResulting: Trip['status'];              // الحالة الناتجة بعد الحدث
  actor: {
    userId: string;
    role: string;
    displayName: string;
  };
  deviceTimestamp: string;                      // وقت الجهاز في الميدان (ISO)
  serverTimestamp: FirebaseFirestore.Timestamp; // الطابع الزمني المعتمد خادومياً
  location?: {
    latitude: number;
    longitude: number;
    accuracyMeters: number;
  };
  payload: Record<string, any>;                 // تفاصيل الحدث (مثل أوزان، صور، ملاحظات)
  idempotencyKey: string;
}
```

### 3.9 الاستثناءات التشغيلية (Exception Entity)
```typescript
interface TripException {
  id: string;
  tripId: string;
  projectId: string;
  type: 
    | 'OVERWEIGHT_VIOLATION'                    // تجاوز الوزن القانوني للشاحنة
    | 'WEIGHT_DISCREPANCY'                      // فرق ميزان كبير بين التحميل والتفريغ
    | 'ROUTE_DEVIATION'                         // انحراف عن المسار المحدد
    | 'EXCESSIVE_TRANSIT_TIME'                  // تأخر غير مبرر
    | 'DAMAGED_CARGO'                           // تلف في المادة
    | 'VEHICLE_BREAKDOWN'                       // عطل ميكانيكي
    | 'OFF_HOURS_MOVEMENT';                     // تحرك في أوقات حظر الشاحنات بالرياض/جدة
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'BLOCKING';
  status: 'OPEN' | 'INVESTIGATING' | 'WAIVED' | 'RESOLVED';
  reportedBy: {
    userId: string;
    displayName: string;
    timestamp: FirebaseFirestore.Timestamp;
  };
  resolution?: {
    resolvedByUserId: string;
    resolutionNotes: string;
    financialPenaltySAR?: number;
    resolvedAt: FirebaseFirestore.Timestamp;
  };
}
```

### 3.10 سجل التدقيق غير القابل للتعديل (Audit Log Entity)
```typescript
interface AuditLog {
  id: string;
  projectId: string;
  entityType: 'TRIP' | 'PRICING_RULE' | 'TRUCK' | 'USER_ROLE' | 'FINANCIAL_ADJUSTMENT';
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'FORCE_STATUS_CHANGE' | 'RECALCULATE_PRICING';
  actor: {
    userId: string;
    email: string;
    role: string;
    ipAddress: string;
    userAgent: string;
  };
  changes: {
    before: Record<string, any> | null;
    after: Record<string, any>;
    deltaFields: string[];
  };
  correlationId: string;
  serverTimestamp: FirebaseFirestore.Timestamp;
}
```

### 3.11 عملية المزامنة وحماية التكرار (Sync Operation Entity)
```typescript
interface SyncOperation {
  id: string;                                   // تساوي idempotencyKey
  projectId: string;
  userId: string;
  clientOperationUUID: string;
  targetCollection: string;
  targetDocId: string;
  status: 'PROCESSED' | 'FAILED' | 'REJECTED';
  processedResponse: Record<string, any>;
  processedAt: FirebaseFirestore.Timestamp;
  ttl: FirebaseFirestore.Timestamp;             // الاحتفاظ بها 90 يوماً للمطابقة
}
```

---

## 4. استراتيجية الفهارس (Firestore Indexing Strategy)

لضمان سرعة الاستعلام وتفادي اختناقات الأداء الميدانية:

1. **مؤشرات الحقول الفردية (Single-Field Indexes):**
   * `tripNumber` (Unique per project)
   * `status`
   * `clientUUID`
   * `createdAt`

2. **مؤشرات الفهارس المركبة (Composite Indexes):**
   * `trips`: `projectId` (Asc) + `status` (Asc) + `createdAt` (Desc)
   * `trips`: `projectId` (Asc) + `carrierSnapshot.id` (Asc) + `createdAt` (Desc)
   * `trips`: `projectId` (Asc) + `truckSnapshot.id` (Asc) + `status` (Asc)
   * `events`: `tripId` (Asc) + `serverTimestamp` (Asc)
   * `audit_logs`: `projectId` (Asc) + `entityType` (Asc) + `serverTimestamp` (Desc)
   * `sync_operations`: `projectId` (Asc) + `clientOperationUUID` (Asc)
