import React, { useState, useEffect } from 'react';
import { 
  X, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Database, 
  Layers, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  RotateCw, 
  Trash2, 
  HardDrive, 
  Server,
  Smartphone,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';
import { outboxService } from '../../services/offline/outbox.service';
import { offlineCacheService } from '../../services/offline/offlineCache.service';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { OutboxOperation, OutboxStatus, CacheStoreMetadata, OutboxStats } from '../../types/offline';

interface OutboxDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNotification?: (notif: { type: 'SUCCESS' | 'ERROR' | 'SECURITY'; message: string }) => void;
}

export const OutboxDrawer: React.FC<OutboxDrawerProps> = ({
  isOpen,
  onClose,
  onNotification
}) => {
  const { isOnline, isSimulatedOffline, toggleSimulatedOffline } = useOnlineStatus();

  const [activeTab, setActiveTab] = useState<'OUTBOX' | 'CACHE'>('OUTBOX');
  const [statusFilter, setStatusFilter] = useState<OutboxStatus | 'ALL'>('ALL');
  const [operations, setOperations] = useState<OutboxOperation[]>([]);
  const [stats, setStats] = useState<OutboxStats>({ total: 0, pending: 0, sending: 0, synced: 0, failed: 0, conflict: 0 });
  const [cacheMeta, setCacheMeta] = useState<CacheStoreMetadata[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isRefreshingCache, setIsRefreshingCache] = useState<boolean>(false);
  const [expandedOpId, setExpandedOpId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [ops, st, meta] = await Promise.all([
        outboxService.getOperations(),
        outboxService.getStats(),
        offlineCacheService.getCacheMetadata(),
      ]);
      setOperations(ops);
      setStats(st);
      setCacheMeta(meta);
    } catch (err) {
      console.error('Failed to load outbox/cache state:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
    const unsub = outboxService.subscribe(() => {
      loadData();
    });
    return unsub;
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSyncAll = async () => {
    if (!isOnline) {
      onNotification?.({
        type: 'ERROR',
        message: 'لا يمكن بدء المزامنة: التطبيق في وضع عدم الاتصال (Offline).'
      });
      return;
    }

    setIsSyncing(true);
    try {
      const res = await outboxService.syncAll(isSimulatedOffline);
      await loadData();
      onNotification?.({
        type: 'SUCCESS',
        message: `اكتملت المزامنة: تمت معالجة ${res.processedCount} عملية (نجاح: ${res.syncedCount}، فشل: ${res.failedCount}، تعارض: ${res.conflictCount})`
      });
    } catch (err: any) {
      onNotification?.({
        type: 'ERROR',
        message: err.message || 'فشلت المزامنة'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRetryOp = async (opId: string) => {
    await outboxService.retryOperation(opId);
    if (isOnline) {
      handleSyncAll();
    } else {
      onNotification?.({
        type: 'SUCCESS',
        message: 'تمت إعادة تعيين العملية إلى حالة الانتظار (PENDING). ستتم المزامنة عند الاتصال.'
      });
    }
  };

  const handleClearSynced = async () => {
    await outboxService.clearSynced();
    await loadData();
    onNotification?.({
      type: 'SUCCESS',
      message: 'تم مسح العمليات المزامنة والمؤكدة بنجاح من صندوق الصادر.'
    });
  };

  const handleRefreshCache = async () => {
    setIsRefreshingCache(true);
    try {
      const res = await offlineCacheService.refreshCacheWithBump();
      await loadData();
      onNotification?.({
        type: 'SUCCESS',
        message: `تم تحديث وتخزين البيانات المحلية في IndexedDB بنجاح (الإصدار: v${res.newVersion})`
      });
    } catch (err: any) {
      onNotification?.({
        type: 'ERROR',
        message: err.message || 'فشل تحديث الذاكرة المحلية'
      });
    } finally {
      setIsRefreshingCache(false);
    }
  };

  const filteredOps = operations.filter(op => {
    if (statusFilter === 'ALL') return true;
    return op.status === statusFilter;
  });

  const getStatusBadge = (status: OutboxStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 text-[11px] font-bold">
            <Clock className="w-3 h-3" />
            <span>قيد الانتظار PENDING</span>
          </span>
        );
      case 'SENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-300 text-[11px] font-bold animate-pulse">
            <RotateCw className="w-3 h-3 animate-spin" />
            <span>جاري الإرسال SENDING</span>
          </span>
        );
      case 'SYNCED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-[11px] font-bold">
            <CheckCircle2 className="w-3 h-3" />
            <span>تمت المزامنة SYNCED</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-300 text-[11px] font-bold">
            <XCircle className="w-3 h-3" />
            <span>فشلت FAILED</span>
          </span>
        );
      case 'CONFLICT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-300 text-[11px] font-bold">
            <AlertTriangle className="w-3 h-3" />
            <span>تعارض CONFLICT</span>
          </span>
        );
    }
  };

  const STORE_LABELS: Record<string, string> = {
    projects: 'المشاريع (Projects)',
    carriers: 'الناقلين (Carriers)',
    materials: 'المواد (Materials)',
    trucks: 'الشاحنات (Trucks)',
    drivers: 'السائقين (Drivers)',
    pricingRules: 'قواعد التسعير (Pricing Rules)',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-xs transition-opacity" dir="rtl">
      <div className="w-full max-w-2xl h-full bg-stone-50 border-r border-stone-200 shadow-2xl flex flex-col overflow-hidden text-right">
        
        {/* Header */}
        <div className="bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-900">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">إدارة عدم الاتصال والمزامنة (Offline-First PWA)</h2>
              <p className="text-xs text-stone-500">حالة IndexedDB المحلية، طابور الصادر Outbox، وخطوات المزامنة الخادومية</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Network State & Offline Simulation Banner */}
        <div className="bg-stone-900 text-white px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <span className="flex items-center gap-1.5 font-bold text-emerald-400">
                <Wifi className="w-4 h-4" />
                <span>حالة الشبكة: متصل بالإنترنت (Online)</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 font-bold text-amber-400">
                <WifiOff className="w-4 h-4" />
                <span>حالة الشبكة: غير متصل (Offline Mode)</span>
              </span>
            )}
            <span className="text-stone-400">|</span>
            <span className="text-stone-300 font-mono text-[11px] flex items-center gap-1">
              <Smartphone className="w-3.5 h-3.5 text-stone-400" />
              <span>الجهاز: {outboxService.getDeviceId()}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-stone-300 text-[11px]">محاكاة انقطاع الإنترنت:</span>
            <button
              onClick={toggleSimulatedOffline}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                isSimulatedOffline
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700'
              }`}
            >
              {isSimulatedOffline ? 'إيقاف المحاكاة (Go Online)' : 'تفعيل المحاكاة (Go Offline)'}
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-stone-200 bg-white px-6 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('OUTBOX')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'OUTBOX'
                ? 'border-amber-600 text-amber-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>طابور الصادر (Outbox Queue)</span>
            {stats.pending > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 text-[10px]">
                {stats.pending}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('CACHE')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'CACHE'
                ? 'border-amber-600 text-amber-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>الذاكرة المحلية IndexedDB (Master Data)</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === 'OUTBOX' && (
            <div className="space-y-4">
              {/* Quick Actions & Stats Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-stone-600">التصفية:</span>
                  {(['ALL', 'PENDING', 'SENDING', 'SYNCED', 'FAILED', 'CONFLICT'] as const).map(st => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                        statusFilter === st
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
                      }`}
                    >
                      {st === 'ALL' ? `الكل (${stats.total})` : `${st} (${stats[st.toLowerCase() as keyof OutboxStats] || 0})`}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  {stats.synced > 0 && (
                    <button
                      onClick={handleClearSynced}
                      className="px-2.5 py-1.5 rounded-lg border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-medium flex items-center gap-1 transition-colors"
                      title="تنظيف العمليات المزامنة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>مسح المؤكدة</span>
                    </button>
                  )}
                  <button
                    onClick={handleSyncAll}
                    disabled={isSyncing || !isOnline}
                    className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'جاري المزامنة...' : 'مزامنة فورية (Sync)'}</span>
                  </button>
                </div>
              </div>

              {/* Operations Cards List */}
              {filteredOps.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-stone-300 p-8 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="text-sm font-bold text-stone-800">لا توجد عمليات في هذا التصنيف</p>
                  <p className="text-xs text-stone-500">
                    عند العمل في وضع عدم الاتصال (Offline) وإنشاء رحلة من محطة التحميل، ستظهر العمليات هنا تلقائياً لتتم مزامنتها.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredOps.map(op => {
                    const isExpanded = expandedOpId === op.operationId;
                    return (
                      <div
                        key={op.operationId}
                        className="bg-white rounded-xl border border-stone-200 shadow-2xs hover:border-amber-300 transition-all p-4 space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-2.5">
                          <div className="flex items-center gap-2">
                            {getStatusBadge(op.status)}
                            <span className="font-mono text-xs font-bold text-stone-800">{op.operationId}</span>
                            <span className="text-stone-300">|</span>
                            <span className="text-xs text-stone-600 font-medium">نوع العملية: {op.operationType}</span>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-stone-500">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{new Date(op.createdAt).toLocaleTimeString('ar-SA')} - {new Date(op.createdAt).toLocaleDateString('ar-SA')}</span>
                          </div>
                        </div>

                        {/* Summary Details */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-stone-50 p-2.5 rounded-lg border border-stone-200/60">
                          <div>
                            <span className="text-stone-500 block text-[10px]">رقم الرحلة:</span>
                            <span className="font-mono font-bold text-stone-900">{op.payload?.tripSerial || op.payload?.tripId || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-stone-500 block text-[10px]">صافي الوزن:</span>
                            <span className="font-bold text-stone-900">
                              {op.payload?.grossWeight && op.payload?.tareWeight 
                                ? `${(op.payload.grossWeight - op.payload.tareWeight).toLocaleString()} كجم`
                                : 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-stone-500 block text-[10px]">المبلغ المقدر:</span>
                            <span className="font-bold text-amber-900">
                              {op.payload?.settlementAmount !== undefined ? `${op.payload.settlementAmount.toLocaleString()} ر.س` : 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-stone-500 block text-[10px]">المحاولات:</span>
                            <span className="font-bold text-stone-900">{op.retryCount} محاولة</span>
                          </div>
                        </div>

                        {/* Feedback / Error / ACK */}
                        {op.serverAck && (
                          <div className="text-xs bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-emerald-900 flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <div>
                              <div className="font-bold">استجابة المصادقة الخادومية (Server ACK):</div>
                              <div>{op.serverAck.messageAr} (رقم الرحلة الخادومي: {op.serverAck.tripSerial})</div>
                            </div>
                          </div>
                        )}

                        {op.errorReason && (
                          <div className="text-xs bg-rose-50 border border-rose-200 rounded-lg p-2.5 text-rose-900 flex items-start gap-2">
                            <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            <div>
                              <div className="font-bold">سبب الفشل (Server Validation Error):</div>
                              <div>{op.errorReason}</div>
                            </div>
                          </div>
                        )}

                        {op.conflictDetails && (
                          <div className="text-xs bg-purple-50 border border-purple-200 rounded-lg p-2.5 text-purple-900 flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                            <div>
                              <div className="font-bold">تفاصيل التعارض (Conflict Detected):</div>
                              <div>{op.conflictDetails.messageAr}</div>
                            </div>
                          </div>
                        )}

                        {/* Expandable Payload & Retry Actions */}
                        <div className="flex items-center justify-between pt-1">
                          <button
                            onClick={() => setExpandedOpId(isExpanded ? null : op.operationId)}
                            className="text-xs text-stone-600 hover:text-stone-900 flex items-center gap-1 font-medium"
                          >
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            <span>{isExpanded ? 'إخفاء الحمولة الكاملة' : 'عرض تفاصيل الحمولة (Payload)'}</span>
                          </button>

                          {(op.status === 'FAILED' || op.status === 'CONFLICT') && (
                            <button
                              onClick={() => handleRetryOp(op.operationId)}
                              className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1 shadow-2xs"
                            >
                              <RotateCw className="w-3 h-3" />
                              <span>إعادة المحاولة (Retry)</span>
                            </button>
                          )}
                        </div>

                        {isExpanded && (
                          <div className="mt-2 p-3 bg-stone-900 text-stone-200 rounded-lg text-xs font-mono overflow-x-auto max-h-48 text-left" dir="ltr">
                            <pre>{JSON.stringify(op.payload, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'CACHE' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-stone-900">سجل تخزين Master Data في IndexedDB</h3>
                  <p className="text-xs text-stone-500">
                    تتضمن كل باقة مخزنة محلياً رقم الإصدار (Version) والطابع الزمني (Timestamp) لضمان اتساق البيانات
                  </p>
                </div>
                <button
                  onClick={handleRefreshCache}
                  disabled={isRefreshingCache}
                  className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-900 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingCache ? 'animate-spin' : ''}`} />
                  <span>{isRefreshingCache ? 'جاري التحديث...' : 'تحديث الذاكرة (Refresh Cache)'}</span>
                </button>
              </div>

              {/* Cache Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {cacheMeta.map(meta => (
                  <div
                    key={meta.storeName}
                    className="bg-white rounded-xl border border-stone-200 p-4 shadow-2xs space-y-2 hover:border-amber-300 transition-colors"
                  >
                    <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                      <span className="font-bold text-stone-900 text-xs">
                        {STORE_LABELS[meta.storeName] || meta.storeName}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-mono text-[10px] font-bold">
                        v{meta.version}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-stone-400 block text-[10px]">عدد السجلات:</span>
                        <span className="font-bold text-stone-800">{meta.recordCount} سجل</span>
                      </div>
                      <div>
                        <span className="text-stone-400 block text-[10px]">الطابع الزمني:</span>
                        <span className="font-mono text-stone-700 text-[10px]">
                          {new Date(meta.timestamp).toLocaleTimeString('ar-SA')}
                        </span>
                      </div>
                    </div>

                    <div className="text-[10px] text-stone-400 pt-1 border-t border-stone-50 flex items-center justify-between">
                      <span>مصدر التخزين: {meta.lastSyncedBy || 'SYSTEM'}</span>
                      <span className="text-emerald-700 font-medium">جاهز للاستخدام Offline</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Offline Rule Compliance Notice */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 space-y-2">
                <div className="flex items-center gap-1.5 font-bold">
                  <Info className="w-4 h-4 text-amber-700" />
                  <span>معايير التشغيل بدون اتصال (Offline Rules):</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-800 pr-2">
                  <li>يتم التحقق من وجود جميع Master Data (المشروع، الناقل، الشاحنة، السائق، المادة) في IndexedDB.</li>
                  <li><strong>قاعدة إلزامية:</strong> لا يُسمح بإنشاء أي رحلة Offline إذا كانت بيانات التسعير غير متوفرة محلياً.</li>
                  <li>تتم الحسابات المالية وصافي الأوزان محلياً وتُدرج في Outbox بحالة PENDING حتى عودة الاتصال.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-stone-200 px-6 py-3 flex items-center justify-between">
          <span className="text-xs text-stone-500">
            {stats.pending > 0 
              ? `يوجد ${stats.pending} عملية معلقة بانتظار المزامنة`
              : 'جميع العمليات متزامنة ومحدثة'}
          </span>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-bold transition-colors"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
