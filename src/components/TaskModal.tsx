"use client";

import { useState, useEffect, useRef } from 'react';
import { useAccessibility } from './AccessibilityProvider';
import { generateRRuleString, previewOccurrences } from '@/lib/rrule';

type Subtask = {
  id?: string;
  title: string;
  order_index: number;
};

type Props = {
  userId: string;
  onClose: () => void;
  onCreated?: () => void;
  parentTaskId?: string; // For creating subtasks
};

export function TaskModal({ userId, onClose, onCreated, parentTaskId }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<'low'|'medium'|'high'>('medium');
  const [due, setDue] = useState("");
  const [estimate, setEstimate] = useState<number|''>('');
  const [tags, setTags] = useState("");
  const [reminder, setReminder] = useState("");
  const [recurrence, setRecurrence] = useState("");
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtask, setNewSubtask] = useState("");
  const [busy, setBusy] = useState(false);
  const [showAdvancedRecurrence, setShowAdvancedRecurrence] = useState(false);
  
  // Advanced recurrence options
  const [recurrenceFreq, setRecurrenceFreq] = useState<'DAILY'|'WEEKLY'|'MONTHLY'|'YEARLY'>('WEEKLY');
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceByDay, setRecurrenceByDay] = useState<string[]>([]);
  const [recurrenceByMonthDay, setRecurrenceByMonthDay] = useState<number[]>([]);
  const [recurrenceByMonth, setRecurrenceByMonth] = useState<number[]>([]);
  const [recurrenceCount, setRecurrenceCount] = useState<number|''>('');
  const [recurrenceUntil, setRecurrenceUntil] = useState("");
  
  const modalRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const { trapFocus, releaseFocusTrap, announceToScreenReader } = useAccessibility();

  useEffect(() => {
    trapFocus(modalRef);
    announceToScreenReader('New task modal opened. Press Escape to close.');
    
    setTimeout(() => {
      titleInputRef.current?.focus();
    }, 100);

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      releaseFocusTrap();
    };
  }, [trapFocus, releaseFocusTrap, announceToScreenReader, onClose]);

  // Add subtask
  const addSubtask = () => {
    if (!newSubtask.trim()) return;
    
    const subtask: Subtask = {
      title: newSubtask.trim(),
      order_index: subtasks.length
    };
    
    setSubtasks([...subtasks, subtask]);
    setNewSubtask("");
  };

  // Remove subtask
  const removeSubtask = (index: number) => {
    setSubtasks(subtasks.filter((_, i) => i !== index));
  };

  // Reorder subtasks
  const moveSubtask = (fromIndex: number, toIndex: number) => {
    const newSubtasks = [...subtasks];
    const [moved] = newSubtasks.splice(fromIndex, 1);
    newSubtasks.splice(toIndex, 0, moved);
    
    // Update order indices
    newSubtasks.forEach((subtask, index) => {
      subtask.order_index = index;
    });
    
    setSubtasks(newSubtasks);
  };

  // Generate RRULE string from advanced options
  const generateRecurrenceRule = () => {
    const rule: any = {
      freq: recurrenceFreq,
      interval: recurrenceInterval
    };
    
    if (recurrenceByDay.length > 0) rule.byDay = recurrenceByDay;
    if (recurrenceByMonthDay.length > 0) rule.byMonthDay = recurrenceByMonthDay;
    if (recurrenceByMonth.length > 0) rule.byMonth = recurrenceByMonth;
    if (recurrenceCount) rule.count = recurrenceCount;
    if (recurrenceUntil) rule.until = recurrenceUntil;
    
    return generateRRuleString(rule);
  };

  // Preview recurrence occurrences
  const previewRecurrence = () => {
    if (!due) return [];
    
    const rule = generateRecurrenceRule();
    const parsed = rule ? { freq: recurrenceFreq, interval: recurrenceInterval } : null;
    
    if (parsed) {
      return previewOccurrences(due, parsed, 5);
    }
    return [];
  };

  async function createTask() {
    if (!title.trim()) {
      announceToScreenReader('Please enter a task title', 'assertive');
      titleInputRef.current?.focus();
      return;
    }

    setBusy(true);
    
    try {
      // Create main task
      const taskData = {
        userId,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        due_at: due ? new Date(due).toISOString() : null,
        estimate_min: estimate || undefined,
        tags: tags ? tags.split(',').map(s => s.trim()).filter(Boolean) : [],
        reminder_time: reminder ? new Date(reminder).toISOString() : null,
        reminder_frequency: 'once' as const,
        recurrence_rule: showAdvancedRecurrence ? generateRecurrenceRule() : (recurrence || null),
        parent_task_id: parentTaskId || undefined
      };

    const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      });

      if (!res.ok) throw new Error('Failed to create task');

      const createdTask = await res.json();

      // Create subtasks if any
      if (subtasks.length > 0) {
        await Promise.all(
          subtasks.map(subtask =>
            fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
                ...subtask,
        userId,
                parent_task_id: createdTask.id,
                priority: 'medium',
                status: 'todo'
              })
            })
          )
        );
      }

      announceToScreenReader('Task created successfully');
      onCreated?.();
      onClose();
    } catch (error) {
      console.error('Task creation error:', error);
      announceToScreenReader('Failed to create task. Please try again.', 'assertive');
    } finally {
      setBusy(false);
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      createTask();
    }
  };

  return (
    <div 
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div 
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 id="modal-title" className="text-2xl font-bold text-gray-900 dark:text-white">
              {parentTaskId ? 'Add Subtask' : 'Create New Task'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Close modal"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Title *
              </label>
              <input
                ref={titleInputRef}
                id="title"
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white"
                placeholder="What needs to be done?"
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white"
                placeholder="Additional details..."
              />
            </div>

            {/* Priority and Due Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Priority
                </label>
                <select
                  id="priority"
                  value={priority}
                  onChange={e => setPriority(e.target.value as 'low'|'medium'|'high')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white"
                >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
              
              <div>
                <label htmlFor="due" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Due Date
                </label>
                <input
                  id="due"
                  type="datetime-local"
                  value={due}
                  onChange={e => setDue(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            {/* Estimate and Tags */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="estimate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Estimate (minutes)
                </label>
                <input
                  id="estimate"
                  type="number"
                  value={estimate}
                  onChange={e => setEstimate(e.target.value ? Number(e.target.value) : '')}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white"
                  placeholder="30"
                />
              </div>
              
              <div>
                <label htmlFor="tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tags
                </label>
                <input
                  id="tags"
                  type="text"
                  value={tags}
                  onChange={e => setTags(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white"
                  placeholder="#work, #personal"
                />
              </div>
            </div>

            {/* Subtasks Section */}
            {!parentTaskId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Subtasks
                </label>
                <div className="space-y-2">
                  {subtasks.map((subtask, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                      <span className="text-sm text-gray-500">{index + 1}.</span>
                      <input
                        type="text"
                        value={subtask.title}
                        onChange={e => {
                          const newSubtasks = [...subtasks];
                          newSubtasks[index].title = e.target.value;
                          setSubtasks(newSubtasks);
                        }}
                        className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-600 dark:text-white"
                      />
                      <button
                        onClick={() => removeSubtask(index)}
                        className="text-red-500 hover:text-red-700"
                        aria-label="Remove subtask"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newSubtask}
                      onChange={e => setNewSubtask(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addSubtask()}
                      placeholder="Add subtask..."
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white"
                    />
                    <button
                      onClick={addSubtask}
                      className="px-4 py-2 bg-brand-500 text-white rounded-md hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Reminder */}
            <div>
              <label htmlFor="reminder" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reminder
              </label>
              <input
                id="reminder"
                type="datetime-local"
                value={reminder}
                onChange={e => setReminder(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Recurrence */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Recurrence
                </label>
                <button
                  type="button"
                  onClick={() => setShowAdvancedRecurrence(!showAdvancedRecurrence)}
                  className="text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400"
                >
                  {showAdvancedRecurrence ? 'Simple' : 'Advanced'}
                </button>
            </div>
              
              {!showAdvancedRecurrence ? (
                <input
                  type="text"
                  value={recurrence}
                  onChange={e => setRecurrence(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white"
                  placeholder="FREQ=WEEKLY;BYDAY=MO,WE,FR"
                />
              ) : (
                <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
                  <div className="grid grid-cols-2 gap-4">
            <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Frequency
                      </label>
                      <select
                        value={recurrenceFreq}
                        onChange={e => setRecurrenceFreq(e.target.value as any)}
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-600 dark:text-white"
                      >
                        <option value="DAILY">Daily</option>
                        <option value="WEEKLY">Weekly</option>
                        <option value="MONTHLY">Monthly</option>
                        <option value="YEARLY">Yearly</option>
              </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Interval
                      </label>
                      <input
                        type="number"
                        value={recurrenceInterval}
                        onChange={e => setRecurrenceInterval(Number(e.target.value))}
                        min="1"
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-600 dark:text-white"
                      />
                    </div>
                  </div>
                  
                  {recurrenceFreq === 'WEEKLY' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Days of Week
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'].map(day => (
                          <button
                            key={day}
                            type="button"
                            onClick={() => {
                              if (recurrenceByDay.includes(day)) {
                                setRecurrenceByDay(recurrenceByDay.filter(d => d !== day));
                              } else {
                                setRecurrenceByDay([...recurrenceByDay, day]);
                              }
                            }}
                            className={`px-2 py-1 rounded text-xs ${
                              recurrenceByDay.includes(day)
                                ? 'bg-brand-500 text-white'
                                : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {recurrenceFreq === 'MONTHLY' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Days of Month
                      </label>
                      <input
                        type="text"
                        value={recurrenceByMonthDay.join(', ')}
                        onChange={e => {
                          const days = e.target.value.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d) && d >= 1 && d <= 31);
                          setRecurrenceByMonthDay(days);
                        }}
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-600 dark:text-white"
                        placeholder="1, 15, 30"
                      />
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Count (optional)
                      </label>
                      <input
                        type="number"
                        value={recurrenceCount}
                        onChange={e => setRecurrenceCount(e.target.value ? Number(e.target.value) : '')}
                        min="1"
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-600 dark:text-white"
                        placeholder="10"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Until (optional)
                      </label>
                      <input
                        type="date"
                        value={recurrenceUntil}
                        onChange={e => setRecurrenceUntil(e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-600 dark:text-white"
                      />
                    </div>
                  </div>
                  
                  {/* Preview */}
                  {due && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Preview (next 5 occurrences)
                      </label>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {previewRecurrence().map((date, i) => (
                          <div key={i}>
                            {new Date(date).toLocaleDateString()} at {new Date(date).toLocaleTimeString()}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              Cancel
            </button>
            <button
              onClick={createTask}
              disabled={busy || !title.trim()}
              className="px-6 py-2 bg-brand-500 text-white rounded-md hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? 'Creating...' : 'Create Task'}
            </button>
        </div>
        </div>
      </div>
    </div>
  );
}


