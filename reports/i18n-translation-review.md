# Professional Translation Human Review Queue (BLOCK 43)

**Generated At:** 2026-09-12T08:57:59.759Z
**Total Catalog Entries Processed:** 9410
**Total Proposals Requiring Human Review:** 9405 (99.9%)

## Review Instructions for Translators & Enterprise Auditors

1. **Arabic Canonical Invariance:** The Arabic text is the canonical source and must never be altered.
2. **Parameter Preservation:** Dynamic variables like `{count}` or `{ticketNo}` must appear verbatim with exact casing and brackets.
3. **Protected Identifiers:** Database fields (e.g. `ticketId`, `truckNo`) and currency codes (`SAR`, `KG`, `TON`) must never be translated as data identifiers.
4. **Operational Disambiguation:** Terms like "تحميل" must translate to operational "Loading" in station contexts, not "Download".

## Review Summary by Risk Reason

| Review Reason | Queue Count | Architectural Description |
| :--- | :--- | :--- |
| `SEMANTIC_CONFLICT` | **834** | Identical source texts with different operational meanings quarantined to prevent UI/business conflation |
| `DOMAIN_TERM` | **0** | Domain-specific terminology requiring operational verification by enterprise domain leads |
| `INTERPOLATION_RISK` | **8** | Complex dynamic placeholders or parameter sequences requiring syntax verification |
| `PLURALIZATION_RISK` | **141** | Quantities requiring 6 Arabic plural forms aligned with target language plural rules |
| `REPORT_EXPORT_RISK` | **1405** | Report column or export header requiring separation of internal data key from display label |
| `BUSINESS_DATA_RISK` | **832** | Formulas, rates, or business calculations requiring strict identifier preservation |
| `LOW_CONFIDENCE` | **6185** | Ambiguous or composite phrases generated with low statistical confidence |
| `DIRECTIONAL_RISK` | **0** | Mixed-direction content (Arabic and Latin/numbers) needing directional inspection |
| `VALIDATION_FAILURE` | **0** | Proposal encountered parameter mismatch, missing tokens, or structural defects |
| `OTHER` | **0** | General review requirements flagged by migration pipeline |

### 1. Reason: `SEMANTIC_CONFLICT` (834 items)

> Identical source texts with different operational meanings quarantined to prevent UI/business conflation

| Key | Arabic Source | Proposed English | Proposed Urdu | Recommendation & Context |
| :--- | :--- | :--- | :--- | :--- |
| `carriers.actions.cancel` | "إلغاء" | "Cancel Trip" | "ٹرپ منسوخ کریں" | Verify context 'jsx_text'. Do NOT merge with other instances of 'إلغاء'. |
| `carriers.labels.add` | "إضافة ناقل جديد" | "Add ناقل جديد" | "شامل کریں ناقل جديد" | Verify context 'jsx_text'. Do NOT merge with other instances of 'إضافة ناقل جديد'. |
| `carriers.labels.carrier_4` | "الناقل غير موجود" | "Carrier غير موجود" | "کیریئر غير موجود" | Verify context 'literal'. Do NOT merge with other instances of 'الناقل غير موجود'. |
| `carriers.labels.save` | "حفظ التعديلات" | "Save الEditات" | "محفوظ کریں الترمیم کریںات" | Verify context 'literal'. Do NOT merge with other instances of 'حفظ التعديلات'. |
| `carriers.labels.status` | "الحالة التشغيلية (status)" | "Status التشغيلية (status)" | "حالت التشغيلية (status)" | Verify context 'jsx_text'. Do NOT merge with other instances of 'الحالة التشغيلية (status)'. |
| `carriers.labels.txt_1f05e4` | "البريد الإلكتروني" | "البريد الإلكتروني" | "البريد الإلكتروني" | Verify context 'jsx_text'. Do NOT merge with other instances of 'البريد الإلكتروني'. |
| `carriers.labels.txt_252d6d` | "الجوال:" | "الجوال:" | "الجوال:" | Verify context 'jsx_text'. Do NOT merge with other instances of 'الجوال:'. |
| `carriers.labels.txt_2f889d` | "السجل التجاري:" | "السجل التجاري:" | "السجل التجاري:" | Verify context 'jsx_text'. Do NOT merge with other instances of 'السجل التجاري:'. |
| `carriers.labels.txt_2f9f86` | "مسؤول العمليات" | "مسؤول Operations" | "مسؤول آپریشنز" | Verify context 'literal'. Do NOT merge with other instances of 'مسؤول العمليات'. |
| `carriers.labels.txt_38b1a6` | "معطّل (DISABLED)" | "معطّل (DISABLED)" | "معطّل (DISABLED)" | Verify context 'jsx_text'. Do NOT merge with other instances of 'معطّل (DISABLED)'. |
| `carriers.labels.txt_5b459d` | "معطّل" | "معطّل" | "معطّل" | Verify context 'jsx_text'. Do NOT merge with other instances of 'معطّل'. |
| `carriers.labels.txt_7f2994` | "المسؤول:" | "المسؤول:" | "المسؤول:" | Verify context 'jsx_text'. Do NOT merge with other instances of 'المسؤول:'. |
| `carriers.status.active` | "نشط (ACTIVE)" | "Active (ACTIVE)" | "فعال (ACTIVE)" | Verify context 'jsx_text'. Do NOT merge with other instances of 'نشط (ACTIVE)'. |
| `carriers.status.active_2` | "نشط" | "Active" | "فعال" | Verify context 'jsx_text'. Do NOT merge with other instances of 'نشط'. |
| `dashboard.fields.trip` | "رقم الرحلة / التذكرة" | "رقم الTrip / التذكرة" | "رقم الٹرپ / التذكرة" | Verify context 'jsx_text'. Do NOT merge with other instances of 'رقم الرحلة / التذكرة'. |
| `dashboard.labels.carrier` | "الناقل (Carrier)" | "Carrier (Carrier)" | "کیریئر (Carrier)" | Verify context 'jsx_text'. Do NOT merge with other instances of 'الناقل (Carrier)'. |
| `dashboard.labels.carrier_2` | "الناقل" | "Carrier" | "کیریئر" | Verify context 'jsx_text'. Do NOT merge with other instances of 'الناقل'. |
| `dashboard.labels.download_4` | "تم التحميل (LOADED)" | "تم التحميل (LOADED)" | "تم التحميل (LOADED)" | Verify context 'jsx_text'. Do NOT merge with other instances of 'تم التحميل (LOADED)'. |
| `dashboard.labels.download_5` | "تم التحميل" | "تم التحميل" | "تم التحميل" | Verify context 'literal'. Do NOT merge with other instances of 'تم التحميل'. |
| `dashboard.labels.location_3` | "الموقع:" | "Location:" | "مقام:" | Verify context 'jsx_text'. Do NOT merge with other instances of 'الموقع:'. |
| `dashboard.labels.material` | "المادة (Material)" | "Material (Material)" | "مٹیریل (Material)" | Verify context 'jsx_text'. Do NOT merge with other instances of 'المادة (Material)'. |
| `dashboard.labels.material_2` | "المادة" | "Material" | "مٹیریل" | Verify context 'jsx_text'. Do NOT merge with other instances of 'المادة'. |
| `dashboard.labels.materials` | "كافة المواد (All Materials)" | "كافة Materials (All Materials)" | "كافة مٹیریلز (All Materials)" | Verify context 'jsx_text'. Do NOT merge with other instances of 'كافة المواد (All Materials)'. |
| `dashboard.labels.materials_3` | "كافة المواد" | "كافة Materials" | "كافة مٹیریلز" | Verify context 'jsx_text'. Do NOT merge with other instances of 'كافة المواد'. |
| `dashboard.labels.pricing` | "نوع التسعير (Pricing Type)" | "نوع التسعير (Pricing Type)" | "نوع التسعير (Pricing Type)" | Verify context 'jsx_text'. Do NOT merge with other instances of 'نوع التسعير (Pricing Type)'. |
| ... | *and 809 more items in this queue* | | | |

