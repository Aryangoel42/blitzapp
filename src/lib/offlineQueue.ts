// Offline Queue Management for Analytics Exports

export interface ExportQueueItem {
  id: string;
  type: 'tasks' | 'focus-sessions' | 'summary';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  filters: any;
  downloadUrl?: string;
  error?: string;
}

export interface OfflineQueueManager {
  addToQueue: (item: Omit<ExportQueueItem, 'id' | 'status' | 'createdAt'>) => Promise<string>;
  getQueue: () => Promise<ExportQueueItem[]>;
  updateStatus: (id: string, status: ExportQueueItem['status'], downloadUrl?: string, error?: string) => Promise<void>;
  removeFromQueue: (id: string) => Promise<void>;
  processQueue: () => Promise<void>;
  isOnline: () => boolean;
}

class OfflineQueueManagerImpl implements OfflineQueueManager {
  private dbName = 'analytics-exports';
  private dbVersion = 1;
  private storeName = 'exports';

  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };
    });
  }

  async addToQueue(item: Omit<ExportQueueItem, 'id' | 'status' | 'createdAt'>): Promise<string> {
    const db = await this.openDB();
    const transaction = db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);
    
    const queueItem: ExportQueueItem = {
      ...item,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      status: 'pending',
      createdAt: new Date()
    };
    
    return new Promise((resolve, reject) => {
      const request = store.add(queueItem);
      request.onsuccess = () => resolve(queueItem.id);
      request.onerror = () => reject(request.error);
    });
  }

  async getQueue(): Promise<ExportQueueItem[]> {
    const db = await this.openDB();
    const transaction = db.transaction([this.storeName], 'readonly');
    const store = transaction.objectStore(this.storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updateStatus(id: string, status: ExportQueueItem['status'], downloadUrl?: string, error?: string): Promise<void> {
    const db = await this.openDB();
    const transaction = db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);
    
    return new Promise((resolve, reject) => {
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (item) {
          const updatedItem = { ...item, status, downloadUrl, error };
          const putRequest = store.put(updatedItem);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          reject(new Error('Item not found'));
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async removeFromQueue(id: string): Promise<void> {
    const db = await this.openDB();
    const transaction = db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async processQueue(): Promise<void> {
    if (!this.isOnline()) {
      console.log('Offline - queue processing deferred');
      return;
    }

    const queue = await this.getQueue();
    const pendingItems = queue.filter(item => item.status === 'pending');
    
    console.log(`Processing ${pendingItems.length} pending exports`);
    
    for (const item of pendingItems) {
      try {
        await this.updateStatus(item.id, 'processing');
        
        const response = await fetch('/api/analytics/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: 'user-123', // Replace with actual user ID
            exportType: item.type,
            filters: item.filters
          })
        });

        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          await this.updateStatus(item.id, 'completed', url);
          
          // Auto-download the file
          const a = document.createElement('a');
          a.href = url;
          a.download = `${item.type}_export_${new Date().toISOString().split('T')[0]}.csv`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          
          // Clean up URL after a delay
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        } else {
          throw new Error(`Export failed: ${response.status}`);
        }
      } catch (error) {
        console.error(`Failed to process export ${item.id}:`, error);
        await this.updateStatus(item.id, 'failed', undefined, error instanceof Error ? error.message : 'Unknown error');
      }
    }
  }

  isOnline(): boolean {
    return navigator.onLine;
  }
}

// Service Worker for offline queue processing
export function registerServiceWorker(): Promise<void> {
  if ('serviceWorker' in navigator) {
    return navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('Service Worker registered:', registration);
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });
  }
  return Promise.resolve();
}

// Create singleton instance
export const offlineQueueManager = new OfflineQueueManagerImpl();

// Event listeners for online/offline status
export function setupOfflineQueueListeners(): void {
  window.addEventListener('online', () => {
    console.log('Back online - processing queue');
    offlineQueueManager.processQueue();
  });

  window.addEventListener('offline', () => {
    console.log('Gone offline - queue processing paused');
  });
}

// Utility functions for the analytics dashboard
export async function addExportToOfflineQueue(
  type: 'tasks' | 'focus-sessions' | 'summary',
  filters: any
): Promise<string> {
  return offlineQueueManager.addToQueue({ type, filters });
}

export async function getOfflineQueue(): Promise<ExportQueueItem[]> {
  return offlineQueueManager.getQueue();
}

export async function processOfflineQueue(): Promise<void> {
  return offlineQueueManager.processQueue();
}
