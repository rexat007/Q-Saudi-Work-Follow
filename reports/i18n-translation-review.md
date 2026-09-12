# Professional Translation Review Queue (BLOCK 42)

This document contains domain-specific terminology requiring human verification and professional translation.
**Instructions:** Review Arabic canonical terminology, provide precise English and Urdu terms, and maintain parameter names.

## Domain: `trips` (683 items requiring review)

| Key | Arabic Source | Context | Priority | Reason & Placeholders |
| :--- | :--- | :--- | :--- | :--- |
| `trips.actions.cancel` | "إلغاء" | jsx_text | `MEDIUM` | Semantic conflict isolation |
| `trips.actions.view` | "عرض" | jsx_text | `MEDIUM` | Semantic conflict isolation |
| `trips.columns.events` | "events" | call_collection | `MEDIUM` | Domain-specific terminology translation |
| `trips.columns.projects` | "projects" | call_collection | `MEDIUM` | Domain-specific terminology translation |
| `trips.columns.trips` | "trips" | call_collection | `MEDIUM` | Domain-specific terminology translation |
| `trips.errors.trip` | "خطأ: سمح النظام بإتمام الرحلة دون إمكانية حساب variance بدقة!" | prop_serverMessage | `MEDIUM` | Domain-specific terminology translation |
| `trips.errors.tripLocation` | "خطأ: سمح النظام بإكمال الرحلة بدون تحديد مستلم الموقع أو وقت التفريغ!" | prop_serverMessage | `MEDIUM` | Domain-specific terminology translation |
| `trips.errors.trip_2` | "خطأ: سمح النظام للمستخدم بالتحكم برحلة تتبع مشروعاً آخر!" | prop_serverMessage | `MEDIUM` | Domain-specific terminology translation |
| `trips.errors.txt_2f4262` | "خطأ: سمح النظام بالقفز مباشرة من DRAFT إلى COMPLETED!" | prop_serverMessage | `MEDIUM` | Domain-specific terminology translation |
| `trips.errors.txt_6d3e6e` | "خطأ: سمح النظام للسائق باعتماد حالة التحميل!" | prop_serverMessage | `MEDIUM` | Domain-specific terminology translation |
| `trips.fields.cancelTrip` | "إلغاء الرحلة" | prop_labelAr | `MEDIUM` | Domain-specific terminology translation |
| `trips.fields.close` | "تسجيل استثناء مالي وتشغيلي رسمي (${exceptionId}) في قاعدة البيانات بسبب تفاوت وزن قدره (${calculatedVariance.toLocaleString()} كجم / ${variancePercent}%) يتجاوز الحد المسموح. هذا استثناء رسمي معتمد يمنع إغلاق التسوية المالية بدون اعتماد إداري." | template_literal | `HIGH` | Dynamic interpolation placeholders (Params: {exceptionId,variancePercent}; Protected: [KG]) |
| `trips.fields.confirmWeighbridge` | "تم تأكيد الوزن والتحميل بمحطة الميزان المركزية" | literal | `MEDIUM` | Domain-specific terminology translation |
| `trips.fields.create` | "إنشاء استثناء وزني رسمي (${exceptionId}) لتجاوز حد التفاوت المسموح" | template_literal | `HIGH` | Dynamic interpolation placeholders (Params: {exceptionId}) |
| `trips.fields.createTrip` | "تم إنشاء وترحيل الرحلة (${result.trip.tripSerial}) بنجاح! تم احتساب صافي الوزن (${result.trip.netWeight} كجم) والتسوية (${result.trip.settlementAmount} ريال) خادومياً." | template_literal | `HIGH` | Domain-specific terminology translation (Protected: [netWeight,settlementAmount,KG,SAR]) |
| `trips.fields.createTripPricing` | "تم إنشاء الرحلة واحتساب الوزن والتسعير خادومياً" | literal | `MEDIUM` | Domain-specific terminology translation |
| `trips.fields.createTripPricing_2` | "إنشاء الرحلة (${tripSerial}) بعد اجتياز فحص القواعد الستة واعتماد لقطة التسعير (${pricingSnapshot.ruleName}) واحتساب صافي الوزن (${calculatedNetWeight.toLocaleString()} كجم)." | template_literal | `HIGH` | Dynamic interpolation placeholders (Params: {tripSerial}; Protected: [KG]) |
| `trips.fields.download` | "تم التحميل والوزن" | literal | `MEDIUM` | Domain-specific terminology translation |
| `trips.fields.downloadLocationWeighbridge` | "اكتمال عملية التحميل في الموقع ووزن الميزان القائم والفارغ بالمصدر" | prop_descriptionAr | `MEDIUM` | Domain-specific terminology translation |
| `trips.fields.downloadTruck` | "تم وزن وتحميل الشاحنة (${truck?.plate || params.truckId}) بصافي حمولة (${calculatedNetWeight.toLocaleString()} كجم). تسعيرة معتمدة: (${pricingRule.name} - ${agreedRate} ${currency} / ${pricingType === 'PER_TON' ? 'طن' : 'رد'})." | template_literal | `HIGH` | Dynamic interpolation placeholders (Params: {agreedRate,currency}; Protected: [pricingType,KG,TON]) |
| ... | *and 663 more items in this domain queue* | | | |

## Domain: `loading` (239 items requiring review)

