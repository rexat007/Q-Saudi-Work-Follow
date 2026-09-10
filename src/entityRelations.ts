export interface EntityRelationInfo {
  id: string;
  nameAr: string;
  nameEn: string;
  category: 'CORE' | 'ACTOR' | 'COMMERCE' | 'ASSURANCE';
  shortDescAr: string;
  roleInSystemAr: string;
  relationships: {
    target: string;
    type: '1:1' | '1:N' | 'N:1' | 'N:M' | '0:1' | '0:N';
    descAr: string;
  }[];
  keyAttributes: string[];
  rulesEnforcedAr: string[];
}

export const ENTITY_RELATIONS: EntityRelationInfo[] = [
  {
    id: 'Project',
    nameAr: 'المشروع (Project)',
    nameEn: 'Project',
    category: 'CORE',
    shortDescAr: 'الكيان الجذري التشغيلي والحدود المالية وحاجز عزل المشاريع (Tenant Boundary).',
    roleInSystemAr: 'يحدد نطاق العمل، الموقع الجغرافي وسياج الأمان، الرقم الضريبي لـ ZATCA، والمجلدات المرتبطة على Google Drive والشيت التشغيلي على Google Sheets.',
    relationships: [
      { target: 'Carrier', type: '1:N', descAr: 'يتعاقد المشروع مع ناقلين متعددين لنقل المواد.' },
      { target: 'Material', type: '1:N', descAr: 'يحدد قائمة المواد المعتمدة والمطابقة للمواصفات في المشروع.' },
      { target: 'Pricing Rule', type: '1:N', descAr: 'يحدد مصفوفات وقواعد التسعير المعتمدة لتعاقدات المشروع.' },
      { target: 'Trip', type: '1:N', descAr: 'تتبع له كافة الرحلات الميدانية المنفذة ضمن نطاقه.' },
      { target: 'Audit Log', type: '1:N', descAr: 'يسجل كافة العمليات والتغييرات الحساسة داخل المشروع.' }
    ],
    keyAttributes: ['id', 'nameAr', 'location (lat/lng/radius)', 'zatcaTaxNumber', 'googleDriveFolderId', 'googleSpreadsheetId'],
    rulesEnforcedAr: [
      'المبدأ 7: صلاحيات المستخدمين تُعزل كلياً على مستوى المشروع عبر Custom Claims.',
      'المبدأ 10: النظام متعدد المشاريع Multi-Project مع عزل تام للبيانات.'
    ]
  },
  {
    id: 'Carrier',
    nameAr: 'الناقل / مقاول النقل (Carrier)',
    nameEn: 'Carrier',
    category: 'ACTOR',
    shortDescAr: 'شركة أو مؤسسة النقل المعتمدة لنقل الشحنات والمواد بين الكسارات والمواقع.',
    roleInSystemAr: 'يمتلك ويدير أسطول الشاحنات ويوظف السائقين المعتمدين، وترتبط به شروط التعاقد والأسعار المتفق عليها.',
    relationships: [
      { target: 'Project', type: 'N:1', descAr: 'يرتبط بعقد مع مشروع أو أكثر.' },
      { target: 'Truck', type: '1:N', descAr: 'يمتلك أو يستأجر أسطول شاحنات مسجل نظامياً.' },
      { target: 'Driver', type: '1:N', descAr: 'يوظف سائقين مؤهلين برخص نظامية.' },
      { target: 'Pricing Rule', type: 'N:1', descAr: 'قد تخصصه قاعدة تسعير تعاقدية محددة.' },
      { target: 'Trip', type: '1:N', descAr: 'تُنسب له الرحلات المنفذة بواسطة أسطوله وسائقيه.' }
    ],
    keyAttributes: ['id', 'companyNameAr', 'commercialRegistrationNo', 'transportLicenseNo (TGA)', 'contactPerson'],
    rulesEnforcedAr: [
      'التحقق من سريان ترخيص الهيئة العامة للنقل (TGA) قبل اعتماد إسناد أي رحلة.'
    ]
  },
  {
    id: 'Pricing Rule',
    nameAr: 'قاعدة التسعير (Pricing Rule)',
    nameEn: 'Pricing Rule',
    category: 'COMMERCE',
    shortDescAr: 'مصفوفة خادومية تحدد كيفية تسعير الحمولة (طن، رد، كم) والضريبة وغرامات التأخير.',
    roleInSystemAr: 'تحسب الأجور آلياً على الخادم وتؤخذ منها لقطة تاريخية (Snapshot) داخل وثيقة الرحلة لضمان عدم تغير التكلفة مستقبلاً.',
    relationships: [
      { target: 'Project', type: 'N:1', descAr: 'تتبع لمشروع محدد وتخضع لسياساته المالية.' },
      { target: 'Material', type: 'N:1', descAr: 'ترتبط بنوع مادة محددة (مثل كتل، رمل، أسفلت).' },
      { target: 'Carrier', type: 'N:1', descAr: 'اختيارياً: قد ترتبط بناقل معين بناءً على شروط العقد.' },
      { target: 'Trip', type: '1:N', descAr: 'تُنسخ كـ Pricing Snapshot داخل كل رحلة عند إطلاقها.' }
    ],
    keyAttributes: ['id', 'pricingModel (PER_TON / PER_TRIP / PER_KM)', 'baseRateSAR', 'minimumBillableWeightKg', 'demurrageRatePerHourSAR', 'vatApplicable'],
    rulesEnforcedAr: [
      'المبدأ 6: العميل لا يحسب القيمة المالية النهائية؛ الحساب حصراً خادومي.',
      'تطبيق ضريبة القيمة المضافة 15% وفق ضوابط هيئة الزكاة والضريبة والجمارك ZATCA.'
    ]
  },
  {
    id: 'Material',
    nameAr: 'المادة (Material)',
    nameEn: 'Material',
    category: 'COMMERCE',
    shortDescAr: 'المادة الإنشائية أو الخام المنقولة ومواصفاتها الفيزيائية والتوريدية.',
    roleInSystemAr: 'تحدد معايير الكثافة ووحدة القياس ونسبة الرطوبة المسموحة ونوع الشاحنة المؤهلة لنقلها.',
    relationships: [
      { target: 'Project', type: 'N:1', descAr: 'مادة معتمدة في موقع المشروع.' },
      { target: 'Pricing Rule', type: '1:N', descAr: 'تحدد لها أسعار توريد بحسب المورد أو المسار.' },
      { target: 'Trip', type: '1:N', descAr: 'تُحدد المادة المنقولة في كل رحلة وتؤخذ لقطة من مواصفاتها.' }
    ],
    keyAttributes: ['id', 'code', 'nameAr', 'unitOfMeasure (TON/M3)', 'standardDensityTonPerM3', 'maxAllowableMoisturePercent'],
    rulesEnforcedAr: [
      'مطابقة نسبة الرطوبة والانكماش المسموحة (أقصاها 1.5% تفاوت بين ميزان الكسارة وميزان الموقع).'
    ]
  },
  {
    id: 'Truck',
    nameAr: 'الشاحنة (Truck)',
    nameEn: 'Truck',
    category: 'ACTOR',
    shortDescAr: 'المركبة المادية التابعة للناقل والمخصصة لنقل الحمولات الميدانية.',
    roleInSystemAr: 'تحمل الوزن الفارغ المعتمد (Tare Weight) والحد القانوني الأقصى للحمولة؛ يتم التحقق من سريان فحصها قبل كل إطلاق.',
    relationships: [
      { target: 'Carrier', type: 'N:1', descAr: 'شاحنة مسجلة ضمن أسطول الناقل.' },
      { target: 'Driver', type: '1:1', descAr: 'تُسند إلى سائق معتمد خلال فترة التشغيل.' },
      { target: 'Trip', type: '1:N', descAr: 'تنفذ رحلة واحدة نشطة في الوقت الفعلي منعاً للازدواجية.' }
    ],
    keyAttributes: ['id', 'plateNumberAr/En', 'truckType', 'tareWeightKg', 'maxGrossWeightKg', 'legalPayloadLimitKg', 'mvpiValidUntil'],
    rulesEnforcedAr: [
      'منع الرحلات الشبحية: لا يمكن إطلاق رحلة جديدة لشاحنة ما زالت في حالة رحلة نشطة غير مغلقة.'
    ]
  },
  {
    id: 'Driver',
    nameAr: 'السائق (Driver)',
    nameEn: 'Driver',
    category: 'ACTOR',
    shortDescAr: 'المشغّل الميداني التابع للناقل الذي يقود الشاحنة وينفذ الرحلة.',
    roleInSystemAr: 'يستخدم تطبيق PWA في وضع عدم الاتصال لتسجيل محطات الرحلة والتقاط صور تذاكر الموازين.',
    relationships: [
      { target: 'Carrier', type: 'N:1', descAr: 'سائق موثق يتبع للناقل.' },
      { target: 'Truck', type: '1:1', descAr: 'يقود شاحنة معينة مسندة إليه.' },
      { target: 'Trip', type: '1:N', descAr: 'يقوم بتنفيذ الرحلات الميدانية المسندة له.' }
    ],
    keyAttributes: ['id', 'fullNameAr', 'nationalOrIqamaId', 'phone (for OTP)', 'licenseNumber', 'licenseValidUntil'],
    rulesEnforcedAr: [
      'التحقق من سريان الإقامة أو الهوية ورخصة القيادة قبل إسناد الرحلة.'
    ]
  },
  {
    id: 'Trip',
    nameAr: 'الرحلة (Trip - الوحدة المركزية)',
    nameEn: 'Trip',
    category: 'CORE',
    shortDescAr: 'المعاملة التشغيلية والمحاسبية المحورية التي تربط جميع أطراف النطاق.',
    roleInSystemAr: 'تجمع بين المشروع والناقل والشاحنة والسائق والمادة والتسعير، وتخضع لآلة حالات FSM خادومية صارمة.',
    relationships: [
      { target: 'Project', type: 'N:1', descAr: 'تنفذ تحت مظلة مشروع محدد.' },
      { target: 'Carrier', type: 'N:1', descAr: 'تنفذ بواسطة مقاول نقل محدد.' },
      { target: 'Truck', type: 'N:1', descAr: 'تنفذ باستخدام شاحنة معتمدة.' },
      { target: 'Driver', type: 'N:1', descAr: 'يقودها سائق موثق.' },
      { target: 'Material', type: 'N:1', descAr: 'تنقل مادة مصرح بها.' },
      { target: 'Trip Event', type: '1:N', descAr: 'ينبثق منها تسلسل زمني للأحداث الميدانية.' },
      { target: 'Exception', type: '0:N', descAr: 'قد يُرفع عليها استثناء أو مخالفة توقف اعتمادها.' },
      { target: 'Audit Log', type: '1:N', descAr: 'توثق كافة العمليات الحساسة والتعديلات التي تطرأ عليها.' }
    ],
    keyAttributes: ['id', 'tripNumber', 'status (FSM)', 'weights (Tare, Gross, Net)', 'financials (Locked SAR)', 'pricingSnapshot'],
    rulesEnforcedAr: [
      'المبدأ 5: العميل لا يقرر الحالة النهائية؛ الخادم يقيم الانتقالات حصراً.',
      'المبدأ 1: Firestore هو مصدر الحقيقة الأوحد للرحلة وحالتها.',
      'المبدأ 2: تُسقط بيانات الرحلة المكتملة إلى Google Sheets كإسقاط تقارير.'
    ]
  },
  {
    id: 'Trip Event',
    nameAr: 'حدث الرحلة (Trip Event)',
    nameEn: 'Trip Event',
    category: 'CORE',
    shortDescAr: 'سجل زمني غير قابل للتعديل يوثق كل مرحلة ومحطة تمر بها الرحلة.',
    roleInSystemAr: 'يدفع آلة الحالات للأمام (DISPATCHED -> WEIGHED -> IN_TRANSIT -> OFFLOADED -> COMPLETED) مع التوقيت والإحداثيات.',
    relationships: [
      { target: 'Trip', type: 'N:1', descAr: 'حدث يتبع لرحلة محددة ويدفع حالتها للأمام.' },
      { target: 'Sync Operation', type: 'N:1', descAr: 'يتم مزامنته عبر غلاف عمليات المزامنة الميدانية.' }
    ],
    keyAttributes: ['id', 'tripId', 'eventType', 'statusResulting', 'deviceTimestamp', 'serverTimestamp', 'location', 'payload'],
    rulesEnforcedAr: [
      'التدفق غير قابل للتعديل (Append-Only Event Stream) لمنع التلاعب بسجل مسار الرحلة.'
    ]
  },
  {
    id: 'Exception',
    nameAr: 'الاستثناء التشغيلي (Exception)',
    nameEn: 'Exception',
    category: 'ASSURANCE',
    shortDescAr: 'انحراف تشغيلي أو مخالفة نظامية (حمولة زائدة، فرق ميزان، عطل، خروج عن المسار).',
    roleInSystemAr: 'يوقف استكمال الرحلة أو يمنع الفوترة التلقائية لحين مراجعة مدير المشروع واتخاذ قرار رسمي (قبول بتخفيض / رفض / غرامة).',
    relationships: [
      { target: 'Trip', type: 'N:1', descAr: 'استثناء مسجل على رحلة محددة.' },
      { target: 'Audit Log', type: '1:1', descAr: 'يُسجل في سجل التدقيق فور رفعه أو تسويته أو التنازل عنه.' }
    ],
    keyAttributes: ['id', 'tripId', 'type (OVERWEIGHT, WEIGHT_DISCREPANCY, ...)', 'severity', 'status', 'reportedBy', 'resolution'],
    rulesEnforcedAr: [
      'لا يمكن اعتماد الرحلة نهائياً وإغلاقها مالياً إذا كان هناك استثناء مفتوح من درجة BLOCKING.'
    ]
  },
  {
    id: 'Audit Log',
    nameAr: 'سجل التدقيق (Audit Log)',
    nameEn: 'Audit Log',
    category: 'ASSURANCE',
    shortDescAr: 'سجل أمني ومحاسبي غير قابل للتعديل (Tamper-Proof Append-Only Ledger).',
    roleInSystemAr: 'يوثق الفاعل، عنوان الـ IP، الفروقات قبل وبعد التعديل، والطابع الزمني الخادومي المعتمد.',
    relationships: [
      { target: 'Project', type: 'N:1', descAr: 'يتبع لنطاق مشروع محدد لأغراض الرقابة والتفتيش.' },
      { target: 'Trip', type: 'N:1', descAr: 'يوثق أي تعديل على موازين الرحلة أو حالتها أو قيمتها المالية.' }
    ],
    keyAttributes: ['id', 'projectId', 'entityType', 'entityId', 'action', 'actor (userId, IP, role)', 'changes (before/after)', 'serverTimestamp'],
    rulesEnforcedAr: [
      'المبدأ 12: جميع التغييرات الحساسة تُسجل في Audit Log؛ ممنوع الحذف أو التعديل نهائياً بقواعد الأمان.'
    ]
  },
  {
    id: 'Sync Operation',
    nameAr: 'عملية المزامنة (Sync Operation)',
    nameEn: 'Sync Operation',
    category: 'ASSURANCE',
    shortDescAr: 'غلاف العملية الميدانية لضمان عدم التكرار (Idempotency Envelope) عند العمل دون اتصال.',
    roleInSystemAr: 'يستخدم UUIDv4 كـ idempotencyKey؛ إذا أرسل العميل نفس العملية مرتين بسبب تقطع الشبكة، يكتشف الخادم ذلك ويعيد النتيجة السابقة دون مضاعفة السجلات.',
    relationships: [
      { target: 'Trip Event', type: '1:N', descAr: 'يحمل الأحداث الناتجة عن وضع عدم الاتصال إلى الخادم بأمان.' },
      { target: 'Project', type: 'N:1', descAr: 'يُسجل داخل مشروع محدد لتتبع حالة المزامنة.' }
    ],
    keyAttributes: ['id (idempotencyKey)', 'projectId', 'userId', 'clientOperationUUID', 'status', 'processedResponse', 'processedAt'],
    rulesEnforcedAr: [
      'المبدأ 9: جميع عمليات الكتابة Idempotent ولا تقبل التكرار إطلاقاً.',
      'المبدأ 11: النظام Offline-first يدعم تفريغ طابور IndexedDB بدفعات موثوقة.'
    ]
  }
];

