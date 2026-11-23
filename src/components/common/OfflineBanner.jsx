import { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export function OfflineBanner() {
  const { isOnline, wasOffline, resetWasOffline } = useNetworkStatus();
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    if (isOnline && wasOffline) {
      setShowRestored(true);
      const timer = setTimeout(() => {
        setShowRestored(false);
        resetWasOffline();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline, resetWasOffline]);

  if (!isOnline) {
    return (
      <div
        role="alert"
        className="fixed top-0 inset-x-0 z-[9999] flex items-center justify-center gap-2 bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-md animate-in slide-in-from-top duration-300"
      >
        <WifiOff className="size-4 shrink-0 animate-pulse" />
        <span>Mất kết nối mạng. Dữ liệu trên bảng điều khiển có thể chưa được cập nhật.</span>
      </div>
    );
  }

  if (showRestored) {
    return (
      <div
        role="status"
        className="fixed top-0 inset-x-0 z-[9999] flex items-center justify-center gap-2 bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-md animate-in slide-in-from-top duration-300"
      >
        <Wifi className="size-4 shrink-0" />
        <span>Đã khôi phục kết nối mạng. Đang đồng bộ lại dữ liệu.</span>
      </div>
    );
  }

  return null;
}
