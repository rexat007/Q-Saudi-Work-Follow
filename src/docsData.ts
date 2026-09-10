export interface DocItem {
  id: string;
  filename: string;
  titleAr: string;
  titleEn: string;
  iconName: string;
  summaryAr: string;
  content: string;
}

export const ARCHITECTURE_DOCS: DocItem[] = [
  {
    id: 'architecture',
    filename: 'docs/ARCHITECTURE.md',
    titleAr: 'المعمارية الشاملة والمبادئ',
    titleEn: 'System Architecture',
    iconName: 'Layers',
    summaryAr: 'الرؤية المعمارية للمنصة، المبادئ الـ 12 الإلزامية، العلاقات بين الـ 11 كياناً، وهيكلية الطبقات والخدمات.',
    content: `# Q Saudi Work Follow — النظام المعماري الشامل (Architecture Specification)

## 1. نبذة عامة والرؤية المعمارية (System Vision & Overview)
مشروع **Q Saudi Work Follow** هو منصة رقمية سحابية متقدمة (Full-Stack Multi-Project Logistics & Dispatch Management Platform) صُممت لإدارة عمليات النقل الثقيل وسلاسل إمداد المواد الإنشائية في المملكة العربية السعودية.

تم تصميم النظام ليعمل بكفاءة عالية في بيئات العمل الميدانية القاسية التي تتسم بضعف أو انقطاع شبكات الاتصال (Desert & Remote Sites)، مع الامتثال الصارم للضوابط التشغيلية والمحاسبية والتنظيمية (الهيئة العامة للنقل - منصة وصل/نقل، وهيئة الزكاة والضريبة والجمارك ZATCA).

## 2. المبادئ الإلزامية الصارمة (The 12 Invariant Architectural Principles)
1. Firestore هو Source of Truth للعمليات.
2. Google Sheets هو Operational/Reporting Projection.
3. Google Drive لتخزين ملفات المشروع والتقارير.
4. جميع Business Rules على server-side.
5. Client لا يقرر status النهائي.
6. Client لا يحسب القيمة المالية النهائية.
7. Client لا يحدد project access.
8. لا توجد كلمات مرور أو API secrets داخل client.
9. جميع عمليات الكتابة Idempotent.
10. النظام Multi-Project.
11. النظام Offline-first.
12. جميع التغييرات الحساسة تسجل Audit Log.

## 3. شرح العلاقات بين كيانات النطاق
- **Project:** الكيان الجذري التشغيلي والحدود المالية وحاجز عزل المشاريع.
- **Carrier:** شركة نقل متعاقدة مع المشروع، تمتلك أسطول الشاحنات وتوظف السائقين.
- **Pricing Rule:** مصفوفة خادومية تحدد كيفية تسعير الحمولة (طن، مشوار، كم، غرامات تأخير).
- **Material:** المادة المنقولة ومواصفاتها القياسية ونسب الرطوبة المسموحة.
- **Truck:** المركبة المسجلة بوزنها الفارغ المعتمد رسميًا (Tare Weight) وحمولتها النظامية.
- **Driver:** السائق المؤهل التابع للناقل والمخول بتنفيذ الرحلات.
- **Trip:** الوحدة التشغيلية والمحاسبية المركزية التي تجمع الأطراف وتخضع لآلة حالات خادومية صارمة.
- **Trip Event:** تدفق زمني غير قابل للتعديل يوثق محطات وأوزان الرحلة.
- **Exception:** انحراف تشغيلي أو مخالفة نظامية توقف اكتمال الرحلة حتى حلها من قِبل المشرف.
- **Audit Log:** سجل تدقيق أمني ومحاسبي غير قابل للحذف يوثق كافة التعديلات الحساسة.
- **Sync Operation:** غلاف العملية الميدانية لضمان عدم التكرار (Idempotency) عند تفريغ طابور IndexedDB.`
  },
  {
    id: 'data-model',
    filename: 'docs/DATA_MODEL.md',
    titleAr: 'نموذج ومخطط البيانات',
    titleEn: 'Data Model & Schema',
    iconName: 'Database',
    summaryAr: 'هيكلية Firestore الشجرية بنمط Multi-Tenant Scoped Subcollections، واجهات TypeScript، واستراتيجية الفهارس.',
    content: `# Q Saudi Work Follow — نموذج البيانات والمخطط الهيكلي (Data Model & Schema)

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
/audit_logs/{auditLogId}`
  },
  {
    id: 'api-contract',
    filename: 'docs/API_CONTRACT.md',
    titleAr: 'عقد واجهات برمجة التطبيقات',
    titleEn: 'API Contract',
    iconName: 'Code',
    summaryAr: 'المعايير الخادومية لنقاط النهاية، رؤوس التفويض وسياق المشروع، ومفاتيح الحماية من التكرار X-Idempotency-Key.',
    content: `# Q Saudi Work Follow — عقد واجهات برمجة التطبيقات (API Contract)

## 1. المعايير العامة والبروتوكولات
- البروتوكول: RESTful JSON عبر HTTPS.
- المصادقة: Authorization: Bearer <Firebase_ID_Token>
- سياق المشروع: X-Project-Id: <projectId>
- حماية التكرار: X-Idempotency-Key: <UUIDv4>

## 2. نقاط النهاية الأساسية
- GET /api/v1/auth/context: فحص صلاحيات المستخدم على المشاريع.
- POST /api/v1/projects/{projectId}/trips: إطلاق رحلة وتوليد tripNumber ولقطة التسعير.
- POST /api/v1/projects/{projectId}/trips/{tripId}/events: تسجيل حدث وتحديث الحالة عبر FSM.
- POST /api/v1/projects/{projectId}/trips/{tripId}/complete: إتمام الرحلة واحتساب القيمة المالية نهائياً.
- POST /api/v1/projects/{projectId}/trips/{tripId}/exceptions: رفع أو تسوية استثناء تشغيلي.
- POST /api/v1/projects/{projectId}/sync/batch: مزامنة طابور العمليات الميدانية دفعة واحدة بدون تكرار.
- POST /api/v1/projects/{projectId}/drive/upload-ticket: رفع تذكرة الميزان إلى Google Drive بأمان.`
  },
  {
    id: 'security-model',
    filename: 'docs/SECURITY_MODEL.md',
    titleAr: 'نموذج الأمان والتحكم بالوصول',
    titleEn: 'Security & Access Model',
    iconName: 'ShieldCheck',
    summaryAr: 'مبدأ Zero-Trust، عزل المشاريع، قواعد أمان Firestore Security Rules، وانعدام الأسرار داخل كود العميل.',
    content: `# Q Saudi Work Follow — نموذج الأمان والتحكم بالوصول (Security Model)

## 1. مبادئ الأمان الصارمة
- العميل كيان غير موثوق به إطلاقاً (Untrusted Client).
- عزل المشاريع التام (Multi-Project Tenant Isolation عبر Custom Claims).
- انعدام الأسرار في واجهة المستخدم (No Secrets in Frontend).
- عدم إمكانية التلاعب بسجلات التدقيق (Tamper-Proof Audit Logging).

## 2. إدارة الهوية والأدوار (RBAC)
- PROJECT_ADMIN: إدارة المشروع، تعيين الناقلين، ضبط مصفوفة التسعير.
- DISPATCHER: إطلاق الرحلات، تسجيل أوزان الانطلاق، توثيق التذاكر.
- DESTINATION_SUPERVISOR: تسجيل الوصول، توثيق وزن الموقع، تأكيد التفريغ.
- FINANCE_AUDITOR: مراجعة الحسابات المالية واعتماد قيود الضريبة 15%.
- DRIVER: استعراض تفاصيل الرحلة المسندة إليه وتسجيل محطات المسار.`
  },
  {
    id: 'offline-model',
    filename: 'docs/OFFLINE_MODEL.md',
    titleAr: 'نموذج العمل بدون اتصال والمزامنة',
    titleEn: 'Offline & Sync Model',
    iconName: 'WifiOff',
    summaryAr: 'معمارية IndexedDB الرباعية، طابور العمليات المعلقة Mutation Queue، وفض النزاعات خادومياً.',
    content: `# Q Saudi Work Follow — نموذج العمل بدون اتصال والمزامنة الميدانية (Offline Model)

## 1. التحديات الميدانية والدافع المعماري
العمل في المواقع الصحراوية ومسارات النقل النائية بالمملكة يتطلب قدرة كاملة على توثيق الرحلات وتذاكر الموازين بنمط Offline-First.

## 2. مستودعات IndexedDB الأربعة
1. metadataCache: بيانات الناقلين، الشاحنات، السائقين، والمواد.
2. activeTrips: الرحلات الجارية الخاصة بالمحطة أو المشرف.
3. mutationQueue: طابور العمليات الميدانية المعلقة المحمية بـ idempotencyKey.
4. syncStatus: مؤشرات حالة الاتصال وآخر مزامنة ناجحة.

## 3. فض النزاعات وتوقيت الأجهزة
- الخادم هو المرجع الأوحد لقبول أو رفض أي انتقال في حالة الرحلة.
- deviceTimestamp استرشادي فقط؛ serverTimestamp هو المعتمد قانونياً ومحاسبياً.`
  },
  {
    id: 'pricing-model',
    filename: 'docs/PRICING_MODEL.md',
    titleAr: 'محرك التسعير والمحاسبة الخادومي',
    titleEn: 'Pricing & Financial Engine',
    iconName: 'Calculator',
    summaryAr: 'تطبيق المبدأ السادس: احتساب الأجور (طن، رد، كم) وغرامات التأخير وضريبة 15% ZATCA خادومياً.',
    content: `# Q Saudi Work Follow — نموذج التسعير والمحاسبة الخادومي (Pricing Model)

## 1. الفلسفة والمبدأ الإلزامي السادس
"Client لا يحسب القيمة المالية النهائية"
يُمنع احتساب أو تقرير أي قيمة مالية أو ضريبية في كود المتصفح؛ الحساب يصدر حصراً ومباشرة من محرك التسعير الخادومي الموثق.

## 2. نماذج التسعير
- Per Ton Model: Base = Billable Weight (Tons) * Rate Per Ton.
- Per M3 Model: Base = Volume (M3) * Rate Per M3.
- Per Trip Model: سعر مقطوع ثابت لكل رحلة مكتملة.
- Per Km Model: Base = Authorized Distance (Km) * Rate Per Km.

## 3. غرامات التأخير والضريبة
- Demurrage: احتساب ساعات التأخير الإضافية فوق الحد المجاني المسموح.
- ZATCA VAT: ضريبة القيمة المضافة 15% مع تقريب محاسبي جبري لأقرب هللتين بالريال السعودي.`
  },
  {
    id: 'data-quality-model',
    filename: 'docs/DATA_QUALITY_MODEL.md',
    titleAr: 'جودة البيانات ومطابقة الإسقاطات',
    titleEn: 'Data Quality & Projection Model',
    iconName: 'CheckCircle2',
    summaryAr: 'بوابات التحقق من تذاكر الميزان، معمارية إسقاط Google Sheets، تنظيم مجلدات Google Drive، ورصد الأنماط الشاذة.',
    content: `# Q Saudi Work Follow — نموذج جودة البيانات ومطابقة الإسقاطات (Data Quality)

## 1. بوابات التحقق التشغيلية
- البوابة 1: التحقق الفيزيائي من الموازين (Gross > Tare، مطابقة أقصى حمولة قانونية).
- البوابة 2: التحقق النظامي والتراخيص (سريان الفحص الدوري والرخص).
- البوابة 3: التحقق الجغرافي والزمني (Geo-fence، والسرعة القصوى).
- البوابة 4: مطابقة فرق ميزان التفريغ (أقصى تفاوت مسموح 1.5%؛ ما زاد يولد Exception).

## 2. إسقاط Google Sheets أحادي الاتجاه
- Firestore هو مصدر الحقيقة الأوحد؛ الشيت إسقاط تقارير فقط.
- طابور تحديثات خادومي بمعدل محكوم (أقل من 250 طلب/دقيقة) لمنع تجاوز الحصص.
- Job مطابقة دوري يومي لضمان اتساق الأرقام.

## 3. تنظيم مجلدات Google Drive
- هيكلية هرمية معيارية لكل مشروع:
  /Projects/{ProjectName}_{ProjectId}/Waybills/{YYYY-MM}/
- فحص حجم الملفات وصيغها المعتمدة وتخزين driveFileId داخل سجل الرحلة.`
  }
];
