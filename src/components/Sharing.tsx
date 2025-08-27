'use client';

import { useState, useEffect } from 'react';
import { sharingManager, ShareLink, ShareableContent } from '@/lib/sharing';

interface SharingProps {
  className?: string;
}

export default function Sharing({ className = '' }: SharingProps) {
  const [activeTab, setActiveTab] = useState<'create' | 'manage' | 'analytics'>('create');
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedContent, setSelectedContent] = useState<ShareableContent | null>(null);
  const [shareSettings, setShareSettings] = useState({
    title: '',
    description: '',
    isPublic: true,
    password: '',
    expiresAt: '',
    allowComments: true,
    allowDownload: true,
    allowEmbedding: false,
    showUserInfo: false,
    showTimestamps: true,
    refreshInterval: 0
  });

  useEffect(() => {
    if (activeTab === 'manage') {
      loadUserShares();
    }
  }, [activeTab]);

  const loadUserShares = async () => {
    setLoading(true);
    try {
      const result = await sharingManager.getUserShares();
      setShareLinks(result.shares);
    } catch (error) {
      console.error('Failed to load shares:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShare = async () => {
    if (!selectedContent || !shareSettings.title) {
      alert('Please select content and provide a title');
      return;
    }

    try {
      const share = await sharingManager.createShareLink(selectedContent, shareSettings);
      alert('Share link created successfully!');
      setActiveTab('manage');
      loadUserShares();
    } catch (error) {
      console.error('Failed to create share:', error);
      alert('Failed to create share link');
    }
  };

  const handleDeleteShare = async (shareId: string) => {
    if (confirm('Are you sure you want to delete this share link?')) {
      try {
        await sharingManager.deleteShareLink(shareId);
        loadUserShares();
      } catch (error) {
        console.error('Failed to delete share:', error);
      }
    }
  };

  const copyShareUrl = (shareId: string) => {
    const url = sharingManager.generateShareUrl(shareId);
    navigator.clipboard.writeText(url);
    alert('Share URL copied to clipboard!');
  };

  const copyEmbedCode = (shareId: string) => {
    const embedCode = sharingManager.generateEmbedCode(shareId);
    navigator.clipboard.writeText(embedCode);
    alert('Embed code copied to clipboard!');
  };

  const getContentPreview = (content: ShareableContent) => {
    switch (content.type) {
      case 'task_list':
        return `Task List: ${content.data?.length || 0} tasks`;
      case 'analytics':
        return `Analytics: ${content.data?.period || 'Custom period'}`;
      case 'forest':
        return `Forest: ${content.data?.trees?.length || 0} trees`;
      case 'focus_stats':
        return `Focus Stats: ${content.data?.totalMinutes || 0} minutes`;
      default:
        return 'Content preview';
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="text-2xl font-bold text-gray-900">Sharing</h2>
        <p className="text-gray-600 mt-1">Create and manage public read-only filtered list links</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {[
            { id: 'create', label: 'Create Share', icon: '🔗' },
            { id: 'manage', label: 'Manage Shares', icon: '📋' },
            { id: 'analytics', label: 'Analytics', icon: '📊' }
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
        {/* Create Share Tab */}
        {activeTab === 'create' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Select Content to Share</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    type: 'task_list',
                    title: 'Task List',
                    description: 'Share a filtered list of tasks',
                    icon: '📝'
                  },
                  {
                    type: 'analytics',
                    title: 'Analytics',
                    description: 'Share productivity analytics',
                    icon: '📊'
                  },
                  {
                    type: 'forest',
                    title: 'Forest',
                    description: 'Share your growing forest',
                    icon: '🌳'
                  },
                  {
                    type: 'focus_stats',
                    title: 'Focus Stats',
                    description: 'Share focus session statistics',
                    icon: '⏱️'
                  }
                ].map((contentType) => (
                  <button
                    key={contentType.type}
                    onClick={() => setSelectedContent({
                      id: Date.now().toString(),
                      type: contentType.type as any,
                      title: contentType.title,
                      description: contentType.description,
                      data: {},
                      filters: {}
                    })}
                    className={`p-4 border-2 rounded-lg text-left transition-colors ${
                      selectedContent?.type === contentType.type
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-2">{contentType.icon}</div>
                    <div className="font-medium text-gray-900">{contentType.title}</div>
                    <div className="text-sm text-gray-600">{contentType.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {selectedContent && (
              <>
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Share Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Share Title *
                      </label>
                      <input
                        type="text"
                        value={shareSettings.title}
                        onChange={(e) => setShareSettings({ ...shareSettings, title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter a title for your share"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <input
                        type="text"
                        value={shareSettings.description}
                        onChange={(e) => setShareSettings({ ...shareSettings, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Optional description"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Expires At
                      </label>
                      <input
                        type="datetime-local"
                        value={shareSettings.expiresAt}
                        onChange={(e) => setShareSettings({ ...shareSettings, expiresAt: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Password Protection
                      </label>
                      <input
                        type="password"
                        value={shareSettings.password}
                        onChange={(e) => setShareSettings({ ...shareSettings, password: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Leave empty for no password"
                      />
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={shareSettings.isPublic}
                        onChange={(e) => setShareSettings({ ...shareSettings, isPublic: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Make this share public</span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={shareSettings.allowComments}
                        onChange={(e) => setShareSettings({ ...shareSettings, allowComments: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Allow comments</span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={shareSettings.allowDownload}
                        onChange={(e) => setShareSettings({ ...shareSettings, allowDownload: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Allow data download</span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={shareSettings.allowEmbedding}
                        onChange={(e) => setShareSettings({ ...shareSettings, allowEmbedding: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Allow embedding in other websites</span>
                    </label>
                  </div>

                  <div className="mt-6">
                    <button
                      onClick={handleCreateShare}
                      className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Create Share Link
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Manage Shares Tab */}
        {activeTab === 'manage' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Your Share Links</h3>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading...</p>
              </div>
            ) : shareLinks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No share links created yet.</p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create Your First Share
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {shareLinks.map((share) => (
                  <div key={share.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="text-lg font-medium text-gray-900">{share.title}</h4>
                        {share.description && (
                          <p className="text-gray-600 mt-1">{share.description}</p>
                        )}
                        <div className="mt-2 text-sm text-gray-500">
                          <span>Type: {share.contentType}</span>
                          <span className="ml-4">Accesses: {share.accessCount}</span>
                          <span className="ml-4">Created: {new Date(share.createdAt).toLocaleDateString()}</span>
                          {share.expiresAt && (
                            <span className="ml-4">Expires: {new Date(share.expiresAt).toLocaleDateString()}</span>
                          )}
                        </div>
                        <div className="mt-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            share.isPublic ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {share.isPublic ? 'Public' : 'Private'}
                          </span>
                          {share.password && (
                            <span className="ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              Password Protected
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col space-y-2 ml-4">
                        <button
                          onClick={() => copyShareUrl(share.id)}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Copy URL
                        </button>
                        <button
                          onClick={() => copyEmbedCode(share.id)}
                          className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          Copy Embed
                        </button>
                        <button
                          onClick={() => handleDeleteShare(share.id)}
                          className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Share Analytics</h3>
            <div className="text-center py-8">
              <p className="text-gray-500">Analytics will be available for shares with access tracking enabled.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
