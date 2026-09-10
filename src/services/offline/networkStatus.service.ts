/**
 * Network Connectivity and Simulated Offline Service.
 * Tracks browser navigator.onLine and supports interactive offline simulation for testing.
 */

import { outboxService } from './outbox.service';

class NetworkStatusService {
  private isBrowserOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private isSimulatedOffline: boolean = false;
  private listeners: Set<() => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }

  private handleOnline = () => {
    this.isBrowserOnline = true;
    this.notify();
    if (!this.isSimulatedOffline) {
      // Trigger automatic background sync when transitioning to online
      outboxService.syncAll(false).catch(console.error);
    }
  };

  private handleOffline = () => {
    this.isBrowserOnline = false;
    this.notify();
  };

  /**
   * Returns true if the system is effectively online (browser is online AND simulation is off).
   */
  public isOnline(): boolean {
    return this.isBrowserOnline && !this.isSimulatedOffline;
  }

  /**
   * Returns true if simulated offline mode is active.
   */
  public isSimulatingOffline(): boolean {
    return this.isSimulatedOffline;
  }

  /**
   * Toggles simulated offline mode on/off.
   */
  public setSimulatedOffline(val: boolean) {
    const wasOffline = !this.isOnline();
    this.isSimulatedOffline = val;
    this.notify();

    // If we just came back online, run sync
    if (wasOffline && this.isOnline()) {
      outboxService.syncAll(false).catch(console.error);
    }
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notify() {
    this.listeners.forEach(cb => {
      try { cb(); } catch {}
    });
  }
}

export const networkStatusService = new NetworkStatusService();