### 1. Reason: `INTERPOLATION_RISK` (8 items)

> Complex dynamic placeholders or parameter sequences requiring syntax verification

| Key | Arabic Source | Proposed English | Proposed Urdu | Recommendation & Context |
| :--- | :--- | :--- | :--- | :--- |
| `entityResolution.labels.driverCarrier` | "تعارض السائق مع الناقل: السائق [${sourceValue}] مسجل تحت كفالة/تشغيل الناقل (${expCarrier}) وليس الناقل (${provCarrier})." | "تعارض Driver مع Carrier: Driver [${sourceValue}] مسجل تحت كفالة/تشغيل Carrier (${expCarrier}) وليس Carrier (${provCarrier})." | "تعارض ڈرائیور مع کیریئر: ڈرائیور [${sourceValue}] مسجل تحت كفالة/تشغيل کیریئر (${expCarrier}) وليس کیریئر (${provCarrier})." | Ensure parameter(s) [sourceValue, expCarrier, provCarrier] remain unmodified in translation syntax. |
| `entityResolution.labels.truckCarrierEdit` | "تعارض في ملكية الشاحنة: الشاحنة [${sourceValue}] مقيدة رسمياً للناقل (${expCarrier})، بينما الإدخال يشير إلى الناقل (${provCarrier}). النظام يمنع التعديل التلقائي للعلاقة." | "تعارض في ملكية Truck: Truck [${sourceValue}] مقيدة رسمياً للناقل (${expCarrier})، بينما الإدخال يشير إلى Carrier (${provCarrier}). النظام يمنع الEdit التلقائي للعلاقة." | "تعارض في ملكية ٹرک: ٹرک [${sourceValue}] مقيدة رسمياً للناقل (${expCarrier})، بينما الإدخال يشير إلى کیریئر (${provCarrier}). النظام يمنع الترمیم کریں التلقائي للعلاقة." | Ensure parameter(s) [sourceValue, expCarrier, provCarrier] remain unmodified in translation syntax. |
| `imports.fields.txt_423cda` | "الوزن الصافي المسجل في التذكرة (${net} كجم) يختلف عن الصافي المحسوب (القائم ${gross} - الفارغ ${tare} = ${calculatedNet} كجم) بفارق ${difference} كجم." | "Net Weight المسجل في التذكرة (${net} kg) يختلف عن الصافي المحسوب (القائم ${gross} - الفارغ ${tare} = ${calculatedNet} kg) بفارق ${difference} kg." | "خالص وزن المسجل في التذكرة (${net} کلوگرام) يختلف عن الصافي المحسوب (القائم ${gross} - الفارغ ${tare} = ${calculatedNet} کلوگرام) بفارق ${difference} کلوگرام." | Ensure parameter(s) [net, gross, tare, calculatedNet, difference] remain unmodified in translation syntax. |
| `imports.labels.driverCarrier_2` | "تعارض كفالة السائق: السائق (${cleanDriver}) مرتبط بالناقل (${expectedCarrier}) بينما السجل الوارد ينسبه للناقل (${cleanCarrier})." | "تعارض كفالة Driver: Driver (${cleanDriver}) مرتبط بCarrier (${expectedCarrier}) بينما السجل الوارد ينسبه للناقل (${cleanCarrier})." | "تعارض كفالة ڈرائیور: ڈرائیور (${cleanDriver}) مرتبط بکیریئر (${expectedCarrier}) بينما السجل الوارد ينسبه للناقل (${cleanCarrier})." | Ensure parameter(s) [cleanDriver, expectedCarrier, cleanCarrier] remain unmodified in translation syntax. |
| `imports.labels.truckCarrier_5` | "تعارض في العلاقة: الشاحنة (${cleanTruck}) مرتبطة في السجلات بالناقل (${expectedCarrier}) بينما السجل الوارد ينسبها للناقل (${cleanCarrier})." | "تعارض في العلاقة: Truck (${cleanTruck}) مرتبطة في السجلات بCarrier (${expectedCarrier}) بينما السجل الوارد ينسبها للناقل (${cleanCarrier})." | "تعارض في العلاقة: ٹرک (${cleanTruck}) مرتبطة في السجلات بکیریئر (${expectedCarrier}) بينما السجل الوارد ينسبها للناقل (${cleanCarrier})." | Ensure parameter(s) [cleanTruck, expectedCarrier, cleanCarrier] remain unmodified in translation syntax. |
| `imports.labels.txt_590dc8` | "اكتملت مراحل التحليل والمعايرة حتى المراجعة (REVIEW). الإجمالي: ${batch.totalRows}، صالح: ${validCount}، تحذيرات: ${warningCount}، أخطاء: ${errorCount}." | "اكتملت مراحل التحليل والمعايرة حتى المراجعة (REVIEW). Total: ${batch.totalRows}، صالح: ${validCount}، تحذيرات: ${warningCount}، أخطاء: ${errorCount}." | "اكتملت مراحل التحليل والمعايرة حتى المراجعة (REVIEW). کل: ${batch.totalRows}، صالح: ${validCount}، تحذيرات: ${warningCount}، أخطاء: ${errorCount}." | Ensure parameter(s) [validCount, warningCount, errorCount] remain unmodified in translation syntax. |
| `other.fields.txt_713130` | "# Q Saudi Work Follow — نموذج البيانات والمخطط الهيكلي (Data Model & Schema)

