// Performance monitoring utilities
export interface PerformanceMetrics {
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  ttfb: number; // Time to First Byte
}

// Performance observer for Core Web Vitals
export function observeCoreWebVitals(callback: (metrics: Partial<PerformanceMetrics>) => void) {
  if (typeof window === 'undefined') return;

  // First Contentful Paint
  if ('PerformanceObserver' in window) {
    try {
      const fcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const fcp = entries[entries.length - 1];
        if (fcp) {
          callback({ fcp: fcp.startTime });
        }
      });
      fcpObserver.observe({ entryTypes: ['paint'] });
    } catch (e) {
      console.warn('FCP observer failed:', e);
    }

    // Largest Contentful Paint
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lcp = entries[entries.length - 1];
        if (lcp) {
          callback({ lcp: lcp.startTime });
        }
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      console.warn('LCP observer failed:', e);
    }

    // First Input Delay
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const fid = entries[entries.length - 1];
        if (fid) {
          callback({ fid: fid.processingStart - fid.startTime });
        }
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch (e) {
      console.warn('FID observer failed:', e);
    }

    // Cumulative Layout Shift
    try {
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
        callback({ cls: clsValue });
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      console.warn('CLS observer failed:', e);
    }
  }

  // Time to First Byte
  const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  if (navigationEntry) {
    callback({ ttfb: navigationEntry.responseStart - navigationEntry.requestStart });
  }
}

// Bundle size monitoring
export function getBundleSize() {
  if (typeof window === 'undefined') return null;

  const resources = performance.getEntriesByType('resource');
  const jsResources = resources.filter(resource => 
    resource.name.includes('.js') || resource.name.includes('chunk')
  );

  const totalSize = jsResources.reduce((total, resource) => {
    const transferSize = (resource as PerformanceResourceTiming).transferSize || 0;
    return total + transferSize;
  }, 0);

  return {
    totalSize,
    jsResources: jsResources.length,
    averageSize: totalSize / jsResources.length
  };
}

// Memory usage monitoring
export function getMemoryUsage() {
  if (typeof window === 'undefined' || !('memory' in performance)) return null;

  const memory = (performance as any).memory;
  return {
    usedJSHeapSize: memory.usedJSHeapSize,
    totalJSHeapSize: memory.totalJSHeapSize,
    jsHeapSizeLimit: memory.jsHeapSizeLimit,
    usagePercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
  };
}

// Performance monitoring hook
export function usePerformanceMonitoring() {
  const [metrics, setMetrics] = useState<Partial<PerformanceMetrics>>({});
  const [bundleSize, setBundleSize] = useState<any>(null);
  const [memoryUsage, setMemoryUsage] = useState<any>(null);

  useEffect(() => {
    // Observe Core Web Vitals
    observeCoreWebVitals((newMetrics) => {
      setMetrics(prev => ({ ...prev, ...newMetrics }));
    });

    // Get bundle size
    setBundleSize(getBundleSize());

    // Monitor memory usage
    const memoryInterval = setInterval(() => {
      setMemoryUsage(getMemoryUsage());
    }, 5000);

    return () => clearInterval(memoryInterval);
  }, []);

  return { metrics, bundleSize, memoryUsage };
}

// Debounce utility for performance optimization
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle utility for performance optimization
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Virtual scrolling utilities
export function createVirtualScroller<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  scrollTop: number
) {
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    startIndex + Math.ceil(containerHeight / itemHeight) + 1,
    items.length
  );

  return {
    startIndex,
    endIndex,
    visibleItems: items.slice(startIndex, endIndex),
    totalHeight: items.length * itemHeight,
    offsetY: startIndex * itemHeight
  };
}

// Import missing React hooks
import { useState, useEffect } from 'react';