| Key | Arabic Source | Context | Priority | Reason & Placeholders |
| :--- | :--- | :--- | :--- | :--- |
| `loading.fields.carrier` | "الناقل" | prop_label | `MEDIUM` | Semantic conflict isolation |
| `loading.fields.confirm` | "لا يمكن تأكيد الرحلة: الوزن القائم يجب أن يكون أكبر من وزن الفارغ." | prop_message | `MEDIUM` | Domain-specific terminology translation |
| `loading.fields.createConfirmTrip` | "تم إنشاء وتأكيد الرحلة بنجاح! رقم الرحلة: ${result.trip.tripSerial} - التذكرة: ${result.trip.ticketId} (الحالة: في الطريق IN_TRANSIT)" | template_literal | `HIGH` | Domain-specific terminology translation (Protected: [ticketId]) |
| `loading.fields.createTrip` | "تم إنشاء الرحلة محلياً في وضع عدم الاتصال (Offline)! رقم الرحلة: ${localTripSerial} - وتم إدراجها في قائمة المزامنة (Outbox - PENDING) للمزامنة عند عودة الاتصال." | template_literal | `HIGH` | Dynamic interpolation placeholders (Params: {localTripSerial}) |
| `loading.fields.download` | "تسلسل خطوات التحميل والوزن بالمصدر، احتساب صافي الحمولة، والتحقق من التسعيرة قبل الترحيل" | jsx_text | `MEDIUM` | Domain-specific terminology translation |
| `loading.fields.driver` | "السائق" | prop_label | `MEDIUM` | Semantic conflict isolation |
| `loading.fields.edit` | ") برمجياً بناءً على صافي الوزن المعتمد وسعر العقد. لا يُسمح بإدخال أو تعديل القيمة من الواجهة لضمان الشفافية المحاسبية." | jsx_text | `MEDIUM` | Domain-specific terminology translation |
| `loading.fields.edit_2` | "منع تعديل التسوية أو الوزن الصافي من الواجهة" | prop_name | `MEDIUM` | Domain-specific terminology translation |
| `loading.fields.material` | "المادة" | prop_label | `MEDIUM` | Semantic conflict isolation |
| `loading.fields.price` | "السعر المتفق عليه (Agreed Rate)" | jsx_text | `MEDIUM` | Domain-specific terminology translation |
| `loading.fields.priceConfirm` | "مراجعة صافي الوزن، نوع التسعير، السعر المتفق عليه، والتسوية التقديرية قبل التأكيد" | jsx_text | `MEDIUM` | Domain-specific terminology translation |
| `loading.fields.pricing` | "المعاينة والتسعير" | prop_label | `MEDIUM` | Domain-specific terminology translation |
| `loading.fields.pricingConfirm` | "تم تضمين بطاقة حسابية بارزة في خطوة المعاينة (Preview) تعرض اسم العقد، نوع التسعير (PER_TON / PER_TRIP)، وسلسلة العملية الحسابية كاملة قبل الضغط على زر التأكيد والترحيل." | jsx_text | `HIGH` | Domain-specific terminology translation |
| `loading.fields.pricing_2` | "قاعدة التسعير منتهية الصلاحية أو غير سارية بتاريخ اليوم (${activePricingRule.effectiveFrom} إلى ${activePricingRule.effectiveTo})." | template_literal | `HIGH` | Domain-specific terminology translation |
| `loading.fields.project` | "المشروع" | prop_label | `MEDIUM` | Semantic conflict isolation |
| `loading.fields.status` | ": نقل الحالة رسمياً إلى IN_TRANSIT وتوليد رقم التذكرة والنسخة" | jsx_text | `MEDIUM` | Domain-specific terminology translation |
| `loading.fields.ticketNumber` | "رقم التذكرة:" | jsx_text | `MEDIUM` | Semantic conflict isolation |
| `loading.fields.total` | "تنبيه وزن إجمالي مرتفع: الوزن الإجمالي (${(grossWeight / 1000).toFixed(1)} طن) قد يعرض المركبة لمخالفة الموازين المتنقلة." | template_literal | `HIGH` | Domain-specific terminology translation (Protected: [grossWeight,TON]) |
| `loading.fields.trip` | "رقم الرحلة:" | jsx_text | `MEDIUM` | Semantic conflict isolation |
| `loading.fields.trip_2` | "حظر الرحلة في حال كان الوزن القائم أقل من أو يساوي الفارغ" | prop_name | `MEDIUM` | Domain-specific terminology translation |
| ... | *and 219 more items in this domain queue* | | | |

## Domain: `unloading` (199 items requiring review)