## 1. فلسفة تخزين البيانات ومصدر الحقيقة
- Firestore هو قاعدة البيانات الأساسية والمصدر الأوحد للحقيقة (SSOT).
- تنظيم البيانات بنمط Multi-Tenant Scoped Subcollections (/projects/{projectId}/...).
- Denormalization استراتيجي للقطات التاريخية (Pricing Snapshot, Truck Snapshot, Driver Snapshot).

## 2. الهيكلية الشجرية
/projects/{projectId}
   ├── /carriers/{carrierId}
   ├── /materials/{materialId}
   ├── /pricing_rules/{ruleId}
   ├── /trucks/{truckId}
   ├── /drivers/{driverId}
   ├── /trips/{tripId}
   │      ├── /events/{eventId}
   │      └── /exceptions/{exceptionId}
   ├── /sync_operations/{syncOpId}
   └── /sheet_projections/{projectionId}
/users/{userId}
/audit_logs/{auditLogId}" | "# Q Saudi Work Follow — نموذج البيانات والمخطط الهيكلي (Data Model & Schema)

## 1. فلسفة تخزين البيانات ومصدر الحقيقة
- Firestore هو قاعدة البيانات الأساسية والمصدر الأوحد للحقيقة (SSOT).
- تنظيم البيانات بنمط Multi-Tenant Scoped Subcollections (/projects/{projectId}/...).
- Denormalization استراتيجي للقطات التاريخية (Pricing Snapshot, Truck Snapshot, Driver Snapshot).

## 2. الهيكلية الشجرية
/projects/{projectId}
   ├── /carriers/{carrierId}
   ├── /materials/{materialId}
   ├── /pricing_rules/{ruleId}
   ├── /trucks/{truckId}
   ├── /drivers/{driverId}
   ├── /trips/{tripId}
   │      ├── /events/{eventId}
   │      └── /exceptions/{exceptionId}
   ├── /sync_operations/{syncOpId}
   └── /sheet_projections/{projectionId}
/users/{userId}
/audit_logs/{auditLogId}" | "# Q Saudi Work Follow — نموذج البيانات والمخطط الهيكلي (Data Model & Schema)

## 1. فلسفة تخزين البيانات ومصدر الحقيقة
- Firestore هو قاعدة البيانات الأساسية والمصدر الأوحد للحقيقة (SSOT).
- تنظيم البيانات بنمط Multi-Tenant Scoped Subcollections (/projects/{projectId}/...).
- Denormalization استراتيجي للقطات التاريخية (Pricing Snapshot, Truck Snapshot, Driver Snapshot).

## 2. الهيكلية الشجرية
/projects/{projectId}
   ├── /carriers/{carrierId}
   ├── /materials/{materialId}
   ├── /pricing_rules/{ruleId}
   ├── /trucks/{truckId}
   ├── /drivers/{driverId}
   ├── /trips/{tripId}
   │      ├── /events/{eventId}
   │      └── /exceptions/{exceptionId}
   ├── /sync_operations/{syncOpId}
   └── /sheet_projections/{projectionId}
/users/{userId}
/audit_logs/{auditLogId}" | Ensure parameter(s) [projectId, carrierId, materialId, ruleId, truckId, driverId, tripId, eventId, exceptionId, syncOpId, projectionId, userId, auditLogId] remain unmodified in translation syntax. |
| `projects.labels.carrier` | "تضارب تسعير: الناقل (${carrierDisplay}) لديه قاعدتا تسعير متطابقتان بنموذج (${pricingTypeLabel}) لمادة (${materialDisplay}) في فترتين زمنيتين متداخلتين: [${period1Str}] و [${period2Str}]." | "تضارب تسعير: Carrier (${carrierDisplay}) لديه قاعدتا تسعير متطابقتان بنموذج (${pricingTypeLabel}) لمادة (${materialDisplay}) في فترتين زمنيتين متداخلتين: [${period1Str}] و [${period2Str}]." | "تضارب تسعير: کیریئر (${carrierDisplay}) لديه قاعدتا تسعير متطابقتان بنموذج (${pricingTypeLabel}) لمادة (${materialDisplay}) في فترتين زمنيتين متداخلتين: [${period1Str}] و [${period2Str}]." | Ensure parameter(s) [carrierDisplay, pricingTypeLabel, materialDisplay, period1Str, period2Str] remain unmodified in translation syntax. |

### 1. Reason: `PLURALIZATION_RISK` (141 items)

> Quantities requiring 6 Arabic plural forms aligned with target language plural rules

