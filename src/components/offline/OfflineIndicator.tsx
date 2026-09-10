import React from 'react';
import { WifiOff, Layers, RefreshCw } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

interface OfflineIndicatorProps {
  pendingCount?: number;
  onOpenOutbox?: () => void;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ pendingCount = 0, onOpenOutbox }) => {
  const { isOnline, isSimulatedOffline } = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div 
      className="fixed bottom-4 left-4 z-50 flex items-center gap-3 rounded-xl bg-stone-900/95 text-white px-4 py-2.5 shadow-xl border border-amber-500/40 backdrop-blur-md transition-all text-xs font-medium"
      dir="rtl"
    >
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
        </span>
        <WifiOff className="w-4 h-4 text-amber-400" />
        <span>
          {isSimulatedOffline ? 'وضع محاكاة عدم الاتصال (Simulated Offline)' : 'وضع عدم الاتصال (Offline) — البيانات من IndexedDB'}
        </span>
      </div>

      {pendingCount > 0 && (
        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 text-[11px]">
          {pendingCount} في Outbox
        </span>
      )}

      {onOpenOutbox && (
        <button
          onClick={onOpenOutbox}
          className="mr-2 px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] transition-colors flex items-center gap-1 shadow-2xs"
        >
          <Layers className="w-3 h-3" />
          <span>إدارة المزامنة</span>
        </button>
      )}
    </div>
  );
};