| Key | Arabic Source | Context | Priority | Reason & Placeholders |
| :--- | :--- | :--- | :--- | :--- |
| `unloading.actions.trk9901` | "TRK-9901" | call_handleSearch | `MEDIUM` | Domain-specific terminology translation |
| `unloading.actions.trpNeom8892` | "TRP-NEOM-8892" | call_handleSearch | `MEDIUM` | Domain-specific terminology translation |
| `unloading.actions.trpUnknown999` | "TRP-UNKNOWN-999" | call_handleSearch | `MEDIUM` | Domain-specific terminology translation |
| `unloading.actions.txt_75235b` | "د هـ و 5678" | call_handleSearch | `HIGH` | Semantic conflict isolation |
| `unloading.actions.wbTkt99106` | "WB-TKT-99106" | call_handleSearch | `MEDIUM` | Domain-specific terminology translation |
| `unloading.fields.create` | "تنبيه رقابي صارم: فارق الوزن (${result.varianceWeight.toLocaleString()} كجم) خارج نسبة التسامح المسموحة! تم رسمياً إنشاء كائن استثناء (${result.exceptionCreated.exceptionId}) في قاعدة البيانات وسجل التدقيق." | template_literal | `HIGH` | Domain-specific terminology translation (Protected: [varianceWeight,KG]) |
| `unloading.fields.netWeight` | "الوزن الصافي:" | jsx_text | `MEDIUM` | Semantic conflict isolation |
| `unloading.fields.recInspector01` | "REC-INSPECTOR-01" | attr_placeholder | `MEDIUM` | Domain-specific terminology translation |
| `unloading.fields.refreshStatus` | "تم إكمال التفريغ بنجاح: تم احتساب فارق الوزن خادومياً (${result.varianceWeight.toLocaleString()} كجم) وتحديث الحقول الـ 5 وترقية الحالة إلى [COMPLETED]." | template_literal | `HIGH` | Domain-specific terminology translation (Protected: [varianceWeight,KG]) |
| `unloading.fields.search` | "نجح البحث الأساسي برقم السريال: ${searchResult.trip?.tripSerial} وأرجع حالة CONTINUE" | template_literal | `HIGH` | Domain-specific terminology translation (Protected: [SAR]) |
| `unloading.fields.searchCreate` | "منظومة استلام وتفريغ الشحنات بالموقع: البحث بالتدرج الإلزامي (tripSerial ➔ ticketId ➔ truckId)، حظر البحث باللوحة المنفردة، التدرج التشغيلي للحالات، واحتساب فارق الوزن خادومياً وإنشاء كائنات الاستثناءات الرسمية عند تجاوز التفاوت." | jsx_text | `MEDIUM` | Domain-specific terminology translation (Protected: [ticketId]) |
| `unloading.fields.searchTrip` | "البحث الأساسي: المطابقة برقم الرحلة (tripSerial)" | prop_name | `MEDIUM` | Domain-specific terminology translation |
| `unloading.fields.search_2` | "البحث الثانوي: المطابقة برقم التذكرة (ticketId)" | prop_name | `MEDIUM` | Domain-specific terminology translation (Protected: [ticketId]) |
| `unloading.fields.trip` | "أدخل رقم الرحلة (مثال: TRP-NEOM-8892) أو رقم التذكرة أو معرف الشاحنة..." | attr_placeholder | `HIGH` | Domain-specific terminology translation |
| `unloading.fields.tripTruck` | "أدخل رقم الرحلة (tripSerial) أو رقم التذكرة (ticketId) أو معرف الشاحنة (truckId) لبدء إجراءات الاستلام والتفريغ." | jsx_text | `MEDIUM` | Domain-specific terminology translation (Protected: [ticketId]) |
| `unloading.fields.trip_2` | "رقم الرحلة السريال" | jsx_text | `HIGH` | Domain-specific terminology translation (Protected: [SAR]) |
| `unloading.fields.txt_1023cc` | "عجز وزني كبير غير مبرر أثناء التفريغ" | prop_notes | `MEDIUM` | Domain-specific terminology translation |
| `unloading.fields.txt_2c8454` | "يجب إدخال صافي وزن الوصول (destNetWeight) كقيمة موجبة أكبر من صفر." | prop_message | `MEDIUM` | Domain-specific terminology translation |
| `unloading.fields.txt_33fd22` | "فارق الوزن المحسوب خادومياً" | jsx_text | `MEDIUM` | Domain-specific terminology translation |
| `unloading.fields.txt_484cef` | "صافي وزن الوصول (كجم)" | jsx_text | `HIGH` | Domain-specific terminology translation (Protected: [KG]) |
| ... | *and 179 more items in this domain queue* | | | |

## Domain: `weighbridge` (521 items requiring review)

| Key | Arabic Source | Context | Priority | Reason & Placeholders |
| :--- | :--- | :--- | :--- | :--- |
| `weighbridge.fields.0` | "0" | call_setTareInput | `MEDIUM` | Domain-specific terminology translation |
| `weighbridge.fields.120` | "-120" | call_setEvalVarianceInput | `MEDIUM` | Domain-specific terminology translation |
| `weighbridge.fields.380` | "-380" | call_setEvalVarianceInput | `MEDIUM` | Domain-specific terminology translation |
| `weighbridge.fields.500` | "500" | attr_placeholder | `MEDIUM` | Domain-specific terminology translation |
| `weighbridge.fields.750` | "-750" | call_setEvalVarianceInput | `MEDIUM` | Domain-specific terminology translation |
| `weighbridge.fields.carrier` | "الناقل / شركة النقل" | prop_labelAr | `MEDIUM` | Domain-specific terminology translation |
| `weighbridge.fields.carrier_2` | "رقم اتفاقية الناقل المعتمدة" | prop_descriptionAr | `MEDIUM` | Domain-specific terminology translation |
| `weighbridge.fields.date` | "التاريخ" | prop_'التاريخ' | `HIGH` | Semantic conflict isolation |
| `weighbridge.fields.dateTruck` | "التاريخ (date)، رقم التذكرة (ticketId)، رقم الشاحنة (truckNo)، الوزن الفارغ (tare)، الوزن القائم (gross)." | jsx_text | `HIGH` | Domain-specific terminology translation (Protected: [ticketId,truckNo]) |
| `weighbridge.fields.download` | "أنت بصدد اتخاذ قرار رقابي باعتماد وزن صافي المصدر المسجل بميزان التحميل كوزن صافي نهائي لموقع الوصول للشحنة التالية:" | jsx_text | `MEDIUM` | Domain-specific terminology translation |
| `weighbridge.fields.download_2` | "وزن المصدر غير صالح (${loadedNet} كجم). يجب أن يكون صافي التحميل أكبر من صفر (net > 0)." | template_literal | `HIGH` | Dynamic interpolation placeholders (Params: {loadedNet}; Protected: [KG]) |
| `weighbridge.fields.download_3` | "محطة التحميل" | prop_labelAr | `MEDIUM` | Semantic conflict isolation |
| `weighbridge.fields.download_4` | "وقت التحميل" | prop_labelAr | `MEDIUM` | Semantic conflict isolation |
| `weighbridge.fields.driverName` | "اسم السائق" | prop_labelAr | `MEDIUM` | Semantic conflict isolation |
| `weighbridge.fields.errorPricing` | "خطأ في نوع التسعير" | prop_formula | `MEDIUM` | Domain-specific terminology translation |
| `weighbridge.fields.location` | "وزن الصافي المستلم بالموقع (receivedNet) مفقود (يجب أن يكون null وليس 0)." | call_push | `HIGH` | Domain-specific terminology translation |
| `weighbridge.fields.material` | "المادة / الصنف" | prop_labelAr | `MEDIUM` | Domain-specific terminology translation |
| `weighbridge.fields.material_2` | "اسم أو رمز المادة المحملة" | prop_descriptionAr | `MEDIUM` | Domain-specific terminology translation |
| `weighbridge.fields.netWeight` | "الوزن الصافي" | prop_'الوزن الصافي' | `MEDIUM` | Semantic conflict isolation |
| `weighbridge.fields.null` | "null" | attr_placeholder | `MEDIUM` | Semantic conflict isolation |
| ... | *and 501 more items in this domain queue* | | | |

## Domain: `imports` (1570 items requiring review)

