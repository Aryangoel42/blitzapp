'use client';

import React, { useState, useEffect } from 'react';
import { TaskManager, TaskWithSubtasks } from '@/lib/taskManager';
import { RRuleParser, RecurrenceRule } from '@/lib/rrule';

interface TaskEditModalProps {
  task?: TaskWithSubtasks | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  parentTaskId?: string;
}

interface TaskFormData {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  due_at: string;
  estimate_min: number;
  tags: string[];
  recurrence_rule: string;
  reminder_time: string;
  reminder_frequency: 'once' | 'hourly' | 'daily' | 'weekly' | 'custom';
}

const defaultFormData: TaskFormData = {
  title: '',
  description: '',
  priority: 'medium',
  due_at: '',
  estimate_min: 0,
  tags: [],
  recurrence_rule: '',
  reminder_time: '',
  reminder_frequency: 'once'
};

export default function TaskEditModal({ 
  task, 
  isOpen, 
  onClose, 
  onSave,
  parentTaskId 
}: TaskEditModalProps) {
  const [formData, setFormData] = useState<TaskFormData>(defaultFormData);
  const [isLoading, setIsLoading] = useState(false);
  const [showRecurrence, setShowRecurrence] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule | null>(null);
  const [newTag, setNewTag] = useState('');
  const [showSubtasks, setShowSubtasks] = useState(false);
  const [subtasks, setSubtasks] = useState<TaskWithSubtasks[]>([]);

  // Mock user ID for now - replace with actual auth
  const userId = 'mock-user-id';

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || '',
        priority: task.priority as any,
        due_at: task.due_at ? new Date(task.due_at).toISOString().slice(0, 16) : '',
        estimate_min: task.estimate_min || 0,
        tags: JSON.parse(task.tags_json),
        recurrence_rule: task.recurrence_rule || '',
        reminder_time: task.reminder_time ? new Date(task.reminder_time).toISOString().slice(0, 16) : '',
        reminder_frequency: (task.reminder_frequency as any) || 'once'
      });
      
      if (task.recurrence_rule) {
        const rule = RRuleParser.parse(task.recurrence_rule);
        setRecurrenceRule(rule);
        setShowRecurrence(true);
      }
      
      setSubtasks(task.subtasks || []);
    } else {
      setFormData({ ...defaultFormData });
      setRecurrenceRule(null);
      setShowRecurrence(false);
      setSubtasks([]);
    }
  }, [task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) return;

    setIsLoading(true);
    
    try {
      if (task) {
        // Update existing task
        await TaskManager.updateTask(task.id, userId, {
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          due_at: formData.due_at ? new Date(formData.due_at) : undefined,
          estimate_min: formData.estimate_min,
          tags: formData.tags,
          recurrence_rule: formData.recurrence_rule,
          reminder_time: formData.reminder_time ? new Date(formData.reminder_time) : undefined,
          reminder_frequency: formData.reminder_frequency
        });
      } else {
        // Create new task
        await TaskManager.createTask(userId, {
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          due_at: formData.due_at ? new Date(formData.due_at) : undefined,
          estimate_min: formData.estimate_min,
          tags: formData.tags,
          recurrence_rule: formData.recurrence_rule,
          reminder_time: formData.reminder_time ? new Date(formData.reminder_time) : undefined,
          reminder_frequency: formData.reminder_frequency,
          parent_task_id: parentTaskId
        });
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Failed to save task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleRecurrenceChange = (field: keyof RecurrenceRule, value: any) => {
    const newRule: RecurrenceRule = {
      ...recurrenceRule,
      [field]: value,
      startDate: new Date()
    } as RecurrenceRule;

    setRecurrenceRule(newRule);
    setFormData(prev => ({
      ...prev,
      recurrence_rule: RRuleParser.toString(newRule)
    }));
  };

  const addSubtask = async () => {
    if (!task) return;
    
    try {
      await TaskManager.createTask(userId, {
        title: 'New subtask',
        parent_task_id: task.id
      });
      
      // Refresh subtasks
      const updatedTask = await TaskManager.getTasks(userId, { parentTaskId: task.id });
      setSubtasks(updatedTask);
    } catch (error) {
      console.error('Failed to add subtask:', error);
    }
  };

  const updateSubtask = async (subtaskId: string, data: Partial<TaskFormData>) => {
    try {
      await TaskManager.updateTask(subtaskId, userId, {
        title: data.title,
        description: data.description,
        priority: data.priority,
        due_at: data.due_at ? new Date(data.due_at) : undefined,
        estimate_min: data.estimate_min,
        tags: data.tags
      });
      
      // Refresh subtasks
      if (task) {
        const updatedTask = await TaskManager.getTasks(userId, { parentTaskId: task.id });
        setSubtasks(updatedTask);
      }
    } catch (error) {
      console.error('Failed to update subtask:', error);
    }
  };

  const deleteSubtask = async (subtaskId: string) => {
    try {
      await TaskManager.deleteTask(subtaskId, userId);
      
      // Refresh subtasks
      if (task) {
        const updatedTask = await TaskManager.getTasks(userId, { parentTaskId: task.id });
        setSubtasks(updatedTask);
      }
    } catch (error) {
      console.error('Failed to delete subtask:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {task ? 'Edit Task' : 'New Task'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
        </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estimate (minutes)
                  </label>
                  <input
                    type="number"
                    value={formData.estimate_min}
                    onChange={(e) => setFormData(prev => ({ ...prev, estimate_min: parseInt(e.target.value) || 0 }))}
                    min="0"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Due Date
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.due_at}
                    onChange={(e) => setFormData(prev => ({ ...prev, due_at: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
          </div>

              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reminder Time
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.reminder_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, reminder_time: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reminder Frequency
                </label>
                <select
                  value={formData.reminder_frequency}
                  onChange={(e) => setFormData(prev => ({ ...prev, reminder_frequency: e.target.value as any }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="once">Once</option>
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add a tag"
                  className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-2"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Recurrence */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  id="recurrence"
                  checked={showRecurrence}
                  onChange={(e) => setShowRecurrence(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="recurrence" className="text-sm font-medium text-gray-700">
                  Recurring Task
                </label>
              </div>

              {showRecurrence && (
                <div className="p-4 bg-gray-50 rounded-lg space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Frequency
                      </label>
                      <select
                        value={recurrenceRule?.frequency || 'daily'}
                        onChange={(e) => handleRecurrenceChange('frequency', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Interval
                      </label>
                      <input
                        type="number"
                        value={recurrenceRule?.interval || 1}
                        onChange={(e) => handleRecurrenceChange('interval', parseInt(e.target.value) || 1)}
                        min="1"
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {recurrenceRule?.frequency === 'weekly' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Days of Week
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                          <label key={day} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={recurrenceRule.byDay?.includes(index) || false}
                              onChange={(e) => {
                                const currentDays = recurrenceRule.byDay || [];
                                const newDays = e.target.checked
                                  ? [...currentDays, index]
                                  : currentDays.filter(d => d !== index);
                                handleRecurrenceChange('byDay', newDays);
                              }}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            {day}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {recurrenceRule?.frequency === 'monthly' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Day of Month
                      </label>
                      <input
                        type="number"
                        value={recurrenceRule?.byMonthDay?.[0] || 1}
                        onChange={(e) => handleRecurrenceChange('byMonthDay', [parseInt(e.target.value) || 1])}
                        min="1"
                        max="31"
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Subtasks */}
            {task && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Subtasks</h3>
                  <button
                    type="button"
                    onClick={() => setShowSubtasks(!showSubtasks)}
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    {showSubtasks ? 'Hide' : 'Show'} Subtasks
                  </button>
                </div>

                {showSubtasks && (
                  <div className="space-y-3">
                    {subtasks.map((subtask) => (
                      <div key={subtask.id} className="p-3 border border-gray-200 rounded-lg">
                        <input
                          type="text"
                          value={subtask.title}
                          onChange={(e) => updateSubtask(subtask.id, { title: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            type="button"
                            onClick={() => deleteSubtask(subtask.id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Delete
                          </button>
          </div>
        </div>
                    ))}
                    <button
                      type="button"
                      onClick={addSubtask}
                      className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors"
                    >
                      + Add Subtask
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={isLoading || !formData.title.trim()}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Saving...' : (task ? 'Update Task' : 'Create Task')}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
        </div>
          </form>
        </div>
      </div>
    </div>
  );
}


