// PWA Management System
// Handles offline continuity, CSV queuing, and performance monitoring

import { performanceBudgetManager, type PerformanceBudget, type PerformanceViolation, type PerformanceMetrics } from './performanceBudgets';

export interface PWAPerformanceMetrics {
  loadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  timeToInteractive: number;
  memoryUsage?: number;
  networkRequests: number;
  cacheHitRate: number;
}

export interface OfflineQueueItem {
  id: string;
  type: 'csv_export' | 'focus_session' | 'task_update' | 'notification';
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  priority: 'high' | 'medium' | 'low';
}

export interface TimerState {
  sessionId: string;
  startTime: number;
  duration: number;
  phase: 'focus' | 'break' | 'long_break';
  taskId?: string;
  isRunning: boolean;
  lastSyncTime: number;
}

export class PWAManager {
  private static instance: PWAManager;
  private performanceObserver: PerformanceObserver | null = null;
  private offlineQueue: OfflineQueueItem[] = [];
  private timerState: TimerState | null = null;
  private isOnline = navigator.onLine;

  static getInstance(): PWAManager {
    if (!PWAManager.instance) {
      PWAManager.instance = new PWAManager();
    }
    return PWAManager.instance;
  }

  // Initialize PWA features
  async initialize(): Promise<void> {
    await this.registerServiceWorker();
    this.setupOfflineDetection();
    this.setupPerformanceMonitoring();
    this.loadOfflineQueue();
    this.loadTimerState();
    this.startPeriodicSync();
  }

  // Service Worker Registration
  private async registerServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', registration);