| Key | Arabic Source | Context | Priority | Reason & Placeholders |
| :--- | :--- | :--- | :--- | :--- |
| `imports.actions.cancel` | "إلغاء" | jsx_text | `MEDIUM` | Semantic conflict isolation |
| `imports.actions.cancel_2` | "cancel" | call_includes | `MEDIUM` | Domain-specific terminology translation |
| `imports.actions.download` | "تحميل" | call_includes | `MEDIUM` | Semantic conflict isolation |
| `imports.columns.importBatches` | "import_batches" | call_collection | `MEDIUM` | Domain-specific terminology translation |
| `imports.columns.none` | "NONE" | prop_matchMethod | `MEDIUM` | Domain-specific terminology translation |
| `imports.columns.projects` | "projects" | call_collection | `MEDIUM` | Domain-specific terminology translation |
| `imports.columns.tkt` | "TKT-" | call_startsWith | `MEDIUM` | Domain-specific terminology translation |
| `imports.fields.all` | "ALL" | call_setFormatFilter | `MEDIUM` | Domain-specific terminology translation |
| `imports.fields.batchtype` | "batchType" | prop_field | `MEDIUM` | Domain-specific terminology translation |
| `imports.fields.carrier` | "الناقل (Carrier)" | prop_field | `MEDIUM` | Semantic conflict isolation |
| `imports.fields.carrierMaterialTrip` | "لا توجد اتفاقية تسعير سارية لهذا الناقل والمادة في تاريخ الرحلة" | literal | `HIGH` | Domain-specific terminology translation |
| `imports.fields.carrierName` | "اسم الناقل" | literal | `MEDIUM` | Semantic conflict isolation |
| `imports.fields.carrier_2` | "carrier" | prop_fieldKey | `MEDIUM` | Domain-specific terminology translation |
| `imports.fields.carrier_3` | "اسم الناقل المعتمد" | literal | `MEDIUM` | Domain-specific terminology translation |
| `imports.fields.completed` | "رقم البوليصة [${rawWaybill}] مسجل مسبقاً في النظام ومكتمل الترحيل." | template_literal | `HIGH` | Dynamic interpolation placeholders (Params: {rawWaybill}) |
| `imports.fields.csv` | "CSV" | call_setFormatFilter | `MEDIUM` | Domain-specific terminology translation |
| `imports.fields.date` | "التاريخ" | jsx_text | `HIGH` | Semantic conflict isolation |
| `imports.fields.date_2` | "صيغة التاريخ غير صالحة (${dateStr}). يجب أن تكون YYYY-MM-DD." | template_literal | `HIGH` | Dynamic interpolation placeholders (Params: {dateStr}) |
| `imports.fields.destnetweight` | "destNetWeight" | prop_canonicalField | `MEDIUM` | Domain-specific terminology translation |
| `imports.fields.driver` | "اكتب سبب قبول هذه التحذيرات (مثال: تم التأكد من هوية السائق ورقياً، أو تم التنسيق مع مقاول النقل)..." | attr_placeholder | `MEDIUM` | Domain-specific terminology translation |
| ... | *and 1550 more items in this domain queue* | | | |

## Domain: `entityResolution` (342 items requiring review)

| Key | Arabic Source | Context | Priority | Reason & Placeholders |
| :--- | :--- | :--- | :--- | :--- |
| `entityResolution.actions.cancel` | "إلغاء" | jsx_text | `MEDIUM` | Semantic conflict isolation |
| `entityResolution.columns.05` | "05" | call_startsWith | `MEDIUM` | Domain-specific terminology translation |
| `entityResolution.columns.9665` | "9665" | call_startsWith | `MEDIUM` | Domain-specific terminology translation |
| `entityResolution.fields.confirmTripCreatePrice` | "تم تأكيد اعتماد الرحلة بقيمة (${originalRate} ر.س) استناداً للقطة وقت الإنشاء دون أي تأثر بالسعر المحدث." | template_literal | `HIGH` | Dynamic interpolation placeholders (Params: {originalRate}; Protected: [SAR]) |
| `entityResolution.fields.failedPrice` | "فشل اكتشاف تعارض السعر أو حماية اللقطة" | literal | `MEDIUM` | Domain-specific terminology translation |
| `entityResolution.fields.price` | "اكتشاف تغير السعر الخادومي مع حماية اللقطة (PRICING_CHANGED)" | prop_nameAr | `MEDIUM` | Domain-specific terminology translation |
| `entityResolution.fields.priceCreateSuccessTrip` | "تم حماية لقطة السعر وقت الإنشاء بنجاح دون المساس بقيمة الرحلة الأصلية" | literal | `MEDIUM` | Domain-specific terminology translation |
| `entityResolution.fields.price_2` | "ثبات تسعير الـ Offline وعدم تأثره بتحديثات السعر اللاحقة (Pricing Invariance)" | prop_nameAr | `MEDIUM` | Domain-specific terminology translation |
| `entityResolution.fields.success` | "تم توثيق التدقيق وسجل الحل الصريح وهوية المسؤول وتاريخ القرار بنجاح" | literal | `HIGH` | Domain-specific terminology translation |
| `entityResolution.fields.txt_25c8e3` | "- اختلاف في حرف المد/الألف (قد يمثل اسماً أو عائلة مختلفة، لا يجوز الدمج التلقائي)" | literal | `MEDIUM` | Domain-specific terminology translation |
| `entityResolution.fields.txt_275bd1` | "الوزن الفارغ للشاحنة أكبر من أو يساوي الوزن الإجمالي، وهذا مخالف هندسياً." | call_push | `MEDIUM` | Domain-specific terminology translation |
| `entityResolution.fields.txt_2ef270` | "خلطة إسفلتية ساخنة درجة 60/70" | call_setSandboxInput | `HIGH` | Semantic conflict isolation |
| `entityResolution.fields.txt_2f9dc3` | "شركة الفازي للنقل" | call_setSandboxInput | `MEDIUM` | Semantic conflict isolation |
| `entityResolution.fields.txt_30ba67` | "رقم الجوال غير مطابق للنمط السعودي (+9665xxxxxxx أو 05xxxxxxx)." | call_push | `HIGH` | Domain-specific terminology translation |
| `entityResolution.fields.txt_3578c7` | "إعادة إصدار تذكرة جديدة برقم معتمد لفك التكرار" | prop_justification | `MEDIUM` | Domain-specific terminology translation |
| `entityResolution.fields.txt_4bfaca` | "اكتب القيمة المدخلة..." | attr_placeholder | `MEDIUM` | Domain-specific terminology translation |
| `entityResolution.fields.txt_5045a4` | "أ ب ج 1234" | call_setSandboxInput | `HIGH` | Semantic conflict isolation |
| `entityResolution.fields.txt_6014d9` | "تذكرة رقم 0123456789" | literal | `HIGH` | Domain-specific terminology translation |
| `entityResolution.fields.txt_61d881` | "شركة المجدوعي اللوجستية" | call_setSandboxInput | `MEDIUM` | Semantic conflict isolation |
| `entityResolution.fields.txt_627907` | "خالد عبدالله الشمري" | call_setSandboxInput | `MEDIUM` | Semantic conflict isolation |
| ... | *and 322 more items in this domain queue* | | | |

