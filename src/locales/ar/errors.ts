import { ErrorsTranslations } from '../types';

export const errors: ErrorsTranslations = {
  unexpectedError: 'حدث خطأ غير متوقع في النظام، يرجى المحاولة لاحقاً',
  networkError: 'تعذر الاتصال بالشبكة، يرجى التحقق من اتصال الإنترنت',
  permissionDenied: 'تم رفض الإجراء: ليس لديك الصلاحيات الكافية (403 Forbidden)',
  notFound: 'السجل أو العنصر المطلوب غير موجود أو تم نقله',
  conflictError: 'تعارض في البيانات: تم تعديل هذا السجل بواسطة مستخدم آخر',
  timeoutError: 'استغرقت العملية وقتاً أطول من المتوقع، يرجى إعادة المحاولة',
  databaseError: 'حدث خطأ أثناء الاتصال بقاعدة البيانات السحابية',
  parseError: 'تعذر قراءة أو معالجة بنية الملف المرفوع',
  validationFailed: 'فشل التحقق من صحة البيانات المدخلة',
  operationFailed: 'تعذر تنفيذ العملية المطلوبة بنجاح',
  fileTooLarge: 'حجم الملف يتجاوز الحد الأقصى المسموح به (25 ميجابايت)',
  invalidFileType: 'نوع الملف غير مدعوم، يرجى رفع ملف إكسل أو CSV أو PDF',
  pleaseTryAgain: 'يرجى مراجعة البيانات وإعادة المحاولة',
  contactSupport: 'إذا استمر الخطأ، يرجى التواصل مع فريق الدعم الفني',
};
