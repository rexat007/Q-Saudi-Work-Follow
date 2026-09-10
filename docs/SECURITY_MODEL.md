# Q Saudi Work Follow — نموذج الأمان والتحكم بالوصول (Security Model & Access Control)

## 1. مبادئ الأمان الصارمة (Zero-Trust Security Principles)

1. **العميل كيان غير موثوق به إطلاقاً (Untrusted Client):**
   * لا يُعتد بأي قيمة تأتي من العميل فيما يخص الصلاحيات، الحالات، الحسابات المالية، أو أسعار المواد.
2. **عزل المشاريع التام (Multi-Project Tenant Isolation):**
   * المستخدم المصرح له بالعمل على مشروع "قطار الرياض" لا يمتلك أي قدرة على استعلام أو الوصول لبيانات مشروع "نيوم" أو "مشروع القدية".
3. **انعدام الأسرار في واجهة المستخدم (No Secrets in Frontend):**
   * لا يحتوي كود المتصفح أو تطبيق PWA على أي مفتاح لخدمات Google Workspace (Sheets / Drive Service Accounts) أو مفاتيح خادم Firebase Admin SDK.
4. **عدم إمكانية التلاعب بسجلات التدقيق (Tamper-Proof Audit Logging):**
   * سجلات التدقيق تُنشأ من جهة الخادم حصراً بصفة "Append-Only"، ولا تتيح قواعد الأمان أي عمليات حذف (`delete`) أو تعديل (`update`).

---

## 2. إدارة الهوية والرموز المخصصة (IAM & Firebase Custom Claims)

تُعتمد الرموز المميزة (Firebase ID Tokens) كمرجع أساسي للهوية بعد تسجيل الدخول. يتم إرفاق مصفوفة الصلاحيات الخاصة بالمشاريع داخل رمز JWT في حقل `customClaims`:

```json
{
  "uid": "usr_saudi_dispatcher_89",
  "email": "dispatcher@qsaudi.com",
  "projectRoles": {
    "proj_riyadh_metro_01": "DISPATCHER",
    "proj_qiddiya_earthworks": "VIEWER"
  },
  "isSuperAdmin": false
}
```

### الأدوار التشغيلية (Role-Based Access Control - RBAC):

| الدور (Role) | الصلاحيات الوظيفية الميدانية |
|---|---|
| **PROJECT_ADMIN** | إدارة المشروع، تعيين الناقلين، ضبط مصفوفة التسعير، اعتماد الاستثناءات الحرجة. |
| **DISPATCHER** | إطلاق الرحلات، تسجيل أوزان الانطلاق، توثيق تذاكر الميزان، رفع الاستثناءات. |
| **DESTINATION_SUPERVISOR** | تسجيل وصول الرحلة، تسجيل وزن الموقع، تأكيد التفريغ، رفع استثناءات الفروقات. |
| **FINANCE_AUDITOR** | مراجعة واعتماد الحسابات المالية، فحص قيود الفوترة وضريبة القيمة المضافة. |
| **DRIVER** | عرض تفاصيل الرحلة الحالية المسندة إليه، تسجيل حالات التحرك والتوقف الميداني. |
| **VIEWER / CLIENT** | قراءة التقارير والمؤشرات التشغيلية بدون أي صلاحية تعديل. |

---

