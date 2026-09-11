# Q Saudi Work Follow — مواصفة الأمان وهندسة الحماية المتعددة (Defense in Depth Security Specification)
## BLOCK 38 — Security Hardening, Project Membership & Production Firestore Rules

---

## 1. فلسفة الأمان: الحماية المتعددة الطبقات (Defense in Depth)

لا يعتمد النظام على حماية واجهة المستخدم (UI Layer) أو طبقة الخدمات (Service Layer) فقط.
يتم فرض الأمان عبر مسار هرمي صارم من أربع طبقات:
1. **الطبقة 1: التوثيق والهوية (Authentication & Token Verification):** التحقق من الرمز المميز `request.auth` وتطابق هوية المستخدم.
2. **الطبقة 2: عزل المستأجرين والمشاريع (Project Membership & Tenant Isolation):** التحقق الحتمي من عضوية المستخدم في المشروع المستهدف `isProjectMember(projectId)` لمنع هجمات IDOR و BOLA.
3. **الطبقة 3: التحكم بالوصول المبني على الأدوار (Role-Based Access Control - RBAC):** التحقق من دور المستخدم وصلاحياته المحددة (مثل `PROJECT_ADMIN`, `FINANCE_AUDITOR`, `DISPATCHER`, `SUPERVISOR`, `VIEWER`).
4. **الطبقة 4: قواعد سلامة البيانات وعدم القابلية للتعديل (Data Invariants & Historical Immutability):** قفل السجلات التاريخية، اللقطات السعرية (Pricing Snapshots)، سجلات التدقيق (Audit Logs)، وعدم التلاعب بالعلاقات التشغيلية.

---

## 2. الثوابت الأمنية للنظام (12 System Data Invariants)

| # | الثابت الأمني (Data Invariant) | الوصف وقاعدة الإنفاذ |
|---|---|---|
| **INV-01** | **Multi-Tenant Project Isolation** | لا يمكن لمستخدم مصرح له في مشروع A استعلام أو قراءة أو تعديل أو إضافة أي سجل تابع لمشروع B تحت أي ظرف. |
| **INV-02** | **Pricing Snapshot Immutability** | الحقول المالية واللقطة السعرية للرحلة (`pricingSnapshot`, `agreedRate`, `settlementAmount`, `financials`) غير قابلة للتعديل إطلاقاً بعد إنشائها، وتُحسب آلياً بالخادم. |
| **INV-03** | **Truck-Carrier Strict Association** | الشاحنة ترتبط حصراً بناقل معتمد واحد؛ يُحظر تغيير `carrierId` للشاحنة بعد تسجيلها، ويُرفض استيراد أي شاحنة لناقل مختلف. |
| **INV-04** | **Pricing Rule Copy-on-Write Versioning** | يُحظر تعديل `baseRateSAR` أو نوع التعرفة في نفس السجل لقاعدة تسعير مرتبطة برحلات تاريخية؛ التعديل يتطلب إنشاء نسخة جديدة `v2` مع إغلاق القديمة. |
| **INV-05** | **Append-Only Audit Stream** | سجلات التدقيق `/audit_logs` ومجموعات `/events` هي سجلات تراكمية للإضافة فقط (Append-Only)؛ يُحظر التعديل (`update`) أو الحذف (`delete`). |
| **INV-06** | **Audit Actor Attribution** | حقل `createdBy` وحقل الفاعل `actor.userId` في سجلات التدقيق والعمليات يجب أن يطابق تماماً `request.auth.uid`. |
| **INV-07** | **Trip Core Binding Immutability** | بمجرد إصدار الرحلة، تصبح الحقول التالية ثابتة نهائياً: `projectId`, `tripId`, `carrierId`, `truckId`, `pricingRuleId`. |
| **INV-08** | **Weighbridge Unloading Integrity** | يُحظر على العميل كتابة أو اصطناع أوزان تفريغ متطابقة صامتة (`destNetWeight = netWeight`) أو تصفير الفارق (`variance = 0`) بدون حدث تفريغ فعلي. |
| **INV-09** | **Operation Source Model Protection** | حقول المصدر (`sourceType`, `sourceMetadata`, `loadingActorType`) موثقة وغير قابلة للتزييف من قبل المشرف الميداني. |
| **INV-10** | **Admin-Enforced Mutations** | العمليات الإدارية الحساسة (اعتماد الهجرة، تحديث التعرفة، فض النزاعات، حذف الاستثناءات) تتطلب حصراً دور `PROJECT_ADMIN` أو `SUPER_ADMIN`. |
| **INV-11** | **Operation Idempotency Defense** | منع هجمات إعادة الإرسال (Replay Attacks)؛ معالجة نفس `operationId` تعيد النتيجة المسبقة ولا تكرر إنشاء السجلات أو الحسابات. |
| **INV-12** | **File Intake Sanitization & Sandboxing** | فحص المسارات ضد Path Traversal (`..`, `/`)، تقييد الامتدادات التنفيذية (`.exe`, `.sh`, `.php`)، وتقييد الحجم بـ 10MB كحد أقصى. |

