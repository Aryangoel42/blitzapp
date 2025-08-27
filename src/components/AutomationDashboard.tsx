'use client';

import { useState, useEffect } from 'react';
import { automationManager, AutomationJob, JobExecution } from '@/lib/automations';

interface AutomationDashboardProps {
  className?: string;
}

export default function AutomationDashboard({ className = '' }: AutomationDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'jobs' | 'executions' | 'logs'>('overview');
  const [jobs, setJobs] = useState<AutomationJob[]>([]);
  const [executions, setExecutions] = useState<JobExecution[]>([]);
  const [schedulerStatus, setSchedulerStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState<AutomationJob | null>(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [jobsData, executionsData, statusData] = await Promise.all([
        automationManager.getAllJobs(),
        fetch('/api/automations/executions').then(res => res.ok ? res.json() : []),
        automationManager.getSchedulerStatus()
      ]);

      setJobs(jobsData);
      setExecutions(executionsData);
      setSchedulerStatus(statusData);
    } catch (error) {
      console.error('Failed to load automation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleJob = async (jobId: string, enabled: boolean) => {
    try {
      await automationManager.toggleJob(jobId, enabled);
      loadData();
    } catch (error) {
      console.error('Failed to toggle job:', error);
    }
  };

  const handleTriggerJob = async (jobId: string) => {
    try {
      await automationManager.triggerJob(jobId);
      loadData();
    } catch (error) {
      console.error('Failed to trigger job:', error);
    }
  };

  const getJobTypeIcon = (type: string) => {
    switch (type) {
      case 'hourly': return '⏰';
      case 'minutely': return '⚡';
      case 'daily': return '📅';
      default: return '🔧';
    }
  };

  const getJobStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'idle': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getJobTypeColor = (type: string) => {
    switch (type) {
      case 'hourly': return 'bg-purple-100 text-purple-800';
      case 'minutely': return 'bg-orange-100 text-orange-800';
      case 'daily': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatNextRun = (date: Date) => {
    const now = new Date();
    const diff = new Date(date).getTime() - now.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m`;
    return 'Now';
  };

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="text-2xl font-bold text-gray-900">Automation Dashboard</h2>
        <p className="text-gray-600 mt-1">Monitor and control automated jobs and processes</p>
      </div>

      {/* Scheduler Status */}
      <div className="px-6 py-4 bg-gray-50 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`w-3 h-3 rounded-full ${schedulerStatus?.isRunning ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm font-medium text-gray-700">
              Scheduler: {schedulerStatus?.isRunning ? 'Running' : 'Stopped'}
            </span>
            <span className="text-sm text-gray-500">
              Active Jobs: {schedulerStatus?.activeJobs} / {schedulerStatus?.totalJobs}
            </span>
          </div>
          <div className="text-sm text-gray-500">
            Last Updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'jobs', label: 'Jobs', icon: '⚙️' },
            { id: 'executions', label: 'Executions', icon: '📝' },
            { id: 'logs', label: 'Logs', icon: '📋' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Job Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="text-2xl font-bold text-blue-600">
                        {jobs.filter(j => j.type === 'hourly').length}
                      </div>
                      <div className="text-sm text-blue-800">Hourly Jobs</div>
                      <div className="text-xs text-blue-600 mt-1">
                        {jobs.filter(j => j.type === 'hourly' && j.enabled).length} Active
                      </div>
                    </div>
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <div className="text-2xl font-bold text-orange-600">
                        {jobs.filter(j => j.type === 'minutely').length}
                      </div>
                      <div className="text-sm text-orange-800">Minutely Jobs</div>
                      <div className="text-xs text-orange-600 mt-1">
                        {jobs.filter(j => j.type === 'minutely' && j.enabled).length} Active
                      </div>
                    </div>
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                      <div className="text-2xl font-bold text-indigo-600">
                        {jobs.filter(j => j.type === 'daily').length}
                      </div>
                      <div className="text-sm text-indigo-800">Daily Jobs</div>
                      <div className="text-xs text-indigo-600 mt-1">
                        {jobs.filter(j => j.type === 'daily' && j.enabled).length} Active
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
                  <div className="space-y-3">
                    {executions.slice(0, 5).map((execution) => {
                      const job = jobs.find(j => j.id === execution.jobId);
                      return (
                        <div key={execution.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <span className="text-lg">{getJobTypeIcon(job?.type || 'unknown')}</span>
                            <div>
                              <div className="font-medium text-gray-900">{job?.name || 'Unknown Job'}</div>
                              <div className="text-sm text-gray-500">
                                {new Date(execution.startedAt).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getJobStatusColor(execution.status)}`}>
                              {execution.status}
                            </span>
                            <span className="text-sm text-gray-500">
                              {execution.duration}ms
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">System Health</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Job Status Distribution</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Running</span>
                          <span className="text-sm font-medium">
                            {jobs.filter(j => j.status === 'running').length}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Completed</span>
                          <span className="text-sm font-medium">
                            {jobs.filter(j => j.status === 'completed').length}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Failed</span>
                          <span className="text-sm font-medium">
                            {jobs.filter(j => j.status === 'failed').length}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Idle</span>
                          <span className="text-sm font-medium">
                            {jobs.filter(j => j.status === 'idle').length}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Performance Metrics</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Total Executions</span>
                          <span className="text-sm font-medium">{executions.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Success Rate</span>
                          <span className="text-sm font-medium">
                            {executions.length > 0 
                              ? Math.round((executions.filter(e => e.status === 'completed').length / executions.length) * 100)
                              : 0}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Avg Duration</span>
                          <span className="text-sm font-medium">
                            {executions.length > 0 
                              ? Math.round(executions.reduce((sum, e) => sum + e.duration, 0) / executions.length)
                              : 0}ms
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Jobs Tab */}
            {activeTab === 'jobs' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Automation Jobs</h3>
                <div className="space-y-4">
                  {jobs.map((job) => (
                    <div key={job.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{getJobTypeIcon(job.type)}</span>
                          <div>
                            <h4 className="font-medium text-gray-900">{job.name}</h4>
                            <p className="text-sm text-gray-600">{job.description}</p>
                            <div className="flex items-center space-x-4 mt-1">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getJobTypeColor(job.type)}`}>
                                {job.type}
                              </span>
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getJobStatusColor(job.status)}`}>
                                {job.status}
                              </span>
                              <span className="text-xs text-gray-500">
                                Schedule: {job.schedule}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="text-right text-sm">
                            <div className="text-gray-500">Next Run</div>
                            <div className="font-medium">{formatNextRun(job.nextRun)}</div>
                            {job.lastRun && (
                              <>
                                <div className="text-gray-500 mt-1">Last Run</div>
                                <div className="text-xs">{new Date(job.lastRun).toLocaleString()}</div>
                              </>
                            )}
                          </div>
                          <div className="flex flex-col space-y-2">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={job.enabled}
                                onChange={(e) => handleToggleJob(job.id, e.target.checked)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="ml-2 text-sm text-gray-700">Enabled</span>
                            </label>
                            <button
                              onClick={() => handleTriggerJob(job.id)}
                              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              Run Now
                            </button>
                          </div>
                        </div>
                      </div>
                      {job.errorCount > 0 && (
                        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                          Error Count: {job.errorCount} / {job.maxRetries}
                          {job.errorCount >= job.maxRetries && ' - Job disabled due to repeated failures'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Executions Tab */}
            {activeTab === 'executions' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Job Executions</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Job
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Started
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Duration
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Result
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {executions.map((execution) => {
                        const job = jobs.find(j => j.id === execution.jobId);
                        return (
                          <tr key={execution.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <span className="text-lg mr-2">{getJobTypeIcon(job?.type || 'unknown')}</span>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{job?.name || 'Unknown Job'}</div>
                                  <div className="text-sm text-gray-500">{job?.type || 'unknown'}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(execution.startedAt).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {execution.duration}ms
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getJobStatusColor(execution.status)}`}>
                                {execution.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {execution.error ? (
                                <span className="text-red-600">{execution.error}</span>
                              ) : (
                                <span className="text-green-600">Success</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Logs Tab */}
            {activeTab === 'logs' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">System Logs</h3>
                <div className="text-center py-8">
                  <p className="text-gray-500">Detailed system logs will be available here.</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Logs include job execution details, errors, and system events.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