| Key | Arabic Source | Proposed English | Proposed Urdu | Recommendation & Context |
| :--- | :--- | :--- | :--- | :--- |
| `dashboard.labels.download_2` | "إجمالي أوزان التحميل (Total Loaded Tons)" | "إجمالي أوزان التحميل (Total Loaded Tons)" | "إجمالي أوزان التحميل (Total Loaded Tons)" | Validate plural rules for Arabic (zero, one, two, few, many, other) vs English/Urdu (one, other). |
| `dashboard.labels.download_6` | "دقة حساب إجمالي أوزان التحميل والاستلام وفارق الموازين" | "دقة حساب إجمالي أوزان التحميل والاستلام وفارق الموازين" | "دقة حساب إجمالي أوزان التحميل والاستلام وفارق الموازين" | Validate plural rules for Arabic (zero, one, two, few, many, other) vs English/Urdu (one, other). |
| `dashboard.labels.location_2` | "إجمالي أوزان الاستلام بالموقع (Total Received Tons)" | "إجمالي أوزان الاستلام بLocation (Total Received Tons)" | "إجمالي أوزان الاستلام بمقام (Total Received Tons)" | Validate plural rules for Arabic (zero, one, two, few, many, other) vs English/Urdu (one, other). |
| `dashboard.labels.trips_2` | "إجمالي الرحلات (Total Trips)" | "إجمالي Trips (Total Trips)" | "إجمالي ٹرپس (Total Trips)" | Validate plural rules for Arabic (zero, one, two, few, many, other) vs English/Urdu (one, other). |
| `dashboard.labels.txt_17805f` | "إجمالي التسويات: ${settMetrics.totalSettlementAmount} ر.س (مقطوعية: ${settMetrics.tripBasedSettlementAmount}، أطنان: ${settMetrics.tonBasedSettlementAmount})." | "إجمالي التسويات: ${settMetrics.totalSettlementAmount} SAR (مقطوعية: ${settMetrics.tripBasedSettlementAmount}، tons: ${settMetrics.tonBasedSettlementAmount})." | "إجمالي التسويات: ${settMetrics.totalSettlementAmount} سعودی ریال (مقطوعية: ${settMetrics.tripBasedSettlementAmount}، ٹن: ${settMetrics.tonBasedSettlementAmount})." | Validate plural rules for Arabic (zero, one, two, few, many, other) vs English/Urdu (one, other). |
| `dashboard.labels.txt_356679` | "إجمالي مستحق النموذج:" | "إجمالي مستحق النموذج:" | "إجمالي مستحق النموذج:" | Validate plural rules for Arabic (zero, one, two, few, many, other) vs English/Urdu (one, other). |
| `dashboard.labels.txt_588cfc` | "إجمالي التسويات المعتمدة (Total Settlement)" | "إجمالي التسويات المعتمدة (Total Settlement)" | "إجمالي التسويات المعتمدة (Total Settlement)" | Validate plural rules for Arabic (zero, one, two, few, many, other) vs English/Urdu (one, other). |
| `dashboard.status.txt_19a7a2` | "إجمالي: ${statusMetrics.totalTrips}, المكتملة: ${statusMetrics.completedTrips}, قيد الترحيل: ${statusMetrics.inTransitTrips}." | "إجمالي: ${statusMetrics.totalTrips}, الCompletedة: ${statusMetrics.completedTrips}, قيد الترحيل: ${statusMetrics.inTransitTrips}." | "إجمالي: ${statusMetrics.totalTrips}, المکملة: ${statusMetrics.completedTrips}, قيد الترحيل: ${statusMetrics.inTransitTrips}." | Validate plural rules for Arabic (zero, one, two, few, many, other) vs English/Urdu (one, other). |
| `entityResolution.fields.txt_6014d9` | "تذكرة رقم 0123456789" | "تذكرة رقم 0123456789" | "تذكرة رقم 0123456789" | Validate plural rules for Arabic (zero, one, two, few, many, other) vs English/Urdu (one, other). |
| `entityResolution.labels.txt_22771a` | "كجم | إجمالي:" | "kg | إجمالي:" | "کلوگرام | إجمالي:" | Validate plural rules for Arabic (zero, one, two, few, many, other) vs English/Urdu (one, other). |
| `entityResolution.labels.txt_63e83a` | "إجمالي السجلات المفحوصة" | "إجمالي السجلات المفحوصة" | "إجمالي السجلات المفحوصة" | Validate plural rules for Arabic (zero, one, two, few, many, other) vs English/Urdu (one, other). |
| `exceptions.fields.refresh` | "تعارض النسخ المتفائلة (Optimistic Concurrency Clash): محاولة تحديث تذكرة الوصول بالنسخة رقم (1) بينما خادم قاعدة البيانات يحتوي النسخة رقم (2)" | "تعارض الCopy المتفائلة (Optimistic Concurrency Clash): محاولة Refresh تذكرة الوصول بالCopyة رقم (1) بينما خادم قاعدة البيانات يحتوي الCopyة رقم (2)" | "تعارض الکاپی کریں المتفائلة (Optimistic Concurrency Clash): محاولة تازہ کریں تذكرة الوصول بالکاپی کریںة رقم (1) بينما خادم قاعدة البيانات يحتوي الکاپی کریںة رقم (2)" | Validate plural rules for Arabic (zero, one, two, few, many, other) vs English/Urdu (one, other). |
| `exceptions.fields.tripWeighbridge` | "محاولة إدخال رحلة مكررة بنفس الرقم التسلسلي لتذكرة الميزان المحررة (WB-TKT-88091)" | "محاولة إدخال Trip مكررة بنفس الرقم التسلسلي لتذكرة الميزان المحررة (WB-TKT-88091)" | "محاولة إدخال ٹرپ مكررة بنفس الرقم التسلسلي لتذكرة الميزان المحررة (WB-TKT-88091)" | Validate plural rules for Arabic (zero, one, two, few, many, other) vs English/Urdu (one, other). |
| `exceptions.labels.status_5` | "تم تسجيل 3 سجلات تدقيق غير قابلة للتعديل عند (الإنشاء، بدء المراجعة، والاعتماد) مع تسجيل الحالة السابقة واللاحقة" | "تم تسجيل 3 سجلات تدقيق غير قابلة للEdit عند (الCreate، بدء المراجعة، والاعتماد) مع تسجيل Status Previousة واللاحقة" | "تم تسجيل 3 سجلات تدقيق غير قابلة للترمیم کریں عند (التخلیق کریں، بدء المراجعة، والاعتماد) مع تسجيل حالت پچھلاة واللاحقة" | Validate plural rules for Arabic (zero, one, two, few, many, other) vs English/Urdu (one, other). |
| `exceptions.labels.truck` | "غموض في مطابقة الرحلة: وجود تذكرتي ميزان صادرتين لنفس الشاحنة في نافذة زمنية متقاربة (خلال 20 دقيقة) بدون أمر تفريغ وسيط" | "غموض في مطابقة الTrip: وجود تذكرتي ميزان صادرتين لنفس Truck في نافذة زمنية متقاربة (خلال 20 دقيقة) بدون أمر تفريغ وسيط" | "غموض في مطابقة الٹرپ: وجود تذكرتي ميزان صادرتين لنفس ٹرک في نافذة زمنية متقاربة (خلال 20 دقيقة) بدون أمر تفريغ وسيط" | Validate plural rules for Arabic (zero, one, two, few, many, other) vs English/Urdu (one, other). |
| `exceptions.labels.txt_1334ce` | "لا توجد قاعدة تسعير معتمدة وسارية للناقل (CAR-ALBILAD-08) لنقل مادة الصخور البحرية (MAT-ARMOR-ROCK) للمشروع" | "لا توجد قاعدة تسعير معتمدة وسارية للناقل (CAR-ALBILAD-08) لنقل مادة الصخور البحرية (MAT-ARMOR-ROCK) للمشروع" | "لا توجد قاعدة تسعير معتمدة وسارية للناقل (CAR-ALBILAD-08) لنقل مادة الصخور البحرية (MAT-ARMOR-ROCK) للمشروع" | Validate plural rules for Arabic (zero, one, two, few, many, other) vs English/Urdu (one, other). |
| `exceptions.labels.txt_54e0a5` | "إجمالي الاستثناءات" | "إجمالي الاستثناءات" | "إجمالي الاستثناءات" | Validate plural rules for Arabic (zero, one, two, few, many, other) vs English/Urdu (one, other). |
| `exceptions.status.createSuccessError` | "تم إنشاء وتحقق سجل استثناء لكل نوع من الأنواع الـ 12 بنجاح دون أي خطأ" | "تم Create وتحقق سجل استثناء لكل نوع من الأنواع الـ 12 بSuccess دون أي Error" | "تم تخلیق کریں وتحقق سجل استثناء لكل نوع من الأنواع الـ 12 بکامیاب دون أي خرابی" | Validate plural rules for Arabic (zero, one, two, few, many, other) vs English/Urdu (one, other). |
| `imports.fields.txt_1eceb7` | "وزن إجمالي" | "وزن إجمالي" | "وزن إجمالي" | Validate plural rules for Arabic (zero, one, two, few, many, other) vs English/Urdu (one, other). |
| `imports.fields.txt_5fedb0` | "إجمالي السجلات يجب أن يكون رقمًا غير سالب" | "إجمالي السجلات يجب أن يكون رقمًا غير سالب" | "إجمالي السجلات يجب أن يكون رقمًا غير سالب" | Validate plural rules for Arabic (zero, one, two, few, many, other) vs English/Urdu (one, other). |
| `imports.labels.truckEditProject` | "تعارض حرج في العلاقة (RELATIONSHIP_CONFLICT): الشاحنة (${matchedTruck.plate}) مقيدة في السجلات المعتمدة للناقل (${registeredCarrier})، بينما الملف الوارد ينسبها للناقل (${claimedCarrier}). يمنع النظام إعادة تعيين الشاحنة أو تعديل سجلات المشروع الأساسية تلقائياً." | "تعارض حرج في العلاقة (RELATIONSHIP_CONFLICT): Truck (${matchedTruck.plate}) مقيدة في السجلات المعتمدة للناقل (${registeredCarrier})، بينما الملف الوارد ينسبها للناقل (${claimedCarrier}). يمنع النظام إعادة تعيين Truck أو Edit سجلات Project الأساسية تلقائياً." | "تعارض حرج في العلاقة (RELATIONSHIP_CONFLICT): ٹرک (${matchedTruck.plate}) مقيدة في السجلات المعتمدة للناقل (${registeredCarrier})، بينما الملف الوارد ينسبها للناقل (${claimedCarrier}). يمنع النظام إعادة تعيين ٹرک أو ترمیم کریں سجلات پروجیکٹ الأساسية تلقائياً." | Validate plural rules for Arabic (zero, one, two, few, many, other) vs English/Urdu (one, other). |
| `imports.labels.truck_7` | "الشاحنة / اللوحة (${raw}) غير مسجلة في سجلات أسطول المشروع." | "Truck / اللوحة (${raw}) غير مسجلة في سجلات أسطول Project." | "ٹرک / اللوحة (${raw}) غير مسجلة في سجلات أسطول پروجیکٹ." | Validate plural rules for Arabic (zero, one, two, few, many, other) vs English/Urdu (one, other). |
| `imports.labels.txt_27a67d` | "فارغ: ${tareKg} / إجمالي: ${grossKg}" | "فارغ: ${tareKg} / Total: ${grossKg}" | "فارغ: ${tareKg} / کل: ${grossKg}" | Validate plural rules for Arabic (zero, one, two, few, many, other) vs English/Urdu (one, other). |
| `imports.labels.txt_326cdf` | "تم وسم الصف الثاني كمكرر: ${secondRowDuplicate}، إجمالي المكرر: ${batch.rows.filter((r) => r.duplicateInfo?.isDuplicate).length}" | "تم وسم الصف الثاني كمكرر: ${secondRowDuplicate}، إجمالي المكرر: ${batch.rows.filter((r) => r.duplicateInfo?.isDuplicate).length}" | "تم وسم الصف الثاني كمكرر: ${secondRowDuplicate}، إجمالي المكرر: ${batch.rows.filter((r) => r.duplicateInfo?.isDuplicate).length}" | Validate plural rules for Arabic (zero, one, two, few, many, other) vs English/Urdu (one, other). |
| `imports.labels.txt_342ca6` | "إجمالي السجلات الأصلية المؤرشفة:" | "إجمالي السجلات الأصلية المؤرشفة:" | "إجمالي السجلات الأصلية المؤرشفة:" | Validate plural rules for Arabic (zero, one, two, few, many, other) vs English/Urdu (one, other). |
| ... | *and 116 more items in this queue* | | | |

