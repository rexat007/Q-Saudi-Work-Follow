import { useState, useEffect } from 'react';
import { networkStatusService } from '../services/offline/networkStatus.service';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(networkStatusService.isOnline());
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(
    networkStatusService.isSimulatingOffline()
  );

  useEffect(() => {
    const unsubscribe = networkStatusService.subscribe(() => {
      setIsOnline(networkStatusService.isOnline());
      setIsSimulatedOffline(networkStatusService.isSimulatingOffline());
    });
    return unsubscribe;
  }, []);

  const toggleSimulatedOffline = () => {
    networkStatusService.setSimulatedOffline(!isSimulatedOffline);
  };

  return {
    isOnline,
    isSimulatedOffline,
    toggleSimulatedOffline,
    setSimulatedOffline: (val: boolean) => networkStatusService.setSimulatedOffline(val),
  };
}
