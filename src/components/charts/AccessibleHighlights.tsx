'use client';

import React, { useState } from 'react';
import { useAccessibility } from '../AccessibilityProvider';

interface HighlightData {
  id: string;
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  color: string;
  description?: string;
  clickable?: boolean;
}

interface AccessibleHighlightsProps {
  title?: string;
  description?: string;
  highlights: HighlightData[];
  onHighlightClick?: (data: HighlightData) => void;
  className?: string;
  layout?: 'grid' | 'list' | 'cards';
  columns?: number;
}

export function AccessibleHighlights({
  title,
  description,
  highlights,
  onHighlightClick,
  className = '',
  layout = 'grid',
  columns = 3
}: AccessibleHighlightsProps) {
  const { announceToScreenReader } = useAccessibility();
  const [focusedHighlight, setFocusedHighlight] = useState<string | null>(null);

  const handleHighlightClick = (highlightData: HighlightData) => {
    if (onHighlightClick && highlightData.clickable !== false) {
      onHighlightClick(highlightData);
      announceToScreenReader(`Selected ${highlightData.title} highlight`);
    }
  };

  const handleHighlightKeyDown = (event: React.KeyboardEvent, highlightData: HighlightData) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleHighlightClick(highlightData);
    }
  };

  const handleHighlightFocus = (highlightId: string, highlightTitle: string) => {
    setFocusedHighlight(highlightId);
    announceToScreenReader(`Focused on ${highlightTitle} highlight`);
  };

  const handleHighlightBlur = () => {
    setFocusedHighlight(null);
  };

  const getLayoutClasses = () => {
    if (layout === 'grid') {
      return `grid grid-cols-1 md:grid-cols-${Math.min(columns, 3)} lg:grid-cols-${columns} gap-4`;
    } else if (layout === 'cards') {
      return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
    }
    return 'space-y-4';
  };

  const getHighlightCard = (highlight: HighlightData) => {
    const isFocused = focusedHighlight === highlight.id;
    const isClickable = highlight.clickable !== false;

    return (
      <div
        key={highlight.id}
        className={`highlight-card bg-white dark:bg-gray-800 rounded-lg p-6 transition-all duration-200 ${
          isClickable ? 'cursor-pointer hover:shadow-lg hover:scale-105' : ''
        } ${
          isFocused ? 'ring-2 ring-blue-500 ring-offset-2' : ''
        }`}
        role={isClickable ? 'button' : 'article'}
        tabIndex={isClickable ? 0 : -1}
        onClick={() => handleHighlightClick(highlight)}
        onKeyDown={(e) => handleHighlightKeyDown(e, highlight)}
        onFocus={() => handleHighlightFocus(highlight.id, highlight.title)}
        onBlur={handleHighlightBlur}
        aria-label={`${highlight.title}: ${highlight.value}${highlight.subtitle ? ` ${highlight.subtitle}` : ''}${highlight.description ? `. ${highlight.description}` : ''}`}
        aria-describedby={highlight.description ? `highlight-desc-${highlight.id}` : undefined}
      >
        {/* Icon */}
        {highlight.icon && (
          <div 
            className="mb-4 flex justify-center"
            aria-hidden="true"
          >
            {highlight.icon}
          </div>
        )}

        {/* Title */}
        <h3 
          className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2 text-center"
          role="text"
          aria-label="Title"
        >
          {highlight.title}
        </h3>

        {/* Value */}
        <div 
          className="text-3xl font-bold mb-2 text-center"
          style={{ color: highlight.color }}
          role="text"
          aria-label="Value"
        >
          {highlight.value}
        </div>

        {/* Subtitle */}
        {highlight.subtitle && (
          <div 
            className="text-sm text-gray-600 dark:text-gray-400 text-center"
            role="text"
            aria-label="Subtitle"
          >
            {highlight.subtitle}
          </div>
        )}

        {/* Description (hidden but accessible) */}
        {highlight.description && (
          <div id={`highlight-desc-${highlight.id}`} className="sr-only">
            {highlight.description}
          </div>
        )}

        {/* Focus indicator for screen readers */}
        {isFocused && (
          <div className="sr-only" aria-live="polite">
            Focused on {highlight.title} highlight with value {highlight.value}
            {highlight.subtitle && ` ${highlight.subtitle}`}
            {highlight.description && `. ${highlight.description}`}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`accessible-highlights ${className}`} role="region" aria-label={title || 'Highlights'}>
      {/* Header */}
      {(title || description) && (
        <div className="highlights-header mb-6">
          {title && (
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 text-center">
              {title}
            </h2>
          )}
          {description && (
            <p className="text-base text-gray-600 dark:text-gray-400 mt-2 text-center">
              {description}
            </p>
          )}
        </div>
      )}

      {/* Highlights Grid */}
      <div className={getLayoutClasses()}>
        {highlights.map(getHighlightCard)}
      </div>

      {/* Instructions for Screen Readers */}
      <div className="sr-only" aria-live="polite">
        {title || 'Highlights'} section contains {highlights.length} highlight cards.
        {onHighlightClick && ' Use Tab to navigate between highlights, Enter or Space to select a highlight.'}
        {!onHighlightClick && ' These highlights are for display purposes only.'}
      </div>
    </div>
  );
}

// Specialized Highlights for Analytics Dashboard
interface AnalyticsHighlightsProps {
  highlights: {
    mostProductiveHour: string;
    mostProductiveDay: string;
    mostProductiveMonth: string;
    longestStreak: number;
    bestCompletionRate: number;
    totalPoints: number;
  };
  onHighlightClick?: (metric: string, value: string | number) => void;
  className?: string;
}

export function AnalyticsHighlights({
  highlights,
  onHighlightClick,
  className = ''
}: AnalyticsHighlightsProps) {
  const getProductivityIcon = (type: 'hour' | 'day' | 'month') => {
    const iconClass = "w-8 h-8";
    
    switch (type) {
      case 'hour':
        return (
          <svg className={`${iconClass} text-blue-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'day':
        return (
          <svg className={`${iconClass} text-green-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'month':
        return (
          <svg className={`${iconClass} text-purple-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getStreakIcon = () => (
    <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );

  const getCompletionIcon = () => (
    <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  const getPointsIcon = () => (
    <svg className="w-8 h-8 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
    </svg>
  );

  const highlightData: HighlightData[] = [
    {
      id: 'mostProductiveHour',
      title: 'Most Productive Hour',
      value: highlights.mostProductiveHour,
      subtitle: 'Peak performance time',
      icon: getProductivityIcon('hour'),
      color: '#3B82F6',
      description: 'The hour of the day when you complete the most tasks',
      clickable: true
    },
    {
      id: 'mostProductiveDay',
      title: 'Most Productive Day',
      value: highlights.mostProductiveDay,
      subtitle: 'Best day of the week',
      icon: getProductivityIcon('day'),
      color: '#10B981',
      description: 'The day of the week when you are most productive',
      clickable: true
    },
    {
      id: 'mostProductiveMonth',
      title: 'Most Productive Month',
      value: highlights.mostProductiveMonth,
      subtitle: 'Peak month',
      icon: getProductivityIcon('month'),
      color: '#8B5CF6',
      description: 'The month when you achieved the highest productivity',
      clickable: true
    },
    {
      id: 'longestStreak',
      title: 'Longest Streak',
      value: highlights.longestStreak,
      subtitle: 'Consecutive days',
      icon: getStreakIcon(),
      color: '#EF4444',
      description: 'Your longest streak of consecutive productive days',
      clickable: true
    },
    {
      id: 'bestCompletionRate',
      title: 'Best Completion Rate',
      value: `${highlights.bestCompletionRate}%`,
      subtitle: 'Task completion',
      icon: getCompletionIcon(),
      color: '#F59E0B',
      description: 'Your highest task completion rate achieved',
      clickable: true
    },
    {
      id: 'totalPoints',
      title: 'Total Points',
      value: highlights.totalPoints,
      subtitle: 'Earned points',
      icon: getPointsIcon(),
      color: '#EC4899',
      description: 'Total points earned from completed focus sessions',
      clickable: true
    }
  ];

  return (
    <AccessibleHighlights
      title="Productivity Highlights"
      description="Key insights about your productivity patterns"
      highlights={highlightData}
      onHighlightClick={(highlightData) => {
        if (onHighlightClick) {
          onHighlightClick(highlightData.id, highlightData.value);
        }
      }}
      className={className}
      layout="cards"
      columns={3}
    />
  );
}
