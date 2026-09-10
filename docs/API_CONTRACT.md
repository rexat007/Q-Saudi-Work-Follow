# Q Saudi Work Follow — عقد واجهات برمجة التطبيقات (API Contract)

## 1. المعايير العامة والبروتوكولات (General Standards)

* **البروتوكول:** RESTful JSON عبر HTTPS حصراً.
* **إلزامية المصادقة:** جميع الطلبات (باستثناء فحص الصحة `/health`) تتطلب رمز هوية معتمد من Firebase:
  ```http
  Authorization: Bearer <Firebase_ID_Token>
  ```
* **رأس سياق المشروع (Multi-Project Context):**
  ```http
  X-Project-Id: <projectId>
  ```
  يتحقق الخادم من وجود صلاحية للمستخدم على هذا المشروع عبر الـ Custom Claims المشفرة.
* **رأس الحماية من التكرار (Idempotency Key):**
  ```http
  X-Idempotency-Key: <UUIDv4>
  ```
  إلزامي لكل عمليات الكتابة (`POST`, `PUT`, `PATCH`). إذا تم إرسال نفس المعرّف مرتين، يعيد الخادم نفس النتيجة السابقة دون إعادة تنفيذ العملية (مبدأ رقم 9).

---

## 2. هيكلية الاستجابة القياسية (Standard Response Envelope)