### 1. Reason: `REPORT_EXPORT_RISK` (1405 items)

> Report column or export header requiring separation of internal data key from display label

| Key | Arabic Source | Proposed English | Proposed Urdu | Recommendation & Context |
| :--- | :--- | :--- | :--- | :--- |
| `authentication.columns.close` | "تم إغلاق نافذة تسجيل الدخول من قبل المستخدم." | "تم Close نافذة تسجيل الدخول من قبل User." | "تم بند کریں نافذة تسجيل الدخول من قبل صارف." | Ensure internal key 'close' remains untranslated; translate presentation label only. |
| `authentication.columns.txt_110c51` | "تم حظر النافذة المنبثقة من قِبل المتصفح. يُرجى السماح بالنوافذ المنبثقة." | "تم حظر النافذة المنبثقة من قِبل المتصفح. يُرجى السماح بالنوافذ المنبثقة." | "تم حظر النافذة المنبثقة من قِبل المتصفح. يُرجى السماح بالنوافذ المنبثقة." | Ensure internal key 'txt_110c51' remains untranslated; translate presentation label only. |
| `carriers.columns.carriers` | "carriers" | "carriers" | "carriers" | Ensure internal key 'carriers' remains untranslated; translate presentation label only. |
| `carriers.columns.projects` | "projects" | "projects" | "projects" | Ensure internal key 'projects' remains untranslated; translate presentation label only. |
| `carriers.fields.carrier` | "معرف الناقل (carrierId) مطلوب" | "معرف Carrier (carrierId) Required" | "معرف کیریئر (carrierId) لازمی" | Ensure internal key 'carrier' remains untranslated; translate presentation label only. |
| `carriers.fields.carrier_2` | "اسم الناقل يجب أن يتكون من 3 أحرف على الأقل" | "Carrier Name يجب أن يتكون من 3 أحرف على الأقل" | "کیریئر کا نام يجب أن يتكون من 3 أحرف على الأقل" | Ensure internal key 'carrier_2' remains untranslated; translate presentation label only. |
| `carriers.fields.commercialregistrationno` | "commercialRegistrationNo" | "commercialRegistrationNo" | "commercialRegistrationNo" | Ensure internal key 'commercialregistrationno' remains untranslated; translate presentation label only. |
| `carriers.fields.name` | "name" | "name" | "name" | Ensure internal key 'name' remains untranslated; translate presentation label only. |
| `carriers.fields.tgaLog12345` | "TGA-LOG-12345" | "TGA-LOG-12345" | "TGA-LOG-12345" | Ensure internal key 'tgaLog12345' remains untranslated; translate presentation label only. |
| `carriers.fields.txt_13dd75` | "رقم جوال التواصل" | "رقم جوال التواصل" | "رقم جوال التواصل" | Ensure internal key 'txt_13dd75' remains untranslated; translate presentation label only. |
| `carriers.fields.txt_23aacd` | "رقم السجل التجاري للناقل يجب أن يكون 10 أرقام نظامية سعودية" | "رقم السجل التجاري للناقل يجب أن يكون 10 أرقام نظامية سعودية" | "رقم السجل التجاري للناقل يجب أن يكون 10 أرقام نظامية سعودية" | Ensure internal key 'txt_23aacd' remains untranslated; translate presentation label only. |
| `carriers.fields.txt_30a77c` | "رقم السجل التجاري يجب أن يتكون من 10 أرقام" | "رقم السجل التجاري يجب أن يتكون من 10 أرقام" | "رقم السجل التجاري يجب أن يتكون من 10 أرقام" | Ensure internal key 'txt_30a77c' remains untranslated; translate presentation label only. |
| `carriers.fields.txt_4718fe` | "e.g. CAR-A أو CAR-ALRASHID-01" | "e.g. CAR-A أو CAR-ALRASHID-01" | "e.g. CAR-A أو CAR-ALRASHID-01" | Ensure internal key 'txt_4718fe' remains untranslated; translate presentation label only. |
| `carriers.fields.txt_49c361` | "رقم السجل التجاري (CR 10 أرقام)" | "رقم السجل التجاري (CR 10 أرقام)" | "رقم السجل التجاري (CR 10 أرقام)" | Ensure internal key 'txt_49c361' remains untranslated; translate presentation label only. |
| `carriers.fields.txt_49e1b2` | "فهد الرشيد" | "فهد الرشيد" | "فهد الرشيد" | Ensure internal key 'txt_49e1b2' remains untranslated; translate presentation label only. |
| `carriers.fields.txt_521cc9` | "اسم مسؤول العمليات" | "اسم مسؤول Operations" | "اسم مسؤول آپریشنز" | Ensure internal key 'txt_521cc9' remains untranslated; translate presentation label only. |
| `carriers.fields.txt_558361` | "اسم شركة النقل (carrierName) مطلوب ولا يقل عن 3 أحرف" | "اسم شركة النقل (carrierName) Required ولا يقل عن 3 أحرف" | "اسم شركة النقل (carrierName) لازمی ولا يقل عن 3 أحرف" | Ensure internal key 'txt_558361' remains untranslated; translate presentation label only. |
| `carriers.fields.txt_599d91` | "contact@carrier.sa" | "contact@carrier.sa" | "contact@carrier.sa" | Ensure internal key 'txt_599d91' remains untranslated; translate presentation label only. |
| `carriers.fields.txt_5a7cd0` | "اسم شركة أو مؤسسة النقل (carrierName)" | "اسم شركة أو مؤسسة النقل (carrierName)" | "اسم شركة أو مؤسسة النقل (carrierName)" | Ensure internal key 'txt_5a7cd0' remains untranslated; translate presentation label only. |
| `carriers.fields.txt_625f86` | "+966551234567" | "+966551234567" | "+966551234567" | Ensure internal key 'txt_625f86' remains untranslated; translate presentation label only. |
| `carriers.fields.txt_6e359d` | "رقم هاتف مسؤول التواصل غير صحيح" | "رقم هاتف مسؤول التواصل غير صحيح" | "رقم هاتف مسؤول التواصل غير صحيح" | Ensure internal key 'txt_6e359d' remains untranslated; translate presentation label only. |
| `carriers.fields.txt_777569` | "e.g. شركة الرشيد للخدمات اللوجستية والنقل" | "e.g. شركة الرشيد للخدمات اللوجستية والنقل" | "e.g. شركة الرشيد للخدمات اللوجستية والنقل" | Ensure internal key 'txt_777569' remains untranslated; translate presentation label only. |
| `dashboard.columns.prjNeomNorth01` | "PRJ-NEOM-NORTH-01" | "PRJ-NEOM-NORTH-01" | "PRJ-NEOM-NORTH-01" | Ensure internal key 'prjNeomNorth01' remains untranslated; translate presentation label only. |
| `dashboard.fields.location` | "الفارق بين وزن الموقع ووزن المقلع" | "الفارق بين وزن Location ووزن المقلع" | "الفارق بين وزن مقام ووزن المقلع" | Ensure internal key 'location' remains untranslated; translate presentation label only. |
| `dashboard.fields.price` | "العدد × السعر" | "العدد × Price" | "العدد × قیمت" | Ensure internal key 'price' remains untranslated; translate presentation label only. |
| ... | *and 1380 more items in this queue* | | | |

