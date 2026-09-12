# Enterprise Logistics Controlled Terminology Glossary (BLOCK 43)

This glossary defines the canonical domain vocabulary for Saudi heavy transport and logistics operations.
It enforces operational terminology over literal translations (e.g. "تحميل" as operational Loading vs Download).

## Canonical Terminology Summary (30 Standardized Terms)

| Domain | Arabic Source | Canonical English | Canonical Urdu | Allowed Synonyms | Forbidden Alternatives |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `trips` | "إرسال الرحلة" | **Trip Dispatch** | **ٹرپ ڈسپیچ** | Dispatch Trip, Trip Outbound | ⚠️ *Send Trip, Trip Mailing* |
| `trips` | "في الطريق" | **In Transit** | **راستے میں** | On Road, In Route | ⚠️ *In Way, Walking* |
| `trips` | "مكتملة" | **Completed** | **مکمل شدہ** | Finished, Reconciled | ⚠️ *Done, Ended* |
| `trips` | "دورة حياة الرحلة" | **Trip Lifecycle** | **ٹرپ کا لائف سائیکل** | Trip Workflow | ⚠️ *Trip Age, Trip Period* |
| `loading` | "محطة التحميل" | **Loading Station** | **لوڈنگ اسٹیشن** | Origin Station, Loading Site | ⚠️ *Download Station, Uploading Site* |
| `loading` | "تحميل" | **Loading** | **لوڈنگ** | Material Loading, Truck Loading | ⚠️ *Download, Upload, Fetch* |
| `loading` | "تذكرة التحميل" | **Loading Ticket** | **لوڈنگ پرچی** | Loading Slip, Intake Ticket | ⚠️ *Download Coupon, Admission Ticket* |
| `unloading` | "محطة التفريغ" | **Unloading Station** | **ان لوڈنگ اسٹیشن** | Destination Site, Discharge Station | ⚠️ *Emptying Station, Dumping Place* |
| `unloading` | "تفريغ" | **Unloading** | **ان لوڈنگ** | Discharge, Material Unloading | ⚠️ *Emptying, Dumping, Clearing* |
| `weighbridge` | "الوزن الإجمالي" | **Gross Weight** | **مجموعی وزن** | Gross Scale Weight, Total Weight | ⚠️ *Big Weight, Full Weight* |
| `weighbridge` | "الوزن الفارغ" | **Tare Weight** | **خالی وزن** | Tare Scale Weight, Empty Truck Weight | ⚠️ *Blank Weight, Zero Weight* |
| `weighbridge` | "الوزن الصافي" | **Net Weight** | **خالص وزن** | Cargo Weight, Payload Net Weight | ⚠️ *Clear Weight, Clean Weight* |
| `weighbridge` | "الميزان" | **Weighbridge** | **وی برج (کانٹا)** | Truck Scale, Weigh Scale | ⚠️ *Balance, Equilibrium* |
| `imports` | "دفعة الاستيراد" | **Import Batch** | **امپورٹ بیچ** | Ingestion Batch | ⚠️ *Bring Group, Import Heap* |
| `imports` | "مطابقة الأعمدة" | **Column Mapping** | **کالموں کی مطابقت** | Header Alignment, Field Mapping | ⚠️ *Column Matching, Pillar Game* |
| `entityResolution` | "مطابقة الكيانات" | **Entity Resolution** | **ہستی کا حل (Entity Resolution)** | Entity Matching, Record Disambiguation | ⚠️ *Body Agreement, Unit Solution* |
| `entityResolution` | "مطابقة تقريبية" | **Fuzzy Match** | **قیاسی مطابقت** | Approximate Match | ⚠️ *Hairy Match, Vague Link* |
| `pricing` | "سعر الطن" | **Rate per Ton** | **فی ٹن ریٹ** | Ton Rate, Price per Ton | ⚠️ *Heavy Price, Ton Costing* |
| `pricing` | "التسوية المالية" | **Financial Settlement** | **مالیاتی تصفیہ** | Billing Settlement, Financial Reconciliation | ⚠️ *Money Agreement, Peace Deal* |
| `pricing` | "غرامة التأخير" | **Demurrage** | **ڈیمرج (تاخیری ہرجانہ)** | Detention Fee, Delay Penalty | ⚠️ *Late Fine, Slow Tax* |
| `reports` | "الملخص اليومي" | **Daily Summary** | **روزانہ کا خلاصہ** | Daily Report, Daily Operational Overview | ⚠️ *Day Resume, 24h Total* |
| `reports` | "تحليل الفروقات" | **Variance Analysis** | **فرق کا تجزیہ** | Discrepancy Report, Weight Variance | ⚠️ *Different Study, Change Split* |
| `security` | "سجل التدقيق الأمني" | **Security Audit Log** | **سیکیورٹی آڈٹ لاگ** | Audit Trail, Security Event Log | ⚠️ *Police Register, Watch Paper* |
| `security` | "التحكم بالوصول المبني على الأدوار" | **Role-Based Access Control** | **کردار پر مبنی رسائی کا کنٹرول** | RBAC, Role Permissions | ⚠️ *Actor Entry, Stage Pass* |
| `offline` | "صندوق الإرسال غير المتصل" | **Offline Outbox** | **آف لائن آؤٹ باکس** | Offline Sync Queue, Pending Outbox | ⚠️ *Disconnected Box, Lost Mail* |
| `offline` | "معالجة التعارض" | **Conflict Resolution** | **تنازعات کا حل** | Dispute Resolution, Version Reconciliation | ⚠️ *Fight Calming, Clash Stop* |
| `exceptions` | "فارق وزن استثنائي" | **Weight Discrepancy Exception** | **وزن کے فرق کا استثنیٰ** | Weight Tolerance Exceeded, Scale Discrepancy | ⚠️ *Wrong Heavy Case, Scale Weirdness* |
| `exceptions` | "مسار اعتماد الاستثناء" | **Exception Approval Workflow** | **استثنیٰ کی منظوری کا مرحلہ** | Override Workflow, Discrepancy Sign-Off | ⚠️ *Permit Run, Pardon Way* |
| `legacyMigration` | "مسار ترحيل الجداول القديمة" | **Legacy Sheet Migration Pipeline** | **پرانی شیٹس کی منتقلی کا پائپ لائن** | Historical Data Import, Legacy Ingestion | ⚠️ *Old Table Push, Ancient Spread* |
| `legacyMigration` | "معمارية العشرين عموداً" | **20-Column Architecture** | **بیس کالمز کی معماریت** | 20-Field Legacy Structure | ⚠️ *Twenty Pillars, Post Score 20* |

