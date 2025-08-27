import { Suspense, lazy, ComponentType } from 'react';

// Loading component for lazy-loaded components
export function LoadingSpinner({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
      <span className="ml-3 text-gray-600 dark:text-gray-400">{message}</span>
    </div>
  );
}

// Error boundary for lazy-loaded components
export function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="text-red-500 mb-4">
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold mb-2">Something went wrong</h3>
      <p className="text-gray-600 dark:text-gray-400 mb-4">{error.message}</p>
      <button
        onClick={resetErrorBoundary}
        className="bg-brand-500 text-white px-4 py-2 rounded-lg hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
      >
        Try again
      </button>
    </div>
  );
}

// Lazy load wrapper with error boundary
export function lazyLoad<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ComponentType
) {
  const LazyComponent = lazy(importFunc);
  
  return function LazyWrapper(props: React.ComponentProps<T>) {
    return (
      <Suspense fallback={fallback ? <fallback /> : <LoadingSpinner />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

// Preload utility for critical components
export function preloadComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
) {
  return () => {
    importFunc();
  };
}
