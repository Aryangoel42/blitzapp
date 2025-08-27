// Performance Budget System for PWA
// Handles performance targets, violation detection, and budget management

export interface PerformanceBudget {
  firstContentfulPaint: number;    // 2000ms target
  largestContentfulPaint: number;  // 4000ms target
  cumulativeLayoutShift: number;   // 0.1 target
  firstInputDelay: number;         // 100ms target
  timeToInteractive: number;       // 5000ms target
  memoryUsage: number;             // 0.8 (80%) target
}

export interface PerformanceViolation {
  timestamp: number;
  metric: string;
  currentValue: number;
  budgetValue: number;
  severity: 'low' | 'medium' | 'high';
  url: string;
  userAgent: string;
}

export interface PerformanceMetrics {
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  cumulativeLayoutShift?: number;
  firstInputDelay?: number;
  timeToInteractive?: number;
  memoryUsage?: number;
}

export class PerformanceBudgetManager {
  private static instance: PerformanceBudgetManager;
  private budget: PerformanceBudget;
  private violations: PerformanceViolation[] = [];

  static getInstance(): PerformanceBudgetManager {
    if (!PerformanceBudgetManager.instance) {
      PerformanceBudgetManager.instance = new PerformanceBudgetManager();
    }
    return PerformanceBudgetManager.instance;
  }

  constructor() {
    this.budget = this.loadDefaultBudget();
    this.violations = this.loadViolations();
  }

  private loadDefaultBudget(): PerformanceBudget {
    const stored = localStorage.getItem('pwa_performance_budget');
    if (stored) {
      return JSON.parse(stored);
    }

    // Default budgets based on Core Web Vitals
    const defaultBudget: PerformanceBudget = {
      firstContentfulPaint: 2000,    // 2 seconds
      largestContentfulPaint: 4000,  // 4 seconds
      cumulativeLayoutShift: 0.1,    // 0.1
      firstInputDelay: 100,          // 100ms
      timeToInteractive: 5000,       // 5 seconds
      memoryUsage: 0.8               // 80%
    };

    // Store default budget
    localStorage.setItem('pwa_performance_budget', JSON.stringify(defaultBudget));
    return defaultBudget;
  }

  private loadViolations(): PerformanceViolation[] {
    const stored = localStorage.getItem('pwa_performance_violations');
    return stored ? JSON.parse(stored) : [];
  }

  getBudget(): PerformanceBudget {
    return { ...this.budget };
  }

  setBudget(newBudget: PerformanceBudget): void {
    this.budget = { ...newBudget };
    localStorage.setItem('pwa_performance_budget', JSON.stringify(this.budget));
  }

  checkMetrics(metrics: PerformanceMetrics): PerformanceViolation[] {
    const violations: PerformanceViolation[] = [];

    if (metrics.firstContentfulPaint && metrics.firstContentfulPaint > this.budget.firstContentfulPaint) {
      violations.push(this.createViolation('firstContentfulPaint', metrics.firstContentfulPaint, this.budget.firstContentfulPaint));
    }

    if (metrics.largestContentfulPaint && metrics.largestContentfulPaint > this.budget.largestContentfulPaint) {
      violations.push(this.createViolation('largestContentfulPaint', metrics.largestContentfulPaint, this.budget.largestContentfulPaint));
    }

    if (metrics.cumulativeLayoutShift && metrics.cumulativeLayoutShift > this.budget.cumulativeLayoutShift) {
      violations.push(this.createViolation('cumulativeLayoutShift', metrics.cumulativeLayoutShift, this.budget.cumulativeLayoutShift));
    }

    if (metrics.firstInputDelay && metrics.firstInputDelay > this.budget.firstInputDelay) {
      violations.push(this.createViolation('firstInputDelay', metrics.firstInputDelay, this.budget.firstInputDelay));
    }

    if (metrics.timeToInteractive && metrics.timeToInteractive > this.budget.timeToInteractive) {
      violations.push(this.createViolation('timeToInteractive', metrics.timeToInteractive, this.budget.timeToInteractive));
    }

    if (metrics.memoryUsage && metrics.memoryUsage > this.budget.memoryUsage) {
      violations.push(this.createViolation('memoryUsage', metrics.memoryUsage, this.budget.memoryUsage));
    }

    if (violations.length > 0) {
      this.recordViolations(violations);
      this.notifyViolations(violations);
    }

    return violations;
  }