## Detailed Domain Descriptions & Disambiguation Rules

### `trips.dispatch` (trips)
- **Arabic Source:** "إرسال الرحلة"
- **Canonical English:** Trip Dispatch
- **Canonical Urdu:** ٹرپ ڈسپیچ
- **Operational Notes:** Operational dispatch of a truck from source
- **Allowed Synonyms (EN):** Dispatch Trip, Trip Outbound
- **Allowed Synonyms (UR):** ٹرپ روانگی
- **Forbidden Alternatives (EN):** Send Trip, Trip Mailing
- **Forbidden Alternatives (UR):** ٹرپ بھیجنا

### `trips.status.in_transit` (trips)
- **Arabic Source:** "في الطريق"
- **Canonical English:** In Transit
- **Canonical Urdu:** راستے میں
- **Operational Notes:** Trip active on the road between loading and unloading stations
- **Allowed Synonyms (EN):** On Road, In Route
- **Allowed Synonyms (UR):** سفر میں
- **Forbidden Alternatives (EN):** In Way, Walking
- **Forbidden Alternatives (UR):** چل رہا ہے

### `trips.status.completed` (trips)
- **Arabic Source:** "مكتملة"
- **Canonical English:** Completed
- **Canonical Urdu:** مکمل شدہ
- **Operational Notes:** Trip fully reconciled and finished
- **Allowed Synonyms (EN):** Finished, Reconciled
- **Allowed Synonyms (UR):** مکمل
- **Forbidden Alternatives (EN):** Done, Ended
- **Forbidden Alternatives (UR):** ختم

