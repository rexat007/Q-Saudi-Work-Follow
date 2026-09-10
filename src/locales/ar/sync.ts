import { SyncTranslations } from '../types';

export const sync: SyncTranslations = {
  outbox: 'صندوق الصادر للعمليات المحلية',
  syncCenter: 'مركز مزامنة العمليات غير المتصلة',
  onlineMode: 'وضع الاتصال المباشر (Online)',
  offlineSimulated: 'وضع محاكاة عدم الاتصال (Offline Mode)',
  disconnected: 'انقطع الاتصال بالخادم',
  pendingSync: 'عمليات معلقة بانتظار المزامنة',
  syncedOperations: 'عمليات تمت مزامنتها بنجاح',
  failedSync: 'عمليات تعذرت مزامنتها',
  retryAll: 'إعادة محاولة مزامنة الكل الآن',
  lastSyncAt: 'آخر مزامنة ناجحة',
  conflictResolution: 'معالجة وتصفية تعارضات البيانات',
  clientWins: 'اعتماد بيانات الجهاز المحلي',
  serverWins: 'اعتماد بيانات الخادم المركزي',
  manualMerge: 'دمج يدوي بموافقة المشرف',
  idempotencyProtected: 'حماية صارمة ضد التكرار وإعادة الإرسال (Idempotency Active)',
  antiReplayActive: 'نظام كشف وتصدي الهجمات التكرارية نشط',
  pendingQueue: 'طابور الانتظار للعمليات الميدانية',
};