## Domain: `pricing` (491 items requiring review)

| Key | Arabic Source | Context | Priority | Reason & Placeholders |
| :--- | :--- | :--- | :--- | :--- |
| `pricing.actions.cancel` | "إلغاء" | jsx_text | `MEDIUM` | Semantic conflict isolation |
| `pricing.columns.pricingRules` | "pricing_rules" | call_collection | `MEDIUM` | Domain-specific terminology translation |
| `pricing.columns.projects` | "projects" | call_collection | `MEDIUM` | Domain-specific terminology translation |
| `pricing.fields.active` | "تاريخ نشط (2026-09-09)" | jsx_text | `HIGH` | Domain-specific terminology translation |
| `pricing.fields.cancelPrice` | "إلغاء بدل الانتظار الثابت المخمن (150 ريال) عند غياب السعر التعاقدي" | call_record | `HIGH` | Domain-specific terminology translation (Protected: [SAR]) |
| `pricing.fields.carrier` | "يرجى تحديد الناقل المستهدف بالاتفاقية" | call_setFormError | `MEDIUM` | Domain-specific terminology translation |
| `pricing.fields.carrierMaterialDate` | "يوجد أكثر من قاعدة تسعير متداخلة سارية لنفس الناقل والمادة في هذا التاريخ (${candidatePool.map(c => c.pricingRuleId).join(', ')})" | template_literal | `HIGH` | Domain-specific terminology translation |
| `pricing.fields.carrierTrip` | "تسعيرة الناقل تبدأ بتاريخ مستقبلي [${futureRules[0].effectiveFrom}] وتاريخ الرحلة [${targetDate}] سابق لها" | template_literal | `HIGH` | Dynamic interpolation placeholders (Params: {targetDate}) |
| `pricing.fields.carrier_2` | "تسعيرة الناقل منتهية الصلاحية بتاريخ ${expiredRules[0].effectiveTo} (تاريخ الرحلة: ${targetDate})" | template_literal | `HIGH` | Dynamic interpolation placeholders (Params: {targetDate}) |
| `pricing.fields.confirmPrice` | "تم تأكيد أن السعر غير المخمن يظل صفراً مع تعليق التسوية" | call_record | `MEDIUM` | Domain-specific terminology translation |
| `pricing.fields.currency` | "currency" | prop_field | `MEDIUM` | Domain-specific terminology translation |
| `pricing.fields.date` | "تحديد التسعيرة السارية ضمن التاريخ الفعال" | call_record | `HIGH` | Domain-specific terminology translation |
| `pricing.fields.demurragerateperhoursar` | "demurrageRatePerHourSAR" | prop_field | `MEDIUM` | Domain-specific terminology translation (Protected: [SAR]) |
| `pricing.fields.edit` | "لا يمكن تعديل المبالغ التاريخية للرحلات المنجزة" | call_record | `HIGH` | Domain-specific terminology translation |
| `pricing.fields.editPriceCreateTrips` | "تعديل السعر بإنشاء نسخة جديدة لحماية الرحلات السابقة" | attr_title | `MEDIUM` | Domain-specific terminology translation |
| `pricing.fields.editPriceTrips` | "وفقاً لقواعد النزاهة المالية، لن يتم تعديل السعر القديم مباشرة داخل القاعدة السابقة لحماية الرحلات المنجزة. سيتم تجميد الإصدار" | jsx_text | `MEDIUM` | Domain-specific terminology translation |
| `pricing.fields.editPricingTripCreateTrips` | "رفض أمني (حماية النزاهة المالية والتاريخية): ممنوع تعديل سعر قاعدة التسعير الحالية مباشرة لأنها مرتبطة بـ (${linkedTripsCount}) رحلة تاريخية مسجلة. يجب استخدام نظام النسخ عند التعديل (Copy-on-Write Versioning) وإنشاء نسخة جديدة لضمان عدم تأثر الرحلات السابقة." | template_literal | `HIGH` | Dynamic interpolation placeholders (Params: {linkedTripsCount}) |
| `pricing.fields.effectivefrom` | "effectiveFrom" | prop_field | `MEDIUM` | Domain-specific terminology translation |
| `pricing.fields.effectiveto` | "effectiveTo" | prop_field | `MEDIUM` | Domain-specific terminology translation |
| `pricing.fields.materialDate` | "لا توجد تسعيرة متوافقة مع المادة [${params.materialId || 'عام'}] للناقل المحدد في هذا التاريخ" | template_literal | `HIGH` | Domain-specific terminology translation (Protected: [materialId]) |
| ... | *and 471 more items in this domain queue* | | | |

## Domain: `reports` (561 items requiring review)

