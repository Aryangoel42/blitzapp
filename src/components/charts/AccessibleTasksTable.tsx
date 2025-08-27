'use client';

import React, { useState } from 'react';
import { useAccessibility } from '../AccessibilityProvider';

interface TaskData {
  id: string;
  list: string;
  taskName: string;
  status: 'early' | 'late' | 'on-time';
  minutes: number;
  dueDate: string;
}

interface AccessibleTasksTableProps {
  title?: string;
  description?: string;
  tasks: TaskData[];
  onTaskClick?: (task: TaskData) => void;
  className?: string;
}

export function AccessibleTasksTable({
  title,
  description,
  tasks,
  onTaskClick,
  className = ''
}: AccessibleTasksTableProps) {
  const { announceToScreenReader } = useAccessibility();
  const [focusedTask, setFocusedTask] = useState<string | null>(null);

  const handleTaskClick = (task: TaskData) => {
    if (onTaskClick) {
      onTaskClick(task);
      announceToScreenReader(`Selected task: ${task.taskName}`);
    }
  };

  const handleTaskKeyDown = (event: React.KeyboardEvent, task: TaskData) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleTaskClick(task);
    }
  };

  const handleTaskFocus = (taskId: string, taskName: string) => {
    setFocusedTask(taskId);
    announceToScreenReader(`Focused on task: ${taskName}`);
  };

  const handleTaskBlur = () => {
    setFocusedTask(null);
  };

  const getStatusDisplay = (status: 'early' | 'late' | 'on-time') => {
    switch (status) {
      case 'early':
        return { color: 'text-green-600', bgColor: 'bg-green-100', icon: '✓', label: 'Early' };
      case 'late':
        return { color: 'text-red-600', bgColor: 'bg-red-100', icon: '⚠', label: 'Late' };
      case 'on-time':
        return { color: 'text-blue-600', bgColor: 'bg-blue-100', icon: '✓', label: 'On Time' };
      default:
        return { color: 'text-gray-600', bgColor: 'bg-gray-100', icon: '•', label: 'Unknown' };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <div className={`accessible-tasks-table ${className}`} role="region" aria-label={title || 'Tasks Table'}>
      {(title || description) && (
        <div className="table-header mb-4">
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

      <div className="table-container overflow-x-auto">
        <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg shadow-sm" role="table" aria-label="Tasks data table">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr role="row">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" role="columnheader" scope="col">
                List
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" role="columnheader" scope="col">
                Task Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" role="columnheader" scope="col">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" role="columnheader" scope="col">
                Time Spent
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" role="columnheader" scope="col">
                Due Date
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {tasks.map((task, index) => {
              const statusDisplay = getStatusDisplay(task.status);
              const isFocused = focusedTask === task.id;
              
              return (
                <tr
                  key={task.id}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    isFocused ? 'ring-2 ring-blue-500 ring-inset' : ''
                  }`}
                  role="row"
                  aria-rowindex={index + 1}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100" role="cell">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {task.list}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100" role="cell">
                    <button
                      className="text-left hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-1 py-1"
                      onClick={() => handleTaskClick(task)}
                      onKeyDown={(e) => handleTaskKeyDown(e, task)}
                      onFocus={() => handleTaskFocus(task.id, task.taskName)}
                      onBlur={handleTaskBlur}
                      tabIndex={0}
                      aria-label={`View details for task: ${task.taskName}`}
                    >
                      {task.taskName}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100" role="cell">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusDisplay.bgColor} ${statusDisplay.color}`}
                      aria-label={statusDisplay.label}
                    >
                      {statusDisplay.icon} {statusDisplay.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100" role="cell">
                    {formatTime(task.minutes)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200" role="cell">
                    {formatDate(task.dueDate)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="sr-only" aria-live="polite">
        {title || 'Tasks Table'} contains {tasks.length} tasks.
        Use Tab to navigate between tasks, Enter or Space to view task details.
      </div>
    </div>
  );
}

export function AnalyticsTasksTable({
  tasks,
  onTaskClick,
  className = ''
}: {
  tasks: TaskData[];
  onTaskClick?: (task: TaskData) => void;
  className?: string;
}) {
  return (
    <AccessibleTasksTable
      title="Tasks Overview"
      description="Detailed view of your tasks with completion status and time tracking"
      tasks={tasks}
      onTaskClick={onTaskClick}
      className={className}
    />
  );
}
