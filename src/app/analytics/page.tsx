"use client";

import { useEffect, useState, useCallback } from 'react';
import { 
  offlineQueueManager, 
  setupOfflineQueueListeners, 
  registerServiceWorker,
  type ExportQueueItem 
} from '@/lib/offlineQueue';

type KPIData = {
  tasksDone: number;
  tasksPerDay: number;
  hoursPerDay: number;
  avgMinutesPerTask: number;
  dayStreak: number;
  totalFocusHours: number;
  totalTasks: number;
  completionRate: number;
  mostProductiveHour: string;
  mostProductiveDay: string;
  totalSessions: number;
  avgSessionLength: number;
};

type SeriesData = {
  date: string;
  tasks: number;
  focusMinutes: number;
  focusHours: number;
  clickable?: boolean;
};

type TimeByListData = {
  list: string;
  minutes: number;
  hours: number;
  sessions: number;
  taskCount: number;
  percentage: number;
  clickable?: boolean;
};

type TaskData = {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_at: string | null;
  completed_at: string | null;
  created_at: string;
  estimate_min: number | null;
  totalFocusMinutes: number;
  totalFocusHours: number;
  completionStatus: string;
  efficiency: number | null;
  tags: string[];
  focusSessionsCount: number;
};

type Highlights = {
  mostProductiveHour: string;
  mostProductiveDay: string;
  mostProductiveMonth: string;
  longestStreak: number;
  bestCompletionRate: number;
  mostEfficientTask: string;
  totalFocusTime: number;
  averageSessionLength: number;
};

type FilterState = {
  status: string[];
  priority: string[];
  tags: string[];
  dateRange: {
    from: string;
    to: string;
  };
  search: string;
};