---

## 3. حمولات الاختبار الهجومية: "The Dirty Dozen" (12 Exploits / Tampering Payloads)

### Payload 1: Cross-Project IDOR Attack (BOLA)
* **المسار المستهدف:** `POST /api/projects/PRJ-REDSEA-SOUTH-02/trips`
* **المهاجم:** مستخدم موثق ومرخص في `PRJ-NEOM-NORTH-01` فقط.
* **الحمولة:**
```json
{
  "projectId": "PRJ-REDSEA-SOUTH-02",
  "tripId": "TRP-IDOR-INJECT-01",
  "carrierId": "CAR-FOREIGN",
  "truckId": "TRK-FOREIGN-99"
}
```
* **النتيجة المتوقعة:** `HTTP 403 Forbidden` (`FORBIDDEN_PROJECT_ACCESS`).

---

### Payload 2: Supervisor Financial & Pricing Snapshot Tampering
* **المسار المستهدف:** `PATCH /api/projects/PRJ-NEOM-NORTH-01/trips/TRIP-SEC-001`
* **المهاجم:** مستخدم برتبة `SUPERVISOR` أو `DISPATCHER`.
* **الحمولة:**
```json
{
  "pricingRuleId": "PRC-DISCOUNTED-HACK",
  "settlementAmount": 500,
  "pricingSnapshot": {
    "agreedRate": 15,
    "settlementAmount": 500
  },
  "financials": {
    "totalAmountSAR": 500,
    "isFinalized": true
  }
}
```
* **النتيجة المتوقعة:** `HTTP 403 Forbidden` (`SUPERVISOR_MUTATION_FORBIDDEN_SETTLEMENT`).

---

### Payload 3: Supervisor Carrier / Truck Mutation on Active Trip
* **المسار المستهدف:** `PATCH /api/projects/PRJ-NEOM-NORTH-01/trips/TRIP-SEC-001`
* **المهاجم:** مستخدم برتبة `SUPERVISOR`.
* **الحمولة:**
```json
{
  "carrierId": "CAR-UNAUTHORIZED-HIJACK",
  "truckId": "TRK-ROGUE-77"
}
```
* **النتيجة المتوقعة:** `HTTP 403 Forbidden` (`SUPERVISOR_MUTATION_FORBIDDEN_CARRIER` / `SUPERVISOR_MUTATION_FORBIDDEN_TRUCK`).

---

### Payload 4: Project ID Tampering on Existing Trip (Tenant Escaping)
* **المسار المستهدف:** `PATCH /api/projects/PRJ-NEOM-NORTH-01/trips/TRIP-SEC-001`
* **المهاجم:** أي مستخدم.
* **الحمولة:**
```json
{
  "projectId": "PRJ-TRANSFER-TAMPERED-99"
}
```
* **النتيجة المتوقعة:** `HTTP 403 Forbidden` (`IMMUTABLE_FIELD_PROJECT_ID`).

---

### Payload 5: Truck-Carrier Integrity Hijack (Foreign Truck Import)
* **المسار المستهدف:** `POST /api/projects/PRJ-NEOM-NORTH-01/trucks/import`
* **المهاجم:** مدخل بيانات أو ناقل يحاول تسجيل شاحنة مسجلة مسبقاً لناقل آخر.
* **الحمولة:**
```json
{
  "targetCarrierId": "CAR-BINLADIN",
  "truck": {
    "truckId": "TRK-ALM-101",
    "carrierId": "CAR-BINLADIN",
    "plate": "أ ب ج 1010"
  }
}
```
* **النتيجة المتوقعة:** `HTTP 400 Bad Request` (`EXISTING_TRUCK_DIFFERENT_CARRIER`).

---

### Payload 6: Historical Pricing Rule Direct Rate Mutation
* **المسار المستهدف:** `POST /api/projects/PRJ-NEOM-NORTH-01/pricing-rules/PRC-CONTRACT-2026-v1/update`
* **المهاجم:** مشرف أو مدقق يحاول تعديل سعر قاعدة مرتبطة برحلات تاريخية سابقة دون تفريع نسخي.
* **الحمولة:**
```json
{
  "pricingRuleId": "PRC-CONTRACT-2026-v1",
  "baseRateSAR": 95.0
}
```
* **النتيجة المتوقعة:** `HTTP 409 Conflict` (`PRICING_RULE_HISTORICAL_MUTATION_BLOCKED`).

