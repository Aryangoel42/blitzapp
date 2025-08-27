'use client';

import { useState, useEffect } from 'react';
import { notificationManager, localNotificationService } from '@/lib/notifications';
import { webPushService } from '@/lib/webPush';

interface NotificationSettingsProps {
  userId: string;
  userEmail?: string;
}

export default function NotificationSettings({ userId, userEmail }: NotificationSettingsProps) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [settings, setSettings] = useState({
    taskDue: true,
    focusEnd: true,
    dailyEmail: false,
    pushNotifications: false
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkNotificationPermission();
    checkPushSubscription();
  }, []);

  const checkNotificationPermission = async () => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  };

  const checkPushSubscription = async () => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    }
  };

  const requestPermission = async () => {
    setLoading(true);
    try {
      const newPermission = await notificationManager.requestPermissions();
      setPermission(newPermission);
      
      if (newPermission === 'granted') {
        // Enable local notifications
        setSettings(prev => ({ ...prev, taskDue: true, focusEnd: true }));
      }
    } catch (error) {
      console.error('Failed to request permission:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToPush = async () => {
    setLoading(true);
    try {
      const subscription = await webPushService.subscribeToPushNotifications(userId);
      if (subscription) {
        setIsSubscribed(true);
        setSettings(prev => ({ ...prev, pushNotifications: true }));
      }
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const unsubscribeFromPush = async () => {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await webPushService.unsubscribeFromPushNotifications(userId, subscription.endpoint);
        setIsSubscribed(false);
        setSettings(prev => ({ ...prev, pushNotifications: false }));
      }
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (key: keyof typeof settings, value: boolean) => {
    setLoading(true);
    try {
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);

      // Update user preferences in database
      await fetch('/api/users/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          notification_task_due: newSettings.taskDue,
          notification_focus_end: newSettings.focusEnd,
          notification_daily_email: newSettings.dailyEmail
        })
      });
    } catch (error) {
      console.error('Failed to update settings:', error);
      // Revert on error
      setSettings(prev => ({ ...prev, [key]: !value }));
    } finally {
      setLoading(false);
    }
  };

  const testNotification = async () => {
    try {
      await notificationManager.sendNotification({
        title: 'Test Notification',
        message: 'This is a test notification from Blitzit!',
        icon: '/icons/icon-192x192.png',
        tag: 'test-notification'
      });
    } catch (error) {
      console.error('Failed to send test notification:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Notification Settings</h2>
      
      {/* Permission Status */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3 text-gray-700">Permission Status</h3>
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium text-gray-800">
              Browser Notifications: {permission}
            </p>
            <p className="text-sm text-gray-600">
              {permission === 'granted' 
                ? 'You can receive notifications from Blitzit'
                : permission === 'denied'
                ? 'Notifications are blocked. Please enable them in your browser settings.'
                : 'Click "Request Permission" to enable notifications'
              }
            </p>
          </div>
          {permission === 'default' && (
            <button
              onClick={requestPermission}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Requesting...' : 'Request Permission'}
            </button>
          )}
        </div>
      </div>

      {/* Push Notifications */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3 text-gray-700">Push Notifications</h3>
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium text-gray-800">
              Push Notifications: {isSubscribed ? 'Enabled' : 'Disabled'}
            </p>
            <p className="text-sm text-gray-600">
              Receive notifications even when the app is closed
            </p>
          </div>
          {permission === 'granted' && (
            <button
              onClick={isSubscribed ? unsubscribeFromPush : subscribeToPush}
              disabled={loading}
              className={`px-4 py-2 rounded-lg ${
                isSubscribed 
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              } disabled:opacity-50`}
            >
              {loading ? 'Updating...' : isSubscribed ? 'Disable' : 'Enable'}
            </button>
          )}
        </div>
      </div>

      {/* Notification Types */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3 text-gray-700">Notification Types</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-800">Task Due Reminders</p>
              <p className="text-sm text-gray-600">Get notified when tasks are due soon</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.taskDue}
                onChange={(e) => updateSettings('taskDue', e.target.checked)}
                disabled={loading || permission !== 'granted'}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-800">Focus Session End</p>
              <p className="text-sm text-gray-600">Get notified when focus sessions complete</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.focusEnd}
                onChange={(e) => updateSettings('focusEnd', e.target.checked)}
                disabled={loading || permission !== 'granted'}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-800">Daily Email Summary</p>
              <p className="text-sm text-gray-600">Receive daily productivity summaries via email</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.dailyEmail}
                onChange={(e) => updateSettings('dailyEmail', e.target.checked)}
                disabled={loading || !userEmail}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Test Notification */}
      {permission === 'granted' && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 text-gray-700">Test Notifications</h3>
          <button
            onClick={testNotification}
            disabled={loading}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            Send Test Notification
          </button>
        </div>
      )}

      {/* Help Text */}
      <div className="text-sm text-gray-600">
        <p className="mb-2">
          <strong>Note:</strong> Notifications work best when you keep the app open or have push notifications enabled.
        </p>
        <p>
          If you're not receiving notifications, check your browser's notification settings and make sure Blitzit is allowed to send notifications.
        </p>
      </div>
    </div>
  );
}