### `trips.lifecycle` (trips)
- **Arabic Source:** "دورة حياة الرحلة"
- **Canonical English:** Trip Lifecycle
- **Canonical Urdu:** ٹرپ کا لائف سائیکل
- **Operational Notes:** Finite state machine stages of a heavy transport trip
- **Allowed Synonyms (EN):** Trip Workflow
- **Allowed Synonyms (UR):** ٹرپ کے مراحل
- **Forbidden Alternatives (EN):** Trip Age, Trip Period
- **Forbidden Alternatives (UR):** ٹرپ کی زندگی

### `loading.station` (loading)
- **Arabic Source:** "محطة التحميل"
- **Canonical English:** Loading Station
- **Canonical Urdu:** لوڈنگ اسٹیشن
- **Operational Notes:** Physical origin site where aggregate is loaded into dump trucks
- **Allowed Synonyms (EN):** Origin Station, Loading Site
- **Allowed Synonyms (UR):** باربرداری کا مقام
- **Forbidden Alternatives (EN):** Download Station, Uploading Site
- **Forbidden Alternatives (UR):** ڈاؤن لوڈ اسٹیشن

### `loading.action` (loading)
- **Arabic Source:** "تحميل"
- **Canonical English:** Loading
- **Canonical Urdu:** لوڈنگ
- **Operational Notes:** Operational material loading into vehicle (NEVER file download)
- **Allowed Synonyms (EN):** Material Loading, Truck Loading
- **Allowed Synonyms (UR):** باربرداری, مال لادنا
- **Forbidden Alternatives (EN):** Download, Upload, Fetch
- **Forbidden Alternatives (UR):** ڈاؤن لوڈ, فائل وصول کرنا

### `loading.ticket` (loading)
- **Arabic Source:** "تذكرة التحميل"
- **Canonical English:** Loading Ticket
- **Canonical Urdu:** لوڈنگ پرچی
- **Operational Notes:** Official scale/intake ticket issued upon origin loading
- **Allowed Synonyms (EN):** Loading Slip, Intake Ticket
- **Allowed Synonyms (UR):** لوڈنگ ٹکٹ
- **Forbidden Alternatives (EN):** Download Coupon, Admission Ticket
- **Forbidden Alternatives (UR):** ڈاؤن لوڈ پاس

### `unloading.station` (unloading)
- **Arabic Source:** "محطة التفريغ"
- **Canonical English:** Unloading Station
- **Canonical Urdu:** ان لوڈنگ اسٹیشن
- **Operational Notes:** Physical destination facility where aggregate is unloaded
- **Allowed Synonyms (EN):** Destination Site, Discharge Station
- **Allowed Synonyms (UR):** تخلیص بار اسٹیشن, مال اتارنے کا مقام
- **Forbidden Alternatives (EN):** Emptying Station, Dumping Place
- **Forbidden Alternatives (UR):** خالی کرنے کا کمرہ

### `unloading.action` (unloading)
- **Arabic Source:** "تفريغ"
- **Canonical English:** Unloading
- **Canonical Urdu:** ان لوڈنگ
- **Operational Notes:** Operational aggregate dumping and weighbridge verification at destination
- **Allowed Synonyms (EN):** Discharge, Material Unloading
- **Allowed Synonyms (UR):** مال اتارنا, تخلیص بار
- **Forbidden Alternatives (EN):** Emptying, Dumping, Clearing
- **Forbidden Alternatives (UR):** مٹا دینا

### `weighbridge.gross_weight` (weighbridge)
- **Arabic Source:** "الوزن الإجمالي"
- **Canonical English:** Gross Weight
- **Canonical Urdu:** مجموعی وزن
- **Operational Notes:** Weight of truck plus aggregate payload
- **Allowed Synonyms (EN):** Gross Scale Weight, Total Weight
- **Allowed Synonyms (UR):** کل وزن
- **Forbidden Alternatives (EN):** Big Weight, Full Weight
- **Forbidden Alternatives (UR):** بڑا وزن

