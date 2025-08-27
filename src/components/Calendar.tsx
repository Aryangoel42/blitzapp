'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { TaskManager, TaskWithSubtasks } from '@/lib/taskManager';
import TaskEditModal from './TaskEditModal';

// Date utility functions (since date-fns is not installed)
const format = (date: Date, formatStr: string): string => {
  if (formatStr === 'ha') {
    return date.getHours() === 0 ? '12a' : 
           date.getHours() === 12 ? '12p' : 
           date.getHours() > 12 ? `${date.getHours() - 12}p` : `${date.getHours()}a`;
  }
  if (formatStr === 'EEE') {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[date.getDay()];
  }
  if (formatStr === 'd') {
    return date.getDate().toString();
  }
  if (formatStr === 'MMM d, yyyy') {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  }
  if (formatStr === 'MMMM yyyy') {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  }
  return date.toLocaleDateString();
};

const startOfWeek = (date: Date, options: { weekStartsOn: number }): Date => {
  const result = new Date(date);
  const day = result.getDay();
  const diff = result.getDate() - day + (options.weekStartsOn === 1 ? 1 : 0);
  result.setDate(diff);
  result.setHours(0, 0, 0, 0);
  return result;
};

const endOfWeek = (date: Date, options: { weekStartsOn: number }): Date => {
  const result = startOfWeek(date, options);
  result.setDate(result.getDate() + 6);
  result.setHours(23, 59, 59, 999);
  return result;
};

