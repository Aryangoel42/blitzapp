'use client';

import React, { useState, useRef, useEffect } from 'react';
import { TaskParser, ParsedTask } from '@/lib/taskParser';
import { TaskManager } from '@/lib/taskManager';

interface QuickAddProps {
  onTaskCreated?: () => void;
  parentTaskId?: string;
  placeholder?: string;
  className?: string;
}

export default function QuickAdd({ 
  onTaskCreated, 
  parentTaskId, 
  placeholder = "Add a task... (e.g., 'Pay bills tomorrow 5pm #finance 30m')",
  className = ""
}: QuickAddProps) {
  const [input, setInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [parsedTask, setParsedTask] = useState<ParsedTask | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mock user ID for now - replace with actual auth
  const userId = 'mock-user-id';

  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  const handleInputChange = (value: string) => {
    setInput(value);
    
    // Parse input in real-time
    if (value.trim().length > 10) {
      const parsed = TaskParser.parse(value);
      setParsedTask(parsed);
      setShowPreview(true);
    } else {
      setShowPreview(false);
      setParsedTask(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim()) return;

    setIsLoading(true);
    
    try {
      if (parsedTask && showPreview) {
        // Use parsed task data
        await TaskManager.createTask(userId, {
          title: parsedTask.title,
          description: parsedTask.description,
          priority: parsedTask.priority,
          due_at: parsedTask.dueDate,
          estimate_min: parsedTask.estimateMinutes,
          tags: parsedTask.tags,
          parent_task_id: parentTaskId
        });
      } else {
        // Use natural language parsing
        await TaskManager.createTaskFromNaturalLanguage(userId, input);
      }

      setInput('');
      setParsedTask(null);
      setShowPreview(false);
      setIsExpanded(false);
      onTaskCreated?.();
    } catch (error) {
      console.error('Failed to create task:', error);
      // You could add toast notification here
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsExpanded(false);
      setInput('');
      setParsedTask(null);
      setShowPreview(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString();
    }
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className={`w-full p-3 text-left text-gray-500 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:text-gray-600 transition-colors ${className}`}
      >
        <span className="flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          {placeholder}
        </span>
      </button>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
      <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full p-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            )}
          </button>
        </div>

        {showPreview && parsedTask && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Task Preview:</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Title:</span>
                <span className="font-medium">{parsedTask.title}</span>
              </div>
              
              {parsedTask.dueDate && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Due:</span>
                  <span className="font-medium">{formatDate(parsedTask.dueDate)}</span>
                </div>
              )}
              
              {parsedTask.priority && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Priority:</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(parsedTask.priority)}`}>
                    {parsedTask.priority}
                  </span>
                </div>
              )}
              
              {parsedTask.estimateMinutes && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Estimate:</span>
                  <span className="font-medium">{parsedTask.estimateMinutes} min</span>
                </div>
              )}
              
              {parsedTask.tags.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Tags:</span>
                  <div className="flex gap-1">
                    {parsedTask.tags.map((tag, index) => (
                      <span key={index} className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Creating...' : 'Add Task'}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsExpanded(false);
              setInput('');
              setParsedTask(null);
              setShowPreview(false);
            }}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>

      <div className="text-xs text-gray-500 space-y-1">
        <p><strong>Smart parsing examples:</strong></p>
        <p>&bull; &ldquo;Pay bills tomorrow 5pm #finance 30m&rdquo; &rarr; Due tomorrow at 5pm, tagged #finance, 30 min estimate</p>
        <p>&bull; &ldquo;Review proposal urgent #work&rdquo; &rarr; High priority, tagged #work</p>
        <p>&bull; &ldquo;Call mom next monday 2pm&rdquo; &rarr; Due next Monday at 2pm</p>
        <p>&bull; &ldquo;Weekly report #work&rdquo; &rarr; Tagged #work</p>
      </div>
    </div>
  );
}

export { QuickAdd };