### 1. Reason: `BUSINESS_DATA_RISK` (832 items)

> Formulas, rates, or business calculations requiring strict identifier preservation

| Key | Arabic Source | Proposed English | Proposed Urdu | Recommendation & Context |
| :--- | :--- | :--- | :--- | :--- |
| `carriers.labels.carrier` | "معرف الناقل (${cleanId}) مسجل مسبقاً في المشروع." | "معرف Carrier (${cleanId}) مسجل مسبقاً في Project." | "معرف کیریئر (${cleanId}) مسجل مسبقاً في پروجیکٹ." | Protect financial or scale tokens: [cleanId]. |
| `carriers.labels.error` | "خطأ في بيانات الناقل: ${validation.errors.map(e => e.messageAr).join(' | ')}" | "Error في بيانات Carrier: ${validation.errors.map(e => e.messageAr).join(' | ')}" | "خرابی في بيانات کیریئر: ${validation.errors.map(e => e.messageAr).join(' | ')}" | Protect financial or scale tokens: []. |
| `carriers.labels.errorRefresh` | "خطأ في تحديث الناقل: ${validation.errors.map(e => e.messageAr).join(' | ')}" | "Error في Refresh Carrier: ${validation.errors.map(e => e.messageAr).join(' | ')}" | "خرابی في تازہ کریں کیریئر: ${validation.errors.map(e => e.messageAr).join(' | ')}" | Protect financial or scale tokens: []. |
| `carriers.labels.txt_5ee946` | "الخطوة 3: شركات النقل والناقلين المعتمدين (Carriers)" | "الخطوة 3: شركات النقل وCarrierين المعتمدين (Carriers)" | "الخطوة 3: شركات النقل وکیریئرين المعتمدين (Carriers)" | Protect financial or scale tokens: []. |
| `dashboard.labels.download_3` | "أطنان التحميل" | "tons التحميل" | "ٹن التحميل" | Protect financial or scale tokens: [TON]. |
| `dashboard.labels.filter` | "تم تصفية البيانات بدقة: حصل مدير نيوم على رحلات نيوم فقط (${neomRes.trips.length} رحلة) وتم حجب مشروع البحر الأحمر نهائياً." | "تم Filter البيانات بدقة: حصل مدير نيوم على رحلات نيوم فقط (${neomRes.trips.length} Trip) وتم حجب مشروع البحر الأحمر نهائياً." | "تم فلٹر کریں البيانات بدقة: حصل مدير نيوم على رحلات نيوم فقط (${neomRes.trips.length} ٹرپ) وتم حجب مشروع البحر الأحمر نهائياً." | Protect financial or scale tokens: []. |
| `dashboard.labels.pricing_3` | "توزيع نماذج التسعير التعاقدية (Pricing Distribution: PER_TRIP vs PER_TON)" | "توزيع نماذج التسعير التعاقدية (Pricing Distribution: PER_TRIP vs PER_TON)" | "توزيع نماذج التسعير التعاقدية (Pricing Distribution: PER_TRIP vs PER_TON)" | Protect financial or scale tokens: []. |
| `dashboard.labels.pricing_5` | "تم توزيع ${matDist.length} مواد، ونموذجي التسعير (PER_TRIP و PER_TON) بنسبة 100%." | "تم توزيع ${matDist.length} مواد، ونموذجي التسعير (PER_TRIP و PER_TON) بنسبة 100%." | "تم توزيع ${matDist.length} مواد، ونموذجي التسعير (PER_TRIP و PER_TON) بنسبة 100%." | Protect financial or scale tokens: []. |
| `dashboard.labels.projects_10` | "تم السماح لمدير العمليات العام بالوصول لـ ${superRes.trips.length} رحلات من مختلف المشاريع بدون حجب." | "تم السماح لمدير Operations العام بالوصول لـ ${superRes.trips.length} رحلات من مختلف Projects بدون حجب." | "تم السماح لمدير آپریشنز العام بالوصول لـ ${superRes.trips.length} رحلات من مختلف پروجیکٹس بدون حجب." | Protect financial or scale tokens: []. |
| `dashboard.labels.trip_4` | "رحلة بالطن" | "Trip بالton" | "ٹرپ بالٹن" | Protect financial or scale tokens: [TON]. |
| `dashboard.labels.txt_125b36` | "بطاقات الأوزان وتفاوت الموازين (Tonnage & Weighbridge Variance)" | "بطاقات الأوزان وتفاوت الموازين (Tonnage & Weighbridge Variance)" | "بطاقات الأوزان وتفاوت الموازين (Tonnage & Weighbridge Variance)" | Protect financial or scale tokens: []. |
| `dashboard.labels.txt_1bf649` | "أوزان التحميل: ${tonMetrics.totalLoadedTons} طن، الاستلام: ${tonMetrics.totalReceivedTons} طن، الفارق: ${tonMetrics.totalVarianceTons} طن." | "أوزان التحميل: ${tonMetrics.totalLoadedTons} ton، الاستلام: ${tonMetrics.totalReceivedTons} ton، الفارق: ${tonMetrics.totalVarianceTons} ton." | "أوزان التحميل: ${tonMetrics.totalLoadedTons} ٹن، الاستلام: ${tonMetrics.totalReceivedTons} ٹن، الفارق: ${tonMetrics.totalVarianceTons} ٹن." | Protect financial or scale tokens: [TON]. |
| `dashboard.labels.txt_209b00` | "تم رصد محاولة وصول لمشروع غير مصرح به وإرجاع مصفوفة فارغة مع تفعيل علامة الانتهاك الأمني." | "تم رصد محاولة وصول لمشروع غير مصرح به وإرجاع مصفوفة فارغة مع تفعيل علامة الانتهاك الأمني." | "تم رصد محاولة وصول لمشروع غير مصرح به وإرجاع مصفوفة فارغة مع تفعيل علامة الانتهاك الأمني." | Protect financial or scale tokens: []. |
| `dashboard.labels.txt_27a436` | "ضمن نسبة التسامح (±1%)" | "ضمن نسبة التسامح (±1%)" | "ضمن نسبة التسامح (±1%)" | Protect financial or scale tokens: []. |
| `dashboard.labels.txt_368ced` | "ثبات لقطات التسوية ومطابقة PER_TRIP و PER_TON" | "ثبات لقطات التسوية ومطابقة PER_TRIP و PER_TON" | "ثبات لقطات التسوية ومطابقة PER_TRIP و PER_TON" | Protect financial or scale tokens: []. |
| `dashboard.labels.txt_3b0cf8` | "المستحقات (ر.س)" | "المستحقات (SAR)" | "المستحقات (سعودی ریال)" | Protect financial or scale tokens: [SAR]. |
| `dashboard.labels.txt_5049eb` | "0.00 ر.س" | "0.00 SAR" | "0.00 سعودی ریال" | Protect financial or scale tokens: [SAR]. |
| `dashboard.labels.txt_633cee` | "كافة فحوصات الأمان والعمليات ناجحة بنسبة 100%" | "كافة فحوصات الأمان وOperations ناجحة بنسبة 100%" | "كافة فحوصات الأمان وآپریشنز ناجحة بنسبة 100%" | Protect financial or scale tokens: []. |
| `dashboard.labels.txt_6ab017` | "عقود الطن المتري (PER_TON)" | "عقود الton المتري (PER_TON)" | "عقود الٹن المتري (PER_TON)" | Protect financial or scale tokens: [TON]. |
| `dashboard.labels.txt_6cd5a8` | "بطاقات الأوزان (Tonnage & Variance Cards)" | "بطاقات الأوزان (Tonnage & Variance Cards)" | "بطاقات الأوزان (Tonnage & Variance Cards)" | Protect financial or scale tokens: []. |
| `dashboard.labels.txt_6f8552` | "الكل (PER_TRIP + PER_TON)" | "All (PER_TRIP + PER_TON)" | "تمام (PER_TRIP + PER_TON)" | Protect financial or scale tokens: []. |
| `dashboard.labels.txt_7ef999` | "الأطنان" | "الtons" | "الٹن" | Protect financial or scale tokens: [TON]. |
| `dashboard.labels.txt_b1749a` | "تسويات الأطنان (Ton-based Settlement)" | "تسويات الtons (Ton-based Settlement)" | "تسويات الٹن (Ton-based Settlement)" | Protect financial or scale tokens: [TON]. |
| `dashboard.status.success` | "تم تجميع الأداء بنجاح لـ ${carrierPerf.length} ناقلين." | "تم تجميع الأداء بSuccess لـ ${carrierPerf.length} ناقلين." | "تم تجميع الأداء بکامیاب لـ ${carrierPerf.length} ناقلين." | Protect financial or scale tokens: []. |
| `dashboard.status.trips` | "تم ترتيب الرحلات النشطة قيد الترحيل في مقدمة لوحة البوابات الحية." | "تم ترتيب Trips الActiveة قيد الترحيل في مقدمة لوحة البوابات الحية." | "تم ترتيب ٹرپس الفعالة قيد الترحيل في مقدمة لوحة البوابات الحية." | Protect financial or scale tokens: []. |
| ... | *and 807 more items in this queue* | | | |

