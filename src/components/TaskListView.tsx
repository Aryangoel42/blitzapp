'use client';

import React, { useState, useEffect } from 'react';
import { TaskManager, TaskWithSubtasks, TaskFilters } from '@/lib/taskManager';
import QuickAdd from './QuickAdd';
import TaskEditModal from './TaskEditModal';

interface TaskListViewProps {
  view: 'today' | 'upcoming' | 'overdue' | 'completed';
  title: string;
  onTaskUpdate?: () => void;
}

interface TaskListState {
  tasks: TaskWithSubtasks[];
  isLoading: boolean;
  filters: TaskFilters;
  searchQuery: string;
  selectedTask: TaskWithSubtasks | null;
  isEditModalOpen: boolean;
}

export default function TaskListView({ view, title, onTaskUpdate }: TaskListViewProps) {
  const [state, setState] = useState<TaskListState>({
    tasks: [],
    isLoading: true,
    filters: {},
    searchQuery: '',
    selectedTask: null,
    isEditModalOpen: false
  });

  // Mock user ID for now - replace with actual auth
  const userId = 'mock-user-id';

  useEffect(() => {
    loadTasks();
  }, [view, state.filters, state.searchQuery]);

  const loadTasks = async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      let tasks: TaskWithSubtasks[] = [];
      const filters: TaskFilters = { ...state.filters };
      
      if (state.searchQuery) {
        filters.search = state.searchQuery;
      }

      switch (view) {
        case 'today':
          tasks = await TaskManager.getTodayTasks(userId);
          break;
        case 'upcoming':
          tasks = await TaskManager.getUpcomingTasks(userId, 7);
          break;
        case 'overdue':
          tasks = await TaskManager.getOverdueTasks(userId);
          break;
        case 'completed':
          tasks = await TaskManager.getCompletedTasks(userId, 30);
          break;
      }

      // Apply additional filters
      if (filters.status && filters.status.length > 0) {
        tasks = tasks.filter(task => filters.status!.includes(task.status));
      }
      
      if (filters.priority && filters.priority.length > 0) {
        tasks = tasks.filter(task => filters.priority!.includes(task.priority));
      }
      
      if (filters.tags && filters.tags.length > 0) {
        tasks = tasks.filter(task => {
          const taskTags = JSON.parse(task.tags_json);
          return filters.tags!.some(tag => taskTags.includes(tag));
        });
      }

      setState(prev => ({ ...prev, tasks, isLoading: false }));
    } catch (error) {
      console.error('Failed to load tasks:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleTaskComplete = async (taskId: string) => {
    try {
      await TaskManager.completeTask(taskId, userId);
      loadTasks();
      onTaskUpdate?.();
    } catch (error) {
      console.error('Failed to complete task:', error);
    }
  };

  const handleTaskDelete = async (taskId: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        await TaskManager.deleteTask(taskId, userId);
        loadTasks();
        onTaskUpdate?.();
      } catch (error) {
        console.error('Failed to delete task:', error);
      }
    }
  };

  const handleTaskEdit = (task: TaskWithSubtasks) => {
    setState(prev => ({ ...prev, selectedTask: task, isEditModalOpen: true }));
  };

  const handleFilterChange = (filterType: keyof TaskFilters, value: any) => {
    setState(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        [filterType]: value
      }
    }));
  };

  const clearFilters = () => {
    setState(prev => ({ ...prev, filters: {}, searchQuery: '' }));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'todo': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDueDate = (dueDate: Date | null) => {
    if (!dueDate) return 'No due date';
    
    const now = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    if (diffDays <= 7) return `Due in ${diffDays} days`;
    
    return due.toLocaleDateString();
  };

  const renderFilters = () => (
    <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Filters</h3>
        <button
          onClick={clearFilters}
          className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
        >
          Clear all
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
          <input
            type="text"
            value={state.searchQuery}
            onChange={(e) => setState(prev => ({ ...prev, searchQuery: e.target.value }))}
            placeholder="Search tasks..."
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
          <select
            value={state.filters.status?.[0] || ''}
            onChange={(e) => handleFilterChange('status', e.target.value ? [e.target.value] : [])}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All statuses</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {/* Priority Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
          <select
            value={state.filters.priority?.[0] || ''}
            onChange={(e) => handleFilterChange('priority', e.target.value ? [e.target.value] : [])}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        {/* Tags Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
          <input
            type="text"
            placeholder="Enter tag..."
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                const tag = (e.target as HTMLInputElement).value.trim();
                if (tag) {
                  handleFilterChange('tags', [tag]);
                  (e.target as HTMLInputElement).value = '';
                }
              }
            }}
          />
        </div>
      </div>
    </div>
  );

  const renderTask = (task: TaskWithSubtasks) => (
    <div
      key={task.id}
      className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-medium text-gray-900">{task.title}</h3>
            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(task.priority)}`}>
              {task.priority}
            </span>
            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(task.status)}`}>
              {task.status.replace('_', ' ')}
            </span>
          </div>
          
          {task.description && (
            <p className="text-gray-600 mb-3">{task.description}</p>
          )}
          
          <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
            <span>Due: {formatDueDate(task.due_at)}</span>
            {task.estimate_min && task.estimate_min > 0 && (
              <span>Estimate: {task.estimate_min}m</span>
            )}
            {task.focus_sessions_count > 0 && (
              <span>Focus sessions: {task.focus_sessions_count}</span>
            )}
            {task.total_focus_time_min > 0 && (
              <span>Total time: {task.total_focus_time_min}m</span>
            )}
          </div>
          
          {/* Tags */}
          {task.tags_json && JSON.parse(task.tags_json).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {JSON.parse(task.tags_json).map((tag: string, index: number) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
          
          {/* Subtasks */}
          {task.subtasks && task.subtasks.length > 0 && (
            <div className="mb-3">
              <div className="text-sm text-gray-600 mb-2">
                Subtasks ({task.subtasks.filter(st => st.status === 'completed').length}/{task.subtasks.length})
              </div>
              <div className="space-y-1">
                {task.subtasks.slice(0, 3).map(subtask => (
                  <div key={subtask.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={subtask.status === 'completed'}
                      onChange={() => handleTaskComplete(subtask.id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className={subtask.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-700'}>
                      {subtask.title}
                    </span>
                  </div>
                ))}
                {task.subtasks.length > 3 && (
                  <div className="text-xs text-gray-500">
                    +{task.subtasks.length - 3} more subtasks
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2 ml-4">
          {task.status !== 'completed' && (
            <button
              onClick={() => handleTaskComplete(task.id)}
              className="p-2 text-green-600 hover:text-green-800 transition-colors"
              title="Mark as complete"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
          )}
          
          <button
            onClick={() => handleTaskEdit(task)}
            className="p-2 text-blue-600 hover:text-blue-800 transition-colors"
            title="Edit task"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          
          <button
            onClick={() => handleTaskDelete(task.id)}
            className="p-2 text-red-600 hover:text-red-800 transition-colors"
            title="Delete task"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );

  if (state.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        <div className="text-sm text-gray-600">
          {state.tasks.length} task{state.tasks.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Quick Add */}
      <QuickAdd
        onTaskCreated={() => {
          loadTasks();
          onTaskUpdate?.();
        }}
        placeholder={`Add a task to ${title.toLowerCase()}...`}
      />

      {/* Filters */}
      {renderFilters()}

      {/* Task List */}
      <div className="space-y-4">
        {state.tasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
            <p className="text-gray-600">
              {view === 'completed' 
                ? 'No completed tasks in the last 30 days'
                : `No ${view} tasks found. Try adjusting your filters or add a new task.`
              }
            </p>
          </div>
        ) : (
          state.tasks.map(renderTask)
        )}
      </div>

      {/* Task Edit Modal */}
      <TaskEditModal
        task={state.selectedTask}
        isOpen={state.isEditModalOpen}
        onClose={() => setState(prev => ({ ...prev, isEditModalOpen: false, selectedTask: null }))}
        onSave={() => {
          loadTasks();
          onTaskUpdate?.();
        }}
      />
    </div>
  );
}
