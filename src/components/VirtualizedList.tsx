"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { createVirtualScroller } from '@/lib/performance';

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
}

export function VirtualizedList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  className = ''
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const virtualScroller = createVirtualScroller(
    items,
    itemHeight,
    containerHeight,
    scrollTop
  );

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Auto-scroll to top when items change
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
      setScrollTop(0);
    }
  }, [items.length]);

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: virtualScroller.totalHeight, position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            top: virtualScroller.offsetY,
            left: 0,
            right: 0,
          }}
        >
          {virtualScroller.visibleItems.map((item, index) => (
            <div
              key={virtualScroller.startIndex + index}
              style={{ height: itemHeight }}
            >
              {renderItem(item, virtualScroller.startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Optimized task list component using virtualization
interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_at?: string;
}

interface OptimizedTaskListProps {
  tasks: Task[];
  onToggleComplete: (id: string, currentStatus: string) => void;
  onEdit: (task: Task) => void;
}

export function OptimizedTaskList({ tasks, onToggleComplete, onEdit }: OptimizedTaskListProps) {
  const ITEM_HEIGHT = 80; // Approximate height of each task item
  const CONTAINER_HEIGHT = 600; // Fixed container height

  const renderTaskItem = (task: Task, index: number) => (
    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
      <div className="flex items-center gap-3 flex-1">
        <input
          type="checkbox"
          checked={task.status === 'done'}
          onChange={() => onToggleComplete(task.id, task.status)}
          className="rounded border-gray-300 focus:ring-brand-500 focus:ring-2"
          aria-label={`Mark task "${task.title}" as ${task.status === 'done' ? 'incomplete' : 'complete'}`}
        />
        <div className="flex-1 min-w-0">
          <div className={`font-medium ${task.status === 'done' ? 'line-through text-gray-500' : ''}`}>
            {task.title}
          </div>
          <div className="text-sm text-gray-500">
            {task.due_at ? new Date(task.due_at).toLocaleDateString() : 'No due date'}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`px-2 py-1 text-xs rounded-full ${
          task.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
          task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
          'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
        }`}>
          {task.priority}
        </span>
        <button
          onClick={() => onEdit(task)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 rounded p-1"
          aria-label={`Edit task "${task.title}"`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      </div>
    </div>
  );

  return (
    <VirtualizedList
      items={tasks}
      itemHeight={ITEM_HEIGHT}
      containerHeight={CONTAINER_HEIGHT}
      renderItem={renderTaskItem}
      className="border border-gray-200 dark:border-gray-800 rounded-lg"
    />
  );
}
