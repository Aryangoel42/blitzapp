'use client';

import { useState, useEffect } from 'react';
import { pwaManager, PWAPerformanceMetrics } from '@/lib/pwa';
import { performanceBudgetManager, type PerformanceBudget, type PerformanceViolation } from '@/lib/performanceBudgets';

interface PerformanceMonitorProps {
  showDetails?: boolean;
}

export default function PerformanceMonitor({ showDetails = false }: PerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<PWAPerformanceMetrics | null>(null);
  const [queueStatus, setQueueStatus] = useState({ total: 0, pending: 0, failed: 0 });
  const [isOffline, setIsOffline] = useState(false);
  const [budget, setBudget] = useState<PerformanceBudget | null>(null);
  const [violations, setViolations] = useState<PerformanceViolation[]>([]);
  const [showBudgetSettings, setShowBudgetSettings] = useState(false);

  useEffect(() => {
    // Load initial metrics
    loadMetrics();
    loadQueueStatus();
    checkOnlineStatus();
    loadBudgetAndViolations();

    // Set up periodic updates
    const interval = setInterval(() => {
      loadMetrics();
      loadQueueStatus();
      checkOnlineStatus();
      loadBudgetAndViolations();
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const loadMetrics = () => {
    const performanceMetrics = pwaManager.getPerformanceMetrics();
    if (performanceMetrics) {
      setMetrics(performanceMetrics);
    }
  };

  const loadQueueStatus = () => {
    const status = pwaManager.getOfflineQueueStatus();
    setQueueStatus(status);
  };

  const checkOnlineStatus = () => {
    setIsOffline(pwaManager.isOffline());
  };

  const loadBudgetAndViolations = () => {
    const currentBudget = performanceBudgetManager.getBudget();
    const currentViolations = performanceBudgetManager.getViolations();
    setBudget(currentBudget);
    setViolations(currentViolations);
  };

  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getPerformanceScore = (): number => {
    if (!metrics) return 0;

    let score = 100;

    // Deduct points for poor performance
    if (metrics.firstContentfulPaint > 2000) score -= 20;
    if (metrics.largestContentfulPaint > 4000) score -= 20;
    if (metrics.cumulativeLayoutShift > 0.1) score -= 20;
    if (metrics.firstInputDelay > 100) score -= 20;
    if (metrics.timeToInteractive > 5000) score -= 20;

    return Math.max(0, score);
  };

  const getPerformanceGrade = (score: number): string => {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  };

  const getGradeColor = (grade: string): string => {
    switch (grade) {
      case 'A': return 'text-green-600';
      case 'B': return 'text-blue-600';
      case 'C': return 'text-yellow-600';
      case 'D': return 'text-orange-600';
      case 'F': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getBudgetStatus = (metric: keyof PerformanceBudget, currentValue?: number): { status: 'good' | 'warning' | 'critical'; color: string } => {
    if (!budget || !currentValue) return { status: 'good', color: 'text-green-600' };

    const budgetValue = budget[metric];
    const ratio = currentValue / budgetValue;

    if (ratio <= 1.0) return { status: 'good', color: 'text-green-600' };
    if (ratio <= 1.2) return { status: 'warning', color: 'text-yellow-600' };
    return { status: 'critical', color: 'text-red-600' };
  };

  const updateBudget = (newBudget: Partial<PerformanceBudget>) => {
    if (budget) {
      const updatedBudget = { ...budget, ...newBudget };
      const validation = performanceBudgetManager.validateBudget(updatedBudget);
      
      if (validation.isValid) {
        performanceBudgetManager.setBudget(updatedBudget);
        setBudget(updatedBudget);
      } else {
        alert(`Invalid budget values: ${validation.errors.join(', ')}`);
      }
    }
  };

  if (!showDetails) {
    // Compact view
    const score = getPerformanceScore();
    const grade = getPerformanceGrade(score);
    const gradeColor = getGradeColor(grade);

    return (
      <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border p-3 min-w-[200px]">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-700">Performance</h3>
          <div className={`text-lg font-bold ${gradeColor}`}>{grade}</div>
        </div>
        
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Score:</span>
            <span className="font-medium">{score}/100</span>
          </div>
          
          {isOffline && (
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Status:</span>
              <span className="text-orange-600 font-medium">Offline</span>
            </div>
          )}
          
          {queueStatus.total > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Queue:</span>
              <span className="font-medium">{queueStatus.total}</span>
            </div>
          )}

          {violations.length > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Violations:</span>
              <span className="text-red-600 font-medium">{violations.length}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Detailed view
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Performance Monitor</h2>
      
      {/* Performance Score */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-700">Overall Performance</h3>
          <div className="flex items-center space-x-3">
            <div className={`text-3xl font-bold ${getGradeColor(getPerformanceGrade(getPerformanceScore()))}`}>
              {getPerformanceGrade(getPerformanceScore())}
            </div>
            <div className="text-2xl font-bold text-gray-800">
              {getPerformanceScore()}/100
            </div>
          </div>
        </div>
      </div>

      {/* Performance Budgets */}
      {budget && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-700">Performance Budgets</h3>
            <button
              onClick={() => setShowBudgetSettings(!showBudgetSettings)}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {showBudgetSettings ? 'Hide' : 'Edit'} Budgets
            </button>
          </div>

          {showBudgetSettings && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Contentful Paint (ms)
                  </label>
                  <input
                    type="number"
                    value={budget.firstContentfulPaint}
                    onChange={(e) => updateBudget({ firstContentfulPaint: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-md"
                    min="500"
                    max="10000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Largest Contentful Paint (ms)
                  </label>
                  <input
                    type="number"
                    value={budget.largestContentfulPaint}
                    onChange={(e) => updateBudget({ largestContentfulPaint: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-md"
                    min="1000"
                    max="15000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cumulative Layout Shift
                  </label>
                  <input
                    type="number"
                    value={budget.cumulativeLayoutShift}
                    onChange={(e) => updateBudget({ cumulativeLayoutShift: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-md"
                    min="0"
                    max="1"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Input Delay (ms)
                  </label>
                  <input
                    type="number"
                    value={budget.firstInputDelay}
                    onChange={(e) => updateBudget({ firstInputDelay: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-md"
                    min="10"
                    max="500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time to Interactive (ms)
                  </label>
                  <input
                    type="number"
                    value={budget.timeToInteractive}
                    onChange={(e) => updateBudget({ timeToInteractive: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-md"
                    min="1000"
                    max="15000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Memory Usage (%)
                  </label>
                  <input
                    type="number"
                    value={Math.round(budget.memoryUsage * 100)}
                    onChange={(e) => updateBudget({ memoryUsage: parseInt(e.target.value) / 100 })}
                    className="w-full px-3 py-2 border rounded-md"
                    min="10"
                    max="100"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-700 mb-2">FCP Budget</h4>
              <div className="text-2xl font-bold text-blue-600">
                {budget.firstContentfulPaint}ms
              </div>
              <div className="text-sm text-gray-500 mt-1">
                Target: Good user experience
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-700 mb-2">LCP Budget</h4>
              <div className="text-2xl font-bold text-blue-600">
                {budget.largestContentfulPaint}ms
              </div>
              <div className="text-sm text-gray-500 mt-1">
                Target: Content loading
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-700 mb-2">CLS Budget</h4>
              <div className="text-2xl font-bold text-blue-600">
                {budget.cumulativeLayoutShift.toFixed(3)}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                Target: Layout stability
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-700 mb-2">FID Budget</h4>
              <div className="text-2xl font-bold text-blue-600">
                {budget.firstInputDelay}ms
              </div>
              <div className="text-sm text-gray-500 mt-1">
                Target: Interactivity
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-700 mb-2">TTI Budget</h4>
              <div className="text-2xl font-bold text-blue-600">
                {budget.timeToInteractive}ms
              </div>
              <div className="text-sm text-gray-500 mt-1">
                Target: Responsiveness
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-700 mb-2">Memory Budget</h4>
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(budget.memoryUsage * 100)}%
              </div>
              <div className="text-sm text-gray-500 mt-1">
                Target: Resource usage
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Core Web Vitals with Budget Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-700 mb-2">First Contentful Paint</h4>
          <div className={`text-2xl font-bold ${getBudgetStatus('firstContentfulPaint', metrics?.firstContentfulPaint).color}`}>
            {metrics?.firstContentfulPaint ? formatTime(metrics.firstContentfulPaint) : 'N/A'}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {budget && metrics?.firstContentfulPaint ? (
              metrics.firstContentfulPaint <= budget.firstContentfulPaint ? 'Good' : 'Over budget'
            ) : 'No data'}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-700 mb-2">Largest Contentful Paint</h4>
          <div className={`text-2xl font-bold ${getBudgetStatus('largestContentfulPaint', metrics?.largestContentfulPaint).color}`}>
            {metrics?.largestContentfulPaint ? formatTime(metrics.largestContentfulPaint) : 'N/A'}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {budget && metrics?.largestContentfulPaint ? (
              metrics.largestContentfulPaint <= budget.largestContentfulPaint ? 'Good' : 'Over budget'
            ) : 'No data'}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-700 mb-2">Cumulative Layout Shift</h4>
          <div className={`text-2xl font-bold ${getBudgetStatus('cumulativeLayoutShift', metrics?.cumulativeLayoutShift).color}`}>
            {metrics?.cumulativeLayoutShift ? metrics.cumulativeLayoutShift.toFixed(3) : 'N/A'}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {budget && metrics?.cumulativeLayoutShift ? (
              metrics.cumulativeLayoutShift <= budget.cumulativeLayoutShift ? 'Good' : 'Over budget'
            ) : 'No data'}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-700 mb-2">First Input Delay</h4>
          <div className={`text-2xl font-bold ${getBudgetStatus('firstInputDelay', metrics?.firstInputDelay).color}`}>
            {metrics?.firstInputDelay ? formatTime(metrics.firstInputDelay) : 'N/A'}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {budget && metrics?.firstInputDelay ? (
              metrics.firstInputDelay <= budget.firstInputDelay ? 'Good' : 'Over budget'
            ) : 'No data'}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-700 mb-2">Time to Interactive</h4>
          <div className={`text-2xl font-bold ${getBudgetStatus('timeToInteractive', metrics?.timeToInteractive).color}`}>
            {metrics?.timeToInteractive ? formatTime(metrics.timeToInteractive) : 'N/A'}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {budget && metrics?.timeToInteractive ? (
              metrics.timeToInteractive <= budget.timeToInteractive ? 'Good' : 'Over budget'
            ) : 'No data'}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-700 mb-2">Memory Usage</h4>
          <div className={`text-2xl font-bold ${getBudgetStatus('memoryUsage', metrics?.memoryUsage).color}`}>
            {metrics?.memoryUsage ? `${(metrics.memoryUsage * 100).toFixed(1)}%` : 'N/A'}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {budget && metrics?.memoryUsage ? (
              metrics.memoryUsage <= budget.memoryUsage ? 'Good' : 'Over budget'
            ) : 'No data'}
          </div>
        </div>
      </div>

      {/* Performance Violations */}
      {violations.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">Performance Violations</h3>
          <div className="bg-red-50 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{violations.length}</div>
                <div className="text-sm text-red-700">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {violations.filter(v => v.severity === 'low').length}
                </div>
                <div className="text-sm text-yellow-700">Low</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {violations.filter(v => v.severity === 'medium').length}
                </div>
                <div className="text-sm text-orange-700">Medium</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {violations.filter(v => v.severity === 'high').length}
                </div>
                <div className="text-sm text-red-700">High</div>
              </div>
            </div>
            
            <div className="space-y-2">
              {violations.slice(-5).map((violation, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <span className="font-medium">{violation.metric}</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    violation.severity === 'high' ? 'bg-red-200 text-red-800' :
                    violation.severity === 'medium' ? 'bg-orange-200 text-orange-800' :
                    'bg-yellow-200 text-yellow-800'
                  }`}>
                    {violation.severity}
                  </span>
                  <span className="text-gray-600">
                    {violation.currentValue.toFixed(2)} / {violation.budgetValue.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 flex space-x-2">
              <button
                onClick={() => performanceBudgetManager.clearViolations()}
                className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
              >
                Clear Violations
              </button>
              <button
                onClick={() => {
                  const recommendations = performanceBudgetManager.getBudgetRecommendations();
                  if (recommendations.length > 0) {
                    alert('Budget Recommendations:\n\n' + recommendations.join('\n'));
                  } else {
                    alert('No budget recommendations at this time.');
                  }
                }}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Get Recommendations
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Offline Status */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Offline Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-700 mb-2">Connection Status</h4>
            <div className={`text-lg font-bold ${isOffline ? 'text-orange-600' : 'text-green-600'}`}>
              {isOffline ? 'Offline' : 'Online'}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-700 mb-2">Offline Queue</h4>
            <div className="text-lg font-bold text-blue-600">
              {queueStatus.total} items
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {queueStatus.pending} pending, {queueStatus.failed} failed
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-700 mb-2">Cache Status</h4>
            <div className="text-lg font-bold text-blue-600">
              Active
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Service Worker running
            </div>
          </div>
        </div>
      </div>

      {/* Performance Recommendations */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Recommendations</h3>
        <div className="bg-blue-50 rounded-lg p-4">
          <ul className="space-y-2 text-sm text-blue-800">
            {metrics?.firstContentfulPaint && metrics.firstContentfulPaint > 2000 && (
              <li>• First Contentful Paint is slow. Consider optimizing initial page load.</li>
            )}
            {metrics?.largestContentfulPaint && metrics.largestContentfulPaint > 4000 && (
              <li>• Largest Contentful Paint is slow. Optimize main content loading.</li>
            )}
            {metrics?.cumulativeLayoutShift && metrics.cumulativeLayoutShift > 0.1 && (
              <li>• High layout shift detected. Fix layout stability issues.</li>
            )}
            {metrics?.firstInputDelay && metrics.firstInputDelay > 100 && (
              <li>• First Input Delay is high. Reduce JavaScript execution time.</li>
            )}
            {metrics?.memoryUsage && metrics.memoryUsage > 0.8 && (
              <li>• High memory usage detected. Check for memory leaks.</li>
            )}
            {queueStatus.failed > 0 && (
              <li>• Some offline operations failed. Check network connectivity.</li>
            )}
            {violations.length > 0 && (
              <li>• Performance budget violations detected. Review and adjust budgets.</li>
            )}
            {!metrics && (
              <li>• Performance metrics not available. Refresh the page to collect data.</li>
            )}
          </ul>
        </div>
      </div>

      {/* Actions */}
      <div className="flex space-x-4">
        <button
          onClick={() => {
            loadMetrics();
            loadQueueStatus();
            loadBudgetAndViolations();
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Refresh Metrics
        </button>
        
        <button
          onClick={() => pwaManager.clearOfflineQueue()}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Clear Offline Queue
        </button>

        <button
          onClick={() => performanceBudgetManager.clearViolations()}
          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
        >
          Clear Violations
        </button>
      </div>
    </div>
  );
}