export default function AnalyticsPage() {
  const userId = 'user-123'; // Replace with actual user ID
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [seriesData, setSeriesData] = useState<SeriesData[]>([]);
  const [timeByList, setTimeByList] = useState<TimeByListData[]>([]);
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [highlights, setHighlights] = useState<Highlights | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedDrillDown, setSelectedDrillDown] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    status: [],
    priority: [],
    tags: [],
    dateRange: {
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      to: new Date().toISOString().split('T')[0]
    },
    search: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [exportQueue, setExportQueue] = useState<ExportQueueItem[]>([]);
  const [isOnline, setIsOnline] = useState(true);

  // Load analytics data with real database queries
  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      console.log('Loading analytics for user:', userId, 'filters:', filters);
      
      const [summaryRes, seriesRes, timeByListRes, tasksRes] = await Promise.all([
        fetch(`/api/analytics/summary?userId=${userId}&from=${filters.dateRange.from}&to=${filters.dateRange.to}`),
        fetch(`/api/analytics/series?userId=${userId}&from=${filters.dateRange.from}&to=${filters.dateRange.to}`),
        fetch(`/api/analytics/time-by-list?userId=${userId}&from=${filters.dateRange.from}&to=${filters.dateRange.to}`),
        fetch(`/api/analytics/tasks?userId=${userId}&from=${filters.dateRange.from}&to=${filters.dateRange.to}`)
      ]);

      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setKpis(summaryData.kpis);
        setHighlights(summaryData.highlights);
      }

      if (seriesRes.ok) {
        const seriesData = await seriesRes.json();
        // Make bars clickable for drill-down
        const clickableSeries = seriesData.series.map((item: SeriesData) => ({
          ...item,
          clickable: true
        }));
        setSeriesData(clickableSeries);
      }

      if (timeByListRes.ok) {
        const timeByListData = await timeByListRes.json();
        // Make list items clickable for drill-down
        const clickableTimeByList = timeByListData.data.map((item: TimeByListData) => ({
          ...item,
          clickable: true
        }));
        setTimeByList(clickableTimeByList);
      }

      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        setTasks(tasksData.tasks);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, filters]);

  // Handle drill-down clicks
  const handleDrillDown = useCallback((type: string, value: string) => {
    setSelectedDrillDown(`${type}:${value}`);
    
    // Apply filters based on drill-down
    if (type === 'date') {
      setFilters(prev => ({
        ...prev,
        dateRange: {
          from: value,
          to: value
        }
      }));
    } else if (type === 'list') {
      setFilters(prev => ({
        ...prev,
        tags: [value]
      }));
    } else if (type === 'metric') {
      // Handle metric drill-downs
      switch (value) {
        case 'tasksDone':
          setFilters(prev => ({ ...prev, status: ['done'] }));
          break;
        case 'hoursPerDay':
          // Show focus sessions for the period
          setFilters(prev => ({ ...prev }));
          break;
        case 'dayStreak':
          // Show streak history
          setFilters(prev => ({ ...prev }));
          break;
      }
    }
  }, []);

  // Export with current filters and offline queue support
  const exportCSV = useCallback(async (exportType: 'tasks' | 'focus-sessions' | 'summary') => {
    setExporting(true);
    try {
      // Check if offline
      if (!navigator.onLine) {
        // Add to offline queue
        const queueId = await offlineQueueManager.addToQueue({
          type: exportType,
          filters: filters
        });
        
        // Update local queue state
        setExportQueue(prev => [...prev, {
          id: queueId,
          type: exportType,
          status: 'pending',
          createdAt: new Date(),
          filters: filters
        }]);
        
        alert('Export queued for processing when you come back online');
        return;
      }

      // Process export immediately if online
      const response = await fetch('/api/analytics/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          exportType,
          filters: filters
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${exportType}_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      console.error('Export failed:', error);
      
      // If online export failed, queue it for later
      try {
        const queueId = await offlineQueueManager.addToQueue({
          type: exportType,
          filters: filters
        });
        
        setExportQueue(prev => [...prev, {
          id: queueId,
          type: exportType,
          status: 'pending',
          createdAt: new Date(),
          filters: filters
        }]);
        
        alert('Export failed but has been queued for retry when connection improves');
      } catch (queueError) {
        alert('Export failed. Please try again.');
      }
    } finally {
      setExporting(false);
    }
  }, [filters, userId]);

  // Filter tasks based on current filters
  const filteredTasks = tasks.filter(task => {
    if (filters.status.length > 0 && !filters.status.includes(task.status)) {
      return false;
    }
    if (filters.priority.length > 0 && !filters.priority.includes(task.priority)) {
      return false;
    }
    if (filters.tags.length > 0 && !task.tags.some(tag => filters.tags.includes(tag))) {
      return false;
    }
    if (filters.search && !task.title.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Load data on mount and filter changes
  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // Initialize offline queue and Service Worker
  useEffect(() => {
    // Register Service Worker
    registerServiceWorker();
    
    // Setup offline queue listeners
    setupOfflineQueueListeners();
    
    // Load existing queue
    const loadQueue = async () => {
      try {
        const queue = await offlineQueueManager.getQueue();
        setExportQueue(queue);
      } catch (error) {
        console.error('Failed to load offline queue:', error);
      }
    };
    
    loadQueue();
    
    // Setup online/offline status
    const handleOnlineStatus = () => {
      setIsOnline(navigator.onLine);
      if (navigator.onLine) {
        // Process queue when coming back online
        offlineQueueManager.processQueue();
      }
    };
    
    setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);
    
    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, []);

  // Listen for Service Worker messages
  useEffect(() => {
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data.type === 'EXPORT_COMPLETED') {
        // Update queue status
        setExportQueue(prev => 
          prev.map(item => 
            item.id === event.data.queueId 
              ? { ...item, status: 'completed' as const }
              : item
          )
        );
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleServiceWorkerMessage);
    
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
        </div>
        <div className="text-center py-8">Loading real-time analytics...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Real-time insights from your productivity data
            {!isOnline && <span className="text-orange-500 ml-2">(Offline Mode)</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            🔍 Filters
          </button>
          <button
            onClick={() => exportCSV('summary')}
            disabled={exporting}
            className="bg-brand-500 text-white px-4 py-2 rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50"
          >
            {exporting ? 'Exporting...' : '📊 Export Summary'}
          </button>
          <button
            onClick={() => exportCSV('tasks')}
            disabled={exporting}
            className="bg-brand-500 text-white px-4 py-2 rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50"
          >
            {exporting ? 'Exporting...' : '📋 Export Tasks'}
          </button>
        </div>
      </div>

      {/* Offline Queue Status */}
      {exportQueue.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
            Export Queue ({exportQueue.length})
          </h3>
          <div className="space-y-2">
            {exportQueue.map(item => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span>{item.type} export</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  item.status === 'completed' ? 'bg-green-100 text-green-800' :
                  item.status === 'failed' ? 'bg-red-100 text-red-800' :
                  item.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold mb-4">Advanced Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium mb-1">Date Range</label>
              <div className="space-y-2">
                <input
                  type="date"
                  value={filters.dateRange.from}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, from: e.target.value }
                  }))}
                  className="w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                />
                <input
                  type="date"
                  value={filters.dateRange.to}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, to: e.target.value }
                  }))}
                  className="w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              {['todo', 'in_progress', 'done'].map(status => (
                <label key={status} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.status.includes(status)}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      status: e.target.checked 
                        ? [...prev.status, status]
                        : prev.status.filter(s => s !== status)
                    }))}
                    className="rounded"
                  />
                  <span className="text-sm capitalize">{status.replace('_', ' ')}</span>
                </label>
              ))}
            </div>

            {/* Priority Filter */}
            <div>
              <label className="block text-sm font-medium mb-1">Priority</label>
              {['low', 'medium', 'high'].map(priority => (
                <label key={priority} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.priority.includes(priority)}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      priority: e.target.checked 
                        ? [...prev.priority, priority]
                        : prev.priority.filter(p => p !== priority)
                    }))}
                    className="rounded"
                  />
                  <span className="text-sm capitalize">{priority}</span>
                </label>
              ))}
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium mb-1">Search</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                placeholder="Search tasks..."
                className="w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
              />
            </div>
          </div>
        </div>
      )}

      {/* KPI Tiles - Connected to Real Data */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleDrillDown('metric', 'tasksDone')}>
            <div className="text-2xl font-bold text-brand-500">{kpis.tasksDone}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Tasks Done</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleDrillDown('metric', 'tasksPerDay')}>
            <div className="text-2xl font-bold text-green-500">{kpis.tasksPerDay}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Tasks/Day</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleDrillDown('metric', 'hoursPerDay')}>
            <div className="text-2xl font-bold text-blue-500">{kpis.hoursPerDay}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Hours/Day</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleDrillDown('metric', 'avgMinutesPerTask')}>
            <div className="text-2xl font-bold text-purple-500">{kpis.avgMinutesPerTask}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Mins/Task</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleDrillDown('metric', 'dayStreak')}>
            <div className="text-2xl font-bold text-orange-500">{kpis.dayStreak}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Day Streak</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleDrillDown('metric', 'totalFocusHours')}>
            <div className="text-2xl font-bold text-indigo-500">{kpis.totalFocusHours}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Hours</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleDrillDown('metric', 'totalTasks')}>
            <div className="text-2xl font-bold text-red-500">{kpis.totalTasks}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Tasks</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleDrillDown('metric', 'completionRate')}>
            <div className="text-2xl font-bold text-teal-500">{kpis.completionRate}%</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Completion Rate</div>
          </div>
        </div>
      )}

      {/* Highlights Section */}
      {highlights && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">🎯 Highlights</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-2xl mb-2">⏰</div>
              <div className="font-medium text-blue-800 dark:text-blue-200">Most Productive Hour</div>
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {highlights.mostProductiveHour || 'N/A'}
              </div>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl mb-2">📅</div>
              <div className="font-medium text-green-800 dark:text-green-200">Most Productive Day</div>
              <div className="text-lg font-bold text-green-600 dark:text-green-400">
                {highlights.mostProductiveDay || 'N/A'}
              </div>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="text-2xl mb-2">🔥</div>
              <div className="font-medium text-purple-800 dark:text-purple-200">Total Sessions</div>
              <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                {highlights.totalFocusTime || 0}
              </div>
            </div>
            <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <div className="text-2xl mb-2">⏱️</div>
              <div className="font-medium text-orange-800 dark:text-orange-200">Avg Session</div>
              <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                {highlights.averageSessionLength || 0}m
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Daily Bar Chart - Clickable for Drill-down */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Focus Time Trend</h2>
        <div className="h-64 flex items-end justify-between gap-2">
          {seriesData.map((item, index) => (
            <div 
              key={index} 
              className={`flex-1 flex flex-col items-center ${item.clickable ? 'cursor-pointer hover:opacity-80' : ''}`}
              onClick={() => item.clickable && handleDrillDown('date', item.date)}
            >
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                {item.focusHours.toFixed(1)}h
              </div>
              <div 
                className={`w-full rounded-t transition-all ${item.clickable ? 'bg-brand-500 hover:bg-brand-600' : 'bg-gray-400'}`}
                style={{ 
                  height: `${Math.max((item.focusHours / Math.max(...seriesData.map(s => s.focusHours))) * 200, 4)}px` 
                }}
              />
              <div className="text-xs text-gray-500 mt-1">
                {new Date(item.date).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Time by List Donut - Clickable for Drill-down */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Time by List</h2>
        <div className="space-y-3">
          {timeByList.map((item, index) => (
            <div 
              key={index} 
              className={`flex items-center justify-between p-2 rounded ${item.clickable ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700' : ''}`}
              onClick={() => item.clickable && handleDrillDown('list', item.list)}
            >
              <div className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: `hsl(${index * 60}, 70%, 50%)` }}
                />
                <span className="font-medium">{item.list}</span>
              </div>
              <div className="text-right">
                <div className="font-semibold">{item.hours.toFixed(1)}h</div>
                <div className="text-sm text-gray-500">{item.percentage}%</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tasks Table - Filtered by Current Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Tasks ({filteredTasks.length})</h2>
          <div className="text-sm text-gray-500">
            Showing {filteredTasks.length} of {tasks.length} tasks
            {selectedDrillDown && (
              <span className="ml-2 text-brand-600">
                • Filtered by: {selectedDrillDown}
              </span>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2">Title</th>
                <th className="text-left py-2">Status</th>
                <th className="text-left py-2">Priority</th>
                <th className="text-left py-2">Due Date</th>
                <th className="text-left py-2">Focus Time</th>
                <th className="text-left py-2">Efficiency</th>
                <th className="text-left py-2">Tags</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map(task => (
                <tr key={task.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="py-2">{task.title}</td>
                  <td className="py-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      task.status === 'done' ? 'bg-green-100 text-green-800' :
                      task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {task.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      task.priority === 'high' ? 'bg-red-100 text-red-800' :
                      task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="py-2">
                    {task.due_at ? new Date(task.due_at).toLocaleDateString() : '-'}
                  </td>
                  <td className="py-2">{task.totalFocusHours.toFixed(1)}h</td>
                  <td className="py-2">
                    {task.efficiency ? `${task.efficiency}%` : '-'}
                  </td>
                  <td className="py-2">
                    <div className="flex gap-1">
                      {task.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                      {task.tags.length > 2 && (
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                          +{task.tags.length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


