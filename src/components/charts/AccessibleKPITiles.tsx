'use client';

import React, { useState } from 'react';
import { useAccessibility } from '../AccessibilityProvider';

interface KPITileData {
  id: string;
  label: string;
  value: string | number;
  unit?: string;
  color: string;
  description?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
  clickable?: boolean;
}

interface AccessibleKPITilesProps {
  title?: string;
  description?: string;
  tiles: KPITileData[];
  onTileClick?: (data: KPITileData) => void;
  className?: string;
  layout?: 'grid' | 'list';
  columns?: number;
}

export function AccessibleKPITiles({
  title,
  description,
  tiles,
  onTileClick,
  className = '',
  layout = 'grid',
  columns = 4
}: AccessibleKPITilesProps) {
  const { announceToScreenReader } = useAccessibility();
  const [focusedTile, setFocusedTile] = useState<string | null>(null);

  const handleTileClick = (tileData: KPITileData) => {
    if (onTileClick && tileData.clickable !== false) {
      onTileClick(tileData);
      announceToScreenReader(`Selected ${tileData.label} KPI tile`);
    }
  };

  const handleTileKeyDown = (event: React.KeyboardEvent, tileData: KPITileData) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleTileClick(tileData);
    }
  };

  const handleTileFocus = (tileId: string, tileLabel: string) => {
    setFocusedTile(tileId);
    announceToScreenReader(`Focused on ${tileLabel} KPI tile`);
  };

  const handleTileBlur = () => {
    setFocusedTile(null);
  };

  const getLayoutClasses = () => {
    if (layout === 'grid') {
      return `grid grid-cols-2 md:grid-cols-${Math.min(columns, 4)} lg:grid-cols-${columns} gap-4`;
    }
    return 'space-y-4';
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return (
          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        );
      case 'down':
        return (
          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
          </svg>
        );
      case 'stable':
        return (
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getTrendDescription = (trend: 'up' | 'down' | 'stable', value?: number) => {
    if (!trend) return '';
    
    switch (trend) {
      case 'up':
        return value ? `increased by ${value}` : 'trending upward';
      case 'down':
        return value ? `decreased by ${value}` : 'trending downward';
      case 'stable':
        return 'stable';
      default:
        return '';
    }
  };

  return (
    <div className={`accessible-kpi-tiles ${className}`} role="region" aria-label={title || 'Key Performance Indicators'}>
      {/* Header */}
      {(title || description) && (
        <div className="kpi-header mb-4">
          {title && (
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
              {title}
            </h2>
          )}
          {description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {description}
            </p>
          )}
        </div>
      )}

      {/* KPI Tiles */}
      <div className={getLayoutClasses()}>
        {tiles.map((tile) => {
          const isFocused = focusedTile === tile.id;
          const isClickable = tile.clickable !== false;
          
          return (
            <div
              key={tile.id}
              className={`kpi-tile bg-white dark:bg-gray-800 rounded-lg p-4 text-center transition-all duration-200 ${
                isClickable ? 'cursor-pointer hover:shadow-lg' : ''
              } ${
                isFocused ? 'ring-2 ring-blue-500 ring-offset-2' : ''
              }`}
              role={isClickable ? 'button' : 'article'}
              tabIndex={isClickable ? 0 : -1}
              onClick={() => handleTileClick(tile)}
              onKeyDown={(e) => handleTileKeyDown(e, tile)}
              onFocus={() => handleTileFocus(tile.id, tile.label)}
              onBlur={handleTileBlur}
              aria-label={`${tile.label}: ${tile.value}${tile.unit ? ` ${tile.unit}` : ''}${tile.description ? `. ${tile.description}` : ''}${tile.trend ? `. ${getTrendDescription(tile.trend, tile.trendValue)}` : ''}`}
              aria-describedby={tile.description ? `kpi-desc-${tile.id}` : undefined}
            >
              {/* Value */}
              <div 
                className="text-2xl font-bold mb-1"
                style={{ color: tile.color }}
                role="text"
                aria-label="Value"
              >
                {tile.value}
                {tile.unit && (
                  <span className="text-lg ml-1" aria-label="Unit">
                    {tile.unit}
                  </span>
                )}
              </div>

              {/* Label */}
              <div 
                className="text-sm text-gray-600 dark:text-gray-400 font-medium"
                role="text"
                aria-label="Label"
              >
                {tile.label}
              </div>

              {/* Trend Indicator */}
              {tile.trend && (
                <div className="flex items-center justify-center gap-1 mt-2" aria-label="Trend indicator">
                  {getTrendIcon(tile.trend)}
                  {tile.trendValue && (
                    <span className="text-xs text-gray-500">
                      {tile.trendValue > 0 ? '+' : ''}{tile.trendValue}
                    </span>
                  )}
                </div>
              )}

              {/* Description (hidden but accessible) */}
              {tile.description && (
                <div id={`kpi-desc-${tile.id}`} className="sr-only">
                  {tile.description}
                </div>
              )}

              {/* Focus indicator for screen readers */}
              {isFocused && (
                <div className="sr-only" aria-live="polite">
                  Focused on {tile.label} KPI tile with value {tile.value}
                  {tile.unit && ` ${tile.unit}`}
                  {tile.trend && `, ${getTrendDescription(tile.trend, tile.trendValue)}`}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Instructions for Screen Readers */}
      <div className="sr-only" aria-live="polite">
        {title || 'Key Performance Indicators'} section contains {tiles.length} tiles.
        {onTileClick && ' Use Tab to navigate between tiles, Enter or Space to select a tile.'}
        {!onTileClick && ' These tiles are for display purposes only.'}
      </div>
    </div>
  );
}

// Specialized KPI Tiles for Analytics Dashboard
interface AnalyticsKPITilesProps {
  kpis: {
    tasksDone: number;
    tasksPerDay: number;
    hoursPerDay: number;
    avgMinutesPerTask: number;
    dayStreak: number;
    totalFocusHours: number;
    totalTasks: number;
    completionRate: number;
  };
  onTileClick?: (metric: string, value: number) => void;
  className?: string;
}

export function AnalyticsKPITiles({
  kpis,
  onTileClick,
  className = ''
}: AnalyticsKPITilesProps) {
  const tiles: KPITileData[] = [
    {
      id: 'tasksDone',
      label: 'Tasks Done',
      value: kpis.tasksDone,
      color: '#3B82F6', // Blue
      description: 'Total completed tasks',
      clickable: true
    },
    {
      id: 'tasksPerDay',
      label: 'Tasks/Day',
      value: kpis.tasksPerDay.toFixed(1),
      color: '#10B981', // Green
      description: 'Average tasks completed per day',
      clickable: true
    },
    {
      id: 'hoursPerDay',
      label: 'Hours/Day',
      value: kpis.hoursPerDay.toFixed(1),
      color: '#8B5CF6', // Purple
      description: 'Average focus hours per day',
      clickable: true
    },
    {
      id: 'avgMinutesPerTask',
      label: 'Mins/Task',
      value: kpis.avgMinutesPerTask.toFixed(0),
      color: '#F59E0B', // Orange
      description: 'Average minutes spent per task',
      clickable: true
    },
    {
      id: 'dayStreak',
      label: 'Day Streak',
      value: kpis.dayStreak,
      color: '#EF4444', // Red
      description: 'Consecutive days with activity',
      clickable: true
    },
    {
      id: 'totalFocusHours',
      label: 'Total Hours',
      value: kpis.totalFocusHours.toFixed(1),
      color: '#06B6D4', // Cyan
      description: 'Total focus time accumulated',
      clickable: true
    },
    {
      id: 'totalTasks',
      label: 'Total Tasks',
      value: kpis.totalTasks,
      color: '#84CC16', // Lime
      description: 'Total tasks created',
      clickable: true
    },
    {
      id: 'completionRate',
      label: 'Completion Rate',
      value: kpis.completionRate.toFixed(1),
      unit: '%',
      color: '#EC4899', // Pink
      description: 'Percentage of tasks completed',
      clickable: true
    }
  ];

  return (
    <AccessibleKPITiles
      title="Key Performance Indicators"
      description="Real-time metrics from your productivity data"
      tiles={tiles}
      onTileClick={(tileData) => {
        if (onTileClick) {
          const numericValue = typeof tileData.value === 'string' ? parseFloat(tileData.value) : tileData.value;
          onTileClick(tileData.id, numericValue);
        }
      }}
      className={className}
      layout="grid"
      columns={4}
    />
  );
}
