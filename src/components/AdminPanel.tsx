'use client';

import { useState, useEffect } from 'react';
import { adminManager, User, FeatureFlag, AdminAction } from '@/lib/admin';

interface AdminPanelProps {
  className?: string;
}

export default function AdminPanel({ className = '' }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'features' | 'actions' | 'stats' | 'maintenance'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);
  const [adminActions, setAdminActions] = useState<AdminAction[]>([]);
  const [systemStats, setSystemStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (adminManager.isAdmin()) {
      loadData();
    }
  }, [activeTab, currentPage, searchTerm]);

  const loadData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'users':
          const usersData = await adminManager.getUsers({
            search: searchTerm,
            page: currentPage,
            limit: 20
          });
          setUsers(usersData.users);
          setTotalPages(usersData.totalPages);
          break;
        case 'features':
          const flags = await adminManager.getFeatureFlags();
          setFeatureFlags(flags);
          break;
        case 'actions':
          const actions = await adminManager.getAdminActions({
            page: currentPage,
            limit: 20
          });
          setAdminActions(actions.actions);
          setTotalPages(actions.totalPages);
          break;
        case 'stats':
          const stats = await adminManager.getSystemStats();
          setSystemStats(stats);
          break;
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = async (userId: string, action: 'suspend' | 'activate' | 'delete', reason?: string) => {
    try {
      switch (action) {
        case 'suspend':
          await adminManager.suspendUser(userId, reason || 'No reason provided');
          break;
        case 'activate':
          await adminManager.activateUser(userId);
          break;
        case 'delete':
          if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            await adminManager.deleteUser(userId);
          }
          break;
      }
      loadData();
    } catch (error) {
      console.error(`Failed to ${action} user:`, error);
    }
  };

  const handleFeatureFlagToggle = async (flagId: string, enabled: boolean) => {
    try {
      await adminManager.updateFeatureFlag(flagId, { enabled });
      loadData();
    } catch (error) {
      console.error('Failed to update feature flag:', error);
    }
  };

  const handleMaintenance = async (type: string, duration: number) => {
    try {
      await adminManager.triggerMaintenance(type, duration);
      alert('Maintenance mode activated');
    } catch (error) {
      console.error('Failed to trigger maintenance:', error);
    }
  };

  if (!adminManager.isAdmin()) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
        <p className="text-red-800">Access denied. Admin privileges required.</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="text-2xl font-bold text-gray-900">Admin Panel</h2>
        <p className="text-gray-600 mt-1">Manage users, features, and system settings</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {[
            { id: 'users', label: 'Users', icon: '👥' },
            { id: 'features', label: 'Feature Flags', icon: '🚩' },
            { id: 'actions', label: 'Admin Actions', icon: '📝' },
            { id: 'stats', label: 'System Stats', icon: '📊' },
            { id: 'maintenance', label: 'Maintenance', icon: '🔧' }
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
            {/* Users Tab */}
            {activeTab === 'users' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div className="flex-1 max-w-md">
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    onClick={() => setCurrentPage(1)}
                    className="ml-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Search
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Stats
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((user) => (
                        <tr key={user.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{user.name}</div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.role === 'super_admin' ? 'bg-purple-100 text-purple-800' :
                              user.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.status === 'active' ? 'bg-green-100 text-green-800' :
                              user.status === 'suspended' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {user.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div>Tasks: {user.stats.totalTasks}</div>
                            <div>Focus: {user.stats.totalFocusTime}min</div>
                            <div>Streak: {user.stats.streakDays} days</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              {user.status === 'active' ? (
                                <button
                                  onClick={() => handleUserAction(user.id, 'suspend', 'Admin action')}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  Suspend
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleUserAction(user.id, 'activate')}
                                  className="text-green-600 hover:text-green-900"
                                >
                                  Activate
                                </button>
                              )}
                              <button
                                onClick={() => handleUserAction(user.id, 'delete')}
                                className="text-red-600 hover:text-red-900"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex justify-between items-center mt-4">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* Feature Flags Tab */}
            {activeTab === 'features' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Feature Flags</h3>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                    Add Feature Flag
                  </button>
                </div>

                <div className="space-y-4">
                  {featureFlags.map((flag) => (
                    <div key={flag.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="text-lg font-medium text-gray-900">{flag.name}</h4>
                          <p className="text-gray-600 mt-1">{flag.description}</p>
                          <div className="mt-2 text-sm text-gray-500">
                            <span>Enabled for: {flag.enabledFor}</span>
                            {flag.targetPercentage && <span className="ml-4">Target: {flag.targetPercentage}%</span>}
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={flag.enabled}
                              onChange={(e) => handleFeatureFlagToggle(flag.id, e.target.checked)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">Enabled</span>
                          </label>
                          <button className="text-blue-600 hover:text-blue-900 text-sm">
                            Edit
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Admin Actions Tab */}
            {activeTab === 'actions' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Admin Actions Log</h3>
                <div className="space-y-3">
                  {adminActions.map((action) => (
                    <div key={action.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-gray-900">{action.action}</div>
                          <div className="text-sm text-gray-600 mt-1">
                            {action.type} on {action.targetType}: {action.targetId}
                          </div>
                          {action.reason && (
                            <div className="text-sm text-gray-500 mt-1">Reason: {action.reason}</div>
                          )}
                        </div>
                        <div className="text-right text-sm text-gray-500">
                          <div>{new Date(action.performedAt).toLocaleDateString()}</div>
                          <div>{new Date(action.performedAt).toLocaleTimeString()}</div>
                          <div>By: {action.performedBy}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* System Stats Tab */}
            {activeTab === 'stats' && systemStats && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">System Statistics</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-600">{systemStats.totalUsers}</div>
                    <div className="text-sm text-blue-800">Total Users</div>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-600">{systemStats.activeUsers}</div>
                    <div className="text-sm text-green-800">Active Users</div>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-purple-600">{systemStats.totalTasks}</div>
                    <div className="text-sm text-purple-800">Total Tasks</div>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-yellow-600">{systemStats.totalFocusSessions}</div>
                    <div className="text-sm text-yellow-800">Focus Sessions</div>
                  </div>
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-indigo-600">{Math.floor(systemStats.systemUptime / 3600)}h</div>
                    <div className="text-sm text-indigo-800">System Uptime</div>
                  </div>
                  <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-pink-600">
                      {systemStats.lastMaintenance ? new Date(systemStats.lastMaintenance).toLocaleDateString() : 'Never'}
                    </div>
                    <div className="text-sm text-pink-800">Last Maintenance</div>
                  </div>
                </div>
              </div>
            )}

            {/* Maintenance Tab */}
            {activeTab === 'maintenance' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">System Maintenance</h3>
                <div className="space-y-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Database Maintenance</h4>
                    <p className="text-gray-600 mb-3">Perform database cleanup and optimization</p>
                    <button
                      onClick={() => handleMaintenance('database', 300)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Start DB Maintenance (5 min)
                    </button>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Cache Clear</h4>
                    <p className="text-gray-600 mb-3">Clear all system caches</p>
                    <button
                      onClick={() => handleMaintenance('cache', 60)}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      Clear Cache (1 min)
                    </button>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">System Restart</h4>
                    <p className="text-gray-600 mb-3">Restart the application system</p>
                    <button
                      onClick={() => handleMaintenance('restart', 120)}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      Restart System (2 min)
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
