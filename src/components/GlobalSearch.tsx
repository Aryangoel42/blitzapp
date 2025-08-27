"use client";

import { useState, useEffect, useRef } from 'react';
import { useAccessibility } from './AccessibilityProvider';

type SearchFilters = {
  query: string;
  status: string[];
  priority: string[];
  tags: string[];
  dueDate: string;
  estimateRange: string;
};

type Props = {
  onFiltersChange: (filters: SearchFilters) => void;
  className?: string;
};

export function GlobalSearch({ onFiltersChange, className = '' }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    status: [],
    priority: [],
    tags: [],
    dueDate: '',
    estimateRange: ''
  });
  
  const searchRef = useRef<HTMLInputElement>(null);
  const { announceToScreenReader } = useAccessibility();

  useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  const handleSearch = (query: string) => {
    setFilters(prev => ({ ...prev, query }));
    announceToScreenReader(`Searching for: ${query}`);
  };

  const toggleFilter = (type: keyof SearchFilters, value: string) => {
    setFilters(prev => {
      const currentValues = prev[type] as string[];
      if (currentValues.includes(value)) {
        return { ...prev, [type]: currentValues.filter(v => v !== value) };
      } else {
        return { ...prev, [type]: [...currentValues, value] };
      }
    });
  };

  const clearAllFilters = () => {
    setFilters({
      query: '',
      status: [],
      priority: [],
      tags: [],
      dueDate: '',
      estimateRange: ''
    });
    announceToScreenReader('All filters cleared');
  };

  const hasActiveFilters = Object.values(filters).some(value => 
    Array.isArray(value) ? value.length > 0 : Boolean(value)
  );

  return (
    <div className={`relative ${className}`}>
      {/* Search Bar */}
      <div className="relative">
        <input
          ref={searchRef}
          type="text"
          value={filters.query}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Search tasks, descriptions, tags..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white"
        />
        <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="absolute right-2 top-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          aria-label={isExpanded ? 'Hide filters' : 'Show filters'}
        >
          <svg className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Advanced Filters */}
      {isExpanded && (
        <div className="absolute top-full left-0 right-0 mt-2 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <div className="space-y-2">
                {['todo', 'in_progress', 'done'].map(status => (
                  <label key={status} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.status.includes(status)}
                      onChange={() => toggleFilter('status', status)}
                      className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300 capitalize">
                      {status.replace('_', ' ')}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority
              </label>
              <div className="space-y-2">
                {['low', 'medium', 'high'].map(priority => (
                  <label key={priority} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.priority.includes(priority)}
                      onChange={() => toggleFilter('priority', priority)}
                      className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300 capitalize">
                      {priority}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Due Date Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Due Date
              </label>
              <select
                value={filters.dueDate}
                onChange={e => setFilters(prev => ({ ...prev, dueDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Any time</option>
                <option value="today">Today</option>
                <option value="overdue">Overdue</option>
                <option value="upcoming">Upcoming</option>
                <option value="this_week">This week</option>
                <option value="this_month">This month</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={clearAllFilters}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Clear all filters
            </button>
            
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {hasActiveFilters && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-200">
                  Filters active
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