### 2.1 استجابة النجاح (Success):
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "correlationId": "req_8f12a9c4-0012",
    "serverTimestamp": "2026-09-09T14:25:30.124Z",
    "projectId": "proj_riyadh_metro_01"
  }
}
```

### 2.2 استجابة الخطأ (Standard Error):
```json
{
  "success": false,
  "error": {
    "code": "INVALID_STATE_TRANSITION",
    "message": "لا يمكن نقل الرحلة من حالة AT_ORIGIN مباشرة إلى COMPLETED دون توثيق الميزان والتفريغ.",
    "details": {
      "currentStatus": "AT_ORIGIN",
      "attemptedStatus": "COMPLETED",
      "requiredEvents": ["EVENT_WEIGHBRIDGE_ORIGIN_CAPTURED", "EVENT_DEPART_ORIGIN"]
    },
    "correlationId": "err_5b88c0a1-7721"
  }
}
```

---

## 3. نقاط النهاية الأساسية (Core API Endpoints)

### 3.1 فحص صلاحيات المستخدم على المشروع
* **المسار:** `GET /api/v1/auth/context`
* **الوصف:** يتحقق من رمز المستخدم ويعيد المشاريع المصرح له بالوصول إليها ودوره في كل مشروع.
* **الاستجابة (200 OK):**
```json
{
  "success": true,
  "data": {
    "userId": "usr_saudi_dispatcher_89",
    "email": "dispatcher@qsaudi.com",
    "accessibleProjects": [
      {
        "projectId": "proj_riyadh_metro_01",
        "role": "DISPATCHER",
        "permissions": ["TRIP_CREATE", "TRIP_EVENT_LOG", "WEIGHBRIDGE_INPUT"]
      }
    ]
  }
}
```

---

### 3.2 إطلاق رحلة جديدة (Dispatch Trip)
* **المسار:** `POST /api/v1/projects/{projectId}/trips`
* **المسؤولية:** خادومية بحتة. يقوم الخادم بالتحقق من سريان فحص الشاحنة، ورخصة السائق، وتوليد `tripNumber` متسلسل، وأخذ لقطة التسعير الحالية (`pricingSnapshot`).
* **الرؤوس الإلزامية:** `Authorization`, `X-Project-Id`, `X-Idempotency-Key`
* **جسم الطلب (Request Body):**
```json
{
  "clientUUID": "c89b21de-74f1-46ab-9610-184bc27a1923",
  "carrierId": "carr_al_mousa_trans",
  "truckId": "trk_volvo_4521_ksa",
  "driverId": "drv_ahmed_al_otaibi",
  "materialId": "mat_base_course_class_a",
  "originSite": "كسارة الدهناء - الموقع الشمالي",
  "destinationSite": "مشروع قطار الرياض - محطة 3B",
  "notes": "توريد عاجل قبل إغلاق التحميل"
}
```
* **استجابة الخادم (201 Created):**
```json
{
  "success": true,
  "data": {
    "tripId": "trp_994821a8",
    "tripNumber": "TRP-2026-008412",
    "status": "DISPATCHED",
    "clientUUID": "c89b21de-74f1-46ab-9610-184bc27a1923",
    "pricingSnapshot": {
      "ruleId": "rule_ton_base_course_01",
      "pricingModel": "PER_TON",
      "baseRateSAR": 28.50,
      "vatRatePercent": 15.0
    },
    "financials": {
      "baseAmountSAR": 0.00,
      "vatAmountSAR": 0.00,
      "totalAmountSAR": 0.00,
      "isFinalized": false
    },
    "createdAt": "2026-09-09T14:30:00.000Z"
  }
}
```

---

### 3.3 تسجيل حدث رحلة (Log Trip Event & Transition)
* **المسار:** `POST /api/v1/projects/{projectId}/trips/{tripId}/events`
* **المسؤولية:** العميل لا يحدد الحالة؛ الخادم يقيم الحدث ويفحص آلة الحالات (State Machine).
* **جسم الطلب (Request Body):**
```json
{
  "clientEventUUID": "evt_d398f821-2314-4112",
  "eventType": "EVENT_WEIGHBRIDGE_ORIGIN_CAPTURED",
  "deviceTimestamp": "2026-09-09T14:45:12.000Z",
  "location": {
    "latitude": 24.7136,
    "longitude": 46.6753,
    "accuracyMeters": 6.5
  },
  "payload": {
    "weighbridgeTicketNo": "WB-DHN-88219",
    "grossWeightKg": 44850,
    "tareWeightKg": 14200,
    "ticketPhotoDriveFileId": "drive_file_1982aa00f"
  }
}
```
* **استجابة الخادم (200 OK):**
```json
{
  "success": true,
  "data": {
    "eventId": "evt_srv_884129",
    "tripId": "trp_994821a8",
    "newStatus": "WEIGHED_ORIGIN",
    "weights": {
      "originTareKg": 14200,
      "originGrossKg": 44850,
      "originNetKg": 30650
    },
    "hasExceptions": false
  }
}
```

---

### 3.4 إتمام الرحلة واحتساب القيمة المالية نهائياً (Complete Trip)
* **المسار:** `POST /api/v1/projects/{projectId}/trips/{tripId}/complete`
* **المسؤولية:** الخادم يحسب القيمة المالية النهائية (القاعدة 6) ويحدث حالة الرحلة إلى `COMPLETED` ويكتب في `audit_logs` ويوجه إشعاراً لـ Google Sheets.
* **جسم الطلب (Request Body):**
```json
{
  "clientEventUUID": "evt_f98124cc-0099",
  "destinationGrossWeightKg": 44780,
  "destinationTareWeightKg": 14220,
  "destinationTicketNo": "WB-DEST-44012",
  "offloadSupervisorNotes": "تم التفريغ ومطابقة العينة بنجاح"
}
```
* **استجابة الخادم (200 OK):**
```json
{
  "success": true,
  "data": {
    "tripId": "trp_994821a8",
    "tripNumber": "TRP-2026-008412",
    "status": "COMPLETED",
    "weights": {
      "originNetKg": 30650,
      "destinationNetKg": 30560,
      "discrepancyKg": -90,
      "billableWeightKg": 30560
    },
    "financials": {
      "billableWeightTons": 30.56,
      "ratePerTonSAR": 28.50,
      "baseAmountSAR": 870.96,
      "demurrageAmountSAR": 0.00,
      "deductionsAmountSAR": 0.00,
      "subtotalSAR": 870.96,
      "vatAmountSAR": 130.64,
      "totalAmountSAR": 1001.60,
      "currency": "SAR",
      "isFinalized": true,
      "finalizedAt": "2026-09-09T16:10:00.000Z"
    }
  }
}
```

---

### 3.5 رفع استثناء تشغيلي (Raise Operational Exception)
* **المسار:** `POST /api/v1/projects/{projectId}/trips/{tripId}/exceptions`
* **جسم الطلب:**
```json
{
  "clientUUID": "exc_998124aa-1123",
  "type": "OVERWEIGHT_VIOLATION",
  "severity": "BLOCKING",
  "details": {
    "measuredGrossKg": 48200,
    "legalMaxGrossKg": 45000,
    "excessWeightKg": 3200
  },
  "notes": "الوزن يتجاوز الحد النظامي المسموح به لوزارة النقل."
}
```

---

### 3.6 مزامنة العمليات الميدانية دفعة واحدة (Idempotent Batch Sync)
* **المسار:** `POST /api/v1/projects/{projectId}/sync/batch`
* **الوصف:** مخصص لتفريغ قائمة انتظار IndexedDB الميدانية بعد عودة الاتصال بالإنترنت.
* **جسم الطلب:**
```json
{
  "batchId": "sync_batch_20260909_001",
  "operations": [
    {
      "idempotencyKey": "op_uuid_101",
      "type": "TRIP_EVENT",
      "tripId": "trp_994821a8",
      "payload": { ... }
    },
    {
      "idempotencyKey": "op_uuid_102",
      "type": "TRIP_EVENT",
      "tripId": "trp_994821a8",
      "payload": { ... }
    }
  ]
}
```
* **الاستجابة (200 OK):**
```json
{
  "success": true,
  "data": {
    "processedCount": 2,
    "results": [
      { "idempotencyKey": "op_uuid_101", "status": "COMMITTED" },
      { "idempotencyKey": "op_uuid_102", "status": "ALREADY_PROCESSED" }
    ]
  }
}
```

---

### 3.7 رفع وثائق الميزان إلى Google Drive
* **المسار:** `POST /api/v1/projects/{projectId}/drive/upload-ticket`
* **المحتوى:** `multipart/form-data`
* **المسؤولية:** يستقبل الخادم الصورة بصيغة Binary، ويتحقق من نوع الملف وحجمه، ثم يرفع الملف إلى المجلد الهرمي للمشروع على Google Drive ويعيد `driveFileId` فقط. لا يتم تخزين مفاتيح Drive في العميل.
