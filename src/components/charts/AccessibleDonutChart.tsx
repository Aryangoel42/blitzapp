'use client';

import React, { useState, useRef } from 'react';
import { AccessibleChart, AccessibleTooltip, AccessibleLegend } from './AccessibleChart';

interface DonutChartData {
  id: string;
  label: string;
  value: number;
  color: string;
  percentage: number;
  description?: string;
  clickable?: boolean;
}

interface AccessibleDonutChartProps {
  title: string;
  description?: string;
  data: DonutChartData[];
  size?: number;
  onSliceClick?: (data: DonutChartData) => void;
  className?: string;
  showLegend?: boolean;
  showValues?: boolean;
  showPercentages?: boolean;
}

export function AccessibleDonutChart({
  title,
  description,
  data,
  size = 200,
  onSliceClick,
  className = '',
  showLegend = true,
  showValues = true,
  showPercentages = true
}: AccessibleDonutChartProps) {
  const [focusedSlice, setFocusedSlice] = useState<string | null>(null);
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const radius = size / 2;
  const strokeWidth = Math.max(radius * 0.2, 20);
  const innerRadius = radius - strokeWidth;

  const calculatePath = (startAngle: number, endAngle: number) => {
    const x1 = radius + innerRadius * Math.cos(startAngle);
    const y1 = radius + innerRadius * Math.sin(startAngle);
    const x2 = radius + innerRadius * Math.cos(endAngle);
    const y2 = radius + innerRadius * Math.sin(endAngle);

    const largeArcFlag = endAngle - startAngle <= Math.PI ? 0 : 1;

    return [
      `M ${x1} ${y1}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      `L ${radius + radius * Math.cos(endAngle)} ${radius + radius * Math.sin(endAngle)}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${radius + radius * Math.cos(startAngle)} ${radius + radius * Math.sin(startAngle)}`,
      'Z'
    ].join(' ');
  };

  const handleSliceClick = (sliceData: DonutChartData) => {
    if (onSliceClick && sliceData.clickable !== false) {
      onSliceClick(sliceData);
    }
  };

  const handleSliceKeyDown = (event: React.KeyboardEvent, sliceData: DonutChartData) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSliceClick(sliceData);
    }
  };

  const handleSliceFocus = (sliceId: string) => {
    setFocusedSlice(sliceId);
  };

  const handleSliceBlur = () => {
    setFocusedSlice(null);
  };

  const handleSliceMouseEnter = (sliceId: string) => {
    setHoveredSlice(sliceId);
  };

  const handleSliceMouseLeave = () => {
    setHoveredSlice(null);
  };

  let currentAngle = -Math.PI / 2; // Start from top

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
      className={`accessible-donut-chart ${className}`}
      role="img"
      aria-label={`${title} donut chart with ${data.length} slices`}
    >
      <div className="chart-container">
        {/* SVG Chart */}
        <div className="chart-svg-container flex justify-center mb-4">
          <svg
            ref={chartRef}
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="chart-svg"
            role="img"
            aria-label={`${title} chart visualization`}
          >
            {/* Chart slices */}
            {data.map((item, index) => {
              const sliceAngle = (item.value / total) * 2 * Math.PI;
              const startAngle = currentAngle;
              const endAngle = currentAngle + sliceAngle;
              
              const path = calculatePath(startAngle, endAngle);
              const isFocused = focusedSlice === item.id;
              const isHovered = hoveredSlice === item.id;
              const isClickable = item.clickable !== false;

              // Update current angle for next slice
              currentAngle = endAngle;

              return (
                <g key={item.id}>
                  <path
                    d={path}
                    fill={item.color}
                    stroke="white"
                    strokeWidth="2"
                    className={`chart-slice transition-all duration-200 ${
                      isClickable ? 'cursor-pointer hover:opacity-80' : ''
                    } ${
                      isFocused ? 'opacity-90' : ''
                    }`}
                    onClick={() => handleSliceClick(item)}
                    onKeyDown={(e) => handleSliceKeyDown(e, item)}
                    onFocus={() => handleSliceFocus(item.id)}
                    onBlur={handleSliceBlur}
                    onMouseEnter={() => handleSliceMouseEnter(item.id)}
                    onMouseLeave={handleSliceMouseLeave}
                    tabIndex={isClickable ? 0 : -1}
                    role="button"
                    aria-label={`${item.label}: ${item.value} (${item.percentage.toFixed(1)}%)`}
                    aria-describedby={item.description ? `tooltip-${item.id}` : undefined}
                  />
                  
                  {/* Focus indicator */}
                  {isFocused && (
                    <circle
                      cx={radius}
                      cy={radius}
                      r={radius + 5}
                      fill="none"
                      stroke="#3B82F6"
                      strokeWidth="3"
                      strokeDasharray="5,5"
                    />
                  )}
                </g>
              );
            })}

            {/* Center text */}
            <text
              x={radius}
              y={radius - 10}
              textAnchor="middle"
              className="text-lg font-bold text-gray-700 dark:text-gray-300"
              role="text"
              aria-label="Total value"
            >
              {total}
            </text>
            <text
              x={radius}
              y={radius + 10}
              textAnchor="middle"
              className="text-sm text-gray-600 dark:text-gray-400"
              role="text"
              aria-label="Total label"
            >
              Total
            </text>
          </svg>
        </div>

        {/* Chart Legend */}
        {showLegend && (
          <div className="chart-legend">
            <AccessibleLegend
              items={legendItems}
              onItemClick={(itemId) => {
                const item = data.find(d => d.id === itemId);
                if (item) {
                  handleSliceClick(item);
                }
              }}
              onItemToggle={(itemId) => {
                // Toggle slice visibility - could be implemented with state
                console.log('Toggle visibility for:', itemId);
              }}
            />
          </div>
        )}

        {/* Data Summary for Screen Readers */}
        <div className="sr-only" aria-live="polite">
          {title} chart contains {data.length} slices. 
          {data.map(item => 
            `${item.label}: ${item.value} (${item.percentage.toFixed(1)}%)`
          ).join(', ')}
          {onSliceClick && ' Use Tab to navigate between slices, Enter or Space to select a slice.'}
          {!onSliceClick && ' This chart is for display purposes only.'}
        </div>

        {/* Focus indicator for screen readers */}
        {focusedSlice && (
          <div className="sr-only" aria-live="polite">
            Focused on slice for {data.find(d => d.id === focusedSlice)?.label}
          </div>
        )}
      </div>
    </AccessibleChart>
  );
}

// Specialized Donut Chart for Time by List Data
interface TimeByListDonutChartProps {
  title: string;
  description?: string;
  data: Array<{
    list: string;
    minutes: number;
    hours: number;
    percentage: number;
    clickable?: boolean;
  }>;
  size?: number;
  onSliceClick?: (data: { list: string; minutes: number; hours: number }) => void;
  className?: string;
}

export function TimeByListDonutChart({
  title,
  description,
  data,
  size = 200,
  onSliceClick,
  className = ''
}: TimeByListDonutChartProps) {
  const totalMinutes = data.reduce((sum, item) => sum + item.minutes, 0);
  
  const chartData: DonutChartData[] = data.map((item, index) => ({
    id: `list-${index}`,
    label: item.list,
    value: item.minutes,
    color: `hsl(${index * 60}, 70%, 50%)`,
    percentage: item.percentage,
    description: `${item.hours.toFixed(1)} hours`,
    clickable: item.clickable
  }));

  return (
    <AccessibleDonutChart
      title={title}
      description={description}
      data={chartData}
      size={size}
      onSliceClick={(sliceData) => {
        const originalData = data.find((_, index) => `list-${index}` === sliceData.id);
        if (originalData && onSliceClick) {
          onSliceClick(originalData);
        }
      }}
      className={className}
      showLegend={true}
      showValues={true}
      showPercentages={true}
    />
  );
}