### `weighbridge.tare_weight` (weighbridge)
- **Arabic Source:** "الوزن الفارغ"
- **Canonical English:** Tare Weight
- **Canonical Urdu:** خالی وزن
- **Operational Notes:** Weight of empty truck without cargo
- **Allowed Synonyms (EN):** Tare Scale Weight, Empty Truck Weight
- **Allowed Synonyms (UR):** گاڑی کا خالی وزن
- **Forbidden Alternatives (EN):** Blank Weight, Zero Weight
- **Forbidden Alternatives (UR):** صفر وزن

### `weighbridge.net_weight` (weighbridge)
- **Arabic Source:** "الوزن الصافي"
- **Canonical English:** Net Weight
- **Canonical Urdu:** خالص وزن
- **Operational Notes:** Gross Weight minus Tare Weight (used for billing and billing volume)
- **Allowed Synonyms (EN):** Cargo Weight, Payload Net Weight
- **Allowed Synonyms (UR):** صافی وزن
- **Forbidden Alternatives (EN):** Clear Weight, Clean Weight
- **Forbidden Alternatives (UR):** صاف ستھرا وزن

### `weighbridge.scale` (weighbridge)
- **Arabic Source:** "الميزان"
- **Canonical English:** Weighbridge
- **Canonical Urdu:** وی برج (کانٹا)
- **Operational Notes:** Heavy vehicle truck platform scale
- **Allowed Synonyms (EN):** Truck Scale, Weigh Scale
- **Allowed Synonyms (UR):** کانٹا, وزن کا ترازو
- **Forbidden Alternatives (EN):** Balance, Equilibrium
- **Forbidden Alternatives (UR):** توازن

### `imports.batch` (imports)
- **Arabic Source:** "دفعة الاستيراد"
- **Canonical English:** Import Batch
- **Canonical Urdu:** امپورٹ بیچ
- **Operational Notes:** Batch intake of spreadsheet rows for bulk trips
- **Allowed Synonyms (EN):** Ingestion Batch
- **Allowed Synonyms (UR):** درآمدی کھیپ
- **Forbidden Alternatives (EN):** Bring Group, Import Heap
- **Forbidden Alternatives (UR):** لانے کا گروہ

### `imports.column_mapping` (imports)
- **Arabic Source:** "مطابقة الأعمدة"
- **Canonical English:** Column Mapping
- **Canonical Urdu:** کالموں کی مطابقت
- **Operational Notes:** Mapping spreadsheet headers to canonical system fields
- **Allowed Synonyms (EN):** Header Alignment, Field Mapping
- **Allowed Synonyms (UR):** کالم میپنگ
- **Forbidden Alternatives (EN):** Column Matching, Pillar Game
- **Forbidden Alternatives (UR):** ستون ملانا

### `entity_resolution.disambiguation` (entityResolution)
- **Arabic Source:** "مطابقة الكيانات"
- **Canonical English:** Entity Resolution
- **Canonical Urdu:** ہستی کا حل (Entity Resolution)
- **Operational Notes:** Resolving noisy text strings to registered master records (Trucks, Carriers, Drivers)
- **Allowed Synonyms (EN):** Entity Matching, Record Disambiguation
- **Allowed Synonyms (UR):** اندراجات کی شناخت
- **Forbidden Alternatives (EN):** Body Agreement, Unit Solution
- **Forbidden Alternatives (UR):** جسمانی حل

### `entity_resolution.fuzzy_match` (entityResolution)
- **Arabic Source:** "مطابقة تقريبية"
- **Canonical English:** Fuzzy Match
- **Canonical Urdu:** قیاسی مطابقت
- **Operational Notes:** Algorithmic string distance matching (Levenshtein / Jaro-Winkler)
- **Allowed Synonyms (EN):** Approximate Match
- **Allowed Synonyms (UR):** اندازاً مماثلت
- **Forbidden Alternatives (EN):** Hairy Match, Vague Link
- **Forbidden Alternatives (UR):** دھندلی کڑی

