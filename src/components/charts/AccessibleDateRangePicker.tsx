'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAccessibility } from '../AccessibilityProvider';

interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface AccessibleDateRangePickerProps {
  title?: string;
  description?: string;
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
  presets?: Array<{
    label: string;
    days: number;
    description: string;
  }>;
  minDate?: Date;
  maxDate?: Date;
}

export function AccessibleDateRangePicker({
  title,
  description,
  value,
  onChange,
  className = '',
  presets = [
    { label: 'Last 7 days', days: 7, description: 'Data from the last 7 days' },
    { label: 'Last 30 days', days: 30, description: 'Data from the last 30 days' },
    { label: 'Last 90 days', days: 90, description: 'Data from the last 90 days' },
    { label: 'This month', days: 0, description: 'Data from the current month' },
    { label: 'Last month', days: -30, description: 'Data from the previous month' }
  ],
  minDate,
  maxDate
}: AccessibleDateRangePickerProps) {
  const { announceToScreenReader } = useAccessibility();
  const [isOpen, setIsOpen] = useState(false);
  const [focusedPreset, setFocusedPreset] = useState<string | null>(null);
  const [focusedInput, setFocusedInput] = useState<'start' | 'end' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const startDateRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle preset selection
  const handlePresetSelect = (preset: typeof presets[0]) => {
    const endDate = new Date();
    const startDate = new Date();
    
    if (preset.days === 0) {
      // This month
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
    } else if (preset.days < 0) {
      // Last month
      startDate.setMonth(startDate.getMonth() - 1);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(0); // Last day of previous month
      endDate.setHours(23, 59, 59, 999);
    } else {
      // Last N days
      startDate.setDate(startDate.getDate() - preset.days);
      startDate.setHours(0, 0, 0, 0);
    }

    onChange({ startDate, endDate });
    setIsOpen(false);
    announceToScreenReader(`Selected date range: ${preset.description}`);
  };

  // Handle manual date input
  const handleDateChange = (type: 'start' | 'end', dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return;

    const newRange = {
      startDate: type === 'start' ? date : value.startDate,
      endDate: type === 'end' ? date : value.endDate
    };

    // Ensure start date is before end date
    if (newRange.startDate > newRange.endDate) {
      if (type === 'start') {
        newRange.endDate = newRange.startDate;
      } else {
        newRange.startDate = newRange.endDate;
      }
    }

    onChange(newRange);
    announceToScreenReader(`${type === 'start' ? 'Start' : 'End'} date changed to ${date.toLocaleDateString()}`);
  };

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Format date for input
  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent, action: string, data?: any) => {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (action === 'toggle') {
          setIsOpen(!isOpen);
        } else if (action === 'preset') {
          handlePresetSelect(data);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
      case 'Tab':
        // Let Tab work normally
        break;
      default:
        // Handle arrow keys for preset navigation
        if (action === 'preset' && event.key.startsWith('Arrow')) {
          event.preventDefault();
          const currentIndex = presets.findIndex(p => p.label === focusedPreset);
          let newIndex = currentIndex;
          
          if (event.key === 'ArrowDown') {
            newIndex = Math.min(currentIndex + 1, presets.length - 1);
          } else if (event.key === 'ArrowUp') {
            newIndex = Math.max(currentIndex - 1, 0);
          }
          
          setFocusedPreset(presets[newIndex].label);
          announceToScreenReader(`Focused on ${presets[newIndex].label} preset`);
        }
    }
  };

  // Handle input focus
  const handleInputFocus = (type: 'start' | 'end') => {
    setFocusedInput(type);
    announceToScreenReader(`Focused on ${type} date input`);
  };

  // Handle input blur
  const handleInputBlur = () => {
    setFocusedInput(null);
  };

  return (
    <div className={`accessible-date-range-picker ${className}`} ref={containerRef}>
      {/* Header */}
      {(title || description) && (
        <div className="picker-header mb-3">
          {title && (
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {description}
            </p>
          )}
        </div>
      )}

      {/* Date Inputs */}
      <div className="date-inputs flex flex-col sm:flex-row gap-3 mb-3">
        <div className="date-input-group flex-1">
          <label htmlFor="start-date" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Start Date
          </label>
          <input
            ref={startDateRef}
            id="start-date"
            type="date"
            value={formatDateForInput(value.startDate)}
            onChange={(e) => handleDateChange('start', e.target.value)}
            onFocus={() => handleInputFocus('start')}
            onBlur={handleInputBlur}
            className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              focusedInput === 'start' ? 'ring-2 ring-blue-500' : 'border-gray-300'
            }`}
            aria-label="Start date"
            min={minDate ? formatDateForInput(minDate) : undefined}
            max={maxDate ? formatDateForInput(maxDate) : undefined}
          />
        </div>

        <div className="date-input-group flex-1">
          <label htmlFor="end-date" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            End Date
          </label>
          <input
            ref={endDateRef}
            id="end-date"
            type="date"
            value={formatDateForInput(value.endDate)}
            onChange={(e) => handleDateChange('end', e.target.value)}
            onFocus={() => handleInputFocus('end')}
            onBlur={handleInputBlur}
            className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              focusedInput === 'end' ? 'ring-2 ring-blue-500' : ''
            }`}
            aria-label="End date"
            min={minDate ? formatDateForInput(minDate) : undefined}
            max={maxDate ? formatDateForInput(maxDate) : undefined}
          />
        </div>
      </div>

      {/* Preset Buttons */}
      <div className="preset-buttons">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={(e) => handleKeyDown(e, 'toggle')}
          className="w-full px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-label="Quick date range presets"
        >
          Quick Presets
          <svg
            className={`ml-2 inline-block w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Preset Dropdown */}
        {isOpen && (
          <div
            className="preset-dropdown mt-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg z-10"
            role="listbox"
            aria-label="Date range presets"
          >
            {presets.map((preset, index) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => handlePresetSelect(preset)}
                onKeyDown={(e) => handleKeyDown(e, 'preset', preset)}
                onFocus={() => setFocusedPreset(preset.label)}
                onBlur={() => setFocusedPreset(null)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset ${
                  focusedPreset === preset.label ? 'bg-blue-50 dark:bg-blue-900' : ''
                } ${index === 0 ? 'rounded-t-md' : ''} ${index === presets.length - 1 ? 'rounded-b-md' : ''}`}
                role="option"
                aria-selected={focusedPreset === preset.label}
                tabIndex={0}
              >
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  {preset.label}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {preset.description}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Current Range Display */}
      <div className="current-range mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
        <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          Current Range
        </div>
        <div className="text-sm text-gray-900 dark:text-gray-100">
          {formatDate(value.startDate)} - {formatDate(value.endDate)}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {Math.ceil((value.endDate.getTime() - value.startDate.getTime()) / (1000 * 60 * 60 * 24))} days
        </div>
      </div>

      {/* Instructions for Screen Readers */}
      <div className="sr-only" aria-live="polite">
        Date range picker for analytics data.
        Use Tab to navigate between start and end date inputs.
        Quick presets button provides common date ranges.
        Current selection shows {formatDate(value.startDate)} to {formatDate(value.endDate)}.
      </div>
    </div>
  );
}

// Specialized Date Range Picker for Analytics Dashboard
interface AnalyticsDateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

export function AnalyticsDateRangePicker({
  value,
  onChange,
  className = ''
}: AnalyticsDateRangePickerProps) {
  return (
    <AccessibleDateRangePicker
      title="Date Range"
      description="Select the time period for your analytics data"
      value={value}
      onChange={onChange}
      className={className}
      presets={[
        { label: 'Last 7 days', days: 7, description: 'Data from the last 7 days' },
        { label: 'Last 30 days', days: 30, description: 'Data from the last 30 days' },
        { label: 'Last 90 days', days: 90, description: 'Data from the last 90 days' },
        { label: 'This month', days: 0, description: 'Data from the current month' },
        { label: 'Last month', days: -30, description: 'Data from the previous month' },
        { label: 'This year', days: -365, description: 'Data from the current year' }
      ]}
    />
  );
}