| Key | Arabic Source | Context | Priority | Reason & Placeholders |
| :--- | :--- | :--- | :--- | :--- |
| `reports.actions.view` | "عرض" | jsx_text | `MEDIUM` | Semantic conflict isolation |
| `reports.fields.approver` | "Approver" | prop_labelEn | `MEDIUM` | Domain-specific terminology translation |
| `reports.fields.badge` | "badge" | prop_format | `MEDIUM` | Domain-specific terminology translation |
| `reports.fields.carrier` | "اسم الناقل اللوجستي" | prop_labelAr | `MEDIUM` | Domain-specific terminology translation |
| `reports.fields.carrier_2` | "الناقل التابع" | prop_labelAr | `MEDIUM` | Domain-specific terminology translation |
| `reports.fields.carrier_3` | "Carrier" | prop_labelEn | `MEDIUM` | Domain-specific terminology translation |
| `reports.fields.carrier_4` | "الناقل" | prop_labelAr | `MEDIUM` | Semantic conflict isolation |
| `reports.fields.carrier_5` | "الناقل المعني" | prop_labelAr | `MEDIUM` | Domain-specific terminology translation |
| `reports.fields.carrier_6` | "معدل إنجاز الناقل" | prop_primaryMetricLabel | `MEDIUM` | Domain-specific terminology translation |
| `reports.fields.carriers` | "الناقلون المنفذون" | prop_labelAr | `MEDIUM` | Domain-specific terminology translation |
| `reports.fields.carriers_2` | "Carriers" | prop_labelEn | `MEDIUM` | Domain-specific terminology translation |
| `reports.fields.completed` | "Completed" | prop_labelEn | `MEDIUM` | Domain-specific terminology translation |
| `reports.fields.compliance` | "Compliance" | prop_labelEn | `MEDIUM` | Domain-specific terminology translation |
| `reports.fields.currency` | "currency" | prop_format | `MEDIUM` | Domain-specific terminology translation |
| `reports.fields.date` | "التاريخ" | prop_labelAr | `HIGH` | Semantic conflict isolation |
| `reports.fields.date_2` | "Date" | prop_labelEn | `MEDIUM` | Domain-specific terminology translation |
| `reports.fields.date_3` | "date" | prop_format | `MEDIUM` | Domain-specific terminology translation |
| `reports.fields.description` | "Description" | prop_labelEn | `MEDIUM` | Domain-specific terminology translation |
| `reports.fields.exceptions` | "Exceptions" | prop_labelEn | `MEDIUM` | Domain-specific terminology translation |
| `reports.fields.formula` | "Formula" | prop_labelEn | `MEDIUM` | Domain-specific terminology translation |
| ... | *and 541 more items in this domain queue* | | | |

## Domain: `security` (502 items requiring review)

| Key | Arabic Source | Context | Priority | Reason & Placeholders |
| :--- | :--- | :--- | :--- | :--- |
| `security.actions.cancel` | "إلغاء" | jsx_text | `MEDIUM` | Semantic conflict isolation |
| `security.columns.trips` | "trips" | prop_targetCollection | `MEDIUM` | Domain-specific terminology translation |
| `security.fields.action` | "action" | prop_field | `MEDIUM` | Domain-specific terminology translation |
| `security.fields.auditlogid` | "auditLogId" | prop_field | `MEDIUM` | Domain-specific terminology translation |
| `security.fields.carrier` | "رقم الناقل" | jsx_text | `MEDIUM` | Domain-specific terminology translation |
| `security.fields.carrierName` | "اسم الناقل" | jsx_text | `MEDIUM` | Semantic conflict isolation |
| `security.fields.createSuccessTrip` | "تم إنشاء النسخة الجديدة (${result.newVersionRule.pricingRuleId}) بنجاح بمعدل ${result.newVersionRule.agreedRate} ${result.newVersionRule.currency}. تم تأمين وحماية ${result.protectedTripsCount} رحلة تاريخية في السجل المحاسبي دون أي تعديل!" | template_literal | `HIGH` | Domain-specific terminology translation |
| `security.fields.date` | "رقم القيد والتاريخ" | jsx_text | `HIGH` | Domain-specific terminology translation |
| `security.fields.driver` | "رقم السائق" | jsx_text | `MEDIUM` | Domain-specific terminology translation |
| `security.fields.driverName` | "اسم السائق" | jsx_text | `MEDIUM` | Semantic conflict isolation |
| `security.fields.edit` | "سجل تدقيق تاريخي غير قابل للحذف أو التعديل لجميع العمليات الحساسة" | prop_desc | `HIGH` | Domain-specific terminology translation |
| `security.fields.editPriceCreate` | "تعديل السعر بإنشاء نسخة جديدة لحماية السجلات السابقة" | attr_title | `MEDIUM` | Domain-specific terminology translation |
| `security.fields.editPriceTrips` | "تعديل السعر المعتمد (إنشاء النسخة v${(rule.version || 1) + 1}) وحماية الرحلات السابقة" | template_literal | `HIGH` | Domain-specific terminology translation |
| `security.fields.editPricing` | "ممنوع تعديل سعر قاعدة التسعير الحالية مباشرة" | call_includes | `MEDIUM` | Semantic conflict isolation |
| `security.fields.editPricingTrips` | "فشل: سمح النظام بتعديل سعر قاعدة التسعير الحالية مباشرة مما يهدد الرحلات السابقة!" | literal | `MEDIUM` | Domain-specific terminology translation |
| `security.fields.editTrips` | "عند تعديل أي قاعدة تسعير، لا يتم المساس بالرحلات السابقة (Historical Trips) إطلاقاً. يتم توليد نسخة جديدة (Version) تسري فقط من تاريخ النفاذ الجديد، بينما تظل كافة الرحلات السابقة محتفظة بلقطة التعرفة الأصلية." | jsx_text | `HIGH` | Domain-specific terminology translation |
| `security.fields.edit_2` | "حظر التعديل المباشر للسعر وإلزام استخدام النسخ عند التعديل (Copy-on-Write Versioning)" | prop_expectedBehavior | `MEDIUM` | Domain-specific terminology translation |
| `security.fields.edit_3` | "حظر تعديل صافي وزن الوجهة (destNetWeight) مباشرة" | prop_titleAr | `MEDIUM` | Domain-specific terminology translation |
| `security.fields.edit_4` | "حظر تعديل فارق الوزن (varianceWeight) مباشرة" | prop_titleAr | `MEDIUM` | Domain-specific terminology translation (Protected: [varianceWeight]) |
| `security.fields.entity` | "entity" | prop_field | `MEDIUM` | Domain-specific terminology translation |
| ... | *and 482 more items in this domain queue* | | | |

