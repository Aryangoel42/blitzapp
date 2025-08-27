'use client';

import { useState, useEffect } from 'react';
import { performanceBudgetManager } from '@/lib/performanceBudgets';

export default function PerformanceBudgetTest() {
  const [budget, setBudget] = useState(performanceBudgetManager.getBudget());
  const [violations, setViolations] = useState(performanceBudgetManager.getViolations());

  useEffect(() => {
    const interval = setInterval(() => {
      setBudget(performanceBudgetManager.getBudget());
      setViolations(performanceBudgetManager.getViolations());
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const testBudgetViolation = () => {
    // Simulate a performance budget violation
    const testMetrics = {
      firstContentfulPaint: 3000, // Over budget (2000ms)
      largestContentfulPaint: 6000, // Over budget (4000ms)
      cumulativeLayoutShift: 0.15, // Over budget (0.1)
      firstInputDelay: 150, // Over budget (100ms)
      timeToInteractive: 7000, // Over budget (5000ms)
      memoryUsage: 0.9 // Over budget (0.8)
    };

    performanceBudgetManager.checkMetrics(testMetrics);
    setViolations(performanceBudgetManager.getViolations());
  };

  const clearViolations = () => {
    performanceBudgetManager.clearViolations();
    setViolations([]);
  };

  const resetBudget = () => {
    const defaultBudget = {
      firstContentfulPaint: 2000,
      largestContentfulPaint: 4000,
      cumulativeLayoutShift: 0.1,
      firstInputDelay: 100,
      timeToInteractive: 5000,
      memoryUsage: 0.8
    };
    performanceBudgetManager.setBudget(defaultBudget);
    setBudget(defaultBudget);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Performance Budget Test</h2>
      
      {/* Current Budget */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Current Budget</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm text-gray-600">FCP</div>
            <div className="text-lg font-bold">{budget.firstContentfulPaint}ms</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm text-gray-600">LCP</div>
            <div className="text-lg font-bold">{budget.largestContentfulPaint}ms</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm text-gray-600">CLS</div>
            <div className="text-lg font-bold">{budget.cumulativeLayoutShift}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm text-gray-600">FID</div>
            <div className="text-lg font-bold">{budget.firstInputDelay}ms</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm text-gray-600">TTI</div>
            <div className="text-lg font-bold">{budget.timeToInteractive}ms</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm text-gray-600">Memory</div>
            <div className="text-lg font-bold">{Math.round(budget.memoryUsage * 100)}%</div>
          </div>
        </div>
      </div>

      {/* Violations */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">
          Violations ({violations.length})
        </h3>
        {violations.length > 0 ? (
          <div className="space-y-2">
            {violations.slice(-5).map((violation, index) => (
              <div key={index} className="flex justify-between items-center bg-red-50 p-3 rounded">
                <span className="font-medium">{violation.metric}</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  violation.severity === 'high' ? 'bg-red-200 text-red-800' :
                  violation.severity === 'medium' ? 'bg-orange-200 text-orange-800' :
                  'bg-yellow-200 text-yellow-800'
                }`}>
                  {violation.severity}
                </span>
                <span className="text-gray-600">
                  {typeof violation.currentValue === 'number' && violation.currentValue > 1000 
                    ? `${(violation.currentValue / 1000).toFixed(1)}s` 
                    : violation.currentValue.toFixed(2)} / {typeof violation.budgetValue === 'number' && violation.budgetValue > 1000 
                      ? `${(violation.budgetValue / 1000).toFixed(1)}s` 
                      : violation.budgetValue.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-500 text-center py-4">No violations detected</div>
        )}
      </div>

      {/* Test Actions */}
      <div className="flex space-x-4">
        <button
          onClick={testBudgetViolation}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Test Budget Violation
        </button>
        
        <button
          onClick={clearViolations}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Clear Violations
        </button>

        <button
          onClick={resetBudget}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Reset Budget
        </button>
      </div>

      {/* Budget Recommendations */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Budget Recommendations</h3>
        <button
          onClick={() => {
            const recommendations = performanceBudgetManager.getBudgetRecommendations();
            if (recommendations.length > 0) {
              alert('Budget Recommendations:\n\n' + recommendations.join('\n'));
            } else {
              alert('No budget recommendations at this time.');
            }
          }}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          Get Recommendations
        </button>
      </div>
    </div>
  );
}
