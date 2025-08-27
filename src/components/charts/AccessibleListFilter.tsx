'use client';

import React, { useState } from 'react';
import { useAccessibility } from '../AccessibilityProvider';

interface ListOption {
  id: string;
  name: string;
  color: string;
  count: number;
}

interface AccessibleListFilterProps {
  title?: string;
  description?: string;
  lists: ListOption[];
  selectedLists: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  className?: string;
}

export function AccessibleListFilter({
  title,
  description,
  lists,
  selectedLists,
  onSelectionChange,
  className = ''
}: AccessibleListFilterProps) {
  const { announceToScreenReader } = useAccessibility();
  const [focusedOption, setFocusedOption] = useState<string | null>(null);

  // Handle list selection
  const handleListToggle = (listId: string) => {
    const newSelection = selectedLists.includes(listId)
      ? selectedLists.filter(id => id !== listId)
      : [...selectedLists, listId];
    
    onSelectionChange(newSelection);
    
    const list = lists.find(l => l.id === listId);
    if (list) {
      const action = selectedLists.includes(listId) ? 'removed' : 'added';
      announceToScreenReader(`${list.name} ${action} from selection`);
    }
  };

  // Handle select all/none
  const handleSelectAll = () => {
    if (selectedLists.length === lists.length) {
      onSelectionChange([]);
      announceToScreenReader('Deselected all lists');
    } else {
      onSelectionChange(lists.map(l => l.id));
      announceToScreenReader('Selected all lists');
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent, listId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleListToggle(listId);
    }
  };

  // Get selection summary
  const getSelectionSummary = () => {
    if (selectedLists.length === 0) return 'No lists selected';
    if (selectedLists.length === lists.length) return 'All lists selected';
    if (selectedLists.length === 1) {
      const list = lists.find(l => l.id === selectedLists[0]);
      return list ? list.name : '1 list selected';
    }
    return `${selectedLists.length} of ${lists.length} lists selected`;
  };

  return (
    <div className={`accessible-list-filter ${className}`}>
      {/* Header */}
      {(title || description) && (
        <div className="filter-header mb-3">
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

      {/* Select All Button */}
      <div className="select-all mb-3">
        <button
          type="button"
          onClick={handleSelectAll}
          className="w-full px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          aria-label={selectedLists.length === lists.length ? 'Deselect all lists' : 'Select all lists'}
        >
          {selectedLists.length === lists.length ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      {/* Lists */}
      <div className="lists-container">
        {lists.map((list) => {
          const isSelected = selectedLists.includes(list.id);
          const isFocused = focusedOption === list.id;
          
          return (
            <div
              key={list.id}
              className={`list-option mb-2 p-3 border rounded-md cursor-pointer transition-colors ${
                isSelected
                  ? 'bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-700'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
              } ${
                isFocused ? 'ring-2 ring-blue-500 ring-inset' : ''
              }`}
              onClick={() => handleListToggle(list.id)}
              onKeyDown={(e) => handleKeyDown(e, list.id)}
              onFocus={() => setFocusedOption(list.id)}
              onBlur={() => setFocusedOption(null)}
              role="checkbox"
              aria-checked={isSelected}
              tabIndex={0}
              aria-label={`${list.name} list with ${list.count} items`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}} // Handled by onClick
                      className="sr-only"
                      aria-hidden="true"
                    />
                    <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                      isSelected
                        ? 'bg-blue-600 border-blue-600'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: list.color }}
                      aria-hidden="true"
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {list.name}
                    </span>
                  </div>
                </div>
                
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                  {list.count}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selection Summary */}
      <div className="selection-summary mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
        <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          Selection Summary
        </div>
        <div className="text-sm text-gray-900 dark:text-gray-100">
          {getSelectionSummary()}
        </div>
        {selectedLists.length > 0 && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Total items: {selectedLists.reduce((sum, listId) => {
              const list = lists.find(l => l.id === listId);
              return sum + (list ? list.count : 0);
            }, 0)}
          </div>
        )}
      </div>

      {/* Instructions for Screen Readers */}
      <div className="sr-only" aria-live="polite">
        List filter with {lists.length} available lists.
        Use the select all button to select or deselect all lists.
        Use Tab to navigate between list options, Enter or Space to toggle selection.
        Current selection: {getSelectionSummary()}.
      </div>
    </div>
  );
}

export function AnalyticsListFilter({
  lists,
  selectedLists,
  onSelectionChange,
  className = ''
}: {
  lists: ListOption[];
  selectedLists: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  className?: string;
}) {
  return (
    <AccessibleListFilter
      title="Filter by List"
      description="Select which task lists to include in your analytics"
      lists={lists}
      selectedLists={selectedLists}
      onSelectionChange={onSelectionChange}
      className={className}
    />
  );
}