## Domain: `offline` (392 items requiring review)

| Key | Arabic Source | Context | Priority | Reason & Placeholders |
| :--- | :--- | :--- | :--- | :--- |
| `offline.actions.readonly` | "readonly" | call_transaction | `MEDIUM` | Domain-specific terminology translation |
| `offline.actions.readwrite` | "readwrite" | call_transaction | `MEDIUM` | Domain-specific terminology translation |
| `offline.columns.conflictid` | "conflictId" | prop_keyPath | `MEDIUM` | Domain-specific terminology translation |
| `offline.columns.operationid` | "operationId" | prop_keyPath | `MEDIUM` | Domain-specific terminology translation |
| `offline.columns.pricingruleid` | "pricingRuleId" | prop_keyPath | `MEDIUM` | Domain-specific terminology translation |
| `offline.columns.projects` | "projects" | call_collection | `MEDIUM` | Domain-specific terminology translation |
| `offline.columns.storename` | "storeName" | prop_keyPath | `MEDIUM` | Domain-specific terminology translation |
| `offline.columns.syncOperations` | "sync_operations" | call_collection | `MEDIUM` | Domain-specific terminology translation |
| `offline.columns.tripid` | "tripId" | prop_keyPath | `MEDIUM` | Semantic conflict isolation |
| `offline.columns.trips` | "trips" | prop_targetCollection | `MEDIUM` | Domain-specific terminology translation |
| `offline.columns.truckid` | "truckId" | prop_keyPath | `MEDIUM` | Semantic conflict isolation |
| `offline.fields.agreedrate` | "agreedRate" | prop_field | `MEDIUM` | Domain-specific terminology translation |
| `offline.fields.carrier` | "تعارض الناقل للشاحنة (TRUCK_CARRIER_CONFLICT)" | prop_label | `MEDIUM` | Domain-specific terminology translation |
| `offline.fields.carrier_2` | "الناقل المفوض" | prop_fieldLabelAr | `MEDIUM` | Domain-specific terminology translation |
| `offline.fields.clientoperationuuid` | "clientOperationUUID" | prop_field | `MEDIUM` | Domain-specific terminology translation |
| `offline.fields.confirmTripRefresh` | "تم تأكيد واعتماد الرحلة مع المحافظة التامة على سعر اللقطة التعاقدية الأصلية (${snapshot.agreedRate} ر.س) دون تأثر بتحديث الأسعار الخادومي." | template_literal | `HIGH` | Domain-specific terminology translation (Protected: [SAR]) |
| `offline.fields.download` | "سعر لقطة وثيقة التحميل (Snapshot):" | jsx_text | `MEDIUM` | Domain-specific terminology translation |
| `offline.fields.download_2` | "الخيار القياسي المعتمد: المحافظة على سعر لقطة وثيقة التحميل (Lock Snapshot Rate)" | jsx_text | `MEDIUM` | Domain-specific terminology translation |
| `offline.fields.edit` | "يتطلب موافقة خطية ومبرراً رسمياً لتعديل سعر التعاقد الأصلي للرحلة." | jsx_text | `MEDIUM` | Domain-specific terminology translation |
| `offline.fields.editPriceCreateTrip` | "تم تعديل السعر المعتمد على الخادم بعد إنشاء الرحلة Offline" | prop_reasonAr | `MEDIUM` | Domain-specific terminology translation |
| ... | *and 372 more items in this domain queue* | | | |

## Domain: `exceptions` (337 items requiring review)

| Key | Arabic Source | Context | Priority | Reason & Placeholders |
| :--- | :--- | :--- | :--- | :--- |
| `exceptions.actions.cancel` | "إلغاء" | jsx_text | `MEDIUM` | Semantic conflict isolation |
| `exceptions.columns.exceptions` | "exceptions" | call_collection | `MEDIUM` | Domain-specific terminology translation |
| `exceptions.columns.projects` | "projects" | call_collection | `MEDIUM` | Domain-specific terminology translation |
| `exceptions.columns.trips` | "trips" | call_collection | `MEDIUM` | Domain-specific terminology translation |
| `exceptions.fields.date` | "تم التحقق من الانتقال السليم من OPEN إلى UNDER_REVIEW ثم إلى RESOLVED مع تسجيل التاريخ والمراجع" | literal | `HIGH` | Domain-specific terminology translation |
| `exceptions.fields.driverCarrier` | "تعارض السائق مع الناقل" | prop_labelAr | `MEDIUM` | Domain-specific terminology translation |
| `exceptions.fields.exceptionid` | "exceptionId" | prop_field | `MEDIUM` | Domain-specific terminology translation |
| `exceptions.fields.failed` | "فشل المزامنة" | prop_labelAr | `MEDIUM` | Domain-specific terminology translation |
| `exceptions.fields.failed_2` | "فشل مزامنة حزمة بيانات موازين موقعية واردة من جهاز المحطة الطرفية اللاسلكي رقم #04 بسبب انقطاع شبكة 5G" | prop_description | `HIGH` | Domain-specific terminology translation |
| `exceptions.fields.location` | "تجاوز الفارق بين وزن المصدر والموقع لحدود التفاوت المسموحة" | prop_descAr | `MEDIUM` | Domain-specific terminology translation |
| `exceptions.fields.material` | "فارق وزني غير طبيعي يتجاوز تفاوت المادة المحدد (-1,450 كجم، النسبة -4.6% بينما الحد 1.5%)" | prop_description | `HIGH` | Domain-specific terminology translation (Protected: [KG]) |
| `exceptions.fields.materialCarrier` | "تعارض في قواعد التسعير: وجود قاعدتي تسعير نشطتين ومتداخلتين في نفس النطاق الزمني لنفس المادة والناقل (سعر الطن 52 ر.س مقابل سعر المقطوعية 1,850 ر.س)" | prop_description | `HIGH` | Domain-specific terminology translation (Protected: [TON,SAR]) |
| `exceptions.fields.pricing` | "تعارض في قواعد التسعير" | prop_labelAr | `MEDIUM` | Domain-specific terminology translation |
| `exceptions.fields.refresh` | "تعارض النسخ المتفائلة (Optimistic Concurrency Clash): محاولة تحديث تذكرة الوصول بالنسخة رقم (1) بينما خادم قاعدة البيانات يحتوي النسخة رقم (2)" | prop_description | `HIGH` | Domain-specific terminology translation |
| `exceptions.fields.search` | "بحث برقم الاستثناء، معرف الرحلة، الوصف، أو اسم المراجع..." | attr_placeholder | `MEDIUM` | Domain-specific terminology translation |
| `exceptions.fields.severity` | "severity" | prop_field | `MEDIUM` | Domain-specific terminology translation |
| `exceptions.fields.trip` | "رحلة غامضة أو غير محددة" | prop_labelAr | `MEDIUM` | Domain-specific terminology translation |
| `exceptions.fields.tripWeighbridge` | "محاولة إدخال رحلة مكررة بنفس الرقم التسلسلي لتذكرة الميزان المحررة (WB-TKT-88091)" | prop_description | `HIGH` | Domain-specific terminology translation |
| `exceptions.fields.trip_2` | "رحلة مكررة (Duplicate)" | prop_labelAr | `MEDIUM` | Domain-specific terminology translation |
| `exceptions.fields.trip_3` | "محاولة إدخال رحلة برقم تذكرة ميزان أو مرجع تشغيلي مسجل مسبقاً" | prop_descAr | `MEDIUM` | Domain-specific terminology translation |
| ... | *and 317 more items in this domain queue* | | | |