### 1. Reason: `LOW_CONFIDENCE` (6185 items)

> Ambiguous or composite phrases generated with low statistical confidence

| Key | Arabic Source | Proposed English | Proposed Urdu | Recommendation & Context |
| :--- | :--- | :--- | :--- | :--- |
| `authentication.labels.lucideReact` | "lucide-react" | "lucide-react" | "lucide-react" | Review phrasing carefully; replace with verified domain phrase if needed. |
| `authentication.labels.noReferrer` | "no-referrer" | "no-referrer" | "no-referrer" | Review phrasing carefully; replace with verified domain phrase if needed. |
| `authentication.labels.react` | "react" | "react" | "react" | Review phrasing carefully; replace with verified domain phrase if needed. |
| `authentication.labels.selectAccount` | "select_account" | "select_account" | "select_account" | Review phrasing carefully; replace with verified domain phrase if needed. |
| `authentication.labels.txt_3548e6` | "متصل بـ Firestore" | "متصل بـ Firestore" | "متصل بـ Firestore" | Review phrasing carefully; replace with verified domain phrase if needed. |
| `authentication.labels.txt_413ffd` | "تسجيل الدخول (Google)" | "تسجيل الدخول (Google)" | "تسجيل الدخول (Google)" | Review phrasing carefully; replace with verified domain phrase if needed. |
| `authentication.labels.txt_49cb21` | "جاري تهيئة التحقق..." | "جاري تهيئة التحقق..." | "جاري تهيئة التحقق..." | Review phrasing carefully; replace with verified domain phrase if needed. |
| `authentication.labels.txt_6c5c6c` | "مستخدم مسجل" | "مستخدم مسجل" | "مستخدم مسجل" | Review phrasing carefully; replace with verified domain phrase if needed. |
| `authentication.labels.txt_b1a849` | "تسجيل الخروج" | "تسجيل الخروج" | "تسجيل الخروج" | Review phrasing carefully; replace with verified domain phrase if needed. |
| `authentication.labels.user` | "User" | "User" | "User" | Review phrasing carefully; replace with verified domain phrase if needed. |
| `authentication.status.failed` | "فشل تسجيل الدخول عبر Google." | "Failed تسجيل الدخول عبر Google." | "ناکام تسجيل الدخول عبر Google." | Review phrasing carefully; replace with verified domain phrase if needed. |
| `authentication.status.failed_2` | "فشل تسجيل الخروج." | "Failed تسجيل الخروج." | "ناکام تسجيل الخروج." | Review phrasing carefully; replace with verified domain phrase if needed. |
| `carriers.labels.carrier_2` | "معرف الناقل (carrierId)" | "معرف Carrier (carrierId)" | "معرف کیریئر (carrierId)" | Review phrasing carefully; replace with verified domain phrase if needed. |
| `carriers.labels.carrier_3` | "تسجيل الناقل" | "تسجيل Carrier" | "تسجيل کیریئر" | Review phrasing carefully; replace with verified domain phrase if needed. |
| `carriers.labels.carriers` | "carriers" | "carriers" | "carriers" | Review phrasing carefully; replace with verified domain phrase if needed. |
| `carriers.labels.createdat` | "createdAt" | "createdAt" | "createdAt" | Review phrasing carefully; replace with verified domain phrase if needed. |
| `carriers.labels.createdby` | "createdBy" | "createdBy" | "createdBy" | Review phrasing carefully; replace with verified domain phrase if needed. |
| `carriers.labels.editCarrier` | "تعديل بيانات الناقل" | "Edit بيانات Carrier" | "ترمیم کریں بيانات کیریئر" | Review phrasing carefully; replace with verified domain phrase if needed. |
| `carriers.labels.lucideReact` | "lucide-react" | "lucide-react" | "lucide-react" | Review phrasing carefully; replace with verified domain phrase if needed. |
| `carriers.labels.materialsProject` | "حدد الناقلين المصرح لهم بنقل وتوريد المواد في هذا المشروع (مثل Carrier A، Carrier B، Carrier C)." | "حدد Carrierين المصرح لهم بنقل وتوريد Materials في هذا Project (مثل Carrier A، Carrier B، Carrier C)." | "حدد کیریئرين المصرح لهم بنقل وتوريد مٹیریلز في هذا پروجیکٹ (مثل Carrier A، Carrier B، Carrier C)." | Review phrasing carefully; replace with verified domain phrase if needed. |
| `carriers.labels.project` | "تسجيل ناقل جديد في المشروع" | "تسجيل ناقل جديد في Project" | "تسجيل ناقل جديد في پروجیکٹ" | Review phrasing carefully; replace with verified domain phrase if needed. |
| `carriers.labels.project_2` | "لا يوجد ناقلون مسجلون في المشروع حتى الآن." | "لا يوجد ناقلون مسجلون في Project حتى الآن." | "لا يوجد ناقلون مسجلون في پروجیکٹ حتى الآن." | Review phrasing carefully; replace with verified domain phrase if needed. |
| `carriers.labels.projects` | "projects" | "projects" | "projects" | Review phrasing carefully; replace with verified domain phrase if needed. |
| `carriers.labels.react` | "react" | "react" | "react" | Review phrasing carefully; replace with verified domain phrase if needed. |
| `carriers.labels.trucksPricing` | "معرف وحيد للربط مع الشاحنات وقواعد التسعير" | "معرف وحيد للربط مع Trucks وقواعد التسعير" | "معرف وحيد للربط مع ٹرکس وقواعد التسعير" | Review phrasing carefully; replace with verified domain phrase if needed. |
| ... | *and 6160 more items in this queue* | | | |

