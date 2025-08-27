'use client';

import React, { useState, useRef } from 'react';
import { AccessibleChart, AccessibleTooltip, AccessibleLegend } from './AccessibleChart';

interface BarChartData {
  id: string;
  label: string;
  value: number;
  color: string;
  description?: string;
  clickable?: boolean;
}

interface AccessibleBarChartProps {
  title: string;
  description?: string;
  data: BarChartData[];
  height?: number;
  maxValue?: number;
  onBarClick?: (data: BarChartData) => void;
  className?: string;
  showLegend?: boolean;
  showValues?: boolean;
  orientation?: 'vertical' | 'horizontal';
}

export function AccessibleBarChart({
  title,
  description,
  data,
  height = 200,
  maxValue,
  onBarClick,
  className = '',
  showLegend = true,
  showValues = true,
  orientation = 'vertical'
}: AccessibleBarChartProps) {
  const [focusedBar, setFocusedBar] = useState<string | null>(null);
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const calculatedMaxValue = maxValue || Math.max(...data.map(d => d.value));
  const isVertical = orientation === 'vertical';

  const handleBarClick = (barData: BarChartData) => {
    if (onBarClick && barData.clickable !== false) {
      onBarClick(barData);
    }
  };

  const handleBarKeyDown = (event: React.KeyboardEvent, barData: BarChartData) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleBarClick(barData);
    }
  };

  const handleBarFocus = (barId: string) => {
    setFocusedBar(barId);
  };

  const handleBarBlur = () => {
    setFocusedBar(null);
  };

  const handleBarMouseEnter = (barId: string) => {
    setHoveredBar(barId);
  };

  const handleBarMouseLeave = () => {
    setHoveredBar(null);
  };

  const getBarHeight = (value: number) => {
    return isVertical 
      ? `${Math.max((value / calculatedMaxValue) * height, 4)}px`
      : `${Math.max((value / calculatedMaxValue) * height, 20)}px`;
  };

  const getBarWidth = (value: number) => {
    return isVertical
      ? '100%'
      : `${Math.max((value / calculatedMaxValue) * height, 20)}px`;
  };

  const legendItems = data.map(item => ({
    id: item.id,
    label: item.label,
    color: item.color,
    value: item.value,
    description: item.description
  }));

  return (
    <AccessibleChart
      title={title}
      description={description}
      chartData={data}
      className={`accessible-bar-chart ${className}`}
      role="img"
      aria-label={`${title} bar chart with ${data.length} bars`}
    >
      <div className="chart-container">
        {/* Chart Bars */}
        <div 
          ref={chartRef}
          className={`chart-bars ${isVertical ? 'flex items-end gap-2' : 'flex flex-col gap-2'}`}
          style={{ 
            height: isVertical ? `${height}px` : 'auto',
            width: isVertical ? '100%' : `${height}px`
          }}
          role="list"
          aria-label="Chart bars"
        >
          {data.map((item, index) => {
            const isFocused = focusedBar === item.id;
            const isHovered = hoveredBar === item.id;
            const isClickable = item.clickable !== false;
            
            return (
              <div
                key={item.id}
                className={`chart-bar ${isVertical ? 'flex-1' : 'w-full'} relative`}
                role="listitem"
                tabIndex={isClickable ? 0 : -1}
                onClick={() => handleBarClick(item)}
                onKeyDown={(e) => handleBarKeyDown(e, item)}
                onFocus={() => handleBarFocus(item.id)}
                onBlur={handleBarBlur}
                onMouseEnter={() => handleBarMouseEnter(item.id)}
                onMouseLeave={handleBarMouseLeave}
                aria-label={`${item.label}: ${item.value}${item.description ? `. ${item.description}` : ''}`}
                aria-describedby={item.description ? `tooltip-${item.id}` : undefined}
              >
                {/* Bar Element */}
                <div
                  className={`bar transition-all duration-200 ${
                    isClickable ? 'cursor-pointer hover:opacity-80' : ''
                  } ${
                    isFocused ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                  }`}
                  style={{
                    backgroundColor: item.color,
                    height: getBarHeight(item.value),
                    width: getBarWidth(item.value),
                    minHeight: isVertical ? '4px' : '20px',
                    minWidth: isVertical ? '20px' : '4px'
                  }}
                  role="img"
                  aria-label={`Bar for ${item.label}`}
                />

                {/* Value Label */}
                {showValues && (
                  <div className={`value-label text-xs font-medium text-gray-700 dark:text-gray-300 mt-1 ${
                    isVertical ? 'text-center' : 'ml-2'
                  }`}>
                    {item.value}
                  </div>
                )}

                {/* Bar Label */}
                <div className={`bar-label text-xs text-gray-600 dark:text-gray-400 mt-1 ${
                  isVertical ? 'text-center' : 'ml-2'
                }`}>
                  {item.label}
                </div>

                {/* Tooltip */}
                <AccessibleTooltip
                  content={`${item.label}: ${item.value}${item.description ? ` - ${item.description}` : ''}`}
                  position={isVertical ? 'top' : 'right'}
                >
                  <div className="sr-only">
                    {item.label}: {item.value}
                    {item.description && ` - ${item.description}`}
                  </div>
                </AccessibleTooltip>

                {/* Focus indicator for screen readers */}
                {isFocused && (
                  <div className="sr-only" aria-live="polite">
                    Focused on bar for {item.label} with value {item.value}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        {showLegend && (
          <div className="chart-legend mt-4">
            <AccessibleLegend
              items={legendItems}
              onItemClick={(itemId) => {
                const item = data.find(d => d.id === itemId);
                if (item) {
                  handleBarClick(item);
                }
              }}
              onItemToggle={(itemId) => {
                // Toggle bar visibility - could be implemented with state
                console.log('Toggle visibility for:', itemId);
              }}
            />
          </div>
        )}

        {/* Chart Instructions for Screen Readers */}
        <div className="sr-only" aria-live="polite">
          {title} chart contains {data.length} bars. 
          {onBarClick && ' Use Tab to navigate between bars, Enter or Space to select a bar.'}
          {!onBarClick && ' This chart is for display purposes only.'}
          The highest value is {calculatedMaxValue}.
        </div>
      </div>
    </AccessibleChart>
  );
}

// Specialized Bar Chart for Time Series Data
interface TimeSeriesBarChartProps {
  title: string;
  description?: string;
  data: Array<{
    date: string;
    value: number;
    label?: string;
    clickable?: boolean;
  }>;
  height?: number;
  onBarClick?: (data: { date: string; value: number }) => void;
  className?: string;
}

export function TimeSeriesBarChart({
  title,
  description,
  data,
  height = 200,
  onBarClick,
  className = ''
}: TimeSeriesBarChartProps) {
  const maxValue = Math.max(...data.map(d => d.value));
  
  const chartData: BarChartData[] = data.map((item, index) => ({
    id: `date-${index}`,
    label: item.label || new Date(item.date).toLocaleDateString(),
    value: item.value,
    color: '#3B82F6', // Brand blue
    description: `Date: ${new Date(item.date).toLocaleDateString()}`,
    clickable: item.clickable
  }));

  return (
    <AccessibleBarChart
      title={title}
      description={description}
      data={chartData}
      height={height}
      maxValue={maxValue}
      onBarClick={(barData) => {
        const originalData = data.find((_, index) => `date-${index}` === barData.id);
        if (originalData && onBarClick) {
          onBarClick(originalData);
        }
      }}
      className={className}
      showLegend={false}
      showValues={true}
    />
  );
}
