"use client";

import { useState, useRef, useEffect } from 'react';
import { useAccessibility } from './AccessibilityProvider';

type Task = {
  id: string;
  title: string;
  priority: string;
  tags: string[];
  due_at?: string;
  estimate_min?: number;
};

type Props = {
  task: Task;
  onSave: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onClose: () => void;
  position: { x: number; y: number };
};

export function CalendarQuickEdit({ task, onSave, onClose, position }: Props) {
  const [title, setTitle] = useState(task.title);
  const [priority, setPriority] = useState(task.priority);
  const [tags, setTags] = useState(task.tags.join(', '));
  const [estimate, setEstimate] = useState(task.estimate_min?.toString() || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const { announceToScreenReader } = useAccessibility();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
    onClose();
  }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    if (isEditing && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (!title.trim()) {
      announceToScreenReader('Task title cannot be empty');
      return;
    }

    setIsSaving(true);
    try {
      const updates: Partial<Task> = {
        title: title.trim(),
        priority,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        estimate_min: estimate ? parseInt(estimate) : undefined
      };

      await onSave(task.id, updates);
      announceToScreenReader('Task updated successfully');
      onClose();
    } catch (error) {
      announceToScreenReader('Failed to update task');
      console.error('Quick edit save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    }
  };

  const priorityColors = {
    low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
  };

  return (
    <div
      ref={containerRef}
      className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 min-w-80"
      style={{
        left: Math.min(position.x, window.innerWidth - 320),
        top: Math.min(position.y, window.innerHeight - 200)
      }}
      onKeyDown={handleKeyDown}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Quick Edit
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          aria-label="Close quick edit"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="space-y-3">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Title
          </label>
          {isEditing ? (
            <input
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white"
            />
          ) : (
            <div 
              className="px-3 py-2 border border-transparent hover:border-gray-300 dark:hover:border-gray-600 rounded-md cursor-pointer"
              onClick={() => setIsEditing(true)}
            >
              {title}
            </div>
          )}
        </div>

        {/* Priority */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Priority
          </label>
          <select
            value={priority}
            onChange={e => setPriority(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white"
          >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tags
          </label>
          <input
            type="text"
            value={tags}
            onChange={e => setTags(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white"
            placeholder="#work, #personal"
          />
        </div>

        {/* Estimate */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Estimate (minutes)
          </label>
          <input
            type="number"
            value={estimate}
            onChange={e => setEstimate(e.target.value)}
            min="0"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white"
            placeholder="30"
          />
        </div>

        {/* Current Tags Display */}
        {task.tags.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Current Tags
            </label>
            <div className="flex flex-wrap gap-1">
              {task.tags.map((tag, index) => (
                <span
                  key={index}
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${priorityColors[priority as keyof typeof priorityColors]}`}
                >
                  {tag}
                </span>
              ))}
        </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onClose}
          className="px-3 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving || !title.trim()}
          className="px-4 py-2 bg-brand-500 text-white rounded-md hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}


