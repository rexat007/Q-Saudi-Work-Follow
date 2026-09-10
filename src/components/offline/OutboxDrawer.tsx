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
  Info,
  ShieldAlert,
  Scale,
  Lock,
  Play
} from 'lucide-react';
import { outboxService } from '../../services/offline/outbox.service';
import { offlineCacheService } from '../../services/offline/offlineCache.service';
import { conflictResolutionService } from '../../services/offline/conflictResolution.service';
import { ConflictResolutionModal } from './ConflictResolutionModal';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { OutboxOperation, OutboxStatus, CacheStoreMetadata, OutboxStats } from '../../types/offline';
import { ConflictRecord, ConflictType } from '../../types/conflict';

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

  const [activeTab, setActiveTab] = useState<'OUTBOX' | 'CONFLICTS' | 'CACHE'>('OUTBOX');
  const [statusFilter, setStatusFilter] = useState<OutboxStatus | 'ALL'>('ALL');
  const [operations, setOperations] = useState<OutboxOperation[]>([]);
  const [stats, setStats] = useState<OutboxStats>({ total: 0, pending: 0, sending: 0, synced: 0, failed: 0, conflict: 0 });
  const [cacheMeta, setCacheMeta] = useState<CacheStoreMetadata[]>([]);
  const [conflicts, setConflicts] = useState<ConflictRecord[]>([]);
  const [selectedConflict, setSelectedConflict] = useState<ConflictRecord | null>(null);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isRefreshingCache, setIsRefreshingCache] = useState<boolean>(false);
  const [isSimulatingConflict, setIsSimulatingConflict] = useState<boolean>(false);
  const [expandedOpId, setExpandedOpId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [ops, st, meta, confs] = await Promise.all([
        outboxService.getOperations(),
        outboxService.getStats(),
        offlineCacheService.getCacheMetadata(),
        conflictResolutionService.getConflicts(),
      ]);
      setOperations(ops);
      setStats(st);
      setCacheMeta(meta);
      setConflicts(confs);
    } catch (err) {
      console.error('Failed to load outbox/cache state:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
    const unsubOutbox = outboxService.subscribe(() => {
      loadData();
    });
    const unsubConflicts = conflictResolutionService.subscribe(() => {
      loadData();
    });
    return () => {
      unsubOutbox();
      unsubConflicts();
    };
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

  const handleOpenConflictForOp = async (op: OutboxOperation) => {
    const confId = op.conflictDetails?.conflictId;
    let found = conflicts.find(c => c.conflictId === confId || c.operationId === op.operationId);
    if (!found) {
      // If not yet saved in memory, detect or build it
      const detected = conflictResolutionService.detectConflict(op);
      if (detected) {
        found = detected;
      }
    }
    if (found) {
      setSelectedConflict(found);
      setIsConflictModalOpen(true);
    }
  };

  const handleOpenConflictModal = (conflict: ConflictRecord) => {
    setSelectedConflict(conflict);
    setIsConflictModalOpen(true);
  };

  const handleSimulateConflict = async (type: ConflictType) => {
    setIsSimulatingConflict(true);
    try {
      const record = await conflictResolutionService.simulateConflict(type);
      await loadData();
      setActiveTab('CONFLICTS');
      onNotification?.({
        type: 'SECURITY',
        message: `تمت محاكاة التعارض (${type}) بنجاح. تم تجميد العملية في Outbox وحفظ لقطة البيانات للتدقيق.`
      });
    } catch (err: any) {
      onNotification?.({
        type: 'ERROR',
        message: err.message || 'فشلت محاكاة التعارض'
      });
    } finally {
      setIsSimulatingConflict(false);
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
            onClick={() => setActiveTab('CONFLICTS')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'CONFLICTS'
                ? 'border-purple-600 text-purple-950'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-purple-600" />
            <span>معالجة التعارضات (Conflicts)</span>
            {conflicts.filter(c => c.status === 'OPEN').length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-purple-600 text-white text-[10px] animate-pulse">
                {conflicts.filter(c => c.status === 'OPEN').length}
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

                          <div className="flex items-center gap-2">
                            {op.status === 'CONFLICT' && (
                              <button
                                onClick={() => handleOpenConflictForOp(op)}
                                className="px-3.5 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
                              >
                                <ShieldAlert className="w-3.5 h-3.5" />
                                <span>حل التعارض الصريح</span>
                              </button>
                            )}

                            {(op.status === 'FAILED' || op.status === 'CONFLICT') && (
                              <button
                                onClick={() => handleRetryOp(op.operationId)}
                                className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-900 text-stone-200 text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors"
                              >
                                <RotateCw className="w-3 h-3" />
                                <span>إعادة فحص (Retry)</span>
                              </button>
                            )}
                          </div>
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

          {activeTab === 'CONFLICTS' && (
            <div className="space-y-4">
              {/* Mandatory Anti-LWW Rules & Pricing Invariance Banner */}
              <div className="bg-stone-900 text-white p-4.5 rounded-xl border border-stone-800 space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                    <ShieldAlert className="w-4 h-4" />
                    <span>محددات حوكمة التعارضات (Conflict Resolution Mandates)</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-stone-800 text-purple-300 border border-purple-500/30">
                    Strict Audit Trail
                  </span>
                </div>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-stone-300 pt-1">
                  <li className="flex items-start gap-1.5">
                    <span className="text-amber-400 font-bold">•</span>
                    <span><strong>منع "آخر كتابة تفوز" (No LWW):</strong> لا يتم استبدال البيانات التشغيلية للرحلات تلقائياً، بل يُلزم المشرف بالحل الصريح.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span><strong>ثبات تسعير الـ Offline:</strong> لقطة التسعير المعتمدة وقت الإنشاء بدون اتصال ملزمة للرحلة ولا تتغير بتحديث السعر اللاحق.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-purple-400 font-bold">•</span>
                    <span><strong>حفظ الأمرين:</strong> يتم تجميد الأمر المحلي وحفظ حالة الخادم وإصدار سجل تعارض موثق في IndexedDB.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-blue-400 font-bold">•</span>
                    <span><strong>سريان الأسعار الجديدة:</strong> السعر المحدث على الخادم يقتصر أثره فقط على الرحلات المستقبلية الجديدة.</span>
                  </li>
                </ul>
              </div>

              {/* Interactive Simulator: Quick Verification of 7 Conflict Scenarios */}
              <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                      <Play className="w-3.5 h-3.5 text-amber-600" />
                      <span>محاكي التعارضات التشغيلية (Interactive Conflict Simulator)</span>
                    </h3>
                    <p className="text-[11px] text-stone-500">
                      اضغط لتوليد أي سيناريو واختبار آلية التدقيق وحماية التسعير ومنع الكتابة التلقائية:
                    </p>
                  </div>
                  {isSimulatingConflict && (
                    <span className="text-xs text-amber-600 flex items-center gap-1 font-bold animate-pulse">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      جاري المحاكاة...
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    onClick={() => handleSimulateConflict('PRICING_CHANGED')}
                    disabled={isSimulatingConflict}
                    className="p-2.5 rounded-lg border border-amber-200 bg-amber-50/70 hover:bg-amber-100/90 text-right transition-colors disabled:opacity-50"
                  >
                    <div className="flex items-center gap-1 text-amber-900 font-bold text-xs">
                      <Lock className="w-3.5 h-3.5 text-amber-700" />
                      <span>1. تحديث السعر</span>
                    </div>
                    <span className="text-[10px] text-amber-800 block mt-0.5">PRICING_CHANGED وحماية Snapshot</span>
                  </button>

                  <button
                    onClick={() => handleSimulateConflict('VERSION_CONFLICT')}
                    disabled={isSimulatingConflict}
                    className="p-2.5 rounded-lg border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100/90 text-right transition-colors disabled:opacity-50"
                  >
                    <div className="flex items-center gap-1 text-indigo-900 font-bold text-xs">
                      <Scale className="w-3.5 h-3.5 text-indigo-700" />
                      <span>2. تعارض إصدار</span>
                    </div>
                    <span className="text-[10px] text-indigo-800 block mt-0.5">VERSION_CONFLICT توازي التعديل</span>
                  </button>

                  <button
                    onClick={() => handleSimulateConflict('TRIP_ALREADY_COMPLETED')}
                    disabled={isSimulatingConflict}
                    className="p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/90 text-right transition-colors disabled:opacity-50"
                  >
                    <div className="flex items-center gap-1 text-emerald-900 font-bold text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                      <span>3. رحلة مكتملة</span>
                    </div>
                    <span className="text-[10px] text-emerald-800 block mt-0.5">TRIP_ALREADY_COMPLETED مغلقة</span>
                  </button>

                  <button
                    onClick={() => handleSimulateConflict('TRIP_ALREADY_RETURNED')}
                    disabled={isSimulatingConflict}
                    className="p-2.5 rounded-lg border border-rose-200 bg-rose-50/70 hover:bg-rose-100/90 text-right transition-colors disabled:opacity-50"
                  >
                    <div className="flex items-center gap-1 text-rose-900 font-bold text-xs">
                      <XCircle className="w-3.5 h-3.5 text-rose-700" />
                      <span>4. رحلة مرتجعة</span>
                    </div>
                    <span className="text-[10px] text-rose-800 block mt-0.5">TRIP_ALREADY_RETURNED مرفوضة</span>
                  </button>

                  <button
                    onClick={() => handleSimulateConflict('DUPLICATE_OPERATION')}
                    disabled={isSimulatingConflict}
                    className="p-2.5 rounded-lg border border-orange-200 bg-orange-50/70 hover:bg-orange-100/90 text-right transition-colors disabled:opacity-50"
                  >
                    <div className="flex items-center gap-1 text-orange-900 font-bold text-xs">
                      <Layers className="w-3.5 h-3.5 text-orange-700" />
                      <span>5. تكرار تذكرة</span>
                    </div>
                    <span className="text-[10px] text-orange-800 block mt-0.5">DUPLICATE_OPERATION تكرار القيد</span>
                  </button>

                  <button
                    onClick={() => handleSimulateConflict('TRUCK_CARRIER_CONFLICT')}
                    disabled={isSimulatingConflict}
                    className="p-2.5 rounded-lg border border-purple-200 bg-purple-50/70 hover:bg-purple-100/90 text-right transition-colors disabled:opacity-50"
                  >
                    <div className="flex items-center gap-1 text-purple-900 font-bold text-xs">
                      <HardDrive className="w-3.5 h-3.5 text-purple-700" />
                      <span>6. تعارض الناقل</span>
                    </div>
                    <span className="text-[10px] text-purple-800 block mt-0.5">TRUCK_CARRIER_CONFLICT تبعية</span>
                  </button>

                  <button
                    onClick={() => handleSimulateConflict('MASTER_DATA_CHANGED')}
                    disabled={isSimulatingConflict}
                    className="p-2.5 rounded-lg border border-cyan-200 bg-cyan-50/70 hover:bg-cyan-100/90 text-right transition-colors disabled:opacity-50 col-span-2 sm:col-span-2"
                  >
                    <div className="flex items-center gap-1 text-cyan-900 font-bold text-xs">
                      <Database className="w-3.5 h-3.5 text-cyan-700" />
                      <span>7. تغيير بيانات أساسية</span>
                    </div>
                    <span className="text-[10px] text-cyan-800 block mt-0.5">MASTER_DATA_CHANGED إيقاف أو تعديل المادة</span>
                  </button>
                </div>
              </div>

              {/* Conflicts List */}
              {conflicts.length === 0 ? (
                <div className="bg-white rounded-xl border border-stone-200 p-8 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-stone-800">لا توجد تعارضات معلقة في النظام حالياً</h4>
                  <p className="text-xs text-stone-500 max-w-md mx-auto">
                    جميع العمليات متوافقة مع الخادم. يمكنك الضغط على أي زر في المحاكي أعلاه لاختبار منظومة معالجة التعارضات وحماية لقطات التسعير.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {conflicts.map(conf => {
                    const isOpen = conf.status === 'OPEN';
                    return (
                      <div
                        key={conf.conflictId}
                        className={`bg-white rounded-xl border p-4.5 space-y-3 shadow-2xs transition-all ${
                          isOpen ? 'border-amber-300 ring-1 ring-amber-100' : 'border-stone-200 bg-stone-50/40'
                        }`}
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${
                                isOpen 
                                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                                  : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              }`}>
                                {isOpen ? 'بانتظار الحل الصريح (OPEN)' : 'تمت المعالجة (RESOLVED)'}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-stone-100 text-stone-700">
                                {conf.conflictType}
                              </span>
                              <span className="text-[11px] font-mono text-stone-400">
                                {conf.conflictId}
                              </span>
                            </div>
                            <h4 className="text-xs font-bold text-stone-900 pt-0.5">{conf.titleAr}</h4>
                            <p className="text-xs text-stone-600 leading-relaxed">{conf.descriptionAr}</p>
                          </div>

                          {isOpen && (
                            <button
                              onClick={() => handleOpenConflictModal(conf)}
                              className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
                            >
                              <ShieldAlert className="w-4 h-4" />
                              <span>حل التعارض الصريح</span>
                            </button>
                          )}
                        </div>

                        {/* Pricing Invariance Highlight */}
                        {conf.pricingProtection && (
                          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <Lock className="w-4 h-4 text-emerald-700 shrink-0" />
                              <div>
                                <span className="font-bold text-emerald-950">حماية تسعير الـ Offline: </span>
                                <span className="text-emerald-900">
                                  سعر اللقطة المحفوظة: {conf.pricingProtection.snapshotRate} ر.س | سعر الخادم الجديد: {conf.pricingProtection.serverCurrentRate} ر.س
                                </span>
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded bg-emerald-200/80 text-emerald-900 font-bold text-[10px]">
                              السعر محمي تعاقدياً
                            </span>
                          </div>
                        )}

                        {/* Diff Fields Mini View */}
                        <div className="bg-stone-50 rounded-lg p-2.5 border border-stone-200 text-xs">
                          <div className="text-[11px] font-bold text-stone-700 mb-1">الفروقات الميدانية المرصودة:</div>
                          <div className="space-y-1">
                            {conf.diffFields.map((d, i) => (
                              <div key={i} className="flex items-center justify-between text-[11px] bg-white p-1.5 px-2.5 rounded border border-stone-200">
                                <span className="font-bold text-stone-800">{d.fieldLabelAr} ({d.field})</span>
                                <div className="flex items-center gap-2 font-mono">
                                  <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                    محلي: {String(d.localValue)}
                                  </span>
                                  <span className="text-stone-400">↔</span>
                                  <span className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                    خادم: {String(d.serverValue)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Resolution Summary if RESOLVED */}
                        {conf.status === 'RESOLVED' && conf.resolution && (
                          <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3 text-xs space-y-1">
                            <div className="flex items-center justify-between font-bold text-emerald-950">
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                                <span>القرار المعتمد: {conf.resolution.strategy}</span>
                              </span>
                              <span className="text-[10px] text-emerald-800">
                                بواسطة: {conf.resolution.resolvedBy}
                              </span>
                            </div>
                            <div className="text-[11px] text-emerald-900">
                              <strong>المبرر التدقيقي:</strong> {conf.resolution.justification}
                            </div>
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

        {/* Explicit Conflict Resolution Modal */}
        <ConflictResolutionModal
          isOpen={isConflictModalOpen}
          conflict={selectedConflict}
          onClose={() => {
            setIsConflictModalOpen(false);
            setSelectedConflict(null);
          }}
          onResolved={(confId, msg) => {
            onNotification?.({
              type: 'SUCCESS',
              message: msg,
            });
            loadData();
          }}
        />

      </div>
    </div>
  );
};
