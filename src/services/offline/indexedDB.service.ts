/**
 * IndexedDB Core Service for Offline-First PWA Architecture.
 * Manages local persistence for master data caches, metadata timestamps, outbox queue, and offline trips.
 */

import { OutboxOperation, CacheStoreName, CacheStoreMetadata } from '../../types/offline';
import { ConflictRecord } from '../../types/conflict';

const DB_NAME = 'q_saudi_logistics_offline_db';
const DB_VERSION = 2;

export class IndexedDBService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private memoryStore = new Map<string, Map<string, any>>();

  private isSupported(): boolean {
    return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
  }

  private getItemKey(storeName: string, item: any): string {
    if (!item) return '';
    if (storeName === 'projects') return item.projectId;
    if (storeName === 'carriers') return item.carrierId;
    if (storeName === 'materials') return item.materialId;
    if (storeName === 'trucks') return item.truckId;
    if (storeName === 'drivers') return item.driverId;
    if (storeName === 'pricingRules') return item.pricingRuleId;
    if (storeName === 'outbox') return item.operationId;
    if (storeName === 'metadata') return item.storeName;
    if (storeName === 'conflicts') return item.conflictId;
    return item.id || item.key || JSON.stringify(item);
  }

  private getMemoryStore(storeName: string): Map<string, any> {
    let s = this.memoryStore.get(storeName);
    if (!s) {
      s = new Map<string, any>();
      this.memoryStore.set(storeName, s);
    }
    return s;
  }

  /**
   * Initializes and opens the IndexedDB database instance with all required object stores and indexes.
   */
  public async getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    if (!this.isSupported()) {
      throw new Error('IndexedDB is not supported in this environment');
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 1. Projects store
        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects', { keyPath: 'projectId' });
        }

        // 2. Carriers store
        if (!db.objectStoreNames.contains('carriers')) {
          const carrierStore = db.createObjectStore('carriers', { keyPath: 'carrierId' });
          carrierStore.createIndex('projectId', 'projectId', { unique: false });
        }

        // 3. Materials store
        if (!db.objectStoreNames.contains('materials')) {
          const matStore = db.createObjectStore('materials', { keyPath: 'materialId' });
          matStore.createIndex('projectId', 'projectId', { unique: false });
        }

        // 4. Trucks store
        if (!db.objectStoreNames.contains('trucks')) {
          const truckStore = db.createObjectStore('trucks', { keyPath: 'truckId' });
          truckStore.createIndex('carrierId', 'carrierId', { unique: false });
          truckStore.createIndex('projectId', 'projectId', { unique: false });
        }

        // 5. Drivers store
        if (!db.objectStoreNames.contains('drivers')) {
          const driverStore = db.createObjectStore('drivers', { keyPath: 'driverId' });
          driverStore.createIndex('carrierId', 'carrierId', { unique: false });
          driverStore.createIndex('projectId', 'projectId', { unique: false });
        }

        // 6. Pricing Rules store
        if (!db.objectStoreNames.contains('pricingRules')) {
          const pricingStore = db.createObjectStore('pricingRules', { keyPath: 'pricingRuleId' });
          pricingStore.createIndex('projectId', 'projectId', { unique: false });
          pricingStore.createIndex('carrierId', 'carrierId', { unique: false });
          pricingStore.createIndex('materialId', 'materialId', { unique: false });
        }

        // 7. Trips store (local offline trips)
        if (!db.objectStoreNames.contains('trips')) {
          const tripStore = db.createObjectStore('trips', { keyPath: 'tripId' });
          tripStore.createIndex('projectId', 'projectId', { unique: false });
          tripStore.createIndex('status', 'status', { unique: false });
        }

        // 8. Outbox store (sync operations queue)
        if (!db.objectStoreNames.contains('outbox')) {
          const outboxStore = db.createObjectStore('outbox', { keyPath: 'operationId' });
          outboxStore.createIndex('status', 'status', { unique: false });
          outboxStore.createIndex('projectId', 'projectId', { unique: false });
          outboxStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // 9. Metadata store for version and timestamp tracking
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'storeName' });
        }

        // 10. Conflicts store for explicit conflict records and resolutions
        if (!db.objectStoreNames.contains('conflicts')) {
          const conflictStore = db.createObjectStore('conflicts', { keyPath: 'conflictId' });
          conflictStore.createIndex('status', 'status', { unique: false });
          conflictStore.createIndex('conflictType', 'conflictType', { unique: false });
          conflictStore.createIndex('operationId', 'operationId', { unique: false });
          conflictStore.createIndex('projectId', 'projectId', { unique: false });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        this.dbPromise = null;
        reject(request.error || new Error('Failed to open IndexedDB'));
      };
    });

    return this.dbPromise;
  }

  // ---------------- Generic CRUD Operations ---------------- //

  public async getAll<T>(storeName: string): Promise<T[]> {
    if (!this.isSupported()) {
      return Array.from(this.getMemoryStore(storeName).values()) as T[];
    }
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(request.error);
    });
  }

  public async getById<T>(storeName: string, key: string): Promise<T | undefined> {
    if (!this.isSupported()) {
      return this.getMemoryStore(storeName).get(key) as T | undefined;
    }
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result as T | undefined);
      request.onerror = () => reject(request.error);
    });
  }

  public async put<T>(storeName: string, value: T): Promise<void> {
    if (!this.isSupported()) {
      const k = this.getItemKey(storeName, value);
      this.getMemoryStore(storeName).set(k, value);
      return;
    }
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(value);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  public async putMany<T>(storeName: string, items: T[]): Promise<void> {
    if (!this.isSupported()) {
      const s = this.getMemoryStore(storeName);
      items.forEach(item => s.set(this.getItemKey(storeName, item), item));
      return;
    }
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      items.forEach((item) => store.put(item));

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  public async delete(storeName: string, key: string): Promise<void> {
    if (!this.isSupported()) {
      this.getMemoryStore(storeName).delete(key);
      return;
    }
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  public async clear(storeName: string): Promise<void> {
    if (!this.isSupported()) {
      this.getMemoryStore(storeName).clear();
      return;
    }
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  public async count(storeName: string): Promise<number> {
    if (!this.isSupported()) {
      return this.getMemoryStore(storeName).size;
    }
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ---------------- Cache Metadata Operations ---------------- //

  public async getMetadata(storeName: CacheStoreName): Promise<CacheStoreMetadata | undefined> {
    return this.getById<CacheStoreMetadata>('metadata', storeName);
  }

  public async getAllMetadata(): Promise<CacheStoreMetadata[]> {
    return this.getAll<CacheStoreMetadata>('metadata');
  }

  public async setMetadata(meta: CacheStoreMetadata): Promise<void> {
    return this.put<CacheStoreMetadata>('metadata', meta);
  }

  // ---------------- Outbox Specific Operations ---------------- //

  public async getOutboxOperations(): Promise<OutboxOperation[]> {
    const ops = await this.getAll<OutboxOperation>('outbox');
    // Sort descending by createdAt
    return ops.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async saveOutboxOperation(op: OutboxOperation): Promise<void> {
    return this.put<OutboxOperation>('outbox', op);
  }

  public async updateOutboxStatus(
    operationId: string, 
    status: OutboxOperation['status'], 
    extra?: Partial<OutboxOperation>
  ): Promise<void> {
    const existing = await this.getById<OutboxOperation>('outbox', operationId);
    if (!existing) return;

    const updated: OutboxOperation = {
      ...existing,
      status,
      ...extra,
    };
    return this.put<OutboxOperation>('outbox', updated);
  }

  // ---------------- Conflicts Storage Operations ---------------- //

  public async getConflictRecords(): Promise<ConflictRecord[]> {
    try {
      const records = await this.getAll<ConflictRecord>('conflicts');
      return records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch {
      return [];
    }
  }

  public async getConflictRecordById(conflictId: string): Promise<ConflictRecord | undefined> {
    try {
      return this.getById<ConflictRecord>('conflicts', conflictId);
    } catch {
      return undefined;
    }
  }

  public async saveConflictRecord(conflict: ConflictRecord): Promise<void> {
    try {
      return this.put<ConflictRecord>('conflicts', conflict);
    } catch (err) {
      console.warn('Failed to save conflict record into IndexedDB:', err);
    }
  }

  public async updateConflictRecord(
    conflictId: string, 
    updates: Partial<ConflictRecord>
  ): Promise<void> {
    try {
      const existing = await this.getConflictRecordById(conflictId);
      if (!existing) return;
      const updated: ConflictRecord = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      return this.put<ConflictRecord>('conflicts', updated);
    } catch (err) {
      console.warn('Failed to update conflict record in IndexedDB:', err);
    }
  }
}

export const indexedDBService = new IndexedDBService();