---

### Payload 7: Direct Audit Log Mutation or Deletion
* **الهدف:** استدعاء Firestore Rules لتعديل أو حذف وثيقة في `/audit_logs/{logId}`.
* **الحمولة:**
```json
{
  "action": "DELETED",
  "actor": { "userId": "ATTACKER" }
}
```
* **النتيجة المتوقعة:** رفض أمني حتمي من Firestore Rules (`PERMISSION_DENIED`).

---

### Payload 8: Path Traversal Attack in Workspace Document Upload
* **المسار المستهدف:** `POST /api/workspace/upload`
* **المهاجم:** مستخدم يحاول الخروج من مجلد المشروع إلى ملفات النظام.
* **الحمولة:**
```json
{
  "subfolderId": "FOLDER-123",
  "fileName": "../../../../etc/passwd",
  "mimeType": "text/plain",
  "fileContentBase64": "cm9vdDpwYXNzd2Q="
}
```
* **النتيجة المتوقعة:** `HTTP 400 Bad Request` (`SECURITY_PATH_TRAVERSAL`).

---

### Payload 9: Dangerous Executable File Upload
* **المسار المستهدف:** `POST /api/workspace/upload`
* **المهاجم:** مستخدم يرفع برنامج نصي تنفيذي كبوليصة شحن.
* **الحمولة:**
```json
{
  "subfolderId": "FOLDER-123",
  "fileName": "malicious_script.sh",
  "mimeType": "application/x-sh",
  "fileContentBase64": "ZWNobyAnaGFja2VkJw=="
}
```
* **النتيجة المتوقعة:** `HTTP 400 Bad Request` (`FORBIDDEN_FILE_EXTENSION` / `FORBIDDEN_MIME_TYPE`).

---

### Payload 10: Idempotency Replay Attack (Duplicate Operation Submission)
* **المسار المستهدف:** `POST /api/projects/PRJ-NEOM-NORTH-01/operations/sync`
* **المهاجم:** إرسال متكرر لنفس مفتاح العملية `operationId` لمحاولة مضاعفة التسجيل.
* **الحمولة:**
```json
{
  "operationId": "OP-REPLAY-ATTACK-001",
  "projectId": "PRJ-NEOM-NORTH-01",
  "tripData": { "ticket": "TKT-REPLAY" }
}
```
* **النتيجة المتوقعة:** الرد بنجاح مع الوسم `isDuplicate: true` دون تكرار أي إدراج أو تنفيذ.

---

### Payload 11: Direct Weighbridge Unload Tampering (Fabricating Zero Variance)
* **المسار المستهدف:** `PATCH /api/projects/PRJ-NEOM-NORTH-01/trips/TRIP-SEC-001`
* **المهاجم:** عميل يحاول حقن `destNetWeight` يطابق `netWeight` وتصفير `variance` مباشرة دون تفريغ فعلي.
* **الحمولة:**
```json
{
  "weights": {
    "destinationNetKg": 27000,
    "varianceKg": 0
  },
  "unloadingDataSource": "MANUAL",
  "status": "COMPLETED"
}
```
* **النتيجة المتوقعة:** `HTTP 400 Bad Request` (`INVALID_FSM_TRANSITION` / رفض قواعد الأمان).

---

### Payload 12: Unauthenticated / Forged Token Access
* **المسار المستهدف:** أي مسار محمي بدون هيدر `Authorization` أو مع رمز مزيف.
* **النتيجة المتوقعة:** `HTTP 401 Unauthorized` (`UNAUTHORIZED_ACCESS`).

---

## 4. مصفوفة الصلاحيات والأدوار (Role Matrix)

| الوظيفة / العملية | SUPER_ADMIN | PROJECT_ADMIN | FINANCE_AUDITOR | SUPERVISOR | DISPATCHER | VIEWER |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| إنشاء وإدارة المشاريع | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| إدارة الناقلين والمواد | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| ضبط واعتماد قواعد التسعير | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| تسجيل واستيراد الشاحنات والسائقين | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| إطلاق الرحلات وتسجيل أوزان الميزان | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| اعتماد الاستثناءات الحرجة | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| اعتماد وتثبيت هجرة البيانات القديمة | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| استعراض سجلات التدقيق والمطابقة | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| استعراض الشاشات والتقارير العامة | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