export const MANDATORY_PRINCIPLES = [
  { num: 1, title: 'Firestore هو Source of Truth للعمليات', desc: 'قاعدة بيانات Firestore هي المصدر الأوحد والنهائي للحقيقة لكافة السجلات والعمليات والحالات والمقاييس.' },
  { num: 2, title: 'Google Sheets هو Operational/Reporting Projection', desc: 'Google Sheets مخصص كإسقاط تقارير وتشغيل لفرق المتابعة دون أي قدرة على تعديل حالة النظام الأساسية.' },
  { num: 3, title: 'Google Drive لتخزين ملفات المشروع والتقارير', desc: 'تخزين وتنظيم بوالص الشحن، صور تذاكر الموازين، وتقارير الفحص والـ PDF في مجلدات هرمية آمنة.' },
  { num: 4, title: 'جميع Business Rules على Server-Side', desc: 'جميع شروط العمل والتحقق من الانتقالات والحسابات الضريبية تُنفذ حصراً في بيئة الخادم الموثوقة.' },
  { num: 5, title: 'Client لا يقرر Status النهائي', desc: 'العميل يرسل مقترحات أحداث، بينما الخادم هو الكيان الوحيد المخول باعتماد التغيير وتحديث حالة الرحلة.' },
  { num: 6, title: 'Client لا يحسب القيمة المالية النهائية', desc: 'الحسابات المالية، أجور الأطنان، غرامات التأخير، وضريبة 15% ZATCA تُحسب خادومياً بواسطة محرك التسعير.' },
  { num: 7, title: 'Client لا يحدد Project Access', desc: 'صلاحيات المشاريع تُدار وتُفرض خادومياً عبر Firebase Custom Claims وقواعد Firestore Security Rules.' },
  { num: 8, title: 'لا توجد كلمات مرور أو API Secrets داخل Client', desc: 'مفاتيح Google Service Accounts والأسرار البرمجية موجودة حصراً في متغيرات بيئة الخادم process.env.' },
  { num: 9, title: 'جميع عمليات الكتابة Idempotent', desc: 'كل طلب يحمل معرّف UUID ومفتاح Idempotency لضمان تنفيذه مرة واحدة بالضبط ومنع الازدواجية عند إعادة الإرسال.' },
  { num: 10, title: 'النظام Multi-Project', desc: 'عزل تام للبيانات والسجلات والمستندات على مستوى المشاريع (Tenant Isolation) مع دعم مقاولين متعددي المشاريع.' },
  { num: 11, title: 'النظام Offline-First', desc: 'الواجهة تعمل بالكامل دون اتصال معتمدة على IndexedDB، وتزامن العمليات تلقائياً فور توفر الشبكة.' },
  { num: 12, title: 'جميع التغييرات الحساسة تسجل Audit Log', desc: 'سجل تدقيق غير قابل للحذف أو التعديل (Append-Only) يوثق الفاعل، التوقيت، والفروقات لكل تعديل حساس.' }
];