## 3. نموذج قواعد أمان Firestore (Authoritative Security Rules Blueprint)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // الدوال المساعدة للتحقق من الصلاحيات
    function isAuthenticated() {
      return request.auth != null;
    }

    function isSuperAdmin() {
      return isAuthenticated() && request.auth.token.isSuperAdmin == true;
    }

    function hasProjectRole(projectId, allowedRoles) {
      return isAuthenticated() && 
        (isSuperAdmin() || 
        (request.auth.token.projectRoles != null && 
         request.auth.token.projectRoles[projectId] in allowedRoles));
    }

    // 1. عزل وثائق المشاريع
    match /projects/{projectId} {
      allow read: if hasProjectRole(projectId, ['PROJECT_ADMIN', 'DISPATCHER', 'DESTINATION_SUPERVISOR', 'FINANCE_AUDITOR', 'VIEWER']);
      allow write: if isSuperAdmin() || hasProjectRole(projectId, ['PROJECT_ADMIN']);

      // 2. الكيانات التشغيلية الفرعية (Carriers, Trucks, Drivers, Materials)
      match /carriers/{carrierId} {
        allow read: if hasProjectRole(projectId, ['PROJECT_ADMIN', 'DISPATCHER', 'DESTINATION_SUPERVISOR', 'FINANCE_AUDITOR', 'VIEWER']);
        allow write: if hasProjectRole(projectId, ['PROJECT_ADMIN']);
      }

      match /trucks/{truckId} {
        allow read: if hasProjectRole(projectId, ['PROJECT_ADMIN', 'DISPATCHER', 'DESTINATION_SUPERVISOR', 'FINANCE_AUDITOR', 'VIEWER']);
        allow write: if hasProjectRole(projectId, ['PROJECT_ADMIN', 'DISPATCHER']);
      }

      match /drivers/{driverId} {
        allow read: if hasProjectRole(projectId, ['PROJECT_ADMIN', 'DISPATCHER', 'DESTINATION_SUPERVISOR', 'FINANCE_AUDITOR', 'VIEWER']);
        allow write: if hasProjectRole(projectId, ['PROJECT_ADMIN', 'DISPATCHER']);
      }

      match /materials/{materialId} {
        allow read: if hasProjectRole(projectId, ['PROJECT_ADMIN', 'DISPATCHER', 'DESTINATION_SUPERVISOR', 'FINANCE_AUDITOR', 'VIEWER']);
        allow write: if hasProjectRole(projectId, ['PROJECT_ADMIN']);
      }

      // 3. قواعد التسعير: ممنوع تعديلها من الميدان نهائياً
      match /pricing_rules/{ruleId} {
        allow read: if hasProjectRole(projectId, ['PROJECT_ADMIN', 'FINANCE_AUDITOR']);
        allow write: if hasProjectRole(projectId, ['PROJECT_ADMIN', 'FINANCE_AUDITOR']);
      }

      // 4. الرحلات (Trips): لا يُسمح للعميل بتعديل الحالة أو القيمة المالية مباشرة
      match /trips/{tripId} {
        allow read: if hasProjectRole(projectId, ['PROJECT_ADMIN', 'DISPATCHER', 'DESTINATION_SUPERVISOR', 'FINANCE_AUDITOR', 'VIEWER', 'DRIVER']);
        
        // يُمنع الكتابة المباشرة للرحلة من العميل لتعديل الحسابات المالية أو الحالات؛
        // التعديلات تتم عبر Cloud Functions / Node.js API حصراً أو عبر قيود صارمة جداً.
        allow create: if hasProjectRole(projectId, ['PROJECT_ADMIN', 'DISPATCHER']) &&
          request.resource.data.financials.isFinalized == false &&
          request.resource.data.financials.totalAmountSAR == 0;
          
        allow update: if false; // التحديث المباشر مغلق؛ يتم عبر واجهات الـ Backend المعتمدة
        allow delete: if false; // الرحلات لا تُحذف للحفاظ على السجل الضريبي
        
        // الأحداث الفرعية للرحلة
        match /events/{eventId} {
          allow read: if hasProjectRole(projectId, ['PROJECT_ADMIN', 'DISPATCHER', 'DESTINATION_SUPERVISOR', 'FINANCE_AUDITOR', 'VIEWER']);
          allow create: if hasProjectRole(projectId, ['PROJECT_ADMIN', 'DISPATCHER', 'DESTINATION_SUPERVISOR', 'DRIVER']);
          allow update, delete: if false; // الأحداث غير قابلة للتعديل أو الحذف
        }

        match /exceptions/{exceptionId} {
          allow read: if hasProjectRole(projectId, ['PROJECT_ADMIN', 'DISPATCHER', 'DESTINATION_SUPERVISOR', 'FINANCE_AUDITOR']);
          allow create: if hasProjectRole(projectId, ['PROJECT_ADMIN', 'DISPATCHER', 'DESTINATION_SUPERVISOR']);
          allow update: if hasProjectRole(projectId, ['PROJECT_ADMIN']); // فقط المدير يعتمد الاستثناء
          allow delete: if false;
        }
      }

      // 5. سجل عمليات المزامنة Idempotency Ops
      match /sync_operations/{syncOpId} {
        allow read, write: if hasProjectRole(projectId, ['PROJECT_ADMIN', 'DISPATCHER', 'DESTINATION_SUPERVISOR', 'DRIVER']);
      }
    }

    // 6. سجل التدقيق العام (Audit Logs): للقراءة فقط للمدقق، وممنوع الحذف نهائياً
    match /audit_logs/{auditId} {
      allow read: if isSuperAdmin() || 
        (isAuthenticated() && request.auth.token.isAuditor == true);
      allow write: if false; // يكتب فقط عبر Firebase Admin SDK الخادومي
    }
  }
}
```

---

## 4. أمان الخادم وعزل الخدمات الخارجية (External Services Isolation)

```
[ Frontend PWA Client ]
         │ (Only Firebase ID Token)
         ▼
[ Secure Node.js Server Environment ]
    ├── process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    ├── process.env.GOOGLE_WORKSPACE_CLIENT_EMAIL
    ├── process.env.GOOGLE_WORKSPACE_PRIVATE_KEY
    └── process.env.ZATCA_INTEGRATION_SECRETS
         │
         ├──► (Google Sheets API v4 with Service Account)
         └──► (Google Drive API v3 with Service Account)
```

* يتم تخزين مفتاح `Service Account` الخاص بـ Google Drive و Google Sheets في بيئة تشغيل الخادم المشفرة (`Cloud Secret Manager`).
* لا يملك العميل أي عنوان URL مباشر أو Token لرفع الملفات إلى Drive؛ بل يرسل الملف كـ Stream إلى الخادم الذي يتحقق من الحجم (أقصى حد 10MB لكل تذكرة) والنوع (JPEG, PNG, PDF)، ثم يقوم بالرفع إلى مجلد المشروع الهرمي المحدد.

---

## 5. سجل التدقيق الإلزامي للتغييرات الحساسة (Audit Trail Specification)

أي تعديل على السجلات التالية يؤدي فورياً لإصدار سجل تدقيق في مجموعة `/audit_logs`:
1. تعديل وزن تذكرة ميزان أو تصحيح يدوي.
2. اعتماد أو تسوية استثناء حمولة زائدة (Overweight Exception).
3. تعديل في مصفوفة أسعار الناقل (`Pricing Rule`).
4. تغيير يدوي لحالة الرحلة من قِبل المشرف الميداني.
5. تعديل ضريبة أو خصم مالي على قيمة الرحلة.