### `pricing.rate_per_ton` (pricing)
- **Arabic Source:** "سعر الطن"
- **Canonical English:** Rate per Ton
- **Canonical Urdu:** فی ٹن ریٹ
- **Operational Notes:** Contractual fee unit per metric ton delivered
- **Allowed Synonyms (EN):** Ton Rate, Price per Ton
- **Allowed Synonyms (UR):** فی ٹن قیمت
- **Forbidden Alternatives (EN):** Heavy Price, Ton Costing
- **Forbidden Alternatives (UR):** بھاری دام

### `pricing.settlement` (pricing)
- **Arabic Source:** "التسوية المالية"
- **Canonical English:** Financial Settlement
- **Canonical Urdu:** مالیاتی تصفیہ
- **Operational Notes:** Contractual financial clearing of trips between client and carrier
- **Allowed Synonyms (EN):** Billing Settlement, Financial Reconciliation
- **Allowed Synonyms (UR):** حساب کتاب
- **Forbidden Alternatives (EN):** Money Agreement, Peace Deal
- **Forbidden Alternatives (UR):** صلح نامہ

### `pricing.demurrage` (pricing)
- **Arabic Source:** "غرامة التأخير"
- **Canonical English:** Demurrage
- **Canonical Urdu:** ڈیمرج (تاخیری ہرجانہ)
- **Operational Notes:** Hourly or daily penalty for truck detention beyond contractual wait time
- **Allowed Synonyms (EN):** Detention Fee, Delay Penalty
- **Allowed Synonyms (UR):** تاخیری جرمانہ
- **Forbidden Alternatives (EN):** Late Fine, Slow Tax
- **Forbidden Alternatives (UR):** سستی کی سزا

### `reports.daily_summary` (reports)
- **Arabic Source:** "الملخص اليومي"
- **Canonical English:** Daily Summary
- **Canonical Urdu:** روزانہ کا خلاصہ
- **Operational Notes:** Aggregated operational metrics for 24-hour cycle
- **Allowed Synonyms (EN):** Daily Report, Daily Operational Overview
- **Allowed Synonyms (UR):** یومیہ رپورٹ
- **Forbidden Alternatives (EN):** Day Resume, 24h Total
- **Forbidden Alternatives (UR):** دن کا احوال

### `reports.variance_analysis` (reports)
- **Arabic Source:** "تحليل الفروقات"
- **Canonical English:** Variance Analysis
- **Canonical Urdu:** فرق کا تجزیہ
- **Operational Notes:** Statistical disparity between loading weight and unloading weight
- **Allowed Synonyms (EN):** Discrepancy Report, Weight Variance
- **Allowed Synonyms (UR):** فروقات کی جانچ
- **Forbidden Alternatives (EN):** Different Study, Change Split
- **Forbidden Alternatives (UR):** تبدیلی کا جائزہ

### `security.audit_log` (security)
- **Arabic Source:** "سجل التدقيق الأمني"
- **Canonical English:** Security Audit Log
- **Canonical Urdu:** سیکیورٹی آڈٹ لاگ
- **Operational Notes:** Immutable record of security and administrative actions
- **Allowed Synonyms (EN):** Audit Trail, Security Event Log
- **Allowed Synonyms (UR):** حفاظتی جانچ پڑتال کا لاگ
- **Forbidden Alternatives (EN):** Police Register, Watch Paper
- **Forbidden Alternatives (UR):** چوکی کی کاپی

### `security.rbac` (security)
- **Arabic Source:** "التحكم بالوصول المبني على الأدوار"
- **Canonical English:** Role-Based Access Control
- **Canonical Urdu:** کردار پر مبنی رسائی کا کنٹرول
- **Operational Notes:** Granular permissions mapped to user roles (Admin, Dispatcher, Viewer)
- **Allowed Synonyms (EN):** RBAC, Role Permissions
- **Allowed Synonyms (UR):** اختیارات برائے عہدہ
- **Forbidden Alternatives (EN):** Actor Entry, Stage Pass
- **Forbidden Alternatives (UR):** اداکار کا داخلہ