## Domain: `legacyMigration` (352 items requiring review)

| Key | Arabic Source | Context | Priority | Reason & Placeholders |
| :--- | :--- | :--- | :--- | :--- |
| `legacyMigration.actions.cancel` | "إلغاء" | jsx_text | `MEDIUM` | Semantic conflict isolation |
| `legacyMigration.fields.carrier` | "لا توجد اتفاقية تسعير سارية لهذا الناقل والمادة. يتم الاحتفاظ بسعر الشيت القديم كمرجع تاريخي فقط." | prop_explanation | `HIGH` | Domain-specific terminology translation |
| `legacyMigration.fields.carrierName` | "اسم الناقل" | prop_'اسم الناقل' | `MEDIUM` | Semantic conflict isolation |
| `legacyMigration.fields.carrier_2` | "الناقل غير معتمد أو غير محدد بدقة. يتم الاحتفاظ بسعر الشيت القديم كمرجع تاريخي مع تعليق التسعيرة (PENDING)." | prop_explanation | `HIGH` | Domain-specific terminology translation |
| `legacyMigration.fields.completed` | "مكتمل -> COMPLETED, وزن أول -> WEIGHED_ORIGIN, unknown -> isUnknown: true" | prop_expected | `MEDIUM` | Domain-specific terminology translation |
| `legacyMigration.fields.confirm` | "تأكيد واعتماد ترحيل البيانات التاريخية (Admin Commit Confirmation)" | jsx_text | `HIGH` | Domain-specific terminology translation |
| `legacyMigration.fields.failed` | "فشل اعتماد دفعة الترحيل التاريخي." | literal | `HIGH` | Domain-specific terminology translation |
| `legacyMigration.fields.search` | "بحث بالتذكرة، السائق، الناقل، اللوحة..." | attr_placeholder | `MEDIUM` | Domain-specific terminology translation |
| `legacyMigration.fields.ticketNumber` | "رقم التذكرة" | prop_'رقم التذكرة' | `MEDIUM` | Semantic conflict isolation |
| `legacyMigration.fields.truck` | "رقم الشاحنة" | prop_'رقم الشاحنة' | `MEDIUM` | Semantic conflict isolation |
| `legacyMigration.fields.txt_104821` | "حزمة الاختبارات الآلية الشاملة للترحيل التاريخي (BLOCK 37)" | jsx_text | `HIGH` | Domain-specific terminology translation |
| `legacyMigration.fields.txt_1e3802` | "رقم التذكرة والوردية" | jsx_text | `MEDIUM` | Domain-specific terminology translation |
| `legacyMigration.fields.txt_1f39d7` | "غير مصرح: ترحيل واعتماد البيانات التاريخية يتطلب صلاحية مدير النظام (PROJECT_ADMIN)." | literal | `HIGH` | Domain-specific terminology translation |
| `legacyMigration.fields.txt_26d31e` | "تم التطابق تلقائياً مع العقد الساري للناقل (${rule.pricingType}) بسعر ${rule.rate} ريال" | template_literal | `HIGH` | Domain-specific terminology translation (Protected: [pricingType,SAR]) |
| `legacyMigration.fields.txt_31180a` | "وزن أول" | call_mapLegacyStatusToTripStatus | `MEDIUM` | Domain-specific terminology translation |
| `legacyMigration.fields.txt_38dd8f` | "مكتمل: ${completedRes.tripStatus}, وزن أول: ${weighedRes.tripStatus}, unknown: ${unknownRes.isUnknown}" | template_literal | `HIGH` | Domain-specific terminology translation |
| `legacyMigration.fields.txt_719b8e` | "تعارض حسابي في الوزن!" | jsx_text | `MEDIUM` | Domain-specific terminology translation |
| `legacyMigration.fields.txt_75de36` | "تاريخ التوليد:" | jsx_text | `HIGH` | Domain-specific terminology translation |
| `legacyMigration.fields.txt_7a6555` | "تاريخ الشفت" | prop_'تاريخ الشفت' | `HIGH` | Domain-specific terminology translation |
| `legacyMigration.fields.txt_7aeb66` | "أداة ترحيل البيانات التاريخية من شيت قوقل القديم (Legacy Migration Tool)" | jsx_text | `HIGH` | Domain-specific terminology translation |
| ... | *and 332 more items in this domain queue* | | | |

