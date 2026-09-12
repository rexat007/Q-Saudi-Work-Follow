/**
 * BLOCK 44 — Safe Automated i18n Codemod Engine
 * Constants, Whitelists & Protection Sets
 */

/**
 * Attributes whose string values represent user-facing presentation text
 * and can be safely transformed to {t("key")} when a valid key exists.
 */
export const SAFE_JSX_ATTRIBUTES = new Set<string>([
  'placeholder',
  'title',
  'aria-label',
  'aria-description',
  'alt',
  'helperText',
  'description',
  'emptyMessage',
  'confirmText',
  'cancelText',
  'tooltip',
  'heading',
  'subtitle',
  'message',
  'errorMessage',
  'successMessage',
  'label', // Validated when on presentation components
]);

/**
 * Technical attributes that must NEVER be transformed automatically.
 */
export const EXCLUDED_TECHNICAL_ATTRIBUTES = new Set<string>([
  'id',
  'name',
  'value',
  'key',
  'className',
  'style',
  'role',
  'type',
  'href',
  'src',
  'target',
  'rel',
  'as',
  'ref',
  'to',
  'path',
  'method',
  'action',
  'autoComplete',
  'htmlFor',
  'width',
  'height',
  'size',
  'color',
  'variant',
  'viewBox',
  'xmlns',
  'd',
  'fill',
  'stroke',
  'tabIndex',
  'defaultValue',
  'pattern',
  'accept',
  'maxLength',
  'minLength',
  'step',
  'min',
  'max',
  'rows',
  'cols',
  'dir',
  'lang',
  'scope',
  'colSpan',
  'rowSpan',
]);

/**
 * Common user-facing notification, alert, and feedback method calls.
 */
export const USER_FACING_CALL_PATTERNS = new Set<string>([
  'toast.success',
  'toast.error',
  'toast.warning',
  'toast.info',
  'toast',
  'alert',
  'confirm',
  'notification',
  'showMessage',
  'setError',
  'setSuccess',
  'setWarning',
  'setAlert',
  'setFeedback',
  'showNotification',
  'showError',
  'showToast',
]);

/**
 * Technical logging calls that must NEVER be transformed.
 */
export const TECHNICAL_LOGGING_CALLS = new Set<string>([
  'console.log',
  'console.error',
  'console.warn',
  'console.info',
  'console.debug',
  'console.trace',
  'logger.info',
  'logger.error',
  'logger.warn',
  'logger.debug',
  'debugLog',
]);

/**
 * Protected business data tokens that must NEVER be translated or altered.
 */
export const PROTECTED_BUSINESS_TOKENS = new Set<string>([
  'projectId',
  'ticketId',
  'truckNo',
  'carrierId',
  'driverId',
  'materialId',
  'operationId',
  'pricingType',
  'settlementBase',
  'sourceType',
  'status',
  'ticketNumber',
  'netWeight',
  'grossWeight',
  'tareWeight',
  'SAR',
  'KG',
  'TON',
  'USD',
  'EUR',
  'AED',
]);

/**
 * Status codes and machine-readable values that must remain untranslated.
 */
export const PROTECTED_STATUS_CODES = new Set<string>([
  'ACTIVE',
  'INACTIVE',
  'PENDING',
  'COMPLETED',
  'CANCELLED',
  'REJECTED',
  'APPROVED',
  'DRAFT',
  'CLOSED',
  'SUSPENDED',
  'ERROR',
  'SUCCESS',
  'FAILED',
  'PROCESSING',
  'QUEUED',
  'SUBMITTED',
  'SETTLED',
  'RESOLVED',
]);

/**
 * Known unambiguous shared Arabic actions mapped to canonical shared keys.
 */
export const SHARED_ACTION_KEY_MAPPINGS: Record<string, string> = {
  'حفظ': 'shared.actions.save',
  'إلغاء': 'shared.actions.cancel',
  'إغلاق': 'shared.actions.close',
  'تأكيد': 'shared.actions.confirm',
  'تعديل': 'shared.actions.edit',
  'حذف': 'shared.actions.delete',
  'بحث': 'shared.actions.search',
  'رجوع': 'shared.actions.back',
  'إعادة المحاولة': 'shared.actions.retry',
  'تطبيق': 'shared.actions.apply',
  'إضافة': 'shared.actions.add',
  'تصدير': 'shared.actions.export',
  'استيراد': 'shared.actions.import',
  'طباعة': 'shared.actions.print',
  'تحديث': 'shared.actions.refresh',
};

/**
 * Directories and paths to exclude from codemod scanning.
 */
export const EXCLUDED_SCAN_PATHS = [
  'node_modules',
  'dist',
  'reports',
  'src/tests',
  'src/locales',
  'src/i18n',
  'src/firebase', // Keep Firebase backend configuration untouched
  'public',
];

/**
 * Default batch configuration
 */
export const DEFAULT_BATCH_CONFIG = {
  BATCH_SIZE: 50,
  SUPPORTED_EXTENSIONS: ['.tsx', '.ts'],
};