        // Handle service worker updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                this.showUpdateNotification();
              }
            });
          }
        });

        // Handle service worker messages
        navigator.serviceWorker.addEventListener('message', (event) => {
          this.handleServiceWorkerMessage(event.data);
        });
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  // Offline Detection
  private setupOfflineDetection(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processOfflineQueue();
      this.syncTimerState();
      this.showOnlineNotification();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      if (this.timerState) {
        this.saveTimerState(this.timerState);
      }
      this.showOfflineNotification();
    });
  }

  // Performance Monitoring with Budgets
  private setupPerformanceMonitoring(): void {
    if ('PerformanceObserver' in window) {
      // Monitor Core Web Vitals
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordPerformanceMetric(entry);
        }
      });

      this.performanceObserver.observe({ entryTypes: ['navigation', 'paint', 'largest-contentful-paint', 'layout-shift', 'first-input'] });
    }

    // Monitor memory usage
    if ('memory' in performance) {
      setInterval(() => {
        this.recordMemoryUsage();
      }, 30000); // Every 30 seconds
    }

    // Monitor network requests
    this.setupNetworkMonitoring();
  }

  private setupNetworkMonitoring(): void {
    let requestCount = 0;
    let cacheHitCount = 0;

    // Intercept fetch requests to count them
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      requestCount++;
      
      try {
        const response = await originalFetch(...args);
        
        // Check if response came from cache
        if (response.headers.get('x-cache') === 'HIT') {
          cacheHitCount++;
        }
        
        return response;
      } catch (error) {
        throw error;
      }
    };

    // Update metrics every 10 seconds
    setInterval(() => {
      this.savePerformanceMetrics({
        networkRequests: requestCount,
        cacheHitRate: requestCount > 0 ? cacheHitCount / requestCount : 0
      });
      
      // Reset counters
      requestCount = 0;
      cacheHitCount = 0;
    }, 10000);
  }

  private recordPerformanceMetric(entry: PerformanceEntry): void {
    const metrics: Partial<PWAPerformanceMetrics> = {};

    switch (entry.entryType) {
      case 'navigation':
        const navEntry = entry as PerformanceNavigationTiming;
        metrics.loadTime = navEntry.loadEventEnd - navEntry.loadEventStart;
        metrics.timeToInteractive = navEntry.domInteractive - navEntry.fetchStart;
        break;

      case 'paint':
        const paintEntry = entry as PerformancePaintTiming;
        if (paintEntry.name === 'first-contentful-paint') {
          metrics.firstContentfulPaint = paintEntry.startTime;
        }
        break;

      case 'largest-contentful-paint':
        const lcpEntry = entry as PerformanceEntry;
        metrics.largestContentfulPaint = lcpEntry.startTime;
        break;

      case 'layout-shift':
        const clsEntry = entry as PerformanceEntry;
        metrics.cumulativeLayoutShift = (metrics.cumulativeLayoutShift || 0) + (clsEntry as any).value;
        break;

      case 'first-input':
        const fidEntry = entry as PerformanceEntry;
        // Fix the type issue by properly casting to PerformanceEventTiming
        if ('processingStart' in fidEntry) {
          const eventEntry = fidEntry as PerformanceEventTiming;
          metrics.firstInputDelay = eventEntry.processingStart - eventEntry.startTime;
        }
        break;
    }

    this.savePerformanceMetrics(metrics);
    
    // Check performance budgets
    if (Object.keys(metrics).length > 0) {
      const performanceMetrics: PerformanceMetrics = {
        firstContentfulPaint: metrics.firstContentfulPaint,
        largestContentfulPaint: metrics.largestContentfulPaint,
        cumulativeLayoutShift: metrics.cumulativeLayoutShift,
        firstInputDelay: metrics.firstInputDelay,
        timeToInteractive: metrics.timeToInteractive,
        memoryUsage: metrics.memoryUsage
      };
      
      performanceBudgetManager.checkMetrics(performanceMetrics);
    }
  }

  private recordMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.savePerformanceMetrics({
        memoryUsage: memory.usedJSHeapSize / memory.jsHeapSizeLimit
      });
    }
  }

  private savePerformanceMetrics(metrics: Partial<PWAPerformanceMetrics>): void {
    const stored = localStorage.getItem('pwa_performance_metrics');
    const existing = stored ? JSON.parse(stored) : {};
    const updated = { ...existing, ...metrics, timestamp: Date.now() };
    localStorage.setItem('pwa_performance_metrics', JSON.stringify(updated));
  }

  // Offline Queue Management
  async addToOfflineQueue(item: Omit<OfflineQueueItem, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
    const queueItem: OfflineQueueItem = {
      ...item,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      retryCount: 0
    };

    this.offlineQueue.push(queueItem);
    await this.saveOfflineQueue();

    // Process immediately if online
    if (this.isOnline) {
      this.processOfflineQueue();
    }

    return queueItem.id;
  }

  private async saveOfflineQueue(): Promise<void> {
    localStorage.setItem('pwa_offline_queue', JSON.stringify(this.offlineQueue));
  }

  private async loadOfflineQueue(): Promise<void> {
    const stored = localStorage.getItem('pwa_offline_queue');
    if (stored) {
      this.offlineQueue = JSON.parse(stored);
    }
  }

  private async processOfflineQueue(): Promise<void> {
    if (!this.isOnline || this.offlineQueue.length === 0) {
      return;
    }

    const itemsToProcess = [...this.offlineQueue];
    this.offlineQueue = [];

    for (const item of itemsToProcess) {
      try {
        await this.processQueueItem(item);
      } catch (error) {
        console.error('Failed to process queue item:', error);
        
        // Retry if under max retries
        if (item.retryCount < item.maxRetries) {
          item.retryCount++;
          this.offlineQueue.push(item);
        }
      }
    }

    await this.saveOfflineQueue();
  }

  private async processQueueItem(item: OfflineQueueItem): Promise<void> {
    switch (item.type) {
      case 'csv_export':
        await this.processCSVExport(item);
        break;
      case 'focus_session':
        await this.processFocusSession(item);
        break;
      case 'task_update':
        await this.processTaskUpdate(item);
        break;
      case 'notification':
        await this.processNotification(item);
        break;
    }
  }

  private async processCSVExport(item: OfflineQueueItem): Promise<void> {
    const response = await fetch('/api/analytics/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item.data)
    });

    if (response.ok) {
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      // Trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = `export_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Clean up
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } else {
      throw new Error('CSV export failed');
    }
  }

  private async processFocusSession(item: OfflineQueueItem): Promise<void> {
    await fetch('/api/focus/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item.data)
    });
  }

  private async processTaskUpdate(item: OfflineQueueItem): Promise<void> {
    await fetch('/api/tasks', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item.data)
    });
  }

  private async processNotification(item: OfflineQueueItem): Promise<void> {
    await fetch('/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item.data)
    });
  }

  // Timer State Management
  saveTimerState(state: TimerState): void {
    this.timerState = { ...state, lastSyncTime: Date.now() };
    localStorage.setItem('pwa_timer_state', JSON.stringify(this.timerState));
  }

  loadTimerState(): TimerState | null {
    const stored = localStorage.getItem('pwa_timer_state');
    if (stored) {
      this.timerState = JSON.parse(stored);
      return this.timerState;
    }
    return null;
  }

  private async syncTimerState(): Promise<void> {
    if (this.timerState && this.isOnline) {
      try {
        // Sync timer state with server
        await fetch('/api/focus/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.timerState)
        });
      } catch (error) {
        console.error('Failed to sync timer state:', error);
      }
    }
  }

  // Periodic Sync
  private startPeriodicSync(): void {
    setInterval(() => {
      if (this.isOnline) {
        this.processOfflineQueue();
        this.syncTimerState();
      }
    }, 30000); // Every 30 seconds
  }

  // Notifications
  private showUpdateNotification(): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('BlitzitApp Updated', {
        body: 'A new version is available. Refresh to update.',
        icon: '/icons/icon-192x192.png',
        tag: 'app-update'
      });
    }
  }

  private showOnlineNotification(): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Back Online', {
        body: 'Your data is being synced.',
        icon: '/icons/icon-192x192.png',
        tag: 'online-status'
      });
    }
  }

  private showOfflineNotification(): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Offline Mode', {
        body: 'Working offline. Changes will sync when online.',
        icon: '/icons/icon-192x192.png',
        tag: 'offline-status'
      });
    }
  }

  // Service Worker Message Handling
  private handleServiceWorkerMessage(data: any): void {
    switch (data.type) {
      case 'EXPORT_COMPLETED':
        this.handleExportCompleted(data);
        break;
      case 'SYNC_COMPLETED':
        this.handleSyncCompleted(data);
        break;
      default:
        console.log('Unknown service worker message:', data);
    }
  }

  private handleExportCompleted(data: any): void {
    // Handle export completion
    console.log('Export completed:', data);
  }

  private handleSyncCompleted(data: any): void {
    // Handle sync completion
    console.log('Sync completed:', data);
  }

  // Public API
  async queueCSVExport(exportData: any): Promise<string> {
    return this.addToOfflineQueue({
      type: 'csv_export',
      data: exportData,
      maxRetries: 3,
      priority: 'medium'
    });
  }

  async queueFocusSession(sessionData: any): Promise<string> {
    return this.addToOfflineQueue({
      type: 'focus_session',
      data: sessionData,
      maxRetries: 5,
      priority: 'high'
    });
  }

  async queueTaskUpdate(taskData: any): Promise<string> {
    return this.addToOfflineQueue({
      type: 'task_update',
      data: taskData,
      maxRetries: 3,
      priority: 'medium'
    });
  }

  async queueNotification(notificationData: any): Promise<string> {
    return this.addToOfflineQueue({
      type: 'notification',
      data: notificationData,
      maxRetries: 2,
      priority: 'low'
    });
  }

  getPerformanceMetrics(): PWAPerformanceMetrics | null {
    const stored = localStorage.getItem('pwa_performance_metrics');
    return stored ? JSON.parse(stored) : null;
  }

  getPerformanceBudget(): PerformanceBudget {
    return performanceBudgetManager.getBudget();
  }

  setPerformanceBudget(budget: PerformanceBudget): void {
    performanceBudgetManager.setBudget(budget);
  }

  getPerformanceViolations(): PerformanceViolation[] {
    return performanceBudgetManager.getViolations();
  }

  clearPerformanceViolations(): void {
    performanceBudgetManager.clearViolations();
  }

  getOfflineQueueStatus(): { total: number; pending: number; failed: number } {
    const total = this.offlineQueue.length;
    const pending = this.offlineQueue.filter(item => item.retryCount === 0).length;
    const failed = this.offlineQueue.filter(item => item.retryCount >= item.maxRetries).length;

    return { total, pending, failed };
  }

  isOffline(): boolean {
    return !this.isOnline;
  }

  async clearOfflineQueue(): Promise<void> {
    this.offlineQueue = [];
    await this.saveOfflineQueue();
  }

  // Enhanced CSV Export with Offline Support
  async exportCSVWithOfflineSupport(exportData: any): Promise<string> {
    if (this.isOnline) {
      try {
        // Try immediate export
        const response = await fetch('/api/analytics/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(exportData)
        });

        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          
          // Trigger download
          const a = document.createElement('a');
          a.href = url;
          a.download = `export_${Date.now()}.csv`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          
          // Clean up
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          
          return 'immediate';
        }
      } catch (error) {
        console.log('Immediate export failed, queuing for offline processing');
      }
    }

    // Queue for offline processing
    return this.queueCSVExport(exportData);
  }
}

// Export singleton instance
export const pwaManager = PWAManager.getInstance();