const eachDayOfInterval = (interval: { start: Date; end: Date }): Date[] => {
  const dates: Date[] = [];
  const current = new Date(interval.start);
  while (current <= interval.end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

const startOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

const endOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
};

const eachWeekOfInterval = (interval: { start: Date; end: Date }, options: { weekStartsOn: number }): Date[] => {
  const weeks: Date[] = [];
  let current = startOfWeek(interval.start, options);
  while (current <= interval.end) {
    weeks.push(new Date(current));
    current.setDate(current.getDate() + 7);
  }
  return weeks;
};

const isSameDay = (date1: Date, date2: Date): boolean => {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
};

const isSameMonth = (date1: Date, date2: Date): boolean => {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth();
};

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const addWeeks = (date: Date, weeks: number): Date => {
  return addDays(date, weeks * 7);
};

const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

const subDays = (date: Date, days: number): Date => {
  return addDays(date, -days);
};

const subWeeks = (date: Date, weeks: number): Date => {
  return addWeeks(date, -weeks);
};

const subMonths = (date: Date, months: number): Date => {
  return addMonths(date, -months);
};

interface CalendarProps {
  view: 'week' | 'month';
  onTaskUpdate?: () => void;
}

interface CalendarTask extends TaskWithSubtasks {
  displayDate: Date;
  isOverdue: boolean;
  isDueToday: boolean;
}

export default function Calendar({ view, onTaskUpdate }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<TaskWithSubtasks | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    taskId: string | null;
    startDate: Date | null;
  }>({
    isDragging: false,
    taskId: null,
    startDate: null
  });

  // Mock user ID for now - replace with actual auth
  const userId = 'mock-user-id';

  useEffect(() => {
    loadTasks();
  }, [currentDate, view]);

  const loadTasks = async () => {
    setIsLoading(true);
    try {
      let startDate: Date;
      let endDate: Date;

      if (view === 'week') {
        startDate = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday start
        endDate = endOfWeek(currentDate, { weekStartsOn: 1 });
      } else {
        startDate = startOfMonth(currentDate);
        endDate = endOfMonth(currentDate);
      }

      const allTasks = await TaskManager.getTasks(userId, {
        dueDate: { start: startDate, end: endDate }
      });

      const calendarTasks: CalendarTask[] = allTasks.map(task => ({
        ...task,
        displayDate: task.due_at ? new Date(task.due_at) : new Date(),
        isOverdue: task.due_at ? new Date(task.due_at) < new Date() && task.status !== 'completed' : false,
        isDueToday: task.due_at ? isSameDay(new Date(task.due_at), new Date()) : false
      }));

      setTasks(calendarTasks);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    if (view === 'week') {
      setCurrentDate(prev => direction === 'next' ? addWeeks(prev, 1) : subWeeks(prev, 1));
    } else {
      setCurrentDate(prev => direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1));
    }
  };

  const handleTaskDrop = async (taskId: string, newDate: Date) => {
    try {
      await TaskManager.updateTask(taskId, userId, {
        due_at: newDate
      });
      
      setDragState({
        isDragging: false,
        taskId: null,
        startDate: null
      });
      
      loadTasks();
      onTaskUpdate?.();
    } catch (error) {
      console.error('Failed to update task date:', error);
    }
  };

  const handleTaskClick = (task: TaskWithSubtasks) => {
    setSelectedTask(task);
    setIsEditModalOpen(true);
  };

  const handleDragStart = (e: React.DragEvent, task: CalendarTask) => {
    setDragState({
      isDragging: true,
      taskId: task.id,
      startDate: task.displayDate
    });
    
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    
    if (dragState.taskId) {
      handleTaskDrop(dragState.taskId, targetDate);
    }
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({
      start: weekStart,
      end: endOfWeek(currentDate, { weekStartsOn: 1 })
    });

  return (
      <div className="grid grid-cols-8 gap-1">
        {/* Header */}
        <div className="p-2 font-medium text-gray-600 bg-gray-50 rounded">Time</div>
        {weekDays.map(day => (
          <div key={day.toISOString()} className="p-2 font-medium text-center bg-gray-50 rounded">
            <div className="text-sm font-semibold">{format(day, 'EEE')}</div>
            <div className={`text-lg ${isSameDay(day, new Date()) ? 'text-blue-600 font-bold' : 'text-gray-900'}`}>
              {format(day, 'd')}
        </div>
      </div>
        ))}

        {/* Time slots */}
        {Array.from({ length: 24 }, (_, hour) => (
          <React.Fragment key={hour}>
            <div className="p-2 text-xs text-gray-500 bg-gray-50 border-t">
              {format(new Date(new Date().setHours(hour)), 'ha')}
            </div>
            {weekDays.map(day => (
              <div
                key={`${day.toISOString()}-${hour}`}
                className="min-h-[60px] p-1 border-t border-gray-100 relative"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour))}
              >
                {tasks
                  .filter(task => {
                    const taskHour = task.displayDate.getHours();
                    const taskDay = task.displayDate.getDate();
                    return taskHour === hour && taskDay === day.getDate();
                  })
                  .map(task => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task)}
                      onClick={() => handleTaskClick(task)}
                      className={`p-2 mb-1 rounded text-xs cursor-pointer transition-all hover:shadow-md ${
                        task.isOverdue ? 'bg-red-100 border-l-4 border-red-500' :
                        task.isDueToday ? 'bg-blue-100 border-l-4 border-blue-500' :
                        'bg-green-100 border-l-4 border-green-500'
                      }`}
                    >
                      <div className="font-medium truncate">{task.title}</div>
                      {task.estimate_min && task.estimate_min > 0 && (
                        <div className="text-gray-600">{task.estimate_min}m</div>
                      )}
                    </div>
                  ))}
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 1 });

    return (
            <div className="space-y-1">
        {/* Week headers */}
        <div className="grid grid-cols-7 gap-1">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <div key={day} className="p-2 text-center font-medium text-gray-600 bg-gray-50 rounded">
              {day}
            </div>
              ))}
            </div>

        {/* Calendar weeks */}
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-1">
            {eachDayOfInterval({ start: week, end: addDays(week, 6) }).map(day => {
              const dayTasks = tasks.filter(task => 
                task.displayDate && isSameDay(new Date(task.displayDate), day)
              );
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[120px] p-2 border border-gray-200 relative ${
                    !isCurrentMonth ? 'bg-gray-50' : 'bg-white'
                  } ${isToday ? 'ring-2 ring-blue-500' : ''}`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, day)}
                >
                  <div className={`text-sm font-medium mb-2 ${
                    !isCurrentMonth ? 'text-gray-400' :
                    isToday ? 'text-blue-600 font-bold' : 'text-gray-900'
                  }`}>
                    {format(day, 'd')}
                  </div>
                  
                  <div className="space-y-1">
                    {dayTasks.slice(0, 3).map(task => (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task)}
                        onClick={() => handleTaskClick(task)}
                        className={`p-2 rounded text-xs cursor-pointer transition-all hover:shadow-md ${
                          task.isOverdue ? 'bg-red-100 border-l-2 border-red-500' :
                          task.isDueToday ? 'bg-blue-100 border-l-2 border-blue-500' :
                          'bg-green-100 border-l-2 border-green-500'
                        }`}
                      >
                        <div className="font-medium truncate">{task.title}</div>
                        {task.estimate_min && task.estimate_min > 0 && (
                          <div className="text-gray-600">{task.estimate_min}m</div>
                        )}
                      </div>
                    ))}
                    
                    {dayTasks.length > 3 && (
                      <div className="text-xs text-gray-500 text-center">
                        +{dayTasks.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
}

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigateDate('prev')}
            className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <h2 className="text-2xl font-bold text-gray-900">
            {view === 'week' 
              ? `Week of ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d, yyyy')}`
              : format(currentDate, 'MMMM yyyy')
            }
          </h2>
          
          <button
            onClick={() => navigateDate('next')}
            className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Today
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {view === 'week' ? renderWeekView() : renderMonthView()}
      </div>

      {/* Task Edit Modal */}
      <TaskEditModal
        task={selectedTask}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedTask(null);
        }}
        onSave={() => {
          loadTasks();
          onTaskUpdate?.();
        }}
      />

      {/* Drag and Drop Instructions */}
      {dragState.isDragging && (
        <div className="fixed inset-0 pointer-events-none z-50">
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
            Drop task to reschedule
          </div>
        </div>
      )}
      </div>
  );
}


