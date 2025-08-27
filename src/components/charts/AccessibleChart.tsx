'use client';

import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { useAccessibility } from '../AccessibilityProvider';

interface AccessibleChartProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  onChartInteraction?: (data: any) => void;
  chartData?: any[];
  role?: string;
  'aria-label'?: string;
}

export function AccessibleChart({
  title,
  description,
  children,
  className = '',
  onChartInteraction,
  chartData = [],
  role = 'region',
  'aria-label': ariaLabel
}: AccessibleChartProps) {
  const { announceToScreenReader } = useAccessibility();
  const [focusedElement, setFocusedElement] = useState<string | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  // Announce chart data changes to screen readers
  useEffect(() => {
    if (chartData.length > 0) {
      announceToScreenReader(`${title} chart updated with ${chartData.length} data points`);
    }
  }, [chartData, title, announceToScreenReader]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    const { key, target } = event;
    
    if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      const element = target as HTMLElement;
      if (element.click) {
        element.click();
      }
    }
  };

  const handleFocus = (elementId: string) => {
    setFocusedElement(elementId);
    announceToScreenReader(`Focused on ${elementId} in ${title} chart`);
  };

  const handleBlur = () => {
    setFocusedElement(null);
  };

  return (
    <div
      ref={chartRef}
      className={`accessible-chart ${className}`}
      role={role}
      aria-label={ariaLabel || title}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="chart-header mb-4">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {description}
          </p>
        )}
        <div className="sr-only">
          Chart with {chartData.length} data points. Use Tab to navigate between elements, Enter or Space to interact.
        </div>
      </div>
      
      <div className="chart-content">
        {children}
      </div>

      {/* Focus indicator for screen readers */}
      {focusedElement && (
        <div className="sr-only" aria-live="polite">
          Currently focused on {focusedElement}
        </div>
      )}
    </div>
  );
}

// Accessible Chart Legend Component
interface AccessibleLegendProps {
  items: Array<{
    id: string;
    label: string;
    color: string;
    value?: string | number;
    description?: string;
  }>;
  onItemClick?: (itemId: string) => void;
  onItemToggle?: (itemId: string) => void;
  className?: string;
}

export function AccessibleLegend({
  items,
  onItemClick,
  onItemToggle,
  className = ''
}: AccessibleLegendProps) {
  const { announceToScreenReader } = useAccessibility();

  const handleLegendItemClick = (itemId: string, label: string) => {
    if (onItemClick) {
      onItemClick(itemId);
      announceToScreenReader(`Selected ${label} from legend`);
    }
  };

  const handleLegendItemToggle = (itemId: string, label: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (onItemToggle) {
      onItemToggle(itemId);
      announceToScreenReader(`Toggled ${label} visibility`);
    }
  };

  return (
    <div 
      className={`accessible-legend ${className}`}
      role="list"
      aria-label="Chart legend"
    >
      {items.map((item) => (
        <div
          key={item.id}
          className="legend-item flex items-center gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
          role="listitem"
          tabIndex={0}
          onClick={() => handleLegendItemClick(item.id, item.label)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleLegendItemClick(item.id, item.label);
            }
          }}
          aria-label={`${item.label}${item.value ? `: ${item.value}` : ''}${item.description ? `. ${item.description}` : ''}`}
        >
          <div
            className="w-4 h-4 rounded border border-gray-300"
            style={{ backgroundColor: item.color }}
            aria-hidden="true"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {item.label}
          </span>
          {item.value && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              ({item.value})
            </span>
          )}
          {onItemToggle && (
            <button
              type="button"
              className="ml-auto p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
              onClick={(e) => handleLegendItemToggle(item.id, item.label, e)}
              aria-label={`Toggle ${item.label} visibility`}
              title={`Toggle ${item.label} visibility`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// Accessible Tooltip Component
interface AccessibleTooltipProps {
  content: string;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export function AccessibleTooltip({
  content,
  children,
  position = 'top',
  className = ''
}: AccessibleTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const showTooltip = () => setIsVisible(true);
  const hideTooltip = () => setIsVisible(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
  };

  return (
    <div
      className={`tooltip-container relative inline-block ${className}`}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
    >
      {children}
      
      {(isVisible || isFocused) && (
        <div
          ref={tooltipRef}
          className={`absolute z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg whitespace-nowrap ${positionClasses[position]}`}
          role="tooltip"
          aria-hidden={!isVisible && !isFocused}
        >
          {content}
          <div className="sr-only">
            Tooltip: {content}
          </div>
        </div>
      )}
    </div>
  );
}

// Accessible Chart Navigation Component
interface AccessibleChartNavigationProps {
  onPrevious?: () => void;
  onNext?: () => void;
  onFirst?: () => void;
  onLast?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  currentIndex?: number;
  totalItems?: number;
  className?: string;
}

export function AccessibleChartNavigation({
  onPrevious,
  onNext,
  onFirst,
  onLast,
  hasPrevious = false,
  hasNext = false,
  currentIndex,
  totalItems,
  className = ''
}: AccessibleChartNavigationProps) {
  const { announceToScreenReader } = useAccessibility();

  const handleNavigation = (action: string, callback?: () => void) => {
    if (callback) {
      callback();
      announceToScreenReader(`Navigated to ${action} in chart`);
    }
  };

  return (
    <div 
      className={`chart-navigation flex items-center gap-2 ${className}`}
      role="navigation"
      aria-label="Chart navigation"
    >
      {onFirst && (
        <button
          type="button"
          onClick={() => handleNavigation('first', onFirst)}
          disabled={!hasPrevious}
          className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Go to first item"
          title="Go to first item"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      )}
      
      {onPrevious && (
        <button
          type="button"
          onClick={() => handleNavigation('previous', onPrevious)}
          disabled={!hasPrevious}
          className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Go to previous item"
          title="Go to previous item"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {currentIndex !== undefined && totalItems !== undefined && (
        <span className="text-sm text-gray-600 dark:text-gray-400 px-2">
          {currentIndex + 1} of {totalItems}
        </span>
      )}

      {onNext && (
        <button
          type="button"
          onClick={() => handleNavigation('next', onNext)}
          disabled={!hasNext}
          className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Go to next item"
          title="Go to next item"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {onLast && (
        <button
          type="button"
          onClick={() => handleNavigation('last', onLast)}
          disabled={!hasNext}
          className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Go to last item"
          title="Go to last item"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  );
}
