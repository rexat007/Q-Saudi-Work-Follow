/**
 * IndexedDB Core Service for Offline-First PWA Architecture.
 * Manages local persistence for master data caches, metadata timestamps, outbox queue, and offline trips.
 */

import { OutboxOperation, CacheStoreName, CacheStoreMetadata } from '../../types/offline';

const DB_NAME = 'q_saudi_logistics_offline_db';
const DB_VERSION = 1;

export class IndexedDBService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  /**
   * Initializes and opens the IndexedDB database instance with all required object stores and indexes.
   */
  public async getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    if (typeof window === 'undefined' || !window.indexedDB) {
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
}

export const indexedDBService = new IndexedDBService();
