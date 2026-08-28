/**
 * Tiered Persistence Facade
 * Manages Volatile Memory, sessionStorage, localStorage, and IndexedDB with envelope versioning.
 */

import { PersistedKernelEnvelope, PlaybackSessionCache, UserPreferences } from '../types';

const CURRENT_SCHEMA_VERSION = 1;
const LS_PREF_KEY = 'ajn_liberty_preferences_v1';
const SS_RECOVERY_KEY = 'ajn_liberty_recovery_v1';
const IDB_NAME = 'ajn_liberty_kernel_db';
const IDB_STORE = 'session_cache';

export class KernelPersistenceFacade {
  private static bootId = Math.random().toString(36).substring(2, 11);

  // --- 1. Volatile Memory State ---
  private memoryState = {
    retryCount: 0,
    currentState: 'BOOT' as string,
    activeError: null as string | null,
    isRecovering: false,
    pendingNavigation: null as string | null,
  };

  public getMemoryState() {
    return { ...this.memoryState };
  }

  public setMemoryState(partial: Partial<typeof this.memoryState>) {
    this.memoryState = { ...this.memoryState, ...partial };
  }

  public resetMemoryTransient() {
    this.memoryState.retryCount = 0;
    this.memoryState.activeError = null;
    this.memoryState.isRecovering = false;
    this.memoryState.pendingNavigation = null;
  }

  // --- 2. sessionStorage (Tab-scoped recovery state) ---
  public getSessionRecoveryState() {
    try {
      const raw = sessionStorage.getItem(SS_RECOVERY_KEY);
      if (!raw) return { bootId: KernelPersistenceFacade.bootId, recoveryInProgress: false, lastAttemptAt: Date.now() };
      const envelope: PersistedKernelEnvelope<{ recoveryInProgress: boolean; lastAttemptAt: number }> = JSON.parse(raw);
      return {
        bootId: envelope.bootId,
        recoveryInProgress: envelope.data.recoveryInProgress,
        lastAttemptAt: envelope.data.lastAttemptAt,
      };
    } catch {
      return { bootId: KernelPersistenceFacade.bootId, recoveryInProgress: false, lastAttemptAt: Date.now() };
    }
  }

  public setSessionRecoveryState(recoveryInProgress: boolean) {
    try {
      const envelope: PersistedKernelEnvelope<any> = {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        bootId: KernelPersistenceFacade.bootId,
        updatedAt: Date.now(),
        data: { recoveryInProgress, lastAttemptAt: Date.now() },
      };
      sessionStorage.setItem(SS_RECOVERY_KEY, JSON.stringify(envelope));
    } catch (err) {
      console.warn('sessionStorage write failed:', err);
    }
  }

  public purgeSessionRecoveryKey() {
    try {
      sessionStorage.removeItem(SS_RECOVERY_KEY);
    } catch (err) {
      console.warn('sessionStorage purge failed:', err);
    }
  }

  // --- 3. localStorage (Lightweight UX preferences) ---
  public getUserPreferences(): UserPreferences {
    try {
      const raw = localStorage.getItem(LS_PREF_KEY);
      if (!raw) {
        const defaults: UserPreferences = {
          schemaVersion: CURRENT_SCHEMA_VERSION,
          theatreMode: false,
          defaultStartupView: 'GUIDE',
          lastSafeRoute: 'GUIDE',
        };
        this.setUserPreferences(defaults);
        return defaults;
      }
      const envelope: PersistedKernelEnvelope<UserPreferences> = JSON.parse(raw);
      return envelope.data;
    } catch {
      return {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        theatreMode: false,
        defaultStartupView: 'GUIDE',
        lastSafeRoute: 'GUIDE',
      };
    }
  }

  public setUserPreferences(prefs: Partial<UserPreferences>) {
    try {
      const current = this.getUserPreferences();
      const updated = { ...current, ...prefs, schemaVersion: CURRENT_SCHEMA_VERSION };
      const envelope: PersistedKernelEnvelope<UserPreferences> = {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        bootId: KernelPersistenceFacade.bootId,
        updatedAt: Date.now(),
        data: updated,
      };
      localStorage.setItem(LS_PREF_KEY, JSON.stringify(envelope));
    } catch (err) {
      console.warn('localStorage write failed:', err);
    }
  }

  public purgePreferencesKey() {
    try {
      localStorage.removeItem(LS_PREF_KEY);
    } catch (err) {
      console.warn('localStorage purge failed:', err);
    }
  }

  // --- 4. IndexedDB (Durable session & media cache) ---
  public async getIndexedDBCache(): Promise<PlaybackSessionCache | null> {
    return new Promise((resolve) => {
      try {
        const request = indexedDB.open(IDB_NAME, 1);
        request.onerror = () => resolve(null);
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(IDB_STORE)) {
            db.createObjectStore(IDB_STORE);
          }
        };
        request.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          try {
            const tx = db.transaction(IDB_STORE, 'readonly');
            const store = tx.objectStore(IDB_STORE);
            const getReq = store.get('current_session');
            getReq.onsuccess = () => {
              const envelope = getReq.result as PersistedKernelEnvelope<PlaybackSessionCache> | undefined;
              if (!envelope || envelope.schemaVersion !== CURRENT_SCHEMA_VERSION) {
                resolve(null);
              } else {
                resolve(envelope.data);
              }
            };
            getReq.onerror = () => resolve(null);
          } catch {
            resolve(null);
          }
        };
      } catch {
        resolve(null);
      }
    });
  }

  public async setIndexedDBCache(cache: PlaybackSessionCache): Promise<void> {
    return new Promise((resolve) => {
      try {
        const request = indexedDB.open(IDB_NAME, 1);
        request.onerror = () => resolve();
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(IDB_STORE)) {
            db.createObjectStore(IDB_STORE);
          }
        };
        request.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          try {
            const tx = db.transaction(IDB_STORE, 'readwrite');
            const store = tx.objectStore(IDB_STORE);
            const envelope: PersistedKernelEnvelope<PlaybackSessionCache> = {
              schemaVersion: CURRENT_SCHEMA_VERSION,
              bootId: KernelPersistenceFacade.bootId,
              updatedAt: Date.now(),
              data: cache,
            };
            store.put(envelope, 'current_session');
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
          } catch {
            resolve();
          }
        };
      } catch {
        resolve();
      }
    });
  }

  public async clearIndexedDBCache(): Promise<void> {
    return new Promise((resolve) => {
      try {
        const request = indexedDB.open(IDB_NAME, 1);
        request.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          try {
            const tx = db.transaction(IDB_STORE, 'readwrite');
            const store = tx.objectStore(IDB_STORE);
            store.clear();
            tx.oncomplete = () => resolve();
          } catch {
            resolve();
          }
        };
        request.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  // --- 5. Dynamic Session Verification ---
  public async verifyDynamicSession(): Promise<{ sessionActive: boolean; cache: PlaybackSessionCache | null }> {
    const cache = await this.getIndexedDBCache();
    if (!cache) {
      return { sessionActive: false, cache: null };
    }
    // Verify envelope validity and presence of essential media identifiers
    const isValid = typeof cache.lastChannelId === 'number' && typeof cache.positionSeconds === 'number' && cache.programId != null;
    return { sessionActive: isValid, cache };
  }
}

export const persistenceFacade = new KernelPersistenceFacade();