  private createViolation(metric: string, currentValue: number, budgetValue: number): PerformanceViolation {
    return {
      timestamp: Date.now(),
      metric,
      currentValue,
      budgetValue,
      severity: this.getViolationSeverity(currentValue, budgetValue),
      url: window.location.href,
      userAgent: navigator.userAgent
    };
  }

  private getViolationSeverity(currentValue: number, budgetValue: number): 'low' | 'medium' | 'high' {
    const ratio = currentValue / budgetValue;
    
    if (ratio <= 1.2) return 'low';
    if (ratio <= 1.5) return 'medium';
    return 'high';
  }

  private recordViolations(violations: PerformanceViolation[]): void {
    this.violations = [...this.violations, ...violations];
    
    // Keep only last 100 violations
    if (this.violations.length > 100) {
      this.violations = this.violations.slice(-100);
    }
    
    localStorage.setItem('pwa_performance_violations', JSON.stringify(this.violations));
  }

  private notifyViolations(violations: PerformanceViolation[]): void {
    // Show console warnings
    violations.forEach(violation => {
      console.warn(`Performance Budget Violation: ${violation.metric}`, {
        current: violation.currentValue,
        budget: violation.budgetValue,
        severity: violation.severity
      });
    });

    // Show user notification for high severity violations
    const highSeverityViolations = violations.filter(v => v.severity === 'high');
    if (highSeverityViolations.length > 0 && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('Performance Alert', {
        body: `${highSeverityViolations.length} high-severity performance issues detected`,
        icon: '/icons/icon-192x192.png',
        tag: 'performance-alert'
      });
    }
  }

  getViolations(): PerformanceViolation[] {
    return [...this.violations];
  }

  clearViolations(): void {
    this.violations = [];
    localStorage.removeItem('pwa_performance_violations');
  }

  getViolationSummary(): { total: number; low: number; medium: number; high: number } {
    const total = this.violations.length;
    const low = this.violations.filter(v => v.severity === 'low').length;
    const medium = this.violations.filter(v => v.severity === 'medium').length;
    const high = this.violations.filter(v => v.severity === 'high').length;

    return { total, low, medium, high };
  }

  // Utility methods for budget validation
  validateBudget(budget: PerformanceBudget): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (budget.firstContentfulPaint <= 0) errors.push('FCP must be positive');
    if (budget.largestContentfulPaint <= 0) errors.push('LCP must be positive');
    if (budget.cumulativeLayoutShift < 0) errors.push('CLS cannot be negative');
    if (budget.firstInputDelay <= 0) errors.push('FID must be positive');
    if (budget.timeToInteractive <= 0) errors.push('TTI must be positive');
    if (budget.memoryUsage <= 0 || budget.memoryUsage > 1) errors.push('Memory usage must be between 0 and 1');

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Get budget recommendations based on current violations
  getBudgetRecommendations(): string[] {
    const recommendations: string[] = [];
    const recentViolations = this.violations.slice(-10); // Last 10 violations

    const fcpViolations = recentViolations.filter(v => v.metric === 'firstContentfulPaint');
    const lcpViolations = recentViolations.filter(v => v.metric === 'largestContentfulPaint');
    const clsViolations = recentViolations.filter(v => v.metric === 'cumulativeLayoutShift');
    const fidViolations = recentViolations.filter(v => v.metric === 'firstInputDelay');
    const ttiViolations = recentViolations.filter(v => v.metric === 'timeToInteractive');
    const memoryViolations = recentViolations.filter(v => v.metric === 'memoryUsage');

    if (fcpViolations.length > 3) {
      recommendations.push('Consider increasing FCP budget to 2500ms for better user experience');
    }

    if (lcpViolations.length > 3) {
      recommendations.push('Consider increasing LCP budget to 5000ms for better content loading');
    }

    if (clsViolations.length > 3) {
      recommendations.push('Consider increasing CLS budget to 0.15 for better layout stability');
    }

    if (fidViolations.length > 3) {
      recommendations.push('Consider increasing FID budget to 150ms for better interactivity');
    }

    if (ttiViolations.length > 3) {
      recommendations.push('Consider increasing TTI budget to 6000ms for better responsiveness');
    }

    if (memoryViolations.length > 3) {
      recommendations.push('Consider increasing memory usage budget to 0.85 for better resource management');
    }

    return recommendations;
  }
}

// Export singleton instance
export const performanceBudgetManager = PerformanceBudgetManager.getInstance();