### `offline.outbox` (offline)
- **Arabic Source:** "صندوق الإرسال غير المتصل"
- **Canonical English:** Offline Outbox
- **Canonical Urdu:** آف لائن آؤٹ باکس
- **Operational Notes:** IndexedDB persistent queue of trip mutations awaiting cloud synchronization
- **Allowed Synonyms (EN):** Offline Sync Queue, Pending Outbox
- **Allowed Synonyms (UR):** زیر التواء ترسیل
- **Forbidden Alternatives (EN):** Disconnected Box, Lost Mail
- **Forbidden Alternatives (UR):** کھویا ہوا ڈبہ

### `offline.conflict_resolution` (offline)
- **Arabic Source:** "معالجة التعارض"
- **Canonical English:** Conflict Resolution
- **Canonical Urdu:** تنازعات کا حل
- **Operational Notes:** Resolving concurrent mutations between offline clients and server
- **Allowed Synonyms (EN):** Dispute Resolution, Version Reconciliation
- **Allowed Synonyms (UR):** اختلاف کی یکسوئی
- **Forbidden Alternatives (EN):** Fight Calming, Clash Stop
- **Forbidden Alternatives (UR):** لڑائی کا خاتمہ

### `exceptions.weight_discrepancy` (exceptions)
- **Arabic Source:** "فارق وزن استثنائي"
- **Canonical English:** Weight Discrepancy Exception
- **Canonical Urdu:** وزن کے فرق کا استثنیٰ
- **Operational Notes:** Operational alert triggered when Net In and Net Out exceed tolerance threshold
- **Allowed Synonyms (EN):** Weight Tolerance Exceeded, Scale Discrepancy
- **Allowed Synonyms (UR):** غیر معمولی وزنی فرق
- **Forbidden Alternatives (EN):** Wrong Heavy Case, Scale Weirdness
- **Forbidden Alternatives (UR):** عجیب وزن

### `exceptions.approval_workflow` (exceptions)
- **Arabic Source:** "مسار اعتماد الاستثناء"
- **Canonical English:** Exception Approval Workflow
- **Canonical Urdu:** استثنیٰ کی منظوری کا مرحلہ
- **Operational Notes:** Managerial sign-off flow for out-of-spec trips
- **Allowed Synonyms (EN):** Override Workflow, Discrepancy Sign-Off
- **Allowed Synonyms (UR):** منظوری کا لائحہ عمل
- **Forbidden Alternatives (EN):** Permit Run, Pardon Way
- **Forbidden Alternatives (UR):** معافی کا راستہ

### `legacy_migration.sheet_pipeline` (legacyMigration)
- **Arabic Source:** "مسار ترحيل الجداول القديمة"
- **Canonical English:** Legacy Sheet Migration Pipeline
- **Canonical Urdu:** پرانی شیٹس کی منتقلی کا پائپ لائن
- **Operational Notes:** Pipeline that transforms unnormalized historical sheets into multi-project records
- **Allowed Synonyms (EN):** Historical Data Import, Legacy Ingestion
- **Allowed Synonyms (UR):** تاریخی ڈیٹا کی منتقلی
- **Forbidden Alternatives (EN):** Old Table Push, Ancient Spread
- **Forbidden Alternatives (UR):** پرانی میز

### `legacy_migration.twenty_columns` (legacyMigration)
- **Arabic Source:** "معمارية العشرين عموداً"
- **Canonical English:** 20-Column Architecture
- **Canonical Urdu:** بیس کالمز کی معماریت
- **Operational Notes:** The standardized schema structure for unnormalized Saudi heavy-transport sheets
- **Allowed Synonyms (EN):** 20-Field Legacy Structure
- **Allowed Synonyms (UR):** 20 کالم فارمیٹ
- **Forbidden Alternatives (EN):** Twenty Pillars, Post Score 20
- **Forbidden Alternatives (UR):** بیس کھمبے

