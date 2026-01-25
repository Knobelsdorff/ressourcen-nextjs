/**
 * IndexedDB utility for storing audio recordings
 * Supports much larger file sizes than localStorage (typically 50MB+)
 * and stores Blobs directly without Base64 conversion
 */

const DB_NAME = 'ResourceRecordingsDB';
const DB_VERSION = 1;
const STORE_NAME = 'recordings';

export interface StoredRecording {
  id: string;
  name: string;
  audioBlob: Blob;
  mimeType: string;
  timestamp: number;
}

export interface DraftData {
  recordings: StoredRecording[];
  clientEmail: string;
  lastUpdated: number;
}

class IndexedDBHelper {
  private dbPromise: Promise<IDBDatabase> | null = null;

  /**
   * Open or create the IndexedDB database
   */
  private openDB(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      };
    });

    return this.dbPromise;
  }

  /**
   * Save draft data (recordings + email) to IndexedDB
   */
  async saveDraft(data: DraftData): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      await new Promise<void>((resolve, reject) => {
        const request = store.put({
          key: 'draft',
          data: data,
        });

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error saving to IndexedDB:', error);
      throw error;
    }
  }

  /**
   * Load draft data from IndexedDB
   */
  async loadDraft(): Promise<DraftData | null> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);

      return new Promise<DraftData | null>((resolve, reject) => {
        const request = store.get('draft');

        request.onsuccess = () => {
          const result = request.result;
          if (result && result.data) {
            resolve(result.data);
          } else {
            resolve(null);
          }
        };

        request.onerror = () => {
          console.error('Error loading from IndexedDB:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Error loading from IndexedDB:', error);
      return null;
    }
  }

  /**
   * Clear draft data from IndexedDB
   */
  async clearDraft(): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      await new Promise<void>((resolve, reject) => {
        const request = store.delete('draft');

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error clearing IndexedDB:', error);
      throw error;
    }
  }

  /**
   * Check if IndexedDB is supported
   */
  isSupported(): boolean {
    return typeof indexedDB !== 'undefined';
  }
}

// Export singleton instance
export const indexedDBHelper = new IndexedDBHelper();
