'use client';

import React, { useState, useEffect } from 'react';
import { TaskManager, TaskWithSubtasks } from '@/lib/taskManager';
import QuickAdd from './QuickAdd';

interface TaskListProps {
  view: 'today' | 'upcoming' | 'overdue' | 'completed';
  title: string;
}

export default function TaskList({ view, title }: TaskListProps) {
  const [tasks, setTasks] = useState<TaskWithSubtasks[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Mock user ID for now - replace with actual auth
  const userId = 'mock-user-id';

  useEffect(() => {
    loadTasks();
  }, [view]);

  const loadTasks = async () => {
    setIsLoading(true);
    try {
      let tasks: TaskWithSubtasks[] = [];
      
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

      setTasks(tasks);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTaskComplete = async (taskId: string) => {
    try {
      await TaskManager.completeTask(taskId, userId);
      loadTasks();
    } catch (error) {
      console.error('Failed to complete task:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
      
      <QuickAdd
        onTaskCreated={loadTasks}
        placeholder={`Add a task to ${title.toLowerCase()}...`}
      />

      <div className="space-y-4">
        {tasks.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No {view} tasks found
          </div>
        ) : (
          tasks.map(task => (
            <div key={task.id} className="bg-white p-4 rounded-lg shadow border">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-medium">{task.title}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    <span className="text-sm text-gray-500">
                      {task.status}
                    </span>
                  </div>
                  
                  {task.description && (
                    <p className="text-gray-600 mb-2">{task.description}</p>
                  )}
                  
                  {task.due_at && (
                    <p className="text-sm text-gray-500">
                      Due: {new Date(task.due_at).toLocaleDateString()}
                    </p>
                  )}
                  
                  {task.subtasks && task.subtasks.length > 0 && (
                    <p className="text-sm text-gray-500 mt-2">
                      {task.subtasks.filter(st => st.status === 'completed').length}/{task.subtasks.length} subtasks completed
                    </p>
                  )}
                </div>
                
                {task.status !== 'completed' && (
                  <button
                    onClick={() => handleTaskComplete(task.id)}
                    className="ml-4 p-2 text-green-600 hover:text-green-800"
                  >
                    ✓
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
