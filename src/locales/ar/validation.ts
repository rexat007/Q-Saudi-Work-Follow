import { ValidationTranslations } from '../types';

export const validation: ValidationTranslations = {
  requiredField: 'هذا الحقل مطلوب ولا يمكن تركه فارغاً',
  invalidFormat: 'صيغة الإدخال غير صالحة',
  minLength: 'عدد الأحرف المدخلة أقل من الحد الأدنى المطلوب',
  maxLength: 'عدد الأحرف المدخلة يتجاوز الحد الأقصى المسموح به',
  numberPositive: 'يجب أن تكون القيمة رقماً موجباً أكبر من الصفر',
  weightPositive: 'يجب أن يكون الوزن أكبر من صفر كجم',
  grossMustExceedTare: 'يجب أن يكون الوزن القائم (Gross) أكبر قطيعاً من وزن الفارغ (Tare)',
  dateRangeInvalid: 'تاريخ البداية يجب أن يسبق تاريخ الانتهاء',
  duplicateEntry: 'هذا السجل مضاف مسبقاً في النظام ولا يُسمح بتكراره',
  carrierMismatch: 'الشاحنة المحددة لا تنتمي إلى الناقل المعتمد للرحلة',
  projectMismatch: 'البيانات المحددة لا تتوافق مع المشروع النشط',
  unauthorizedAction: 'ليس لديك الصلاحية الكافية لتنفيذ هذا الإجراء',
  statusTransitionInvalid: 'مسار الانتقال بين الحالات غير مسموح به وفق دورة حياة الرحلة',
  exceedsPayloadLimit: 'الوزن الإجمالي يتجاوز الحمولة النظامية المسموح بها نظاماً على الطرق',
};
